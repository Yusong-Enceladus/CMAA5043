import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, useDarkMode } from './context/ThemeContext';
import ClickDemo from './components/ClickDemo';
import LatestNews from './components/LatestNews';
// Assignment 2: Import PerformanceMonitor to measure rendering time
import PerformanceMonitor from './components/PerformanceMonitor';
import './App.css';

// --- Assignment 3: Use React.lazy to lazy-load NewsDetail ---
// Instead of: import NewsDetail from './components/NewsDetail';
// We use React.lazy for code-splitting — NewsDetail loads only when user navigates to /news/:id
const NewsDetail = lazy(() => import('./components/NewsDetail'));

/**
 * Home – demonstrates both the useClickPosition hook and the ThemeContext.
 */
function Home() {
  const { darkMode, toggleDarkMode } = useDarkMode();

  const sectionStyle = {
    backgroundColor: darkMode ? '#16213e' : '#ffffff',
    borderColor: darkMode ? '#0f3460' : '#e0e0e0',
    color: darkMode ? '#e0e0e0' : '#333',
  };

  return (
    <main className="home-main">
      {/* Assignment 2: Wrap 3 components with PerformanceMonitor */}

      {/* Component 1: ClickDemo - measured with performance.now */}
      <section className="demo-section" style={sectionStyle}>
        <h2>1. Custom Hook: <code>useClickPosition</code></h2>
        <p>
          The <code>useClickPosition(logName)</code> hook accepts a name that identifies
          the click area. Click inside either box below and watch the console for logged output.
        </p>
        <PerformanceMonitor name="ClickDemo">
          <ClickDemo />
        </PerformanceMonitor>
      </section>

      {/* Component 2: ThemeContext dark mode demo - measured with performance.now */}
      <section className="demo-section" style={sectionStyle}>
        <h2>2. Context API: Dark Mode</h2>
        <p>
          The <code>ThemeContext</code> provides <code>darkMode</code> and{' '}
          <code>toggleDarkMode</code> to all components without prop drilling.
        </p>
        <PerformanceMonitor name="DarkModeToggle">
          <div className="context-demo">
            <button className="toggle-btn" onClick={toggleDarkMode}>
              {darkMode ? '☀ Switch to Light' : '🌙 Switch to Dark'}
            </button>
            <p className="mode-status">
              Current mode: <strong>{darkMode ? 'Dark 🌙' : 'Light ☀'}</strong>
            </p>
          </div>
        </PerformanceMonitor>
      </section>

      {/* Component 3: Routing section - measured with performance.now */}
      <section className="demo-section" style={sectionStyle}>
        <h2>3. React Router: LatestNews</h2>
        <PerformanceMonitor name="RoutingSection">
          <p>
            The <strong>Latest News</strong> page demonstrates list → detail routing using{' '}
            <code>{'<Link>'}</code> and <code>useParams()</code>.
            It also features a <strong>real-time clock</strong> (Assignment 1).
          </p>
          <Link to="/news" className="btn">View Latest News →</Link>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#888' }}>
            💡 NewsDetail is lazy-loaded with React.lazy (Assignment 3)
          </p>
        </PerformanceMonitor>
      </section>
    </main>
  );
}

/**
 * AppShell – rendered inside Router so it can use useLocation.
 */
function AppShell() {
  const { darkMode } = useDarkMode();
  const location = useLocation();

  const appClass = `app-shell${darkMode ? ' dark-mode' : ''}`;

  return (
    <div className={appClass}>
      <header className="tutorial-header">
        <div className="header-inner">
          <span className="header-logo">Lab 7 Exercise</span>
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
        {/* Assignment 3: Wrap lazy-loaded NewsDetail in Suspense with fallback */}
        <Route path="/news/:id" element={
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>⏳ Loading article...</div>}>
            <NewsDetail />
          </Suspense>
        } />
      </Routes>

      <footer className="tutorial-footer">
        <p>Lab 7 Exercise – Real-time Clock · Performance Monitoring · React.lazy</p>
      </footer>
    </div>
  );
}

/**
 * App – root component.
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
