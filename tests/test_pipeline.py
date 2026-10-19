"""
Integration Tests for Unified SecurityPipeline (Encrypt + Stego + Decrypt).
"""
import pytest
from app.kyber_pqc import KyberEngine
from app.pipeline import SecurityPipeline
from app.stego_engine import StegoEngine


@pytest.fixture
def recipient_keypair():
    pk, sk = KyberEngine.generate_keypair()
    return pk, sk


def test_pipeline_bulk_chacha20(recipient_keypair):
    pk, sk = recipient_keypair
    payload = b"Bulk payload with high-speed ChaCha20-Poly1305 stream cipher."

    result = SecurityPipeline.process_and_conceal(
        data_bytes=payload,
        filename="data.bin",
        recipient_kyber_pk=pk,
        preferred_cipher="chacha20",
        override_type="bulk"
    )

    assert "stego_image_bytes" in result
    assert "kyber_ciphertext_b64" in result

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    decrypted = SecurityPipeline.extract_and_decrypt(
        stego_image_bytes=stego_img,
        kyber_ciphertext_bytes=kyber_ct,
        recipient_kyber_sk=sk
    )

    assert decrypted["data_bytes"] == payload
    assert decrypted["cipher_used"] == "chacha20"
    assert decrypted["data_type"] == "bulk"


def test_pipeline_bulk_aes_gcm(recipient_keypair):
    pk, sk = recipient_keypair
    payload = b"Bulk payload encrypted via hardware AES-256-GCM."

    result = SecurityPipeline.process_and_conceal(
        data_bytes=payload,
        filename="archive.zip",
        recipient_kyber_pk=pk,
        preferred_cipher="aes_gcm"
    )

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    decrypted = SecurityPipeline.extract_and_decrypt(
        stego_image_bytes=stego_img,
        kyber_ciphertext_bytes=kyber_ct,
        recipient_kyber_sk=sk
    )

    assert decrypted["data_bytes"] == payload
    assert decrypted["cipher_used"] == "aes_gcm"


def test_pipeline_sensitive_route(recipient_keypair):
    pk, sk = recipient_keypair
    payload = b"password=SuperSecretLatticeVault2026!"

    result = SecurityPipeline.process_and_conceal(
        data_bytes=payload,
        filename="credentials.dat",
        recipient_kyber_pk=pk,
        override_type="sensitive"
    )

    assert result["classification"]["type"] == "sensitive"
    assert result["ecdh_pub_b64"] is not None

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    decrypted = SecurityPipeline.extract_and_decrypt(
        stego_image_bytes=stego_img,
        kyber_ciphertext_bytes=kyber_ct,
        recipient_kyber_sk=sk
    )

    assert decrypted["data_bytes"] == payload
    assert decrypted["data_type"] == "sensitive"


def test_pipeline_document_ecdsa_signature(recipient_keypair):
    pk, sk = recipient_keypair
    doc = b"Official Graduation Project Final Report - Mustansiriyah University."

    result = SecurityPipeline.process_and_conceal(
        data_bytes=doc,
        filename="thesis.pdf",
        recipient_kyber_pk=pk,
        override_type="document"
    )

    assert result["signature_b64"] is not None

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    decrypted = SecurityPipeline.extract_and_decrypt(
        stego_image_bytes=stego_img,
        kyber_ciphertext_bytes=kyber_ct,
        recipient_kyber_sk=sk
    )

    assert decrypted["data_bytes"] == doc
    assert decrypted["signature_verified"] is True


def test_pipeline_custom_cover_image(recipient_keypair):
    pk, sk = recipient_keypair
    custom_cover = StegoEngine.create_default_cover(width=300, height=300)
    payload = b"Testing custom carrier image embedding."

    result = SecurityPipeline.process_and_conceal(
        data_bytes=payload,
        filename="msg.txt",
        recipient_kyber_pk=pk,
        cover_image_bytes=custom_cover
    )

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    decrypted = SecurityPipeline.extract_and_decrypt(
        stego_image_bytes=stego_img,
        kyber_ciphertext_bytes=kyber_ct,
        recipient_kyber_sk=sk
    )

    assert decrypted["data_bytes"] == payload


def test_pipeline_wrong_recipient_sk(recipient_keypair):
    pk, _ = recipient_keypair
    _, wrong_sk = KyberEngine.generate_keypair()

    result = SecurityPipeline.process_and_conceal(
        data_bytes=b"Secret data.",
        filename="file.txt",
        recipient_kyber_pk=pk
    )

    stego_img = result["stego_image_bytes"]
    kyber_ct = KyberEngine.from_b64(result["kyber_ciphertext_b64"])

    # Wrong secret key recovers different shared secret -> wrong stego seed or wrong decryption key
    with pytest.raises(Exception):
        SecurityPipeline.extract_and_decrypt(
            stego_image_bytes=stego_img,
            kyber_ciphertext_bytes=kyber_ct,
            recipient_kyber_sk=wrong_sk
        )
