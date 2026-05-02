"""
AI Assembly — YouTube Search Service
─────────────────────────────────────
Searches YouTube for kid-safe educational videos using the free
YouTube Data API v3. Returns a small list of video metadata.

Free quota: 10,000 units/day (~100 searches). Each search = 100 units.
Get a key:  https://console.cloud.google.com/apis/credentials
Enable:     "YouTube Data API v3"
"""

import httpx
from urllib.parse import quote_plus

from app.config import settings


YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


async def search_videos(query: str, max_results: int = 4) -> dict:
    """
    Return a list of YouTube video metadata for the given query.

    Falls back gracefully when no API key is configured — returns an
    empty list plus a search-page URL the frontend can link to.
    """
    fallback_search_url = (
        f"https://www.youtube.com/results?search_query={quote_plus(query)}"
    )

    if not settings.YOUTUBE_API_KEY:
        return {
            "configured": False,
            "search_url": fallback_search_url,
            "videos": [],
        }

    params = {
        "key": settings.YOUTUBE_API_KEY,
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": max_results,
        "safeSearch": "strict",          # kid-safe filter
        "videoEmbeddable": "true",       # only embeddable
        "relevanceLanguage": "en",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(YT_SEARCH_URL, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        return {
            "configured": True,
            "error": str(e),
            "search_url": fallback_search_url,
            "videos": [],
        }

    videos = []
    for item in data.get("items", []):
        vid = (item.get("id") or {}).get("videoId")
        snip = item.get("snippet") or {}
        if not vid:
            continue
        videos.append({
            "id": vid,
            "title": snip.get("title", ""),
            "channel": snip.get("channelTitle", ""),
            "thumbnail": (snip.get("thumbnails") or {}).get("medium", {}).get("url", ""),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "embed": f"https://www.youtube.com/embed/{vid}",
        })

    return {
        "configured": True,
        "search_url": fallback_search_url,
        "videos": videos,
    }
