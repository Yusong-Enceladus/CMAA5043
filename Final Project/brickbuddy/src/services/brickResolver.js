/**
 * brickResolver — converts AI-generated "relative" brick descriptions into
 * the absolute-position format the 3D viewer expects.
 *
 * Why relative? Free-tier LLMs are bad at computing world coordinates but
 * good at saying "put this brick on top of that other brick, offset by X,Z."
 * So the AI describes a brick graph and this module walks it to absolute
 * positions — grounding is automatic and there's no way to float.
 *
 * AI schema (per brick):
 *   {
 *     id:     string (unique across the whole build)
 *     type:   "plate" | "brick" | "tile" | "slope" | "cylinder" | "cone" | "wheel"
 *     on:     "ground" | <id of a brick declared earlier>
 *     offset: [dx, dz]      // in studs, from parent's CENTER (0,0 = stacked)
 *     w, d:   number        // footprint in studs
 *     h:      number (opt)  // world-unit height; defaults per type
 *     color:  "#RRGGBB"
 *   }
 *
 * Viewer schema (produced):
 *   { type, pos:[x,y,z], size:[w,h,d], color }
 */

const DEFAULT_HEIGHT = {
  plate:    0.4,
  tile:     0.4,
  brick:    1.2,
  slope:    1.2,
  cylinder: 0.6,
  cone:     0.9,
  wheel:    1.0,
};

const VALID_TYPES = Object.keys(DEFAULT_HEIGHT);

function heightFor(b) {
  if (typeof b.h === 'number' && b.h > 0) return b.h;
  return DEFAULT_HEIGHT[b.type] ?? 1.2;
}

function footprint(b) {
  const w = Number(b.w) || 1;
  const d = Number(b.d) || 1;
  return [Math.max(0.2, w), Math.max(0.2, d)];
}

/**
 * Resolve a list of steps whose `bricks` fields use relative `on`/`offset`
 * positions into steps whose `newParts` arrays use absolute `pos`/`size`.
 *
 * Throws if the graph has missing references or cycles. Callers should
 * catch and fall back to a template.
 */
export function resolveSteps(steps) {
  const registry = new Map(); // id → { pos, size }
  const out = [];

  for (const step of steps) {
    const bricks = Array.isArray(step.bricks) ? step.bricks : [];
    const newParts = [];

    for (const b of bricks) {
      if (!b || typeof b !== 'object') continue;
      if (!b.id || typeof b.id !== 'string') throw new Error('brick missing id');
      if (registry.has(b.id)) throw new Error(`duplicate brick id: ${b.id}`);
      if (!VALID_TYPES.includes(b.type)) throw new Error(`bad type: ${b.type}`);
      if (!/^#[0-9A-Fa-f]{6}$/.test(b.color)) throw new Error(`bad color on ${b.id}`);

      const [w, d] = footprint(b);
      const h = heightFor(b);
      const [dx = 0, dz = 0] = Array.isArray(b.offset) ? b.offset : [0, 0];

      // Resolve parent.
      let yBottom, parentCenter;
      if (b.on === 'ground' || !b.on) {
        yBottom = 0;
        parentCenter = [0, 0, 0];
      } else {
        const parent = registry.get(b.on);
        if (!parent) throw new Error(`unknown on-ref: ${b.on} (for ${b.id})`);
        yBottom = parent.pos[1] + parent.size[1] / 2;
        parentCenter = parent.pos;
      }

      const pos = [parentCenter[0] + dx, yBottom + h / 2, parentCenter[2] + dz];
      const size = [w, h, d];
      const part = { type: b.type, pos, size, color: b.color };
      if (b.opacity != null) part.opacity = Number(b.opacity);
      if (b.rotation) part.rotation = b.rotation;

      registry.set(b.id, part);
      newParts.push(part);
    }

    out.push({ ...step, newParts });
  }
  return out;
}

/**
 * Strict top-level validator. Returns the normalized blueprint or throws.
 * Does NOT resolve positions — call resolveSteps separately.
 */
export function validateBlueprint(bp) {
  if (!bp || typeof bp !== 'object') throw new Error('blueprint must be object');
  const required = ['name', 'emoji', 'description', 'primaryColor', 'accentColor'];
  for (const k of required) {
    if (!bp[k] || typeof bp[k] !== 'string') throw new Error(`missing ${k}`);
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(bp.primaryColor)) throw new Error('bad primaryColor');
  if (!/^#[0-9A-Fa-f]{6}$/.test(bp.accentColor)) throw new Error('bad accentColor');
  if (!Array.isArray(bp.steps) || bp.steps.length < 3) throw new Error('need at least 3 steps');
  if (bp.steps.length > 10) bp.steps = bp.steps.slice(0, 10);
  bp.steps.forEach((s, i) => {
    s.num = i + 1;
    if (!s.title || typeof s.title !== 'string') throw new Error(`step ${i} missing title`);
    if (!Array.isArray(s.bricks)) throw new Error(`step ${i} missing bricks`);
    // Fill defaults so later UI code is safe.
    s.emoji ||= '🧱';
    s.desc ||= '';
    s.tip  ||= '';
    s.pieces ||= [];
    s.steamTag ||= 'engineering';
  });
  bp.difficulty ||= 'Custom';
  bp.pieceCount = Math.max(20, Math.min(80, Number(bp.pieceCount) || 30));
  bp.color ||= bp.primaryColor;
  return bp;
}

/**
 * Compute `pieces` list (the "Pieces You Need" card data) from the resolved
 * parts in a step — counts by color, rounds sizes.
 */
export function derivePiecesFromBricks(bricks) {
  const pieces = [];
  const sizeName = (p) => {
    const w = Math.round(p.w || 1);
    const d = Math.round(p.d || 1);
    return `${w}×${d}`;
  };
  for (const b of bricks || []) {
    pieces.push({ color: b.color, name: `${sizeName(b)} ${b.type}` });
  }
  return pieces;
}
