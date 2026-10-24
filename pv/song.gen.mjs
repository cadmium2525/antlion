// PV用BGM（128BPM・13小節=24.4秒）。9小節目の頭(36拍)が羽化の瞬間
import fs from 'fs';
const CH = { C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Em: ['E', 'G', 'B'] };
const bars = ['C', 'Am', 'F', 'G', 'Am', 'F', 'G', 'G', 'F', 'F', 'G', 'Em', 'C'];
const half = { 9: ['F', 'G'], 10: ['Em', 'Am'], 11: ['F', 'G'] }; // 2拍ずつのコード
const chordAt = (bar, beat) => (half[bar] ? half[bar][beat < 2 ? 0 : 1] : bars[bar]);
const N = (n, o) => n + o;

// マリンバのアルペジオ（序盤と結果パート）
const mar = [];
for (const bar of [0, 1, 2, 3, 4, 5, 9, 10, 11]) {
  for (let i = 0; i < 8; i++) {
    const c = CH[chordAt(bar, i / 2)];
    const seq = [N(c[0], 5), N(c[1], 5), N(c[2], 5), N(c[1], 5), N(c[0], 6), N(c[2], 5), N(c[1], 5), N(c[2], 5)];
    mar.push([bar * 4 + i * 0.5, seq[i], 0.45, i % 2 ? 0.55 : 0.75]);
  }
}
// ベース
const bass = [];
for (let bar = 0; bar < 12; bar++) {
  if (bar < 2 || bar === 8) continue;
  for (let i = 0; i < 8; i++) {
    const c = CH[chordAt(bar, i / 2)];
    bass.push([bar * 4 + i * 0.5, N(c[0], i % 4 === 3 ? 3 : 2), 0.4, i % 2 ? 0.6 : 0.85]);
  }
}
bass.push([48, 'C2', 4, 0.9]);
// 和音（パッド・ブラス）
const pad = [], brass = [];
for (let bar = 0; bar < 13; bar++) {
  const cs = half[bar] ? [[0, half[bar][0], 2], [2, half[bar][1], 2]] : [[0, bars[bar], 4]];
  for (const [b, c, d] of cs) {
    const notes = CH[c].map((n, k) => N(n, k === 0 ? 4 : 4));
    if (bar >= 2) pad.push([bar * 4 + b, notes, d, 0.5]);
    if (bar >= 4 && bar <= 7 || bar >= 9) for (const off of [0, 1.5]) if (off < d) brass.push([bar * 4 + b + off, notes, 0.35, 0.7]);
  }
}
pad.push([48, ['C4', 'E4', 'G4', 'C5'], 4, 0.6]);
brass.push([48, ['C4', 'E4', 'G4', 'C5'], 3, 0.9]);
// リード（恐竜パートと結果パート）
const lead = [];
const motif = [[0, 'E5', 0.5], [0.5, 'G5', 0.5], [1, 'A5', 1], [2, 'G5', 0.5], [2.5, 'E5', 0.5], [3, 'D5', 1]];
const motif2 = [[0, 'C5', 0.5], [0.5, 'D5', 0.5], [1, 'E5', 1], [2, 'G5', 1], [3, 'A5', 1]];
motif.forEach(([t, n, d]) => lead.push([24 + t, n, d, 0.75]));
motif2.forEach(([t, n, d]) => lead.push([28 + t, n, d, 0.8]));
[[0, 'A5', 1], [1, 'G5', 0.5], [1.5, 'A5', 0.5], [2, 'B5', 1], [3, 'D6', 1], [4, 'B5', 1], [5, 'G5', 1], [6, 'E5', 1], [7, 'A5', 1],
 [8, 'A5', 1], [9, 'G5', 0.5], [9.5, 'A5', 0.5], [10, 'B5', 1], [11, 'D6', 1], [12, 'C6', 4]].forEach(([t, n, d]) => lead.push([36 + t, n, d, 0.8]));
// 羽化パートのきらめき
const glock = [];
['C6', 'E6', 'G6', 'A6', 'C7', 'A6', 'G6', 'E6'].forEach((n, i) => glock.push([32 + i * 0.5, n, 0.5, 0.5]));

const drum = (bar, g) => ({ at: bar * 4, len: 4, grid: g });
const groove = { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', ohat: '' };
const light = { kick: 'x.......x.......', hat: 'x.x.x.x.x.x.x.x.' };
const dclips = [drum(0, light), drum(1, light)];
for (const b of [2, 3, 4, 5, 6, 9, 10, 11]) dclips.push(drum(b, groove));
dclips.push(drum(7, { kick: 'x...x...x...x...', snare: '..x.x.x.xxxxxxxx', hat: '..x...x...x...x.' }));
dclips.push(drum(9, { crash: 'X...............' }));
dclips.push(drum(4, { crash: 'X...............' }));
dclips.push(drum(12, { kick: 'X...............', crash: 'X...............' }));

const song = {
  name: 'アリジゴク巨大化ゲーム PV', bpm: 128, sig: [4, 4], bars: 13, key: 'C major',
  sends: { reverb: { size: 1.3, decay: 2.2, damp: 7000, predelay: 0.02 }, delay: { time: '1/8d', feedback: 0.3 } },
  master: { loudness: -14, ceiling: -1, fadeOut: 0.6 },
  tracks: [
    { id: 'drums', name: 'ドラム', type: 'drums', kit: 'house', volume: -1, clips: dclips },
    { id: 'bass', name: 'ベース', inst: 'synthbass', volume: -2, fx: [{ type: 'pump', amount: 0.5, rate: '1/4' }], clips: [{ at: 0, notes: bass }] },
    { id: 'mar', name: 'マリンバ', inst: 'marimba', volume: -1, pan: -0.15, sends: { reverb: 0.15, delay: 0.1 }, clips: [{ at: 0, notes: mar }] },
    { id: 'pad', name: 'パッド', inst: 'pad', volume: -9, sends: { reverb: 0.3 }, fx: [{ type: 'pump', amount: 0.4, rate: '1/4' }], clips: [{ at: 0, notes: pad }] },
    { id: 'brass', name: 'ブラス', inst: 'brass', volume: -6, pan: 0.15, sends: { reverb: 0.15 }, clips: [{ at: 0, notes: brass }] },
    { id: 'lead', name: 'リード', inst: 'supersaw', volume: -5, sends: { reverb: 0.2, delay: 0.15 }, clips: [{ at: 0, notes: lead }] },
    { id: 'glock', name: 'グロッケン', inst: 'glock', volume: -3, sends: { reverb: 0.4, delay: 0.2 }, clips: [{ at: 0, notes: glock }] },
    { id: 'fx', name: '効果音', type: 'sfx', volume: -2, clips: [
      { at: 28, sfx: { preset: 'riser', length: 1.0 }, gain: -6 },
      { at: 36, sfx: { preset: 'impact', punch: 0.8 }, gain: -2 },
      { at: 36, sfx: { preset: 'sparkle' }, gain: -6 },
      { at: 48, sfx: { preset: 'boom' }, gain: -4 },
      { at: 15.5, sfx: { preset: 'whoosh' }, gain: -8 },
      { at: 31.5, sfx: { preset: 'whoosh' }, gain: -8 },
    ] },
  ],
};
fs.writeFileSync(new URL('./song.json', import.meta.url), JSON.stringify(song));
