const GROQ_DIRECT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * URL des complétions : en local (localhost), passe par le proxy Vite (/__groq → api.groq.com)
 * pour éviter le blocage CORS du navigateur sur l’API Groq.
 * Déploiement : définir VITE_GROQ_API_URL vers une URL proxy (Worker, etc.) si besoin.
 */
function groqChatCompletionsUrl() {
  const custom = String(import.meta.env.VITE_GROQ_API_URL || "").trim();
  if (custom) {
    if (custom.includes("chat/completions")) return custom;
    return `${custom.replace(/\/$/, "")}/openai/v1/chat/completions`;
  }
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
  if (local) return "/__groq/openai/v1/chat/completions";
  return GROQ_DIRECT;
}

/**
 * Groq OpenAI-compatible chat completion (single responsibility: HTTP + parse).
 * @param {string} apiKey
 * @param {{ model: string; max_tokens: number; temperature: number; messages: { role: string; content: string }[] }} body
 * @returns {Promise<{ text: string; usage?: { total_tokens?: number } }>}
 */
export async function groqChatCompletion(apiKey, body) {
  if (!apiKey || !String(apiKey).trim())
    throw new Error(
      "No Groq API key. Set VITE_OWNER_GROQ_KEY for guest mode or add your key in Settings.",
    );

  let res;
  try {
    res = await fetch(groqChatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey.trim(),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const isNetwork =
      e instanceof TypeError ||
      (e && String(e.name || "") === "TypeError");
    if (isNetwork) {
      throw new Error(
        "Connexion à Groq impossible (réseau ou CORS). " +
          "Lancez l’app avec « npm run dev » ou « npm run preview » depuis le dossier ContentForge " +
          "(proxy Vite). N’ouvrez pas index.html en file://. Après modification de .env, redémarrez le serveur.",
      );
    }
    throw e;
  }

  const raw = await res.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const apiMsg = parsed?.error?.message;
    const hint =
      res.status === 401
        ? " Invalid or revoked API key."
        : res.status === 429
          ? " Rate limit — try again shortly."
          : "";
    throw new Error(
      (apiMsg || `Groq request failed (${res.status}).`) + hint,
    );
  }

  if (!parsed)
    throw new Error("Invalid response from Groq (not JSON).");

  const text = parsed.choices?.[0]?.message?.content || "";
  return { text, usage: parsed.usage };
}
