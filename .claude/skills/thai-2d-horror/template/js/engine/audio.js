// Procedural Web Audio engine: ambience layers, synthesized one-shots, spatialized by room/x,
// and voice playback (ElevenLabs mp3s in assets/voice/) through diegetic FX chains.
import { G, clamp, rand } from '../game/ctx.js';

let ac;
const VOICE_DIR = 'assets/voice/';

function makeNoise(kind, sec = 3) {
  const len = ac.sampleRate * sec, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  let l = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
    else if (kind === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2; }
    else d[i] = w;
  }
  return b;
}

function makeImpulse(sec, decay, damp = 1) {
  const len = (ac.sampleRate * sec) | 0, b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lp += (w - lp) * damp; d[i] = lp * Math.pow(1 - i / len, decay); }
  }
  return b;
}

function shaper(amount) {
  const s = ac.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
  s.curve = c; return s;
}

const filt = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const gain = (v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };

export const Audio = {
  ready: false,
  cache: new Map(),
  layers: {},
  ambTarget: {},
  nextTick: 0,
  nextHeart: 0,

  init() {
    if (this.ready) return;
    ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.ac = ac;
    this.master = gain(G.settings.master);
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    chain(this.master, comp, ac.destination);
    this.bus = { amb: gain(0.9), sfx: gain(G.settings.sfx), voice: gain(G.settings.voice) };
    Object.values(this.bus).forEach((b) => b.connect(this.master));
    this.noise = { white: makeNoise('white'), pink: makeNoise('pink'), brown: makeNoise('brown') };
    this.rv = {};
    for (const [k, sec, dec, damp] of [['small', 1.1, 3, 0.5], ['hall', 2.8, 2.2, 0.35], ['out', 3.4, 2.6, 0.2], ['huge', 5, 1.6, 0.3]]) {
      const c = ac.createConvolver(); c.buffer = makeImpulse(sec, dec, damp);
      const g = gain(0.55); chain(c, g, this.master); this.rv[k] = c;
    }
    this.buildAmbience();
    this.ready = true;
  },

  resume() { if (ac && ac.state !== 'running') ac.resume(); },
  suspend() { if (ac && ac.state === 'running') ac.suspend(); },
  applyVolumes() {
    if (!this.ready) return;
    this.master.gain.value = G.settings.master; this.bus.sfx.gain.value = G.settings.sfx; this.bus.voice.gain.value = G.settings.voice;
  },
  revIn() { return this.rv[(G.room && G.room.reverb) || 'small']; },

  // ── ambience ────────────────────────────────────────────────────
  loop(buf) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; },
  lfo(f, depth, target) { const o = ac.createOscillator(); o.frequency.value = f; const g = gain(depth); chain(o, g, target); o.start(); return o; },
  buildAmbience() {
    const L = this.layers, out = (name) => { const g = gain(0); g.connect(this.bus.amb); L[name] = g; return g; };
    chain(this.loop(this.noise.pink), filt('highpass', 400), filt('lowpass', 7000), out('rainOut'));
    const crackle = gain(0.5); chain(this.loop(this.noise.white), filt('bandpass', 5200, 0.6), crackle, L.rainOut);
    chain(this.loop(this.noise.brown), filt('lowpass', 900), out('rainIn'));
    chain(this.loop(this.noise.pink), filt('highpass', 1800), filt('lowpass', 3500), gain(0.25), L.rainIn);
    // insects: two AM'd high sines gated by a slow LFO
    const ins = out('insects');
    for (const [f, am] of [[4300, 27], [4720, 31]]) {
      const o = ac.createOscillator(); o.frequency.value = f; const a = gain(0.5); chain(o, a, ins); o.start();
      this.lfo(am, 0.5, a.gain);
    }
    const ww = filt('bandpass', 500, 0.8); chain(this.loop(this.noise.pink), ww, out('wind')); this.lfo(0.07, 260, ww.frequency);
    const fa = gain(0.6); chain(this.loop(this.noise.brown), filt('lowpass', 260), fa, out('fan')); this.lfo(3.4, 0.5, fa.gain);
    const bz = ac.createOscillator(); bz.type = 'sawtooth'; bz.frequency.value = 100; chain(bz, filt('bandpass', 200, 6), gain(0.25), out('buzz')); bz.start();
    const dl = filt('lowpass', 190, 2); const dg = out('drone');
    for (const f of [41.2, 41.7, 61.8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; chain(o, gain(0.3), dl); o.start(); }
    dl.connect(dg); this.lfo(0.09, 90, dl.frequency);
    const wf = filt('lowpass', 600); chain(this.loop(this.noise.brown), wf, out('water')); this.lfo(0.21, 300, wf.frequency);
    const eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 36; chain(eng, filt('lowpass', 160), gain(0.5), out('car')); eng.start();
    chain(this.loop(this.noise.brown), filt('lowpass', 220), gain(0.8), L.car);
    this.lfo(0.3, 3, eng.frequency);
  },
  setAmbience(map, sec = 1.2) {
    this.ambTarget = map;
    if (!this.ready) return;
    const now = ac.currentTime;
    for (const k in this.layers) this.layers[k].gain.setTargetAtTime((map[k] || 0) * (k === 'drone' ? 0.5 : 1), now, sec / 3);
    this.tickOn = !!map.tick;
  },
  duck(level, sec = 0.3) { if (this.ready) this.bus.amb.gain.setTargetAtTime(level, ac.currentTime, sec); },

  update() {
    if (!this.ready || G.paused) return;
    const now = ac.currentTime, ten = G.fx.tension;
    const base = (this.ambTarget.drone || 0) * 0.5;
    this.layers.drone.gain.setTargetAtTime(base + ten * 0.35, now, 0.5);
    if (this.tickOn && now > this.nextTick) { this.play('tick', { gain: 0.5 }); this.nextTick = now + 1; }
    if (ten > 0.55 && now > this.nextHeart) { this.play('heart', { gain: 0.5 + ten * 0.5, rv: 0 }); this.nextHeart = now + 1.05 - ten * 0.45; }
  },

  // ── one-shots ───────────────────────────────────────────────────
  out({ pan = 0, gain: gv = 1, lp = null, rv = 0.25, bus = 'sfx' } = {}) {
    const g = gain(gv); let n = g;
    if (lp) { const f = filt('lowpass', lp); n.connect(f); n = f; }
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
    n.connect(this.bus[bus]);
    if (rv > 0) { const s = gain(rv); n.connect(s); s.connect(this.revIn()); }
    return g;
  },
  osc(type, f, t, dur, dst, { f2, a = 0.004, g = 1 } = {}) {
    const o = ac.createOscillator(), e = gain(0); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(o, e, dst); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  noi(kind, t, dur, dst, { type = 'bandpass', f = 1000, q = 1, f2, g = 1, a = 0.003 } = {}) {
    const s = ac.createBufferSource(); s.buffer = this.noise[kind];
    const fl = filt(type, f, q); if (f2) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur); }
    const e = gain(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(s, fl, e, dst); s.start(t, Math.random() * 2); s.stop(t + dur + 0.05); return e;
  },

  play(name, o = {}) {
    if (!this.ready) return;
    const fn = SFX[name]; if (!fn) return;
    const scare = ['stinger', 'slam', 'howl', 'glass', 'brake'].includes(name) && G.settings.reduceScares;
    const dst = this.out({ ...o, gain: (o.gain ?? 1) * (scare ? 0.4 : 1) });
    fn.call(this, ac.currentTime + (o.delay || 0), dst, o);
  },
  // Play at a world position in some room: pan/attenuate/muffle relative to the player.
  at(name, room, x, o = {}) { this.play(name, { ...this.spatial(room, x), ...o, gain: (o.gain ?? 1) * this.spatial(room, x).gain }); },
  spatial(room, x) {
    const S = G.S, P = G.player;
    if (!S || !P || room === S.room) { const dx = (x ?? P?.x ?? 0) - (P?.x ?? 0); return { pan: dx / 450, gain: 1 / (1 + (Math.abs(dx) / 600) ** 2) }; }
    const door = G.world && G.world.doorTo(S.room, room);
    if (door != null) { const dx = door - P.x; return { pan: dx / 450, gain: 0.45 / (1 + (Math.abs(dx) / 700) ** 2), lp: 650 }; }
    return { pan: 0, gain: 0.1, lp: 380 };
  },

  // ── voice ───────────────────────────────────────────────────────
  load(id) {
    if (this.cache.has(id)) return Promise.resolve(this.cache.get(id));
    const p = fetch(VOICE_DIR + id + '.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .catch(() => null)
      .then((buf) => { this.cache.set(id, buf); return buf; });
    this.cache.set(id, p);
    return p;
  },
  // Only lines listed in assets/voice/manifest.json (written by tools/generate-voices.mjs) are fetched.
  async preload(ids) {
    let have = [];
    try { const r = await fetch(VOICE_DIR + 'manifest.json', { cache: 'no-cache' }); if (r.ok) have = await r.json(); } catch (_) { /* no voices yet */ }
    const avail = new Set(have);
    for (const id of ids) if (!avail.has(id)) this.cache.set(id, null);
    const q = ids.filter((id) => avail.has(id)); let found = 0;
    const worker = async () => { while (q.length) { if (await this.load(q.shift())) found++; } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return found;
  },
  async voice(id, fx) {
    if (!this.ready) return null;
    let buf = this.cache.get(id);
    if (buf instanceof Promise || buf === undefined) buf = await Promise.race([this.load(id), new Promise((r) => setTimeout(() => r(null), 1200))]);
    if (!buf) return null;
    return this.playBuffer(buf, fx);
  },
  playBuffer(buf, fx) {
    const t = ac.currentTime + 0.02, srcs = [];
    const src = (rate = 1, delay = 0) => { const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.start(t + delay); srcs.push(s); return s; };
    const o = (opts) => this.out({ bus: 'voice', ...opts });
    let extra = 0;
    switch (fx) {
      case 'tape': {
        const s = src(); this.lfo(0.55, 0.006, s.playbackRate);
        chain(s, filt('highpass', 260), filt('lowpass', 3300), shaper(3), o({ rv: 0.06, gain: 0.95 }));
        this.hiss(t, buf.duration + 0.4, 0.035); break;
      }
      case 'radio': {
        chain(src(), filt('bandpass', 1500, 0.9), shaper(25), gain(0.5), o({ rv: 0.05 }));
        this.play('static', { gain: 0.35, dur: 0.5 }); this.hiss(t, buf.duration, 0.05, 2400); break;
      }
      case 'pa': {
        const d = ac.createDelay(1); d.delayTime.value = 0.27; const fb = gain(0.32); d.connect(fb); fb.connect(d);
        const head = chain(src(), filt('highpass', 420), filt('lowpass', 3000), shaper(18), gain(0.55));
        head.connect(o({ rv: 0.9 })); chain(head, d, gain(0.5), o({ rv: 0.6, pan: -0.3 }));
        this.play('pop', { gain: 0.6 }); this.hiss(t, buf.duration + 0.6, 0.02, 3000); extra = 0.6; break;
      }
      case 'ghost': chain(src(0.97), filt('lowpass', 2600), o({ rv: 1.1, gain: 0.85 })); break;
      case 'nameless': {
        [[1, 0, 0, 1], [0.84, 0.035, -0.7, 0.55], [1.17, 0.06, 0.7, 0.45]].forEach(([r, dl, p, g]) =>
          chain(src(r, dl), filt('lowpass', 4200), o({ rv: 0.9, pan: p, gain: g })));
        extra = 0.3; break;
      }
      case 'muffled': chain(src(), filt('lowpass', 650), o({ rv: 0.15, gain: 0.9 })); break;
      case 'whisper': chain(src(), filt('highpass', 280), o({ rv: 0.03, pan: Math.random() < 0.5 ? -0.85 : 0.85, gain: 1.2 })); break;
      case 'echo': chain(src(), o({ rv: 0.75 })); break;
      default: chain(src(), o({ rv: 0.15 }));
    }
    return { dur: buf.duration / (fx === 'ghost' ? 0.97 : 1) + extra, stop: () => srcs.forEach((s) => { try { s.stop(); } catch (_) { /* already stopped */ } }) };
  },
  // Texture played when a line has no recorded voice yet, so the diegetic source is still audible.
  voiceTexture(fx, dur) {
    if (!this.ready) return;
    const t = ac.currentTime;
    if (fx === 'tape') this.hiss(t, dur, 0.04);
    else if (fx === 'radio') { this.play('static', { gain: 0.4, dur: 0.6 }); this.hiss(t, dur, 0.04, 2400); }
    else if (fx === 'pa') { this.play('pop', { gain: 0.6 }); this.hiss(t, dur, 0.03, 3000); }
    else if (fx === 'nameless' || fx === 'ghost' || fx === 'whisper') this.play('whisper', { gain: 0.5, dur, pan: fx === 'whisper' ? 0.8 : 0 });
  },
  hiss(t, dur, g, f = 6000) {
    const s = ac.createBufferSource(); s.buffer = this.noise.white;
    const e = gain(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.1); e.gain.setValueAtTime(g, t + dur); e.gain.linearRampToValueAtTime(0, t + dur + 0.2);
    chain(s, filt('highpass', f), e, this.bus.voice); s.start(t); s.stop(t + dur + 0.3);
  },
};

// Synth definitions. `this` = Audio, t = start time, d = destination node, o = options.
const SFX = {
  step_wood(t, d) { this.noi('brown', t, 0.13, d, { type: 'lowpass', f: 520, g: 1.1 }); this.osc('sine', 72, t, 0.09, d, { f2: 40, g: 0.5 }); if (Math.random() < 0.15) this.osc('sawtooth', 160, t + 0.03, 0.2, d, { f2: 120, g: 0.04 }); },
  step_tile(t, d) { this.noi('white', t, 0.06, d, { f: 1900, q: 1.2, g: 0.4 }); this.osc('sine', 130, t, 0.05, d, { f2: 60, g: 0.35 }); },
  step_road(t, d) { this.noi('white', t, 0.12, d, { f: 2600, q: 0.6, g: 0.45 }); this.noi('brown', t, 0.08, d, { type: 'lowpass', f: 300, g: 0.6 }); },
  step_water(t, d) { this.noi('white', t, 0.3, d, { type: 'lowpass', f: 1800, f2: 500, g: 0.6, a: 0.03 }); },
  heel(t, d) { this.noi('white', t, 0.035, d, { f: 3300, q: 1.6, g: 1 }); this.osc('triangle', 230, t, 0.08, d, { f2: 105, g: 0.7 }); },
  knock(t, d) { this.osc('sine', 96, t, 0.2, d, { f2: 62, g: 1.2 }); this.noi('brown', t, 0.12, d, { type: 'lowpass', f: 500, g: 0.9 }); },
  bell(t, d) {
    for (const s of [0, 0.38]) for (const [f, g, dec] of [[2380, 0.5, 1.2], [3150, 0.25, 0.8], [4770, 0.16, 0.55], [6210, 0.09, 0.35]])
      this.osc('sine', f, t + s, dec, d, { g, a: 0.002 });
  },
  static(t, d, o) {
    const dur = o.dur || 0.7; const e = this.noi('white', t, dur, d, { f: 2300, q: 0.5, g: 0.6 });
    for (let k = t; k < t + dur; k += 0.04) e.gain.setValueAtTime(Math.random() * 0.6, k);
  },
  chalk(t, d, o) {
    const dur = o.dur || 2; const e = this.noi('white', t, dur, d, { f: 3500, q: 4, g: 0.5, a: 0.05 });
    for (let k = t; k < t + dur - 0.05; k += 0.03) e.gain.setValueAtTime(0.15 + Math.random() * 0.5, k);
  },
  creak(t, d) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, t);
    o.frequency.linearRampToValueAtTime(rand(110, 140), t + 0.35); o.frequency.linearRampToValueAtTime(rand(70, 95), t + 0.9);
    const e = gain(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.25, t + 0.1); e.gain.exponentialRampToValueAtTime(0.001, t + 1);
    chain(o, filt('bandpass', 720, 9), e, d); o.start(t); o.stop(t + 1.05);
  },
  door_open(t, d) { SFX.creak.call(this, t, d); this.osc('sine', 80, t + 0.8, 0.2, d, { f2: 45, g: 0.6 }); },
  door_close(t, d) { this.osc('sine', 72, t, 0.25, d, { f2: 40, g: 1.2 }); this.noi('brown', t, 0.18, d, { type: 'lowpass', f: 420, g: 1 }); },
  slam(t, d) { this.noi('brown', t, 1.4, d, { type: 'lowpass', f: 1000, f2: 140, g: 1.6 }); this.osc('sine', 52, t, 1, d, { f2: 30, g: 1.2 }); this.osc('square', 180, t, 0.3, d, { f2: 90, g: 0.15 }); },
  water(t, d, o) { this.noi('brown', t, o.dur || 3, d, { type: 'lowpass', f: 300, f2: 1400, g: 1.4, a: 0.6 }); },
  stinger(t, d) {
    for (const f of [55, 58.3, 77.8, 110.4, 116.6]) this.osc('sawtooth', f, t, 1.8, d, { g: 0.16, a: 0.06 });
    this.osc('sine', 1900, t, 1.4, d, { f2: 2600, g: 0.12, a: 0.03 });
    this.noi('white', t, 0.5, d, { f: 900, q: 0.5, g: 0.5 });
  },
  school_bell(t, d, o) {
    const dur = o.dur || 2.2, osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = 880;
    const am = gain(0.5), e = gain(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.12, t + 0.02); e.gain.setValueAtTime(0.12, t + dur); e.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    const l = ac.createOscillator(); l.frequency.value = 24; chain(l, gain(0.5), am.gain);
    chain(osc, am, filt('bandpass', 1500, 1.5), e, d); osc.start(t); l.start(t); osc.stop(t + dur + 0.2); l.stop(t + dur + 0.2);
  },
  tape_click(t, d) { this.noi('white', t, 0.025, d, { type: 'highpass', f: 2000, g: 0.7 }); this.osc('square', 420, t, 0.015, d, { g: 0.2 }); },
  howl(t, d) { this.osc('sine', 1100, t, 2.2, d, { f2: 2700, g: 0.28, a: 1.4 }); },
  heart(t, d) { const l = filt('lowpass', 140); l.connect(d); this.osc('sine', 58, t, 0.14, l, { f2: 38, g: 1.4 }); this.osc('sine', 54, t + 0.19, 0.12, l, { f2: 36, g: 0.9 }); },
  pop(t, d) { this.osc('sine', 92, t, 0.07, d, { f2: 48, g: 0.9 }); this.noi('white', t, 0.015, d, { type: 'highpass', f: 1500, g: 0.5 }); },
  thunder(t, d) { this.noi('brown', t, 3.4, d, { type: 'lowpass', f: 200, g: 1.6, a: 0.12 }); },
  brake(t, d) { this.noi('white', t, 1.3, d, { f: 3200, f2: 1700, q: 3, g: 0.6 }); this.osc('sawtooth', 920, t, 1.1, d, { f2: 680, g: 0.06 }); },
  glass(t, d) { this.noi('white', t, 0.5, d, { type: 'highpass', f: 3000, g: 0.8 }); for (let i = 0; i < 6; i++) this.osc('sine', rand(3000, 6500), t + rand(0, 0.3), 0.4, d, { g: 0.12 }); },
  switch(t, d) { this.noi('white', t, 0.02, d, { type: 'highpass', f: 1500, g: 0.8 }); this.osc('square', 120, t, 0.04, d, { g: 0.3 }); },
  paper(t, d) { const e = this.noi('white', t, 0.3, d, { f: 4200, q: 0.8, g: 0.5 }); for (let k = t; k < t + 0.28; k += 0.025) e.gain.setValueAtTime(Math.random() * 0.5, k); },
  keys(t, d) { for (let i = 0; i < 5; i++) this.osc('sine', rand(3000, 5600), t + i * 0.05 + rand(0, 0.03), 0.12, d, { g: 0.15 }); },
  pickup(t, d) { SFX.paper.call(this, t, d); this.osc('sine', 660, t + 0.05, 0.4, d, { g: 0.05 }); this.osc('sine', 990, t + 0.1, 0.5, d, { g: 0.03 }); },
  tick(t, d) { this.noi('white', t, 0.012, d, { type: 'highpass', f: 4200, g: 0.3 }); },
  whisper(t, d, o) {
    const dur = o.dur || 1.4; const e = this.noi('white', t, dur, d, { f: 2600, q: 2.2, g: 0.35, a: 0.15 });
    for (let k = t + 0.1; k < t + dur; k += 0.09) e.gain.setValueAtTime(0.1 + Math.random() * 0.35, k);
  },
  breath(t, d) { this.noi('pink', t, 0.9, d, { f: 900, q: 0.7, g: 0.5, a: 0.35 }); },
  gasp(t, d) { this.noi('pink', t, 0.45, d, { f: 1400, q: 0.9, g: 0.9, a: 0.05 }); },
  drip(t, d) { this.osc('sine', 1500, t, 0.06, d, { f2: 600, g: 0.25 }); },
  rumble(t, d) { this.osc('sine', 32, t, 2.4, d, { g: 1, a: 0.5 }); this.noi('brown', t, 2.4, d, { type: 'lowpass', f: 120, g: 0.8, a: 0.5 }); },
  thump(t, d) { this.osc('sine', 60, t, 0.35, d, { f2: 35, g: 1.4 }); this.noi('brown', t, 0.25, d, { type: 'lowpass', f: 300, g: 1 }); },
  lock_fail(t, d) { this.osc('square', 140, t, 0.08, d, { g: 0.2 }); this.osc('square', 110, t + 0.1, 0.1, d, { g: 0.2 }); },
  lock_ok(t, d) { this.noi('white', t, 0.03, d, { type: 'highpass', f: 2500, g: 0.6 }); this.osc('sine', 300, t + 0.05, 0.1, d, { f2: 150, g: 0.5 }); },
  ui(t, d) { this.osc('sine', 520, t, 0.08, d, { g: 0.08 }); },
};
