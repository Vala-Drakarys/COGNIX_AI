// OpenRouter provider for the diagnostic text model.
// Image transcription stays on the existing OpenAI provider.

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const REQUEST_TIMEOUT_MS = 12000;
export const MAX_OUTPUT_TOKENS = 1200;

export function isConfigured(env) {
  return Boolean(env.OPENROUTER_API_KEY && env.SLICE_MODEL);
}

function extractText(body) {
  return body?.choices?.[0]?.message?.content || '';
}

export async function requestStructured(env, {
  instructions,
  payload,
  input,
  schema,
  schemaName = 'diagnostic_result',
  maxOutputTokens = MAX_OUTPUT_TOKENS,
  timeoutMs = REQUEST_TIMEOUT_MS
}) {
  if (!isConfigured(env)) throw new Error('Provider not configured');

  const doFetch = env.MODEL_FETCH || fetch;
  const userContent = input ?? JSON.stringify(payload);

  const response = await doFetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-Title': env.OPENROUTER_APP_NAME || 'COGNIX'
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: env.SLICE_MODEL,
      messages: [
        {role: 'system', content: instructions},
        {role: 'user', content: userContent}
      ],
      max_tokens: maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) throw new Error('Provider unavailable');

  const body = await response.json();
  if (body?.error) throw new Error('Provider unavailable');

  return JSON.parse(extractText(body) || '');
}
