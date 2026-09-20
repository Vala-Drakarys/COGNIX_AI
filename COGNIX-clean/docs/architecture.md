# Architecture

## Request flow

Browser → HTTP API → diagnostic controller → retrieval/model services → persistent profile.

### Controller

The controller is authoritative for:

- state transitions
- attempt and revision limits
- allowed hypotheses
- evidence storage
- student confirmation
- profile updates

### When evidence is incomplete

Two failures on one skill with no correct answer confirm a diagnosis for the student to accept or reject. If the checks run out instead, the controller does not discard what it learned: a skill with more failures than correct answers is offered as a *provisional*, low-confidence diagnosis (`offerProvisional` in `controller.mjs`) that the student can accept or reject. Balanced or empty evidence still ends in a safe stop. Typed plain numbers are checked against the numeric answer key in `deterministic` (`catalog.mjs`); prose and expressions are never guessed.

### LLM

The model is used only for bounded, structured suggestions and interpretation. Responses are schema-checked and constrained to the currently permitted checks.

Text transport lives in `backend/llm/providers/openrouter.mjs`; `backend/llm/client.mjs` owns call limits, retries and validation. The existing OpenAI provider remains unchanged for JPG/JPEG photo transcription.

### Photo input

`backend/api/transcribe.mjs` validates a JPG/JPEG upload and calls `readImageText` in the OpenAI provider. It is stateless: it never touches the student profile, and its output is only text for the UI to place in an editable box. UI wiring is described in `docs/photo-input.md`.

### Retrieval

`backend/retrieval/index.mjs` loads the JSON corpus from `backend/dataset/` and returns relevant documents. Educational Dataset mode reads the supplied 90-case corpus; future JSON documents can be added without changing the retrieval interface.

### Persistence

Student profiles are stored as JSON in SQLite with optimistic revision checks and a short write lease to prevent concurrent updates from overwriting each other.
