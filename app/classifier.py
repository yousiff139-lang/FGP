"""
Data Type Classifier Module

Acts as an intelligent routing gateway that inspects input parameters
(size, format, and sensitivity) and assigns it to the optimal processing path:
  - Bulk Data / Files: Directed to Symmetric Ciphering (ChaCha20-Poly1305 / AES-256-GCM)
  - Small Sensitive Data: Directed to Asymmetric Key Agreement (ECDH P-256)
  - Documents / Messages: Directed to Digital Signatures (ECDSA P-256) for integrity
"""

import os

BULK_THRESHOLD = 1024  # bytes (1 KB)

DOCUMENT_EXTENSIONS = {
    '.txt', '.doc', '.docx', '.pdf', '.md', '.rtf', '.odt',
    '.csv', '.json', '.xml', '.html', '.htm'
}

BINARY_EXTENSIONS = {
    '.zip', '.tar', '.gz', '.7z', '.rar', '.bin', '.iso',
    '.exe', '.dll', '.so', '.mp3', '.mp4', '.avi', '.jpg', '.png'
}


def classify_input(data_bytes: bytes, filename: str = "", override_type: str = "") -> dict:
    """
    Classify input data into: 'bulk', 'sensitive', or 'document'.
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
        # Check if text or binary
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
        # Small sensitive payload (passwords, tokens, keys, credentials)
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
