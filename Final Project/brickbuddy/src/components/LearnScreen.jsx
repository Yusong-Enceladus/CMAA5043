/**
 * LearnScreen — Redesigned. Three model-specific STEAM highlights at the top,
 * a mini 3D preview of the finished build, STEAM topic cards (keeping the
 * existing `steamFacts` knowledge base + `steamProgress` tracking), and a
 * short quiz. Layout uses the new design tokens.
 */
import { useState } from 'react';
import { useBuild } from '../context/BuildContext';
import { steamFacts } from '../data/models';
import { playClick, playSuccess } from '../services/soundEffects';
import LegoViewer3D from './LegoViewer3D';
import { BuddyFace } from '../design/Buddy';
import { Btn, Card, Chip, Display, Kicker, TopBar } from '../design/UI';

const TOPICS = [
  { key: 'science',     label: '\u{1F52C} Science'     },
  { key: 'technology',  label: '\u{1F4BB} Technology'  },
  { key: 'engineering', label: '\u2699\uFE0F Engineering' },
  { key: 'art',         label: '\u{1F3A8} Art'         },
  { key: 'math',        label: '\u{1F522} Math'        },
];

const HIGHLIGHTS = {
  dog: {
    title: 'Four Legs, Perfect Balance',
    rows: [
      { icon: '\u{1F9ED}', t: 'Quadrupeds never tip',      d: 'Four feet form a stable rectangle — even on bumpy floors.' },
      { icon: '\u{1F9B4}', t: 'Joints are levers',         d: "Your dog's knee + hip multiply force so it could walk for real." },
      { icon: '\u{1F442}', t: 'Floppy ears focus sound',   d: 'Their shape funnels waves toward the ear — like a satellite dish.' },
    ],
  },
  car: {
    title: 'Round Wheels, Fast Air',
    rows: [
      { icon: '\u{1F6DE}', t: 'Round = smooth roll',  d: 'Every point on the edge is the same distance from the axle.' },
      { icon: '\u{1F4A8}', t: 'Slopes cut air',       d: 'Aerodynamic shapes let cars go faster with less fuel.' },
      { icon: '\u{1F4E1}', t: 'Radar = echolocation', d: 'Self-driving cars send out waves and listen for bounces back.' },
    ],
  },
  dino: {
    title: 'Heavy Tail, Heavy Head',
    rows: [
      { icon: '\u2696\uFE0F', t: 'Seesaw balance',    d: 'A long tail counterweights a heavy head so T-Rex could stand.' },
      { icon: '\u{1F3D7}\uFE0F', t: 'Column legs',    d: 'Thick shins act like columns — the strongest shape under load.' },
      { icon: '\u{1F9B7}', t: '60 banana teeth',      d: 'T-Rex had the strongest bite of any land animal — ever.' },
    ],
  },
};

const QUIZ = {
  dog:  [
    { q: 'Why does the robot dog need a wide, flat base?', options: ['To look pretty', 'To stay balanced', 'To be heavy'], answer: 1 },
    { q: 'What do floppy ears do?', options: ['Nothing', 'Focus sound', 'Keep warm'], answer: 1 },
  ],
  car:  [
    { q: 'Why are wheels round?', options: ['Less friction', 'Looks pretty', 'Costs less'], answer: 0 },
    { q: 'Why a sloped hood?', options: ['Rain', 'Aerodynamics', 'Strength'], answer: 1 },
  ],
  dino: [
    { q: 'Why such a long tail?', options: ['Balance', 'Swim', 'Swat flies'], answer: 0 },
    { q: 'Why column-thick legs?', options: ['Speed', 'Hold weight', 'Look scary'], answer: 1 },
  ],
};

export default function LearnScreen() {
  const { selectedModel, setStage, steamProgress, chatHistory, soundEnabled } = useBuild();
  const modelId = selectedModel?.id || 'dog';
  const learning = HIGHLIGHTS[modelId] || HIGHLIGHTS.dog;
  const quiz = QUIZ[modelId] || QUIZ.dog;

  const [activeTopic, setActiveTopic] = useState('science');
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const facts = steamFacts[activeTopic] || [];
  const totalSteam = Object.values(steamProgress).reduce((a, b) => a + b, 0);
  const questionsAsked = chatHistory.filter(m => m.role === 'child').length;
  const topicsExplored = Object.values(steamProgress).filter(v => v > 0).length;

  const handlePick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === quiz[qi].answer;
    if (correct) {
      setScore(s => s + 1);
      if (soundEnabled) playSuccess();
    }
    setTimeout(() => {
      if (qi + 1 < quiz.length) { setQi(qi + 1); setPicked(null); }
      else setDone(true);
    }, 1100);
  };

  const handleTopicChange = (t) => {
    if (soundEnabled) playClick();
    setActiveTopic(t);
  };

  return (
    <div className="bb-screen" role="main" aria-label="Learning stage">
      <TopBar onBack={() => setStage('build')} progressLabel="STAGE 3 · LEARN">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip bg="var(--paper-2)" color="var(--ink-2)">&#x1F9E0; What you learned</Chip>
        </div>
      </TopBar>

      <div style={{ flex: 1, padding: '28px 20px 40px', background: 'radial-gradient(ellipse at 50% 0%, #FFE0CC 0%, #FFF6EC 60%)', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 28 }}>
          {/* Hero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <Kicker>You built it.</Kicker>
              <Display size="md">{learning.title}</Display>
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 17, lineHeight: 1.5 }}>
                Three big ideas your {selectedModel?.name || 'robot'} taught you. Buddy picked these
                from the steps you just built.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                <Chip bg="rgba(47,111,235,0.14)" color="var(--live)">
                  {totalSteam} STEAM interactions
                </Chip>
                <Chip bg="rgba(15,153,104,0.14)" color="var(--ok)">
                  {questionsAsked} questions asked
                </Chip>
                <Chip bg="rgba(225,79,59,0.14)" color="var(--brick-red)">
                  {topicsExplored} topics explored
                </Chip>
              </div>
            </div>
            <Card pad={0} style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
              <LegoViewer3D
                model={selectedModel}
                currentStep={(selectedModel?.steps?.length || 1) - 1}
                autoRotate
                showControls={false}
              />
            </Card>
          </div>

          {/* Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {learning.rows.map((h, i) => (
              <Card key={i} pad={20} style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 34 }}>{h.icon}</div>
                <div className="serif" style={{ fontSize: 20, lineHeight: 1.15 }}>{h.t}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>{h.d}</div>
              </Card>
            ))}
          </div>

          {/* Topic tabs + facts */}
          <Card pad={24} style={{ display: 'grid', gap: 16 }}>
            <Kicker>Dive deeper</Kicker>
            <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TOPICS.map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeTopic === t.key}
                  onClick={() => handleTopicChange(t.key)}
                  style={{
                    padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13,
                    background: activeTopic === t.key ? 'var(--ink)' : 'rgba(26,20,16,0.06)',
                    color: activeTopic === t.key ? '#FFF6EC' : 'var(--ink-2)',
                    display: 'inline-flex', gap: 8, alignItems: 'center',
                  }}>
                  {t.label}
                  {steamProgress[t.key] > 0 && (
                    <span style={{
                      background: activeTopic === t.key ? 'rgba(255,246,236,0.2)' : 'var(--brick-red)',
                      color: activeTopic === t.key ? '#FFF6EC' : '#FFF',
                      padding: '1px 6px', borderRadius: 999, fontSize: 11,
                    }}>{steamProgress[t.key]}</span>
                  )}
                </button>
              ))}
            </div>
            <div role="tabpanel" style={{ display: 'grid', gap: 10 }}>
              {facts.map((f, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 14, background: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                }}>
                  <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, marginBottom: 6 }}>{f.q}</div>
                  <div
                    style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}
                    dangerouslySetInnerHTML={{ __html: f.a }}
                  />
                  {f.fact && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, fontWeight: 600 }}>
                      &#x1F31F; Fun Fact: {f.fact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Quiz */}
          <Card pad={28} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BuddyFace size={42} state="speaking" />
              <div>
                <Kicker color="var(--brick-red)">Quick quiz</Kicker>
                <div className="serif" style={{ fontSize: 22 }}>Two questions. Ready?</div>
              </div>
              <div style={{ flex: 1 }} />
              <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {done ? `${score}/${quiz.length}` : `${qi + 1} / ${quiz.length}`}
              </div>
            </div>
            {!done ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>{quiz[qi].q}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {quiz[qi].options.map((o, i) => {
                    const correct = picked !== null && i === quiz[qi].answer;
                    const wrong   = picked !== null && i === picked && i !== quiz[qi].answer;
                    return (
                      <button
                        key={i}
                        onClick={() => handlePick(i)}
                        disabled={picked !== null}
                        style={{
                          padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                          background: correct ? 'rgba(15,153,104,0.12)' : wrong ? 'rgba(225,79,59,0.12)' : 'rgba(26,20,16,0.04)',
                          border: `1.5px solid ${correct ? 'var(--ok)' : wrong ? 'var(--brick-red)' : 'transparent'}`,
                          fontSize: 15, fontWeight: 600, color: 'var(--ink)',
                          cursor: picked !== null ? 'default' : 'pointer',
                        }}>
                        {o}{correct && ' \u2713'}{wrong && ' \u2715'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 56, fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--brick-red)' }}>
                  {score}/{quiz.length}
                </div>
                <div style={{ fontSize: 16, color: 'var(--ink-2)' }}>
                  {score === quiz.length ? 'Perfect score! You totally got it. \u{1F31F}' : "Nice work — you're learning fast. \u{1F4AA}"}
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="brick" size="lg" onClick={() => { if (soundEnabled) playSuccess(); setStage('celebrate'); }}
              icon="🎉">
              Celebrate your build
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
