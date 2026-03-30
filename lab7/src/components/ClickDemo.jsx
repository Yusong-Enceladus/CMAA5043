import useClickPosition from '../hooks/useClickPosition';

/**
 * ClickDemo – demonstrates the useClickPosition custom hook
 *
 * Two independent click areas each share the same hook but
 * with different logName values, so the console output identifies
 * exactly which area was clicked.
 */
function ClickDemo() {
  // Each instance of the hook tracks its own area independently
  const areaA = useClickPosition('Gallery Area');
  const areaB = useClickPosition('Project Area');

  return (
    <div className="click-demo">
      {/* Click Area A – Gallery */}
      <div
        className="click-box click-box-a"
        onClick={areaA.handleClick}
        title="Click to log position"
      >
        <h4>Gallery Area</h4>
        {areaA.position ? (
          <p className="coords">
            Last click: ({areaA.position.x}, {areaA.position.y})
          </p>
        ) : (
          <p className="coords-hint">Click anywhere in this box</p>
        )}
        <p className="click-count">Total clicks: {areaA.clickCount}</p>
      </div>

      {/* Click Area B – Project */}
      <div
        className="click-box click-box-b"
        onClick={areaB.handleClick}
        title="Click to log position"
      >
        <h4>Project Area</h4>
        {areaB.position ? (
          <p className="coords">
            Last click: ({areaB.position.x}, {areaB.position.y})
          </p>
        ) : (
          <p className="coords-hint">Click anywhere in this box</p>
        )}
        <p className="click-count">Total clicks: {areaB.clickCount}</p>
      </div>

      <p className="demo-hint">
        Open the browser console (F12) to see the logged output from <code>useClickPosition</code>.
      </p>
    </div>
  );
}

export default ClickDemo;
