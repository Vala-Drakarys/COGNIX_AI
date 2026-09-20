# COGNIX Student Tutor Mode

The final prototype now opens directly into a simple study-chat experience.

## What changed

- Students can ask normal academic questions in natural language.
- Conversation history is persisted in SQLite, so follow-up questions retain context.
- The tutor can answer, teach, diagnose confusion, and ask a small understanding check.
- The existing deterministic diagnostic engine is still present at `/api/profile` and `/api/action` and remains available for the structured diagnostic/demo flow.
- The chat layer is intentionally thin: the LLM handles tutoring judgement while application state and persistence remain server-controlled.
- OpenRouter is the default Agent-a-Thon provider, with direct OpenAI still supported.
- Image/OCR input is intentionally not included yet; it can be added later as another input path into the same tutor engine.

## Configure

Copy `.env.example` to `.env` and set:

```text
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=inclusionai/ling-3.0-flash
```

Do not commit `.env` or API keys.

## Run

```bash
npm install
npm start
```

Then open `http://127.0.0.1:8765`.

## Walkthrough path

1. Ask a normal academic question.
2. Ask a follow-up question.
3. Say that the explanation is confusing or that you still do not understand.
4. COGNIX should change explanation strategy and, when appropriate, ask one targeted check.
5. Answer the check and continue the conversation.

The UI deliberately hides the state-machine and model complexity from the student.
