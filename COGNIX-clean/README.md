# COGNIX Diagnostic Agent

A small, evidence-driven academic diagnostic backend with a separate browser frontend.

## Structure

```text
frontend/                 Browser UI
backend/
  api/                    HTTP application (app.mjs, transcribe.mjs for photo reading)
  agent/                  Diagnostic state machine and domain checks
  llm/                    Model client and response validation
    providers/openrouter.mjs OpenRouter text model transport
    providers/openai.mjs    Existing OpenAI photo-reading transport
  retrieval/              Dataset loader and relevance filtering
  state/                  Persistent profile state
  db/migrations/          SQLite schema
  dataset/                Seed educational knowledge corpus
  integrations/api/       Extension point for external API providers
tests/                    Unit and integration coverage
docs/                     Architecture and dataset notes
server.mjs                Local development server
```

## Run

Requires Node.js 22.13+.

```bash
cp .env.example .env
npm start
```

Open `http://127.0.0.1:8765`.

The application runs without an API key using the deterministic diagnostic engine. Put your `OPENROUTER_API_KEY` and `SLICE_MODEL=anthropic/claude-haiku-4.5` in `.env` to enable model-assisted educational diagnosis. The existing OpenAI key/model are kept only for the photo-reading path. `.env` is gitignored; never commit a key or paste it into source files.

## Photo input (JPG / JPEG)

The backend can read a JPG/JPEG photo of a question, attempt or answer into text: `POST /api/transcribe`. The text is returned for the student to review and edit; it is not submitted automatically, and the controller still decides everything. Photos are not stored or logged, only real JPG/JPEG files are accepted, and each session is limited to 10 photos per 10 minutes.

The UI is not modified. See `docs/photo-input.md` for the API contract and `docs/photo-upload.snippet.mjs` for a drop-in helper that any frontend can call.

Optional: set `OPENAI_VISION_MODEL` if you want a different image-capable model for photos.

## Dataset

`backend/dataset/` contains the 90 seed educational cases supplied for this version of COGNIX. They cover Mathematics, Physics and Chemistry.

The retrieval layer reads JSON knowledge documents from that directory at runtime. In Educational Dataset mode, the controller retrieves the closest cases and passes them to Claude as context; the model does not read the filesystem directly.

Expected document shape:

```json
{
  "id": "physics-newtons-second-law",
  "title": "Newton's Second Law",
  "topic": "Force and acceleration",
  "tags": ["force", "mass", "acceleration"],
  "content": "Knowledge content used as retrieval context."
}
```

Multiple documents can be stored in one JSON array or as separate JSON files. Malformed files are ignored rather than stopping a diagnostic session.

## Design

The model proposes within an allowed set of hypotheses and checks. The controller owns state transitions, evidence classification, revision limits, confirmation, and persistence. A model response cannot directly mutate diagnostic state.

Educational Dataset mode uses the supplied cases as the knowledge source and keeps the controller in charge of state, evidence and confirmation.

## Check that it works

```bash
npm test                                   # all automated tests
npm run check:ai                           # confirms the OpenRouter diagnostic model responds
npm run check:ai -- path/to/photo.jpg      # also confirms JPG/JPEG photo reading
```

In the app, the top badge should say **AI available**. Choose *AI-assisted engine* when you start an educational investigation; if the AI cannot be reached, the reviewed dataset check remains available.

## Test

```bash
npm test
```
