/**
 * Per-body procedural surface functions.
 * Signature: surface(sp, albedo, rough, specMask, height, emiss)
 *   sp       — normalised object-space point on the unit sphere
 *   albedo   — base colour
 *   rough    — 0 = mirror, 1 = dust
 *   specMask — how much specular the material returns
 *   height   — elevation field used for relief/bump shading
 *   emiss    — self-illumination (city lights)
 */

/** Airless cratered regolith (Mercury, Moon, Callisto, Ganymede, Triton…) */
export const SURFACE_ROCKY = /* glsl */ `
  uniform vec3 uTintA;
  uniform vec3 uTintB;
  uniform float uCraterAmount;
  uniform float uMariaAmount;

  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    vec3 p = sp * 2.0 + uSeed;

    float base = fbm5(p * 1.35);
    float mid  = fbm5(p * 5.2) * 0.45;
    float fine = fbm3(p * 19.0) * 0.16;

    float c1 = craterField(p + 3.1,  2.6, 7.0);
    float c2 = craterField(p + 9.7,  6.4, 9.0);
    float c3 = craterField(p + 21.3, 14.5, 11.0);
    float c4 = craterField(p + 37.9, 31.0, 13.0);
    float craters = (c1 * 0.52 + c2 * 0.30 + c3 * 0.20 + c4 * 0.12) * uCraterAmount;

    height = base * 0.38 + mid * 0.26 + fine - craters * 0.62;

    float shade = clamp(0.48 + base * 0.42 + mid * 0.5 - craters * 0.42, 0.0, 1.0);
    albedo = mix(uTintA, uTintB, shade);

    // Ancient flood-basalt plains (lunar maria)
    float maria = smoothstep(0.34, 0.68, fbm5(p * 0.95 + 41.0)) * uMariaAmount;
    albedo = mix(albedo, uTintA * 0.62, maria);
    height -= maria * 0.12;

    // Bright ejecta ray systems from fresh impacts
    float rays = pow(craterField(p + 61.0, 1.9, 22.0), 1.4);
    albedo = mix(albedo, uTintB * 1.22 + 0.06, clamp(rays * 0.55, 0.0, 0.55));

    rough = 1.0;
    specMask = 0.0;
    emiss = 0.0;
  }
`;

/** Venus — an opaque, super-rotating sulphuric-acid cloud deck */
export const SURFACE_VENUS = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    float t = uTime * 0.014;
    vec3 p = sp * 1.75 + vec3(t * 1.6, 0.0, -t * 1.2) + uSeed;

    float warp = fbm5(p * 2.1);
    float shear = sin(sp.y * 11.0 + warp * 3.2 + t * 2.0) * 0.5 + 0.5;
    float clouds = fbm5(p * 3.1 + vec3(warp * 1.5));
    float deck = clamp(0.52 + shear * 0.20 + clouds * 0.38, 0.0, 1.0);

    vec3 sulfurDeep = vec3(0.70, 0.55, 0.30);
    vec3 sulfurPale = vec3(1.00, 0.95, 0.80);
    albedo = mix(sulfurDeep, sulfurPale, deck);

    // UV-absorber "Y" feature streaks
    float yFeature = smoothstep(0.52, 0.86, fbm5(p * 1.05 + 7.4));
    albedo = mix(albedo, vec3(0.63, 0.50, 0.30), yFeature * 0.38);

    // Bright polar collars
    float polar = smoothstep(0.72, 0.97, abs(sp.y));
    albedo = mix(albedo, vec3(0.96, 0.91, 0.79), polar * 0.5);

    height = clouds * 0.25 + shear * 0.08;
    rough = 0.88;
    specMask = 0.05;
    emiss = 0.0;
  }
`;

/** Earth — oceans, biomes, ice caps, coastal shelves and night-side city lights */
export const SURFACE_EARTH = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    vec3 p = sp * 1.85 + uSeed;

    float cont = fbm5(p * 1.05) + fbm5(p * 2.6) * 0.34;
    float landMask = smoothstep(0.015, 0.085, cont);
    float elev = clamp((cont - 0.015) * 2.1, 0.0, 1.0);
    float mountains = ridged4(p * 5.4) * elev * 0.9;
    float lat = abs(sp.y);

    // --- Oceans: abyssal plains, mid-depth, continental shelves
    float depth = clamp((0.015 - cont) * 2.6, 0.0, 1.0);
    vec3 abyss   = vec3(0.008, 0.035, 0.115);
    vec3 pelagic = vec3(0.020, 0.105, 0.245);
    vec3 shelf   = vec3(0.055, 0.315, 0.415);
    vec3 ocean = mix(shelf, pelagic, smoothstep(0.0, 0.22, depth));
    ocean = mix(ocean, abyss, smoothstep(0.22, 0.72, depth));

    // --- Land biomes
    float biome = fbm5(p * 3.1 + 5.0);
    float arid = smoothstep(0.14, 0.36, lat) * (1.0 - smoothstep(0.40, 0.60, lat));
    vec3 rainforest = vec3(0.075, 0.215, 0.085);
    vec3 grassland  = vec3(0.235, 0.315, 0.135);
    vec3 desert     = vec3(0.665, 0.545, 0.330);
    vec3 taiga      = vec3(0.180, 0.235, 0.165);
    vec3 rock       = vec3(0.395, 0.355, 0.310);

    vec3 land = mix(rainforest, grassland, clamp(biome * 1.25 + 0.35, 0.0, 1.0));
    land = mix(land, desert, clamp(arid * 1.05 + biome * 0.25, 0.0, 1.0));
    land = mix(land, taiga, smoothstep(0.52, 0.74, lat));
    land = mix(land, rock, clamp(mountains * 0.85, 0.0, 0.85));

    albedo = mix(ocean, land, landMask);

    // --- Cryosphere
    float iceNoise = fbm5(p * 4.2) * 0.07;
    float ice = smoothstep(0.795, 0.905, lat + iceNoise);
    float glacier = smoothstep(0.70, 0.95, mountains) * smoothstep(0.30, 0.62, lat);
    albedo = mix(albedo, vec3(0.90, 0.945, 0.985), clamp(ice + glacier * 0.7, 0.0, 1.0));

    specMask = (1.0 - landMask) * 1.05 + ice * 0.22;
    rough = mix(0.05, 0.95, landMask) * (1.0 - ice * 0.35);
    height = mix(-0.10 - depth * 0.05, elev * 0.30 + mountains * 0.34, landMask);

    // --- Human night lights: coastal, mid-latitude, clustered
    float cityNoise = pow(clamp(fbm5(p * 8.5 + 31.0) * 1.35 + 0.42, 0.0, 1.0), 4.5);
    float coastal = 1.0 - smoothstep(0.0, 0.5, abs(cont - 0.10));
    emiss = landMask * cityNoise * (0.35 + coastal) * (1.0 - ice) * (1.0 - smoothstep(0.55, 0.80, lat));
  }
`;

/** Mars — iron-oxide dust, dark basalt albedo features, Valles-style rift, CO2 caps */
export const SURFACE_MARS = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    vec3 p = sp * 1.8 + uSeed;

    float base = fbm5(p * 1.3);
    float dunes = fbm5(p * 7.5) * 0.42;
    float craters = craterField(p + 5.0, 4.6, 8.0) * 0.5 + craterField(p + 17.0, 10.5, 10.0) * 0.32;

    // Equatorial canyon system
    float rift = exp(-pow((sp.y + 0.03) * 13.0, 2.0)) * smoothstep(0.30, 0.72, fbm5(p * 1.15 + 13.0));
    // Shield volcano bulge
    float volcano = exp(-pow(length(sp - normalize(vec3(0.62, 0.22, -0.75))) * 3.4, 2.0));

    height = base * 0.42 + dunes * 0.22 - craters * 0.48 - rift * 0.70 + volcano * 0.55;

    vec3 rustPale = vec3(0.795, 0.470, 0.275);
    vec3 rustDeep = vec3(0.430, 0.215, 0.130);
    vec3 basalt   = vec3(0.285, 0.205, 0.175);

    albedo = mix(rustDeep, rustPale, clamp(0.48 + base * 0.62 + dunes * 0.55, 0.0, 1.0));
    float albedoFeature = smoothstep(0.42, 0.76, fbm5(p * 0.95 + 27.0));
    albedo = mix(albedo, basalt, albedoFeature * 0.62);
    albedo = mix(albedo, vec3(0.22, 0.135, 0.10), clamp(rift * 0.8, 0.0, 0.8));
    albedo = mix(albedo, vec3(0.62, 0.36, 0.22), clamp(volcano * 0.7, 0.0, 0.7));

    // Seasonal CO2 / water-ice caps with ragged edges
    float cap = smoothstep(0.855, 0.945, abs(sp.y) + fbm5(p * 4.5) * 0.055);
    albedo = mix(albedo, vec3(0.93, 0.935, 0.955), cap);

    // Global dust haze lightens everything slightly
    albedo = mix(albedo, vec3(0.74, 0.55, 0.40), 0.10);

    rough = 1.0;
    specMask = cap * 0.12;
    emiss = 0.0;
  }
`;

/** Jupiter — turbulent zonal jets, storm ovals and the Great Red Spot */
export const SURFACE_JUPITER = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    float t = uTime * 0.02;
    vec3 p = sp * vec3(2.1, 3.2, 2.1) + uSeed;

    // Latitude-dependent zonal flow shear
    float flow = sp.y * 6.0;
    vec3 q = p + vec3(sin(flow) * t * 2.2, 0.0, cos(flow) * t * 2.2);

    float turb = fbm5(q * 1.75) * 0.55 + fbm5(q * 4.4) * 0.26 + fbm3(q * 11.0) * 0.10;
    float lat = sp.y + turb * 0.075;

    float bands = sin(lat * 24.0) * 0.5 + sin(lat * 10.5 + 1.7) * 0.34 + sin(lat * 47.0) * 0.13;
    float b = clamp(bands * 0.62 + 0.5, 0.0, 1.0);

    vec3 zoneCream = vec3(0.945, 0.885, 0.760);
    vec3 beltTan   = vec3(0.705, 0.495, 0.315);
    vec3 beltBrown = vec3(0.415, 0.255, 0.170);
    vec3 poleHaze  = vec3(0.470, 0.420, 0.430);

    albedo = mix(beltBrown, zoneCream, smoothstep(0.12, 0.88, b));
    albedo = mix(albedo, beltTan, smoothstep(0.32, 0.66, b) * 0.55);

    // White anticyclonic ovals & barges
    float storms = smoothstep(0.58, 0.86, fbm5(q * 3.4));
    albedo = mix(albedo, vec3(0.975, 0.955, 0.905), storms * 0.40 * (1.0 - smoothstep(0.50, 0.88, abs(sp.y))));

    // --- Great Red Spot (anticyclone at ~22°S)
    float lon = atan(sp.z, sp.x);
    float dlon = atan(sin(lon - 2.05), cos(lon - 2.05));
    vec2 gq = vec2(dlon / 0.62, (sp.y + 0.335) / 0.145);
    float gd = length(gq);
    float grs = 1.0 - smoothstep(0.55, 1.05, gd);
    float swirlAng = atan(gq.y, gq.x) + t * 6.0 - gd * 2.6;
    float swirl = fbm5(vec3(cos(swirlAng) * gd * 1.7, sin(swirlAng) * gd * 1.7, t * 0.8));
    vec3 grsColor = mix(vec3(0.735, 0.285, 0.165), vec3(0.930, 0.615, 0.420), clamp(swirl + 0.5, 0.0, 1.0));
    albedo = mix(albedo, grsColor, grs * 0.94);

    // Polar haze
    albedo = mix(albedo, poleHaze, smoothstep(0.58, 0.96, abs(sp.y)) * 0.55);

    height = bands * 0.08 + turb * 0.22 + grs * 0.24;
    rough = 0.82;
    specMask = 0.0;
    emiss = 0.0;
  }
`;

/** Saturn — soft butterscotch banding and a polar vortex */
export const SURFACE_SATURN = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    float t = uTime * 0.016;
    vec3 p = sp * vec3(2.0, 3.0, 2.0) + uSeed;
    vec3 q = p + vec3(t * 1.5, 0.0, -t * 1.5);

    float turb = fbm5(q * 1.6) * 0.5 + fbm5(q * 3.9) * 0.22;
    float lat = sp.y + turb * 0.055;

    float bands = sin(lat * 17.0) * 0.5 + sin(lat * 7.5 + 0.9) * 0.36 + sin(lat * 33.0) * 0.1;
    float b = clamp(bands * 0.55 + 0.5, 0.0, 1.0);

    vec3 cream    = vec3(0.960, 0.895, 0.735);
    vec3 butter   = vec3(0.855, 0.715, 0.470);
    vec3 amberBelt= vec3(0.660, 0.500, 0.300);
    vec3 polarBlue= vec3(0.330, 0.400, 0.500);

    albedo = mix(amberBelt, cream, smoothstep(0.1, 0.9, b));
    albedo = mix(albedo, butter, smoothstep(0.30, 0.70, b) * 0.6);

    // North polar hexagonal vortex hint
    float polar = smoothstep(0.80, 0.97, sp.y);
    float hex = 0.5 + 0.5 * cos(atan(sp.z, sp.x) * 6.0 + t * 3.0);
    albedo = mix(albedo, polarBlue, polar * (0.35 + hex * 0.30));
    albedo = mix(albedo, polarBlue * 0.8, smoothstep(0.82, 0.98, -sp.y) * 0.40);

    height = bands * 0.05 + turb * 0.16;
    rough = 0.9;
    specMask = 0.0;
    emiss = 0.0;
  }
`;

/** Uranus — near-featureless methane haze with faint zonal structure */
export const SURFACE_URANUS = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    float t = uTime * 0.01;
    vec3 p = sp * vec3(2.4, 3.6, 2.4) + uSeed + vec3(t, 0.0, -t);

    float turb = fbm5(p * 1.4) * 0.35;
    float lat = sp.y + turb * 0.05;
    float bands = sin(lat * 13.0) * 0.5 + sin(lat * 5.5) * 0.3;
    float b = clamp(bands * 0.32 + 0.5, 0.0, 1.0);

    vec3 pale  = vec3(0.640, 0.885, 0.900);
    vec3 deep  = vec3(0.430, 0.740, 0.795);
    albedo = mix(deep, pale, b);

    // Faint bright polar hood + occasional methane cloud
    float hood = smoothstep(0.55, 0.95, abs(sp.y));
    albedo = mix(albedo, vec3(0.760, 0.930, 0.930), hood * 0.30);
    float cloud = smoothstep(0.76, 0.92, fbm5(p * 5.0));
    albedo = mix(albedo, vec3(0.95, 0.99, 1.0), cloud * 0.25);

    height = turb * 0.12;
    rough = 0.94;
    specMask = 0.02;
    emiss = 0.0;
  }
`;

/** Neptune — deep azure, supersonic jets, dark spot and white methane cirrus */
export const SURFACE_NEPTUNE = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    float t = uTime * 0.026;
    vec3 p = sp * vec3(2.2, 3.4, 2.2) + uSeed;
    vec3 q = p + vec3(t * 2.0, 0.0, -t * 1.4);

    float turb = fbm5(q * 1.7) * 0.5 + fbm5(q * 4.2) * 0.22;
    float lat = sp.y + turb * 0.07;
    float bands = sin(lat * 15.0) * 0.5 + sin(lat * 6.5 + 1.2) * 0.34;
    float b = clamp(bands * 0.45 + 0.5, 0.0, 1.0);

    vec3 azure  = vec3(0.145, 0.330, 0.760);
    vec3 cobalt = vec3(0.075, 0.205, 0.560);
    vec3 sky    = vec3(0.400, 0.600, 0.930);

    albedo = mix(cobalt, azure, b);
    albedo = mix(albedo, sky, smoothstep(0.55, 0.95, b) * 0.45);

    // Great Dark Spot
    float lon = atan(sp.z, sp.x);
    float dlon = atan(sin(lon + 1.1), cos(lon + 1.1));
    vec2 gq = vec2(dlon / 0.55, (sp.y + 0.30) / 0.16);
    float spot = 1.0 - smoothstep(0.5, 1.0, length(gq));
    albedo = mix(albedo, vec3(0.045, 0.110, 0.360), spot * 0.85);

    // Bright methane cirrus streaks ("scooter" clouds)
    float cirrus = smoothstep(0.62, 0.84, fbm5(q * 5.2 + vec3(0.0, 2.0, 0.0)));
    albedo = mix(albedo, vec3(0.93, 0.965, 1.0), cirrus * 0.45 * (1.0 - spot));

    height = turb * 0.18 + cirrus * 0.1;
    rough = 0.88;
    specMask = 0.02;
    emiss = 0.0;
  }
`;

/** Io — sulphur-yellow volcanic crust with red-orange paterae */
export const SURFACE_IO = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    vec3 p = sp * 2.4 + uSeed;
    float base = fbm5(p * 1.9);
    float patches = fbm5(p * 5.5);
    albedo = mix(vec3(0.90, 0.78, 0.30), vec3(0.98, 0.93, 0.66), clamp(base + 0.5, 0.0, 1.0));
    albedo = mix(albedo, vec3(0.72, 0.28, 0.14), smoothstep(0.55, 0.85, patches) * 0.6);
    albedo = mix(albedo, vec3(0.28, 0.20, 0.13), smoothstep(0.72, 0.92, fbm5(p * 9.0)) * 0.5);
    height = base * 0.3 + patches * 0.15;
    rough = 1.0;
    specMask = 0.0;
    emiss = 0.0;
  }
`;

/** Europa — cracked water-ice shell laced with rusty linea */
export const SURFACE_EUROPA = /* glsl */ `
  void surface(vec3 sp, out vec3 albedo, out float rough, out float specMask, out float height, out float emiss) {
    vec3 p = sp * 2.2 + uSeed;
    float ice = fbm5(p * 2.4) * 0.5 + 0.5;
    albedo = mix(vec3(0.74, 0.76, 0.80), vec3(0.95, 0.96, 0.98), ice);
    float linea = 1.0 - smoothstep(0.0, 0.055, abs(ridged4(p * 3.0) - 0.62));
    float linea2 = 1.0 - smoothstep(0.0, 0.035, abs(ridged4(p * 6.4 + 12.0) - 0.58));
    albedo = mix(albedo, vec3(0.58, 0.36, 0.26), clamp(linea * 0.75 + linea2 * 0.5, 0.0, 0.8));
    height = ice * 0.1 - linea * 0.25;
    rough = 0.35;
    specMask = 0.35;
    emiss = 0.0;
  }
`;
