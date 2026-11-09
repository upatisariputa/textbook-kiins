Change request 01 (from the product owner after reviewing the SENTENCES tab). Two changes only; keep everything else as is.

## 1. "I" chunk is pronounced "capital I"
- macOS `say` reads a standalone "I" as "capital I" (measured: `say "I"` = 1.10s, identical to `say "capital I"`; `say "I."` = 0.60s, identical to `say "eye"`).
- Affected audio ids: `s_title_c1`, `s_s1_c1`, `s_s2_c1`, `s_s3_c1`, `s_s4_c1`.
- Fix: add a TTS-only text override so the **spoken** text is `I.` while the **displayed** chunk stays `I`. Put the override in `data/content.js` (e.g., `CONFIG.ttsText = { 'I': 'I.' }` applied when building the AUDIO entries), so it also applies to the speechSynthesis fallback. Update `scripts/audio-manifest.tsv` text for those 5 ids to `I.` and keep `scripts/check.mjs` agreement passing.
- Do not run `scripts/gen-audio.sh`; the reviewer will regenerate those 5 files.

## 2. SENTENCES: explicit EN / KO buttons
Current: a single pill shows the *next* language and the row tap cycles EN→KO. This is confusing.
New behavior:
- Each sentence row gets **two small buttons on the right: `EN` and `KO`** (replace the single pill; keep the speaker icon style consistent).
  - `EN` → plays the English chunk sequence with tile lighting + karaoke (current EN behavior).
  - `KO` → plays the Korean sentence audio, all tiles lit, KO button shows the speaking animation (current KO behavior). Still **no Korean text** anywhere.
  - While playing, the pressed button shows an active/speaking state.
- Tapping the **row itself** (outside the buttons) = select the row + play **EN** (re-listen). No more hidden EN→KO cycle in SENTENCES.
- Both buttons and the row select the sentence, update the tile stage and highlight the left region as now.
- Buttons must not be nested inside another `<button>` (invalid HTML). Restructure the row (e.g., row = `div` with a main row button + two language buttons) while keeping keyboard accessibility (`aria-label` like "Play in English" / "Play in Korean").
- Touch targets ≥ 40px at 1280×800; everything must still fit without scrolling at 1280×800 and 1024×768.
- Update the hint text under the list to: "Tap a sentence, or choose EN / KO."
- Remove the now-unused cycle state from SENTENCES. Leave SHADOW WRITING's question listen button unchanged.

## After changing
- Run `node scripts/check.mjs` and all tests.
- Reply with a short list of changes (file:line).
