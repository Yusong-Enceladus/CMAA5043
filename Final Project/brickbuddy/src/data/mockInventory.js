/**
 * mockInventory — the curated "scattered pile" the camera/voice scan returns.
 *
 * In the polished demo we don't actually classify a real photo into bricks
 * (computer-vision is brittle and the real value is the magic moment, not
 * the accuracy). So the Discover→Inventory flow always returns this fixed
 * pile and a set of recommendations matched to it. Everything is hand-tuned
 * to feel rich and varied without overwhelming a 6–8 year old.
 */

/* Visual palette mirrors the design tokens in index.css so the swatches in
   the inventory match the bricks rendered in the 3D scenes. */
export const MOCK_INVENTORY = {
  scannedAt: null, // filled in at scan time
  total: 67,       // sum of counts; also rendered as a hero number
  bricks: [
    { id: 'red-2x2',   name: 'Red 2×2 brick',     color: '#E14F3B', shape: 'brick',  count: 12, accent: '#B2392A' },
    { id: 'blue-1x4',  name: 'Blue 1×4 plate',    color: '#3B82F6', shape: 'plate',  count: 18, accent: '#1E4FC4' },
    { id: 'yellow-2x4',name: 'Yellow 2×4 brick',  color: '#FBBF24', shape: 'brick',  count: 8,  accent: '#D97706' },
    { id: 'green-1x2', name: 'Green 1×2 brick',   color: '#10B981', shape: 'brick',  count: 14, accent: '#047857' },
    { id: 'orange-slope', name: 'Orange slope',   color: '#F59E0B', shape: 'slope',  count: 4,  accent: '#D97706' },
    { id: 'wheel',     name: 'Black wheel',       color: '#1F2937', shape: 'wheel',  count: 6,  accent: '#0B0F18' },
    { id: 'white-eye', name: 'White round tile',  color: '#F3F4F6', shape: 'tile',   count: 3,  accent: '#9CA3AF' },
    { id: 'antenna',   name: 'Antenna piece',     color: '#6B7280', shape: 'antenna',count: 1,  accent: '#1F2937' },
    { id: 'turntable', name: 'Turntable',         color: '#FCD34D', shape: 'disk',   count: 1,  accent: '#D97706' },
  ],
};

/**
 * Pre-curated recommendations matched to the inventory above. Each one cites
 * specific bricks ("your 18 blue plates") so the output feels personalized.
 * `modelId` matches the registered presets in data/models.js.
 */
export const MOCK_RECOMMENDATIONS = [
  {
    modelId: 'dog',
    title: 'Robot Dog',
    emoji: '🐶',
    pieceCount: 56,
    difficulty: 'Easy',
    matchPct: 94,
    accent: '#F59E0B',
    why: 'Your reds and oranges are perfect for a friendly puppy.',
    citations: ['12× red 2×2', '4× orange slopes', '3× white tiles for eyes'],
  },
  {
    modelId: 'car',
    title: 'Robot Car',
    emoji: '🏎️',
    pieceCount: 48,
    difficulty: 'Easy',
    matchPct: 91,
    accent: '#3B82F6',
    why: 'Those 6 wheels and 18 blue plates are begging for a racer.',
    citations: ['18× blue 1×4 plates', '6× wheels', '1× turntable for radar'],
  },
  {
    modelId: 'dino',
    title: 'Dino Bot',
    emoji: '🦖',
    pieceCount: 64,
    difficulty: 'Medium',
    matchPct: 88,
    accent: '#10B981',
    why: 'Your green bricks are screaming "T-Rex"!',
    citations: ['14× green 1×2', '8× yellow for spikes', '4× slopes for the neck'],
  },
];

/** Default scan delay used by the Inventory screen for the magical reveal. */
export const SCAN_DURATION_MS = 2400;
