import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { AUDIO, HOTSPOTS, INPUT_REGIONS, WORDS, SENTENCES, CONFIG } from '../data/content.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]); }
const javascript = files(root).filter(path => /\.(?:js|mjs)$/.test(path));
for (const path of javascript) {
  execFileSync(process.execPath, ['--check', path]);
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*)['"]([.][^'"]+)['"]/g)) assert.ok(existsSync(resolve(dirname(path), match[1])), `Missing module: ${path} → ${match[1]}`);
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(existsSync(resolve(root, match[1])), `Missing HTML resource: ${match[1]}`);
const rows = readFileSync(resolve(root, 'scripts/audio-manifest.tsv'), 'utf8').trimEnd().split('\n').slice(1).map(line => line.split('\t'));
assert.equal(rows.length, Object.keys(AUDIO).length);
assert.equal(new Set(rows.map(row => row[0])).size, rows.length);
for (const [id, voice, rate, text] of rows) assert.deepEqual([id, voice, Number(rate), text], [AUDIO[id].id, AUDIO[id].voice, AUDIO[id].rate, AUDIO[id].text]);
const source = JSON.parse(readFileSync(resolve(root, 'source/hotspots.json'), 'utf8'));
assert.deepEqual(INPUT_REGIONS, JSON.parse(readFileSync(resolve(root, 'source/input-regions.json'), 'utf8')));
for (const page of [6, 7]) {
  assert.deepEqual(HOTSPOTS[page], source[`page${page}`].regions);
  assert.deepEqual(readFileSync(resolve(root, `assets/img/page${page}.png`)), readFileSync(resolve(root, `source/page${page}.png`)));
}
for (const path of files(resolve(root, 'source/crops'))) assert.deepEqual(readFileSync(path), readFileSync(resolve(root, 'assets/img/crops', relative(resolve(root, 'source/crops'), path))));
for (const word of WORDS) assert.ok(existsSync(resolve(root, `assets/img/crops/${word.image}.png`)));
for (const sentence of SENTENCES) for (const image of [...sentence.tiles, sentence.image]) assert.ok(existsSync(resolve(root, `assets/img/crops/${image}.png`)));
for (const sentence of SENTENCES.slice(1)) assert.ok(existsSync(resolve(root, `assets/img/crops/${sentence.quizImage}.png`)), `Missing quiz crop: ${sentence.id}`);
assert.equal(CONFIG.paneRatio, 35);
console.log(`PASS: node --check on ${javascript.length} JS/module files; all HTML/module/image references; ${rows.length} matching audio entries; exact hotspot, input-region and copied-image fidelity.`);
