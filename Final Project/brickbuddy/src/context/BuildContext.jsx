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
  const [steamProgress, setSteamProgress] = useState({
    science: 0, technology: 0, engineering: 0, art: 0, math: 0,
  });
  const [buildStartTime, setBuildStartTime] = useState(null);
  const [buildDuration, setBuildDuration] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Inventory: result of the Discover→Inventory scan. Persists for the
  // session so going Back from Build still shows the same pile + matches.
  const [inventory, setInventory] = useState(null);
  // Modification log: every recolor/scale/add/remove the child applies on
  // Build. Drives the "live manual" right-page so kids see their changes
  // accruing as a real builder's notebook. Replaces the old chatHistory
  // (the redesign removed the chat box entirely).
  const [modificationLog, setModificationLog] = useState([]);
  const initialized = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Restore session from localStorage on mount. setState here is the
  // intentional pattern (we're hydrating from external storage); the rule
  // is too aggressive for one-time hydration so disable for this effect.
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
        setSteamProgress(saved.steamProgress || {
          science: 0, technology: 0, engineering: 0, art: 0, math: 0,
        });
        setBuildStartTime(saved.buildStartTime || null);
        setStage(saved.stage);
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-save session state whenever it changes
  useEffect(() => {
    if (!initialized.current) return;
    saveSession({ stage, selectedModel, currentStep, steamProgress, buildStartTime });
  }, [stage, selectedModel, currentStep, steamProgress, buildStartTime]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Track build duration when in build stage. Wall-clock side effect that
  // can't be replaced with useMemo; the rule misfires on this pattern.
  useEffect(() => {
    if (stage === 'build' && !buildStartTime) {
      setBuildStartTime(Date.now());
    }
    if (stage === 'celebrate' && buildStartTime) {
      setBuildDuration(Math.round((Date.now() - buildStartTime) / 1000));
    }
  }, [stage, buildStartTime]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Select a robot model — accepts either a registered model id OR a full custom model object.
  // Resets session for a clean start.
  const selectModel = useCallback((modelOrId) => {
    const model = typeof modelOrId === 'string'
      ? robotModels.find(m => m.id === modelOrId)
      : modelOrId;
    if (!model) return;
    setSelectedModel(model);
    setCurrentStep(0);
    setSteamProgress({ science: 0, technology: 0, engineering: 0, art: 0, math: 0 });
    setBuildStartTime(null);
    setBuildDuration(0);
    setModificationLog([]);
  }, []);

  // Append a modification entry. Caller is responsible for also updating the
  // model via setSelectedModel — we keep these decoupled so a single user
  // action (one voice command) results in exactly one re-render of both.
  const addModification = useCallback((entry) => {
    if (!entry) return;
    setModificationLog((prev) => [...prev, entry]);
    if (entry.steamTag) {
      setSteamProgress((prev) => ({ ...prev, [entry.steamTag]: prev[entry.steamTag] + 1 }));
    }
  }, []);

  const clearModifications = useCallback(() => setModificationLog([]), []);

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
    if (modificationLog.length >= 3) {
      list.push({ id: 'designer', icon: '🎨', label: 'Mini Designer', desc: `Made ${modificationLog.length} live customizations` });
    }
    if (buildDuration > 0 && buildDuration < 180) {
      list.push({ id: 'speedy', icon: '⚡', label: 'Speed Builder', desc: 'Finished in under 3 minutes!' });
    }
    return list;
  }, [steamProgress, modificationLog, stage, buildDuration]);

  // Reset everything for a new session
  const resetSession = useCallback(() => {
    setStage('splash');
    setSelectedModel(null);
    setCurrentStep(0);
    setSteamProgress({ science: 0, technology: 0, engineering: 0, art: 0, math: 0 });
    setBuildStartTime(null);
    setBuildDuration(0);
    setInventory(null);
    setModificationLog([]);
    clearSession();
  }, []);

  // Test/demo hook: exposes the high-level setters on `window` so we can
  // inject inventory / jump stages from the Claude preview's eval tool AND
  // from the investor-demo recorder. Always on in dev; in production only
  // when the URL has `?demo=1`, so it stays out of the public path.
  useEffect(() => {
    const demoFlag = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('demo') === '1';
    if (!import.meta.env.DEV && !demoFlag) return;
    window.__bbDev__ = { setStage, setInventory, selectModel, resetSession };
    return () => { delete window.__bbDev__; };
  }, [setStage, selectModel, resetSession]);

  return (
    <BuildContext.Provider value={{
      stage, setStage,
      selectedModel, selectModel, setSelectedModel,
      updateSelectedModel, updateStepParts,
      currentStep, setCurrentStep, nextStep, prevStep,
      steamProgress, setSteamProgress,
      progress,
      buildStartTime, buildDuration,
      achievements,
      soundEnabled, setSoundEnabled,
      inventory, setInventory,
      modificationLog, addModification, clearModifications,
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
