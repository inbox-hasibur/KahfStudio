import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase.from("scraping_sources").select("*").order("created_at", { ascending: false });
    
    if (country && country !== "ALL") {
      query = query.eq("country", country);
    }

    let { data, error } = await query;
    if (error && error.message?.includes("country")) {
      // Fallback if country column not in DB yet
      const fallback = await supabase.from("scraping_sources").select("*").order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    return NextResponse.json({ sources: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (action === "ADD") {
      const { name, url, category, country = "BD" } = payload;
      const insertData: any = { name, url, category, is_active: true };
      try {
        const { error } = await supabase.from("scraping_sources").insert({ ...insertData, country });
        if (error) throw error;
      } catch (err: any) {
        const { error } = await supabase.from("scraping_sources").insert(insertData);
        if (error) throw error;
      }
    } else if (action === "DELETE") {
      const { id } = payload;
      const { error } = await supabase.from("scraping_sources").delete().eq("id", id);
      if (error) throw error;
    } else if (action === "TOGGLE") {
      const { id, is_active } = payload;
      const { error } = await supabase.from("scraping_sources").update({ is_active }).eq("id", id);
      if (error) throw error;
    } else if (action === "SEED") {
      const country = payload?.country || "BD";
      let defaults = [];

      if (country === "BD") {
        defaults = [
          { name: "Prothom Alo (RSS)", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
          { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
          { name: "VOA Bangla", url: "https://www.voabangla.com/api/z--r-rymqv", category: "General", country: "BD", is_active: true },
          { name: "Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true },
          { name: "Dhaka Tribune", url: "https://www.dhakatribune.com/feed", category: "General", country: "BD", is_active: true },
          { name: "Bdnews24 Bangla", url: "https://bangla.bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true", category: "General", country: "BD", is_active: true },
          { name: "Kaler Kantho", url: "https://www.kalerkantho.com/rss.xml", category: "General", country: "BD", is_active: true }
        ];
      } else {
        // Global / US defaults
        defaults = [
          { name: "BBC News World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "World", country: "GLOBAL", is_active: true },
          { name: "Reuters Top News", url: "https://www.reutersagency.com/feed/?best-topics=world-at-work&post_type=best", category: "World", country: "GLOBAL", is_active: true },
          { name: "CNN Top Stories", url: "http://rss.cnn.com/rss/edition.rss", category: "World", country: "GLOBAL", is_active: true },
          { name: "The Verge Tech", url: "https://www.theverge.com/rss/index.xml", category: "Technology", country: "GLOBAL", is_active: true }
        ];
      }

      for (const src of defaults) {
        try {
          await supabase.from("scraping_sources").insert(src);
        } catch (e) {
          const { country, ...rest } = src;
          await supabase.from("scraping_sources").insert(rest);
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Sources API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
