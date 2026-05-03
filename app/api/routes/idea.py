"""
AI Assembly — Idea Generator Routes
──────────────────────────────────────
Endpoint:
  POST /idea/generate → Expand a learner's idea into a realistic engineering plan
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.services.idea_service import generate_idea

router = APIRouter()


# ── Request / Response Models ───────────────────────────────────

class IdeaRequest(BaseModel):
    idea: str = Field(..., min_length=1, max_length=500,
                      example="I want to build a robot that waters plants")
    username: str = Field(default="friend", max_length=50,
                          example="Alex")
    language: str = Field(default="English", max_length=40,
                          example="Tamil")
    age: int = Field(default=14, ge=4, le=99)

class IdeaResponse(BaseModel):
    original_idea: str
    username: str
    title: str
    summary: str
    real_world_examples: List[Dict[str, Any]]
    architecture: Dict[str, Any]
    build_steps: List[Dict[str, Any]]
    challenges: List[Dict[str, Any]]
    cost_estimate: str
    time_estimate: str
    safety_and_legal: str
    references: List[Dict[str, Any]]
    next_actions: List[str]


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/generate", response_model=IdeaResponse,
             summary="Expand an idea into a realistic engineering plan")
async def generate(request: IdeaRequest):
    """
    Take a learner's raw idea and transform it into a realistic, technically
    grounded build plan with real components, references and milestones.
    """
    result = await generate_idea(request.idea, request.language, request.age)

    return IdeaResponse(
        original_idea=request.idea,
        username=request.username,
        title=result.get("title", request.idea.title()),
        summary=result.get("summary", ""),
        real_world_examples=result.get("real_world_examples", []),
        architecture=result.get("architecture", {}),
        build_steps=result.get("build_steps", []),
        challenges=result.get("challenges", []),
        cost_estimate=result.get("cost_estimate", ""),
        time_estimate=result.get("time_estimate", ""),
        safety_and_legal=result.get("safety_and_legal", ""),
        references=result.get("references", []),
        next_actions=result.get("next_actions", []),
    )
