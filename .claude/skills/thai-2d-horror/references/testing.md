# Testing

1. `node tools/serve.mjs` (or the `game` entry in `.claude/launch.json` for the desktop Browser pane). ES modules + voice fetches need http://, not file://.
2. Open `http://localhost:8123/?dev`:
   - title shows DEV chapter-jump buttons (from `devJump` keys);
   - `window.G` is exposed; the loop keeps ticking in a background tab; auto-pause on tab-hide is disabled.
3. Viewport 844×390 (phone landscape). Add `document.body.classList.add('touch')` to force touch controls on a desktop pointer.
4. Fast-forward cutscenes: `for (…) { await sleep(400); G.ui.skip(); }`. Detect choices with `document.querySelector('.choice')` and click buttons by index.
5. Must pass before shipping:
   - every ending reaches its card and "retry" returns to the choice;
   - caught → restores checkpoint with key items intact;
   - each puzzle solvable from in-world clues; wrong answers give feedback + hint after 2 tries;
   - no console errors other than optional-asset 404s;
   - readable brightness on a phone (flashlight on and off).
6. On a real phone: same Wi-Fi, open the LAN URL printed by `serve.mjs`, tap Start (audio unlock + fullscreen + landscape lock).
