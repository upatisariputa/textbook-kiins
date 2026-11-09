Change request 02 (product owner). SHADOW WRITING question row: separate the speaker button from the EN / KO buttons, consistent with the SENTENCES change. Keep everything else as is.

Current (`js/tabs/shadow-writing.js:52-76`): one `.listen-button` = speaker icon + `.language-pill`; each press cycles EN→KO; after either language, WRITE steps reveal the model chunks and blink them with chunk audio.

New behavior (all 5 steps: WRITE 1, WRITE 2, SHADE 1, SHADE 2, DRAW):
- Question row layout: `[🔊 speaker button] Question text ………… [EN] [KO]`. EN/KO buttons on the right of the row, same look/size as the SENTENCES `.sentence-language` buttons (≥ 40px targets). No language pill inside the speaker button anymore.
- **🔊 speaker button** = guided play: English question audio (`q_<id>`), then for WRITE steps reveal `.model-chunks` and run the existing chunk blink + chunk audio sequence (`CONFIG.model.loops`). For SHADE / DRAW it just plays the English question.
- **EN button** = English question audio only (`q_<id>`), no chunk sequence.
- **KO button** = Korean question audio only (`q_<id>_ko`), no chunk sequence. Still no Korean text anywhere.
- Each press: cancel current playback/sequence, highlight the step's left region (p.7), show a speaking/active state on the pressed button only, clear it when done or cancelled.
- Once the model chunks were revealed for a step they stay visible (as now).
- Remove the per-step EN→KO cycle state and the language pill from SHADOW WRITING. Remove `CONFIG.clickCycle` if nothing else uses it.
- `aria-label`s: "Listen and practice", "Play in English", "Play in Korean".
- Must still fit without scrolling at 1280×800 and 1024×768 (WRITE step with chunks visible + handwriting canvas + Done button; keyboard mode with correction result; DRAW with Save).

After changing: run `node scripts/check.mjs` and all tests; reply with a short list of changes (file:line).
