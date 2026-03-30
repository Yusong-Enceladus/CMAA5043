/**
 * useRenderTime – Custom Hook (Lab 7, Assignment 2)
 *
 * Measures the rendering time of a component using performance.now().
 * Records the start time when the hook is called (during render),
 * then calculates the elapsed time inside a useEffect (after render).
 *
 * The rendering time is logged to the console AND returned as state
 * so it can be displayed visually on the page.
 *
 * @param {string} componentName – label for identifying which component was measured
 * @returns {{ renderTime: number | null }} – rendering time in milliseconds
 */
import { useState, useEffect, useRef } from 'react';

function useRenderTime(componentName) {
  // Ref to store the start timestamp — survives re-renders without causing them
  const startTimeRef = useRef(performance.now());

  // State to hold the measured rendering time (in ms)
  const [renderTime, setRenderTime] = useState(null);

  // Record start time at the beginning of each render
  // This line runs synchronously during the render phase
  startTimeRef.current = performance.now();

  useEffect(() => {
    // useEffect runs AFTER the browser has painted the component,
    // so the difference gives us the render duration
    const endTime = performance.now();
    const elapsed = endTime - startTimeRef.current;

    // Update state with the measured time
    setRenderTime(elapsed);

    // Log the rendering time to the console for debugging
    console.log(
      `[useRenderTime] ${componentName} rendered in ${elapsed.toFixed(2)}ms`
    );
  });

  return { renderTime };
}

export default useRenderTime;
