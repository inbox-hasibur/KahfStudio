/**
 * News Scraper & Markdown Cleaner Utility
 * Strips HTML tags, navigation, advertisements, boilerplate noise, and markdown symbols
 * leaving pure, high-quality narrative body paragraphs for AI processing & reading.
 */

// Section terminator boundaries - once any of these headings appear, the article body has finished!
const SECTION_CUTOFF_PATTERNS = [
  /^(পাঠকের মন্তব্য|মন্তব্য সমূহ|comments|leave a comment|discussion)(?:\s|$|[:\-])/i,
  /^(কপিরাইট|সর্বস্বত্ব সংরক্ষিত|all rights reserved|terms & conditions|privacy policy|copyright \d+)(?:\s|$|[:\-])/i,
  /^(ট্যাগ|বিষয়|টপিক|tags|topics|related topics)(?:\s|$|[:\-])/i,
  /^(about the author|author bio|লেখক পরিচিতি)(?:\s|$|[:\-])/i,
  /^(follow us|subscribers?|followers?|subscribe\b)/i,
  /^(phone|email|support|contact us|address):\s*/i,
  /^(h\s*\d+\/\d+,\s*rd\s*\d+|sekhertek,\s*dhaka)/i,
  /^\[newsdesk\]/i,
  /^written by\s+[a-z0-9_.-]+/i,
  /^\d+(\.\d+)?[KMB]?\s*(Followers|Subscribers|Follow Us|Subscribe)/i,
  /^(##\s*\[!\[|####\s*Download|পড়ুন অন্য খবর|আরও খবর|সম্পর্কিত খবর|আরও পড়ুন)/i,
];

// Inline promotional / teaser lines that should be skipped without breaking the rest of the article
const INLINE_PROMO_PATTERNS = [
  /^(আরও পড়ুন|আরও পড়ুন|সম্পর্কিত খবর|সম্পর্কিত সংবাদ|সম্পর্কিত বিষয়|সম্পর্কিত ভিডিও|related news|related stories|more from|read more|more on this|also read|see also)(?:\s|$|[:\-])/i,
  /^(পরবর্তী ভিডিও|পরবর্তী সংবাদ|পরবর্তী খবর|next video|next article)(?:\s|$|[:\-])/i,
  /^(ভিডিও থেকে আরও দেখুন|ছবি থেকে আরও দেখুন|আরও দেখুন|সর্বশেষ খবর|টপ নিউজ|জনপ্রিয় খবর|most popular|most read)(?:\s|$|[:\-])/i,
];

// Regex patterns for advertisement, social share buttons, navigation, Jina headers, and boilerplate noise
const NOISE_PATTERNS = [
  /^(title|url source|markdown content|author|published time|description|feed source):\s*/i, // Jina / Scraper metadata headers
  /^(<\/?(item|rss|channel|feed|content:encoded|dc:creator|pubdate|guid|atom:link)[^>]*>)/i, // RSS XML tags
  /^<!\[cdata\[/i,
  /^\]\]>$/,
  /^(বিজ্ঞাপন|advertisement|sponsored|sponsored content|ad)(?:\s|$|[:\-])/i,
  /^(শেয়ার করুন|শেয়ার করুন|শেয়ার|share on|share|follow us|ফলো করুন|সাবস্ক্রাইব|subscribe)(?:\s|$|[:\-])/i,
  /^(cookie policy|privacy policy|terms of service|terms of use|all rights reserved|সর্বস্বত্ব সংরক্ষিত|কপিরাইট|by using this site)/i,
  /^(\*|\-|\_|\=|\#){3,}$/, // Markdown dividers like --- or ***
  /^https?:\/\/\S+$/i, // Standalone URLs
  /^(ছবি|ফাইল ছবি|সৌজন্যে|ছবি সংগৃহীত|ফাইল ফটো|photo|courtesy|getty images)/i, // Image captions/credits
  /^(source|সূত্র|প্রতিবেদন|অনলাইন ডেস্ক|নিজস্ব প্রতিবেদক|ডেস্ক রিপোর্ট|বিশেষ প্রতিনিধি|স্টাফ রিপোর্টার|অনলাইন সংস্করণ|বাণিজ্য ডেস্ক|খেলা ডেস্ক)/i, // Standalone attribution lines
  /^(প্রকাশ|আপডেট|প্রকাশিত|আপডেট করা হয়েছে|published|updated)\s*[:\s]\s*[\d০-৯]/iu, // Publication timestamps (Bengali & English digits)
  /^(\d+\s*(ঘণ্টা|মিনিট|দিন|ঘন্টা|hours?|mins?|days?)\s*(আগে|ago))/i, // Relative time (e.g. ১০ ঘণ্টা আগে)
  /^(খুঁজুন|search|login|লগইন|ই-পেপার|epaper)/i, // Header navigation buttons
  /^\d+(\.\d+)?[KMB]?\s*(Followers|Subscribers|Likes|Follow Us|Subscribe)/i,
  /^(phone|email|support|contact|tel|fax|address):\s*/i,
  /^h\s*\d+\/\d+,\s*rd\s*\d+/i,
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  /^\(\+\d{2,4}\)\s*\d+/,
  /^\[newsdesk\]/i,
  /^written by\s+[a-z0-9_.-]+/i,
  /^\d+\s*comments\s*\d+\s*views/i,
  /^(like|facebook|twitter|email|whatsapp|linkedin)\s*$/i,
  /^(entertainment|fitness & health|science and technology|youtube trending)\s*\(\d+\)/i,
  /^[a-z0-9.-]+\.(com|org|net|gov|edu)\s+is\s+a\s+trusted/i,
  /^ok$/i,
  // Concatenated navbar and category menus (RisingBD / BD news portals)
  /(বরিশাল.*চট্টগ্রাম|ঢাকা.*খুলনা|রাজশাহী.*সিলেট|অর্থনীতি.*শেয়ার|শেয়ার বাজার|করপোরেট কর্নার|সাতসতেরো|অন্য দুনিয়া|লাইফ স্টাইল|দেহঘড়ি|ভাগ্যচক্র|জেন জি|বাংলা কনভার্টার|পজিটিভ বাংলাদেশ|উদ্যোক্তা|শিল্প ও সাহিত্য|রাইজিংবিডি|স্পেশাল|ক্যাম্পাস.*বিশ্ববিদ্যালয়)/i,
  /^(\d+[\.\)]\s*)?(আন্তর্জাতিক|বাংলাদেশ|সারাদেশ|জাতীয়|জাতীয়|রাজনীতি|অর্থনীতি|খেলা|খেলাধুলা|বিনোদন|মতামত|ফিচার|তথ্যপ্রযুক্তি|বিজ্ঞান|শিক্ষা|চাকরি|লাইফস্টাইল|প্রবাস|অন্যান্য)\s*$/i,
  /^(আন্তর্জাতিক|অনলাইন|বাণিজ্য|খেলা|বিনোদন|বিশেষ|স্টাফ)\s*(ডেস্ক|প্রতিবেদক|রিপোর্টার|বার্তা)/i,
];

/**
 * Decodes standard, hex, and decimal HTML entities to plain characters (multi-pass for double-encoding)
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  let decoded = text;
  // Multi-pass to handle double-escaped entities like &amp;#x99C;
  for (let pass = 0; pass < 3; pass++) {
    if (!decoded.includes('&')) break;
    const prev = decoded;
    decoded = decoded
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCodePoint(parseInt(hex, 16));
        } catch {
          return _;
        }
      })
      .replace(/&#([0-9]+);/g, (_, dec) => {
        try {
          return String.fromCodePoint(parseInt(dec, 10));
        } catch {
          return _;
        }
      })
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&copy;/gi, '©')
      .replace(/&reg;/gi, '®')
      .replace(/&trade;/gi, '™')
      .replace(/&ndash;/gi, '–')
      .replace(/&mdash;/gi, '—')
      .replace(/&lsquo;/gi, '‘')
      .replace(/&rsquo;/gi, '’')
      .replace(/&ldquo;/gi, '“')
      .replace(/&rdquo;/gi, '”')
      .replace(/&hellip;/gi, '…');

    if (decoded === prev) break;
  }
  return decoded;
}

/**
 * Cleans raw Jina AI / web scraped markdown text:
 * 1. Strips Jina metadata headers (Title:, URL Source:, Markdown Content:)
 * 2. Discards pre-article navigation, menus, and banners (starts from main headline # Title)
 * 3. Strips CDATA and RSS XML wrappers
 * 4. Strips HTML script/style/nav tags and comments
 * 5. Removes markdown images, headings, empty links, and bold/italic markup
 * 6. Truncates text at genuine end-of-article boundaries without cutting off on early captions
 * 7. Filters out advertisements, social buttons, and navigation fragments
 * 8. Reconstructs clean narrative body paragraphs
 */
export function cleanJinaMarkdown(rawContent: string, articleTitle?: string): string {
  if (!rawContent || rawContent.trim() === '') {
    return '';
  }

  // 1. Pre-strip Jina AI Reader metadata headers & CDATA wrapper blocks
  let text = rawContent
    .replace(/^Title:\s*.*$/gim, '')
    .replace(/^URL Source:\s*.*$/gim, '')
    .replace(/^Markdown Content:\s*.*$/gim, '')
    .replace(/^Author:\s*.*$/gim, '')
    .replace(/^Published Time:\s*.*$/gim, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');

  // 2. Discard everything before the main article headline (# Headline) if present
  // In Jina AI markdown, website logos, navbars, and category menus are rendered at the top,
  // followed by "# <Headline>" where the actual news story begins.
  const h1Match = text.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match.index !== undefined && h1Match.index > 0) {
    text = text.slice(h1Match.index);
  }

  // 3. Strip HTML tags, scripts, styles, iframes, and comments
  text = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');

  // 4. Decode HTML entities (handles &#x... hex, &#... decimal, &amp; etc.)
  text = decodeHtmlEntities(text);

  // 5. Process line-by-line
  const lines = text.split('\n');
  const cleanParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();
  const totalLines = lines.length;

  for (let lineIdx = 0; lineIdx < totalLines; lineIdx++) {
    let line = lines[lineIdx];
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Remove empty markdown links: [](url) or [![img](url)](url)
    trimmed = trimmed
      .replace(/\[\s*!\[.*?\]\(.*?\)\s*\]\([^\s)]+\)/g, '')
      .replace(/\[\s*\]\([^\s)]+\)/g, '')
      .trim();
    if (!trimmed) continue;

    // Ignore standalone markdown images
    if (/^!\[.*?\]\([^\s)]+\)$/.test(trimmed)) {
      continue;
    }
    // Remove embedded markdown images from within lines
    trimmed = trimmed.replace(/!\[.*?\]\([^\s)]+\)/g, '').trim();
    if (!trimmed) continue;

    // Check if this line marks the true end of the main article (comments, footer, copyright, tags, contact info)
    if (SECTION_CUTOFF_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      if (cleanParagraphs.length >= 2) {
        break;
      }
      continue;
    }

    // Check against inline promo / teaser lines
    if (INLINE_PROMO_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      continue;
    }

    // Skip lines where the ENTIRE line is a link to another news story (inline teaser links)
    if (/^\[[^\]]+\]\(https?:\/\/[^\s)]+\)$/.test(trimmed)) {
      continue;
    }

    // Skip lines that are navigation / multiple link lists: e.g. [A](1)[B](2)[C](3)
    const linkMatches = trimmed.match(/\[([^\]]+)\]\([^\s)]+\)/g);
    if (linkMatches && linkMatches.length >= 2) {
      continue;
    }

    // Check against noise patterns (advertisements, share buttons, footer links, timestamps, etc.)
    if (NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      continue;
    }

    // Skip date / hijri / bangla calendar banners (e.g. "ঢাকা শনিবার ১৯ সেপ্টেম্বর ২০২৬ || আশ্বিন ৪ ১৪৩৩ || ৬ রবিউস সানি ১৪৪৮ হিজরি")
    if (/(\d+\s*হিজরি|হিজরী|রবিউস সানি|আশ্বিন|কার্তিক|বৈশাখ|জ্যৈষ্ঠ|আষাঢ়|শ্রাবণ|ভাদ্র|পৌষ|মাঘ|ফাল্গুন|চৈত্র)/i.test(trimmed) && /\|\|/.test(trimmed)) {
      continue;
    }

    // Skip desk bylines & attribution lines (e.g. "আন্তর্জাতিক ডেস্ক || রাইজিংবিডি.কম", "ডেস্ক রিপোর্ট", "বিশেষ প্রতিনিধি")
    if (/^(আন্তর্জাতিক ডেস্ক|অনলাইন ডেস্ক|নিজস্ব প্রতিবেদক|ডেস্ক রিপোর্ট|বিশেষ প্রতিনিধি|স্টাফ রিপোর্টার|অনলাইন সংস্করণ|বাণিজ্য ডেস্ক|খেলা ডেস্ক)/i.test(trimmed)) {
      continue;
    }

    // Convert remaining markdown links [text](url) -> text
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

    // Skip the headline itself if it's repeated as a single standalone line right before paragraphs
    if (articleTitle && (trimmed.includes(articleTitle.slice(0, 20)) || articleTitle.includes(trimmed))) {
      continue;
    }

    // Skip standalone short category breadcrumbs or tags (< 25 chars without sentence punctuation)
    // e.g. "বিজ্ঞান-প্রযুক্তি", "করপোরেট কর্নার", "2. আন্তর্জাতিক", "ডোনাল্ড ট্রাম্প"
    if (trimmed.length < 25 && !/[।?!.]/.test(trimmed)) {
      continue;
    }

    // Ignore very short noise fragments (< 14 chars) unless ending with sentence punctuation
    if (trimmed.length < 14 && !/[।?!."')\]]$/.test(trimmed)) {
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
