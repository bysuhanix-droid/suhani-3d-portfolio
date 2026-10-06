import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { vnoise } from './worldGen';

/** Bake a colour (darker at the base, lighter at the tip) into a geometry as vertex colours. */
const paint = (g: THREE.BufferGeometry, hex: string, shade = true) => {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute('uv');
  const pos = n.attributes.position, c = new THREE.Color(hex), col = new Float32Array(pos.count * 3);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) { lo = Math.min(lo, pos.getY(i)); hi = Math.max(hi, pos.getY(i)); }
  for (let i = 0; i < pos.count; i++) {
    const k = shade ? 0.6 + 0.55 * ((pos.getY(i) - lo) / (hi - lo || 1)) : 1;
    col.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  n.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return n;
};

const blob = (r: number, x: number, y: number, z: number, seed: number, sy = 1) => {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (vnoise(p.getX(i) * 1.3 + seed, p.getY(i) * 1.3 + p.getZ(i) * 1.1) - 0.5) * 0.7;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g.translate(x, y, z);
};

/** Conifer: tapered trunk + four stacked, slightly rotated skirts. Base sits at y = 0. */
export function makePine() {
  const parts = [paint(new THREE.CylinderGeometry(0.22, 0.38, 2.6, 7).translate(0, 1.3, 0), '#4a3322', false)];
  [[2.4, 2.8, 1.5], [2.0, 2.6, 2.9], [1.55, 2.3, 4.3], [1.05, 2.1, 5.7]].forEach(([r, h, y], i) =>
    parts.push(paint(new THREE.ConeGeometry(r, h, 9).rotateY(i * 0.7).translate(0, y + h / 2, 0), '#21602f')));
  return mergeGeometries(parts)!;
}

/** Broadleaf: trunk + irregular overlapping crown lobes. */
export function makeBroadleaf() {
  return mergeGeometries([
    paint(new THREE.CylinderGeometry(0.3, 0.5, 3.4, 7).translate(0, 1.7, 0), '#5a3d25', false),
    paint(blob(2.3, 0, 4.7, 0, 1), '#3f8034'),
    paint(blob(1.7, 1.4, 4.0, 0.7, 2), '#4a8c38'),
    paint(blob(1.8, -1.2, 4.3, -0.9, 3), '#376f2d'),
    paint(blob(1.5, 0.2, 6.0, 0.2, 4), '#4f9440'),
  ])!;
}

export const makeBush = () => paint(blob(1, 0, 0.55, 0, 7, 0.7), '#3d6f2d');

/** Low-poly deer made of merged boxes. */
export function makeDeer() {
  const b = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string, rz = 0) =>
    paint(new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), hex, false);
  return mergeGeometries([
    b(1.7, 0.75, 0.6, 0, 1.15, 0, '#8d6338'),
    b(0.3, 0.8, 0.28, 0.85, 1.7, 0, '#8d6338', -0.4),
    b(0.5, 0.28, 0.26, 1.2, 2.05, 0, '#7a5530'),
    ...[[-0.65, 0.2], [-0.65, -0.2], [0.65, 0.2], [0.65, -0.2]].map(([x, z]) => b(0.13, 0.95, 0.13, x, 0.47, z, '#5c4126', 0)),
    b(0.1, 0.22, 0.1, 1.3, 2.3, 0.1, '#4a3322', 0),
  ])!;
}

/** A simple V-shaped bird; flapping is done by rolling the instance. */
export function makeBird() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0.5, -2.2, 0.35, 0.1, 0, 0, -0.4,
    0, 0, 0.5, 0, 0, -0.4, 2.2, 0.35, 0.1,
  ]), 3));
  g.computeVertexNormals();
  return g;
}
