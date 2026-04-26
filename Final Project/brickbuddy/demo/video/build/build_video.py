#!/usr/bin/env python3
"""
BrickBuddy investor demo — master orchestrator (iteration 3).

Pipeline:
  1. TTS — one call per slide (sentence-level), one BIG call for the
     continuous prototype scene (so Bronya's prosody flows across the
     whole walk-through instead of stuttering every period).
  2. Slides — one Playwright recording per slide (same as before).
  3. Prototype — ONE long Playwright session that drives the whole app
     end-to-end via the autopilot choreography. No reloads. The speech
     and camera hooks are mocked at `?demo=1` so the listening UI
     animates and the camera shows a synthesized brick-pile preview.
  4. SRT — generate burned-in subtitles, with timestamps interpolated
     across each scene's narration lines.
  5. Concat + burn subs — final mp4 with audio + visuals + captions.

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
SRT_PATH = ROOT.parent / "BrickBuddy_investor_demo.srt"

for d in (AUDIO_DIR, VIDEO_DIR, TMP_DIR):
    d.mkdir(exist_ok=True, parents=True)

_BREW_FFMPEG = "/opt/homebrew/bin/ffmpeg"
_BREW_FFPROBE = "/opt/homebrew/bin/ffprobe"
FFMPEG = _BREW_FFMPEG if pathlib.Path(_BREW_FFMPEG).exists() else "ffmpeg"
FFPROBE = _BREW_FFPROBE if pathlib.Path(_BREW_FFPROBE).exists() else "ffprobe"

# Homebrew's ffmpeg doesn't ship --enable-libass, so the `subtitles` filter
# is missing. Conda's ffmpeg has libfreetype + drawtext but no libx264,
# so it can't be the primary encoder. We use both: brew for libx264
# (slide + proto encoding) and conda for the drawtext caption overlay.
_CONDA_FFMPEG = "/opt/miniconda3/bin/ffmpeg"
FFMPEG_DRAW = _CONDA_FFMPEG if pathlib.Path(_CONDA_FFMPEG).exists() else FFMPEG

# A short, ASCII-only path so the caption renderer's filtergraph stays
# clean (the build dir has spaces in it which trip up libavfilter).
SUB_STAGE = pathlib.Path("/tmp/bb_burn")
SUB_STAGE.mkdir(exist_ok=True)

# ---------------------------------------------------------------- config ---
VIEWPORT = (1600, 900)
FPS = 30
PAD_SLIDE = 1.2   # sec of dead time to trim off the front of slide recordings
PAD_PROTO = 1.6   # React first paint
TAIL_HOLD = 0.80  # extra video hold after narration so scenes breathe
HEAD_HOLD = 0.40  # pre-roll silence before narration starts

MYTTS_DIR    = pathlib.Path("/Users/bronya/Desktop/Creation/myTTS")
MYTTS_PYTHON = MYTTS_DIR / "qwen3tts" / ".venv" / "bin" / "python"
MYTTS_VOICE  = "bronya"
SAY_VOICE = "Samantha"
SAY_RATE  = 140
SENTENCE_PAUSE = 380

PORT_SLIDES = 9011
PORT_PROTO = 5184
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


# ---------------------------------------------------------------- TTS ---
def prep_say_text(text):
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    pause = f"[[slnc {SENTENCE_PAUSE}]]"
    return f" {pause} ".join(p for p in parts if p)


def _prepend_silence(src_wav, dst_wav, silence_s):
    sh([FFMPEG, "-y", "-loglevel", "error",
        "-f", "lavfi", "-t", f"{silence_s:.3f}", "-i", "anullsrc=r=44100:cl=stereo",
        "-i", str(src_wav),
        "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[a]",
        "-map", "[a]", "-ar", "44100", "-ac", "2", str(dst_wav)])


def _mytts_to_wav(text, wav_path):
    raw = wav_path.with_suffix(".raw.wav")
    cmd = [
        str(MYTTS_PYTHON), "generate.py",
        "--voice", MYTTS_VOICE,
        "--text", text,
        "--output", str(raw),
    ]
    subprocess.run(cmd, cwd=str(MYTTS_DIR), check=True, capture_output=True, text=True)
    _prepend_silence(raw, wav_path, HEAD_HOLD)
    raw.unlink(missing_ok=True)


def _say_to_wav(text, wav_path):
    aiff = wav_path.with_suffix(".aiff")
    tts_text = prep_say_text(text)
    subprocess.run(
        ["say", "-v", SAY_VOICE, "-r", str(SAY_RATE), "-o", str(aiff), tts_text],
        check=True,
    )
    _prepend_silence(aiff, wav_path, HEAD_HOLD)
    aiff.unlink(missing_ok=True)


def say_to_wav(text, wav_path):
    """Render narration to a WAV using the best available TTS engine.

    For the proto autopilot we hand the entire walk-through narration as
    ONE long string. Qwen3-TTS handles multi-sentence input gracefully —
    you get natural prosodic continuity across the whole scene rather
    than the per-sentence cuts you'd get from concatenating individual
    calls. macOS `say` (the fallback) also handles long text in one go.
    """
    if MYTTS_PYTHON.exists() and MYTTS_DIR.exists():
        try:
            _mytts_to_wav(text, wav_path)
            return
        except subprocess.CalledProcessError as e:
            print(f"  [warn] myTTS failed, falling back to `say`: {e.stderr[:200] if e.stderr else e}")
    _say_to_wav(text, wav_path)


def segment_text(seg):
    """Return the text fed to TTS for a segment."""
    if seg["kind"] == "slide":
        return seg["text"]
    if seg["kind"] == "autopilot":
        # Join all narration lines into a single TTS call so Bronya's
        # prosody flows across the whole scene. A single space between
        # sentences keeps the natural breath.
        return " ".join(seg["narration_lines"])
    raise RuntimeError(f"unknown kind: {seg['kind']}")


# ---------------------------------------------------------------- HTTP servers ---
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


# ---------------------------------------------------------------- slide recording ---
def record_slide(seg, browser, narration_s):
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
    return pathlib.Path(vid.path()), PAD_SLIDE


# ---------------------------------------------------------------- autopilot ---
def _click_text(page, text):
    page.evaluate(
        """(txt) => {
            const all = [...document.querySelectorAll('button, [role="button"]')];
            const btn = all.find(b => b.textContent.trim().includes(txt));
            if (btn) btn.click();
        }""",
        text,
    )


def record_autopilot(seg, browser, narration_s):
    """Drive the prototype through the segment's `actions` schedule.

    ONE persistent browser context for the entire scene. No reloads. The
    speech + camera hooks are mocked (see useSpeechRecognition.js /
    useCamera.js); the autopilot calls window.__bb__.speak(...) so the
    listening UI streams the transcript word-by-word, then the existing
    React useEffect fires the mutation. Result: the recording shows a
    coherent, end-to-end product walk-through.
    """
    duration = max(narration_s + TAIL_HOLD, seg.get("duration_s") or narration_s + TAIL_HOLD)

    ctx = browser.new_context(
        viewport={"width": VIEWPORT[0], "height": VIEWPORT[1]},
        device_scale_factor=1,
        record_video_dir=str(TMP_DIR),
        record_video_size={"width": VIEWPORT[0], "height": VIEWPORT[1]},
        permissions=["microphone", "camera"],
    )
    page = ctx.new_page()
    page.goto(PROTO_URL, wait_until="domcontentloaded")
    page.wait_for_function("() => !!window.__bbDev__", timeout=8000)
    # Seed the inventory ahead of time — the autopilot navigates through
    # Discover via 'Just browse', which expects an inventory to exist on
    # the BuildContext.
    page.evaluate(
        "(inv) => { window.__bbDev__.setInventory(inv); }",
        _INVENTORY_SEED,
    )
    page.wait_for_timeout(int(PAD_PROTO * 1000))

    actions = seg["actions"]
    start = time.time()

    def _now():
        return time.time() - start

    def _wait_until(t):
        gap = t - _now()
        if gap > 0:
            page.wait_for_timeout(int(gap * 1000))

    for action in actions:
        offset, kind, *args = action
        _wait_until(offset)
        try:
            if kind == "noop":
                pass
            elif kind == "click_text":
                _click_text(page, args[0])
            elif kind == "set_stage":
                page.evaluate(f"() => window.__bbDev__.setStage({json.dumps(args[0])})")
            elif kind == "select_model":
                page.evaluate(f"() => window.__bbDev__.selectModel({json.dumps(args[0])})")
            elif kind == "set_inventory":
                page.evaluate(
                    "(inv) => { window.__bbDev__.setInventory(inv); }",
                    args[0],
                )
            elif kind == "speak":
                text, dur_ms = args[0], args[1] if len(args) > 1 else 2400
                # Fire-and-forget — speak returns a promise, but we want
                # the autopilot to advance so the next action can land
                # while the transcript is still streaming. The mutation
                # itself fires when speech.isListening flips false.
                page.evaluate(
                    "([t, d]) => { (async () => { try { await window.__bb__.speak(t, d); } catch (e) {} })(); }",
                    [text, dur_ms],
                )
            elif kind == "speak_mock":
                # Same pattern as `speak`, but drives the speech mock
                # directly without going through BuildScreen. Used on the
                # Discover screen where we want the listening UI to
                # animate but no mutation should fire (we'll cancel out
                # of the voice card after).
                text, dur_ms = args[0], args[1] if len(args) > 1 else 2200
                page.evaluate(
                    "([t, d]) => { (async () => { try { if (window.__bbVoiceMock__) await window.__bbVoiceMock__.simulate(t, d); } catch (e) {} })(); }",
                    [text, dur_ms],
                )
            elif kind == "eval_tap":
                page.evaluate(
                    "([f, c]) => window.__bb__ && window.__bb__.tap(f, c)",
                    [args[0], args[1]],
                )
            elif kind == "eval":
                page.evaluate(args[0])
            else:
                print(f"     [unknown action] {kind!r}")
        except Exception as e:
            print(f"     [action miss] {kind} {args}: {e}")

    # Hold until the full duration to give late actions room to settle.
    _wait_until(duration)

    vid = page.video
    ctx.close()
    return pathlib.Path(vid.path()), PAD_PROTO


# ---------------------------------------------------------------- mux ---
def mux(raw_video, wav, pad_s, narration_s, out_path, hold_s=None):
    """Trim the pre-load padding and mux audio over video.

    `hold_s`, if given, is the total visual duration we want — used by the
    autopilot scene where the visual choreography may run longer than the
    narration audio (so the demo doesn't cut to black mid-action).
    """
    audio_total = narration_s + HEAD_HOLD + TAIL_HOLD
    target = max(audio_total, hold_s or audio_total)
    cmd = [
        FFMPEG, "-y", "-loglevel", "error",
        "-ss", f"{pad_s:.3f}", "-i", str(raw_video),
        "-i", str(wav),
        "-t", f"{target:.3f}",
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        # Pad the audio with silence so it covers the full visual hold.
        "-af", f"apad=whole_dur={target:.3f}",
        "-r", str(FPS), "-vsync", "cfr",
        str(out_path),
    ]
    sh(cmd)


# ---------------------------------------------------------------- subtitles (SRT) ---
def _split_into_subtitle_lines(text, max_chars=78):
    """Break a sentence into ≤max_chars chunks at word boundaries for SRT."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > max_chars:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip() if cur else w
    if cur:
        lines.append(cur)
    return lines


def _srt_timestamp(t_s):
    h = int(t_s // 3600); m = int((t_s % 3600) // 60); s = t_s - 60 * (h * 60 + m)
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


def _seg_subtitle_lines(seg, narration_s):
    """Return [(start_s, end_s, text), ...] within this segment's local timeline.

    For slides: split the slide's `text` into one or two SRT lines and
    spread them across the narration. For autopilot scenes: each entry
    in `narration_lines` becomes one SRT block, with timestamps
    interpolated by word-share.
    """
    lines = []
    if seg["kind"] == "slide":
        chunks = _split_into_subtitle_lines(seg["text"], max_chars=86)
    else:
        chunks = list(seg["narration_lines"])
    word_counts = [max(1, len(c.split())) for c in chunks]
    total_w = sum(word_counts)
    # Spread chunks proportionally across narration_s. Add a tiny gap at
    # start (HEAD_HOLD) so subs don't appear before the audio.
    cursor = HEAD_HOLD
    avail = narration_s
    for c, wc in zip(chunks, word_counts):
        share = wc / total_w
        dur = avail * share
        end = cursor + dur
        lines.append((cursor, end, c))
        cursor = end
    return lines


def write_srt(seg_offsets, segments, srt_path):
    """seg_offsets: list of (segment_id, start_in_final_s, audio_dur_s)."""
    entries = []  # global-timeline (start, end, text)
    seg_by_id = {s["id"]: s for s in segments}
    for sid, base, narr_s in seg_offsets:
        seg = seg_by_id[sid]
        for (lstart, lend, text) in _seg_subtitle_lines(seg, narr_s):
            entries.append((base + lstart, base + lend, text))
    # Write SRT
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, (s, e, t) in enumerate(entries, start=1):
            f.write(f"{i}\n{_srt_timestamp(s)} --> {_srt_timestamp(e)}\n{t}\n\n")
    return srt_path


# ---------------------------------------------------------------- concat + burn ---
def _parse_srt(srt_path):
    """Return [(start_s, end_s, text), ...] from an SRT file."""
    raw = srt_path.read_text(encoding="utf-8").strip()
    out = []
    for block in re.split(r"\n\s*\n", raw):
        lines = block.strip().splitlines()
        if len(lines) < 3:
            continue
        # lines[0] = index, lines[1] = "HH:MM:SS,mmm --> HH:MM:SS,mmm"
        m = re.match(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})", lines[1])
        if not m:
            continue
        h1, m1, s1, ms1, h2, m2, s2, ms2 = (int(x) for x in m.groups())
        start = h1*3600 + m1*60 + s1 + ms1/1000.0
        end   = h2*3600 + m2*60 + s2 + ms2/1000.0
        text  = " ".join(lines[2:]).strip()
        out.append((start, end, text))
    return out


def _drawtext_chain(srt_entries):
    """Build a comma-separated chain of `drawtext` filters that show each
    SRT entry inside its time window. Each filter is fully self-contained;
    the chain is wrapped in a single `-vf`.

    Caption style: warm cream text over a soft dark pill, centered ~70px
    from the bottom edge. Uses the system Helvetica.ttc; falls back to a
    generic sans if missing.
    """
    # Pick a font that ships on macOS and has a sensible regular weight.
    # ttc files index multiple weights; we point fontconfig at the file
    # and let it pick the regular face.
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    fontfile = next((p for p in candidates if pathlib.Path(p).exists()), candidates[-1])

    parts = []
    for (start, end, text) in srt_entries:
        # ffmpeg drawtext escaping: backslash for : ' \ % {
        # We use the single-line form `text=...` so quote-escape the text.
        safe = (text
                .replace("\\", "\\\\")
                .replace("'", "’")  # turn apostrophes into curly so we
                                          # never have to escape them
                .replace(":", r"\:")
                .replace(",", r"\,")
                .replace("[", r"\[")
                .replace("]", r"\]"))
        f = (
            f"drawtext=fontfile='{fontfile}'"
            f":text='{safe}'"
            f":fontsize=26:fontcolor=#FFF6EC"
            f":box=1:boxcolor=#1A1410@0.78:boxborderw=14"
            f":x=(w-text_w)/2:y=h-text_h-72"
            f":enable='between(t\\,{start:.3f}\\,{end:.3f})'"
        )
        parts.append(f)
    return ",".join(parts) if parts else "null"


def concat_and_burn(segments_mp4s, srt_path, out_path):
    """Concat per-segment mp4s into one file, then burn captions via the
    drawtext filter chain.

    Two passes:
      1. Concat the per-segment H.264 mp4s without re-encode.
      2. Pipe through conda's ffmpeg (which has libfreetype/drawtext)
         and use its `libopenh264` encoder for the burn pass — Homebrew
         ffmpeg has libx264 but not libfreetype; conda has libfreetype
         but not libx264. libopenh264 is good enough for a demo at CRF
         the equivalent of x264 q=20.
    """
    listfile = TMP_DIR / "concat.txt"
    listfile.write_text("".join(f"file '{p}'\n" for p in segments_mp4s))

    # Pass 1: stream-copy concat (fast).
    interim = SUB_STAGE / "concat.mp4"
    sh([FFMPEG, "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", str(listfile),
        "-c", "copy", "-movflags", "+faststart",
        str(interim)])

    # Pass 2: drawtext chain via conda ffmpeg. Stage everything under
    # /tmp/bb_burn/ so the filter graph contains only ASCII paths.
    stage_srt = SUB_STAGE / "subs.srt"
    stage_srt.write_text(srt_path.read_text(encoding="utf-8"), encoding="utf-8")
    stage_out = SUB_STAGE / "out.mp4"

    entries = _parse_srt(stage_srt)
    vf = _drawtext_chain(entries)

    sh([FFMPEG_DRAW, "-y", "-loglevel", "error",
        "-i", "concat.mp4",
        "-vf", vf,
        "-c:v", "libopenh264", "-b:v", "4500k",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "copy",
        "out.mp4"], cwd=str(SUB_STAGE))

    if out_path.exists():
        out_path.unlink()
    stage_out.replace(out_path)
    interim.unlink(missing_ok=True)


# ---------------------------------------------------------------- inventory seed ---
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

    # ── TTS ──
    print("▸ TTS")
    audio_durations = {}
    for seg in SEGMENTS:
        wav = AUDIO_DIR / f"{seg['id']}.wav"
        text = segment_text(seg)
        if not wav.exists():
            wc = len(text.split())
            print(f"   · {seg['id']}  ({wc} words)", flush=True)
            say_to_wav(text, wav)
        audio_durations[seg["id"]] = probe_duration(wav) - HEAD_HOLD

    # ── Record ──
    print("▸ record")
    seg_offsets = []  # (id, base_offset_in_final, audio_dur)
    cursor = 0.0
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
            for seg in SEGMENTS:
                out = VIDEO_DIR / f"seg_{seg['id']}.mp4"
                narr_s = audio_durations[seg["id"]]
                if seg["kind"] == "autopilot":
                    visual_dur = max(seg.get("duration_s") or 0, narr_s + TAIL_HOLD)
                else:
                    visual_dur = narr_s + TAIL_HOLD
                seg_dur = visual_dur + HEAD_HOLD  # full clip duration

                # Cache: skip segments whose final mp4 already exists.
                if out.exists():
                    print(f"   · {seg['id']}  cached ({seg_dur:.1f}s)")
                    seg_offsets.append((seg["id"], cursor, narr_s))
                    cursor += seg_dur
                    segments_mp4.append(out)
                    continue

                print(f"   · {seg['id']}  {seg['kind']:9s}  audio={narr_s:.1f}s  "
                      f"visual={visual_dur:.1f}s", flush=True)
                if seg["kind"] == "slide":
                    raw, pad = record_slide(seg, browser, narr_s)
                    mux(raw, AUDIO_DIR / f"{seg['id']}.wav", pad, narr_s, out)
                elif seg["kind"] == "autopilot":
                    raw, pad = record_autopilot(seg, browser, narr_s)
                    mux(raw, AUDIO_DIR / f"{seg['id']}.wav", pad, narr_s, out,
                        hold_s=visual_dur)
                else:
                    raise RuntimeError(f"unknown kind: {seg['kind']}")
                seg_offsets.append((seg["id"], cursor, narr_s))
                cursor += seg_dur
                segments_mp4.append(out)
                raw.unlink(missing_ok=True)
        finally:
            browser.close()

    # ── SRT ──
    print("▸ subtitles")
    write_srt(seg_offsets, SEGMENTS, SRT_PATH)
    print(f"   · {SRT_PATH.name}")

    # ── Concat + burn subs ──
    print("▸ concat + burn subs")
    concat_and_burn(segments_mp4, SRT_PATH, FINAL)
    dur = probe_duration(FINAL)
    mb = FINAL.stat().st_size / 1024 / 1024
    print(f"✓ {FINAL.name}  {dur:.1f}s  {mb:.1f} MB")


if __name__ == "__main__":
    main()
