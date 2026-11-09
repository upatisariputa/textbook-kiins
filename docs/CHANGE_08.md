Change request 08 (product owner). Two changes; keep everything else as is.

## 1. SHADOW WRITING: Trace hidden until pressed
- Replace the Trace checkbox (currently checked by default) with a **toggle button** `Trace` in the handwriting toolbar, same style as Pen/Eraser/Clear, `aria-pressed`.
- **Default OFF** for every WRITE step: the canvas shows only the 6 guide lines.
- Tap → trace text appears (aria-pressed=true, active style). Tap again → hidden. State is per step and kept while switching steps/tabs.
- Trace is never drawn on the book mirror (unchanged).

## 2. QUIZ: hide the textbook pane
- When the QUIZ tab is active (both part 1 and part 2), **hide the left e-book pane completely** and let the practice pane use the full width. Other tabs keep the 35/65 split and restore the e-book exactly as before (page + highlight behavior from their `enter()`).
- No hotspot highlight calls from QUIZ while hidden (remove or guard them).
- Use the extra width sensibly: part 1 picture + sentence + choices centered with a comfortable max width (e.g. ~900px); part 2 photo stage larger (keep aspect, keep Retake/Take a photo visible). No scrolling at 1280×800 and 1024×768.
- The page-7 mirror and Name data stay in memory (just not visible in QUIZ).
- Transition: instant or a short (≤200ms) width transition; no layout jump of the bottom tab bar.

Run `node scripts/check.mjs` and all tests. Reply with a short list of changes (file:line).
