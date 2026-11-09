Change request 03 — iPad / Safari continuous audio playback. Keep the public AudioPlayer API (`play`, `sequence`, `stop`, `pause`, `resume`, events, speechSynthesis fallback) and every tab's behavior unchanged. Only the playback mechanism changes.

## Problem
`js/audio.js:88` creates a **new `Audio()` element for every clip**. iOS/iPadOS Safari (and macOS Safari's default autoplay policy) only allow `play()` with sound on an element that was started inside a user gesture. Clips started later without a tap are rejected (`NotAllowedError`) and our code then falls back to speechSynthesis → the voice suddenly changes to the device voice or goes silent. Affected flows (no tap between clips):
- SENTENCES / QUIZ / WORDS: 2nd and 3rd chunks of a sequence, KO-after-EN feedback audio
- SHADOW READING: auto-advance to the next sentence, original → "Your turn" → next
- SHADOW WRITING: question → model chunk loop (🔊 guided play)
- any praise audio played after an animation/timeout

## Required fix
1. **One persistent media element**: create a single `HTMLAudioElement` (e.g., in the AudioPlayer constructor, `preload="auto"`, `playsInline`) and reuse it for every clip by changing `src` + `load()` + `play()`. Never create a new `Audio()` per clip.
2. **Unlock on the first user gesture**: add a one-time, capture-phase `pointerdown` + `keydown` listener on `document`. Inside that handler (synchronously, no `await` before it):
   - play a tiny silent clip on the persistent element and pause it (generate silence as a WAV data URI, or add `assets/audio/silence.m4a` via the generator — your choice; a data URI avoids a file).
   - resume / create the shared WebAudio `AudioContext` used by the feedback tones (`js/audio.js` ~line 202) so ding/boop also work on iPad.
   - prime `speechSynthesis` with an empty/very short utterance at volume 0 so the fallback is also allowed later.
   - if `navigator.audioSession` exists (Safari 17+), set `navigator.audioSession.type = 'playback'`.
   Remove the listeners after the first successful unlock. Must not play any audible sound.
3. **Cancellation / pause / resume / timeouts** keep working with the single element: a new clip must cleanly cancel the previous one (detach old handlers before swapping `src`, ignore stale `ended`/`error` events from the previous clip via the existing session/generation check).
4. **Warm the cache** after the first unlock: `fetch()` every id in `AUDIO_FILES` once (sequentially or with small concurrency, ignore failures) so chunk gaps stay short on slow networks. Total is ~700 KB.
5. Do not change `scripts/gen-audio.sh` output paths or the manifest (real voice recordings will later replace the m4a files with the same ids).

## Tests
- Extend `tests/audio.test.js`: (a) a sequence of 3 clips uses the **same** element instance (no new Audio per clip); (b) stale `ended` from a cancelled clip does not resolve the next clip; (c) unlock handler plays silence once and removes its listeners; (d) fallback still triggers when the element errors.
- Run `node scripts/check.mjs` and all tests.

Reply with a short list of changes (file:line).
