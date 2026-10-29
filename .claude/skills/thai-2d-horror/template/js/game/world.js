// Rooms: painted backdrop + dynamic layer + lights + interactive objects + exits.
// Objects: {id, x, kind:'door'|'use'|'hide', name, verb, to, toX, lock, act, show(S)}
import { G, W, H, FLOOR } from './ctx.js';
import * as P from '../engine/paint.js';
import { drawChar } from '../engine/chars.js';

const { WB, R } = P;
const S = () => G.S;
const f = (k) => !!(G.S && G.S.flags[k]);

// ── shared dynamic helpers ──────────────────────────────────────────
function rainGlass(ctx, rects, t) {
  if (G.room.painted || !rects) return; // painted art already shows the rain outside
  for (const [x, y, w, h] of rects) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(150,170,190,.22)'; ctx.lineWidth = 1;
    for (let i = 0; i < w / 5; i++) { const rx = x + ((i * 37.3) % w), ry = y + ((t * 420 + i * 53) % (h + 40)) - 20; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 14); ctx.stroke(); }
    if (G.fx.flash > 0.05) { ctx.fillStyle = `rgba(200,215,235,${G.fx.flash * 0.8})`; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
}
function clockNow(ctx, x, y, r = 26) {
  P.clockBody(ctx, x, y, r);
  if (f('clock317') || S().part >= 2) P.clockHands(ctx, x, y, r, 3, 17);
  else P.clockHands(ctx, x, y, r, 2, 40 + ((G.time / 30) | 0) % 20);
}
const flick = (t, k, dead = 0.15) => { const n = Math.sin(t * 13.1 + k * 7) + Math.sin(t * 31.7 + k * 3.1); return n > 1.6 - dead * 4 ? 0.15 : n < -1.75 ? 0 : 1; };
function exitSign(ctx, x, y) { P.box(ctx, x - 34, y, 68, 22, '#1d6b3a', '#0f3a20'); P.textOn(ctx, 'ทางออก ➜', x, y + 16, { size: 12, col: '#c8ffd8' }); }
export function waterLayer(ctx, w, t) {
  const lv = G.fx.water; if (lv <= 0) return;
  const top = H - lv;
  ctx.fillStyle = P.vgrad(ctx, top, H, ['rgba(40,55,60,.55)', 'rgba(10,18,22,.85)']); ctx.fillRect(G.cam - 20, top, W + 40, lv);
  ctx.strokeStyle = 'rgba(160,190,200,.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = G.cam - 20; x < G.cam + W + 20; x += 14) ctx.lineTo(x, top + Math.sin(x * 0.04 + t * 2) * 2.5);
  ctx.stroke();
}
export function kidsInRoom(ctx, t) {
  // Part 3: shadow children stand along corridors, facing the player
  if (S().part < 3) return;
  const room = G.room; if (!room.kids) return;
  for (const kx of room.kids) {
    const fac = G.player.x < kx ? -1 : 1;
    drawChar(ctx, 'kid', kx, FLOOR - 26, { facing: fac, alpha: 0.55 + Math.sin(t + kx) * 0.1, rim: false });
  }
}

// Fixtures as they sit in the painted backgrounds (world units: 1 unit = 2 px of the 1920×1080 panels)
const CAR_SCALE = 1.45; // procedural fallback car → matches CHAR_SCALE characters

// Painted car prop (assets/props/car_handprint.png). Measured on the 1983×793 source:
// body box, tire contact row, headlamp, and the front-door glass that carries the handprint.
const CAR = {
  src: 'assets/props/car_handprint.png', box: [27, 123, 1957, 764], lamp: [1905, 465],
  print: [1000, 176, 230, 176], clean: [700, 176],      // handprint glass, and the rear glass used to hide it
  x: 40, ground: 436, len: 560,                          // world: rear bumper x, tire line, bumper-to-bumper length (≈4.4 m)
  img: null, plain: null,
};
function carImages() {
  if (CAR.img === null) {
    CAR.img = false;
    const im = new Image();
    im.onload = () => {
      const [x0, y0, x1, y1] = CAR.box, w = x1 - x0, h = y1 - y0;
      const cut = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, -x0, -y0); return c; };
      const withPrint = cut(), plain = cut(), g = plain.getContext('2d');
      // before the brake scare the driver's window is clean: paint rear-window glass over the handprint
      const [px, py, pw, ph] = CAR.print, [cx, cy] = CAR.clean;
      g.drawImage(im, cx, cy, pw, ph, px - x0, py - y0, pw, ph);
      CAR.img = withPrint; CAR.plain = plain;
    };
    im.src = CAR.src;
  }
  return CAR.img ? CAR : null;
}
const carK = () => CAR.len / (CAR.box[2] - CAR.box[0]);
const carLamp = () => [CAR.x + (CAR.lamp[0] - CAR.box[0]) * carK(), CAR.ground - (CAR.box[3] - CAR.lamp[1]) * carK()];
const GATE_WINDOWS = [46, 225, 404, 590, 768, 947].map((x) => [x, 100, 130, 78]);
const LIB_MIRROR = [1315, 170, 110, 220];
const PA_MIRROR = [205, 148, 110, 183];

// ── rooms ──────────────────────────────────────────────────────────
const ROOMS = {
  road: {
    name: 'ถนนเข้าหมู่บ้าน', w: 2000, outdoor: true, reverb: 'out', floor: 'road', dark: 0.9,
    amb: { rainOut: 0.8, wind: 0.5, drone: 0.2 },
    paint(ctx, w) {
      P.nightSky(ctx, w); P.treeLine(ctx, w, 320, '#0b1014', 50); P.treeLine(ctx, w, 360, '#06090b', 40);
      for (const x of [480, 880, 1300, 1820]) P.palm(ctx, x, 380, R(0.8, 1.1));
      P.pole(ctx, 760, { horns: 0, w: 1 }); P.pole(ctx, 1560, { horns: 0, w: 1 });
      P.floorRoad(ctx, w); P.villageSign(ctx, 1080); P.car(ctx, 120, { lights: true });
    },
    fg(ctx) { if (!this.painted) P.fallenTree(ctx, 660); },
    dyn(ctx, t) {
      // painted car prop: tires on the road line, sized to the characters; handprint shows after the brake scare
      const car = this.painted && carImages();
      if (car) {
        const w = CAR.len, h = (CAR.box[3] - CAR.box[1]) * carK();
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(CAR.x + w / 2, CAR.ground + 2, w * 0.5, 9, 0, 0, 7); ctx.fill();
        ctx.drawImage(f('handprint') ? car.img : car.plain, CAR.x, CAR.ground - h, w, h);
        return;
      }
      // procedural fallback car (pivot: rear wheel on the ground)
      ctx.save(); if (this.painted) { ctx.translate(120, 470); ctx.scale(CAR_SCALE, CAR_SCALE); ctx.translate(-120, -470); P.car(ctx, 120, { lights: true }); }
      if (f('handprint')) { ctx.fillStyle = 'rgba(200,210,220,.25)'; for (const [dx, dy] of [[0, 0], [7, -9], [13, -11], [19, -9], [24, -3]]) { ctx.beginPath(); ctx.ellipse(270 + dx, 364 + dy, 2.5, 6, 0, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.ellipse(282, 378, 10, 9, 0, 0, 7); ctx.fill(); }
      ctx.restore();
    },
    lights() { const [lx, ly] = this.painted && CAR.img ? carLamp() : [650, 420]; return [{ x: lx + 40, y: ly + 20, r: f('headlights') ? 560 : 150, i: f('headlights') ? 0.95 : 0.35, c: '255,240,200', sy: 0.5 }]; },
    left: { block: 'ROAD_BACKBLOCK' }, right: { to: 'sala', x: 80 },
    objs: [
      { id: 'car', x: 400, kind: 'use', name: 'รถ', verb: 'ค้นในรถ', act: 'searchCar' }, // driver's door
      { id: 'tree', x: 640, kind: 'use', name: 'ต้นไม้ล้ม', verb: 'ดู', act: 'lookTree', show: () => !f('treeSeen') },
      { id: 'sign', x: 1130, kind: 'use', name: 'ป้ายหมู่บ้าน', verb: 'อ่าน', act: 'villageSign' },
    ],
  },

  sala: {
    name: 'ศาลาหมู่บ้าน', w: 1800, outdoor: true, reverb: 'out', floor: 'road', dark: 0.9,
    amb: { rainOut: 0.75, insects: 0.35, wind: 0.3, drone: 0.25 },
    paint(ctx, w) {
      if (this.variant === 'morning') P.nightSky(ctx, w, { morning: true }); else P.nightSky(ctx, w);
      P.treeLine(ctx, w, 330, this.variant ? '#3a403e' : '#0a0e12', 50); P.floorRoad(ctx, w);
      P.sala(ctx, 260); P.board(ctx, 420, 250, 120, 90);
      P.screwPlaque(ctx, 800, 160); P.box(ctx, 860, 350, 8, 50, '#3a3833', '#1a1916');
      P.board(ctx, 1000, 170, 260, 170); P.box(ctx, 1036, 190, 110, 80, '#a8a080', '#7a7258');
      ctx.strokeStyle = '#a81e14'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1050, 250); ctx.quadraticCurveTo(1090, 200, 1135, 205); ctx.stroke();
      P.box(ctx, 1170, 200, 72, 54, '#5a554a', '#3a362e'); P.textOn(ctx, 'ดาว', 1232, 250, { size: 10, col: '#2a261d' });
      P.pole(ctx, 1460, { horns: 2, w: 1 }); P.box(ctx, 1630, 300, 8, 100, '#3a3833', '#1a1916'); P.box(ctx, 1580, 260, 150, 50, '#2a3e33', '#18241d');
      P.textOn(ctx, 'โรงเรียนบ้านหนองน้ำใส ➜', 1655, 291, { size: 13, col: 'rgba(220,215,190,.8)' });
    },
    dyn(ctx, t) {
      if (this.variant === 'morning' && f('badPhoto')) { P.frame(ctx, 520, 270, 46, 60, { inner: '#55554c' }); }
    },
    lights: (t) => [{ x: 700, y: 120, r: 300, i: 0.75 * flick(t, 2, 0.3), c: '255,190,120' }],
    left: { to: 'road', x: 1920 }, right: { to: 'street', x: 80 },
    objs: [
      { id: 'notice', x: 480, kind: 'use', name: 'ตารางประกาศ', verb: 'อ่าน', act: 'salaNotice' },
      { id: 'plaque', x: 900, kind: 'use', name: 'ป้ายรายชื่อ', verb: 'ดู', act: 'plaque' },
      { id: 'map', x: 1090, kind: 'use', name: 'แผนที่หมู่บ้าน', verb: 'ดู', act: 'map' },
      { id: 'photo', x: 1205, kind: 'use', name: 'รูปหมู่นักเรียน', verb: 'ดู', act: 'groupPhoto' },
      { id: 'spk', x: 1460, kind: 'use', name: 'ลำโพงเสียงตามสาย', verb: 'ส่องดู', act: 'salaSpeaker' },
    ],
  },

  street: {
    name: 'บ้านของแม่', w: 1500, outdoor: true, reverb: 'out', floor: 'road', dark: 0.9,
    amb: { rainOut: 0.75, insects: 0.2, wind: 0.35, drone: 0.3 },
    paint(ctx, w) {
      P.nightSky(ctx, w); P.treeLine(ctx, w, 340, '#0a0e12', 40);
      ctx.fillStyle = '#080b0e'; ctx.beginPath(); ctx.moveTo(900, WB); ctx.quadraticCurveTo(1200, 230, 1500, 210); ctx.lineTo(1500, WB); ctx.fill();
      ctx.fillStyle = '#121518'; ctx.fillRect(1240, 170, 220, 60); for (let x = 1255; x < 1450; x += 30) { ctx.fillStyle = '#05070a'; ctx.fillRect(x, 182, 16, 18); }
      P.thaiHouse(ctx, 160); P.door(ctx, 440, { w: 90, h: 180, sign: '' }); P.floorRoad(ctx, w); P.palm(ctx, 850, 390, 0.9);
    },
    dyn(ctx, t) { if (S().part === 1 && f('p1end')) { /* path lit to school */ } },
    lights: (t) => [{ x: 440, y: 205, r: 160, i: f('blackout') ? 0 : 0.5 * flick(t, 5, 0.1), c: '255,200,130' }, { x: 1000, y: 150, r: 240, i: 0.35, c: '180,200,255' }],
    left: { to: 'sala', x: 1720 }, right: { to: 'school_gate', x: 80, lock: 'toSchool' },
    objs: [{ id: 'houseDoor', x: 470, kind: 'door', name: 'บ้านแม่', verb: 'เข้าบ้าน', to: 'living', toX: 90, lock: 'houseDoor' }],
  },

  living: {
    name: 'ห้องรับแขก', w: 1300, reverb: 'small', floor: 'wood', dark: 0.86,
    amb: { rainIn: 0.6, tick: 1, drone: 0.3 },
    paint(ctx, w) {
      P.wallWood(ctx, w); P.floorWood(ctx, w); P.door(ctx, 160, { w: 96, h: 220 });
      this.wins = [P.windowFrame(ctx, 470, 120, 130, 150, { bars: true })];
      P.sofa(ctx, 560); P.frame(ctx, 760, 120, 50, 64); P.frame(ctx, 830, 140, 40, 50, { tilt: 0.05 }); P.frame(ctx, 880, 115, 60, 44);
      P.table(ctx, 860, { w: 160, h: 70 }); P.tapeDeck(ctx, 885, WB - 74);
      ctx.fillStyle = 'rgba(160,140,110,.08)'; ctx.fillRect(860, WB - 60, 160, 6); // the clean tabletop
      P.box(ctx, 1030, WB + 22, 44, 12, '#ddd8c8', '#9a9688'); P.stairs(ctx, 1080, 'up'); P.bulb(ctx, 640, 40);
    },
    dyn(ctx, t) {
      clockNow(ctx, 360, 150); rainGlass(ctx, this.wins, t);
      if (f('plugged')) { ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(945, WB - 40); ctx.quadraticCurveTo(960, WB + 30, 985, WB + 26); ctx.stroke(); }
    },
    lights: (t) => [
      { x: 640, y: 50, r: 330, i: f('blackout') ? 0 : (f('clock317') ? 0.6 * flick(t, 1, 0.5) : 0.55 * flick(t, 1, 0.05)), c: '255,200,140' },
      { x: 535, y: 195, r: 150, i: 0.25, c: '150,175,210' },
      { x: 940, y: WB - 60, r: 90, i: f('tapePlaying') ? 0.5 : 0, c: '255,120,80' },
    ],
    objs: [
      { id: 'front', x: 90, kind: 'door', name: 'ประตูหน้าบ้าน', verb: 'ออกจากบ้าน', to: 'street', toX: 470, lock: 'frontDoor' },
      { id: 'clock', x: 360, kind: 'use', name: 'นาฬิกาแขวน', verb: 'ดู', act: 'livClock' },
      { id: 'photos', x: 760, kind: 'use', name: 'รูปถ่ายครอบครัว', verb: 'ดู', act: 'livPhotos' },
      { id: 'tape', x: 880, kind: 'use', name: 'เครื่องเล่นเทปของแม่', verb: 'กด PLAY', act: 'tapeM01', show: () => !f('m01') },
      { id: 'plug', x: 975, kind: 'use', name: 'ปลั๊กพ่วง', verb: 'เสียบปลั๊ก', act: 'plug', show: () => !f('plugged') },
      { id: 'up', x: 1170, kind: 'door', name: 'บันไดขึ้นชั้น 2', verb: 'ขึ้นบันได', to: 'hall2', toX: 150, lock: 'upstairs', sfx: 'stairs' },
    ],
  },

  hall2: {
    name: 'โถงชั้น 2', w: 1100, reverb: 'small', floor: 'wood', dark: 0.9,
    amb: { rainIn: 0.7, drone: 0.4 },
    paint(ctx, w) {
      P.wallWood(ctx, w); P.floorWood(ctx, w); P.stairs(ctx, 40, 'down');
      P.door(ctx, 520, { w: 96, h: 220 }); P.door(ctx, 820, { w: 96, h: 220, col: ['#4f3a2a', '#2e2116'] });
      P.box(ctx, 790, 120, 60, 20, '#8aa8c8', '#5a7898'); P.textOn(ctx, 'ห้องดาว', 820, 135, { size: 11, col: '#1a2430' });
      this.wins = [P.windowFrame(ctx, 960, 110, 100, 150)]; P.frame(ctx, 300, 130, 70, 50);
    },
    dyn(ctx, t) { rainGlass(ctx, this.wins, t); },
    lights: () => [{ x: 1010, y: 185, r: 170, i: 0.3, c: '150,175,210' }],
    objs: [
      { id: 'down', x: 150, kind: 'door', name: 'บันไดลงชั้นล่าง', verb: 'ลงบันได', to: 'living', toX: 1170, sfx: 'stairs' },
      { id: 'mom', x: 500, kind: 'door', name: 'ห้องแม่', verb: 'เข้าห้อง', to: 'mom_room', toX: 120 },
      { id: 'daow', x: 770, kind: 'door', name: 'ห้องดาว', verb: 'เข้าห้อง', to: 'daow_room', toX: 120 },
    ],
  },

  mom_room: {
    name: 'ห้องแม่', w: 1000, reverb: 'small', floor: 'wood', dark: 0.88,
    amb: { rainIn: 0.65, drone: 0.35 },
    paint(ctx, w) {
      P.wallWood(ctx, w); P.floorWood(ctx, w); P.door(ctx, 120, { w: 96, h: 220 });
      P.wardrobe(ctx, 230); P.frame(ctx, 470, 120, 80, 100, { inner: '#4a463c' });
      P.box(ctx, 600, 110, 100, 130, '#cfc8b0', '#9c947c'); P.textOn(ctx, 'มิถุนายน', 650, 132, { size: 12, col: '#5a1a14' });
      for (let i = 0; i < 28; i++) { ctx.fillStyle = 'rgba(40,40,40,.5)'; ctx.fillRect(608 + (i % 7) * 13, 145 + ((i / 7) | 0) * 20, 8, 8); }
      ctx.strokeStyle = '#a01810'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(612 + 5 * 13 + 4, 149, 9, 0, 7); ctx.stroke();
      P.textOn(ctx, '4', 698, 236, { size: 14, col: '#a01810' });
      P.table(ctx, 740, { w: 200, h: 76 }); P.paper(ctx, 760, WB - 92, 34, 12, 0.1);
      P.box(ctx, 860, WB - 110, 60, 30, '#5a3e22', '#2e1f10');
      this.wins = [P.windowFrame(ctx, 380, 280, 0.01, 0.01)];
    },
    dyn(ctx) { if (f('boxOpen')) { ctx.fillStyle = '#1a1209'; ctx.fillRect(860, WB - 122, 60, 12); } },
    lights: () => [{ x: 650, y: 80, r: 260, i: 0.35, c: '220,190,150' }],
    objs: [
      { id: 'out', x: 120, kind: 'door', name: 'โถงชั้น 2', verb: 'ออกจากห้อง', to: 'hall2', toX: 500 },
      { id: 'hide', x: 340, kind: 'hide', name: 'ตู้เสื้อผ้า', verb: 'ซ่อน' },
      { id: 'photo', x: 510, kind: 'use', name: 'ภาพถ่าย', verb: 'ดู', act: 'momPhoto' },
      { id: 'cal', x: 650, kind: 'use', name: 'ปฏิทิน', verb: 'ดู', act: 'calendar' },
      { id: 'note', x: 780, kind: 'use', name: 'บันทึกของแม่', verb: 'อ่าน', act: 'momNote' },
      { id: 'box', x: 890, kind: 'use', name: 'กล่องไม้ล็อกรหัส', verb: 'เปิด', act: 'lockbox', show: () => !f('boxOpen') },
    ],
  },

  daow_room: {
    name: 'ห้องดาว', w: 1000, reverb: 'small', floor: 'wood', dark: 0.9,
    amb: { rainIn: 0.6, drone: 0.45 },
    paint(ctx, w) {
      P.wallWood(ctx, w); P.floorWood(ctx, w); P.door(ctx, 120, { w: 96, h: 220, col: ['#4f3a2a', '#2e2116'] });
      P.box(ctx, 330, 110, 220, 150, '#b0a888', '#857e64', 'rgba(0,0,0,.5)');
      P.bed(ctx, 560); ctx.fillStyle = '#c9c4b8'; ctx.beginPath(); ctx.ellipse(610, WB - 48, 16, 20, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(604, WB - 74, 5, 14, -0.2, 0, 7); ctx.ellipse(616, WB - 74, 5, 14, 0.2, 0, 7); ctx.fill();
      P.box(ctx, 740, WB - 70, 50, 44, '#2a3a6a', '#16203a'); P.box(ctx, 752, WB - 60, 26, 10, '#ddd6c0', '#a8a28c', null);
      P.table(ctx, 830, { w: 130, h: 76, top: '#6a4a30' });
    },
    dyn(ctx) {
      P.familyDrawing(ctx, 370, 240, true);
      if (f('drawText')) P.textOn(ctx, 'คนที่ไม่ถูกเรียก จะยังอยู่ที่นี่', 440, 140, { size: 15, col: 'rgba(230,225,210,.85)', font: '"Noto Serif Thai", serif' });
      if (!S().inv.bell) { ctx.fillStyle = '#c0c4c8'; ctx.beginPath(); ctx.arc(880, WB - 92, 7, Math.PI, 0); ctx.fill(); ctx.fillRect(872, WB - 92, 16, 3); }
    },
    lights: () => [{ x: 880, y: WB - 92, r: 60, i: S().inv.bell ? 0 : 0.35, c: '180,200,230' }, { x: 440, y: 180, r: 200, i: 0.2, c: '170,180,200' }],
    objs: [
      { id: 'out', x: 120, kind: 'door', name: 'โถงชั้น 2', verb: 'ออกจากห้อง', to: 'hall2', toX: 770 },
      { id: 'draw', x: 440, kind: 'use', name: 'ภาพวาดบนผนัง', verb: 'ดู', act: 'drawing' },
      { id: 'tag', x: 730, kind: 'use', name: 'ป้ายชื่อกระเป๋า', verb: 'อ่าน', act: 'bagTag' },
      { id: 'bell', x: 880, kind: 'use', name: 'กระดิ่งจักรยาน', verb: 'เก็บ', act: 'bell', show: () => !S().inv.bell },
      { id: 'behind', x: 960, kind: 'use', name: 'หลังโต๊ะ', verb: 'ดู', act: 'behindDesk', show: () => S().inv.bell && !f('behindDesk') },
    ],
  },

  // ── PART 2 ─────────────────────────────────────────────────────────
  school_gate: {
    name: 'หน้าประตูโรงเรียน', w: 1600, outdoor: true, reverb: 'out', floor: 'road', dark: 0.92,
    amb: { rainOut: 0.85, wind: 0.5, drone: 0.4 },
    paint(ctx, w) {
      P.nightSky(ctx, w); this.wins = P.schoolFacade(ctx, 160, 1340); P.floorRoad(ctx, w); P.gate(ctx, 1100);
    },
    dyn(ctx, t) {
      if (G.fx.kids > 0) for (const [x, y, ww, hh] of (this.painted ? GATE_WINDOWS : this.wins)) { ctx.save(); ctx.globalAlpha = G.fx.kids; drawChar(ctx, 'kid', x + ww / 2, y + hh + 2, { h: 70, rim: false, alpha: 0.9, noScale: true }); ctx.restore(); }
    },
    lights: (t) => [{ x: 1225, y: 150, r: 200, i: 0.3 * flick(t, 9, 0.3), c: '200,210,180' }],
    left: { to: 'street', x: 1420 },
    objs: [{ id: 'gate', x: 1320, kind: 'door', name: 'ประตูโรงเรียน', verb: 'ไขกุญแจ', to: 'hall1', toX: 120, lock: 'gate', sfx: 'metal' }],
  },

  hall1: {
    name: 'โถงอาคารเรียน ชั้น 1', w: 2200, reverb: 'hall', floor: 'tile', dark: 0.93, school: true, kids: [700, 1250, 1600],
    amb: { rainIn: 0.5, fan: 0.4, buzz: 0.2, drone: 0.45 },
    paint(ctx, w) {
      P.wallSchool(ctx, w, { part3: S().part >= 3 }); P.floorTile(ctx, w);
      P.door(ctx, 170, { w: 130, h: 240, metal: true }); P.door(ctx, 600, { w: 100, h: 228, glass: true, sign: 'ป.3' });
      this.wins = [P.windowFrame(ctx, 300, 110, 120, 140, { bars: true }), P.windowFrame(ctx, 1230, 110, 120, 140, { bars: true }), P.windowFrame(ctx, 1640, 110, 120, 140, { bars: true })];
      P.board(ctx, 760, 130, 190, 130); P.lockers(ctx, 990, 4);
      P.door(ctx, 1450, { w: 100, h: 228, glass: true, sign: 'ห้องพยาบาล' }); P.stairs(ctx, 1880, 'up');
      P.textOn(ctx, 'ความรู้คู่คุณธรรม', 1100, 70, { size: 20, col: 'rgba(200,190,150,.5)', font: '"Noto Serif Thai", serif' });
      for (const x of [400, 900, 1400, 1900]) P.fluoFixture(ctx, x);
    },
    dyn(ctx, t) { clockNow(ctx, 1335, 130, 20); rainGlass(ctx, this.wins, t); exitSign(ctx, 1640, 120); exitSign(ctx, 2040, 60); },
    lights: (t) => [
      { x: 400, y: 56, r: 300, i: 0.5 * flick(t, 1, 0.4), c: '210,230,210', sy: 0.8 }, { x: 1400, y: 56, r: 300, i: 0.45 * flick(t, 3, 0.6), c: '210,230,210', sy: 0.8 },
      { x: 1640, y: 130, r: 110, i: f('chase') ? 0.8 : 0.3, c: '80,255,140' }, { x: 2040, y: 70, r: 110, i: f('chase') ? 0.8 : 0.3, c: '80,255,140' },
    ],
    objs: [
      { id: 'out', x: 120, kind: 'door', name: 'ประตูทางออก', verb: 'ออกไปข้างนอก', to: 'school_gate', toX: 1320, lock: 'leaveSchool', sfx: 'metal' },
      { id: 'p3', x: 600, kind: 'door', name: 'ห้อง ป.3', verb: 'เข้าห้อง', to: 'p3', toX: 100 },
      { id: 'board', x: 830, kind: 'use', name: 'บอร์ดประกาศ', verb: 'อ่าน', act: 'hallBoard' },
      { id: 'lock', x: 1145, kind: 'hide', name: 'ตู้ล็อกเกอร์', verb: 'ซ่อน' },
      { id: 'nurse', x: 1640, kind: 'door', name: 'ห้องพยาบาล', verb: 'เข้าห้อง', to: 'nurse', toX: 90 },
      { id: 'up', x: 2040, kind: 'door', name: 'บันไดขึ้นชั้น 2', verb: 'ขึ้นบันได', to: 'hall2s', toX: 110, sfx: 'stairs', lock: 'schoolUp' },
    ],
  },

  p3: {
    name: 'ห้องเรียน ป.3', w: 1500, reverb: 'small', floor: 'tile', dark: 0.9, school: true,
    amb: { rainIn: 0.55, fan: 0.6, drone: 0.5 },
    paint(ctx, w) {
      P.wallSchool(ctx, w, { part3: S().part >= 3 }); P.floorTile(ctx, w); P.door(ctx, 120, { w: 100, h: 228, glass: true });
      P.chalkboard(ctx, 480, 100, 520, 170); P.board(ctx, 1290, 120, 170, 130);
      this.wins = [P.windowFrame(ctx, 1080, 110, 140, 150, { bars: true })];
      P.table(ctx, 1080, { w: 190, h: 86, top: '#5a4028' }); P.paper(ctx, 1110, WB - 106, 40, 12, 0.05);
      for (let i = 0; i < 8; i++) { P.chair(ctx, 300 + i * 105, WB + 18, 0.72); P.studentDesk(ctx, 290 + i * 105, WB + 18, 0.75, String(17 + i).padStart(2, '0')); }
    },
    fg(ctx) { if (!this.painted) for (let i = 0; i < 8; i++) P.studentDesk(ctx, 240 + i * 112, WB + 128, 1.12, String(1 + i).padStart(2, '0')); },
    dyn(ctx, t) {
      clockNow(ctx, 560, 120, 20); rainGlass(ctx, this.wins, t);
      const bx = this.painted ? 670 : 700, by = this.painted ? 55 : 0;
      P.textOn(ctx, 'วันนี้มีนักเรียนมาเรียน', bx, 160 + by, { size: 22, col: 'rgba(235,235,225,.8)', font: '"Noto Serif Thai", serif' });
      const n = f('board23') ? '23' : '22';
      P.textOn(ctx, n + ' คน', bx + 60, 212 + by, { size: 34, col: f('board23') ? 'rgba(240,240,240,.95)' : 'rgba(235,235,225,.8)', font: '"Noto Serif Thai", serif' });
      if (!this.painted) for (let i = 0; i < 8; i++) P.studentDesk(ctx, 270 + i * 108, WB + 62, 0.92, String(9 + i).padStart(2, '0'));
      if (G.fx.chalkHand > 0) { ctx.fillStyle = `rgba(230,230,230,${G.fx.chalkHand})`; ctx.fillRect(bx + 112 + Math.sin(t * 30) * 6, 190 + by + Math.cos(t * 23) * 6, 6, 3); }
    },
    lights: (t) => [{ x: 740, y: 60, r: 340, i: 0.4 * flick(t, 4, 0.5), c: '200,225,205', sy: 0.8 }, { x: 1150, y: 185, r: 160, i: 0.25, c: '150,170,200' }],
    objs: [
      { id: 'out', x: 100, kind: 'door', name: 'โถงชั้น 1', verb: 'ออกจากห้อง', to: 'hall1', toX: 600 },
      { id: 'tags', x: 420, kind: 'use', name: 'ป้ายชื่อบนโต๊ะ', verb: 'ตรวจดู', act: 'deskTags' },
      { id: 'board', x: 670, kind: 'use', name: 'กระดานดำ', verb: 'ดู', act: 'chalkboard' },
      { id: 'drawer', x: 880, kind: 'use', name: 'ลิ้นชักโต๊ะครู', verb: 'ค้น', act: 'drawer' },
      { id: 'hide', x: 980, kind: 'hide', name: 'ใต้โต๊ะครู', verb: 'ซ่อน' },
      { id: 'activity', x: 1150, kind: 'use', name: 'บอร์ดกิจกรรม', verb: 'ดู', act: 'activityBoard' },
    ],
  },

  hall2s: {
    name: 'โถงชั้น 2', w: 2400, reverb: 'hall', floor: 'tile', dark: 0.95, school: true, kids: [900, 1500, 2100],
    amb: { rainIn: 0.55, buzz: 0.15, drone: 0.55 },
    paint(ctx, w) {
      P.wallSchool(ctx, w, { part3: S().part >= 3 }); P.floorTile(ctx, w); P.stairs(ctx, 40, 'down');
      P.door(ctx, 600, { w: 100, h: 228, glass: true, sign: 'ห้องสมุด' }); P.door(ctx, 1000, { w: 100, h: 228, glass: true, sign: 'ห้องดนตรี' });
      P.lockers(ctx, 1180, 4); P.door(ctx, 1650, { w: 116, h: 236, metal: true, sign: 'ห้องเก็บเอกสาร' }); P.cabinet(ctx, 1900, { w: 110, h: 200 });
      this.wins = [P.windowFrame(ctx, 780, 110, 110, 140, { bars: true }), P.windowFrame(ctx, 1420, 110, 110, 140, { bars: true }), P.windowFrame(ctx, 2140, 110, 110, 140, { bars: true })];
      for (const x of [500, 1100, 1700, 2250]) P.fluoFixture(ctx, x);
    },
    dyn(ctx, t) { clockNow(ctx, 1320, 140, 22); rainGlass(ctx, this.wins, t); exitSign(ctx, 110, 120); },
    lights: (t) => [{ x: 1100, y: 56, r: 300, i: 0.4 * flick(t, 6, 0.6), c: '210,230,210', sy: 0.8 }, { x: 2250, y: 56, r: 260, i: 0.3 * flick(t, 8, 0.7), c: '210,230,210', sy: 0.8 }, { x: 110, y: 130, r: 110, i: f('chase') ? 0.85 : 0.25, c: '80,255,140' }],
    right: { to: 'bridge', x: 80 },
    objs: [
      { id: 'down', x: 110, kind: 'door', name: 'บันไดลงชั้น 1', verb: 'ลงบันได', to: 'hall1', toX: 2040, sfx: 'stairs' },
      { id: 'lib', x: 455, kind: 'door', name: 'ห้องสมุด', verb: 'เข้าห้อง', to: 'library', toX: 90 },
      { id: 'music', x: 955, kind: 'door', name: 'ห้องดนตรี', verb: 'เปิดประตู', lock: 'music' },
      { id: 'lock', x: 1240, kind: 'hide', name: 'ตู้ล็อกเกอร์', verb: 'ซ่อน' },
      { id: 'arch', x: 1810, kind: 'door', name: 'ห้องเก็บเอกสาร', verb: 'เปิดประตู', to: 'archive', toX: 90, lock: 'archive', sfx: 'metal' },
      { id: 'cab', x: 2005, kind: 'hide', name: 'หลังตู้เอกสาร', verb: 'ซ่อน' },
    ],
  },

  library: {
    name: 'ห้องสมุด', w: 1500, reverb: 'small', floor: 'tile', dark: 0.93, school: true,
    amb: { rainIn: 0.45, drone: 0.55 },
    paint(ctx, w) {
      P.wallSchool(ctx, w, { part3: S().part >= 3 }); P.floorTile(ctx, w); P.door(ctx, 120, { w: 100, h: 228, glass: true });
      P.shelf(ctx, 230, { w: 240 }); P.shelf(ctx, 500, { w: 200 }); P.paper(ctx, 740, 180, 60, 70, -0.04);
      P.table(ctx, 920, { w: 260, h: 80 }); P.paper(ctx, 980, WB - 98, 46, 12, 0.08);
      P.cabinet(ctx, 1250, { w: 100, h: 150, drawers: 6 }); P.mirrorFrame(ctx, 1380, 100, 90, 230);
    },
    dyn(ctx, t) {
      clockNow(ctx, 860, 120, 22);
      if (G.fx.mirrorTeacher > 0) { ctx.save(); ctx.beginPath(); ctx.rect(...LIB_MIRROR); ctx.clip(); drawChar(ctx, 'teacher', LIB_MIRROR[0] + 60, LIB_MIRROR[1] + LIB_MIRROR[3] - 4, { facing: -1, alpha: G.fx.mirrorTeacher, h: 210, tilt: 0.3, hold: 'book', noScale: true }); ctx.restore(); }
      if (f('bookFell')) { P.box(ctx, 520, WB + 40, 46, 10, '#5a2a22', '#3a1814'); }
    },
    lights: (t) => [{ x: 1040, y: 60, r: 260, i: 0.3 * flick(t, 11, 0.5), c: '210,220,200', sy: 0.8 }, { x: LIB_MIRROR[0] + 55, y: 280, r: 170, i: G.fx.mirrorTeacher > 0 ? 0.8 : 0, c: '160,185,210' }],
    objs: [
      { id: 'out', x: 90, kind: 'door', name: 'โถงชั้น 2', verb: 'ออกจากห้อง', to: 'hall2s', toX: 455 },
      { id: 'books', x: 300, kind: 'use', name: 'หนังสือเรียนบนชั้น', verb: 'ดู', act: 'books' },
      { id: 'drown', x: 500, kind: 'use', name: 'หนังสือเล่มหนึ่ง', verb: 'หยิบอ่าน', act: 'drownBook', show: () => !f('drownRead') },
      { id: 'note', x: 690, kind: 'use', name: 'กระดาษติดผนัง', verb: 'อ่าน', act: 'libNote' },
      { id: 'reg2', x: 820, kind: 'use', name: 'สมุดทะเบียน', verb: 'เก็บ', act: 'reg2', show: () => !S().inv.reg2 },
      { id: 'hide', x: 920, kind: 'hide', name: 'ใต้โต๊ะอ่านหนังสือ', verb: 'ซ่อน' },
      { id: 'cab', x: 1210, kind: 'use', name: 'ตู้เหล็กล็อกรหัส', verb: 'ใส่รหัส', act: 'cardCabinet', show: () => !S().inv.card },
    ],
  },

  nurse: {
    name: 'ห้องพยาบาล', w: 1100, reverb: 'small', floor: 'tile', dark: 0.9, school: true,
    amb: { rainIn: 0.5, drone: 0.4 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w, '#55605a', '#3a443e'); P.floorTile(ctx, w); P.door(ctx, 120, { w: 100, h: 228, glass: true });
      P.bed(ctx, 220); P.curtain(ctx, 460, 110); P.bed(ctx, 590); P.cabinet(ctx, 900, { w: 120, h: 220, drawers: 3 });
      P.box(ctx, 930, 150, 60, 40, '#ddd', '#aaa'); P.textOn(ctx, '+', 960, 182, { size: 30, col: '#a01810' });
    },
    dyn() {},
    lights: (t) => [{ x: 600, y: 60, r: 280, i: 0.3 * flick(t, 12, 0.3), c: '220,240,230', sy: 0.8 }],
    objs: [
      { id: 'out', x: 90, kind: 'door', name: 'โถงชั้น 1', verb: 'ออกจากห้อง', to: 'hall1', toX: 1640, lock: 'nurseOut' },
      { id: 'hide', x: 1020, kind: 'hide', name: 'ตู้เหล็ก', verb: 'ซ่อน' },
      { id: 'cab', x: 880, kind: 'use', name: 'ตู้ยา', verb: 'เปิด', act: 'nurseCabinet' },
    ],
  },

  archive: {
    name: 'ห้องเก็บเอกสาร', w: 1200, reverb: 'small', floor: 'tile', dark: 0.94, school: true,
    amb: { rainIn: 0.35, drone: 0.6 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w); P.floorTile(ctx, w); P.door(ctx, 120, { w: 116, h: 236, metal: true });
      for (let i = 0; i < 4; i++) P.cabinet(ctx, 240 + i * 100, { w: 92, h: 190 });
      P.paper(ctx, 680, 170, 56, 70, 0.03); P.table(ctx, 780, { w: 200, h: 80 }); P.tapeDeck(ctx, 820, WB - 84);
      P.wardrobe(ctx, 1030, { w: 110, h: 240 });
    },
    dyn() {},
    lights: () => [{ x: 850, y: WB - 70, r: 100, i: f('archPower') ? 0.55 : 0, c: '255,150,90' }, { x: 600, y: 60, r: 220, i: f('archPower') ? 0.35 : 0.08, c: '220,220,200' }],
    objs: [
      { id: 'out', x: 90, kind: 'door', name: 'โถงชั้น 2', verb: 'ออกจากห้อง', to: 'hall2s', toX: 1810, sfx: 'metal' },
      { id: 'files', x: 390, kind: 'use', name: 'ตู้เอกสาร', verb: 'ค้น', act: 'files' },
      { id: 'note', x: 710, kind: 'use', name: 'กระดาษบนผนัง', verb: 'อ่าน', act: 'archNote' },
      { id: 'deck', x: 850, kind: 'use', name: 'เครื่องเล่นเทปหลัก', verb: 'เปิดเทป', act: 'archDeck' },
      { id: 'hide', x: 1085, kind: 'hide', name: 'ตู้เหล็ก', verb: 'ซ่อน' },
    ],
  },

  bridge: {
    name: 'ทางเชื่อมอาคาร', w: 1600, reverb: 'hall', floor: 'tile', dark: 0.94, school: true, kids: [400, 1000],
    amb: { rainOut: 0.45, rainIn: 0.4, wind: 0.4, drone: 0.55 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w, '#4a4b42', '#33342e'); P.floorTile(ctx, w);
      this.wins = []; for (let x = 160; x < w - 100; x += 230) if (Math.abs(x - 600) > 120 && Math.abs(x - 1300) > 120) this.wins.push(P.windowFrame(ctx, x, 100, 130, 170, { bars: true }));
      P.door(ctx, 600, { w: 100, h: 228, sign: 'ห้องควบคุมไฟ', metal: true }); P.door(ctx, 1300, { w: 110, h: 232, sign: 'ห้องประชาสัมพันธ์' });
      P.hornSpeaker(ctx, 1300, 60, -1, 0.8);
    },
    dyn(ctx, t) { rainGlass(ctx, this.wins, t); },
    lights: (t) => [{ x: 1300, y: 60, r: 220, i: 0.25 * flick(t, 13, 0.4), c: '230,200,160' }],
    left: { to: 'hall2s', x: 2320 },
    objs: [
      { id: 'ctrl', x: 535, kind: 'door', name: 'ห้องควบคุมไฟ', verb: 'เข้าห้อง', to: 'control', toX: 110, sfx: 'metal' },
      { id: 'pa', x: 1255, kind: 'door', name: 'ห้องประชาสัมพันธ์', verb: 'เข้าห้อง', to: 'pa_room', toX: 90, lock: 'paDoor' },
    ],
  },

  control: {
    name: 'ห้องควบคุมไฟ', w: 900, reverb: 'small', floor: 'tile', dark: 0.95, school: true,
    amb: { rainIn: 0.3, buzz: 0.3, drone: 0.5 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w, '#4a4a44', '#2e2e2a'); P.floorTile(ctx, w); P.door(ctx, 120, { w: 100, h: 228, metal: true });
      P.fuseBox(ctx, 420); P.shelf(ctx, 640, { w: 120, h: 200 }); P.wardrobe(ctx, 790, { w: 90, h: 230 });
    },
    dyn(ctx) {
      const sw = S().flags.sw || {};
      [1, 2, 3, 4].forEach((n, i) => { ctx.fillStyle = sw[n] ? '#7dff9a' : '#40201a'; if (this.painted) ctx.fillRect(272 + i * 51, 300, 12, 6); else ctx.fillRect(448, 172 + i * 42, 16, 8); });
    },
    lights: () => { const sw = S().flags.sw || {}; return [{ x: 355, y: 260, r: 140, i: Object.values(sw).some(Boolean) ? 0.45 : 0.1, c: '150,255,170' }]; },
    objs: [
      { id: 'out', x: 110, kind: 'door', name: 'ทางเชื่อม', verb: 'ออกจากห้อง', to: 'bridge', toX: 535, sfx: 'metal' },
      { id: 'breaker', x: 355, kind: 'use', name: 'ตู้ควบคุมไฟ', verb: 'เปิดตู้', act: 'breaker' },
      { id: 'fuse', x: 600, kind: 'use', name: 'ชั้นอะไหล่', verb: 'ค้น', act: 'fuseShelf', show: () => !S().inv.fuse && !f('fuseIn') },
      { id: 'hide', x: 800, kind: 'hide', name: 'ตู้เหล็ก', verb: 'ซ่อน' },
    ],
  },

  pa_room: {
    name: 'ห้องประชาสัมพันธ์', w: 1200, reverb: 'small', floor: 'tile', dark: 0.93, school: true,
    amb: { rainIn: 0.35, buzz: 0.25, drone: 0.6 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w, '#4b463c', '#332f28'); P.floorTile(ctx, w); P.door(ctx, 120, { w: 110, h: 232 });
      P.mirrorFrame(ctx, 260, 100, 110, 240); P.micDesk(ctx, 620); P.tapeDeck(ctx, 700, WB - 98);
      P.wiringPanel(ctx, 900); P.hornSpeaker(ctx, 620, 70, -1, 0.7); P.hornSpeaker(ctx, 680, 70, 1, 0.7);
    },
    dyn(ctx, t) {
      clockNow(ctx, 560, 115, 18);
      const [mx, my, mw, mh] = PA_MIRROR;
      if (G.fx.mirrorNameless > 0 || G.fx.mirrorKids > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
        for (let i = 0; i < G.fx.mirrorKids; i++) drawChar(ctx, 'kid', mx + 12 + i * 16, my + mh - 4 - (i % 2) * 6, { h: 80, alpha: 0.7, rim: false, noScale: true });
        if (G.fx.mirrorNameless > 0) drawChar(ctx, 'nameless', mx + mw / 2, my + mh + 6, { alpha: G.fx.mirrorNameless, t, h: 200, noScale: true });
        ctx.restore();
      }
      const pa = S().flags.pa || {};
      const lamp = (x, y, on) => { ctx.fillStyle = on ? '#ffcf6a' : '#3a2416'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); };
      if (this.painted) [pa.mic, pa.tape, pa.mixer, pa.amp, pa.school && pa.village].forEach((on, i) => lamp(1004 + i * 40, 190, on));
      else { lamp(1070, 146, pa.mic); lamp(1070, 186, pa.tape); lamp(1070, 236, pa.mixer); lamp(1070, 276, pa.amp); lamp(1070, 316, pa.school && pa.village); }
    },
    lights: (t) => { const pa = S().flags.pa || {}; return [{ x: PA_MIRROR[0] + 55, y: 240, r: 170, i: (G.fx.mirrorNameless > 0 || G.fx.mirrorKids > 0) ? 0.75 : 0, c: '160,185,210' }, { x: 560, y: WB - 90, r: 180, i: f('paPower') ? 0.55 : 0.12, c: '255,170,90' }, { x: 1080, y: 230, r: 140, i: f('paPower') ? 0.4 : 0.05, c: '255,210,120' }, { x: 600, y: 50, r: 320, i: f('dawn') ? 1 : 0.15 * flick(t, 15, 0.6), c: f('dawn') ? '255,190,120' : '220,220,200' }]; },
    objs: [
      { id: 'out', x: 90, kind: 'door', name: 'ทางเชื่อม', verb: 'ออกจากห้อง', to: 'bridge', toX: 1255, lock: 'paOut' },
      { id: 'mirror', x: 260, kind: 'use', name: 'กระจกเงา', verb: 'มอง', act: 'paMirror' },
      { id: 'note', x: 420, kind: 'use', name: 'ข้อความของแม่', verb: 'อ่าน', act: 'momNote2', show: () => f('paArrived') },
      { id: 'mic', x: 590, kind: 'use', name: 'ไมโครโฟน', verb: 'เริ่มประกาศ', act: 'mic' },
      { id: 'tape', x: 500, kind: 'use', name: 'เครื่องเล่นเทป', verb: 'ดู', act: 'paTape' },
      { id: 'wire', x: 1080, kind: 'use', name: 'แผงเดินสัญญาณ', verb: 'ต่อสาย', act: 'wiring' },
    ],
  },

  // ── cutscene-only rooms ────────────────────────────────────────────
  flashback: {
    name: '17 ต.ค. 2553', w: 960, outdoor: true, reverb: 'out', floor: 'water', dark: 0.8,
    amb: { rainOut: 1, water: 1, wind: 0.6, drone: 0.6 },
    paint(ctx, w) {
      P.nightSky(ctx, w); P.schoolFacade(ctx, 40, 900);
      ctx.fillStyle = P.vgrad(ctx, 340, H, ['#1a2a30', '#0a1418']); ctx.fillRect(0, 340, w, H - 340);
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.moveTo(560, 430); ctx.lineTo(900, 430); ctx.lineTo(860, 470); ctx.lineTo(590, 470); ctx.fill();
    },
    dyn(ctx, t) { ctx.strokeStyle = 'rgba(150,180,190,.2)'; for (let y = 360; y < H; y += 18) { ctx.beginPath(); for (let x = 0; x < 960; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 3 + y) * 3); ctx.stroke(); } },
    lights: () => [{ x: 700, y: 300, r: 380, i: 0.6, c: '255,220,170' }],
    objs: [],
  },
  city: {
    name: 'สามเดือนต่อมา', w: 960, reverb: 'small', floor: 'wood', dark: 0.85,
    amb: { rainIn: 0.3, buzz: 0.2 },
    paint(ctx, w) {
      P.wallPlaster(ctx, w, '#5a5a56', '#3e3e3a'); P.floorWood(ctx, w);
      const win = P.windowFrame(ctx, 120, 100, 200, 180);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,${200 + R(0, 50)},120,${R(0.3, 0.8)})`; ctx.fillRect(win[0] + R(0, 200), win[1] + R(80, 180), 3, 3); }
      P.table(ctx, 420, { w: 180, h: 76 }); P.tapeDeck(ctx, 450, WB - 82); P.mirrorFrame(ctx, 700, 110, 110, 230);
    },
    dyn(ctx, t) {
      if (G.fx.mirrorGirl <= 0) return;
      // painted flat: she stands by the hallway door behind him; procedural: reflected in the mirror
      if (this.painted) { drawChar(ctx, 'girl', 830, FLOOR - 6, { h: 108, alpha: G.fx.mirrorGirl * 0.75, facing: -1, rim: false }); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(700, 110, 110, 230); ctx.clip(); drawChar(ctx, 'girl', 790, 352, { h: 100, alpha: G.fx.mirrorGirl, rim: false, noScale: true }); ctx.restore();
    },
    lights: () => [{ x: 520, y: 60, r: 340, i: 0.6, c: '255,220,170' }],
    objs: [],
  },
  school_dawn: {
    name: 'รุ่งเช้า', w: 1600, outdoor: true, reverb: 'out', floor: 'road', dark: 0.25,
    amb: { insects: 0.15, wind: 0.2 },
    paint(ctx, w) { P.nightSky(ctx, w, { dawn: true }); P.schoolFacade(ctx, 160, 1340); P.floorRoad(ctx, w); P.gate(ctx, 1100); },
    dyn() {},
    lights: () => [{ x: 1300, y: 200, r: 700, i: 1, c: '255,190,130' }],
    objs: [],
  },
};

for (const [id, r] of Object.entries(ROOMS)) r.id = id;

export const World = {
  rooms: ROOMS,
  get(id) { return ROOMS[id]; },
  // x of the door in room a that leads to room b (for muffled cross-room sound / AI pathing)
  doorTo(a, b) {
    const r = ROOMS[a]; if (!r) return null;
    const d = r.objs.find((o) => o.kind === 'door' && o.to === b); if (d) return d.x;
    if (r.left && r.left.to === b) return 0;
    if (r.right && r.right.to === b) return r.w;
    return null;
  },
  exits(id) {
    const r = ROOMS[id], out = [];
    for (const o of r.objs) if (o.kind === 'door' && o.to) out.push({ x: o.x, to: o.to, toX: o.toX });
    if (r.left && r.left.to) out.push({ x: 30, to: r.left.to, toX: r.left.x });
    if (r.right && r.right.to) out.push({ x: r.w - 30, to: r.right.to, toX: r.right.x });
    return out;
  },
  // first step (exit) on the shortest path from room a to room b
  route(a, b) {
    if (a === b) return null;
    const prev = { [a]: null }, q = [a];
    while (q.length) {
      const c = q.shift(); if (c === b) break;
      for (const e of this.exits(c)) if (!(e.to in prev)) { prev[e.to] = { from: c, e }; q.push(e.to); }
    }
    if (!(b in prev)) return null;
    let n = b; while (prev[n] && prev[n].from !== a) n = prev[n].from;
    return prev[n] ? prev[n].e : null;
  },
};
