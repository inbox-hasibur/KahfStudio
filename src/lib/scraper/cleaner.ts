/**
 * News Scraper & Markdown Cleaner Utility
 * Strips HTML tags, navigation, advertisements, boilerplate noise, and markdown symbols
 * leaving pure, high-quality narrative body paragraphs for AI processing & reading.
 */

// Section terminator boundaries - once any of these headings appear, the article body has finished!
// Note: Do NOT use \b for non-ASCII/Bengali scripts as JS regex \b only handles ASCII \w
const SECTION_CUTOFF_PATTERNS = [
  /^(পরবর্তী ভিডিও|পরবর্তী সংবাদ|পরবর্তী খবর|next video|next article)(?:\s|$|[:\-])/i,
  /^(আরও পড়ুন|আরও পড়ুন|সম্পর্কিত খবর|সম্পর্কিত সংবাদ|সম্পর্কিত বিষয়|সম্পর্কিত ভিডিও|related news|related stories|more from|read more)(?:\s|$|[:\-])/i,
  /^(ভিডিও থেকে আরও দেখুন|ছবি থেকে আরও দেখুন|আরও দেখুন|সর্বশেষ খবর|টপ নিউজ|জনপ্রিয় খবর|most popular|most read)(?:\s|$|[:\-])/i,
  /^(পাঠকের মন্তব্য|মন্তব্য সমূহ|comments|leave a comment)(?:\s|$|[:\-])/i,
  /^(ট্যাগ|বিষয়|টপিক|tags|topics)(?:\s|$|[:\-])/i,
];

// Regex patterns for advertisement, social share buttons, navigation, and boilerplate noise
const NOISE_PATTERNS = [
  /^(বিজ্ঞাপন|advertisement|sponsored|sponsored content|ad)(?:\s|$|[:\-])/i,
  /^(শেয়ার করুন|শেয়ার করুন|শেয়ার|share on|share|follow us|ফলো করুন|সাবস্ক্রাইব|subscribe)(?:\s|$|[:\-])/i,
  /^(cookie policy|privacy policy|terms of service|terms of use|all rights reserved|সর্বস্বত্ব সংরক্ষিত|কপিরাইট|by using this site)/i,
  /^(\*|\-|\_|\=|\#){3,}$/, // Markdown dividers like --- or ***
  /^https?:\/\/\S+$/i, // Standalone URLs
  /^(ছবি|ফাইল ছবি|সৌজন্যে|ছবি সংগৃহীত|ফাইল ফটো|photo|courtesy|getty images)/i, // Image captions/credits
  /^(source|সূত্র|প্রতিবেদন|অনলাইন ডেস্ক|নিজস্ব প্রতিবেদক|ডেস্ক রিপোর্ট)/i, // Standalone attribution lines
  /^(প্রকাশ|আপডেট|প্রকাশিত|আপডেট করা হয়েছে|published|updated)/i, // Publication timestamps
  /^(\d+\s*(ঘণ্টা|মিনিট|দিন|ঘন্টা|hours?|mins?|days?)\s*(আগে|ago))/i, // Relative time (e.g. ১০ ঘণ্টা আগে)
  /^(খুঁজুন|search|login|লগইন|ই-পেপার|epaper)/i, // Header navigation buttons
  /^ok$/i,
];

/**
 * Decodes standard HTML entities to plain characters
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Cleans raw Jina AI / web scraped markdown text:
 * 1. Strips HTML script/style/nav tags and HTML comments
 * 2. Unescapes HTML entities
 * 3. Removes markdown images, headings (#, ##), empty links, and bold/italic markup
 * 4. Truncates text at section boundaries (related news, next videos, comments)
 * 5. Filters out advertisements, social buttons, and navigation fragments
 * 6. Reconstructs clean, prioritized narrative body paragraphs
 */
export function cleanJinaMarkdown(rawContent: string): string {
  if (!rawContent || rawContent.trim() === '') {
    return '';
  }

  // 1. Strip HTML tags, scripts, styles, iframes, and comments
  let text = rawContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');

  // 2. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 3. Process line-by-line
  const lines = text.split('\n');
  const cleanParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Remove empty markdown links: [](url)
    trimmed = trimmed.replace(/\[\s*\]\([^\s)]+\)/g, '');

    // Ignore markdown image syntax: ![alt](url)
    if (/^!\[.*?\]\([^\s)]+\)$/.test(trimmed)) {
      continue;
    }
    // Remove embedded markdown images from within lines
    trimmed = trimmed.replace(/!\[.*?\]\([^\s)]+\)/g, '');

    // Convert markdown links [text](url) -> text
    trimmed = trimmed.replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1');

    // Remove bullet points at start of line (* item, - item)
    trimmed = trimmed.replace(/^[\*\-\+]\s+/, '');

    // Remove inline or line-start markdown headers (####, ###, ##, #)
    trimmed = trimmed.replace(/#+\s*/g, ' ');

    // Remove markdown bold, italic, code, strikethrough, blockquotes
    trimmed = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^>\s*/, '');

    // Collapse multiple internal spaces
    trimmed = trimmed.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;

    // Check if this line marks the end of main article (e.g. "পরবর্তী ভিডিও", "সম্পর্কিত খবর", "আরও পড়ুন")
    if (SECTION_CUTOFF_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      // If we already have some article content, stop parsing further lines!
      if (cleanParagraphs.length > 0) {
        break;
      } else {
        continue;
      }
    }

    // Check against noise patterns (advertisements, share buttons, footer links, timestamps, etc.)
    if (NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      continue;
    }

    // Ignore short fragments (< 18 chars) that do not end in sentence punctuation
    if (trimmed.length < 18 && !/[।?!.]$/.test(trimmed)) {
      continue;
    }

    // Deduplicate identical lines or paragraphs
    const normalizedKey = trimmed.toLowerCase();
    if (!seenParagraphs.has(normalizedKey)) {
      seenParagraphs.add(normalizedKey);
      cleanParagraphs.push(trimmed);
    }
  }

  // Join cleaned paragraphs with double newline for clean markdown readability
  return cleanParagraphs.join('\n\n');
}

/**
 * Strips all remaining non-spoken punctuation from text prior to feeding into TTS
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*_#`~[\]()<>\\\/^=+]/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
