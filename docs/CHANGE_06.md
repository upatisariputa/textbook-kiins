Change request 06 (product owner): make the SHADOW WRITING handwriting box match the textbook's 3-line row. Keep everything else as is.

## Problem
The practice canvas (`js/ui/canvas.js:75-91`, `CONFIG.handwriting.guideTop/guideGap`) draws a **4-line** guide (top, dashed, red baseline, extra descender line) with empty space below. Children naturally write down to the lowest line, so on the book (3 lines: top / dashed mid / base, `source/input-regions.json`) their letters hang below the base line. The owner does not want to solve this with instructions — **shrink the box instead**.

## Required
1. **3 lines only, same look as the book**: solid top line, dashed middle line, solid baseline (same gray as the book; no red line, no 4th line).
2. **Shrink the writing box**: the canvas area ends shortly below the baseline — keep only a small descender margin (about 0.35 × the top→baseline height) and a small top margin (about 0.25 ×). No large empty area below the baseline. The box should be visibly smaller than now; center it vertically in the free space or let the free space go to the model-chunk area — your choice, but no scrolling and Done stays visible at 1280×800 and 1024×768.
3. Keep the row proportions identical to the book row (top→mid = mid→base) so what the child writes maps 1:1 to the book.
4. Trace text: baseline on the new bottom line, cap height up to the top line (fit width as now).
5. Update `handwritingPlacement` (book-layout.js) and constants so practice top line → book row `top`, practice baseline → book row `base` exactly as now (only the guide geometry changes). Strokes already drawn when the geometry changes do not need migration.
6. Eraser/clear, pen width, mirror throttling unchanged.

Run `node scripts/check.mjs` and all tests (update geometry tests). Reply with a short list of changes (file:line) and the new guide constants.
