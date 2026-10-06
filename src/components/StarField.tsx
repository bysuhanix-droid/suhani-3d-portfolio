import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  GALACTIC_EULER as SHARED_GALACTIC_EULER,
  generateSuhaniStarPositions,
} from '../utils/nameStarSampler';

interface StarFieldProps {
  starCount: number; // e.g. 4000 to 20000
  twinkleIntensity: number; // 0.0 to 2.0
  magnitudeBoost: number; // 0.5 to 1.8
  isExpanded?: boolean; // false = stars form "Suhani", true = stars spread into the galaxy
}

const MAX_STARS = 20000;

// Realistic Morgan-Keenan Spectral Class Blackbody Colors
const SPECTRAL_PALETTE = [
  { color: new THREE.Color('#9BB8FF'), weight: 0.08 }, // O/B class: Hot blue-white (Rigel, Spica)
  { color: new THREE.Color('#C7D8FF'), weight: 0.22 }, // B/A class: Blue-white (Vega, Sirius)
  { color: new THREE.Color('#F4F7FF'), weight: 0.32 }, // A/F class: Pure stellar white (Canopus, Procyon)
  { color: new THREE.Color('#FFF1D6'), weight: 0.19 }, // G class: Solar cream-gold (Capella, Alpha Centauri)
  { color: new THREE.Color('#FFD2A1'), weight: 0.12 }, // K class: Warm amber-orange (Arcturus, Aldebaran)
  { color: new THREE.Color('#FF9D6E'), weight: 0.07 }, // M class: Deep red supergiant (Betelgeuse, Antares)
];

function pickSpectralColor(): THREE.Color {
  const r = Math.random();
  let acc = 0;
  for (const item of SPECTRAL_PALETTE) {
    acc += item.weight;
    if (r <= acc) return item.color;
  }
  return SPECTRAL_PALETTE[2].color;
}

// Galactic plane rotation matrix matching the MilkyWayGalaxy component
export const GALACTIC_EULER = SHARED_GALACTIC_EULER;
const GALACTIC_QUAT = new THREE.Quaternion().setFromEuler(GALACTIC_EULER);

export function StarField({
  starCount,
  twinkleIntensity = 1.0,
  magnitudeBoost = 1.0,
  isExpanded = true,
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const spreadProgressRef = useRef<number>(isExpanded ? 1.0 : 0.0);

  const {
    positions,
    namePositions,
    spreadDelays,
    introBrightness,
    colors,
    sizes,
    twinkle,
    phases,
    speeds,
  } = useMemo(() => {
    const positions = new Float32Array(MAX_STARS * 3);
    const colors = new Float32Array(MAX_STARS * 3);
    const sizes = new Float32Array(MAX_STARS);
    const twinkle = new Float32Array(MAX_STARS);
    const phases = new Float32Array(MAX_STARS);
    const speeds = new Float32Array(MAX_STARS);

    const tempVec = new THREE.Vector3();

    // Create a few subtle open star clusters (like Pleiades, Hyades, Double Cluster)
    const clusters = [
      new THREE.Vector3(-32, 22, -55).normalize(),
      new THREE.Vector3(45, 14, -40).normalize(),
      new THREE.Vector3(12, -28, -58).normalize(),
      new THREE.Vector3(-50, -12, 35).normalize(),
    ];

    for (let i = 0; i < MAX_STARS; i++) {
      const i3 = i * 3;
      const radius = 64 + Math.random() * 34;

      const popRoll = Math.random();

      if (popRoll < 0.62) {
        // 1. Isotropic All-Sky Celestial Sphere (uniform spherical distribution)
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        tempVec.set(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        );
        tempVec.multiplyScalar(radius);
      } else if (popRoll < 0.96) {
        // 2. Galactic Band Concentration (stars concentrated near the Milky Way plane)
        const angle = Math.random() * Math.PI * 2;
        // Gaussian-like vertical spread near galactic equator
        const gaussY = (Math.random() + Math.random() + Math.random() - 1.5) * 0.28;
        tempVec.set(
          Math.cos(angle),
          gaussY,
          Math.sin(angle)
        ).normalize();
        tempVec.applyQuaternion(GALACTIC_QUAT);
        tempVec.multiplyScalar(radius);
      } else {
        // 3. Open Star Clusters (Pleiades-style localized groupings)
        const clusterDir = clusters[i % clusters.length];
        tempVec.copy(clusterDir);
        tempVec.x += (Math.random() - 0.5) * 0.085;
        tempVec.y += (Math.random() - 0.5) * 0.085;
        tempVec.z += (Math.random() - 0.5) * 0.085;
        tempVec.normalize().multiplyScalar(radius);
      }

      positions[i3] = tempVec.x;
      positions[i3 + 1] = tempVec.y;
      positions[i3 + 2] = tempVec.z;

      // Color based on spectral class
      const spectralColor = pickSpectralColor();
      colors[i3] = spectralColor.r;
      colors[i3 + 1] = spectralColor.g;
      colors[i3 + 2] = spectralColor.b;

      // Apparent magnitude distribution: power law so most stars are crisp pinpoints
      // and a small percentage are brilliant 1st-magnitude navigational stars
      const magRoll = Math.random();
      if (magRoll > 0.992) {
        // Brilliant 1st-magnitude beacon stars with diffraction spikes
        sizes[i] = 4.2 + Math.random() * 2.4;
        twinkle[i] = 0.85 + Math.random() * 0.15;
      } else if (magRoll > 0.94) {
        // Bright 2nd/3rd magnitude stars
        sizes[i] = 2.4 + Math.random() * 1.4;
        twinkle[i] = 0.65 + Math.random() * 0.35;
      } else if (magRoll > 0.72) {
        // Medium field stars
        sizes[i] = 1.35 + Math.random() * 0.95;
        twinkle[i] = Math.random() > 0.4 ? 0.5 : 0.18;
      } else {
        // Faint deep-space background stars
        sizes[i] = 0.75 + Math.random() * 0.65;
        twinkle[i] = Math.random() > 0.82 ? 0.45 : 0.08;
      }

      phases[i] = Math.random() * Math.PI * 20;
      speeds[i] = 0.8 + Math.random() * 3.2;
    }

    // Generate 3D coordinates forming the name "Suhani" in front of the initial camera
    const suhaniSample = generateSuhaniStarPositions(MAX_STARS, false, sizes);

    return {
      positions,
      namePositions: suhaniSample.worldPositions,
      spreadDelays: suhaniSample.spreadDelays,
      introBrightness: suhaniSample.introBrightness,
      colors,
      sizes,
      twinkle,
      phases,
      speeds,
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTwinkleIntensity: { value: twinkleIntensity },
      uMagnitudeBoost: { value: magnitudeBoost },
      uSpread: { value: isExpanded ? 1.0 : 0.0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame((state, delta) => {
    // Smoothly animate uSpread toward 1.0 when the user clicks "Suhani"
    const target = isExpanded ? 1.0 : 0.0;
    if (Math.abs(spreadProgressRef.current - target) > 0.0001) {
      const damped = THREE.MathUtils.damp(spreadProgressRef.current, target, 1.75, delta);
      const step = isExpanded ? delta * 0.22 : -delta * 0.38;
      spreadProgressRef.current = THREE.MathUtils.clamp(
        isExpanded ? Math.max(damped, spreadProgressRef.current + step) : Math.min(damped, spreadProgressRef.current + step),
        0.0,
        1.0
      );
    } else {
      spreadProgressRef.current = target;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uTwinkleIntensity.value = twinkleIntensity;
      materialRef.current.uniforms.uMagnitudeBoost.value = magnitudeBoost;
      materialRef.current.uniforms.uSpread.value = spreadProgressRef.current;
    }
    if (pointsRef.current) {
      pointsRef.current.geometry.setDrawRange(0, Math.min(starCount, MAX_STARS));
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aNamePos"
          args={[namePositions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSpreadDelay"
          args={[spreadDelays, 1]}
        />
        <bufferAttribute
          attach="attributes-aIntroBrightness"
          args={[introBrightness, 1]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aTwinkle"
          args={[twinkle, 1]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          args={[speeds, 1]}
        />
      </bufferGeometry>

      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute vec3 aNamePos;
          attribute float aSpreadDelay;
          attribute float aIntroBrightness;
          attribute vec3 aColor;
          attribute float aSize;
          attribute float aTwinkle;
          attribute float aPhase;
          attribute float aSpeed;

          uniform float uTime;
          uniform float uTwinkleIntensity;
          uniform float uMagnitudeBoost;
          uniform float uSpread;
          uniform float uPixelRatio;

          varying vec3 vColor;
          varying float vBrightness;
          varying float vIsBrightStar;

          void main() {
            vColor = aColor;

            // Multi-harmonic atmospheric scintillation (dual sine wave interference)
            float wave1 = sin(uTime * aSpeed + aPhase);
            float wave2 = cos(uTime * (aSpeed * 1.73) - aPhase * 0.6);
            float shimmer = 0.5 * (wave1 + wave2);

            // Staggered per-star expansion progress from "Suhani" (0.0) -> Galaxy (1.0)
            float localT = clamp((uSpread - aSpreadDelay) / max(0.001, 1.0 - aSpreadDelay), 0.0, 1.0);
            // Smooth quintic ease-in-out
            float smoothT = localT * localT * localT * (localT * (localT * 6.0 - 15.0) + 10.0);

            // Subtle living stellar drift while arranged in "Suhani"
            vec3 floatOffset = vec3(
              sin(uTime * 1.1 + aPhase) * 0.018,
              cos(uTime * 0.95 + aPhase * 1.3) * 0.018,
              sin(uTime * 0.8 + aPhase * 0.7) * 0.025
            ) * (1.0 - smoothT);

            // 3D spiral dispersion arc during expansion into the galaxy
            vec3 radialDir = normalize(position);
            vec3 swirlAxis = normalize(vec3(0.25, 1.0, -0.15));
            vec3 tangent = normalize(cross(radialDir, swirlAxis) + vec3(0.0001));
            float arcEnvelope = sin(smoothT * 3.14159265);
            vec3 swirlOffset = tangent * arcEnvelope * (5.5 + aSpreadDelay * 12.0);

            vec3 finalPos = mix(aNamePos + floatOffset, position, smoothT) + swirlOffset;

            // Calculate twinkle modulation
            float modFactor = 1.0 + shimmer * 0.42 * aTwinkle * uTwinkleIntensity;
            float galaxyBrightness = clamp(modFactor, 0.22, 1.45);
            float nameBrightness = clamp(modFactor * aIntroBrightness, 0.18, 1.55);
            vBrightness = mix(nameBrightness, galaxyBrightness, smoothT);

            // Flag 1st-magnitude stars so fragment shader can render subtle diffraction cross
            vIsBrightStar = smoothstep(3.2, 5.2, aSize);

            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);

            // Scale point size with apparent magnitude, twinkle pulse, and screen DPI
            // Blend perspective distance multiplier so stars at z~8 ("Suhani") and z~78 (Galaxy) are equally crisp
            float dynamicSize = aSize * uMagnitudeBoost * (0.92 + 0.16 * shimmer * aTwinkle);
            float perspectiveFactor = mix(10.8, 85.0, smoothT);
            gl_PointSize = dynamicSize * uPixelRatio * (perspectiveFactor / max(1.5, -mvPosition.z));

            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vBrightness;
          varying float vIsBrightStar;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);

            if (dist > 0.5) discard;

            // Hot white-hot stellar photosphere core + soft colored corona
            float core = exp(-dist * dist * 42.0);
            float halo = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.65;

            // Subtle 4-point Airy diffraction spike for 1st-magnitude beacon stars
            float spikeX = exp(-abs(uv.y) * 38.0) * exp(-abs(uv.x) * 6.5);
            float spikeY = exp(-abs(uv.x) * 38.0) * exp(-abs(uv.y) * 6.5);
            float spikes = (spikeX + spikeY) * vIsBrightStar * 0.55;

            float intensity = (core * 1.15 + halo + spikes) * vBrightness;

            // Whiten the very center of the star for realistic HDR bloom look
            vec3 finalColor = mix(vColor, vec3(1.0, 1.0, 1.0), clamp(core * 0.75, 0.0, 1.0));

            gl_FragColor = vec4(finalColor, clamp(intensity, 0.0, 1.0));
          }
        `}
      />
    </points>
  );
}
