"""
AI Assembly — Core AI Service
──────────────────────────────
Provides the `call_ai()` function used by all feature services.

Implements an automatic fallback chain across multiple LLM providers:
if Groq fails (rate limit / outage / bad key) it transparently retries
on OpenRouter, then Cerebras, Mistral, Together, etc. — whichever
keys you've configured in `.env`.
"""

import json
import logging
import re
import httpx

from app.config import settings

log = logging.getLogger("ai_assembly.ai")


async def _try_provider(provider: dict, system_prompt: str, user_message: str) -> str:
    """Send one request to a single OpenAI-compatible provider. Raises on failure."""
    payload = {
        "model": provider["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "temperature": 0.7,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {provider['api_key']}",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            f"{provider['base_url']}/chat/completions",
            json=payload,
            headers=headers,
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]


async def _call_ollama(system_prompt: str, user_message: str) -> str:
    """Local Ollama call (no API key, no fallback)."""
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            f"{settings.OLLAMA_BASE_URL}/chat/completions",
            json=payload,
            headers={"Authorization": "Bearer ollama"},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def call_ai(system_prompt: str, user_message: str) -> str:
    """
    Send a message to the AI and return the response as a string.

    Behaviour:
      • AI_PROVIDER=ollama  → uses local Ollama only.
      • AI_PROVIDER=openai  → tries each configured cloud provider in
        order; falls through to the next on any error.
    """
    # Local-only mode
    if settings.AI_PROVIDER == "ollama":
        try:
            return await _call_ollama(system_prompt, user_message)
        except httpx.ConnectError:
            return ("⚠️ Cannot connect to Ollama. Run `ollama serve` "
                    "in a terminal and try again.")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return (f"⚠️ Model '{settings.OLLAMA_MODEL}' not found. "
                        f"Run:  ollama pull {settings.OLLAMA_MODEL}")
            return f"⚠️ Ollama error ({e.response.status_code})."
        except Exception as e:
            return f"⚠️ Ollama error: {e}"

    # Cloud fallback chain
    chain = settings.llm_chain
    if not chain:
        return ("⚠️ No LLM API key configured. Open `.env` and add at least "
                "one of: GROQ_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY, "
                "MISTRAL_API_KEY, TOGETHER_API_KEY.")

    errors = []
    for provider in chain:
        try:
            log.info("LLM call → %s (%s)", provider["name"], provider["model"])
            return await _try_provider(provider, system_prompt, user_message)
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            body = (e.response.text or "")[:160]
            log.warning("LLM provider %s failed (%s): %s",
                        provider["name"], status, body)
            errors.append(f"{provider['name']}: HTTP {status}")
            # 401/403 = bad key, 404 = bad model, 429 = rate limit,
            # 5xx = server issue → all worth falling through.
            continue
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            log.warning("LLM provider %s network error: %s",
                        provider["name"], e)
            errors.append(f"{provider['name']}: network")
            continue
        except Exception as e:
            log.warning("LLM provider %s unexpected error: %s",
                        provider["name"], e)
            errors.append(f"{provider['name']}: {type(e).__name__}")
            continue

    return ("⚠️ All AI providers failed. Tried: "
            + "; ".join(errors)
            + ". Please check your API keys in `.env` or try again later.")


def parse_json_response(raw: str) -> dict | None:
    """
    Try to extract a JSON object from the AI's response text.

    Local LLMs sometimes wrap JSON in markdown code blocks or add
    extra text. This function handles those cases gracefully.
    """
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None

