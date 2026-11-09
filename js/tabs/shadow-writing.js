import { WORKSHEET, CONFIG, INPUT_REGIONS } from '../../data/content.js';
import { $, $$, heading, icon, escapeHTML, TaskScope } from '../ui/dom.js';
import { InkCanvas } from '../ui/canvas.js';
import { correctAnswer } from '../ui/correction.js';
import { celebrate, shake } from '../ui/effects.js';

export function createShadowWriting(root, { audio, ebook }) {
  const scope = new TaskScope();
  const canvases = [];
  let active = WORKSHEET[0];
  root.innerHTML = `${heading('04', 'Make it your own.', 'Listen, write, shade… then let your imagination play!')}<div class="writing-stepper" role="tablist" aria-label="Worksheet steps">${WORKSHEET.map(step => `<button role="tab" id="step-${step.id}" aria-controls="worksheet-${step.id}" data-step="${step.id}" aria-selected="false">${step.label}</button>`).join('')}</div><div class="worksheet-panels">${WORKSHEET.map(step => `<section class="worksheet-step" id="worksheet-${step.id}" aria-labelledby="step-${step.id}" role="tabpanel" data-id="${step.id}" hidden><div class="question-row"><button type="button" class="listen-button question-audio" data-playback="guided" aria-label="Listen and practice" aria-pressed="false">${icon('sound')}</button><h2>${step.question}</h2><div class="question-languages"><button type="button" class="sentence-language question-audio" data-playback="EN" aria-label="Play in English" aria-pressed="false">EN</button><button type="button" class="sentence-language question-audio" data-playback="KO" aria-label="Play in Korean" aria-pressed="false">KO</button></div></div><div class="step-body"></div></section>`).join('')}</div>`;
  function completeStep(id) {
    const button = $(`[data-step="${id}"]`, root);
    if (button.classList.contains('completed')) return;
    button.classList.add('completed');
    button.insertAdjacentHTML('afterbegin', '<span class="step-check" aria-hidden="true">✓</span>');
    button.setAttribute('aria-label', `${WORKSHEET.find(step => step.id === id).label}, completed`);
  }
  function cancel() {
    scope.cancel();
    audio.stop();
    $$('.answer-chunk', root).forEach(chunk => chunk.classList.remove('chunk-flash'));
    $$('.question-audio', root).forEach(button => {
      button.classList.remove('speaking');
      button.setAttribute('aria-pressed', 'false');
    });
    canvases.forEach(canvas => canvas.cancelStroke());
  }
  function select(id) {
    cancel();
    active = WORKSHEET.find(step => step.id === id);
    $$('.worksheet-step', root).forEach(panel => { panel.hidden = panel.dataset.id !== id; });
    $$('[data-step]', root).forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.step === id));
      button.tabIndex = button.dataset.step === id ? 0 : -1;
    });
    ebook.highlight(7, id);
    canvases.forEach(canvas => canvas.resize());
  }
  $$('[data-step]', root).forEach((button, index, buttons) => {
    button.addEventListener('click', () => select(button.dataset.step));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click(); buttons[next].focus();
    });
  });
  for (const step of WORKSHEET) {
    const panel = $(`[data-id="${step.id}"]`, root);
    const body = $('.step-body', panel);
    $$('.question-audio', panel).forEach(button => button.addEventListener('click', async () => {
      cancel();
      const generation = scope.generation;
      ebook.highlight(7, step.id);
      const playback = button.dataset.playback;
      button.classList.add('speaking');
      button.setAttribute('aria-pressed', 'true');
      try {
        const result = await audio.play(`q_${step.id}${playback === 'KO' ? '_ko' : ''}`);
        if (generation !== scope.generation || result.cancelled) return;
        if (playback !== 'guided' || !step.chunks) return;
        $('.model-chunks', panel).hidden = false;
        const chunks = $$('.answer-chunk', panel);
        for (let loop = 0; loop < CONFIG.model.loops; loop++) {
          for (let i = 0; i < chunks.length; i++) {
            if (generation !== scope.generation) return;
            chunks.forEach((chunk, j) => chunk.classList.toggle('chunk-flash', i === j));
            const chunkResult = await audio.play(`a_${step.id}_c${i + 1}`);
            if (generation !== scope.generation || chunkResult.cancelled) return;
            if (!(await scope.wait(CONFIG.model.blinkMs))) return;
          }
        }
      } finally {
        if (generation === scope.generation) {
          button.classList.remove('speaking');
          button.setAttribute('aria-pressed', 'false');
          $$('.answer-chunk', panel).forEach(chunk => chunk.classList.remove('chunk-flash'));
        }
      }
    }));
    if (step.type === 'write') setupWrite(step, body, panel);
    if (step.type === 'shade') setupShade(step, body);
    if (step.type === 'draw') setupDraw(body);
  }
  function setupWrite(step, body, panel) {
    const answer = step.chunks.join(' ');
    body.innerHTML = `<div class="model-chunks" hidden>${step.chunks.map(chunk => `<div class="answer-chunk">${chunk}</div>`).join('')}</div><div class="writing-mode-row"><div class="segmented mode-toggle" aria-label="Writing mode"><button data-mode="hand" aria-pressed="true">${icon('pen')} Handwriting</button><button data-mode="keyboard" aria-pressed="false">⌨ Keyboard</button></div><span class="mode-hint">Your turn to write!</span></div><div class="handwriting-mode"><div class="canvas-toolbar"><button data-tool="pen" aria-pressed="true">${icon('pen')} Pen</button><button data-tool="eraser" aria-pressed="false">Eraser</button><button data-tool="clear">Clear</button><button type="button" class="trace-toggle" aria-pressed="false">Trace</button></div><canvas class="handwriting-canvas" aria-label="Handwriting area; use a pointer to write, or choose Keyboard"></canvas><div class="canvas-bottom"><span>Follow the lines. Take your time.</span><button class="primary done-writing">Done ${icon('check')}</button></div><div class="handwriting-result" role="status" hidden><strong>Great job!</strong><p>${answer}</p></div></div><div class="keyboard-mode" hidden><label class="input-label" for="input-${step.id}">Write your answer</label><form class="answer-form"><input id="input-${step.id}" class="answer-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your sentence here…" aria-describedby="correction-${step.id}"><button type="submit" class="primary">Check ${icon('check')}</button></form><div class="correction-output" id="correction-${step.id}" role="status"></div></div>`;
    const modeRow = $('.writing-mode-row', body);
    const toolbar = $('.canvas-toolbar', body);
    modeRow.classList.add('handwriting-controls');
    modeRow.append(toolbar);
    $('.mode-hint', body).hidden = true;
    const ink = new InkCanvas($('.handwriting-canvas', body), {
      practiceArea: INPUT_REGIONS[step.id].practiceArea, text: answer,
      onChange: (canvas, edited) => ebook.mirror.setInk(step.id, canvas, edited),
    });
    canvases.push(ink);
    $('.answer-input', body).addEventListener('input', event => ebook.mirror.setText(step.id, event.target.value));
    $$('[data-mode]', body).forEach(button => button.addEventListener('click', () => {
      const hand = button.dataset.mode === 'hand';
      modeRow.classList.toggle('handwriting-controls', hand);
      toolbar.hidden = !hand;
      $('.mode-hint', body).hidden = hand;
      $('.handwriting-mode', body).hidden = !hand;
      $('.keyboard-mode', body).hidden = hand;
      $$('[data-mode]', body).forEach(mode => mode.setAttribute('aria-pressed', String(mode === button)));
      ebook.highlight(7, step.id);
      if (hand) ink.resize(); else $('.answer-input', body).focus();
    }));
    $$('[data-tool]', body).forEach(button => button.addEventListener('click', () => {
      if (button.dataset.tool === 'clear') { ink.clear(); $('.handwriting-result', body).hidden = true; }
      else {
        ink.eraser = button.dataset.tool === 'eraser';
        $$('[data-tool="pen"], [data-tool="eraser"]', body).forEach(tool => tool.setAttribute('aria-pressed', String(tool === button)));
      }
    }));
    $('.trace-toggle', body).addEventListener('click', event => {
      ink.trace = !ink.trace;
      event.currentTarget.setAttribute('aria-pressed', String(ink.trace));
      ink.paint();
    });
    $('.done-writing', body).addEventListener('click', () => {
      cancel();
      ebook.highlight(7, step.id);
      $('.handwriting-result', body).hidden = false;
      completeStep(step.id);
      celebrate(root, audio);
    });
    $('.answer-form', body).addEventListener('submit', event => {
      event.preventDefault();
      cancel();
      ebook.highlight(7, step.id);
      const result = correctAnswer($('.answer-input', body).value, CONFIG.acceptedAnswers[step.id]);
      const output = $('.correction-output', body);
      if (result.empty) { output.innerHTML = '<p class="notice">Write a sentence first. You can do it!</p>'; return; }
      if (!result.fixes) {
        completeStep(step.id);
        output.innerHTML = `<div class="correct-answer">✓ Great job!<p>${escapeHTML(result.answer)}</p></div>`;
        celebrate(root, audio);
        return;
      }
      let firstTarget = true;
      const markup = result.operations.map(operation => {
        const needsCapital = firstTarget && operation.to && result.capital;
        if (operation.to) firstTarget = false;
        const from = escapeHTML(operation.from);
        const to = escapeHTML(operation.to);
        if (operation.type === 'same' && !needsCapital) return `<span class="edit-word unchanged">${from}</span>`;
        if (operation.type === 'delete') return `<span class="edit-word deleted"><span class="edit-above">&nbsp;</span><del>${from}</del></span>`;
        if (operation.type === 'insert') return `<span class="edit-word inserted"><span class="edit-above">${to}</span><span class="caret">^</span></span>`;
        return `<span class="edit-word replaced"><span class="edit-above">${to}</span><del>${from}</del></span>`;
      }).join(' ');
      output.innerHTML = `<div class="correction-card"><div class="correction-summary">${result.fixes} ${result.fixes === 1 ? 'fix' : 'fixes'} · Let’s polish it!</div><div class="red-pen">${markup}${result.period ? ' <span class="edit-word inserted"><span class="edit-above">.</span><span class="caret">^</span></span>' : '.'}</div><div class="format-notes">${result.capital ? '<span>↑ Start with a capital letter.</span>' : ''}${result.period ? '<span>↑ Finish with a period.</span>' : ''}</div><p class="corrected-model">${escapeHTML(result.answer)}</p></div>`;
    });
  }
  function setupShade(step, body) {
    body.innerHTML = `<p class="shade-instruction">Is it true? Shade your answer.</p><div class="shade-options">${[true, false].map(value => `<button class="shade-circle" data-value="${value}" aria-label="${value ? 'TRUE' : 'FALSE'}"><svg class="scribble" viewBox="0 0 160 160" aria-hidden="true"><path d="M35 23 126 32 22 43 143 53 16 64 145 75 14 86 143 97 20 108 137 119 33 130 121 141"/></svg><span>${value ? 'TRUE' : 'FALSE'}</span><b class="shade-check" hidden>✓</b></button>`).join('')}</div><p class="shade-status" role="status">Look at the story for a clue.</p>`;
    let answered = false;
    let busy = false;
    $$('.shade-circle', body).forEach(button => button.addEventListener('click', async () => {
      if (answered || busy) return;
      busy = true;
      ebook.highlight(7, step.id);
      button.classList.add('shaded');
      ebook.mirror.setShade(step.id, button.dataset.value === 'true' ? 'TRUE' : 'FALSE');
      if ((button.dataset.value === 'true') === step.answer) {
        answered = true;
        completeStep(step.id);
        button.classList.add('correct');
        $('.shade-check', button).hidden = false;
        $$('.shade-circle', body).forEach(option => { option.disabled = true; });
        $('.shade-status', body).textContent = '✓ Great job! You found it.';
        audio.play('praise_great');
      } else {
        shake(button);
        $('.shade-status', body).textContent = 'Try again. Look at the story!';
        await scope.wait(CONFIG.feedback.retryMs);
        button.classList.remove('shaded');
        ebook.mirror.setShade(step.id, null);
      }
      busy = false;
    }));
  }
  function setupDraw(body) {
    body.innerHTML = `<div class="draw-toolbar"><div class="color-tools" aria-label="Pen colors">${CONFIG.drawing.colors.map((color, i) => `<button class="color-button" style="--color:${color}" data-color="${color}" aria-label="${['Ink', 'Coral', 'Gold', 'Green', 'Blue', 'Purple'][i]} pen" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div><div class="brush-tools">${CONFIG.drawing.sizes.map((size, i) => `<button data-size="${size}" aria-label="${i ? 'Thick' : 'Thin'} brush" aria-pressed="${i === 0}"><span class="brush-dot" style="width:${size + 3}px;height:${size + 3}px"></span></button>`).join('')}<button class="draw-eraser" aria-pressed="false">Eraser</button><button class="draw-clear">Clear</button></div></div><canvas class="drawing-canvas" aria-label="Draw a costume with a finger, stylus or mouse"></canvas><div class="canvas-bottom"><span>Your imagination looks good on you.</span><button class="primary save-drawing">Save PNG ↓</button></div>`;
    const ink = new InkCanvas($('.drawing-canvas', body), {
      onChange: (canvas, edited) => ebook.mirror.setInk('draw', canvas, edited),
    });
    canvases.push(ink);
    function pen() { ink.eraser = false; $('.draw-eraser', body).setAttribute('aria-pressed', 'false'); }
    $$('[data-color]', body).forEach(button => button.addEventListener('click', () => {
      pen(); ink.color = button.dataset.color;
      $$('[data-color]', body).forEach(color => color.setAttribute('aria-pressed', String(color === button)));
    }));
    $$('[data-size]', body).forEach(button => button.addEventListener('click', () => {
      pen(); ink.size = Number(button.dataset.size);
      $$('[data-size]', body).forEach(size => size.setAttribute('aria-pressed', String(size === button)));
    }));
    $('.draw-eraser', body).addEventListener('click', event => {
      ink.eraser = !ink.eraser;
      event.currentTarget.setAttribute('aria-pressed', String(ink.eraser));
    });
    $('.draw-clear', body).addEventListener('click', () => ink.clear());
    $('.save-drawing', body).addEventListener('click', () => { ink.save(); completeStep('draw'); });
  }
  select(active.id);
  return { enter() { ebook.highlight(7, active.id); canvases.forEach(canvas => canvas.resize()); }, leave: cancel };
}
