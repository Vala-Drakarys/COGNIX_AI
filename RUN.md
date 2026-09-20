# COGNIX — Run Guide

## Requirements

- Node.js 22.13+
- npm
- Internet connection for AI-assisted mode
- OpenRouter API key for the diagnostic AI

## 1. Install

Open a terminal in the project root:

```bash
npm install
```

The project root is the folder containing:

```text
package.json
server.mjs
frontend/
backend/
tests/
```

## 2. Configure AI

Create the environment file:

```bash
cp .env.example .env
```

Open `.env` and add the required API key:

```env
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
SLICE_MODEL=anthropic/claude-haiku-4.5
```

For photo/question image input, also configure:

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

Never commit `.env` or expose API keys in the repository.

## 3. Start COGNIX

Run:

```bash
npm start
```

The server will start at:

```text
http://127.0.0.1:8765
```

Open this address in a browser.

## 4. AI Availability Check

Before the demo, verify that the diagnostic model is reachable:

```bash
npm run check:ai
```

If the check fails, verify the API key, model configuration, credits/limits, and internet connection.

## 5. Run Tests

Run the complete automated test suite:

```bash
npm test
```

The repository includes tests covering agent/controller behaviour, diagnostic flow, education module, AI providers, image input, integration, and diagnosis fallback.

## 6. Demonstration Flow

1. Start the server.
2. Open the COGNIX interface.
3. Create/select a student profile.
4. Start an educational investigation.
5. Submit the student's response.
6. Allow COGNIX to interpret the evidence.
7. Observe the hypothesis/diagnostic progression.
8. Continue the investigation.
9. Check the student's progress and diagnosis.
10. Open the student's notes/profile to verify persistence.
11. Start another chat/session for the same student to demonstrate profile continuity.

## 7. AI-Assisted Mode

When starting an educational investigation, select:

```text
AI-assisted engine
```

In live mode, COGNIX uses the configured OpenRouter model for model-assisted diagnostic planning and answer interpretation.

If the model is unavailable, the system falls back to the reviewed dataset/deterministic diagnostic path.

## 8. Photo Input

COGNIX can accept a JPG/JPEG image containing a question, attempt, or answer.

Test the photo-reading path with:

```bash
npm run check:ai -- path/to/photo.jpg
```

Only JPG/JPEG files are accepted by this path.

## 9. Dataset

The educational diagnostic dataset is located at:

```text
backend/dataset/
```

The dataset contains educational diagnostic cases covering Mathematics, Physics, and Chemistry.

## 10. Local Data

COGNIX stores persistent local state using SQLite.

The default database is:

```text
.local/cognix.sqlite
```

The database is created automatically when the server starts.

To use another database location:

```env
COGNIX_DB=./.local/cognix.sqlite
```

## 11. Useful Commands

Start the application:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Run all tests:

```bash
npm test
```

Check AI connectivity:

```bash
npm run check:ai
```

Check AI and photo input:

```bash
npm run check:ai -- path/to/photo.jpg
```

## 12. Demo Verification

Before the final demo, verify:

```text
[ ] Repository is on the default/main branch
[ ] npm install succeeds
[ ] npm test passes
[ ] npm run check:ai succeeds
[ ] COGNIX starts with npm start
[ ] Student profile can be created
[ ] Investigation can be completed
[ ] Progress and diagnosis are persisted
[ ] A second session can access the existing student profile
[ ] AI-assisted mode works with the configured model
[ ] Photo input works if being demonstrated
[ ] No API keys are committed
```

## 13. Offline Verification

Run the same demonstration once with the network available and once with the network disabled.

With the network available:

```text
AI-assisted mode
        ↓
Model request
        ↓
AI response
        ↓
Validated diagnostic result
```

With the network disabled:

```text
AI request unavailable
        ↓
COGNIX handles the unavailable model path
        ↓
Reviewed/deterministic fallback where applicable
```

The purpose of this test is to verify that the AI-assisted path genuinely depends on the configured model and that the application handles model unavailability safely.

## 14. Repository Entry Point

The main application entry point is:

```text
server.mjs
```

The main diagnostic components are organised under:

```text
backend/
├── agent/
├── api/
├── llm/
├── retrieval/
├── state/
├── db/
└── dataset/
```

The browser interfaces are under:

```text
frontend/
ui/
```

## Final Demo

Recommended sequence:

```text
Start COGNIX
      ↓
Create / select student
      ↓
Start investigation
      ↓
Student response
      ↓
AI interpretation
      ↓
Hypothesis / diagnostic check
      ↓
Evidence update
      ↓
Progress + diagnosis
      ↓
Persist to student profile
      ↓
Open another session
      ↓
Verify previous student context
```

COGNIX should be demonstrated from the clean repository using the commands above.
