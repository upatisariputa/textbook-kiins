import { SENTENCES, CONFIG, crop } from '../../data/content.js';
import { $, $$, heading, icon, TaskScope, download } from '../ui/dom.js';
import { LocalRecorder } from '../ui/media.js';
import { celebrate } from '../ui/effects.js';

export function createShadowReading(root, { audio, ebook }) {
  const scope = new TaskScope();
  const videoScope = new TaskScope();
  const recordings = new Map();
  let index = 0;
  let running = false;
  let paused = false;
  let enabled = false;
  let recordingToggleGeneration = 0;
  let videoBlob = null;
  let videoURL = null;
  let compareAudio = null;
  let videoOpen = false;
  let mounted = false;
  root.innerHTML = `${heading('03', 'Listen. Then it’s you!', 'Listen. Read along. Then say it yourself.')}<div class="reading-options"><label class="toggle-label"><input type="checkbox" class="record-toggle"><span>${icon('mic')} Record my voice</span></label><button class="video-open">${icon('camera')} Reading video</button></div><div class="notice mic-notice" role="status" hidden></div><div class="reading-card"><div class="reading-image-wrap"><img class="reading-image" alt="" draggable="false"><span class="reading-badge">LISTEN & ECHO</span></div><div class="reading-copy"><div class="reading-counter"></div><p class="reading-sentence"></p><div class="reading-status" role="status">Ready when you are.</div><div class="turn-timer" hidden><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="timer-track" cx="40" cy="40" r="34"/><circle class="timer-progress" cx="40" cy="40" r="34"/></svg><span class="timer-mic">${icon('mic')}</span><span class="countdown-number"></span></div></div></div><div class="reading-controls"><button class="reading-prev" aria-label="Previous sentence">‹ <span>Prev</span></button><button class="primary reading-play">${icon('play')} Play</button><button class="reading-next"><span>Next</span> ›</button><button class="reading-repeat">${icon('repeat')} Repeat</button></div><div class="reading-dots" aria-label="Choose a sentence">${SENTENCES.map((s, i) => `<button aria-label="Sentence ${i + 1}: ${s.chunks.join(' ')}" data-sentence="${i}"><span></span></button>`).join('')}</div><div class="voice-library" hidden><div class="eyebrow">MY VOICE COLLECTION</div><div class="voice-rows"></div></div><p class="subtle-tip">${icon('mic')} Your recordings stay on this device.</p><section class="video-panel" role="dialog" aria-modal="true" aria-labelledby="video-title" hidden><div class="video-dialog"><div class="video-heading"><div><span class="eyebrow">YOUR LITTLE READING STUDIO</span><h2 id="video-title">Lights, camera, read!</h2></div><button class="video-close" aria-label="Close reading video">✕</button></div><p class="video-instruction">Listen, then read with your own voice. Everything stays on your device.</p><div class="notice video-notice" role="status" hidden></div><div class="video-layout"><div><video class="camera-preview" autoplay muted playsinline aria-label="Live camera preview"></video><video class="video-playback" controls playsinline aria-label="Your recorded reading video" hidden></video></div><div class="video-script">${SENTENCES.map((sentence, i) => `<p data-line="${i}"><span>${i + 1}</span>${sentence.chunks.join(' ')}</p>`).join('')}</div></div><p class="video-status" role="status">Opening your camera…</p><div class="video-controls"><button class="primary video-start" disabled>● Start recording</button><button class="video-stop" disabled>■ Stop</button><button class="video-save" disabled>Save video ↓</button><button class="camera-retry" hidden>Retry camera</button></div></div></section>`;
  const message = (selector, text) => { const node = $(selector, root); node.textContent = text; node.hidden = !text; };
  const mic = new LocalRecorder(text => {
    message('.mic-notice', text);
    enabled = false;
    $('.record-toggle', root).checked = false;
  });
  const camera = new LocalRecorder(text => {
    message('.video-notice', text);
    $('.camera-retry', root).hidden = false;
    $('.video-start', root).disabled = true;
  });
  function stopCompare() { compareAudio?.pause(); compareAudio = null; }
  function status(text) { $('.reading-status', root).textContent = text; }
  function render(highlight = true) {
    const sentence = SENTENCES[index];
    $('.reading-image', root).src = crop(sentence.image);
    $('.reading-image', root).alt = index === 0 ? 'The girl playing dress-up' : `Comic panel ${index}`;
    $('.reading-counter', root).textContent = `SENTENCE ${index + 1} OF ${SENTENCES.length}`;
    $('.reading-sentence', root).textContent = sentence.chunks.join(' ');
    $('.reading-prev', root).disabled = index === 0;
    $('.reading-next', root).disabled = index === SENTENCES.length - 1;
    $$('[data-sentence]', root).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    if (highlight) ebook.highlight(6, sentence.region);
    else ebook.show(6);
  }
  function updatePlay() {
    $('.reading-play', root).innerHTML = running && !paused ? `${icon('pause')} Pause` : `${icon('play')} Play`;
    root.classList.toggle('reading-paused', paused);
  }
  async function saveMic(sentenceIndex) {
    const blob = await mic.stop();
    if (!blob) return;
    const previous = recordings.get(sentenceIndex);
    if (previous) URL.revokeObjectURL(previous.url);
    recordings.set(sentenceIndex, { blob, url: URL.createObjectURL(blob) });
    renderLibrary();
  }
  function renderLibrary() {
    $('.voice-library', root).hidden = !recordings.size;
    $('.voice-rows', root).innerHTML = [...recordings.keys()].sort((a, b) => a - b).map(i => `<div class="voice-row"><span>${SENTENCES[i].chunks.join(' ')}</span><button data-original="${i}">${icon('play')} Original</button><button data-me="${i}">${icon('play')} Me</button></div>`).join('');
    $$('[data-original]', root).forEach(button => button.addEventListener('click', () => {
      stopReading(); index = Number(button.dataset.original); render(); audio.play(`sr_${SENTENCES[index].id}`);
    }));
    $$('[data-me]', root).forEach(button => button.addEventListener('click', () => {
      stopReading(); index = Number(button.dataset.me); render();
      compareAudio = new Audio(recordings.get(index).url);
      compareAudio.play().catch(() => message('.mic-notice', 'ⓘ This recording could not play. Record it again and retry.'));
    }));
  }
  function stopReading() {
    scope.cancel();
    running = false;
    paused = false;
    updatePlay();
    audio.stop();
    stopCompare();
    saveMic(index);
    $('.reading-sentence', root).classList.remove('karaoke');
    $('.turn-timer', root).hidden = true;
    status('Ready when you are.');
  }
  function pauseReading() {
    paused = true;
    audio.pause(); mic.pause();
    updatePlay();
    status('Paused. Tap Play to continue.');
  }
  function resumeReading() {
    paused = false;
    audio.resume(); mic.resume();
    updatePlay();
    status($('.turn-timer', root).hidden ? 'Listen to the original…' : enabled ? 'Your turn! Recording your voice…' : 'Your turn!');
  }
  async function countdown(duration, task, generation, update, isPaused = () => false) {
    let previous = performance.now();
    let left = duration;
    while (task.generation === generation) {
      const now = performance.now();
      if (!isPaused()) left = Math.max(0, left - (now - previous));
      previous = now;
      if (!isPaused()) update(left, duration);
      if (!left) return true;
      if (!(await task.wait(CONFIG.shadow.countdownTickMs))) return false;
    }
    return false;
  }
  async function play() {
    stopReading();
    running = true; updatePlay();
    const generation = scope.generation;
    if (enabled && !(await mic.open())) enabled = false;
    if (scope.generation !== generation) return;
    for (; index < SENTENCES.length; index++) {
      render();
      status(paused ? 'Paused. Tap Play to continue.' : 'Listen to the original…');
      $('.reading-sentence', root).classList.add('karaoke');
      const playback = audio.play(`sr_${SENTENCES[index].id}`);
      if (paused) audio.pause();
      const result = await playback;
      if (scope.generation !== generation) return;
      $('.reading-sentence', root).classList.remove('karaoke');
      if (result.cancelled || result.unavailable) { stopReading(); status('Tap Play to try the audio again.'); return; }
      const pauseMs = Math.max(CONFIG.shadow.minimumPauseMs, result.duration * CONFIG.shadow.pauseFactor);
      const recording = enabled && mic.start();
      if (paused) mic.pause();
      status(paused ? 'Paused. Tap Play to continue.' : recording ? 'Your turn! Recording your voice…' : 'Your turn!');
      $('.turn-timer', root).hidden = false;
      const complete = await countdown(pauseMs, scope, generation, (left, total) => {
        $('.countdown-number', root).textContent = Math.ceil(left / 1000);
        $('.timer-progress', root).style.strokeDashoffset = 214 * (1 - left / total);
      }, () => paused);
      if (!complete) return;
      await saveMic(index);
      if (scope.generation !== generation) return;
      $('.turn-timer', root).hidden = true;
    }
    index = SENTENCES.length - 1;
    running = false; updatePlay();
    status('Great job! You read the whole story.');
    celebrate(root, audio);
  }
  $('.reading-play', root).addEventListener('click', () => running ? (paused ? resumeReading() : pauseReading()) : play());
  $('.reading-repeat', root).addEventListener('click', play);
  function move(next) { stopReading(); index = next; render(); status('Ready when you are.'); }
  $('.reading-prev', root).addEventListener('click', () => move(Math.max(0, index - 1)));
  $('.reading-next', root).addEventListener('click', () => move(Math.min(SENTENCES.length - 1, index + 1)));
  $$('[data-sentence]', root).forEach(button => button.addEventListener('click', () => move(Number(button.dataset.sentence))));
  $('.record-toggle', root).addEventListener('change', async event => {
    const generation = ++recordingToggleGeneration;
    enabled = event.target.checked;
    message('.mic-notice', '');
    if (enabled) {
      const opened = await mic.open();
      if (generation !== recordingToggleGeneration || !mounted || videoOpen) return;
      enabled = opened; event.target.checked = opened;
    } else { await saveMic(index); mic.release(); }
  });
  async function openCamera() {
    message('.video-notice', '');
    $('.camera-retry', root).hidden = true;
    $('.video-status', root).textContent = 'Opening your camera…';
    if (await camera.open(true)) {
      if (!videoOpen || !mounted) { camera.release(); return; }
      $('.camera-preview', root).srcObject = camera.stream;
      $('.camera-preview', root).play().catch(() => {});
      $('.video-start', root).disabled = false;
      $('.video-status', root).textContent = 'Ready! Your camera and microphone are on.';
    } else if (videoOpen) $('.video-status', root).textContent = 'You can close this panel and keep reading.';
  }
  $('.video-open', root).addEventListener('click', async () => {
    stopReading(); recordingToggleGeneration++; mic.release();
    videoOpen = true;
    $('.video-panel', root).hidden = false;
    $('.video-close', root).focus();
    await openCamera();
  });
  $('.camera-retry', root).addEventListener('click', openCamera);
  async function stopVideo() {
    videoScope.cancel(); audio.stop();
    $('.video-stop', root).disabled = true;
    $$('[data-line]', root).forEach(line => line.classList.remove('karaoke'));
    const blob = await camera.stop();
    if (blob) {
      videoBlob = blob;
      if (videoURL) URL.revokeObjectURL(videoURL);
      videoURL = URL.createObjectURL(blob);
      const playback = $('.video-playback', root);
      playback.src = videoURL; playback.hidden = false;
      $('.camera-preview', root).hidden = true;
      $('.video-save', root).disabled = false;
      $('.video-status', root).textContent = 'Great job! Watch your reading or save your video.';
    }
    $('.video-start', root).disabled = !camera.stream?.active;
  }
  function closeVideo() {
    videoOpen = false;
    stopVideo(); camera.release();
    $('.camera-preview', root).srcObject = null;
    $('.video-playback', root).pause();
    $('.video-panel', root).hidden = true;
    if (mounted) $('.video-open', root).focus();
  }
  $('.video-close', root).addEventListener('click', closeVideo);
  $('.video-panel', root).addEventListener('click', event => {
    if (event.target === event.currentTarget) closeVideo();
  });
  document.addEventListener('keydown', event => {
    if (videoOpen && event.key === 'Escape') {
      event.preventDefault();
      closeVideo();
    }
  }, true);
  $('.video-panel', root).addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const focusable = $$('button:not(:disabled), video[controls]', $('.video-panel', root)).filter(node => !node.hidden);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $('.video-start', root).addEventListener('click', async () => {
    if (!camera.start(true)) return;
    videoScope.cancel();
    const generation = videoScope.generation;
    $('.video-playback', root).pause();
    $('.video-playback', root).hidden = true;
    $('.camera-preview', root).hidden = false;
    $('.video-start', root).disabled = true;
    $('.video-stop', root).disabled = false;
    $('.video-save', root).disabled = true;
    for (let i = 0; i < SENTENCES.length; i++) {
      ebook.highlight(6, SENTENCES[i].region);
      $$('[data-line]', root).forEach((line, j) => line.classList.toggle('karaoke', i === j));
      $('.video-status', root).textContent = `Recording · Listen to sentence ${i + 1}`;
      const result = await audio.play(`sr_${SENTENCES[i].id}`);
      if (videoScope.generation !== generation) return;
      if (result.unavailable || result.cancelled) { await stopVideo(); return; }
      const duration = Math.max(CONFIG.shadow.minimumPauseMs, result.duration * CONFIG.shadow.pauseFactor);
      if (!(await countdown(duration, videoScope, generation, left => {
        $('.video-status', root).textContent = `Recording · Your turn! ${Math.ceil(left / 1000)}`;
      }))) return;
    }
    await stopVideo();
  });
  $('.video-stop', root).addEventListener('click', stopVideo);
  $('.video-save', root).addEventListener('click', () => {
    if (videoBlob) download(videoBlob, `my-reading.${videoBlob.type.includes('mp4') ? 'mp4' : 'webm'}`);
  });
  render(false);
  return {
    enter() { mounted = true; render(); },
    leave() {
      mounted = false; recordingToggleGeneration++;
      stopReading(); mic.release(); closeVideo();
    },
  };
}
