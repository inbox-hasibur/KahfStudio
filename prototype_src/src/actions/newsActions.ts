"use server";

import { scrapeJamunaTV } from "@/lib/scraper";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { summarizeNews, classifyNews } from "@/lib/ai";

export async function fetchLatestNews(shouldRevalidate = true) {
  try {
    const supabase = await createClient();
    console.log("Starting to scrape Jamuna TV...");
    
    const newsData = await scrapeJamunaTV();
    console.log(`Successfully scraped ${newsData?.length || 0} articles.`);
    
    let processedNews = [];

    if (newsData && newsData.length > 0) {
      for (const item of newsData) {
        const aiSummary = await summarizeNews(item.title, item.summary);
        const priority = await classifyNews(item.title, aiSummary);

        const processedItem = {
          headline: item.title,
          raw_content: item.summary,
          ai_summary: aiSummary,
          original_url: item.originalUrl,
          source: item.source || "Jamuna TV",
          status: "published",
          published_at: item.publishedAt || new Date().toISOString(),
          // priority can be stored in a new column or metadata later
        };

        const { data: savedItem, error } = await supabase
          .from('news_articles')
          .upsert(processedItem, { onConflict: 'original_url' })
          .select()
          .single();
          
        if (!error && savedItem) {
          processedNews.push(savedItem);
        }
      }
    } else {
      console.log("No news scraped, using mock data for demonstration.");
      processedNews = getMockNews();
    }

    if (shouldRevalidate) {
      revalidatePath("/");
    }
    
    return processedNews;
    
  } catch (error) {
    console.error("Error in server action:", error);
    return getMockNews();
  }
}

function getMockNews() {
  return [
    {
      id: "m1",
      headline: "Metro Rail schedules changed: Effective from tomorrow",
      ai_summary: "The Dhaka Metro Rail authorities have announced new schedules starting tomorrow.",
      status: "published",
      source: "Mock News",
      published_at: new Date().toISOString(),
      original_url: "#"
    },
    {
      id: "m2",
      headline: "BPL Finals: Two giants face off in the ultimate battle",
      ai_summary: "The Bangladesh Premier League reaches its climax as Comilla Victorians take on Fortune Barishal.",
      status: "published",
      source: "Mock News",
      published_at: new Date().toISOString(),
      original_url: "#"
    }
  ];
}

export async function getNewsFromDB() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching news from DB:", error);
    return [];
  }
}

export async function getNewsById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching news by ID:", error);
    return null;
  }
}

export async function searchNews(query: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .or(`headline.ilike.%${query}%,ai_summary.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error searching news:", error);
    return [];
  }
}
