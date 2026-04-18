/**
 * LEGO Robot model data — detailed, anatomically-faithful 3D builds.
 *
 * Coordinate system:
 *   - Ground is y = 0. +Y is up.
 *   - X is left/right, Z is front/back (-Z = forward, toward viewer).
 *   - 1 unit = 1 LEGO stud. 1 plate height = 0.4, 1 brick height = 1.2.
 *   - `pos` is the CENTER of the brick. `size` is [width, height, depth] in world units.
 *
 * Physical rules every model follows:
 *   - Every brick's bottom sits on the ground OR on the top of another brick declared
 *     in the same or earlier step. Nothing floats.
 *   - Left/right symmetry is exact for anatomy (legs, eyes, ears, wheels).
 *   - Steps build strictly bottom-up: feet → legs → body → head → details.
 */

const P = 0.4;              // plate height
const B = 1.2;              // brick height (3 plates)

/* Helpers take yBottom (intuitive for stacking) and convert to center y */
const plate = (x, yBottom, z, w, d, color, extra = {}) =>
  ({ type: 'plate', pos: [x, yBottom + P / 2, z], size: [w, P, d], color, ...extra });
const brick = (x, yBottom, z, w, d, color, extra = {}) =>
  ({ type: 'brick', pos: [x, yBottom + B / 2, z], size: [w, B, d], color, ...extra });
const tallBrick = (x, yBottom, z, w, d, h, color, extra = {}) =>
  ({ type: 'brick', pos: [x, yBottom + h / 2, z], size: [w, h, d], color, ...extra });
const slope = (x, yBottom, z, w, d, color, extra = {}) =>
  ({ type: 'slope', pos: [x, yBottom + B / 2, z], size: [w, B, d], color, ...extra });
const tallSlope = (x, yBottom, z, w, d, h, color, extra = {}) =>
  ({ type: 'slope', pos: [x, yBottom + h / 2, z], size: [w, h, d], color, ...extra });
const cyl = (x, yBottom, z, r, h, color, extra = {}) =>
  ({ type: 'cylinder', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color, ...extra });
const cone = (x, yBottom, z, r, h, color, extra = {}) =>
  ({ type: 'cone', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color, ...extra });
const wheel = (x, z, color) => ({ type: 'wheel', pos: [x, 0.8, z], size: [1.6, 1.0, 1.6], color });
const tile = (x, yBottom, z, w, d, color) =>
  ({ type: 'tile', pos: [x, yBottom + P / 2, z], size: [w, P, d], color });

export const robotModels = [
  /* ═══════════════════════════════ DOG ═══════════════════════════════ */
  {
    id: 'dog',
    name: 'Robot Dog',
    emoji: '🐶',
    difficulty: 'Easy',
    pieceCount: 56,
    color: '#F59E0B',
    description: 'A friendly robot dog with floppy ears, a wagging tail, a wet black nose and sensor eyes!',
    steps: [
      /* ── Step 1: Four paw pads on the ground ─────────────────────── */
      {
        num: 1, title: 'Place the Four Paws', emoji: '🐾',
        desc: 'Put <strong>4 black paw tiles</strong> on the table in a rectangle. These are where the dog\'s paws touch the floor.',
        pieces: [{ color: '#1F2937', name: '4× Black Paw Tiles' }],
        tip: 'Animals with four feet (quadrupeds) are very stable — a tripod can wobble, but four pads never tip.',
        steamTag: 'math',
        newParts: [
          tile(-1.5, 0, -3, 1.4, 1.4, '#1F2937'),
          tile( 1.5, 0, -3, 1.4, 1.4, '#1F2937'),
          tile(-1.5, 0,  3, 1.4, 1.4, '#1F2937'),
          tile( 1.5, 0,  3, 1.4, 1.4, '#1F2937'),
        ],
      },
      /* ── Step 2: Lower legs (dark knees) ─────────────────────────── */
      {
        num: 2, title: 'Build the Lower Legs', emoji: '🦿',
        desc: 'Stack a <strong>small dark gray brick</strong> on each paw. These are the lower legs — the "knees" of your robot dog.',
        pieces: [{ color: '#4B5563', name: '4× Dark Gray 1×1 Bricks' }],
        tip: 'Robots use joints at the knees just like humans — this lets them bend and walk smoothly.',
        steamTag: 'engineering',
        newParts: [
          // Sit on paw tiles (yBottom = P = 0.4)
          brick(-1.5, P, -3, 1, 1, '#4B5563'),
          brick( 1.5, P, -3, 1, 1, '#4B5563'),
          brick(-1.5, P,  3, 1, 1, '#4B5563'),
          brick( 1.5, P,  3, 1, 1, '#4B5563'),
        ],
      },
      /* ── Step 3: Upper legs (orange) ─────────────────────────────── */
      {
        num: 3, title: 'Build the Upper Legs', emoji: '🦵',
        desc: 'Add <strong>4 orange bricks</strong> on top of the knees. These are the dog\'s strong upper legs!',
        pieces: [{ color: '#F59E0B', name: '4× Orange 1×1 Bricks' }],
        tip: 'Upper + lower leg = a two-part lever. Levers multiply force — that\'s how real robots lift heavy things.',
        steamTag: 'engineering',
        newParts: [
          // On top of lower legs (yBottom = P + B = 1.6)
          brick(-1.5, P + B, -3, 1, 1, '#F59E0B'),
          brick( 1.5, P + B, -3, 1, 1, '#F59E0B'),
          brick(-1.5, P + B,  3, 1, 1, '#F59E0B'),
          brick( 1.5, P + B,  3, 1, 1, '#F59E0B'),
        ],
      },
      /* ── Step 4: Belly + back plate ──────────────────────────────── */
      {
        num: 4, title: 'Build the Body', emoji: '🧱',
        desc: 'Snap a <strong>4×8 red plate</strong> on top of all four legs — this is the belly. Add another plate on top for the back!',
        pieces: [
          { color: '#EF4444', name: '1× Red 4×8 Belly Plate' },
          { color: '#DC2626', name: '1× Dark Red 4×8 Back Plate' },
        ],
        tip: 'Two stacked plates = one strong beam. Layered plates are how real LEGO engineers make super-solid floors.',
        steamTag: 'engineering',
        newParts: [
          // Leg tops at y = P + 2B = 2.8
          plate(0, P + 2 * B,     0, 4, 8, '#EF4444'),
          plate(0, P + 2 * B + P, 0, 4, 8, '#DC2626'),
        ],
      },
      /* ── Step 5: Chest + shoulders + neck base ───────────────────── */
      {
        num: 5, title: 'Build the Chest and Neck', emoji: '💪',
        desc: 'Stack <strong>two 2×4 orange bricks</strong> at the front of the back. Then place a <strong>slope</strong> on top — that\'s the neck rising toward the head!',
        pieces: [
          { color: '#F59E0B', name: '2× Orange 2×4 Chest Bricks' },
          { color: '#F59E0B', name: '1× Orange Neck Slope' },
        ],
        tip: 'The dog\'s chest sits OVER the front legs so the weight passes straight down. That\'s good mechanical design.',
        steamTag: 'engineering',
        newParts: [
          // Body top at y = P + 2B + 2P = 3.6
          // Chest: two 2x4 bricks stacked (toward front, z = -2)
          brick(0, P + 2 * B + 2 * P,         -2, 2, 4, '#F59E0B'),
          brick(0, P + 2 * B + 2 * P + B,     -2, 2, 4, '#F59E0B'),
          // Neck slope on top (rises toward -Z)
          slope(0, P + 2 * B + 2 * P + 2 * B, -3, 2, 2, '#F59E0B'),
        ],
      },
      /* ── Step 6: Head + snout + eyes + nose ──────────────────────── */
      {
        num: 6, title: 'Build the Head', emoji: '🐕',
        desc: 'Place an <strong>orange head block</strong> on top of the neck. Add the <strong>snout</strong> out front, <strong>two white eyes</strong>, and a <strong>black nose</strong>. Hello, pup!',
        pieces: [
          { color: '#F59E0B', name: '1× Orange 2×2 Head Block' },
          { color: '#F59E0B', name: '1× Orange Snout Brick' },
          { color: '#FFFFFF', name: '2× White Round Eyes' },
          { color: '#000000', name: '2× Black Pupils' },
          { color: '#111827', name: '1× Black Nose' },
        ],
        tip: 'Real dogs have a longer snout than humans — it gives them 10,000× better smell. Your robot has a sensor snout!',
        steamTag: 'science',
        newParts: [
          // Neck top at y = P + 2B + 2P + 3B = 5.2 + 1.2 = 6.4? Let's recompute:
          // P + 2B + 2P + 3B = 0.4 + 2.4 + 0.8 + 3.6 = 7.2 — wait, neck slope is 1.2 tall starting at 4.8, so top = 6.0
          // Actually: Body top at P+2B+2P = 0.4+2.4+0.8 = 3.6. Chest 2 bricks on top = 2.4, so chest top = 6.0. Neck slope yBottom=6.0, top = 7.2.
          // Head base (on neck peak): yBottom = 7.2? But slope slants — head should sit slightly forward.
          // Place head at z = -4 (in front of neck), yBottom = 7.2
          tallBrick(0, P + 2 * B + 2 * P + 2 * B + B, -4, 2, 2, B, '#F59E0B'),
          // Snout sticks out front at z = -5.2, centered slightly lower
          tallBrick(0, P + 2 * B + 2 * P + 2 * B + B + 0.2, -5.3, 1.4, 1, 0.8, '#F59E0B'),
          // Eyes on head front face (z = -4.9, just behind snout)
          cyl(-0.55, P + 2 * B + 2 * P + 2 * B + B + 0.6, -4.95, 0.28, 0.16, '#FFFFFF'),
          cyl( 0.55, P + 2 * B + 2 * P + 2 * B + B + 0.6, -4.95, 0.28, 0.16, '#FFFFFF'),
          // Pupils sit just in front of the whites
          cyl(-0.55, P + 2 * B + 2 * P + 2 * B + B + 0.62, -5.05, 0.14, 0.1, '#000000'),
          cyl( 0.55, P + 2 * B + 2 * P + 2 * B + B + 0.62, -5.05, 0.14, 0.1, '#000000'),
          // Nose on tip of snout (z = -5.65)
          cyl(0, P + 2 * B + 2 * P + 2 * B + B + 0.35, -5.65, 0.26, 0.14, '#111827'),
        ],
      },
      /* ── Step 7: Ears ─────────────────────────────────────────────── */
      {
        num: 7, title: 'Add Floppy Ears', emoji: '👂',
        desc: 'Stick <strong>two dark brown slope pieces</strong> on top of the head — tilted slightly forward like floppy puppy ears!',
        pieces: [{ color: '#92400E', name: '2× Brown Slope Ears' }],
        tip: 'Dogs with floppy ears hear differently than dogs with pointy ears — the shape focuses sound waves.',
        steamTag: 'science',
        newParts: [
          // Head top at y = 7.2 + B = 8.4. Ears on top, one on each side.
          tallSlope(-0.7, P + 2 * B + 2 * P + 2 * B + 2 * B, -3.7, 0.8, 1, B, '#92400E', { rotation: [0, -0.25, 0] }),
          tallSlope( 0.7, P + 2 * B + 2 * P + 2 * B + 2 * B, -3.7, 0.8, 1, B, '#92400E', { rotation: [0,  0.25, 0] }),
        ],
      },
      /* ── Step 8: Tail + collar + name tag ────────────────────────── */
      {
        num: 8, title: 'Tail, Collar, and Tag', emoji: '✨',
        desc: 'Build a <strong>curly tail</strong> from 3 round bricks at the back. Add a <strong>red collar</strong> around the neck and a <strong>gold name tag</strong>!',
        pieces: [
          { color: '#F59E0B', name: '3× Orange Tail Segments' },
          { color: '#EF4444', name: '1× Red Collar Ring' },
          { color: '#FCD34D', name: '1× Gold Name Tag' },
        ],
        tip: 'Every detail you add makes your robot UNIQUE. Engineers call this "personalization" — same robot, YOUR style!',
        steamTag: 'art',
        newParts: [
          // Tail starts at the back of the back-plate (z = +4). Back top at y = 3.6. Stack 3 segments going up and back.
          cyl(0, P + 2 * B + 2 * P,        3.8, 0.35, 0.8, '#F59E0B'),
          cyl(0, P + 2 * B + 2 * P + 0.8, 4.2, 0.3,  0.7, '#F59E0B'),
          cyl(0, P + 2 * B + 2 * P + 1.5, 4.6, 0.25, 0.7, '#F59E0B'),
          // Collar: low-profile red band just under the head (around the neck slope)
          cyl(0, P + 2 * B + 2 * P + 2 * B + 0.9, -3.4, 1.15, 0.25, '#EF4444'),
          // Name tag: small gold disc hanging from the collar on the chest
          cyl(0, P + 2 * B + 2 * P + 2 * B + 0.5, -3.8, 0.28, 0.12, '#FCD34D'),
        ],
      },
    ],
  },

  /* ═══════════════════════════════ CAR ═══════════════════════════════ */
  {
    id: 'car',
    name: 'Robot Car',
    emoji: '🏎️',
    difficulty: 'Easy',
    pieceCount: 48,
    color: '#3B82F6',
    description: 'A racing robot car with spinning wheels, headlights, a driver cockpit, spoiler and a radar dish!',
    steps: [
      /* ── Step 1: Four wheels ─────────────────────────────────────── */
      {
        num: 1, title: 'Mount the Four Wheels', emoji: '🛞',
        desc: 'Place <strong>4 black wheels</strong> in a rectangle — front pair close together, back pair the same. This is the car\'s track!',
        pieces: [{ color: '#111827', name: '4× Wheel + Axle Sets' }],
        tip: 'The distance between wheels is called the "wheelbase". Longer wheelbase = more stable but harder to turn!',
        steamTag: 'math',
        newParts: [
          wheel(-2.3, -3, '#111827'),
          wheel( 2.3, -3, '#111827'),
          wheel(-2.3,  3, '#111827'),
          wheel( 2.3,  3, '#111827'),
        ],
      },
      /* ── Step 2: Chassis + floor ─────────────────────────────────── */
      {
        num: 2, title: 'Lay the Chassis', emoji: '🧱',
        desc: 'Snap a long <strong>4×10 blue plate</strong> across the tops of the wheels — that\'s the floor. Then add a <strong>2×10 gray plate</strong> on top for the frame.',
        pieces: [
          { color: '#3B82F6', name: '1× Blue 4×10 Chassis Plate' },
          { color: '#6B7280', name: '1× Gray 2×10 Frame Plate' },
        ],
        tip: 'Race cars use layered metal plates to stiffen the chassis without adding much weight — lighter = faster!',
        steamTag: 'engineering',
        newParts: [
          plate(0, 0.8,       0, 4, 10, '#3B82F6'),
          plate(0, 0.8 + P,   0, 2, 10, '#6B7280'),
        ],
      },
      /* ── Step 3: Front bumper + headlights ───────────────────────── */
      {
        num: 3, title: 'Build the Front Bumper', emoji: '🚗',
        desc: 'Place a <strong>red 2×2 bumper brick</strong> at the very front. Stick <strong>two yellow dots</strong> on it — those are the headlights!',
        pieces: [
          { color: '#EF4444', name: '1× Red 2×2 Bumper' },
          { color: '#FCD34D', name: '2× Yellow Headlights' },
        ],
        tip: 'Headlights face forward with a reflector bowl behind them to focus the light into a beam.',
        steamTag: 'technology',
        newParts: [
          // Chassis top at y = 0.8 + 2P = 1.6. Bumper yBottom = 1.6 (on frame).
          brick(0, 0.8 + 2 * P, -4.5, 2, 1, '#EF4444'),
          // Headlights on front face of bumper
          cyl(-0.5, 0.8 + 2 * P + 0.4, -5.05, 0.28, 0.18, '#FCD34D'),
          cyl( 0.5, 0.8 + 2 * P + 0.4, -5.05, 0.28, 0.18, '#FCD34D'),
        ],
      },
      /* ── Step 4: Hood ────────────────────────────────────────────── */
      {
        num: 4, title: 'Shape the Hood', emoji: '🔧',
        desc: 'Place a <strong>blue slope brick</strong> in front of the cockpit — this is the hood. Cars are shaped to cut through air!',
        pieces: [{ color: '#3B82F6', name: '1× Blue 2×2 Hood Slope' }],
        tip: 'A smooth hood lets air slide over the car — that\'s aerodynamics. Square-shaped cars would use more fuel!',
        steamTag: 'science',
        newParts: [
          // Sits on frame, just behind bumper (z = -3)
          slope(0, 0.8 + 2 * P, -3, 2, 2, '#3B82F6'),
        ],
      },
      /* ── Step 5: Cockpit walls + seat + steering ─────────────────── */
      {
        num: 5, title: 'Build the Cockpit', emoji: '💺',
        desc: 'Stack <strong>two gray plates</strong> in the middle for the floor. Add <strong>a green slope seat</strong> and a <strong>black steering wheel</strong>!',
        pieces: [
          { color: '#9CA3AF', name: '2× Gray 2×4 Floor Plates' },
          { color: '#10B981', name: '1× Green Driver Seat' },
          { color: '#111827', name: '1× Black Steering Wheel' },
        ],
        tip: 'The seat is behind the steering wheel so the driver can reach both the wheel AND the pedals.',
        steamTag: 'engineering',
        newParts: [
          // Floor plates at cockpit (z = 0)
          plate(0, 0.8 + 2 * P,     0, 2, 4, '#9CA3AF'),
          plate(0, 0.8 + 3 * P,     0, 2, 4, '#9CA3AF'),
          // Seat slope at back of cockpit (z = +1)
          slope(0, 0.8 + 4 * P,     1, 2, 2, '#10B981'),
          // Steering wheel in front of seat (a small cylinder)
          cyl(0, 0.8 + 4 * P + 0.4, -0.8, 0.3, 0.12, '#111827'),
        ],
      },
      /* ── Step 6: Windshield + roof pillars ───────────────────────── */
      {
        num: 6, title: 'Mount the Windshield', emoji: '🪟',
        desc: 'Place a <strong>clear sloped windshield</strong> in front of the seat. Add <strong>two black roll bars</strong> behind for safety!',
        pieces: [
          { color: '#BFDBFE', name: '1× Clear Windshield' },
          { color: '#1F2937', name: '2× Black Roll Bars' },
        ],
        tip: 'Roll bars protect the driver if the car flips — they turn the whole cockpit into a safety cage.',
        steamTag: 'science',
        newParts: [
          // Windshield in front of seat
          slope(0, 0.8 + 4 * P, -1.2, 2, 1.4, '#BFDBFE', { opacity: 0.55 }),
          // Roll bars either side of the seat
          tallBrick(-0.8, 0.8 + 4 * P + B, 1, 0.4, 0.4, 0.8, '#1F2937'),
          tallBrick( 0.8, 0.8 + 4 * P + B, 1, 0.4, 0.4, 0.8, '#1F2937'),
        ],
      },
      /* ── Step 7: Radar dish + spoiler + exhaust ──────────────────── */
      {
        num: 7, title: 'Add the Radar and Spoiler', emoji: '📡',
        desc: 'Put a <strong>yellow turntable</strong> on the roof with a <strong>purple radar dish</strong>. Add a <strong>red spoiler</strong> at the back and <strong>chrome exhaust pipes</strong>!',
        pieces: [
          { color: '#F59E0B', name: '1× Yellow Turntable' },
          { color: '#8B5CF6', name: '1× Purple Radar Dish' },
          { color: '#EF4444', name: '1× Red Spoiler' },
          { color: '#9CA3AF', name: '2× Chrome Exhaust Pipes' },
        ],
        tip: 'Self-driving cars really use spinning LIDAR sensors shaped exactly like this dish!',
        steamTag: 'technology',
        newParts: [
          // Turntable above the seat top (seat top = 0.8 + 4P + B = 3.6)
          cyl(0, 0.8 + 4 * P + B,       1, 0.5, 0.3, '#F59E0B'),
          // Radar dish on top
          cone(0, 0.8 + 4 * P + B + 0.3, 1, 0.85, 0.55, '#8B5CF6'),
          // Spoiler: red plate at the back of the car, raised
          plate(0, 0.8 + 2 * P + 0.2, 4.7, 3, 0.6, '#EF4444'),
          tallBrick(-1.1, 0.8 + 2 * P, 4.5, 0.3, 0.6, 0.2, '#1F2937'),
          tallBrick( 1.1, 0.8 + 2 * P, 4.5, 0.3, 0.6, 0.2, '#1F2937'),
          // Exhaust pipes poking out the back (z = +5)
          cyl(-0.7, 1.0,  5.2, 0.2, 0.8, '#9CA3AF', { rotation: [Math.PI / 2, 0, 0] }),
          cyl( 0.7, 1.0,  5.2, 0.2, 0.8, '#9CA3AF', { rotation: [Math.PI / 2, 0, 0] }),
        ],
      },
      /* ── Step 8: Decorations: stripes + number ──────────────────── */
      {
        num: 8, title: 'Racing Decorations', emoji: '🎨',
        desc: 'Stick <strong>red racing stripes</strong> along the hood and a <strong>gold #7</strong> on the door. You\'re Car #7 — make it loud!',
        pieces: [
          { color: '#EF4444', name: '2× Red Stripe Tiles' },
          { color: '#FCD34D', name: '1× Gold Number Plate' },
          { color: '#FCD34D', name: '2× Gold Taillights' },
        ],
        tip: 'Great designers think about how things LOOK and how they WORK. You are both!',
        steamTag: 'art',
        newParts: [
          // Stripes along the hood (frame top = 0.8 + 2P = 1.6)
          tile(-0.6, 0.8 + 2 * P + 0.02, -3, 0.4, 1.6, '#EF4444'),
          tile( 0.6, 0.8 + 2 * P + 0.02, -3, 0.4, 1.6, '#EF4444'),
          // Gold #7 on side of cockpit (tile stuck on the outside edge)
          tile(-1.05, 0.8 + 4 * P + 0.5, 0.3, 0.1, 1, '#FCD34D'),
          // Taillights on back
          cyl(-0.6, 0.8 + 2 * P + 0.2, 4.95, 0.2, 0.15, '#FCD34D'),
          cyl( 0.6, 0.8 + 2 * P + 0.2, 4.95, 0.2, 0.15, '#FCD34D'),
        ],
      },
    ],
  },

  /* ═══════════════════════════════ DINO ═══════════════════════════════ */
  {
    id: 'dino',
    name: 'Dino Bot',
    emoji: '🦖',
    difficulty: 'Medium',
    pieceCount: 64,
    color: '#10B981',
    description: 'A mighty T-Rex robot with thick stomping legs, a jaw that opens, sharp teeth and a spiky back!',
    steps: [
      /* ── Step 1: Stomping feet with claws ────────────────────────── */
      {
        num: 1, title: 'Place the Stomping Feet', emoji: '👣',
        desc: 'Put <strong>2 huge foot plates</strong> on the table — the T-Rex walks on two big feet. Add <strong>3 white claws</strong> on each foot!',
        pieces: [
          { color: '#374151', name: '2× Dark Gray Foot Plates' },
          { color: '#FFFFFF', name: '6× White Claw Tips' },
        ],
        tip: 'T-Rex was bipedal — it walked on two legs like a bird. Big feet spread its 7-tonne weight!',
        steamTag: 'science',
        newParts: [
          // Feet
          tile(-1.5, 0, 0, 2.5, 3, '#374151'),
          tile( 1.5, 0, 0, 2.5, 3, '#374151'),
          // Claws: 3 per foot sticking forward
          cone(-2.3, P, -1.5, 0.18, 0.35, '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
          cone(-1.5, P, -1.6, 0.2,  0.4,  '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
          cone(-0.7, P, -1.5, 0.18, 0.35, '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
          cone( 0.7, P, -1.5, 0.18, 0.35, '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
          cone( 1.5, P, -1.6, 0.2,  0.4,  '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
          cone( 2.3, P, -1.5, 0.18, 0.35, '#FFFFFF', { rotation: [Math.PI / 2, 0, 0] }),
        ],
      },
      /* ── Step 2: Shins (lower legs) ──────────────────────────────── */
      {
        num: 2, title: 'Build the Shins', emoji: '🦿',
        desc: 'Stack <strong>2 thick green bricks</strong> on each foot. These are the strong shins that hold up the T-Rex\'s body!',
        pieces: [{ color: '#059669', name: '4× Dark Green 2×2 Shin Bricks' }],
        tip: 'Dinosaur shins were shaped like thick columns — the strongest shape for supporting huge weight.',
        steamTag: 'engineering',
        newParts: [
          // Foot top at y = P = 0.4
          brick(-1.5, P,       0, 2, 2, '#059669'),
          brick(-1.5, P + B,   0, 2, 2, '#059669'),
          brick( 1.5, P,       0, 2, 2, '#059669'),
          brick( 1.5, P + B,   0, 2, 2, '#059669'),
        ],
      },
      /* ── Step 3: Thighs (upper legs) ─────────────────────────────── */
      {
        num: 3, title: 'Build the Thighs', emoji: '💪',
        desc: 'Add <strong>2 light green bricks</strong> on each shin — those are the thigh muscles. T-Rex legs were HUGE!',
        pieces: [{ color: '#10B981', name: '4× Green 2×2 Thigh Bricks' }],
        tip: 'Big thigh muscles let T-Rex accelerate. Scientists think it ran about 20 km/h — as fast as a fit human!',
        steamTag: 'science',
        newParts: [
          // Shin top at y = P + 2B = 2.8
          brick(-1.5, P + 2 * B,     0, 2, 2, '#10B981'),
          brick(-1.5, P + 3 * B,     0, 2, 2, '#10B981'),
          brick( 1.5, P + 2 * B,     0, 2, 2, '#10B981'),
          brick( 1.5, P + 3 * B,     0, 2, 2, '#10B981'),
        ],
      },
      /* ── Step 4: Belly + back body (big chunky torso) ────────────── */
      {
        num: 4, title: 'Build the Body', emoji: '🦕',
        desc: 'Stack <strong>two green 4×6 plates</strong> across the tops of the legs. Then add <strong>two brick layers</strong> for a chunky T-Rex chest!',
        pieces: [
          { color: '#10B981', name: '2× Green 4×6 Body Plates' },
          { color: '#10B981', name: '2× Green 4×6 Chest Bricks' },
        ],
        tip: 'T-Rex\'s body weighed as much as an elephant — 7 tonnes! Layered plates hold that weight.',
        steamTag: 'engineering',
        newParts: [
          // Leg top at y = P + 4B = 5.2
          plate(0, P + 4 * B,             0, 4, 6, '#10B981'),
          plate(0, P + 4 * B + P,         0, 4, 6, '#10B981'),
          // Chest layer (brick)
          tallBrick(0, P + 4 * B + 2 * P,         -0.5, 4, 4, B, '#10B981'),
          tallBrick(0, P + 4 * B + 2 * P + B,     -0.5, 4, 3, B, '#10B981'),
        ],
      },
      /* ── Step 5: Neck (S-curve of 3 slopes) ──────────────────────── */
      {
        num: 5, title: 'Curve the Neck', emoji: '🦒',
        desc: 'Stack <strong>3 light-green slopes</strong> at the front of the chest — each one tilts forward more. The neck is an S-curve!',
        pieces: [{ color: '#34D399', name: '3× Light Green Slope Bricks' }],
        tip: 'A T-Rex\'s S-curved neck let its head dart forward fast — like a crane arm.',
        steamTag: 'engineering',
        newParts: [
          // Chest top at y = P + 4B + 2P + 2B = 0.4 + 4.8 + 0.8 + 2.4 = 8.4
          slope(0, P + 4 * B + 2 * P + 2 * B,         -2.5, 2.4, 2, '#34D399'),
          slope(0, P + 4 * B + 2 * P + 2 * B + B,     -3.0, 2,   2, '#34D399'),
          slope(0, P + 4 * B + 2 * P + 2 * B + 2 * B, -3.5, 1.8, 1.8, '#34D399'),
        ],
      },
      /* ── Step 6: Head + jaw + teeth + eyes + nostrils ────────────── */
      {
        num: 6, title: 'Form the Head', emoji: '🦖',
        desc: 'Place a <strong>green head</strong> with a <strong>hinged jaw</strong> underneath. Add <strong>6 sharp white teeth</strong>, <strong>two yellow eyes</strong>, and two <strong>nostrils</strong>!',
        pieces: [
          { color: '#10B981', name: '1× Green Head Block' },
          { color: '#059669', name: '1× Dark Green Jaw' },
          { color: '#FFFFFF', name: '6× White Tooth Cones' },
          { color: '#FCD34D', name: '2× Yellow Eyes' },
          { color: '#111827', name: '2× Black Pupils' },
          { color: '#111827', name: '2× Black Nostrils' },
        ],
        tip: 'Real T-Rex had 60 teeth as long as bananas. Its bite was 3× stronger than a lion\'s!',
        steamTag: 'science',
        newParts: [
          // Neck top at y = P + 4B + 2P + 5B = 0.4 + 4.8 + 0.8 + 6.0 = 12.0
          // Head sits in front of neck at z = -4.5
          tallBrick(0, P + 4 * B + 2 * P + 5 * B,        -4.5, 2.5, 3, 1.4, '#10B981'),
          // Jaw slightly below and forward
          tallSlope(0, P + 4 * B + 2 * P + 5 * B - 0.3, -5.2, 2.5, 2, 1.0, '#059669'),
          // Eyes on sides of head (yellow with black pupils)
          cyl(-1.35, P + 4 * B + 2 * P + 5 * B + 0.8, -4.3, 0.3, 0.15, '#FCD34D',
              { rotation: [0, 0, Math.PI / 2] }),
          cyl( 1.35, P + 4 * B + 2 * P + 5 * B + 0.8, -4.3, 0.3, 0.15, '#FCD34D',
              { rotation: [0, 0, Math.PI / 2] }),
          cyl(-1.45, P + 4 * B + 2 * P + 5 * B + 0.8, -4.3, 0.15, 0.1, '#111827',
              { rotation: [0, 0, Math.PI / 2] }),
          cyl( 1.45, P + 4 * B + 2 * P + 5 * B + 0.8, -4.3, 0.15, 0.1, '#111827',
              { rotation: [0, 0, Math.PI / 2] }),
          // Nostrils on top of snout
          cyl(-0.3, P + 4 * B + 2 * P + 5 * B + 1.4, -5.3, 0.12, 0.08, '#111827'),
          cyl( 0.3, P + 4 * B + 2 * P + 5 * B + 1.4, -5.3, 0.12, 0.08, '#111827'),
          // Upper teeth (hang from head front face, pointing down)
          cone(-0.8, P + 4 * B + 2 * P + 5 * B - 0.2, -5.5, 0.14, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone(-0.3, P + 4 * B + 2 * P + 5 * B - 0.2, -5.5, 0.15, 0.4,  '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone( 0.3, P + 4 * B + 2 * P + 5 * B - 0.2, -5.5, 0.15, 0.4,  '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone( 0.8, P + 4 * B + 2 * P + 5 * B - 0.2, -5.5, 0.14, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          // Lower teeth (on jaw, pointing up)
          cone(-0.45, P + 4 * B + 2 * P + 5 * B - 0.2, -5.6, 0.13, 0.3, '#FFFFFF'),
          cone( 0.45, P + 4 * B + 2 * P + 5 * B - 0.2, -5.6, 0.13, 0.3, '#FFFFFF'),
        ],
      },
      /* ── Step 7: Tiny arms + long tail ───────────────────────────── */
      {
        num: 7, title: 'Arms and Long Tail', emoji: '🐊',
        desc: 'Add <strong>two tiny T-Rex arms</strong> on the chest. Then build a <strong>long tapering tail</strong> with 5 segments out the back!',
        pieces: [
          { color: '#10B981', name: '2× Tiny Green Arms' },
          { color: '#FFFFFF', name: '4× White Claw Tips' },
          { color: '#10B981', name: '5× Tapering Tail Bricks' },
        ],
        tip: 'A T-Rex\'s tail was heavier than its head — it balanced the body like a see-saw!',
        steamTag: 'math',
        newParts: [
          // Tiny arms on front of chest (chest height ~ y = P + 4B + 2P + 2B to +3B)
          // Arms stick out of the chest sides
          tallBrick(-1.85, P + 4 * B + 2 * P + 2 * B + 0.2, -1.5, 0.3, 0.6, 1.0, '#10B981'),
          tallBrick( 1.85, P + 4 * B + 2 * P + 2 * B + 0.2, -1.5, 0.3, 0.6, 1.0, '#10B981'),
          // Claws on arm tips
          cone(-2.1, P + 4 * B + 2 * P + 2 * B + 0.2, -1.8, 0.1, 0.25, '#FFFFFF'),
          cone(-1.6, P + 4 * B + 2 * P + 2 * B + 0.2, -1.8, 0.1, 0.25, '#FFFFFF'),
          cone( 1.6, P + 4 * B + 2 * P + 2 * B + 0.2, -1.8, 0.1, 0.25, '#FFFFFF'),
          cone( 2.1, P + 4 * B + 2 * P + 2 * B + 0.2, -1.8, 0.1, 0.25, '#FFFFFF'),

          // Tail: tapering bricks from back of body (z > +3), stepping downward slightly
          tallBrick(0, P + 4 * B + 2 * P + B,           3.2, 2.6, 2.4, B, '#10B981'),
          tallBrick(0, P + 4 * B + 2 * P + 0.8,         4.6, 2.2, 2.0, B, '#10B981'),
          tallBrick(0, P + 4 * B + 2 * P + 0.5,         5.8, 1.6, 1.6, B * 0.9, '#10B981'),
          tallBrick(0, P + 4 * B + 2 * P + 0.3,         6.8, 1.2, 1.2, B * 0.8, '#10B981'),
          cone(0, P + 4 * B + 2 * P + 0.2,             7.8, 0.5, 0.9, '#10B981', { rotation: [Math.PI / 2, 0, 0] }),
        ],
      },
      /* ── Step 8: Back spikes (row along spine) ───────────────────── */
      {
        num: 8, title: 'Add Fierce Back Spikes!', emoji: '⚡',
        desc: 'Stick <strong>5 yellow spikes</strong> in a row along the top of the body, from head to tail. Now your Dino Bot looks FIERCE!',
        pieces: [
          { color: '#F59E0B', name: '5× Yellow Spike Pieces' },
          { color: '#7F1D1D', name: '3× Dark Red Belly Stripes' },
        ],
        tip: 'Spikes along a dinosaur\'s back helped regulate body temperature — like giant radiators!',
        steamTag: 'art',
        newParts: [
          // Chest top at y = P + 4B + 2P + 2B = 8.4. Spikes on top.
          cone(0, P + 4 * B + 2 * P + 2 * B, -2.2, 0.3, 0.9,  '#F59E0B'),
          cone(0, P + 4 * B + 2 * P + 2 * B, -0.8, 0.35, 1.1, '#F59E0B'),
          cone(0, P + 4 * B + 2 * P + 2 * B,  0.5, 0.35, 1.2, '#F59E0B'),
          cone(0, P + 4 * B + 2 * P + 2 * B,  1.8, 0.3, 1.0,  '#F59E0B'),
          cone(0, P + 4 * B + 2 * P + 2 * B,  3.0, 0.25, 0.8, '#F59E0B'),
          // Belly stripes (horizontal tiles on the front of the chest)
          tile(0, P + 4 * B + 2 * P + 0.1,         -2.5, 3, 0.3, '#7F1D1D'),
          tile(0, P + 4 * B + 2 * P + B + 0.1,     -2.5, 3, 0.3, '#7F1D1D'),
          tile(0, P + 4 * B + 2 * P + 2 * B - 0.3, -2.5, 3, 0.3, '#7F1D1D'),
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
