/**
 * proceduralBuilder — generate truly UNIQUE LEGO robot geometry from text,
 * without depending on the AI. Used as the offline fallback for "Talk to Me"
 * and as the engine for chat-driven structural changes ("add wings",
 * "make it bigger", "give it a tail").
 *
 * The output mirrors the hand-authored models in `data/models.js`:
 *   { id, name, emoji, difficulty, pieceCount, color, description, steps[] }
 * Each step has `newParts` (absolute positions, viewer-ready) and a `pieces`
 * list (color/name) for the side panel.
 *
 * Why procedural? The Imagine fallback used to recolor one of 3 hand-authored
 * templates, which made every fallback robot look like a dog/car/dino. This
 * builder composes silhouettes from a richer set of archetypes plus optional
 * features, so identical-template duplicates only happen when the user types
 * essentially the same description.
 */

const P = 0.4; // plate height
const B = 1.2; // brick height (3 plates)

/* ─────────────── Brick helpers (yBottom-based, consistent with data/models.js) */
const plate = (x, yBottom, z, w, d, color) =>
  ({ type: 'plate', pos: [x, yBottom + P / 2, z], size: [w, P, d], color });
const brick = (x, yBottom, z, w, d, color) =>
  ({ type: 'brick', pos: [x, yBottom + B / 2, z], size: [w, B, d], color });
const tallBrick = (x, yBottom, z, w, d, h, color) =>
  ({ type: 'brick', pos: [x, yBottom + h / 2, z], size: [w, h, d], color });
const tallSlope = (x, yBottom, z, w, d, h, color) =>
  ({ type: 'slope', pos: [x, yBottom + h / 2, z], size: [w, h, d], color });
const cyl = (x, yBottom, z, r, h, color) =>
  ({ type: 'cylinder', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color });
const cone = (x, yBottom, z, r, h, color) =>
  ({ type: 'cone', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color });
const tile = (x, yBottom, z, w, d, color) =>
  ({ type: 'tile', pos: [x, yBottom + P / 2, z], size: [w, P, d], color });
const wheel = (x, z, color) =>
  ({ type: 'wheel', pos: [x, 0.8, z], size: [1.6, 1.0, 1.6], color });

/* ─────────────── Vocabulary ─────────────── */

// Body archetypes — silhouette + leg count + body proportions.
// `pickArchetype` chooses one from the description keywords.
const ARCHETYPES = {
  quadruped: { keys: ['dog', 'puppy', 'cat', 'kitty', 'tiger', 'lion', 'wolf', 'fox', 'bear', 'panda', 'horse', 'pony', 'unicorn', 'pet', 'animal', 'paw', 'fur'] },
  biped:     { keys: ['robot', 'humanoid', 'android', 'man', 'person', 'warrior', 'knight', 'guard', 'hero'] },
  vehicle:   { keys: ['car', 'truck', 'train', 'bus', 'racer', 'rover', 'tank', 'wheel', 'wheels', 'drive', 'engine', 'motor', 'race', 'racing', 'vehicle', 'lorry', 'van'] },
  marine:    { keys: ['fish', 'shark', 'whale', 'dolphin', 'turtle', 'tortoise', 'stingray', 'ray', 'jellyfish', 'seal', 'orca', 'manta', 'seahorse', 'sea', 'ocean', 'aquarium', 'submarine', 'sub', 'swim', 'swims', 'underwater', 'marine', 'fin', 'fins', 'gills'] },
  serpent:   { keys: ['snake', 'serpent', 'worm', 'caterpillar', 'centipede', 'slug', 'eel'] },
  flyer:     { keys: ['bird', 'eagle', 'owl', 'plane', 'jet', 'airplane', 'rocket', 'ship', 'butterfly', 'bee', 'bat', 'pterodactyl'] },
  giant:     { keys: ['dino', 'dinosaur', 'trex', 't-rex', 'rex', 'raptor', 'jurassic', 'godzilla', 'stegosaurus', 'triceratops', 'monster', 'beast', 'giant', 'huge', 'titan', 'mech'] },
  arachnid:  { keys: ['spider', 'crab', 'scorpion', 'octopus', 'squid', 'lobster', 'insect', 'bug'] },
  dragon:    { keys: ['dragon', 'wyvern', 'drake', 'lizard'] },
};

// Check in this order — more-specific archetypes before generic ones. "fish"
// ahead of "giant" so "fish robot" doesn't get eaten by the "robot"→biped match
// path, and "dragon" stays ahead of "lizard"-shaped creatures.
const ARCHETYPE_ORDER = ['dragon', 'marine', 'giant', 'arachnid', 'vehicle', 'flyer', 'serpent', 'biped', 'quadruped'];

const FEATURE_KEYWORDS = {
  wings:    ['wing', 'wings', 'fly', 'flying', 'flap'],
  tail:     ['tail', 'tails'],
  horns:    ['horn', 'horns', 'antler', 'antlers'],
  antenna:  ['antenna', 'antennae', 'antennas', 'aerial'],
  fangs:    ['fang', 'fangs', 'tusk', 'tusks', 'teeth', 'tooth'],
  spikes:   ['spike', 'spikes', 'spiky', 'spiked', 'thorn'],
  crown:    ['crown', 'royal', 'king', 'queen', 'prince', 'princess'],
  shield:   ['shield', 'armor', 'armour', 'guard'],
  jetpack:  ['jetpack', 'rocket', 'thruster', 'booster'],
  extraEyes:['eyes', 'extra eye', 'three eye', 'four eye', 'many eye'],
};

const SIZE_KEYWORDS = {
  big:    ['big', 'bigger', 'large', 'larger', 'huge', 'giant', 'mega', 'jumbo'],
  small:  ['small', 'smaller', 'tiny', 'little', 'mini', 'baby', 'micro'],
  tall:   ['tall', 'taller', 'high', 'long-legged'],
  short:  ['short', 'shorter', 'low', 'squat', 'stubby'],
  wide:   ['wide', 'wider', 'fat', 'chunky'],
  narrow: ['narrow', 'skinny', 'thin', 'slim'],
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
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'with', 'for', 'to', 'of', 'in', 'on',
  'into', 'onto', 'from', 'about', 'around', 'over', 'under', 'as', 'at', 'by',
  'is', 'are', 'am', 'be', 'i', 'my', 'me', 'we', 'you', 'it', 'its',
  'want', 'wants', 'like', 'likes', 'build', 'builds', 'make', 'makes',
  'turn', 'turns', 'change', 'changes', 'rebuild', 'add', 'remove', 'give',
  'that', 'this', 'these', 'those',
  'very', 'really', 'super', 'so', 'some', 'one', 'two',
  'cool', 'nice', 'pretty', 'good', 'big', 'small', 'tiny', 'tall', 'short',
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'black', 'white',
  'gray', 'grey', 'silver', 'gold', 'brown',
]);

/* ─────────────── Parsing ─────────────── */

function pickArchetype(text) {
  const lower = text.toLowerCase();
  // Score in priority order — first archetype with any keyword match wins.
  // This avoids "dragon" being beaten by "lizard" → giant when both are mentioned.
  for (const id of ARCHETYPE_ORDER) {
    const keys = ARCHETYPES[id].keys;
    if (keys.some((k) => lower.includes(k))) return id;
  }
  // Stable hash → archetype, so identical prompts yield identical archetypes.
  return ARCHETYPE_ORDER[Math.abs(hash(text)) % ARCHETYPE_ORDER.length];
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

function pickColors(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [name, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(name) && !found.includes(hex)) found.push(hex);
  }
  return found;
}

export function detectFeatures(text) {
  const lower = text.toLowerCase();
  const set = new Set();
  for (const [feature, keys] of Object.entries(FEATURE_KEYWORDS)) {
    if (keys.some((k) => lower.includes(k))) set.add(feature);
  }
  return set;
}

function detectSize(text) {
  const lower = text.toLowerCase();
  const out = { scaleX: 1, scaleY: 1, scaleZ: 1 };
  for (const [bucket, keys] of Object.entries(SIZE_KEYWORDS)) {
    if (keys.some((k) => new RegExp(`\\b${k}\\b`).test(lower))) {
      if (bucket === 'big')    { out.scaleX *= 1.25; out.scaleY *= 1.25; out.scaleZ *= 1.25; }
      if (bucket === 'small')  { out.scaleX *= 0.8;  out.scaleY *= 0.8;  out.scaleZ *= 0.8; }
      if (bucket === 'tall')   { out.scaleY *= 1.35; }
      if (bucket === 'short')  { out.scaleY *= 0.75; }
      if (bucket === 'wide')   { out.scaleX *= 1.25; out.scaleZ *= 1.2; }
      if (bucket === 'narrow') { out.scaleX *= 0.8;  out.scaleZ *= 0.85; }
    }
  }
  return out;
}

const NAME_PREFIXES = ['Mighty', 'Brave', 'Sparky', 'Cosmic', 'Tiny', 'Royal', 'Sunny', 'Lucky'];

function makeName(text, archetype) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, 2);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const suffix = {
    quadruped: 'Pup', biped: 'Bot', vehicle: 'Racer',
    serpent:   'Snake', flyer: 'Flyer', giant: 'Rex',
    arachnid:  'Spider', dragon: 'Dragon', marine: 'Fish',
  }[archetype];
  if (words.length >= 2 && words[0] !== words[1]) {
    return `${cap(words[0])} ${cap(words[1])}`;
  }
  const word = words[0];
  if (word) {
    // Avoid awkward duplicates like "Dragon Dragon" / "Spider Spider" when the
    // user's noun matches the archetype suffix.
    if (cap(word) === suffix) {
      const prefix = NAME_PREFIXES[Math.abs(hash(text)) % NAME_PREFIXES.length];
      return `${prefix} ${suffix}`;
    }
    return `${cap(word)} ${suffix}`;
  }
  return `Mystery ${suffix}`;
}

function pickEmoji(archetype, text) {
  const lower = text.toLowerCase();
  const specifics = {
    quadruped: { cat: '🐱', tiger: '🐯', lion: '🦁', wolf: '🐺', fox: '🦊', bear: '🐻', panda: '🐼', horse: '🐴', unicorn: '🦄', frog: '🐸', bunny: '🐰', rabbit: '🐰', dog: '🐶' },
    biped:     { warrior: '⚔️', knight: '🤺', hero: '🦸', android: '🤖' },
    vehicle:   { truck: '🚛', train: '🚂', bus: '🚌', tank: '🚜', rover: '🚙', race: '🏎️', car: '🚗' },
    marine:    { shark: '🦈', whale: '🐋', dolphin: '🐬', turtle: '🐢', tortoise: '🐢', octopus: '🐙', jellyfish: '🪼', seahorse: '🐙', submarine: '🚢', sub: '🚢', fish: '🐟' },
    serpent:   { snake: '🐍', worm: '🐛', eel: '🐍' },
    flyer:     { plane: '✈️', jet: '🛩️', rocket: '🚀', bird: '🐦', butterfly: '🦋', bee: '🐝', bat: '🦇' },
    giant:     { stegosaurus: '🦕', triceratops: '🦖', dino: '🦖', monster: '👹', mech: '🤖' },
    arachnid:  { spider: '🕷️', crab: '🦀', scorpion: '🦂', octopus: '🐙', lobster: '🦞' },
    dragon:    { dragon: '🐉', wyvern: '🐲', lizard: '🦎' },
  }[archetype] || {};
  for (const [word, emoji] of Object.entries(specifics)) {
    if (lower.includes(word)) return emoji;
  }
  return {
    quadruped: '🐶', biped: '🤖', vehicle: '🏎️', serpent: '🐍',
    flyer: '🦅', giant: '🦖', arachnid: '🕷️', dragon: '🐉', marine: '🐟',
  }[archetype];
}

/* ─────────────── Color palette ─────────────── */

function buildPalette(text, archetype) {
  const found = pickColors(text);
  const defaults = {
    quadruped: ['#F59E0B', '#EF4444', '#1F2937'],
    biped:     ['#3B82F6', '#9CA3AF', '#FCD34D'],
    vehicle:   ['#3B82F6', '#EF4444', '#1F2937'],
    marine:    ['#38BDF8', '#3B82F6', '#FCD34D'],
    serpent:   ['#10B981', '#FCD34D', '#1F2937'],
    flyer:     ['#38BDF8', '#F3F4F6', '#1F2937'],
    giant:     ['#10B981', '#F59E0B', '#1F2937'],
    arachnid:  ['#1F2937', '#EF4444', '#FCD34D'],
    dragon:    ['#8B5CF6', '#10B981', '#FCD34D'],
  }[archetype];
  return {
    primary:   found[0] || defaults[0],
    accent:    found[1] || defaults[1],
    secondary: found[2] || defaults[2],
    eye:       '#FCD34D',
    nose:      '#1F2937',
    metal:     '#9CA3AF',
  };
}

/* ─────────────── Archetype builders ─────────────── */
/* Each builder returns an array of steps. Steps are ordered bottom-up so
   the 3D viewer's "newly placed" pulse always lights up something visible. */

function buildQuadruped(palette, opts) {
  const { primary, accent, secondary, eye, nose } = palette;
  // Some hash-driven variety so two different prompts that hit the same
  // archetype don't render identically.
  const seed = opts.seed % 4;
  const legW = 1; // stud
  const legGap = 1.6 + (seed % 2) * 0.4; // 1.6 or 2.0
  const bodyLen = 7 + (seed % 3); // 7..9
  const bodyW = 4 + (seed % 2); // 4..5

  return [
    {
      title: 'Place the Four Paws', emoji: '🐾',
      desc: `Put four ${colorWord(secondary)} paw tiles on the table in a rectangle.`,
      tip: 'Four paws form a square base — much steadier than three.',
      steamTag: 'math',
      newParts: [
        tile(-legGap, 0, -bodyLen / 2 + 1, 1.4, 1.4, secondary),
        tile( legGap, 0, -bodyLen / 2 + 1, 1.4, 1.4, secondary),
        tile(-legGap, 0,  bodyLen / 2 - 1, 1.4, 1.4, secondary),
        tile( legGap, 0,  bodyLen / 2 - 1, 1.4, 1.4, secondary),
      ],
    },
    {
      title: 'Stack the Lower Legs', emoji: '🦿',
      desc: `Add four short ${colorWord(secondary)} bricks on the paws — these are the knees.`,
      tip: 'Joints at the knees let real robots bend and balance.',
      steamTag: 'engineering',
      newParts: [
        brick(-legGap, P, -bodyLen / 2 + 1, legW, legW, secondary),
        brick( legGap, P, -bodyLen / 2 + 1, legW, legW, secondary),
        brick(-legGap, P,  bodyLen / 2 - 1, legW, legW, secondary),
        brick( legGap, P,  bodyLen / 2 - 1, legW, legW, secondary),
      ],
    },
    {
      title: 'Add the Upper Legs', emoji: '🦵',
      desc: `Stack four ${colorWord(primary)} bricks on the knees for the upper legs.`,
      tip: 'Two-segment legs work like levers and store energy when bent.',
      steamTag: 'engineering',
      newParts: [
        brick(-legGap, P + B, -bodyLen / 2 + 1, legW, legW, primary),
        brick( legGap, P + B, -bodyLen / 2 + 1, legW, legW, primary),
        brick(-legGap, P + B,  bodyLen / 2 - 1, legW, legW, primary),
        brick( legGap, P + B,  bodyLen / 2 - 1, legW, legW, primary),
      ],
    },
    {
      title: 'Build the Body', emoji: '🧱',
      desc: `Place a wide ${colorWord(accent)} plate on top of the four legs — that\u2019s the belly.`,
      tip: 'A flat belly spreads weight evenly so the robot stays balanced.',
      steamTag: 'engineering',
      newParts: [
        plate(0, P + 2 * B, 0, bodyW, bodyLen, accent),
        plate(0, P + 2 * B + P, 0, bodyW, bodyLen, primary),
      ],
    },
    {
      title: 'Add the Head', emoji: '🤖',
      desc: `Stack a ${colorWord(primary)} block on the front for the head, then add eyes.`,
      tip: 'Putting the head at one end gives the robot a clear "front."',
      steamTag: 'art',
      newParts: [
        brick(0, P + 2 * B + P + P, -bodyLen / 2 + 0.5, 2.5, 2, primary),
        cyl(-0.7, P + 2 * B + P + P + B, -bodyLen / 2 - 0.5, 0.18, 0.5, eye),
        cyl( 0.7, P + 2 * B + P + P + B, -bodyLen / 2 - 0.5, 0.18, 0.5, eye),
        cyl(0,    P + 2 * B + P + P + B - 0.4, -bodyLen / 2 - 1.0, 0.15, 0.4, nose),
      ],
    },
  ];
}

function buildBiped(palette, opts) {
  const { primary, accent, secondary, eye } = palette;
  const seed = opts.seed % 4;
  const legW = 1.2;
  const legGap = 1.0;
  const torsoH = 2.4 + (seed % 2) * 0.6;
  const torsoW = 3 + (seed % 2);

  return [
    {
      title: 'Lay the Two Feet', emoji: '🦶',
      desc: `Place two ${colorWord(secondary)} foot plates on the floor.`,
      tip: 'Wider feet make a stable base — try standing on tiptoes to see why.',
      steamTag: 'engineering',
      newParts: [
        plate(-legGap, 0, 0, 1.6, 2.0, secondary),
        plate( legGap, 0, 0, 1.6, 2.0, secondary),
      ],
    },
    {
      title: 'Stack the Lower Legs', emoji: '🦵',
      desc: `Stack ${colorWord(secondary)} bricks on each foot — these are the shins.`,
      tip: 'Bent legs are stronger than straight ones because they store energy.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(-legGap, P, 0, legW, legW, B * 1.5, secondary),
        tallBrick( legGap, P, 0, legW, legW, B * 1.5, secondary),
      ],
    },
    {
      title: 'Add the Upper Legs', emoji: '🦿',
      desc: `Place two ${colorWord(primary)} bricks for the thighs.`,
      tip: 'Two segments per leg make a hinge — the same idea as your knees.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(-legGap, P + B * 1.5, 0, legW, legW, B * 1.4, primary),
        tallBrick( legGap, P + B * 1.5, 0, legW, legW, B * 1.4, primary),
      ],
    },
    {
      title: 'Build the Torso', emoji: '🧱',
      desc: `Stack a wide ${colorWord(primary)} body block on the legs.`,
      tip: 'A wide torso gives room for the "robot heart" — its battery.',
      steamTag: 'technology',
      newParts: [
        tallBrick(0, P + B * 2.9, 0, torsoW, 2, torsoH, primary),
        plate(0, P + B * 2.9 + torsoH, 0, torsoW + 0.4, 2.4, accent),
      ],
    },
    {
      title: 'Attach the Arms', emoji: '💪',
      desc: `Add two ${colorWord(secondary)} arms hanging at the sides.`,
      tip: 'Arms swing as we walk to keep balance — robots copy this trick.',
      steamTag: 'science',
      newParts: [
        tallBrick(-(torsoW / 2 + 0.6), P + B * 2.9, 0, 0.9, 0.9, B * 2.2, secondary),
        tallBrick( (torsoW / 2 + 0.6), P + B * 2.9, 0, 0.9, 0.9, B * 2.2, secondary),
      ],
    },
    {
      title: 'Place the Head', emoji: '🤖',
      desc: `Stack a ${colorWord(primary)} cube head and add two glowing eyes.`,
      tip: 'Eyes on the front let the robot see where it\u2019s walking.',
      steamTag: 'technology',
      newParts: [
        tallBrick(0, P + B * 2.9 + torsoH + P, 0, 2, 2, 1.6, primary),
        cyl(-0.5, P + B * 2.9 + torsoH + P + 1.0, -1.0, 0.2, 0.4, eye),
        cyl( 0.5, P + B * 2.9 + torsoH + P + 1.0, -1.0, 0.2, 0.4, eye),
      ],
    },
  ];
}

function buildVehicle(palette, opts) {
  const { primary, accent, secondary, eye } = palette;
  const seed = opts.seed % 3;
  const wheelGap = 2.2;
  const length = 7 + seed; // 7..9
  const wheelTone = '#1F2937';

  return [
    {
      title: 'Snap the Wheels On', emoji: '🛞',
      desc: 'Place four wheels in a rectangle — the chassis sits on top.',
      tip: 'Round wheels roll smoothly because they touch the ground at one point only.',
      steamTag: 'science',
      newParts: [
        wheel(-wheelGap, -length / 2 + 1.2, wheelTone),
        wheel( wheelGap, -length / 2 + 1.2, wheelTone),
        wheel(-wheelGap,  length / 2 - 1.2, wheelTone),
        wheel( wheelGap,  length / 2 - 1.2, wheelTone),
      ],
    },
    {
      title: 'Build the Chassis', emoji: '🧱',
      desc: `Lay a long ${colorWord(secondary)} plate across the wheels.`,
      tip: 'A flat chassis gives every part a steady place to sit.',
      steamTag: 'engineering',
      newParts: [
        plate(0, 1.2, 0, wheelGap * 2 + 1, length, secondary),
      ],
    },
    {
      title: 'Stack the Body', emoji: '🚗',
      desc: `Add a ${colorWord(primary)} body block — this is where the driver sits.`,
      tip: 'Heavy parts go low so the car doesn\u2019t tip in turns.',
      steamTag: 'science',
      newParts: [
        brick(0, 1.2 + P, 0, wheelGap * 2 - 0.5, length - 1.2, primary),
      ],
    },
    {
      title: 'Add a Cockpit', emoji: '🪟',
      desc: `Stack a smaller ${colorWord(accent)} block for the driver\u2019s cabin.`,
      tip: 'A smaller top block reduces wind drag — that\u2019s aerodynamics!',
      steamTag: 'engineering',
      newParts: [
        tallBrick(0, 1.2 + P + B, 0.5, wheelGap * 2 - 1.6, length - 3, B * 1.3, accent),
        tile(0, 1.2 + P + B + B * 1.3, 0.5, wheelGap * 2 - 1.8, length - 3.2, primary),
      ],
    },
    {
      title: 'Add Headlights', emoji: '💡',
      desc: 'Stick two yellow round bricks at the very front — those are the headlights.',
      tip: 'Round lights spread their beam evenly. Cars usually use two for symmetry.',
      steamTag: 'art',
      newParts: [
        cyl(-1.2, 1.2 + P, -length / 2 + 0.3, 0.35, 0.6, eye),
        cyl( 1.2, 1.2 + P, -length / 2 + 0.3, 0.35, 0.6, eye),
      ],
    },
  ];
}

function buildSerpent(palette, opts) {
  const { primary, accent, eye, nose } = palette;
  const segCount = 5 + (opts.seed % 3); // 5..7
  const segW = 1.6;
  const steps = [];

  for (let i = 0; i < segCount; i++) {
    const z = i * segW * 0.85 - (segCount - 1) * segW * 0.85 / 2;
    const isHead = i === 0;
    const isTail = i === segCount - 1;
    const c = i % 2 === 0 ? primary : accent;
    if (isHead) {
      steps.push({
        title: 'Place the Head', emoji: '🐍',
        desc: `Place a ${colorWord(primary)} head block at one end with two tiny eyes.`,
        tip: 'A snake\u2019s head is wider than its body so it can swallow food whole.',
        steamTag: 'science',
        newParts: [
          tallBrick(0, 0, z, 2, 2, B * 1.2, primary),
          cyl(-0.55, B * 1.2 - 0.4, z - 0.6, 0.18, 0.4, eye),
          cyl( 0.55, B * 1.2 - 0.4, z - 0.6, 0.18, 0.4, eye),
          cyl(0,    B * 0.4, z - 1.0, 0.12, 0.3, nose),
        ],
      });
    } else if (isTail) {
      steps.push({
        title: `Add the Tail`, emoji: '🦎',
        desc: 'Add a small pointed tip for the tail.',
        tip: 'A tail helps a real snake balance and steer through grass.',
        steamTag: 'science',
        newParts: [cone(0, 0, z, 0.8, 1.2, c)],
      });
    } else {
      steps.push({
        title: `Body Segment ${i}`, emoji: '🟢',
        desc: `Stack another ${colorWord(c)} body segment behind the previous one.`,
        tip: 'Many small segments let the body curve into S-shapes.',
        steamTag: 'engineering',
        newParts: [tallBrick(0, 0, z, segW, segW, B, c)],
      });
    }
  }
  return steps;
}

function buildFlyer(palette, opts) {
  const { primary, accent, secondary, eye } = palette;
  const seed = opts.seed % 3;
  return [
    {
      title: 'Build the Body', emoji: '🛩️',
      desc: `Stack a long ${colorWord(primary)} body brick.`,
      tip: 'Long, narrow bodies cut through the air more easily.',
      steamTag: 'science',
      newParts: [
        tallBrick(0, 0, 0, 2, 6 + seed, B, primary),
      ],
    },
    {
      title: 'Attach the Wings', emoji: '🪽',
      desc: `Spread two wide ${colorWord(accent)} wing plates either side.`,
      tip: 'Curved wings make air rush faster on top — that lifts the flyer up.',
      steamTag: 'science',
      newParts: [
        plate(-3.2, B, 0, 4, 2.5, accent),
        plate( 3.2, B, 0, 4, 2.5, accent),
      ],
    },
    {
      title: 'Add a Tail Fin', emoji: '🪁',
      desc: `Place a small ${colorWord(secondary)} fin at the back.`,
      tip: 'The tail fin keeps the flyer pointed straight, like a feather on an arrow.',
      steamTag: 'engineering',
      newParts: [
        tallSlope(0, B, (6 + seed) / 2 - 0.6, 1.2, 1.6, B * 1.3, secondary),
      ],
    },
    {
      title: 'Build the Cockpit', emoji: '🪟',
      desc: `Add a small ${colorWord(accent)} dome on top for the cockpit.`,
      tip: 'A bubble cockpit lets the pilot see in every direction.',
      steamTag: 'technology',
      newParts: [
        tallBrick(0, B, -1.5, 1.6, 2.2, B, accent),
        cyl(0, 2 * B, -1.5, 0.8, B * 0.8, primary),
      ],
    },
    {
      title: 'Add Twin Eyes', emoji: '👀',
      desc: 'Place two glowing eyes on the front so it can see where it\u2019s flying.',
      tip: 'Two eyes give depth perception — handy when landing!',
      steamTag: 'technology',
      newParts: [
        cyl(-0.5, B * 0.6, -((6 + seed) / 2) - 0.2, 0.18, 0.4, eye),
        cyl( 0.5, B * 0.6, -((6 + seed) / 2) - 0.2, 0.18, 0.4, eye),
      ],
    },
  ];
}

function buildGiant(palette) {
  const { primary, accent, secondary, eye, nose } = palette;
  const legGap = 1.6;
  const bodyLen = 8;

  return [
    {
      title: 'Place the Big Feet', emoji: '🦶',
      desc: `Lay four ${colorWord(secondary)} foot plates in a wide rectangle.`,
      tip: 'Big animals need wide feet to spread their weight on the ground.',
      steamTag: 'science',
      newParts: [
        plate(-legGap, 0, -bodyLen / 2 + 1, 2, 2, secondary),
        plate( legGap, 0, -bodyLen / 2 + 1, 2, 2, secondary),
        plate(-legGap, 0,  bodyLen / 2 - 1, 2, 2, secondary),
        plate( legGap, 0,  bodyLen / 2 - 1, 2, 2, secondary),
      ],
    },
    {
      title: 'Stack the Thick Legs', emoji: '🦵',
      desc: `Stack four ${colorWord(primary)} pillar legs on the feet.`,
      tip: 'Thick, straight legs work like columns under a heavy roof.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(-legGap, P, -bodyLen / 2 + 1, 1.4, 1.4, B * 2.2, primary),
        tallBrick( legGap, P, -bodyLen / 2 + 1, 1.4, 1.4, B * 2.2, primary),
        tallBrick(-legGap, P,  bodyLen / 2 - 1, 1.4, 1.4, B * 2.2, primary),
        tallBrick( legGap, P,  bodyLen / 2 - 1, 1.4, 1.4, B * 2.2, primary),
      ],
    },
    {
      title: 'Build the Belly', emoji: '🧱',
      desc: `Place a long ${colorWord(accent)} belly across the four legs.`,
      tip: 'A long belly gives this creature room for big lungs and a long gut.',
      steamTag: 'science',
      newParts: [
        plate(0, P + B * 2.2, 0, 4, bodyLen, accent),
        plate(0, P + B * 2.2 + P, 0, 4, bodyLen, primary),
      ],
    },
    {
      title: 'Add the Long Neck', emoji: '🦒',
      desc: `Stack a ${colorWord(primary)} neck made of three blocks at the front.`,
      tip: 'A long neck reaches food up high and keeps eyes far from danger.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(0, P + B * 2.2 + P + P, -bodyLen / 2 + 0.8, 1.6, 1.6, B * 1.5, primary),
        tallBrick(0, P + B * 2.2 + P + P + B * 1.5, -bodyLen / 2 + 0.4, 1.4, 1.4, B * 1.3, primary),
        tallBrick(0, P + B * 2.2 + P + P + B * 2.8, -bodyLen / 2,       1.2, 1.2, B * 1.1, primary),
      ],
    },
    {
      title: 'Place the Roaring Head', emoji: '🦖',
      desc: `Add a wide ${colorWord(primary)} head with eyes and nose.`,
      tip: 'A bigger head means stronger jaws — perfect for chomping leaves or beasts.',
      steamTag: 'art',
      newParts: [
        tallBrick(0, P + B * 2.2 + P + P + B * 3.9, -bodyLen / 2 - 0.6, 2.4, 2.6, B * 1.2, primary),
        cyl(-0.7, P + B * 2.2 + P + P + B * 4.5, -bodyLen / 2 - 1.2, 0.22, 0.4, eye),
        cyl( 0.7, P + B * 2.2 + P + P + B * 4.5, -bodyLen / 2 - 1.2, 0.22, 0.4, eye),
        cyl(0,    P + B * 2.2 + P + P + B * 3.9 + 0.2, -bodyLen / 2 - 1.8, 0.18, 0.3, nose),
      ],
    },
    {
      title: 'Add a Long Tail', emoji: '🦕',
      desc: `Place a ${colorWord(accent)} tail tapering toward the back.`,
      tip: 'A heavy tail balances the long neck so the creature doesn\u2019t fall forward.',
      steamTag: 'math',
      newParts: [
        tallBrick(0, P + B * 2.2 + P, bodyLen / 2 + 0.4, 1.4, 2,   B,        accent),
        tallBrick(0, P + B * 2.2 + P, bodyLen / 2 + 2.2, 1,   1.6, B,        accent),
        cone(0,    P + B * 2.2 + P, bodyLen / 2 + 3.6, 0.5, B,                accent),
      ],
    },
  ];
}

function buildArachnid(palette) {
  const { primary, accent, eye } = palette;
  const legCount = 8;
  return [
    {
      title: 'Build the Body Pod', emoji: '🕷️',
      desc: `Lay a wide ${colorWord(primary)} body pod in the centre.`,
      tip: 'Spiders carry their organs in two big pods to stay light and quick.',
      steamTag: 'science',
      newParts: [
        cyl(0, 0, 0, 1.4, B, primary),
        cyl(0, B, 0, 1.6, B * 0.8, accent),
      ],
    },
    {
      title: 'Add Eight Eyes', emoji: '👀',
      desc: 'Place eight tiny eye studs on top of the body.',
      tip: 'Most spiders really do have eight eyes — to spot prey from any side.',
      steamTag: 'science',
      newParts: Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.7;
        return cyl(Math.cos(a) * r, B + B * 0.8, Math.sin(a) * r, 0.12, 0.25, eye);
      }),
    },
    {
      title: 'Attach the First Four Legs', emoji: '🦿',
      desc: `Stick four ${colorWord(accent)} legs on the front half.`,
      tip: 'Four legs lift one side; the other four push — that\u2019s how spiders glide.',
      steamTag: 'engineering',
      newParts: legRing(0, 0, accent, legCount, [0, 1, 2, 3]),
    },
    {
      title: 'Attach the Other Four Legs', emoji: '🦿',
      desc: `Stick four more ${colorWord(accent)} legs on the back half.`,
      tip: 'Eight legs let a spider climb almost any surface — even glass!',
      steamTag: 'engineering',
      newParts: legRing(0, 0, accent, legCount, [4, 5, 6, 7]),
    },
  ];
}

function legRing(cx, cz, color, count, indices) {
  const out = [];
  for (const i of indices) {
    const a = (i / count) * Math.PI * 2;
    const r = 1.6;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    out.push(tallBrick(x, 0, z, 0.5, 0.5, B * 1.2, color));
    // outer joint
    out.push(tallBrick(x * 1.6, 0, z * 1.6, 0.5, 0.5, B * 0.8, color));
  }
  return out;
}

function buildDragon(palette, opts) {
  const { primary, accent, secondary, eye, nose } = palette;
  const seed = opts.seed % 3;
  const bodyLen = 7 + seed;
  return [
    {
      title: 'Place the Four Claws', emoji: '🐾',
      desc: `Lay four ${colorWord(secondary)} claw plates in a rectangle.`,
      tip: 'Dragons in stories have four legs and two wings — six limbs in total!',
      steamTag: 'math',
      newParts: [
        plate(-1.6, 0, -bodyLen / 2 + 1, 1.6, 1.6, secondary),
        plate( 1.6, 0, -bodyLen / 2 + 1, 1.6, 1.6, secondary),
        plate(-1.6, 0,  bodyLen / 2 - 1, 1.6, 1.6, secondary),
        plate( 1.6, 0,  bodyLen / 2 - 1, 1.6, 1.6, secondary),
      ],
    },
    {
      title: 'Build the Strong Legs', emoji: '🦵',
      desc: `Stack four ${colorWord(primary)} legs on the claws.`,
      tip: 'Strong legs let a heavy dragon push off the ground for a flying start.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(-1.6, P, -bodyLen / 2 + 1, 1.2, 1.2, B * 1.6, primary),
        tallBrick( 1.6, P, -bodyLen / 2 + 1, 1.2, 1.2, B * 1.6, primary),
        tallBrick(-1.6, P,  bodyLen / 2 - 1, 1.2, 1.2, B * 1.6, primary),
        tallBrick( 1.6, P,  bodyLen / 2 - 1, 1.2, 1.2, B * 1.6, primary),
      ],
    },
    {
      title: 'Build the Body', emoji: '🧱',
      desc: `Place a long ${colorWord(accent)} body across the four legs.`,
      tip: 'A long body gives a dragon room for fire-making organs (in stories!).',
      steamTag: 'science',
      newParts: [
        tallBrick(0, P + B * 1.6, 0, 3, bodyLen, B * 1.2, accent),
        plate(0, P + B * 1.6 + B * 1.2, 0, 3.4, bodyLen, primary),
      ],
    },
    {
      title: 'Spread the Wings', emoji: '🪽',
      desc: `Spread two wide ${colorWord(secondary)} wings to the sides.`,
      tip: 'A dragon\u2019s wings need to be HUGE to lift such a heavy body.',
      steamTag: 'science',
      newParts: [
        tallBrick(-3.6, P + B * 1.6 + B * 1.2 + P, 0, 4, bodyLen - 1, P, secondary),
        tallBrick( 3.6, P + B * 1.6 + B * 1.2 + P, 0, 4, bodyLen - 1, P, secondary),
        // tip slopes
        tallSlope(-5.2, P + B * 1.6 + B * 1.2 + P, 0, 1.6, bodyLen - 1, P, secondary),
        tallSlope( 5.2, P + B * 1.6 + B * 1.2 + P, 0, 1.6, bodyLen - 1, P, secondary),
      ],
    },
    {
      title: 'Add the Spiked Head', emoji: '🐲',
      desc: `Stack a ${colorWord(primary)} head with two horns and glowing eyes.`,
      tip: 'Horns help dragons threaten enemies — they don\u2019t even need to fight.',
      steamTag: 'art',
      newParts: [
        tallBrick(0, P + B * 1.6 + B * 1.2 + P, -bodyLen / 2 - 0.4, 2.4, 2.4, B * 1.4, primary),
        cone(-0.8, P + B * 1.6 + B * 1.2 + P + B * 1.4, -bodyLen / 2 - 0.4, 0.35, B, accent),
        cone( 0.8, P + B * 1.6 + B * 1.2 + P + B * 1.4, -bodyLen / 2 - 0.4, 0.35, B, accent),
        cyl(-0.7, P + B * 1.6 + B * 1.2 + P + B * 0.7, -bodyLen / 2 - 1.0, 0.22, 0.45, eye),
        cyl( 0.7, P + B * 1.6 + B * 1.2 + P + B * 0.7, -bodyLen / 2 - 1.0, 0.22, 0.45, eye),
        cyl(0,    P + B * 1.6 + B * 1.2 + P + B * 0.3, -bodyLen / 2 - 1.6, 0.16, 0.3, nose),
      ],
    },
    {
      title: 'Add the Long Tail', emoji: '🦎',
      desc: `Place a tapering ${colorWord(accent)} tail at the back, ending in a point.`,
      tip: 'A long tail steers a flying dragon, like a rudder steers a boat.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(0, P + B * 1.6 + P, bodyLen / 2 + 0.6, 1.4, 1.6, B,    accent),
        tallBrick(0, P + B * 1.6 + P, bodyLen / 2 + 2.2, 1,   1.6, B,    accent),
        cone(0,    P + B * 1.6 + P, bodyLen / 2 + 3.6, 0.5, B,           accent),
      ],
    },
  ];
}

function buildMarine(palette, opts) {
  const { primary, accent, secondary, eye, nose } = palette;
  const seed = opts.seed % 3;
  const bodyLen = 6 + seed; // 6..8
  const bodyW = 2.4;
  const bodyH = 1.8;
  // Body sits on a low water-surface pedestal so it appears to float.
  const pedestalH = P;

  return [
    {
      title: 'Lay the Water Base', emoji: '🌊',
      desc: `Place a wide ${colorWord(secondary)} plate as the ocean floor.`,
      tip: 'Real aquarium robots have sensors in the floor to check the water is clean.',
      steamTag: 'science',
      newParts: [
        plate(0, 0, 0, 5, bodyLen + 2, secondary),
      ],
    },
    {
      title: 'Build the Belly', emoji: '🐟',
      desc: `Stack a smooth ${colorWord(primary)} belly on top of the water plate.`,
      tip: 'A rounded belly helps a fish slip through water with less drag.',
      steamTag: 'science',
      newParts: [
        tallBrick(0, pedestalH, 0, bodyW, bodyLen, bodyH * 0.55, primary),
      ],
    },
    {
      title: 'Add the Back', emoji: '🧱',
      desc: `Add a ${colorWord(accent)} back piece on top of the belly.`,
      tip: 'The darker back, lighter belly trick is called "countershading" — predators from above can\u2019t spot the fish.',
      steamTag: 'art',
      newParts: [
        tallBrick(0, pedestalH + bodyH * 0.55, 0, bodyW, bodyLen, bodyH * 0.45, accent),
      ],
    },
    {
      title: 'Attach the Tail Fin', emoji: '🪝',
      desc: `Place a ${colorWord(accent)} slope at the back for the tail fin.`,
      tip: 'The tail fin is the fish\u2019s motor — it pushes water backwards to go forwards.',
      steamTag: 'engineering',
      newParts: [
        tallSlope(0, pedestalH, bodyLen / 2 + 0.6, bodyW + 0.6, 1.6, bodyH, accent),
      ],
    },
    {
      title: 'Mount the Dorsal Fin', emoji: '🔺',
      desc: `Stick a pointy ${colorWord(accent)} fin on top of the back.`,
      tip: 'The dorsal fin keeps the fish upright so it doesn\u2019t roll sideways.',
      steamTag: 'engineering',
      newParts: [
        tallSlope(0, pedestalH + bodyH, -0.4, 0.8, 2.0, B, accent),
      ],
    },
    {
      title: 'Add Side Fins', emoji: '🦈',
      desc: `Add two ${colorWord(secondary)} side fins that let the fish steer.`,
      tip: 'Pectoral fins work like steering wheels — one goes up, the other goes down, to turn.',
      steamTag: 'engineering',
      newParts: [
        tallSlope(-(bodyW / 2 + 0.5), pedestalH + bodyH * 0.3, 0.4, 1.4, 1.6, P, secondary),
        tallSlope( (bodyW / 2 + 0.5), pedestalH + bodyH * 0.3, 0.4, 1.4, 1.6, P, secondary),
      ],
    },
    {
      title: 'Give It Big Eyes', emoji: '👀',
      desc: `Place two round ${colorWord(eye)} eyes on the front of the head.`,
      tip: 'Fish eyes on the sides give them a huge field of view — nearly all the way around.',
      steamTag: 'science',
      newParts: [
        cyl(-(bodyW / 2 - 0.1), pedestalH + bodyH * 0.7, -bodyLen / 2 - 0.05, 0.22, 0.35, eye),
        cyl( (bodyW / 2 - 0.1), pedestalH + bodyH * 0.7, -bodyLen / 2 - 0.05, 0.22, 0.35, eye),
        cyl(0, pedestalH + bodyH * 0.35, -bodyLen / 2 - 0.1, 0.12, 0.25, nose),
      ],
    },
  ];
}

const ARCHETYPE_BUILDERS = {
  quadruped: buildQuadruped,
  biped:     buildBiped,
  vehicle:   buildVehicle,
  marine:    buildMarine,
  serpent:   buildSerpent,
  flyer:     buildFlyer,
  giant:     buildGiant,
  arachnid:  buildArachnid,
  dragon:    buildDragon,
};

/* ─────────────── Optional features (composable) ─────────────── */

/**
 * Each feature returns a single new step (or null if the feature doesn't make
 * sense for the archetype). The step is appended after the base build, so the
 * 3D viewer's "newly placed" pulse highlights the addition.
 */
const FEATURE_STEP_BUILDERS = {
  wings(palette, /* opts */) {
    return {
      title: 'Spread the Wings', emoji: '🪽',
      desc: `Add two wide ${colorWord(palette.accent)} wings on the sides.`,
      tip: 'Wider wings mean more lift — that\u2019s how big birds glide for hours.',
      steamTag: 'science',
      newParts: [
        tallBrick(-3.4, B * 2.4, 0, 3.5, 3.0, P, palette.accent),
        tallBrick( 3.4, B * 2.4, 0, 3.5, 3.0, P, palette.accent),
      ],
    };
  },
  tail(palette /* , opts */) {
    return {
      title: 'Attach a Tail', emoji: '🦎',
      desc: `Add a ${colorWord(palette.accent)} tail tapering off at the back.`,
      tip: 'Tails help with balance — even kangaroos use theirs to lean back!',
      steamTag: 'engineering',
      newParts: [
        tallBrick(0, B, 4.0, 1.0, 1.4, B, palette.accent),
        tallBrick(0, B, 5.4, 0.8, 1.2, B, palette.accent),
        cone(0,    B, 6.8, 0.5, B,        palette.accent),
      ],
    };
  },
  horns(palette) {
    return {
      title: 'Add Sharp Horns', emoji: '🦄',
      desc: `Stick two ${colorWord(palette.secondary)} horns on top of the head.`,
      tip: 'Horns are made of keratin — the same stuff as your fingernails!',
      steamTag: 'science',
      newParts: [
        cone(-0.7, B * 4.5, -3, 0.3, B,  palette.secondary),
        cone( 0.7, B * 4.5, -3, 0.3, B,  palette.secondary),
      ],
    };
  },
  antenna(palette) {
    return {
      title: 'Add an Antenna', emoji: '📡',
      desc: `Place a ${colorWord(palette.metal)} antenna on top with a glowing tip.`,
      tip: 'Antennas catch radio waves — invisible signals bouncing through the air.',
      steamTag: 'technology',
      newParts: [
        cyl(0, B * 4.4, -3, 0.1, B * 1.2, palette.metal),
        cyl(0, B * 5.6, -3, 0.22, 0.3,    palette.eye),
      ],
    };
  },
  fangs() {
    return {
      title: 'Add Sharp Fangs', emoji: '🦷',
      desc: 'Place two pointy fangs hanging from the front of the head.',
      tip: 'Pointy teeth grip slippery food — exactly what wolves and sharks need.',
      steamTag: 'science',
      newParts: [
        cone(-0.45, B * 3.4, -3.2, 0.18, B * 0.6, '#F3F4F6'),
        cone( 0.45, B * 3.4, -3.2, 0.18, B * 0.6, '#F3F4F6'),
      ],
    };
  },
  spikes(palette) {
    const out = [];
    for (let i = -2; i <= 2; i++) {
      out.push(cone(0, B * 3.0 + P, i * 0.8, 0.25, B * 0.7, palette.secondary));
    }
    return {
      title: 'Add a Row of Spikes', emoji: '🟣',
      desc: `Stick five ${colorWord(palette.secondary)} spikes along the back.`,
      tip: 'Stegosaurus had real bony plates running down its back like this.',
      steamTag: 'science',
      newParts: out,
    };
  },
  crown() {
    return {
      title: 'Crown the Head', emoji: '👑',
      desc: 'Place a tiny gold crown on top of the head.',
      tip: 'Real crowns are heavy — sometimes over a kilogram of gold!',
      steamTag: 'art',
      newParts: [
        cyl(0, B * 4.2, -3, 0.7, P, '#FCD34D'),
        cone(-0.4, B * 4.2 + P, -3, 0.18, B * 0.5, '#FCD34D'),
        cone( 0,   B * 4.2 + P, -3, 0.18, B * 0.5, '#FCD34D'),
        cone( 0.4, B * 4.2 + P, -3, 0.18, B * 0.5, '#FCD34D'),
      ],
    };
  },
  shield(palette) {
    return {
      title: 'Strap on a Shield', emoji: '🛡️',
      desc: `Attach a wide ${colorWord(palette.metal)} shield on the front.`,
      tip: 'Knights\u2019 shields blocked arrows by spreading the hit over a wide area.',
      steamTag: 'engineering',
      newParts: [
        tallBrick(0, B * 1.8, -2.4, 2.4, P, B * 1.6, palette.metal),
      ],
    };
  },
  jetpack(palette) {
    return {
      title: 'Strap on a Jetpack', emoji: '🚀',
      desc: 'Stack two thruster cylinders on the back.',
      tip: 'Jet engines push hot air down so the rest of the rocket goes up.',
      steamTag: 'technology',
      newParts: [
        cyl(-0.8, B * 1.6, 1.0, 0.4, B * 1.4, palette.secondary),
        cyl( 0.8, B * 1.6, 1.0, 0.4, B * 1.4, palette.secondary),
        cyl(-0.8, B * 1.6 - B * 0.6, 1.0, 0.3, B * 0.5, '#F59E0B'),
        cyl( 0.8, B * 1.6 - B * 0.6, 1.0, 0.3, B * 0.5, '#F59E0B'),
      ],
    };
  },
  extraEyes(palette) {
    return {
      title: 'Add Extra Eyes', emoji: '👁️',
      desc: 'Stick two more glowing eyes higher up on the head.',
      tip: 'More eyes = wider field of view, just like flies have many lenses.',
      steamTag: 'science',
      newParts: [
        cyl(-0.5, B * 4.0, -3.0, 0.18, 0.35, palette.eye),
        cyl( 0.5, B * 4.0, -3.0, 0.18, 0.35, palette.eye),
      ],
    };
  },
};

/* ─────────────── Step decoration helpers ─────────────── */

function colorWord(hex) {
  // Map hex back to a friendly name for the step description copy.
  const back = {
    '#EF4444': 'red', '#DC2626': 'crimson', '#F59E0B': 'orange', '#FCD34D': 'yellow',
    '#84CC16': 'lime', '#10B981': 'green', '#14B8A6': 'teal', '#22D3EE': 'cyan',
    '#38BDF8': 'sky-blue', '#3B82F6': 'blue', '#1E3A8A': 'navy', '#6366F1': 'indigo',
    '#8B5CF6': 'purple', '#EC4899': 'magenta', '#F472B6': 'pink', '#F43F5E': 'rose',
    '#92400E': 'brown', '#D6A777': 'tan', '#F3F4F6': 'white', '#9CA3AF': 'silver',
    '#6B7280': 'gray', '#1F2937': 'black',
  };
  return back[hex] || 'colorful';
}

function annotatePieces(steps) {
  for (const step of steps) {
    if (step.pieces) continue;
    const counts = new Map();
    for (const p of step.newParts) {
      const key = `${p.color}|${p.type}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    step.pieces = Array.from(counts.entries()).map(([key, n]) => {
      const [color, type] = key.split('|');
      return { color, name: `${n}\u00d7 ${capitalize(type)}` };
    });
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function applyScale(steps, sx, sy, sz) {
  for (const step of steps) {
    for (const p of step.newParts) {
      p.pos  = [p.pos[0] * sx, p.pos[1] * sy, p.pos[2] * sz];
      p.size = [p.size[0] * sx, p.size[1] * sy, p.size[2] * sz];
    }
  }
}

function numberSteps(steps) {
  steps.forEach((s, i) => {
    s.num = i + 1;
    s.emoji ||= '🧱';
    s.tip ||= 'Keep building — every brick counts!';
    s.steamTag ||= 'engineering';
  });
}

/* ─────────────── Public API ─────────────── */

/**
 * Generate a full custom robot from a free-text description.
 * Always succeeds — picks an archetype, applies features, and produces a
 * fully-formed model object that the 3D viewer can render.
 */
export function buildProceduralRobot(description, photoAnalysis = null) {
  const text = (description || '').trim() || 'a friendly robot';
  // Photo hint: map the legacy preset id to one of our archetypes.
  const photoArchetype = {
    dog: 'quadruped', car: 'vehicle', dino: 'giant',
  }[photoAnalysis?.modelId];
  const archetype = photoArchetype || pickArchetype(text);
  const palette = buildPalette(text, archetype);
  const features = detectFeatures(text);
  const size = detectSize(text);
  const seed = Math.abs(hash(text + archetype));

  const builder = ARCHETYPE_BUILDERS[archetype] || ARCHETYPE_BUILDERS.quadruped;
  const steps = builder(palette, { seed });

  // Append optional features as new steps.
  for (const feature of features) {
    const fb = FEATURE_STEP_BUILDERS[feature];
    if (!fb) continue;
    const step = fb(palette, { seed });
    if (step) steps.push(step);
  }

  applyScale(steps, size.scaleX, size.scaleY, size.scaleZ);
  annotatePieces(steps);
  numberSteps(steps);

  const pieceCount = steps.reduce((n, s) => n + s.newParts.length, 0);
  return {
    id: `procedural-${Date.now()}`,
    name: makeName(text, archetype),
    emoji: pickEmoji(archetype, text),
    difficulty: 'Custom',
    pieceCount,
    color: palette.primary,
    description: photoAnalysis
      ? `A unique ${archetype} robot inspired by your photo — ${photoAnalysis.reason || 'one of a kind'}.`
      : `A one-of-a-kind ${archetype} robot built around your idea.`,
    steps,
    archetype,
    palette,
    features: Array.from(features),
    appliedScale: size,
  };
}

/**
 * Apply structural changes to an existing model in-place style: returns a
 * new model object. Used by the BuildScreen chat sidebar so commands like
 * "make it bigger", "add wings", "give it a tail" actually change the build
 * even when the AI is unavailable.
 *
 * Returns { model, changed, kind } where `changed` is the human-readable
 * summary for the chat reply, or null if nothing applied.
 */
export function applyChatModification(model, text) {
  const lower = text.toLowerCase();

  // Scale changes
  const sizeIntent = matchSizeIntent(lower);
  if (sizeIntent) {
    const clone = structuredClone(model);
    applyScale(clone.steps, sizeIntent.sx, sizeIntent.sy, sizeIntent.sz);
    clone.appliedScale = combineScale(clone.appliedScale, sizeIntent);
    return { model: clone, changed: sizeIntent.summary, kind: 'scale' };
  }

  // Add a feature
  const addMatch = lower.match(/\b(?:add|give\s+(?:it|me)|stick\s+on|put\s+on|attach)\b/);
  if (addMatch) {
    const features = featuresMentioned(lower);
    if (features.length) {
      const clone = structuredClone(model);
      const palette = clone.palette || derivePaletteFromModel(clone);
      const added = [];
      const newStepIndex = clone.steps.length;
      for (const f of features) {
        const fb = FEATURE_STEP_BUILDERS[f];
        if (!fb) continue;
        const step = fb(palette, { seed: hash(model.id + f) });
        annotatePieces([step]);
        clone.steps.push(step);
        added.push(f);
      }
      if (added.length) {
        numberSteps(clone.steps);
        clone.pieceCount = clone.steps.reduce((n, s) => n + s.newParts.length, 0);
        clone.features = [...new Set([...(clone.features || []), ...added])];
        return {
          model: clone,
          changed: `Added ${added.join(' and ')} as a new step`,
          kind: 'add-feature',
          // First newly-appended step index — caller (BuildScreen) jumps
          // currentStep here so the kid sees the change land immediately.
          newStepIndex,
        };
      }
    }
  }

  // Remove a feature
  const removeMatch = lower.match(/\b(?:remove|delete|drop|take\s+off|get\s+rid\s+of)\b/);
  if (removeMatch) {
    const features = featuresMentioned(lower);
    if (features.length) {
      const clone = structuredClone(model);
      const removed = [];
      for (const f of features) {
        // Strip every step that this feature builder originally produced
        // (matched by its title — feature steps have unique titles).
        const sample = FEATURE_STEP_BUILDERS[f]?.(clone.palette || derivePaletteFromModel(clone), { seed: 0 });
        if (!sample) continue;
        const before = clone.steps.length;
        clone.steps = clone.steps.filter((s) => s.title !== sample.title);
        if (clone.steps.length < before) removed.push(f);
      }
      if (removed.length) {
        numberSteps(clone.steps);
        clone.pieceCount = clone.steps.reduce((n, s) => n + s.newParts.length, 0);
        clone.features = (clone.features || []).filter((f) => !removed.includes(f));
        return {
          model: clone,
          changed: `Removed the ${removed.join(' and ')}`,
          kind: 'remove-feature',
        };
      }
    }
  }

  return null;
}

function combineScale(prev, intent) {
  const base = prev || { scaleX: 1, scaleY: 1, scaleZ: 1 };
  return {
    scaleX: base.scaleX * intent.sx,
    scaleY: base.scaleY * intent.sy,
    scaleZ: base.scaleZ * intent.sz,
  };
}

function matchSizeIntent(lower) {
  // Order matters: more specific axes win over generic "bigger".
  if (/\b(taller|higher)\b/.test(lower))             return { sx: 1, sy: 1.3,  sz: 1, summary: 'Stretched it taller' };
  if (/\b(shorter|squatter)\b/.test(lower))          return { sx: 1, sy: 0.75, sz: 1, summary: 'Made it shorter and squatter' };
  if (/\b(wider|fatter|chunkier)\b/.test(lower))     return { sx: 1.3, sy: 1, sz: 1.25, summary: 'Made it wider and chunkier' };
  if (/\b(thinner|skinnier|narrower)\b/.test(lower)) return { sx: 0.8, sy: 1, sz: 0.85, summary: 'Slimmed it down' };
  if (/\b(bigger|larger|huge|giant|grow|jumbo|mega)\b/.test(lower))
    return { sx: 1.25, sy: 1.25, sz: 1.25, summary: 'Scaled the whole robot up' };
  if (/\b(smaller|tiny|little|mini|baby|micro|shrink)\b/.test(lower))
    return { sx: 0.8, sy: 0.8, sz: 0.8, summary: 'Shrunk the whole robot down' };
  return null;
}

function featuresMentioned(lower) {
  const out = [];
  for (const [feature, keys] of Object.entries(FEATURE_KEYWORDS)) {
    if (keys.some((k) => lower.includes(k))) out.push(feature);
  }
  return out;
}

function derivePaletteFromModel(model) {
  // Best-effort palette reconstruction for models that came from the
  // hand-authored presets (no `palette` field). Sample the most-used colors.
  const counts = {};
  for (const step of model.steps) {
    for (const p of step.newParts || []) counts[p.color] = (counts[p.color] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  return {
    primary:   sorted[0] || model.color || '#3B82F6',
    accent:    sorted[1] || '#EF4444',
    secondary: sorted[2] || '#1F2937',
    eye:       '#FCD34D',
    nose:      '#1F2937',
    metal:     '#9CA3AF',
  };
}

/**
 * Detect intents handled by this module so the BuildScreen chat handler
 * knows when to call applyChatModification (vs falling through to plain Q&A).
 */
export function detectStructuralIntent(text) {
  const lower = text.toLowerCase();
  if (matchSizeIntent(lower)) return 'scale';
  if (/\b(?:add|give\s+(?:it|me)|stick\s+on|put\s+on|attach)\b/.test(lower) && featuresMentioned(lower).length)
    return 'add-feature';
  if (/\b(?:remove|delete|drop|take\s+off|get\s+rid\s+of)\b/.test(lower) && featuresMentioned(lower).length)
    return 'remove-feature';
  return null;
}
