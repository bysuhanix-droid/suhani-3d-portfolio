import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLSL_NOISE } from './glslCommon';

const SUN_WORLD = new THREE.Vector3(0, 0, 0);
const _inv = new THREE.Matrix4();
const _sunLocal = new THREE.Vector3();
const _camLocal = new THREE.Vector3();

const RING_VERTEX = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vPos;

  uniform float uTime;
  uniform vec3 uSunDirObj;
  uniform vec3 uCamPosObj;
  uniform vec3 uTint;
  uniform float uInner;
  uniform float uOuter;
  uniform float uOpacity;
  uniform float uDetail;

  ${GLSL_NOISE}

  float band(float x, float a, float b, float soft) {
    return smoothstep(a - soft, a + soft, x) * (1.0 - smoothstep(b - soft, b + soft, x));
  }

  void main() {
    float r = length(vPos.xy);
    float rn = clamp((r - uInner) / max(0.0001, uOuter - uInner), 0.0, 1.0);

    vec3 p = vec3(vPos.xy, 0.0);
    vec3 n = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(uSunDirObj);
    vec3 toCam = uCamPosObj - p;
    float camDist = length(toCam);
    vec3 V = toCam / max(camDist, 0.0001);

    // Distance based LOD keeps the fine ringlets from aliasing when far away
    float detailFade = 1.0 - smoothstep(9.0, 46.0, camDist);

    // ---------- Radial optical depth profile (C · B · Cassini · A) ----------
    float dens;
    float structured =
        band(rn, 0.000, 0.235, 0.030) * 0.34
      + band(rn, 0.235, 0.430, 0.014) * 1.00
      + band(rn, 0.430, 0.505, 0.010) * 0.09
      + band(rn, 0.505, 0.855, 0.014) * 0.70
      + band(rn, 0.878, 1.000, 0.010) * 0.52;

    float smoothProfile = band(rn, 0.02, 0.98, 0.10) * 0.55;
    dens = mix(smoothProfile, structured, uDetail);

    // Thousands of individual ringlets
    float ringlets = 0.5 + 0.5 * sin(rn * 430.0 + snoise(vec3(rn * 60.0, 0.0, 0.0)) * 2.5);
    float coarse = 0.5 + 0.5 * sin(rn * 92.0 + 1.7);
    dens *= mix(1.0, 0.62 + 0.38 * ringlets, 0.55 * detailFade * uDetail);
    dens *= mix(1.0, 0.78 + 0.22 * coarse, 0.7 * uDetail);

    // Gentle azimuthal clumping from self-gravity wakes
    float ang = atan(vPos.y, vPos.x);
    float wake = 0.94 + 0.06 * snoise(vec3(cos(ang) * 6.0, sin(ang) * 6.0, rn * 14.0));
    dens *= wake;

    dens = clamp(dens, 0.0, 1.0);
    if (dens < 0.004) discard;

    // ---------- Planet shadow cast across the ring plane ----------
    float tClosest = -dot(p, L);
    float shadow = 1.0;
    if (tClosest > 0.0) {
      float d = length(p + L * tClosest);
      shadow = smoothstep(0.985, 1.085, d);
    }
    shadow = mix(0.055, 1.0, shadow);

    // ---------- Reflection (lit face) vs transmission (unlit face) ----------
    float sunSide = dot(L, n);
    float viewSide = dot(V, n);
    float openness = clamp(abs(sunSide), 0.06, 1.0);
    bool sameSide = (sunSide * viewSide) > 0.0;

    // Ice particle colour: B ring is creamy, C ring greyer, A ring slightly tan
    vec3 icyWhite = vec3(1.0, 0.97, 0.91);
    vec3 dustyTan = uTint;
    vec3 col = mix(dustyTan * 0.78, icyWhite, smoothstep(0.18, 0.62, dens));

    float brightness;
    float alpha;
    if (sameSide) {
      // Back-scattered sunlight: dense bands look bright and opaque
      brightness = (0.30 + 0.95 * openness) * dens;
      alpha = clamp(dens * 1.15, 0.0, 1.0);
    } else {
      // Forward-scattered light through the rings: dense bands go dark
      brightness = (0.16 + 0.55 * openness) * (1.0 - dens * 0.72) * dens;
      col = mix(col, vec3(0.82, 0.86, 0.95), 0.35);
      alpha = clamp(dens * 0.80, 0.0, 1.0);
    }

    // Grazing view through the ring plane thickens the optical path
    float graze = pow(1.0 - clamp(abs(viewSide), 0.0, 1.0), 2.5);
    alpha = clamp(alpha * (1.0 + graze * 0.55), 0.0, 1.0);

    vec3 finalCol = col * brightness * shadow * 1.55;
    finalCol += vec3(0.32, 0.40, 0.58) * 0.03 * dens; // faint starlight fill

    gl_FragColor = vec4(finalCol, alpha * uOpacity);
  }
`;

export function PlanetRings({
  planetRadius,
  inner,
  outer,
  opacity,
  tint,
  detail,
  simTimeRef,
}: {
  planetRadius: number;
  inner: number;
  outer: number;
  opacity: number;
  tint: string;
  detail: number;
  simTimeRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDirObj: { value: new THREE.Vector3(1, 0, 0) },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 10) },
      uTint: { value: new THREE.Color(tint) },
      uInner: { value: inner },
      uOuter: { value: outer },
      uOpacity: { value: opacity },
      uDetail: { value: detail },
    }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.updateWorldMatrix(true, false);
    _inv.copy(mesh.matrixWorld).invert();
    _sunLocal.copy(SUN_WORLD).applyMatrix4(_inv);
    if (_sunLocal.lengthSq() > 1e-9) _sunLocal.normalize();
    _camLocal.copy(camera.position).applyMatrix4(_inv);

    uniforms.uTime.value = simTimeRef.current;
    uniforms.uSunDirObj.value.copy(_sunLocal);
    uniforms.uCamPosObj.value.copy(_camLocal);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} scale={planetRadius} renderOrder={4}>
      <ringGeometry args={[inner, outer, 256, 4]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={RING_VERTEX}
        fragmentShader={RING_FRAGMENT}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
