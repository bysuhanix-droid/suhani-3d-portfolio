/**
 * One config per world. The exploration PIPELINE is identical for all nine
 * (travel → arrival → free flight → discovery → ENTER → portfolio);
 * everything below is what makes each world different.
 *
 * ✏️ Replace the `items` placeholders with your real portfolio content.
 */
export type WorldMode = 'star' | 'ground' | 'sky' | 'rings';
export type StationKind = 'dome' | 'base' | 'platform' | 'archive' | 'dish' | 'torus';

export interface Spot {
  color: string;
  u: number;
  v: number;
  rx: number;
  ry: number;
}

export interface GroundDef {
  size: number;
  amp: number; // base relief (m)
  ridge: number; // mountain ridging 0..1.5
  lift: number; // global height offset
  features: number; // craters / volcano cones
  kind: 'crater' | 'cone';
  canyon: number; // canyon / river-valley depth
  canyonW: number;
  coast: number; // drop toward +x to make an ocean
  water?: number; // water level
  stops: [number, string][]; // height → colour
  trees?: boolean;
  tracks?: boolean;
}

export interface WorldDef {
  id: string;
  name: string;
  glyph: string;
  section: string;
  au: number;
  travel: number; // seconds of cinematic travel
  mode: WorldMode;
  planetA: string;
  planetB: string;
  bands?: string[]; // gas-giant cloud-deck palette
  ring?: string;
  sky: [string, string]; // [top, bottom]
  fog: [string, string];
  density: [number, number];
  yRange: [number, number];
  light: { color: string; dir: [number, number, number]; i: number; amb: number };
  speed: number;
  start: [number, number, number];
  station: { name: string; kind: StationKind; at: [number, number, number]; accent: string };
  particles: { color: string; count: number; size: number; speed: number };
  ground?: GroundDef;
  spot?: Spot;
  clouds?: { color: string; ys: number[]; opacity: number };
  lightning?: number;
  turb?: number;
  stars?: boolean;
  intro: string;
  objective: string;
  hint: string;
  items: { title: string; text: string }[];
}

const ph = (a: string, b: string, c: string) => [
  { title: a, text: 'Replace this with your own content in worldData.ts.' },
  { title: b, text: 'Replace this with your own content in worldData.ts.' },
  { title: c, text: 'Replace this with your own content in worldData.ts.' },
];

export const WORLDS: WorldDef[] = [
  {
    id: 'sun', name: 'Sol', glyph: '☀️', section: 'About Me', au: 0, travel: 5, mode: 'star',
    planetA: '#ff8a1f', planetB: '#fff0b0',
    sky: ['#3a0e02', '#ff6a10'], fog: ['#ff7a18', '#ffb347'], density: [0.0011, 0.0019], yRange: [0, 180],
    light: { color: '#ffb060', dir: [0, 1, 0.2], i: 2.4, amb: 0.8 },
    speed: 46, start: [0, 34, 320],
    station: { name: 'Solar Observatory', kind: 'dome', at: [-70, 48, -250], accent: '#7BE0FF' },
    particles: { color: '#ffd27a', count: 700, size: 7, speed: 2.4 },
    turb: 0.6,
    intro: 'Corona breach. Plasma storms ahead — heat shielding holding.',
    objective: 'Follow the magnetic arcs to find the hidden observatory.',
    hint: 'Fly low along the plasma sea; the prominences point the way.',
    items: ph('Who I am', 'What drives me', 'Beyond the screen'),
  },
  {
    id: 'mercury', name: 'Mercury', glyph: '☿', section: 'Skills', au: 0.39, travel: 4.5, mode: 'ground',
    planetA: '#4d4741', planetB: '#9b9387',
    sky: ['#000000', '#05050a'], fog: ['#0a0a0c', '#0a0a0c'], density: [0.00025, 0.00025], yRange: [0, 150],
    light: { color: '#fff1da', dir: [1, 0.16, 0.35], i: 4.2, amb: 0.05 },
    speed: 30, start: [0, 0, 0],
    station: { name: 'Technology Station', kind: 'base', at: [-210, 0, 150], accent: '#4DFFC3' },
    particles: { color: '#d8cfc2', count: 120, size: 2, speed: 0.15 },
    stars: true,
    ground: {
      size: 700, amp: 26, ridge: 0.35, lift: 0, features: 130, kind: 'crater', canyon: 0, canyonW: 1, coast: 0,
      stops: [[-40, '#161412'], [0, '#4a443e'], [30, '#9b9387']],
    },
    intro: 'No atmosphere. Hard light, black shadows. Touchdown in the cratered plains.',
    objective: 'Search the crater fields for a technology station.',
    hint: 'Shadows hide a lot — circle crater rims and follow the ridge lines.',
    items: ph('Languages', 'Frameworks & tools', 'Currently learning'),
  },
  {
    id: 'venus', name: 'Venus', glyph: '♀', section: 'Experience', au: 0.72, travel: 4.5, mode: 'ground',
    planetA: '#d9a35a', planetB: '#f6dca0',
    sky: ['#f2b45f', '#7a3d14'], fog: ['#e89a40', '#8a4a1c'], density: [0.006, 0.017], yRange: [4, 170],
    light: { color: '#ffc880', dir: [0.2, 0.9, 0.2], i: 1.6, amb: 0.7 },
    speed: 26, start: [0, 0, 0],
    station: { name: 'Research Facility', kind: 'base', at: [190, 0, -170], accent: '#FFE27A' },
    particles: { color: '#ffcf8a', count: 800, size: 4, speed: 0.7 },
    clouds: { color: '#e8a24c', ys: [85, 150], opacity: 0.7 },
    lightning: 0.25, turb: 0.5,
    ground: {
      size: 700, amp: 30, ridge: 0.8, lift: 0, features: 9, kind: 'cone', canyon: 0, canyonW: 1, coast: 0,
      stops: [[-10, '#2a1208'], [12, '#6b3314'], [55, '#b26a2c']],
    },
    intro: 'Crushing atmosphere. Visibility drops the lower you go.',
    objective: 'Descend through the haze and find a facility on the volcanic plains.',
    hint: 'Climb for visibility, drop for the surface. Orange glow = volcano.',
    items: ph('Role / company', 'Role / company', 'Role / company'),
  },
  {
    id: 'earth', name: 'Earth', glyph: '🌍', section: 'Projects', au: 1, travel: 4.5, mode: 'ground',
    planetA: '#2a6bb0', planetB: '#3f8f4a', bands: undefined,
    sky: ['#6fb1ff', '#cfe3f5'], fog: ['#a9cdee', '#cfe3f5'], density: [0.0011, 0.0019], yRange: [0, 200],
    light: { color: '#fff4e0', dir: [0.6, 0.7, 0.3], i: 3, amb: 0.9 },
    speed: 28, start: [0, 0, 0],
    station: { name: 'Observatory', kind: 'dome', at: [-150, 0, -200], accent: '#9CC3FF' },
    particles: { color: '#ffffff', count: 160, size: 2.4, speed: 0.3 },
    clouds: { color: '#ffffff', ys: [130, 175], opacity: 0.8 },
    ground: {
      size: 700, amp: 24, ridge: 1.0, lift: 8, features: 0, kind: 'crater', canyon: 22, canyonW: 16, coast: 44, water: 0,
      stops: [[-14, '#1b3a4d'], [0.6, '#cdbb83'], [3, '#5a9a45'], [20, '#2f6b34'], [45, '#7a7468'], [66, '#f2f5f7']],
      trees: true,
    },
    intro: 'Clear skies. Mountains, forest, river and coastline below.',
    objective: 'Explore the landscape and find the observatory.',
    hint: 'Follow the river inland, or fly out over the coast.',
    items: ph('Project one', 'Project two', 'Project three'),
  },
  {
    id: 'mars', name: 'Mars', glyph: '♂', section: 'Research / Projects', au: 1.52, travel: 5, mode: 'ground',
    planetA: '#a8472a', planetB: '#d79a6a',
    sky: ['#b9764f', '#d9a27a'], fog: ['#c4875f', '#d9a27a'], density: [0.0022, 0.0038], yRange: [0, 160],
    light: { color: '#ffd9b8', dir: [0.5, 0.6, 0.4], i: 2.6, amb: 0.5 },
    speed: 30, start: [0, 0, 0],
    station: { name: 'Mars Research Base', kind: 'base', at: [170, 0, 210], accent: '#7FD7FF' },
    particles: { color: '#e8b48a', count: 900, size: 3.4, speed: 0.9 },
    turb: 0.3,
    ground: {
      size: 700, amp: 30, ridge: 0.9, lift: 0, features: 70, kind: 'crater', canyon: 78, canyonW: 48, coast: 0,
      stops: [[-40, '#3f1a0e'], [0, '#8a3f21'], [28, '#b5603a'], [62, '#d49a6a']],
      tracks: true,
    },
    intro: 'Dust storm easing. Rover tracks cross the regolith below.',
    objective: 'Follow the rover tracks across the canyon country.',
    hint: 'The tracks fade into a dust drift — keep going the same heading.',
    items: ph('Research theme', 'Research theme', 'Publication / project'),
  },
  {
    id: 'jupiter', name: 'Jupiter', glyph: '♃', section: 'Achievements', au: 5.2, travel: 6, mode: 'sky',
    planetA: '#c9a27a', planetB: '#f2e3c8',
    bands: ['#e9d9bd', '#c28f5c', '#f0e4cc', '#a8683c', '#eadfc8', '#8f5a35', '#d9b78e', '#f1e6d2'],
    spot: { color: '#b3402a', u: 0.5, v: 0.5, rx: 0.1, ry: 0.055 },
    sky: ['#f0d8b0', '#7a4a2a'], fog: ['#e2c096', '#8a5632'], density: [0.0018, 0.0062], yRange: [-90, 140],
    light: { color: '#fff0d8', dir: [0.3, 0.9, 0.3], i: 2.6, amb: 1.0 },
    speed: 30, start: [0, 70, 300],
    station: { name: 'Floating Research Station', kind: 'platform', at: [-160, 20, -280], accent: '#FFD27A' },
    particles: { color: '#f6e3c0', count: 600, size: 4, speed: 1.2 },
    clouds: { color: '#f4e8d2', ys: [-50, 0, 50, 100], opacity: 0.55 },
    lightning: 0.8, turb: 1.4,
    intro: 'Upper atmosphere. Ammonia ice above, storm bands below.',
    objective: 'Descend through the cloud decks toward the Great Red Spot.',
    hint: 'The deeper you go, the darker and denser. The station floats at the edge of the storm.',
    items: ph('Achievement', 'Achievement', 'Achievement'),
  },
  {
    id: 'saturn', name: 'Saturn', glyph: '♄', section: 'Education', au: 9.54, travel: 6.5, mode: 'rings',
    planetA: '#d9bd86', planetB: '#f2e1b8', ring: '#e8d7b8',
    bands: ['#e6cf9c', '#c8a76e', '#efdcb0', '#bb9a62', '#e9d6a8', '#d5b97e'],
    sky: ['#010103', '#010103'], fog: ['#02020a', '#02020a'], density: [0.00007, 0.00007], yRange: [-100, 100],
    light: { color: '#fff3dc', dir: [1, 0.25, 0.6], i: 3.4, amb: 0.14 },
    speed: 60, start: [0, 8, -640],
    station: { name: 'Orbital Station', kind: 'torus', at: [150, 52, -480], accent: '#8EE6FF' },
    particles: { color: '#e6f4ff', count: 500, size: 2.4, speed: 0.2 },
    stars: true,
    intro: 'Inside the rings. Ice, rock and Saturn filling the sky.',
    objective: 'Weave through the ring gaps and find the orbital station.',
    hint: 'Look at the sheet from above, then dive into dense bands; Saturn\u2019s shadow cuts across the rings.',
    items: ph('Degree / school', 'Course / specialization', 'Relevant coursework'),
  },
  {
    id: 'uranus', name: 'Uranus', glyph: '♅', section: 'Certifications', au: 19.2, travel: 7.5, mode: 'sky',
    planetA: '#7fd8e0', planetB: '#c5f3f5',
    bands: ['#aef0f2', '#8fe0e6', '#bdf4f4', '#7cd0da', '#a4ecee'],
    sky: ['#5fb7cf', '#1d4f6a'], fog: ['#7cc8da', '#285d78'], density: [0.0022, 0.0046], yRange: [-90, 140],
    light: { color: '#e8fbff', dir: [0.3, 0.9, 0.2], i: 1.8, amb: 1.1 },
    speed: 26, start: [0, 70, 300],
    station: { name: 'Knowledge Archive', kind: 'archive', at: [200, 35, -320], accent: '#B6FFF0' },
    particles: { color: '#cffcff', count: 700, size: 3.4, speed: 0.5 },
    clouds: { color: '#c8f4f6', ys: [-40, 10, 60, 105], opacity: 0.45 },
    turb: 0.5,
    intro: 'Methane haze, soft light. The planet is rolling on its side.',
    objective: 'Drift through the blue haze to the floating archive.',
    hint: 'Quiet and slow here. Follow the pale glow in the mist.',
    items: ph('Certification', 'Certification', 'Certification'),
  },
  {
    id: 'neptune', name: 'Neptune', glyph: '♆', section: 'Contact', au: 30.07, travel: 10, mode: 'sky',
    planetA: '#2f56d6', planetB: '#6c9bff',
    bands: ['#3f6cf0', '#2a4fc4', '#4d7bff', '#2442b0', '#3a63e0', '#1d3a9a'],
    spot: { color: '#0d1f66', u: 0.5, v: 0.5, rx: 0.09, ry: 0.05 },
    sky: ['#2347b8', '#060f3c'], fog: ['#2d56d0', '#0b1850'], density: [0.0022, 0.0052], yRange: [-90, 140],
    light: { color: '#cfe0ff', dir: [0.3, 0.9, 0.3], i: 1.3, amb: 1.0 },
    speed: 40, start: [0, 70, 300],
    station: { name: 'Deep Space Communication Station', kind: 'dish', at: [-240, 10, -340], accent: '#FF6B6B' },
    particles: { color: '#a8c4ff', count: 700, size: 3.4, speed: 1.6 },
    clouds: { color: '#9bb8ff', ys: [-45, 5, 55, 100], opacity: 0.45 },
    lightning: 0.3, turb: 1.8,
    intro: 'Four and a half billion kilometres from home. Supersonic winds.',
    objective: 'Cross the storm regions to the lone communication station.',
    hint: 'Winds push you off course. Follow the red signal light.',
    items: ph('Email', 'LinkedIn / GitHub', 'Say hello'),
  },
];

export const getWorld = (id: string | null) => WORLDS.find((w) => w.id === id) ?? null;
