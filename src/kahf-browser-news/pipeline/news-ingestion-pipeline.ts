/**
 * News Ingestion Pipeline
 * Orchestrates multi-source crawling, deduplication, and persistence into Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { crawlBatchSources, DiscoveredArticle } from '../crawler/rss-feed-crawler';
import { getDefaultSourcesForRegion, NewsSource } from '../sources/regional-sources-registry';

export interface IngestionResult {
  success: boolean;
  region: string;
  sourcesCrawled: number;
  discoveredCount: number;
  newSavedCount: number;
  duplicatesSkipped: number;
  durationMs: number;
}

/**
 * Runs the ingestion pipeline for a given region (or all regions).
 */
export async function runNewsIngestionPipeline(region: string = 'ALL'): Promise<IngestionResult> {
  const startTime = Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch sources from database or fallback to default registry
  let sources: NewsSource[] = [];
  try {
    let query = supabase.from('scraping_sources').select('*').eq('is_active', true);
    if (region && region.toUpperCase() !== 'ALL') {
      query = query.eq('country', region.toUpperCase());
    }
    const { data: dbSources } = await query;
    if (dbSources && dbSources.length > 0) {
      sources = dbSources.map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
        category: s.category || 'General',
        country: s.country || 'BD',
        isActive: s.is_active,
      }));
    }
  } catch (e) { }

  if (sources.length === 0) {
    sources = getDefaultSourcesForRegion(region);
  }

  // 2. Crawl articles from sources
  const discoveredArticles = await crawlBatchSources(sources, 5);

  if (discoveredArticles.length === 0) {
    return {
      success: true,
      region,
      sourcesCrawled: sources.length,
      discoveredCount: 0,
      newSavedCount: 0,
      duplicatesSkipped: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // 3. Deduplicate against existing articles in DB
  const urls = discoveredArticles.map(a => a.url);
  const existingUrls = new Set<string>();

  // Chunk URL check in batches of 50
  for (let i = 0; i < urls.length; i += 50) {
    const chunk = urls.slice(i, i + 50);
    try {
      const { data: existing } = await supabase
        .from('news_articles')
        .select('original_url')
        .in('original_url', chunk);

      if (existing) {
        existing.forEach(row => existingUrls.add(row.original_url));
      }
    } catch (e) { }
  }

  const newArticles = discoveredArticles.filter(a => !existingUrls.has(a.url));

  // 4. Transform into database rows
  const rowsToInsert = newArticles.map(item => {
    let determinedCountry = item.country || 'BD';
    const hasBn = /[\u0980-\u09FF]/.test(item.title);
    const hasAr = /[\u0600-\u06FF]/.test(item.title);

    if (determinedCountry === 'BD' && !hasBn && !hasAr) {
      determinedCountry = 'GLOBAL';
    } else if (determinedCountry === 'SA' && !hasAr) {
      determinedCountry = 'GLOBAL';
    }

    const cleanSummary = (item.description || item.title).slice(0, 500);

    return {
      headline: item.title,
      raw_content: item.description || item.title,
      ai_summary: cleanSummary,
      status: 'published',
      original_url: item.url,
      source: item.sourceName,
      category: item.category || 'General',
      country: determinedCountry,
      image_url: item.imageUrl || null,
      published_at: item.pubDate,
      importance_score: 50,
      admin_id: 'kahf_browser_engine',
    };
  });

  // 5. Batch insert into database
  let savedCount = 0;
  for (let i = 0; i < rowsToInsert.length; i += 25) {
    const chunk = rowsToInsert.slice(i, i + 25);
    try {
      const { error: insertErr } = await supabase.from('news_articles').insert(chunk);
      if (!insertErr) {
        savedCount += chunk.length;
      } else {
        // Fallback to row-by-row on conflict
        for (const row of chunk) {
          try {
            const { error } = await supabase.from('news_articles').insert(row);
            if (!error) savedCount++;
          } catch (e) { }
        }
      }
    } catch (e) { }
  }

  return {
    success: true,
    region,
    sourcesCrawled: sources.length,
    discoveredCount: discoveredArticles.length,
    newSavedCount: savedCount,
    duplicatesSkipped: discoveredArticles.length - newArticles.length,
    durationMs: Date.now() - startTime,
  };
}
