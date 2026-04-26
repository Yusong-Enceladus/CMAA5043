/**
 * useSpeechRecognition — Web Speech API wrapper with explicit error handling.
 *
 * Handles the "Allow once" edge case: each startListening() creates a fresh
 * SpeechRecognition instance so the browser re-asks for mic permission when
 * the previous grant has expired. Surfaces permission denial to the UI
 * instead of failing silently.
 *
 * Demo mode: when the URL has `?demo=1`, the hook also installs a mock on
 * `window.__bbVoiceMock__.simulate(text, durationMs)` that streams a fake
 * transcript word-by-word into the listening UI — used by the investor-demo
 * autopilot to make voice input look real in headless Chromium where Web
 * Speech doesn't run. The mock writes through the same `setTranscript` /
 * `setIsListening` setters as the real path, so the rest of the app sees
 * an identical state machine.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const IS_DEMO_MODE = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('demo') === '1';

const IS_SUPPORTED = IS_DEMO_MODE || (
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
);

const ERROR_MESSAGES = {
  'not-allowed':         'Microphone permission was blocked. Enable it in your browser, then tap again.',
  'service-not-allowed': 'Your browser blocked voice recognition. Check site permissions and try again.',
  'audio-capture':       'No microphone found on this device.',
  'network':             'Voice needs an internet connection. Check your network and retry.',
  'no-speech':           null, // soft stop — not an error from the UI's perspective
  'aborted':             null, // soft stop — user cancelled
};

export default function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);          // string | null
  const [permission, setPermission] = useState('prompt'); // 'granted' | 'denied' | 'prompt' | 'unsupported'
  const recognitionRef = useRef(null);

  // Poll microphone permission where the Permissions API supports it.
  useEffect(() => {
    let permStatus;
    let cancelled = false;
    (async () => {
      if (!navigator.permissions?.query) {
        setPermission('unsupported');
        return;
      }
      try {
        permStatus = await navigator.permissions.query({ name: 'microphone' });
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

  const startListening = useCallback(() => {
    if (!IS_SUPPORTED) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);

    // Abort any in-flight recognition so the new one gets a fresh permission grant.
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setPermission('granted');
    };

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      const msg = ERROR_MESSAGES[event.error];
      if (msg !== null) {
        // Real error the user should know about.
        setError(msg ?? `Voice error: ${event.error}`);
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermission('denied');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      // InvalidStateError: recognition already started. Most likely a double-tap.
      setIsListening(false);
      if (err?.name !== 'InvalidStateError') {
        setError(err?.message || 'Could not start voice recognition.');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  // Demo mode mock: streams a fake transcript word-by-word so the listening
  // UI actually animates during recording. Exposed on window so the
  // Playwright autopilot can call it. Each mounted hook re-installs the
  // mock — the most recently mounted screen wins, which is fine because
  // only one screen is active at a time.
  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    window.__bbVoiceMock__ = {
      async simulate(text, durationMs = 2400) {
        setError(null);
        setTranscript('');
        setIsListening(true);
        const words = text.split(/\s+/).filter(Boolean);
        const stepMs = Math.max(60, durationMs / Math.max(1, words.length));
        for (let i = 0; i < words.length; i++) {
          await new Promise((r) => setTimeout(r, stepMs));
          setTranscript(words.slice(0, i + 1).join(' '));
        }
        // Hold the final transcript briefly so the viewer can read it,
        // then release isListening so caller logic (e.g. handleVoiceCommand
        // useEffect) fires.
        await new Promise((r) => setTimeout(r, 320));
        setIsListening(false);
      },
      reset() {
        setTranscript('');
        setIsListening(false);
        setError(null);
      },
    };
    return () => {
      delete window.__bbVoiceMock__;
    };
  }, []);

  return {
    transcript,
    isListening,
    isSupported: IS_SUPPORTED,
    error,
    permission,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  };
}
