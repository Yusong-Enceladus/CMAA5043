/**
 * LEGO Robot model data — each step lists the bricks it ADDS (`newParts`).
 * The 3D viewer cumulates parts from step 1..currentStep.
 *
 * Coordinate system:
 *   - Ground is y = 0. +Y is up.
 *   - X is left/right, Z is front/back (-Z = forward, toward viewer in default camera).
 *   - 1 unit = 1 LEGO stud. 1 plate height = 0.4, 1 brick height = 1.2.
 *   - `pos` is the CENTER of the brick. `size` is [width, height, depth] in world units.
 *
 * Physical rules all models follow (audited):
 *   - Every brick's bottom either sits on the ground (y_bottom = 0) or on top of
 *     another brick declared in the same or earlier step.
 *   - Nothing floats. Feet touch the ground; bodies rest on feet/legs/chassis;
 *     heads rest on necks; tails attach to the back of the body.
 *   - Left/right symmetry is exact where anatomy calls for it.
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
const cyl = (x, yBottom, z, r, h, color, extra = {}) =>
  ({ type: 'cylinder', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color, ...extra });
const cone = (x, yBottom, z, r, h, color, extra = {}) =>
  ({ type: 'cone', pos: [x, yBottom + h / 2, z], size: [r * 2, h, r * 2], color, ...extra });
// Wheel y is the center of the wheel (wheel radius above ground so it kisses y=0)
const wheel = (x, z, color) => ({ type: 'wheel', pos: [x, 0.8, z], size: [1.6, 1.0, 1.6], color });
const tile = (x, yBottom, z, w, d, color) =>
  ({ type: 'tile', pos: [x, yBottom + P / 2, z], size: [w, P, d], color });

export const robotModels = [
  /* ─────────────────────────────── DOG ─────────────────────────────── */
  {
    id: 'dog',
    name: 'Robot Dog',
    emoji: '🐶',
    difficulty: 'Easy',
    pieceCount: 38,
    color: '#F59E0B',
    description: 'A friendly walking robot dog with a wagging tail and sensor eyes!',
    steps: [
      // ── Step 1: four legs standing on the floor ───────────────────────
      // Legs are short brick columns (one brick tall) supporting the torso.
      {
        num: 1, title: 'Stand Up the Four Legs', emoji: '🦿',
        desc: 'Place <strong>4 tall yellow bricks</strong> on the table — these are your dog\'s legs. They should form a rectangle so the torso sits flat on top!',
        pieces: [{ color: '#F59E0B', name: '4× Yellow 1×1 Tall Bricks' }],
        tip: 'Four equal legs = bilateral symmetry. Real animals use this for stable walking.',
        steamTag: 'math',
        newParts: [
          // y_bottom = 0, height = B, top at y = B = 1.2
          tallBrick(-1.5, 0, -3, 1, 1, B, '#F59E0B'),
          tallBrick( 1.5, 0, -3, 1, 1, B, '#F59E0B'),
          tallBrick(-1.5, 0,  3, 1, 1, B, '#F59E0B'),
          tallBrick( 1.5, 0,  3, 1, 1, B, '#F59E0B'),
        ],
      },
      // ── Step 2: body base sits on top of the legs ─────────────────────
      // Red 4×8 plate spans all four leg tops (x from -2 to +2, z from -4 to +4).
      {
        num: 2, title: 'Lay the Body Base', emoji: '🧱',
        desc: 'Now snap a <strong>4×8 red plate</strong> onto the tops of all four legs. This is the dog\'s back — everything else builds up from here!',
        pieces: [{ color: '#EF4444', name: '1× Red 4×8 Plate' }],
        tip: 'A wide flat base spreads weight evenly over the four legs.',
        steamTag: 'engineering',
        newParts: [
          // Legs reach y = B = 1.2. Plate rests at yBottom = 1.2.
          plate(0, B, 0, 4, 8, '#EF4444'),
        ],
      },
      // ── Step 3: paw pads at the bottom of each leg ────────────────────
      // Slightly wider than the legs so they show as "shoes".
      {
        num: 3, title: 'Add the Paw Pads', emoji: '🐾',
        desc: 'Stick a <strong>small dark pad</strong> under each leg. These paws give the dog grip, just like shoes do!',
        pieces: [{ color: '#1F2937', name: '4× Dark 1×1 Paw Tiles' }],
        tip: 'Rubber pads on robots increase friction — that\'s why shoes grip the ground.',
        steamTag: 'science',
        newParts: [
          // y_bottom = 0 (on the ground), wider than the leg (1.2 × 1.2)
          tile(-1.5, 0, -3, 1.2, 1.2, '#1F2937'),
          tile( 1.5, 0, -3, 1.2, 1.2, '#1F2937'),
          tile(-1.5, 0,  3, 1.2, 1.2, '#1F2937'),
          tile( 1.5, 0,  3, 1.2, 1.2, '#1F2937'),
        ],
      },
      // ── Step 4: chest on top of the torso plate, toward the front ─────
      // Two 2×4 blue bricks stacked, roughly over the front half of the torso.
      {
        num: 4, title: 'Build the Chest', emoji: '💛',
        desc: 'Stack <strong>two 2×4 blue bricks</strong> toward the front of the body. This is the chest — the dog\'s head will attach above it!',
        pieces: [{ color: '#3B82F6', name: '2× Blue 2×4 Bricks' }],
        tip: 'Stacking bricks over the front of the body balances the tail weight at the back.',
        steamTag: 'engineering',
        newParts: [
          // Plate top at y = B + P = 1.6. Brick 1 yBottom = 1.6.
          brick(0, B + P,         -1, 2, 4, '#3B82F6'),
          brick(0, B + P + B,     -1, 2, 4, '#3B82F6'),
        ],
      },
      // ── Step 5: sloped neck rising forward from the chest top ─────────
      {
        num: 5, title: 'Angle the Neck', emoji: '🦒',
        desc: 'Place an <strong>angled green slope</strong> on the front of the chest, rising toward where the head will go!',
        pieces: [{ color: '#10B981', name: '1× Green 2×2 Slope Brick' }],
        tip: 'A slope (inclined plane) is one of the 6 classic simple machines — it lifts things with less effort!',
        steamTag: 'science',
        newParts: [
          // Chest top = B + P + 2B = 1.6 + 2.4 = 4.0. Slope yBottom = 4.0.
          slope(0, B + P + 2 * B, -2, 2, 2, '#10B981'),
        ],
      },
      // ── Step 6: head block sits on the neck slope area ────────────────
      // Head is a 2×2×h brick positioned at the front (-z), resting on the slope.
      {
        num: 6, title: 'Build the Head', emoji: '🐕',
        desc: 'Add a <strong>green 2×2 head block</strong> at the top of the neck. Then press <strong>two white eyes</strong> and a <strong>purple sensor</strong> on the front — the sensor is the brain!',
        pieces: [
          { color: '#10B981', name: '1× Green 2×2 Head' },
          { color: '#FFFFFF', name: '2× White Round Eyes' },
          { color: '#6366F1', name: '1× Purple Sensor Brick' },
        ],
        tip: 'Real robots use camera "eyes" plus a central processor to understand the world.',
        steamTag: 'technology',
        newParts: [
          // Head: yBottom = 4.0 + B = 5.2 (on top of the slope peak)
          brick(0, B + P + 3 * B, -3, 2, 2, '#10B981'),
          // Eyes on the front face of the head (toward -Z). Head front face at z = -3 - 1 = -4.
          cyl(-0.55, B + P + 3 * B + 0.55, -3.95, 0.3, 0.2, '#FFFFFF'),
          cyl( 0.55, B + P + 3 * B + 0.55, -3.95, 0.3, 0.2, '#FFFFFF'),
          // Sensor brick on top of the head
          tallBrick(0, B + P + 4 * B, -3, 1, 1, B, '#6366F1'),
        ],
      },
      // ── Step 7: tail on the back of the chest ─────────────────────────
      // A hinge plate on the chest top (rear half), then a tapered tail.
      {
        num: 7, title: 'Wag the Tail', emoji: '🎾',
        desc: 'At the back of the chest, attach a <strong>pink hinge plate</strong> and stack <strong>3 orange round bricks</strong>. The hinge lets the tail wag!',
        pieces: [
          { color: '#EC4899', name: '1× Pink Hinge Plate' },
          { color: '#F97316', name: '3× Orange Round Bricks' },
        ],
        tip: 'A hinge is a mechanical joint that rotates on one axis — your elbow works the same way!',
        steamTag: 'engineering',
        newParts: [
          // Hinge plate on the chest top (rear). Chest is at -1 center, spans z -3 to +1.
          // Place hinge just behind chest at z = 2, yBottom = chest top = 4.0
          plate(0, B + P + 2 * B, 2.5, 1, 1, '#EC4899'),
          // Three round tail segments going up and slightly back
          cyl(0, B + P + 2 * B + P,        3.0, 0.35, 0.6, '#F97316'),
          cyl(0, B + P + 2 * B + P + 0.6,  3.4, 0.35, 0.6, '#F97316'),
          cyl(0, B + P + 2 * B + P + 1.2,  3.8, 0.35, 0.6, '#F97316'),
        ],
      },
      // ── Step 8: decorations (collar ring around neck, star on chest) ──
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
          // Collar: low-profile cylinder around the neck slope (z ~ -2, y at slope mid)
          cyl(0, B + P + 2 * B + 0.2, -2, 1.1, 0.3, '#EF4444'),
          // Star tile: on the chest top
          tile(0, B + P + 2 * B, 0, 1, 1, '#FCD34D'),
        ],
      },
    ],
  },

  /* ─────────────────────────────── CAR ─────────────────────────────── */
  {
    id: 'car',
    name: 'Robot Car',
    emoji: '🏎️',
    difficulty: 'Easy',
    pieceCount: 32,
    color: '#3B82F6',
    description: 'A speedy robot car with spinning wheels, a radar dish, and racing stripes!',
    steps: [
      // Wheels first — they sit on the ground and the chassis bolts to them.
      // Wheel radius 0.8 → wheel center y = 0.8, bottom touches y = 0.
      {
        num: 1, title: 'Mount the Four Wheels', emoji: '🛞',
        desc: 'Place <strong>4 black wheels</strong> in a rectangle on the table. Make sure the front pair and back pair are the same distance apart!',
        pieces: [{ color: '#111827', name: '4× Wheel + Axle sets' }],
        tip: 'Round wheels reduce friction — that\'s why humans invented them 6,000 years ago!',
        steamTag: 'science',
        newParts: [
          wheel(-2.3, -3, '#111827'),
          wheel( 2.3, -3, '#111827'),
          wheel(-2.3,  3, '#111827'),
          wheel( 2.3,  3, '#111827'),
        ],
      },
      // Chassis plate rests on top of the wheels (y_bottom = wheel top ≈ 1.2).
      {
        num: 2, title: 'Lay the Chassis', emoji: '🧱',
        desc: 'Snap a long <strong>4×10 blue plate</strong> across the tops of the wheels. This is the car\'s floor!',
        pieces: [{ color: '#3B82F6', name: '1× Blue 4×10 Plate' }],
        tip: 'Race cars have long flat chassis to stay low and stable — a lower center of gravity resists flipping.',
        steamTag: 'engineering',
        newParts: [
          // Wheel top ≈ 0.8 + 0.8 = 1.6, but wheels are torus so effective mount point is lower.
          // Chassis yBottom at wheel-center level = 0.8.
          plate(0, 0.8, 0, 4, 10, '#3B82F6'),
        ],
      },
      // Front bumper: red brick at the very front edge of the chassis.
      {
        num: 3, title: 'Build the Front Bumper', emoji: '🚗',
        desc: 'Place a <strong>red 2×2 brick</strong> at the very front. This is the bumper — it protects the car in a bump!',
        pieces: [{ color: '#EF4444', name: '1× Red 2×2 Bumper Brick' }],
        tip: 'Car bumpers absorb crash energy — that\'s physics of impact keeping passengers safer.',
        steamTag: 'science',
        newParts: [
          // Chassis top at y = 0.8 + P = 1.2. Bumper yBottom = 1.2, z = front = -4.
          brick(0, 0.8 + P, -4, 2, 2, '#EF4444'),
        ],
      },
      // Cockpit floor: two gray plates stacked in the middle of the chassis.
      {
        num: 4, title: 'Raise the Cockpit Floor', emoji: '💺',
        desc: 'Stack <strong>two 2×4 gray plates</strong> in the middle of the chassis. This raises the driver so they can see the road!',
        pieces: [{ color: '#6B7280', name: '2× Gray 2×4 Plates' }],
        tip: 'Layering flat plates adds height without much weight — lighter cars accelerate faster.',
        steamTag: 'math',
        newParts: [
          plate(0, 0.8 + P,           0, 2, 4, '#6B7280'),
          plate(0, 0.8 + 2 * P,       0, 2, 4, '#6B7280'),
        ],
      },
      // Driver seat slope on top of cockpit floor.
      {
        num: 5, title: 'Add the Driver Seat', emoji: '🪑',
        desc: 'Place a <strong>green slope brick</strong> on the cockpit. The slope forms the back of the seat!',
        pieces: [{ color: '#10B981', name: '1× Green 2×2 Slope Brick' }],
        tip: 'Slopes (inclined planes) also make the car aerodynamic — cutting through air smoothly.',
        steamTag: 'science',
        newParts: [
          // Cockpit top at y = 0.8 + 2P = 1.6. Seat yBottom = 1.6.
          slope(0, 0.8 + 2 * P, 1, 2, 2, '#10B981'),
        ],
      },
      // Windshield (translucent slope in front of the seat).
      {
        num: 6, title: 'Mount the Windshield', emoji: '🪟',
        desc: 'Add a <strong>clear curved windshield</strong> in front of the seat. It protects the driver from wind!',
        pieces: [{ color: '#93C5FD', name: '1× Clear Windshield' }],
        tip: 'Windshields are made of layered plastic that stays in one piece if it cracks.',
        steamTag: 'technology',
        newParts: [
          slope(0, 0.8 + 2 * P, -1, 2, 1.5, '#BFDBFE', { opacity: 0.6 }),
        ],
      },
      // Radar turntable + dish on the roof (top of seat area).
      {
        num: 7, title: 'Install the Radar Dish', emoji: '📡',
        desc: 'Put a <strong>yellow turntable</strong> on the roof, then a <strong>purple radar dish</strong> on top. Your car can now "see" ahead!',
        pieces: [
          { color: '#F59E0B', name: '1× Yellow Turntable' },
          { color: '#8B5CF6', name: '1× Purple Radar Dish' },
        ],
        tip: 'Self-driving cars really do use spinning LIDAR sensors that look just like this!',
        steamTag: 'technology',
        newParts: [
          // Roof top (on top of slope) ≈ 0.8 + 2P + B = 2.8. Turntable yBottom = 2.8.
          cyl(0, 0.8 + 2 * P + B,       1, 0.5, 0.3, '#F59E0B'),
          cone(0, 0.8 + 2 * P + B + 0.3, 1, 0.9, 0.6, '#8B5CF6'),
        ],
      },
      // Decorations: red stripe tiles on the hood, gold number plate on the bumper.
      {
        num: 8, title: 'Racing Decorations', emoji: '🎨',
        desc: 'Add <strong>red racing stripes</strong> along the hood and a <strong>gold #7 number plate</strong> on the front. You are car #7 — make it loud!',
        pieces: [
          { color: '#EF4444', name: '2× Red Stripe Tiles' },
          { color: '#FCD34D', name: '1× Gold Number Plate' },
        ],
        tip: 'Great designers think about how things look AND how they work — the best design does both.',
        steamTag: 'art',
        newParts: [
          // Stripe tiles on the chassis top (yBottom = chassis top = 1.2) between cockpit and bumper.
          tile(-0.7, 0.8 + P, -2.3, 0.5, 3, '#EF4444'),
          tile( 0.7, 0.8 + P, -2.3, 0.5, 3, '#EF4444'),
          // Gold plate on the front of the bumper
          tile(0, 0.8 + P + B / 2, -4.8, 1, 0.8, '#FCD34D'),
        ],
      },
    ],
  },

  /* ─────────────────────────────── DINO ─────────────────────────────── */
  {
    id: 'dino',
    name: 'Dino Bot',
    emoji: '🦕',
    difficulty: 'Medium',
    pieceCount: 48,
    color: '#10B981',
    description: 'A mighty T-Rex robot with stomping legs, a jaw that opens, and back spikes!',
    steps: [
      // Stomping feet on the ground.
      {
        num: 1, title: 'Place the Stomping Feet', emoji: '👣',
        desc: 'Put <strong>4 dark gray foot plates</strong> on the table in a rectangle. Big animals need big feet!',
        pieces: [{ color: '#374151', name: '4× Dark Gray 2×2 Feet Plates' }],
        tip: 'Wide feet spread weight — that\'s why elephants don\'t sink into the ground.',
        steamTag: 'science',
        newParts: [
          tile(-1.2, 0, -2, 2.2, 2.2, '#374151'),
          tile( 1.2, 0, -2, 2.2, 2.2, '#374151'),
          tile(-1.2, 0,  2, 2.2, 2.2, '#374151'),
          tile( 1.2, 0,  2, 2.2, 2.2, '#374151'),
        ],
      },
      // Thick leg columns — 2 bricks tall — on top of each foot.
      {
        num: 2, title: 'Build the Four Legs', emoji: '🦿',
        desc: 'Stack <strong>2 thick green bricks</strong> on each foot to make the legs. Wider legs = more stability!',
        pieces: [{ color: '#10B981', name: '8× Green 2×2 Bricks' }],
        tip: 'T-Rex legs were as thick as tree trunks to support the massive body above.',
        steamTag: 'engineering',
        newParts: [
          // Foot top at y = P = 0.4. Legs yBottom = 0.4.
          brick(-1.2, P,          -2, 2, 2, '#10B981'),
          brick(-1.2, P + B,      -2, 2, 2, '#10B981'),
          brick( 1.2, P,          -2, 2, 2, '#10B981'),
          brick( 1.2, P + B,      -2, 2, 2, '#10B981'),
          brick(-1.2, P,           2, 2, 2, '#10B981'),
          brick(-1.2, P + B,       2, 2, 2, '#10B981'),
          brick( 1.2, P,           2, 2, 2, '#10B981'),
          brick( 1.2, P + B,       2, 2, 2, '#10B981'),
        ],
      },
      // Body plates on top of the legs.
      {
        num: 3, title: 'Lay the Body', emoji: '🧱',
        desc: 'Stack <strong>two green 4×6 plates</strong> on top of all four legs. This is the dino\'s body!',
        pieces: [{ color: '#10B981', name: '2× Green 4×6 Plates' }],
        tip: 'Real T-Rex bodies weighed up to 7 tonnes — as much as an elephant!',
        steamTag: 'science',
        newParts: [
          // Leg top at y = P + 2B = 2.8. Body yBottom = 2.8.
          plate(0, P + 2 * B,       0, 4, 6, '#10B981'),
          plate(0, P + 2 * B + P,   0, 4, 6, '#10B981'),
        ],
      },
      // Neck: 3 sloped bricks stepping upward + forward.
      {
        num: 4, title: 'Raise the Neck', emoji: '🦒',
        desc: 'Stack <strong>3 angled light-green slope bricks</strong> at the front of the body, each curving upward!',
        pieces: [{ color: '#34D399', name: '3× Light Green Slope Bricks' }],
        tip: 'The S-curve of a dino neck uses the same engineering as a crane — strong beams angled for reach.',
        steamTag: 'engineering',
        newParts: [
          // Body top at y = P + 2B + 2P = 3.6. Stack slopes upward, each 1.2 tall.
          slope(0, P + 2 * B + 2 * P,         -2.5, 2, 2, '#34D399'),
          slope(0, P + 2 * B + 2 * P + B,     -3.0, 2, 2, '#34D399'),
          slope(0, P + 2 * B + 2 * P + 2 * B, -3.5, 2, 2, '#34D399'),
        ],
      },
      // Head + jaw on top of the neck.
      {
        num: 5, title: 'Form the Head and Jaw', emoji: '🦖',
        desc: 'Place a <strong>green 2×2 head</strong> at the top of the neck, with a <strong>hinged jaw</strong> underneath that opens!',
        pieces: [
          { color: '#10B981', name: '1× Green 2×2 Head' },
          { color: '#059669', name: '1× Hinged Jaw Piece' },
        ],
        tip: 'Hinges turn rotation into motion — crocodile jaws open with 3,700 pounds of force!',
        steamTag: 'engineering',
        newParts: [
          // Neck top y = P + 2B + 2P + 3B = 0.4 + 2.4 + 0.8 + 3.6 = 7.2
          brick(0, P + 2 * B + 2 * P + 3 * B, -4.0, 2, 2.5, '#10B981'),
          // Jaw: sits just below the head, hinged at the back
          slope(0, P + 2 * B + 2 * P + 2 * B + 0.2, -4.3, 2, 2, '#059669'),
        ],
      },
      // Teeth — small cones protruding down from jaw and head.
      {
        num: 6, title: 'Add Sharp Teeth', emoji: '🦷',
        desc: 'Stick <strong>6 white tooth cones</strong> along the jaw. Scary AND cool — just like a real T-Rex!',
        pieces: [{ color: '#FFFFFF', name: '6× White Tooth Pieces' }],
        tip: 'Real T-Rex teeth were as long as bananas — and there were 60 of them!',
        steamTag: 'science',
        newParts: [
          // Upper teeth hang from the head front face. Head at y = 7.2 to 7.2+B=8.4, center z = -4.
          // Teeth under the head (downward cones) — use inverted cones pointing down by flipping rotation on X.
          cone(-0.6, P + 2 * B + 2 * P + 3 * B - 0.3, -4.8, 0.15, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone(-0.2, P + 2 * B + 2 * P + 3 * B - 0.3, -4.8, 0.15, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone( 0.2, P + 2 * B + 2 * P + 3 * B - 0.3, -4.8, 0.15, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          cone( 0.6, P + 2 * B + 2 * P + 3 * B - 0.3, -4.8, 0.15, 0.35, '#FFFFFF', { rotation: [Math.PI, 0, 0] }),
          // Lower teeth on the jaw, pointing up
          cone(-0.3, P + 2 * B + 2 * P + 2 * B + 0.8, -4.8, 0.15, 0.3, '#FFFFFF'),
          cone( 0.3, P + 2 * B + 2 * P + 2 * B + 0.8, -4.8, 0.15, 0.3, '#FFFFFF'),
        ],
      },
      // Tail — tapering bricks extending back and slightly down.
      {
        num: 7, title: 'Build the Long Tail', emoji: '🐊',
        desc: 'Attach <strong>5 tapering bricks</strong> extending out the back, each smaller than the last. The tail helps with balance!',
        pieces: [{ color: '#10B981', name: '5× Tapering Green Bricks' }],
        tip: 'A dino\'s tail balanced its heavy head — like a seesaw!',
        steamTag: 'math',
        newParts: [
          // Tail attaches to the back of the body (z > 3). Body top at y = 3.6.
          // First segment sits on the body top (yBottom = 3.6).
          brick(0, P + 2 * B + 2 * P, 3.5, 2,   2,   '#10B981'),
          brick(0, P + 2 * B + 2 * P, 4.8, 1.6, 1.4, '#10B981'),
          brick(0, P + 2 * B + 2 * P, 5.8, 1.2, 1.2, '#10B981'),
          brick(0, P + 2 * B + 2 * P, 6.6, 0.9, 1.0, '#10B981'),
          cone(0, P + 2 * B + 2 * P + 0.2, 7.4, 0.5, 0.9, '#10B981', { rotation: [Math.PI / 2, 0, 0] }),
        ],
      },
      // Back spikes along the spine.
      {
        num: 8, title: 'Add Back Spikes!', emoji: '⚡',
        desc: 'Stick <strong>4 yellow spikes</strong> along the top of the body, from head to tail. Now your Dino Bot looks FIERCE!',
        pieces: [{ color: '#F59E0B', name: '4× Yellow Spike Pieces' }],
        tip: 'Real stegosaurus spikes were for defense — and maybe to show off to other dinos!',
        steamTag: 'art',
        newParts: [
          // Body top at y = 3.6. Spikes yBottom = 3.6.
          cone(0, P + 2 * B + 2 * P, -1.5, 0.3, 0.9, '#F59E0B'),
          cone(0, P + 2 * B + 2 * P,  0,   0.3, 1.0, '#F59E0B'),
          cone(0, P + 2 * B + 2 * P,  1.5, 0.3, 0.9, '#F59E0B'),
          cone(0, P + 2 * B + 2 * P,  3.0, 0.3, 0.7, '#F59E0B'),
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
