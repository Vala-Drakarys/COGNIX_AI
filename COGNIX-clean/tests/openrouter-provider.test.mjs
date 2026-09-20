import test from 'node:test';
import assert from 'node:assert/strict';
import {isConfigured, requestStructured, OPENROUTER_ENDPOINT} from '../backend/llm/providers/openrouter.mjs';

const ok = obj => new Response(JSON.stringify({
  choices: [{message: {content: JSON.stringify(obj)}}]
}));
const args = {
  instructions: 'x',
  payload: {a: 1},
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {done: {type: 'boolean'}},
    required: ['done']
  }
};

test('OpenRouter provider requires an API key and one model', () => {
  assert.equal(isConfigured({}), false);
  assert.equal(isConfigured({OPENROUTER_API_KEY: 'k'}), false);
  assert.equal(isConfigured({OPENROUTER_API_KEY: 'k', SLICE_MODEL: 'anthropic/claude-haiku-4.5'}), true);
});

test('OpenRouter provider sends Claude as a structured JSON request', async () => {
  let seen;
  const env = {
    OPENROUTER_API_KEY: 'test-key',
    SLICE_MODEL: 'anthropic/claude-haiku-4.5',
    MODEL_FETCH: async (url, init) => {
      seen = {url, init};
      return ok({done: true});
    }
  };

  const value = await requestStructured(env, args);
  assert.deepEqual(value, {done: true});
  assert.equal(seen.url, OPENROUTER_ENDPOINT);
  assert.equal(seen.init.headers.Authorization, 'Bearer test-key');

  const body = JSON.parse(seen.init.body);
  assert.equal(body.model, 'anthropic/claude-haiku-4.5');
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.max_tokens, 1200);
});

test('OpenRouter provider does not expose the API key in errors', async () => {
  const env = {
    OPENROUTER_API_KEY: 'secret-key',
    SLICE_MODEL: 'anthropic/claude-haiku-4.5',
    MODEL_FETCH: async () => new Response('secret-key leaked', {status: 401})
  };

  await assert.rejects(
    () => requestStructured(env, args),
    error => !error.message.includes('secret-key')
  );
});
