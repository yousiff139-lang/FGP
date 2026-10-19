"""
Post-Quantum Cryptography Module: NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber)

Implements lattice-based Key Encapsulation Mechanism (KEM) to package keys
against quantum cryptanalytic attacks (e.g. Shor's algorithm).

Parameters for ML-KEM-768 (NIST Security Category 3 - equivalent to AES-192):
  - Public Key (Encapsulation Key) length: 1184 bytes
  - Secret Key (Decapsulation Key) length: 2400 bytes
  - Ciphertext length: 1088 bytes
  - Shared Secret length: 32 bytes (256 bits)
"""

import base64
from kyber_py.ml_kem import ML_KEM_768


class KyberEngine:
    @staticmethod
    def generate_keypair() -> tuple[bytes, bytes]:
        """
        Generate a Kyber-768 public and private key pair.
        Returns:
            (public_key_bytes, secret_key_bytes)
        """
        pk, sk = ML_KEM_768.keygen()
        return pk, sk

    @staticmethod
    def encapsulate(public_key: bytes) -> tuple[bytes, bytes]:
        """
        Encapsulate a random 32-byte shared secret using recipient's public key.
        Returns:
            (shared_secret_32B, ciphertext_1088B)
        """
        if len(public_key) != 1184:
            raise ValueError(f"Invalid ML-KEM-768 public key length: {len(public_key)} (expected 1184)")
        
        shared_secret, ciphertext = ML_KEM_768.encaps(public_key)
        return shared_secret, ciphertext

    @staticmethod
    def decapsulate(secret_key: bytes, ciphertext: bytes) -> bytes:
        """
        Decapsulate the ciphertext using the recipient's secret key to recover the shared secret.
        Returns:
            shared_secret_32B
        """
        if len(secret_key) != 2400:
            raise ValueError(f"Invalid ML-KEM-768 secret key length: {len(secret_key)} (expected 2400)")
        if len(ciphertext) != 1088:
            raise ValueError(f"Invalid ML-KEM-768 ciphertext length: {len(ciphertext)} (expected 1088)")

        shared_secret = ML_KEM_768.decaps(secret_key, ciphertext)
        return shared_secret

    @staticmethod
    def to_b64(raw: bytes) -> str:
        return base64.b64encode(raw).decode('utf-8')

    @staticmethod
    def from_b64(b64_str: str) -> bytes:
        return base64.b64decode(b64_str.strip())
