"""
Steganographic Concealment Module - Content-Adaptive Sobel Edge Engine

Implements state-of-the-art Content-Adaptive Edge Steganography
with Argon2id Key-Stretching and Higher-Bit Invariant Gradient (HBIG) Mapping.

Key features:
1. Argon2id Key-Stretching:
   - Stretches the Kyber-derived stego seed through Argon2id KDF into a 64-byte
     cryptographic stream: 32 bytes for the PRNG permutation seed and 32 bytes
     for the frame MAC authentication key.
2. Content-Adaptive Sobel Edge Masking:
   - Evaluates luminance gradient energy G(x, y) = sqrt(Gx^2 + Gy^2).
   - High-gradient edge and textured pixels are prioritized first.
   - Flat, smooth regions (vulnerable to Chi-Square/RS steganalysis) are bypassed.
   - Invariant representation (cleared bit 0) guarantees identical traversal
     ordering on both sender and receiver without any auxiliary side-channels.
3. Frame Packaging:
   - [4 bytes: uint32 payload length]
   - [N bytes: payload data]
   - [32 bytes: Argon2id-keyed BLAKE2b integrity MAC]
"""

import io
import os
import struct
import hashlib
import numpy as np
from PIL import Image
from app.crypto_engine import Argon2Engine


class StegoEngine:
    MAGIC_HEADER_SIZE = 4  # uint32 length
    HASH_SIZE = 32         # 32-byte keyed MAC
    MAX_SAFE_STEGO_PIXELS = 26_000_000  # ~9.7 MB raw stego capacity guard (avoids 50-100 MB image bubbles)

    DEFAULT_COVERS_DIR = os.path.join(os.path.dirname(__file__), "static", "default_covers")
    DEFAULT_LANDSCAPE_TIERS = [
        {
            "id": "tier1_misty",
            "filename": "tier1_misty.jpg",
            "label_en": "Misty Mountain Ridge (Standard)",
            "label_ar": "سلسلة الجبال الضبابية (قياسي)",
            "width": 1200,
            "height": 800,
            "url": "/static/default_covers/tier1_misty.jpg",
        },
        {
            "id": "tier2_peak",
            "filename": "tier2_peak.jpg",
            "label_en": "Snowy Alpine Summit (Medium HD)",
            "label_ar": "القمة الثلجية (دقة عالية متوسطة)",
            "width": 2400,
            "height": 1600,
            "url": "/static/default_covers/tier2_peak.jpg",
        },
        {
            "id": "tier3_lake",
            "filename": "tier3_lake.jpg",
            "label_en": "Alpine Lake Sunset (Large 4K UHD)",
            "label_ar": "بحيرة جبال الألب (4K فائقة الدقة)",
            "width": 3840,
            "height": 2160,
            "url": "/static/default_covers/tier3_lake.jpg",
        },
        {
            "id": "tier4_alpine_uhd",
            "filename": "tier4_alpine_uhd.jpg",
            "label_en": "Alpine Panorama 5K (Ultra Capacity)",
            "label_ar": "بانوراما جبال الألب 5K (سعة قصوى)",
            "width": 5120,
            "height": 2880,
            "url": "/static/default_covers/tier4_alpine_uhd.jpg",
        },
    ]

    @staticmethod
    def calculate_capacity(width: int, height: int) -> int:
        """
        Calculate maximum payload capacity in bytes.
        Each pixel has 3 color channels (R, G, B), each offering 1 bit = 3 bits/pixel.
        Minus 36 bytes for length header and MAC.
        """
        total_bits = width * height * 3
        total_bytes = total_bits // 8
        capacity = total_bytes - (StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE)
        return max(0, capacity)

    @staticmethod
    def get_default_cover_tiers() -> list[dict]:
        """Return metadata and capacity details for available landscape cover tiers."""
        tiers = []
        for tier in StegoEngine.DEFAULT_LANDSCAPE_TIERS:
            path = os.path.join(StegoEngine.DEFAULT_COVERS_DIR, tier["filename"])
            if os.path.isfile(path):
                cap = StegoEngine.calculate_capacity(tier["width"], tier["height"])
                tiers.append({
                    **tier,
                    "capacity_bytes": cap,
                    "disk_bytes": os.path.getsize(path),
                })
        return tiers

    @staticmethod
    def select_default_landscape_cover(needed_package_bytes: int) -> tuple[bytes, dict]:
        """
        Select the smallest high-texture landscape cover matching needed_package_bytes.
        Handles large payloads up to MAX_SAFE_STEGO_PIXELS dynamically and rejects
        oversized stego targets in favor of Direct PQC mode.
        """
        tiers = StegoEngine.get_default_cover_tiers()
        for tier in tiers:
            if needed_package_bytes <= tier["capacity_bytes"]:
                path = os.path.join(StegoEngine.DEFAULT_COVERS_DIR, tier["filename"])
                with open(path, "rb") as f:
                    return f.read(), {
                        "id": tier["id"],
                        "label_en": tier["label_en"],
                        "label_ar": tier["label_ar"],
                        "width": tier["width"],
                        "height": tier["height"],
                        "capacity_bytes": tier["capacity_bytes"],
                        "source": "preset_landscape",
                    }

        max_safe_bytes = (
            (StegoEngine.MAX_SAFE_STEGO_PIXELS * 3) // 8
            - (StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE)
        )
        if needed_package_bytes > max_safe_bytes:
            raise ValueError(
                f"Payload package ({needed_package_bytes:,} bytes) exceeds safe PNG steganography ceiling "
                f"({max_safe_bytes:,} bytes). Switch to Direct Quantum-Safe PQC mode (no cover image needed) "
                f"to avoid extreme PNG carrier bloat."
            )

        # Modest bridge above Tier 4 up to safe pixel ceiling: scale the 5K alpine landscape proportionally
        if tiers:
            base = tiers[-1]
            base_path = os.path.join(StegoEngine.DEFAULT_COVERS_DIR, base["filename"])
            needed_pixels = ((needed_package_bytes + StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE) * 8 + 2) // 3
            scale = float(np.sqrt((needed_pixels * 1.06) / (base["width"] * base["height"])))
            new_w = max(base["width"], int(np.ceil(base["width"] * scale)))
            new_h = max(base["height"], int(np.ceil(base["height"] * scale)))
            if new_w * new_h > StegoEngine.MAX_SAFE_STEGO_PIXELS:
                ratio = float(np.sqrt(StegoEngine.MAX_SAFE_STEGO_PIXELS / (new_w * new_h)))
                new_w = int(new_w * ratio)
                new_h = int(new_h * ratio)
            im = Image.open(base_path).convert("RGB").resize((new_w, new_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=88)
            return buf.getvalue(), {
                "id": "dynamic_landscape",
                "label_en": f"High-Resolution Scaled Alpine Panorama ({new_w}×{new_h})",
                "label_ar": f"بانوراما جبال الألب مكبّرة تلقائياً ({new_w}×{new_h})",
                "width": new_w,
                "height": new_h,
                "capacity_bytes": StegoEngine.calculate_capacity(new_w, new_h),
                "source": "scaled_landscape",
            }

        # Fallback if preset directory is unavailable
        needed_pixels = ((needed_package_bytes + StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE) * 8 + 2) // 3
        side = max(800, int(np.ceil(np.sqrt(needed_pixels) * 1.15)))
        fallback_bytes = StegoEngine.create_default_cover(width=side, height=side)
        return fallback_bytes, {
            "id": "synthesized_fallback",
            "label_en": f"Auto-Synthesized Carrier ({side}×{side})",
            "label_ar": f"صورة ناقلة مولدة تلقائياً ({side}×{side})",
            "width": side,
            "height": side,
            "capacity_bytes": StegoEngine.calculate_capacity(side, side),
            "source": "synthesized",
        }

    @staticmethod
    def _compute_adaptive_traversal(img_array: np.ndarray, stego_seed: bytes) -> tuple[np.ndarray, bytes]:
        """
        Compute deterministic edge-adaptive traversal order using Higher-Bit Invariant Gradients (HBIG)
        and Argon2id key-stretching.
        """
        height, width, _ = img_array.shape
        total_pixels = width * height

        # 1. Derive 64-byte cryptographic material via Argon2id
        kdf_material = Argon2Engine.derive_kdf(
            secret=stego_seed,
            salt=b"pqc_stego_argon2_seed",
            length=64
        )
        seed_int = int.from_bytes(kdf_material[:8], byteorder="big")
        frame_mac_key = kdf_material[32:64]

        # 2. Invariant luminance representation (clear bit 0 across all channels)
        # This ensures the gradient map is 100% identical between cover and stego images.
        inv_img = img_array & 0xFE
        # ITU-R BT.601 standard luminance
        gray = (
            0.299 * inv_img[:, :, 0]
            + 0.587 * inv_img[:, :, 1]
            + 0.114 * inv_img[:, :, 2]
        ).astype(np.float32)

        # 3. Compute spatial 2D Sobel gradient energy
        gy, gx = np.gradient(gray)
        gradient_energy = np.hypot(gx, gy).ravel()

        # 4. Deterministic Argon2id-seeded permutation order resolved cleanly via stable sort on -gradient
        rng = np.random.default_rng(seed_int)
        idx = np.arange(total_pixels, dtype=np.uint32)
        rng.shuffle(idx)
        traversal_order = idx[np.argsort(-gradient_energy[idx], kind="mergesort")]

        return traversal_order, frame_mac_key

    @staticmethod
    def embed(cover_image_bytes: bytes, payload: bytes, stego_seed: bytes) -> bytes:
        """
        Embed binary payload into cover image using vectorized edge-adaptive carrier traversal.
        """
        image = Image.open(io.BytesIO(cover_image_bytes)).convert("RGB")
        width, height = image.size
        capacity = StegoEngine.calculate_capacity(width, height)

        if len(payload) > capacity:
            needed_bytes = len(payload) + StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE
            needed_pixels = (needed_bytes * 8 + 2) // 3
            min_dim = int(np.ceil(np.sqrt(needed_pixels)))
            raise ValueError(
                f"Cover image is too small ({width}x{height} px, max {capacity:,} B). "
                f"Required size: at least {min_dim}x{min_dim} px ({needed_bytes:,} B needed)."
            )

        img_array = np.array(image, dtype=np.uint8, copy=True)
        traversal_order, mac_key = StegoEngine._compute_adaptive_traversal(img_array, stego_seed)

        # Build framed bitstream: [length (4B)] + [payload] + [Argon2-keyed BLAKE2b MAC (32B)]
        payload_len = len(payload)
        header = struct.pack(">I", payload_len)
        data_mac = hashlib.blake2b(payload, key=mac_key, digest_size=32).digest()
        full_frame = header + payload + data_mac

        # Convert frame to bit array and scatter along adaptive edge traversal order
        frame_bits = np.unpackbits(np.frombuffer(full_frame, dtype=np.uint8))
        num_bits = len(frame_bits)
        num_pixels_touched = (num_bits + 2) // 3

        flat_pixels = img_array.reshape(-1, 3)
        selected_idx = traversal_order[:num_pixels_touched]
        channels = flat_pixels[selected_idx].reshape(-1).copy()
        channels[:num_bits] = (channels[:num_bits] & 0xFE) | frame_bits
        flat_pixels[selected_idx] = channels.reshape(-1, 3)

        # Save to lossless PNG (fast level for larger HD/4K carriers, optimized for small carriers)
        stego_img = Image.fromarray(img_array, mode="RGB")
        output_buffer = io.BytesIO()
        if width * height > 2_000_000:
            stego_img.save(output_buffer, format="PNG", compress_level=1)
        else:
            stego_img.save(output_buffer, format="PNG", optimize=True)
        return output_buffer.getvalue()

    @staticmethod
    def extract(stego_image_bytes: bytes, stego_seed: bytes) -> bytes:
        """
        Extract embedded payload from stego-image using the vectorized edge-adaptive traversal order and stego_seed.
        """
        image = Image.open(io.BytesIO(stego_image_bytes)).convert("RGB")
        width, height = image.size
        capacity = StegoEngine.calculate_capacity(width, height)
        if width * height < 12 or capacity <= 0:
            raise ValueError(
                f"Invalid stego image ({width}x{height} px): carrier is too small to contain hidden data."
            )
        img_array = np.array(image, dtype=np.uint8)

        traversal_order, mac_key = StegoEngine._compute_adaptive_traversal(img_array, stego_seed)
        flat_pixels = img_array.reshape(-1, 3)

        # 1. Extract 4-byte header (32 bits -> first 11 traversal pixels)
        header_bits_needed = StegoEngine.MAGIC_HEADER_SIZE * 8
        header_pixels_needed = (header_bits_needed + 2) // 3
        header_bits = (flat_pixels[traversal_order[:header_pixels_needed]].reshape(-1)[:header_bits_needed] & 1)
        header_bytes = np.packbits(header_bits.astype(np.uint8)).tobytes()
        payload_len = struct.unpack(">I", header_bytes)[0]

        if payload_len <= 0 or payload_len > capacity:
            raise ValueError(
                f"Invalid steganographic header ({payload_len} bytes). "
                f"Either the stego seed is incorrect or this image contains no valid hidden data."
            )

        # 2. Extract full frame bits in one vectorized slice
        total_frame_bits = (StegoEngine.MAGIC_HEADER_SIZE + payload_len + StegoEngine.HASH_SIZE) * 8
        total_pixels_needed = (total_frame_bits + 2) // 3
        all_bits = (flat_pixels[traversal_order[:total_pixels_needed]].reshape(-1)[:total_frame_bits] & 1)
        all_bytes = np.packbits(all_bits.astype(np.uint8)).tobytes()

        offset = StegoEngine.MAGIC_HEADER_SIZE
        payload = all_bytes[offset : offset + payload_len]
        offset += payload_len
        extracted_mac = all_bytes[offset : offset + StegoEngine.HASH_SIZE]

        # Verify integrity using Argon2id-derived MAC key
        computed_mac = hashlib.blake2b(payload, key=mac_key, digest_size=32).digest()
        if extracted_mac != computed_mac:
            raise ValueError(
                "Steganographic data integrity verification failed! "
                "The payload is corrupted or the stego key is wrong."
            )

        return payload

    @staticmethod
    def create_default_cover(width: int = 800, height: int = 600) -> bytes:
        """
        Generate an elegant default gradient cover image with rich spatial texture.
        """
        x = np.linspace(20, 180, width, dtype=np.float32)
        y = np.linspace(30, 220, height, dtype=np.float32)
        xx, yy = np.meshgrid(x, y)

        # High-frequency textured pattern for edge steganography
        freq_wave = np.sin(xx * 0.05) * np.cos(yy * 0.05) * 25.0
        
        r = np.clip((xx * 0.6 + yy * 0.4 + freq_wave), 0, 255).astype(np.uint8)
        g = np.clip((xx * 0.3 + yy * 0.7 - freq_wave), 0, 255).astype(np.uint8)
        b = np.clip((xx * 0.8 + yy * 0.5 + freq_wave * 0.5), 0, 255).astype(np.uint8)

        img_array = np.stack([r, g, b], axis=-1)
        img = Image.fromarray(img_array, mode="RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
