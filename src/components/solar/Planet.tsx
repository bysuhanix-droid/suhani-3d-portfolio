import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLSL_NOISE, PLANET_VERTEX, buildPlanetFragment } from './glslCommon';
import type { BodyDef, MoonDef } from './planetData';
import { PlanetRings } from './PlanetRings';

const SUN_WORLD = new THREE.Vector3(0, 0, 0);
const _inv = new THREE.Matrix4();
const _sunLocal = new THREE.Vector3();
const _camLocal = new THREE.Vector3();

interface ShadedBodyParams {
  surface: string;
  radius: number;
  seed: number;
  segments?: number;
  tintA?: string;
  tintB?: string;
  craterAmount?: number;
  mariaAmount?: number;
  bump?: number;
  ambient?: number;
  specTint?: number;
  atmoColor?: string;
  atmoStrength?: number;
  nightLights?: number;
  ringShadow?: { inner: number; outer: number } | null;
  spinPeriod: number;
  simTimeRef: React.MutableRefObject<number>;
}

/** A single procedurally-shaded, sun-lit celestial body. */
export function ShadedBody({
  surface,
  radius,
  seed,
  segments = 96,
  tintA = '#2c2723',
  tintB = '#9a9086',
  craterAmount = 1,
  mariaAmount = 0.4,
  bump = 0.002,
  ambient = 0.06,
  specTint = 0,
  atmoColor = '#8899aa',
  atmoStrength = 0.2,
  nightLights = 0,
  ringShadow = null,
  spinPeriod,
  simTimeRef,
}: ShadedBodyParams) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: seed },
      uSunDirObj: { value: new THREE.Vector3(1, 0, 0) },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 5) },
      uSunColor: { value: new THREE.Color('#fff6e8') },
      uSunIntensity: { value: 1.45 },
      uAmbient: { value: ambient },
      uAtmoColor: { value: new THREE.Color(atmoColor) },
      uAtmoStrength: { value: atmoStrength },
      uBump: { value: bump },
      uNightLights: { value: nightLights },
      uRingShadow: { value: ringShadow ? 1 : 0 },
      uRingInner: { value: ringShadow ? ringShadow.inner : 0 },
      uRingOuter: { value: ringShadow ? ringShadow.outer : 0 },
      uSpecTint: { value: specTint },
      uTintA: { value: new THREE.Color(tintA) },
      uTintB: { value: new THREE.Color(tintB) },
      uCraterAmount: { value: craterAmount },
      uMariaAmount: { value: mariaAmount },
    }),
    []
  );

  const fragment = useMemo(() => buildPlanetFragment(surface), [surface]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = simTimeRef.current;

    mesh.rotation.y = (t / spinPeriod) * Math.PI * 2;
    mesh.updateWorldMatrix(true, false);

    _inv.copy(mesh.matrixWorld).invert();
    _sunLocal.copy(SUN_WORLD).applyMatrix4(_inv);
    if (_sunLocal.lengthSq() > 1e-9) _sunLocal.normalize();
    _camLocal.copy(camera.position).applyMatrix4(_inv);

    uniforms.uTime.value = t;
    uniforms.uSunDirObj.value.copy(_sunLocal);
    uniforms.uCamPosObj.value.copy(_camLocal);
  });

  return (
    <mesh ref={meshRef} scale={radius}>
      <sphereGeometry args={[1, segments, Math.round(segments * 0.6)]} />
      <shaderMaterial uniforms={uniforms} vertexShader={PLANET_VERTEX} fragmentShader={fragment} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Cloud deck                                                          */
/* ------------------------------------------------------------------ */

const CLOUD_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vObjPos;
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uSunDirObj;
  uniform vec3 uCamPosObj;
  uniform vec3 uCloudColor;
  uniform float uOpacity;
  uniform float uCoverage;
  ${GLSL_NOISE}

  void main() {
    vec3 sp = normalize(vObjPos);
    vec3 p = sp * 2.15 + uSeed;

    // Cyclonic banding: stretch the noise along latitude circles
    vec3 q = vec3(p.x, p.y * 2.4, p.z) + vec3(uTime * 0.004, 0.0, -uTime * 0.003);
    float shape = fbm5(q * 1.35);
    float detail = fbm5(q * 4.6) * 0.55;
    float swirl = fbm3(q * 9.0) * 0.28;

    float density = shape * 0.62 + detail * 0.3 + swirl * 0.2 + 0.5;
    float cover = smoothstep(uCoverage, uCoverage + 0.30, density);
    if (cover < 0.004) discard;

    vec3 L = normalize(uSunDirObj);
    vec3 V = normalize(uCamPosObj - sp);
    float geomNdl = dot(sp, L);
    float day = clamp(geomNdl * 3.0 + 0.16, 0.0, 1.0);
    float ndl = clamp(geomNdl, 0.0, 1.0);

    // Silver lining + warm scattering right at the terminator
    float rim = pow(1.0 - clamp(dot(sp, V), 0.0, 1.0), 2.6);
    float sunset = pow(clamp(1.0 - abs(geomNdl), 0.0, 1.0), 8.0);

    vec3 col = uCloudColor * (0.045 + 1.05 * ndl);
    col += vec3(1.0, 0.72, 0.45) * sunset * day * 0.55;
    col += vec3(1.0) * rim * ndl * 0.22;

    float alpha = cover * uOpacity * (0.55 + 0.45 * day);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

function CloudDeck({
  radius,
  seed,
  color,
  opacity,
  coverage,
  speed,
  simTimeRef,
}: {
  radius: number;
  seed: number;
  color: string;
  opacity: number;
  coverage: number;
  speed: number;
  simTimeRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: seed },
      uSunDirObj: { value: new THREE.Vector3(1, 0, 0) },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 5) },
      uCloudColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uCoverage: { value: coverage },
    }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = simTimeRef.current;
    mesh.rotation.y = t * speed;
    mesh.updateWorldMatrix(true, false);

    _inv.copy(mesh.matrixWorld).invert();
    _sunLocal.copy(SUN_WORLD).applyMatrix4(_inv);
    if (_sunLocal.lengthSq() > 1e-9) _sunLocal.normalize();
    _camLocal.copy(camera.position).applyMatrix4(_inv);

    uniforms.uTime.value = t;
    uniforms.uSunDirObj.value.copy(_sunLocal);
    uniforms.uCamPosObj.value.copy(_camLocal);
  });

  return (
    <mesh ref={meshRef} scale={radius} renderOrder={2}>
      <sphereGeometry args={[1, 72, 44]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={PLANET_VERTEX}
        fragmentShader={CLOUD_FRAGMENT}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Atmospheric halo shell                                              */
/* ------------------------------------------------------------------ */

const HAZE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vObjPos;
  uniform vec3 uSunDirObj;
  uniform vec3 uCamPosObj;
  uniform vec3 uColor;
  uniform float uStrength;

  void main() {
    vec3 sp = normalize(vObjPos);
    vec3 V = normalize(uCamPosObj - sp);
    vec3 L = normalize(uSunDirObj);

    float ndv = clamp(dot(sp, V), 0.0, 1.0);
    float limb = pow(1.0 - ndv, 3.4);
    float geomNdl = dot(sp, L);
    float lit = clamp(geomNdl * 1.35 + 0.30, 0.0, 1.0);

    // Mie forward-scattering: a warm sliver hugging the terminator
    float sunset = pow(clamp(1.0 - abs(geomNdl), 0.0, 1.0), 7.0) * 0.85;
    vec3 col = mix(uColor, vec3(1.0, 0.58, 0.32), sunset);

    float alpha = limb * uStrength * lit * 0.85;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

function AtmosphereHalo({
  radius,
  color,
  strength,
}: {
  radius: number;
  color: string;
  strength: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uSunDirObj: { value: new THREE.Vector3(1, 0, 0) },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 5) },
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: strength },
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
    uniforms.uSunDirObj.value.copy(_sunLocal);
    uniforms.uCamPosObj.value.copy(_camLocal);
  });

  return (
    <mesh ref={meshRef} scale={radius} renderOrder={3}>
      <sphereGeometry args={[1, 64, 40]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={PLANET_VERTEX}
        fragmentShader={HAZE_FRAGMENT}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Moons                                                               */
/* ------------------------------------------------------------------ */

function Moon({ def, simTimeRef }: { def: MoonDef; simTimeRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const t = simTimeRef.current;
    const a = (t / def.period) * Math.PI * 2;
    const inc = THREE.MathUtils.degToRad(def.inclination);
    const x = Math.cos(a) * def.distance;
    const z = Math.sin(a) * def.distance;
    g.position.set(x, -z * Math.sin(inc), z * Math.cos(inc));
  });

  return (
    <group ref={groupRef}>
      <ShadedBody
        surface={def.surface}
        radius={def.radius}
        seed={seed}
        segments={44}
        tintA={def.tintA}
        tintB={def.tintB}
        craterAmount={def.craterAmount ?? 1}
        mariaAmount={def.mariaAmount ?? 0.3}
        bump={def.bump ?? 0.0024}
        ambient={def.ambient ?? 0.05}
        atmoColor="#94a3b8"
        atmoStrength={0.08}
        spinPeriod={def.period}
        simTimeRef={simTimeRef}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Full planet assembly                                                */
/* ------------------------------------------------------------------ */

export function Planet({
  def,
  simTimeRef,
  showMoons = true,
}: {
  def: BodyDef;
  simTimeRef: React.MutableRefObject<number>;
  showMoons?: boolean;
}) {
  const seed = useMemo(() => Math.random() * 100, []);
  const tilt = THREE.MathUtils.degToRad(def.axialTilt);

  return (
    <group rotation={[0, 0, tilt]}>
      <ShadedBody
        surface={def.surface}
        radius={def.radius}
        seed={seed}
        segments={def.radius > 0.5 ? 128 : 96}
        tintA={def.tintA}
        tintB={def.tintB}
        craterAmount={def.craterAmount ?? 1}
        mariaAmount={def.mariaAmount ?? 0.35}
        bump={def.bump}
        ambient={def.ambient}
        specTint={def.specTint}
        atmoColor={def.atmoColor}
        atmoStrength={def.atmoStrength}
        nightLights={def.nightLights}
        ringShadow={
          def.rings && def.rings.opacity > 0.5
            ? { inner: def.rings.inner, outer: def.rings.outer }
            : null
        }
        spinPeriod={def.rotationPeriod}
        simTimeRef={simTimeRef}
      />

      {def.clouds && (
        <CloudDeck
          radius={def.radius * def.clouds.scale}
          seed={seed + 17}
          color={def.clouds.color}
          opacity={def.clouds.opacity}
          coverage={def.clouds.coverage}
          speed={def.clouds.speed}
          simTimeRef={simTimeRef}
        />
      )}

      {def.haze && (
        <AtmosphereHalo
          radius={def.radius * def.haze.scale}
          color={def.haze.color}
          strength={def.haze.strength}
        />
      )}

      {def.rings && (
        <PlanetRings
          planetRadius={def.radius}
          inner={def.rings.inner}
          outer={def.rings.outer}
          opacity={def.rings.opacity}
          tint={def.rings.tint}
          detail={def.rings.detail}
          simTimeRef={simTimeRef}
        />
      )}

      {showMoons && def.moons?.map((m) => <Moon key={m.id} def={m} simTimeRef={simTimeRef} />)}
    </group>
  );
}
