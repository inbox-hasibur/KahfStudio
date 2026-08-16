import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/bookmarks?userId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Fetch saved news IDs for this user
    const { data: savedRows, error: savedError } = await supabase
      .from('saved_articles')
      .select('news_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (savedError) {
      console.error('Fetch saved articles error:', savedError);
      return NextResponse.json({ success: false, error: savedError.message }, { status: 500 });
    }

    const savedIds = (savedRows || []).map(r => r.news_id);

    if (savedIds.length === 0) {
      return NextResponse.json({ success: true, savedIds: [], data: [] });
    }

    // Fetch full article details for saved news IDs
    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('*')
      .in('id', savedIds);

    if (articlesError) {
      console.error('Fetch articles error:', articlesError);
      return NextResponse.json({ success: false, error: articlesError.message }, { status: 500 });
    }

    // Sort articles to match saved order
    const articleMap = new Map((articles || []).map(a => [a.id, a]));
    const orderedArticles = savedIds.map(id => articleMap.get(id)).filter(Boolean);

    return NextResponse.json({
      success: true,
      savedIds,
      data: orderedArticles,
    });
  } catch (error: any) {
    console.error('GET /api/bookmarks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/bookmarks (Save a news article)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, newsId } = body;

    if (!userId || !newsId) {
      return NextResponse.json({ success: false, error: 'User ID and News ID are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Insert saved article record
    const { error: insertError } = await supabase
      .from('saved_articles')
      .upsert({ user_id: userId, news_id: newsId }, { onConflict: 'user_id,news_id' });

    if (insertError) {
      console.error('Insert saved article error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, isSaved: true, message: 'Article saved successfully' });
  } catch (error: any) {
    console.error('POST /api/bookmarks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/bookmarks (Remove a saved news article)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');
    let newsId = searchParams.get('newsId');

    if (!userId || !newsId) {
      const body = await req.json().catch(() => ({}));
      userId = userId || body.userId;
      newsId = newsId || body.newsId;
    }

    if (!userId || !newsId) {
      return NextResponse.json({ success: false, error: 'User ID and News ID are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { error: deleteError } = await supabase
      .from('saved_articles')
      .delete()
      .eq('user_id', userId)
      .eq('news_id', newsId);

    if (deleteError) {
      console.error('Delete saved article error:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, isSaved: false, message: 'Article removed from saved' });
  } catch (error: any) {
    console.error('DELETE /api/bookmarks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
