/**
 * Hybrid Multi-Level Security System
 * High-Assurance Cryptographic Workstation
 * Bilingual (EN / AR) & 10 Color Themes Controller
 */

// Application State
const DEFAULT_LANDSCAPE_PRESETS_FALLBACK = [
  {
    id: "tier1_misty",
    label_en: "Misty Ridge",
    label_ar: "الجبال الضبابية",
    width: 1200,
    height: 800,
    capacity_bytes: 359964,
    url: "/static/default_covers/tier1_misty.jpg",
  },
  {
    id: "tier2_peak",
    label_en: "Snowy Summit",
    label_ar: "القمة الثلجية",
    width: 2400,
    height: 1600,
    capacity_bytes: 1439964,
    url: "/static/default_covers/tier2_peak.jpg",
  },
  {
    id: "tier3_lake",
    label_en: "Alpine Lake 4K",
    label_ar: "بحيرة الألب 4K",
    width: 3840,
    height: 2160,
    capacity_bytes: 3110364,
    url: "/static/default_covers/tier3_lake.jpg",
  },
  {
    id: "tier4_alpine_uhd",
    label_en: "Alpine 5K Max",
    label_ar: "بانوراما 5K قصوى",
    width: 5120,
    height: 2880,
    capacity_bytes: 5529564,
    url: "/static/default_covers/tier4_alpine_uhd.jpg",
  },
];

const state = {
  localKeys: {
    pk: null,
    sk: null,
  },
  sessionToken: sessionStorage.getItem("fgp_session_token") || null,
  lastOutputKyberCt: null,
  operationMode: "encryption",
  selectedQuestionnaireService: "signature",
  activeRoom: null,
  socket: null,
  lastIncomingTransmission: null,
  selectedDefaultCoverId: "auto",
  defaultCoverTiers: DEFAULT_LANDSCAPE_PRESETS_FALLBACK,
  maxSafeStegoBytes: 9749964,
  lastLoadedDirectFile: null,
  lastDirectDownloadUrl: null,
  lastCoverThumbUrl: null,
  lastDecryptThumbUrl: null,
  lastRecoveredBlobUrl: null,
};

async function extractErrorDetail(res, fallback = "Operation failed") {
  try {
    const text = await res.text();
    if (!text) return `${fallback} (HTTP ${res.status})`;
    try {
      const parsed = JSON.parse(text);
      return parsed.detail || parsed.message || `${fallback} (HTTP ${res.status})`;
    } catch (_) {
      return text.slice(0, 200);
    }
  } catch (_) {
    return `${fallback} (HTTP ${res.status})`;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (state.sessionToken) {
    headers["X-Session-Token"] = state.sessionToken;
  }
  return headers;
}

let currentActiveStage = 1;

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initLanguageController();
  initThemeController();
  initAuthGateway();
  initNavigation();
  initCinematicIntro();
  initPortfolioIntro();
  initRoutingQuestionnaire();
  initKeyVault();
  initCapacityAlertModal();
  initInteractiveArchitecture();
  initClassifier();
  initEncryptSection();
  initDecryptSection();
  initChannelSection();
  initAuditLogSection();

  loadKeysFromStorage();
  loadDefaultCoverTiers();
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

  // Play blueprint wireframe reveal animation when entering intro section
  if (targetId === "section-intro") {
    if (typeof playBlueprintRevealAnimation === "function") {
      playBlueprintRevealAnimation();
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   0A. SLOW TOP-TO-BOTTOM TERMINOLOGY SWAPPER & CINEMATIC INTRO SHOWCASE
   ========================================================================== */
const INTRO_TERMS_DATA = {
  en: [
    {
      badge: "01 / 05 • NIST FIPS 203 STANDARD",
      title: "CRYSTALS-Kyber (ML-KEM-768)",
      desc: "Quantum-resistant module-lattice key encapsulation protecting session keys against future quantum supercomputers.",
      pill: "01. CRYSTALS-Kyber"
    },
    {
      badge: "02 / 05 • DUAL-LAYER AEAD CIPHERS",
      title: "ChaCha20-Poly1305 & AES-256-GCM",
      desc: "High-speed authenticated symmetric encryption with 256-bit keys and 128-bit MAC tags to prevent data tampering.",
      pill: "02. ChaCha20 & AES-256"
    },
    {
      badge: "03 / 05 • AUTHENTICITY & NON-REPUDIATION",
      title: "Isolated Digital Signatures (ECDSA P-256)",
      desc: "Cryptographic SHA-256 hashing and elliptic-curve signing encapsulated via Kyber to guarantee document integrity.",
      pill: "03. Digital Signatures"
    },
    {
      badge: "04 / 05 • ZERO-LEAK EDGE CONCEALMENT",
      title: "Content-Adaptive Sobel Edge Steganography (HBIG)",
      desc: "Embeds ciphertext strictly inside high-gradient edge textures via Higher-Bit Invariant Gradients (HBIG), Argon2id key-stretching, and BLAKE2b MAC.",
      pill: "04. Adaptive Sobel Stego"
    },
    {
      badge: "05 / 05 • INTELLIGENT PAYLOAD ROUTING",
      title: "Smart Content & Entropy Classifier",
      desc: "Automatically inspects MIME signatures, payload size, and Shannon entropy to select the optimal encryption pipeline.",
      pill: "05. Smart Classifier"
    }
  ],
  ar: [
    {
      badge: "01 / 05 • معيار NIST FIPS 203 القياسي",
      title: "CRYSTALS-Kyber (ML-KEM-768)",
      desc: "تغليف المفاتيح القائم على التراكيب الشبكية المقاوم للحوسبة الكمومية لحماية مفاتيح الجلسات من الحواسيب الكمومية.",
      pill: "01. كايبر ML-KEM"
    },
    {
      badge: "02 / 05 • التشفير التناظري الموثق المزدوج",
      title: "ChaCha20-Poly1305 & AES-256-GCM",
      desc: "تشفير تناظري موثق فائق السرعة بمفاتيح 256-بت وعلامات مصادقة 128-بت لمنع أي تلاعب بالبيانات المشفرة.",
      pill: "02. التشفير التناظري"
    },
    {
      badge: "03 / 05 • الموثوقية الرقمية وعدم الإنكار",
      title: "التوقيع الرقمي المعزول (ECDSA P-256)",
      desc: "تجزئة SHA-256 وتوقيع المنحنيات الإهليلجية المغلف عبر كايبر لضمان أصالة المستندات وسلامتها من التزوير.",
      pill: "03. التوقيع الرقمي"
    },
    {
      badge: "04 / 05 • الإخفاء المتكيف غير الفاقد",
      title: "إخفاء الحواف المتكيف Sobel (HBIG)",
      desc: "يخفي البيانات داخل الحواف والتفاصيل المعقدة للصورة بتقنية HBIG وتمديد Argon2id وختم النزاهة BLAKE2b دون أثر بصري.",
      pill: "04. إخفاء Sobel المتكيف"
    },
    {
      badge: "05 / 05 • التوجيه الذكي للبيانات",
      title: "المصنف الذكي للبيانات والإنتروبيا",
      desc: "فحص تلقائي لنوع الملف وحجمه ومستوى الإنتروبيا لاختيار مسار التشفير الأنسب بأعلى كفاءة وأمان.",
      pill: "05. المصنف الذكي"
    }
  ]
};

let introMasterTimeline = null;
let introClockInterval = null;
let inlineTermInterval = null;
let processPulseInterval = null;
let isIntroActive = false;
let isIntroPaused = false;
let currentOverlayTermIdx = 0;
let currentInlineTermIdx = 0;
let latticePulseWaves = [];
let activeLatticeSceneColor = "#00f0ff";

const SCENE_COLORS = ["#00f0ff", "#ff2a4b", "#10b981", "#38bdf8", "#eab308"];

/**
 * Synchronizes the 5-Node Cryptographic Pipeline Conduit & Holographic Scene Stage
 * with the currently active terminology index (0..4) and fires a Quantum Lattice Wave.
 */
function updateSyncVisualizer(prefix, idx) {
  const visualizer = document.getElementById(`${prefix}-sync-visualizer`);
  const beam = document.getElementById(`${prefix}-sync-beam`);
  if (visualizer) {
    visualizer.setAttribute("data-active-scene", String(idx));

    visualizer.querySelectorAll(".sync-node").forEach((node, i) => {
      node.classList.toggle("active", i <= idx);
    });

    visualizer.querySelectorAll(".sync-scene").forEach((scene, i) => {
      scene.classList.toggle("active", i === idx);
    });
  }

  if (beam) {
    const pct = (idx / 4) * 100;
    beam.style.width = `${pct}%`;
  }

  // Trigger a synchronized radial quantum pulse wave on the background lattice canvas
  activeLatticeSceneColor = SCENE_COLORS[idx % SCENE_COLORS.length] || "#00f0ff";
  latticePulseWaves.push({
    radius: 10,
    maxRadius: 680,
    alpha: 0.75,
    color: activeLatticeSceneColor
  });
}

/**
 * 60fps Live Post-Quantum Module-LWE Lattice & Cipher Packet Stream Canvas Engine
 */
function initQuantumLatticeCanvas() {
  const canvases = [
    document.getElementById("overlay-quantum-canvas"),
    document.getElementById("inline-quantum-canvas")
  ].filter(Boolean);

  if (canvases.length === 0) return;

  const states = canvases.map((canvas) => {
    const ctx = canvas.getContext("2d");
    const nodes = [];
    const packets = [];
    const count = 34;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect && rect.width > 0 ? rect.width : window.innerWidth;
      canvas.height = rect && rect.height > 0 ? rect.height : window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        r: 2 + Math.random() * 2,
        hue: i % 3 === 0 ? "#ff2a4b" : "#00f0ff"
      });
    }

    for (let p = 0; p < 10; p++) {
      packets.push({
        fromIdx: p % count,
        toIdx: (p * 3 + 1) % count,
        progress: Math.random(),
        speed: 0.012 + Math.random() * 0.014
      });
    }

    return { canvas, ctx, nodes, packets, resize };
  });

  function renderFrame() {
    states.forEach((st) => {
      const { canvas, ctx, nodes, packets } = st;
      if (canvas.width === 0 || canvas.height === 0) st.resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw lattice nodes + edges
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 175) {
            const alpha = (1 - dist / 175) * 0.22;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = n.hue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw encrypted data packets racing between lattice nodes
      packets.forEach((pkt) => {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          pkt.progress = 0;
          pkt.fromIdx = pkt.toIdx;
          pkt.toIdx = Math.floor(Math.random() * nodes.length);
        }
        const a = nodes[pkt.fromIdx];
        const b = nodes[pkt.toIdx];
        if (a && b) {
          const px = a.x + (b.x - a.x) * pkt.progress;
          const py = a.y + (b.y - a.y) * pkt.progress;
          ctx.fillStyle = activeLatticeSceneColor;
          ctx.shadowColor = activeLatticeSceneColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw synchronized radial quantum pulse waves triggered on term swaps
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.36;
      latticePulseWaves.forEach((wave) => {
        ctx.strokeStyle = wave.color;
        ctx.globalAlpha = Math.max(0, wave.alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    });

    // Advance radial waves
    for (let w = latticePulseWaves.length - 1; w >= 0; w--) {
      latticePulseWaves[w].radius += 7.5;
      latticePulseWaves[w].alpha -= 0.012;
      if (latticePulseWaves[w].alpha <= 0 || latticePulseWaves[w].radius > latticePulseWaves[w].maxRadius) {
        latticePulseWaves.splice(w, 1);
      }
    }

    requestAnimationFrame(renderFrame);
  }

  requestAnimationFrame(renderFrame);
}

/**
 * Synchronized sequential pulse across the 5-Step Encryption Process Cards
 */
function startProcessStepPulse() {
  if (processPulseInterval) clearInterval(processPulseInterval);
  let activeStepIdx = 0;

  const updateCards = () => {
    ["overlay-process-steps-grid", "inline-process-steps-grid"].forEach((gridId) => {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      const cards = grid.querySelectorAll(".intro-process-step-card");
      cards.forEach((c, idx) => {
        c.classList.toggle("step-pulse-active", idx === activeStepIdx);
      });
    });
    activeStepIdx = (activeStepIdx + 1) % 5;
  };

  updateCards();
  processPulseInterval = setInterval(updateCards, 950);
}

/**
 * Crisp, top-to-bottom vertical swapper for terminology slides + synchronized scene update.
 * Current slide glides downward (0% -> 110%) while incoming slide enters from top (-110% -> 0%).
 */
function swapTermTopToBottom(prefix, targetIdx, animate = true) {
  const termsList = INTRO_TERMS_DATA[currentLang] || INTRO_TERMS_DATA.en;
  const idx = ((targetIdx % termsList.length) + termsList.length) % termsList.length;
  const item = termsList[idx];

  const currentSlide = document.getElementById(`${prefix}-term-slide-current`);
  const nextSlide = document.getElementById(`${prefix}-term-slide-next`);
  const badgeCur = document.getElementById(`${prefix}-term-badge`);
  const titleCur = document.getElementById(`${prefix}-term-title`);
  const descCur = document.getElementById(`${prefix}-term-desc`);
  const badgeNext = document.getElementById(`${prefix}-term-badge-next`);
  const titleNext = document.getElementById(`${prefix}-term-title-next`);
  const descNext = document.getElementById(`${prefix}-term-desc-next`);
  const pillsContainer = document.getElementById(`${prefix}-term-pills`);

  // Synchronize the 5-Scene Holographic Visualizer & Pipeline Conduit
  updateSyncVisualizer(prefix, idx);

  if (!currentSlide || !titleCur) return;

  // Update active pill indicator
  if (pillsContainer) {
    pillsContainer.querySelectorAll(".term-pill-btn").forEach((btn, i) => {
      btn.classList.toggle("active", i === idx);
      if (termsList[i]) {
        btn.textContent = termsList[i].pill;
      }
    });
  }

  if (!animate || !nextSlide || !window.gsap) {
    if (badgeCur) badgeCur.textContent = item.badge;
    if (titleCur) titleCur.textContent = item.title;
    if (descCur) descCur.textContent = item.desc;
    if (window.gsap) {
      gsap.set(currentSlide, { yPercent: 0, opacity: 1, scale: 1 });
      if (nextSlide) gsap.set(nextSlide, { yPercent: -110, opacity: 0, scale: 0.96 });
    }
    return;
  }

  // Prepare incoming slide at the top (-110%)
  if (badgeNext) badgeNext.textContent = item.badge;
  if (titleNext) titleNext.textContent = item.title;
  if (descNext) descNext.textContent = item.desc;

  gsap.killTweensOf([currentSlide, nextSlide]);
  gsap.set(currentSlide, { yPercent: 0, opacity: 1, scale: 1 });
  gsap.set(nextSlide, { yPercent: -110, opacity: 0, scale: 0.96 });

  // Animate top-to-bottom vertical swap at a crisp, slightly faster 0.58s pace
  gsap.to(currentSlide, {
    yPercent: 110,
    opacity: 0,
    scale: 0.96,
    duration: 0.58,
    ease: "power3.inOut"
  });

  gsap.to(nextSlide, {
    yPercent: 0,
    opacity: 1,
    scale: 1,
    duration: 0.58,
    ease: "power3.inOut",
    onComplete: () => {
      if (badgeCur) badgeCur.textContent = item.badge;
      if (titleCur) titleCur.textContent = item.title;
      if (descCur) descCur.textContent = item.desc;
      gsap.set(currentSlide, { yPercent: 0, opacity: 1, scale: 1 });
      gsap.set(nextSlide, { yPercent: -110, opacity: 0, scale: 0.96 });
    }
  });
}

function startInlineTermSwapper() {
  if (inlineTermInterval) clearInterval(inlineTermInterval);
  swapTermTopToBottom("inline", currentInlineTermIdx, false);

  // Cycle every 2.8 seconds (snappier yet easily readable)
  inlineTermInterval = setInterval(() => {
    const introSec = document.getElementById("section-intro");
    if (introSec && introSec.classList.contains("active") && !isIntroActive) {
      currentInlineTermIdx = (currentInlineTermIdx + 1) % 5;
      swapTermTopToBottom("inline", currentInlineTermIdx, true);
    }
  }, 2800);
}

function initCinematicIntro() {
  const btnSkip = document.getElementById("btn-skip-intro");
  const btnPause = document.getElementById("btn-pause-intro");
  const btnLaunchHome = document.getElementById("btn-launch-home");
  const btnInlineHome = document.getElementById("btn-inline-enter-home");
  const btnOpenShowcase = document.getElementById("btn-open-fullscreen-showcase");
  const viewport = document.getElementById("intro-cinema-viewport");

  if (btnSkip) {
    btnSkip.addEventListener("click", () => {
      dismissCinematicIntro("section-home");
    });
  }

  if (btnLaunchHome) {
    btnLaunchHome.addEventListener("click", () => {
      dismissCinematicIntro("section-home");
    });
  }

  if (btnInlineHome) {
    btnInlineHome.addEventListener("click", () => {
      switchToSection("section-home");
    });
  }

  if (btnOpenShowcase) {
    btnOpenShowcase.addEventListener("click", () => {
      openCinematicIntro();
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      togglePauseCinematicIntro();
    });
  }

  // Pause auto-scroll if user manually scrolls with mouse wheel or touch
  if (viewport) {
    const pauseOnManualScroll = () => {
      if (isIntroActive && !isIntroPaused && introMasterTimeline) {
        togglePauseCinematicIntro(true);
      }
    };
    viewport.addEventListener("wheel", pauseOnManualScroll, { passive: true });
    viewport.addEventListener("touchmove", pauseOnManualScroll, { passive: true });
  }

  // Wire up interactive term selector pills AND pipeline nodes for both overlay and inline swapper
  ["overlay", "inline"].forEach((prefix) => {
    const pillsWrap = document.getElementById(`${prefix}-term-pills`);
    if (pillsWrap) {
      pillsWrap.querySelectorAll(".term-pill-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-term-idx"), 10) || 0;
          if (prefix === "overlay") {
            currentOverlayTermIdx = idx;
            swapTermTopToBottom("overlay", idx, true);
          } else {
            currentInlineTermIdx = idx;
            swapTermTopToBottom("inline", idx, true);
            startInlineTermSwapper();
          }
        });
      });
    }

    const syncVis = document.getElementById(`${prefix}-sync-visualizer`);
    if (syncVis) {
      syncVis.querySelectorAll(".sync-node").forEach((node) => {
        node.addEventListener("click", () => {
          const idx = parseInt(node.getAttribute("data-node"), 10) || 0;
          if (prefix === "overlay") {
            currentOverlayTermIdx = idx;
            swapTermTopToBottom("overlay", idx, true);
          } else {
            currentInlineTermIdx = idx;
            swapTermTopToBottom("inline", idx, true);
            startInlineTermSwapper();
          }
        });
      });
    }
  });

  // Register ScrollToPlugin if available
  if (window.gsap && window.ScrollToPlugin) {
    gsap.registerPlugin(ScrollToPlugin);
  }

  // Initialize Live 60fps Post-Quantum Lattice Canvas & 5-Step Process Pulse
  initQuantumLatticeCanvas();
  startProcessStepPulse();

  // Live UTC Clock
  updateIntroClock();
  if (!introClockInterval) {
    introClockInterval = setInterval(updateIntroClock, 1000);
  }

  // Start inline top-to-bottom swapper
  startInlineTermSwapper();

  // Only auto-trigger cinematic intro on initial load if the user already has an active session;
  // otherwise Auth Gateway triggers it cleanly right after Sign In / Guest Access.
  if (localStorage.getItem("fgp_auth_user")) {
    setTimeout(() => {
      openCinematicIntro();
    }, 150);
  }
}

function togglePauseCinematicIntro(forcePause = null) {
  if (!introMasterTimeline) return;
  const btnPause = document.getElementById("btn-pause-intro");
  const pauseLbl = document.getElementById("pause-intro-label");

  isIntroPaused = forcePause !== null ? forcePause : !isIntroPaused;
  if (isIntroPaused) {
    introMasterTimeline.pause();
    if (btnPause) btnPause.classList.add("paused");
    if (pauseLbl) {
      pauseLbl.textContent = currentLang === "ar"
        ? "▶ استئناف العرض التلقائي (Resume Tour)"
        : "▶ Resume Auto-Scroll";
    }
  } else {
    introMasterTimeline.play();
    if (btnPause) btnPause.classList.remove("paused");
    if (pauseLbl) {
      pauseLbl.textContent = currentLang === "ar"
        ? "⏸ إيقاف مؤقت للقراءة (Pause Auto-Scroll)"
        : "⏸ Pause Auto-Scroll";
    }
  }
}

function updateIntroClock() {
  const clockEl = document.getElementById("intro-hud-clock");
  if (!clockEl) return;
  const now = new Date();
  const utcStr = now.toUTCString().split(" ")[4] || "00:00:00";
  clockEl.textContent = `${utcStr} UTC`;
}

function updateScrubber(pct, activeStep) {
  const bar = document.getElementById("intro-scrubber-bar");
  if (bar) bar.style.width = `${pct}%`;

  [1, 2, 3].forEach(step => {
    const el = document.getElementById(`step-mark-${step}`);
    if (el) {
      el.classList.toggle("active", step === activeStep);
    }
  });
}

function openCinematicIntro() {
  const overlay = document.getElementById("cinematic-intro-overlay");
  const viewport = document.getElementById("intro-cinema-viewport");
  if (!overlay || !viewport) return;

  isIntroActive = true;
  isIntroPaused = false;
  const btnPause = document.getElementById("btn-pause-intro");
  const pauseLbl = document.getElementById("pause-intro-label");
  if (btnPause) btnPause.classList.remove("paused");
  if (pauseLbl) {
    pauseLbl.textContent = currentLang === "ar"
      ? "⏸ إيقاف مؤقت للقراءة (Pause Auto-Scroll)"
      : "⏸ Pause Auto-Scroll";
  }

  overlay.classList.remove("dismissed");
  overlay.style.display = "flex";
  viewport.scrollTop = 0;

  // Reset scrubber & first term
  updateScrubber(10, 1);
  currentOverlayTermIdx = 0;
  swapTermTopToBottom("overlay", 0, false);

  // Kill previous timeline if active
  if (introMasterTimeline) {
    introMasterTimeline.kill();
    introMasterTimeline = null;
  }

  const wireRect = document.querySelector(".svg-wire-rect");
  const teleFill = document.getElementById("telemetry-bar-fill");
  const teleStatus = document.getElementById("tele-status-text");
  const stage2El = document.getElementById("intro-stage-2");
  const stage3El = document.getElementById("intro-stage-3");
  const cards = document.querySelectorAll(".cyber-showcase-card");
  const procCards = document.querySelectorAll("#intro-stage-2 .intro-process-step-card");
  const creditsFrame = document.querySelector("#intro-stage-3 .credits-cyber-frame");

  if (window.gsap) {
    introMasterTimeline = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          if (isIntroActive && !isIntroPaused) {
            dismissCinematicIntro("section-home");
          }
        }, 1200);
      }
    });

    // Stage 1: Technical HUD Wireframe Drawing (0s - 1.2s)
    if (wireRect) {
      gsap.set(wireRect, { strokeDashoffset: 3600 });
      introMasterTimeline.to(wireRect, {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power2.inOut"
      }, 0);
    }

    // Telemetry Progress Bar Fill across Stage 1 (0.1s - 10.6s)
    if (teleFill) {
      gsap.set(teleFill, { width: "0%" });
      introMasterTimeline.to(teleFill, {
        width: "100%",
        duration: 10.5,
        ease: "none"
      }, 0.1);
    }

    if (teleStatus) {
      introMasterTimeline.to(teleStatus, {
        duration: 0.1,
        onStart: () => {
          teleStatus.textContent = currentLang === "ar"
            ? "مزامنة المحرك التشفيري والمصطلحات..."
            : "SYNCHRONIZING CRYPTOGRAPHIC PIPELINE...";
        }
      }, 0.1);
    }

    // Balanced, Crisp Top-to-Bottom Term Swapping (2.2 seconds per term!)
    const termStepDelay = 2.2;
    for (let idx = 1; idx < 5; idx++) {
      introMasterTimeline.add(() => {
        currentOverlayTermIdx = idx;
        swapTermTopToBottom("overlay", idx, true);
      }, idx * termStepDelay);
    }

    // End of Stage 1 (~10.8s)
    introMasterTimeline.add(() => {
      if (teleStatus) {
        teleStatus.textContent = currentLang === "ar"
          ? "اكتملت مزامنة المصطلحات (100%)"
          : "PIPELINE_SYNCHRONIZED (100%)";
      }
      updateScrubber(38, 1);
    }, 10.6);

    // Stage 2: Smooth Glide to Key Features (11.0s -> 12.5s)
    introMasterTimeline.add(() => {
      updateScrubber(68, 2);
    }, 11.0);

    const s2TargetY = stage2El ? stage2El.offsetTop : viewport.clientHeight;

    introMasterTimeline.to(viewport, {
      scrollTop: s2TargetY,
      duration: 1.5,
      ease: "power3.inOut"
    }, 11.0);

    // Staggered entrance for the 4 Key Feature cards
    if (cards.length > 0) {
      introMasterTimeline.fromTo(cards,
        { opacity: 0, y: 30, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.65,
          stagger: 0.16,
          ease: "power2.out"
        },
        11.6
      );
    }

    // Glide to the 5-Step Encryption Processes inside Stage 2 (15.5s -> 16.9s)
    const procWrapper = document.querySelector("#intro-stage-2 .intro-processes-wrapper");
    if (procWrapper) {
      introMasterTimeline.to(viewport, {
        scrollTop: () => (stage2El ? stage2El.offsetTop + procWrapper.offsetTop - 90 : viewport.clientHeight * 1.4),
        duration: 1.4,
        ease: "power3.inOut"
      }, 15.5);
    }

    if (procCards.length > 0) {
      introMasterTimeline.fromTo(procCards,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.14,
          ease: "power2.out"
        },
        16.1
      );
    }

    // Stage 3: Smooth Glide to Developers & Academic Supervisor at the Very Bottom (20.2s -> 21.7s)
    introMasterTimeline.add(() => {
      updateScrubber(100, 3);
    }, 20.0);

    const s3TargetY = stage3El ? stage3El.offsetTop : viewport.clientHeight * 2.2;

    introMasterTimeline.to(viewport, {
      scrollTop: s3TargetY,
      duration: 1.5,
      ease: "power3.inOut"
    }, 20.2);

    if (creditsFrame) {
      introMasterTimeline.fromTo(creditsFrame,
        { opacity: 0, y: 26, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "power3.out" },
        20.9
      );
    }

    // Hold for 4.0 seconds at the bottom so user can clearly read Developers & Supervisor names
    introMasterTimeline.to({}, { duration: 4.0 });
  } else {
    // Offline / no-GSAP graceful fallback so intro never hangs indefinitely
    if (teleStatus) {
      teleStatus.textContent = currentLang === "ar"
        ? "وضع العرض التفاعلي (تصفح بحرية أو اضغط تخطي)"
        : "INTERACTIVE TOUR READY (SCROLL FREELY OR SKIP)";
    }
    if (teleFill) teleFill.style.width = "100%";
    updateScrubber(100, 1);
  }
}

function dismissCinematicIntro(targetSection = "section-home") {
  if (!isIntroActive) return;
  isIntroActive = false;
  isIntroPaused = false;

  if (introMasterTimeline) {
    introMasterTimeline.kill();
    introMasterTimeline = null;
  }

  const overlay = document.getElementById("cinematic-intro-overlay");
  if (overlay) {
    overlay.classList.add("dismissed");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 850);
  }

  if (targetSection) {
    switchToSection(targetSection);
  }
}

/* ==========================================================================
   0B. POST-QUANTUM HUD HERO: BLUEPRINT REVEAL, TOP-TO-BOTTOM REEL & PARALLAX
   ========================================================================== */
let isBlueprintAnimating = false;

/* Cryptographic Character Scrambler Utility */
function scrambleText(element, targetText, duration = 1200) {
  if (!element || !targetText) return;
  const chars = "0123456789ABCDEF0xλ§ΔΨΩ%&#@+*§~";
  const length = targetText.length;
  const startTime = performance.now();

  function updateScramble(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const revealedCount = Math.floor(progress * length);

    let output = "";
    for (let i = 0; i < length; i++) {
      if (i < revealedCount) {
        output += targetText[i];
      } else if (targetText[i] === " " || targetText[i] === "\n") {
        output += targetText[i];
      } else {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    element.textContent = output;

    if (progress < 1) {
      requestAnimationFrame(updateScramble);
    } else {
      element.textContent = targetText;
    }
  }

  requestAnimationFrame(updateScramble);
}

function triggerCipherScramble() {
  swapTermTopToBottom("inline", currentInlineTermIdx, false);
  swapTermTopToBottom("overlay", currentOverlayTermIdx, false);
}

function playBlueprintRevealAnimation() {
  if (isBlueprintAnimating) return;
  isBlueprintAnimating = true;

  const overlay = document.getElementById("blueprint-overlay-layer");
  const hudStatus = document.getElementById("hud-status-text");
  const hudCoords = document.getElementById("hud-coords");
  const bootCounterEl = document.getElementById("boot-counter");
  const bootHexEl = document.getElementById("boot-hex");
  const bgTitle = document.getElementById("hero-massive-bg-title");
  const headlineBlock = document.querySelector(".pq-hero-headline-block");
  const cards = document.querySelectorAll(".pillar-card");
  const wireLines = document.querySelectorAll(".svg-wire-line");

  if (!overlay) {
    isBlueprintAnimating = false;
    return;
  }

  // Phase 1 Reset: Show overlay with technical blueprint coordinate grid
  overlay.classList.remove("revealed");
  overlay.style.opacity = "1";
  overlay.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  if (bootCounterEl) bootCounterEl.textContent = "00%";
  if (bootHexEl) bootHexEl.textContent = "0x00";

  if (hudStatus) {
    hudStatus.textContent = currentLang === "ar"
      ? "جارٍ رسم وتدقيق المخطط الهيكلي (DRAWING_WIREFRAME)..."
      : "INITIALIZING_SKELETON...";
  }

  // Rapidly randomize technical HUD coordinates
  let tickCount = 0;
  const coordInterval = setInterval(() => {
    tickCount++;
    if (hudCoords) {
      const rx = (Math.random() * 800 + 120).toFixed(1);
      const ry = (Math.random() * 600 + 40).toFixed(1);
      hudCoords.textContent = `COORD: X.${rx} • Y.${ry} [LAT-768]`;
    }
    if (tickCount > 24) clearInterval(coordInterval);
  }, 80);

  if (window.gsap) {
    const tl = gsap.timeline({
      onComplete: () => {
        clearInterval(coordInterval);
        isBlueprintAnimating = false;
      }
    });

    gsap.set(wireLines, { strokeDashoffset: 2000, opacity: 0.95 });

    tl.to(wireLines, {
      strokeDashoffset: 0,
      duration: 1.4,
      stagger: 0.09,
      ease: "power2.inOut"
    }, 0);

    const bootObj = { val: 0 };
    const hexCodes = ["0x00", "0x1C", "0x3A", "0x5E", "0x82", "0xA7", "0xC9", "0xE4", "0xFF"];

    tl.to(bootObj, {
      val: 100,
      duration: 1.55,
      ease: "power2.inOut",
      onUpdate: () => {
        const p = Math.floor(bootObj.val);
        if (bootCounterEl) bootCounterEl.textContent = (p < 10 ? "0" : "") + p + "%";
        if (bootHexEl) {
          const hexIdx = Math.min(Math.floor((p / 100) * hexCodes.length), hexCodes.length - 1);
          bootHexEl.textContent = hexCodes[hexIdx];
        }
      }
    }, 0);

    tl.to(hudStatus, {
      duration: 0.4,
      onStart: () => {
        if (hudStatus) {
          hudStatus.textContent = currentLang === "ar"
            ? "معايرة مصفوفة كايبر ML-KEM-768 (64%)..."
            : "CALIBRATING_LATTICE_KEM (64%)...";
        }
      }
    }, 0.65);

    tl.to(hudStatus, {
      duration: 0.35,
      onStart: () => {
        if (hudStatus) {
          hudStatus.textContent = currentLang === "ar"
            ? "اكتمال المحاكاة والانتقال للعرض الحي (100%)"
            : "QUANTUM_SHIELD_ONLINE (100%)";
        }
      }
    }, 1.35);

    tl.to(overlay, {
      clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)",
      opacity: 0,
      duration: 1.0,
      ease: "power3.inOut",
      onComplete: () => {
        overlay.classList.add("revealed");
      }
    }, 1.55);

    if (bgTitle) {
      tl.fromTo(bgTitle,
        { opacity: 0, scale: 0.78, y: 35 },
        { opacity: 0.95, scale: 1, y: 0, duration: 0.95, ease: "back.out(1.4)" },
        1.65
      );
    }

    if (headlineBlock) {
      tl.fromTo(headlineBlock,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        1.7
      );
    }

    if (cards.length > 0) {
      tl.fromTo(cards,
        { opacity: 0, y: 40, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, stagger: 0.15, ease: "power3.out" },
        1.8
      );
    }

    tl.add(() => {
      startInlineTermSwapper();
    }, 1.8);

  } else {
    overlay.classList.add("revealed");
    clearInterval(coordInterval);
    isBlueprintAnimating = false;
    startInlineTermSwapper();
  }
}

/* Mouse Parallax Depth Effect on Massive Background Title & Security Cards */
function initHeroParallax() {
  const container = document.getElementById("pq-intro-container");
  const bgTitleWrap = document.getElementById("hero-massive-wrap");
  const cards = document.querySelectorAll(".pillar-card");

  if (!container || !bgTitleWrap) return;

  let rafId = null;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    targetX = x;
    targetY = y;

    if (!rafId) {
      rafId = requestAnimationFrame(updateParallax);
    }
  });

  container.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
    if (!rafId) {
      rafId = requestAnimationFrame(updateParallax);
    }
  });

  function updateParallax() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    // Shift massive background headline in subtle opposite parallax
    bgTitleWrap.style.transform = `translate(calc(-50% + ${-currentX * 35}px), calc(-50% + ${-currentY * 25}px))`;

    // Subtle 3D tilt on cards
    cards.forEach((card, i) => {
      const depth = (i % 2 === 0 ? 1 : 1.25);
      card.style.transform = `perspective(1000px) rotateY(${currentX * 6 * depth}deg) rotateX(${-currentY * 6 * depth}deg) translateY(${currentY * 4}px)`;
    });

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      rafId = requestAnimationFrame(updateParallax);
    } else {
      rafId = null;
      if (targetX === 0 && targetY === 0) {
        bgTitleWrap.style.transform = "translate(-50%, -50%)";
        cards.forEach((card) => { card.style.transform = ""; });
      }
    }
  }
}

function initPortfolioIntro() {
  // Replay Blueprint button
  const btnReplay = document.getElementById("btn-replay-blueprint");
  if (btnReplay) {
    btnReplay.addEventListener("click", () => {
      playBlueprintRevealAnimation();
    });
  }

  // CTA Button: Explore Workstation -> switch to Home
  const btnExplore = document.getElementById("btn-hero-explore-workstation");
  if (btnExplore) {
    btnExplore.addEventListener("click", () => {
      switchToSection("section-home");
    });
  }

  // CTA Button: View Specs -> switch to Info
  const btnInfo = document.getElementById("btn-hero-view-info");
  if (btnInfo) {
    btnInfo.addEventListener("click", () => {
      switchToSection("section-info");
    });
  }

  // Interactive Pillar Cards Click Routing
  const cards = document.querySelectorAll(".pillar-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const action = card.getAttribute("data-target-action");
      if (action === "vault") {
        if (typeof openVaultModal === "function") {
          openVaultModal();
        } else {
          switchToSection("section-home");
        }
      } else if (action === "encrypt-sign") {
        switchToSection("section-encrypt");
        if (typeof setOperationMode === "function") {
          setOperationMode("signature", true);
        }
      } else if (action === "encrypt-standard") {
        switchToSection("section-encrypt");
        if (typeof setOperationMode === "function") {
          setOperationMode("encryption", true);
        }
      } else if (action === "channel") {
        switchToSection("section-channel");
      }
    });

    // Keyboard accessibility Enter / Space
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Initialize mouse parallax
  initHeroParallax();

  // ScrollTrigger reveals for sections below the fold if GSAP ScrollTrigger loaded
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(".home-quick-card, .decision-service-card, .stat-card").forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none"
          }
        }
      );
    });
  }

  // Automatically trigger blueprint reveal animation on initial load
  setTimeout(() => {
    const introSection = document.getElementById("section-intro");
    if (introSection && introSection.classList.contains("active")) {
      playBlueprintRevealAnimation();
    }
  }, 150);
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

/* ==========================================================================
   1B. INTERACTIVE ROUTING QUESTIONNAIRE (HOME PAGE GUIDED DECISION HUB)
   ========================================================================== */
function updateQuestionnaireSelectionUI(service, notify = false) {
  state.selectedQuestionnaireService = service;

  const services = ["signature", "encryption", "info"];
  services.forEach((srv) => {
    const card = document.getElementById(`q-card-${srv}`);
    const pill = document.getElementById(`q-pill-${srv}`);
    if (card) {
      card.classList.toggle("active", srv === service);
      const yesBtn = card.querySelector('[data-q-action="select"]');
      if (yesBtn) yesBtn.classList.toggle("active", srv === service);
    }
    if (pill) {
      pill.classList.toggle("hidden", srv !== service);
    }
  });

  const selectedLabelEl = document.getElementById("q-proceed-selected-text");
  if (selectedLabelEl) {
    const keyMap = {
      signature: "q_sel_sig",
      encryption: "q_sel_enc",
      info: "q_sel_info",
    };
    const i18nKey = keyMap[service] || "q_sel_sig";
    selectedLabelEl.setAttribute("data-i18n", i18nKey);
    const dict = I18N_DATA[currentLang] || I18N_DATA.ar;
    if (dict[i18nKey]) {
      selectedLabelEl.textContent = dict[i18nKey];
    }
  }

  if (notify) {
    const dict = I18N_DATA[currentLang] || I18N_DATA.ar;
    const keyMap = {
      signature: "q_sel_sig",
      encryption: "q_sel_enc",
      info: "q_sel_info",
    };
    const label = dict[keyMap[service]] || service;
    showToast(
      currentLang === "ar"
        ? `تم اختيار الخدمة: ${label}. اضغط على زر الانتقال للمتابعة.`
        : `Selected service: ${label}. Click Proceed to launch.`,
      "info"
    );
  }
}

function executeQuestionnaireProceed(serviceOverride = null) {
  const targetService = serviceOverride || state.selectedQuestionnaireService || "signature";

  if (targetService === "signature") {
    switchToSection("section-encrypt");
    if (typeof setOperationMode === "function") {
      setOperationMode("signature", true);
    }
    setTimeout(() => {
      const txt = document.getElementById("encrypt-text");
      if (txt) txt.focus();
    }, 250);
  } else if (targetService === "encryption") {
    switchToSection("section-encrypt");
    if (typeof setOperationMode === "function") {
      setOperationMode("encryption", true);
    }
    setTimeout(() => {
      const txt = document.getElementById("encrypt-text");
      if (txt) txt.focus();
    }, 250);
  } else if (targetService === "info") {
    switchToSection("section-info");
    const allTab = document.querySelector('.info-subtab[data-info-filter="all"]');
    if (allTab) allTab.click();
    showToast(
      currentLang === "ar"
        ? "تم فتح قسم التفاصيل التقنية والمعمارية الهندسية."
        : "Opened Technical & Operational Process Details.",
      "info"
    );
  }
}

function initRoutingQuestionnaire() {
  const choiceBtns = document.querySelectorAll(".q-choice-btn");
  choiceBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.qAction;
      const target = btn.dataset.qTarget;
      if (!target) return;

      if (action === "select") {
        updateQuestionnaireSelectionUI(target, true);
      } else if (action === "more" || action === "meaning" || action === "support") {
        updateQuestionnaireSelectionUI(target, false);
        const drawerId = `q-${action}-${target}`;
        const targetDrawer = document.getElementById(drawerId);
        const card = document.getElementById(`q-card-${target}`);

        if (card && targetDrawer) {
          const isCurrentlyHidden = targetDrawer.classList.contains("hidden");
          // Hide all drawers in this card first
          card.querySelectorAll(".q-drawer").forEach((d) => d.classList.add("hidden"));
          card.querySelectorAll('.q-choice-btn:not([data-q-action="select"])').forEach((b) => {
            b.classList.remove("drawer-open");
          });

          if (isCurrentlyHidden) {
            targetDrawer.classList.remove("hidden");
            btn.classList.add("drawer-open");
          }
        }
      }
    });
  });

  // Also allow clicking on a question card header/question to select it
  document.querySelectorAll(".q-item-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest(".q-drawer")) return;
      const srv = card.dataset.qService;
      if (srv) updateQuestionnaireSelectionUI(srv, false);
    });
  });

  // Handle sub-option jump buttons inside "Show more options" and "Contact the Engineer / Support"
  document.querySelectorAll(".q-subopt-btn").forEach((subBtn) => {
    subBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const jump = subBtn.dataset.qJump;
      if (jump === "signature-create") {
        executeQuestionnaireProceed("signature");
      } else if (jump === "signature-verify" || jump === "decrypt-extract") {
        switchToSection("section-decrypt");
      } else if (jump === "encryption-standard") {
        executeQuestionnaireProceed("encryption");
      } else if (jump === "live-channel") {
        switchToSection("section-channel");
      } else if (jump === "open-vault") {
        const vaultModal = document.getElementById("vault-modal");
        if (vaultModal) vaultModal.classList.remove("hidden");
      } else if (jump === "info-arch") {
        switchToSection("section-info");
        const archTab = document.querySelector('.info-subtab[data-info-filter="arch"]');
        if (archTab) archTab.click();
      } else if (jump === "info-decisions") {
        switchToSection("section-info");
        const decTab = document.querySelector('.info-subtab[data-info-filter="decisions"]');
        if (decTab) decTab.click();
      } else if (jump === "view-team") {
        switchToSection("section-info");
        const teamTab = document.querySelector('.info-subtab[data-info-filter="team"]');
        if (teamTab) teamTab.click();
      } else if (jump === "contact-eng1") {
        navigator.clipboard.writeText("abdulallah.ayad@student.uomustansiriyah.edu.iq");
        showToast(
          currentLang === "ar"
            ? "تم نسخ بريد الباحث عبدالله إياد إلى الحافظة!"
            : "Copied Engineer Abdulallah Ayad's email to clipboard!",
          "success"
        );
      } else if (jump === "contact-eng2") {
        navigator.clipboard.writeText("karrar mayaly@gmail.com");
        showToast(
          currentLang === "ar"
            ? "تم نسخ بريد المهندس كرار حيدر إسماعيل إلى الحافظة!"
            : "Copied Engineer Karrar Haider's contact to clipboard!",
          "success"
        );
      }
    });
  });

  // Main Proceed / Go Button
  const btnProceed = document.getElementById("btn-questionnaire-proceed");
  if (btnProceed) {
    btnProceed.addEventListener("click", () => {
      executeQuestionnaireProceed();
    });
  }
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
      if (vaultPk) vaultPk.value = "";
      if (vaultSk) vaultSk.value = "";

      const btnCopyVaultPk = document.getElementById("btn-copy-vault-pk");
      const btnCopyVaultSk = document.getElementById("btn-copy-vault-sk");
      if (btnCopyVaultPk) btnCopyVaultPk.disabled = false;
      if (btnCopyVaultSk) btnCopyVaultSk.disabled = false;

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
  const btnCopyVaultPk = document.getElementById("btn-copy-vault-pk");
  const btnCopyVaultSk = document.getElementById("btn-copy-vault-sk");
  const btnUseVault = document.getElementById("btn-use-vault-keys");

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

  // Copy public token from vault (Copy to clipboard only, download disabled)
  if (btnCopyVaultPk) {
    btnCopyVaultPk.addEventListener("click", () => {
      const val = state.localKeys.pk || document.getElementById("vault-pk")?.value;
      if (!val) {
        showToast(currentLang === "ar" ? "يرجى توليد زوج المفاتيح أولاً." : "Please generate keys first.", "info");
        return;
      }
      navigator.clipboard.writeText(val);
      showToast(
        currentLang === "ar" ? "تم نسخ الرمز العام (ML-KEM-768) إلى الحافظة بنجاح!" : "Public token copied to clipboard!",
        "success"
      );
    });
  }

  // Copy secret token from vault (Copy to clipboard only, download disabled)
  if (btnCopyVaultSk) {
    btnCopyVaultSk.addEventListener("click", () => {
      const val = state.localKeys.sk || document.getElementById("vault-sk")?.value;
      if (!val) {
        showToast(currentLang === "ar" ? "يرجى توليد زوج المفاتيح أولاً." : "Please generate keys first.", "info");
        return;
      }
      navigator.clipboard.writeText(val);
      showToast(
        currentLang === "ar" ? "تم نسخ الرمز السري (ML-KEM-768) إلى الحافظة بنجاح!" : "Secret token copied to clipboard!",
        "success"
      );
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
}

function saveKeysToStorage() {
  try {
    localStorage.removeItem("kyber_pk");
    localStorage.removeItem("kyber_sk");
    sessionStorage.setItem("kyber_pk", state.localKeys.pk || "");
    sessionStorage.setItem("kyber_sk", state.localKeys.sk || "");
  } catch (e) { }
}

function loadKeysFromStorage() {
  try {
    // Migrate any legacy persistent keys out of localStorage immediately
    const legacyPk = localStorage.getItem("kyber_pk");
    const legacySk = localStorage.getItem("kyber_sk");
    if (legacyPk || legacySk) {
      if (legacyPk && legacySk && !sessionStorage.getItem("kyber_sk")) {
        sessionStorage.setItem("kyber_pk", legacyPk);
        sessionStorage.setItem("kyber_sk", legacySk);
      }
      localStorage.removeItem("kyber_pk");
      localStorage.removeItem("kyber_sk");
    }

    const pk = sessionStorage.getItem("kyber_pk");
    const sk = sessionStorage.getItem("kyber_sk");
    if (pk && sk) {
      state.localKeys.pk = pk;
      state.localKeys.sk = sk;
      const btnCopyVaultPk = document.getElementById("btn-copy-vault-pk");
      const btnCopyVaultSk = document.getElementById("btn-copy-vault-sk");
      if (btnCopyVaultPk) btnCopyVaultPk.disabled = false;
      if (btnCopyVaultSk) btnCopyVaultSk.disabled = false;
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
   3. STEGANOGRAPHY COVER SIZE CALCULATOR, DROPZONES & CAPACITY ALERT MODAL
   ========================================================================== */
let currentUploadedCover = null;
let lastCapacityModalKey = "";
let lastCalculatedCapacity = {
  rawBytes: 0,
  packageBytes: 0,
  minDim: 0,
  isSufficient: true,
  exceedsTier4: false,
  exceedsSafeMax: false,
  matchedTier: null,
};

function formatHumanBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function attachDropzone(zoneId, inputId, onClear = null) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    input.click();
  });

  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });

  ["dragenter", "dragover"].forEach((evName) => {
    zone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add("is-dragover");
    });
  });

  ["dragleave", "dragend"].forEach((evName) => {
    zone.addEventListener(evName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove("is-dragover");
      }
    });
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove("is-dragover");
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    try {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (_) {
      showToast(
        currentLang === "ar" ? "يرجى النقر على الصندوق لاختيار الملف." : "Please click the dropbox to browse the file.",
        "info"
      );
    }
  });

  if (onClear) {
    zone.dataset.hasClear = "1";
  }
}

async function loadDefaultCoverTiers() {
  try {
    const res = await fetch("/api/stego/default-covers");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.tiers) && data.tiers.length > 0) {
      state.defaultCoverTiers = data.tiers;
    }
    if (data.max_safe_stego_bytes) {
      state.maxSafeStegoBytes = data.max_safe_stego_bytes;
    }
    renderDefaultCoverTiers();
    updateStegoCapacity();
  } catch (_) {
    renderDefaultCoverTiers();
  }
}

function renderDefaultCoverTiers() {
  const grid = document.getElementById("default-cover-tier-grid");
  const badge = document.getElementById("default-cover-badge");
  const btnAuto = document.getElementById("btn-auto-cover-mode");
  if (!grid) return;

  const pkgBytes = lastCalculatedCapacity.packageBytes || 0;
  const isCustomCover = Boolean(currentUploadedCover);
  const autoTier = getBestDefaultTierForPackage(pkgBytes);

  if (badge) {
    if (isCustomCover) {
      badge.textContent = currentLang === "ar" ? "صورة مخصصة نشطة" : "Custom Image Active";
    } else if (state.selectedDefaultCoverId === "auto") {
      badge.textContent = currentLang === "ar" ? "اختيار ذكي تلقائي" : "Smart Auto-Select";
    } else {
      badge.textContent = currentLang === "ar" ? "منظر طبيعي محدد يدوياً" : "Manual Landscape";
    }
  }

  if (btnAuto) {
    btnAuto.classList.toggle("hidden", isCustomCover || state.selectedDefaultCoverId === "auto");
  }

  grid.innerHTML = state.defaultCoverTiers
    .map((tier) => {
      const fits = pkgBytes === 0 || pkgBytes <= tier.capacity_bytes;
      const isActive =
        !isCustomCover &&
        (state.selectedDefaultCoverId === tier.id ||
          (state.selectedDefaultCoverId === "auto" && autoTier && autoTier.id === tier.id));
      const label = currentLang === "ar" ? tier.label_ar : tier.label_en;
      const capText = formatHumanBytes(tier.capacity_bytes);
      const pill = isActive
        ? `<span class="cover-tier-pill">${
            state.selectedDefaultCoverId === "auto"
              ? currentLang === "ar"
                ? "تلقائي ✓"
                : "Auto ✓"
              : currentLang === "ar"
                ? "محدد ✓"
                : "Selected ✓"
          }</span>`
        : "";
      return `
        <button type="button" class="cover-tier-card ${isActive ? "active" : ""} ${!fits ? "insufficient" : ""}"
          data-tier-id="${escapeHtml(tier.id)}">
          ${pill}
          <img class="cover-tier-thumb" src="${escapeHtml(tier.url)}" alt="${escapeHtml(label)}">
          <div class="cover-tier-meta">
            <strong>${escapeHtml(label)}</strong>
            <span>${Number(tier.width)}×${Number(tier.height)} &bull; ${escapeHtml(capText)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll(".cover-tier-card").forEach((card) => {
    card.addEventListener("click", () => {
      const tierId = card.dataset.tierId;
      if (!tierId) return;
      // Clear uploaded custom cover when user chooses a preset landscape
      const coverInput = document.getElementById("encrypt-cover-image");
      if (coverInput) coverInput.value = "";
      currentUploadedCover = null;
      syncCoverDropzoneUI(null);
      state.selectedDefaultCoverId = tierId;
      lastCapacityModalKey = "";
      updateStegoCapacity(null, true);
    });
  });
}

function getBestDefaultTierForPackage(packageBytes) {
  const tiers = state.defaultCoverTiers || [];
  if (tiers.length === 0) return null;
  if (!packageBytes || packageBytes <= 0) return tiers[0];
  for (const tier of tiers) {
    if (packageBytes <= tier.capacity_bytes) {
      return tier;
    }
  }
  return null;
}

function openCapacityAlertModal(reason, details = {}) {
  const modal = document.getElementById("capacity-alert-modal");
  if (!modal) return;

  const badgeEl = document.getElementById("cap-modal-badge");
  const titleEl = document.getElementById("cap-modal-title");
  const detailEl = document.getElementById("cap-modal-detail");
  const reqValEl = document.getElementById("cap-metric-req-val");
  const curValEl = document.getElementById("cap-metric-cur-val");
  const deltaPillEl = document.getElementById("cap-delta-pill");
  const gaugeFillEl = document.getElementById("cap-gauge-fill");

  const btnDefault = document.getElementById("btn-cap-use-default");
  const recThumbEl = document.getElementById("cap-rec-thumb");
  const recSubEl = document.getElementById("cap-rec-sub");
  const btnDirect = document.getElementById("btn-cap-switch-direct");
  const dirBadgeEl = document.getElementById("cap-dir-badge");
  const btnUploadLarger = document.getElementById("btn-cap-upload-larger");

  const pkgBytes = details.packageBytes || lastCalculatedCapacity.packageBytes || 0;
  const minDim = details.minDim || lastCalculatedCapacity.minDim || 0;
  const reqStr = `${formatHumanBytes(pkgBytes)} • ≥ ${minDim.toLocaleString()}×${minDim.toLocaleString()}`;
  const bestTier = getBestDefaultTierForPackage(pkgBytes);

  if (reqValEl) reqValEl.textContent = reqStr;

  if (reason === "huge_payload") {
    const safeCap = state.maxSafeStegoBytes || 9749964;
    const ratio = safeCap > 0 ? Math.max(1.1, pkgBytes / safeCap) : 1;
    if (badgeEl) {
      badgeEl.textContent = currentLang === "ar" ? "تجاوز سقف الإخفاء الآمن" : "SAFE STEGO LIMIT";
    }
    if (titleEl) {
      titleEl.textContent =
        currentLang === "ar" ? "حجم البيانات ضخم جداً على الإخفاء الصوري" : "Payload Too Large for Safe PNG Stego";
    }
    if (detailEl) {
      detailEl.textContent =
        currentLang === "ar"
          ? "تجنباً لتوليد صورة عملاقة بحجم 50–100 MB، حوّل للتشفير الكمومي المباشر لحماية الملف بسرعة فائقة."
          : "To avoid generating a slow 50–100 MB image carrier, switch to Direct Quantum-Safe PQC for instant compact encryption.";
    }
    if (curValEl) {
      curValEl.textContent =
        currentLang === "ar"
          ? `${formatHumanBytes(safeCap)} (الحد الأقصى الآمن)`
          : `${formatHumanBytes(safeCap)} (Safe Max)`;
    }
    if (deltaPillEl) {
      deltaPillEl.textContent =
        currentLang === "ar" ? `${ratio.toFixed(1)}× فوق السقف` : `${ratio.toFixed(1)}× Over Limit`;
    }
    if (gaugeFillEl) gaugeFillEl.style.width = "100%";

    if (btnDefault) btnDefault.classList.add("hidden");
    if (btnDirect) {
      btnDirect.classList.remove("hidden");
      btnDirect.classList.add("is-hero");
    }
    if (dirBadgeEl) dirBadgeEl.classList.remove("hidden");
    if (btnUploadLarger) btnUploadLarger.classList.remove("hidden");
  } else {
    const curW = details.curWidth || currentUploadedCover?.width || 0;
    const curH = details.curHeight || currentUploadedCover?.height || 0;
    const curCap = details.curCapBytes || currentUploadedCover?.capacityBytes || 0;
    const fitsSafe = pkgBytes <= state.maxSafeStegoBytes;
    const deficit = Math.max(0, pkgBytes - curCap);
    const ratio = curCap > 0 ? Math.max(1.05, pkgBytes / curCap) : 1;

    if (badgeEl) {
      badgeEl.textContent = currentLang === "ar" ? "عدم كفاية سعة الصورة" : "CARRIER TOO SMALL";
    }
    if (titleEl) {
      titleEl.textContent =
        currentLang === "ar" ? "صورة الغلاف الحالية أصغر من البيانات" : "Cover Image Cannot Fit Your Payload";
    }
    if (detailEl) {
      detailEl.textContent = fitsSafe
        ? currentLang === "ar"
          ? "الصورة المختارة لا تملك بكسلات كافية لإخفاء الحزمة المشفرة — اختر المنظر الطبيعي المناسب أو ارفع صورة أكبر."
          : "This cover lacks enough pixels for your encrypted payload. Let the system match a landscape carrier or upload a larger image."
        : currentLang === "ar"
          ? "الحجم يتجاوز أيضاً حد الصور الافتراضية الآمن — استخدم التشفير الكمومي المباشر أو ارفع صورة مخصصة ضخمة."
          : "Payload also exceeds automatic landscape limits. Use Direct Quantum-Safe PQC or supply a high-resolution custom cover.";
    }
    if (curValEl) {
      curValEl.textContent = `${formatHumanBytes(curCap)} • ${curW}×${curH}`;
    }
    if (deltaPillEl) {
      deltaPillEl.textContent =
        currentLang === "ar"
          ? `عجز +${formatHumanBytes(deficit)} (${ratio.toFixed(1)}×)`
          : `+${formatHumanBytes(deficit)} short (${ratio.toFixed(1)}×)`;
    }
    if (gaugeFillEl) {
      const pct = curCap > 0 ? Math.min(100, Math.round((curCap / pkgBytes) * 100)) : 8;
      gaugeFillEl.style.width = `${Math.max(12, pct)}%`;
    }

    if (btnDefault) {
      btnDefault.classList.toggle("hidden", !fitsSafe);
      if (fitsSafe) {
        const previewTier = bestTier || state.defaultCoverTiers[state.defaultCoverTiers.length - 1];
        if (recThumbEl && previewTier?.url) recThumbEl.src = previewTier.url;
        if (recSubEl && bestTier) {
          const tName = currentLang === "ar" ? bestTier.label_ar : bestTier.label_en;
          recSubEl.textContent = `${tName} • ${bestTier.width}×${bestTier.height} px (${formatHumanBytes(bestTier.capacity_bytes)})`;
        } else if (recSubEl) {
          recSubEl.textContent =
            currentLang === "ar"
              ? "بانوراما جبال الألب مكبّرة تلقائياً لتلائم حجم بياناتك"
              : "Dynamic high-res scaled alpine panorama fit";
        }
      }
    }
    if (btnDirect) {
      btnDirect.classList.remove("hidden");
      btnDirect.classList.toggle("is-hero", !fitsSafe);
    }
    if (dirBadgeEl) dirBadgeEl.classList.toggle("hidden", fitsSafe);
    if (btnUploadLarger) btnUploadLarger.classList.remove("hidden");
  }

  modal.classList.remove("hidden");
}

function closeCapacityAlertModal() {
  const modal = document.getElementById("capacity-alert-modal");
  if (modal) modal.classList.add("hidden");
}

function initCapacityAlertModal() {
  const modal = document.getElementById("capacity-alert-modal");
  const btnClose = document.getElementById("btn-close-capacity-modal");
  const btnDismiss = document.getElementById("btn-cap-dismiss");
  const btnUseDefault = document.getElementById("btn-cap-use-default");
  const btnSwitchDirect = document.getElementById("btn-cap-switch-direct");
  const btnUploadLarger = document.getElementById("btn-cap-upload-larger");

  if (btnClose) btnClose.addEventListener("click", closeCapacityAlertModal);
  if (btnDismiss) btnDismiss.addEventListener("click", closeCapacityAlertModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeCapacityAlertModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeCapacityAlertModal();
    }
  });

  if (btnUseDefault) {
    btnUseDefault.addEventListener("click", () => {
      const coverInput = document.getElementById("encrypt-cover-image");
      if (coverInput) coverInput.value = "";
      currentUploadedCover = null;
      syncCoverDropzoneUI(null);
      state.selectedDefaultCoverId = "auto";
      closeCapacityAlertModal();
      updateStegoCapacity();
      showToast(
        currentLang === "ar"
          ? "تم التبديل تلقائياً إلى المنظر الطبيعي المتوافق مع حجم بياناتك!"
          : "Switched to auto-matched high-texture landscape cover!",
        "success"
      );
    });
  }

  if (btnSwitchDirect) {
    btnSwitchDirect.addEventListener("click", () => {
      closeCapacityAlertModal();
      setOperationMode("direct_pqc", true);
    });
  }

  if (btnUploadLarger) {
    btnUploadLarger.addEventListener("click", () => {
      closeCapacityAlertModal();
      const coverInput = document.getElementById("encrypt-cover-image");
      if (coverInput) coverInput.click();
    });
  }
}

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

function updateStegoCapacity(forcedType = null, triggerPopupOnMismatch = false) {
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

  if (state.operationMode === "signature") {
    isDocType = true;
  } else if (forcedType) {
    isDocType = forcedType === "document";
  } else if (overrideVal) {
    isDocType = overrideVal === "document";
  }

  const msgBox = document.getElementById("cover-size-msg");
  const labelEl = document.getElementById("cover-size-label");
  const valEl = document.getElementById("cover-size-val");

  if (!msgBox || !valEl) return;

  if (rawBytes === 0) {
    lastCalculatedCapacity = {
      rawBytes: 0,
      packageBytes: 0,
      minDim: 0,
      isSufficient: true,
      exceedsTier4: false,
      exceedsSafeMax: false,
      matchedTier: getBestDefaultTierForPackage(0),
    };
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) labelEl.textContent = currentLang === "ar" ? "أبعاد الصورة الناقلة المطلوبة:" : "Required cover image size:";
    valEl.textContent = currentLang === "ar" ? "بانتظار البيانات..." : "Awaiting payload...";
    renderDefaultCoverTiers();
    return;
  }

  const packageBytes = estimatePackageBytes(rawBytes, isDocType);
  const framedBytes = packageBytes + 36;
  const minPixels = Math.ceil((framedBytes * 8) / 3);
  const minDim = Math.ceil(Math.sqrt(minPixels));
  const autoTier = getBestDefaultTierForPackage(packageBytes);
  const exceedsTier4 = !autoTier;
  const exceedsSafeMax = packageBytes > state.maxSafeStegoBytes;

  lastCalculatedCapacity = {
    rawBytes,
    packageBytes,
    minDim,
    isSufficient: true,
    exceedsTier4,
    exceedsSafeMax,
    matchedTier: autoTier,
  };

  if (state.operationMode === "direct_pqc") {
    msgBox.className = "cover-size-msg msg-ok mt-2";
    if (labelEl) labelEl.textContent = currentLang === "ar" ? "وضع Direct PQC:" : "Direct PQC Mode:";
    valEl.textContent =
      currentLang === "ar"
        ? `لا حاجة لصورة غلاف (${formatHumanBytes(rawBytes)} مشفر مباشرة)`
        : `No cover image required (${formatHumanBytes(rawBytes)} direct)`;
    renderDefaultCoverTiers();
    return;
  }

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
          ? `⚠️ الصورة المختارة ${currentUploadedCover.width} × ${currentUploadedCover.height} بكسل صغيرة جداً! المطلوب:`
          : `⚠️ Selected image (${currentUploadedCover.width} × ${currentUploadedCover.height} px) is too small! Required:`;
      }
      valEl.textContent = currentLang === "ar"
        ? `على الأقل ${minDim} × ${minDim} بكسل (${formatHumanBytes(packageBytes)})`
        : `at least ${minDim} × ${minDim} px (${formatHumanBytes(packageBytes)})`;

      const alertKey = `custom:${minDim}:${coverCap}`;
      if (triggerPopupOnMismatch && alertKey !== lastCapacityModalKey) {
        lastCapacityModalKey = alertKey;
        openCapacityAlertModal("cover_too_small", {
          packageBytes,
          minDim,
          curWidth: currentUploadedCover.width,
          curHeight: currentUploadedCover.height,
          curCapBytes: coverCap,
        });
      }
    }
  } else if (state.selectedDefaultCoverId !== "auto") {
    const chosen = state.defaultCoverTiers.find((t) => t.id === state.selectedDefaultCoverId);
    if (chosen && packageBytes > chosen.capacity_bytes) {
      lastCalculatedCapacity.isSufficient = false;
      msgBox.className = "cover-size-msg msg-error mt-2";
      if (labelEl) {
        labelEl.textContent = currentLang === "ar"
          ? `⚠️ المنظر المختار (${chosen.width}×${chosen.height}) لا يكفي! المطلوب:`
          : `⚠️ Selected landscape (${chosen.width}×${chosen.height}) is too small! Required:`;
      }
      valEl.textContent = `${minDim} × ${minDim} px`;
      const alertKey = `preset:${chosen.id}:${minDim}`;
      if (triggerPopupOnMismatch && alertKey !== lastCapacityModalKey) {
        lastCapacityModalKey = alertKey;
        openCapacityAlertModal("cover_too_small", {
          packageBytes,
          minDim,
          curWidth: chosen.width,
          curHeight: chosen.height,
          curCapBytes: chosen.capacity_bytes,
        });
      }
    } else if (chosen) {
      lastCalculatedCapacity.isSufficient = true;
      msgBox.className = "cover-size-msg msg-ok mt-2";
      if (labelEl) {
        labelEl.textContent = currentLang === "ar" ? "✓ الغلاف الطبيعي المختار:" : "✓ Selected Landscape Carrier:";
      }
      valEl.textContent = `${currentLang === "ar" ? chosen.label_ar : chosen.label_en} (${chosen.width}×${chosen.height} px)`;
    }
  } else if (exceedsSafeMax) {
    lastCalculatedCapacity.isSufficient = false;
    msgBox.className = "cover-size-msg msg-error mt-2";
    if (labelEl) {
      labelEl.textContent = currentLang === "ar"
        ? "⚠️ الملف ضخم جداً يتجاوز حد الإخفاء الآمن! يوصى بـ Direct PQC:"
        : "⚠️ Payload exceeds safe stego ceiling! Switch to Direct PQC:";
    }
    valEl.textContent = `${formatHumanBytes(packageBytes)} (> ${formatHumanBytes(state.maxSafeStegoBytes)})`;
    const alertKey = `huge:${Math.round(packageBytes / 65536)}`;
    if (triggerPopupOnMismatch && alertKey !== lastCapacityModalKey) {
      lastCapacityModalKey = alertKey;
      openCapacityAlertModal("huge_payload", { packageBytes, minDim });
    }
  } else if (autoTier) {
    lastCalculatedCapacity.isSufficient = true;
    msgBox.className = "cover-size-msg msg-ok mt-2";
    if (labelEl) {
      labelEl.textContent = currentLang === "ar" ? "✓ الغلاف الطبيعي المحدد تلقائياً:" : "✓ Auto-Selected Landscape:";
    }
    valEl.textContent = `${currentLang === "ar" ? autoTier.label_ar : autoTier.label_en} (${autoTier.width}×${autoTier.height} px)`;
  } else {
    lastCalculatedCapacity.isSufficient = true;
    msgBox.className = "cover-size-msg mt-2";
    if (labelEl) {
      labelEl.textContent = currentLang === "ar" ? "✓ سيتم تكييف بانوراما الألب تلقائياً:" : "✓ Dynamic High-Res Landscape Fit:";
    }
    valEl.textContent = `${minDim} × ${minDim} px (${formatHumanBytes(packageBytes)})`;
  }

  renderDefaultCoverTiers();
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
      syncPayloadDropzoneUI(fileInput.files[0] || null);
      lastCapacityModalKey = "";
      updateStegoCapacity(null, true);
      triggerClassification();
    });
  }

  attachDropzone("payload-dropzone", "encrypt-file");
  const btnClearPayload = document.getElementById("btn-clear-payload-file");
  if (btnClearPayload && fileInput) {
    btnClearPayload.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.value = "";
      syncPayloadDropzoneUI(null);
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
    const selectedFile = fileInput.files[0];
    const sampleBlob = selectedFile.size > 65536 ? selectedFile.slice(0, 65536) : selectedFile;
    formData.append("file", sampleBlob, selectedFile.name);
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
    }
  } catch (e) {
    console.error("Classification error:", e);
  }
}

/* ==========================================================================
   5. ENCRYPTION & DIGITAL SIGNATURE PIPELINE (SENDER)
   ========================================================================== */
function syncPayloadDropzoneUI(file) {
  const zone = document.getElementById("payload-dropzone");
  const emptyEl = document.getElementById("payload-dropzone-empty");
  const selEl = document.getElementById("payload-dropzone-selected");
  const nameEl = document.getElementById("payload-selected-name");
  const sizeEl = document.getElementById("payload-selected-size");
  if (!zone || !emptyEl || !selEl) return;

  if (file) {
    zone.classList.add("has-file");
    emptyEl.classList.add("hidden");
    selEl.classList.remove("hidden");
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatHumanBytes(file.size);
  } else {
    zone.classList.remove("has-file");
    emptyEl.classList.remove("hidden");
    selEl.classList.add("hidden");
  }
}

function syncCoverDropzoneUI(coverInfo, thumbUrl = "") {
  const zone = document.getElementById("cover-dropzone");
  const emptyEl = document.getElementById("cover-dropzone-empty");
  const selEl = document.getElementById("cover-dropzone-selected");
  const nameEl = document.getElementById("cover-selected-name");
  const metaEl = document.getElementById("cover-selected-meta");
  const thumbEl = document.getElementById("cover-selected-thumb");
  const btnResetCover = document.getElementById("btn-reset-cover");
  if (!zone || !emptyEl || !selEl) return;

  if (coverInfo) {
    zone.classList.add("has-file");
    emptyEl.classList.add("hidden");
    selEl.classList.remove("hidden");
    if (nameEl) nameEl.textContent = coverInfo.name;
    if (metaEl) metaEl.textContent = `${coverInfo.width}×${coverInfo.height} px • ${formatHumanBytes(coverInfo.capacityBytes)}`;
    if (thumbEl && thumbUrl) thumbEl.src = thumbUrl;
    if (btnResetCover) btnResetCover.classList.remove("hidden");
  } else {
    zone.classList.remove("has-file");
    emptyEl.classList.remove("hidden");
    selEl.classList.add("hidden");
    if (thumbEl) thumbEl.removeAttribute("src");
    if (btnResetCover) btnResetCover.classList.add("hidden");
  }
}

function setOperationMode(mode, notify = false) {
  state.operationMode = mode === "signature" ? "signature" : mode === "direct_pqc" ? "direct_pqc" : "encryption";

  document.querySelectorAll(".op-mode-option").forEach((opt) => {
    const isActive = opt.dataset.opMode === state.operationMode;
    opt.classList.toggle("active", isActive);
    const radio = opt.querySelector('input[type="radio"]');
    if (radio) radio.checked = isActive;
  });

  const encControls = document.getElementById("encryption-mode-controls");
  const sigControls = document.getElementById("signature-mode-controls");
  const step4DirectNote = document.getElementById("step4-direct-note");
  const coverCarrierControls = document.getElementById("cover-carrier-controls");
  const btnExecute = document.getElementById("btn-execute-encrypt");

  if (state.operationMode === "signature") {
    if (encControls) encControls.classList.add("hidden");
    if (sigControls) sigControls.classList.remove("hidden");
    if (step4DirectNote) step4DirectNote.classList.add("hidden");
    if (coverCarrierControls) coverCarrierControls.classList.remove("hidden");
    if (btnExecute && !btnExecute.disabled) {
      btnExecute.textContent =
        currentLang === "ar"
          ? "تنفيذ التوقيع الرقمي وتغليف كايبر والحجب"
          : "Execute Digital Signature, Kyber KEM & Concealment";
    }
  } else if (state.operationMode === "direct_pqc") {
    if (encControls) encControls.classList.remove("hidden");
    if (sigControls) sigControls.classList.add("hidden");
    if (step4DirectNote) step4DirectNote.classList.remove("hidden");
    if (coverCarrierControls) coverCarrierControls.classList.add("hidden");
    if (btnExecute && !btnExecute.disabled) {
      btnExecute.textContent =
        currentLang === "ar"
          ? "تنفيذ التشفير الكمومي المباشر (بدون صورة حاملة)"
          : "Execute Direct Quantum-Safe PQC (No Cover Image)";
    }
  } else {
    if (encControls) encControls.classList.remove("hidden");
    if (sigControls) sigControls.classList.add("hidden");
    if (step4DirectNote) step4DirectNote.classList.add("hidden");
    if (coverCarrierControls) coverCarrierControls.classList.remove("hidden");
    if (btnExecute && !btnExecute.disabled) {
      btnExecute.textContent =
        currentLang === "ar"
          ? "تنفيذ التشفير الهجين متعدد الطبقات والحجب"
          : "Execute Multi-Layer Encryption & Concealment";
    }
  }

  updateStegoCapacity();

  if (notify) {
    showToast(
      state.operationMode === "signature"
        ? currentLang === "ar"
          ? "تم التبديل إلى مسار التوقيع الرقمي المعزول (ECDSA P-256 + CRYSTALS-Kyber)"
          : "Switched to Isolated Digital Signature Pipeline (ECDSA P-256 + CRYSTALS-Kyber)"
        : state.operationMode === "direct_pqc"
          ? currentLang === "ar"
            ? "تم التبديل إلى التشفير الكمومي المباشر للملفات الكبيرة (بدون صورة)"
            : "Switched to Direct Quantum-Safe PQC (No Image Carrier Required)"
          : currentLang === "ar"
            ? "تم التبديل إلى مسار تشفير البيانات القياسي"
            : "Switched to Standard Data Encryption Pipeline",
      "info"
    );
  }
}

function initEncryptSection() {
  const btnEncrypt = document.getElementById("btn-execute-encrypt");
  const coverInput = document.getElementById("encrypt-cover-image");
  const btnResetCover = document.getElementById("btn-reset-cover");

  // Operation Mode Toggle (Encryption vs Digital Signature vs Direct PQC)
  document.querySelectorAll(".op-mode-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const targetMode = opt.dataset.opMode;
      if (targetMode && targetMode !== state.operationMode) {
        setOperationMode(targetMode, true);
      }
    });
    opt.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        opt.click();
      }
    });
  });

  attachDropzone("cover-dropzone", "encrypt-cover-image");

  const btnAutoCoverMode = document.getElementById("btn-auto-cover-mode");
  if (btnAutoCoverMode) {
    btnAutoCoverMode.addEventListener("click", () => {
      if (coverInput) coverInput.value = "";
      currentUploadedCover = null;
      syncCoverDropzoneUI(null);
      state.selectedDefaultCoverId = "auto";
      lastCapacityModalKey = "";
      updateStegoCapacity();
      showToast(
        currentLang === "ar" ? "تم تفعيل الاختيار التلقائي للمناظر الطبيعية." : "Smart Auto-Selection enabled.",
        "info"
      );
    });
  }

  if (coverInput) {
    coverInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) {
        if (state.lastCoverThumbUrl) {
          URL.revokeObjectURL(state.lastCoverThumbUrl);
          state.lastCoverThumbUrl = null;
        }
        currentUploadedCover = null;
        syncCoverDropzoneUI(null);
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

        if (state.lastCoverThumbUrl && state.lastCoverThumbUrl !== objectUrl) {
          URL.revokeObjectURL(state.lastCoverThumbUrl);
        }
        state.lastCoverThumbUrl = objectUrl;

        currentUploadedCover = {
          file,
          name: file.name,
          width,
          height,
          pixels,
          capacityBytes,
        };

        syncCoverDropzoneUI(currentUploadedCover, objectUrl);
        lastCapacityModalKey = "";
        updateStegoCapacity(null, true);
        showToast(
          currentLang === "ar"
            ? `أبعاد صورة الغلاف: ${width} × ${height} بكسل (${formatHumanBytes(capacityBytes)})`
            : `Cover image: ${width} × ${height} px (${formatHumanBytes(capacityBytes)})`,
          "info"
        );
      };

      img.onerror = () => {
        if (coverInput) coverInput.value = "";
        currentUploadedCover = null;
        URL.revokeObjectURL(objectUrl);
        syncCoverDropzoneUI(null);
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
      state.selectedDefaultCoverId = "auto";
      syncCoverDropzoneUI(null);
      lastCapacityModalKey = "";
      updateStegoCapacity();
      showToast(
        currentLang === "ar" ? "تمت العودة للمناظر الطبيعية المختارة تلقائياً." : "Reverted to auto-selected landscape covers.",
        "info"
      );
    });
  }

  if (btnEncrypt) {
    btnEncrypt.addEventListener("click", async () => {
      const isFile = document.getElementById("tab-input-file")?.classList.contains("active");
      const textVal = document.getElementById("encrypt-text")?.value || "";
      const fileInput = document.getElementById("encrypt-file");
      let pkVal = document.getElementById("encrypt-recipient-pk")?.value.trim() || state.localKeys.pk || "";
      const cipherChoice = document.querySelector('input[name="cipher_choice"]:checked')?.value || "chacha20";
      const overrideVal = document.getElementById("encrypt-override")?.value || "";
      const channelRoomVal = document.getElementById("encrypt-channel-room")?.value.trim() || "";
      const isSignatureMode = state.operationMode === "signature";
      const isDirectMode = state.operationMode === "direct_pqc";

      if (!pkVal) {
        await generateLatticeKeys(false);
        pkVal = document.getElementById("encrypt-recipient-pk")?.value.trim() || state.localKeys.pk || "";
      }

      if (!pkVal) {
        showToast(
          currentLang === "ar"
            ? "المفتاح العام للمستلم (Kyber-768) مطلوب لإتمام العملية والتغليف!"
            : "Recipient Kyber-768 Public Key is required!",
          "error"
        );
        return;
      }

      if (isFile && (!fileInput || fileInput.files.length === 0)) {
        showToast(
          currentLang === "ar"
            ? isSignatureMode ? "يرجى اختيار ملف لتوقيعه." : "يرجى اختيار ملف لتشفيره."
            : isSignatureMode ? "Please select a file to sign." : "Please select a file to encrypt.",
          "error"
        );
        return;
      }

      if (!isFile && !textVal.trim()) {
        showToast(
          currentLang === "ar"
            ? isSignatureMode ? "يرجى إدخال النص المطلوب توقيعه." : "يرجى إدخال النص المطلوب تشفيره."
            : isSignatureMode ? "Please enter text payload to sign." : "Please enter text payload to encrypt.",
          "error"
        );
        return;
      }

      if (!isDirectMode && !lastCalculatedCapacity.isSufficient) {
        if (currentUploadedCover) {
          openCapacityAlertModal("cover_too_small", {
            packageBytes: lastCalculatedCapacity.packageBytes,
            minDim: lastCalculatedCapacity.minDim,
            curWidth: currentUploadedCover.width,
            curHeight: currentUploadedCover.height,
            curCapBytes: currentUploadedCover.capacityBytes,
          });
        } else if (state.selectedDefaultCoverId !== "auto") {
          const chosen = state.defaultCoverTiers.find((t) => t.id === state.selectedDefaultCoverId);
          openCapacityAlertModal("cover_too_small", {
            packageBytes: lastCalculatedCapacity.packageBytes,
            minDim: lastCalculatedCapacity.minDim,
            curWidth: chosen?.width || 0,
            curHeight: chosen?.height || 0,
            curCapBytes: chosen?.capacity_bytes || 0,
          });
        } else {
          openCapacityAlertModal("huge_payload", {
            packageBytes: lastCalculatedCapacity.packageBytes,
            minDim: lastCalculatedCapacity.minDim,
          });
        }
        return;
      }

      const formData = new FormData();
      if (isFile) {
        formData.append("file", fileInput.files[0]);
      } else {
        formData.append("text", textVal);
      }

      if (!isDirectMode) {
        if (coverInput && coverInput.files.length > 0) {
          formData.append("cover_image", coverInput.files[0]);
        } else if (state.selectedDefaultCoverId && state.selectedDefaultCoverId !== "auto") {
          formData.append("default_cover_id", state.selectedDefaultCoverId);
        }
      }

      formData.append("recipient_kyber_pk_b64", pkVal);
      formData.append("preferred_cipher", cipherChoice);
      formData.append("operation_mode", isSignatureMode ? "signature" : "encryption");
      formData.append("intent_objective", isDirectMode ? "direct_pqc" : "full_hybrid");
      if (overrideVal && !isSignatureMode && !isDirectMode) formData.append("override_type", overrideVal);
      if (channelRoomVal) formData.append("channel_room", channelRoomVal);
      formData.append("username", getActiveUser());

      btnEncrypt.disabled = true;
      btnEncrypt.textContent = isSignatureMode
        ? currentLang === "ar"
          ? "جارٍ التوقيع الرقمي وتغليف كايبر..."
          : "Executing Digital Signature & Kyber KEM..."
        : isDirectMode
          ? currentLang === "ar"
            ? "جارٍ تنفيذ التشفير الكمومي المباشر..."
            : "Executing Direct Quantum-Safe PQC..."
          : currentLang === "ar"
            ? "جارٍ معالجة التشفير والتغليف..."
            : "Processing Multi-Level Pipeline...";

      const endpoint = isSignatureMode ? "/api/sign" : "/api/encrypt";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(await extractErrorDetail(res, "Operation failed"));
        }

        const result = await res.json();
        renderEncryptionResult(result);
        showToast(
          isSignatureMode
            ? currentLang === "ar"
              ? "اكتمل التوقيع الرقمي وتغليف كايبر والتضمين الستيجانوغرافي بنجاح!"
              : "Digital signature, Kyber encapsulation & stego embedding completed!"
            : isDirectMode
              ? currentLang === "ar"
                ? "اكتمل التشفير الكمومي المباشر وتوليد الحزمة بنجاح!"
                : "Direct Quantum-Safe PQC encryption completed!"
              : currentLang === "ar"
                ? "اكتمل التشفير الهجين والتضمين الستيجانوغرافي بنجاح!"
                : "Encryption and steganographic embedding completed!",
          "success"
        );

        if (channelRoomVal) {
          showToast(
            currentLang === "ar"
              ? `تم بث الحزمة مباشرة إلى غرفة القناة: ${channelRoomVal}`
              : `Payload broadcasted to channel room: ${channelRoomVal}`,
            "info"
          );
        }
      } catch (e) {
        showToast((currentLang === "ar" ? "خطأ: " : "Error: ") + e.message, "error");
      } finally {
        btnEncrypt.disabled = false;
        setOperationMode(state.operationMode, false);
      }
    });
  }

  // Copy token button ONLY (raw token kept in JS memory only, download disabled)
  const btnCopyToken = document.getElementById("btn-copy-kyber-ct");
  if (btnCopyToken) {
    btnCopyToken.addEventListener("click", () => {
      const text = state.lastOutputKyberCt || document.getElementById("output-kyber-ct")?.value;
      if (!text) return;
      navigator.clipboard.writeText(text);
      showToast(
        currentLang === "ar" ? "تم نسخ رمز كايبر المشفر إلى الحافظة بنجاح!" : "Kyber Token copied to clipboard!",
        "success"
      );
    });
  }

  // Copy recipient/local public key token ONLY (raw key hidden, download disabled)
  const btnCopyRecipientPk = document.getElementById("btn-copy-recipient-pk");
  if (btnCopyRecipientPk) {
    btnCopyRecipientPk.addEventListener("click", async () => {
      let text = state.localKeys.pk || document.getElementById("encrypt-recipient-pk")?.value?.trim() || "";
      if (!text) {
        await generateLatticeKeys(true, false);
        text = state.localKeys.pk || document.getElementById("encrypt-recipient-pk")?.value?.trim() || "";
      }
      if (!text) {
        showToast(
          currentLang === "ar" ? "لا يوجد مفتاح عام لنسخه." : "No public key to copy.",
          "info"
        );
        return;
      }
      navigator.clipboard.writeText(text);
      showToast(
        currentLang === "ar" ? "تم نسخ المفتاح العام إلى الحافظة بنجاح!" : "Public Key copied to clipboard!",
        "success"
      );
    });
  }

  // Reset / restore recipient public key field to own local Kyber public key
  const btnUseLocalPk = document.getElementById("btn-use-local-pk");
  if (btnUseLocalPk) {
    btnUseLocalPk.addEventListener("click", async () => {
      if (!state.localKeys.pk) {
        await generateLatticeKeys(true, true);
      } else {
        const pkInput = document.getElementById("encrypt-recipient-pk");
        if (pkInput) pkInput.value = state.localKeys.pk;
        showToast(
          currentLang === "ar" ? "تمت استعادة مفتاحك العام المحلي في الحقل." : "Restored your local public key.",
          "info"
        );
      }
    });
  }
}

function renderEncryptionResult(result) {
  const placeholder = document.getElementById("encrypt-placeholder");
  const container = document.getElementById("encrypt-results-container");
  if (placeholder) placeholder.classList.add("hidden");
  if (container) container.classList.remove("hidden");

  const stegoPreviewBox = document.getElementById("encrypt-stego-preview-box");
  const directResultBox = document.getElementById("encrypt-direct-result-box");
  const btnDlStego = document.getElementById("btn-download-stego");
  const btnDlDirect = document.getElementById("btn-download-direct-pqc");
  const imgPreview = document.getElementById("stego-image-preview");
  const tokenEl = document.getElementById("output-kyber-ct");
  const decTokenEl = document.getElementById("decrypt-kyber-ct");

  const isDirectResult = result.pipeline_target === "direct_pqc" && result.direct_result;

  if (isDirectResult) {
    const dir = result.direct_result;
    if (stegoPreviewBox) stegoPreviewBox.classList.add("hidden");
    if (directResultBox) directResultBox.classList.remove("hidden");
    if (btnDlStego) btnDlStego.classList.add("hidden");

    const bundle = {
      format: "fgp_direct_pqc",
      version: "1.0",
      filename: result.filename || dir.filename || "encrypted_payload",
      filesize: dir.filesize || result.payload_size,
      cipher_used: dir.cipher_used || dir.cipher || "chacha20",
      nonce_b64: dir.nonce_b64,
      kyber_ciphertext_b64: dir.kyber_ciphertext_b64,
      ciphertext_b64: dir.ciphertext_b64,
    };

    if (state.lastDirectDownloadUrl) {
      URL.revokeObjectURL(state.lastDirectDownloadUrl);
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    state.lastDirectDownloadUrl = URL.createObjectURL(blob);

    if (btnDlDirect) {
      btnDlDirect.href = state.lastDirectDownloadUrl;
      btnDlDirect.download = `${bundle.filename}.fgp.json`;
      btnDlDirect.classList.remove("hidden");
    }

    state.lastOutputKyberCt = dir.kyber_ciphertext_b64;
    if (tokenEl) tokenEl.value = "";
    if (decTokenEl) decTokenEl.value = dir.kyber_ciphertext_b64;

    const telMode = document.getElementById("telem-op-mode");
    const telPayload = document.getElementById("telem-payload-size");
    const telStego = document.getElementById("telem-stego-size");
    const telRoute = document.getElementById("telem-route");
    const telSig = document.getElementById("telem-signature");
    const telDigestRow = document.getElementById("telem-digest-row");

    if (telMode) {
      telMode.textContent =
        currentLang === "ar"
          ? "التشفير الكمومي المباشر (Direct PQC • بدون صورة)"
          : "Direct Quantum-Safe PQC (No Stego Carrier)";
    }
    if (telPayload) telPayload.textContent = formatHumanBytes(result.payload_size);
    if (telStego) telStego.textContent = formatHumanBytes(blob.size) + " (.fgp.json)";
    if (telRoute) telRoute.textContent = result.intent_evaluation?.route_desc || "Kyber-768 + AEAD";
    if (telSig) telSig.textContent = currentLang === "ar" ? "غير مطلوب" : "Not Required";
    if (telDigestRow) telDigestRow.classList.add("hidden");
    return;
  }

  if (stegoPreviewBox) stegoPreviewBox.classList.remove("hidden");
  if (directResultBox) directResultBox.classList.add("hidden");
  if (btnDlStego) btnDlStego.classList.remove("hidden");
  if (btnDlDirect) btnDlDirect.classList.add("hidden");

  // Stego Preview
  const imgUrl = `data:image/png;base64,${result.stego_image_b64}`;
  if (imgPreview) imgPreview.src = imgUrl;
  if (btnDlStego) btnDlStego.href = imgUrl;

  const badgeEl = document.getElementById("enc-result-stego-badge");
  if (badgeEl && result.cover_tier && result.cover_tier.label_en) {
    const tierName = currentLang === "ar" ? result.cover_tier.label_ar : result.cover_tier.label_en;
    badgeEl.textContent =
      currentLang === "ar"
        ? `تم الإخفاء بنجاح • ${tierName} • PNG نقي`
        : `Concealed in ${tierName} • Lossless PNG`;
  }

  // Store ciphertext token in JS memory rather than hidden DOM attribute
  state.lastOutputKyberCt = result.kyber_ciphertext_b64;
  if (tokenEl) tokenEl.value = "";
  if (decTokenEl) decTokenEl.value = result.kyber_ciphertext_b64;

  // Telemetry
  const telMode = document.getElementById("telem-op-mode");
  const telPayload = document.getElementById("telem-payload-size");
  const telStego = document.getElementById("telem-stego-size");
  const telRoute = document.getElementById("telem-route");
  const telSig = document.getElementById("telem-signature");
  const telDigestRow = document.getElementById("telem-digest-row");
  const telDigest = document.getElementById("telem-digest");

  const isSigMode = result.operation_mode === "signature";
  if (telMode) {
    telMode.textContent = isSigMode
      ? currentLang === "ar"
        ? "مسار التوقيع الرقمي المعزول (ECDSA + Kyber-768)"
        : "Isolated Digital Signature (ECDSA + Kyber-768)"
      : currentLang === "ar"
        ? "التشفير الهجين للبيانات (Encryption + Kyber-768)"
        : "Standard Data Encryption (AEAD + Kyber-768)";
  }

  if (telPayload) telPayload.textContent = `${result.payload_size.toLocaleString()} Bytes`;
  if (telStego) telStego.textContent = `${result.stego_size.toLocaleString()} Bytes`;
  if (telRoute) telRoute.textContent = result.classification ? result.classification.route : "-";
  if (telSig) {
    telSig.textContent = result.signature_b64
      ? isSigMode
        ? currentLang === "ar"
          ? "مُوقّع ومرتبط بتغليف كايبر (Kyber-Bound ECDSA) ✓"
          : "Kyber-Bound ECDSA P-256 Attached ✓"
        : currentLang === "ar"
          ? "مرفق توقيع ECDSA P-256 موثق ✓"
          : "ECDSA P-256 Attached ✓"
      : currentLang === "ar"
        ? "غير مطلوب لهذا النوع"
        : "Not Required";
  }

  const digestVal = result.sha256_digest || result.payload_sha256;
  const fpVal = result.signer_pub_fingerprint || result.signer_key_fingerprint || "P-256";
  if (digestVal && telDigest) {
    if (telDigestRow) telDigestRow.classList.remove("hidden");
    telDigest.textContent = `${digestVal.substring(0, 24)}... (${fpVal})`;
    telDigest.title = `SHA-256: ${digestVal}`;
  } else if (telDigestRow) {
    telDigestRow.classList.add("hidden");
  }
}

/* ==========================================================================
   6. DECRYPTION PIPELINE (RECEIVER)
   ========================================================================== */
function syncDecryptDropzoneUI(file, extraLabel = "") {
  const zone = document.getElementById("decrypt-dropzone");
  const emptyEl = document.getElementById("decrypt-dropzone-empty");
  const selEl = document.getElementById("decrypt-dropzone-selected");
  const nameEl = document.getElementById("decrypt-selected-name");
  const sizeEl = document.getElementById("decrypt-selected-size");
  if (!zone || !emptyEl || !selEl) return;

  if (file) {
    zone.classList.add("has-file");
    emptyEl.classList.add("hidden");
    selEl.classList.remove("hidden");
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = extraLabel ? `${formatHumanBytes(file.size)} • ${extraLabel}` : formatHumanBytes(file.size);
  } else {
    zone.classList.remove("has-file");
    emptyEl.classList.remove("hidden");
    selEl.classList.add("hidden");
  }
}

function initDecryptSection() {
  const btnDecrypt = document.getElementById("btn-execute-decrypt");
  const stegoInput = document.getElementById("decrypt-stego-file");
  const btnClearDecrypt = document.getElementById("btn-clear-decrypt-file");
  const btnCopyDecryptCt = document.getElementById("btn-copy-decrypt-ct");
  const btnCopyDecryptSk = document.getElementById("btn-copy-decrypt-sk");
  const btnUseLocalSk = document.getElementById("btn-use-local-sk");

  attachDropzone("decrypt-dropzone", "decrypt-stego-file");

  if (btnClearDecrypt && stegoInput) {
    btnClearDecrypt.addEventListener("click", (e) => {
      e.stopPropagation();
      stegoInput.value = "";
      state.lastLoadedDirectFile = null;
      state.lastIncomingTransmission = null;
      if (state.lastDecryptThumbUrl) {
        URL.revokeObjectURL(state.lastDecryptThumbUrl);
        state.lastDecryptThumbUrl = null;
      }
      syncDecryptDropzoneUI(null);
      const previewBox = document.getElementById("decrypt-image-preview-box");
      if (previewBox) previewBox.classList.add("hidden");
    });
  }

  if (stegoInput) {
    stegoInput.addEventListener("change", async () => {
      if (stegoInput.files.length === 0) {
        state.lastLoadedDirectFile = null;
        syncDecryptDropzoneUI(null);
        return;
      }

      const file = stegoInput.files[0];
      const previewBox = document.getElementById("decrypt-image-preview-box");
      const previewImg = document.getElementById("decrypt-image-preview");

      if (/\.json$/i.test(file.name)) {
        try {
          const parsed = JSON.parse(await file.text());
          if (parsed && parsed.ciphertext_b64 && parsed.nonce_b64 && parsed.kyber_ciphertext_b64) {
            state.lastLoadedDirectFile = parsed;
            const decCt = document.getElementById("decrypt-kyber-ct");
            if (decCt) decCt.value = parsed.kyber_ciphertext_b64;
            if (previewBox) previewBox.classList.add("hidden");
            syncDecryptDropzoneUI(file, "Direct PQC");
            showToast(
              currentLang === "ar"
                ? "تم تحميل حزمة التشفير الكمومي المباشر (.fgp.json) بنجاح!"
                : "Direct PQC bundle loaded (.fgp.json)!",
              "info"
            );
            return;
          }
        } catch (_) {
          // Fall through cleanly if malformed JSON
        }
      }

      state.lastLoadedDirectFile = null;
      syncDecryptDropzoneUI(file, "PNG Carrier");
      if (state.lastDecryptThumbUrl) {
        URL.revokeObjectURL(state.lastDecryptThumbUrl);
      }
      state.lastDecryptThumbUrl = URL.createObjectURL(file);
      if (previewImg) previewImg.src = state.lastDecryptThumbUrl;
      if (previewBox) previewBox.classList.remove("hidden");
    });
  }

  // Copy token in decrypt form
  if (btnCopyDecryptCt) {
    btnCopyDecryptCt.addEventListener("click", () => {
      const text = document.getElementById("decrypt-kyber-ct")?.value.trim();
      if (!text) {
        showToast(
          currentLang === "ar" ? "لا يوجد رمز مشفر لنسخه." : "No token to copy.",
          "info"
        );
        return;
      }
      navigator.clipboard.writeText(text);
      showToast(
        currentLang === "ar" ? "تم نسخ الرمز إلى الحافظة بنجاح!" : "Token copied to clipboard!",
        "success"
      );
    });
  }

  // Copy receiver secret key (masked)
  if (btnCopyDecryptSk) {
    btnCopyDecryptSk.addEventListener("click", () => {
      const text = document.getElementById("decrypt-kyber-sk")?.value.trim() || state.localKeys.sk || "";
      if (!text) {
        showToast(currentLang === "ar" ? "لا يوجد مفتاح سري لنسخه." : "No secret key to copy.", "info");
        return;
      }
      navigator.clipboard.writeText(text);
      showToast(
        currentLang === "ar" ? "تم نسخ المفتاح السري إلى الحافظة." : "Secret key copied to clipboard.",
        "success"
      );
    });
  }

  // Restore local receiver secret key
  if (btnUseLocalSk) {
    btnUseLocalSk.addEventListener("click", async () => {
      if (!state.localKeys.sk) {
        await generateLatticeKeys(true, true);
      } else {
        const skInput = document.getElementById("decrypt-kyber-sk");
        if (skInput) skInput.value = state.localKeys.sk;
        showToast(
          currentLang === "ar" ? "تمت استعادة مفتاحك السري المحلي." : "Restored your local secret key.",
          "info"
        );
      }
    });
  }

  if (btnDecrypt) {
    btnDecrypt.addEventListener("click", async () => {
      const stegoFile = stegoInput?.files[0];
      const incomingStegoB64 = state.lastIncomingTransmission ? state.lastIncomingTransmission.stego_image_b64 : null;
      const kyberCt = document.getElementById("decrypt-kyber-ct")?.value.trim() || "";
      let kyberSk = document.getElementById("decrypt-kyber-sk")?.value.trim() || state.localKeys.sk || "";

      if (!kyberSk) {
        await generateLatticeKeys(false);
        kyberSk = document.getElementById("decrypt-kyber-sk")?.value.trim() || state.localKeys.sk || "";
      }

      if (state.lastLoadedDirectFile) {
        if (!kyberSk) {
          showToast(
            currentLang === "ar" ? "المفتاح السري للمستلم مطلوب لفك التغليف." : "Recipient Kyber-768 Secret Key is required.",
            "error"
          );
          return;
        }
        const pkg = state.lastLoadedDirectFile;
        const formData = new FormData();
        formData.append("ciphertext_b64", pkg.ciphertext_b64);
        formData.append("nonce_b64", pkg.nonce_b64);
        formData.append("kyber_ciphertext_b64", kyberCt || pkg.kyber_ciphertext_b64);
        formData.append("recipient_kyber_sk_b64", kyberSk);
        formData.append("cipher_used", pkg.cipher_used || "chacha20");
        formData.append("username", getActiveUser());

        btnDecrypt.disabled = true;
        btnDecrypt.textContent = currentLang === "ar" ? "جارٍ فك التشفير الكمومي المباشر..." : "Decrypting Direct PQC Bundle...";
        try {
          const res = await fetch("/api/decrypt_direct", { method: "POST", body: formData });
          if (!res.ok) {
            throw new Error(await extractErrorDetail(res, "Direct decryption failed"));
          }
          const result = await res.json();
          renderDecryptionResult({
            ...result,
            operation_mode: "direct_pqc",
            data_type: "direct_pqc",
            cipher_used: pkg.cipher_used || "chacha20",
            filename: pkg.filename || "recovered_payload",
            signature_verified: null,
          });
          showToast(
            currentLang === "ar" ? "تم فك تشفير حزمة Direct PQC بنجاح!" : "Direct PQC bundle decrypted successfully!",
            "success"
          );
        } catch (e) {
          showToast((currentLang === "ar" ? "خطأ في فك التشفير: " : "Decryption error: ") + e.message, "error");
        } finally {
          btnDecrypt.disabled = false;
          btnDecrypt.textContent = currentLang === "ar" ? "فك التغليف واستخراج البيانات الأصلية" : "Decapsulate & Extract Plaintext";
        }
        return;
      }

      if (!stegoFile && !incomingStegoB64) {
        showToast(
          currentLang === "ar" ? "يرجى رفع صورة الإخفاء (PNG) أو حزمة (.fgp.json)." : "Please upload a Stego PNG or (.fgp.json) bundle.",
          "error"
        );
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
          throw new Error(await extractErrorDetail(res, "Decryption failed"));
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
  const isSigMode = result.operation_mode === "signature";

  if (result.signature_verified === true) {
    if (title) {
      title.textContent = isSigMode
        ? currentLang === "ar"
          ? "تم التحقق من التوقيع الرقمي المرتبط بكايبر بنجاح ✓"
          : "Kyber-Bound Digital Signature Verified ✓"
        : currentLang === "ar"
          ? "تم التحقق من النزاهة والموثوقية بنجاح"
          : "Integrity & Authenticity Verified";
    }
    if (desc) {
      desc.textContent = isSigMode
        ? currentLang === "ar"
          ? "تم التحقق من بصمة SHA-256 وتوقيع ECDSA P-256 المرتبط بتغليف CRYSTALS-Kyber (ML-KEM-768) بنجاح."
          : "SHA-256 digest and Kyber-bound ECDSA P-256 signature authenticated against sender's public key."
        : currentLang === "ar"
          ? "تم توثيق التوقيع الرقمي ECDSA P-256 بنجاح بمطابقته مع المفتاح العام للمرسل."
          : "ECDSA P-256 digital signature verified against sender's public key.";
    }
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
    if (state.lastRecoveredBlobUrl) {
      URL.revokeObjectURL(state.lastRecoveredBlobUrl);
    }
    state.lastRecoveredBlobUrl = URL.createObjectURL(blob);
    btnDownloadFile.href = state.lastRecoveredBlobUrl;
    btnDownloadFile.download = result.filename;
    if (fileGroup) fileGroup.classList.remove("hidden");
  }

  // Metadata
  const recOpMode = document.getElementById("rec-op-mode");
  const recData = document.getElementById("rec-data-type");
  const recCiph = document.getElementById("rec-cipher");
  const recSig = document.getElementById("rec-sig-status");
  const recDigestRow = document.getElementById("rec-digest-row");
  const recDigest = document.getElementById("rec-digest");

  if (recOpMode) {
    recOpMode.textContent = isSigMode
      ? currentLang === "ar"
        ? "توقيع رقمي معزول (DIGITAL SIGNATURE)"
        : "ISOLATED DIGITAL SIGNATURE"
      : result.operation_mode === "direct_pqc"
        ? currentLang === "ar"
          ? "تشفير كمومي مباشر (DIRECT PQC)"
          : "DIRECT QUANTUM-SAFE PQC"
        : currentLang === "ar"
          ? "تشفير البيانات القياسي (DATA ENCRYPTION)"
          : "STANDARD DATA ENCRYPTION";
  }
  if (recData) recData.textContent = result.data_type ? result.data_type.toUpperCase() : "-";
  if (recCiph) recCiph.textContent = result.cipher_used ? result.cipher_used.toUpperCase() : "-";
  if (recSig) {
    recSig.textContent = result.signature_verified === true
      ? isSigMode
        ? currentLang === "ar" ? "توقيع مرتبط بكايبر وموثق ✓" : "Kyber-Bound Verified ✓"
        : currentLang === "ar" ? "موثق وصحيح ✓" : "Verified (Valid) ✓"
      : currentLang === "ar" ? "غير مطلوب / غير مرفق" : "N/A";
  }
  const recDigestVal = result.sha256_digest || result.payload_sha256;
  const recFpVal = result.signer_pub_fingerprint || result.signer_key_fingerprint || "P-256";
  if (recDigestVal && recDigest) {
    if (recDigestRow) recDigestRow.classList.remove("hidden");
    recDigest.textContent = `${recDigestVal.substring(0, 24)}... (${recFpVal})`;
    recDigest.title = `SHA-256: ${recDigestVal}`;
  } else if (recDigestRow) {
    recDigestRow.classList.add("hidden");
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
  const timeSpan = document.createElement("span");
  timeSpan.className = "log-time";
  timeSpan.textContent = `[${new Date().toLocaleTimeString()}]`;
  entry.appendChild(timeSpan);
  entry.appendChild(document.createTextNode(` ${String(message ?? "")}`));
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
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
      title: "المرحلة 04: الحجب المتكيف بالحواف (Sobel HBIG)",
      desc: "تحليل تدرج الحواف Sobel باستخدام بتات HBIG وتمديد بذرة كايبر عبر Argon2id وختم BLAKE2b داخل صور PNG.",
      standard: "Sobel Edge HBIG / Argon2id + BLAKE2b",
      primitive: "قناع حواف Sobel + Argon2id KDF",
      security: "PSNR > 50 dB / فرق بصري ΔE < 0.05",
      io: "حزمة مشفرة + غلاف PNG ← صورة إخفاء متكيفة",
      latency: "~15–40 مللي ثانية (Argon2id + Sobel)",
      math: "تمديد بذرة كايبر عبر Argon2id إلى 64 بايت (بذرة التبديل + مفتاح ختم BLAKE2b)، ثم تصفير البت الأدنى (HBIG) لحساب طاقة التدرج الغرافي 2D Sobel وفرز البكسلات ذات الحواف الحادة أولاً.",
      steps: [
        "تمثيل HBIG الثابت: تصفير Bit 0 لضمان تطابق خريطة الحواف 100% بين المرسل والمستلم دون إرسال خرائط مساعدة.",
        "انتقاء الحواف (Sobel Edges): تضمين البيانات في المناطق المعقدة وعالية التدرج وتجنب المناطق الملساء.",
        "ختم BLAKE2b MAC: إرفاق ختم مصادقة 32 بايت مشتق من Argon2id لكشف أي تلف أو عبث بالصورة."
      ],
      defense: "يحصن الحزمة ضد كشف الإخفاء الإحصائي (Chi-Square و RS Steganalysis) بتجنب المساحات الملساء، مع تطابق تام بدون أي قناة جانبية."
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
      title: "Stage 04: Adaptive Sobel Edge Steganography (HBIG)",
      desc: "Content-adaptive Sobel gradient masking with Higher-Bit Invariant Gradients (HBIG), Argon2id key-stretching, and BLAKE2b MAC.",
      standard: "Sobel Edge HBIG / Lossless PNG",
      primitive: "Sobel Edge Map + Argon2id KDF + BLAKE2b",
      security: "PSNR > 50 dB (ΔE < 0.05)",
      io: "Payload + Cover PNG → Adaptive Stego Carrier",
      latency: "~15–40 ms (Argon2id + 2D Gradient)",
      math: "Stretches the 32-byte Kyber 'stego_seed' via Argon2id into 64 bytes (PRNG seed + BLAKE2b MAC key). Clears Bit 0 (HBIG) before evaluating G(x,y) = √(Gx² + Gy²) so sender and receiver compute the identical edge traversal map.",
      steps: [
        "HBIG Invariance: Masks Bit 0 prior to Sobel gradient calculation for zero side-channel synchronization.",
        "Texture Prioritization: Embeds strictly inside high-gradient edge pixels and bypasses smooth/flat regions.",
        "BLAKE2b Frame MAC: Appends a 32-byte Argon2id-keyed BLAKE2b MAC to detect tampering or carrier corruption."
      ],
      defense: "Defeats Chi-Square (χ²) and RS statistical steganalysis by avoiding flat image regions, while requiring zero auxiliary edge-map transmission."
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

  // Check saved user; require fresh session verification in new tabs for registered accounts
  const savedUser = localStorage.getItem("fgp_auth_user");
  const savedProfile = savedUser ? localStorage.getItem(`fgp_user_${savedUser}`) : null;
  if (savedUser && (!savedProfile || state.sessionToken)) {
    updateUserDisplay(savedUser);
  } else {
    if (savedUser && savedProfile) {
      const loginUserInput = document.getElementById("login-username");
      if (loginUserInput) loginUserInput.value = savedUser;
    }
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

  // Login submit (Argon2id zero-database verification via /api/auth/verify-password)
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username")?.value.trim();
      const p = document.getElementById("login-password")?.value;
      if (!u || !p) return;

      try {
        const raw = localStorage.getItem(`fgp_user_${u}`);
        if (!raw) throw new Error(currentLang === "ar" ? "المستخدم غير موجود" : "User not found");
        const stored = JSON.parse(raw);

        if (stored.argon2_hash) {
          const fd = new FormData();
          fd.append("password", p);
          fd.append("argon2_hash", stored.argon2_hash);
          fd.append("username", u);
          const res = await fetch("/api/auth/verify-password", { method: "POST", body: fd });
          if (!res.ok) throw new Error(currentLang === "ar" ? "تعذر التحقق عبر الخادم" : "Verification request failed");
          const data = await res.json();
          if (!data.valid) throw new Error(currentLang === "ar" ? "كلمة المرور غير صحيحة" : "Incorrect password");
          if (data.session_token) {
            state.sessionToken = data.session_token;
            sessionStorage.setItem("fgp_session_token", data.session_token);
          }
        } else {
          throw new Error(currentLang === "ar" ? "يرجى إعادة إنشاء الحساب بالحماية الحديثة" : "Legacy plaintext credentials are disabled; please register a new account");
        }

        localStorage.setItem("fgp_auth_user", u);
        updateUserDisplay(u);
        showToast(currentLang === "ar" ? `مرحباً بك مجدداً ${u}! تم التحقق عبر Argon2id` : `Welcome back, ${u}! Verified via Argon2id`, "success");
        if (typeof loadAuditLogs === "function") loadAuditLogs();
        if (typeof openCinematicIntro === "function") setTimeout(() => openCinematicIntro(), 120);
      } catch (err) {
        if (loginErr) {
          loginErr.textContent = err.message;
          loginErr.classList.remove("hidden");
        }
      }
    });
  }

  // Register submit (Argon2id memory-hard hashing via /api/auth/hash-password)
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

      if (!u || /^(guest|anonymous)$/i.test(u) || /^guest_/i.test(u)) {
        if (regErr) {
          regErr.textContent =
            currentLang === "ar"
              ? "اسم المستخدم محجوز. يرجى اختيار اسم حساب آخر."
              : "This username is reserved. Please choose another username.";
          regErr.classList.remove("hidden");
        }
        return;
      }

      try {
        const fd = new FormData();
        fd.append("password", p);
        if (u) fd.append("username", u);
        const res = await fetch("/api/auth/hash-password", { method: "POST", body: fd });
        if (!res.ok) throw new Error(currentLang === "ar" ? "فشل التشفير عبر Argon2id" : "Argon2id hashing failed");
        const data = await res.json();

        localStorage.setItem(`fgp_user_${u}`, JSON.stringify({ argon2_hash: data.argon2_hash }));
        localStorage.setItem("fgp_auth_user", u);
        if (data.session_token) {
          state.sessionToken = data.session_token;
          sessionStorage.setItem("fgp_session_token", data.session_token);
        }
        updateUserDisplay(u);
        showToast(currentLang === "ar" ? `تم إنشاء الحساب وحمايته عبر Argon2id! أهلاً بك ${u}` : `Account created & Argon2id-protected! Welcome, ${u}`, "success");
        if (typeof loadAuditLogs === "function") loadAuditLogs();
        if (typeof openCinematicIntro === "function") setTimeout(() => openCinematicIntro(), 120);
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
      state.sessionToken = null;
      sessionStorage.removeItem("fgp_session_token");
      updateUserDisplay(guestName);
      showToast(currentLang === "ar" ? `تم الدخول كضيف تجريبي: ${guestName}` : `Logged in as: ${guestName}`, "info");
      if (typeof loadAuditLogs === "function") loadAuditLogs();
      if (typeof openCinematicIntro === "function") setTimeout(() => openCinematicIntro(), 120);
    });
  }

  // Logout (Wipe session tokens, private keys, object URLs, and sensitive form/audit state)
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("fgp_auth_user");
      localStorage.removeItem("kyber_pk");
      localStorage.removeItem("kyber_sk");
      sessionStorage.removeItem("kyber_pk");
      sessionStorage.removeItem("kyber_sk");
      sessionStorage.removeItem("fgp_session_token");
      state.sessionToken = null;
      state.localKeys = { pk: null, sk: null };
      state.lastOutputKyberCt = null;
      state.lastIncomingTransmission = null;
      state.lastLoadedDirectFile = null;
      allAuditLogs = [];
      if (state.lastCoverThumbUrl) {
        URL.revokeObjectURL(state.lastCoverThumbUrl);
        state.lastCoverThumbUrl = null;
      }
      if (state.lastDecryptThumbUrl) {
        URL.revokeObjectURL(state.lastDecryptThumbUrl);
        state.lastDecryptThumbUrl = null;
      }
      if (state.lastRecoveredBlobUrl) {
        URL.revokeObjectURL(state.lastRecoveredBlobUrl);
        state.lastRecoveredBlobUrl = null;
      }
      ["encrypt-recipient-pk", "decrypt-kyber-sk", "decrypt-kyber-ct", "vault-pk", "vault-sk", "output-kyber-ct"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const btnCopyVaultPk = document.getElementById("btn-copy-vault-pk");
      const btnCopyVaultSk = document.getElementById("btn-copy-vault-sk");
      if (btnCopyVaultPk) btnCopyVaultPk.disabled = true;
      if (btnCopyVaultSk) btnCopyVaultSk.disabled = true;
      const tbody = document.getElementById("audit-table-body");
      if (tbody) tbody.innerHTML = "";
      updateUserDisplay(null);
      showToast(currentLang === "ar" ? "تم تسجيل الخروج ومسح المفاتيح من الجلسة" : "Logged out & session keys wiped", "info");
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
    const res = await fetch(`/api/audit/logs?username=${encodeURIComponent(username)}`, {
      headers: authHeaders(),
    });
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

    const titleText = escapeHtml(currentLang === "ar" ? log.title_ar : log.title_en);

    let detailsHtml = "";
    if (typeof log.details === "object" && log.details !== null) {
      const parts = [];
      if (log.details.filename) parts.push(`<strong>${escapeHtml(log.details.filename)}</strong>`);
      if (log.details.cipher) parts.push(`<span class="badge badge-accent">${escapeHtml(log.details.cipher)}</span>`);
      if (log.details.payload_size !== undefined) parts.push(escapeHtml(currentLang === "ar" ? `حجم: ${log.details.payload_size}` : `Size: ${log.details.payload_size}`));
      if (log.details.kyber_token_id) parts.push(`${currentLang === "ar" ? "رمز كايبر: " : "Kyber ID: "}<code>${escapeHtml(log.details.kyber_token_id)}</code>`);
      if (log.details.algorithm) parts.push(`<code>${escapeHtml(log.details.algorithm)}</code>`);
      if (log.details.pk_length !== undefined) parts.push(escapeHtml(currentLang === "ar" ? `مفتاح عام: ${log.details.pk_length}B` : `Public Key: ${log.details.pk_length}B`));
      if (log.details.signature_verified !== undefined) {
        if (log.details.signature_verified) {
          parts.push(currentLang === "ar" ? '<span class="text-success">توقيع رقمي موثق ✓</span>' : '<span class="text-success">ECDSA Signature Verified ✓</span>');
        } else {
          parts.push(currentLang === "ar" ? 'بدون توقيع' : 'No Signature');
        }
      }
      detailsHtml = parts.join(" &bull; ") || escapeHtml(JSON.stringify(log.details));
    } else {
      detailsHtml = escapeHtml(String(log.details ?? ""));
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
      <td style="white-space: nowrap; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(log.created_at || "-")}</td>
      <td>
        <span class="audit-badge ${escapeHtml(badgeClass)}">${iconSvg} ${titleText}</span>
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
      await fetch("/api/audit/clear", { method: "POST", body: fd, headers: authHeaders() });
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
    nav_intro: "المقدمة (Intro)",
    hero_status_pill: "محرك التشفير المقاوم للكم • متوافق مع معيار NIST FIPS 203",
    hero_replay_blueprint: "إعادة محاكاة المخطط (Replay Blueprint)",
    hero_bg_title: "POST-QUANTUM",
    hero_tag_sub: "منظومة الدفاع السيبراني المقاومة للحوسبة الكمومية",
    hero_lead_text: "تشفير سيادي متعدد الطبقات يجمع بين تغليف المفاتيح الشبكي NIST FIPS 203 (ML-KEM-768)، والتوقيعات الرقمية الموثقة، وإخفاء الحواف المتكيف Sobel HBIG داخل صور PNG.",
    hero_cta_workstation: "تشغيل منصة الأمان والتشفير",
    hero_cta_info: "المواصفات الهندسية (System Specs)",
    pillar_1_desc: "تغليف المفاتيح القائم على التراكيب الشبكية المقاوم للحوسبة الكمومية.",
    pillar_action_vault: "فتح خزنة المفاتيح ←",
    pillar_2_desc: "موثوقية وأصالة رقمية غير قابلة للتلاعب أو التزييف.",
    pillar_action_sign: "توقيع المستندات ←",
    pillar_3_desc: "معمارية حماية مزدوجة تجمع التشفير التقليدي والتشفير المقاوم للكم.",
    pillar_action_encrypt: "بدء التشفير ←",
    pillar_4_desc: "أمان فائق ومحصن بنهاية إلى نهاية مع انعدام أي تسريب للمعلومات.",
    pillar_action_channel: "قناة البث الآمن ←",

    // Cinematic Intro Showcase Overlay & Intro Section Processes
    intro_skip: "تخطي العرض (Skip Intro) ➔",
    intro_pause: "⏸ إيقاف مؤقت للتصفح (Pause Auto-Scroll)",
    hero_play_showcase: "🎬 تشغيل العرض السينمائي الكامل (Guided Showcase)",
    stage1_pill: "منظومة الأمان السيبراني المقاومة للحوسبة الكمومية",
    stage1_kicker: "المصطلحات والتقنيات التشفيرية الأساسية",
    stage1_sub: "تغليف المفاتيح الشبكي NIST FIPS 203 • خوارزميات التشفير التناظري • إخفاء الحواف المتكيف Sobel HBIG",
    stage1_scroll_hint: "الجولة التلقائية نشطة • الانتقال المبطأ للمميزات والعمليات",
    stage2_heading: "المميزات الرئيسية للمشروع وركائز الحماية",
    stage2_sub: "حماية رياضية مستمرة بنهاية إلى نهاية لمنع هجمات الحوسبة الكمومية المستهدفة.",
    card1_title: "تبادل وتغليف المفاتيح المقاوم للكم",
    card1_desc: "مدعوم بتراكيب CRYSTALS-Kyber (ML-KEM-768) الشبكية لمقاومة خوارزمية شور وحواسيب الكم الفائقة.",
    card2_title: "طبقة الحماية الهجينة المزدوجة",
    card2_desc: "تشفير ثنائي يدمج الخوارزميات التناظرية السريعة (ChaCha20-Poly1305 و AES-256-GCM) مع تغليف ما بعد الكم.",
    card3_title: "مسار التوقيع الرقمي المعزول",
    card3_desc: "التحقق من الهوية وسلامة البيانات ومنع التزييف عبر ECDSA P-256 و SHA-256 مع تغليف المفاتيح عبر قنوات كايبر.",
    card4_title: "إخفاء الحواف المتكيف (Sobel HBIG)",
    card4_desc: "تضمين الحزم المشفرة داخل حواف وتفاصيل صور PNG بتقنية HBIG وتمديد Argon2id وختم BLAKE2b دون أي تشويه بصري.",
    intro_proc_heading: "مراحل وعمليات التشفير والتغليف والإخفاء",
    intro_proc_sub: "تدفق العمليات التشفيرية خطوة بخطوة من لحظة إدخال البيانات وحتى الاستخراج الآمن لدى المستلم.",
    proc_step1_title: "التصنيف الذكي واختيار نمط العملية",
    proc_step1_desc: "فحص تلقائي لنوع الملف وحجمه ومستوى الإنتروبيا مع إتاحة الاختيار بين مسار تشفير البيانات القياسي أو مسار التوقيع الرقمي المعزول.",
    proc_step2_title: "التشفير الموثق أو التوقيع الرقمي",
    proc_step2_desc: "تشفير البيانات عبر ChaCha20-Poly1305 / AES-256-GCM بوسم مصادقة، أو توليد بصمة SHA-256 وتوقيعها رقمياً عبر منحنى ECDSA P-256.",
    proc_step3_title: "تغليف المفاتيح الكمومي (CRYSTALS-Kyber)",
    proc_step3_desc: "تغليف السر المشترك عبر معيار NIST FIPS 203 (ML-KEM-768) واشتقاق مفتاح التشفير وبذرة الإخفاء عبر دالة HKDF-SHA256.",
    proc_step4_title: "الإخفاء المتكيف بالحواف (Sobel HBIG)",
    proc_step4_desc: "تمديد بذرة كايبر عبر Argon2id، وحساب حواف الصورة بتقنية HBIG لإخفاء البيانات مع ختم BLAKE2b داخل الحواف المعقدة لصورة PNG.",
    proc_step5_title: "فك التغليف والاستخراج والتحقق من النزاهة",
    proc_step5_desc: "يستخرج المستلم البيانات عبر مفتاح كايبر السري ويعيد حساب حواف HBIG ويتحقق من ختم BLAKE2b والتوقيع الرقمي وسلامة المستند.",
    credits_title: "فريق تطوير المشروع والإشراف الأكاديمي",
    credits_sup_label: "الإشراف الأكاديمي والتوجيه العلمي",
    credits_devs_label: "فريق تطوير وهندسة المشروع (Developers)",
    dev1_role: "المتحدث الرئيسي وباحث التشفير المقاوم للكم (CRYSTALS-Kyber ML-KEM-768)",
    dev2_role: "مهندس النظم وهندسة التشفير والتوجيه والإخفاء المتكيف",
    dev_affil: "الجامعة المستنصرية • كلية الهندسة • قسم هندسة الحاسوب",
    credits_inst: "قسم هندسة الحاسوب • مشروع التخرج الهندسي 2026",
    btn_enter_home: "الدخول إلى لوحة التحكم الرئيسية (Launch Home Dashboard) ➔",
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
    home_step3_title: "إخفاء متكيف بالحواف (Sobel HBIG)",
    home_step3_desc: "تضمين البيانات داخل حواف وتفاصيل صورة PNG بتمديد Argon2id",
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
    vault_copy_pk: "نسخ الرمز العام للحافظة",
    vault_copy_sk: "نسخ الرمز السري للحافظة",
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
    stage_4_title: "الحجب والإخفاء المتكيف (Sobel HBIG)",
    stage_4_desc: "تمديد Argon2id وإخفاء الحواف بتقنية HBIG وختم BLAKE2b",
    stage_4_chip1: "حواف Sobel (HBIG)",
    stage_4_chip2: "Argon2id + BLAKE2b MAC",
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
    st2_spec: "تنفيذ وتطوير خوارزميات التشفير الكلاسيكية (RSA, DSA/ECDSA, ECDH, ChaCha20/AES)، ومحرك التوجيه الديناميكي، ونظام خزنة المفاتيح والتوليد، والإخفاء المتكيف Sobel HBIG، وتطوير النظام المتكامل.",
    st2_scope1: "<strong>الخوارزميات الكلاسيكية:</strong> برمجة RSA-3072، وتواقيع DSA / ECDSA P-256، وتبادل مفاتيح ECDH، وتشفير ChaCha20-Poly1305 ARX، و AES.",
    st2_scope2: "<strong>مصفوفة التوجيه الديناميكي:</strong> تصميم وبرمجة مصنف البيانات وخوارزمية التوجيه الذكية بحسب الحجم وتوقيع MIME والإنتروبيا.",
    st2_scope3: "<strong>خزنة وتوليد المفاتيح:</strong> بناء نظام خزنة المفاتيح في الذاكرة، ومحرك توليد أزواج المفاتيح المحلية وتصديرها واستيرادها.",
    st2_scope4: "<strong>الإخفاء المتكيف Sobel HBIG:</strong> تطوير محرك الإخفاء الستيجانوغرافي المتكيف بالحواف وتمديد Argon2id دون أي تسريب بصري (ΔE < 0.05).",
    st2_scope5: "<strong>تطوير النظم والويب:</strong> بناء الواجهة الخلفية عبر FastAPI، وقنوات البث المباشر WebSockets، وواجهة المستخدم التفاعلية.",
    st2_pill1: "RSA & DSA / ECDSA",
    st2_pill2: "مصفوفة التوجيه الديناميكي",
    st2_pill3: "خزنة وتوليد المفاتيح",
    st2_pill4: "إخفاء حواف Sobel HBIG",
    st2_pill5: "تطوير النظم المتكاملة",
    st2_btn: "مراسلة المطور",

    credit_sup_title: "المشرف الأكاديمي",
    credit_sup_name: "أ.م.د. حيدر طارش",
    credit_st1_title: "المتحدث الرئيسي • الأبحاث وكايبر",
    credit_st1_name: "عبدالله إياد",
    credit_st2_title: "مهندس النظم • التوجيه والمفاتيح والخوارزميات",
    credit_st2_name: "كرار حيدر إسماعيل",

    // Section 2: Encrypt & Conceal + Digital Signature + Questionnaire
    q_badge: "المستشار الذكي لتوجيه الخدمات",
    q_welcome_title: "مرحباً بك عميلنا العزيز! هل تبحث عن أفضل تجربة لتأمين وحماية معلوماتك؟",
    q_welcome_sub: "اختر الخدمة الأنسب لاحتياجك من الاستبيان التفاعلي أدناه، أو استكشف معنى كل خدمة وخياراتها الإضافية، ثم اضغط على زر المتابعة للانتقال الفوري.",
    q_selected_tag: "✓ محدد حالياً",
    q1_cat: "التوقيع الرقمي (Digital Signature)",
    q1_question: "هل ترغب في إنشاء توقيع رقمي لحماية بياناتك من التلاعب والتزوير؟",
    q1_tooltip: "توثيق البيانات عبر ECDSA P-256 وتغليف المفاتيح عبر CRYSTALS-Kyber",
    q1_meaning_title: "💡 ما هو التوقيع الرقمي المعزول (Kyber + ECDSA)؟",
    q1_meaning_text: "يقوم التوقيع الرقمي بإنشاء بصمة رياضية فريدة (SHA-256) وتوقيعها عبر منحنى ECDSA P-256، مع تغليف وتبادل مفتاح التحقق عبر خوارزمية CRYSTALS-Kyber المقاومة للكم. يضمن ذلك للمستلم أن بياناتك أو مستنداتك لم تتعرض لأي تعديل أو تزوير ويثبت هويتك بشكل قاطع.",
    q1_sub1: "✒️ إنشاء توقيع رقمي معزول جديد (ECDSA + Kyber)",
    q1_sub2: "🔍 التحقق من صحة توقيع رقمي مستلم",
    q1_sub3: "🔑 فتح خزنة مفاتيح كايبر المحلية",
    q2_cat: "التراسل السري والتشفير (Confidential Encryption)",
    q2_question: "هل ترغب في إرسال رسالة مشفرة لا يمكن الاطلاع عليها إلا من قِبل المستلم المخول؟",
    q2_tooltip: "تشفير سري عبر ChaCha20 / AES-GCM مع تغليف مفاتيح CRYSTALS-Kyber",
    q2_meaning_title: "💡 ما هي خدمة التشفير السري الهجين والإخفاء؟",
    q2_meaning_text: "تحول هذه الخدمة رسالتك النصية أو ملفك إلى نص مشفر غير قابل للقراءة باستخدام ChaCha20-Poly1305 أو AES-256-GCM، وتغلف مفتاح فك التشفير عبر CRYSTALS-Kyber (ML-KEM-768) ثم تخفي الحزمة داخل صورة PNG عادية بحيث لا يستطيع فتحها إلا المستلم الذي يملك المفتاح السري.",
    q2_sub1: "🔒 تشفير رسالة أو ملف سري وإخفاؤه في صورة",
    q2_sub2: "🔓 فك تشفير واستخراج رسالة من صورة مستلمة",
    q2_sub3: "📡 إرسال واستقبال فوري عبر قناة البث المباشر",
    q3_cat: "التفاصيل التقنية والآليات (Process Details & Insights)",
    q3_question: "هل تود التعرف على التفاصيل التقنية والتشغيلية لعملية التشفير؟",
    q3_tooltip: "استعراض المعمارية الهندسية ومحاكي المراحل الأربع والمقارنات",
    q3_meaning_title: "💡 ماذا يتضمن قسم التفاصيل التقنية والمعمارية؟",
    q3_meaning_text: "يوفر هذا القسم محاكياً تفاعلياً للمراحل الأربع (التصنيف الذكي، التشفير التناظري، تغليف كايبر الكمومي، والإخفاء الستيجانوغرافي)، بالإضافة إلى جداول المقارنات الرياضية والهندسية بين الخوارزميات وتوثيق فريق مشروع التخرج.",
    q3_sub1: "🔬 تشغيل محاكي المعمارية التفاعلي (4 مراحل)",
    q3_sub2: "📊 استعراض مقارنات الخوارزميات والقرارات الهندسية",
    q3_sub3: "🎓 التعرف على فريق مشروع التخرج والإشراف",
    q_choice_yes: "نعم، المتابعة بهذه الخدمة",
    q_choice_more: "عرض المزيد من الخيارات",
    q_choice_meaning: "ماذا تعني هذه الخدمة؟",
    q_choice_support: "تواصل مع المهندس / الدعم",
    q_more_header: "⚡ خيارات سريعة مرتبطة بهذه الخدمة:",
    q_support_header: "👨‍💻 التواصل مع مهندسي النظام والدعم الفني:",
    q_support_desc: "تواصل مباشرة مع فريق تطوير مشروع التخرج للاستفسارات التقنية أو الدعم:",
    q_support_eng1: "📧 الباحث عبدالله إياد (أبحاث كايبر والتغليف الكمومي)",
    q_support_eng2: "📧 المهندس كرار حيدر (هندسة التشفير والتوقيع الرقمي)",
    q_support_team: "👥 عرض بطاقات فريق العمل والإشراف الأكاديمي",
    q_proceed_lbl: "الخدمة المختارة للانتقال:",
    q_sel_sig: "مسار التوقيع الرقمي المعزول (ECDSA P-256 + CRYSTALS-Kyber)",
    q_sel_enc: "التراسل السري وتشفير البيانات للمستلم المخول (AEAD + Kyber-768)",
    q_sel_info: "التفاصيل التقنية والتشغيلية ومحاكي المعمارية",
    q_btn_proceed: "الانتقال إلى الخدمة الآن (Proceed)",

    enc_sec_title: "سير عمل المرسل: التشفير، التوقيع الرقمي، والحجب",
    enc_sec_desc: "اختر نمط العملية (تشفير البيانات القياسي أو مسار التوقيع الرقمي المعزول)، وكلاهما يعتمد تغليف مفاتيح CRYSTALS-Kyber (ML-KEM-768) المقاوم للكم.",
    enc_mode_badge: "اختيار مسار المعالجة",
    enc_mode_heading: "حدد نمط العملية التشفيرية للمرسل",
    enc_mode_kyber_pill: "🛡️ تغليف المفاتيح: CRYSTALS-Kyber (ML-KEM-768)",
    enc_mode_enc_title: "تشفير البيانات القياسي (Data Encryption)",
    enc_mode_enc_tag: "AEAD + Kyber-768",
    enc_mode_enc_desc: "تشفير سري عالي السرعة عبر ChaCha20-Poly1305 أو AES-256-GCM مع التوجيه الذكي وتغليف المفاتيح عبر CRYSTALS-Kyber.",
    enc_mode_sig_title: "مسار التوقيع الرقمي المعزول (Digital Signature)",
    enc_mode_sig_tag: "ECDSA + Kyber-768",
    enc_mode_sig_desc: "مسار توقيع رقمي مستقل لإثبات الموثوقية وعدم الإنكار عبر ECDSA P-256 و SHA-256 مع تبادل وتغليف المفاتيح عبر CRYSTALS-Kyber.",
    enc_mode_dir_title: "التشفير الكمومي المباشر (للملفات الضخمة)",
    enc_mode_dir_tag: "Direct PQC • بدون صورة",
    enc_mode_dir_desc: "تشفير مباشر فائق السرعة عبر CRYSTALS-Kyber و AEAD للملفات الكبيرة جداً دون الحاجة لصورة حاملة أو تضخم حجم PNG.",
    dz_payload_title: "اسحب وأفلت الملف هنا أو انقر للاختيار",
    dz_payload_sub: "يدعم المستندات، الأرشيفات، والملفات الثنائية بأي حجم",
    dz_cover_title: "اسحب وأفلت صورة الغلاف هنا أو انقر للرفع (اختياري)",
    dz_cover_sub: "PNG / JPG / WebP — اتركه فارغاً ليختار النظام المنظر الطبيعي الأنسب لحجم بياناتك",
    dz_dec_title: "اسحب وأفلت صورة الإخفاء (PNG) أو حزمة .fgp.json هنا",
    dz_dec_sub: "انقر للتصفح أو أفلت الملف لاستخراج وفك التشفير الكمومي",
    dz_clear_btn: "✕ إزالة",
    def_cover_auto_badge: "اختيار ذكي تلقائي",
    def_cover_heading: "مكتبة المناظر الطبيعية الافتراضية (تتكيف مع حجم البيانات):",
    def_cover_btn_auto: "↺ تلقائي",
    enc_direct_note_title: "وضع التشفير الكمومي المباشر نشط (بدون إخفاء في صورة)",
    enc_direct_note_desc: "يتم تشفير البيانات مباشرة عبر CRYSTALS-Kyber و AEAD وتوليد حزمة (.fgp.json) مضغوطة دون الحاجة لصورة حاملة ضخمة.",
    enc_direct_res_title: "تم تشفير الحزمة مباشرة عبر Direct Quantum-Safe PQC ✓",
    enc_direct_res_desc: "ملف مشفر مقاوم للكم (.fgp.json) دون تضخم حجم الصورة الناقلة.",
    enc_btn_dl_direct: "تحميل الحزمة المشفرة (.fgp.json)",
    cap_badge_overflow: "تجاوز سعة الحامل",
    cap_modal_title: "الصورة الغلاف أصغر من حجم الحزمة",
    cap_gauge_title: "توازن السعة والاستيعاب",
    cap_metric_req: "الحجم المطلوب",
    cap_metric_cur: "السعة الحالية",
    cap_tag_recommended: "موصى به",
    cap_btn_use_default: "استخدام المنظر الطبيعي المتوافق تلقائياً",
    cap_btn_switch_direct: "التحويل للتشفير الكمومي المباشر (Direct PQC)",
    cap_dir_sub: "تشفير Kyber-768 + AEAD بصيغة (.fgp.json) مضغوطة دون الحاجة لصورة حاملة",
    cap_btn_upload_larger: "رفع صورة أكبر",
    cap_btn_dismiss: "إلغاء",
    enc_step2_enc_title: "2. إعدادات التشفير والتصنيف الذكي",
    enc_step2_sig_title: "2. مسار التوقيع الرقمي المعزول (Kyber + ECDSA)",
    enc_sig_pipe_title: "ECDSA P-256 + SHA-256 + CRYSTALS-Kyber (ML-KEM-768)",
    enc_sig_pipe_badge: "مسار توقيع رقمي مستقل",
    enc_sig_pipe_desc: "يعمل هذا المسار بمعزل عن خيارات التشفير التناظري التقليدية: يتم حساب بصمة SHA-256 وتوقيع البيانات بمنحنى ECDSA P-256، ثم يُغلَّف مفتاح التحقق العام والتوقيع الرقمي حصرياً عبر سر مشترك مشتق من CRYSTALS-Kyber (ML-KEM-768) لضمان عدم الإنكار والحماية الكمومية.",
    enc_sig_chip1: "1. بصمة SHA-256",
    enc_sig_chip2: "2. توقيع ECDSA P-256",
    enc_sig_chip3: "3. تغليف مفاتيح CRYSTALS-Kyber",
    enc_sig_chip4: "4. إخفاء Sobel HBIG PNG",
    enc_card1_title: "1. إدخال البيانات والتصنيف الذكي",
    enc_tab_text: "إدخال نصي",
    enc_tab_file: "رفع ملف",
    enc_lbl_plaintext: "البيانات الصريحة المراد تشفيرها أو توقيعها:",
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
    enc_card2_title: "3. المفتاح العام للمستلم (ML-KEM-768)",
    enc_lbl_pk: "المفتاح العام للمستلم (مخفي أمنياً • 1,184 بايت):",
    enc_pk_hidden_badge: "المفتاح العام مخفي أمنياً • 1,184 بايت محمي",
    enc_pk_security_hint: "المفتاح العام محجوب بصرياً (نقاط مخفية) ومنع تنزيله كملف؛ يتاح نسخ مفتاحك العام أو لصق المفتاح العام للمستلم الآخر هنا.",
    enc_btn_copy_pk: "📋 نسخ مفتاحي العام",
    enc_btn_use_local_pk: "↺ مفتاحي المحلي",
    enc_ph_pk: "•••••••••••••••••••••••••••••••• (مملوء تلقائياً أو الصق مفتاح المستلم)",
    enc_btn_load_vault: "تحميل المفتاح",
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
    enc_output_ph: "ستظهر صورة الإخفاء ورموز كايبر المقاومة للكم هنا فور اكتمال العملية.",
    enc_stego_badge: "تم تضمين البيانات المحجوبة بنجاح &bull; صورة PNG نقية",
    enc_btn_dl_stego: "تحميل صورة الإخفاء (PNG)",
    enc_lbl_token: "رمز كايبر المشفر المقاوم للحوسبة الكمومية (1,088 بايت):",
    enc_token_hidden_badge: "الرمز الخام مخفي أمنياً &bull; 1,088 بايت محمي",
    enc_token_security_hint: "تم إخفاء الرمز الخام وتعطيل تحميله كملف لحمايته من الانكشاف المباشر. استخدم زر النسخ إلى الحافظة فقط.",
    enc_btn_copy_token: "نسخ إلى الحافظة (Copy to Clipboard)",
    enc_telem_title: "تقرير القياسات والأدلة الرقمية",
    enc_telem_mode_lbl: "وضع العملية المنفذة:",
    enc_telem_payload_lbl: "حجم البيانات الصافية:",
    enc_telem_carrier_lbl: "حجم الصورة الناقلة:",
    enc_telem_route_lbl: "مسار التشفير المتبع:",
    enc_telem_sig_lbl: "التوقيع الرقمي ECDSA P-256:",
    enc_telem_digest_lbl: "بصمة SHA-256 ومفتاح الموقّع:",

    // Section 3: Decrypt & Extract
    dec_sec_title: "سير عمل المستلم: فك التغليف، الاستخراج، والتحقق",
    dec_sec_desc: "قم بإدخال الصورة الناقلة المحجوبة، رمز كايبر المشفر، والمفتاح السري الخاص بالمستلم.",
    dec_card1_title: "1. الصورة الناقلة المحجوبة",
    dec_lbl_carrier: "رفع صورة الإخفاء (PNG):",
    dec_card2_title: "2. رمز التغليف المشفر (ML-KEM-768)",
    dec_lbl_token: "النص المشفر لكايبر (1,088 بايت Base64):",
    dec_ph_token: "الصق رمز كايبر المنسوخ من الحافظة (1,088 بايت)...",
    dec_btn_copy_ct: "📋 نسخ الرمز",
    dec_card3_title: "3. المفتاح السري المحلي للمستلم",
    dec_lbl_sk: "المفتاح السري للمستلم (مخفي أمنياً • 2,400 بايت):",
    dec_ph_sk: "•••••••••••••••••••••••••••••••• (محمّل تلقائياً أو الصق مفتاحك السري)",
    dec_btn_copy_sk: "📋 نسخ",
    dec_btn_use_local_sk: "↺ المحلي",
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
    dec_telem_mode_lbl: "وضع العملية المكتشف:",
    dec_telem_dtype_lbl: "نوع البيانات المصنف:",
    dec_telem_cipher_lbl: "خوارزمية التشفير التناظري:",
    dec_telem_sig_lbl: "التوقيع الرقمي (ECDSA):",
    dec_telem_digest_lbl: "بصمة SHA-256 ومفتاح الموقّع:",
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
  },

  en: {
    doc_title: "Post-Quantum Defense & Steganographic Workstation • Graduation Project",
    lang_btn: "العربية",
    lang_toggle_title: "Toggle Language / تبديل اللغة",
    inst_logos_title: "Mustansiriyah University • College of Engineering",
    brand_title: "Post-Quantum Stego System",
    brand_sub: "Mustansiriyah University • College of Engineering",
    badge_grad: "Graduation Project",
    nav_intro: "Intro",
    hero_status_pill: "POST-QUANTUM CRYPTOGRAPHIC ENGINE • NIST FIPS 203 READY",
    hero_replay_blueprint: "Replay Blueprint Reveal",
    hero_bg_title: "POST-QUANTUM",
    hero_tag_sub: "QUANTUM-RESISTANT CYBER DEFENSE ARCHITECTURE",
    hero_lead_text: "Multi-layered sovereign cryptography uniting NIST FIPS 203 Module-Lattice Key Encapsulation (ML-KEM-768), tamper-evident digital signatures, and lossless steganographic concealment.",
    hero_cta_workstation: "Launch Security Workstation",
    hero_cta_info: "System Technical Specs",
    pillar_1_desc: "Quantum-resistant lattice-based key encapsulation.",
    pillar_action_vault: "Open Key Vault →",
    pillar_2_desc: "Tamper-proof cryptographic authenticity & integrity.",
    pillar_action_sign: "Sign Documents →",
    pillar_3_desc: "Dual-layer classical + post-quantum defense architecture.",
    pillar_action_encrypt: "Start Encryption →",
    pillar_4_desc: "End-to-end hardened security with zero exposure.",
    pillar_action_channel: "Secure Channel →",

    // Cinematic Intro Showcase Overlay & Intro Section Processes
    intro_skip: "Skip Intro ➔",
    intro_pause: "⏸ Pause Auto-Scroll",
    hero_play_showcase: "🎬 Play Fullscreen Guided Showcase",
    stage1_pill: "QUANTUM-SAFE CYBER DEFENSE ENGINE",
    stage1_kicker: "Core Cryptographic Terminology & Primitives",
    stage1_sub: "Module-Lattice Key Encapsulation • Constant-Time ARX Ciphers • Adaptive Sobel HBIG Stego",
    stage1_scroll_hint: "SLOW GUIDED TOUR ACTIVE • SCROLLING TO FEATURES & PROCESSES",
    stage2_heading: "Key Project Features & Security Pillars",
    stage2_sub: "Continuous end-to-end mathematical protection against harvest-now-decrypt-later quantum attacks.",
    card1_title: "Post-Quantum Key Exchange",
    card1_desc: "Powered by CRYSTALS-Kyber (ML-KEM-768) lattice cryptography, resisting Shor's algorithm on universal quantum supercomputers.",
    card2_title: "Hybrid Symmetric Encryption",
    card2_desc: "Dual-stage classical AEAD (ChaCha20-Poly1305 & AES-256-GCM) combined with quantum-resistant key encapsulation.",
    card3_title: "Isolated Digital Signature Pipeline",
    card3_desc: "Unforgeable ECDSA P-256 + SHA-256 identity and document integrity verification encapsulated inside Kyber channels.",
    card4_title: "Adaptive Sobel HBIG Steganography",
    card4_desc: "End-to-end encrypted payloads concealed inside high-gradient edge textures using HBIG, Argon2id key-stretching, and BLAKE2b MAC.",
    intro_proc_heading: "End-to-End Encryption & Concealment Processes",
    intro_proc_sub: "Clear step-by-step walkthrough of how payloads are classified, encrypted or signed, encapsulated with CRYSTALS-Kyber, and hidden inside PNG edge textures.",
    proc_step1_title: "Smart Classification & Mode Selection",
    proc_step1_desc: "Analyzes payload MIME headers, file size, and Shannon entropy while letting the user select Standard Encryption or the Isolated Digital Signature pipeline.",
    proc_step2_title: "Authenticated Encryption or ECDSA Signing",
    proc_step2_desc: "Encrypts data via constant-time ChaCha20-Poly1305 or AES-256-GCM with 128-bit MAC tags, or signs SHA-256 digests using ECDSA P-256.",
    proc_step3_title: "CRYSTALS-Kyber Key Encapsulation",
    proc_step3_desc: "Encapsulates a 32-byte shared secret via NIST FIPS 203 ML-KEM-768 (1,088-byte ciphertext) and derives independent encryption and stego keys via HKDF-SHA256.",
    proc_step4_title: "Adaptive Sobel HBIG Concealment",
    proc_step4_desc: "Stretches the Kyber seed via Argon2id, maps high-gradient edge pixels via HBIG, and embeds framed bits + BLAKE2b MAC into lossless PNG textures.",
    proc_step5_title: "Decapsulation, Extraction & Verification",
    proc_step5_desc: "The receiver decapsulates the Kyber token, reconstructs the identical HBIG edge map, verifies the BLAKE2b MAC, and checks ECDSA signatures.",
    credits_title: "PROJECT DEVELOPERS & ACADEMIC SUPERVISION",
    credits_sup_label: "ACADEMIC SUPERVISOR & PROJECT ADVISOR",
    credits_devs_label: "ARCHITECTED & DEVELOPED BY",
    dev1_role: "Lead Presenter & Post-Quantum Cryptography Researcher (CRYSTALS-Kyber ML-KEM-768)",
    dev2_role: "Systems Architect & Cryptographic Engine Developer (Ciphers, Routing & Adaptive Sobel Stego)",
    dev_affil: "Mustansiriyah University • College of Engineering",
    credits_inst: "Computer Engineering Department • Senior Graduation Project 2026",
    btn_enter_home: "Launch Home Dashboard ➔",
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
    home_step3_title: "3. Conceal in Edges (Sobel HBIG)",
    home_step3_desc: "Argon2id-stretched Sobel edge steganography + BLAKE2b MAC in PNG",
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
    vault_copy_pk: "Copy Public Token to Clipboard",
    vault_copy_sk: "Copy Secret Token to Clipboard",
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
    stage_4_title: "Adaptive Edge Carrier (Sobel HBIG)",
    stage_4_desc: "Argon2id Key-Stretching & HBIG Edge Masking in PNG",
    stage_4_chip1: "Sobel Edges (HBIG)",
    stage_4_chip2: "Argon2id + BLAKE2b MAC",
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
    st2_spec: "Engineered the classical cryptographic methods (RSA, DSA/ECDSA, ECDH, ChaCha20/AES), dynamic routing engine, Key Vault system, Adaptive Sobel HBIG steganography, and full-stack workstation.",
    st2_scope1: "<strong>RSA, DSA & Classical Ciphers:</strong> Implemented RSA-3072, DSA / ECDSA P-256 digital signatures, ECDH key exchange, ChaCha20-Poly1305 ARX, and AES pipelines.",
    st2_scope2: "<strong>Dynamic Routing Matrix:</strong> Architected and implemented the payload classifier and dynamic routing algorithm that directs data based on MIME, entropy, and size.",
    st2_scope3: "<strong>Key Vault & Key Generation:</strong> Built the in-memory Key Vault system, local lattice & classical keypair generation engine, and key export/import pipelines.",
    st2_scope4: "<strong>Adaptive Sobel HBIG Steganography:</strong> Developed the content-adaptive Sobel edge masking engine with Argon2id key-stretching and BLAKE2b integrity MAC (ΔE < 0.05).",
    st2_scope5: "<strong>Full-Stack & WebSockets:</strong> Created the FastAPI backend, real-time peer WebSocket channels, and reactive workstation user interface.",
    st2_pill1: "RSA & DSA / ECDSA",
    st2_pill2: "Dynamic Routing Matrix",
    st2_pill3: "Key Vault & Key Gen",
    st2_pill4: "Adaptive Sobel HBIG",
    st2_pill5: "Full-Stack Systems",
    st2_btn: "Contact Developer",

    credit_sup_title: "Academic Supervisor",
    credit_sup_name: "Assist. Prof. Haider Tarish",
    credit_st1_title: "Lead Presenter • Research & Kyber",
    credit_st1_name: "Abdulallah Ayad",
    credit_st2_title: "Systems Architect • RSA, DSA, Routing & Keys",
    credit_st2_name: "Karrar Haider Ismail",

    // Section 2: Encrypt & Conceal + Digital Signature + Questionnaire
    q_badge: "Guided Service Routing Questionnaire",
    q_welcome_title: "Welcome, Valued Client! Looking for the best experience to secure and protect your information?",
    q_welcome_sub: "Select the service that matches your security goal below, explore what each service means, and click Proceed to jump directly into your workflow.",
    q_selected_tag: "✓ Selected",
    q1_cat: "Digital Signature",
    q1_question: "Do you want to create a digital signature to protect your data from tampering and forgery?",
    q1_tooltip: "Authenticate data via ECDSA P-256 with CRYSTALS-Kyber key encapsulation",
    q1_meaning_title: "💡 What is the Isolated Digital Signature Pipeline (Kyber + ECDSA)?",
    q1_meaning_text: "Computes a cryptographic SHA-256 digest of your file or message, signs it with ECDSA P-256, and encapsulates the verification key & signature using quantum-resistant CRYSTALS-Kyber (ML-KEM-768)—proving authenticity and preventing any forgery or tampering.",
    q1_sub1: "✒️ Create a New Isolated Digital Signature (ECDSA + Kyber)",
    q1_sub2: "🔍 Verify a Received Digital Signature Package",
    q1_sub3: "🔑 Open Local ML-KEM-768 Key Vault",
    q2_cat: "Confidential Messaging / Encryption",
    q2_question: "Do you want to send an encrypted message that can only be viewed by an authorized recipient?",
    q2_tooltip: "Authenticated encryption via ChaCha20 / AES-GCM with CRYSTALS-Kyber KEM",
    q2_meaning_title: "💡 What is Confidential Hybrid Encryption & Concealment?",
    q2_meaning_text: "Encrypts your text message or file using constant-time ChaCha20-Poly1305 or AES-256-GCM, encapsulates the decryption key via post-quantum CRYSTALS-Kyber (ML-KEM-768), and conceals the package inside a lossless PNG carrier so only the authorized recipient can read it.",
    q2_sub1: "🔒 Encrypt & Conceal a Confidential Message or File",
    q2_sub2: "🔓 Decrypt & Extract a Received Stego Image",
    q2_sub3: "📡 Real-Time Transmission over Live Peer Channel",
    q3_cat: "Process Details & Insights",
    q3_question: "Would you like to learn the technical and operational details behind the encryption process?",
    q3_tooltip: "Explore the 4-stage interactive architecture simulator and cryptographic proofs",
    q3_meaning_title: "💡 What is inside Process Details & Insights?",
    q3_meaning_text: "Explore the interactive 4-stage pipeline simulator (Smart Classification, Symmetric Routing, ML-KEM-768 Key Encapsulation, and PNG Steganography), mathematical proofs, and side-by-side comparisons of ChaCha20 vs. AES, ECC vs. RSA, and NIST FIPS 203 lattices.",
    q3_sub1: "🔬 Launch Interactive 4-Stage Pipeline Simulator",
    q3_sub2: "📊 Inspect Cryptographic Comparisons & Decisions",
    q3_sub3: "🎓 Meet the Graduation Project Team & Advisors",
    q_choice_yes: "Yes, proceed with this",
    q_choice_more: "Show more options",
    q_choice_meaning: "What does this service mean?",
    q_choice_support: "Contact the Engineer / Support",
    q_more_header: "⚡ Quick Options for this Service:",
    q_support_header: "👨‍💻 Contact the Engineers & Technical Support:",
    q_support_desc: "Reach out directly to the graduation project engineering team for technical assistance:",
    q_support_eng1: "📧 Abdulallah Ayad (Lead Presenter & Kyber ML-KEM-768 Research)",
    q_support_eng2: "📧 Karrar Haider Ismail (Systems Architect & Cryptographic Engine)",
    q_support_team: "👥 View Full Project Team & Academic Advisor Dossiers",
    q_proceed_lbl: "Selected Service Route:",
    q_sel_sig: "Isolated Digital Signature Pipeline (ECDSA P-256 + CRYSTALS-Kyber)",
    q_sel_enc: "Confidential Messaging & Encryption (AEAD + Kyber-768)",
    q_sel_info: "Process Details, Architecture Simulator & Technical Insights",
    q_btn_proceed: "Proceed / Go",

    enc_sec_title: "Sender Workflow: Encrypt, Digitally Sign & Conceal",
    enc_sec_desc: "Choose between Standard Data Encryption or the Isolated Digital Signature pipeline—both secured by CRYSTALS-Kyber (ML-KEM-768) key encapsulation.",
    enc_mode_badge: "Pipeline Mode Selection",
    enc_mode_heading: "Select Sender Cryptographic Operation Mode",
    enc_mode_kyber_pill: "🛡️ Key Exchange / KEM: CRYSTALS-Kyber (ML-KEM-768)",
    enc_mode_enc_title: "Standard Data Encryption",
    enc_mode_enc_tag: "AEAD + Kyber-768",
    enc_mode_enc_desc: "High-speed authenticated encryption via ChaCha20-Poly1305 or AES-256-GCM with smart routing and CRYSTALS-Kyber key encapsulation.",
    enc_mode_sig_title: "Isolated Digital Signature Pipeline",
    enc_mode_sig_tag: "ECDSA + Kyber-768",
    enc_mode_sig_desc: "Dedicated digital signing pipeline for authenticity and non-repudiation via ECDSA P-256 and SHA-256 with CRYSTALS-Kyber key encapsulation.",
    enc_mode_dir_title: "Direct Quantum-Safe PQC (Large Files)",
    enc_mode_dir_tag: "Direct PQC • No Image",
    enc_mode_dir_desc: "High-speed Kyber-768 + AEAD encryption for large files without PNG cover bloat.",
    dz_payload_title: "Drag & drop your payload file here or click to browse",
    dz_payload_sub: "Supports documents, archives, and binary files of any size",
    dz_cover_title: "Drag & drop a cover image here or click to upload (Optional)",
    dz_cover_sub: "PNG / JPG / WebP — Leave empty to auto-select the best landscape carrier for your payload",
    dz_dec_title: "Drag & drop Stego PNG or .fgp.json bundle here",
    dz_dec_sub: "Click to browse or drop file for quantum extraction & decryption",
    dz_clear_btn: "✕ Remove",
    def_cover_auto_badge: "Smart Auto-Select",
    def_cover_heading: "Default High-Texture Landscape Carriers (Auto-Scaled by Payload):",
    def_cover_btn_auto: "↺ Auto-Fit",
    enc_direct_note_title: "Direct Quantum-Safe PQC Mode Active (No Cover Image)",
    enc_direct_note_desc: "Encrypts payloads directly with CRYSTALS-Kyber + AEAD into a compact (.fgp.json) bundle without giant PNG bloat.",
    enc_direct_res_title: "Direct Quantum-Safe PQC Encryption Complete ✓",
    enc_direct_res_desc: "Compact quantum-resistant package (.fgp.json) created without cover image bloat.",
    enc_btn_dl_direct: "Download Encrypted Bundle (.fgp.json)",
    cap_badge_overflow: "CARRIER TOO SMALL",
    cap_modal_title: "Cover Image Cannot Fit Your Payload",
    cap_gauge_title: "Capacity Allocation",
    cap_metric_req: "Required Size",
    cap_metric_cur: "Current Capacity",
    cap_tag_recommended: "Recommended",
    cap_btn_use_default: "Use Auto-Matched Landscape Cover",
    cap_btn_switch_direct: "Encrypt via Direct Quantum-Safe PQC",
    cap_dir_sub: "Compact Kyber-768 + AEAD (.fgp.json) bundle with zero cover image bloat",
    cap_btn_upload_larger: "Upload Larger Image",
    cap_btn_dismiss: "Cancel",
    enc_step2_enc_title: "2. Encryption Settings & Smart Classifier",
    enc_step2_sig_title: "2. Isolated Digital Signature Pipeline (Kyber + ECDSA)",
    enc_sig_pipe_title: "ECDSA P-256 + SHA-256 + CRYSTALS-Kyber (ML-KEM-768)",
    enc_sig_pipe_badge: "Isolated Signature Pipeline",
    enc_sig_pipe_desc: "Operates as an isolated signing pipeline: computes a SHA-256 digest and ECDSA P-256 signature, then encapsulates the verification key and signature envelope exclusively using a CRYSTALS-Kyber (ML-KEM-768) shared secret for quantum-resistant non-repudiation.",
    enc_sig_chip1: "1. SHA-256 Digest",
    enc_sig_chip2: "2. ECDSA P-256 Sign",
    enc_sig_chip3: "3. CRYSTALS-Kyber KEM",
    enc_sig_chip4: "4. Sobel HBIG PNG",
    enc_card1_title: "1. Payload Input & Classification",
    enc_tab_text: "Text Input",
    enc_tab_file: "File Upload",
    enc_lbl_plaintext: "Plaintext Payload (to Encrypt or Sign):",
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
    enc_card2_title: "3. Recipient ML-KEM-768 Public Key",
    enc_lbl_pk: "Recipient Public Key (Masked &bull; 1,184 Bytes):",
    enc_pk_hidden_badge: "Public Key Hidden &bull; 1,184 Bytes Protected",
    enc_pk_security_hint: "Raw keys are visually masked (dot display) and file downloads are disabled. Copy your own public key or paste a peer's key here.",
    enc_btn_copy_pk: "📋 Copy My Public Key",
    enc_btn_use_local_pk: "↺ Use My Key",
    enc_ph_pk: "•••••••••••••••••••••••••••••••• (Auto-filled or paste peer Public Key)",
    enc_btn_load_vault: "Load Key",
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
    enc_token_hidden_badge: "Raw Token Hidden &bull; 1,088 Bytes Protected",
    enc_token_security_hint: "The raw token is masked from view and file downloads are disabled for security. Use Copy to Clipboard only.",
    enc_btn_copy_token: "Copy to Clipboard",
    enc_telem_title: "Telemetry & Proof Manifest",
    enc_telem_mode_lbl: "Operation Mode:",
    enc_telem_payload_lbl: "Payload Size:",
    enc_telem_carrier_lbl: "Carrier PNG Size:",
    enc_telem_route_lbl: "Cryptographic Route:",
    enc_telem_sig_lbl: "ECDSA P-256 Signature:",
    enc_telem_digest_lbl: "SHA-256 & Signer Key:",

    // Section 3: Decrypt & Extract
    dec_sec_title: "Receiver Workflow: Decapsulate, Extract & Verify",
    dec_sec_desc: "Supply the stego-carrier image, Kyber-768 ciphertext token, and receiver secret key.",
    dec_card1_title: "1. Steganographic Carrier",
    dec_lbl_carrier: "Upload Stego-Image (PNG):",
    dec_card2_title: "2. ML-KEM-768 Ciphertext Token",
    dec_lbl_token: "Kyber-768 Ciphertext (1,088 Bytes Base64):",
    dec_ph_token: "Paste 1,088-byte Kyber token from clipboard...",
    dec_btn_copy_ct: "📋 Copy Token",
    dec_card3_title: "3. Local Receiver Secret Key",
    dec_lbl_sk: "Recipient Secret Key (Masked &bull; 2,400 Bytes):",
    dec_ph_sk: "•••••••••••••••••••••••••••••••• (Auto-filled or paste Secret Key)",
    dec_btn_copy_sk: "📋 Copy",
    dec_btn_use_local_sk: "↺ My Key",
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
    dec_telem_mode_lbl: "Detected Operation Mode:",
    dec_telem_dtype_lbl: "Classified Data Type:",
    dec_telem_cipher_lbl: "Symmetric Cipher:",
    dec_telem_sig_lbl: "Digital Signature (ECDSA):",
    dec_telem_digest_lbl: "SHA-256 & Signer Key:",
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

  // Update operation mode labels in current language
  if (typeof setOperationMode === "function") {
    setOperationMode(state.operationMode, false);
  }

  // Update questionnaire selection label in current language
  if (typeof updateQuestionnaireSelectionUI === "function") {
    updateQuestionnaireSelectionUI(state.selectedQuestionnaireService);
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

  // Refresh vertical terminology swappers in active language
  if (typeof swapTermTopToBottom === "function") {
    swapTermTopToBottom("overlay", currentOverlayTermIdx, false);
    swapTermTopToBottom("inline", currentInlineTermIdx, false);
  }

  // Trigger cipher scramble on headline & cards if intro section is active
  const introSection = document.getElementById("section-intro");
  if (introSection && introSection.classList.contains("active")) {
    if (typeof triggerCipherScramble === "function") {
      triggerCipherScramble();
    }
  }

  if (notify) {
    showToast(currentLang === "ar" ? "تم التحويل إلى اللغة العربية" : "Switched to English", "info");
  }
}
