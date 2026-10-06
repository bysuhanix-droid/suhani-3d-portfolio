import { Line, Sparkles, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Station } from './Station';
import { makeBird, makeBroadleaf, makeBush, makeDeer, makePine } from './worldProps';
import type { WorldDef } from './worldData';
import {
  fbm, makeBands, makeDetailTex, makeCloudTex, makePlasma, makeRingTex, makeTerrain, ringDensity, rng, hashStr, smooth, vnoise,
} from './worldGen';

export type WorldPhase = 'travel' | 'arrive' | 'explore' | 'portfolio';

const lerp = THREE.MathUtils.lerp;

/* =============================== TRAVEL =============================== */

export function TravelScene({
  def, onProgress, onDone,
}: { def: WorldDef; onProgress: (p: number) => void; onDone: () => void }) {
  const { camera, scene } = useThree();
  const t0 = useRef(-1);
  const done = useRef(false);
  const lastEmit = useRef(0);
  const streaks = useRef<THREE.LineSegments>(null);
  const isSun = def.id === 'sun';
  const R = isSun ? 140 : 60;

  const tex = useMemo(
    () => (isSun ? makePlasma(3, false) : makeBands(def.bands ?? [def.planetA, def.planetB, def.planetA, def.planetB], undefined, 256)),
    [def, isSun],
  );
  const streakPos = useMemo(() => {
    const r = rng(7);
    const a = new Float32Array(260 * 6);
    for (let i = 0; i < 260; i++) {
      const ang = r() * Math.PI * 2, rad = 40 + r() * 500, z = -r() * 1600;
      a.set([Math.cos(ang) * rad, Math.sin(ang) * rad, z, Math.cos(ang) * rad, Math.sin(ang) * rad, z], i * 6);
    }
    return a;
  }, []);

  useEffect(() => {
    const prev = scene.background, prevFog = scene.fog;
    scene.background = new THREE.Color('#000004');
    scene.fog = null;
    camera.near = 1; camera.far = 14000; camera.updateProjectionMatrix();
    return () => {
      scene.background = prev; scene.fog = prevFog;
      camera.near = 0.1; camera.far = 200; (camera as THREE.PerspectiveCamera).fov = 60; camera.updateProjectionMatrix();
    };
  }, [camera, scene]);

  useFrame((s, d) => {
    if (t0.current < 0) t0.current = s.clock.elapsedTime;
    const p = Math.min(1, (s.clock.elapsedTime - t0.current) / def.travel);
    const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2; // punchy launch, soft brake
    const bump = Math.sin(Math.PI * p);
    camera.position.set(Math.sin(p * 3) * 40 * bump, 8 + Math.sin(p * 4) * 10 * bump, lerp(2400, R * 3.4, e));
    camera.lookAt(0, 0, 0);
    camera.rotateZ(Math.sin(p * 6) * 0.07 * bump);               // banking roll
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = 60 + 42 * bump ** 1.6; pc.updateProjectionMatrix();  // hyperspace FOV stretch

    const g = streaks.current;
    if (g) {
      const a = g.geometry.attributes.position as THREE.BufferAttribute;
      const v = 2600 * Math.sin(Math.PI * Math.min(1, p * 1.05));
      const len = v * 0.1;
      for (let i = 0; i < 260; i++) {
        let z = a.getZ(i * 2) + v * d;
        if (z > 100) z -= 1700;
        a.setZ(i * 2, z); a.setZ(i * 2 + 1, z - len);
      }
      a.needsUpdate = true;
      g.position.copy(camera.position);
      (g.material as THREE.LineBasicMaterial).opacity = Math.min(0.85, v / 1200);
    }

    if (s.clock.elapsedTime - lastEmit.current > 0.1) {
      lastEmit.current = s.clock.elapsedTime;
      onProgress(p);
    }
    if (p >= 1 && !done.current) { done.current = true; onProgress(1); onDone(); }
  });

  return (
    <group>
      <Stars radius={4000} depth={800} count={6000} factor={14} fade />
      <ambientLight intensity={0.15} />
      <directionalLight position={[900, 300, 600]} intensity={isSun ? 0 : 3} />
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        {isSun
          ? <meshBasicMaterial map={tex} toneMapped={false} />
          : <meshStandardMaterial map={tex} roughness={0.9} />}
      </mesh>
      {isSun
        ? [1.12, 1.3, 1.7].map((k, i) => (
            <mesh key={i} scale={k}>
              <sphereGeometry args={[R, 32, 32]} />
              <meshBasicMaterial color="#ff8a1f" transparent opacity={0.16 / (i + 1)} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))
        : (
            <mesh scale={1.06}>
              <sphereGeometry args={[R, 48, 48]} />
              <meshBasicMaterial color={def.planetB} transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          )}
      {def.ring && (
        <mesh rotation={[-1.25, 0.2, 0]}>
          <ringGeometry args={[R * 1.3, R * 2.3, 96]} />
          <meshBasicMaterial color={def.ring} transparent opacity={def.id === 'saturn' ? 0.6 : 0.25} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <lineSegments ref={streaks} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[streakPos, 3]} /></bufferGeometry>
        <lineBasicMaterial color="#bcd4ff" transparent opacity={0} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/* ============================ FLIGHT + ATMOSPHERE ============================ */

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), want = new THREE.Vector3();

function Controller({
  def, phase, heightAt, station, onDist, flyKey,
}: {
  def: WorldDef; phase: WorldPhase; heightAt?: (x: number, z: number) => number;
  station: THREE.Vector3; onDist: (d: number) => void; flyKey: number;
}) {
  const { camera, scene, gl } = useThree();
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const distCb = useRef(onDist); distCb.current = onDist;
  const S = useRef({
    yaw: 0, pitch: -0.2, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    keys: new Set<string>(), fly: false, thrust: false, drag: false, lx: 0, ly: 0, t0: -1, emit: 0,
  });
  const atmo = useRef<{ bg: THREE.Color; fog: THREE.FogExp2 } | null>(null);
  const c1 = useMemo(() => new THREE.Color(), []);
  const c2 = useMemo(() => new THREE.Color(), []);

  useEffect(() => { if (flyKey > 0) S.current.fly = true; }, [flyKey]);

  useEffect(() => {
    const s = S.current;
    const [x, y, z] = def.start;
    const water = def.ground?.water ?? -1e9;
    s.pos.set(x, heightAt ? Math.max(heightAt(x, z), water) + 14 : y, z);
    s.yaw = Math.atan2(-(station.x - x), -(station.z - z)) + 1.0;

    const prevBg = scene.background, prevFog = scene.fog;
    const bg = new THREE.Color(def.sky[0]);
    const fog = new THREE.FogExp2(def.fog[0], def.density[0]);
    scene.background = bg; scene.fog = fog; atmo.current = { bg, fog };
    camera.near = 0.2; camera.far = 6000; (camera as THREE.PerspectiveCamera).fov = 68; camera.updateProjectionMatrix();
    camera.rotation.order = 'YXZ';

    const el = gl.domElement;
    const kd = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'explore') return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      s.fly = false;
      s.keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => s.keys.delete(e.code);
    const pd = (e: PointerEvent) => { s.fly = false; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; el.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => {
      if (!s.drag || phaseRef.current !== 'explore') return;
      s.yaw -= (e.clientX - s.lx) * 0.0032;
      s.pitch = THREE.MathUtils.clamp(s.pitch - (e.clientY - s.ly) * 0.0032, -1.45, 1.45);
      s.lx = e.clientX; s.ly = e.clientY;
    };
    const pu = () => { s.drag = false; };
    const th = (e: Event) => { s.thrust = (e as CustomEvent<boolean>).detail; };
    const blur = () => s.keys.clear();
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur); window.addEventListener('world-thrust', th);
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm);
    el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    return () => {
      scene.background = prevBg; scene.fog = prevFog;
      camera.near = 0.1; camera.far = 200; (camera as THREE.PerspectiveCamera).fov = 60; camera.updateProjectionMatrix();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur); window.removeEventListener('world-thrust', th);
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm);
      el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu);
    };
  }, [def, heightAt, station, camera, scene, gl]);

  useFrame((state, delta) => {
    const s = S.current;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (s.t0 < 0) s.t0 = t;
    const arr = Math.min(1, (t - s.t0) / 3.2);
    const e = 1 - (1 - arr) ** 3;
    const k = s.keys;
    const live = phaseRef.current === 'explore';
    const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 2.6 : 1;
    const f = live ? (k.has('KeyW') || k.has('ArrowUp') || s.thrust ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) : 0;
    const r = live ? (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) : 0;
    const u = live ? (k.has('KeyE') || k.has('Space') ? 1 : 0) - (k.has('KeyQ') || k.has('KeyC') ? 1 : 0) : 0;

    const cp = Math.cos(s.pitch);
    fwd.set(-Math.sin(s.yaw) * cp, Math.sin(s.pitch), -Math.cos(s.yaw) * cp);
    right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    want.set(0, u, 0).addScaledVector(fwd, f).addScaledVector(right, r).multiplyScalar(def.speed * boost);
    s.vel.lerp(want, 1 - Math.exp(-2.6 * dt));
    s.pos.addScaledVector(s.vel, dt);

    // wind pushes you around in the gas worlds
    if (def.turb) {
      s.pos.x += Math.sin(t * 0.13) * def.turb * dt * 3;
      s.pos.z += Math.cos(t * 0.1) * def.turb * dt * 2;
    }

    // per-mode bounds
    const p = s.pos;
    if (def.mode === 'ground') {
      const b = def.ground!.size * 0.46;
      p.x = THREE.MathUtils.clamp(p.x, -b, b); p.z = THREE.MathUtils.clamp(p.z, -b, b);
      const hmin = Math.max(heightAt!(p.x, p.z), def.ground!.water ?? -1e9) + 3;
      if (p.y < hmin) { p.y = hmin; s.vel.y = Math.max(0, s.vel.y); }
      p.y = Math.min(p.y, 260);
    } else if (def.mode === 'sky') {
      const h = Math.hypot(p.x, p.z);
      if (h > 700) { p.x *= 700 / h; p.z *= 700 / h; }
      p.y = THREE.MathUtils.clamp(p.y, def.yRange[0], def.yRange[1]);
    } else if (def.mode === 'rings') {
      const h = Math.hypot(p.x, p.z);
      if (h < 345 || h > 900) { const kk = THREE.MathUtils.clamp(h, 345, 900) / (h || 1); p.x *= kk; p.z *= kk; }
      p.y = THREE.MathUtils.clamp(p.y, -140, 160);
    } else {
      const h = Math.hypot(p.x, p.z);
      if (h > 520) { p.x *= 520 / h; p.z *= 520 / h; }
      p.y = THREE.MathUtils.clamp(p.y, 8, 200);
    }

    // "skip to the station": cinematic fly-in that ends a short distance in front of it
    if (s.fly && live) {
      const dx = p.x - station.x, dz = p.z - station.z, dl = Math.hypot(dx, dz) || 1;
      const T = want.set(station.x + (dx / dl) * 26, station.y + 9, station.z + (dz / dl) * 26);
      p.x = THREE.MathUtils.damp(p.x, T.x, 1.7, dt);
      p.y = THREE.MathUtils.damp(p.y, T.y, 1.7, dt);
      p.z = THREE.MathUtils.damp(p.z, T.z, 1.7, dt);
      s.vel.set(0, 0, 0);
      const ty = Math.atan2(-(station.x - p.x), -(station.z - p.z));
      const dy = ((ty - s.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      s.yaw += dy * (1 - Math.exp(-3 * dt));
      s.pitch = THREE.MathUtils.damp(s.pitch, Math.atan2(station.y + 6 - p.y, Math.hypot(station.x - p.x, station.z - p.z)), 3, dt);
      if (p.distanceTo(T) < 1.5) s.fly = false;
    }

    camera.position.copy(p);
    camera.position.y += (1 - e) ** 2 * 260;
    if (def.turb) {
      camera.position.x += (vnoise(t * 2.2, 1) - 0.5) * def.turb * 0.6;
      camera.position.y += (vnoise(t * 2.6, 9) - 0.5) * def.turb * 0.6;
    }
    camera.rotation.set(s.pitch - (1 - e) * 0.55, s.yaw, 0);

    // altitude-dependent light, fog and sky + drifting visibility
    const a = atmo.current;
    if (a) {
      const kk = THREE.MathUtils.clamp((camera.position.y - def.yRange[0]) / (def.yRange[1] - def.yRange[0]), 0, 1);
      const tb = 1 - kk;
      a.bg.copy(c1.set(def.sky[0])).lerp(c2.set(def.sky[1]), tb);
      a.fog.color.copy(c1.set(def.fog[0])).lerp(c2.set(def.fog[1]), tb);
      const drift = 0.78 + 0.45 * vnoise(p.x * 0.004 + t * 0.03, p.z * 0.004);
      a.fog.density = lerp(def.density[0], def.density[1], tb) * drift * (1 + (1 - e) * 2.2);
    }

    if (t - s.emit > 0.2) { s.emit = t; distCb.current(Math.round(camera.position.distanceTo(station))); }
  });

  return null;
}

/* ============================== ENVIRONMENTS ============================== */

function CloudLayer({ y, color, opacity, seed, size = 1800 }: { y: number; color: string; opacity: number; seed: number; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeCloudTex(color, seed), [color, seed]);
  useFrame((s) => { if (ref.current) ref.current.position.x = Math.sin(s.clock.elapsedTime * 0.02 * (1 + seed * 0.3)) * 90; });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, seed]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Lightning({ rate, color }: { rate: number; color: string }) {
  const light = useRef<THREE.PointLight>(null);
  const bolt = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e8f0ff', transparent: true, opacity: 0, fog: false }));
  }, []);
  const st = useRef({ next: 2, flash: 0 });
  useFrame(({ clock, camera }, d) => {
    const s = st.current, t = clock.elapsedTime;
    if (t > s.next) {
      s.flash = 1; s.next = t + (1.5 + Math.random() * 7) / Math.max(rate, 0.05);
      const a = Math.random() * 6.28, rad = 120 + Math.random() * 260;
      const bx = camera.position.x + Math.cos(a) * rad, bz = camera.position.z + Math.sin(a) * rad;
      const pos = bolt.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 14; i++) pos.setXYZ(i, bx + (Math.random() - 0.5) * 18, camera.position.y + 70 - i * 12, bz + (Math.random() - 0.5) * 18);
      pos.needsUpdate = true;
      light.current?.position.set(bx, camera.position.y - 20, bz);
    }
    s.flash = Math.max(0, s.flash - d * 3.2);
    (bolt.material as THREE.LineBasicMaterial).opacity = s.flash;
    if (light.current) light.current.intensity = s.flash * s.flash * 90000;
  });
  return (<><primitive object={bolt} /><pointLight ref={light} color={color} distance={900} decay={2} intensity={0} /></>);
}

function SkyDeck({ def }: { def: WorldDef }) {
  const tex = useMemo(() => makeBands(def.bands!, def.spot), [def]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]}>
      <planeGeometry args={[3600, 3600]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

function Ground({ def, t }: { def: WorldDef; t: ReturnType<typeof makeTerrain> }) {
  const g = def.ground!;
  const pines = useRef<THREE.InstancedMesh>(null);
  const broad = useRef<THREE.InstancedMesh>(null);
  const bushes = useRef<THREE.InstancedMesh>(null);
  const birds = useRef<THREE.InstancedMesh>(null);
  const herd = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(() => (g.trees ? { pine: makePine(), broad: makeBroadleaf(), bush: makeBush(), deer: makeDeer(), bird: makeBird() } : null), [g.trees]);
  const detail = useMemo(() => { const d = makeDetailTex(); d.repeat.set(90, 90); return d; }, []);
  const waves = useMemo(() => { const d = makeDetailTex(); d.repeat.set(220, 220); return d; }, []);

  const trackPts = useMemo(() => {
    if (!g.tracks) return null;
    const [sx, , sz] = def.station.at;
    const A: [number, number, number][] = [], B: [number, number, number][] = [];
    for (let i = 0; i <= 90; i++) {
      const k = (i / 90) * 0.72;
      const x = sx * k + Math.sin(i * 0.2) * 6, z = sz * k + Math.cos(i * 0.17) * 6;
      const nx = -sz, nz = sx, nl = Math.hypot(nx, nz);
      for (const [arr, o] of [[A, 1.1], [B, -1.1]] as const) {
        const px = x + (nx / nl) * o, pz = z + (nz / nl) * o;
        arr.push([px, t.heightAt(px, pz) + 0.3, pz]);
      }
    }
    return [A, B];
  }, [def, g.tracks, t]);

  useEffect(() => {
    const r = rng(hashStr(def.id + 'x'));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const place = (mesh: THREE.InstancedMesh | null, cap: number, off: number, ok: (h: number, d: number) => boolean, lo: number, hi: number) => {
      if (!mesh) return;
      const eu = new THREE.Euler(), cc = new THREE.Color();
      let n = 0;
      for (let i = 0; i < 30000 && n < cap; i++) {
        const x = (r() - 0.5) * g.size * 0.92, z = (r() - 0.5) * g.size * 0.92, h = t.heightAt(x, z);
        const [sx, , sz] = def.station.at;
        if (Math.hypot(x - sx, z - sz) < 45 || !ok(h, fbm(x * 0.018 + off, z * 0.018 + off))) continue;
        const s = lo + r() * (hi - lo);
        q.setFromEuler(eu.set((r() - 0.5) * 0.1, r() * 6.28, (r() - 0.5) * 0.1));
        m.compose(p.set(x, h - 0.3, z), q, sc.set(s, s * (0.85 + r() * 0.4), s));
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, cc.setRGB(0.8 + r() * 0.4, 0.85 + r() * 0.3, 0.7 + r() * 0.3));
        n++;
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    if (g.trees) {
      place(pines.current, 900, 0, (h, f) => h > 10 && h < 42 && f > 0.47, 0.9, 1.7);
      place(broad.current, 700, 5, (h, f) => h > 3.5 && h < 24 && f > 0.5, 0.8, 1.4);
      place(bushes.current, 700, 11, (h, f) => h > 3.2 && h < 40 && f > 0.4, 0.8, 1.9);
    }
    if (rocks.current) {
      let n = 0;
      const cap = def.id === 'earth' ? 140 : 700;
      for (let i = 0; i < 9000 && n < cap; i++) {
        const x = (r() - 0.5) * g.size * 0.92, z = (r() - 0.5) * g.size * 0.92, h = t.heightAt(x, z);
        if (h < (g.water ?? -1e9) + 1.5) continue;
        const s = 0.5 + r() ** 3 * 5;
        q.setFromEuler(new THREE.Euler(r() * 3, r() * 6, r() * 3));
        m.compose(p.set(x, h + s * 0.25, z), q, sc.set(s * (0.8 + r() * 0.6), s * 0.6, s * (0.8 + r() * 0.6)));
        rocks.current.setMatrixAt(n, m);
        rocks.current.setColorAt(n, new THREE.Color().setScalar(0.45 + r() * 0.5));
        n++;
      }
      rocks.current.count = n; rocks.current.instanceMatrix.needsUpdate = true;
      if (rocks.current.instanceColor) rocks.current.instanceColor.needsUpdate = true;
    }
    if (herd.current) {
      let n = 0;
      for (let i = 0; i < 4000 && n < 40; i++) {
        const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300, h = t.heightAt(x, z);
        if (h < 4 || h > 14) continue;
        m.compose(p.set(x, h, z), q.setFromAxisAngle(yAxis, r() * 6.28), sc.set(1.5, 1.5, 1.5));
        herd.current.setMatrixAt(n++, m);
      }
      herd.current.count = n; herd.current.instanceMatrix.needsUpdate = true;
    }
  }, [def, g.size, t]);

  useFrame((s) => {
    if (waves) waves.offset.set(s.clock.elapsedTime * 0.004, s.clock.elapsedTime * 0.0025);
    const b = birds.current;
    if (!b) return;
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
    for (let i = 0; i < 18; i++) {
      const a = s.clock.elapsedTime * (0.12 + (i % 5) * 0.015) + i * 0.7, R = 70 + (i % 6) * 22;
      const flap = Math.sin(s.clock.elapsedTime * 9 + i) * 0.7;
      e.set(0, -a, flap); q.setFromEuler(e);
      m.compose(new THREE.Vector3(Math.cos(a) * R - 60, 55 + (i % 4) * 9 + Math.sin(a * 2) * 4, Math.sin(a) * R - 20), q, new THREE.Vector3(1, 1, 1));
      b.setMatrixAt(i, m);
    }
    b.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh geometry={t.geo} receiveShadow castShadow><meshStandardMaterial vertexColors map={detail} color={BOOST} roughness={0.96} metalness={0} bumpMap={detail} bumpScale={3.5} /></mesh>
      {g.water !== undefined && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, g.water, 0]}>
          <planeGeometry args={[5000, 5000]} />
          <meshStandardMaterial color="#1f6fa8" transparent opacity={0.84} roughness={0.1} metalness={0.4} bumpMap={waves} bumpScale={1.4} />
        </mesh>
      )}
      <instancedMesh ref={rocks} args={[undefined, undefined, 700]} frustumCulled={false} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={g.stops[Math.min(2, g.stops.length - 1)][1]} roughness={1} bumpMap={detail} bumpScale={4} />
      </instancedMesh>
      {g.trees && geos && (
        <>
          <instancedMesh ref={pines} args={[geos.pine, undefined, 900]} frustumCulled={false} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.95} />
          </instancedMesh>
          <instancedMesh ref={broad} args={[geos.broad, undefined, 700]} frustumCulled={false} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.95} />
          </instancedMesh>
          <instancedMesh ref={bushes} args={[geos.bush, undefined, 700]} frustumCulled={false} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={1} />
          </instancedMesh>
          <instancedMesh ref={herd} args={[geos.deer, undefined, 40]} frustumCulled={false} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={1} />
          </instancedMesh>
          <instancedMesh ref={birds} args={[geos.bird, undefined, 18]} frustumCulled={false}>
            <meshBasicMaterial color="#14161a" side={THREE.DoubleSide} />
          </instancedMesh>
        </>
      )}
      {trackPts?.map((pts, i) => <Line key={i} points={pts} color="#2b1209" lineWidth={2.2} transparent opacity={0.8} />)}
      {g.kind === 'cone' && t.feats.map((f, i) => (
        <mesh key={`lava${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[f.x, t.heightAt(f.x, f.z) + 0.6, f.z]}>
          <circleGeometry args={[Math.max(3, f.rad * 0.12), 20]} />
          <meshBasicMaterial color="#ff6a1a" toneMapped={false} fog={false} />
        </mesh>
      ))}
      {g.kind === 'cone' && t.feats.slice(0, 4).map((f, i) => (
        <pointLight key={i} position={[f.x, t.heightAt(f.x, f.z) + 14, f.z]} color="#ff6a1a" intensity={9000} distance={180} decay={2} />
      ))}
      {def.stars && <Stars radius={2500} depth={300} count={4500} factor={9} fade />}
      {def.id !== 'venus' && (
        <mesh position={[def.light.dir[0] * 3500, def.light.dir[1] * 3500, def.light.dir[2] * 3500]}>
          <sphereGeometry args={[def.id === 'mercury' ? 190 : 90, 24, 24]} />
          <meshBasicMaterial color="#fff6e0" fog={false} toneMapped={false} />
        </mesh>
      )}
    </>
  );
}

const NOISE = `float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1.,0.)),f.x),mix(hh(i+vec2(0.,1.)),hh(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.02;a*=.5;}return s;}`;

/** Boiling photosphere: animated convection cells, dark intergranular lanes, sunspots, haze toward the limb. */
const surfaceMaterial = () => new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: NOISE + `
    uniform float time; varying vec3 vW;
    vec2 h22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
    vec2 cell(vec2 p,float t){ vec2 g=floor(p),f=fract(p); float d1=8.,d2=8.;
      for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(float(x),float(y)); vec2 r=h22(g+o); r=.5+.5*sin(t+6.2831*r);
        float d=length(o+r-f); if(d<d1){d2=d1;d1=d;} else if(d<d2){d2=d;} } return vec2(d1,d2); }
    void main(){
      vec2 p=vW.xz;
      vec2 warp=vec2(fbm(p*.004+time*.02),fbm(p*.004+7.-time*.015))-.5; p+=warp*140.;
      vec2 c=cell(p*.05,time*.35); float lane=smoothstep(0.,.2,c.y-c.x); float core=1.-c.x;
      float spots=smoothstep(.6,.78,fbm(vW.xz*.0021+3.)); float fac=fbm(vW.xz*.012+time*.03);
      vec3 col=mix(vec3(.5,.09,0.),vec3(1.,.5,.07),lane);
      col=mix(col,vec3(1.,.9,.5),pow(core,3.)*lane*.85); col*=.75+.55*fac;
      col=mix(col,vec3(.22,.04,0.),spots*.9); col*=1.7;
      float d=length(vW-cameraPosition); col=mix(col,vec3(1.5,.8,.25),smoothstep(250.,2300.,d));
      gl_FragColor=vec4(col,1.); }`,
});

/** Coronal sky: warm horizon glow with slowly drifting streamers. */
const coronaMaterial = () => new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { time: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: NOISE + `uniform float time; varying vec3 vD;
    void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.); float ang=atan(d.x,d.z);
      float glow=pow(1.-h,3.5); float st=fbm(vec2(ang*4.,h*2.5-time*.04)); float st2=fbm(vec2(ang*9.+3.,h*5.-time*.07));
      vec3 c=mix(vec3(.10,.012,0.),vec3(1.,.48,.1),glow); c+=vec3(1.,.62,.22)*(st*.7+st2*.4)*glow*1.1;
      c=mix(c,vec3(1.3,.7,.22),smoothstep(.02,-.3,d.y)); gl_FragColor=vec4(c,1.); }`,
});

/** Magnetic loop / flare plasma that flows along a tube and fades into the surface at both feet. */
const plasmaMaterial = (seed: number) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { time: { value: 0 }, seed: { value: seed }, power: { value: 1 } },
  vertexShader: `varying vec2 vUv; uniform float time,seed; void main(){ vUv=uv;
    vec3 p=position+normal*(sin(uv.x*18.+time*2.+seed)*.9+sin(uv.x*41.-time*3.)*.4);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
  fragmentShader: NOISE + `varying vec2 vUv; uniform float time,seed,power;
    void main(){ float fade=sin(3.14159*vUv.x); float rim=pow(abs(sin(vUv.y*3.14159)),.6);
      float flow=fbm(vec2(vUv.x*14.-time*.8+seed,vUv.y*6.));
      vec3 c=mix(vec3(1.,.22,.02),vec3(1.,.85,.4),flow);
      gl_FragColor=vec4(c*1.6,fade*(.3+.7*flow)*(.4+.6*rim)*power); }`,
});

function StarWorld() {
  const surface = useMemo(surfaceMaterial, []);
  const corona = useMemo(coronaMaterial, []);
  const dome = useRef<THREE.Mesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const loops = useMemo(() => {
    const r = rng(11);
    const mk = (ax: number, az: number, bx: number, bz: number, h: number, rad: number, j: number) => {
      const jx = (r() - 0.5) * j, jz = (r() - 0.5) * j;
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(ax, -2, az), new THREE.Vector3((ax + bx) / 2 + jx, h * 2, (az + bz) / 2 + jz), new THREE.Vector3(bx, -2, bz));
      return new THREE.TubeGeometry(c, 64, rad, 10);
    };
    const arcs = Array.from({ length: 8 }, (_, i) => {
      const ang = (i / 8) * Math.PI * 2 + 0.4, rad = 110 + r() * 300, span = 55 + r() * 70;
      const ax = Math.cos(ang) * rad, az = Math.sin(ang) * rad;
      const bx = ax + Math.cos(ang + 1.5) * span, bz = az + Math.sin(ang + 1.5) * span;
      const h = 40 + r() * 60;
      return {
        mat: plasmaMaterial(r() * 50),
        strands: Array.from({ length: 5 }, () => mk(ax, az, bx, bz, h * (0.8 + r() * 0.35), 1.6 + r() * 3.4, 14)),
        field: [0.55, 0.8, 1.05, 1.3].map((k) => new THREE.QuadraticBezierCurve3(new THREE.Vector3(ax, 0, az), new THREE.Vector3((ax + bx) / 2, h * 2 * k, (az + bz) / 2), new THREE.Vector3(bx, 0, bz)).getPoints(40).map((v) => [v.x, v.y, v.z] as [number, number, number])),
      };
    });
    const flares = Array.from({ length: 6 }, (_, i) => {
      const ang = r() * 6.28, rad = 80 + r() * 330, ax = Math.cos(ang) * rad, az = Math.sin(ang) * rad;
      return { mat: plasmaMaterial(r() * 50), phase: i * 1.7, strands: [0, 1, 2].map(() => mk(ax, az, ax + (r() - 0.5) * 30, az + (r() - 0.5) * 30, 70 + r() * 70, 1.4 + r() * 2.2, 10)) };
    });
    return { arcs, flares };
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    surface.uniforms.time.value = t; corona.uniforms.time.value = t;
    dome.current?.position.copy(camera.position);
    loops.arcs.forEach((a) => { a.mat.uniforms.time.value = t; a.mat.uniforms.power.value = 0.8 + 0.3 * Math.sin(t * 0.7 + a.mat.uniforms.seed.value); });
    loops.flares.forEach((f) => { f.mat.uniforms.time.value = t * 1.6; f.mat.uniforms.power.value = Math.max(0, Math.sin(t * 0.45 + f.phase)) ** 2 * 1.4; });
    if (lamp.current) lamp.current.intensity = 2.2e6 * (0.85 + 0.25 * Math.sin(t * 1.7) * Math.sin(t * 0.9));
  });

  return (
    <>
      <mesh ref={dome} material={corona} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[4800, 32, 16]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={surface}><planeGeometry args={[4200, 4200, 1, 1]} /></mesh>
      {[...loops.arcs, ...loops.flares].map((a, i) => (
        <group key={i}>{a.strands.map((g, j) => <mesh key={j} geometry={g} material={a.mat} renderOrder={5} frustumCulled={false} />)}</group>
      ))}
      {loops.arcs.map((a, i) => a.field.map((pts, j) => <Line key={`${i}-${j}`} points={pts} color="#ffd27a" lineWidth={0.8} transparent opacity={0.18} />))}
      <pointLight ref={lamp} position={[0, 160, 0]} color="#ffb060" distance={2000} decay={2} />
    </>
  );
}

function RingWorld({ def }: { def: WorldDef }) {
  const rocks = useRef<THREE.InstancedMesh>(null);
  const grp = useRef<THREE.Group>(null);
  const planetTex = useMemo(() => makeBands(def.bands!, undefined, 512), [def]);
  const ringTex = useMemo(() => makeRingTex(def.ring!), [def]);
  const L = useMemo(() => new THREE.Vector3(...def.light.dir).normalize(), [def]);
  const sheet = useMemo(() => {
    const geo = new THREE.RingGeometry(420, 760, 360, 24);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y);
      uv.setXY(i, (r - 420) / 340, 0.5);
      // geometry is in XY; after rotateX(-90°) point = (x, 0, -y). Planet shadow:
      const p = new THREE.Vector3(x, 0, -y);
      const along = p.dot(L);
      const perp = p.clone().addScaledVector(L, -along).length();
      const sh = along < 0 && perp < 300 ? 0.12 + 0.88 * smooth(240, 300, perp) : 1;
      col.set([sh, sh, sh], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [L]);

  useEffect(() => {
    const m = rocks.current;
    if (!m) return;
    const r = rng(99), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    let n = 0;
    while (n < 14000) {
      const u = r(), rad = 420 + u * 340;
      if (r() > ringDensity(u)) continue;
      const a = r() * Math.PI * 2, s = 0.35 + r() ** 3.2 * 2.6;
      e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e);
      mx.compose(new THREE.Vector3(Math.cos(a) * rad, (r() - 0.5) * 4, Math.sin(a) * rad), q, new THREE.Vector3(s, s * (0.6 + r() * 0.5), s));
      m.setMatrixAt(n, mx);
      m.setColorAt(n, c.set(r() > 0.35 ? '#e8f2ff' : '#8c8174').multiplyScalar(0.7 + r() * 0.5));
      n++;
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame((s) => { if (grp.current) grp.current.rotation.y = s.clock.elapsedTime * 0.004; });

  return (
    <>
      <mesh><sphereGeometry args={[300, 96, 64]} /><meshStandardMaterial map={planetTex} roughness={0.95} /></mesh>
      <mesh scale={1.025}><sphereGeometry args={[300, 48, 32]} /><meshBasicMaterial color="#ffe6b0" transparent opacity={0.09} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} /></mesh>
      <group ref={grp}>
        <mesh geometry={sheet}><meshBasicMaterial map={ringTex} vertexColors transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.9} /></mesh>
        <instancedMesh ref={rocks} args={[undefined, undefined, 14000]} frustumCulled={false}>
          <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.9} flatShading />
        </instancedMesh>
        {/* unusual ring formations: moonlets with wakes */}
        {[[-60, 560], [140, 640], [210, 470]].map(([deg, rad], i) => (
          <group key={i} position={[Math.cos(deg * 0.01745) * rad, 0, Math.sin(deg * 0.01745) * rad]}>
            <mesh scale={[1, 0.7, 0.9]}><icosahedronGeometry args={[12 + i * 4, 1]} /><meshStandardMaterial color="#b9b2a6" flatShading roughness={1} /></mesh>
            <Sparkles count={120} scale={[80, 4, 22]} size={3} speed={0.1} color="#dff1ff" />
          </group>
        ))}
      </group>
      <Stars radius={2500} depth={300} count={5000} factor={9} fade />
    </>
  );
}

const BOOST = new THREE.Color(1.9, 1.9, 1.9);
const zAxis = new THREE.Vector3(0, 0, 1);
const yAxis = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _z = new THREE.Quaternion();

/** Camera-facing cloud puffs scattered through the atmosphere: real parallax and volume as you fly through. */
function CloudPuffs({ def }: { def: WorldDef }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => makeCloudTex(def.clouds!.color, 9), [def]);
  const data = useMemo(() => {
    const r = rng(hashStr(def.id + 'p'));
    return Array.from({ length: 260 }, () => ({
      x: (r() - 0.5) * 1300, z: (r() - 0.5) * 1300, rot: r() * 6.28, sp: 0.4 + r() * 1.2, s: 70 + r() * 150,
      y: def.yRange[0] + 10 + r() * (def.yRange[1] - def.yRange[0] - 20),
    }));
  }, [def]);
  useFrame(({ camera, clock }) => {
    const m = ref.current;
    if (!m) return;
    data.forEach((d, i) => {
      _p.set(d.x + Math.sin(clock.elapsedTime * 0.03 * d.sp) * 60, d.y, d.z);
      _z.setFromAxisAngle(zAxis, d.rot);
      _q.copy(camera.quaternion).multiply(_z);
      m.setMatrixAt(i, _m.compose(_p, _q, _s.set(d.s, d.s * 0.6, 1)));
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 260]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}

const HAS_SKY = new Set(['earth', 'mars', 'venus', 'jupiter', 'uranus', 'neptune']);

/** Directional sun that follows the viewer so shadows stay sharp around you. */
function ShadowSun({ def }: { def: WorldDef }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const { gl } = useThree();
  const dir = useMemo(() => new THREE.Vector3(...def.light.dir).normalize(), [def]);
  const shadows = def.mode === 'ground';
  useEffect(() => {
    const prev = gl.shadowMap.enabled;
    gl.shadowMap.enabled = shadows; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    return () => { gl.shadowMap.enabled = prev; };
  }, [gl, shadows]);
  useFrame(({ camera }) => {
    const l = ref.current;
    if (!l) return;
    l.target.position.copy(camera.position); l.target.updateMatrixWorld();
    l.position.copy(camera.position).addScaledVector(dir, 500);
  });
  return (
    <>
      <directionalLight ref={ref} color={def.light.color} intensity={def.light.i} castShadow={shadows}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.6}
        shadow-camera-left={-170} shadow-camera-right={170} shadow-camera-top={170} shadow-camera-bottom={-170}
        shadow-camera-near={10} shadow-camera-far={1100} />
      {ref.current && <primitive object={ref.current.target} />}
    </>
  );
}

/** Gradient sky + sun glow that tracks the live fog (horizon) and background (zenith) colours. */
function SkyDome({ def }: { def: WorldDef }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(...def.light.dir).normalize() },
      sunCol: { value: new THREE.Color(def.light.color) },
      glow: { value: def.id === 'earth' ? 1 : def.id === 'mars' ? 0.7 : def.id === 'venus' ? 0.35 : 0.3 },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 top,hor,sunCol,sunDir; uniform float glow;
      void main(){
        float h = clamp(vD.y*1.6+0.08,0.,1.);
        vec3 c = mix(hor, top, pow(h,0.6));
        float s = max(dot(normalize(vD), sunDir),0.);
        c += sunCol * (pow(s,900.)*4. + pow(s,40.)*0.55*glow + pow(s,6.)*0.18*glow);
        c = mix(c, hor, smoothstep(0.02,-0.25,vD.y));
        gl_FragColor = vec4(c,1.);
      }`,
  }), [def]);
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
    if (scene.background instanceof THREE.Color) mat.uniforms.top.value.copy(scene.background);
    if (scene.fog) mat.uniforms.hor.value.copy(scene.fog.color);
  });
  return <mesh ref={mesh} material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[4800, 32, 16]} /></mesh>;
}

/** Keeps the particle volume centred on the viewer so dust/ice is always around you. */
function Follow({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ camera }) => g.current?.position.copy(camera.position));
  return <group ref={g}>{children}</group>;
}

/* ================================ ROOT ================================ */

export function WorldScene({
  def, phase, onDist, flyKey,
}: { def: WorldDef; phase: WorldPhase; onDist: (d: number) => void; flyKey: number }) {
  const terrain = useMemo(() => (def.mode === 'ground' ? makeTerrain(def) : null), [def]);
  const station = useMemo(() => {
    const [x, y, z] = def.station.at;
    return new THREE.Vector3(x, terrain ? terrain.stationY : y, z);
  }, [def, terrain]);
  const L = def.light;

  return (
    <group>
      <ambientLight intensity={L.amb} color={def.mode === 'ground' ? '#b8c4e0' : '#ffffff'} />
      {def.id !== 'sun' && <ShadowSun def={def} />}
      {HAS_SKY.has(def.id) && <SkyDome def={def} />}

      {def.mode === 'ground' && terrain && <Ground def={def} t={terrain} />}
      {def.mode === 'sky' && <SkyDeck def={def} />}
      {def.mode === 'rings' && <RingWorld def={def} />}
      {def.mode === 'star' && <StarWorld />}

      {def.clouds && def.clouds.ys.map((y, i) => (
        <CloudLayer key={i} y={y} color={def.clouds!.color} opacity={def.clouds!.opacity} seed={i + 1} />
      ))}
      {def.mode === 'sky' && def.clouds && <CloudPuffs def={def} />}
      {def.lightning && <Lightning rate={def.lightning} color={def.id === 'venus' ? '#ffcf8a' : '#cfe0ff'} />}

      <Follow>
        <Sparkles count={def.particles.count} scale={[420, 160, 420]} size={def.particles.size} speed={def.particles.speed} color={def.particles.color} opacity={0.7} noise={2} />
      </Follow>

      <Station kind={def.station.kind} accent={def.station.accent} position={station.toArray() as [number, number, number]} />
      <Controller def={def} phase={phase} heightAt={terrain?.heightAt} station={station} onDist={onDist} flyKey={flyKey} />
    </group>
  );
}
