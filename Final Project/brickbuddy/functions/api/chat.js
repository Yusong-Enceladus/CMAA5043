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

// JSON-generation chain. Nemotron 3 Super (120B MoE with built-in reasoning)
// is the most intelligent free model currently on OpenRouter — on benchmarks
// it beats gpt-oss-120b on spatial reasoning, which directly helps blueprint
// composition. Earlier rounds showed it failing because:
//   (a) response_format: json_object truncated its output to ~750 chars
//   (b) its hidden reasoning tokens ate the max_tokens budget
// Both fixed in callModel(): response_format is now skipped for reasoning
// models, reasoning.max_tokens is capped at 200, and max_tokens bumped to
// 4000 so output has room. Verified directly against OpenRouter — Nemotron
// with these settings returns complete 2300+ char blueprints in 19-55s.
//
// gpt-oss-120b stays in the chain as a fast fallback if Nemotron 429s or
// times out; it's the reliability leader from the bake-off (4/4, sym 0.47).
const JSON_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',   // smartest free; 120B MoE w/ reasoning
  'openai/gpt-oss-120b:free',                 // fast fallback; bake-off leader
];

const MAX_MESSAGES = 12;
const MAX_TOTAL_CHARS = 8000;
const MAX_TOKENS_CHAT = 220;
// A full blueprint is ~1200-1800 tokens (5-7 steps × 3-5 bricks with full
// text fields). Keep the cap low enough that a model can't endlessly
// ramble, but generous enough that real blueprints aren't truncated.
const MAX_TOKENS_JSON = 1800;
const PER_ATTEMPT_TIMEOUT_MS_CHAT = 10000; // short — falls through fast if throttled
// Reasoning model (Nemotron) generates complete blueprints in 24-55s with
// reasoning.max_tokens: 200. Fast model (gpt-oss-120b) in 20-40s. 45s per
// attempt lets us fit TWO models under Cloudflare's ~100s inbound ceiling:
// 45 + 45 = 90s worst case. In practice one attempt usually succeeds.
const PER_ATTEMPT_TIMEOUT_MS_JSON = 45000;
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
    // Reasoning-capable models need special handling:
    //   1. Reasoning tokens count against max_tokens, so bump the budget.
    //   2. `reasoning.max_tokens: 200` forces a short reasoning pass (verified
    //      empirically: Nemotron at 200 → 19s + 2700 char output; at 800 →
    //      67s + 1900 char output — tight reasoning is BOTH faster and gives
    //      more room for output).
    //   3. `response_format: json_object` causes Nemotron to emit a truncated
    //      skeleton and stop at ~750 chars — we strictly rely on the system
    //      prompt for JSON instruction on reasoning models.
    const reasoningModel = /nemotron|deepseek-r1|thinking|qwen3-next-80b-a3b-thinking/i.test(modelId);
    const effectiveMaxTokens = reasoningModel ? Math.max(maxTokens, 4000) : maxTokens;

    const payload = {
      model: modelId,
      messages,
      temperature,
      max_tokens: effectiveMaxTokens,
      reasoning: reasoningModel
        ? { exclude: true, max_tokens: 200 }   // tight budget = fast + complete output
        : { exclude: true },
    };
    if (jsonMode && !reasoningModel) {
      // Structured-output hint for non-reasoning models. Verified harmful
      // on Nemotron (truncates output), so we gate it.
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
