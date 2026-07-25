import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { scrapeRssFeeds } from "../../../lib/inngest/functions/scrape-rss";
import { processArticle } from "../../../lib/inngest/functions/process-article";
import { scrapeDDG } from "../../../lib/inngest/functions/scrape-ddg";

// Create an API that serves zero-downtime background jobs
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scrapeRssFeeds,
    scrapeDDG,
    processArticle,
  ],
});
