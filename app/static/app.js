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
  inboxSocket: null,
  lastIncomingTransmission: null,
  peerDirectory: [],
  unreadInboxCount: 0,
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
  initDropzones();

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

      // Clear pulse & unread badge if viewing channel/inbox
      if (targetId === "section-channel") {
        document.getElementById("channel-pulse").classList.add("hidden");
        state.unreadInboxCount = 0;
        const unreadBadge = document.getElementById("inbox-unread-count");
        if (unreadBadge) {
          unreadBadge.classList.add("hidden");
          unreadBadge.textContent = "0";
        }
        if (typeof loadDirectoryPeers === "function") loadDirectoryPeers();
        if (typeof loadInboxTransmissions === "function") loadInboxTransmissions();
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

      const btnPublishVault = document.getElementById("btn-publish-vault-pk");
      if (btnPublishVault) btnPublishVault.disabled = false;
      if (typeof publishCurrentIdentity === "function") {
        publishCurrentIdentity(false);
      }

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

  const btnPublishVault = document.getElementById("btn-publish-vault-pk");
  if (btnPublishVault) {
    btnPublishVault.addEventListener("click", async () => {
      btnPublishVault.disabled = true;
      btnPublishVault.textContent = "Publishing to Directory...";
      await publishCurrentIdentity(true);
      btnPublishVault.disabled = false;
      btnPublishVault.textContent = "🌐 نشر في الدليل العام";
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
      const btnPublishVault = document.getElementById("btn-publish-vault-pk");
      if (btnPublishVault) btnPublishVault.disabled = false;
      applyVaultKeysToForms();
      if (typeof publishCurrentIdentity === "function") {
        publishCurrentIdentity(false);
      }
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
    scanAndEnforceFinancialPolicy();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerClassification, 250);
  });

  fileInput.addEventListener("change", () => {
    updateStegoCapacity();
    scanAndEnforceFinancialPolicy();
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

      // If backend detects financial sensitivity, align interactive wizard
      if (data.security_intent && data.security_intent.recommended_cipher === "chacha20") {
        scanAndEnforceFinancialPolicy();
      }
    }
  } catch (e) {
    console.error("Classification error:", e);
  }
}

/* ==========================================================================
   5. INTERACTIVE SECURITY INTENT WIZARD & SENSITIVITY POLICIES
   ========================================================================== */
function initInteractiveWizard() {
  const objectiveRadios = document.querySelectorAll('input[name="wizard_objective"]');
  const sensitivityRadios = document.querySelectorAll('input[name="wizard_sensitivity"]');
  const banner = document.getElementById("smart-enforce-banner");
  const secRecipient = document.getElementById("encrypt-section-recipient-pk");
  const secCover = document.getElementById("encrypt-section-cover-image");
  const secCipher = document.getElementById("encrypt-section-cipher-choice");
  const btnEncrypt = document.getElementById("btn-execute-encrypt");

  function updateObjectiveUI(val) {
    objectiveRadios.forEach((r) => {
      const box = r.closest(".wizard-radio-box");
      if (box) box.classList.toggle("active", r.value === val);
    });

    if (val === "dsa_only") {
      if (secRecipient) secRecipient.classList.add("hidden");
      if (secCover) secCover.classList.add("hidden");
      if (secCipher) secCipher.classList.add("hidden");
      if (btnEncrypt) btnEncrypt.textContent = "✍️ توليد توقيع رقمي فقط (Generate Standalone DSA Signature)";
    } else if (val === "direct_pqc") {
      if (secRecipient) secRecipient.classList.remove("hidden");
      if (secCover) secCover.classList.add("hidden");
      if (secCipher) secCipher.classList.remove("hidden");
      if (btnEncrypt) btnEncrypt.textContent = "⚡ تشفير كايبر كمومي مباشر (Direct PQC Encryption)";
    } else {
      // full_hybrid
      if (secRecipient) secRecipient.classList.remove("hidden");
      if (secCover) secCover.classList.remove("hidden");
      if (secCipher) secCipher.classList.remove("hidden");
      if (btnEncrypt) btnEncrypt.textContent = "🛡️ تشفير هجين وإخفاء تكيفي (Hybrid Encryption & Stego)";
    }
  }

  function updateSensitivityUI(val, autoTriggered = false) {
    sensitivityRadios.forEach((r) => {
      const box = r.closest(".wizard-radio-box");
      if (box) box.classList.toggle("active", r.value === val);
    });

    if (val === "financial_critical") {
      if (banner) banner.classList.remove("hidden");
      const chachaRadio = document.querySelector('input[name="cipher_choice"][value="chacha20"]');
      if (chachaRadio) chachaRadio.checked = true;
      if (autoTriggered) {
        showToast("Auto-selected ChaCha20-Poly1305 for financial data (side-channel protection).", "info");
      }
    } else {
      if (banner && !checkLiveFinancialContent()) {
        banner.classList.add("hidden");
      }
    }
  }

  objectiveRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      updateObjectiveUI(e.target.value);
    });
  });

  sensitivityRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      updateSensitivityUI(e.target.value, false);
    });
  });

  // Initialize defaults
  const initialObj = document.querySelector('input[name="wizard_objective"]:checked')?.value || "full_hybrid";
  updateObjectiveUI(initialObj);
  const initialSens = document.querySelector('input[name="wizard_sensitivity"]:checked')?.value || "confidential_text";
  updateSensitivityUI(initialSens, false);
}

function checkLiveFinancialContent() {
  const textVal = document.getElementById("encrypt-text")?.value || "";
  const fileInput = document.getElementById("encrypt-file");
  const fileName = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0].name : "";
  const combined = textVal + " " + fileName;

  const FINANCIAL_REGEX = /\b(?:\d[ -]*?){13,19}\b|(?:credit[\s_-]?card|visa|mastercard|amex|cvv|iban|swift|pin\s*code|private[\s_-]?key|password|seed[\s_-]?phrase|حساب[\s_]?بنكي|بطاقة[\s_]?ائتمان|كلمة[\s_]?مرور)/i;
  return FINANCIAL_REGEX.test(combined);
}

function scanAndEnforceFinancialPolicy() {
  if (checkLiveFinancialContent()) {
    const finRadio = document.querySelector('input[name="wizard_sensitivity"][value="financial_critical"]');
    if (finRadio && !finRadio.checked) {
      finRadio.checked = true;
      const allSens = document.querySelectorAll('input[name="wizard_sensitivity"]');
      allSens.forEach((r) => {
        const box = r.closest(".wizard-radio-box");
        if (box) box.classList.toggle("active", r.value === "financial_critical");
      });
    }
    const banner = document.getElementById("smart-enforce-banner");
    if (banner) banner.classList.remove("hidden");

    const chachaRadio = document.querySelector('input[name="cipher_choice"][value="chacha20"]');
    if (chachaRadio && !chachaRadio.checked) {
      chachaRadio.checked = true;
      showToast("Financial data detected! Auto-enforcing ChaCha20-Poly1305 (Constant-Time ARX).", "info");
    }
  }
}

/* ==========================================================================
   6. ENCRYPTION PIPELINE (SENDER)
   ========================================================================== */
function initEncryptSection() {
  initInteractiveWizard();

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

  // Peer Picker & SAS Safety Number in Encrypt section
  const peerSelect = document.getElementById("encrypt-peer-select");
  const btnRefreshPeers = document.getElementById("btn-refresh-peers-encrypt");

  if (peerSelect) {
    peerSelect.addEventListener("change", async () => {
      const selectedUser = peerSelect.value;
      if (!selectedUser) {
        document.getElementById("peer-safety-badge")?.classList.add("hidden");
        const srcBadge = document.getElementById("pk-source-badge");
        if (srcBadge) srcBadge.textContent = "إدخال يدوي أو تلقائي";
        return;
      }

      // Auto-populate recipient PK from directory cache
      const peer = state.peerDirectory.find((p) => p.username === selectedUser);
      if (peer && peer.kyber_pk_b64) {
        document.getElementById("encrypt-recipient-pk").value = peer.kyber_pk_b64;
        const srcBadge = document.getElementById("pk-source-badge");
        if (srcBadge) srcBadge.textContent = `محمل من دليل النظراء (@${selectedUser})`;
      }

      // Calculate mutual cryptographic safety number
      if (typeof updateMutualSafetyNumber === "function") {
        await updateMutualSafetyNumber(selectedUser);
      }
    });
  }

  if (btnRefreshPeers) {
    btnRefreshPeers.addEventListener("click", async () => {
      if (typeof loadDirectoryPeers === "function") {
        await loadDirectoryPeers();
        showToast("تم تحديث قائمة النظراء المسجلين", "info");
      }
    });
  }

  btnEncrypt.addEventListener("click", async () => {
    const isFile = document.getElementById("tab-input-file").classList.contains("active");
    const textVal = document.getElementById("encrypt-text").value;
    const fileInput = document.getElementById("encrypt-file");
    const pkVal = document.getElementById("encrypt-recipient-pk").value.trim();
    const cipherChoice = document.querySelector('input[name="cipher_choice"]:checked')?.value || "chacha20";
    const overrideVal = document.getElementById("encrypt-override").value;
    const channelRoomVal = document.getElementById("channel-room-input")?.value?.trim() || "";
    const wizardObjective = document.querySelector('input[name="wizard_objective"]:checked')?.value || "full_hybrid";
    const wizardSensitivity = document.querySelector('input[name="wizard_sensitivity"]:checked')?.value || "confidential_text";

    if (isFile && fileInput.files.length === 0) {
      showToast("Please select a file to process.", "error");
      return;
    }

    if (!isFile && !textVal.trim()) {
      showToast("Please enter text payload to process.", "error");
      return;
    }

    // Branch 1: Standalone Digital Signature Only (ECDSA P-256)
    if (wizardObjective === "dsa_only") {
      btnEncrypt.disabled = true;
      btnEncrypt.textContent = "Signing with ECDSA P-256...";

      const formData = new FormData();
      if (isFile) {
        formData.append("file", fileInput.files[0]);
      } else {
        formData.append("text", textVal);
      }
      formData.append("username", getActiveUser());

      try {
        const res = await fetch("/api/sign_only", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Signing failed");
        }

        const result = await res.json();
        renderDsaResult(result);
        showToast("Digital signature generated successfully!", "success");

        if (typeof logClientAction === "function") {
          logClientAction("SIGN_ONLY", {
            sha256: result.data_sha256,
            payload_size: result.payload_size
          });
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      } finally {
        btnEncrypt.disabled = false;
        btnEncrypt.textContent = "✍️ توليد توقيع رقمي فقط (Generate Standalone DSA Signature)";
      }
      return;
    }

    // Direct PQC and Full Hybrid need Recipient ML-KEM-768 Public Key
    if (!pkVal) {
      showToast("Recipient Kyber-768 Public Key is required!", "error");
      return;
    }

    // Full Hybrid: Proactive Capacity Verification
    if (wizardObjective === "full_hybrid" && currentUploadedCover && !lastCalculatedCapacity.isSufficient) {
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

    if (wizardObjective === "full_hybrid" && coverInput && coverInput.files.length > 0) {
      formData.append("cover_image", coverInput.files[0]);
    }

    const recipientPeer = document.getElementById("encrypt-peer-select")?.value || "";
    if (recipientPeer) {
      formData.append("recipient_username", recipientPeer);
    }
    formData.append("recipient_kyber_pk_b64", pkVal);
    formData.append("preferred_cipher", cipherChoice);
    if (overrideVal) formData.append("override_type", overrideVal);
    if (channelRoomVal) formData.append("channel_room", channelRoomVal);
    formData.append("username", getActiveUser());
    formData.append("intent_objective", wizardObjective);
    formData.append("intent_sensitivity", wizardSensitivity);

    btnEncrypt.disabled = true;
    btnEncrypt.textContent = wizardObjective === "direct_pqc" ? "Encapsulating Kyber-768 & Encrypting..." : "Processing Multi-Level Pipeline...";

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

      if (wizardObjective === "direct_pqc" || result.mode === "direct_pqc") {
        renderDirectPqcResult(result);
        showToast("Direct PQC ciphertext package generated!", "success");
        if (typeof logClientAction === "function") {
          logClientAction("ENCRYPT_DIRECT_PQC", {
            cipher: cipherChoice,
            payload_size: result.payload_size
          });
        }
      } else {
        renderEncryptionResult(result);
        showToast("Encryption and adaptive steganographic embedding completed!", "success");
        if (typeof logClientAction === "function") {
          logClientAction("ENCRYPT_HYBRID_STEGO", {
            cipher: cipherChoice,
            payload_size: result.payload_size,
            stego_size: result.stego_size
          });
        }
      }

      if (recipientPeer) {
        showToast(
          currentLang === "ar"
            ? `تم إرسال الحزمة المشفرة مباشرة إلى صندوق @${recipientPeer} بنجاح!`
            : `Encrypted transmission dispatched directly to @${recipientPeer}'s inbox!`,
          "success"
        );
      }

      if (channelRoomVal) {
        showToast(`Payload broadcasted to channel room: ${channelRoomVal}`, "info");
      }
    } catch (e) {
      showToast("Error: " + e.message, "error");
    } finally {
      btnEncrypt.disabled = false;
      if (wizardObjective === "direct_pqc") {
        btnEncrypt.textContent = "⚡ تشفير كايبر كمومي مباشر (Direct PQC Encryption)";
      } else {
        btnEncrypt.textContent = "🛡️ تشفير هجين وإخفاء تكيفي (Hybrid Encryption & Stego)";
      }
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
  const dsaCard = document.getElementById("result-dsa-card");
  if (dsaCard) dsaCard.classList.add("hidden");
  const pqcCard = document.getElementById("result-direct-pqc-card");
  if (pqcCard) pqcCard.classList.add("hidden");

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

function renderDsaResult(result) {
  document.getElementById("encrypt-placeholder").classList.add("hidden");
  document.getElementById("encrypt-results-container").classList.add("hidden");
  const pqcCard = document.getElementById("result-direct-pqc-card");
  if (pqcCard) pqcCard.classList.add("hidden");

  const dsaCard = document.getElementById("result-dsa-card");
  dsaCard.classList.remove("hidden");

  document.getElementById("dsa-sha256-val").value = result.data_sha256 || "";
  document.getElementById("dsa-sig-val").value = result.dsa_signature_b64 || "";
  document.getElementById("dsa-pubkey-val").value = result.public_key_pem || "";

  const receiptJson = JSON.stringify(result.audit_receipt || result, null, 2);
  const btnDl = document.getElementById("btn-download-sig-receipt");
  if (btnDl) {
    btnDl.onclick = (e) => {
      e.preventDefault();
      downloadBlob(receiptJson, "signature_receipt.sig.json", "application/json");
    };
  }

  const btnCopy = document.getElementById("btn-copy-sig");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(result.dsa_signature_b64 || "");
      showToast("Digital Signature copied to clipboard!", "success");
    };
  }
}

function renderDirectPqcResult(result) {
  document.getElementById("encrypt-placeholder").classList.add("hidden");
  document.getElementById("encrypt-results-container").classList.add("hidden");
  const dsaCard = document.getElementById("result-dsa-card");
  if (dsaCard) dsaCard.classList.add("hidden");

  const pqcCard = document.getElementById("result-direct-pqc-card");
  pqcCard.classList.remove("hidden");

  const pkg = result.direct_pqc_package || result;
  document.getElementById("direct-ct-val").value = pkg.data_ciphertext_b64 || "";
  document.getElementById("direct-kyber-val").value = pkg.kyber_ciphertext_b64 || "";

  const pkgJson = JSON.stringify(pkg, null, 2);
  const btnDl = document.getElementById("btn-download-direct-pqc");
  if (btnDl) {
    btnDl.onclick = (e) => {
      e.preventDefault();
      downloadBlob(pkgJson, "direct_pqc_package.json", "application/json");
    };
  }

  const btnCopy = document.getElementById("btn-copy-direct-pqc");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(pkg.data_ciphertext_b64 || "");
      showToast("Direct PQC Ciphertext copied to clipboard!", "success");
    };
  }
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
   6. DIRECT PEER INBOX & PUBLIC DIRECTORY CONTROLLER
   ========================================================================== */
function initChannelSection() {
  const btnRepublish = document.getElementById("btn-republish-identity");
  const btnRefreshDir = document.getElementById("btn-refresh-peers-dir");
  const searchInput = document.getElementById("peer-search-input");
  const btnRefreshInbox = document.getElementById("btn-refresh-inbox");
  const btnClearInbox = document.getElementById("btn-clear-inbox");

  // Legacy channel elements
  const btnJoin = document.getElementById("btn-join-channel");
  const roomInput = document.getElementById("channel-room-input");
  const btnTransfer = document.getElementById("btn-load-incoming-to-decrypt");

  if (btnRepublish) {
    btnRepublish.addEventListener("click", async () => {
      btnRepublish.disabled = true;
      await publishCurrentIdentity(true);
      btnRepublish.disabled = false;
    });
  }

  if (btnRefreshDir) {
    btnRefreshDir.addEventListener("click", async () => {
      await loadDirectoryPeers();
      showToast(currentLang === "ar" ? "تم تحديث دليل النظراء" : "Peer directory refreshed", "info");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      document.querySelectorAll(".peer-card").forEach((card) => {
        const text = card.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  if (btnRefreshInbox) {
    btnRefreshInbox.addEventListener("click", async () => {
      await loadInboxTransmissions();
      showToast(currentLang === "ar" ? "تم تحديث صندوق الرسائل" : "Inbox refreshed", "info");
    });
  }

  if (btnClearInbox) {
    btnClearInbox.addEventListener("click", async () => {
      if (!confirm(currentLang === "ar" ? "هل أنت متأكد من مسح جميع الرسائل المستلمة في صندوقك؟" : "Clear all received transmissions in your inbox?")) {
        return;
      }
      await clearInboxTransmissions();
    });
  }

  // Legacy channel room
  if (btnJoin && roomInput) {
    btnJoin.addEventListener("click", () => {
      const roomId = roomInput.value.trim();
      if (!roomId) return;
      connectToChannel(roomId);
    });
  }

  if (btnTransfer) {
    btnTransfer.addEventListener("click", () => {
      if (!state.lastIncomingTransmission) return;
      loadTransmissionIntoDecrypt(state.lastIncomingTransmission);
    });
  }

  // Initial load
  loadDirectoryPeers();
  loadInboxTransmissions();
  connectInboxWebSocket(getActiveUser());
}

async function publishCurrentIdentity(notify = false) {
  const username = getActiveUser();
  if (!username) return;

  // Ensure we have local keys
  if (!state.localKeys.pk) {
    const pk = localStorage.getItem("kyber_pk");
    if (pk) state.localKeys.pk = pk;
  }

  if (!state.localKeys.pk) return;

  try {
    const fd = new FormData();
    fd.append("username", username);
    fd.append("kyber_pk_b64", state.localKeys.pk);

    const res = await fetch("/api/directory/publish", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Failed to publish identity");
    const data = await res.json();

    const fp = data.kyber_fingerprint || "----";
    const avatarEl = document.getElementById("my-identity-avatar");
    const userEl = document.getElementById("my-identity-username");
    const fpEl = document.getElementById("my-identity-fingerprint");

    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
    if (userEl) userEl.textContent = `@${username}`;
    if (fpEl) fpEl.textContent = fp;

    // Refresh peer lists
    await loadDirectoryPeers();

    if (notify) {
      showToast(
        currentLang === "ar"
          ? `تم تحديث ونشر مفتاح @${username} العام في الدليل بنجاح (${fp})`
          : `Identity published to directory (@${username} • ${fp})`,
        "success"
      );
    }
  } catch (err) {
    console.warn("Could not publish identity:", err);
  }
}

async function loadDirectoryPeers() {
  const container = document.getElementById("peer-directory-list");
  const peerSelect = document.getElementById("encrypt-peer-select");
  const myUser = getActiveUser();

  try {
    const res = await fetch("/api/directory/peers");
    if (!res.ok) throw new Error("Could not fetch peers");
    const data = await res.json();
    state.peerDirectory = data.peers || [];

    // 1. Populate Dropdown in Encrypt Tab
    if (peerSelect) {
      const curVal = peerSelect.value;
      peerSelect.innerHTML = `<option value="">-- ${currentLang === "ar" ? "اختر النظير المستلم من الدليل العام" : "Select Peer from Directory"} --</option>`;
      state.peerDirectory.forEach((peer) => {
        if (peer.username !== myUser) {
          const opt = document.createElement("option");
          opt.value = peer.username;
          opt.textContent = `@${peer.username} ${peer.online ? "🟢" : "⚪"} (${peer.fingerprint || ""})`;
          if (opt.value === curVal) opt.selected = true;
          peerSelect.appendChild(opt);
        }
      });
    }

    // 2. Populate Directory Cards
    if (container) {
      const otherPeers = state.peerDirectory.filter((p) => p.username !== myUser);
      if (otherPeers.length === 0) {
        container.innerHTML = `
          <div class="inbox-empty-box" style="padding: 1.5rem 1rem;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <h4 style="font-size: 0.88rem; margin: 0.3rem 0;">${currentLang === "ar" ? "لا يوجد نظراء آخرون حالياً" : "No other peers registered"}</h4>
            <p style="font-size: 0.74rem;">${currentLang === "ar" ? "يمكنك فتح نافذة تصفح خاصة وتسجيل حساب جديد لاختبار الإرسال المباشر بين الطرفين." : "Open a private browsing window to register a second user and test direct PQC delivery."}</p>
          </div>
        `;
        return;
      }

      container.innerHTML = "";
      otherPeers.forEach((peer) => {
        const card = document.createElement("div");
        card.className = "peer-card";
        card.innerHTML = `
          <div class="peer-card-left">
            <div class="peer-avatar">
              ${peer.username.charAt(0).toUpperCase()}
              <span class="peer-status-dot ${peer.online ? "online" : "offline"}" title="${peer.online ? "متصل الآن (Online)" : "غير متصل (Offline)"}"></span>
            </div>
            <div class="peer-info">
              <div class="peer-username-row">
                <span class="peer-username">@${peer.username}</span>
                <span class="badge badge-subtle badge-xs">${peer.online ? "نشط" : "أوفلاين"}</span>
              </div>
              <div class="peer-fp-text">
                FP: <code>${peer.fingerprint || "----"}</code>
              </div>
            </div>
          </div>
          <div class="peer-card-actions">
            <button class="btn btn-secondary btn-xs btn-peer-sas" data-user="${peer.username}" title="${currentLang === "ar" ? "عرض الرقم الأمني المشترك (SAS)" : "Mutual SAS Safety Number"}">
              🔢 SAS
            </button>
            <button class="btn btn-primary btn-xs btn-peer-send" data-user="${peer.username}" title="${currentLang === "ar" ? "إرسال حزمة مشفرة لهذا النظير" : "Send transmission"}">
              ✉️ ${currentLang === "ar" ? "إرسال" : "Send"}
            </button>
          </div>
        `;

        // Bind Send action
        card.querySelector(".btn-peer-send").addEventListener("click", () => {
          selectPeerForSend(peer.username);
        });

        // Bind SAS action
        card.querySelector(".btn-peer-sas").addEventListener("click", async () => {
          await showPeerSasDialog(peer.username);
        });

        container.appendChild(card);
      });
    }
  } catch (err) {
    console.warn("loadDirectoryPeers error:", err);
  }
}

function selectPeerForSend(peerUsername) {
  // Switch to Encrypt Tab
  const tab = document.querySelector('.nav-tab[data-target="section-encrypt"]');
  if (tab) tab.click();

  // Set dropdown
  const select = document.getElementById("encrypt-peer-select");
  if (select) {
    select.value = peerUsername;
    select.dispatchEvent(new Event("change"));
  }

  // Scroll to input
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(
    currentLang === "ar"
      ? `تم اختيار النظير @${peerUsername} وتحميل مفتاح كايبر العام الخاص به تلقائياً`
      : `Selected @${peerUsername}. Recipient Kyber-768 PK loaded.`,
    "info"
  );
}

async function updateMutualSafetyNumber(peerUsername) {
  const badge = document.getElementById("peer-safety-badge");
  const digitsEl = document.getElementById("peer-sas-digits");
  const emojisEl = document.getElementById("peer-sas-emojis");
  const myUser = getActiveUser();

  if (!badge) return;

  if (!peerUsername) {
    badge.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(`/api/directory/safety_number?user_a=${encodeURIComponent(myUser)}&user_b=${encodeURIComponent(peerUsername)}`);
    if (!res.ok) throw new Error("Could not calculate SAS");
    const data = await res.json();

    if (digitsEl) digitsEl.textContent = data.digits || "--- ---";
    if (emojisEl) emojisEl.textContent = data.emojis || "🔒 🛡️ 🔑 ⚛️";
    badge.classList.remove("hidden");
  } catch (err) {
    badge.classList.add("hidden");
  }
}

async function showPeerSasDialog(peerUsername) {
  const myUser = getActiveUser();
  try {
    const res = await fetch(`/api/directory/safety_number?user_a=${encodeURIComponent(myUser)}&user_b=${encodeURIComponent(peerUsername)}`);
    if (!res.ok) throw new Error("Failed to compute SAS");
    const data = await res.json();
    alert(
      currentLang === "ar"
        ? `🔐 الرقم الأمني المشترك (SAS Safety Number):\n\nبينك (@${myUser}) وبين (@${peerUsername}):\nالأرقام: ${data.digits}\nالرموز: ${data.emojis}\n\nتطابق هذه الأرقام لدى الطرفين يثبت رياضياً عدم وجود أي وسيط أو هجوم MITM على مفاتيح كايبر.`
        : `🔐 Cryptographic Safety Number (Mutual SAS):\n\nBetween @${myUser} and @${peerUsername}:\nDigits: ${data.digits}\nEmojis: ${data.emojis}\n\nComparing these values ensures mutual identity and mathematical protection against Man-in-the-Middle attacks.`
    );
  } catch (e) {
    showToast("Error computing safety number: " + e.message, "error");
  }
}

function connectInboxWebSocket(username) {
  if (!username) return;

  if (state.inboxSocket) {
    try { state.inboxSocket.close(); } catch (e) {}
    state.inboxSocket = null;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/inbox/${encodeURIComponent(username)}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    const statusEl = document.getElementById("my-inbox-ws-status");
    if (statusEl) {
      statusEl.textContent = currentLang === "ar" ? "متصل بالبث المباشر" : "Push Active";
      statusEl.className = "badge badge-success badge-xs";
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "new_inbox_item" && data.item) {
        state.unreadInboxCount++;
        const badge = document.getElementById("inbox-unread-count");
        if (badge) {
          badge.textContent = state.unreadInboxCount;
          badge.classList.remove("hidden");
        }
        document.getElementById("channel-pulse")?.classList.remove("hidden");

        const sender = data.item.sender || "Anonymous";
        showToast(
          currentLang === "ar"
            ? `⚡ استلمت حزمة مشفرة جديدة مباشرة من @${sender}!`
            : `⚡ New encrypted transmission received from @${sender}!`,
          "warning"
        );

        loadInboxTransmissions();
      }
    } catch (e) {
      console.warn("Inbox ws message error:", e);
    }
  };

  ws.onclose = () => {
    const statusEl = document.getElementById("my-inbox-ws-status");
    if (statusEl) {
      statusEl.textContent = currentLang === "ar" ? "غير متصل" : "Disconnected";
      statusEl.className = "badge badge-subtle badge-xs";
    }
  };

  state.inboxSocket = ws;
}

async function loadInboxTransmissions() {
  const container = document.getElementById("inbox-transmissions-list");
  const countBadge = document.getElementById("inbox-header-count");
  const emptyBox = document.getElementById("inbox-empty-box");
  const username = getActiveUser();

  if (!username) return;

  try {
    const res = await fetch(`/api/inbox/list?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("Failed to load inbox");
    const data = await res.json();
    const items = data.items || [];

    if (countBadge) {
      countBadge.textContent = `${items.length} ${currentLang === "ar" ? "حزم" : "items"}`;
    }

    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = "";
      if (emptyBox) {
        emptyBox.classList.remove("hidden");
        container.appendChild(emptyBox);
      }
      return;
    }

    if (emptyBox) emptyBox.classList.add("hidden");
    container.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "inbox-trans-item unread";

      const isStego = item.mode === "full_hybrid" || !!item.stego_image_b64;
      const modeLabel = isStego
        ? (currentLang === "ar" ? "🛡️ حماية هجينة وإخفاء تكيفي (Hybrid Stego)" : "🛡️ Hybrid Stego Carrier")
        : (currentLang === "ar" ? "⚡ تشفير كمومي مباشر (Direct PQC)" : "⚡ Direct PQC Ciphertext");

      const thumbHtml = item.stego_image_b64
        ? `<img class="inbox-carrier-thumb" src="data:image/png;base64,${item.stego_image_b64}" alt="Carrier Thumbnail">`
        : `<div class="inbox-carrier-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-canvas);font-size:1.3rem;">⚛️</div>`;

      card.innerHTML = `
        <div class="inbox-item-head">
          <div class="inbox-sender-row">
            <span class="badge badge-primary badge-xs">من / From</span>
            <span class="inbox-sender-name">@${item.sender || "Anonymous"}</span>
            <span class="badge badge-accent badge-xs">${modeLabel}</span>
          </div>
          <span class="inbox-item-time">${item.timestamp || ""}</span>
        </div>

        <div class="inbox-item-body">
          ${thumbHtml}
          <div class="inbox-item-details">
            <div class="inbox-meta-line">
              <span>${currentLang === "ar" ? "الملف / المحتوى:" : "Filename / Type:"}</span>
              <strong>${item.filename || "payload.dat"}</strong>
            </div>
            <div class="inbox-meta-line">
              <span>${currentLang === "ar" ? "حجم الحمولة المشفرة:" : "Payload Size:"}</span>
              <strong>${item.payload_size || 0} Bytes</strong>
              <span>&bull;</span>
              <span>${currentLang === "ar" ? "الخوارزمية:" : "Cipher:"}</span>
              <strong>${(item.cipher_used || "ChaCha20").toUpperCase()}</strong>
            </div>
            <div class="inbox-meta-line">
              <span>${currentLang === "ar" ? "معيار التبادل الكمومي:" : "PQC Exchange:"}</span>
              <strong class="text-success">NIST FIPS 203 ML-KEM-768</strong>
            </div>
          </div>
        </div>

        <div class="inbox-item-actions">
          <button class="btn btn-primary btn-sm btn-inbox-decrypt">
            🔓 ${currentLang === "ar" ? "فك التشفير والاستخراج فوراً (1-Click Decrypt)" : "1-Click Decapsulate & Decrypt"}
          </button>
          <button class="btn btn-secondary btn-xs btn-inbox-delete" title="${currentLang === "ar" ? "حذف الحزمة" : "Delete"}">
            🗑️
          </button>
        </div>
      `;

      // 1-Click Decrypt
      card.querySelector(".btn-inbox-decrypt").addEventListener("click", async () => {
        await executeInboxItemDecrypt(item);
      });

      // Delete
      card.querySelector(".btn-inbox-delete").addEventListener("click", async () => {
        await deleteInboxItem(item.id);
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.warn("loadInboxTransmissions error:", err);
  }
}

async function executeInboxItemDecrypt(item) {
  // Check local secret key
  const sk = state.localKeys.sk || localStorage.getItem("kyber_sk");
  if (!sk) {
    showToast(
      currentLang === "ar"
        ? "مفتاح فك التشفير السري (ML-KEM-768 SK) غير متوفر في جهازك! يرجى توليده أو تحميله في خزنة المفاتيح."
        : "Local Kyber secret key not found! Please generate or load it in Key Vault.",
      "error"
    );
    document.getElementById("btn-open-vault")?.click();
    return;
  }

  // Branch 1: Direct PQC (without Stego)
  if (item.mode === "direct_pqc") {
    const pkg = item.direct_pqc_package || item.direct_result || {};
    const ctB64 = pkg.ciphertext_b64 || item.ciphertext_b64;
    const nonceB64 = pkg.nonce_b64 || item.nonce_b64;
    const kyberCt = pkg.kyber_ciphertext_b64 || item.kyber_ciphertext_b64;
    const cipherUsed = pkg.cipher_used || item.cipher_used || "chacha20";

    if (!ctB64 || !nonceB64 || !kyberCt) {
      showToast("حزمة التشفير الكمومي المباشر غير مكتملة المعطيات", "error");
      return;
    }

    try {
      showToast(currentLang === "ar" ? "جاري فك تشفير حزمة كايبر في الوقت الثابت..." : "Decapsulating Kyber-768...", "info");
      const fd = new FormData();
      fd.append("ciphertext_b64", ctB64);
      fd.append("nonce_b64", nonceB64);
      fd.append("kyber_ciphertext_b64", kyberCt);
      fd.append("recipient_kyber_sk_b64", sk);
      fd.append("cipher_used", cipherUsed);
      fd.append("username", getActiveUser());

      const res = await fetch("/api/decrypt_direct", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Decryption failed");
      }

      const result = await res.json();

      // Switch to Decrypt tab & render
      document.querySelector('.nav-tab[data-target="section-decrypt"]')?.click();
      renderDecryptionResult({
        status: "success",
        is_text: result.is_text,
        text_preview: result.text_preview,
        data_b64: result.data_b64,
        filename: result.filename || item.filename || "recovered_secret.txt",
        data_type: result.data_type || "sensitive_credential",
        cipher_used: result.cipher_used || cipherUsed,
        signature_verified: true
      });

      showToast(
        currentLang === "ar"
          ? `تم فك تشفير الحزمة بنجاح واستخراج المحتوى السري المرسل من @${item.sender}!`
          : `Package from @${item.sender} successfully decapsulated and decrypted!`,
        "success"
      );
    } catch (e) {
      showToast("Direct PQC Decryption error: " + e.message, "error");
    }
    return;
  }

  // Branch 2: Full Hybrid Stego
  loadTransmissionIntoDecrypt(item);
  document.getElementById("btn-execute-decrypt")?.click();
  showToast(
    currentLang === "ar"
      ? `جاري استخراج وفك تشفير حزمة الإخفاء التكيفي المستلمة من @${item.sender}...`
      : `Unpacking and decrypting stego package from @${item.sender}...`,
    "info"
  );
}

function loadTransmissionIntoDecrypt(trans) {
  state.lastIncomingTransmission = trans;

  // Populate Decrypt Form
  const ctInput = document.getElementById("decrypt-kyber-ct");
  if (ctInput) ctInput.value = trans.kyber_ciphertext_b64 || "";

  const skInput = document.getElementById("decrypt-kyber-sk");
  if (skInput && state.localKeys.sk) skInput.value = state.localKeys.sk;

  if (trans.stego_image_b64) {
    const previewBox = document.getElementById("decrypt-image-preview-box");
    const previewImg = document.getElementById("decrypt-image-preview");
    if (previewImg) previewImg.src = `data:image/png;base64,${trans.stego_image_b64}`;
    if (previewBox) previewBox.classList.remove("hidden");
  }

  // Switch Tab to Decrypt
  document.querySelector('.nav-tab[data-target="section-decrypt"]')?.click();
}

async function deleteInboxItem(txId) {
  try {
    const fd = new FormData();
    fd.append("username", getActiveUser());
    fd.append("transmission_id", txId);

    const res = await fetch("/api/inbox/delete", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Delete failed");
    await loadInboxTransmissions();
    showToast(currentLang === "ar" ? "تم حذف الحزمة من الصندوق" : "Transmission deleted", "info");
  } catch (err) {
    showToast("Error deleting item: " + err.message, "error");
  }
}

async function clearInboxTransmissions() {
  try {
    const fd = new FormData();
    fd.append("username", getActiveUser());

    const res = await fetch("/api/inbox/clear", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Clear failed");
    await loadInboxTransmissions();
    showToast(currentLang === "ar" ? "تم تفريغ صندوق البريد بالكامل" : "Inbox cleared", "info");
  } catch (err) {
    showToast("Error clearing inbox: " + err.message, "error");
  }
}

// Legacy channel room connection
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
        document.getElementById("channel-pulse")?.classList.remove("hidden");
        document.getElementById("incoming-alert-box")?.classList.remove("hidden");
        const inDesc = document.getElementById("incoming-desc");
        if (inDesc) {
          inDesc.textContent = `Received from room ${data.room_id}: ${data.filename || "data"} (${data.payload_size} bytes)`;
        }

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
  if (!logBox) return;
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
    nav_channel: "صندوق البريد والنظراء",
    nav_inbox: "صندوق البريد والنظراء",
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

    // Dropzone Strings
    lbl_upload_payload: "رفع ملف (مستندات، بيانات، أو ملفات ثنائية):",
    dropzone_payload_cta: "اسحب وأفلت ملف البيانات هنا",
    dropzone_payload_browse: "تصفح من جهازك",
    dropzone_payload_hint: "يدعم المستندات، الملفات الثنائية، والبيانات بجميع الصيغ (PDF, DOCX, TXT, ZIP, BIN...) • فحص وتشفير آلي",
    dropzone_payload_overlay: "أفلت الملف هنا فوراً للتحميل...",
    lbl_cover_image: "صورة الغلاف الحاملة (Carrier Cover Image):",
    dropzone_cover_cta: "اسحب وأفلت صورة الغلاف الحاملة",
    dropzone_cover_browse: "اختر صورة",
    dropzone_cover_hint: "صيغ مدعومة: PNG, JPG, WebP • (اتركها فارغة للتوليد العشوائي المشفر تلقائياً)",
    dropzone_cover_overlay: "أفلت صورة الغلاف هنا",
    lbl_decrypt_stego: "رفع الصورة الحاملة المشفرة (Stego-Image PNG):",
    dropzone_stego_cta: "اسحب وأفلت الصورة المشفرة هنا",
    dropzone_stego_browse: "اختر ملف PNG",
    dropzone_stego_hint: "صيغة PNG عديمة الفقد • تحتوي على الحمولة المشفرة المخبأة بنظام Sobel LSB",
    dropzone_stego_overlay: "أفلت صورة Stego PNG هنا",
    dropzone_token_cta: "اسحب وأفلت ملف الرمز (Token File) هنا أو انقر لتصفحه",
    dropzone_ready_encrypt: "جاهز للتشفير ✓",
    dropzone_ready_decrypt: "جاهز للاستخراج والفك ✓",
  },
  en: {
    lang_btn: "العربية",
    brand_title: "Post-Quantum Stego System",
    brand_sub: "Mustansiriyah University • College of Engineering",
    badge_grad: "Graduation Project",
    nav_info: "System Info",
    nav_encrypt: "Encrypt & Conceal",
    nav_decrypt: "Extract & Decrypt",
    nav_channel: "Peer Inbox & Directory",
    nav_inbox: "Peer Inbox & Directory",
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

    // Dropzone Strings
    lbl_upload_payload: "Upload File (Document, Binary, or Data):",
    dropzone_payload_cta: "Drag & Drop Data File Here",
    dropzone_payload_browse: "Browse Device",
    dropzone_payload_hint: "Supports Documents, Binaries, and Data (PDF, DOCX, TXT, ZIP, BIN...) • Auto-Classified",
    dropzone_payload_overlay: "Drop file here to upload...",
    lbl_cover_image: "Carrier Cover Image:",
    dropzone_cover_cta: "Drag & Drop Carrier Cover Image",
    dropzone_cover_browse: "Select Image",
    dropzone_cover_hint: "Supported formats: PNG, JPG, WebP • (Leave empty for auto-synthesized carrier)",
    dropzone_cover_overlay: "Drop cover image here",
    lbl_decrypt_stego: "Upload Steganographic Carrier (PNG):",
    dropzone_stego_cta: "Drag & Drop Stego-Image Carrier",
    dropzone_stego_browse: "Choose PNG File",
    dropzone_stego_hint: "Lossless PNG only • Contains concealed payload embedded via Sobel LSB",
    dropzone_stego_overlay: "Drop Stego PNG image here",
    dropzone_token_cta: "Drag & Drop Kyber Token file here or click to browse",
    dropzone_ready_encrypt: "Ready to Encrypt ✓",
    dropzone_ready_decrypt: "Ready to Decrypt ✓",
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

    const tabInbox = document.getElementById("nav-channel-label");
    if (tabInbox) tabInbox.textContent = dict.nav_inbox;

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

    // Dropzone Elements Translation
    const lblPayload = document.getElementById("lbl-upload-payload");
    if (lblPayload) lblPayload.textContent = dict.lbl_upload_payload;
    const ctaPayload = document.getElementById("dropzone-payload-cta");
    if (ctaPayload) ctaPayload.textContent = dict.dropzone_payload_cta;
    const browsePayload = document.getElementById("dropzone-payload-browse");
    if (browsePayload) browsePayload.textContent = dict.dropzone_payload_browse;
    const hintPayload = document.getElementById("dropzone-payload-hint");
    if (hintPayload) hintPayload.innerHTML = dict.dropzone_payload_hint;
    const overlayPayload = document.getElementById("dropzone-payload-overlay-txt");
    if (overlayPayload) overlayPayload.textContent = dict.dropzone_payload_overlay;

    const lblCover = document.getElementById("lbl-cover-image");
    if (lblCover) lblCover.textContent = dict.lbl_cover_image;
    const ctaCover = document.getElementById("dropzone-cover-cta");
    if (ctaCover) ctaCover.textContent = dict.dropzone_cover_cta;
    const browseCover = document.getElementById("dropzone-cover-browse");
    if (browseCover) browseCover.textContent = dict.dropzone_cover_browse;
    const hintCover = document.getElementById("dropzone-cover-hint");
    if (hintCover) hintCover.innerHTML = dict.dropzone_cover_hint;
    const overlayCover = document.getElementById("dropzone-cover-overlay-txt");
    if (overlayCover) overlayCover.textContent = dict.dropzone_cover_overlay;

    const lblStego = document.getElementById("lbl-decrypt-stego");
    if (lblStego) lblStego.textContent = dict.lbl_decrypt_stego;
    const ctaStego = document.getElementById("dropzone-stego-cta");
    if (ctaStego) ctaStego.textContent = dict.dropzone_stego_cta;
    const browseStego = document.getElementById("dropzone-stego-browse");
    if (browseStego) browseStego.textContent = dict.dropzone_stego_browse;
    const hintStego = document.getElementById("dropzone-stego-hint");
    if (hintStego) hintStego.innerHTML = dict.dropzone_stego_hint;
    const overlayStego = document.getElementById("dropzone-stego-overlay-txt");
    if (overlayStego) overlayStego.textContent = dict.dropzone_stego_overlay;

    const ctaToken = document.getElementById("dropzone-token-cta-txt");
    if (ctaToken) ctaToken.textContent = dict.dropzone_token_cta;
    const readyEnc = document.getElementById("encrypt-file-ready-badge");
    if (readyEnc) readyEnc.textContent = dict.dropzone_ready_encrypt;
    const readyDec = document.getElementById("decrypt-stego-ready-badge");
    if (readyDec) readyDec.textContent = dict.dropzone_ready_decrypt;

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
      if (typeof publishCurrentIdentity === "function") publishCurrentIdentity(false);
      if (typeof connectInboxWebSocket === "function") connectInboxWebSocket(username);
      if (typeof loadInboxTransmissions === "function") loadInboxTransmissions();
      if (typeof loadDirectoryPeers === "function") loadDirectoryPeers();
    } else {
      if (pill) pill.classList.add("hidden");
      if (overlay) overlay.classList.remove("hidden");
      if (state.inboxSocket) {
        try { state.inboxSocket.close(); } catch (e) {}
        state.inboxSocket = null;
      }
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
        // Verify user from localStorage using Argon2id
        const stored = JSON.parse(localStorage.getItem(`fgp_user_${u}`));
        if (!stored) throw new Error(currentLang === "ar" ? "المستخدم غير موجود" : "User not found");

        // Verify password against Argon2id hash via zero-database API
        const verifyFd = new FormData();
        verifyFd.append("password", p);
        verifyFd.append("argon2_hash", stored.argon2_hash || stored.password || "");

        const verifyRes = await fetch("/api/auth/verify-password", { method: "POST", body: verifyFd });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.valid) throw new Error(currentLang === "ar" ? "كلمة المرور غير صحيحة" : "Incorrect password");

        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(`مرحباً بك مجدداً ${u}! تم التحقق من كلمة المرور عبر Argon2id بنجاح`, "success");
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

      try {
        // Hash password with Argon2id (64MB memory-hard KDF)
        const hashFd = new FormData();
        hashFd.append("password", p);
        const hashRes = await fetch("/api/auth/hash-password", { method: "POST", body: hashFd });
        const hashJson = await hashRes.json();

        if (hashJson.status !== "success" || !hashJson.argon2_hash) {
          throw new Error("فشل توليد تجزئة Argon2id لكلمة المرور");
        }

        // Save user credentials (Argon2id hash only, zero plain text, zero SQL database)
        localStorage.setItem(`fgp_user_${u}`, JSON.stringify({
          username: u,
          argon2_hash: hashJson.argon2_hash,
          created_at: new Date().toISOString()
        }));
        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(`تم إنشاء الحساب بنجاح وتأمينه عبر Argon2id! أهلاً بك يا ${u}`, "success");
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

/* ==========================================================================
   11. CYBER DRAG & DROP FILE SYSTEM (MODERN DROPZONE CONTROLLER)
   ========================================================================== */
function initDropzones() {
  // Global prevention of default browser behavior when files dropped outside dropzones
  window.addEventListener("dragover", (e) => e.preventDefault(), false);
  window.addEventListener("drop", (e) => e.preventDefault(), false);

  // Helper: Format file size
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Helper: File type styling info
  function getFileType(fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (["pdf"].includes(ext)) {
      return { badge: "PDF", class: "is-pdf" };
    } else if (["zip", "tar", "gz", "7z", "rar", "bz2"].includes(ext)) {
      return { badge: "ARCHIVE", class: "is-archive" };
    } else if (["json", "csv", "xml", "yaml", "sql", "txt", "md"].includes(ext)) {
      return { badge: "DATA", class: "is-data" };
    } else if (["png", "jpg", "jpeg", "webp", "bmp", "svg", "gif"].includes(ext)) {
      return { badge: "IMAGE", class: "is-image" };
    } else if (["docx", "doc", "rtf", "odt"].includes(ext)) {
      return { badge: "DOC", class: "is-pdf" };
    }
    return { badge: ext.toUpperCase() || "BIN", class: "" };
  }

  // Helper: Setup generic dragover/dragleave/drop on dropzone element
  function bindDropEvents(dropzoneEl, onFilesDropped) {
    if (!dropzoneEl) return;

    let dragCounter = 0;

    dropzoneEl.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      dropzoneEl.classList.add("is-dragover");
    });

    dropzoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add("is-dragover");
    });

    dropzoneEl.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropzoneEl.classList.remove("is-dragover");
      }
    });

    dropzoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropzoneEl.classList.remove("is-dragover");

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    });
  }

  // -------------------------------------------------------------
  // 1. PAYLOAD FILE DROPZONE (#dropzone-encrypt-file)
  // -------------------------------------------------------------
  const payloadDropzone = document.getElementById("dropzone-encrypt-file");
  const payloadInput = document.getElementById("encrypt-file");
  const payloadEmptyState = document.getElementById("encrypt-file-empty-state");
  const payloadLoadedState = document.getElementById("encrypt-file-loaded-state");
  const payloadFileName = document.getElementById("encrypt-file-name");
  const payloadFileSize = document.getElementById("encrypt-file-size");
  const payloadTypeBadge = document.getElementById("encrypt-file-type-badge");
  const payloadIconWrap = document.getElementById("encrypt-file-type-icon");
  const btnClearPayload = document.getElementById("btn-clear-encrypt-file");

  function updatePayloadDropzoneUI() {
    if (payloadInput && payloadInput.files && payloadInput.files.length > 0) {
      const file = payloadInput.files[0];
      if (payloadFileName) payloadFileName.textContent = file.name;
      if (payloadFileSize) payloadFileSize.textContent = formatBytes(file.size);

      const typeInfo = getFileType(file.name);
      if (payloadTypeBadge) payloadTypeBadge.textContent = typeInfo.badge;
      if (payloadIconWrap) {
        payloadIconWrap.className = "dropzone-file-icon-wrap " + typeInfo.class;
      }

      if (payloadEmptyState) payloadEmptyState.classList.add("hidden");
      if (payloadLoadedState) payloadLoadedState.classList.remove("hidden");
    } else {
      if (payloadEmptyState) payloadEmptyState.classList.remove("hidden");
      if (payloadLoadedState) payloadLoadedState.classList.add("hidden");
    }
  }

  if (payloadDropzone && payloadInput) {
    // Click triggers native input
    payloadDropzone.addEventListener("click", (e) => {
      if (e.target.closest(".btn-dropzone-action") || e.target.closest("button")) return;
      payloadInput.click();
    });

    payloadDropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        payloadInput.click();
      }
    });

    // Drop binding
    bindDropEvents(payloadDropzone, (files) => {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      payloadInput.files = dt.files;
      payloadInput.dispatchEvent(new Event("change", { bubbles: true }));
      showToast(currentLang === "ar" ? `تم تحميل الملف: ${files[0].name}` : `Payload loaded: ${files[0].name}`, "info");
    });

    // Listen to native change to update dropzone UI
    payloadInput.addEventListener("change", () => {
      updatePayloadDropzoneUI();
    });

    // Clear file
    if (btnClearPayload) {
      btnClearPayload.addEventListener("click", (e) => {
        e.stopPropagation();
        payloadInput.value = "";
        updatePayloadDropzoneUI();
        payloadInput.dispatchEvent(new Event("change", { bubbles: true }));
        showToast(currentLang === "ar" ? "تمت إزالة ملف البيانات" : "Payload file removed", "info");
      });
    }
  }

  // -------------------------------------------------------------
  // 2. COVER IMAGE DROPZONE (#dropzone-encrypt-cover)
  // -------------------------------------------------------------
  const coverDropzone = document.getElementById("dropzone-encrypt-cover");
  const coverInput = document.getElementById("encrypt-cover-image");
  const coverEmptyState = document.getElementById("encrypt-cover-empty-state");
  const coverLoadedState = document.getElementById("encrypt-cover-loaded-state");
  const coverThumb = document.getElementById("encrypt-cover-thumb");
  const coverName = document.getElementById("encrypt-cover-name");
  const coverDim = document.getElementById("encrypt-cover-dim");
  const coverCapacity = document.getElementById("encrypt-cover-capacity");
  const btnClearCover = document.getElementById("btn-clear-cover-image");
  const btnResetCover = document.getElementById("btn-reset-cover");

  function updateCoverDropzoneUI(file, width, height, capacityBytes) {
    if (file) {
      if (coverName) coverName.textContent = file.name;
      if (coverDim) coverDim.textContent = `${width} × ${height} px`;
      if (coverCapacity) {
        coverCapacity.textContent = currentLang === "ar" ? `السعة: ${formatBytes(capacityBytes)}` : `Capacity: ${formatBytes(capacityBytes)}`;
      }
      if (coverThumb) {
        coverThumb.src = URL.createObjectURL(file);
      }
      if (coverEmptyState) coverEmptyState.classList.add("hidden");
      if (coverLoadedState) coverLoadedState.classList.remove("hidden");
    } else {
      if (coverEmptyState) coverEmptyState.classList.remove("hidden");
      if (coverLoadedState) coverLoadedState.classList.add("hidden");
      if (coverThumb) coverThumb.src = "";
    }
  }

  if (coverDropzone && coverInput) {
    coverDropzone.addEventListener("click", (e) => {
      if (e.target.closest(".btn-dropzone-action") || e.target.closest("button")) return;
      coverInput.click();
    });

    coverDropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        coverInput.click();
      }
    });

    bindDropEvents(coverDropzone, (files) => {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        showToast(currentLang === "ar" ? "يرجى إفلات ملف صورة (PNG/JPG/WebP)" : "Please drop an image file (PNG/JPG/WebP)", "error");
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      coverInput.files = dt.files;
      coverInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Inspect image and update UI when coverInput changes
    coverInput.addEventListener("change", (e) => {
      const file = e.target.files ? e.target.files[0] : null;
      if (!file) {
        updateCoverDropzoneUI(null);
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
        updateCoverDropzoneUI(file, width, height, capacityBytes);
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });

    function resetCoverAction() {
      coverInput.value = "";
      updateCoverDropzoneUI(null);
      currentUploadedCover = null;
      if (btnResetCover) btnResetCover.classList.add("hidden");
      updateStegoCapacity();
      showToast(currentLang === "ar" ? "تمت إزالة صورة الغلاف (سيتم التوليد التلقائي)" : "Cover removed (auto-synthesis enabled)", "info");
    }

    if (btnClearCover) {
      btnClearCover.addEventListener("click", (e) => {
        e.stopPropagation();
        resetCoverAction();
      });
    }

    if (btnResetCover) {
      btnResetCover.addEventListener("click", () => {
        updateCoverDropzoneUI(null);
      });
    }
  }

  // -------------------------------------------------------------
  // 3. STEGO CARRIER DECRYPT DROPZONE (#dropzone-decrypt-stego)
  // -------------------------------------------------------------
  const stegoDropzone = document.getElementById("dropzone-decrypt-stego");
  const stegoInput = document.getElementById("decrypt-stego-file");
  const stegoEmptyState = document.getElementById("decrypt-stego-empty-state");
  const stegoLoadedState = document.getElementById("decrypt-stego-loaded-state");
  const stegoThumb = document.getElementById("decrypt-stego-thumb");
  const stegoName = document.getElementById("decrypt-stego-name");
  const stegoSize = document.getElementById("decrypt-stego-size");
  const btnClearStego = document.getElementById("btn-clear-decrypt-stego");

  function updateStegoDropzoneUI() {
    if (stegoInput && stegoInput.files && stegoInput.files.length > 0) {
      const file = stegoInput.files[0];
      if (stegoName) stegoName.textContent = file.name;
      if (stegoSize) stegoSize.textContent = formatBytes(file.size);
      if (stegoThumb) {
        stegoThumb.src = URL.createObjectURL(file);
      }
      if (stegoEmptyState) stegoEmptyState.classList.add("hidden");
      if (stegoLoadedState) stegoLoadedState.classList.remove("hidden");
    } else {
      if (stegoEmptyState) stegoEmptyState.classList.remove("hidden");
      if (stegoLoadedState) stegoLoadedState.classList.add("hidden");
      if (stegoThumb) stegoThumb.src = "";
    }
  }

  if (stegoDropzone && stegoInput) {
    stegoDropzone.addEventListener("click", (e) => {
      if (e.target.closest(".btn-dropzone-action") || e.target.closest("button")) return;
      stegoInput.click();
    });

    stegoDropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        stegoInput.click();
      }
    });

    bindDropEvents(stegoDropzone, (files) => {
      const file = files[0];
      const dt = new DataTransfer();
      dt.items.add(file);
      stegoInput.files = dt.files;
      stegoInput.dispatchEvent(new Event("change", { bubbles: true }));
      showToast(currentLang === "ar" ? `تم تحميل صورة Stego: ${file.name}` : `Stego carrier loaded: ${file.name}`, "info");
    });

    stegoInput.addEventListener("change", () => {
      updateStegoDropzoneUI();
    });

    if (btnClearStego) {
      btnClearStego.addEventListener("click", (e) => {
        e.stopPropagation();
        stegoInput.value = "";
        updateStegoDropzoneUI();
        const previewBox = document.getElementById("decrypt-image-preview-box");
        if (previewBox) previewBox.classList.add("hidden");
        stegoInput.dispatchEvent(new Event("change", { bubbles: true }));
        showToast(currentLang === "ar" ? "تمت إزالة صورة Stego" : "Stego image cleared", "info");
      });
    }
  }

  // -------------------------------------------------------------
  // 4. KYBER TOKEN DROPZONE (#dropzone-decrypt-token)
  // -------------------------------------------------------------
  const tokenDropzone = document.getElementById("dropzone-decrypt-token");
  const tokenInput = document.getElementById("decrypt-token-file");
  const tokenLabel = document.getElementById("decrypt-token-dropzone-label");

  if (tokenDropzone && tokenInput) {
    tokenDropzone.addEventListener("click", () => {
      tokenInput.click();
    });

    tokenDropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tokenInput.click();
      }
    });

    bindDropEvents(tokenDropzone, async (files) => {
      const file = files[0];
      const dt = new DataTransfer();
      dt.items.add(file);
      tokenInput.files = dt.files;
      tokenInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    tokenInput.addEventListener("change", async () => {
      if (tokenInput.files && tokenInput.files.length > 0) {
        const file = tokenInput.files[0];
        const text = await file.text();
        document.getElementById("decrypt-kyber-ct").value = text.trim();
        if (tokenLabel) {
          tokenLabel.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-emerald);">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: var(--accent-emerald); font-weight: 600;">✓ ${file.name} (${formatBytes(file.size)})</span>
          `;
        }
        showToast(currentLang === "ar" ? `تم تحميل رمز كايبر من ${file.name}` : `Kyber token loaded from ${file.name}`, "info");
      }
    });
  }
}



