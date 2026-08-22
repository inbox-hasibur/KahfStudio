# Khobor AI & KahfStudio - System Architecture & Technical Specifications

## 1. System Overview
KahfStudio (Khobor AI & Media) is an audio-first, AI-driven news aggregator and media streaming platform tailored for Bangladesh and global audiences. It automates the complete news lifecycle: RSS & Direct URL Ingestion -> AI Importance Evaluation -> Single-Prompt Content & Summary Generation -> Unlimited Duration Gemini 3.1 TTS PCM Audio Generation -> Seamless Cloudinary Hosting.

---

## 2. Core Architectural Pillars

### A. Kahf News (AI News Engine & Audio Feed)
- **Scraping Pipeline:** Multi-source RSS feed fetchers (BBC Bangla, VOA Bangla, Prothom Alo) & manual single-URL ingestion.
- **AI Gatekeeper & Synthesis:** Gemini Flash Latest (`gemini-flash-latest` / `gemini-2.5-flash`) executing single-pass extraction, summary creation, category classification, country tagging, and importance scoring (1 to 100).
- **Unlimited Duration Audio Engine (`gemini-3.1-flash-tts-preview`):** Sentence-level chunking into ~15s speech segments, fetching 24kHz 16-bit PCM binary audio, back-to-back buffer concatenation (`Buffer.concat`), WAV header generation, and direct Cloudinary stream upload.
- **Weather & Podcast Pipeline:** OpenWeather API integration for real-time rain/umbrella guidance, joined with daily traffic updates and top 5 news stories to assemble a complete daily AI podcast track saved to `podcast_archives`.

### B. Kahf Media & Halal Mode (IPTV & Audio Stripper)
- **Live IPTV Player:** HLS (`.m3u8`) stream processing, category filter, responsive video modal player.
- **Halal Mode (Music Remover):** FastAPI backend powered by MDX-Net ONNX models to isolate human speech and remove background music from video tracks.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI | Responsive web application & audio player |
| **Database & Auth** | Supabase (PostgreSQL), Supabase Auth | User management, RLS security, articles & settings store |
| **Background Cron / Queue** | Inngest / Vercel Cron | Automated scheduled news scraping & audio processing |
| **AI Models** | Gemini 2.5 Flash / Gemini Flash Latest / Gemini 3.1 Flash TTS | Text summarization, scoring & PCM audio synthesis |
| **Audio Storage** | Cloudinary | Persistent storage for full & summary audio files |
| **Audio Isolation** | FastAPI + MDX-Net ONNX | Background music stripping for Halal Mode VOD |
| **Weather API** | OpenWeatherMap API | Live weather data & umbrella advisory logic |

---

## 4. End-to-End News Pipeline Dataflow

```
[RSS Feeds / Single URL Input]
           |
           v
   [Inngest Scraping Job]
           |
           v
   [Jina AI Reader / Cheerio HTML Extractor]
           |
           v
   [Gemini Unified Engine] ---> Generates: Summary, Clean Content, Score (1-100), Country, Category
           |
           v
   [Gemini 3.1 Flash TTS Engine] ---> Sentence Chunking -> 24kHz PCM Stitching -> Cloudinary WAV Upload
           |
           v
   [Supabase PostgreSQL DB] ---> Saved to `news_articles` (Status: Published)
           |
           v
   [Frontend Next.js App] ---> Smart Ranking Feed (Date + Importance Score + User Interests)
```
