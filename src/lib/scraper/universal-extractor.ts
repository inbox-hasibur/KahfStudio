import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { cleanJinaMarkdown } from './cleaner';

export interface ExtractedArticle {
  title: string;
  bodyText: string;
  ogImage?: string | null;
  author?: string | null;
  publishedTime?: string | null;
  extractionMethod: 'readability' | 'json-ld' | 'jina-ai' | 'fallback';
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': BROWSER_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Universal Content Extraction Pipeline with Resilient Datacenter/Serverless Failover
 * Tier 1: Direct HTML (Mozilla Readability + JSON-LD) - Fast 3.5s timeout
 * Tier 2: Jina AI Reader Proxy (Residential Proxy bypass for Cloudflare/WAF) - 7s timeout
 * Tier 3: Minimal fallback
 */
export async function extractArticleContent(url: string, fallbackTitle?: string): Promise<ExtractedArticle> {
  // 1. Attempt Direct HTML Download (Short 3.5s timeout to fail fast on Cloudflare/WAF blocks)
  try {
    const response = await axios.get(url, {
      timeout: 3500,
      headers: BROWSER_HEADERS,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = response.data;
    if (typeof html === 'string' && html.length > 500 && !html.includes('Just a moment...') && !html.includes('cf-browser-verification')) {
      const $ = cheerio.load(html);

      // OpenGraph & Meta Tags extraction
      const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
      const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
      const ogPublishedTime =
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="pubdate"]').attr('content') ||
        $('meta[name="publish-date"]').attr('content') ||
        null;

      // Tier 1a: Mozilla Readability
      try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article && article.textContent && article.textContent.trim().length > 150) {
          const cleanedText = cleanJinaMarkdown(article.textContent);
          if (cleanedText.length > 100) {
            return {
              title: article.title || ogTitle || fallbackTitle || '',
              bodyText: cleanedText,
              ogImage,
              author: article.byline || null,
              publishedTime: ogPublishedTime,
              extractionMethod: 'readability',
            };
          }
        }
      } catch (readabilityError) {
        console.warn(`[Extractor] Readability error for ${url}:`, readabilityError);
      }

      // Tier 1b: JSON-LD Schema.org NewsArticle Extraction
      try {
        const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
        for (const scriptElem of jsonLdScripts) {
          const scriptContent = $(scriptElem).html();
          if (!scriptContent) continue;

          try {
            const parsed = JSON.parse(scriptContent);
            const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];

            for (const item of candidates) {
              if (
                item &&
                (item['@type'] === 'NewsArticle' ||
                  item['@type'] === 'Article' ||
                  item['@type'] === 'BlogPosting' ||
                  item['@type'] === 'ReportageNewsArticle')
              ) {
                const articleBody = item.articleBody || item.description || item.text;
                if (articleBody && articleBody.trim().length > 150) {
                  const cleanedBody = cleanJinaMarkdown(articleBody);
                  if (cleanedBody.length > 100) {
                    return {
                      title: item.headline || ogTitle || fallbackTitle || '',
                      bodyText: cleanedBody,
                      ogImage: item.image?.url || (typeof item.image === 'string' ? item.image : ogImage),
                      author: item.author?.name || null,
                      publishedTime: item.datePublished || ogPublishedTime,
                      extractionMethod: 'json-ld',
                    };
                  }
                }
              }
            }
          } catch (jsonErr) {
            // Ignore invalid JSON-LD scripts
          }
        }
      } catch (jsonLdError) {
        console.warn(`[Extractor] JSON-LD error for ${url}:`, jsonLdError);
      }
    }
  } catch (directHtmlError: any) {
    console.warn(`[Extractor] Direct fetch blocked/timed out (${directHtmlError.message}). Engaging Jina AI Residential Proxy for ${url}...`);
  }

  // Tier 2: Jina AI Reader Residential Proxy (Bypasses Cloudflare / Datacenter IP bans)
  try {
    const jinaRes = await axios.get(`https://r.jina.ai/${url}`, {
      timeout: 7000,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'X-No-Cache': 'true',
        'X-Timeout': '6',
        'X-With-Generated-Alt': 'true',
      },
    });

    const rawJinaData = typeof jinaRes.data === 'string' ? jinaRes.data : '';
    
    if (rawJinaData && rawJinaData.trim().length > 80) {
      // 1. Extract cover image from markdown if available: ![alt](https://...)
      let extractedImage: string | null = null;
      const imgMatch = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/.exec(rawJinaData);
      if (imgMatch && imgMatch[1]) {
        // Filter out tracking pixels / tiny icons
        const foundImg = imgMatch[1];
        if (!foundImg.includes('favicon') && !foundImg.includes('avatar') && !foundImg.includes('1x1')) {
          extractedImage = foundImg;
        }
      }

      // 2. Extract title if fallbackTitle is generic
      let extractedTitle = fallbackTitle || '';
      const titleMatch = /^#\s+(.+)$/m.exec(rawJinaData) || /Title:\s*(.+)/i.exec(rawJinaData);
      if (titleMatch && titleMatch[1]) {
        const foundTitle = titleMatch[1].trim();
        if (foundTitle.length > 5 && (!extractedTitle || extractedTitle.length < 5)) {
          extractedTitle = foundTitle;
        }
      }

      // 3. Clean full text
      const cleanedJina = cleanJinaMarkdown(rawJinaData);
      if (cleanedJina && cleanedJina.trim().length > 80) {
        return {
          title: extractedTitle,
          bodyText: cleanedJina,
          ogImage: extractedImage,
          author: null,
          publishedTime: null,
          extractionMethod: 'jina-ai',
        };
      }
    }
  } catch (jinaError: any) {
    console.warn(`[Extractor] Jina AI proxy fallback error for ${url}: ${jinaError.message}`);
  }

  // Tier 3: Final Fallback
  return {
    title: fallbackTitle || '',
    bodyText: fallbackTitle || '',
    ogImage: null,
    author: null,
    publishedTime: null,
    extractionMethod: 'fallback',
  };
}
