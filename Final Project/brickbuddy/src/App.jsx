/**
 * BrickBuddy — AI-Powered LEGO Robot Building Assistant for Children (6-8)
 * Final Project for CMAA5043 | Yusong, Jiayi
 */
import { BuildProvider, useBuild } from './context/BuildContext';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import ImagineScreen from './components/ImagineScreen';
import BuildScreen from './components/BuildScreen';
import LearnScreen from './components/LearnScreen';
import CelebrateScreen from './components/CelebrateScreen';
import './App.css';

function AppRouter() {
  const { stage } = useBuild();

  switch (stage) {
    case 'splash':    return <SplashScreen />;
    case 'imagine':   return <ImagineScreen />;
    case 'build':     return <BuildScreen />;
    case 'learn':     return <LearnScreen />;
    case 'celebrate': return <CelebrateScreen />;
    default:          return <SplashScreen />;
  }
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
