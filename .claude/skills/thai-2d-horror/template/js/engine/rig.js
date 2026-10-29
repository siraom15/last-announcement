// Pakin cut-out rig built from the painted parts sheet (assets/sprites/pakin/parts.png).
// Legs bend at hip and knee and step one at a time; the near arm swings opposite the front leg
// and lifts forward to hold the flashlight; crouching folds the legs and leans the torso.
// All part coordinates are pixels on the parts sheet; the rig is scaled to the requested height.

const SHEET = new URL('../../assets/sprites/pakin/parts.png', import.meta.url).href;
// [x, y, w, h] of each piece on the sheet, and its joints in piece-local pixels
const PARTS = {
  head: { box: [106, 89, 224, 271], neck: [96, 256], scale: 0.8 }, // drawn larger than the body on the sheet
  torso: { box: [471, 12, 273, 405], neck: [124, 20], shoulder: [126, 66], hipF: [146, 328], hipB: [128, 326] },
  arm: { box: [1219, 56, 125, 379], shoulder: [60, 24], hand: [80, 342] },
  thighF: { box: [862, 455, 136, 330], top: [70, 14], knee: [66, 314] },
  shinF: { box: [1212, 460, 194, 334], knee: [62, 14], sole: 334 },
  thighB: { box: [133, 792, 133, 277], top: [68, 12], knee: [64, 266], scale: 1.19 },
  shinB: { box: [520, 795, 200, 273], knee: [64, 12], sole: 273, scale: 1.2 },
  light: { box: [863, 908, 141, 59], grip: [34, 30], lens: [140, 28] },
};
const HEIGHT_PX = 1108; // standing height in sheet pixels (hair top to soles), measured on tools/rigref.html

let rig = null;

function crop(img, [x, y, w, h], tint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, w, h); }
  return c;
}

export function loadRig() {
  if (rig !== null) return;
  rig = false;
  const img = new Image();
  img.onload = () => {
    const r = {};
    for (const [k, p] of Object.entries(PARTS)) {
      r[k] = { ...p, img: crop(img, p.box, k === 'thighB' || k === 'shinB' ? 'rgba(0,0,0,.28)' : null), rim: crop(img, p.box, 'rgba(175,195,220,1)') };
      if (r[k].rim) { const g = r[k].rim.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(img, p.box[0], p.box[1], p.box[2], p.box[3], 0, 0, p.box[2], p.box[3]); }
    }
    rig = r;
  };
  img.src = SHEET;
}
export const rigReady = () => !!rig;

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// Pose from gameplay state. Angles: 0 = limb hanging straight down, positive = swings backward (clockwise).
function pose(o) {
  const t = o.t || 0, ph = o.phase || 0, mv = o.moving ? 1 : 0, run = o.running && mv ? 1 : 0, cr = o.crouch ? 1 : 0;
  const amp = mv ? (run ? 0.62 : cr ? 0.28 : 0.42) * (o.stride ?? 1) : 0;
  const leg = (p) => {
    const s = Math.sin(p);
    // thigh swings forward (negative) and back; knee bends while the leg passes forward through the air
    let thigh = -amp * s;
    let knee = mv ? (run ? 0.25 : 0.1) + (run ? 1.1 : 0.7) * Math.max(0, Math.cos(p)) * (mv ? 1 : 0) : 0.04;
    if (cr) { thigh = thigh * 0.8 - 0.72; knee = knee * 0.5 + 1.02; } // half-squat: shin stays near vertical so the shoe stays flat
    return { thigh, knee };
  };
  const lean = cr ? 0.26 : run ? 0.14 : mv ? 0.04 : 0;
  let arm;
  if (o.lightOn || o.armOut) arm = -1.48 + (mv ? Math.sin(ph) * 0.05 : Math.sin(t * 1.3) * 0.02) - lean; // held out in front
  else arm = mv ? amp * 0.9 * Math.sin(ph) + 0.06 : 0.05 + Math.sin(t * 1.6) * 0.015;
  return { F: leg(ph), B: leg(ph + Math.PI), lean, arm, breathe: mv ? 0 : Math.sin(t * 1.8) * 3 };
}

// Draw at feet origin in local space (facing already applied). Returns flashlight lens in local units.
export function drawRig(ctx, h, o) {
  if (!rig) return null;
  const k = h / HEIGHT_PX, P = pose(o), R = rig;
  const legChain = (thighP, shinP, a) => {
    const ts = thighP.scale || 1, ss = shinP.scale || 1;
    const kneeAt = rot((thighP.knee[0] - thighP.top[0]) * ts, (thighP.knee[1] - thighP.top[1]) * ts, a.thigh);
    const soleAt = rot(0, (shinP.sole - shinP.knee[1]) * ss, a.thigh + a.knee);
    return { kneeAt, foot: [kneeAt[0] + soleAt[0], kneeAt[1] + soleAt[1]] };
  };
  const lf = legChain(R.thighF, R.shinF, P.F), lb = legChain(R.thighB, R.shinB, P.B);
  // hip height so the lower foot rests on the floor
  const hipY = -Math.max(lf.foot[1], lb.foot[1]);
  const hipX = -(lf.foot[0] + lb.foot[0]) * 0.5 * (o.moving ? 0.25 : 0.6);

  const part = (p, img, ax, ay, ox, oy, a, s = 1) => { // draw piece p with its pivot (ox,oy) at (ax,ay), rotated a
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.scale(s, s); ctx.drawImage(img, -ox, -oy); ctx.restore();
  };
  const body = (which, dx = 0, dy = 0) => {
    ctx.save(); ctx.scale(k, k); ctx.translate(hipX + dx, hipY + dy);
    // back leg
    const b = (p) => (which === 'rim' ? R[p].rim : R[p].img);
    part(R.thighB, b('thighB'), -6, 0, ...R.thighB.top, P.B.thigh, R.thighB.scale);
    part(R.shinB, b('shinB'), -6 + lb.kneeAt[0], lb.kneeAt[1], ...R.shinB.knee, P.B.thigh + P.B.knee, R.shinB.scale);
    // front leg
    part(R.thighF, b('thighF'), 6, 0, ...R.thighF.top, P.F.thigh);
    part(R.shinF, b('shinF'), 6 + lf.kneeAt[0], lf.kneeAt[1], ...R.shinF.knee, P.F.thigh + P.F.knee);
    // torso pivots at the hip; head and arm ride on it
    ctx.rotate(P.lean);
    const T = R.torso, hx = T.hipF[0], hy = T.hipF[1];
    ctx.drawImage(b('torso'), -hx, -hy + P.breathe * 0.3);
    const neck = [T.neck[0] - hx, T.neck[1] - hy + P.breathe * 0.3], sh = [T.shoulder[0] - hx, T.shoulder[1] - hy + P.breathe * 0.4];
    part(R.head, b('head'), neck[0], neck[1] + 6, ...R.head.neck, -P.lean * 0.6 + (o.lightOn ? -0.05 : 0), R.head.scale);
    // flashlight sits in the hand, drawn just under the arm so the fingers wrap it
    const A = R.arm, hand = rot(A.hand[0] - A.shoulder[0], A.hand[1] - A.shoulder[1], P.arm);
    const handAt = [sh[0] + hand[0], sh[1] + hand[1]];
    if (o.hold === 'light') part(R.light, b('light'), handAt[0], handAt[1], ...R.light.grip, P.arm + Math.PI / 2 - 0.05, 0.9);
    part(A, b('arm'), sh[0], sh[1], ...A.shoulder, P.arm);
    ctx.restore();
    return { handAt, sh };
  };
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(0, 1, h * 0.2, h * 0.025, 0, 0, 7); ctx.fill();
  const base = ctx.globalAlpha;
  if (o.rim !== false) { ctx.globalAlpha = base * 0.55; body('rim', -14, -10); ctx.globalAlpha = base; }
  const { handAt } = body('img');
  ctx.restore();
  // lens position (local units): from the hand along the flashlight
  const L = R.light, dir = P.arm + Math.PI / 2 - 0.05, len = (L.lens[0] - L.grip[0]) * 0.9;
  const lens = [handAt[0] + Math.cos(dir) * len, handAt[1] + Math.sin(dir) * len];
  const [lx, ly] = rot(lens[0], lens[1], P.lean);
  return { hx: (hipX + lx) * k, hy: (hipY + ly) * k };
}
