/**
 * ImagineScreen — Stage 1: Children describe their robot idea.
 * Supports 3 input modes: Voice (Web Speech API), Camera (with real image analysis), Template.
 * Includes text fallback, accessible controls, and sound feedback.
 */
import { useState, useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { robotModels } from '../data/models';
import { analyzePhoto } from '../services/imageAnalyzer';
import { generateFullRobot, generateCustomRobot, customizeModel } from '../services/aiService';
import { playClick, playSuccess } from '../services/soundEffects';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useCamera from '../hooks/useCamera';
import './ImagineScreen.css';

// Keywords -> model mapping with confidence scoring
const MODEL_KEYWORDS = {
  dog: ['dog', 'puppy', 'walk', 'woof', 'bark', 'pet', 'four legs', 'tail wag', 'fetch', 'paw', 'bone', 'furry'],
  car: ['car', 'race', 'fast', 'drive', 'speed', 'wheel', 'vroom', 'truck', 'vehicle', 'motor', 'road', 'zoom'],
  dino: ['dino', 'dinosaur', 'rex', 'roar', 'jurassic', 'stomp', 'trex', 'raptor', 'teeth', 'prehistoric', 'giant'],
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
  const { selectModel, setStage, progress, soundEnabled } = useBuild();
  const [inputMode, setInputMode] = useState(null);
  const [childInput, setChildInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dreamInput, setDreamInput] = useState('');
  const [dreaming, setDreaming] = useState(false);
  const [dreamError, setDreamError] = useState(null);

  const speech = useSpeechRecognition();
  const camera = useCamera();

  const processInput = (input) => {
    const { modelId, confidence } = classifyInput(input);
    if (modelId && confidence > 0) {
      const model = robotModels.find(m => m.id === modelId);
      selectModel(modelId);
      if (soundEnabled) playSuccess();
      setAiResponse(`I think you want to build a ${model.name} ${model.emoji}! It uses ${model.pieceCount} pieces and has ${model.steps.length} steps. Let's do it!`);
    } else {
      selectModel('dog');
      setAiResponse(
        'Hmm, that sounds creative! I\'m not sure which robot matches best. ' +
        'Let me suggest the Robot Dog \u{1F436} to start \u2014 it\'s beginner-friendly! ' +
        'Or you can go back and pick a different one from the templates.'
      );
    }
  };

  // Track the last transcript we processed so we don't re-process the same text.
  const processedTranscriptRef = useRef('');

  // Auto-process when the user stops talking (recognition.onend → isListening=false).
  useEffect(() => {
    if (speech.isListening) return;
    const text = speech.transcript.trim();
    if (!text || text === processedTranscriptRef.current) return;
    processedTranscriptRef.current = text;
    setChildInput(text);
    processInput(text);
  }, [speech.isListening, speech.transcript]);

  const handleVoiceToggle = () => {
    if (soundEnabled) playClick();
    if (speech.isListening) {
      speech.stopListening();
    } else {
      processedTranscriptRef.current = '';
      speech.resetTranscript();
      speech.clearError();
      speech.startListening();
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    if (soundEnabled) playClick();
    setChildInput(textInput.trim());
    processInput(textInput.trim());
    setTextInput('');
  };

  // Real camera photo analysis using canvas color/shape detection
  const handlePhoto = async () => {
    const dataUrl = camera.takePhoto();
    if (!dataUrl) return;
    setAnalyzing(true);
    setChildInput('(Showed a photo of their LEGO idea)');

    const result = await analyzePhoto(dataUrl);
    const model = robotModels.find(m => m.id === result.modelId);

    setAnalyzing(false);
    selectModel(result.modelId);
    if (soundEnabled) playSuccess();

    if (result.confidence > 0.45) {
      setAiResponse(
        `${result.reason}! I think you'd love building a ${model.name} ${model.emoji}! ` +
        `It has ${model.pieceCount} pieces and ${model.steps.length} fun steps. Let's go!`
      );
    } else {
      setAiResponse(
        `Interesting photo! ${result.reason}. ` +
        `I'll suggest a ${model.name} ${model.emoji} \u2014 it uses ${model.pieceCount} pieces ` +
        `and is really fun to build! You can also pick a different robot from the templates.`
      );
    }
  };

  const handleRetake = () => {
    camera.setPhoto(null);
    setChildInput('');
    setAiResponse('');
    camera.startCamera();
  };

  const handleDream = async () => {
    const text = dreamInput.trim();
    if (!text || dreaming) return;
    if (soundEnabled) playClick();
    setDreamError(null);
    setDreaming(true);
    setChildInput(text);

    // Try true AI geometry first; if validation fails, fall back to recolored template.
    let quotaHint = null;
    try {
      const custom = await generateFullRobot(text);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `I dreamed up a ${custom.name} ${custom.emoji} — built just for your idea! ${custom.description} ${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
      setDreaming(false);
      return;
    } catch (err) {
      if (err.hint) quotaHint = err.hint;
      if (import.meta.env.DEV) console.info('[Dream] full-geometry failed, falling back:', err.message);
    }

    try {
      const blueprint = await generateCustomRobot(text);
      const base = robotModels.find((m) => m.id === blueprint.template) || robotModels[0];
      const custom = customizeModel(base, blueprint);
      selectModel(custom);
      if (soundEnabled) playSuccess();
      setAiResponse(
        `I dreamed up a ${custom.name} ${custom.emoji} for you! ${custom.description} It has ${custom.pieceCount} pieces across ${custom.steps.length} steps. Let's build it!`,
      );
    } catch (err) {
      if (err.hint) quotaHint = err.hint;
      setDreamError(
        quotaHint
          ? `AI is resting: ${quotaHint} Pick a template below in the meantime!`
          : "I couldn't dream that up right now. Try a simpler idea like 'a green robot frog' or pick a template below.",
      );
      if (import.meta.env.DEV) console.warn('[Dream] both paths failed:', err);
    } finally {
      setDreaming(false);
    }
  };

  const handleTemplate = (model) => {
    if (soundEnabled) playClick();
    setChildInput(`I want to build a ${model.name}!`);
    selectModel(model.id);
    if (soundEnabled) playSuccess();
    setAiResponse(
      `Amazing choice! A ${model.name} ${model.emoji} \u2014 I love it! ` +
      `It uses ${model.pieceCount} pieces across ${model.steps.length} steps. ` +
      `${model.description} Ready to start building?`
    );
  };

  const handleModeSelect = (mode) => {
    if (soundEnabled) playClick();
    setInputMode(mode);
  };

  const handleBack = () => {
    camera.stopCamera();
    speech.stopListening();
    setStage('splash');
  };

  const handleStartBuild = () => {
    camera.stopCamera();
    speech.stopListening();
    if (soundEnabled) playSuccess();
    setStage('build');
  };

  return (
    <div className="imagine-screen" role="main" aria-label="Imagine your robot">
      <header className="imagine-header">
        <button className="back-btn" onClick={handleBack} aria-label="Go back to home">
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className="logo-small" aria-hidden="true">Brick<span>Buddy</span></span>
        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${progress}%`}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stage-label">Stage 1: Imagine</span>
      </header>

      <div className="imagine-content">
        <div className="buddy-chat" role="status" aria-live="polite">
          <div className="buddy-avatar" aria-hidden="true">&#x1F916;</div>
          <div className="buddy-bubble">
            Hi there, little builder! &#x1F44B;<br />
            What kind of robot do you want to build today?
            You can <strong>tell me</strong>, <strong>show me</strong>, or <strong>pick one below</strong>!
          </div>
        </div>

        <div className="input-cards" role="group" aria-label="Choose how to describe your robot">
          <button
            className={`input-card ${inputMode === 'voice' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('voice')}
            aria-pressed={inputMode === 'voice'}
            aria-label="Talk to me - describe your dream robot"
          >
            <div className="input-icon" aria-hidden="true">&#x1F3A4;</div>
            <h3>Talk to Me</h3>
            <p>Describe your dream robot!</p>
          </button>
          <button
            className={`input-card ${inputMode === 'camera' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('camera')}
            aria-pressed={inputMode === 'camera'}
            aria-label="Show me - take a photo of your idea"
          >
            <div className="input-icon" aria-hidden="true">&#x1F4F8;</div>
            <h3>Show Me</h3>
            <p>Take a photo of your idea!</p>
          </button>
          <button
            className={`input-card ${inputMode === 'template' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('template')}
            aria-pressed={inputMode === 'template'}
            aria-label="Pick one - choose a robot to start"
          >
            <div className="input-icon" aria-hidden="true">&#x1F9E9;</div>
            <h3>Pick One</h3>
            <p>Choose a robot to start!</p>
          </button>
          <button
            className={`input-card ${inputMode === 'dream' ? 'selected' : ''}`}
            onClick={() => handleModeSelect('dream')}
            aria-pressed={inputMode === 'dream'}
            aria-label="Dream it up - describe any robot and AI designs it"
          >
            <div className="input-icon" aria-hidden="true">&#x2728;</div>
            <h3>Dream It Up</h3>
            <p>AI designs any robot you imagine!</p>
          </button>
        </div>

        {/* Voice panel */}
        {inputMode === 'voice' && (
          <section className="voice-panel" aria-label="Voice input">
            <h3>Tell me about your robot!</h3>
            {!speech.isSupported && <p className="warning" role="alert">Voice not supported in this browser. Use the text box below!</p>}
            {speech.error && (
              <p className="warning" role="alert">
                {speech.error}
                {speech.permission === 'denied' && ' The text box below still works!'}
              </p>
            )}
            {speech.isSupported && (
              <>
                {speech.isListening && (
                  <div className="voice-wave" aria-hidden="true">
                    {[...Array(7)].map((_, i) => <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
                  </div>
                )}
                <button
                  className={`mic-btn ${speech.isListening ? 'recording' : ''}`}
                  onClick={handleVoiceToggle}
                  aria-label={speech.isListening ? 'Stop recording' : 'Start recording'}
                >
                  {speech.isListening ? '\u23F9' : '\u{1F3A4}'}
                </button>
                {speech.transcript && <p className="transcript" aria-live="polite">"{speech.transcript}"</p>}
                <p className="voice-status">
                  {speech.isListening ? 'Listening... tell me about your robot!' : 'Press the button and start talking'}
                </p>
              </>
            )}
            <div className="text-fallback">
              <p className="fallback-label">Or type your idea here:</p>
              <div className="text-input-row">
                <input
                  className="text-input"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                  placeholder='e.g. "I want a robot dog that walks!"'
                  aria-label="Type your robot idea"
                />
                <button className="text-submit-btn" onClick={handleTextSubmit} disabled={!textInput.trim()} aria-label="Submit your idea">
                  Go!
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Camera panel */}
        {inputMode === 'camera' && (
          <section className="camera-panel" aria-label="Camera input">
            <h3>Show me your idea!</h3>
            {camera.error && (
              <p className="warning" role="alert">
                {camera.error.message}
                {camera.error.code === 'denied' && ' No problem — pick a template below instead.'}
              </p>
            )}
            {!camera.isActive && !camera.photo && !analyzing && (
              <button
                className="camera-start-btn"
                onClick={camera.startCamera}
                aria-label={camera.error?.code === 'denied' ? 'Retry opening camera' : 'Open camera'}
              >
                {camera.error?.code === 'denied' ? '\u{1F504} Try Again' : '\u{1F4F7} Open Camera'}
              </button>
            )}
            {camera.isActive && (
              <>
                <div className="camera-preview">
                  <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Camera preview" />
                </div>
                <button className="snap-btn" onClick={handlePhoto} aria-label="Take photo">
                  &#x1F4F8; Take Photo
                </button>
              </>
            )}
            {analyzing && (
              <div className="analyzing-state" role="status" aria-live="polite">
                <div className="analyzing-spinner" aria-hidden="true" />
                <p>Analyzing your photo... &#x1F50D;</p>
              </div>
            )}
            {camera.photo && !analyzing && (
              <div className="photo-preview">
                <img src={camera.photo} alt="Your creation" />
                <div className="photo-actions">
                  <button className="retake-btn" onClick={handleRetake} aria-label="Retake photo">
                    Retake &#x1F4F7;
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Dream Up panel */}
        {inputMode === 'dream' && (
          <section className="dream-panel" aria-label="Dream up your own robot">
            <h3>Describe ANY robot you can imagine!</h3>
            <p className="dream-hint">Our AI will design a custom blueprint just for you.</p>
            {dreamError && <p className="warning" role="alert">{dreamError}</p>}
            <div className="dream-input-row">
              <input
                className="dream-input"
                value={dreamInput}
                onChange={(e) => setDreamInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDream()}
                placeholder='e.g. "a rainbow spider that dances"'
                aria-label="Describe your custom robot"
                disabled={dreaming}
              />
              <button
                className="dream-submit-btn"
                onClick={handleDream}
                disabled={!dreamInput.trim() || dreaming}
                aria-label="Generate robot"
              >
                {dreaming ? 'Dreaming…' : 'Dream!'}
              </button>
            </div>
            {dreaming && (
              <div className="dream-loading" role="status" aria-live="polite">
                <div className="dream-spinner" aria-hidden="true" />
                <p>Designing your robot… &#x2728;</p>
              </div>
            )}
          </section>
        )}

        {/* Template grid */}
        {inputMode === 'template' && (
          <section className="template-grid" role="group" aria-label="Robot templates">
            {robotModels.map(model => (
              <button key={model.id} className="template-card" onClick={() => handleTemplate(model)} aria-label={`${model.name} - ${model.difficulty} - ${model.pieceCount} pieces`}>
                <div className="template-emoji" aria-hidden="true">{model.emoji}</div>
                <div className="template-name">{model.name}</div>
                <div className="template-diff">{model.difficulty} &middot; {model.pieceCount} pieces</div>
              </button>
            ))}
          </section>
        )}

        {/* Child's input display */}
        {childInput && (
          <div className="child-chat">
            <div className="child-bubble">{childInput}</div>
            <div className="child-avatar" aria-hidden="true">&#x1F466;</div>
          </div>
        )}

        {/* AI response */}
        {aiResponse && (
          <>
            <div className="buddy-chat" role="status" aria-live="polite">
              <div className="buddy-avatar" aria-hidden="true">&#x1F916;</div>
              <div className="buddy-bubble">{aiResponse}</div>
            </div>
            <button className="start-build-btn" onClick={handleStartBuild} aria-label="Start building your robot">
              Start Building! &#x1F528;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
