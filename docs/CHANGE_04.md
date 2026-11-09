Change request 04 (product owner). Two changes; keep everything else as is.

## 1. One voice for SHADOW READING
- The character voices sound bad (`Jester` is mostly laughter: `sr_s1` is 4.1s vs 1.7s for the narrator). Use the **narrator voice for every SHADOW READING sentence**.
- `data/content.js`: set `character: 'narrator'` for s1, s2, s3 (or drop the `character` field and always use the narrator) and remove the `clown`, `dinosaur`, `bee` entries from `CONFIG.voices`.
- `scripts/audio-manifest.tsv`: `sr_s1`, `sr_s2`, `sr_s3` → `Samantha` rate `140` (same as `sr_title` / `sr_s4`). Keep ids unchanged. `check.mjs` agreement must pass.
- SHADOW READING subtitle "Meet the voices. Read along. Find your own." → "Listen. Read along. Then say it yourself."
- Do not run `scripts/gen-audio.sh`; the reviewer regenerates `sr_s1..s3`.

## 2. Remove all sound effects
- Remove the WebAudio feedback tones entirely: `tone()` and `toneContext()` in `js/audio.js` and every call site (`js/tabs/words.js:33,45`, `js/tabs/quiz.js:38,44`, `js/tabs/shadow-writing.js:140,159,163`, `js/ui/effects.js:5`).
- Remove the AudioContext resume from the first-gesture unlock in `js/audio.js` (unlock then only primes the persistent media element + speechSynthesis + `navigator.audioSession`). Make sure unlock still completes (it must not wait on a removed promise).
- Keep the spoken praise clips (`praise_great`, `praise_try`) and all visual feedback (confetti, shake, colors) as they are.
- Update tests that referenced tones / AudioContext.

## Also
- Update README.md wording (character voices → single narrator voice; no sound effects).
- Run `node scripts/check.mjs` and all tests. Reply with a short list of changes (file:line).
