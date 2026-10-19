# 🛡️ Hybrid Multi-Level Post-Quantum Security System

> **Graduation Project:** Enhance data protection using a multi-level hybrid security system integrating data-type-aware cryptographic routing, post-quantum key encapsulation (NIST FIPS 203 ML-KEM-768 / CRYSTALS-Kyber), and spatial-domain steganography.

---

## 📑 System Architecture Overview

```
[Plaintext / File Input]
          │
          ▼
┌────────────────────────────────────────┐
│  Layer 1: Intelligent Data Classifier  │
└────────────────────────────────────────┘
     │                    │                    │
     ▼ (Bulk Data)        ▼ (Sensitive Data)   ▼ (Documents / Text)
┌──────────────────┐ ┌──────────────────┐ ┌───────────────────────────┐
│ ChaCha20 / AES   │ │ ECDH P-256       │ │ ECDSA P-256 Signature     │
│ Symmetric AEAD   │ │ Key Agreement    │ │ Document Non-Repudiation  │
└──────────────────┘ └──────────────────┘ └───────────────────────────┘
     │                    │                    │
     └────────────────────┼────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────┐
│ Layer 2: Post-Quantum Key Consolidation & Encapsulation│
│         (NIST FIPS 203 ML-KEM-768 / Kyber)             │
│   • Generates 1,088-byte Quantum-Resistant Ciphertext  │
│   • Derives Payload Key & Stego Seed via HKDF          │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ Layer 3: Steganographic Spatial-Domain Concealment     │
│   • Seeded Pseudo-Random Pixel Permutation             │
│   • Least Significant Bit (LSB) RGB Modification       │
│   • Visual Zero-Alteration (Lossless PNG Carrier)      │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
                  [ 🖼️ Stego-Image PNG ]
             [ 🔑 1,088B Kyber Token ]
```

---

## 🔬 Cryptographic Decisions & Justification

### 1. Symmetric Cipher: **ChaCha20-Poly1305** (over AES-GCM)
* **Constant-Time Execution (ARX):** ChaCha20 uses simple Add-Rotate-Xor operations that are strictly constant-time on every CPU, completely preventing **cache-timing side-channel attacks** that plague table-based software implementations of AES.
* **Poly1305 Authentication:** Provides provable one-time authenticator security without the fragile algebraic field inversion risks of GCM.
* *(Note: An AES-256-GCM toggle is also built into the system for comparative demonstration).*

### 2. Asymmetric Key Agreement: **ECC / ECDH P-256** (over RSA)
* **Key Size Efficiency:** ECDH P-256 achieves 128-bit security with a compact **64-byte key**, compared to a cumbersome **384-byte key** for RSA-3072.
* **Performance:** Handshake speed and signature generation are 10× to 25× faster than RSA with drastically lower memory footprint.

### 3. Digital Signatures: **ECDSA P-256** (over Raw ElGamal)
* **Subgroup Efficiency:** Raw ElGamal signatures produce huge outputs modulo $p$. ECDSA operates within a prime-order elliptic curve subgroup, yielding compact 64-byte signatures that verify quickly and natively.

### 4. Post-Quantum Layer: **NIST FIPS 203 ML-KEM-768 (Kyber)**
* **Quantum Resistance:** Protects against Shor's algorithm (which breaks RSA and ECC).
* **Key Sizes:** 1,184-byte Public Key, 2,400-byte Secret Key, 1,088-byte Ciphertext, 32-byte Shared Secret.

### 5. Steganography: **Kyber-Seeded Spatial LSB**
* The 32-byte Kyber shared secret seeds a pseudo-random permutation generator. An adversary cannot determine which pixels contain hidden bits without first decapsulating the Kyber ciphertext!

---

## 🚀 Running the Web Application

### Prerequisites
Make sure Python 3.10+ is installed on your machine.

### Installation
```bash
# Clone the repository
git clone https://github.com/yousiff139-lang/FGP.git
cd FGP

# Install required packages (if not already installed)
pip install -r requirements.txt
```

### Launch the Application
```bash
python run.py
```
Open your browser and navigate to:
👉 **`http://localhost:8000`**

### Run Test Suite
```bash
python -m pytest tests/ -v
```

---

## 🖥️ Web Interface Features

1. **Header:**
   - **System Status:** Real-time channel connectivity indicator.
   - **Key Vault Modal:** Generate, view, and export local Kyber-768 Public (`.key`) and Secret (`.key`) files 100% locally.
   - **Navigation Tabs:** Seamlessly switch between the 3 main sections and the Live Channel.

2. **Section 1: System Architecture (`ℹ️ System Architecture`)**
   - Interactive high-level pipeline flow.
   - Complete algorithmic comparison matrices (ChaCha20 vs AES, ECC vs RSA, DSA vs ElGamal, Kyber parameters).

3. **Section 2: Encrypt & Conceal (`🔒 Encrypt & Conceal`)**
   - Multi-step Sender Wizard:
     - Real-time Intelligent Classifier (auto-detects bulk, sensitive, document).
     - Symmetric Cipher Selection (ChaCha20 vs AES-GCM).
     - Recipient Kyber Public Key input (or load from local Key Vault).
     - Cover image upload (or automatic cybernetic gradient generator).
     - Optional live broadcast room code.
   - Output: Downloadable Stego-Image (PNG) + 1,088-byte Kyber Ciphertext Token.

4. **Section 3: Decrypt & Extract (`🔓 Decrypt & Extract`)**
   - Multi-step Receiver Wizard:
     - Upload Stego-Image (PNG).
     - Input Kyber Ciphertext Token.
     - Input local Kyber Secret Key (or load from file/vault).
   - Output: Plaintext message preview, binary file download, and digital signature integrity badge.

5. **Section 4: Live Channel (`📡 Live Channel`)**
   - Connect Sender and Receiver in a real-time room (e.g. `DEFENSE-ROOM-1`).
   - Receiver automatically gets notified when a new Stego package is transmitted over WebSockets.
   - 1-click **"Transfer to Decryptor"** button instantly loads the received carrier image and token for immediate extraction!
