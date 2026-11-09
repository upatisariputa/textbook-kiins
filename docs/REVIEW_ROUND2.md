Review round 2 — all 9 round-1 items verified fixed in a real browser at 1280×800 and 1024×768 (stamp shows, bubble-free quiz images, no cut-off controls, 188px tiles, page reset, stepper states, Esc/backdrop close, toggle style, plain label). Thank you.

## Regression to fix (introduced by round-1 item 5)
1. **Initial item is no longer highlighted on tab entry.** When entering SHADOW READING!, SHADOW WRITING! or QUIZ, the left hotspot stays hidden even though an item is already active on the right:
   - SHADOW READING → sentence 1 (title) is shown, but `title` on p.6 is not highlighted.
   - SHADOW WRITING → WRITE 1 (or whichever step is active) is shown, but `write1` on p.7 is not highlighted until the 🔊 button is pressed.
   - QUIZ part 1 → item 1 (clown) is shown, but `panel1` is not highlighted until an answer is chosen.
   Measured: after `tabs[i].click()` + 900ms, `.hotspot` has `hidden` for all three tabs. Round 1 behavior (highlight the active item on entry) was correct.
   Fix: on tab entry, first set the tab's default page + clear, THEN highlight the currently active item of that tab (same blink-3-times behavior). WORDS and SENTENCES have no active item on entry, so they stay cleared. QUIZ part 2 stays on p.7 without a region. Make sure the order cannot race (e.g., an entry handler clearing after the item render).

## After fixing
- Run `node scripts/check.mjs` and the tests again.
- Reply with a short list of changes (file:line).
