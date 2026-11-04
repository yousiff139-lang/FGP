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


def test_public_directory_and_sas_safety_numbers():
    from fastapi.testclient import TestClient
    from app.main import app, compute_sas_safety_number

    client = TestClient(app)

    # 1. Generate keypairs for Alice and Bob
    alice_pk, alice_sk = KyberEngine.generate_keypair()
    bob_pk, bob_sk = KyberEngine.generate_keypair()

    alice_pk_b64 = KyberEngine.to_b64(alice_pk)
    bob_pk_b64 = KyberEngine.to_b64(bob_pk)

    # 2. Publish Alice's identity
    res_a = client.post("/api/directory/publish", data={
        "username": "Alice_Defense",
        "kyber_pk_b64": alice_pk_b64
    })
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["status"] == "success"
    assert len(data_a["kyber_fingerprint"]) == 14  # XXXX-XXXX-XXXX

    # 3. Publish Bob's identity
    res_b = client.post("/api/directory/publish", data={
        "username": "Bob_Command",
        "kyber_pk_b64": bob_pk_b64
    })
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["status"] == "success"

    # 4. List directory peers
    res_peers = client.get("/api/directory/peers")
    assert res_peers.status_code == 200
    peers_list = res_peers.json()["peers"]
    peer_usernames = [p["username"] for p in peers_list]
    assert "Alice_Defense" in peer_usernames
    assert "Bob_Command" in peer_usernames

    # 5. Verify mutual SAS Safety Number determinism and symmetry
    sas_alice_to_bob = client.get("/api/directory/safety_number?user_a=Alice_Defense&user_b=Bob_Command").json()
    sas_bob_to_alice = client.get("/api/directory/safety_number?user_a=Bob_Command&user_b=Alice_Defense").json()

    assert sas_alice_to_bob["status"] == "success"
    assert sas_bob_to_alice["status"] == "success"

    # Symmetrical: Digits and emojis must match exactly
    assert sas_alice_to_bob["digits"] == sas_bob_to_alice["digits"]
    assert sas_alice_to_bob["emojis"] == sas_bob_to_alice["emojis"]
    assert len(sas_alice_to_bob["digits"]) == 7  # XXX-XXX format


def test_peer_inbox_e2e_dispatch():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Publish Bob
    bob_pk, bob_sk = KyberEngine.generate_keypair()
    bob_pk_b64 = KyberEngine.to_b64(bob_pk)
    client.post("/api/directory/publish", data={
        "username": "General_Bob",
        "kyber_pk_b64": bob_pk_b64
    })

    # Clear Bob's inbox first
    client.post("/api/inbox/clear", data={"username": "General_Bob"})

    # 2. Alice sends a direct PQC encrypted transmission to Bob
    secret_text = "Mission Briefing 2026: Quantum satellite telemetry encrypted with Kyber-768."
    enc_res = client.post("/api/encrypt", data={
        "text": secret_text,
        "recipient_username": "General_Bob",
        "intent_objective": "direct_pqc",
        "username": "Agent_Alice"
    })
    assert enc_res.status_code == 200
    enc_json = enc_res.json()
    assert enc_json["dispatched_to_inbox"] is True
    assert enc_json["recipient_username"] == "General_Bob"

    # 3. Bob checks his inbox
    inbox_res = client.get("/api/inbox/list?username=General_Bob")
    assert inbox_res.status_code == 200
    inbox_data = inbox_res.json()
    assert inbox_data["total"] >= 1

    latest_item = inbox_data["items"][0]
    assert latest_item["sender"] == "Agent_Alice"
    assert latest_item["mode"] == "direct_pqc"

    # 4. Bob decapsulates and decrypts the transmission
    pqc_pkg = latest_item["direct_pqc_package"]
    dec_res = client.post("/api/decrypt_direct", data={
        "ciphertext_b64": pqc_pkg["ciphertext_b64"],
        "nonce_b64": pqc_pkg["nonce_b64"],
        "kyber_ciphertext_b64": pqc_pkg["kyber_ciphertext_b64"],
        "recipient_kyber_sk_b64": KyberEngine.to_b64(bob_sk),
        "cipher_used": pqc_pkg["cipher_used"],
        "username": "General_Bob"
    })
    assert dec_res.status_code == 200
    dec_json = dec_res.json()
    assert dec_json["status"] == "success"
    assert dec_json["text_preview"] == secret_text

    # 5. Bob deletes the transmission
    tx_id = latest_item["id"]
    del_res = client.post("/api/inbox/delete", data={
        "username": "General_Bob",
        "transmission_id": tx_id
    })
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

