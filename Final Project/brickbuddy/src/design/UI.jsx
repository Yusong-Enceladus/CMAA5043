/**
 * Shared UI primitives. Design tokens come from CSS variables in index.css.
 */

export function Btn({ variant = 'primary', size = 'md', icon, children, style, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    border: 'none', borderRadius: variant === 'ghost' ? 999 : 14,
    fontFamily: 'var(--sans)', fontWeight: 700, letterSpacing: '-0.005em',
    cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s, background 0.2s',
    whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '8px 14px',  fontSize: 13 },
    md: { padding: '12px 20px', fontSize: 15 },
    lg: { padding: '16px 28px', fontSize: 17 },
    xl: { padding: '20px 36px', fontSize: 19 },
  };
  const variants = {
    primary: { background: 'var(--ink)',          color: '#FFF6EC', boxShadow: '0 3px 0 var(--ink-2), 0 10px 24px rgba(26,20,16,0.2)' },
    brick:   { background: 'var(--brick-red)',    color: '#FFF',    boxShadow: '0 4px 0 var(--brick-red-d), 0 10px 26px rgba(225,79,59,0.3)' },
    orange:  { background: 'var(--brick-orange)', color: '#1A1410', boxShadow: '0 4px 0 #D97706, 0 10px 26px rgba(245,158,11,0.3)' },
    ghost:   { background: 'rgba(26,20,16,0.06)', color: 'var(--ink)' },
    outline: { background: 'transparent',         color: 'var(--ink)', border: '1.5px solid var(--rule-2)' },
    live:    { background: 'var(--live)',         color: '#FFF',    boxShadow: '0 3px 0 #1E4FC4, 0 10px 26px rgba(47,111,235,0.3)' },
  };
  return (
    <button
      {...rest}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; rest.onMouseDown?.(e); }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'translateY(0)';    rest.onMouseUp?.(e); }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';   rest.onMouseLeave?.(e); }}
    >
      {icon}{children}
    </button>
  );
}

export function Chip({ color = 'var(--ink)', bg = 'rgba(26,20,16,0.06)', children, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 999, background: bg, color,
      fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', ...style,
    }}>{children}</span>
  );
}

export function Card({ children, style, pad = 24 }) {
  return (
    <div style={{
      background: 'var(--card)', borderRadius: 22, padding: pad,
      border: '1px solid var(--rule)', boxShadow: 'var(--shadow-1)', ...style,
    }}>{children}</div>
  );
}

export function StepProgress({ total, current, compact = false }) {
  return (
    <div style={{ display: 'flex', gap: compact ? 3 : 4, alignItems: 'center', flex: 1 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: compact ? 4 : 6, borderRadius: 4,
          background: i < current ? 'var(--brick-red)'
                   : i === current ? 'var(--brick-orange)'
                   : 'rgba(26,20,16,0.1)',
          transition: 'background 0.3s',
          boxShadow: i === current ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
        }} />
      ))}
    </div>
  );
}

export function BrickLogo({ size = 30 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: size, height: size * 0.8, borderRadius: 6, background: 'var(--brick-red)',
        position: 'relative', boxShadow: '0 2px 0 var(--brick-red-d)',
      }}>
        <span style={{ position: 'absolute', top: -4, left: 4,  width: 6, height: 6, borderRadius: 6, background: 'var(--brick-red)', boxShadow: '0 -1px 0 var(--brick-red-d)' }} />
        <span style={{ position: 'absolute', top: -4, left: 14, width: 6, height: 6, borderRadius: 6, background: 'var(--brick-red)', boxShadow: '0 -1px 0 var(--brick-red-d)' }} />
      </span>
      <span className="serif" style={{ fontSize: size * 0.75, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
        Brick<span style={{ color: 'var(--brick-red)' }}>Buddy</span>
      </span>
    </span>
  );
}

export function TopBar({ children, onBack, progressLabel, right }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
      background: 'rgba(255,246,236,0.82)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--rule)', position: 'sticky', top: 0, zIndex: 30,
    }}>
      {onBack && (
        <button onClick={onBack} aria-label="Back" style={{
          width: 40, height: 40, borderRadius: 12, background: 'rgba(26,20,16,0.06)',
          display: 'grid', placeItems: 'center', fontSize: 18,
        }}>&larr;</button>
      )}
      <BrickLogo size={26} />
      <div style={{ flex: 1 }}>{children}</div>
      {progressLabel && (
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          {progressLabel}
        </span>
      )}
      {right}
    </header>
  );
}

export function Display({ children, size = 'lg', style }) {
  const sizes = { sm: 28, md: 40, lg: 56, xl: 76 };
  return (
    <h1 className="serif" style={{
      fontSize: sizes[size], lineHeight: 1.1, margin: 0,
      color: 'var(--ink)', letterSpacing: '-0.035em', ...style,
    }}>{children}</h1>
  );
}

export function Kicker({ children, color = 'var(--brick-red)' }) {
  return (
    <span className="mono" style={{
      fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
      color, fontWeight: 700,
    }}>{children}</span>
  );
}

export function PieceDot({ color, size = 14 }) {
  return (
    <span style={{
      width: size, height: size * 0.8, borderRadius: 3, background: color,
      border: '1px solid rgba(26,20,16,0.2)', display: 'inline-block',
      boxShadow: '0 1px 0 rgba(0,0,0,0.2)', position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
        width: size * 0.35, height: size * 0.35, borderRadius: 999, background: 'rgba(255,255,255,0.3)',
      }} />
    </span>
  );
}
