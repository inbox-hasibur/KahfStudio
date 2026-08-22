PROJECT: KHOBOR AI (খবর এআই)
Status: Initialization Phase
Tech Stack: Next.js 15, TypeScript, MongoDB, Gemini 1.5 Flash, Edge-TTS, Puppeteer.

____________________________________________________________________________________________________
1. SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

1.1 Core Concept
A hyper-local, audio-first news aggregator for Bangladesh. It automates the lifecycle of news: Scraping -> AI Filtering & Summarizing -> Audio Conversion -> Playlist Generation.
Key Value: Prioritizes utility (traffic, strikes, holidays) over general noise to help users navigate their day.

1.2 Data Sources (The Input)
Tier 1: Trusted Scrapers (Direct Extraction)
Targets: Jamuna TV (Primary), BDNews24, Bangladesh Pratidin, Jugantor, Kaler Kantho, Ittefaq, Samakal.
Excluded: Prothom Alo, The Daily Star (Biased/Blocked).
Tier 2: Discovery Engine (The "Whole Internet")
Tools: Google Search API (Serper) + Gemini Grounding.
Triggers: "Dhaka traffic update", "Road block Bangladesh", "Govt holiday notice", "Viral news BD today".

1.3 AI Logic (The Editor - Gemini 1.5 Flash)
Summarization: Convert long articles into conversational Bangla scripts (max 60-90 words per item).
Classification & TTL (Time-To-Live):
Type: EPHEMERAL (Traffic, Weather, Protests) -> TTL: 4 Hours -> Priority: HIGH (Plays first).
Type: DAILY (Politics, Sports, Economy) -> TTL: 24 Hours -> Priority: MEDIUM.
Type: PERMANENT (Govt Policy, History, Major Events) -> TTL: Indefinite -> Saved to Long-Term Archive.

1.4 Audio Engine (The Studio)
Engine: Microsoft Edge TTS (Free, Natural Bangla Voices).
Output: Separate .mp3 files for each news item (allows "Skip" functionality).
Playlist Logic: [Greeting + Date] -> [Urgent Alerts] -> [Headlines] -> [Detailed Stories].

1.5 Frontend UI (Next.js 15)
Mode A (Player): Minimalist UI, large controls, autoplay (Best for walking).
Mode B (Reader): Newspaper style feed, separated by "Live/Urgent" and "Daily Digest".
Mode C (Archive): Searchable history of permanent news.


____________________________________________________________________________________________________
2. PRODUCT BACKLOG (Master To-Do List)

Phase 1: Backend Core & Data Ingestion
Initialize Next.js 15 Project with TypeScript & Tailwind.
Setup MongoDB (Mongoose) Connection.
Design NewsItem Database Schema (fields: title, summary, audioUrl, priority, ttl, source).
Build Scraper Service (Tier 1: Jamuna/BDNews24) using Cheerio.
Build Discovery Service (Tier 2: Google Search API) for utility news.

Phase 2: The Brain (AI Integration)
Integrate Gemini 1.5 Flash API.
Create Prompt Templates for Summarization (Bangla).
Implement Logic for "Priority Assignment" and "TTL Calculation".
Create Cron Job/Scheduler (runs every hour).

Phase 3: The Voice (Audio Engine)
Integrate edge-tts (Python script or Node wrapper).
Build pipeline: Text -> Audio File -> Upload to Cloud (R2/S3) or Local Public folder.
Attach Audio URL to DB records.

Phase 4: Frontend & Player Experience
Design "Feed Layout" (Shadcn UI).
Build Audio Player Component (Autoplay, Skip, Speed Control).
Implement "Urgent Ticker" for high-priority news.
Responsive Testing (Mobile View Optimization).