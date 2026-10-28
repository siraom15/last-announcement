// Shared game context. Every module imports G instead of each other to avoid import cycles.
export const W = 960, H = 540, FLOOR = 440;

export const G = {
  time: 0,          // game time in seconds (stops while paused)
  paused: false,
  lock: 0,          // >0 while a cutscene owns the input
  S: null,          // save-able state (see state.js)
  room: null,       // current room definition
  cam: 0,
  camTarget: null,  // cutscene camera override (world x)
  actors: [],       // scripted characters: {kind, room, x, alpha, facing, t}
  fx: { fade: 1, flash: 0, shake: 0, dark: 1, tension: 0, flicker: 0, red: 0, water: 0, noise: 0, beam: 1, kids: 0, chalkHand: 0, mirrorTeacher: 0, mirrorNameless: 0, mirrorGirl: 0, blackout: 0, white: 0, dawn: 0, grade: null, peep: 0, mirrorKids: 0 },
  timers: [],
  tweens: [],
  settings: { subSize: 1, reduceScares: false, shake: true, master: 0.9, voice: 1, sfx: 0.9 },
  dev: false,
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function wait(ms) {
  return new Promise((r) => G.timers.push({ t: G.time + ms / 1000, r }));
}

export function tween(obj, key, to, ms, ease = (t) => t) {
  return new Promise((r) => {
    G.tweens = G.tweens.filter((tw) => !(tw.obj === obj && tw.key === key));
    G.tweens.push({ obj, key, from: obj[key], to, t0: G.time, d: Math.max(0.001, ms / 1000), ease, r });
  });
}

export function tick() {
  for (let i = G.timers.length - 1; i >= 0; i--) {
    if (G.time >= G.timers[i].t) { const t = G.timers[i]; G.timers.splice(i, 1); t.r(); }
  }
  for (let i = G.tweens.length - 1; i >= 0; i--) {
    const tw = G.tweens[i];
    const k = clamp((G.time - tw.t0) / tw.d, 0, 1);
    tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(k));
    if (k >= 1) { G.tweens.splice(i, 1); tw.r(); }
  }
}

export const fadeTo = (v, ms = 400) => tween(G.fx, 'fade', v, ms);

// Run an async cutscene with the player's input locked.
export async function cut(fn) {
  G.lock++;
  try { return await fn(); } finally { G.lock = Math.max(0, G.lock - 1); }
}
