/**
 * BuildScreen — Stage 2: Step-by-step building instructions + AI chat sidebar.
 * Features emotional support banners and STEAM-tagged chat responses.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import './BuildScreen.css';

// Simple AI response generator based on keywords
function getAIResponse(text) {
  const lower = text.toLowerCase();
  if (lower.includes('why') || lower.includes('fall'))
    return { text: 'Great question! Your robot might fall because of center of gravity. Keep the heavy parts low and the base wide! 🔬', tag: 'science' };
  if (lower.includes('hard') || lower.includes('stuck') || lower.includes('can\'t'))
    return { text: 'Don\'t worry! It\'s totally okay to feel stuck. Let me break it down smaller. You\'ve got this! 💪', tag: null };
  if (lower.includes('help'))
    return { text: 'I\'m right here! Tell me which part is tricky and I\'ll explain differently. No silly questions! 😊', tag: null };
  if (lower.includes('how') || lower.includes('connect') || lower.includes('attach'))
    return { text: 'Press the piece firmly until you hear a click. The studs on top fit into the tubes underneath — that\'s clever engineering! ⚙️', tag: 'engineering' };
  if (lower.includes('sensor') || lower.includes('see') || lower.includes('eye'))
    return { text: 'Robots use sensors as their eyes! Some use cameras, some use infrared light. Your sensor brick is the robot\'s way of seeing! 💻', tag: 'technology' };
  if (lower.includes('color') || lower.includes('look') || lower.includes('pretty'))
    return { text: 'Art and design are huge in robotics! Colors affect how people feel — red = energy, blue = calm. Make your robot express YOU! 🎨', tag: 'art' };
  if (lower.includes('many') || lower.includes('count') || lower.includes('number'))
    return { text: 'Let\'s count! We use symmetry — both sides match like a mirror. That\'s math in action! 🔢', tag: 'math' };
  return { text: 'That\'s interesting! Keep exploring and asking questions — that\'s what scientists do! Want to know more about your robot? 🧪', tag: 'science' };
}

export default function BuildScreen() {
  const { selectedModel, currentStep, nextStep, prevStep, setStage, chatHistory, addChat } = useBuild();
  const [chatInput, setChatInput] = useState('');

  if (!selectedModel) return null;
  const step = selectedModel.steps[currentStep];
  const isLastStep = currentStep === selectedModel.steps.length - 1;

  const handleSend = () => {
    if (!chatInput.trim()) return;
    addChat('child', chatInput);
    const response = getAIResponse(chatInput);
    setTimeout(() => addChat('buddy', response.text, response.tag), 800);
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
          <div className="progress-fill" style={{ width: `${30 + (currentStep / selectedModel.steps.length) * 40}%` }} />
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

          <div className="step-visual">
            <div className="lego-preview">{step.emoji}</div>
            <div className="label-3d">3D View</div>
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
