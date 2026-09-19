// Provider selection is explicit: never guess a destination from a secret key.
export function modelConfig(env = {}) {
  const provider = env.LLM_PROVIDER || 'openai';
  if (!['openai', 'openrouter'].includes(provider)) throw new Error('Set LLM_PROVIDER to openrouter or openai.');
  const router = provider === 'openrouter';
  return {
    provider,
    key: router ? env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || '' : env.OPENAI_API_KEY || '',
    model: router ? env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini' : env.OPENAI_MODEL || 'gpt-4.1-mini',
    url: router ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/responses'
  };
}
export function modelEnvironment(source = process.env) {
  return Object.fromEntries(['LLM_PROVIDER','OPENROUTER_API_KEY','OPENROUTER_MODEL','OPENAI_API_KEY','OPENAI_MODEL'].map(key => [key, source[key] || '']));
}
