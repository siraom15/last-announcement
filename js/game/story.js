// Story director: scenes, object actions, locks, triggers, checkpoints, endings (GDD §6–§9, §13).
import { G, W, wait, cut, fadeTo, tween, rand, clamp } from './ctx.js';
import { LINES, SPEAKERS } from '../data/lines.js';
import { NAMES, ITEMS } from '../data/names.js';
import { Audio } from '../engine/audio.js';
import { UI } from './ui.js';
import { World } from './world.js';
import { saveCheckpoint, confirmedCount, meta, saveMeta } from './state.js';

const S = () => G.S;
const flag = (k) => !!G.S.flags[k];
const set = (k, v = true) => (G.S.flags[k] = v);
const P = () => G.player;
const T = () => G.teacher;

// ── primitives ──────────────────────────────────────────────────────
export async function say(id, o = {}) {
  const L = LINES[id]; if (!L) return;
  UI.sub(L.who || SPEAKERS[L.v], L.t, { fx: L.fx, dir: o.dir });
  const v = await Audio.voice(id, L.fx);
  const dur = v ? v.dur : Math.max(1.5, L.t.length / 11);
  if (!v) Audio.voiceTexture(L.fx, dur);
  await UI.waitSkippable(dur * 1000 + (o.hold ?? 300));
  if (v && UI.skipped) v.stop();
  if (!o.keep) UI.clearSub();
}
const think = (t) => UI.think(t);
const read = (t, b) => UI.read(t, b);
function give(item, quiet) { S().inv[item] = true; if (!quiet) { UI.toast('ได้รับ: ' + ITEMS[item]); Audio.play('pickup'); } }
function note(kind, key, text) { const j = S().journal[kind]; if (!j[key]) { j[key] = text; UI.toast('📓 บันทึกลงสมุดแล้ว'); } }
function objective(t) { S().objective = t; UI.objective(t); }
function cp(id) { S().x = P().x; S().facing = P().facing; saveCheckpoint(id); }
function actor(a) { const o = { alpha: 1, facing: 1, ...a }; G.actors.push(o); return o; }
function unactor(o) { G.actors = G.actors.filter((a) => a !== o); }
const sfx = (n, o) => Audio.play(n, o);
async function scare(n = 'stinger', shake = 0.6) { sfx(n); if (!G.settings.reduceScares) { G.fx.shake = shake; tween(G.fx, 'shake', 0, 700); } }
async function choose(title, opts, o) { return UI.choice(title, opts, o); }

const DONT_ANSWER = (title = 'มีเสียงเรียกชื่อคุณ') => title;

// ── room enter events ───────────────────────────────────────────────
export async function onEnter(id) {
  const first = !flag('v_' + id); set('v_' + id);
  switch (id) {
    case 'sala': if (first) objective('หาทางกลับบ้านเก่า'); break;
    case 'street':
      if (flag('pa01done') && !flag('p1end')) return part1End();
      if (first) objective('เข้าบ้านแม่');
      break;
    case 'living':
      if (first) { await cut(() => say('LIV_ENTER')); objective('เปิดเครื่องเล่นเทปของแม่'); }
      if (flag('ready0317') && !flag('pa01done')) return event0317();
      break;
    case 'hall2':
      if (flag('m01') && !flag('stepsBehind')) {
        set('stepsBehind');
        await cut(async () => {
          await wait(500);
          for (let i = 0; i < 4; i++) { sfx('step_wood', { lp: 420, gain: 1, pan: -0.3 }); await wait(160); }
          UI.cue('ฝีเท้าวิ่ง — ชั้นล่าง', '▼'); await wait(600);
          await say('STAIR_STEPS');
          note('rules', 'r_steps', 'เสียงในบ้านนี้ย้ายตำแหน่งได้ — อย่าเชื่อทิศทางของเสียงเสมอไป');
        });
      }
      break;
    case 'school_gate':
      if (first) { objective('เปิดประตูโรงเรียนด้วยกุญแจของแม่'); cp('CP_GATE'); }
      break;
    case 'hall1':
      if (first) objective('สำรวจห้องเรียน ป.3');
      if (flag('set1') && !flag('teacherMet')) return firstEncounter();
      if (flag('chase') && G.S.part === 2) UI.hint('ตามป้ายไฟเขียว — ห้องพยาบาล!', 3000);
      break;
    case 'p3':
      if (first) { cp('CP03'); }
      G.p3Enter = G.time;
      break;
    case 'nurse':
      if (flag('chase')) return chaseEnd();
      break;
    case 'library': if (first && !flag('chaseDone')) objective('หาทะเบียนหน้า 2 และเปิดตู้เหล็กในห้องสมุด'); break;
    case 'archive': if (first) objective('ฟังเทปในห้องเก็บเอกสาร'); break;
    case 'pa_room':
      if (S().part === 2 && !flag('paArrived')) return paScene();
      break;
    case 'bridge':
      if (S().part === 3 && flag('paPower') && !flag('teacherPassed')) G.p3Block = true;
      break;
  }
}

// ── per-frame triggers ──────────────────────────────────────────────
let popT = 0, awayT = 0, hauntT = 30;
export function update(dt) {
  if (G.lock > 0 || G.paused || !G.room) return;
  const id = G.room.id, x = P().x;
  if (id === 'sala') {
    if (G.time > popT) { popT = G.time + rand(5, 11); Audio.at('pop', 'sala', 1460, { gain: 1.2 }); UI.cue('ป๊อก — ลำโพงเสียงตามสาย', x < 1460 ? '▶' : '◀'); }
    const near = x > 1500; Audio.layers.insects && Audio.layers.insects.gain.setTargetAtTime(near ? 0 : 0.35, Audio.ac.currentTime, near ? 0.05 : 2);
  }
  if (id === 'daow_room' && flag('drawSeen') && !flag('drawText')) {
    const away = P().facing === Math.sign(x - 440) && Math.abs(x - 440) > 60;
    awayT = away ? awayT + dt : 0;
    if (awayT > 1.1) { set('drawText'); Audio.at('chalk', 'daow_room', 440, { dur: 2 }); UI.cue('เสียงชอล์กขูดผนัง — ด้านหลัง', x > 440 ? '◀' : '▶'); }
  }
  if (id === 'daow_room' && flag('drawText') && !flag('drawRead') && P().facing === Math.sign(440 - x)) { set('drawRead'); scare('stinger', 0.3); think('“คนที่ไม่ถูกเรียก จะยังอยู่ที่นี่”'); }
  if (id === 'p3' && !flag('board23') && G.time - (G.p3Enter || 0) > 15) board23();
  if (id === 'school_gate' && x > 620 && !flag('kidsSeen')) kidsWindows();
  if (id === 'bridge' && G.p3Block && x > 900) { G.p3Block = false; teacherFinal(); }
  // voice_mark haunting: answering made the house/school hungrier
  if (S().voiceMark > 0 && G.time > hauntT) {
    hauntT = G.time + rand(25, 45) / S().voiceMark;
    const side = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < 3; i++) Audio.play(G.room.floor === 'wood' ? 'step_wood' : 'step_tile', { pan: side * 0.9, gain: 0.5, delay: i * 0.5, lp: 900 });
    UI.cue('ฝีเท้าอีกชุด… ใกล้มาก', side < 0 ? '◀' : '▶');
  }
}

// teacher one-liners routed through the subtitle system without blocking input
export function bark(id, room, x) {
  const L = LINES[id]; if (!L || G.lock) return;
  UI.sub(L.who || SPEAKERS[L.v], L.t, { fx: 'echo' });
  Audio.voice(id, room === S().room ? 'echo' : 'muffled').then((v) => setTimeout(() => UI.clearSub(), ((v ? v.dur : 2) + 0.4) * 1000));
}
export function onTeacherCalm() { if (flag('chase')) { set('chase', false); G.fx.chaseMul = 1; } }

// ── edges & locks ───────────────────────────────────────────────────
export async function edge(room, side) {
  if (room === 'road' && side === 'left') { await think('ไม่มีทางกลับแล้ว… ถนนข้างหลังจมน้ำหมด'); return false; }
  if (room === 'road' && side === 'right' && !flag('carSearched')) { await cut(() => say('ROAD_BACK')); return false; }
  if (room === 'street' && side === 'right' && !flag('p1end')) { await think('โรงเรียนอยู่บนเนินโน้น… แต่ต้องเข้าบ้านแม่ก่อน'); return false; }
  if (room === 'school_gate' && side === 'left' && S().part >= 2) { await think('ดาวอยู่ที่นี่… ฉันจะไม่หนีอีก'); return false; }
  if (room === 'street' && side === 'left' && flag('p1end')) { await think('ไม่ใช่ทางนั้น… โรงเรียนอยู่ทางขวา'); return false; }
  return true;
}

const LOCKS = {
  async houseDoor() { if (flag('p1end')) { await think('ไม่… ต้องไปโรงเรียน'); return false; } sfx('door_open'); return true; },
  async frontDoor() { if (flag('ready0317') && !flag('pa01done')) { await think('…มีอะไรบางอย่างอยู่หน้าประตู'); return false; } return true; },
  async upstairs() { if (!flag('m01')) { await think('ควรฟังเทปของแม่ก่อน'); return false; } return true; },
  async gate() {
    if (!S().inv.key) { await think('ประตูล็อก…'); return false; }
    if (!flag('gateOpen')) { await cut(async () => { sfx('keys'); await wait(600); sfx('lock_ok'); set('gateOpen'); await say('GATE_P'); }); }
    return true;
  },
  async leaveSchool() { await think('ยังไปไม่ได้… ดาวอยู่ที่นี่'); return false; },
  async schoolUp() { if (!flag('set1')) { await think('ควรสำรวจห้อง ป.3 ก่อน'); return false; } return true; },
  async music() { sfx('lock_fail'); await think('ล็อกอยู่… ทางตัน'); return false; },
  async archive() {
    if (!S().inv.card) { sfx('lock_fail'); await think('เครื่องอ่านบัตรไฟแดง… ต้องมีบัตรห้องเก็บเอกสาร'); return false; }
    sfx('lock_ok'); return true;
  },
  async nurseOut() { if (flag('chase')) { await think('ครูยังอยู่ข้างนอก…'); return false; } return true; },
  async paDoor() {
    if (S().part >= 3) return true;
    if (confirmedCount() < 23) { await think(`กุญแจแม่ไขได้… แต่รายชื่อยังไม่ครบ (${confirmedCount()}/23) — ตรวจสมุดบันทึก`); return false; }
    if (!flag('archiveHeard')) { await think('ยังไม่รู้ว่าคืนนั้นเกิดอะไรขึ้น… ห้องเก็บเอกสาร'); return false; }
    sfx('keys'); return true;
  },
  async paOut() { if (S().part === 2) { await think('ประตูไม่ยอมเปิด…'); return false; } return true; },
};
export async function lock(key) { return LOCKS[key] ? LOCKS[key]() : true; }

// ── Match Evidence (journal) ────────────────────────────────────────
function confirm(from, to) { for (let i = from; i <= to; i++) S().names[i] = true; sfx('lock_ok'); afterConfirm(); }
function afterConfirm() {
  const n = confirmedCount();
  UI.toast(`ยืนยันรายชื่อแล้ว ${n}/23`);
  if (n === 23 && !S().inv.registry) {
    give('registry'); note('facts', 'f_all', 'ยืนยันรายชื่อเด็กครบ 23 คน — ต้องประกาศให้ทุกคนได้ยิน');
    if (flag('archiveHeard')) objective('นำรายชื่อทั้งหมดไปที่ห้องประชาสัมพันธ์ (ทางเชื่อมอาคาร)');
  }
}
export function matchEvidence(set_) {
  if (set_ === 2) {
    if (!S().inv.reg2) return 'ยังไม่มีทะเบียนหน้า 2';
    if (!flag('boardSeen')) return 'ต้องเทียบกับรูปบนบอร์ดกิจกรรมในห้อง ป.3 ก่อน';
    confirm(8, 15); return true;
  }
  if (set_ === 3) { if (!S().inv.reg3) return 'ยังไม่มีทะเบียนหน้า 3'; confirm(16, 22); return true; }
  return 'ยังไม่มีหลักฐาน';
}

// ── object actions ──────────────────────────────────────────────────
const nameList = (a, b) => '<ol start="' + (a + 1) + '">' + NAMES.slice(a, b + 1).map((n) => `<li>${n.name}</li>`).join('') + '</ol>';

const ACTS = {
  // PART 1 ──────────────────────────────────────────────
  async searchCar() {
    if (flag('carSearched')) return think('ไม่มีอะไรในรถแล้ว');
    await cut(async () => {
      await say('CAR_PHONE');
      await read('เอกสารพัสดุ', '<p><b>สำนักงานจัดการมรดก</b></p><p>เรียน คุณภาคิน</p><p>ตามคำสั่งเสียของคุณแม่ผู้ล่วงลับ ทางสำนักงานขอส่งมอบสิ่งของที่ท่านสั่งให้ส่งถึงคุณ <i>“หลังจากที่ฉันไม่อยู่แล้ว”</i> ได้แก่ เทปคาสเซ็ตหนึ่งม้วน</p><p>ท่านกำชับว่าให้เปิดฟังที่บ้านหลังเดิมเท่านั้น</p>');
      give('tape_m01');
      await read('ซองเทป', '<p class="hand big">อย่าตอบ</p><p class="small">— ลายมือแม่ เขียนด้วยปากกาสีแดง</p>');
      await say('CAR_TAPE');
      note('facts', 'f_parcel', 'แม่ส่งเทปมาให้หลังเสียชีวิต — ซองเขียนว่า “อย่าตอบ”');
      note('doubts', 'd_voice', 'เสียงดาวในวิทยุ… ดาวหายไปตั้งแต่น้ำท่วมปี 2553');
      set('carSearched'); objective('เดินเข้าหมู่บ้าน');
    });
  },
  async lookTree() { set('treeSeen'); await cut(() => say('ROAD_TREE')); },
  villageSign: () => think('“ยินดีต้อนรับสู่บ้านหนองน้ำใส”… ป้ายหักครึ่ง'),
  salaNotice: () => read('ตารางประกาศหมู่บ้าน', '<p><b>ประจำเดือนตุลาคม พ.ศ. 2553</b></p><p>๑๕ ต.ค. — ประชุมเตรียมรับมือน้ำหลาก<br>๑๗ ต.ค. — เปิดศูนย์อพยพชั่วคราว ณ โรงเรียนบ้านหนองน้ำใส</p><p class="small">หลังจากนั้นไม่มีประกาศใดอีกเลย</p>'),
  async plaque() { await cut(() => say('SALA_PLAQUE')); note('facts', 'f_plaque', 'ป้ายรายชื่อผู้เสียชีวิตที่ศาลาถูกงัดแผ่นล่างออก เหลือรอยสกรู 23 จุด'); },
  async map() { await cut(() => say('SALA_MAP')); note('facts', 'f_map', 'แผนที่หมู่บ้านมีเส้นแดงจากบ้านแม่ไปโรงเรียนบนเนิน'); },
  async groupPhoto() { await read('รูปหมู่นักเรียน', '<p>รูปหมู่เด็กนักเรียนหน้าโรงเรียน ถูกน้ำกัดจนใบหน้าเลือนหมด</p><p>เหลือเพียงลายมือที่มุมรูป: <b>ดาว</b></p>'); await cut(() => say('SALA_PHOTO')); },
  async salaSpeaker() { await cut(() => say('SALA_SPEAKER')); await think('ข้างในมีแต่รังนกกับสนิม…'); },
  async livClock() { await think(flag('clock317') ? '03:17… เข็มไม่ขยับอีกแล้ว' : 'นาฬิกายังเดินอยู่… ตีสองสี่สิบกว่า'); },
  livPhotos: () => think('รูปครอบครัวเรา… ทุกรูปที่มีดาว ฝุ่นถูกเช็ดออก'),
  async plug() { sfx('switch'); set('plugged'); await think('เสียบปลั๊กแล้ว'); },
  async tapeM01() {
    if (!flag('plugged')) return cut(() => say('LIV_PLUG'));
    await cut(async () => {
      set('tapePlaying'); sfx('tape_click'); await wait(900);
      for (const id of ['M01_1', 'M01_2', 'M01_3', 'M01_4']) await say(id);
      Audio.hiss(Audio.ac.currentTime, 4, 0.03); await wait(4000);
      await say('M01_5', { hold: 800 });
      sfx('tape_click'); set('tapePlaying', false); set('m01'); await wait(1200);
      for (let i = 0; i < 3; i++) { sfx('step_wood', { lp: 500, gain: 1.2 }); await wait(230); }
      UI.cue('ฝีเท้าวิ่ง — ชั้นบน', '▲'); await wait(700);
      await say('LIV_STEPS');
      note('rules', 'r_noanswer', 'อย่าขานรับ เมื่อเสียงตามสายเรียกชื่อ — ไม่ว่าเสียงนั้นจะเหมือนใคร');
      note('facts', 'f_tape', 'เทปแม่ M01: “ในโรงเรียนยังมีชื่อที่ไม่มีใครพูดถึง”');
      objective('หากุญแจและกระดิ่งของดาว (ชั้น 2)');
      UI.hint((G.input.usedTouch || matchMedia('(pointer: coarse)').matches) ? 'กดค้าง “ฟัง” เพื่อหยุดและฟังทิศทางของเสียง' : 'กดค้าง Q เพื่อหยุดฟังทิศทางของเสียง');
    });
  },
  momPhoto: async () => { await read('ภาพถ่าย', '<p>ดาวตัวเล็กกำลังเป่าเทียนบนเค้ก <b>สี่เล่ม</b> ภาคินยืนข้าง ๆ หัวเราะ</p><p class="hand">ด้านหลัง: “ดาวเป่าเทียน 4 เล่ม — มิถุนายน 2548”</p>'); note('facts', 'f_p1a', 'ภาพวันเกิด: ดาวเป่าเทียน 4 เล่ม เดือนมิถุนายน'); },
  calendar: async () => { await read('ปฏิทิน', '<p>ปฏิทินเก่าเปิดค้างไว้ที่เดือน <b>มิถุนายน (06)</b></p><p>วันที่ 6 ถูกวงด้วยปากกาแดง และมีเลข <b>4</b> เขียนไว้ข้างรูปวาดเค้ก</p>'); },
  momNote: async () => { await read('บันทึกของแม่', '<p class="hand">“รหัสกล่องคือวันที่ดาวเป่าเทียนสี่เล่ม”</p><p class="hand">— <b>อายุ</b>ก่อน แล้วตามด้วย<b>เดือน</b></p>'); note('facts', 'f_p1b', 'รหัสกล่องของแม่: อายุ (1 หลัก) + เดือน (2 หลัก)'); },
  async lockbox() {
    let fails = 0;
    const ok = await UI.digitLock('กล่องไม้ล็อกรหัส', [['อายุ', 1], ['เดือน', 2]], (v) => {
      if (v === '406') return true;
      fails++; Audio.at('knock', 'daow_room', 500, { gain: 1 }); UI.cue('ก๊อก — ห้องดาว', '▶');
      return fails >= 2 ? 'คำใบ้: อายุของดาวในภาพ (เทียนกี่เล่ม) + เดือนในปฏิทิน (2 หลัก)' : 'ไม่ถูกต้อง… มีเสียงเคาะมาจากห้องดาว';
    }, { desc: 'ป้ายบนตัวล็อก: <b>อายุ</b> | <b>เดือน</b>' });
    if (!ok) return;
    await cut(async () => {
      set('boxOpen'); sfx('keys'); give('key'); give('photo', true);
      await say('MR_OPEN');
      await read('บันทึกของแม่ N01', '<p class="hand">“แม่เก็บกุญแจโรงเรียนไว้ตั้งแต่คืนนั้น กุญแจดอกเล็กเปิดห้องประชาสัมพันธ์</p><p class="hand">แม่ไม่กล้ากลับไปคนเดียว… ขอโทษนะลูก”</p>');
      check0317();
    });
  },
  async drawing() { set('drawSeen'); await cut(() => say('DR_DRAW')); },
  bagTag: () => read('ป้ายชื่อกระเป๋า', '<p class="hand big">ด.ญ. ดาว สุขใจ</p><p>ชั้น ป.3 โรงเรียนบ้านหนองน้ำใส</p>'),
  async bell() {
    await cut(async () => {
      await say('DR_P1'); give('bell'); await wait(900);
      sfx('bell', { gain: 0.9 }); UI.cue('กริ๊ง–กริ๊ง — จากในมือ', '✋'); await wait(1600);
      await say('DR_P2');
      note('rules', 'r_bell', 'กระดิ่งสองครั้ง อาจบอกตำแหน่งของดาวตัวจริง');
      check0317();
    });
  },
  async behindDesk() { set('behindDesk'); await read('ข้อความหลังโต๊ะ', '<p class="hand big">“ถ้าหลงทาง ให้ฟังสองครั้ง”</p><p class="small">ลายมือเด็ก เขียนด้วยดินสอ</p>'); note('facts', 'f_twice', 'ดาวเคยบอก: “ถ้าหลงทาง ให้ฟังเสียงกระดิ่งสองครั้ง”'); },

  // PART 2 ──────────────────────────────────────────────
  hallBoard: () => read('บอร์ดประกาศ', '<p><b>ศูนย์อพยพชั่วคราว</b></p><p>— ผู้อพยพทุกคนโปรดรอฟังการเรียกชื่อทางเสียงตามสาย<br>— ห้ามเด็กออกจากอาคารเรียนโดยไม่มีครูเวร<br>— เรือเที่ยวสุดท้าย 03:00 น.</p>'),
  async chalkboard() { if (!flag('board23')) return board23(); await think('“วันนี้มีนักเรียนมาเรียน 23 คน”'); },
  async drawer() {
    if (S().inv.reg1) return think('ลิ้นชักว่างแล้ว');
    give('reg1');
    await read('ทะเบียนเก่า หน้า 1', `<p>ทะเบียนนักเรียน ป.3 — ครูประจำชั้น: ราตรี</p>${nameList(0, 7)}<p class="small">หน้าที่เหลือถูกฉีกออก… มีลายมือครูเขียนไว้ที่ขอบ: <i>“หน้า 2 ฝากไว้ห้องสมุด — หน้า 3 เก็บในห้องเก็บเอกสาร”</i></p>`);
    note('facts', 'f_reg', 'ทะเบียนถูกแยกเป็น 3 หน้า: ห้อง ป.3 / ห้องสมุด / ห้องเก็บเอกสาร');
    objective('เทียบป้ายชื่อบนโต๊ะกับทะเบียนหน้า 1');
  },
  async deskTags() {
    if (!S().inv.reg1) return read('ป้ายชื่อบนโต๊ะ', '<p>ป้ายชื่อทุกโต๊ะถูกคราบน้ำกัดจนอ่านได้ไม่ครบ… ต้องหาทะเบียนมาเทียบ</p>');
    if (flag('set1')) return think('ยืนยันโต๊ะ 01–08 แล้ว');
    const ok = await UI.matchTags(NAMES.slice(0, 8).map((n) => n.tag), NAMES.slice(0, 8).map((n) => n.name), () => UI.toast('ไม่ใช่… มีเสียงเคาะโต๊ะเบา ๆ'));
    if (!ok) return;
    set('set1'); confirm(0, 7);
    objective('หาทะเบียนหน้าที่หายไป (ชั้น 2)');
  },
  async activityBoard() {
    set('boardSeen');
    await read('บอร์ดกิจกรรม', '<p>รูปหมู่กิจกรรมวันเด็ก มีหมายเลขโต๊ะ <b>09–16</b> เขียนกำกับใต้เด็กแต่ละคน</p><p>แต่ชื่อเลือนจนอ่านไม่ออก — ต้องเทียบกับทะเบียนหน้า 2</p>');
    note('facts', 'f_board', 'บอร์ดกิจกรรม ป.3: รูปเด็กโต๊ะ 09–16 (ใช้คู่กับทะเบียนหน้า 2)');
  },
  books: () => read('หนังสือเรียนสามเล่ม', '<p>มีหนังสือสามเล่มถูกดึงยื่นออกมาจากชั้น สันหนังสือติดป้ายเลขหมวด:</p><p class="big"><b>หมวด 3</b> · <b>หมวด 1</b> · <b>หมวด 7</b></p><p class="small">ไม่ได้เรียงตามลำดับเลข… เหมือนมีคนจงใจเรียงไว้</p>'),
  async libNote() { await read('ข้อความของครู', '<p class="hand big">“วันที่ทุกอย่างหยุดลง คือรหัสที่ฉันจำได้”</p><p class="small">— ร.</p>'); },
  async drownBook() {
    set('drownRead');
    await read('วิธีดูแลเด็กที่ตกน้ำ', '<p>“เมื่อพบเด็กจมน้ำ อย่ารอให้มีคนสั่ง…”</p><p class="small">มีคนขีดเส้นใต้ประโยคนี้ซ้ำหลายรอบจนกระดาษขาด คุณวางหนังสือกลับเข้าชั้น</p>');
    await wait(1500); Audio.at('thump', 'library', 620); set('bookFell'); UI.cue('หนังสือตกพื้น — ด้านหลัง', '◀');
    await wait(900); await think('หน้าที่เปิดค้างไว้… “การช่วยชีวิต”');
  },
  async reg2() {
    give('reg2');
    await read('ทะเบียนเก่า หน้า 2', `${nameList(8, 15)}<p class="small">ไม่มีรูปประกอบ — ต้องเทียบกับบอร์ดกิจกรรมเพื่อยืนยัน (สมุดบันทึก ▸ รายชื่อ)</p>`);
    if (T().active && T().state === 'patrol') T().alert('library', 900);
    UI.hint('เปิดสมุดบันทึก ▸ รายชื่อ ▸ “จับคู่หลักฐาน”');
  },
  async cardCabinet() {
    let fails = 0;
    const ok = await UI.digitLock('ตู้เหล็กเก็บบัตร', [['รหัส', 3]], (v) => (v === '317' ? true : (++fails >= 2 ? 'คำใบ้: ลองดูนาฬิกาในห้องนี้ — มันหยุดตอนไหน?' : 'ไม่ถูกต้อง')));
    if (!ok) return;
    give('card'); set('chaseArmed'); cp('CP04');
    return chaseC1();
  },
  async nurseCabinet() {
    if (flag('nurseDone')) return think('ภาพถ่ายใบนั้น… ฉันเอื้อมหาเธอจริง ๆ');
    await read('ภาพถ่ายในตู้ยา', '<p>ภาพปี 2553: เด็กชายคนหนึ่งนั่งอยู่บนเรือ ยื่นมือออกไปสุดแขน เด็กหญิงผูกริบบิ้นสีฟ้ายืนอยู่บนฝั่ง</p><p class="hand">ด้านหลัง: “เขาพยายามเอื้อมแล้ว แต่เรือลอยไปก่อน”</p>');
    await cut(async () => { await say('NUR_1'); await say('NUR_2'); await say('NUR_3'); });
    set('nurseDone'); note('doubts', 'd_guilt', 'ความทรงจำเรื่อง “ปล่อยมือ” อาจไม่ใช่ความจริง');
    objective(S().inv.card ? 'เข้าห้องเก็บเอกสาร (ชั้น 2)' : 'สำรวจชั้น 2');
  },
  archNote: () => read('บันทึกภารโรง', '<p class="hand">“เครื่องเล่นเทปหลักฟิวส์ขาด — ฟิวส์สำรองอยู่ห้องควบคุมไฟ (ทางเชื่อมอาคาร)”</p><p class="hand">“ช่อง 2 = ห้องเอกสาร · <u>ห้ามสับช่อง 4 ตอนกลางคืน</u>”</p>'),
  async archDeck() {
    if (flag('archiveHeard')) return think('เทปคืนนั้น… ฉันจะไม่ลืมอีก');
    if (!flag('archPower')) { objective('หาฟิวส์สำรองที่ห้องควบคุมไฟ แล้วจ่ายไฟช่อง ARCHIVES'); return think('ไม่มีไฟเข้า… ฟิวส์ขาด'); }
    return archiveTape();
  },
  async files() {
    if (!flag('archiveHeard')) return think('ลิ้นชักติดแน่น…');
    if (S().inv.reg3) return think('ไม่มีอะไรเหลือแล้ว');
    give('reg3');
    await read('ทะเบียนเก่า หน้า 3', `${nameList(16, 22)}<p class="hand small">“ข้าพเจ้าขอรับรองว่าเด็กทั้ง 23 คนนี้อยู่ในอาคารเรียนเมื่อเวลา 03:15 น.” — ราตรี ครูประจำชั้น ป.3</p>`);
    confirm(16, 22);
    return flashback();
  },
  fuseShelf: async () => { give('fuse'); },
  async breaker() {
    const sw = (S().flags.sw ||= {});
    await UI.breaker({
      state: () => ({ fuseIn: flag('fuseIn'), haveFuse: !!S().inv.fuse, sw }),
      insertFuse: () => { set('fuseIn'); S().inv.fuse = false; sfx('switch'); },
      toggle: async (n) => {
        if (!flag('fuseIn')) { sfx('lock_fail'); return 'ไม่มีไฟเข้าตู้ — ต้องใส่ฟิวส์ก่อน'; }
        sw[n] = !sw[n]; sfx('switch');
        if (n === 2) { set('archPower', sw[2]); return sw[2] ? 'ไฟเข้าห้องเก็บเอกสารแล้ว' : ''; }
        if (n === 1) return sw[1] ? 'ไฟในอาคารกะพริบ… แล้วดับลงเหมือนเดิม' : '';
        if (n === 3) return sw[3] ? 'ไม่มีอะไรเกิดขึ้น' : '';
        if (n === 4) {
          if (S().part >= 3) { set('paPower', sw[4]); if (sw[4]) { objective('กลับไปห้องประชาสัมพันธ์ แล้วต่อสายสัญญาณ'); G.p3Block = !flag('teacherPassed'); } return sw[4] ? 'ระบบเสียงตามสายมีไฟแล้ว' : ''; }
          if (sw[4]) { setTimeout(() => pa4Event(), 50); return 'CLOSE'; }
        }
        return '';
      },
    });
  },
  // PA room
  paMirror: () => think(flag('namelessSeen') ? 'ฉันไม่อยากมองกระจกบานนั้นอีก' : 'กระจกฝ้า… สะท้อนแค่ความมืด'),
  async momNote2() {
    await read('ข้อความจากแม่', '<p class="hand">“ถ้าประกาศชื่อครบ พวกเขาจะถูกจดจำเสียที</p><p class="hand">แต่ในรายชื่อมีสิ่งหนึ่งที่ไม่เคยมีชื่อของตัวเอง มันจะยืมเสียงคนอื่น เพื่อทำให้ใครสักคนตอบ”</p>');
    note('facts', 'f_nameless', 'ผู้ไร้ชื่อ: สิ่งที่ไม่มีชื่อ ยืมเสียงคนที่เรารัก เพื่อให้เราตอบ');
    if (S().part === 2) return part2End();
  },
  async paTape() {
    if (S().part < 3) return think('มีเทปอีกม้วนค้างอยู่ในเครื่อง… เขียนว่า M02');
    if (!S().inv.tape_m02) { give('tape_m02'); return think('เทปม้วนที่สองของแม่… “เปิดตอนประกาศ”'); }
    return think('จะเปิดตอนเริ่มประกาศ');
  },
  async wiring() {
    if (S().part < 3 || !flag('paPower')) return S().part < 3 ? think('แผงเดินสัญญาณ… ยังไม่มีไฟเข้า') : cut(() => say('P3S_1'));
    const pa = (S().flags.pa ||= {}); pa.links ||= [];
    const st = () => {
      const has = (a, b) => pa.links.some((l) => l[0] === a && l[1] === b);
      pa.mic = has('MIC', 'MIXER'); pa.mixer = has('MIXER', 'AMP'); pa.school = has('AMP', 'SCHOOL'); pa.village = has('AMP', 'VILLAGE'); pa.amp = !!pa.ampOn;
      pa.done = pa.mic && pa.mixer && pa.school && pa.village && pa.ampOn;
      return { links: pa.links, ampOn: !!pa.ampOn, done: pa.done, lit: { MIC: pa.mic, MIXER: pa.mixer, AMP: pa.ampOn, SCHOOL: pa.school, VILLAGE: pa.village } };
    };
    const valid = { MIC: ['MIXER'], TAPE: ['MIXER'], MIXER: ['AMP'], AMP: ['SCHOOL', 'VILLAGE'] };
    await UI.wiring({
      state: st,
      amp: () => { pa.ampOn = !pa.ampOn; },
      reset: () => { pa.links = []; pa.ampOn = false; },
      connect: async (a, b) => {
        if (!(valid[a] || []).includes(b)) { sfx('lock_fail'); return `ต่อ ${a} ➜ ${b} ไม่ได้ — ดูแผนผังบนแผง`; }
        if (a === 'TAPE') {
          sfx('switch'); await wait(200); Audio.voice('PAR_5', 'nameless'); scare('stinger', 0.5); G.fx.noise = 0.8; tween(G.fx, 'noise', 0, 1200);
          UI.cue('เสียงดาวดังจากลำโพงทุกตัว', '📢'); return 'สายเทป… มีเสียงดาวออกมาแทน — ถอดสายออกแล้ว';
        }
        if (!pa.links.some((l) => l[0] === a && l[1] === b)) pa.links.push([a, b]);
        sfx('switch');
        const s = st(); if (s.done) { sfx('howl', { gain: 0.3 }); set('wired'); objective('เริ่มประกาศที่ไมโครโฟน'); return 'สัญญาณพร้อม: ไมโครโฟน ➜ ลำโพงโรงเรียน + หมู่บ้าน'; }
        return a === 'MIXER' || a === 'MIC' ? 'ต่อแล้ว' : 'ต่อแล้ว — อย่าลืมเปิด AMP (แตะ AMP อีกครั้ง)';
      },
    });
  },
  async mic() {
    if (S().part < 3) return think('ไมโครโฟนไม่มีไฟ…');
    const miss = [];
    if (confirmedCount() < 23) miss.push(`รายชื่อยืนยัน ${confirmedCount()}/23`);
    if (!flag('paPower')) miss.push('ไฟระบบ PA (ห้องควบคุมไฟ ช่อง 4)');
    if (!flag('wired')) miss.push('ต่อสายสัญญาณ MIC ➜ MIXER ➜ AMP ➜ 2 โซน');
    if (miss.length) return read('ยังเริ่มประกาศไม่ได้', '<ul>' + miss.map((m) => `<li>${m}</li>`).join('') + '</ul>');
    return announcement();
  },
};
export async function act(name, obj) { const f = ACTS[name]; if (f) await f(obj); }

// ── PART 1 scenes ───────────────────────────────────────────────────
export async function opening() {
  await cut(async () => {
    UI.hud(false); G.fx.fade = 1; P().hidden = true; set('headlights');
    Audio.setAmbience({ rainOut: 0.35, car: 0.7, wind: 0.2, drone: 0.15 });
    await wait(3000);
    await say('OP_R1'); await say('OP_P1');
    sfx('static', { dur: 2, gain: 0.6 }); await wait(2200);
    await say('OP_D1'); await say('OP_P2', { hold: 600 });
    // headlights catch a girl standing in the road for 0.8s
    G.camTarget = 100; const girl = actor({ kind: 'daow', room: 'road', x: 760, facing: -1 });
    await fadeTo(0, 250); await wait(800);
    G.fx.fade = 1; unactor(girl); sfx('brake', { gain: 1 }); await wait(1300); sfx('thump');
    set('headlights', false); set('handprint'); Audio.setAmbience(G.room.amb);
    await wait(500); P().hidden = false; P().x = 330; G.camTarget = null;
    await fadeTo(0, 1600); UI.hud(true);
    await say('CAR_P1');
    objective('ค้นของในรถ'); cp('CP01');
    UI.hint((G.input.usedTouch || matchMedia('(pointer: coarse)').matches) ? 'ปุ่ม ◀ ▶ เดิน · “ใช้” สำรวจ · “ไฟฉาย” · “วิ่ง” · “ย่อ” · “ฟัง” · สมุด = บันทึก' : 'A/D เดิน · E สำรวจ · F ไฟฉาย · Shift วิ่ง · C ย่อ · Q ฟัง · J สมุด · Esc หยุด', 9000);
  });
}

function check0317() {
  if (S().inv.key && S().inv.bell && !flag('ready0317')) { set('ready0317'); objective('กลับลงไปชั้นล่าง'); }
}

async function event0317() {
  cp('CP02');
  await cut(async () => {
    G.fx.tension = 0.4; set('clock317'); G.fx.flicker = 0.25;
    Audio.setAmbience({}, 0.15); Audio.tickOn = false;
    await wait(1600);
    Audio.setAmbience({ drone: 0.6 }, 2);
    await say('PA01_1'); await wait(3000); await say('PA01_2');
    for (let i = 0; i < 3; i++) { Audio.at('knock', 'living', 160, { gain: 1.4 }); await wait(750); }
    UI.cue('ก๊อก… ก๊อก… ก๊อก… — ประตูหน้าบ้าน', '◀');
    await say('PA01_3');
    const c = await choose(DONT_ANSWER(), [{ id: 'answer', t: 'ขานรับ: “อยู่!”' }, { id: 'silent', t: 'เงียบ' }, { id: 'peep', t: 'มองผ่านตาแมว' }], { timeout: 11000, def: 'silent' });
    if (c === 'answer') {
      await say('ANS_P1'); S().voiceMark++; await wait(700);
      for (const p of [-0.8, 0.8, 0]) sfx('static', { pan: p, gain: 0.35, dur: 0.6 }); // every radio in the house answers
      await say('ANS_R'); G.fx.flicker = 0.5; set('marked');
      note('doubts', 'd_answer', 'ฉันขานรับไปแล้ว… วิทยุทุกห้องตอบว่า “ได้ยินแล้ว”');
    } else if (c === 'peep') {
      await P().walkTo(190); P().facing = -1;
      G.fx.peep = 1; const back = { x: P().x }; G.enterRoom('street', 440, -1, true); P().hidden = true; G.camTarget = 440 - W / 2 + 200;
      await wait(2600); await say('PEEP_P');
      G.enterRoom('living', back.x, -1, true); G.fx.peep = 0; G.camTarget = null;
      set('clueNoBody'); note('doubts', 'd_nobody', 'มีเสียงดาวหน้าประตู… แต่ข้างนอกไม่มีใครเลย');
    } else { await wait(1800); set('paSilent'); }
    await wait(900);
    await say('PA01_4');
    P().facing = 1;
    const sh = actor({ kind: 'kid', room: 'living', x: P().x + 520, facing: -1, alpha: 0.85 });
    await wait(600); unactor(sh); scare('stinger', 0.5);
    set('blackout'); G.fx.flicker = 0; Audio.at('door_open', 'living', 160);
    set('pa01done'); G.fx.tension = 0.2; Audio.setAmbience(G.room.amb);
    objective('ออกไปนอกบ้าน');
  });
}

async function part1End() {
  await cut(async () => {
    const d = actor({ kind: 'daow', room: 'street', x: 1250, facing: -1, alpha: 0 });
    G.camTarget = 760; await tween(d, 'alpha', 0.85, 1500);
    d.facing = 1; d.armOut = true; await wait(800);
    await say('P1E_1'); await say('P1E_2');
    await tween(d, 'alpha', 0, 1500); unactor(d); G.camTarget = null;
    set('p1end'); await fadeTo(1, 900);
    await UI.titleCard('PART 2', 'โรงเรียนของคนที่ถูกลืม');
    S().part = 2; G.reloadRoom(); await fadeTo(0, 900);
    objective('เดินขึ้นเนินไปโรงเรียน');
  });
}

// ── PART 2 scenes ───────────────────────────────────────────────────
async function kidsWindows() {
  set('kidsSeen');
  await tween(G.fx, 'kids', 1, 200); sfx('school_bell', { gain: 0.5, lp: 1200, dur: 2.5 });
  await wait(2200); await tween(G.fx, 'kids', 0, 300);
  note('facts', 'f_kids', 'เห็นเงาเด็กยืนเรียงที่หน้าต่างชั้นสอง… แล้วหายไปพร้อมเสียงระฆัง');
}

async function board23() {
  if (flag('board23')) return;
  await cut(async () => {
    G.camTarget = 760 - W / 2; tween(G.fx, 'chalkHand', 1, 300);
    Audio.at('chalk', 'p3', 760, { dur: 1.8 }); await wait(1900);
    set('board23'); await tween(G.fx, 'chalkHand', 0, 300); G.camTarget = null;
    await say('P3_1'); await wait(500); await say('P3_2');
    note('facts', 'f_23', 'ห้อง ป.3 มีโต๊ะ 23 ตัว กระดานเปลี่ยนจาก 22 เป็น 23 คน');
  });
}

const PATROL2 = [
  { room: 'hall2s', x: 380 }, { room: 'hall2s', x: 1450 }, { room: 'library', x: 760 }, { room: 'hall2s', x: 2200 },
  { room: 'bridge', x: 900 }, { room: 'hall2s', x: 1700 }, { room: 'hall1', x: 1500 }, { room: 'hall2s', x: 900 },
];
function patrolOn(startRoom = 'hall2s', x = 2200) { T().spawn(startRoom, x, 'patrol', PATROL2); T().ri = 3; }

async function firstEncounter() {
  set('teacherMet');
  await cut(async () => {
    for (let i = 0; i < 6; i++) { sfx('heel', { lp: 600, gain: 0.6, pan: 0.6 }); await wait(520); }
    UI.cue('กึก… กึก… — ชั้นบน', '▲');
    await say('T1_1'); await say('T1_2');
    T().spawn('hall1', 1990, 'scripted'); T().facing = -1;
    await T().goTo('hall1', 1720);
    await say('T1_3');
    note('rules', 'r_teacher', 'ครูเวรได้ยินเสียงวิ่ง และเห็นแสงไฟฉาย — ย่อตัว ปิดไฟ หรือซ่อน');
    note('rules', 'r_heels', 'เสียงส้นรองเท้าหยุด = ครูกำลังฟัง');
    note('facts', 'f_ratree', 'ครูเวรเรียกชื่อฉัน… แต่เธอไม่ได้บอกให้ฉันขานรับ');
  });
  UI.hint((G.input.usedTouch || matchMedia('(pointer: coarse)').matches) ? 'ซ่อนในตู้ล็อกเกอร์ (ปุ่ม “ใช้”) · ปิดไฟฉาย · อย่าวิ่ง' : 'ซ่อนในตู้ล็อกเกอร์ (E) · ปิดไฟฉาย (F) · อย่าวิ่ง', 7000);
  // tutorial patrol: walks to the lockers and back, then goes upstairs
  const t = T(); t.state = 'tutorial';
  await new Promise((r) => { t.goal = { room: 'hall1', x: 820 }; t._arrive = r; });
  if (t.state !== 'tutorial') return;
  t.holdT = 2;
  await new Promise((r) => { t.goal = { room: 'hall1', x: 1990 }; t._arrive = r; });
  if (t.state !== 'tutorial') return;
  patrolOn('hall2s', 200); t.ri = 0;
  objective('หาทะเบียนหน้าที่หายไป (ชั้น 2)');
}

async function chaseC1() {
  await cut(async () => {
    P().facing = 1; G.fx.mirrorTeacher = 0; await tween(G.fx, 'mirrorTeacher', 1, 250); scare('stinger', 0.8);
    await wait(700); sfx('school_bell', { dur: 2.5, gain: 0.8 });
    tween(G.fx, 'mirrorTeacher', 0, 500);
    T().spawn('library', 1450, 'chase'); T().facing = -1; T().holdT = 1.2; T().lostT = 0;
    set('chase'); G.fx.tension = 1;
    say('CH_1');
  });
  UI.hint((G.input.usedTouch || matchMedia('(pointer: coarse)').matches) ? 'วิ่ง! กดค้าง “วิ่ง” — ตามไฟฉุกเฉินสีเขียวไปห้องพยาบาล (ชั้น 1)' : 'วิ่ง! (Shift) — ตามไฟฉุกเฉินสีเขียวไปห้องพยาบาล (ชั้น 1)', 6000);
}

async function chaseEnd() {
  set('chase', false); set('chaseDone');
  await cut(async () => {
    sfx('door_close', { gain: 1.4 }); T().despawn(); await wait(900);
    for (let i = 0; i < 3; i++) { sfx('thump', { gain: 1.2, lp: 700 }); G.fx.shake = 0.3; tween(G.fx, 'shake', 0, 300); await wait(700); }
    await wait(1200);
    for (let i = 0; i < 5; i++) { Audio.play('heel', { lp: 700, gain: 0.5 - i * 0.08, pan: -0.5 }); await wait(560); }
    G.fx.tension = 0.15; UI.cue('เสียงส้นรองเท้าค่อย ๆ ไกลออกไป', '◀');
  });
  patrolOn('hall2s', 1700); cp('CP04B');
  objective('ค้นตู้ยาในห้องพยาบาล');
}

async function pa4Event() {
  await cut(async () => {
    Audio.play('pop', { gain: 1.2 });
    await say('PA_SW4');
    const c = await choose(DONT_ANSWER(), [{ id: 'answer', t: 'ขานรับ: “ครับ… ผมอยู่นี่”' }, { id: 'silent', t: 'เงียบ แล้วสับสวิตช์กลับ' }], { timeout: 8000, def: 'silent' });
    if (c === 'answer') { await say('ANS_P1'); S().voiceMark++; await say('ANS_R'); }
    S().flags.sw[4] = false; sfx('switch');
  });
  if (T().active) { T().alert('control', 500); UI.hint('ครูได้ยินแล้ว — ซ่อน!', 3500); }
}

async function archiveTape() {
  await cut(async () => {
    sfx('tape_click'); await wait(800);
    for (const id of ['AR_1', 'AR_2', 'AR_3', 'AR_4', 'AR_5']) await say(id, { hold: 100 });
    scare('slam', 1); sfx('water', { dur: 3 }); sfx('gasp', { gain: 1 }); G.fx.noise = 0.6; tween(G.fx, 'noise', 0, 1500);
    sfx('static', { dur: 1.6 }); await wait(2200);
    await say('AR_6', { hold: 1200 }); sfx('tape_click');
    set('archiveHeard');
    note('facts', 'f_archive', 'คืน 17 ต.ค. 2553: เรือรับได้อีก 17 คน เด็ก 23 คนติดอยู่หลังประตูเหล็ก');
    note('facts', 'f_ratree2', 'ครูราตรีพยายามอ่านรายชื่อ แต่ไม่ทันจบ — เธอรอดคืนนั้น และไม่ใช่ “สิ่งนั้น”');
    await wait(700); Audio.at('switch', 'archive', 440, { gain: 1.4 }); UI.cue('ลิ้นชักเปิดเอง', '◀');
    objective('ค้นตู้เอกสาร');
  });
}

async function flashback() {
  await cut(async () => {
    const back = { room: S().room, x: P().x };
    await tween(G.fx, 'white', 1, 500);
    G.enterRoom('flashback', 480, 1, true); P().hidden = true; T().despawn();
    const kid = actor({ kind: 'pakin_npc', room: 'flashback', x: 690, y: 432, h: 118, facing: -1, reach: 0 });
    const dw = actor({ kind: 'daow', room: 'flashback', x: 430, y: 445, facing: 1 });
    const other = actor({ kind: 'kid', room: 'flashback', x: 250, y: 445, facing: 1, alpha: 0.9, rim: true });
    await tween(G.fx, 'white', 0, 900);
    tween(kid, 'reach', 1, 1500); await wait(2400);
    dw.facing = -1; await wait(600); dw.moving = true; tween(dw, 'x', 300, 1600); tween(kid, 'x', 760, 3000); await wait(2600); dw.moving = false;
    await tween(G.fx, 'white', 1, 900);
    [kid, dw, other].forEach(unactor);
    G.enterRoom(back.room, back.x, 1, true); P().hidden = false;
    await tween(G.fx, 'white', 0, 900);
    await say('FB_P');
    note('facts', 'f_reveal', 'ฉันไม่ได้ปล่อยมือดาว — เธอหันกลับไปช่วยเพื่อน');
  });
  if (!T().active) patrolOn('bridge', 1400);
  cp('CP05');
  objective(confirmedCount() < 23 ? 'ยืนยันรายชื่อให้ครบ 23 คนในสมุดบันทึก แล้วไปห้องประชาสัมพันธ์' : 'นำรายชื่อทั้งหมดไปที่ห้องประชาสัมพันธ์ (ทางเชื่อมอาคาร)');
}

async function paScene() {
  set('paArrived'); T().despawn();
  await cut(async () => {
    G.fx.tension = 0.4; await wait(900);
    const d = actor({ kind: 'daow_fake', room: 'pa_room', x: 160, facing: 1, alpha: 0 });
    await tween(d, 'alpha', 1, 400);
    await say('PAR_1'); P().facing = -1;
    await say('PAR_2'); await say('PAR_3'); await say('PAR_4'); await say('PAR_5');
    G.camTarget = 120; G.fx.flicker = 0.5;
    await tween(G.fx, 'mirrorNameless', 0.95, 300); scare('stinger', 0.9); await wait(1300);
    d.alpha = 0; unactor(d); await tween(G.fx, 'mirrorNameless', 0, 400); G.fx.flicker = 0; G.camTarget = null;
    set('namelessSeen');
    note('doubts', 'd_fake', 'ดาวที่ประตูไม่ยอมตอบเรื่องกระดิ่ง… และกระจกสะท้อนร่างไร้ใบหน้า');
    objective('อ่านข้อความของแม่บนโต๊ะ');
  });
}

async function part2End() {
  await cut(async () => {
    await say('P2E_1');
    sfx('water', { dur: 4 }); tween(G.fx, 'water', 18, 3000); G.fx.noise = 0.7; tween(G.fx, 'noise', 0, 2500);
    await wait(2500); await fadeTo(1, 1200);
    await UI.titleCard('PART 3', 'รายชื่อสุดท้าย');
    S().part = 3; G.reloadRoom(); cp('CP06');
    await fadeTo(0, 1200);
    await say('P3S_1');
    objective('กู้ระบบกระจายเสียง: เปิดไฟช่อง PA ที่ห้องควบคุมไฟ');
  });
}

// ── PART 3 ──────────────────────────────────────────────────────────
async function teacherFinal() {
  await cut(async () => {
    const t = actor({ kind: 'teacher_npc', room: 'bridge', x: 1300, facing: -1, alpha: 0, hold: 'book', tilt: 0.25 });
    await tween(t, 'alpha', 1, 600); scare('stinger', 0.3);
    await P().walkTo(1120); P().facing = 1;
    await say('T3_1'); await say('T3_2'); await say('T3_3'); await say('T3_4');
    UI.toast('ยื่นทะเบียนยืนยัน 23 ชื่อให้ครู'); sfx('paper'); await wait(1200);
    if (S().voiceMark >= 2) {
      await say('T3_Q');
      for (;;) {
        const c = await choose('ดาวเคาะกระดิ่งกี่ครั้ง?', [{ id: '1', t: 'หนึ่งครั้ง' }, { id: '2', t: 'สองครั้ง' }, { id: '3', t: 'สามครั้ง' }]);
        if (c === '2') { sfx('bell', { gain: 0.6 }); break; }
        await say('T3_QW'); scare('stinger', 0.4); t.x -= 30;
      }
    }
    await say('T3_5');
    t.moving = true; t.facing = 1; await tween(t, 'x', 1480, 1500); await tween(t, 'alpha', 0, 600); unactor(t);
    set('teacherPassed');
  });
}

async function announcement() {
  await cut(async () => {
    UI.hud(false); P().x = 600; P().facing = 1; G.camTarget = 640 - W / 2;
    if (!S().inv.tape_m02) give('tape_m02', true);
    sfx('tape_click'); await wait(700);
    for (const id of ['M02_1', 'M02_2', 'M02_3', 'M02_4']) await say(id);
    sfx('tape_click'); await wait(600); sfx('pop');
    await say('AN_0');
    for (let i = 0; i < 22; i++) {
      UI.announce(NAMES[i].name, i + 1, 23);
      await say('NAME_' + String(i + 1).padStart(2, '0'), { hold: 900 });
      if (i === 0) Audio.at('chalk', 'pa_room', 200, { dur: 1 });
      if (i === 1) Audio.at('knock', 'pa_room', 900, { gain: 0.4 });
      if (i < 8 && i % 2) sfx('whisper', { gain: 0.3, pan: rand(-1, 1) });
      if (i === 8) { scare('slam', 0.5); G.fx.flicker = 0.3; }
      if (i >= 8 && i < 16) tween(G.fx, 'water', 18 + (i - 7) * 4, 800);
      if (i >= 16) { G.fx.mirrorKids = i - 15; G.fx.noise = 0.2; tween(G.fx, 'noise', 0, 600); }
      if (i === 18) {
        UI.announceOff(); await say('NM_MOM');
        const c = await choose('เสียงแม่เรียกคุณ', [{ id: 'silent', t: 'ไม่ตอบ — อ่านชื่อต่อ' }, { id: 'answer', t: 'ตอบ: “แม่…?”' }], { timeout: 8000, def: 'silent' });
        if (c === 'answer') { await say('AN_ANS'); S().voiceMark++; scare('stinger', 0.7); G.fx.noise = 1; tween(G.fx, 'noise', 0, 1800); }
      }
    }
    UI.announceOff();
    cp('CP07');
  });
  return finalChoice();
}

async function finalChoice() {
  let fake;
  await cut(async () => {
    UI.hud(false); P().x = 600; P().facing = 1; G.camTarget = 640 - W / 2;
    Audio.duck(0.3); G.fx.flicker = 0.2;
    fake = actor({ kind: 'daow_fake', room: 'pa_room', x: 860, facing: -1, alpha: 0, jitter: 1 + S().voiceMark });
    await tween(fake, 'alpha', 1, 1200);
    await say('FC_1'); fake.moving = true; await tween(fake, 'x', 760, 1400); fake.moving = false;
    await say('FC_2'); fake.reach = 0.6; await say('FC_3');
  });
  G.lock++;
  const c = await choose('ชื่อสุดท้าย…', [
    { id: 'A', t: 'ตอบรับเสียงดาว แล้วจับมือเธอ' },
    { id: 'B', t: 'กระชากสายไมค์ ทำลายเครื่องกระจายเสียง แล้วหนี' },
    { id: 'C', t: 'เงียบ… แล้วประกาศชื่อสุดท้ายให้จบ' },
  ]);
  G.lock--;
  Audio.duck(0.9);
  S().flags.finalChoice = c;
  return cut(() => (c === 'A' ? endingA(fake) : c === 'B' ? endingB(fake) : endingC(fake)));
}

async function endingA(fake) {
  P().facing = 1; await say('EA_1');
  fake.ribbon = false; fake.reach = 1; fake.jitter = 4;
  await say('EA_2'); G.fx.noise = 1; sfx('howl'); scare('stinger', 1); await wait(1200); sfx('slam');
  await fadeTo(1, 2000); unactor(fake); G.fx.noise = 0; G.fx.water = 0; G.fx.flicker = 0;
  await UI.titleCard('เช้าวันต่อมา', '', 2500);
  World.get('sala').variant = 'morning'; G.fx.grade = '#c9c9c4'; G.fx.dawn = 0.5;
  G.enterRoom('sala', 700, 1, true); P().hidden = true; Audio.setAmbience({ insects: 0.15, wind: 0.2 });
  G.camTarget = 300; await fadeTo(0, 1500);
  sfx('static', { dur: 1 }); await say('EA_3'); sfx('static', { dur: 0.8 }); await say('EA_4');
  set('badPhoto'); await wait(2500); await fadeTo(1, 2000);
  World.get('sala').variant = null;
  return endCard('A');
}

async function endingB(fake) {
  await say('EB_1'); sfx('glass'); scare('slam', 1); sfx('howl', { gain: 0.5 });
  G.fx.flash = 1; tween(G.fx, 'flash', 0, 600); unactor(fake);
  tween(G.fx, 'water', 0, 1500); await wait(1500); await fadeTo(1, 800);
  G.enterRoom('hall1', 1500, -1, true);
  const r = actor({ kind: 'ratree', room: 'hall1', x: 860, facing: 1, h: 190, hold: 'book', alpha: 0.8 });
  await fadeTo(0, 500); await P().walkTo(260); await fadeTo(1, 800); unactor(r);
  await UI.titleCard('สามเดือนต่อมา', '', 2500);
  G.enterRoom('city', 380, 1, true); G.fx.water = 0; await fadeTo(0, 1500);
  sfx('tape_click'); await say('EB_2'); sfx('tape_click'); await say('EB_3');
  await tween(G.fx, 'mirrorGirl', 0.7, 2500); await wait(2500); await fadeTo(1, 2000); G.fx.mirrorGirl = 0;
  return endCard('B');
}

async function endingC(fake) {
  sfx('whisper', { gain: 0.6, dur: 3 }); Audio.voice('NM_MOM', 'nameless'); fake.reach = 1; await wait(2400);
  Audio.play('bell', { pan: -0.9, gain: 0.8 }); UI.cue('กริ๊ง… กริ๊ง… — หลังห้อง ห่างจากเธอ', '◀'); await wait(2000);
  P().facing = 1; await say('EC_1'); sfx('rumble');
  UI.announce(NAMES[22].name, 23, 23); await say('NAME_23', { hold: 1200 }); UI.announceOff();
  await say('EC_3'); fake.jitter = 8; G.fx.noise = 1; await say('EC_4');
  await tween(fake, 'alpha', 0, 1500); unactor(fake); G.fx.noise = 0;
  tween(G.fx, 'water', 0, 3000); set('dawn'); await tween(G.fx, 'dawn', 1, 3000);
  const r = actor({ kind: 'ratree', room: 'pa_room', x: 330, facing: 1, h: 180, hold: 'book', alpha: 0, rim: true });
  await tween(r, 'alpha', 1, 1200);
  await say('EC_5'); await say('EC_6'); sfx('paper', { gain: 1.4 });
  await tween(r, 'alpha', 0, 1200); unactor(r);
  await fadeTo(1, 1500);
  G.enterRoom('school_dawn', 1040, 1, true); G.fx.water = 0; G.camTarget = 620;
  const d = actor({ kind: 'daow', room: 'school_dawn', x: 1230, facing: -1 });
  const kids = [1320, 1380, 1440, 1500, 1560].map((x) => actor({ kind: 'kid', room: 'school_dawn', x, facing: 1, alpha: 0.6 }));
  await fadeTo(0, 2000);
  for (const id of ['EC_7', 'EC_8', 'EC_9', 'EC_10', 'EC_11']) await say(id);
  d.facing = 1; d.moving = true; kids.forEach((k) => { k.moving = true; tween(k, 'x', k.x + 400, 5000); tween(k, 'alpha', 0, 5000); });
  tween(d, 'x', 1600, 5000); await tween(d, 'alpha', 0, 5000);
  await fadeTo(1, 2000); G.actors = [];
  await UI.titleCard('ไม่มีใครควรถูกลืม', '', 4000);
  await UI.credits(['รายชื่อผู้สูญหาย 17 ตุลาคม 2553', ...NAMES.map((n) => n.name), '', 'ครูราตรี — ครูประจำชั้น ป.3', '', 'เสียงตามสาย — THE LAST ANNOUNCEMENT']);
  return endCard('C');
}

const ENDINGS = {
  A: ['ENDING A — THE NEW ANNOUNCER', 'ผู้ประกาศคนใหม่', 'ภาคินยึดติดกับความหวังว่าน้องยังรออยู่ และตอบรับเสียงลวง — ผู้ไร้ชื่อได้ยืมเสียงของเขาไป'],
  B: ['ENDING B — TEMPORARY SILENCE', 'ความเงียบชั่วคราว', 'ภาคินรอดชีวิต แต่วงจรยังไม่ถูกตัด ผู้ที่ถูกลืมยังคงถูกลืม'],
  C: ['ENDING C — THE LAST NAME', 'คนที่ได้กลับบ้าน', 'การยอมรับความจริงและคืนชื่อให้ผู้จากไป ทำให้ทั้งผู้รอดและผู้สูญหายได้เดินต่อ'],
};
async function endCard(k) {
  const m = meta(); m.endings[k] = true; saveMeta(m);
  G.actors = []; G.camTarget = null; UI.hud(false);
  const r = await UI.ending(...ENDINGS[k]);
  G.fx.grade = null; G.fx.dawn = 0; set('dawn', false);
  if (r === 'retry') G.restore(); else G.toTitle();
}

// ── checkpoint restore & dev jumps ──────────────────────────────────
export function onRestore(id) {
  G.fx.water = 0; G.fx.flicker = 0; G.fx.noise = 0; G.fx.tension = 0; G.fx.dawn = 0; G.fx.grade = null; G.fx.mirrorKids = 0;
  UI.hud(true);
  if (S().part === 2 && flag('teacherMet') && !flag('paArrived')) patrolOn('hall2s', 2200);
  if (id === 'CP04' && !flag('chaseDone')) chaseC1();
  if (id === 'CP07') finalChoice();
  if (S().part === 3 && flag('paPower') && !flag('teacherPassed')) G.p3Block = S().room === 'bridge';
}

export function devJump(k) {
  const s = S(), inv = s.inv;
  const all1 = () => { Object.assign(s.flags, { carSearched: 1, m01: 1, plugged: 1, stepsBehind: 1, boxOpen: 1, ready0317: 1, pa01done: 1, p1end: 1, clock317: 1, v_sala: 1, v_street: 1, v_living: 1 }); Object.assign(inv, { tape_m01: 1, key: 1, bell: 1, photo: 1 }); };
  const all2 = () => { all1(); s.part = 2; Object.assign(s.flags, { gateOpen: 1, kidsSeen: 1, board23: 1, set1: 1, teacherMet: 1, boardSeen: 1, chaseDone: 1, nurseDone: 1, v_hall1: 1, v_p3: 1, v_school_gate: 1 }); Object.assign(inv, { reg1: 1, reg2: 1, card: 1 }); for (let i = 0; i < 16; i++) s.names[i] = true; };
  if (k === 'p1_0317') { Object.assign(s.flags, { carSearched: 1, m01: 1, plugged: 1, stepsBehind: 1, boxOpen: 1, v_living: 1 }); Object.assign(inv, { tape_m01: 1, key: 1, bell: 1 }); s.room = 'hall2'; s.x = 200; set('ready0317'); }
  if (k === 'p2_gate') { all1(); s.part = 2; s.room = 'street'; s.x = 1300; }
  if (k === 'p2_library') { all1(); s.part = 2; Object.assign(s.flags, { gateOpen: 1, kidsSeen: 1, board23: 1, set1: 1, teacherMet: 1, boardSeen: 1, v_hall1: 1, v_p3: 1 }); Object.assign(inv, { reg1: 1 }); for (let i = 0; i < 8; i++) s.names[i] = true; s.room = 'library'; s.x = 300; }
  if (k === 'p2_archive') { all2(); s.room = 'hall2s'; s.x = 1500; }
  if (k === 'p3') { all2(); Object.assign(s.flags, { archiveHeard: 1, archPower: 1, fuseIn: 1, paArrived: 1, namelessSeen: 1, v_pa_room: 1 }); inv.reg3 = 1; inv.registry = 1; for (let i = 0; i < 23; i++) s.names[i] = true; s.part = 3; s.room = 'pa_room'; s.x = 500; s.flags.sw = { 2: true }; }
  if (k === 'p3_final') { devJump('p3'); Object.assign(s.flags, { paPower: 1, wired: 1, teacherPassed: 1 }); s.flags.sw[4] = true; s.room = 'pa_room'; s.x = 600; return 'final'; }
  return null;
}
export { finalChoice };
