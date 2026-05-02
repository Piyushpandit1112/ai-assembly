"""
KidLearn AI — FastAPI Application Entry Point
──────────────────────────────────────────────
Sets up the FastAPI app, registers all routes,
and serves the frontend UI as static files.
"""

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, english, learning, idea, progress, media

# ── Create FastAPI App ──────────────────────────────────────────
app = FastAPI(
    title="AI Assembly",
    description="🎓 AI-powered learning platform for children aged 6–16",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ─────────────────────────────────────────────
# Allows the frontend (served at /) to call the API (at /ai, /english, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Open for local use; restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register API Routers ────────────────────────────────────────
app.include_router(ai.router,       prefix="/ai",       tags=["🤖 AI Mentor"])
app.include_router(english.router,  prefix="/english",  tags=["📝 English Coach"])
app.include_router(learning.router, prefix="/learn",    tags=["📚 Subject Explainer"])
app.include_router(idea.router,     prefix="/idea",     tags=["💡 Idea Generator"])
app.include_router(progress.router, prefix="/progress", tags=["📊 Progress Tracker"])
app.include_router(media.router,    prefix="/media",    tags=["🎬 Media Search"])

# ── Serve Frontend Static Files ─────────────────────────────────
# The 'frontend/' folder contains index.html, style.css, app.js
_root_dir = os.path.dirname(os.path.dirname(__file__))  # Project root
_frontend_dir = os.path.join(_root_dir, "frontend")

if os.path.exists(_frontend_dir):
    # Serve CSS, JS, images at /static/*
    app.mount("/static", StaticFiles(directory=_frontend_dir), name="static")


# ── Root Route — Serve the UI ───────────────────────────────────
@app.get("/", include_in_schema=False)
async def serve_ui():
    """Serve the main frontend page."""
    index_path = os.path.join(_frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "AI Assembly is running!",
        "docs": "Visit /docs for the API documentation",
    }


# ── Health Check ────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    """Simple health check endpoint."""
    return {"status": "healthy", "app": "AI Assembly", "version": "1.0.0"}
