/**
 * LegoViewer3D — Data-driven 3D LEGO model viewer.
 *
 * Reads `newParts` arrays from the model and renders cumulative bricks for steps
 * 0..currentStep. Newly-added parts at the current step pulse with an emissive
 * highlight so kids see what they just built.
 *
 * Extensions for the redesign:
 *  - `annotations` prop — coloured rings that pulse around highlighted parts.
 *    Shape: [{ pos:[x,y,z], color?:number|string, r?:number }].
 *  - Overlay +/-/reset zoom buttons in the bottom-right corner.
 *  - Swappable background style: 'paper' | 'blueprint' | 'studio'.
 *
 * Part schema (all types):
 *   { type, pos:[x,y,z], size:[w,h,d], color, opacity?, rotation?:[rx,ry,rz] }
 * - pos is the CENTER of the part.
 * - size is the AXIS-ALIGNED bounding box BEFORE rotation.
 * - rotation is applied AROUND the center; geometry must be centered on its local origin.
 */
import { useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { robotModels } from '../data/models';

const STUD_RADIUS = 0.24;
const STUD_HEIGHT = 0.16;
const STUD_SEGMENTS = 10;

/* ── New-part pulse ─────────────────────────────────────────────── */

function PulseGroup({ isNew, color, children }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || !isNew) return;
    const t = clock.getElapsedTime();
    const pulse = 0.25 + 0.2 * Math.sin(t * 4);
    ref.current.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        obj.material.emissive.set(color);
        obj.material.emissiveIntensity = pulse;
      }
    });
  });
  return <group ref={ref}>{children}</group>;
}

/* ── Parts ──────────────────────────────────────────────────────── */

function Studs({ w, d, color, yTop }) {
  const wStuds = Math.max(1, Math.min(6, Math.round(w)));
  const dStuds = Math.max(1, Math.min(12, Math.round(d)));
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < wStuds; i++) {
      for (let j = 0; j < dStuds; j++) {
        const sx = ((i + 0.5) / wStuds - 0.5) * w;
        const sz = ((j + 0.5) / dStuds - 0.5) * d;
        arr.push([sx, yTop + STUD_HEIGHT / 2, sz]);
      }
    }
    return arr;
  }, [wStuds, dStuds, w, d, yTop]);
  return (
    <group>
      {positions.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, STUD_SEGMENTS]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function BrickBody({ size, color, opacity = 1 }) {
  const [w, h, d] = size;
  return (
    <RoundedBox args={[w, h, d]} radius={0.06} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.35}
        metalness={0.05}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </RoundedBox>
  );
}

function BrickOrPlate({ part }) {
  const [w, h, d] = part.size;
  const withStuds = part.type !== 'tile';
  return (
    <group position={part.pos} rotation={part.rotation || [0, 0, 0]}>
      <BrickBody size={part.size} color={part.color} opacity={part.opacity ?? 1} />
      {withStuds && <Studs w={w} d={d} color={part.color} yTop={h / 2} />}
    </group>
  );
}

function Cylinder({ part }) {
  const [w, h] = part.size;
  const r = w / 2;
  const op = part.opacity ?? 1;
  return (
    <mesh position={part.pos} rotation={part.rotation || [0, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 20]} />
      <meshStandardMaterial
        color={part.color}
        roughness={0.35}
        metalness={0.05}
        transparent={op < 1}
        opacity={op}
      />
    </mesh>
  );
}

function Cone({ part }) {
  const [w, h] = part.size;
  const r = w / 2;
  return (
    <mesh position={part.pos} rotation={part.rotation || [0, 0, 0]} castShadow receiveShadow>
      <coneGeometry args={[r, h, 16]} />
      <meshStandardMaterial color={part.color} roughness={0.35} metalness={0.05} />
    </mesh>
  );
}

/**
 * Slope — a right-triangular prism centered on its local origin.
 */
function Slope({ part }) {
  const [w, h, d] = part.size;
  const op = part.opacity ?? 1;
  const geo = useMemo(() => {
    const positions = new Float32Array([
      -w / 2, -h / 2, -d / 2,
      -w / 2, -h / 2,  d / 2,
      -w / 2,  h / 2, -d / 2,
       w / 2, -h / 2, -d / 2,
       w / 2, -h / 2,  d / 2,
       w / 2,  h / 2, -d / 2,
    ]);
    const indices = new Uint16Array([
      0, 2, 1,
      3, 4, 5,
      0, 1, 4,  0, 4, 3,
      0, 3, 5,  0, 5, 2,
      2, 5, 4,  2, 4, 1,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeVertexNormals();
    return g;
  }, [w, h, d]);
  return (
    <mesh
      position={part.pos}
      rotation={part.rotation || [0, 0, 0]}
      geometry={geo}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={part.color}
        roughness={0.35}
        metalness={0.05}
        transparent={op < 1}
        opacity={op}
      />
    </mesh>
  );
}

function Wheel({ part }) {
  const [w, h] = part.size;
  const R = w / 2;
  const tubeR = (h / 2) * 0.7;
  return (
    <group position={part.pos} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <torusGeometry args={[R * 0.85, tubeR, 10, 24]} />
        <meshStandardMaterial color="#1F2937" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[R * 0.4, R * 0.4, h * 1.05, 16]} />
        <meshStandardMaterial color="#D1D5DB" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[R * 0.2, R * 0.2, h * 1.1, 12]} />
        <meshStandardMaterial color="#6B7280" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* ── Dispatcher ─────────────────────────────────────────────────── */

function Part({ part, isNew, tapMode, onTap }) {
  let mesh;
  switch (part.type) {
    case 'brick':
    case 'plate':
    case 'tile':
      mesh = <BrickOrPlate part={part} />;
      break;
    case 'cylinder':
      mesh = <Cylinder part={part} />;
      break;
    case 'cone':
      mesh = <Cone part={part} />;
      break;
    case 'slope':
      mesh = <Slope part={part} />;
      break;
    case 'wheel':
      mesh = <Wheel part={part} />;
      break;
    default:
      return null;
  }
  // In tap-to-edit mode, every part is clickable. We bubble the click up
  // with the part data + screen position so BuildScreen can pop a contextual
  // edit menu next to where the kid actually tapped.
  const groupProps = tapMode ? {
    onClick: (e) => {
      e.stopPropagation();
      const ne = e.nativeEvent || e;
      onTap?.(part, { x: ne.clientX, y: ne.clientY });
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    },
  } : {};

  return (
    <group {...groupProps}>
      <PulseGroup isNew={isNew} color={part.color}>
        {mesh}
      </PulseGroup>
    </group>
  );
}

/* ── Annotations ────────────────────────────────────────────────── */

function AnnotationRing({ pos, color, r = 1.2 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const sc = 1 + 0.15 * Math.sin(clock.getElapsedTime() * 3);
    ref.current.scale.setScalar(sc);
  });
  return (
    <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.08, 10, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Scene({ model, currentStep, annotations, tapMode, onPartTap }) {
  const { parts, newIds } = useMemo(() => {
    const acc = [];
    const newSet = new Set();
    if (!model) return { parts: acc, newIds: newSet };
    model.steps.slice(0, currentStep + 1).forEach((step, i) => {
      (step.newParts || []).forEach((p, j) => {
        const id = `${i}-${j}`;
        acc.push({ ...p, _id: id });
        if (i === currentStep) newSet.add(id);
      });
    });
    return { parts: acc, newIds: newSet };
  }, [model, currentStep]);

  const center = useMemo(() => {
    if (!parts.length) return [0, 0, 0];
    let minY = Infinity, maxY = -Infinity;
    for (const p of parts) {
      const h = p.size?.[1] || 0;
      minY = Math.min(minY, p.pos[1] - h / 2);
      maxY = Math.max(maxY, p.pos[1] + h / 2);
    }
    return [0, (minY + maxY) / 2, 0];
  }, [parts]);

  return (
    <group position={[0, -center[1] * 0.5, 0]}>
      {parts.map((p) => (
        <Part
          key={p._id}
          part={p}
          isNew={newIds.has(p._id)}
          tapMode={tapMode}
          onTap={onPartTap}
        />
      ))}
      {(annotations || []).map((a, i) => (
        <AnnotationRing
          key={i}
          pos={a.pos}
          color={typeof a.color === 'number'
            ? '#' + a.color.toString(16).padStart(6, '0')
            : (a.color || '#2F6FEB')}
          r={a.r || 1.2}
        />
      ))}
    </group>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

const BG_STYLES = {
  paper:     'linear-gradient(180deg, #FFF6EC 0%, #FFE0CC 55%, #FFD4BA 100%)',
  blueprint: 'radial-gradient(circle at 30% 20%, #2C5282 0%, #1A365D 70%, #0F1E3A 100%)',
  studio:    'linear-gradient(180deg, #FFFFFF 0%, #F3F0EA 100%)',
};

export default function LegoViewer3D({
  model, modelId, currentStep,
  annotations,
  autoRotate = true,
  backgroundStyle = 'paper',
  showControls = true,
  tapMode = false,
  onPartClick,
}) {
  const resolvedModel = useMemo(() => {
    if (model) return model;
    if (!modelId) return null;
    return robotModels.find((m) => m.id === modelId) || null;
  }, [model, modelId]);

  const controlsRef = useRef(null);
  const wrapRef = useRef(null);
  const [dist, setDist] = useState(14);
  // Gate the Canvas on actually having a measurable size. R3F v9's internal
  // ResizeObserver sometimes misses the first layout pass when the viewer is
  // nested inside a flex/grid cell with minHeight:0 (Learn / Celebrate
  // screens), leaving the canvas stuck at 300×150 and blank. Waiting for the
  // wrapper to report ≥100px before mounting guarantees a clean init.
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let done = false;
    const check = () => {
      if (done) return;
      const r = el.getBoundingClientRect();
      if (r.width >= 60 && r.height >= 60) { done = true; setReady(true); }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // Fallback: after 400ms, mount regardless — if the container is still
    // collapsed the Canvas will size itself via its own ResizeObserver once
    // layout resolves.
    const t = setTimeout(() => { done = true; setReady(true); }, 400);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const applyDistance = useCallback((next) => {
    const clamped = Math.max(6, Math.min(36, next));
    setDist(clamped);
    const c = controlsRef.current;
    if (c) {
      const cam = c.object;
      const dir = new THREE.Vector3().subVectors(cam.position, c.target).normalize();
      cam.position.copy(c.target).add(dir.multiplyScalar(clamped));
      c.update();
    }
  }, []);

  const zoomIn  = useCallback(() => applyDistance(dist - 2), [dist, applyDistance]);
  const zoomOut = useCallback(() => applyDistance(dist + 2), [dist, applyDistance]);
  const reset   = useCallback(() => {
    applyDistance(14);
    const c = controlsRef.current;
    if (c) {
      c.object.position.set(10, 7, 12);
      c.target.set(0, 1.5, 0);
      c.update();
    }
  }, [applyDistance]);

  const btn = {
    width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.92)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 16, color: '#1A1410',
    display: 'grid', placeItems: 'center', cursor: 'pointer', border: 'none',
  };

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%', height: '100%', minHeight: 260,
        borderRadius: 'inherit', overflow: 'hidden', position: 'relative',
        background: BG_STYLES[backgroundStyle] || BG_STYLES.paper,
      }}
    >
      {ready && (
      <Canvas
        shadows
        frameloop="always"
        dpr={[1, 2]}
        camera={{ position: [10, 7, 12], fov: 32 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent' }}
        onCreated={({ invalidate }) => invalidate()}
      >
        <directionalLight
          position={[7, 12, 6]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={1536}
          shadow-mapSize-height={1536}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-6, 4, -4]} intensity={0.45} color="#A5B4FC" />
        <directionalLight position={[0, 2, -10]} intensity={0.35} color="#FDBA74" />
        <ambientLight intensity={0.55} />

        <Scene
          model={resolvedModel}
          currentStep={currentStep}
          annotations={annotations}
          tapMode={tapMode}
          onPartTap={onPartClick}
        />

        <ContactShadows
          position={[0, -0.1, 0]}
          opacity={0.45}
          scale={16}
          blur={2.2}
          far={8}
          resolution={512}
          color="#111827"
        />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={6}
          maxDistance={36}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={autoRotate && !tapMode}
          autoRotateSpeed={0.9}
          target={[0, 1.5, 0]}
        />
      </Canvas>
      )}

      {showControls && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'grid', gap: 6, zIndex: 5 }}>
          <button style={btn} title="Zoom in"     onClick={zoomIn}  aria-label="Zoom in">+</button>
          <button style={btn} title="Zoom out"    onClick={zoomOut} aria-label="Zoom out">−</button>
          <button style={btn} title="Reset view"  onClick={reset}   aria-label="Reset view">⟲</button>
        </div>
      )}
    </div>
  );
}
