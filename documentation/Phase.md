# Khobor AI & KahfStudio - Development Roadmap & Phases

## Phase 1: Foundation & Infrastructure (Completed)
- **Framework & UI:** Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI.
- **Authentication:** Supabase Auth (SSO, Magic Link, Email/Password) with SSR middleware.
- **Database Engine:** Supabase PostgreSQL with primary relational schemas (`profiles`, `news_articles`, `system_settings`, `scraping_sources`, `podcast_archives`).

## Phase 2: User Profiles & Admin Management (Completed)
- **User Dashboard (`/profile`):** User preference management, BYOK (Bring Your Own Key) configuration, interests tagging.
- **Admin Dashboard (`/admin`):** Premium Bento UI layout, dynamic system monitoring metrics, unified green theme.
- **Scraping Control UI (`/admin/scraping`):** System settings management, active RSS feed toggles, auto-approve news workflow, direct single-URL ingestion, runtime Gemini API key management.
- **Security & RLS Bypass:** Server-side API endpoints (`/api/sources`, `/api/settings`) utilizing `SUPABASE_SERVICE_ROLE_KEY` to bypass client-side RLS limits during background cron tasks.

## Phase 3: AI Pipeline, Audio Engine & Media (Completed)
- **Unified Gemini 2.5/Flash Engine:** Single-prompt AI pipeline generating ad-free clean content, concise Bengali summaries, country/category tagging, and AI importance ratings (1-100).
- **Gemini 3.1 Flash Unlimited TTS Engine:** 24kHz 16-bit PCM buffer stitching audio generator (`gemini-3.1-flash-tts-preview`) with seamless streaming uploads to Cloudinary WAV/MP3 storage.
- **Weather & Umbrella Advisory (`/api/weather`):** Real-time OpenWeather integration generating live dynamic umbrella tips and rain/thunderstorm alerts.
- **Daily AI Podcast Pipeline (`/api/podcast/generate`):** Automated compilation of weather, real-time traffic updates, and top daily news into a single audio track saved to `podcast_archives`.
- **Multi-Country & Smart News Sorting:** Dynamic feed sorting (`sort=smart`) and country-wise news filtering (`country=BD`, `US`, `GLOBAL`).
- **Kahf Media (IPTV & Streaming):** Live video player, HLS (`.m3u8`) streaming engine, background sphere hover expand, and media channel catalog.
- **Halal Mode (Music Remover):** MDX-Net ONNX audio isolation via FastAPI background service to strip background music from curated VOD clips.

## Phase 4: Expansion & Next Modules (Current Focus)
- **News Engine Refinement & Auto-Filtering:** Advanced Title-only pre-filtering for RSS feeds before full markdown extraction.
- **Personalized Audio Feed:** User-specific news playlist creation based on interest tags.
- **Real-Time Notification & Alarm System:** Commute warnings, traffic push notifications, and emergency alerts.
