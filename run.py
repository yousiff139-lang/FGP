import sys
import uvicorn

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    print("=" * 70)
    print("  HYBRID MULTI-LEVEL POST-QUANTUM SECURITY SYSTEM")
    print("  Graduation Project Web Application")
    print("=" * 70)
    import socket
    
    port = 8000
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", port)) == 0:
            port = 8080
            
    print(f"  Local Server:  http://localhost:{port}")
    print(f"  Architecture:  Info Section, Encrypt Section, Decrypt Section")
    print(f"  Post-Quantum:  NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber)")
    print(f"  Symmetric:     ChaCha20-Poly1305 (Constant-Time ARX) / AES-256-GCM")
    print(f"  Signatures:    ECDSA P-256 Digital Signatures")
    print(f"  Steganography: LSB Spatial-Domain with Kyber-Seeded Permutation")
    print("=" * 70)
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)
