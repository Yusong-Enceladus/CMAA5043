/**
 * mutationEngine — the single entry point for "child says something" → "model
 * + manual change in real-time".
 *
 * We deliberately keep this simple and deterministic for the demo:
 *   - parses voice/text into one of a closed set of mutation kinds
 *   - applies the mutation by delegating to the existing recolor/structural
 *     services (proceduralBuilder, localRobotGen)
 *   - returns a structured `LogEntry` so the Manual side panel can render a
 *     "page-of-changes" with strikethroughs, stamps, and animated additions.
 *
 * Why a closed set? An open LLM call here is unreliable for kids: it stalls,
 * misfires, and breaks the synchronized 3D + manual animation. A small known
 * vocabulary makes the demo feel solid and gives Buddy a clear surface to
 * teach kids ("try saying 'make it blue' or 'add wings'!").
 */
import {
  detectModIntent,
  recolorFromText,
  recolorRegionFromText,
  applyChatModification,
} from './localRobotGen';
import { describeColor } from './colorNames';

export { describeColor };

/**
 * @typedef {Object} LogEntry
 * @property {string} id          Unique id used as React key + animation trigger.
 * @property {string} kind        'recolor' | 'scale' | 'add-feature' | 'remove-feature' | 'tap-recolor' | 'tap-remove'.
 * @property {string} description Human-readable line for the manual page.
 * @property {string} [target]    What was modified (e.g. "the head", "the whole robot").
 * @property {string} [before]    Old value (color hex / size / etc.).
 * @property {string} [after]     New value.
 * @property {string} [steamTag]  STEAM topic for the badge ("art", "math", ...).
 * @property {number} ts          Wall-clock timestamp.
 * @property {string} source      'voice' | 'text' | 'tap'.
 */

function uid() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Most-used color across all parts in a model (for before/after swatches). */
function dominantColor(model) {
  const counts = {};
  for (const step of model?.steps || []) {
    for (const p of step.newParts || []) counts[p.color] = (counts[p.color] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** Most-used color among parts whose step.title mentions the region. */
function regionDominantColor(model, region) {
  if (!model?.steps) return null;
  const aliases = REGION_HINT[region] || [region];
  const counts = {};
  for (const step of model.steps) {
    const t = (step.title || '').toLowerCase();
    if (!aliases.some((a) => t.includes(a))) continue;
    for (const p of step.newParts || []) counts[p.color] = (counts[p.color] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// Mirror of REGION_ALIASES from localRobotGen — keeps mutationEngine
// independent of internal helpers there.
const REGION_HINT = {
  head: ['head', 'snout', 'face'], body: ['body', 'belly', 'chest', 'chassis', 'torso'],
  legs: ['leg', 'shin', 'thigh', 'knee'], feet: ['paw', 'feet', 'foot'],
  tail: ['tail'], ears: ['ear'], eyes: ['eye'], wings: ['wing'],
  wheels: ['wheel'], spikes: ['spike'], arms: ['arm'],
  bumper: ['bumper', 'hood'], cockpit: ['cockpit', 'windshield', 'seat', 'steering'],
  spoiler: ['spoiler', 'radar', 'exhaust'],
  decorations: ['decoration', 'stripe', 'tag', 'collar', 'crown'],
};

/**
 * Apply a mutation from a free-text command. Returns:
 *   { model, log }  — when something matched
 *   null            — when nothing matched (caller should fall back)
 *
 * Note: we don't add error/empty-state copy here — that's the caller's job
 * (BuildScreen surfaces a charming Buddy bubble for unknown commands).
 */
export function applyTextMutation(model, text, source = 'voice') {
  if (!model || !text) return null;
  const intent = detectModIntent(text, model);
  if (!intent) return null;

  if (intent.kind === 'recolor') {
    // Compute dominant color BEFORE the recolor so the manual entry can show
    // the before→after swatch pair (otherwise we'd only know the new color).
    const beforeColor = dominantColor(model);
    const result = recolorFromText(model, text);
    if (!result) return null;
    const afterColor = dominantColor(result.model) || result.model.color;
    return {
      model: result.model,
      affectedStepIndices: result.affectedStepIndices,
      log: {
        id: uid(),
        kind: 'recolor',
        description: result.changed,
        before: beforeColor,
        after: afterColor,
        steamTag: 'art',
        ts: Date.now(),
        source,
      },
    };
  }

  if (intent.kind === 'recolor-region') {
    const beforeColor = regionDominantColor(model, intent.region);
    const result = recolorRegionFromText(model, text, intent.region);
    if (!result) return null;
    const afterColor = regionDominantColor(result.model, intent.region) || result.model.color;
    return {
      model: result.model,
      affectedStepIndices: result.affectedStepIndices,
      log: {
        id: uid(),
        kind: 'recolor',
        description: result.changed,
        target: `the ${intent.region}`,
        before: beforeColor,
        after: afterColor,
        steamTag: 'art',
        ts: Date.now(),
        source,
      },
    };
  }

  if (intent.kind === 'scale' || intent.kind === 'add-feature' || intent.kind === 'remove-feature') {
    const result = applyChatModification(model, text);
    if (!result) return null;
    return {
      model: result.model,
      // Hint for the BuildScreen: when a feature was added (a new step at
      // the end), jump the kid to that step so the manual page-flips to it
      // instantly. Otherwise the change is invisible until they nav forward.
      advanceTo: result.kind === 'add-feature' ? result.newStepIndex : undefined,
      log: {
        id: uid(),
        kind: result.kind,
        description: result.changed,
        steamTag: result.kind === 'scale' ? 'math' : 'engineering',
        ts: Date.now(),
        source,
      },
    };
  }

  // 'rebuild' / 'regen-step' — these are bigger, drop them for now in the
  // demo (they take you out of the live-mutation feel).
  return null;
}

/**
 * Apply a tap-driven recolor: child tapped a brick on the 3D viewer and
 * picked a swatch. We change ONLY the tapped brick (matched by exact world
 * position + color), not every same-coloured brick. That way a kid can
 * paint one paw red while the others stay black — fine-grained editing
 * that voice can't do.
 *
 * For a "change all matching" experience, the kid uses voice ("make it red")
 * which already does global remapping.
 */
export function applyTapRecolor(model, partRef, toColor, partLabel = 'this brick') {
  if (!model || !partRef || !toColor || partRef.color === toColor) return null;
  const fromColor = partRef.color;
  const clone = structuredClone(model);
  let stepIndex = -1;
  let changed = false;
  for (let i = 0; i < clone.steps.length && !changed; i++) {
    const step = clone.steps[i];
    for (const p of step.newParts || []) {
      if (
        p.pos[0] === partRef.pos[0] &&
        p.pos[1] === partRef.pos[1] &&
        p.pos[2] === partRef.pos[2] &&
        p.color === fromColor
      ) {
        p.color = toColor;
        stepIndex = i;
        changed = true;
        break;
      }
    }
  }
  if (!changed) return null;
  return {
    model: clone,
    affectedStepIndices: stepIndex >= 0 ? [stepIndex] : [],
    log: {
      id: uid(),
      kind: 'tap-recolor',
      description: `Painted ${partLabel} ${describeColor(toColor)}`,
      target: partLabel,
      before: fromColor,
      after: toColor,
      steamTag: 'art',
      ts: Date.now(),
      source: 'tap',
    },
  };
}

/**
 * Apply a tap-driven removal: child tapped a brick + chose Remove. We strip
 * the matching geometry from `step.newParts` AND decrement the pieces list
 * for the affected step(s). Without the second part, the manual would still
 * tell the kid to use a brick that's no longer there.
 */
export function applyTapRemove(model, partRef, partLabel = 'this brick') {
  if (!model || !partRef) return null;
  const clone = structuredClone(model);
  let removed = 0;
  for (const step of clone.steps) {
    const before = step.newParts?.length || 0;
    step.newParts = (step.newParts || []).filter((p) =>
      !(p.pos[0] === partRef.pos[0] &&
        p.pos[1] === partRef.pos[1] &&
        p.pos[2] === partRef.pos[2] &&
        p.color === partRef.color));
    const stepRemoved = before - (step.newParts?.length || 0);
    if (stepRemoved > 0 && Array.isArray(step.pieces)) {
      step.pieces = decrementPieceCount(step.pieces, partRef.color, stepRemoved);
    }
    removed += stepRemoved;
  }
  if (!removed) return null;
  clone.pieceCount = clone.steps.reduce((n, s) => n + (s.newParts?.length || 0), 0);
  return {
    model: clone,
    log: {
      id: uid(),
      kind: 'tap-remove',
      description: `Removed ${partLabel}`,
      target: partLabel,
      steamTag: 'engineering',
      ts: Date.now(),
      source: 'tap',
    },
  };
}

/**
 * Decrement the count in a piece's name (e.g. "4× Black Paw Tiles" → "3×
 * Black Paw Tiles"). If a piece's count would drop to zero, drop the piece
 * entirely so the manual no longer asks for it.
 */
function decrementPieceCount(pieces, color, deltaCount) {
  let remaining = deltaCount;
  return pieces
    .map((piece) => {
      if (piece.color !== color || remaining <= 0) return piece;
      const m = piece.name?.match(/^\s*(\d+)\s*[×x]\s*(.+)$/i);
      if (!m) return piece;
      const n = parseInt(m[1], 10);
      const take = Math.min(n, remaining);
      const next = n - take;
      remaining -= take;
      if (next <= 0) return null;
      return { ...piece, name: `${next}× ${m[2]}` };
    })
    .filter(Boolean);
}

/**
 * Quick, friendly hint text for when nothing matched. Caller (BuildScreen)
 * surfaces this in a Buddy bubble so the kid gets gentle guidance instead
 * of silence.
 */
export const HINT_EXAMPLES = [
  '"make it blue"',
  '"add wings"',
  '"make it bigger"',
  '"remove the tail"',
  '"give it horns"',
];
