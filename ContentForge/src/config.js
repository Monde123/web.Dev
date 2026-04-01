function envString(key, fallback = "") {
  const v = import.meta.env[key];
  if (v === undefined || v === null) return fallback;
  let s = String(v).trim();
  if (!s) return fallback;
  /* .env sometimes uses quotes; Vite may keep them — strip one outer pair */
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || fallback;
}

function envInt(key, fallback) {
  const v = envString(key, "");
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** @type {string} */
export const SUPABASE_URL = envString("VITE_SUPABASE_URL");

/** Clé anon publique Supabase (safe côté client avec RLS). */
export const SUPABASE_ANON_KEY = envString("VITE_SUPABASE_ANON_KEY");

/** Clé Groq du déployeur — uniquement pour le mode invité (exposée au navigateur si définie ici). */
export const OWNER_GROQ_KEY = envString("VITE_OWNER_GROQ_KEY");

/** True si la démo invité peut appeler Groq (clé non vide après normalisation). */
export const GUEST_GROQ_READY = Boolean(OWNER_GROQ_KEY);

export const GUEST_MAX = envInt("VITE_GUEST_MAX", 3);
export const GUEST_MODEL = envString(
  "VITE_GUEST_MODEL",
  "llama-3.3-70b-versatile",
);
export const GUEST_MAX_TOKENS = envInt("VITE_GUEST_MAX_TOKENS", 400);
export const DAILY_TOKEN_CAP = envInt("VITE_DAILY_TOKEN_CAP", 500_000);
