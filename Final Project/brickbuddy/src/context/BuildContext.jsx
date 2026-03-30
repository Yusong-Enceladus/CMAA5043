/**
 * BuildContext — Global state for the building session.
 * Tracks which model is selected, current step, chat history, and STEAM progress.
 */
import { createContext, useContext, useState } from 'react';
import { robotModels } from '../data/models';

const BuildContext = createContext();

export function BuildProvider({ children }) {
  const [stage, setStage] = useState('splash');     // splash | imagine | build | learn | celebrate
  const [selectedModel, setSelectedModel] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [steamProgress, setSteamProgress] = useState({
    science: 0, technology: 0, engineering: 0, art: 0, math: 0
  });

  // Select a robot model by ID
  const selectModel = (modelId) => {
    const model = robotModels.find(m => m.id === modelId);
    setSelectedModel(model);
  };

  // Navigate build steps
  const nextStep = () => {
    if (selectedModel && currentStep < selectedModel.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  // Add a chat message
  const addChat = (role, text, steamTag = null) => {
    setChatHistory(prev => [...prev, { role, text, steamTag, time: new Date() }]);
    if (steamTag) {
      setSteamProgress(prev => ({ ...prev, [steamTag]: prev[steamTag] + 1 }));
    }
  };

  // Reset everything for a new session
  const resetSession = () => {
    setStage('splash');
    setSelectedModel(null);
    setCurrentStep(0);
    setChatHistory([]);
    setSteamProgress({ science: 0, technology: 0, engineering: 0, art: 0, math: 0 });
  };

  return (
    <BuildContext.Provider value={{
      stage, setStage,
      selectedModel, selectModel, setSelectedModel,
      currentStep, setCurrentStep, nextStep, prevStep,
      chatHistory, addChat,
      steamProgress, setSteamProgress,
      resetSession
    }}>
      {children}
    </BuildContext.Provider>
  );
}

export function useBuild() {
  const ctx = useContext(BuildContext);
  if (!ctx) throw new Error('useBuild must be used within BuildProvider');
  return ctx;
}
