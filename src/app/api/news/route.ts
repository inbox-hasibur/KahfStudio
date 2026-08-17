export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    if (country && country !== 'ALL') {
      // If country is specified, match country
      query = query.eq('country', country);
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

    let processedNews = news || [];

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

    return NextResponse.json({
      success: true,
      data: finalNews,
      count: finalNews.length,
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
