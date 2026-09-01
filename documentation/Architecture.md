KahfStudio (Khobor AI & Media) - System Architecture & Technical Specifications

SECTION 1: SYSTEM OVERVIEW
KahfStudio is an audio-first, AI-driven news aggregator and media streaming platform tailored for Bangladesh and global audiences. It automates the complete news lifecycle:
Multi-Trigger Ingestion -> AI Headline & Importance Selection -> HTML/Image Extraction -> Unified AI Summary & Content Generation -> Gemini 3.1 Flash TTS Audio Generation -> Cloudinary CDN Audio Hosting -> Supabase DB Storage -> Smart Ranked Feed Serving -> Daily AI Audio Podcast Generation.


SECTION 2: INGESTION TRIGGERS & SCRAPING PIPELINE

The scraping and ingestion pipeline can be triggered through three distinct mechanisms:

a. Automated Time-Based Cron (Scheduled)
   Automated serverless cron jobs (Vercel Cron / Inngest background workers) trigger periodic ingestion every 30-60 minutes (morning & evening schedules).

b. Admin Manual Trigger
   Admins can manually trigger full RSS scraping on-demand with custom article limits and category filters via the Admin Panel (/admin/scraping).

c. Direct Single-URL Manual Ingestion
   Admins or authorized users can paste a single specific news URL (e.g. from BBC Bangla, Prothom Alo, VOA Bangla) into /api/ingest/direct or /admin/scraping for instant targeted processing.


SECTION 3: END-TO-END NEWS PIPELINE DATAFLOW

[Trigger: Time-based Cron / Admin Manual / Single-URL]
                          |
                          v
[Feed Scraping & Candidate Discovery (rss-parser)]
                          |
                          v
[AI Pre-Filter (1st Gemini Pass): Selects TOP candidate headlines & initial importance]
                          |
                          v
[HTML Extraction & Image Scraping (Mozilla Readability + JSON-LD + Jina AI)]
                          |
                          v
[Unified Content Processing (2nd Gemini Pass): Generates clean body, summary, score]
                          |
                          v
[TTS Engine (Gemini 3.1 Flash TTS): Sentence Chunking -> PCM Concatenation -> WAV Header]
                          |
                          v
[Cloudinary Upload: Audio saved to CDN -> Returns HTTPS WAV URL]
                          |
                          v
[Supabase PostgreSQL: Saved to news_articles (Status: published or draft based on Auto-Approve)]
                          |
                          v
[Frontend Next.js App: Fetches text from Supabase, streams audio from Cloudinary]


DETAILED EXECUTION STEPS:

Step 1: Candidate Source Discovery & Deduplication
- Active scraping sources are loaded from Supabase PostgreSQL (scraping_sources table).
- rss-parser fetches up to 15 candidate headlines per feed.
- URLs are cross-checked against Supabase news_articles to prevent duplicate processing.

Step 2: AI Title & Importance Pre-Filtering (1st Gemini Pass)
- Raw candidate titles, categories, and sources are batched into a single prompt sent to Gemini (gemini-2.5-flash / gemini-3.6-flash).
- Gemini evaluates headline significance and selects the TOP candidates (default top 5) with high breaking/importance values.

Step 3: Universal Article HTML Extraction & Cover Image Scraping
- For selected articles, universal-extractor.ts fetches raw HTML.
- Cover Image (ogImage): Extracted from HTML meta tag (og:image), Twitter cards, or JSON-LD schema prior to AI processing.
- Article Content: Extracted using a 3-tier fallback strategy:
  Tier A: Mozilla Readability (DOM text density parser).
  Tier B: JSON-LD Schema.org (NewsArticle / Article JSON script tags).
  Tier C: Jina AI Reader (r.jina.ai) fallback for Javascript-heavy sites.

Step 4: Unified AI Content & Summary Generation (2nd Gemini Pass)
- Extracted article text is sent to Gemini in a single unified prompt.
- Gemini produces a structured JSON response containing:
  a. clean_headline: Concise Bengali title.
  b. clean_content: Unabridged full Bengali article body in clean markdown.
  c. ai_summary: Short 2-paragraph Bengali summary with 3 key takeaway bullet points.
  d. importance_score: AI score rating (1 to 100).
  e. detected_category: Auto-classified news topic category.

Step 5: Gemini 3.1 Flash Unlimited TTS Audio Synthesis
- Text summary is cleaned for speech and passed to gemini-3.1-flash-tts-preview (Voice: Puck for BN, Aoede for EN).
- Text is split into safe 18-20 word sentence chunks to eliminate API duration limits.
- 24kHz 16-bit mono PCM binary buffers are concatenated back-to-back (Buffer.concat) and converted to a standard WAV audio buffer.

Step 6: Cloudinary Hosting & Supabase DB Storage
- The WAV audio buffer is streamed directly to Cloudinary CDN (news_audios folder).
- Cloudinary returns a secure HTTPS audio URL (audio_bn_summary).
- Article metadata, full text, summary, cover image URL, and audio link are saved to Supabase news_articles.
- Review / Auto-Approve Gate:
  a. If auto_approve_news == true in system_settings -> Status set to published (live immediately).
  b. If auto_approve_news == false -> Status set to draft (requires Admin approval in /admin).

Step 7: Frontend Serving & Smart Feed Ranking
- Next.js frontend queries /api/news which fetches articles from Supabase with Smart Ranking (Freshness + AI Importance Score + User Interest Boost).
- Audio is streamed seamlessly from Cloudinary CDN into the custom AudioPlayer widget.


SECTION 4: DAILY AI PODCAST GENERATION PIPELINE

The automated daily podcast pipeline compiles weather, traffic, umbrella advice, and top news into a single audio track:

Step 1: Context & Weather Data Fetching
- Queries OpenWeatherMap API for live temperature, rain conditions, and umbrella advisories (Dhaka, Bangladesh).

Step 2: Top News Aggregation
- Fetches top 5 most important news articles from Supabase (news_articles table) ordered by importance score and published timestamp.

Step 3: AI Podcast Script Synthesis
- Compiles structured script containing:
  a. Greeting, Current Date, and Time of Day.
  b. Live Weather Update and Umbrella Advice (e.g. Rain/Extreme Heat warning).
  c. Sequential summary of top 5 breaking news stories (1st news to 5th news).
  d. Sign-off and closing advisory.

Step 4: Podcast TTS Audio & Cloudinary Archiving
- Converts complete podcast script to WAV audio via Gemini 3.1 Flash TTS.
- Uploads audio track to Cloudinary CDN (podcasts folder).
- Saves record with audio URL, duration, and script text into Supabase (podcast_archives table, archive_type: daily_bulletin).


SECTION 5: TECHNOLOGY STACK & COMPONENT RESPONSIBILITIES

A. Frontend UI: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Framer Motion
- Responsive client interface, smart news feed, AI podcast player & custom audio player

B. Database & Auth: Supabase (PostgreSQL), Supabase Auth
- News articles store, podcast archives, sources management, user accounts & RLS

C. Ingestion Triggers: Inngest / Vercel Cron / Next.js Serverless Routes
- Time-based automatic & manual admin/user scraping triggers

D. HTML Extractor: Cheerio, Mozilla Readability, Jina AI Reader
- Article body & OpenGraph cover image extraction

E. AI Models: Gemini 3.6 Flash / Gemini 2.5 Flash
- Pre-filtering top news, content cleaning, summarization, scoring & podcast script assembly

F. TTS Audio Engine: Gemini 3.1 Flash TTS (gemini-3.1-flash-tts-preview)
- Sentence chunking & 24kHz PCM audio generation for news summaries & daily podcasts

G. Audio CDN Storage: Cloudinary
- Persistent WAV audio hosting for news summaries and daily podcasts

H. Live IPTV Streaming: HLS (hls.js), Custom Video Modal Player
- Live Bangladeshi news channels streaming

I. Weather API: OpenWeatherMap API
- Live weather data & umbrella advisory logic
