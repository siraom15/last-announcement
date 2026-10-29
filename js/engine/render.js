// Frame composition: painted backdrop -> characters -> darkness/light pass -> colour grade -> grain/vignette.
import { G, W, H, FLOOR, clamp } from '../game/ctx.js';
import { drawChar } from './chars.js';
import { waterLayer, kidsInRoom, World } from '../game/world.js';
import { Sprites } from './sprites.js';
import * as P from './paint.js';

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const ACTOR_TYPE = { daow: 'girl', daow_fake: 'girl', nameless: 'nameless', kid: 'kid', teacher_npc: 'teacher', ratree: 'ratree', pakin_npc: 'man' };

export const Renderer = {
  overrides: new Set(),

  init(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.lc = document.createElement('canvas'); this.lc.width = W / 2; this.lc.height = H / 2; this.lx = this.lc.getContext('2d');
    const v = document.createElement('canvas'); v.width = W; v.height = H; const vx = v.getContext('2d');
    const g = vx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); vx.fillStyle = g; vx.fillRect(0, 0, W, H); this.vign = v;
    this.drops = Array.from({ length: 170 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.8 }));
    // optional painted backgrounds: assets/bg/manifest.json lists file names, e.g. ["road_1.jpg", "road_2.jpg", "p3.jpg"]
    fetch('assets/bg/manifest.json').then((r) => (r.ok ? r.json() : [])).then((files) => {
      files.forEach((f) => this.overrides.add(f));
      if (G.room) { this.bgKey = null; this.buildBackdrop(G.room); } // the first room was built before the list arrived
    }).catch(() => {});
    Sprites.init();
  },

  // A room's art is either one wide file <name>.jpg/png/webp, or 960-unit panels <name>_1.jpg, <name>_2.jpg … left→right.
  artFiles(room) {
    const name = room.variant ? `${room.id}_${room.variant}` : room.id, have = (f) => this.overrides.has(f), ext = ['jpg', 'png', 'webp'];
    const one = ext.map((e) => `${name}.${e}`).find(have);
    if (one) return [{ f: one, x: 0, w: room.w }];
    const out = [];
    for (let n = 1; n <= Math.ceil(room.w / W); n++) { const f = ext.map((e) => `${name}_${n}.${e}`).find(have); if (f) out.push({ f, x: (n - 1) * W, w: W }); }
    return out;
  },
  images: new Map(),
  image(f) {
    if (!this.images.has(f)) { const img = new Image(); img.decoding = 'async'; img.src = `assets/bg/${f}`; this.images.set(f, img); }
    return this.images.get(f);
  },
  // warm the cache for rooms one door away so transitions don't pop
  preloadNear(room) {
    for (const e of World.exits(room.id)) { const r = World.get(e.to); if (r) this.artFiles(r).forEach((p) => this.image(p.f)); }
  },

  buildBackdrop(room) {
    const key = room.id + (room.variant || '') + G.S.part + this.overrides.size;
    if (this.bgKey === key) return;
    const c = document.createElement('canvas'); c.width = room.w; c.height = H;
    const x = c.getContext('2d'), art = this.artFiles(room);
    room.painted = art.length > 0;
    if (room.painted) {
      x.fillStyle = '#000'; x.fillRect(0, 0, room.w, H);
      for (const p of art) {
        const img = this.image(p.f), put = () => x.drawImage(img, p.x, 0, p.w, H);
        if (img.complete && img.naturalWidth) put(); else img.addEventListener('load', put, { once: true });
      }
    } else {
      P.seed(hash(key)); room.paint(x, room.w); P.grain(x, 0, 0, room.w, H, 0.08);
    }
    this.bg = c; this.bgKey = key;
    this.preloadNear(room);
  },

  drawActor(ctx, a, t) {
    const type = ACTOR_TYPE[a.kind] || a.kind;
    drawChar(ctx, type, a.x, a.y ?? FLOOR, {
      facing: a.facing || 1, alpha: a.alpha ?? 1, h: a.h, t, ribbon: a.kind === 'daow' || (a.kind === 'daow_fake' && a.ribbon !== false),
      jitter: a.kind === 'daow_fake' ? (a.jitter ?? 1.2) : a.jitter, moving: a.moving, phase: a.moving ? t * 7 : 0,
      reach: a.reach, armOut: a.armOut, hold: a.hold, tilt: a.tilt, drip: a.kind === 'teacher_npc', rim: a.rim, ghost: a.kind === 'daow_fake',
    });
  },

  frame(t) {
    const ctx = this.ctx, room = G.room; if (!room || !this.bg) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
    const cam = G.cam | 0, fx = G.fx;
    ctx.save();
    if (fx.shake > 0 && G.settings.shake) ctx.translate((Math.random() - 0.5) * fx.shake * 14, (Math.random() - 0.5) * fx.shake * 10);
    ctx.drawImage(this.bg, cam, 0, W, H, 0, 0, W, H);
    ctx.translate(-cam, 0);
    room.dyn && room.dyn(ctx, t);
    kidsInRoom(ctx, t);
    const here = G.actors.filter((a) => a.room === room.id && (a.alpha ?? 1) > 0.01);
    here.filter((a) => !a.front).forEach((a) => this.drawActor(ctx, a, t));
    G.teacher && G.teacher.draw(ctx, t);
    const hand = G.player.draw(ctx, t);
    here.filter((a) => a.front).forEach((a) => this.drawActor(ctx, a, t));
    room.fg && room.fg(ctx, t);
    waterLayer(ctx, room.w, t);
    ctx.restore();

    this.lighting(room, cam, hand, t);
    if (room.outdoor && (room.amb.rainOut || 0) > 0.2) this.rain(ctx, cam);
    // colour grade per part
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = fx.grade || (fx.dawn > 0 ? '#ffe2c4' : G.S.part === 1 ? '#aab8d0' : G.S.part === 2 ? '#bcc4a6' : '#a6a8b4');
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    if (fx.noise > 0) this.glitch(ctx, fx.noise);
    if (fx.peep > 0) {
      // door peephole: fisheye ring, everything else black
      const g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 190);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, `rgba(0,0,0,${fx.peep * 0.7})`); g.addColorStop(1, `rgba(0,0,0,${fx.peep})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.drawImage(this.vign, 0, 0);
    P.grain(ctx, 0, 0, W, H, 0.09);
    if (fx.red > 0) { ctx.fillStyle = `rgba(110,0,0,${fx.red * 0.45})`; ctx.fillRect(0, 0, W, H); }
    if (fx.flash > 0) { ctx.fillStyle = `rgba(215,225,240,${fx.flash * (room.outdoor ? 0.55 : 0.12) * (G.settings.reduceScares ? 0.4 : 1)})`; ctx.fillRect(0, 0, W, H); }
    if (fx.white > 0) { ctx.fillStyle = `rgba(255,240,225,${fx.white})`; ctx.fillRect(0, 0, W, H); }
    if (fx.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(fx.fade, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  },

  lighting(room, cam, hand, t) {
    const lx = this.lx, fx = G.fx, s = 0.5;
    let dark = clamp(room.dark * (room.painted ? 0.62 : 0.8) + fx.blackout * 0.08 - (fx.dawn || 0) * 0.7, 0, 0.95);
    lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W * s, H * s);
    lx.fillStyle = `rgba(3,4,7,${dark})`; lx.fillRect(0, 0, W * s, H * s);
    lx.globalCompositeOperation = 'destination-out';
    const lights = room.lights ? room.lights(t) : [];
    const hole = (x, y, r, i, sy = 1) => {
      if (i <= 0.01) return; const X = (x - cam) * s, Y = y * s, Rr = r * s;
      if (X < -Rr || X > W * s + Rr) return;
      const g = lx.createRadialGradient(X, Y, 0, X, Y, Rr); g.addColorStop(0, `rgba(0,0,0,${i})`); g.addColorStop(0.5, `rgba(0,0,0,${i * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.save(); lx.translate(X, Y); lx.scale(1, sy); lx.translate(-X, -Y); lx.fillStyle = g; lx.fillRect(X - Rr, Y - Rr, Rr * 2, Rr * 2); lx.restore();
    };
    lights.forEach((L) => hole(L.x, L.y, L.r, L.i * (1 - fx.blackout), L.sy));
    const P0 = G.player;
    if (!P0.hidden) hole(P0.x, FLOOR - 80, 190, 0.6);
    // flashlight cone
    let beamOn = G.S.flashlight && !P0.hidden && hand;
    let beam = fx.beam * (fx.flicker > 0 && Math.random() < fx.flicker ? 0.1 : 1);
    if (beamOn && beam > 0.02) {
      const ox = (hand.hx - cam) * s, oy = hand.hy * s, dir = P0.facing, len = 600 * s, sp = 0.4, a0 = (dir > 0 ? 0 : Math.PI) + 0.07 * dir;
      const g = lx.createRadialGradient(ox, oy, 0, ox, oy, len);
      g.addColorStop(0, `rgba(0,0,0,${0.98 * beam})`); g.addColorStop(0.6, `rgba(0,0,0,${0.75 * beam})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = g; lx.beginPath(); lx.moveTo(ox, oy); lx.arc(ox, oy, len, a0 - sp, a0 + sp); lx.closePath(); lx.fill();
      hole(hand.hx + dir * 300, FLOOR - 40, 160, 0.4 * beam, 0.45);
    }
    lx.globalCompositeOperation = 'source-over';
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(this.lc, 0, 0, W, H);
    // coloured bloom
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const i = L.i * (1 - fx.blackout); if (i <= 0.02 || !L.c) continue;
      const X = L.x - cam; if (X < -L.r || X > W + L.r) continue;
      const g = ctx.createRadialGradient(X, L.y, 0, X, L.y, L.r * 0.8); g.addColorStop(0, `rgba(${L.c},${i * 0.22})`); g.addColorStop(1, `rgba(${L.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(X - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    if (beamOn && beam > 0.02) {
      const ox = hand.hx - cam, oy = hand.hy, dir = P0.facing, a0 = (dir > 0 ? 0 : Math.PI) + 0.07 * dir;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 520); g.addColorStop(0, `rgba(255,240,205,${0.16 * beam})`); g.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, 520, a0 - 0.36, a0 + 0.36); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  rain(ctx, cam) {
    ctx.strokeStyle = 'rgba(170,190,215,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of this.drops) {
      d.y += 22 * d.s; d.x -= 4 * d.s; if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 100); }
      const x = ((d.x - cam * 0.2 * d.s) % (W + 100) + W + 100) % (W + 100) - 50;
      ctx.moveTo(x, d.y); ctx.lineTo(x - 4 * d.s, d.y + 18 * d.s);
    }
    ctx.stroke();
  },

  glitch(ctx, k) {
    for (let i = 0; i < 6 * k; i++) {
      const y = Math.random() * H, h = 4 + Math.random() * 26, dx = (Math.random() - 0.5) * 60 * k;
      ctx.drawImage(this.c, 0, y, W, h, dx, y, W, h);
    }
    ctx.fillStyle = `rgba(255,255,255,${0.04 * k})`; ctx.fillRect(0, (G.time * 300) % H, W, 2);
  },
};
