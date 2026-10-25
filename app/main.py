"""
Graduation Project: Multi-Level Hybrid Security System
FastAPI Application & Real-Time Communication Hub
"""

import os
import json
import base64
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.classifier import classify_input, evaluate_security_intent, detect_financial_sensitivity
from app.crypto_engine import Argon2Engine
from app.kyber_pqc import KyberEngine
from app.pipeline import SecurityPipeline
from app.stego_engine import StegoEngine

app = FastAPI(
    title="Hybrid Multi-Level Quantum-Resistant Security System",
    description="Post-Quantum Lattice KEM + Symmetric AEAD + Adaptive Edge Steganography",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for transmission channels (rooms)
class ChannelManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}
        self.channel_data: dict[str, dict] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast_transmission(self, room_id: str, payload: dict):
        self.channel_data[room_id] = payload
        if room_id in self.rooms:
            dead_connections = []
            for ws in self.rooms[room_id]:
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead_connections.append(ws)
            for dead in dead_connections:
                self.disconnect(room_id, dead)


channel_manager = ChannelManager()


# --- REST Cryptographic Endpoints ---

@app.post("/api/auth/hash-password")
async def auth_hash_password(password: str = Form(...)):
    """
    Hash a user password using memory-hard Argon2id (64MB memory, 3 iterations, 4 parallelism).
    Used by the zero-database authentication gateway for client-side storage.
    """
    try:
        argon2_hash = Argon2Engine.hash_password(password)
        return {"status": "success", "argon2_hash": argon2_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Argon2 hashing error: {str(e)}")


@app.post("/api/auth/verify-password")
async def auth_verify_password(password: str = Form(...), argon2_hash: str = Form(...)):
    """
    Verify password against an Argon2id hash in constant time without any database.
    """
    valid = Argon2Engine.verify_password(argon2_hash, password)
    return {"status": "success", "valid": valid}


@app.post("/api/security_intent")
async def assess_security_intent(
    text: Optional[str] = Form(None),
    filename: Optional[str] = Form(""),
    intent_objective: str = Form("full_hybrid"),
    sensitivity_level: str = Form("auto"),
    user_cipher: str = Form("auto"),
    file: Optional[UploadFile] = File(None)
):
    """
    Interactive Security Intent & Risk Evaluation:
      - Automatically detects financial/credential data.
      - Enforces ChaCha20-Poly1305 for financial secrets.
      - Decouples pipeline target based on user intent (DSA-only, Direct PQC, Full Hybrid).
    """
    if file:
        data_bytes = await file.read()
        fn = file.filename or filename or "uploaded_file"
    elif text:
        data_bytes = text.encode('utf-8')
        fn = filename or "message.txt"
    else:
        data_bytes = b""
        fn = filename or ""

    evaluation = evaluate_security_intent(
        data_bytes=data_bytes,
        filename=fn,
        intent_objective=intent_objective,
        sensitivity_level=sensitivity_level,
        user_cipher=user_cipher
    )
    return {"status": "success", "evaluation": evaluation}


@app.post("/api/keygen")
async def generate_kyber_keys():
    """
    Generate a new ML-KEM-768 (Kyber) key pair.
    Keys are returned to the user for 100% local, private storage.
    """
    pk, sk = KyberEngine.generate_keypair()
    return {
        "status": "success",
        "public_key_b64": KyberEngine.to_b64(pk),
        "secret_key_b64": KyberEngine.to_b64(sk),
        "public_key_length": len(pk),
        "secret_key_length": len(sk),
        "algorithm": "ML-KEM-768 (NIST FIPS 203)"
    }


@app.post("/api/sign_only")
async def standalone_sign(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    filename: Optional[str] = Form("document.txt"),
    username: Optional[str] = Form(None)
):
    """
    Modular Standalone Digital Signature Pipeline:
    Signs document using ECDSA P-256 for non-repudiation and returns a verifiable receipt.
    No steganography or symmetric encryption overhead.
    """
    if file:
        data_bytes = await file.read()
        fn = file.filename or filename or "document.bin"
    elif text:
        data_bytes = text.encode('utf-8')
        fn = filename or "document.txt"
    else:
        raise HTTPException(status_code=400, detail="No payload data provided")

    receipt = SecurityPipeline.process_dsa_only(data_bytes, fn)
    if username:
        receipt["signer"] = username
    add_audit_entry(
        username=username or "Guest",
        action="keygen",
        title_ar="توليد توقيع رقمي معتمد (ECDSA)",
        title_en="ECDSA Digital Signature Generated",
        details={"sha256": receipt["data_sha256"], "payload_size": receipt["payload_size"], "filename": fn}
    )
    return {
        "status": "success",
        "receipt": receipt,
        "dsa_signature_b64": receipt["signature_b64"],
        "data_sha256": receipt["data_sha256"],
        "public_key_pem": receipt["signer_public_key_pem"],
        "payload_size": receipt["payload_size"],
        "audit_receipt": receipt
    }


@app.post("/api/verify_signature")
async def standalone_verify_signature(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    signature_b64: str = Form(...),
    public_key_pem_b64: str = Form(...)
):
    """
    Verify standalone ECDSA digital signature against document bytes.
    """
    if file:
        data_bytes = await file.read()
    elif text:
        data_bytes = text.encode('utf-8')
    else:
        raise HTTPException(status_code=400, detail="No payload data provided")

    try:
        verified = SecurityPipeline.verify_dsa_only(data_bytes, signature_b64, public_key_pem_b64)
        return {"status": "success", "verified": verified}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")


@app.post("/api/classify")
async def classify_data(
    text: Optional[str] = Form(None),
    override_type: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Inspect and route input payload based on size, MIME type, and sensitivity.
    """
    filename = ""
    if file:
        data_bytes = await file.read()
        filename = file.filename
    elif text:
        data_bytes = text.encode('utf-8')
        filename = "input.txt"
    else:
        raise HTTPException(status_code=400, detail="Either file or text must be provided")

    result = classify_input(data_bytes, filename=filename, override_type=override_type or "")
    return result


@app.post("/api/encrypt")
async def encrypt_and_conceal(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    cover_image: Optional[UploadFile] = File(None),
    recipient_kyber_pk_b64: str = Form(...),
    preferred_cipher: str = Form("chacha20"),
    override_type: Optional[str] = Form(None),
    intent_objective: Optional[str] = Form("full_hybrid"),
    sensitivity_level: Optional[str] = Form("auto"),
    channel_room: Optional[str] = Form(None),
    username: Optional[str] = Form(None)
):
    """
    Modular Multi-Path Execution:
      - Evaluates Security Intent & Auto-Enforces ChaCha20 for Financial Data
      - Modular Routing:
          1. 'dsa_only': Generates standalone signature receipt (.sig.json)
          2. 'direct_pqc': Generates direct quantum-safe ciphertext without stego
          3. 'full_hybrid': Full Kyber-768 + AEAD + Adaptive Edge Steganography
    """
    filename = ""
    if file:
        data_bytes = await file.read()
        filename = file.filename
    elif text:
        data_bytes = text.encode('utf-8')
        filename = "secret_message.txt"
    else:
        raise HTTPException(status_code=400, detail="No payload data provided")

    # Evaluate Intent & Detect Financial Data
    intent_eval = evaluate_security_intent(
        data_bytes=data_bytes,
        filename=filename,
        intent_objective=intent_objective or "full_hybrid",
        sensitivity_level=sensitivity_level or "auto",
        user_cipher=preferred_cipher
    )
    active_cipher = intent_eval["active_cipher"]

    # Modular Route 1: Standalone DSA Signature
    if intent_eval["pipeline_target"] == "dsa_only":
        receipt = SecurityPipeline.process_dsa_only(data_bytes, filename)
        if username:
            receipt["signer"] = username
        add_audit_entry(
            username=username or "Guest",
            action="keygen",
            title_ar="توليد توقيع رقمي معتمد (ECDSA)",
            title_en="ECDSA Digital Signature Generated",
            details={"sha256": receipt["data_sha256"], "payload_size": receipt["payload_size"], "filename": filename}
        )
        return {
            "status": "success",
            "pipeline_target": "dsa_only",
            "mode": "dsa_only",
            "receipt": receipt,
            "dsa_signature_b64": receipt["signature_b64"],
            "data_sha256": receipt["data_sha256"],
            "public_key_pem": receipt["signer_public_key_pem"],
            "payload_size": receipt["payload_size"],
            "audit_receipt": receipt,
            "filename": filename
        }

    try:
        recipient_pk = KyberEngine.from_b64(recipient_kyber_pk_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Kyber public key format: {str(e)}")

    # Modular Route 2: Direct Quantum-Safe Ciphertext (No Stego)
    if intent_eval["pipeline_target"] == "direct_pqc":
        direct_res = SecurityPipeline.process_direct_pqc(
            data_bytes=data_bytes,
            filename=filename,
            recipient_kyber_pk=recipient_pk,
            preferred_cipher=active_cipher
        )
        add_audit_entry(
            username=username or "Guest",
            action="encrypt",
            title_ar="تشفير كمومي مباشر (Direct PQC)",
            title_en="Direct PQC Encryption",
            details={"cipher": active_cipher, "payload_size": len(data_bytes), "filename": filename}
        )
        return {
            "status": "success",
            "pipeline_target": "direct_pqc",
            "mode": "direct_pqc",
            "direct_result": direct_res,
            "direct_pqc_package": direct_res,
            "payload_size": len(data_bytes),
            "intent_evaluation": intent_eval,
            "filename": filename
        }

    # Modular Route 3: Full Multi-Level Hybrid Protection
    cover_bytes = None
    if cover_image:
        cover_bytes = await cover_image.read()

    try:
        result = SecurityPipeline.process_and_conceal(
            data_bytes=data_bytes,
            filename=filename,
            recipient_kyber_pk=recipient_pk,
            cover_image_bytes=cover_bytes,
            preferred_cipher=active_cipher,
            override_type=override_type or intent_eval["type"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encryption error: {str(e)}")

    stego_b64 = base64.b64encode(result["stego_image_bytes"]).decode('utf-8')

    response_payload = {
        "status": "success",
        "pipeline_target": "full_hybrid",
        "mode": "full_hybrid",
        "classification": result["classification"],
        "intent_evaluation": intent_eval,
        "kyber_ciphertext_b64": result["kyber_ciphertext_b64"],
        "stego_image_b64": stego_b64,
        "signature_b64": result["signature_b64"],
        "payload_size": result["payload_size"],
        "stego_size": result["stego_size"],
        "filename": filename
    }

    add_audit_entry(
        username=username or "Guest",
        action="encrypt",
        title_ar="تشفير هجين وإخفاء تكيفي",
        title_en="Hybrid Encryption & Adaptive Stego",
        details={
            "cipher": active_cipher,
            "payload_size": result["payload_size"],
            "stego_size": result["stego_size"],
            "filename": filename
        }
    )

    # If channel room provided, broadcast live to receiver
    if channel_room:
        await channel_manager.broadcast_transmission(channel_room, {
            "type": "new_transmission",
            "room_id": channel_room,
            "filename": filename,
            "kyber_ciphertext_b64": result["kyber_ciphertext_b64"],
            "stego_image_b64": stego_b64,
            "classification": result["classification"],
            "payload_size": result["payload_size"]
        })

    return response_payload


@app.post("/api/decrypt")
async def extract_and_decrypt(
    stego_image: Optional[UploadFile] = File(None),
    stego_image_b64: Optional[str] = Form(None),
    kyber_ciphertext_b64: str = Form(...),
    recipient_kyber_sk_b64: str = Form(...),
    username: Optional[str] = Form(None)
):
    """
    Full Receiver Execution:
      - Decapsulate Kyber-768 ciphertext with Secret Key
      - Derive Stego Seed and Payload Key via HKDF
      - Extract concealed data from Stego-Image
      - Decrypt payload and verify digital signatures
    """
    if stego_image:
        stego_bytes = await stego_image.read()
    elif stego_image_b64:
        stego_bytes = base64.b64decode(stego_image_b64)
    else:
        raise HTTPException(status_code=400, detail="No stego-image provided")

    try:
        kyber_ct = KyberEngine.from_b64(kyber_ciphertext_b64)
        recipient_sk = KyberEngine.from_b64(recipient_kyber_sk_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid key or ciphertext format: {str(e)}")

    try:
        decrypted = SecurityPipeline.extract_and_decrypt(
            stego_image_bytes=stego_bytes,
            kyber_ciphertext_bytes=kyber_ct,
            recipient_kyber_sk=recipient_sk
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption/Extraction failed: {str(e)}")

    data_b64 = base64.b64encode(decrypted["data_bytes"]).decode('utf-8')

    return {
        "status": "success",
        "metadata": decrypted["metadata"],
        "data_b64": data_b64,
        "text_preview": decrypted["text_preview"],
        "is_text": decrypted["is_text"],
        "filename": decrypted["filename"],
        "signature_verified": decrypted["signature_verified"],
        "cipher_used": decrypted["cipher_used"],
        "data_type": decrypted["data_type"]
    }


@app.post("/api/decrypt_direct")
async def decrypt_direct_pqc(
    ciphertext_b64: str = Form(...),
    nonce_b64: str = Form(...),
    kyber_ciphertext_b64: str = Form(...),
    recipient_kyber_sk_b64: str = Form(...),
    cipher_used: str = Form("chacha20"),
    username: Optional[str] = Form(None)
):
    """
    Decapsulate and decrypt direct PQC ciphertext without steganography.
    """
    try:
        dec = SecurityPipeline.decrypt_direct_pqc(
            ciphertext_b64=ciphertext_b64,
            nonce_b64=nonce_b64,
            kyber_ct_b64=kyber_ciphertext_b64,
            recipient_kyber_sk_b64=recipient_kyber_sk_b64,
            cipher_used=cipher_used
        )
        add_audit_entry(
            username=username or "Guest",
            action="decrypt",
            title_ar="فك تشفير كمومي مباشر (Direct PQC)",
            title_en="Direct PQC Decryption",
            details={
                "cipher": cipher_used,
                "size": dec["size"]
            }
        )
        return {
            "status": "success",
            "data_b64": base64.b64encode(dec["plaintext"]).decode('utf-8'),
            "text_preview": dec["text_preview"],
            "is_text": dec["is_text"],
            "size": dec["size"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Direct decryption failed: {str(e)}")

# --- In-Memory Zero-Database Audit Log Store ---
audit_logs_store: dict[str, list[dict]] = {}

def add_audit_entry(username: str, action: str, title_ar: str, title_en: str, details: dict, status: str = "success"):
    import datetime
    user = username or "Anonymous"
    if user not in audit_logs_store:
        audit_logs_store[user] = []
    entry = {
        "id": len(audit_logs_store[user]) + 1,
        "action": action,
        "title_ar": title_ar,
        "title_en": title_en,
        "details": details,
        "status": status,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    audit_logs_store[user].insert(0, entry)
    # Keep up to 100 entries per user in memory
    if len(audit_logs_store[user]) > 100:
        audit_logs_store[user] = audit_logs_store[user][:100]
    return entry

@app.get("/api/audit/logs")
async def get_audit_logs(username: str = "Guest"):
    logs = audit_logs_store.get(username, [])
    return {"status": "success", "username": username, "logs": logs}

@app.post("/api/audit/clear")
async def clear_audit_logs(username: str = Form("Guest")):
    if username in audit_logs_store:
        audit_logs_store[username] = []
    return {"status": "success", "message": "Audit logs cleared"}

@app.post("/api/audit/log")
async def record_audit_log(
    username: str = Form("Guest"),
    action: str = Form("system"),
    title_ar: str = Form("عملية نظام"),
    title_en: str = Form("System Action"),
    details_json: str = Form("{}"),
    status: str = Form("success")
):
    try:
        details = json.loads(details_json)
    except Exception:
        details = {"raw": details_json}
    entry = add_audit_entry(username, action, title_ar, title_en, details, status)
    return {"status": "success", "entry": entry}


# --- WebSocket Channel Room for Real-Time Sender/Receiver ---

@app.websocket("/ws/channel/{room_id}")
async def websocket_channel_endpoint(websocket: WebSocket, room_id: str):
    await channel_manager.connect(room_id, websocket)
    try:
        # Check if there is existing cached transmission for this room
        if room_id in channel_manager.channel_data:
            await websocket.send_json(channel_manager.channel_data[room_id])
            
        while True:
            data = await websocket.receive_text()
            # Heartbeat or client ping
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        channel_manager.disconnect(room_id, websocket)


# Serve Static UI files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Security System Initializing... Please refresh in a moment.</h1>"
