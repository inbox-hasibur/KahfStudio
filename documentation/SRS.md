# Software Requirements Specification (SRS) - KahfStudio (Khobor AI & Media)

## 1. Executive Summary & Product Scope
KahfStudio is an audio-first, AI-driven news aggregator and media streaming application. It automates web news ingestion, AI title pre-filtering, 3-tier article extraction, AI summarization & scoring, unlimited duration Text-to-Speech (TTS) audio generation, live weather/umbrella tips, AI daily podcast creation, and live IPTV media streaming.

---

## 2. Core Functional Requirements

### 2.1 Data Ingestion & Source Management
- **Multi-Trigger Ingestion:** 
  - Automated morning/evening time-based background cron ingestion.
  - Manual full RSS feed ingestion via `/admin/scraping`.
  - Direct single-URL manual article ingestion via `/api/ingest/direct`.
- **Source Management & RLS Bypass:** Manage active sources in `scraping_sources` table and query system configurations securely via server-side endpoints using `SUPABASE_SERVICE_ROLE_KEY`.

### 2.2 Pre-AI Article Extraction & Cleaning
- **3-Tier Universal Extractor:** Extract raw HTML body using Mozilla Readability, JSON-LD Schema.org (`NewsArticle`/`Article`), or Jina AI Reader fallback.
- **Cover Image Extraction:** Scrape `og:image`, Twitter card images, and schema image URLs prior to AI processing.
- **Pre-AI Local Noise Cleaner:** Strip advertisements, social share buttons, header/footer boilerplate noise, and truncate related news/comments section boundaries locally before sending text to Gemini.

### 2.3 AI News Processing & Scoring
- **1st Gemini Pass (Title Pre-Filtering):** Send batch candidate headlines to Gemini (`gemini-3.6-flash` / `gemini-2.5-flash`) to select top high-impact breaking news items.
- **2nd Gemini Pass (Unified Single-Prompt Processing):** Produce clean markdown body text, 2-paragraph Bengali summary with 3 key takeaway bullet points, AI importance score (1-100), and auto-detected category.
- **Review & Auto-Approve Gate:** Save articles to Supabase `news_articles` with status `published` (if `auto_approve_news == true`) or `draft` (if `auto_approve_news == false`).

### 2.4 Audio TTS Engine & CDN Hosting
- **Gemini 3.1 Flash Audio Engine:** Process text summaries into 24kHz 16-bit PCM mono audio buffers using safe 18-20 word sentence chunking, concatenated seamlessly with standard WAV header wrapping.
- **Cloudinary CDN Hosting:** Stream WAV audio buffers directly to Cloudinary CDN (`news_audios` folder) returning persistent HTTPS URLs.
- **Audio Player Controls:** Support play, pause, seek, speed control, and continuous playlist autoplay on the frontend.

### 2.5 Weather, Umbrella & AI Podcast Generator
- **Live Weather Advisory:** Query OpenWeather API to derive ambient conditions and generate context-aware umbrella tips (Rain, Drizzle, Thunderstorm, Extreme Heat).
- **Daily Podcast Pipeline:** Compile greeting, date, weather advisory, real-time traffic updates, and top 5 important daily news items into a unified podcast script, synthesize WAV audio via Gemini 3.1 Flash TTS, upload to Cloudinary CDN (`podcasts` folder), and archive in Supabase `podcast_archives`.

### 2.6 Kahf Media & IPTV Streaming
- **IPTV Player:** Provide interactive playback of live Bangladeshi IPTV channels via HLS (`.m3u8`) streaming with hover animations and responsive modal windows.
- **Halal Mode (Music Remover):** Offer background music removal for curated VOD clips using FastAPI & MDX-Net ONNX models.

---

## 3. Non-Functional Requirements
- **Performance:** Dynamic Feed API response time < 500ms; Audio generation streaming throughput < 5s per news article.
- **Security:** Strict authorization on `/admin` routes, secure handling of Gemini API keys in `system_settings`, service role key isolation on server endpoints.
- **Scalability:** Modular architecture built on Supabase PostgreSQL and Serverless API endpoints on Next.js 15.