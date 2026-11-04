"""
Unified Hybrid Cryptographic & Steganographic Pipeline

Orchestrates:
1. Input Classification
2. Post-Quantum Key Encapsulation (ML-KEM-768 Kyber)
3. Cryptographic Execution (ChaCha20-Poly1305 / AES-256-GCM / ECDH / ECDSA)
4. Steganographic Embedding (LSB with Kyber-derived Seed)
5. Decryption & Verification (Reverse extraction)
"""

import json
import base64
import math
from app.classifier import classify_input
from app.crypto_engine import (
    SymmetricEngine,
    ECDHEngine,
    ECDSAEngine,
    derive_subkeys_from_kyber
)
from app.kyber_pqc import KyberEngine
from app.stego_engine import StegoEngine


class SecurityPipeline:
    @staticmethod
    def _ensure_cover_image(data_bytes: bytes, cover_image_bytes: bytes = None) -> bytes:
        if cover_image_bytes:
            return cover_image_bytes
        estimated_pkg = int(len(data_bytes) * 1.5) + 1400
        needed_pixels = ((estimated_pkg + 36) * 8 + 2) // 3
        side = max(800, int(math.ceil(math.sqrt(needed_pixels) * 1.15)))
        return StegoEngine.create_default_cover(width=side, height=side)

    @staticmethod
    def process_and_conceal(
        data_bytes: bytes,
        filename: str,
        recipient_kyber_pk: bytes,
        cover_image_bytes: bytes = None,
        preferred_cipher: str = "chacha20",
        override_type: str = "",
        operation_mode: str = "encryption"
    ) -> dict:
        """
        Complete Sender Workflow (supports both Standard Encryption & Isolated Digital Signature):
          - If operation_mode == "signature": routes to the isolated Digital Signature pipeline
            (SecurityPipeline.sign_and_conceal) with CRYSTALS-Kyber key encapsulation.
          - Otherwise ("encryption"):
            1. Classify data
            2. Kyber-768 encapsulate -> shared secret + kyber ciphertext
            3. Derive subkeys (payload_key, stego_seed, integrity_key) from shared secret
            4. Execute cryptographic operations based on type
            5. Embed into cover image using stego_seed
        """
        if (operation_mode or "").lower() == "signature":
            return SecurityPipeline.sign_and_conceal(
                data_bytes=data_bytes,
                filename=filename,
                recipient_kyber_pk=recipient_kyber_pk,
                cover_image_bytes=cover_image_bytes
            )

        cover_image_bytes = SecurityPipeline._ensure_cover_image(data_bytes, cover_image_bytes)

        # Step 1: Classification
        classification = classify_input(data_bytes, filename, override_type)
        data_type = classification["type"]

        # Step 2: Post-Quantum Encapsulation (Kyber-768)
        shared_secret, kyber_ct = KyberEngine.encapsulate(recipient_kyber_pk)
        subkeys = derive_subkeys_from_kyber(shared_secret)
        payload_key = subkeys["payload_key"]
        stego_seed = subkeys["stego_seed"]
        integrity_key = subkeys["integrity_key"]

        # Step 3: Cryptographic Routing
        sha256_digest = ECDSAEngine.compute_sha256_digest(data_bytes)
        metadata = {
            "type": data_type,
            "operation_mode": "encryption",
            "cipher": preferred_cipher,
            "filename": filename or "secret_payload",
            "sha256_digest": sha256_digest
        }
        
        signature_b64 = None
        signer_fingerprint = None
        ecdh_pub_pem_b64 = None

        if data_type == "bulk":
            # Direct high-speed AEAD
            if preferred_cipher == "aes_gcm":
                ciphertext, _, nonce = SymmetricEngine.encrypt_aes_gcm(data_bytes, payload_key)
            else:
                ciphertext, _, nonce = SymmetricEngine.encrypt_chacha20(data_bytes, payload_key)

        elif data_type == "sensitive":
            # Direct sensitive credential encryption with Kyber payload key
            if preferred_cipher == "aes_gcm":
                ciphertext, _, nonce = SymmetricEngine.encrypt_aes_gcm(data_bytes, payload_key)
            else:
                ciphertext, _, nonce = SymmetricEngine.encrypt_chacha20(data_bytes, payload_key)
                
            # Generate ephemeral ECDH audit token
            priv_ecdh, pub_ecdh_pem = ECDHEngine.generate_keypair()
            ecdh_pub_pem_b64 = base64.b64encode(pub_ecdh_pem).decode('utf-8')
            metadata["ecdh_pub"] = ecdh_pub_pem_b64

        elif data_type == "document":
            # Sign document with ECDSA P-256 and bind to Kyber integrity_key
            envelope = ECDSAEngine.create_kyber_bound_signature_envelope(
                document_bytes=data_bytes,
                integrity_key=integrity_key
            )
            signature_b64 = envelope["sig"]
            signer_fingerprint = envelope["signer_pub_fingerprint"]
            inner_packet = json.dumps(envelope).encode('utf-8')

            if preferred_cipher == "aes_gcm":
                ciphertext, _, nonce = SymmetricEngine.encrypt_aes_gcm(inner_packet, payload_key)
            else:
                ciphertext, _, nonce = SymmetricEngine.encrypt_chacha20(inner_packet, payload_key)
            
            metadata["has_signature"] = True
            metadata["signer_pub_fingerprint"] = signer_fingerprint

        # Assemble unified payload structure
        payload_package = {
            "meta": metadata,
            "nonce": base64.b64encode(nonce).decode('utf-8'),
            "ct": base64.b64encode(ciphertext).decode('utf-8')
        }
        package_bytes = json.dumps(payload_package).encode('utf-8')

        # Step 4: Steganographic Concealment
        stego_image_bytes = StegoEngine.embed(cover_image_bytes, package_bytes, stego_seed)

        return {
            "operation_mode": "encryption",
            "classification": classification,
            "stego_image_bytes": stego_image_bytes,
            "kyber_ciphertext_b64": KyberEngine.to_b64(kyber_ct),
            "signature_b64": signature_b64,
            "sha256_digest": sha256_digest,
            "signer_pub_fingerprint": signer_fingerprint,
            "ecdh_pub_b64": ecdh_pub_pem_b64,
            "payload_size": len(data_bytes),
            "stego_size": len(stego_image_bytes)
        }

    @staticmethod
    def extract_and_decrypt(
        stego_image_bytes: bytes,
        kyber_ciphertext_bytes: bytes,
        recipient_kyber_sk: bytes
    ) -> dict:
        """
        Complete Receiver Workflow (supports both Standard Encryption & Isolated Digital Signature):
          1. Decapsulate Kyber-768 ciphertext -> recover shared secret
          2. Derive payload_key, stego_seed, and integrity_key via HKDF
          3. Extract payload package from stego image using stego_seed
          4. Decrypt ciphertext and/or verify Kyber-bound ECDSA digital signatures
        """
        # Step 1: Kyber Decapsulation
        shared_secret = KyberEngine.decapsulate(recipient_kyber_sk, kyber_ciphertext_bytes)
        subkeys = derive_subkeys_from_kyber(shared_secret)
        payload_key = subkeys["payload_key"]
        stego_seed = subkeys["stego_seed"]
        integrity_key = subkeys["integrity_key"]

        # Step 2: Stego Extraction using the derived stego_seed
        extracted_package_bytes = StegoEngine.extract(stego_image_bytes, stego_seed)
        package = json.loads(extracted_package_bytes.decode('utf-8'))

        metadata = package.get("meta", {})
        data_type = metadata.get("type", package.get("type", "bulk"))
        operation_mode = metadata.get("operation_mode", package.get("operation_mode", "signature" if data_type == "signature" else "encryption"))
        cipher_used = metadata.get("cipher", "chacha20")

        signature_b64 = None
        signer_fingerprint = metadata.get("signer_pub_fingerprint")
        kyber_binding_verified = True

        # Step 3: Decrypt / Verify based on package structure and data_type
        if "ct" in package and "nonce" in package:
            nonce = base64.b64decode(package["nonce"])
            ciphertext = base64.b64decode(package["ct"])

            if data_type == "bulk":
                if cipher_used == "aes_gcm":
                    plaintext_bytes = SymmetricEngine.decrypt_aes_gcm(ciphertext, payload_key, nonce)
                else:
                    plaintext_bytes = SymmetricEngine.decrypt_chacha20(ciphertext, payload_key, nonce)
                sig_verified = None

            elif data_type == "sensitive":
                pub_ecdh_pem = base64.b64decode(metadata["ecdh_pub"])
                if cipher_used == "aes_gcm":
                    plaintext_bytes = SymmetricEngine.decrypt_aes_gcm(ciphertext, payload_key, nonce)
                else:
                    plaintext_bytes = SymmetricEngine.decrypt_chacha20(ciphertext, payload_key, nonce)
                sig_verified = None

            elif data_type in ("document", "signature"):
                if cipher_used == "aes_gcm":
                    decrypted_inner = SymmetricEngine.decrypt_aes_gcm(ciphertext, payload_key, nonce)
                else:
                    decrypted_inner = SymmetricEngine.decrypt_chacha20(ciphertext, payload_key, nonce)

                inner_data = json.loads(decrypted_inner.decode('utf-8'))
                if "body" in inner_data:
                    plaintext_bytes = base64.b64decode(inner_data["body"])
                elif "doc_b64" in inner_data:
                    plaintext_bytes = base64.b64decode(inner_data["doc_b64"])
                else:
                    plaintext_bytes = b""

                if "sig" in inner_data and ("kyber_binding_mac" in inner_data or "integrity_token" in inner_data):
                    sig_verified, kyber_binding_verified = ECDSAEngine.verify_kyber_bound_signature_envelope(
                        document_bytes=plaintext_bytes,
                        envelope=inner_data,
                        integrity_key=integrity_key
                    )
                    signature_b64 = inner_data.get("sig")
                    signer_fingerprint = inner_data.get("signer_pub_fingerprint", signer_fingerprint)
                elif "sig" in inner_data and "ecdsa_pub" in inner_data:
                    sig = base64.b64decode(inner_data["sig"])
                    ecdsa_pub_pem = base64.b64decode(inner_data["ecdsa_pub"])
                    sig_verified = ECDSAEngine.verify_document(plaintext_bytes, sig, ecdsa_pub_pem)
                    signature_b64 = inner_data.get("sig")
                    kyber_binding_verified = False
                else:
                    sig_verified = False
                    kyber_binding_verified = False
            else:
                raise ValueError(f"Unknown data type: {data_type}")

        elif "envelope" in package:
            envelope = package["envelope"]
            plaintext_bytes = base64.b64decode(envelope["body"])
            sig_verified, kyber_binding_verified = ECDSAEngine.verify_kyber_bound_signature_envelope(
                document_bytes=plaintext_bytes,
                envelope=envelope,
                integrity_key=integrity_key
            )
            signature_b64 = envelope.get("sig")
            signer_fingerprint = envelope.get("signer_pub_fingerprint")
        else:
            raise ValueError("Malformed stego package format")

        sha256_digest = ECDSAEngine.compute_sha256_digest(plaintext_bytes)

        # Attempt to decode as text for preview
        is_text = False
        text_preview = ""
        try:
            text_preview = plaintext_bytes.decode('utf-8')
            is_text = True
        except UnicodeDecodeError:
            text_preview = f"[Binary payload: {len(plaintext_bytes):,} bytes]"

        return {
            "operation_mode": operation_mode,
            "metadata": metadata,
            "data_bytes": plaintext_bytes,
            "text_preview": text_preview,
            "is_text": is_text,
            "filename": metadata.get("filename", package.get("filename", "recovered_data")),
            "signature_verified": sig_verified,
            "signature_b64": signature_b64,
            "sha256_digest": sha256_digest,
            "signer_pub_fingerprint": signer_fingerprint,
            "kyber_binding_verified": kyber_binding_verified,
            "cipher_used": cipher_used,
            "data_type": data_type
        }

    @staticmethod
    def process_dsa_only(data_bytes: bytes, filename: str = "document") -> dict:
        """
        Standalone Digital Signature Pipeline:
        Signs the payload with ECDSA P-256 for non-repudiation and generates a verifiable
        receipt (.sig.json) without steganography or symmetric encryption overhead.
        """
        import datetime
        import hashlib
        priv_pem, pub_pem = ECDSAEngine.generate_keypair()
        signature = ECDSAEngine.sign_document(data_bytes, priv_pem)
        
        sha256_hash = hashlib.sha256(data_bytes).hexdigest()
        sig_b64 = base64.b64encode(signature).decode('utf-8')
        pub_b64 = base64.b64encode(pub_pem).decode('utf-8')

        receipt = {
            "version": "1.0",
            "type": "dsa_only",
            "filename": filename or "document",
            "filesize": len(data_bytes),
            "payload_size": len(data_bytes),
            "sha256": sha256_hash,
            "data_sha256": sha256_hash,
            "signature_b64": sig_b64,
            "public_key_pem_b64": pub_b64,
            "public_key_pem": pub_pem.decode('utf-8'),
            "signer_public_key_pem": pub_pem.decode('utf-8'),
            "algorithm": "ECDSA-P256-SHA256",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        return receipt

    @staticmethod
    def verify_dsa_only(data_bytes: bytes, signature_b64: str, public_key_pem_b64: str) -> bool:
        """
        Verify standalone signature against data bytes and public key PEM.
        """
        sig = base64.b64decode(signature_b64)
        pub_pem = base64.b64decode(public_key_pem_b64)
        return ECDSAEngine.verify_document(data_bytes, sig, pub_pem)

    @staticmethod
    def process_direct_pqc(
        data_bytes: bytes,
        filename: str,
        recipient_kyber_pk: bytes,
        preferred_cipher: str = "chacha20"
    ) -> dict:
        """
        Direct Quantum-Safe Ciphertext Pipeline:
        Kyber-768 KEM encapsulation + AEAD symmetric cipher without steganography.
        """
        shared_secret, kyber_ct = KyberEngine.encapsulate(recipient_kyber_pk)
        subkeys = derive_subkeys_from_kyber(shared_secret)
        payload_key = subkeys["payload_key"]

        if preferred_cipher == "aes_gcm":
            ciphertext, _, nonce = SymmetricEngine.encrypt_aes_gcm(data_bytes, payload_key)
        else:
            ciphertext, _, nonce = SymmetricEngine.encrypt_chacha20(data_bytes, payload_key)

        return {
            "ciphertext_b64": base64.b64encode(ciphertext).decode('utf-8'),
            "nonce_b64": base64.b64encode(nonce).decode('utf-8'),
            "kyber_ciphertext_b64": KyberEngine.to_b64(kyber_ct),
            "cipher": preferred_cipher,
            "cipher_used": preferred_cipher,
            "filename": filename or "payload.enc",
            "filesize": len(data_bytes)
        }

    @staticmethod
    def decrypt_direct_pqc(
        ciphertext_b64: str,
        nonce_b64: str,
        kyber_ct_b64: str,
        recipient_kyber_sk_b64: str,
        cipher_used: str = "chacha20"
    ) -> dict:
        """
        Decapsulate and decrypt direct PQC ciphertext.
        """
        kyber_ct = KyberEngine.from_b64(kyber_ct_b64)
        recipient_sk = KyberEngine.from_b64(recipient_kyber_sk_b64)
        ciphertext = base64.b64decode(ciphertext_b64)
        nonce = base64.b64decode(nonce_b64)

        shared_secret = KyberEngine.decapsulate(recipient_sk, kyber_ct)
        subkeys = derive_subkeys_from_kyber(shared_secret)
        payload_key = subkeys["payload_key"]

        if cipher_used == "aes_gcm":
            plaintext = SymmetricEngine.decrypt_aes_gcm(ciphertext, payload_key, nonce)
        else:
            plaintext = SymmetricEngine.decrypt_chacha20(ciphertext, payload_key, nonce)

        is_text = False
        text_preview = ""
        try:
            text_preview = plaintext.decode('utf-8')
            is_text = True
        except UnicodeDecodeError:
            text_preview = f"[Binary payload: {len(plaintext):,} bytes]"

        return {
            "plaintext": plaintext,
            "text_preview": text_preview,
            "is_text": is_text,
            "size": len(plaintext)
        }

    @staticmethod
    def sign_and_conceal(
        data_bytes: bytes,
        filename: str,
        recipient_kyber_pk: bytes,
        cover_image_bytes: bytes = None
    ) -> dict:
        """
        Isolated Digital Signature Pipeline (with CRYSTALS-Kyber Key Encapsulation):
          1. Encapsulate a 32-byte post-quantum shared secret via CRYSTALS-Kyber (ML-KEM-768).
          2. Derive isolated subkeys (payload_key, stego_seed, integrity_key) via HKDF-SHA256.
          3. Sign payload with ECDSA P-256 (SHA-256) and cryptographically bind the
             verification public key and signature to Kyber's integrity_key (HMAC-SHA256).
          4. Encapsulate the signed envelope using the Kyber-derived key.
          5. Conceal inside the PNG carrier using the Kyber-derived stego_seed.
        """
        cover_image_bytes = SecurityPipeline._ensure_cover_image(data_bytes, cover_image_bytes)

        # Step 1: CRYSTALS-Kyber (ML-KEM-768) Post-Quantum Key Encapsulation
        shared_secret, kyber_ct = KyberEngine.encapsulate(recipient_kyber_pk)
        subkeys = derive_subkeys_from_kyber(shared_secret)
        payload_key = subkeys["payload_key"]
        stego_seed = subkeys["stego_seed"]
        integrity_key = subkeys["integrity_key"]

        # Step 2: Isolated Digital Signing & Kyber Key-Binding Envelope
        envelope = ECDSAEngine.create_kyber_bound_signature_envelope(
            document_bytes=data_bytes,
            integrity_key=integrity_key
        )
        signature_b64 = envelope["sig"]
        sha256_digest = envelope["sha256_digest"]
        signer_fingerprint = envelope["signer_pub_fingerprint"]

        inner_packet = json.dumps(envelope).encode("utf-8")

        # Step 3: Encapsulate the signed envelope with the Kyber-derived key
        ciphertext, _, nonce = SymmetricEngine.encrypt_chacha20(inner_packet, payload_key)

        metadata = {
            "type": "signature",
            "operation_mode": "signature",
            "cipher": "kyber_ecdsa_p256",
            "filename": filename or "signed_payload.txt",
            "has_signature": True,
            "sha256_digest": sha256_digest,
            "signer_pub_fingerprint": signer_fingerprint,
            "kyber_kem": "ML-KEM-768 (CRYSTALS-Kyber)"
        }

        payload_package = {
            "meta": metadata,
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "ct": base64.b64encode(ciphertext).decode("utf-8"),
            "envelope": envelope
        }
        package_bytes = json.dumps(payload_package).encode("utf-8")

        # Step 4: Steganographic Concealment using Kyber-derived stego_seed
        stego_image_bytes = StegoEngine.embed(cover_image_bytes, package_bytes, stego_seed)

        classification = {
            "type": "signature",
            "operation_mode": "signature",
            "size": len(data_bytes),
            "reason": "Isolated Digital Signature pipeline selected: ECDSA P-256 non-repudiation with CRYSTALS-Kyber (ML-KEM-768) key encapsulation.",
            "route": "Isolated Digital Signature (ECDSA P-256 + SHA-256) + CRYSTALS-Kyber (ML-KEM-768) Key Encapsulation"
        }

        return {
            "operation_mode": "signature",
            "classification": classification,
            "stego_image_bytes": stego_image_bytes,
            "kyber_ciphertext_b64": KyberEngine.to_b64(kyber_ct),
            "signature_b64": signature_b64,
            "sha256_digest": sha256_digest,
            "signer_pub_fingerprint": signer_fingerprint,
            "ecdh_pub_b64": None,
            "payload_size": len(data_bytes),
            "stego_size": len(stego_image_bytes)
        }

    @staticmethod
    def extract_and_verify(
        stego_image_bytes: bytes,
        kyber_ciphertext_bytes: bytes,
        recipient_kyber_sk: bytes
    ) -> dict:
        """
        Dedicated alias for extracting and verifying a Kyber-encapsulated Digital Signature package.
        """
        return SecurityPipeline.extract_and_decrypt(
            stego_image_bytes=stego_image_bytes,
            kyber_ciphertext_bytes=kyber_ciphertext_bytes,
            recipient_kyber_sk=recipient_kyber_sk
        )
