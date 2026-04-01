import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  OWNER_GROQ_KEY,
  GUEST_GROQ_READY,
  GUEST_MAX,
  GUEST_MODEL,
  GUEST_MAX_TOKENS,
  DAILY_TOKEN_CAP,
} from "./config.js";
import { validateSignup } from "./auth/signupValidation.js";
import { groqChatCompletion } from "./services/groqClient.js";
import { detectReferenceLanguage } from "./lib/referenceLanguage.js";
import {
  initI18n,
  t,
  tModelTip,
  tLabel,
  setLocale,
  setOnLocaleChange,
} from "./i18n/index.js";

initI18n();

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── MODELS ────────────────────────────────────────────
const MODELS = {
  groq: [
    {
      id: "llama-3.1-8b-instant",
      label: "8b Fast",
      fast: true,
    },
    {
      id: "llama-3.3-70b-versatile",
      label: "70b Quality",
      fast: false,
    },
    {
      id: "mixtral-8x7b-32768",
      label: "Mixtral",
      fast: false,
    },
  ],
  openai: [
    {
      id: "gpt-4o-mini",
      label: "GPT-4o mini",
      fast: true,
    },
    {
      id: "gpt-4o",
      label: "GPT-4o",
      fast: false,
    },
  ],
  anthropic: [
    {
      id: "claude-haiku-4-5-20251001",
      label: "Haiku",
      fast: true,
    },
    {
      id: "claude-sonnet-4-6",
      label: "Sonnet",
      fast: false,
    },
  ],
};
const API_ENDPOINTS = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: null, // needs special handling
};

// ── TEMPLATES ─────────────────────────────────────────
const TPLS = [
  { id: "aida", name: "AIDA" },
  { id: "pas", name: "PAS" },
  { id: "hso", name: "Hook·Story·Offer" },
  { id: "fab", name: "FAB" },
  { id: "bab", name: "BAB" },
  { id: "star", name: "STAR" },
  { id: "closing", name: "Closing" },
  { id: "edu", name: "Edu-tainment" },
];

const DOMAIN_VALUES = [
  "Marketing",
  "Tech",
  "Lifestyle",
  "Business",
  "Education",
  "Health & Wellness",
  "Finance",
  "Food & Cooking",
  "Travel",
  "Entertainment",
];
const PLATFORM_VALUES = [
  "Instagram",
  "LinkedIn",
  "Facebook",
  "Twitter / X",
  "TikTok",
  "Newsletter",
];
const GOAL_VALUES = [
  "Engagement",
  "Awareness",
  "Promotion",
  "Inspiration",
  "Education",
  "Lead Generation",
];
const FORMAT_VALUES = [
  "Short post",
  "Long post",
  "Both versions",
  "3 Variants",
];

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function fillAppSelects() {
  function fill(selId, values, keyPrefix) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = values
      .map((v) => {
        const label = tLabel(keyPrefix, v);
        return `<option value="${escAttr(v)}">${label}</option>`;
      })
      .join("");
    if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  }
  fill("domain", DOMAIN_VALUES, "domain");
  fill("platform", PLATFORM_VALUES, "platform");
  fill("goal", GOAL_VALUES, "goal");
  fill("format", FORMAT_VALUES, "format");
  const sp = document.getElementById("sprovider");
  if (sp) {
    const cur = sp.value;
    sp.innerHTML = ["groq", "openai", "anthropic"]
      .map((v) => `<option value="${v}">${t(`provider.${v}`)}</option>`)
      .join("");
    if ([...sp.options].some((o) => o.value === cur)) sp.value = cur;
  }
}

let wizCurrentStep = 1;

function refreshLocaleUi() {
  fillAppSelects();
  switchTab(authMode);
  updateAuthPasswordHint();
  refreshWizardI18n();
  renderTpls();
  updateGuestDots();
  if (!isGuest) updateModelChips();
  updateUI();
  const theme =
    document.documentElement.getAttribute("data-theme") || "dark";
  syncThemeUi(theme);
}

function refreshWizardI18n() {
  const wz = document.getElementById("keyWizard");
  if (!wz || wz.style.display === "none") return;
  wizNext(wizCurrentStep);
}

setOnLocaleChange(refreshLocaleUi);

// ── STATE ─────────────────────────────────────────────
let user = null,
  isGuest = false,
  guestCount = 0;
let tpl = TPLS[0],
  rating = 0,
  editing = false;
let profile = {
  api_keys: {},
  preferred_model: "llama-3.1-8b-instant",
  adjustments: [],
  prompt_version: 1,
  history: [],
  tokens_today: 0,
  tokens_date: "",
};
let selectedProvider = "groq",
  selectedModel = "llama-3.3-70b-versatile";
let optimizerModel = "llama-3.1-8b-instant";
let wizProvider = "groq";

// MAX TOKENS per format (token optimization)
const MAX_TOKENS_MAP = {
  "Short post": 350,
  "Long post": 700,
  "Both versions": 900,
  "3 Variants": 950,
};

// ── THEME (clair / sombre) ───────────────────────────
const THEME_KEY = "contentforge-theme";

function syncThemeUi(theme) {
  const icon = theme === "dark" ? "light_mode" : "dark_mode";
  const label = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  document.querySelectorAll(".theme-toggle-ico").forEach((el) => {
    el.textContent = icon;
  });
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.setAttribute("aria-label", label);
  });
}

function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode */
  }
  syncThemeUi(t);
}

function toggleTheme() {
  const cur =
    document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ── INIT ──────────────────────────────────────────────
window.onload = async () => {
  let initial = "dark";
  try {
    initial = localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    /* ignore */
  }
  applyTheme(initial);

  fillAppSelects();
  renderTpls();
  document
    .getElementById("authPass")
    ?.addEventListener("input", updateAuthPasswordHint);
  document
    .getElementById("authPassConfirm")
    ?.addEventListener("input", updateAuthPasswordHint);
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (session) {
    user = session.user;
    await loadProfile();
    showApp();
  } else {
    showLanding();
  }
};

function hideLanding() {
  const el = document.getElementById("landingScreen");
  if (el) el.style.display = "none";
}

function showLanding() {
  const el = document.getElementById("landingScreen");
  if (el) el.style.display = "flex";
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("keyWizard").style.display = "none";
  document.getElementById("app").style.display = "none";
}

// ── AUTH ──────────────────────────────────────────────
let authMode = "login";
function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    const on =
      (i === 0 && mode === "login") || (i === 1 && mode === "signup");
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.getElementById("authSubmit").textContent =
    mode === "login" ? t("auth.signin") : t("auth.signup");
  document.getElementById("authErr").textContent = "";
  document.getElementById("authOk").textContent = "";
  const confirmWrap = document.getElementById("authConfirmWrap");
  if (confirmWrap) {
    confirmWrap.hidden = mode === "login";
    if (mode === "login") {
      const c = document.getElementById("authPassConfirm");
      if (c) c.value = "";
    }
  }
  const passEl = document.getElementById("authPass");
  if (passEl)
    passEl.setAttribute(
      "autocomplete",
      mode === "signup" ? "new-password" : "current-password",
    );
  updateAuthPasswordHint();
}
function updateAuthPasswordHint() {
  const hint = document.getElementById("authPassHint");
  if (!hint || authMode !== "signup") {
    if (hint) hint.textContent = "";
    return;
  }
  const a = document.getElementById("authPass")?.value ?? "";
  const b = document.getElementById("authPassConfirm")?.value ?? "";
  if (!b) {
    hint.textContent = "";
    hint.className = "auth-hint";
    return;
  }
  if (a === b) {
    hint.textContent = t("auth.passMatchOk");
    hint.className = "auth-hint auth-hint--ok";
  } else {
    hint.textContent = t("auth.passMatchWarn");
    hint.className = "auth-hint auth-hint--warn";
  }
}
async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const pass = document.getElementById("authPass").value;
  const passConfirm = document.getElementById("authPassConfirm")?.value ?? "";
  const btn = document.getElementById("authSubmit");
  if (!email || !pass) return setAuthErr(t("auth.fillFields"));
  if (authMode === "signup") {
    const v = validateSignup({ email, password: pass, passwordConfirm: passConfirm });
    if (!v.ok) return setAuthErr(t(v.key));
  }
  btn.disabled = true;
  btn.textContent = "…";
  const fn =
    authMode === "signup"
      ? sb.auth.signUp.bind(sb.auth)
      : sb.auth.signInWithPassword.bind(sb.auth);
  const { data, error } = await fn({ email, password: pass });
  btn.disabled = false;
  btn.textContent = authMode === "login" ? t("auth.signin") : t("auth.signup");
  if (error) return setAuthErr(error.message);
  if (authMode === "signup") {
    setAuthOk(t("authOk.created"));
    user = data.user;
    await loadProfile();
    showKeyWizard();
  } else {
    user = data.user;
    await loadProfile();
    showApp();
  }
}
function setAuthErr(m) {
  document.getElementById("authErr").textContent = m;
  document.getElementById("authOk").textContent = "";
}
function setAuthOk(m) {
  document.getElementById("authOk").textContent = m;
  document.getElementById("authErr").textContent = "";
}
function showAuth() {
  hideLanding();
  document.getElementById("authScreen").style.display = "flex";
  document.getElementById("app").style.display = "none";
  document.getElementById("keyWizard").style.display = "none";
}

// ── GUEST MODE ────────────────────────────────────────
function guestMode() {
  isGuest = true;
  user = null;
  document.getElementById("authScreen").style.display = "none";
  showApp();
  if (!GUEST_GROQ_READY) {
    showNotif(t("guest.notifNoKey"), "err");
  }
}

// ── PROFILE ───────────────────────────────────────────
async function loadProfile() {
  if (!user) return;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (data) {
    profile = { ...profile, ...data };
    // Reset daily tokens if new day
    const today = new Date().toDateString();
    if (profile.tokens_date !== today) {
      profile.tokens_today = 0;
      profile.tokens_date = today;
    }
    if (profile.api_keys?.groq) selectedProvider = "groq";
    else if (profile.api_keys?.openai) selectedProvider = "openai";
    selectedModel = profile.preferred_model || "llama-3.3-70b-versatile";
  }
}
async function saveProfile() {
  if (!user) return;
  await sb.from("profiles").upsert({
    id: user.id,
    email: user.email,
    api_keys: profile.api_keys,
    preferred_model: selectedModel,
    adjustments: profile.adjustments,
    prompt_version: profile.prompt_version,
    history: profile.history.slice(0, 20),
    tokens_today: profile.tokens_today,
    tokens_date: profile.tokens_date,
    updated_at: new Date().toISOString(),
  });
}

// ── WIZARD ────────────────────────────────────────────
function showKeyWizard() {
  hideLanding();
  wizCurrentStep = 1;
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("keyWizard").style.display = "flex";
  document.getElementById("app").style.display = "none";
}
function selectProvider(p) {
  wizProvider = p;
  ["groq", "openai", "anthropic", "skip"].forEach((id) =>
    document
      .getElementById("mc-" + id)
      ?.classList.toggle("sel", id === p),
  );
}
function wizNext(step) {
  if (step === 2 && wizProvider === "skip") {
    wizNext(3);
    return;
  }
  wizCurrentStep = step;
  document
    .querySelectorAll(".wiz-step")
    .forEach((s) => s.classList.remove("on"));
  document.getElementById("wizStep" + step).classList.add("on");
  for (let i = 1; i <= step; i++) {
    const w = document.getElementById("ws" + i);
    if (w) w.classList.add("done");
  }
  if (step === 2 && wizProvider !== "skip") {
    const links = {
      groq: "https://console.groq.com/keys",
      openai: "https://platform.openai.com/api-keys",
      anthropic: "https://console.anthropic.com/keys",
    };
    document.getElementById("wizKeyTitle").textContent = t(
      `wiz.keyTitle.${wizProvider}`,
    );
    document.getElementById("wizKeyLink").href = links[wizProvider] || "#";
    document.getElementById("wizKeyDesc").textContent = t(
      `wiz.keyDesc.${wizProvider}`,
    );
    document.getElementById("wizApiKey").placeholder =
      wizProvider === "groq" ? "gsk_..." : "sk-...";
    const linkEl = document.getElementById("wizKeyLink");
    if (linkEl) linkEl.textContent = t("wiz.openLink");
  }
}
function wizCheckKey() {
  const k = document.getElementById("wizApiKey").value.trim();
  document.getElementById("wizNextBtn2").disabled = k.length < 10;
}
async function wizSaveKey() {
  const k = document.getElementById("wizApiKey").value.trim();
  if (k.length < 10) return;
  profile.api_keys[wizProvider] = k;
  selectedProvider = wizProvider;
  selectedModel =
    MODELS[wizProvider]?.[1]?.id || MODELS[wizProvider]?.[0]?.id;
  optimizerModel = MODELS[wizProvider]?.[0]?.id || selectedModel;
  await saveProfile();
  wizNext(3);
}
function launchApp() {
  document.getElementById("keyWizard").style.display = "none";
  showApp();
}

// ── APP SHOW ──────────────────────────────────────────
function showApp() {
  hideLanding();
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("keyWizard").style.display = "none";
  document.getElementById("app").style.display = "flex";
  if (isGuest) {
    document.getElementById("guestBanner").style.display = "flex";
    document.getElementById("tokBar").style.display = "none";
    document.getElementById("modePill").textContent = t("app.modeGuest");
    const gw = document.getElementById("guestKeyWarn");
    if (gw) {
      gw.hidden = GUEST_GROQ_READY;
    }
    updateGuestDots();
    // In guest mode, force the model display to show what's being used
    const mr = document.getElementById("modelRow");
    if (mr) {
      const t1 = escAttr(t("guest.chipDemo"));
      const t2 = escAttr(t("guest.chipLock"));
      mr.innerHTML = `<div class="mchip fast on" title="${t1}">${t("guest.chipLabel")}</div><div class="mchip" title="${t2}" style="opacity:.4;cursor:not-allowed;">${t("guest.chipMore")}</div>`;
    }
  } else {
    document.getElementById("guestBanner").style.display = "none";
    document.getElementById("tokBar").style.display = "flex";
    document.getElementById("modePill").textContent =
      user?.email?.split("@")[0] || t("app.modeUser");
    // Pre-fill settings
    if (profile.api_keys) {
      const k = profile.api_keys[selectedProvider] || "";
      document.getElementById("sk1").value = k;
      document.getElementById("sk2").value = k;
      document.getElementById("sprovider").value = selectedProvider;
    }
  }
  if (!isGuest) updateModelChips();
  updateUI();
  renderTpls();
}
function updateGuestDots() {
  for (let i = 1; i <= GUEST_MAX; i++) {
    const d = document.getElementById("gd" + i);
    if (d) d.classList.toggle("used", i <= guestCount);
  }
  const msg = document.getElementById("guestMsg");
  const left = GUEST_MAX - guestCount;
  if (msg) {
    if (left > 0)
      msg.textContent =
        left === 1 ? t("guest.msgLeft1") : t("guest.msgLeftN", { n: left });
    else msg.textContent = t("guest.msgZero", { max: GUEST_MAX });
  }
}

// ── SETTINGS ──────────────────────────────────────────
function toggleSettings() {
  document.getElementById("sdrawer").classList.toggle("open");
}
function skCheck() {
  const k1 = document.getElementById("sk1").value.trim(),
    k2 = document.getElementById("sk2").value.trim();
  document.getElementById("skd1").className =
    "sp-kdot" + (k1.length > 8 ? " ok" : "");
  document.getElementById("skd2").className =
    "sp-kdot" + (k2.length > 8 ? " ok" : "");
}
async function saveSettings() {
  const k1 = document.getElementById("sk1").value.trim(),
    k2 = document.getElementById("sk2").value.trim();
  const prov = document.getElementById("sprovider").value;
  selectedProvider = prov;
  if (k1) profile.api_keys[prov] = k1;
  if (k2 && k2 !== k1) profile.api_keys[prov + "_opt"] = k2;
  selectedModel = MODELS[prov]?.[1]?.id || selectedModel;
  optimizerModel = MODELS[prov]?.[0]?.id || optimizerModel;
  await saveProfile();
  updateModelChips();
  showNotif(t("keysSaved"), "ok");
}
async function signOut() {
  await sb.auth.signOut();
  user = null;
  isGuest = false;
  location.reload();
}

// ── MODEL CHIPS ───────────────────────────────────────
function updateModelChips() {
  const prov =
    document.getElementById("sprovider")?.value || selectedProvider;
  const ms = MODELS[prov] || MODELS.groq;
  const row = document.getElementById("modelRow");
  if (!row) return;
  row.innerHTML = ms
    .map((m) => {
      const tip = escAttr(tModelTip(m.id));
      return `<div class="mchip${m.fast ? " fast" : ""}${m.id === selectedModel ? " on" : ""}" data-model-id="${m.id}" onclick="selectModel('${m.id}')" title="${tip}">${m.label}</div>`;
    })
    .join("");
}

function selectModel(id) {
  selectedModel = id;
  updateModelChips();
}

// ── TEMPLATES ─────────────────────────────────────────
function renderTpls() {
  const g = document.getElementById("tplGrid");
  if (!g) return;
  g.innerHTML = TPLS.map(
    (x) =>
      `<div class="tc ${x.id === tpl.id ? "sel" : ""}" onclick="selTpl('${x.id}')"><div class="tn">${x.name}</div><div class="ta">${t(`tpl.${x.id}.acro`)}</div><div class="td">${t(`tpl.${x.id}.desc`)}</div></div>`,
  ).join("");
}
function selTpl(id) {
  tpl = TPLS.find((t) => t.id === id);
  document.getElementById("tplN").textContent = tpl.name;
  renderTpls();
  closeTpl();
}
function openTpl() {
  document.getElementById("tplO").classList.add("open");
}
function closeTpl() {
  document.getElementById("tplO").classList.remove("open");
}
document.addEventListener("click", (e) => {
  if (e.target === document.getElementById("tplO")) closeTpl();
});

// ── UI HELPERS ────────────────────────────────────────
function uc() {
  const v = document.getElementById("ref").value;
  const n = v.length;
  document.getElementById("ch").textContent = Math.min(n, 400) + " / 400";
  if (n > 400) document.getElementById("ref").value = v.slice(0, 400);
}
function updateUI() {
  const adj = profile.adjustments || [],
    ver = profile.prompt_version || 1;
  document.getElementById("pp").textContent =
    adj.slice(-4).join("\n") || t("app.noAdj");
  document.getElementById("eVer").textContent = ver;
  document.getElementById("hVer").textContent = ver;
  document.getElementById("memC").textContent = (
    profile.history || []
  ).length;
  document.getElementById("evoFi").style.width =
    Math.min(ver * 5, 100) + "%";
  updateTokenUI();
  updateHistory();
}
function updateTokenUI() {
  const t = profile.tokens_today || 0,
    pct = Math.min((t / DAILY_TOKEN_CAP) * 100, 100);
  const fi = document.getElementById("tkFi");
  if (!fi) return;
  fi.style.width = pct + "%";
  fi.style.background =
    pct > 80 ? "var(--r)" : pct > 60 ? "var(--am)" : "var(--g)";
  const ct = document.getElementById("tkCt");
  if (!ct) return;
    ct.textContent =
      Math.round(t / 1000) + "k / " + DAILY_TOKEN_CAP / 1000 + "k";
  ct.className = "tk-ct" + (pct > 80 ? " o" : pct > 60 ? " w" : "");
}
function updateHistory() {
  const el = document.getElementById("histB"),
    h = profile.history || [];
  if (!el) return;
  el.innerHTML = h.length
    ? h
        .slice(0, 6)
        .map(
          (e) =>
            `<div class="hi"><div class="hi-t"><span class="hi-p">${e.platform}</span><span class="hi-s">${"⭐".repeat(e.rating)}</span></div><div class="hi-v">${e.preview}…</div></div>`,
        )
        .join("")
    : `<p style="font-size:.73rem;color:var(--m);">${t("app.histEmpty")}</p>`;
}
function resetStyle() {
  if (!confirm(t("confirm.resetStyle"))) return;
  profile.adjustments = [];
  profile.prompt_version = 1;
  saveProfile();
  updateUI();
}

// ── GENERATE ──────────────────────────────────────────
async function gen() {
  // Guest check
  if (isGuest && guestCount >= GUEST_MAX) {
    showNotif(t("gen.needAccount"), "err");
    return;
  }

  const apiKey = isGuest
    ? null
    : profile.api_keys[selectedProvider] ||
      document.getElementById("sk1").value.trim();
  const domain = document.getElementById("domain").value,
    platform = document.getElementById("platform").value;
  const goal = document.getElementById("goal").value,
    format = document.getElementById("format").value;
  const ref = document.getElementById("ref").value.trim();

  clearNotif();
  if (!isGuest && !apiKey)
    return showNotif(t("gen.addKey"), "err");
  if (!ref) return showNotif(t("gen.needRef"), "err");

  document.getElementById("ec").style.display = "none";
  document.getElementById("lc").style.display = "flex";
  document.getElementById("oc").style.display = "none";
  document.getElementById("genBtn").disabled = true;
  rating = 0;
  setStar(0);

  const steps = [
    t("gen.stepAnalyze"),
    t("gen.stepTpl", { name: tpl.name }),
    t("gen.stepStyle", { ver: profile.prompt_version || 1 }),
    t("gen.stepPlat", { platform }),
  ];
  document.getElementById("lsteps").innerHTML = steps
    .map((s, i) => `<div class="li" id="li${i}">◦ ${s}</div>`)
    .join("");
  let si = 0;
  const iv = setInterval(() => {
    if (si > 0) {
      const p = document.getElementById("li" + (si - 1));
      if (p) p.className = "li d";
    }
    const c = document.getElementById("li" + si);
    if (c) c.className = "li a";
    si++;
    if (si >= steps.length) clearInterval(iv);
  }, 600);

  // COMPRESSED PROMPT (token-optimized)
  const adj = (profile.adjustments || []).slice(-3).join("; ");
  const maxTok = MAX_TOKENS_MAP[format] || 500;
  const { instruction: langInstr } = detectReferenceLanguage(ref);
  const tplAcro = t(`tpl.${tpl.id}.acro`);
  const prompt = `Expert ${domain} content creator. Template:${tpl.name}(${tplAcro}). Platform:${platform}. Goal:${goal}. Format:${format}.
Ref:"""${ref.slice(0, 400)}"""
LANGUAGE (required): ${langInstr}
Rules: apply ${tpl.name} structure. Native ${platform} tone. Human, engaging. Markdown:## sections,**bold**,-lists. Add ##Hashtags(6-8 tags,skip if Newsletter). End:💡Tip:one sentence.${adj ? "\nStyle:" + adj : ""}`;

  try {
    let text = "";
    if (isGuest) {
      if (!OWNER_GROQ_KEY) {
        throw new Error(t("gen.guestKeyMissing"));
      }
      const guestTplAcro = t(`tpl.${tpl.id}.acro`);
      const guestPrompt = `Expert ${domain} content creator. Template:${tpl.name}(${guestTplAcro}). Platform:${platform}. Goal:${goal}. Format:Short post.
Ref:"""${ref.slice(0, 300)}"""
LANGUAGE (required): ${langInstr}
Rules: apply ${tpl.name} structure. Native ${platform} tone. Human, engaging. Markdown:## sections,**bold**,-lists. Add ##Hashtags(5-6 tags). End:💡Tip:one sentence.
Keep it concise — this is a free demo generation.`;
      const { text: guestText } = await groqChatCompletion(OWNER_GROQ_KEY, {
        model: GUEST_MODEL,
        max_tokens: GUEST_MAX_TOKENS,
        temperature: 0.8,
        messages: [{ role: "user", content: guestPrompt }],
      });
      clearInterval(iv);
      text = guestText;
    } else {
      if (selectedProvider === "groq") {
        const { text: outText, usage } = await groqChatCompletion(apiKey, {
          model: selectedModel,
          max_tokens: maxTok,
          temperature: 0.8,
          messages: [{ role: "user", content: prompt }],
        });
        clearInterval(iv);
        text = outText;
        const tok = usage?.total_tokens || 0;
        profile.tokens_today = (profile.tokens_today || 0) + tok;
        profile.tokens_date = new Date().toDateString();
        updateTokenUI();
      } else {
      const endpoint = API_ENDPOINTS[selectedProvider];
      if (!endpoint) throw new Error("Provider not supported yet.");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: maxTok,
          temperature: 0.8,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      clearInterval(iv);
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e?.error?.message || "HTTP " + res.status);
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || "";
      const tok = data.usage?.total_tokens || 0;
      profile.tokens_today = (profile.tokens_today || 0) + tok;
      profile.tokens_date = new Date().toDateString();
      updateTokenUI();
      }
    }
    clearInterval(iv);
    if (isGuest) {
      guestCount++;
      updateGuestDots();
    }
    renderOut(text, platform);
  } catch (e) {
    clearInterval(iv);
    document.getElementById("lc").style.display = "none";
    document.getElementById("ec").style.display = "flex";
    showNotif("❌ " + e.message, "err");
  } finally {
    document.getElementById("genBtn").disabled = false;
  }
}

// ── RENDER OUTPUT ─────────────────────────────────────
function renderOut(md, platform) {
  document.getElementById("lc").style.display = "none";
    document.getElementById("oc").style.display = "flex";
  document.getElementById("bP").textContent = platform;
  document.getElementById("bT").textContent = tpl.name;
  document.getElementById("bV").textContent =
    "v" + (profile.prompt_version || 1);
  document.getElementById("bM").textContent = selectedModel
    .split("-")
    .slice(0, 2)
    .join("-");
  let h = md
    .replace(
      /##\s*Hashtags?\s*\n([\s\S]*?)(?=\n##|\n💡|$)/gi,
      (_, t) =>
        '<div class="htgs">' +
        t
          .trim()
          .split(/\s+/)
          .filter((x) => x.startsWith("#"))
          .map((x) => `<span class="htg">${x}</span>`)
          .join("") +
        "</div>\n",
    )
    .replace(/💡\s*\*?\*?Tip:?\*?\*?\s*/gi, "")
    .replace(/(💡[^\n]+)/g, '<div class="tip">$1</div>')
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (s) => `<ul>${s}</ul>`)
    .split(/\n{2,}/)
    .map((b) =>
      b.startsWith("<") ? b : `<p>${b.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const ca = document.getElementById("cout");
  ca.innerHTML = h;
  ca.contentEditable = "false";
  editing = false;
  document.getElementById("editBtn").textContent = "✏️";
  document.getElementById("rc").value = "";
}

// ── RATING ────────────────────────────────────────────
function setStar(v) {
  rating = v;
  document
    .querySelectorAll(".star")
    .forEach((s, i) => s.classList.toggle("on", i < v));
}

async function submitRating() {
  if (!rating) return showNotif(t("rating.needStars"), "err");
  if (isGuest) return showNotif(t("rating.needAccount"), "err");
  const comment = document.getElementById("rc").value.trim();
  const platform = document.getElementById("platform").value,
    goal = document.getElementById("goal").value;
  profile.history = [
    {
      platform,
      tpl: tpl.name,
      goal,
      rating,
      comment,
      preview: document.getElementById("cout").innerText.slice(0, 100),
      date: new Date().toISOString(),
    },
    ...(profile.history || []),
  ].slice(0, 20);

  const optKey =
    profile.api_keys[selectedProvider + "_opt"] ||
    profile.api_keys[selectedProvider] ||
    document.getElementById("sk2").value.trim() ||
    document.getElementById("sk1").value.trim();
  if (optKey) {
    document.getElementById("opts").classList.add("show");
    await optimizePrompt(optKey, rating, comment, platform, goal);
    document.getElementById("opts").classList.remove("show");
  } else {
    ruleAdj(rating);
  }
  profile.prompt_version = (profile.prompt_version || 1) + 1;
  await saveProfile();
  updateUI();
  showNotif(t("rating.saved", { ver: profile.prompt_version }), "ok");
}

async function optimizePrompt(key, rating, comment, platform, goal) {
  const recent = (profile.history || [])
    .slice(0, 4)
    .map(
      (h) =>
        `${h.platform}/${h.tpl}:${h.rating}★${h.comment ? ' "' + h.comment + '"' : ""}`,
    )
    .join(" | ");
  const mp = `Prompt engineering. Recent: ${recent}. Latest:${rating}★"${comment || ""}".Platform:${platform}.
Write 1-2 SPECIFIC style instructions (max 12 words each). Progressive only. If >=4★:reinforce. If <=2★:pivot.
Output ONLY instructions, one per line.`;
  try {
    const res = await fetch(API_ENDPOINTS[selectedProvider], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify({
        model: optimizerModel,
        max_tokens: 80,
        temperature: 0.3,
        messages: [{ role: "user", content: mp }],
      }),
    });
    if (!res.ok) throw new Error();
    const d = await res.json();
    const txt = d.choices?.[0]?.message?.content?.trim() || "";
    const tok = d.usage?.total_tokens || 0;
    profile.tokens_today = (profile.tokens_today || 0) + tok;
    if (txt) {
      const lines = txt
        .split("\n")
        .filter((l) => l.trim())
        .slice(0, 2);
      profile.adjustments = [
        ...(profile.adjustments || []),
        ...lines,
      ].slice(-8);
    }
  } catch (e) {
    ruleAdj(rating);
  }
}
function ruleAdj(rating) {
  const r = {
    5: ["Maintain exact tone and hook energy"],
    4: ["Add one specific example or stat"],
    3: ["Strengthen hook and clarify CTA"],
    2: ["More conversational, shorter sentences"],
    1: ["Rethink hook — make it provocative"],
  };
  profile.adjustments = [
    ...(profile.adjustments || []),
    ...(r[rating] || r[3]),
  ].slice(-8);
}

// ── UTILS ─────────────────────────────────────────────
function toggleEdit() {
  const ca = document.getElementById("cout");
  editing = !editing;
  ca.contentEditable = editing ? "true" : "false";
  document.getElementById("editBtn").textContent = editing ? "✅" : "✏️";
  if (editing) ca.focus();
}
function copyPost() {
  navigator.clipboard
    .writeText(document.getElementById("cout").innerText)
    .then(() => {
      const b = document.querySelector(".cp-btn");
      b.textContent = t("app.copied");
      setTimeout(() => {
        b.textContent = t("app.copy");
      }, 2000);
    });
}
function clearOut() {
  document.getElementById("oc").style.display = "none";
  document.getElementById("ec").style.display = "flex";
}
function showNotif(m, t = "ok") {
  const el = document.getElementById("notif");
  el.textContent = m;
  el.className = "notif " + t;
  el.style.display = "block";
  if (t === "ok")
    setTimeout(() => {
      el.style.display = "none";
    }, 4000);
}
function clearNotif() {
  document.getElementById("notif").style.display = "none";
}

Object.assign(window, {
  showLanding,
  setAppLocale: setLocale,
  toggleTheme,
  applyTheme,
  switchTab,
  submitAuth,
  updateAuthPasswordHint,
  guestMode,
  selectProvider,
  wizNext,
  wizSaveKey,
  launchApp,
  wizCheckKey,
  closeTpl,
  showAuth,
  resetStyle,
  openTpl,
  gen,
  toggleEdit,
  clearOut,
  setStar,
  copyPost,
  submitRating,
  toggleSettings,
  saveSettings,
  signOut,
  selTpl,
  selectModel,
  uc,
  skCheck,
  updateModelChips,
});
