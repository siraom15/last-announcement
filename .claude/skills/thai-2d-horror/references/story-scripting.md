# Story scripting (`js/game/story.js`)

## Primitives

```js
await say('LINE_ID', { hold: 300, keep: false, dir: '◀' })  // subtitle + voice (or texture); tap to skip
await think('ข้อความ')                                       // unvoiced protagonist thought
await read('หัวเรื่อง', '<p class="hand">…</p>')              // paper document modal (classes: hand big small)
await cut(async () => { … })                                 // lock input for a cutscene
await wait(ms); await tween(obj, key, to, ms); await fadeTo(1, 400)
give('item'); note('facts'|'doubts'|'rules', key, text); objective('…'); cp('CP_ID')
const c = await choose('หัวข้อ', [{ id, t }], { timeout: 10000, def: 'silent' })
actor({ kind: 'daow'|'daow_fake'|'kid'|'teacher_npc'|'ratree'|'pakin_npc'|'nameless', room, x, facing, alpha }) / unactor(a)
scare('stinger'|'slam', shake); Audio.at('knock', room, x)  // spatial one-shot (muffled through doors)
UI.cue('กึก… กึก…', '▶')                                   // directional caption — use for EVERY gameplay sound
G.camTarget = leftEdgeX / null; G.player.walkTo(x); G.enterRoom(id, x, facing, silent)
G.fx: fade flash shake tension flicker noise(glitch) water red white dawn grade peep mirrorX kids …
```

## Structure

- `ACTS[name](obj)` — what an object does. Re-entrant: check flags first ("ไม่มีอะไรแล้ว").
- `LOCKS[name]()` — return `true` to let a door through; may run a cutscene first (unlock).
- `edge(room, side)` — block walk-off edges until the story allows.
- `onEnter(id)` — first-visit events (`first = !flag('v_'+id)`), act-gated scenes.
- `update(dt)` — zone/timer triggers (time in room, facing away from a drawing, x > threshold).
- `onRestore(cpId)` — re-arm whatever a checkpoint needs (re-start a chase, respawn the stalker, re-show a choice).
- `devJump(key)` — set flags/inventory to start mid-game for testing; listed on the title screen with `?dev`.

## Checkpoints

`cp(id)` snapshots `G.S` (flags, inventory, names, journal, voiceMark, room, x). Place one: start of each act, before every chase, before every irreversible choice, after every major reveal. Caught → `G.onCaught()` → restore. Endings offer "retry from before the choice" (restore the last checkpoint, `onRestore` re-opens the choice).

## Scene patterns that work

- **Don't Answer**: voice calls name → 3 options (answer / silent / investigate) with timeout defaulting to silent. Answering increments `voiceMark` (more haunting, a later extra test) but never locks the true ending silently.
- **Turn-away scare**: track `facing === sign(x - target)` for > 1 s → play sound behind → change the thing → stinger when they look back.
- **Mirror reveal**: `dyn()` draws a character clipped to the mirror rect while `G.fx.mirrorX > 0`.
- **Peephole**: swap to the outside room silently with `G.fx.peep = 1`, then swap back.
- **Roll call / montage**: loop with per-index side effects (flicker at N, water rises, figures accumulate), interrupt once with a choice.
- **Flashback**: white fade → dedicated cutscene room with actors → white fade back → protagonist line → journal fact.
