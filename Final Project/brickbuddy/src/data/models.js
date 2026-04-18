/**
 * LEGO Robot model data.
 * Each step includes:
 *  - Build instructions (title, desc, pieces, tip, steamTag)
 *  - 3D part list (`newParts`) — bricks ADDED at this step.
 *    The 3D viewer cumulates step 1..currentStep to animate the build.
 *
 * Part coordinate system (for LegoViewer3D):
 *  - Units: 1 stud wide (both X and Z).
 *  - Y is up; 1 plate = 0.4 units tall, 1 brick = 1.2 units tall.
 *  - `pos` is the CENTER of the brick.
 *  - `size` is [width, height, depth] in studs × stud × studs (height in world units).
 */

const P = 0.4;              // plate height
const B = 1.2;              // brick height (3 plates)

/* Helpers keep the step data compact */
const plate = (x, y, z, w, d, color, extra = {}) => ({ type: 'plate', pos: [x, y, z], size: [w, P, d], color, ...extra });
const brick = (x, y, z, w, d, color, extra = {}) => ({ type: 'brick', pos: [x, y, z], size: [w, B, d], color, ...extra });
const tallBrick = (x, y, z, w, d, h, color, extra = {}) => ({ type: 'brick', pos: [x, y, z], size: [w, h, d], color, ...extra });
const slope = (x, y, z, w, d, color, extra = {}) => ({ type: 'slope', pos: [x, y, z], size: [w, B, d], color, ...extra });
const cyl = (x, y, z, r, h, color, extra = {}) => ({ type: 'cylinder', pos: [x, y, z], size: [r * 2, h, r * 2], color, ...extra });
const cone = (x, y, z, r, h, color, extra = {}) => ({ type: 'cone', pos: [x, y, z], size: [r * 2, h, r * 2], color, ...extra });
const wheel = (x, y, z, color) => ({ type: 'wheel', pos: [x, y, z], size: [1.6, 1.0, 1.6], color });
const tile = (x, y, z, w, d, color) => ({ type: 'tile', pos: [x, y, z], size: [w, P, d], color });

export const robotModels = [
  {
    id: 'dog',
    name: 'Robot Dog',
    emoji: '🐶',
    difficulty: 'Easy',
    pieceCount: 38,
    color: '#F59E0B',
    description: 'A friendly walking robot dog with wagging tail, perky ears, and sensor eyes!',
    steps: [
      {
        num: 1, title: 'Lay the Body Base', emoji: '🧱',
        desc: 'Start with a sturdy <strong>4×8 red plate</strong>. This is your robot dog\'s skeleton — everything else attaches here!',
        pieces: [{ color: '#EF4444', name: '1× Red 4×8 Plate' }],
        tip: 'A wide flat base spreads weight evenly — that\'s why buildings have flat foundations!',
        steamTag: 'engineering',
        newParts: [
          plate(0, P / 2, 0, 4, 8, '#EF4444'),
        ],
      },
      {
        num: 2, title: 'Attach the Four Legs', emoji: '🦿',
        desc: 'Place <strong>4 tall yellow bricks</strong> at the four corners — these are the legs. Make sure they\'re the same height so your dog stands straight!',
        pieces: [{ color: '#F59E0B', name: '4× Yellow 1×1 Tall Bricks' }],
        tip: 'Four legs with equal length = bilateral symmetry. Real animals use this for stable walking.',
        steamTag: 'math',
        newParts: [
          tallBrick(-1.5, P + B, -3, 1, 1, B * 2, '#F59E0B'),
          tallBrick(1.5, P + B, -3, 1, 1, B * 2, '#F59E0B'),
          tallBrick(-1.5, P + B, 3, 1, 1, B * 2, '#F59E0B'),
          tallBrick(1.5, P + B, 3, 1, 1, B * 2, '#F59E0B'),
        ],
      },
      {
        num: 3, title: 'Add the Paw Pads', emoji: '🐾',
        desc: 'Stick a <strong>small purple tile</strong> under each leg to act as paw pads — they give your dog grip on the floor!',
        pieces: [{ color: '#8B5CF6', name: '4× Purple 1×1 Tiles' }],
        tip: 'Rubber pads on robots increase friction, just like shoes grip the ground.',
        steamTag: 'science',
        newParts: [
          tile(-1.5, -0.05, -3, 1, 1, '#8B5CF6'),
          tile(1.5, -0.05, -3, 1, 1, '#8B5CF6'),
          tile(-1.5, -0.05, 3, 1, 1, '#8B5CF6'),
          tile(1.5, -0.05, 3, 1, 1, '#8B5CF6'),
        ],
      },
      {
        num: 4, title: 'Build the Chest', emoji: '💛',
        desc: 'Stack <strong>two 2×4 blue bricks</strong> onto the middle of the base to form a strong chest. This is where the head and tail will attach!',
        pieces: [{ color: '#3B82F6', name: '2× Blue 2×4 Bricks' }],
        tip: 'Stacking bricks offset from each other (like real bricks!) makes the structure stronger — this is called a <em>running bond</em>.',
        steamTag: 'engineering',
        newParts: [
          brick(0, P + B / 2, 0, 2, 4, '#3B82F6'),
          brick(0, P + B + B / 2, 0, 2, 4, '#3B82F6'),
        ],
      },
      {
        num: 5, title: 'Form the Neck', emoji: '🦒',
        desc: 'Place an <strong>angled green slope brick</strong> on top of the chest, rising toward the front. The slope lifts the head up high!',
        pieces: [{ color: '#10B981', name: '1× Green 2×2 Slope Brick' }],
        tip: 'A slope (inclined plane) is one of the 6 classic simple machines — ramps let you raise things with less effort!',
        steamTag: 'science',
        newParts: [
          slope(0, P + B * 2 + B / 2, -2.5, 2, 2, '#10B981', { rotation: [0, 0, 0] }),
        ],
      },
      {
        num: 6, title: 'Build the Head', emoji: '🐕',
        desc: 'Add a <strong>green 2×3 head block</strong> on the neck. Then press <strong>two white round eyes</strong> and a <strong>purple sensor brick</strong> on top — that\'s your dog\'s brain!',
        pieces: [
          { color: '#10B981', name: '1× Green 2×3 Head' },
          { color: '#FFFFFF', name: '2× White 1×1 Round Eyes' },
          { color: '#6366F1', name: '1× Purple Sensor Brick' },
        ],
        tip: 'Real robots use camera "eyes" plus a central processor (the sensor brick) to understand the world.',
        steamTag: 'technology',
        newParts: [
          brick(0, P + B * 3 + B / 2, -3.5, 2, 2, '#10B981'),
          cyl(-0.6, P + B * 4 + 0.2, -4.4, 0.3, 0.4, '#FFFFFF'),
          cyl(0.6, P + B * 4 + 0.2, -4.4, 0.3, 0.4, '#FFFFFF'),
          tallBrick(0, P + B * 4 + B / 2, -3.2, 1, 1, B, '#6366F1'),
        ],
      },
      {
        num: 7, title: 'Wag the Tail', emoji: '🎾',
        desc: 'On the back of the chest, attach a <strong>pink hinge</strong> and stack <strong>3 orange round bricks</strong> on it. The hinge lets the tail wag side-to-side!',
        pieces: [
          { color: '#EC4899', name: '1× Pink Hinge Plate' },
          { color: '#F97316', name: '3× Orange 1×1 Round Bricks' },
        ],
        tip: 'A hinge is a mechanical joint that allows rotation on one axis — your elbow works the same way!',
        steamTag: 'engineering',
        newParts: [
          plate(0, P + B * 2 + P / 2, 2.6, 1, 1, '#EC4899'),
          cyl(0, P + B * 2 + P + 0.4, 3.2, 0.35, 0.8, '#F97316'),
          cyl(0, P + B * 2 + P + 1.2, 3.6, 0.35, 0.8, '#F97316'),
          cyl(0, P + B * 2 + P + 2.0, 4.0, 0.35, 0.8, '#F97316'),
        ],
      },
      {
        num: 8, title: 'Decorate Your Dog!', emoji: '✨',
        desc: 'Add a <strong>red collar</strong> around the neck and a <strong>gold star</strong> on the chest. This is your signature — make it uniquely YOURS!',
        pieces: [
          { color: '#EF4444', name: '1× Red Collar Ring' },
          { color: '#FCD34D', name: '1× Gold Star Tile' },
        ],
        tip: 'Product designers spend months deciding colors and details — you are doing the same job!',
        steamTag: 'art',
        newParts: [
          cyl(0, P + B * 2 + B + 0.2, -2.3, 0.9, 0.2, '#EF4444'),
          tile(0, P + B * 2 + B + P, 0, 1, 1, '#FCD34D'),
        ],
      },
    ],
  },

  {
    id: 'car',
    name: 'Robot Car',
    emoji: '🏎️',
    difficulty: 'Easy',
    pieceCount: 32,
    color: '#3B82F6',
    description: 'A speedy robot car with spinning wheels, a radar dish, and racing decals!',
    steps: [
      {
        num: 1, title: 'Lay the Chassis', emoji: '🧱',
        desc: 'Start with a long <strong>4×10 blue plate</strong>. This is the foundation — the floor of your car!',
        pieces: [{ color: '#3B82F6', name: '1× Blue 4×10 Plate' }],
        tip: 'Race cars have long flat chassis to stay low and stable — less air flips them at high speed.',
        steamTag: 'engineering',
        newParts: [
          plate(0, P / 2, 0, 4, 10, '#3B82F6'),
        ],
      },
      {
        num: 2, title: 'Mount the Wheels', emoji: '🛞',
        desc: 'Attach <strong>4 black wheels</strong> to the corners using axle pieces. Spin them to check they roll smoothly!',
        pieces: [{ color: '#111827', name: '4× Wheel + Axle sets' }],
        tip: 'Round wheels reduce friction — that\'s why humans invented them 6,000 years ago!',
        steamTag: 'science',
        newParts: [
          wheel(-2.3, 0.5, -3, '#111827'),
          wheel(2.3, 0.5, -3, '#111827'),
          wheel(-2.3, 0.5, 3, '#111827'),
          wheel(2.3, 0.5, 3, '#111827'),
        ],
      },
      {
        num: 3, title: 'Build the Front Bumper', emoji: '🚗',
        desc: 'Place a <strong>red 2×4 brick</strong> at the very front. This is the bumper — it protects your car if it bumps into things!',
        pieces: [{ color: '#EF4444', name: '1× Red 2×4 Bumper Brick' }],
        tip: 'Real car bumpers absorb energy in a crash to protect passengers — that\'s physics of impact!',
        steamTag: 'science',
        newParts: [
          brick(0, P + B / 2, -4, 2, 2, '#EF4444'),
        ],
      },
      {
        num: 4, title: 'Build the Cockpit Floor', emoji: '💺',
        desc: 'Stack <strong>two 2×4 gray plates</strong> in the middle. This raises the driver up so they can see the road!',
        pieces: [{ color: '#6B7280', name: '2× Gray 2×4 Plates' }],
        tip: 'Layering flat plates adds height without adding much weight — lighter cars go faster!',
        steamTag: 'math',
        newParts: [
          plate(0, P + P / 2, 0, 2, 4, '#6B7280'),
          plate(0, P * 2 + P / 2, 0, 2, 4, '#6B7280'),
        ],
      },
      {
        num: 5, title: 'Add Seat and Driver Area', emoji: '🪑',
        desc: 'Place a <strong>green slope brick</strong> on the cockpit floor. The slope forms the back of the seat!',
        pieces: [{ color: '#10B981', name: '2× Green Slope Bricks' }],
        tip: 'Slopes (inclined planes) also make the car aerodynamic — they cut through the air cleanly.',
        steamTag: 'science',
        newParts: [
          slope(0, P * 2 + P + B / 2, 1, 2, 2, '#10B981'),
        ],
      },
      {
        num: 6, title: 'Mount the Windshield', emoji: '🪟',
        desc: 'Add a <strong>clear curved windshield</strong> in front of the seat. It protects the driver from wind!',
        pieces: [{ color: '#93C5FD', name: '1× Clear Windshield' }],
        tip: 'Windshields are transparent plastic — the same kind used in airplane cockpits!',
        steamTag: 'technology',
        newParts: [
          slope(0, P * 2 + P + B / 2, -1, 2, 1.2, '#BFDBFE', { opacity: 0.55 }),
        ],
      },
      {
        num: 7, title: 'Install the Radar Dish', emoji: '📡',
        desc: 'Put a <strong>yellow turntable</strong> on the roof, then a <strong>purple radar dish</strong> on top. Your car can now "see" ahead!',
        pieces: [
          { color: '#F59E0B', name: '1× Yellow Turntable Base' },
          { color: '#8B5CF6', name: '1× Purple Radar Dish' },
        ],
        tip: 'Self-driving cars really do use spinning LIDAR sensors that look just like this!',
        steamTag: 'technology',
        newParts: [
          cyl(0, P * 2 + P + B + 0.3, 1.2, 0.5, 0.3, '#F59E0B'),
          cone(0, P * 2 + P + B + 0.8, 1.2, 0.8, 0.5, '#8B5CF6'),
        ],
      },
      {
        num: 8, title: 'Racing Decorations', emoji: '🎨',
        desc: 'Add <strong>red racing stripes</strong> along the hood and a <strong>gold number plate</strong> on the front. You are car #7 — make it loud!',
        pieces: [
          { color: '#EF4444', name: '2× Red Stripe Tiles' },
          { color: '#FCD34D', name: '1× Gold Number Plate' },
        ],
        tip: 'Great designers think about both how things look (art) and how they work (engineering) — the best design does both.',
        steamTag: 'art',
        newParts: [
          tile(-0.6, P + P, -2.5, 0.5, 3, '#EF4444'),
          tile(0.6, P + P, -2.5, 0.5, 3, '#EF4444'),
          tile(0, P + P, -4.2, 1, 0.8, '#FCD34D'),
        ],
      },
    ],
  },

  {
    id: 'dino',
    name: 'Dino Bot',
    emoji: '🦕',
    difficulty: 'Medium',
    pieceCount: 48,
    color: '#10B981',
    description: 'A mighty T-Rex robot with stomping legs, a jaw that opens, teeth, a long tail, and back spikes!',
    steps: [
      {
        num: 1, title: 'Lay the Body Base', emoji: '🧱',
        desc: 'Stack <strong>two green 4×6 plates</strong> to make a thick, strong body. Dinos are big, so we need a big base!',
        pieces: [{ color: '#10B981', name: '2× Green 4×6 Plates' }],
        tip: 'Real T-Rex bodies weighed 7 tonnes — as much as an elephant! Big animals need big foundations.',
        steamTag: 'science',
        newParts: [
          plate(0, P / 2, 0, 4, 6, '#10B981'),
          plate(0, P + P / 2, 0, 4, 6, '#10B981'),
        ],
      },
      {
        num: 2, title: 'Build the Stomping Legs', emoji: '🦶',
        desc: 'Attach <strong>4 thick green leg columns</strong> — each made of 2 bricks stacked. Wider legs = more stability!',
        pieces: [{ color: '#10B981', name: '8× Green 2×2 Bricks' }],
        tip: 'T-Rex legs were as thick as tree trunks to support the massive body above.',
        steamTag: 'engineering',
        newParts: [
          brick(-1, P * 2 + B / 2, -2, 2, 2, '#10B981'),
          brick(-1, P * 2 + B + B / 2, -2, 2, 2, '#10B981'),
          brick(1, P * 2 + B / 2, -2, 2, 2, '#10B981'),
          brick(1, P * 2 + B + B / 2, -2, 2, 2, '#10B981'),
          brick(-1, P * 2 + B / 2, 2, 2, 2, '#10B981'),
          brick(-1, P * 2 + B + B / 2, 2, 2, 2, '#10B981'),
          brick(1, P * 2 + B / 2, 2, 2, 2, '#10B981'),
          brick(1, P * 2 + B + B / 2, 2, 2, 2, '#10B981'),
        ],
      },
      {
        num: 3, title: 'Add the Stomping Feet', emoji: '👣',
        desc: 'Put a <strong>dark gray 2×2 plate</strong> under each leg. These are the feet — flat and wide to grip the ground!',
        pieces: [{ color: '#374151', name: '4× Dark Gray 2×2 Plates' }],
        tip: 'Wide feet distribute weight — that\'s why elephants don\'t sink into the ground.',
        steamTag: 'science',
        newParts: [
          plate(-1, -0.05, -2, 2.2, 2.2, '#374151'),
          plate(1, -0.05, -2, 2.2, 2.2, '#374151'),
          plate(-1, -0.05, 2, 2.2, 2.2, '#374151'),
          plate(1, -0.05, 2, 2.2, 2.2, '#374151'),
        ],
      },
      {
        num: 4, title: 'Raise the Neck', emoji: '🦒',
        desc: 'Build a curving neck by stacking <strong>3 angled slope bricks</strong> on the front of the body, each one tilting forward a bit more.',
        pieces: [{ color: '#34D399', name: '3× Light Green Slope Bricks' }],
        tip: 'The S-curve of a dino neck uses the same engineering as a crane — strong beams angled for reach.',
        steamTag: 'engineering',
        newParts: [
          slope(0, P * 2 + B + B / 2, -2.5, 2, 2, '#34D399'),
          slope(0, P * 2 + B * 2 + B / 2, -3, 2, 2, '#34D399'),
          slope(0, P * 2 + B * 3 + B / 2, -3.5, 2, 2, '#34D399'),
        ],
      },
      {
        num: 5, title: 'Form the Head and Jaw', emoji: '🦖',
        desc: 'Place a <strong>green 2×3 head block</strong> at the top of the neck. Then attach a <strong>hinged jaw</strong> below — it opens and closes!',
        pieces: [
          { color: '#10B981', name: '1× Green 2×3 Head' },
          { color: '#059669', name: '1× Hinged Jaw Piece' },
        ],
        tip: 'Hinges turn rotation into motion — crocodile jaws open with 3,700 pounds of force!',
        steamTag: 'engineering',
        newParts: [
          brick(0, P * 2 + B * 4 + B / 2, -4, 2, 2.5, '#10B981'),
          slope(0, P * 2 + B * 4 - B / 2, -4.5, 2, 2, '#059669'),
        ],
      },
      {
        num: 6, title: 'Add Sharp Teeth', emoji: '🦷',
        desc: 'Stick <strong>6 white tooth tiles</strong> along the jaw edge. Scary AND cool — just like a real T-Rex!',
        pieces: [{ color: '#FFFFFF', name: '6× White Tooth Pieces' }],
        tip: 'Real T-Rex teeth were as long as bananas — and there were 60 of them!',
        steamTag: 'science',
        newParts: [
          cone(-0.6, P * 2 + B * 4 - 0.4, -5.2, 0.15, 0.3, '#FFFFFF'),
          cone(-0.2, P * 2 + B * 4 - 0.4, -5.2, 0.15, 0.3, '#FFFFFF'),
          cone(0.2, P * 2 + B * 4 - 0.4, -5.2, 0.15, 0.3, '#FFFFFF'),
          cone(0.6, P * 2 + B * 4 - 0.4, -5.2, 0.15, 0.3, '#FFFFFF'),
          cyl(-0.4, P * 2 + B * 4 + 0.6, -4.6, 0.15, 0.25, '#FFFFFF'),
          cyl(0.4, P * 2 + B * 4 + 0.6, -4.6, 0.15, 0.25, '#FFFFFF'),
        ],
      },
      {
        num: 7, title: 'Build the Long Tail', emoji: '🐊',
        desc: 'Attach <strong>5 tapering bricks</strong> extending out the back, each smaller than the last. The tail helps with balance!',
        pieces: [{ color: '#10B981', name: '5× Tapering Green Bricks' }],
        tip: 'A dino\'s tail balanced its heavy head — like a seesaw! Physics keeps them from falling forward.',
        steamTag: 'math',
        newParts: [
          brick(0, P * 2 + B / 2, 3.5, 2, 2, '#10B981'),
          brick(0, P * 2 + B / 2, 4.8, 1.6, 1.4, '#10B981'),
          brick(0, P * 2 + B / 2, 5.8, 1.2, 1.2, '#10B981'),
          brick(0, P * 2 + B / 2, 6.6, 0.9, 1.0, '#10B981'),
          cone(0, P * 2 + B / 2, 7.4, 0.4, 0.9, '#10B981', { rotation: [Math.PI / 2, 0, 0] }),
        ],
      },
      {
        num: 8, title: 'Add Back Spikes!', emoji: '⚡',
        desc: 'Stick <strong>4 yellow spikes</strong> along the top of the body, from head to tail. Now your Dino Bot looks FIERCE!',
        pieces: [{ color: '#F59E0B', name: '4× Yellow Spike Pieces' }],
        tip: 'Real stegosaurus spikes were for defense — and maybe showing off to other dinos!',
        steamTag: 'art',
        newParts: [
          cone(0, P * 2 + B * 2 + 0.5, -1.5, 0.25, 0.8, '#F59E0B'),
          cone(0, P * 2 + B + 0.5, 0, 0.3, 1.0, '#F59E0B'),
          cone(0, P * 2 + B + 0.5, 1.5, 0.3, 0.9, '#F59E0B'),
          cone(0, P * 2 + B + 0.5, 3, 0.25, 0.7, '#F59E0B'),
        ],
      },
    ],
  },
];

export const steamFacts = {
  science: [
    { q: 'Why does my robot fall over?', a: 'Because of <strong>center of gravity</strong>! When heavy parts are too high, gravity pulls them down. Wide, flat bases keep things balanced.', fact: 'Real dogs use their tails to help balance!' },
    { q: 'How do magnets work in LEGO?', a: 'Some LEGO pieces use tiny <strong>magnets</strong> that attract metal. Magnets have a north and south pole — opposites attract!', fact: 'The Earth itself is a giant magnet!' },
    { q: 'Why are wheels round?', a: 'Round wheels roll smoothly because every point on the edge is the <strong>same distance</strong> from the center — no bumps!', fact: 'The wheel was invented about 6,000 years ago in Mesopotamia.' },
  ],
  technology: [
    { q: 'How do real robots see?', a: 'Real robots use <strong>sensors</strong> — cameras, infrared, and ultrasonic. That\'s why we added the sensor brick — it\'s your robot\'s eyes!', fact: 'Some robots can see in the dark using infrared!' },
    { q: 'Can robots think?', a: 'Robots follow <strong>programs</strong> — instructions written by humans. AI helps robots learn from experience, like how you learn from practice!', fact: 'The word "robot" comes from a Czech word meaning "forced labor"!' },
    { q: 'What is a radar?', a: 'Radar sends out invisible radio waves that bounce off things and come back. The time it takes tells the robot how far away the thing is!', fact: 'Bats use a natural radar — they call it echolocation.' },
  ],
  engineering: [
    { q: 'Why different-shaped pieces?', a: 'Each shape has a job! <strong>Flat plates</strong> spread weight. <strong>Tall bricks</strong> add height. <strong>Angled pieces</strong> let things bend.', fact: 'Engineers study shapes for years to find the best ones!' },
    { q: 'What makes structures strong?', a: '<strong>Triangles</strong> are the strongest shape! That\'s why bridges and buildings use triangular supports.', fact: 'The Egyptian pyramids are triangle-shaped and lasted 4,500 years!' },
    { q: 'What is a hinge?', a: 'A hinge is a joint that lets two parts <strong>rotate</strong> around one axis. Your elbow and knee are hinges!', fact: 'The oldest hinges date back to 1600 BC — Egypt and Mesopotamia.' },
  ],
  art: [
    { q: 'Can I make my robot look different?', a: 'Absolutely! Choose different <strong>colors</strong>, add <strong>decorations</strong>, change the shape. Every great robot starts with a creative designer!', fact: 'Pixar uses real robots as inspiration for movie characters!' },
    { q: 'Why do colors matter?', a: 'Colors affect how people <strong>feel</strong>. Red = energy, blue = calm, yellow = happy. Choose colors that match your robot\'s personality!', fact: 'Bees can\'t see red, but they can see ultraviolet!' },
    { q: 'Why are robots usually white or metal?', a: 'Designers want them to look <strong>clean and futuristic</strong>. But you can paint them any color you like — be bold!', fact: 'The most famous movie robot, R2-D2, is white and blue on purpose — it looks friendly!' },
  ],
  math: [
    { q: 'How many pieces did we use?', a: 'Count them! We used <strong>symmetry</strong> — each side looks the same, like a mirror. That\'s math!', fact: 'The word "symmetry" comes from Greek meaning "same measure"!' },
    { q: 'What is a pattern?', a: 'A pattern is something that <strong>repeats</strong>. Your robot legs repeat the same shape 4 times — that\'s a pattern!', fact: 'Your DNA is a pattern of just 4 letters: A, T, C, G!' },
    { q: 'What is a ratio?', a: 'A ratio is how two numbers compare. Your dino has 4 legs and 1 tail — that\'s a ratio of 4:1!', fact: 'The Golden Ratio (1.618…) shows up in flowers, seashells, and even the pyramids.' },
  ],
};
