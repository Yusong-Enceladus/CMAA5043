/**
 * localRobotGen — text → mutation intent helpers.
 *
 * Originally also held an offline robot generator, but the new redesign
 * (scan-pile → recommendation → build) doesn't generate robots from a
 * free-text description any more. Everything that remains here is in
 * service of the live-mutation pipeline:
 *   - detectModIntent  → classify "make it blue" / "add wings" / etc.
 *   - recolorFromText  → global recolor + manual text rewrite
 *   - recolorRegionFromText → scoped "make the head blue" recolor
 *
 * `applyChatModification` lives in proceduralBuilder.js and is just
 * re-exported from here so callers have a single import surface.
 */
import { detectStructuralIntent, applyChatModification } from './proceduralBuilder';
import { describeColor, rewriteColorWords } from './colorNames';

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

/**
 * Region keywords → step-title aliases. Used by `recolorRegionFromText` to
 * identify which steps' parts to repaint when the kid says e.g. "make the
 * head blue". These regions are intentionally kid-friendly and map to the
 * conceptual body parts in the hand-authored models.
 */
const REGION_ALIASES = {
  head:      ['head', 'snout', 'face'],
  body:      ['body', 'belly', 'chest', 'chassis', 'torso'],
  legs:      ['leg', 'shin', 'thigh', 'knee'],
  feet:      ['paw', 'feet', 'foot'],
  tail:      ['tail'],
  ears:      ['ear'],
  eyes:      ['eye'],
  wings:     ['wing'],
  wheels:    ['wheel'],
  spikes:    ['spike'],
  arms:      ['arm'],
  bumper:    ['bumper', 'hood'],
  cockpit:   ['cockpit', 'windshield', 'seat', 'steering'],
  spoiler:   ['spoiler', 'radar', 'exhaust'],
  decorations: ['decoration', 'stripe', 'tag', 'collar', 'crown'],
};

/** Find every region keyword that appears in `text` (lowercased). */
function findRegionsMentioned(text) {
  const lower = text.toLowerCase();
  const out = new Set();
  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((a) => new RegExp(`\\b${a}s?\\b`).test(lower))) out.add(region);
  }
  return [...out];
}

/** Indices of steps whose title matches the given region's aliases. */
function stepIndicesForRegion(model, region) {
  const aliases = REGION_ALIASES[region] || [region];
  const out = [];
  model.steps.forEach((step, i) => {
    const t = (step.title || '').toLowerCase();
    if (aliases.some((a) => t.includes(a))) out.push(i);
  });
  return out;
}

/**
 * Apply a user-driven color change to an existing model. Detects up to two
 * requested colors in `text` and remaps the two most-used colors in the model
 * to them. Critically, this also rewrites color words inside `step.desc`,
 * `step.title`, `step.tip`, and `pieces[].name` so the manual page actually
 * reflects the new state — otherwise a "make it blue" command leaves the
 * page still talking about "orange head block".
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

  // Map { oldName → newName } for text rewriting. Multiple hexes can share
  // a name (e.g. #1F2937 and #111827 are both "black"), but the sorted list
  // already deduplicates by exact hex, so we look up names individually.
  const nameMap = {};
  for (const [oldHex, newHex] of Object.entries(remap)) {
    const oldName = describeColor(oldHex);
    const newName = describeColor(newHex);
    if (oldName && newName && oldName !== newName) nameMap[oldName] = newName;
  }

  // Track which steps are visibly affected so the Manual can highlight them.
  const affectedStepIndices = [];

  clone.steps.forEach((step, idx) => {
    let stepChanged = false;
    for (const p of step.newParts || []) {
      if (remap[p.color]) { p.color = remap[p.color]; stepChanged = true; }
    }
    for (const pc of step.pieces || []) {
      if (remap[pc.color]) { pc.color = remap[pc.color]; stepChanged = true; }
      if (pc.name) {
        const next = rewriteColorWords(pc.name, nameMap);
        if (next !== pc.name) { pc.name = next; stepChanged = true; }
      }
    }
    if (step.desc) {
      const next = rewriteColorWords(step.desc, nameMap);
      if (next !== step.desc) { step.desc = next; stepChanged = true; }
    }
    if (step.title) step.title = rewriteColorWords(step.title, nameMap);
    if (step.tip)   step.tip   = rewriteColorWords(step.tip, nameMap);
    if (stepChanged) affectedStepIndices.push(idx);
  });
  if (found[0]?.hex) clone.color = found[0].hex;

  const colorNames = found.slice(0, 2).map((f) => f.name).join(' and ');
  return {
    model: clone,
    changed: `Updated the main colors to ${colorNames}`,
    affectedStepIndices,
  };
}

/**
 * Recolor only the parts in the steps belonging to a named region (e.g.
 * "make the head blue" → only step "Build the Head" gets repainted). Returns
 * `{ model, changed, affectedStepIndices }` or null if no parts in that
 * region had a color to remap.
 */
export function recolorRegionFromText(model, text, region) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [name, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(name) && !found.some((f) => f.hex === hex)) {
      found.push({ name, hex });
    }
  }
  if (!found.length) return null;

  const targetIdx = stepIndicesForRegion(model, region);
  if (!targetIdx.length) return null;

  // Find the dominant color among the target steps' parts.
  const counts = {};
  for (const i of targetIdx) {
    for (const p of model.steps[i].newParts || []) {
      counts[p.color] = (counts[p.color] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (!sorted.length) return null;

  const remap = { [sorted[0]]: found[0].hex };
  if (found[1] && sorted[1]) remap[sorted[1]] = found[1].hex;
  if (Object.entries(remap).every(([from, to]) => from === to)) return null;

  const nameMap = {};
  for (const [oldHex, newHex] of Object.entries(remap)) {
    const oldName = describeColor(oldHex);
    const newName = describeColor(newHex);
    if (oldName && newName && oldName !== newName) nameMap[oldName] = newName;
  }

  const clone = structuredClone(model);
  const affectedStepIndices = [];

  targetIdx.forEach((i) => {
    const step = clone.steps[i];
    let stepChanged = false;
    for (const p of step.newParts || []) {
      if (remap[p.color]) { p.color = remap[p.color]; stepChanged = true; }
    }
    for (const pc of step.pieces || []) {
      if (remap[pc.color]) { pc.color = remap[pc.color]; stepChanged = true; }
      if (pc.name) {
        const next = rewriteColorWords(pc.name, nameMap);
        if (next !== pc.name) { pc.name = next; stepChanged = true; }
      }
    }
    if (step.desc) {
      const next = rewriteColorWords(step.desc, nameMap);
      if (next !== step.desc) { step.desc = next; stepChanged = true; }
    }
    if (step.title) step.title = rewriteColorWords(step.title, nameMap);
    if (step.tip)   step.tip   = rewriteColorWords(step.tip, nameMap);
    if (stepChanged) affectedStepIndices.push(i);
  });

  if (!affectedStepIndices.length) return null;

  const colorWord = found.slice(0, 2).map((f) => f.name).join(' and ');
  return {
    model: clone,
    changed: `Repainted the ${region} ${colorWord}`,
    affectedStepIndices,
    region,
  };
}

/** Pick the first region keyword the kid mentioned, if any. */
export function detectRegionInText(text) {
  const regions = findRegionsMentioned(text);
  return regions[0] || null;
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
  // — kids often skip the verb. If the message also names a body region
  // ("make the head blue"), bubble that up so the engine can do a scoped
  // recolor instead of remapping the dominant color across the whole model.
  const colorVerbs = /\b(make|change|paint|recolor|turn|switch|color)\b/;
  const hasColorWord = Object.keys(COLOR_KEYWORDS).some((name) => new RegExp(`\\b${name}\\b`).test(lower));
  if (hasColorWord && (colorVerbs.test(lower) || lower.split(/\s+/).length <= 6)) {
    const region = detectRegionInText(text);
    if (region) return { kind: 'recolor-region', region };
    return { kind: 'recolor' };
  }

  return null;
}

// Re-export so BuildScreen can apply structural changes via a single import.
export { applyChatModification };
