/**
 * RSS Feed Crawler
 * Fetches and parses RSS/Atom feeds from registered news portals,
 * filters noise using local rules, and extracts rich metadata (title, summary, images).
 */

import Parser from 'rss-parser';
import { isValidNewsCandidate } from '../filters/news-candidate-validator';
import { decodeHtmlEntities } from '@/lib/scraper/cleaner';
import { NewsSource } from '../sources/regional-sources-registry';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
  },
  timeout: 8000,
});

export interface DiscoveredArticle {
  title: string;
  url: string;
  sourceName: string;
  category: string;
  country: string;
  description: string;
  imageUrl: string | null;
  pubDate: string;
}

/**
 * Crawls a single RSS/Atom source and returns validated articles.
 */
export async function crawlSource(source: NewsSource): Promise<DiscoveredArticle[]> {
  const articles: DiscoveredArticle[] = [];
  try {
    const feed = await parser.parseURL(source.url);
    if (!feed || !Array.isArray(feed.items)) return articles;

    for (const item of feed.items) {
      const rawTitle = decodeHtmlEntities(item.title || '').trim();
      const rawUrl = (item.link || item.guid || '').trim();

      if (!isValidNewsCandidate(rawTitle, rawUrl)) continue;

      // Extract image URL from enclosure, media:content, or HTML description
      let imageUrl: string | null = null;
      if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
      } else if ((item as any)['media:content'] && (item as any)['media:content'].$?.url) {
        imageUrl = (item as any)['media:content'].$.url;
      } else if (item.content || item.summary) {
        const imgMatch = (item.content || item.summary || '').match(/<img[^>]+src=["'](https?:\/\/[^"'>]+)["']/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }
      }

      // Clean description / excerpt
      const rawDesc = item.contentSnippet || item.summary || item.content || '';
      const cleanDesc = decodeHtmlEntities(rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

      const pubDate = item.pubDate 
        ? new Date(item.pubDate).toISOString() 
        : item.isoDate 
        ? new Date(item.isoDate).toISOString() 
        : new Date().toISOString();

      articles.push({
        title: rawTitle,
        url: rawUrl,
        sourceName: source.name,
        category: source.category || 'General',
        country: source.country,
        description: cleanDesc,
        imageUrl: imageUrl,
        pubDate: pubDate,
      });
    }
  } catch (err: any) {
    // Fail-safe: A broken feed never crashes the rest of the crawler
  }

  return articles;
}

/**
 * Crawls a list of sources concurrently in batches to protect network and memory.
 */
export async function crawlBatchSources(
  sources: NewsSource[],
  batchSize: number = 4
): Promise<DiscoveredArticle[]> {
  const allArticles: DiscoveredArticle[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(s => crawlSource(s)));

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allArticles.push(item);
          }
        }
      }
    }
  }

  return allArticles;
}
