/**
 * InventoryScreen — the "wow" moment. Plays an animated brick scan, reveals
 * the contents of the pile one row at a time, then morphs into a recommendation
 * gallery so the kid can pick a build.
 *
 * The scan is a deliberately theatrical animation: a sweeping scan line over
 * the photo (or a placeholder pile illustration), then bricks pop in row by
 * row with their counts spinning up. Once the reveal completes, the screen
 * swaps to "Here's what fits" and the recommendation cards animate in.
 *
 * All data here is mock-curated (see data/mockInventory.js) so the demo is
 * deterministic and visually rich.
 */
import { useEffect, useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { ProgressDots } from '../App';
import { MOCK_INVENTORY, MOCK_RECOMMENDATIONS, SCAN_DURATION_MS } from '../data/mockInventory';
import { robotModels } from '../data/models';
import { playClick, playSuccess } from '../services/soundEffects';
import { BuddyFace } from '../design/Buddy';
import { Btn, Card, Chip, Display, Kicker, TopBar } from '../design/UI';

const PHASE_DURATION = {
  scan:    SCAN_DURATION_MS,    // sweep + count-up
  count:   1400,                // counts settling
  // After that we sit on the "results" view until the kid picks.
};

export default function InventoryScreen() {
  const { setStage, selectModel, inventory, setInventory, soundEnabled } = useBuild();
  const [phase, setPhase] = useState('scan');   // scan | results
  const [revealedRows, setRevealedRows] = useState(0);

  // Hard-fallback: if someone deep-linked to inventory without a scan,
  // drop the mock pile in so the screen still demos correctly.
  useEffect(() => {
    if (!inventory) setInventory({ ...MOCK_INVENTORY, scannedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the staged reveal. Each brick row animates in 220ms after the
  // previous one — the count-up keeps pace with the slide-in.
  useEffect(() => {
    if (phase !== 'scan') return;
    if (!inventory) return;
    const total = inventory.bricks.length;
    const stepMs = (PHASE_DURATION.scan - 600) / total;
    const timers = inventory.bricks.map((_, i) =>
      setTimeout(() => setRevealedRows((r) => Math.max(r, i + 1)), 600 + i * stepMs),
    );
    const done = setTimeout(() => {
      setPhase('results');
      if (soundEnabled) playSuccess();
    }, PHASE_DURATION.scan + PHASE_DURATION.count);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inventory]);

  const handleBack = () => setStage('discover');

  const handlePick = (rec) => {
    if (soundEnabled) playClick();
    const model = robotModels.find((m) => m.id === rec.modelId);
    if (!model) return;
    selectModel(model.id);
    if (soundEnabled) playSuccess();
    setStage('build');
  };

  return (
    <div className="bb-screen" role="main" aria-label="Inventory and recommendations">
      <TopBar onBack={handleBack} right={<ProgressDots />}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip bg="var(--paper-2)" color="var(--ink-2)">Step 2 · Inventory</Chip>
        </div>
      </TopBar>

      <div style={{
        flex: 1, minHeight: 0, overflow: 'auto',
        background: 'radial-gradient(ellipse at 50% 0%, #FFE7D5 0%, #FFF6EC 60%), var(--paper)',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '20px 24px 32px',
          display: 'grid', gap: 20,
        }}>
          <ScanHeader phase={phase} totalBricks={inventory?.total ?? 0} kindCount={inventory?.bricks.length ?? 0} revealedRows={revealedRows} />

          {/* Echo whatever the kid actually said / showed back to them. This
              is the bit that turns the voice/camera options on Discover from
              theatre into part of the loop. */}
          <InputEcho transcript={inventory?.transcript} analysis={inventory?.analysis} />

          <div style={{
            display: 'grid', gap: 20, gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.5fr)',
            alignItems: 'start',
          }}>
            <PileCard photo={inventory?.photo} phase={phase} />
            <BrickList bricks={inventory?.bricks || []} revealedRows={revealedRows} phase={phase} />
          </div>

          {phase === 'results' && (
            <div style={{
              display: 'grid', gap: 12,
              animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <BuddyFace size={48} state="speaking" />
                <div>
                  <Kicker>Buddy's picks</Kicker>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1.15, color: 'var(--ink)' }}>
                    Three builds that fit your pile.
                  </div>
                </div>
              </div>
              <div style={{
                display: 'grid', gap: 14,
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              }}>
                {orderRecommendations(MOCK_RECOMMENDATIONS, inventory?.analysis).map((rec, i) => (
                  <RecommendationCard
                    key={rec.modelId}
                    rec={rec}
                    delay={i * 120}
                    isTopPick={i === 0 && !!inventory?.analysis}
                    onPick={() => handlePick(rec)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Scan header ───────── */
function ScanHeader({ phase, totalBricks, kindCount, revealedRows }) {
  const isScanning = phase === 'scan';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 16,
      padding: 16, borderRadius: 18,
      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
      border: '1px solid var(--rule)', boxShadow: 'var(--shadow-1)',
    }}>
      <BuddyFace size={56} state={isScanning ? 'thinking' : 'celebrating'} />
      <div style={{ minWidth: 0 }}>
        <Kicker color={isScanning ? 'var(--live)' : 'var(--ok)'}>
          {isScanning ? 'Analyzing your pile…' : 'Scan complete!'}
        </Kicker>
        <div className="serif" style={{
          fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', marginTop: 2, letterSpacing: '-0.025em',
        }}>
          {isScanning
            ? <>Finding all your bricks <span style={{ color: 'var(--live)' }}>…</span></>
            : <>You've got <span style={{ color: 'var(--brick-red)' }}>{totalBricks}</span> bricks across <span style={{ color: 'var(--brick-orange)' }}>{kindCount}</span> kinds.</>}
        </div>
      </div>
      <div style={{
        textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11,
        letterSpacing: '0.12em', color: 'var(--ink-3)',
      }}>
        <div>SCAN</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: isScanning ? 'var(--live)' : 'var(--ok)' }}>
          {isScanning ? `${Math.min(99, Math.round((revealedRows / Math.max(1, kindCount)) * 100))}%` : '100%'}
        </div>
      </div>
    </div>
  );
}

/* ───────── Pile preview card with sweeping scan line ───────── */
function PileCard({ photo, phase }) {
  const isScanning = phase === 'scan';
  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden', position: 'relative',
      border: '1px solid var(--rule)', boxShadow: 'var(--shadow-2)',
      background: 'var(--card)', minHeight: 280,
    }}>
      <div style={{
        aspectRatio: '4 / 3',
        background: photo
          ? '#1A1410'
          : 'radial-gradient(ellipse at 50% 60%, #FBE6CA 0%, #F4D5AE 40%, #E5BC8A 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {photo ? (
          <img src={photo} alt="Your pile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PileIllustration />
        )}

        {isScanning && (
          <>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '8%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(47,111,235,0) 0%, rgba(47,111,235,0.55) 50%, rgba(47,111,235,0) 100%)',
              boxShadow: '0 0 24px 8px rgba(47,111,235,0.45)',
              animation: `scanSweep 1.6s ease-in-out infinite`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(47,111,235,0.05), transparent 40%)',
              animation: 'scanGlow 1.6s ease-in-out infinite',
            }} />
            <Chip bg="rgba(47,111,235,0.92)" color="#FFF" style={{
              position: 'absolute', top: 12, left: 12, animation: 'fadeIn 0.3s',
            }}>
              <span style={{ animation: 'fadeIn 0.5s infinite alternate' }}>●</span>&nbsp;SCANNING
            </Chip>
          </>
        )}

        {!isScanning && (
          <Chip bg="rgba(15,153,104,0.92)" color="#FFF" style={{
            position: 'absolute', top: 12, left: 12, animation: 'bubbleIn 0.4s',
          }}>
            ✓&nbsp;ANALYZED
          </Chip>
        )}
      </div>

      <div style={{ padding: 14, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
        {photo ? 'Your photo · scanned in real-time' : 'Demo pile · scanned in real-time'}
      </div>
    </div>
  );
}

function PileIllustration() {
  // Simple SVG of scattered bricks, drawn at varying angles.
  // No external assets — keeps the demo self-contained.
  const items = [
    { x: 30, y: 60, w: 50, h: 28, c: '#E14F3B', r: -15 },
    { x: 110, y: 50, w: 60, h: 32, c: '#3B82F6', r: 8 },
    { x: 180, y: 80, w: 48, h: 26, c: '#FBBF24', r: -6 },
    { x: 60, y: 120, w: 60, h: 32, c: '#10B981', r: 18 },
    { x: 150, y: 130, w: 44, h: 24, c: '#F59E0B', r: -22 },
    { x: 220, y: 110, w: 50, h: 26, c: '#8B5CF6', r: 12 },
    { x: 90, y: 170, w: 56, h: 30, c: '#1F2937', r: 4 },
    { x: 170, y: 170, w: 52, h: 28, c: '#E14F3B', r: -10 },
    { x: 235, y: 165, w: 38, h: 22, c: '#FCD34D', r: 22 },
    { x: 30, y: 20, w: 36, h: 20, c: '#10B981', r: 30 },
  ];
  return (
    <svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}>
      {items.map((it, i) => (
        <g key={i} transform={`translate(${it.x} ${it.y}) rotate(${it.r} ${it.w / 2} ${it.h / 2})`}>
          <rect width={it.w} height={it.h} rx={3} fill={it.c}
            filter="drop-shadow(0 3px 0 rgba(0,0,0,0.15))" />
          <circle cx={it.w * 0.25} cy={-2} r={3.5} fill={it.c} />
          <circle cx={it.w * 0.5}  cy={-2} r={3.5} fill={it.c} />
          <circle cx={it.w * 0.75} cy={-2} r={3.5} fill={it.c} />
        </g>
      ))}
    </svg>
  );
}

/* ───────── Brick list ───────── */
function BrickList({ bricks, revealedRows, phase }) {
  return (
    <div style={{
      borderRadius: 22, padding: 16,
      background: 'var(--card)', border: '1px solid var(--rule)',
      boxShadow: 'var(--shadow-1)', display: 'grid', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Kicker>Detected</Kicker>
        <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
          {phase === 'results' ? 'all clear' : `${revealedRows}/${bricks.length}`}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {bricks.map((b, i) => (
          <BrickRow key={b.id} brick={b} revealed={i < revealedRows} index={i} />
        ))}
      </div>
    </div>
  );
}

function BrickRow({ brick, revealed, index }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 14,
      background: revealed ? 'var(--paper)' : 'transparent',
      border: `1px solid ${revealed ? 'var(--rule)' : 'transparent'}`,
      transition: 'background 0.4s, border-color 0.4s',
      opacity: revealed ? 1 : 0,
      transform: revealed ? 'translateY(0)' : 'translateY(8px)',
      animation: revealed ? `brickPop 0.5s ${index * 0.04}s cubic-bezier(0.16, 1, 0.3, 1) both` : 'none',
    }}>
      <BrickIcon shape={brick.shape} color={brick.color} accent={brick.accent} />
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{brick.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
          {brick.shape.toUpperCase()}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)',
        letterSpacing: '-0.02em',
      }}>
        ×{revealed ? brick.count : 0}
      </div>
    </div>
  );
}

function BrickIcon({ shape, color, accent }) {
  if (shape === 'wheel') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 999, background: '#1F2937',
        border: `4px solid ${accent}`, display: 'grid', placeItems: 'center',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, background: '#9CA3AF' }} />
      </div>
    );
  }
  if (shape === 'slope') {
    return (
      <div style={{ width: 32, height: 24, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          clipPath: 'polygon(0 100%, 100% 100%, 100% 0)',
          background: color, boxShadow: `0 2px 0 ${accent}`,
        }} />
      </div>
    );
  }
  if (shape === 'tile' || shape === 'plate') {
    return (
      <div style={{
        width: 32, height: 12, borderRadius: 3, background: color,
        boxShadow: `0 2px 0 ${accent}`,
      }} />
    );
  }
  if (shape === 'antenna') {
    return (
      <div style={{ width: 32, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 4, height: 24, background: color, borderRadius: 2 }} />
      </div>
    );
  }
  if (shape === 'disk') {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 999, background: color,
        boxShadow: `0 2px 0 ${accent}`,
      }} />
    );
  }
  // brick
  return (
    <div style={{
      width: 32, height: 22, borderRadius: 3, background: color,
      boxShadow: `0 3px 0 ${accent}`, position: 'relative',
    }}>
      <span style={{ position: 'absolute', top: -3, left: 5,  width: 5, height: 5, borderRadius: 999, background: color }} />
      <span style={{ position: 'absolute', top: -3, right: 5, width: 5, height: 5, borderRadius: 999, background: color }} />
    </div>
  );
}

/* ───────── Input echo (transcript / photo analysis) ───────── */
function InputEcho({ transcript, analysis }) {
  // Don't render anything if Discover handed us a "Just browse" entry —
  // we don't want a "I heard nothing" stub.
  if (!transcript && !analysis) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
      padding: '12px 16px', borderRadius: 14,
      background: 'rgba(47,111,235,0.08)',
      border: '1px solid rgba(47,111,235,0.18)',
      animation: 'bubbleIn 0.4s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <BuddyFace size={28} state="speaking" />
      <span className="mono" style={{
        fontSize: 10, color: 'var(--live)', letterSpacing: '0.14em', fontWeight: 700,
      }}>BUDDY HEARD YOU</span>
      {transcript && (
        <span style={{
          fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--serif)', fontWeight: 600,
          fontStyle: 'italic',
        }}>
          🎤 &ldquo;{transcript}&rdquo;
        </span>
      )}
      {analysis && (
        <span style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--serif)', fontWeight: 600 }}>
          📷 {analysis.reason || 'I see lots of bricks!'}
          {analysis.modelId && (
            <span style={{ color: 'var(--live)', marginLeft: 6 }}>
              · best fit: {labelFor(analysis.modelId)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function labelFor(modelId) {
  const rec = MOCK_RECOMMENDATIONS.find((r) => r.modelId === modelId);
  return rec ? rec.title : modelId;
}

/**
 * Sort recommendations so the photo-analysis "best match" floats to the
 * top. Without a hint, returns the array unchanged so the demo flow is
 * deterministic.
 */
function orderRecommendations(recs, analysis) {
  if (!analysis?.modelId) return recs;
  const sorted = [...recs].sort((a, b) => {
    if (a.modelId === analysis.modelId) return -1;
    if (b.modelId === analysis.modelId) return 1;
    return b.matchPct - a.matchPct;
  });
  // Boost the best-match's matchPct slightly (clamped) so the badge feels
  // earned — purely cosmetic.
  if (sorted[0].modelId === analysis.modelId) {
    sorted[0] = { ...sorted[0], matchPct: Math.min(99, sorted[0].matchPct + 4) };
  }
  return sorted;
}

/* ───────── Recommendation card ───────── */
function RecommendationCard({ rec, delay, onPick, isTopPick = false }) {
  // Outer is a `div role=button` (not a <button>) so we can put a real <Btn>
  // inside without nesting interactive elements — that breaks accessibility
  // and triggers a React hydration warning.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}
      aria-label={`Build the ${rec.title}`}
      style={{
        textAlign: 'left', padding: 18, borderRadius: 22,
        background: 'var(--card)',
        border: isTopPick ? '2px solid var(--brick-red)' : '1px solid var(--rule)',
        boxShadow: isTopPick ? '0 8px 24px rgba(225,79,59,0.18), var(--shadow-2)' : 'var(--shadow-2)',
        display: 'grid', gap: 12, cursor: 'pointer',
        animation: `recCardIn 0.6s ${delay}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
        transition: 'transform 0.18s, box-shadow 0.18s',
        outline: 'none',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isTopPick
          ? '0 8px 24px rgba(225,79,59,0.18), var(--shadow-2)'
          : 'var(--shadow-2)';
      }}>
      {isTopPick && (
        <div style={{
          position: 'absolute', top: -10, left: 16,
          padding: '4px 10px', borderRadius: 999,
          background: 'var(--brick-red)', color: '#FFF',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
          fontFamily: 'var(--mono)', textTransform: 'uppercase',
          boxShadow: '0 4px 10px rgba(225,79,59,0.4)',
        }}>★ Top pick</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `${rec.accent}22`, display: 'grid', placeItems: 'center',
          fontSize: 38,
        }}>{rec.emoji}</div>
        <div style={{ flex: 1 }}>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, color: 'var(--ink)' }}>
            {rec.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Chip bg={`${rec.accent}22`} color={rec.accent}>{rec.difficulty}</Chip>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
              {rec.pieceCount} pieces
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>MATCH</div>
          <div className="serif" style={{ fontSize: 26, color: 'var(--ok)', lineHeight: 1, fontWeight: 800 }}>
            {rec.matchPct}%
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {rec.why}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {rec.citations.map((c, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(15,153,104,0.10)', color: 'var(--ok)',
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
          }}>✓ {c}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="brick" size="sm" icon="🔨">Build this</Btn>
      </div>
    </div>
  );
}
