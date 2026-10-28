// Procedural painting toolkit. Static props are painted once per room into an offscreen
// backdrop; lighting/post-processing (render.js) supplies most of the mood.
import { H, FLOOR } from '../game/ctx.js';

export const WB = 400; // where back wall meets floor

// deterministic RNG so a room looks the same on every visit
let _s = 1;
export const seed = (s) => { _s = s >>> 0 || 1; };
export const R = (a = 0, b = 1) => { _s = (_s + 0x6d2b79f5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return a + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (b - a); };

export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g;
}
export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g;
}
export function box(ctx, x, y, w, h, top, bot, stroke = 'rgba(0,0,0,.55)') {
  ctx.fillStyle = vgrad(ctx, y, y + h, [top, bot]); ctx.fillRect(x, y, w, h);
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}
export function contact(ctx, x, w, y = WB + 22, a = 0.55) {
  const g = ctx.createRadialGradient(x + w / 2, y, 2, x + w / 2, y, w * 0.65);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(1, 0.22); ctx.translate(-(x + w / 2), -y);
  ctx.fillRect(x - w * 0.3, y - w * 0.7, w * 1.6, w * 1.4); ctx.restore();
}

let _noise;
export function noiseTex() {
  if (_noise) return _noise;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); _noise = c; return c;
}
export function grain(ctx, x, y, w, h, a = 0.06) {
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noiseTex(), 'repeat'); ctx.fillRect(x, y, w, h); ctx.restore();
}

// stains, mould blooms, drips, scratches
export function grime(ctx, x, y, w, h, k = 1, tint = '20,14,8') {
  ctx.save();
  for (let i = 0; i < (w * h) / 9000 * k; i++) {
    const cx = x + R() * w, cy = y + R() * h, r = R(15, 90);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${tint},${R(0.05, 0.22) * k})`); g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  for (let i = 0; i < (w / 60) * k; i++) {
    const dx = x + R() * w, dl = R(30, h * 0.8), dw = R(2, 9);
    ctx.fillStyle = vgrad(ctx, y, y + dl, [`rgba(${tint},${R(0.12, 0.3)})`, `rgba(${tint},0)`]);
    ctx.fillRect(dx, y, dw, dl);
  }
  ctx.fillStyle = `rgba(${tint},.25)`;
  for (let i = 0; i < (w * h) / 600 * k; i++) ctx.fillRect(x + R() * w, y + R() * h, R(1, 2.5), R(1, 2.5));
  ctx.restore();
}

// flood water line: the 2553 flood left a band on every wall it reached
export function floodLine(ctx, w, y = 318) {
  ctx.fillStyle = vgrad(ctx, y - 6, y + 70, ['rgba(60,45,25,0)', 'rgba(55,42,22,.45)', 'rgba(40,30,18,.25)', 'rgba(40,30,18,0)']);
  ctx.fillRect(0, y - 6, w, 76);
  ctx.strokeStyle = 'rgba(30,22,12,.5)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.03) * 2 + R(-1.5, 1.5)); ctx.stroke();
}

export function aoEdges(ctx, w) {
  ctx.fillStyle = vgrad(ctx, 0, 70, ['rgba(0,0,0,.7)', 'rgba(0,0,0,0)']); ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = vgrad(ctx, WB - 50, WB, ['rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); ctx.fillRect(0, WB - 50, w, 50);
}

// ── walls ──────────────────────────────────────────────────────────
export function wallWood(ctx, w) {
  ctx.fillStyle = vgrad(ctx, 0, WB, ['#2b1e15', '#4a3424', '#3a281b']); ctx.fillRect(0, 0, w, WB);
  for (let x = 0; x < w; x += 38) {
    ctx.fillStyle = `rgba(${R() < 0.5 ? '255,220,180' : '0,0,0'},${R(0.02, 0.07)})`; ctx.fillRect(x, 0, 38, WB);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, 0, 2, WB);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(0,0,0,${R(0.05, 0.15)})`; ctx.beginPath(); const gx = x + R(6, 32); ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + R(-6, 6), 130, gx + R(-6, 6), 260, gx + R(-4, 4), WB); ctx.stroke(); }
  }
  box(ctx, 0, 52, w, 14, '#3b2a1c', '#21160e'); box(ctx, 0, WB - 26, w, 26, '#2d2016', '#140d08');
  grime(ctx, 0, 0, w, WB, 0.9); aoEdges(ctx, w);
}
export function wallSchool(ctx, w, { part3 = false } = {}) {
  ctx.fillStyle = vgrad(ctx, 0, 290, ['#3d3c33', '#7b7864', '#6c6956']); ctx.fillRect(0, 0, w, 290);
  ctx.fillStyle = vgrad(ctx, 290, WB, ['#33463b', '#26352c']); ctx.fillRect(0, 290, w, WB - 290);
  box(ctx, 0, 284, w, 12, '#4f3b28', '#2a1e14'); box(ctx, 0, 0, w, 34, '#262620', '#1a1a16', null);
  grime(ctx, 0, 0, w, WB, 1.3); floodLine(ctx, w, part3 ? 300 : 318); aoEdges(ctx, w);
  box(ctx, 0, WB - 18, w, 18, '#1f2a22', '#0d120e');
}
export function wallPlaster(ctx, w, top = '#4b4a44', bot = '#38362f') {
  ctx.fillStyle = vgrad(ctx, 0, WB, ['#24231f', top, bot]); ctx.fillRect(0, 0, w, WB);
  grime(ctx, 0, 0, w, WB, 1.1); aoEdges(ctx, w); box(ctx, 0, WB - 16, w, 16, '#2a2722', '#121110');
}

// ── floors ─────────────────────────────────────────────────────────
export function floorWood(ctx, w) {
  ctx.fillStyle = vgrad(ctx, WB, H, ['#2a1c12', '#3d2919', '#1c120b']); ctx.fillRect(0, WB, w, H - WB);
  for (let y = WB, k = 6; y < H; y += k, k *= 1.28) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, y, w, 1.5); }
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = -200; x < w + 200; x += 70) { ctx.beginPath(); ctx.moveTo(x, WB); ctx.lineTo(x + (x - w / 2) * 0.08 - 40, H); ctx.stroke(); }
  grime(ctx, 0, WB, w, H - WB, 0.6);
}
export function floorTile(ctx, w, base = ['#3f443c', '#4c5148', '#262a24']) {
  ctx.fillStyle = vgrad(ctx, WB, H, base); ctx.fillRect(0, WB, w, H - WB);
  // terrazzo speckle
  for (let i = 0; i < w * 0.9; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '200,200,190' : '0,0,0'},${R(0.05, 0.18)})`; ctx.fillRect(R(0, w), R(WB, H), R(1, 3), R(1, 2)); }
  for (let y = WB, k = 10; y < H; y += k, k *= 1.35) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, y, w, 1.5); }
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; for (let x = -300; x < w + 300; x += 90) { ctx.beginPath(); ctx.moveTo(x, WB); ctx.lineTo(x - 60, H); ctx.stroke(); }
  // wet reflections
  for (let i = 0; i < w / 160; i++) { const px = R(0, w), py = R(WB + 30, H - 20); const g = ctx.createRadialGradient(px, py, 0, px, py, R(40, 120)); g.addColorStop(0, 'rgba(120,140,150,.10)'); g.addColorStop(1, 'rgba(120,140,150,0)'); ctx.fillStyle = g; ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.25); ctx.translate(-px, -py); ctx.fillRect(px - 130, py - 130, 260, 260); ctx.restore(); }
  grime(ctx, 0, WB, w, H - WB, 0.5);
}
export function floorRoad(ctx, w) {
  ctx.fillStyle = vgrad(ctx, WB, H, ['#1a1c1e', '#2a2c2d', '#121314']); ctx.fillRect(0, WB, w, H - WB);
  ctx.fillStyle = vgrad(ctx, WB - 6, WB + 14, ['#1d2a1c', '#262e22']); ctx.fillRect(0, WB - 6, w, 20);
  for (let x = 0; x < w; x += 120) { ctx.fillStyle = 'rgba(200,190,140,.25)'; ctx.fillRect(x, 488, 60, 4); }
  for (let i = 0; i < w / 90; i++) { const px = R(0, w), py = R(WB + 30, H - 10), r = R(30, 110); ctx.fillStyle = 'rgba(90,110,130,.12)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.18, 0, 0, 7); ctx.fill(); }
  grime(ctx, 0, WB, w, H - WB, 0.4, '0,0,0');
}

// ── outdoor ────────────────────────────────────────────────────────
export function nightSky(ctx, w, { dawn = false, morning = false } = {}) {
  const st = dawn ? ['#2a2f45', '#8a5a4a', '#e09a5c'] : morning ? ['#6e7680', '#9aa0a3', '#b8b6ad'] : ['#06090e', '#121b26', '#1c2733'];
  ctx.fillStyle = vgrad(ctx, 0, WB, st); ctx.fillRect(0, 0, w, WB);
  for (let i = 0; i < w / 50; i++) {
    const cx = R(0, w), cy = R(10, 200), r = R(80, 260);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, dawn ? 'rgba(255,200,160,.12)' : morning ? 'rgba(230,230,230,.16)' : 'rgba(70,85,100,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.35); ctx.translate(-cx, -cy); ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
  }
}
export function treeLine(ctx, w, y = 330, col = '#070a0c', amp = 60) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, WB);
  for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y - Math.abs(Math.sin(x * 0.013) * amp) - R(0, amp * 0.5) - Math.sin(x * 0.051) * 10);
  ctx.lineTo(w, WB); ctx.fill();
}
export function palm(ctx, x, y, s = 1, col = '#05080a') {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20 * s, y - 120 * s, x + 6 * s, y - 230 * s); ctx.stroke();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 230 * s); ctx.quadraticCurveTo(x + 6 * s + Math.cos(a) * 60 * s, y - 250 * s + Math.sin(a) * 20 * s, x + 6 * s + Math.cos(a) * 95 * s, y - 210 * s + Math.abs(Math.sin(a)) * 40 * s); ctx.stroke(); }
}
export function pole(ctx, x, { horns = 2, w = 0 } = {}) {
  box(ctx, x - 7, 40, 14, WB - 30, '#2b2b28', '#121211');
  box(ctx, x - 50, 70, 100, 7, '#2a2722', '#141210');
  for (let i = 0; i < horns; i++) hornSpeaker(ctx, x + (i ? 22 : -22), 95, i ? 1 : -1);
  ctx.strokeStyle = 'rgba(10,10,10,.8)'; ctx.lineWidth = 1.5;
  if (w) { ctx.beginPath(); ctx.moveTo(x - 50, 72); ctx.quadraticCurveTo(x - 300, 110, x - 600, 74); ctx.moveTo(x + 50, 72); ctx.quadraticCurveTo(x + 300, 110, x + 600, 74); ctx.stroke(); }
}
export function hornSpeaker(ctx, x, y, dir = 1, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ctx.fillStyle = hgrad(ctx, 0, 46, ['#3b3a33', '#77705d', '#2a2822']);
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(46, -24); ctx.lineTo(46, 24); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0d0c0a'; ctx.beginPath(); ctx.ellipse(46, 0, 5, 24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(120,60,20,.5)'; for (let i = 0; i < 8; i++) ctx.fillRect(R(5, 40), R(-14, 14), R(2, 6), R(1, 4));
  box(ctx, -10, -9, 12, 18, '#3a3730', '#1b1915'); ctx.restore();
}
export function car(ctx, x, { lights = false } = {}) {
  const y = 470; contact(ctx, x - 20, 380, y + 8, 0.7);
  ctx.fillStyle = vgrad(ctx, y - 120, y, ['#2b3036', '#1b1f23', '#0e1012']);
  ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 6, y - 62); ctx.lineTo(x + 80, y - 72); ctx.lineTo(x + 130, y - 122); ctx.lineTo(x + 250, y - 124); ctx.lineTo(x + 300, y - 74); ctx.lineTo(x + 352, y - 66); ctx.lineTo(x + 360, y - 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = vgrad(ctx, y - 118, y - 76, ['#0d151d', '#22303c']);
  ctx.beginPath(); ctx.moveTo(x + 92, y - 76); ctx.lineTo(x + 136, y - 116); ctx.lineTo(x + 186, y - 116); ctx.lineTo(x + 186, y - 76); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 194, y - 76); ctx.lineTo(x + 194, y - 116); ctx.lineTo(x + 244, y - 116); ctx.lineTo(x + 282, y - 76); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,180,200,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y - 58); ctx.lineTo(x + 350, y - 60); ctx.stroke();
  for (const wx of [x + 70, x + 290]) { ctx.fillStyle = '#060606'; ctx.beginPath(); ctx.arc(wx, y - 14, 30, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2c2e'; ctx.beginPath(); ctx.arc(wx, y - 14, 13, 0, 7); ctx.fill(); }
  ctx.fillStyle = lights ? '#fff6d0' : '#55524a'; ctx.fillRect(x + 346, y - 60, 12, 10);
  ctx.fillStyle = '#5a1410'; ctx.fillRect(x + 1, y - 58, 8, 12);
}
export function fallenTree(ctx, x) {
  ctx.save(); ctx.translate(x, 470); ctx.rotate(-0.06);
  ctx.fillStyle = vgrad(ctx, -30, 30, ['#2a2219', '#15100b']); ctx.beginPath(); ctx.ellipse(0, 0, 230, 26, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = '#120e0a'; ctx.lineWidth = R(2, 6); ctx.beginPath(); const bx = R(-200, 220); ctx.moveTo(bx, -10); ctx.quadraticCurveTo(bx + R(-30, 30), R(-80, -40), bx + R(-60, 60), R(-130, -60)); ctx.stroke(); }
  ctx.fillStyle = '#0c120c'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(R(-180, 240), R(-130, -30), R(20, 45), R(10, 25), R(0, 3), 0, 7); ctx.fill(); }
  ctx.restore();
}
export function villageSign(ctx, x) {
  box(ctx, x - 4, 250, 8, 160, '#3a3833', '#1a1916'); box(ctx, x + 96, 270, 8, 140, '#3a3833', '#1a1916');
  ctx.save(); ctx.translate(x + 50, 262); ctx.rotate(0.09);
  box(ctx, -80, -36, 160, 60, '#3c5a46', '#22382a');
  ctx.fillStyle = 'rgba(230,230,210,.75)'; ctx.font = 'bold 17px "Noto Sans Thai", Tahoma'; ctx.textAlign = 'center';
  ctx.fillText('ยินดีต้อนรับสู่', -10, -10); ctx.fillText('บ้านหนองน้ำใส', 0, 12);
  ctx.fillStyle = '#0a0c0a'; ctx.beginPath(); ctx.moveTo(40, -36); ctx.lineTo(80, -36); ctx.lineTo(80, 24); ctx.lineTo(62, 24); ctx.lineTo(70, -4); ctx.lineTo(50, -16); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function sala(ctx, x) {
  const w = 420;
  ctx.fillStyle = vgrad(ctx, WB - 40, WB, ['#3a3127', '#211b15']); ctx.fillRect(x, WB - 40, w, 40);
  for (const px of [x + 10, x + 140, x + 270, x + 400]) box(ctx, px, 150, 14, WB - 190, '#5a4a39', '#2a2119');
  // tiered Thai roof
  ctx.fillStyle = vgrad(ctx, 40, 160, ['#4a2a1e', '#2b1812']);
  ctx.beginPath(); ctx.moveTo(x - 40, 160); ctx.lineTo(x + 60, 90); ctx.lineTo(x + w / 2, 40); ctx.lineTo(x + w - 60, 90); ctx.lineTo(x + w + 40, 160); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 40, 160); ctx.lineTo(x + w + 40, 160); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w / 2, 40); ctx.quadraticCurveTo(x + w / 2 - 10, 20, x + w / 2 + 6, 10); ctx.stroke();
  for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 30 + i * 26, 100 + Math.abs(i - 9) * 5, 2, 50); }
  grime(ctx, x - 40, 40, w + 80, WB - 40, 0.8);
}
export function thaiHouse(ctx, x) {
  const w = 560, top = 60;
  ctx.fillStyle = vgrad(ctx, top, WB, ['#2e2219', '#3d2c1f', '#1d150f']); ctx.fillRect(x, top + 50, w, WB - top - 50);
  for (let px = x; px < x + w; px += 30) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px, top + 50, 2, WB - top - 50); }
  ctx.fillStyle = vgrad(ctx, top - 40, top + 60, ['#2a1d16', '#140e0a']);
  ctx.beginPath(); ctx.moveTo(x - 50, top + 60); ctx.lineTo(x + w / 2, top - 50); ctx.lineTo(x + w + 50, top + 60); ctx.closePath(); ctx.fill();
  box(ctx, x - 10, 225, w + 20, 10, '#3a2a1c', '#1a120b');
  for (const wx of [x + 60, x + 420]) { box(ctx, wx, 110, 90, 90, '#0b0f14', '#151d25'); box(ctx, wx - 8, 104, 8, 102, '#3b2a1c', '#1f150e'); box(ctx, wx + 90, 104, 8, 102, '#3b2a1c', '#1f150e'); }
  for (const wx of [x + 60, x + 420]) { box(ctx, wx, 260, 80, 90, '#0a0d10', '#11161b'); }
  grime(ctx, x, top, w, WB - top, 1);
}
export function schoolFacade(ctx, x, w) {
  ctx.fillStyle = vgrad(ctx, 30, WB, ['#4a4a40', '#5d5b4d', '#33352e']); ctx.fillRect(x, 30, w, WB - 30);
  box(ctx, x - 20, 20, w + 40, 18, '#3a3a33', '#222220'); box(ctx, x, 205, w, 10, '#2d2e28', '#1a1b17');
  const wins = [];
  for (let wx = x + 60; wx < x + w - 100; wx += 150) { for (const wy of [70, 250]) { box(ctx, wx, wy, 90, 100, '#090c10', '#121820'); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(wx + 44, wy, 3, 100); ctx.fillRect(wx, wy + 48, 90, 3); if (wy === 70) wins.push([wx, wy, 90, 100]); } }
  floodLine(ctx, w, 330); grime(ctx, x, 30, w, WB - 30, 1.4);
  return wins;
}
export function gate(ctx, x) {
  box(ctx, x - 14, 150, 28, WB - 130, '#5a584e', '#2d2c27'); box(ctx, x + 236, 150, 28, WB - 130, '#5a584e', '#2d2c27');
  ctx.strokeStyle = '#26251f'; ctx.lineWidth = 4; for (let gx = x + 20; gx < x + 236; gx += 18) { ctx.beginPath(); ctx.moveTo(gx, 190); ctx.lineTo(gx, WB + 30); ctx.stroke(); }
  box(ctx, x + 14, 186, 222, 8, '#3a3933', '#1e1d19'); box(ctx, x + 14, 330, 222, 8, '#3a3933', '#1e1d19');
  box(ctx, x - 20, 100, 290, 46, '#2a3e33', '#18241d');
  ctx.fillStyle = 'rgba(220,215,190,.7)'; ctx.font = 'bold 18px "Noto Sans Thai", Tahoma'; ctx.textAlign = 'center';
  ctx.fillText('ศูนย์อพยพชั่วคราว พ.ศ. 2553', x + 125, 130);
}

// ── architecture & furniture ───────────────────────────────────────
export function door(ctx, x, { w = 104, h = 236, col = ['#4a3726', '#2b1f15'], metal = false, sign = '', glass = false, dark = false } = {}) {
  const y = WB - h + 8, l = x - w / 2;
  box(ctx, l - 10, y - 10, w + 20, h + 10, '#2b2117', '#120d09');
  if (dark) { ctx.fillStyle = '#030303'; ctx.fillRect(l, y, w, h); return; }
  box(ctx, l, y, w, h, metal ? '#525650' : col[0], metal ? '#2a2d29' : col[1]);
  if (metal) { ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let ry = y + 20; ry < y + h; ry += 40) ctx.fillRect(l, ry, w, 3); ctx.fillStyle = 'rgba(110,60,25,.35)'; for (let i = 0; i < 30; i++) ctx.fillRect(l + R(0, w), y + R(0, h), R(2, 10), R(2, 14)); }
  else { box(ctx, l + 12, y + 16, w - 24, h * 0.36, 'rgba(0,0,0,.12)', 'rgba(0,0,0,.25)'); box(ctx, l + 12, y + h * 0.48, w - 24, h * 0.44, 'rgba(0,0,0,.12)', 'rgba(0,0,0,.25)'); }
  if (glass) box(ctx, l + 18, y + 22, w - 36, 60, '#0c1218', '#1a232b');
  ctx.fillStyle = '#b3a57a'; ctx.beginPath(); ctx.arc(l + w - 16, y + h * 0.52, 4, 0, 7); ctx.fill();
  if (sign) { box(ctx, x - 62, y - 44, 124, 26, '#d9d2b8', '#a69f86'); ctx.fillStyle = '#25231c'; ctx.font = 'bold 14px "Noto Sans Thai", Tahoma'; ctx.textAlign = 'center'; ctx.fillText(sign, x, y - 26); }
  grime(ctx, l, y, w, h, 0.8);
}
export function stairs(ctx, x, dir = 'up') {
  const n = 9, sw = 26, sh = 30;
  if (dir === 'up') {
    ctx.fillStyle = '#060606'; ctx.fillRect(x - 20, 30, n * sw + 40, WB - 30);
    for (let i = 0; i < n; i++) box(ctx, x + i * sw, WB - (i + 1) * sh, sw + 2, (i + 1) * sh, '#3b3b35', '#1b1b18', 'rgba(0,0,0,.6)');
    ctx.strokeStyle = '#6a604a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 8, WB - 70); ctx.lineTo(x + n * sw, WB - n * sh - 60); ctx.stroke();
    for (let i = 0; i < n; i += 2) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + i * sw + 6, WB - (i + 1) * sh); ctx.lineTo(x + i * sw + 6, WB - (i + 1) * sh - 62); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#040404'; ctx.fillRect(x - 10, WB - 120, n * sw + 20, 120);
    for (let i = 0; i < 4; i++) box(ctx, x + i * sw, WB - 120 + i * sh, n * sw - i * sw, 6, '#33332e', '#1a1a17');
    ctx.strokeStyle = '#6a604a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 10, WB - 150); ctx.lineTo(x + n * sw + 10, WB - 150); ctx.stroke();
    for (let i = 0; i <= n; i += 3) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + i * sw, WB - 150); ctx.lineTo(x + i * sw, WB - 90); ctx.stroke(); }
  }
}
export function windowFrame(ctx, x, y, w, h, { bars = false, col = '#3d2d1f' } = {}) {
  box(ctx, x - 10, y - 10, w + 20, h + 20, col, '#140e09');
  ctx.fillStyle = vgrad(ctx, y, y + h, ['#05080c', '#0f1822', '#0a1016']); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillRect(x, y + h / 2 - 3, w, 6);
  if (bars) { ctx.fillStyle = '#1a1a18'; for (let bx = x + 12; bx < x + w; bx += 16) ctx.fillRect(bx, y, 3, h); }
  box(ctx, x - 16, y + h + 8, w + 32, 10, '#3a2a1d', '#1a120c');
  return [x, y, w, h];
}
export function clockBody(ctx, x, y, r = 26) {
  ctx.fillStyle = '#1c1712'; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, r); g.addColorStop(0, '#d8d0b6'); g.addColorStop(1, '#8a826a'); ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a251c'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.fillRect(x + Math.cos(a) * (r - 5) - 1, y + Math.sin(a) * (r - 5) - 1, 2.5, 2.5); }
}
export function clockHands(ctx, x, y, r, h, m) {
  const ha = ((h % 12) + m / 60) / 12 * Math.PI * 2 - Math.PI / 2, ma = (m / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#15120d'; ctx.lineCap = 'round';
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ha) * r * 0.5, y + Math.sin(ha) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ma) * r * 0.8, y + Math.sin(ma) * r * 0.8); ctx.stroke();
}
export function chalkboard(ctx, x, y, w, h) {
  box(ctx, x - 12, y - 12, w + 24, h + 24, '#4c3622', '#24180e');
  ctx.fillStyle = vgrad(ctx, y, y + h, ['#18221c', '#22302a', '#1a241e']); ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(220,230,220,${R(0.02, 0.06)})`; ctx.beginPath(); ctx.ellipse(x + R(0, w), y + R(0, h), R(20, 80), R(5, 20), R(-0.4, 0.4), 0, 7); ctx.fill(); }
  box(ctx, x - 6, y + h + 10, w + 12, 8, '#3d2c1c', '#1d140c');
}
export function studentDesk(ctx, x, y = WB + 40, s = 1, num) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  contact(ctx, -40, 80, 6, 0.5);
  ctx.fillStyle = '#1a140e'; ctx.fillRect(-34, -64, 5, 64); ctx.fillRect(29, -64, 5, 64);
  box(ctx, -38, -72, 76, 9, '#7a5a3a', '#4a3420'); box(ctx, -34, -62, 68, 16, '#3a2a1b', '#21170e');
  ctx.fillStyle = '#121212'; ctx.fillRect(-28, -40, 4, 40); ctx.fillRect(24, -40, 4, 40);
  if (num) { box(ctx, -16, -60, 32, 12, '#c9c0a0', '#8e866c', null); ctx.fillStyle = '#2b2820'; ctx.font = 'bold 9px Tahoma'; ctx.textAlign = 'center'; ctx.fillText(num, 0, -51); }
  ctx.restore();
}
export function chair(ctx, x, y = WB + 40, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#16110c'; ctx.fillRect(-16, -36, 4, 36); ctx.fillRect(12, -36, 4, 36); ctx.fillRect(12, -80, 4, 44);
  box(ctx, -18, -40, 36, 6, '#6a4c30', '#3b2a1a', null); box(ctx, 10, -84, 8, 34, '#6a4c30', '#3b2a1a', null);
  ctx.restore();
}
export function lockers(ctx, x, n = 4) {
  const w = 52, h = 220, y = WB - h + 16; contact(ctx, x, n * w, WB + 18);
  for (let i = 0; i < n; i++) {
    const lx = x + i * w; box(ctx, lx, y, w - 2, h, '#4b5650', '#262d29');
    ctx.fillStyle = 'rgba(0,0,0,.6)'; for (let v = 0; v < 5; v++) ctx.fillRect(lx + 12, y + 18 + v * 7, w - 26, 3);
    ctx.fillStyle = '#8b8a7c'; ctx.fillRect(lx + w - 14, y + 100, 4, 22);
    ctx.fillStyle = 'rgba(120,70,30,.35)'; for (let k = 0; k < 8; k++) ctx.fillRect(lx + R(0, w), y + R(0, h), R(2, 6), R(2, 12));
  }
  grime(ctx, x, y, n * w, h, 0.7);
}
export function cabinet(ctx, x, { w = 90, h = 170, drawers = 4 } = {}) {
  const y = WB - h + 16; contact(ctx, x, w, WB + 18); box(ctx, x, y, w, h, '#555a52', '#2b2e2a');
  for (let i = 0; i < drawers; i++) { const dy = y + 8 + i * ((h - 16) / drawers); box(ctx, x + 8, dy, w - 16, (h - 16) / drawers - 6, '#4a4f48', '#30332f'); ctx.fillStyle = '#9a988a'; ctx.fillRect(x + w / 2 - 12, dy + 12, 24, 4); }
  grime(ctx, x, y, w, h, 0.8);
}
export function wardrobe(ctx, x, { w = 120, h = 260 } = {}) {
  const y = WB - h + 16; contact(ctx, x, w, WB + 18); box(ctx, x, y, w, h, '#4d3624', '#24180f');
  box(ctx, x + 8, y + 10, w / 2 - 12, h - 20, '#3e2b1c', '#2a1d12'); box(ctx, x + w / 2 + 4, y + 10, w / 2 - 12, h - 20, '#3e2b1c', '#2a1d12');
  ctx.fillStyle = '#a0946c'; ctx.fillRect(x + w / 2 - 8, y + h / 2, 3, 16); ctx.fillRect(x + w / 2 + 5, y + h / 2, 3, 16);
  grime(ctx, x, y, w, h, 0.6);
}
export function shelf(ctx, x, { w = 220, h = 280 } = {}) {
  const y = WB - h + 14; contact(ctx, x, w, WB + 16); box(ctx, x, y, w, h, '#3d2b1b', '#1e150d');
  const rows = 5, rh = (h - 20) / rows;
  for (let r = 0; r < rows; r++) {
    const ry = y + 10 + r * rh; ctx.fillStyle = '#0d0905'; ctx.fillRect(x + 8, ry, w - 16, rh - 8);
    let bx = x + 10;
    while (bx < x + w - 18) {
      const bw = R(7, 15), bh = R(rh * 0.55, rh - 10), lean = R() < 0.08;
      const hue = [['#5a2a22', '#3a1814'], ['#2a3a4a', '#18222c'], ['#4a4a2a', '#2a2a18'], ['#3a2a40', '#221828'], ['#6a5a40', '#3a3020']][(R() * 5) | 0];
      ctx.save(); if (lean) { ctx.translate(bx, ry + rh - 8); ctx.rotate(-0.25); ctx.translate(-bx, -(ry + rh - 8)); }
      box(ctx, bx, ry + rh - 8 - bh, bw, bh, hue[0], hue[1], 'rgba(0,0,0,.4)'); ctx.restore();
      bx += bw + R(0, 2) + (R() < 0.06 ? 20 : 0);
    }
    box(ctx, x + 4, ry + rh - 8, w - 8, 6, '#4a3522', '#2a1d12', null);
  }
  grime(ctx, x, y, w, h, 0.9);
}
export function table(ctx, x, { w = 160, h = 80, top = '#5a4028' } = {}) {
  const y = WB + 30; contact(ctx, x, w, y + 6, 0.6);
  ctx.fillStyle = '#140e09'; ctx.fillRect(x + 8, y - h, 7, h); ctx.fillRect(x + w - 15, y - h, 7, h);
  box(ctx, x, y - h - 10, w, 12, top, '#2a1d12');
}
export function bed(ctx, x) {
  const y = WB + 34; contact(ctx, x, 230, y + 4, 0.6);
  ctx.strokeStyle = '#6d726c'; ctx.lineWidth = 4; ctx.strokeRect(x, y - 110, 6, 110); ctx.strokeRect(x + 224, y - 90, 6, 90);
  box(ctx, x + 6, y - 64, 218, 22, '#a8a596', '#6e6b5e'); ctx.fillStyle = 'rgba(90,70,30,.35)'; ctx.beginPath(); ctx.ellipse(x + 120, y - 55, 40, 7, 0, 0, 7); ctx.fill();
  box(ctx, x + 14, y - 76, 52, 14, '#bdb9a8', '#8a8676', null);
}
export function curtain(ctx, x, w = 120, h = 280) {
  const y = WB - h; ctx.fillStyle = '#5b5e55';
  for (let i = 0; i < w; i += 10) { ctx.fillStyle = i % 20 ? 'rgba(130,135,120,.85)' : 'rgba(90,95,85,.85)'; ctx.fillRect(x + i, y, 10, h - R(0, 20)); }
  ctx.fillStyle = vgrad(ctx, y + h - 120, y + h, ['rgba(70,50,20,0)', 'rgba(70,50,20,.5)']); ctx.fillRect(x, y + h - 120, w, 120);
}
export function frame(ctx, x, y, w, h, { inner = '#3a3a33', tilt = 0 } = {}) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt); ctx.translate(-w / 2, -h / 2);
  box(ctx, -5, -5, w + 10, h + 10, '#5a4428', '#2a1d10'); ctx.fillStyle = inner; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(w * 0.2, h * 0.3, w * 0.25, h * 0.6); ctx.fillRect(w * 0.55, h * 0.4, w * 0.2, h * 0.5);
  ctx.restore();
}
export function paper(ctx, x, y, w = 40, h = 52, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); box(ctx, 0, 0, w, h, '#b8b098', '#8e8670', 'rgba(0,0,0,.3)');
  ctx.fillStyle = 'rgba(40,40,40,.4)'; for (let ly = 8; ly < h - 6; ly += 6) ctx.fillRect(5, ly, w - 10 - R(0, 10), 1.5);
  ctx.restore();
}
export function board(ctx, x, y, w, h) {
  box(ctx, x - 8, y - 8, w + 16, h + 16, '#4a3622', '#22170d'); box(ctx, x, y, w, h, '#5a4430', '#3d2c1c', null);
  for (let i = 0; i < (w * h) / 1400; i++) paper(ctx, x + R(5, w - 45), y + R(5, h - 55), R(30, 44), R(36, 52), R(-0.15, 0.15));
}
export function sofa(ctx, x) {
  const y = WB + 30; contact(ctx, x, 260, y, 0.6);
  box(ctx, x, y - 120, 260, 70, '#3a2a24', '#22180f'); box(ctx, x - 10, y - 60, 280, 50, '#4a352c', '#261b14'); box(ctx, x - 16, y - 100, 26, 90, '#3a2a24', '#1e150f'); box(ctx, x + 250, y - 100, 26, 90, '#3a2a24', '#1e150f');
  ctx.fillStyle = '#100b08'; ctx.fillRect(x, y - 10, 8, 10); ctx.fillRect(x + 252, y - 10, 8, 10);
  grime(ctx, x - 16, y - 120, 292, 120, 0.6);
}
export function tapeDeck(ctx, x, y) {
  box(ctx, x, y, 110, 46, '#2f2d29', '#151412');
  box(ctx, x + 8, y + 8, 56, 30, '#0d0d0c', '#1a1a18'); ctx.fillStyle = '#3a3830'; ctx.beginPath(); ctx.arc(x + 22, y + 23, 8, 0, 7); ctx.arc(x + 50, y + 23, 8, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++) box(ctx, x + 70 + (i % 3) * 12, y + 10 + ((i / 3) | 0) * 14, 9, 9, '#6a665a', '#3a3830', null);
  ctx.fillStyle = '#5a1a14'; ctx.fillRect(x + 96, y + 34, 6, 4);
}
export function fuseBox(ctx, x) {
  box(ctx, x, 140, 150, 210, '#4a4d47', '#262824'); box(ctx, x + 12, 152, 126, 186, '#1a1b19', '#262725');
  ctx.fillStyle = '#e8e2c8'; ctx.font = 'bold 11px Tahoma'; ctx.textAlign = 'left';
  ['1 LIGHTS', '2 ARCHIVES', '3 —', '4 PA'].forEach((t, i) => { box(ctx, x + 22, 168 + i * 42, 24, 30, '#6d6a5e', '#3a3830', null); ctx.fillText(t, x + 54, 188 + i * 42); });
  ctx.fillStyle = '#c8b030'; ctx.beginPath(); ctx.moveTo(x + 75, 120); ctx.lineTo(x + 90, 134); ctx.lineTo(x + 60, 134); ctx.fill();
}
export function micDesk(ctx, x) {
  table(ctx, x - 140, { w: 280, h: 86, top: '#4a3a2a' });
  box(ctx, x - 110, WB - 92, 120, 36, '#2b2a26', '#141311');
  for (let i = 0; i < 8; i++) { box(ctx, x - 102 + i * 14, WB - 84, 8, 18, '#6a6658', '#2a2822', null); }
  ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 60, WB - 66); ctx.lineTo(x + 70, WB - 130); ctx.stroke();
  ctx.fillStyle = vgrad(ctx, WB - 160, WB - 130, ['#7a7a70', '#3a3a34']); ctx.beginPath(); ctx.ellipse(x + 72, WB - 146, 12, 18, -0.2, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; for (let gy = -12; gy < 12; gy += 4) ctx.fillRect(x + 62, WB - 146 + gy, 20, 1.5);
}
export function wiringPanel(ctx, x) {
  box(ctx, x, 120, 200, 230, '#3a3c38', '#1c1d1b'); box(ctx, x + 10, 130, 180, 210, '#141513', '#1d1e1c');
  ctx.fillStyle = '#d8d2bc'; ctx.font = 'bold 11px Tahoma'; ctx.textAlign = 'left';
  [['MIC', 150], ['TAPE', 190], ['MIXER', 240], ['AMP', 280], ['SCHOOL', 320]].forEach(([t, y], i) => { ctx.fillText(t, x + 20, y); ctx.fillStyle = '#6a2a20'; ctx.beginPath(); ctx.arc(x + 170, y - 4, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#d8d2bc'; });
}
export function mirrorFrame(ctx, x, y, w, h) {
  box(ctx, x - 8, y - 8, w + 16, h + 16, '#4a3a22', '#21180d');
  ctx.fillStyle = vgrad(ctx, y, y + h, ['#1a2024', '#2a3236', '#13181b']); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 5, y + h * 0.6); ctx.lineTo(x, y + h * 0.5); ctx.fill();
  grime(ctx, x, y, w, h, 1.2, '10,10,10');
}
export function fluoFixture(ctx, x, y = 40) { box(ctx, x - 70, y, 140, 10, '#5a5a52', '#2a2a26'); box(ctx, x - 64, y + 10, 128, 6, '#bcbcaa', '#7a7a6a', null); }
export function bulb(ctx, x, y = 30) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = '#6a6250'; ctx.beginPath(); ctx.arc(x, y + 8, 8, 0, 7); ctx.fill(); }
export function textOn(ctx, txt, x, y, { size = 16, col = 'rgba(230,230,220,.8)', font = '"Noto Sans Thai", Tahoma', align = 'center', bold = true } = {}) {
  ctx.fillStyle = col; ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`; ctx.textAlign = align; ctx.fillText(txt, x, y);
}
export function familyDrawing(ctx, x, y, scratched = true) {
  ctx.save(); ctx.strokeStyle = 'rgba(225,215,190,.75)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  const fig = (fx, s) => { ctx.beginPath(); ctx.arc(fx, y - 60 * s, 10 * s, 0, 7); ctx.moveTo(fx, y - 50 * s); ctx.lineTo(fx, y - 20 * s); ctx.moveTo(fx - 14 * s, y - 40 * s); ctx.lineTo(fx + 14 * s, y - 40 * s); ctx.moveTo(fx, y - 20 * s); ctx.lineTo(fx - 9 * s, y); ctx.moveTo(fx, y - 20 * s); ctx.lineTo(fx + 9 * s, y); ctx.stroke(); };
  fig(x, 1.2); fig(x + 50, 1.1); fig(x + 95, 0.85); fig(x + 130, 0.7);
  if (scratched) { ctx.strokeStyle = 'rgba(20,15,10,.95)'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(x + 120 + R(-3, 3), y - 58 + R(-6, 6)); ctx.lineTo(x + 140 + R(-3, 3), y - 42 + R(-6, 6)); ctx.stroke(); } }
  ctx.restore();
}
export function screwPlaque(ctx, x, y) {
  box(ctx, x, y, 200, 90, '#4f4e46', '#2c2b26'); textOn(ctx, 'รายชื่อผู้เสียชีวิต อุทกภัย 2553', x + 100, y + 22, { size: 12, col: '#d6d0b8' });
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(210,205,185,.5)'; ctx.fillRect(x + 20, y + 34 + i * 8, R(90, 160), 3); }
  box(ctx, x, y + 96, 200, 92, '#2a2925', '#1a1916');
  ctx.fillStyle = '#0c0c0b'; for (let i = 0; i < 23; i++) { ctx.beginPath(); ctx.arc(x + 18 + (i % 8) * 23, y + 112 + ((i / 8) | 0) * 26, 3, 0, 7); ctx.fill(); }
}
