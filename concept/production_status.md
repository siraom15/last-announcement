# Art production status — updated 2026-10-29

Source brief: `ART_PROMPTS_V2_FULL.md`. Generated with the built-in image generator.

User approved Pakin, Daow and Duty Teacher turnaround designs in this chat.
All five turnaround sheets and all fourteen dialogue portraits are saved.
Portraits pass 800x1000 RGBA/transparent-pixel checks and are registered in the portrait manifest.
Pakin's portrait was visually checked in the game's dialogue overlay.

Background masters are built at 2 pixels per world unit, then sliced to 1920x1080 JPEG panels.
Pixels beyond the world's right boundary are padded and clipped by the game's existing room canvas.
This preserves a continuous master without fabricating additional playable room area.
Generated images are resized for export; export dimensions do not imply native generator resolution.

All 42 background panels across 21 room/lighting variants are exported and registered in `assets/bg/manifest.json`.
All four sprite sources are saved in `assets/sprites/{pakin,daow,teacher,nameless}/full.png`.
All four 1920x1080 title/ending illustrations are saved in `assets/art/{title,end_a,end_b,end_c}.jpg`.

**Technical validation:** all 69 requested image files pass `tools/validate-art.py`.
The report at `qa/art_validation.json` records every file, dimensions, transparency and sprite alpha bounds.
Sprite heights are Pakin 400, Daow 270, Teacher 540 and Nameless 620 pixels. Daow's one-pixel resampling height loss was corrected and revalidated.
These checks confirm export properties, not complete visual acceptance or a finished animation rig.

**Runtime checks:** Pakin's dialogue portrait was checked in the game. The school-gate background loads and scrolls in the browser with no console errors observed. The library background and Duty Teacher portrait were also checked with no console errors; screenshot: `qa/library_in_game.jpg`. Portrait and background manifests are complete.
The game still uses its procedural animated characters. Full-body sprite sources are not animation rigs.
Title and ending images are delivered assets and have not been connected to the menu/ending screens.

**Outstanding work:**

- Manually separate or redraw puppet pieces with intact concealed joints, identical canvas bounds and origin.
- Test elbows and knees at 45 and 90 degrees; repair holes and overlapping texture.
- Complete room-by-room visual/coordinate QA for interactable overlays, mutable props and walk-lane clearance. Architecture positions are approximate, not fully verified against every specified world coordinate.
- Review faint peripheral alpha pixels on both light and dark backgrounds; exact-height validation measures all nonzero alpha pixels.

The experimental `pakin_parts_source.png` is a **rejected segmentation draft**, not a production rig: the torso retains an arm and sleeve components do not define correct elbow segments. No fabricated limb layers were added to `assets/sprites`.
The Nameless source follows the written design; no separately approved turnaround was supplied. Mom and Ratree are supporting generated designs.

Backgrounds use measured floor alignment or proportional resizing/cropping; per-room export JSON files record each choice. Some measured wall/floor regions are resized separately to put the boundary at y799.
The base prompt set, reference notes, recent raw-source paths and rejected draft prompt are saved in `generation_record.json`.

Raw background source PNGs (under `C:/Users/sirao/.codex/generated_images/01a183e0-916a-79f1-a12b-cc98630f2f23/`):

- road: `exec-d513001c-b822-4595-8bdf-dcd49bcbcaf9.png`, measured floor y=492
- sala: `exec-016c4de9-de92-4970-8d1c-8e35de07ef9a.png`, measured floor y=550
- street: `exec-6ae1ac2a-8bf4-45fb-bc3e-820253e3e09f.png`
- living: `exec-9fe020e7-5646-4e9d-aab3-534f41e3be14.png`

Export/audit scripts: `tools/export-art.py`, `tools/background-layout.py` and `tools/validate-art.py`.
