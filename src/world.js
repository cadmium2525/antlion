import * as THREE from 'three';

// 巣穴の深さ（巣穴の半径を1としたとき）
export const PIT_DEPTH = 0.6;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 巣穴半径=1 の単位系での地面の高さ
function unitHeight(ux, uz) {
  const r = Math.hypot(ux, uz);
  let h = 0;
  if (r < 1) h = -PIT_DEPTH * Math.pow(1 - r, 1.25);
  else if (r < 1.5) h = 0.06 * Math.sin((Math.PI * (r - 1)) / 0.5);
  const a = 0.05 * smoothstep(1.5, 4, r) * Math.pow(r, 0.85);
  if (a > 0) {
    h += a * (Math.sin(ux * 0.55 + 1.3) * Math.cos(uz * 0.45 - 0.4) + 0.45 * Math.sin(ux * 1.3 - uz * 1.1 + 2.0));
  }
  return h;
}

function buildGround() {
  const rand = mulberry32(42);
  const SEG = 84;
  const radii = [];
  for (let i = 1; i <= 16; i++) radii.push(i / 16);
  for (let j = 1; j <= 46; j++) radii.push(Math.pow(140, j / 46));

  const pos = [0, -PIT_DEPTH, 0];
  const col = [];
  const cDeep = new THREE.Color(0xb48a55);
  const cPit = new THREE.Color(0xdcb77c);
  const cSand = new THREE.Color(0xecd096);
  const cFar = new THREE.Color(0xf2e2b8);
  const tmp = new THREE.Color();
  tmp.copy(cDeep);
  col.push(tmp.r, tmp.g, tmp.b);

  radii.forEach((r0, ri) => {
    for (let k = 0; k < SEG; k++) {
      const a = (k / SEG) * Math.PI * 2 + (ri % 2) * (Math.PI / SEG);
      const r = r0 * (1 + (rand() - 0.5) * 0.04);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, unitHeight(x, z), z);
      if (r < 1) tmp.lerpColors(cDeep, cPit, Math.pow(r, 0.8));
      else tmp.lerpColors(cSand, cFar, smoothstep(3, 30, r));
      tmp.multiplyScalar(0.93 + rand() * 0.11);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  });

  const idx = [];
  for (let k = 0; k < SEG; k++) idx.push(0, 1 + ((k + 1) % SEG), 1 + k);
  for (let ri = 0; ri < radii.length - 1; ri++) {
    const a0 = 1 + ri * SEG;
    const b0 = 1 + (ri + 1) * SEG;
    for (let k = 0; k < SEG; k++) {
      const k1 = (k + 1) % SEG;
      idx.push(a0 + k, a0 + k1, b0 + k);
      idx.push(a0 + k1, b0 + k1, b0 + k);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

// 大きさの段階ごとに小石・草・岩を置き、巨大化したときのスケール感を出す
function buildDecor(scene) {
  const rand = mulberry32(7);
  const ico = new THREE.IcosahedronGeometry(0.5, 0);
  const dode = new THREE.DodecahedronGeometry(0.5, 0);
  const cone = new THREE.ConeGeometry(0.5, 1, 5);
  const mats = {};
  const m = (c) => (mats[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const pebbleCols = [0xb7a58a, 0x9c8c76, 0xc9b79a, 0xa89272];
  const grassCols = [0x8aa64a, 0x7a9a3e, 0x9bb35a];

  const list = [];
  for (let lv = 0; lv < 8; lv++) {
    const L = 1.5 * Math.pow(3, lv);
    for (let i = 0; i < 24; i++) {
      const kind = rand();
      const a = rand() * Math.PI * 2;
      const r = L * (3 + rand() * 20);
      const size = L * (0.25 + rand() * 0.6);
      let obj;
      if (kind < 0.45) {
        obj = new THREE.Mesh(ico, m(pebbleCols[(rand() * pebbleCols.length) | 0]));
        obj.scale.set(size, size * 0.6, size * 0.8);
        obj.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      } else if (kind < 0.78) {
        obj = new THREE.Group();
        const n = 3 + ((rand() * 3) | 0);
        for (let j = 0; j < n; j++) {
          const blade = new THREE.Mesh(cone, m(grassCols[(rand() * grassCols.length) | 0]));
          const h = size * (0.8 + rand() * 0.6);
          blade.scale.set(size * 0.14, h, size * 0.14);
          blade.position.set((rand() - 0.5) * size * 0.4, h / 2, (rand() - 0.5) * size * 0.4);
          blade.rotation.set((rand() - 0.5) * 0.6, 0, (rand() - 0.5) * 0.6);
          obj.add(blade);
        }
      } else {
        obj = new THREE.Mesh(dode, m(0x9a8f80));
        obj.scale.set(size * 1.3, size, size * 1.1);
        obj.rotation.set(rand(), rand() * 3, rand());
      }
      obj.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      scene.add(obj);
      list.push({ obj, x: obj.position.x, z: obj.position.z, r, size });
    }
  }
  return list;
}

export function createWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xfff4dc, 0xb39463, 1.6);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(0.6, 1, 0.45);
  scene.add(hemi, sun);

  const ground = buildGround();
  scene.add(ground);
  const decor = buildDecor(scene);

  const world = {
    pitR: 1,
    heightAt(x, z) {
      const R = world.pitR;
      return R * unitHeight(x / R, z / R);
    },
    update(pitR, size) {
      world.pitR = pitR;
      ground.scale.setScalar(pitR);
      for (const d of decor) {
        const vis = d.r > pitR * 1.3 && d.size > size * 0.04 && d.size < size * 80;
        d.obj.visible = vis;
        if (vis) d.obj.position.y = world.heightAt(d.x, d.z);
      }
    },
  };
  return world;
}
