/**
 * localRobotGen — Offline fallback for AI robot generation.
 *
 * Runs entirely in the browser. Parses the child's description for template
 * hints + color names and produces a custom robot by recoloring the closest
 * hand-authored preset. Used when /api/chat is throttled or unreachable so
 * "Talk to Me" and "Show Me" always produce a build, even with no AI.
 */
import { robotModels } from '../data/models';
import { customizeModel } from './aiService';

const TEMPLATE_KEYWORDS = {
  dog: [
    'dog', 'puppy', 'pup', 'cat', 'kitty', 'kitten', 'tiger', 'lion', 'wolf',
    'fox', 'bear', 'panda', 'horse', 'pony', 'unicorn', 'spider', 'frog',
    'bunny', 'rabbit', 'pet', 'animal', 'paw', 'fur', 'tail',
  ],
  car: [
    'car', 'truck', 'train', 'bus', 'vehicle', 'racer', 'rover', 'tank',
    'wheel', 'wheels', 'drive', 'driving', 'engine', 'motor', 'speed', 'race',
    'racing', 'road', 'lorry', 'van',
  ],
  dino: [
    'dino', 'dinosaur', 'trex', 't-rex', 'rex', 'raptor', 'jurassic', 'dragon',
    'monster', 'beast', 'giant', 'huge', 'fierce', 'godzilla', 'lizard',
    'stegosaurus', 'triceratops', 'velociraptor',
  ],
};

const COLOR_KEYWORDS = {
  red:     '#EF4444',
  crimson: '#DC2626',
  orange:  '#F59E0B',
  amber:   '#F59E0B',
  yellow:  '#FCD34D',
  gold:    '#FCD34D',
  lime:    '#84CC16',
  green:   '#10B981',
  teal:    '#14B8A6',
  cyan:    '#22D3EE',
  sky:     '#38BDF8',
  blue:    '#3B82F6',
  navy:    '#1E3A8A',
  indigo:  '#6366F1',
  purple:  '#8B5CF6',
  violet:  '#8B5CF6',
  magenta: '#EC4899',
  pink:    '#F472B6',
  rose:    '#F43F5E',
  brown:   '#92400E',
  tan:     '#D6A777',
  white:   '#F3F4F6',
  silver:  '#9CA3AF',
  gray:    '#6B7280',
  grey:    '#6B7280',
  black:   '#1F2937',
  rainbow: '#F472B6',
};

function pickTemplate(text, photoHint) {
  if (photoHint?.modelId) return photoHint.modelId;
  const lower = text.toLowerCase();
  const scores = { dog: 0, car: 0, dino: 0 };
  for (const [id, words] of Object.entries(TEMPLATE_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) scores[id]++;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return best[0][1] > 0 ? best[0][0] : 'dog';
}

function pickColors(text, templateId) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [name, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(name) && !found.includes(hex)) found.push(hex);
  }
  // Fall back to a tasteful per-template default.
  const defaults = {
    dog:  ['#F59E0B', '#EF4444'],
    car:  ['#3B82F6', '#EF4444'],
    dino: ['#10B981', '#F59E0B'],
  }[templateId];
  return {
    primary: found[0] || defaults[0],
    accent:  found[1] || defaults[1],
  };
}

// Pick the first noun-like word (>= 3 chars, not a stop-word) to use as a name seed.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'with', 'for', 'to', 'of', 'in', 'on',
  'is', 'are', 'am', 'i', 'my', 'me', 'we', 'you', 'want', 'like', 'build',
  'make', 'that', 'this', 'very', 'really', 'super', 'so', 'some',
]);

function makeName(text, templateId) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, 2);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const suffix = { dog: 'Pup', car: 'Racer', dino: 'Rex' }[templateId];
  if (words.length >= 2) return `${cap(words[0])} ${cap(words[1])}`;
  if (words.length === 1) return `${cap(words[0])} ${suffix}`;
  return { dog: 'Mystery Pup', car: 'Mystery Racer', dino: 'Mystery Rex' }[templateId];
}

function pickEmoji(templateId, text) {
  const lower = text.toLowerCase();
  // Prefer a more specific emoji when the description mentions one.
  const specific = {
    dog: { cat: '🐱', tiger: '🐯', lion: '🦁', wolf: '🐺', fox: '🦊', bear: '🐻', panda: '🐼', horse: '🐴', unicorn: '🦄', frog: '🐸', spider: '🕷️', bunny: '🐰', rabbit: '🐰' },
    car: { truck: '🚛', train: '🚂', bus: '🚌', tank: '🛡️', rover: '🚙', race: '🏎️' },
    dino: { dragon: '🐉', monster: '👹', lizard: '🦎' },
  }[templateId] || {};
  for (const [word, emoji] of Object.entries(specific)) {
    if (lower.includes(word)) return emoji;
  }
  return { dog: '🐶', car: '🏎️', dino: '🦖' }[templateId];
}

export function generateLocally(description, photoAnalysis = null) {
  const text = (description || '').trim() || 'a friendly robot';
  const templateId = pickTemplate(text, photoAnalysis);
  const { primary, accent } = pickColors(text, templateId);
  const name = makeName(text, templateId);
  const emoji = pickEmoji(templateId, text);

  const base = robotModels.find((m) => m.id === templateId);
  if (!base) throw new Error(`no template for ${templateId}`);

  const blueprint = {
    name,
    emoji,
    template: templateId,
    description: photoAnalysis
      ? `A custom ${name} designed from your photo — ${photoAnalysis.reason || 'inspired by what you showed me'}.`
      : `A one-of-a-kind ${name} built around your idea.`,
    primaryColor: primary,
    accentColor: accent,
    pieceCount: base.pieceCount,
  };
  const custom = customizeModel(base, blueprint);
  custom.difficulty = 'Custom';
  return custom;
}

/**
 * Apply a user-driven color change to an existing model. Detects up to two
 * requested colors in `text` and remaps the two most-used colors in the model
 * to them. Returns { model, changed } where `changed` is a short description
 * of what was changed (for the chat reply) or null if nothing matched.
 */
export function recolorFromText(model, text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [name, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(name) && !found.some((f) => f.hex === hex)) {
      found.push({ name, hex });
    }
  }
  if (!found.length) return null;

  const clone = structuredClone(model);
  const counts = {};
  for (const step of clone.steps) {
    for (const p of step.newParts || []) counts[p.color] = (counts[p.color] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const remap = {};
  if (found[0] && sorted[0]) remap[sorted[0]] = found[0].hex;
  if (found[1] && sorted[1]) remap[sorted[1]] = found[1].hex;

  for (const step of clone.steps) {
    for (const p of step.newParts || []) if (remap[p.color]) p.color = remap[p.color];
    for (const pc of step.pieces || []) if (remap[pc.color]) pc.color = remap[pc.color];
  }
  if (found[0]?.hex) clone.color = found[0].hex;

  const colorNames = found.slice(0, 2).map((f) => f.name).join(' and ');
  return { model: clone, changed: `Updated the main colors to ${colorNames}` };
}

/**
 * Detect a step-regeneration intent like "redo step 3" / "change step 5".
 * Returns the 0-based step index, or null if the message is not about
 * regenerating a specific step.
 */
export function detectStepRegenIntent(text, totalSteps) {
  const lower = text.toLowerCase();
  if (!/\b(redo|regenerate|change|remake|rebuild|fix)\b/.test(lower)) return null;
  const m = lower.match(/step\s*(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > totalSteps) return null;
  return n - 1;
}

/**
 * Detect any kind of modification intent from a chat message. Returns an
 * object describing the change to apply, or null if this is a normal chat
 * message (info request, greeting, etc.).
 */
export function detectModIntent(text, model) {
  const lower = text.toLowerCase();

  // Step regeneration ("redo step 3")
  const stepIdx = detectStepRegenIntent(text, model?.steps?.length || 0);
  if (stepIdx != null) return { kind: 'regen-step', stepIndex: stepIdx };

  // Color change ("make it blue", "change color to red", "paint it green")
  const colorVerbs = /\b(make|change|paint|recolor|turn|switch)\b/;
  const hasColorWord = Object.keys(COLOR_KEYWORDS).some((name) => lower.includes(name));
  if (colorVerbs.test(lower) && hasColorWord) {
    return { kind: 'recolor' };
  }

  return null;
}
