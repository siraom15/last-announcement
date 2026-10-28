// Procedural character silhouettes: jointed limbs + rim light, so they read in heavy darkness.
const PAL = {
  man: { skin: '#5e4b3f', hair: '#0b0a09', top: '#262820', arm: '#23251e', leg: '#16171b', shoe: '#0a0a0a' },
  girl: { skin: '#7a6a60', hair: '#070707', top: '#a9a89c', arm: '#7a6a60', leg: '#6a5d55', skirt: '#1b2236', shoe: '#111' },
  teacher: { skin: '#6e655d', hair: '#050505', top: '#6f6a5c', arm: '#6e655d', leg: '#4a4440', skirt: '#1a1716', shoe: '#0b0b0b' },
  kid: { skin: '#0c0d10', hair: '#050506', top: '#101216', arm: '#0c0d10', leg: '#0b0c0f', skirt: '#0b0c10', shoe: '#050505' },
};

function limb(ctx, x, y, a1, l1, a2, l2, w, col) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  const fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  return [fx, fy];
}

function figure(ctx, type, h, o, P) {
  const ph = o.phase || 0, mv = o.moving ? 1 : 0, cr = o.crouch ? 1 : 0;
  const s = h / 170;
  const hipY = -h * (0.5 - cr * 0.16), shY = -h * (0.83 - cr * 0.22), hr = h * 0.068;
  const neck = type === 'teacher' ? h * 0.07 : h * 0.025;
  const sw = Math.sin(ph) * 0.5 * mv;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const legL1 = h * 0.26, legL2 = h * 0.25;
  // back leg, back arm
  const crA = cr * 0.9;
  limb(ctx, 2 * s, hipY, -sw - crA, legL1, -sw * 0.3 + (mv ? Math.max(0, -Math.sin(ph)) * -0.6 : 0) + crA * 0.6, legL2, 11 * s, P.leg);
  const armA = o.armOut ? -1.45 : sw * 0.8 + 0.08;
  limb(ctx, -2 * s, shY + 4 * s, -armA * (o.armOut ? -1 : 1) * 0.6, h * 0.17, -sw * 0.3 + 0.2, h * 0.17, 7.5 * s, P.arm);
  // torso
  ctx.fillStyle = P.top; ctx.beginPath();
  ctx.moveTo(-13 * s, shY); ctx.quadraticCurveTo(-16 * s, (shY + hipY) / 2, -11 * s, hipY + 4 * s);
  ctx.lineTo(12 * s, hipY + 4 * s); ctx.quadraticCurveTo(17 * s, (shY + hipY) / 2, 13 * s, shY); ctx.closePath(); ctx.fill();
  if (P.skirt) {
    const len = type === 'teacher' ? h * 0.38 : h * 0.17;
    ctx.fillStyle = P.skirt; ctx.beginPath(); ctx.moveTo(-12 * s, hipY - 6 * s); ctx.lineTo(12 * s, hipY - 6 * s);
    ctx.lineTo(18 * s + sw * 6, hipY + len); ctx.lineTo(-18 * s + sw * 6, hipY + len); ctx.closePath(); ctx.fill();
  }
  // front leg
  limb(ctx, -2 * s, hipY, sw - crA * 0.3, legL1, sw * 0.3 + (mv ? Math.max(0, Math.sin(ph)) * -0.6 : 0) + crA, legL2, 11 * s, P.leg);
  // head
  const hx = (type === 'teacher' ? 4 : 2) * s, hy = shY - neck - hr * 0.9;
  ctx.strokeStyle = P.skin; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(0, shY + 2); ctx.lineTo(hx * 0.6, hy + hr * 0.6); ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); if (o.tilt) ctx.rotate(o.tilt);
  if (type === 'nameless') { ctx.fillStyle = P.top; ctx.beginPath(); ctx.ellipse(0, -hr * 0.4, hr * 0.85, hr * 1.7, 0, 0, 7); ctx.fill(); }
  else {
    ctx.fillStyle = P.skin; ctx.beginPath(); ctx.ellipse(0, 0, hr * 0.85, hr, 0, 0, 7); ctx.fill();
    ctx.fillStyle = P.hair; ctx.beginPath();
    if (type === 'teacher') { ctx.ellipse(0, hr * 0.2, hr * 1.05, hr * 1.25, 0, Math.PI * 1.05, Math.PI * 2.2); ctx.fill(); ctx.fillRect(-hr * 1.05, 0, hr * 2.1, hr * 2.6); }
    else if (type === 'girl' || type === 'kid') { ctx.ellipse(-hr * 0.15, -hr * 0.1, hr * 1.02, hr * 1.05, 0, Math.PI * 0.9, Math.PI * 2.15); ctx.fill(); ctx.fillRect(-hr * 1.1, -hr * 0.2, hr * 0.9, hr * 1.2); }
    else { ctx.ellipse(-hr * 0.1, -hr * 0.25, hr * 0.95, hr * 0.85, 0, Math.PI * 0.95, Math.PI * 2.1); ctx.fill(); }
    if (o.ribbon) { ctx.fillStyle = '#3d8bff'; ctx.beginPath(); ctx.ellipse(-hr * 0.9, -hr * 0.6, hr * 0.45, hr * 0.25, 0.5, 0, 7); ctx.ellipse(-hr * 0.9, -hr * 0.1, hr * 0.4, hr * 0.22, -0.5, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  // front arm (+ held item)
  const fa = o.armOut ? 1.45 : -sw * 0.8 - 0.05;
  const [hx2, hy2] = limb(ctx, 3 * s, shY + 4 * s, fa, h * 0.17, o.armOut ? 1.55 : sw * 0.3 - 0.2, h * 0.17, 7.5 * s, P.arm);
  if (o.hold === 'light') { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(hx2 - 2, hy2 - 4, 16 * s, 7 * s); ctx.fillStyle = o.lightOn ? '#fff4c8' : '#444'; ctx.fillRect(hx2 + 14 * s, hy2 - 4, 3 * s, 7 * s); }
  if (o.hold === 'book') { ctx.fillStyle = '#4a1712'; ctx.fillRect(hx2 - 6 * s, hy2 - 20 * s, 18 * s, 26 * s); }
  if (o.reach) { ctx.strokeStyle = P.arm; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(4 * s, shY + 6); ctx.lineTo(4 * s + h * 0.45 * o.reach, shY + 16 * s); ctx.stroke(); }
  return { headX: hx, headY: hy, handX: hx2, handY: hy2 };
}

// Draw a character standing with feet at (x, y). Returns hand position in world space (for the flashlight).
export function drawChar(ctx, type, x, y, o = {}) {
  const h = o.h || { man: 170, girl: 116, teacher: 236, nameless: 270, kid: 112 }[type];
  const P = type === 'nameless' ? { skin: '#000', hair: '#000', top: '#030303', arm: '#030303', leg: '#030303', skirt: null, shoe: '#000' } : PAL[type];
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(x, y);
  if (o.jitter) ctx.translate((Math.random() - 0.5) * o.jitter, (Math.random() - 0.5) * o.jitter * 0.4);
  ctx.scale(o.facing || 1, 1);
  if (type === 'nameless') {
    const t = o.t || 0;
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.globalAlpha = (o.alpha ?? 1) * (i ? 0.35 : 0.95);
      ctx.translate(Math.sin(t * 2.3 + i * 1.7) * 6 * i, Math.cos(t * 1.7 + i) * 3 * i);
      figure(ctx, 'nameless', h + i * 6, { ...o, armOut: false }, P); ctx.restore();
    }
    ctx.restore(); return null;
  }
  // soft contact shadow
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 2, h * 0.17, h * 0.03, 0, 0, 7); ctx.fill();
  // rim light pass: same figure in a pale tone, nudged backward, then the body over it
  if (o.rim !== false) {
    ctx.save(); ctx.translate(-1.6, -1.2);
    const rc = o.rimCol || 'rgba(150,170,190,.55)';
    figure(ctx, type, h, o, { skin: rc, hair: rc, top: rc, arm: rc, leg: rc, skirt: P.skirt ? rc : null, shoe: rc });
    ctx.restore();
  }
  const r = figure(ctx, type, h, o, P);
  if (type === 'teacher' && o.drip) { ctx.fillStyle = 'rgba(120,150,170,.6)'; for (let i = 0; i < 3; i++) { const dy = ((o.t * 120 + i * 40) % 90); ctx.fillRect(-10 + i * 9, -h * 0.12 + dy, 2, 5); } }
  ctx.restore();
  return { hx: x + r.handX * (o.facing || 1), hy: y + r.handY, headX: x + r.headX * (o.facing || 1), headY: y + r.headY };
}
