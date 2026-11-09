import { INPUT_REGIONS } from '../../data/content.js';
import { $, $$ } from './dom.js';
import { PRINT_FONT, fitTextRows, percentBox, handwritingPlacement, containPlacement } from './book-layout.js';

const PENCIL = '#383b40';
const position = (element, region) => {
  for (const key of ['left', 'top', 'width', 'height']) element.style[key] = `${region[key]}%`;
};

export class BookMirror {
  constructor(root, box, hotspot) {
    this.root = root;
    this.box = box;
    this.writing = { write1: { text: '', mode: null }, write2: { text: '', mode: null } };
    this.shades = { shade1: null, shade2: null };
    this.name = '';
    this.frame = null;
    this.layer = document.createElement('div');
    this.layer.className = 'page-mirror';
    this.layer.hidden = true;
    this.layer.innerHTML = '<canvas class="book-ink" aria-hidden="true"></canvas><button type="button" class="book-name-target" aria-label="Write your name" aria-haspopup="dialog" aria-expanded="false" aria-controls="book-name-editor"></button>';
    box.insertBefore(this.layer, hotspot);
    this.canvas = $('.book-ink', this.layer);
    this.context = this.canvas.getContext('2d');
    this.pencil = document.createElement('canvas');
    this.pencilContext = this.pencil.getContext('2d');
    for (const id of ['shade1', 'shade2']) {
      for (const value of ['TRUE', 'FALSE']) {
        const circle = document.createElement('div');
        circle.className = 'book-shade';
        circle.dataset.step = id;
        circle.dataset.value = value;
        circle.setAttribute('aria-hidden', 'true');
        circle.innerHTML = '<svg class="scribble" viewBox="0 0 160 160"><path d="M35 23 126 32 22 43 143 53 16 64 145 75 14 86 143 97 20 108 137 119 33 130 121 141"/></svg>';
        position(circle, INPUT_REGIONS[id][value]);
        this.layer.append(circle);
      }
    }
    this.setupName();
  }
  setPage(page) {
    this.layer.hidden = page !== 7;
    if (page !== 7) this.closeName(false); else this.schedule();
  }
  setInk(id, ink, edited) {
    if (id === 'draw') this.drawing = ink;
    else {
      this.writing[id].ink = ink;
      if (edited) this.writing[id].mode = 'hand';
    }
    this.schedule();
  }
  setText(id, text) {
    Object.assign(this.writing[id], { text, mode: 'keyboard' });
    this.schedule();
  }
  setShade(id, value) {
    this.shades[id] = value;
    this.schedule();
  }
  schedule() {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
  }
  render() {
    if (this.layer.hidden) return;
    const { width, height } = this.box.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const ctx = this.context;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PENCIL;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `100px ${PRINT_FONT}`;
    const xHeight = (ctx.measureText('x').actualBoundingBoxAscent || 50) / 100;
    for (const [id, state] of Object.entries(this.writing)) {
      const region = INPUT_REGIONS[id];
      ctx.save();
      if (state.mode === 'hand' && state.ink?.width && state.ink?.height) {
        const area = percentBox(region.practiceArea, width, height);
        ctx.beginPath(); ctx.rect(area.left, area.top, area.width, area.height); ctx.clip();
        // Recolor only the transparent ink buffer, never the guide/trace canvas.
        const source = state.ink.ink;
        this.pencil.width = source.width; this.pencil.height = source.height;
        const pencil = this.pencilContext;
        pencil.drawImage(source, 0, 0);
        pencil.globalCompositeOperation = 'source-in';
        pencil.fillStyle = PENCIL; pencil.fillRect(0, 0, source.width, source.height);
        const dest = handwritingPlacement(state.ink.width, state.ink.height, region.practiceArea, width, height);
        ctx.drawImage(this.pencil, dest.left, dest.top, dest.width, dest.height);
      } else if (state.mode === 'keyboard') {
        const rows = region.rows;
        const maxSize = (rows[0].base - rows[0].mid) * height / 100 / xHeight;
        this.renderText(state.text, rows.map(row => row.width * width / 100), maxSize,
          rows.map(row => ({ left: row.left * width / 100, base: row.base * height / 100 })));
      }
      ctx.restore();
    }
    if (this.drawing?.width && this.drawing?.height) {
      const dest = containPlacement(this.drawing.width, this.drawing.height, percentBox(INPUT_REGIONS.draw, width, height));
      ctx.drawImage(this.drawing.ink, dest.left, dest.top, dest.width, dest.height);
    }
    const name = INPUT_REGIONS.name;
    ctx.save();
    const nameBox = percentBox(name, width, height);
    ctx.font = `100px ${PRINT_FONT}`;
    const ascent = (ctx.measureText(this.name || 'M').actualBoundingBoxAscent || 80) / 100;
    this.renderText(this.name, [nameBox.width], (name.baseline - name.top) * height / 100 / ascent,
      [{ left: nameBox.left, base: name.baseline * height / 100 }]);
    ctx.restore();
    for (const circle of $$('.book-shade', this.layer)) {
      circle.classList.toggle('shaded', this.shades[circle.dataset.step] === circle.dataset.value);
    }
    this.positionName();
  }
  renderText(text, widths, maxSize, rows) {
    const ctx = this.context;
    const fitted = fitTextRows(text, widths, maxSize, (value, size) => {
      ctx.font = `${size}px ${PRINT_FONT}`;
      return ctx.measureText(value).width;
    });
    ctx.font = `${fitted.fontSize}px ${PRINT_FONT}`;
    fitted.lines.forEach((line, i) => ctx.fillText(line, rows[i].left, rows[i].base));
  }
  setupName() {
    this.nameButton = $('.book-name-target', this.layer);
    const name = INPUT_REGIONS.name;
    this.nameButton.style.left = `${name.left}%`;
    this.nameButton.style.width = `${name.width}%`;
    this.nameButton.style.top = `${name.top + name.height / 2}%`;
    this.popover = document.createElement('div');
    this.popover.className = 'book-name-popover';
    this.popover.id = 'book-name-editor';
    this.popover.hidden = true;
    this.popover.setAttribute('role', 'dialog');
    this.popover.setAttribute('aria-labelledby', 'book-name-label');
    this.popover.innerHTML = '<form><label id="book-name-label" for="book-name-input">Your name</label><div class="book-name-controls"><input id="book-name-input" type="text" placeholder="Your name" maxlength="20" autocomplete="off"><button type="submit" class="primary">Done</button></div></form>';
    this.root.append(this.popover);
    this.nameInput = $('input', this.popover);
    this.nameInput.addEventListener('compositionstart', () => { this.composingName = true; });
    this.nameInput.addEventListener('compositionend', () => { this.composingName = false; });
    this.nameButton.addEventListener('click', () => {
      this.composingName = false;
      this.nameInput.value = this.name;
      this.popover.hidden = false;
      this.nameButton.setAttribute('aria-expanded', 'true');
      this.positionName();
      this.nameInput.focus({ preventScroll: true });
      this.nameInput.select();
    });
    $('form', this.popover).addEventListener('submit', event => {
      event.preventDefault();
      if (this.composingName) return;
      this.name = this.nameInput.value.slice(0, 20);
      this.nameButton.setAttribute('aria-label', this.name ? `Edit name: ${this.name}` : 'Write your name');
      this.schedule(); this.closeName();
    });
    document.addEventListener('keydown', event => {
      if (this.popover.hidden || event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.closeName(); }
    });
    document.addEventListener('pointerdown', event => {
      if (!this.popover.hidden && !this.popover.contains(event.target) && !this.nameButton.contains(event.target)) this.closeName(false);
    });
  }
  positionName() {
    if (this.popover.hidden) return;
    const root = this.root.getBoundingClientRect();
    const button = this.nameButton.getBoundingClientRect();
    this.popover.style.top = `${Math.max(8, Math.min(button.bottom - root.top + 8, root.height - this.popover.offsetHeight - 8))}px`;
  }
  closeName(restoreFocus = true) {
    if (this.popover.hidden) return;
    this.popover.hidden = true;
    this.nameButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) this.nameButton.focus({ preventScroll: true });
  }
}
