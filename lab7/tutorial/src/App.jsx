import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, useDarkMode } from './context/ThemeContext';
import ClickDemo from './components/ClickDemo';
import LatestNews from './components/LatestNews';
import NewsDetail from './components/NewsDetail';
import './App.css';

/**
 * Home – demonstrates both the useClickPosition hook and the ThemeContext.
 * Rendered at the "/" route.
 */
function Home() {
  // Read dark mode state directly from context — no prop needed
  const { darkMode, toggleDarkMode } = useDarkMode();

  const sectionStyle = {
    backgroundColor: darkMode ? '#16213e' : '#ffffff',
    borderColor: darkMode ? '#0f3460' : '#e0e0e0',
    color: darkMode ? '#e0e0e0' : '#333',
  };

  return (
    <main className="home-main">
      {/* ── Section 1: useClickPosition custom hook demo ── */}
      <section className="demo-section" style={sectionStyle}>
        <h2>1. Custom Hook: <code>useClickPosition</code></h2>
        <p>
          The <code>useClickPosition(logName)</code> hook accepts a name that identifies
          the click area. Click inside either box below and watch the console for logged output.
        </p>
        <ClickDemo />
      </section>

      {/* ── Section 2: ThemeContext dark mode demo ── */}
      <section className="demo-section" style={sectionStyle}>
        <h2>2. Context API: Dark Mode</h2>
        <p>
          The <code>ThemeContext</code> provides <code>darkMode</code> and{' '}
          <code>toggleDarkMode</code> to all components without prop drilling.
          The toggle below calls <code>toggleDarkMode()</code> from the context.
        </p>
        <div className="context-demo">
          <button className="toggle-btn" onClick={toggleDarkMode}>
            {darkMode ? '☀ Switch to Light' : '🌙 Switch to Dark'}
          </button>
          <p className="mode-status">
            Current mode: <strong>{darkMode ? 'Dark 🌙' : 'Light ☀'}</strong>
          </p>
        </div>
      </section>

      {/* ── Section 3: Routing hint ── */}
      <section className="demo-section" style={sectionStyle}>
        <h2>3. React Router: LatestNews</h2>
        <p>
          The <strong>Latest News</strong> page demonstrates list → detail routing using{' '}
          <code>{'<Link>'}</code> and <code>useParams()</code>.
          This pattern is used in Assignment 3 to add the Gallery as a dedicated route.
        </p>
        <Link to="/news" className="btn">View Latest News →</Link>
      </section>
    </main>
  );
}

/**
 * AppShell – rendered inside Router so it can use useLocation.
 * Reads ThemeContext for the global dark mode class on the wrapper div.
 */
function AppShell() {
  const { darkMode } = useDarkMode();
  const location = useLocation();

  // Apply .dark-mode class to the root wrapper when dark mode is active
  const appClass = `app-shell${darkMode ? ' dark-mode' : ''}`;

  return (
    <div className={appClass}>
      <header className="tutorial-header">
        <div className="header-inner">
          <span className="header-logo">Lab 4 Tutorial</span>
          <nav className="tutorial-nav">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
            <Link to="/news" className={location.pathname.startsWith('/news') ? 'active' : ''}>
              Latest News
            </Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<LatestNews />} />
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>

      <footer className="tutorial-footer">
        <p>Lab 4 Tutorial – Custom Hooks · Context API · React Router</p>
      </footer>
    </div>
  );
}

/**
 * App – root component.
 * ThemeProvider wraps Router so the context is available inside route components.
 */
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppShell />
      </Router>
    </ThemeProvider>
  );
}

export default App;
