import { CONFIG } from '../../data/content.js';

export function celebrate(root, audio, speak = true) {
  if (speak) audio.play('praise_great');
  root.querySelector('.confetti')?.remove();
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < CONFIG.feedback.confettiCount; i++) {
      const piece = document.createElement('i');
      piece.style.cssText = `--x:${Math.random() * 100}%;--delay:${Math.random() * 250}ms;--drift:${(Math.random() - 0.5) * 180}px;--turn:${Math.random() * 720}deg;background:${CONFIG.drawing.colors[i % CONFIG.drawing.colors.length]};`;
      layer.append(piece);
    }
    root.append(layer);
    setTimeout(() => layer.remove(), CONFIG.feedback.confettiMs);
  }
}
export function shake(element) {
  element.classList.remove('shake');
  void element.offsetWidth;
  element.classList.add('shake');
}
