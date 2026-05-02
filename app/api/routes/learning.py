"""
KidLearn AI — Subject Learning Routes
────────────────────────────────────────
Endpoint:
  POST /learn/explain → Explain any topic simply with an example and quiz
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.learning_service import explain_topic

router = APIRouter()


# ── Request / Response Models ───────────────────────────────────

class LearnRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300,
                       example="photosynthesis")
    age: int = Field(default=10, ge=6, le=16,
                     description="Child's age (6–16) to tailor the explanation")
    username: str = Field(default="friend", max_length=50,
                          example="Alex")
    language: str = Field(default="English", max_length=40,
                          example="Marathi")

class LearnResponse(BaseModel):
    topic: str
    explanation: str
    example: str
    quiz_question: str
    username: str


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/explain", response_model=LearnResponse,
             summary="Explain any topic simply")
async def explain(request: LearnRequest):
    """
    Explain any academic topic (Math, Science, History, etc.)
    in a child-friendly way with a real-life example and a quiz question.
    """
    result = await explain_topic(
        topic=request.topic,
        age=request.age,
        language=request.language,
    )

    return LearnResponse(
        topic=request.topic,
        explanation=result.get("explanation", ""),
        example=result.get("example", ""),
        quiz_question=result.get("quiz_question", ""),
        username=request.username,
    )
