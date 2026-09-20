# COGNIX Agent Backend

This backend is now bundled with the COGNIX education app. It contains the retrieval layer, structured LLM provider, diagnostic state machine, SQLite persistence and FastAPI endpoints.

## Run separately

From the project root:

```powershell
python -m pip install -r backend/agent_backend/requirements.txt
python backend/agent_backend/run.py
```

It listens on `http://127.0.0.1:8787`.

## Endpoints

- `GET /health`
- `POST /v1/diagnostic/next`
- `POST /v1/diagnostic/answer/{case_id}`
- `GET /v1/students/{student_id}/state`

The Node COGNIX server proxies these through `/api/agent/*`, so the browser never needs a separate backend origin.

If `OPENAI_API_KEY` is absent, the backend uses its deterministic fake provider.
