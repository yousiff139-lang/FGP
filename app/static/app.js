/**
 * Hybrid Multi-Level Security System
 * High-Assurance Cryptographic Workstation
 * Bilingual (EN / AR) & 10 Color Themes Controller
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

let currentActiveStage = 1;

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
   0. 20 COLOR THEMES & ACCENT CONTROLLER (INCLUDING PRIMARY COLORS)
   ========================================================================== */
const ACCENT_PRESETS = [
  // Primary Colors
  { id: "red", name: "Primary Red", nameAr: "أحمر أساسي", color: "#ef4444" },
  { id: "blue", name: "Primary Blue", nameAr: "أزرق أساسي", color: "#2563eb" },
  { id: "yellow", name: "Primary Yellow", nameAr: "أصفر أساسي", color: "#eab308" },
  { id: "green", name: "Primary Green", nameAr: "أخضر أساسي", color: "#22c55e" },
  // Cool & Cyan / Blue Spectrum
  { id: "cyan", name: "Cyber Cyan", nameAr: "سمائي سيبراني", color: "#00f0ff" },
  { id: "sky", name: "Sky Blue", nameAr: "أزرق سماوي", color: "#0ea5e9" },
  { id: "indigo", name: "Royal Indigo", nameAr: "نيلي ملكي", color: "#6366f1" },
  { id: "violet", name: "Electric Violet", nameAr: "بنفسجي كهربائي", color: "#8b5cf6" },
  // Purple / Pink / Crimson Spectrum
  { id: "purple", name: "Neon Purple", nameAr: "بنفسجي نيون", color: "#a855f7" },
  { id: "magenta", name: "Fuchsia Magenta", nameAr: "فوشي أرجواني", color: "#d946ef" },
  { id: "pink", name: "Hot Pink", nameAr: "وردي زاهي", color: "#ec4899" },
  { id: "rose", name: "Crimson Rose", nameAr: "وردي قرمزي", color: "#f43f5e" },
  // Warm & Earth / Emerald Spectrum
  { id: "crimson", name: "Deep Crimson", nameAr: "قرمزي داكن", color: "#dc2626" },
  { id: "coral", name: "Living Coral", nameAr: "مرجاني حيوي", color: "#ff6b6b" },
  { id: "orange", name: "Sunset Orange", nameAr: "برتقالي متوهج", color: "#f97316" },
  { id: "amber", name: "Solar Amber", nameAr: "كهرماني ذهبي", color: "#f59e0b" },
  // Green / Teal / Neutral Spectrum
  { id: "lime", name: "Electric Lime", nameAr: "ليموني مضيء", color: "#84cc16" },
  { id: "emerald", name: "Emerald Jade", nameAr: "زمردي ملكي", color: "#10b981" },
  { id: "mint", name: "Ocean Mint", nameAr: "نعناعي بحري", color: "#14b8a6" },
  { id: "slate", name: "Titanium Slate", nameAr: "فولاذي تيتانيوم", color: "#64748b" },
];

let currentAccent = localStorage.getItem("fgp_accent_theme") || "cyan";
let currentMode = localStorage.getItem("fgp_color_mode") || "dark";

function initThemeController() {
  const btnAccent = document.getElementById("btn-theme-accent");
  const btnMode = document.getElementById("btn-theme-mode");
  const popover = document.getElementById("theme-palette-popover");

  // Render the 10-theme grid swatches
  renderThemePaletteGrid();

  // Initial theme and mode apply
  applyAccent(currentAccent, false);
  applyMode(currentMode, false);

  if (btnAccent && popover) {
    btnAccent.addEventListener("click", (e) => {
      e.stopPropagation();
      popover.classList.toggle("hidden");
    });
  }

  // Close popover when clicking anywhere outside
  document.addEventListener("click", (e) => {
    if (popover && !popover.classList.contains("hidden")) {
      if (!popover.contains(e.target) && e.target !== btnAccent && !btnAccent.contains(e.target)) {
        popover.classList.add("hidden");
      }
    }
  });

  if (btnMode) {
    btnMode.addEventListener("click", () => {
      const nextMode = currentMode === "dark" ? "light" : "dark";
      applyMode(nextMode, true);
    });
  }
}

function renderThemePaletteGrid() {
  const grid = document.getElementById("theme-palette-grid");
  if (!grid) return;
  grid.innerHTML = "";

  ACCENT_PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `theme-swatch-btn ${preset.id === currentAccent ? "active" : ""}`;
    btn.dataset.accent = preset.id;
    btn.style.backgroundColor = preset.color;
    btn.style.color = preset.color;
    const themeName = currentLang === "ar" ? preset.nameAr : preset.name;
    btn.title = themeName;
    btn.setAttribute("aria-label", themeName);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      applyAccent(preset.id, true);
      const popover = document.getElementById("theme-palette-popover");
      if (popover) popover.classList.add("hidden");
    });

    grid.appendChild(btn);
  });
}

function applyAccent(accentId, notify = false) {
  const preset = ACCENT_PRESETS.find((p) => p.id === accentId) || ACCENT_PRESETS[0];
  currentAccent = preset.id;
  document.documentElement.setAttribute("data-accent", preset.id);
  localStorage.setItem("fgp_accent_theme", preset.id);

  const accentDot = document.getElementById("theme-accent-dot");
  const accentLabel = document.getElementById("theme-accent-label");

  if (accentDot) accentDot.style.backgroundColor = preset.color;
  if (accentLabel) accentLabel.textContent = currentLang === "ar" ? preset.nameAr : preset.name;

  // Update active status on swatch buttons
  document.querySelectorAll(".theme-swatch-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.accent === preset.id);
  });

  if (notify) {
    const msg = currentLang === "ar"
      ? `تم تفعيل سمة اللون: ${preset.nameAr}`
      : `Color theme active: ${preset.name}`;
    showToast(msg, "info");
  }
}

function applyMode(mode, notify = false) {
  currentMode = mode === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentMode);
  localStorage.setItem("fgp_color_mode", currentMode);

  const iconSun = document.getElementById("theme-sun-icon");
  const iconMoon = document.getElementById("theme-moon-icon");
  const modeLabel = document.getElementById("theme-mode-label");

  if (currentMode === "light") {
    if (iconSun) iconSun.classList.add("hidden");
    if (iconMoon) iconMoon.classList.remove("hidden");
    if (modeLabel) modeLabel.textContent = currentLang === "ar" ? "فاتح" : "Light";
  } else {
    if (iconSun) iconSun.classList.remove("hidden");
    if (iconMoon) iconMoon.classList.add("hidden");
    if (modeLabel) modeLabel.textContent = currentLang === "ar" ? "داكن" : "Dark";
  }

  if (notify) {
    const msg = currentLang === "ar"
      ? `نمط العرض: ${currentMode === "light" ? "النمط الفاتح (Light)" : "النمط الداكن (Dark)"}`
      : `Display mode: ${currentMode === "light" ? "Light Mode" : "Dark Mode"}`;
    showToast(msg, "info");
  }
}

/* ==========================================================================
   1. NAVIGATION, HOME HUB & INFO SUB-TABS
   ========================================================================== */
function switchToSection(targetId) {
  if (!targetId) return;
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.target === targetId);
  });

  document.querySelectorAll(".content-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === targetId);
  });

  // Clear pulse if viewing channel
  if (targetId === "section-channel") {
    const pulse = document.getElementById("channel-pulse");
    if (pulse) pulse.classList.add("hidden");
  }

  // Automatically refresh audit logs when viewing audit section
  if (targetId === "section-audit") {
    if (typeof loadAuditLogs === "function") loadAuditLogs();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchToSection(tab.dataset.target);
    });
  });

  // Brand logo click returns to Home
  const brandLogo = document.querySelector(".brand-logo");
  if (brandLogo) {
    brandLogo.style.cursor = "pointer";
    brandLogo.addEventListener("click", () => {
      switchToSection("section-home");
    });
  }

  // Home page quick CTA buttons & menu cards with [data-nav-target]
  document.querySelectorAll("[data-nav-target]").forEach((el) => {
    el.addEventListener("click", () => {
      switchToSection(el.dataset.navTarget);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchToSection(el.dataset.navTarget);
      }
    });
  });

  // Home page Key Vault triggers
  const vaultModal = document.getElementById("vault-modal");
  const btnHomeVault = document.getElementById("btn-home-open-vault");
  const cardHomeVault = document.getElementById("card-home-vault");

  if (btnHomeVault && vaultModal) {
    btnHomeVault.addEventListener("click", () => vaultModal.classList.remove("hidden"));
  }
  if (cardHomeVault && vaultModal) {
    cardHomeVault.addEventListener("click", () => vaultModal.classList.remove("hidden"));
    cardHomeVault.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        vaultModal.classList.remove("hidden");
      }
    });
  }

  // Info section sub-navigation filter bar
  const infoSubtabs = document.querySelectorAll(".info-subtab");
  const infoPanes = document.querySelectorAll(".info-pane");
  infoSubtabs.forEach((subtab) => {
    subtab.addEventListener("click", () => {
      const filter = subtab.dataset.infoFilter || "all";
      infoSubtabs.forEach((btn) => btn.classList.toggle("active", btn === subtab));
      infoPanes.forEach((pane) => {
        if (filter === "all" || pane.dataset.infoPane === filter) {
          pane.classList.remove("hidden");
        } else {
          pane.classList.add("hidden");
        }
      });
    });
  });
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

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
async function generateLatticeKeys(autoApply = true, notify = true) {
  try {
    const formData = new FormData();
    formData.append("username", getActiveUser());
    const res = await fetch("/api/keygen", {
      method: "POST",
      body: formData,
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
        showToast(
          currentLang === "ar"
            ? "تم توليد زوج مفاتيح كايبر (ML-KEM-768) وتحميله بنجاح!"
            : "ML-KEM-768 keypair generated & loaded into workflows!",
          "success"
        );
      }
      return true;
    } else {
      throw new Error(data.detail || "Keygen response indicated failure");
    }
  } catch (e) {
    showToast(
      currentLang === "ar" ? "خطأ في توليد المفاتيح: " + e.message : "Key generation error: " + e.message,
      "error"
    );
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
      btnGen.textContent = currentLang === "ar" ? "جارٍ توليد المفاتيح..." : "Generating Lattice Keys...";
      await generateLatticeKeys(true, true);
      btnGen.disabled = false;
      btnGen.textContent = currentLang === "ar" ? "⚡ توليد زوج مفاتيح كايبر" : "⚡ Generate Kyber-768 Keypair";
    });
  }

  if (btnQuickGenPk) {
    btnQuickGenPk.addEventListener("click", async () => {
      btnQuickGenPk.disabled = true;
      btnQuickGenPk.textContent = currentLang === "ar" ? "جارٍ التوليد..." : "Generating...";
      await generateLatticeKeys(true, true);
      btnQuickGenPk.disabled = false;
      btnQuickGenPk.textContent = currentLang === "ar" ? "⚡ توليد زوج مفاتيح شبكية" : "⚡ Generate Lattice Keypair";
    });
  }

  if (btnQuickGenSk) {
    btnQuickGenSk.addEventListener("click", async () => {
      btnQuickGenSk.disabled = true;
      btnQuickGenSk.textContent = currentLang === "ar" ? "جارٍ التوليد..." : "Generating...";
      await generateLatticeKeys(true, true);
      btnQuickGenSk.disabled = false;
      btnQuickGenSk.textContent = currentLang === "ar" ? "⚡ توليد زوج مفاتيح شبكية" : "⚡ Generate Lattice Keypair";
    });
  }

  if (btnExportPk) {
    btnExportPk.addEventListener("click", () => {
      if (state.localKeys.pk) {
        downloadBlob(state.localKeys.pk, "kyber_public.key", "text/plain");
        showToast(currentLang === "ar" ? "تم تصدير المفتاح العام" : "Public key saved", "success");
      }
    });
  }

  if (btnExportSk) {
    btnExportSk.addEventListener("click", () => {
      if (state.localKeys.sk) {
        downloadBlob(state.localKeys.sk, "kyber_secret.key", "text/plain");
        showToast(currentLang === "ar" ? "تم تصدير المفتاح السري" : "Secret key saved", "success");
      }
    });
  }

  if (btnUseVault) {
    btnUseVault.addEventListener("click", () => {
      applyVaultKeysToForms();
      if (modal) modal.classList.add("hidden");
      showToast(
        currentLang === "ar" ? "تم تحميل المفاتيح في نماذج التشفير وفك التشفير." : "Loaded keys into Encrypt & Decrypt forms.",
        "success"
      );
    });
  }

  if (btnUseVaultPk) {
    btnUseVaultPk.addEventListener("click", async () => {
      if (state.localKeys.pk) {
        const input = document.getElementById("encrypt-recipient-pk");
        if (input) input.value = state.localKeys.pk;
        showToast(
          currentLang === "ar" ? "تم تحميل المفتاح العام في نموذج التشفير." : "Public key loaded into Encrypt form.",
          "success"
        );
      } else {
        showToast(
          currentLang === "ar" ? "جارٍ توليد زوج مفاتيح ML-KEM-768 جديد..." : "Generating fresh ML-KEM-768 keypair...",
          "info"
        );
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
        showToast(
          currentLang === "ar" ? "تم تحميل المفتاح السري في نموذج فك التشفير." : "Secret key loaded into Decrypt form.",
          "success"
        );
      } else {
        showToast(
          currentLang === "ar" ? "جارٍ توليد زوج مفاتيح ML-KEM-768 جديد..." : "Generating fresh ML-KEM-768 keypair...",
          "info"
        );
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
  } catch (e) { }
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
let currentUploadedCover = null;
let lastCalculatedCapacity = {
  rawBytes: 0,
  minDim: 0,
  isSufficient: true,
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
    isDocType = forcedType === "document";
  } else if (overrideVal) {
    isDocType = overrideVal === "document";
  }

  const msgBox = document.getElementById("cover-size-msg");
  const labelEl = document.getElementById("cover-size-label");
  const valEl = document.getElementById("cover-size-val");

  if (!msgBox || !valEl) return;

  if (rawBytes === 0) {
    lastCalculatedCapacity = { rawBytes: 0, minDim: 0, isSufficient: true };
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) labelEl.textContent = currentLang === "ar" ? "أبعاد الصورة الناقلة المطلوبة:" : "Required cover image size:";
    valEl.textContent = currentLang === "ar" ? "بانتظار البيانات..." : "Awaiting payload...";
    return;
  }

  const packageBytes = estimatePackageBytes(rawBytes, isDocType);
  const framedBytes = packageBytes + 36;
  const minPixels = Math.ceil((framedBytes * 8) / 3);
  const minDim = Math.ceil(Math.sqrt(minPixels));

  lastCalculatedCapacity = {
    rawBytes,
    minDim,
    isSufficient: true,
  };

  if (currentUploadedCover) {
    const coverCap = currentUploadedCover.capacityBytes;
    if (packageBytes <= coverCap) {
      lastCalculatedCapacity.isSufficient = true;
      msgBox.className = "cover-size-msg msg-ok mt-2";
      if (labelEl) {
        labelEl.textContent = currentLang === "ar"
          ? `✓ أبعاد الصورة المختارة ${currentUploadedCover.width} × ${currentUploadedCover.height} بكسل (المطلوب:`
          : `✓ Selected image is ${currentUploadedCover.width} × ${currentUploadedCover.height} px (Needed:`;
      }
      valEl.textContent = currentLang === "ar"
        ? `على الأقل ${minDim} × ${minDim} بكسل)`
        : `at least ${minDim} × ${minDim} px)`;
    } else {
      lastCalculatedCapacity.isSufficient = false;
      msgBox.className = "cover-size-msg msg-error mt-2";
      if (labelEl) {
        labelEl.textContent = currentLang === "ar"
          ? `⚠️ الصورة المختارة ${currentUploadedCover.width} × ${currentUploadedCover.height} بكسل. المطلوب:`
          : `⚠️ Selected image is ${currentUploadedCover.width} × ${currentUploadedCover.height} px. Required:`;
      }
      valEl.textContent = currentLang === "ar"
        ? `على الأقل ${minDim} × ${minDim} بكسل`
        : `at least ${minDim} × ${minDim} px`;
    }
  } else {
    lastCalculatedCapacity.isSufficient = true;
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) labelEl.textContent = currentLang === "ar" ? "أبعاد الصورة الناقلة المطلوبة:" : "Required cover image size:";
    valEl.textContent = currentLang === "ar" ? `على الأقل ${minDim} × ${minDim} بكسل` : `at least ${minDim} × ${minDim} px`;
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

  if (tabText && tabFile) {
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
  }

  let debounceTimer = null;
  if (textInput) {
    textInput.addEventListener("input", () => {
      updateStegoCapacity();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerClassification, 250);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      updateStegoCapacity();
      triggerClassification();
    });
  }

  if (overrideSelect) {
    overrideSelect.addEventListener("change", () => {
      updateStegoCapacity();
      triggerClassification();
    });
  }
}

async function triggerClassification() {
  const isFile = document.getElementById("tab-input-file")?.classList.contains("active");
  const textVal = document.getElementById("encrypt-text")?.value || "";
  const fileInput = document.getElementById("encrypt-file");
  const overrideVal = document.getElementById("encrypt-override")?.value || "";

  const badge = document.getElementById("badge-classification");
  const reason = document.getElementById("classifier-reason");
  const route = document.getElementById("classifier-route-text");

  if (!badge || !reason || !route) return;

  const formData = new FormData();
  if (overrideVal) formData.append("override_type", overrideVal);

  if (isFile && fileInput?.files?.length > 0) {
    formData.append("file", fileInput.files[0]);
  } else if (!isFile && textVal.trim().length > 0) {
    formData.append("text", textVal);
  } else {
    badge.className = "badge badge-accent";
    badge.textContent = currentLang === "ar" ? "بانتظار الإدخال" : "Awaiting Input";
    reason.textContent = currentLang === "ar" ? "اكتب رسالة أو اختر ملفاً لمعاينة معايير التوجيه." : "Type a message or select a file to inspect parameters.";
    route.textContent = currentLang === "ar" ? "المسار: -" : "Route: -";
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
      const typeKey = data.type.toLowerCase();
      if (typeKey === "bulk") {
        badge.className = "badge badge-primary";
      } else if (typeKey === "sensitive") {
        badge.className = "badge badge-warning";
      } else if (typeKey === "document") {
        badge.className = "badge badge-success";
      }

      if (currentLang === "ar") {
        const arTypes = {
          bulk: "بيانات ضخمة (BULK)",
          sensitive: "بيانات حساسة (SENSITIVE)",
          document: "مستند موثق (DOCUMENT)",
        };
        const arRoutes = {
          bulk: "مسار التشفير التناظري عالي الإنتاجية (ChaCha20-Poly1305 / AES-256-GCM)",
          sensitive: "تبادل المفاتيح الإهليلجية (ECDH P-256) والتشفير التناظري",
          document: "توقيع رقمي للمستندات (ECDSA P-256) والتشفير التناظري",
        };
        badge.textContent = arTypes[typeKey] || data.type.toUpperCase();
        reason.textContent =
          typeKey === "bulk"
            ? `حزمة بيانات ضخمة تفوق العتبة (${data.size || 0} بايت) - تتطلب تشفيراً متناظراً عالي السرعة.`
            : typeKey === "sensitive"
              ? `بيانات اعتماد أو مفاتيح حساسة (${data.size || 0} بايت) - تشفير معزول مع حماية القنوات الجانبية.`
              : `مستند أو ملف مهيكل (${data.size || 0} بايت) - يتطلب توقيعاً رقمياً إهليلجياً لإثبات النزاهة وعدم الإنكار.`;
        route.textContent = `المسار: ${arRoutes[typeKey] || data.route}`;
      } else {
        badge.textContent = data.type.toUpperCase();
        reason.textContent = data.reason;
        route.textContent = `Route: ${data.route}`;
      }

      updateStegoCapacity(data.type);
      scanAndEnforceFinancialPolicy();
    }
  } catch (e) {
    console.error("Classification error:", e);
  }
}


/* ==========================================================================
   4.5. INTERACTIVE SECURITY INTENT WIZARD & SENSITIVITY POLICIES
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
      if (btnEncrypt) {
        btnEncrypt.textContent = currentLang === "ar"
          ? "✍️ توليد توقيع رقمي فقط (ECDSA P-256)"
          : "✍️ Generate Standalone DSA Signature";
      }
    } else if (val === "direct_pqc") {
      if (secRecipient) secRecipient.classList.remove("hidden");
      if (secCover) secCover.classList.add("hidden");
      if (secCipher) secCipher.classList.remove("hidden");
      if (btnEncrypt) {
        btnEncrypt.textContent = currentLang === "ar"
          ? "⚡ تشفير كايبر كمومي مباشر (Direct PQC)"
          : "⚡ Direct PQC Encryption (Kyber-768)";
      }
    } else {
      // full_hybrid
      if (secRecipient) secRecipient.classList.remove("hidden");
      if (secCover) secCover.classList.remove("hidden");
      if (secCipher) secCipher.classList.remove("hidden");
      if (btnEncrypt) {
        btnEncrypt.textContent = currentLang === "ar"
          ? "تنفيذ التشفير الهجين متعدد الطبقات والحجب"
          : "Execute Multi-Layer Encryption & Concealment";
      }
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
        showToast(
          currentLang === "ar"
            ? "تم تفعيل ChaCha20-Poly1305 تلقائياً للبيانات المالية لحمايتها من تسريبات المعالج."
            : "Auto-selected ChaCha20-Poly1305 for financial data (side-channel protection).",
          "info"
        );
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
      showToast(
        currentLang === "ar"
          ? "تم اكتشاف بيانات حساسة! فرض تشفير ChaCha20-Poly1305 في الوقت الثابت."
          : "Financial data detected! Auto-enforcing ChaCha20-Poly1305 (Constant-Time ARX).",
        "info"
      );
    }
  }
}

/* ==========================================================================
   5. ENCRYPTION PIPELINE (SENDER)
   ========================================================================== */
function initEncryptSection() {
  initInteractiveWizard();

  const btnEncrypt = document.getElementById("btn-execute-encrypt");
  const coverInput = document.getElementById("encrypt-cover-image");
  const btnResetCover = document.getElementById("btn-reset-cover");

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
          capacityBytes,
        };

        URL.revokeObjectURL(objectUrl);
        if (btnResetCover) btnResetCover.classList.remove("hidden");
        updateStegoCapacity();
        showToast(
          currentLang === "ar"
            ? `أبعاد صورة الغلاف: ${width} × ${height} بكسل`
            : `Cover image: ${width} × ${height} px`,
          "info"
        );
      };

      img.onerror = () => {
        currentUploadedCover = null;
        URL.revokeObjectURL(objectUrl);
        if (btnResetCover) btnResetCover.classList.add("hidden");
        showToast(
          currentLang === "ar"
            ? "تعذر قراءة أبعاد الصورة. يرجى التحقق من صيغة الملف."
            : "Could not read image dimensions. Please check file format.",
          "error"
        );
        updateStegoCapacity();
      };

      img.src = objectUrl;
    });
  }

  if (btnResetCover) {
    btnResetCover.addEventListener("click", () => {
      if (coverInput) coverInput.value = "";
      currentUploadedCover = null;
      btnResetCover.classList.add("hidden");
      updateStegoCapacity();
      showToast(currentLang === "ar" ? "تمت العودة للصورة المولدة تلقائياً." : "Reverted to default cover.", "info");
    });
  }

  if (btnEncrypt) {
    btnEncrypt.addEventListener("click", async () => {
      const isFile = document.getElementById("tab-input-file")?.classList.contains("active");
      const textVal = document.getElementById("encrypt-text")?.value || "";
      const fileInput = document.getElementById("encrypt-file");
      const pkVal = document.getElementById("encrypt-recipient-pk")?.value.trim() || "";
      const cipherChoice = document.querySelector('input[name="cipher_choice"]:checked')?.value || "chacha20";
      const overrideVal = document.getElementById("encrypt-override")?.value || "";
      const channelRoomVal = document.getElementById("encrypt-channel-room")?.value.trim() || "";
      const wizardObjective = document.querySelector('input[name="wizard_objective"]:checked')?.value || "full_hybrid";
      const wizardSensitivity = document.querySelector('input[name="wizard_sensitivity"]:checked')?.value || "confidential_text";

      if (isFile && (!fileInput || fileInput.files.length === 0)) {
        showToast(currentLang === "ar" ? "يرجى اختيار ملف لتشفيره." : "Please select a file to encrypt.", "error");
        return;
      }

      if (!isFile && !textVal.trim()) {
        showToast(currentLang === "ar" ? "يرجى إدخال النص المطلوب تشفيره." : "Please enter text payload to encrypt.", "error");
        return;
      }

      // Branch 1: Standalone Digital Signature Only (ECDSA P-256)
      if (wizardObjective === "dsa_only") {
        btnEncrypt.disabled = true;
        btnEncrypt.textContent = currentLang === "ar" ? "جارٍ توليد التوقيع الرقمي (ECDSA P-256)..." : "Signing with ECDSA P-256...";

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
          showToast(
            currentLang === "ar"
              ? "تم توليد وتوثيق التوقيع الرقمي بنجاح!"
              : "Digital signature generated successfully!",
            "success"
          );
        } catch (e) {
          showToast((currentLang === "ar" ? "خطأ: " : "Error: ") + e.message, "error");
        } finally {
          btnEncrypt.disabled = false;
          btnEncrypt.textContent = currentLang === "ar"
            ? "✍️ توليد توقيع رقمي فقط (ECDSA P-256)"
            : "✍️ Generate Standalone DSA Signature";
        }
        return;
      }

      // Routes 2 & 3: Direct PQC and Full Hybrid require Recipient Kyber PK
      if (!pkVal) {
        showToast(
          currentLang === "ar"
            ? "المفتاح العام للمستلم (Kyber-768) مطلوب لإتمام التشفير والتغليف!"
            : "Recipient Kyber-768 Public Key is required!",
          "error"
        );
        return;
      }

      // Full Hybrid: Proactive Capacity Verification
      if (wizardObjective === "full_hybrid" && currentUploadedCover && !lastCalculatedCapacity.isSufficient) {
        showToast(
          currentLang === "ar"
            ? `الصورة المختارة صغيرة جداً! الأبعاد المطلوبة على الأقل: ${lastCalculatedCapacity.minDim} × ${lastCalculatedCapacity.minDim} بكسل.`
            : `Selected cover image is too small! Required size: at least ${lastCalculatedCapacity.minDim}×${lastCalculatedCapacity.minDim} px.`,
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

      formData.append("recipient_kyber_pk_b64", pkVal);
      formData.append("preferred_cipher", cipherChoice);
      if (overrideVal) formData.append("override_type", overrideVal);
      if (channelRoomVal) formData.append("channel_room", channelRoomVal);
      formData.append("username", getActiveUser());
      formData.append("intent_objective", wizardObjective);
      formData.append("intent_sensitivity", wizardSensitivity);
      formData.append("sensitivity_level", wizardSensitivity);

      btnEncrypt.disabled = true;
      btnEncrypt.textContent = wizardObjective === "direct_pqc"
        ? (currentLang === "ar" ? "جارٍ تشفير كايبر الكمومي المباشر..." : "Encapsulating Kyber-768 & Encrypting...")
        : (currentLang === "ar" ? "جارٍ معالجة التشفير والتغليف..." : "Processing Multi-Level Pipeline...");

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
          showToast(
            currentLang === "ar"
              ? "تم توليد حزمة التشفير الكمومي المباشر (Direct PQC) بنجاح!"
              : "Direct PQC ciphertext package generated!",
            "success"
          );
        } else {
          renderEncryptionResult(result);
          showToast(
            currentLang === "ar"
              ? "اكتمل التشفير الهجين والتضمين الستيجانوغرافي بنجاح!"
              : "Encryption and steganographic embedding completed!",
            "success"
          );
        }

        if (channelRoomVal) {
          showToast(
            currentLang === "ar"
              ? `تم بث الحزمة المشفرة مباشرة إلى غرفة القناة: ${channelRoomVal}`
              : `Payload broadcasted to channel room: ${channelRoomVal}`,
            "info"
          );
        }
      } catch (e) {
        showToast((currentLang === "ar" ? "خطأ: " : "Error: ") + e.message, "error");
      } finally {
        btnEncrypt.disabled = false;
        if (wizardObjective === "direct_pqc") {
          btnEncrypt.textContent = currentLang === "ar"
            ? "⚡ تشفير كايبر كمومي مباشر (Direct PQC)"
            : "⚡ Direct PQC Encryption (Kyber-768)";
        } else {
          btnEncrypt.textContent = currentLang === "ar"
            ? "تنفيذ التشفير الهجين متعدد الطبقات والحجب"
            : "Execute Multi-Layer Encryption & Concealment";
        }
      }
    });
  }

  // Copy token button
  const btnCopyToken = document.getElementById("btn-copy-kyber-ct");
  if (btnCopyToken) {
    btnCopyToken.addEventListener("click", () => {
      const text = document.getElementById("output-kyber-ct").value;
      if (!text) return;
      navigator.clipboard.writeText(text);
      showToast(
        currentLang === "ar" ? "تم نسخ رمز كايبر المشفر إلى الحافظة بنجاح!" : "Kyber Token copied to clipboard!",
        "success"
      );
    });
  }

  // Download token button
  const btnDlToken = document.getElementById("btn-download-kyber-ct");
  if (btnDlToken) {
    btnDlToken.addEventListener("click", () => {
      const text = document.getElementById("output-kyber-ct").value;
      if (!text) return;
      downloadBlob(text, "kyber_ciphertext.token", "text/plain");
      showToast(currentLang === "ar" ? "تم تحميل ملف الرمز بنجاح!" : "Token file saved!", "success");
    });
  }
}

function renderEncryptionResult(result) {
  const placeholder = document.getElementById("encrypt-placeholder");
  const container = document.getElementById("encrypt-results-container");
  const dsaCard = document.getElementById("result-dsa-card");
  const pqcCard = document.getElementById("result-direct-pqc-card");
  if (placeholder) placeholder.classList.add("hidden");
  if (dsaCard) dsaCard.classList.add("hidden");
  if (pqcCard) pqcCard.classList.add("hidden");
  if (container) container.classList.remove("hidden");

  // Stego Preview
  const imgPreview = document.getElementById("stego-image-preview");
  const imgUrl = `data:image/png;base64,${result.stego_image_b64}`;
  if (imgPreview) imgPreview.src = imgUrl;

  const btnDl = document.getElementById("btn-download-stego");
  if (btnDl) btnDl.href = imgUrl;

  // Kyber Ciphertext
  const tokenEl = document.getElementById("output-kyber-ct");
  if (tokenEl) tokenEl.value = result.kyber_ciphertext_b64;

  // Telemetry
  const telPayload = document.getElementById("telem-payload-size");
  const telStego = document.getElementById("telem-stego-size");
  const telRoute = document.getElementById("telem-route");
  const telSig = document.getElementById("telem-signature");

  if (telPayload) telPayload.textContent = `${result.payload_size.toLocaleString()} Bytes`;
  if (telStego) telStego.textContent = `${result.stego_size.toLocaleString()} Bytes`;
  if (telRoute) telRoute.textContent = result.classification ? result.classification.route : "-";
  if (telSig) {
    telSig.textContent = result.signature_b64
      ? currentLang === "ar"
        ? "مرفق توقيع ECDSA P-256 موثق ✓"
        : "ECDSA P-256 Attached ✓"
      : currentLang === "ar"
        ? "غير مطلوب لهذا النوع"
        : "Not Required";
  }
}

function renderDsaResult(result) {
  const placeholder = document.getElementById("encrypt-placeholder");
  if (placeholder) placeholder.classList.add("hidden");
  const container = document.getElementById("encrypt-results-container");
  if (container) container.classList.add("hidden");
  const pqcCard = document.getElementById("result-direct-pqc-card");
  if (pqcCard) pqcCard.classList.add("hidden");

  const dsaCard = document.getElementById("result-dsa-card");
  if (dsaCard) dsaCard.classList.remove("hidden");

  const shaEl = document.getElementById("dsa-sha256-val");
  if (shaEl) shaEl.value = result.data_sha256 || "";
  const sigEl = document.getElementById("dsa-sig-val");
  if (sigEl) sigEl.value = result.dsa_signature_b64 || "";
  const pkEl = document.getElementById("dsa-pubkey-val");
  if (pkEl) pkEl.value = result.public_key_pem || "";

  const receiptJson = JSON.stringify(result.audit_receipt || result, null, 2);
  const btnDl = document.getElementById("btn-download-sig-receipt");
  if (btnDl) {
    btnDl.onclick = (e) => {
      e.preventDefault();
      downloadBlob(receiptJson, "signature_receipt.sig.json", "application/json");
      showToast(currentLang === "ar" ? "تم تحميل إيصال التوقيع الرقمي!" : "Signature receipt downloaded!", "success");
    };
  }

  const btnCopy = document.getElementById("btn-copy-sig");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(result.dsa_signature_b64 || "");
      showToast(currentLang === "ar" ? "تم نسخ التوقيع الرقمي إلى الحافظة!" : "Digital Signature copied to clipboard!", "success");
    };
  }
}

function renderDirectPqcResult(result) {
  const placeholder = document.getElementById("encrypt-placeholder");
  if (placeholder) placeholder.classList.add("hidden");
  const container = document.getElementById("encrypt-results-container");
  if (container) container.classList.add("hidden");
  const dsaCard = document.getElementById("result-dsa-card");
  if (dsaCard) dsaCard.classList.add("hidden");

  const pqcCard = document.getElementById("result-direct-pqc-card");
  if (pqcCard) pqcCard.classList.remove("hidden");

  const pkg = result.direct_pqc_package || result;
  const ctEl = document.getElementById("direct-ct-val");
  if (ctEl) ctEl.value = pkg.data_ciphertext_b64 || "";
  const kyberEl = document.getElementById("direct-kyber-val");
  if (kyberEl) kyberEl.value = pkg.kyber_ciphertext_b64 || "";

  const pkgJson = JSON.stringify(pkg, null, 2);
  const btnDl = document.getElementById("btn-download-direct-pqc");
  if (btnDl) {
    btnDl.onclick = (e) => {
      e.preventDefault();
      downloadBlob(pkgJson, "direct_pqc_package.json", "application/json");
      showToast(currentLang === "ar" ? "تم تحميل حزمة التشفير الكمومي!" : "Direct PQC package downloaded!", "success");
    };
  }

  const btnCopy = document.getElementById("btn-copy-direct-pqc");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(pkg.data_ciphertext_b64 || "");
      showToast(currentLang === "ar" ? "تم نسخ النص المشفر إلى الحافظة!" : "Direct PQC Ciphertext copied to clipboard!", "success");
    };
  }
}

/* ==========================================================================
   6. DECRYPTION PIPELINE (RECEIVER)
   ========================================================================== */
function initDecryptSection() {
  const btnDecrypt = document.getElementById("btn-execute-decrypt");
  const stegoInput = document.getElementById("decrypt-stego-file");
  const tokenInput = document.getElementById("decrypt-token-file");
  const skBrowse = document.getElementById("btn-browse-sk");
  const skInput = document.getElementById("decrypt-sk-file");

  if (stegoInput) {
    stegoInput.addEventListener("change", () => {
      if (stegoInput.files.length > 0) {
        const file = stegoInput.files[0];
        const previewBox = document.getElementById("decrypt-image-preview-box");
        const previewImg = document.getElementById("decrypt-image-preview");
        if (previewImg) previewImg.src = URL.createObjectURL(file);
        if (previewBox) previewBox.classList.remove("hidden");
      }
    });
  }

  if (tokenInput) {
    tokenInput.addEventListener("change", async () => {
      if (tokenInput.files.length > 0) {
        const text = await tokenInput.files[0].text();
        const input = document.getElementById("decrypt-kyber-ct");
        if (input) input.value = text.trim();
        showToast(currentLang === "ar" ? "تم تحميل رمز كايبر من الملف." : "Kyber token loaded from file.", "info");
      }
    });
  }

  if (skBrowse && skInput) {
    skBrowse.addEventListener("click", () => skInput.click());
    skInput.addEventListener("change", async () => {
      if (skInput.files.length > 0) {
        const text = await skInput.files[0].text();
        const input = document.getElementById("decrypt-kyber-sk");
        if (input) input.value = text.trim();
        showToast(currentLang === "ar" ? "تم تحميل المفتاح السري من الملف." : "Secret key loaded from file.", "info");
      }
    });
  }

  if (btnDecrypt) {
    btnDecrypt.addEventListener("click", async () => {
      const stegoFile = stegoInput?.files[0];
      const incomingStegoB64 = state.lastIncomingTransmission ? state.lastIncomingTransmission.stego_image_b64 : null;
      const kyberCt = document.getElementById("decrypt-kyber-ct")?.value.trim() || "";
      const kyberSk = document.getElementById("decrypt-kyber-sk")?.value.trim() || "";

      if (!stegoFile && !incomingStegoB64) {
        showToast(currentLang === "ar" ? "يرجى رفع صورة الإخفاء (PNG)." : "Please upload a Stego-Image PNG.", "error");
        return;
      }
      if (!kyberCt) {
        showToast(
          currentLang === "ar" ? "رمز كايبر المشفر (Kyber Token) مطلوب." : "Kyber-768 Ciphertext Token is required.",
          "error"
        );
        return;
      }
      if (!kyberSk) {
        showToast(
          currentLang === "ar" ? "المفتاح السري للمستلم مطلوب لفك التغليف." : "Recipient Kyber-768 Secret Key is required.",
          "error"
        );
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
      btnDecrypt.textContent = currentLang === "ar" ? "جارٍ فك التغليف والاستخراج..." : "Decapsulating Kyber & Extracting...";

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
        showToast(
          currentLang === "ar"
            ? "تم فك التغليف واستخراج البيانات بنجاح!"
            : "Payload extracted & decrypted successfully!",
          "success"
        );
      } catch (e) {
        showToast((currentLang === "ar" ? "خطأ في فك التشفير: " : "Extraction error: ") + e.message, "error");
      } finally {
        btnDecrypt.disabled = false;
        btnDecrypt.textContent = currentLang === "ar" ? "فك التغليف واستخراج البيانات الأصلية" : "Decapsulate & Extract Plaintext";
      }
    });
  }
}

function renderDecryptionResult(result) {
  const placeholder = document.getElementById("decrypt-placeholder");
  const container = document.getElementById("decrypt-results-container");
  if (placeholder) placeholder.classList.add("hidden");
  if (container) container.classList.remove("hidden");

  // Verification Banner
  const title = document.getElementById("verif-title");
  const desc = document.getElementById("verif-desc");

  if (result.signature_verified === true) {
    if (title) title.textContent = currentLang === "ar" ? "تم التحقق من النزاهة والموثوقية بنجاح" : "Integrity & Authenticity Verified";
    if (desc) desc.textContent = currentLang === "ar" ? "تم توثيق التوقيع الرقمي ECDSA P-256 بنجاح بمطابقته مع المفتاح العام للمرسل." : "ECDSA P-256 digital signature verified against sender's public key.";
  } else if (result.signature_verified === false) {
    if (title) title.textContent = currentLang === "ar" ? "فشل التحقق من التوقيع الرقمي!" : "Signature Verification FAILED";
    if (desc) desc.textContent = currentLang === "ar" ? "التوقيع الرقمي لا يتطابق مع محتوى المستند أو تم التلاعب به!" : "The signature did not match the document content!";
  } else {
    if (title) title.textContent = currentLang === "ar" ? "تم التحقق من النزاهة التشفيرية ووسم AEAD بنجاح" : "AEAD Tag & Checksum Verified";
    if (desc) desc.textContent = currentLang === "ar" ? "تم فك تشفير النص المشفر والتحقق من وسم التوثيق Poly1305 / GCM بنجاح تام." : "Poly1305 / GCM authenticated ciphertext decrypted cleanly.";
  }

  // Text Preview vs Binary Download
  const textGroup = document.getElementById("decrypt-text-preview-group");
  const fileGroup = document.getElementById("decrypt-file-download-group");
  const textArea = document.getElementById("decrypt-result-text");
  const btnDownloadFile = document.getElementById("btn-download-recovered-file");
  const filenameSpan = document.getElementById("rec-filename");

  if (result.is_text) {
    if (textGroup) textGroup.classList.remove("hidden");
    if (textArea) textArea.value = result.text_preview;
  } else {
    if (textGroup) textGroup.classList.add("hidden");
  }

  // Setup file download
  if (filenameSpan) filenameSpan.textContent = result.filename;
  if (result.data_b64 && btnDownloadFile) {
    const binaryData = atob(result.data_b64);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    btnDownloadFile.href = URL.createObjectURL(blob);
    btnDownloadFile.download = result.filename;
    if (fileGroup) fileGroup.classList.remove("hidden");
  }

  // Metadata
  const recData = document.getElementById("rec-data-type");
  const recCiph = document.getElementById("rec-cipher");
  const recSig = document.getElementById("rec-sig-status");

  if (recData) recData.textContent = result.data_type ? result.data_type.toUpperCase() : "-";
  if (recCiph) recCiph.textContent = result.cipher_used ? result.cipher_used.toUpperCase() : "-";
  if (recSig) {
    recSig.textContent = result.signature_verified === true
      ? currentLang === "ar" ? "موثق وصحيح ✓" : "Verified (Valid) ✓"
      : currentLang === "ar" ? "غير مطلوب / غير مرفق" : "N/A";
  }
}

/* ==========================================================================
   7. LIVE SENDER ⇄ RECEIVER CHANNEL (WEBSOCKETS)
   ========================================================================== */
function initChannelSection() {
  const btnJoin = document.getElementById("btn-join-channel");
  const roomInput = document.getElementById("channel-room-input");
  const btnTransfer = document.getElementById("btn-load-incoming-to-decrypt");

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

      const trans = state.lastIncomingTransmission;
      const ctInput = document.getElementById("decrypt-kyber-ct");
      if (ctInput) ctInput.value = trans.kyber_ciphertext_b64;

      const previewBox = document.getElementById("decrypt-image-preview-box");
      const previewImg = document.getElementById("decrypt-image-preview");
      if (previewImg) previewImg.src = `data:image/png;base64,${trans.stego_image_b64}`;
      if (previewBox) previewBox.classList.remove("hidden");

      // Switch Tab to Decrypt
      const decTab = document.querySelector('.nav-tab[data-target="section-decrypt"]');
      if (decTab) decTab.click();
      showToast(
        currentLang === "ar"
          ? "تم تحميل الحزمة المستلمة في قسم فك التشفير بنجاح! انقر على زر فك التغليف."
          : "Incoming package loaded into Decrypt section. Click Decapsulate!",
        "success"
      );
    });
  }
}

function connectToChannel(roomId) {
  if (state.socket) {
    state.socket.close();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/channel/${encodeURIComponent(roomId)}`;

  appendChannelLog(
    currentLang === "ar" ? `جارٍ الاتصال بغرفة القناة: ${roomId}...` : `Connecting to WebSocket room: ${roomId}...`,
    "system"
  );

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    state.activeRoom = roomId;
    const indicator = document.getElementById("channel-indicator");
    const statusLabel = document.getElementById("channel-status-label");
    const roomBadge = document.getElementById("room-status-badge");
    const roomIdEl = document.getElementById("room-current-id");

    if (indicator) indicator.className = "status-indicator online";
    if (statusLabel) statusLabel.textContent = currentLang === "ar" ? `القناة: ${roomId}` : `Channel: ${roomId}`;
    if (roomBadge) {
      roomBadge.textContent = currentLang === "ar" ? "متصل (بانتظار الحزم)" : "Connected (Listening)";
      roomBadge.className = "text-success";
    }
    if (roomIdEl) roomIdEl.textContent = roomId;

    appendChannelLog(
      currentLang === "ar"
        ? `تم الاتصال بغرفة القناة: ${roomId}. جاهز لاستقبال وإرسال الحزم المشفرة.`
        : `Connected to live room: ${roomId}. Ready for transmissions.`,
      "system"
    );
    showToast(
      currentLang === "ar" ? `تم الاتصال بالقناة: ${roomId}` : `Connected to Channel: ${roomId}`,
      "success"
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "new_transmission") {
        state.lastIncomingTransmission = data;
        appendChannelLog(
          currentLang === "ar"
            ? `⚡ [حزمة جديدة] الناقل: ${data.filename || "stego_carrier.png"}، حجم البيانات: ${data.payload_size} بايت`
            : `⚡ [New Transmission] Carrier: ${data.filename || "stego_carrier.png"}, Payload: ${data.payload_size}B`,
          "incoming"
        );

        const pulse = document.getElementById("channel-pulse");
        const alertBox = document.getElementById("incoming-alert-box");
        const incomingDesc = document.getElementById("incoming-desc");

        if (pulse) pulse.classList.remove("hidden");
        if (alertBox) alertBox.classList.remove("hidden");
        if (incomingDesc) {
          incomingDesc.textContent = currentLang === "ar"
            ? `تم الاستلام من الغرفة ${data.room_id}: ${data.filename || "بيانات"} (${data.payload_size} بايت)`
            : `Received from room ${data.room_id}: ${data.filename || "data"} (${data.payload_size} bytes)`;
        }

        showToast(
          currentLang === "ar"
            ? "⚡ استلمت القناة حزمة إخفاء وتشفير كمومية جديدة!"
            : "⚡ Incoming Stego Package received on Channel!",
          "warning"
        );
      }
    } catch (e) { }
  };

  socket.onclose = () => {
    const indicator = document.getElementById("channel-indicator");
    const statusLabel = document.getElementById("channel-status-label");
    const roomBadge = document.getElementById("room-status-badge");

    if (indicator) indicator.className = "status-indicator offline";
    if (statusLabel) statusLabel.textContent = currentLang === "ar" ? "القناة: غير متصلة" : "Channel: Offline";
    if (roomBadge) {
      roomBadge.textContent = currentLang === "ar" ? "غير متصل" : "Disconnected";
      roomBadge.className = "text-muted";
    }
    appendChannelLog(currentLang === "ar" ? "تم إغلاق الاتصال بالقناة." : "Channel connection closed.", "system");
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
const ARCH_STAGES_DATA = {
  ar: {
    1: {
      title: "المرحلة 01: مصنف الحزم الذكي",
      desc: "اختيار مسار المعالجة الديناميكي بناءً على ترويسة الملف وتحليل الإنتروبيا.",
      standard: "IEEE / RFC Heuristics",
      primitive: "فاحص MIME والإنتروبيا",
      security: "توجيه تشفيري حساس للسياق",
      io: "بايتات صافية ← تحديد المسار",
      latency: "< 0.05 مللي ثانية (داخل الذاكرة)",
      math: "فحص توزيع بايتات الحزمة، وتواقيع MIME، وأنماط الاعتماد عالية الإنتروبيا (رموز التوثيق، المفاتيح الخاصة، أسرار API)، وتوجيه المدخلات نحو ثلاث طبقات أمنية معزولة:",
      steps: [
        "بيانات ضخمة (≥64KB / وسائط): مسار تشفير متناظر فائق السرعة عبر ChaCha20-Poly1305.",
        "بيانات اعتماد حساسة: تشفير ثنائي الطبقات مع تغليف مفاتيح مؤقت.",
        "مستندات وضمان النزاهة: تغليف بتوقيع رقمي ECDSA P-256 لمنع الإنكار."
      ],
      defense: "يمنع الوقوع في فخ 'خوارزمية واحدة لكافة الأحجام' بفرض خوارزميات ARX الثابتة زمنياً على الأهداف الحساسة وربط التجزئة غير القابلة للعبث بالمستندات."
    },
    2: {
      title: "المرحلة 02: التوجيه والتشفير التناظري",
      desc: "تنفيذ الخوارزميات التشفيرية المخصصة بحسب نوع الحزمة المصنفة لضمان السرعة والسرية.",
      standard: "RFC 8439 / NIST SP 800-38D",
      primitive: "ChaCha20-Poly1305 / ECDH / ECDSA",
      security: "أمان متناظر 128 بت / منحنيات إهليلجية",
      io: "نص صريح ← نص مشفر + وسم مصادقة",
      latency: "~0.12 مللي ثانية (تحسينات ARX)",
      math: "تطبيق عمليات الجمع والتدوير والتطابق الجمعي (ARX) الثابتة زمنياً على كتل حالة 512 بت، مما يقضي كلياً على ثغرات جداول البحث مع حساب وسم Poly1305 للاستخدام لمرة واحدة.",
      steps: [
        "مصفوفة ChaCha20: مصفوفة 4×4 من كلمات 32 بت (تنفيذ ثابت زمنياً عبر مختلف المعالجات).",
        "وسم Poly1305: حساب وسم مصادقة بطول 16 بايت بمقياس 2^130 - 5.",
        "تواقيع ECDSA: توقيع ملخصات المستندات عبر زمر منحنيات إهليلجية أولية الترتيب."
      ],
      defense: "يضمن السرية التامة وسلامة المصادقة ضد هجمات القنوات الجانبية المعتمدة على التوقيت في البيئات التي تفتقر لتسريع AES-NI."
    },
    3: {
      title: "المرحلة 03: التغليف الكمومي ML-KEM-768 (كايبر)",
      desc: "آلية تغليف المفاتيح المعتمدة على شبيكات الوحدات واشتقاق المفاتيح الفرعية عبر HKDF.",
      standard: "NIST FIPS 203 / ML-KEM",
      primitive: "تغليف شبيكات Module-LWE",
      security: "الفئة الثالثة لـ NIST (مقاومة للحوسبة الكمومية)",
      io: "مفتاح عام 1,184B ← نص مشفر 1,088B + سر 32B",
      latency: "~0.25 مللي ثانية (ضرب كثيرات الحدود)",
      math: "توليد أزواج المفاتيح وتغليف الأسرار المشتركة استناداً لصلابة مسألة تعلم الوحدات مع الأخطاء (M-LWE) عبر حلقات كثيرات الحدود R_q = Z_q[X]/(X^256 + 1)، ثم اشتقاق مفتاح الحزمة وبذرة الإخفاء عبر HKDF-SHA256.",
      steps: [
        "التغليف (Encapsulate): توليد غلاف مشفر شبيكي بطول 1,088 بايت باستخدام المفتاح العام للمستلم.",
        "السر المشترك (Shared Secret): استخراج سر شبيكي عالي العشوائية بطول 32 بايت.",
        "توسيع HKDF: اشتقاق مفتاح مستقل بطول 32 بايت للبيانات وبذرة مستقلة بطول 32 بايت للإخفاء."
      ],
      defense: "يحمي البيانات من هجمات 'احصد الآن وفك التشفير لاحقاً' الكمومية. لا توجد خوارزمية كمومية قادرة على كسر M-LWE في زمن متعدد الحدود."
    },
    4: {
      title: "المرحلة 04: الحجب والإخفاء الستيجانوغرافي المكاني",
      desc: "تبديل عشوائي للبكسلات ببذرة كايبر وتضمين البت الأقل أهمية (LSB) في صور PNG غير فاقدة.",
      standard: "الإخفاء المكاني LSB / PNG غير الفاقدة",
      primitive: "تبديل عشوائي زائف مبذور",
      security: "انعدام التغيير البصري كلياً (ΔE < 0.05)",
      io: "حزمة مشفرة + غلاف PNG ← صورة إخفاء ناقلة",
      latency: "~1.2 مللي ثانية (تبديل متوازٍ للبكسلات)",
      math: "تهيئة خوارزمية التبديل العشوائي الزائف (Fisher-Yates) المبذورة بـ 32 بايت مشتقة من كايبر، ثم تضمين بتات الحزمة المشفرة داخل البت الأقل أهمية (LSB) لإحداثيات RGB غير متتالية.",
      steps: [
        "تبديل مؤشرات البكسلات: مسار غير متسلسل وسري عبر قنوات الألوان RGB.",
        "تعديل LSB: استبدال البت الأقل وزناً بتغير طفيف في الإضاءة غير محسوس للعين البشرية.",
        "حماية الدقة البصرية: الحفاظ التام على الجودة والنزاهة في صيغ PNG بدون أي ضغط فاقد."
      ],
      defense: "يحصن البيانات ضد هجمات كشف الإخفاء الإحصائية (Chi-Square) بإلغاء النمط التتابعي. يستحيل على المتنصت كشف وجود البيانات أو استخراجها بدون مفتاح كايبر السري."
    }
  },
  en: {
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
  }
};

function selectStage(stageNum) {
  currentActiveStage = stageNum;
  const stageCards = document.querySelectorAll(".arch-stage-card");
  stageCards.forEach((c) => {
    if (parseInt(c.dataset.stage, 10) === stageNum) {
      c.classList.add("active");
    } else {
      c.classList.remove("active");
    }
  });

  const langKey = currentLang === "en" ? "en" : "ar";
  const data = ARCH_STAGES_DATA[langKey][stageNum];
  if (!data) return;

  const titleEl = document.getElementById("inspector-stage-title");
  const descEl = document.getElementById("inspector-stage-desc");
  const stdEl = document.getElementById("inspector-stage-standard");
  const primEl = document.getElementById("insp-metric-primitive");
  const secEl = document.getElementById("insp-metric-security");
  const ioEl = document.getElementById("insp-metric-io");
  const latEl = document.getElementById("insp-metric-latency");
  const mathEl = document.getElementById("insp-dive-math");
  const defEl = document.getElementById("insp-dive-defense");
  const listContainer = document.getElementById("insp-dive-steps");

  if (titleEl) titleEl.textContent = data.title;
  if (descEl) descEl.textContent = data.desc;
  if (stdEl) stdEl.textContent = data.standard;
  if (primEl) primEl.textContent = data.primitive;
  if (secEl) secEl.textContent = data.security;
  if (ioEl) ioEl.textContent = data.io;
  if (latEl) latEl.textContent = data.latency;
  if (mathEl) mathEl.textContent = data.math;
  if (defEl) defEl.textContent = data.defense;

  if (listContainer) {
    listContainer.innerHTML = "";
    data.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      listContainer.appendChild(li);
    });
  }
}

function initInteractiveArchitecture() {
  const stageCards = document.querySelectorAll(".arch-stage-card");
  const btnSim = document.getElementById("btn-run-arch-sim");
  const simTrack = document.getElementById("sim-progress-track");
  const simFill = document.getElementById("sim-progress-fill");
  const simBtnText = document.getElementById("sim-btn-text");

  // Initial stage render
  selectStage(currentActiveStage);

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
      if (simBtnText) simBtnText.textContent = currentLang === "ar" ? "جارٍ محاكاة التدفق..." : "Simulating Flow...";
      if (simTrack) simTrack.classList.add("active");

      let currentStep = 1;
      selectStage(currentStep);
      if (simFill) simFill.style.width = "25%";
      if (stageCards[0]) stageCards[0].classList.add("simulating");

      const interval = setInterval(() => {
        stageCards.forEach((c) => c.classList.remove("simulating"));
        currentStep++;

        if (currentStep <= 4) {
          selectStage(currentStep);
          if (simFill) simFill.style.width = `${currentStep * 25}%`;
          if (stageCards[currentStep - 1]) stageCards[currentStep - 1].classList.add("simulating");
        } else {
          clearInterval(interval);
          stageCards.forEach((c) => c.classList.remove("simulating"));
          if (simTrack) simTrack.classList.remove("active");
          if (simFill) simFill.style.width = "0%";
          btnSim.disabled = false;
          if (simBtnText) simBtnText.textContent = currentLang === "ar" ? "محاكاة تدفق المسار" : "Simulate Pipeline Flow";
          showToast(
            currentLang === "ar"
              ? "اكتملت محاكاة تدفق المسار التشفيري بنجاح!"
              : "Pipeline flow simulation completed successfully!",
            "success"
          );
        }
      }, 750);
    });
  }
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
      if (formLogin) formLogin.classList.remove("hidden");
      if (formRegister) formRegister.classList.add("hidden");
      if (loginErr) loginErr.classList.add("hidden");
    });

    tabRegister.addEventListener("click", () => {
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      if (formRegister) formRegister.classList.remove("hidden");
      if (formLogin) formLogin.classList.add("hidden");
      if (regErr) regErr.classList.add("hidden");
    });
  }

  // Login submit
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username")?.value.trim();
      const p = document.getElementById("login-password")?.value;
      if (!u || !p) return;

      try {
        const stored = JSON.parse(localStorage.getItem(`fgp_user_${u}`));
        if (!stored) throw new Error(currentLang === "ar" ? "المستخدم غير موجود" : "User not found");
        if (stored.password !== p) throw new Error(currentLang === "ar" ? "كلمة المرور غير صحيحة" : "Incorrect password");
        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(currentLang === "ar" ? `مرحباً بك مجدداً ${u}! تم تسجيل الدخول بنجاح` : `Welcome back, ${u}! Signed in successfully`, "success");
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
      const u = document.getElementById("reg-username")?.value.trim();
      const p = document.getElementById("reg-password")?.value;
      const cp = document.getElementById("reg-confirm-password")?.value;

      if (p !== cp) {
        if (regErr) {
          regErr.textContent = currentLang === "ar" ? "كلمتا المرور غير متطابقتين!" : "Passwords do not match!";
          regErr.classList.remove("hidden");
        }
        return;
      }

      try {
        localStorage.setItem(`fgp_user_${u}`, JSON.stringify({ password: p }));
        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(currentLang === "ar" ? `تم إنشاء الحساب بنجاح! أهلاً بك يا ${u}` : `Account created! Welcome, ${u}`, "success");
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

  try {
    const res = await fetch(`/api/audit/logs?username=${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    allAuditLogs = data.logs || [];

    const totalCount = allAuditLogs.length;
    const encCount = allAuditLogs.filter((l) => l.action === "encrypt").length;
    const decCount = allAuditLogs.filter((l) => l.action === "decrypt").length;
    const keyCount = allAuditLogs.filter((l) => l.action === "keygen").length;

    const elTotal = document.getElementById("audit-stat-total");
    const elEnc = document.getElementById("audit-stat-encrypt");
    const elDec = document.getElementById("audit-stat-decrypt");
    const elKey = document.getElementById("audit-stat-keygen");

    if (elTotal) elTotal.textContent = totalCount;
    if (elEnc) elEnc.textContent = encCount;
    if (elDec) elDec.textContent = decCount;
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

    let detailsHtml = "";
    if (typeof log.details === "object") {
      const parts = [];
      if (log.details.filename) parts.push(`<strong>${log.details.filename}</strong>`);
      if (log.details.cipher) parts.push(`<span class="badge badge-accent">${log.details.cipher}</span>`);
      if (log.details.payload_size) parts.push(currentLang === "ar" ? `حجم: ${log.details.payload_size}` : `Size: ${log.details.payload_size}`);
      if (log.details.kyber_token_id) parts.push(currentLang === "ar" ? `رمز كايبر: <code>${log.details.kyber_token_id}</code>` : `Kyber ID: <code>${log.details.kyber_token_id}</code>`);
      if (log.details.algorithm) parts.push(`<code>${log.details.algorithm}</code>`);
      if (log.details.pk_length) parts.push(currentLang === "ar" ? `مفتاح عام: ${log.details.pk_length}B` : `Public Key: ${log.details.pk_length}B`);
      if (log.details.signature_verified !== undefined) {
        if (log.details.signature_verified) {
          parts.push(currentLang === "ar" ? '<span class="text-success">توقيع رقمي موثق ✓</span>' : '<span class="text-success">ECDSA Signature Verified ✓</span>');
        } else {
          parts.push(currentLang === "ar" ? 'بدون توقيع' : 'No Signature');
        }
      }
      detailsHtml = parts.join(" &bull; ") || JSON.stringify(log.details);
    } else {
      detailsHtml = String(log.details);
    }

    const statusBadge =
      log.status === "success"
        ? currentLang === "ar"
          ? '<span class="badge badge-success">ناجحة ✓</span>'
          : '<span class="badge badge-success">Success ✓</span>'
        : currentLang === "ar"
          ? '<span class="badge badge-warning">فشل ⚠</span>'
          : '<span class="badge badge-warning">Failed ⚠</span>';

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

function getActiveUser() {
  return localStorage.getItem("fgp_auth_user") || "guest";
}

/* ==========================================================================
   BILINGUAL I18N CONTROLLER (ENGLISH & ARABIC)
   ========================================================================== */
const I18N_DATA = {
  ar: {
    doc_title: "منظومة التشفير الهجين المقاوم للحوسبة الكمومية والإخفاء • مشروع التخرج",
    lang_btn: "English",
    lang_toggle_title: "تبديل اللغة / Toggle Language",
    inst_logos_title: "الجامعة المستنصرية • كلية الهندسة",
    brand_title: "نظام التشفير المقاوم للكم",
    brand_sub: "الجامعة المستنصرية • كلية الهندسة",
    badge_grad: "مشروع التخرج",
    nav_home: "الرئيسية",
    nav_info: "معلومات النظام",
    nav_encrypt: "تشفير وحجب",
    nav_decrypt: "فك التشفير",
    nav_channel: "قناة البث",
    nav_audit: "سجل العمليات",
    channel_offline: "القناة: غير متصلة",
    channel_online: "القناة: متصلة",
    theme_accent: "اللون",
    theme_btn_title: "تغيير سمة الألوان (20 لوناً)",
    theme_popover_title: "لوحة الألوان (20 لوناً)",
    mode_toggle_title: "تبديل النمط الداكن / الفاتح",
    theme_mode_dark: "داكن",
    theme_mode_light: "فاتح",
    vault_btn: "خزنة المفاتيح",
    logout_title: "تسجيل الخروج",

    // Home Section & Quick Menus
    home_badge_stego: "إخفاء PNG غير فاقد",
    home_title: "منظومة الأمان السيبراني الهجين المقاوم للحوسبة الكمومية",
    home_subtitle: "منصة مبسطة ومتكاملة لتشفير النصوص والملفات باستخدام خوارزميات ما بعد الكم (Kyber-768) والتشفير الموثق (ChaCha20 / AES-GCM)، مع إخفاء البيانات داخل صور PNG نقية دون أي أثر بصري.",
    home_cta_encrypt: "ابدأ التشفير والحجب",
    home_cta_decrypt: "استخراج وفك التشفير",
    home_cta_vault: "خزنة المفاتيح المحلية",
    home_step1_title: "تصنيف وتشفير",
    home_step1_desc: "توجيه تلقائي وتشفير عبر ChaCha20 أو AES-256-GCM",
    home_step2_title: "تغليف كمومي (Kyber-768)",
    home_step2_desc: "حماية المفاتيح ضد الحوسبة الكمومية وفق NIST FIPS 203",
    home_step3_title: "إخفاء داخل صورة (LSB)",
    home_step3_desc: "تضمين البيانات المشفرة داخل صورة PNG بتبديل عشوائي",
    home_menu_heading: "القوائم والأدوات الرئيسية",
    home_menu_sub: "اختر القسم المطلوب للانتقال المباشر وتنفيذ العمليات بسهولة.",
    menu_enc_title: "التشفير والحجب",
    menu_enc_badge: "المرسل",
    menu_enc_desc: "تشفير الرسائل النصية أو الملفات وتغليفها بمفتاح كايبر، ثم إخفاؤها داخل صورة PNG ناقلة.",
    menu_dec_title: "فك التشفير والاستخراج",
    menu_dec_badge: "المستلم",
    menu_dec_desc: "استخراج البيانات المخفية من صورة الإخفاء وفك تغليف رمز كايبر والتحقق من التواقيع الرقمية.",
    menu_chan_title: "قناة البث المباشر",
    menu_chan_badge: "لحظي",
    menu_chan_desc: "مزامنة فورية بين المرسل والمستلم عبر غرف WebSocket لتبادل صور الإخفاء والرموز لحظياً.",
    menu_vault_title: "خزنة المفاتيح (Key Vault)",
    menu_vault_badge: "ML-KEM-768",
    menu_vault_desc: "توليد أزواج المفاتيح العامة والسرية محلياً في المتصفح وتصديرها أو تعبئتها تلقائياً في النماذج.",
    menu_audit_title: "سجل العمليات والتدقيق",
    menu_audit_badge: "تتبع",
    menu_audit_desc: "مراجعة إحصائيات الجلسة وسجل عمليات التشفير وفك التشفير وتوليد المفاتيح وتصديرها بصيغة JSON.",
    menu_info_title: "معلومات النظام والفريق",
    menu_info_badge: "مرجع أكاديمي",
    menu_info_desc: "شرح المعمارية الهندسية، محاكاة المسار التفاعلي، مقارنات الخوارزميات، وفريق مشروع التخرج.",
    menu_open_btn: "فتح القسم",
    menu_open_vault_btn: "فتح الخزنة",
    info_tab_all: "عرض الكل",
    info_tab_arch: "مسار المعمارية والمحاكاة",
    info_tab_dec: "المقارنات والقرارات الهندسية",
    info_tab_team: "فريق المشروع والإشراف",

    // Auth Gateway
    auth_badge: "مشروع التخرج الهندسي",
    auth_title: "نظام الأمان السيبراني الهجين المقاوم للحوسبة الكمومية",
    auth_sub: "الجامعة المستنصرية • كلية الهندسة • قسم هندسة الحاسوب",
    tab_login: "تسجيل الدخول",
    tab_register: "إنشاء حساب جديد",
    lbl_login_user: "اسم المستخدم:",
    lbl_login_user_placeholder: "أدخل اسم المستخدم...",
    lbl_login_pass: "كلمة المرور:",
    lbl_login_pass_placeholder: "••••••••",
    lbl_reg_user: "اسم المستخدم الجديد:",
    lbl_reg_user_placeholder: "اختر اسم المستخدم...",
    lbl_reg_pass: "كلمة المرور:",
    lbl_reg_pass_placeholder: "4 أحرف أو أرقام على الأقل...",
    lbl_reg_confirm: "تأكيد كلمة المرور:",
    lbl_reg_confirm_placeholder: "أعد إدخال كلمة المرور...",
    btn_login: "تسجيل الدخول والمتابعة",
    btn_register: "إنشاء الحساب وتفعيل النظام",
    btn_guest: "🚀 الدخول كضيف للاختبار السريع (Guest Access)",

    // Key Vault Modal
    vault_modal_title: "خزنة مفاتيح كايبر المحلية (ML-KEM-768 Local Vault)",
    vault_modal_desc: "يتم توليد المفاتيح محلياً داخل الذاكرة باستخدام شبكات NIST FIPS 203. المفاتيح السرية لا تغادر جهازك إطلاقاً.",
    vault_gen_btn: "⚡ توليد زوج مفاتيح كايبر",
    vault_export_pk: "حفظ المفتاح العام (.key)",
    vault_export_sk: "حفظ المفتاح السري (.key)",
    vault_lbl_pk: "المفتاح العام (1,184 بايت • رمز التشفير للمرسل):",
    vault_placeholder_pk: "قم بتوليد المفاتيح لاشتقاق رمز التشفير العام...",
    vault_lbl_sk: "المفتاح السري (2,400 بايت • مفتاح فك التشفير الخاص):",
    vault_placeholder_sk: "المفتاح السري سيُخزن محلياً فقط...",
    vault_use_btn: "تحميل المفاتيح إلى سير العمل",

    // Section 1: System Info
    banner_uni: "الجامعة المستنصرية • كلية الهندسة",
    banner_coll: "مشروع التخرج النهائي • منظومة الأمان السيبراني المقاومة للكم والإخفاء",
    hero_badge_2: "NIST FIPS 203 ML-KEM",
    hero_badge_3: "مناقشة كلية الهندسة",
    hero_info_title: "معلومات النظام والمرجع الفني والرياضي",
    hero_info_desc: "التوثيق الرسمي لأطروحة مشروع التخرج الهندسي الذي يغطي مسار التشفير الهجين متعدد الطبقات، ومصفوفة القرارات الرياضية، والتوجيه الكلاسيكي والكمومي، وفريق العمل الأكاديمي.",
    arch_card_title: "مسار المعمارية التفاعلي ومحاكاة التدفق",
    sim_btn_text: "محاكاة تدفق المسار",
    arch_card_subtitle: "انقر على أي مرحلة أدناه لمعاينة النماذج الرياضية، تحويلات البايتات، ومعايير الأمان في لوحة الفحص الفنية.",
    stage_1_num: "المرحلة 01",
    stage_1_title: "تصنيف وتحديد الحزم",
    stage_1_desc: "فحص الحجم والإنتروبيا وتوقيع MIME",
    stage_1_chip1: "بيانات ضخمة (≥64KB)",
    stage_1_chip2: "رموز حساسة",
    stage_1_chip3: "مستندات موثقة",
    stage_2_num: "المرحلة 02",
    stage_2_title: "التوجيه والتشفير التناظري",
    stage_2_desc: "خوارزميات ARX الثابتة زمنياً وبروتوكولات التشفير",
    stage_2_chip1: "ChaCha20-Poly1305",
    stage_2_chip2: "ECDH P-256",
    stage_2_chip3: "ECDSA P-256",
    stage_3_num: "المرحلة 03",
    stage_3_title: "التغليف الكمومي ML-KEM-768",
    stage_3_desc: "دروع شبكات كايبر واشتقاق HKDF",
    stage_3_chip1: "نص مشفر 1,088 بايت",
    stage_3_chip2: "سر مشترك 32 بايت",
    stage_3_chip3: "HKDF-SHA256",
    stage_4_num: "المرحلة 04",
    stage_4_title: "الحجب والإخفاء الستيجانوغرافي",
    stage_4_desc: "تبديل عشوائي للبكسلات بصيغة PNG غير الفاقدة",
    stage_4_chip1: "تعديل بتات LSB",
    stage_4_chip2: "خلط معتمد على كايبر",
    stage_4_chip3: "ΔE < 0.05",
    insp_lbl_prim: "التقنية الأساسية",
    insp_lbl_sec: "الضمان الأمني",
    insp_lbl_io: "المدخلات والمخرجات",
    insp_lbl_lat: "زمن التنفيذ المقدر",
    insp_lbl_math: "التنفيذ الحسابي والرياضي للخوارزمية",
    insp_lbl_def: "نموذج التهديد والضمانات الأمنية",
    insp_leak_label: "انعدام التسريب:",
    insp_override_label: "توجيه حتمي:",

    // Decisions & Comparisons
    dec_heading: "القرارات التشفيرية والتبريرات الهندسية",
    dec_badge_1: "التقنية 1",
    dec_title_1: "ChaCha20-Poly1305 مقابل AES-256-GCM",
    dec_desc_1: "يعتمد AES على جداول بحث برمجية (S-Boxes) عرضة <em>لهجمات التوقيت عبر الذاكرة المخبأة (Cache-Timing Attacks)</em> في غياب العتاد المتخصص (AES-NI). بينما يستخدم ChaCha20 عمليات <strong>الجمع والتدوير والتطابق الجمعي (ARX)</strong> الثابتة زمنياً بشكل تام عبر مختلف المعالجات.",
    dec_th_metric: "المعيار",
    dec_th_chacha: "ChaCha20-Poly1305",
    dec_th_aes: "AES-256-GCM",
    d1_r1_c1: "معمارية التصميم",
    d1_r1_c2: "تنفيذ ARX ثابت زمنياً",
    d1_r1_c3: "استبدال وتبديل (SPN)",
    d1_r2_c1: "الحصانة ضد هجمات التوقيت",
    d1_r2_c2: "محصن كلياً (ثابت زمنياً)",
    d1_r2_c3: "عرضة للهجوم بدون تعليمات AES-NI",
    d1_r3_c1: "طول المفتاح وقيمة Nonce",
    d1_r3_c2: "مفتاح 256 بت / Nonce 96 بت",
    d1_r3_c3: "مفتاح 256 بت / IV 96 بت",
    d1_r4_c1: "المعايير الدولية",
    d1_r4_c2: "RFC 8439, TLS 1.3",
    d1_r4_c3: "NIST SP 800-38D, TLS 1.3",

    dec_badge_2: "التقنية 2",
    dec_title_2: "منحنيات ECC (ECDH / ECDSA) مقابل RSA التقليدي",
    dec_desc_2: "استناداً إلى البنية الجبرية للمنحنيات الإهليلجية عبر الحقول المنتهية، تحقق منحنيات ECC مستوى أمان 128 بت بمفتاح مدمج بطول <strong>64 بايت</strong> مقارنة بمفتاح ضخم بطول <strong>384 بايت</strong> في RSA-3072، مع سرعة تفاوض تفوق RSA بـ 10 إلى 25 ضعفاً.",
    dec_th_ecc: "ECC (P-256)",
    dec_th_rsa: "RSA-3072",
    d2_r1_c1: "حجم المفتاح العام",
    d2_r1_c2: "64 بايت",
    d2_r1_c3: "384 بايت (أكبر بـ 6 أضعاف)",
    d2_r2_c1: "زمن التوقيع",
    d2_r2_c2: "~0.1 مللي ثانية",
    d2_r2_c3: "~2.5 مللي ثانية",
    d2_r3_c1: "استهلاك الموارد",
    d2_r3_c2: "منخفض جداً",
    d2_r3_c3: "حمل حسابي أسي مرتفع",
    d2_r4_c1: "خوارزمية شور الكمومية",
    d2_r4_c2: "عرضة للاختراق كمومياً",
    d2_r4_c3: "عرضة للاختراق كمومياً",

    dec_badge_3: "التقنية 3",
    dec_title_3: "تواقيع DSA / ECDSA مقابل توقيع ElGamal",
    dec_desc_3: "تنتج تواقيع ElGamal أحجام تواقيع مضاعفة بمقياس المعامل الأولي <em>p</em>. لذا اعتمدت NIST معيار DSA للعمل في زمرة جزئية أولية، مولدة تواقيع مدمجة (~64 بايت عبر ECDSA) مع سرعة تحقق فائقة.",
    dec_th_scheme: "نظام التوقيع",
    dec_th_sigsize: "حجم التوقيع",
    dec_th_arith: "التعقيد الحسابي",
    d3_r1_c1: "توقيع ElGamal",
    d3_r1_c2: "ضعف طول المعامل (2×)",
    d3_r1_c3: "حساب أسي على المعامل بالكامل",
    d3_r2_c1: "DSA / ECDSA",
    d3_r2_c2: "مدمج (64 بايت)",
    d3_r2_c3: "عمليات على منحنيات الزمرة الجزئية",

    dec_badge_4: "مرساة PQC",
    dec_title_4: "معيار NIST FIPS 203 ML-KEM-768 (كايبر)",
    dec_desc_4: "يعتمد كايبر على صلابة مسألة <em>تعلم الوحدات مع الأخطاء (M-LWE)</em> في الشبيكات المهيكلة. لا توجد خوارزمية كمومية معروفة (بما في ذلك شور وغروفر) قادرة على حلها بزمن متعدد الحدود، مما يضمن أماناً أبدياً لما بعد الكم.",
    dec_th_param: "المعامل",
    dec_th_val: "القيمة",
    dec_th_purpose: "الغرض التشفيري",
    d4_r1_c1: "المفتاح العام (pk)",
    d4_r1_c2: "1,184 بايت",
    d4_r1_c3: "رمز التغليف للمرسل",
    d4_r2_c1: "المفتاح السري (sk)",
    d4_r2_c2: "2,400 بايت",
    d4_r2_c3: "رمز فك التغليف للمستلم",
    d4_r3_c1: "النص المشفر (ct)",
    d4_r3_c2: "1,088 بايت",
    d4_r3_c3: "تغليف المفتاح المقاوم للكم",
    d4_r4_c1: "السر المشترك (ss)",
    d4_r4_c2: "32 بايت",
    d4_r4_c3: "بذرة اشتقاق مفتاح التشفير وبذرة الإخفاء عبر HKDF",

    // Team Presentation Deck
    team_deck_title: "فريق مشروع التخرج والإشراف الأكاديمي",
    team_deck_sub: "الجامعة المستنصرية • كلية الهندسة • مناقشة مشاريع التخرج",
    sup_tag: "المشرف الأكاديمي",
    sup_peek: "مرر المؤشر لمعاينة السيرة",
    sup_name: "أ.م.د. حيدر طارش",
    sup_role: "المشرف الأكاديمي وموجه المشروع",
    sup_dept: "الجامعة المستنصرية • كلية الهندسة",
    sup_spec: "المشرف الأكاديمي الموجه لمشروع التخرج النهائي، والمعتمد للأطر النظرية والدقة الرياضية وتطبيقات الشبكات المقاومة للكم ومناقشة الأطروحة الهندسية.",
    sup_scope1: "<strong>البراهين الرياضية:</strong> التحقق من متانة شبكات Module-LWE الأساسية لمعيار NIST FIPS 203 ML-KEM-768 ضد الهجمات الكمومية.",
    sup_scope2: "<strong>الحوكمة التشفيرية:</strong> مراجعة خوارزميات ARX الثابتة زمنياً لمنع تسريبات القنوات الجانبية المعتمدة على التوقيت.",
    sup_scope3: "<strong>ضمان الإخفاء:</strong> التحقق الصارم من مقاييس PSNR (>48 dB) و SSIM (>0.999) لسلامة الصورة الحاملة.",
    sup_scope4: "<strong>إدارة المشروع:</strong> الإشراف الأكاديمي الشامل، ومتابعة مراحل المشروع، وحوكمة مناقشة التخرج.",
    sup_pill1: "الجامعة المستنصرية",
    sup_pill2: "كلية الهندسة",
    sup_pill3: "موجه الأطروحة",
    sup_pill4: "معيار NIST FIPS 203",
    sup_btn: "المكتب الأكاديمي",

    st1_tag: "المتحدث الرئيسي وأبحاث كايبر",
    st1_peek: "مرر المؤشر لمعاينة السيرة",
    st1_name: "عبدالله إياد",
    st1_role: "المتحدث الرئيسي وباحث التشفير المقاوم للكم",
    st1_dept: "الجامعة المستنصرية • كلية الهندسة",
    st1_spec: "إعداد الأبحاث النظرية لمشروع التخرج، ودراسة أدبيات التشفير المقاوم للكم، وصياغة نماذج شبكات NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber)، وتقديم العرض التقديمي الرئيسي للمناقشة.",
    st1_scope1: "<strong>البحث النظري:</strong> صياغة الأبحاث الأكاديمية لأطروحة التخرج حول تهديدات الحوسبة الكمومية (خوارزمية شور) والانتقال نحو مرحلة ما بعد الكم.",
    st1_scope2: "<strong>معيار كايبر (ML-KEM-768):</strong> دراسة معايير صلابة شبكات Module-LWE، وحلقات كثيرات الحدود، وتغليف المفاتيح المقاوم للكم.",
    st1_scope3: "<strong>المتحدث الرئيسي:</strong> قيادة العرض التقديمي للمناقشة، واستعراض البراهين الرياضية وسردية الدفاع أمام لجنة التقييم.",
    st1_scope4: "<strong>توثيق الأطروحة:</strong> تأليف الفصول الأكاديمية، والمراجعات الأدبية لأنظمة ما بعد الكم، والمقارنات النظرية في تقرير المشروع.",
    st1_pill1: "المتحدث الرئيسي",
    st1_pill2: "NIST FIPS 203 Kyber",
    st1_pill3: "نظرية Module-LWE",
    st1_pill4: "أبحاث التخرج",
    st1_btn: "مراسلة الباحث",

    st2_tag: "هندسة التشفير والتوجيه والمفاتيح",
    st2_peek: "مرر المؤشر لمعاينة السيرة",
    st2_name: "كرار حيدر إسماعيل",
    st2_role: "مهندس النظم وهندسة التشفير",
    st2_dept: "الجامعة المستنصرية • كلية الهندسة",
    st2_spec: "تنفيذ وتطوير خوارزميات التشفير الكلاسيكية (RSA, DSA/ECDSA, ECDH, ChaCha20/AES)، ومحرك التوجيه الديناميكي، ونظام خزنة المفاتيح والتوليد، والإخفاء المكاني، وتطوير النظام المتكامل.",
    st2_scope1: "<strong>الخوارزميات الكلاسيكية:</strong> برمجة RSA-3072، وتواقيع DSA / ECDSA P-256، وتبادل مفاتيح ECDH، وتشفير ChaCha20-Poly1305 ARX، و AES.",
    st2_scope2: "<strong>مصفوفة التوجيه الديناميكي:</strong> تصميم وبرمجة مصنف البيانات وخوارزمية التوجيه الذكية بحسب الحجم وتوقيع MIME والإنتروبيا.",
    st2_scope3: "<strong>خزنة وتوليد المفاتيح:</strong> بناء نظام خزنة المفاتيح في الذاكرة، ومحرك توليد أزواج المفاتيح المحلية وتصديرها واستيرادها.",
    st2_scope4: "<strong>الإخفاء المكاني LSB:</strong> تطوير محرك الإخفاء الستيجانوغرافي بتبديل البكسلات العشوائي بدون أي تسريب بصري (ΔE < 0.05).",
    st2_scope5: "<strong>تطوير النظم والويب:</strong> بناء الواجهة الخلفية عبر FastAPI، وقنوات البث المباشر WebSockets، وواجهة المستخدم التفاعلية.",
    st2_pill1: "RSA & DSA / ECDSA",
    st2_pill2: "مصفوفة التوجيه الديناميكي",
    st2_pill3: "خزنة وتوليد المفاتيح",
    st2_pill4: "الإخفاء المكاني LSB",
    st2_pill5: "تطوير النظم المتكاملة",
    st2_btn: "مراسلة المطور",

    credit_sup_title: "المشرف الأكاديمي",
    credit_sup_name: "أ.م.د. حيدر طارش",
    credit_st1_title: "المتحدث الرئيسي • الأبحاث وكايبر",
    credit_st1_name: "عبدالله إياد",
    credit_st2_title: "مهندس النظم • التوجيه والمفاتيح والخوارزميات",
    credit_st2_name: "كرار حيدر إسماعيل",

    // Section 2: Encrypt & Conceal
    enc_sec_title: "سير عمل المرسل: التشفير، التغليف، والإخفاء",
    enc_sec_desc: "أدخل النص أو ارفع ملفاً، وسيقوم المصنف الذكي بتوجيهه نحو البروتوكولات التناظرية والكمومية المثلى.",
    enc_card1_title: "1. إدخال البيانات والتصنيف الذكي",
    enc_tab_text: "إدخال نصي",
    enc_tab_file: "رفع ملف",
    enc_lbl_plaintext: "البيانات الصريحة المراد تشفيرها:",
    enc_ph_plaintext: "ادخل النص السري، محتوى المستند، أو بيانات الاعتماد...",
    enc_lbl_file: "رفع ملف (مستند، ملف ثنائي، أو بيانات):",
    enc_diag_title: "تشخيص المصنف الذكي:",
    enc_diag_await: "بانتظار الإدخال",
    enc_diag_reason: "اكتب رسالة أو اختر ملفاً لمعاينة معايير التوجيه.",
    enc_diag_route: "المسار: -",
    enc_override_lbl: "تجاوز المصنف يدوياً (اختياري):",
    enc_opt_auto: "كشف تلقائي (موصى به)",
    enc_opt_bulk: "إجبار بيانات ضخمة (تشفير AEAD تناظري)",
    enc_opt_sens: "إجبار بيانات حساسة (اتفاقية مفاتيح ECDH)",
    enc_opt_doc: "إجبار مستند موثق (توقيع رقمي ECDSA)",
    enc_lbl_sym: "اختيار خوارزمية التشفير التناظري:",
    enc_opt_chacha: "<strong>ChaCha20-Poly1305</strong> (تنفيذ ARX ثابت زمنياً &bull; موصى به)",
    enc_opt_aes: "<strong>AES-256-GCM</strong> (تشفير موثق مسرّع عتادياً)",
    enc_card2_title: "2. المفتاح العام للمستلم (ML-KEM-768)",
    enc_lbl_pk: "المفتاح العام للمستلم (ترميز Base64 &bull; 1,184 بايت):",
    enc_ph_pk: "الصق المفتاح العام للمستلم (1,184 بايت) أو قم بتحميله من الخزنة...",
    enc_btn_load_vault: "تحميل من خزنة المفاتيح",
    enc_btn_gen_pk: "⚡ توليد زوج مفاتيح شبكية",
    enc_card3_title: "3. الصورة الناقلة الحاملة (الغلاف)",
    enc_lbl_cover: "اختر صورة الغلاف (PNG غير فاقدة):",
    enc_btn_reset_cover: "↺ استخدام صورة مولدة تلقائياً",
    enc_hint_cover: "اترك الحقل فارغاً لتوليد صورة ناقلة متوافقة ومثلى تلقائياً.",
    enc_lbl_req_size: "أبعاد الصورة الناقلة المطلوبة:",
    enc_val_req_size: "بانتظار البيانات...",
    enc_card4_title: "4. بث عبر قناة الأقران المباشرة (اختياري)",
    enc_lbl_channel: "معرف غرفة القناة (Room ID):",
    enc_ph_channel: "مثال: DEFENSE-CHANNEL-1",
    enc_hint_channel: "عند التحديد، سيتلقى المستلم المتصل بالقناة حزمة التشفير فوراً وبشكل متزامن.",
    enc_btn_execute: "تنفيذ التشفير الهجين متعدد الطبقات والحجب",
    enc_output_title: "حزمة المخرجات المشفرة والمحجوبة",
    enc_output_ph: "ستظهر صورة الإخفاء ورموز كايبر المقاومة للكم هنا فور اكتمال التشفير.",
    enc_stego_badge: "تم تضمين البيانات المحجوبة بنجاح &bull; صورة PNG نقية",
    enc_btn_dl_stego: "تحميل صورة الإخفاء (PNG)",
    enc_lbl_token: "رمز كايبر المشفر المقاوم للحوسبة الكمومية (1,088 بايت):",
    enc_btn_copy_token: "نسخ الرمز",
    enc_btn_save_token: "حفظ ملف الرمز (.token)",
    enc_telem_title: "تقرير القياسات والأدلة الرقمية",
    enc_telem_payload_lbl: "حجم البيانات الصافية:",
    enc_telem_carrier_lbl: "حجم الصورة الناقلة:",
    enc_telem_route_lbl: "مسار التشفير المتبع:",
    enc_telem_sig_lbl: "التوقيع الرقمي ECDSA P-256:",

    // Section 3: Decrypt & Extract
    dec_sec_title: "سير عمل المستلم: فك التغليف، الاستخراج، والتحقق",
    dec_sec_desc: "قم بإدخال الصورة الناقلة المحجوبة، رمز كايبر المشفر، والمفتاح السري الخاص بالمستلم.",
    dec_card1_title: "1. الصورة الناقلة المحجوبة",
    dec_lbl_carrier: "رفع صورة الإخفاء (PNG):",
    dec_card2_title: "2. رمز التغليف المشفر (ML-KEM-768)",
    dec_lbl_token: "النص المشفر لكايبر (1,088 بايت Base64):",
    dec_ph_token: "الصق رمز كايبر (1,088 بايت) أو اختر ملف الرمز...",
    dec_card3_title: "3. المفتاح السري المحلي للمستلم",
    dec_lbl_sk: "المفتاح السري للمستلم (2,400 بايت Base64):",
    dec_ph_sk: "الصق المفتاح السري لفك التغليف أو قم بتحميله من الخزنة...",
    dec_btn_load_vault: "تحميل من خزنة المفاتيح",
    dec_btn_gen_sk: "⚡ توليد زوج مفاتيح شبكية",
    dec_btn_browse_sk: "تحميل من ملف مفتاح",
    dec_btn_execute: "فك التغليف واستخراج البيانات الأصلية",
    dec_output_title: "البيانات المستخرجة والتدقيق الأمني",
    dec_output_ph: "سيتم عرض النص الصريح المفكوك، وحالة التحقق من التوقيع الرقمي، وخيارات التحميل هنا.",
    dec_verif_title: "تم التحقق من النزاهة التشفيرية بنجاح",
    dec_verif_desc: "تم توثيق كافة التواقيع الرقمية، والوسوم التناظرية، والرموز الشبكية المقاومة للكم.",
    dec_lbl_msg: "الرسالة الصريحة المستخرجة:",
    dec_btn_dl_prefix: "تحميل الملف المستخرج",
    dec_telem_title: "بيان التدقيق الأمني",
    dec_telem_dtype_lbl: "نوع البيانات المصنف:",
    dec_telem_cipher_lbl: "خوارزمية التشفير التناظري:",
    dec_telem_sig_lbl: "التوقيع الرقمي (ECDSA):",
    dec_telem_pqc_lbl: "تبادل المفاتيح المقاوم للكم:",
    dec_telem_pqc_val: "تم التحقق بنجاح وفق معيار NIST FIPS 203",

    // Section 4: Live Peer Channel
    chan_sec_title: "قناة البث المباشر بين الأقران",
    chan_sec_desc: "مزامنة فورية بين المرسل والمستلم عبر قنوات البث المباشر لتبادل الحزم التشفيرية المقاومة للكم.",
    chan_card1_title: "الاتصال بقناة البث",
    chan_lbl_room: "معرف غرفة القناة (Room ID):",
    chan_ph_room: "ادخل اسم القناة...",
    chan_btn_join: "الانضمام للغرفة",
    chan_hint_room: "يدخل كل من المرسل والمستلم نفس المعرف لإنشاء اتصال لحظي وتلقي الحزم فوراً.",
    chan_lbl_status: "الحالة",
    chan_status_disconn: "غير متصل",
    chan_status_conn: "متصل (بانتظار الحزم)",
    chan_lbl_room_id: "معرف الغرفة",
    chan_proto_title: "بروتوكول القناة المباشرة",
    chan_proto_1: "<strong>المستلم:</strong> ينضم إلى غرفة القناة ويبقي التبويب نشطاً.",
    chan_proto_2: "<strong>المرسل:</strong> في تبويب التشفير والحجب، يدخل نفس المعرف وينفذ العملية.",
    chan_proto_3: "<strong>مزامنة فورية:</strong> تُبث صورة الإخفاء ورمز كايبر عبر القناة لحظياً.",
    chan_proto_4: "<strong>فك بضغطة واحدة:</strong> انقر على زر \"تحويل لفك التشفير\" لاستخراج البيانات فوراً.",
    chan_card2_title: "سجل حركة البث الحي",
    chan_initial_log: "خدمة القنوات جاهزة. انضم لغرفة لبدء الاستماع.",
    chan_incoming_title: "حزمة إخفاء جديدة مقاومة للحوسبة الكمومية!",
    chan_incoming_desc: "تم استلام حزمة تشفيرية وإخفائية جديدة من الطرف الآخر.",
    chan_btn_transfer: "تحويل إلى أداة فك التشفير والاستخراج",

    // Section 5: Activity Log
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
    btn_refresh_title: "تحديث السجل",
    btn_export: "تصدير",
    btn_export_title: "تصدير السجل JSON",
    btn_clear: "مسح",
    btn_clear_title: "مسح السجل",
    th_time: "التوقيت والتاريخ",
    th_action: "العملية والنوع",
    th_details: "تفاصيل الحزمة والتشفير",
    th_status: "الحالة والتحقق",
    audit_empty: "لا توجد عمليات مسجلة حتى الآن لهذا الحساب.",
    // Security Intent Questionnaire & Dynamic Results
    wizard_badge: "مساعد التوجيه الذكي",
    wizard_title: "استبيان الهدف الأمني ونوع البيانات",
    wizard_sub: "حدد الغاية من العملية ونوع البيانات لتفعيل المسار المشفر الأمثل وتطبيق السياسات التلقائية.",
    wizard_lbl_q1: "1. ما هو الهدف الأمني المطلوب للعملية؟",
    wizard_opt_hybrid: "حماية هجينة متكاملة (شاملة)",
    wizard_sub_hybrid: "تشفير كايبر الكمومي + تشفير متماثل + إخفاء تكيفي (Sobel Stego)",
    wizard_opt_dsa: "توقيع رقمي فقط (DSA / Digital Signature)",
    wizard_sub_dsa: "توليد إثبات النزاهة وعدم الإنكار دون تشفير أو دمج في صور",
    wizard_opt_pqc: "نص مشفر كمومياً مباشر (Direct PQC)",
    wizard_sub_pqc: "تشفير Kyber-768 مباشر دون إخفائه في صورة حاملة",
    wizard_lbl_q2: "2. ما هي طبيعة وحساسية البيانات المرفوعة؟",
    wizard_opt_fin: "💳 بيانات مالية / بطاقات مصرفية / كلمات سر",
    wizard_sub_fin: "حسابات، بطاقات بنكية، مفاتيح سرية (تفرض تشفير ChaCha20 في الوقت الثابت)",
    wizard_opt_doc: "📄 وثيقة قانونية / مستند رسمي",
    wizard_sub_doc: "عقود رسمية وتقارير تتطلب توثيق النزاهة عبر التوقيع الرقمي",
    wizard_opt_msg: "💬 رسالة أو محادثة سرية",
    wizard_sub_msg: "نصوص ورسائل متبادلة تتطلب سرية تامة",
    wizard_opt_bulk: "📦 ملفات كبيرة أو وسائط",
    wizard_sub_bulk: "أرشيفات، قواعد بيانات، وسائط بحجم كبير",
    banner_title: "تم تفعيل التوجيه الأمني التلقائي: ChaCha20-Poly1305",
    banner_desc: "نظراً لوجود بيانات مالية أو مصرفية حساسة، تم تحديد خوارزمية ChaCha20 لحماية البيانات من هجمات التوقيت وقنوات التسريب (Cache-Timing Attacks) على المعالج.",
    dsa_receipt_badge: "✓ تم التوقيع الرقمي بنجاح",
    dsa_receipt_title: "إيصال التوقيع الرقمي المعتمد (ECDSA P-256)",
    dsa_lbl_sha256: "بصمة الوثيقة (SHA-256 Digest):",
    dsa_lbl_sig: "رمز التوقيع الرقمي (Signature Token):",
    dsa_lbl_pubkey: "المفتاح العام للموقّع (Public Key PEM):",
    dsa_btn_dl_receipt: "تحميل إيصال التوقيع (.sig.json)",
    dsa_btn_copy_sig: "نسخ التوقيع",
    pqc_direct_badge: "⚡ تشفير كمومي مباشر بدون إخفاء",
    pqc_direct_title: "حزمة التشفير الكمومي (Direct Kyber-768 Ciphertext)",
    pqc_lbl_ct: "النص المشفر (AEAD Ciphertext Token):",
    pqc_lbl_kyber: "رمز كايبر المحصور (Kyber-768 Encapsulation Token):",
    pqc_btn_dl_pkg: "تحميل الحزمة المشفرة (.json)",
    pqc_btn_copy_ct: "نسخ النص المشفر",
  },

  en: {
    doc_title: "Post-Quantum Defense & Steganographic Workstation • Graduation Project",
    lang_btn: "العربية",
    lang_toggle_title: "Toggle Language / تبديل اللغة",
    inst_logos_title: "Mustansiriyah University • College of Engineering",
    brand_title: "Post-Quantum Stego System",
    brand_sub: "Mustansiriyah University • College of Engineering",
    badge_grad: "Graduation Project",
    nav_home: "Home",
    nav_info: "System Info",
    nav_encrypt: "Encrypt & Conceal",
    nav_decrypt: "Extract & Decrypt",
    nav_channel: "Peer Channel",
    nav_audit: "Activity Log",
    channel_offline: "Channel: Offline",
    channel_online: "Channel: Connected",
    theme_accent: "Color",
    theme_btn_title: "Change Color Theme (20 Colors)",
    theme_popover_title: "Color Palette (20 Colors)",
    mode_toggle_title: "Toggle Dark / Light Mode",
    theme_mode_dark: "Dark",
    theme_mode_light: "Light",
    vault_btn: "Key Vault",
    logout_title: "Logout",

    // Home Section & Quick Menus
    home_badge_stego: "Lossless PNG Stego",
    home_title: "Hybrid Post-Quantum & Steganographic Security System",
    home_subtitle: "A simplified, all-in-one workstation to encrypt text and files using post-quantum cryptography (Kyber-768) and authenticated ciphers (ChaCha20 / AES-GCM), concealed seamlessly inside lossless PNG images.",
    home_cta_encrypt: "Start Encrypting",
    home_cta_decrypt: "Extract & Decrypt",
    home_cta_vault: "Local Key Vault",
    home_step1_title: "1. Classify & Encrypt",
    home_step1_desc: "Smart routing & AEAD encryption via ChaCha20 or AES-256-GCM",
    home_step2_title: "2. Post-Quantum KEM (Kyber-768)",
    home_step2_desc: "Quantum-resistant key encapsulation under NIST FIPS 203",
    home_step3_title: "3. Conceal in PNG (LSB)",
    home_step3_desc: "Seeded pseudo-random pixel embedding inside lossless PNGs",
    home_menu_heading: "Main Menus & Workstation Tools",
    home_menu_sub: "Select a module below to jump directly to your task.",
    menu_enc_title: "Encrypt & Conceal",
    menu_enc_badge: "Sender",
    menu_enc_desc: "Encrypt text messages or files, encapsulate keys with Kyber-768, and hide them inside a PNG carrier image.",
    menu_dec_title: "Extract & Decrypt",
    menu_dec_badge: "Receiver",
    menu_dec_desc: "Extract concealed payloads from a stego PNG image, decapsulate the Kyber token, and verify signatures.",
    menu_chan_title: "Live Peer Channel",
    menu_chan_badge: "Real-Time",
    menu_chan_desc: "Connect sender and receiver over live WebSocket rooms to transmit stego packages and tokens instantly.",
    menu_vault_title: "Local Key Vault",
    menu_vault_badge: "ML-KEM-768",
    menu_vault_desc: "Generate post-quantum public and secret keypairs in-browser, export `.key` files, or auto-fill forms.",
    menu_audit_title: "Activity & Audit Log",
    menu_audit_badge: "History",
    menu_audit_desc: "Track session statistics, inspect encryption/decryption/keygen operations, and export JSON logs.",
    menu_info_title: "System Info & Project Team",
    menu_info_badge: "Academic Docs",
    menu_info_desc: "Explore the 4-stage interactive architecture simulator, cryptographic comparisons, and project team.",
    menu_open_btn: "Open Module",
    menu_open_vault_btn: "Open Key Vault",
    info_tab_all: "View All",
    info_tab_arch: "Architecture & Simulator",
    info_tab_dec: "Cryptographic Decisions",
    info_tab_team: "Project Team & Advisors",

    // Auth Gateway
    auth_badge: "Graduation Capstone Project",
    auth_title: "Hybrid Multi-Level Quantum-Resistant Security System",
    auth_sub: "Mustansiriyah University • College of Engineering • Computer Dept.",
    tab_login: "Sign In",
    tab_register: "Create Account",
    lbl_login_user: "Username:",
    lbl_login_user_placeholder: "Enter username...",
    lbl_login_pass: "Password:",
    lbl_login_pass_placeholder: "••••••••",
    lbl_reg_user: "New Username:",
    lbl_reg_user_placeholder: "Choose username...",
    lbl_reg_pass: "Password:",
    lbl_reg_pass_placeholder: "At least 4 characters or digits...",
    lbl_reg_confirm: "Confirm Password:",
    lbl_reg_confirm_placeholder: "Re-enter password...",
    btn_login: "Sign In & Continue",
    btn_register: "Create Account & Activate",
    btn_guest: "🚀 Quick Guest Access Demo",

    // Key Vault Modal
    vault_modal_title: "ML-KEM-768 Local Vault (Post-Quantum Key Management)",
    vault_modal_desc: "Keys are generated locally in-memory using NIST FIPS 203 module lattices. Private keys never leave your machine.",
    vault_gen_btn: "⚡ Generate Kyber Keypair",
    vault_export_pk: "Save Public Key (.key)",
    vault_export_sk: "Save Secret Key (.key)",
    vault_lbl_pk: "Public Key (1,184 Bytes • Sender Encapsulation Token):",
    vault_placeholder_pk: "Generate keypair to derive public encapsulation token...",
    vault_lbl_sk: "Secret Key (2,400 Bytes • Private Decapsulation Key):",
    vault_placeholder_sk: "Secret key is held strictly in local memory...",
    vault_use_btn: "Load Keys into Workflows",

    // Section 1: System Info
    banner_uni: "Mustansiriyah University • College of Engineering",
    banner_coll: "Senior Graduation Project • Quantum-Resistant Cyber Defense & Steganography",
    hero_badge_2: "NIST FIPS 203 ML-KEM",
    hero_badge_3: "College of Engineering Defense",
    hero_info_title: "System Information & Technical Architecture",
    hero_info_desc: "Official academic documentation for the engineering graduation thesis covering multi-level hybrid encryption, mathematical routing matrix, classical vs. post-quantum primitives, and faculty supervision.",
    arch_card_title: "Interactive Architecture Pipeline & Simulation",
    sim_btn_text: "Simulate Pipeline Flow",
    arch_card_subtitle: "Click on any stage below to inspect mathematical models, byte transformations, and security parameters in the technical inspector panel.",
    stage_1_num: "Stage 01",
    stage_1_title: "Payload Classification",
    stage_1_desc: "MIME, Entropy & Size Inspection",
    stage_1_chip1: "Bulk (≥64KB)",
    stage_1_chip2: "Sensitive Token",
    stage_1_chip3: "Signed Doc",
    stage_2_num: "Stage 02",
    stage_2_title: "Cryptographic Routing",
    stage_2_desc: "Constant-Time ARX & Asymmetric Protocols",
    stage_2_chip1: "ChaCha20-Poly1305",
    stage_2_chip2: "ECDH P-256",
    stage_2_chip3: "ECDSA P-256",
    stage_3_num: "Stage 03",
    stage_3_title: "ML-KEM-768 Consolidation",
    stage_3_desc: "NIST FIPS 203 Lattice Shield & HKDF",
    stage_3_chip1: "1,088B Ciphertext",
    stage_3_chip2: "32B Shared Secret",
    stage_3_chip3: "HKDF-SHA256",
    stage_4_num: "Stage 04",
    stage_4_title: "Steganographic Carrier",
    stage_4_desc: "Seeded Pixel Permutation in Lossless PNG",
    stage_4_chip1: "LSB RGB Mod",
    stage_4_chip2: "Kyber Shuffle",
    stage_4_chip3: "ΔE < 0.05",
    insp_lbl_prim: "Primary Primitive",
    insp_lbl_sec: "Security Guarantee",
    insp_lbl_io: "Input / Output",
    insp_lbl_lat: "Latency Impact",
    insp_lbl_math: "Algorithmic & Mathematical Execution",
    insp_lbl_def: "Defense Threat Model & Guarantees",
    insp_leak_label: "Zero Leakage:",
    insp_override_label: "Deterministic Dispatch:",

    // Decisions & Comparisons
    dec_heading: "Cryptographic Decisions & Technical Justifications",
    dec_badge_1: "Primitive 1",
    dec_title_1: "ChaCha20-Poly1305 vs. AES-256-GCM",
    dec_desc_1: "AES relies on software lookup tables (S-Boxes) susceptible to <em>cache-timing side-channel attacks</em> when hardware acceleration (AES-NI) is absent. ChaCha20 uses simple <strong>Add-Rotate-XOR (ARX)</strong> operations executing in strictly constant time across all CPU architectures.",
    dec_th_metric: "Metric",
    dec_th_chacha: "ChaCha20-Poly1305",
    dec_th_aes: "AES-256-GCM",
    d1_r1_c1: "Design Architecture",
    d1_r1_c2: "Constant-Time ARX",
    d1_r1_c3: "Substitution-Permutation",
    d1_r2_c1: "Timing Vulnerability",
    d1_r2_c2: "Immune (Constant-Time)",
    d1_r2_c3: "Vulnerable without AES-NI",
    d1_r3_c1: "Key & Nonce",
    d1_r3_c2: "256-bit Key / 96-bit Nonce",
    d1_r3_c3: "256-bit Key / 96-bit IV",
    d1_r4_c1: "Industry Standard",
    d1_r4_c2: "RFC 8439, TLS 1.3",
    d1_r4_c3: "NIST SP 800-38D, TLS 1.3",

    dec_badge_2: "Primitive 2",
    dec_title_2: "ECC (ECDH / ECDSA) vs. Legacy RSA",
    dec_desc_2: "Based on the algebraic structure of elliptic curves over finite fields, ECC achieves 128-bit security level with a compact <strong>64-byte key</strong> compared to a cumbersome <strong>384-byte key</strong> for RSA-3072. Handshake speed is 10× to 25× faster with drastically lower memory overhead.",
    dec_th_ecc: "ECC (P-256)",
    dec_th_rsa: "RSA-3072",
    d2_r1_c1: "Public Key Size",
    d2_r1_c2: "64 Bytes",
    d2_r1_c3: "384 Bytes (6× larger)",
    d2_r2_c1: "Sign Operation",
    d2_r2_c2: "~0.1 ms",
    d2_r2_c3: "~2.5 ms",
    d2_r3_c1: "Resource Profile",
    d2_r3_c2: "Low Footprint",
    d2_r3_c3: "High Exponentiation Load",
    d2_r4_c1: "Shor's Algorithm",
    d2_r4_c2: "Vulnerable (Quantum)",
    d2_r4_c3: "Vulnerable (Quantum)",

    dec_badge_3: "Primitive 3",
    dec_title_3: "DSA / ECDSA vs. ElGamal Signatures",
    dec_desc_3: "Raw ElGamal signatures produce oversized signatures modulo a large prime modulus <em>p</em>. DSA was specifically standardized by NIST to operate in a prime-order subgroup, generating compact signatures (~64 bytes via ECDSA) with significantly faster verification.",
    dec_th_scheme: "Scheme",
    dec_th_sigsize: "Signature Size",
    dec_th_arith: "Arithmetic Complexity",
    d3_r1_c1: "ElGamal Signatures",
    d3_r1_c2: "2× Modulus Length",
    d3_r1_c3: "Full-Modulus Exponentiation",
    d3_r2_c1: "DSA / ECDSA",
    d3_r2_c2: "Compact (64 bytes)",
    d3_r2_c3: "Subgroup Curve Operations",

    dec_badge_4: "PQC Anchor",
    dec_title_4: "NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber)",
    dec_desc_4: "Kyber relies on the hardness of the <em>Module Learning With Errors (M-LWE)</em> problem in structured module lattices. No known quantum algorithm (including Shor's or Grover's) can solve M-LWE in polynomial time, guaranteeing long-term post-quantum secrecy.",
    dec_th_param: "Parameter",
    dec_th_val: "Value",
    dec_th_purpose: "Cryptographic Purpose",
    d4_r1_c1: "Public Key (pk)",
    d4_r1_c2: "1,184 Bytes",
    d4_r1_c3: "Encapsulation token for sender",
    d4_r2_c1: "Secret Key (sk)",
    d4_r2_c2: "2,400 Bytes",
    d4_r2_c3: "Decapsulation token for receiver",
    d4_r3_c1: "Ciphertext (ct)",
    d4_r3_c2: "1,088 Bytes",
    d4_r3_c3: "Quantum-resistant key encapsulation",
    d4_r4_c1: "Shared Secret (ss)",
    d4_r4_c2: "32 Bytes",
    d4_r4_c3: "HKDF seed for payload key & stego seed",

    // Team Presentation Deck
    team_deck_title: "Graduation Project Team & Academic Supervision",
    team_deck_sub: "Mustansiriyah University • College of Engineering • Senior Defense",
    sup_tag: "Academic Advisor",
    sup_peek: "Hover to Reveal Dossier",
    sup_name: "Assist. Prof. Haider Tarish",
    sup_role: "Academic Supervisor & Project Advisor",
    sup_dept: "Mustansiriyah University • College of Engineering",
    sup_spec: "Academic Advisor directing the senior graduation project, validating the theoretical framework, mathematical rigor, quantum-resistant lattice foundations, and engineering thesis defense.",
    sup_scope1: "<strong>Formal Proofs:</strong> Validation of Module-LWE lattice hardness underlying NIST FIPS 203 ML-KEM-768 against quantum cryptanalysis.",
    sup_scope2: "<strong>Cryptographic Governance:</strong> Review of constant-time ARX ciphers to prevent timing side-channel leaks.",
    sup_scope3: "<strong>Steganographic Assurance:</strong> Rigorous PSNR (>48 dB) and SSIM (>0.999) metric validation for carrier integrity.",
    sup_scope4: "<strong>Project Supervision:</strong> Academic oversight, graduation project milestones, and thesis defense governance.",
    sup_pill1: "Mustansiriyah University",
    sup_pill2: "College of Engineering",
    sup_pill3: "Thesis Director",
    sup_pill4: "NIST FIPS 203",
    sup_btn: "Academic Office",

    st1_tag: "Lead Presenter & Kyber",
    st1_peek: "Hover to Reveal Dossier",
    st1_name: "Abdulallah Ayad",
    st1_role: "Lead Presenter & PQC Researcher",
    st1_dept: "Mustansiriyah University • College of Engineering",
    st1_spec: "Conducted the graduation project's theoretical research, post-quantum cryptography literature, NIST FIPS 203 ML-KEM-768 (CRYSTALS-Kyber) lattice formulation, and primary oral defense presentation.",
    st1_scope1: "<strong>Theoretical Research:</strong> Formulated the graduation thesis academic research on quantum computing threats (Shor's algorithm) and post-quantum migration.",
    st1_scope2: "<strong>NIST ML-KEM-768 (Kyber):</strong> Researched Module Learning With Errors (M-LWE) lattice hardness parameters, polynomial rings, and quantum-resistant key encapsulation.",
    st1_scope3: "<strong>Lead Defense Presenter:</strong> Orchestrated the oral defense presentation, mathematical proofs walkthrough, and thesis committee defense narrative.",
    st1_scope4: "<strong>Thesis Documentation:</strong> Authored academic research chapters, post-quantum literature reviews, and theoretical comparisons for the capstone report.",
    st1_pill1: "Lead Presenter",
    st1_pill2: "NIST FIPS 203 Kyber",
    st1_pill3: "Module-LWE Theory",
    st1_pill4: "Graduation Research",
    st1_btn: "Contact Presenter",

    st2_tag: "Cryptography, Routing & Keys",
    st2_peek: "Hover to Reveal Dossier",
    st2_name: "Karrar Haider Ismail",
    st2_role: "Systems Architect & Cryptographic Engineer",
    st2_dept: "Mustansiriyah University • College of Engineering",
    st2_spec: "Engineered the classical cryptographic methods (RSA, DSA/ECDSA, ECDH, ChaCha20/AES), the dynamic routing engine, the Key Vault & key generation system, spatial steganography, and full-stack workstation.",
    st2_scope1: "<strong>RSA, DSA & Classical Ciphers:</strong> Implemented RSA-3072, DSA / ECDSA P-256 digital signatures, ECDH key exchange, ChaCha20-Poly1305 ARX, and AES pipelines.",
    st2_scope2: "<strong>Dynamic Routing Matrix:</strong> Architected and implemented the payload classifier and dynamic routing algorithm that directs data based on MIME, entropy, and size.",
    st2_scope3: "<strong>Key Vault & Key Generation:</strong> Built the in-memory Key Vault system, local lattice & classical keypair generation engine, and key export/import pipelines.",
    st2_scope4: "<strong>Spatial LSB Steganography:</strong> Developed the pseudo-random Fisher-Yates pixel permutation steganography engine with zero-leakage embedding (ΔE < 0.05).",
    st2_scope5: "<strong>Full-Stack & WebSockets:</strong> Created the FastAPI backend, real-time peer WebSocket channels, and reactive workstation user interface.",
    st2_pill1: "RSA & DSA / ECDSA",
    st2_pill2: "Dynamic Routing Matrix",
    st2_pill3: "Key Vault & Key Gen",
    st2_pill4: "Spatial Stego Permutation",
    st2_pill5: "Full-Stack Systems",
    st2_btn: "Contact Developer",

    credit_sup_title: "Academic Supervisor",
    credit_sup_name: "Assist. Prof. Haider Tarish",
    credit_st1_title: "Lead Presenter • Research & Kyber",
    credit_st1_name: "Abdulallah Ayad",
    credit_st2_title: "Systems Architect • RSA, DSA, Routing & Keys",
    credit_st2_name: "Karrar Haider Ismail",

    // Section 2: Encrypt & Conceal
    enc_sec_title: "Sender Workflow: Encrypt, Encapsulate & Conceal",
    enc_sec_desc: "Supply plaintext or upload a file. The classifier will route to the optimal classical and post-quantum protocols.",
    enc_card1_title: "1. Payload Input & Classification",
    enc_tab_text: "Text Input",
    enc_tab_file: "File Upload",
    enc_lbl_plaintext: "Plaintext Payload:",
    enc_ph_plaintext: "Enter sensitive secret, document text, or credentials...",
    enc_lbl_file: "Upload File (Document, Binary, or Data):",
    enc_diag_title: "Classifier Diagnostic:",
    enc_diag_await: "Awaiting Input",
    enc_diag_reason: "Type a message or select a file to inspect parameters.",
    enc_diag_route: "Route: -",
    enc_override_lbl: "Classifier Override (Optional):",
    enc_opt_auto: "Auto-Detect (Recommended)",
    enc_opt_bulk: "Force Bulk Data (Symmetric AEAD)",
    enc_opt_sens: "Force Sensitive Credentials (ECDH Agreement)",
    enc_opt_doc: "Force Document / Integrity (ECDSA Signed)",
    enc_lbl_sym: "Symmetric Cipher Selection:",
    enc_opt_chacha: "<strong>ChaCha20-Poly1305</strong> (Constant-Time ARX &bull; Recommended)",
    enc_opt_aes: "<strong>AES-256-GCM</strong> (Hardware-Accelerated AEAD)",
    enc_card2_title: "2. Recipient ML-KEM-768 Public Key",
    enc_lbl_pk: "Recipient Public Key (Base64 &bull; 1,184 Bytes):",
    enc_ph_pk: "Paste 1,184-byte recipient public key or load from Key Vault...",
    enc_btn_load_vault: "Load from Key Vault",
    enc_btn_gen_pk: "⚡ Generate Lattice Keypair",
    enc_card3_title: "3. Carrier Image (Cover)",
    enc_lbl_cover: "Select Cover Image (Lossless PNG):",
    enc_btn_reset_cover: "↺ Use Auto-Synthesized Carrier",
    enc_hint_cover: "Leave empty to auto-synthesize an optimal carrier image.",
    enc_lbl_req_size: "Required cover image size:",
    enc_val_req_size: "Awaiting payload...",
    enc_card4_title: "4. Peer Channel Broadcast (Optional)",
    enc_lbl_channel: "Channel Room ID:",
    enc_ph_channel: "e.g. DEFENSE-CHANNEL-1",
    enc_hint_channel: "When set, receiver listening on this channel receives the stego package live.",
    enc_btn_execute: "Execute Multi-Layer Encryption & Concealment",
    enc_output_title: "Steganographic Output Package",
    enc_output_ph: "Generated Stego-Image and Post-Quantum tokens will appear here after execution.",
    enc_stego_badge: "Concealed Payload Embedded &bull; Lossless PNG",
    enc_btn_dl_stego: "Download Stego-Image (PNG)",
    enc_lbl_token: "Post-Quantum Kyber-768 Ciphertext Token (1,088 Bytes):",
    enc_btn_copy_token: "Copy Token",
    enc_btn_save_token: "Save Token File",
    enc_telem_title: "Telemetry & Proof Manifest",
    enc_telem_payload_lbl: "Payload Size:",
    enc_telem_carrier_lbl: "Carrier PNG Size:",
    enc_telem_route_lbl: "Cryptographic Route:",
    enc_telem_sig_lbl: "ECDSA P-256 Signature:",

    // Section 3: Decrypt & Extract
    dec_sec_title: "Receiver Workflow: Decapsulate, Extract & Verify",
    dec_sec_desc: "Supply the stego-carrier image, Kyber-768 ciphertext token, and receiver secret key.",
    dec_card1_title: "1. Steganographic Carrier",
    dec_lbl_carrier: "Upload Stego-Image (PNG):",
    dec_card2_title: "2. ML-KEM-768 Ciphertext Token",
    dec_lbl_token: "Kyber-768 Ciphertext (1,088 Bytes Base64):",
    dec_ph_token: "Paste 1,088-byte Kyber token or load file...",
    dec_card3_title: "3. Local Receiver Secret Key",
    dec_lbl_sk: "Recipient Secret Key (2,400 Bytes Base64):",
    dec_ph_sk: "Paste private decapsulation key or load from vault...",
    dec_btn_load_vault: "Load from Key Vault",
    dec_btn_gen_sk: "⚡ Generate Lattice Keypair",
    dec_btn_browse_sk: "Load from Key File",
    dec_btn_execute: "Decapsulate & Extract Plaintext",
    dec_output_title: "Recovered Payload & Security Audit",
    dec_output_ph: "Decrypted plaintext, signature verification status, and downloads will be rendered here.",
    dec_verif_title: "Cryptographic Integrity Verified",
    dec_verif_desc: "All signatures, symmetric tags, and lattice tokens validated.",
    dec_lbl_msg: "Extracted Plaintext Message:",
    dec_btn_dl_prefix: "Download Recovered File",
    dec_telem_title: "Security Audit Manifest",
    dec_telem_dtype_lbl: "Classified Data Type:",
    dec_telem_cipher_lbl: "Symmetric Cipher:",
    dec_telem_sig_lbl: "Digital Signature (ECDSA):",
    dec_telem_pqc_lbl: "Post-Quantum Key Exchange:",
    dec_telem_pqc_val: "NIST FIPS 203 ML-KEM-768 Verified",

    // Section 4: Live Peer Channel
    chan_sec_title: "Live Peer Transmission Channel",
    chan_sec_desc: "Synchronize sender and receiver over a peer channel room for real-time quantum-safe transmissions.",
    chan_card1_title: "Channel Connection",
    chan_lbl_room: "Channel Room ID:",
    chan_ph_room: "Enter channel name...",
    chan_btn_join: "Join Room",
    chan_hint_room: "Both sender and receiver enter the exact same Room ID to establish a live pipeline.",
    chan_lbl_status: "Status",
    chan_status_disconn: "Disconnected",
    chan_status_conn: "Connected (Listening)",
    chan_lbl_room_id: "Room ID",
    chan_proto_title: "Live Channel Protocol",
    chan_proto_1: "<strong>Receiver:</strong> Join the channel room and keep this tab active.",
    chan_proto_2: "<strong>Sender:</strong> In the Encrypt & Conceal tab, set the Channel Room to the same ID and execute.",
    chan_proto_3: "<strong>Live Sync:</strong> Stego-image and Kyber token transmit instantly across the channel.",
    chan_proto_4: "<strong>One-Click Extraction:</strong> Click \"Transfer to Decryptor\" to unpack the incoming payload.",
    chan_card2_title: "Live Transmission Feed",
    chan_initial_log: "Channel daemon ready. Join a room to begin listening.",
    chan_incoming_title: "Incoming Quantum-Safe Stego Package",
    chan_incoming_desc: "Package received from remote peer.",
    chan_btn_transfer: "Transfer to Decryptor & Unpack",

    // Section 5: Activity Log
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
    btn_refresh_title: "Refresh Audit Log",
    btn_export: "Export",
    btn_export_title: "Export Audit Log to JSON",
    btn_clear: "Clear",
    btn_clear_title: "Clear Audit Log",
    th_time: "Timestamp",
    th_action: "Action & Type",
    th_details: "Package & Cipher Details",
    th_status: "Status & Verification",
    audit_empty: "No operations recorded yet for this account.",
    // Security Intent Questionnaire & Dynamic Results
    wizard_badge: "Smart Routing Assistant",
    wizard_title: "Security Intent & Data Sensitivity Questionnaire",
    wizard_sub: "Select your objective and data sensitivity to activate optimal cryptographic pipeline and policies.",
    wizard_lbl_q1: "1. What is the required security objective?",
    wizard_opt_hybrid: "Full Hybrid Protection (Comprehensive)",
    wizard_sub_hybrid: "Quantum Kyber + Symmetric AEAD + Adaptive Steganography (Sobel LSB)",
    wizard_opt_dsa: "Digital Signature Only (DSA / Integrity Proof)",
    wizard_sub_dsa: "Generate non-repudiation integrity proof without stego or encryption overhead",
    wizard_opt_pqc: "Direct Quantum-Safe Ciphertext (Direct PQC)",
    wizard_sub_pqc: "Direct Kyber-768 ciphertext token package without carrier image",
    wizard_lbl_q2: "2. What is the nature and sensitivity of the data?",
    wizard_opt_fin: "💳 Financial Data / Bank Cards / Passwords",
    wizard_sub_fin: "Banking accounts, credentials, private secrets (Auto-enforces Constant-Time ChaCha20)",
    wizard_opt_doc: "📄 Legal Document / Official Contract",
    wizard_sub_doc: "Contracts, reports, and evidence requiring verifiable digital signature",
    wizard_opt_msg: "💬 Confidential Message / Chat",
    wizard_sub_msg: "Confidential messages and exchanges requiring full privacy",
    wizard_opt_bulk: "📦 Bulk Data / Large Media",
    wizard_sub_bulk: "Archives, database dumps, and large media files",
    banner_title: "Smart Security Policy Enforced: ChaCha20-Poly1305",
    banner_desc: "Due to financial or critical sensitivity, ChaCha20-Poly1305 is enforced to prevent cache-timing side-channel leaks on the CPU.",
    dsa_receipt_badge: "✓ Digital Signature Certified",
    dsa_receipt_title: "Certified Digital Signature Receipt (ECDSA P-256)",
    dsa_lbl_sha256: "Document Digest (SHA-256):",
    dsa_lbl_sig: "Signature Token:",
    dsa_lbl_pubkey: "Signer Public Key (PEM):",
    dsa_btn_dl_receipt: "Download Signature Receipt (.sig.json)",
    dsa_btn_copy_sig: "Copy Signature",
    pqc_direct_badge: "⚡ Direct Quantum Ciphertext (No Stego)",
    pqc_direct_title: "Quantum Ciphertext Package (Direct Kyber-768)",
    pqc_lbl_ct: "AEAD Ciphertext Token:",
    pqc_lbl_kyber: "Kyber-768 Encapsulation Token:",
    pqc_btn_dl_pkg: "Download Package (.json)",
    pqc_btn_copy_ct: "Copy Ciphertext",
  }
};

let currentLang = localStorage.getItem("fgp_lang") || "ar";

function initLanguageController() {
  const btnToggle = document.getElementById("btn-lang-toggle");
  const authLangBtns = document.querySelectorAll(".auth-lang-btn");

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

function setLanguage(lang, notify = false) {
  currentLang = lang === "en" ? "en" : "ar";
  localStorage.setItem("fgp_lang", currentLang);
  document.documentElement.setAttribute("lang", currentLang);
  document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");

  const dict = I18N_DATA[currentLang];

  // Document Title
  if (dict.doc_title) {
    document.title = dict.doc_title;
  }

  // Update all [data-i18n] textContent
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  // Update all [data-i18n-html] innerHTML
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (dict[key] !== undefined) {
      el.innerHTML = dict[key];
    }
  });

  // Update all [data-i18n-placeholder] placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) {
      el.placeholder = dict[key];
    }
  });

  // Update all [data-i18n-title] titles
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (dict[key] !== undefined) {
      el.title = dict[key];
    }
  });

  // Language button label
  const langLabel = document.getElementById("lang-label");
  if (langLabel) langLabel.textContent = dict.lang_btn;

  // Active theme label in header and popover
  const currentPreset = ACCENT_PRESETS.find((p) => p.id === currentAccent) || ACCENT_PRESETS[0];
  const accentLabel = document.getElementById("theme-accent-label");
  if (accentLabel) accentLabel.textContent = currentLang === "ar" ? currentPreset.nameAr : currentPreset.name;

  // Re-render theme swatches to update tooltip language
  renderThemePaletteGrid();

  // Mode label
  const modeLabel = document.getElementById("theme-mode-label");
  if (modeLabel) modeLabel.textContent = currentMode === "light" ? dict.theme_mode_light : dict.theme_mode_dark;

  // Re-render current architecture stage in active language
  if (typeof selectStage === "function") {
    selectStage(currentActiveStage);
  }

  // Update stego capacity message in current language
  if (typeof updateStegoCapacity === "function") {
    updateStegoCapacity();
  }

  // Update channel status indicator text
  const statusLabel = document.getElementById("channel-status-label");
  if (statusLabel) {
    if (state.activeRoom) {
      statusLabel.textContent = currentLang === "ar" ? `القناة: ${state.activeRoom}` : `Channel: ${state.activeRoom}`;
    } else {
      statusLabel.textContent = dict.channel_offline;
    }
  }

  // Update auth modal language switcher pills
  document.querySelectorAll(".auth-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });

  // Refresh audit logs if loaded
  if (allAuditLogs && allAuditLogs.length > 0) {
    renderAuditTable();
  }

  if (notify) {
    showToast(currentLang === "ar" ? "تم التحويل إلى اللغة العربية" : "Switched to English", "info");
  }
}
