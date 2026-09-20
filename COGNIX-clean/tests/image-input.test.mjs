import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../backend/api/app.mjs';

const jpegBytes = (n = 400) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(n, 7)]);
const dataUrl = (bytes = jpegBytes(), mime = 'jpeg') => `data:image/${mime};base64,${bytes.toString('base64')}`;
const model = obj => async () => new Response(JSON.stringify({output: [{content: [{type: 'output_text', text: JSON.stringify(obj)}]}]}));
const envWith = (fetchImpl, extra = {}) => ({OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', MODEL_FETCH: fetchImpl, ...extra});

function post(body, {cookie, origin = 'http://localhost', raw} = {}) {
  return new Request('http://localhost/api/transcribe', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin, Cookie: cookie || ''},
    body: raw ?? JSON.stringify(body)
  });
}

test('JPG and JPEG photos are read into text and sent to the model as an image', async () => {
  for (const mime of ['jpeg', 'jpg']) {
    let sent;
    const env = envWith(async (url, init) => {
      sent = JSON.parse(init.body);
      return model({text: 'A 2 kg object is acted on by a net force of 10 N.', legible: true})();
    });
    const res = await worker.fetch(post({image: dataUrl(jpegBytes(), mime), target: 'question'}), env);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {text: 'A 2 kg object is acted on by a net force of 10 N.', truncated: false});
    const part = sent.input[0].content.find(c => c.type === 'input_image');
    assert.ok(part.image_url.startsWith('data:image/jpeg;base64,'));
    assert.equal(sent.store, false);
    assert.equal(sent.text.format.strict, true);
  }
});

test('vision model override is used when set', async () => {
  let model_;
  const env = envWith(async (u, init) => { model_ = JSON.parse(init.body).model; return model({text: 'x = 5', legible: true})(); }, {OPENAI_VISION_MODEL: 'vision-model'});
  await worker.fetch(post({image: dataUrl(), target: 'answer'}), env);
  assert.equal(model_, 'vision-model');
});

test('non-JPEG uploads, fake JPEGs and bad targets are rejected before any model call', async () => {
  let calls = 0;
  const env = envWith(async () => { calls++; return model({text: 'x', legible: true})(); });
  const png = await worker.fetch(post({image: dataUrl(jpegBytes(), 'png'), target: 'answer'}), env);
  assert.equal(png.status, 415);
  const fake = await worker.fetch(post({image: dataUrl(Buffer.alloc(500, 1)), target: 'answer'}), env);
  assert.equal(fake.status, 415);
  const tiny = await worker.fetch(post({image: dataUrl(jpegBytes(5)), target: 'answer'}), env);
  assert.equal(tiny.status, 415);
  const target = await worker.fetch(post({image: dataUrl(), target: 'constructor'}), env);
  assert.equal(target.status, 400);
  const json = await worker.fetch(post(null, {raw: '{nope'}), env);
  assert.equal(json.status, 400);
  assert.equal(calls, 0);
});

test('oversized photos, cross-origin requests and missing AI key are refused', async () => {
  const env = envWith(model({text: 'x', legible: true}));
  assert.equal((await worker.fetch(post({image: dataUrl(jpegBytes(2_400_000)), target: 'answer'}), env)).status, 413);
  assert.equal((await worker.fetch(post({image: dataUrl(), target: 'answer'}, {origin: 'http://evil.invalid'}), env)).status, 403);
  assert.equal((await worker.fetch(post({image: dataUrl(), target: 'answer'}), {})).status, 503);
});

test('unreadable photos and provider failures give safe messages and never leak the key', async () => {
  const blank = envWith(model({text: '', legible: false}));
  const r1 = await worker.fetch(post({image: dataUrl(), target: 'answer'}), blank);
  assert.equal(r1.status, 422);

  const broken = {OPENAI_API_KEY: 'secret-key-123', OPENAI_MODEL: 'm', MODEL_FETCH: async () => new Response('secret-key-123', {status: 401})};
  const r2 = await worker.fetch(post({image: dataUrl(), target: 'answer'}), broken);
  assert.equal(r2.status, 502);
  assert.ok(!(await r2.text()).includes('secret-key-123'));
});

test('transcribed text is trimmed to the same limits the controller enforces', async () => {
  const env = envWith(model({text: 'a'.repeat(1400), legible: true}));
  const r = await worker.fetch(post({image: dataUrl(), target: 'answer'}), env);
  const body = await r.json();
  assert.equal(body.text.length, 1000);
  assert.equal(body.truncated, true);
});

test('photo reading is rate limited per session', async () => {
  const env = envWith(model({text: 'x = 5', legible: true}));
  const cookie = 'cognix_session=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await worker.fetch(post({image: dataUrl(), target: 'answer'}, {cookie}), env)).status);
  assert.equal(statuses.filter(s => s === 200).length, 10);
  assert.deepEqual(statuses.slice(10), [429, 429]);
});
