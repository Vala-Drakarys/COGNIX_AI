# COGNIX — START HERE

## Fastest way to run the web app

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:8765`.

## Full stack with the supplied Agent Backend

First install Python dependencies:

```powershell
npm run backend:install
```

Then run:

```powershell
npm run dev:full
```

Open `http://127.0.0.1:8765`.

The Python diagnostic agent runs on port `8787` and is proxied through the Node server. See `BACKEND-INTEGRATION.md`.

## UI behavior

COGNIX is a single-document, browser-scrollable education experience. Overview, Diagnostic Lab, Student Memory, and Demo & Setup are all rendered in one continuous page. There are no nested scroll panels for the timeline or main content.

## API key

Copy `.env.example` to `.env` and add `OPENAI_API_KEY` only if you want live model calls. Never put the key in `web/index.html`.
