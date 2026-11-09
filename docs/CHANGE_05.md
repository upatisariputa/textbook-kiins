Change request 05 (product owner): mirror SHADOW WRITING inputs onto the textbook page 7 in the left pane, and make the page-7 `Name:` line writable. Keep everything else as is.

## Regions (verified)
`source/input-regions.json` — percent of the page image, same coordinate space as `source/hotspots.json` (603×782 base):
- `name`: the Name underline box (+ `baseline`).
- `write1` / `write2`: `area` + two handwriting `rows`, each with `top` (solid), `mid` (dashed), `base` (solid) line positions and `left`/`width`.
- `shade1` / `shade2`: `TRUE` / `FALSE` circle boxes.
- `draw`: the inside of the DRAW box.
Copy this data into `data/content.js` (or import the JSON) — do not re-measure.

## 1. Mirror layer on page 7 (left pane)
- Add a mirror layer inside the e-book page box, positioned in percent exactly like the hotspot layer, visible only while page 7 is shown (any tab, including QUIZ part 2). It sits under the highlight hotspot. Everything is `pointer-events: none` except the Name field (see 2).
- Updates live while the child works (throttle with `requestAnimationFrame`), and state persists in memory across tab switches.
- **WRITE handwriting**: render the practice canvas strokes into the step's book area. Map the practice canvas guide so its top guide line → book row 1 `top` and its baseline → row 1 `base` (uniform scale, left-aligned at row `left`). If the scaled width exceeds the row width, scale down uniformly to fit the width (keep baseline on row 1 `base`). Use a dark pencil color; eraser/clear reflect on the book too. Do NOT draw the faint trace text on the book.
- **WRITE keyboard**: render the typed text on the book lines in a child-friendly print font (`"Comic Sans MS", "Chalkboard SE", "Marker Felt", system-ui, sans-serif`), text baseline on row `base`, font size so the x-height ≈ `mid`→`base`. Word-wrap to row 2 if it doesn't fit; if still too long, shrink to fit.
- **Which one shows** for a WRITE step: the input edited most recently (handwriting or keyboard). Switching mode alone does not erase the other input.
- **SHADE**: when the child shades TRUE/FALSE in the practice pane, shade the same circle on the book with the same gray crayon scribble style (like the answer key). Mirror the wrong-answer fade-out too, so the book always matches the practice pane.
- **DRAW**: mirror the drawing canvas into the `draw` box (object-fit contain, centered, white background stays transparent so the book shows through).

## 2. Writable Name on page 7
- Tapping the Name line on the book (expand the hit area to at least 44px tall around the line; the line itself is tiny in the 35% pane) opens a small popover anchored to the left pane with a large text input (placeholder "Your name", max 20 chars, `Done` button, Enter submits, Esc cancels).
- The name renders on the book's Name line in the same print font, baseline on `name.baseline`, auto-shrinks to fit the line width. Empty → the line shows nothing (no placeholder on the book).
- Works from any tab while page 7 is visible. Keep it in memory only (no localStorage).
- Korean names are allowed (it's the child's own input, not translation text).

## 3. Checks
- At 1280×800 and 1024×768: mirrors align with the printed lines/circles/box, no right-pane layout regression, nothing scrolls.
- Run `node scripts/check.mjs` and all tests (add tests for the keyboard text fit/wrap function and region data). Reply with a short list of changes (file:line).
