# Software Requirements Specification (SRS) - KahfStudio (Khobor AI & Media)

## 1. Executive Summary & Product Scope
KahfStudio is an audio-first, AI-driven news aggregator and media streaming application. It automates web news ingestion, AI summarization, importance evaluation, unlimited duration Text-to-Speech (TTS) audio generation, live weather/umbrella tips, AI daily podcast creation, and IPTV media streaming.

---

## 2. Core Functional Requirements

### 2.1 Data Ingestion & Source Management
- **Multi-Source Scraping:** Automatically fetch latest articles from active RSS feeds stored in `scraping_sources` (e.g. BBC Bangla, VOA Bangla).
- **Direct URL Manual Ingestion:** Allow admins to manually input single article URLs via `/admin/scraping` to trigger instant AI processing.
- **RLS Bypass API:** Secure server-side routes (`/api/sources`, `/api/settings`) using `SUPABASE_SERVICE_ROLE_KEY` to ensure unhindered background scraping.

### 2.2 AI News Processing & Scoring
- **Single-Prompt Processing:** Utilize Gemini 2.5 Flash (`gemini-flash-latest`) to produce:
  - Clean Markdown content (ad-free).
  - Concise Bengali audio summary (~60-90 words).
  - AI Importance Score (1-100).
  - Automatic Country Code (`BD`, `US`, `GLOBAL`) & Category tags.

### 2.3 Audio TTS Engine & Hosting
- **Gemini 3.1 Flash Audio Engine:** Process full news text and summaries into 24kHz 16-bit PCM mono audio buffers, concatenated seamlessly and uploaded as standard WAV files to Cloudinary.
- **Audio Controls:** Support play, pause, seek, speed control, and continuous playlist autoplay on the frontend.

### 2.4 Weather, Umbrella & AI Podcast Generator
- **Live Weather Advisory:** Query OpenWeather API to derive ambient conditions and generate context-aware umbrella tips (Rain, Drizzle, Thunderstorm, Extreme Heat).
- **Daily Podcast Pipeline:** Compile greeting, date, weather advisory, real-time traffic updates, and top 5 important daily news items into a unified podcast track stored in `podcast_archives`.

### 2.5 Kahf Media & IPTV Streaming
- **IPTV Player:** Provide interactive playback of live IPTV channels via HLS (`.m3u8`) streaming with hover animations and responsive modal windows.
- **Halal Mode (Music Remover):** Offer background music removal for curated VOD clips using FastAPI & MDX-Net ONNX models.

---

## 3. Non-Functional Requirements
- **Performance:** Dynamic Feed API response time < 500ms; Audio generation streaming throughput < 5s per news article.
- **Security:** Strict authorization on `/admin` routes, secure handling of Gemini API keys in `system_settings`, service role key isolation on server endpoints.
- **Scalability:** Modular architecture built on Supabase PostgreSQL and Serverless API endpoints on Next.js 15.