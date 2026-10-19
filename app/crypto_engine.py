"""
Classical Cryptographic Engine

Implements:
1. Symmetric Ciphers:
   - ChaCha20-Poly1305 (256-bit key, 96-bit nonce, 128-bit Poly1305 authentication tag)
   - AES-256-GCM (256-bit key, 96-bit IV, 128-bit authentication tag)
2. Asymmetric Ciphers:
   - ECDH P-256 (NIST SECP256R1 curve for key agreement)
3. Digital Signatures:
   - ECDSA P-256 (SHA-256 hash for document integrity and non-repudiation)
4. Key Derivation:
   - HKDF-SHA256 for expanding Kyber shared secrets into multiple functional keys
"""

import os
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305, AESGCM
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.exceptions import InvalidSignature


# --- 1. Symmetric AEAD Ciphers ---

class SymmetricEngine:
    @staticmethod
    def encrypt_chacha20(plaintext: bytes, key: bytes = None) -> tuple[bytes, bytes, bytes]:
        """
        Encrypt using ChaCha20-Poly1305.
        Returns:
            (ciphertext_with_tag, key_32B, nonce_12B)
        """
        if not key:
            key = ChaCha20Poly1305.generate_key()
        nonce = os.urandom(12)
        cipher = ChaCha20Poly1305(key)
        ciphertext = cipher.encrypt(nonce, plaintext, None)
        return ciphertext, key, nonce

    @staticmethod
    def decrypt_chacha20(ciphertext: bytes, key: bytes, nonce: bytes) -> bytes:
        """
        Decrypt and verify using ChaCha20-Poly1305.
        """
        cipher = ChaCha20Poly1305(key)
        return cipher.decrypt(nonce, ciphertext, None)

    @staticmethod
    def encrypt_aes_gcm(plaintext: bytes, key: bytes = None) -> tuple[bytes, bytes, bytes]:
        """
        Encrypt using AES-256-GCM.
        Returns:
            (ciphertext_with_tag, key_32B, nonce_12B)
        """
        if not key:
            key = AESGCM.generate_key(bit_length=256)
        nonce = os.urandom(12)
        cipher = AESGCM(key)
        ciphertext = cipher.encrypt(nonce, plaintext, None)
        return ciphertext, key, nonce

    @staticmethod
    def decrypt_aes_gcm(ciphertext: bytes, key: bytes, nonce: bytes) -> bytes:
        """
        Decrypt and verify using AES-256-GCM.
        """
        cipher = AESGCM(key)
        return cipher.decrypt(nonce, ciphertext, None)


# --- 2. Asymmetric Key Agreement (ECDH P-256) ---

class ECDHEngine:
    @staticmethod
    def generate_keypair() -> tuple[ec.EllipticCurvePrivateKey, bytes]:
        """
        Generate ephemeral ECDH keypair on SECP256R1.
        Returns (private_key_obj, public_key_pem_bytes)
        """
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return private_key, public_pem

    @staticmethod
    def derive_symmetric_key(private_key: ec.EllipticCurvePrivateKey, peer_public_pem: bytes) -> bytes:
        """
        Perform ECDH exchange with peer public key to derive a 256-bit symmetric key.
        """
        peer_pubkey = serialization.load_pem_public_key(peer_public_pem)
        shared_secret = private_key.exchange(ec.ECDH(), peer_pubkey)

        # Expand shared secret with HKDF to obtain high-entropy 256-bit key
        derived_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"ecdh-p256-symmetric-derivation"
        ).derive(shared_secret)
        return derived_key


# --- 3. Digital Signatures (ECDSA P-256) ---

class ECDSAEngine:
    @staticmethod
    def generate_keypair() -> tuple[bytes, bytes]:
        """
        Generate ECDSA signing keypair on SECP256R1.
        Returns (private_pem_bytes, public_pem_bytes)
        """
        private_key = ec.generate_private_key(ec.SECP256R1())
        priv_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        pub_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return priv_pem, pub_pem

    @staticmethod
    def sign_document(document_bytes: bytes, private_pem: bytes) -> bytes:
        """
        Sign document hash with ECDSA-SHA256.
        """
        private_key = serialization.load_pem_private_key(private_pem, password=None)
        signature = private_key.sign(
            document_bytes,
            ec.ECDSA(hashes.SHA256())
        )
        return signature

    @staticmethod
    def verify_document(document_bytes: bytes, signature: bytes, public_pem: bytes) -> bool:
        """
        Verify an ECDSA-SHA256 signature.
        """
        try:
            pubkey = serialization.load_pem_public_key(public_pem)
            pubkey.verify(
                signature,
                document_bytes,
                ec.ECDSA(hashes.SHA256())
            )
            return True
        except (InvalidSignature, Exception):
            return False


# --- 4. Post-Quantum Key Derivation (HKDF) ---

def derive_subkeys_from_kyber(kyber_shared_secret: bytes) -> dict:
    """
    Derive distinct cryptographic keys from the 32-byte Kyber shared secret:
      1. payload_key: 32 bytes for ChaCha20/AES encryption
      2. stego_seed: 32 bytes for deterministic pseudo-random pixel permutation
      3. integrity_key: 32 bytes for package verification
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=96,  # 32 * 3 bytes
        salt=b"hybrid-pqc-stego-salt-v1",
        info=b"kyber768-key-and-stego-seed-expansion"
    )
    expanded = hkdf.derive(kyber_shared_secret)
    return {
        "payload_key": expanded[0:32],
        "stego_seed": expanded[32:64],
        "integrity_key": expanded[64:96]
    }
