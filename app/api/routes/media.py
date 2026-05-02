"""
AI Assembly — Media (YouTube) Routes
─────────────────────────────────────
Endpoint:
  GET /media/youtube?q=<query>   → kid-safe educational videos
"""

from fastapi import APIRouter, Query

from app.services.youtube_service import search_videos

router = APIRouter()


@router.get("/youtube", summary="Search YouTube for safe educational videos")
async def youtube(q: str = Query(..., min_length=1, max_length=200),
                  max_results: int = Query(4, ge=1, le=10)):
    """
    Returns up to `max_results` kid-safe YouTube videos matching `q`.
    Falls back to a search-page URL when YOUTUBE_API_KEY is not set.
    """
    return await search_videos(q, max_results=max_results)
