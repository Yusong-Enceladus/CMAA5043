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
 */
import { useState, useRef, useCallback, useEffect } from 'react';

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
