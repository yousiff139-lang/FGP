"""
Unit Tests for NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber) PQC Module.
"""
import pytest
from app.kyber_pqc import KyberEngine
from app.crypto_engine import derive_subkeys_from_kyber


def test_kyber_keypair_generation():
    pk, sk = KyberEngine.generate_keypair()
    assert len(pk) == 1184
    assert len(sk) == 2400


def test_kyber_encapsulation_and_decapsulation():
    pk, sk = KyberEngine.generate_keypair()
    shared_secret_sender, ciphertext = KyberEngine.encapsulate(pk)

    assert len(shared_secret_sender) == 32
    assert len(ciphertext) == 1088

    shared_secret_receiver = KyberEngine.decapsulate(sk, ciphertext)
    assert len(shared_secret_receiver) == 32
    assert shared_secret_sender == shared_secret_receiver


def test_kyber_base64_helpers():
    pk, _ = KyberEngine.generate_keypair()
    b64 = KyberEngine.to_b64(pk)
    recovered = KyberEngine.from_b64(b64)
    assert recovered == pk


def test_kyber_invalid_key_lengths():
    with pytest.raises(ValueError):
        KyberEngine.encapsulate(b"short_pk")

    _, sk = KyberEngine.generate_keypair()
    with pytest.raises(ValueError):
        KyberEngine.decapsulate(sk, b"short_ct")

    with pytest.raises(ValueError):
        KyberEngine.decapsulate(b"short_sk", bytes([0] * 1088))


def test_derive_subkeys_from_kyber():
    pk, sk = KyberEngine.generate_keypair()
    ss1, ct = KyberEngine.encapsulate(pk)
    ss2 = KyberEngine.decapsulate(sk, ct)

    keys1 = derive_subkeys_from_kyber(ss1)
    keys2 = derive_subkeys_from_kyber(ss2)

    assert len(keys1["payload_key"]) == 32
    assert len(keys1["stego_seed"]) == 32
    assert len(keys1["integrity_key"]) == 32

    assert keys1["payload_key"] == keys2["payload_key"]
    assert keys1["stego_seed"] == keys2["stego_seed"]
    assert keys1["integrity_key"] == keys2["integrity_key"]
