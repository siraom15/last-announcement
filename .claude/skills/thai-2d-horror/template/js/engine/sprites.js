// Painted character sprites (assets/sprites/<name>/full.png, side view facing right).
// One still pose per character, animated as a cut-out: stride skew below the hip, bob, sway,
// crouch squash, plus a pre-baked rim-light and silhouette version for shadows/ghosts.
import { loadRig, rigReady, drawRig } from './rig.js';

const SRC = { man: 'pakin', girl: 'daow', kid: 'daow', teacher: 'teacher', nameless: 'nameless' };
const HIP = { pakin: 0.5, daow: 0.56, teacher: 0.6, nameless: 0.52 };      // fraction from the top where legs start
const HAND = { pakin: [0.1, 0.55], daow: [0.05, 0.6], teacher: [0.15, 0.55] }; // hand position (x from centre, y from top) as fractions
const cache = {};

function tinted(src, color) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}

function load(name) {
  if (cache[name] !== undefined) return;
  cache[name] = null;
  const img = new Image();
  img.onload = () => {
    // trim transparent margins so feet sit exactly on the floor line
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 20) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const t = document.createElement('canvas'); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
    t.getContext('2d').drawImage(c, -x0, -y0);
    cache[name] = { img: t, sil: tinted(t, '#06070a'), rim: tinted(t, 'rgba(175,195,220,.75)'), w: t.width, h: t.height };
  };
  img.src = `assets/sprites/${name}/full.png`;
}

export const Sprites = {
  init() { for (const n of new Set(Object.values(SRC))) load(n); loadRig(); },
  ready(type) { return !!cache[SRC[type]]; },

  // Draws in local space (feet at 0,0, facing already applied). Returns hand position or null if not loaded.
  draw(ctx, type, o, h) {
    // Pakin has a jointed rig (parts sheet); everyone else animates the single pose
    if (type === 'man' && rigReady()) return drawRig(ctx, h, o);
    const name = SRC[type], sp = name && cache[name];
    if (!sp) return null;
    const k = h / sp.h, w = sp.w * k, t = o.t || 0;
    const mv = o.moving ? 1 : 0, ph = o.phase || 0, cr = o.crouch ? 1 : 0;
    const bob = mv ? Math.abs(Math.sin(ph)) * 0.022 * h : Math.sin(t * 1.8) * 0.004 * h;
    const sway = mv ? Math.sin(ph) * 0.025 : 0;
    const lean = (o.lean || 0) + cr * 0.12 + (mv && o.running ? 0.07 : 0);
    const hip = HIP[name] || 0.52, sy = sp.h * hip;
    const stride = mv ? Math.sin(ph) * 0.2 : 0;

    ctx.save();
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(0, 1, w * 0.45, h * 0.025, 0, 0, 7); ctx.fill();
    ctx.rotate(sway + lean); ctx.scale(1, 1 - cr * 0.28);
    const layer = (src, ox = 0, oy = 0) => {
      // upper body
      ctx.drawImage(src, 0, 0, sp.w, sy, -w / 2 + ox, -h - bob + oy, w, sy * k);
      // legs, skewed around the hip for a stride
      ctx.save(); ctx.translate(ox, -h - bob + sy * k + oy); ctx.transform(1, 0, stride, 1, 0, 0);
      ctx.drawImage(src, 0, sy, sp.w, sp.h - sy, -w / 2, -0.5, w, (sp.h - sy) * k + bob + 0.5);
      ctx.restore();
    };
    const base = o.alpha ?? 1;
    if (type === 'kid') { ctx.globalAlpha = base * 0.85; layer(sp.sil); ctx.restore(); return { hx: 0, hy: -h * 0.5 }; }
    if (type === 'nameless') {
      for (let i = 2; i >= 1; i--) { ctx.globalAlpha = base * 0.25; layer(sp.img, Math.sin(t * 2.3 + i * 1.7) * 7 * i, Math.cos(t * 1.7 + i) * 3 * i); }
      ctx.globalAlpha = base; layer(sp.img); ctx.restore(); return { hx: 0, hy: -h * 0.5 };
    }
    if (o.rim !== false) { ctx.globalAlpha = base * 0.8; layer(sp.rim, -2, -1.5); }
    ctx.globalAlpha = base; layer(sp.img);
    if (o.ghost) { ctx.globalAlpha = base * 0.4; layer(sp.sil); } // impostor: darker, colder
    const hd = HAND[name] || [0.1, 0.55];
    const hx = hd[0] * w, hy = -h * (1 - hd[1]) - bob;
    if (o.hold === 'light') {
      ctx.globalAlpha = base;
      ctx.fillStyle = '#121212'; ctx.fillRect(hx - 2, hy - 3, 15 * k * 2.7, 6);
      ctx.fillStyle = o.lightOn ? '#fff6cf' : '#666'; ctx.fillRect(hx - 2 + 15 * k * 2.7, hy - 3.5, 3, 7);
    }
    ctx.restore();
    return { hx: hx + 15 * k * 2.7, hy };
  },
};
