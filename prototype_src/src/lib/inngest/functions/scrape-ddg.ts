// @ts-nocheck
import { inngest } from "../client";
import { createBackgroundClient } from "@/utils/supabase/background";
import { search } from "duck-duck-scrape";

export const scrapeDDG = inngest.createFunction(
  { id: "scrape-ddg", cron: "0 0 * * *" }, // Run daily at midnight
  async ({ step }) => {
    const supabase = createBackgroundClient();

    // 1. Fetch DDG search queries from Supabase
    // We assume category='ddg' or some specific identifier for these queries
    const sources = await step.run("fetch-ddg-sources", async () => {
      const { data, error } = await supabase
        .from("scraping_sources")
        .select("*")
        .eq("is_active", true)
        .eq("category", "ddg"); 

      if (error) {
        throw new Error(`Failed to fetch sources: ${error.message}`);
      }
      return data || [];
    });

    if (sources.length === 0) {
      return { message: "No active DDG sources found." };
    }

    // 2. Perform DDG Search for each source
    const newArticles = await step.run("search-ddg", async () => {
      const articlesToProcess = [];

      for (const source of sources) {
        try {
          // url holds the query, e.g., "Bangladesh news site:jamuna.tv"
          const searchResults = await search(source.url, {
            safeSearch: "moderate",
            time: "d", // Only get results from the past day to keep it fresh
          });

          // Take top 5 results
          const topItems = searchResults.results.slice(0, 5);

          for (const item of topItems) {
            if (item.url) {
              const { data: existing } = await supabase
                .from("news_articles")
                .select("id")
                .eq("original_url", item.url)
                .single();

              if (!existing) {
                articlesToProcess.push({
                  url: item.url,
                  title: item.title,
                  sourceId: source.id,
                  category: source.category,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Failed to search DDG for query ${source.url}:`, error);
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
      
      await step.sendEvent("trigger-ddg-processing", events);
    }

    return { processed: newArticles.length };
  }
);
