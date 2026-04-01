/**
 * SoundEffects — Web Audio API sound effects for BrickBuddy.
 * Generates simple tones/chimes without external audio files.
 * All sounds are child-friendly: soft, pleasant, non-startling.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/** Play a simple tone */
function playTone(frequency, duration = 0.15, volume = 0.12, type = 'sine') {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail — sound effects are non-critical
  }
}

/** Soft click — for button presses and navigation */
export function playClick() {
  playTone(800, 0.06, 0.08);
}

/** Step complete — two-note ascending chime */
export function playStepComplete() {
  playTone(523, 0.12, 0.1); // C5
  setTimeout(() => playTone(659, 0.15, 0.1), 100); // E5
}

/** Success — three-note ascending chord */
export function playSuccess() {
  playTone(523, 0.2, 0.1);  // C5
  setTimeout(() => playTone(659, 0.2, 0.1), 120);  // E5
  setTimeout(() => playTone(784, 0.3, 0.12), 240);  // G5
}

/** Celebration fanfare — four ascending notes */
export function playCelebration() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 0.1), i * 150);
  });
}

/** Chat message received — soft notification */
export function playChatReceive() {
  playTone(880, 0.08, 0.06, 'triangle');
}

/** Error/warning — gentle low tone */
export function playWarning() {
  playTone(330, 0.2, 0.08, 'triangle');
}
