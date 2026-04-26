/**
 * BuildScreen — the redesigned core. No chat box. Three primary inputs
 * (voice, photo, tap-to-edit) sit in an ActionDock at the bottom; the
 * 3D viewer dominates the left; a paper-textured Manual book on the
 * right reflects every modification in real time. This is where the
 * "say it and watch the manual rewrite itself" demo lives.
 *
 * Flow:
 *   - hold the voice button → transcript → mutationEngine → model + log update
 *   - press tap-to-edit → tap a brick → BrickEditMenu → recolor / remove
 *   - press show-buddy → camera modal → canned positive feedback
 *   - step nav (back / next) advances through the build, manual page-flips
 */
import { useEffect, useRef, useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { ProgressDots } from '../App';
import {
  applyTextMutation, applyTapRecolor, applyTapRemove,
  describeColor, HINT_EXAMPLES,
} from '../services/mutationEngine';
import { playClick, playStepComplete, playSuccess, playWarning } from '../services/soundEffects';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import LegoViewer3D from './LegoViewer3D';
import Manual from '../design/Manual';
import ActionDock from '../design/ActionDock';
import BrickEditMenu from '../design/BrickEditMenu';
import { BuddyFace } from '../design/Buddy';
import { Btn, Chip, StepProgress, TopBar } from '../design/UI';

const BUDDY_MSG_TTL = 4200;

export default function BuildScreen() {
  const {
    selectedModel, currentStep, setCurrentStep, nextStep, prevStep, setStage,
    setSelectedModel, modificationLog, addModification, soundEnabled,
  } = useBuild();

  const [tapMode, setTapMode]       = useState(false);
  const [editMenu, setEditMenu]     = useState(null);   // {position, brick}
  const [cameraOpen, setCameraOpen] = useState(false);
  const [buddyMsg, setBuddyMsg]     = useState(null);   // {text, tone, ts}
  const [buddyState, setBuddyState] = useState('idle');
  // Transient pulse rings on parts just affected by a mutation (recolor /
  // tap-recolor). Cleared on a timer so the flash doesn't linger.
  const [pulseRings, setPulseRings] = useState([]);

  const speech = useSpeechRecognition();
  const camera = useCamera();
  const lastListening = useRef(false);
  const buddyTimer = useRef(null);
  const stepRef = useRef(currentStep);

  /* ── Voice transcript dispatch ──────────────────────────────────
     Pattern: when isListening transitions from true→false, wait briefly
     for the final transcript chunk, then run the mutation engine.
     Using a ref for the handler avoids stale closures. */
  useEffect(() => {
    if (lastListening.current && !speech.isListening) {
      const t = setTimeout(() => {
        const text = (speech.transcript || '').trim();
        if (text.length > 1) handleVoiceCommand(text);
        speech.resetTranscript();
      }, 280);
      lastListening.current = false;
      return () => clearTimeout(t);
    }
    lastListening.current = speech.isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.isListening]);

  /* ── Buddy speech bubble auto-dismiss ─────────────────────────── */
  useEffect(() => {
    if (!buddyMsg) return;
    clearTimeout(buddyTimer.current);
    buddyTimer.current = setTimeout(() => {
      setBuddyMsg(null);
      setBuddyState('idle');
    }, BUDDY_MSG_TTL);
    return () => clearTimeout(buddyTimer.current);
  }, [buddyMsg]);

  /* ── Friendly errors for mic / camera ──────────────────────────── */
  useEffect(() => {
    if (speech.error) flashBuddy(`🎤 ${speech.error}`, 'concern');
  }, [speech.error]);
  useEffect(() => {
    if (camera.error) flashBuddy(`📷 ${camera.error.message || 'Camera trouble.'}`, 'concern');
  }, [camera.error]);

  /* ── Step welcome on advance ──────────────────────────────────── */
  useEffect(() => {
    if (!selectedModel) return;
    if (stepRef.current !== currentStep) {
      const step = selectedModel.steps[currentStep];
      if (step) flashBuddy(`${step.emoji} ${step.title}`, 'speak');
      stepRef.current = currentStep;
    }
  }, [currentStep, selectedModel]);

  /* ── Bounds-clamp currentStep ─────────────────────────────────────
     A remove-feature mutation can shrink steps. Without this, currentStep
     may point past the end and the manual blanks out. */
  useEffect(() => {
    if (!selectedModel) return;
    const last = selectedModel.steps.length - 1;
    if (currentStep > last) setCurrentStep(Math.max(0, last));
  }, [selectedModel, currentStep, setCurrentStep]);

  /* ── Test/demo hook: expose voice + tap pipelines on window so we can
     verify the live-mutation flow from the browser preview AND drive the
     investor-demo recorder. Always on in dev; in production it only opens
     when the URL has `?demo=1`, which the demo's Playwright script appends.
     The hooks are pure UI dispatch (no privileged data), so leaving them
     reachable behind a URL flag is fine for a public deploy. ─────── */
  useEffect(() => {
    const demoFlag = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('demo') === '1';
    if (!import.meta.env.DEV && !demoFlag) return;
    window.__bb__ = {
      voice: (text) => handleVoiceCommand(text),
      tap:   (partFilter, color) => {
        const part = (selectedModel?.steps || [])
          .flatMap((s) => s.newParts || [])
          .find((p) => !partFilter || p.color === partFilter);
        if (part) handlePartClick(part, { x: 200, y: 200 });
        if (color) handleEditRecolor(color);
      },
    };
    return () => { delete window.__bb__; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  /* ── Camera glue ──────────────────────────────────────────────── */
  useEffect(() => {
    if (camera.isActive) camera.attachVideoToStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.isActive, camera.attachVideoToStream]);

  /* ── Guards ───────────────────────────────────────────────────── */
  if (!selectedModel) {
    return (
      <div className="bb-screen" role="alert">
        <TopBar onBack={() => setStage('inventory')} progressLabel="BUILD" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No build selected. Let's pick one!</p>
          <Btn variant="brick" onClick={() => setStage('inventory')} style={{ marginTop: 16 }}>
            Back to Recommendations
          </Btn>
        </div>
      </div>
    );
  }

  const step = selectedModel.steps[currentStep];
  const totalSteps = selectedModel.steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep  = currentStep === totalSteps - 1;

  /* ── Buddy speech helper ──────────────────────────────────────── */
  function flashBuddy(text, tone = 'speak') {
    const stateMap = { celebrate: 'celebrating', concern: 'concerned', speak: 'speaking', think: 'thinking', listen: 'listening' };
    setBuddyState(stateMap[tone] || 'speaking');
    setBuddyMsg({ text, tone, ts: Date.now() });
  }

  /* ── Voice command pipeline ───────────────────────────────────── */
  function handleVoiceCommand(text) {
    setBuddyState('thinking');
    const result = applyTextMutation(selectedModel, text, 'voice');
    if (result) {
      setSelectedModel(result.model);
      addModification(result.log);
      // For "add wings"-style mutations, jump straight to the new step so
      // the manual page-flips to it and the kid sees the change immediately
      // (otherwise it sits hidden until they nav forward).
      if (result.advanceTo != null && result.advanceTo < result.model.steps.length) {
        setCurrentStep(result.advanceTo);
      }
      flashRings(result.model, result.affectedStepIndices);
      if (soundEnabled) playSuccess();
      flashBuddy(`Done! ${result.log.description.charAt(0).toUpperCase()}${result.log.description.slice(1)}.`, 'celebrate');
    } else {
      if (soundEnabled) playWarning();
      const hint = HINT_EXAMPLES[Math.floor(Math.random() * HINT_EXAMPLES.length)];
      flashBuddy(`Hmm, I didn't catch that. Try ${hint}!`, 'concern');
    }
  }

  /* ── Pulse-ring helper ────────────────────────────────────────────
     Drops a few annotation rings onto the parts in the affected steps so
     the kid can SEE which bricks just changed. Auto-clears after 1.6s. */
  function flashRings(model, stepIndices) {
    if (!stepIndices?.length) return;
    const rings = [];
    for (const i of stepIndices) {
      const step = model.steps[i];
      // Cap at ~3 rings per step so a "make it blue" doesn't spam annotations.
      for (const p of (step?.newParts || []).slice(0, 3)) {
        rings.push({
          pos: p.pos,
          color: '#FCD34D',
          r: Math.max(1.4, (p.size?.[0] || 1) * 1.2),
        });
      }
    }
    setPulseRings(rings);
    setTimeout(() => setPulseRings([]), 1600);
  }

  /* ── Tap-to-edit pipeline ─────────────────────────────────────── */
  function handlePartClick(part, screenPos) {
    if (soundEnabled) playClick();
    setEditMenu({ position: screenPos, brick: part });
  }

  function handleEditRecolor(toHex) {
    if (!editMenu) return;
    const fromColor = editMenu.brick.color;
    const label = `this ${describeColor(fromColor)} ${editMenu.brick.type || 'brick'}`;
    const result = applyTapRecolor(selectedModel, editMenu.brick, toHex, label);
    if (result) {
      setSelectedModel(result.model);
      addModification(result.log);
      flashRings(result.model, result.affectedStepIndices);
      if (soundEnabled) playSuccess();
      flashBuddy(`🎨 ${describeColor(fromColor)} → ${describeColor(toHex)}!`, 'celebrate');
    }
  }

  function handleEditRemove() {
    if (!editMenu) return;
    const label = `the ${describeColor(editMenu.brick.color)} ${editMenu.brick.type || 'brick'}`;
    const result = applyTapRemove(selectedModel, editMenu.brick, label);
    if (result) {
      setSelectedModel(result.model);
      addModification(result.log);
      if (soundEnabled) playSuccess();
      flashBuddy(`Removed ${label}.`, 'celebrate');
    }
  }

  /* ── Step nav ─────────────────────────────────────────────────── */
  const handleNext = () => {
    if (soundEnabled) playStepComplete();
    // Build → Learn → Celebrate. Going through Learn on Finish keeps the
    // back-button on Celebrate consistent (it expects Learn to have been
    // visited) and gives the kid one beat of STEAM reflection before the
    // confetti.
    if (isLastStep) setStage('learn');
    else nextStep();
  };
  const handlePrev = () => {
    if (soundEnabled) playClick();
    if (!isFirstStep) prevStep();
  };

  /* ── Voice button handlers ────────────────────────────────────── */
  const startVoice = () => {
    if (!speech.isSupported) {
      flashBuddy('Voice needs Chrome, Edge, or Safari — try the tap mode instead!', 'concern');
      return;
    }
    if (soundEnabled) playClick();
    speech.resetTranscript();
    speech.clearError();
    speech.startListening();
    setBuddyState('listening');
    flashBuddy('I\'m listening — tell me what to change!', 'listen');
  };
  const stopVoice = () => {
    speech.stopListening();
  };

  /* ── Photo handlers ───────────────────────────────────────────── */
  const openCamera = () => {
    if (soundEnabled) playClick();
    setCameraOpen(true);
    setBuddyState('watching');
    setTapMode(false);
  };
  const closeCamera = () => {
    setCameraOpen(false);
    camera.stopCamera();
    camera.setPhoto(null);
    setBuddyState('idle');
  };
  const handleSendPhoto = () => {
    closeCamera();
    // Step-aware canned feedback. Pulls the current step's title to make
    // the reply feel like Buddy actually looked at this stage of the build,
    // not a generic "looks good!". Phrases rotate so a quick photo + retake
    // doesn't yield identical text.
    const reactions = [
      `Nice work on “${step?.title}” — the ${step?.emoji} bricks are coming together!`,
      `I can see your ${step?.title?.toLowerCase()} from here — way to go, builder!`,
      `That ${step?.title?.toLowerCase()} matches the manual perfectly. Keep going!`,
      `Looking at your ${step?.title?.toLowerCase()}: spot on! ✨`,
    ];
    const message = reactions[Math.floor(Math.random() * reactions.length)];
    setTimeout(() => {
      flashBuddy(message, 'celebrate');
      if (soundEnabled) playSuccess();
    }, 400);
  };

  /* ── Tap-mode toggle ──────────────────────────────────────────── */
  const toggleTapMode = () => {
    if (soundEnabled) playClick();
    setTapMode((m) => {
      const next = !m;
      flashBuddy(
        next ? 'Tap any brick to recolor or remove it.' : 'Back to free spin — drag the model to look around.',
        next ? 'speak' : 'speak',
      );
      return next;
    });
  };

  return (
    <div className="bb-screen" role="main" aria-label={`Building ${selectedModel.name}`} style={{ position: 'relative' }}>
      <TopBar onBack={() => setStage('inventory')} right={<ProgressDots />}
        progressLabel={`STEP ${currentStep + 1} / ${totalSteps}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepProgress total={totalSteps} current={currentStep} />
          <Chip bg="var(--paper-2)" color="var(--ink-2)">
            <span style={{ fontSize: 14 }}>{selectedModel.emoji}</span>&nbsp;{selectedModel.name}
          </Chip>
        </div>
      </TopBar>

      <div className="build-grid" style={buildGridStyle()}>
        {/* LEFT — 3D viewer */}
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden',
          background: 'var(--card)', border: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-2)', minHeight: 0,
        }}>
          <LegoViewer3D
            model={selectedModel}
            currentStep={currentStep}
            autoRotate={!tapMode && !cameraOpen && !speech.isListening}
            tapMode={tapMode}
            onPartClick={handlePartClick}
            annotations={pulseRings}
          />

          {/* Top-left status chip */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
            <Chip bg="rgba(255,255,255,0.92)" color="var(--ink-3)">
              {tapMode ? '✋ tap a brick' : '🌀 drag to rotate'}
            </Chip>
          </div>

          {/* Top-right live indicator */}
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <Chip bg="rgba(255,255,255,0.92)" color="var(--brick-red)">● live</Chip>
          </div>

          {/* Buddy floating in top-right (with speech bubble) */}
          <BuddyOverlay state={buddyState} message={buddyMsg} />

          {/* Camera modal overlay */}
          {cameraOpen && (
            <CameraOverlay camera={camera} onClose={closeCamera} onSend={handleSendPhoto} />
          )}

          {/* Tap mode floor accent */}
          {tapMode && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              boxShadow: 'inset 0 0 0 4px var(--brick-orange), inset 0 0 60px rgba(245,158,11,0.18)',
              borderRadius: 22,
              animation: 'fadeIn 0.3s',
            }} />
          )}
        </div>

        {/* RIGHT — manual book */}
        <Manual
          model={selectedModel}
          step={step}
          stepIndex={currentStep}
          totalSteps={totalSteps}
          log={modificationLog}
          pulseKey={modificationLog.length}
        />
      </div>

      <ActionDock
        onBack={handlePrev}
        onNext={handleNext}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        onVoiceDown={startVoice}
        onVoiceUp={stopVoice}
        voiceActive={speech.isListening}
        voiceTranscript={speech.transcript}
        voiceSupported={speech.isSupported}
        onPhoto={openCamera}
        photoActive={cameraOpen}
        onToggleTap={toggleTapMode}
        tapActive={tapMode}
      />

      {editMenu && (
        <BrickEditMenu
          position={editMenu.position}
          brick={editMenu.brick}
          onRecolor={handleEditRecolor}
          onRemove={handleEditRemove}
          onClose={() => setEditMenu(null)}
        />
      )}
    </div>
  );
}

/* ───────── Buddy floating overlay ───────── */
function BuddyOverlay({ state, message }) {
  return (
    <div style={{
      position: 'absolute', top: 60, right: 18,
      display: 'flex', alignItems: 'flex-start', gap: 12, zIndex: 5,
      pointerEvents: 'none',
    }}>
      {message && (
        <div style={{
          maxWidth: 280, padding: '12px 16px', borderRadius: 18,
          borderTopRightRadius: 6,
          background: message.tone === 'concern' ? '#FFF0E6'
                     : message.tone === 'celebrate' ? '#E6F9F0' : '#FFFFFF',
          border: `1.5px solid ${
            message.tone === 'concern' ? 'var(--warn)'
            : message.tone === 'celebrate' ? 'var(--ok)' : 'var(--rule-2)'}`,
          color: 'var(--ink)',
          fontSize: 14, lineHeight: 1.45, fontWeight: 600,
          boxShadow: '0 12px 32px rgba(26,20,16,0.18)',
          animation: 'bubbleIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {message.text}
        </div>
      )}
      <BuddyFace size={64} state={state} mood="happy" />
    </div>
  );
}

/* ───────── Camera modal ───────── */
function CameraOverlay({ camera, onClose, onSend }) {
  useEffect(() => {
    if (!camera.isActive && !camera.photo) camera.startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapped = !!camera.photo;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 20,
      display: 'grid', placeItems: 'center', padding: 24, animation: 'fadeIn 0.2s',
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 22, padding: 18,
        width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-3)',
        display: 'grid', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BuddyFace size={36} state="watching" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Show Buddy your build</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>I'll take a peek and cheer you on.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 8, background: 'rgba(26,20,16,0.06)',
          }}>✕</button>
        </div>

        <div style={{
          aspectRatio: '4 / 3', borderRadius: 14, overflow: 'hidden', position: 'relative',
          background: snapped ? 'var(--paper-2)' : '#1A1410',
        }}>
          {snapped ? (
            <img src={camera.photo} alt="Your build" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : camera.isActive ? (
            <video
              ref={camera.videoRef}
              autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#FFF6EC', fontSize: 13 }}>
              {camera.error ? camera.error.message : 'Opening camera…'}
            </div>
          )}

          {!snapped && camera.isActive && (
            <Chip bg="rgba(225,79,59,0.92)" color="#FFF" style={{
              position: 'absolute', top: 10, left: 10,
            }}>● REC</Chip>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {!snapped
            ? <Btn variant="brick" onClick={() => camera.takePhoto()} disabled={!camera.isActive} icon="📸">Capture</Btn>
            : <>
                <Btn variant="outline" onClick={() => { camera.setPhoto(null); camera.startCamera(); }}>Retake</Btn>
                <Btn variant="brick" onClick={onSend}>Send to Buddy →</Btn>
              </>
          }
        </div>
      </div>
    </div>
  );
}

/* ───────── Two-column grid for the Build screen body ───────── */
function buildGridStyle() {
  return {
    flex: 1, display: 'grid', gap: 16, padding: '14px 16px 0', minHeight: 0,
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.85fr)',
  };
}
