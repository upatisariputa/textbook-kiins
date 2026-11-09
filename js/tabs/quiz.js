import { SENTENCES, CONFIG, crop, choicesFor } from '../../data/content.js';
import { $, $$, heading, icon, TaskScope } from '../ui/dom.js';
import { celebrate, shake } from '../ui/effects.js';

export function createQuiz(root, { audio }) {
  const scope = new TaskScope();
  const items = SENTENCES.slice(1);
  const answers = new Set();
  const disabled = new Map(items.map(item => [item.id, new Set()]));
  const choices = new Map(items.map(item => [item.id, choicesFor(item.chunks[2], CONFIG.choices.quiz, CONFIG.choices.quizCount)]));
  let index = 0;
  let part = 1;
  let busy = false;
  let photoURL = null;
  let photoGeneration = 0;
  let mounted = false;
  root.innerHTML = `${heading('05', 'Look how much you know!', 'A little story challenge. A big moment to shine.')}<div class="quiz-part-tabs segmented" aria-label="Quiz parts"><button data-part="1" aria-pressed="true">1 · Look and complete</button><button data-part="2" aria-pressed="false">2 · Upload my book</button></div><section class="quiz-part-one"><div class="quiz-dots" aria-label="Quiz progress"></div><div class="quiz-item"></div><div class="quiz-finish" hidden><div class="big-star">✦</div><h2>Great job!</h2><div class="final-score">4/4</div><p>You completed the whole story.</p><button class="primary to-photo">Show my book ${icon('arrow')}</button><button class="quiz-retry">Play again ${icon('repeat')}</button></div></section><section class="quiz-part-two" hidden><div class="photo-intro"><span class="activity-tag">YOUR WORK DESERVES A BIG CIRCLE</span><h2>Let your book shine.</h2><p>Take a photo of your page. Celebrate your hard work!</p></div><div class="photo-stage"><div class="photo-placeholder">${icon('camera')}<span>Your masterpiece goes here.</span></div><img class="book-photo" alt="Your photographed workbook page" hidden><svg class="photo-stamp" viewBox="0 0 400 300" aria-hidden="true" hidden><path d="M290 46C210 10 70 32 49 139C28 249 184 287 295 246C395 209 376 88 283 48C209 14 86 43 61 126"/></svg></div><div class="photo-actions"><button class="primary take-photo">${icon('camera')} Take a photo</button><button class="retake-photo" hidden>${icon('repeat')} Retake</button><span class="photo-success" role="status" hidden>Great job!</span></div><input class="photo-input" type="file" accept="image/*" capture="environment" hidden><p class="notice photo-error" role="status" hidden></p><p class="subtle-tip">Your photo stays here. Nothing is uploaded or graded.</p></section>`;
  function dots() {
    $('.quiz-dots', root).innerHTML = items.map((item, i) => `<span class="quiz-dot ${answers.has(item.id) ? 'done' : i === index ? 'current' : ''}" aria-label="Question ${i + 1}${answers.has(item.id) ? ' complete' : ''}">${answers.has(item.id) ? '✓' : i + 1}</span>`).join('<span class="dot-connector"></span>');
  }
  function render() {
    dots();
    const item = items[index];
    const complete = index >= items.length;
    $('.quiz-item', root).hidden = complete;
    $('.quiz-finish', root).hidden = !complete;
    if (complete) return;
    const solved = answers.has(item.id);
    $('.quiz-item', root).innerHTML = `<div class="quiz-prompt"><img src="${crop(item.quizImage)}" alt="Look at this dress-up costume"><div><span class="eyebrow">LOOK & COMPLETE · ${index + 1} / 4</span><h2>I dress up <span class="quiz-blank ${solved ? 'filled' : ''}">${solved ? item.chunks[2] : '______'}</span></h2><p class="quiz-feedback" role="status">${solved ? '✓ You got it!' : 'Which words finish the sentence?'}</p></div></div><div class="quiz-choices">${choices.get(item.id).map(choice => `<button ${solved || disabled.get(item.id).has(choice) ? 'disabled' : ''} class="quiz-choice ${solved && choice === item.chunks[2] ? 'selected' : ''}">${choice}</button>`).join('')}</div><button class="primary quiz-next" ${solved ? '' : 'hidden'}>Next ${icon('arrow')}</button>`;
    $$('.quiz-choice', root).forEach(button => button.addEventListener('click', async () => {
      if (busy) return;
      if (button.textContent !== item.chunks[2]) {
        disabled.get(item.id).add(button.textContent);
        button.disabled = true;
        button.classList.add('wrong');
        shake(button);
        $('.quiz-feedback', root).textContent = 'Try again. Look closely at the picture!';
        return;
      }
      busy = true;
      const generation = scope.generation;
      answers.add(item.id); render();
      const result = await audio.play(`s_${item.id}`);
      if (generation !== scope.generation) return;
      if (!result.cancelled && await scope.wait(CONFIG.feedback.quizAdvanceMs)) advance();
    }));
    $('.quiz-next', root).addEventListener('click', advance);
  }
  function advance() {
    scope.cancel(); audio.stop(); busy = false;
    index++; render();
    if (index === items.length) celebrate(root, audio);
  }
  function changePart(next) {
    scope.cancel(); audio.stop(); busy = false; part = next;
    $('.quiz-part-one', root).hidden = part !== 1;
    $('.quiz-part-two', root).hidden = part !== 2;
    $$('[data-part]', root).forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.part) === part)));
  }
  $$('[data-part]', root).forEach(button => button.addEventListener('click', () => changePart(Number(button.dataset.part))));
  $('.to-photo', root).addEventListener('click', () => changePart(2));
  $('.quiz-retry', root).addEventListener('click', () => {
    scope.cancel(); audio.stop(); answers.clear(); disabled.forEach(set => set.clear()); index = 0; busy = false;
    render();
  });
  function pickPhoto() { $('.photo-input', root).value = ''; $('.photo-input', root).click(); }
  function resetPhoto() {
    photoGeneration++;
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = null;
    const photo = $('.book-photo', root);
    photo.hidden = true;
    photo.removeAttribute('src');
    const stamp = $('.photo-stamp', root);
    stamp.setAttribute('hidden', '');
    stamp.classList.remove('stamp-in');
    $('.photo-placeholder', root).hidden = false;
    $('.take-photo', root).hidden = false;
    $('.retake-photo', root).hidden = true;
    $('.photo-success', root).hidden = true;
    $('.photo-error', root).hidden = true;
  }
  $('.take-photo', root).addEventListener('click', pickPhoto);
  $('.retake-photo', root).addEventListener('click', () => { resetPhoto(); pickPhoto(); });
  $('.photo-input', root).addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const error = $('.photo-error', root);
    error.hidden = true;
    if (file.type && !file.type.startsWith('image/')) { error.textContent = 'Please choose a photo or image file.'; error.hidden = false; return; }
    const generation = ++photoGeneration;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (generation !== photoGeneration) { URL.revokeObjectURL(url); return; }
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = url;
      $('.book-photo', root).src = url;
      $('.book-photo', root).hidden = false;
      $('.photo-placeholder', root).hidden = true;
      $('.take-photo', root).hidden = true;
      $('.retake-photo', root).hidden = false;
      $('.photo-success', root).hidden = false;
      const stamp = $('.photo-stamp', root);
      stamp.removeAttribute('hidden'); stamp.classList.remove('stamp-in'); void stamp.getBoundingClientRect(); stamp.classList.add('stamp-in');
      if (mounted && part === 2) celebrate(root, audio);
    };
    img.onerror = () => { URL.revokeObjectURL(url); if (generation === photoGeneration) { error.textContent = 'This photo could not open. Try a JPG or PNG photo.'; error.hidden = false; } };
    img.src = url;
  });
  render();
  return { enter() { mounted = true; changePart(part); }, leave() { mounted = false; scope.cancel(); busy = false; } };
}
