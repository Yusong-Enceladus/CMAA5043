/**
 * useRealTimeClock – Custom Hook (Lab 7, Assignment 1)
 *
 * Fetches the current time from the Suning API every second.
 * Falls back to local time with a "(local time)" suffix on error.
 *
 * API: http://quan.suning.com/getSysTime.do
 * Response format: { "sysTime2": "2020-08-07 16:33:25", "sysTime1": "20200807163325" }
 */
import { useState, useEffect } from 'react';

function useRealTimeClock() {
  // State to hold the displayed time string
  const [timeStr, setTimeStr] = useState('Loading...');
  // State to track whether we are using local fallback
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    /**
     * fetchTime – attempts to get server time from the Suning API.
     * If the fetch fails (network error, timeout, invalid JSON, etc.),
     * it falls back to the browser's local Date and marks it as "(local time)".
     */
    const fetchTime = async () => {
      try {
        // AbortController to enforce a 3-second timeout per request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('http://quan.suning.com/getSysTime.do', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Parse the JSON response from the API
        const data = await response.json();

        // sysTime2 is the human-readable format: "2020-08-07 16:33:25"
        if (data && data.sysTime2) {
          setTimeStr(data.sysTime2);
          setIsLocal(false);
        } else {
          // API returned unexpected data — fall back to local time
          throw new Error('Invalid API response');
        }
      } catch (error) {
        // Error handling: use local time and mark it with "(local time)"
        const now = new Date();
        const localFormatted = now.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        setTimeStr(localFormatted + ' (local time)');
        setIsLocal(true);
      }
    };

    // Fetch immediately on mount
    fetchTime();

    // Set up interval to update every second (1000ms)
    const intervalId = setInterval(fetchTime, 1000);

    // Cleanup: clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array — run once on mount

  return { timeStr, isLocal };
}

export default useRealTimeClock;
