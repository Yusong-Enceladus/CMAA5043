import { useState } from 'react';

/**
 * useClickPosition – Custom Hook (Lab 4 Tutorial)
 *
 * Tracks the mouse click position within a designated area and logs
 * which specific area was clicked along with the coordinates.
 *
 * @param {string} logName – Label that identifies the clickable area in the console log
 * @returns {{ position: {x, y} | null, clickCount: number, handleClick: function }}
 */
function useClickPosition(logName) {
  const [position, setPosition] = useState(null);
  const [clickCount, setClickCount] = useState(0);

  const handleClick = (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const nextCount = clickCount + 1;

    setPosition({ x, y });
    setClickCount(nextCount);

    // Log the area name, click number, and exact coordinates
    console.log(
      `[useClickPosition] Area: "${logName}" | Click #${nextCount} | X: ${x}, Y: ${y}`
    );
  };

  return { position, clickCount, handleClick };
}

export default useClickPosition;
