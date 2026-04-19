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
 * Chat chain — ordered for KID-FACING quality, not raw intelligence.
 *
 * Free-tier only. The OpenRouter $10 credit is used here as a quota multiplier
 * (uncredited accounts: 50 req/day across all `:free` models; credited
 * accounts: 1000 req/day) — NOT as a paid-inference budget. The `:free`
 * suffix on every entry pins the call to the free pool so the credit is
 * never billed against. Order is by intelligence/tone-fit, NOT by raw
 * benchmark score, since 6-8yo chat penalises models that leak reasoning
 * or write at adult reading level.
 *
 * Nemotron 3 Super is intentionally omitted — it leaks plain-text reasoning
 * ("Okay, the user is asking...") which is unusable for 6-8yo chat.
 */
const DEFAULT_MODELS = [
  'google/gemma-4-31b-it:free',               // warm, family-safe, reliable tone
  'meta-llama/llama-3.3-70b-instruct:free',   // predictable, no CoT leakage
  'openai/gpt-oss-120b:free',                 // strong refusals for kid safety
  'qwen/qwen3-next-80b-a3b-instruct:free',    // instruct-tuned variant (non-thinking)
  'google/gemma-3-27b-it:free',               // gentle fallback
  'z-ai/glm-4.5-air:free',                    // last-resort anchor — weaker quality but
                                              //   stays up when the frontier free models
                                              //   are globally 429/503; better than a
                                              //   "server unavailable" error for kids.
];

// JSON-generation chain. Deliberately short (2 models) because each attempt
// gets 50s and the whole request must fit under CF's ~100s inbound ceiling.
// gpt-oss-120b:free is first because it's the one free model I've verified
// can emit a full blueprint in ~20s — llama-3.3-70b is the safety net.
// Longer chains just burn the wall-clock in timeouts and return 524 to the
// client, which is worse than two good shots and an honest 503.
const JSON_MODELS = [
  'openai/gpt-oss-120b:free',                 // verified fast on real blueprints
  'meta-llama/llama-3.3-70b-instruct:free',   // predictable JSON discipline
];

const MAX_MESSAGES = 12;
const MAX_TOTAL_CHARS = 8000;
const MAX_TOKENS_CHAT = 220;
// A full blueprint is ~1200-1800 tokens (5-7 steps × 3-5 bricks with full
// text fields). Keep the cap low enough that a model can't endlessly
// ramble, but generous enough that real blueprints aren't truncated.
const MAX_TOKENS_JSON = 1800;
const PER_ATTEMPT_TIMEOUT_MS_CHAT = 10000; // short — falls through fast if throttled
// Free models generate ~25-40 tokens/sec. 1800 tokens = ~45-70s worst case.
// 30s was too aggressive — complex prompts like "fish with wings" kept
// aborting mid-generation, burning through the whole chain in 90s and
// returning "all models unavailable" to the client. 50s gives the first
// model enough time and two attempts fit under Cloudflare's ~100s inbound
// wall-clock ceiling before the edge returns a 524.
const PER_ATTEMPT_TIMEOUT_MS_JSON = 50000;
// 402 = OpenRouter "insufficient credit" → skip to the next model in the
// chain (usually a `:free` one) instead of failing the whole request.
const RETRIABLE = new Set([402, 404, 408, 425, 429, 500, 502, 503, 504]);

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

async function callModel(modelId, messages, apiKey, temperature, siteUrl, maxTokens, timeoutMs, jsonMode = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      // Ask OpenRouter to hide reasoning tokens from reasoning-capable
      // models. Only takes effect when a model exposes reasoning as a
      // separate field — models that inline CoT in `content` need the
      // `stripThinking` pass below.
      reasoning: { exclude: true },
    };
    if (jsonMode) {
      // OpenAI-compatible structured-output hint. Supported by most paid
      // models (Claude, GPT-4o, Gemini) and silently ignored by older free
      // models. Still ask for plain JSON in the system prompt so all models
      // — supported or not — get the message.
      payload.response_format = { type: 'json_object' };
    }
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl,
        'X-Title': 'BrickBuddy',
      },
      body: JSON.stringify(payload),
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
    if (!content) {
      // Some models occasionally return empty content (content filter,
      // reasoning-only output, etc.). Treat as retriable so the chain
      // falls through to the next model rather than aborting.
      const err = new Error('empty response');
      err.retriable = true;
      err.status = 204;
      throw err;
    }
    return stripThinking(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip chain-of-thought / scratchpad markers leaked by reasoning models
 * (Nemotron 3 Super, Qwen-thinking, DeepSeek-R1 style). Handles both
 * tag-wrapped reasoning and untagged plain-text preambles.
 */
function stripThinking(text) {
  let out = text;

  // 1. Tag-wrapped: <think>...</think>, <reasoning>...</reasoning>, etc.
  out = out.replace(/<\s*(think|reasoning|analysis|scratchpad|thought)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, '');
  out = out.replace(/<\|reasoning\|>[\s\S]*?<\|\/reasoning\|>/gi, '');

  // 2. Untagged preambles: "Thinking: ... ", "Reasoning: ..."
  out = out.replace(/^(?:Thinking|Reasoning|Analysis|Scratchpad|Thought)\s*:[\s\S]*?\n(?=[A-Z])/im, '');

  // 3. Conversational reasoning openers — Nemotron 3 Super frequently starts
  //    responses with "Okay, the user is asking about X." or "Hmm, a 7-year-old..."
  //    and spends a paragraph reasoning before the real answer. Strip up to the
  //    last paragraph if the response starts with one of these patterns.
  const REASONING_OPENERS = [
    /^Okay,\s+the user/i,
    /^Hmm,\s+/i,
    /^Let me think/i,
    /^Let's think/i,
    /^We need to\b/i,
    /^First,\s+let me/i,
    /^I need to/i,
    /^Alright,\s+so the/i,
    /^The user is asking/i,
  ];
  const looksLikeReasoning = REASONING_OPENERS.some((re) => re.test(out));
  if (looksLikeReasoning) {
    // If there's a blank line (paragraph break), keep only what comes after the LAST
    // reasoning paragraph. Reasoning is typically one or two paragraphs.
    const paragraphs = out.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      // Keep the last paragraph as the "final answer".
      out = paragraphs[paragraphs.length - 1];
    }
  }

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
  const perAttemptMs = jsonMode ? PER_ATTEMPT_TIMEOUT_MS_JSON : PER_ATTEMPT_TIMEOUT_MS_CHAT;

  const siteUrl = new URL(request.url).origin;

  let lastErr;
  for (const modelId of models) {
    try {
      const content = await callModel(modelId, body.messages, env.OPENROUTER_API_KEY, temperature, siteUrl, maxTokens, perAttemptMs, jsonMode);
      return json({ text: content, model: modelId });
    } catch (err) {
      lastErr = err;
      if (!err.retriable && err.name !== 'AbortError') {
        return json({ error: 'upstream error', detail: err.body || err.message }, { status: 502 });
      }
    }
  }

  // Detect the OpenRouter account-level daily free-tier quota ("free-models-per-day")
  // vs. transient upstream throttling, and return a clearer message either way.
  const detail = lastErr?.body || lastErr?.message || '';
  const isDailyQuota = /free[-_]models[-_]per[-_]day/i.test(detail);
  return json(
    {
      error: isDailyQuota ? 'daily free quota exhausted' : 'all models unavailable',
      detail,
      hint: isDailyQuota
        ? 'OpenRouter caps uncredited accounts at 50 free requests/day across all models. It resets at 00:00 UTC, or you can add $10 of credit to lift the cap to 1000/day.'
        : 'The free-tier models are all temporarily throttled. Please try again in a minute.',
    },
    { status: 503 },
  );
}

// Block non-POST methods at the function level
export const onRequest = () =>
  new Response('method not allowed', { status: 405, headers: { Allow: 'POST' } });
