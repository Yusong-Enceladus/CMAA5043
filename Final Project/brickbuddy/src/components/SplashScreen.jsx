/**
 * SplashScreen — Welcome screen with BrickBuddy mascot and start button.
 */
import { useBuild } from '../context/BuildContext';
import './SplashScreen.css';

export default function SplashScreen() {
  const { setStage } = useBuild();

  return (
    <div className="splash-screen">
      <div className="splash-mascot">🤖</div>
      <h1 className="splash-title">BrickBuddy</h1>
      <p className="splash-subtitle">
        Your AI friend that helps you build amazing LEGO robots!
        Tell me what you want to build, and I'll guide you step by step.
      </p>
      <button className="splash-btn" onClick={() => setStage('imagine')}>
        Let's Build! 🚀
      </button>
      <p className="splash-age">Designed for builders aged 6–8</p>
    </div>
  );
}
