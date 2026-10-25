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

# --- Zero-Database Public Key Directory & Direct Peer Inbox Infrastructure ---
public_directory_store: dict[str, dict] = {}
peer_inbox_store: dict[str, list[dict]] = {}
user_inbox_sockets: dict[str, list[WebSocket]] = {}

EMOJI_SAS_LIST = ["🛡️", "⚡", "🔒", "🗝️", "💎", "🌐", "🚀", "🪐", "🌟", "🔥", "🔮", "🎯", "⚓", "🛸", "🔑", "🏆"]

def compute_sas_safety_number(pk_a_b64: str, pk_b_b64: str) -> dict:
    import hashlib
    # Canonical sorting ensures Alice and Bob independently compute the exact same SAS
    sorted_pks = sorted([pk_a_b64 or "", pk_b_b64 or ""])
    combined = (sorted_pks[0] + ":" + sorted_pks[1]).encode('utf-8')
    h = hashlib.blake2b(combined, digest_size=16).digest()
    
    num = int.from_bytes(h[:4], byteorder='big') % 1000000
    digits_str = f"{num:06d}"
    formatted_digits = f"{digits_str[:3]}-{digits_str[3:]}"
    emojis = " ".join([EMOJI_SAS_LIST[b % len(EMOJI_SAS_LIST)] for b in h[4:8]])
    
    return {
        "digits": formatted_digits,
        "emojis": emojis,
        "raw_hex": h[:8].hex()
    }

async def dispatch_to_peer_inbox(recipient_username: str, transmission_item: dict):
    if not recipient_username:
        return
    if recipient_username not in peer_inbox_store:
        peer_inbox_store[recipient_username] = []
    peer_inbox_store[recipient_username].insert(0, transmission_item)
    if len(peer_inbox_store[recipient_username]) > 50:
        peer_inbox_store[recipient_username] = peer_inbox_store[recipient_username][:50]
        
    if recipient_username in user_inbox_sockets:
        dead_sockets = []
        for ws in user_inbox_sockets[recipient_username]:
            try:
                await ws.send_json({
                    "type": "new_transmission",
                    "transmission": transmission_item
                })
            except Exception:
                dead_sockets.append(ws)
        for dead in dead_sockets:
            if dead in user_inbox_sockets[recipient_username]:
                user_inbox_sockets[recipient_username].remove(dead)


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
    recipient_kyber_pk_b64: Optional[str] = Form(None),
    recipient_username: Optional[str] = Form(None),
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
      - Direct Peer Inbox Dispatch: When recipient_username is specified, automatically
        deposits the transmission in the recipient's secure inbox and sends a real-time push.
    """
    import uuid
    import datetime

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

    # Resolve Recipient ML-KEM-768 Public Key (Directly or from Public Directory)
    effective_pk_b64 = recipient_kyber_pk_b64
    if not effective_pk_b64 and recipient_username:
        peer = public_directory_store.get(recipient_username)
        if peer and peer.get("kyber_pk_b64"):
            effective_pk_b64 = peer["kyber_pk_b64"]
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Recipient @{recipient_username} has not published their public key to the directory yet."
            )

    if not effective_pk_b64:
        raise HTTPException(status_code=400, detail="Recipient Kyber-768 public key or valid directory peer username is required")

    try:
        recipient_pk = KyberEngine.from_b64(effective_pk_b64)
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
            details={
                "cipher": active_cipher,
                "payload_size": len(data_bytes),
                "filename": filename,
                "recipient": recipient_username or "External"
            }
        )

        # Auto-dispatch to recipient's direct inbox if specified
        tx_id = f"tx_{uuid.uuid4().hex[:8]}"
        if recipient_username:
            inbox_item = {
                "id": tx_id,
                "sender": username or "Anonymous",
                "recipient": recipient_username,
                "mode": "direct_pqc",
                "pipeline_target": "direct_pqc",
                "filename": filename,
                "payload_size": len(data_bytes),
                "direct_pqc_package": direct_res,
                "cipher_used": active_cipher,
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            await dispatch_to_peer_inbox(recipient_username, inbox_item)

        return {
            "status": "success",
            "pipeline_target": "direct_pqc",
            "mode": "direct_pqc",
            "tx_id": tx_id,
            "recipient_username": recipient_username,
            "dispatched_to_inbox": bool(recipient_username),
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
    tx_id = f"tx_{uuid.uuid4().hex[:8]}"

    # Auto-dispatch to recipient's direct inbox if specified
    if recipient_username:
        inbox_item = {
            "id": tx_id,
            "sender": username or "Anonymous",
            "recipient": recipient_username,
            "mode": "full_hybrid",
            "pipeline_target": "full_hybrid",
            "filename": filename,
            "payload_size": result["payload_size"],
            "stego_size": result["stego_size"],
            "stego_image_b64": stego_b64,
            "kyber_ciphertext_b64": result["kyber_ciphertext_b64"],
            "signature_b64": result["signature_b64"],
            "cipher_used": active_cipher,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        await dispatch_to_peer_inbox(recipient_username, inbox_item)

    response_payload = {
        "status": "success",
        "pipeline_target": "full_hybrid",
        "mode": "full_hybrid",
        "tx_id": tx_id,
        "recipient_username": recipient_username,
        "dispatched_to_inbox": bool(recipient_username),
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
        title_ar="تشفير هجين وإرسال للنظير",
        title_en="Hybrid Encryption & Peer Dispatch",
        details={
            "cipher": active_cipher,
            "payload_size": result["payload_size"],
            "stego_size": result["stego_size"],
            "filename": filename,
            "recipient": recipient_username or "Broadcast/Manual"
        }
    )

    # If legacy channel room provided, also broadcast
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


# --- Public Identity Directory & Direct Peer Inbox Endpoints ---

@app.post("/api/directory/publish")
async def publish_public_identity(
    username: str = Form(...),
    kyber_pk_b64: str = Form(...),
    dsa_pubkey_pem: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None)
):
    """
    Publish user's public identity card to the in-memory public directory.
    Zero-Database: No private keys ever leave the client.
    """
    import hashlib
    import datetime
    
    try:
        raw_pk = KyberEngine.from_b64(kyber_pk_b64)
        if len(raw_pk) != 1184:
            raise ValueError(f"Invalid ML-KEM-768 public key length: {len(raw_pk)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Kyber public key: {str(e)}")

    fingerprint = hashlib.sha256(kyber_pk_b64.encode('utf-8')).hexdigest()[:12].upper()
    
    entry = {
        "username": username,
        "display_name": display_name or username,
        "kyber_pk_b64": kyber_pk_b64,
        "dsa_pubkey_pem": dsa_pubkey_pem or "",
        "fingerprint": f"{fingerprint[:4]}-{fingerprint[4:8]}-{fingerprint[8:]}",
        "registered_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "is_online": True
    }
    public_directory_store[username] = entry
    
    add_audit_entry(
        username=username,
        action="keygen",
        title_ar="نشر الهوية العامة في دليل النظراء",
        title_en="Public Identity Published to Peer Directory",
        details={"fingerprint": entry["fingerprint"]}
    )
    return {
        "status": "success",
        "peer": entry,
        "fingerprint": entry["fingerprint"],
        "kyber_fingerprint": entry["fingerprint"]
    }


@app.get("/api/directory/peers")
async def list_directory_peers(current_user: Optional[str] = None):
    """
    List registered peers in public directory (excluding private keys).
    """
    peers = []
    for uname, data in public_directory_store.items():
        if current_user and uname == current_user:
            continue
        peers.append({
            "username": uname,
            "display_name": data.get("display_name", uname),
            "fingerprint": data.get("fingerprint", ""),
            "kyber_pk_b64": data.get("kyber_pk_b64", ""),
            "has_dsa": bool(data.get("dsa_pubkey_pem")),
            "registered_at": data.get("registered_at", ""),
            "online": data.get("is_online", True),
            "is_online": data.get("is_online", True)
        })
    return {"status": "success", "peers": peers, "total": len(peers)}


@app.get("/api/directory/peer/{username}")
async def get_directory_peer(username: str):
    """
    Get a peer's public identity card (Kyber public key + DSA public key).
    """
    if username not in public_directory_store:
        raise HTTPException(status_code=404, detail="Peer not found in directory")
    return {"status": "success", "peer": public_directory_store[username]}


@app.get("/api/directory/safety_number")
async def get_safety_number(user_a: str, user_b: str):
    """
    Compute Short Authentication String (SAS) Safety Number between two users.
    Derived deterministically from Hash(PK_A || PK_B).
    """
    peer_a = public_directory_store.get(user_a)
    peer_b = public_directory_store.get(user_b)
    if not peer_a or not peer_b:
        raise HTTPException(status_code=404, detail="One or both users not found in public directory")
    
    sas = compute_sas_safety_number(peer_a["kyber_pk_b64"], peer_b["kyber_pk_b64"])
    return {
        "status": "success",
        "user_a": user_a,
        "user_b": user_b,
        "safety_number": sas,
        "digits": sas["digits"],
        "emojis": sas["emojis"]
    }


# --- Direct Peer Inbox Endpoints ---

@app.get("/api/inbox/list")
async def get_user_inbox(username: str):
    """
    Retrieve incoming encrypted transmissions for logged-in user.
    """
    items = peer_inbox_store.get(username, [])
    return {
        "status": "success",
        "username": username,
        "items": items,
        "inbox": items,
        "total": len(items),
        "unread_count": len(items)
    }


@app.post("/api/inbox/clear")
async def clear_user_inbox(username: str = Form(...)):
    """
    Clear all items in user's direct inbox.
    """
    peer_inbox_store[username] = []
    return {"status": "success", "message": "Inbox cleared"}


@app.post("/api/inbox/delete")
async def delete_inbox_item(
    username: str = Form(...),
    item_id: Optional[str] = Form(None),
    transmission_id: Optional[str] = Form(None)
):
    """
    Delete a specific transmission from user's inbox.
    """
    target_id = item_id or transmission_id
    if username in peer_inbox_store and target_id:
        peer_inbox_store[username] = [it for it in peer_inbox_store[username] if it.get("id") != target_id]
    return {"status": "success", "message": "Item deleted"}


@app.websocket("/ws/inbox/{username}")
async def websocket_inbox_endpoint(websocket: WebSocket, username: str):
    """
    Real-time push notifications for user's direct encrypted inbox.
    """
    await websocket.accept()
    if username not in user_inbox_sockets:
        user_inbox_sockets[username] = []
    user_inbox_sockets[username].append(websocket)
    
    if username in public_directory_store:
        public_directory_store[username]["is_online"] = True
        
    try:
        items = peer_inbox_store.get(username, [])
        await websocket.send_json({
            "type": "inbox_sync",
            "unread_count": len(items),
            "inbox": items
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        if username in user_inbox_sockets and websocket in user_inbox_sockets[username]:
            user_inbox_sockets[username].remove(websocket)


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
