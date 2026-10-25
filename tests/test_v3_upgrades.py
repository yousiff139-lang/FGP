"""
Unit Tests for System Upgrade:
- Argon2id Password Hashing & Verification
- Content-Adaptive Sobel Edge Steganography
- Modular Standalone DSA Pipeline
- Direct PQC Pipeline
- Financial Sensitivity & ChaCha20 Auto-Enforcement
"""

import os
import io
import json
import numpy as np
from PIL import Image

from app.crypto_engine import Argon2Engine
from app.stego_engine import StegoEngine
from app.classifier import evaluate_security_intent, detect_financial_sensitivity
from app.pipeline import SecurityPipeline
from app.kyber_pqc import KyberEngine


def test_argon2id_password_hashing():
    pw = "Pqc_Secure_Passwd_2026!"
    h = Argon2Engine.hash_password(pw)
    assert h.startswith("$argon2id$")
    assert Argon2Engine.verify_password(h, pw) is True
    assert Argon2Engine.verify_password(h, "WrongPassword") is False


def test_argon2id_kdf_raw_derivation():
    secret = b"kyber_shared_secret_32bytes_sample"
    salt = b"test_salt_16byte"
    kdf = Argon2Engine.derive_kdf(secret, salt, length=64)
    assert len(kdf) == 64
    # Deterministic
    kdf2 = Argon2Engine.derive_kdf(secret, salt, length=64)
    assert kdf == kdf2


def test_content_adaptive_edge_stego_roundtrip():
    # Generate cover with gradient texture
    w, h = 150, 150
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            arr[y, x] = [(x * 5) % 256, (y * 3) % 256, ((x + y) * 4) % 256]

    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG")
    cover_bytes = buf.getvalue()

    payload = b"Quantum-Safe Hybrid Security: Content-Adaptive Sobel Edge Stego with Argon2id MAC."
    seed = os.urandom(32)

    stego_png = StegoEngine.embed(cover_bytes, payload, seed)
    assert len(stego_png) > 0

    extracted = StegoEngine.extract(stego_png, seed)
    assert extracted == payload


def test_financial_sensitivity_and_chacha20_enforcement():
    # Sample card text
    card_text = b"Confidential: Card Number 4532-1234-5678-9012 CVV 882 Exp 09/29"
    eval_res = evaluate_security_intent(card_text, "payment.txt")

    assert eval_res["is_financial"] is True
    assert eval_res["recommended_cipher"] == "chacha20"
    assert "Constant-time" in eval_res["cipher_reason"]


def test_modular_dsa_only_pipeline():
    doc = b"Contract Agreement: Transfer of Intellectual Property"
    receipt = SecurityPipeline.process_dsa_only(doc, "contract.pdf")

    assert receipt["type"] == "dsa_only"
    assert receipt["algorithm"] == "ECDSA-P256-SHA256"
    assert "signature_b64" in receipt
    assert "public_key_pem_b64" in receipt

    # Verify signature
    valid = SecurityPipeline.verify_dsa_only(
        doc,
        receipt["signature_b64"],
        receipt["public_key_pem_b64"]
    )
    assert valid is True

    # Tampered doc must fail
    invalid = SecurityPipeline.verify_dsa_only(
        doc + b" tampered",
        receipt["signature_b64"],
        receipt["public_key_pem_b64"]
    )
    assert invalid is False


def test_modular_direct_pqc_pipeline():
    pk, sk = KyberEngine.generate_keypair()
    data = b"High Security Telemetry Packet without Stego Overhead."

    direct = SecurityPipeline.process_direct_pqc(
        data_bytes=data,
        filename="telemetry.bin",
        recipient_kyber_pk=pk,
        preferred_cipher="chacha20"
    )

    assert "ciphertext_b64" in direct
    assert "kyber_ciphertext_b64" in direct
    assert "nonce_b64" in direct

    dec = SecurityPipeline.decrypt_direct_pqc(
        ciphertext_b64=direct["ciphertext_b64"],
        nonce_b64=direct["nonce_b64"],
        kyber_ct_b64=direct["kyber_ciphertext_b64"],
        recipient_kyber_sk_b64=KyberEngine.to_b64(sk),
        cipher_used="chacha20"
    )

    assert dec["plaintext"] == data
