import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from "rss-parser";
import axios from "axios";

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8'
  }
});

async function fallbackJinaFeedExtraction(sourceUrl: string): Promise<Array<{ url: string; title: string }>> {
  try {
    let target = sourceUrl;
    try {
      const p = new URL(sourceUrl);
      if (p.pathname.includes('feed') || p.pathname.includes('rss') || p.pathname.includes('api')) {
        target = p.origin;
      }
    } catch (e) {}

    const res = await axios.get(`https://r.jina.ai/${target}`, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-No-Cache': 'true', 'X-Timeout': '5' },
    });
    const markdown = typeof res.data === 'string' ? res.data : '';
    const linkRegex = /\[([^\]]{18,120})\]\((https?:\/\/[^\s\)]+)\)/g;
    const items: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();
    let m;
    while ((m = linkRegex.exec(markdown)) !== null && items.length < 10) {
      const title = m[1].replace(/[*_#`[\]()]/g, '').trim();
      const link = m[2].trim();
      try {
        const host = new URL(link).hostname;
        const targetHost = new URL(target).hostname;
        if (host.includes(targetHost.replace('www.', '')) && !seen.has(link) && !link.includes('/tag/') && !link.includes('/category/')) {
          seen.add(link);
          items.push({ url: link, title });
        }
      } catch (e) {}
    }
    return items;
  } catch (e) {
    return [];
  }
}

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
        let feedFound = false;
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
              feedFound = true;
            }
          }
        } catch (error) {
          console.warn(`Standard RSS parse failed for source ${source.name}, attempting Jina recovery:`, error);
        }

        // Fallback to Jina Reader if RSS failed
        if (!feedFound) {
          const fallbackItems = await fallbackJinaFeedExtraction(source.url);
          for (const item of fallbackItems) {
            candidates.push({
              url: item.url,
              title: item.title,
              sourceId: source.id,
              sourceName: source.name,
              category: source.category,
              country: source.country || "BD",
            });
          }
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
      const events = selectedArticles.map((article: any) => ({
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
