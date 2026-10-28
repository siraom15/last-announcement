import { G } from './ctx.js';

const SAVE_KEY = 'tla_save_v1';
const META_KEY = 'tla_meta_v1';

export function freshState() {
  return {
    part: 1,
    room: 'road',
    x: 330,
    facing: 1,
    flags: {},
    inv: {},
    names: {},        // index -> true once confirmed
    voiceMark: 0,
    journal: { facts: {}, doubts: {}, rules: {} },
    flashlight: false,
    objective: '',
    checkpoint: null,
    catches: 0,
  };
}

const clone = (o) => JSON.parse(JSON.stringify(o));

export function saveCheckpoint(id) {
  G.S.checkpoint = id;
  const snap = clone(G.S);
  G.cpSnapshot = snap;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch (e) { /* storage may be unavailable */ }
}

export function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

export function restoreCheckpoint() {
  const catches = G.S.catches;
  G.S = clone(G.cpSnapshot);
  G.S.catches = catches;
}

export function meta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || { endings: {}, settings: null }; }
  catch (e) { return { endings: {}, settings: null }; }
}
export function saveMeta(m) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
}

export const confirmedCount = () => Object.keys(G.S.names).length;
