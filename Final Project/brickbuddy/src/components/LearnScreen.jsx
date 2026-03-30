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
  const { setStage, steamProgress } = useBuild();
  const [activeTopic, setActiveTopic] = useState('science');

  const facts = steamFacts[activeTopic] || [];

  return (
    <div className="learn-screen">
      <div className="learn-header">
        <button className="back-btn" onClick={() => setStage('build')}>←</button>
        <span className="logo-small">Brick<span>Buddy</span></span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: '85%' }} /></div>
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
            {['Center of Gravity', 'Robot Sensors', 'Structural Shapes', 'Symmetry', 'Creative Design'].map(item => (
              <div key={item} className="summary-item"><span className="check">✓</span> {item}</div>
            ))}
          </div>
        </div>

        <button className="finish-btn" onClick={() => setStage('celebrate')}>
          Finish & Celebrate! 🎊
        </button>
      </div>
    </div>
  );
}
