import { G, FLOOR, clamp } from './ctx.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawChar } from '../engine/chars.js';

export const Player = {
  x: 300, vx: 0, facing: 1, crouch: false, hidden: false, hideObj: null,
  phase: 0, stepAcc: 0, moving: false, running: false, listening: false, stamina: 1, auto: null,

  reset() { this.hidden = false; this.hideObj = null; this.crouch = false; this.auto = null; this.stamina = 1; },

  // cutscene helper: walk to x, resolves on arrival
  walkTo(x) { this.auto = x; return new Promise((r) => (this._arrive = r)); },

  update(dt) {
    const locked = G.lock > 0;
    let ax = 0;
    if (!locked && !this.hidden) { if (Input.left) ax -= 1; if (Input.right) ax += 1; }
    this.listening = !locked && !this.hidden && Input.listen;
    if (this.listening) ax = 0;
    if (this.auto != null) {
      const d = this.auto - this.x; ax = Math.sign(d);
      if (Math.abs(d) < 5) { ax = 0; this.x = this.auto; this.auto = null; this._arrive && this._arrive(); }
    }
    const run = Input.run && !locked && !this.crouch && ax !== 0 && this.stamina > 0.05;
    this.stamina = clamp(this.stamina + (run ? -0.16 : 0.22) * dt, 0, 1);
    const sp = this.crouch ? 70 : run ? 300 : 145;
    if (ax) this.facing = ax;
    this.x += ax * sp * dt;
    this.moving = ax !== 0; this.running = run;
    const room = G.room;
    if (this.x < 40) { this.x = 40; if (ax < 0 && !locked) G.onEdge('left'); }
    if (this.x > room.w - 40) { this.x = room.w - 40; if (ax > 0 && !locked) G.onEdge('right'); }
    if (this.moving) {
      this.phase += dt * (run ? 13 : this.crouch ? 5 : 8);
      this.stepAcc += dt * (run ? 3.3 : this.crouch ? 1.3 : 2.1);
      if (this.stepAcc >= 1) { this.stepAcc = 0; this.step(run); }
    } else this.phase *= 0.85;
  },

  step(run) {
    const f = G.room.floor, kind = G.fx.water > 14 ? 'water' : f === 'road' ? 'road' : f === 'wood' ? 'wood' : 'tile';
    Audio.play('step_' + kind, { gain: this.crouch ? 0.2 : run ? 1 : 0.5, rv: 0.15 });
    if (G.teacher) G.teacher.hear(run ? 'run' : this.crouch ? 'crouch' : 'walk', G.S.room, this.x);
  },

  draw(ctx) {
    if (this.hidden) return null;
    return drawChar(ctx, 'man', this.x, FLOOR, {
      facing: this.facing, phase: this.phase, moving: this.moving, crouch: this.crouch,
      armOut: G.S.flashlight, hold: 'light', lightOn: G.S.flashlight, running: this.running,
    });
  },
};
