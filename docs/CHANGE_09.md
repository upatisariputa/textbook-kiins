Change request 09 — pre-demo fix from external review. Core client requirement: "the left textbook must always show what the child is doing on the right". Keep everything else as is.

## Reproduced (real browser, 1280×800)
| # | Steps | Right pane | Left highlight |
|---|---|---|---|
| A | Open SENTENCES for the first time | row 01 "I / Dress Up" is styled `.active` | **none** |
| B | SENTENCES → tap row 02 (clown) → go to SHADOW READING → back to SENTENCES | row 02 still `.active` | **none** (expected panel1) |
| C | SENTENCES with row 02 active → tap `p.7` toggle → tap `p.6` toggle | row 02 still `.active` | **none** after returning to p.6 (expected panel1) |

Root cause: `ebook.show(page)` / tab `enter()` clear the hotspot, and the e-book does not remember the active region, so nothing redraws it. Patching only SENTENCES is not enough — fix the model.

## Required
1. **E-book owns the active region.** In `js/ebook.js` keep `active = { page, region } | null`.
   - `highlight(page, region)`: set `active`, switch to `page`, blink 3× then steady (as now).
   - `clear()`: set `active = null`, hide.
   - `show(page)` (auto or the manual p.6/p.7 toggle): switch page; if `active.page === page` show the **steady** highlight immediately (no blink), otherwise hide it but **keep `active`** so returning to that page restores it.
2. **Every tab's `enter()` restores its own active item** (blink once on entry is fine):
   - SENTENCES: highlight the currently active row's region. Default active row is row 01 → `title`. (Right pane shows row 01 as active on first entry, so the left must show `title`.)
   - SHADOW READING / SHADOW WRITING: keep the CHANGE round-2 behavior (current sentence / step) via the same API.
   - WORDS: the right pane has no persistent selected card → `clear()` on entry (as now). If you find any persistent "selected" state in WORDS, apply the same rule.
   - QUIZ: e-book hidden (CHANGE_08) — must not leave a stale `active` that shows up later on another tab: tabs set their own state on entry.
3. **Invariant test** (`tests/`): simulate the e-book + tab state for scenarios A, B, C plus SHADOW READING/WRITING tab round-trips and manual page toggles; assert the hotspot is visible on the expected region/page whenever the right pane has an active item, and hidden otherwise.

Run `node scripts/check.mjs` and all tests. Reply with a short list of changes (file:line).
