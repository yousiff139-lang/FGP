"""
Unit Tests for Intelligent Data Classifier Module.
"""
import pytest
from app.classifier import classify_input, BULK_THRESHOLD


def test_classifier_manual_overrides():
    data = b"Arbitrary test data"
    for override in ("bulk", "sensitive", "document"):
        res = classify_input(data, filename="test.txt", override_type=override)
        assert res["type"] == override
        assert "Manual user override" in res["reason"]
        assert res["size"] == len(data)


def test_classifier_binary_extension():
    data = b"\x00\x01\x02\x03"
    res = classify_input(data, filename="archive.zip")
    assert res["type"] == "bulk"
    assert ".zip" in res["reason"]


def test_classifier_small_sensitive_data():
    small_text = b"api_secret_key_998877665544"
    res = classify_input(small_text)
    assert res["type"] == "sensitive"
    assert res["size"] == len(small_text)
    assert res["size"] <= BULK_THRESHOLD


def test_classifier_large_document():
    large_text = ("This is a confidential legal contract text. " * 50).encode("utf-8")
    assert len(large_text) > BULK_THRESHOLD
    res = classify_input(large_text, filename="contract.pdf")
    assert res["type"] == "document"
    assert "Document file format" in res["reason"]


def test_classifier_large_binary_payload():
    large_binary = bytes([i % 256 for i in range(BULK_THRESHOLD + 200)])
    res = classify_input(large_binary)
    assert res["type"] == "bulk"
    assert "Binary payload" in res["reason"]
