Change request 07 (product owner): CHANGE_06 made the handwriting box too small. The box must be a **proportional, scaled-up copy of the textbook answer area** (2 handwriting rows), and it must sit higher. Keep everything else as is.

## Data (verified, already in `source/input-regions.json`)
`write1.practiceArea` and `write2.practiceArea`: the book box (percent of page) that the practice canvas copies, with:
- `aspect` = width / height = **3.6214** (use it for the canvas)
- `guides[]` = 6 lines as fractions of the box height: row 1 top 0.05 (solid), mid 0.2214 (dashed), base 0.3929 (solid); row 2 top 0.55 (solid), mid 0.7214 (dashed), base 0.8929 (solid). Copy into `data/content.js` — do not re-measure.

## Required
1. **Canvas = scaled copy of `practiceArea`**: canvas aspect ratio exactly 3.6214. Width = available width of the step body; if the resulting height does not fit (no scrolling at 1280×800 and 1024×768, with the model chunks visible and the Done button visible), reduce the width while keeping the ratio (left-aligned with the toolbar). Expected around 780×215 css px at 1280×800.
2. **Guides**: draw the 6 lines at the `guides` fractions, same gray/solid/dashed styles as now (2 rows × solid/dashed/solid). Nothing else.
3. **Book mirror**: map the whole canvas uniformly onto the step's `practiceArea` box on page 7 (same aspect → simple scale; no per-row math). Row 1 and row 2 must line up with the printed rows. Replace the CHANGE_06 single-row `handwritingPlacement` logic.
4. **Trace text**: wrap the model answer over the 2 rows like the textbook answer key (e.g. "The girl dresses up / as a clown."), baseline on each row's base line, cap height ≈ row top→base. Use the same word-wrap/shrink helper as the keyboard mirror (`fitTextRows`).
5. **Move it up**: no vertical centering. Order inside the WRITE step: question row → model chunks (when visible) → mode toggle + Pen/Eraser/Clear/Trace toolbar → canvas directly below → hint + Done. Spare space goes to the bottom, not above the canvas.
6. Keyboard mode, SHADE, DRAW and Name are unchanged.

Run `node scripts/check.mjs` and all tests (update geometry tests: aspect, guide positions, canvas→practiceArea mapping). Reply with a short list of changes (file:line) and the measured canvas size logic.
