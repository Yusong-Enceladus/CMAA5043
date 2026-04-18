/**
 * useCamera — getUserMedia wrapper with explicit permission handling.
 *
 * Handles:
 *   - "Allow once" and subsequent re-prompts (each startCamera call requests fresh)
 *   - Explicit denial (NotAllowedError) → user-facing message
 *   - No camera (NotFoundError) / device busy (NotReadableError) / unsupported
 *   - Live permission state via `navigator.permissions` where supported
 *   - Cleanup on unmount so the browser's camera indicator turns off
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const ERR_MAP = {
  NotAllowedError:       { code: 'denied',   message: 'Camera permission was blocked. Enable it in your browser, then tap again.' },
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
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);        // { code, message } | null
  const [permission, setPermission] = useState('prompt'); // 'granted' | 'denied' | 'prompt' | 'unsupported'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Attach a live permission listener if the browser supports it.
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
        // Some browsers throw on camera permission query — treat as prompt-state.
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
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    // If a previous stream is still open, stop it first so the re-prompt is clean.
    if (streamRef.current) stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ code: 'unsupported', message: 'Camera is not supported in this browser.' });
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Some browsers require explicit play() after srcObject.
        videoRef.current.play?.().catch(() => {});
      }
      setIsActive(true);
      setPermission('granted');
      return stream;
    } catch (err) {
      const mapped = mapError(err);
      setError(mapped);
      setIsActive(false);
      if (mapped.code === 'denied') setPermission('denied');
      return null;
    }
  }, [stopCamera]);

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
    photo,
    error,
    permission,
    startCamera,
    stopCamera,
    takePhoto,
    setPhoto,
    clearError: () => setError(null),
  };
}
