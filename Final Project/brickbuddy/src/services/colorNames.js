/**
 * colorNames — single source of truth for hex → human color name mapping
 * across the app. Used by:
 *   - mutationEngine.describeColor (for log entries: "from orange to blue")
 *   - localRobotGen.recolorFromText (for rewriting step text + piece names)
 *
 * Why one file? The hand-authored models in data/models.js and the procedural
 * builder use slightly different hexes for "the same" color (e.g. #1F2937
 * vs #111827 are both "black"). Having one comprehensive map prevents the
 * manual from showing "colorful brick" when a recolor lands on a hex that
 * happens to live only in models.js.
 */

const COLOR_NAMES = {
  '#EF4444': 'red',     '#DC2626': 'crimson', '#E14F3B': 'red',
  '#B2392A': 'red',     '#7F1D1D': 'dark red',
  '#F59E0B': 'orange',  '#D97706': 'orange',  '#FBBF24': 'yellow',
  '#FCD34D': 'gold',
  '#84CC16': 'lime',    '#10B981': 'green',   '#34D399': 'mint',
  '#059669': 'green',   '#047857': 'green',   '#14B8A6': 'teal',
  '#22D3EE': 'cyan',    '#38BDF8': 'sky',     '#3B82F6': 'blue',
  '#1E4FC4': 'blue',    '#1E3A8A': 'navy',    '#6366F1': 'indigo',
  '#8B5CF6': 'purple',  '#EC4899': 'magenta', '#F472B6': 'pink',
  '#F43F5E': 'rose',    '#92400E': 'brown',   '#D6A777': 'tan',
  '#F3F4F6': 'white',   '#FFFFFF': 'white',   '#FFF6EC': 'cream',
  '#9CA3AF': 'silver',  '#D1D5DB': 'silver',
  '#6B7280': 'gray',    '#4B5563': 'dark gray',
  '#374151': 'dark gray',
  '#1F2937': 'black',   '#111827': 'black',   '#000000': 'black',
  '#0B0F18': 'black',
};

/** Get a human-readable name for a hex color. Falls back to "a custom color". */
export function describeColor(hex) {
  if (!hex) return 'a color';
  return (
    COLOR_NAMES[hex] ||
    COLOR_NAMES[hex.toUpperCase?.()] ||
    COLOR_NAMES[hex.toLowerCase?.()] ||
    'a custom color'
  );
}

/**
 * Rewrite color words inside arbitrary text (HTML or plain). Replaces every
 * occurrence of the keys in `nameMap` with their values, preserving leading
 * capitalization (e.g. "Orange" → "Blue", "orange" → "blue"). Multi-word
 * keys like "dark gray" are matched first so they win against the shorter
 * "gray".
 */
export function rewriteColorWords(text, nameMap) {
  if (!text || !nameMap) return text;
  let result = text;
  // Sort keys longest-first so multi-word names like "dark gray" win.
  const keys = Object.keys(nameMap).sort((a, b) => b.length - a.length);
  for (const oldName of keys) {
    const newName = nameMap[oldName];
    if (!newName || oldName === newName) continue;
    const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(re, (match) => preserveCase(match, newName));
  }
  return result;
}

function preserveCase(original, replacement) {
  // Single capital ("Black" → "Blue")
  if (/^[A-Z][a-z]/.test(original)) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  // ALL CAPS ("BLACK" → "BLUE")
  if (/^[A-Z]+$/.test(original)) {
    return replacement.toUpperCase();
  }
  return replacement;
}
