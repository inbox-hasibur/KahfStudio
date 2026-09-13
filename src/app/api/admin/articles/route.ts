export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { searchParams } = new URL(req.url);
  const userRole = searchParams.get("role") || "admin";

  let query = supabase.from('news_articles').select('*').order('created_at', { ascending: false });
  
  // If non-admin user, return personalized articles
  if (userRole === "user") {
    query = query.or('is_personalized.eq.true,category.eq.Personalized');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const body = await req.json();
  const { id, status, headline, ai_summary } = body;

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (status !== undefined) updateData.status = status;
  if (headline !== undefined) updateData.headline = headline;
  if (ai_summary !== undefined) updateData.ai_summary = ai_summary;

  const { error } = await supabase.from('news_articles').update(updateData).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  let id: string | null = null;
  try {
    const body = await req.json();
    id = body.id;
  } catch (e) {
    const { searchParams } = new URL(req.url);
    id = searchParams.get('id');
  }

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  // Cascade delete bookmarks first
  try {
    await supabase.from('saved_articles').delete().eq('news_id', id);
  } catch (e) { }

  const { error } = await supabase.from('news_articles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deletedId: id });
}

