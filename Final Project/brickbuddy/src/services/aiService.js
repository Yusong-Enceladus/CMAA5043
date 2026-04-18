/**
 * aiService — calls the BrickBuddy chat proxy at /api/chat.
 *
 * The OpenRouter API key lives on the server (Cloudflare Pages env var),
 * never in client code. The proxy handles model fallback, timeouts, and
 * validation. This module just builds the prompt and parses the reply.
 */

const API_URL = '/api/chat';
const REQUEST_TIMEOUT_MS = 45000; // server already per-model-caps at 10s × up to 4 models

// Kept for UI badge; now always true since the proxy is part of the deployment.
// In local Vite dev without wrangler, the fetch will 404 → we fall back to rules.
export const hasAIKey = () => true;

const STEAM_TAGS = ['science', 'technology', 'engineering', 'art', 'math'];

function buildSystemPrompt(model, step, stepIndex) {
  const pieces = step?.pieces?.map((p) => p.name).join(', ') || '';
  const totalSteps = model?.steps?.length ?? 0;
  return `You are BrickBuddy, a cheerful AI assistant helping a 6-8 year old child build a LEGO robot.
The child is building: ${model?.name || 'a LEGO robot'} ${model?.emoji || ''} (${totalSteps} steps total).
Currently on step ${step?.num || 1}/${totalSteps}: "${step?.title || ''}"
Pieces for this step: ${pieces}
Tip for this step: ${step?.tip || 'encourage the child'}

RULES — follow strictly:
- Keep replies short: 1 to 3 sentences, under 60 words.
- Use simple words a 6-year-old understands.
- Be warm, encouraging, curious. Never scold.
- Always stay on topic (LEGO build, robots, or STEAM science).
- Use 1 emoji max per reply.
- End with a STEAM tag on its own line in the form: [STEAM:science] or [STEAM:technology] or [STEAM:engineering] or [STEAM:art] or [STEAM:math]. Pick whichever best matches your reply. If none fit, omit the tag.
- Never give or ask for personal info. Never mention violence, scary topics, or anything unsafe.`;
}

function parseSteamTag(text) {
  const m = text.match(/\[STEAM:(science|technology|engineering|art|math)\]/i);
  if (!m) return { clean: text.trim(), tag: null };
  const tag = m[1].toLowerCase();
  const clean = text.replace(m[0], '').trim();
  return { clean, tag: STEAM_TAGS.includes(tag) ? tag : null };
}

export async function getAIResponseOnline(userText, model, stepIndex, history = []) {
  const step = model?.steps?.[stepIndex];
  const system = buildSystemPrompt(model, step, stepIndex);

  const messages = [
    { role: 'system', content: system },
    ...history.slice(-6).map((m) => ({
      role: m.role === 'child' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: 0.8 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`proxy ${res.status}: ${err.error || 'unknown'}`);
    }
    const data = await res.json();
    if (!data?.text) throw new Error('empty reply');
    const { clean, tag } = parseSteamTag(data.text);
    return { text: clean, tag, source: 'ai', modelUsed: data.model };
  } finally {
    clearTimeout(timer);
  }
}
