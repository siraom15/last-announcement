// DOM overlay UI: subtitles, directional sound cues, prompts, choices, documents, journal, puzzles, menus.
import { G, wait } from './ctx.js';
import { NAMES, ITEMS } from '../data/names.js';
import { Audio } from '../engine/audio.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const FX_ICON = { pa: '📢 ', radio: '📻 ', tape: '📼 ', muffled: '🚪 ', whisper: '', nameless: '', ghost: '' };

export const UI = {
  _skip: null,
  init() {
    this.subs = $('subs'); this.who = this.subs.querySelector('.who'); this.txt = this.subs.querySelector('.txt');
    this.modalEl = $('modal'); this.useBtn = $('useBtn');
    $('stage').addEventListener('pointerdown', (e) => { if (e.target.closest('#modal,.choice,#card,#menu')) return; this.skip(); });
    // portrait art: assets/portraits/manifest.json lists names like "pakin_neutral" (files are <name>.png)
    this.ports = new Set();
    fetch('assets/portraits/manifest.json').then((r) => (r.ok ? r.json() : [])).then((list) => list.forEach((n) => {
      this.ports.add(n); new Image().src = `assets/portraits/${n}.png`;
    })).catch(() => {});
  },

  // ── subtitles / cues ───────────────────────────────────────────
  sub(who, text, { fx, dir, portrait } = {}) {
    this.who.textContent = (FX_ICON[fx] || '') + (who || '');
    this.txt.textContent = text; this.txt.className = 'txt' + (fx === 'whisper' || fx === 'nameless' ? ' warp' : '');
    this.subs.dataset.dir = dir || ''; this.subs.classList.add('on');
    if (G.lock > 0) this.showPortrait(portrait);
  },
  // Coma-style: protagonist on the left, whoever else speaks on the right; the silent one is dimmed.
  showPortrait(p) {
    const L = $('portL'), Rt = $('portR');
    if (!p) { [L, Rt].forEach((e) => e.classList.contains('on') && e.classList.add('dim')); return; }
    const name = [`${p.char}_${p.expr}`, `${p.char}_neutral`].find((n) => this.ports.has(n));
    if (!name) return;
    const el = p.char === 'pakin' ? L : Rt, other = el === L ? Rt : L;
    const src = `assets/portraits/${name}.png`;
    if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
    el.className = 'port on' + (p.mode ? ' ' + p.mode : '');
    if (other.classList.contains('on')) other.classList.add('dim');
  },
  portraitsOff() { ['portL', 'portR'].forEach((id) => { $(id).className = 'port'; }); },
  cinema(on) { document.body.classList.toggle('cine', on); if (!on) this.portraitsOff(); },
  clearSub() { this.subs.classList.remove('on'); },
  async waitSkippable(ms) {
    this.skipped = false;
    await new Promise((r) => { this._skip = r; wait(ms).then(r); });
    this._skip = null;
  },
  skip() { if (this._skip) { this.skipped = true; const r = this._skip; this._skip = null; r(); } },
  cue(text, dir = '') {
    const el = $('cue'); el.innerHTML = `<b>${esc(dir)}</b> ${esc(text)}`; el.classList.add('on');
    clearTimeout(this._cueT); this._cueT = setTimeout(() => el.classList.remove('on'), 2600);
  },
  async think(text) {
    this.sub('ภาคิน', text, {}); this.txt.classList.add('thought');
    await this.waitSkippable(Math.max(1600, text.length * 75)); this.clearSub();
  },
  objective(text) {
    const el = $('objective'); el.innerHTML = `<small>เป้าหมาย</small>${esc(text)}`; el.classList.add('on');
    clearTimeout(this._objT); this._objT = setTimeout(() => el.classList.remove('on'), 6500);
  },
  toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('on');
    clearTimeout(this._toT); this._toT = setTimeout(() => el.classList.remove('on'), 2600);
  },
  hint(text, ms = 6000) {
    const el = $('hint'); el.textContent = text; el.classList.add('on');
    clearTimeout(this._hiT); this._hiT = setTimeout(() => el.classList.remove('on'), ms);
  },
  prompt(obj, hidden) {
    const el = $('prompt');
    if (hidden) { el.innerHTML = '<b>ออกจากที่ซ่อน</b>'; el.classList.add('on'); this.useBtn.textContent = 'ออก'; return; }
    if (!obj) { el.classList.remove('on'); this.useBtn.textContent = 'ใช้'; this.useBtn.classList.remove('hot'); return; }
    el.innerHTML = `<b>${esc(obj.verb || 'ใช้')}</b> ${esc(obj.name || '')}`; el.classList.add('on');
    this.useBtn.textContent = (obj.verb || 'ใช้').slice(0, 8); this.useBtn.classList.add('hot');
  },
  slats(on) { $('slats').classList.toggle('on', on); },
  listening(on) { $('listenInd').classList.toggle('on', on); },
  setCrouch(on) { $('crouchBtn').classList.toggle('lit', on); },
  setFlash(on) { document.querySelector('[data-btn=flash]').classList.toggle('lit', on); },
  hud(on) { document.body.classList.toggle('nohud', !on); },

  // ── choice ─────────────────────────────────────────────────────
  choice(title, options, { timeout = 0, def } = {}) {
    return new Promise((resolve) => {
      const box = document.createElement('div'); box.className = 'choice';
      box.innerHTML = `<div class="ct">${esc(title)}</div>` + options.map((o, i) => `<button data-id="${o.id}"><span>${i + 1}</span>${esc(o.t)}</button>`).join('') + (timeout ? '<div class="timer"><i></i></div>' : '');
      $('ui').appendChild(box);
      let done = false, keyH;
      const fin = (id) => { if (done) return; done = true; removeEventListener('keydown', keyH); box.classList.add('out'); setTimeout(() => box.remove(), 300); Audio.play('ui'); resolve(id); };
      box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => fin(b.dataset.id)));
      keyH = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) fin(options[n - 1].id); };
      addEventListener('keydown', keyH);
      if (timeout) { const bar = box.querySelector('.timer i'); bar.style.transitionDuration = timeout + 'ms'; requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = '0%'))); wait(timeout).then(() => fin(def)); }
    });
  },

  // ── modal shell ────────────────────────────────────────────────
  modal(html, cls = '') {
    const m = this.modalEl; m.className = 'on ' + cls; m.innerHTML = html;
    G.paused = true; G.modalOpen = true;
    return {
      el: m,
      close: () => { m.className = ''; m.innerHTML = ''; G.paused = false; G.modalOpen = false; },
    };
  },
  read(title, body) {
    Audio.play('paper');
    return new Promise((r) => {
      const md = this.modal(`<div class="paper"><h3>${esc(title)}</h3><div class="body">${body}</div><button class="close">ปิด</button></div>`, 'doc');
      const close = () => { removeEventListener('keydown', k); md.close(); r(); };
      const k = (e) => { if (['KeyE', 'Escape', 'Enter', 'Space'].includes(e.code)) close(); };
      setTimeout(() => addEventListener('keydown', k), 250);
      md.el.querySelector('.close').onclick = close;
    });
  },
  titleCard(big, small = '', ms = 3800) {
    this.portraitsOff();
    const t = $('title'); t.innerHTML = `<h1>${esc(big)}</h1><p>${esc(small)}</p>`; t.className = 'on';
    return wait(ms).then(() => { t.className = ''; return wait(800); });
  },

  // ── puzzles ────────────────────────────────────────────────────
  // Digit lock with labelled groups, e.g. groups [['อายุ',1],['เดือน',2]]
  digitLock(title, groups, check, { desc = '' } = {}) {
    return new Promise((resolve) => {
      const n = groups.reduce((a, g) => a + g[1], 0), val = Array(n).fill(0);
      let html = `<div class="lockp"><h3>${esc(title)}</h3><p class="desc">${desc}</p><div class="dials">`, k = 0;
      for (const [lab, len] of groups) {
        html += `<div class="grp"><label>${esc(lab)}</label><div class="row">`;
        for (let i = 0; i < len; i++, k++) html += `<div class="dial" data-i="${k}"><button class="up">▲</button><b>0</b><button class="dn">▼</button></div>`;
        html += '</div></div>';
      }
      html += `</div><div class="btns"><button class="ok">ลองเปิด</button><button class="close">ถอย</button></div><p class="msg"></p></div>`;
      const md = this.modal(html, 'puz');
      md.el.querySelectorAll('.dial').forEach((d) => {
        const i = +d.dataset.i, b = d.querySelector('b');
        const set = (v) => { val[i] = (v + 10) % 10; b.textContent = val[i]; Audio.play('tick', { gain: 1.5 }); };
        d.querySelector('.up').onclick = () => set(val[i] + 1); d.querySelector('.dn').onclick = () => set(val[i] - 1);
      });
      const msg = md.el.querySelector('.msg');
      md.el.querySelector('.ok').onclick = async () => {
        const r = await check(val.join(''));
        if (r === true) { Audio.play('lock_ok'); md.close(); resolve(true); }
        else { Audio.play('lock_fail'); msg.innerHTML = r || 'ไม่ถูกต้อง'; md.el.querySelector('.lockp').classList.remove('shake'); void md.el.offsetWidth; md.el.querySelector('.lockp').classList.add('shake'); }
      };
      md.el.querySelector('.close').onclick = () => { md.close(); resolve(false); };
    });
  },

  // P2: match damaged desk tags to registry names
  matchTags(tags, names, onWrong) {
    return new Promise((resolve) => {
      const order = names.map((n, i) => i).sort(() => Math.random() - 0.5);
      const md = this.modal(`<div class="match"><h3>จับคู่ป้ายชื่อบนโต๊ะกับทะเบียนหน้า 1</h3><p class="desc">แตะป้ายบนโต๊ะ แล้วแตะชื่อในทะเบียนที่ตรงกัน</p>
        <div class="cols"><div class="tags">${tags.map((t, i) => `<button data-t="${i}"><i>โต๊ะ ${String(i + 1).padStart(2, '0')}</i> ${esc(t)}</button>`).join('')}</div>
        <div class="names">${order.map((i) => `<button data-n="${i}">${esc(names[i])}</button>`).join('')}</div></div>
        <div class="btns"><button class="close">ถอย</button></div></div>`, 'puz');
      let sel = null, done = 0;
      md.el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { if (b.classList.contains('ok')) return; md.el.querySelectorAll('[data-t]').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = +b.dataset.t; Audio.play('ui'); }));
      md.el.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => {
        if (sel === null || b.classList.contains('ok')) return;
        const tb = md.el.querySelector(`[data-t="${sel}"]`);
        if (+b.dataset.n === sel) { tb.classList.add('ok'); tb.classList.remove('sel'); b.classList.add('ok'); Audio.play('lock_ok'); sel = null; if (++done === tags.length) setTimeout(() => { md.close(); resolve(true); }, 500); }
        else { Audio.play('knock', { gain: 0.4 }); b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 400); onWrong && onWrong(); }
      }));
      md.el.querySelector('.close').onclick = () => { md.close(); resolve(false); };
    });
  },

  // P4: breaker panel. api: {state(), insertFuse(), toggle(n)}
  breaker(api) {
    return new Promise((resolve) => {
      const md = this.modal(`<div class="breaker"><h3>ตู้ควบคุมไฟ</h3><div class="fuse"></div><div class="sws"></div><p class="msg"></p><div class="btns"><button class="close">ปิดตู้</button></div></div>`, 'puz');
      const labels = { 1: 'LIGHTS · ไฟอาคาร', 2: 'ARCHIVES · ห้องเก็บเอกสาร', 3: '— (ไม่มีป้าย)', 4: 'PA · เสียงตามสาย' };
      const draw = () => {
        const s = api.state();
        md.el.querySelector('.fuse').innerHTML = s.fuseIn ? '<span class="okf">ฟิวส์: ใส่แล้ว</span>' : s.haveFuse ? '<button class="ins">ใส่ฟิวส์สำรอง</button>' : '<span class="nof">ช่องฟิวส์ว่าง — ไม่มีไฟเข้าตู้</span>';
        md.el.querySelector('.sws').innerHTML = [1, 2, 3, 4].map((n) => `<button data-n="${n}" class="${s.sw[n] ? 'on' : ''}"><i>${n}</i><span>${labels[n]}</span><em>${s.sw[n] ? 'ON' : 'OFF'}</em></button>`).join('');
        const ins = md.el.querySelector('.ins'); if (ins) ins.onclick = () => { api.insertFuse(); draw(); };
        md.el.querySelectorAll('[data-n]').forEach((b) => (b.onclick = async () => { const r = await api.toggle(+b.dataset.n); md.el.querySelector('.msg').textContent = r || ''; if (r === 'CLOSE') { md.close(); resolve(); return; } draw(); }));
      };
      draw();
      md.el.querySelector('.close').onclick = () => { md.close(); resolve(); };
    });
  },

  // P5: patch wiring. api: {state(), connect(a,b) -> msg, amp()}
  wiring(api, labels = true) {
    return new Promise((resolve) => {
      const md = this.modal(`<div class="wiring"><h3>แผงเดินสัญญาณเสียง</h3>
        <pre class="diag">MIC ─────┐
         ├──▶ MIXER ──▶ AMP ──▶ SCHOOL
TAPE ────┘                 └──▶ VILLAGE</pre>
        <div class="nodes"></div><p class="msg">แตะต้นทาง แล้วแตะปลายทางเพื่อต่อสาย</p><div class="btns"><button class="reset">ถอดสายทั้งหมด</button><button class="close">ปิด</button></div></div>`, 'puz');
      let from = null;
      const N = [['MIC', 'src'], ['TAPE', 'src'], ['MIXER', 'mid'], ['AMP', 'mid'], ['SCHOOL', 'dst'], ['VILLAGE', 'dst']];
      const draw = () => {
        const s = api.state();
        md.el.querySelector('.nodes').innerHTML = N.map(([n, k]) => `<button data-n="${n}" class="${k} ${from === n ? 'sel' : ''} ${s.lit[n] ? 'lit' : ''}">${n}${n === 'AMP' ? `<em>${s.ampOn ? 'ON' : 'OFF'}</em>` : ''}</button>`).join('') +
          `<div class="links">${s.links.map(([a, b]) => `<span>${a} ➜ ${b}</span>`).join('') || '<span class="none">ยังไม่ได้ต่อสาย</span>'}</div>`;
        md.el.querySelectorAll('[data-n]').forEach((b) => (b.onclick = async () => {
          const n = b.dataset.n;
          if (n === 'AMP' && from === null && api.state().links.some(([a, c]) => c === 'AMP')) { api.amp(); Audio.play('switch'); draw(); return; }
          if (from === null) { from = n; Audio.play('ui'); draw(); return; }
          const msg = await api.connect(from, n); from = null; md.el.querySelector('.msg').textContent = msg || '';
          if (msg === 'CLOSE') { md.close(); resolve(); return; }
          draw(); if (api.state().done) setTimeout(() => { md.close(); resolve(); }, 900);
        }));
      };
      draw();
      md.el.querySelector('.reset').onclick = () => { api.reset(); from = null; draw(); };
      md.el.querySelector('.close').onclick = () => { md.close(); resolve(); };
    });
  },

  // Final announcement: one tap per name, auto-advance keeps the montage moving
  announce(text, idx, total) {
    const el = $('announce'); el.innerHTML = `<small>รายชื่อลำดับที่ ${idx} / ${total}</small><b>${esc(text)}</b>`; el.classList.add('on');
  },
  announceOff() { $('announce').classList.remove('on'); },

  // ── journal ────────────────────────────────────────────────────
  openJournal(tab = 'sum') {
    const S = G.S, J = S.journal;
    const list = (o) => Object.values(o).map((t) => `<li>${esc(t)}</li>`).join('') || '<li class="none">ยังไม่มี</li>';
    const nm = NAMES.map((n, i) => `<li class="${S.names[i] ? 'ok' : ''}"><i>${String(i + 1).padStart(2, '0')}</i>${S.names[i] ? esc(n.name) : '<span>— ยังไม่ยืนยัน —</span>'}<em>${S.names[i] ? '✓' : ''}</em></li>`).join('');
    const can2 = S.inv.reg2 && !S.names[8], can3 = S.inv.reg3 && !S.names[16];
    const inv = Object.keys(S.inv).filter((k) => S.inv[k]).map((k) => `<li>${esc(ITEMS[k] || k)}</li>`).join('') || '<li class="none">ไม่มี</li>';
    const conf = Object.keys(S.names).length;
    const md = this.modal(`<div class="journal"><nav>
      <button data-tab="sum">สรุป</button><button data-tab="facts">เรื่องที่รู้แน่</button><button data-tab="doubts">ข้อสงสัย</button><button data-tab="names">รายชื่อ ${conf}/23</button><button data-tab="rules">กฎที่เรียนรู้</button><button class="close">✕</button></nav>
      <section data-tab="sum"><h4>เป้าหมายปัจจุบัน</h4><p class="obj">${esc(S.objective || '—')}</p><h4>สิ่งของ</h4><ul>${inv}</ul><p class="vm">${S.voiceMark ? `คุณเคยขานรับเสียงนั้นแล้ว ${S.voiceMark} ครั้ง…` : ''}</p></section>
      <section data-tab="facts"><ul>${list(J.facts)}</ul></section>
      <section data-tab="doubts"><ul>${list(J.doubts)}</ul></section>
      <section data-tab="names">${can2 || can3 ? `<div class="mev">${can2 ? '<button data-m="2">จับคู่หลักฐาน: ทะเบียนหน้า 2 + บอร์ดกิจกรรม</button>' : ''}${can3 ? '<button data-m="3">จับคู่หลักฐาน: ทะเบียนหน้า 3</button>' : ''}<p class="mmsg"></p></div>` : ''}<ol class="names">${nm}</ol></section>
      <section data-tab="rules"><ul>${list(J.rules)}</ul></section></div>`, 'jr');
    const show = (t) => { md.el.querySelectorAll('[data-tab]').forEach((e) => e.classList.toggle('act', e.dataset.tab === t)); };
    md.el.querySelectorAll('nav [data-tab]').forEach((b) => (b.onclick = () => { show(b.dataset.tab); Audio.play('paper'); }));
    md.el.querySelector('.close').onclick = () => md.close();
    md.el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
      const r = G.story.matchEvidence(+b.dataset.m);
      if (r === true) { md.close(); this.openJournal('names'); } else md.el.querySelector('.mmsg').textContent = r;
    }));
    show(tab);
    const k = (e) => { if (['KeyJ', 'Escape', 'Tab'].includes(e.code)) { e.preventDefault(); removeEventListener('keydown', k); if (G.modalOpen) md.close(); } };
    setTimeout(() => addEventListener('keydown', k), 100);
  },

  // ── menus ──────────────────────────────────────────────────────
  menu(html) { const m = $('menu'); m.innerHTML = html; m.className = 'on'; return m; },
  menuOff() { $('menu').className = ''; },
  settingsHTML() {
    const s = G.settings;
    return `<div class="set">
      <label>ขนาดคำบรรยาย <select data-k="subSize"><option value="0.85">เล็ก</option><option value="1">กลาง</option><option value="1.25">ใหญ่</option></select></label>
      <label>เสียงรวม <input type="range" min="0" max="1" step="0.05" data-k="master"></label>
      <label>เสียงพากย์ <input type="range" min="0" max="1.5" step="0.05" data-k="voice"></label>
      <label>เอฟเฟกต์ <input type="range" min="0" max="1.5" step="0.05" data-k="sfx"></label>
      <label><input type="checkbox" data-k="reduceScares"> ลดความรุนแรงของ jump scare / แสงกะพริบ</label>
      <label><input type="checkbox" data-k="shake"> สั่นหน้าจอ</label></div>`;
  },
  bindSettings(root, onChange) {
    root.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') el.checked = !!G.settings[k]; else el.value = G.settings[k];
      el.oninput = el.onchange = () => { G.settings[k] = el.type === 'checkbox' ? el.checked : parseFloat(el.value); onChange && onChange(); };
    });
  },
  ending(code, title, text, art) {
    return new Promise((resolve) => {
      this.portraitsOff(); this.clearSub();
      const c = $('card'); c.className = art ? 'on art' : 'on';
      c.style.backgroundImage = art ? `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.92) 82%), url(assets/art/${art})` : '';
      c.innerHTML = `<div><h2>${esc(code)}</h2><h1>${esc(title)}</h1><p>${esc(text)}</p><div class="btns"><button data-r="retry">ย้อนกลับไปก่อนตัดสินใจ</button><button data-r="title">กลับหน้าหลัก</button></div></div>`;
      c.querySelectorAll('button').forEach((b) => (b.onclick = () => { c.className = ''; resolve(b.dataset.r); }));
    });
  },
  credits(lines) {
    const c = $('credits'); c.innerHTML = `<div class="roll">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`; c.className = 'on';
    return wait(lines.length * 900 + 4000).then(() => { c.className = ''; });
  },
};
