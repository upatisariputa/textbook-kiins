// Word-level Levenshtein alignment. Formatting is checked separately.
export const tokens = text => (text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || []);
const normalized = word => word.toLowerCase().replace('’', "'");
export function alignWords(input, target) {
  const a = tokens(input);
  const b = tokens(target);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (normalized(a[i - 1]) === normalized(b[j - 1]) ? 0 : 1));
    }
  }
  const operations = [];
  let i = a.length;
  let j = b.length;
  while (i || j) {
    const same = i && j && normalized(a[i - 1]) === normalized(b[j - 1]);
    if (same && dp[i][j] === dp[i - 1][j - 1]) {
      operations.unshift({ type: 'same', from: a[--i], to: b[--j] });
    } else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) {
      operations.unshift({ type: 'replace', from: a[--i], to: b[--j] });
    } else if (j && dp[i][j] === dp[i][j - 1] + 1) {
      operations.unshift({ type: 'insert', from: '', to: b[--j] });
    } else {
      operations.unshift({ type: 'delete', from: a[--i], to: '' });
    }
  }
  return { distance: dp[a.length][b.length], operations };
}
export function correctAnswer(input, accepted) {
  if (!input.trim() || !tokens(input).length) return { empty: true, fixes: 0, operations: [] };
  const candidates = accepted.map(answer => ({ answer, ...alignWords(input, answer) }));
  candidates.sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  const capital = /^[a-z]/.test(input.trim());
  const period = !/\.$/.test(input.trim());
  return { ...best, capital, period, fixes: best.distance + Number(capital) + Number(period), empty: false };
}
