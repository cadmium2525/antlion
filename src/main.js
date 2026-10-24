import * as THREE from 'three';
import { createWorld, PIT_DEPTH } from './world.js';
import { PREY_TYPES, createPrey } from './prey.js';
import { buildAntlion, buildLacewing } from './creatures.js';
import { drawCard, wingspanCm, wingFactor, rankOf, rankIndex, STYLES, formatLen } from './card.js';
import { sfx, unlockAudio, isMuted, setMuted } from './audio.js';

// ---------- 調整用の数値（仮） ----------
const S0 = 1.5; // 初期体長（アリ=1）
const PIT_K = 2.1; // 巣穴の半径 / 体長
const SPLASH_K = 0.75; // 砂の着弾半径 / 体長
const GROW_K = 0.022; // 成長率
const SPEED = 1.5; // 獲物の移動速度の倍率
const MAX_PREY = 42;
const UNIT_MM = 4; // 体長1あたりのmm
const ANTLION_VIS = 1.6; // 見た目の大きさ（巣穴の中で埋もれないように）
const COMBO_TIME = 2.2;
const ROUNDS = [
  { name: '砂地のはじまり', sub: 'アリ・ダンゴムシ・クモ・バッタ', target: 6, time: 40 },
  { name: '草むらの住人', sub: 'カエル・トカゲ・ネズミ', target: 30, time: 40 },
  { name: '里山のけものたち', sub: 'ウサギ・ネコ・タヌキ・イヌ', target: 130, time: 40 },
  { name: '牧場とサバンナ', sub: 'ブタ・ウシ・ウマ・ゾウ', target: 550, time: 40 },
  { name: '太古の大地', sub: '恐竜たち', time: 45, final: true }, // 最終ラウンドは時間いっぱいまで
];

// 自分より大きい獲物ほど多くの砂が必要
function hpFor(ratio) {
  return ratio <= 1 ? 1 : Math.min(30, Math.ceil(1.5 * Math.pow(ratio, 1.35)));
}

// ---------- three.js の準備 ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const HAZE = new THREE.Color(0xeadcb6);
const SKY = new THREE.Color(0x9fd3ec);
scene.background = HAZE.clone();
scene.fog = new THREE.Fog(HAZE.getHex(), 10, 100);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
const world = createWorld(scene);
const antlion = buildAntlion();
scene.add(antlion.root);
const lacewing = buildLacewing();
lacewing.root.visible = false;
scene.add(lacewing.root);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- 砂の粒子 ----------
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}
const PCOUNT = 1200;
const pPos = new Float32Array(PCOUNT * 3).fill(-1e7);
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: 0xd2a865, size: 1, map: dotTexture(), alphaTest: 0.5 });
const points = new THREE.Points(pGeo, pMat);
points.frustumCulled = false;
scene.add(points);
const parts = Array.from({ length: PCOUNT }, () => ({ alive: false }));
let pCursor = 0;
function emit(o) {
  const p = parts[pCursor];
  pCursor = (pCursor + 1) % PCOUNT;
  Object.assign(p, o, { alive: true, t: 0 });
}
function puff(x, y, z, n, spread, up) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
    emit({ kind: 'ball', x, y, z, vx: Math.cos(a) * r, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * r, g: up * 3, dur: 0.5 + Math.random() * 0.3 });
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PCOUNT; i++) {
    const p = parts[i];
    if (!p.alive) continue;
    p.t += dt;
    if (p.t >= p.dur) {
      p.alive = false;
      pPos[i * 3 + 1] = -1e7;
      continue;
    }
    if (p.kind === 'arc') {
      const k = p.t / p.dur;
      pPos[i * 3] = p.fx + (p.tx - p.fx) * k;
      pPos[i * 3 + 1] = p.fy + (p.ty - p.fy) * k + Math.sin(k * Math.PI) * p.h;
      pPos[i * 3 + 2] = p.fz + (p.tz - p.fz) * k;
    } else {
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      pPos[i * 3] = p.x;
      pPos[i * 3 + 1] = p.y;
      pPos[i * 3 + 2] = p.z;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
}

// ---------- 着弾リング ----------
const ringGeo = new THREE.RingGeometry(0.82, 1, 40);
ringGeo.rotateX(-Math.PI / 2);
const rings = Array.from({ length: 14 }, () => {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff3d6, transparent: true, depthWrite: false }));
  m.visible = false;
  scene.add(m);
  return { m, t: 1 };
});
let ringCursor = 0;
function ring(x, y, z, R) {
  const r = rings[ringCursor];
  ringCursor = (ringCursor + 1) % rings.length;
  r.t = 0;
  r.R = R;
  r.m.position.set(x, y + R * 0.05, z);
  r.m.visible = true;
}
function updateRings(dt) {
  for (const r of rings) {
    if (!r.m.visible) continue;
    r.t += dt / 0.35;
    if (r.t >= 1) {
      r.m.visible = false;
      continue;
    }
    r.m.scale.setScalar(r.R * (0.35 + 0.65 * Math.sqrt(r.t)));
    r.m.material.opacity = 0.85 * (1 - r.t);
  }
}

// 影
const shadowGeo = new THREE.CircleGeometry(0.5, 16);
shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x5a4020, transparent: true, opacity: 0.22, depthWrite: false });

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), round: $('roundLabel'), score: $('scoreVal'), timeFill: $('timeFill'), timeText: $('timeText'),
  timeBar: document.querySelector('.bar.time'), size: $('sizeText'), goal: $('goalText'), growFill: $('growFill'),
  combo: $('combo'), fx: $('fx'), banner: $('banner'), title: $('titleScreen'), result: $('resultScreen'),
  hi: $('hiText'), cardImg: $('cardImg'), resultTitle: $('resultTitle'), mute: $('muteBtn'),
};

function getBest() {
  try { return Number(localStorage.getItem('antlion.best')) || 0; } catch (e) { return 0; }
}
function setBest(v) {
  try { localStorage.setItem('antlion.best', String(v)); } catch (e) { /* 無視 */ }
}
function showBest() {
  const b = getBest();
  ui.hi.textContent = b ? `ハイスコア ${b.toLocaleString('ja-JP')}` : '';
}
showBest();

let bannerTimer = 0;
function banner(html, dur = 1.6) {
  ui.banner.innerHTML = html;
  ui.banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => ui.banner.classList.remove('show'), dur * 1000);
}

const tmpV = new THREE.Vector3();
function toScreen(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  return { x: ((tmpV.x + 1) / 2) * window.innerWidth, y: ((1 - tmpV.y) / 2) * window.innerHeight, ok: tmpV.z < 1 };
}
function popup(text, x, y, z, big) {
  const s = toScreen(x, y, z);
  if (!s.ok) return;
  const el = document.createElement('div');
  el.className = big ? 'pop big' : 'pop';
  el.textContent = text;
  el.style.left = `${s.x + (Math.random() - 0.5) * 50}px`;
  el.style.top = `${s.y + (Math.random() - 0.5) * 30}px`;
  el.addEventListener('animationend', () => el.remove());
  ui.fx.appendChild(el);
}

// 絵文字だと端末によって中心がずれるので SVG で描く
const SPEAKER = '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>';
const WAVES = '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
const CROSS = '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
function updateMuteIcon() {
  ui.mute.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${SPEAKER}${isMuted() ? CROSS : WAVES}</svg>`;
}
updateMuteIcon();
ui.mute.addEventListener('click', () => {
  unlockAudio();
  setMuted(!isMuted());
  updateMuteIcon();
});

// ---------- ゲーム状態 ----------
const game = {
  state: 'title', // title | intro | play | clear | timeup | emerge | result
  round: 0, time: 0, stateT: 0,
  s: S0, sDisp: S0, roundStartS: S0,
  score: 0, combo: 0, maxCombo: 0, lastEat: -10, eaten: 0, biggest: null,
  spawnT: 0, viewC: { x: 0, z: 0 }, viewHalf: 10, shake: 0, clock: 0, cleared: false, card: null,
};
let prey = [];
const impacts = [];

function pitR() { return game.sDisp * PIT_K; }
function antlionBase() {
  return { x: 0, y: -PIT_DEPTH * pitR() - 0.12 * game.sDisp * ANTLION_VIS, z: -0.15 * game.sDisp * ANTLION_VIS };
}
function mouthPos() {
  const b = antlionBase(), s = game.sDisp * ANTLION_VIS;
  return { x: 0, y: b.y + 0.42 * s, z: b.z + 0.85 * s };
}

// ---------- 獲物 ----------
function spawnTick(dt) {
  game.spawnT -= dt;
  if (game.spawnT > 0) return;
  const title = game.state === 'title';
  const sparse = !title && prey.length < 8;
  game.spawnT = (title ? 1.3 : sparse ? 0.15 : 0.45) * (0.7 + Math.random() * 0.6);
  if (prey.length >= MAX_PREY) return;
  const r = title ? 0 : game.round;
  const s = game.s;
  const cands = [];
  let total = 0;
  for (const t of PREY_TYPES) {
    if (t.round - 1 > r) continue;
    const ratio = t.size / s;
    if (ratio < 0.06 || ratio > 7) continue;
    const w = t.round - 1 === r ? 4 : 1.4;
    cands.push([t, w]);
    total += w;
  }
  if (!cands.length) return;
  let pick = Math.random() * total, type = cands[0][0];
  for (const [t, w] of cands) {
    pick -= w;
    if (pick <= 0) { type = t; break; }
  }
  const ratio = type.size / s;
  const [g0, g1] = ratio < 0.35 ? [5, 12] : type.group;
  const n = Math.min(MAX_PREY - prey.length, g0 + Math.floor(Math.random() * (g1 - g0 + 1)));

  // 画面の縁のすぐ外から出して、画面内を横切らせる
  const v = Math.random() * 2 - 1, u = Math.floor(Math.random() * 4);
  const e = groundAtNdc(u < 2 ? (u ? 1 : -1) : v, u < 2 ? v : (u === 2 ? 1 : -1));
  if (!e) return;
  const k = s / game.sDisp, c = game.viewC;
  let ox = e.x - c.x, oz = e.z - c.z;
  const ol = Math.hypot(ox, oz) || 1;
  const sx = e.x * k + (ox / ol) * type.size * 0.9, sz = e.z * k + (oz / ol) * type.size * 0.9;
  const ta = Math.random() * Math.PI * 2;
  const tr = Math.min(s * PIT_K * (0.3 + Math.random() * 2.2), game.viewHalf * k * (0.15 + Math.random() * 0.7));
  let dx = Math.cos(ta) * tr - sx, dz = Math.sin(ta) * tr - sz;
  const dl = Math.hypot(dx, dz);
  dx /= dl;
  dz /= dl;
  const spread = type.size * 1.6 * Math.sqrt(n);
  for (let i = 0; i < n; i++) {
    const side = (Math.random() - 0.5) * spread, back = i * type.size * 0.9 * Math.random();
    addPrey(type, sx - dz * side - dx * back, sz + dx * side - dz * back, dx, dz);
  }
}

function addPrey(type, x, z, dx, dz) {
  const m = createPrey(type);
  const jitter = (Math.random() - 0.5) * 0.2;
  const c = Math.cos(jitter), sn = Math.sin(jitter);
  const ndx = dx * c - dz * sn, ndz = dx * sn + dz * c;
  m.obj.rotation.y = Math.atan2(ndx, ndz);
  scene.add(m.obj);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.scale.set(type.size * Math.max(m.width, 0.45) * 1.1, 1, type.size * 0.9);
  shadow.rotation.y = m.obj.rotation.y;
  scene.add(shadow);
  prey.push({
    type, size: type.size, ...m, shadow, x, z, dx: ndx, dz: ndz,
    state: 'walk', hits: 0, lastHit: 0, recover: 0, bump: 0, walkT: Math.random() * 10, t: 0, bar: null,
  });
}

function removePrey(p) {
  p.dead = true;
  scene.remove(p.obj);
  scene.remove(p.shadow);
  if (p.bar) p.bar.remove();
}

function startFall(p) {
  p.state = 'fall';
  p.t = 0;
  p.fx = p.x;
  p.fz = p.z;
  p.fy = p.obj.position.y;
  p.dur = 0.45 + Math.min(0.45, Math.hypot(p.x, p.z) / (pitR() * 5));
  p.shadow.visible = false;
  if (p.bar) { p.bar.remove(); p.bar = null; }
}

function eat(p) {
  removePrey(p);
  antlion.chomp();
  const m = mouthPos();
  puff(m.x, m.y, m.z, 8, game.sDisp * 1.5, game.sDisp * 2);
  if (game.state === 'title' || game.state === 'emerge' || game.state === 'result') return;

  const ratio = p.size / game.s;
  game.s *= Math.exp(GROW_K * Math.min(ratio, 2.5));
  game.combo = game.clock - game.lastEat < COMBO_TIME ? game.combo + 1 : 1;
  game.lastEat = game.clock;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  const mult = 1 + Math.min(game.combo - 1, 40) * 0.05;
  const pts = Math.round(p.size * 10 * mult);
  game.score += pts;
  game.eaten++;
  if (!game.biggest || p.size > game.biggest.size) game.biggest = p.type;
  const big = ratio > 1.2;
  popup(big ? `${p.type.name}！ +${pts.toLocaleString('ja-JP')}` : `+${pts.toLocaleString('ja-JP')}`, p.fx, p.fy + p.height * p.size, p.fz, big);
  if (big) game.shake = Math.min(1, game.shake + 0.25 * ratio);
  sfx.eat(ratio, game.combo);
}

function updatePrey(p, dt) {
  const sd = game.sDisp, R = pitR();
  if (p.state === 'walk') {
    const d = Math.hypot(p.x, p.z);
    const hp = hpFor(p.size / game.s);
    if (p.hits > 0 && game.clock - p.lastHit > 1.2) {
      p.recover += dt;
      if (p.recover > 0.45) {
        p.hits--;
        p.recover = 0;
      }
    }
    if (p.hits > 0 && p.hits >= hp) return startFall(p);
    const prog = Math.min(1, p.hits / hp);
    const inPit = d < R;
    const slow = (1 - 0.8 * prog) * (inPit ? 0.55 : 1);
    const sp = p.type.speed * SPEED * slow;
    p.x += p.dx * sp * p.size * dt;
    p.z += p.dz * sp * p.size * dt;
    p.walkT += dt * sp * 7;
    if (inPit && p.size <= game.s && d < R * 0.78 && game.state !== 'emerge') return startFall(p);

    const ground = world.heightAt(p.x, p.z);
    let y = ground - prog * 0.35 * p.height * p.size;
    if (p.type.hop) y += Math.abs(Math.sin(p.walkT * 0.5)) * p.size * 0.35 * (1 - prog);
    p.bump = Math.max(0, p.bump - dt * 5);
    p.obj.position.set(p.x, y, p.z);
    const sc = p.size * (1 + 0.12 * p.bump);
    p.obj.scale.set(sc, p.size * (1 - 0.12 * p.bump), sc);
    const legAmp = p.type.hop ? 0.25 : 1;
    for (const l of p.legs) l.piv.rotation.x = Math.sin(p.walkT + l.phase) * l.amp * legAmp;
    for (const t of p.tails) t.rotation.y = Math.sin(p.walkT * 0.5) * 0.25;
    p.shadow.visible = !inPit;
    p.shadow.position.set(p.x, ground + sd * 0.02, p.z);

    // 砂をかけられている大きな獲物には残りゲージ
    if (p.hits > 0 && hp > 1) {
      if (!p.bar) {
        p.bar = document.createElement('div');
        p.bar.className = 'hp';
        p.bar.appendChild(document.createElement('div'));
        ui.fx.appendChild(p.bar);
      }
      const s = toScreen(p.x, y + p.height * p.size * 1.15, p.z);
      p.bar.style.left = `${s.x}px`;
      p.bar.style.top = `${s.y}px`;
      p.bar.style.width = `${Math.min(120, 34 + hp * 4)}px`;
      p.bar.firstChild.style.width = `${(1 - prog) * 100}%`;
    } else if (p.bar) {
      p.bar.remove();
      p.bar = null;
    }

    // 画面の外へ歩き去ったら消す
    tmpV.set(p.x, y, p.z).project(camera);
    const margin = 1.15 + p.size / game.viewHalf;
    const away = (p.x - game.viewC.x) * p.dx + (p.z - game.viewC.z) * p.dz > 0;
    if (away && (Math.abs(tmpV.x) > margin || Math.abs(tmpV.y) > margin)) removePrey(p);
  } else if (p.state === 'fall') {
    p.t += dt;
    const k = Math.min(1, p.t / p.dur);
    const e = k * k;
    const m = mouthPos();
    p.obj.position.set(
      p.fx + (m.x - p.fx) * e,
      p.fy + (m.y - p.fy) * e + Math.sin(k * Math.PI) * p.size * 0.3,
      p.fz + (m.z - p.fz) * e,
    );
    p.obj.rotation.y += dt * 6;
    const shrink = 1 - Math.max(0, (k - 0.6) / 0.4) * 0.95;
    p.obj.scale.setScalar(p.size * shrink);
    if (Math.random() < 0.5) emit({ kind: 'ball', x: p.obj.position.x, y: p.obj.position.y, z: p.obj.position.z, vx: 0, vy: sd, vz: 0, g: sd * 4, dur: 0.4 });
    if (k >= 1) eat(p);
  }
}

// ---------- 砂をかける ----------
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
function screenToGround(cx, cy) {
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
}

let lastThrow = -1;
function throwSandAt(x, z) {
  if (game.clock - lastThrow < 0.06) return;
  lastThrow = game.clock;
  const sd = game.sDisp;
  const y = world.heightAt(x, z);
  const m = mouthPos();
  const src = { x: m.x, y: m.y + sd * 0.2, z: m.z - sd * 0.3 };
  const dist = Math.hypot(x - src.x, z - src.z);
  const dur = 0.16 + Math.min(0.12, dist / (sd * 60));
  const R = sd * SPLASH_K;
  for (let i = 0; i < 18; i++) {
    emit({
      kind: 'arc', fx: src.x, fy: src.y, fz: src.z,
      tx: x + (Math.random() - 0.5) * R, ty: y, tz: z + (Math.random() - 0.5) * R,
      h: dist * 0.25 * (0.7 + Math.random() * 0.6), dur: dur * (0.85 + Math.random() * 0.3),
    });
  }
  impacts.push({ t: dur, x, y, z, R });
  antlion.flick();
  sfx.throw();
}

function impact(im) {
  ring(im.x, im.y, im.z, im.R);
  puff(im.x, im.y, im.z, 12, im.R * 1.5, game.sDisp * 1.5);
  let hit = false;
  for (const p of prey) {
    if (p.dead || p.state !== 'walk') continue;
    if (Math.hypot(p.x - im.x, p.z - im.z) > im.R + p.size * 0.45) continue;
    p.hits++;
    p.lastHit = game.clock;
    p.recover = 0;
    p.bump = 1;
    if (p.hits >= hpFor(p.size / game.s)) startFall(p);
    else hit = true;
  }
  if (hit) sfx.hit();
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (game.state !== 'play') return;
  const pt = screenToGround(e.clientX, e.clientY);
  if (pt) throwSandAt(pt.x, pt.z);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- 進行 ----------
function setState(s) {
  game.state = s;
  game.stateT = 0;
}

function clearPrey() {
  for (const p of prey) removePrey(p);
  prey = [];
  impacts.length = 0;
}

function startGame() {
  unlockAudio();
  clearPrey();
  Object.assign(game, {
    round: 0, s: S0, sDisp: S0, score: 0, combo: 0, maxCombo: 0, lastEat: -10, eaten: 0, biggest: null,
    spawnT: 0, shake: 0, cleared: false, card: null,
  });
  antlion.root.visible = true;
  lacewing.root.visible = false;
  scene.background.copy(HAZE);
  ui.title.classList.add('hidden');
  ui.result.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  startRound(0);
}

function startRound(i) {
  game.round = i;
  game.roundStartS = game.s;
  game.time = ROUNDS[i].time;
  setState('intro');
  const r = ROUNDS[i];
  const goal = r.final ? 'FINAL：時間いっぱい食べて大きくなれ！' : `目標：体長 ${formatLen(r.target * UNIT_MM)}`;
  banner(`<div class="b1">ROUND ${i + 1}</div><div class="b2">${r.name}</div><div class="b3">${goal}</div>`, 1.8);
}

function roundClear() {
  const r = ROUNDS[game.round];
  const bonus = Math.ceil(game.time) * Math.round(r.target * 2);
  game.score += bonus;
  setState('clear');
  sfx.clear();
  banner(`<div class="b1">CLEAR!</div><div class="b2">タイムボーナス +${bonus.toLocaleString('ja-JP')}</div>`, 1.6);
}

function timeUp() {
  setState('timeup');
  if (ROUNDS[game.round].final) {
    sfx.clear();
    banner('<div class="b1">FINISH!</div><div class="b2">いよいよ羽化のとき…</div>', 1.8);
  } else {
    sfx.timeup();
    banner('<div class="b1">タイムアップ</div><div class="b2">羽化のときが来た…</div>', 1.8);
  }
}

function startEmerge(cleared) {
  game.cleared = cleared;
  game.wing = 2.4 * wingFactor(game.score, game.s * UNIT_MM);
  lacewing.setWingColor(...STYLES[rankIndex(wingspanCm(game.score, game.s * UNIT_MM))].wing3d);
  setState('emerge');
  ui.hud.classList.add('hidden');
  ui.combo.classList.remove('show');
  for (const p of prey) {
    if (p.dead) continue;
    puff(p.x, p.obj.position.y, p.z, 4, p.size, p.size);
    removePrey(p);
  }
  prey = [];
  sfx.rumble();
  if (cleared) banner('<div class="b1">羽化！</div>', 1.4);
}

function showResult() {
  game.state = 'result';
  const ws = wingspanCm(game.score, game.s * UNIT_MM);
  const rank = rankOf(ws);
  const data = {
    score: game.score, ws, rank, eaten: game.eaten, maxCombo: game.maxCombo, bodyMm: game.s * UNIT_MM,
    biggest: game.biggest ? game.biggest.name : 'なし', round: game.round + 1, cleared: game.cleared,
  };
  game.result = data;
  game.card = drawCard(data);
  ui.cardImg.src = game.card.toDataURL('image/png');
  const best = getBest();
  ui.resultTitle.textContent = game.score > best ? 'ハイスコア更新！' : game.cleared ? '羽化成功！' : '羽化しました';
  if (game.score > best) setBest(game.score);
  showBest();
  ui.result.classList.remove('hidden');
}

function shareText() {
  const d = game.result;
  return `アリジゴクが羽化して、翼開長${formatLen(d.ws * 10)}の「${d.rank}」になった！ スコア${d.score.toLocaleString('ja-JP')}`;
}
function pageUrl() {
  return location.href.split('#')[0].split('?')[0];
}

$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', startGame);
$('postBtn').addEventListener('click', () => {
  const u = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(pageUrl())}&hashtags=${encodeURIComponent('アリジゴク巨大化ゲーム')}`;
  window.open(u, '_blank', 'noopener');
});
$('saveBtn').addEventListener('click', async () => {
  if (!game.card) return;
  const blob = await new Promise((r) => game.card.toBlob(r, 'image/png'));
  const file = new File([blob], 'antlion-result.png', { type: 'image/png' });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: shareText() });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'antlion-result.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

// ---------- カメラ ----------
const EL = THREE.MathUtils.degToRad(57);
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const wantPos = new THREE.Vector3();
const wantLook = new THREE.Vector3();
function camDist(sd) {
  const asp = window.innerWidth / window.innerHeight;
  return sd * 8.5 * (asp < 1 ? Math.pow(1 / asp, 0.55) : 1);
}

function groundAtNdc(x, y) {
  ndc.set(x, y);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
}

function updateView() {
  // 画面中央の地面の位置と、そこから画面の縁までの最短距離
  const c = groundAtNdc(0, 0);
  if (!c) return;
  game.viewC = c;
  let min = Infinity;
  for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const p = groundAtNdc(x, y);
    if (p) min = Math.min(min, Math.hypot(p.x - c.x, p.z - c.z));
  }
  game.viewHalf = min;
}

function updateCamera(dt) {
  const sd = game.sDisp;
  const dist = camDist(sd);
  let follow = 1;
  if (game.state === 'emerge' || game.state === 'result') {
    const t = game.stateT;
    follow = 1 - Math.exp(-dt * 2.5);
    if (t < 1.6 || !lacewing.root.visible) {
      wantPos.set(0, Math.sin(EL) * dist * 0.6, Math.cos(EL) * dist * 0.6);
      wantLook.set(0, -PIT_DEPTH * pitR(), 0);
    } else {
      const L = lacewing.root.position;
      const k = (dist / (sd * 8.5)) * (game.wing / 1.6);
      wantPos.set(0, L.y + sd * 4.5 * k, L.z + sd * 5.5 * k);
      wantLook.set(0, L.y, L.z);
    }
  } else {
    wantPos.set(0, Math.sin(EL) * dist, Math.cos(EL) * dist);
    wantLook.set(0, 0, -sd * 0.6);
  }
  camPos.lerp(wantPos, follow);
  camLook.lerp(wantLook, follow);
  game.shake = Math.max(0, game.shake - dt * 2.5);
  const sh = game.shake * sd * 0.25;
  camera.position.set(camPos.x + (Math.random() - 0.5) * sh, camPos.y + (Math.random() - 0.5) * sh, camPos.z);
  camera.lookAt(camLook);
  camera.near = dist * 0.01;
  camera.far = dist * 14;
  camera.updateProjectionMatrix();
  scene.fog.near = dist * 1.1;
  scene.fog.far = dist * 3.4;
}

// ---------- HUD ----------
let lastHud = '';
function updateHud() {
  if (game.state === 'title' || game.state === 'emerge' || game.state === 'result') return;
  const r = ROUNDS[game.round];
  const prog = r.final ? 1 : Math.min(1, Math.log(game.s / game.roundStartS) / Math.log(r.target / game.roundStartS));
  const key = [game.round, game.score, Math.ceil(game.time), game.s.toFixed(2)].join('|');
  if (key !== lastHud) {
    lastHud = key;
    ui.round.textContent = `ROUND ${game.round + 1}/${ROUNDS.length}`;
    ui.score.textContent = game.score.toLocaleString('ja-JP');
    ui.timeText.textContent = Math.ceil(game.time);
    ui.size.textContent = `体長 ${formatLen(game.s * UNIT_MM)}`;
    ui.goal.textContent = r.final ? 'FINAL：食べ放題！' : `目標 ${formatLen(r.target * UNIT_MM)}`;
    ui.growFill.style.width = `${Math.max(0, prog) * 100}%`;
  }
  ui.timeFill.style.width = `${(game.time / r.time) * 100}%`;
  ui.timeBar.classList.toggle('low', game.time < 10);
  const comboOn = game.combo >= 3 && game.clock - game.lastEat < COMBO_TIME;
  ui.combo.classList.toggle('show', comboOn);
  if (comboOn) {
    const mult = 1 + Math.min(game.combo - 1, 40) * 0.05;
    ui.combo.innerHTML = `${game.combo} COMBO<small>スコア ×${mult.toFixed(2)}</small>`;
  }
}

// ---------- メインループ ----------
function update(dt) {
  game.clock += dt;
  game.stateT += dt;
  game.sDisp += (game.s - game.sDisp) * Math.min(1, dt * 3);
  const sd = game.sDisp;

  switch (game.state) {
    case 'intro':
      if (game.stateT > 1.6) setState('play');
      break;
    case 'play':
      game.time = Math.max(0, game.time - dt);
      if (!ROUNDS[game.round].final && game.s >= ROUNDS[game.round].target) roundClear();
      else if (game.time <= 0) timeUp();
      break;
    case 'clear':
      if (game.stateT > 1.6) {
        if (game.round + 1 < ROUNDS.length) startRound(game.round + 1);
        else startEmerge(true);
      }
      break;
    case 'timeup':
      if (game.stateT > 1.8) startEmerge(!!ROUNDS[game.round].final);
      break;
  }

  world.update(pitR(), sd);
  const base = antlionBase();
  antlion.root.scale.setScalar(sd * ANTLION_VIS);
  antlion.root.position.set(base.x, base.y, base.z);
  antlion.update(dt);

  if (game.state === 'emerge' || game.state === 'result') updateEmerge(dt);
  else {
    updateView();
    spawnTick(dt);
  }

  for (let i = impacts.length - 1; i >= 0; i--) {
    impacts[i].t -= dt;
    if (impacts[i].t <= 0) {
      impact(impacts[i]);
      impacts.splice(i, 1);
    }
  }
  for (const p of prey) if (!p.dead) updatePrey(p, dt);
  prey = prey.filter((p) => !p.dead);

  pMat.size = sd * 0.16;
  updateParticles(dt);
  updateRings(dt);
  updateCamera(dt);
  updateHud();
}

function updateEmerge(dt) {
  const t = game.stateT, sd = game.sDisp;
  const m = mouthPos();
  if (game.state === 'emerge' && t < 1.6) {
    // 砂の中で羽化の準備
    const k = t / 1.6;
    antlion.root.position.x += Math.sin(t * 70) * 0.05 * sd * k;
    antlion.root.position.y -= k * k * 0.6 * sd;
    if (Math.random() < 0.8) {
      const a = Math.random() * Math.PI * 2, r = pitR() * (0.6 + Math.random() * 0.5);
      emit({ kind: 'arc', fx: Math.cos(a) * r, fy: world.heightAt(Math.cos(a) * r, Math.sin(a) * r), fz: Math.sin(a) * r, tx: m.x, ty: m.y - sd * 0.3, tz: m.z, h: sd * 0.5, dur: 0.6 });
    }
  } else if (!lacewing.root.visible) {
    antlion.root.visible = false;
    lacewing.root.visible = true;
    lacewing.root.scale.setScalar(sd * game.wing);
    lacewing.root.position.set(0, m.y, 0);
    puff(0, m.y, 0, 60, sd * 4, sd * 5);
    game.shake = 0.6;
    sfx.emerge();
  }
  if (lacewing.root.visible) {
    const ft = Math.max(0, t - 1.6);
    const L = lacewing.root.position;
    if (game.state === 'emerge') {
      L.y = m.y + Math.pow(ft, 1.3) * sd * 2.2;
      L.x = Math.sin(ft * 1.5) * sd * 0.6;
      lacewing.root.rotation.set(-0.35 - Math.sin(ft * 3) * 0.05, Math.sin(ft * 0.8) * 0.3, Math.sin(ft * 1.5) * 0.15);
      lacewing.update(dt, 22);
      if (ft > 3.4) showResult();
    } else {
      L.y += Math.sin(game.clock * 2) * sd * 0.01;
      lacewing.root.rotation.y += dt * 0.25;
      lacewing.update(dt, 12);
    }
    const k = Math.min(1, ft / 2);
    scene.background.lerpColors(HAZE, SKY, k);
  }
}

let last = performance.now();
camPos.set(0, Math.sin(EL) * camDist(S0), Math.cos(EL) * camDist(S0));
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 動作確認用
window.__antlion = { game, get prey() { return prey; }, throwSandAt, ROUNDS, camera };
