Build the web app described in `docs/SPEC.md` in this directory (project root). Read the whole spec first and implement ALL of it.

Inputs already prepared (do not modify `source/`, copy what you need into `assets/img/`):
- `source/page6.png`, `source/page7.png` — textbook pages (1810×2346).
- `source/hotspots.json` — highlight regions in percent of the page image (verified, use as-is).
- `source/crops/*.png` — character/panel crops: clown, dinosaur, bee, girl, costumes, dressup, p6_panel1..4.
- `source/reference_player_p16.png` — reference look & feel of the existing player.

Rules:
- Plain HTML/CSS/vanilla JS ES modules. No build, no npm, no CDN, no network.
- Never display Korean translation text except the WORDS choice buttons (see spec §2).
- Everything shown must really work (no mocked features).
- Do not run `scripts/gen-audio.sh` (your sandbox may block macOS `say`); the app must work with the speechSynthesis fallback when audio files are missing.
- Before finishing, run `node --check` on every JS file and make sure `index.html` references only files that exist.

When done, reply with: (1) file list, (2) per-tab summary of what is implemented, (3) any deviation from the spec and why, (4) anything you could not verify.
