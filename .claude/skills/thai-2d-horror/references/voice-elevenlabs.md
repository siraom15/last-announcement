# Thai voices with ElevenLabs Eleven v3

## Line format (`js/data/lines.js`)

```js
M01_4: L('mom', 'tape', 'ถ้าลูกได้ยินใครเรียกชื่อลูกจากเสียงตามสาย อย่าขานรับ', '[sobbing] [serious]'),
//       voice  fx      Thai text (subtitle + TTS)                              v3 audio tags (TTS only)
PAR_1:  L('daow', 'ghost', 'พี่รู้แล้วใช่ไหมว่าหนูอยู่ที่ไหน', '[sweet]', 'ดาว'),   // 5th arg = subtitle name override
```

IDs are stable file names: `assets/voice/<ID>.mp3`. Generated per-name lines (e.g. a roll call) can be added programmatically at the bottom of `lines.js`.

## FX chains (applied live in `audio.js → playBuffer`)

| fx | use for | what it does |
|---|---|---|
| `dry` | protagonist, real people in the room | small room reverb |
| `echo` | enemy in corridors | big reverb |
| `tape` | cassette recordings | HP/LP, wow-flutter LFO on playbackRate, saturation, hiss bed |
| `radio` | car radio / walkie | narrow band-pass + hard clip + static |
| `pa` | loudspeaker / PA system | band-pass, distortion, slap-back delay, huge reverb, speaker pop |
| `ghost` | real ghost, gentle | slightly slowed, dark, wet |
| `nameless` | the impostor / mimic | 3 detuned copies (×1, ×0.84, ×1.17) panned wide, staggered |
| `muffled` | behind a door | low-pass 650 Hz |
| `whisper` | voice right at your ear | dry, hard-panned |

**Generate clean, dry takes.** Never ask v3 to sound "like a radio" — the game does that, and the same take can then be reused (e.g. the real and fake sister share one voice).

## Generating

```bash
node tools/generate-voices.mjs --dry-run        # characters ≈ credits; free tier = 10,000/month
node tools/generate-voices.mjs --list-voices    # ids usable by this API key
node tools/generate-voices.mjs                  # only missing files
node tools/generate-voices.mjs --only ID1,ID2 --force
node tools/generate-voices.mjs --speaker mom
```

- Key from env var `ELEVENLABS_API_KEY` only. Never write it into files.
- `model_id: "eleven_v3"`, `language_code: "th"` (auto-retried without it if rejected).
- v3 `stability` is a preset: **0.0 Creative** (most emotion, best obedience to tags), **0.5 Natural**, **1.0 Robust** (flat announcer).
- Pick voices that handle Thai well from the Voice Library (filter language: Thai) and add them to "My Voices" first. Child voices: search "child"/"kid" — or use a young female voice with `[childlike]`.
- After generation the script rewrites `assets/voice/manifest.json`; the game only fetches ids listed there (no 404 spam), and lines without audio fall back to subtitles + an FX texture (hiss/static) so the scene still "sounds" diegetic.
- Free-tier licensing: non-commercial and requires attribution to ElevenLabs. Tell the user if they plan to sell the game.

## Budget tips

- A 2–3 hour script fits in ~5k characters if lines stay short (the reference game: 121 lines, ~4,970 chars).
- Tags count as characters — keep them to 1–2 per line.
- Re-roll a single bad take with `--only ID --force`.
