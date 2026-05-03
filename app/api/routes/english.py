"""
KidLearn AI — English Coach Routes
────────────────────────────────────
Endpoint:
  POST /english/correct → Correct grammar and suggest improvements
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List

from app.services.english_service import correct_english, generate_english_lesson

router = APIRouter()


# ── Request / Response Models ───────────────────────────────────

class EnglishRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=1000,
                          example="She go to school yesterday.")
    username: str = Field(default="friend", max_length=50,
                          example="Alex")
    language: str = Field(default="English", max_length=40,
                          example="Hindi")
    age: int = Field(default=10, ge=4, le=99)

class EnglishResponse(BaseModel):
    corrected: str
    mistake: str
    better_version: str
    username: str


class EnglishLessonRequest(BaseModel):
    topic: str = Field(default="articles", max_length=60,
                       example="parts of speech")
    level: str = Field(default="basic", max_length=20,
                       example="intermediate")
    language: str = Field(default="English", max_length=40,
                          example="Hindi")
    age: int = Field(default=10, ge=4, le=99)


class EnglishLessonResponse(BaseModel):
    topic: str
    level: str
    concept: str
    rules: List[str]
    examples: List[str]
    practice_question: str
    spoken_tip: str
    writing_task: str


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/correct", response_model=EnglishResponse,
             summary="Correct an English sentence")
async def correct_sentence(request: EnglishRequest):
    """
    Analyse and correct the child's sentence.

    Returns:
    - **corrected**: The grammatically correct version
    - **mistake**: Simple explanation of what was wrong
    - **better_version**: A more expressive, richer rewrite
    """
    result = await correct_english(request.sentence, request.language, request.age)

    return EnglishResponse(
        corrected=result.get("corrected", request.sentence),
        mistake=result.get("mistake", "Great job! No major mistakes found."),
        better_version=result.get("better_version", request.sentence),
        username=request.username,
    )


@router.post("/lesson", response_model=EnglishLessonResponse,
             summary="Create an interactive English lesson")
async def get_english_lesson(request: EnglishLessonRequest):
    """
    Build a micro-lesson for grammar, spoken English, and writing.
    Useful for progressive learning from basic to advanced.
    """
    result = await generate_english_lesson(
        topic=request.topic,
        level=request.level,
        language=request.language,
        age=request.age,
    )

    return EnglishLessonResponse(
        topic=request.topic,
        level=request.level,
        concept=result.get("concept", ""),
        rules=result.get("rules", []),
        examples=result.get("examples", []),
        practice_question=result.get("practice_question", ""),
        spoken_tip=result.get("spoken_tip", ""),
        writing_task=result.get("writing_task", ""),
    )
