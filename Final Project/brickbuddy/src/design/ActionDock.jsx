/**
 * ActionDock — the bottom action bar on the Build screen.
 *
 * Replaces the chat input. Three primary inputs: Voice, Photo, Tap-to-Edit
 * (a toggle that puts the 3D viewer into "select a brick" mode). Step nav
 * (back / next) flanks the dock so the kid can move through the build
 * without leaving the bar.
 */

export default function ActionDock({
  // Step navigation
  onBack, onNext, isFirstStep, isLastStep,
  // Voice
  onVoiceDown, onVoiceUp, voiceActive, voiceTranscript, voiceSupported,
  // Photo
  onPhoto, photoActive,
  // Tap-to-edit toggle
  onToggleTap, tapActive,
}) {
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px',
      background: 'linear-gradient(180deg, rgba(255,246,236,0.0) 0%, rgba(255,246,236,0.85) 30%, rgba(255,246,236,0.95) 100%)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--rule)',
    }}>
      {/* Back step */}
      <NavButton onClick={onBack} disabled={isFirstStep} label="Previous step">
        <span style={{ fontSize: 18 }}>←</span>
      </NavButton>

      <div style={{ flex: 1 }} />

      {/* Live transcript ribbon when voice is active */}
      {voiceActive && (
        <div style={{
          position: 'absolute', bottom: 78, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 16px', borderRadius: 14,
          background: 'var(--live)', color: '#FFF',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(47,111,235,0.35)',
          minWidth: 240, maxWidth: 480, textAlign: 'center',
          fontFamily: 'var(--serif)', letterSpacing: '-0.005em',
          animation: 'bubbleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'none',
        }}>
          🎤 {voiceTranscript || 'Listening…'}
          <span style={{ animation: 'fadeIn 0.5s infinite alternate', marginLeft: 4 }}>|</span>
        </div>
      )}

      {/* Center cluster: voice (primary), photo, tap-to-edit */}
      <DockChip
        kind="voice"
        active={voiceActive}
        disabled={!voiceSupported}
        onMouseDown={onVoiceDown}
        onMouseUp={onVoiceUp}
        onMouseLeave={voiceActive ? onVoiceUp : undefined}
        onTouchStart={(e) => { e.preventDefault(); onVoiceDown(); }}
        onTouchEnd={onVoiceUp}
        title={voiceSupported ? 'Hold to talk' : 'Voice unsupported in this browser'}
      >
        <span style={{ fontSize: 22 }}>🎤</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {voiceActive ? 'Listening…' : 'Hold to Talk'}
        </span>
      </DockChip>

      <DockChip
        kind="photo"
        active={photoActive}
        onClick={onPhoto}
        title="Show Buddy a photo"
      >
        <span style={{ fontSize: 20 }}>📷</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Show Buddy</span>
      </DockChip>

      <DockChip
        kind="tap"
        active={tapActive}
        onClick={onToggleTap}
        title={tapActive ? 'Exit tap-to-edit mode' : 'Tap a brick on the model to edit it'}
      >
        <span style={{ fontSize: 20 }}>✋</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {tapActive ? 'Tap a Brick…' : 'Tap to Edit'}
        </span>
      </DockChip>

      <div style={{ flex: 1 }} />

      {/* Next step */}
      <NavButton onClick={onNext} primary label={isLastStep ? 'Finish build' : 'Next step'}>
        {isLastStep ? '🎉 Finish' : <>Next <span style={{ fontSize: 18 }}>→</span></>}
      </NavButton>
    </div>
  );
}

function NavButton({ children, onClick, disabled, primary, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 18px', borderRadius: 14, fontSize: 14, fontWeight: 700,
        background: disabled ? 'rgba(26,20,16,0.05)' : primary ? 'var(--ink)' : 'var(--card)',
        color: disabled ? 'var(--ink-4)' : primary ? '#FFF6EC' : 'var(--ink-2)',
        border: primary || disabled ? 'none' : '1px solid var(--rule)',
        boxShadow: primary && !disabled ? '0 3px 0 var(--ink-2), 0 8px 20px rgba(26,20,16,0.18)'
                  : disabled ? 'none' : 'var(--shadow-1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.12s, box-shadow 0.18s',
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(2px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
    </button>
  );
}

function DockChip({ kind, active, disabled, children, ...rest }) {
  const palette = CHIP_PALETTE[kind] || CHIP_PALETTE.voice;
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', borderRadius: 999,
        background: active ? palette.activeBg : palette.idleBg,
        color: active ? palette.activeFg : palette.idleFg,
        border: `1.5px solid ${active ? palette.activeBorder : palette.idleBorder}`,
        boxShadow: active ? palette.activeShadow : palette.idleShadow,
        fontFamily: 'var(--sans)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'transform 0.12s, box-shadow 0.18s, background 0.18s',
        animation: active && kind === 'voice' ? 'ringPulse 1.4s ease-out infinite' : 'none',
      }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
    </button>
  );
}

const CHIP_PALETTE = {
  voice: {
    idleBg:      'var(--card)',  idleFg:      'var(--ink)',
    idleBorder:  'rgba(225,79,59,0.4)',
    idleShadow:  '0 3px 0 rgba(225,79,59,0.25), 0 8px 18px rgba(225,79,59,0.12)',
    activeBg:    'var(--live)',  activeFg:    '#FFF',
    activeBorder:'var(--live)',
    activeShadow:'0 0 0 6px rgba(47,111,235,0.18), 0 6px 18px rgba(47,111,235,0.4)',
  },
  photo: {
    idleBg:      'var(--card)',  idleFg:      'var(--ink)',
    idleBorder:  'rgba(59,130,246,0.4)',
    idleShadow:  '0 3px 0 rgba(59,130,246,0.25), 0 8px 18px rgba(59,130,246,0.12)',
    activeBg:    'var(--brick-blue)', activeFg: '#FFF',
    activeBorder:'var(--brick-blue)',
    activeShadow:'0 0 0 6px rgba(59,130,246,0.18), 0 6px 18px rgba(59,130,246,0.4)',
  },
  tap: {
    idleBg:      'var(--card)',  idleFg:      'var(--ink)',
    idleBorder:  'rgba(245,158,11,0.45)',
    idleShadow:  '0 3px 0 rgba(245,158,11,0.25), 0 8px 18px rgba(245,158,11,0.12)',
    activeBg:    'var(--brick-orange)', activeFg: '#1A1410',
    activeBorder:'var(--brick-orange)',
    activeShadow:'0 0 0 6px rgba(245,158,11,0.22), 0 6px 18px rgba(245,158,11,0.4)',
  },
};
