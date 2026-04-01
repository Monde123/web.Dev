/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optionnel : URL de base ou complète vers un proxy Groq (hors localhost). */
  readonly VITE_GROQ_API_URL: string;
  readonly VITE_OWNER_GROQ_KEY: string;
  readonly VITE_GUEST_MAX: string;
  readonly VITE_GUEST_MODEL: string;
  readonly VITE_GUEST_MAX_TOKENS: string;
  readonly VITE_DAILY_TOKEN_CAP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
