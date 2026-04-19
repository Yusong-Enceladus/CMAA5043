/**
 * SplashScreen — Redesigned welcome. Giant serif hero, Buddy mascot,
 * a "Let's Build" CTA, a resume pill if a previous session exists,
 * and decorative floating bricks.
 */
import { useBuild } from '../context/BuildContext';
import { playClick } from '../services/soundEffects';
import { loadSession } from '../services/storage';
import { BuddyFace } from '../design/Buddy';
import { Btn, Display, Kicker } from '../design/UI';

function FloatingBricks() {
  const bricks = [
    { color: 'var(--brick-red)',    t: 6,  l: 8,  r: -12, size: 58 },
    { color: 'var(--brick-orange)', t: 18,        r2: 8,  right: 10, size: 48 },
    { color: 'var(--brick-blue)',   t: 72, l: 14, r: -20, size: 52 },
    { color: 'var(--brick-yellow)', t: 80,        r2: 15, right: 16, size: 42 },
    { color: 'var(--brick-green)',  t: 30,        r2: 25, right: 4,  size: 36 },
    { color: 'var(--ink)',          t: 62, l: 6,  r: 14,  size: 30 },
  ];
  return (
    <>
      {bricks.map((b, i) => {
        const pos = b.l !== undefined ? { left: `${b.l}%` } : { right: `${b.right}%` };
        const rot = (b.r2 ?? b.r ?? 0);
        return (
          <div key={i} style={{
            position: 'absolute', top: `${b.t}%`, ...pos,
            width: b.size, height: b.size * 0.7, borderRadius: 7,
            background: b.color,
            transform: `rotate(${rot}deg)`,
            boxShadow: '0 6px 0 rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.08)',
            opacity: 0.85, pointerEvents: 'none',
            animation: `floatY ${6 + i}s ease-in-out ${i * 0.3}s infinite`,
          }}>
            <span style={{ position: 'absolute', top: -5, left: '25%',  width: 8, height: 8, borderRadius: 999, background: b.color, boxShadow: '0 -1px 0 rgba(0,0,0,0.2)' }} />
            <span style={{ position: 'absolute', top: -5, right: '25%', width: 8, height: 8, borderRadius: 999, background: b.color, boxShadow: '0 -1px 0 rgba(0,0,0,0.2)' }} />
          </div>
        );
      })}
    </>
  );
}

function FeatureStrip() {
  const items = [
    { icon: '\u{1F399}\uFE0F', label: 'Talk anytime' },
    { icon: '\u{1F440}',       label: 'Watches your build' },
    { icon: '\u{1F9F1}',       label: 'Any robot you imagine' },
    { icon: '\u{1F9E0}',       label: 'Teaches as you go' },
  ];
  return (
    <div style={{
      marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--rule)', borderRadius: 999,
          padding: '8px 14px', display: 'inline-flex', gap: 8, alignItems: 'center',
          fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
        }}>
          <span style={{ fontSize: 15 }}>{it.icon}</span>{it.label}
        </div>
      ))}
    </div>
  );
}

export default function SplashScreen() {
  const { setStage, soundEnabled } = useBuild();

  const savedSession = loadSession();
  const hasSession = savedSession && savedSession.stage !== 'splash' && savedSession.selectedModelId;

  const handleStart = () => {
    if (soundEnabled) playClick();
    setStage('imagine');
  };

  return (
    <div
      className="bb-screen"
      role="main"
      aria-label="BrickBuddy welcome screen"
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 10%, #FFE0CC 0%, #FFF6EC 55%), var(--paper)',
        display: 'grid', placeItems: 'center', padding: '48px 24px',
      }}
    >
      <FloatingBricks />

      <div style={{
        position: 'relative', zIndex: 2, maxWidth: 760, textAlign: 'center',
        display: 'grid', gap: 28, justifyItems: 'center',
        animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        <div style={{ marginBottom: -12 }}>
          <BuddyFace size={128} state="idle" mood="happy" />
        </div>
        <Kicker>Build anything · for ages 6&ndash;8</Kicker>
        <Display size="xl" style={{ maxWidth: 680 }}>
          Say it.<br />
          <span style={{ color: 'var(--brick-red)' }}>Build it.</span>{' '}
          <span style={{ color: 'var(--brick-orange)' }}>Together.</span>
        </Display>
        <p style={{
          fontSize: 20, lineHeight: 1.5, color: 'var(--ink-3)',
          margin: 0, maxWidth: 560,
        }}>
          Tell Buddy what you want to build. It watches, listens, and walks you through
          every brick &mdash; one step at a time.
        </p>

        <Btn variant="brick" size="xl" onClick={handleStart}
          icon={<span style={{ fontSize: 24 }}>&#x1F680;</span>}
          aria-label="Start building">
          Let&apos;s Build
        </Btn>

        {hasSession && (
          <button onClick={handleStart} style={{
            marginTop: 4, padding: '10px 16px', borderRadius: 999,
            background: 'rgba(15,153,104,0.12)', color: 'var(--ok)',
            fontSize: 14, fontWeight: 700, display: 'inline-flex', gap: 8, alignItems: 'center',
          }}>
            <span>&#x2713;</span> Continue your last build
          </button>
        )}

        <FeatureStrip />
      </div>

      <footer style={{
        position: 'absolute', bottom: 18, left: 0, right: 0,
        textAlign: 'center', color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--mono)',
        letterSpacing: '0.1em',
      }}>
        BRICKBUDDY &middot; VOICE + VISION COMPANION
      </footer>
    </div>
  );
}
