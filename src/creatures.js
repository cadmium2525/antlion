import * as THREE from 'three';
import { GEO, mat } from './prey.js';
import { mulberry32 } from './world.js';

const PI = Math.PI;

function add(parent, geo, color, s, p, r) {
  const m = new THREE.Mesh(geo, mat(color));
  m.scale.set(s[0], s[1], s[2]);
  m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  parent.add(m);
  return m;
}

// ---------- アリジゴク（体長1、+z が正面） ----------
export function buildAntlion() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const c = 0x8a6a45, d = 0x5a4128, l = 0xa3835a;
  const rand = mulberry32(3);

  add(body, GEO.ico, c, [1.0, 0.55, 1.15], [0, 0.25, -0.25]);
  add(body, GEO.ico, l, [0.7, 0.4, 0.5], [0, 0.3, 0.12]);
  for (let i = 0; i < 12; i++) {
    const a = rand() * PI * 2, r = 0.2 + rand() * 0.25;
    add(body, GEO.ico0, d, [0.12, 0.06, 0.12], [Math.cos(a) * r, 0.5 - r * 0.25, -0.25 + Math.sin(a) * r * 1.1]);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    add(body, GEO.cone, d, [0.04, 0.16, 0.04], [Math.cos(a) * 0.47, 0.28, -0.25 + Math.sin(a) * 0.55], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]);
  }
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) add(body, GEO.box, d, [0.06, 0.3, 0.06], [s * 0.38, 0.1, 0.1 - i * 0.2], [0, 0, s * 1.1]);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.36, 0.32);
  body.add(head);
  add(head, GEO.ico, l, [0.5, 0.26, 0.45], [0, 0, 0.12]);
  for (const s of [1, -1]) add(head, GEO.ico0, 0x1a1208, [0.06, 0.06, 0.06], [s * 0.2, 0.08, 0.22]);

  const jaws = [];
  const jawGeo = new THREE.TorusGeometry(0.38, 0.05, 4, 10, PI * 0.45);
  for (const s of [1, -1]) {
    const jp = new THREE.Group();
    jp.position.set(s * 0.13, 0.02, 0.3);
    jp.scale.x = s;
    head.add(jp);
    const jaw = new THREE.Mesh(jawGeo, mat(0x4a3420));
    jaw.rotation.x = PI / 2;
    jaw.position.x = -0.38;
    jp.add(jaw);
    for (let i = 0; i < 3; i++) {
      const t = 0.12 + i * 0.1;
      add(jp, GEO.cone, 0x4a3420, [0.03, 0.09, 0.03], [-0.38 + Math.cos(t * PI) * 0.38 - 0.04, 0, Math.sin(t * PI) * 0.38], [0, 0, PI / 2]);
    }
    jaws.push({ jp, s });
  }

  let flick = 0, chomp = 0, time = 0;
  return {
    root,
    flick() { flick = 1; },
    chomp() { chomp = 1; },
    update(dt) {
      time += dt;
      flick = Math.max(0, flick - dt * 7);
      chomp = Math.max(0, chomp - dt * 4);
      const open = 0.85 + Math.sin(time * 2.2) * 0.07;
      const close = Math.sin(Math.min(1, chomp * 1.4) * PI);
      for (const { jp, s } of jaws) jp.rotation.y = s * (open * (1 - close) + 0.25 * close);
      head.rotation.x = -0.5 * Math.sin(flick * PI);
      body.scale.set(1 + Math.sin(time * 3) * 0.015, 1, 1);
    },
  };
}

// ---------- ウスバカゲロウ ----------
function wingGeometry(len, wid) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(len * 0.2, wid * 0.6, len * 0.8, wid * 0.6, len, wid * 0.08);
  shape.bezierCurveTo(len * 0.85, -wid * 0.45, len * 0.25, -wid * 0.45, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 10);
  g.rotateX(-PI / 2);

  const pts = shape.getSpacedPoints(40);
  const v = [];
  for (let i = 0; i < pts.length - 1; i++) v.push(pts[i].x, 0, -pts[i].y, pts[i + 1].x, 0, -pts[i + 1].y);
  for (let i = 1; i < 9; i++) {
    const x = (len * i) / 9;
    const h = wid * 0.42 * Math.sin((PI * i) / 9);
    v.push(x, 0, -h, x + len * 0.04, 0, h * 0.8);
  }
  v.push(0, 0, 0, len * 0.97, 0, -wid * 0.05);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return { g, lines };
}

export function buildLacewing() {
  const root = new THREE.Group();
  const c = 0x3d3226;
  add(root, GEO.ico, c, [0.09, 0.09, 1.15], [0, 0, -0.58]);
  for (let i = 0; i < 6; i++) add(root, GEO.ico0, 0x6a5a40, [0.1, 0.1, 0.05], [0, 0, -0.15 - i * 0.16]);
  add(root, GEO.ico, c, [0.17, 0.15, 0.28], [0, 0, 0.05]);
  add(root, GEO.ico, c, [0.15, 0.12, 0.12], [0, 0, 0.23]);
  for (const s of [1, -1]) {
    add(root, GEO.ico0, 0x1a1a1a, [0.07, 0.07, 0.07], [s * 0.07, 0.01, 0.26]);
    add(root, GEO.box, c, [0.012, 0.012, 0.32], [s * 0.06, 0.05, 0.4], [-0.4, s * 0.35, 0]);
    add(root, GEO.ico0, c, [0.035, 0.035, 0.05], [s * 0.12, 0.11, 0.55]);
    for (let i = 0; i < 3; i++) add(root, GEO.box, c, [0.015, 0.18, 0.015], [s * 0.07, -0.08, 0.1 - i * 0.07], [0, 0, s * 0.5]);
  }

  const wingMat = new THREE.MeshLambertMaterial({
    color: 0xf2f8fb, emissive: 0x334455, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false,
  });
  const veinMat = new THREE.LineBasicMaterial({ color: 0x6d5f4c, transparent: true, opacity: 0.8 });
  const front = wingGeometry(1.3, 0.28);
  const hind = wingGeometry(1.2, 0.25);
  const wings = [];
  for (const s of [1, -1]) {
    [[front, 0.09, 0.22, 0], [hind, 0.0, 0.62, 0.5]].forEach(([w, z, yaw, ph]) => {
      const base = new THREE.Group();
      base.position.set(s * 0.04, 0.05, z);
      base.scale.x = s;
      base.rotation.y = s * yaw;
      root.add(base);
      const flap = new THREE.Group();
      base.add(flap);
      flap.add(new THREE.Mesh(w.g, wingMat));
      flap.add(new THREE.LineSegments(w.lines, veinMat));
      wings.push({ flap, ph });
    });
  }

  let time = 0;
  return {
    root,
    update(dt, speed = 10) {
      time += dt;
      for (const { flap, ph } of wings) flap.rotation.z = Math.sin(time * speed - ph) * 0.65 + 0.15;
    },
  };
}
