"""
API End-to-End Tests for FastAPI Application.
"""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.kyber_pqc import KyberEngine


@pytest.fixture
def client():
    return TestClient(app)


def test_api_home_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Post-Quantum" in response.text


def test_api_keygen(client):
    response = client.post("/api/keygen")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "public_key_b64" in data
    assert "secret_key_b64" in data
    assert data["public_key_length"] == 1184
    assert data["secret_key_length"] == 2400


def test_api_classify_text(client):
    response = client.post("/api/classify", data={"text": "Sensitive api token credential"})
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "sensitive"


def test_api_classify_file(client):
    file_bytes = b"Hello, this is a plain text document."
    response = client.post(
        "/api/classify",
        files={"file": ("notes.txt", io.BytesIO(file_bytes), "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "notes.txt"


def test_api_encrypt_and_decrypt_roundtrip(client):
    # 1. Keygen
    keygen_resp = client.post("/api/keygen")
    assert keygen_resp.status_code == 200
    keys = keygen_resp.json()
    pk_b64 = keys["public_key_b64"]
    sk_b64 = keys["secret_key_b64"]

    # 2. Encrypt
    test_msg = "Super secret research data for graduation defense 2026."
    enc_resp = client.post(
        "/api/encrypt",
        data={
            "text": test_msg,
            "recipient_kyber_pk_b64": pk_b64,
            "preferred_cipher": "chacha20"
        }
    )
    assert enc_resp.status_code == 200
    enc_data = enc_resp.json()
    assert "stego_image_b64" in enc_data
    assert "kyber_ciphertext_b64" in enc_data

    # 3. Decrypt
    dec_resp = client.post(
        "/api/decrypt",
        data={
            "stego_image_b64": enc_data["stego_image_b64"],
            "kyber_ciphertext_b64": enc_data["kyber_ciphertext_b64"],
            "recipient_kyber_sk_b64": sk_b64
        }
    )
    assert dec_resp.status_code == 200
    dec_data = dec_resp.json()
    assert dec_data["status"] == "success"
    assert dec_data["is_text"] is True
    assert dec_data["text_preview"] == test_msg


def test_api_encrypt_missing_key(client):
    response = client.post("/api/encrypt", data={"text": "Test"})
    assert response.status_code in (400, 422)
