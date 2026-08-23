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

/**
 * Universal Content Extraction Pipeline
 * Tier 1: Mozilla Readability (DOM text density algorithm)
 * Tier 2: Schema.org (JSON-LD) and OpenGraph metadata
 * Tier 3: Jina AI Reader + Regex Cleaner fallback
 */
export async function extractArticleContent(url: string, fallbackTitle?: string): Promise<ExtractedArticle> {
  // 1. Attempt Direct HTML Download & Readability / JSON-LD extraction
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = response.data;
    if (typeof html === 'string' && html.length > 500) {
      const $ = cheerio.load(html);

      // OpenGraph & Meta Tags extraction
      const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
      const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
      const ogPublishedTime =
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="pubdate"]').attr('content') ||
        $('meta[name="publish-date"]').attr('content') ||
        null;

      // Tier 1: Mozilla Readability
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

      // Tier 2: JSON-LD Schema.org NewsArticle Extraction
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
    console.warn(`[Extractor] Direct HTML fetch failed for ${url}: ${directHtmlError.message}`);
  }

  // Tier 3: Jina AI Reader Fallback with CleanJinaMarkdown
  try {
    const jinaRes = await axios.get(`https://r.jina.ai/${url}`, { timeout: 15000 });
    const cleanedJina = cleanJinaMarkdown(jinaRes.data);
    if (cleanedJina && cleanedJina.trim().length > 100) {
      return {
        title: fallbackTitle || '',
        bodyText: cleanedJina,
        ogImage: null,
        author: null,
        publishedTime: null,
        extractionMethod: 'jina-ai',
      };
    }
  } catch (jinaError: any) {
    console.warn(`[Extractor] Jina AI fallback failed for ${url}: ${jinaError.message}`);
  }

  // Final Fallback
  return {
    title: fallbackTitle || '',
    bodyText: fallbackTitle || '',
    ogImage: null,
    author: null,
    publishedTime: null,
    extractionMethod: 'fallback',
  };
}
