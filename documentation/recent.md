# Recent Development & Deployment Guide

This document serves as a step-by-step technical guide to replicate or deploy the recently developed features (Admin UI, Scraping Control, Gemini AI Pipeline, Audio Engine, Database integrations) to a new or live environment.

---

## Step 1: Database & Supabase Configuration

To replicate the recent updates in a new Supabase environment, ensure the database structure is up to date:
1. `system_settings` Table:
   - Stores global runtime configurations (`id`, `setting_key`, `setting_value`, `description`).
   - Populated via seed scripts with default keys like `auto_approve_news`, `evaluator_prompt`, and `global_gemini_api_keys`.
   - The `global_gemini_api_keys` row stores a stringified JSON array of API keys.
2. `scraping_sources` Table:
   - Manages active RSS feeds (`name`, `url`, `category`, `is_active`, `country`).
3. `podcast_archives` Table:
   - Stores compiled AI podcast metadata (`archive_type`, `title`, `audio_url`, `duration`).

---

## Step 2: Live Environment Variables (.env) Setup

In your production environment (e.g. Vercel), configure environment variables as follows:

```env
# 1. Supabase Config
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key  # Bypasses RLS during background cron scraping

# 2. Application Config
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
CRON_SECRET=your_custom_secret_string  # Secures Vercel cron endpoints

# 3. Third-Party APIs
OPENWEATHER_API_KEY=your_openweathermap_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Step 3: Implemented Recent Features Overview

### 1. Multi-Trigger Scraping & Ingestion Pipeline
- Automated Time-Based Cron: Ingestion scheduled every 30-60 minutes.
- Admin Manual Trigger: Trigger full feed ingestion on demand from `/admin/scraping`.
- Direct Single-URL Ingestion: Direct manual ingestion of individual URLs via `/api/ingest/direct`.
- RLS Bypass API: Secured server routes (`/api/sources`, `/api/settings`) using `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Universal Article Extractor & Pre-AI Text Cleaner
- 3-Tier Extractor: Content extraction via Mozilla Readability, JSON-LD Schema.org, and Jina AI Reader fallback (`universal-extractor.ts`).
- Cover Image Extraction: OpenGraph (`og:image`), Twitter card, and schema image URL extraction prior to AI processing.
- Pre-AI Local Noise Cleaner: Strips advertisements, social share buttons, header/footer noise, and truncates related news section boundaries before sending text to Gemini (`cleaner.ts`).

### 3. Two-Pass Gemini AI Processing Engine
- 1st Gemini Pass: Batch evaluates raw candidate headlines using `gemini-3.6-flash` / `gemini-2.5-flash` to select top high-impact news items.
- 2nd Gemini Pass: Single unified prompt producing clean markdown content body, 2-paragraph Bengali summary with 3 key takeaway bullet points, AI importance score (1-100), and auto-category tags.

### 4. Gemini 3.1 Flash TTS Engine & Cloudinary CDN Audio Hosting
- Unlimited Duration TTS: Splits summary text into safe 18-20 word sentence chunks to eliminate duration cutoffs (`gemini-tts.ts`).
- PCM Buffer Stitching: Fetches 24kHz 16-bit mono PCM audio per chunk via `gemini-3.1-flash-tts-preview` (Voice: `Puck` for BN) and concatenates buffers.
- Cloudinary Upload: Wraps combined PCM buffer into a standard WAV header and streams directly to Cloudinary CDN (`news_audios` folder).

### 5. Weather, Umbrella Advice & Daily AI Podcast Generator
- Live Weather & Umbrella Logic: OpenWeather condition analysis in `/api/weather` generating dynamic umbrella advisories.
- Daily Podcast Pipeline: `/api/podcast/generate` compiles date, weather update, umbrella advice, traffic updates, and top 5 daily news summaries into a unified podcast track stored in `podcast_archives` and hosted on Cloudinary CDN (`podcasts` folder).

### 6. Smart News Ranking & Multi-Country Feed
- Smart Sorting: `/api/news` supports `sort=smart` (Freshness + Importance Score + User Interest Boost).
- Multi-Country Filtering: Country code filtering (`BD`, `US`, `GLOBAL`).

### 7. Admin Bento UI Dashboard (`/admin`) & IPTV Player (`/media`)
- Bento UI Dashboard: Dynamic stats, active scrapers, system settings, and Gemini API keys manager.
- IPTV Streaming: HLS (`.m3u8`) streaming player with category filters and video modal window.
