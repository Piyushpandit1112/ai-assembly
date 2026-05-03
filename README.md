# ⚙️ AI Assembly

> An AI-powered learning + project-blueprint platform for ages 6–16.
> Chat with Buddy, climb the English path (Grammar / Spoken / Writing), play brain games, and turn any idea into a real engineering blueprint with components, references and cost estimates.

---

## ✨ Features

| Tab | What it does |
|---|---|
| 🧠 **Buddy Chat** | Friendly AI mentor that explains concepts at a kid's level |
| 🎙️ **Talk Mode** | Real spoken conversation with Buddy (5–60 min). Live transcript of you + AI, copy/download. Uses browser speech recognition + speech synthesis. |
| 📷 **Photo Help** | Upload a homework photo. Buddy reads it and gives a step-by-step kid-friendly explanation. If the image is blurry, it asks for a clearer one instead of guessing. |
| 📚 **English** | Three sub-tabs (Grammar, Spoken, Writing) with a multi-stage interactive lesson player — narration, animations, quizzes, mic, writing check |
| 📖 **Learn** | AI subject explainer (dinosaurs, space, ocean, …) |
| 💡 **Idea Lab** | Realistic engineering blueprint with components, real-world examples, cost / time estimates and reference URLs |
| 🎮 **Brain Games** | Math sprint, memory match, word scramble, riddles, quiz |
| 📊 **Progress** | XP, streak, badges, hearts — per-user namespaced storage |

### 🎯 Smart by default
- **Age-adaptive** — pick your age once and every prompt (chat, English, Topics, Idea Lab, Talk, Photo Help) is automatically tuned to that vocab + complexity level (≤7, ≤10, ≤13, ≤16, adult).
- **Anti-repeat** — every quiz, lesson, correction and explanation is freshly varied per user and per visit (timestamp + nonce + rotating analogy flavour). Two students will not see the same questions back-to-back.
- **No-hallucination Photo Help** — when the image is unreadable the model is forced to reply `need_clearer_image` with a tip instead of inventing an answer.

### 🆕 New endpoints
| Method | Path | What it does |
|---|---|---|
| `POST` | `/ai/talk` | Multi-turn voice chat. Body: `{message, history[], username, age, language, is_first_turn}` |
| `POST` | `/ai/vision` | `multipart/form-data` with `file` (jpg/png/webp ≤ 8 MB), optional `question`, `username`, `age`, `language`. Returns structured JSON. |

---

## 🚀 Run Locally (free, with Ollama)

### 1 · Prerequisites
- **Python 3.11+**  → https://www.python.org/downloads/
- **Ollama**         → https://ollama.com (provides the local LLM)

### 2 · Install
```powershell
# Clone / open the project, then from the project root:
python -m venv venv
.\venv\Scripts\Activate.ps1            # Windows
# source venv/bin/activate             # macOS / Linux

pip install -r requirements.txt
```

### 3 · Pull a model & start Ollama
```powershell
ollama pull llama3.2
ollama serve                            # leave this running in its own terminal
```

### 4 · Configure
```powershell
copy .env.example .env                  # cp .env.example .env on macOS/Linux
# .env defaults already work for Ollama — no editing needed.
```

### 5 · Run the app
```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open **http://localhost:8000**. Done. 🎉

---

## ☁️ Deploy for FREE (Render + multi-LLM fallback chain)

AI Assembly is built to run on free hosting (Render, Railway, Fly.io, HF Spaces, etc.). It uses an **automatic LLM fallback chain** so a single rate-limit doesn't take your app down.

### A · Get your free API keys (~3 minutes total)

You only need **one LLM key** to start. Adding more = automatic redundancy.

| # | Provider | Where | Free tier |
|---|---|---|---|
| ⭐ | **Groq** *(primary)* | <https://console.groq.com/keys> | 14,400 req/day |
| 2 | **OpenRouter** | <https://openrouter.ai/keys> | many `:free` models |
| 3 | **Cerebras** | <https://cloud.cerebras.ai/> | 1M tokens/day |
| 4 | **Together AI** | <https://api.together.xyz/settings/api-keys> | $5 free credit |
| 🎬 | **YouTube Data API** *(optional)* | <https://console.cloud.google.com/apis/credentials> → enable *YouTube Data API v3* | 10,000 units/day |

> Mistral & OpenAI require a paid account — skip them if you only want free tiers.

### B · Push your code to GitHub

```powershell
git init
git add .
git commit -m "AI Assembly — initial deploy"
# create a new empty repo on github.com, then:
git branch -M main
git remote add origin https://github.com/<your-username>/ai-assembly.git
git push -u origin main
```

> ✅ `.env` is already in [.gitignore](.gitignore) — your real keys will **not** be pushed. Only [.env.example](.env.example) is committed.

### C · Deploy on Render (free web service)

1. Go to <https://render.com> → sign in with GitHub.
2. Click **New +** → **Web Service** → pick your `ai-assembly` repo.
3. Render auto-detects [render.yaml](render.yaml) and pre-fills:
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT --timeout 180`
   - **Plan:** Free
4. Under **Environment** → **Add Environment Variable** for each key you want to enable:

   | Key | Value (paste yours) | Required? |
   |---|---|---|
   | `AI_PROVIDER` | `openai` | ✅ |
   | `GROQ_API_KEY` | `gsk_…` | ✅ at least one LLM |
   | `OPENROUTER_API_KEY` | `sk-or-v1-…` | optional fallback |
   | `CEREBRAS_API_KEY` | `csk-…` | optional fallback |
   | `TOGETHER_API_KEY` | `tgp_v1_…` | optional fallback |
   | `YOUTUBE_API_KEY` | `AIzaSy…` | optional, for real videos |

   > Tip: keep them as **secret** (sync = false). The defaults for `GROQ_MODEL`, `OPENROUTER_MODEL`, etc. are already baked into [app/config.py](app/config.py), so you don't need to set them unless you want a different model.

5. Click **Create Web Service**. Wait ~3 minutes for the first build.
6. Render gives you a public URL like `https://ai-assembly.onrender.com` — that's your live site. 🚀

> ⚠️ Render's free tier sleeps after 15 minutes of inactivity. The first request after a sleep takes ~30 s to wake. That's normal for free hosting.

### D · Verify your deployment
- `https://<your-app>.onrender.com/health` → returns `{"status":"healthy","app":"AI Assembly", …}`
- `https://<your-app>.onrender.com/docs` → interactive API docs
- `https://<your-app>.onrender.com/media/youtube?q=photosynthesis` → real videos JSON
- `https://<your-app>.onrender.com/` → the full UI

---

## 🔄 Other free deployment options

| Platform | Notes |
|---|---|
| **Railway** | Same [Procfile](Procfile). Free tier: 500 hours/month. |
| **Fly.io**  | Use a `fly.toml`; free 3 shared-cpu VMs. |
| **HF Spaces (Docker)** | Use the included [Dockerfile](Dockerfile) route; permanent free hosting. |
| **PythonAnywhere** | Free tier supports `gunicorn` style apps. |

All platforms accept the same env vars from the table above.

---

## 🆓 Free LLM providers — automatic fallback chain

AI Assembly tries multiple LLM providers **in order** until one succeeds.
If Groq is rate-limited, it transparently falls through to OpenRouter,
then Cerebras, then Mistral, then Together, then any custom endpoint.
Set as many keys as you want — providers without a key are skipped.

| Order | Provider | Get key | Free tier | `.env` variable |
|---|---|---|---|---|
| 1 | **Groq** *(recommended primary)* | <https://console.groq.com/keys> | 14,400 req/day | `GROQ_API_KEY` |
| 2 | **OpenRouter** | <https://openrouter.ai/keys> | many `:free` models | `OPENROUTER_API_KEY` |
| 3 | **Cerebras** | <https://cloud.cerebras.ai/> | 1M tokens/day | `CEREBRAS_API_KEY` |
| 4 | **Mistral** | <https://console.mistral.ai/api-keys/> | rate-limited free tier | `MISTRAL_API_KEY` |
| 5 | **Together AI** | <https://api.together.xyz/settings/api-keys> | $5 free credit | `TOGETHER_API_KEY` |
| 6 | **Custom** *(any OpenAI-compatible endpoint)* | — | — | `OPENAI_BASE_URL` + `OPENAI_API_KEY` + `OPENAI_MODEL` |

> Tip: just paste **two or three keys** for redundancy. If one provider is
> down or rate-limited, the others keep your app running. Models are
> overridable per-provider via `GROQ_MODEL`, `OPENROUTER_MODEL`, etc.

The chain is built in [app/config.py](app/config.py) (`Settings.llm_chain`)
and consumed by [app/services/ai_service.py](app/services/ai_service.py)
(`call_ai()` loops through the list).

---


## 🎁 Optional FREE API keys (extra features)

These are 100% optional — the app works without them. Each one unlocks a richer
experience. **Where to add the value:** locally → `.env` file • on Render →
Dashboard → Service → **Environment** tab → Add variable.

| What it unlocks | Variable name | Get a key (free) | Free quota |
|---|---|---|---|
| **Real YouTube videos** in the *Watch & Learn* stage of lessons (kid-safe filter, embeddable only) | `YOUTUBE_API_KEY` | <https://console.cloud.google.com/apis/credentials> → enable *YouTube Data API v3* → Create credentials → API key | 10,000 units/day (~100 searches) |

### Setup steps for `YOUTUBE_API_KEY`

1. Go to <https://console.cloud.google.com/> → create / pick a project.
2. **APIs & Services → Library** → search `YouTube Data API v3` → **Enable**.
3. **APIs & Services → Credentials → + CREATE CREDENTIALS → API key** → copy.
4. Paste the value:
   - **Local dev:** open `.env` and set `YOUTUBE_API_KEY=AIzaSy…`
   - **Render:** Dashboard → your service → **Environment** → add var → Save.
5. Restart the server (locally) or wait for Render auto-redeploy.

The relevant code paths:

- Settings:        [app/config.py](app/config.py)           — reads `YOUTUBE_API_KEY`
- HTTP helper:     [app/services/youtube_service.py](app/services/youtube_service.py)
- API endpoint:    [app/api/routes/media.py](app/api/routes/media.py) — `GET /media/youtube?q=…`
- Frontend usage:  [frontend/app.js](frontend/app.js)       — `loadStageWatchVideos()`

When the key is missing, the *Watch* stage cleanly falls back to a YouTube search link.

---

## 📁 Project structure

```
AIAssembly/
├── app/
│   ├── main.py              # FastAPI entry point + static UI
│   ├── config.py            # Reads .env (Ollama / OpenAI-compatible)
│   ├── api/routes/          # /ai /english /learn /idea /progress
│   ├── services/            # AI business logic per feature
│   └── utils/               # Prompt templates, storage helpers
├── frontend/
│   ├── index.html           # Single-page UI shell
│   ├── style.css            # Mobile-responsive styles
│   └── app.js               # Lesson player, idea lab, games
├── requirements.txt
├── render.yaml              # 1-click Render deploy config
├── Procfile                 # Heroku/Railway-compatible
├── runtime.txt              # Python version pin
└── .env.example             # Copy to .env
```

---

## 🛠️ Troubleshooting

- **`ModuleNotFoundError`** → activate the venv before running.
- **`⚠️ Cannot connect to the AI service`** locally → run `ollama serve` in another terminal.
- **`⚠️ AI service error (401)`** in the cloud → wrong/missing `OPENAI_API_KEY`.
- **`⚠️ AI service error (404)`** → model name not available on the chosen provider.
- **First request slow on Render free tier** → expected; the dyno was asleep.

---

⚙️ **AI Assembly** — *Build. Learn. Ship.* 🚀
