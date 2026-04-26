"""
Locked narration script for the BrickBuddy investor demo.

Iteration 2 (post-GPT review). The previous draft over-claimed and rushed
the climax. This version is rewritten around four principles:

  1. Don't promise what the prototype can't visibly prove.
  2. Stage the "make it blue" moment with breath — set-up, command, pause,
     reveal, then land the line.
  3. Don't upstage the climax with three more equal mod demos afterwards.
  4. Tone: warm, confident, slightly reserved. No startup hype, no design-
     review jargon, no "moat" / "deterministic" / "surface area" language.

The flow is unchanged:
  splash → discover → inventory → build → learn → celebrate

Target: ~5:30 at the new TTS rate (Qwen3-TTS Bronya voice via myTTS).
21 segments. Climax (S12) lands around the 2:30 mark.

Segment kinds:
  - "slide" — renders a slide from slides.html (slide index is 1-based).
  - "proto" — drives the live React app served from ../../dist via Playwright.
    `view` resets state (localStorage + URL flag) to a known stage. `choreo`
    runs a step-by-step script timed to the narration.

Voice for narration:
  Generated locally with myTTS — see build_video.py `say_to_wav()`.
  Falls back to macOS `say` if myTTS is missing (only for emergency rebuilds).

Driving voice mods in the recorded prototype:
  Web Speech API doesn't run in headless Chromium. BuildScreen exposes a
  test hook `window.__bb__.voice("text")` only when the URL has `?demo=1`.
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
    # OPENING SLIDES — frame the problem (S01–S04, ~55s)
    # Trimmed copy + softer claims. Slide 1 fixes the "30 minutes" stat
    # the previous draft pulled out of thin air.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S01", "kind": "slide", "slide": 1,
        "text": (
            "A six-year-old tips a pile of bricks onto the floor. "
            "A hundred shapes, a hundred colors, no idea what to build. "
            "Twenty minutes later the booklet is upside-down, "
            "the build has stalled, and the fun has turned into quiet frustration."
        ),
    },
    {
        "id": "S02", "kind": "slide", "slide": 2,
        "text": (
            "The problem is not the bricks. It is the paper manual. "
            "It cannot see what bricks are on the floor, "
            "answer a question, "
            "or adapt when a child changes their mind."
        ),
    },
    {
        "id": "S03", "kind": "slide", "slide": 3,
        "text": (
            "Meet BrickBuddy. An AI building companion for six- to eight-year-olds. "
            "Show it the pile, pick a build, "
            "then change colors, parts, and instructions by voice or tap — "
            "and the manual stays in sync."
        ),
    },
    {
        "id": "S04", "kind": "slide", "slide": 4,
        "text": (
            "One simple path. Discover, inventory, build, learn, celebrate. "
            "Voice or a single tap does the heavy lifting. "
            "Here is the live prototype, end to end."
        ),
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — splash (S05, brief)
    # Cut "surface area" / "promise in five words" jargon.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S05", "kind": "proto", "view": "splash",
        "caption": "SPLASH",
        "text": (
            "The home screen gives the child one job. "
            "Show Buddy the bricks."
        ),
        "choreo": [("wait", 4.0)],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — discover (S06–S08, ~40s)
    # Soft-pedal the camera since we don't actually run vision in this take.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S06", "kind": "proto", "view": "discover",
        "caption": "DISCOVER",
        "text": (
            "On Discover there is one main action — scan my pile — "
            "and two secondary doors: tell Buddy out loud, or just browse a starter build. "
            "The product never asks a six-year-old to fill in a text box."
        ),
        "choreo": [("wait", 6.0)],
    },
    {
        "id": "S07", "kind": "proto", "view": "discover",
        "caption": "DISCOVER · VOICE",
        "text": (
            "Voice runs through the browser's Web Speech API. "
            "The child speaks, BrickBuddy parses the spoken command into a build edit. "
            "No app install, no extra setup."
        ),
        "choreo": [
            ("click_text", "Tell Buddy"),
            ("wait", 4.0),
            ("click_text", "Cancel"),
            ("wait", 0.6),
        ],
    },
    {
        "id": "S08", "kind": "proto", "view": "discover",
        "caption": "DISCOVER · PRESET FOR THIS TAKE",
        "text": (
            "To keep this recording deterministic, "
            "we will skip the camera and use a preset pile. "
            "The rest of the flow is the same."
        ),
        "choreo": [
            ("click_text", "Just browse"),
            ("wait", 1.2),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — inventory (S09–S10, ~32s)
    # Dropped "exactly what the child has on the floor" overclaim.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S09", "kind": "proto", "view": "inventory_fresh",
        "caption": "INVENTORY · LIVE SCAN",
        "text": (
            "A scanning sweep crosses the pile. "
            "One row at a time, the inventory pops in: "
            "sixty-seven bricks across nine shapes, with color and count "
            "exposed like a receipt."
        ),
        "choreo": [("wait", 7.0)],
    },
    {
        "id": "S10", "kind": "proto", "view": "inventory_results",
        "caption": "INVENTORY · BUDDY'S PICKS",
        "text": (
            "Three matched recommendations slide in. "
            "Each card cites the bricks in the inventory — "
            "twelve red two-by-twos, eighteen blue plates, six wheels — "
            "and ranks the build by fit. "
            "We will pick the Robot Dog."
        ),
        "choreo": [
            ("wait", 6.0),
            ("click_text", "Robot Dog"),
            ("wait", 0.4),
            ("click_text", "Build this"),
            ("wait", 1.5),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — build (S11 setup, S12 climax, S13/S14 secondary, S15 closer)
    # The climax is rewritten around BREATHING ROOM. Short sentences. Pauses.
    # S13/S14 are tightened so they don't compete with S12.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S11", "kind": "proto", "view": "build_step0",
        "caption": "BUILD · 3D + LIVE MANUAL",
        "text": (
            "Here is the core screen. "
            "On the left, the 3D dog grows brick by brick. "
            "On the right, a paper-textured manual: "
            "the current step on one page, the running list of changes on the other. "
            "Right now the build is red. "
            "Watch the manual when the child changes it."
        ),
        "choreo": [("wait", 11.0)],
    },
    {
        # The climax. Setup is in S11. Here we let silence + visual change do
        # the heavy lifting. Three short beats, separated by trailing periods
        # so the TTS naturally inserts breath.
        "id": "S12", "kind": "proto", "view": "build_step3",
        "caption": "BUILD · \"MAKE IT BLUE\"",
        "text": (
            "The child says, make it blue. "
            "The 3D dog changes first. "
            "Then the manual changes with it. "
            "Step text. Piece counts. Color swatches. "
            "On the right page, Buddy stamps the edit: red to blue. "
            "That is the thing paper can never do."
        ),
        "choreo": [
            ("wait", 1.5),
            ("eval", "window.__bb__ && window.__bb__.voice('make it blue')"),
            ("wait", 9.0),
        ],
    },
    {
        # Tightened: drop the alias claim (we don't visibly prove it).
        "id": "S13", "kind": "proto", "view": "build_step5",
        "caption": "BUILD · REGION VOICE",
        "text": (
            "The same engine can scope a change to one region. "
            "Make the head purple, "
            "and only the head changes. "
            "Body, legs, and tail stay exactly as they were."
        ),
        "choreo": [
            ("wait", 1.5),
            ("eval", "window.__bb__ && window.__bb__.voice('make the head purple')"),
            ("wait", 6.0),
        ],
    },
    {
        # Reframed: it's about precision, not "voice can't reach".
        "id": "S14", "kind": "proto", "view": "build_step3",
        "caption": "BUILD · TAP TO EDIT ONE BRICK",
        "text": (
            "For precision, pointing is faster than talking. "
            "Tap the orange button, pick a brick, choose a swatch — "
            "BrickBuddy updates that single piece, "
            "and the manual logs the edit on the right page."
        ),
        "choreo": [
            ("wait", 0.8),
            ("click_text", "Tap to Edit"),
            ("wait", 1.5),
            ("eval", "window.__bb__ && window.__bb__.tap('#1F2937', '#E14F3B')"),
            ("wait", 5.0),
            ("click_text", "Tap a Brick"),
            ("wait", 0.6),
        ],
    },
    {
        # Reframed: "preset structural changes" instead of "rebuild geometry"
        # / "any robot the child asks for". Honest about scope.
        "id": "S15", "kind": "proto", "view": "build_step7",
        "caption": "BUILD · STRUCTURAL CHANGE",
        "text": (
            "The same engine handles preset structural changes too. "
            "Say add wings — "
            "BrickBuddy adds a final step to the manual, "
            "and the 3D model grows the new parts."
        ),
        "choreo": [
            ("wait", 1.0),
            ("eval", "window.__bb__ && window.__bb__.voice('add wings')"),
            ("wait", 7.0),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — learn (S16–S17, ~24s)
    # Dropped "five tabs dive deeper" since we'd contradicted "zero menus".
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S16", "kind": "proto", "view": "learn",
        "caption": "LEARN",
        "text": (
            "After building, the session pivots from making to learning. "
            "BrickBuddy turns the model into a lesson — "
            "stability, levers, sound, symmetry, measurement — "
            "all tied to the pieces the child just placed."
        ),
        "choreo": [
            ("wait", 5.5),
            ("click_text", "Engineering"),
            ("wait", 2.0),
            ("click_text", "Math"),
            ("wait", 1.5),
        ],
    },
    {
        "id": "S17", "kind": "proto", "view": "learn",
        "caption": "LEARN · QUICK QUIZ",
        "text": (
            "A two-question quiz closes the learning stage. "
            "Right answers unlock an achievement. "
            "Wrong answers bring a friendlier explanation, and another try."
        ),
        "choreo": [
            ("click_text", "To stay balanced"),
            ("wait", 2.5),
            ("click_text", "Focus sound"),
            ("wait", 2.5),
        ],
    },

    # ═════════════════════════════════════════════════════════════════════
    # LIVE PROTOTYPE — celebrate (S18, ~12s)
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S18", "kind": "proto", "view": "celebrate",
        "caption": "CELEBRATE",
        "text": (
            "Every session ends here. "
            "Confetti, a rotating 3D trophy, a build report, "
            "and a printable certificate to put on the fridge."
        ),
        "choreo": [("wait", 8.0)],
    },

    # ═════════════════════════════════════════════════════════════════════
    # CLOSING SLIDES — three pillars + team + ask (S19–S21, ~45s)
    # Slide 5 is now three pillars instead of six cards. Slide 6 has a real
    # ask + QR. Bios are shorter.
    # ═════════════════════════════════════════════════════════════════════
    {
        "id": "S19", "kind": "slide", "slide": 5,
        "text": (
            "Three things make this prototype practical. "
            "First, one shared engine keeps the model and manual in sync. "
            "Second, brick data is declarative — inventory, steps, and rendering "
            "all read from the same source. "
            "Third, it runs as a single web page on Cloudflare's edge. "
            "No install, no app store, no sign-up."
        ),
    },
    {
        "id": "S20", "kind": "slide", "slide": 6,
        "text": (
            "BrickBuddy is a CMAA5043 final project by Yusong Huang and Jiayi Huang. "
            "Yusong led the implementation: every screen, the 3D pipeline, "
            "the mutation engine, and the deployment. "
            "Jiayi led the original concept, the user research with children, "
            "and the demo materials."
        ),
    },
    {
        "id": "S21", "kind": "slide", "slide": 6,
        "text": (
            "The prototype is live on Cloudflare's edge. "
            "Scan the code, try it in any browser, "
            "and come find us at the CMA exhibition. "
            "Thanks for watching."
        ),
    },
]
