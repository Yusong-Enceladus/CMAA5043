/**
 * localRobotGen — Offline fallback for AI robot generation.
 *
 * Runs entirely in the browser. Hands the description to the procedural
 * builder, which composes a unique robot from archetypes + features instead
 * of recoloring one of the three hand-authored templates. Used when
 * /api/chat is throttled or unreachable so "Talk to Me" and "Show Me" always
 * produce a build, even with no AI.
 */
import { buildProceduralRobot, detectStructuralIntent, applyChatModification } from './proceduralBuilder';

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

export function generateLocally(description, photoAnalysis = null) {
  return buildProceduralRobot(description, photoAnalysis);
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
 *
 * Intent kinds (handled by BuildScreen):
 *  - 'regen-step'      → re-roll one specific step via AI (fallback: procedural rebuild of that step)
 *  - 'recolor'         → swap the dominant colors using `recolorFromText`
 *  - 'scale'           → resize the whole model
 *  - 'add-feature'     → append a new step with wings/tail/horns/etc.
 *  - 'remove-feature'  → strip a previously-added feature step
 *  - 'rebuild'         → throw out the current model and procedurally generate a new one
 */
export function detectModIntent(text, model) {
  const lower = text.toLowerCase();

  // Step regeneration ("redo step 3")
  const stepIdx = detectStepRegenIntent(text, model?.steps?.length || 0);
  if (stepIdx != null) return { kind: 'regen-step', stepIndex: stepIdx };

  // Full rebuild ("turn it into a dragon", "make it a spider instead").
  // Detected before recolor/feature so a phrase like "make it a green dragon"
  // doesn't get parsed as a color change.
  if (/\b(turn\s+it\s+into|make\s+it\s+(?:a|an)|change\s+it\s+(?:to|into)|rebuild|start\s+over|new\s+robot)\b/.test(lower)) {
    return { kind: 'rebuild' };
  }

  // Structural changes (size, add/remove features) come from the procedural builder.
  const structural = detectStructuralIntent(text);
  if (structural) return { kind: structural };

  // Color change ("make it blue", "change color to red", "paint it green",
  // or just "blue please"). We accept either a color verb OR a bare color word
  // — kids often skip the verb.
  const colorVerbs = /\b(make|change|paint|recolor|turn|switch|color)\b/;
  const hasColorWord = Object.keys(COLOR_KEYWORDS).some((name) => new RegExp(`\\b${name}\\b`).test(lower));
  if (hasColorWord && (colorVerbs.test(lower) || lower.split(/\s+/).length <= 4)) {
    return { kind: 'recolor' };
  }

  return null;
}

// Re-export so BuildScreen can apply structural changes via a single import.
export { applyChatModification };
