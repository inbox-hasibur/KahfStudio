# Product Backlog - KahfStudio

## Phase 1: Completed Features & Core Modules
- [x] Next.js 15 App Router + TypeScript + Tailwind CSS setup.
- [x] Supabase PostgreSQL database architecture & migration from legacy MongoDB.
- [x] Admin Bento UI Dashboard (`/admin`) with real-time dynamic stats.
- [x] Scraping Control UI (`/admin/scraping`) with Auto-Approve, RSS Manager, and Direct URL Ingestion.
- [x] Server-side RLS Bypass API endpoints for background scraping crons (`/api/sources`, `/api/settings`).
- [x] Unified Gemini 2.5 Flash News Engine (Single-prompt summary, importance rating 1-100, clean markdown, tags).
- [x] Gemini 3.1 Flash Unlimited TTS Engine (Sentence chunking -> 24kHz PCM buffer concatenation -> Cloudinary WAV upload).
- [x] Live OpenWeather Integration & Dynamic Umbrella Advisory (`/api/weather`).
- [x] Daily AI Podcast Generator (`/api/podcast/generate`) compiling weather, traffic, and top 5 daily news.
- [x] Smart News Feed Ranking (`sort=smart`) & Multi-country filtering (`BD`, `US`, `GLOBAL`).
- [x] Kahf Media IPTV Player with live streaming (`.m3u8`) & responsive modal view.

---

## Phase 2: Immediate Priorities (News Engine Refinement & Optimization)
- [ ] **Title-Only Pre-Filtering Engine:** Fetch RSS feeds -> Extract titles -> Send batch title list to Gemini for quick evaluation -> Select only high-importance titles before full body scraping.
- [ ] **Scraping Pipeline Optimization:** Prevent duplicate article reprocessing and optimize Inngest background cron execution interval.
- [ ] **Personalized Interest Feed:** Enhanced recommendation algorithm based on user profile interest tags.

---

## Phase 3: Future Roadmap
- [ ] Crowdsourced traffic alert submission module.
- [ ] Push notifications & daily morning audio alarm.
- [ ] Offline audio caching & mobile PWA capabilities.
