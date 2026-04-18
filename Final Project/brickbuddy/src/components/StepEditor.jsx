/**
 * StepEditor — compact in-build panel for modifying the current step's bricks.
 *
 * Actions:
 *  - Change any part's color via a color swatch
 *  - Delete any part
 *  - Add a new part (type/size/color picker, stacks on top of the topmost
 *    existing part in the step, or on the ground if the step is empty)
 *  - Regenerate the whole step via AI
 */
import { useState } from 'react';
import './StepEditor.css';

const TYPES = [
  { id: 'brick',    label: 'Brick',    h: 1.2 },
  { id: 'plate',    label: 'Plate',    h: 0.4 },
  { id: 'tile',     label: 'Tile',     h: 0.4 },
  { id: 'slope',    label: 'Slope',    h: 1.2 },
  { id: 'cylinder', label: 'Cylinder', h: 0.6 },
  { id: 'cone',     label: 'Cone',     h: 0.9 },
];

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#FCD34D', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#1F2937', '#FFFFFF', '#6B7280',
];

function topOfTallest(parts) {
  let maxY = 0;
  for (const p of parts) {
    const top = p.pos[1] + p.size[1] / 2;
    if (top > maxY) maxY = top;
  }
  return maxY;
}

export default function StepEditor({
  parts,
  onDelete,
  onRecolor,
  onAdd,
  onRegenerate,
  regenerating,
  error,
  primaryColor = '#3B82F6',
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('brick');
  const [newW, setNewW] = useState(2);
  const [newD, setNewD] = useState(2);
  const [newColor, setNewColor] = useState(primaryColor);

  const handleAddSubmit = () => {
    const typeSpec = TYPES.find((t) => t.id === newType) || TYPES[0];
    const h = typeSpec.h;
    const yBottom = topOfTallest(parts);
    const part = {
      type: newType,
      pos: [0, yBottom + h / 2, 0],
      size: [Math.max(0.4, Number(newW) || 1), h, Math.max(0.4, Number(newD) || 1)],
      color: newColor,
    };
    onAdd(part);
    setShowAdd(false);
  };

  return (
    <div className="step-editor" role="region" aria-label="Edit this step">
      <div className="editor-header">
        <h3>Edit this step</h3>
        <button
          className="regen-btn"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-label="Regenerate this step with AI"
        >
          {regenerating ? 'Regenerating…' : '\u{1F504} Redo with AI'}
        </button>
      </div>

      {error && <p className="editor-error" role="alert">{error}</p>}

      {parts.length === 0 ? (
        <p className="editor-empty">No bricks in this step yet. Add one below!</p>
      ) : (
        <ul className="editor-parts">
          {parts.map((p, i) => {
            const [w, h, d] = p.size;
            return (
              <li key={i} className="editor-part">
                <label className="color-swatch" style={{ background: p.color }} title="Change color">
                  <input
                    type="color"
                    value={p.color}
                    onChange={(e) => onRecolor(i, e.target.value)}
                    aria-label={`Change color of ${p.type}`}
                  />
                </label>
                <span className="part-type">{p.type}</span>
                <span className="part-size">{w.toFixed(1)}×{d.toFixed(1)}</span>
                <button
                  className="part-delete"
                  onClick={() => onDelete(i)}
                  aria-label={`Delete ${p.type}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd ? (
        <div className="add-form" role="group" aria-label="Add a new brick">
          <div className="add-row">
            <label>Type
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label>Width
              <input type="number" min="1" max="8" value={newW} onChange={(e) => setNewW(e.target.value)} />
            </label>
            <label>Depth
              <input type="number" min="1" max="10" value={newD} onChange={(e) => setNewD(e.target.value)} />
            </label>
          </div>
          <div className="palette-row">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                className={`palette-swatch ${c === newColor ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
                aria-label={`Pick color ${c}`}
              />
            ))}
          </div>
          <div className="add-actions">
            <button className="add-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="add-confirm" onClick={handleAddSubmit}>Add brick</button>
          </div>
        </div>
      ) : (
        <button className="add-brick-btn" onClick={() => setShowAdd(true)} aria-label="Add a new brick">
          + Add a brick
        </button>
      )}
    </div>
  );
}
