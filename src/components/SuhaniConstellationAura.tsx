import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getInitialCameraBasis } from '../utils/nameStarSampler';

interface SuhaniConstellationAuraProps {
  isExpanded: boolean;
}

export function SuhaniConstellationAura({ isExpanded }: SuhaniConstellationAuraProps) {
  const glowMatRef = useRef<THREE.ShaderMaterial>(null);
  const fadeRef = useRef<number>(isExpanded ? 0.0 : 1.0);

  const { right, up, forward } = useMemo(() => getInitialCameraBasis(), []);

  // Compute rotation matrix so the subtle nebula backdrop plane faces the initial camera directly
  const planeQuaternion = useMemo(() => {
    const m = new THREE.Matrix4();
    const back = forward.clone().negate();
    m.makeBasis(right, up, back);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [right, up, forward]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: isExpanded ? 0.0 : 1.0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const target = isExpanded ? 0.0 : 1.0;
    fadeRef.current = THREE.MathUtils.damp(fadeRef.current, target, isExpanded ? 4.2 : 2.0, delta);
    if (glowMatRef.current) {
      glowMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      glowMatRef.current.uniforms.uOpacity.value = fadeRef.current;
    }
  });

  return (
    <mesh quaternion={planeQuaternion} position={[0, 0, 0]} renderOrder={-3}>
      <planeGeometry args={[10.5, 4.2]} />
      <shaderMaterial
        ref={glowMatRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uOpacity;

          void main() {
            if (uOpacity < 0.002) discard;
            vec2 p = (vUv - 0.5) * vec2(2.2, 3.2);
            float d = length(p);
            float softGlow = exp(-d * d * 2.4);

            // Subtle cosmic indigo + starlight blue + warm gold whisper behind "Suhani"
            vec3 col1 = vec3(0.18, 0.34, 0.78);
            vec3 col2 = vec3(0.55, 0.36, 0.85);
            vec3 col = mix(col1, col2, 0.5 + 0.5 * sin(uTime * 0.6 + p.x * 1.5));

            float alpha = softGlow * 0.14 * uOpacity;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}
