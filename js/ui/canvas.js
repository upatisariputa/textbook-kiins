import { CONFIG } from '../../data/content.js';
import { download } from './dom.js';
import { fitPracticeCanvas, fitTextRows, handwritingGuides } from './book-layout.js';

// Keep vector strokes in normalized coordinates so resizing never loses ink.
export class InkCanvas {
  constructor(canvas, { practiceArea = null, text = '', onChange = () => {} } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.ink = document.createElement('canvas');
    this.inkContext = this.ink.getContext('2d');
    this.strokes = [];
    this.current = null;
    this.practiceArea = practiceArea;
    this.text = text;
    this.onChange = onChange;
    this.trace = false;
    this.color = CONFIG.drawing.colors[0];
    this.size = practiceArea ? CONFIG.handwriting.penWidth : CONFIG.drawing.sizes[0];
    this.eraser = false;
    this.observer = new ResizeObserver(() => this.resize());
    if (practiceArea) {
      this.fitContainer = canvas.parentElement;
      this.canvas.style.aspectRatio = String(practiceArea.aspect);
      this.observer.observe(this.fitContainer);
      for (const child of this.fitContainer.children) {
        if (child !== canvas) this.observer.observe(child);
      }
    } else this.observer.observe(canvas);
    canvas.addEventListener('pointerdown', event => this.start(event));
    canvas.addEventListener('pointermove', event => this.move(event));
    canvas.addEventListener('pointerup', event => this.end(event));
    canvas.addEventListener('pointercancel', () => this.cancelStroke());
    canvas.addEventListener('lostpointercapture', () => this.cancelStroke());
    this.resize();
  }
  resize() {
    if (this.practiceArea) {
      const container = this.fitContainer;
      const available = container.getBoundingClientRect();
      if (!available.width || !available.height) return;
      // This flex container has no padding/gap; reserve visible footer/results,
      // including their margins, before choosing the largest proportional box.
      let reserved = 0;
      for (const child of container.children) {
        if (child === this.canvas || child.hidden) continue;
        const style = getComputedStyle(child);
        reserved += child.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      }
      const size = fitPracticeCanvas(available.width, available.height - reserved, this.practiceArea.aspect);
      this.canvas.style.width = `${size.width}px`;
      this.canvas.style.height = `${size.height}px`;
    }
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.ink.width = Math.round(this.width * this.dpr);
    this.canvas.height = this.ink.height = Math.round(this.height * this.dpr);
    this.paint();
  }
  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
  start(event) {
    if (this.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer = event.pointerId;
    this.current = { color: this.color, size: this.eraser ? CONFIG.handwriting.eraserWidth : this.size, eraser: this.eraser, points: [this.point(event)] };
    this.strokes.push(this.current);
    this.paint(true);
  }
  move(event) {
    if (!this.current || this.pointer !== event.pointerId) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [event];
    for (const sample of samples.length ? samples : [event]) this.current.points.push(this.point(sample));
    this.paint(true);
  }
  end(event) {
    if (this.pointer !== event.pointerId) return;
    this.move(event);
    this.cancelStroke();
  }
  cancelStroke() { this.current = null; this.pointer = null; }
  clear() { this.strokes = []; this.cancelStroke(); this.paint(true); }
  paint(edited = false) {
    if (!this.width) return;
    const ctx = this.context;
    const ink = this.inkContext;
    const w = this.width;
    const h = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#fffefb';
    ctx.fillRect(0, 0, w, h);
    if (this.practiceArea) {
      const guides = handwritingGuides(h, this.practiceArea);
      ctx.lineWidth = 1;
      ctx.strokeStyle = CONFIG.handwriting.guideColor;
      for (const { y, style } of guides) {
        ctx.setLineDash(style === 'dashed' ? [5, 5] : []);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.setLineDash([]);
      if (this.trace) {
        ctx.font = '100px system-ui, sans-serif';
        const capHeight = (ctx.measureText('H').actualBoundingBoxAscent || 72) / 100;
        const rows = [0, 3].map(i => ({ top: guides[i].y, base: guides[i + 2].y }));
        const maxSize = Math.min(...rows.map(row => row.base - row.top)) / capHeight;
        const fitted = fitTextRows(this.text, rows.map(() => Math.max(1, w - 44)), maxSize, (value, size) => {
          ctx.font = `${size}px system-ui, sans-serif`;
          return ctx.measureText(value).width;
        });
        ctx.font = `${fitted.fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#b7bdb76b';
        fitted.lines.forEach((line, i) => ctx.fillText(line, 22, rows[i].base));
      }
    }
    ink.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ink.clearRect(0, 0, w, h);
    for (const stroke of this.strokes) {
      ink.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
      ink.strokeStyle = ink.fillStyle = stroke.color;
      ink.lineWidth = stroke.size;
      ink.lineCap = ink.lineJoin = 'round';
      const points = stroke.points.map(point => ({ x: point.x * w, y: point.y * h }));
      if (points.length === 1) {
        ink.beginPath(); ink.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2); ink.fill();
      } else {
        ink.beginPath(); ink.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
          ink.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
        }
        ink.lineTo(points.at(-1).x, points.at(-1).y); ink.stroke();
      }
    }
    ink.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.ink, 0, 0, w, h);
    this.onChange(this, edited);
  }
  save() { this.canvas.toBlob(blob => { if (blob) download(blob, 'my-dress-up-drawing.png'); }, 'image/png'); }
}
