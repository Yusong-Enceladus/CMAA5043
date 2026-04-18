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

/**
 * Fallback chain — strictly ordered by intelligence among the OpenRouter
 * free tier (verified April 2026). Order is tried top-down; first model
 * that doesn't return 429/5xx wins. GLM-4.5-Air and Nemotron-Nano-9B
 * deliberately removed; they benchmark well below the current crop.
 */
const DEFAULT_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',   // Q1 2026 top open reasoning
  'google/gemma-4-31b-it:free',               // Q1 2026 dense 31B — warm, family-safe default
  'qwen/qwen3-next-80b-a3b-instruct:free',    // Arena ~1422 ELO tier, instruct-tuned (not thinking)
  'openai/gpt-oss-120b:free',                 // frontier-ish MoE, strong refusals for kid safety
  'meta-llama/llama-3.3-70b-instruct:free',   // stability anchor — huge ecosystem
  'google/gemma-3-27b-it:free',               // safest last resort — gentle alignment for kids
];

// JSON-generation chain — Nemotron 3 Super leaks plain-text reasoning even
// without <think> tags, so it's demoted. Llama 3.3 and Gemma 4 follow the
// "respond only with JSON" instruction reliably.
const JSON_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-3-27b-it:free',
  // Last-resort fallbacks: these models leak reasoning, but the client-side
  // `{...}` regex still finds the JSON as long as one appears anywhere in
  // the response. Better than returning "all models unavailable" during
  // free-tier outages.
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

const MAX_MESSAGES = 12;
const MAX_TOTAL_CHARS = 8000;
const MAX_TOKENS_CHAT = 220;
const MAX_TOKENS_JSON = 450;       // extra budget for larger structured output
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

async function callModel(modelId, messages, apiKey, temperature, siteUrl, maxTokens) {
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
        max_tokens: maxTokens,
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
    return stripThinking(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip common chain-of-thought / scratchpad markers leaked by some models
 * (Nemotron-thinking, Qwen-thinking, DeepSeek-R1 style).
 */
function stripThinking(text) {
  let out = text;
  // <think>...</think>, <reasoning>...</reasoning>, <|thinking|>...<|/thinking|>
  out = out.replace(/<\s*(think|reasoning|analysis|scratchpad|thought)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, '');
  out = out.replace(/<\|reasoning\|>[\s\S]*?<\|\/reasoning\|>/gi, '');
  // Sometimes models dump "Thinking:" or "Reasoning:" sections before the answer.
  out = out.replace(/^(?:Thinking|Reasoning|Analysis|Scratchpad|Thought)\s*:[\s\S]*?\n(?=[A-Z])/im, '');
  return out.trim();
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

  // mode="json" switches to the JSON-reliable chain and bumps max_tokens.
  const jsonMode = body.mode === 'json';
  const defaultChain = jsonMode ? JSON_MODELS : DEFAULT_MODELS;
  const models = Array.isArray(body.models) && body.models.length
    ? body.models.slice(0, 6)
    : defaultChain;
  const maxTokens = jsonMode ? MAX_TOKENS_JSON : MAX_TOKENS_CHAT;

  const siteUrl = new URL(request.url).origin;

  let lastErr;
  for (const modelId of models) {
    try {
      const content = await callModel(modelId, body.messages, env.OPENROUTER_API_KEY, temperature, siteUrl, maxTokens);
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
