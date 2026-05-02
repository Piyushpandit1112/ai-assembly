"""
KidLearn AI — AI Mentor Routes
────────────────────────────────
Endpoints:
  POST /ai/chat           → General child-friendly chat with AI
  POST /ai/improve-prompt → Teach kids how to write better AI prompts
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ai_service import call_ai, parse_json_response
from app.utils.prompt_templates import AI_TEACHER_PROMPT, PROMPT_TRAINER_PROMPT

router = APIRouter()


# ── Request / Response Models ───────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000,
                         example="What is gravity?")
    username: str = Field(default="friend", max_length=50,
                          example="Alex")
    language: str = Field(default="English", max_length=40,
                          example="Hindi")

class ChatResponse(BaseModel):
    reply: str
    username: str


class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000,
                        example="tell me about dogs")
    language: str = Field(default="English", max_length=40,
                          example="Telugu")

class PromptResponse(BaseModel):
    improved_prompt: str
    explanation: str
    tip: str


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse, summary="Chat with AI Mentor")
async def chat_with_ai(request: ChatRequest):
    """
    Send a message to the friendly AI mentor and get a simple,
    encouraging reply suitable for children aged 6–16.
    """
    # Personalise the system prompt with the child's name
    personalised_prompt = (
        AI_TEACHER_PROMPT
        + f"\n\nYou are talking to a child named {request.username}. "
                    f"Address them by name occasionally."
                + f"\nRespond in {request.language} language."
    )

    reply = await call_ai(
        system_prompt=personalised_prompt,
        user_message=request.message,
    )

    return ChatResponse(reply=reply, username=request.username)


@router.post("/improve-prompt", response_model=PromptResponse,
             summary="Improve an AI prompt (Prompt Training)")
async def improve_prompt(request: PromptRequest):
    """
    Take a weak or vague prompt and return an improved version
    with an explanation — teaching kids effective AI communication.
    """
    raw = await call_ai(
        system_prompt=(
            PROMPT_TRAINER_PROMPT
            + f"\nExplain in {request.language} language."
        ),
        user_message=f'Improve this prompt: "{request.prompt}"',
    )

    parsed = parse_json_response(raw)

    if parsed and all(k in parsed for k in ("improved_prompt", "explanation", "tip")):
        return PromptResponse(**parsed)

    # Fallback if the model didn't return clean JSON
    return PromptResponse(
        improved_prompt=request.prompt,
        explanation=raw,
        tip="Be specific! Tell the AI who you are, what you want, and how you want the answer.",
    )
