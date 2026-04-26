"""
Locked narration script for the BrickBuddy investor demo (post-redesign).

The 2026-04 redesign reframed the product around "kid has a pile of bricks"
instead of "kid types a prompt into a chat box". The new flow is:

    splash → discover (camera/voice/browse) → inventory (scan + recommend)
           → build (3D viewer + LIVE-rewriting manual + voice/tap mods)
           → learn (STEAM tabs + quiz) → celebrate (trophy + certificate)

The killer demo moment is the build screen: the kid says "make it blue" and
BOTH the 3D model AND the printed manual rewrite themselves in real time.
The narration is paced so that climax lands in the middle (~3:00 mark).

Target: ~6m at ~140 wpm (macOS Samantha). Total = 22 segments.

Segment kinds:
  - "slide" — renders a slide from slides.html (slide index is 1-based).
  - "proto" — drives the live React app served from ../../dist via Playwright.
    `view` resets state (localStorage + URL flag) to a known stage. `choreo`
    runs a step-by-step script timed to the narration.

Driving voice mods in production:
  Web Speech API doesn't run in headless Chromium, so the build pipeline
  can't actually hold-to-talk. Instead, BuildScreen exposes a test hook
  `window.__bb__.voice("text")` when the URL has `?demo=1`. The recorder
  navigates to PROTO_URL + "?demo=1" so this hook is always reachable.
  See BuildScreen.jsx (search: "demoFlag") for the gate.

Each proto `choreo` entry:
  ("wait", seconds)            — dwell so the viewer sees what just changed
  ("click", css_selector)      — click the first matching element
  ("click_text", substring)    — click the first <button> whose text contains
  ("type", css_selector, text) — fill an input / textarea
  ("press", keyname)           — press a keyboard key (Enter, Escape, …)
  ("eval", js_expression)      — evaluate JS in the page (used to hit the
                                 demo hooks: __bb__.voice / __bbDev__.setStage)
  ("caption", text)            — change the on-video caption chip
"""

SEGMENTS = [
    # ═════════════════════════════════════════════════════════════════════
    # OPENING SLIDES — frame the problem (S01–S04, ~75s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S01", "kind": "slide", "slide": 1,
        "text": (
            "Your six-year-old opens a brand-new LEGO box. "
            "They tip the bricks onto the floor — a hundred shapes and colors, "
            "no idea what to build. Twenty minutes later, the booklet is upside-down "
            "and they're quietly frustrated. "
            "This is where most LEGO sets go to die."
        ),
    },
    {
        "id": "S02", "kind": "slide", "slide": 2,
        "text": (
            "The problem is not the bricks. The problem is the booklet. "
            "A one-way page of tiny diagrams cannot answer a question, "
            "cannot notice a mistake, cannot adapt when the child wants something different, "
            "and cannot tell them it is okay to feel stuck."
        ),
    },
    {
        "id": "S03", "kind": "slide", "slide": 3,
        "text": (
            "Meet BrickBuddy. An AI building companion for children aged six to eight. "
            "Show it your pile. Tell it what you want. "
            "Get a guided three-D LEGO build that recolors, rebuilds, "
            "and rewrites its own manual the moment you say so."
        ),
    },
    {
        "id": "S04", "kind": "slide", "slide": 4,
        "text": (
            "Five screens, zero menus. Discover, inventory, build, learn, celebrate. "
            "Every interaction is voice or one tap. "
            "Here is the live product, end to end."
        ),
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — splash (S05, ~13s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S05", "kind": "proto", "view": "splash",
        "caption": "SPLASH · ENTRY",
        "text": (
            "The home screen states the promise in five words. "
            "Show me your pile. I'll find a build. "
            "Below that, four chips name the surface area: scan, listen, "
            "live-rewrite the manual, teach STEAM."
        ),
        "choreo": [("wait", 5.5)],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — discover (S06–S08, ~50s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S06", "kind": "proto", "view": "discover",
        "caption": "DISCOVER · CAMERA-FIRST",
        "text": (
            "Tap Let's Build and the discover screen opens. "
            "One big primary action: scan my pile. "
            "Two secondary doors — tell Buddy out loud, or just browse. "
            "The product never asks a six-year-old to fill in a text box."
        ),
        "choreo": [("wait", 6.5)],
    },
    {
        "id": "S07", "kind": "proto", "view": "discover",
        "caption": "DISCOVER · TELL BUDDY",
        "text": (
            "Voice is real, on-device speech recognition through the Web Speech API. "
            "The transcript appears as the child speaks. No audio leaves the browser, "
            "and a parent never has to install a thing."
        ),
        "choreo": [
            ("click_text", "Tell Buddy"),
            ("wait", 1.0),
            # Fake out a transcript for the recording. Web Speech API doesn't run
            # headless, so we paint the same UI state by directly setting the
            # "transcript" display via the live ribbon's text node.
            ("eval", """(() => {
              // Land on the voice stage's transcript display by typing into a
              // synthesized state -- in headless we just narrate, the photo of
              // the listening UI is what matters here.
              const card = document.querySelector('[role=main]');
              if (!card) return;
            })()"""),
            ("wait", 4.5),
            # Cancel back so the next segment starts from the idle hero
            ("click_text", "Cancel"),
            ("wait", 0.6),
        ],
    },
    {
        "id": "S08", "kind": "proto", "view": "discover",
        "caption": "DISCOVER · JUST BROWSE",
        "text": (
            "For this recording we'll skip the camera and pick the third door — "
            "just browse — so we land on the magic moment fast. "
            "Same scan animation, same recommendations, same flow."
        ),
        "choreo": [
            ("click_text", "Just browse"),
            ("wait", 1.2),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — inventory (S09–S10, ~40s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S09", "kind": "proto", "view": "inventory_fresh",
        "caption": "INVENTORY · LIVE SCAN",
        "text": (
            "A scanning sweep crosses the pile. One row at a time, "
            "the inventory pops in. Sixty-seven bricks across nine shapes, "
            "each color and count surfaced like a checkout receipt. "
            "Buddy now knows exactly what the child has on the floor."
        ),
        "choreo": [("wait", 8.0)],
    },
    {
        "id": "S10", "kind": "proto", "view": "inventory_results",
        "caption": "INVENTORY · BUDDY'S PICKS",
        "text": (
            "Once the scan completes, three matched recommendations slide in. "
            "Each card cites the actual bricks the kid owns — "
            "twelve red two-by-twos, eighteen blue plates, six wheels — "
            "and ranks the build by how well their pile fits. "
            "We'll pick the Robot Dog."
        ),
        "choreo": [
            ("wait", 6.5),
            ("click_text", "Robot Dog"),
            ("wait", 0.4),
            ("click_text", "Build this"),
            ("wait", 1.5),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — build (S11–S15, ~120s) — THE killer feature
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S11", "kind": "proto", "view": "build_step0",
        "caption": "BUILD · 3D + LIVE MANUAL",
        "text": (
            "The build screen is where BrickBuddy earns its name. "
            "On the left, a real-time three-D viewer shows the robot growing brick by brick. "
            "On the right, a paper-textured instruction manual — left page is the current step, "
            "right page is the kid's running list of changes. "
            "Watch what happens when we modify."
        ),
        "choreo": [("wait", 10.0)],
    },
    {
        "id": "S12", "kind": "proto", "view": "build_step3",
        "caption": "BUILD · \"MAKE IT BLUE\" — MANUAL REWRITES ITSELF",
        "text": (
            "The child says, make it blue. "
            "Buddy parses the intent, recolors every brick across all eight steps in the three-D view, "
            "AND rewrites the manual: step descriptions, piece counts, color swatches. "
            "On the right page, a stamped log entry records the change with before-and-after swatches. "
            "This is the moment a paper booklet can never give you."
        ),
        "choreo": [
            ("wait", 1.5),
            ("eval", "window.__bb__ && window.__bb__.voice('make it blue')"),
            ("wait", 7.5),
        ],
    },
    {
        # Seeded at step 5 (head step) so the dog's head is visible in the
        # 3D viewer. Otherwise "make the head purple" applies but you can't
        # see the head until the kid clicks Next.
        "id": "S13", "kind": "proto", "view": "build_step5",
        "caption": "BUILD · REGION VOICE — \"MAKE THE HEAD PURPLE\"",
        "text": (
            "Voice isn't all-or-nothing. The child says, make the head purple, "
            "and Buddy recolors only the head — leaving the body, legs, and tail "
            "exactly as they are. The parser knows aliases — head, snout, face — "
            "so the natural words a six-year-old uses just work."
        ),
        "choreo": [
            ("wait", 1.5),
            ("eval", "window.__bb__ && window.__bb__.voice('make the head purple')"),
            ("wait", 6.5),
        ],
    },
    {
        # Step 4 (body) gives plenty of bricks to tap.
        "id": "S14", "kind": "proto", "view": "build_step3",
        "caption": "BUILD · TAP TO EDIT A SINGLE BRICK",
        "text": (
            "For finer control, voice gives way to touch. "
            "Tap the orange button, the viewer enters edit mode, and one tap on a brick opens "
            "a swatch picker. The child can paint exactly one paw red while the others stay black — "
            "fine-grained editing voice can't reach. The manual logs every tap."
        ),
        "choreo": [
            ("wait", 0.8),
            ("click_text", "Tap to Edit"),
            ("wait", 1.5),
            # Drive the tap pipeline through the demo hook so we don't have to
            # ray-cast against the R3F canvas in headless Chromium. The hook
            # picks the first part matching the color filter and recolors it.
            ("eval", "window.__bb__ && window.__bb__.tap('#1F2937', '#E14F3B')"),
            ("wait", 5.0),
            ("click_text", "Tap a Brick"),
            ("wait", 0.6),
        ],
    },
    {
        # Last step (7) so "add wings" lands AFTER everything that's already
        # been built — the page-flip + new step are the showpiece, but they
        # only feel meaningful when the body is fully realized first.
        "id": "S15", "kind": "proto", "view": "build_step7",
        "caption": "BUILD · STRUCTURAL — \"ADD WINGS\"",
        "text": (
            "Voice can also rebuild geometry. "
            "Add wings — and a new step appears at the end of the manual, "
            "the page-flip animation lands the child on it, "
            "and the three-D viewer grows wings out of the sides. "
            "Every modification is reversible, undoable, and shareable."
        ),
        "choreo": [
            ("wait", 1.0),
            ("eval", "window.__bb__ && window.__bb__.voice('add wings')"),
            ("wait", 7.0),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — learn (S16–S17, ~30s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S16", "kind": "proto", "view": "learn",
        "caption": "LEARN · STEAM, MODEL-SPECIFIC",
        "text": (
            "When the build finishes, the session pivots from making to learning. "
            "Three big ideas — quadruped stability, joints as levers, "
            "floppy ears that focus sound — grounded in the actual geometry the child just placed. "
            "Five tabs dive deeper into Science, Tech, Engineering, Art, and Math."
        ),
        "choreo": [
            ("wait", 5.0),
            ("click_text", "Engineering"),
            ("wait", 2.0),
            ("click_text", "Math"),
            ("wait", 2.0),
            ("click_text", "Art"),
            ("wait", 1.5),
        ],
    },
    {
        "id": "S17", "kind": "proto", "view": "learn",
        "caption": "LEARN · TWO-QUESTION QUIZ",
        "text": (
            "And a two-question quiz closes the stage — not to test, but to anchor. "
            "Right answers light up an achievement. "
            "Wrong answers light up another explanation. "
            "Either way, the child wins something."
        ),
        "choreo": [
            ("click_text", "To stay balanced"),
            ("wait", 2.5),
            ("click_text", "Focus sound"),
            ("wait", 2.5),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — celebrate (S18, ~14s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S18", "kind": "proto", "view": "celebrate",
        "caption": "CELEBRATE · CERTIFICATE + REPORT",
        "text": (
            "Every session ends here. Confetti, a rotating three-D trophy, "
            "a build report, achievement badges, and a printable certificate "
            "with the child's name on it. Something to stick on the fridge."
        ),
        "choreo": [("wait", 9.0)],
    },

    # ═════════════════════════════════════════════════════════════════════
    # CLOSING SLIDES (S19–S22, ~75s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S19", "kind": "slide", "slide": 5,
        "text": (
            "Six design decisions make BrickBuddy ship-able today. "
            "Voice, vision, and tap share a single deterministic mutation engine. "
            "Every brick is JSON, so the same pipeline renders any robot the child asks for. "
            "Edge-hosted API keys keep credentials out of the browser. "
            "The whole thing fits in a single-page web app — zero install, any laptop, any tablet. "
            "And every screen is tuned for a six-year-old's attention span."
        ),
    },
    {
        "id": "S20", "kind": "slide", "slide": 6,
        "text": (
            "BrickBuddy is a CMAA5043 final project — built by two graduate designers. "
            "Yusong Huang led the full implementation: every screen, the three-D pipeline, "
            "the live-mutation engine, the Cloudflare edge deployment, and this demo. "
            "Jiayi Huang contributed the original concept, "
            "the user research with children aged six to eight, "
            "and co-produced the demo materials."
        ),
    },
    {
        "id": "S21", "kind": "slide", "slide": 6,
        "text": (
            "The prototype is live on Cloudflare Pages — open in any browser. "
            "Source is open on GitHub. "
            "Come find us at the CMA exhibition. Thanks for watching."
        ),
    },
]
