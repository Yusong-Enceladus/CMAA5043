/**
 * Storage — localStorage persistence for BrickBuddy sessions.
 * Saves and restores session state so children don't lose progress on refresh.
 */

const STORAGE_KEY = 'brickbuddy_session';

/**
 * Save the current session state to localStorage.
 */
export function saveSession(state) {
  try {
    const isCustom = state.selectedModel?.id?.startsWith('custom-');
    const data = {
      stage: state.stage,
      selectedModelId: state.selectedModel?.id || null,
      customModel: isCustom ? state.selectedModel : null,
      currentStep: state.currentStep,
      chatHistory: state.chatHistory,
      steamProgress: state.steamProgress,
      buildStartTime: state.buildStartTime,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}

/**
 * Load a previously saved session from localStorage.
 * Returns null if no valid session exists or if the session is older than 24 hours.
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Expire sessions older than 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the saved session.
 */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail silently
  }
}
