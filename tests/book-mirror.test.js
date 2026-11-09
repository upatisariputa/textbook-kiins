import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INPUT_REGIONS } from '../data/content.js';
import { fitTextRows, percentBox, fitPracticeCanvas, handwritingGuides, handwritingPlacement, containPlacement } from '../js/ui/book-layout.js';
import { BookMirror } from '../js/ui/book-mirror.js';
import { InkCanvas } from '../js/ui/canvas.js';

const source = JSON.parse(readFileSync(new URL('../source/input-regions.json', import.meta.url), 'utf8'));
assert.deepEqual(INPUT_REGIONS, source, 'Every verified coordinate must be copied exactly');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
const validBox = box => {
  for (const value of Object.values(box)) assert.ok(Number.isFinite(value));
  assert.ok(box.left >= 0 && box.top >= 0 && box.width > 0 && box.height > 0);
  assert.ok(box.left + box.width <= 100 && box.top + box.height <= 100);
};
validBox(INPUT_REGIONS.name);
assert.ok(INPUT_REGIONS.name.baseline > INPUT_REGIONS.name.top);
assert.ok(INPUT_REGIONS.name.baseline <= INPUT_REGIONS.name.top + INPUT_REGIONS.name.height);
validBox(INPUT_REGIONS.draw);
for (const id of ['write1', 'write2']) {
  const { area, rows } = INPUT_REGIONS[id];
  validBox(area);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.ok(row.top < row.mid && row.mid < row.base);
    assert.ok(row.top >= area.top && row.base <= area.top + area.height);
    assert.ok(row.left >= area.left && row.left + row.width <= area.left + area.width);
  }
  assert.ok(rows[0].base < rows[1].top);
}
for (const id of ['shade1', 'shade2']) {
  assert.deepEqual(Object.keys(INPUT_REGIONS[id]), ['TRUE', 'FALSE']);
  for (const circle of Object.values(INPUT_REGIONS[id])) {
    validBox(circle);
    // Percent width/height differ, but the verified 603×782 circles are round.
    assert.ok(Math.abs(circle.width * 603 - circle.height * 782) / 100 < 0.1);
  }
}

// Deterministic font measurements: preserve words/text, wrap first, then shrink.
const measure = (text, size) => [...text].length * size / 2;
assert.deepEqual(fitTextRows('', [100, 100], 20, measure), { lines: [], fontSize: 20 });
assert.deepEqual(fitTextRows('  \t ', [100, 100], 20, measure).lines, []);
assert.deepEqual(fitTextRows('I dress up', [100, 100], 20, measure), { lines: ['I dress up'], fontSize: 20 });
assert.deepEqual(fitTextRows('The girl dresses up', [100, 100], 20, measure), { lines: ['The girl', 'dresses up'], fontSize: 20 });
const checkFit = (text, widths, maxSize) => {
  const fitted = fitTextRows(text, widths, maxSize, measure);
  assert.equal(fitted.lines.join(' '), text.trim().replace(/\s+/gu, ' '), 'Never drop or duplicate typed text');
  assert.ok(fitted.lines.length <= widths.length);
  assert.ok(fitted.fontSize > 0 && fitted.fontSize <= maxSize);
  fitted.lines.forEach((line, i) => assert.ok(measure(line, fitted.fontSize) <= widths[i] + 1e-8));
  return fitted;
};
const long = checkFit('The girl dresses up as a beautiful butterfly today.', [100, 100], 20);
assert.equal(long.lines.length, 2);
assert.ok(long.fontSize < 20);
assert.ok(checkFit('Supercalifragilisticexpialidocious', [100, 100], 20).fontSize < 20);
checkFit('  I\t dress\nup as a clown.  ', [55, 100], 20);
assert.deepEqual(checkFit('김민준', [100], 20).lines, ['김민준']);
assert.ok(checkFit('Alexandria Alexandra', [80], 20).fontSize < 20);
checkFit('word '.repeat(2000), [100, 100], 20);

// The supplied two-row geometry is authoritative, including rounded fractions.
const fractions = [0.05, 0.2214, 0.3929, 0.55, 0.7214, 0.8929];
const styles = ['solid', 'dashed', 'solid', 'solid', 'dashed', 'solid'];
for (const id of ['write1', 'write2']) {
  const area = INPUT_REGIONS[id].practiceArea;
  validBox({ left: area.left, top: area.top, width: area.width, height: area.height });
  assert.equal(area.aspect, 3.6214);
  assert.deepEqual(area.guides.map(guide => guide.y), fractions);
  assert.deepEqual(area.guides.map(guide => guide.style), styles);
  for (const height of [120, 170.54, 215.39]) {
    const guides = handwritingGuides(height, area);
    assert.equal(guides.length, 6);
    guides.forEach((guide, i) => close(guide.y / height, fractions[i]));
    assert.deepEqual(guides.map(guide => guide.style), styles);
  }
}

// Width first; height pressure reduces both dimensions, never distorts the box.
for (const [availableWidth, availableHeight] of [[784, 300], [617.6, 240], [784, 180], [617.6, 120]]) {
  const fit = fitPracticeCanvas(availableWidth, availableHeight, 3.6214);
  close(fit.width / fit.height, 3.6214);
  assert.ok(fit.width <= availableWidth + 1e-8 && fit.height <= availableHeight + 1e-8);
  close(fit.width, Math.min(availableWidth, availableHeight * 3.6214));
}
close(fitPracticeCanvas(784, 300, 3.6214).height, 784 / 3.6214);
assert.deepEqual(fitPracticeCanvas(784, -10, 3.6214), { width: 0, height: 0 });

// The whole canvas maps uniformly onto practiceArea, with no per-row transform.
for (const viewport of [1280, 1024]) {
  const pageWidth = viewport * .35 - 45;
  const pageHeight = pageWidth * 2346 / 1810;
  for (const id of ['write1', 'write2']) {
    const { practiceArea, rows } = INPUT_REGIONS[id];
    const box = percentBox(practiceArea, pageWidth, pageHeight);
    for (const availableHeight of [300, 120]) {
      const size = fitPracticeCanvas(viewport * .65 - 48, availableHeight, practiceArea.aspect);
      const dest = handwritingPlacement(size.width, size.height, practiceArea, pageWidth, pageHeight);
      close(dest.left, box.left); close(dest.top, box.top);
      close(dest.width / size.width, dest.height / size.height);
      assert.ok(dest.width <= box.width + 1e-8 && dest.height <= box.height + 1e-8);
      // Percentages use the 603×782 base; the PNG aspect is rounded slightly.
      assert.ok(Math.abs(dest.width - box.width) < 0.25);
      assert.ok(Math.abs(dest.height - box.height) < 0.1);
      const guides = handwritingGuides(size.height, practiceArea);
      guides.forEach((guide, i) => {
        const mapped = dest.top + guide.y * dest.scale;
        const supplied = box.top + practiceArea.guides[i].y * box.height;
        assert.ok(Math.abs(mapped - supplied) < 0.1);
        const printed = rows[Math.floor(i / 3)][['top', 'mid', 'base'][i % 3]] * pageHeight / 100;
        assert.ok(Math.abs(mapped - printed) < pageHeight * 0.00006, 'Both printed rows align within source rounding');
      });
    }
  }
  const drawBox = percentBox(INPUT_REGIONS.draw, pageWidth, pageHeight);
  for (const [width, height] of [[800, 200], [200, 800]]) {
    const drawing = containPlacement(width, height, drawBox);
    assert.ok(drawing.width <= drawBox.width + 1e-8 && drawing.height <= drawBox.height + 1e-8);
    close(drawing.left + drawing.width / 2, drawBox.left + drawBox.width / 2);
    close(drawing.top + drawing.height / 2, drawBox.top + drawBox.height / 2);
    close(drawing.width / width, drawing.height / height);
  }
}

// Canvas commands: six gray guides and wrapped trace on the two baselines.
for (const id of ['write1', 'write2']) {
  for (const text of ['Hi', id === 'write1' ? 'The girl dresses up as a clown.' : 'The girl dresses up as a bee.']) {
    const lines = [];
    const trace = [];
    const ctx = {
      setTransform() {}, fillRect() {}, beginPath() {}, drawImage() {},
      setLineDash(dash) { this.dash = dash; },
      moveTo(x, y) { this.y = y; }, lineTo() {},
      stroke() { lines.push({ y: this.y, dash: this.dash, color: this.strokeStyle }); },
      measureText(value) { const size = parseFloat(this.font); return { width: value.length * size / 2, actualBoundingBoxAscent: size * .7 }; },
      fillText(value, x, y) { trace.push({ value, x, y, size: parseFloat(this.font), baseline: this.textBaseline }); },
    };
    const area = INPUT_REGIONS[id].practiceArea;
    const width = 784;
    const height = width / area.aspect;
    InkCanvas.prototype.paint.call({ width, height, dpr: 1, practiceArea: area, trace: true, text,
      context: ctx, ink: {}, inkContext: { setTransform() {}, clearRect() {} }, strokes: [], onChange() {} });
    const guides = handwritingGuides(height, area);
    assert.deepEqual(lines.map(line => line.y), guides.map(guide => guide.y));
    assert.deepEqual(lines.map(line => line.dash), [[], [5, 5], [], [], [5, 5], []]);
    assert.ok(lines.every(line => line.color === '#8a8b8a'));
    assert.equal(trace.map(line => line.value).join(' '), text);
    assert.equal(trace.length, text === 'Hi' ? 1 : 2);
    trace.forEach((line, i) => {
      const top = guides[i * 3].y;
      const base = guides[i * 3 + 2].y;
      close(line.y, base);
      assert.equal(line.baseline, 'alphabetic');
      assert.ok(line.size * .7 <= base - top + 1e-8);
      assert.ok(line.size * line.value.length / 2 <= width - 44 + 1e-8);
      if (text === 'Hi') close(line.y - line.size * .7, top);
    });
  }
}

// Measured resize reserves Done and visible feedback; hidden feedback takes no space.
globalThis.window = { devicePixelRatio: 2 };
globalThis.getComputedStyle = element => element.computed;
const done = { hidden: false, computed: { marginTop: '6px', marginBottom: '0px' }, getBoundingClientRect: () => ({ height: 48 }) };
const result = { hidden: true, computed: { marginTop: '8px', marginBottom: '0px' }, getBoundingClientRect: () => ({ height: 46 }) };
const canvas = { style: {}, getBoundingClientRect() { return { width: parseFloat(this.style.width), height: parseFloat(this.style.height) }; } };
const container = { height: 310, children: [canvas, done, result], getBoundingClientRect() { return { width: 784, height: this.height }; } };
const ink = { canvas, ink: {}, fitContainer: container, practiceArea: INPUT_REGIONS.write1.practiceArea, paint() {} };
InkCanvas.prototype.resize.call(ink);
close(ink.width, 784); close(ink.height, 784 / 3.6214);
result.hidden = false;
InkCanvas.prototype.resize.call(ink);
close(ink.height, 310 - 54 - 54); close(ink.width / ink.height, 3.6214);
container.height = 240; // Model chunks / smaller viewport reduce available height.
InkCanvas.prototype.resize.call(ink);
close(ink.height, 240 - 54 - 54); close(ink.width / ink.height, 3.6214);
container.height = 0;
InkCanvas.prototype.resize.call(ink);
close(ink.height, 132); // Hidden tabs retain the previous ink size/state.

// Each real InkCanvas starts with guides only and retains its own trace setting.
globalThis.ResizeObserver = class { observe() {} };
function traceFixture() {
  const visibleText = [];
  const inkText = [];
  const guideLines = [];
  const context = text => ({
    setTransform() {}, fillRect() {}, clearRect() {}, beginPath() {}, drawImage() {}, setLineDash() {},
    moveTo(x, y) { this.y = y; }, lineTo() {}, stroke() { guideLines.push(this.y); },
    measureText(value) { const size = parseFloat(this.font); return { width: value.length * size / 2, actualBoundingBoxAscent: size * .7 }; },
    fillText(value) { text.push(value); },
  });
  const visibleContext = context(visibleText);
  const inkContext = context(inkText);
  globalThis.document = { createElement: () => ({ getContext: () => inkContext }) };
  const canvas = {
    style: {}, getContext: () => visibleContext, addEventListener() {},
    getBoundingClientRect() { return { width: parseFloat(this.style.width), height: parseFloat(this.style.height) }; },
  };
  canvas.parentElement = { children: [canvas, done], getBoundingClientRect: () => ({ width: 784, height: 310 }) };
  const instance = new InkCanvas(canvas, { practiceArea: INPUT_REGIONS.write1.practiceArea, text: 'The girl dresses up as a clown.' });
  return { instance, visibleText, inkText, guideLines };
}
const firstTrace = traceFixture();
const secondTrace = traceFixture();
assert.equal(firstTrace.instance.trace, false);
assert.equal(secondTrace.instance.trace, false);
assert.equal(firstTrace.guideLines.length, 6);
assert.deepEqual(firstTrace.visibleText, []);
firstTrace.instance.trace = true;
firstTrace.instance.paint();
assert.equal(firstTrace.visibleText.length, 2);
assert.deepEqual(firstTrace.inkText, [], 'Trace must never enter the buffer used by the book mirror');
assert.equal(secondTrace.instance.trace, false, 'WRITE steps keep independent trace settings');
firstTrace.instance.resize();
assert.equal(firstTrace.instance.trace, true, 'Step/tab resize must preserve Trace');
firstTrace.visibleText.length = 0;
firstTrace.instance.trace = false;
firstTrace.instance.paint();
assert.deepEqual(firstTrace.visibleText, []);

// Exercise mirror state and RAF coalescing without simulating a browser renderer.
const frames = [];
globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
const mirror = Object.create(BookMirror.prototype);
Object.assign(mirror, { frame: null, writing: { write1: {}, write2: {} }, shades: {}, layer: {}, renders: 0,
  render() { this.renders++; }, closeName() { this.nameClosed = true; } });
const strokeInk = { strokes: ['first stroke'] };
mirror.setInk('write1', strokeInk, true);
mirror.setText('write1', 'I dress up.');
mirror.setInk('write1', strokeInk, false); // Resize / Trace toggle / mode switch are not edits.
assert.equal(mirror.writing.write1.mode, 'keyboard');
assert.equal(mirror.writing.write1.ink, strokeInk);
assert.equal(mirror.writing.write1.text, 'I dress up.');
mirror.setInk('write1', strokeInk, true); // Pen, eraser or Clear takes precedence.
assert.equal(mirror.writing.write1.mode, 'hand');
assert.equal(mirror.writing.write1.text, 'I dress up.');
mirror.setInk('write2', {}, false);
assert.equal(mirror.writing.write2.mode, undefined);
mirror.setInk('draw', strokeInk, true);
assert.equal(mirror.drawing, strokeInk);
mirror.setShade('shade1', 'TRUE');
mirror.setShade('shade1', null); // Same removal used for wrong-answer fade-out.
assert.equal(mirror.shades.shade1, null);
mirror.setShade('shade2', 'TRUE');
assert.equal(frames.length, 1, 'Many edits must share a single frame');
frames.shift()();
assert.equal(mirror.renders, 1);
mirror.setPage(6);
assert.equal(mirror.layer.hidden, true);
assert.equal(mirror.nameClosed, true);
mirror.setPage(7);
assert.equal(mirror.layer.hidden, false);
assert.equal(mirror.writing.write1.text, 'I dress up.');
assert.equal(mirror.shades.shade2, 'TRUE');
assert.equal(frames.length, 1);
frames.shift()();
assert.equal(mirror.renders, 2);
console.log('Book mirror checks passed: exact input regions; word wrap/shrink and names; proportional canvas sizing with reserved controls; six guides and two-row trace; default-off independent trace state and ink-only mirror buffer; whole-area and contain mapping at both widths; last-edit precedence; page persistence; RAF coalescing. (Canvas commands, layout math and state, not browser rendering.)');
