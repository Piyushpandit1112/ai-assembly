"""
KidLearn AI — Progress Tracker Routes
────────────────────────────────────────
Endpoints:
  GET  /progress/{username}       → Get a child's progress stats
  POST /progress/{username}/update → Update a specific stat counter
  POST /progress/register          → Register a new user
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from app.config import settings
from app.utils.storage import read_json, write_json

router = APIRouter()


# ── Default Progress Structure ──────────────────────────────────

def default_progress(username: str, age: int = 10) -> dict:
    """Return a fresh progress record for a new user."""
    return {
        "username": username,
        "age": age,
        "joined": datetime.now(timezone.utc).isoformat(),
        "english_score": 0,      # Increments when English Coach is used
        "learning_usage": 0,     # Increments when Subject Explainer is used
        "idea_usage": 0,         # Increments when Idea Lab is used
        "ai_usage": 0,           # Increments when AI Mentor is used
        "prompt_usage": 0,       # Increments when Prompt Trainer is used
        "brain_usage": 0,        # Increments when Puzzle/Quiz is played
        "total_sessions": 0,     # Total feature uses combined
        "last_active": datetime.now(timezone.utc).isoformat(),
    }


# ── Request / Response Models ───────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50, example="Alex")
    age: int = Field(..., ge=6, le=16, description="Child's age", example=10)

class UpdateRequest(BaseModel):
    activity: str = Field(
        ...,
        description="Activity key: english_score | learning_usage | idea_usage | ai_usage | prompt_usage | brain_usage",
        example="english_score",
    )
    increment: int = Field(default=1, ge=1, le=10)


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/register", summary="Register a new learner")
async def register_user(request: RegisterRequest):
    """
    Create a new user profile with a fresh progress record.
    If the username already exists, returns the existing profile.
    """
    data = read_json(settings.PROGRESS_FILE)

    if request.username in data:
        return {"message": "Welcome back!", "profile": data[request.username]}

    new_profile = default_progress(request.username, request.age)
    data[request.username] = new_profile
    write_json(settings.PROGRESS_FILE, data)

    return {"message": f"Welcome to KidLearn AI, {request.username}! 🎉", "profile": new_profile}


@router.get("/{username}", summary="Get a learner's progress")
async def get_progress(username: str):
    """
    Retrieve the full progress record for a learner.
    """
    data = read_json(settings.PROGRESS_FILE)

    if username not in data:
        raise HTTPException(
            status_code=404,
            detail=f"User '{username}' not found. Please register first.",
        )

    return data[username]


@router.post("/{username}/update", summary="Record activity for a learner")
async def update_progress(username: str, request: UpdateRequest):
    """
    Increment a specific activity counter for the learner.
    Valid activities: english_score, learning_usage, idea_usage,
                      ai_usage, prompt_usage, brain_usage
    """
    valid_activities = {"english_score", "learning_usage", "idea_usage",
                        "ai_usage", "prompt_usage", "brain_usage"}

    if request.activity not in valid_activities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid activity '{request.activity}'. "
                   f"Valid options: {', '.join(valid_activities)}",
        )

    data = read_json(settings.PROGRESS_FILE)

    # Auto-create profile if it doesn't exist
    if username not in data:
        data[username] = default_progress(username)

    # Update the counter
    data[username][request.activity] = (
        data[username].get(request.activity, 0) + request.increment
    )
    data[username]["total_sessions"] = data[username].get("total_sessions", 0) + 1
    data[username]["last_active"] = datetime.now(timezone.utc).isoformat()

    write_json(settings.PROGRESS_FILE, data)

    return {
        "message": "Progress updated! Keep learning! 🌟",
        "activity": request.activity,
        "new_value": data[username][request.activity],
        "total_sessions": data[username]["total_sessions"],
    }
