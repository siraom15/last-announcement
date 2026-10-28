// ครูเวร — the duty teacher. FSM (GDD §12.1): patrol → suspicious → investigate → chase → search.
// She hears running/walking, sees the player (much farther with the flashlight on), and follows across rooms.
import { G, FLOOR, clamp, rand } from './ctx.js';
import { World } from './world.js';
import { Audio } from '../engine/audio.js';
import { drawChar } from '../engine/chars.js';

const SPEED = { patrol: 85, investigate: 125, search: 95, chase: 252, scripted: 90, tutorial: 85 };
const HEAR = { run: 720, walk: 170, crouch: 0 };

export const Teacher = {
  active: false, room: null, x: 0, facing: -1, state: 'idle', phase: 0, timer: 0, stepT: 0,
  route: [], ri: 0, last: null, lostT: 0, seeT: 0, sawHide: false, holdT: 0, cueT: 0, voiceT: 0, goal: null,

  reset() { this.active = false; this.state = 'idle'; this.goal = null; this._arrive = null; },
  spawn(room, x, state = 'patrol', route) {
    Object.assign(this, { active: true, room, x, state, timer: 0, lostT: 0, seeT: 0, holdT: 0, sawHide: false, goal: null });
    if (route) { this.route = route; this.ri = 0; }
  },
  despawn() { this.active = false; this.state = 'idle'; },
  // scripted movement: resolves on arrival
  goTo(room, x) { this.state = 'scripted'; this.goal = { room, x }; return new Promise((r) => (this._arrive = r)); },

  dist() { return G.S.room === this.room ? Math.abs(G.player.x - this.x) : Infinity; },
  canSee() {
    const P = G.player; if (G.S.room !== this.room || P.hidden) return false;
    const d = this.dist(), toward = Math.sign(P.x - this.x) === this.facing;
    const lit = G.S.flashlight && P.facing === Math.sign(this.x - P.x); // beam in her face
    const range = G.S.flashlight ? 600 : P.crouch ? 190 : 320;
    return (toward && d < range) || (lit && d < 560) || d < 55;
  },
  hear(kind, room, x) {
    if (!this.active || ['scripted', 'chase'].includes(this.state)) return;
    const r = HEAR[kind]; if (!r) return;
    let heard = false;
    if (room === this.room) heard = Math.abs(x - this.x) < r;
    else if (kind === 'run') { const door = World.doorTo(this.room, room); heard = door != null && Math.abs(door - this.x) < 520; }
    if (!heard) return;
    this.last = { room, x };
    if (this.state === 'tutorial') return;
    if (this.state !== 'investigate') { this.state = 'suspicious'; this.timer = 0.9; }
  },
  alert(room, x) { if (!this.active) return; this.last = { room, x }; this.state = 'investigate'; this.say('T_HEAR'); },
  onPlayerHide() { this.sawHide = this.state === 'chase' && this.canSeeIgnoringHide(); },
  canSeeIgnoringHide() { const P = G.player; return G.S.room === this.room && Math.abs(P.x - this.x) < 380; },
  say(id) { if (G.time - this.voiceT < 6 || !G.story) return; this.voiceT = G.time; G.story.bark(id, this.room, this.x); },

  moveToward(goal, sp, dt) {
    if (!goal) return true;
    let gx = goal.x;
    if (goal.room !== this.room) {
      const e = World.route(this.room, goal.room); if (!e) return true;
      gx = e.x;
      if (Math.abs(gx - this.x) < 8) {
        Audio.at('door_open', this.room, this.x, { gain: 0.6 });
        this.room = e.to; this.x = e.toX; return false;
      }
    }
    const d = gx - this.x;
    if (Math.abs(d) < 6) return goal.room === this.room;
    this.facing = Math.sign(d);
    this.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
    this.moving = true;
    return false;
  },

  update(dt) {
    if (!this.active || G.paused) return;
    const P = G.player; this.moving = false;
    const sees = this.canSee();
    if (this.holdT > 0) { this.holdT -= dt; return; }
    switch (this.state) {
      case 'patrol': {
        if (sees) { this.toChase(); break; }
        const pt = this.route[this.ri];
        if (!pt) break;
        if (this.timer > 0) { this.timer -= dt; break; }
        if (this.moveToward(pt, SPEED.patrol, dt)) { this.ri = (this.ri + 1) % this.route.length; this.timer = rand(1.2, 3); this.facing *= Math.random() < 0.5 ? -1 : 1; }
        break;
      }
      case 'tutorial': {
        // first meeting: lenient — only a sustained look or bumping into her starts a chase
        this.seeT = sees ? this.seeT + dt : Math.max(0, this.seeT - dt);
        if (this.seeT > 1.6 || (this.dist() < 70 && !P.hidden)) { this.toChase(); break; }
        if (this.moveToward(this.goal, SPEED.tutorial, dt)) { this._arrive && this._arrive(); this._arrive = null; }
        break;
      }
      case 'suspicious': {
        if (sees) { this.toChase(); break; }
        this.timer -= dt; if (this.last && this.last.room === this.room) this.facing = Math.sign(this.last.x - this.x) || this.facing;
        if (this.timer <= 0) { this.state = 'investigate'; this.say('T_HEAR'); }
        break;
      }
      case 'investigate': {
        if (sees) { this.toChase(); break; }
        if (this.moveToward(this.last, SPEED.investigate, dt)) { this.state = 'search'; this.timer = 6; }
        break;
      }
      case 'search': {
        if (sees) { this.toChase(); break; }
        this.timer -= dt;
        if (!this.goal || this.moveToward(this.goal, SPEED.search, dt)) this.goal = { room: this.room, x: clamp((this.last?.x ?? this.x) + rand(-260, 260), 60, World.get(this.room).w - 60) };
        if (Math.random() < dt * 0.15) this.say('T_SEARCH');
        if (this.timer <= 0) { this.state = 'patrol'; this.goal = null; this.say('T_LOST'); G.story && G.story.onTeacherCalm(); }
        break;
      }
      case 'chase': {
        if (sees) { this.lostT = 0; this.last = { room: G.S.room, x: P.x }; } else this.lostT += dt;
        if (P.hidden && this.sawHide && G.S.room === this.room) this.last = { room: this.room, x: P.hideObj.x };
        else if (P.hidden) this.lostT += dt * 2;
        const target = this.lostT < 3.5 && !P.hidden ? { room: G.S.room, x: P.x } : this.last;
        this.moveToward(target, SPEED.chase * (G.fx.chaseMul || 1), dt);
        if (G.S.room === this.room && Math.abs(P.x - this.x) < 46 && (!P.hidden || this.sawHide)) { G.onCaught(); this.state = 'idle'; break; }
        if (this.lostT > 7) { this.state = 'search'; this.timer = 10; this.goal = null; }
        break;
      }
      case 'scripted': {
        if (this.moveToward(this.goal, SPEED.scripted, dt)) { const r = this._arrive; this._arrive = null; r && r(); }
        break;
      }
    }
    // heel clicks — the stealth cue (silence while suspicious = she's listening)
    if (this.moving) {
      this.phase += dt * (this.state === 'chase' ? 11 : 6);
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.state === 'chase' ? 0.26 : 0.55;
        Audio.at('heel', this.room, this.x, { rv: 0.5 });
        if (G.time - this.cueT > 2.4) { this.cueT = G.time; this.cueDir(); }
      }
    }
    const d = this.dist();
    const target = this.state === 'chase' ? 1 : d < 500 ? 0.75 : this.state === 'investigate' || this.state === 'search' ? 0.55 : d < 900 ? 0.35 : 0.1;
    G.fx.tension += (target - G.fx.tension) * Math.min(1, dt * 1.5);
  },

  toChase() {
    if (this.state !== 'chase') { Audio.play('stinger', { gain: 0.6 }); this.say('T_SEE'); }
    this.state = 'chase'; this.lostT = 0;
  },

  cueDir() {
    const S = G.S;
    if (this.room === S.room) { const dx = this.x - G.player.x; if (Math.abs(dx) < 1100) G.ui.cue('กึก… กึก… — ส้นรองเท้า', dx < 0 ? '◀' : '▶'); }
    else if (World.doorTo(S.room, this.room) != null) G.ui.cue('กึก… กึก… — ห้องข้าง ๆ', '◇');
  },

  draw(ctx, t) {
    if (!this.active || this.room !== G.S.room) return;
    drawChar(ctx, 'teacher', this.x, FLOOR, {
      facing: this.facing, moving: this.moving, phase: this.phase, hold: 'book', t, drip: true,
      tilt: 0.22 + Math.sin(t * 0.7) * 0.06, jitter: this.state === 'chase' ? 2.5 : 0.4,
    });
  },
};
