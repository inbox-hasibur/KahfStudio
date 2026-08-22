# KahfStudio - Database Architecture & Schema Documentation

This document provides a comprehensive overview of the Supabase PostgreSQL database architecture used in KahfStudio (Khobor AI & Media Platform). It is split into two sections:
1. **Human-Readable Database Structure & Relations** (For developers, product managers, and architectural reference).
2. **Complete Raw Supabase DDL SQL Schema** (For direct execution or environment replication in Supabase SQL Editor).

---

## Part 1: Human-Readable Database Structure & Relations

### System Entity Relationship Summary
```
+-------------------+           +-----------------------+           +----------------------+
|     profiles      | 1 ----- N |     news_articles     | 1 ----- N |   podcast_archives   |
| (Users & Admins)  |           | (News & AI Summaries) |           +----------------------+
+-------------------+           +-----------------------+
   |             |                          |
   | 1           | 1                        | 1
   |             |                          |
   v N           v N                        v N
+-------------+ +------------------+     +------------------+
|subscriptions| | payment_invoices |     |  saved_articles  |
+-------------+ +------------------+     +------------------+

Independent Core Tables:
- system_settings   : Global runtime configurations (Gemini API keys, Auto-Approve, Prompts)
- scraping_sources  : RSS feeds and search targets (BBC Bangla, VOA Bangla, etc.)
- scraping_logs     : System execution logs for background scraping cron jobs
- vod_library       : Admin curated video assets for Halal Mode (Music Remover)
- media_channels    : Live IPTV channels and streaming media catalogue
```

---

### Detailed Table Specifications

#### 1. `profiles`
Stores extended user profile details linked directly to Supabase Auth (`auth.users`).
- **Primary Key:** `id` (`uuid`, FK to `auth.users.id`)
- **Fields:**
  - `full_name` (`text`): User's display name.
  - `avatar_url` (`text`): Profile picture URL.
  - `role` (`text`, default `'user'`): Authorization role (`'user'`, `'admin'`).
  - `tier` (`text`, default `'free'`): Subscription tier (`'free'`, `'premium'`).
  - `interests` (`ARRAY`): User preference topics/categories.
  - `gemini_api_key` (`text`): BYOK (Bring Your Own Key) for free tier users.
  - `created_at` (`timestamptz`): Record creation timestamp.

#### 2. `news_articles`
The core news engine table containing scraped raw articles, AI summaries, importance scores, audio URLs, and metadata.
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys:** `admin_id` -> `profiles(id)`, `user_id` -> `profiles(id)`
- **Fields:**
  - `headline` (`text`, required): Cleaned news headline.
  - `raw_content` (`text`, required): Full markdown news body content.
  - `ai_summary` (`text`): Gemini-generated concise Bengali audio summary.
  - `importance_score` (`integer`, default `50`): AI rating (1-100) determining news rank.
  - `country` (`text`, default `'BD'`): Country code (`'BD'`, `'US'`, `'GLOBAL'`).
  - `category` (`text`, default `'General'`): News topic (`'General'`, `'Sports'`, `'Politics'`, etc.).
  - `status` (`text`, default `'draft'`): Publishing state (`'draft'`, `'published'`, `'archived'`).
  - `original_url` (`text`): Source web page link.
  - `source` (`text`): Publisher name (e.g., `'BBC Bangla'`).
  - `published_at` (`timestamptz`, required): Original article publish date.
  - `image_url` (`text`): Main banner image link.
  - `audio_bn_full` / `audio_bn_summary` (`text`): Cloudinary WAV/MP3 links for Bengali audio.
  - `audio_en_full` / `audio_en_summary` (`text`): Cloudinary WAV/MP3 links for English audio.
  - `is_personalized` (`boolean`, default `false`): Flag for user-specific generated news.
  - `created_at` (`timestamptz`): Ingestion timestamp.

#### 3. `scraping_sources`
Managed list of RSS feeds and search targets used by background scraping crons.
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys:** `user_id` -> `profiles(id)` (optional)
- **Fields:**
  - `name` (`text`, required): Source display name (e.g. `'BBC Bangla'`).
  - `url` (`text`, required): RSS feed or scraping target URL.
  - `category` (`text`): Default news category for articles from this source.
  - `country` (`text`, default `'BD'`): Default target country code.
  - `is_active` (`boolean`, default `true`): Toggle for automated background fetch.
  - `created_at` (`timestamptz`): Record creation timestamp.

#### 4. `system_settings`
Key-value configuration store for system runtime parameters, prompt templates, and API keys.
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)
- **Unique Constraint:** `setting_key` (`text`, UNIQUE)
- **Fields:**
  - `setting_key` (`text`, required): Unique key (e.g., `'auto_approve_news'`, `'global_gemini_api_keys'`).
  - `setting_value` (`text`, required): Key value (e.g., boolean flag string or JSON stringified array).
  - `description` (`text`): Purpose of setting.
  - `updated_at` (`timestamptz`): Last updated timestamp.

#### 5. `podcast_archives`
Archives compiled daily AI podcasts, weather alerts, and aggregated audio feeds.
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)
- **Foreign Keys:** `user_id` -> `profiles(id)`, `news_id` -> `news_articles(id)` (optional)
- **Fields:**
  - `archive_type` (`text`): Type of archive (`'daily_podcast'`, `'urgent_alert'`).
  - `title` (`text`): Title of the podcast episode.
  - `audio_url` (`text`): Hosted Cloudinary audio URL.
  - `duration` (`integer`): Audio duration in seconds.
  - `created_at` (`timestamptz`): Creation timestamp.

#### 6. `subscriptions` & `payment_invoices`
Manages user membership tier status and transaction logs.
- **`subscriptions` PK:** `id` (`uuid`), FK: `user_id` -> `profiles(id)`
  - Fields: `plan_type` (`'free'`, `'premium'`), `status` (`'active'`, `'cancelled'`), `valid_until` (`timestamptz`).
- **`payment_invoices` PK:** `id` (`uuid`), FK: `user_id` -> `profiles(id)`, `subscription_id` -> `subscriptions(id)`
  - Fields: `transaction_id`, `amount`, `status`, `payment_provider` (`'bkash'`, `'stripe'`, etc.).

#### 7. `media_channels`
IPTV channels catalogue for Kahf Media streaming module.
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)
- **Fields:** `title`, `url` (m3u8/stream link), `thumbnail`, `category`, `duration`, `description`.

#### 8. `vod_library`
Video-on-Demand items prepared for Halal Mode (vocal extraction / background music removal).
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`), FK: `admin_id` -> `profiles(id)`
- **Fields:** `title`, `original_video_url`, `clean_audio_url`, `processing_status` (`'pending'`, `'completed'`, `'failed'`).

#### 9. `scraping_logs` & `saved_articles`
- **`scraping_logs`:** Internal log table capturing scraper events and error tracebacks.
- **`saved_articles`:** User bookmarking join table (`user_id` + `news_id`).

---

## Part 2: Complete Raw Supabase DDL SQL Schema

```sql
-- WARNING: This schema represents the authoritative production DDL for Supabase PostgreSQL.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'user'::text,
  tier text DEFAULT 'free'::text,
  interests ARRAY,
  gemini_api_key text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  status text NOT NULL,
  valid_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.payment_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid,
  transaction_id text NOT NULL,
  amount double precision NOT NULL,
  status text NOT NULL,
  payment_provider text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT payment_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT payment_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT payment_invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
);

CREATE TABLE public.news_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  headline text NOT NULL,
  raw_content text NOT NULL,
  ai_summary text,
  importance_score integer DEFAULT 50,
  country text DEFAULT 'BD'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  original_url text,
  source text,
  published_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid,
  is_personalized boolean DEFAULT false,
  image_url text,
  category text DEFAULT 'General'::text,
  audio_en_full text,
  audio_en_summary text,
  audio_bn_full text,
  audio_bn_summary text,
  CONSTRAINT news_articles_pkey PRIMARY KEY (id),
  CONSTRAINT news_articles_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id),
  CONSTRAINT news_articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.podcast_archives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  news_id uuid,
  archive_type text NOT NULL,
  title text NOT NULL,
  audio_url text NOT NULL,
  duration integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT podcast_archives_pkey PRIMARY KEY (id),
  CONSTRAINT podcast_archives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT podcast_archives_news_id_fkey FOREIGN KEY (news_id) REFERENCES public.news_articles(id)
);

CREATE TABLE public.vod_library (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  title text NOT NULL,
  original_video_url text NOT NULL,
  clean_audio_url text,
  processing_status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vod_library_pkey PRIMARY KEY (id),
  CONSTRAINT vod_library_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.scraping_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  category text,
  country text DEFAULT 'BD'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid,
  CONSTRAINT scraping_sources_pkey PRIMARY KEY (id),
  CONSTRAINT scraping_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.media_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  thumbnail text NOT NULL,
  category text,
  duration text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_channels_pkey PRIMARY KEY (id)
);

CREATE TABLE public.scraping_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scraping_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.saved_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  news_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT saved_articles_pkey PRIMARY KEY (id),
  CONSTRAINT saved_articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT saved_articles_news_id_fkey FOREIGN KEY (news_id) REFERENCES public.news_articles(id)
);
```