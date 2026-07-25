import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.from("scraping_sources").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ sources: data });
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
      const { name, url, category } = payload;
      const { error } = await supabase.from("scraping_sources").insert({ name, url, category, is_active: true });
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
      const defaults = [
        { name: "Prothom Alo (RSS)", url: "https://www.prothomalo.com/feed", category: "General", is_active: true },
        { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", is_active: true },
        { name: "VOA Bangla", url: "https://www.voabangla.com/api/z--r-rymqv", category: "General", is_active: true }
      ];
      for (const src of defaults) {
        await supabase.from("scraping_sources").insert(src);
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
