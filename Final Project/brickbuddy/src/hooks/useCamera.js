/**
 * useCamera — getUserMedia wrapper with explicit permission handling.
 *
 * Design notes:
 *   - The video <video> element is only rendered after isActive=true. We therefore
 *     hold the MediaStream in a ref and attach it to the <video> via an effect the
 *     consumer wires up with `attachVideo(videoEl)`. This avoids the classic race
 *     where videoRef.current is null when startCamera() resolves.
 *   - Each startCamera() call requests a fresh stream so the browser re-prompts for
 *     permission when "Allow once" has expired.
 *   - Cleans up on unmount so the browser's camera indicator turns off.
 *
 * Demo mode: when the URL has `?demo=1`, startCamera() generates a synthetic
 * MediaStream from a canvas — a "fake brick pile" preview that pulses every
 * 60ms. takePhoto() returns a still capture from that canvas. This keeps
 * the viewfinder UI live in headless Chromium where getUserMedia is denied,
 * so the demo recording shows the camera path working end-to-end.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const IS_DEMO_MODE = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('demo') === '1';

const ERR_MAP = {
  NotAllowedError:       { code: 'denied',   message: 'Camera permission was blocked. Click the camera icon in your address bar, choose "Allow", then tap again.' },
  SecurityError:         { code: 'denied',   message: 'Camera is blocked by the browser. Check site permissions and try again.' },
  NotFoundError:         { code: 'no-device', message: 'No camera found on this device.' },
  OverconstrainedError:  { code: 'no-device', message: "We couldn't find a matching camera. Try another device." },
  NotReadableError:      { code: 'busy',     message: 'Your camera is busy in another app. Close it and try again.' },
  AbortError:            { code: 'aborted',  message: 'Camera open was cancelled. Tap again to retry.' },
  TypeError:             { code: 'unsupported', message: 'Camera access needs a secure connection (https).' },
};

function mapError(err) {
  if (!err) return { code: 'unknown', message: 'Something went wrong with the camera. Try again.' };
  const mapped = ERR_MAP[err.name];
  if (mapped) return mapped;
  return { code: 'unknown', message: err.message || 'Camera error. Try again.' };
}

export default function useCamera() {
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);        // { code, message } | null
  const [permission, setPermission] = useState('prompt');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Optional permission listener (Chrome supports it; Safari does not).
  useEffect(() => {
    let permStatus;
    let cancelled = false;
    (async () => {
      if (!navigator.permissions?.query) {
        setPermission('unsupported');
        return;
      }
      try {
        permStatus = await navigator.permissions.query({ name: 'camera' });
        if (cancelled) return;
        setPermission(permStatus.state);
        permStatus.onchange = () => setPermission(permStatus.state);
      } catch {
        setPermission('prompt');
      }
    })();
    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch { /* ignore */ }
    }
    setIsActive(false);
    setIsStarting(false);
  }, []);

  // Attach the stream to the <video>. Called from an effect when the element mounts.
  const attachVideoToStream = useCallback(() => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (v && s && v.srcObject !== s) {
      v.srcObject = s;
      // Chrome/Safari require an explicit play() after srcObject.
      v.play?.().catch(() => { /* autoplay might be blocked; user click will trigger */ });
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);

    // Drop any previous stream so the new permission prompt is clean.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Demo mode: synthesise a fake brick-pile MediaStream from a canvas.
    // Headless Chromium denies getUserMedia, so without this the demo
    // recording shows nothing but an "opening camera…" placeholder.
    if (IS_DEMO_MODE) {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const colors = ['#E14F3B', '#3B82F6', '#FBBF24', '#10B981', '#F59E0B', '#8357E6', '#1F2937'];
      const bricks = Array.from({ length: 14 }, () => ({
        x: Math.random() * 540 + 50,
        y: Math.random() * 380 + 50,
        w: 50 + Math.random() * 30,
        h: 30 + Math.random() * 14,
        c: colors[(Math.random() * colors.length) | 0],
        r: (Math.random() - 0.5) * 0.5,
      }));
      let raf;
      const tick = () => {
        // Soft sand-paper background gradient
        const g = ctx.createRadialGradient(320, 240, 60, 320, 240, 360);
        g.addColorStop(0, '#FBE6CA'); g.addColorStop(1, '#E5BC8A');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 480);
        // Bricks with a subtle bob
        const t = performance.now() / 1000;
        for (const b of bricks) {
          ctx.save();
          ctx.translate(b.x + b.w / 2, b.y + b.h / 2 + Math.sin(t + b.r * 5) * 1.2);
          ctx.rotate(b.r);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(-b.w / 2 + 2, -b.h / 2 + 4, b.w, b.h);
          ctx.fillStyle = b.c;
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          ctx.restore();
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
      const stream = canvas.captureStream(30);
      // Attach a stop hook so cleanup cancels the animation.
      stream.getVideoTracks()[0].addEventListener('ended', () => cancelAnimationFrame(raf));
      const origStop = stream.getVideoTracks()[0].stop.bind(stream.getVideoTracks()[0]);
      stream.getVideoTracks()[0].stop = () => { cancelAnimationFrame(raf); origStop(); };
      streamRef.current = stream;
      setIsActive(true);
      setPermission('granted');
      setIsStarting(false);
      return stream;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ code: 'unsupported', message: 'Camera is not supported in this browser.' });
      setIsStarting(false);
      return null;
    }

    try {
      // Try rear camera first; fall back to any camera if rear is missing.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch (err) {
        if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      // Render the <video> element — effect below binds srcObject once it mounts.
      setIsActive(true);
      setPermission('granted');
      setIsStarting(false);
      return stream;
    } catch (err) {
      const mapped = mapError(err);
      setError(mapped);
      setIsActive(false);
      setIsStarting(false);
      if (mapped.code === 'denied') setPermission('denied');
      return null;
    }
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
    return dataUrl;
  }, [stopCamera]);

  // Cleanup on unmount.
  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    isActive,
    isStarting,
    photo,
    error,
    permission,
    startCamera,
    stopCamera,
    takePhoto,
    setPhoto,
    attachVideoToStream,
    clearError: () => setError(null),
  };
}
