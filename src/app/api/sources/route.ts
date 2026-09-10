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
      const country = payload?.country || "ALL";
      let defaults: any[] = [];

      const bdSources = [
        { name: "Prothom Alo (RSS)", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
        { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
        { name: "VOA Bangla", url: "https://www.voabangla.com/api/z--r-rymqv", category: "General", country: "BD", is_active: true },
        { name: "Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true },
        { name: "Dhaka Tribune", url: "https://www.dhakatribune.com/feed", category: "General", country: "BD", is_active: true },
        { name: "Bdnews24 Bangla", url: "https://bangla.bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true", category: "General", country: "BD", is_active: true },
        { name: "Kaler Kantho", url: "https://www.kalerkantho.com/rss.xml", category: "General", country: "BD", is_active: true }
      ];

      const globalSources = [
        { name: "BBC News (World)", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "World", country: "GLOBAL", is_active: true },
        { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "World", country: "GLOBAL", is_active: true },
        { name: "Reuters (World News)", url: "https://reutersagency.com", category: "World", country: "GLOBAL", is_active: true },
        { name: "CNN (World)", url: "http://rss.cnn.com/rss/edition_world.rss", category: "World", country: "GLOBAL", is_active: true },
        { name: "The New York Times (World)", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "World", country: "GLOBAL", is_active: true },
        { name: "Deutsche Welle (DW World)", url: "https://rss.dw.com/rdf/rss-en-world", category: "World", country: "GLOBAL", is_active: true },
        { name: "NPR News (World)", url: "https://feeds.npr.org/1004/rss.xml", category: "World", country: "GLOBAL", is_active: true }
      ];

      const ukSources = [
        { name: "BBC News (UK)", url: "https://feeds.bbci.co.uk/news/uk/rss.xml", category: "World", country: "UK", is_active: true },
        { name: "The Guardian (UK)", url: "https://www.theguardian.com/uk/rss", category: "World", country: "UK", is_active: true },
        { name: "Sky News (UK)", url: "https://feeds.skynews.com/feeds/rss/uk.xml", category: "World", country: "UK", is_active: true },
        { name: "MailOnline (Daily Mail)", url: "https://www.dailymail.co.uk/news/index.rss", category: "General", country: "UK", is_active: true },
        { name: "The Sun (UK)", url: "https://www.thesun.co.uk/news/feed/", category: "General", country: "UK", is_active: true },
        { name: "The Telegraph (UK)", url: "https://www.telegraph.co.uk/news/rss.xml", category: "World", country: "UK", is_active: true }
      ];

      const saSources = [
        { name: "Arab News (SA)", url: "https://www.arabnews.com/rss.xml", category: "General", country: "SA", is_active: true },
        { name: "Saudi Gazette", url: "https://saudigazette.com.sa/rss/saudi-arabia", category: "General", country: "SA", is_active: true },
        { name: "Al Arabiya English (SA)", url: "https://english.alarabiya.net/feed/rss2/english/news", category: "General", country: "SA", is_active: true },
        { name: "Asharq Al-Awsat (ENG)", url: "https://english.aawsat.com/rss.xml", category: "General", country: "SA", is_active: true },
        { name: "Saudi Press Agency (SPA)", url: "https://www.spa.gov.sa/rss.xml", category: "General", country: "SA", is_active: true },
        { name: "Al Riyadh Daily", url: "http://alriyadhdaily.com/rss", category: "General", country: "SA", is_active: true }
      ];

      // Automatically normalize any non-standard categories to General
      try {
        await supabase
          .from("scraping_sources")
          .update({ category: "General" })
          .in("category", ["Middle East", "Govt / National"]);
      } catch (e) {}

      if (country === "BD") {
        defaults = bdSources;
      } else if (country === "GLOBAL") {
        defaults = globalSources;
      } else if (country === "UK") {
        defaults = ukSources;
      } else if (country === "SA") {
        defaults = saSources;
      } else {
        // ALL countries
        defaults = [...bdSources, ...globalSources, ...ukSources, ...saSources];
      }

      for (const src of defaults) {
        // Check if URL already exists
        const { data: existing } = await supabase
          .from("scraping_sources")
          .select("id")
          .eq("url", src.url)
          .maybeSingle();

        if (!existing) {
          try {
            await supabase.from("scraping_sources").insert(src);
          } catch (e) {
            const { country, ...rest } = src;
            await supabase.from("scraping_sources").insert(rest);
          }
        } else {
          // Keep existing source updated with normalized category
          await supabase.from("scraping_sources").update({ category: src.category, country: src.country }).eq("id", existing.id);
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
