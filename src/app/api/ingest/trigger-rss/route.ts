import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Allow up to 60 seconds (safe for Vercel Hobby tier)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));
      };

      try {
        sendLog("Starting Emergency Scraping Pipeline...");
        
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        sendLog("Fetching active scraping sources...");
        const { data: sources, error: sourceError } = await supabase
          .from("scraping_sources")
          .select("*")
          .eq("is_active", true);

        if (sourceError) throw new Error(sourceError.message);
        if (!sources || sources.length === 0) {
          sendLog("No active sources found. Exiting.");
          return controller.close();
        }
        sendLog(`Found ${sources.length} active sources.`);

        // Fetch System Prompts
        const { data: sysData } = await supabase.from("system_settings").select("setting_key, setting_value");
        let ePrompt = "Respond exactly with 'YES' if the article contains a valid news story, otherwise 'NO'.";
        let sPrompt = "খবরটির একটি চমৎকার, আকর্ষণীয় এবং তথ্যবহুল সারসংক্ষেপ লিখুন বাংলায় (১-২ প্যারাগ্রাফের মধ্যে)।";
        let autoApp = true;
        let keys: string[] = [process.env.GEMINI_API_KEY!];

        if (sysData) {
          const eSetting = sysData.find(s => s.setting_key === "evaluator_prompt");
          const sSetting = sysData.find(s => s.setting_key === "synthesizer_prompt");
          const autoSetting = sysData.find(s => s.setting_key === "auto_approve_news");
          const keysSetting = sysData.find(s => s.setting_key === "global_gemini_api_keys");
          
          if (eSetting) ePrompt = eSetting.setting_value;
          if (sSetting) sPrompt = sSetting.setting_value;
          if (autoSetting) autoApp = autoSetting.setting_value === "true";
          if (keysSetting) {
            try { 
              const parsed = JSON.parse(keysSetting.setting_value);
              if (parsed.length > 0) keys = parsed;
            } catch(e) {}
          }
        }
        sendLog(`Loaded System Settings. Fallback API Keys: ${keys.length}`);

        const parser = new Parser();
        let totalProcessed = 0;
        const TARGET_SUCCESSFUL = 5;

        for (const source of sources) {
          if (totalProcessed >= TARGET_SUCCESSFUL) break;
          sendLog(`Parsing RSS feed: ${source.name}...`);
          try {
            const feed = await parser.parseURL(source.url);
            sendLog(`Found ${feed.items.length} recent articles in ${source.name}. Processing until we hit our target...`);

            for (const item of feed.items) {
              if (totalProcessed >= TARGET_SUCCESSFUL) {
                sendLog(`Reached target of ${TARGET_SUCCESSFUL} successful articles.`);
                break;
              }
              if (!item.link) continue;
              
              // Check if exists
              const { data: existing } = await supabase.from("news_articles").select("id").eq("original_url", item.link).single();
              if (existing) {
                sendLog(`[Skip] Article already exists: ${item.title?.slice(0,30)}...`);
                continue;
              }

              sendLog(`[Process] Starting: ${item.title?.slice(0, 40)}...`);
              
              // 1. Markdown Extraction
              let markdown = "";
              try {
                const res = await axios.get(`https://r.jina.ai/${item.link}`);
                markdown = res.data;
              } catch (e) {
                sendLog(`[Error] Failed to extract markdown. Skipping.`);
                continue;
              }

              if (!markdown) continue;

              let retries = 0;
              let success = false;
              let currentKeyIdx = 0;

              while (retries < 3 && !success) {
                try {
                  // Use the current valid API key
                  const genAI = new GoogleGenerativeAI(keys[currentKeyIdx] || process.env.GEMINI_API_KEY!);
                  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                  // 2. Evaluator
                  sendLog(`[AI Evaluator] Checking if article is valid news... (Attempt ${retries + 1})`);
                  const evalRes = await model.generateContent(`${ePrompt}\n\nArticle:\n${markdown}`);
                  const isGood = evalRes.response.text().trim().toUpperCase().includes("YES");

                  if (!isGood) {
                    sendLog(`[Dropped] AI Evaluator rejected article.`);
                    success = true; // Handled as dropped
                    break;
                  }

                  // 3. Synthesizer
                  sendLog(`[AI Synthesizer] Generating Bangla summary...`);
                  const syncRes = await model.generateContent(`${sPrompt}\n\nTitle: ${item.title}\nCategory: ${source.category}\n\nArticle:\n${markdown}`);
                  const summary = syncRes.response.text();

                  // 4. Save
                  sendLog(`[Database] Saving to Supabase...`);
                  await supabase.from("news_articles").insert({
                    headline: item.title,
                    raw_content: markdown,
                    ai_summary: summary,
                    status: autoApp ? "published" : "draft",
                    original_url: item.link,
                    source: source.name || item.link,
                    category: source.category || "General",
                    published_at: new Date().toISOString()
                  });

                  sendLog(`[Success] Saved article successfully!`);
                  totalProcessed++;
                  success = true;
                } catch (aiError: any) {
                  const errMsg = aiError.message || "";
                  sendLog(`[Error] AI Processing failed: ${errMsg.slice(0, 150)}...`);
                  
                  if (errMsg.includes("429") || errMsg.includes("Quota")) {
                    currentKeyIdx++;
                    if (currentKeyIdx < keys.length) {
                      sendLog(`[Retry] Rotating to API key #${currentKeyIdx + 1}...`);
                      continue; // immediately retry with new key
                    } else {
                      currentKeyIdx = 0; // reset to first key
                      let waitSecs = 15; // default wait
                      const match1 = errMsg.match(/retry in ([\d\.]+)s/i);
                      const match2 = errMsg.match(/"retryDelay":"(\d+)s"/i);
                      if (match1 && match1[1]) waitSecs = Math.ceil(parseFloat(match1[1])) + 2;
                      else if (match2 && match2[1]) waitSecs = Math.ceil(parseFloat(match2[1])) + 2;
                      
                      sendLog(`[Rate Limit] All keys exhausted. Waiting ${waitSecs} seconds...`);
                      await new Promise(resolve => setTimeout(resolve, waitSecs * 1000));
                      retries++;
                    }
                  } else {
                    sendLog(`[Error] Non-rate-limit error. Skipping this article.`);
                    break;
                  }
                }
              }
            }
          } catch (e: any) {
            sendLog(`[Error] Source ${source.name} failed: ${e.message}`);
          }
        }

        sendLog(`Pipeline finished! Total new articles processed: ${totalProcessed}`);
        controller.close();
      } catch (err: any) {
        sendLog(`[CRITICAL ERROR]: ${err.message}`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
