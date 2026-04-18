/**
 * LegoViewer3D — Data-driven 3D LEGO model viewer.
 *
 * Reads `newParts` arrays from the model and renders cumulative bricks for steps
 * 0..currentStep. Newly-added parts at the current step pulse with an emissive
 * highlight so kids see what they just built.
 *
 * Part schema (all types):
 *   { type, pos:[x,y,z], size:[w,h,d], color, opacity?, rotation?:[rx,ry,rz] }
 * - pos is the CENTER of the part.
 * - size is the AXIS-ALIGNED bounding box BEFORE rotation.
 * - rotation is applied AROUND the center; geometry must be centered on its local origin.
 */
import { useMemo, useRef } from 'react';
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
  // Cap stud count so very large plates stay cheap.
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
 * Slope — a right-triangular prism centered on its local origin, with the peak
 * edge along the -Z face (the "front" of the slope). Before the user's part
 * rotation is applied, the local bounding box is:
 *   X ∈ [-w/2, w/2]  (width)
 *   Y ∈ [-h/2, h/2]  (height)
 *   Z ∈ [-d/2, d/2]  (depth, peak at Z=-d/2, base at Z=+d/2)
 */
function Slope({ part }) {
  const [w, h, d] = part.size;
  const op = part.opacity ?? 1;
  const geo = useMemo(() => {
    // 6 vertices of the triangular prism
    const positions = new Float32Array([
      // Left end (X = -w/2)
      -w / 2, -h / 2, -d / 2, // 0: bottom-front
      -w / 2, -h / 2,  d / 2, // 1: bottom-back
      -w / 2,  h / 2, -d / 2, // 2: top-front (peak)
      // Right end (X = +w/2)
       w / 2, -h / 2, -d / 2, // 3: bottom-front
       w / 2, -h / 2,  d / 2, // 4: bottom-back
       w / 2,  h / 2, -d / 2, // 5: top-front (peak)
    ]);
    // Faces — counterclockwise when viewed from OUTSIDE (normal points away).
    const indices = new Uint16Array([
      // Left triangle (normal -X): order so that 0→2→1 is CCW from -X viewer
      0, 2, 1,
      // Right triangle (normal +X): 3→4→5 CCW from +X viewer
      3, 4, 5,
      // Bottom (normal -Y): 0→1→4, 0→4→3  (CCW from below)
      0, 1, 4,  0, 4, 3,
      // Front (normal -Z): 0→3→5, 0→5→2 (CCW from -Z viewer)
      0, 3, 5,  0, 5, 2,
      // Slanted top (normal roughly +Y+Z): 2→5→4, 2→4→1 (CCW from above/behind)
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

function Part({ part, isNew }) {
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
  return (
    <PulseGroup isNew={isNew} color={part.color}>
      {mesh}
    </PulseGroup>
  );
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Scene({ model, currentStep }) {
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
        <Part key={p._id} part={p} isNew={newIds.has(p._id)} />
      ))}
    </group>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

export default function LegoViewer3D({ model, modelId, currentStep }) {
  // Prefer the live `model` prop so custom/recolored models render.
  // Fall back to looking up a preset by id if only `modelId` was passed.
  const resolvedModel = useMemo(() => {
    if (model) return model;
    if (!modelId) return null;
    return robotModels.find((m) => m.id === modelId) || null;
  }, [model, modelId]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 260,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [10, 7, 12], fov: 32 }}
        gl={{ antialias: true }}
        style={{
          background: 'linear-gradient(180deg, #FFF6EC 0%, #FFE0CC 55%, #FFD4BA 100%)',
        }}
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

        <Scene model={resolvedModel} currentStep={currentStep} />

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
          enablePan={false}
          minDistance={7}
          maxDistance={22}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={0.9}
          target={[0, 1.5, 0]}
        />
      </Canvas>
    </div>
  );
}
