/**
 * Détection heuristique de la langue du texte de référence (sans dépendance externe).
 * Sert à imposer au modèle la langue de sortie (FR / EN / ES ou indéterminé).
 */
const SAMPLE = 700;

const RE_FR = /[àâäéèêëïîôùûüÿçœæ]/i;
const RE_ES = /[ñáíóúü¿¡]/i;

const RE_WORDS_FR =
  /\b(le|la|les|un|une|des|et|est|dans|pour|avec|vous|nous|ce|cette|ces|son|sa|ses|sont|aussi|très|pas|qui|que|dont|où|sur|par|aux|des|une|être|fait|tout|tous|plus|mais|bien|comme)\b/gi;
const RE_WORDS_EN =
  /\b(the|and|is|are|you|your|this|that|with|for|from|have|been|not|was|were|they|our|will|can|about|into|more|also|just|when|what|which|their|them)\b/gi;
const RE_WORDS_ES =
  /\b(el|la|los|las|que|para|con|por|una|como|más|pero|sobre|todos|esta|este|son|hay|muy|todo|bien|ser)\b/gi;

/**
 * @param {string} text
 * @returns {{ code: string; instruction: string }}
 */
export function detectReferenceLanguage(text) {
  const raw = (text || "").trim();
  if (!raw) {
    return {
      code: "und",
      instruction:
        "Match the dominant language of the reference text exactly for the entire output (headings, body, hashtags, tip).",
    };
  }

  const s = raw.slice(0, SAMPLE);
  let fr = 0;
  let en = 0;
  let es = 0;

  if (RE_FR.test(s)) fr += 5;
  if (RE_ES.test(s)) es += 4;

  const mfr = s.match(RE_WORDS_FR);
  fr += mfr ? Math.min(mfr.length, 14) : 0;
  const men = s.match(RE_WORDS_EN);
  en += men ? Math.min(men.length, 14) : 0;
  const mes = s.match(RE_WORDS_ES);
  es += mes ? Math.min(mes.length, 12) : 0;

  const max = Math.max(fr, en, es);
  if (max < 4) {
    return {
      code: "und",
      instruction:
        "Detect the language of the reference and write the entire output in that same language. If mixed, use the dominant language.",
    };
  }

  if (fr >= en && fr >= es) {
    return {
      code: "fr",
      instruction:
        "Write the COMPLETE output in French: every heading, paragraph, hashtag, and the final 💡 tip line must be in French.",
    };
  }
  if (es >= en && es >= fr) {
    return {
      code: "es",
      instruction:
        "Write the COMPLETE output in Spanish: every heading, paragraph, hashtag, and the final 💡 tip line must be in Spanish.",
    };
  }
  return {
    code: "en",
    instruction:
      "Write the COMPLETE output in English: every heading, paragraph, hashtag, and the final 💡 tip line must be in English.",
  };
}
