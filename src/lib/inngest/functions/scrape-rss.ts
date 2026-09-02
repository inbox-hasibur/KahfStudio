// @ts-nocheck
import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from "rss-parser";

const parser = new Parser();

export const scrapeRssFeeds = inngest.createFunction(
  { id: "scrape-rss-feeds", triggers: [{ cron: "0 * * * *" }, { event: "app/trigger-rss-scrape" }] },
  async ({ step }) => {
    const supabase = createBackgroundClient();

    // 1. Fetch active RSS sources from Supabase
    const sources = await step.run("fetch-sources", async () => {
      const { data, error } = await supabase
        .from("scraping_sources")
        .select("*")
        .eq("is_active", true);

      if (error) {
        throw new Error(`Failed to fetch sources: ${error.message}`);
      }
      return data || [];
    });

    if (sources.length === 0) {
      return { message: "No active sources found." };
    }

    // 2. Fetch all raw candidate items across active sources (up to 15 items per feed)
    const rawCandidates = await step.run("parse-feeds", async () => {
      const candidates = [];

      for (const source of sources) {
        try {
          const feed = await parser.parseURL(source.url);
          const topItems = feed.items ? feed.items.slice(0, 15) : [];
          
          for (const item of topItems) {
            const itemTitle = typeof item.title === 'string'
              ? item.title.trim()
              : (item.title as any)?._ || (item.title as any)?.value || (item.title ? String(item.title) : '');

            if (item.link && itemTitle) {
              candidates.push({
                url: item.link,
                title: itemTitle,
                sourceId: source.id,
                sourceName: source.name,
                category: source.category,
                country: source.country || "BD",
              });
            }
          }
        } catch (error) {
          console.error(`Failed to parse feed for source ${source.name}:`, error);
        }
      }

      if (candidates.length === 0) return [];

      // Batch deduplication against database
      const candidateUrls = Array.from(new Set(candidates.map((c) => c.url)));
      const { data: existingRows } = await supabase
        .from("news_articles")
        .select("original_url")
        .in("original_url", candidateUrls);

      const existingSet = new Set(existingRows?.map((r: any) => r.original_url) || []);
      const seen = new Set<string>();

      return candidates.filter((item) => {
        if (!existingSet.has(item.url) && !seen.has(item.url)) {
          seen.add(item.url);
          return true;
        }
        return false;
      });
    });

    if (rawCandidates.length === 0) {
      return { message: "No new articles found across feeds." };
    }

    // 3. AI Title Batch Pre-Filtering: Send ALL titles to Gemini in 1 prompt & pick top 5-8
    const selectedArticles = await step.run("ai-title-prefiltering", async () => {
      // If candidates are 5 or fewer, process all of them directly
      if (rawCandidates.length <= 5) {
        return rawCandidates;
      }

      // Fetch global Gemini API keys from system_settings
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      let apiKeys: string[] = [];
      if (settingsData) {
        const keysSetting = settingsData.find((s) => s.setting_key === "global_gemini_api_keys");
        if (keysSetting) {
          try { apiKeys = JSON.parse(keysSetting.setting_value); } catch (e) {}
        }
      }
      const activeKeys = (apiKeys && apiKeys.length > 0) ? apiKeys : [process.env.GEMINI_API_KEY!];

      // Prepare title list for Gemini batch evaluation
      const titleListString = rawCandidates
        .map((c, i) => `[Index ${i}] Title: "${c.title}" | Source: ${c.sourceName} | Category: ${c.category || "General"}`)
        .join("\n");

      const prompt = `You are an expert news editor for a high-priority breaking news platform.
Analyze the following list of ${rawCandidates.length} candidate news titles.
Identify and select the TOP 5 to TOP 8 most important, breaking, high-utility, or national/global significance news titles for a general audience.

Candidate Titles:
${titleListString}

Respond with a strictly valid JSON object following this exact schema:
{
  "selected_indices": [<array of integer indices selected, e.g. 0, 3, 7, 12>]
}`;

      const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"];
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
            const parsed = JSON.parse(result.response.text());

            if (parsed && Array.isArray(parsed.selected_indices) && parsed.selected_indices.length > 0) {
              const filtered = parsed.selected_indices
                .map((idx: number) => rawCandidates[idx])
                .filter(Boolean);
              if (filtered.length > 0) {
                return filtered;
              }
            }
          } catch (err: any) {
            continue;
          }
        }
      }

      // Fallback: If AI pre-filtering fails or has no key, take top 5
      console.warn("Falling back to top 5 candidates without AI pre-filtering.");
      return rawCandidates.slice(0, 5);
    });

    // 4. Trigger deep processing & audio generation ONLY for selected articles
    if (selectedArticles.length > 0) {
      const events = selectedArticles.map(article => ({
        name: "app/process-article",
        data: article
      }));
      
      await step.sendEvent("trigger-processing", events);
    }

    return { 
      totalCandidatesFound: rawCandidates.length,
      topArticlesSelected: selectedArticles.length 
    };
  }
);
