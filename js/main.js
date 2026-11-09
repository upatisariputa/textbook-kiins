import { TABS, CONFIG } from '../data/content.js';
import { AudioPlayer } from './audio.js';
import { Ebook } from './ebook.js';
import { $, $$, icon } from './ui/dom.js';
import { createWords } from './tabs/words.js';
import { createSentences } from './tabs/sentences.js';
import { createShadowReading } from './tabs/shadow-reading.js';
import { createShadowWriting } from './tabs/shadow-writing.js';
import { createQuiz } from './tabs/quiz.js';

document.documentElement.style.setProperty('--book-width', `${CONFIG.paneRatio}%`);
document.documentElement.style.setProperty('--model-blink', `${CONFIG.model.blinkMs}ms`);
const audio = new AudioPlayer();
const ebook = new Ebook($('#ebook'));
const factories = { words: createWords, sentences: createSentences, 'shadow-reading': createShadowReading, 'shadow-writing': createShadowWriting, quiz: createQuiz };
const instances = new Map();
let active = null;
$('#tabs').innerHTML = TABS.map((tab, index) => `<button id="tab-${tab.id}" role="tab" aria-selected="false" aria-controls="panel-${tab.id}" data-tab="${tab.id}" tabindex="-1"><span class="tab-icon-wrap">${icon(tab.icon)}</span><span>${tab.label}</span><small aria-hidden="true">0${index + 1}</small></button>`).join('');
for (const tab of TABS) {
  const panel = document.createElement('div');
  panel.id = `panel-${tab.id}`;
  panel.className = 'tab-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${tab.id}`);
  panel.hidden = true;
  $('#tab-panels').append(panel);
}
function navigate(id) {
  if (active === id) return;
  if (active) instances.get(active)?.leave();
  audio.stop(); ebook.clear();
  $('#audio-notice').hidden = true;
  active = id;
  const quiz = id === 'quiz';
  $('.workspace').classList.toggle('quiz-layout', quiz);
  ebook.root.hidden = quiz;
  if (quiz) ebook.mirror.closeName(false);
  else ebook.resize();
  $$('.tab-panel').forEach(panel => { panel.hidden = panel.id !== `panel-${id}`; });
  $$('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  if (!instances.has(id)) instances.set(id, factories[id]($(`#panel-${id}`), { audio, ebook, navigate }));
  instances.get(id).enter();
  $('#practice').scrollTop = 0;
}
$$('[data-tab]').forEach((button, index, buttons) => {
  button.addEventListener('click', () => navigate(button.dataset.tab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    navigate(buttons[next].dataset.tab); buttons[next].focus();
  });
});
audio.addEventListener('notice', event => {
  $('#audio-notice').textContent = event.detail;
  $('#audio-notice').hidden = false;
});
audio.addEventListener('statechange', event => {
  document.body.classList.toggle('audio-playing', event.detail.isPlaying);
  if (event.detail.isPlaying) $('#audio-notice').hidden = true;
});
function suspend() { instances.get(active)?.leave(); audio.stop(); ebook.clear(); }
window.addEventListener('pagehide', suspend);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else instances.get(active)?.enter();
});
navigate('words');
