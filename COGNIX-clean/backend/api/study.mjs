// Study streak, study time and notes for the Cognix UI.
//
//   GET  /api/streak      -> {streak, studied_today}
//   GET  /api/study-time  -> {minutes, questions}
//   POST /api/study-time  {minutes?: 0-5, questions?: 0|1, date?: "YYYY-MM-DD"}
//   GET  /api/notes       -> {notes, updated}
//   POST /api/notes       {notes: string}
//
// Kept in its own table (student_study), never in the diagnostic profile, so saving a note
// or a heartbeat can never change the profile revision or interfere with an investigation.
// A day counts toward the streak only when the student actually sent a question that day.
// The client passes its own local date (?date= or body.date) so day boundaries follow the
// student's time zone; the server accepts it only within one day of UTC.

const MAX_NOTES = 50000;
const MAX_MINUTES_PER_POST = 5;
const MIN_CREDIT_GAP_MS = 50_000;   // at most one minute credited per ~minute of wall time
const KEEP_DAYS = 400;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const dayNumber = day => Date.parse(day + 'T00:00:00Z') / 86400000;

function clientDay(value) {
  if (typeof value === 'string' && DAY.test(value) && Number.isFinite(Date.parse(value))
      && Math.abs(dayNumber(value) - dayNumber(utcDay())) <= 1) return value;
  return utcDay();
}

function streakOf(days, today) {
  const set = new Set(days);
  let cursor = dayNumber(today);
  if (!set.has(today)) cursor -= 1;            // today is still open; yesterday keeps the streak alive
  let count = 0;
  while (set.has(new Date(cursor * 86400000).toISOString().slice(0, 10))) { count++; cursor--; }
  return count;
}

async function read(db, id) {
  const row = await db.prepare('SELECT data FROM student_study WHERE id = ?').bind(id).first();
  const empty = {days: [], minutes: 0, questions: 0, notes: '', notes_updated: null, last_credit: 0};
  if (!row) return empty;
  try { return {...empty, ...JSON.parse(row.data)}; } catch { return empty; }
}

async function write(db, id, data) {
  await db.prepare('INSERT INTO student_study (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
    .bind(id, JSON.stringify(data)).run();
}

export async function studyRequest(request, env, sessionId, url) {
  const fail = (status, error) => ({status, body: {error}});
  try {
    if (!env.DB) return fail(503, 'Study data is unavailable right now.');
    const id = `${sessionId}:study`;
    const path = url.pathname;
    const data = await read(env.DB, id);

    if (request.method === 'GET') {
      const today = clientDay(url.searchParams.get('date'));
      if (path === '/api/streak') return {status: 200, body: {streak: streakOf(data.days, today), studied_today: data.days.includes(today)}};
      if (path === '/api/study-time') return {status: 200, body: {minutes: data.minutes, questions: data.questions}};
      return {status: 200, body: {notes: data.notes, updated: data.notes_updated}};
    }

    if (request.method !== 'POST' || path === '/api/streak') return fail(405, 'Method not allowed.');

    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return fail(403, 'Request origin not allowed.');
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return fail(415, 'JSON request required.');

    let body;
    try { body = JSON.parse(await request.text()); } catch { return fail(400, 'Invalid request JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Invalid request.');

    if (path === '/api/notes') {
      if (typeof body.notes !== 'string') return fail(400, 'Notes must be text.');
      if (body.notes.length > MAX_NOTES) return fail(413, 'Notes are too long to save.');
      data.notes = body.notes;
      data.notes_updated = new Date().toISOString();
      await write(env.DB, id, data);
      return {status: 200, body: {notes: data.notes, updated: data.notes_updated}};
    }

    const minutes = Number.isInteger(body.minutes) ? Math.min(Math.max(body.minutes, 0), MAX_MINUTES_PER_POST) : 0;
    const questions = body.questions === 1 ? 1 : 0;
    const today = clientDay(body.date ?? url.searchParams.get('date'));
    const now = Date.now();
    if (minutes > 0 && now - data.last_credit >= MIN_CREDIT_GAP_MS) {
      data.minutes += minutes;
      data.last_credit = now;
    }
    if (questions) {
      data.questions += 1;
      if (!data.days.includes(today)) data.days = [...data.days, today].sort().slice(-KEEP_DAYS);
    }
    await write(env.DB, id, data);
    return {status: 200, body: {minutes: data.minutes, questions: data.questions, streak: streakOf(data.days, today), studied_today: data.days.includes(today)}};
  } catch {
    return fail(503, 'Study data is unavailable right now.');
  }
}
