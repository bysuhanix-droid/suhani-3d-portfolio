import * as THREE from 'three';
import {
  SURFACE_EARTH,
  SURFACE_EUROPA,
  SURFACE_IO,
  SURFACE_JUPITER,
  SURFACE_MARS,
  SURFACE_NEPTUNE,
  SURFACE_ROCKY,
  SURFACE_SATURN,
  SURFACE_URANUS,
  SURFACE_VENUS,
} from './planetSurfaces';

export interface MoonDef {
  id: string;
  name: string;
  radius: number;
  distance: number;
  period: number;
  inclination: number;
  surface: string;
  tintA?: string;
  tintB?: string;
  craterAmount?: number;
  mariaAmount?: number;
  bump?: number;
  ambient?: number;
}

export interface RingDef {
  inner: number; // in planet radii
  outer: number; // in planet radii
  opacity: number;
  tint: string;
  detail: number;
}

export interface BodyDef {
  id: string;
  name: string;
  designation: string;
  chapter: string;
  blurb: string;
  facts: { label: string; value: string }[];

  radius: number;
  distance: number;
  eccentricity: number;
  inclination: number; // degrees
  node: number; // degrees, longitude of ascending node
  phase: number; // starting mean anomaly (radians)
  orbitPeriod: number; // seconds at 1x
  rotationPeriod: number; // seconds at 1x (negative = retrograde)
  axialTilt: number; // degrees

  surface: string;
  tintA?: string;
  tintB?: string;
  craterAmount?: number;
  mariaAmount?: number;
  bump: number;
  ambient: number;
  specTint: number;
  atmoColor: string;
  atmoStrength: number;
  nightLights: number;

  clouds?: { color: string; opacity: number; speed: number; scale: number; coverage: number };
  haze?: { color: string; strength: number; scale: number };
  rings?: RingDef;
  moons?: MoonDef[];
}

export const SUN_RADIUS = 3.35;

export const SOLAR_BODIES: BodyDef[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    designation: 'SOL I · M-TYPE CORE',
    chapter: 'Origin',
    blurb:
      'Scorched, airless and cratered — a 4.5 Gyr archive of every impact the inner system ever took.',
    facts: [
      { label: 'RADIUS', value: '2,439 km' },
      { label: 'DAY', value: '58.6 d' },
      { label: 'YEAR', value: '88 d' },
      { label: 'SURFACE', value: '−173 → 427 °C' },
    ],
    radius: 0.16,
    distance: 7.1,
    eccentricity: 0.205,
    inclination: 7.0,
    node: 48,
    phase: 0.9,
    orbitPeriod: 14,
    rotationPeriod: 26,
    axialTilt: 0.03,
    surface: SURFACE_ROCKY,
    tintA: '#2a2622',
    tintB: '#9b9186',
    craterAmount: 1.0,
    mariaAmount: 0.35,
    bump: 0.0021,
    ambient: 0.05,
    specTint: 0.0,
    atmoColor: '#8a7f73',
    atmoStrength: 0.06,
    nightLights: 0,
  },
  {
    id: 'venus',
    name: 'Venus',
    designation: 'SOL II · CYTHEREAN',
    chapter: 'Atmosphere',
    blurb:
      'A runaway greenhouse wrapped in sulphuric acid cloud decks that super-rotate 60× faster than the planet.',
    facts: [
      { label: 'RADIUS', value: '6,051 km' },
      { label: 'DAY', value: '243 d retro' },
      { label: 'YEAR', value: '225 d' },
      { label: 'SURFACE', value: '464 °C · 92 bar' },
    ],
    radius: 0.335,
    distance: 9.9,
    eccentricity: 0.007,
    inclination: 3.4,
    node: 77,
    phase: 2.4,
    orbitPeriod: 24,
    rotationPeriod: -90,
    axialTilt: 177.4,
    surface: SURFACE_VENUS,
    bump: 0.0,
    ambient: 0.06,
    specTint: 0.1,
    atmoColor: '#ffd9a0',
    atmoStrength: 0.60,
    nightLights: 0,
    haze: { color: '#ffce8a', strength: 0.55, scale: 1.075 },
  },
  {
    id: 'earth',
    name: 'Earth',
    designation: 'SOL III · TERRA',
    chapter: 'Home',
    blurb:
      'Liquid-water oceans, a nitrogen sky and the only biosphere we know of — photographed from 12 light-minutes out.',
    facts: [
      { label: 'RADIUS', value: '6,371 km' },
      { label: 'DAY', value: '23h 56m' },
      { label: 'YEAR', value: '365.25 d' },
      { label: 'MOONS', value: '1 · Luna' },
    ],
    radius: 0.355,
    distance: 13.2,
    eccentricity: 0.017,
    inclination: 0.0,
    node: 0,
    phase: 4.1,
    orbitPeriod: 34,
    rotationPeriod: 12,
    axialTilt: 23.44,
    surface: SURFACE_EARTH,
    bump: 0.0013,
    ambient: 0.07,
    specTint: 0.55,
    atmoColor: '#5fa8ff',
    atmoStrength: 0.95,
    nightLights: 1.25,
    clouds: { color: '#ffffff', opacity: 0.92, speed: 0.011, scale: 1.016, coverage: 0.46 },
    haze: { color: '#6fb4ff', strength: 1.0, scale: 1.085 },
    moons: [
      {
        id: 'luna',
        name: 'Luna',
        radius: 0.097,
        distance: 0.92,
        period: 9,
        inclination: 5.1,
        surface: SURFACE_ROCKY,
        tintA: '#2e2c29',
        tintB: '#b8b4ac',
        craterAmount: 1.15,
        mariaAmount: 0.9,
        bump: 0.0026,
        ambient: 0.05,
      },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    designation: 'SOL IV · ARES',
    chapter: 'Frontier',
    blurb:
      'Iron-oxide deserts, a canyon four times deeper than the Grand Canyon, and seasonal CO₂ polar caps.',
    facts: [
      { label: 'RADIUS', value: '3,389 km' },
      { label: 'DAY', value: '24h 37m' },
      { label: 'YEAR', value: '687 d' },
      { label: 'MOONS', value: '2 · Phobos, Deimos' },
    ],
    radius: 0.215,
    distance: 17.4,
    eccentricity: 0.093,
    inclination: 1.85,
    node: 49,
    phase: 5.6,
    orbitPeriod: 48,
    rotationPeriod: 12.4,
    axialTilt: 25.19,
    surface: SURFACE_MARS,
    bump: 0.0019,
    ambient: 0.06,
    specTint: 0.05,
    atmoColor: '#ffab7a',
    atmoStrength: 0.30,
    nightLights: 0,
    haze: { color: '#ff9f6e', strength: 0.3, scale: 1.05 },
    moons: [
      {
        id: 'phobos',
        name: 'Phobos',
        radius: 0.035,
        distance: 0.5,
        period: 3.2,
        inclination: 1.1,
        surface: SURFACE_ROCKY,
        tintA: '#26211d',
        tintB: '#7a6e63',
        craterAmount: 1.3,
        mariaAmount: 0.2,
        bump: 0.003,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        radius: 0.026,
        distance: 0.78,
        period: 6.4,
        inclination: 1.8,
        surface: SURFACE_ROCKY,
        tintA: '#2a2521',
        tintB: '#857a6d',
        craterAmount: 1.2,
        mariaAmount: 0.15,
        bump: 0.003,
      },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    designation: 'SOL V · GAS GIANT',
    chapter: 'Scale',
    blurb:
      'A 1,300-Earth-volume hydrogen world whose Great Red Spot has been spinning for at least 190 years.',
    facts: [
      { label: 'RADIUS', value: '69,911 km' },
      { label: 'DAY', value: '9h 56m' },
      { label: 'YEAR', value: '11.86 yr' },
      { label: 'MOONS', value: '95 known' },
    ],
    radius: 1.28,
    distance: 25.6,
    eccentricity: 0.048,
    inclination: 1.3,
    node: 100,
    phase: 1.6,
    orbitPeriod: 120,
    rotationPeriod: 8.2,
    axialTilt: 3.13,
    surface: SURFACE_JUPITER,
    bump: 0.0,
    ambient: 0.07,
    specTint: 0.0,
    atmoColor: '#ffd9ae',
    atmoStrength: 0.50,
    nightLights: 0,
    haze: { color: '#ffd2a0', strength: 0.4, scale: 1.045 },
    rings: { inner: 1.45, outer: 1.82, opacity: 0.1, tint: '#c8b49a', detail: 0.4 },
    moons: [
      {
        id: 'io',
        name: 'Io',
        radius: 0.1,
        distance: 2.05,
        period: 7,
        inclination: 0.4,
        surface: SURFACE_IO,
        bump: 0.0016,
        ambient: 0.07,
      },
      {
        id: 'europa',
        name: 'Europa',
        radius: 0.088,
        distance: 2.55,
        period: 11,
        inclination: 0.5,
        surface: SURFACE_EUROPA,
        bump: 0.0012,
        ambient: 0.07,
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        radius: 0.145,
        distance: 3.15,
        period: 17,
        inclination: 0.2,
        surface: SURFACE_ROCKY,
        tintA: '#3a352f',
        tintB: '#9e9a92',
        craterAmount: 0.9,
        mariaAmount: 0.6,
        bump: 0.0022,
      },
      {
        id: 'callisto',
        name: 'Callisto',
        radius: 0.133,
        distance: 3.85,
        period: 26,
        inclination: 0.3,
        surface: SURFACE_ROCKY,
        tintA: '#241f1b',
        tintB: '#8b8175',
        craterAmount: 1.35,
        mariaAmount: 0.25,
        bump: 0.0026,
      },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    designation: 'SOL VI · RINGED',
    chapter: 'Craft',
    blurb:
      'Butterscotch ammonia bands beneath 282,000 km of ice rings that are only ~10 m thick.',
    facts: [
      { label: 'RADIUS', value: '58,232 km' },
      { label: 'DAY', value: '10h 33m' },
      { label: 'YEAR', value: '29.4 yr' },
      { label: 'RINGS', value: 'C · B · Cassini · A' },
    ],
    radius: 1.06,
    distance: 33.2,
    eccentricity: 0.054,
    inclination: 2.49,
    node: 113,
    phase: 3.3,
    orbitPeriod: 190,
    rotationPeriod: 9.1,
    axialTilt: 26.73,
    surface: SURFACE_SATURN,
    bump: 0.0,
    ambient: 0.07,
    specTint: 0.0,
    atmoColor: '#ffe6bb',
    atmoStrength: 0.45,
    nightLights: 0,
    haze: { color: '#ffdfae', strength: 0.35, scale: 1.045 },
    rings: { inner: 1.24, outer: 2.32, opacity: 1.0, tint: '#e8d7b8', detail: 1.0 },
    moons: [
      {
        id: 'titan',
        name: 'Titan',
        radius: 0.135,
        distance: 3.35,
        period: 21,
        inclination: 0.3,
        surface: SURFACE_ROCKY,
        tintA: '#5a3a18',
        tintB: '#e0a95c',
        craterAmount: 0.25,
        mariaAmount: 0.5,
        bump: 0.0008,
        ambient: 0.1,
      },
      {
        id: 'rhea',
        name: 'Rhea',
        radius: 0.062,
        distance: 2.72,
        period: 13,
        inclination: 0.35,
        surface: SURFACE_ROCKY,
        tintA: '#3c3c40',
        tintB: '#c9cbd0',
        craterAmount: 1.25,
        mariaAmount: 0.2,
        bump: 0.0024,
      },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    designation: 'SOL VII · ICE GIANT',
    chapter: 'Perspective',
    blurb:
      'Knocked onto its side at 97.8°, this methane-blue world rolls around the Sun pole-first.',
    facts: [
      { label: 'RADIUS', value: '25,362 km' },
      { label: 'TILT', value: '97.8°' },
      { label: 'YEAR', value: '84 yr' },
      { label: 'MOONS', value: '28 known' },
    ],
    radius: 0.63,
    distance: 39.4,
    eccentricity: 0.047,
    inclination: 0.77,
    node: 74,
    phase: 0.4,
    orbitPeriod: 260,
    rotationPeriod: -14,
    axialTilt: 97.77,
    surface: SURFACE_URANUS,
    bump: 0.0,
    ambient: 0.07,
    specTint: 0.05,
    atmoColor: '#9ef0ff',
    atmoStrength: 0.55,
    nightLights: 0,
    haze: { color: '#a5f1ff', strength: 0.45, scale: 1.06 },
    rings: { inner: 1.6, outer: 2.0, opacity: 0.3, tint: '#9fb6bd', detail: 0.25 },
    moons: [
      {
        id: 'titania',
        name: 'Titania',
        radius: 0.055,
        distance: 1.65,
        period: 12,
        inclination: 0.2,
        surface: SURFACE_ROCKY,
        tintA: '#332d2b',
        tintB: '#a89d97',
        craterAmount: 1.1,
        mariaAmount: 0.3,
        bump: 0.0024,
      },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    designation: 'SOL VIII · WINDWORLD',
    chapter: 'Depth',
    blurb:
      'The windiest place in the solar system — 2,100 km/h supersonic jets across an ultramarine methane sky.',
    facts: [
      { label: 'RADIUS', value: '24,622 km' },
      { label: 'DAY', value: '16h 06m' },
      { label: 'YEAR', value: '164.8 yr' },
      { label: 'WINDS', value: '2,100 km/h' },
    ],
    radius: 0.61,
    distance: 45.5,
    eccentricity: 0.009,
    inclination: 1.77,
    node: 131,
    phase: 5.0,
    orbitPeriod: 320,
    rotationPeriod: 10.6,
    axialTilt: 28.32,
    surface: SURFACE_NEPTUNE,
    bump: 0.0,
    ambient: 0.07,
    specTint: 0.05,
    atmoColor: '#6ba6ff',
    atmoStrength: 0.65,
    nightLights: 0,
    haze: { color: '#6ea8ff', strength: 0.5, scale: 1.06 },
    moons: [
      {
        id: 'triton',
        name: 'Triton',
        radius: 0.075,
        distance: 1.5,
        period: -10,
        inclination: 23,
        surface: SURFACE_ROCKY,
        tintA: '#4a4a52',
        tintB: '#e2dee6',
        craterAmount: 0.5,
        mariaAmount: 0.35,
        bump: 0.0014,
        ambient: 0.08,
      },
    ],
  },
];

const _vec = new THREE.Vector3();

/** Position of a body on its (slightly eccentric, slightly inclined) orbit. */
export function computeOrbitPosition(
  def: Pick<BodyDef, 'distance' | 'eccentricity' | 'inclination' | 'node' | 'phase' | 'orbitPeriod'>,
  time: number,
  target = _vec
): THREE.Vector3 {
  const theta = (time / def.orbitPeriod) * Math.PI * 2 + def.phase;
  const e = def.eccentricity;
  const r = (def.distance * (1 - e * e)) / (1 + e * Math.cos(theta));

  const x0 = r * Math.cos(theta);
  const z0 = r * Math.sin(theta);

  const inc = THREE.MathUtils.degToRad(def.inclination);
  const y1 = -z0 * Math.sin(inc);
  const z1 = z0 * Math.cos(inc);

  const nd = THREE.MathUtils.degToRad(def.node);
  const cn = Math.cos(nd);
  const sn = Math.sin(nd);

  target.set(x0 * cn - z1 * sn, y1, x0 * sn + z1 * cn);
  return target;
}

/** Sampled ellipse for the faint orbit guide lines. */
export function buildOrbitCurve(def: BodyDef, segments = 320): Float32Array {
  const pts = new Float32Array((segments + 1) * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * def.orbitPeriod;
    computeOrbitPosition(def, t - def.phase * (def.orbitPeriod / (Math.PI * 2)), v);
    pts[i * 3] = v.x;
    pts[i * 3 + 1] = v.y;
    pts[i * 3 + 2] = v.z;
  }
  return pts;
}
