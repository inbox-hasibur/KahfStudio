import axios from 'axios';
import * as cheerio from 'cheerio';
import { cleanJinaMarkdown } from './cleaner';

export interface ExtractedArticle {
  title: string;
  bodyText: string;
  ogImage?: string | null;
  author?: string | null;
  publishedTime?: string | null;
  extractionMethod: 'jina-ai' | 'cheerio' | 'json-ld' | 'fallback';
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Universal Content Extraction Pipeline (100% Serverless & Edge Compatible)
 * Tier 1 (Primary): Jina AI Reader Proxy (Headless browser + Clean Markdown, Bypasses Cloudflare & Datacenter IP Blocks)
 * Tier 2 (Fallback): Direct HTML Extraction with Cheerio DOM & Schema.org JSON-LD (Strict 4s timeout, 0 native dependencies)
 * Tier 3 (Final Fallback): Fallback Title & Basic Metadata
 */
export async function extractArticleContent(url: string, fallbackTitle?: string): Promise<ExtractedArticle> {
  // Tier 1 (Primary): Jina AI Reader Proxy
  try {
    const jinaRes = await axios.get(`https://r.jina.ai/${url}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KahfStudioBot/1.0)',
        'Accept': 'text/plain, text/markdown, */*',
        'X-No-Cache': 'true',
      },
    });

    const rawJinaData = typeof jinaRes.data === 'string' ? jinaRes.data : '';
    if (rawJinaData && rawJinaData.length > 100) {
      // 1. Extract Title from Jina Markdown header
      let extractedTitle = fallbackTitle || '';
      const titleMatch = rawJinaData.match(/^Title:\s*(.+)$/m) || rawJinaData.match(/^#\s*(.+)$/m);
      if (titleMatch && titleMatch[1]?.trim().length > 5) {
        extractedTitle = titleMatch[1].trim();
      }

      // 2. Extract Author & Publish Date from Jina metadata header if present
      const authorMatch = rawJinaData.match(/^Author:\s*(.+)$/m);
      const author = authorMatch ? authorMatch[1].trim() : null;

      const dateMatch = rawJinaData.match(/^Published Time:\s*(.+)$/m);
      const publishedTime = dateMatch ? dateMatch[1].trim() : null;

      // 3. Extract Cover Image from markdown image syntax
      let ogImage: string | null = null;
      const imgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(rawJinaData)) !== null) {
        const potentialImg = imgMatch[1];
        // Filter out tiny icons / trackers
        if (!potentialImg.includes('icon') && !potentialImg.includes('logo') && !potentialImg.includes('avatar') && !potentialImg.includes('1x1')) {
          ogImage = potentialImg;
          break;
        }
      }

      // 4. Clean Markdown Body Text
      const cleanedJina = cleanJinaMarkdown(rawJinaData);
      if (cleanedJina && cleanedJina.trim().length > 100) {
        return {
          title: extractedTitle,
          bodyText: cleanedJina,
          ogImage,
          author,
          publishedTime,
          extractionMethod: 'jina-ai',
        };
      }
    }
  } catch (jinaError: any) {
    console.warn(`[Extractor] Jina AI Primary failed for ${url}: ${jinaError.message}. Switching to Direct HTML fallback...`);
  }

  // Tier 2 (Fallback): Direct HTML Download & Cheerio / JSON-LD extraction with strict 4s timeout
  try {
    const response = await axios.get(url, {
      timeout: 4000,
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

      // Tier 2a: JSON-LD Schema.org NewsArticle Extraction
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
        console.warn(`[Extractor] JSON-LD fallback error for ${url}:`, jsonLdError);
      }

      // Tier 2b: Cheerio Article Paragraph Extraction
      try {
        const paragraphs: string[] = [];
        $('article p, .story-element-text p, .jw_article_body p, .article-content p, .details-content p, main p, p').each((_, el) => {
          const pText = $(el).text().trim();
          if (pText.length > 25 && !pText.includes('কপিরাইট') && !pText.includes('বিজ্ঞাপন') && !pText.includes('সর্বস্বত্ব সংরক্ষিত')) {
            paragraphs.push(pText);
          }
        });

        if (paragraphs.length >= 2) {
          const combined = paragraphs.join('\n\n');
          const cleanedText = cleanJinaMarkdown(combined);
          if (cleanedText.length > 100) {
            return {
              title: ogTitle || fallbackTitle || '',
              bodyText: cleanedText,
              ogImage,
              author: $('meta[name="author"]').attr('content') || null,
              publishedTime: ogPublishedTime,
              extractionMethod: 'cheerio',
            };
          }
        }
      } catch (cheerioError) {
        console.warn(`[Extractor] Cheerio fallback error for ${url}:`, cheerioError);
      }
    }
  } catch (directHtmlError: any) {
    console.warn(`[Extractor] Direct HTML fallback failed for ${url}: ${directHtmlError.message}`);
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

