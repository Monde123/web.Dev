import { messages } from "./messages.js";

const LANG_KEY = "contentforge-lang";

/** @type {'en'|'fr'} */
let locale = "fr";

/** @type {(() => void) | null} */
let onLocaleChange = null;

/**
 * @param {Record<string, unknown>} obj
 * @param {string} path
 */
function getNested(obj, path) {
  return path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

/**
 * @param {string} key dot path e.g. "auth.tabLogin"
 * @param {Record<string, string | number>} [params]
 */
export function t(key, params) {
  const pack = messages[locale] || messages.fr;
  let s = getNested(pack, key);
  if (typeof s !== "string") s = key;
  if (params) {
    for (const [k, val] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(val));
    }
  }
  return s;
}

/** Model id keys may contain dots — not expressible as dot paths. */
export function tModelTip(modelId) {
  const tips = (messages[locale] || messages.fr)?.modelTips;
  const s = tips?.[modelId];
  return typeof s === "string" ? s : "";
}

/** Label for select options (value may contain spaces or &). */
export function tLabel(section, value) {
  const pack = messages[locale] || messages.fr;
  const bucket = pack?.[section];
  if (bucket && typeof bucket === "object" && value in bucket) {
    const s = bucket[value];
    return typeof s === "string" ? s : value;
  }
  return value;
}

export function getLocale() {
  return locale;
}

export function setOnLocaleChange(fn) {
  onLocaleChange = typeof fn === "function" ? fn : null;
}

/**
 * @param {'en'|'fr'} l
 */
export function setLocale(l) {
  locale = l === "en" ? "en" : "fr";
  try {
    localStorage.setItem(LANG_KEY, locale);
  } catch {
    /* private mode */
  }
  document.documentElement.lang = locale === "fr" ? "fr" : "en";
  document.title = t("meta.title");
  applyDomI18n();
  syncLangSwitchUi();
  onLocaleChange?.();
}

export function toggleLocale() {
  setLocale(locale === "fr" ? "en" : "fr");
}

export function initI18n() {
  try {
    const s = localStorage.getItem(LANG_KEY);
    if (s === "en" || s === "fr") locale = s;
    else {
      const nav = (navigator.language || "en").toLowerCase();
      locale = nav.startsWith("fr") ? "fr" : "en";
    }
  } catch {
    locale = "fr";
  }
  document.documentElement.lang = locale === "fr" ? "fr" : "en";
  document.title = t("meta.title");
  applyDomI18n();
  syncLangSwitchUi();
}

export function applyDomI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "TITLE") {
      document.title = val;
      return;
    }
    if (el.dataset.i18nHtml === "1") el.innerHTML = val;
    else el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && "placeholder" in el) el.placeholder = t(key);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
}

export function syncLangSwitchUi() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    btn.classList.toggle("on", lang === locale);
    btn.setAttribute("aria-pressed", lang === locale ? "true" : "false");
  });
}
