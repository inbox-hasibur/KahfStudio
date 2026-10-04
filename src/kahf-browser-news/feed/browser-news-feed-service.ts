/**
 * Browser News Feed Service
 * Formats, filters, ranks, and delivers news cards strictly compatible
 * with the Kahf Browser Startpage & PostgreSQL `cards` table schema.
 */

import { createClient } from '@supabase/supabase-js';
import { decodeHtmlEntities } from '@/lib/scraper/cleaner';

export interface FeedQueryOptions {
  location?: string | null;
  country?: string | null;
  language?: string | null;
  category?: string | null;
  source?: string | null;
  sort?: string | null;
  limit?: number;
  page?: number;
  since?: string | null;
}

export interface KahfBrowserCard {
  language: 'bn' | 'ar' | 'en';
  type: 'ARTICLE';
  title: string;
  summary: string;
  thumbnail_url: string | null;
  source_url: string;
  published_at: string;
  category: string;
  location: string | null;
  id?: string;
  source?: string;
  audio_url?: string | null;
  importance?: number;
  has_audio?: boolean;
}

export interface BrowserFeedResponse {
  success: boolean;
  count: number;
  page: number;
  limit: number;
  sort: string;
  language: string;
  location: string | null;
  data: KahfBrowserCard[];
  error?: string;
}

export async function fetchBrowserNewsFeed(options: FeedQueryOptions): Promise<BrowserFeedResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const langQuery = options.language?.toLowerCase();
  const locationParam = options.location || options.country;
  const category = options.category;
  const source = options.source;
  const sort = options.sort || 'smart';
  const limit = Math.min(Math.max(options.limit || 50, 1), 200);
  const page = Math.max(options.page || 1, 1);
  const since = options.since;

  // Resolve target country / location
  let targetCountry: string | string[] | null = null;
  let resolvedLocationLabel: string | null = null;

  if (locationParam) {
    const locClean = locationParam.trim().toLowerCase();
    if (locClean === 'bd' || locClean === 'bangladesh') {
      targetCountry = 'BD';
      resolvedLocationLabel = 'Bangladesh';
    } else if (locClean === 'sa' || locClean === 'saudi' || locClean === 'saudi arabia') {
      targetCountry = 'SA';
      resolvedLocationLabel = 'Saudi Arabia';
    } else if (locClean === 'uk' || locClean === 'united kingdom' || locClean === 'britain') {
      targetCountry = 'UK';
      resolvedLocationLabel = 'UK';
    } else if (locClean === 'us' || locClean === 'usa' || locClean === 'united states') {
      targetCountry = 'US';
      resolvedLocationLabel = 'US';
    } else if (locClean === 'global' || locClean === 'world' || locClean === 'international') {
      targetCountry = 'GLOBAL';
      resolvedLocationLabel = 'Global';
    } else if (locClean !== 'all') {
      targetCountry = locationParam.trim().toUpperCase();
      resolvedLocationLabel = locationParam.trim();
    }
  }

  // Determine effective language
  let effectiveLang: string | null = null;
  if (langQuery) {
    effectiveLang = langQuery;
  } else if (!targetCountry) {
    effectiveLang = 'bn';
  } else if (targetCountry === 'BD') {
    effectiveLang = 'bn';
  } else if (targetCountry === 'SA') {
    effectiveLang = 'ar';
  } else if (targetCountry === 'UK' || targetCountry === 'US' || targetCountry === 'GLOBAL') {
    effectiveLang = 'en';
  }

  // Build Supabase Query
  let query = supabase
    .from('news_articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  // Location filter
  if (targetCountry) {
    if (Array.isArray(targetCountry)) {
      query = query.in('country', targetCountry);
    } else {
      query = query.eq('country', targetCountry);
    }
  } else if (effectiveLang === 'bn') {
    query = query.eq('country', 'BD');
  } else if (effectiveLang === 'ar') {
    query = query.eq('country', 'SA');
  } else if (effectiveLang === 'en') {
    query = query.in('country', ['GLOBAL', 'UK', 'US']);
  }

  // Since timestamp filter
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      query = query.gt('published_at', sinceDate.toISOString());
    }
  }

  // Category filter
  if (category && category.toLowerCase() !== 'all') {
    query = query.ilike('category', category.trim());
  }

  // Source publisher filter
  if (source && source.toLowerCase() !== 'all') {
    query = query.eq('source', source.trim());
  }

  const fetchLimit = sort === 'smart' ? Math.max(limit * 3, 100) : limit;
  const offset = (page - 1) * limit;

  if (sort === 'date') {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.limit(fetchLimit);
  }

  const { data: news, error } = await query;
  if (error) {
    throw error;
  }

  const rawArticles = news || [];

  // Transform into cards
  let cards: KahfBrowserCard[] = rawArticles.map((item: any) => {
    const cleanHeadline = decodeHtmlEntities(item.headline || '').trim();
    const rawText = decodeHtmlEntities(item.raw_content || '').trim();
    const aiSummary = decodeHtmlEntities(item.ai_summary || '').trim();

    const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const sanitizedHeadline = stripHtml(cleanHeadline);
    const sanitizedSummary = stripHtml(aiSummary || rawText || cleanHeadline);

    const cleanSummary = (sanitizedSummary || sanitizedHeadline).slice(0, 1000);

    let itemLang: 'bn' | 'ar' | 'en' = 'en';
    if (item.country === 'BD' || /[\u0980-\u09FF]/.test(cleanHeadline)) {
      itemLang = 'bn';
    } else if (item.country === 'SA' || /[\u0600-\u06FF]/.test(cleanHeadline)) {
      itemLang = 'ar';
    }

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
      language: itemLang,
      type: 'ARTICLE' as const,
      title: sanitizedHeadline.slice(0, 500),
      summary: cleanSummary,
      thumbnail_url: item.image_url || null,
      source_url: item.original_url,
      published_at: publishedAt,
      category: item.category || 'General',
      location: location,
      id: item.id,
      source: item.source || 'Web',
      audio_url: audioUrl,
      importance: importance,
      has_audio: Boolean(audioUrl),
    };
  });

  // Language filter if specified
  if (effectiveLang && effectiveLang !== 'all') {
    cards = cards.filter(c => c.language === effectiveLang);
  }

  // Smart Ranking
  if (sort === 'smart' && cards.length > 0) {
    const nowMs = Date.now();
    cards = cards.sort((a, b) => {
      const timeA = new Date(a.published_at).getTime();
      const timeB = new Date(b.published_at).getTime();

      const ageHoursA = Math.max(0, (nowMs - timeA) / (1000 * 60 * 60));
      const ageHoursB = Math.max(0, (nowMs - timeB) / (1000 * 60 * 60));

      const audioBonusA = a.has_audio ? 10 : 0;
      const audioBonusB = b.has_audio ? 10 : 0;

      const rankA = ((a.importance || 50) + audioBonusA) - (ageHoursA * 2.5);
      const rankB = ((b.importance || 50) + audioBonusB) - (ageHoursB * 2.5);

      return rankB - rankA;
    });

    cards = cards.slice(offset, offset + limit);
  }

  return {
    success: true,
    count: cards.length,
    page,
    limit,
    sort,
    language: effectiveLang || 'all',
    location: resolvedLocationLabel || locationParam || null,
    data: cards,
  };
}
