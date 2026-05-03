"""
AI Assembly — AI Mentor Routes
────────────────────────────────
Endpoints:
  POST /ai/chat            → General child-friendly single-shot chat
  POST /ai/talk            → Multi-turn voice conversation (Talk Mode)
  POST /ai/vision          → Photo Help — solve a photographed question
  POST /ai/improve-prompt  → Teach kids how to write better AI prompts
"""

import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.ai_service import call_ai, call_chat, call_vision, parse_json_response
from app.utils.prompt_templates import (
    AI_TEACHER_PROMPT, PROMPT_TRAINER_PROMPT, TALK_MODE_PROMPT,
    PHOTO_HELP_PROMPT, variation_hint, age_band,
)

router = APIRouter()


# ── Request / Response Models ───────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    username: str = Field(default="friend", max_length=50)
    language: str = Field(default="English", max_length=40)
    age: int = Field(default=10, ge=4, le=99)

class ChatResponse(BaseModel):
    reply: str
    username: str


class TalkTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=4000)

class TalkRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[TalkTurn] = Field(default_factory=list, max_length=40)
    username: str = Field(default="friend", max_length=50)
    age: int = Field(default=10, ge=4, le=99)
    language: str = Field(default="English", max_length=40)
    is_first_turn: bool = False

class TalkResponse(BaseModel):
    reply: str


class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="English", max_length=40)
    age: int = Field(default=10, ge=4, le=99)

class PromptResponse(BaseModel):
    improved_prompt: str
    explanation: str
    tip: str


class VisionResponse(BaseModel):
    need_clearer_image: bool = False
    reason: Optional[str] = None
    tip: Optional[str] = None
    subject: Optional[str] = None
    what_i_see: Optional[str] = None
    answer: Optional[str] = None
    explanation_steps: List[str] = Field(default_factory=list)
    key_concept: Optional[str] = None
    encouragement: Optional[str] = None


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse, summary="Chat with AI Mentor")
async def chat_with_ai(request: ChatRequest):
    """Single-shot chat with the friendly AI mentor."""
    personalised_prompt = (
        AI_TEACHER_PROMPT
        + f"\n\nYou are talking to a child named {request.username}. "
        f"Address them by name occasionally."
        f"\nRespond in {request.language} language."
        + variation_hint(request.age)
    )
    reply = await call_ai(
        system_prompt=personalised_prompt,
        user_message=request.message,
    )
    return ChatResponse(reply=reply, username=request.username)


@router.post("/talk", response_model=TalkResponse, summary="Talk Mode — multi-turn voice chat")
async def talk_with_ai(request: TalkRequest):
    """Multi-turn voice conversation. Pass back full `history` each turn for context."""
    system_prompt = (
        TALK_MODE_PROMPT
        + f"\n\nYou are talking with {request.username} ({age_band(request.age)})."
        f"\nReply in {request.language} language."
    )
    if request.is_first_turn:
        system_prompt += (
            "\nThis is the FIRST turn. Greet the child warmly by name, "
            "say something fun, and ask what they'd like to talk about today."
        )
    messages = [{"role": "system", "content": system_prompt}]
    for t in request.history[-20:]:  # cap context
        messages.append({"role": t.role, "content": t.content})
    messages.append({"role": "user", "content": request.message})
    reply = await call_chat(messages)
    return TalkResponse(reply=reply)


@router.post("/vision", response_model=VisionResponse,
             summary="Photo Help — analyse and explain a question photo")
async def vision_help(
    file: UploadFile = File(..., description="JPEG/PNG/WEBP photo of the question"),
    question: str = Form("", description="Optional extra context from the child"),
    age: int = Form(10),
    language: str = Form("English"),
):
    """
    Accept a photo of a homework / exam question and return a step-by-step
    simple-language explanation. If the image is unclear, asks for a better one.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/jpg"):
        raise HTTPException(status_code=400, detail="Please upload a JPEG, PNG or WEBP image.")

    raw = await file.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8 MB).")
    if len(raw) < 200:
        raise HTTPException(status_code=400, detail="Image looks empty or corrupted.")

    image_b64 = base64.b64encode(raw).decode("ascii")
    system_prompt = (
        PHOTO_HELP_PROMPT
        + f"\nReply in {language} language."
        + variation_hint(age)
    )
    user_text = (
        f"This is from a {age}-year-old learner. "
        + (f"They added: \"{question.strip()}\". " if question.strip() else "")
        + "Please help them understand this question."
    )

    raw_reply = await call_vision(image_b64, file.content_type, user_text, system_prompt)
    parsed = parse_json_response(raw_reply) or {}

    if parsed.get("need_clearer_image"):
        return VisionResponse(
            need_clearer_image=True,
            reason=str(parsed.get("reason", "I couldn't read the image clearly.")),
            tip=str(parsed.get("tip", "Hold the camera steady, get good light, and tap to focus.")),
        )

    steps = parsed.get("explanation_steps") or []
    if isinstance(steps, str):
        steps = [s.strip() for s in steps.split("\n") if s.strip()]
    if not isinstance(steps, list):
        steps = []

    return VisionResponse(
        need_clearer_image=False,
        subject=str(parsed.get("subject", "general")),
        what_i_see=str(parsed.get("what_i_see", "")),
        answer=str(parsed.get("answer", "")),
        explanation_steps=[str(s) for s in steps][:8],
        key_concept=str(parsed.get("key_concept", "")),
        encouragement=str(parsed.get("encouragement", "Great work asking for help!")),
    )


@router.post("/improve-prompt", response_model=PromptResponse,
             summary="Improve an AI prompt (Prompt Training)")
async def improve_prompt(request: PromptRequest):
    raw = await call_ai(
        system_prompt=(
            PROMPT_TRAINER_PROMPT
            + f"\nExplain in {request.language} language."
            + variation_hint(request.age)
        ),
        user_message=f'Improve this prompt: "{request.prompt}"',
    )

    parsed = parse_json_response(raw)
    if parsed and all(k in parsed for k in ("improved_prompt", "explanation", "tip")):
        return PromptResponse(**parsed)

    return PromptResponse(
        improved_prompt=request.prompt,
        explanation=raw,
        tip="Be specific! Tell the AI who you are, what you want, and how you want the answer.",
    )
