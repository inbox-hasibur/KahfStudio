// @ts-nocheck
import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
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

    // 2. Parse feeds and find new URLs
    const newArticles = await step.run("parse-feeds", async () => {
      const articlesToProcess = [];

      for (const source of sources) {
        try {
          const feed = await parser.parseURL(source.url);
          
          // Only take top 5 to avoid overwhelming the system
          const topItems = feed.items.slice(0, 5);
          
          for (const item of topItems) {
            if (item.link) {
              // Optionally: Check if the link already exists in news_articles to avoid duplicates
              const { data: existing } = await supabase
                .from("news_articles")
                .select("id")
                .eq("original_url", item.link)
                .single();

              if (!existing) {
                articlesToProcess.push({
                  url: item.link,
                  title: item.title,
                  sourceId: source.id,
                  sourceName: source.name,
                  category: source.category,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Failed to parse feed for source ${source.name}:`, error);
        }
      }

      return articlesToProcess;
    });

    // 3. Trigger processing for each new article
    if (newArticles.length > 0) {
      const events = newArticles.map(article => ({
        name: "app/process-article",
        data: article
      }));
      
      await step.sendEvent("trigger-processing", events);
    }

    return { processed: newArticles.length };
  }
);
