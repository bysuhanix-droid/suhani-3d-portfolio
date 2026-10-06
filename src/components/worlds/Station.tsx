import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { StationKind } from './worldData';

const HULL = '#cfd6e4';

export function Station({
  kind, accent, position,
}: {
  kind: StationKind;
  accent: string;
  position: [number, number, number];
}) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const blink = useRef<THREE.MeshStandardMaterial>(null);
  const floating = kind === 'platform' || kind === 'archive' || kind === 'dish' || kind === 'torus';

  useEffect(() => {
    root.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
  }, []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * (kind === 'torus' ? 0.25 : 0.18);
    if (root.current && floating) root.current.position.y = position[1] + Math.sin(t * 0.6) * 1.6;
    if (blink.current) blink.current.emissiveIntensity = 1 + 3 * Math.max(0, Math.sin(t * 3));
  });

  const hull = <meshStandardMaterial color={HULL} metalness={0.6} roughness={0.35} />;
  const glow = <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} />;

  return (
    <group ref={root} position={position}>
      {kind === 'dome' && (
        <>
          <mesh position={[0, 2, 0]}><cylinderGeometry args={[13, 15, 4, 32]} />{hull}</mesh>
          <mesh position={[0, 4, 0]}><sphereGeometry args={[11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{hull}</mesh>
          <mesh position={[0, 10, 6]} rotation={[0.5, 0, 0]}><boxGeometry args={[3, 12, 2]} />{glow}</mesh>
          <mesh position={[0, 4.4, 0]} rotation={[0, 0, 0]}><torusGeometry args={[11.2, 0.35, 8, 48]} />{glow}</mesh>
          <mesh position={[0, -3, 0]}><cylinderGeometry args={[18, 22, 6, 24]} /><meshStandardMaterial color="#555b66" roughness={1} /></mesh>
        </>
      )}

      {kind === 'base' && (
        <>
          <mesh position={[0, 3.5, 0]}><boxGeometry args={[16, 7, 11]} />{hull}</mesh>
          <mesh position={[-14, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[2.6, 2.6, 14, 20]} />{hull}</mesh>
          <mesh position={[11, 2.5, 8]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.6, 2.6, 12, 20]} />{hull}</mesh>
          <mesh position={[0, 5, 5.6]}><boxGeometry args={[12, 1.2, 0.2]} />{glow}</mesh>
          <mesh position={[6, 14, -2]}><cylinderGeometry args={[0.25, 0.25, 16, 8]} />{hull}</mesh>
          <mesh position={[6, 22.5, -2]}><sphereGeometry args={[0.8, 12, 12]} /><meshStandardMaterial ref={blink} color={accent} emissive={accent} /></mesh>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[26, 26, 0.4, 32]} /><meshStandardMaterial color="#444" roughness={1} /></mesh>
        </>
      )}

      {kind === 'platform' && (
        <>
          <mesh><cylinderGeometry args={[17, 14, 3, 32]} />{hull}</mesh>
          <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[16, 0.5, 8, 48]} />{glow}</mesh>
          <mesh position={[0, 8, 0]}><cylinderGeometry args={[3, 4, 14, 16]} />{hull}</mesh>
          <mesh position={[0, 16, 0]}><sphereGeometry args={[4.5, 20, 16]} />{glow}</mesh>
          <mesh position={[0, -3.2, 0]}><cylinderGeometry args={[12, 4, 4, 24]} />{glow}</mesh>
          <mesh position={[11, 3, 0]}><boxGeometry args={[6, 4, 5]} />{hull}</mesh>
        </>
      )}

      {kind === 'archive' && (
        <>
          <mesh><octahedronGeometry args={[4.5, 0]} />{glow}</mesh>
          <group ref={spin}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 15, ((i % 3) - 1) * 5, Math.sin(a) * 15]} rotation={[0, -a, 0]}>
                  <boxGeometry args={[1.2, 14, 6]} />
                  <meshStandardMaterial color="#1b3a4a" emissive={accent} emissiveIntensity={0.5} metalness={0.7} roughness={0.25} />
                </mesh>
              );
            })}
          </group>
        </>
      )}

      {kind === 'dish' && (
        <>
          <mesh position={[0, 0, 0]}><cylinderGeometry args={[2.5, 3, 14, 12]} />{hull}</mesh>
          <group position={[0, 10, 0]} rotation={[-0.9, 0.6, 0]}>
            <mesh><sphereGeometry args={[16, 32, 12, 0, Math.PI * 2, 0, 0.9]} /><meshStandardMaterial color={HULL} metalness={0.7} roughness={0.3} side={THREE.DoubleSide} /></mesh>
            <mesh position={[0, 11, 0]}><cylinderGeometry args={[0.3, 0.3, 10, 6]} />{hull}</mesh>
          </group>
          <mesh position={[0, 9, 0]}><sphereGeometry args={[2, 12, 12]} /><meshStandardMaterial ref={blink} color={accent} emissive={accent} /></mesh>
          <mesh position={[0, -9, 0]}><cylinderGeometry args={[9, 5, 5, 20]} />{hull}</mesh>
        </>
      )}

      {kind === 'torus' && (
        <>
          <group ref={spin}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[22, 2.6, 16, 64]} />{hull}</mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[22, 2.7, 6, 64, Math.PI / 3]} />{glow}</mesh>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, (i * Math.PI) / 4, 0]}><boxGeometry args={[44, 0.6, 0.6]} />{hull}</mesh>
            ))}
          </group>
          <mesh><sphereGeometry args={[5.5, 24, 16]} />{hull}</mesh>
          <mesh position={[0, 8, 0]}><cylinderGeometry args={[0.4, 0.4, 10, 6]} />{glow}</mesh>
          <mesh position={[-9, 0, 0]}><boxGeometry args={[0.3, 12, 22]} /><meshStandardMaterial color="#1c3a7a" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[9, 0, 0]}><boxGeometry args={[0.3, 12, 22]} /><meshStandardMaterial color="#1c3a7a" metalness={0.8} roughness={0.3} /></mesh>
        </>
      )}

      {/* faint beacon so a curious explorer can spot it; the prompt only appears up close */}
      <mesh position={[0, 140, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 280, 8, 1, true]} />
        <meshBasicMaterial color={accent} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color={accent} intensity={3000} distance={170} decay={2} position={[0, 12, 0]} />
    </group>
  );
}
