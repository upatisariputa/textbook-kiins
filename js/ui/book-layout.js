export const PRINT_FONT = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", system-ui, sans-serif';

// Keep whole words on the verified rows. Shrink only after wrapping fails.
// measure(text, fontSize) is injected so the same layout is testable without DOM.
export function fitTextRows(text, widths, maxSize, measure) {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return { lines: [], fontSize: maxSize };
  const wrap = size => {
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size) <= widths[lines.length]) line = candidate;
      else {
        if (line) lines.push(line);
        if (lines.length >= widths.length || measure(word, size) > widths[lines.length]) return null;
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const lines = wrap(maxSize);
  if (lines) return { lines, fontSize: maxSize };
  let low = 0;
  let high = maxSize;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (wrap(mid)) low = mid; else high = mid;
  }
  return { lines: wrap(low), fontSize: low };
}

export function percentBox(region, width, height) {
  return { left: region.left * width / 100, top: region.top * height / 100,
    width: region.width * width / 100, height: region.height * height / 100 };
}

export function fitPracticeCanvas(availableWidth, availableHeight, aspect) {
  const width = Math.max(0, Math.min(availableWidth, availableHeight * aspect));
  return { width, height: width / aspect };
}

export function handwritingGuides(height, practiceArea) {
  return practiceArea.guides.map(guide => ({ y: guide.y * height, style: guide.style }));
}

export function handwritingPlacement(width, height, practiceArea, pageWidth, pageHeight) {
  const box = percentBox(practiceArea, pageWidth, pageHeight);
  // A whole-box scale also accommodates rounding in the verified percentages.
  const scale = Math.min(box.width / width, box.height / height);
  return { left: box.left, top: box.top, width: width * scale, height: height * scale, scale };
}

export function containPlacement(width, height, box) {
  const scale = Math.min(box.width / width, box.height / height);
  return { left: box.left + (box.width - width * scale) / 2,
    top: box.top + (box.height - height * scale) / 2, width: width * scale, height: height * scale };
}
