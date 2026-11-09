import { CONFIG, HOTSPOTS } from '../data/content.js';
import { $, $$, icon } from './ui/dom.js';
import { BookMirror } from './ui/book-mirror.js';

export class Ebook {
  constructor(root) {
    this.root = root;
    this.page = 6;
    this.active = null;
    root.innerHTML = `<div class="book-toolbar"><span>${icon('book')} MY BOOK</span><div class="segmented" aria-label="Book page"><button type="button" data-page="6" aria-pressed="true">p.6</button><button type="button" data-page="7" aria-pressed="false">p.7</button></div></div><div class="book-stage"><div class="page-box"><img class="page-image" src="assets/img/page6.png" alt="I Dress Up comic, textbook page 6" draggable="false"><div class="hotspot" hidden></div></div></div><div class="book-caption"><span class="tiny-dot"></span> Your book follows along <span class="page-number">06</span></div>`;
    this.box = $('.page-box', root);
    this.stage = $('.book-stage', root);
    this.image = $('.page-image', root);
    this.overlay = $('.hotspot', root);
    this.mirror = new BookMirror(root, this.box, this.overlay);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.stage);
    $$('[data-page]', root).forEach(button => button.addEventListener('click', () => this.show(Number(button.dataset.page))));
    this.resize();
  }
  resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    const w = Math.max(0, Math.min(width, height * 1810 / 2346));
    this.box.style.width = `${w}px`;
    this.box.style.height = `${w * 2346 / 1810}px`;
    this.mirror.schedule();
  }
  show(page) {
    // Page navigation changes visibility, never the current activity's item.
    this.overlay.hidden = true;
    this.overlay.classList.remove('blink');
    this.page = page;
    this.mirror.setPage(page);
    this.image.src = `assets/img/page${page}.png`;
    this.image.alt = page === 6 ? 'I Dress Up comic, textbook page 6' : 'I Dress Up worksheet, textbook page 7';
    $$('[data-page]', this.root).forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.page) === page)));
    $('.page-number', this.root).textContent = `0${page}`;
    const region = this.active?.page === page ? HOTSPOTS[page]?.[this.active.region] : null;
    if (region) {
      for (const key of ['left', 'top', 'width', 'height']) this.overlay.style[key] = `${region[key]}%`;
      this.overlay.hidden = false;
    }
  }
  highlight(page, regionId) {
    this.active = HOTSPOTS[page]?.[regionId] ? { page, region: regionId } : null;
    this.show(page);
    if (!this.active) return;
    this.overlay.style.setProperty('--blink-count', CONFIG.highlight.blinks);
    this.overlay.style.setProperty('--blink-period', `${CONFIG.highlight.durationMs / CONFIG.highlight.blinks}ms`);
    void this.overlay.offsetWidth;
    this.overlay.classList.add('blink');
  }
  clear() {
    this.active = null;
    this.overlay.hidden = true;
    this.overlay.classList.remove('blink');
  }
}
