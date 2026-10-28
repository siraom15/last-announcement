// Keyboard + touch. Hold-buttons set booleans; tap-buttons queue one-shot presses.
const HOLD = ['left', 'right', 'run', 'listen'];
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', KeyQ: 'listen',
  KeyE: 'use', Enter: 'use', Space: 'use', ArrowUp: 'use', KeyW: 'use',
  KeyF: 'flash', KeyC: 'crouch', ControlLeft: 'crouch', ArrowDown: 'crouch', KeyS: 'crouch',
  KeyJ: 'journal', Tab: 'journal', Escape: 'pause', KeyP: 'pause',
};

export const Input = {
  left: false, right: false, run: false, listen: false,
  queue: new Set(),
  usedTouch: false,
  onAny: null, // callback for "tap to continue" / audio unlock

  init() {
    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) { this.onAny && this.onAny('key'); return; }
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (HOLD.includes(a)) this[a] = true; else if (!e.repeat) this.queue.add(a);
      this.onAny && this.onAny(a);
    });
    addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (HOLD.includes(a)) this[a] = false; });
    addEventListener('blur', () => HOLD.forEach((k) => (this[k] = false)));

    document.querySelectorAll('[data-btn]').forEach((el) => {
      const a = el.dataset.btn;
      const down = (e) => {
        e.preventDefault();
        this.usedTouch = true;
        el.classList.add('on');
        if (HOLD.includes(a)) this[a] = true; else this.queue.add(a);
        this.onAny && this.onAny(a);
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      };
      const up = (e) => { e.preventDefault(); el.classList.remove('on'); if (HOLD.includes(a)) this[a] = false; };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Sliding a thumb between the two arrows should switch direction without lifting.
    const pad = document.getElementById('dpad');
    if (pad) {
      const slide = (e) => {
        if (!(e.buttons & 1) && e.pointerType === 'mouse') return;
        const r = pad.getBoundingClientRect();
        const rel = (e.clientX - r.left) / r.width;
        this.left = rel < 0.5; this.right = rel >= 0.5;
        pad.querySelector('[data-btn=left]').classList.toggle('on', this.left);
        pad.querySelector('[data-btn=right]').classList.toggle('on', this.right);
      };
      pad.addEventListener('pointermove', slide);
    }
    addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { this.usedTouch = true; document.body.classList.add('touch'); }
      this.onAny && this.onAny('tap');
    });
  },

  take(a) { const had = this.queue.has(a); this.queue.delete(a); return had; },
  clear() { this.queue.clear(); },
};
