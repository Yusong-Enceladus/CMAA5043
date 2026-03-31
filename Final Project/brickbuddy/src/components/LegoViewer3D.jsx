/**
 * LegoViewer3D — Interactive 3D LEGO model viewer using react-three-fiber.
 * Shows a procedural LEGO model that assembles step-by-step with orbit controls.
 * Each robot type (dog/car/dino) has its own geometry built from brick primitives.
 */
import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Environment } from '@react-three/drei';
import * as THREE from 'three';

/* ── LEGO Brick Primitive ────────────────────────────────────── */

const STUD_RADIUS = 0.12;
const STUD_HEIGHT = 0.08;
const UNIT = 0.25; // 1 LEGO unit = 0.25 world units

function Stud({ x, z }) {
  return (
    <mesh position={[x, STUD_HEIGHT / 2, z]} castShadow>
      <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12]} />
      <meshStandardMaterial color="inherit" />
    </mesh>
  );
}

/** A LEGO-style brick: w×h×d in stud units, with studs on top */
function Brick({ position = [0, 0, 0], size = [2, 1, 4], color = '#EF4444', isNew = false }) {
  const [w, h, d] = size;
  const worldW = w * UNIT;
  const worldH = h * UNIT;
  const worldD = d * UNIT;

  // Generate stud positions
  const studs = useMemo(() => {
    const arr = [];
    for (let sx = 0; sx < w; sx++) {
      for (let sz = 0; sz < d; sz++) {
        arr.push({
          x: (sx - (w - 1) / 2) * UNIT,
          z: (sz - (d - 1) / 2) * UNIT,
        });
      }
    }
    return arr;
  }, [w, d]);

  return (
    <group position={position}>
      {/* Main body */}
      <RoundedBox
        args={[worldW, worldH, worldD]}
        radius={0.02}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.05}
          emissive={isNew ? color : '#000000'}
          emissiveIntensity={isNew ? 0.15 : 0}
        />
      </RoundedBox>
      {/* Studs on top */}
      <group position={[0, worldH / 2, 0]}>
        {studs.map((s, i) => (
          <mesh key={i} position={[s.x, STUD_HEIGHT / 2, s.z]} castShadow>
            <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12]} />
            <meshStandardMaterial
              color={color}
              roughness={0.3}
              metalness={0.05}
              emissive={isNew ? color : '#000000'}
              emissiveIntensity={isNew ? 0.15 : 0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A round/cylindrical LEGO piece */
function RoundPiece({ position = [0, 0, 0], radius = 0.12, height = 0.25, color = '#FFF', isNew = false }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[radius, radius, height, 16]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.05}
        emissive={isNew ? color : '#000000'}
        emissiveIntensity={isNew ? 0.15 : 0}
      />
    </mesh>
  );
}

/** A slope/wedge piece for aerodynamic shapes */
function SlopePiece({ position = [0, 0, 0], size = [0.5, 0.25, 0.5], color = '#10B981', rotation = [0, 0, 0], isNew = false }) {
  const geo = useMemo(() => {
    const [w, h, d] = size;
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(d / 2, h);
    shape.lineTo(-d / 2, 0);
    const extrudeSettings = { depth: w, bevelEnabled: false };
    const g = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    g.translate(-w / 2, 0, 0);
    g.rotateY(Math.PI / 2);
    return g;
  }, [size]);

  return (
    <mesh position={position} rotation={rotation} geometry={geo} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.05}
        emissive={isNew ? color : '#000000'}
        emissiveIntensity={isNew ? 0.15 : 0}
      />
    </mesh>
  );
}

/** Wheel piece for robot car */
function Wheel({ position = [0, 0, 0], isNew = false }) {
  return (
    <group position={position}>
      {/* Tire */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.15, 0.06, 8, 16]} />
        <meshStandardMaterial color="#333" roughness={0.8} />
      </mesh>
      {/* Hub */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
        <meshStandardMaterial
          color="#C0C0C0"
          roughness={0.2}
          metalness={0.6}
          emissive={isNew ? '#C0C0C0' : '#000000'}
          emissiveIntensity={isNew ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}

/* ── Robot Dog Model ─────────────────────────────────────────── */

function RobotDog({ step }) {
  return (
    <group position={[0, -0.3, 0]}>
      {/* Step 1: Body Base */}
      {step >= 0 && (
        <group>
          <Brick position={[0, 0, 0]} size={[4, 1, 8]} color="#EF4444" isNew={step === 0} />
          <Brick position={[0, 0.25, 0.25]} size={[2, 1, 4]} color="#3B82F6" isNew={step === 0} />
          <Brick position={[0, 0.25, -0.25]} size={[2, 1, 4]} color="#3B82F6" isNew={step === 0} />
        </group>
      )}
      {/* Step 2: Legs */}
      {step >= 1 && (
        <group>
          {/* Front legs */}
          <Brick position={[-0.375, -0.375, 0.625]} size={[1, 2, 1]} color="#F59E0B" isNew={step === 1} />
          <Brick position={[0.375, -0.375, 0.625]} size={[1, 2, 1]} color="#F59E0B" isNew={step === 1} />
          {/* Back legs */}
          <Brick position={[-0.375, -0.375, -0.625]} size={[1, 2, 1]} color="#F59E0B" isNew={step === 1} />
          <Brick position={[0.375, -0.375, -0.625]} size={[1, 2, 1]} color="#F59E0B" isNew={step === 1} />
          {/* Feet */}
          <Brick position={[-0.375, -0.65, 0.625]} size={[1, 1, 2]} color="#8B5CF6" isNew={step === 1} />
          <Brick position={[0.375, -0.65, 0.625]} size={[1, 1, 2]} color="#8B5CF6" isNew={step === 1} />
          <Brick position={[-0.375, -0.65, -0.625]} size={[1, 1, 2]} color="#8B5CF6" isNew={step === 1} />
          <Brick position={[0.375, -0.65, -0.625]} size={[1, 1, 2]} color="#8B5CF6" isNew={step === 1} />
        </group>
      )}
      {/* Step 3: Head */}
      {step >= 2 && (
        <group position={[0, 0.5, 0.85]}>
          <Brick position={[0, 0, 0]} size={[2, 2, 3]} color="#10B981" isNew={step === 2} />
          {/* Eyes */}
          <RoundPiece position={[-0.15, 0.15, 0.22]} radius={0.08} height={0.06} color="#FFFFFF" isNew={step === 2} />
          <RoundPiece position={[0.15, 0.15, 0.22]} radius={0.08} height={0.06} color="#FFFFFF" isNew={step === 2} />
          <RoundPiece position={[-0.15, 0.15, 0.25]} radius={0.04} height={0.04} color="#1a1a2e" isNew={step === 2} />
          <RoundPiece position={[0.15, 0.15, 0.25]} radius={0.04} height={0.04} color="#1a1a2e" isNew={step === 2} />
          {/* Sensor brick (nose) */}
          <Brick position={[0, -0.05, 0.3]} size={[1, 1, 1]} color="#6366F1" isNew={step === 2} />
        </group>
      )}
      {/* Step 4: Tail */}
      {step >= 3 && (
        <group position={[0, 0.35, -0.9]}>
          <Brick position={[0, 0, 0]} size={[1, 1, 1]} color="#EC4899" isNew={step === 3} />
          <RoundPiece position={[0, 0.15, -0.12]} radius={0.06} height={0.15} color="#F97316" isNew={step === 3} />
          <RoundPiece position={[0, 0.3, -0.2]} radius={0.06} height={0.15} color="#F97316" isNew={step === 3} />
          <RoundPiece position={[0, 0.42, -0.3]} radius={0.06} height={0.15} color="#F97316" isNew={step === 3} />
        </group>
      )}
      {/* Step 5: Decorations */}
      {step >= 4 && (
        <group>
          {/* Collar */}
          <Brick position={[0, 0.38, 0.5]} size={[3, 1, 1]} color="#EF4444" isNew={step === 4} />
          {/* Star on side */}
          <RoundPiece position={[0.55, 0.25, 0]} radius={0.1} height={0.04} color="#F59E0B" isNew={step === 4} />
          {/* Bone accessory near head */}
          <RoundPiece position={[0.4, 0.75, 0.85]} radius={0.05} height={0.2} color="#FFFFFF" isNew={step === 4} />
        </group>
      )}
    </group>
  );
}

/* ── Robot Car Model ─────────────────────────────────────────── */

function RobotCar({ step }) {
  return (
    <group position={[0, -0.15, 0]}>
      {/* Step 1: Chassis */}
      {step >= 0 && (
        <group>
          <Brick position={[0, 0, 0]} size={[4, 1, 10]} color="#3B82F6" isNew={step === 0} />
          <Brick position={[0, 0.25, 0]} size={[3, 1, 8]} color="#3B82F6" isNew={step === 0} />
        </group>
      )}
      {/* Step 2: Wheels */}
      {step >= 1 && (
        <group>
          <Wheel position={[-0.6, -0.15, 0.7]} isNew={step === 1} />
          <Wheel position={[0.6, -0.15, 0.7]} isNew={step === 1} />
          <Wheel position={[-0.6, -0.15, -0.7]} isNew={step === 1} />
          <Wheel position={[0.6, -0.15, -0.7]} isNew={step === 1} />
          {/* Axle bars */}
          <mesh position={[0, -0.15, 0.7]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color="#666" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.15, -0.7]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color="#666" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      )}
      {/* Step 3: Cockpit */}
      {step >= 2 && (
        <group position={[0, 0.5, 0.15]}>
          <Brick position={[0, 0, 0]} size={[3, 2, 4]} color="#10B981" isNew={step === 2} />
          {/* Windshield */}
          <SlopePiece position={[0, 0.15, 0.45]} size={[0.65, 0.35, 0.4]} color="#93C5FD" rotation={[0, 0, 0]} isNew={step === 2} />
          {/* Seat */}
          <Brick position={[0, -0.05, -0.1]} size={[2, 1, 2]} color="#F59E0B" isNew={step === 2} />
        </group>
      )}
      {/* Step 4: Radar */}
      {step >= 3 && (
        <group position={[0, 1, 0.15]}>
          {/* Turntable base */}
          <RoundPiece position={[0, 0, 0]} radius={0.12} height={0.1} color="#F59E0B" isNew={step === 3} />
          {/* Radar pole */}
          <RoundPiece position={[0, 0.15, 0]} radius={0.04} height={0.2} color="#8B5CF6" isNew={step === 3} />
          {/* Sensor dish */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#8B5CF6"
              roughness={0.2}
              metalness={0.3}
              side={THREE.DoubleSide}
              emissive={step === 3 ? '#8B5CF6' : '#000000'}
              emissiveIntensity={step === 3 ? 0.15 : 0}
            />
          </mesh>
        </group>
      )}
      {/* Step 5: Decorations */}
      {step >= 4 && (
        <group>
          {/* Racing stripe */}
          <Brick position={[0, 0.38, -0.3]} size={[1, 1, 6]} color="#EF4444" isNew={step === 4} />
          {/* Spoiler */}
          <Brick position={[0, 0.6, -1]} size={[4, 1, 1]} color="#EF4444" isNew={step === 4} />
          <Brick position={[-0.35, 0.45, -0.85]} size={[1, 1, 1]} color="#EF4444" isNew={step === 4} />
          <Brick position={[0.35, 0.45, -0.85]} size={[1, 1, 1]} color="#EF4444" isNew={step === 4} />
          {/* Headlights */}
          <RoundPiece position={[-0.3, 0.35, 1.1]} radius={0.08} height={0.04} color="#FFE66D" isNew={step === 4} />
          <RoundPiece position={[0.3, 0.35, 1.1]} radius={0.08} height={0.04} color="#FFE66D" isNew={step === 4} />
        </group>
      )}
    </group>
  );
}

/* ── Dino Bot Model ──────────────────────────────────────────── */

function DinoBot({ step }) {
  return (
    <group position={[0, -0.2, 0]}>
      {/* Step 1: Body */}
      {step >= 0 && (
        <group>
          <Brick position={[0, 0, 0]} size={[4, 2, 6]} color="#10B981" isNew={step === 0} />
          <Brick position={[0, 0.35, 0]} size={[3, 1, 5]} color="#10B981" isNew={step === 0} />
        </group>
      )}
      {/* Step 2: Legs */}
      {step >= 1 && (
        <group>
          {/* Front legs - thick */}
          <Brick position={[-0.35, -0.5, 0.4]} size={[2, 2, 2]} color="#10B981" isNew={step === 1} />
          <Brick position={[0.35, -0.5, 0.4]} size={[2, 2, 2]} color="#10B981" isNew={step === 1} />
          {/* Back legs - thick */}
          <Brick position={[-0.35, -0.5, -0.4]} size={[2, 2, 2]} color="#10B981" isNew={step === 1} />
          <Brick position={[0.35, -0.5, -0.4]} size={[2, 2, 2]} color="#10B981" isNew={step === 1} />
          {/* Feet */}
          <Brick position={[-0.35, -0.8, 0.5]} size={[2, 1, 3]} color="#059669" isNew={step === 1} />
          <Brick position={[0.35, -0.8, 0.5]} size={[2, 1, 3]} color="#059669" isNew={step === 1} />
          <Brick position={[-0.35, -0.8, -0.5]} size={[2, 1, 3]} color="#059669" isNew={step === 1} />
          <Brick position={[0.35, -0.8, -0.5]} size={[2, 1, 3]} color="#059669" isNew={step === 1} />
        </group>
      )}
      {/* Step 3: Neck */}
      {step >= 2 && (
        <group position={[0, 0.5, 0.6]}>
          <Brick position={[0, 0, 0]} size={[2, 2, 2]} color="#34D399" isNew={step === 2} />
          <Brick position={[0, 0.35, 0.15]} size={[2, 2, 2]} color="#34D399" isNew={step === 2} />
          <Brick position={[0, 0.65, 0.3]} size={[2, 1, 2]} color="#34D399" isNew={step === 2} />
          <Brick position={[0, 0.9, 0.45]} size={[2, 1, 2]} color="#34D399" isNew={step === 2} />
        </group>
      )}
      {/* Step 4: Head with jaw */}
      {step >= 3 && (
        <group position={[0, 1.5, 1.2]}>
          {/* Upper head */}
          <Brick position={[0, 0.05, 0]} size={[3, 2, 4]} color="#10B981" isNew={step === 3} />
          {/* Lower jaw */}
          <Brick position={[0, -0.2, 0.15]} size={[2, 1, 3]} color="#10B981" isNew={step === 3} />
          {/* Teeth */}
          <RoundPiece position={[-0.2, -0.1, 0.35]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[0, -0.1, 0.38]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[0.2, -0.1, 0.35]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[-0.15, 0.05, 0.38]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[0.05, 0.05, 0.4]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[0.25, 0.05, 0.38]} radius={0.04} height={0.1} color="#FFFFFF" isNew={step === 3} />
          {/* Eyes */}
          <RoundPiece position={[-0.2, 0.2, 0.28]} radius={0.07} height={0.04} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[0.2, 0.2, 0.28]} radius={0.07} height={0.04} color="#FFFFFF" isNew={step === 3} />
          <RoundPiece position={[-0.2, 0.2, 0.3]} radius={0.035} height={0.03} color="#1a1a2e" isNew={step === 3} />
          <RoundPiece position={[0.2, 0.2, 0.3]} radius={0.035} height={0.03} color="#1a1a2e" isNew={step === 3} />
        </group>
      )}
      {/* Step 5: Tail with spikes */}
      {step >= 4 && (
        <group position={[0, 0.15, -0.8]}>
          <Brick position={[0, 0, 0]} size={[2, 2, 3]} color="#10B981" isNew={step === 4} />
          <Brick position={[0, -0.05, -0.4]} size={[2, 1, 2]} color="#10B981" isNew={step === 4} />
          <Brick position={[0, -0.1, -0.7]} size={[1, 1, 2]} color="#10B981" isNew={step === 4} />
          {/* Spikes */}
          <RoundPiece position={[0, 0.25, -0.1]} radius={0.06} height={0.2} color="#F59E0B" isNew={step === 4} />
          <RoundPiece position={[0, 0.18, -0.45]} radius={0.05} height={0.15} color="#F59E0B" isNew={step === 4} />
          <RoundPiece position={[0, 0.1, -0.75]} radius={0.04} height={0.12} color="#F59E0B" isNew={step === 4} />
        </group>
      )}
    </group>
  );
}

/* ── Ground Plate ────────────────────────────────────────────── */

function GroundPlate() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial color="#E8E0D8" roughness={0.9} />
    </mesh>
  );
}

/* ── Main Viewer Component ───────────────────────────────────── */

export default function LegoViewer3D({ modelId, currentStep }) {
  const ModelComponent = {
    dog: RobotDog,
    car: RobotCar,
    dino: DinoBot,
  }[modelId] || RobotDog;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 220, borderRadius: 16, overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [2.5, 2, 2.5], fov: 40 }}
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(180deg, #FFF5EE 0%, #FFE8D6 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 4, -3]} intensity={0.4} />

        <ModelComponent step={currentStep} />
        <GroundPlate />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={6}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
}
