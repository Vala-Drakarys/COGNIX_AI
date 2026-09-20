import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker from '../backend/api/app.mjs';
import {adapter} from '../backend/state/database.mjs';

const sql = new DatabaseSync(':memory:');
for (const f of ['001_initial.sql', '002_study.sql']) sql.exec(fs.readFileSync('backend/db/migrations/' + f, 'utf8'));
const env = {DB: adapter(sql), LOCAL: true};
const cookie = 'cognix_session=11111111-1111-4111-8111-111111111111';
const other = 'cognix_session=22222222-2222-4222-8222-222222222222';

const call = (path, body, who = cookie) => worker.fetch(new Request('http://localhost' + path, {
  method: body ? 'POST' : 'GET',
  headers: {Cookie: who, 'Content-Type': 'application/json', Origin: 'http://localhost'},
  ...(body ? {body: JSON.stringify(body)} : {})
}), env);

const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test('study time is credited once per minute and questions count toward the streak', async () => {
  let res = await call('/api/study-time', {minutes: 1, date: day(0)});
  assert.equal((await res.json()).minutes, 1);
  res = await call('/api/study-time', {minutes: 1, date: day(0)});           // too soon: not credited
  assert.equal((await res.json()).minutes, 1);
  res = await call('/api/study-time', {questions: 1, date: day(0)});
  const body = await res.json();
  assert.equal(body.questions, 1);
  assert.equal(body.streak, 1);
  assert.equal(body.studied_today, true);
  assert.equal((await (await call('/api/streak?date=' + day(0))).json()).streak, 1);
});

test('streak counts consecutive days, survives an open today, and breaks on a gap', async () => {
  const seed = (who, days) => sql.prepare('INSERT INTO student_study (id, data) VALUES (?, ?)')
    .run(who.split('=')[1] + ':study', JSON.stringify({days, minutes: 0, questions: 0, notes: '', notes_updated: null, last_credit: 0}));
  const run = 'cognix_session=33333333-3333-4333-8333-333333333333';
  seed(run, [day(-3), day(-2), day(-1)]);                     // nothing yet today: streak stays alive
  assert.equal((await (await call('/api/streak?date=' + day(0), null, run)).json()).streak, 3);
  await call('/api/study-time', {questions: 1, date: day(0)}, run);   // today extends it
  assert.equal((await (await call('/api/streak?date=' + day(0), null, run)).json()).streak, 4);
  const gap = 'cognix_session=44444444-4444-4444-8444-444444444444';
  seed(gap, [day(-5), day(-4), day(-1)]);
  assert.equal((await (await call('/api/streak?date=' + day(1), null, gap)).json()).streak, 0);   // yesterday missed too
  assert.equal((await (await call('/api/streak?date=' + day(0), null, gap)).json()).streak, 1);
});

test('notes persist per student and never touch the diagnostic profile revision', async () => {
  const before = await (await call('/api/profile')).json();
  let res = await call('/api/notes', {notes: 'Newton II: F = ma'});
  assert.equal(res.status, 200);
  assert.equal((await (await call('/api/notes')).json()).notes, 'Newton II: F = ma');
  assert.equal((await (await call('/api/notes', null, other)).json()).notes, '');
  const after = await (await call('/api/profile')).json();
  assert.equal(after.profile.revision, before.profile.revision);
});

test('input is validated', async () => {
  assert.equal((await call('/api/notes', {notes: 5})).status, 400);
  assert.equal((await call('/api/notes', {notes: 'x'.repeat(50001)})).status, 413);
  assert.equal((await call('/api/streak', {})).status, 405);
  const bad = await worker.fetch(new Request('http://localhost/api/notes', {method: 'POST', headers: {Cookie: cookie, 'Content-Type': 'application/json', Origin: 'http://evil.example'}, body: '{"notes":"x"}'}), env);
  assert.equal(bad.status, 403);
  const capped = await (await call('/api/study-time', {minutes: 999, date: '1999-01-01'}, 'cognix_session=55555555-5555-4555-8555-555555555555')).json();
  assert.ok(capped.minutes <= 5);
});
