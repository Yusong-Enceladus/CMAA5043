# BrickBuddy demo — investor video, control scripts & poster

Final-submission deliverables for the CMAA5043 final project (May 20).
Everything in this folder is reproducible — fonts, narration, slide deck, the
choreographed run-through of the live prototype, and the print-ready poster.

```
demo/
  video/
    BrickBuddy_investor_demo.mp4    — ~6:00 · 1600×900 · H.264
    build/
      segments.py        — locked narration script (21 segments)
      slides.html        — 6-slide pitch deck (build/slides/)
      build_video.py     — Playwright + macOS-say + ffmpeg orchestrator
      audio/  slides/  tmp/  video/   (intermediate artifacts)
  poster/
    poster.html              — A4 source
    BrickBuddy_poster.png    — 794×1123 @ 2× (handout / projection)
    BrickBuddy_poster.pdf    — print-ready A4 with vectors
    qr.png                   — QR pointing at the live deploy
  README.md                  — this file
```

---

## What the video shows

The demo is paced like a roadshow pitch — opening slides frame the
problem, the live prototype is driven through every screen, and closing
slides land the design decisions and the team. Total runtime ≈ 6 min.

| Time | Segment | Stage / slide | What you see |
| ---- | ------- | ------------- | ------------ |
| 0:00 | S01 | Slide 1 | A pile of bricks, no idea — the framing problem |
| 0:18 | S02 | Slide 2 | Why the booklet fails — one-way paper |
| 0:35 | S03 | Slide 3 | BrickBuddy reveal — the patient AI tutor |
| 0:55 | S04 | Slide 4 | Tour preview — five screens, zero menus |
| 1:10 | S05 | Splash | The home screen + four-feature strip |
| 1:24 | S06 | Discover | Camera-first hero, three doors |
| 1:35 | S07 | Discover · voice | "Tell Buddy" — Web Speech API transcript |
| 1:50 | S08 | Discover · browse | Skip the camera, pick a build |
| 2:00 | S09 | Inventory · scan | Animated reveal — 67 bricks, 9 kinds |
| 2:18 | S10 | Inventory · picks | Three matched recommendations, citations |
| 2:38 | S11 | **Build** · 3D + manual | The two-up: 3D viewer ↔ paper manual |
| 2:55 | S12 | **Build** · "make it blue" | **The killer moment — manual rewrites itself** |
| 3:15 | S13 | **Build** · "make the head purple" | Region-scoped voice |
| 3:30 | S14 | **Build** · tap to edit | Fine-grained per-brick edit |
| 3:48 | S15 | **Build** · "add wings" | Structural mutation, page-flip lands the kid |
| 4:08 | S16 | Learn · STEAM tabs | Five tabs, model-specific facts |
| 4:25 | S17 | Learn · quiz | Two questions — answers lock in achievements |
| 4:40 | S18 | Celebrate | Confetti, trophy, build report, certificate |
| 4:55 | S19 | Slide 5 | Six design decisions — the moat is the stack |
| 5:25 | S20 | Slide 6 | The team — Yusong + Jiayi |
| 5:50 | S21 | Slide 6 | The ask — try it live, thanks for watching |

The **showpiece** is segments S11–S15: the build screen demonstrates that
voice ("make it blue"), region voice ("make the head purple"), tap-to-edit
single bricks, and structural ("add wings") all flow through the same
mutation engine — and **the printed manual rewrites itself** in real time
on every change. That moment is what turns a 3D LEGO viewer into a
genuinely new product category.

---

## How the video is made

1. **TTS** — every segment in `segments.py` is rendered to a WAV with macOS
   `say` (Samantha, 140 wpm, `[[slnc N]]` pauses between sentences). Provider
   is swappable: edit `say_to_wav()` in `build_video.py` to route through
   ElevenLabs / Cartesia / etc.
2. **Record** — Playwright drives two targets:
   - `slides.html?slide=N` on `http://127.0.0.1:9011` for pitch slides
   - the **production** React bundle (`../../dist`) on `http://127.0.0.1:5184`
     for live prototype segments. Each segment seeds state via
     `?demo=1` + the test hooks (`window.__bbDev__`, `window.__bb__`) and
     runs a step-by-step choreography timed to the narration.
3. **Mux** — per-segment audio + video are merged with ffmpeg
   (libx264 via `/opt/homebrew/bin/ffmpeg`; the conda ffmpeg lacks x264
   and is skipped automatically).
4. **Concat** — all 21 `seg_SXX.mp4` files are joined into the final output.

### Why the production bundle and not Vite dev?

`@react-three/fiber` v9 + React 19 + Vite's dev-mode CJS/ESM shim for
`use-sync-external-store` don't play nicely in headless Chromium — the
3D viewer mounts but never enters the animation loop. The built bundle
resolves all modules at build time and works headless out of the box.

### How voice mods get triggered headless

The Web Speech API does not run in headless Chromium, and the redesigned
build screen has no chat input box. So `BuildScreen.jsx` exposes a small
test hook on `window.__bb__` whenever the URL has `?demo=1`:

```js
window.__bb__ = {
  voice: (text) => handleVoiceCommand(text),
  tap:   (colorFilter, toHex) => /* select a part + apply recolor */,
};
```

The recorder navigates to `http://127.0.0.1:5184/?demo=1` and calls these
hooks at the right moment. The hook is **identical** to what a real voice
transcript would do — same `applyTextMutation()` pipeline, same model +
log update, same UI animations.

The hook stays out of the public production runtime: without `?demo=1`
the effect bails out and `window.__bb__` is never set. The dev-only sister
hook `window.__bbDev__` (used to seed the inventory / jump stages) follows
the same gate.

---

## Re-rendering the whole video

```bash
cd "Final Project/brickbuddy"
npm run build                       # produces dist/ — required, not optional

cd demo/video/build
python3 -m playwright install chromium   # one-off
python3 build_video.py              # ~9 min, writes ../BrickBuddy_investor_demo.mp4
```

The build script serves both `slides/` and `../../dist/` itself — don't also
run `npm run dev` in another terminal.

### Re-rendering only a few segments

`segments.py` is a plain list. To regenerate only the ones you've edited:

```python
from segments import SEGMENTS
import build_video
build_video.SEGMENTS = [s for s in SEGMENTS if s["id"] in ("S12", "S13")]
build_video.FINAL = build_video.ROOT.parent / "BrickBuddy_patch.mp4"
build_video.main()
```

Audio is cached on disk — segments whose text didn't change are not
re-rendered through TTS, so iteration on the choreography is fast.

### Editing the slide deck

`build/slides/slides.html` is a single static HTML file with six sections.
Pass `?slide=N` to scope which slide is visible. Use a normal browser to
preview — the fonts and animations match exactly what gets recorded.

### Editing the prototype

The redesigned source lives in `Final Project/brickbuddy/src/`:

- `components/{Splash,Discover,Inventory,Build,Learn,Celebrate}Screen.jsx` — stages
- `design/{Manual,ActionDock,BrickEditMenu,Buddy,UI}.jsx` — design system
- `services/mutationEngine.js` — voice/tap → model + log entry
- `services/{localRobotGen,proceduralBuilder,colorNames,imageAnalyzer}.js` — the local engines
- `data/{models,mockInventory}.js` — declarative model + pile data
- `context/BuildContext.jsx` — global session state

After any source change, **rebuild dist/** before re-rendering — the demo
script reads from `../../dist`, not from Vite.

---

## Re-rendering the poster

The poster is a single A4 HTML file. Re-export with Playwright:

```bash
cd "Final Project/brickbuddy/demo/poster"
python3 - <<'PY'
from playwright.sync_api import sync_playwright
import pathlib
HTML = pathlib.Path("poster.html").resolve()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 794, "height": 1123}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(f"file://{HTML}", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.screenshot(path="BrickBuddy_poster.png", clip={"x":0,"y":0,"width":794,"height":1123})
    page.pdf(path="BrickBuddy_poster.pdf", format="A4", print_background=True,
             margin={"top":"0","right":"0","bottom":"0","left":"0"})
    b.close()
PY
```

The QR is regenerated via `python -m qrcode` (or any QR library); see git
history for the exact one-liner if it needs to be re-pointed at a different
URL.

---

## Authorship

- **Yusong Huang** — engineered every screen, the live mutation engine,
  the 3D pipeline, the Cloudflare edge deploy, and produced the demo
  video, slide deck, poster, and this README.
- **Jiayi Huang** — contributed the original BrickBuddy concept, the user
  research with children aged 6–8, and co-produced the demo materials.
