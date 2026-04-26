/**
 * BrickEditMenu — small floating popover that opens when the kid taps a brick
 * on the 3D viewer in tap-to-edit mode. Offers two actions: Recolor (color
 * swatch grid) and Remove. Designed to sit relative to the click point so it
 * reads as "this brick" rather than a global menu.
 */
import { useState } from 'react';

const SWATCHES = [
  { hex: '#E14F3B', name: 'Red'    },
  { hex: '#F59E0B', name: 'Orange' },
  { hex: '#FBBF24', name: 'Yellow' },
  { hex: '#10B981', name: 'Green'  },
  { hex: '#3B82F6', name: 'Blue'   },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#F472B6', name: 'Pink'   },
  { hex: '#1F2937', name: 'Black'  },
  { hex: '#F3F4F6', name: 'White'  },
];

export default function BrickEditMenu({ position, brick, onRecolor, onRemove, onClose }) {
  const [view, setView] = useState('main'); // main | colors
  if (!position || !brick) return null;

  const x = clamp(position.x, 130, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 140);
  const y = clamp(position.y, 80, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'transparent', zIndex: 49,
      }} />
      <div
        role="dialog"
        aria-label="Edit brick"
        style={{
          position: 'fixed', left: x - 130, top: y + 12, width: 260, zIndex: 50,
          padding: 14, borderRadius: 18,
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          boxShadow: '0 18px 44px rgba(26,20,16,0.22)',
          animation: 'bubbleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: 6, background: brick.color,
            border: '1.5px solid rgba(0,0,0,0.15)', boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{
              fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', fontWeight: 700,
            }}>EDIT BRICK</div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{brick.label || `${brick.type || 'brick'}`}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 26, height: 26, borderRadius: 8, background: 'rgba(26,20,16,0.06)',
            color: 'var(--ink-3)', fontSize: 14,
          }}>✕</button>
        </div>

        {view === 'main' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={() => setView('colors')}
              style={menuRowStyle('rgba(225,79,59,0.10)', '#9D174D')}
            >
              <span style={{ fontSize: 18 }}>🎨</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Change color</span>
              <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>›</span>
            </button>
            <button
              onClick={() => { onRemove?.(); onClose?.(); }}
              style={menuRowStyle('rgba(225,79,59,0.10)', 'var(--brick-red-d)')}
            >
              <span style={{ fontSize: 18 }}>🗑</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Remove this brick</span>
            </button>
          </div>
        )}

        {view === 'colors' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <button
              onClick={() => setView('main')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: 'rgba(26,20,16,0.06)', color: 'var(--ink-3)',
                width: 'fit-content',
              }}
            >‹ back</button>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
            }}>
              {SWATCHES.map((s) => {
                const isCurrent = s.hex.toLowerCase() === (brick.color || '').toLowerCase();
                return (
                  <button
                    key={s.hex}
                    onClick={() => { onRecolor?.(s.hex); onClose?.(); }}
                    aria-label={`Recolor to ${s.name}`}
                    title={s.name}
                    style={{
                      width: 38, height: 38, borderRadius: 10, background: s.hex,
                      border: isCurrent ? '3px solid var(--ink)' : '2px solid rgba(0,0,0,0.12)',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.18)',
                      cursor: 'pointer',
                      transition: 'transform 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center' }}>
              Just this brick. Use voice ("make the head blue") for whole regions.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function menuRowStyle(bg, fg) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 12,
    background: bg, color: fg,
    fontSize: 14, fontWeight: 700,
    width: '100%', cursor: 'pointer',
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
