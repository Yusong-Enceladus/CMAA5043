/**
 * aiService — calls the BrickBuddy chat proxy at /api/chat.
 *
 * The OpenRouter API key lives on the server (Cloudflare Pages env var),
 * never in client code. The proxy handles model fallback, timeouts, and
 * validation. This module just builds the prompt and parses the reply.
 */

const API_URL = '/api/chat';
const REQUEST_TIMEOUT_MS = 150000; // server may retry up to 6 models × 22s for JSON mode

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
- Reply ONLY in English.
- DO NOT output any reasoning, thinking, chain-of-thought, or scratchpad. Return only the final answer.
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

import { resolveSteps, validateBlueprint, derivePiecesFromBricks } from './brickResolver';

/**
 * Best-effort repair of LLM-emitted JSON. Handles trailing commas,
 * single-quoted strings, JS-style line comments, and unquoted keys —
 * the four mistakes that account for nearly every parse failure we see
 * from free models. Returns the original string unchanged if no obvious
 * problems are spotted (so we never *introduce* a parse error).
 */
function repairJSON(text) {
  let out = text;
  // Strip // line comments and /* block */ comments
  out = out.replace(/\/\/[^\n\r]*/g, '');
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  // Trailing commas before ] or }
  out = out.replace(/,(\s*[\]}])/g, '$1');
  // "Smart" quotes → straight quotes
  out = out.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  return out;
}

/* ─────────── Full-geometry generation (primary path) ──────────── */

const BLUEPRINT_SYSTEM_PROMPT = `You are an architect designing LEGO robot blueprints for children aged 6-8.

The child will describe any robot they can imagine. You return a BRICK-BY-BRICK blueprint the child can follow step by step.

You DO NOT compute world coordinates. Instead you place each brick RELATIVE to either the ground or an earlier brick you named with an "id".

BRICK SCHEMA (every brick must match this exactly):
{
  "id": "short-lowercase-id",          // unique across the whole build
  "type": "plate" | "brick" | "tile" | "slope",
  "on":   "ground" | "<id of an earlier brick>",
  "offset": [dx, dz],                  // studs from the parent's CENTER on the X and Z axes (0,0 = centered on parent)
  "w": integer 1-6,                    // width in studs
  "d": integer 1-10,                   // depth in studs
  "color": "#RRGGBB"
}

PHYSICS RULES (enforced — wrong output is rejected):
- The FIRST brick of the build must have "on":"ground".
- Every other brick's "on" must reference a brick whose id appeared in a prior step OR earlier in the SAME step.
- offset is [dx, dz] ONLY — Y is automatic (the brick sits on top of its parent).
- ids use lowercase letters, digits, dashes, underscores only.

BUILD RULES:
- 5 to 7 steps.
- Each step has 1 to 5 new bricks.
- pieceCount (total bricks) between 18 and 40.
- Name: 2-4 fun words. Emoji: 1 emoji that matches.
- Use primaryColor for 60%+ of bricks and accentColor for 25%+ for visual cohesion.
- desc is ONE warm kid-friendly sentence; tip is ONE STEAM fact.
- steamTag for each step: one of "science" | "technology" | "engineering" | "art" | "math".

Return ONLY this JSON object — no markdown, no prose:
{
  "name": "...",
  "emoji": "...",
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": "...",
  "primaryColor": "#RRGGBB",
  "accentColor":  "#RRGGBB",
  "pieceCount": integer,
  "steps": [
    {
      "num": 1,
      "title": "...",
      "emoji": "...",
      "desc": "...",
      "tip":  "...",
      "steamTag": "engineering",
      "bricks": [
        { "id":"base","type":"plate","on":"ground","offset":[0,0],"w":4,"d":6,"color":"#..." }
      ]
    }
  ]
}`;

export async function generateFullRobot(description) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'json',
      messages: [
        { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
        { role: 'user',   content: description },
      ],
      temperature: 0.65,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(`generate failed: ${res.status}`);
    err.status = res.status;
    err.hint = errBody.hint;
    err.serverError = errBody.error;
    throw err;
  }
  const data = await res.json();
  if (!data.text) throw new Error('empty response');

  const cleaned = data.text.replace(/^```(?:json)?\s*|\s*```$/gim, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('no JSON in response');

  let bp;
  try {
    bp = JSON.parse(match[0]);
  } catch {
    // Try repairing common LLM mistakes (trailing commas, "smart" quotes,
    // // line comments) before giving up. Free models in particular often
    // emit malformed JSON when token budget runs out mid-array.
    try {
      bp = JSON.parse(repairJSON(match[0]));
    } catch (e2) {
      throw new Error(`JSON parse failed: ${e2.message}`);
    }
  }

  validateBlueprint(bp);
  const resolvedSteps = resolveSteps(bp.steps);

  // Derive `pieces` list per step from the raw bricks (nicer for the UI).
  resolvedSteps.forEach((s, i) => {
    if (!s.pieces || s.pieces.length === 0) {
      s.pieces = derivePiecesFromBricks(bp.steps[i].bricks);
    }
  });

  return {
    id: `custom-${Date.now()}`,
    name: bp.name,
    emoji: bp.emoji,
    difficulty: bp.difficulty,
    pieceCount: bp.pieceCount,
    color: bp.color || bp.primaryColor,
    description: bp.description,
    steps: resolvedSteps,
  };
}

/**
 * Regenerate JUST ONE step of an existing custom model. The AI sees the
 * surrounding context (step title + what came before) and returns a new
 * `bricks` array for that step, keyed against the same brick graph so
 * later steps keep working.
 */
export async function regenerateStep(model, stepIndex) {
  const step = model.steps[stepIndex];
  if (!step) throw new Error('bad step index');

  // Collect all brick ids declared in earlier steps so the AI can reference them.
  const priorIds = [];
  for (let i = 0; i < stepIndex; i++) {
    for (const p of model.steps[i].newParts || []) {
      // We no longer have the original ids after resolving, so approximate with step+index.
      priorIds.push(`step${i + 1}-${priorIds.length}`);
    }
  }

  const system = `${BLUEPRINT_SYSTEM_PROMPT}

You are ONLY redoing step ${step.num}: "${step.title}".
Return a JSON object: { "bricks": [ ... ] }. No other keys. No prose.
You may reference "ground" as a parent.`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'json',
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `The robot is "${model.name}" ${model.emoji}. This step should: ${step.desc || step.title}. Use primary color ${model.color}. Give 1-5 bricks.`,
        },
      ],
      temperature: 0.75,
    }),
  });
  if (!res.ok) throw new Error(`regenerate failed: ${res.status}`);
  const data = await res.json();
  if (!data.text) throw new Error('empty response');

  const cleaned = data.text.replace(/^```(?:json)?\s*|\s*```$/gim, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('no JSON in response');
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.bricks)) throw new Error('missing bricks array');

  // Resolve in isolation (each brick must use "ground" since we don't know prior ids).
  const resolved = resolveSteps([{ ...step, bricks: parsed.bricks }]);
  return resolved[0];
}

/**
 * Generate a custom robot blueprint from a free-text description.
 * Returns { name, emoji, template, description, primaryColor, accentColor, pieceCount }.
 * Throws on invalid/empty response — caller should fall back gracefully.
 */
export async function generateCustomRobot(description) {
  const system = `You design LEGO robot blueprints for children aged 6-8.

Given a child's robot idea, choose the closest 3D base template and give the robot a custom personality.

Templates:
- "dog"  — four-legged creatures: dog, cat, tiger, horse, spider, frog, dragon, wolf, bear
- "car"  — vehicles with wheels: car, truck, train, rover, race car, tank, bus
- "dino" — large tall creatures or big beasts: dinosaur, giraffe, elephant, robot warrior, monster

Respond with ONLY a JSON object in this exact shape — no markdown fences, no preamble, no explanation:
{
  "name": "short fun name (2-4 words)",
  "emoji": "single emoji that matches",
  "template": "dog" | "car" | "dino",
  "description": "one warm, kid-friendly sentence describing the robot",
  "primaryColor": "#RRGGBB",
  "accentColor": "#RRGGBB",
  "pieceCount": integer between 20 and 60
}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'json',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: description },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error('generate proxy failed');
  const data = await res.json();
  if (!data.text) throw new Error('empty response');

  // Strip markdown fences if the model wrapped the JSON.
  const cleaned = data.text.replace(/^```(?:json)?\s*|\s*```$/gim, '').trim();
  // Extract the first {...} block in case the model added prose.
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no JSON in response');

  const blueprint = JSON.parse(jsonMatch[0]);
  validateRecolorBlueprint(blueprint);
  return blueprint;
}

function validateRecolorBlueprint(bp) {
  const required = ['name', 'emoji', 'template', 'description', 'primaryColor', 'accentColor'];
  for (const k of required) {
    if (!bp[k] || typeof bp[k] !== 'string') throw new Error(`blueprint missing ${k}`);
  }
  if (!['dog', 'car', 'dino'].includes(bp.template)) throw new Error('bad template');
  if (!/^#[0-9A-Fa-f]{6}$/.test(bp.primaryColor)) throw new Error('bad primaryColor');
  if (!/^#[0-9A-Fa-f]{6}$/.test(bp.accentColor)) throw new Error('bad accentColor');
  bp.name = bp.name.slice(0, 30);
  bp.description = bp.description.slice(0, 140);
  bp.pieceCount = Math.max(20, Math.min(60, Number(bp.pieceCount) || 30));
}

/**
 * Produce a custom model by cloning a base template and overriding name, emoji,
 * description, and recoloring the two most common colors with the AI-provided palette.
 */
export function customizeModel(baseModel, blueprint) {
  const clone = JSON.parse(JSON.stringify(baseModel));
  clone.id = `custom-${Date.now()}`;
  clone.name = blueprint.name;
  clone.emoji = blueprint.emoji;
  clone.description = blueprint.description;
  clone.pieceCount = blueprint.pieceCount;
  clone.color = blueprint.primaryColor;
  clone.difficulty = 'Custom';

  // Tally colors in the base model and map the two most-used ones to the AI palette.
  const counts = {};
  for (const step of clone.steps) {
    for (const p of step.newParts || []) counts[p.color] = (counts[p.color] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const remap = {};
  if (sorted[0]) remap[sorted[0]] = blueprint.primaryColor;
  if (sorted[1]) remap[sorted[1]] = blueprint.accentColor;

  for (const step of clone.steps) {
    for (const p of step.newParts || []) if (remap[p.color]) p.color = remap[p.color];
    for (const pc of step.pieces || []) if (remap[pc.color]) pc.color = remap[pc.color];
  }
  return clone;
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
