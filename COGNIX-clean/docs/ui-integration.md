# Cognix UI integration

The chat UI in `ui/` (index.html, styles.css, script.js) talks to the diagnostic engine through the engine's existing HTTP API. The backend and the original `frontend/` are unchanged.

## What was added or changed

- `ui/` — the Cognix UI, visually unchanged.
- `ui/cognix-bridge.js` — new. Turns chat messages into `/api/action` calls and engine state into chat replies. Also sends JPG/JPEG photos to `/api/transcribe`.
- `ui/index.html` — one added `<script src="cognix-bridge.js">` line.
- `ui/script.js` — `USE_DEMO_FALLBACK` set to `false`; `getAssistantReply` hands the message to the bridge; the attached files are captured before they are cleared.
- `server.mjs` — serves `ui/` at `/ui/`, redirects `/` to it, and keeps the original developer UI at `/lab`.

## Conversation flow

1. Send the question you lost marks on.
2. Send your own answer or attempt. This starts an investigation (`education` module; AI-assisted when `service.configured`, otherwise the reviewed engine).
3. Answer each diagnostic check with an option number or in your own words ("not sure" is allowed).
4. Reply Yes / No / Not sure to the proposed diagnosis.
5. The result and any targeted resource appear in the chat.

`stop` ends an investigation, `new` abandons it and starts over. An open investigation survives a page reload: the next message resumes it.

## Streak, study time and notes

These are now stored by the engine (`backend/api/study.mjs`, table `student_study` from `002_study.sql`), separate from the diagnostic profile so they never change its revision.

- `GET /api/streak?date=YYYY-MM-DD` returns `{streak, studied_today}`. A day counts when the student sent at least one question that day. Today staying open does not break the streak; a fully missed day does. The sidebar dots follow the real streak (up to 7).
- `GET /api/study-time` returns `{minutes, questions}`; `POST /api/study-time` records activity. Minutes are real: one minute is credited for each minute the page is visible and the student has interacted in the last two minutes (server-side, at most one credit per ~minute).
- `GET/POST /api/notes` stores the Notes page (50,000 characters max). The page still keeps a local copy, and the backend copy is loaded on start.
- The client sends its own local date, so streak days follow the student's time zone (accepted only within one day of UTC).

The UI refreshes these after every reply and when the Progress page opens. `/api/chat` is still not an engine endpoint; chat goes through `cognix-bridge.js`.
