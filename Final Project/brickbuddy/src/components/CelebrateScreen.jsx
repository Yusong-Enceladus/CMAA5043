/**
 * CelebrateScreen — Redesigned finale. Confetti canvas, a big rotating 3D
 * trophy viewer of the finished build, stats, achievements, and CTAs
 * (download certificate + build something else). Certificate + achievement
 * logic is preserved from the existing implementation.
 */
import { useEffect, useRef, useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { playCelebration } from '../services/soundEffects';
import LegoViewer3D from './LegoViewer3D';
import { BuddyFace } from '../design/Buddy';
import { Btn, Card, Chip, Display, Kicker, TopBar } from '../design/UI';

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, raf;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const obs = new ResizeObserver(resize); obs.observe(canvas);
    const colors = ['#E14F3B', '#F59E0B', '#FBBF24', '#10B981', '#3B82F6', '#8357E6'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 1.4, vy: 1 + Math.random() * 2,
      a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.12,
      size: 6 + Math.random() * 8,
      c: colors[(Math.random() * colors.length) | 0],
      shape: Math.random() < 0.5 ? 'rect' : 'circ',
    }));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

export default function CelebrateScreen() {
  const {
    selectedModel, steamProgress, achievements, buildDuration,
    chatHistory, resetSession, setStage, soundEnabled,
  } = useBuild();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (soundEnabled) playCelebration();
  }, [soundEnabled]);

  const stepCount = selectedModel?.steps?.length || 0;
  const brickCount = (selectedModel?.steps || []).reduce((n, s) => n + (s.newParts?.length || s.bricks?.length || 0), 0);
  const minutes = buildDuration > 0 ? formatDuration(buildDuration) : '—';
  const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);
  const topicsExplored = Object.values(steamProgress).filter(v => v > 0).length;
  const questionsAsked = chatHistory.filter(m => m.role === 'child').length;

  const handleDownloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 500;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, '#FFF6EC');
    grad.addColorStop(1, '#FFE0CC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    ctx.strokeStyle = '#E14F3B'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, 760, 460);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, 740, 440);

    ctx.fillStyle = '#1A1410';
    ctx.font = 'bold 36px "Fraunces", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Achievement', 400, 90);

    ctx.fillStyle = '#6A5445';
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('BrickBuddy STEAM Building Challenge', 400, 120);

    ctx.font = '60px serif';
    ctx.fillText('\u{1F3C6}', 400, 200);

    ctx.fillStyle = '#1A1410';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Successfully built: ${selectedModel?.name || 'Robot'}`, 400, 250);

    ctx.fillStyle = '#3A2C21';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${brickCount} pieces \u2022 ${stepCount} steps \u2022 ${topicsExplored} STEAM topics`, 400, 285);
    if (buildDuration > 0) ctx.fillText(`Build time: ${formatDuration(buildDuration)}`, 400, 310);

    if (achievements.length > 0) {
      ctx.fillStyle = '#E14F3B';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Achievements:', 400, 350);
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#3A2C21';
      const achText = achievements.map(a => `${a.icon} ${a.label}`).join('  \u2022  ');
      ctx.fillText(achText, 400, 375);
    }

    ctx.fillStyle = '#A18E7E';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Powered by BrickBuddy \u2022 CMAA5043 Final Project \u2022 Yusong & Jiayi', 400, 450);
    ctx.fillText(new Date().toLocaleDateString(), 400, 470);

    const link = document.createElement('a');
    link.download = `BrickBuddy-${selectedModel?.name || 'Robot'}-Certificate.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setSaved(true);
  };

  return (
    <div className="bb-screen" style={{ position: 'relative' }}>
      <Confetti />
      <TopBar onBack={() => setStage('learn')} progressLabel="STAGE 4 · DONE!">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip bg="var(--brick-red)" color="#fff">&#x1F3C6; YOU BUILT IT</Chip>
        </div>
      </TopBar>

      <div style={{
        flex: 1, minHeight: 0, padding: '12px 16px 14px',
        overflow: 'hidden', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          maxWidth: 1240, height: '100%', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gridTemplateRows: 'auto 1fr auto', gap: 12,
        }}>
          {/* Row 1 (spans cols): Title line */}
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', display: 'grid', gap: 2 }}>
            <Kicker color="var(--brick-red)">High five!</Kicker>
            <Display size="md" style={{ textWrap: 'balance' }}>
              You built a {selectedModel?.name || 'robot'}.
            </Display>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {stepCount} steps &middot; {brickCount} bricks &middot; {minutes !== '—' ? `~${minutes} of pure genius.` : 'pure genius.'}
            </div>
          </div>

          {/* Row 2 left: 3D trophy. Row 2 right: report + Buddy actions */}
          <Card pad={0} style={{ overflow: 'hidden', position: 'relative', minHeight: 0 }}>
            <LegoViewer3D model={selectedModel} currentStep={Math.max(0, stepCount - 1)} autoRotate showControls={false} />
            <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'grid', gap: 2 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Your build</div>
                <div className="serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{selectedModel?.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['#E14F3B', '#F59E0B', '#10B981', '#3B82F6', '#8357E6'].map(c =>
                  <div key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                )}
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateRows: 'auto auto', gap: 10, minHeight: 0 }}>
            <Card pad={12} style={{ display: 'grid', gap: 8 }}>
              <Kicker>Build report</Kicker>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { k: stepCount,       l: 'steps',       c: 'var(--brick-blue)' },
                  { k: brickCount,      l: 'bricks',      c: 'var(--brick-red)' },
                  { k: minutes,         l: 'time',        c: 'var(--brick-green)' },
                ].map(s => (
                  <div key={s.l} style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(26,20,16,0.04)', textAlign: 'center' }}>
                    <div className="serif" style={{ fontSize: 22, color: s.c, lineHeight: 1, fontWeight: 700 }}>{s.k}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <Chip bg="rgba(47,111,235,0.14)" color="var(--live)">&#x2605; {totalSteam} STEAM</Chip>
                <Chip bg="rgba(15,153,104,0.14)" color="var(--ok)">&#x2605; {questionsAsked} questions</Chip>
                <Chip bg="rgba(225,79,59,0.14)" color="var(--brick-red)">&#x2605; {topicsExplored} topics</Chip>
              </div>
              {achievements.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {achievements.slice(0, 4).map(a => (
                    <div key={a.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 999, background: 'var(--paper-2)',
                      fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
                    }}>
                      <span>{a.icon}</span>{a.label}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card pad={12} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <BuddyFace size={34} state="celebrating" />
                <div style={{ minWidth: 0 }}>
                  <Kicker color="var(--brick-red)">Buddy says</Kicker>
                  <div className="serif" style={{ fontSize: 13, lineHeight: 1.2, fontWeight: 700 }}>
                    That was AWESOME!
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Btn variant="ghost" size="sm" icon="📜" onClick={handleDownloadCertificate}>
                  {saved ? 'Saved ✓' : 'Certificate'}
                </Btn>
                <Btn variant="ghost" size="sm" icon="🖨️" onClick={() => window.print()}>Print</Btn>
              </div>
            </Card>
          </div>

          {/* Row 3 (spans cols): CTAs */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Btn variant="ghost" size="md" icon="🏠" onClick={() => setStage('splash')}>Back to start</Btn>
            <Btn variant="brick" size="md" icon="✨" onClick={resetSession}>Build something else</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
