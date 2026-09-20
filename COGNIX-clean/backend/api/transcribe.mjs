// POST /api/transcribe — read a JPG/JPEG photo into editable text.
//
// Stateless by design: it does not load or change the student's profile, and the
// photo is neither stored nor logged. The returned text is only a suggestion for
// the text box; the student reviews it and submits through the normal /api/action.

import {isConfigured, readImageText} from '../llm/providers/openai.mjs';

const TEXT_LIMITS = {question: 2500, attempt: 1500, answer: 1000}; // match the controller
const MAX_JSON_CHARS = 3_000_000;
const MAX_IMAGE_BYTES = 2_200_000;
const MIN_IMAGE_BYTES = 100;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const hits = new Map(); // sessionId -> timestamps (in memory; resets on restart)

function rateLimited(sessionId, now = Date.now()) {
  const recent = (hits.get(sessionId) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(sessionId, recent);
    return true;
  }
  recent.push(now);
  hits.set(sessionId, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (!times.some(t => now - t < WINDOW_MS)) hits.delete(key);
  }
  return false;
}

export async function transcribeRequest(request, env, sessionId) {
  const fail = (status, error) => ({status, body: {error}});

  try {
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return fail(403, 'Request origin not allowed.');
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return fail(415, 'JSON request required.');
    if (!isConfigured(env)) return fail(503, 'Photo reading needs an AI key. Type the text instead.');

    const raw = await request.text();
    if (raw.length > MAX_JSON_CHARS) return fail(413, 'That photo is too large. Try a smaller JPG.');

    let body;
    try { body = JSON.parse(raw); } catch { return fail(400, 'Invalid request JSON.'); }

    const target = body?.target;
    if (typeof target !== 'string' || !Object.hasOwn(TEXT_LIMITS, target)) return fail(400, 'Invalid photo target.');

    // Only JPG/JPEG. Both extensions share the image/jpeg MIME type.
    const match = typeof body.image === 'string'
      && body.image.match(/^data:image\/(?:jpeg|jpg);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) return fail(415, 'Only JPG or JPEG photos are supported.');

    const b64 = match[1];
    const approxBytes = Math.floor(b64.length * 3 / 4);
    if (approxBytes < MIN_IMAGE_BYTES) return fail(415, 'That file does not look like a JPG photo.');
    if (approxBytes > MAX_IMAGE_BYTES) return fail(413, 'That photo is too large. Try a smaller JPG.');

    // Check the real file signature (FF D8 FF), not just the label the browser sent.
    const head = atob(b64.slice(0, 8));
    if (head.charCodeAt(0) !== 0xFF || head.charCodeAt(1) !== 0xD8 || head.charCodeAt(2) !== 0xFF) {
      return fail(415, 'That file does not look like a JPG photo.');
    }

    if (rateLimited(sessionId)) return fail(429, 'Too many photos in a short time. Wait a few minutes or type the text.');

    const result = await readImageText(env, {dataUrl: `data:image/jpeg;base64,${b64}`, target});
    const text = typeof result?.text === 'string' ? result.text.trim() : '';
    if (!result?.legible || !text) {
      return fail(422, 'The photo could not be read clearly. Retake it in good light, or type the text.');
    }

    const limit = TEXT_LIMITS[target];
    return {status: 200, body: {text: text.slice(0, limit), truncated: text.length > limit}};
  } catch {
    // Deliberately generic: never echo provider errors (they can contain request details).
    return fail(502, 'Photo reading is unavailable right now. Type the text instead.');
  }
}
