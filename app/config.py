"""
AI Assembly — Application Configuration
────────────────────────────────────────
Reads settings from the .env file.

LLM design: a *fallback chain* — the app tries each configured provider in
order. If one fails (rate limit, outage, bad key), it automatically falls
through to the next. You can configure as many or as few keys as you like;
providers without a key are skipped.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Central configuration for the entire application."""

    # ── AI Provider mode ─────────────────────────────────────────
    # "ollama"  → local-only (free, needs Ollama installed)
    # "openai"  → use the cloud fallback chain below (recommended)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")

    # ── Ollama (Local / Free) ────────────────────────────────────
    # https://ollama.com  →  ollama pull llama3.2
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

    # ── Cloud LLM fallback chain (tried in this order) ───────────
    # Providers with no key set are silently skipped.
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "llama3.1-8b")

    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

    TOGETHER_API_KEY: str = os.getenv("TOGETHER_API_KEY", "")
    TOGETHER_MODEL: str = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3-8b-chat-hf")

    # Generic OpenAI-compatible custom override (kept for back-compat).
    # If both OPENAI_API_KEY and OPENAI_BASE_URL are set, this is appended
    # to the chain as the last fallback.
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # ── YouTube Data API (free) ──────────────────────────────────
    # https://console.cloud.google.com/apis/credentials → enable "YouTube Data API v3"
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    # ── Storage Paths ────────────────────────────────────────────
    _base_dir: str = os.path.dirname(__file__)
    STORAGE_DIR: str = os.path.join(_base_dir, "storage")
    USERS_FILE: str = os.path.join(STORAGE_DIR, "users.json")
    PROGRESS_FILE: str = os.path.join(STORAGE_DIR, "progress.json")

    # ── Provider chain ───────────────────────────────────────────
    @property
    def llm_chain(self) -> list[dict]:
        """
        Return the ordered list of cloud LLM providers to try.

        Each entry: {name, base_url, api_key, model}.
        Providers without an API key are filtered out.
        """
        candidates = [
            {"name": "Groq",       "base_url": "https://api.groq.com/openai/v1",
             "api_key": self.GROQ_API_KEY,       "model": self.GROQ_MODEL},
            {"name": "OpenRouter", "base_url": "https://openrouter.ai/api/v1",
             "api_key": self.OPENROUTER_API_KEY, "model": self.OPENROUTER_MODEL},
            {"name": "Cerebras",   "base_url": "https://api.cerebras.ai/v1",
             "api_key": self.CEREBRAS_API_KEY,   "model": self.CEREBRAS_MODEL},
            {"name": "Mistral",    "base_url": "https://api.mistral.ai/v1",
             "api_key": self.MISTRAL_API_KEY,    "model": self.MISTRAL_MODEL},
            {"name": "Together",   "base_url": "https://api.together.xyz/v1",
             "api_key": self.TOGETHER_API_KEY,   "model": self.TOGETHER_MODEL},
        ]
        # Custom OpenAI-compatible endpoint (back-compat / power users)
        if self.OPENAI_API_KEY and self.OPENAI_BASE_URL:
            candidates.append({
                "name": "Custom",
                "base_url": self.OPENAI_BASE_URL,
                "api_key": self.OPENAI_API_KEY,
                "model": self.OPENAI_MODEL,
            })
        return [c for c in candidates if c["api_key"]]


# Single shared instance — import this everywhere
settings = Settings()

