// Quick check for the diagnostic model and the existing photo-reading path.
//   npm run check:ai                      -> tests the text model
//   npm run check:ai -- path/to/photo.jpg -> also tests photo reading (JPG/JPEG)
import fs from 'node:fs';
import {isConfigured, requestStructured} from '../backend/llm/providers/openrouter.mjs';
import {readImageText, isConfigured as isOpenAIConfigured} from '../backend/llm/providers/openai.mjs';

const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  SLICE_MODEL: process.env.SLICE_MODEL || 'anthropic/claude-haiku-4.5',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || '',
  MODEL_FETCH: async (url, init) => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.clone().json().catch(() => ({}));
      console.error(`  HTTP ${res.status}: ${body.error?.message || 'no details'}`);
    }
    return res;
  }
};

if (!isConfigured(env)) {
  console.error('FAIL: OPENROUTER_API_KEY is empty. Put it in .env (same folder as package.json) and run again.');
  process.exit(1);
}

try {
  const out = await requestStructured(env, {
    instructions: 'Reply with the single word ok.',
    payload: {ping: true},
    schema: {type: 'object', additionalProperties: false, properties: {reply: {type: 'string'}}, required: ['reply']},
    maxOutputTokens: 50
  });
  console.log(`OK   diagnostic model "${env.SLICE_MODEL}" answered:`, JSON.stringify(out));
} catch {
  console.error('FAIL text request. Check the OpenRouter key, SLICE_MODEL and your OpenRouter credit/limits.');
  process.exit(1);
}

const file = process.argv[2];
if (file && !isOpenAIConfigured(env)) {
  console.error('FAIL photo reading: set OPENAI_API_KEY and OPENAI_MODEL to keep the existing image-input path enabled.');
  process.exit(1);
}
if (file) {
  try {
    const bytes = fs.readFileSync(file);
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw new Error('not a JPG');
    const out = await readImageText(env, {dataUrl: `data:image/jpeg;base64,${bytes.toString('base64')}`, target: 'question'});
    console.log(`OK   photo read (legible: ${out.legible}). Text found:\n---\n${out.text}\n---`);
  } catch (error) {
    console.error('FAIL photo reading:', error.message === 'not a JPG' ? 'that file is not a JPG/JPEG.' : 'the request did not succeed (see the HTTP line above, if any). The model must accept images.');
    process.exit(1);
  }
}
