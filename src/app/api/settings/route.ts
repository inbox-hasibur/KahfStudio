import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.from("system_settings").select("*");
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();

    if (!key || typeof value === "undefined") {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    // Bypass RLS using the service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Find existing keys to update
    const { data: existing, error: selectErr } = await supabase
      .from("system_settings")
      .select("id")
      .eq("setting_key", key);

    if (selectErr) throw selectErr;

    if (existing && existing.length > 0) {
      // Update all existing rows to fix any duplicates gracefully
      for (const row of existing) {
        await supabase
          .from("system_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    } else {
      // Insert new row
      await supabase
        .from("system_settings")
        .insert({ setting_key: key, setting_value: value });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings save error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
