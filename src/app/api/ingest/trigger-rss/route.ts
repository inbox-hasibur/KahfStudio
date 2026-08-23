import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractArticleContent } from "@/lib/scraper/universal-extractor";
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from "@/lib/audio/gemini-tts";

export const maxDuration = 300; // 300 seconds (5 minutes max timeout)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));
      };

      try {
        const url = new URL(req.url);
        const targetLimit = parseInt(url.searchParams.get('limit') || '5', 10);
        const targetCategory = url.searchParams.get('category') || 'All';

        sendLog("Starting Emergency Scraping Pipeline...");

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        sendLog(`Fetching active scraping sources (Category: ${targetCategory})...`);
        let sourceQuery = supabase
          .from("scraping_sources")
          .select("*")
          .eq("is_active", true);

        if (targetCategory !== "All") {
          sourceQuery = sourceQuery.eq("category", targetCategory);
        }

        const { data: sources, error: sourceError } = await sourceQuery;

        if (sourceError) throw new Error(sourceError.message);
        if (!sources || sources.length === 0) {
          sendLog("No active sources found. Exiting.");
          return controller.close();
        }
        sendLog(`Found ${sources.length} active sources.`);

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
        const activeKeys = (keys && keys.length > 0) ? keys : [process.env.GEMINI_API_KEY!];
        sendLog(`Loaded System Settings. Available Gemini API Keys: ${activeKeys.length}`);

        const parser = new Parser();
        const rawCandidates: Array<{
          url: string;
          title: string;
          sourceName: string;
          category: string;
        }> = [];

        // 1. Collect candidate items from active RSS feeds
        for (const source of sources) {
          sendLog(`Parsing RSS feed: ${source.name}...`);
          try {
            const feed = await parser.parseURL(source.url);
            const topItems = feed.items.slice(0, 15);
            let addedFromSource = 0;

            for (const item of topItems) {
              const itemTitle = typeof item.title === 'string' 
                ? item.title.trim() 
                : (item.title as any)?._ || (item.title as any)?.value || (item.title ? String(item.title) : '');

              if (item.link && itemTitle) {
                // Deduplicate against existing news_articles by original_url
                const { data: existing } = await supabase
                  .from("news_articles")
                  .select("id")
                  .eq("original_url", item.link)
                  .single();

                if (!existing) {
                  rawCandidates.push({
                    url: item.link,
                    title: itemTitle,
                    sourceName: source.name,
                    category: source.category || "General",
                  });
                  addedFromSource++;
                }
              }
            }
            sendLog(`Found ${addedFromSource} new candidate articles in ${source.name}.`);
          } catch (error: any) {
            sendLog(`[Warning] Failed to parse feed for ${source.name}: ${error.message}`);
          }
        }

        if (rawCandidates.length === 0) {
          sendLog("No new articles found across feeds to process.");
          return controller.close();
        }

        sendLog(`Total ${rawCandidates.length} new candidates collected. Starting AI Topic & Importance Selection...`);

        // 2. AI Title Batch Pre-Filtering: Send ALL titles to Gemini in 1 prompt & pick top targetLimit
        let selectedArticles: typeof rawCandidates = [];

        if (rawCandidates.length <= targetLimit) {
          selectedArticles = rawCandidates;
          sendLog(`Candidate count (${rawCandidates.length}) is <= target limit (${targetLimit}). Processing all of them.`);
        } else {
          sendLog(`Batch evaluating ${rawCandidates.length} headlines with Gemini to pick TOP ${targetLimit} for Topic: "${targetCategory}"...`);

          const titleListString = rawCandidates
            .map((c, i) => `[Index ${i}] Title: "${c.title}" | Source: ${c.sourceName} | Category: ${c.category}`)
            .join("\n");

          const prompt = `You are an expert news editor for a high-priority breaking news platform.
Analyze the following list of ${rawCandidates.length} candidate news titles for Category: "${targetCategory}".
Identify and select the TOP ${targetLimit} most important, breaking, high-utility, or national/global significance news titles for a general audience.

Candidate Titles:
${titleListString}

Respond with a strictly valid JSON object following this exact schema:
{
  "selected_indices": [<array of integer indices selected, e.g. 0, 3, 7>]
}`;

          for (const apiKey of activeKeys) {
            if (!apiKey) continue;
            try {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" },
              });

              const result = await model.generateContent(prompt);
              const parsed = JSON.parse(result.response.text());

              if (parsed && Array.isArray(parsed.selected_indices) && parsed.selected_indices.length > 0) {
                selectedArticles = parsed.selected_indices
                  .slice(0, targetLimit)
                  .map((idx: number) => rawCandidates[idx])
                  .filter(Boolean);

                if (selectedArticles.length > 0) break;
              }
            } catch (err: any) {
              sendLog(`[Warning] AI Title Selection failed with a key: ${err.message}. Retrying key...`);
              continue;
            }
          }

          if (selectedArticles.length === 0) {
            sendLog(`[Fallback] AI batch filtering returned empty. Processing top ${targetLimit} candidates.`);
            selectedArticles = rawCandidates.slice(0, targetLimit);
          }
        }

        sendLog(`[AI Editor] Selected ${selectedArticles.length} top articles for processing:`);
        selectedArticles.forEach((a, idx) => {
          sendLog(`  ${idx + 1}. [${a.sourceName}] ${a.title.slice(0, 50)}...`);
        });

        // 3. Deep Process & Scrape ONLY the selected articles
        let totalSuccessful = 0;

        for (let i = 0; i < selectedArticles.length; i++) {
          const article = selectedArticles[i];
          sendLog(`[${i + 1}/${selectedArticles.length}] Scraping: ${article.title.slice(0, 45)}...`);

          // 3a. Universal Content Extraction (Mozilla Readability -> JSON-LD -> Jina AI fallback)
          const extracted = await extractArticleContent(article.url, article.title);
          const cleanedContent = extracted.bodyText || article.title;

          sendLog(`[${i + 1}/${selectedArticles.length}] Extracted via [${extracted.extractionMethod}] (${cleanedContent.length} chars). Running Unified AI Processing...`);

          // 3b. Unified Gemini AI Processing: Full News Cleanup + Summary + Importance Score in 1 Call
          const prompt = `You are a chief news editor and journalist for a premium multimedia news platform.
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
          const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash"];

          for (const modelName of modelsToTry) {
            for (const apiKey of activeKeys) {
              if (!apiKey) continue;
              try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                  model: modelName,
                  generationConfig: { responseMimeType: "application/json" },
                });
                const result = await model.generateContent(prompt);
                aiResult = JSON.parse(result.response.text());
                if (aiResult && aiResult.clean_content) break;
              } catch (err: any) {
                sendLog(`[Warning] Unified AI Processing API error (${modelName}): ${err.message}`);
                continue;
              }
            }
            if (aiResult && aiResult.clean_content) break;
          }

          if (!aiResult) {
            sendLog(`[Error] Unified AI processing failed for article. Skipping.`);
            continue;
          }

          sendLog(`[${i + 1}/${selectedArticles.length}] AI Complete! Importance Score: ${aiResult.importance_score || 50}/100. Generating Audio TTS...`);

          // 3c. Generate Audio TTS for summary
          let audioUrl: string | null = null;
          try {
            const textToSpeak = (aiResult.ai_summary || aiResult.clean_headline)
              .replace(/[*_#`[\]()]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            const wavBuffer = await generateSeamlessGeminiAudio(textToSpeak, "bn", activeKeys);
            const publicId = `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            audioUrl = await uploadAudioToCloudinary(wavBuffer, publicId);
          } catch (audioErr: any) {
            sendLog(`[Warning] Audio TTS generation failed: ${audioErr.message}. Proceeding without audio.`);
          }

          // 3d. Save Cleaned Full News, Cover Image, and Summary to Supabase DB
          const insertPayload: any = {
            headline: aiResult.clean_headline || article.title,
            raw_content: aiResult.clean_content || cleanedContent, // Stores the full unabridged Bengali body!
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

          if (audioUrl) {
            insertPayload.audio_bn_summary = audioUrl;
          }

          try {
            const { error: dbError } = await supabase.from("news_articles").insert({
              ...insertPayload,
              importance_score: aiResult.importance_score || 50,
              country: "BD",
            });

            if (dbError) {
              // Fallback if importance_score column doesn't exist
              const { error: fbErr } = await supabase.from("news_articles").insert(insertPayload);
              if (fbErr) throw fbErr;
            }

            totalSuccessful++;
            sendLog(`[${i + 1}/${selectedArticles.length}] Saved cleanly to database! (Status: ${autoApp ? "published" : "draft"}, Has Audio: ${!!audioUrl})`);
          } catch (dbErr: any) {
            sendLog(`[Error] Database save failed: ${dbErr.message}`);
          }
        }

        sendLog(`Pipeline finished! Total new articles successfully processed and saved: ${totalSuccessful}`);
        controller.close();
      } catch (err: any) {
        sendLog(`[CRITICAL ERROR]: ${err.message}`);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
