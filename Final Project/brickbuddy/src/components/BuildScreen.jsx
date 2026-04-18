/**
 * BuildScreen — Stage 2: Step-by-step building instructions + AI chat sidebar.
 * Features 3D viewer, emotional support banners, STEAM-tagged chat, sound effects,
 * and accessible controls.
 */
import { useState, useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { getSmartAIResponse, getStepWelcome, hasAIKey } from '../services/chatEngine';
import { regenerateStep } from '../services/aiService';
import { playClick, playStepComplete, playChatReceive } from '../services/soundEffects';
import LegoViewer3D from './LegoViewer3D';
import StepEditor from './StepEditor';
import './BuildScreen.css';

export default function BuildScreen() {
  const {
    selectedModel, currentStep, nextStep, prevStep, setStage,
    chatHistory, addChat, progress, soundEnabled,
    updateStepParts, updateSelectedModel,
  } = useBuild();
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const chatEndRef = useRef(null);
  const prevStepRef = useRef(currentStep);

  // Auto-scroll chat to bottom (scoped to chat container, not page)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatHistory, isTyping]);

  // Send welcome message when step changes
  useEffect(() => {
    if (prevStepRef.current !== currentStep && selectedModel) {
      const welcome = getStepWelcome(selectedModel, currentStep);
      if (welcome) addChat('buddy', welcome.text, welcome.tag);
    }
    prevStepRef.current = currentStep;
  }, [currentStep, selectedModel]);

  if (!selectedModel) {
    return (
      <div className="build-screen" role="alert">
        <div className="build-header">
          <button className="back-btn" onClick={() => setStage('imagine')} aria-label="Go back">&larr;</button>
          <span className="logo-small">Brick<span>Buddy</span></span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No robot selected. Let's go pick one!</p>
          <button className="step-btn next" onClick={() => setStage('imagine')} style={{ marginTop: 16 }}>
            Choose a Robot
          </button>
        </div>
      </div>
    );
  }

  const step = selectedModel.steps[currentStep];
  const isLastStep = currentStep === selectedModel.steps.length - 1;

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || isTyping) return;
    addChat('child', text);
    if (soundEnabled) playClick();
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await getSmartAIResponse(text, selectedModel, currentStep, chatHistory);
      addChat('buddy', response.text, response.tag);
      if (soundEnabled) playChatReceive();
    } finally {
      setIsTyping(false);
    }
  };

  const handleNext = () => {
    if (soundEnabled) playStepComplete();
    if (isLastStep) setStage('learn');
    else nextStep();
  };

  const handlePrev = () => {
    if (soundEnabled) playClick();
    prevStep();
  };

  // ─── Editor actions (apply immutable updates to the current step's parts) ─
  const deletePart = (partIndex) => {
    if (soundEnabled) playClick();
    updateStepParts(currentStep, (parts) => parts.filter((_, i) => i !== partIndex));
  };

  const recolorPart = (partIndex, newColor) => {
    updateStepParts(currentStep, (parts) =>
      parts.map((p, i) => (i === partIndex ? { ...p, color: newColor } : p)),
    );
  };

  const addPart = (newPart) => {
    if (soundEnabled) playClick();
    updateStepParts(currentStep, (parts) => [...parts, newPart]);
  };

  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState(null);
  const regenerateCurrentStep = async () => {
    setRegenError(null);
    setRegenerating(true);
    try {
      const fresh = await regenerateStep(selectedModel, currentStep);
      updateSelectedModel((m) => {
        const copy = structuredClone(m);
        copy.steps[currentStep] = { ...copy.steps[currentStep], ...fresh };
        return copy;
      });
      if (soundEnabled) playStepComplete();
    } catch (err) {
      setRegenError("Couldn't regenerate that step right now. Try again in a moment.");
      if (import.meta.env.DEV) console.warn('[regen]', err);
    } finally {
      setRegenerating(false);
    }
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
        {/* Left: Instructions */}
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
            <LegoViewer3D modelId={selectedModel.id} currentStep={currentStep} />
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

          {editorOpen && (
            <StepEditor
              parts={step.newParts || []}
              onDelete={deletePart}
              onRecolor={recolorPart}
              onAdd={addPart}
              onRegenerate={regenerateCurrentStep}
              regenerating={regenerating}
              error={regenError}
              primaryColor={selectedModel.color}
            />
          )}

          <div className="edit-toggle-row">
            <button
              className={`edit-toggle-btn ${editorOpen ? 'open' : ''}`}
              onClick={() => setEditorOpen((v) => !v)}
              aria-expanded={editorOpen}
              aria-label={editorOpen ? 'Close step editor' : 'Open step editor'}
            >
              {editorOpen ? '\u2715 Close Editor' : '\u{1F6E0} Edit This Step'}
            </button>
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

        {/* Right: Chat */}
        <aside className="chat-sidebar" aria-label="Chat with BrickBuddy">
          <div className="chat-header">
            &#x1F4AC; Ask BrickBuddy
            {hasAIKey() && <span className="ai-badge" title="Powered by live AI">AI</span>}
          </div>
          <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
            <div className="chat-msg from-buddy">
              <div className="chat-avatar" aria-hidden="true">&#x1F916;</div>
              <div className="chat-text">
                Hey! I'm here to help you build your {selectedModel.name} {selectedModel.emoji}! Ask me anything about the build or about how robots work! &#x1F60A;
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
              placeholder={isTyping ? 'BrickBuddy is thinking...' : 'Ask a question...'}
              disabled={isTyping}
              aria-label="Type a question for BrickBuddy"
            />
            <button className="chat-send" onClick={handleSend} disabled={isTyping} aria-label="Send message">&#x27A4;</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
