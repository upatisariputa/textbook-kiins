# I Dress Up

A working, local browser courseware demo for *First Comprehension: Comics*, pages 6–7. Plain HTML, CSS, and vanilla JavaScript ES modules. No build, npm, framework, CDN, external fonts, or external network requests.

## Run

From this directory:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/** in Chrome or Safari. Keep the server running. Use a 1280×800 landscape viewport for the primary layout; desktop widths of 1024px and larger are supported. The practice pane scrolls internally when necessary. ES modules and camera access require serving the page; opening `index.html` as a file is not supported. The application requires no internet connection. Speech synthesis depends on voices installed on the device; availability varies by OS/browser.

## Activities

- **WORDS:** flip four cards, listen, choose a Korean meaning, retry mistakes, then celebrate and continue.
- **SENTENCES:** chunk picture tiles and synchronized row highlights. Tap a sentence or EN for English chunks; choose KO for Korean sentence audio. The playing language button animates. Repeated row taps always replay English.
- **SHADOW READING!:** a single narrator voice followed by a timed turn; automatic progression; previous/next/repeat and pause/resume. Pause freezes playback or the turn countdown and pauses voice capture; Play continues. Optional voice recordings can be compared per sentence. Reading video offers a live camera, guided script, recording, playback, and download.
- **SHADOW WRITING!:** two writing tasks, two true/false shading tasks, and a drawing activity. The speaker plays the English question and, for WRITE steps, reveals and plays sequential model chunks. Separate EN/KO buttons play only the question in that language. Handwriting supports a proportional two-row answer area with six gray guides matching the book, erasing, and praise without recognition. The Trace button starts off; each WRITE step remembers its own on/off setting. Keyboard mode aligns words against the nearest accepted answer and shows replacements, inserted words, extras, capitalization, and final-period fixes. Drawing has six colors, two brush sizes, eraser, clear, and PNG export.
- **QUIZ:** a full-width activity with the textbook pane hidden for both parts; four picture-based completions with retries, progress, and a 4/4 completion score; a local photo picker/camera with a celebratory red circle. The score counts completed items after retries; photos are never graded.

The back chevron is intentionally inert, as required by the specification. Progress and media are in memory for this page session. Refreshing resets them. Switching tabs stops playback, cancels timed work, stops recording, and releases camera/microphone tracks. Leaving the browser tab does the same. Recordings and photos are local blobs; nothing is uploaded. Downloads are the only persistent user output.

The book remembers the active item's page and region. Manual page changes hide its highlight on the other page and restore it steadily on return. SENTENCES (including its default title row), SHADOW READING and SHADOW WRITING restore their current item on tab entry with the usual three blinks. WORDS clears the selection on entry; its completed-answer marks are progress, not one selected card. QUIZ hides the book and clears the previous tab's active region.

Page 7 mirrors worksheet handwriting, typed answers, shading, and drawings live, including when viewed from another tab with the book visible. QUIZ hides the book without discarding mirrored work or the name. WRITE shows whichever input was edited most recently; switching modes preserves both inputs. Handwriting copies the verified `practiceArea` at aspect 3.6214, fitting the measured width and height remaining above Done/result feedback. Its model trace wraps across both rows. Ink mirrors exclude guides, trace text, and canvas backgrounds. Typed answers wrap to the two printed lines and shrink when needed. Tap the book's Name line to enter up to 20 characters (including Korean names); Done or Enter saves, Escape cancels. Names and mirrored work stay in memory only.

## Audio

The app works before audio generation. `assets/audio/available.js` starts empty, so the app immediately uses `speechSynthesis` without requesting nonexistent media files. Generated files play from `assets/audio/<id>.m4a`; load/play failures fall back automatically. All English audio, including every SHADOW READING sentence, uses the single narrator voice (Samantha, rate 140); Korean audio uses Yuna. The browser selects the requested voice where available, then an appropriate language voice. Permission or missing-voice failures are reported inline in English.

AudioPlayer reuses one media element for all clips. The first pointer or keyboard gesture starts a tiny silent WAV and silently primes speech synthesis; Safari's playback audio session is selected when available. Successful unlocking removes both gesture listeners and warms the indexed local M4A files with up to three concurrent requests. Source changes, pause/resume, and cancellation are guarded against callbacks from earlier clips. No manifest or recording paths change.

Generate the audio on a Mac with `say` and `afconvert`:

```sh
bash scripts/gen-audio.sh
bash scripts/gen-audio.sh --force
```

The first command skips existing nonempty files. `--force` regenerates them. The script prints each item, reports unavailable voices, and updates `assets/audio/available.js` even when only some items succeed. Install the requested voices in macOS settings if needed: Samantha and Yuna. The script does not download voices. **It was not run during implementation.** Reload the page after generation. If you add professional audio manually, list those IDs in `assets/audio/available.js`, or run the script to index existing files. There are no sound effects; spoken praise and visual feedback remain.

`scripts/audio-manifest.tsv` has `id`, `voice`, `rate`, and `text` columns. To synchronize it after editing content, use Node (development only; not required to run the app):

```sh
node --input-type=module - <<'JS'
import { writeFileSync } from 'node:fs';
import { AUDIO } from './data/content.js';
writeFileSync('scripts/audio-manifest.tsv', 'id\tvoice\trate\ttext\n' + Object.values(AUDIO).map(a => [a.id, a.voice, a.rate, a.text].join('\t')).join('\n') + '\n');
JS
```

## Edit content and behavior

`data/content.js` owns the content and `CONFIG`: pane ratio, hotspot blink count/duration, audio gaps, narrator and Korean voices, echo pause timing, answer chunk loops, feedback timing, ink colors/sizes, choice pools, and accepted answers. `CONFIG.ttsText` applies exact-text pronunciation overrides to audio data and the speech fallback without changing displayed content; standalone `I` is spoken as `I.`. The manifest contains the same spoken text. The verified percent coordinates are copied exactly from `source/hotspots.json`. Original source files are untouched; the app uses copies under `assets/img/`.

Korean translations are **audio-only**, except the WORDS meaning buttons in `js/tabs/words.js`, which render `WORDS[].ko` / `CONFIG.choices.meanings` with `lang="ko"`. The child's own input, including a Korean name on page 7, is displayed as entered. No sentence translations or Korean UI labels are rendered. Page-7 input coordinates in `INPUT_REGIONS` are copied exactly from `source/input-regions.json`.

Styles live in `css/app.css`. Shared services are in `js/audio.js`, `js/ebook.js`, and `js/ui/`. Tab implementations live in `js/tabs/`. Layout decorations live in CSS; all learning behavior settings live in `CONFIG`. Reduced-motion users receive steady highlighting and instant shading/stamps, with no shaking or confetti motion.

## Browser capabilities and privacy

Microphone and video recording use `getUserMedia` and `MediaRecorder`, with a supported WebM or MP4 codec selected at runtime. Allow access when prompted. Unsupported, denied, unavailable, or disconnected devices receive an inline English message and do not prevent other activities. Video captures camera and microphone; use speakers if you also want the original audio heard in the recording. No synthetic pronunciation scoring or media grading is performed. Tablet camera/file-picker behavior and OS voices depend on the device.

## Checks

```sh
node scripts/check.mjs
node tests/correction.test.js
node tests/audio.test.js
node tests/media.test.js
node tests/book-mirror.test.js
node tests/ebook.test.js
bash -n scripts/gen-audio.sh
```

The static check runs `node --check` on every JS/module file, checks HTML and module references, validates all manifest entries against content, and checks copied images and hotspot coordinates against the prepared inputs. Audio/media tests use simulated browser APIs to verify sequencing, interruption, fallback, permission failures, and device cleanup; they do not verify audible output or real recording hardware.

Implementation checks passed. Live browser verification was blocked in this workspace: the sandbox denied the server listening socket, the Playwright connector required unavailable approval, and local headless Chrome exited before loading. Visual layout, console behavior in a real browser, actual OS voices, physical microphone/camera, browser downloads, and tablet/Safari behavior still need a manual pass. Audio generation was intentionally not run. See the implementation contract in `context/issue-contracts/` for the recorded scope.
