// Characters: painted sprites (sprites.js) when available, otherwise procedural figures in a
// manhwa-ink style — black ink outlines, cel shading, per-character hair and clothes, rim light.
import { Sprites } from './sprites.js';

const INK = '#0d0b09';
// Standing heights in world units before CHAR_SCALE (adult ≈ 1.72 m).
const BASE_H = { man: 170, girl: 116, teacher: 236, nameless: 270, kid: 112, ratree: 180 };
export const CHAR_SCALE = { v: 1.3 }; // fitted to the painted rooms: an adult's head reaches the top of a door leaf
const PAL = {
  man: { skin: '#b98a6b', skinS: '#8a6149', hair: '#16130f', hairH: '#3a332b', top: '#4a5038', topS: '#30351f', inner: '#8d8c86', leg: '#2b3140', legS: '#1c2029', shoe: '#1a1714' },
  girl: { skin: '#d6a98a', skinS: '#a87a5e', hair: '#111015', hairH: '#3a3848', top: '#ece8dc', topS: '#b4ae9c', skirt: '#232c4c', skirtS: '#161c33', sock: '#f2f0ea', shoe: '#111' },
  teacher: { skin: '#a8a49b', skinS: '#7a766f', hair: '#060607', hairH: '#24262c', top: '#8c815c', topS: '#5d553c', skirt: '#1d1b1a', skirtS: '#121110', shoe: '#0b0b0b' },
  ratree: { skin: '#c99a7b', skinS: '#99704f', hair: '#17140f', hairH: '#3d342a', top: '#a1956b', topS: '#726947', skirt: '#2a2723', skirtS: '#1a1816', shoe: '#141210' },
  kid: { skin: '#121418', skinS: '#0b0c0f', hair: '#07080a', hairH: '#1b1d22', top: '#15181d', topS: '#0e1014', skirt: '#101218', skirtS: '#0a0b0f', sock: '#15181d', shoe: '#050505', noInk: true },
};
const GHOST = { skin: '#020202', skinS: '#020202', hair: '#000', hairH: '#111', top: '#030303', topS: '#020202', leg: '#030303', legS: '#020202', skirt: null, shoe: '#000', noInk: true };

// Catmull-Rom closed spline through points
function spline(ctx, pts) {
  const n = pts.length; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  ctx.closePath();
}
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

// A tapered limb segment with an ink outline (outline drawn as an expanded shape underneath).
function seg(ctx, ax, ay, bx, by, wa, wb, col, P, lw) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const draw = (a, b) => {
    ctx.beginPath(); ctx.moveTo(ax + nx * a, ay + ny * a); ctx.lineTo(bx + nx * b, by + ny * b); ctx.lineTo(bx - nx * b, by - ny * b); ctx.lineTo(ax - nx * a, ay - ny * a); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay, a, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, b, 0, 7); ctx.fill();
  };
  if (!P.noInk) { ctx.fillStyle = P.ink || INK; draw(wa / 2 + lw, wb / 2 + lw); }
  ctx.fillStyle = col; draw(wa / 2, wb / 2);
}
function fillInk(ctx, col, P, lw) { ctx.fillStyle = col; ctx.fill(); if (!P.noInk) { ctx.strokeStyle = P.ink || INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); } }
// hard-edged two-tone fill: back part shaded, front part lit
function cel(ctx, x0, x1, shade, base, at = 0.42) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, shade); g.addColorStop(at, shade); g.addColorStop(at + 0.001, base); g.addColorStop(1, base); return g;
}
const joint = (x, y, a, l) => [x + Math.sin(a) * l, y + Math.cos(a) * l];

function head(ctx, type, hx, hy, r, o, P, lw) {
  ctx.save(); ctx.translate(hx, hy); if (o.tilt) ctx.rotate(o.tilt);
  const s = (pts) => pts.map(([x, y]) => [x * r, y * r]);
  // back hair (behind the face)
  if (type === 'teacher') { spline(ctx, s([[-1.05, 3.4], [-1.25, 0.6], [-1.1, -0.6], [-0.4, -1.2], [0.5, -1.1], [1.0, -0.5], [1.1, 0.6], [0.95, 3.0], [0, 3.6]])); fillInk(ctx, P.hair, P, lw); }
  if (type === 'girl' || type === 'kid') { spline(ctx, s([[-1.1, 0.95], [-1.2, -0.2], [-0.8, -1.05], [0.2, -1.2], [0.95, -0.7], [0.95, 0.3], [0.3, 0.95], [-0.5, 1.15]])); fillInk(ctx, P.hair, P, lw); }
  if (type === 'ratree') { ctx.beginPath(); ctx.arc(-1.05 * r, -0.55 * r, 0.48 * r, 0, 7); fillInk(ctx, P.hair, P, lw); }
  // face profile facing right (nose, lips, chin)
  const face = s([[-0.85, -0.25], [-0.72, -0.85], [0, -1.02], [0.72, -0.78], [0.93, -0.2], [1.03, 0.05], [0.96, 0.2], [1.14, 0.42], [0.97, 0.5], [1.0, 0.63], [0.9, 0.84], [0.45, 1.0], [-0.25, 0.8], [-0.7, 0.42]]);
  spline(ctx, face); ctx.fillStyle = cel(ctx, -r, r, P.skinS, P.skin, 0.38); fillInk(ctx, ctx.fillStyle, P, lw);
  if (!P.noInk && type !== 'nameless') {
    // eye, brow, ear
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0.6 * r, 0.04 * r, 0.12 * r, (type === 'girl' ? 0.16 : 0.08) * r, 0, 0, 7); ctx.fill();
    if (type === 'girl') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.63 * r, -0.02 * r, 0.04 * r, 0, 7); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.moveTo(0.42 * r, -0.22 * r); ctx.lineTo(0.85 * r, -0.2 * r); ctx.stroke();
    ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(-0.2 * r, 0.12 * r, 0.18 * r, -1.2, 1.6); ctx.stroke();
    if (type === 'man') { ctx.fillStyle = 'rgba(40,32,26,.16)'; ctx.beginPath(); ctx.ellipse(0.5 * r, 0.78 * r, 0.32 * r, 0.16 * r, 0.3, 0, 7); ctx.fill(); }
  }
  // front hair
  let hair;
  if (type === 'man') hair = [[-0.95, 0.35], [-1.08, -0.35], [-0.75, -1.05], [0.05, -1.25], [0.75, -0.98], [1.05, -0.55], [0.82, -0.42], [0.86, -0.15], [0.55, -0.42], [0.42, -0.12], [0.15, -0.45], [-0.15, -0.25], [-0.42, 0.05], [-0.6, 0.38]];
  else if (type === 'girl' || type === 'kid') hair = [[-0.9, 0.5], [-1.08, -0.4], [-0.7, -1.08], [0.15, -1.22], [0.9, -0.85], [1.06, -0.32], [0.82, -0.18], [0.55, -0.34], [0.2, -0.22], [-0.2, -0.3], [-0.35, 0.3]];
  else if (type === 'teacher') hair = [[-0.95, 0.4], [-1.05, -0.5], [-0.6, -1.12], [0.25, -1.2], [0.95, -0.75], [1.15, 0.1], [1.1, 1.3], [0.95, 2.7], [0.62, 2.85], [0.55, 1.1], [0.35, 0.0], [0.05, -0.3], [-0.35, 0.3]];
  else hair = [[-0.95, 0.2], [-1.0, -0.5], [-0.6, -1.05], [0.2, -1.12], [0.85, -0.78], [0.98, -0.42], [0.6, -0.55], [0.1, -0.58], [-0.4, -0.25]];
  spline(ctx, s(hair)); fillInk(ctx, P.hair, P, lw);
  // hair shine
  ctx.strokeStyle = P.hairH; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-0.05 * r, -0.2 * r, 0.82 * r, -2.3, -1.3); ctx.stroke();
  if (o.ribbon) {
    ctx.fillStyle = '#3d8bff'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    for (const a of [0.5, -0.5]) { ctx.beginPath(); ctx.ellipse(-0.95 * r, -0.62 * r, 0.42 * r, 0.22 * r, a, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(-0.95 * r, -0.62 * r, 0.1 * r, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function figure(ctx, type, h, o, P) {
  const ph = o.phase || 0, mv = o.moving ? 1 : 0, cr = o.crouch ? 1 : 0;
  const s = h / 170, lw = 1.5 * Math.max(0.8, s);
  const child = type === 'girl' || type === 'kid';
  const hr = h * (child ? 0.088 : type === 'teacher' ? 0.062 : 0.074);
  const hipY = -h * (0.5 - cr * 0.16), shY = -h * ((child ? 0.78 : 0.82) - cr * 0.22);
  const neck = type === 'teacher' ? h * 0.075 : h * 0.03;
  const sw = Math.sin(ph) * 0.55 * mv, crA = cr * 0.9;
  const thigh = h * 0.25, shin = h * 0.245, ua = h * 0.165, fa = h * 0.16;
  const legW = (child ? 9 : 12.5) * s, armW = (child ? 6.5 : 8) * s;
  const back = { leg: P.legS || P.skinS, arm: P.topS, skin: P.skinS }, front = { leg: P.leg || P.skin, arm: P.top, skin: P.skin };
  const sleeveShort = type === 'girl' || type === 'teacher' || type === 'ratree' || type === 'kid';

  const leg = (dir, c) => {
    const a1 = dir * sw - (dir < 0 ? crA : crA * 0.3), knee = joint(2 * s * -dir, hipY, a1, thigh);
    const a2 = dir * sw * 0.3 + (mv ? Math.max(0, dir * Math.sin(ph)) * -0.65 : 0) + (dir < 0 ? crA * 0.6 : crA);
    const foot = joint(knee[0], knee[1], a2, shin);
    const lc = type === 'girl' || type === 'kid' ? c.skin : c.leg;
    seg(ctx, 2 * s * -dir, hipY, knee[0], knee[1], legW, legW * 0.8, lc, P, lw);
    if (type === 'girl') { const m = [knee[0] + (foot[0] - knee[0]) * 0.45, knee[1] + (foot[1] - knee[1]) * 0.45]; seg(ctx, knee[0], knee[1], m[0], m[1], legW * 0.8, legW * 0.7, c.skin, P, lw); seg(ctx, m[0], m[1], foot[0], foot[1], legW * 0.72, legW * 0.62, P.sock, P, lw); }
    else seg(ctx, knee[0], knee[1], foot[0], foot[1], legW * 0.8, legW * 0.62, lc, P, lw);
    // shoe
    ctx.beginPath(); ctx.ellipse(foot[0] + 5 * s, foot[1] + 1, (child ? 7 : 9) * s, 4 * s, 0, 0, 7); fillInk(ctx, P.shoe, P, lw);
    if (type === 'teacher' || type === 'ratree') { ctx.fillStyle = P.shoe; ctx.fillRect(foot[0] - 2 * s, foot[1], 3 * s, 6 * s); }
  };
  const arm = (dir, c) => {
    const out = o.armOut && dir > 0;
    const a = out ? 1.45 : -dir * sw * 0.85 + (dir > 0 ? -0.05 : 0.08);
    const el = joint(3 * s * dir, shY + 5 * s, a, ua);
    const b = out ? 1.55 : -dir * sw * 0.3 + (dir > 0 ? -0.25 : 0.2) - (mv ? 0.35 : 0);
    const hand = joint(el[0], el[1], b, fa);
    if (sleeveShort) {
      const m = [3 * s * dir + (el[0] - 3 * s * dir) * 0.45, shY + 5 * s + (el[1] - shY - 5 * s) * 0.45];
      seg(ctx, 3 * s * dir, shY + 5 * s, m[0], m[1], armW * 1.25, armW * 1.15, c.arm, P, lw);
      seg(ctx, m[0], m[1], el[0], el[1], armW * 0.85, armW * 0.75, c.skin, P, lw);
      seg(ctx, el[0], el[1], hand[0], hand[1], armW * 0.75, armW * 0.6, c.skin, P, lw);
    } else {
      seg(ctx, 3 * s * dir, shY + 5 * s, el[0], el[1], armW * 1.15, armW, c.arm, P, lw);
      seg(ctx, el[0], el[1], hand[0], hand[1], armW, armW * 0.85, c.arm, P, lw);
    }
    ctx.beginPath(); ctx.arc(hand[0], hand[1], armW * 0.5, 0, 7); fillInk(ctx, c.skin, P, lw);
    return hand;
  };

  // back limbs (shaded)
  if (type !== 'teacher' && type !== 'ratree') leg(-1, back);
  arm(-1, back);
  // torso
  const tw = (child ? 12 : type === 'teacher' ? 11 : 15) * s;
  const torso = [[-tw, shY + 2], [-tw * 0.9, (shY + hipY) / 2], [-tw * 0.82, hipY + 6 * s], [tw * 0.86, hipY + 6 * s], [tw * 1.05, (shY + hipY) / 2], [tw, shY + 2], [tw * 0.3, shY - 3 * s], [-tw * 0.4, shY - 3 * s]];
  if (type === 'teacher' || type === 'ratree') {
    leg(-1, back); leg(1, front);
    const len = h * 0.41;
    poly(ctx, [[-12 * s, hipY - 8 * s], [12 * s, hipY - 8 * s], [16 * s + sw * 5, hipY + len], [-16 * s + sw * 5, hipY + len]]);
    fillInk(ctx, cel(ctx, -16 * s, 16 * s, P.skirtS, P.skirt), P, lw);
  }
  spline(ctx, torso); fillInk(ctx, cel(ctx, -tw, tw, P.topS, P.top), P, lw);
  if (type === 'man' && !P.noInk) {
    poly(ctx, [[tw * 0.35, shY + 4 * s], [tw * 0.9, shY + 6 * s], [tw * 0.78, hipY + 5 * s], [tw * 0.42, hipY + 5 * s]]); fillInk(ctx, P.inner, P, lw * 0.8); // shirt under open jacket
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(-tw * 0.6, shY + 10 * s); ctx.lineTo(-tw * 0.5, hipY); ctx.stroke(); // seam
  }
  if (type === 'girl' && !P.noInk) {
    // collar + navy skirt with pleats
    ctx.beginPath(); ctx.ellipse(tw * 0.25, shY + 3 * s, 7 * s, 3.5 * s, -0.2, 0, 7); fillInk(ctx, '#fff', P, lw * 0.8);
  }
  if (P.skirt && (type === 'girl' || type === 'kid')) {
    const len = h * 0.19;
    poly(ctx, [[-tw * 0.9, hipY - 6 * s], [tw * 0.95, hipY - 6 * s], [tw * 1.35 + sw * 5, hipY + len], [-tw * 1.3 + sw * 5, hipY + len]]);
    fillInk(ctx, cel(ctx, -tw * 1.3, tw * 1.35, P.skirtS, P.skirt), P, lw);
    if (!P.noInk) { ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = lw * 0.7; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * tw * 0.35, hipY - 2 * s); ctx.lineTo(i * tw * 0.5 + sw * 5, hipY + len - 1); ctx.stroke(); } }
  }
  if ((type === 'teacher' || type === 'ratree') && !P.noInk) {
    ctx.fillStyle = '#2c2619'; ctx.fillRect(-tw * 0.2, shY - 1, tw * 0.9, 3 * s); // shoulder board
    ctx.fillStyle = '#c9a44a'; ctx.fillRect(-tw * 0.1, shY, tw * 0.6, 1 * s);
    ctx.fillStyle = '#d8cfa8'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(tw * 0.75, shY + i * 9 * s, 1.2 * s, 0, 7); ctx.fill(); }
  }
  // front leg
  if (type !== 'teacher' && type !== 'ratree') leg(1, front);
  // neck + head
  const hx = (type === 'teacher' ? 4 : 2) * s, hy = shY - neck - hr * 0.95;
  seg(ctx, 0, shY + 2, hx * 0.7, hy + hr * 0.6, (type === 'teacher' ? 6 : 7.5) * s, 6.5 * s, P.skinS, P, lw);
  head(ctx, type, hx, hy, hr, o, P, lw);
  // front arm + held item
  const hand = arm(1, front);
  if (o.hold === 'light') { ctx.save(); ctx.translate(hand[0], hand[1]); ctx.fillStyle = INK; ctx.fillRect(-3 * s, -4 * s, 19 * s, 8 * s); ctx.fillStyle = '#5a5a5a'; ctx.fillRect(-2 * s, -3 * s, 16 * s, 6 * s); ctx.fillStyle = o.lightOn ? '#fff6cf' : '#777'; ctx.fillRect(14 * s, -4 * s, 3.5 * s, 8 * s); ctx.restore(); }
  if (o.hold === 'book') { ctx.save(); ctx.translate(hand[0], hand[1]); poly(ctx, [[-8 * s, -24 * s], [12 * s, -24 * s], [12 * s, 6 * s], [-8 * s, 6 * s]]); fillInk(ctx, '#5b1d16', P, lw); ctx.fillStyle = '#d9cfb2'; ctx.fillRect(10 * s, -22 * s, 2 * s, 26 * s); ctx.restore(); }
  if (o.reach) { seg(ctx, 4 * s, shY + 6 * s, 4 * s + h * 0.42 * o.reach, shY + 16 * s, armW, armW * 0.8, front.arm, P, lw); }
  return { handX: hand[0], handY: hand[1], headX: hx, headY: hy };
}

// Draw a character standing with feet at (x, y). Returns hand position in world space (for the flashlight).
export function drawChar(ctx, type, x, y, o = {}) {
  // world scale for everyone standing in a room; reflections/window silhouettes pass noScale (sized to their frame)
  const h = (o.h || BASE_H[type]) * (o.noScale ? 1 : CHAR_SCALE.v);
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(x, y);
  if (o.jitter) ctx.translate((Math.random() - 0.5) * o.jitter, (Math.random() - 0.5) * o.jitter * 0.4);
  ctx.scale(o.facing || 1, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // painted sprite when available; the procedural figure below is the fallback (and Ratree, who has no sprite)
  const spr = Sprites.draw(ctx, type, o, h);
  if (spr) { ctx.restore(); return { hx: x + spr.hx * (o.facing || 1), hy: y + spr.hy, headX: x, headY: y - h }; }
  if (type === 'nameless') {
    const t = o.t || 0;
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.globalAlpha = (o.alpha ?? 1) * (i ? 0.35 : 0.95);
      ctx.translate(Math.sin(t * 2.3 + i * 1.7) * 6 * i, Math.cos(t * 1.7 + i) * 3 * i);
      figure(ctx, 'man', h + i * 6, { ...o, armOut: false, hold: null }, GHOST); ctx.restore();
    }
    ctx.restore(); return null;
  }
  const P = PAL[type] || PAL.man;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 2, h * 0.17, h * 0.03, 0, 0, 7); ctx.fill();
  if (o.rim !== false && !P.noInk) {
    // rim light: whole figure in a pale tone, nudged back, under the body
    ctx.save(); ctx.translate(-2, -1.5);
    const rc = o.rimCol || 'rgba(170,190,215,.6)';
    figure(ctx, type, h, o, { skin: rc, skinS: rc, hair: rc, hairH: rc, top: rc, topS: rc, inner: rc, leg: rc, legS: rc, skirt: P.skirt ? rc : null, skirtS: rc, sock: rc, shoe: rc, ink: rc });
    ctx.restore();
  }
  const r = figure(ctx, type, h, o, P);
  if (type === 'teacher' && o.drip) { ctx.fillStyle = 'rgba(120,150,170,.6)'; for (let i = 0; i < 3; i++) { const dy = ((o.t * 120 + i * 40) % 90); ctx.fillRect(-10 + i * 9, -h * 0.1 + dy, 2, 5); } }
  ctx.restore();
  return { hx: x + r.handX * (o.facing || 1), hy: y + r.handY, headX: x + r.headX * (o.facing || 1), headY: y + r.headY };
}
