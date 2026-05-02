"""
KidLearn AI — Subject Learning Service
────────────────────────────────────────
Explains any topic (Math, Science, History, etc.)
in a simple, child-friendly format with a quiz.
"""

from app.services.ai_service import call_ai, parse_json_response
from app.utils.prompt_templates import SUBJECT_EXPLAINER_PROMPT


async def explain_topic(topic: str, age: int = 10, language: str = "English") -> dict:
    """
    Generate a simple explanation, example, and quiz for a given topic.

    Args:
        topic: The subject topic (e.g., "photosynthesis", "fractions")
        age:   Child's age to tailor difficulty (default 10)

    Returns a dict with:
      - explanation:    Simple 2–3 sentence explanation
      - example:        A relatable real-life example
      - quiz_question:  One question to test understanding
    """
    user_message = (
        f"Explain the topic: '{topic}' "
        f"for a {age}-year-old child."
    )

    raw_response = await call_ai(
        system_prompt=(
            SUBJECT_EXPLAINER_PROMPT
            + f"\nWrite all JSON values in {language} language."
        ),
        user_message=user_message,
    )

    parsed = parse_json_response(raw_response)

    if parsed and all(k in parsed for k in ("explanation", "example", "quiz_question")):
        return parsed

    # Fallback: return raw text if JSON parsing fails
    return {
        "explanation": raw_response,
        "example": "Ask me for a specific example if you'd like one!",
        "quiz_question": "What did you learn about this topic today?",
    }
