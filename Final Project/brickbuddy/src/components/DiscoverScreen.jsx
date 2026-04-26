/**
 * DiscoverScreen — the new camera-first entry. Replaces the old ImagineScreen.
 *
 * Premise: "I've got a pile of blocks but I don't know what to build." The kid
 * picks one of three paths, all of which converge on the InventoryScreen:
 *   1. Scan my pile  → camera capture (real getUserMedia)
 *   2. Tell Buddy    → voice transcript (real Web Speech)
 *   3. Just browse   → skips scan, jumps straight to inventory with the mock pile
 *
 * The Talk/Type/Show tab toggle is gone — we don't fork the UI by mode, we
 * present a single hero with one obvious primary action and two clearly
 * secondary alternatives. This makes the "wow" moment (camera scan)
 * unmissable.
 */
import { useEffect, useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { ProgressDots } from '../App';
import { MOCK_INVENTORY } from '../data/mockInventory';
import { analyzePhoto } from '../services/imageAnalyzer';
import { playClick, playSuccess } from '../services/soundEffects';
import useCamera from '../hooks/useCamera';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { BuddyFace, VoiceWave } from '../design/Buddy';
import { Btn, Card, Chip, Display, Kicker, TopBar } from '../design/UI';

/* eslint-disable react-hooks/refs */
export default function DiscoverScreen() {
  const { setStage, setInventory, soundEnabled } = useBuild();
  const camera = useCamera();
  const speech = useSpeechRecognition();
  const [mode, setMode] = useState('idle');     // idle | camera | voice
  const [transitioning, setTransitioning] = useState(false);

  // Glue the camera stream to the <video> element when active.
  useEffect(() => {
    if (camera.isActive) camera.attachVideoToStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.isActive, camera.attachVideoToStream]);

  // When Discover hands off to Inventory, we attach whichever artifact the
  // kid actually produced (photo / transcript / nothing) so the next screen
  // can echo it back ("I heard: ...", "I see warm tones ..."). The mock
  // pile itself is fixed, but surfacing the input closes the loop — without
  // it, the voice/camera options feel purely theatrical.
  const handToInventory = ({ photo = null, transcript = null, analysis = null } = {}) => {
    if (transitioning) return;
    setTransitioning(true);
    setInventory({
      ...MOCK_INVENTORY,
      scannedAt: Date.now(),
      photo,
      transcript,
      analysis,
    });
    if (soundEnabled) playSuccess();
    speech.stopListening();
    camera.stopCamera();
    setTimeout(() => setStage('inventory'), 350);
  };

  const handleScanCamera = () => {
    if (soundEnabled) playClick();
    setMode('camera');
    camera.startCamera();
  };

  const handleCapture = async () => {
    if (soundEnabled) playClick();
    const photo = camera.takePhoto();
    // Best-effort photo analysis for the inventory hint. analyzePhoto
    // returns { modelId, confidence, reason } based on dominant colors +
    // crude shape edges. If it errors, just pass the photo without analysis.
    let analysis = null;
    if (photo) {
      try { analysis = await analyzePhoto(photo); } catch { /* tolerate */ }
    }
    handToInventory({ photo, analysis });
  };

  const handleTellBuddy = () => {
    if (soundEnabled) playClick();
    setMode('voice');
    speech.resetTranscript();
    speech.clearError();
    speech.startListening();
  };

  const handleVoiceConfirm = () => {
    if (soundEnabled) playClick();
    handToInventory({ transcript: speech.transcript.trim() || null });
  };

  const handleBrowse = () => {
    if (soundEnabled) playClick();
    handToInventory({});
  };

  const handleBack = () => {
    speech.stopListening();
    camera.stopCamera();
    setStage('splash');
  };

  return (
    <div className="bb-screen" role="main" aria-label="Discover what to build">
      <TopBar onBack={handleBack} right={<ProgressDots />}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip bg="var(--paper-2)" color="var(--ink-2)">Step 1 · Discover</Chip>
        </div>
      </TopBar>

      <div style={{
        flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 30% 0%, #FFE0CC 0%, #FFF6EC 55%), var(--paper)',
      }}>
        <ScatteredBricks />

        <div style={{
          position: 'relative', zIndex: 2, height: '100%',
          display: 'grid', placeItems: 'center', padding: '12px 20px',
        }}>
          {mode === 'idle' && (
            <IdleHero
              onScan={handleScanCamera}
              onVoice={handleTellBuddy}
              onBrowse={handleBrowse}
              voiceSupported={speech.isSupported}
            />
          )}

          {mode === 'camera' && (
            <CameraStage
              camera={camera}
              onCancel={() => { camera.stopCamera(); setMode('idle'); }}
              onCapture={handleCapture}
            />
          )}

          {mode === 'voice' && (
            <VoiceStage
              speech={speech}
              onCancel={() => { speech.stopListening(); setMode('idle'); }}
              onConfirm={handleVoiceConfirm}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Idle (default) hero ───────── */
function IdleHero({ onScan, onVoice, onBrowse, voiceSupported }) {
  return (
    <div style={{
      width: '100%', maxWidth: 760, display: 'grid', gap: 22, justifyItems: 'center',
      animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <BuddyFace size={92} state="watching" />
      <Kicker>I'll find a build that fits your pile</Kicker>
      <Display size="lg" style={{ textAlign: 'center', maxWidth: 640 }}>
        Show me what you've{' '}
        <span style={{ color: 'var(--brick-red)' }}>got</span>.
      </Display>
      <p style={{
        margin: 0, color: 'var(--ink-3)', fontSize: 17, lineHeight: 1.5,
        textAlign: 'center', maxWidth: 520,
      }}>
        Point your camera at the pile of bricks. I'll see what's there and
        suggest something cool to build.
      </p>

      {/* Primary CTA — camera scan */}
      <button
        onClick={onScan}
        aria-label="Open camera to scan your bricks"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 14,
          padding: '20px 36px', borderRadius: 22,
          background: 'var(--brick-red)', color: '#FFF',
          fontSize: 20, fontWeight: 800, fontFamily: 'var(--sans)',
          boxShadow: '0 6px 0 var(--brick-red-d), 0 16px 36px rgba(225,79,59,0.3)',
          letterSpacing: '-0.01em',
          animation: 'dockBob 3s ease-in-out infinite',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(3px)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: 28 }}>📷</span>
        Scan my pile
      </button>

      {/* Secondary actions */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onVoice}
          disabled={!voiceSupported}
          aria-label="Tell Buddy what bricks you have"
          style={secondaryStyle}
        >
          <span style={{ fontSize: 18 }}>🎤</span>
          Tell Buddy what you've got
        </button>
        <span style={{ color: 'var(--ink-4)', fontSize: 13, fontFamily: 'var(--mono)' }}>or</span>
        <button onClick={onBrowse} aria-label="Browse builds without scanning" style={secondaryStyle}>
          <span style={{ fontSize: 18 }}>👀</span>
          Just browse
        </button>
      </div>
    </div>
  );
}

const secondaryStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 20px', borderRadius: 999,
  background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
  color: 'var(--ink-2)', fontSize: 14, fontWeight: 700,
  border: '1px solid var(--rule)', boxShadow: 'var(--shadow-1)',
};

/* ───────── Camera stage ───────── */
function CameraStage({ camera, onCancel, onCapture }) {
  return (
    <Card pad={20} style={{
      width: '100%', maxWidth: 720, display: 'grid', gap: 14,
      animation: 'bubbleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BuddyFace size={42} state="watching" />
        <div>
          <div className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>Show me your pile</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            Point at all the bricks you have spread out.
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onCancel} aria-label="Cancel" style={{
          padding: '6px 12px', borderRadius: 999, background: 'rgba(26,20,16,0.06)',
          fontSize: 13, fontWeight: 700, color: 'var(--ink-3)',
        }}>Cancel</button>
      </div>

      <div style={{
        aspectRatio: '4 / 3', borderRadius: 18, overflow: 'hidden', position: 'relative',
        background: '#1A1410', border: '2px solid var(--rule-2)',
      }}>
        {camera.error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            color: '#FFF6EC', fontSize: 14, padding: 24, textAlign: 'center',
          }}>{camera.error.message}</div>
        )}
        {camera.isActive && (
          <video
            ref={camera.videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {camera.isActive && (
          <>
            {/* Corner markers — like a film viewfinder */}
            {[
              { top: 16, left: 16, br: 0, bb: 0, bt: 1, bl: 1 },
              { top: 16, right: 16, bl: 0, bb: 0, bt: 1, br: 1 },
              { bottom: 16, left: 16, br: 0, bt: 0, bb: 1, bl: 1 },
              { bottom: 16, right: 16, bl: 0, bt: 0, bb: 1, br: 1 },
            ].map((p, i) => (
              <span key={i} style={{
                position: 'absolute', width: 30, height: 30,
                borderColor: '#FFF6EC', borderStyle: 'solid',
                borderTopWidth: p.bt ? 3 : 0, borderRightWidth: p.br ? 3 : 0,
                borderBottomWidth: p.bb ? 3 : 0, borderLeftWidth: p.bl ? 3 : 0,
                ...p,
              }} />
            ))}
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(225,79,59,0.92)', color: '#FFF',
              fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: '0.1em', fontWeight: 700,
            }}>● LIVE · BUDDY IS WATCHING</div>
          </>
        )}
        {!camera.isActive && !camera.error && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#FFF6EC', fontSize: 14 }}>
            Opening camera…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Btn variant="brick" size="lg" onClick={onCapture} disabled={!camera.isActive} icon="📸">
          Capture & Scan
        </Btn>
      </div>
    </Card>
  );
}

/* ───────── Voice stage ───────── */
function VoiceStage({ speech, onCancel, onConfirm }) {
  const hasTranscript = speech.transcript.trim().length > 0;
  return (
    <Card pad={28} style={{
      width: '100%', maxWidth: 640, display: 'grid', gap: 18, justifyItems: 'center',
      animation: 'bubbleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <BuddyFace size={64} state="listening" />
      <Kicker color="var(--live)">Listening…</Kicker>
      <p style={{
        margin: 0, color: 'var(--ink-3)', fontSize: 16, textAlign: 'center', lineHeight: 1.5,
      }}>
        Tell me what bricks you have spread out — colors, shapes, anything you see!
      </p>

      {speech.error && (
        <div role="alert" style={{
          color: 'var(--warn)', fontSize: 13, textAlign: 'center',
        }}>{speech.error}</div>
      )}

      <VoiceWave active={speech.isListening} />

      {hasTranscript && (
        <div className="serif" style={{
          fontSize: 22, fontWeight: 700, color: 'var(--ink)',
          textAlign: 'center', maxWidth: 540, lineHeight: 1.4, letterSpacing: '-0.015em',
        }}>
          &ldquo;{speech.transcript}&rdquo;
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="outline" onClick={onCancel}>Cancel</Btn>
        <Btn variant="brick" onClick={onConfirm} disabled={!hasTranscript} icon="✓">
          Find me a build
        </Btn>
      </div>
    </Card>
  );
}

/* ───────── Decorative scattered bricks (chaotic — they ARE the pile) ───────── */
function ScatteredBricks() {
  const bricks = [
    { c: 'var(--brick-red)',    t: 8,  l: 6,  r: -14, s: 64, d: 0.0 },
    { c: 'var(--brick-blue)',   t: 14, r: 8,  r2: 12, s: 56, d: 0.4 },
    { c: 'var(--brick-yellow)', t: 24, l: 14, r: 18,  s: 44, d: 0.8 },
    { c: 'var(--brick-orange)', t: 64, l: 4,  r: -22, s: 60, d: 1.1 },
    { c: 'var(--brick-green)',  t: 75, r: 10, r2: 16, s: 50, d: 1.4 },
    { c: 'var(--brick-navy)',   t: 86, l: 20, r: 8,   s: 42, d: 1.7 },
    { c: 'var(--brick-red)',    t: 88, r: 28, r2: -8, s: 38, d: 2.0 },
    { c: 'var(--brick-yellow)', t: 50, r: 4,  r2: 22, s: 36, d: 2.3 },
    { c: 'var(--brick-blue)',   t: 42, l: 2,  r: 20,  s: 32, d: 2.6 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {bricks.map((b, i) => {
        const pos = b.l !== undefined ? { left: `${b.l}%` } : { right: `${b.r}%` };
        const rot = b.r2 ?? b.r ?? 0;
        return (
          <div key={i} style={{
            position: 'absolute', top: `${b.t}%`, ...pos,
            width: b.s, height: b.s * 0.72, borderRadius: 7,
            background: b.c, transform: `rotate(${rot}deg)`,
            boxShadow: '0 5px 0 rgba(0,0,0,0.14), 0 14px 32px rgba(0,0,0,0.08)',
            opacity: 0.85,
            animation: `floatY ${5 + i * 0.4}s ease-in-out ${b.d}s infinite`,
          }}>
            <span style={{ position: 'absolute', top: -4, left: '24%', width: 7, height: 7, borderRadius: 999, background: b.c, boxShadow: '0 -1px 0 rgba(0,0,0,0.18)' }} />
            <span style={{ position: 'absolute', top: -4, right: '24%', width: 7, height: 7, borderRadius: 999, background: b.c, boxShadow: '0 -1px 0 rgba(0,0,0,0.18)' }} />
          </div>
        );
      })}
    </div>
  );
}
