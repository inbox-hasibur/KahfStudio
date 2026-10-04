"""
Regional News Sources Registry for FastAPI Engine
Manages registered RSS portals categorized by region (BD, UK, SA, GLOBAL).
"""

from typing import List, Dict, Any
from database import get_supabase

DEFAULT_SOURCES = [
    # --- Bangladesh (BD) ---
    {"name": "Prothom Alo", "url": "https://www.prothomalo.com/feed", "category": "General", "country": "BD"},
    {"name": "Daily Ittefaq", "url": "https://www.ittefaq.com.bd/feed/", "category": "General", "country": "BD"},
    {"name": "BBC Bangla", "url": "https://feeds.bbci.co.uk/bengali/rss.xml", "category": "General", "country": "BD"},
    {"name": "Channel i News", "url": "https://www.channelionline.com/feed/", "category": "General", "country": "BD"},
    {"name": "BD24Live", "url": "https://www.bd24live.com/bangla/feed", "category": "General", "country": "BD"},
    {"name": "Google News (BD)", "url": "https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn", "category": "General", "country": "BD"},
    {"name": "The Daily Star", "url": "https://www.thedailystar.net/frontpage/rss.xml", "category": "General", "country": "BD"},

    # --- United Kingdom (UK) ---
    {"name": "BBC News (UK)", "url": "https://feeds.bbci.co.uk/news/uk/rss.xml", "category": "General", "country": "UK"},
    {"name": "The Guardian (UK)", "url": "https://www.theguardian.com/uk/rss", "category": "General", "country": "UK"},
    {"name": "Sky News (UK)", "url": "https://feeds.skynews.com/feeds/rss/uk.xml", "category": "General", "country": "UK"},
    {"name": "Google News (UK)", "url": "https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en", "category": "General", "country": "UK"},
    {"name": "Evening Standard", "url": "https://www.standard.co.uk/news/uk/rss", "category": "General", "country": "UK"},

    # --- Saudi Arabia / Middle East (SA - Arabic) ---
    {"name": "Arab News", "url": "https://www.arabnews.com/rss.xml", "category": "General", "country": "SA"},
    {"name": "Google News (SA)", "url": "https://news.google.com/rss?hl=ar&gl=SA&ceid=SA:ar", "category": "General", "country": "SA"},
    {"name": "Sky News Arabia", "url": "https://www.skynewsarabia.com/web/rss", "category": "General", "country": "SA"},
    {"name": "BBC Arabic", "url": "https://feeds.bbci.co.uk/arabic/rss.xml", "category": "General", "country": "SA"},
    {"name": "France 24 Arabic", "url": "https://www.france24.com/ar/rss", "category": "General", "country": "SA"},

    # --- Global / International ---
    {"name": "BBC News (World)", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "category": "General", "country": "GLOBAL"},
    {"name": "Al Jazeera English", "url": "https://www.aljazeera.com/xml/rss/all.xml", "category": "General", "country": "GLOBAL"},
    {"name": "The Guardian (World)", "url": "https://www.theguardian.com/world/rss", "category": "General", "country": "GLOBAL"},
    {"name": "Deutsche Welle", "url": "https://rss.dw.com/xml/rss-en-world", "category": "General", "country": "GLOBAL"},
    {"name": "NPR News", "url": "https://feeds.npr.org/1004/rss.xml", "category": "General", "country": "GLOBAL"},
    {"name": "Google News (World)", "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", "category": "General", "country": "GLOBAL"},
]

def get_sources_for_region(region: str = "ALL") -> List[Dict[str, Any]]:
    """
    Fetches active sources from Supabase DB with fallback to DEFAULT_SOURCES.
    """
    try:
        supabase = get_supabase()
        query = supabase.table("scraping_sources").select("*").eq("is_active", True)
        if region and region.upper() != "ALL":
            query = query.eq("country", region.upper())
        res = query.execute()
        if res.data and len(res.data) > 0:
            return res.data
    except Exception as e:
        print(f"Note: Could not query scraping_sources from DB ({e}), using default sources.")

    # Fallback to local defaults
    if not region or region.upper() == "ALL":
        return DEFAULT_SOURCES
    
    clean_region = region.upper()
    return [s for s in DEFAULT_SOURCES if s["country"].upper() == clean_region]
