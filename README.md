# เสียงตามสาย — THE LAST ANNOUNCEMENT

A Thai 2D side-scrolling psychological horror game (Coma-style), mobile-first in landscape, built from `THE_LAST_ANNOUNCEMENT_Game_Design_Document_TH.md`. Vanilla HTML5 Canvas + Web Audio, no build step, no external assets required.

## Run

```bash
node tools/serve.mjs
```

Open http://localhost:8123. On a phone, connect to the same Wi-Fi and open the LAN address the server prints, then tap **เริ่มเกมใหม่** (this unlocks audio, goes fullscreen and locks landscape). Headphones recommended.

`?dev` adds chapter-jump buttons on the title screen and exposes `window.G` for testing.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Walk | ◀ ▶ (slide between them) | A / D, ← → |
| Use / door / hide (button shows the verb) | ใช้ | E, ↑, Enter |
| Run (loud) | วิ่ง (hold) | Shift |
| Crouch (quiet) | ย่อ | C, ↓ |
| Flashlight (she sees it from far) | ไฟฉาย | F |
| Listen (stop, hear direction) | ฟัง (hold) | Q |
| Journal / names / Match Evidence | สมุด | J |
| Pause / settings | ❚❚ | Esc |

## What's in it

- **3 parts, every scene in the GDD**: car opening, village sala, mother's house and tape M01, P1 lock box (406), Daow's room drawing scare, 03:17 PA call with the Don't Answer choice (answer / silence / peephole); school gate, P.3 classroom (board 22→23), P2 desk-tag matching, first teacher encounter, library P3 (317), Chase C1 to the nurse room, the photo memory, fuse/breaker P4 (switch 4 = PA calls your name), archive tape ARCHIVE03 and flashback; PA room fake-Daow + mirror reveal; Part 3 flooded school, power + P5 wiring, Teacher Ratree's checkpoint (with the bell question when `voice_mark ≥ 2`), the 23-name announcement with the mother-voice interruption, and the final choice → **Ending A / B / C** with credits.
- **ครูเวร AI**: patrol → suspicious (heels stop) → investigate → chase → search; hears running through doors, sees the flashlight beam; follows you between rooms; hide spots; caught → checkpoint, nothing lost; "skip chase" after 3 catches.
- **Sound**: fully synthesized (rain inside/outside, insects, wind, fans, fluorescent buzz, drone, heartbeat, heels, knocks, bell ×2, chalk, PA pops, static, slams, water…), spatialized and muffled through walls, with directional captions for every gameplay sound.
- **Accessibility**: subtitle size, reduce jump scares/flashing, screen shake toggle, volume sliders, choices default to silence on timeout.

## Thai voice acting (ElevenLabs Eleven v3)

All 121 lines live in `js/data/lines.js` (text + v3 audio tags + in-game FX). The game plays subtitles only until audio exists.

1. Get an API key at elevenlabs.io (free tier: 10,000 credits/month; this script ≈ 5,000).
2. Pick voices for `pakin, daow, mom, teacher, announcer, officer, child` and put their ids in `tools/voices.config.json`:
   ```bash
   node tools/generate-voices.mjs --list-voices
   ```
3. Generate (key only via environment variable — PowerShell shown):
   ```powershell
   $env:ELEVENLABS_API_KEY="your-key"; node tools/generate-voices.mjs --dry-run; node tools/generate-voices.mjs
   ```
   Re-roll one take: `--only M01_4 --force`. One character: `--speaker mom`.

Takes are generated dry; the game adds the PA/tape/radio/"Nameless" processing live, so the real and fake Daow share one voice. Free-tier audio is non-commercial and needs ElevenLabs attribution.

## Art

All art is painted and lives in `assets/`; the game draws a procedural fallback only for anything missing.

| What | Where | Notes |
|---|---|---|
| Room backgrounds | `assets/bg/<room>_<n>.jpg` | 1920×1080 panels, each covering 960 world units left→right; listed in `assets/bg/manifest.json` |
| Dialogue portraits | `assets/portraits/<char>_<expr>.png` | 800×1000 RGBA; missing expressions fall back to `_neutral`; listed in `assets/portraits/manifest.json` |
| Character sprites | `assets/sprites/<char>/full.png` | one side-view pose (facing right), animated in code as a cut-out (stride, bob, crouch, rim light) |
| Title / ending CGs | `assets/art/title.jpg`, `end_a.jpg`, `end_b.jpg`, `end_c.jpg` | title-screen background and ending cards |

Door and object positions in `js/game/world.js` are aligned to the painted rooms; `tools/roomcheck.html?r=<room>` stitches a room's panels and overlays every interactive x position to check alignment after replacing art. Clocks, chalkboard text, mirror reflections and lamps are drawn live on top of the paintings. The prompts used are in `ART_PROMPTS_V2_FULL.md` / `docs/ART_PROMPTS.md`.

## Making another game in this style

The project includes a Claude Code skill: `.claude/skills/thai-2d-horror/` (SKILL.md + references + the full working template). Ask Claude Code to "make a Coma-style Thai horror game from this story" and it will use it. To use it in every project, copy that folder to `~/.claude/skills/`.

## Layout

```
index.html  css/style.css  manifest.webmanifest
js/main.js                 boot, rooms, interaction, caught/restore, menus
js/engine/                 audio · render (lighting/post) · paint (procedural art) · chars · input
js/game/                   ctx · state · world (rooms) · story (scenes) · player · teacher (AI) · ui
js/data/                   lines (dialogue) · names (23 children, items)
tools/                     serve.mjs · generate-voices.mjs · voices.config.json
assets/voice/  assets/bg/
```
