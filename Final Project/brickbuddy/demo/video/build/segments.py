"""
Locked narration script + autopilot choreography for the BrickBuddy
investor demo (iteration 3).

The previous draft (iteration 2) used 21 separate Playwright contexts —
one per segment — and stitched the resulting clips. The audio was
generated sentence by sentence, so the Bronya voice had a stutter at every
period, and the visible prototype "interaction" was actually 14 fresh
page-loads with no continuity.

Iteration 3 fixes both:

1. **Slides stay segment-based.** Each slide is its own clip with its own
   TTS call — the visual cuts are intentional and the narration breaks
   align with them.

2. **The prototype is ONE continuous Playwright session.** A single
   browser context loads the app at `?demo=1` and the autopilot drives
   it through the full flow over ~3 minutes — no reloads, no fresh
   contexts, smooth transitions. Voice input visibly streams in
   word-by-word (via the speech mock); the camera shows a synthesised
   brick-pile preview; the manual rewrites itself in real time.

3. **TTS is rendered per-scene** (a few sentences per call) instead of
   per-sentence, so Bronya's prosody stays continuous within a beat.

4. **Burned-in subtitles** sync with the audio — line breaks come from
   sentence boundaries; timestamps are computed from per-scene WAV
   durations and a word-share split.

Total target: ~5:00 with breath. Climax (S12 'make it blue') lands at
~2:40. The autopilot's choreography list defines every action with an
absolute timestamp inside the proto recording.

Segment kinds:
  - "slide"     — renders slide N from slides.html, separate clip.
  - "autopilot" — ONE continuous proto recording driven by `actions`.
                  `actions` is a list of (offset_s, kind, *args) tuples
                  executed in order. The autopilot keeps the page alive
                  for `duration_s` seconds total.

Autopilot action kinds:
  ("click_text", "Robot Dog")               — click first <button>/<role=button>
                                               whose text contains the substring.
  ("eval", js)                              — evaluate raw JS in the page.
  ("speak", "make it blue", duration_ms)    — run window.__bb__.speak so the
                                               listening UI streams in the
                                               transcript word-by-word and
                                               then fires the mutation.
  ("set_stage", "discover")                 — jump via window.__bbDev__.setStage.
  ("set_inventory", inv_dict)               — seed the inventory.
  ("select_model", "dog")                   — call window.__bbDev__.selectModel.
  ("type_into", selector, text, ms)         — fire React-friendly value setter.

Subtitle generation: each segment carries a `text` field. For autopilot
segments the `text` is split into "lines" — multi-line strings — that get
SRT entries with timestamps interpolated linearly across the segment's
duration in the final video.
"""

# ─────────────────────────── narration utility ───────────────────────────
# A scene is a list of sentences that get rendered as a single TTS call
# but split into multiple SRT entries.

# ─────────────────────────── opening slides ───────────────────────────
OPENING = [
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
            "answer a question, or adapt when a child changes their mind."
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
]

# ─────────────────────────── continuous prototype demo ───────────────────────────
# The autopilot is one Playwright session that drives the entire prototype
# over ~3 minutes. The narration is delivered as ONE continuous Bronya
# track so the prosody flows naturally across the whole walk-through.
# Subtitles split by sentence; choreography actions fire at timed offsets.
#
# Choreography is intentionally generous on dwell — each beat gives the
# viewer a moment to see what changed before the narrator moves on.

PROTO_NARRATION_LINES = [
    # ── Splash + Discover (~0–22s) ──
    "The home screen gives the child one job: show Buddy the bricks.",
    "Tap Let's Build, and the Discover screen opens.",
    "There's one main action — scan my pile — and two secondary doors.",
    "The product never asks a six-year-old to fill in a text box.",
    # ── Inventory (~22–44s) ──
    "We'll tell Buddy out loud what we have.",
    "A scanning sweep crosses the pile. One row at a time, the inventory pops in.",
    "Sixty-seven bricks across nine shapes, with color and count surfaced like a receipt.",
    "Three matched recommendations slide in — each citing the bricks the kid actually has.",
    "We'll pick the Robot Dog.",
    # ── Build setup (~44–60s) ──
    "Here is the core screen.",
    "On the left, the 3D dog grows brick by brick.",
    "On the right, a paper-textured manual.",
    "The current step on one page, the running list of changes on the other.",
    # ── S12 climax — make it blue (~60–82s) ──
    "Right now the build is red. Watch the manual when the child changes it.",
    "The child says: make it blue.",
    "The 3D dog changes first. Then the manual changes with it.",
    "Step text. Piece counts. Color swatches.",
    "On the right page, Buddy stamps the edit: red to blue.",
    "That is the thing paper can never do.",
    # ── S13 region voice (~82–104s) ──
    "Voice isn't all-or-nothing.",
    "Make the head purple — and only the head changes.",
    "Body, legs, and tail stay exactly as they were.",
    # ── S14 tap-to-edit (~104–124s) ──
    "For precision, pointing is faster than talking.",
    "Tap the orange button, pick a brick, choose a swatch.",
    "BrickBuddy updates that single piece, and the manual logs the edit.",
    # ── S15 add wings (~124–144s) ──
    "The same engine handles preset structural changes too.",
    "Say: add wings.",
    "BrickBuddy adds a final step to the manual, and the 3D model grows the new parts.",
    # ── Learn (~144–168s) ──
    "After building, the session pivots from making to learning.",
    "BrickBuddy turns the model into a lesson — stability, levers, sound, symmetry, and measurement.",
    "All tied to the pieces the child just placed.",
    "A two-question quiz closes the learning stage.",
    "Right answers unlock an achievement. Wrong answers bring a friendlier explanation.",
    # ── Celebrate (~168–180s) ──
    "Every session ends here.",
    "Confetti, a rotating 3D trophy, a build report, and a printable certificate to put on the fridge.",
]

# Choreography — (offset_s, kind, *args). The autopilot replays this
# exactly during the recording. The schedule is tuned so each beat lands
# under the matching narration line; PROTO audio is ~96s, visual ends at
# ~106s with a 10s tail so the celebrate confetti has room to breathe.
#
# Dwell is implicit (the gap to the next action), no explicit "wait"
# entries needed.
PROTO_ACTIONS = [
    # ── Splash → Discover (audio: "home screen ... Let's Build" ~0–6s) ──
    (0.4,  "set_stage", "splash"),
    (4.0,  "click_text", "Let's Build"),

    # ── Discover idle (audio: "one main action ... never asks ... fill in
    #     a text box" ~6–14s). Click Tell Buddy briefly to show the voice
    #     card animating in, run a tiny mock transcript so the listening
    #     ribbon visibly types ("scan my pile please"), then cancel and
    #     pick the deterministic Browse path. ──
    (8.5,  "click_text", "Tell Buddy"),
    (10.0, "speak_mock", "scan my pile please", 2200),
    (13.0, "click_text", "Cancel"),

    # ── Just browse → Inventory (audio: "tell Buddy out loud" line bridges
    #     into the scan ~14–18s). Inventory mounts, scan animation plays
    #     automatically (~2.4s), recommendations slide in. ──
    (14.5, "click_text", "Just browse"),

    # ── Inventory results visible by ~20s. Pick Robot Dog at ~26s — that
    #     leaves time for the recommendation cards to land on screen. ──
    (26.0, "click_text", "Robot Dog"),
    (26.7, "click_text", "Build this"),

    # ── Build mounts ~28s. Audio: "Here is the core screen ... brick by
    #     brick ... paper-textured manual ... running list of changes" up
    #     to ~38s. Hold the initial state so the viewer reads the layout. ──
    (28.5, "noop", "Build mounts"),

    # ── S12 climax: "make it blue" lands at ~40s (right when narration
    #     hits "the child says: make it blue"). ──
    (40.0, "speak", "make it blue", 2400),

    # ── Step forward to the head step so S13 visibly recolors only the
    #     head. 5 quick advances starting at ~50s. ──
    (50.0, "click_text", "Next"),
    (50.8, "click_text", "Next"),
    (51.6, "click_text", "Next"),
    (52.4, "click_text", "Next"),
    (53.2, "click_text", "Next"),

    # ── S13 region voice: "make the head purple" at ~57s. ──
    (57.0, "speak", "make the head purple", 2300),

    # ── S14 tap-to-edit at ~67s. Open menu, recolor a single black brick. ──
    (67.0, "click_text", "Tap to Edit"),
    (69.0, "eval_tap", "#1F2937", "#E14F3B"),
    (74.0, "click_text", "Tap a Brick"),  # exit tap mode

    # ── S15 add wings at ~77s. Page-flips to a new step, wings appear. ──
    (77.0, "speak", "add wings", 2200),

    # ── Click Finish → Learn at ~85s. Tabs + quiz march through quickly. ──
    (85.5, "click_text", "Finish"),
    (88.0, "click_text", "Engineering"),
    (89.5, "click_text", "Math"),
    (91.0, "click_text", "Art"),

    # ── Quiz answers (one shot each). ──
    (93.0, "click_text", "To stay balanced"),
    (95.0, "click_text", "Focus sound"),

    # ── Celebrate at ~98s — confetti + 3D trophy + build report. The
    #     visual continues running while the narration wraps up. ──
    (98.0, "click_text", "Celebrate"),
]

# Visual stays on screen ~10s longer than the audio so the confetti +
# celebrate report have room to breathe before the closing slide.
PROTO_DURATION_S = 108.0

PROTO = {
    "id": "PROTO", "kind": "autopilot",
    "narration_lines": PROTO_NARRATION_LINES,
    "actions": PROTO_ACTIONS,
    "duration_s": PROTO_DURATION_S,
}

# ─────────────────────────── closing slides ───────────────────────────
CLOSING = [
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

# Final assembly. SEGMENTS is the canonical list — opening slides, the
# continuous proto recording, then closing slides. build_video.py iterates
# over it.
SEGMENTS = [*OPENING, PROTO, *CLOSING]
