/**
 * useCamera — Custom hook for accessing device camera via getUserMedia.
 * Lets children show their LEGO pieces or drawings to the AI assistant.
 */
import { useState, useRef, useCallback } from 'react';

export default function useCamera() {
  const [isActive, setIsActive] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
      setError(null);
    } catch (err) {
      console.warn('[Camera] Error:', err.message);
      setError('Camera not available. You can describe your idea instead!');
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
    return dataUrl;
  }, [stopCamera]);

  return { videoRef, isActive, photo, error, startCamera, stopCamera, takePhoto, setPhoto };
}
