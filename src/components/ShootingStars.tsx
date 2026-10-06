import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cosmicAudio } from '../utils/cosmicAudio';

export type MeteorFrequencyMode = 'calm' | 'perseids' | 'storm';

interface ShootingStarsProps {
  frequencyMode: MeteorFrequencyMode;
  manualTriggerCount: number;
  onMeteorObserved?: () => void;
  enabled?: boolean;
}

interface SingleMeteorProps {
  index: number;
  frequencyMode: MeteorFrequencyMode;
  forceSpawnSignal: number;
  onMeteorObserved?: () => void;
  enabled: boolean;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

function SingleShootingStar({
  index,
  frequencyMode,
  forceSpawnSignal,
  onMeteorObserved,
  enabled,
}: SingleMeteorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tailMatRef = useRef<THREE.ShaderMaterial>(null);
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();

  const state = useMemo(() => {
    // Stagger initial appearances so there is an early shooting star soon after load
    const initialDelay = index === 0 ? 1.5 : index === 1 ? 4.2 : 3.0 + index * 3.8;
    return {
      timer: -initialDelay,
      start: new THREE.Vector3(),
      direction: new THREE.Vector3(-1, -0.4, 0).normalize(),
      speed: 42,
      maxDistance: 38,
      tailLength: 5.8,
      active: false,
      isBolide: false,
      colorTint: new THREE.Color('#38BDF8'),
      lastForceSignal: 0,
    };
  }, [index]);

  const getWaitDelay = (mode: MeteorFrequencyMode) => {
    if (mode === 'storm') return 0.35 + Math.random() * 1.8;
    if (mode === 'perseids') return 1.4 + Math.random() * 4.2;
    // calm mode
    return 4.5 + Math.random() * 11.0;
  };

  const spawnMeteor = (inCameraView: boolean) => {
    // Get camera forward, right, and up vectors so distant meteors appear naturally across the sky
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    const distance = 44 + Math.random() * 20;

    if (inCameraView) {
      // Spawn bolide clearly inside the user's current camera frustum
      const offsetRight = (0.22 + Math.random() * 0.32) * (Math.random() > 0.25 ? 1 : -1);
      const offsetUp = 0.12 + Math.random() * 0.26;

      state.start
        .copy(forward)
        .multiplyScalar(distance)
        .addScaledVector(right, distance * offsetRight)
        .addScaledVector(up, distance * offsetUp);

      // Streak diagonally across the camera's field of view
      const moveRight = offsetRight > 0 ? -0.78 - Math.random() * 0.25 : 0.78 + Math.random() * 0.25;
      const moveDown = -0.32 - Math.random() * 0.25;
      state.direction
        .set(0, 0, 0)
        .addScaledVector(right, moveRight)
        .addScaledVector(up, moveDown)
        .addScaledVector(forward, (Math.random() - 0.5) * 0.2)
        .normalize();

      state.speed = 46 + Math.random() * 16;
      state.maxDistance = 38 + Math.random() * 12;
      state.tailLength = 7.5 + Math.random() * 3.0;
      state.isBolide = true;
      state.colorTint.set(Math.random() > 0.35 ? '#38BDF8' : '#6EE7B7');
      cosmicAudio.playMeteorShimmer();
    } else {
      // 70% chance to spawn within the wider hemisphere the user is looking at so distant meteors are rewarding
      const inFrontHemisphere = Math.random() < 0.75;
      if (inFrontHemisphere) {
        const horizSpread = (Math.random() - 0.15) * 0.85;
        const vertSpread = (Math.random() - 0.1) * 0.55;
        state.start
          .copy(forward)
          .multiplyScalar(distance)
          .addScaledVector(right, distance * horizSpread)
          .addScaledVector(up, distance * vertSpread);

        state.direction
          .set(0, 0, 0)
          .addScaledVector(right, -0.75 + (Math.random() - 0.5) * 0.35)
          .addScaledVector(up, -0.36 - Math.random() * 0.24)
          .normalize();
      } else {
        // Random celestial vault coordinate
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        state.start.set(
          distance * Math.sin(phi) * Math.cos(theta),
          distance * Math.sin(phi) * Math.sin(theta),
          distance * Math.cos(phi)
        );
        state.direction
          .set(-0.8 + (Math.random() - 0.5) * 0.4, -0.4 - Math.random() * 0.25, (Math.random() - 0.5) * 0.4)
          .normalize();
      }

      state.speed = 36 + Math.random() * 18;
      state.maxDistance = 32 + Math.random() * 12;
      state.tailLength = 5.2 + Math.random() * 2.5;
      state.isBolide = Math.random() > 0.82;
      state.colorTint.set(state.isBolide ? '#38BDF8' : '#93C5FD');
    }

    state.timer = 0;
    state.active = true;

    if (groupRef.current) {
      groupRef.current.position.copy(state.start);
      // Orient the group's +X axis along the 3D direction of travel
      groupRef.current.quaternion.setFromUnitVectors(X_AXIS, state.direction);
      groupRef.current.scale.set(state.tailLength / 5.5, state.isBolide ? 1.35 : 1.0, 1.0);
      groupRef.current.visible = true;
    }

    if (onMeteorObserved) {
      onMeteorObserved();
    }
  };

  useEffect(() => {
    if (forceSpawnSignal > state.lastForceSignal) {
      state.lastForceSignal = forceSpawnSignal;
      spawnMeteor(true);
    }
  }, [forceSpawnSignal]);

  const tailUniforms = useMemo(
    () => ({
      uOpacity: { value: 0.0 },
      uColorTint: { value: new THREE.Color('#38BDF8') },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!enabled && !state.active) return;

    state.timer += delta;

    if (!state.active) {
      if (state.timer >= 0) {
        spawnMeteor(false);
      }
      return;
    }

    // Advance shooting star along its 3D trajectory
    groupRef.current.position.addScaledVector(state.direction, state.speed * delta);

    const traveled = groupRef.current.position.distanceTo(state.start);
    const progress = Math.min(traveled / state.maxDistance, 1.0);

    // Smooth atmospheric entry flare & burnout curve
    const fade =
      progress < 0.16
        ? progress / 0.16
        : 1.0 - Math.pow((progress - 0.16) / 0.84, 1.35);

    const opacity = Math.max(0, fade) * (state.isBolide ? 0.96 : 0.8);

    if (tailMatRef.current) {
      tailMatRef.current.uniforms.uOpacity.value = opacity;
      tailMatRef.current.uniforms.uColorTint.value.copy(state.colorTint);
    }
    if (headMatRef.current) {
      headMatRef.current.opacity = opacity;
    }

    if (progress >= 1.0) {
      state.active = false;
      state.timer = -getWaitDelay(frequencyMode);
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Crossed dual-plane tapered plasma tail so it looks volumetric from every 3D camera angle */}
      {[0, Math.PI * 0.5].map((rotX, idx) => (
        <mesh key={idx} position={[-2.75, 0, 0]} rotation={[rotX, 0, 0]}>
          <planeGeometry args={[5.5, 0.09]} />
          <shaderMaterial
            ref={idx === 0 ? tailMatRef : undefined}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            uniforms={tailUniforms}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              uniform float uOpacity;
              uniform vec3 uColorTint;

              void main() {
                // vUv.x goes from 0.0 (trailing wake tip) to 1.0 (incandescent meteor head)
                float longitudinal = pow(vUv.x, 2.2);

                // Taper width toward the back of the tail
                float halfWidth = mix(0.08, 0.5, vUv.x);
                float distFromCenter = abs(vUv.y - 0.5);
                float lateral = 1.0 - smoothstep(0.0, halfWidth, distFromCenter);

                // Color gradient: ionized cyan/emerald wake -> incandescent white head
                vec3 col = mix(uColorTint, vec3(1.0, 1.0, 1.0), smoothstep(0.55, 0.98, vUv.x));

                float alpha = longitudinal * lateral * uOpacity;
                gl_FragColor = vec4(col, alpha);
              }
            `}
          />
        </mesh>
      ))}

      {/* Incandescent glowing meteoroid coma head at [0,0,0] */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshBasicMaterial
          ref={headMatRef}
          color="#FFFFFF"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function ShootingStars({
  frequencyMode,
  manualTriggerCount,
  onMeteorObserved,
  enabled = true,
}: ShootingStarsProps) {
  const poolCount = 7;

  return (
    <>
      {Array.from({ length: poolCount }).map((_, idx) => {
        // Route manual bolide triggers round-robin across the meteor pool
        const forceSignal =
          manualTriggerCount > 0 && (manualTriggerCount - 1) % poolCount === idx
            ? manualTriggerCount
            : 0;

        return (
          <SingleShootingStar
            key={idx}
            index={idx}
            frequencyMode={frequencyMode}
            forceSpawnSignal={forceSignal}
            onMeteorObserved={onMeteorObserved}
            enabled={enabled}
          />
        );
      })}
    </>
  );
}
