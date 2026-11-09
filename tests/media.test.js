import assert from 'node:assert/strict';
import { LocalRecorder } from '../js/ui/media.js';
let requests = 0;
let resolvePermission;
let deny = false;
let failStart = false;
const makeStream = () => {
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
  return { active: true, track, getTracks: () => [track] };
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia() {
  requests++;
  if (deny) return Promise.reject({ name: 'NotAllowedError' });
  return new Promise(resolve => { resolvePermission = resolve; });
} } } });
class Recorder {
  static isTypeSupported = () => true;
  constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.state = 'inactive'; }
  start() { if (failStart) throw new Error('start failed'); this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable({ data: new Blob(['recording']) }); this.onstop(); }); }
}
globalThis.MediaRecorder = Recorder;
globalThis.window = { MediaRecorder: Recorder };
let message = '';
const recorder = new LocalRecorder(text => { message = text; });
const first = recorder.open();
const duplicate = recorder.open();
assert.equal(requests, 1);
const stream = makeStream(); resolvePermission(stream);
assert.equal(await first, true);
assert.equal(await duplicate, true);
assert.equal(recorder.start(), true);
recorder.pause();
assert.equal(recorder.recorder.state, 'paused');
assert.equal(recorder.start(), false);
recorder.resume();
assert.equal(recorder.recorder.state, 'recording');
const blob = await recorder.stop();
assert.ok(blob.size > 0);
assert.match(blob.type, /^audio/);
failStart = true;
assert.equal(recorder.start(), false);
assert.equal(await recorder.stop(), null);
assert.match(message, /could not start/);
failStart = false;
await recorder.release();
assert.equal(stream.track.stopped, true);
const pending = recorder.open(true);
await recorder.release();
const late = makeStream(); resolvePermission(late);
assert.equal(await pending, false);
assert.equal(late.track.stopped, true);
assert.equal(recorder.stream, null);
deny = true;
assert.equal(await recorder.open(), false);
assert.match(message, /permission was not allowed/);
delete window.MediaRecorder;
assert.equal(await recorder.open(), false);
assert.match(message, /not available/);
console.log('Media lifecycle passed: one concurrent permission request, record/pause/resume/stop, start failure, track release, late permission cleanup, denial, unsupported browser. (Simulated browser APIs.)');
