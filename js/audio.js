import { AUDIO, CONFIG } from '../data/content.js';
import { AUDIO_FILES } from '../assets/audio/available.js';

// 10ms of zero-valued, mono 16-bit PCM. Keep the element unmuted while priming
// so Safari grants permission for later clips with sound on this same element.
function silentWav() {
  const bytes = new Uint8Array(44 + 80 * 2);
  const view = new DataView(bytes.buffer);
  const label = (offset, value) => [...value].forEach((char, i) => { bytes[offset + i] = char.charCodeAt(0); });
  label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
  label(8, 'WAVE'); label(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, 'data'); view.setUint32(40, bytes.length - 44, true);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}
const SILENCE = silentWav();

export class AudioPlayer extends EventTarget {
  constructor() {
    super();
    this.isPlaying = false;
    this.id = null;
    this.session = 0;
    this.cleanup = null;
    this.isPaused = false;
    this.pauseCurrent = null;
    this.resumeCurrent = null;
    this.files = new Set(AUDIO_FILES);
    this.failedFiles = new Set();
    this.media = new Audio();
    this.media.preload = 'auto';
    this.media.playsInline = true;
    this.media.setAttribute('playsinline', '');
    this.mediaGeneration = 0;
    this.unlocked = false;
    this.unlocking = false;
    this.unlockAttempt = 0;
    this.cachePromise = null;
    this.unlockHandler = () => this.#unlockOnGesture();
    document.addEventListener('pointerdown', this.unlockHandler, true);
    document.addEventListener('keydown', this.unlockHandler, true);
  }
  #unlockOnGesture() {
    if (this.unlocked || this.unlocking || this.isPlaying) return;
    this.unlocking = true;
    const attempt = ++this.unlockAttempt;
    const generation = ++this.mediaGeneration;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Optional Safari API. */ }

    // Invoke every permission-sensitive API synchronously inside this gesture.
    let playback;
    try {
      this.media.onended = this.media.onerror = this.media.onplaying = null;
      this.media.src = SILENCE;
      this.media.load();
      playback = this.media.play();
    } catch (error) { playback = Promise.reject(error); }
    try {
      if ('speechSynthesis' in window) {
        const primer = new SpeechSynthesisUtterance('.');
        primer.volume = 0;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(primer);
      }
    } catch { /* Unsupported speech must not block recorded audio. */ }

    const mediaReady = Promise.resolve(playback).then(() => {
      // A click may already have replaced the silence with a lesson clip.
      if (generation === this.mediaGeneration) this.media.pause();
    });
    mediaReady.then(
      () => this.#completeUnlock(),
      () => { if (attempt === this.unlockAttempt) this.unlocking = false; },
    );
  }
  #confirmMediaPlayback() {
    // A first lesson click can abort the silent primer. Its successful play
    // still proves this persistent element is unlocked.
    if (this.unlockAttempt && !this.unlocked) {
      this.#completeUnlock();
    }
  }
  #completeUnlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.unlocking = false;
    document.removeEventListener('pointerdown', this.unlockHandler, true);
    document.removeEventListener('keydown', this.unlockHandler, true);
    this.#warmCache();
  }
  #warmCache() {
    if (this.cachePromise) return;
    const ids = [...new Set(AUDIO_FILES)];
    let next = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          const response = await fetch(`assets/audio/${id}.m4a`, { cache: 'force-cache' });
          if (response.ok) await response.arrayBuffer();
        } catch { /* Warm-up is best effort; playback retains its fallback. */ }
      }
    };
    this.cachePromise = Promise.all(Array.from({ length: Math.min(3, ids.length) }, worker));
  }
  state(playing, id = null) {
    this.isPlaying = playing;
    this.id = id;
    this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: playing, isPaused: this.isPaused, id } }));
  }
  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.pauseCurrent?.();
    this.state(true, this.id);
  }
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.resumeCurrent?.();
    this.state(this.isPlaying, this.id);
  }
  stop() {
    this.session++;
    const cleanup = this.cleanup;
    this.cleanup = null;
    if (cleanup) cleanup();
    this.mediaGeneration++;
    this.media.onended = this.media.onerror = this.media.onplaying = null;
    this.media.pause();
    this.pauseCurrent = this.resumeCurrent = null;
    this.isPaused = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.state(false);
  }
  play(id) {
    this.stop();
    return this.playInSession(id, this.session);
  }
  async sequence(ids, gapMs = CONFIG.audio.gapMs, onItem = () => {}) {
    this.stop();
    const session = this.session;
    let duration = 0;
    for (let i = 0; i < ids.length; i++) {
      if (session !== this.session) return { cancelled: true, duration };
      onItem(i, ids[i]);
      const result = await this.playInSession(ids[i], session);
      duration += result.duration;
      if (result.cancelled || result.unavailable) return { ...result, duration };
      if (i < ids.length - 1 && !(await this.delay(gapMs, session))) return { cancelled: true, duration };
    }
    return { cancelled: false, duration };
  }
  delay(ms, session) {
    return new Promise(resolve => {
      const finish = ok => { clearTimeout(timer); if (this.cleanup === cancel) this.cleanup = null; resolve(ok); };
      const cancel = () => finish(false);
      const timer = setTimeout(() => finish(session === this.session), ms);
      this.cleanup = cancel;
    });
  }
  async playInSession(id, session) {
    if (session !== this.session) return { cancelled: true, duration: 0 };
    const entry = AUDIO[id];
    if (!entry) return this.unavailable('This audio is not available.');
    this.state(true, id);
    if (this.files.has(id) && !this.failedFiles.has(id)) {
      const result = await this.file(entry, session);
      if (!result.failed) return result;
      this.failedFiles.add(id);
    }
    if (session !== this.session) return { cancelled: true, duration: 0 };
    const paused = this.isPaused;
    const speech = this.speak(entry, session);
    if (paused) { this.isPaused = false; this.pause(); }
    return speech;
  }
  file(entry, session) {
    return new Promise(resolve => {
      const audio = this.media;
      const generation = ++this.mediaGeneration;
      let settled = false;
      let started = 0;
      let playAttempt = 0;
      let source;
      let timeout;
      const current = () => !settled && session === this.session && generation === this.mediaGeneration;
      const armTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => { if (current()) finish({ failed: true }); }, CONFIG.audio.startTimeoutMs);
      };
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        const duration = Number.isFinite(audio.duration) ? audio.duration * 1000 : started ? performance.now() - started : 0;
        if (generation === this.mediaGeneration) {
          audio.onended = audio.onerror = audio.onplaying = null;
          audio.pause();
        }
        if (this.cleanup === cancel) {
          this.cleanup = null;
          this.pauseCurrent = this.resumeCurrent = null;
          if (!result.failed) this.isPaused = false;
        }
        if (!result.failed && session === this.session) this.state(false);
        resolve({ duration, cancelled: false, ...result });
      };
      const cancel = () => finish({ cancelled: true });
      this.cleanup = cancel;
      const startedPlaying = () => {
        started ||= performance.now();
        clearTimeout(timeout);
      };
      const startAudio = () => {
        const attempt = ++playAttempt;
        try {
          Promise.resolve(audio.play()).then(() => {
            if (!current() || attempt !== playAttempt) return;
            startedPlaying();
            this.#confirmMediaPlayback();
          }, () => {
            if (current() && attempt === playAttempt) finish({ failed: true });
          });
        } catch { if (current() && attempt === playAttempt) finish({ failed: true }); }
      };
      this.pauseCurrent = () => { playAttempt++; clearTimeout(timeout); audio.pause(); };
      this.resumeCurrent = () => {
        if (!started) armTimeout();
        startAudio();
      };
      try {
        audio.onended = audio.onerror = audio.onplaying = null;
        audio.pause();
        audio.src = `assets/audio/${entry.id}.m4a`;
        audio.load();
        source = audio.src;
        audio.onplaying = () => {
          if (!current() || audio.currentSrc !== source || audio.readyState < 2) return;
          if (this.isPaused) audio.pause();
          else if (!audio.paused) startedPlaying();
        };
        // load() clears native ended/error state. Checking it also rejects an
        // old queued event that is dispatched to the newly attached handler.
        audio.onended = () => { if (current() && audio.currentSrc === source && audio.ended) finish({}); };
        audio.onerror = () => { if (current() && audio.error) finish({ failed: true }); };
        armTimeout();
        startAudio();
      } catch { finish({ failed: true }); }
    });
  }
  speak(entry, session) {
    if (!('speechSynthesis' in window)) return Promise.resolve(this.unavailable('🔊 Speech is unavailable in this browser. Try Chrome or Safari.'));
    return new Promise(resolve => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(entry.text);
      const voices = synth.getVoices();
      utterance.voice = voices.find(voice => voice.name === entry.voice)
        || voices.find(voice => voice.lang.replace('_', '-').toLowerCase() === entry.lang.toLowerCase())
        || voices.find(voice => voice.lang.startsWith(entry.lang.slice(0, 2))) || null;
      utterance.lang = entry.lang;
      utterance.rate = entry.rate / CONFIG.audio.wordsPerMinute;
      utterance.pitch = entry.pitch;
      let started = 0;
      let pausedAt = 0;
      let pausedDuration = 0;
      let settled = false;
      let timeout = setTimeout(() => finish({ unavailable: true }), CONFIG.audio.startTimeoutMs);
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        utterance.onstart = utterance.onend = utterance.onerror = null;
        if (this.cleanup === cancel) {
          this.cleanup = null;
          this.pauseCurrent = this.resumeCurrent = null;
          this.isPaused = false;
        }
        if (session === this.session) this.state(false);
        if (result.unavailable) {
          synth.cancel();
          this.dispatchEvent(new CustomEvent('notice', { detail: '🔊 A speech voice is unavailable. Check your browser or device voices, then tap Listen again.' }));
        }
        const duration = started ? (pausedAt || performance.now()) - started - pausedDuration : 0;
        resolve({ duration: Math.max(0, duration), cancelled: false, ...result });
      };
      const cancel = () => finish({ cancelled: true });
      this.cleanup = cancel;
      this.pauseCurrent = () => {
        clearTimeout(timeout);
        if (started) pausedAt = performance.now();
        synth.pause();
      };
      this.resumeCurrent = () => {
        if (pausedAt) pausedDuration += performance.now() - pausedAt;
        pausedAt = 0;
        if (!started) timeout = setTimeout(() => finish({ unavailable: true }), CONFIG.audio.startTimeoutMs);
        synth.resume();
      };
      utterance.onstart = () => {
        started = performance.now(); clearTimeout(timeout);
        if (this.isPaused) { pausedAt = started; synth.pause(); }
      };
      utterance.onend = () => finish({});
      utterance.onerror = event => finish(event.error === 'canceled' || event.error === 'interrupted' ? { cancelled: true } : { unavailable: true });
      try {
        synth.resume();
        synth.speak(utterance);
      } catch { finish({ unavailable: true }); }
    });
  }
  unavailable(message) {
    this.isPaused = false;
    this.state(false);
    this.dispatchEvent(new CustomEvent('notice', { detail: message }));
    return { unavailable: true, cancelled: false, duration: 0 };
  }
}

