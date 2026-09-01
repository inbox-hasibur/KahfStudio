"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function fetchLatestNews(shouldRevalidate = true) {
  try {
    const supabase = await createClient();
    const { data: newsData, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (shouldRevalidate) {
      revalidatePath("/");
    }
    
    return newsData || getMockNews();
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
