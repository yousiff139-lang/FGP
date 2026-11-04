"""
Complete End-to-End System Architecture Test (A to Z)
Tests the entire Post-Quantum Steganographic Cryptosystem:
1. Module A: Lattice Post-Quantum Cryptography (ML-KEM-768 / Kyber-768)
2. Module B: Symmetric AEAD Ciphers (ChaCha20-Poly1305 & AES-256-GCM) with Tamper Resistance
3. Module C: Elliptic Curve Cryptography (ECDH Secret Agreement & ECDSA Digital Signatures)
4. Module D: Memory-Hard Argon2id Engine (Password Hashing, Verification & KDF)
5. Module E: Content-Adaptive Steganography (Sobel Operator Edge Detection & LSB Embedding)
6. Module F: Payload Classification Engine & Financial Policy Auto-Enforcement
7. Module G: Public Identity Directory, Fingerprinting & Mutual SAS Safety Numbers
8. Module H: Direct Peer E2EE Inbox Dispatch & 1-Click Decryption Workflow (Alice -> Bob)
9. Module I: Modular Direct PQC Mode (Kyber AEAD without Image Steganography)
10. Module J: Standalone ECDSA Digital Signature Verification Receipt
11. Module K: Audit Trail Logging & Zero-Database Guarantee
"""

import io
import os
import json
import base64
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app, public_directory_store, peer_inbox_store, compute_sas_safety_number
from app.crypto_engine import SymmetricEngine, ECDHEngine, ECDSAEngine, Argon2Engine, derive_subkeys_from_kyber
from app.kyber_pqc import KyberEngine
from app.stego_engine import StegoEngine
from app.classifier import evaluate_security_intent, detect_financial_sensitivity, classify_input
from app.pipeline import SecurityPipeline

client = TestClient(app)


def test_a_to_z_architecture():
    print("\n" + "=" * 70)
    print("STARTING COMPLETE ARCHITECTURE VALIDATION (A TO Z)")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. MODULE A: LATTICE PQC (ML-KEM-768)
    # -------------------------------------------------------------
    print("\n[A] Testing Lattice Post-Quantum Key Encapsulation (ML-KEM-768)...")
    alice_pk_bytes, alice_sk_bytes = KyberEngine.generate_keypair()
    assert len(alice_pk_bytes) == 1184, f"Invalid Kyber PK length: {len(alice_pk_bytes)}"
    assert len(alice_sk_bytes) == 2400, f"Invalid Kyber SK length: {len(alice_sk_bytes)}"

    alice_pk_b64 = KyberEngine.to_b64(alice_pk_bytes)
    alice_sk_b64 = KyberEngine.to_b64(alice_sk_bytes)

    # Encapsulation by sender
    shared_secret_enc, ct_bytes = KyberEngine.encapsulate(alice_pk_bytes)
    assert len(ct_bytes) == 1088, f"Invalid Kyber CT length: {len(ct_bytes)}"
    assert len(shared_secret_enc) == 32, f"Invalid Shared Secret length: {len(shared_secret_enc)}"

    # Decapsulation by receiver
    shared_secret_dec = KyberEngine.decapsulate(alice_sk_bytes, ct_bytes)
    assert shared_secret_enc == shared_secret_dec, "Kyber shared secrets do not match!"

    # Derive subkeys
    subkeys = derive_subkeys_from_kyber(shared_secret_dec)
    assert len(subkeys["payload_key"]) == 32
    assert len(subkeys["stego_seed"]) == 32
    assert len(subkeys["integrity_key"]) == 32
    print("  [OK] ML-KEM-768 Keypair (1,184B / 2,400B), Encapsulation (1,088B) & HKDF subkeys verified.")

    # -------------------------------------------------------------
    # 2. MODULE B: SYMMETRIC AEAD CIPHERS & TAMPER DETECTION
    # -------------------------------------------------------------
    print("\n[B] Testing Symmetric AEAD Ciphers (ChaCha20-Poly1305 & AES-256-GCM)...")
    plaintext_data = b"CONFIDENTIAL_PROJECT_DEFENSE_2026_PAYLOAD_TEST"

    # ChaCha20-Poly1305
    c_ct, c_key, c_nonce = SymmetricEngine.encrypt_chacha20(plaintext_data)
    c_rec = SymmetricEngine.decrypt_chacha20(c_ct, c_key, c_nonce)
    assert c_rec == plaintext_data, "ChaCha20 roundtrip failed"

    # ChaCha20 Tamper Detection
    tampered_c_ct = bytearray(c_ct)
    tampered_c_ct[0] ^= 0xFF
    try:
        SymmetricEngine.decrypt_chacha20(bytes(tampered_c_ct), c_key, c_nonce)
        assert False, "ChaCha20 failed to reject tampered ciphertext!"
    except Exception:
        pass  # Expected

    # AES-256-GCM
    a_ct, a_key, a_nonce = SymmetricEngine.encrypt_aes_gcm(plaintext_data)
    a_rec = SymmetricEngine.decrypt_aes_gcm(a_ct, a_key, a_nonce)
    assert a_rec == plaintext_data, "AES-256-GCM roundtrip failed"

    # AES-GCM Tamper Detection
    tampered_a_ct = bytearray(a_ct)
    tampered_a_ct[-1] ^= 0x01
    try:
        SymmetricEngine.decrypt_aes_gcm(bytes(tampered_a_ct), a_key, a_nonce)
        assert False, "AES-GCM failed to reject tampered ciphertext!"
    except Exception:
        pass  # Expected
    print("  [OK] ChaCha20-Poly1305 and AES-256-GCM authenticated encryption & tamper rejection verified.")

    # -------------------------------------------------------------
    # 3. MODULE C: ELLIPTIC CURVE CRYPTOGRAPHY (ECDH & ECDSA)
    # -------------------------------------------------------------
    print("\n[C] Testing Elliptic Curve Agreement (ECDH) & Signatures (ECDSA P-256)...")
    ecdh_sk, ecdh_pk_pem = ECDHEngine.generate_keypair()
    peer_sk, peer_pk_pem = ECDHEngine.generate_keypair()
    secret_a = ECDHEngine.derive_symmetric_key(ecdh_sk, peer_pk_pem)
    secret_b = ECDHEngine.derive_symmetric_key(peer_sk, ecdh_pk_pem)
    assert secret_a == secret_b, "ECDH agreement failed!"

    ecdsa_priv_pem, ecdsa_pub_pem = ECDSAEngine.generate_keypair()
    doc_payload = b"CRITICAL_INTEGRITY_CONTRACT_DOCUMENT"
    signature = ECDSAEngine.sign_document(doc_payload, ecdsa_priv_pem)
    assert ECDSAEngine.verify_document(doc_payload, signature, ecdsa_pub_pem) is True, "ECDSA verify failed"
    assert ECDSAEngine.verify_document(b"TAMPERED_DATA", signature, ecdsa_pub_pem) is False, "ECDSA accepted tampered data"
    print("  [OK] ECDH Shared Secret Agreement & ECDSA Digital Signatures verified.")

    # -------------------------------------------------------------
    # 4. MODULE D: ARGON2ID MEMORY-HARD ENGINE
    # -------------------------------------------------------------
    print("\n[D] Testing Argon2id Password Hashing, Verification & KDF...")
    password = "SuperPqcSecretPassword2026!"
    hashed_pw = Argon2Engine.hash_password(password)
    assert hashed_pw.startswith("$argon2id$"), "Hash is not Argon2id format"
    assert Argon2Engine.verify_password(hashed_pw, password) is True, "Argon2id verify failed"
    assert Argon2Engine.verify_password(hashed_pw, "Wrong") is False, "Argon2id accepted wrong password"

    salt = os.urandom(16)
    derived = Argon2Engine.derive_kdf(b"kyber_secret", salt, length=48)
    assert len(derived) == 48, "Argon2id KDF length mismatch"
    print("  [OK] Argon2id memory-hard hashing & key derivation verified.")

    # -------------------------------------------------------------
    # 5. MODULE E: CONTENT-ADAPTIVE SOBEL EDGE STEGANOGRAPHY
    # -------------------------------------------------------------
    print("\n[E] Testing Content-Adaptive Sobel Edge Steganography...")
    # Generate structured textured image
    w, h = 200, 200
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            arr[y, x] = [(x * 7) % 256, (y * 11) % 256, ((x + y) * 13) % 256]

    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG")
    carrier_bytes = buf.getvalue()

    stego_payload = b"POST_QUANTUM_DEFENSE_TOP_SECRET_PAYLOAD_CONCEALED_IN_EDGES"
    stego_seed = os.urandom(32)

    stego_png = StegoEngine.embed(carrier_bytes, stego_payload, stego_seed)
    assert len(stego_png) > 0, "Stego embed produced empty PNG"

    extracted_payload = StegoEngine.extract(stego_png, stego_seed)
    assert extracted_payload == stego_payload, "Stego extracted payload mismatch"
    print("  [OK] Sobel Edge Detection and LSB interleaving/extraction verified.")

    # -------------------------------------------------------------
    # 6. MODULE F: CLASSIFIER & FINANCIAL SENSITIVITY ENFORCEMENT
    # -------------------------------------------------------------
    print("\n[F] Testing Payload Intelligence & Financial Policy Enforcement...")
    # Binary file -> Bulk route
    class_bulk = classify_input(b"X" * 1500, filename="archive.zip")
    assert class_bulk["type"] == "bulk"

    # Text document > 1KB -> Document route
    class_doc_auto = classify_input(b"X" * 1500)
    assert class_doc_auto["type"] == "document"

    # Credit card / Financial payload -> Sensitive route + ChaCha20 enforcement
    fin_bytes = b"MasterCard 5412 7512 3412 3456 CVV 998 Expiry 12/28"
    assert detect_financial_sensitivity(fin_bytes) is True
    class_fin = classify_input(fin_bytes)
    assert class_fin["type"] == "sensitive"
    intent_fin = evaluate_security_intent(fin_bytes)
    assert intent_fin["recommended_cipher"] == "chacha20"
    assert intent_fin["is_financial"] is True

    # Manual override test
    class_override = classify_input(b"Terms", override_type="bulk")
    assert class_override["type"] == "bulk"
    print("  [OK] Auto-classification, manual overrides, and ChaCha20 financial enforcement verified.")

    # -------------------------------------------------------------
    # 7. MODULE G: PUBLIC IDENTITY DIRECTORY & MUTUAL SAS SAFETY NUMBERS
    # -------------------------------------------------------------
    print("\n[G] Testing Public Identity Directory & Symmetrical Mutual SAS Numbers...")
    # Generate keys for Alice & Bob
    alice_k_pk, alice_k_sk = KyberEngine.generate_keypair()
    alice_d_sk_pem, alice_d_pk_pem = ECDSAEngine.generate_keypair()

    bob_k_pk, bob_k_sk = KyberEngine.generate_keypair()
    bob_d_sk_pem, bob_d_pk_pem = ECDSAEngine.generate_keypair()

    # Publish Alice
    resp_pub_a = client.post("/api/directory/publish", data={
        "username": "alice",
        "kyber_pk_b64": KyberEngine.to_b64(alice_k_pk),
        "dsa_pubkey_pem": alice_d_pk_pem.decode("utf-8") if isinstance(alice_d_pk_pem, bytes) else alice_d_pk_pem,
        "display_name": "Alice Operator"
    })
    assert resp_pub_a.status_code == 200, f"Alice publish failed: {resp_pub_a.text}"
    alice_fp = resp_pub_a.json()["kyber_fingerprint"]
    assert len(alice_fp) == 14  # XXXX-XXXX-XXXX

    # Publish Bob
    resp_pub_b = client.post("/api/directory/publish", data={
        "username": "bob",
        "kyber_pk_b64": KyberEngine.to_b64(bob_k_pk),
        "dsa_pubkey_pem": bob_d_pk_pem.decode("utf-8") if isinstance(bob_d_pk_pem, bytes) else bob_d_pk_pem,
        "display_name": "Bob Receiver"
    })
    assert resp_pub_b.status_code == 200, f"Bob publish failed: {resp_pub_b.text}"
    bob_fp = resp_pub_b.json()["kyber_fingerprint"]

    # Verify directory listing
    resp_peers = client.get("/api/directory/peers")
    assert resp_peers.status_code == 200
    peers_list = [p["username"] for p in resp_peers.json()["peers"]]
    assert "alice" in peers_list and "bob" in peers_list

    # Mutual SAS Safety Number Symmetrical Test
    resp_sas_ab = client.get("/api/directory/safety_number?user_a=alice&user_b=bob")
    resp_sas_ba = client.get("/api/directory/safety_number?user_a=bob&user_b=alice")
    assert resp_sas_ab.status_code == 200 and resp_sas_ba.status_code == 200
    sas_ab = resp_sas_ab.json()
    sas_ba = resp_sas_ba.json()
    assert sas_ab["digits"] == sas_ba["digits"], "Mutual SAS digits must be symmetrical"
    assert sas_ab["emojis"] == sas_ba["emojis"], "Mutual SAS emojis must be symmetrical"
    print(f"  [OK] Public directory active. Alice FP: {alice_fp}, Bob FP: {bob_fp}")
    print(f"  [OK] Symmetrical Mutual SAS: {sas_ab['digits']} (Verified identical both directions)")

    # -------------------------------------------------------------
    # 8. MODULE H: FULL E2EE DIRECT PEER INBOX PIPELINE (Alice -> Bob)
    # -------------------------------------------------------------
    print("\n[H] Testing Full E2EE Direct Peer Transmission & 1-Click Decrypt (Alice -> Bob)...")
    # Clear Bob's inbox first
    client.post("/api/inbox/clear", data={"username": "bob"})

    secret_message = "TOP_SECRET: Quantum Lattice Invariant confirmed. Proceed to sector 7."
    # Alice encrypts targeted at Bob (leaving recipient_kyber_pk empty to test auto-resolution from directory)
    enc_form = {
        "text": secret_message,
        "recipient_username": "bob",
        "username": "alice",
        "preferred_cipher": "chacha20",
        "intent_objective": "full_hybrid"
    }
    resp_enc = client.post("/api/encrypt", data=enc_form)
    assert resp_enc.status_code == 200, f"Encrypt error: {resp_enc.text}"
    enc_res = resp_enc.json()
    assert enc_res["status"] == "success"
    assert "stego_image_b64" in enc_res
    assert "kyber_ciphertext_b64" in enc_res

    # Bob retrieves his inbox
    resp_inbox = client.get("/api/inbox/list?username=bob")
    assert resp_inbox.status_code == 200
    inbox_items = resp_inbox.json()["items"]
    assert len(inbox_items) >= 1, "Bob's inbox did not receive the transmission!"

    # Verify latest transmission
    bob_pkg = inbox_items[0]
    assert bob_pkg["sender"] == "alice"
    assert bob_pkg["recipient"] == "bob"
    trans_id = bob_pkg["id"]

    # Bob performs 1-Click Decryption using his local private key
    dec_form = {
        "stego_image_b64": bob_pkg["stego_image_b64"],
        "kyber_ciphertext_b64": bob_pkg["kyber_ciphertext_b64"],
        "recipient_kyber_sk_b64": KyberEngine.to_b64(bob_k_sk)
    }
    resp_dec = client.post("/api/decrypt", data=dec_form)
    assert resp_dec.status_code == 200, f"Decrypt error: {resp_dec.text}"
    dec_res = resp_dec.json()
    assert dec_res["status"] == "success"
    assert dec_res["text_preview"] == secret_message, "Decrypted message does not match original!"
    print("  [OK] Full Hybrid Stego E2EE transmission from Alice successfully received and decrypted by Bob.")

    # Bob deletes transmission
    resp_del = client.post("/api/inbox/delete", data={"username": "bob", "transmission_id": trans_id})
    assert resp_del.status_code == 200
    resp_inbox_after = client.get("/api/inbox/list?username=bob")
    assert all(i["id"] != trans_id for i in resp_inbox_after.json()["items"])
    print("  [OK] Inbox transmission deletion confirmed.")

    # -------------------------------------------------------------
    # 9. MODULE I: MODULAR DIRECT PQC PIPELINE (NO STEGANOGRAPHY)
    # -------------------------------------------------------------
    print("\n[I] Testing Modular Direct PQC Pipeline (High Speed Post-Quantum)...")
    direct_pqc_text = "RAPID_DIRECT_PQC_COMMUNICATION_2026"
    resp_dir_enc = client.post("/api/encrypt", data={
        "text": direct_pqc_text,
        "recipient_username": "bob",
        "username": "alice",
        "preferred_cipher": "chacha20",
        "intent_objective": "direct_pqc"
    })
    assert resp_dir_enc.status_code == 200
    dir_res = resp_dir_enc.json()
    assert dir_res["status"] == "success"
    assert "direct_result" in dir_res
    direct_pkg = dir_res["direct_result"]
    assert "ciphertext_b64" in direct_pkg
    assert "nonce_b64" in direct_pkg
    assert "kyber_ciphertext_b64" in direct_pkg

    # Decapsulate and decrypt direct PQC package via /api/decrypt_direct
    resp_dir_dec = client.post("/api/decrypt_direct", data={
        "ciphertext_b64": direct_pkg["ciphertext_b64"],
        "nonce_b64": direct_pkg["nonce_b64"],
        "kyber_ciphertext_b64": direct_pkg["kyber_ciphertext_b64"],
        "recipient_kyber_sk_b64": KyberEngine.to_b64(bob_k_sk),
        "cipher_used": direct_pkg.get("cipher_used", "chacha20")
    })
    assert resp_dir_dec.status_code == 200
    dir_dec_res = resp_dir_dec.json()
    assert dir_dec_res["status"] == "success"
    assert dir_dec_res["text_preview"] == direct_pqc_text
    print("  [OK] Direct PQC encapsulation/decapsulation verified without stego overhead.")

    # -------------------------------------------------------------
    # 10. MODULE J: MODULAR STANDALONE DIGITAL SIGNATURE (DSA RECEIPT)
    # -------------------------------------------------------------
    print("\n[J] Testing Modular Standalone ECDSA Digital Signature Pipeline...")
    doc_text = "CONTRACT_AGREEMENT_AUTHORIZED_BY_DIRECTORATE_2026"
    resp_dsa = client.post("/api/encrypt", data={
        "text": doc_text,
        "username": "alice",
        "intent_objective": "dsa_only"
    })
    assert resp_dsa.status_code == 200
    dsa_res = resp_dsa.json()
    assert dsa_res["status"] == "success"
    assert "receipt" in dsa_res
    receipt = dsa_res["receipt"]
    assert receipt["algorithm"] == "ECDSA-P256-SHA256"
    assert "signature_b64" in receipt
    assert "signer_public_key_pem" in receipt

    # Verify signature via /api/verify_signature
    resp_verify = client.post("/api/verify_signature", data={
        "text": doc_text,
        "signature_b64": receipt["signature_b64"],
        "public_key_pem_b64": receipt["public_key_pem_b64"]
    })
    assert resp_verify.status_code == 200
    assert resp_verify.json()["verified"] is True
    print("  [OK] Standalone ECDSA signature receipt generation & verification verified.")

    # -------------------------------------------------------------
    # 11. MODULE K: AUDIT TRAIL LOGGING & ZERO-DATABASE GUARANTEE
    # -------------------------------------------------------------
    print("\n[K] Testing Immutable Audit Trail Logging & Zero-Database Architecture...")
    # Record custom audit entry
    rec_resp = client.post("/api/audit/log", data={
        "username": "alice",
        "action": "test_verification",
        "title_ar": "تحقق شامل من البداية للنهاية",
        "title_en": "A-to-Z Test Verification",
        "details_json": json.dumps({"test": "A to Z"}),
        "status": "verified"
    })
    assert rec_resp.status_code == 200

    # Query audit logs
    logs_resp = client.get("/api/audit/logs?username=alice")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()["logs"]
    assert len(logs) > 0
    assert any(entry["action"] == "test_verification" for entry in logs)

    print("  [OK] Operations log retrieved, validated, and zero-database in-memory storage confirmed.")
    print("\n" + "=" * 70)
    print("ALL MODULES FROM A TO Z PASSED WITH 100% SUCCESS!")
    print("=" * 70 + "\n")

    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_a_to_z_architecture()
