"""
Unit Tests for Spatial-Domain LSB Steganography Engine.
"""
import io
import pytest
from PIL import Image
from app.stego_engine import StegoEngine


def test_stego_capacity_calculation():
    # 100x100 RGB image: 10,000 pixels * 3 bits = 30,000 bits = 3,750 bytes
    # Capacity = 3,750 - 36 (header + sha256) = 3,714 bytes
    cap = StegoEngine.calculate_capacity(100, 100)
    assert cap == 3714

    # Tiny image with insufficient space for 36-byte framing returns 0
    tiny_cap = StegoEngine.calculate_capacity(5, 5)
    assert tiny_cap == 0


def test_stego_create_default_cover():
    cover_bytes = StegoEngine.create_default_cover(width=200, height=150)
    img = Image.open(io.BytesIO(cover_bytes))
    assert img.format == "PNG"
    assert img.size == (200, 150)


def test_stego_embed_and_extract_roundtrip():
    cover_bytes = StegoEngine.create_default_cover(width=100, height=100)
    payload = b"Top secret post-quantum payload concealed in pixel LSBs."
    stego_seed = b"random_stego_seed_32_bytes_test!"

    stego_bytes = StegoEngine.embed(cover_bytes, payload, stego_seed)
    assert len(stego_bytes) > 0

    extracted = StegoEngine.extract(stego_bytes, stego_seed)
    assert extracted == payload


def test_stego_wrong_seed_fails():
    cover_bytes = StegoEngine.create_default_cover(width=100, height=100)
    payload = b"Confidential transmission."
    correct_seed = b"seed_111111111111111111111111111"
    wrong_seed = b"seed_222222222222222222222222222"

    stego_bytes = StegoEngine.embed(cover_bytes, payload, correct_seed)

    with pytest.raises(ValueError):
        StegoEngine.extract(stego_bytes, wrong_seed)


def test_stego_capacity_overflow():
    # 20x20 image: 400 pixels * 3 = 1,200 bits = 150 bytes; capacity = 114 bytes
    cover_bytes = StegoEngine.create_default_cover(width=20, height=20)
    overflow_payload = b"A" * 500  # 500 bytes exceeds 114 bytes
    seed = b"32_bytes_seed_for_testing_overflow!"

    with pytest.raises(ValueError) as excinfo:
        StegoEngine.embed(cover_bytes, overflow_payload, seed)
    assert "Cover image is too small" in str(excinfo.value)
