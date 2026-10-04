# Kahf Browser News Engine (FastAPI Microservice)

A lightweight, high-performance Python FastAPI service for regional RSS news scraping and startpage cards delivery.

## Key Features
- **Zero Node.js Overhead:** Pure Python with only 5 lightweight dependencies (`feedparser`, `fastapi`, `uvicorn`, `httpx`, `supabase`).
- **Interactive Swagger Docs:** Access auto-generated interactive API docs at `http://localhost:8000/docs`.
- **Zero Gemini Tokens for Live RSS:** Fast algorithmic & regex filtering of ads and navigation junk without LLM costs.
- **100% Compatible with Kahf Browser:** Matches the PostgreSQL `cards` table format (`title`, `summary`, `thumbnail_url`, `source_url`, `published_at`, `language`, `location`).
- **Same Supabase Database:** Uses your existing Supabase database credentials with zero data migration needed.

---

## 1. Quick Start (Local Run)

```bash
cd kahf-news-fastapi

# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables (or copy .env.local into .env)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 3. Start the server
uvicorn main:app --reload --port 8000
```

Now open:
- **Interactive API Documentation:** `http://localhost:8000/docs`
- **News Feed Endpoint:** `http://localhost:8000/api/kahfnews?location=Bangladesh`

---

## 2. Docker Run (For Kubernetes / Production)

```bash
cd kahf-news-fastapi

# Build Docker image (~120 MB)
docker build -t kahf-news-fastapi:latest .

# Run container
docker run -d -p 8000:8000 \
  -e NEXT_PUBLIC_SUPABASE_URL="your-supabase-url" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-supabase-key" \
  --name kahf-news-service kahf-news-fastapi:latest
```

---

## 3. Core API Endpoints

### `GET /api/kahfnews`
Delivers news cards formatted for Kahf Browser.
- `location`: `Bangladesh`, `UK`, `Saudi Arabia`, `Global`
- `language`: `bn`, `en`, `ar`, `all`
- `sort`: `smart` (freshness + importance) or `date` (chronological)
- `limit`: `50` (up to 200)
- `page`: `1, 2, 3...`

### `POST /api/scrape`
Triggers regional news ingestion.
- `region`: `BD`, `UK`, `SA`, `GLOBAL`, or `ALL`
- `background`: `true` (executes in background without blocking request)
