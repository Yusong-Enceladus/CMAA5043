/**
 * LEGO Robot model data — each model has steps, pieces, and STEAM facts.
 * This serves as the "knowledge base" for the BrickBuddy AI assistant.
 */

export const robotModels = [
  {
    id: 'dog',
    name: 'Robot Dog',
    emoji: '🐶',
    difficulty: 'Easy',
    pieceCount: 23,
    description: 'A friendly walking robot dog with wagging tail and sensor eyes!',
    steps: [
      {
        num: 1, title: 'Build the Body Base', emoji: '🧱',
        desc: 'Start with a <strong>flat 4×8 plate</strong> — this is the skeleton of your robot dog! Place it on the table in front of you.',
        pieces: [{ color: '#EF4444', name: '1× Red 4×8 Plate' }, { color: '#3B82F6', name: '2× Blue 2×4 Bricks' }],
        tip: 'The flat base spreads weight evenly — that\'s physics!'
      },
      {
        num: 2, title: 'Add the Legs', emoji: '🦿',
        desc: 'Attach <strong>4 tall bricks</strong> to the corners — two in front, two in back. Make sure they\'re the <strong>same height</strong> so your robot stands straight.',
        pieces: [{ color: '#F59E0B', name: '4× Yellow 1×2 Tall Bricks' }, { color: '#8B5CF6', name: '4× Purple 1×1 Feet' }],
        tip: 'Each leg is the same size — this is called symmetry!'
      },
      {
        num: 3, title: 'Build the Head', emoji: '🐕',
        desc: 'Stack bricks for the head! Use a <strong>2×3 plate</strong> on top, add <strong>round pieces</strong> for eyes. The <strong>sensor brick</strong> is your robot\'s eyes!',
        pieces: [{ color: '#10B981', name: '1× Green 2×3 Plate' }, { color: '#FFF', name: '2× White Round 1×1 (Eyes)' }, { color: '#6366F1', name: '1× Sensor Brick' }],
        tip: 'The sensor is like giving your robot superpowers — it can sense things!'
      },
      {
        num: 4, title: 'Attach the Tail', emoji: '🎾',
        desc: 'Add a <strong>hinged piece</strong> to the back so the tail can move! The hinge lets the tail wag — just like a real dog!',
        pieces: [{ color: '#EC4899', name: '1× Pink Hinge Plate' }, { color: '#F97316', name: '3× Orange 1×1 Round Bricks' }],
        tip: 'The tail also helps with balance — like a real dog!'
      },
      {
        num: 5, title: 'Final Touches!', emoji: '✨',
        desc: 'Add <strong>decorative pieces</strong> — a collar, color accents, maybe a bone! This is where your <strong>creativity</strong> shines!',
        pieces: [{ color: '#EF4444', name: '1× Red Collar' }, { color: '#F59E0B', name: '1× Gold Star' }, { color: '#3B82F6', name: 'Your choice!' }],
        tip: 'Every great robot starts with a creative designer — that\'s you!'
      }
    ]
  },
  {
    id: 'car',
    name: 'Robot Car',
    emoji: '🏎️',
    difficulty: 'Easy',
    pieceCount: 18,
    description: 'A speedy robot car with spinning wheels and a radar sensor!',
    steps: [
      { num: 1, title: 'Build the Chassis', emoji: '🧱', desc: 'Start with a <strong>long 4×10 plate</strong> — this is your car\'s frame!', pieces: [{ color: '#3B82F6', name: '1× Blue 4×10 Plate' }], tip: 'Race cars use long, flat frames to go fast!' },
      { num: 2, title: 'Add Wheels', emoji: '🛞', desc: 'Attach <strong>4 wheel pieces</strong> with axles to the bottom corners.', pieces: [{ color: '#333', name: '4× Wheel + Axle sets' }], tip: 'Round wheels reduce friction — that\'s why things roll!' },
      { num: 3, title: 'Build the Cockpit', emoji: '💺', desc: 'Stack bricks to make a driver seat and windshield.', pieces: [{ color: '#10B981', name: '2× Green Slope Bricks' }, { color: '#93C5FD', name: '1× Clear Windshield' }], tip: 'The slope shape is aerodynamic — it cuts through air!' },
      { num: 4, title: 'Add the Radar', emoji: '📡', desc: 'Place a <strong>rotating sensor</strong> on top — this is the car\'s brain!', pieces: [{ color: '#8B5CF6', name: '1× Sensor Dish' }, { color: '#F59E0B', name: '1× Turntable Base' }], tip: 'Self-driving cars use radar and cameras to see!' },
      { num: 5, title: 'Decorate!', emoji: '🎨', desc: 'Add racing stripes, number plates, and spoilers!', pieces: [{ color: '#EF4444', name: 'Sticker pieces' }], tip: 'Spoilers push the car down at high speeds — more grip!' }
    ]
  },
  {
    id: 'dino',
    name: 'Dino Bot',
    emoji: '🦕',
    difficulty: 'Medium',
    pieceCount: 30,
    description: 'A mighty dinosaur robot with moving jaw and stomping legs!',
    steps: [
      { num: 1, title: 'Build the Body', emoji: '🧱', desc: 'Create a large <strong>6×4 body</strong> using stacked plates.', pieces: [{ color: '#10B981', name: '2× Green 4×6 Plates' }], tip: 'Dinosaurs were the biggest land animals ever!' },
      { num: 2, title: 'Add Stomping Legs', emoji: '🦶', desc: 'Attach <strong>thick leg columns</strong> — 2 in front, 2 in back. Extra wide for stability!', pieces: [{ color: '#10B981', name: '8× Green 2×2 Bricks' }], tip: 'T-Rex legs were as thick as tree trunks!' },
      { num: 3, title: 'Build the Long Neck', emoji: '🦒', desc: 'Stack angled bricks upward to create a sweeping neck.', pieces: [{ color: '#34D399', name: '4× Light Green Slope Bricks' }], tip: 'Long necks helped dinosaurs reach tall trees!' },
      { num: 4, title: 'Create the Head', emoji: '🦖', desc: 'Add a <strong>hinged jaw</strong> that opens and closes! Plus teeth pieces.', pieces: [{ color: '#10B981', name: '1× Hinge Jaw' }, { color: '#FFF', name: '6× White Tooth Pieces' }], tip: 'T-Rex had teeth as big as bananas!' },
      { num: 5, title: 'Add the Tail', emoji: '🐊', desc: 'Build a long tapering tail for balance. Add spikes if you want!', pieces: [{ color: '#10B981', name: '5× Tapering Bricks' }, { color: '#F59E0B', name: '3× Spike Pieces' }], tip: 'The tail balanced the heavy head — like a seesaw!' }
    ]
  }
];

export const steamFacts = {
  science: [
    { q: 'Why does my robot fall over?', a: 'Because of <strong>center of gravity</strong>! When heavy parts are too high, gravity pulls them down. Wide, flat bases keep things balanced.', fact: 'Real dogs use their tails to help balance!' },
    { q: 'How do magnets work in LEGO?', a: 'Some LEGO pieces use tiny <strong>magnets</strong> that attract metal. Magnets have a north and south pole — opposites attract!', fact: 'The Earth itself is a giant magnet!' }
  ],
  technology: [
    { q: 'How do real robots see?', a: 'Real robots use <strong>sensors</strong> — cameras, infrared, and ultrasonic. That\'s why we added the sensor brick — it\'s your robot\'s eyes!', fact: 'Some robots can see in the dark using infrared!' },
    { q: 'Can robots think?', a: 'Robots follow <strong>programs</strong> — instructions written by humans. AI helps robots learn from experience, like how you learn from practice!', fact: 'The word "robot" comes from a Czech word meaning "forced labor"!' }
  ],
  engineering: [
    { q: 'Why different-shaped pieces?', a: 'Each shape has a job! <strong>Flat plates</strong> spread weight. <strong>Tall bricks</strong> add height. <strong>Angled pieces</strong> let things bend.', fact: 'Engineers study shapes for years to find the best ones!' },
    { q: 'What makes structures strong?', a: '<strong>Triangles</strong> are the strongest shape! That\'s why bridges and buildings use triangular supports.', fact: 'The Egyptian pyramids are triangle-shaped and lasted 4,500 years!' }
  ],
  art: [
    { q: 'Can I make my robot look different?', a: 'Absolutely! Choose different <strong>colors</strong>, add <strong>decorations</strong>, change the shape. Every great robot starts with a creative designer!', fact: 'Pixar uses real robots as inspiration for movie characters!' },
    { q: 'Why do colors matter?', a: 'Colors affect how people <strong>feel</strong>. Red = energy, blue = calm, yellow = happy. Choose colors that match your robot\'s personality!', fact: 'Bees can\'t see red, but they can see ultraviolet!' }
  ],
  math: [
    { q: 'How many pieces did we use?', a: 'Count them! We used <strong>symmetry</strong> — each side looks the same, like a mirror. That\'s math!', fact: 'The word "symmetry" comes from Greek meaning "same measure"!' },
    { q: 'What is a pattern?', a: 'A pattern is something that <strong>repeats</strong>. Your robot legs repeat the same shape 4 times — that\'s a pattern!', fact: 'Your DNA is a pattern of just 4 letters: A, T, C, G!' }
  ]
};
