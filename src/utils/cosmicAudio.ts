/**
 * cosmicAudio
 * Procedural Web Audio for the whole universe — no audio files, everything is synthesised.
 *
 *  • AMBIENT SCENES  — every place has its own bed: the deep sky, the orrery, and one signature
 *    soundscape per world (roaring corona, dry metallic vacuum, heavy sulphur wind, living Earth,
 *    dusty Mars wind, thunderous Jupiter, glassy Saturn rings, icy Uranus, deep Neptune ocean).
 *    Scenes crossfade into each other when you travel.
 *  • TRANSITIONS     — a launch/warp sound tinted per planet, an arrival stinger in the planet's own
 *    voice, a "skip" whoosh, fly-to-station servo, observatory door + chime, and UI sounds.
 *  • Everything is gated by the audio button: when muted nothing is scheduled.
 */

type Pulse =
  | 'ping' | 'tick' | 'thunder' | 'rumble' | 'chirp' | 'gust' | 'bell' | 'crystal' | 'sonar' | 'whale';

interface Voice {
  type: OscillatorType;
  ratios: number[];
  lp: number;
  atk: number;
}

interface Recipe {
  root: number;
  level: number;
  partials: [ratio: number, type: OscillatorType, gain: number, cents?: number][];
  lp: number;
  noise?: { type: BiquadFilterType; f: number; q: number; gain: number; lfo?: [rate: number, depth: number] };
  trem?: [rate: number, depth: number];
  vib?: [rate: number, cents: number];
  pulse?: { every: [number, number]; kind: Pulse };
  voice: Voice; // timbre used by select blips and arrival stingers
  sting: number; // base pitch of those stingers
  travelPeak: number; // brightest point of the launch sweep (Hz)
}

const RECIPES: Record<string, Recipe> = {
  // the deep sky — the original cosmic drone
  sky: {
    root: 55, level: 0.62, lp: 600,
    partials: [[1, 'sine', 0.32, -9], [1.4983, 'triangle', 0.16, -3], [2, 'sine', 0.12, 3], [2.9966, 'triangle', 0.05, 9]],
    noise: { type: 'bandpass', f: 760, q: 0.4, gain: 0.16 },
    trem: [0.045, 0.35],
    pulse: { every: [14, 26], kind: 'ping' },
    voice: { type: 'triangle', ratios: [1, 1.5, 2, 3], lp: 2400, atk: 0.4 }, sting: 196, travelPeak: 2400,
  },
  // the orrery — warmer, more open
  solar: {
    root: 65.41, level: 0.6, lp: 1100,
    partials: [[1, 'sine', 0.3], [1.5, 'sine', 0.18, 4], [2, 'triangle', 0.12], [3, 'sine', 0.08, -5], [4, 'sine', 0.04]],
    noise: { type: 'bandpass', f: 1400, q: 0.5, gain: 0.08 },
    trem: [0.07, 0.3],
    pulse: { every: [8, 15], kind: 'ping' },
    voice: { type: 'triangle', ratios: [1, 1.25, 1.5, 2], lp: 3000, atk: 0.25 }, sting: 261.6, travelPeak: 2600,
  },
  // Sol — a furnace: low roar, detuned saws, rolling flares
  sun: {
    root: 41.2, level: 0.75, lp: 260,
    partials: [[0.5, 'sine', 0.3], [1, 'sawtooth', 0.14, -7], [1.005, 'sawtooth', 0.14, 7], [2, 'sine', 0.22], [3, 'triangle', 0.1]],
    noise: { type: 'lowpass', f: 520, q: 0.3, gain: 0.5, lfo: [0.22, 0.5] },
    trem: [0.11, 0.35],
    pulse: { every: [6, 11], kind: 'rumble' },
    voice: { type: 'sawtooth', ratios: [1, 1.5, 2, 3], lp: 1400, atk: 0.9 }, sting: 164.8, travelPeak: 1800,
  },
  // Mercury — no air: thin, dry, metallic ticks in silence
  mercury: {
    root: 130.8, level: 0.34, lp: 3200,
    partials: [[1, 'triangle', 0.05], [2.76, 'sine', 0.04], [5.4, 'sine', 0.02]],
    noise: { type: 'highpass', f: 5000, q: 0.5, gain: 0.018 },
    pulse: { every: [3, 7], kind: 'tick' },
    voice: { type: 'sine', ratios: [1, 2.76, 5.4, 8.93], lp: 6000, atk: 0.005 }, sting: 659, travelPeak: 3400,
  },
  // Venus — crushing, slow sulphur wind and far thunder
  venus: {
    root: 49, level: 0.8, lp: 320,
    partials: [[1, 'sawtooth', 0.11, -8], [1, 'sawtooth', 0.11, 8], [2, 'sine', 0.18], [1.5, 'sine', 0.1], [0.5, 'sine', 0.2]],
    noise: { type: 'bandpass', f: 230, q: 1.3, gain: 0.45, lfo: [0.09, 0.4] },
    vib: [0.18, 12],
    pulse: { every: [8, 16], kind: 'thunder' },
    voice: { type: 'sawtooth', ratios: [1, 1.2, 1.5], lp: 700, atk: 1.1 }, sting: 123.5, travelPeak: 1500,
  },
  // Earth — warm major pad, wind gusts, the odd bird
  earth: {
    root: 110, level: 0.6, lp: 1500,
    partials: [[1, 'sine', 0.2], [1.25, 'sine', 0.1], [1.5, 'sine', 0.12], [2, 'triangle', 0.08], [3, 'sine', 0.04]],
    noise: { type: 'bandpass', f: 520, q: 0.7, gain: 0.2, lfo: [0.11, 0.6] },
    trem: [0.06, 0.25],
    pulse: { every: [5, 11], kind: 'chirp' },
    voice: { type: 'triangle', ratios: [1, 1.25, 1.5, 2, 2.5], lp: 3500, atk: 0.35 }, sting: 261.6, travelPeak: 2600,
  },
  // Mars — minor, dusty, howling
  mars: {
    root: 73.4, level: 0.7, lp: 760,
    partials: [[1, 'triangle', 0.2], [1.5, 'sine', 0.12], [1.2, 'sine', 0.08], [2, 'sine', 0.05]],
    noise: { type: 'bandpass', f: 900, q: 0.9, gain: 0.38, lfo: [0.17, 0.65] },
    pulse: { every: [7, 13], kind: 'gust' },
    voice: { type: 'square', ratios: [1, 1.2, 1.5], lp: 900, atk: 0.5 }, sting: 146.8, travelPeak: 2200,
  },
  // Jupiter — enormous, choral, storm-driven
  jupiter: {
    root: 36.7, level: 0.85, lp: 520,
    partials: [[1, 'sawtooth', 0.15], [2, 'sine', 0.22], [3, 'sine', 0.12], [4, 'sine', 0.08], [1.5, 'triangle', 0.1]],
    noise: { type: 'bandpass', f: 300, q: 0.6, gain: 0.5, lfo: [0.13, 0.5] },
    trem: [0.2, 0.25],
    pulse: { every: [5, 10], kind: 'thunder' },
    voice: { type: 'sawtooth', ratios: [1, 1.5, 2, 3], lp: 900, atk: 1.2 }, sting: 110, travelPeak: 1400,
  },
  // Saturn — shimmering, ethereal ring harmonics
  saturn: {
    root: 98, level: 0.55, lp: 4000,
    partials: [[1, 'sine', 0.12], [1.002, 'sine', 0.1], [2, 'sine', 0.12], [3, 'sine', 0.1], [4, 'sine', 0.09], [5, 'sine', 0.07], [6, 'sine', 0.05]],
    noise: { type: 'highpass', f: 3500, q: 0.5, gain: 0.05 },
    trem: [0.32, 0.3],
    pulse: { every: [5, 9], kind: 'bell' },
    voice: { type: 'sine', ratios: [1, 1.5, 2, 3, 4], lp: 6000, atk: 0.6 }, sting: 392, travelPeak: 3000,
  },
  // Uranus — cold glass
  uranus: {
    root: 146.8, level: 0.45, lp: 5200,
    partials: [[1, 'sine', 0.1], [2.01, 'sine', 0.1], [3.98, 'sine', 0.06], [5.99, 'sine', 0.04]],
    noise: { type: 'highpass', f: 5200, q: 0.6, gain: 0.035 },
    pulse: { every: [3, 6], kind: 'crystal' },
    voice: { type: 'sine', ratios: [1, 2.01, 3.98, 5.99], lp: 8000, atk: 0.02 }, sting: 523, travelPeak: 3800,
  },
  // Neptune — deep ocean, sonar and whale-song
  neptune: {
    root: 43.65, level: 0.85, lp: 420,
    partials: [[1, 'sine', 0.3], [1.498, 'sine', 0.15], [2, 'sine', 0.1]],
    noise: { type: 'lowpass', f: 260, q: 0.5, gain: 0.38, lfo: [0.07, 0.6] },
    vib: [0.05, 10],
    pulse: { every: [7, 12], kind: 'sonar' },
    voice: { type: 'sine', ratios: [1, 1.5, 2, 2.5], lp: 1400, atk: 0.9 }, sting: 196, travelPeak: 1800,
  },
};

const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Scene {
  id: string;
  bus: GainNode;
  nodes: AudioScheduledSourceNode[];
  timers: number[];
}

interface ToneOpts {
  f: number; dur: number; t?: number; type?: OscillatorType; peak?: number; glide?: number;
  atk?: number; lp?: number; wet?: number; dest?: AudioNode; vib?: [number, number];
}

interface NoiseOpts {
  dur: number; type: BiquadFilterType; f0: number; f1?: number; q?: number; peak: number;
  t?: number; atk?: number; wet?: number; dest?: AudioNode;
}

class CosmicAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sceneMaster: GainNode | null = null;
  private sfx: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private active = false;

  private sceneId = 'sky';
  private scene: Scene | null = null;
  private travel: { bus: GainNode; nodes: AudioScheduledSourceNode[] } | null = null;

  /* ------------------------------ plumbing ------------------------------ */

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.0001;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.attack.value = 0.01;
      comp.release.value = 0.3;
      this.master.connect(comp);
      comp.connect(ctx.destination);

      this.sceneMaster = ctx.createGain();
      this.sceneMaster.gain.value = 1;
      this.sceneMaster.connect(this.master);

      this.sfx = ctx.createGain();
      this.sfx.gain.value = 1;
      this.sfx.connect(this.master);

      // soft cathedral-of-space reverb from a generated impulse response
      const len = Math.floor(ctx.sampleRate * 2.6);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.9;
      this.reverb.connect(wet);
      wet.connect(this.master);

      // pink-ish noise, shared by every noise source
      const size = ctx.sampleRate * 3;
      this.noiseBuf = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < size; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099;
        b1 = 0.963 * b1 + w * 0.2965;
        b2 = 0.57 * b2 + w * 1.0526;
        data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** send a node to the dry bus and (optionally) the reverb */
  private route(node: AudioNode, wet = 0.25) {
    if (!this.ctx || !this.sfx) return;
    node.connect(this.sfx);
    if (wet > 0 && this.reverb) {
      const g = this.ctx.createGain();
      g.gain.value = wet;
      node.connect(g);
      g.connect(this.reverb);
    }
  }

  private tone(o: ToneOpts) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t + o.dur);
    if (o.vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = o.vib[0];
      lg.gain.value = o.vib[1];
      l.connect(lg);
      lg.connect(osc.detune);
      l.start(t);
      l.stop(t + o.dur + 0.1);
    }
    const g = ctx.createGain();
    const atk = Math.min(o.atk ?? 0.015, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.peak ?? 0.05, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    let tail: AudioNode = g;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      tail.connect(f);
      tail = f;
    }
    if (o.dest) tail.connect(o.dest);
    else this.route(tail, o.wet ?? 0.25);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(o: NoiseOpts) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t = o.t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.Q.value = o.q ?? 0.8;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const g = ctx.createGain();
    const atk = Math.min(o.atk ?? 0.04, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    if (o.dest) g.connect(o.dest);
    else this.route(g, o.wet ?? 0.15);
    src.start(t, Math.random() * 2);
    src.stop(t + o.dur + 0.05);
  }

  /* ------------------------------ on / off ------------------------------ */

  toggle(): boolean {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return false;
    const now = ctx.currentTime;
    this.active = !this.active;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    if (this.active) {
      this.master.gain.exponentialRampToValueAtTime(0.5, now + 1.6);
      this.crossfadeTo(this.sceneId);
      // a little "sound is on" confirmation
      [1, 1.5, 2].forEach((m, i) =>
        this.tone({ f: RECIPES.solar.sting * m, t: now + 0.05 + i * 0.09, dur: 1.1, peak: 0.05, type: 'triangle', wet: 0.5 }),
      );
    } else {
      this.master.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      const old = this.scene;
      this.scene = null;
      if (old) window.setTimeout(() => this.killScene(old), 1200);
      this.stopTravel(0.2);
    }
    return this.active;
  }

  isActive() {
    return this.active;
  }

  private recipe(id: string): Recipe {
    return RECIPES[id] ?? RECIPES.solar;
  }

  /* --------------------------- ambient scenes --------------------------- */

  /** Choose which place we are in. Safe to call while muted — it is applied once sound is on. */
  setScene(id: string) {
    if (id === this.sceneId && (this.scene || !this.active)) return;
    this.sceneId = id;
    if (this.active) this.crossfadeTo(id);
  }

  /** Quieten (or restore) the ambient bed, e.g. during a launch or inside the observatory. */
  duck(level: number, secs = 0.9) {
    const ctx = this.ctx;
    if (!ctx || !this.sceneMaster) return;
    this.sceneMaster.gain.cancelScheduledValues(ctx.currentTime);
    this.sceneMaster.gain.setTargetAtTime(level, ctx.currentTime, secs / 3);
  }

  private crossfadeTo(id: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sceneMaster) return;
    const now = ctx.currentTime;
    const old = this.scene;
    if (old) {
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(Math.max(0.0001, old.bus.gain.value), now);
      old.bus.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      old.timers.forEach((h) => window.clearTimeout(h));
      window.setTimeout(() => this.killScene(old), 2500);
    }
    this.scene = this.buildScene(id);
  }

  private killScene(s: Scene) {
    s.timers.forEach((h) => window.clearTimeout(h));
    s.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    try { s.bus.disconnect(); } catch { /* noop */ }
  }

  private buildScene(id: string): Scene {
    const ctx = this.ctx!;
    const r = this.recipe(id);
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(r.level, ctx.currentTime + 2.6);
    bus.connect(this.sceneMaster!);
    const nodes: AudioScheduledSourceNode[] = [];
    const scene: Scene = { id, bus, nodes, timers: [] };

    // tonal bed → lowpass → tremolo → bus
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = r.lp;
    lp.Q.value = 0.6;
    const trem = ctx.createGain();
    trem.gain.value = r.trem ? 1 - r.trem[1] / 2 : 1;
    lp.connect(trem);
    trem.connect(bus);
    if (r.trem) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = r.trem[0];
      lg.gain.value = r.trem[1] / 2;
      l.connect(lg);
      lg.connect(trem.gain);
      l.start();
      nodes.push(l);
    }
    let vibGain: GainNode | null = null;
    if (r.vib) {
      const l = ctx.createOscillator();
      vibGain = ctx.createGain();
      l.frequency.value = r.vib[0];
      vibGain.gain.value = r.vib[1];
      l.connect(vibGain);
      l.start();
      nodes.push(l);
    }
    r.partials.forEach(([ratio, type, gain, cents]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = r.root * ratio;
      o.detune.value = cents ?? 0;
      if (vibGain) vibGain.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(lp);
      o.start();
      nodes.push(o);
    });

    // noise bed (wind, roar, ocean, dust…)
    if (r.noise && this.noiseBuf) {
      const n = r.noise;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = n.type;
      f.frequency.value = n.f;
      f.Q.value = n.q;
      const g = ctx.createGain();
      g.gain.value = n.lfo ? n.gain * (1 - n.lfo[1] / 2) : n.gain;
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      if (n.lfo) {
        const l = ctx.createOscillator();
        const lg = ctx.createGain();
        l.frequency.value = n.lfo[0];
        lg.gain.value = n.gain * (n.lfo[1] / 2);
        l.connect(lg);
        lg.connect(g.gain);
        l.start();
        nodes.push(l);
      }
      src.start(0, Math.random() * 2);
      nodes.push(src);
    }

    // occasional signature events
    if (r.pulse) {
      const { every, kind } = r.pulse;
      const loop = () => {
        const h = window.setTimeout(() => {
          if (this.scene !== scene || !this.active) return;
          this.pulse(id === 'neptune' && Math.random() < 0.4 ? 'whale' : kind, r, bus);
          loop();
        }, rand(every[0], every[1]) * 1000);
        scene.timers.push(h);
      };
      loop();
    }
    return scene;
  }

  /** One-shot signature events — also reused for arrival stingers. */
  private pulse(kind: Pulse, r: Recipe, dest?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const d = dest ? { dest } : {};
    const note = () => r.sting * PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.4 ? 2 : 1);
    switch (kind) {
      case 'ping': {
        const f = note() * 2;
        this.tone({ f, glide: f * 0.985, dur: 2.2, peak: 0.03, atk: 0.02, wet: 0.7, ...d });
        break;
      }
      case 'tick': {
        const f = rand(2200, 3600);
        this.tone({ f, dur: 0.28, peak: 0.03, atk: 0.002, wet: 0.35, ...d });
        this.tone({ f: f * 2.76, dur: 0.14, peak: 0.016, atk: 0.002, wet: 0.35, ...d });
        break;
      }
      case 'thunder': {
        this.noise({ dur: 3.4, type: 'lowpass', f0: 220, f1: 55, q: 0.5, peak: 0.28, atk: 0.12, wet: 0.5, ...d });
        this.tone({ f: 48, glide: 30, dur: 2.6, peak: 0.12, atk: 0.1, wet: 0.2, ...d });
        break;
      }
      case 'rumble': {
        this.noise({ dur: 3.8, type: 'lowpass', f0: 120, f1: 160, q: 0.6, peak: 0.24, atk: 1.2, wet: 0.3, ...d });
        this.noise({ dur: 3.2, type: 'bandpass', f0: 300, f1: 1500, q: 0.9, peak: 0.07, atk: 1.6, wet: 0.4, ...d });
        this.tone({ f: 55, glide: 41, dur: 3.4, type: 'sawtooth', peak: 0.05, atk: 1.0, lp: 220, ...d });
        break;
      }
      case 'chirp': {
        const f = rand(2200, 3300);
        this.tone({ f, glide: f * 1.4, dur: 0.12, peak: 0.02, atk: 0.01, wet: 0.35, ...d });
        this.tone({ f: f * 1.1, glide: f * 1.55, dur: 0.11, peak: 0.018, atk: 0.01, t: t + 0.17, wet: 0.35, ...d });
        break;
      }
      case 'gust': {
        this.noise({ dur: 3.4, type: 'bandpass', f0: 400, f1: 1200, q: 1.1, peak: 0.17, atk: 1.2, wet: 0.35, ...d });
        break;
      }
      case 'bell': {
        const f = note();
        [1, 2, 3.01].forEach((m, i) =>
          this.tone({ f: f * m, dur: 3.2 / (1 + i * 0.7), peak: 0.04 / (1 + i * 1.1), atk: 0.008, wet: 0.75, ...d }),
        );
        break;
      }
      case 'crystal': {
        [0, 1, 2].forEach((i) => {
          const f = 2093 * PENTA[Math.floor(Math.random() * PENTA.length)];
          this.tone({ f, dur: 0.9, peak: 0.02, atk: 0.004, t: t + i * 0.09, wet: 0.7, ...d });
        });
        break;
      }
      case 'sonar': {
        this.tone({ f: 660, dur: 2.2, peak: 0.055, atk: 0.01, wet: 0.85, ...d });
        this.tone({ f: 660, dur: 1.6, peak: 0.02, atk: 0.01, t: t + 0.6, wet: 0.85, ...d });
        break;
      }
      case 'whale': {
        const f = rand(150, 210);
        this.tone({ f, glide: f * 1.6, dur: 4.2, peak: 0.055, atk: 1.2, lp: 700, vib: [5.5, 14], wet: 0.7, ...d });
        break;
      }
    }
  }

  /** The planet's own voice: a short chord used for selection blips and (longer) arrival stingers. */
  private stinger(id: string, long: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const r = this.recipe(id);
    const t = ctx.currentTime;
    r.voice.ratios.forEach((ratio, i) => {
      this.tone({
        f: r.sting * ratio,
        t: t + i * (long ? 0.14 : 0.06),
        dur: long ? 3.4 : 0.85,
        type: r.voice.type,
        peak: (long ? 0.075 : 0.05) / (1 + i * 0.4),
        atk: long ? r.voice.atk : Math.min(r.voice.atk, 0.06),
        lp: r.voice.lp,
        wet: long ? 0.6 : 0.4,
      });
    });
  }

  /* ----------------------------- one-shot cues ----------------------------- */

  /** Click on a planet / chip in the orrery — every planet answers in its own voice. */
  planetSelect(id: string) {
    if (!this.active || !this.ensureContext()) return;
    this.stinger(id, false);
  }

  /** The sweeping launch when you travel to a planet. */
  travelStart(id: string, seconds: number) {
    if (!this.active) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfx || !this.noiseBuf) return;
    this.stopTravel(0.15);
    const r = this.recipe(id);
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    this.route(bus, 0.3);
    const nodes: AudioScheduledSourceNode[] = [];
    const end = t + seconds;
    const env = (g: GainNode, peak: number) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + Math.min(1.2, seconds * 0.25));
      g.gain.setValueAtTime(peak, end - seconds * 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    };

    // engine noise: rises to the planet's brightest point, then brakes
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(160, t);
    bp.frequency.exponentialRampToValueAtTime(r.travelPeak, t + seconds * 0.5);
    bp.frequency.exponentialRampToValueAtTime(300, end);
    const ng = ctx.createGain();
    env(ng, 0.2);
    src.connect(bp); bp.connect(ng); ng.connect(bus);
    src.start(t, Math.random() * 2);
    src.stop(end + 0.2);
    nodes.push(src);

    // rising engine tone, in the planet's key
    const o = ctx.createOscillator();
    o.type = id === 'sun' || id === 'jupiter' || id === 'venus' ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(r.root * 2, t);
    o.frequency.exponentialRampToValueAtTime(r.root * 10, t + seconds * 0.55);
    o.frequency.exponentialRampToValueAtTime(r.root * 3, end);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(3500, t + seconds * 0.55);
    lp.frequency.exponentialRampToValueAtTime(600, end);
    const og = ctx.createGain();
    env(og, 0.06);
    o.connect(lp); lp.connect(og); og.connect(bus);
    o.start(t); o.stop(end + 0.2);
    nodes.push(o);

    // sub thump at launch
    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(70, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 1.2);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    sub.connect(sg); sg.connect(bus);
    sub.start(t); sub.stop(t + 1.5);
    nodes.push(sub);

    // retro-brake sweep just before arrival
    this.tone({ f: 640, glide: 90, t: Math.max(t, end - 1.1), dur: 1.05, peak: 0.05, atk: 0.2, dest: bus });

    this.travel = { bus, nodes };
    this.duck(0.22, 0.6);
  }

  /** Cut the launch sound off (used when the player skips the journey). */
  stopTravel(fade = 0.25) {
    const tr = this.travel;
    this.travel = null;
    const ctx = this.ctx;
    if (!tr || !ctx) return;
    const now = ctx.currentTime;
    tr.bus.gain.cancelScheduledValues(now);
    tr.bus.gain.setValueAtTime(tr.bus.gain.value, now);
    tr.bus.gain.linearRampToValueAtTime(0, now + fade);
    window.setTimeout(() => tr.nodes.forEach((n) => { try { n.stop(); } catch { /* noop */ } }), fade * 1000 + 60);
  }

  /** Skipping the travel cinematic. */
  skipWhoosh() {
    if (!this.active || !this.ensureContext()) return;
    this.stopTravel(0.2);
    this.noise({ dur: 0.5, type: 'highpass', f0: 500, f1: 7000, q: 0.7, peak: 0.13, atk: 0.06, wet: 0.35 });
    this.tone({ f: 260, glide: 1900, dur: 0.38, type: 'triangle', peak: 0.04, atk: 0.04, wet: 0.35 });
  }

  /** Landing on a world: restore the ambience and play the planet's arrival stinger. */
  arrive(id: string) {
    if (!this.active || !this.ensureContext()) return;
    this.duck(1, 1.4);
    this.stinger(id, true);
    const r = this.recipe(id);
    if (r.pulse) this.pulse(r.pulse.kind, r);
  }

  /** "Take me to the observatory" servo sweep. */
  flyToStation() {
    if (!this.active || !this.ensureContext()) return;
    this.tone({ f: 200, glide: 760, dur: 1.7, type: 'triangle', peak: 0.045, atk: 0.3, lp: 2200, wet: 0.4 });
    this.noise({ dur: 1.8, type: 'bandpass', f0: 250, f1: 1400, q: 1, peak: 0.05, atk: 0.5, wet: 0.3 });
    const t = this.ctx!.currentTime;
    [0, 0.2, 0.4].forEach((d) => this.tone({ f: 1250, t: t + d, dur: 0.12, peak: 0.028, atk: 0.005, wet: 0.3 }));
  }

  /** You are standing at the station's door. */
  discover() {
    if (!this.active || !this.ensureContext()) return;
    this.noise({ dur: 0.4, type: 'highpass', f0: 3000, q: 0.6, peak: 0.05, wet: 0.2 });
    this.tone({ f: 784, dur: 1.5, peak: 0.05, atk: 0.01, wet: 0.65, type: 'triangle' });
    this.tone({ f: 1175, dur: 1.5, peak: 0.04, atk: 0.01, t: this.ctx!.currentTime + 0.15, wet: 0.65, type: 'triangle' });
  }

  /** Door opens, lights come on, data streams in. */
  observatoryOpen(id: string) {
    if (!this.active || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    const r = this.recipe(id);
    this.duck(0.4, 0.8);
    this.noise({ dur: 1.0, type: 'bandpass', f0: 280, f1: 1300, q: 1.2, peak: 0.08, atk: 0.2, wet: 0.3 });
    this.tone({ f: 80, glide: 48, dur: 0.7, peak: 0.1, atk: 0.04, wet: 0.2 });
    [1, 1.5, 2].forEach((m, i) =>
      this.tone({ f: r.sting * m * 2, t: t + 0.35 + i * 0.1, dur: 2.6, peak: 0.04 / (1 + i * 0.3), atk: 0.05, type: 'triangle', lp: 4000, wet: 0.7 }),
    );
    for (let i = 0; i < 6; i++) {
      this.tone({ f: rand(1800, 3200), t: t + 0.6 + i * rand(0.09, 0.16), dur: 0.07, peak: 0.012, atk: 0.003, wet: 0.2 });
    }
  }

  observatoryClose() {
    if (!this.active || !this.ensureContext()) return;
    this.duck(1, 1.0);
    this.tone({ f: 820, glide: 190, dur: 0.55, type: 'triangle', peak: 0.04, atk: 0.02, wet: 0.4 });
    this.noise({ dur: 0.6, type: 'highpass', f0: 6000, f1: 600, q: 0.7, peak: 0.07, atk: 0.05, wet: 0.3 });
  }

  /** Leaving a world, returning to the orrery. */
  leaveWorld() {
    if (!this.active || !this.ensureContext()) return;
    this.stopTravel(0.2);
    this.duck(1, 0.8);
    this.playWarpSwell(false);
  }

  uiClick() {
    if (!this.active || !this.ensureContext()) return;
    this.tone({ f: 1900, glide: 1200, dur: 0.06, peak: 0.045, atk: 0.003, type: 'triangle', wet: 0.15 });
  }

  chatOpen() {
    if (!this.active || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    this.tone({ f: 660, dur: 0.35, peak: 0.035, t, wet: 0.5 });
    this.tone({ f: 990, dur: 0.45, peak: 0.03, t: t + 0.09, wet: 0.5 });
  }

  chatClose() {
    if (!this.active || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    this.tone({ f: 990, dur: 0.25, peak: 0.03, t, wet: 0.4 });
    this.tone({ f: 660, dur: 0.35, peak: 0.03, t: t + 0.08, wet: 0.4 });
  }

  chatSend() {
    if (!this.active || !this.ensureContext()) return;
    this.tone({ f: 1100, glide: 1750, dur: 0.1, peak: 0.035, atk: 0.005, type: 'triangle', wet: 0.2 });
  }

  chatReceive() {
    if (!this.active || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    this.tone({ f: 880, dur: 0.4, peak: 0.03, t, wet: 0.55, type: 'triangle' });
    this.tone({ f: 1318, dur: 0.5, peak: 0.025, t: t + 0.07, wet: 0.55, type: 'triangle' });
  }

  quickOpen() {
    if (!this.active || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    this.noise({ dur: 0.6, type: 'bandpass', f0: 400, f1: 3200, q: 0.9, peak: 0.06, atk: 0.1, wet: 0.4 });
    [1, 1.25, 1.5, 2].forEach((m, i) =>
      this.tone({ f: 330 * m, t: t + 0.1 + i * 0.07, dur: 1.4, peak: 0.035, type: 'triangle', wet: 0.6 }),
    );
  }

  quickClose() {
    if (!this.active || !this.ensureContext()) return;
    this.noise({ dur: 0.5, type: 'bandpass', f0: 3000, f1: 400, q: 0.9, peak: 0.05, atk: 0.05, wet: 0.35 });
    this.tone({ f: 660, glide: 220, dur: 0.5, type: 'triangle', peak: 0.03, wet: 0.4 });
  }

  /* --------------------------- original signature cues --------------------------- */

  /** Airy shimmer as a meteor streaks past. */
  playMeteorShimmer() {
    if (!this.active) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850 + Math.random() * 700, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 1.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.11, now + 0.045);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 2.2;
    osc.connect(g);
    g.connect(filter);
    this.route(filter, 0.3);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  /** Warm major-9 bloom when the constellation unfolds into the galaxy (plays even while muted). */
  playConstellationBloom() {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (!this.active) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.0001, now);
      this.master.gain.exponentialRampToValueAtTime(0.22, now + 0.4);
      this.master.gain.exponentialRampToValueAtTime(0.0001, now + 4.6);
    }
    [196, 293.66, 392, 587.33, 784].forEach((f, i) => {
      this.tone({
        f, t: now + i * 0.11, dur: 4.2, type: i > 2 ? 'sine' : 'triangle',
        peak: 0.075 / (1 + i * 0.45), atk: 0.55, wet: 0.5,
      });
    });
  }

  /** Soft warm swell when engaging/disengaging the orrery. */
  playWarpSwell(rising = true) {
    const ctx = this.ensureContext();
    if (!ctx || !this.active) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(rising ? 70 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(rising ? 420 : 70, now + 1.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(rising ? 260 : 1800, now);
    filter.frequency.exponentialRampToValueAtTime(rising ? 2600 : 220, now + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.085, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
    osc.connect(filter);
    filter.connect(g);
    this.route(g, 0.3);
    osc.start(now);
    osc.stop(now + 2.2);
  }
}

export const cosmicAudio = new CosmicAudioEngine();
