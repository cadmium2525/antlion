// Web Audio で合成する効果音（音声ファイル不要）
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
try {
  muted = localStorage.getItem('antlion.muted') === '1';
} catch (e) { /* ストレージ不可でも動かす */ }

export function unlockAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('antlion.muted', m ? '1' : '0'); } catch (e) { /* 無視 */ }
}

function ok() { return ctx && !muted; }

function tone({ type = 'sine', f0, f1, dur, gain = 0.2, delay = 0 }) {
  if (!ok()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur, f0, f1, q = 1, gain = 0.2, delay = 0, type = 'bandpass' }) {
  if (!ok()) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

let lastEat = 0;
export const sfx = {
  throw() { noise({ dur: 0.14, f0: 2600, f1: 700, q: 0.8, gain: 0.16 }); },
  hit() { tone({ type: 'triangle', f0: 230, f1: 110, dur: 0.08, gain: 0.12 }); },
  eat(ratio, combo) {
    if (!ok() || ctx.currentTime - lastEat < 0.05) return;
    lastEat = ctx.currentTime;
    const base = (520 / Math.sqrt(1 + Math.min(ratio, 4))) * Math.pow(2, Math.min(combo, 24) / 24);
    tone({ type: 'sine', f0: base, f1: base * 0.35, dur: 0.16, gain: 0.22 });
    noise({ dur: 0.08, f0: 900, f1: 300, gain: 0.07 });
  },
  clear() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.16, gain: 0.05, delay: i * 0.09 }));
  },
  timeup() {
    [440, 370, 311, 262].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.22, gain: 0.1, delay: i * 0.14 }));
  },
  rumble() { noise({ dur: 1.5, f0: 300, f1: 90, q: 0.5, gain: 0.25, type: 'lowpass' }); },
  emerge() {
    [523, 659, 784, 988, 1175, 1319, 1568].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.5, gain: 0.08, delay: i * 0.07 }));
  },
};
