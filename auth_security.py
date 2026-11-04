"""
Root-level re-export for auth_security module.
Enables direct importing via `import auth_security` or `from auth_security import ...`
in addition to package-level `from app.auth_security import ...`.
"""

from app.auth_security import (
    Argon2Config,
    Argon2PasswordHasher,
    UserRecord,
    AbstractUserStore,
    InMemoryUserStore,
    LocalJSONUserStore,
    LocalAuthManager,
    AuthSecurityError,
    InvalidHashError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
    StorageError,
)

__all__ = [
    "Argon2Config",
    "Argon2PasswordHasher",
    "UserRecord",
    "AbstractUserStore",
    "InMemoryUserStore",
    "LocalJSONUserStore",
    "LocalAuthManager",
    "AuthSecurityError",
    "InvalidHashError",
    "InvalidCredentialsError",
    "UserAlreadyExistsError",
    "UserNotFoundError",
    "StorageError",
]

if __name__ == "__main__":
    import subprocess
    import sys
    sys.exit(subprocess.call([sys.executable, "-m", "app.auth_security"]))
