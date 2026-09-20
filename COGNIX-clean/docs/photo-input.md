# Photo input (JPG / JPEG) — integration guide

The backend accepts photos; the UI is intentionally untouched. Wire it into any frontend in one of two ways.

## Option A — use the drop-in helper

Copy `docs/photo-upload.snippet.mjs` next to the UI code and call `attachPhotoUpload(textarea, target)` for each box (see the comment at the top of the file).

## Option B — call the endpoint yourself

`POST /api/transcribe?profile=practice` (same origin, cookies included, `Content-Type: application/json`)

Request:

```json
{"image": "data:image/jpeg;base64,<...>", "target": "question"}
```

- `image`: JPG or JPEG only (`data:image/jpeg;...` or `data:image/jpg;...`). Shrink first: max ~1600 px on the long side, re-encoded as JPEG, keeps it well under the 2.2 MB limit.
- `target`: `question` (2500 chars), `attempt` (1500), or `answer` (1000). These match the controller's limits.

Success `200`: `{"text": "...", "truncated": false}` — put `text` in the student's text box for review; do not submit it automatically.

Errors `{"error": "..."}` (safe to show to the student): `400` bad request, `403` wrong origin, `413` too large, `415` not a real JPG, `422` unreadable photo, `429` more than 10 photos per 10 min per session, `502` provider failure, `503` no API key configured.

Show the upload control only when `GET /api/profile` returns `service.configured === true` and the profile is not `demo`.

The endpoint is stateless: it does not read or change the student profile, and photos are neither stored nor logged.
