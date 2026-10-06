/**
 * Shared GLSL building blocks for the hyper-real planetary shaders.
 * Everything is evaluated in *object space on a unit sphere*, which keeps the
 * surface detail locked to the body as it spins and makes ring/limb math trivial.
 */

export const GLSL_NOISE = /* glsl */ `
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute289(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrtV(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  // Simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT)
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289v3(i);
    vec4 p = permute289(permute289(permute289(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrtV(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm3(vec3 p) {
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }

  float fbm5(vec3 p) {
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.02 + 13.7; a *= 0.5; }
    return s;
  }

  float fbm7(vec3 p) {
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 7; i++) { s += a * snoise(p); p = p * 2.01 + 11.3; a *= 0.5; }
    return s;
  }

  // Ridged multifractal — mountain chains, rift walls, plasma filaments
  float ridged4(vec3 p) {
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(snoise(p));
      s += a * n * n;
      p = p * 2.14 + 23.9;
      a *= 0.5;
    }
    return s;
  }

  // Impact basin field: inverted absolute noise raised to a high power
  float craterField(vec3 p, float freq, float sharp) {
    float n = 1.0 - abs(snoise(p * freq));
    return pow(clamp(n, 0.0, 1.0), sharp);
  }
`;

/** Shared uniforms declaration block for every planetary body. */
export const GLSL_PLANET_UNIFORMS = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3  uSunDirObj;   // sun direction in object space (normalised)
  uniform vec3  uCamPosObj;   // camera position in object space (unit-sphere space)
  uniform vec3  uSunColor;
  uniform float uSunIntensity;
  uniform float uAmbient;
  uniform vec3  uAtmoColor;
  uniform float uAtmoStrength;
  uniform float uBump;
  uniform float uNightLights;
  uniform float uRingShadow;
  uniform float uRingInner;
  uniform float uRingOuter;
  uniform float uSpecTint;
`;

/** Shared vertex shader — all bodies are unit spheres scaled by the mesh. */
export const PLANET_VERTEX = /* glsl */ `
  varying vec3 vObjPos;
  void main() {
    vObjPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Ring occlusion + shading helpers + the shared lighting resolve. */
export const GLSL_PLANET_MAIN = /* glsl */ `
  // How much sunlight survives Saturn's rings before reaching this surface point
  float ringShadowFactor(vec3 p, vec3 L) {
    if (uRingShadow < 0.5) return 1.0;
    if (abs(L.y) < 0.0015) return 1.0;
    float t = -p.y / L.y;
    if (t <= 0.0) return 1.0;
    vec3 hit = p + L * t;
    float r = length(hit.xz);
    if (r < uRingInner || r > uRingOuter) return 1.0;
    float rn = (r - uRingInner) / max(0.0001, uRingOuter - uRingInner);
    float dens = 0.62 + 0.30 * sin(rn * 38.0) + 0.16 * sin(rn * 91.0 + 1.3);
    float cassini = smoothstep(0.40, 0.44, rn) * (1.0 - smoothstep(0.50, 0.545, rn));
    dens *= mix(1.0, 0.10, cassini);
    dens *= smoothstep(0.0, 0.07, rn) * (1.0 - smoothstep(0.90, 1.0, rn));
    return clamp(1.0 - dens * 0.86, 0.06, 1.0);
  }

  vec3 filmic(vec3 c) {
    return vec3(1.0) - exp(-c * 1.25);
  }

  void main() {
    vec3 sp = normalize(vObjPos);

    vec3 albedo; float rough; float specMask; float height; float emiss;
    surface(sp, albedo, rough, specMask, height, emiss);

    // --- Normal perturbation from the procedural height field (relief shading)
    vec3 N = sp;
    if (uBump > 0.000001) {
      vec3 t1 = normalize(cross(vec3(0.0, 1.0, 0.0), sp) + vec3(1e-4, 0.0, 1e-4));
      vec3 t2 = normalize(cross(sp, t1));
      float e = 0.0045;
      vec3 ca; float ra; float sa; float ha; float ea;
      vec3 cb; float rb; float sb; float hb; float eb;
      surface(normalize(sp + t1 * e), ca, ra, sa, ha, ea);
      surface(normalize(sp + t2 * e), cb, rb, sb, hb, eb);
      vec2 grad = vec2(ha - height, hb - height) / e;
      N = normalize(sp - uBump * (t1 * grad.x + t2 * grad.y));
    }

    vec3 L = normalize(uSunDirObj);
    vec3 V = normalize(uCamPosObj - sp);

    float geomNdl = dot(sp, L);
    float dayMask = clamp(geomNdl * 3.4 + 0.18, 0.0, 1.0);
    float ndl = clamp(dot(N, L), 0.0, 1.0) * dayMask;

    float shadow = ringShadowFactor(sp, L);

    // Diffuse with a touch of dusty back-scatter near the terminator
    float backScatter = pow(clamp(1.0 - abs(geomNdl), 0.0, 1.0), 3.0) * 0.12 * dayMask;
    vec3 diffuse = albedo * uSunColor * uSunIntensity * (ndl + backScatter) * shadow;

    // Specular — oceans, ice sheets, methane hazes
    vec3 H = normalize(L + V);
    float shininess = mix(16.0, 220.0, clamp(1.0 - rough, 0.0, 1.0));
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), shininess) * specMask * dayMask * shadow;
    vec3 specular = uSunColor * spec * (0.55 + uSpecTint);

    // Starlight / galaxy ambient fill so the night side is never pure black
    vec3 ambient = albedo * uAmbient * (0.55 + 0.45 * clamp(N.y * 0.5 + 0.5, 0.0, 1.0));

    // Atmospheric limb scattering
    float fres = pow(1.0 - clamp(dot(sp, V), 0.0, 1.0), 3.2);
    float limbLight = clamp(geomNdl * 1.6 + 0.42, 0.0, 1.0);
    vec3 atmosphere = uAtmoColor * fres * uAtmoStrength * limbLight;

    // Night side city lights (Earth)
    float night = clamp(-geomNdl * 2.4 + 0.22, 0.0, 1.0);
    vec3 cityGlow = vec3(1.0, 0.78, 0.42) * emiss * uNightLights * night;

    vec3 color = diffuse + specular + ambient + atmosphere + cityGlow;
    color = filmic(color);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Builds a complete fragment shader from a body-specific surface() function. */
export function buildPlanetFragment(surfaceGLSL: string): string {
  return `
    precision highp float;
    varying vec3 vObjPos;
    ${GLSL_PLANET_UNIFORMS}
    ${GLSL_NOISE}
    ${surfaceGLSL}
    ${GLSL_PLANET_MAIN}
  `;
}
