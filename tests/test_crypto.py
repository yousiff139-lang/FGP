"""
Unit Tests for Classical Cryptography Engine:
- ChaCha20-Poly1305 & AES-256-GCM AEAD
- ECDH P-256 Key Agreement
- ECDSA P-256 Digital Signatures & Non-Repudiation
"""
import pytest
from cryptography.exceptions import InvalidSignature
from app.crypto_engine import SymmetricEngine, ECDHEngine, ECDSAEngine


def test_chacha20_poly1305_roundtrip():
    plaintext = b"High-assurance quantum defense payload."
    ct, key, nonce = SymmetricEngine.encrypt_chacha20(plaintext)
    assert len(key) == 32
    assert len(nonce) == 12
    assert ct != plaintext

    recovered = SymmetricEngine.decrypt_chacha20(ct, key, nonce)
    assert recovered == plaintext


def test_chacha20_tamper_detection():
    plaintext = b"Top secret data."
    ct, key, nonce = SymmetricEngine.encrypt_chacha20(plaintext)
    tampered_ct = bytearray(ct)
    tampered_ct[0] ^= 0xFF

    with pytest.raises(Exception):
        SymmetricEngine.decrypt_chacha20(bytes(tampered_ct), key, nonce)


def test_aes_gcm_roundtrip():
    plaintext = b"Hardware-accelerated AEAD validation string."
    ct, key, nonce = SymmetricEngine.encrypt_aes_gcm(plaintext)
    assert len(key) == 32
    assert len(nonce) == 12
    assert ct != plaintext

    recovered = SymmetricEngine.decrypt_aes_gcm(ct, key, nonce)
    assert recovered == plaintext


def test_aes_gcm_tamper_detection():
    plaintext = b"Bank transfer authorization."
    ct, key, nonce = SymmetricEngine.encrypt_aes_gcm(plaintext)
    tampered_ct = bytearray(ct)
    tampered_ct[-1] ^= 0x01

    with pytest.raises(Exception):
        SymmetricEngine.decrypt_aes_gcm(bytes(tampered_ct), key, nonce)


def test_ecdh_key_agreement():
    alice_priv, alice_pub = ECDHEngine.generate_keypair()
    bob_priv, bob_pub = ECDHEngine.generate_keypair()

    alice_derived = ECDHEngine.derive_symmetric_key(alice_priv, bob_pub)
    bob_derived = ECDHEngine.derive_symmetric_key(bob_priv, alice_pub)

    assert len(alice_derived) == 32
    assert len(bob_derived) == 32
    assert alice_derived == bob_derived


def test_ecdsa_signature_verification():
    priv_pem, pub_pem = ECDSAEngine.generate_keypair()
    doc = b"Contract agreement signed with ECDSA P-256 curve."

    sig = ECDSAEngine.sign_document(doc, priv_pem)
    assert len(sig) > 0
    assert ECDSAEngine.verify_document(doc, sig, pub_pem) is True


def test_ecdsa_tamper_fails():
    priv_pem, pub_pem = ECDSAEngine.generate_keypair()
    doc = b"Authentic unaltered document."

    sig = ECDSAEngine.sign_document(doc, priv_pem)
    tampered_doc = b"Modified malicious document."

    assert ECDSAEngine.verify_document(tampered_doc, sig, pub_pem) is False
