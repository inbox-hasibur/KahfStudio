import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { extractArticleContent } from "@/lib/scraper/universal-extractor";
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from "@/lib/audio/gemini-tts";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 300; // 5 minutes max timeout
export const dynamic = 'force-dynamic';

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

  // Determine base target URL (if feed url gives 404, try root origin)
  let targetUrl = sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.pathname.includes('feed') || parsed.pathname.includes('rss') || parsed.pathname.includes('api')) {
      targetUrl = parsed.origin;
    }
  } catch (e) {}

  // 1. Tier 1 (Primary): Jina Reader Proxy (Bypasses Cloudflare & Datacenter IP Blocks)
  try {
    const jinaRes = await axios.get(`https://r.jina.ai/${targetUrl}`, {
      timeout: 6000,
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
  } catch (jinaErr) {
    // Continue to Direct HTML fallback
  }

  // 2. Tier 2 (Fallback): Direct HTML extraction with Cheerio (Strict 3.5s timeout)
  try {
    const res = await axios.get(targetUrl, {
      timeout: 3500,
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
  } catch (directErr) {
    // Both failed
  }

  return results;
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (msg: string) => {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: `[${timeStr}] ${msg}` })}\n\n`));
        } catch (e) {}
      };

      // 1. Send immediate handshake & keepalive ping to flush serverless proxy buffer
      try {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      } catch (e) {}

      sendLog("🚀 Pipeline Connected. Initializing scraping sources...");

      try {
        const url = new URL(req.url);
        const targetLimit = parseInt(url.searchParams.get('limit') || '5', 10);
        const targetCategory = url.searchParams.get('category') || 'All';

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          sendLog("❌ [CRITICAL ERROR] Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
          controller.close();
          return;
        }

        const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
        sendLog(`[Database Step 1] Connecting to Supabase instance (${supabaseHost})...`);
        const supabase = createClient(supabaseUrl, supabaseKey);

        sendLog(`[Database Step 2] Querying active scraping sources (Category: "${targetCategory}")...`);
        let sourceQuery = supabase
          .from("scraping_sources")
          .select("*")
          .eq("is_active", true);

        if (targetCategory !== "All") {
          sourceQuery = sourceQuery.eq("category", targetCategory);
        }

        const { data: sources, error: sourceError } = await sourceQuery;

        if (sourceError) {
          sendLog(`❌ [DB Error] Failed to fetch sources: ${sourceError.message}`);
          controller.close();
          return;
        }

        if (!sources || sources.length === 0) {
          sendLog(`⚠️ No active sources found for category "${targetCategory}". Exiting pipeline.`);
          controller.close();
          return;
        }

        sendLog(`✅ Found ${sources.length} active source(s).`);

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
        sendLog(`Config: Auto-Approve = ${autoApp ? "ON (published)" : "OFF (draft)"} | Gemini API Keys: ${activeKeys.length}`);

        const parser = new Parser({
          timeout: 3500,
          headers: {
            'User-Agent': BROWSER_HEADERS['User-Agent'],
            'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8'
          }
        });

        const rawCandidates: Array<{
          url: string;
          title: string;
          sourceName: string;
          category: string;
        }> = [];

        // 2. Collect candidate items across active sources (Primary: RSS XML -> Fallback: Jina AI Reader Proxy)
        for (let sIdx = 0; sIdx < sources.length; sIdx++) {
          const source = sources[sIdx];
          sendLog(`[Source ${sIdx + 1}/${sources.length}] Step 1: Trying Primary RSS Feed for "${source.name}" (${source.url})...`);

          let feedCandidates: Array<{ url: string; title: string; sourceName: string; category: string }> = [];

          try {
            // Attempt standard RSS XML parsing with 3.5s timeout
            const feed = await fetchWithTimeout(
              parser.parseURL(source.url),
              3500,
              `RSS Feed request timed out after 3.5s`
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
            sendLog(`  └─ ✅ RSS Feed Succeeded: Found ${feedCandidates.length} candidate articles.`);
          } catch (rssErr: any) {
            sendLog(`  └─ ⚠️ RSS unavailable (${rssErr.message}). Step 2: Falling back to Jina AI Reader Proxy...`);
            try {
              feedCandidates = await extractCandidatesFromHtmlOrJina(source.url, source.name, source.category || "General");
              sendLog(`  └─ ⚡ Jina Reader Proxy Succeeded: Discovered ${feedCandidates.length} candidate articles.`);
            } catch (fallbackErr: any) {
              sendLog(`  └─ ❌ Jina fallback skipped: ${fallbackErr.message}`);
            }
          }

          rawCandidates.push(...feedCandidates);
        }

        if (rawCandidates.length === 0) {
          sendLog("⚠️ No articles found across active sources. Exiting pipeline.");
          controller.close();
          return;
        }

        sendLog(`Total ${rawCandidates.length} candidate(s) discovered. Running Batch Deduplication against Database...`);

        // 3. Batch Deduplication (Single DB Query)
        const candidateUrls = Array.from(new Set(rawCandidates.map((c) => c.url)));
        let newCandidates: typeof rawCandidates = [];

        try {
          const { data: existingRows } = await supabase
            .from("news_articles")
            .select("original_url")
            .in("original_url", candidateUrls);

          const existingSet = new Set(existingRows?.map((r: any) => r.original_url) || []);
          const seenInBatch = new Set<string>();

          for (const item of rawCandidates) {
            if (!existingSet.has(item.url) && !seenInBatch.has(item.url)) {
              seenInBatch.add(item.url);
              newCandidates.push(item);
            }
          }
          sendLog(`✅ Deduplication complete: ${newCandidates.length} new unique article(s) found (${rawCandidates.length - newCandidates.length} already exist).`);
        } catch (dbErr: any) {
          sendLog(`[Deduplication Warning] ${dbErr.message}. Proceeding with batch.`);
          newCandidates = rawCandidates;
        }

        if (newCandidates.length === 0) {
          sendLog("All candidate articles already exist in database. Everything is up to date!");
          return controller.close();
        }

        // 4. AI Title Batch Pre-Filtering
        let selectedArticles: typeof newCandidates = [];

        if (newCandidates.length <= targetLimit) {
          selectedArticles = newCandidates;
          sendLog(`Candidate count (${newCandidates.length}) is within target limit (${targetLimit}). Selecting all.`);
        } else {
          sendLog(`AI Pre-Filtering: Asking Gemini to select top ${targetLimit} breaking news headlines from ${newCandidates.length} candidates...`);

          const titleListString = newCandidates
            .map((c, i) => `[Index ${i}] Title: "${c.title}" | Source: ${c.sourceName} | Category: ${c.category}`)
            .join("\n");

          const prompt = `You are an expert news editor for a high-priority breaking news platform.
Analyze the following list of ${newCandidates.length} candidate news titles for Category: "${targetCategory}".
Identify and select the TOP ${targetLimit} most important, breaking, high-utility, or national/global significance news titles for a general audience.

Candidate Titles:
${titleListString}

Respond with a strictly valid JSON object following this exact schema:
{
  "selected_indices": [<array of integer indices selected, e.g. 0, 3, 7>]
}`;

          const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"];
          let aiFilterSuccess = false;

          for (const modelName of modelsToTry) {
            if (aiFilterSuccess) break;
            for (const apiKey of activeKeys) {
              if (!apiKey) continue;
              try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { responseMimeType: "application/json" },
                });

                const result = await fetchWithTimeout(model.generateContent(prompt), 10000, "Gemini timeout");
                const parsed = JSON.parse(result.response.text());

                if (parsed && Array.isArray(parsed.selected_indices) && parsed.selected_indices.length > 0) {
                  selectedArticles = parsed.selected_indices
                    .slice(0, targetLimit)
                    .map((idx: number) => newCandidates[idx])
                    .filter(Boolean);

                  if (selectedArticles.length > 0) {
                    aiFilterSuccess = true;
                    break;
                  }
                }
              } catch (err: any) {
                continue;
              }
            }
          }

          if (selectedArticles.length === 0) {
            sendLog(`[Fallback] Selecting top ${targetLimit} candidates directly.`);
            selectedArticles = newCandidates.slice(0, targetLimit);
          }
        }

        sendLog(`[AI Selected ${selectedArticles.length} Article(s)]:`);
        selectedArticles.forEach((a, idx) => {
          sendLog(`   ${idx + 1}. [${a.sourceName}] ${a.title.slice(0, 60)}...`);
        });

        // 5. Deep Process, Early DB Save & Audio Generation
        let totalSuccessful = 0;
        const aiModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"];

        for (let i = 0; i < selectedArticles.length; i++) {
          const article = selectedArticles[i];
          sendLog(`\n[Article ${i + 1}/${selectedArticles.length}] Processing: "${article.title.slice(0, 50)}..."`);

          // 5a. Universal Content Extraction
          let extracted;
          try {
            extracted = await extractArticleContent(article.url, article.title);
          } catch (extErr: any) {
            extracted = {
              title: article.title,
              bodyText: article.title,
              ogImage: null,
              extractionMethod: 'fallback' as const,
            };
          }
          const cleanedContent = extracted.bodyText || article.title;
          sendLog(`  ├─ Extracted via [${extracted.extractionMethod}] (${cleanedContent.length} chars). Generating AI Summary...`);

          // 5b. Unified Gemini AI Processing
          const aiPrompt = `You are a chief news editor and journalist for a premium multimedia news platform.
Analyze the following news content and return a strictly valid JSON object.

Input Title: ${extracted.title || article.title}
Source: ${article.sourceName}
Category Hint: ${article.category}
Cleaned Article Body:
${cleanedContent.slice(0, 15000)}

Your response MUST follow this exact JSON schema:
{
  "importance_score": <Integer from 1 to 100 representing importance/breaking value>,
  "clean_headline": "<Clean, engaging Bengali headline>",
  "clean_content": "<COMPLETE FULL UNABRIDGED BENGALI ARTICLE BODY in clean markdown. DO NOT SHORTEN OR CONDENSE THE STORY; KEEP ALL NARRATIVE PARAGRAPHS>",
  "ai_summary": "<A SHORT 2-paragraph Bengali summary with 3 key takeaway bullet points at the end>",
  "detected_category": "<One of: Politics, Economy, Technology, Sports, Entertainment, World, Bangladesh, Lifestyle, General>"
}`;

          let aiResult: any = null;
          for (const modelName of aiModels) {
            if (aiResult && aiResult.clean_content) break;
            for (const apiKey of activeKeys) {
              if (!apiKey) continue;
              try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { responseMimeType: "application/json" },
                });
                const result = await fetchWithTimeout(model.generateContent(aiPrompt), 12000, "AI timeout");
                aiResult = JSON.parse(result.response.text());
                if (aiResult && aiResult.clean_content) break;
              } catch (err: any) {
                continue;
              }
            }
          }

          if (!aiResult) {
            sendLog(`  └─ [Warning] AI processing returned empty. Using raw extracted content.`);
            aiResult = {
              importance_score: 50,
              clean_headline: extracted.title || article.title,
              clean_content: cleanedContent,
              ai_summary: cleanedContent.slice(0, 300),
              detected_category: article.category || "General",
            };
          }

          sendLog(`  ├─ AI Headline: "${aiResult.clean_headline?.slice(0, 45)}..." | Score: ${aiResult.importance_score || 50}/100`);

          // 5c. EARLY DB SAVE (Instant Availability in Feed & Library)
          const insertPayload: any = {
            headline: aiResult.clean_headline || article.title,
            raw_content: aiResult.clean_content || cleanedContent,
            ai_summary: aiResult.ai_summary,
            status: autoApp ? "published" : "draft",
            original_url: article.url,
            source: article.sourceName || article.url,
            category: aiResult.detected_category || article.category || "General",
            published_at: new Date().toISOString(),
          };

          if (extracted.ogImage) {
            insertPayload.image_url = extracted.ogImage;
          }

          let insertedArticleId: string | null = null;
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
            sendLog(`  ├─ ✅ Saved to DB! (Status: ${autoApp ? "published" : "draft"}, Has Image: ${!!extracted.ogImage})`);
          } catch (dbErr: any) {
            sendLog(`  └─ [Database Error]: ${dbErr.message}`);
            continue;
          }

          // 5d. Non-Blocking Audio TTS Generation
          if (activeKeys.length > 0 && insertedArticleId) {
            sendLog(`  ├─ Generating Bengali Audio TTS...`);
            try {
              const textToSpeak = (aiResult.ai_summary || aiResult.clean_headline)
                .replace(/[*_#`[\]()]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

              const wavBuffer = await fetchWithTimeout(
                generateSeamlessGeminiAudio(textToSpeak, "bn", activeKeys),
                15000,
                "TTS Generation timed out"
              );

              const publicId = `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              const audioUrl = await uploadAudioToCloudinary(wavBuffer, publicId);

              if (audioUrl) {
                await supabase
                  .from("news_articles")
                  .update({ audio_bn_summary: audioUrl })
                  .eq("id", insertedArticleId);
                sendLog(`  └─ ✅ Audio TTS Uploaded to Cloudinary successfully!`);
              }
            } catch (audioErr: any) {
              sendLog(`  └─ ⚠️ Audio TTS Skipped: ${audioErr.message}`);
            }
          }
        }

        sendLog(`\n🎉 Pipeline Completed! Successfully scraped, synthesized & saved ${totalSuccessful} new article(s).`);
        controller.close();
      } catch (err: any) {
        sendLog(`[CRITICAL ERROR]: ${err.message}`);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
