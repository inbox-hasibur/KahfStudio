import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { extractArticleContent } from "@/lib/scraper/universal-extractor";
import { discoverRssFeed, enrichRssItemsWithOgImage } from "@/lib/scraper/rss-discovery";
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from "@/lib/audio/gemini-tts";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution limit compliant with Vercel Hobby & Pro plans

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Helper: Wrap a promise with a hard timeout
function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000, fallbackErrMsg: string = "Operation timed out"): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(fallbackErrMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

interface CandidateItem {
  url: string;
  title: string;
  sourceName: string;
  category: string;
  country?: string;
  description?: string;
  imageUrl?: string | null;
  pubDate?: string;
  importance?: number;
  author?: string;
}

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
  /^books and literature$/i,
  /^accidents and fires$/i,
  /^geopolitical insights$/i,
  /^travel and leisure$/i,
  /^health and wellness$/i,
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

export function isValidArticleCandidate(title: string, url: string): boolean {
  if (!title || !url) return false;
  const cleanTitle = title.trim();

  // Must have at least 22 characters
  if (cleanTitle.length < 22) return false;

  // Must have at least 4 words
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;

  // Reject image captions, markdown images, and Jina image alt-tags (with or without numbers)
  if (
    cleanTitle.startsWith('!') ||
    cleanTitle.startsWith('[') ||
    /^!?\[?(image|photo|figure|img|pic|picture)\b/i.test(cleanTitle)
  ) {
    return false;
  }

  // Reject titles containing UI junk keywords
  const UI_JUNK_REGEX = /\b(more-menu|burger-menu|navigation-menu|categories-menu|search icon|dark mode|media accounts? icon|imageicon|cardimage|theme\d+slider)\b/i;
  if (UI_JUNK_REGEX.test(cleanTitle)) {
    return false;
  }

  // Reject if ends with UI terms like 'icon', 'menu', 'logo', 'button', 'thumbnail'
  if (/(icon|menu|logo|button|thumbnail|banner|widget)$/i.test(cleanTitle)) {
    return false;
  }

  // Reject junk titles
  for (const pattern of JUNK_TITLE_PATTERNS) {
    if (pattern.test(cleanTitle)) return false;
  }

  // URL checks
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    // Ignore homepages, tags, topic lists, categories, search pages
    if (pathname === '/' || pathname === '') return false;
    if (pathname.includes('/tag/') || pathname.includes('/category/') || pathname.includes('/topic/') || pathname.includes('/section/')) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length <= 2 && !/\d/.test(pathname)) return false;
    }
    if (parsed.hash && parsed.hash.includes('content')) return false;
    if (/\.(png|jpe?g|gif|svg|webp|ico|css|js)$/i.test(pathname)) return false;
  } catch (e) {
    return false;
  }

  return true;
}

export function sanitizeArticleContent(content: string): string {
  if (!content) return "";
  let text = content;
  // 1. Strip Jina AI reader metadata headers
  text = text.replace(/^(Title|URL Source|Markdown Content|Author|Published Time|Description):\s*.*$/gim, '');
  // 2. Strip CDATA wrappers and raw HTML/XML tags
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  text = text.replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, '');
  // 3. Convert markdown links [text](http...) -> plain text
  text = text.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1');
  // 4. Strip standalone or inline naked URLs
  text = text.replace(/https?:\/\/\S+/gi, '');
  // 5. Strip editorial prefixes
  text = text.replace(/^(মূল সংবাদ|বিস্তারিত সংবাদ|প্রতিবেদন|সংবাদ|Full Story|Full News|Article Body):\s*/gim, '');
  // 6. Normalize whitespace and double newlines
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !/^(Title|URL Source|Markdown Content):\s*/i.test(line))
    .join('\n\n');
  return text.trim();
}

export function sanitizeSummary(summary: string): string {
  if (!summary) return "";
  let text = summary;
  text = text.replace(/^(Title|URL Source|Markdown Content|Author|Published Time):\s*.*$/gim, '');
  text = text.replace(/^(সারসংক্ষেপ|সংক্ষেপ|মূল কথা|Summary|AI Summary|Key Points|Brief):\s*/gim, '');
  text = text.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1');
  text = text.replace(/https?:\/\/\S+/gi, '');
  return text.replace(/\s+/g, ' ').trim();
}

// Jina-First / HTML Link Extractor when RSS feed is invalid or blocked by Cloudflare/Datacenter IP
async function extractCandidatesFromHtmlOrJina(sourceUrl: string, sourceName: string, category: string): Promise<CandidateItem[]> {
  const results: CandidateItem[] = [];
  const seenUrls = new Set<string>();

  let targetUrl = sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.pathname.includes('feed') || parsed.pathname.includes('rss') || parsed.pathname.includes('api')) {
      targetUrl = parsed.origin;
    }
  } catch (e) { }

  // 1. Tier 1 (Primary): Jina Reader Proxy
  try {
    const jinaRes = await axios.get(`https://r.jina.ai/${targetUrl}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KahfStudioBot/1.0)',
        'Accept': 'text/plain, text/markdown, */*',
      },
    });
    const markdown = typeof jinaRes.data === 'string' ? jinaRes.data : '';
    const linkRegex = /\[([^\]]{22,140})\]\((https?:\/\/[^\s\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(markdown)) !== null && results.length < 12) {
      const title = match[1].replace(/[*_#`[\]()]/g, '').trim();
      const link = match[2].trim();
      if (isValidArticleCandidate(title, link)) {
        try {
          const host = new URL(link).hostname;
          const targetHost = new URL(targetUrl).hostname;
          if (host.includes(targetHost.replace('www.', '')) && !seenUrls.has(link)) {
            seenUrls.add(link);
            results.push({ url: link, title, sourceName, category });
          }
        } catch (e) { }
      }
    }
    if (results.length > 0) return results;
  } catch (jinaErr) { }

  // 2. Tier 2 (Fallback): Direct HTML extraction with Cheerio (3s timeout)
  try {
    const res = await axios.get(targetUrl, {
      timeout: 3000,
      headers: BROWSER_HEADERS,
    });
    if (typeof res.data === 'string' && res.data.length > 500) {
      const $ = cheerio.load(res.data);
      $('a').each((_, el) => {
        if (results.length >= 10) return;
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        const href = $(el).attr('href');
        if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            let fullUrl = href;
            if (!href.startsWith('http')) {
              const base = new URL(targetUrl).origin;
              fullUrl = `${base}${href.startsWith('/') ? '' : '/'}${href}`;
            }
            if (isValidArticleCandidate(text, fullUrl)) {
              const host = new URL(fullUrl).hostname;
              const targetHost = new URL(targetUrl).hostname;
              if (host.includes(targetHost.replace('www.', '')) && !seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                results.push({ url: fullUrl, title: text, sourceName, category });
              }
            }
          } catch (e) { }
        }
      });
      if (results.length > 0) return results;
    }
  } catch (directErr) { }

  return results;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendLog = async (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ message: `[${timeStr}] ${msg}` })}\n\n`));
    } catch (e) { }
  };

  (async () => {
    try {
      // 1. Send immediate keepalive ping to flush serverless proxy buffer
      try {
        await writer.write(encoder.encode(`: ping\n\n`));
      } catch (e) { }

      await sendLog("🚀 Pipeline Connected. Initializing scraping sources...");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        await sendLog("❌ [CRITICAL ERROR] Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
        return;
      }

      const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
      await sendLog(`[Database Step 1] Connecting to Supabase instance (${supabaseHost})...`);
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch System Settings & Automation Defaults
      const { data: sysData } = await supabase.from("system_settings").select("setting_key, setting_value");
      let autoApp = true;
      let keys: string[] = [];
      let defaultCategory = "All";
      let defaultLimit = 5;
      let defaultCountry = "All";

      if (sysData) {
        const autoSetting = sysData.find((s) => s.setting_key === "auto_approve_news");
        const keysSetting = sysData.find((s) => s.setting_key === "global_gemini_api_keys");
        const defCatSetting = sysData.find((s) => s.setting_key === "automation_default_category");
        const defLimSetting = sysData.find((s) => s.setting_key === "automation_default_limit");
        const defCountrySetting = sysData.find((s) => s.setting_key === "automation_default_country");

        if (autoSetting) autoApp = autoSetting.setting_value === "true";
        if (defCatSetting?.setting_value) defaultCategory = defCatSetting.setting_value;
        if (defLimSetting?.setting_value) defaultLimit = parseInt(defLimSetting.setting_value, 10) || 5;
        if (defCountrySetting?.setting_value) defaultCountry = defCountrySetting.setting_value;

        if (keysSetting) {
          try {
            const parsed = JSON.parse(keysSetting.setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) keys = parsed;
          } catch (e) { }
        }
      }
      const activeKeys = (keys && keys.length > 0) ? keys : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);

      const searchParams = req.nextUrl?.searchParams || new URL(req.url, 'http://localhost').searchParams;
      const targetLimit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : defaultLimit;
      const targetCategory = searchParams.has('category') ? searchParams.get('category')! : defaultCategory;
      const targetCountry = searchParams.has('country') ? searchParams.get('country')! : defaultCountry;

      await sendLog(`Config: Auto-Approve = ${autoApp ? "ON (published)" : "OFF (draft)"} | Gemini API Keys: ${activeKeys.length} | Limit: ${targetLimit} | Category: "${targetCategory}"`);

      await sendLog(`[Database Step 2] Querying active scraping sources (Category: "${targetCategory}", Country: "${targetCountry}")...`);
      let sourceQuery = supabase
        .from("scraping_sources")
        .select("*")
        .eq("is_active", true);

      if (targetCategory !== "All") {
        sourceQuery = sourceQuery.eq("category", targetCategory);
      }
      if (targetCountry !== "All") {
        sourceQuery = sourceQuery.eq("country", targetCountry);
      }

      const { data: sources, error: sourceError } = await sourceQuery;

      if (sourceError) {
        await sendLog(`❌ [DB Error] Failed to fetch sources: ${sourceError.message}`);
        return;
      }

      if (!sources || sources.length === 0) {
        await sendLog(`⚠️ No active sources found for (Category: "${targetCategory}", Country: "${targetCountry}"). Exiting pipeline.`);
        return;
      }

      await sendLog(`✅ Found ${sources.length} active source(s).`);

      const parser = new Parser({
        timeout: 3000,
        headers: {
          'User-Agent': BROWSER_HEADERS['User-Agent'],
          'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8'
        }
      });

      await sendLog(`[Discovery] Fetching candidates from ${sources.length} source(s) in parallel...`);

      // 2. Parallel Source Discovery (Fast parallel fetch ~2-3s total)
      const sourcePromises = sources.map(async (source) => {
        let feedCandidates: CandidateItem[] = [];

        try {
          let feedUrl = source.url;
          let feed: any = null;

          try {
            feed = await fetchWithTimeout(
              parser.parseURL(feedUrl),
              3500,
              `Direct RSS Feed timed out`
            );
          } catch (directErr) {
            // Attempt Smart RSS Discovery (Checks <head> link[rel="alternate"] & common paths)
            try {
              const discovered = await discoverRssFeed(source.url);
              if (discovered) {
                feedUrl = discovered;
                feed = await fetchWithTimeout(
                  parser.parseURL(feedUrl),
                  3500,
                  `Discovered RSS Feed timed out`
                );
                await sendLog(`  ├─ 🔍 [${source.name}] Smart RSS Discovered: ${discovered}`);
              }
            } catch (discErr) { }
          }

          if (feed && feed.items && feed.items.length > 0) {
            const topItems = feed.items.slice(0, 30);
            for (const item of topItems) {
              const itemTitle = typeof item.title === 'string'
                ? item.title.trim()
                : (item.title as any)?._ || (item.title as any)?.value || (item.title ? String(item.title) : '');

              // Image extraction from enclosure or media tags
              let imgUrl: string | null = null;
              if (item.enclosure?.url && typeof item.enclosure.url === 'string') {
                imgUrl = item.enclosure.url;
              } else if ((item as any)['media:content']?.$?.url) {
                imgUrl = (item as any)['media:content'].$.url;
              } else if ((item as any)['media:thumbnail']?.$?.url) {
                imgUrl = (item as any)['media:thumbnail'].$.url;
              }

              // Description extraction
              const itemDesc = item.contentSnippet || item.summary || item.content || (item as any)['content:encoded'] || '';
              const cleanDesc = typeof itemDesc === 'string'
                ? itemDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                : '';

              if (item.link && itemTitle) {
                feedCandidates.push({
                  url: item.link,
                  title: itemTitle,
                  sourceName: source.name,
                  category: source.category || "General",
                  country: source.country || "BD",
                  description: cleanDesc.slice(0, 800),
                  imageUrl: imgUrl,
                  pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
                });
              }
            }
            await sendLog(`  ├─ ✅ [${source.name}] RSS OK: Found ${feedCandidates.length} articles.`);
          } else {
            throw new Error("No RSS items found");
          }
        } catch (rssErr: any) {
          try {
            const extractedCandidates = await extractCandidatesFromHtmlOrJina(source.url, source.name, source.category || "General");
            feedCandidates = extractedCandidates.map(c => ({
              ...c,
              country: source.country || "BD",
              pubDate: new Date().toISOString(),
            }));
            await sendLog(`  ├─ ⚡ [${source.name}] Jina Proxy OK: Discovered ${feedCandidates.length} articles.`);
          } catch (fallbackErr: any) {
            await sendLog(`  ├─ ⚠️ [${source.name}] Skipped: ${fallbackErr.message}`);
          }
        }
        return feedCandidates;
      });

      const resultsArray = await Promise.all(sourcePromises);
      const rawCandidates = resultsArray.flat();

      if (rawCandidates.length === 0) {
        await sendLog("⚠️ No articles found across active sources. Exiting pipeline.");
        return;
      }

      await sendLog(`✅ Total ${rawCandidates.length} candidate(s) discovered across all sources.`);

      // 3. Batch Deduplication (Single DB Query)
      const candidateUrls = Array.from(new Set(rawCandidates.map((c) => c.url)));
      let newCandidates: typeof rawCandidates = [];

      try {
        const { data: existingRows } = await supabase
          .from("news_articles")
          .select("original_url")
          .in("original_url", candidateUrls);

        const existingSet = new Set(existingRows?.map((r: any) => r.original_url) || []);
        const seen = new Set<string>();

        newCandidates = rawCandidates.filter((item) => {
          if (!existingSet.has(item.url) && !seen.has(item.url)) {
            seen.add(item.url);
            return true;
          }
          return false;
        });
      } catch (e: any) {
        await sendLog(`  ⚠️ Deduplication query warning: ${e.message}. Proceeding with all candidates.`);
        newCandidates = rawCandidates;
      }

      await sendLog(`Deduplication complete: ${newCandidates.length} new article(s) to process (${rawCandidates.length - newCandidates.length} already in DB).`);

      if (newCandidates.length === 0) {
        await sendLog("All discovered articles already exist in Database. Nothing new to ingest.");
        return;
      }

      // If Country is "All", interleave candidates across ALL countries (BD, GLOBAL, UK, SA) so all regions are proportionally scraped
      if (targetCountry === "All") {
        const countryGroups: Record<string, typeof newCandidates> = {};
        for (const c of newCandidates) {
          const cCode = (c.country || "BD").toUpperCase();
          if (!countryGroups[cCode]) countryGroups[cCode] = [];
          countryGroups[cCode].push(c);
        }

        const distinctCountries = Object.keys(countryGroups);
        if (distinctCountries.length > 1) {
          const balancedList: typeof newCandidates = [];
          const maxCount = Math.max(...distinctCountries.map((k) => countryGroups[k].length));
          for (let i = 0; i < maxCount; i++) {
            for (const cCode of distinctCountries) {
              if (i < countryGroups[cCode].length) {
                balancedList.push(countryGroups[cCode][i]);
              }
            }
          }
          newCandidates = balancedList;
          const summary = distinctCountries.map((k) => `${countryGroups[k].length} ${k}`).join(" + ");
          await sendLog(`  ⚖️ Balanced candidate pool: Round-robin interleaved across all countries (${summary}).`);
        }
      }

      // 4. AI Title Batch Pre-Filtering & Halal Gatekeeper (Dual-Track Split)
      let selectedTopArticles: typeof rawCandidates = [];
      let acceptedStreamArticles: typeof rawCandidates = [];
      let candidateQueue: typeof newCandidates = [];

      if (newCandidates.length === 0) {
        await sendLog(`No new candidate articles found from source(s).`);
      } else {
        await sendLog(`Sending ${newCandidates.length} candidate titles to Gemini Halal Gatekeeper & Priority Evaluator...`);

        // Evaluate all candidates in pool (up to 70 candidates)
        const poolSize = Math.min(newCandidates.length, 70);
        const titlesList = newCandidates
          .slice(0, poolSize)
          .map((c, i) => `${i + 1}. [${c.sourceName}] Title: "${c.title}" | Category: ${c.category}`)
          .join("\n");

        const prompt = `You are the chief editorial evaluator of KahfNews, an ethical, family-friendly, and Halal-conscious multilingual news platform (Bengali, English, Arabic).
Evaluate these candidate headlines:
${titlesList}

CRITERIA:
1. REJECT:
   - Harām & Inappropriate content: revealing or provocative clothing controversy, celebrity glamour/photoshoot gossip, intimate or scandalous affairs, vulgarity, alcohol, nightlife, gambling/casinos, explicit immorality.
   - Irrelevant non-news: website navigation menus, section headers (e.g. "Skip to main content", "Books and Literature", "Accidents and Fires"), image captions/alt-texts, advertising.
2. ACCEPT:
   - Real, authentic news: national and international politics, governance, law/courts/investigations, economy, education, science & technology, healthy sports, culture, climate, and verified events across Bengali, English, and Arabic.
3. IMPORTANCE SCORE (1-100):
   - 80-100: Top breaking national/world news, major policy, prime headlines.
   - 45-79: Standard news reports, sports, business, technology.
   - 10-44: Minor local events.

Return valid JSON:
{
  "approved": [
    { "index": <1-indexed number>, "importance": <Integer 1-100> }
  ],
  "rejected_indices": [<1-indexed numbers>]
}`;

        let approvedItems: Array<{ index: number; importance: number }> = [];
        const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        const keysToTry = activeKeys.slice(0, 2);

        for (const modelName of modelsToTry) {
          if (approvedItems.length > 0) break;
          for (const apiKey of keysToTry) {
            if (!apiKey) continue;
            try {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
              });

              const res = await fetchWithTimeout(
                model.generateContent(prompt),
                7000,
                "Gemini AI Pre-Filter timed out"
              );

              const parsed = JSON.parse(res.response.text());
              if (parsed && Array.isArray(parsed.approved) && parsed.approved.length > 0) {
                approvedItems = parsed.approved;
                break;
              } else if (Array.isArray(parsed) && parsed.length > 0) {
                approvedItems = parsed.map((idx: any, i: number) => ({
                  index: typeof idx === 'number' ? idx : idx.index || (i + 1),
                  importance: 75 - (i * 2),
                }));
                break;
              }
            } catch (e: any) { }
          }
        }

        candidateQueue = [];
        if (approvedItems.length > 0) {
          approvedItems.sort((a, b) => (b.importance || 50) - (a.importance || 50));

          candidateQueue = approvedItems
            .map((item) => {
              const cand = newCandidates[item.index - 1];
              if (cand) {
                return { ...cand, importance: item.importance || 50 };
              }
              return null;
            })
            .filter(Boolean) as typeof newCandidates;

          // If Country is "All", round-robin interleave the approved candidates by country so every country is ingested
          if (targetCountry === "All" && candidateQueue.length > 1) {
            const approvedByCountry: Record<string, typeof candidateQueue> = {};
            for (const c of candidateQueue) {
              const cCode = (c.country || "BD").toUpperCase();
              if (!approvedByCountry[cCode]) approvedByCountry[cCode] = [];
              approvedByCountry[cCode].push(c);
            }
            const activeCountries = Object.keys(approvedByCountry);
            if (activeCountries.length > 1) {
              const reordered: typeof candidateQueue = [];
              const maxC = Math.max(...activeCountries.map((k) => approvedByCountry[k].length));
              for (let i = 0; i < maxC; i++) {
                for (const cCode of activeCountries) {
                  if (i < approvedByCountry[cCode].length) {
                    reordered.push(approvedByCountry[cCode][i]);
                  }
                }
              }
              candidateQueue = reordered;
              const reorderSummary = activeCountries.map((k) => `${approvedByCountry[k].length} ${k}`).join(", ");
              await sendLog(`  ⚖️ Ingestion Queue Reordered: Multi-country round-robin distribution (${reorderSummary}).`);
            }
          }

          await sendLog(`✅ Gemini Halal Gatekeeper: ${candidateQueue.length} approved candidate(s) queued for ingestion.`);
        } else {
          // Fallback if Gemini evaluator failed: filter out obvious vulgar keywords
          const vulgarKeywords = ["পোশাক", "বোল্ড", "উষ্ণ", "খোলামেলা", "বিকিনি", "cleavage", "revealing", "bikini", "lingerie", "swimsuit"];
          candidateQueue = newCandidates.filter(c => !vulgarKeywords.some(kw => c.title.toLowerCase().includes(kw)));
          await sendLog(`Proceeding with safe fallback candidate queue: ${candidateQueue.length} candidate(s).`);
        }
      }

      // 5. Ingestion Loop: Iterate through candidates one by one until targetLimit is reached
      let totalSuccessful = 0;
      let queueIndex = 0;
      const targetGoal = targetLimit;

      await sendLog(`🎯 Target Ingestion Goal: Exactly ${targetGoal} top priority article(s). Processing ranked candidates one-by-one until goal is reached...`);

      while (totalSuccessful < targetGoal && queueIndex < candidateQueue.length) {
        const candidate = candidateQueue[queueIndex];
        queueIndex++;

        await sendLog(`\n[Queue #${queueIndex} | Completed: ${totalSuccessful}/${targetGoal}] Evaluating: "${candidate.title.slice(0, 55)}..." (Score: ${candidate.importance || 50})`);

        // 5a. Universal Article Extraction (Jina-First)
        await sendLog(`  ├─ Extracting content via Jina-First Extractor...`);
        let extracted;
        try {
          extracted = await extractArticleContent(candidate.url, candidate.title);
          if (!extracted || !extracted.bodyText || extracted.bodyText.length < 120) {
            await sendLog(`  └─ ⚠️ Extracted content too short or empty (${extracted?.bodyText?.length || 0} chars). Advancing to next candidate in queue...`);
            continue;
          }
          await sendLog(`  ├─ Extracted body (${extracted.bodyText.length} chars) via [${extracted.extractionMethod}]`);
        } catch (extErr: any) {
          await sendLog(`  └─ ⚠️ Extraction failed: ${extErr.message}. Advancing to next candidate in queue...`);
          continue;
        }

        // 5b. Unified Gemini Processing: Exact Full News + Strict 4-5 Line Summary + Importance Score + Halal Gatekeeper
        await sendLog(`  ├─ Running Unified AI News Synthesis with Gemini (Primary: gemini-3.6-flash)...`);

        const candidateCountry = (candidate.country || targetCountry || "BD").toUpperCase();
        const targetLang = candidateCountry === "SA"
          ? "Arabic"
          : (candidateCountry === "GLOBAL" || candidateCountry === "UK")
            ? "English"
            : "Bengali";

        const prompt = `You are a chief news editor and professional journalist for KahfNews, an ethical, family-friendly, and Halal-conscious news platform.
Analyze the raw news content below and return a strictly valid JSON object in ${targetLang}.

Input Headline: ${candidate.title}
Source Name: ${candidate.sourceName}
Region/Country: ${candidateCountry}
Target Language: ${targetLang}
Category Hint: ${candidate.category || "General"}

Raw Article Content:
${extracted.bodyText.slice(0, 16000)}

STRICT EDITORIAL & FORMATTING RULES:
1. "clean_headline":
   - Clear, impactful, accurate journalistic headline in ${targetLang}.
   - Do NOT enclose in quotation marks.
   - Do NOT include labels like "Title:" or source suffixes like "- Prothom Alo".

2. "ai_summary":
   - STRICT LENGTH: Exactly 4 to 5 complete, informative narrative sentences in ${targetLang}.
   - NEVER output a 1-line or single-sentence summary.
   - NEVER exceed 5 sentences.
   - Cover: (1) Main event/incident, (2) Key context & involved parties, (3) Concrete facts/figures/quotes, (4) Present status or outcome.
   - Do NOT use bullet points, asterisks, or numbered lists.
   - Do NOT write labels like "Summary:", "সারসংক্ষেপ:", "সংক্ষেপ:". Output only the 4-5 sentences.

3. "clean_content":
   - The COMPLETE, UNABRIDGED FULL ARTICLE BODY in clean ${targetLang} paragraphs.
   - CRITICAL: DO NOT SUMMARIZE OR SHORTEN THIS. Keep EVERY single paragraph, direct quote, and background detail from the raw article intact.
   - CRITICAL NEGATIVE CONSTRAINTS:
     * DO NOT prepend or include the "ai_summary" inside "clean_content".
     * DO NOT include "Title:", "URL Source:", "Source:", "Author:", or "Published Time:".
     * DO NOT include raw HTML tags (<p>, <div>, <span>, <a>) or RSS tags (<![CDATA[...]]>, <item>).
     * DO NOT include markdown links like [text](url) — keep only the plain text.
     * Separate paragraphs cleanly with double newlines (\\n\\n).

4. "is_halal_and_family_friendly":
   - Boolean: true if ethical, authentic news; false if it promotes or focuses on vulgar celebrity glamour/photoshoots, revealing/provocative clothing, sexual scandals, casinos, alcohol, or explicit immorality.

5. "rejection_reason":
   - If "is_halal_and_family_friendly" is false, provide a short 1-sentence reason. Otherwise empty string "".

6. "importance_score":
   - Integer from 1 to 100 representing news priority.

7. "detected_category":
   - One of: Politics, Economy, Technology, Sports, Entertainment, World, Bangladesh, Lifestyle, General.

YOUR RESPONSE MUST STRICTLY BE A VALID JSON OBJECT WITH THESE KEYS ONLY.`;

        let aiResult: any = null;
        const synthesisModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        const synthesisKeys = activeKeys.slice(0, 2);

        for (const modelName of synthesisModels) {
          if (aiResult && aiResult.clean_headline) break;
          for (const apiKey of synthesisKeys) {
            if (!apiKey) continue;
            try {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
              });

              const res = await fetchWithTimeout(
                model.generateContent(prompt),
                12000,
                "Gemini Content Processing timed out"
              );

              aiResult = JSON.parse(res.response.text());
              if (aiResult && aiResult.clean_headline) {
                await sendLog(`  ├─ ✅ Gemini AI (${modelName}) Synthesized Clean Full News & 4-5 Line Summary!`);
                break;
              }
            } catch (aiErr: any) { }
          }
        }

        // Check Halal & Family-Friendly Filter
        if (aiResult && aiResult.is_halal_and_family_friendly === false) {
          await sendLog(`  └─ 🛡️ [Halal Filter] Skipped inappropriate story: "${candidate.title.slice(0, 45)}..." (${aiResult.rejection_reason || "Violates ethical guidelines"}). Advancing to next candidate in queue...`);
          continue;
        }

        // Guaranteed Fallback: Never discard extracted news!
        if (!aiResult || !aiResult.clean_headline) {
          await sendLog(`  ├─ ℹ️ Using Clean Extracted Content & Fallback Summary...`);
          aiResult = {
            importance_score: candidate.importance || 60,
            clean_headline: candidate.title,
            clean_content: extracted.bodyText,
            ai_summary: extracted.bodyText.slice(0, 350) + "...",
            detected_category: candidate.category || "General",
          };
        }

        const isGeminiShortened = aiResult?.clean_content && extracted.bodyText.length > 500 && (aiResult.clean_content.length < extracted.bodyText.length * 0.55);
        const rawBodyCandidate = (!isGeminiShortened && aiResult?.clean_content && aiResult.clean_content.length >= 150)
          ? aiResult.clean_content
          : extracted.bodyText;

        const sanitizedHeadline = (aiResult.clean_headline || candidate.title)
          .replace(/^(Title|Headline):\s*/i, '')
          .replace(/^#+\s*/, '')
          .replace(/[*_#`[\]]/g, '')
          .trim();
        const sanitizedContent = sanitizeArticleContent(rawBodyCandidate);
        const sanitizedSummary = sanitizeSummary(aiResult.ai_summary || "");

        await sendLog(`  ├─ ✅ Sanitized Content Ready: "${sanitizedHeadline.slice(0, 45)}..." (Full Body: ${sanitizedContent.length} chars, Summary: ${sanitizedSummary.length} chars)`);

        // 5c. Save to Database
        let insertedArticleId: string | null = null;
        const articleCountry = (candidate as any).country || (targetCountry !== "All" ? targetCountry : "BD");
        const insertPayload: any = {
          headline: sanitizedHeadline,
          raw_content: sanitizedContent,
          ai_summary: sanitizedSummary,
          status: autoApp ? "published" : "draft",
          original_url: candidate.url,
          source: candidate.sourceName || "Web",
          category: aiResult.detected_category || candidate.category || "General",
          country: articleCountry,
          image_url: extracted.ogImage || null,
          published_at: candidate.pubDate ? new Date(candidate.pubDate).toISOString() : new Date().toISOString(),
          importance_score: aiResult.importance_score || candidate.importance || 50,
        };

        try {
          const { data: insertedData, error: dbError } = await supabase
            .from("news_articles")
            .insert(insertPayload)
            .select("id")
            .single();

          if (dbError) {
            const { data: fbData, error: fbErr } = await supabase
              .from("news_articles")
              .insert(insertPayload)
              .select("id")
              .single();
            if (fbErr) throw fbErr;
            if (fbData) insertedArticleId = fbData.id;
          } else if (insertedData) {
            insertedArticleId = insertedData.id;
          }

          totalSuccessful++;
          await sendLog(`  ├─ ✅ Successfully Saved [${totalSuccessful}/${targetGoal}] to DB! (Status: ${autoApp ? "published" : "draft"}, Country: ${articleCountry})`);
        } catch (dbErr: any) {
          await sendLog(`  └─ [Database Error]: ${dbErr.message}. Advancing to next candidate in queue...`);
          continue;
        }

        // 5d. Country-Specific Audio TTS Generation (BD only)
        const isBanglaArticle = articleCountry === "BD";
        if (isBanglaArticle && activeKeys.length > 0 && insertedArticleId) {
          await sendLog(`  ├─ Generating Bengali Audio TTS (Gemini 3.1 Flash)...`);
          try {
            const textToSpeak = (sanitizedSummary || sanitizedHeadline)
              .replace(/[*_#`[\]()]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            const wavBuffer = await fetchWithTimeout(
              generateSeamlessGeminiAudio(textToSpeak, "bn", activeKeys, async (msg) => {
                await sendLog(`  │  ${msg}`);
              }),
              75000,
              "TTS Generation timed out"
            );

            const publicId = `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const audioUrl = await uploadAudioToCloudinary(wavBuffer, publicId);

            if (audioUrl) {
              await supabase
                .from("news_articles")
                .update({ audio_bn_summary: audioUrl })
                .eq("id", insertedArticleId);
              await sendLog(`  └─ ✅ Audio TTS Uploaded to Cloudinary successfully!`);
            }
          } catch (audioErr: any) {
            await sendLog(`  └─ ⚠️ Audio TTS Skipped: ${audioErr.message}`);
          }
        } else if (!isBanglaArticle) {
          await sendLog(`  └─ ⚡ [Audio Strategy] ${articleCountry} news queued for Device Native WebSpeech playback (Gemini quota preserved).`);
        }
      }

      // Track 2: Allocate any remaining approved candidates from queueIndex onward to Live RSS Stream
      acceptedStreamArticles = candidateQueue.slice(queueIndex);

      // 6. Track 2: Bulk Live Stream Articles Ingestion (Zero Gemini API Quota Consumed!)
      if (acceptedStreamArticles.length > 0) {
        await sendLog(`\n[Live Stream Ingest] Preserving ${acceptedStreamArticles.length} Halal-approved RSS articles into Live Stream...`);

        // Enrich any missing thumbnails using Kahf-Browser-style 768KB head-only fetch
        try {
          await sendLog(`  ├─ Checking thumbnails via lightweight head truncation (768KB)...`);
          await enrichRssItemsWithOgImage(acceptedStreamArticles, 5);
        } catch (enrichErr: any) {
          await sendLog(`  ├─ ⚠️ Thumbnail enrichment warning: ${enrichErr.message}`);
        }

        let streamSavedCount = 0;
        const bulkRows = acceptedStreamArticles.map((item) => ({
          headline: item.title,
          raw_content: item.description || item.title,
          ai_summary: null, // As requested: no AI summary for raw RSS news
          status: autoApp ? "published" : "draft",
          original_url: item.url,
          source: item.sourceName || "Web",
          category: item.category || "General",
          country: item.country || (targetCountry !== "All" ? targetCountry : "BD"),
          image_url: item.imageUrl || null,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          importance_score: (item as any).importance || 25,
          admin_id: null,
        }));

        // Batch insert in chunks of 25 to be database friendly
        for (let i = 0; i < bulkRows.length; i += 25) {
          const chunk = bulkRows.slice(i, i + 25);
          try {
            const { error: insertErr } = await supabase.from("news_articles").insert(chunk);
            if (!insertErr) {
              streamSavedCount += chunk.length;
            } else {
              // Fallback to individual insert if batch encountered duplicate/error
              for (const row of chunk) {
                try {
                  const { error: rowErr } = await supabase.from("news_articles").insert(row);
                  if (!rowErr) streamSavedCount++;
                } catch (e) { }
              }
            }
          } catch (chunkErr) { }
        }

        totalSuccessful += streamSavedCount;
        await sendLog(`  ├─ ✅ Preserved ${streamSavedCount} Live Stream articles in Database (0 Gemini tokens consumed)!`);
      }

      await sendLog(`\n🎉 Pipeline Completed! Successfully scraped, synthesized & saved ${totalSuccessful} new article(s).`);
    } catch (err: any) {
      await sendLog(`❌ [CRITICAL ERROR]: ${err.message}`);
    } finally {
      try {
        await writer.close();
      } catch (e) { }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
