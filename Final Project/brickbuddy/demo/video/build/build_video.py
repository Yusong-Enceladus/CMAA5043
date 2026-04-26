#!/usr/bin/env python3
"""
BrickBuddy investor demo — master orchestrator.

Pipeline:
  1. Generate per-segment TTS narration (macOS `say` · Samantha @ 140 wpm).
     Swap TTS_VOICE/TTS_RATE + say_to_wav() for ElevenLabs when we have a key.
  2. Start a local HTTP server for the slide deck on 9011. The BrickBuddy
     dev server is expected to already be running on 5183 (`npm run dev`
     from Final Project/brickbuddy, one terminal over).
  3. For each segment, drive the right target with Playwright and record a
     video at the narration's duration plus a small tail hold.
  4. Mux audio + video per segment, trim the pre-load padding, crossfade
     caption on / off.
  5. Concat all per-segment MP4s into the final output.

Output:
  ../BrickBuddy_investor_demo.mp4   (relative to this script)

Run:
  cd "Final Project/brickbuddy/demo/video/build"
  python3 build_video.py

Prereqs:
  pip install playwright
  python3 -m playwright install chromium
  brew install ffmpeg
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import socketserver
import subprocess
import threading
import time
import http.server

from playwright.sync_api import sync_playwright

from segments import SEGMENTS

ROOT = pathlib.Path(__file__).parent.resolve()
SLIDES_DIR = ROOT / "slides"
AUDIO_DIR = ROOT / "audio"
VIDEO_DIR = ROOT / "video"
TMP_DIR = ROOT / "tmp"
FINAL = ROOT.parent / "BrickBuddy_investor_demo.mp4"

for d in (AUDIO_DIR, VIDEO_DIR, TMP_DIR):
    d.mkdir(exist_ok=True, parents=True)

# Homebrew's ffmpeg ships libx264; miniconda's ffmpeg does not. Prefer brew's
# toolchain when present so the encoder string in mux() stays consistent.
_BREW_FFMPEG = "/opt/homebrew/bin/ffmpeg"
_BREW_FFPROBE = "/opt/homebrew/bin/ffprobe"
FFMPEG = _BREW_FFMPEG if pathlib.Path(_BREW_FFMPEG).exists() else "ffmpeg"
FFPROBE = _BREW_FFPROBE if pathlib.Path(_BREW_FFPROBE).exists() else "ffprobe"

# ---------------------------------------------------------------- config ---
VIEWPORT = (1600, 900)
FPS = 30
PAD_SLIDE = 1.2   # sec of dead time to trim off the front of slide recordings
PAD_PROTO = 2.2   # React + HMR needs a bit more time to paint
TAIL_HOLD = 0.80  # extra video hold after narration so scenes breathe
HEAD_HOLD = 0.40  # pre-roll silence before narration starts
TTS_VOICE = "Samantha"
TTS_RATE = 140
SENTENCE_PAUSE = 380  # ms [[slnc N]] inserted between sentences
PORT_SLIDES = 9011
# Record against the PRODUCTION bundle (served from ../../dist) rather than
# the Vite dev server. Vite HMR does weird things to R3F's zustand store in
# Playwright's headless Chromium; the built bundle is fully static and works.
#
# Prereqs (one-off):
#   cd "Final Project/brickbuddy" && npm run build
# The script will serve dist/ on PORT_PROTO automatically.
PORT_PROTO = 5184
# `?demo=1` opens the demo-only window hooks (`__bb__.voice`, `__bbDev__.*`)
# in the production bundle. Without it the hooks stay invisible to the
# public deploy. See BuildScreen.jsx + BuildContext.jsx for the gate.
PROTO_URL = f"http://127.0.0.1:{PORT_PROTO}/?demo=1"
DIST_DIR = ROOT.parent.parent.parent / "dist"

# ---------------------------------------------------------------- helpers ---
def sh(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"\n!! command failed: {' '.join(str(x) for x in cmd)}\n   stderr:\n{r.stderr}\n")
        raise subprocess.CalledProcessError(r.returncode, cmd, r.stdout, r.stderr)
    return r


def probe_duration(path):
    r = sh([FFPROBE, "-v", "error", "-show_entries", "format=duration",
            "-of", "json", str(path)])
    return float(json.loads(r.stdout)["format"]["duration"])


def prep_tts_text(text):
    """Insert [[slnc N]] pauses between sentences so Samantha breathes."""
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    pause = f"[[slnc {SENTENCE_PAUSE}]]"
    return f" {pause} ".join(p for p in parts if p)


def say_to_wav(text, wav_path):
    """Render narration to a WAV with HEAD_HOLD seconds of silence prepended."""
    aiff = wav_path.with_suffix(".aiff")
    tts_text = prep_tts_text(text)
    subprocess.run(
        ["say", "-v", TTS_VOICE, "-r", str(TTS_RATE), "-o", str(aiff), tts_text],
        check=True,
    )
    sh(["ffmpeg", "-y", "-loglevel", "error",
        "-f", "lavfi", "-t", f"{HEAD_HOLD:.3f}", "-i", "anullsrc=r=44100:cl=stereo",
        "-i", str(aiff),
        "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[a]",
        "-map", "[a]", "-ar", "44100", "-ac", "2", str(wav_path)])
    aiff.unlink(missing_ok=True)


def start_server(dir_, port):
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(dir_), **k)
        def log_message(self, *a, **k):
            pass

    class S(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    def run():
        try:
            with S(("127.0.0.1", port), H) as s:
                s.serve_forever()
        except OSError as e:
            print(f"  [warn] port {port}: {e}")

    threading.Thread(target=run, daemon=True).start()
    time.sleep(0.4)


# ------------------------------------------------------ caption injection ---
CAPTION_CSS = """
  #__caption {
    position: fixed !important; left: 50% !important; bottom: 28px !important;
    transform: translateX(-50%) translateZ(0) !important;
    will-change: transform; isolation: isolate;
    padding: 14px 32px;
    background: rgba(26,20,16,0.94);
    border: 1px solid rgba(225,79,59,0.42);
    border-radius: 999px;
    font: 600 13px/1.4 "JetBrains Mono", ui-monospace, monospace;
    letter-spacing: .26em; color: #FFF6EC; text-transform: uppercase;
    z-index: 2147483647 !important;
    box-shadow: 0 20px 60px rgba(0,0,0,.55),
                0 0 0 1px rgba(225,79,59,0.18),
                0 0 32px -8px rgba(225,79,59,0.35);
    animation: __capin .30s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes __capin {
    from { opacity: 0; transform: translateX(-50%) translateZ(0) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateZ(0); }
  }
"""

def inject_caption_css(page):
    page.evaluate(f"""
      (() => {{
        if (document.getElementById('__caption_style')) return;
        const s = document.createElement('style');
        s.id = '__caption_style';
        s.textContent = {json.dumps(CAPTION_CSS)};
        document.head.appendChild(s);
      }})();
    """)

def set_caption(page, text):
    inject_caption_css(page)
    page.evaluate("""
      (txt) => {
        let el = document.getElementById('__caption');
        if (!el) {
          el = document.createElement('div');
          el.id = '__caption';
          document.body.appendChild(el);
        }
        el.textContent = txt;
      }
    """, text or "")


def clear_caption(page):
    page.evaluate("""
      () => {
        const el = document.getElementById('__caption');
        if (el) el.remove();
      }
    """)


# ---------------------------------------------------- view state seeding ---
# Two flavours of stage:
#   - PRE-BUILD stages (splash/discover/inventory_*) need NO selected model
#     and NO localStorage seeding. We hard-clear storage, navigate to the
#     route, then drive the UI through the demo `__bbDev__` hooks to land
#     on exactly the stage we want.
#   - BUILD/LEARN/CELEBRATE need a selected model. Seed via __bbDev__ which
#     uses the React state setters directly (no localStorage round-trip),
#     so the page paints in one frame.
#
# Inventory has two sub-views because the screen morphs:
#   - inventory_fresh    — scan animation playing (use this for S09)
#   - inventory_results  — scan complete, recommendations visible (use for S10)
VIEW_STATE = {
    "splash":             {"stage": "splash",    "model": None,  "step": 0, "wait_inventory": False, "wait_for": None},
    "discover":           {"stage": "discover",  "model": None,  "step": 0, "wait_inventory": False, "wait_for": None},
    "inventory_fresh":    {"stage": "inventory", "model": None,  "step": 0, "wait_inventory": True,  "wait_for": "scan"},
    "inventory_results":  {"stage": "inventory", "model": None,  "step": 0, "wait_inventory": True,  "wait_for": "results"},
    "build_step0":        {"stage": "build",     "model": "dog", "step": 0, "wait_inventory": False, "wait_for": None},
    "build_step3":        {"stage": "build",     "model": "dog", "step": 3, "wait_inventory": False, "wait_for": None},
    "build_step5":        {"stage": "build",     "model": "dog", "step": 5, "wait_inventory": False, "wait_for": None},
    "build_step6":        {"stage": "build",     "model": "dog", "step": 6, "wait_inventory": False, "wait_for": None},
    "build_step7":        {"stage": "build",     "model": "dog", "step": 7, "wait_inventory": False, "wait_for": None},
    "learn":              {"stage": "learn",     "model": "dog", "step": 7, "wait_inventory": False, "wait_for": None},
    "celebrate":          {"stage": "celebrate", "model": "dog", "step": 7, "wait_inventory": False, "wait_for": None},
}

# Seeded inventory matches data/mockInventory.js so InventoryScreen renders
# the recommendations immediately (no Discover round-trip). Counts only;
# the screen reads `bricks` and `total` from this object.
_INVENTORY_SEED = {
    "scannedAt": 0,
    "total": 67,
    "bricks": [
        {"id": "red-2x2",    "name": "Red 2×2 brick",    "color": "#E14F3B", "shape": "brick",   "count": 12, "accent": "#B2392A"},
        {"id": "blue-1x4",   "name": "Blue 1×4 plate",   "color": "#3B82F6", "shape": "plate",   "count": 18, "accent": "#1E4FC4"},
        {"id": "yellow-2x4", "name": "Yellow 2×4 brick", "color": "#FBBF24", "shape": "brick",   "count": 8,  "accent": "#D97706"},
        {"id": "green-1x2",  "name": "Green 1×2 brick",  "color": "#10B981", "shape": "brick",   "count": 14, "accent": "#047857"},
        {"id": "orange-slope","name": "Orange slope",    "color": "#F59E0B", "shape": "slope",   "count": 4,  "accent": "#D97706"},
        {"id": "wheel",      "name": "Black wheel",      "color": "#1F2937", "shape": "wheel",   "count": 6,  "accent": "#0B0F18"},
        {"id": "white-eye",  "name": "White round tile", "color": "#F3F4F6", "shape": "tile",    "count": 3,  "accent": "#9CA3AF"},
        {"id": "antenna",    "name": "Antenna piece",    "color": "#6B7280", "shape": "antenna", "count": 1,  "accent": "#1F2937"},
        {"id": "turntable",  "name": "Turntable",        "color": "#FCD34D", "shape": "disk",    "count": 1,  "accent": "#D97706"},
    ],
}


def seed_state(page, view):
    """Set up the app to land on exactly the right stage for a recording.

    Pre-build stages drive through the React `__bbDev__` hooks (which only
    open under `?demo=1`). Build/learn/celebrate seed localStorage so the
    BuildContext rehydrates with a selected model on first paint.
    """
    if view == "keep_state":
        return
    state = VIEW_STATE.get(view)
    if state is None:
        raise RuntimeError(f"unknown view: {view!r}")

    # Always clear and reload so we never inherit the previous segment's state.
    # This also forces the React tree to re-mount (replays entrance animations).
    page.evaluate("() => localStorage.clear()")
    page.goto(PROTO_URL, wait_until="domcontentloaded")
    # Wait for the demo hook to install — it's gated on a useEffect so first
    # paint may not have it yet.
    page.wait_for_function(
        "() => !!window.__bbDev__",
        timeout=5000,
    )

    if state["stage"] == "splash":
        return  # already on splash after fresh load

    if state["stage"] == "discover":
        page.evaluate("() => window.__bbDev__.setStage('discover')")
        page.wait_for_timeout(900)
        return

    if state["stage"] == "inventory":
        # Seed the inventory and jump straight to the screen. The scan
        # animation plays once on mount, takes ~2.4s, then morphs to results.
        page.evaluate(
            "(inv) => { window.__bbDev__.setInventory(inv); window.__bbDev__.setStage('inventory'); }",
            _INVENTORY_SEED,
        )
        if state["wait_for"] == "scan":
            # Catch the scan mid-flight (~half-way through the 2.4s animation).
            page.wait_for_timeout(700)
        else:  # results
            # Wait for scan to complete + recommendations to slide in.
            page.wait_for_timeout(4200)
        return

    if state["model"]:
        # Build/Learn/Celebrate: seed localStorage so BuildContext rehydrates
        # with the right model + step, then reload.
        seed = {
            "stage":           state["stage"],
            "selectedModelId": state["model"],
            "customModel":     None,
            "currentStep":     state["step"],
            "steamProgress":   {"science": 0, "technology": 0, "engineering": 0, "art": 0, "math": 0},
            "buildStartTime":  None,
            "savedAt":         9999999999999,  # avoid 24h expiry
        }
        page.evaluate(
            "(s) => { localStorage.setItem('brickbuddy_session', JSON.stringify(s)); }", seed,
        )
        page.goto(PROTO_URL, wait_until="domcontentloaded")
        # Different stages mount different hooks:
        #   build     → __bb__   (voice/tap pipelines)
        #   learn     → __bbDev__ only (no build-screen-specific hook)
        #   celebrate → __bbDev__ only
        # Always wait for __bbDev__ since it's set by BuildContext on every stage.
        page.wait_for_function("() => !!window.__bbDev__", timeout=8000)
        if state["stage"] == "build":
            page.wait_for_function("() => !!window.__bb__", timeout=5000)
        page.wait_for_timeout(1200)  # R3F first paint + auto-rotate kicks in


# -------------------------------------------------- choreography runner ---
def run_choreo(page, choreo):
    """Execute a segment's action script. Each step is timed to the narration."""
    for step in choreo or []:
        kind = step[0]
        if kind == "wait":
            page.wait_for_timeout(int(step[1] * 1000))
        elif kind == "click":
            try:
                page.click(step[1], timeout=3000)
            except Exception as e:
                print(f"     [click miss] {step[1]}: {e}")
        elif kind == "click_text":
            needle = step[1]
            try:
                page.evaluate(
                    """(txt) => {
                        const btn = [...document.querySelectorAll('button')].find(
                          b => b.textContent.trim().includes(txt)
                        );
                        if (btn) btn.click();
                    }""",
                    needle,
                )
            except Exception as e:
                print(f"     [click_text miss] {needle!r}: {e}")
        elif kind == "type":
            selector, value = step[1], step[2]
            try:
                # force=True bypasses React's disabled-prop check; visible
                # inputs get the value even while the app is processing.
                page.locator(selector).first.fill(value, force=True, timeout=5000)
            except Exception as e:
                # Fallback: set the value directly and fire React's synthetic
                # events so controlled components pick it up.
                try:
                    page.evaluate(
                        """([sel, val]) => {
                           const el = document.querySelector(sel);
                           if (!el) return false;
                           const setter = Object.getOwnPropertyDescriptor(
                             window.HTMLInputElement.prototype, 'value').set;
                           setter.call(el, val);
                           el.dispatchEvent(new Event('input', { bubbles: true }));
                           el.dispatchEvent(new Event('change', { bubbles: true }));
                           el.focus();
                           return true;
                        }""",
                        [selector, value],
                    )
                except Exception as e2:
                    print(f"     [type miss] {selector}: {e} / {e2}")
        elif kind == "press":
            page.keyboard.press(step[1])
        elif kind == "eval":
            try:
                page.evaluate(step[1])
            except Exception as e:
                print(f"     [eval miss]: {e}")
        elif kind == "caption":
            set_caption(page, step[1])
        else:
            print(f"     [unknown choreo step] {step!r}")


# ------------------------------------------------------- per-segment job ---
def record_slide(seg, browser, narration_s):
    """Navigate to slides.html?slide=N and record for the narration's length."""
    ctx = browser.new_context(
        viewport={"width": VIEWPORT[0], "height": VIEWPORT[1]},
        device_scale_factor=1,
        record_video_dir=str(TMP_DIR),
        record_video_size={"width": VIEWPORT[0], "height": VIEWPORT[1]},
    )
    page = ctx.new_page()
    slide_url = f"http://127.0.0.1:{PORT_SLIDES}/slides.html?slide={seg['slide']}"
    page.goto(slide_url, wait_until="domcontentloaded")
    page.wait_for_timeout(int(PAD_SLIDE * 1000))
    page.wait_for_timeout(int((narration_s + TAIL_HOLD) * 1000))
    vid = page.video
    ctx.close()
    raw_path = pathlib.Path(vid.path())
    return raw_path, PAD_SLIDE


def record_proto(seg, browser, narration_s):
    """Drive the live BrickBuddy app through the segment's choreography."""
    ctx = browser.new_context(
        viewport={"width": VIEWPORT[0], "height": VIEWPORT[1]},
        device_scale_factor=1,
        record_video_dir=str(TMP_DIR),
        record_video_size={"width": VIEWPORT[0], "height": VIEWPORT[1]},
        permissions=["microphone", "camera"],
    )
    page = ctx.new_page()
    # First load to get access to localStorage, then seed + reload.
    page.goto(PROTO_URL, wait_until="domcontentloaded")
    seed_state(page, seg["view"])
    if seg.get("caption"):
        set_caption(page, seg["caption"])
    page.wait_for_timeout(int(PAD_PROTO * 1000))
    # Run choreo concurrently with narration. The script inside `choreo`
    # already has `wait` steps timed against the narration's pace.
    start = time.time()
    run_choreo(page, seg.get("choreo"))
    elapsed = time.time() - start
    remaining = narration_s + TAIL_HOLD - elapsed
    if remaining > 0:
        page.wait_for_timeout(int(remaining * 1000))
    vid = page.video
    ctx.close()
    raw_path = pathlib.Path(vid.path())
    return raw_path, PAD_PROTO


# ----------------------------------------------------- mux per-segment ---
def mux(raw_video, wav, pad_s, narration_s, out_path):
    """Trim the pre-load padding and mux audio over video."""
    total = narration_s + HEAD_HOLD + TAIL_HOLD
    cmd = [
        FFMPEG, "-y", "-loglevel", "error",
        "-ss", f"{pad_s:.3f}", "-i", str(raw_video),
        "-i", str(wav),
        "-t", f"{total:.3f}",
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        "-r", str(FPS), "-vsync", "cfr",
        str(out_path),
    ]
    sh(cmd)


# ------------------------------------------------------------ concat all ---
def concat(segments_mp4s, out_path):
    listfile = TMP_DIR / "concat.txt"
    listfile.write_text("".join(f"file '{p}'\n" for p in segments_mp4s))
    sh(["ffmpeg", "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", str(listfile),
        "-c", "copy", "-movflags", "+faststart",
        str(out_path)])


# ============================================================== main ====
def main():
    print("▸ BrickBuddy investor demo — building")
    if not DIST_DIR.exists():
        raise SystemExit(
            f"!! Production bundle not found at {DIST_DIR}\n"
            f"   Run: cd 'Final Project/brickbuddy' && npm run build"
        )
    start_server(SLIDES_DIR, PORT_SLIDES)
    start_server(DIST_DIR,   PORT_PROTO)
    print(f"  slides: http://127.0.0.1:{PORT_SLIDES}/slides.html")
    print(f"  proto : {PROTO_URL}  (serving ../../dist)")

    # Step 1 — TTS for every segment (so we know the exact timing budget)
    print("▸ TTS")
    durations = {}
    for seg in SEGMENTS:
        wav = AUDIO_DIR / f"{seg['id']}.wav"
        if not wav.exists():
            print(f"   · {seg['id']}  ({len(seg['text'].split())} words)")
            say_to_wav(seg["text"], wav)
        durations[seg["id"]] = probe_duration(wav) - HEAD_HOLD  # narration only

    # Step 2 — record each segment
    print("▸ record")
    # Resolve `keep_state` views → the previous concrete view, so each
    # recorded context starts on the correct stage even though we spin up a
    # fresh browser per segment.
    resolved = []
    last_view = "splash"
    for seg in SEGMENTS:
        s = dict(seg)
        if s.get("view") == "keep_state":
            s["view"] = last_view
        elif s.get("view"):
            last_view = s["view"]
        resolved.append(s)

    segments_mp4 = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-gl=swiftshader",
                "--enable-unsafe-swiftshader",
                "--disable-web-security",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        try:
            for seg in resolved:
                out = VIDEO_DIR / f"seg_{seg['id']}.mp4"
                narration_s = durations[seg["id"]]
                # Cache: skip segments whose final mp4 already exists. To
                # force a re-render, just delete the file (or the whole
                # video/ dir). TTS audio is cached the same way.
                if out.exists():
                    print(f"   · {seg['id']}  cached")
                    segments_mp4.append(out)
                    continue
                print(f"   · {seg['id']}  {seg['kind']:5s}  {narration_s:.1f}s"
                      f"  view={seg.get('view', '-')}", flush=True)
                if seg["kind"] == "slide":
                    raw, pad = record_slide(seg, browser, narration_s)
                elif seg["kind"] == "proto":
                    raw, pad = record_proto(seg, browser, narration_s)
                else:
                    raise RuntimeError(f"unknown kind: {seg['kind']}")
                mux(raw, AUDIO_DIR / f"{seg['id']}.wav", pad, narration_s, out)
                segments_mp4.append(out)
                raw.unlink(missing_ok=True)
        finally:
            browser.close()

    # Step 3 — concatenate
    print("▸ concat")
    concat(segments_mp4, FINAL)
    dur = probe_duration(FINAL)
    mb = FINAL.stat().st_size / 1024 / 1024
    print(f"✓ {FINAL.name}  {dur:.1f}s  {mb:.1f} MB")


if __name__ == "__main__":
    main()
