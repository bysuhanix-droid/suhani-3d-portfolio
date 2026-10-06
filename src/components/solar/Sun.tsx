import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLSL_NOISE, PLANET_VERTEX } from './glslCommon';

const _inv = new THREE.Matrix4();
const _camLocal = new THREE.Vector3();

/* ------------------------------------------------------------------ */
/* 1 · Photosphere — convective granulation, sunspots, limb darkening   */
/* ------------------------------------------------------------------ */

const PHOTOSPHERE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vObjPos;
  uniform float uTime;
  uniform vec3 uCamPosObj;
  uniform float uIntensity;
  ${GLSL_NOISE}

  void main() {
    vec3 sp = normalize(vObjPos);
    vec3 V = normalize(uCamPosObj - sp);
    float mu = clamp(dot(sp, V), 0.0, 1.0);      // 1 at disc centre → 0 at the limb
    float t = uTime;

    // Convection: supergranulation carries granules that boil on their own timescale
    vec3 drift = vec3(0.0, t * 0.010, t * 0.006);
    float superGran = fbm5(sp * 3.6 + drift * 1.4);
    vec3 warped = sp * 13.5 + vec3(superGran * 1.1) + drift * 3.0;

    float gran = fbm5(warped);
    float fine = fbm3(sp * 38.0 + drift * 8.0) * 0.55;
    float lanes = pow(clamp(1.0 - abs(snoise(sp * 21.0 + drift * 5.0)), 0.0, 1.0), 2.4);

    float temp = 0.46 + gran * 0.42 + fine * 0.22 + superGran * 0.26 + lanes * 0.22;

    // Magnetic active regions: penumbral filaments around dark umbrae
    float mag = fbm3(sp * 2.7 + 19.0 + vec3(0.0, t * 0.004, 0.0));
    float penumbra = smoothstep(0.30, 0.52, mag);
    float umbra = smoothstep(0.46, 0.66, mag);
    float filament = 0.5 + 0.5 * sin(atan(sp.z, sp.x) * 40.0 + mag * 22.0);
    temp -= penumbra * (0.34 + filament * 0.10) + umbra * 0.42;

    // Eddington limb darkening
    float limb = 0.34 + 0.66 * pow(mu, 0.52);
    temp *= limb;

    // Faculae — bright magnetic froth, most visible near the limb
    float faculae = pow(clamp(fine + 0.45, 0.0, 1.0), 3.0) * (1.0 - mu) * 0.55;
    temp += faculae * (0.4 + penumbra * 0.9);

    temp = clamp(temp, 0.0, 1.6);

    // Black-body style ramp: 3,800 K umbra → 5,800 K photosphere → 6,600 K faculae
    vec3 cUmbra   = vec3(0.34, 0.055, 0.010);
    vec3 cOrange  = vec3(1.00, 0.330, 0.045);
    vec3 cAmber   = vec3(1.00, 0.690, 0.230);
    vec3 cWhite   = vec3(1.00, 0.945, 0.800);
    vec3 cPlasma  = vec3(1.00, 1.000, 0.965);

    vec3 col = mix(cUmbra, cOrange, smoothstep(0.02, 0.36, temp));
    col = mix(col, cAmber, smoothstep(0.34, 0.68, temp));
    col = mix(col, cWhite, smoothstep(0.66, 1.02, temp));
    col = mix(col, cPlasma, smoothstep(1.02, 1.35, temp));

    // Chromospheric red glow bleeding over the extreme limb
    col = mix(col, vec3(1.0, 0.36, 0.14), pow(1.0 - mu, 6.0) * 0.55);

    gl_FragColor = vec4(col * uIntensity, 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* 2 · Chromosphere + spicule / prominence shells                       */
/* ------------------------------------------------------------------ */

const FLAME_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vObjPos;
  uniform float uTime;
  uniform vec3 uCamPosObj;
  uniform float uEdgePower;
  uniform float uThreshold;
  uniform float uStrength;
  uniform vec3 uColorHot;
  uniform vec3 uColorCool;
  uniform float uScale;
  uniform float uSpeed;
  ${GLSL_NOISE}

  void main() {
    vec3 sp = normalize(vObjPos);
    vec3 V = normalize(uCamPosObj - sp);
    float mu = clamp(dot(sp, V), 0.0, 1.0);
    float rim = pow(1.0 - mu, uEdgePower);
    if (rim < 0.002) discard;

    float t = uTime * uSpeed;

    // Ridged plasma filaments dragged along magnetic loops
    vec3 q = sp * uScale + vec3(0.0, t * 0.6, t * 0.25);
    float fil = ridged4(q);
    float churn = fbm5(sp * (uScale * 0.55) - vec3(t * 0.35, 0.0, t * 0.2));
    float mask = smoothstep(uThreshold, uThreshold + 0.42, fil * 0.72 + churn * 0.42);

    // Flickering eruption pulses
    float pulse = 0.72 + 0.28 * sin(t * 2.2 + fil * 9.0 + churn * 5.0);

    float a = rim * mask * pulse * uStrength;
    if (a < 0.002) discard;

    vec3 col = mix(uColorCool, uColorHot, clamp(mask * 1.25, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;

/* ------------------------------------------------------------------ */
/* 3 · Corona — camera-facing volumetric halo with streamers            */
/* ------------------------------------------------------------------ */

const CORONA_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uCoreRadius;
  ${GLSL_NOISE}

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    float ang = atan(p.y, p.x);
    float t = uTime * 0.05;

    // Inner K-corona: steep falloff hugging the limb
    float inner = exp(-pow(max(r - uCoreRadius, 0.0) * 11.0, 1.25));

    // Outer F-corona: broad, soft
    float outer = exp(-pow(max(r - uCoreRadius, 0.0) * 3.1, 1.05)) * 0.55;

    // Magnetically shaped streamers & polar plumes
    vec3 sph = vec3(cos(ang) * 1.6, sin(ang) * 1.6, t);
    float streamers = fbm5(sph) * 0.5 + 0.5;
    streamers = pow(clamp(streamers, 0.0, 1.0), 2.1);
    float rays = streamers * exp(-pow(max(r - uCoreRadius, 0.0) * 4.4, 1.15));

    float glow = inner * 0.85 + outer * 0.55 + rays * 0.65;

    // Slight limb brightening ring right at the photosphere edge
    float edge = exp(-pow((r - uCoreRadius) * 42.0, 2.0)) * 0.55;
    glow += edge;

    float a = clamp(glow, 0.0, 1.6) * uOpacity;
    if (a < 0.002) discard;

    vec3 hotCol   = vec3(1.00, 0.93, 0.78);
    vec3 midCol   = vec3(1.00, 0.62, 0.22);
    vec3 outerCol = vec3(0.98, 0.36, 0.12);
    vec3 col = mix(hotCol, midCol, smoothstep(uCoreRadius * 0.8, uCoreRadius + 0.22, r));
    col = mix(col, outerCol, smoothstep(uCoreRadius + 0.10, 0.75, r));

    gl_FragColor = vec4(col * a, a);
  }
`;

const CORONA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ------------------------------------------------------------------ */

export function Sun({
  radius,
  simTimeRef,
}: {
  radius: number;
  simTimeRef: React.MutableRefObject<number>;
}) {
  const photoRef = useRef<THREE.Mesh>(null);
  const chromoRef = useRef<THREE.Mesh>(null);
  const promRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const photoUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 8) },
      uIntensity: { value: 1.0 },
    }),
    []
  );

  const chromoUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 8) },
      uEdgePower: { value: 2.6 },
      uThreshold: { value: 0.30 },
      uStrength: { value: 1.15 },
      uColorHot: { value: new THREE.Color('#fff0c9') },
      uColorCool: { value: new THREE.Color('#ff5a12') },
      uScale: { value: 9.0 },
      uSpeed: { value: 0.30 },
    }),
    []
  );

  const promUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamPosObj: { value: new THREE.Vector3(0, 0, 8) },
      uEdgePower: { value: 5.5 },
      uThreshold: { value: 0.56 },
      uStrength: { value: 0.95 },
      uColorHot: { value: new THREE.Color('#ffb066') },
      uColorCool: { value: new THREE.Color('#e01f0a') },
      uScale: { value: 4.4 },
      uSpeed: { value: 0.18 },
    }),
    []
  );

  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.92 },
      uCoreRadius: { value: 0.155 },
    }),
    []
  );

  useFrame(() => {
    const t = simTimeRef.current;

    [
      { mesh: photoRef.current, u: photoUniforms },
      { mesh: chromoRef.current, u: chromoUniforms },
      { mesh: promRef.current, u: promUniforms },
    ].forEach(({ mesh, u }) => {
      if (!mesh) return;
      mesh.rotation.y = t * 0.026; // ~25 day differential rotation, compressed
      mesh.updateWorldMatrix(true, false);
      _inv.copy(mesh.matrixWorld).invert();
      _camLocal.copy(camera.position).applyMatrix4(_inv);
      u.uTime.value = t;
      u.uCamPosObj.value.copy(_camLocal);
    });

    coronaUniforms.uTime.value = t;
    if (coronaRef.current) {
      // Billboard the corona toward the viewer
      coronaRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group>
      {/* Photosphere */}
      <mesh ref={photoRef} scale={radius} renderOrder={1}>
        <sphereGeometry args={[1, 128, 80]} />
        <shaderMaterial
          uniforms={photoUniforms}
          vertexShader={PLANET_VERTEX}
          fragmentShader={PHOTOSPHERE_FRAGMENT}
        />
      </mesh>

      {/* Chromosphere — the burning, boiling edge */}
      <mesh ref={chromoRef} scale={radius * 1.035} renderOrder={5}>
        <sphereGeometry args={[1, 96, 60]} />
        <shaderMaterial
          uniforms={chromoUniforms}
          vertexShader={PLANET_VERTEX}
          fragmentShader={FLAME_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Prominences / eruptive plasma tongues */}
      <mesh ref={promRef} scale={radius * 1.26} renderOrder={5}>
        <sphereGeometry args={[1, 80, 52]} />
        <shaderMaterial
          uniforms={promUniforms}
          vertexShader={PLANET_VERTEX}
          fragmentShader={FLAME_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Corona halo */}
      <mesh ref={coronaRef} renderOrder={6}>
        <planeGeometry args={[radius * 13, radius * 13]} />
        <shaderMaterial
          uniforms={coronaUniforms}
          vertexShader={CORONA_VERTEX}
          fragmentShader={CORONA_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Physical light for the asteroid field */}
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={0} decay={0} color="#fff3df" />
    </group>
  );
}
