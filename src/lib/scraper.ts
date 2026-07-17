import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeJamunaTV() {
  try {
    // Try Jamuna TV
    let newsItems = await scrapeSource("https://www.jamuna.tv/", "article, .card, .news-card, .post-item, .category-box, .col-md-3, .col-sm-6");
    if (newsItems.length > 0) return newsItems;

    // Fallback to a secondary source if Jamuna fails
    console.log("Jamuna TV failed or empty, trying Dhaka Tribune...");
    newsItems = await scrapeSource("https://www.dhakatribune.com/latest-news", "article, .listing-content, .news-title, .report-list-item, .content-details");
    if (newsItems.length > 0) return newsItems;

    // Second Fallback
    console.log("Dhaka Tribune failed or empty, trying Prothom Alo English...");
    newsItems = await scrapeSource("https://en.prothomalo.com/bangladesh", ".news-item, .card, article, .story-card, .custom-story-card");
    return newsItems;
  } catch (error) {
    console.error("Error in scraping service:", error);
    return [];
  }
}

async function scrapeSource(url: string, selector: string) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const newsItems: any[] = [];

    $(selector).each((i, element) => {
      if (newsItems.length < 10) {
        const title = $(element).find("h1, h2, h3, h4, .title, .post-title, .heading").first().text().trim() || $(element).find("a").first().text().trim();
        const summary = $(element).find("p, .description, .summary, .excerpt, .post-content").first().text().trim();
        const imgEl = $(element).find("img").first();
        const imageUrl = imgEl.attr("src") || imgEl.attr("data-src") || (imgEl.attr("srcset") || "").split(" ")[0];
        const originalUrl = $(element).find("a").first().attr("href");

        if (title && title.length > 10 && originalUrl) {
          let fullUrl = originalUrl;
          if (!originalUrl.startsWith("http")) {
            const domain = new URL(url).origin;
            fullUrl = `${domain}${originalUrl.startsWith("/") ? "" : "/"}${originalUrl}`;
          }

          if (!newsItems.some(item => item.originalUrl === fullUrl)) {
            newsItems.push({
              title,
              summary: summary || "সংক্ষিপ্ত বিবরণ পাওয়া যায়নি।",
              imageUrl: imageUrl || "https://images.unsplash.com/photo-1590644365607-1c5a519a7a37?q=80&w=2070&auto=format&fit=crop",
              originalUrl: fullUrl,
              source: new URL(url).hostname.replace("www.", ""),
              category: "National",
              priority: "medium",
              publishedAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
          }
        }
      }
    });

    console.log(`Scraped ${newsItems.length} items from ${url}`);
    return newsItems;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}
