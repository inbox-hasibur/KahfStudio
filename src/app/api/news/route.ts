export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeHtmlEntities } from '@/lib/scraper/cleaner';

// GET — Fetch news with multi-tier sorting & country filtering
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
    const country = searchParams.get('country');
    const source = searchParams.get('source');
    const streamOnly = searchParams.get('stream_only') === 'true';
    const sort = searchParams.get('sort') || 'smart'; // 'smart' or 'date'
    const interestsParam = searchParams.get('interests'); // e.g. "Technology,Sports"
    const limit = parseInt(searchParams.get('limit') || '30');

    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit * 2); // Fetch extra buffer for smart client-side ranking if needed

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (source && source !== 'All') {
      query = query.eq('source', source);
    }

    if (streamOnly) {
      query = query.eq('admin_id', 'rss_stream');
    }

    if (country && country.toUpperCase() !== 'ALL') {
      const cUpper = country.toUpperCase();
      if (cUpper === 'GLOBAL') {
        query = query.eq('country', 'GLOBAL');
      } else if (cUpper === 'BD') {
        query = query.eq('country', 'BD');
      } else {
        query = query.eq('country', cUpper);
      }
    }

    let { data: news, error } = await query;

    // Fallback if country column doesn't exist yet on DB
    if (error && error.message?.includes('country')) {
      const fallbackQuery = supabase
        .from('news_articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit * 2);
      const res = await fallbackQuery;
      news = res.data;
      error = res.error;
    }

    if (error) throw error;

    let processedNews = (news || []).map((item: any) => ({
      ...item,
      headline: decodeHtmlEntities(item.headline || ''),
      ai_summary: item.ai_summary ? decodeHtmlEntities(item.ai_summary) : item.ai_summary,
      raw_content: item.raw_content ? decodeHtmlEntities(item.raw_content) : item.raw_content,
    }));

    // If country is BD, filter out purely English articles from intruding
    if (country && country.toUpperCase() === 'BD') {
      processedNews = processedNews.filter((item: any) => {
        // Must contain at least some Bengali characters
        return /[\u0980-\u09FF]/.test(item.headline || '') || /[\u0980-\u09FF]/.test(item.raw_content || '');
      });
    }

    // Multi-tier Smart Sorting:
    // 1. Primary: Freshness (Date on top)
    // 2. Secondary: User Interests & Importance Score
    if (sort === 'smart' && processedNews.length > 0) {
      const userInterests = interestsParam
        ? interestsParam.split(',').map((s) => s.trim().toLowerCase())
        : [];

      const nowMs = Date.now();

      processedNews = processedNews.sort((a: any, b: any) => {
        const timeA = new Date(a.published_at || a.created_at).getTime();
        const timeB = new Date(b.published_at || b.created_at).getTime();

        // Calculate age penalty in hours
        const ageHoursA = Math.max(0, (nowMs - timeA) / (1000 * 60 * 60));
        const ageHoursB = Math.max(0, (nowMs - timeB) / (1000 * 60 * 60));

        // Importance Score (default 50)
        const scoreA = Number(a.importance_score) || 50;
        const scoreB = Number(b.importance_score) || 50;

        // Interest Boost (+25 points if category matches user interest)
        const interestBoostA = userInterests.includes((a.category || '').toLowerCase()) ? 25 : 0;
        const interestBoostB = userInterests.includes((b.category || '').toLowerCase()) ? 25 : 0;

        // Composite rank: Higher is better
        // Freshness decay (-2.5 points per hour of age) + Importance + Interest Boost
        const rankA = (scoreA + interestBoostA) - (ageHoursA * 2.5);
        const rankB = (scoreB + interestBoostB) - (ageHoursB * 2.5);

        return rankB - rankA;
      });
    }

    // Apply exact requested limit
    const finalNews = processedNews.slice(0, limit);
    const availableSources = Array.from(
      new Set(processedNews.map((n: any) => n.source).filter(Boolean))
    );

    return NextResponse.json({
      success: true,
      data: finalNews,
      count: finalNews.length,
      sources: availableSources,
      sort,
    });

  } catch (error: any) {
    console.error("API /news GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// POST — Insert news article
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save news' },
      { status: 500 }
    );
  }
}

// DELETE — Remove news article by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Cascade delete any bookmark references first to avoid foreign key violations
    try {
      await supabase.from('saved_articles').delete().eq('news_id', id);
    } catch (e) { }

    const { error } = await supabase
      .from('news_articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Article successfully deleted',
      deletedId: id,
    });
  } catch (error: any) {
    console.error("API /news DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete news article' },
      { status: 500 }
    );
  }
}

