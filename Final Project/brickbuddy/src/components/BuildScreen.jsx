/**
 * BuildScreen — Stage 2: Step-by-step building instructions + AI chat sidebar.
 *
 * The chat is the modification surface. When the child types something like
 * "make it blue" or "redo step 3", the message is handled as a model-change
 * intent (not a normal Q&A). All other messages fall through to the AI/rules
 * chat engine. The standalone "Edit This Step" button has been removed — all
 * editing happens through chat as requested.
 */
import { useState, useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { getSmartAIResponse, getStepWelcome, hasAIKey } from '../services/chatEngine';
import { regenerateStep } from '../services/aiService';
import {
  detectModIntent, recolorFromText, applyChatModification, generateLocally,
} from '../services/localRobotGen';
import { playClick, playStepComplete, playChatReceive } from '../services/soundEffects';
import LegoViewer3D from './LegoViewer3D';
import './BuildScreen.css';

export default function BuildScreen() {
  const {
    selectedModel, currentStep, setCurrentStep, nextStep, prevStep, setStage,
    chatHistory, addChat, progress, soundEnabled,
    setSelectedModel, updateSelectedModel,
  } = useBuild();
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (prevStepRef.current !== currentStep && selectedModel) {
      const welcome = getStepWelcome(selectedModel, currentStep);
      if (welcome) addChat('buddy', welcome.text, welcome.tag);
    }
    prevStepRef.current = currentStep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedModel]);

  if (!selectedModel) {
    return (
      <div className="build-screen" role="alert">
        <div className="build-header">
          <button className="back-btn" onClick={() => setStage('imagine')} aria-label="Go back">&larr;</button>
          <span className="logo-small">Brick<span>Buddy</span></span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No robot selected. Let&apos;s go pick one!</p>
          <button className="step-btn next" onClick={() => setStage('imagine')} style={{ marginTop: 16 }}>
            Choose a Robot
          </button>
        </div>
      </div>
    );
  }

  const step = selectedModel.steps[currentStep];
  const isLastStep = currentStep === selectedModel.steps.length - 1;

  /* ───────── Chat handler with in-chat model modification ───────── */
  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || isTyping) return;
    addChat('child', text);
    if (soundEnabled) playClick();
    setChatInput('');
    setIsTyping(true);

    try {
      // 1. Detect a modification intent first.
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
          return;
        }
        // If we couldn't find colors, fall through to normal chat.
      }

      if (
        intent?.kind === 'scale' ||
        intent?.kind === 'add-feature' ||
        intent?.kind === 'remove-feature'
      ) {
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
          return;
        }
        // Fall through if no change was actually applied.
      }

      if (intent?.kind === 'rebuild') {
        const fresh = generateLocally(text);
        // Preserve the user's preferred name unless the new prompt clearly named something else.
        setSelectedModel(fresh);
        setCurrentStep(0);
        if (soundEnabled) playStepComplete();
        addChat(
          'buddy',
          `Rebuilt your robot from scratch as a ${fresh.name} ${fresh.emoji} — ${fresh.steps.length} steps, ${fresh.pieceCount} pieces. Let\u2019s build it!`,
          'engineering',
        );
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
          // AI step regen failed — fall back to procedurally swapping the step's
          // bricks for a small variation so the user sees SOMETHING change.
          updateSelectedModel((m) => proceduralStepShuffle(m, intent.stepIndex));
          if (soundEnabled) playStepComplete();
          addChat(
            'buddy',
            `Reshaped step ${intent.stepIndex + 1} locally — the AI was busy, so I swapped the bricks myself.`,
            'engineering',
          );
        }
        return;
      }

      // 2. Not a modification — normal Q&A chat.
      const response = await getSmartAIResponse(text, selectedModel, currentStep, chatHistory);
      addChat('buddy', response.text, response.tag);
      if (soundEnabled) playChatReceive();
    } finally {
      setIsTyping(false);
    }
  };

  // Local fallback for "redo step N" when the AI is unavailable: nudge each
  // brick in that step a little and rotate its color — enough that the
  // 3D view's "newly placed" pulse highlights something visibly different.
  function proceduralStepShuffle(model, stepIndex) {
    const copy = structuredClone(model);
    const step = copy.steps[stepIndex];
    if (!step?.newParts?.length) return copy;
    const palette = collectPalette(copy.steps);
    step.newParts = step.newParts.map((p, i) => {
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
    for (const s of steps) for (const p of s.newParts || []) seen.add(p.color);
    return Array.from(seen);
  }

  const handleNext = () => {
    if (soundEnabled) playStepComplete();
    if (isLastStep) setStage('learn');
    else nextStep();
  };

  const handlePrev = () => {
    if (soundEnabled) playClick();
    prevStep();
  };

  return (
    <div className="build-screen" role="main" aria-label={`Building ${selectedModel.name}`}>
      <header className="build-header">
        <button className="back-btn" onClick={() => setStage('imagine')} aria-label="Go back to model selection">
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className="logo-small" aria-hidden="true">Brick<span>Buddy</span></span>
        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Build progress: ${progress}%`}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stage-label">Step {step.num}/{selectedModel.steps.length}</span>
      </header>

      <div className="build-layout">
        <section className="instruction-panel" aria-label="Build instructions">
          {step.tip && (
            <div className="emotion-banner" role="note">
              <span className="emotion-emoji" aria-hidden="true">&#x1F4AA;</span>
              <span>{step.tip}</span>
            </div>
          )}

          <div className="step-header">
            <div className="step-number" aria-hidden="true">{step.num}</div>
            <h2 className="step-title">{step.title}</h2>
          </div>

          <div className="step-visual viewer-3d" aria-label={`3D view of ${selectedModel.name} at step ${step.num}`}>
            <LegoViewer3D model={selectedModel} currentStep={currentStep} />
            <div className="label-3d" aria-hidden="true">3D View &mdash; Drag to Rotate</div>
          </div>

          <div className="step-description" dangerouslySetInnerHTML={{ __html: step.desc }} />

          <div className="pieces-heading">
            <span aria-hidden="true">&#x1F9F1;</span>
            <span>Pieces You Need</span>
          </div>
          <div className="pieces-needed" role="list" aria-label="Pieces needed for this step">
            {step.pieces.map((p, i) => (
              <div key={i} className="piece" role="listitem">
                <div className="piece-dot" style={{ background: p.color }} aria-hidden="true" />
                {p.name}
              </div>
            ))}
          </div>

          <nav className="step-nav" aria-label="Step navigation">
            <button className="step-btn prev" onClick={handlePrev} disabled={currentStep === 0} aria-label="Previous step">
              &larr; Previous
            </button>
            <button className="step-btn next" onClick={handleNext} aria-label={isLastStep ? 'Finish building' : 'Next step'}>
              {isLastStep ? 'Finish! \u{1F389}' : 'Next Step \u2192'}
            </button>
          </nav>
        </section>

        <aside className="chat-sidebar" aria-label="Chat with BrickBuddy">
          <div className="chat-header">
            &#x1F4AC; Ask BrickBuddy
            {hasAIKey() && <span className="ai-badge" title="Powered by live AI">AI</span>}
          </div>
          <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
            <div className="chat-msg from-buddy">
              <div className="chat-avatar" aria-hidden="true">&#x1F916;</div>
              <div className="chat-text">
                Hey! I&apos;m here to help you build your {selectedModel.name} {selectedModel.emoji}! Ask me anything, or say something like <em>&ldquo;make it blue&rdquo;</em> or <em>&ldquo;redo step 3&rdquo;</em> to change the model. &#x1F60A;
              </div>
            </div>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-msg from-${msg.role === 'child' ? 'child' : 'buddy'}`}>
                <div className="chat-avatar" aria-hidden="true">{msg.role === 'child' ? '\u{1F466}' : '\u{1F916}'}</div>
                <div>
                  <div className="chat-text">{msg.text}</div>
                  {msg.steamTag && (
                    <span className={`steam-badge ${msg.steamTag}`} aria-label={`${msg.steamTag} topic`}>
                      {msg.steamTag === 'science' && '\u{1F52C} Science'}
                      {msg.steamTag === 'technology' && '\u{1F4BB} Technology'}
                      {msg.steamTag === 'engineering' && '\u2699\uFE0F Engineering'}
                      {msg.steamTag === 'art' && '\u{1F3A8} Art'}
                      {msg.steamTag === 'math' && '\u{1F522} Math'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-msg from-buddy typing" aria-live="polite">
                <div className="chat-avatar" aria-hidden="true">&#x1F916;</div>
                <div className="chat-text typing-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-bar">
            <input
              className="chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isTyping ? 'BrickBuddy is thinking...' : 'Ask a question or change the model...'}
              disabled={isTyping}
              aria-label="Message BrickBuddy"
            />
            <button className="chat-send" onClick={handleSend} disabled={isTyping} aria-label="Send message">&#x27A4;</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
