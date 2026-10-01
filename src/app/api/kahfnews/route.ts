export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeHtmlEntities } from '@/lib/scraper/cleaner';

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * GET /api/kahfnews
 * Dedicated feed endpoint tailored for Kahf Browser Startpage & Ingest Pipeline.
 *
 * Query Parameters:
 * - language: 'bn' (default) | 'en' | 'ar' | 'all'
 * - category: Filter by category (e.g. 'Technology', 'Sports', 'General')
 * - source: Filter by specific publisher (e.g. 'Prothom Alo')
 * - sort: 'smart' (default - freshness + importance decay) | 'date' (pure chronological DESC)
 * - limit: Number of cards to return (default: 50, max: 200)
 * - page: Pagination page number (default: 1)
 * - since: ISO timestamp string to fetch articles newer than this date
 */
export async function GET(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!");
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { searchParams } = new URL(req.url);
    const langParam = (searchParams.get('language') || 'bn').toLowerCase();
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const sort = searchParams.get('sort') || 'smart';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const since = searchParams.get('since');

    // Build Supabase Query
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Optional timestamp filtering
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query = query.gt('published_at', sinceDate.toISOString());
      }
    }

    // Optional category filtering
    if (category && category.toLowerCase() !== 'all') {
      query = query.ilike('category', category.trim());
    }

    // Optional source filtering
    if (source && source.toLowerCase() !== 'all') {
      query = query.eq('source', source.trim());
    }

    // Language / Country filter at DB query level when possible
    if (langParam === 'bn') {
      query = query.eq('country', 'BD');
    } else if (langParam === 'ar') {
      query = query.eq('country', 'SA');
    } else if (langParam === 'en') {
      query = query.in('country', ['GLOBAL', 'UK', 'US']);
    }

    // Overfetch buffer when using smart ranking to ensure high quality top-N ranking
    const fetchLimit = sort === 'smart' ? Math.max(limit * 3, 100) : limit;
    const offset = (page - 1) * limit;

    if (sort === 'date') {
      query = query.range(offset, offset + limit - 1);
    } else {
      // For smart sort, fetch top pool ordered by published_at
      query = query.limit(fetchLimit);
    }

    const { data: news, error } = await query;
    if (error) {
      console.error("Supabase query error in /api/kahfnews:", error);
      throw error;
    }

    const rawArticles = news || [];

    // Transform and map to Kahf Browser Card Contract
    let cards = rawArticles.map((item: any) => {
      const cleanHeadline = decodeHtmlEntities(item.headline || '').trim();
      const rawText = decodeHtmlEntities(item.raw_content || '').trim();
      const aiSummary = decodeHtmlEntities(item.ai_summary || '').trim();

      // Strip HTML tags and clean up
      const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const sanitizedHeadline = stripHtml(cleanHeadline);
      const sanitizedSummary = stripHtml(aiSummary || rawText || cleanHeadline);

      // Kahf Browser requires a non-empty summary (<= 1000 chars)
      const cleanSummary = (sanitizedSummary || sanitizedHeadline).slice(0, 1000);

      // Determine Language ('bn' | 'ar' | 'en')
      let itemLang: 'bn' | 'ar' | 'en' = 'en';
      if (item.country === 'BD' || /[\u0980-\u09FF]/.test(cleanHeadline)) {
        itemLang = 'bn';
      } else if (item.country === 'SA' || /[\u0600-\u06FF]/.test(cleanHeadline)) {
        itemLang = 'ar';
      }

      // Determine Location
      const location = item.country === 'BD' 
        ? 'Bangladesh' 
        : item.country === 'SA' 
        ? 'Saudi Arabia' 
        : item.country || null;

      const publishedAt = item.published_at 
        ? new Date(item.published_at).toISOString() 
        : new Date(item.created_at || Date.now()).toISOString();

      const audioUrl = item.audio_bn_summary || item.audio_url || null;
      const importance = Number(item.importance_score) || 50;

      return {
        // === 100% Matching Kahf Browser `cards` schema ===
        language: itemLang,
        type: 'ARTICLE' as const,
        title: cleanHeadline.slice(0, 500),
        summary: cleanSummary,
        thumbnail_url: item.image_url || null,
        source_url: item.original_url,
        published_at: publishedAt,
        category: item.category || 'General',
        location: location,

        // === KahfStudio Extra Rich Attributes (Safe for current ingestion, ready for future expansion) ===
        id: item.id,
        source: item.source || 'Web',
        audio_url: audioUrl,
        importance: importance,
        has_audio: Boolean(audioUrl),
      };
    });

    // Language enforcement filter if not 'all'
    if (langParam !== 'all') {
      cards = cards.filter(card => card.language === langParam);
    }

    // Multi-tier Smart Ranking if sort === 'smart'
    if (sort === 'smart' && cards.length > 0) {
      const nowMs = Date.now();
      cards = cards.sort((a, b) => {
        const timeA = new Date(a.published_at).getTime();
        const timeB = new Date(b.published_at).getTime();

        // Freshness decay: penalize older articles (-2.5 points per hour of age)
        const ageHoursA = Math.max(0, (nowMs - timeA) / (1000 * 60 * 60));
        const ageHoursB = Math.max(0, (nowMs - timeB) / (1000 * 60 * 60));

        // Audio bonus: slightly favor articles with studio voice narration (+10 points)
        const audioBonusA = a.has_audio ? 10 : 0;
        const audioBonusB = b.has_audio ? 10 : 0;

        const rankA = (a.importance + audioBonusA) - (ageHoursA * 2.5);
        const rankB = (b.importance + audioBonusB) - (ageHoursB * 2.5);

        return rankB - rankA;
      });

      // Slice to page limit for smart ranking
      cards = cards.slice(offset, offset + limit);
    }

    return NextResponse.json(
      {
        success: true,
        count: cards.length,
        page,
        limit,
        sort,
        language: langParam,
        data: cards,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error("API /api/kahfnews GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch KahfNews feed',
      },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
