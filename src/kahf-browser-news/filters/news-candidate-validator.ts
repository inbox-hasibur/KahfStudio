/**
 * News Candidate Validator
 *
 * NOTE: This validator uses ZERO Gemini or external LLM tokens!
 * It is 100% local, ultra-fast algorithmic & regex verification to filter out
 * junk links, navigation menus, sponsored spam, and UI artifacts.
 */

const JUNK_TITLE_PATTERNS = [
  /^!*image\s*\d*/i,
  /^!*\[*image/i,
  /^skip to /i,
  /^about us$/i,
  /^contact( us)?$/i,
  /^privacy policy$/i,
  /^terms( of service| of use)?$/i,
  /^advertisement$/i,
  /^cookie policy$/i,
  /^subscribe$/i,
  /^log in$/i,
  /^sign up$/i,
  /^e-paper$/i,
  /^archives?$/i,
  /^investigative stories$/i,
  /^opinion$/i,
  /^editorial$/i,
  /^entertainment$/i,
  /^sports$/i,
  /^business$/i,
  /^lifestyle$/i,
  /^bangladesh$/i,
  /^all categories$/i,
  /^home$/i,
];

const UI_JUNK_REGEX = /\b(more-menu|burger-menu|navigation-menu|categories-menu|search icon|dark mode|media accounts? icon|imageicon|cardimage|theme\d+slider)\b/i;

const SPONSORED_PATTERNS = [
  /cash back card/i,
  /best credit card/i,
  /home equity into cash/i,
  /want cash out of your home/i,
  /ink-sane value/i,
  /top buys.*worth your cash/i,
  /best cash back/i,
];

/**
 * Validates whether a headline and URL qualify as a genuine news article.
 * Runs instantly in microseconds with zero token consumption.
 */
export function isValidNewsCandidate(title: string, url: string): boolean {
  if (!title || !url) return false;
  const cleanTitle = title.trim();

  // Minimum length checks
  if (cleanTitle.length < 20) return false;
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;

  // Reject image placeholders or markdown image alt tags
  if (
    cleanTitle.startsWith('!') ||
    cleanTitle.startsWith('[') ||
    /^!?\[?(image|photo|figure|img|pic|picture)\b/i.test(cleanTitle)
  ) {
    return false;
  }

  // Reject UI menu fragments
  if (UI_JUNK_REGEX.test(cleanTitle)) {
    return false;
  }

  // Reject if ending with button or icon label
  if (/(icon|menu|logo|button|thumbnail|banner|widget)$/i.test(cleanTitle)) {
    return false;
  }

  // Reject commercial affiliate ads
  for (const pattern of SPONSORED_PATTERNS) {
    if (pattern.test(cleanTitle)) return false;
  }

  // Generic credit card filter (unless it's actual bank/police news)
  if (
    /\b(credit card|cashback|cash back)\b/i.test(cleanTitle) &&
    !/\b(scam|fraud|police|bank|central bank|বাংলাদেশ ব্যাংক)\b/i.test(cleanTitle)
  ) {
    return false;
  }

  // Reject junk / boilerplate section titles
  for (const pattern of JUNK_TITLE_PATTERNS) {
    if (pattern.test(cleanTitle)) return false;
  }

  // URL structure validation
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    // Must have a meaningful path
    if (pathname === '/' || pathname === '') return false;

    // Reject static assets
    if (/\.(jpg|jpeg|png|gif|webp|svg|css|js|woff|woff2|ttf|ico|pdf|zip)$/i.test(pathname)) {
      return false;
    }

    // Reject top-level category or index listing pages
    if (/^\/(category|tag|tags|topic|topics|section|author|page|search|feed)\/?$/i.test(pathname)) {
      return false;
    }

    // Reject social share URLs or login URLs
    if (/(login|signup|register|user|auth|cart|checkout)/i.test(pathname)) {
      return false;
    }
  } catch (e) {
    return false;
  }

  return true;
}
