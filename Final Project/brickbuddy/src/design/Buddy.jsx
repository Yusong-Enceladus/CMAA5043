/**
 * Buddy — the animated mascot that lives in every screen.
 * States: idle | listening | thinking | speaking | watching | celebrating | concerned
 * Renders as a blocky, brick-built character with an antenna + face plate.
 */

const STEAM_TAGS = {
  science:     { label: 'Science',     icon: '\u{1F52C}', bg: '#E0F2FE', fg: '#075985' },
  technology:  { label: 'Technology',  icon: '\u{1F4BB}', bg: '#EDE9FE', fg: '#5B21B6' },
  engineering: { label: 'Engineering', icon: '\u2699\uFE0F', bg: '#FEF3C7', fg: '#92400E' },
  art:         { label: 'Art',         icon: '\u{1F3A8}', bg: '#FCE7F3', fg: '#9D174D' },
  math:        { label: 'Math',        icon: '\u{1F522}', bg: '#DCFCE7', fg: '#166534' },
};

function ringStyle(color, delay) {
  return {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: `2px solid ${color}`, pointerEvents: 'none',
    animation: `pulseRing 1.6s ${delay}s ease-out infinite`,
  };
}

export function BuddyFace({ state = 'idle', size = 96, mood = 'happy' }) {
  const isListening   = state === 'listening';
  const isThinking    = state === 'thinking';
  const isWatching    = state === 'watching';
  const isSpeaking    = state === 'speaking';
  const isConcerned   = state === 'concerned';
  const isCelebrating = state === 'celebrating';

  const eyeShape = (cx) => {
    if (isListening) return <circle cx={cx} cy="38" r="4.2" fill="#1A1410" />;
    if (isThinking)  return <circle cx={cx} cy="36" r="3.4" fill="#1A1410" />;
    if (isConcerned) return <path d={`M ${cx - 4} 40 Q ${cx} 36 ${cx + 4} 40`} stroke="#1A1410" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    if (isCelebrating) return <path d={`M ${cx - 4} 38 L ${cx - 1} 34 L ${cx + 1} 34 L ${cx + 4} 38 L ${cx + 1} 42 L ${cx - 1} 42 Z`} fill="#1A1410" />;
    return <ellipse cx={cx} cy="38" rx="3.5" ry="4" fill="#1A1410" style={{ transformOrigin: `${cx}px 38px`, animation: 'blink 5s infinite' }} />;
  };

  const mouth = isSpeaking
    ? <rect x="36" y="52" width="16" height="6" rx="3" fill="#1A1410" />
    : isConcerned
      ? <path d="M 36 56 Q 44 50 52 56" stroke="#1A1410" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      : <path d="M 36 52 Q 44 60 52 52" stroke="#1A1410" strokeWidth="2.4" fill="none" strokeLinecap="round" />;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
      {isListening && (
        <>
          <span style={ringStyle('#2F6FEB', 0)} />
          <span style={ringStyle('#2F6FEB', 0.6)} />
        </>
      )}
      {isWatching && <span style={ringStyle('#E14F3B', 0)} />}
      <svg viewBox="0 0 88 88" width={size} height={size} style={{
        filter: 'drop-shadow(0 8px 14px rgba(26,20,16,0.18))',
        animation: isThinking ? 'floatY 1.8s ease-in-out infinite' : 'floatY 3.2s ease-in-out infinite',
      }}>
        {/* Antenna */}
        <line x1="44" y1="12" x2="44" y2="4" stroke="#3A2C21" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="44" cy="4" r="3" fill={isListening ? '#2F6FEB' : isThinking ? '#8357E6' : '#E14F3B'}>
          {(isListening || isThinking) && (
            <animate attributeName="r" values="2.6;3.6;2.6" dur="1.1s" repeatCount="indefinite" />
          )}
        </circle>
        {/* Head / brick body */}
        <rect x="12" y="14" width="64" height="54" rx="10" fill="#F59E0B" />
        <rect x="12" y="14" width="64" height="8" rx="8" fill="#FBBF24" />
        <circle cx="24" cy="18" r="3" fill="#FBBF24" stroke="#D97706" strokeWidth="0.5" />
        <circle cx="44" cy="18" r="3" fill="#FBBF24" stroke="#D97706" strokeWidth="0.5" />
        <circle cx="64" cy="18" r="3" fill="#FBBF24" stroke="#D97706" strokeWidth="0.5" />
        <rect x="22" y="28" width="44" height="30" rx="6" fill="#FFF6EC" />
        {eyeShape(34)}
        {eyeShape(54)}
        {(mood === 'happy' || isCelebrating) && (
          <>
            <circle cx="28" cy="50" r="2.4" fill="#E14F3B" opacity="0.35" />
            <circle cx="60" cy="50" r="2.4" fill="#E14F3B" opacity="0.35" />
          </>
        )}
        {mouth}
        <rect x="30" y="66" width="28" height="8" rx="3" fill="#E14F3B" />
        <circle cx="36" cy="70" r="1.6" fill="#B2392A" />
        <circle cx="52" cy="70" r="1.6" fill="#B2392A" />
      </svg>
    </div>
  );
}

export function TypingDots({ color = '#2F6FEB' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: 6, background: color,
          animation: 'floatY 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </span>
  );
}

export function VoiceWave({ active = true, color = '#2F6FEB', bars = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 36 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 4, background: color,
          height: active ? `${10 + Math.abs(Math.sin(i * 0.7)) * 22}px` : '6px',
          animation: active ? `voiceBar-${i % 4} 0.9s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

export function BuddyBubble({ children, tone = 'neutral', tag, compact = false }) {
  const bg     = tone === 'concern' ? '#FFF0E6' : tone === 'celebrate' ? '#E6F9F0' : '#FFFFFF';
  const border = tone === 'concern' ? '#E0701B' : tone === 'celebrate' ? '#0F9968' : 'rgba(26,20,16,0.08)';
  return (
    <div style={{
      background: bg, borderRadius: 18, padding: compact ? '10px 14px' : '14px 18px',
      border: `1px solid ${border}`, boxShadow: 'var(--shadow-1)',
      color: 'var(--ink)', fontSize: compact ? 14 : 16, lineHeight: 1.45,
      maxWidth: 420, position: 'relative',
    }}>
      {children}
      {tag && <SteamTag tag={tag} />}
    </div>
  );
}

export function SteamTag({ tag }) {
  const t = STEAM_TAGS[tag];
  if (!t) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999, marginTop: 8,
      background: t.bg, color: t.fg, fontSize: 12, fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      <span>{t.icon}</span>{t.label}
    </span>
  );
}

export { STEAM_TAGS };
