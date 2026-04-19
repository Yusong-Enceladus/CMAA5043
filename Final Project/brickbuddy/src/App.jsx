/**
 * BrickBuddy — AI-Powered LEGO Robot Building Assistant for Children (6-8)
 * Final Project for CMAA5043 | Yusong, Jiayi
 *
 * App shell: error boundary + build-session provider + router + global
 * progress dots so users can jump across stages they've already unlocked.
 */
import { BuildProvider, useBuild } from './context/BuildContext';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import ImagineScreen from './components/ImagineScreen';
import BuildScreen from './components/BuildScreen';
import LearnScreen from './components/LearnScreen';
import CelebrateScreen from './components/CelebrateScreen';
import './App.css';

export const STAGES = ['splash', 'imagine', 'build', 'learn', 'celebrate'];

export function ProgressDots() {
  const { stage, setStage, selectedModel } = useBuild();
  if (stage === 'splash') return null;
  const idx = STAGES.indexOf(stage);
  return (
    <div style={{
      display: 'inline-flex', gap: 6, alignItems: 'center',
      background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
      padding: '6px 10px', borderRadius: 99, boxShadow: 'var(--shadow-1)',
    }}>
      {STAGES.map((s, i) => {
        // Allow nav back to any stage the user has reached so far.
        // Forward nav only to stages that legitimately unlock: splash→imagine
        // anytime, imagine→build needs a model, later stages need prior ones.
        const unlocked = i <= idx
          || (i === 1 && idx === 0)
          || (i === 2 && selectedModel && idx >= 1);
        return (
          <button
            key={s}
            title={s}
            onClick={() => { if (unlocked) setStage(s); }}
            style={{
              width: i === idx ? 22 : 8, height: 8, borderRadius: 4, padding: 0,
              background: i < idx ? 'var(--ink-3)' :
                          i === idx ? 'var(--brick-red)' : 'var(--rule-2)',
              transition: 'all 0.3s',
              cursor: unlocked ? 'pointer' : 'default',
              border: 'none',
            }}
            aria-label={`Go to stage ${s}`}
            disabled={!unlocked}
          />
        );
      })}
    </div>
  );
}

function AppRouter() {
  const { stage } = useBuild();

  let screen;
  switch (stage) {
    case 'splash':    screen = <SplashScreen />;    break;
    case 'imagine':   screen = <ImagineScreen />;   break;
    case 'build':     screen = <BuildScreen />;     break;
    case 'learn':     screen = <LearnScreen />;     break;
    case 'celebrate': screen = <CelebrateScreen />; break;
    default:          screen = <SplashScreen />;
  }
  return screen;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BuildProvider>
        <AppRouter />
      </BuildProvider>
    </ErrorBoundary>
  );
}
