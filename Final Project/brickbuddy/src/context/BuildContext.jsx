/**
 * BuildContext — Global state for the building session.
 * Tracks model, step, chat, STEAM progress, build timer, and persists to localStorage.
 */
import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { robotModels } from '../data/models';
import { saveSession, loadSession, clearSession } from '../services/storage';

const BuildContext = createContext();

export function BuildProvider({ children }) {
  const [stage, setStage] = useState('splash');
  const [selectedModel, setSelectedModel] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [steamProgress, setSteamProgress] = useState({
    science: 0, technology: 0, engineering: 0, art: 0, math: 0,
  });
  const [buildStartTime, setBuildStartTime] = useState(null);
  const [buildDuration, setBuildDuration] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const initialized = useRef(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadSession();
    if (saved && saved.stage !== 'splash') {
      // Custom models are stored inline; built-ins are looked up by id.
      const model = saved.customModel
        ? saved.customModel
        : robotModels.find(m => m.id === saved.selectedModelId);
      if (model) {
        setSelectedModel(model);
        setCurrentStep(saved.currentStep || 0);
        setChatHistory(saved.chatHistory || []);
        setSteamProgress(saved.steamProgress || {
          science: 0, technology: 0, engineering: 0, art: 0, math: 0,
        });
        setBuildStartTime(saved.buildStartTime || null);
        setStage(saved.stage);
      }
    }
  }, []);

  // Auto-save session state whenever it changes
  useEffect(() => {
    if (!initialized.current) return;
    saveSession({ stage, selectedModel, currentStep, chatHistory, steamProgress, buildStartTime });
  }, [stage, selectedModel, currentStep, chatHistory, steamProgress, buildStartTime]);

  // Track build duration when in build stage
  useEffect(() => {
    if (stage === 'build' && !buildStartTime) {
      setBuildStartTime(Date.now());
    }
    if (stage === 'celebrate' && buildStartTime) {
      setBuildDuration(Math.round((Date.now() - buildStartTime) / 1000));
    }
  }, [stage, buildStartTime]);

  // Select a robot model — accepts either a registered model id OR a full custom model object.
  // Resets session for a clean start.
  const selectModel = useCallback((modelOrId) => {
    const model = typeof modelOrId === 'string'
      ? robotModels.find(m => m.id === modelOrId)
      : modelOrId;
    if (!model) return;
    setSelectedModel(model);
    setCurrentStep(0);
    setChatHistory([]);
    setSteamProgress({ science: 0, technology: 0, engineering: 0, art: 0, math: 0 });
    setBuildStartTime(null);
    setBuildDuration(0);
  }, []);

  // Update selectedModel via an immutable updater. Accepts either the new
  // model object or a function (currentModel) => newModel.
  const updateSelectedModel = useCallback((updater) => {
    setSelectedModel((current) => {
      if (!current) return current;
      return typeof updater === 'function' ? updater(current) : updater;
    });
  }, []);

  // Convenience: mutate the parts array of a single step in the current model.
  const updateStepParts = useCallback((stepIndex, partsUpdater) => {
    setSelectedModel((current) => {
      if (!current) return current;
      const copy = structuredClone(current);
      const step = copy.steps[stepIndex];
      if (!step) return current;
      step.newParts = typeof partsUpdater === 'function'
        ? partsUpdater(step.newParts || [])
        : partsUpdater;
      return copy;
    });
  }, []);

  // Navigate build steps
  const nextStep = useCallback(() => {
    if (selectedModel && currentStep < selectedModel.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [selectedModel, currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  // Add a chat message with optional STEAM tag
  const addChat = useCallback((role, text, steamTag = null) => {
    setChatHistory(prev => [...prev, { role, text, steamTag, time: new Date().toISOString() }]);
    if (steamTag) {
      setSteamProgress(prev => ({ ...prev, [steamTag]: prev[steamTag] + 1 }));
    }
  }, []);

  // Compute progress percentage across all stages
  const progress = useMemo(() => {
    const stages = { splash: 0, imagine: 15, build: 25, learn: 85, celebrate: 100 };
    const base = stages[stage] || 0;
    if (stage === 'build' && selectedModel) {
      const stepProgress = (currentStep / selectedModel.steps.length) * 55;
      return Math.round(base + stepProgress);
    }
    return base;
  }, [stage, currentStep, selectedModel]);

  // Compute achievements earned during the session
  const achievements = useMemo(() => {
    const list = [];
    const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);
    const topicsExplored = Object.values(steamProgress).filter(v => v > 0).length;

    if (stage === 'celebrate' || stage === 'learn') {
      list.push({ id: 'builder', icon: '🏗️', label: 'Master Builder', desc: 'Completed all build steps' });
    }
    if (topicsExplored >= 3) {
      list.push({ id: 'explorer', icon: '🧭', label: 'STEAM Explorer', desc: `Explored ${topicsExplored} STEAM topics` });
    }
    if (topicsExplored >= 5) {
      list.push({ id: 'genius', icon: '🧠', label: 'STEAM Genius', desc: 'Explored ALL 5 STEAM topics!' });
    }
    if (totalSteam >= 10) {
      list.push({ id: 'curious', icon: '🔍', label: 'Super Curious', desc: `Asked ${totalSteam} learning questions` });
    }
    if (chatHistory.filter(m => m.role === 'child').length >= 5) {
      list.push({ id: 'chatter', icon: '💬', label: 'Great Communicator', desc: 'Had a great conversation with BrickBuddy' });
    }
    if (buildDuration > 0 && buildDuration < 180) {
      list.push({ id: 'speedy', icon: '⚡', label: 'Speed Builder', desc: 'Finished in under 3 minutes!' });
    }
    return list;
  }, [steamProgress, chatHistory, stage, buildDuration]);

  // Reset everything for a new session
  const resetSession = useCallback(() => {
    setStage('splash');
    setSelectedModel(null);
    setCurrentStep(0);
    setChatHistory([]);
    setSteamProgress({ science: 0, technology: 0, engineering: 0, art: 0, math: 0 });
    setBuildStartTime(null);
    setBuildDuration(0);
    clearSession();
  }, []);

  return (
    <BuildContext.Provider value={{
      stage, setStage,
      selectedModel, selectModel, setSelectedModel,
      updateSelectedModel, updateStepParts,
      currentStep, setCurrentStep, nextStep, prevStep,
      chatHistory, addChat,
      steamProgress, setSteamProgress,
      progress,
      buildStartTime, buildDuration,
      achievements,
      soundEnabled, setSoundEnabled,
      resetSession,
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
