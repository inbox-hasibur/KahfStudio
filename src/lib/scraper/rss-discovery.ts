import Parser from 'rss-parser';

export interface DiscoveredRssFeed {
  feedUrl: string;
  title?: string;
  description?: string;
}

export interface OgMetadata {
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KahfNewsBot/1.0';

const parser = new Parser({
  timeout: 4000,
  headers: {
    'User-Agent': BROWSER_USER_AGENT,
    'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8',
  },
});

/**
 * Kahf-Browser-style streamed truncation:
 * Reads only up to maxBytes (default 768 KB) from a response stream, then cancels the reader.
 * This avoids downloading multi-megabyte news web pages just to read <head> metadata.
 */
export async function fetchTruncatedText(
  url: string,
  maxBytes: number = 768 * 1024,
  timeoutMs: number = 5000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok || !response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    let accumulatedText = '';
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        accumulatedText += decoder.decode(value, { stream: true });
        if (totalBytes >= maxBytes) {
          try {
            await reader.cancel();
          } catch (e) {
            // Ignore cancel errors
          }
          break;
        }
      }
    }

    return accumulatedText;
  } catch (err: any) {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts OpenGraph image, title, and description from the first 768 KB of a web page.
 * Handles both attribute orders (property="..." content="..." and content="..." property="...").
 */
export async function fetchArticleOgMeta(
  url: string,
  timeoutMs: number = 4000
): Promise<OgMetadata> {
  const html = await fetchTruncatedText(url, 768 * 1024, timeoutMs);
  if (!html) {
    return { ogImage: null, ogTitle: null, ogDescription: null };
  }

  // Helper regex matching meta attributes regardless of attribute order
  const extractMetaContent = (propName: string): string | null => {
    // 1. property="prop" content="value"
    const regex1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return match1[1].trim();

    // 2. content="value" property="prop"
    const regex2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propName}["']`,
      'i'
    );
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return match2[1].trim();

    return null;
  };

  // Image: og:image -> twitter:image
  let ogImage = extractMetaContent('og:image') || extractMetaContent('twitter:image');
  if (ogImage) {
    // Fix relative or protocol-relative image URLs
    if (ogImage.startsWith('//')) {
      ogImage = `https:${ogImage}`;
    } else if (ogImage.startsWith('/')) {
      try {
        const origin = new URL(url).origin;
        ogImage = `${origin}${ogImage}`;
      } catch (e) { }
    }
  }

  // Title: og:title -> twitter:title -> <title>
  let ogTitle = extractMetaContent('og:title') || extractMetaContent('twitter:title');
  if (!ogTitle) {
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTagMatch && titleTagMatch[1]) {
      ogTitle = titleTagMatch[1].trim();
    }
  }

  // Description: og:description -> twitter:description -> description
  const ogDescription =
    extractMetaContent('og:description') ||
    extractMetaContent('twitter:description') ||
    extractMetaContent('description');

  return {
    ogImage: ogImage && ogImage.startsWith('http') ? ogImage : null,
    ogTitle: ogTitle || null,
    ogDescription: ogDescription || null,
  };
}

/**
 * Smart RSS Auto-Discovery:
 * 1. Checks if URL is already a direct RSS/Atom feed.
 * 2. If HTML, reads the first 128 KB of <head> and looks for:
 *    <link rel="alternate" type="application/rss+xml" href="..."> or atom+xml
 * 3. Probes common RSS endpoints (/feed, /rss, /rss.xml, /news/rss.xml)
 * Returns the valid RSS feed URL or null.
 */
export async function discoverRssFeed(rawUrl: string): Promise<string | null> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  // 1. Check if the URL itself is directly parseable by rss-parser
  try {
    const directFeed = await parser.parseURL(targetUrl);
    if (directFeed && directFeed.items && directFeed.items.length > 0) {
      return targetUrl;
    }
  } catch (e) {
    // Not directly an RSS feed or requires discovery
  }

  // 2. Fetch first 128 KB to inspect <head>
  try {
    const headHtml = await fetchTruncatedText(targetUrl, 128 * 1024, 4000);
    if (headHtml && headHtml.length > 200) {
      // Regex for <link rel="alternate" ... href="...">
      const linkRegex = /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
      const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["'][^>]*>/gi;

      const candidateHrefs: string[] = [];
      let m;
      while ((m = linkRegex.exec(headHtml)) !== null) {
        if (/type=["'](?:application\/(?:rss\+xml|atom\+xml)|text\/xml)["']/i.test(m[0])) {
          candidateHrefs.push(m[1]);
        }
      }
      while ((m = linkRegex2.exec(headHtml)) !== null) {
        if (/type=["'](?:application\/(?:rss\+xml|atom\+xml)|text\/xml)["']/i.test(m[0])) {
          candidateHrefs.push(m[1]);
        }
      }

      for (const href of candidateHrefs) {
        try {
          const resolved = new URL(href, targetUrl).href;
          const feed = await parser.parseURL(resolved);
          if (feed && feed.items && feed.items.length > 0) {
            return resolved;
          }
        } catch (feedErr) {
          // Keep trying
        }
      }
    }
  } catch (discoveryErr) {
    // Continue to common paths
  }

  // 3. Probe common RSS paths
  try {
    const parsedOrigin = new URL(targetUrl).origin;
    const commonPaths = ['/feed', '/rss', '/rss.xml', '/news/rss.xml', '/feed.xml'];

    for (const path of commonPaths) {
      const probeUrl = `${parsedOrigin}${path}`;
      try {
        const feed = await parser.parseURL(probeUrl);
        if (feed && feed.items && feed.items.length > 0) {
          return probeUrl;
        }
      } catch (probeErr) {
        // Continue
      }
    }
  } catch (e) { }

  return null;
}

/**
 * Concurrency worker pool: Enriches an array of RSS items with missing og:image/metadata
 * Runs with max 5 concurrent fetches and 80ms spacing to respect news site rate limits.
 */
export async function enrichRssItemsWithOgImage(
  items: Array<{ url: string; imageUrl?: string | null; title: string; description?: string | null }>,
  maxConcurrent: number = 5
): Promise<void> {
  const needsImage = items.filter((item) => !item.imageUrl);
  if (needsImage.length === 0) return;

  const queue = [...needsImage];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          try {
            const meta = await fetchArticleOgMeta(item.url, 3500);
            if (meta.ogImage) {
              item.imageUrl = meta.ogImage;
            }
            if (!item.description && meta.ogDescription) {
              item.description = meta.ogDescription;
            }
          } catch (e) {
            // Null safe: item survives without thumbnail
          }
          await new Promise((res) => setTimeout(res, 80));
        }
      })()
    );
  }

  await Promise.all(workers);
}
