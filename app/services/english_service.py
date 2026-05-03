"""
KidLearn AI — English Coach Service
──────────────────────────────────────
Handles grammar/spelling correction with child-friendly explanations.
"""

from app.services.ai_service import call_ai, parse_json_response
from app.utils.prompt_templates import (
    ENGLISH_COACH_PROMPT, ENGLISH_LESSON_PROMPT, variation_hint,
)


async def correct_english(sentence: str, language: str = "English",
                          age: int = 10) -> dict:
    """
    Analyse a sentence for grammar/spelling errors.

    Returns a dict with:
      - corrected:      The fixed sentence
      - mistake:        Simple explanation of what was wrong
      - better_version: A more expressive rewrite
    """
    raw_response = await call_ai(
        system_prompt=(
            ENGLISH_COACH_PROMPT
            + f"\nWrite all fields in {language} language."
            + variation_hint(age)
        ),
        user_message=f'Please correct this sentence: "{sentence}"',
    )

    parsed = parse_json_response(raw_response)

    if parsed and all(k in parsed for k in ("corrected", "mistake", "better_version")):
        return parsed

    # Fallback: AI didn't return clean JSON — return raw text gracefully
    return {
        "corrected": sentence,
        "mistake": raw_response,
        "better_version": "Could not generate an improved version. Please try again!",
    }


async def generate_english_lesson(
    topic: str,
    level: str = "basic",
    language: str = "English",
    age: int = 10,
) -> dict:
    """Generate a structured English micro-lesson with grammar + spoken + writing practice."""
    raw_response = await call_ai(
        system_prompt=(
            ENGLISH_LESSON_PROMPT
            + f"\nWrite all JSON values in {language} language."
            + variation_hint(age)
        ),
        user_message=(
            f"Create an English lesson for topic '{topic}' at '{level}' level. "
            "Include grammar explanation, spoken tip, and writing task."
        ),
    )

    parsed = parse_json_response(raw_response)
    needed_keys = (
        "concept",
        "rules",
        "examples",
        "practice_question",
        "spoken_tip",
        "writing_task",
    )

    def _to_str(v) -> str:
        if v is None:
            return ""
        if isinstance(v, str):
            return v
        if isinstance(v, (list, tuple)):
            return " ".join(_to_str(x) for x in v)
        if isinstance(v, dict):
            # Pick first string-ish value if dict
            for val in v.values():
                if isinstance(val, str):
                    return val
            return str(v)
        return str(v)

    def _to_list(v) -> list:
        if v is None:
            return []
        if isinstance(v, list):
            return [_to_str(x) for x in v if x not in (None, "")]
        if isinstance(v, str):
            return [s.strip() for s in v.split("\n") if s.strip()]
        if isinstance(v, dict):
            return [_to_str(x) for x in v.values()]
        return [str(v)]

    if parsed and all(k in parsed for k in needed_keys):
        return {
            "concept": _to_str(parsed.get("concept")),
            "rules": _to_list(parsed.get("rules")),
            "examples": _to_list(parsed.get("examples")),
            "practice_question": _to_str(parsed.get("practice_question")),
            "spoken_tip": _to_str(parsed.get("spoken_tip")),
            "writing_task": _to_str(parsed.get("writing_task")),
        }

    return {
        "concept": f"Let's learn {topic} step by step!",
        "rules": [
            "Read one sentence carefully.",
            "Find the important words.",
            "Speak slowly and clearly.",
        ],
        "examples": [
            "I am a student.",
            "She is reading a book.",
            "They are playing outside.",
        ],
        "practice_question": f"Can you make one sentence using {topic}?",
        "spoken_tip": "Open your mouth clearly and speak each word slowly.",
        "writing_task": "Write 3-5 lines about your day using correct grammar.",
    }
