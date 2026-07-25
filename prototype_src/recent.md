# Recent Development & Deployment Guide (Last 2 Days)

This document serves as a step-by-step guide to replicate or deploy the recently developed features (Admin UI, Scraping Control, Database integrations) to a new or live environment.

## Step 1: Database & Supabase Configuration
To replicate the recent updates in a new Supabase environment, you must ensure the database structure is up to date:
1. **`system_settings` Table:**
   - Ensure this table exists to store global configurations (`id`, `setting_key`, `setting_value`, `description`).
   - Run the initial seed script (`npx tsx seed.ts` or run `seed.sql`) to populate default keys like `auto_approve_news`, `evaluator_prompt`, and `global_gemini_api_keys`.
   - **Crucial Note:** The `global_gemini_api_keys` row stores a stringified JSON array (e.g., `["AIzaSy..."]`). The codebase now elegantly handles duplicates by updating existing rows.
2. **`scraping_sources` Table:**
   - Ensure the table exists to manage RSS/DDG feeds (`name`, `url`, `category`, `is_active`).

## Step 2: Live Environment Variables (.env) Setup
In your production environment (e.g., Vercel), configure the environment variables exactly as outlined below. **Do not** include legacy keys (like `MONGODB_URI`, `NEXTAUTH_SECRET`, or `GEMINI_API_KEY`).

```env
# 1. Supabase Config (Required)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key  # CRITICAL: Bypasses RLS during background cron scraping!

# 2. Application Config (Required)
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
CRON_SECRET=your_custom_secret_string  # Secures your Vercel cron endpoints

# 3. Third-Party APIs
OPENWEATHER_API_KEY=your_openweathermap_api_key
```

## Step 3: Implemented Recent Features Overview
If you are analyzing the codebase or porting features, here are the recent structural developments that were implemented:

### 1. Admin Dashboard UI (`/admin`)
- **Bento UI Architecture:** The dashboard uses a clean "Bento-box" style without excessive gradients (`bg-card/40 backdrop-blur-md`).
- **Code Optimization:** The top 4 metric cards (Users, API Health, Active Scrapers, News Library) are rendered dynamically via a `.map()` function over a single data array, keeping the code DRY.
- **Padding Fixes:** Applied `p-5` directly to the parent `Card` component and `p-0` on `CardContent` to perfectly balance the default uneven padding of `shadcn/ui`.
- **Uniform Theme:** Utilized an `emerald-500` (Green) theme across all dashboard metrics for a cohesive, premium look.
- **Header Widget:** Replaced the notification bell with a dynamic, stylized Date & Day widget.

### 2. Scraping Control Configuration (`/admin/scraping`)
- **UI Enhancements:** The "Auto-Approve News" switch is a custom-designed wide slider. The Scraping Schedule uses a responsive `flex-wrap` layout to avoid UI clipping on smaller screens.
- **Dynamic System Keys:** Gemini API keys are now securely added via the UI and saved directly into the database's `system_settings` table, replacing the need for static `.env` API keys.
- **Direct URL Ingestion:** Added a dedicated section to trigger the scraping pipeline for a specific, single article URL manually.

### 3. Backend & Security Updates (Scraping Pipeline)
- **RLS Bypass API:** Solved the issue where Supabase Row Level Security (RLS) blocked the browser from fetching settings. The frontend now fetches `scraping_sources` and `system_settings` securely via backend API routes (`/api/sources` and `/api/settings`) using the `SUPABASE_SERVICE_ROLE_KEY`.
- **Gemini Model Update:** The deprecated `gemini-1.5-flash` model has been completely replaced across the codebase (including `process-article.ts`, `trigger-rss`, `weather`, and `ai.ts`) with the latest alias: **`gemini-flash-latest`**.
- **RSS Feed Reliability:** Replaced broken or inaccessible default RSS feeds (Jugantor, Jamuna TV) with highly reliable feeds (**BBC Bangla** and **VOA Bangla**) in the database schema and default seeding scripts.
