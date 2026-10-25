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

from app.classifier import classify_input
from app.kyber_pqc import KyberEngine
from app.pipeline import SecurityPipeline
from app.stego_engine import StegoEngine

app = FastAPI(
    title="Hybrid Multi-Level Quantum-Resistant Security System",
    description="Post-Quantum Lattice KEM + Symmetric AEAD + LSB Steganography",
    version="2.0.0"
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
    channel_room: Optional[str] = Form(None),
    username: Optional[str] = Form(None)
):
    """
    Full Sender Execution:
      - Classify input
      - Encapsulate with Kyber-768
      - Encrypt with ChaCha20/AES + ECDSA/ECDH
      - Embed into Cover Image using Kyber-derived Stego Seed
      - Optionally broadcast to a live Sender/Receiver Channel
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

    try:
        recipient_pk = KyberEngine.from_b64(recipient_kyber_pk_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Kyber public key format: {str(e)}")

    cover_bytes = None
    if cover_image:
        cover_bytes = await cover_image.read()

    try:
        result = SecurityPipeline.process_and_conceal(
            data_bytes=data_bytes,
            filename=filename,
            recipient_kyber_pk=recipient_pk,
            cover_image_bytes=cover_bytes,
            preferred_cipher=preferred_cipher,
            override_type=override_type or ""
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encryption error: {str(e)}")

    stego_b64 = base64.b64encode(result["stego_image_bytes"]).decode('utf-8')

    response_payload = {
        "status": "success",
        "classification": result["classification"],
        "kyber_ciphertext_b64": result["kyber_ciphertext_b64"],
        "stego_image_b64": stego_b64,
        "signature_b64": result["signature_b64"],
        "payload_size": result["payload_size"],
        "stego_size": result["stego_size"],
        "filename": filename
    }

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
