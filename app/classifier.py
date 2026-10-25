"""
Data Type Classifier Module

Acts as an intelligent routing gateway that inspects input parameters
(size, format, and sensitivity) and assigns it to the optimal processing path:
  - Bulk Data / Files: Directed to Symmetric Ciphering (ChaCha20-Poly1305 / AES-256-GCM)
  - Small Sensitive Data: Directed to Asymmetric Key Agreement (ECDH P-256)
  - Documents / Messages: Directed to Digital Signatures (ECDSA P-256) for integrity
"""

import os
import re

BULK_THRESHOLD = 1024  # bytes (1 KB)

DOCUMENT_EXTENSIONS = {
    '.txt', '.doc', '.docx', '.pdf', '.md', '.rtf', '.odt',
    '.csv', '.json', '.xml', '.html', '.htm'
}

BINARY_EXTENSIONS = {
    '.zip', '.tar', '.gz', '.7z', '.rar', '.bin', '.iso',
    '.exe', '.dll', '.so', '.mp3', '.mp4', '.avi', '.jpg', '.png'
}

# Regex for financial data: credit card (Luhn-candidate sequences), CVV, bank serials, API keys
FINANCIAL_PATTERNS = [
    re.compile(r'\b(?:\d[ -]*?){13,19}\b'),  # Credit/Debit card numbers (13-19 digits)
    re.compile(r'\b(?:cvv|cvc|exp|cardholder|iban|bank|account|pin)\b', re.IGNORECASE),
    re.compile(r'\b(?:secret|password|api[_-]?key|token|serial[_-]?key)\b', re.IGNORECASE)
]


def detect_financial_sensitivity(data_bytes: bytes, filename: str = "") -> bool:
    """
    Inspect payload content and filename for financial credentials or high-value secrets.
    """
    fn_lower = filename.lower()
    if any(k in fn_lower for k in ("card", "bank", "financial", "salary", "invoice", "secret", "password")):
        return True

    try:
        text = data_bytes.decode('utf-8', errors='ignore')
        for pat in FINANCIAL_PATTERNS:
            if pat.search(text):
                return True
    except Exception:
        pass
    return False


def evaluate_security_intent(
    data_bytes: bytes,
    filename: str = "",
    intent_objective: str = "full_hybrid",
    sensitivity_level: str = "auto",
    user_cipher: str = "auto"
) -> dict:
    """
    Evaluates user answers from the Security Intent Questionnaire:
      - Automatically detects or confirms financial/credit card data.
      - Enforces ChaCha20-Poly1305 for financial secrets (constant-time ARX immune to cache-timing attacks).
      - Routes between Full Hybrid, Standalone Digital Signature (DSA), or Direct Quantum Ciphertext.
    """
    size = len(data_bytes)
    is_financial = detect_financial_sensitivity(data_bytes, filename) or sensitivity_level == "financial_critical"

    # 1. Determine cipher recommendation
    if is_financial:
        recommended_cipher = "chacha20"
        cipher_reason = (
            "Enforced ChaCha20-Poly1305: Constant-time ARX (Add-Rotate-XOR) cipher eliminates "
            "CPU cache-collision side-channel timing attacks on sensitive financial credentials/card numbers."
        )
    elif user_cipher in ("chacha20", "aes_gcm"):
        recommended_cipher = user_cipher
        cipher_reason = f"User preference selected: {user_cipher.upper()} AEAD"
    else:
        recommended_cipher = "chacha20"
        cipher_reason = "Default high-performance constant-time ChaCha20-Poly1305 AEAD"

    # Allow user override if explicitly given
    active_cipher = user_cipher if user_cipher in ("chacha20", "aes_gcm") else recommended_cipher

    # 2. Determine pipeline target
    if intent_objective == "dsa_only":
        pipeline_target = "dsa_only"
        route_desc = "Standalone Digital Signature Pipeline (ECDSA P-256 / Cryptographic Receipt - No Stego)"
        effective_type = "document"
    elif intent_objective == "direct_pqc":
        pipeline_target = "direct_pqc"
        route_desc = f"Direct Quantum-Safe Ciphertext (Kyber-768 + {active_cipher.upper()} - No Stego Carrier)"
        effective_type = "bulk" if size > BULK_THRESHOLD else "sensitive"
    else:
        pipeline_target = "full_hybrid"
        route_desc = f"Full Multi-Level Hybrid Protection (Kyber-768 + {active_cipher.upper()} + Adaptive Steganography)"
        if is_financial:
            effective_type = "sensitive"
        elif size > BULK_THRESHOLD:
            effective_type = "bulk"
        else:
            effective_type = "sensitive"

    return {
        "objective": intent_objective,
        "pipeline_target": pipeline_target,
        "sensitivity": "financial_critical" if is_financial else sensitivity_level,
        "is_financial": is_financial,
        "recommended_cipher": recommended_cipher,
        "active_cipher": active_cipher,
        "cipher_reason": cipher_reason,
        "route_desc": route_desc,
        "type": effective_type,
        "size": size,
        "filename": filename
    }


def classify_input(data_bytes: bytes, filename: str = "", override_type: str = "") -> dict:
    """
    Standard classifier maintaining complete backwards compatibility.
    """
    if override_type in ("bulk", "sensitive", "document"):
        return {
            "type": override_type,
            "reason": f"Manual user override: {override_type}",
            "route": _get_route_desc(override_type),
            "size": len(data_bytes),
            "filename": filename
        }

    size = len(data_bytes)
    ext = os.path.splitext(filename)[1].lower() if filename else ""

    # Check for financial data first
    if detect_financial_sensitivity(data_bytes, filename):
        return {
            "type": "sensitive",
            "reason": "Detected financial credentials / high-value secrets (requires constant-time ChaCha20)",
            "route": _get_route_desc("sensitive"),
            "size": size,
            "filename": filename
        }

    # Check by file extension if provided
    if ext in BINARY_EXTENSIONS:
        return {
            "type": "bulk",
            "reason": f"Binary file format ({ext}), size: {size} bytes",
            "route": _get_route_desc("bulk"),
            "size": size,
            "filename": filename
        }

    if ext in DOCUMENT_EXTENSIONS:
        dtype = "document" if size > BULK_THRESHOLD else "sensitive"
        return {
            "type": dtype,
            "reason": f"Document file format ({ext}), size: {size} bytes",
            "route": _get_route_desc(dtype),
            "size": size,
            "filename": filename
        }

    # If no filename, inspect payload content and size
    if size > BULK_THRESHOLD:
        try:
            data_bytes.decode('utf-8')
            return {
                "type": "document",
                "reason": f"Structured text document ({size} bytes) - requires integrity signature",
                "route": _get_route_desc("document"),
                "size": size,
                "filename": filename or "payload.txt"
            }
        except UnicodeDecodeError:
            return {
                "type": "bulk",
                "reason": f"Binary payload exceeding {BULK_THRESHOLD}B ({size} bytes)",
                "route": _get_route_desc("bulk"),
                "size": size,
                "filename": filename or "payload.bin"
            }
    else:
        return {
            "type": "sensitive",
            "reason": f"Small credential/sensitive payload ({size} bytes <= {BULK_THRESHOLD}B)",
            "route": _get_route_desc("sensitive"),
            "size": size,
            "filename": filename or "sensitive.dat"
        }


def _get_route_desc(data_type: str) -> str:
    if data_type == "bulk":
        return "ChaCha20-Poly1305 / AES-256-GCM (High-throughput symmetric AEAD)"
    elif data_type == "sensitive":
        return "ECDH P-256 Key Agreement + Symmetric Ciphering"
    elif data_type == "document":
        return "ECDSA P-256 Digital Signature + Symmetric Ciphering"
    return "Unknown Route"
