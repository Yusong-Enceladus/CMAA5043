/**
 * ImagineScreen — Stage 1: Children describe their robot idea.
 * Supports 3 input modes: Voice (Web Speech API), Camera, Template selection.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { robotModels } from '../data/models';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import './ImagineScreen.css';

export default function ImagineScreen() {
  const { selectModel, setStage, addChat } = useBuild();
  const [inputMode, setInputMode] = useState(null); // 'voice' | 'camera' | 'template'
  const [childInput, setChildInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const speech = useSpeechRecognition();
  const camera = useCamera();

  // Handle voice recording toggle
  const handleVoiceToggle = () => {
    if (speech.isListening) {
      speech.stopListening();
      // After stopping, use the transcript
      setTimeout(() => {
        if (speech.transcript) {
          setChildInput(speech.transcript);
          processInput(speech.transcript);
        }
      }, 500);
    } else {
      speech.resetTranscript();
      speech.startListening();
    }
  };

  // Handle camera photo
  const handlePhoto = () => {
    camera.takePhoto();
    setChildInput('(Showed a photo of their LEGO idea)');
    processInput('photo');
  };

  // Handle template selection
  const handleTemplate = (model) => {
    setChildInput(`I want to build a ${model.name}!`);
    selectModel(model.id);
    setAiResponse(`Amazing choice! A ${model.name} ${model.emoji} — I love it! It uses ${model.pieceCount} pieces. Ready to start building?`);
  };

  // Simple AI processing of child's input
  const processInput = (input) => {
    const lower = input.toLowerCase();
    if (lower.includes('dog') || lower.includes('puppy') || lower.includes('walk')) {
      selectModel('dog');
      setAiResponse('Awesome! A Robot Dog 🐶 that can walk — I love it! Let\'s build it together!');
    } else if (lower.includes('car') || lower.includes('race') || lower.includes('fast') || lower.includes('drive')) {
      selectModel('car');
      setAiResponse('A Robot Car 🏎️ — great choice! Let\'s make it super fast!');
    } else if (lower.includes('dino') || lower.includes('dinosaur') || lower.includes('rex')) {
      selectModel('dino');
      setAiResponse('A Dino Bot 🦕 — ROAR! That\'s going to be epic!');
    } else {
      // Default to dog for unrecognized input
      selectModel('dog');
      setAiResponse('That sounds amazing! Let me help you build a Robot Dog 🐶 to start — we can customize it to match your idea!');
    }
  };

  return (
    <div className="imagine-screen">
      <div className="imagine-header">
        <button className="back-btn" onClick={() => setStage('splash')}>←</button>
        <span className="logo-small">Brick<span>Buddy</span></span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: '20%' }} /></div>
        <span className="stage-label">Stage 1: Imagine</span>
      </div>

      <div className="imagine-content">
        {/* Buddy greeting */}
        <div className="buddy-chat">
          <div className="buddy-avatar">🤖</div>
          <div className="buddy-bubble">
            Hi there, little builder! 👋<br />
            What kind of robot do you want to build today?
            You can <strong>tell me</strong>, <strong>show me</strong>, or <strong>pick one below</strong>!
          </div>
        </div>

        {/* Input mode cards */}
        <div className="input-cards">
          <div className={`input-card ${inputMode === 'voice' ? 'selected' : ''}`}
               onClick={() => setInputMode('voice')}>
            <div className="input-icon">🎤</div>
            <h3>Talk to Me</h3>
            <p>Describe your dream robot!</p>
          </div>
          <div className={`input-card ${inputMode === 'camera' ? 'selected' : ''}`}
               onClick={() => setInputMode('camera')}>
            <div className="input-icon">📸</div>
            <h3>Show Me</h3>
            <p>Take a photo of your idea!</p>
          </div>
          <div className={`input-card ${inputMode === 'template' ? 'selected' : ''}`}
               onClick={() => setInputMode('template')}>
            <div className="input-icon">🧩</div>
            <h3>Pick One</h3>
            <p>Choose a robot to start!</p>
          </div>
        </div>

        {/* Voice panel */}
        {inputMode === 'voice' && (
          <div className="voice-panel">
            <h3>Tell me about your robot!</h3>
            {!speech.isSupported && <p className="warning">Voice not supported in this browser. Try typing instead!</p>}
            {speech.isListening && (
              <div className="voice-wave">
                {[...Array(7)].map((_, i) => <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
              </div>
            )}
            <button className={`mic-btn ${speech.isListening ? 'recording' : ''}`}
                    onClick={handleVoiceToggle}>
              {speech.isListening ? '⏹' : '🎤'}
            </button>
            {speech.transcript && <p className="transcript">"{speech.transcript}"</p>}
            <p className="voice-status">
              {speech.isListening ? 'Listening... tell me about your robot!' : 'Press the button and start talking'}
            </p>
          </div>
        )}

        {/* Camera panel */}
        {inputMode === 'camera' && (
          <div className="camera-panel">
            <h3>Show me your idea!</h3>
            {camera.error && <p className="warning">{camera.error}</p>}
            {!camera.isActive && !camera.photo && (
              <button className="camera-start-btn" onClick={camera.startCamera}>
                📷 Open Camera
              </button>
            )}
            {camera.isActive && (
              <>
                <div className="camera-preview">
                  <video ref={camera.videoRef} autoPlay playsInline muted />
                </div>
                <button className="snap-btn" onClick={handlePhoto}>📸 Take Photo</button>
              </>
            )}
            {camera.photo && (
              <div className="photo-preview">
                <img src={camera.photo} alt="Your creation" />
                <p>Great photo! I can see your idea!</p>
              </div>
            )}
          </div>
        )}

        {/* Template grid */}
        {inputMode === 'template' && (
          <div className="template-grid">
            {robotModels.map(model => (
              <div key={model.id} className="template-card" onClick={() => handleTemplate(model)}>
                <div className="template-emoji">{model.emoji}</div>
                <div className="template-name">{model.name}</div>
                <div className="template-diff">{model.difficulty}</div>
              </div>
            ))}
          </div>
        )}

        {/* Child's input display */}
        {childInput && (
          <div className="child-chat">
            <div className="child-bubble">{childInput}</div>
            <div className="child-avatar">👦</div>
          </div>
        )}

        {/* AI response */}
        {aiResponse && (
          <>
            <div className="buddy-chat">
              <div className="buddy-avatar">🤖</div>
              <div className="buddy-bubble">{aiResponse}</div>
            </div>
            <button className="start-build-btn" onClick={() => setStage('build')}>
              Start Building! 🔨
            </button>
          </>
        )}
      </div>
    </div>
  );
}
