import { WORDS, CONFIG, crop, choicesFor } from '../../data/content.js';
import { $, $$, heading, icon } from '../ui/dom.js';
import { celebrate, shake } from '../ui/effects.js';

export function createWords(root, { audio, ebook, navigate }) {
  const done = new Set();
  root.innerHTML = `${heading('01', 'A little dress-up magic.', 'Tap a card. Listen closely. Find its meaning!')}<div class="activity-meta"><span class="activity-tag">FLIP & FIND</span><span id="word-count">0 of 4 discovered</span></div><div class="word-grid">${WORDS.map((word, index) => `<article class="word-card" data-word="${word.id}"><button class="flip-button" aria-label="Turn over card ${index + 1}" aria-pressed="false"><span class="flip-inner"><span class="card-back back-${index}"><span class="card-corner">✦</span><span class="question-mark">?</span><span class="tap-hint">TAP TO DISCOVER</span><span class="card-number">0${index + 1}</span></span><span class="card-front" aria-hidden="true"><span class="word-check" hidden>✓</span><img src="${crop(word.image)}" alt="" draggable="false"><span class="word-label">${word.en}</span><span class="word-listen">${icon('sound')} Listen</span></span></span></button><div class="meaning-choices">${choicesFor(word.ko, CONFIG.choices.meanings, CONFIG.choices.wordCount).map(choice => `<button class="meaning-choice" lang="ko" disabled>${choice}</button>`).join('')}</div></article>`).join('')}</div><div class="word-tip">${icon('sound')} A new costume. A new word. Let’s explore!</div><div class="completion-banner" hidden><div><strong>Great job!</strong><span>You discovered all 4 words.</span></div><button class="primary next-button">Next ${icon('arrow')}</button></div><p class="sr-only" role="status" id="word-status"></p>`;
  for (const word of WORDS) {
    const card = $(`[data-word="${word.id}"]`, root);
    const flip = $('.flip-button', card);
    flip.addEventListener('click', () => {
      card.classList.add('flipped');
      flip.setAttribute('aria-pressed', 'true');
      flip.setAttribute('aria-label', `Listen: ${word.en}`);
      $('.card-front', card).setAttribute('aria-hidden', 'false');
      $('.card-back', card).setAttribute('aria-hidden', 'true');
      if (!done.has(word.id)) $$('.meaning-choice', card).forEach(button => { if (!button.dataset.wrong) button.disabled = false; });
      ebook.highlight(6, word.region);
      audio.play(`w_${word.id}`);
    });
    $$('.meaning-choice', card).forEach(button => button.addEventListener('click', async () => {
      ebook.highlight(6, word.region);
      card.classList.remove('wrong');
      if (button.textContent === word.ko) {
        done.add(word.id);
        card.classList.add('correct');
        button.classList.add('selected');
        $('.word-check', card).hidden = false;
        $$('.meaning-choice', card).forEach(choice => { choice.disabled = true; });
        $('#word-count', root).textContent = `${done.size} of 4 discovered`;
        $('#word-status', root).textContent = `Correct! ${word.en}.`;
        if (done.size === WORDS.length) {
          $('.completion-banner', root).hidden = false;
          $('.word-tip', root).hidden = true;
          celebrate(root, audio, false);
          await audio.sequence([`w_${word.id}_ko`, 'praise_great']);
        } else await audio.play(`w_${word.id}_ko`);
      } else {
        card.classList.add('wrong');
        button.disabled = true;
        button.dataset.wrong = 'true';
        shake(card);
        $('#word-status', root).textContent = 'Try again. Listen one more time!';
        audio.play(`w_${word.id}`);
      }
    }));
  }
  $('.next-button', root).addEventListener('click', () => navigate('sentences'));
  return { enter() { ebook.clear(); ebook.show(6); }, leave() {} };
}
