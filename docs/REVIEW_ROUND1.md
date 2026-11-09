Review round 1 — tested in a real browser (Chromium) at 1280×800 and 1024×768, with generated m4a audio present. Fix every item below. Keep everything else as is (it works well).

## Must fix
1. **QUIZ part 2 — red circle stamp never appears.** `js/tabs/quiz.js:95` does `stamp.hidden = false` on an `<svg>` element. `SVGElement` has no `hidden` IDL property, so the `hidden` attribute stays and `[hidden]{display:none!important}` hides the stamp forever. Use `removeAttribute('hidden')` / `setAttribute('hidden','')` (also on Retake/reset). Grep the whole codebase for `.hidden =` used on SVG elements and fix the same way.
2. **QUIZ part 1 gives away the answer.** The prompt image is the full panel crop (`p6_panelN.png`) whose speech bubble shows "I dress up as a clown." Use the bubble-free character crops instead: clown → `crops/clown.png`, dinosaur → `crops/dinosaur.png`, bee → `crops/bee.png`, me → `crops/girl.png`.
3. **Primary controls are pushed under the bottom bar at 1280×800.** Observed: SHADOW WRITING WRITE step after the model chunks appear → `Done` button and the keyboard correction result are cut off; DRAW → `Save` cut off; QUIZ part 1 → `Next` cut off. Requirement: at 1280×800 AND 1024×768, every step's main content + action buttons are fully visible without scrolling the right pane. Make variable areas flexible (canvas / drawing area `flex:1; min-height:0`, compact spacing) instead of fixed heights.
4. **SENTENCES tiles are too small.** At 1280×800 the tile images are only ~90px tall, so the "image split in 3" idea is lost. Make the tile stage the visual focus: tile images at least ~180px tall at 1280×800 (scale down proportionally at 1024×768), while all 5 sentence rows stay visible without scrolling (rows may be more compact).
5. **Left page does not reset on tab change.** After QUIZ part 2 (page 7), switching to WORDS still shows page 7. On entering a tab, show that tab's default page and clear the highlight: WORDS / SENTENCES / SHADOW READING / QUIZ part 1 → p.6; SHADOW WRITING / QUIZ part 2 → p.7.

## Should fix
6. SHADOW WRITING stepper: a completed step (e.g., SHADE 1 after a correct answer) is styled exactly like the active step, so two pills look selected. Active = strong filled style; completed = ✓ icon + green text, clearly different.
7. Reading video panel: add close on `Escape` and on backdrop click (stop camera tracks as the X button does).
8. Handwriting / Keyboard toggle: the active mode is not obvious. Style `aria-pressed="true"` clearly (filled background + bold).
9. Top-bar `LET'S READ` tag looks like a button but does nothing. Restyle it as a plain, non-interactive label (no border/button look) or remove it.

## After fixing
- Run `node scripts/check.mjs` and the tests again.
- Reply with a short list: item number → what changed (file:line).
