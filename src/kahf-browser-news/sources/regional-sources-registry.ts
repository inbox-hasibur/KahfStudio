/**
 * Regional News Sources Registry
 * Manages default and dynamic RSS news sources partitioned by region (BD, UK, SA, GLOBAL).
 */

export interface NewsSource {
  id?: string;
  name: string;
  url: string;
  category: string;
  country: 'BD' | 'UK' | 'SA' | 'GLOBAL' | string;
  isActive: boolean;
}

export const DEFAULT_REGIONAL_SOURCES: NewsSource[] = [
  // --- Bangladesh (BD) ---
  { name: 'Prothom Alo', url: 'https://www.prothomalo.com/feed', category: 'General', country: 'BD', isActive: true },
  { name: 'Daily Ittefaq', url: 'https://www.ittefaq.com.bd/feed/', category: 'General', country: 'BD', isActive: true },
  { name: 'BBC Bangla', url: 'https://feeds.bbci.co.uk/bengali/rss.xml', category: 'General', country: 'BD', isActive: true },
  { name: 'Channel i News', url: 'https://www.channelionline.com/feed/', category: 'General', country: 'BD', isActive: true },
  { name: 'BD24Live', url: 'https://www.bd24live.com/bangla/feed', category: 'General', country: 'BD', isActive: true },
  { name: 'Google News (BD)', url: 'https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn', category: 'General', country: 'BD', isActive: true },
  { name: 'The Daily Star (BD)', url: 'https://www.thedailystar.net/frontpage/rss.xml', category: 'General', country: 'BD', isActive: true },

  // --- United Kingdom (UK) ---
  { name: 'BBC News (UK)', url: 'https://feeds.bbci.co.uk/news/uk/rss.xml', category: 'General', country: 'UK', isActive: true },
  { name: 'The Guardian (UK)', url: 'https://www.theguardian.com/uk/rss', category: 'General', country: 'UK', isActive: true },
  { name: 'Sky News (UK)', url: 'https://feeds.skynews.com/feeds/rss/uk.xml', category: 'General', country: 'UK', isActive: true },
  { name: 'Google News (UK)', url: 'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en', category: 'General', country: 'UK', isActive: true },
  { name: 'Evening Standard (UK)', url: 'https://www.standard.co.uk/news/uk/rss', category: 'General', country: 'UK', isActive: true },

  // --- Saudi Arabia & Middle East (SA - Arabic) ---
  { name: 'Arab News', url: 'https://www.arabnews.com/rss.xml', category: 'General', country: 'SA', isActive: true },
  { name: 'Google News (SA Arabic)', url: 'https://news.google.com/rss?hl=ar&gl=SA&ceid=SA:ar', category: 'General', country: 'SA', isActive: true },
  { name: 'Sky News Arabia', url: 'https://www.skynewsarabia.com/web/rss', category: 'General', country: 'SA', isActive: true },
  { name: 'BBC Arabic', url: 'https://feeds.bbci.co.uk/arabic/rss.xml', category: 'General', country: 'SA', isActive: true },
  { name: 'France 24 (Arabic)', url: 'https://www.france24.com/ar/rss', category: 'General', country: 'SA', isActive: true },

  // --- Global / International ---
  { name: 'BBC News (World)', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'General', country: 'GLOBAL', isActive: true },
  { name: 'Al Jazeera English', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'General', country: 'GLOBAL', isActive: true },
  { name: 'The Guardian (World)', url: 'https://www.theguardian.com/world/rss', category: 'General', country: 'GLOBAL', isActive: true },
  { name: 'Deutsche Welle (World)', url: 'https://rss.dw.com/xml/rss-en-world', category: 'General', country: 'GLOBAL', isActive: true },
  { name: 'NPR News (World)', url: 'https://feeds.npr.org/1004/rss.xml', category: 'General', country: 'GLOBAL', isActive: true },
  { name: 'Google News (World)', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', category: 'General', country: 'GLOBAL', isActive: true },
];

/**
 * Filter default sources by region/country.
 */
export function getDefaultSourcesForRegion(region?: string): NewsSource[] {
  if (!region || region.toUpperCase() === 'ALL') {
    return DEFAULT_REGIONAL_SOURCES.filter(s => s.isActive);
  }
  const clean = region.toUpperCase();
  return DEFAULT_REGIONAL_SOURCES.filter(s => s.country.toUpperCase() === clean && s.isActive);
}
