import { Html, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GALACTIC_EULER } from './StarField';

export interface TelemetryData {
  ra: string;
  dec: string;
  galLon: string;
  galLat: string;
  fov: string;
}

export interface CelestialTarget {
  id: string;
  name: string;
  designation: string;
  distance: string;
  description: string;
  // Camera position on the inner sphere looking through origin (0,0,0) toward the target
  cameraPosition: [number, number, number];
  // 3D position on the celestial sphere for the marker
  worldPosition: [number, number, number];
}

// Compute world positions rotated by the Galactic Plane Euler so markers sit accurately on the Milky Way
const galQuat = new THREE.Quaternion().setFromEuler(GALACTIC_EULER);

function makeGalacticPoint(lonDeg: number, latDeg: number, radius = 64): [number, number, number] {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  const v = new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon)
  );
  v.applyQuaternion(galQuat);
  return [v.x, v.y, v.z];
}

function makeCameraPosForTarget(worldPos: [number, number, number], camDist = 8): [number, number, number] {
  const v = new THREE.Vector3(...worldPos).normalize().multiplyScalar(-camDist);
  return [v.x, v.y, v.z];
}

const sgrCoreWorld = makeGalacticPoint(-90, 0, 66);
const cygnusRiftWorld = makeGalacticPoint(-35, 2.5, 66);
const carinaArmWorld = makeGalacticPoint(-148, -1.8, 66);
const pleiadesWorld: [number, number, number] = [-32, 22, -55];
const deepZenithWorld = makeGalacticPoint(-90, 68, 66);

export const CELESTIAL_TARGETS: CelestialTarget[] = [
  {
    id: 'galactic-core',
    name: 'Galactic Core',
    designation: 'SGR A* · NGC 6522',
    distance: '26,670 LY',
    description: 'Dense Sagittarius-Scorpius central bulge & dark interstellar dust lanes',
    worldPosition: sgrCoreWorld,
    cameraPosition: makeCameraPosForTarget(sgrCoreWorld, 8),
  },
  {
    id: 'cygnus-rift',
    name: 'Cygnus Rift',
    designation: 'GREAT RIFT · NGC 7000',
    distance: '2,590 LY',
    description: 'Overlapping molecular dust clouds dividing the bright Milky Way river',
    worldPosition: cygnusRiftWorld,
    cameraPosition: makeCameraPosForTarget(cygnusRiftWorld, 8),
  },
  {
    id: 'carina-nebula',
    name: 'Carina Spiral Arm',
    designation: 'NGC 3372 · H-II REGION',
    distance: '8,500 LY',
    description: 'Ionized hydrogen star-forming clouds and blue supergiant associations',
    worldPosition: carinaArmWorld,
    cameraPosition: makeCameraPosForTarget(carinaArmWorld, 8),
  },
  {
    id: 'pleiades-cluster',
    name: 'Pleiades Cluster',
    designation: 'M45 · TAURUS OB1',
    distance: '444 LY',
    description: 'Hot B-type blue luminous open cluster surrounded by faint reflection dust',
    worldPosition: pleiadesWorld,
    cameraPosition: makeCameraPosForTarget(pleiadesWorld, 8),
  },
  {
    id: 'galactic-halo',
    name: 'North Galactic Halo',
    designation: 'DEEP FIELD ZENITH',
    distance: 'EXTRAGALACTIC',
    description: 'High-latitude celestial vault looking out above the Milky Way disk',
    worldPosition: deepZenithWorld,
    cameraPosition: makeCameraPosForTarget(deepZenithWorld, 8),
  },
];

interface CelestialRigProps {
  autoRotate: boolean;
  autoRotateSpeed: number;
  selectedTargetId: string | null;
  onClearTarget: () => void;
  showGuides: boolean;
  onSelectGuideTarget: (id: string) => void;
  onUpdateTelemetry: (data: TelemetryData) => void;
  isExpanded?: boolean;
}

export function CelestialRig({
  autoRotate,
  autoRotateSpeed,
  selectedTargetId,
  onClearTarget,
  showGuides,
  onSelectGuideTarget,
  onUpdateTelemetry,
  isExpanded = true,
}: CelestialRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const desiredCamPos = useRef<THREE.Vector3 | null>(null);
  const isSlewing = useRef(false);
  const lastTelemetryTime = useRef(0);

  // Set initial camera orientation to gaze directly toward the Sagittarius Galactic Core
  useEffect(() => {
    const initial = CELESTIAL_TARGETS[0].cameraPosition;
    camera.position.set(initial[0], initial[1], initial[2]);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // When returning to the "Suhani" intro state, smoothly align camera back to initial view
  useEffect(() => {
    if (!isExpanded) {
      const initial = CELESTIAL_TARGETS[0].cameraPosition;
      desiredCamPos.current = new THREE.Vector3(initial[0], initial[1], initial[2]);
      isSlewing.current = true;
    }
  }, [isExpanded]);

  // Trigger smooth camera slew when user clicks a preset target
  useEffect(() => {
    if (!isExpanded) return;
    if (!selectedTargetId) {
      isSlewing.current = false;
      return;
    }
    const found = CELESTIAL_TARGETS.find((t) => t.id === selectedTargetId);
    if (found) {
      const currentDist = Math.max(4, Math.min(camera.position.length(), 16));
      const targetPos = new THREE.Vector3(...found.cameraPosition)
        .normalize()
        .multiplyScalar(currentDist);
      desiredCamPos.current = targetPos;
      isSlewing.current = true;
    }
  }, [selectedTargetId, camera, isExpanded]);

  useFrame((state, delta) => {
    // 1. Handle smooth motorized telescope slewing
    if (isSlewing.current && desiredCamPos.current) {
      camera.position.lerp(desiredCamPos.current, Math.min(1, delta * 3.8));
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(desiredCamPos.current) < 0.06) {
        isSlewing.current = false;
      }
    }

    // 2. Compute live Right Ascension (RA) & Declination (DEC) at ~12Hz
    const now = state.clock.elapsedTime;
    if (now - lastTelemetryTime.current > 0.085) {
      lastTelemetryTime.current = now;

      const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

      // Declination (-90° to +90°)
      const decRad = Math.asin(THREE.MathUtils.clamp(lookDir.y, -1, 1));
      const decDegTotal = THREE.MathUtils.radToDeg(decRad);
      const decSign = decDegTotal >= 0 ? '+' : '-';
      const absDec = Math.abs(decDegTotal);
      const decDeg = Math.floor(absDec);
      const decMin = Math.floor((absDec - decDeg) * 60);
      const decSec = Math.floor(((absDec - decDeg) * 60 - decMin) * 60);

      // Right Ascension (00h to 24h)
      let raRad = Math.atan2(lookDir.x, -lookDir.z);
      if (raRad < 0) raRad += Math.PI * 2;
      const raHoursTotal = (raRad / (Math.PI * 2)) * 24;
      const raH = Math.floor(raHoursTotal);
      const raM = Math.floor((raHoursTotal - raH) * 60);
      const raS = Math.floor(((raHoursTotal - raH) * 60 - raM) * 60);

      // Galactic Longitude & Latitude
      const invGal = galQuat.clone().invert();
      const galDir = lookDir.clone().applyQuaternion(invGal);
      const galLatDeg = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(galDir.y, -1, 1)));
      let galLonDeg = THREE.MathUtils.radToDeg(Math.atan2(galDir.z, galDir.x)) + 90;
      if (galLonDeg < 0) galLonDeg += 360;

      const camDist = camera.position.length();
      const effectiveFov = Math.round(60 * (camDist / 8));

      onUpdateTelemetry({
        ra: `${String(raH).padStart(2, '0')}h ${String(raM).padStart(2, '0')}m ${String(raS).padStart(2, '0')}s`,
        dec: `${decSign}${String(decDeg).padStart(2, '0')}° ${String(decMin).padStart(2, '0')}' ${String(decSec).padStart(2, '0')}"`,
        galLon: `${galLonDeg.toFixed(1)}°`,
        galLat: `${galLatDeg >= 0 ? '+' : ''}${galLatDeg.toFixed(1)}°`,
        fov: `${THREE.MathUtils.clamp(effectiveFov, 24, 110)}°`,
      });
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={isExpanded}
        enableDamping
        dampingFactor={0.038}
        rotateSpeed={0.55}
        zoomSpeed={0.75}
        enablePan={false}
        minDistance={2.5}
        maxDistance={22}
        autoRotate={isExpanded && autoRotate && !isSlewing.current}
        autoRotateSpeed={autoRotateSpeed}
        onStart={() => {
          if (isSlewing.current) {
            isSlewing.current = false;
            onClearTarget();
          }
        }}
      />

      {/* Optional Astronomical Celestial Guides Overlay in 3D Space */}
      {isExpanded &&
        showGuides &&
        CELESTIAL_TARGETS.map((target) => {
          const isSelected = selectedTargetId === target.id;
          return (
            <group key={target.id} position={target.worldPosition}>
              <Html center distanceFactor={68} zIndexRange={[10, 0]}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGuideTarget(target.id);
                  }}
                  className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer backdrop-blur-md border ${
                    isSelected
                      ? 'bg-[#0c1428]/85 border-[#7BA4FF]/60 shadow-[0_0_20px_rgba(123,164,255,0.35)]'
                      : 'bg-[#080B16]/55 border-white/15 hover:border-[#7BA4FF]/50 hover:bg-[#0c1428]/75'
                  }`}
                >
                  {/* Precision Astronomical Crosshair Reticle */}
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
                        isSelected ? 'animate-ping bg-[#38BDF8]' : 'bg-[#7BA4FF]/40 group-hover:bg-[#38BDF8]/60'
                      }`}
                    />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F4F7FF] shadow-[0_0_8px_#7BA4FF]" />
                  </span>

                  <div className="text-left pr-1 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-[11px] font-medium tracking-wide text-[#F4F7FF]">
                        {target.name}
                      </span>
                      <span className="font-mono-tech text-[9px] text-[#7BA4FF] opacity-90">
                        {target.distance}
                      </span>
                    </div>
                    <div className="font-mono-tech text-[9px] tracking-wider text-[#94A3B8] uppercase">
                      {target.designation}
                    </div>
                  </div>
                </button>
              </Html>
            </group>
          );
        })}
    </>
  );
}
