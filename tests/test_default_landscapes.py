"""
Tests for Tiered High-Texture Default Landscape Covers & Huge-Payload Guardrails.
"""
import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.stego_engine import StegoEngine


def test_default_landscape_tiers_exist_and_ordered():
    tiers = StegoEngine.get_default_cover_tiers()
    assert len(tiers) == 4
    capacities = [t["capacity_bytes"] for t in tiers]
    assert capacities == sorted(capacities)
    assert [t["id"] for t in tiers] == [
        "tier1_misty",
        "tier2_peak",
        "tier3_lake",
        "tier4_alpine_uhd",
    ]


def test_select_default_landscape_by_payload_tier():
    # Small payload -> Tier 1
    b1, m1 = StegoEngine.select_default_landscape_cover(50_000)
    assert m1["id"] == "tier1_misty"
    assert Image.open(io.BytesIO(b1)).size == (1200, 800)

    # Medium payload -> Tier 2
    b2, m2 = StegoEngine.select_default_landscape_cover(500_000)
    assert m2["id"] == "tier2_peak"
    assert Image.open(io.BytesIO(b2)).size == (2400, 1600)

    # Large payload -> Tier 3 (4K)
    b3, m3 = StegoEngine.select_default_landscape_cover(2_000_000)
    assert m3["id"] == "tier3_lake"
    assert Image.open(io.BytesIO(b3)).size == (3840, 2160)

    # Ultra payload -> Tier 4 (5K)
    b4, m4 = StegoEngine.select_default_landscape_cover(4_000_000)
    assert m4["id"] == "tier4_alpine_uhd"
    assert Image.open(io.BytesIO(b4)).size == (5120, 2880)


def test_huge_payload_rejects_oversized_stego_bubble():
    # Exceeding MAX_SAFE_STEGO_PIXELS refuses to synthesize a 100 MB image bubble
    with pytest.raises(ValueError) as excinfo:
        StegoEngine.select_default_landscape_cover(25_000_000)
    assert "Direct Quantum-Safe PQC" in str(excinfo.value)


def test_api_default_covers_and_tier_roundtrip():
    client = TestClient(app)
    resp = client.get("/api/stego/default-covers")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["status"] == "success"
    assert len(payload["tiers"]) == 4
    assert payload["max_safe_stego_bytes"] > 5_000_000

    # Keygen & Encrypt with default auto landscape selection
    keys = client.post("/api/keygen").json()
    enc = client.post(
        "/api/encrypt",
        data={
            "text": "Landscape carrier auto-tier validation test",
            "recipient_kyber_pk_b64": keys["public_key_b64"],
        },
    )
    assert enc.status_code == 200
    enc_json = enc.json()
    assert enc_json["cover_tier"]["id"] == "tier1_misty"

    # Decrypt back cleanly
    dec = client.post(
        "/api/decrypt",
        data={
            "stego_image_b64": enc_json["stego_image_b64"],
            "kyber_ciphertext_b64": enc_json["kyber_ciphertext_b64"],
            "recipient_kyber_sk_b64": keys["secret_key_b64"],
        },
    )
    assert dec.status_code == 200
    assert dec.json()["text_preview"] == "Landscape carrier auto-tier validation test"
