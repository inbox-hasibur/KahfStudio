/**
 * Centralized audio and language helper for KahfStudio
 * Ensures consistent, country-aware, and script-aware TTS model selection across all news.
 */

export type SiteLanguage = "BN" | "EN" | "AR";

export interface NewsLanguageMeta {
  lang: SiteLanguage;
  langCode: "bn" | "en" | "ar";
  locale: "bn-BD" | "en-US" | "ar-SA";
  modelName: string;
}

/**
 * Detects the authentic language of a news item.
 * Prioritizes:
 * 1. Script heuristic (Arabic or Bengali Unicode detection in text)
 * 2. Article country (SA -> Arabic, UK/GLOBAL/US -> English, BD -> Bengali)
 * 3. Fallback country / edition
 */
export function detectNewsLanguage(
  item?: {
    country?: string;
    title?: string;
    headline?: string;
    summary?: string;
    ai_summary?: string;
    raw_content?: string;
    content?: string;
  } | null,
  fallbackCountry = "BD"
): SiteLanguage {
  if (!item) {
    const fCountry = (fallbackCountry || "BD").toUpperCase();
    if (fCountry === "SA") return "AR";
    if (["UK", "GLOBAL", "US", "GB"].includes(fCountry)) return "EN";
    return "BN";
  }

  // 1. Script-based heuristic (most reliable ground truth)
  const sample = `${item.title || item.headline || ""} ${item.summary || item.ai_summary || ""} ${item.raw_content || item.content || ""}`.slice(0, 400);

  if (/[\u0600-\u06FF]/.test(sample)) {
    return "AR"; // Authentic Arabic script
  }
  if (/[\u0980-\u09FF]/.test(sample)) {
    return "BN"; // Authentic Bengali script
  }

  // 2. Country-based detection
  const country = (item.country || fallbackCountry || "BD").toUpperCase();
  if (country === "SA") return "AR";
  if (["UK", "GLOBAL", "US", "GB"].includes(country)) return "EN";
  if (country === "BD") return "BN";

  // 3. Fallback based on Latin text detection
  if (/[a-zA-Z]/.test(sample)) {
    return "EN";
  }

  return "BN";
}

/**
 * Returns complete TTS metadata for a given language
 */
export function getLanguageTtsMeta(lang: SiteLanguage): NewsLanguageMeta {
  switch (lang) {
    case "AR":
      return {
        lang: "AR",
        langCode: "ar",
        locale: "ar-SA",
        modelName: "Arabic Studio TTS",
      };
    case "EN":
      return {
        lang: "EN",
        langCode: "en",
        locale: "en-US",
        modelName: "English Neural TTS",
      };
    case "BN":
    default:
      return {
        lang: "BN",
        langCode: "bn",
        locale: "bn-BD",
        modelName: "Bangla Broadcast TTS",
      };
  }
}
