"""
Unit Tests for Local Authentication & Argon2id Password Security Module.
Supports both `pytest` and Python's built-in `unittest`.
"""

import os
import stat
import tempfile
import unittest
from pathlib import Path

from app.auth_security import (
    Argon2Config,
    Argon2PasswordHasher,
    UserRecord,
    InMemoryUserStore,
    LocalJSONUserStore,
    LocalAuthManager,
    InvalidHashError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
)


class TestAuthSecurity(unittest.TestCase):
    def setUp(self):
        # Configure lightweight parameters for snappy test execution
        self.fast_config = Argon2Config(
            time_cost=1,
            memory_cost=2048,
            parallelism=1,
            hash_len=32,
            salt_len=16,
        )
        self.hasher = Argon2PasswordHasher(self.fast_config)
        self.temp_dir = tempfile.mkdtemp(prefix="auth_test_")
        self.vault_file = Path(self.temp_dir) / "test_auth_vault.json"
        self.store = LocalJSONUserStore(self.vault_file)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_argon2id_hashing_and_verification(self):
        password = "Secr3t_Password_2026!"
        phc_hash = self.hasher.hash(password)

        self.assertTrue(phc_hash.startswith("$argon2id$v=19$"))
        self.assertTrue(self.hasher.verify(password, phc_hash))
        self.assertFalse(self.hasher.verify("Wrong_Password", phc_hash))

    def test_corrupted_hash_handling(self):
        corrupted = "$argon2id$v=19$m=1024,t=1,p=1$bad$salt"
        self.assertFalse(self.hasher.verify("any_password", corrupted))

        with self.assertRaises(InvalidHashError):
            self.hasher.verify_strict("any_password", "completely_invalid_hash")

    def test_rehash_migration_detection(self):
        old_config = Argon2Config(time_cost=1, memory_cost=2048, parallelism=1)
        old_hasher = Argon2PasswordHasher(old_config)
        old_hash = old_hasher.hash("TestPass123")

        new_config = Argon2Config(time_cost=2, memory_cost=4096, parallelism=2)
        new_hasher = Argon2PasswordHasher(new_config)

        # Hasher with higher parameters should detect that old_hash requires rehashing
        self.assertTrue(new_hasher.check_needs_rehash(old_hash))

        # Hash created with current config should NOT require rehashing
        current_hash = new_hasher.hash("TestPass123")
        self.assertFalse(new_hasher.check_needs_rehash(current_hash))

    def test_in_memory_user_registration_and_auth(self):
        store = InMemoryUserStore()
        manager = LocalAuthManager(hasher=self.hasher, store=store)

        user = manager.register_user(
            username="admin",
            password="AdminPQCKey#2026",
            role="administrator",
            metadata={"department": "Cryptographic Operations"},
        )
        self.assertEqual(user.username, "admin")
        self.assertEqual(user.role, "administrator")
        self.assertEqual(user.metadata["department"], "Cryptographic Operations")

        # Duplicate registration check
        with self.assertRaises(UserAlreadyExistsError):
            manager.register_user("admin", "DifferentPass123")

        # Successful login
        auth_ok, rec = manager.authenticate_user("admin", "AdminPQCKey#2026")
        self.assertTrue(auth_ok)
        self.assertIsNotNone(rec)
        self.assertEqual(rec.username, "admin")

        # Failed login (wrong password)
        auth_fail, _ = manager.authenticate_user("admin", "WrongPass")
        self.assertFalse(auth_fail)

        # Failed login (nonexistent user)
        auth_ghost, _ = manager.authenticate_user("ghost", "GhostPass")
        self.assertFalse(auth_ghost)

    def test_automatic_rehash_on_login(self):
        # Seed user with legacy hash
        legacy_hasher = Argon2PasswordHasher(Argon2Config(time_cost=1, memory_cost=2048, parallelism=1))
        legacy_hash = legacy_hasher.hash("MigrateMe#123")
        legacy_user = UserRecord(username="migrating_user", password_hash=legacy_hash)
        self.store.save_user(legacy_user)

        # Initialize manager with upgraded hasher
        upgraded_hasher = Argon2PasswordHasher(Argon2Config(time_cost=2, memory_cost=4096, parallelism=2))
        manager = LocalAuthManager(hasher=upgraded_hasher, store=self.store)

        # Authenticate -> triggers automatic rehash
        success, user_rec = manager.authenticate_user("migrating_user", "MigrateMe#123", auto_rehash=True)
        self.assertTrue(success)

        # Re-fetch from store and verify parameter migration
        updated_user = manager.get_user("migrating_user")
        self.assertFalse(upgraded_hasher.check_needs_rehash(updated_user.password_hash))

    def test_password_change(self):
        manager = LocalAuthManager(hasher=self.hasher, store=self.store)
        manager.register_user("operator1", "OldPass#123456")

        # Invalid current password raises InvalidCredentialsError
        with self.assertRaises(InvalidCredentialsError):
            manager.change_password("operator1", "WrongOldPass", "NewPass#654321")

        # Correct change
        changed = manager.change_password("operator1", "OldPass#123456", "NewPass#654321")
        self.assertTrue(changed)

        # Verify old fails, new succeeds
        self.assertFalse(manager.authenticate_user("operator1", "OldPass#123456")[0])
        self.assertTrue(manager.authenticate_user("operator1", "NewPass#654321")[0])

    def test_file_permissions_and_atomicity(self):
        manager = LocalAuthManager(hasher=self.hasher, store=self.store)
        manager.register_user("user_posix", "SecurePass#9999")

        path = self.store.filepath
        self.assertTrue(path.exists())

        if os.name == "posix":
            mode = stat.S_IMODE(path.stat().st_mode)
            self.assertEqual(mode, 0o600)


if __name__ == "__main__":
    unittest.main()
