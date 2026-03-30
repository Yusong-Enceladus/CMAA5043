/**
 * CelebrateScreen — Completion celebration with confetti, stats, and learning summary.
 */
import { useEffect } from 'react';
import { useBuild } from '../context/BuildContext';
import './CelebrateScreen.css';

export default function CelebrateScreen() {
  const { selectedModel, steamProgress, resetSession } = useBuild();

  // Launch confetti on mount
  useEffect(() => {
    const container = document.getElementById('confetti');
    if (!container) return;
    const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#A855F7', '#F472B6', '#60A5FA', '#34D399'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = `${6 + Math.random() * 10}px`;
      el.style.height = `${6 + Math.random() * 10}px`;
      el.style.animationDuration = `${2 + Math.random() * 3}s`;
      el.style.animationDelay = `${Math.random() * 2}s`;
      container.appendChild(el);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);

  return (
    <div className="celebrate-screen">
      <div id="confetti" className="confetti-container" />
      <div className="trophy">🏆</div>
      <h1>You Did It!</h1>
      <p className="celebrate-msg">
        You built an amazing {selectedModel?.name || 'Robot'} and learned so much about
        science, engineering, and more!
      </p>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{selectedModel?.pieceCount || 0}</div>
          <div className="stat-label">Pieces Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{selectedModel?.steps.length || 0}</div>
          <div className="stat-label">Steps Done</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalSteam}</div>
          <div className="stat-label">Things Learned</div>
        </div>
      </div>
      <button className="restart-btn" onClick={resetSession}>Build Again! 🔄</button>
    </div>
  );
}
