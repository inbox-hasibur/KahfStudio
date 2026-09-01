KahfStudio - Product Backlog & Feature Status

Phase 1: Core Completed Modules [x]

1. Ingestion & Multi-Trigger Scraping Pipeline
- [x] Automated Time-Based Cron Ingestion: Morning & Evening scheduled triggers via Vercel Cron / Inngest workers.
- [x] Admin Manual Trigger UI: On-demand full RSS feed scraping with category filters and article limits via /admin/scraping.
- [x] Direct Single-URL Ingestion: Instant manual ingestion for single article URLs via /api/ingest/direct.
- [x] Source Manager & RLS Bypass API: Dynamic source fetching via /api/sources using SUPABASE_SERVICE_ROLE_KEY.

2. Article Extraction & Content Pre-Processing
- [x] 3-Tier Universal HTML Extractor: Content extraction via Mozilla Readability, JSON-LD Schema.org, and Jina AI fallback.
- [x] Cover Image Scraping: Automatic extraction of og:image, Twitter card images, and schema images prior to AI processing.
- [x] Pre-AI Local Text Cleaner: Strips advertisements, social share buttons, header/footer noise, and truncates related news section boundaries before sending text to Gemini.

3. AI News Engine & TTS Audio Pipeline
- [x] AI Title & Importance Pre-Filter: 1st Gemini pass evaluating candidate headlines in batch to select top high-impact news items.
- [x] Single-Prompt Unified Gemini Engine: 2nd Gemini pass generating clean markdown content, 2-paragraph Bengali summary, AI importance score (1-100), and auto-category.
- [x] Gemini 3.1 Flash TTS Engine: Unlimited duration audio synthesis using 18-20 word sentence chunking, 24kHz PCM buffer concatenation, and WAV header generation.
- [x] Cloudinary CDN Audio Hosting: Direct streaming upload of summary WAV audio buffers to Cloudinary CDN returning persistent HTTPS URLs.
- [x] Supabase Database Storage & Review Gate: Stores articles in Supabase with auto-approve toggle (published vs draft status).

4. Daily AI Podcast Pipeline
- [x] Automated Morning & Evening AI Podcast Generator (/api/podcast/generate): Compiles date, OpenWeather rain/umbrella advice, traffic updates, and top 5 news summaries.
- [x] Conditional Podcast Generation: Checks if fresh published news exists for the current date before running generation.
- [x] Podcast Audio Archiving: Synthesizes complete podcast script into WAV audio via Gemini 3.1 Flash TTS, uploads to Cloudinary CDN (podcasts folder), and archives in Supabase podcast_archives table.

5. Frontend UI, Media & Admin Panel
- [x] Smart News Feed Ranking: Multi-tier sorting (sort=smart) balancing Freshness, AI Importance Score, and User Interest Boosts.
- [x] Country & Category Filters: Multi-country filtering (BD, US, GLOBAL) and dynamic category tags.
- [x] Custom Audio Player Widget: Continuous playback, seek bar, play/pause, and speed control for news summaries and podcasts.
- [x] Live IPTV Player (/media): HLS (.m3u8) live Bangladeshi news channel streaming with responsive video modal.
- [x] Bento UI Admin Panel (/admin): Real-time metrics dashboard, system settings, and BYOK Gemini API keys manager.


Phase 2: Pending Refactoring & Code Quality Tasks [ ]

1. Cleanup & Code Quality
- [ ] Delete duplicate src/lib/scraper.ts file (superseded by src/lib/scraper/ directory).
- [ ] Move hardcoded Cloudinary fallback credentials in gemini-tts.ts to environment variables only.
- [ ] Clean up temporary files in scratch/ directory.

2. Type Safety & Refactoring
- [ ] Create src/types/news.ts interface to replace any[] types in news-related components and hooks.
- [ ] Update useNews hook to consume typed NewsArticle interface.

3. Final Verification & Practicum Documentation
- [ ] Run full end-to-end verification test on /api/ingest/trigger-rss endpoint.
- [ ] Verify build status with npm run build and npm run lint.
- [ ] Finalize Architecture.md, SRS.md, and Phase.md documentation.
- [ ] Write final Practicum Completion Report.
