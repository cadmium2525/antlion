import * as THREE from 'three';

// 共有ジオメトリとマテリアル（ローポリ表現）
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ico: new THREE.IcosahedronGeometry(0.5, 1),
  ico0: new THREE.IcosahedronGeometry(0.5, 0),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
};
const mats = new Map();
export function mat(color) {
  if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return mats.get(color);
}

const PI = Math.PI;

class Builder {
  constructor() {
    this.root = new THREE.Group();
    this.legs = [];
    this.tails = [];
  }
  add(geo, color, s, p, r, parent = this.root) {
    const m = new THREE.Mesh(geo, mat(color));
    m.scale.set(s[0], s[1], s[2]);
    m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    parent.add(m);
    return m;
  }
  pivot(p, r, parent = this.root) {
    const g = new THREE.Group();
    g.position.set(p[0], p[1], p[2]);
    if (r) g.rotation.set(r[0], r[1], r[2]);
    parent.add(g);
    return g;
  }
  // 腰を支点に下へ伸びる脚。splay は外側への開き、yaw は前後への向き
  leg(p, len, w, color, phase, splay = 0, amp = 0.5, yaw = 0) {
    const piv = this.pivot(p, [0, yaw, splay]);
    this.add(GEO.box, color, [w, len, w], [0, -len / 2, 0], null, piv);
    this.legs.push({ piv, phase, amp });
    return piv;
  }
  tail(p, ang, len, w, color, cone = false) {
    const piv = this.pivot(p, [ang, 0, 0]);
    if (cone) this.add(GEO.cone, color, [w, len, w * 0.8], [0, 0, -len / 2], [-PI / 2, 0, 0], piv);
    else this.add(GEO.box, color, [w, w, len], [0, 0, -len / 2], null, piv);
    this.tails.push(piv);
    return piv;
  }
}

function insectLegs(b, color, zs, y, len, w, splay, xoff, amp = 0.6) {
  zs.forEach((z, i) => {
    const ph = i % 2 ? PI : 0;
    b.leg([xoff, y, z], len, w, color, ph, splay, amp);
    b.leg([-xoff, y, z], len, w, color, ph + PI, -splay, amp);
  });
}

function eyes(b, x, y, z, r, parent) {
  for (const s of [1, -1]) b.add(GEO.ico0, 0x141414, [r, r, r], [s * x, y, z], null, parent);
}

// ---------- 虫 ----------
function ant(b) {
  const c = 0x2b1d14;
  b.add(GEO.ico, c, [0.3, 0.26, 0.32], [0, 0.32, 0.62]);
  b.add(GEO.ico, c, [0.2, 0.18, 0.42], [0, 0.3, 0.25]);
  b.add(GEO.ico, c, [0.14, 0.14, 0.14], [0, 0.3, -0.02]);
  b.add(GEO.ico, 0x3a281b, [0.42, 0.38, 0.62], [0, 0.36, -0.38]);
  for (const s of [1, -1]) b.add(GEO.box, c, [0.025, 0.025, 0.32], [s * 0.08, 0.46, 0.85], [-0.7, s * 0.35, 0]);
  insectLegs(b, c, [0.36, 0.25, 0.14], 0.3, 0.42, 0.035, 1.0, 0.07);
}

function pillbug(b) {
  const c1 = 0x5b6670, c2 = 0x48525b;
  for (let i = 0; i < 6; i++) {
    const z = -0.42 + i * 0.17;
    b.add(GEO.ico, i % 2 ? c1 : c2, [0.66 - Math.abs(z) * 0.4, 0.38 - Math.abs(z) * 0.22, 0.24], [0, 0.2, z]);
  }
  b.add(GEO.ico, 0x3a4249, [0.32, 0.18, 0.2], [0, 0.14, 0.55]);
  for (const s of [1, -1]) b.add(GEO.box, 0x3a4249, [0.02, 0.02, 0.25], [s * 0.1, 0.18, 0.72], [-0.2, s * 0.5, 0]);
  insectLegs(b, 0x3a4249, [0.3, 0.1, -0.1, -0.3], 0.12, 0.16, 0.03, 1.2, 0.22, 0.8);
}

function spider(b) {
  const c = 0x3b2b20;
  b.add(GEO.ico, c, [0.4, 0.26, 0.42], [0, 0.35, 0.22]);
  b.add(GEO.ico, 0x4a3626, [0.55, 0.48, 0.62], [0, 0.45, -0.3]);
  b.add(GEO.ico0, 0xc7a15a, [0.18, 0.06, 0.3], [0, 0.69, -0.3]);
  eyes(b, 0.07, 0.42, 0.42, 0.06);
  for (let i = 0; i < 4; i++) {
    const yaw = (1.5 - i) * 0.45;
    const ph = i % 2 ? PI : 0;
    b.leg([0.12, 0.38, 0.28 - i * 0.06], 0.75, 0.04, c, ph, 1.2, 0.5, -yaw);
    b.leg([-0.12, 0.38, 0.28 - i * 0.06], 0.75, 0.04, c, ph + PI, -1.2, 0.5, yaw);
  }
}

function grasshopper(b) {
  const c = 0x6fae3a, d = 0x4f8a2a;
  b.add(GEO.ico, c, [0.26, 0.26, 0.95], [0, 0.34, -0.05]);
  b.add(GEO.ico, c, [0.24, 0.3, 0.26], [0, 0.42, 0.5]);
  eyes(b, 0.11, 0.5, 0.56, 0.08);
  b.add(GEO.box, d, [0.22, 0.05, 0.75], [0, 0.47, -0.2], [0.08, 0, 0]);
  for (const s of [1, -1]) {
    b.add(GEO.box, c, [0.02, 0.02, 0.5], [s * 0.06, 0.62, 0.75], [-0.5, s * 0.25, 0]);
    b.add(GEO.box, d, [0.07, 0.09, 0.55], [s * 0.17, 0.5, -0.22], [-0.6, 0, 0]);
    b.add(GEO.box, d, [0.04, 0.62, 0.04], [s * 0.19, 0.34, -0.5], [0.2, 0, 0]);
  }
  insectLegs(b, d, [0.35, 0.15], 0.3, 0.32, 0.03, 0.7, 0.08, 0.3);
}

// ---------- 小動物 ----------
function frog(b) {
  const c = 0x5cb84a, belly = 0xd5e6a0, d = 0x4a9a3a;
  b.add(GEO.ico, c, [0.75, 0.45, 0.85], [0, 0.32, 0], [-0.25, 0, 0]);
  b.add(GEO.ico, belly, [0.6, 0.3, 0.6], [0, 0.2, 0.12]);
  for (const s of [1, -1]) {
    b.add(GEO.ico, c, [0.22, 0.22, 0.22], [s * 0.2, 0.58, 0.3]);
    b.add(GEO.ico0, 0x111111, [0.1, 0.12, 0.06], [s * 0.22, 0.62, 0.4]);
    b.add(GEO.ico, c, [0.28, 0.2, 0.55], [s * 0.4, 0.14, -0.28]);
    b.add(GEO.box, d, [0.2, 0.04, 0.25], [s * 0.42, 0.02, -0.02]);
    b.leg([s * 0.25, 0.25, 0.3], 0.25, 0.07, c, 0, s * 0.3, 0.1);
  }
}

function lizard(b) {
  const c = 0x8c7d3c, d = 0x5f5326;
  b.add(GEO.ico, c, [0.36, 0.2, 0.85], [0, 0.16, 0]);
  b.add(GEO.ico, c, [0.26, 0.16, 0.38], [0, 0.18, 0.55]);
  eyes(b, 0.1, 0.22, 0.62, 0.05);
  b.tail([0, 0.15, -0.38], 0.05, 1.1, 0.2, c, true);
  for (let i = 0; i < 4; i++) b.add(GEO.ico0, d, [0.1, 0.05, 0.12], [((i % 2) - 0.5) * 0.12, 0.25, 0.25 - i * 0.17]);
  for (const z of [0.25, -0.25]) {
    for (const s of [1, -1]) b.leg([s * 0.15, 0.16, z], 0.2, 0.06, c, (z > 0) !== (s > 0) ? 0 : PI, s * 1.2, 0.7);
  }
}

// ---------- 四足動物の汎用ビルダー ----------
function quad(b, o) {
  const [bw, bh, bl] = o.body;
  const L = o.legLen, lw = o.legW;
  const by = L + bh / 2;
  b.add(GEO.ico, o.color, [bw, bh, bl], [0, by, 0]);
  if (o.belly) b.add(GEO.ico, o.belly, [bw * 0.82, bh * 0.6, bl * 0.82], [0, by - bh * 0.2, 0]);
  if (o.spots) {
    o.spots.forEach(([x, y, z, s]) => b.add(GEO.ico0, o.spotColor, [bw * s, bh * s * 0.7, bl * s * 0.6], [x * bw, by + y * bh, z * bl]));
  }

  const lc = o.legColor ?? o.color;
  const lx = bw / 2 - lw * 0.7, lz = bl / 2 - lw * 1.1;
  const legTop = L + bh * 0.15;
  for (const [sx, sz, ph] of [[1, 1, 0], [-1, 1, PI], [1, -1, PI], [-1, -1, 0]]) {
    const piv = b.leg([sx * lx, legTop, sz * lz], legTop, lw, lc, ph, 0, o.legAmp ?? 0.45);
    if (o.hoof) b.add(GEO.box, o.hoof, [lw * 1.1, lw * 0.5, lw * 1.1], [0, -legTop + lw * 0.25, 0], null, piv);
  }

  const [hw, hh, hl] = o.head;
  let hy, hz;
  if (o.neck) {
    const { len, ang, w } = o.neck;
    const sy = by + bh * 0.25, sz = bl / 2 - w * 0.3;
    const ey = sy + Math.sin(ang) * len, ez = sz + Math.cos(ang) * len;
    const np = b.pivot([0, (sy + ey) / 2, (sz + ez) / 2], [-ang, 0, 0]);
    b.add(GEO.box, o.color, [w, w, len + w * 0.6], [0, 0, 0], null, np);
    if (o.mane) b.add(GEO.box, o.mane, [w * 0.35, w * 0.45, len], [0, w * 0.6, -w * 0.1], null, np);
    hy = ey + hh * 0.1;
    hz = ez + hl * 0.3;
  } else {
    hy = by + bh * (o.headY ?? 0.3);
    hz = bl / 2 + hl * 0.3;
  }
  const head = b.pivot([0, hy, hz], o.headRot);
  const hc = o.headColor ?? o.color;
  b.add(GEO.ico, hc, [hw, hh, hl], [0, 0, 0], null, head);
  if (o.mask) b.add(GEO.ico, o.mask, [hw * 0.92, hh * 0.38, hl * 0.6], [0, hh * 0.1, hl * 0.2], null, head);
  eyes(b, hw * 0.3, hh * 0.15, hl * 0.42, hw * 0.13, head);
  let tipZ = hl * 0.5;
  if (o.snout) {
    const [sw, sh, sl, sc] = o.snout;
    b.add(GEO.ico, sc, [sw, sh, sl], [0, -hh * 0.15, hl * 0.42], null, head);
    tipZ = hl * 0.42 + sl * 0.45;
  }
  if (o.nose) b.add(GEO.ico0, o.nose, [hw * 0.14, hw * 0.11, hw * 0.1], [0, o.snout ? -hh * 0.08 : 0, tipZ], null, head);

  const ec = o.earColor ?? hc;
  for (const s of [1, -1]) {
    switch (o.ears) {
      case 'tri':
        b.add(GEO.cone, ec, [hw * 0.3, hh * 0.5, hw * 0.16], [s * hw * 0.28, hh * 0.6, -hl * 0.08], [0, 0, -s * 0.25], head);
        break;
      case 'round':
        b.add(GEO.ico, ec, [hw * 0.34, hw * 0.34, hw * 0.1], [s * hw * 0.34, hh * 0.5, -hl * 0.05], null, head);
        break;
      case 'long':
        b.add(GEO.ico, ec, [hw * 0.22, hh * 1.5, hw * 0.12], [s * hw * 0.17, hh * 1.05, -hl * 0.18], [-0.2, 0, -s * 0.12], head);
        break;
      case 'side':
        b.add(GEO.box, ec, [hw * 0.4, hh * 0.12, hh * 0.24], [s * hw * 0.62, hh * 0.22, -hl * 0.15], [0, 0, -s * 0.3], head);
        break;
      case 'flap':
        b.add(GEO.ico, ec, [hw * 0.12, hh * 1.15, hl * 1.0], [s * hw * 0.55, -hh * 0.02, -hl * 0.32], [0, s * 0.45, 0], head);
        break;
      case 'flop':
        b.add(GEO.ico0, ec, [hw * 0.3, hh * 0.32, hw * 0.12], [s * hw * 0.32, hh * 0.45, hl * 0.05], [0.5, 0, -s * 0.5], head);
        break;
    }
  }

  if (o.horns === 'cow') {
    for (const s of [1, -1]) b.add(GEO.cone, 0xeee4c8, [hw * 0.11, hh * 0.45, hw * 0.11], [s * hw * 0.36, hh * 0.55, -hl * 0.1], [0, 0, -s * 0.7], head);
  }
  if (o.horns === 'trike') {
    for (const s of [1, -1]) b.add(GEO.cone, 0xefe6cc, [hw * 0.13, hl * 0.95, hw * 0.13], [s * hw * 0.24, hh * 0.5, hl * 0.2], [PI / 2 - 0.55, 0, 0], head);
    b.add(GEO.cone, 0xefe6cc, [hw * 0.12, hl * 0.35, hw * 0.12], [0, hh * 0.1, hl * 0.5], [PI / 2 - 0.9, 0, 0], head);
    b.add(GEO.box, o.frill, [hw * 1.9, hh * 1.7, hl * 0.12], [0, hh * 0.55, -hl * 0.4], [-0.55, 0, 0], head);
  }
  if (o.tusks) {
    for (const s of [1, -1]) b.add(GEO.cone, 0xf3ecd9, [hw * 0.09, hl * 0.75, hw * 0.09], [s * hw * 0.22, -hh * 0.32, hl * 0.6], [PI / 2 - 0.35, 0, 0], head);
  }
  if (o.trunk) {
    let p = b.pivot([0, -hh * 0.05, hl * 0.42], [0.55, 0, 0], head);
    const seg = hh * 0.42;
    for (let i = 0; i < 4; i++) {
      const w = hw * (0.26 - i * 0.04);
      b.add(GEO.box, hc, [w, w, seg], [0, 0, seg / 2], null, p);
      p = b.pivot([0, 0, seg * 0.92], [0.42, 0, 0], p);
      b.tails.push(p);
    }
  }

  if (o.tail) {
    const t = o.tail;
    const tp = b.tail([0, by + bh * (t.y ?? 0.25), -bl / 2 + t.w * 0.6], t.ang, t.len, t.w, t.color ?? o.color, t.cone);
    if (t.tip) b.add(GEO.ico, t.tip, [t.w * 1.5, t.w * 1.5, t.w * 2.2], [0, 0, -t.len], null, tp);
  }
}

// ---------- 二足の恐竜 ----------
function biped(b, o) {
  const [bw, bh, bl] = o.body;
  const L = o.legLen, lw = o.legW;
  const by = L + bh * 0.25;
  b.add(GEO.ico, o.color, [bw, bh, bl], [0, by, 0], [-0.12, 0, 0]);
  if (o.belly) b.add(GEO.ico, o.belly, [bw * 0.78, bh * 0.6, bl * 0.8], [0, by - bh * 0.2, bl * 0.05], [-0.12, 0, 0]);
  if (o.stripes) for (let i = 0; i < 4; i++) b.add(GEO.box, o.stripes, [bw * 0.85, bh * 0.08, bl * 0.06], [0, by + bh * 0.4, bl * (0.25 - i * 0.17)], [-0.12, 0, 0]);
  for (const s of [1, -1]) {
    const piv = b.pivot([s * bw * 0.34, L, -bl * 0.05]);
    b.add(GEO.ico, o.color, [lw * 1.6, L * 0.75, lw * 2.1], [0, -L * 0.25, 0], null, piv);
    b.add(GEO.box, o.legColor ?? o.color, [lw * 0.75, L * 0.6, lw * 0.75], [0, -L * 0.68, -lw * 0.35], null, piv);
    b.add(GEO.box, o.legColor ?? o.color, [lw * 1.1, lw * 0.35, lw * 2.2], [0, -L + lw * 0.18, lw * 0.6], null, piv);
    b.legs.push({ piv, phase: s > 0 ? 0 : PI, amp: 0.55 });
    b.add(GEO.box, o.color, [lw * 0.3, lw * 0.3, o.arm], [s * bw * 0.36, by - bh * 0.05, bl * 0.42], [0.9, 0, 0]);
  }
  const [hw, hh, hl] = o.head;
  const neckTop = by + bh * 0.45 + (o.neckUp ?? 0);
  b.add(GEO.box, o.color, [hw * 0.55, hh * 0.9, bl * 0.3], [0, (by + neckTop) / 2 + bh * 0.12, bl * 0.42], [-0.6, 0, 0]);
  const head = b.pivot([0, neckTop, bl / 2 + hl * 0.25]);
  b.add(GEO.ico, o.color, [hw, hh * 0.7, hl], [0, hh * 0.1, 0], null, head);
  b.add(GEO.ico, o.belly ?? o.color, [hw * 0.85, hh * 0.35, hl * 0.9], [0, -hh * 0.25, hl * 0.02], null, head);
  if (o.teeth) for (let i = 0; i < 4; i++) for (const s of [1, -1]) b.add(GEO.cone, 0xfaf6ea, [hw * 0.08, hh * 0.15, hw * 0.08], [s * hw * 0.35, -hh * 0.12, hl * (0.35 - i * 0.12)], [PI, 0, 0], head);
  eyes(b, hw * 0.36, hh * 0.25, hl * 0.18, hw * 0.12, head);
  b.tail([0, by + bh * 0.1, -bl * 0.4], 0.08, o.tail.len, o.tail.w, o.color, true);
}

// ---------- 獲物の一覧 ----------
// size: 体長（アリ=1）、speed: 体長/秒、round: 初登場ラウンド
export const PREY_TYPES = [
  { id: 'ant', name: 'アリ', size: 1, speed: 1.5, round: 1, group: [3, 7], build: ant },
  { id: 'pillbug', name: 'ダンゴムシ', size: 2, speed: 0.7, round: 1, group: [1, 3], build: pillbug },
  { id: 'spider', name: 'クモ', size: 3, speed: 1.1, round: 1, group: [1, 2], build: spider },
  { id: 'grasshopper', name: 'バッタ', size: 5, speed: 0.9, round: 1, group: [1, 2], hop: true, build: grasshopper },

  { id: 'frog', name: 'カエル', size: 9, speed: 0.8, round: 2, group: [1, 3], hop: true, build: frog },
  { id: 'lizard', name: 'トカゲ', size: 14, speed: 1.0, round: 2, group: [1, 2], build: lizard },
  {
    id: 'mouse', name: 'ネズミ', size: 20, speed: 1.2, round: 2, group: [1, 3],
    build: (b) => quad(b, {
      body: [0.45, 0.4, 0.8], legLen: 0.12, legW: 0.08, color: 0x9a8f88, belly: 0xc9bfb5,
      head: [0.36, 0.32, 0.42], ears: 'round', earColor: 0xd9a3a0, nose: 0xe58a95,
      tail: { len: 0.95, w: 0.04, ang: 0.15, color: 0xd9a3a0 },
    }),
  },

  {
    id: 'rabbit', name: 'ウサギ', size: 38, speed: 0.9, round: 3, group: [1, 2], hop: true,
    build: (b) => quad(b, {
      body: [0.55, 0.55, 0.8], legLen: 0.15, legW: 0.12, color: 0xb8936a, belly: 0xf2e8da,
      head: [0.42, 0.4, 0.42], headY: 0.45, ears: 'long', nose: 0xe58a95,
      tail: { len: 0.05, w: 0.18, ang: 0.3, color: 0xf6f0e6, tip: 0xf6f0e6 },
    }),
  },
  {
    id: 'cat', name: 'ネコ', size: 55, speed: 0.85, round: 3, group: [1, 2],
    build: (b) => quad(b, {
      body: [0.4, 0.4, 1.0], legLen: 0.42, legW: 0.11, color: 0xe8a65a, belly: 0xf7e0bd,
      spots: [[0.15, 0.35, 0.2, 0.35], [-0.15, 0.35, -0.1, 0.35], [0, 0.4, -0.35, 0.35]], spotColor: 0xc97a32,
      head: [0.42, 0.38, 0.38], ears: 'tri', nose: 0xe58a95,
      tail: { len: 0.85, w: 0.08, ang: 0.85 },
    }),
  },
  {
    id: 'tanuki', name: 'タヌキ', size: 75, speed: 0.75, round: 3, group: [1, 2],
    build: (b) => quad(b, {
      body: [0.55, 0.5, 0.95], legLen: 0.28, legW: 0.14, color: 0x8a7050, legColor: 0x3a2e24, belly: 0xb8a07a,
      head: [0.46, 0.4, 0.42], ears: 'round', earColor: 0x3a2e24, mask: 0x3a2e24, snout: [0.2, 0.16, 0.18, 0xd8c8a8], nose: 0x1a1410,
      tail: { len: 0.5, w: 0.22, ang: -0.2, tip: 0x3a2e24 },
    }),
  },
  {
    id: 'dog', name: 'イヌ', size: 110, speed: 0.95, round: 3, group: [1, 1],
    build: (b) => quad(b, {
      body: [0.42, 0.45, 1.0], legLen: 0.52, legW: 0.13, color: 0xd9924a, belly: 0xf6e9d6,
      head: [0.42, 0.4, 0.42], headY: 0.5, ears: 'tri', snout: [0.24, 0.2, 0.26, 0xf6e9d6], nose: 0x1a1410,
      tail: { len: 0.4, w: 0.11, ang: 1.0, tip: 0xf6e9d6 },
    }),
  },

  {
    id: 'pig', name: 'ブタ', size: 160, speed: 0.55, round: 4, group: [1, 2],
    build: (b) => quad(b, {
      body: [0.75, 0.68, 1.1], legLen: 0.28, legW: 0.16, color: 0xf0a8b0,
      head: [0.55, 0.5, 0.4], headY: 0.1, ears: 'flop', snout: [0.3, 0.24, 0.14, 0xe88f9a],
      tail: { len: 0.18, w: 0.05, ang: 0.6 },
    }),
  },
  {
    id: 'cow', name: 'ウシ', size: 280, speed: 0.4, round: 4, group: [1, 1],
    build: (b) => quad(b, {
      body: [0.8, 0.75, 1.4], legLen: 0.72, legW: 0.18, color: 0xf5f5f0, hoof: 0x333333,
      spots: [[0.3, 0.1, 0.2, 0.4], [-0.25, 0.2, -0.2, 0.45], [0.1, 0.4, -0.3, 0.35], [-0.3, -0.1, 0.3, 0.3]], spotColor: 0x262626,
      head: [0.45, 0.45, 0.55], headY: 0.15, ears: 'side', horns: 'cow', snout: [0.36, 0.26, 0.2, 0xf0b8b8],
      tail: { len: 0.8, w: 0.05, ang: -1.2, tip: 0x262626 },
    }),
  },
  {
    id: 'horse', name: 'ウマ', size: 330, speed: 0.7, round: 4, group: [1, 1],
    build: (b) => quad(b, {
      body: [0.55, 0.62, 1.4], legLen: 0.95, legW: 0.14, color: 0x8b5a2b, hoof: 0x2a1a0e,
      neck: { len: 0.75, ang: 0.95, w: 0.3 }, mane: 0x3a2414,
      head: [0.3, 0.32, 0.66], headRot: [0.55, 0, 0], ears: 'tri', nose: 0x3a2414,
      tail: { len: 0.85, w: 0.14, ang: -0.9, color: 0x3a2414 },
    }),
  },
  {
    id: 'elephant', name: 'ゾウ', size: 600, speed: 0.32, round: 4, group: [1, 1],
    build: (b) => quad(b, {
      body: [1.3, 1.2, 1.8], legLen: 0.9, legW: 0.38, color: 0x8f9298, legAmp: 0.3,
      head: [0.9, 0.9, 0.7], headY: 0.15, ears: 'flap', earColor: 0x9ea1a8, tusks: true, trunk: true,
      tail: { len: 0.7, w: 0.06, ang: -1.1 },
    }),
  },

  {
    id: 'raptor', name: 'ラプトル', size: 500, speed: 0.75, round: 5, group: [2, 3],
    build: (b) => biped(b, {
      body: [0.4, 0.45, 0.9], legLen: 0.65, legW: 0.11, color: 0x9a7a4a, belly: 0xd9c8a0, stripes: 0x5a4226,
      head: [0.26, 0.28, 0.5], arm: 0.3, teeth: true, neckUp: 0.15,
      tail: { len: 1.3, w: 0.25 },
    }),
  },
  {
    id: 'trike', name: 'トリケラトプス', size: 1100, speed: 0.3, round: 5, group: [1, 1],
    build: (b) => quad(b, {
      body: [1.0, 0.9, 1.8], legLen: 0.55, legW: 0.3, color: 0x6b8e4e, belly: 0xc8b98a, legAmp: 0.3,
      head: [0.7, 0.6, 0.8], headY: -0.15, horns: 'trike', frill: 0xa8573a,
      tail: { len: 1.4, w: 0.4, ang: -0.1, cone: true, y: 0.1 },
    }),
  },
  {
    id: 'trex', name: 'ティラノサウルス', size: 1500, speed: 0.4, round: 5, group: [1, 1],
    build: (b) => biped(b, {
      body: [0.8, 0.9, 1.4], legLen: 1.0, legW: 0.3, color: 0x5e7a3e, belly: 0xb8b07a,
      head: [0.6, 0.65, 0.95], arm: 0.25, teeth: true,
      tail: { len: 2.0, w: 0.6 },
    }),
  },
  {
    id: 'brachio', name: 'ブラキオサウルス', size: 3000, speed: 0.22, round: 5, group: [1, 1],
    build: (b) => quad(b, {
      body: [1.1, 1.1, 1.8], legLen: 1.3, legW: 0.32, color: 0x7f9a8a, belly: 0xbfcab0, legAmp: 0.25,
      neck: { len: 3.0, ang: 1.1, w: 0.35 },
      head: [0.4, 0.32, 0.6],
      tail: { len: 2.0, w: 0.5, ang: -0.15, cone: true, y: 0 },
    }),
  },
];

// 体長が1になるように正規化した獲物モデルを作る
export function createPrey(type) {
  const b = new Builder();
  type.build(b);
  const inner = b.root;
  const box = new THREE.Box3().setFromObject(inner);
  const len = box.max.z - box.min.z;
  const k = 1 / len;
  inner.scale.setScalar(k);
  inner.position.set(0, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
  const obj = new THREE.Group();
  obj.add(inner);
  return {
    obj,
    legs: b.legs,
    tails: b.tails,
    height: (box.max.y - box.min.y) * k,
    width: (box.max.x - box.min.x) * k,
  };
}
