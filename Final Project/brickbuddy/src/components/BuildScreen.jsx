/**
 * BuildScreen — Stage 2: Step-by-step building instructions + AI chat sidebar.
 * Features emotional support banners and STEAM-tagged chat responses.
 */
import { useState, useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { getAIResponse, getStepWelcome } from '../services/chatEngine';
import LegoViewer3D from './LegoViewer3D';
import './BuildScreen.css';

export default function BuildScreen() {
  const { selectedModel, currentStep, nextStep, prevStep, setStage, chatHistory, addChat, progress } = useBuild();
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const prevStepRef = useRef(currentStep);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Send welcome message when step changes
  useEffect(() => {
    if (prevStepRef.current !== currentStep && selectedModel) {
      const welcome = getStepWelcome(selectedModel, currentStep);
      if (welcome) addChat('buddy', welcome.text, welcome.tag);
    }
    prevStepRef.current = currentStep;
  }, [currentStep, selectedModel]);

  if (!selectedModel) return null;
  const step = selectedModel.steps[currentStep];
  const isLastStep = currentStep === selectedModel.steps.length - 1;

  const handleSend = () => {
    if (!chatInput.trim()) return;
    addChat('child', chatInput);
    const response = getAIResponse(chatInput, selectedModel, currentStep);
    setTimeout(() => addChat('buddy', response.text, response.tag), 600);
    setChatInput('');
  };

  const handleNext = () => {
    if (isLastStep) setStage('learn');
    else nextStep();
  };

  return (
    <div className="build-screen">
      <div className="build-header">
        <button className="back-btn" onClick={() => setStage('imagine')}>←</button>
        <span className="logo-small">Brick<span>Buddy</span></span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stage-label">Stage 2: Build</span>
      </div>

      <div className="build-layout">
        {/* Left: Instructions */}
        <div className="instruction-panel">
          {step.tip && (
            <div className="emotion-banner">
              <span className="emotion-emoji">💪</span>
              <span>{step.tip}</span>
            </div>
          )}

          <div className="step-header">
            <div className="step-number">{step.num}</div>
            <div className="step-title">{step.title}</div>
          </div>

          <div className="step-visual viewer-3d">
            <LegoViewer3D modelId={selectedModel.id} currentStep={currentStep} />
            <div className="label-3d">3D View — Drag to Rotate</div>
          </div>

          <div className="step-description" dangerouslySetInnerHTML={{ __html: step.desc }} />

          <div className="pieces-needed">
            {step.pieces.map((p, i) => (
              <div key={i} className="piece">
                <div className="piece-dot" style={{ background: p.color }} />
                {p.name}
              </div>
            ))}
          </div>

          <div className="step-nav">
            <button className="step-btn prev" onClick={prevStep} disabled={currentStep === 0}>
              ← Previous
            </button>
            <button className="step-btn next" onClick={handleNext}>
              {isLastStep ? 'Finish! 🎉' : 'Next Step →'}
            </button>
          </div>
        </div>

        {/* Right: Chat */}
        <div className="chat-sidebar">
          <div className="chat-header">💬 Ask BrickBuddy</div>
          <div className="chat-messages">
            <div className="chat-msg from-buddy">
              <div className="chat-avatar">🤖</div>
              <div className="chat-text">I'm here to help! Ask me anything about the build or about how robots work! 😊</div>
            </div>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-msg from-${msg.role === 'child' ? 'child' : 'buddy'}`}>
                <div className="chat-avatar">{msg.role === 'child' ? '👦' : '🤖'}</div>
                <div>
                  <div className="chat-text">{msg.text}</div>
                  {msg.steamTag && (
                    <span className={`steam-badge ${msg.steamTag}`}>
                      {msg.steamTag === 'science' && '🔬 Science'}
                      {msg.steamTag === 'technology' && '💻 Technology'}
                      {msg.steamTag === 'engineering' && '⚙️ Engineering'}
                      {msg.steamTag === 'art' && '🎨 Art'}
                      {msg.steamTag === 'math' && '🔢 Math'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-bar">
            <input
              className="chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
            />
            <button className="chat-send" onClick={handleSend}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
