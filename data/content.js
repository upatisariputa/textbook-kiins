// Korean strings are audio data. Only WORDS renders its meaning-choice labels.
export const CONFIG = {
  paneRatio: 35,
  highlight: { blinks: 3, durationMs: 1200 },
  ttsText: { 'I': 'I.' }, // Spoken text only; leave visible sentence chunks unchanged.
  audio: { gapMs: 250, startTimeoutMs: 7000, wordsPerMinute: 140 },
  shadow: { pauseFactor: 1.8, minimumPauseMs: 2500, countdownTickMs: 40 },
  model: { loops: 2, blinkMs: 550 },
  feedback: { retryMs: 550, quizAdvanceMs: 500, confettiMs: 1500, confettiCount: 36 },
  handwriting: { penWidth: 3, eraserWidth: 22, guideColor: '#8a8b8a' },
  drawing: { colors: ['#193d36', '#ec6359', '#efad35', '#39966d', '#5488cc', '#a073bf'], sizes: [4, 10] },
  voices: {
    narrator: { voice: 'Samantha', lang: 'en-US', rate: 140, pitch: 1 },
    korean: { voice: 'Yuna', lang: 'ko-KR', rate: 180, pitch: 1 },
  },
  choices: {
    meanings: ['광대', '공룡', '벌', '분장하다'],
    quiz: ['as a clown.', 'as a dinosaur.', 'as a bee.', 'as me!'],
    wordCount: 2, quizCount: 3,
  },
  acceptedAnswers: {
    write1: ['The girl dresses up as a clown.', 'The first thing the girl dresses up as is a clown.', 'She dresses up as a clown.'],
    write2: ['The girl dresses up as a bee.', 'She dresses up as a bee.'],
  },
};

export const TABS = [
  { id: 'words', label: 'WORDS', icon: 'cards' },
  { id: 'sentences', label: 'SENTENCES', icon: 'lines' },
  { id: 'shadow-reading', label: 'SHADOW READING!', icon: 'mic' },
  { id: 'shadow-writing', label: 'SHADOW WRITING!', icon: 'pen' },
  { id: 'quiz', label: 'QUIZ', icon: 'star' },
];
export const WORDS = [
  { id: 'clown', en: 'clown', ko: '광대', image: 'clown', region: 'panel1' },
  { id: 'dinosaur', en: 'dinosaur', ko: '공룡', image: 'dinosaur', region: 'panel2' },
  { id: 'bee', en: 'bee', ko: '벌', image: 'bee', region: 'panel3' },
  { id: 'dressup', en: 'dress up', ko: '분장하다', image: 'dressup', region: 'title' },
];
export const SENTENCES = [
  { id: 'title', chunks: ['I', 'Dress Up'], ko: '나는 옷을 입는다', tiles: ['girl', 'costumes'], character: 'narrator', region: 'title', image: 'dressup' },
  { id: 's1', chunks: ['I', 'dress up', 'as a clown.'], ko: '나는 광대 분장을 한다.', tiles: ['girl', 'costumes', 'clown'], character: 'narrator', region: 'panel1', image: 'p6_panel1', quizImage: 'clown' },
  { id: 's2', chunks: ['I', 'dress up', 'as a dinosaur.'], ko: '나는 공룡 분장을 한다.', tiles: ['girl', 'costumes', 'dinosaur'], character: 'narrator', region: 'panel2', image: 'p6_panel2', quizImage: 'dinosaur' },
  { id: 's3', chunks: ['I', 'dress up', 'as a bee.'], ko: '나는 벌 분장을 한다.', tiles: ['girl', 'costumes', 'bee'], character: 'narrator', region: 'panel3', image: 'p6_panel3', quizImage: 'bee' },
  { id: 's4', chunks: ['I', 'dress up', 'as me!'], ko: '나는 나 자신으로 분장한다!', tiles: ['girl', 'costumes', 'dressup'], character: 'narrator', region: 'panel4', image: 'p6_panel4', quizImage: 'girl' },
];
export const WORKSHEET = [
  { id: 'write1', label: 'WRITE 1', type: 'write', question: 'What does the girl dress up as FIRST?', ko: '소녀가 처음에 무엇으로 분장하나요?', chunks: ['The girl', 'dresses up', 'as a clown.'] },
  { id: 'write2', label: 'WRITE 2', type: 'write', question: 'What insect does the girl dress up as?', ko: '소녀는 어떤 곤충으로 분장하나요?', chunks: ['The girl', 'dresses up', 'as a bee.'] },
  { id: 'shade1', label: 'SHADE 1', type: 'shade', question: 'The girl dresses up as a cat.', ko: '소녀는 고양이 분장을 한다.', answer: false },
  { id: 'shade2', label: 'SHADE 2', type: 'shade', question: 'The girl dresses up as a dinosaur.', ko: '소녀는 공룡 분장을 한다.', answer: true },
  { id: 'draw', label: 'DRAW', type: 'draw', question: 'What do you like to dress up as?', ko: '너는 무엇으로 분장하는 걸 좋아하니?' },
];
export const AUDIO = {};
function add(id, text, voice = 'narrator') { AUDIO[id] = { id, text: CONFIG.ttsText[text] ?? text, ...CONFIG.voices[voice] }; }
for (const word of WORDS) {
  add(`w_${word.id}`, word.en);
  add(`w_${word.id}_ko`, word.ko, 'korean');
}
for (const sentence of SENTENCES) {
  add(`s_${sentence.id}`, sentence.chunks.join(' '));
  add(`s_${sentence.id}_ko`, sentence.ko, 'korean');
  add(`sr_${sentence.id}`, sentence.chunks.join(' '), sentence.character);
  sentence.chunks.forEach((chunk, index) => add(`s_${sentence.id}_c${index + 1}`, chunk));
}
for (const step of WORKSHEET) {
  add(`q_${step.id}`, step.question);
  add(`q_${step.id}_ko`, step.ko, 'korean');
  if (step.chunks) {
    add(`a_${step.id}`, step.chunks.join(' '));
    step.chunks.forEach((chunk, index) => add(`a_${step.id}_c${index + 1}`, chunk));
  }
}
add('praise_great', 'Great job!');
add('praise_try', 'Try again!');

export const crop = name => `assets/img/crops/${name}.png`;
export function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function choicesFor(answer, pool, count) {
  return shuffled([answer, ...shuffled(pool.filter(item => item !== answer)).slice(0, count - 1)]);
}

// Verified source coordinates, copied without changes.
export const HOTSPOTS = {
  "6": {
    "title": {
      "left": 23.71,
      "top": 0.26,
      "width": 50.41,
      "height": 7.03
    },
    "panel1": {
      "left": 5.8,
      "top": 9.21,
      "width": 41.96,
      "height": 42.07
    },
    "panel2": {
      "left": 49.92,
      "top": 9.21,
      "width": 42.29,
      "height": 42.07
    },
    "panel3": {
      "left": 5.8,
      "top": 52.3,
      "width": 41.96,
      "height": 42.2
    },
    "panel4": {
      "left": 49.92,
      "top": 52.3,
      "width": 42.29,
      "height": 42.2
    }
  },
  "7": {
    "write1": {
      "left": 7.46,
      "top": 15.98,
      "width": 84.58,
      "height": 19.57
    },
    "write2": {
      "left": 7.46,
      "top": 37.47,
      "width": 84.58,
      "height": 19.05
    },
    "shade": {
      "left": 7.46,
      "top": 58.57,
      "width": 42.29,
      "height": 35.81
    },
    "shade1": {
      "left": 8.29,
      "top": 63.3,
      "width": 41.13,
      "height": 14.45
    },
    "shade2": {
      "left": 8.29,
      "top": 77.75,
      "width": 41.13,
      "height": 16.11
    },
    "shade1_true": {
      "left": 13.27,
      "top": 66.88,
      "width": 13.93,
      "height": 10.74
    },
    "shade1_false": {
      "left": 30.68,
      "top": 66.88,
      "width": 13.93,
      "height": 10.74
    },
    "shade2_true": {
      "left": 13.27,
      "top": 82.74,
      "width": 13.93,
      "height": 10.74
    },
    "shade2_false": {
      "left": 30.68,
      "top": 82.74,
      "width": 13.93,
      "height": 10.74
    },
    "draw": {
      "left": 49.75,
      "top": 58.57,
      "width": 41.96,
      "height": 35.81
    }
  }
};

// Verified page-7 input coordinates, copied without changes.
export const INPUT_REGIONS = {
  "_note": "Page 7 input mirror regions, percent of the page image (603x782pt base, same space as hotspots.json). Measured on the 1810x2346 render.",
  "name": {
    "left": 17.58,
    "top": 3.84,
    "width": 57.38,
    "height": 2.3,
    "baseline": 6.07
  },
  "write1": {
    "area": {
      "left": 7.79,
      "top": 19.18,
      "width": 84.08,
      "height": 16.11
    },
    "rows": [
      {
        "top": 19.82,
        "mid": 22.89,
        "base": 25.96,
        "left": 7.79,
        "width": 84.08
      },
      {
        "top": 28.77,
        "mid": 31.84,
        "base": 34.91,
        "left": 7.79,
        "width": 84.08
      }
    ],
    "practiceArea": {
      "left": 7.794,
      "top": 18.926,
      "width": 84.08,
      "height": 17.903,
      "aspect": 3.6214,
      "guides": [
        {
          "y": 0.05,
          "style": "solid"
        },
        {
          "y": 0.2214,
          "style": "dashed"
        },
        {
          "y": 0.3929,
          "style": "solid"
        },
        {
          "y": 0.55,
          "style": "solid"
        },
        {
          "y": 0.7214,
          "style": "dashed"
        },
        {
          "y": 0.8929,
          "style": "solid"
        }
      ]
    }
  },
  "write2": {
    "area": {
      "left": 7.79,
      "top": 40.28,
      "width": 84.08,
      "height": 15.98
    },
    "rows": [
      {
        "top": 40.79,
        "mid": 43.86,
        "base": 46.93,
        "left": 7.79,
        "width": 84.08
      },
      {
        "top": 49.74,
        "mid": 52.81,
        "base": 55.88,
        "left": 7.79,
        "width": 84.08
      }
    ],
    "practiceArea": {
      "left": 7.794,
      "top": 39.898,
      "width": 84.08,
      "height": 17.903,
      "aspect": 3.6214,
      "guides": [
        {
          "y": 0.05,
          "style": "solid"
        },
        {
          "y": 0.2214,
          "style": "dashed"
        },
        {
          "y": 0.3929,
          "style": "solid"
        },
        {
          "y": 0.55,
          "style": "solid"
        },
        {
          "y": 0.7214,
          "style": "dashed"
        },
        {
          "y": 0.8929,
          "style": "solid"
        }
      ]
    }
  },
  "shade1": {
    "TRUE": {
      "left": 13.6,
      "top": 67.14,
      "width": 13.27,
      "height": 10.23
    },
    "FALSE": {
      "left": 31.01,
      "top": 67.14,
      "width": 13.27,
      "height": 10.23
    }
  },
  "shade2": {
    "TRUE": {
      "left": 13.6,
      "top": 82.99,
      "width": 13.27,
      "height": 10.23
    },
    "FALSE": {
      "left": 31.01,
      "top": 82.99,
      "width": 13.27,
      "height": 10.23
    }
  },
  "draw": {
    "left": 51.08,
    "top": 67.01,
    "width": 39.8,
    "height": 26.73
  },
  "_practiceAreaNote": "practiceArea = the book box the SHADOW WRITING handwriting canvas is a scaled copy of (same aspect). guides[].y = fraction of the box height (rows: top/dashed mid/base x2). Canvas maps 1:1 (uniform scale) onto this box."
};
