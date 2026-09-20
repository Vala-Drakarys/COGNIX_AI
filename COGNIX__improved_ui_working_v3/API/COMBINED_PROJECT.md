# COGNIX Combined Project

This build combines the COGNIX demo application with the COGNIX Agent Foundation Skeleton.

- The existing web UI, Node server, deterministic diagnostic engine, persistence, validation, and optional OpenAI boundary are retained.
- `src/foundation/` contains the foundation model/enums and deterministic compatibility layer adapted from the skeleton.
- `backend/attachments/` is intentionally empty for future backend/provider attachments.
- `api/attachments/` is intentionally empty for future external API attachments.
- No API keys are included.

Run with Node.js 22.13+: `npm install`, `npm run build`, then `npm start`.

## UI redesign — Olive + Cream

The student-facing UI has been refreshed into a premium, learning-first visual system using **olive green and cream white** as the core palette. The dashboard now leads with an explanatory hero, calmer navigation, softer cards, spacious typography, and a visual Observe → Test → Learn motif while preserving the existing diagnostic engine, memory, AI boundary, and demo flow.

The local server serves `web/index.html` directly for `/`, so UI changes are visible during local development without requiring a rebuild first. `npm run build` remains available for producing the bundled worker.

Backend/API attachment placeholders are preserved at:
- `backend/attachments/`
- `api/attachments/`
