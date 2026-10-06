import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { generateSuhaniStarPositions } from '../utils/nameStarSampler';
import { GALACTIC_EULER } from './StarField';

interface MilkyWayGalaxyProps {
  coreGlowIntensity: number; // 0.0 to 2.0 (1.15 default)
  isExpanded?: boolean;
}

const GALACTIC_STAR_COUNT = 24000;

export function MilkyWayGalaxy({
  coreGlowIntensity = 1.15,
  isExpanded = true,
}: MilkyWayGalaxyProps) {
  const skyShaderRef = useRef<THREE.ShaderMaterial>(null);
  const microStarsShaderRef = useRef<THREE.ShaderMaterial>(null);
  const spreadProgressRef = useRef<number>(isExpanded ? 1.0 : 0.0);

  // Generate 24,000 resolved micro-stars & H-II nebula knots along the galactic plane
  const { positions, namePositions, spreadDelays, colors, sizes, alphas } = useMemo(() => {
    const positions = new Float32Array(GALACTIC_STAR_COUNT * 3);
    const colors = new Float32Array(GALACTIC_STAR_COUNT * 3);
    const sizes = new Float32Array(GALACTIC_STAR_COUNT);
    const alphas = new Float32Array(GALACTIC_STAR_COUNT);

    const colorCoreGold = new THREE.Color('#FFE8C2');
    const colorWarmAmber = new THREE.Color('#FFBE7B');
    const colorSpiralBlue = new THREE.Color('#8FB8FF');
    const colorNebulaPink = new THREE.Color('#F472B6');
    const colorNebulaViolet = new THREE.Color('#C084FC');
    const colorCyanOIII = new THREE.Color('#38BDF8');
    const tempColor = new THREE.Color();

    for (let i = 0; i < GALACTIC_STAR_COUNT; i++) {
      const i3 = i * 3;
      const radius = 68 + Math.random() * 14;

      // Concentrate more stars toward the Galactic Center (-Z direction, angle around -PI/2)
      let longitude: number;
      if (Math.random() < 0.52) {
        // Galactic Bulge & Sagittarius-Carina concentration around -PI/2
        const gaussianL =
          (Math.random() + Math.random() + Math.random() - 1.5) * 1.45;
        longitude = -Math.PI * 0.5 + gaussianL;
      } else {
        // Full 360-degree galactic belt
        longitude = Math.random() * Math.PI * 2;
      }

      // Distance from Galactic Center (-PI/2)
      const distFromCore = Math.abs(
        Math.atan2(Math.sin(longitude + Math.PI * 0.5), Math.cos(longitude + Math.PI * 0.5))
      );
      const bulgeFactor = Math.exp(-distFromCore * distFromCore * 1.2);

      // Vertical spread (Galactic Latitude b) - wider at the bulge, narrow along the outer disk
      const rawGaussB =
        (Math.random() + Math.random() + Math.random() + Math.random() - 2.0) * 0.5;
      const spreadHeight = 0.085 + bulgeFactor * 0.13;
      let latitude = rawGaussB * spreadHeight;

      // Carve subtle Great Rift avoidance along the very center line so micro-stars frame the dark dust lane
      const riftWave = Math.sin(longitude * 3.0) * 0.018 + Math.cos(longitude * 7.0) * 0.01;
      if (Math.abs(latitude - riftWave) < 0.018 && Math.random() < 0.68) {
        latitude += latitude > riftWave ? 0.028 : -0.028;
      }

      const cosLat = Math.cos(latitude);
      const x = radius * cosLat * Math.cos(longitude);
      const y = radius * Math.sin(latitude);
      const z = radius * cosLat * Math.sin(longitude);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Assign realistic stellar & H-II nebula colors based on location in the galaxy
      const typeRoll = Math.random();
      if (typeRoll < 0.045) {
        // Glowing H-II emission knot (Lagoon / Carina / North America Nebula pink-magenta)
        tempColor.copy(colorNebulaPink).lerp(colorNebulaViolet, Math.random());
        sizes[i] = 6.5 + Math.random() * 9.0;
        alphas[i] = 0.14 + Math.random() * 0.16;
      } else if (typeRoll < 0.075) {
        // Soft O-III cyan/blue reflection nebula knot
        tempColor.copy(colorCyanOIII).lerp(colorSpiralBlue, Math.random());
        sizes[i] = 5.5 + Math.random() * 7.5;
        alphas[i] = 0.12 + Math.random() * 0.14;
      } else if (bulgeFactor > 0.45 && Math.random() < 0.72) {
        // Ancient Population II warm golden-amber bulge stars
        tempColor.copy(colorCoreGold).lerp(colorWarmAmber, Math.random() * 0.7);
        sizes[i] = 0.9 + Math.random() * 1.8;
        alphas[i] = 0.35 + Math.random() * 0.5;
      } else {
        // Young Population I spiral-arm blue-white star clouds
        tempColor.copy(colorSpiralBlue).lerp(colorCoreGold, Math.random() * 0.45);
        sizes[i] = 0.8 + Math.random() * 1.6;
        alphas[i] = 0.28 + Math.random() * 0.45;
      }

      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }

    // Generate local positions forming "Suhani" (inverse rotated by GALACTIC_EULER so they align in world space)
    const suhaniSample = generateSuhaniStarPositions(GALACTIC_STAR_COUNT, true);

    return {
      positions,
      namePositions: suhaniSample.worldPositions,
      spreadDelays: suhaniSample.spreadDelays,
      colors,
      sizes,
      alphas,
    };
  }, []);

  const skyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: isExpanded ? coreGlowIntensity : 0.0 },
    }),
    []
  );

  const microStarUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: coreGlowIntensity },
      uSpread: { value: isExpanded ? 1.0 : 0.0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const target = isExpanded ? 1.0 : 0.0;

    if (Math.abs(spreadProgressRef.current - target) > 0.0001) {
      const damped = THREE.MathUtils.damp(spreadProgressRef.current, target, 1.75, delta);
      const step = isExpanded ? delta * 0.22 : -delta * 0.38;
      spreadProgressRef.current = THREE.MathUtils.clamp(
        isExpanded
          ? Math.max(damped, spreadProgressRef.current + step)
          : Math.min(damped, spreadProgressRef.current + step),
        0.0,
        1.0
      );
    } else {
      spreadProgressRef.current = target;
    }

    // Volumetric sky dome emerges smoothly as stars expand outward into the galaxy
    const domeReveal = THREE.MathUtils.smoothstep(spreadProgressRef.current, 0.22, 0.98);

    if (skyShaderRef.current) {
      skyShaderRef.current.uniforms.uTime.value = t;
      skyShaderRef.current.uniforms.uIntensity.value = coreGlowIntensity * domeReveal;
    }
    if (microStarsShaderRef.current) {
      microStarsShaderRef.current.uniforms.uTime.value = t;
      microStarsShaderRef.current.uniforms.uIntensity.value = coreGlowIntensity;
      microStarsShaderRef.current.uniforms.uSpread.value = spreadProgressRef.current;
    }
  });

  return (
    <group rotation={GALACTIC_EULER}>
      {/* LAYER 1: Volumetric FBM Milky Way Nebula & Great Rift Dust Lane Shader Dome */}
      <mesh renderOrder={-2}>
        <sphereGeometry args={[86, 96, 64]} />
        <shaderMaterial
          ref={skyShaderRef}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          uniforms={skyUniforms}
          vertexShader={`
            varying vec3 vLocalPos;
            void main() {
              vLocalPos = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vLocalPos;
            uniform float uTime;
            uniform float uIntensity;

            // 3D Simplex-style Value Noise for Volumetric Galactic Clouds
            float hash(vec3 p) {
              p = fract(p * 0.3183099 + 0.1);
              p *= 17.0;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }

            float noise(vec3 x) {
              vec3 i = floor(x);
              vec3 f = fract(x);
              f = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(
                  mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                  mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
                  f.y
                ),
                mix(
                  mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                  mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
                  f.y
                ),
                f.z
              );
            }

            // 5-octave Fractional Brownian Motion
            float fbm(vec3 p) {
              float v = 0.0;
              float a = 0.5;
              vec3 shift = vec3(100.0);
              for (int i = 0; i < 5; ++i) {
                v += a * noise(p);
                p = p * 2.04 + shift;
                a *= 0.5;
              }
              return v;
            }

            // Ridged multifractal noise for dark interstellar dust filaments
            float ridgedNoise(vec3 p) {
              float v = 0.0;
              float a = 0.55;
              for (int i = 0; i < 4; ++i) {
                float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
                v += a * n * n;
                p = p * 2.18 + vec3(31.7);
                a *= 0.5;
              }
              return v;
            }

            void main() {
              vec3 dir = normalize(vLocalPos);

              // Galactic latitude (y is perpendicular to galactic plane)
              float lat = dir.y;

              // Galactic Center is oriented towards vec3(0.0, 0.0, -1.0)
              float coreDot = clamp(dot(normalize(vec3(dir.x, 0.0, dir.z)), vec3(0.0, 0.0, -1.0)), -1.0, 1.0);
              float coreFactor = pow(max(0.0, coreDot * 0.5 + 0.5), 2.6);
              float bulgeCore = pow(max(0.0, coreDot), 3.2);

              // Organic meandering centerline of the Milky Way
              float warp = (fbm(dir * 2.5) - 0.5) * 0.09;
              float warpedLat = lat - warp;

              // Width of the galactic band expands near the Sagittarius Galactic Bulge
              float bandSigma = mix(0.11, 0.23, bulgeCore);
              float galacticBand = exp(-(warpedLat * warpedLat) / (2.0 * bandSigma * bandSigma));

              // Outer faint zodiacal / halo glow
              float outerHalo = exp(-(warpedLat * warpedLat) / 0.22) * 0.35;

              // Volumetric cloud structure via multi-scale FBM
              float cloudDetail = fbm(dir * 4.5 + vec3(0.0, 1.4, 0.0));
              float fineClouds = fbm(dir * 11.0 - vec3(2.1, 0.0, 1.3));
              float cloudMask = smoothstep(0.24, 0.78, cloudDetail * 0.65 + fineClouds * 0.35);

              // Luminous galactic intensity before dust absorption
              float luminosity = galacticBand * (0.45 + 0.95 * cloudMask) * (0.42 + 0.95 * coreFactor);

              // GREAT RIFT DARK DUST LANES (Interstellar extinction along the galactic equator)
              float dustPlane = exp(-(warpedLat * warpedLat) / (2.0 * 0.036 * 0.036));
              float dustFilaments = ridgedNoise(dir * 6.8 + vec3(4.2, -1.5, 2.8));
              float fineDust = fbm(dir * 16.0);
              float dustExtinction = dustPlane * smoothstep(0.42, 0.84, dustFilaments * 0.75 + fineDust * 0.25);

              // Color Palette of the Milky Way
              vec3 deepSpaceIndigo = vec3(0.05, 0.09, 0.22);
              vec3 spiralViolet = vec3(0.28, 0.18, 0.52);
              vec3 starCloudBlue = vec3(0.42, 0.62, 0.95);
              vec3 coreWarmGold = vec3(1.0, 0.84, 0.62);
              vec3 coreRadiantWhite = vec3(1.0, 0.96, 0.88);
              vec3 hIIPink = vec3(0.92, 0.36, 0.68);
              vec3 dustObsidian = vec3(0.015, 0.02, 0.045);

              // Blend colors from outer indigo -> violet arms -> warm golden Sagittarius bulge
              vec3 col = mix(deepSpaceIndigo, spiralViolet, clamp(luminosity * 1.4, 0.0, 1.0));
              col = mix(col, starCloudBlue, clamp(cloudMask * galacticBand * (1.0 - bulgeCore * 0.6), 0.0, 1.0) * 0.55);
              col = mix(col, coreWarmGold, clamp(bulgeCore * galacticBand * 1.35, 0.0, 1.0));
              col = mix(col, coreRadiantWhite, clamp(pow(bulgeCore, 2.0) * galacticBand * cloudMask * 1.1, 0.0, 1.0));

              // Add localized H-II pink/magenta star-forming nebulae pockets
              float nebulaKnots = smoothstep(0.66, 0.85, fbm(dir * 9.2 + vec3(12.3)));
              col = mix(col, hIIPink, nebulaKnots * galacticBand * 0.42);

              // Apply dark interstellar dust lane absorption (carving the Great Rift)
              float absorption = clamp(dustExtinction * 0.88, 0.0, 0.92);
              col = mix(col, dustObsidian, absorption);

              // Warm rim glow along the edges of the dust lanes
              float dustRim = dustPlane * (1.0 - absorption) * bulgeCore * 0.25;
              col += coreWarmGold * dustRim;

              float finalAlpha = clamp((luminosity * (1.0 - absorption * 0.72) + outerHalo * 0.35) * 0.68 * uIntensity, 0.0, 0.92);

              gl_FragColor = vec4(col * uIntensity, finalAlpha);
            }
          `}
        />
      </mesh>

      {/* LAYER 2: 24,000 Resolved Galactic Core Micro-Stars & Glowing Nebula Knots */}
      <points frustumCulled={false} renderOrder={-1}>
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
            attach="attributes-aColor"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            args={[sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-aAlpha"
            args={[alphas, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={microStarsShaderRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={microStarUniforms}
          vertexShader={`
            attribute vec3 aNamePos;
            attribute float aSpreadDelay;
            attribute vec3 aColor;
            attribute float aSize;
            attribute float aAlpha;

            uniform float uTime;
            uniform float uIntensity;
            uniform float uSpread;
            uniform float uPixelRatio;

            varying vec3 vColor;
            varying float vAlpha;

            void main() {
              vColor = aColor;

              float localT = clamp((uSpread - aSpreadDelay) / max(0.001, 1.0 - aSpreadDelay), 0.0, 1.0);
              float smoothT = localT * localT * localT * (localT * (localT * 6.0 - 15.0) + 10.0);

              vec3 radialDir = normalize(position);
              vec3 tangent = normalize(cross(radialDir, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
              vec3 swirlOffset = tangent * sin(smoothT * 3.14159265) * 6.0;

              vec3 finalPos = mix(aNamePos, position, smoothT) + swirlOffset;

              // Subtle shimmer on resolved galactic micro-stars
              float pulse = 0.92 + 0.08 * sin(uTime * 1.5 + position.x * 0.5 + position.z * 0.5);
              float introFade = mix(0.62, 1.0, smoothT);
              vAlpha = aAlpha * pulse * introFade * clamp(uIntensity, 0.0, 2.0);

              vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
              float perspectiveFactor = mix(8.5, 78.0, smoothT);
              // Keep soft nebula knots subtle while in the "Suhani" formation so the stars are crystal clear
              float sizeFactor = mix(min(aSize, 2.8), aSize, smoothT);
              gl_PointSize = sizeFactor * uPixelRatio * (perspectiveFactor / max(1.5, -mvPosition.z));
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
              vec2 uv = gl_PointCoord - vec2(0.5);
              float d = length(uv);
              if (d > 0.5) discard;

              // Smooth Gaussian falloff so large particles act as soft nebula clouds
              // and small particles act as resolved galactic stars
              float soft = exp(-d * d * 18.0);
              gl_FragColor = vec4(vColor, soft * vAlpha);
            }
          `}
        />
      </points>
    </group>
  );
}
