"""
Asynchronous RSS Scraper Engine using feedparser & httpx.
Crawls regional news feeds, extracts clean metadata, deduplicates against Supabase,
and inserts fresh articles.
"""

import re
import html
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import httpx
import feedparser
from validator import is_valid_news_candidate
from sources import get_sources_for_region
from database import get_supabase

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KahfNewsFastAPIBot/1.0)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

def clean_html(text: str) -> str:
    """Strips HTML tags and unescapes entities."""
    if not text:
        return ""
    unescaped = html.unescape(text)
    stripped = re.sub(r"<[^>]+>", " ", unescaped)
    return re.sub(r"\s+", " ", stripped).strip()

async def fetch_and_parse_feed(client: httpx.AsyncClient, source: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetches and parses a single RSS source."""
    results = []
    try:
        resp = await client.get(source["url"], headers=HEADERS, timeout=8.0)
        if resp.status_code != 200:
            return results
            
        feed = feedparser.parse(resp.content)
        if not feed or not feed.entries:
            return results
            
        for entry in feed.entries:
            title = clean_html(entry.get("title", ""))
            url = (entry.get("link") or entry.get("id") or "").strip()
            
            if not is_valid_news_candidate(title, url):
                continue
                
            # Extract image
            image_url = None
            if hasattr(entry, "enclosures") and entry.enclosures:
                for enc in entry.enclosures:
                    if enc.get("type", "").startswith("image/") or "url" in enc:
                        image_url = enc.get("url")
                        break
            if not image_url and hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
                
            raw_desc = entry.get("summary") or entry.get("description") or ""
            clean_desc = clean_html(raw_desc)[:500]
            
            # PubDate
            published_at = datetime.utcnow().isoformat() + "Z"
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published_at = datetime(*entry.published_parsed[:6]).isoformat() + "Z"
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                published_at = datetime(*entry.updated_parsed[:6]).isoformat() + "Z"
                
            results.append({
                "headline": title,
                "original_url": url,
                "source": source.get("name", "Web"),
                "category": source.get("category", "General"),
                "country": source.get("country", "BD"),
                "raw_content": clean_desc or title,
                "ai_summary": clean_desc or title,
                "image_url": image_url,
                "published_at": published_at,
                "status": "published",
                "importance_score": 50,
                "admin_id": "fastapi_engine",
            })
    except Exception as e:
        # A single failing feed never crashes the rest of the crawl
        pass
        
    return results

async def run_scraper_pipeline(region: str = "ALL") -> Dict[str, Any]:
    """
    Crawls all sources for the region, deduplicates against Supabase, and persists new articles.
    """
    start_time = datetime.utcnow()
    sources = get_sources_for_region(region)
    all_discovered = []
    
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        tasks = [fetch_and_parse_feed(client, s) for s in sources]
        feed_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for res in feed_results:
            if isinstance(res, list):
                all_discovered.extend(res)
                
    if not all_discovered:
        return {
            "success": True,
            "region": region,
            "sources_crawled": len(sources),
            "discovered": 0,
            "saved": 0,
            "duplicates": 0,
        }
        
    # Deduplicate against Supabase news_articles
    supabase = get_supabase()
    urls = [a["original_url"] for a in all_discovered]
    existing_urls = set()
    
    # Query existing in chunks of 50
    for i in range(0, len(urls), 50):
        chunk = urls[i:i+50]
        try:
            res = supabase.table("news_articles").select("original_url").in_("original_url", chunk).execute()
            if res.data:
                for row in res.data:
                    existing_urls.add(row["original_url"])
        except Exception:
            pass
            
    new_articles = [a for a in all_discovered if a["original_url"] not in existing_urls]
    
    # Batch insert into Supabase
    saved_count = 0
    for i in range(0, len(new_articles), 25):
        chunk = new_articles[i:i+25]
        try:
            res = supabase.table("news_articles").insert(chunk).execute()
            saved_count += len(chunk)
        except Exception:
            # Fallback to individual insert
            for item in chunk:
                try:
                    supabase.table("news_articles").insert(item).execute()
                    saved_count += 1
                except Exception:
                    pass
                    
    duration = (datetime.utcnow() - start_time).total_seconds()
    
    return {
        "success": True,
        "region": region,
        "sources_crawled": len(sources),
        "discovered": len(all_discovered),
        "saved": saved_count,
        "duplicates": len(all_discovered) - len(new_articles),
        "duration_seconds": round(duration, 2),
    }
