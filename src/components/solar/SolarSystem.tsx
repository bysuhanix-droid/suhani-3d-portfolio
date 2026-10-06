import { Html, Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Planet } from './Planet';
import { SOLAR_BODIES, SUN_RADIUS, computeOrbitPosition, type BodyDef } from './planetData';
import { Sun } from './Sun';

/* ------------------------------------------------------------------ */
/* Asteroid belt                                                       */
/* ------------------------------------------------------------------ */

function AsteroidRing({
  count,
  innerR,
  outerR,
  speed,
  simTimeRef,
}: {
  count: number;
  innerR: number;
  outerR: number;
  speed: number;
  simTimeRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = innerR + Math.pow(Math.random(), 0.75) * (outerR - innerR);
      const y = (Math.random() - 0.5) * 0.9 * (1 - Math.abs(r - (innerR + outerR) / 2) / (outerR - innerR));
      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      dummy.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      const s = 0.012 + Math.pow(Math.random(), 2.4) * 0.075;
      dummy.scale.set(s, s * (0.6 + Math.random() * 0.6), s * (0.7 + Math.random() * 0.5));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, innerR, outerR]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y = simTimeRef.current * speed;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4e463c" roughness={1} metalness={0.02} flatShading />
      </instancedMesh>
    </group>
  );
}

function AsteroidBelt({ simTimeRef }: { simTimeRef: React.MutableRefObject<number> }) {
  return (
    <group>
      <AsteroidRing count={420} innerR={19.4} outerR={20.9} speed={0.020} simTimeRef={simTimeRef} />
      <AsteroidRing count={420} innerR={20.9} outerR={22.3} speed={0.016} simTimeRef={simTimeRef} />
      <AsteroidRing count={320} innerR={22.3} outerR={23.6} speed={0.013} simTimeRef={simTimeRef} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Orbit guide line                                                    */
/* ------------------------------------------------------------------ */

function OrbitPath({ def, highlighted }: { def: BodyDef; highlighted: boolean }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const v = new THREE.Vector3();
    const segments = 260;
    for (let i = 0; i <= segments; i++) {
      computeOrbitPosition({ ...def, phase: (i / segments) * Math.PI * 2 }, 0, v);
      pts.push([v.x, v.y, v.z]);
    }
    return pts;
  }, [def]);

  return (
    <Line
      points={points}
      color={highlighted ? '#9CC3FF' : '#4C6FA8'}
      transparent
      opacity={highlighted ? 0.55 : 0.18}
      lineWidth={highlighted ? 1.4 : 1}
      depthWrite={false}
    />
  );
}

/* ------------------------------------------------------------------ */
/* One orbiting body + its marker                                      */
/* ------------------------------------------------------------------ */

function OrbitingBody({
  def,
  simTimeRef,
  selected,
  showLabel,
  onSelect,
}: {
  def: BodyDef;
  simTimeRef: React.MutableRefObject<number>;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    computeOrbitPosition(def, simTimeRef.current, g.position as unknown as THREE.Vector3);
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(def.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <Planet def={def} simTimeRef={simTimeRef} />

      {showLabel && (
        <Html
          position={[0, def.radius * 1.35 + 0.22, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(def.id);
            }}
            className={`group flex items-center gap-2 px-2 py-1 rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer whitespace-nowrap ${
              selected
                ? 'bg-[#0c1428]/85 border-[#7BA4FF]/60 shadow-[0_0_18px_rgba(123,164,255,0.35)]'
                : 'bg-[#080B16]/45 border-white/10 hover:border-[#7BA4FF]/50 hover:bg-[#0c1428]/70'
            }`}
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  selected ? 'animate-ping bg-[#38BDF8] opacity-70' : 'bg-[#7BA4FF]/30'
                }`}
              />
              <span className="relative inline-flex rounded-full h-1 w-1 bg-[#F4F7FF] shadow-[0_0_6px_#7BA4FF]" />
            </span>
            <span className="font-display text-[10px] font-medium tracking-wide text-[#F4F7FF]">
              {def.name}
            </span>
            <span className="font-mono-tech text-[8px] tracking-wider text-[#94A3B8] uppercase hidden sm:inline">
              {def.chapter}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig                                                          */
/* ------------------------------------------------------------------ */

// Kept inside the Milky Way dome (r = 86) so the galactic backdrop always surrounds the orrery
const ENTRY_POSITION = new THREE.Vector3(5, 28.5, 60);
const _bodyPos = new THREE.Vector3();
const _prevTarget = new THREE.Vector3();
const _dir = new THREE.Vector3();

function SolarCameraRig({
  focusId,
  simTimeRef,
  onUserInteract,
}: {
  focusId: string | null;
  simTimeRef: React.MutableRefObject<number>;
  onUserInteract: () => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const entryRef = useRef(true);
  const lockRef = useRef(false);

  // Never let the viewer drift outside the Milky Way dome (r = 86) while tracking
  const maxDistance = useMemo(() => {
    const def = SOLAR_BODIES.find((b) => b.id === focusId);
    if (!def) return 78;
    return THREE.MathUtils.clamp(80 - def.distance, 12, 78);
  }, [focusId]);

  useEffect(() => {
    // Pull the viewer out of the star sphere and into the ecliptic on entry
    entryRef.current = true;
    camera.near = 0.05;
    camera.far = 400;
    camera.updateProjectionMatrix();

    // The sky view leaves the camera ~8 units from origin — that is *inside* the
    // corona, so push it out along its current bearing before the fly-out starts.
    const dir = camera.position.clone();
    if (dir.lengthSq() < 0.001) dir.set(0.1, 0.45, 1);
    dir.normalize();
    camera.position.copy(dir.multiplyScalar(26)).add(new THREE.Vector3(0, 3, 0));
    camera.lookAt(0, 0, 0);
    return () => {
      camera.near = 0.1;
      camera.far = 200;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  useEffect(() => {
    lockRef.current = true;
  }, [focusId]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05);

    // --- Opening fly-out
    if (entryRef.current) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, ENTRY_POSITION.x, 1.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, ENTRY_POSITION.y, 1.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, ENTRY_POSITION.z, 1.5, dt);
      if (camera.position.distanceTo(ENTRY_POSITION) < 1.2) entryRef.current = false;
    }

    // --- Where should we be looking?
    _prevTarget.copy(controls.target);
    let desiredDistance = 0;

    if (focusId && focusId !== 'sun') {
      const def = SOLAR_BODIES.find((b) => b.id === focusId);
      if (def) {
        computeOrbitPosition(def, simTimeRef.current, _bodyPos);
        desiredDistance = Math.max(def.radius * 7.5, 1.6);
      }
    } else if (focusId === 'sun') {
      _bodyPos.set(0, 0, 0);
      desiredDistance = SUN_RADIUS * 4.2;
    } else {
      _bodyPos.set(0, 0, 0);
    }

    if (!entryRef.current) {
      controls.target.lerp(_bodyPos, 1 - Math.exp(-4.2 * dt));
      // Carry the camera along with the target so the framing stays stable
      camera.position.add(_dir.copy(controls.target).sub(_prevTarget));

      if (lockRef.current && desiredDistance > 0) {
        _dir.copy(camera.position).sub(controls.target);
        const len = _dir.length();
        const next = THREE.MathUtils.damp(len, desiredDistance, 1.9, dt);
        camera.position.copy(controls.target).addScaledVector(_dir.normalize(), next);
        if (Math.abs(next - desiredDistance) < desiredDistance * 0.04) lockRef.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.52}
      zoomSpeed={0.9}
      panSpeed={0.5}
      enablePan
      minDistance={0.35}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI * 0.94}
      minPolarAngle={Math.PI * 0.06}
      onStart={() => {
        entryRef.current = false;
        lockRef.current = false;
        onUserInteract();
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */

export interface SolarSystemProps {
  focusId: string | null;
  onFocus: (id: string) => void;
  onUserInteract: () => void;
  timeScale: number;
  paused: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  showBelt: boolean;
}

export function SolarSystemScene({
  focusId,
  onFocus,
  onUserInteract,
  timeScale,
  paused,
  showOrbits,
  showLabels,
  showBelt,
}: SolarSystemProps) {
  const simTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (!paused) simTimeRef.current += Math.min(delta, 0.05) * timeScale;
  });

  return (
    <group>
      <ambientLight intensity={0.16} color="#33456b" />

      <Sun radius={SUN_RADIUS} simTimeRef={simTimeRef} />

      {showLabels && (
        <Html position={[0, SUN_RADIUS * 1.45, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'auto' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocus('sun');
            }}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border backdrop-blur-md transition-all cursor-pointer whitespace-nowrap ${
              focusId === 'sun'
                ? 'bg-[#2a1405]/85 border-[#FFB454]/60 shadow-[0_0_20px_rgba(255,180,84,0.35)]'
                : 'bg-[#080B16]/45 border-white/10 hover:border-[#FFB454]/50'
            }`}
          >
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FFD9A0] shadow-[0_0_8px_#FF8A20]" />
            <span className="font-display text-[10px] font-medium tracking-wide text-[#F4F7FF]">Sol</span>
            <span className="font-mono-tech text-[8px] tracking-wider text-[#F59E0B] uppercase">G2V</span>
          </button>
        </Html>
      )}

      {showOrbits &&
        SOLAR_BODIES.map((def) => (
          <OrbitPath key={`orbit-${def.id}`} def={def} highlighted={focusId === def.id} />
        ))}

      {SOLAR_BODIES.map((def) => (
        <OrbitingBody
          key={def.id}
          def={def}
          simTimeRef={simTimeRef}
          selected={focusId === def.id}
          showLabel={showLabels || focusId === def.id}
          onSelect={onFocus}
        />
      ))}

      {showBelt && <AsteroidBelt simTimeRef={simTimeRef} />}

      <SolarCameraRig focusId={focusId} simTimeRef={simTimeRef} onUserInteract={onUserInteract} />
    </group>
  );
}
