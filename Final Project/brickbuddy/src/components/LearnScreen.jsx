/**
 * LearnScreen — Stage 3: STEAM Q&A cards, model-specific learning,
 * interactive quiz, and session summary.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { steamFacts } from '../data/models';
import { playClick, playSuccess } from '../services/soundEffects';
import './LearnScreen.css';

const topics = [
  { key: 'science', label: '\u{1F52C} Science', cls: 's' },
  { key: 'technology', label: '\u{1F4BB} Technology', cls: 't' },
  { key: 'engineering', label: '\u2699\uFE0F Engineering', cls: 'e' },
  { key: 'art', label: '\u{1F3A8} Art', cls: 'a' },
  { key: 'math', label: '\u{1F522} Math', cls: 'm' },
];

// Model-specific learning highlights
const modelLearning = {
  dog: {
    title: 'What You Learned Building Your Robot Dog',
    highlights: [
      { icon: '\u{1F9ED}', text: 'Four-legged stability uses a wide base and symmetry' },
      { icon: '\u{1F4E1}', text: 'Sensor bricks give robots the ability to detect their surroundings' },
      { icon: '\u{1F9F2}', text: 'Hinged joints let parts move, just like a real dog\'s tail' },
      { icon: '\u{1F3A8}', text: 'Decorations make each robot unique \u2014 that\'s industrial design!' },
    ],
  },
  car: {
    title: 'What You Learned Building Your Robot Car',
    highlights: [
      { icon: '\u{1F6DE}', text: 'Round wheels reduce friction so cars can roll smoothly' },
      { icon: '\u{1F4E1}', text: 'Radar and sensors help self-driving cars navigate safely' },
      { icon: '\u{1F4A8}', text: 'Slope shapes are aerodynamic \u2014 they cut through air to go faster' },
      { icon: '\u{1F3C1}', text: 'Spoilers push race cars down at high speed for better grip' },
    ],
  },
  dino: {
    title: 'What You Learned Building Your Dino Bot',
    highlights: [
      { icon: '\u{1F9B4}', text: 'Heavy tails balance heavy heads \u2014 like a seesaw!' },
      { icon: '\u{1F9B7}', text: 'T-Rex had teeth as big as bananas and jaws that could crush bone' },
      { icon: '\u{1F3D7}\uFE0F', text: 'Thick legs support massive weight \u2014 structural engineering in action' },
      { icon: '\u{1F33F}', text: 'Long necks helped dinosaurs reach food high in the trees' },
    ],
  },
};

// Simple quiz questions per model
const quizQuestions = {
  dog: [
    { q: 'Why does the robot dog need a wide, flat base?', options: ['To look pretty', 'To stay balanced', 'To be heavy'], answer: 1 },
    { q: 'What does the sensor brick do?', options: ['Makes it colorful', 'Helps it detect things', 'Holds pieces together'], answer: 1 },
  ],
  car: [
    { q: 'Why are wheels round?', options: ['To look cool', 'To reduce friction', 'To be heavy'], answer: 1 },
    { q: 'What does the radar help the car do?', options: ['Go faster', 'See and navigate', 'Make noise'], answer: 1 },
  ],
  dino: [
    { q: 'Why does the dino need a long tail?', options: ['For decoration', 'To balance the heavy head', 'To swim'], answer: 1 },
    { q: 'Why are the dino\'s legs so thick?', options: ['To look scary', 'To run fast', 'To support heavy weight'], answer: 2 },
  ],
};

export default function LearnScreen() {
  const { setStage, steamProgress, progress, selectedModel, soundEnabled, chatHistory } = useBuild();
  const [activeTopic, setActiveTopic] = useState('science');
  const [quizState, setQuizState] = useState({ started: false, current: 0, score: 0, answers: [] });
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const facts = steamFacts[activeTopic] || [];
  const modelId = selectedModel?.id || 'dog';
  const learning = modelLearning[modelId] || modelLearning.dog;
  const quiz = quizQuestions[modelId] || quizQuestions.dog;
  const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);
  const questionsAsked = chatHistory.filter(m => m.role === 'child').length;

  const handleTopicClick = (key) => {
    if (soundEnabled) playClick();
    setActiveTopic(key);
  };

  const handleQuizAnswer = (optionIdx) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);
    const correct = optionIdx === quiz[quizState.current].answer;
    if (correct && soundEnabled) playSuccess();

    setTimeout(() => {
      setQuizState(prev => ({
        ...prev,
        score: prev.score + (correct ? 1 : 0),
        current: prev.current + 1,
        answers: [...prev.answers, { correct }],
      }));
      setSelectedAnswer(null);
    }, 1200);
  };

  return (
    <div className="learn-screen" role="main" aria-label="Learning stage">
      <header className="learn-header">
        <button className="back-btn" onClick={() => setStage('build')} aria-label="Go back to building">
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className="logo-small" aria-hidden="true">Brick<span>Buddy</span></span>
        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="stage-label">Stage 3: Learn</span>
      </header>

      <div className="learn-content">
        {/* Buddy greeting - personalized to model */}
        <div className="buddy-chat" role="status">
          <div className="buddy-avatar" aria-hidden="true">&#x1F916;</div>
          <div className="buddy-bubble">
            Amazing work building your <strong>{selectedModel?.name || 'Robot'}</strong>! &#x1F389;
            Let's explore the <strong>cool science</strong> behind what you just built!
          </div>
        </div>

        {/* Model-specific learning highlights */}
        <section className="model-highlights" aria-label="What you learned">
          <h3 className="highlights-title">{learning.title}</h3>
          <div className="highlights-grid">
            {learning.highlights.map((h, i) => (
              <div key={i} className="highlight-card">
                <span className="highlight-icon" aria-hidden="true">{h.icon}</span>
                <span className="highlight-text">{h.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* STEAM topic tabs */}
        <div className="topic-bar" role="tablist" aria-label="STEAM topics">
          {topics.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTopic === t.key}
              className={`topic-btn ${t.cls} ${activeTopic === t.key ? 'active' : ''}`}
              onClick={() => handleTopicClick(t.key)}
            >
              {t.label}
              {steamProgress[t.key] > 0 && <span className="topic-count" aria-label={`${steamProgress[t.key]} interactions`}>{steamProgress[t.key]}</span>}
            </button>
          ))}
        </div>

        {/* Q&A cards */}
        <div role="tabpanel" aria-label={`${activeTopic} facts`}>
          {facts.map((f, i) => (
            <div key={i} className="qa-card">
              <div className="qa-question">{f.q}</div>
              <div className="qa-answer" dangerouslySetInnerHTML={{ __html: f.a }} />
              <div className="qa-fun-fact">&#x1F31F; Fun Fact: {f.fact}</div>
            </div>
          ))}
        </div>

        {/* Mini Quiz */}
        <section className="quiz-section" aria-label="Knowledge quiz">
          <h3 className="quiz-title">&#x1F9E0; Quick Quiz</h3>
          {!quizState.started ? (
            <div className="quiz-intro">
              <p>Test what you learned! {quiz.length} quick questions about your {selectedModel?.name || 'robot'}.</p>
              <button className="quiz-start-btn" onClick={() => { setQuizState(s => ({ ...s, started: true })); if (soundEnabled) playClick(); }}>
                Start Quiz!
              </button>
            </div>
          ) : quizState.current < quiz.length ? (
            <div className="quiz-card">
              <div className="quiz-progress">Question {quizState.current + 1} of {quiz.length}</div>
              <div className="quiz-question">{quiz[quizState.current].q}</div>
              <div className="quiz-options">
                {quiz[quizState.current].options.map((opt, i) => {
                  let cls = 'quiz-option';
                  if (selectedAnswer !== null) {
                    if (i === quiz[quizState.current].answer) cls += ' correct';
                    else if (i === selectedAnswer) cls += ' wrong';
                  }
                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => handleQuizAnswer(i)}
                      disabled={selectedAnswer !== null}
                      aria-label={opt}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== null && (
                <div className="quiz-feedback" role="status">
                  {selectedAnswer === quiz[quizState.current].answer
                    ? '\u{1F389} Correct! Great job!'
                    : `Not quite \u2014 the answer is: ${quiz[quizState.current].options[quiz[quizState.current].answer]}`
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="quiz-result">
              <div className="quiz-score">{quizState.score}/{quiz.length}</div>
              <p>{quizState.score === quiz.length ? 'Perfect score! You\'re a STEAM genius! \u{1F31F}' : 'Great effort! You\'re learning fast! \u{1F4AA}'}</p>
            </div>
          )}
        </section>

        {/* Session summary */}
        <div className="summary-card">
          <h3>&#x1F3C6; Your Learning Journey</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <div className="summary-stat-num">{totalSteam}</div>
              <div className="summary-stat-label">STEAM Interactions</div>
            </div>
            <div className="summary-stat">
              <div className="summary-stat-num">{questionsAsked}</div>
              <div className="summary-stat-label">Questions Asked</div>
            </div>
            <div className="summary-stat">
              <div className="summary-stat-num">{Object.values(steamProgress).filter(v => v > 0).length}</div>
              <div className="summary-stat-label">Topics Explored</div>
            </div>
          </div>
          <div className="summary-topics">
            {steamProgress.science > 0 && <div className="summary-item"><span className="check">&check;</span> Center of Gravity &amp; Physics</div>}
            {steamProgress.technology > 0 && <div className="summary-item"><span className="check">&check;</span> Robot Sensors &amp; Vision</div>}
            {steamProgress.engineering > 0 && <div className="summary-item"><span className="check">&check;</span> Structural Engineering</div>}
            {steamProgress.art > 0 && <div className="summary-item"><span className="check">&check;</span> Creative Design &amp; Color</div>}
            {steamProgress.math > 0 && <div className="summary-item"><span className="check">&check;</span> Symmetry &amp; Patterns</div>}
            {Object.values(steamProgress).every(v => v === 0) && (
              <>
                <div className="summary-item"><span className="check">&check;</span> Building step-by-step</div>
                <div className="summary-item"><span className="check">&check;</span> Following instructions</div>
                <div className="summary-item"><span className="check">&check;</span> Creativity &amp; patience</div>
              </>
            )}
          </div>
        </div>

        <button className="finish-btn" onClick={() => { if (soundEnabled) playSuccess(); setStage('celebrate'); }} aria-label="Finish learning and celebrate">
          Finish &amp; Celebrate! &#x1F38A;
        </button>
      </div>
    </div>
  );
}
