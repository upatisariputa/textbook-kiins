export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
const paths = {
  cards: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="m9 11 3-3 3 3-3 3-3-3Z"/>',
  lines: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  pen: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  sound: '<path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  camera: '<path d="m8 5 2-3h4l2 3h5v16H3V5Z"/><circle cx="12" cy="12" r="4"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  repeat: '<path d="M20 7H6l3-4M4 17h14l-3 4M20 7v7M4 17v-7"/>',
};
export function icon(name, extra = '') {
  return `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
}
export const heading = (number, title, description) => `<header class="section-heading"><div><div class="eyebrow">LET’S PRACTICE · ${number} / 05</div><h1>${title}</h1><p>${description}</p></div><span class="heading-spark" aria-hidden="true">✦</span></header>`;
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// A cancellable timeout scope prevents stale UI work after navigation.
export class TaskScope {
  constructor() { this.generation = 0; this.pending = new Map(); }
  cancel() {
    this.generation++;
    for (const [timer, resolve] of this.pending) { clearTimeout(timer); resolve(false); }
    this.pending.clear();
  }
  wait(ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.pending.delete(timer); resolve(true); }, ms);
      this.pending.set(timer, resolve);
    });
  }
}
