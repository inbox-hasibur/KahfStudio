export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET — Frontend এ news পাঠাও
export async function GET(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables!");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category); // Assuming you add category column or use another
    }

    const { data: news, error } = await query;

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: news,
      count: news?.length || 0
    });

  } catch (error: any) {
    console.error("API /news GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// POST — নতুন news save করো
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await req.json();
    
    const { data, error } = await supabase
      .from('news_articles')
      .insert([body])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save news' },
      { status: 500 }
    );
  }
}

