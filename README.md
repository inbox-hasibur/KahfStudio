# 🎙️ KahfNews - Your Smart, Audio-First Daily News Companion

**URL:** [https://kahfnews.vercel.app/](https://kahfnews.vercel.app/)

![Next.js](https://img.shields.io/badge/NEXT.JS-black?style=for-the-badge&logo=next.js&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/TAILWIND_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Gemini](https://img.shields.io/badge/GEMINI-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white) ![MongoDB](https://img.shields.io/badge/MONGODB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

KahfNews is a revolutionary AI-driven news aggregator designed specifically for the busy Bangladeshi context. It solves the "information overload" problem by scraping trusted sources, summarizing key insights using Gemini AI, and converting them into a high-quality audio playlist for hands-free consumption. 

Whether you are walking to your office, stuck in Dhaka's legendary traffic, or preparing for your day—KahfNews ensures you are always informed, without ever needing to look at a screen.

---

## The Vision: "Listen, Don't Just Read"

In Bangladesh, missing a sudden holiday notice or a road-block update can ruin your entire day. Traditional news apps are cluttered with noise and bias. KahfNews acts as your personal "AI Editor-in-Chief," filtering out the noise and prioritizing utility news (Traffic, Holidays, National Alerts) over everything else.

**Key Problems We Solve**

- **Safety First:** Reading news while walking is dangerous. We provide a podcast-style briefing.
- **Time Saver:** We summarize long articles into 1-minute audio clips.
- **Hyper-Local Utility:** Real-time updates on traffic, strikes, and government notices.
- **Information Lifecycle:** We automatically distinguish between "Just-in" updates (Traffic) and "Permanent" news (Policy changes).

---

## Core Features

**Smart Audio Playlist (The "Walking" Mode)**

- **Auto-play:** Just hit play and put your phone in your pocket.
- **Skip Control:** Don't like a topic? Skip to the next one using your earphone buttons.

**AI Editor (Powered by Gemini 1.5 Flash)**

- **Intelligent Summarization:** Converts complex reports into conversational Bangla.
- **Priority Engine:** High-impact news (like a sudden road block) is automatically moved to the top of your morning brief.
- **Lifecycle Management:** Ephemeral news (like traffic jams) is auto-deleted after 4 hours to keep your feed clean.

**Unbiased & Trusted Sources**

- **Verified Outlets:** We aggregate news from credible Bangladeshi outlets, ensuring a balanced perspective.
- **Sources Include:** Jamuna TV, BDNews24, Bangladesh Pratidin, Jugantor, Kaler Kantho, Ittefaq, Samakal, and more.

**Natural Bangla TTS**

- **Human-like Voice:** Using advanced Neural TTS technology (Microsoft Edge TTS), our news doesn't sound like a robot. It feels like a human newsreader is speaking directly to you.

---

## Technical Architecture

- **Frontend:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS + Shadcn UI (Futuristic & Minimalist)
- **Backend:** Node.js + MongoDB (Mongoose) for long-term storage
- **AI Core:** Google Gemini 1.5 Flash for summarization and news classification
- **Ingestion:** Puppeteer & Cheerio for high-performance scraping
- **Audio Engine:** Edge-TTS for high-fidelity, free Bangla voice synthesis

---

## Roadmap & Future Goals

- [ ] **Personalized Deep-Dives:** Users can set interests (e.g., "Tech" or "Economy").
- [ ] **Crowdsourced Validation:** Integrating real-time user feedback for traffic news.
- [ ] **Smart Alarms:** Wake you up 15 minutes early if there is heavy rain or severe traffic on your commute.
- [ ] **Multi-language Support:** Switching between Bangla and English briefings seamlessly.

---

Developed by Hasibur Rahman for the people of Bangladesh. 🇧🇩
