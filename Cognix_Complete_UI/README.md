# Cognix — AI Tutoring UI

A complete responsive frontend matching the Cognix UI developed in the conversation.

## Files

- `index.html` — page structure and navigation
- `styles.css` — full visual system, responsive layout and dark mode
- `script.js` — chat, navigation, file attachment UI, streak, notes, theme and backend integration

## Run locally

Because the page uses JavaScript modules/features and API requests, serve it with a local HTTP server.

### Python

```bash
cd cognix-ui
python -m http.server 5500
```

Open:

`http://localhost:5500`

## Connect your AI backend

Open `script.js` and edit:

```js
const CONFIG = {
  API_BASE_URL: "http://localhost:8000",
  CHAT_ENDPOINT: "/api/chat",
  STREAK_ENDPOINT: "/api/streak",
  STUDY_TIME_ENDPOINT: "/api/study-time",
  NOTES_ENDPOINT: "/api/notes",
  USE_DEMO_FALLBACK: false
};
```

### Chat endpoint

The frontend sends:

```json
{
  "message": "Explain Newton's second law",
  "messages": [
    {"role": "user", "content": "...", "time": 123456789}
  ],
  "files": [
    {"name": "notes.pdf", "type": "application/pdf", "size": 12345}
  ]
}
```

Return any of these shapes:

```json
{"reply": "Your AI tutor response..."}
```

or:

```json
{"message": "Your AI tutor response..."}
```

The UI also accepts `response` or `answer`.

## Other optional endpoints

### GET `/api/streak`

```json
{"streak": 12}
```

### GET `/api/study-time`

```json
{"minutes": 185}
```

### POST `/api/notes`

```json
{"notes": "Student notes..."}
```

The frontend also stores notes locally so the Notes page remains usable without a backend.

## File uploads

The current UI displays selected files and sends their metadata to `/api/chat`.

If your backend needs the actual binary files, replace the JSON request in `getAssistantReply()` with `FormData` and append:

```js
formData.append("message", text);
attachedFiles.forEach(file => formData.append("files", file));
```

Then remove the `Content-Type: application/json` header for that request so the browser sets multipart boundaries automatically.

## Authentication

The request uses:

```js
credentials: "include"
```

so it can work with cookie/session authentication when your backend is configured for CORS and credentials.

For JWT authentication, add an `Authorization` header in `apiFetch()`.

## CORS

If frontend and backend run on different ports/domains, configure your backend to allow the frontend origin and credentials as appropriate.

## Production

For deployment, serve these three files from your frontend host and point `API_BASE_URL` to the production backend. The UI has no dependency on a specific backend framework, so it can connect to Flask, FastAPI, Django, Node/Express, Spring, etc.
