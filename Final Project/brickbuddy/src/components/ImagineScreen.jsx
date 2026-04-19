/**
 * ImagineScreen — The home hub. Three entry points:
 *   1. Talk to Me  — voice → transcript → Confirm → AI generates a custom robot.
 *   2. Show Me     — camera → photo → Retake/Confirm → AI generates from photo.
 *   3. Pick One    — 3 ready-made presets; can also jump to Talk/Show.
 *
 * Voice UX: a single mic button whose icon represents state
 *   - 🎤  empty (waiting for input) → tap to start recording
 *   - ⏹   listening → tap to stop
 *   - 🔄  has transcript → tap to re-record (replaces the old Retry button)
 * The only other control is the central Confirm button, which appears once a
 * transcript exists.
 *
 * AI fallback: if both /api/chat paths fail (throttled free-tier, offline,
 * server down), we generate a custom robot LOCALLY so the child always gets
 * a build. This was added after OpenRouter's free tier kept rate-limiting.
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
import './ImagineScreen.css';

export default function ImagineScreen() {
  const { selectModel, setStage, progress, soundEnabled } = useBuild();
  const [mode, setMode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  const speech = useSpeechRecognition();
  const camera = useCamera();

  useEffect(() => {
    if (camera.isActive) camera.attachVideoToStream();
  }, [camera.isActive, camera.attachVideoToStream]);

  const handleModeSelect = (next) => {
    if (soundEnabled) playClick();
    camera.stopCamera();
    camera.setPhoto(null);
    speech.stopListening();
    speech.resetTranscript();
    speech.clearError();
    camera.clearError();
    setAiResponse('');
    setGenError(null);
    setSelectedPreset(null);
    setMode(next);
  };

  const handleBack = () => {
    camera.stopCamera();
    speech.stopListening();
    setStage('splash');
  };

  /* ───────── Voice flow (single-button icon state) ───────── */
  const hasTranscript = speech.transcript.trim().length > 0;

  const handleMicTap = () => {
    if (soundEnabled) playClick();
    if (speech.isListening) {
      speech.stopListening();
    } else {
      // Either "start fresh" OR "re-record". In both cases, clear state and start.
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
    setAiResponse('Looking at your photo\u2026 \u{1F50D}');
    try {
      const analysis = await analyzePhoto(camera.photo);
      const description = `A robot inspired by this picture. Detected: ${analysis.reason}.`;
      await generateFromText(description, analysis);
    } catch {
      // Even image analysis failed — still fall back to local generation with a
      // generic description so the build flow never dead-ends.
      await generateFromText('a robot inspired by my photo');
    }
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

    // Path 1: full AI geometry. Log any failure — we've been burned too many
    // times by silent fallbacks that leave the user confused about why they
    // got a procedural robot when the API was reachable.
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
      console.warn('[BrickBuddy] Path 1 (full AI geometry) failed:', err?.message || err, err);
    }

    // Path 2: AI blueprint + recolor a preset.
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

    // Path 3: local, offline fallback. ALWAYS succeeds.
    try {
      const custom = generateLocally(text, photoAnalysis);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `A brand-new ${custom.name} ${custom.emoji} — ${custom.description} ` +
        `${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
    } catch (err) {
      // Local can only fail if data/models.js is missing — true last-resort.
      setGenError('Something went wrong. Try Pick One instead!');
      if (import.meta.env.DEV) console.error('[Imagine] all paths failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  /* ───────── Pick One flow ───────── */
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
    (mode === 'pick' && selectedPreset) ||
    (mode === 'voice' && !speech.isListening) ||
    (mode === 'camera' && camera.photo)
  );

  return (
    <div className="imagine-screen" role="main" aria-label="Choose how to start">
      <header className="imagine-header">
        <button className="back-btn" onClick={handleBack} aria-label="Go back to home">
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className="logo-small" aria-hidden="true">Brick<span>Buddy</span></span>
        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stage-label">Stage 1: Imagine</span>
      </header>

      <div className="imagine-content">
        <div className="buddy-chat" role="status" aria-live="polite">
          <div className="buddy-avatar" aria-hidden="true">&#x1F916;</div>
          <div className="buddy-bubble">
            Hi there! &#x1F44B; What robot do you want to build today?<br />
            Pick <strong>Talk to Me</strong>, <strong>Show Me</strong>, or <strong>Pick One</strong>.
          </div>
        </div>

        <div className="input-cards" role="group" aria-label="Choose a mode">
          <button
            className={`input-card ${mode === 'voice' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('voice')}
            aria-pressed={mode === 'voice'}
          >
            <div className="input-icon" aria-hidden="true">&#x1F3A4;</div>
            <h3>Talk to Me</h3>
            <p>Tell me ANY robot &mdash; AI builds it!</p>
          </button>
          <button
            className={`input-card ${mode === 'camera' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('camera')}
            aria-pressed={mode === 'camera'}
          >
            <div className="input-icon" aria-hidden="true">&#x1F4F8;</div>
            <h3>Show Me</h3>
            <p>Snap a photo &mdash; AI builds from it!</p>
          </button>
          <button
            className={`input-card ${mode === 'pick' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('pick')}
            aria-pressed={mode === 'pick'}
          >
            <div className="input-icon" aria-hidden="true">&#x1F9E9;</div>
            <h3>Pick One</h3>
            <p>Choose from 3 ready-to-build robots!</p>
          </button>
        </div>

        {mode === 'voice' && (
          <VoicePanel
            speech={speech}
            generating={generating}
            hasTranscript={hasTranscript}
            onMicTap={handleMicTap}
            onConfirm={handleVoiceConfirm}
          />
        )}

        {mode === 'camera' && (
          <CameraPanel
            camera={camera}
            generating={generating}
            onTake={handleTakePhoto}
            onRetake={handleRetake}
            onConfirm={handlePhotoConfirm}
          />
        )}

        {mode === 'pick' && (
          <PickOnePanel
            presets={robotModels}
            selectedPreset={selectedPreset}
            onPreset={handlePreset}
            onSwitchMode={handleModeSelect}
          />
        )}

        {genError && <p className="warning" role="alert">{genError}</p>}

        {aiResponse && (
          <div className="buddy-chat" role="status" aria-live="polite">
            <div className="buddy-avatar" aria-hidden="true">&#x1F916;</div>
            <div className="buddy-bubble">{aiResponse}</div>
          </div>
        )}

        {showStartBtn && (
          <button className="start-build-btn" onClick={handleStartBuild}>
            Start Building! &#x1F528;
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Voice Panel ─────────────────────── */
function VoicePanel({ speech, generating, hasTranscript, onMicTap, onConfirm }) {
  const micState = speech.isListening
    ? 'listening'
    : hasTranscript
      ? 'has-content'
      : 'empty';
  const micIcon = {
    empty:       '\u{1F3A4}', // 🎤 — waiting for input
    listening:   '\u23F9',    // ⏹  — tap to stop
    'has-content': '\u{1F504}', // 🔄 — tap to re-record
  }[micState];
  const micLabel = {
    empty:       'Start recording',
    listening:   'Stop recording',
    'has-content': 'Re-record',
  }[micState];

  return (
    <section className="voice-panel" aria-label="Voice input">
      {!speech.isSupported && (
        <p className="warning" role="alert">
          Voice isn&apos;t supported in this browser. Try Chrome, Edge, or Safari &mdash; or use <strong>Show Me</strong> / <strong>Pick One</strong>.
        </p>
      )}

      {speech.error && <p className="warning" role="alert">{speech.error}</p>}

      {speech.isSupported && (
        <>
          {speech.isListening && (
            <div className="voice-wave" aria-hidden="true">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          <button
            className={`mic-btn state-${micState}`}
            onClick={onMicTap}
            disabled={generating}
            aria-label={micLabel}
            title={micLabel}
          >
            {micIcon}
          </button>

          {hasTranscript && !speech.isListening && (
            <div className="transcript-box" aria-live="polite">
              &ldquo;{speech.transcript}&rdquo;
            </div>
          )}

          {hasTranscript && !speech.isListening && (
            <button
              className="confirm-btn"
              onClick={onConfirm}
              disabled={generating}
              aria-label="Use this and build"
            >
              {generating ? 'Designing\u2026' : 'Confirm \u2713'}
            </button>
          )}

          {generating && (
            <div className="dream-loading" role="status" aria-live="polite">
              <div className="dream-spinner" aria-hidden="true" />
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ─────────────────────── Camera Panel ─────────────────────── */
function CameraPanel({ camera, generating, onTake, onRetake, onConfirm }) {
  return (
    <section className="camera-panel" aria-label="Camera input">
      {camera.error && (
        <p className="warning" role="alert">
          {camera.error.message}
          {camera.error.code === 'denied' && ' Try "Pick One" if you prefer not to share your camera.'}
        </p>
      )}

      {!camera.isActive && !camera.photo && !camera.isStarting && (
        <button
          className="camera-start-btn"
          onClick={camera.startCamera}
          aria-label={camera.error?.code === 'denied' ? 'Retry opening camera' : 'Open camera'}
        >
          {camera.error?.code === 'denied' ? '\u{1F504} Try Again' : '\u{1F4F7} Open Camera'}
        </button>
      )}

      {camera.isStarting && <p className="voice-status">Asking your browser for camera permission&hellip;</p>}

      {camera.isActive && (
        <>
          <div className="camera-preview">
            <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Camera preview" />
          </div>
          <button className="snap-btn" onClick={onTake} aria-label="Take photo">
            &#x1F4F8;
          </button>
        </>
      )}

      {camera.photo && (
        <div className="photo-preview">
          <img src={camera.photo} alt="Your creation" />
          <div className="confirm-row">
            <button
              className="icon-btn"
              onClick={onRetake}
              disabled={generating}
              aria-label="Retake photo"
              title="Retake photo"
            >
              &#x1F504;
            </button>
            <button
              className="confirm-btn"
              onClick={onConfirm}
              disabled={generating}
              aria-label="Use this photo"
            >
              {generating ? 'Designing\u2026' : 'Confirm \u2713'}
            </button>
          </div>

          {generating && (
            <div className="dream-loading" role="status" aria-live="polite">
              <div className="dream-spinner" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────── Pick One Panel ─────────────────────── */
function PickOnePanel({ presets, selectedPreset, onPreset, onSwitchMode }) {
  return (
    <section className="pick-panel" aria-label="Pick a preset">
      <div className="template-grid" role="group" aria-label="Preset robots">
        {presets.map((model) => (
          <button
            key={model.id}
            className={`template-card ${selectedPreset === model.id ? 'picked' : ''}`}
            onClick={() => onPreset(model)}
            aria-label={`${model.name}, ${model.difficulty}, ${model.pieceCount} pieces`}
            aria-pressed={selectedPreset === model.id}
          >
            <div className="template-emoji" aria-hidden="true">{model.emoji}</div>
            <div className="template-name">{model.name}</div>
            <div className="template-diff">{model.difficulty} &middot; {model.pieceCount} pieces</div>
          </button>
        ))}
      </div>

      <div className="pick-switch-row">
        <button className="pick-switch-btn" onClick={() => onSwitchMode('voice')} aria-label="Switch to Talk to Me">
          &#x1F3A4; Talk to Me
        </button>
        <button className="pick-switch-btn" onClick={() => onSwitchMode('camera')} aria-label="Switch to Show Me">
          &#x1F4F8; Show Me
        </button>
      </div>
    </section>
  );
}
