/**
 * Cloudflare Pages Function — /api/chat
 *
 * Proxies chat requests to OpenRouter. The API key lives in the Cloudflare
 * environment (env.OPENROUTER_API_KEY) and is never exposed to the browser.
 *
 * Server-side responsibilities:
 *   - Validate payload shape and size
 *   - Try a primary model, then a fallback chain on 429/502/503
 *   - Enforce a hard timeout per upstream attempt
 *   - Never forward OpenRouter auth headers to the client
 */

const DEFAULT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'google/gemma-3-27b-it:free',
];

const MAX_MESSAGES = 12;
const MAX_TOTAL_CHARS = 8000;
const MAX_TOKENS = 220;
const PER_ATTEMPT_TIMEOUT_MS = 10000;
const RETRIABLE = new Set([429, 500, 502, 503, 504]);

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });

function validate(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  if (!Array.isArray(body.messages)) return 'messages must be an array';
  if (body.messages.length === 0) return 'messages cannot be empty';
  if (body.messages.length > MAX_MESSAGES) return `too many messages (max ${MAX_MESSAGES})`;
  let total = 0;
  for (const m of body.messages) {
    if (!m || typeof m.content !== 'string' || typeof m.role !== 'string') return 'bad message shape';
    if (!['system', 'user', 'assistant'].includes(m.role)) return 'bad role';
    total += m.content.length;
  }
  if (total > MAX_TOTAL_CHARS) return `prompt too long (${total} chars, max ${MAX_TOTAL_CHARS})`;
  return null;
}

async function callModel(modelId, messages, apiKey, temperature, siteUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl,
        'X-Title': 'BrickBuddy',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`upstream ${res.status}`);
      err.status = res.status;
      err.retriable = RETRIABLE.has(res.status);
      err.body = text.slice(0, 200);
      throw err;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('empty response');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env?.OPENROUTER_API_KEY) {
    return json({ error: 'server not configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }

  const problem = validate(body);
  if (problem) return json({ error: problem }, { status: 400 });

  const temperature = typeof body.temperature === 'number'
    ? Math.max(0, Math.min(1.5, body.temperature))
    : 0.8;

  const models = Array.isArray(body.models) && body.models.length
    ? body.models.slice(0, 4)
    : DEFAULT_MODELS;

  const siteUrl = new URL(request.url).origin;

  let lastErr;
  for (const modelId of models) {
    try {
      const content = await callModel(modelId, body.messages, env.OPENROUTER_API_KEY, temperature, siteUrl);
      return json({ text: content, model: modelId });
    } catch (err) {
      lastErr = err;
      if (!err.retriable && err.name !== 'AbortError') {
        return json({ error: 'upstream error', detail: err.body || err.message }, { status: 502 });
      }
    }
  }
  return json(
    { error: 'all models unavailable', detail: lastErr?.body || lastErr?.message || '' },
    { status: 503 },
  );
}

// Block non-POST methods at the function level
export const onRequest = () =>
  new Response('method not allowed', { status: 405, headers: { Allow: 'POST' } });
