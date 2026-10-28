import { G, W, H, clamp, wait, fadeTo, cut, tick } from './game/ctx.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { Renderer } from './engine/render.js';
import { World } from './game/world.js';
import { Player } from './game/player.js';
import { Teacher } from './game/teacher.js';
import { UI } from './game/ui.js';
import * as Story from './game/story.js';
import { freshState, saveCheckpoint, loadSave, restoreCheckpoint, meta, saveMeta } from './game/state.js';
import { LINES } from './data/lines.js';

Object.assign(G, { player: Player, teacher: Teacher, world: World, story: Story, ui: UI, input: Input });
G.dev = new URLSearchParams(location.search).has('dev');
if (G.dev) window.G = G; // console access for testing
const m0 = meta(); if (m0.settings) Object.assign(G.settings, m0.settings);
const WATER = { hall1: 34, p3: 22, nurse: 26, hall2s: 16, library: 14, bridge: 14, archive: 12, control: 10, pa_room: 12 };

// ── layout: 960×540 stage scaled to fit, controls stay in viewport corners ──
function layout() {
  const k = Math.min(innerWidth / W, innerHeight / H);
  const st = document.getElementById('stage');
  st.style.transform = `translate(-50%,-50%) scale(${k})`;
  document.documentElement.style.setProperty('--sub', G.settings.subSize);
  document.body.classList.toggle('portrait', innerHeight > innerWidth && matchMedia('(pointer: coarse)').matches);
}
addEventListener('resize', layout); layout();

Input.init(); UI.init(); Renderer.init(document.getElementById('game'));

// ── rooms ──────────────────────────────────────────────────────────
G.enterRoom = (id, x, facing, silent) => {
  const room = World.get(id); G.room = room; G.S.room = id;
  Player.x = x; if (facing) Player.facing = facing;
  if (!silent) { Player.hidden = false; Player.hideObj = null; UI.slats(false); }
  Renderer.buildBackdrop(room);
  G.fx.water = G.S.part === 3 ? WATER[id] || 0 : 0;
  Audio.setAmbience(room.amb);
  G.cam = clamp(x - W / 2, 0, Math.max(0, room.w - W));
};
G.reloadRoom = () => { Renderer.bgKey = null; G.enterRoom(G.S.room, Player.x, Player.facing, true); };

async function travel(to, toX, sfx) {
  G.lock++;
  Audio.play(sfx === 'metal' ? 'door_open' : sfx === 'stairs' ? 'step_wood' : 'door_open', { gain: sfx === 'metal' ? 1 : 0.7 });
  await fadeTo(1, 220);
  const fromRoom = G.S.room;
  G.enterRoom(to, toX);
  // keep facing into the new room
  Player.facing = toX < G.room.w / 2 ? 1 : -1;
  await wait(60); Audio.play('door_close', { gain: 0.5 });
  await fadeTo(0, 300);
  G.lock--;
  if (fromRoom !== to) await Story.onEnter(to);
}

G.onEdge = async (side) => {
  if (G.busy) return; G.busy = true;
  const room = G.room, e = room[side];
  try {
    if (!(await Story.edge(room.id, side))) { Player.x += side === 'left' ? 20 : -20; return; }
    if (e && e.to) await travel(e.to, e.x, 'edge');
  } finally { G.busy = false; }
};

function nearest() {
  let best = null, bd = 70;
  for (const o of G.room.objs) {
    if (o.show && !o.show(G.S)) continue;
    const d = Math.abs(o.x - Player.x); if (d < bd) { bd = d; best = o; }
  }
  return best;
}

async function interact() {
  if (Player.hidden) { unhide(); return; }
  const o = nearest(); if (!o) return;
  G.busy = true;
  try {
    if (o.kind === 'door') {
      if (o.lock && !(await Story.lock(o.lock))) return;
      if (o.to) await travel(o.to, o.toX, o.sfx);
    } else if (o.kind === 'hide') {
      Player.hidden = true; Player.hideObj = o; Player.x = o.x; Player.crouch = false; UI.setCrouch(false);
      Audio.play('creak', { gain: 0.6 }); UI.slats(true); Teacher.onPlayerHide();
      Audio.play('breath', { gain: 0.4, delay: 0.6 });
    } else if (o.act) await Story.act(o.act, o);
  } finally { G.busy = false; }
}
function unhide() { Player.hidden = false; Player.hideObj = null; UI.slats(false); Audio.play('creak', { gain: 0.5 }); }

// ── caught / checkpoints ───────────────────────────────────────────
G.onCaught = async () => {
  if (G.catching) return; G.catching = true;
  await cut(async () => {
    Audio.play('stinger'); Audio.play('gasp'); G.fx.red = 1; G.fx.shake = G.settings.reduceScares ? 0.2 : 1;
    await Story.say('T_SEE', { hold: 100 });
    await fadeTo(1, 500); G.fx.red = 0; G.fx.shake = 0;
    G.S.catches++;
  });
  let skip = false;
  if (G.S.catches >= 3 && G.S.flags.chase) {
    skip = (await UI.choice('ถูกจับหลายครั้งแล้ว', [{ id: 'retry', t: 'ลองใหม่' }, { id: 'skip', t: 'ข้ามการไล่ล่านี้' }])) === 'skip';
  }
  G.catching = false;
  await G.restore(skip);
};

G.restore = async (skipChase) => {
  G.lock = 0; G.camTarget = null; G.actors = []; Teacher.reset(); Player.reset(); UI.slats(false); UI.announceOff(); UI.clearSub();
  G.timers.forEach((t) => t.r()); G.timers = []; G.tweens = [];
  restoreCheckpoint();
  if (skipChase) { Object.assign(G.S.flags, { chaseDone: true, chase: false }); G.S.room = 'nurse'; G.S.x = 300; G.S.checkpoint = 'CP04B'; saveCheckpoint('CP04B'); }
  G.fx.fade = 1;
  G.enterRoom(G.S.room, G.S.x, G.S.facing || 1);
  Story.onRestore(G.S.checkpoint);
  if (skipChase) { Teacher.spawn('hall2s', 1700, 'patrol'); }
  await fadeTo(0, 700);
};

// ── game start ─────────────────────────────────────────────────────
function begin(state, opening) {
  UI.menuOff(); document.body.classList.add('playing');
  G.S = state; G.actors = []; Teacher.reset(); Player.reset(); G.lock = 0; G.paused = false;
  G.fx.fade = 1; G.cpSnapshot = JSON.parse(JSON.stringify(state));
  G.enterRoom(state.room, state.x, state.facing || 1);
  if (opening) Story.opening();
  else { Story.onRestore(state.checkpoint); fadeTo(0, 900); UI.objective(state.objective || ''); }
}

function unlockAudio() {
  Audio.init(); Audio.resume();
  if (!G.voicesChecked) {
    G.voicesChecked = true;
    Audio.preload(Object.keys(LINES)).then((n) => { G.voiceCount = n; const el = document.getElementById('voiceStat'); if (el) el.textContent = voiceText(); });
  }
  if (matchMedia('(pointer: coarse)').matches) {
    const de = document.documentElement;
    (de.requestFullscreen ? de.requestFullscreen() : Promise.resolve()).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  }
}
const voiceText = () => (G.voiceCount == null ? 'กำลังตรวจไฟล์เสียงพากย์…' : G.voiceCount ? `🎙 เสียงพากย์: ${G.voiceCount}/${Object.keys(LINES).length} ไฟล์` : '🎙 ยังไม่มีไฟล์เสียงพากย์ — แสดงคำบรรยายแทน (ดู README)');

G.toTitle = () => {
  G.S = freshState(); G.paused = false; G.lock = 0; Teacher.reset(); G.actors = []; G.camTarget = null;
  G.enterRoom('road', 900); G.fx.fade = 0; G.fx.tension = 0; G.fx.grade = null;
  document.body.classList.remove('playing'); UI.hud(true);
  Audio.setAmbience({ rainOut: 0.5, drone: 0.3, wind: 0.3 });
  const save = loadSave(), m = meta(), ends = Object.keys(m.endings).sort();
  const dev = G.dev ? `<div class="dev">DEV: ${['p1_0317', 'p2_gate', 'p2_library', 'p2_archive', 'p3', 'p3_final'].map((k) => `<button data-dev="${k}">${k}</button>`).join('')}</div>` : '';
  const el = UI.menu(`<div class="titlewrap"><h1>เสียงตามสาย</h1><h2>THE LAST ANNOUNCEMENT</h2>
    <p class="tag">“ถ้ามีใครเรียกชื่อคุณในที่ที่ไม่ควรมีใครอยู่... อย่าขานรับ”</p>
    <div class="btns"><button data-a="new">เริ่มเกมใหม่</button>${save ? '<button data-a="cont">เล่นต่อจากจุดบันทึก</button>' : ''}<button data-a="set">ตั้งค่า</button></div>
    <p class="note">🎧 แนะนำให้ใช้หูฟัง · เล่นแนวนอน · <span id="voiceStat">${voiceText()}</span></p>
    ${ends.length ? `<p class="ends">ตอนจบที่ปลดล็อก: ${ends.join(' · ')}</p>` : ''}${dev}</div>`);
  el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
    unlockAudio(); Audio.play('ui');
    if (b.dataset.a === 'new') begin(freshState(), true);
    if (b.dataset.a === 'cont') begin(loadSave(), false);
    if (b.dataset.a === 'set') settingsMenu(G.toTitle);
  }));
  el.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = () => {
    unlockAudio(); const s = freshState(); G.S = s;
    const r = Story.devJump(b.dataset.dev); s.checkpoint = 'DEV';
    if (r === 'final') s.checkpoint = 'CP07';
    begin(s, false); saveCheckpoint(s.checkpoint);
  }));
};

function settingsMenu(back) {
  const el = UI.menu(`<div class="titlewrap small"><h3>ตั้งค่า</h3>${UI.settingsHTML()}<div class="btns"><button data-a="back">กลับ</button></div></div>`);
  UI.bindSettings(el, () => { Audio.applyVolumes(); layout(); const m = meta(); m.settings = G.settings; saveMeta(m); });
  el.querySelector('[data-a=back]').onclick = back;
}

function pauseMenu() {
  if (G.modalOpen || !document.body.classList.contains('playing')) return;
  G.paused = true; Audio.suspend();
  const el = UI.menu(`<div class="titlewrap small"><h3>หยุดเกม</h3><p class="obj">${G.S.objective || ''}</p><div class="btns vertical">
    <button data-a="go">เล่นต่อ</button><button data-a="jr">สมุดบันทึก</button><button data-a="set">ตั้งค่า</button>
    <button data-a="cp">เริ่มใหม่จากจุดบันทึกล่าสุด</button><button data-a="title">กลับหน้าหลัก</button></div></div>`);
  const resume = () => { UI.menuOff(); G.paused = false; Audio.resume(); };
  el.querySelector('[data-a=go]').onclick = resume;
  el.querySelector('[data-a=jr]').onclick = () => { resume(); UI.openJournal(); };
  el.querySelector('[data-a=set]').onclick = () => settingsMenu(pauseMenu);
  el.querySelector('[data-a=cp]').onclick = () => { resume(); G.restore(); };
  el.querySelector('[data-a=title]').onclick = () => { resume(); G.toTitle(); };
}

// ── main loop ──────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const playing = document.body.classList.contains('playing');
  if (playing && G.S) {
    if (Input.take('pause')) pauseMenu();
    if (!G.paused) {
      G.time += dt; tick();
      if (G.lock > 0) { if (Input.take('use')) UI.skip(); }
      else if (!G.busy && !G.modalOpen) {
        if (Input.take('use')) interact();
        if (Input.take('flash')) { G.S.flashlight = !G.S.flashlight; Audio.play('switch', { gain: 0.6 }); UI.setFlash(G.S.flashlight); }
        if (Input.take('crouch') && !Player.hidden) { Player.crouch = !Player.crouch; UI.setCrouch(Player.crouch); }
        if (Input.take('journal')) UI.openJournal();
      }
      Player.update(dt); Teacher.update(dt); Story.update(dt); Audio.update();
      UI.prompt(G.lock || G.busy ? null : nearest(), Player.hidden && !G.lock);
      UI.listening(Player.listening); Audio.listening = Player.listening;
      if (Player.listening && Teacher.active && G.time - (G._lc || 0) > 1.2) { G._lc = G.time; Teacher.cueDir(); }
      const tgt = G.camTarget != null ? G.camTarget : Player.x - W / 2 + Player.facing * 90;
      G.cam += (clamp(tgt, 0, Math.max(0, G.room.w - W)) - G.cam) * Math.min(1, dt * 4);
    }
    Input.queue.delete('use'); Input.queue.delete('flash'); Input.queue.delete('crouch'); Input.queue.delete('journal');
    Renderer.frame(G.time);
  } else {
    // title backdrop: slow drift through the rainy road
    G.time += dt; tick(); G.cam = 600 + Math.sin(G.time * 0.05) * 300; Player.hidden = true;
    if (Math.random() < 0.002) { G.fx.flash = 1; } G.fx.flash *= 0.9;
    Renderer.frame(G.time); Input.clear();
  }
}
// random lightning during play outdoors
setInterval(() => {
  if (G.room && G.room.outdoor && !G.paused && Math.random() < 0.25) {
    G.fx.flash = 1; const f = () => { G.fx.flash *= 0.82; if (G.fx.flash > 0.02) requestAnimationFrame(f); else G.fx.flash = 0; }; f();
    setTimeout(() => Audio.play('thunder', { gain: 0.8 }), 400 + Math.random() * 1500);
  }
}, 7000);
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.dev && document.body.classList.contains('playing')) pauseMenu(); });

G.toTitle();
const loop = (now) => { frame(now); requestAnimationFrame(loop); };
requestAnimationFrame(loop);
// dev: keep ticking when the tab is in the background (rAF is paused there)
if (G.dev) setInterval(() => { if (performance.now() - last > 120) frame(performance.now()); }, 33);
