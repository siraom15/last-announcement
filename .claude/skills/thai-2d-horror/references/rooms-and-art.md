# Rooms & art

## Coordinate system

- Stage is 960×540. Rooms are `w` wide (900–2400 typical) × 540 tall.
- Back wall meets floor at `WB = 400`; characters stand on `FLOOR = 440`; things in front of characters (front-row desks, a fallen tree) go in `fg()`.
- Interaction radius is 70 px — keep interactive objects ≥ 90 px apart.

## Room definition

```js
p3: {
  name: 'ห้องเรียน ป.3', w: 1500, reverb: 'small'|'hall'|'out'|'huge', floor: 'wood'|'tile'|'road'|'water',
  dark: 0.9,                       // ambient darkness 0..1 (renderer scales by 0.8)
  outdoor: false,                  // screen-space rain + lightning
  amb: { rainIn: .55, fan: .6, drone: .5 },   // layers: rainOut rainIn insects wind fan buzz drone water car tick
  kids: [700, 1250],               // optional act-3 shadow figures
  paint(ctx, w) { … },             // ONCE, into an offscreen canvas (seeded RNG → identical every visit)
  fg(ctx, t) { … }, dyn(ctx, t) { … },          // per frame (clocks, chalk text, mirror reflections, rain on glass)
  lights: (t) => [{ x, y, r, i, c: '255,200,140', sy }],   // i = 0..1; use flick(t, k, dead) for dying tubes
  left: { to, x }, right: { to, x },            // walk-off edges
  objs: [
    { id, x, kind: 'door', name, verb, to, toX, lock: 'lockKey', sfx: 'metal'|'stairs' },
    { id, x, kind: 'use',  name, verb, act: 'actionKey', show: (S) => !S.inv.key },
    { id, x, kind: 'hide', name: 'ตู้ล็อกเกอร์', verb: 'ซ่อน' },
  ],
}
```
`this.wins = [...]` inside `paint` stores window rects for `rainGlass()` in `dyn`.

## Paint toolkit (`engine/paint.js`)

Walls: `wallWood`, `wallSchool` (two-tone + flood line), `wallPlaster`. Floors: `floorWood`, `floorTile` (terrazzo + wet sheen), `floorRoad`.
Outdoor: `nightSky({dawn|morning})`, `treeLine`, `palm`, `pole` (with horn speakers + wires), `car`, `fallenTree`, `villageSign`, `sala`, `thaiHouse`, `schoolFacade` (returns window rects), `gate`.
Props: `door({metal,glass,sign})`, `stairs(dir)`, `windowFrame({bars})`, `clockBody/clockHands`, `chalkboard`, `studentDesk`, `chair`, `lockers`, `cabinet`, `wardrobe`, `shelf`, `table`, `bed`, `curtain`, `frame`, `paper`, `board`, `sofa`, `tapeDeck`, `fuseBox`, `micDesk`, `wiringPanel`, `mirrorFrame`, `fluoFixture`, `bulb`, `hornSpeaker`, `screwPlaque`, `familyDrawing`, `textOn`.
Realism helpers: `grime(ctx,x,y,w,h,k,tint)` (stains, mould, drips, specks), `floodLine`, `aoEdges`, `contact` (contact shadow), `grain`.

Recipe for a convincing prop: gradient body (`box`) → inner panels → a highlight edge → `grime` → `contact` shadow. Then let the lighting pass hide 80% of it.

## Characters (`engine/chars.js`)

`drawChar(ctx, type, x, y, opts)` — types `man`, `girl`, `teacher`, `kid`, `nameless`. Options: `facing, moving, phase, crouch, armOut, hold:'light'|'book', reach (0..1), tilt, jitter, ribbon, alpha, rim, drip, h`. Add a palette entry to `PAL` for a new character. Scripted characters go in `G.actors` as `{kind, room, x, …}` (see `ACTOR_TYPE` in render.js).

## Painted art drop-in (backgrounds + portraits)

- **Backgrounds**: `assets/bg/<roomId>.jpg` (one wide image, any size with aspect w:540) **or** panels `<roomId>_1.jpg`, `_2` … each covering 960 game units (1920×1080 recommended). Variants: `<roomId>_<variant>` (e.g. `sala_morning`). List every file name in `assets/bg/manifest.json`. Wall/floor line at 74% height. Leave clocks, chalk text and mirrors blank — `dyn()` draws them.
- **Portraits** (Coma-style dialogue): `assets/portraits/<char>_<expr>.png`, 800×1000 transparent, half-body; protagonist faces right (shown left), others face left (shown right). Expressions: neutral, scared, sad, eerie, happy — falls back to `_neutral`. List names (no extension) in `assets/portraits/manifest.json`. `portraitOf()` in story.js maps each line's voice/fx/tags to char+expression; tape lines get a sepia "memory" filter, impostor lines a glitch.
- See `art-prompts-example.md` for a complete prompt sheet (style blocks, per-room layout with object x positions, file names).

Prompt template for an image model:

> 2D side-view game background, orthographic, {room description}, abandoned rural Thai {school/house} after a 2010 flood, water stain line at one third height, peeling paint, mould, night, almost no light, desaturated {act palette}, painterly realism, no people, no text, wide panorama {w}x540, floor line at 74% height

Act palettes: Act 1 blue-grey rain · Act 2 sick green/brown fluorescent · Act 3 black-grey with dawn orange at the end.
