import * as THREE from 'three';
import type { Spot, WorldDef } from './worldData';

export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const h2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (
    h2(xi, yi) * (1 - u) * (1 - v) + h2(xi + 1, yi) * u * (1 - v) +
    h2(xi, yi + 1) * (1 - u) * v + h2(xi + 1, yi + 1) * u * v
  );
};

export const fbm = (x: number, y: number, oct = 5) => {
  let a = 0.5, s = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2;
    a *= 0.5;
  }
  return s;
};

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ terrain ------------------------------ */

export function makeTerrain(def: WorldDef) {
  const g = def.ground!;
  const r = rng(hashStr(def.id));
  const feats = Array.from({ length: g.features }, () => ({
    x: (r() - 0.5) * g.size * 0.9,
    z: (r() - 0.5) * g.size * 0.9,
    rad: 14 + r() * r() * 80,
  }));
  const [sx, , sz] = def.station.at;

  const raw = (x: number, z: number) => {
    let h = (fbm(x * 0.008, z * 0.008) - 0.5) * g.amp * 2 + g.lift;
    const q = 1 - Math.abs(fbm(x * 0.012 + 9.3, z * 0.012 - 4.1) * 2 - 1);
    h += (q * q - 0.35) * g.ridge * g.amp;
    for (const f of feats) {
      const d = Math.hypot(x - f.x, z - f.z) / f.rad;
      if (d > 1.6) continue;
      const s = f.rad / 60 + 0.3;
      if (g.kind === 'crater') {
        if (d < 1) h -= g.amp * 0.55 * (1 - d * d) * s;
        h += Math.exp(-((d - 1.08) ** 2) * 40) * g.amp * 0.16 * s;
      } else {
        h += Math.max(0, 1 - d / 1.5) ** 1.6 * g.amp * 1.1;
        if (d < 0.16) h -= g.amp * 0.35;
      }
    }
    if (def.id === 'mars') h += Math.sin(x * 0.5 + z * 0.3 + fbm(x * 0.02, z * 0.02) * 12) * 0.2;
    if (g.canyon) {
      const d = z - (90 + 60 * Math.sin(x * 0.009));
      h -= g.canyon * Math.exp(-(d * d) / (g.canyonW * g.canyonW));
    }
    if (g.coast) h -= g.coast * smooth(80, 260, x);
    return h;
  };

  const stationY = Math.max(raw(sx, sz), (g.water ?? -1e9) + 3);
  const heightAt = (x: number, z: number) => {
    const k = smooth(70, 28, Math.hypot(x - sx, z - sz));
    return raw(x, z) * (1 - k) + stationY * k;
  };

  const N = 300;
  const geo = new THREE.PlaneGeometry(g.size, g.size, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const stops = g.stops.map(([h, c]) => [h, new THREE.Color(c)] as const);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    let k = 0;
    while (k < stops.length - 2 && h > stops[k + 1][0]) k++;
    const t = Math.min(1, Math.max(0, (h - stops[k][0]) / (stops[k + 1][0] - stops[k][0])));
    tmp.copy(stops[k][1]).lerp(stops[k + 1][1], t);
    tmp.multiplyScalar(0.82 + fbm(x * 0.09, z * 0.09, 3) * 0.4);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // steep faces expose bare, darker rock; flats keep the height colour
  const nrm = geo.attributes.normal;
  const gray = new THREE.Color('#6d6862');
  for (let i = 0; i < pos.count; i++) {
    const k = smooth(0.92, 0.62, nrm.getY(i));
    if (k <= 0) continue;
    tmp.setRGB(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]).lerp(gray, k * 0.55).multiplyScalar(1 - k * 0.3);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.attributes.color.needsUpdate = true;
  return { geo, heightAt, stationY, feats };
}

/* ------------------------------ textures ------------------------------ */

/** Seamlessly tileable grey noise used as a fine bump/detail map. */
export function makeDetailTex() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  const pn = (x: number, y: number, P: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a: number) => ((a % P) + P) % P;
    return h2(w(xi), w(yi)) * (1 - u) * (1 - v) + h2(w(xi + 1), w(yi)) * u * (1 - v) +
      h2(w(xi), w(yi + 1)) * (1 - u) * v + h2(w(xi + 1), w(yi + 1)) * u * v;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0, a = 0.5;
    for (const P of [8, 16, 32, 64]) { v += a * pn((x / S) * P, (y / S) * P, P); a *= 0.55; }
    const o = (y * S + x) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.min(255, v * 330);
    img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}


const toTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

export function makeBands(bands: string[], spot?: Spot, size = 512) {
  const c = canvas(size, size);
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const cols = bands.map((b) => new THREE.Color(b));
  const n = cols.length;
  const tmp = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const t = v * n + (fbm(u * 7, v * 3 + 2) - 0.5) * 1.2;
      const fl = Math.floor(t);
      const i = ((fl % n) + n) % n;
      tmp.copy(cols[i]).lerp(cols[(i + 1) % n], smooth(0.3, 1, t - fl));
      tmp.multiplyScalar(0.86 + fbm(u * 40, v * 14, 3) * 0.3);
      const o = (y * size + x) * 4;
      img.data[o] = tmp.r * 255;
      img.data[o + 1] = tmp.g * 255;
      img.data[o + 2] = tmp.b * 255;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (spot) {
    g.save();
    g.translate(spot.u * size, spot.v * size);
    g.scale(spot.rx * size, spot.ry * size);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, spot.color);
    gr.addColorStop(0.7, spot.color);
    gr.addColorStop(1, spot.color + '00');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  return toTex(c);
}

export function makeCloudTex(color: string, seed: number) {
  const S = 256;
  const c = canvas(S, S);
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  const col = new THREE.Color(color);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const edge = smooth(0.5, 0.28, Math.hypot(u - 0.5, v - 0.5));
      const a = smooth(0.46, 0.74, fbm(u * 5 + seed * 7.1, v * 5 + seed)) * edge;
      const o = (y * S + x) * 4;
      const shade = 0.8 + fbm(u * 14, v * 14 + seed, 3) * 0.35;
      img.data[o] = col.r * 255 * shade;
      img.data[o + 1] = col.g * 255 * shade;
      img.data[o + 2] = col.b * 255 * shade;
      img.data[o + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
}

export function makePlasma(seed: number, alpha: boolean) {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext('2d')!;
  const img = g.createImageData(S, S);
  const dark = new THREE.Color('#b53a00'), mid = new THREE.Color('#ff9a1f'), hot = new THREE.Color('#fff1b0');
  const tmp = new THREE.Color();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const n = fbm(u * 14 + seed, v * 14, 5) * 0.65 + fbm(u * 55, v * 55 + seed, 3) * 0.35;
      if (n < 0.5) tmp.copy(dark).lerp(mid, n * 2);
      else tmp.copy(mid).lerp(hot, (n - 0.5) * 2.2);
      const o = (y * S + x) * 4;
      img.data[o] = tmp.r * 255;
      img.data[o + 1] = tmp.g * 255;
      img.data[o + 2] = tmp.b * 255;
      img.data[o + 3] = alpha ? smooth(0.5, 0.8, n) * 200 : 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
}

/** Radial density profile for Saturn's rings (u: 0 inner → 1 outer). */
export const ringDensity = (u: number) => {
  const gap = (c: number, w: number) => 1 - Math.exp(-(((u - c) / w) ** 2));
  const bands = 0.55 + 0.45 * Math.sin(u * 61) * Math.sin(u * 17 + 1.3);
  const base = u < 0.2 ? 0.35 : u < 0.55 ? 1 : u < 0.62 ? 0.04 : 0.8;
  return Math.max(0, Math.min(1, base * (0.6 + 0.4 * bands) * gap(0.84, 0.012) * gap(0.97, 0.01)));
};

export function makeRingTex(tint: string) {
  const W = 1024;
  const c = canvas(W, 4);
  const g = c.getContext('2d')!;
  const col = new THREE.Color(tint);
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const d = ringDensity(u);
    const s = 0.75 + 0.35 * vnoise(u * 90, 1);
    g.fillStyle = `rgba(${col.r * 255 * s | 0},${col.g * 255 * s | 0},${col.b * 255 * s | 0},${d * 0.85})`;
    g.fillRect(x, 0, 1, 4);
  }
  return toTex(c);
}
