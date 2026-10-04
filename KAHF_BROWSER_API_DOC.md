# Kahf Browser Integration API Documentation

**Author:** Hasibur Rahman  
**API Endpoint:** `https://kahfnews.vercel.app/api/kahfnews`  
**Protocol:** REST (HTTPS GET)  
**Status:** Active & Ready for Production  

---

## 1. Overview & Objective

This API serves as a unified, AI-curated news feed designed specifically for **Kahf Browser** (Startpage / New Tab cards feed). It eliminates the need for fragile manual scrapers (e.g. sitemap parsing, truncated byte streams, missing OpenGraph tags) by delivering pre-cleaned, halal-filtered, and categorized articles directly from **KahfStudio**.

---

## 2. API Endpoint Specification

### `GET https://kahfnews.vercel.app/api/kahfnews`

### Query Parameters

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `location` / `country` | `string` | *inferred* | Filter by country/location (e.g. `Bangladesh` / `BD`, `UK`, `Saudi Arabia` / `SA`, `Global`). | `location=Bangladesh` |
| `language` | `string` | `bn` | Target language (`bn`, `en`, `ar`, or `all`). Auto-inferred if location is set. | `language=bn` |
| `category` | `string` | *all* | Filter by category (e.g. Technology, Sports, Politics). | `category=Technology` |
| `sort` | `string` | `smart` | `smart` (freshness + importance decay) or `date` (pure chronological newest first). | `sort=smart` |
| `limit` | `number` | `50` | Number of items per batch (1 to 200). | `limit=50` |
| `page` | `number` | `1` | Pagination page number. | `page=1` |
| `since` | `string` | *none* | Fetch articles published after a given ISO timestamp. | `since=2026-10-01T00:00:00Z` |

---

## 3. Data Schema & Field Compatibility

The JSON response is structured to match the current **Kahf Browser `cards` PostgreSQL table** (100% field compatibility, zero breaking changes):

```json
{
  "success": true,
  "count": 50,
  "page": 1,
  "limit": 50,
  "sort": "smart",
  "language": "bn",
  "data": [
    {
      "language": "bn",
      "type": "ARTICLE",
      "title": "বাংলাদেশে তৈরি হলো নতুন কৃত্রিম বুদ্ধিমত্তা মডেল",
      "summary": "দেশের শীর্ষ গবেষকদের তৈরি নতুন এআই মডেল আন্তর্জাতিক স্বীকৃতি লাভ করেছে।",
      "thumbnail_url": "https://images.prothomalo.com/prothomalo-bangla/photo.jpg",
      "source_url": "https://www.prothomalo.com/technology/ai-model-release",
      "published_at": "2026-10-01T15:30:00.000Z",
      "category": "Technology",
      "location": "Bangladesh",

      "source": "Prothom Alo",
      "audio_url": "https://res.cloudinary.com/kahf/audio/ai_tts_123.wav",
      "importance": 92,
      "has_audio": true
    }
  ]
}
```

### Field Breakdown:

1. **Current `cards` Table Fields (Ready for immediate use):**
   * `language`: `'bn'` | `'en'` | `'ar'`
   * `type`: Always `'ARTICLE'`
   * `title`: Clean headline (≤ 500 characters, HTML entities decoded)
   * `summary`: 2-paragraph clean summary or excerpt (≤ 1000 characters, guaranteed non-empty)
   * `thumbnail_url`: High-resolution article image URL
   * `source_url`: Canonical news link (used for unique deduplication)
   * `published_at`: ISO 8601 publication timestamp
   * `category`: Article category (e.g. `Technology`, `General`, `Sports`)
   * `location`: Geographic tag (`'Bangladesh'`, `'Saudi Arabia'`, etc.)

2. **Extra Features (Ignored by current setup, ready for future UI):**
   * `source`: Publisher brand name (e.g. `Prothom Alo`, `The Daily Star`, `BBC Bangla`)
   * `audio_url`: Studio-quality 24 kHz neural Bengali audio narration link
   * `importance`: AI editorial importance score (1 to 100)
   * `has_audio`: Boolean flag indicating if narration is available

---

## 4. Drop-in Implementation for Kahf Browser (`jobs/news-ingest`)

Instead of crawling individual portals via raw sitemaps, the K8s cronjob can simply poll the KahfNews feed and push to `http://startpage.startpage.svc.cluster.local/api/cards`:

```javascript
// Example: jobs/news-ingest/sources/kahfnews.js
const fetch = require('node-fetch');

async function fetchKahfNewsCards(language = 'bn', limit = 100) {
  const url = `https://kahfnews.vercel.app/api/kahfnews?language=${language}&limit=${limit}&sort=smart`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error('Failed to fetch from KahfNews API: ' + (json.error || 'Unknown error'));
  }

  // Returns array directly compatible with normalize.js / ingest-client.js
  return json.data;
}

module.exports = { fetchKahfNewsCards };
```

---

## 5. Recommended Future Enhancements for Kahf Browser

If the team wants to activate **1-click audio narration** and **source badges** on the startpage widget, simply execute this migration in the `startpage-cards-db` PostgreSQL instance:

```sql
ALTER TABLE cards 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 50;
```

Once added, the internal `POST /api/cards` will naturally persist these fields without any further changes to the ingestion logic.

---

## 6. Engine Architecture (`src/kahf-browser-news/`)

The news engine is fully decoupled into a dedicated module with zero dependency on the rest of the application:

```text
src/kahf-browser-news/
├── sources/
│   └── regional-sources-registry.ts    # Dynamic & fallback sources per region (BD, UK, SA, Global)
├── filters/
│   └── news-candidate-validator.ts     # Zero-token, local algorithmic & regex junk filtering
├── crawler/
│   └── rss-feed-crawler.ts             # High-throughput RSS discovery & metadata extraction
├── pipeline/
│   └── news-ingestion-pipeline.ts      # Multi-source crawling, DB deduplication, and persistence
├── scheduler/
│   └── news-cron-scheduler.ts          # Automated periodic news ingestion runner
└── feed/
    └── browser-news-feed-service.ts    # Startpage cards formatter & smart freshness ranker
```

---

## 7. Standalone Python FastAPI Microservice (`kahf-news-fastapi/`)

For teams preferring a standalone Python microservice without Node.js runtime overhead:

```text
kahf-news-fastapi/
├── main.py              # FastAPI app with Swagger UI at /docs
├── scraper.py           # Async feedparser + httpx RSS scraper
├── sources.py           # Dynamic & default regional sources registry
├── validator.py         # Zero-token local algorithmic candidate validator
├── database.py          # Direct connection to the same Supabase PostgreSQL DB
├── Dockerfile           # Production Docker container (~120MB)
└── requirements.txt     # Ultra-lightweight dependencies (6 packages)
```

- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **Docker Image Build:** `docker build -t kahf-news-fastapi .`


