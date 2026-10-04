"""
Kahf Browser News Engine - FastAPI Service
Fast, lightweight microservice delivering real-time RSS discovery & feed delivery
strictly compatible with Kahf Browser's startpage and PostgreSQL `cards` schema.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_supabase
from scraper import run_scraper_pipeline

app = FastAPI(
    title="Kahf Browser News Engine API",
    description="High-performance, lightweight RSS scraping & smart feed service for Kahf Browser",
    version="1.0.0",
)

# Enable CORS for cross-origin startpage queries
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "Kahf Browser News Engine (FastAPI)",
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "feed": "/api/kahfnews",
            "scrape": "/api/scrape (POST)",
            "health": "/health",
        },
    }

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/kahfnews")
def get_browser_feed(
    location: Optional[str] = Query(None, description="Country/Location filter (e.g. Bangladesh, UK, SA, Global)"),
    country: Optional[str] = Query(None, description="Country code (alias for location)"),
    language: Optional[str] = Query(None, description="Target language ('bn', 'en', 'ar', or 'all')"),
    category: Optional[str] = Query(None, description="Category filter (e.g. Sports, Technology)"),
    sort: str = Query("smart", description="Sort order ('smart' or 'date')"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    page: int = Query(1, ge=1, description="Page number"),
):
    """
    Delivers news cards formatted 100% identically to Kahf Browser startpage schema.
    """
    loc_param = location or country
    target_country = None
    resolved_loc_label = None

    if loc_param:
        loc_clean = loc_param.strip().lower()
        if loc_clean in ["bd", "bangladesh"]:
            target_country = "BD"
            resolved_loc_label = "Bangladesh"
        elif loc_clean in ["sa", "saudi", "saudi arabia"]:
            target_country = "SA"
            resolved_loc_label = "Saudi Arabia"
        elif loc_clean in ["uk", "united kingdom", "britain"]:
            target_country = "UK"
            resolved_loc_label = "UK"
        elif loc_clean in ["us", "usa", "united states"]:
            target_country = "US"
            resolved_loc_label = "US"
        elif loc_clean in ["global", "world", "international"]:
            target_country = "GLOBAL"
            resolved_loc_label = "Global"
        elif loc_clean != "all":
            target_country = loc_param.strip().upper()
            resolved_loc_label = loc_param.strip()

    # Determine effective language
    effective_lang = None
    if language:
        effective_lang = language.lower()
    elif not target_country:
        effective_lang = "bn"
    elif target_country == "BD":
        effective_lang = "bn"
    elif target_country == "SA":
        effective_lang = "ar"
    elif target_country in ["UK", "US", "GLOBAL"]:
        effective_lang = "en"

    supabase = get_supabase()
    query = supabase.table("news_articles").select("*").eq("status", "published").order("published_at", desc=True)

    if target_country:
        query = query.eq("country", target_country)
    elif effective_lang == "bn":
        query = query.eq("country", "BD")
    elif effective_lang == "ar":
        query = query.eq("country", "SA")
    elif effective_lang == "en":
        query = query.in_("country", ["GLOBAL", "UK", "US"])

    if category and category.lower() != "all":
        query = query.ilike("category", f"%{category.strip()}%")

    fetch_limit = max(limit * 3, 100) if sort == "smart" else limit
    offset = (page - 1) * limit

    if sort == "date":
        query = query.range(offset, offset + limit - 1)
    else:
        query = query.limit(fetch_limit)

    res = query.execute()
    raw_articles = res.data or []

    # Map to Kahf Browser Cards format
    cards = []
    for item in raw_articles:
        headline = (item.get("headline") or "").strip()
        summary = (item.get("ai_summary") or item.get("raw_content") or headline).strip()[:1000]

        item_lang = "en"
        if item.get("country") == "BD" or any("\u0980" <= c <= "\u09FF" for c in headline):
            item_lang = "bn"
        elif item.get("country") == "SA" or any("\u0600" <= c <= "\u06FF" for c in headline):
            item_lang = "ar"

        location_tag = "Bangladesh" if item.get("country") == "BD" else "Saudi Arabia" if item.get("country") == "SA" else item.get("country")

        cards.append({
            "language": item_lang,
            "type": "ARTICLE",
            "title": headline[:500],
            "summary": summary,
            "thumbnail_url": item.get("image_url"),
            "source_url": item.get("original_url"),
            "published_at": item.get("published_at") or item.get("created_at"),
            "category": item.get("category") or "General",
            "location": location_tag,
            "id": item.get("id"),
            "source": item.get("source") or "Web",
            "audio_url": item.get("audio_bn_summary") or item.get("audio_url"),
            "importance": item.get("importance_score") or 50,
            "has_audio": bool(item.get("audio_bn_summary") or item.get("audio_url")),
        })

    if effective_lang and effective_lang != "all":
        cards = [c for c in cards if c["language"] == effective_lang]

    # Smart Ranking decay calculation
    if sort == "smart" and cards:
        now_ts = datetime.utcnow().timestamp()
        for c in cards:
            try:
                dt_str = c["published_at"].replace("Z", "")
                pub_ts = datetime.fromisoformat(dt_str).timestamp()
                age_hours = max(0.0, (now_ts - pub_ts) / 3600.0)
            except Exception:
                age_hours = 0.0

            audio_bonus = 10 if c["has_audio"] else 0
            c["_rank"] = (c["importance"] + audio_bonus) - (age_hours * 2.5)

        cards.sort(key=lambda x: x["_rank"], reverse=True)
        for c in cards:
            c.pop("_rank", None)

        cards = cards[offset : offset + limit]

    return {
        "success": True,
        "count": len(cards),
        "page": page,
        "limit": limit,
        "sort": sort,
        "language": effective_lang or "all",
        "location": resolved_loc_label or loc_param,
        "data": cards,
    }

@app.post("/api/scrape")
async def trigger_scrape(
    region: str = Query("ALL", description="Region to scrape ('BD', 'UK', 'SA', 'GLOBAL', or 'ALL')"),
    background: bool = Query(False, description="Run in background asynchronously"),
    background_tasks: BackgroundTasks = None,
):
    """
    Triggers the multi-source RSS crawler to fetch and save latest news.
    """
    if background and background_tasks:
        background_tasks.add_task(run_scraper_pipeline, region)
        return {"success": True, "message": f"Scraper started in background for region: {region}"}

    result = await run_scraper_pipeline(region)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
