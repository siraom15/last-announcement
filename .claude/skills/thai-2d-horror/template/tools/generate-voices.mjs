#!/usr/bin/env node
// Generate Thai voice lines with ElevenLabs Eleven v3 (model_id "eleven_v3") from js/data/lines.js.
//
//   set ELEVENLABS_API_KEY=...            (PowerShell: $env:ELEVENLABS_API_KEY="...")
//   node tools/generate-voices.mjs --dry-run          # count characters / credits first
//   node tools/generate-voices.mjs --list-voices      # show voice ids your account can use
//   node tools/generate-voices.mjs                    # generate every missing line
//   node tools/generate-voices.mjs --only M01_1,M01_2 --force
//   node tools/generate-voices.mjs --speaker mom      # only one character
//
// Output: assets/voice/<LINE_ID>.mp3 + assets/voice/manifest.json (the game only loads ids listed there).
// In-game FX (PA band-pass, cassette wow, radio crush, layered "Nameless" voice) are applied live,
// so generate CLEAN dry takes here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'voice');
const cfgPath = path.join(root, 'tools', 'voices.config.json');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const { LINES } = await import(pathToFileURL(path.join(root, 'js', 'data', 'lines.js')).href);
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const KEY = process.env.ELEVENLABS_API_KEY;
const API = 'https://api.elevenlabs.io';

if (flag('--list-voices')) {
  if (!KEY) die('Set ELEVENLABS_API_KEY first.');
  const r = await fetch(`${API}/v1/voices`, { headers: { 'xi-api-key': KEY } });
  if (!r.ok) die(`HTTP ${r.status}: ${await r.text()}`);
  const { voices } = await r.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name.padEnd(24)} ${[v.labels?.gender, v.labels?.age, v.labels?.accent].filter(Boolean).join(', ')}`);
  process.exit(0);
}

const only = opt('--only')?.split(',');
const speaker = opt('--speaker');
const useTags = !flag('--no-tags');
let ids = Object.keys(LINES).filter((id) => (!only || only.includes(id)) && (!speaker || LINES[id].v === speaker));
fs.mkdirSync(outDir, { recursive: true });
const exists = (id) => fs.existsSync(path.join(outDir, id + '.mp3'));
if (!flag('--force')) ids = ids.filter((id) => !exists(id));

const textFor = (L) => (useTags && L.tag ? `${L.tag} ${L.t}` : L.t);
const chars = ids.reduce((a, id) => a + textFor(LINES[id]).length, 0);
console.log(`${ids.length} line(s) to generate · ${chars} characters (≈ ${chars} credits on Eleven v3; free tier = 10,000/month)`);
const byVoice = {};
for (const id of ids) byVoice[LINES[id].v] = (byVoice[LINES[id].v] || 0) + textFor(LINES[id]).length;
console.log('per speaker:', byVoice);
if (flag('--dry-run')) { writeManifest(); process.exit(0); }
if (!KEY) die('Set ELEVENLABS_API_KEY (never commit it). Get one at elevenlabs.io → Profile → API keys.');

let ok = 0, fail = 0;
for (const id of ids) {
  const L = LINES[id];
  const voice = cfg.voices[L.v];
  if (!voice || voice.voice_id.startsWith('REPLACE')) { console.warn(`skip ${id}: no voice_id for "${L.v}" in tools/voices.config.json`); fail++; continue; }
  const body = {
    text: textFor(L),
    model_id: cfg.model_id || 'eleven_v3',
    language_code: cfg.language_code || 'th',
    // v3 stability is a preset: 0.0 Creative · 0.5 Natural · 1.0 Robust
    voice_settings: { stability: voice.stability ?? 0.5, similarity_boost: voice.similarity_boost ?? 0.75, use_speaker_boost: true },
  };
  try {
    const buf = await tts(voice.voice_id, body);
    fs.writeFileSync(path.join(outDir, id + '.mp3'), buf);
    ok++; console.log(`✓ ${id}  (${L.v})  ${L.t}`);
  } catch (e) { fail++; console.error(`✗ ${id}: ${e.message}`); if (/quota|401|402/.test(e.message)) break; }
}
writeManifest();
console.log(`done: ${ok} ok, ${fail} failed/skipped`);

async function tts(voiceId, body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const msg = `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); continue; }
    // some accounts reject language_code on v3 — retry once without it
    if (r.status === 400 && body.language_code) { delete body.language_code; continue; }
    throw new Error(msg);
  }
  throw new Error('retries exhausted');
}
function writeManifest() {
  const have = Object.keys(LINES).filter(exists);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(have));
  console.log(`manifest: ${have.length}/${Object.keys(LINES).length} lines have audio`);
}
function die(m) { console.error(m); process.exit(1); }
