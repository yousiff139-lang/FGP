"""
Tests for Web Security Hardening:
- HTTP security headers & no-store caching on /api/
- Strict CORS origin allowlist
- HMAC session token enforcement against username spoofing
- Bounded file upload limits & filename sanitization
"""
import io
from fastapi.testclient import TestClient

from app.main import app, sanitize_filename, registered_auth_sessions


def test_security_headers_and_api_no_store():
    client = TestClient(app)
    home = client.get("/")
    assert home.status_code == 200
    assert home.headers.get("x-content-type-options") == "nosniff"
    assert home.headers.get("x-frame-options") == "DENY"
    assert home.headers.get("referrer-policy") == "no-referrer"

    api_resp = client.get("/api/stego/default-covers")
    assert api_resp.status_code == 200
    assert api_resp.headers.get("cache-control") == "no-store"


def test_cors_blocks_untrusted_origin():
    client = TestClient(app)
    evil = client.options(
        "/api/keygen",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert evil.headers.get("access-control-allow-origin") != "https://evil.example"

    trusted = client.options(
        "/api/keygen",
        headers={
            "Origin": "http://127.0.0.1:8000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert trusted.headers.get("access-control-allow-origin") == "http://127.0.0.1:8000"


def test_session_token_blocks_spoofed_access_after_auth():
    client = TestClient(app)
    uname = "Hardened_Operator_SecTest"
    try:
        reg = client.post(
            "/api/auth/hash-password",
            data={"password": "Strong_Test_Password#26", "username": uname},
        )
        assert reg.status_code == 200
        reg_json = reg.json()
        assert reg_json.get("session_token")

        # Spoofed request without valid session token must be rejected
        spoof_logs = client.get(f"/api/audit/logs?username={uname}")
        assert spoof_logs.status_code == 401

        spoof_inbox = client.get(f"/api/inbox/list?username={uname}")
        assert spoof_inbox.status_code == 401

        # Authenticated request with issued X-Session-Token succeeds
        auth_logs = client.get(
            f"/api/audit/logs?username={uname}",
            headers={"X-Session-Token": reg_json["session_token"]},
        )
        assert auth_logs.status_code == 200

        # Also test login verify issues valid token
        ver = client.post(
            "/api/auth/verify-password",
            data={
                "password": "Strong_Test_Password#26",
                "argon2_hash": reg_json["argon2_hash"],
                "username": uname,
            },
        )
        assert ver.status_code == 200
        ver_json = ver.json()
        assert ver_json["valid"] is True
        assert ver_json.get("session_token")
    finally:
        registered_auth_sessions.discard(uname)


def test_filename_sanitization_and_oversized_b64_guard():
    cleaned_script = sanitize_filename("../../etc/<script>alert(1)</script>.txt")
    assert cleaned_script == "script_.txt"
    cleaned_tag = sanitize_filename("../../etc/evil<img src=x>.txt")
    assert cleaned_tag == "evil_img src=x_.txt"
    for candidate in (cleaned_script, cleaned_tag):
        assert "/" not in candidate
        assert "\\" not in candidate
        assert "<" not in candidate
        assert ">" not in candidate

    client = TestClient(app)
    oversized_b64 = "A" * (41 * 1024 * 1024)
    resp = client.post(
        "/api/decrypt",
        data={
            "stego_image_b64": oversized_b64,
            "kyber_ciphertext_b64": "AAAA",
            "recipient_kyber_sk_b64": "BBBB",
        },
    )
    assert resp.status_code == 413
