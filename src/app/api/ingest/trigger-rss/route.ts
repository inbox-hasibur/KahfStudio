import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { extractArticleContent } from "@/lib/scraper/universal-extractor";
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
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(fallbackErrMsg)), timeoutMs)
    )
  ]);
}

// Jina-First / HTML Link Extractor when RSS feed is invalid or blocked by Cloudflare/Datacenter IP
async function extractCandidatesFromHtmlOrJina(sourceUrl: string, sourceName: string, category: string): Promise<Array<{ url: string; title: string; sourceName: string; category: string }>> {
  const results: Array<{ url: string; title: string; sourceName: string; category: string }> = [];
  const seenUrls = new Set<string>();

  let targetUrl = sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.pathname.includes('feed') || parsed.pathname.includes('rss') || parsed.pathname.includes('api')) {
      targetUrl = parsed.origin;
    }
  } catch (e) {}

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
    const linkRegex = /\[([^\]]{18,120})\]\((https?:\/\/[^\s\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(markdown)) !== null && results.length < 12) {
      const title = match[1].replace(/[*_#`[\]()]/g, '').trim();
      const link = match[2].trim();
      try {
        const host = new URL(link).hostname;
        const targetHost = new URL(targetUrl).hostname;
        if (host.includes(targetHost.replace('www.', '')) && !seenUrls.has(link) && !link.includes('/tag/') && !link.includes('/category/')) {
          seenUrls.add(link);
          results.push({ url: link, title, sourceName, category });
        }
      } catch (e) {}
    }
    if (results.length > 0) return results;
  } catch (jinaErr) {}

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
        if (text.length >= 18 && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            let fullUrl = href;
            if (!href.startsWith('http')) {
              const base = new URL(targetUrl).origin;
              fullUrl = `${base}${href.startsWith('/') ? '' : '/'}${href}`;
            }
            const host = new URL(fullUrl).hostname;
            const targetHost = new URL(targetUrl).hostname;
            if (host.includes(targetHost.replace('www.', '')) && !seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              results.push({ url: fullUrl, title: text, sourceName, category });
            }
          } catch (e) {}
        }
      });
      if (results.length > 0) return results;
    }
  } catch (directErr) {}

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
    } catch (e) {}
  };

  (async () => {
    try {
      // 1. Send immediate keepalive ping to flush serverless proxy buffer
      try {
        await writer.write(encoder.encode(`: ping\n\n`));
      } catch (e) {}

      await sendLog("🚀 Pipeline Connected. Initializing scraping sources...");

      const searchParams = req.nextUrl?.searchParams || new URL(req.url, 'http://localhost').searchParams;
      const targetLimit = parseInt(searchParams.get('limit') || '5', 10);
      const targetCategory = searchParams.get('category') || 'All';

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        await sendLog("❌ [CRITICAL ERROR] Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
        return;
      }

      const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
      await sendLog(`[Database Step 1] Connecting to Supabase instance (${supabaseHost})...`);
      const supabase = createClient(supabaseUrl, supabaseKey);

      await sendLog(`[Database Step 2] Querying active scraping sources (Category: "${targetCategory}")...`);
      let sourceQuery = supabase
        .from("scraping_sources")
        .select("*")
        .eq("is_active", true);

      if (targetCategory !== "All") {
        sourceQuery = sourceQuery.eq("category", targetCategory);
      }

      const { data: sources, error: sourceError } = await sourceQuery;

      if (sourceError) {
        await sendLog(`❌ [DB Error] Failed to fetch sources: ${sourceError.message}`);
        return;
      }

      if (!sources || sources.length === 0) {
        await sendLog(`⚠️ No active sources found for category "${targetCategory}". Exiting pipeline.`);
        return;
      }

      await sendLog(`✅ Found ${sources.length} active source(s).`);

      // Fetch System Settings & API keys
      const { data: sysData } = await supabase.from("system_settings").select("setting_key, setting_value");
      let autoApp = true;
      let keys: string[] = [];

      if (sysData) {
        const autoSetting = sysData.find((s) => s.setting_key === "auto_approve_news");
        const keysSetting = sysData.find((s) => s.setting_key === "global_gemini_api_keys");
        if (autoSetting) autoApp = autoSetting.setting_value === "true";
        if (keysSetting) {
          try {
            const parsed = JSON.parse(keysSetting.setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) keys = parsed;
          } catch (e) {}
        }
      }
      const activeKeys = (keys && keys.length > 0) ? keys : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
      await sendLog(`Config: Auto-Approve = ${autoApp ? "ON (published)" : "OFF (draft)"} | Gemini API Keys: ${activeKeys.length}`);

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
        let feedCandidates: Array<{ url: string; title: string; sourceName: string; category: string }> = [];

        try {
          const feed = await fetchWithTimeout(
            parser.parseURL(source.url),
            3000,
            `RSS Feed timed out`
          );

          const topItems = feed.items ? feed.items.slice(0, 15) : [];
          for (const item of topItems) {
            const itemTitle = typeof item.title === 'string'
              ? item.title.trim()
              : (item.title as any)?._ || (item.title as any)?.value || (item.title ? String(item.title) : '');

            if (item.link && itemTitle) {
              feedCandidates.push({
                url: item.link,
                title: itemTitle,
                sourceName: source.name,
                category: source.category || "General",
              });
            }
          }
          await sendLog(`  ├─ ✅ [${source.name}] RSS OK: Found ${feedCandidates.length} articles.`);
        } catch (rssErr: any) {
          try {
            feedCandidates = await extractCandidatesFromHtmlOrJina(source.url, source.name, source.category || "General");
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

      // 4. AI Title Batch Pre-Filtering
      let selectedArticles: typeof rawCandidates = [];

      if (newCandidates.length <= targetLimit) {
        selectedArticles = newCandidates;
        await sendLog(`Processing all ${selectedArticles.length} candidate(s) directly.`);
      } else {
        await sendLog(`Sending candidate titles to Gemini Evaluator to select TOP ${targetLimit}...`);

        const titlesList = newCandidates
          .slice(0, 25)
          .map((c, i) => `${i + 1}. Title: "${c.title}" | Category: ${c.category} | Source: ${c.sourceName}`)
          .join("\n");

        const prompt = `You are a chief news editor. Evaluate these news candidates and select the TOP ${targetLimit} most important news stories:
${titlesList}

Return a valid JSON array of chosen numbers (1-indexed), for example: [1, 3, 5]`;

        let selectedIndices: number[] = [];
        const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        const keysToTry = activeKeys.slice(0, 3);

        for (const modelName of modelsToTry) {
          let modelNotFound = false;
          for (const apiKey of keysToTry) {
            if (!apiKey || modelNotFound) continue;
            try {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
              });

              const res = await fetchWithTimeout(
                model.generateContent(prompt),
                5000,
                "Gemini AI Pre-Filter timed out"
              );

              const parsed = JSON.parse(res.response.text());
              if (Array.isArray(parsed) && parsed.length > 0) {
                selectedIndices = parsed;
                break;
              }
            } catch (e: any) {
              if (e.message?.includes("404") || e.message?.includes("not found")) {
                modelNotFound = true;
              }
            }
          }
          if (selectedIndices.length > 0) break;
        }

        if (selectedIndices.length > 0) {
          selectedArticles = selectedIndices
            .map((idx) => newCandidates[idx - 1])
            .filter(Boolean)
            .slice(0, targetLimit);
          await sendLog(`✅ Gemini Evaluator (${modelsToTry[0]}) selected ${selectedArticles.length} top priority article(s).`);
        } else {
          selectedArticles = newCandidates.slice(0, targetLimit);
          await sendLog(`Proceeding with top ${selectedArticles.length} candidate(s).`);
        }
      }

      // 5. Ingestion Loop for each selected article
      let totalSuccessful = 0;

      for (let i = 0; i < selectedArticles.length; i++) {
        const candidate = selectedArticles[i];
        await sendLog(`\n[Article ${i + 1}/${selectedArticles.length}] Processing: "${candidate.title.slice(0, 50)}..."`);

        // 5a. Universal Article Extraction (Jina-First)
        await sendLog(`  ├─ Extracting content via Jina-First Extractor...`);
        let extracted;
        try {
          extracted = await extractArticleContent(candidate.url, candidate.title);
          await sendLog(`  ├─ Extracted body (${extracted.bodyText.length} chars) via [${extracted.extractionMethod}]`);
        } catch (extErr: any) {
          await sendLog(`  └─ ❌ Extraction failed: ${extErr.message}. Skipping article.`);
          continue;
        }

        // 5b. Unified Gemini Processing: Summary + Clean Markdown + Importance Score
        await sendLog(`  ├─ Running Unified AI News Synthesis with Gemini (Primary: gemini-3.6-flash)...`);

        const prompt = `You are a chief news editor and journalist for a premium multimedia news platform.
Analyze the following article and return a strictly valid JSON object.

Input Title: ${candidate.title}
Source: ${candidate.sourceName}
Country: BD
Category Hint: ${candidate.category || "General"}
Cleaned Article Body:
${extracted.bodyText.slice(0, 10000)}

Your response MUST follow this exact JSON schema:
{
  "importance_score": <Integer from 1 to 100>,
  "clean_headline": "<Clean, engaging Bengali headline>",
  "clean_content": "<COMPLETE FULL UNABRIDGED BENGALI ARTICLE BODY in clean markdown>",
  "ai_summary": "<A SHORT 2-paragraph Bengali summary with 3 key takeaway bullet points at the end>",
  "detected_category": "<One of: Politics, Economy, Technology, Sports, Entertainment, World, Bangladesh, Lifestyle, General>"
}`;

        let aiResult: any = null;
        const synthesisModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        const synthesisKeys = activeKeys.slice(0, 3);

        for (const modelName of synthesisModels) {
          let modelNotFound = false;
          for (const apiKey of synthesisKeys) {
            if (!apiKey || modelNotFound) continue;
            try {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
              });

              const res = await fetchWithTimeout(
                model.generateContent(prompt),
                10000,
                "Gemini Content Processing timed out"
              );

              aiResult = JSON.parse(res.response.text());
              if (aiResult && aiResult.clean_headline) break;
            } catch (aiErr: any) {
              if (aiErr.message?.includes("404") || aiErr.message?.includes("not found")) {
                modelNotFound = true;
              }
            }
          }
          if (aiResult) break;
        }

        if (!aiResult) {
          await sendLog(`  └─ ❌ Gemini Synthesis failed. Skipping article.`);
          continue;
        }

        await sendLog(`  ├─ ✅ AI Synthesis Done: Score: ${aiResult.importance_score || 50}/100 | Cat: ${aiResult.detected_category}`);

        // 5c. Save to Database
        let insertedArticleId: string | null = null;
        const insertPayload: any = {
          headline: aiResult.clean_headline || candidate.title,
          raw_content: aiResult.clean_content || extracted.bodyText,
          ai_summary: aiResult.ai_summary,
          status: autoApp ? "published" : "draft",
          original_url: candidate.url,
          source: candidate.sourceName || "Web",
          category: aiResult.detected_category || candidate.category || "General",
          image_url: extracted.ogImage || null,
          published_at: new Date().toISOString(),
        };

        try {
          const { data: insertedData, error: dbError } = await supabase
            .from("news_articles")
            .insert({
              ...insertPayload,
              importance_score: aiResult.importance_score || 50,
              country: "BD",
            })
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
          await sendLog(`  ├─ ✅ Saved to DB! (Status: ${autoApp ? "published" : "draft"}, Has Image: ${!!extracted.ogImage})`);
        } catch (dbErr: any) {
          await sendLog(`  └─ [Database Error]: ${dbErr.message}`);
          continue;
        }

        // 5d. Non-Blocking Audio TTS Generation
        if (activeKeys.length > 0 && insertedArticleId) {
          await sendLog(`  ├─ Generating Bengali Audio TTS...`);
          try {
            const textToSpeak = (aiResult.ai_summary || aiResult.clean_headline)
              .replace(/[*_#`[\]()]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            const wavBuffer = await fetchWithTimeout(
              generateSeamlessGeminiAudio(textToSpeak, "bn", activeKeys),
              12000,
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
        }
      }

      await sendLog(`\n🎉 Pipeline Completed! Successfully scraped, synthesized & saved ${totalSuccessful} new article(s).`);
    } catch (err: any) {
      await sendLog(`❌ [CRITICAL ERROR]: ${err.message}`);
    } finally {
      try {
        await writer.close();
      } catch (e) {}
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
