/**
 * brickResolver — converts AI-generated "relative" brick descriptions into
 * the absolute-position format the 3D viewer expects.
 *
 * Design principle: REPAIR, don't REJECT. A single malformed brick used to
 * throw the whole blueprint away and force the procedural fallback — which
 * is why asking for "a fish" kept producing a procedural "Fish Rex" dino.
 * Instead, we coerce named colors to hex, unknown types to the closest
 * valid shape, and unknown parent refs to "ground", logging each repair so
 * it's debuggable. We only throw if the blueprint has zero usable steps
 * after repairs.
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

// Coercion table — when the AI hallucinates a type name, map it to the
// closest valid shape instead of throwing.
const TYPE_ALIASES = {
  block: 'brick', cube: 'brick', rectangle: 'brick',
  panel: 'plate', flat: 'plate', pad: 'plate', board: 'plate',
  ramp: 'slope', incline: 'slope', wedge: 'slope', fin: 'slope', wing: 'slope',
  stud: 'cylinder', rod: 'cylinder', pipe: 'cylinder', tube: 'cylinder', post: 'cylinder', pillar: 'cylinder', antenna: 'cylinder',
  pyramid: 'cone', spike: 'cone', point: 'cone', horn: 'cone', cap: 'cone',
  tyre: 'wheel', tire: 'wheel',
  sphere: 'cylinder', ball: 'cylinder', // best approximation
};

// Named-color fallback — lowercase word → hex. Applied if the AI returns
// "blue" instead of "#3B82F6".
const COLOR_ALIASES = {
  red: '#EF4444', crimson: '#DC2626', orange: '#F59E0B', amber: '#F59E0B',
  yellow: '#FCD34D', gold: '#FCD34D', lime: '#84CC16', green: '#10B981',
  teal: '#14B8A6', cyan: '#22D3EE', sky: '#38BDF8', blue: '#3B82F6',
  navy: '#1E3A8A', indigo: '#6366F1', purple: '#8B5CF6', violet: '#8B5CF6',
  magenta: '#EC4899', pink: '#F472B6', rose: '#F43F5E', brown: '#92400E',
  tan: '#D6A777', white: '#F3F4F6', silver: '#9CA3AF', gray: '#6B7280',
  grey: '#6B7280', black: '#1F2937',
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const warn = (msg) => {
  if (typeof window !== 'undefined' && import.meta.env?.DEV) console.warn('[brickResolver]', msg);
};

function coerceType(raw) {
  if (typeof raw !== 'string') return null;
  const t = raw.toLowerCase().trim();
  if (VALID_TYPES.includes(t)) return t;
  if (TYPE_ALIASES[t]) return TYPE_ALIASES[t];
  return null;
}

function coerceColor(raw, fallback = '#9CA3AF') {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (HEX_RE.test(trimmed)) return trimmed;
  // "#ABC" short-form → expand
  const short = trimmed.match(/^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  // Named color ("blue")
  const key = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (COLOR_ALIASES[key]) return COLOR_ALIASES[key];
  // rgb(…) form
  const rgb = trimmed.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) {
    const hx = (n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
    return `#${hx(rgb[1])}${hx(rgb[2])}${hx(rgb[3])}`.toUpperCase();
  }
  warn(`unrecognized color "${raw}", using ${fallback}`);
  return fallback;
}

function heightFor(b) {
  if (typeof b.h === 'number' && b.h > 0) return b.h;
  return DEFAULT_HEIGHT[b.type] ?? 1.2;
}

function footprint(b) {
  const w = Number(b.w) || 1;
  const d = Number(b.d) || 1;
  return [Math.max(0.2, w), Math.max(0.2, d)];
}

function slugifyId(raw, fallback) {
  if (typeof raw !== 'string' || !raw) return fallback;
  const s = raw.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || fallback;
}

/**
 * Resolve a list of steps whose `bricks` fields use relative `on`/`offset`
 * positions into steps whose `newParts` arrays use absolute `pos`/`size`.
 *
 * Never throws — silently skips individual bad bricks, auto-renames id
 * collisions, and coerces unknown `on` refs to "ground". Callers get back
 * the best-effort geometry so the AI's intent is preserved as much as
 * possible.
 */
export function resolveSteps(steps, paletteHint = {}) {
  const fallbackColor = coerceColor(paletteHint.primary, '#9CA3AF');
  const registry = new Map(); // id → { pos, size }
  const out = [];

  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    const bricks = Array.isArray(step.bricks) ? step.bricks : [];
    const newParts = [];
    let lastId = null; // used as "on" fallback when the AI references a missing id

    for (let bi = 0; bi < bricks.length; bi++) {
      const b = bricks[bi];
      if (!b || typeof b !== 'object') continue;

      const type = coerceType(b.type);
      if (!type) {
        warn(`step ${si + 1} brick ${bi}: unknown type "${b.type}" — skipping`);
        continue;
      }

      // Auto-rename id collisions rather than throwing.
      let id = slugifyId(b.id, `s${si + 1}-b${bi}`);
      if (registry.has(id)) {
        const base = id;
        let n = 2;
        while (registry.has(`${base}-${n}`)) n++;
        id = `${base}-${n}`;
      }

      const color = coerceColor(b.color, fallbackColor);

      const [w, d] = footprint({ ...b, type });
      const h = heightFor({ ...b, type });
      const [dx = 0, dz = 0] = Array.isArray(b.offset) ? b.offset : [0, 0];

      // Resolve parent — fall back to ground if unknown, then to last brick.
      let yBottom, parentCenter;
      if (b.on === 'ground' || !b.on) {
        yBottom = 0;
        parentCenter = [0, 0, 0];
      } else {
        const parent = registry.get(b.on) || (lastId ? registry.get(lastId) : null);
        if (!parent) {
          warn(`step ${si + 1} brick ${id}: unknown on-ref "${b.on}" — placing on ground`);
          yBottom = 0;
          parentCenter = [0, 0, 0];
        } else {
          yBottom = parent.pos[1] + parent.size[1] / 2;
          parentCenter = parent.pos;
        }
      }

      const pos = [parentCenter[0] + Number(dx || 0), yBottom + h / 2, parentCenter[2] + Number(dz || 0)];
      const size = [w, h, d];
      const part = { type, pos, size, color };
      if (b.opacity != null) part.opacity = Number(b.opacity);
      if (b.rotation && Array.isArray(b.rotation)) part.rotation = b.rotation;

      registry.set(id, part);
      newParts.push(part);
      lastId = id;
    }

    out.push({ ...step, newParts });
  }
  return out;
}

/**
 * Top-level validator — REPAIRS the blueprint in place. Only throws when
 * the payload is fundamentally unusable (not an object / zero steps). Every
 * other schema deviation gets a sensible default so the AI's work ships
 * to the viewer instead of being silently discarded.
 */
export function validateBlueprint(bp) {
  if (!bp || typeof bp !== 'object') throw new Error('blueprint must be object');

  // Repair top-level fields.
  bp.name ||= 'Custom Robot';
  bp.emoji ||= '🤖';
  bp.description ||= 'A brand-new robot built from your idea!';
  bp.primaryColor = coerceColor(bp.primaryColor || bp.color || bp.mainColor, '#3B82F6');
  bp.accentColor  = coerceColor(bp.accentColor  || bp.secondaryColor,         '#F59E0B');
  bp.difficulty ||= 'Custom';
  bp.color ||= bp.primaryColor;

  // Accept a few common aliases for the steps array.
  if (!Array.isArray(bp.steps) && Array.isArray(bp.stages)) bp.steps = bp.stages;
  if (!Array.isArray(bp.steps) && Array.isArray(bp.instructions)) bp.steps = bp.instructions;
  if (!Array.isArray(bp.steps)) throw new Error('blueprint has no steps array');

  // Drop steps that have no usable bricks after repair; we need at least 3.
  bp.steps = bp.steps
    .map((raw, i) => {
      const s = raw && typeof raw === 'object' ? raw : {};
      s.num = i + 1;
      s.title   = (typeof s.title === 'string' && s.title) || `Step ${i + 1}`;
      s.emoji   ||= '🧱';
      s.desc    ||= '';
      s.tip     ||= '';
      s.pieces  ||= [];
      s.steamTag ||= 'engineering';
      // Some models emit `parts` or `items` instead of `bricks`.
      if (!Array.isArray(s.bricks)) {
        if (Array.isArray(s.parts)) s.bricks = s.parts;
        else if (Array.isArray(s.items)) s.bricks = s.items;
        else s.bricks = [];
      }
      return s;
    })
    .filter((s) => s.bricks.length > 0);

  if (bp.steps.length < 3) throw new Error(`only ${bp.steps.length} usable step(s) after repair`);
  if (bp.steps.length > 10) bp.steps = bp.steps.slice(0, 10);

  bp.pieceCount = Math.max(3, Math.min(80, Number(bp.pieceCount) || bp.steps.reduce((n, s) => n + s.bricks.length, 0)));
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
    const t = coerceType(b.type) || 'brick';
    pieces.push({ color: coerceColor(b.color, '#9CA3AF'), name: `${sizeName(b)} ${t}` });
  }
  return pieces;
}
