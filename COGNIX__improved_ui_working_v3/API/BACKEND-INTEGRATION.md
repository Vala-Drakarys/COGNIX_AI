# COGNIX Backend Integration

The full Python agent backend is bundled under `backend/agent_backend/`.

## 1. Install the backend dependencies

```powershell
npm run backend:install
```

## 2. Run the full stack

```powershell
npm run dev:full
```

This starts:

- COGNIX web/server: `http://127.0.0.1:8765`
- Python agent backend: `http://127.0.0.1:8787`

The browser talks only to the COGNIX Node server. `/api/agent/*` is proxied to the Python agent backend.

## 3. Run separately (optional)

Terminal 1:

```powershell
npm run backend:dev
```

Terminal 2:

```powershell
npm run dev
```

## Backend API

- `GET /api/agent/health`
- `POST /api/agent/v1/diagnostic/next`
- `POST /api/agent/v1/diagnostic/answer/{case_id}`
- `GET /api/agent/v1/students/{student_id}/state`

The Python backend contains retrieval, structured OpenAI planning/evaluation, the application-owned diagnostic state machine, SQLite persistence, and the supplied Mathematics / Physics / Chemistry diagnostic data.

If no `OPENAI_API_KEY` is configured, the Python backend falls back to its deterministic fake provider.
