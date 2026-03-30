import { useEffect, useRef, useState } from 'react';

/**
 * Lab 7 Assignment 2: PerformanceMonitor
 *
 * A higher-order wrapper that uses performance.now() to measure
 * the rendering time of any child component. Displays the time
 * in a small badge below the component.
 */
function PerformanceMonitor({ name, children }) {
  const startRef = useRef(performance.now());
  const [renderTime, setRenderTime] = useState(null);

  useEffect(() => {
    // Measure time after the component has rendered to the DOM
    const endTime = performance.now();
    const elapsed = endTime - startRef.current;
    setRenderTime(elapsed.toFixed(2));
    console.log(`[Performance] ${name} rendered in ${elapsed.toFixed(2)}ms`);
  });

  // Reset start time on each render cycle
  startRef.current = performance.now();

  return (
    <div>
      {children}
      {renderTime !== null && (
        <div style={{
          fontSize: '0.75rem',
          color: '#888',
          background: '#f8f8f8',
          padding: '4px 10px',
          borderRadius: '6px',
          marginTop: '4px',
          display: 'inline-block'
        }}>
          ⏱ {name}: {renderTime}ms
        </div>
      )}
    </div>
  );
}

export default PerformanceMonitor;
