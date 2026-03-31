/**
 * LearnScreen — Stage 3: STEAM Q&A cards summarizing what children learned.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { steamFacts } from '../data/models';
import './LearnScreen.css';

const topics = [
  { key: 'science', label: '🔬 Science', cls: 's' },
  { key: 'technology', label: '💻 Technology', cls: 't' },
  { key: 'engineering', label: '⚙️ Engineering', cls: 'e' },
  { key: 'art', label: '🎨 Art', cls: 'a' },
  { key: 'math', label: '🔢 Math', cls: 'm' },
];

export default function LearnScreen() {
  const { setStage, steamProgress, progress } = useBuild();
  const [activeTopic, setActiveTopic] = useState('science');

  const facts = steamFacts[activeTopic] || [];

  return (
    <div className="learn-screen">
      <div className="learn-header">
        <button className="back-btn" onClick={() => setStage('build')}>←</button>
        <span className="logo-small">Brick<span>Buddy</span></span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <span className="stage-label">Stage 3: Learn</span>
      </div>

      <div className="learn-content">
        <div className="buddy-chat">
          <div className="buddy-avatar">🤖</div>
          <div className="buddy-bubble">
            Amazing work building your robot! 🎉 Let's explore the <strong>cool science</strong> behind what you just built!
          </div>
        </div>

        <div className="topic-bar">
          {topics.map(t => (
            <button key={t.key}
              className={`topic-btn ${t.cls} ${activeTopic === t.key ? 'active' : ''}`}
              onClick={() => setActiveTopic(t.key)}>
              {t.label}
              {steamProgress[t.key] > 0 && <span className="topic-count">{steamProgress[t.key]}</span>}
            </button>
          ))}
        </div>

        {facts.map((f, i) => (
          <div key={i} className="qa-card">
            <div className="qa-question">{f.q}</div>
            <div className="qa-answer" dangerouslySetInnerHTML={{ __html: f.a }} />
            <div className="qa-fun-fact">🌟 Fun Fact: {f.fact}</div>
          </div>
        ))}

        <div className="summary-card">
          <h3>🏆 What You Learned Today</h3>
          <div className="summary-topics">
            {steamProgress.science > 0 && <div className="summary-item"><span className="check">✓</span> Center of Gravity & Physics</div>}
            {steamProgress.technology > 0 && <div className="summary-item"><span className="check">✓</span> Robot Sensors & Vision</div>}
            {steamProgress.engineering > 0 && <div className="summary-item"><span className="check">✓</span> Structural Engineering</div>}
            {steamProgress.art > 0 && <div className="summary-item"><span className="check">✓</span> Creative Design & Color</div>}
            {steamProgress.math > 0 && <div className="summary-item"><span className="check">✓</span> Symmetry & Patterns</div>}
            {Object.values(steamProgress).every(v => v === 0) && (
              <>
                <div className="summary-item"><span className="check">✓</span> Building step-by-step</div>
                <div className="summary-item"><span className="check">✓</span> Following instructions</div>
                <div className="summary-item"><span className="check">✓</span> Creativity & patience</div>
              </>
            )}
          </div>
        </div>

        <button className="finish-btn" onClick={() => setStage('celebrate')}>
          Finish & Celebrate! 🎊
        </button>
      </div>
    </div>
  );
}
