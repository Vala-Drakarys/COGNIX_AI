import test from 'node:test';
import assert from 'node:assert/strict';
import {isConfigured, requestStructured, OPENAI_ENDPOINT} from '../backend/llm/providers/openai.mjs';

const ok = obj => new Response(JSON.stringify({output: [{content: [{type: 'output_text', text: JSON.stringify(obj)}]}]}));
const args = {instructions: 'x', payload: {a: 1}, schema: {type: 'object'}};

test('provider reports configuration only when key and model are both set', () => {
  assert.equal(isConfigured({}), false);
  assert.equal(isConfigured({OPENAI_API_KEY: 'k'}), false);
  assert.equal(isConfigured({OPENAI_API_KEY: 'k', OPENAI_MODEL: 'm'}), true);
});

test('provider sends a strict json_schema request with bearer auth and store disabled', async () => {
  let seen;
  const env = {OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model', MODEL_FETCH: async (url, init) => { seen = {url, init}; return ok({done: true}); }};
  const value = await requestStructured(env, args);
  assert.deepEqual(value, {done: true});
  assert.equal(seen.url, OPENAI_ENDPOINT);
  assert.equal(seen.init.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.model, 'test-model');
  assert.equal(body.store, false);
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
});

test('provider throws generic errors that never contain the API key', async () => {
  const env = {OPENAI_API_KEY: 'secret-key', OPENAI_MODEL: 'm', MODEL_FETCH: async () => new Response('secret-key leaked', {status: 401})};
  await assert.rejects(() => requestStructured(env, args), e => !e.message.includes('secret-key'));
  await assert.rejects(() => requestStructured({}, args), /not configured/);
  const incomplete = {OPENAI_API_KEY: 'k', OPENAI_MODEL: 'm', MODEL_FETCH: async () => new Response(JSON.stringify({status: 'incomplete'}))};
  await assert.rejects(() => requestStructured(incomplete, args), /Incomplete/);
});
