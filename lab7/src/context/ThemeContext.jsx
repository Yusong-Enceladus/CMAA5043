/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

/**
 * ThemeContext – Dark Mode Context (Lab 4 Tutorial)
 *
 * Provides global dark mode state to the entire component tree
 * without prop drilling. Any component can call useDarkMode()
 * to read or toggle the current theme.
 */

// 1. Create the context object
const ThemeContext = createContext();

// 2. Provider component – wraps the app and owns the state
export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Expose darkMode value and toggle function to all descendants
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 3. Custom hook – convenient shortcut for consumers
export function useDarkMode() {
  return useContext(ThemeContext);
}
