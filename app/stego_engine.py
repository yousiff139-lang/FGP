"""
Steganographic Concealment Module

Implements Spatial-Domain LSB (Least Significant Bit) steganography
with Seeded Pseudo-Random Pixel Permutation.

Key features:
1. Stego Key / Seed Integration:
   - The pixel traversal order is determined by a 32-byte seed directly derived
     from the Post-Quantum Kyber shared secret.
   - Without the seed, an adversary cannot reconstruct the bitstream sequence.
2. Lossless Carrier:
   - Operates on 24-bit RGB pixel matrices (PNG format).
3. Frame Packaging:
   - [4 bytes: uint32 payload length]
   - [N bytes: payload data]
   - [32 bytes: SHA-256 integrity hash]
"""

import io
import struct
import hashlib
import numpy as np
from PIL import Image


class StegoEngine:
    MAGIC_HEADER_SIZE = 4  # uint32 length
    HASH_SIZE = 32         # SHA-256

    @staticmethod
    def calculate_capacity(width: int, height: int) -> int:
        """
        Calculate maximum payload capacity in bytes.
        Each pixel has 3 color channels (R, G, B), each offering 1 LSB = 3 bits/pixel.
        Minus 36 bytes for length header and SHA-256 hash.
        """
        total_bits = width * height * 3
        total_bytes = total_bits // 8
        capacity = total_bytes - (StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE)
        return max(0, capacity)

    @staticmethod
    def embed(cover_image_bytes: bytes, payload: bytes, stego_seed: bytes) -> bytes:
        """
        Embed binary payload into cover image using seeded LSB substitution.
        Returns:
            PNG image bytes of the stego-image.
        """
        # Load cover image
        image = Image.open(io.BytesIO(cover_image_bytes)).convert("RGB")
        width, height = image.size
        capacity = StegoEngine.calculate_capacity(width, height)

        if len(payload) > capacity:
            needed_bytes = len(payload) + StegoEngine.MAGIC_HEADER_SIZE + StegoEngine.HASH_SIZE
            needed_pixels = (needed_bytes * 8 + 2) // 3
            min_dim = int(np.ceil(np.sqrt(needed_pixels)))
            raise ValueError(
                f"Cover image is too small. Required size: at least {min_dim}x{min_dim} px."
            )

        # Build framed bitstream: [length (4B)] + [payload] + [sha256 (32B)]
        payload_len = len(payload)
        header = struct.pack(">I", payload_len)
        data_hash = hashlib.sha256(payload).digest()
        full_frame = header + payload + data_hash

        # Convert frame to bit array
        frame_bits = np.unpackbits(np.frombuffer(full_frame, dtype=np.uint8))
        num_bits = len(frame_bits)

        # Pixel array
        img_array = np.array(image, dtype=np.uint8)

        # Generate deterministic pseudo-random pixel permutation based on stego_seed
        # Use 64-bit integer seed derived from stego_seed
        seed_int = int.from_bytes(stego_seed[:8], byteorder="big")
        rng = np.random.default_rng(seed_int)

        total_pixels = width * height
        pixel_indices = rng.permutation(total_pixels)

        # Embed bits across RGB channels
        bit_idx = 0
        for p_idx in pixel_indices:
            y = p_idx // width
            x = p_idx % width

            for channel in range(3):  # R, G, B
                if bit_idx >= num_bits:
                    break
                # Replace LSB: clear last bit (0xFE) and bitwise-OR our bit
                img_array[y, x, channel] = (img_array[y, x, channel] & 0xFE) | int(frame_bits[bit_idx])
                bit_idx += 1

            if bit_idx >= num_bits:
                break

        # Save to PNG (lossless)
        stego_img = Image.fromarray(img_array, mode="RGB")
        output_buffer = io.BytesIO()
        stego_img.save(output_buffer, format="PNG", optimize=True)
        return output_buffer.getvalue()

    @staticmethod
    def extract(stego_image_bytes: bytes, stego_seed: bytes) -> bytes:
        """
        Extract embedded payload from stego-image using the corresponding stego_seed.
        Returns:
            Extracted payload bytes.
        """
        image = Image.open(io.BytesIO(stego_image_bytes)).convert("RGB")
        width, height = image.size
        img_array = np.array(image, dtype=np.uint8)

        total_pixels = width * height
        seed_int = int.from_bytes(stego_seed[:8], byteorder="big")
        rng = np.random.default_rng(seed_int)
        pixel_indices = rng.permutation(total_pixels)

        # 1. First extract the 4-byte header (32 bits) to read payload length
        header_bits_needed = StegoEngine.MAGIC_HEADER_SIZE * 8
        extracted_bits = []
        
        pixel_iter = iter(pixel_indices)
        current_pixel = next(pixel_iter)
        current_y = current_pixel // width
        current_x = current_pixel % width
        channel_idx = 0

        while len(extracted_bits) < header_bits_needed:
            bit = img_array[current_y, current_x, channel_idx] & 1
            extracted_bits.append(bit)
            channel_idx += 1
            if channel_idx == 3:
                channel_idx = 0
                current_pixel = next(pixel_iter)
                current_y = current_pixel // width
                current_x = current_pixel % width

        header_bytes = np.packbits(np.array(extracted_bits[:header_bits_needed], dtype=np.uint8)).tobytes()
        payload_len = struct.unpack(">I", header_bytes)[0]

        capacity = StegoEngine.calculate_capacity(width, height)
        if payload_len <= 0 or payload_len > capacity:
            raise ValueError(
                f"Invalid steganographic header ({payload_len} bytes). "
                f"Either the stego seed is incorrect or this image contains no valid hidden data."
            )

        # 2. Extract payload + 32-byte hash
        total_frame_bits = (StegoEngine.MAGIC_HEADER_SIZE + payload_len + StegoEngine.HASH_SIZE) * 8
        
        while len(extracted_bits) < total_frame_bits:
            bit = img_array[current_y, current_x, channel_idx] & 1
            extracted_bits.append(bit)
            channel_idx += 1
            if channel_idx == 3:
                channel_idx = 0
                try:
                    current_pixel = next(pixel_iter)
                    current_y = current_pixel // width
                    current_x = current_pixel % width
                except StopIteration:
                    break

        all_bytes = np.packbits(np.array(extracted_bits[:total_frame_bits], dtype=np.uint8)).tobytes()
        
        offset = StegoEngine.MAGIC_HEADER_SIZE
        payload = all_bytes[offset : offset + payload_len]
        offset += payload_len
        extracted_hash = all_bytes[offset : offset + StegoEngine.HASH_SIZE]

        # Verify integrity
        computed_hash = hashlib.sha256(payload).digest()
        if extracted_hash != computed_hash:
            raise ValueError(
                "Steganographic data integrity verification failed! "
                "The payload is corrupted or the stego key is wrong."
            )

        return payload

    @staticmethod
    def create_default_cover(width: int = 800, height: int = 600) -> bytes:
        """
        Generate an elegant default gradient cover image if user doesn't have one handy.
        """
        # Create subtle cybernetic gradient image
        x = np.linspace(20, 60, width, dtype=np.uint8)
        y = np.linspace(30, 80, height, dtype=np.uint8)
        xx, yy = np.meshgrid(x, y)
        
        r = (xx * 0.7 + yy * 0.3).astype(np.uint8)
        g = (xx * 0.4 + yy * 0.8).astype(np.uint8)
        b = (xx * 0.9 + yy * 0.6).astype(np.uint8)
        
        img_array = np.stack([r, g, b], axis=-1)
        img = Image.fromarray(img_array, mode="RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
