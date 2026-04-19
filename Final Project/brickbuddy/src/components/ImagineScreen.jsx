/**
 * ImagineScreen — Redesigned entry. One headline, three modes (Talk / Type / Show)
 * plus a row of preset cards below. The underlying AI-generation pipeline
 * (full geometry → recolor blueprint → local fallback) is preserved — only the
 * surface layer is new.
 */
import { useEffect, useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { robotModels } from '../data/models';
import { analyzePhoto } from '../services/imageAnalyzer';
import { generateFullRobot, generateCustomRobot, customizeModel } from '../services/aiService';
import { generateLocally } from '../services/localRobotGen';
import { playClick, playSuccess } from '../services/soundEffects';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import { BuddyFace, VoiceWave, TypingDots } from '../design/Buddy';
import { Btn, Card, Chip, Display, Kicker, PieceDot, TopBar } from '../design/UI';

const MODES = [
  { k: 'voice',  label: '\u{1F3A4} Talk' },
  { k: 'text',   label: '\u2328\uFE0F Type' },
  { k: 'camera', label: '\u{1F4F8} Show' },
];

export default function ImagineScreen() {
  const { selectModel, setStage, soundEnabled } = useBuild();
  const [mode, setMode] = useState('voice');
  const [typed, setTyped] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  const speech = useSpeechRecognition();
  const camera = useCamera();

  useEffect(() => {
    if (camera.isActive) camera.attachVideoToStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.isActive, camera.attachVideoToStream]);

  const hasTranscript = speech.transcript.trim().length > 0;

  const resetAll = () => {
    camera.stopCamera();
    camera.setPhoto(null);
    camera.clearError();
    speech.stopListening();
    speech.resetTranscript();
    speech.clearError();
    setAiResponse('');
    setGenError(null);
    setSelectedPreset(null);
    setTyped('');
  };

  const handleModeSelect = (next) => {
    if (soundEnabled) playClick();
    resetAll();
    setMode(next);
  };

  const handleBack = () => {
    resetAll();
    setStage('splash');
  };

  /* ───────── Shared AI-generation path ───────── */
  const generateFromText = async (text, photoAnalysis = null) => {
    if (!text) {
      setGenError("I didn't catch that. Try again!");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setAiResponse('Designing your robot\u2026');

    const prompt = photoAnalysis
      ? `${text} (Hint: looks closest to a ${photoAnalysis.modelId}.)`
      : text;

    try {
      const custom = await generateFullRobot(prompt);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `I made a ${custom.name} ${custom.emoji} just for you! ` +
        `${custom.description} ${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
      setGenerating(false);
      return;
    } catch (err) {
      console.warn('[BrickBuddy] Path 1 (full AI geometry) failed:', err?.message || err);
    }

    try {
      const blueprint = await generateCustomRobot(prompt);
      const base = robotModels.find((m) => m.id === blueprint.template) || robotModels[0];
      const custom = customizeModel(base, blueprint);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `Here's a ${custom.name} ${custom.emoji} inspired by your idea! ${custom.description} ` +
        `It has ${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
      setGenerating(false);
      return;
    } catch (err) {
      console.warn('[BrickBuddy] Path 2 (recolor preset) failed:', err?.message || err);
    }

    try {
      const custom = generateLocally(text, photoAnalysis);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `A brand-new ${custom.name} ${custom.emoji} — ${custom.description} ` +
        `${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
    } catch (err) {
      setGenError('Something went wrong. Try Pick One instead!');
      if (import.meta.env.DEV) console.error('[Imagine] all paths failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  /* ───────── Voice flow ───────── */
  const handleMicTap = () => {
    if (soundEnabled) playClick();
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.resetTranscript();
      speech.clearError();
      setAiResponse('');
      setGenError(null);
      speech.startListening();
    }
  };

  const handleVoiceConfirm = async () => {
    if (soundEnabled) playClick();
    speech.stopListening();
    await generateFromText(speech.transcript.trim());
  };

  /* ───────── Text flow ───────── */
  const handleTextConfirm = async () => {
    if (soundEnabled) playClick();
    await generateFromText(typed.trim());
  };

  /* ───────── Camera flow ───────── */
  const handleTakePhoto = () => {
    const dataUrl = camera.takePhoto();
    if (!dataUrl) return;
    if (soundEnabled) playClick();
  };

  const handleRetake = () => {
    if (soundEnabled) playClick();
    camera.setPhoto(null);
    setAiResponse('');
    setGenError(null);
    camera.startCamera();
  };

  const handlePhotoConfirm = async () => {
    if (!camera.photo) return;
    if (soundEnabled) playClick();
    setGenerating(true);
    setGenError(null);
    setAiResponse('Looking at your photo\u2026');
    try {
      const analysis = await analyzePhoto(camera.photo);
      const description = `A robot inspired by this picture. Detected: ${analysis.reason}.`;
      await generateFromText(description, analysis);
    } catch {
      await generateFromText('a robot inspired by my photo');
    }
  };

  /* ───────── Preset flow ───────── */
  const handlePreset = (model) => {
    if (soundEnabled) playClick();
    setSelectedPreset(model.id);
    selectModel(model.id);
    if (soundEnabled) playSuccess();
    setAiResponse(
      `A ${model.name} ${model.emoji} — great choice! ${model.description} ` +
      `${model.pieceCount} pieces across ${model.steps.length} steps. Ready to build?`,
    );
  };

  const handleStartBuild = () => {
    camera.stopCamera();
    speech.stopListening();
    if (soundEnabled) playSuccess();
    setStage('build');
  };

  const showStartBtn = aiResponse && !generating && !genError && (
    selectedPreset ||
    (mode === 'voice' && hasTranscript) ||
    (mode === 'text' && typed.trim()) ||
    (mode === 'camera' && camera.photo)
  );

  return (
    <div className="bb-screen" role="main" aria-label="Choose how to start">
      <TopBar onBack={handleBack} progressLabel="STAGE 1 · IMAGINE">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip bg="var(--live-soft)" color="var(--live)">
            <BuddyFace size={18} state="listening" />&nbsp;Buddy is ready
          </Chip>
        </div>
      </TopBar>

      <div style={{
        flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: '12px 20px 16px',
        background: 'radial-gradient(ellipse at 50% 0%, #FFE0CC 0%, #FFF6EC 60%)',
        overflow: 'hidden',
      }}>
        <div style={{ width: '100%', maxWidth: 900, display: 'grid', gap: 14, justifyItems: 'center' }}>
          <Display size="md" style={{ textAlign: 'center' }}>
            What do you want to build{' '}
            <span style={{ color: 'var(--brick-red)' }}>today?</span>
          </Display>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, padding: 4, background: 'rgba(26,20,16,0.06)', borderRadius: 999 }}>
            {MODES.map(o => (
              <button
                key={o.k}
                onClick={() => handleModeSelect(o.k)}
                aria-pressed={mode === o.k}
                style={{
                  padding: '10px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14,
                  background: mode === o.k ? 'var(--card)' : 'transparent',
                  color: mode === o.k ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: mode === o.k ? '0 2px 8px rgba(26,20,16,0.1)' : 'none',
                }}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={{ width: '100%', display: 'grid', placeItems: 'center', gap: 10 }}>
            {mode === 'voice' && (
              <VoicePrimary
                speech={speech}
                generating={generating}
                hasTranscript={hasTranscript}
                onMicTap={handleMicTap}
                onConfirm={handleVoiceConfirm}
              />
            )}
            {mode === 'text' && (
              <TextPrimary
                value={typed} setValue={setTyped}
                onConfirm={handleTextConfirm}
                thinking={generating}
              />
            )}
            {mode === 'camera' && (
              <PhotoPrimary
                camera={camera}
                generating={generating}
                onTake={handleTakePhoto}
                onRetake={handleRetake}
                onConfirm={handlePhotoConfirm}
              />
            )}
          </div>

          {/* Presets */}
          <div style={{ width: '100%', marginTop: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <Kicker color="var(--ink-3)">or start from a template</Kicker>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}>
              {robotModels.map(m => (
                <PresetCard
                  key={m.id}
                  model={m}
                  picked={selectedPreset === m.id}
                  onPick={() => handlePreset(m)}
                />
              ))}
            </div>
          </div>

          {genError && (
            <p role="alert" style={{
              color: 'var(--warn)', background: 'rgba(224,112,27,0.08)',
              padding: '10px 14px', borderRadius: 12, margin: 0, fontWeight: 600,
            }}>{genError}</p>
          )}

          {aiResponse && (
            <Card pad={16} style={{ display: 'flex', gap: 12, maxWidth: 620 }}>
              <BuddyFace size={42} state="speaking" />
              <div style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--ink)' }}>
                {aiResponse}
              </div>
            </Card>
          )}

          {showStartBtn && (
            <Btn variant="brick" size="lg" onClick={handleStartBuild}
              icon={<span>&#x1F528;</span>} aria-label="Start building">
              Start Building
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Voice primary ───────── */
function VoicePrimary({ speech, generating, hasTranscript, onMicTap, onConfirm }) {
  const active = speech.isListening;
  const state = active ? 'listening' : hasTranscript ? 'has-content' : generating ? 'thinking' : 'idle';

  return (
    <Card pad={16} style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 10, justifyItems: 'center' }}>
      {!speech.isSupported && (
        <p role="alert" style={{ color: 'var(--warn)', margin: 0, textAlign: 'center', fontSize: 13 }}>
          Voice isn&apos;t supported here. Try Chrome, Edge, or Safari — or use Type / Show.
        </p>
      )}
      {speech.error && (
        <p role="alert" style={{ color: 'var(--warn)', margin: 0, textAlign: 'center', fontSize: 13 }}>
          {speech.error}
        </p>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={onMicTap}
          disabled={generating || !speech.isSupported}
          aria-label={active ? 'Stop listening' : hasTranscript ? 'Re-record' : 'Start talking'}
          style={{
            width: 84, height: 84, borderRadius: 999,
            background: active ? 'var(--live)' : generating ? 'var(--ink-3)' : 'var(--brick-red)',
            color: '#FFF', fontSize: 32,
            boxShadow: active
              ? '0 6px 0 #1E4FC4, 0 0 0 10px rgba(47,111,235,0.14)'
              : '0 6px 0 var(--brick-red-d), 0 12px 28px rgba(225,79,59,0.3)',
            display: 'grid', placeItems: 'center', position: 'relative',
          }}>
          {active ? '\u23F9' : hasTranscript ? '\u{1F504}' : '\u{1F3A4}'}
          {active && <>
            <span style={{ position: 'absolute', inset: -8, borderRadius: 999, border: '2px solid rgba(47,111,235,0.5)', animation: 'pulseRing 1.4s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: -8, borderRadius: 999, border: '2px solid rgba(47,111,235,0.35)', animation: 'pulseRing 1.4s 0.5s ease-out infinite' }} />
          </>}
        </button>
      </div>

      {state === 'listening' && <VoiceWave active />}
      {state === 'idle' && (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Tap the mic and say what you want to build
        </div>
      )}
      {hasTranscript && (
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)',
          textAlign: 'center', maxWidth: 500, lineHeight: 1.3, letterSpacing: '-0.02em',
        }}>
          &ldquo;{speech.transcript}{active && <span style={{ animation: 'fadeIn 0.5s infinite alternate', color: 'var(--live)' }}>|</span>}&rdquo;
        </div>
      )}
      {hasTranscript && !active && !generating && (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" size="md" onClick={onMicTap}>Try again</Btn>
          <Btn variant="brick"   size="md" onClick={onConfirm} icon="✓">Build this</Btn>
        </div>
      )}
      {generating && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--live)', fontWeight: 600 }}>
          <TypingDots /> Designing your robot&hellip;
        </div>
      )}
    </Card>
  );
}

/* ───────── Text primary ───────── */
function TextPrimary({ value, setValue, onConfirm, thinking }) {
  return (
    <Card pad={24} style={{ width: '100%', maxWidth: 620 }}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. A friendly robot dog with a drum on its back"
        aria-label="Describe the robot you want to build"
        style={{
          width: '100%', minHeight: 90, border: 'none', outline: 'none',
          fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: 'var(--ink)',
          resize: 'none', background: 'transparent', lineHeight: 1.4,
        }}
        autoFocus
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <Btn variant="brick" size="md" onClick={onConfirm} disabled={!value.trim() || thinking}>
          {thinking ? <><TypingDots /> Building…</> : 'Build this →'}
        </Btn>
      </div>
    </Card>
  );
}

/* ───────── Photo primary (real camera) ───────── */
// The videoRef on the camera hook has to flow into the <video> element and
// reads happen during layout — React's rules-of-refs lint mistakenly flags
// the whole `camera` object as ref-touched during render, so disable it here.
/* eslint-disable react-hooks/refs */
function PhotoPrimary({ camera, generating, onTake, onRetake, onConfirm }) {
  return (
    <Card pad={24} style={{ width: '100%', maxWidth: 620, display: 'grid', gap: 12 }}>
      {camera.error && (
        <p role="alert" style={{ color: 'var(--warn)', margin: 0, textAlign: 'center' }}>
          {camera.error.message}
        </p>
      )}

      <div style={{
        aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden',
        background: camera.photo
          ? 'linear-gradient(135deg, #FDEAD5, #FFE0CC)'
          : camera.isActive
            ? '#1A1410'
            : 'repeating-linear-gradient(45deg, #FBF2E5, #FBF2E5 10px, #F4E5D0 10px, #F4E5D0 20px)',
        border: '2px dashed var(--rule-2)', position: 'relative',
        display: 'grid', placeItems: 'center',
      }}>
        {camera.photo ? (
          <img src={camera.photo} alt="Your creation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : camera.isActive ? (
          <video
            ref={camera.videoRef}
            autoPlay playsInline muted
            aria-label="Camera preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 44 }}>&#x1F4F7;</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>Show Buddy what you want</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!camera.isActive && !camera.photo && (
          <Btn variant="primary" onClick={camera.startCamera} icon="📷" disabled={camera.isStarting}>
            {camera.isStarting ? 'Opening camera…' : 'Open Camera'}
          </Btn>
        )}
        {camera.isActive && (
          <Btn variant="brick" onClick={onTake} icon="📸">Capture</Btn>
        )}
        {camera.photo && (
          <>
            <Btn variant="outline" onClick={onRetake}>Retake</Btn>
            <Btn variant="brick" onClick={onConfirm} disabled={generating}>
              {generating ? 'Reading…' : 'Build this →'}
            </Btn>
          </>
        )}
      </div>
    </Card>
  );
}

/* ───────── Preset card ───────── */
function PresetCard({ model, picked, onPick }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={picked}
      style={{
        padding: 12, borderRadius: 14,
        background: picked ? 'rgba(225,79,59,0.08)' : 'var(--card)',
        border: `1px solid ${picked ? 'var(--brick-red)' : 'var(--rule)'}`,
        boxShadow: picked ? 'var(--shadow-2)' : 'var(--shadow-1)',
        textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 4,
        transition: 'transform 0.12s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = picked ? 'var(--shadow-2)' : 'var(--shadow-1)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 30 }}>{model.emoji}</span>
        <Chip bg={`${model.color || '#E14F3B'}22`} color={model.color || '#E14F3B'}>{model.difficulty || 'Easy'}</Chip>
      </div>
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{model.name}</div>
      <div style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
        <PieceDot color={model.color || '#E14F3B'} />
        {model.pieceCount} pieces &middot; {model.steps.length} steps
      </div>
    </button>
  );
}
