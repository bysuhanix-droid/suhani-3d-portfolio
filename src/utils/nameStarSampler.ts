import * as THREE from 'three';

/**
 * Orientation of the galactic plane inside world space.
 * Local +XZ plane == galactic equator, local -Z == galactic center (Sagittarius A*).
 */
export const GALACTIC_EULER = new THREE.Euler(0.46, 0.78, 0.38, 'XYZ');

const GALACTIC_QUAT = new THREE.Quaternion().setFromEuler(GALACTIC_EULER);

/** Direction of the galactic core in world space (local -Z rotated into world). */
export function getGalacticCoreDirection(): THREE.Vector3 {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(GALACTIC_QUAT).normalize();
}

/**
 * Basis of the very first camera framing (gazing from -coreDir toward the Galactic Core).
 * Used to lay the "Suhani" star glyphs perfectly perpendicular to the opening shot.
 */
export function getInitialCameraBasis() {
  const forward = getGalacticCoreDirection();
  const position = forward.clone().multiplyScalar(-8);
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  return { position, forward, right, up };
}

export interface NameStarSample {
  worldPositions: Float32Array;
  spreadDelays: Float32Array;
  introBrightness: Float32Array;
  sampledCount: number;
}

interface GlyphPoint {
  u: number; // -0.5 .. 0.5
  v: number; // -0.5 .. 0.5 (up positive)
}

let cachedGlyphPoints: GlyphPoint[] | null = null;
let cachedAspect = 0.32;

/** Rasterize the word "Suhani" once and keep the covered pixels for sampling. */
function getGlyphPoints(): { points: GlyphPoint[]; aspect: number } {
  if (cachedGlyphPoints) return { points: cachedGlyphPoints, aspect: cachedAspect };

  const points: GlyphPoint[] = [];
  const W = 1100;
  const H = 360;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Elegant italic serif reads beautifully when drawn purely out of starlight
      let fontSize = 250;
      const fontFor = (size: number) =>
        `italic 600 ${size}px "Playfair Display", Georgia, "Times New Roman", serif`;
      ctx.font = fontFor(fontSize);
      const measured = ctx.measureText('Suhani').width;
      const maxWidth = W * 0.86;
      if (measured > maxWidth) {
        fontSize = Math.floor(fontSize * (maxWidth / measured));
        ctx.font = fontFor(fontSize);
      }
      ctx.fillText('Suhani', W / 2, H / 2 + fontSize * 0.02);

      const { data } = ctx.getImageData(0, 0, W, H);
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const alpha = data[(y * W + x) * 4 + 3];
          if (alpha > 96) {
            points.push({ u: x / W - 0.5, v: 0.5 - y / H });
          }
        }
      }
    }
  } catch {
    // Canvas unavailable (SSR / restricted env) — fall through to the procedural fallback
  }

  if (points.length < 200) {
    // Fallback: a soft elliptical ribbon so the intro still reads as a formation
    for (let i = 0; i < 4000; i++) {
      const t = Math.random() * Math.PI * 2;
      points.push({
        u: Math.cos(t) * 0.34 + (Math.random() - 0.5) * 0.03,
        v: Math.sin(t) * 0.12 + (Math.random() - 0.5) * 0.03,
      });
    }
  }

  cachedGlyphPoints = points;
  cachedAspect = H / W;
  return { points: cachedGlyphPoints, aspect: cachedAspect };
}

/**
 * Builds per-star "name formation" coordinates.
 *
 * @param count           total particles in the buffer
 * @param inverseGalactic when the points live inside a group already rotated by GALACTIC_EULER
 * @param sizes           optional per-star point sizes, used to favour brighter stars for glyphs
 */
export function generateSuhaniStarPositions(
  count: number,
  inverseGalactic = false,
  sizes?: Float32Array
): NameStarSample {
  const worldPositions = new Float32Array(count * 3);
  const spreadDelays = new Float32Array(count);
  const introBrightness = new Float32Array(count);

  const { points, aspect } = getGlyphPoints();
  const { position: camPos, right, up, forward } = getInitialCameraBasis();

  // Plane hovering just in front of the opening camera shot
  const planeCenter = camPos.clone().addScaledVector(forward, 7.35);
  const planeWidth = 6.35;
  const planeHeight = planeWidth * aspect;

  const inverseQuat = GALACTIC_QUAT.clone().invert();

  // How many particles actually spell the name
  const fraction = sizes ? 0.18 : 0.075;
  const nameCount = Math.min(count, Math.max(600, Math.floor(count * fraction)));

  // Prefer mid/bright stars for the glyph so the word reads crisply
  const eligible: number[] = [];
  const spare: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!sizes || (sizes[i] > 1.05 && sizes[i] < 4.6)) eligible.push(i);
    else spare.push(i);
  }
  // Fisher-Yates shuffle so glyph stars are scattered through the buffer
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  const chosen = new Set<number>();
  for (let i = 0; i < nameCount && i < eligible.length; i++) chosen.add(eligible[i]);
  let spareCursor = 0;
  while (chosen.size < nameCount && spareCursor < spare.length) {
    chosen.add(spare[spareCursor++]);
  }

  const tmp = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    if (chosen.has(i)) {
      const g = points[(Math.random() * points.length) | 0];
      const jitterU = (Math.random() - 0.5) * 0.0035;
      const jitterV = (Math.random() - 0.5) * 0.0055;
      // Gentle depth so the word is a true 3D constellation, not a flat decal
      const depth = (Math.random() - 0.5) * 0.42;

      tmp
        .copy(planeCenter)
        .addScaledVector(right, (g.u + jitterU) * planeWidth)
        .addScaledVector(up, (g.v + jitterV) * planeHeight)
        .addScaledVector(forward, depth);

      if (inverseGalactic) tmp.applyQuaternion(inverseQuat);

      worldPositions[i3] = tmp.x;
      worldPositions[i3 + 1] = tmp.y;
      worldPositions[i3 + 2] = tmp.z;

      // Sweep the dispersal from left to right across the word
      spreadDelays[i] = THREE.MathUtils.clamp(
        (g.u + 0.5) * 0.42 + Math.random() * 0.14,
        0,
        0.62
      );
      introBrightness[i] = 0.95 + Math.random() * 0.75;
    } else {
      // Everything else waits far out on the celestial sphere: invisible at the
      // opening focal length, then streams inward as the galaxy unfolds.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 70 + Math.random() * 26;
      tmp.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      if (inverseGalactic) tmp.applyQuaternion(inverseQuat);

      worldPositions[i3] = tmp.x;
      worldPositions[i3 + 1] = tmp.y;
      worldPositions[i3 + 2] = tmp.z;

      spreadDelays[i] = Math.random() * 0.4;
      introBrightness[i] = 0.0;
    }
  }

  return { worldPositions, spreadDelays, introBrightness, sampledCount: nameCount };
}
