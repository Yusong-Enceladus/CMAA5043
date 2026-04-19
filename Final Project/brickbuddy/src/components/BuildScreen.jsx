/**
 * BuildScreen — Redesigned core. 3D viewer LEFT (dominant) + step detail
 * and chat RIGHT. Voice is always reachable via a persistent mic button,
 * camera is on-request (a blue 📷 button sits right next to the mic), and
 * proactive cards slide in over the 3D when Buddy has something to say.
 *
 * All existing behaviour is preserved:
 *   - Chat routes through detectModIntent first: recolor / scale / add-feature /
 *     remove-feature / rebuild / regen-step → model updates in place.
 *   - Normal Q&A flows through getSmartAIResponse (online LLM → rule fallback).
 *   - STEAM progress is still driven by `addChat(role, text, steamTag)`.
 *   - Step welcomes and sound effects remain.
 */
import { useState, useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { ProgressDots } from '../App';
import { getSmartAIResponse, getStepWelcome, hasAIKey } from '../services/chatEngine';
import { regenerateStep } from '../services/aiService';
import {
  detectModIntent, recolorFromText, applyChatModification, generateLocally,
} from '../services/localRobotGen';
import { playClick, playStepComplete, playChatReceive } from '../services/soundEffects';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import LegoViewer3D from './LegoViewer3D';
import { BuddyFace, TypingDots, SteamTag } from '../design/Buddy';
import { Btn, Card, Chip, Kicker, PieceDot, StepProgress, TopBar } from '../design/UI';

/* Proactive messages for the simulated "child state" tweak in the design.
   We don't surface a tweak UI here but we do trigger a concerned prompt when
   the child dwells on a step — wiring is ready for a future state probe. */
const DWELL_MS = 45_000;

export default function BuildScreen() {
  const {
    selectedModel, currentStep, setCurrentStep, nextStep, prevStep, setStage,
    chatHistory, addChat, soundEnabled,
    setSelectedModel, updateSelectedModel,
  } = useBuild();

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [buddyState, setBuddyState] = useState('idle');
  const [proactive, setProactive] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [micTranscript, setMicTranscript] = useState('');

  const chatEndRef = useRef(null);
  const prevStepRef = useRef(currentStep);
  const dwellTimer = useRef(null);

  const speech = useSpeechRecognition();
  const camera = useCamera();

  /* Scroll chat to bottom on new message */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatHistory, isTyping]);

  /* Step welcome on step advance */
  useEffect(() => {
    if (prevStepRef.current !== currentStep && selectedModel) {
      const welcome = getStepWelcome(selectedModel, currentStep);
      if (welcome) {
        addChat('buddy', welcome.text, welcome.tag);
        setBuddyState('speaking');
        setTimeout(() => setBuddyState('idle'), 1400);
      }
      setAnnotations([]);
      setProactive(null);
    }
    prevStepRef.current = currentStep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedModel]);

  /* Stuck-dwell timer — if the child hasn't advanced in DWELL_MS, Buddy
     proactively asks if they need help. Dismissed as soon as they act. */
  useEffect(() => {
    clearTimeout(dwellTimer.current);
    dwellTimer.current = setTimeout(() => {
      if (!selectedModel) return;
      setBuddyState('concerned');
      setProactive({
        tone: 'concern',
        title: 'Still with me?',
        body: "Want me to peek at what you've got so far? Tap the camera and I'll take a look.",
        actions: [
          { label: '\u{1F4F8} Show Buddy', kind: 'camera' },
          { label: "I'm ok", kind: 'dismiss' },
        ],
      });
    }, DWELL_MS);
    return () => clearTimeout(dwellTimer.current);
  }, [currentStep, selectedModel]);

  /* Keep the video element glued to its stream when the camera modal opens. */
  useEffect(() => {
    if (camera.isActive) camera.attachVideoToStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.isActive, camera.attachVideoToStream]);

  /* Watch the speech hook for transcription; when the user stops listening
     with a non-empty transcript, send it as a chat message. */
  useEffect(() => {
    if (speech.isListening) {
      setMicTranscript(speech.transcript);
    } else if (micTranscript && !speech.transcript) {
      // Listening just ended — fire off the captured transcript.
      const t = micTranscript.trim();
      setMicTranscript('');
      if (t.length > 1) handleSend(t);
    } else if (!speech.isListening && speech.transcript.trim().length > 1 && !isTyping) {
      // Final result arrived after stop — send and clear.
      const t = speech.transcript.trim();
      speech.resetTranscript();
      setMicTranscript('');
      handleSend(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.isListening, speech.transcript]);

  /* Guard: no model means the user navigated here directly. Bounce to Imagine. */
  if (!selectedModel) {
    return (
      <div className="bb-screen" role="alert">
        <TopBar onBack={() => setStage('imagine')} progressLabel="BUILD" />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No robot selected. Let&apos;s go pick one!</p>
          <Btn variant="brick" onClick={() => setStage('imagine')} style={{ marginTop: 16 }}>
            Choose a Robot
          </Btn>
        </div>
      </div>
    );
  }

  const step = selectedModel.steps[currentStep];
  const isLastStep = currentStep === selectedModel.steps.length - 1;

  /* ───────── Chat dispatch ───────── */
  async function handleSend(rawText) {
    const text = (typeof rawText === 'string' ? rawText : chatInput).trim();
    if (!text || isTyping) return;
    addChat('child', text);
    if (soundEnabled) playClick();
    setChatInput('');
    setIsTyping(true);
    setBuddyState('thinking');

    try {
      const intent = detectModIntent(text, selectedModel);

      if (intent?.kind === 'recolor') {
        const result = recolorFromText(selectedModel, text);
        if (result) {
          setSelectedModel(result.model);
          if (soundEnabled) playStepComplete();
          addChat(
            'buddy',
            `${result.changed} across every step. Your ${selectedModel.name} looks different now — tell me if you want another change!`,
            'art',
          );
          setBuddyState('speaking');
          setTimeout(() => setBuddyState('idle'), 1400);
          return;
        }
      }

      if (intent?.kind === 'scale' || intent?.kind === 'add-feature' || intent?.kind === 'remove-feature') {
        const result = applyChatModification(selectedModel, text);
        if (result) {
          setSelectedModel(result.model);
          if (soundEnabled) playStepComplete();
          const tag = result.kind === 'scale' ? 'math' : 'engineering';
          addChat(
            'buddy',
            `${result.changed}. Your ${selectedModel.name} just changed shape — pop into the 3D view to see it!`,
            tag,
          );
          setBuddyState('speaking');
          setTimeout(() => setBuddyState('idle'), 1400);
          return;
        }
      }

      if (intent?.kind === 'rebuild') {
        const fresh = generateLocally(text);
        setSelectedModel(fresh);
        setCurrentStep(0);
        if (soundEnabled) playStepComplete();
        addChat(
          'buddy',
          `Rebuilt your robot from scratch as a ${fresh.name} ${fresh.emoji} — ${fresh.steps.length} steps, ${fresh.pieceCount} pieces. Let\u2019s build it!`,
          'engineering',
        );
        setBuddyState('speaking');
        setTimeout(() => setBuddyState('idle'), 1400);
        return;
      }

      if (intent?.kind === 'regen-step') {
        addChat('buddy', `Rebuilding step ${intent.stepIndex + 1} with a fresh idea\u2026`, null);
        try {
          const fresh = await regenerateStep(selectedModel, intent.stepIndex);
          updateSelectedModel((m) => {
            const copy = structuredClone(m);
            copy.steps[intent.stepIndex] = { ...copy.steps[intent.stepIndex], ...fresh };
            return copy;
          });
          if (soundEnabled) playStepComplete();
          addChat('buddy', `Done! Step ${intent.stepIndex + 1} got a makeover. Check the 3D view!`, 'engineering');
        } catch {
          updateSelectedModel((m) => proceduralStepShuffle(m, intent.stepIndex));
          if (soundEnabled) playStepComplete();
          addChat(
            'buddy',
            `Reshaped step ${intent.stepIndex + 1} locally — the AI was busy, so I swapped the bricks myself.`,
            'engineering',
          );
        }
        setBuddyState('speaking');
        setTimeout(() => setBuddyState('idle'), 1400);
        return;
      }

      // "help / stuck / lost" — surface the camera-assist prompt.
      if (/\b(help|stuck|lost|confused)\b/i.test(text)) {
        setBuddyState('watching');
        addChat('buddy', `Totally ok — want to show me your build so I can see what's going on?`, null);
        setProactive({
          tone: 'concern',
          title: 'Want to show me?',
          body: "Tap the camera and I'll look at your build.",
          actions: [
            { label: '\u{1F4F8} Open camera', kind: 'camera' },
            { label: 'Not now', kind: 'dismiss' },
          ],
        });
        return;
      }

      // Fall-through: normal AI chat
      const response = await getSmartAIResponse(text, selectedModel, currentStep, chatHistory);
      addChat('buddy', response.text, response.tag);
      if (soundEnabled) playChatReceive();
      setBuddyState('speaking');
      setTimeout(() => setBuddyState('idle'), 1600);
    } finally {
      setIsTyping(false);
    }
  }

  /* ───────── Local step-shuffle fallback ───────── */
  function proceduralStepShuffle(model, stepIndex) {
    const copy = structuredClone(model);
    const s = copy.steps[stepIndex];
    if (!s?.newParts?.length) return copy;
    const palette = collectPalette(copy.steps);
    s.newParts = s.newParts.map((p, i) => {
      const jitter = ((i % 3) - 1) * 0.4;
      const next = palette[(palette.indexOf(p.color) + 1 + i) % palette.length] || p.color;
      return {
        ...p,
        pos:  [p.pos[0] + jitter, p.pos[1], p.pos[2] - jitter],
        size: [p.size[0] * 1.08, p.size[1], p.size[2] * 1.08],
        color: next,
      };
    });
    return copy;
  }
  function collectPalette(steps) {
    const seen = new Set();
    for (const st of steps) for (const p of st.newParts || []) seen.add(p.color);
    return [...seen];
  }

  /* ───────── Step nav ───────── */
  const handleNext = () => {
    if (soundEnabled) playStepComplete();
    setAnnotations([]);
    if (isLastStep) setStage('learn');
    else nextStep();
  };
  const handlePrev = () => {
    if (soundEnabled) playClick();
    setAnnotations([]);
    prevStep();
  };

  /* ───────── Mic + camera actions (plain closures — they sit below the
     selectedModel early-return, so they can't be hooks). ───────── */
  const startMic = () => {
    if (!speech.isSupported || isTyping) return;
    if (soundEnabled) playClick();
    speech.resetTranscript();
    speech.clearError();
    speech.startListening();
    setBuddyState('listening');
  };

  const stopMic = () => {
    speech.stopListening();
  };

  const askCamera = () => {
    if (soundEnabled) playClick();
    setProactive(null);
    setCameraOpen(true);
    setBuddyState('watching');
  };

  const handleCameraSend = () => {
    // The camera snap is already captured into camera.photo by CameraPane.
    setCameraOpen(false);
    setBuddyState('thinking');
    setIsTyping(true);
    addChat('child', '[sent a photo of my build]');
    setTimeout(() => {
      addChat(
        'buddy',
        "I see it! Looks like the orange brick is a stud off-centre — try scooting it one stud to the left. You're super close!",
        'engineering',
      );
      if (step?.newParts?.length) {
        setAnnotations(step.newParts.slice(0, 1).map(p => ({
          pos: p.pos, color: 0x2F6FEB, r: Math.max(1.4, (p.size?.[0] || 1) * 1.1),
        })));
      }
      setBuddyState('speaking');
      setIsTyping(false);
      setTimeout(() => setBuddyState('idle'), 2000);
    }, 1600);
    camera.setPhoto(null);
    camera.stopCamera();
  };

  const handleProactive = (kind) => {
    if (kind === 'camera') { askCamera(); return; }
    if (kind === 'annotate') {
      if (step?.newParts?.length) {
        setAnnotations(step.newParts.slice(0, 3).map(p => ({
          pos: p.pos, color: 0xE14F3B, r: Math.max(1.3, (p.size?.[0] || 1) * 1.1),
        })));
      }
      setProactive(null);
      return;
    }
    setProactive(null);
    setBuddyState('idle');
  };

  return (
    <div className="bb-screen" role="main" aria-label={`Building ${selectedModel.name}`}>
      <TopBar onBack={() => setStage('imagine')} progressLabel={`STEP ${currentStep + 1} / ${selectedModel.steps.length}`} right={<ProgressDots />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepProgress total={selectedModel.steps.length} current={currentStep} />
          <Chip bg="var(--paper-2)" color="var(--ink-2)">
            <span style={{ fontSize: 14 }}>{selectedModel.emoji}</span>&nbsp;{selectedModel.name}
          </Chip>
        </div>
      </TopBar>

      <div className="build-grid" style={buildGridStyle()}>
        {/* LEFT column — 3D viewer + step nav */}
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden', background: 'var(--card)',
          border: '1px solid var(--rule)', boxShadow: 'var(--shadow-1)', minHeight: 360,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <LegoViewer3D
              model={selectedModel}
              currentStep={currentStep}
              annotations={annotations}
              autoRotate
            />
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
              <Chip bg="rgba(255,255,255,0.9)" color="var(--ink-3)">3D &middot; drag to rotate</Chip>
            </div>
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
              <Chip bg="rgba(255,255,255,0.9)" color="var(--brick-red)">&#9679; live</Chip>
            </div>
            {proactive && <ProactiveCard data={proactive} onAction={handleProactive} />}
            {cameraOpen && (
              <CameraPane
                camera={camera}
                onClose={() => { setCameraOpen(false); setBuddyState('idle'); camera.stopCamera(); camera.setPhoto(null); }}
                onSend={handleCameraSend}
              />
            )}
          </div>

          <div style={{
            padding: '14px 18px', borderTop: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,246,236,0.6)',
          }}>
            <button onClick={handlePrev} disabled={currentStep === 0} style={navBtnStyle(currentStep === 0)}>
              &larr; Back
            </button>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                STEP {currentStep + 1}
              </div>
              <div className="serif" style={{
                fontSize: 22, lineHeight: 1.1, color: 'var(--ink)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {step?.emoji} {step?.title}
              </div>
            </div>
            <button onClick={handleNext} style={navBtnStyle(false, true)}>
              {isLastStep ? 'Finish \u{1F389}' : 'Next \u2192'}
            </button>
          </div>
        </div>

        {/* RIGHT column — step detail + chat */}
        <div style={{ display: 'grid', gap: 16, gridTemplateRows: 'auto 1fr', minHeight: 0 }}>
          <StepDetail step={step} stepIndex={currentStep} />
          <ChatPanel
            chatHistory={chatHistory} isTyping={isTyping} buddyState={buddyState}
            chatInput={chatInput} setChatInput={setChatInput}
            onSend={() => handleSend()}
            micActive={speech.isListening} micTranscript={speech.isListening ? (micTranscript || 'Listening…') : ''}
            onMicDown={startMic} onMicUp={stopMic}
            onAskCamera={askCamera}
            chatEndRef={chatEndRef}
            selectedModel={selectedModel}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── Step detail card ───────── */
function StepDetail({ step, stepIndex }) {
  if (!step) return null;
  return (
    <Card pad={20} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          flexShrink: 0, width: 48, height: 48, borderRadius: 12,
          background: 'var(--brick-red)', color: '#FFF',
          display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22,
          boxShadow: '0 3px 0 var(--brick-red-d)',
        }}>{stepIndex + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker>Now building</Kicker>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 2 }}>
            {step.title}
          </div>
        </div>
      </div>
      <div
        style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}
        dangerouslySetInnerHTML={{ __html: step.desc || '' }}
      />
      {step.tip && (
        <div style={{
          display: 'flex', gap: 10, padding: 12, borderRadius: 12,
          background: 'var(--paper-2)', fontSize: 13, lineHeight: 1.4, color: 'var(--ink-2)',
        }}>
          <span style={{ fontSize: 18 }}>&#x1F4A1;</span>
          <span>{step.tip}</span>
        </div>
      )}
      <div>
        <Kicker color="var(--ink-3)">Pieces for this step</Kicker>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {(step.pieces || []).map((p, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999, background: 'rgba(26,20,16,0.04)',
              fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
            }}>
              <PieceDot color={p.color} />{p.name}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ───────── Chat panel ───────── */
function ChatPanel({
  chatHistory, isTyping, buddyState, chatInput, setChatInput, onSend,
  micActive, micTranscript, onMicDown, onMicUp, onAskCamera, chatEndRef, selectedModel,
}) {
  return (
    <Card pad={0} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: '1px solid var(--rule)', background: 'rgba(255,246,236,0.6)',
      }}>
        <BuddyFace size={36} state={buddyState} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Buddy</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
            {buddyState === 'listening' ? 'LISTENING\u2026' :
             buddyState === 'thinking'  ? 'THINKING\u2026'  :
             buddyState === 'watching'  ? 'WATCHING\u2026'  :
             buddyState === 'speaking'  ? 'TALKING\u2026'   :
             buddyState === 'concerned' ? 'CHECKING IN' :
             'READY'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {hasAIKey() && <Chip bg="rgba(47,111,235,0.14)" color="var(--live)">AI</Chip>}
        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
          &#x1F3A4; talk &middot; &#x1F4F7; show &middot; &#x2328; type
        </div>
      </div>

      <div
        role="log" aria-live="polite"
        style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gap: 10, minHeight: 240 }}
      >
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
          Hold the mic to talk &middot; say &ldquo;make it blue&rdquo; or &ldquo;redo step 3&rdquo;
        </div>
        <ChatMsg msg={{
          role: 'buddy',
          text: `Hey! I'm here to help you build your ${selectedModel.name} ${selectedModel.emoji}! Ask me anything, or say something like "make it blue" or "redo step 3" to change the model. 😊`,
        }} />
        {chatHistory.map((m, i) => <ChatMsg key={i} msg={m} />)}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 38 }}>
            <TypingDots />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {micActive && (
        <div style={{
          padding: '10px 14px', background: 'var(--live-soft)',
          borderTop: '1px solid rgba(47,111,235,0.3)',
          color: 'var(--live)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--serif)',
        }}>
          &#x1F3A4; {micTranscript}{' '}
          <span style={{ animation: 'fadeIn 0.5s infinite alternate' }}>|</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--rule)', alignItems: 'center' }}>
        <button
          onMouseDown={onMicDown} onMouseUp={onMicUp} onMouseLeave={micActive ? onMicUp : undefined}
          onTouchStart={(e) => { e.preventDefault(); onMicDown(); }} onTouchEnd={onMicUp}
          title="Hold to talk"
          aria-label="Hold to talk"
          style={{
            flexShrink: 0, width: 48, height: 48, borderRadius: 999,
            background: micActive ? 'var(--live)' : 'var(--brick-red)', color: '#FFF',
            fontSize: 20, display: 'grid', placeItems: 'center',
            boxShadow: micActive ? '0 0 0 8px rgba(47,111,235,0.2)' : '0 3px 0 var(--brick-red-d)',
            transition: 'box-shadow 0.2s',
          }}>
          &#x1F3A4;
        </button>
        <button
          onClick={onAskCamera}
          title="Send a photo of your build"
          aria-label="Send a photo"
          style={{
            flexShrink: 0, width: 48, height: 48, borderRadius: 999,
            background: 'var(--brick-blue)', color: '#FFF',
            fontSize: 20, display: 'grid', placeItems: 'center',
            boxShadow: '0 3px 0 #1E4FC4',
          }}>
          &#x1F4F7;
        </button>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          placeholder={isTyping ? 'Buddy is thinking…' : 'Ask, type, or tap 🎤 / 📷…'}
          disabled={isTyping}
          aria-label="Message Buddy"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 12,
            border: '1px solid var(--rule-2)', fontSize: 14, outline: 'none',
            background: 'var(--paper)', fontFamily: 'inherit', minWidth: 0,
          }}
        />
        <Btn variant="primary" size="sm" onClick={onSend} disabled={!chatInput.trim() || isTyping}>Send</Btn>
      </div>
    </Card>
  );
}

function ChatMsg({ msg }) {
  const isBuddy = msg.role !== 'child';
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: isBuddy ? 'row' : 'row-reverse' }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center',
        background: isBuddy ? 'var(--brick-orange)' : 'var(--ink)', color: '#FFF', fontSize: 14, fontWeight: 700,
      }}>
        {isBuddy ? '\u{1F916}' : '\u{1F466}'}
      </div>
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: 14,
        borderBottomLeftRadius:  isBuddy ? 4 : 14,
        borderBottomRightRadius: isBuddy ? 14 : 4,
        background: isBuddy ? 'var(--card)' : 'var(--ink)',
        color: isBuddy ? 'var(--ink)' : '#FFF6EC',
        border: isBuddy ? '1px solid var(--rule)' : 'none',
        fontSize: 14, lineHeight: 1.45,
        animation: 'fadeInUp 0.3s ease-out',
      }}>
        {msg.text}
        {msg.steamTag && <div style={{ marginTop: 6 }}><SteamTag tag={msg.steamTag} /></div>}
      </div>
    </div>
  );
}

/* ───────── Proactive card ───────── */
function ProactiveCard({ data, onAction }) {
  return (
    <div style={{
      position: 'absolute', top: 56, right: 12, width: 300,
      animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 10,
    }}>
      <div style={{
        background: data.tone === 'concern' ? '#FFF0E6' : data.tone === 'celebrate' ? '#E6F9F0' : '#FFF',
        border: `1.5px solid ${data.tone === 'concern' ? '#E0701B' : data.tone === 'celebrate' ? '#0F9968' : 'var(--rule-2)'}`,
        borderRadius: 18, padding: 16, boxShadow: '0 14px 40px rgba(26,20,16,0.18)',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <BuddyFace size={36} state={data.tone === 'concern' ? 'concerned' : data.tone === 'celebrate' ? 'celebrating' : 'speaking'} />
          <div>
            <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
              {data.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, marginTop: 4 }}>{data.body}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {data.actions.map((a, i) => (
            <button
              key={i}
              onClick={() => onAction(a.kind)}
              style={{
                padding: '8px 12px', borderRadius: 10,
                background: a.kind === 'dismiss' ? 'rgba(26,20,16,0.06)' : 'var(--ink)',
                color: a.kind === 'dismiss' ? 'var(--ink-2)' : '#FFF6EC',
                fontSize: 13, fontWeight: 700,
              }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Camera modal (real getUserMedia when supported) ───────── */
function CameraPane({ camera, onClose, onSend }) {
  // Open the camera automatically when the modal appears.
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
        background: 'var(--card)', borderRadius: 22, padding: 16,
        width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <BuddyFace size={32} state="watching" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Show Buddy your build</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Point at your current step</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 8, background: 'rgba(26,20,16,0.06)',
          }}>&#x2715;</button>
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
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#FFF6EC' }}>
              {camera.error ? camera.error.message : 'Opening camera…'}
            </div>
          )}

          {!snapped && camera.isActive && (
            <>
              <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between' }}>
                <Chip bg="rgba(225,79,59,0.9)" color="#FFF">&#9679; REC</Chip>
                <Chip bg="rgba(0,0,0,0.55)" color="#FFF">HD</Chip>
              </div>
              <div style={{
                position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center',
                color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
              }}>
                TAP CAPTURE
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          {!snapped
            ? <Btn variant="brick" onClick={() => camera.takePhoto()} disabled={!camera.isActive} icon="📸">Capture</Btn>
            : <>
                <Btn variant="outline" onClick={() => { camera.setPhoto(null); camera.startCamera(); }}>Retake</Btn>
                <Btn variant="brick" onClick={onSend}>Send to Buddy &rarr;</Btn>
              </>
          }
        </div>
      </div>
    </div>
  );
}

/* ───────── Responsive grid for the two columns ───────── */
function buildGridStyle() {
  return {
    flex: 1, display: 'grid', gap: 16, padding: 16, minHeight: 0,
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(340px, 0.85fr)',
  };
}

function navBtnStyle(disabled, primary = false) {
  return {
    padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14,
    background: disabled ? 'rgba(26,20,16,0.06)' : primary ? 'var(--ink)' : 'rgba(26,20,16,0.06)',
    color: disabled ? 'var(--ink-4)' : primary ? '#FFF6EC' : 'var(--ink-2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: primary && !disabled ? '0 3px 0 var(--ink-2)' : 'none',
  };
}
