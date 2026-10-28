---
name: thai-2d-horror
description: Build a mobile-first (landscape) 2D side-scrolling psychological horror game in the style of "The Coma" — dark painted rooms, flashlight cone lighting, a stalker enemy that hunts by sound, hiding spots, Thai-language subtitles/UI, synthesized Web Audio soundscape and Thai voice acting generated with ElevenLabs Eleven v3. Use when the user wants to create a new horror game in this style, port a story/GDD into one, or add rooms/scenes/voices to such a game. Vanilla HTML5 Canvas + ES modules, no build step.
---

# Thai 2D horror (Coma-style) game kit

A complete, working game lives in `template/` (it is *เสียงตามสาย — The Last Announcement*). New games are made by **copying the template and replacing the story layer**, never by rewriting the engine.

```
template/
  index.html, css/style.css, manifest.webmanifest   UI shell, touch controls, rotate prompt
  js/engine/   audio.js  render.js  paint.js  chars.js  input.js     ← reuse as-is
  js/game/     ctx.js state.js player.js teacher.js ui.js            ← reuse (rename teacher → your stalker)
               world.js  story.js                                    ← REWRITE per game
  js/data/     lines.js  names.js                                    ← REWRITE per game
  js/main.js   boot, rooms, interaction, caught/restore, menus       ← small edits only
  tools/       serve.mjs  generate-voices.mjs  voices.config.json
```

## Workflow

1. **Read the user's story/GDD fully.** Extract: characters (→ voice keys), locations (→ rooms), puzzles, choices that matter, endings, the enemy's rules.
2. **Copy the template** into the project root (`cp -r <skill>/template/* .`). Keep `tools/`, `js/engine/`, `css/`.
3. **Write `js/data/lines.js`** — every voiced line, Thai text only in `t`, ElevenLabs v3 audio tags in `tag` (`[whispers]`, `[sobbing]`, `[shouting]`…), and an in-game `fx` chain. See `references/voice-elevenlabs.md`.
4. **Write `js/game/world.js`** — one entry per room: `paint()` (static, painted once), `dyn()` (per-frame), `lights()`, `objs` (doors / use / hide), `left`/`right` edges, `amb` (ambience mix). See `references/rooms-and-art.md`.
5. **Write `js/game/story.js`** — `ACTS` (object actions), `LOCKS` (gates), `onEnter`, `update` (zone triggers), scene functions, `onRestore`, `devJump`. Every cutscene is `await cut(async () => { … })`. See `references/story-scripting.md`.
6. **Tune the stalker** in `teacher.js` (speeds, hearing radii, patrol route) — GDD numbers convert at ~80 px per metre.
7. **Run** `node tools/serve.mjs` and test with `?dev` (chapter-jump buttons + `window.G`). Test at 844×390 (phone landscape). Play every ending. See `references/testing.md`.
8. **Voices**: `node tools/generate-voices.mjs --dry-run` → map voices in `tools/voices.config.json` → generate. The game works with subtitles only until files exist.

## Non-negotiables (what makes it feel like Coma, and fair)

- **Side view, rooms joined by doors.** Up = use door. No free-roaming maze; the player should learn the map fast so *sound* is what's unsettling.
- **Darkness is the art direction.** Ambient darkness 0.85–0.95, flashlight cone + few flickering practical lights. Characters are rim-lit silhouettes. Colour grade per act via `multiply`.
- **The stalker is readable.** Heels/footsteps are always audible *and* captioned with direction (◀ ▶ ▲ ▼ ◇). She stops (silence) when listening. Running is loud, crouching silent, flashlight visible from far. Hide spots are fixed and marked. Getting caught → checkpoint, never lose key items. Offer "skip chase" after 3 catches.
- **Every scare has Plant → Payoff → Aftermath** (a journal entry, a rule learned, or a flag). No random face-jumps.
- **Choices with consequences use a timeout default** that is the *safe* choice (silence by inaction).
- **Accessibility**: every important sound has a subtitle or `UI.cue`, reduce-scares toggle, subtitle size, no mic input required.
- **Mobile first**: 960×540 stage scaled to fit; d-pad left, action cluster right, context verb on the big button; landscape lock + rotate prompt; fullscreen on start; audio unlocked on first tap.

## Thai writing rules

- Natural spoken Thai, short lines. Protagonist speaks little; let ambience work.
- Fakes display the *real* speaker name (don't spoil via UI) — difference is in FX and behaviour.
- Fonts: Noto Sans Thai (UI) + Noto Serif Thai (title cards, handwriting). Never letter-space Thai body text heavily (breaks vowels/tone marks).
- Thai reading speed for unvoiced subtitles ≈ 11 chars/sec (already in `say()`).

## Realistic visuals

The template paints everything procedurally (gradients, grime, water stains, flood lines, AO) so it ships with zero assets. For painted/photo-real backgrounds: drop `assets/bg/<roomId>.jpg` (exact room width × 540) and list the id in `assets/bg/manifest.json`; the renderer overlays it automatically and the lighting pass still applies. Prompt guide in `references/rooms-and-art.md`.
