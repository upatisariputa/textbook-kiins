import { SENTENCES, CONFIG, crop } from '../../data/content.js';
import { $, $$, heading, icon } from '../ui/dom.js';

export function createSentences(root, { audio, ebook }) {
  let active = SENTENCES[0];
  let token = 0;
  root.innerHTML = `${heading('02', 'Build it. Say it.', 'Little chunks make a whole sentence.')}<div class="tile-stage" aria-label="Sentence picture chunks"></div><div class="sentence-list">${SENTENCES.map((sentence, index) => `<div class="sentence-row" data-id="${sentence.id}" role="group" aria-label="Sentence ${index + 1}"><button type="button" class="sentence-main" aria-label="Play in English: ${sentence.chunks.join(' ')}" aria-pressed="false"><span class="row-number">${String(index + 1).padStart(2, '0')}</span><span class="sentence-chunks">${sentence.chunks.map(chunk => `<span class="row-chunk">${chunk}</span>`).join('<span class="chunk-divider" aria-hidden="true">/</span>')}</span>${icon('sound')}</button><button type="button" class="sentence-language" data-language="EN" aria-label="Play in English" aria-pressed="false">EN</button><button type="button" class="sentence-language" data-language="KO" aria-label="Play in Korean" aria-pressed="false">KO</button></div>`).join('')}</div><div class="subtle-tip">${icon('sound')} Tap a sentence, or choose EN / KO.</div>`;
  function stage(sentence) {
    $('.tile-stage', root).innerHTML = sentence.chunks.map((chunk, i) => `<div class="sentence-tile"><img src="${crop(sentence.tiles[i])}" alt="" draggable="false"><span>${chunk}</span></div>`).join('');
    $$('.sentence-row', root).forEach(row => {
      row.classList.toggle('active', row.dataset.id === sentence.id);
      $('.sentence-main', row).setAttribute('aria-pressed', String(row.dataset.id === sentence.id));
    });
  }
  function clearPlaying() {
    $$('.sentence-tile', root).forEach(tile => tile.classList.remove('lit', 'dim'));
    $$('.row-chunk', root).forEach(chunk => chunk.classList.remove('karaoke'));
    $$('.sentence-language', root).forEach(button => {
      button.classList.remove('speaking');
      button.setAttribute('aria-pressed', 'false');
    });
  }
  $$('.sentence-row', root).forEach(row => row.addEventListener('click', async event => {
    const lang = event.target.closest('[data-language]')?.dataset.language || 'EN';
    const current = ++token;
    audio.stop();
    clearPlaying();
    active = SENTENCES.find(sentence => sentence.id === row.dataset.id);
    stage(active);
    ebook.highlight(6, active.region);
    const button = $(`[data-language="${lang}"]`, row);
    button.setAttribute('aria-pressed', 'true');
    button.classList.add('speaking');
    if (lang === 'EN') {
      await audio.sequence(active.chunks.map((_, i) => `s_${active.id}_c${i + 1}`), CONFIG.audio.gapMs, index => {
        $$('.sentence-tile', root).forEach((tile, i) => { tile.classList.toggle('lit', i === index); tile.classList.toggle('dim', i !== index); });
        $$('.row-chunk', row).forEach((chunk, i) => chunk.classList.toggle('karaoke', i === index));
      });
    } else {
      $$('.sentence-tile', root).forEach(tile => tile.classList.add('lit'));
      await audio.play(`s_${active.id}_ko`);
    }
    if (current === token) clearPlaying();
  }));
  stage(active);
  return { enter() { ebook.highlight(6, active.region); }, leave() { token++; clearPlaying(); } };
}
