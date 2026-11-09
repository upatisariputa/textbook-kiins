import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Ebook } from '../js/ebook.js';
import { AudioPlayer } from '../js/audio.js';
import { CONFIG, HOTSPOTS, WORDS, WORKSHEET } from '../data/content.js';

// Minimal DOM/event doubles run the real router and tab handlers. No layout,
// audio, animation or canvas rendering is claimed by these invariant tests.
class Tokens extends Set {
  add(...values) { values.forEach(value => super.add(value)); return this; }
  remove(...values) { values.forEach(value => this.delete(value)); }
  contains(value) { return this.has(value); }
  toggle(value, force = !this.has(value)) { if (force) this.add(value); else this.delete(value); return force; }
}
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toLowerCase();
    this.children = []; this.parentElement = null; this.text = '';
    this.attributes = {}; this.dataset = {}; this.classList = new Tokens();
    this.style = { setProperty(key, value) { this[key] = String(value); } };
    this.listeners = new Map(); this.hidden = false; this.disabled = false;
  }
  setAttribute(key, value) {
    this.attributes[key] = String(value);
    if (key === 'class') this.classList = new Tokens(value.split(/\s+/).filter(Boolean));
    if (key === 'hidden' || key === 'disabled') this[key] = true;
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(key) { return key === 'class' ? [...this.classList].join(' ') : this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; if (key === 'hidden' || key === 'disabled') this[key] = false; }
  set id(value) { this.setAttribute('id', value); }
  get id() { return this.getAttribute('id'); }
  set className(value) { this.setAttribute('class', value); }
  get className() { return this.getAttribute('class'); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  append(child) {
    if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
    child.parentElement = this; this.children.push(child);
  }
  insertBefore(child, sibling) { this.append(child); this.children.pop(); this.children.splice(this.children.indexOf(sibling), 0, child); }
  set innerHTML(html) {
    this.text = ''; this.children = [];
    const stack = [this];
    for (const token of html.match(/<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('</')) { stack.pop(); continue; }
      if (!token.startsWith('<')) { stack.at(-1).text += token; continue; }
      const tag = token.match(/^<([\w-]+)/)?.[1];
      if (!tag) continue;
      const child = new Element(tag);
      for (const match of token.slice(tag.length + 1, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*"([^"]*)")?/g)) child.setAttribute(match[1], match[2] ?? '');
      stack.at(-1).append(child);
      if (!['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag) && !token.endsWith('/>')) stack.push(child);
    }
  }
  matches(selector) {
    const tag = selector.match(/^[\w-]+/)?.[0];
    if (tag && this.tagName !== tag) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && this.id !== id) return false;
    for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
    for (const [, key, value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (this.getAttribute(key) === null || (value !== undefined && this.getAttribute(key) !== value)) return false;
    }
    return true;
  }
  querySelectorAll(selector) {
    const result = [];
    const selectors = selector.split(',').map(value => value.trim());
    const visit = node => { for (const child of node.children) { if (selectors.some(value => child.matches(value))) result.push(child); visit(child); } };
    visit(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  contains(target) { for (let node = target; node; node = node.parentElement) if (node === this) return true; return false; }
  addEventListener(type, handler) { const list = this.listeners.get(type) || []; list.push(handler); this.listeners.set(type, list); }
  removeEventListener(type, handler) { this.listeners.set(type, (this.listeners.get(type) || []).filter(value => value !== handler)); }
  async emit(type, bubble = false) {
    const pending = [];
    const event = { target: this, preventDefault() {}, stopPropagation() { this.stopped = true; } };
    for (let node = this; node; node = bubble ? node.parentElement : null) {
      event.currentTarget = node;
      for (const handler of node.listeners.get(type) || []) pending.push(handler(event));
      if (event.stopped) break;
    }
    await Promise.all(pending);
  }
  async click() { if (!this.disabled) await this.emit('click', true); }
  focus() { document.activeElement = this; }
  select() {}
  pause() {}
  getContext() { return {}; }
  getBoundingClientRect() { return { width: 0, height: 0 }; }
}

globalThis.document = new Element('document');
document.createElement = tag => new Element(tag);
document.documentElement = new Element('html');
document.body = new Element('body');
document.append(document.documentElement); document.documentElement.append(document.body);
document.body.innerHTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8').match(/<body>([\s\S]*?)<\/body>/)[1];
globalThis.window = new Element('window');
globalThis.ResizeObserver = class { observe() {} };
globalThis.requestAnimationFrame = () => 1;
globalThis.Audio = class { setAttribute() {} pause() {} };
// Audio lifecycle is separately tested; tab actions complete without real media.
AudioPlayer.prototype.stop = () => {};
AudioPlayer.prototype.play = async () => ({ cancelled: false, duration: 1 });
AudioPlayer.prototype.sequence = async (ids, gap, onChunk) => { ids.forEach((id, i) => onChunk?.(i, id)); return { cancelled: false }; };

let book;
const show = Ebook.prototype.show;
Ebook.prototype.show = function (...args) { book = this; return show.apply(this, args); };
await import('../js/main.js');
Ebook.prototype.show = show;
assert.ok(book, 'The real router must initialize the book');
const find = (selector, root = document) => {
  const node = root.querySelector(selector);
  assert.ok(node, `Missing fixture element: ${selector}`);
  return node;
};
const navigate = id => find(`[data-tab="${id}"]`).click();
const page = number => find(`[data-page="${number}"]`).click();
function highlighted(expectedPage, region, blink = true) {
  assert.deepEqual(book.active, { page: expectedPage, region });
  assert.equal(book.page, expectedPage);
  assert.equal(book.root.hidden, false);
  assert.equal(book.overlay.hidden, false);
  for (const key of ['left', 'top', 'width', 'height']) assert.equal(book.overlay.style[key], `${HOTSPOTS[expectedPage][region][key]}%`);
  assert.equal(book.overlay.classList.contains('blink'), blink);
  assert.equal(book.image.src, `assets/img/page${expectedPage}.png`);
  assert.equal(find(`[data-page="${expectedPage}"]`).getAttribute('aria-pressed'), 'true');
  if (blink) assert.equal(book.overlay.style['--blink-count'], String(CONFIG.highlight.blinks));
}
function hidden(active = null) {
  assert.equal(book.overlay.hidden, true);
  assert.equal(book.overlay.classList.contains('blink'), false);
  assert.deepEqual(book.active, active);
}
function activeSentence(id) {
  const rows = document.querySelectorAll('.sentence-row').filter(row => row.classList.contains('active'));
  assert.deepEqual(rows.map(row => row.dataset.id), [id]);
  assert.equal(find('.sentence-main', rows[0]).getAttribute('aria-pressed'), 'true');
}

hidden(); // WORDS has no single selected card on startup.
await navigate('sentences'); // A: first entry highlights the visible default row.
activeSentence('title'); highlighted(6, 'title');
await find('.sentence-main', find('[data-id="s1"]')).click();
activeSentence('s1'); highlighted(6, 'panel1');
await navigate('shadow-reading');
highlighted(6, 'title');
await navigate('sentences'); // B: retained clown row restores its region.
activeSentence('s1'); highlighted(6, 'panel1');
await page(7); // C: page changes hide but retain, then restore without blinking.
activeSentence('s1'); hidden({ page: 6, region: 'panel1' });
assert.equal(book.page, 7);
await page(6);
activeSentence('s1'); highlighted(6, 'panel1', false);
book.show(6); highlighted(6, 'panel1', false); // Automatic show has the same semantics.

await navigate('shadow-reading');
await find('[data-sentence="3"]').click();
assert.equal(find('.reading-sentence').textContent, 'I dress up as a bee.');
highlighted(6, 'panel3');
await page(7); hidden({ page: 6, region: 'panel3' });
await page(6); highlighted(6, 'panel3', false);
await navigate('sentences'); activeSentence('s1'); highlighted(6, 'panel1');
await navigate('shadow-reading'); highlighted(6, 'panel3');
assert.equal(find('[data-sentence="3"]').getAttribute('aria-pressed'), 'true');

await navigate('shadow-writing'); highlighted(7, 'write1');
for (const step of WORKSHEET) {
  await find(`[data-step="${step.id}"]`).click();
  assert.equal(find(`[data-step="${step.id}"]`).getAttribute('aria-selected'), 'true');
  highlighted(7, step.id);
  await page(6); hidden({ page: 7, region: step.id });
  await page(7); highlighted(7, step.id, false);
  await navigate('shadow-reading'); highlighted(6, 'panel3');
  await navigate('shadow-writing'); highlighted(7, step.id);
}

// WORDS completion marks may coexist; they do not designate one active card.
await navigate('words'); hidden();
for (const word of WORDS.slice(0, 2)) {
  const card = find(`[data-word="${word.id}"]`);
  await find('.flip-button', card).click(); highlighted(6, word.region);
  await card.querySelectorAll('.meaning-choice').find(button => button.textContent === word.ko).click();
  highlighted(6, word.region);
}
await page(7); hidden({ page: 6, region: 'panel2' });
await page(6); highlighted(6, 'panel2', false);
await navigate('shadow-reading'); highlighted(6, 'panel3');
await navigate('words'); hidden();
assert.equal(document.querySelectorAll('.meaning-choice.selected').length, 2);
await page(7); hidden(); await page(6); hidden();

await navigate('shadow-writing'); highlighted(7, 'draw');
await navigate('quiz'); hidden(); assert.equal(book.root.hidden, true);
await find('[data-part="2"]').click(); hidden(); assert.equal(book.root.hidden, true);
await find('[data-part="1"]').click(); hidden(); assert.equal(book.root.hidden, true);
await navigate('sentences'); activeSentence('s1'); highlighted(6, 'panel1');
await navigate('shadow-writing'); highlighted(7, 'draw');

// Explicit clearing is permanent until a tab/action selects another region.
book.clear(); hidden(); await page(6); hidden(); await page(7); hidden();
await find('[data-step="write2"]').click(); highlighted(7, 'write2');
document.hidden = true; await document.emit('visibilitychange'); hidden();
document.hidden = false; await document.emit('visibilitychange'); highlighted(7, 'write2');
book.highlight(6, 'missing-region'); hidden();
await page(7); hidden();
console.log('E-book invariants passed: actual router/tab handlers for A/B/C; reading and all writing step round-trips; steady manual/automatic page restoration; WORDS completion versus selection; hidden QUIZ isolation; clear and visibility resume. (DOM/API doubles, not browser rendering.)');
