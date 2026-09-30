import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      if (!name || !url) {
        return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
      }
      const trimmedUrl = url.trim();
      const insertData: any = { 
        name: name.trim(), 
        url: trimmedUrl, 
        category: category || "General", 
        country: (country || "BD").toUpperCase(), 
        is_active: true 
      };

      const { data: existing } = await supabase
        .from("scraping_sources")
        .select("id")
        .eq("url", trimmedUrl)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "A source with this URL already exists in database." }, { status: 400 });
      }

      const { error } = await supabase.from("scraping_sources").insert(insertData);
      if (error) throw error;
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

      // Verified Bangladesh News Defaults (7 Tested & Active Outlets)
      const bdSources = [
        { name: "Prothom Alo", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
        { name: "Daily Ittefaq", url: "https://www.ittefaq.com.bd/feed/", category: "General", country: "BD", is_active: true },
        { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
        { name: "Channel i News", url: "https://www.channelionline.com/feed/", category: "General", country: "BD", is_active: true },
        { name: "BD24Live", url: "https://www.bd24live.com/bangla/feed", category: "General", country: "BD", is_active: true },
        { name: "Google News (Bangladesh)", url: "https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn", category: "General", country: "BD", is_active: true },
        { name: "The Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true }
      ];

      // Verified Global News Defaults (9 Tested & Active Outlets)
      const globalSources = [
        { name: "BBC News (World)", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "General", country: "GLOBAL", is_active: true },
        { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "General", country: "GLOBAL", is_active: true },
        { name: "The Guardian (World)", url: "https://www.theguardian.com/world/rss", category: "General", country: "GLOBAL", is_active: true },
        { name: "CNN (World)", url: "http://rss.cnn.com/rss/edition_world.rss", category: "General", country: "GLOBAL", is_active: true },
        { name: "The New York Times (World)", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "General", country: "GLOBAL", is_active: true },
        { name: "Deutsche Welle (DW World)", url: "https://rss.dw.com/xml/rss-en-world", category: "General", country: "GLOBAL", is_active: true },
        { name: "France 24 (World)", url: "https://www.france24.com/en/rss", category: "General", country: "GLOBAL", is_active: true },
        { name: "NPR News (World)", url: "https://feeds.npr.org/1004/rss.xml", category: "General", country: "GLOBAL", is_active: true },
        { name: "Google News (World)", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", category: "General", country: "GLOBAL", is_active: true }
      ];

      // Verified UK News Defaults (6 Tested & Active Outlets)
      const ukSources = [
        { name: "BBC News (UK)", url: "https://feeds.bbci.co.uk/news/uk/rss.xml", category: "General", country: "UK", is_active: true },
        { name: "The Guardian (UK)", url: "https://www.theguardian.com/uk/rss", category: "General", country: "UK", is_active: true },
        { name: "Sky News (UK)", url: "https://feeds.skynews.com/feeds/rss/uk.xml", category: "General", country: "UK", is_active: true },
        { name: "Google News (UK)", url: "https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en", category: "General", country: "UK", is_active: true },
        { name: "Evening Standard (UK)", url: "https://www.standard.co.uk/news/uk/rss", category: "General", country: "UK", is_active: true },
        { name: "Metro UK", url: "https://metro.co.uk/news/feed/", category: "General", country: "UK", is_active: true }
      ];

      // Verified Saudi Arabia / Middle East News Defaults (6 Tested & Active Outlets)
      const saSources = [
        { name: "Arab News (SA)", url: "https://www.arabnews.com/rss.xml", category: "General", country: "SA", is_active: true },
        { name: "Google News Saudi Arabia (Arabic)", url: "https://news.google.com/rss?hl=ar&gl=SA&ceid=SA:ar", category: "General", country: "SA", is_active: true },
        { name: "Sky News Arabia", url: "https://www.skynewsarabia.com/web/rss", category: "General", country: "SA", is_active: true },
        { name: "BBC Arabic", url: "https://feeds.bbci.co.uk/arabic/rss.xml", category: "General", country: "SA", is_active: true },
        { name: "France 24 (Arabic)", url: "https://www.france24.com/ar/rss", category: "General", country: "SA", is_active: true },
        { name: "DW Arabic (Deutsche Welle)", url: "https://rss.dw.com/xml/rss-ar-all", category: "General", country: "SA", is_active: true }
      ];

      // Automatically normalize any non-standard categories to General
      try {
        await supabase
          .from("scraping_sources")
          .update({ category: "General" })
          .in("category", ["Middle East", "Govt / National", "World"]);
      } catch (e) {}

      // Clean up previous obsolete sources when seeding
      const allAllowedUrls = [...bdSources, ...globalSources, ...ukSources, ...saSources].map(s => s.url);
      try {
        let cleanupQuery = supabase.from("scraping_sources").select("id, url, country");
        if (country !== "ALL") {
          cleanupQuery = cleanupQuery.eq("country", country);
        }
        const { data: currentSources } = await cleanupQuery;
        if (currentSources && currentSources.length > 0) {
          const obsolete = currentSources.filter(s => !allAllowedUrls.includes(s.url));
          for (const item of obsolete) {
            await supabase.from("scraping_sources").delete().eq("id", item.id);
          }
        }
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
          // Keep existing source updated with normalized category and country
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
