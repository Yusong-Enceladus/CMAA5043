/**
 * SplashScreen — Welcome screen with BrickBuddy mascot, start button,
 * and session restore option.
 */
import { useBuild } from '../context/BuildContext';
import { playClick } from '../services/soundEffects';
import { loadSession } from '../services/storage';
import './SplashScreen.css';

export default function SplashScreen() {
  const { setStage, soundEnabled } = useBuild();
  const savedSession = loadSession();
  const hasSession = savedSession && savedSession.stage !== 'splash' && savedSession.selectedModelId;

  const handleStart = () => {
    if (soundEnabled) playClick();
    setStage('imagine');
  };

  return (
    <div className="splash-screen" role="main" aria-label="BrickBuddy welcome screen">
      <div className="splash-mascot" aria-hidden="true">&#x1F916;</div>
      <h1 className="splash-title">BrickBuddy</h1>
      <p className="splash-subtitle">
        Your AI friend that helps you build amazing LEGO robots!
        Tell me what you want to build, and I'll guide you step by step.
      </p>
      <button className="splash-btn" onClick={handleStart} aria-label="Start building">
        Let's Build! &#x1F680;
      </button>
      {hasSession && (
        <p className="splash-resume" role="status">
          &#x2705; Your previous session was automatically restored!
        </p>
      )}
      <p className="splash-age">Designed for builders aged 6&ndash;8</p>
    </div>
  );
}
