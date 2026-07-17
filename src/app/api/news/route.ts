import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET — Frontend এ news পাঠাও
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('news_articles')
      .select('*')
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

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// POST — নতুন news save করো
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
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
