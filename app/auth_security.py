"""
Local Authentication & Password Security Module
===============================================
Hybrid Multi-Level Quantum-Resistant Security Workstation

Features:
- RFC 9106 Argon2id password hashing and constant-time verification.
- Decoupled architecture separating cryptographic hashing from storage.
- Hash parameter upgrade detection and automated rehash migration (`check_needs_rehash`).
- Timing-attack mitigation against user enumeration using constant-time dummy verification.
- Atomic, secure local file storage with POSIX 0600 file permission enforcement.
- Custom exception hierarchy, strong typing, and comprehensive docstrings.
"""

from __future__ import annotations

import json
import logging
import os
import stat
import tempfile
import threading
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import argon2
    from argon2 import Type as Argon2Type
    from argon2.exceptions import (
        HashingError,
        InvalidHashError as Argon2InvalidHashError,
        VerificationError,
        VerifyMismatchError,
    )
except ImportError:
    raise ImportError(
        "The 'argon2-cffi' package is required for auth_security. "
        "Please install it using: pip install argon2-cffi"
    )

logger = logging.getLogger("auth_security")


# =====================================================================
# 1. Custom Exceptions
# =====================================================================

class AuthSecurityError(Exception):
    """Base exception for all authentication and security operations."""
    pass


class InvalidHashError(AuthSecurityError):
    """Raised when an Argon2 hash string is malformed or corrupted."""
    pass


class InvalidCredentialsError(AuthSecurityError):
    """Raised when an authentication attempt fails due to invalid credentials."""
    pass


class UserAlreadyExistsError(AuthSecurityError):
    """Raised when attempting to register a username that already exists."""
    pass


class UserNotFoundError(AuthSecurityError):
    """Raised when a requested user does not exist in storage."""
    pass


class StorageError(AuthSecurityError):
    """Raised when an error occurs during persistence or file I/O."""
    pass


# =====================================================================
# 2. Configuration & Data Models
# =====================================================================

@dataclass(frozen=True)
class Argon2Config:
    """
    Argon2id configuration parameters adhering to RFC 9106 recommendations.

    RFC 9106 Section 4 recommends Argon2id for password hashing:
    - Memory: 64 MiB (65536 KiB) is the primary recommendation.
    - Iterations (time_cost): 3 passes over memory.
    - Parallelism: 4 parallel threads/lanes.
    - Tag length (hash_len): 32 bytes (256-bit output).
    - Salt length (salt_len): 16 bytes (128-bit CSPRNG salt).
    """
    time_cost: int = 3
    memory_cost: int = 65536      # 64 MiB in KiB
    parallelism: int = 4          # 4 threads
    hash_len: int = 32            # 256 bits
    salt_len: int = 16            # 128 bits
    type: Argon2Type = Argon2Type.ID

    def __post_init__(self) -> None:
        if self.time_cost < 1:
            raise ValueError("time_cost must be at least 1 iteration.")
        if self.memory_cost < 1024:
            raise ValueError("memory_cost must be at least 1024 KiB (1 MiB).")
        if self.parallelism < 1:
            raise ValueError("parallelism must be at least 1 lane.")
        if self.hash_len < 16:
            raise ValueError("hash_len must be at least 16 bytes (128 bits).")
        if self.salt_len < 16:
            raise ValueError("salt_len must be at least 16 bytes for security.")


@dataclass
class UserRecord:
    """
    Data model representing a locally stored user profile.
    """
    username: str
    password_hash: str
    role: str = "operator"
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert record to a JSON-serializable dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> UserRecord:
        """Instantiate UserRecord from a dictionary."""
        return cls(
            username=data["username"],
            password_hash=data["password_hash"],
            role=data.get("role", "operator"),
            created_at=data.get(
                "created_at", datetime.now(timezone.utc).isoformat()
            ),
            updated_at=data.get(
                "updated_at", datetime.now(timezone.utc).isoformat()
            ),
            metadata=data.get("metadata", {}),
        )


# =====================================================================
# 3. Decoupled Password Hashing Engine
# =====================================================================

class Argon2PasswordHasher:
    """
    Standalone Argon2id password hasher and constant-time verifier.
    Completely decoupled from persistence and storage mechanisms.
    """

    def __init__(self, config: Optional[Argon2Config] = None) -> None:
        """
        Initialize the hasher with specific or default RFC 9106 Argon2id parameters.
        """
        self.config = config or Argon2Config()
        self._hasher = argon2.PasswordHasher(
            time_cost=self.config.time_cost,
            memory_cost=self.config.memory_cost,
            parallelism=self.config.parallelism,
            hash_len=self.config.hash_len,
            salt_len=self.config.salt_len,
            type=self.config.type,
        )
        # Pre-compute a constant-time dummy hash to mitigate user enumeration timing attacks
        self._dummy_hash = self._hasher.hash("__antigravity_dummy_entropy_token__")

    def hash(self, password: str) -> str:
        """
        Hash a plaintext password using Argon2id with cryptographically secure random salt.

        Returns:
            Standard PHC-formatted Argon2id string (e.g., $argon2id$v=19$m=65536,t=3,p=4$...).

        Raises:
            ValueError: If password is empty or not a string.
            AuthSecurityError: If hashing computation fails.
        """
        if not isinstance(password, str) or not password:
            raise ValueError("Password must be a non-empty string.")

        try:
            return self._hasher.hash(password)
        except Exception as exc:
            logger.error("Argon2 hashing failure: %s", exc)
            raise AuthSecurityError(f"Password hashing failed: {exc}") from exc

    def verify(self, password: str, password_hash: str) -> bool:
        """
        Safely verify a password against an Argon2 hash.
        Performs constant-time verification. Catches corrupted strings or mismatches
        without throwing exceptions, returning a clean boolean status.

        Returns:
            True if password matches the hash; False otherwise.
        """
        if not password or not password_hash or not isinstance(password_hash, str):
            return False

        try:
            return self._hasher.verify(password_hash, password)
        except VerifyMismatchError:
            return False
        except (Argon2InvalidHashError, VerificationError, HashingError):
            logger.warning("Corrupted or invalid Argon2 hash encountered during verification.")
            return False
        except Exception as exc:
            logger.error("Unexpected error during verification: %s", exc)
            return False

    def verify_strict(self, password: str, password_hash: str) -> Tuple[bool, bool]:
        """
        Perform strict verification that distinguishes between invalid credentials
        and corrupted hash formats, and checks if hash parameters need rehashing.

        Returns:
            Tuple of (is_valid: bool, needs_rehash: bool).

        Raises:
            InvalidHashError: If the hash string is malformed or invalid Argon2 format.
        """
        if not isinstance(password_hash, str) or not password_hash.startswith("$argon2"):
            raise InvalidHashError("Provided string is not a valid Argon2 hash.")

        try:
            is_valid = self._hasher.verify(password_hash, password)
            needs_rehash = self._hasher.check_needs_rehash(password_hash)
            return is_valid, needs_rehash
        except VerifyMismatchError:
            return False, False
        except (Argon2InvalidHashError, VerificationError) as exc:
            raise InvalidHashError(f"Corrupted or invalid Argon2 hash: {exc}") from exc

    def check_needs_rehash(self, password_hash: str) -> bool:
        """
        Check if an existing password hash needs to be rehashed to match the current
        active Argon2Config parameters.

        Returns:
            True if current config differs from hash parameters, False otherwise.
        """
        if not password_hash or not isinstance(password_hash, str):
            return True
        try:
            return self._hasher.check_needs_rehash(password_hash)
        except Exception:
            return True

    def dummy_verify(self, candidate_password: str) -> bool:
        """
        Execute a constant-time dummy verification when an authentication request
        targets a non-existent user. This prevents response timing side-channels
        from leaking user existence.

        Returns:
            Always returns False.
        """
        try:
            self._hasher.verify(self._dummy_hash, candidate_password)
        except Exception:
            pass
        return False


# =====================================================================
# 4. Storage Abstraction & Local File Implementation
# =====================================================================

class AbstractUserStore(ABC):
    """Abstract interface defining local user storage operations."""

    @abstractmethod
    def get_user(self, username: str) -> Optional[UserRecord]:
        """Retrieve user record by username."""
        pass

    @abstractmethod
    def save_user(self, user: UserRecord) -> None:
        """Save or update a user record."""
        pass

    @abstractmethod
    def delete_user(self, username: str) -> bool:
        """Delete user by username. Return True if deleted, False if not found."""
        pass

    @abstractmethod
    def list_users(self) -> List[UserRecord]:
        """List all stored user records."""
        pass

    @abstractmethod
    def user_exists(self, username: str) -> bool:
        """Check if username exists in storage."""
        pass


class InMemoryUserStore(AbstractUserStore):
    """In-memory user storage implementation for testing or transient sessions."""

    def __init__(self) -> None:
        self._users: Dict[str, UserRecord] = {}
        self._lock = threading.RLock()

    def get_user(self, username: str) -> Optional[UserRecord]:
        with self._lock:
            return self._users.get(username)

    def save_user(self, user: UserRecord) -> None:
        with self._lock:
            self._users[user.username] = user

    def delete_user(self, username: str) -> bool:
        with self._lock:
            return self._users.pop(username, None) is not None

    def list_users(self) -> List[UserRecord]:
        with self._lock:
            return list(self._users.values())

    def user_exists(self, username: str) -> bool:
        with self._lock:
            return username in self._users


class LocalJSONUserStore(AbstractUserStore):
    """
    Robust local JSON file storage with atomic updates and strict OS file permissions.

    Security & Reliability:
    - Atomically writes to a tempfile first and replaces destination (`os.replace`).
    - Enforces POSIX 0600 file permissions (read/write only by file owner).
    - Thread-safe using re-entrant mutex lock.
    """

    def __init__(self, filepath: Union[str, Path] = "local_users.json") -> None:
        self.filepath = Path(filepath).resolve()
        self._lock = threading.RLock()
        self._ensure_storage_exists()

    def _ensure_storage_exists(self) -> None:
        """Ensure parent directory exists and initialize file if missing."""
        with self._lock:
            self.filepath.parent.mkdir(parents=True, exist_ok=True)
            if not self.filepath.exists():
                self._write_records_atomic({})
            else:
                self._enforce_file_permissions(self.filepath)

    @staticmethod
    def _enforce_file_permissions(path: Path) -> None:
        """Set file permissions to 0600 (owner read/write only) on POSIX systems."""
        try:
            if os.name == "posix":
                current_mode = stat.S_IMODE(path.stat().st_mode)
                if current_mode != 0o600:
                    os.chmod(path, 0o600)
        except OSError as exc:
            logger.warning("Could not enforce 0600 permissions on %s: %s", path, exc)

    def _read_records(self) -> Dict[str, Dict[str, Any]]:
        """Read and parse user records from disk."""
        if not self.filepath.exists():
            return {}
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                data = json.loads(content)
                if not isinstance(data, dict):
                    raise StorageError(f"Corrupted storage format in {self.filepath}")
                return data
        except json.JSONDecodeError as exc:
            raise StorageError(f"Corrupted JSON in user storage: {exc}") from exc
        except OSError as exc:
            raise StorageError(f"Failed to read user storage: {exc}") from exc

    def _write_records_atomic(self, records: Dict[str, Dict[str, Any]]) -> None:
        """
        Atomically write dictionary of records to disk.
        Uses a temporary file in the same directory, flushes, fsyncs, sets 0600,
        and atomically renames over target file.
        """
        target_dir = self.filepath.parent
        fd, temp_path = tempfile.mkstemp(
            prefix="auth_tmp_", suffix=".json", dir=target_dir
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, sort_keys=True)
                f.flush()
                os.fsync(f.fileno())

            temp_p = Path(temp_path)
            self._enforce_file_permissions(temp_p)
            os.replace(temp_path, self.filepath)
            self._enforce_file_permissions(self.filepath)
        except Exception as exc:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            raise StorageError(f"Atomic write to {self.filepath} failed: {exc}") from exc

    def get_user(self, username: str) -> Optional[UserRecord]:
        with self._lock:
            data = self._read_records()
            user_dict = data.get(username)
            if user_dict:
                return UserRecord.from_dict(user_dict)
            return None

    def save_user(self, user: UserRecord) -> None:
        with self._lock:
            data = self._read_records()
            data[user.username] = user.to_dict()
            self._write_records_atomic(data)

    def delete_user(self, username: str) -> bool:
        with self._lock:
            data = self._read_records()
            if username in data:
                del data[username]
                self._write_records_atomic(data)
                return True
            return False

    def list_users(self) -> List[UserRecord]:
        with self._lock:
            data = self._read_records()
            return [UserRecord.from_dict(val) for val in data.values()]

    def user_exists(self, username: str) -> bool:
        with self._lock:
            data = self._read_records()
            return username in data


# =====================================================================
# 5. Local Authentication Manager (High-Level Coordinator)
# =====================================================================

class LocalAuthManager:
    """
    High-level local authentication manager.
    Coordinates the decoupled Argon2PasswordHasher and AbstractUserStore.
    """

    def __init__(
        self,
        hasher: Optional[Argon2PasswordHasher] = None,
        store: Optional[AbstractUserStore] = None,
    ) -> None:
        self.hasher = hasher or Argon2PasswordHasher()
        self.store = store or LocalJSONUserStore()

    def register_user(
        self,
        username: str,
        password: str,
        role: str = "operator",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UserRecord:
        """
        Register a new local user with an Argon2id password hash.

        Raises:
            UserAlreadyExistsError: If username already exists.
            ValueError: If username or password format is invalid.
        """
        username_clean = username.strip()
        if not username_clean:
            raise ValueError("Username cannot be empty.")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters.")

        if self.store.user_exists(username_clean):
            raise UserAlreadyExistsError(f"User '{username_clean}' already exists.")

        hashed_password = self.hasher.hash(password)
        now_iso = datetime.now(timezone.utc).isoformat()

        user = UserRecord(
            username=username_clean,
            password_hash=hashed_password,
            role=role,
            created_at=now_iso,
            updated_at=now_iso,
            metadata=metadata or {},
        )
        self.store.save_user(user)
        logger.info("Successfully registered user '%s' [role: %s]", username_clean, role)
        return user

    def authenticate_user(
        self,
        username: str,
        password: str,
        auto_rehash: bool = True,
    ) -> Tuple[bool, Optional[UserRecord]]:
        """
        Authenticate a user by username and password.

        Security Features:
        - Constant-time dummy verification when user does not exist (prevents timing oracle).
        - Automatic hash migration: if `auto_rehash=True` and hash parameters are outdated,
          the password is re-hashed with updated parameters and persisted transparently.

        Returns:
            Tuple of (success: bool, user_record: Optional[UserRecord]).
        """
        username_clean = username.strip()
        user = self.store.get_user(username_clean)

        if not user:
            # Timing mitigation: execute dummy verification against synthetic hash
            self.hasher.dummy_verify(password)
            return False, None

        is_valid = self.hasher.verify(password, user.password_hash)
        if not is_valid:
            return False, None

        # Check if hash parameters need upgrade (e.g. higher memory/time cost)
        if auto_rehash and self.hasher.check_needs_rehash(user.password_hash):
            try:
                new_hash = self.hasher.hash(password)
                user.password_hash = new_hash
                user.updated_at = datetime.now(timezone.utc).isoformat()
                self.store.save_user(user)
                logger.info("Auto-rehashed password for user '%s' to match latest parameters.", username_clean)
            except Exception as exc:
                logger.warning("Failed to auto-rehash password for user '%s': %s", username_clean, exc)

        return True, user

    def change_password(
        self, username: str, old_password: str, new_password: str
    ) -> bool:
        """
        Safely change a user's password after verifying existing credentials.

        Raises:
            UserNotFoundError: If username is not found.
            InvalidCredentialsError: If old_password is incorrect.
            ValueError: If new_password does not meet requirements.
        """
        username_clean = username.strip()
        user = self.store.get_user(username_clean)
        if not user:
            raise UserNotFoundError(f"User '{username_clean}' not found.")

        if not self.hasher.verify(old_password, user.password_hash):
            raise InvalidCredentialsError("Current password verification failed.")

        if len(new_password) < 6:
            raise ValueError("New password must be at least 6 characters.")

        user.password_hash = self.hasher.hash(new_password)
        user.updated_at = datetime.now(timezone.utc).isoformat()
        self.store.save_user(user)
        logger.info("Password changed successfully for user '%s'.", username_clean)
        return True

    def delete_user(self, username: str) -> bool:
        """Delete user by username."""
        return self.store.delete_user(username.strip())

    def get_user(self, username: str) -> Optional[UserRecord]:
        """Fetch user profile by username."""
        return self.store.get_user(username.strip())

    def list_users(self) -> List[UserRecord]:
        """List all users registered in the system."""
        return self.store.list_users()


# =====================================================================
# 6. Demonstration & Self-Test Suite
# =====================================================================

if __name__ == "__main__":
    import shutil
    import sys

    print("=" * 70)
    print("ARGON2ID LOCAL AUTHENTICATION & PASSWORD SECURITY MODULE SELF-TEST")
    print("=" * 70)

    # 1. Initialize Hasher with RFC 9106 Recommended Parameters
    # For rapid CLI demonstration, we use time_cost=2, memory=32MiB to keep test execution snappy
    demo_config = Argon2Config(
        time_cost=2,
        memory_cost=32768,  # 32 MiB
        parallelism=2,
        hash_len=32,
        salt_len=16,
    )
    hasher = Argon2PasswordHasher(demo_config)
    print(f"\n[1] Initialized Argon2id Hasher:")
    print(f"    - Type: {demo_config.type.name}")
    print(f"    - Time Cost (iterations): {demo_config.time_cost}")
    print(f"    - Memory Cost: {demo_config.memory_cost} KiB ({demo_config.memory_cost // 1024} MiB)")
    print(f"    - Parallelism: {demo_config.parallelism} lanes")
    print(f"    - Salt Length: {demo_config.salt_len} bytes")
    print(f"    - Derived Key Length: {demo_config.hash_len} bytes")

    # 2. Test Safe Password Hashing (PHC String Format)
    test_password = "SuperSecret_Admin_Pass@2026!"
    phc_hash = hasher.hash(test_password)
    print(f"\n[2] Generated PHC-Formatted Hash String:")
    print(f"    {phc_hash}")
    assert phc_hash.startswith("$argon2id$v=19$"), "Hash must follow Argon2id PHC format"

    # 3. Test Verification
    print("\n[3] Testing Password Verification:")
    valid_result = hasher.verify(test_password, phc_hash)
    invalid_result = hasher.verify("Wrong_Password_123", phc_hash)
    print(f"    - Correct password check: {'PASS (True)' if valid_result else 'FAIL'}")
    print(f"    - Incorrect password check: {'PASS (False)' if not invalid_result else 'FAIL'}")
    assert valid_result is True
    assert invalid_result is False

    # 4. Test Error Handling for Corrupted Hashes
    print("\n[4] Testing Error Handling on Corrupted Hashes:")
    corrupted_hash = "$argon2id$v=19$m=65536,t=3,p=4$corrupted_salt$corrupted_digest"
    safe_verify_corrupted = hasher.verify(test_password, corrupted_hash)
    print(f"    - Safe verify on corrupted hash: {safe_verify_corrupted} (graceful False, no crash)")
    assert safe_verify_corrupted is False

    try:
        hasher.verify_strict(test_password, "invalid_garbage_string")
        print("    - Strict verify on malformed hash: FAIL (should have raised InvalidHashError)")
        sys.exit(1)
    except InvalidHashError as exc:
        print(f"    - Strict verify caught expected InvalidHashError: {exc}")

    # 5. Test Local User Storage & LocalAuthManager Workflow
    test_dir = tempfile.mkdtemp(prefix="auth_security_test_")
    test_storage_path = Path(test_dir) / "test_users_vault.json"

    try:
        print(f"\n[5] Testing LocalAuthManager with LocalJSONUserStore at:")
        print(f"    {test_storage_path}")

        store = LocalJSONUserStore(test_storage_path)
        manager = LocalAuthManager(hasher=hasher, store=store)

        # Register Users
        user_alice = manager.register_user(
            username="alice",
            password="AliceQuantumPass#88",
            role="security_officer",
            metadata={"clearance": "Top Secret", "pqc_algorithm": "ML-KEM-768"},
        )
        print(f"    - Registered user '{user_alice.username}' with role '{user_alice.role}'")

        user_bob = manager.register_user(
            username="bob",
            password="BobStationKey@99",
            role="analyst",
            metadata={"clearance": "Confidential"},
        )
        print(f"    - Registered user '{user_bob.username}' with role '{user_bob.role}'")

        # Test duplicate registration rejection
        try:
            manager.register_user("alice", "AnotherPassword123")
            print("    - Duplicate registration check: FAIL")
            sys.exit(1)
        except UserAlreadyExistsError:
            print("    - Duplicate registration correctly rejected: PASS")

        # Test Successful Authentication
        print("\n[6] Testing Authentication Flow:")
        success_alice, record_alice = manager.authenticate_user("alice", "AliceQuantumPass#88")
        print(f"    - Alice login with correct password: {'PASS' if success_alice else 'FAIL'}")
        assert success_alice is True and record_alice is not None
        assert record_alice.metadata["clearance"] == "Top Secret"

        # Test Failed Authentication (Wrong Password)
        fail_alice, _ = manager.authenticate_user("alice", "WrongPass")
        print(f"    - Alice login with wrong password: {'PASS (Rejected)' if not fail_alice else 'FAIL'}")
        assert fail_alice is False

        # Test Non-existent User (Timing-resistant Dummy Verification)
        fail_ghost, _ = manager.authenticate_user("nonexistent_user", "AnyPassword#1")
        print(f"    - Non-existent user login: {'PASS (Rejected)' if not fail_ghost else 'FAIL'}")
        assert fail_ghost is False

        # 6. Test Parameter Migration & Rehash Detection
        print("\n[7] Testing Parameter Migration & Auto-Rehash (check_needs_rehash):")
        # Simulate an older hash with legacy parameters (e.g. memory_cost=1024 KiB, time_cost=1)
        legacy_config = Argon2Config(time_cost=1, memory_cost=2048, parallelism=1)
        legacy_hasher = Argon2PasswordHasher(legacy_config)
        legacy_hash = legacy_hasher.hash("LegacyPassword#2024")

        # Current hasher uses memory_cost=32768, time_cost=2
        needs_rehash = hasher.check_needs_rehash(legacy_hash)
        print(f"    - Legacy hash detected as needing upgrade: {needs_rehash}")
        assert needs_rehash is True, "Hasher should identify outdated parameters"

        # Register a legacy user with outdated hash
        legacy_user = UserRecord(
            username="legacy_charlie",
            password_hash=legacy_hash,
            role="operator",
        )
        store.save_user(legacy_user)

        # Authenticate with auto_rehash=True
        auth_success, updated_record = manager.authenticate_user(
            "legacy_charlie", "LegacyPassword#2024", auto_rehash=True
        )
        assert auth_success is True
        print("    - Charlie authenticated successfully with legacy password.")

        # Verify that Charlie's stored hash was automatically re-hashed to new parameters!
        refetched_charlie = manager.get_user("legacy_charlie")
        assert refetched_charlie is not None
        rehash_still_needed = hasher.check_needs_rehash(refetched_charlie.password_hash)
        print(f"    - Charlie's hash auto-migrated on disk: {refetched_charlie.password_hash[:30]}...")
        print(f"    - Does migrated hash still need rehash? {rehash_still_needed}")
        assert rehash_still_needed is False, "Migrated hash should match current configuration"

        # 7. Test Password Change
        print("\n[8] Testing Password Change:")
        manager.change_password("alice", "AliceQuantumPass#88", "NewAliceQuantumPass#2026!")
        login_old, _ = manager.authenticate_user("alice", "AliceQuantumPass#88")
        login_new, _ = manager.authenticate_user("alice", "NewAliceQuantumPass#2026!")
        print(f"    - Old password invalid after change: {'PASS' if not login_old else 'FAIL'}")
        print(f"    - New password valid after change: {'PASS' if login_new else 'FAIL'}")
        assert not login_old and login_new

        # 8. Test Atomic Persistence Verification
        print("\n[9] Verifying Local Storage File Integrity & Permissions:")
        assert test_storage_path.exists()
        if os.name == "posix":
            mode = oct(stat.S_IMODE(test_storage_path.stat().st_mode))
            print(f"    - POSIX File Permissions: {mode} (0o600 required for security)")
            assert mode == "0o600", f"Expected 0o600 permissions, got {mode}"

        users_list = manager.list_users()
        print(f"    - Total users persisted on disk: {len(users_list)}")
        print(f"    - Users: {[u.username for u in users_list]}")
        assert len(users_list) == 3

        print("\n" + "=" * 70)
        print("ALL AUTH SECURITY TESTS PASSED SUCCESSFULLY (100% OPERATIONAL)")
        print("=" * 70)

    finally:
        shutil.rmtree(test_dir, ignore_errors=True)
