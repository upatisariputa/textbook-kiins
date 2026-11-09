import assert from 'node:assert/strict';
import { AudioPlayer } from '../js/audio.js';
import { AUDIO_FILES } from '../assets/audio/available.js';
import { CONFIG, SENTENCES } from '../data/content.js';

// Browser API doubles exercise lifecycle/order, not native Safari permissions.
const flush = () => new Promise(resolve => setImmediate(resolve));
let spoken = [];
let utterance;
let autoFinish = false;
let fileMode = 'fail';
let silenceMode = 'success';
let synthThrows = false;
const elements = [];
const plays = [];
const requests = [];
let fetching = 0;
let peakFetching = 0;

class GestureDocument {
  listeners = new Map();
  addEventListener(type, listener, capture) {
    assert.equal(capture, true, 'Unlock must run in the capture phase');
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener); this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener, capture) {
    assert.equal(capture, true);
    this.listeners.get(type)?.delete(listener);
  }
  gesture(type) { for (const listener of [...(this.listeners.get(type) || [])]) listener({ type }); }
  get count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}
class FakeAudio {
  src = '';
  currentSrc = '';
  duration = NaN;
  readyState = 0;
  paused = true;
  ended = false;
  error = null;
  pending = null;
  attributes = new Map();
  constructor() { elements.push(this); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  rejectPending(error) { const pending = this.pending; this.pending = null; pending?.reject(error); }
  load() {
    assert.equal(this.onended, null, 'Detach old handlers before loading a source');
    assert.equal(this.onerror, null);
    assert.equal(this.onplaying, null);
    this.rejectPending(new DOMException('Source changed', 'AbortError'));
    this.currentSrc = this.src; this.duration = NaN; this.readyState = 0;
    this.paused = true; this.ended = false; this.error = null;
  }
  play() {
    plays.push({ element: this, src: this.src });
    const mode = this.src.startsWith('data:') ? silenceMode : fileMode;
    const promise = new Promise((resolve, reject) => { this.pending = { resolve, reject }; });
    const pending = this.pending;
    if (mode !== 'manual' && mode !== 'stall') queueMicrotask(() => {
      if (this.pending !== pending) return;
      if (mode === 'reject') { this.rejectPending(new DOMException('Gesture required', 'NotAllowedError')); return; }
      if (mode === 'fail') { this.fail(); return; }
      this.begin();
      queueMicrotask(() => { if (!this.paused) this.finish(); });
    });
    return promise;
  }
  begin() {
    const pending = this.pending; this.pending = null;
    this.paused = false; this.readyState = 4;
    this.duration = this.src.startsWith('data:') ? 0.01 : 1.25;
    this.onplaying?.(); pending?.resolve();
  }
  finish() { this.ended = true; this.paused = true; this.onended?.(); }
  fail() {
    this.error = { code: 4 }; this.onerror?.();
    this.rejectPending(new DOMException('Bad media', 'NotSupportedError'));
  }
  pause() { this.paused = true; this.rejectPending(new DOMException('Paused', 'AbortError')); }
}
globalThis.document = new GestureDocument();
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { audioSession: {} } });
globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
globalThis.Audio = FakeAudio;
globalThis.window = {
  speechSynthesis: {
    cancel() {}, resume() {}, pause() {},
    getVoices: () => [{ name: 'Samantha', lang: 'en-US' }, { name: 'Yuna', lang: 'ko-KR' }],
    speak(value) {
      if (synthThrows) throw new Error('unavailable');
      utterance = value; spoken.push(value);
      queueMicrotask(() => { value.onstart?.(); if (autoFinish || value.volume === 0) value.onend?.(); });
    },
  },
};
globalThis.fetch = async (url, options) => {
  requests.push(url); assert.equal(options.cache, 'force-cache');
  fetching++; peakFetching = Math.max(peakFetching, fetching);
  await flush();
  if (url.endsWith('/w_clown.m4a')) { fetching--; throw new Error('offline fixture'); }
  if (url.endsWith('/w_bee.m4a')) { fetching--; return { ok: false }; }
  return { ok: true, async arrayBuffer() { await flush(); fetching--; return new ArrayBuffer(0); } };
};

const player = new AudioPlayer();
const media = elements[0];
assert.equal(elements.length, 1);
assert.equal(media.preload, 'auto');
assert.equal(media.playsInline, true);
assert.ok(media.attributes.has('playsinline'));
assert.equal(document.count, 2);
assert.equal(requests.length, 0, 'No prefetch before unlock');
document.gesture('pointerdown');
assert.equal(plays.length, 1, 'Silent play must start synchronously in the gesture');
assert.ok(plays[0].src.startsWith('data:audio/wav;base64,'));
const wav = Buffer.from(plays[0].src.split(',')[1], 'base64');
assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
assert.equal(wav.readUInt16LE(34), 16);
assert.equal(wav.readUInt32LE(24), 8000);
assert.ok(wav.subarray(44).every(sample => sample === 0), 'Primer PCM must be silent');
assert.equal(spoken.at(-1).volume, 0);
assert.equal(navigator.audioSession.type, 'playback');
document.gesture('keydown');
assert.equal(plays.length, 1, 'A pending unlock must not duplicate the primer');
await flush();
assert.equal(player.unlocked, true, 'Media unlock completes without an AudioContext');
assert.equal(media.paused, true);
assert.equal(document.count, 0, 'Remove both listeners after successful unlock');
await player.cachePromise;
assert.deepEqual([...requests].sort(), [...new Set(AUDIO_FILES)].map(id => `assets/audio/${id}.m4a`).sort());
assert.ok(peakFetching <= 3, 'Warm-up concurrency is bounded');
assert.equal(fetching, 0);
document.gesture('pointerdown'); document.gesture('keydown');
assert.equal(plays.length, 1, 'Unlock is one-shot after success');

// Existing speech behavior and API states remain unchanged.
player.files.clear();
spoken = [];
const first = player.play('w_clown');
await Promise.resolve();
assert.equal(player.isPlaying, true);
player.pause(); assert.equal(player.isPaused, true);
player.resume(); assert.equal(player.isPaused, false);
const second = player.play('w_bee');
assert.equal((await first).cancelled, true);
utterance.onend();
assert.equal((await second).cancelled, false);
assert.equal(player.isPlaying, false);
autoFinish = true; spoken = [];
const chunks = [];
await player.sequence(['s_s1_c1', 's_s1_c2', 's_s1_c3'], 0, i => chunks.push(i));
assert.deepEqual(chunks, [0, 1, 2]);
assert.deepEqual(spoken.map(item => item.text), ['I.', 'dress up', 'as a clown.']);
await player.play('w_clown_ko');
assert.equal(spoken.at(-1).lang, 'ko-KR');
assert.equal(spoken.at(-1).voice.name, 'Yuna');
for (const sentence of SENTENCES) {
  await player.play(`sr_${sentence.id}`);
  assert.equal(spoken.at(-1).voice.name, 'Samantha', `${sentence.id} uses the narrator`);
  assert.equal(spoken.at(-1).rate, CONFIG.voices.narrator.rate / CONFIG.audio.wordsPerMinute);
  assert.equal(spoken.at(-1).pitch, 1);
}

// An element error still falls back, and bad files aren't repeatedly retried.
player.files.add('w_dinosaur');
await player.play('w_dinosaur');
assert.equal(spoken.at(-1).text, 'dinosaur');
assert.equal(player.failedFiles.has('w_dinosaur'), true);
const failedPlayCount = plays.length;
await player.play('w_dinosaur');
assert.equal(plays.length, failedPlayCount);

// Three file clips, including chunk gaps, must all reuse the constructor element.
fileMode = 'success';
const ids = ['s_s1_c1', 's_s1_c2', 's_s1_c3'];
ids.forEach(id => player.files.add(id));
const beforeSequence = plays.length;
const speechCount = spoken.length;
const fileSequence = await player.sequence(ids, 0);
assert.equal(fileSequence.duration, 3750);
assert.deepEqual(plays.slice(beforeSequence).map(call => call.src), ids.map(id => `assets/audio/${id}.m4a`));
assert.ok(plays.slice(beforeSequence).every(call => call.element === media));
assert.equal(elements.length, 1, 'No per-clip Audio constructors');
assert.equal(spoken.length, speechCount);

// Old callbacks and queued native events must not settle the next clip.
fileMode = 'manual';
player.files.add('w_clown'); player.files.add('w_bee');
const cancelledClip = player.play('w_clown');
media.begin(); await flush();
const staleEnded = media.onended;
const staleError = media.onerror;
const nextClip = player.play('w_bee');
assert.equal((await cancelledClip).cancelled, true);
media.begin(); await flush();
let nextSettled = false;
nextClip.then(() => { nextSettled = true; });
staleEnded(); staleError();
media.onended(); media.onerror(); // New callbacks receiving an old queued event.
await flush();
assert.equal(nextSettled, false);
assert.equal(player.isPlaying, true);
media.finish();
assert.equal((await nextClip).cancelled, false);

// A late AbortError from pausing cannot kill a promptly resumed play attempt.
const resuming = player.play('w_bee');
player.pause(); player.resume();
await flush();
assert.equal(player.isPlaying, true);
assert.equal(player.failedFiles.has('w_bee'), false);
media.begin(); await flush();
media.finish();
assert.equal((await resuming).cancelled, false);
const stopping = player.play('w_bee');
player.stop();
assert.equal((await stopping).cancelled, true);
assert.equal(media.paused, true);
assert.equal(media.onended, null);

// Start watchdog is suspended while paused and rearmed on resume.
const timeoutMs = CONFIG.audio.startTimeoutMs;
try {
  CONFIG.audio.startTimeoutMs = 15;
  fileMode = 'stall'; player.files.add('w_dressup');
  const timed = player.play('w_dressup');
  player.pause();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(player.isPlaying, true);
  assert.equal(player.failedFiles.has('w_dressup'), false);
  player.resume();
  assert.equal((await timed).cancelled, false);
  assert.equal(player.failedFiles.has('w_dressup'), true);
  assert.equal(spoken.at(-1).text, 'dress up');
} finally { CONFIG.audio.startTimeoutMs = timeoutMs; }
player.files.clear();
const sequence = player.sequence(['w_clown', 'w_bee'], 500);
await new Promise(resolve => setTimeout(resolve, 10));
player.stop();
assert.equal((await sequence).cancelled, true);

// Failed unlock remains retryable; keyboard can unlock after pointer rejection.
globalThis.document = new GestureDocument();
silenceMode = 'reject';
const retryPlayer = new AudioPlayer();
document.gesture('pointerdown'); await flush();
assert.equal(retryPlayer.unlocked, false);
assert.equal(document.count, 2);
silenceMode = 'success';
document.gesture('keydown'); await flush();
assert.equal(retryPlayer.unlocked, true);
assert.equal(document.count, 0);
await retryPlayer.cachePromise;

// A fulfilled primer's delayed completion must not pause a newer lesson clip.
globalThis.document = new GestureDocument();
silenceMode = 'manual'; fileMode = 'manual';
const handoff = new AudioPlayer(); handoff.files.add('w_bee');
const handoffMedia = elements.at(-1);
document.gesture('pointerdown'); handoffMedia.begin();
const lesson = handoff.play('w_bee'); handoffMedia.begin();
await flush();
assert.equal(handoffMedia.paused, false);
assert.equal(handoff.unlocked, true);
assert.equal(document.count, 0);
handoffMedia.finish(); await lesson; await handoff.cachePromise;

// If the lesson aborts an unfinished primer, its successful play unlocks instead.
globalThis.document = new GestureDocument();
const interrupted = new AudioPlayer(); interrupted.files.add('w_bee');
const interruptedMedia = elements.at(-1);
document.gesture('pointerdown');
const immediateLesson = interrupted.play('w_bee'); interruptedMedia.begin();
await flush();
assert.equal(interrupted.unlocked, true);
assert.equal(interruptedMedia.paused, false);
assert.equal(document.count, 0);
interruptedMedia.finish(); await immediateLesson; await interrupted.cachePromise;

let notice = '';
player.addEventListener('notice', event => { notice = event.detail; });
synthThrows = true;
assert.equal((await player.play('w_clown')).unavailable, true);
assert.match(notice, /voice is unavailable/);
delete window.speechSynthesis;
assert.equal((await player.play('w_clown')).unavailable, true);
assert.match(notice, /Speech is unavailable/);
console.log('Audio checks passed: persistent three-clip playback; stale-event isolation; silent pointer/keyboard unlock and cleanup without Web Audio; bounded cache warming with failures; primer/lesson races; pause/resume/stop/timeouts; single narrator; speech and file-error fallback. (Simulated browser APIs.)');
