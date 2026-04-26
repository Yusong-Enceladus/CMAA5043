/**
 * Manual — the "living instruction book" that sits beside the 3D viewer on
 * the Build screen. Two-page spread, paper-textured. The LEFT page renders
 * the current step (with a page-flip animation on step change). The RIGHT
 * page renders the kid's accumulated customizations, each entry sliding/
 * stamping in as it's applied. This is the showpiece interaction: when
 * the child says "make it blue", the 3D model recolors AND the manual
 * inks the change onto the page.
 */
import { Kicker, PieceDot } from './UI';
import { SteamTag } from './Buddy';

export default function Manual({ model, step, stepIndex, totalSteps, log = [], pulseKey = 0 }) {
  if (!model || !step) {
    return (
      <div className="paper-texture" style={manualWrapStyle}>
        <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 14 }}>
          The manual will appear when you pick a build.
        </div>
      </div>
    );
  }

  return (
    <div style={manualWrapStyle}>
      <div className="manual-header" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--brick-red)', color: '#FFF',
          display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800,
          boxShadow: '0 2px 0 var(--brick-red-d)',
        }}>📖</div>
        <div>
          <div className="mono" style={{
            fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', fontWeight: 700,
          }}>BUDDY'S MANUAL</div>
          <div className="serif" style={{ fontSize: 16, lineHeight: 1.1 }}>
            {model.emoji} {model.name}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="mono" style={{
          fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.1em', fontWeight: 700,
          padding: '4px 10px', borderRadius: 999, background: 'rgba(26,20,16,0.06)',
        }}>
          PAGE {stepIndex + 1} / {totalSteps}
        </div>
      </div>

      <div className="manual-spread" style={{
        flex: 1, minHeight: 0, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}>
        {/* LEFT PAGE — current step instructions. Re-mounts on step change
            AND on every mutation (pulseKey++), so the page-flip + ink-write
            animations replay whenever a recolor / remove rewrites the text
            on this page — that's the "manual rewriting itself" moment. */}
        <Page side="left" key={`step-${stepIndex}-p${pulseKey}`}>
          <Kicker color="var(--ink-3)">Step {stepIndex + 1}</Kicker>
          <h3 className="serif" style={{
            fontSize: 22, lineHeight: 1.15, margin: 0, color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}>
            {step.emoji} {step.title}
          </h3>

          <div
            style={{
              fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)',
              animation: 'inkWrite 0.7s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
            dangerouslySetInnerHTML={{ __html: step.desc || '' }}
          />

          <div>
            <div className="mono" style={pageLabelStyle}>PIECES</div>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {(step.pieces || []).map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 10,
                  background: 'rgba(26,20,16,0.04)', fontSize: 12, color: 'var(--ink-2)',
                  animation: `inkWrite 0.5s ${0.2 + i * 0.05}s cubic-bezier(0.16,1,0.3,1) both`,
                }}>
                  <PieceDot color={p.color} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {step.tip && (
            <div style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.3)',
              fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)',
              animation: 'inkWrite 0.6s 0.4s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span>{step.tip}</span>
            </div>
          )}

          {step.steamTag && (
            <div style={{ marginTop: 'auto' }}>
              <SteamTag tag={step.steamTag} />
            </div>
          )}
        </Page>

        {/* RIGHT PAGE — accruing customization log */}
        <Page side="right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Kicker color="var(--brick-red)">My Changes</Kicker>
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
              ({log.length})
            </span>
          </div>

          <h3 className="serif" style={{
            fontSize: 18, lineHeight: 1.2, margin: 0, color: 'var(--ink)',
          }}>
            {log.length === 0 ? 'A blank page, ready for your ideas!' : 'Live customizations'}
          </h3>

          {log.length === 0 ? (
            <EmptyChangesPage />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {log.map((entry, i) => (
                <ChangeEntry key={entry.id} entry={entry} isLatest={i === log.length - 1} />
              ))}
            </div>
          )}
        </Page>
      </div>
    </div>
  );
}

const manualWrapStyle = {
  display: 'flex', flexDirection: 'column',
  borderRadius: 22, overflow: 'hidden',
  background: 'var(--card)',
  border: '1px solid var(--rule)', boxShadow: 'var(--shadow-2)',
  minHeight: 0,
};

const pageLabelStyle = {
  fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', fontWeight: 700,
};

/* ───────── Page ───────── */
function Page({ side, children }) {
  const isLeft = side === 'left';
  return (
    <div className="paper-texture" style={{
      padding: '18px 18px 22px', display: 'grid', gap: 12, alignContent: 'start',
      borderRight: isLeft ? '1px dashed rgba(122, 86, 50, 0.25)' : 'none',
      position: 'relative',
      animation: isLeft ? 'pageFlip 0.55s cubic-bezier(0.16, 1, 0.3, 1)' : 'fadeIn 0.4s',
      perspective: 800,
    }}>
      {/* Faux page binding shadow on the inner edge */}
      {isLeft && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 12,
          background: 'linear-gradient(90deg, transparent 0%, rgba(122, 86, 50, 0.10) 100%)',
          pointerEvents: 'none',
        }} />
      )}
      {!isLeft && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 12,
          background: 'linear-gradient(270deg, transparent 0%, rgba(122, 86, 50, 0.10) 100%)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ display: 'grid', gap: 12, position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

/* ───────── Empty changes page ───────── */
function EmptyChangesPage() {
  return (
    <div style={{
      display: 'grid', gap: 8, padding: '14px 12px', borderRadius: 14,
      background: 'rgba(255,255,255,0.55)',
      border: '1px dashed rgba(122, 86, 50, 0.3)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
        Try saying things like:
      </div>
      <ul style={{
        margin: 0, paddingLeft: 18, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.7,
      }}>
        <li>&ldquo;Make it <span style={{ color: 'var(--brick-blue)', fontWeight: 700 }}>blue</span>&rdquo;</li>
        <li>&ldquo;Add <span style={{ color: 'var(--ok)', fontWeight: 700 }}>wings</span>&rdquo;</li>
        <li>&ldquo;Make it <span style={{ color: 'var(--brick-orange)', fontWeight: 700 }}>bigger</span>&rdquo;</li>
      </ul>
      <div style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic', marginTop: 4 }}>
        Or tap any brick on the model to recolor it.
      </div>
    </div>
  );
}

/* ───────── Change entry ───────── */
function ChangeEntry({ entry, isLatest }) {
  const accent = ENTRY_ACCENT[entry.kind] || ENTRY_ACCENT.default;
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10,
        padding: '10px 12px', borderRadius: 14,
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${accent.border}`,
        position: 'relative',
        // Animate freshly-added entries with a slide+pop. Older entries fade
        // in lazily so navigating back to a step that already had changes
        // doesn't replay the stamp.
        animation: isLatest
          ? 'bubbleIn 0.5s cubic-bezier(0.16,1,0.3,1) both'
          : 'fadeIn 0.3s',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 999,
        background: accent.bg, color: accent.fg,
        display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800,
        boxShadow: '0 2px 0 rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>{accent.icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}>
          {entry.description}
        </div>
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap',
          fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.06em',
        }}>
          <span style={{ fontWeight: 700 }}>{accent.label.toUpperCase()}</span>
          <span>·</span>
          <span>{relativeTime(entry.ts)}</span>
          {entry.source && <><span>·</span><span>{entry.source.toUpperCase()}</span></>}
        </div>

        {/* Color swatch pair (for recolor entries) — sits inline so it
            never bleeds out of the right page. */}
        {entry.before && entry.after && (
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center', marginTop: 6,
            fontSize: 11, color: 'var(--ink-3)',
          }}>
            <ColorSwatch color={entry.before} cross />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>→</span>
            <ColorSwatch color={entry.after} />
          </div>
        )}
      </div>
    </div>
  );
}

const ENTRY_ACCENT = {
  recolor:        { icon: '🎨', label: 'recolor',  bg: '#FCE7F3', fg: '#9D174D', border: 'rgba(157,23,77,0.18)' },
  'tap-recolor':  { icon: '✋', label: 'tap',      bg: '#FCE7F3', fg: '#9D174D', border: 'rgba(157,23,77,0.18)' },
  scale:          { icon: '📏', label: 'resized',  bg: '#FEF3C7', fg: '#92400E', border: 'rgba(146,64,14,0.18)' },
  'add-feature':  { icon: '➕', label: 'added',    bg: '#DCFCE7', fg: '#166534', border: 'rgba(22,101,52,0.18)' },
  'remove-feature': { icon: '➖', label: 'removed', bg: '#FEE2E2', fg: '#991B1B', border: 'rgba(153,27,27,0.18)' },
  'tap-remove':   { icon: '🗑', label: 'removed',  bg: '#FEE2E2', fg: '#991B1B', border: 'rgba(153,27,27,0.18)' },
  default:        { icon: '✏️', label: 'change',   bg: '#E0F2FE', fg: '#075985', border: 'rgba(7,89,133,0.18)' },
};

function ColorSwatch({ color, cross = false }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{
        display: 'inline-block', width: 18, height: 18, borderRadius: 5,
        background: color, border: '1.5px solid rgba(0,0,0,0.12)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }} />
      {cross && (
        <span style={{
          position: 'absolute', top: 8, left: -2, right: -2, height: 2,
          background: 'var(--brick-red)', borderRadius: 1,
          transform: 'rotate(-12deg)',
          animation: 'strikeThrough 0.4s 0.1s ease-out both',
          transformOrigin: 'left center',
        }} />
      )}
    </span>
  );
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 5000)  return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return 'earlier';
}
