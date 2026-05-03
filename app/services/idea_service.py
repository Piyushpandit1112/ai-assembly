"""
AI Assembly — Idea Generator Service
──────────────────────────────────────
Expands a learner's raw idea into a realistic engineering project plan
with real-world references, real components and a working architecture.
"""

from app.services.ai_service import call_ai, parse_json_response
from app.utils.prompt_templates import IDEA_GENERATOR_PROMPT


def _coerce_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [s.strip() for s in v.split("\n") if s.strip()]
    return [v]


def _fallback(idea: str) -> dict:
    return {
        "title": idea.title(),
        "summary": (
            f"We could not reach the AI right now, but here is a realistic starting "
            f"plan for '{idea}'. Treat this as a v0 outline — refine it once the AI is back online."
        ),
        "real_world_examples": [
            {"name": "Wikipedia overview", "by": "Wikipedia", "note": "Search for prior art and existing products."}
        ],
        "architecture": {
            "overview": (
                "Most projects have three layers: hardware (sensors / actuators), "
                "a controller (microcontroller or computer running software), and a "
                "user interface (app, website or buttons). Start by sketching these three layers."
            ),
            "components": [
                {"name": "Compute", "role": "Runs the logic", "tech": "Raspberry Pi 5 or Arduino Uno R4"},
                {"name": "Sensors", "role": "Read the world", "tech": "Depends on the project (camera, IMU, distance, etc.)"},
                {"name": "Actuators", "role": "Move / act", "tech": "Servo motors, BLDC motors, LEDs, speakers"},
            ],
            "data_flow": "Sensors -> microcontroller -> decision logic -> actuators / display."
        },
        "build_steps": [
            {"step": 1, "title": "Research", "detail": "Find 3 real existing products that are similar and read how they were built.", "skills": ["research"]},
            {"step": 2, "title": "Sketch the architecture", "detail": "Draw a block diagram of every part and how data flows.", "skills": ["systems-thinking"]},
            {"step": 3, "title": "Buy / borrow parts", "detail": "Order an Arduino or Raspberry Pi starter kit. Stick to common, well-documented hardware.", "skills": ["procurement"]},
            {"step": 4, "title": "Build a tiny prototype", "detail": "Get ONE component working end-to-end (e.g. blink an LED, read a sensor).", "skills": ["electronics", "coding"]},
            {"step": 5, "title": "Iterate", "detail": "Add features one at a time. Test after every change.", "skills": ["debugging"]},
        ],
        "challenges": [
            {"problem": "Scope is too big", "solution": "Cut the project into a tiny v0 that does one useful thing."},
            {"problem": "Hardware is expensive", "solution": "Start in simulation (Tinkercad, Wokwi) before buying parts."},
        ],
        "cost_estimate": "USD 30–150 for a starter kit + sensors.",
        "time_estimate": "4–12 weeks for a working v1, depending on complexity.",
        "safety_and_legal": "Adult supervision for soldering / batteries. Some projects (drones, robots in public) need permits.",
        "references": [
            {"title": "Arduino official docs", "url": "https://docs.arduino.cc/"},
            {"title": "Raspberry Pi documentation", "url": "https://www.raspberrypi.com/documentation/"}
        ],
        "next_actions": [
            "Watch one YouTube tutorial that builds something similar end-to-end.",
            "Sketch your block diagram on paper.",
        ],
    }


async def generate_idea(idea: str, language: str = "English", age: int = 14) -> dict:
    """
    Take a learner's idea and return a realistic, engineering-grade plan.
    """
    from app.utils.prompt_templates import variation_hint
    raw_response = await call_ai(
        system_prompt=(
            IDEA_GENERATOR_PROMPT
            + f"\nWrite all human-readable JSON values in {language} language. Keep URLs and tech names in English."
            + variation_hint(age)
        ),
        user_message=f"My idea is: {idea}",
    )

    parsed = parse_json_response(raw_response)
    if not parsed or not isinstance(parsed, dict):
        return _fallback(idea)

    # Normalise: ensure all expected keys exist, coerce list-shaped fields
    fb = _fallback(idea)
    out = {
        "title":               parsed.get("title")               or fb["title"],
        "summary":             parsed.get("summary")             or fb["summary"],
        "real_world_examples": _coerce_list(parsed.get("real_world_examples")) or fb["real_world_examples"],
        "architecture":        parsed.get("architecture")        or fb["architecture"],
        "build_steps":         _coerce_list(parsed.get("build_steps")) or fb["build_steps"],
        "challenges":          _coerce_list(parsed.get("challenges")) or fb["challenges"],
        "cost_estimate":       parsed.get("cost_estimate")       or fb["cost_estimate"],
        "time_estimate":       parsed.get("time_estimate")       or fb["time_estimate"],
        "safety_and_legal":    parsed.get("safety_and_legal")    or fb["safety_and_legal"],
        "references":          _coerce_list(parsed.get("references")) or fb["references"],
        "next_actions":        _coerce_list(parsed.get("next_actions")) or fb["next_actions"],
    }
    # Make sure architecture has the sub-keys
    arch = out["architecture"]
    if not isinstance(arch, dict):
        arch = fb["architecture"]
    arch.setdefault("overview", fb["architecture"]["overview"])
    arch.setdefault("components", fb["architecture"]["components"])
    arch.setdefault("data_flow", fb["architecture"]["data_flow"])
    arch["components"] = _coerce_list(arch.get("components"))
    out["architecture"] = arch

    return out
