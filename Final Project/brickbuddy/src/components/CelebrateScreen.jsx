/**
 * CelebrateScreen — Completion celebration with confetti, achievements,
 * build time, personalized stats, and shareable certificate.
 */
import { useEffect, useRef } from 'react';
import { useBuild } from '../context/BuildContext';
import { playCelebration } from '../services/soundEffects';
import './CelebrateScreen.css';

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CelebrateScreen() {
  const {
    selectedModel, steamProgress, achievements, buildDuration,
    chatHistory, resetSession, soundEnabled,
  } = useBuild();
  const certificateRef = useRef(null);

  // Launch confetti + fanfare on mount
  useEffect(() => {
    if (soundEnabled) playCelebration();

    const container = document.getElementById('confetti');
    if (!container) return;
    const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#A855F7', '#F472B6', '#60A5FA', '#34D399'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = `${6 + Math.random() * 10}px`;
      el.style.height = `${6 + Math.random() * 10}px`;
      el.style.animationDuration = `${2 + Math.random() * 3}s`;
      el.style.animationDelay = `${Math.random() * 2}s`;
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(el);
    }
    return () => { container.innerHTML = ''; };
  }, [soundEnabled]);

  const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);
  const topicsExplored = Object.values(steamProgress).filter(v => v > 0).length;
  const questionsAsked = chatHistory.filter(m => m.role === 'child').length;

  // Generate a shareable certificate as canvas image
  const handleDownloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, '#FFF5EE');
    grad.addColorStop(1, '#FFE8D6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    // Border
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 460);
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 440);

    // Title
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Achievement', 400, 80);

    // Subtitle
    ctx.fillStyle = '#666';
    ctx.font = '18px Nunito, sans-serif';
    ctx.fillText('BrickBuddy STEAM Building Challenge', 400, 115);

    // Trophy
    ctx.font = '60px serif';
    ctx.fillText('\u{1F3C6}', 400, 185);

    // Model info
    ctx.fillStyle = '#2D3436';
    ctx.font = 'bold 24px Nunito, sans-serif';
    ctx.fillText(`Successfully built: ${selectedModel?.name || 'Robot'}`, 400, 240);

    // Stats
    ctx.font = '16px Nunito, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(`${selectedModel?.pieceCount || 0} pieces \u2022 ${selectedModel?.steps.length || 0} steps \u2022 ${topicsExplored} STEAM topics`, 400, 275);
    if (buildDuration > 0) {
      ctx.fillText(`Build time: ${formatDuration(buildDuration)}`, 400, 300);
    }

    // Achievements
    if (achievements.length > 0) {
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 16px Nunito, sans-serif';
      ctx.fillText('Achievements:', 400, 340);
      ctx.font = '14px Nunito, sans-serif';
      ctx.fillStyle = '#555';
      const achText = achievements.map(a => `${a.icon} ${a.label}`).join('  \u2022  ');
      ctx.fillText(achText, 400, 365);
    }

    // Footer
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Nunito, sans-serif';
    ctx.fillText('Powered by BrickBuddy \u2022 CMAA5043 Final Project \u2022 Yusong & Jiayi', 400, 450);
    ctx.fillText(new Date().toLocaleDateString(), 400, 470);

    // Download
    const link = document.createElement('a');
    link.download = `BrickBuddy-${selectedModel?.name || 'Robot'}-Certificate.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="celebrate-screen" role="main" aria-label="Celebration">
      <div id="confetti" className="confetti-container" aria-hidden="true" />

      <div className="trophy" aria-hidden="true">&#x1F3C6;</div>
      <h1>You Did It!</h1>
      <p className="celebrate-msg">
        You built an amazing <strong>{selectedModel?.name || 'Robot'}</strong> {selectedModel?.emoji} and learned
        so much about science, engineering, and more!
      </p>

      {/* Stats row */}
      <div className="stats-row" role="group" aria-label="Build statistics">
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
        {buildDuration > 0 && (
          <div className="stat-card">
            <div className="stat-num">{formatDuration(buildDuration)}</div>
            <div className="stat-label">Build Time</div>
          </div>
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="achievements-section" aria-label="Achievements earned">
          <h2 className="achievements-title">&#x1F31F; Achievements Unlocked</h2>
          <div className="achievements-grid">
            {achievements.map(a => (
              <div key={a.id} className="achievement-card">
                <div className="achievement-icon">{a.icon}</div>
                <div className="achievement-label">{a.label}</div>
                <div className="achievement-desc">{a.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STEAM breakdown */}
      {topicsExplored > 0 && (
        <div className="steam-breakdown" aria-label="STEAM topics explored">
          {Object.entries(steamProgress).map(([key, val]) => val > 0 && (
            <div key={key} className={`steam-pill ${key}`}>
              {key === 'science' && '\u{1F52C}'}
              {key === 'technology' && '\u{1F4BB}'}
              {key === 'engineering' && '\u2699\uFE0F'}
              {key === 'art' && '\u{1F3A8}'}
              {key === 'math' && '\u{1F522}'}
              {' '}{key} &times;{val}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="celebrate-actions">
        <button className="certificate-btn" onClick={handleDownloadCertificate} aria-label="Download your certificate">
          &#x1F4DC; Download Certificate
        </button>
        <button className="restart-btn" onClick={resetSession} aria-label="Build another robot">
          Build Again! &#x1F504;
        </button>
      </div>
    </div>
  );
}
