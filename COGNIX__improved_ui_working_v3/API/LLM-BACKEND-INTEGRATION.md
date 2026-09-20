# COGNIX FINAL 2 — Integrated LLM Backend

The LLM backend from `COGNIX w llm` has been integrated into `backend/llm_agent/`. The LLM project frontend was intentionally NOT copied.

## Architecture

Browser (FINAL 2 web UI) → Node server (`server.mjs`) → integrated LLM agent backend → deterministic diagnostic engine + optional OpenAI/OpenRouter model → separate SQLite state.

The FINAL 2 web UI keeps using `/api/profile` and `/api/action`; the Node server routes those endpoints to the integrated LLM agent. `/api/agent/health` reports the integrated LLM agent status.

## Run

```powershell
npm install
npm start
```

Open `http://127.0.0.1:8765`.

## Optional LLM configuration

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (or `LLM_PROVIDER=openrouter` with `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`) in `.env`. The deterministic diagnostic engine still works without a key.

The integrated LLM state uses `.local/cognix-llm.sqlite`, separate from the existing FINAL 2 database.
