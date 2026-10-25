/**
 * Hybrid Multi-Level Security System
 * Frontend Application Controller
 */

// Application State
const state = {
  localKeys: {
    pk: null,
    sk: null,
  },
  activeRoom: null,
  socket: null,
  lastIncomingTransmission: null,
};

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initLanguageController();
  initThemeController();
  initAuthGateway();
  initNavigation();
  initKeyVault();
  initInteractiveArchitecture();
  initClassifier();
  initEncryptSection();
  initDecryptSection();
  initChannelSection();
  initAuditLogSection();

  // Try loading saved local keys from localStorage if any
  loadKeysFromStorage();

  // Initialize steganography capacity indicator
  updateStegoCapacity();
});

/* ==========================================================================
   0. THEME & ACCENT CONTROLLER
   ========================================================================== */
function initThemeController() {
  const ACCENT_PRESETS = [
    { id: "cyan", name: "Cyan", nameAr: "سمائي", color: "#00f0ff" },
    { id: "emerald", name: "Emerald", nameAr: "زمردي", color: "#10b981" },
    { id: "purple", name: "Purple", nameAr: "بنفسجي", color: "#a855f7" },
    { id: "amber", name: "Amber", nameAr: "ذهبي", color: "#f59e0b" },
    { id: "rose", name: "Rose", nameAr: "وردي", color: "#f43f5e" },
    { id: "blue", name: "Blue", nameAr: "أزرق", color: "#3b82f6" },
  ];

  const btnAccent = document.getElementById("btn-theme-accent");
  const btnMode = document.getElementById("btn-theme-mode");
  const accentDot = document.getElementById("theme-accent-dot");
  const accentLabel = document.getElementById("theme-accent-label");
  const modeLabel = document.getElementById("theme-mode-label");
  const iconSun = document.getElementById("theme-sun-icon");
  const iconMoon = document.getElementById("theme-moon-icon");

  let currentAccent = localStorage.getItem("fgp_accent_theme") || "cyan";
  let currentMode = localStorage.getItem("fgp_color_mode") || "dark";

  function applyAccent(accentId, notify = false) {
    const preset = ACCENT_PRESETS.find((p) => p.id === accentId) || ACCENT_PRESETS[0];
    currentAccent = preset.id;
    document.documentElement.setAttribute("data-accent", preset.id);
    localStorage.setItem("fgp_accent_theme", preset.id);

    if (accentDot) accentDot.style.backgroundColor = preset.color;
    if (accentLabel) accentLabel.textContent = preset.nameAr;

    if (notify) {
      showToast(`لون الإطار والكلمات: ${preset.nameAr}`, "info");
    }
  }

  function applyMode(mode, notify = false) {
    currentMode = mode === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", currentMode);
    localStorage.setItem("fgp_color_mode", currentMode);

    if (currentMode === "light") {
      if (iconSun) iconSun.classList.add("hidden");
      if (iconMoon) iconMoon.classList.remove("hidden");
      if (modeLabel) modeLabel.textContent = "فاتح";
    } else {
      if (iconSun) iconSun.classList.remove("hidden");
      if (iconMoon) iconMoon.classList.add("hidden");
      if (modeLabel) modeLabel.textContent = "داكن";
    }

    if (notify) {
      showToast(`نمط العرض: ${currentMode === "light" ? "النمط الفاتح (Light)" : "النمط الداكن (Dark)"}`, "info");
    }
  }

  // Initial load
  applyAccent(currentAccent, false);
  applyMode(currentMode, false);

  if (btnAccent) {
    btnAccent.addEventListener("click", () => {
      const currentIndex = ACCENT_PRESETS.findIndex((p) => p.id === currentAccent);
      const nextIndex = (currentIndex + 1) % ACCENT_PRESETS.length;
      applyAccent(ACCENT_PRESETS[nextIndex].id, true);
    });
  }

  if (btnMode) {
    btnMode.addEventListener("click", () => {
      const nextMode = currentMode === "dark" ? "light" : "dark";
      applyMode(nextMode, true);
    });
  }
}

/* ==========================================================================
   1. NAVIGATION & TABS
   ========================================================================== */
function initNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.target;
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".content-section").forEach((sec) => {
        sec.classList.remove("active");
      });

      const targetSec = document.getElementById(targetId);
      if (targetSec) targetSec.classList.add("active");

      // Clear pulse if viewing channel
      if (targetId === "section-channel") {
        document.getElementById("channel-pulse").classList.add("hidden");
      }

      // Automatically refresh audit logs when viewing audit section
      if (targetId === "section-audit") {
        if (typeof loadAuditLogs === "function") loadAuditLogs();
      }
    });
  });
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/* ==========================================================================
   2. KEY VAULT (LOCAL POST-QUANTUM KEY MANAGEMENT)
   ========================================================================== */
/* ==========================================================================
   2. KEY VAULT (LOCAL POST-QUANTUM KEY MANAGEMENT)
   ========================================================================== */
async function generateLatticeKeys(autoApply = true, notify = true) {
  try {
    const formData = new FormData();
    formData.append("username", getActiveUser());
    const res = await fetch("/api/keygen", {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();

    if (data.status === "success") {
      state.localKeys.pk = data.public_key_b64;
      state.localKeys.sk = data.secret_key_b64;

      const vaultPk = document.getElementById("vault-pk");
      const vaultSk = document.getElementById("vault-sk");
      if (vaultPk) vaultPk.value = data.public_key_b64;
      if (vaultSk) vaultSk.value = data.secret_key_b64;

      const btnExportPk = document.getElementById("btn-export-pk");
      const btnExportSk = document.getElementById("btn-export-sk");
      if (btnExportPk) btnExportPk.disabled = false;
      if (btnExportSk) btnExportSk.disabled = false;

      saveKeysToStorage();

      if (autoApply) {
        applyVaultKeysToForms();
      }

      if (notify) {
        showToast("ML-KEM-768 keypair generated & loaded into workflows!", "success");
      }
      return true;
    } else {
      throw new Error(data.detail || "Keygen response indicated failure");
    }
  } catch (e) {
    showToast("Key generation error: " + e.message, "error");
    return false;
  }
}

function initKeyVault() {
  const modal = document.getElementById("vault-modal");
  const btnOpen = document.getElementById("btn-open-vault");
  const btnClose = document.getElementById("btn-close-vault");
  const btnGen = document.getElementById("btn-gen-keys");
  const btnExportPk = document.getElementById("btn-export-pk");
  const btnExportSk = document.getElementById("btn-export-sk");
  const btnUseVault = document.getElementById("btn-use-vault-keys");
  const btnUseVaultPk = document.getElementById("btn-use-vault-pk");
  const btnUseVaultSk = document.getElementById("btn-use-vault-sk");
  const btnQuickGenPk = document.getElementById("btn-quick-gen-pk");
  const btnQuickGenSk = document.getElementById("btn-quick-gen-sk");

  if (btnOpen && modal) btnOpen.addEventListener("click", () => modal.classList.remove("hidden"));
  if (btnClose && modal) btnClose.addEventListener("click", () => modal.classList.add("hidden"));

  // Close modal when clicking outside of it
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  if (btnGen) {
    btnGen.addEventListener("click", async () => {
      btnGen.disabled = true;
      btnGen.textContent = "Generating Lattice Keys...";
      await generateLatticeKeys(true, true);
      btnGen.disabled = false;
      btnGen.textContent = "⚡ Generate New Kyber-768 Keypair";
    });
  }

  if (btnQuickGenPk) {
    btnQuickGenPk.addEventListener("click", async () => {
      btnQuickGenPk.disabled = true;
      btnQuickGenPk.textContent = "Generating...";
      await generateLatticeKeys(true, true);
      btnQuickGenPk.disabled = false;
      btnQuickGenPk.textContent = "⚡ Generate Lattice Keypair";
    });
  }

  if (btnQuickGenSk) {
    btnQuickGenSk.addEventListener("click", async () => {
      btnQuickGenSk.disabled = true;
      btnQuickGenSk.textContent = "Generating...";
      await generateLatticeKeys(true, true);
      btnQuickGenSk.disabled = false;
      btnQuickGenSk.textContent = "⚡ Generate Lattice Keypair";
    });
  }

  if (btnExportPk) {
    btnExportPk.addEventListener("click", () => {
      if (state.localKeys.pk) {
        downloadBlob(state.localKeys.pk, "kyber_public.key", "text/plain");
      }
    });
  }

  if (btnExportSk) {
    btnExportSk.addEventListener("click", () => {
      if (state.localKeys.sk) {
        downloadBlob(state.localKeys.sk, "kyber_secret.key", "text/plain");
      }
    });
  }

  if (btnUseVault) {
    btnUseVault.addEventListener("click", () => {
      applyVaultKeysToForms();
      if (modal) modal.classList.add("hidden");
      showToast("Loaded keys into Encrypt & Decrypt forms.", "success");
    });
  }

  if (btnUseVaultPk) {
    btnUseVaultPk.addEventListener("click", async () => {
      if (state.localKeys.pk) {
        const input = document.getElementById("encrypt-recipient-pk");
        if (input) input.value = state.localKeys.pk;
        showToast("Public key loaded into Encrypt form.", "success");
      } else {
        showToast("Generating fresh ML-KEM-768 keypair...", "info");
        const ok = await generateLatticeKeys(true, true);
        if (ok) {
          const input = document.getElementById("encrypt-recipient-pk");
          if (input) input.value = state.localKeys.pk;
        }
      }
    });
  }

  if (btnUseVaultSk) {
    btnUseVaultSk.addEventListener("click", async () => {
      if (state.localKeys.sk) {
        const input = document.getElementById("decrypt-kyber-sk");
        if (input) input.value = state.localKeys.sk;
        showToast("Secret key loaded into Decrypt form.", "success");
      } else {
        showToast("Generating fresh ML-KEM-768 keypair...", "info");
        const ok = await generateLatticeKeys(true, true);
        if (ok) {
          const input = document.getElementById("decrypt-kyber-sk");
          if (input) input.value = state.localKeys.sk;
        }
      }
    });
  }
}

function saveKeysToStorage() {
  try {
    localStorage.setItem("kyber_pk", state.localKeys.pk || "");
    localStorage.setItem("kyber_sk", state.localKeys.sk || "");
  } catch (e) {}
}

function loadKeysFromStorage() {
  try {
    const pk = localStorage.getItem("kyber_pk");
    const sk = localStorage.getItem("kyber_sk");
    if (pk && sk) {
      state.localKeys.pk = pk;
      state.localKeys.sk = sk;
      const vaultPk = document.getElementById("vault-pk");
      const vaultSk = document.getElementById("vault-sk");
      if (vaultPk) vaultPk.value = pk;
      if (vaultSk) vaultSk.value = sk;
      const btnExportPk = document.getElementById("btn-export-pk");
      const btnExportSk = document.getElementById("btn-export-sk");
      if (btnExportPk) btnExportPk.disabled = false;
      if (btnExportSk) btnExportSk.disabled = false;
      applyVaultKeysToForms();
    } else {
      // Auto-generate initial keys so the user never encounters an empty vault
      generateLatticeKeys(true, false);
    }
  } catch (e) {
    generateLatticeKeys(true, false);
  }
}

function applyVaultKeysToForms() {
  if (state.localKeys.pk) {
    const pkInput = document.getElementById("encrypt-recipient-pk");
    if (pkInput) pkInput.value = state.localKeys.pk;
  }
  if (state.localKeys.sk) {
    const skInput = document.getElementById("decrypt-kyber-sk");
    if (skInput) skInput.value = state.localKeys.sk;
  }
}

/* ==========================================================================
   3. STEGANOGRAPHY COVER SIZE CALCULATOR
   ========================================================================== */
let currentUploadedCover = null; // { file, name, width, height, pixels, capacityBytes }
let lastCalculatedCapacity = {
  rawBytes: 0,
  minDim: 0,
  isSufficient: true
};

function estimatePackageBytes(rawBytes, isDocument = false) {
  if (rawBytes <= 0) return 0;
  if (isDocument) {
    const b64Body = Math.ceil(rawBytes / 3) * 4;
    const innerPacketSize = b64Body + 350;
    const ciphertextLen = innerPacketSize + 16;
    const b64Ciphertext = Math.ceil(ciphertextLen / 3) * 4;
    return b64Ciphertext + 180;
  } else {
    const ciphertextLen = rawBytes + 16;
    const b64Ciphertext = Math.ceil(ciphertextLen / 3) * 4;
    return b64Ciphertext + 180;
  }
}

function updateStegoCapacity(forcedType = null) {
  const isFile = document.getElementById("tab-input-file")?.classList.contains("active");
  const textVal = document.getElementById("encrypt-text")?.value || "";
  const fileInput = document.getElementById("encrypt-file");
  const overrideVal = document.getElementById("encrypt-override")?.value || "";

  let rawBytes = 0;
  let isDocType = false;

  if (isFile && fileInput?.files?.length > 0) {
    const file = fileInput.files[0];
    rawBytes = file.size;
    isDocType = /\.(pdf|docx?|xlsx?|txt|csv|json|md|rtf)$/i.test(file.name);
  } else if (!isFile && textVal.trim().length > 0) {
    rawBytes = new TextEncoder().encode(textVal).length;
  }

  if (forcedType) {
    isDocType = (forcedType === "document");
  } else if (overrideVal) {
    isDocType = (overrideVal === "document");
  }

  const msgBox = document.getElementById("cover-size-msg");
  const labelEl = document.getElementById("cover-size-label");
  const valEl = document.getElementById("cover-size-val");

  if (!msgBox || !valEl) return;

  if (rawBytes === 0) {
    lastCalculatedCapacity = { rawBytes: 0, minDim: 0, isSufficient: true };
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) labelEl.textContent = "Required cover image size:";
    valEl.textContent = "Awaiting payload...";
    return;
  }

  const packageBytes = estimatePackageBytes(rawBytes, isDocType);
  const framedBytes = packageBytes + 36; // 4B length + 32B SHA-256
  const minPixels = Math.ceil((framedBytes * 8) / 3);
  const minDim = Math.ceil(Math.sqrt(minPixels));

  lastCalculatedCapacity = {
    rawBytes,
    minDim,
    isSufficient: true
  };

  if (currentUploadedCover) {
    const coverCap = currentUploadedCover.capacityBytes;
    if (packageBytes <= coverCap) {
      lastCalculatedCapacity.isSufficient = true;
      msgBox.className = "cover-size-msg msg-ok mt-2";
      if (labelEl) labelEl.textContent = `✓ Selected image is ${currentUploadedCover.width} × ${currentUploadedCover.height} px (Needed:`;
      valEl.textContent = `at least ${minDim} × ${minDim} px)`;
    } else {
      lastCalculatedCapacity.isSufficient = false;
      msgBox.className = "cover-size-msg msg-error mt-2";
      if (labelEl) labelEl.textContent = `⚠️ Selected image is ${currentUploadedCover.width} × ${currentUploadedCover.height} px. Required:`;
      valEl.textContent = `at least ${minDim} × ${minDim} px`;
    }
  } else {
    lastCalculatedCapacity.isSufficient = true;
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) labelEl.textContent = "Required cover image size:";
    valEl.textContent = `at least ${minDim} × ${minDim} px`;
  }
}

/* ==========================================================================
   4. DATA TYPE CLASSIFIER ROUTER
   ========================================================================== */
function initClassifier() {
  const textInput = document.getElementById("encrypt-text");
  const fileInput = document.getElementById("encrypt-file");
  const overrideSelect = document.getElementById("encrypt-override");

  const tabText = document.getElementById("tab-input-text");
  const tabFile = document.getElementById("tab-input-file");
  const textContainer = document.getElementById("input-text-container");
  const fileContainer = document.getElementById("input-file-container");

  tabText.addEventListener("click", () => {
    tabText.classList.add("active");
    tabFile.classList.remove("active");
    textContainer.classList.remove("hidden");
    fileContainer.classList.add("hidden");
    updateStegoCapacity();
    triggerClassification();
  });

  tabFile.addEventListener("click", () => {
    tabFile.classList.add("active");
    tabText.classList.remove("active");
    fileContainer.classList.remove("hidden");
    textContainer.classList.add("hidden");
    updateStegoCapacity();
    triggerClassification();
  });

  let debounceTimer = null;
  textInput.addEventListener("input", () => {
    updateStegoCapacity();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerClassification, 250);
  });

  fileInput.addEventListener("change", () => {
    updateStegoCapacity();
    triggerClassification();
  });

  overrideSelect.addEventListener("change", () => {
    updateStegoCapacity();
    triggerClassification();
  });
}

async function triggerClassification() {
  const isFile = document.getElementById("tab-input-file").classList.contains("active");
  const textVal = document.getElementById("encrypt-text").value;
  const fileInput = document.getElementById("encrypt-file");
  const overrideVal = document.getElementById("encrypt-override").value;

  const badge = document.getElementById("badge-classification");
  const reason = document.getElementById("classifier-reason");
  const route = document.getElementById("classifier-route-text");

  const formData = new FormData();
  if (overrideVal) formData.append("override_type", overrideVal);

  if (isFile && fileInput.files.length > 0) {
    formData.append("file", fileInput.files[0]);
  } else if (!isFile && textVal.trim().length > 0) {
    formData.append("text", textVal);
  } else {
    badge.className = "badge badge-accent";
    badge.textContent = "Awaiting Input";
    reason.textContent = "Type a message or select a file to inspect parameters.";
    route.textContent = "Route: -";
    updateStegoCapacity();
    return;
  }

  try {
    const res = await fetch("/api/classify", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.type) {
      badge.textContent = data.type.toUpperCase();
      if (data.type === "bulk") {
        badge.className = "badge badge-primary";
      } else if (data.type === "sensitive") {
        badge.className = "badge badge-warning";
      } else if (data.type === "document") {
        badge.className = "badge badge-success";
      }
      reason.textContent = data.reason;
      route.textContent = `Route: ${data.route}`;
      // Update capacity with backend-confirmed data type
      updateStegoCapacity(data.type);
    }
  } catch (e) {
    console.error("Classification error:", e);
  }
}

/* ==========================================================================
   5. ENCRYPTION PIPELINE (SENDER)
   ========================================================================== */
function initEncryptSection() {
  const btnEncrypt = document.getElementById("btn-execute-encrypt");
  const coverInput = document.getElementById("encrypt-cover-image");
  const btnResetCover = document.getElementById("btn-reset-cover");

  // Handle Cover Image upload and inspect dimensions
  if (coverInput) {
    coverInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) {
        currentUploadedCover = null;
        if (btnResetCover) btnResetCover.classList.add("hidden");
        updateStegoCapacity();
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const pixels = width * height;
        const totalBytes = Math.floor((pixels * 3) / 8);
        const capacityBytes = Math.max(0, totalBytes - 36);

        currentUploadedCover = {
          file,
          name: file.name,
          width,
          height,
          pixels,
          capacityBytes
        };

        URL.revokeObjectURL(objectUrl);
        if (btnResetCover) btnResetCover.classList.remove("hidden");
        updateStegoCapacity();
        showToast(`Cover image: ${width} × ${height} px`, "info");
      };

      img.onerror = () => {
        currentUploadedCover = null;
        URL.revokeObjectURL(objectUrl);
        if (btnResetCover) btnResetCover.classList.add("hidden");
        showToast("Could not read image dimensions. Please check file format.", "error");
        updateStegoCapacity();
      };

      img.src = objectUrl;
    });
  }

  // Handle Reset to Default Auto-Synthesized Cover
  if (btnResetCover) {
    btnResetCover.addEventListener("click", () => {
      if (coverInput) coverInput.value = "";
      currentUploadedCover = null;
      btnResetCover.classList.add("hidden");
      updateStegoCapacity();
      showToast("Reverted to default cover.", "info");
    });
  }

  btnEncrypt.addEventListener("click", async () => {
    const isFile = document.getElementById("tab-input-file").classList.contains("active");
    const textVal = document.getElementById("encrypt-text").value;
    const fileInput = document.getElementById("encrypt-file");
    const pkVal = document.getElementById("encrypt-recipient-pk").value.trim();
    const cipherChoice = document.querySelector('input[name="cipher_choice"]:checked').value;
    const overrideVal = document.getElementById("encrypt-override").value;
    const channelRoomVal = document.getElementById("encrypt-channel-room").value.trim();

    if (!pkVal) {
      showToast("Recipient Kyber-768 Public Key is required!", "error");
      return;
    }

    if (isFile && fileInput.files.length === 0) {
      showToast("Please select a file to encrypt.", "error");
      return;
    }

    if (!isFile && !textVal.trim()) {
      showToast("Please enter text payload to encrypt.", "error");
      return;
    }

    // Proactive Capacity Verification: block submission if custom cover is too small
    if (currentUploadedCover && !lastCalculatedCapacity.isSufficient) {
      showToast(
        `Selected cover image is too small! Required size: at least ${lastCalculatedCapacity.minDim}×${lastCalculatedCapacity.minDim} px.`,
        "error"
      );
      const msgBox = document.getElementById("cover-size-msg");
      if (msgBox) {
        msgBox.scrollIntoView({ behavior: "smooth", block: "center" });
        msgBox.classList.add("shake-animation");
        setTimeout(() => msgBox.classList.remove("shake-animation"), 500);
      }
      return;
    }

    const formData = new FormData();
    if (isFile) {
      formData.append("file", fileInput.files[0]);
    } else {
      formData.append("text", textVal);
    }

    if (coverInput && coverInput.files.length > 0) {
      formData.append("cover_image", coverInput.files[0]);
    }

    formData.append("recipient_kyber_pk_b64", pkVal);
    formData.append("preferred_cipher", cipherChoice);
    if (overrideVal) formData.append("override_type", overrideVal);
    if (channelRoomVal) formData.append("channel_room", channelRoomVal);
    formData.append("username", getActiveUser());

    btnEncrypt.disabled = true;
    btnEncrypt.textContent = "Processing Multi-Level Pipeline...";

    try {
      const res = await fetch("/api/encrypt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Encryption failed");
      }

      const result = await res.json();
      renderEncryptionResult(result);
      showToast("Encryption and steganographic embedding completed!", "success");

      if (channelRoomVal) {
        showToast(`Payload broadcasted to channel room: ${channelRoomVal}`, "info");
      }
    } catch (e) {
      showToast("Error: " + e.message, "error");
    } finally {
      btnEncrypt.disabled = false;
      btnEncrypt.textContent = "🛡️ Encrypt, Wrap with Kyber & Conceal";
    }
  });

  // Copy token button
  document.getElementById("btn-copy-kyber-ct").addEventListener("click", () => {
    const text = document.getElementById("output-kyber-ct").value;
    navigator.clipboard.writeText(text);
    showToast("Kyber Token copied to clipboard!", "success");
  });

  // Download token button
  document.getElementById("btn-download-kyber-ct").addEventListener("click", () => {
    const text = document.getElementById("output-kyber-ct").value;
    downloadBlob(text, "kyber_ciphertext.token", "text/plain");
  });
}

function renderEncryptionResult(result) {
  document.getElementById("encrypt-placeholder").classList.add("hidden");
  const container = document.getElementById("encrypt-results-container");
  container.classList.remove("hidden");

  // Stego Preview
  const imgPreview = document.getElementById("stego-image-preview");
  const imgUrl = `data:image/png;base64,${result.stego_image_b64}`;
  imgPreview.src = imgUrl;

  const btnDl = document.getElementById("btn-download-stego");
  btnDl.href = imgUrl;

  // Kyber Ciphertext
  document.getElementById("output-kyber-ct").value = result.kyber_ciphertext_b64;

  // Telemetry
  document.getElementById("telem-payload-size").textContent = `${result.payload_size.toLocaleString()} Bytes`;
  document.getElementById("telem-stego-size").textContent = `${result.stego_size.toLocaleString()} Bytes`;
  document.getElementById("telem-route").textContent = result.classification.route;
  document.getElementById("telem-signature").textContent = result.signature_b64 ? "ECDSA P-256 Attached" : "Not Required";
}

/* ==========================================================================
   5. DECRYPTION PIPELINE (RECEIVER)
   ========================================================================== */
function initDecryptSection() {
  const btnDecrypt = document.getElementById("btn-execute-decrypt");
  const stegoInput = document.getElementById("decrypt-stego-file");
  const tokenInput = document.getElementById("decrypt-token-file");
  const skBrowse = document.getElementById("btn-browse-sk");
  const skInput = document.getElementById("decrypt-sk-file");

  stegoInput.addEventListener("change", () => {
    if (stegoInput.files.length > 0) {
      const file = stegoInput.files[0];
      const previewBox = document.getElementById("decrypt-image-preview-box");
      const previewImg = document.getElementById("decrypt-image-preview");
      previewImg.src = URL.createObjectURL(file);
      previewBox.classList.remove("hidden");
    }
  });

  tokenInput.addEventListener("change", async () => {
    if (tokenInput.files.length > 0) {
      const text = await tokenInput.files[0].text();
      document.getElementById("decrypt-kyber-ct").value = text.trim();
      showToast("Kyber token loaded from file.", "info");
    }
  });

  skBrowse.addEventListener("click", () => skInput.click());
  skInput.addEventListener("change", async () => {
    if (skInput.files.length > 0) {
      const text = await skInput.files[0].text();
      document.getElementById("decrypt-kyber-sk").value = text.trim();
      showToast("Secret key loaded from file.", "info");
    }
  });

  btnDecrypt.addEventListener("click", async () => {
    const stegoFile = stegoInput.files[0];
    const incomingStegoB64 = state.lastIncomingTransmission ? state.lastIncomingTransmission.stego_image_b64 : null;
    const kyberCt = document.getElementById("decrypt-kyber-ct").value.trim();
    const kyberSk = document.getElementById("decrypt-kyber-sk").value.trim();

    if (!stegoFile && !incomingStegoB64) {
      showToast("Please upload a Stego-Image PNG.", "error");
      return;
    }
    if (!kyberCt) {
      showToast("Kyber-768 Ciphertext Token is required.", "error");
      return;
    }
    if (!kyberSk) {
      showToast("Recipient Kyber-768 Secret Key is required.", "error");
      return;
    }

    const formData = new FormData();
    if (stegoFile) {
      formData.append("stego_image", stegoFile);
    } else if (incomingStegoB64) {
      formData.append("stego_image_b64", incomingStegoB64);
    }
    formData.append("kyber_ciphertext_b64", kyberCt);
    formData.append("recipient_kyber_sk_b64", kyberSk);
    formData.append("username", getActiveUser());

    btnDecrypt.disabled = true;
    btnDecrypt.textContent = "Decapsulating Kyber & Extracting...";

    try {
      const res = await fetch("/api/decrypt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Decryption failed");
      }

      const result = await res.json();
      renderDecryptionResult(result);
      showToast("Payload extracted & decrypted successfully!", "success");
    } catch (e) {
      showToast("Extraction error: " + e.message, "error");
    } finally {
      btnDecrypt.disabled = false;
      btnDecrypt.textContent = "🔓 Decapsulate & Extract Data";
    }
  });
}

function renderDecryptionResult(result) {
  document.getElementById("decrypt-placeholder").classList.add("hidden");
  const container = document.getElementById("decrypt-results-container");
  container.classList.remove("hidden");

  // Verification Banner
  const icon = document.getElementById("verif-icon");
  const title = document.getElementById("verif-title");
  const desc = document.getElementById("verif-desc");

  if (result.signature_verified === true) {
    icon.textContent = "🛡️";
    title.textContent = "Integrity & Authenticity Verified";
    desc.textContent = "ECDSA P-256 digital signature verified against sender's public key.";
  } else if (result.signature_verified === false) {
    icon.textContent = "⚠️";
    title.textContent = "Signature Verification FAILED";
    desc.textContent = "The signature did not match the document content!";
  } else {
    icon.textContent = "✅";
    title.textContent = "AEAD Tag & Checksum Verified";
    desc.textContent = "Poly1305 / GCM authenticated ciphertext decrypted cleanly.";
  }

  // Text Preview vs Binary Download
  const textGroup = document.getElementById("decrypt-text-preview-group");
  const fileGroup = document.getElementById("decrypt-file-download-group");
  const textArea = document.getElementById("decrypt-result-text");
  const btnDownloadFile = document.getElementById("btn-download-recovered-file");
  const filenameSpan = document.getElementById("rec-filename");

  if (result.is_text) {
    textGroup.classList.remove("hidden");
    textArea.value = result.text_preview;
  } else {
    textGroup.classList.add("hidden");
  }

  // Setup file download
  filenameSpan.textContent = result.filename;
  const binaryData = atob(result.data_b64);
  const bytes = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  btnDownloadFile.href = URL.createObjectURL(blob);
  btnDownloadFile.download = result.filename;
  fileGroup.classList.remove("hidden");

  // Metadata
  document.getElementById("rec-data-type").textContent = result.data_type.toUpperCase();
  document.getElementById("rec-cipher").textContent = result.cipher_used.toUpperCase();
  document.getElementById("rec-sig-status").textContent =
    result.signature_verified === true ? "Verified (Valid)" : "N/A";
}

/* ==========================================================================
   6. LIVE SENDER ⇄ RECEIVER CHANNEL (WEBSOCKETS)
   ========================================================================== */
function initChannelSection() {
  const btnJoin = document.getElementById("btn-join-channel");
  const roomInput = document.getElementById("channel-room-input");
  const btnTransfer = document.getElementById("btn-load-incoming-to-decrypt");

  btnJoin.addEventListener("click", () => {
    const roomId = roomInput.value.trim();
    if (!roomId) return;
    connectToChannel(roomId);
  });

  btnTransfer.addEventListener("click", () => {
    if (!state.lastIncomingTransmission) return;

    // Populate Decrypt Form
    const trans = state.lastIncomingTransmission;
    document.getElementById("decrypt-kyber-ct").value = trans.kyber_ciphertext_b64;

    const previewBox = document.getElementById("decrypt-image-preview-box");
    const previewImg = document.getElementById("decrypt-image-preview");
    previewImg.src = `data:image/png;base64,${trans.stego_image_b64}`;
    previewBox.classList.remove("hidden");

    // Switch Tab to Decrypt
    document.querySelector('.nav-tab[data-target="section-decrypt"]').click();
    showToast("Incoming package loaded into Decrypt section. Click Decapsulate!", "success");
  });
}

function connectToChannel(roomId) {
  if (state.socket) {
    state.socket.close();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/channel/${encodeURIComponent(roomId)}`;

  appendChannelLog(`Connecting to WebSocket room: ${roomId}...`, "system");

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    state.activeRoom = roomId;
    document.getElementById("channel-indicator").className = "status-indicator online";
    document.getElementById("channel-status-label").textContent = `Channel: ${roomId}`;
    document.getElementById("room-status-badge").textContent = "Connected (Listening)";
    document.getElementById("room-status-badge").className = "text-success";
    document.getElementById("room-current-id").textContent = roomId;

    appendChannelLog(`Connected to live room: ${roomId}. Ready for transmissions.`, "system");
    showToast(`Connected to Channel: ${roomId}`, "success");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "new_transmission") {
        state.lastIncomingTransmission = data;
        appendChannelLog(
          `⚡ [New Transmission] Carrier: ${data.filename || "stego_carrier.png"}, Payload: ${data.payload_size}B`,
          "incoming"
        );

        // Flash pulse
        document.getElementById("channel-pulse").classList.remove("hidden");
        document.getElementById("incoming-alert-box").classList.remove("hidden");
        document.getElementById("incoming-desc").textContent =
          `Received from room ${data.room_id}: ${data.filename || "data"} (${data.payload_size} bytes)`;

        showToast("⚡ Incoming Stego Package received on Channel!", "warning");
      }
    } catch (e) {}
  };

  socket.onclose = () => {
    document.getElementById("channel-indicator").className = "status-indicator offline";
    document.getElementById("channel-status-label").textContent = "Channel: Offline";
    document.getElementById("room-status-badge").textContent = "Disconnected";
    document.getElementById("room-status-badge").className = "text-muted";
    appendChannelLog("Channel connection closed.", "system");
  };

  state.socket = socket;
}

function appendChannelLog(message, type = "normal") {
  const logBox = document.getElementById("channel-event-log");
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}-entry`;
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

/* ==========================================================================
   7. UTILITIES
   ========================================================================== */
function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   8. INTERACTIVE ARCHITECTURE PIPELINE & SIMULATION
   ========================================================================== */
function initInteractiveArchitecture() {
  const stages = {
    1: {
      title: "Stage 01: Intelligent Payload Classifier",
      desc: "Dynamic route selection based on file header heuristics and entropy analysis.",
      standard: "IEEE / RFC Heuristics",
      primitive: "MIME & Entropy Scanner",
      security: "Context-Aware Cryptographic Routing",
      io: "Raw Bytes → Route Assignment",
      latency: "< 0.05 ms (In-Memory)",
      math: "Inspects payload byte distribution, MIME signatures, and high-entropy credential patterns (Bearer tokens, private keys, API secrets). Automatically maps inputs into three isolated security tiers:",
      steps: [
        "Bulk Data (≥64KB / media): ChaCha20-Poly1305 high-throughput AEAD stream.",
        "Sensitive Credentials: Dual-layer payload encryption with ephemeral key encapsulation.",
        "Documents & Integrity: ECDSA P-256 digital signature wrapping for non-repudiation."
      ],
      defense: "Prevents 'one-size-fits-all' cryptographic pitfalls by enforcing constant-time ARX primitives on high-risk software targets and binding tamper-evident hashes to document payloads."
    },
    2: {
      title: "Stage 02: Dynamic Cryptographic Routing",
      desc: "Targeted execution of classical cryptographic primitives based on classified data tier.",
      standard: "RFC 8439 / NIST SP 800-38D",
      primitive: "ChaCha20-Poly1305 / ECDH / ECDSA",
      security: "128-bit Symmetric / ECC Security",
      io: "Plaintext → Ciphertext + MAC Tag",
      latency: "~0.12 ms (ARX Optimized)",
      math: "Applies constant-time Add-Rotate-XOR operations on 512-bit state blocks. Completely eliminates lookup-table timing vulnerabilities while computing a Poly1305 one-time authenticator tag.",
      steps: [
        "ChaCha20 State: 4×4 matrix of 32-bit words (constant-time execution across all CPUs).",
        "Poly1305 MAC: Computes 16-byte authentication tag modulo 2^130 - 5.",
        "ECDSA Signatures: Signs document digests with prime-order elliptic curve subgroups."
      ],
      defense: "Guarantees confidentiality and authenticity against cache-timing attacks on platforms lacking hardware AES-NI instructions."
    },
    3: {
      title: "Stage 03: NIST FIPS 203 ML-KEM-768 Consolidation",
      desc: "Module lattice-based post-quantum key encapsulation mechanism and HKDF subkey derivation.",
      standard: "NIST FIPS 203 / ML-KEM",
      primitive: "Module-LWE Lattice Encapsulation",
      security: "NIST Category 3 (Quantum-Resistant)",
      io: "1,184B Public Key → 1,088B Ciphertext + 32B Secret",
      latency: "~0.25 ms (Polynomial Mult)",
      math: "Generates public/private key pairs and encapsulates shared secrets via the Module Learning With Errors (M-LWE) problem over polynomial rings R_q = Z_q[X]/(X^256 + 1). Derives 'payload_key' and 'stego_seed' via HKDF-SHA256.",
      steps: [
        "Encapsulate: Generates 1,088-byte lattice ciphertext wrapper from recipient's public key.",
        "Shared Secret: Extracts 32-byte high-entropy lattice secret key.",
        "HKDF Expansion: Derives independent 32-byte Payload Key and 32-byte Stego Seed."
      ],
      defense: "Secures data against 'Harvest Now, Decrypt Later' quantum attacks. No known quantum algorithm (including Shor's) can invert M-LWE in polynomial time."
    },
    4: {
      title: "Stage 04: Spatial-Domain Steganographic Concealment",
      desc: "Kyber-seeded pseudo-random pixel permutation and lossless RGB least significant bit embedding.",
      standard: "Spatial LSB / Lossless PNG",
      primitive: "Seeded Pseudo-Random Permutation",
      security: "Visual Zero-Alteration (ΔE < 0.05)",
      io: "Payload + Cover PNG → Stego PNG Carrier",
      latency: "~1.2 ms (Parallel Pixel Shuffling)",
      math: "Initializes a Mersenne Twister pseudo-random permutation seeded with the 32-byte Kyber-derived 'stego_seed'. Embeds encrypted payload bits into the least significant bit (LSB) of non-contiguous RGB pixel coordinates.",
      steps: [
        "Pixel Index Permutation: Non-sequential, secret-dependent pixel path across RGB channels.",
        "LSB Modification: Replaces least significant bit (imperceptible luminance variation).",
        "Zero-Alteration Guard: Preserves perceptual visual fidelity in lossless PNG output."
      ],
      defense: "Shields against statistical chi-square steganographic attacks by eliminating sequential embedding patterns. An eavesdropper cannot detect or extract bits without the Kyber secret key."
    }
  };

  const stageCards = document.querySelectorAll(".arch-stage-card");
  const btnSim = document.getElementById("btn-run-arch-sim");
  const simTrack = document.getElementById("sim-progress-track");
  const simFill = document.getElementById("sim-progress-fill");
  const simBtnText = document.getElementById("sim-btn-text");

  function selectStage(stageNum) {
    stageCards.forEach((c) => {
      if (parseInt(c.dataset.stage, 10) === stageNum) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });

    const data = stages[stageNum];
    if (!data) return;

    document.getElementById("inspector-stage-title").textContent = data.title;
    document.getElementById("inspector-stage-desc").textContent = data.desc;
    document.getElementById("inspector-stage-standard").textContent = data.standard;
    document.getElementById("insp-metric-primitive").textContent = data.primitive;
    document.getElementById("insp-metric-security").textContent = data.security;
    document.getElementById("insp-metric-io").textContent = data.io;
    document.getElementById("insp-metric-latency").textContent = data.latency;
    document.getElementById("insp-dive-math").textContent = data.math;
    document.getElementById("insp-dive-defense").textContent = data.defense;

    const listContainer = document.getElementById("insp-dive-steps");
    listContainer.innerHTML = "";
    data.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      listContainer.appendChild(li);
    });
  }

  // Click on stage cards
  stageCards.forEach((card) => {
    card.addEventListener("click", () => {
      const stageNum = parseInt(card.dataset.stage, 10);
      selectStage(stageNum);
    });
  });

  // Simulation flow runner
  if (btnSim) {
    btnSim.addEventListener("click", () => {
      btnSim.disabled = true;
      simBtnText.textContent = "Simulating Flow...";
      simTrack.classList.add("active");

      let currentStep = 1;
      selectStage(currentStep);
      simFill.style.width = "25%";
      stageCards[0].classList.add("simulating");

      const interval = setInterval(() => {
        stageCards.forEach((c) => c.classList.remove("simulating"));
        currentStep++;

        if (currentStep <= 4) {
          selectStage(currentStep);
          simFill.style.width = `${currentStep * 25}%`;
          stageCards[currentStep - 1].classList.add("simulating");
        } else {
          clearInterval(interval);
          stageCards.forEach((c) => c.classList.remove("simulating"));
          simTrack.classList.remove("active");
          simFill.style.width = "0%";
          btnSim.disabled = false;
          simBtnText.textContent = "Simulate Pipeline Flow";
          showToast("Pipeline flow simulation completed successfully!", "success");
        }
      }, 750);
    });
  }
}

/* ==========================================================================
   HELPER: ACTIVE USER SESSION
   ========================================================================== */
function getActiveUser() {
  return localStorage.getItem("fgp_auth_user") || "guest";
}

/* ==========================================================================
   BILINGUAL I18N CONTROLLER (ENGLISH & ARABIC)
   ========================================================================== */
const I18N_DATA = {
  ar: {
    lang_btn: "English",
    brand_title: "نظام التشفير المقاوم للكم",
    brand_sub: "الجامعة المستنصرية • كلية الهندسة",
    badge_grad: "مشروع التخرج",
    nav_info: "معلومات النظام",
    nav_encrypt: "تشفير وحجب",
    nav_decrypt: "فك التشفير",
    nav_channel: "قناة البث",
    nav_audit: "سجل العمليات",
    vault_btn: "خزنة المفاتيح",
    theme_accent: "اللون",
    theme_mode_dark: "داكن",
    theme_mode_light: "فاتح",

    // Auth Gateway
    auth_badge: "مشروع التخرج الهندسي",
    auth_title: "نظام الأمان السيبراني الهجين المقاوم للحوسبة الكمومية",
    auth_sub: "الجامعة المستنصرية • كلية الهندسة • قسم هندسة الحاسوب",
    tab_login: "تسجيل الدخول",
    tab_register: "إنشاء حساب جديد",
    lbl_login_user: "اسم المستخدم:",
    lbl_login_pass: "كلمة المرور:",
    lbl_reg_user: "اسم المستخدم الجديد:",
    lbl_reg_user_placeholder: "ادخل اسم المستخدم...",
    lbl_reg_pass: "كلمة المرور:",
    lbl_reg_confirm: "تأكيد كلمة المرور:",
    btn_login: "تسجيل الدخول والمتابعة",
    btn_register: "إنشاء الحساب وتفعيل النظام",
    btn_guest: "🚀 الدخول كضيف للاختبار السريع (Guest Access)",

    // Audit Log
    audit_title: "سجل العمليات والتدقيق الأمني",
    audit_sub: "تتبع شامل لكافة العمليات المشفرة، حزم كايبر (Kyber-768)، وعمليات الإخفاء التي قام بها الحساب.",
    stat_total: "إجمالي العمليات",
    stat_encrypt: "التشفير والإخفاء",
    stat_decrypt: "فك التشفير",
    stat_keygen: "توليد المفاتيح",
    table_title: "سجل العمليات المشفرة للمستخدم",
    filter_all: "الكل",
    filter_encrypt: "تشفير",
    filter_decrypt: "فك تشفير",
    filter_keygen: "مفاتيح",
    btn_refresh: "تحديث",
    btn_export: "تصدير",
    btn_clear: "مسح",
    th_time: "التوقيت والتاريخ",
    th_action: "العملية والنوع",
    th_details: "تفاصيل الحزمة والتشفير",
    th_status: "الحالة والتحقق",
    audit_empty: "لا توجد عمليات مسجلة حتى الآن لهذا الحساب.",
  },
  en: {
    lang_btn: "العربية",
    brand_title: "Post-Quantum Stego System",
    brand_sub: "Mustansiriyah University • College of Engineering",
    badge_grad: "Graduation Project",
    nav_info: "System Info",
    nav_encrypt: "Encrypt & Conceal",
    nav_decrypt: "Extract & Decrypt",
    nav_channel: "Peer Channel",
    nav_audit: "Activity Log",
    vault_btn: "Key Vault",
    theme_accent: "Color",
    theme_mode_dark: "Dark",
    theme_mode_light: "Light",

    // Auth Gateway
    auth_badge: "Graduation Capstone Project",
    auth_title: "Hybrid Multi-Level Quantum-Resistant Security System",
    auth_sub: "Mustansiriyah University • College of Engineering • Computer Dept.",
    tab_login: "Sign In",
    tab_register: "Create Account",
    lbl_login_user: "Username:",
    lbl_login_pass: "Password:",
    lbl_reg_user: "New Username:",
    lbl_reg_user_placeholder: "Enter username...",
    lbl_reg_pass: "Password:",
    lbl_reg_confirm: "Confirm Password:",
    btn_login: "Sign In & Continue",
    btn_register: "Create Account & Activate",
    btn_guest: "🚀 Quick Guest Access Demo",

    // Audit Log
    audit_title: "Security Audit & Operations Log",
    audit_sub: "Comprehensive audit trail of cryptographic sessions, Kyber-768 encapsulates, and steganographic embeddings.",
    stat_total: "Total Actions",
    stat_encrypt: "Encryptions",
    stat_decrypt: "Decryptions",
    stat_keygen: "Key Generations",
    table_title: "User Cryptographic Audit Trail",
    filter_all: "All",
    filter_encrypt: "Encrypt",
    filter_decrypt: "Decrypt",
    filter_keygen: "Keygen",
    btn_refresh: "Refresh",
    btn_export: "Export",
    btn_clear: "Clear",
    th_time: "Timestamp",
    th_action: "Action & Type",
    th_details: "Package & Cipher Details",
    th_status: "Status & Verification",
    audit_empty: "No operations recorded yet for this account.",
  }
};

let currentLang = localStorage.getItem("fgp_lang") || "ar";

function initLanguageController() {
  const btnToggle = document.getElementById("btn-lang-toggle");
  const authLangBtns = document.querySelectorAll(".auth-lang-btn");

  function setLanguage(lang, notify = false) {
    currentLang = lang === "en" ? "en" : "ar";
    localStorage.setItem("fgp_lang", currentLang);
    document.documentElement.setAttribute("lang", currentLang);
    document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");

    const dict = I18N_DATA[currentLang];

    // Header & Navigation
    const langLabel = document.getElementById("lang-label");
    if (langLabel) langLabel.textContent = dict.lang_btn;

    const brandTitle = document.querySelector(".brand-title");
    if (brandTitle) brandTitle.textContent = dict.brand_title;

    const brandSub = document.querySelector(".brand-sub");
    if (brandSub) brandSub.textContent = dict.brand_sub;

    const gradBadge = document.querySelector(".header-left .badge-accent");
    if (gradBadge) gradBadge.textContent = dict.badge_grad;

    const tabInfo = document.querySelector('[data-target="section-info"]');
    if (tabInfo && tabInfo.childNodes.length > 2) tabInfo.childNodes[2].textContent = " " + dict.nav_info;

    const tabEnc = document.querySelector('[data-target="section-encrypt"]');
    if (tabEnc && tabEnc.childNodes.length > 2) tabEnc.childNodes[2].textContent = " " + dict.nav_encrypt;

    const tabDec = document.querySelector('[data-target="section-decrypt"]');
    if (tabDec && tabDec.childNodes.length > 2) tabDec.childNodes[2].textContent = " " + dict.nav_decrypt;

    const tabAudit = document.querySelector('#tab-audit span');
    if (tabAudit) tabAudit.textContent = dict.nav_audit;

    // Auth Gateway Modal
    const authBadge = document.getElementById("auth-badge-txt");
    if (authBadge) authBadge.textContent = dict.auth_badge;
    const authTitle = document.getElementById("auth-title-txt");
    if (authTitle) authTitle.textContent = dict.auth_title;
    const authSub = document.getElementById("auth-sub-txt");
    if (authSub) authSub.textContent = dict.auth_sub;
    const tabLogin = document.getElementById("tab-login-txt");
    if (tabLogin) tabLogin.textContent = dict.tab_login;
    const tabRegister = document.getElementById("tab-register-txt");
    if (tabRegister) tabRegister.textContent = dict.tab_register;
    const lblLoginUser = document.getElementById("lbl-login-user");
    if (lblLoginUser) lblLoginUser.textContent = dict.lbl_login_user;
    const lblLoginPass = document.getElementById("lbl-login-pass");
    if (lblLoginPass) lblLoginPass.textContent = dict.lbl_login_pass;
    const lblRegUser = document.getElementById("lbl-reg-user");
    if (lblRegUser) lblRegUser.textContent = dict.lbl_reg_user;
    const lblRegPass = document.getElementById("lbl-reg-pass");
    if (lblRegPass) lblRegPass.textContent = dict.lbl_reg_pass;
    const lblRegConfirm = document.getElementById("lbl-reg-confirm");
    if (lblRegConfirm) lblRegConfirm.textContent = dict.lbl_reg_confirm;
    const btnSubmitLogin = document.getElementById("btn-submit-login");
    if (btnSubmitLogin) btnSubmitLogin.textContent = dict.btn_login;
    const btnSubmitRegister = document.getElementById("btn-submit-register");
    if (btnSubmitRegister) btnSubmitRegister.textContent = dict.btn_register;
    const btnGuestLogin = document.getElementById("btn-guest-login");
    if (btnGuestLogin) btnGuestLogin.textContent = dict.btn_guest;

    // Audit Section Texts
    const auditTitle = document.getElementById("audit-hdr-title");
    if (auditTitle) auditTitle.textContent = dict.audit_title;
    const auditSub = document.getElementById("audit-hdr-sub");
    if (auditSub) auditSub.textContent = dict.audit_sub;
    const statTotal = document.getElementById("lbl-stat-total");
    if (statTotal) statTotal.textContent = dict.stat_total;
    const statEnc = document.getElementById("lbl-stat-encrypt");
    if (statEnc) statEnc.textContent = dict.stat_encrypt;
    const statDec = document.getElementById("lbl-stat-decrypt");
    if (statDec) statDec.textContent = dict.stat_decrypt;
    const statKey = document.getElementById("lbl-stat-keygen");
    if (statKey) statKey.textContent = dict.stat_keygen;
    const auditTblTitle = document.getElementById("audit-table-title");
    if (auditTblTitle) auditTblTitle.textContent = dict.table_title;
    const filterAll = document.getElementById("filter-all-btn");
    if (filterAll) filterAll.textContent = dict.filter_all;
    const filterEnc = document.getElementById("filter-enc-btn");
    if (filterEnc) filterEnc.textContent = dict.filter_encrypt;
    const filterDec = document.getElementById("filter-dec-btn");
    if (filterDec) filterDec.textContent = dict.filter_decrypt;
    const filterKey = document.getElementById("filter-key-btn");
    if (filterKey) filterKey.textContent = dict.filter_keygen;
    const btnRef = document.getElementById("btn-refresh-txt");
    if (btnRef) btnRef.textContent = dict.btn_refresh;
    const btnExp = document.getElementById("btn-export-txt");
    if (btnExp) btnExp.textContent = dict.btn_export;
    const btnClr = document.getElementById("btn-clear-txt");
    if (btnClr) btnClr.textContent = dict.btn_clear;
    const thTime = document.getElementById("th-time");
    if (thTime) thTime.textContent = dict.th_time;
    const thAct = document.getElementById("th-action");
    if (thAct) thAct.textContent = dict.th_action;
    const thDet = document.getElementById("th-details");
    if (thDet) thDet.textContent = dict.th_details;
    const thStat = document.getElementById("th-status");
    if (thStat) thStat.textContent = dict.th_status;
    const emptyTxt = document.getElementById("audit-empty-txt");
    if (emptyTxt) emptyTxt.textContent = dict.audit_empty;

    // Update active pill in auth modal
    authLangBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === currentLang);
    });

    if (notify) {
      showToast(currentLang === "ar" ? "تم التحويل إلى اللغة العربية" : "Switched to English", "info");
    }
  }

  // Initial language setup
  setLanguage(currentLang, false);

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const nextLang = currentLang === "ar" ? "en" : "ar";
      setLanguage(nextLang, true);
    });
  }

  authLangBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setLanguage(btn.dataset.lang, true);
    });
  });
}

/* ==========================================================================
   USER AUTHENTICATION GATEWAY (LOGIN & REGISTER)
   ========================================================================== */
function initAuthGateway() {
  const overlay = document.getElementById("auth-gateway-overlay");
  const pill = document.getElementById("user-session-pill");
  const sessionName = document.getElementById("user-session-name");
  const btnLogout = document.getElementById("btn-user-logout");
  const btnGuest = document.getElementById("btn-guest-login");

  const tabLogin = document.getElementById("tab-auth-login");
  const tabRegister = document.getElementById("tab-auth-register");
  const formLogin = document.getElementById("form-auth-login");
  const formRegister = document.getElementById("form-auth-register");
  const loginErr = document.getElementById("login-error-msg");
  const regErr = document.getElementById("reg-error-msg");

  function updateUserDisplay(username) {
    if (username) {
      if (sessionName) sessionName.textContent = username;
      if (pill) pill.classList.remove("hidden");
      if (overlay) overlay.classList.add("hidden");
    } else {
      if (pill) pill.classList.add("hidden");
      if (overlay) overlay.classList.remove("hidden");
    }
  }

  // Check saved user
  const savedUser = localStorage.getItem("fgp_auth_user");
  if (savedUser) {
    updateUserDisplay(savedUser);
  } else {
    updateUserDisplay(null);
  }

  // Tabs toggle
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener("click", () => {
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      formLogin.classList.remove("hidden");
      formRegister.classList.add("hidden");
      if (loginErr) loginErr.classList.add("hidden");
    });

    tabRegister.addEventListener("click", () => {
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      formRegister.classList.remove("hidden");
      formLogin.classList.add("hidden");
      if (regErr) regErr.classList.add("hidden");
    });
  }

  // Login submit
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      if (!u || !p) return;

      const fd = new FormData();
      fd.append("username", u);
      fd.append("password", p);

      try {
// Verify user from localStorage
        const stored = JSON.parse(localStorage.getItem(`fgp_user_${u}`));
        if (!stored) throw new Error(currentLang === "ar" ? "المستخدم غير موجود" : "User not found");
        if (stored.password !== p) throw new Error(currentLang === "ar" ? "كلمة المرور غير صحيحة" : "Incorrect password");
        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(`مرحباً بك مجدداً ${u}! تم تسجيل الدخول بنجاح`, "success");
        if (typeof loadAuditLogs === "function") loadAuditLogs();
      } catch (err) {
        if (loginErr) {
          loginErr.textContent = err.message;
          loginErr.classList.remove("hidden");
        }
      }
    });
  }

  // Register submit
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("reg-username").value.trim();
      const p = document.getElementById("reg-password").value;
      const cp = document.getElementById("reg-confirm-password").value;

      if (p !== cp) {
        if (regErr) {
          regErr.textContent = currentLang === "ar" ? "كلمتا المرور غير متطابقتين!" : "Passwords do not match!";
          regErr.classList.remove("hidden");
        }
        return;
      }

      const fd = new FormData();
      fd.append("username", u);
      fd.append("password", p);

      try {
// Save new user to localStorage
        localStorage.setItem(`fgp_user_${u}`, JSON.stringify({ password: p }));
        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(`تم إنشاء الحساب بنجاح! أهلاً بك يا ${u}`, "success");
        if (typeof loadAuditLogs === "function") loadAuditLogs();
      } catch (err) {
        if (regErr) {
          regErr.textContent = err.message;
          regErr.classList.remove("hidden");
        }
      }
    });
  }

  // Guest demo login
  if (btnGuest) {
    btnGuest.addEventListener("click", () => {
      const guestName = "Guest_" + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem("fgp_auth_user", guestName);
      updateUserDisplay(guestName);
      showToast(currentLang === "ar" ? `تم الدخول كضيف تجريبي: ${guestName}` : `Logged in as: ${guestName}`, "info");
      if (typeof loadAuditLogs === "function") loadAuditLogs();
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("fgp_auth_user");
      updateUserDisplay(null);
      showToast(currentLang === "ar" ? "تم تسجيل الخروج بنجاح" : "Logged out successfully", "info");
    });
  }
}

/* ==========================================================================
   ACTIVITY & SECURITY AUDIT LOG CONTROLLER
   ========================================================================== */
let allAuditLogs = [];
let currentAuditFilter = "all";

async function loadAuditLogs() {
  const username = getActiveUser();
  const tableBody = document.getElementById("audit-table-body");
  const emptyState = document.getElementById("audit-empty-state");

  try {
    const res = await fetch(`/api/audit/logs?username=${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    allAuditLogs = data.logs || [];

    // Update Stats
    const totalCount = allAuditLogs.length;
    const encCount = allAuditLogs.filter((l) => l.action === "encrypt").length;
    const decCount = allAuditLogs.filter((l) => l.action === "decrypt").length;
    const keyCount = allAuditLogs.filter((l) => l.action === "keygen").length;

    const elTotal = document.getElementById("audit-stat-total");
    if (elTotal) elTotal.textContent = totalCount;
    const elEnc = document.getElementById("audit-stat-encrypt");
    if (elEnc) elEnc.textContent = encCount;
    const elDec = document.getElementById("audit-stat-decrypt");
    if (elDec) elDec.textContent = decCount;
    const elKey = document.getElementById("audit-stat-keygen");
    if (elKey) elKey.textContent = keyCount;

    renderAuditTable();
  } catch (err) {
    console.error("Failed to load audit logs:", err);
  }
}

function renderAuditTable() {
  const tableBody = document.getElementById("audit-table-body");
  const emptyState = document.getElementById("audit-empty-state");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const filtered = allAuditLogs.filter((log) => {
    if (currentAuditFilter === "all") return true;
    return log.action === currentAuditFilter;
  });

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  filtered.forEach((log) => {
    const tr = document.createElement("tr");

    // Badge styling per action
    let badgeClass = "audit-badge-auth";
    let iconSvg = "⚡";
    if (log.action === "encrypt") {
      badgeClass = "audit-badge-encrypt";
      iconSvg = "🔒";
    } else if (log.action === "decrypt") {
      badgeClass = "audit-badge-decrypt";
      iconSvg = "🔓";
    } else if (log.action === "keygen") {
      badgeClass = "audit-badge-keygen";
      iconSvg = "⚛️";
    }

    const titleText = currentLang === "ar" ? log.title_ar : log.title_en;

    // Format Details HTML
    let detailsHtml = "";
    if (typeof log.details === "object") {
      const parts = [];
      if (log.details.filename) parts.push(`<strong>${log.details.filename}</strong>`);
      if (log.details.cipher) parts.push(`<span class="badge badge-accent">${log.details.cipher}</span>`);
      if (log.details.payload_size) parts.push(`حجم: ${log.details.payload_size}`);
      if (log.details.kyber_token_id) parts.push(`رمز كايبر: <code>${log.details.kyber_token_id}</code>`);
      if (log.details.algorithm) parts.push(`<code>${log.details.algorithm}</code>`);
      if (log.details.pk_length) parts.push(`مفتاح عام: ${log.details.pk_length}B`);
      if (log.details.signature_verified !== undefined) {
        parts.push(log.details.signature_verified ? '<span class="text-success">توقيع رقمي موثق ✓</span>' : 'بدون توقيع');
      }
      detailsHtml = parts.join(" &bull; ") || JSON.stringify(log.details);
    } else {
      detailsHtml = String(log.details);
    }

    const statusBadge =
      log.status === "success"
        ? '<span class="badge badge-success">ناجحة ✓</span>'
        : '<span class="badge badge-warning">فشل ⚠</span>';

    tr.innerHTML = `
      <td style="white-space: nowrap; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${log.created_at || "-"}</td>
      <td>
        <span class="audit-badge ${badgeClass}">${iconSvg} ${titleText}</span>
      </td>
      <td style="font-size: 0.82rem;">${detailsHtml}</td>
      <td style="white-space: nowrap;">${statusBadge}</td>
    `;

    tableBody.appendChild(tr);
  });
}

function initAuditLogSection() {
  const filterPills = document.querySelectorAll(".filter-pill");
  const btnRefresh = document.getElementById("btn-refresh-audit");
  const btnExport = document.getElementById("btn-export-audit");
  const btnClear = document.getElementById("btn-clear-audit");

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentAuditFilter = pill.dataset.filter;
      renderAuditTable();
    });
  });

  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadAuditLogs();
      showToast(currentLang === "ar" ? "تم تحديث سجل العمليات" : "Audit log refreshed", "info");
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allAuditLogs, null, 2));
      const dl = document.createElement("a");
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `security_audit_log_${getActiveUser()}.json`);
      dl.click();
      showToast(currentLang === "ar" ? "تم تصدير ملف سجل العمليات JSON بنجاح" : "Audit log exported to JSON", "success");
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", async () => {
      if (!confirm(currentLang === "ar" ? "هل أنت متأكد من رغبتك في مسح سجل العمليات؟" : "Are you sure you want to clear your audit log?")) {
        return;
      }
      const fd = new FormData();
      fd.append("username", getActiveUser());
      await fetch("/api/audit/clear", { method: "POST", body: fd });
      await loadAuditLogs();
      showToast(currentLang === "ar" ? "تم مسح سجل العمليات" : "Audit log cleared", "info");
    });
  }
}


