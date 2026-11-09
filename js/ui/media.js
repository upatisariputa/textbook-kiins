// All tracks and recording blobs stay on this device. No network or storage API.
export class LocalRecorder {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.stream = null;
    this.recorder = null;
    this.request = 0;
    this.result = null;
    this.opening = null;
  }
  async open(video = false) {
    if (this.stream?.active) return true;
    if (this.opening) return this.opening;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      this.onMessage('ⓘ Recording is not available here. Try Chrome or Safari on localhost. You can still practice!');
      return false;
    }
    const request = ++this.request;
    const opening = this.acquire(video, request);
    this.opening = opening;
    try { return await opening; }
    finally { if (this.opening === opening) this.opening = null; }
  }
  async acquire(video, request) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false });
      if (request !== this.request) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream;
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (this.stream === stream) {
          this.onMessage('ⓘ The recording device disconnected. Reconnect it and try again.');
          this.release();
        }
      }));
      return true;
    } catch (error) {
      if (request !== this.request) return false;
      const denied = ['NotAllowedError', 'SecurityError'].includes(error.name);
      this.onMessage(denied ? `ⓘ ${video ? 'Camera or microphone' : 'Microphone'} permission was not allowed. You can allow it in browser settings and try again. Keep practicing!` : `ⓘ We could not open the ${video ? 'camera and microphone' : 'microphone'}. Check that it is connected and available, then try again.`);
      return false;
    }
  }
  start(video = false) {
    if (!this.stream?.active || ['recording', 'paused'].includes(this.recorder?.state)) return false;
    let settle;
    try {
      const candidates = video ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      let failed = false;
      this.recorder = recorder;
      this.result = new Promise(resolve => {
        settle = resolve;
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = () => {
          if (this.recorder === recorder) this.recorder = null;
          resolve(failed || !chunks.length ? null : new Blob(chunks, { type: recorder.mimeType || chunks[0].type }));
        };
        recorder.onerror = () => {
          failed = true;
          this.onMessage('ⓘ The recording could not be saved. Please try again.');
          if (recorder.state !== 'inactive') recorder.stop();
          resolve(null);
        };
      });
      recorder.start(100);
      return true;
    } catch {
      settle?.(null);
      this.recorder = null;
      this.result = null;
      this.onMessage('ⓘ Recording could not start in this browser. You can still listen and practice.');
      return false;
    }
  }
  async stop() {
    if (!this.recorder) return null;
    const result = this.result;
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    return result;
  }
  pause() { if (this.recorder?.state === 'recording') this.recorder.pause(); }
  resume() { if (this.recorder?.state === 'paused') this.recorder.resume(); }
  release() {
    this.request++;
    this.opening = null;
    const result = this.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    return result;
  }
}
