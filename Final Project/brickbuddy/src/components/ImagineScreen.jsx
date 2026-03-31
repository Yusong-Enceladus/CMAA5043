/**
 * ImagineScreen — Stage 1: Children describe their robot idea.
 * Supports 3 input modes: Voice (Web Speech API), Camera, Template selection.
 * Includes text fallback and improved camera flow.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { robotModels } from '../data/models';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import './ImagineScreen.css';

// Keywords → model mapping with confidence
const MODEL_KEYWORDS = {
  dog: ['dog', 'puppy', 'walk', 'woof', 'bark', 'pet', 'four legs', 'tail wag', 'fetch'],
  car: ['car', 'race', 'fast', 'drive', 'speed', 'wheel', 'vroom', 'truck', 'vehicle', 'motor'],
  dino: ['dino', 'dinosaur', 'rex', 'roar', 'jurassic', 'stomp', 'trex', 'raptor', 'teeth'],
};

function classifyInput(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [modelId, keywords] of Object.entries(MODEL_KEYWORDS)) {
    scores[modelId] = keywords.filter(kw => lower.includes(kw)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { modelId: best[1] > 0 ? best[0] : null, confidence: best[1] };
}

export default function ImagineScreen() {
  const { selectModel, setStage, progress } = useBuild();
  const [inputMode, setInputMode] = useState(null);
  const [childInput, setChildInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const speech = useSpeechRecognition();
  const camera = useCamera();

  // Process any text input (from voice, text box, or photo description)
  const processInput = (input) => {
    const { modelId, confidence } = classifyInput(input);
    if (modelId && confidence > 0) {
      const model = robotModels.find(m => m.id === modelId);
      selectModel(modelId);
      setAiResponse(`I think you want to build a ${model.name} ${model.emoji}! It uses ${model.pieceCount} pieces and has ${model.steps.length} steps. Let's do it!`);
    } else {
      // Low confidence — offer choice
      selectModel('dog');
      setAiResponse(
        'Hmm, that sounds creative! I\'m not sure which robot matches best. ' +
        'Let me suggest the Robot Dog 🐶 to start — it\'s beginner-friendly! ' +
        'Or you can go back and pick a different one from the templates.'
      );
    }
  };

  // Handle voice recording toggle
  const handleVoiceToggle = () => {
    if (speech.isListening) {
      speech.stopListening();
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

  // Handle text submit (fallback for voice)
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setChildInput(textInput.trim());
    processInput(textInput.trim());
    setTextInput('');
  };

  // Handle camera photo with analyzing state
  const handlePhoto = () => {
    const dataUrl = camera.takePhoto();
    if (!dataUrl) return;
    setAnalyzing(true);
    setChildInput('(Showed a photo of their LEGO idea)');
    // Simulate brief analysis delay
    setTimeout(() => {
      setAnalyzing(false);
      selectModel('dog');
      setAiResponse(
        'I can see your drawing! It looks like something with four legs — ' +
        'let\'s build a Robot Dog 🐶! It has 23 pieces and is super fun to make. ' +
        'If you had something else in mind, just pick from the templates!'
      );
    }, 1500);
  };

  // Handle retake
  const handleRetake = () => {
    camera.setPhoto(null);
    setChildInput('');
    setAiResponse('');
    camera.startCamera();
  };

  // Handle template selection
  const handleTemplate = (model) => {
    setChildInput(`I want to build a ${model.name}!`);
    selectModel(model.id);
    setAiResponse(
      `Amazing choice! A ${model.name} ${model.emoji} — I love it! ` +
      `It uses ${model.pieceCount} pieces across ${model.steps.length} steps. ` +
      `${model.description} Ready to start building?`
    );
  };

  return (
    <div className="imagine-screen">
      <div className="imagine-header">
        <button className="back-btn" onClick={() => { camera.stopCamera(); speech.stopListening(); setStage('splash'); }}>←</button>
        <span className="logo-small">Brick<span>Buddy</span></span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
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
          <button className={`input-card ${inputMode === 'voice' ? 'selected' : ''}`}
                  onClick={() => setInputMode('voice')}>
            <div className="input-icon">🎤</div>
            <h3>Talk to Me</h3>
            <p>Describe your dream robot!</p>
          </button>
          <button className={`input-card ${inputMode === 'camera' ? 'selected' : ''}`}
                  onClick={() => setInputMode('camera')}>
            <div className="input-icon">📸</div>
            <h3>Show Me</h3>
            <p>Take a photo of your idea!</p>
          </button>
          <button className={`input-card ${inputMode === 'template' ? 'selected' : ''}`}
                  onClick={() => setInputMode('template')}>
            <div className="input-icon">🧩</div>
            <h3>Pick One</h3>
            <p>Choose a robot to start!</p>
          </button>
        </div>

        {/* Voice panel */}
        {inputMode === 'voice' && (
          <div className="voice-panel">
            <h3>Tell me about your robot!</h3>
            {!speech.isSupported && <p className="warning">Voice not supported in this browser. Use the text box below!</p>}
            {speech.isSupported && (
              <>
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
              </>
            )}
            {/* Text fallback — always available */}
            <div className="text-fallback">
              <p className="fallback-label">Or type your idea here:</p>
              <div className="text-input-row">
                <input
                  className="text-input"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                  placeholder='e.g. "I want a robot dog that walks!"'
                />
                <button className="text-submit-btn" onClick={handleTextSubmit} disabled={!textInput.trim()}>Go!</button>
              </div>
            </div>
          </div>
        )}

        {/* Camera panel */}
        {inputMode === 'camera' && (
          <div className="camera-panel">
            <h3>Show me your idea!</h3>
            {camera.error && <p className="warning">{camera.error}</p>}
            {!camera.isActive && !camera.photo && !analyzing && (
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
            {analyzing && (
              <div className="analyzing-state">
                <div className="analyzing-spinner" />
                <p>Looking at your photo... 🔍</p>
              </div>
            )}
            {camera.photo && !analyzing && (
              <div className="photo-preview">
                <img src={camera.photo} alt="Your creation" />
                <div className="photo-actions">
                  <button className="retake-btn" onClick={handleRetake}>Retake 📷</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Template grid */}
        {inputMode === 'template' && (
          <div className="template-grid">
            {robotModels.map(model => (
              <button key={model.id} className="template-card" onClick={() => handleTemplate(model)}>
                <div className="template-emoji">{model.emoji}</div>
                <div className="template-name">{model.name}</div>
                <div className="template-diff">{model.difficulty} · {model.pieceCount} pieces</div>
              </button>
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
            <button className="start-build-btn" onClick={() => { camera.stopCamera(); speech.stopListening(); setStage('build'); }}>
              Start Building! 🔨
            </button>
          </>
        )}
      </div>
    </div>
  );
}
