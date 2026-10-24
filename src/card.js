// 結果カード（1200x630、Xのカード画像比率）

export function formatLen(mm) {
  if (mm < 10) return `${mm.toFixed(1)}mm`;
  if (mm < 1000) return `${(mm / 10).toFixed(mm < 100 ? 1 : 0)}cm`;
  return `${(mm / 1000).toFixed(mm < 10000 ? 2 : 1)}m`;
}

// 体長に対するスコアの良さ（コンボやタイムボーナス）で 0.75〜1.5 倍
export function wingFactor(score, bodyMm) {
  const e = Math.max(score, 1) / ((bodyMm / 4) * 700);
  return Math.min(1.5, Math.max(0.75, Math.pow(e, 0.3)));
}

// 羽化したウスバカゲロウの翼開長(cm)。本物も幼虫の体長の数倍の翼をもつ
export function wingspanCm(score, bodyMm) {
  return (bodyMm * 4 * wingFactor(score, bodyMm)) / 10;
}

const RANKS = [
  [15, 'ふつうのウスバカゲロウ'],
  [50, 'りっぱなウスバカゲロウ'],
  [150, 'ネコ級ウスバカゲロウ'],
  [600, 'ウマ級ウスバカゲロウ'],
  [1500, 'ゾウ級ウスバカゲロウ'],
  [4000, '恐竜級ウスバカゲロウ'],
  [Infinity, '伝説の怪獣ウスバカゲロウ'],
];
export function rankOf(ws) {
  return RANKS.find(([max]) => ws < max)[1];
}
export function rankIndex(ws) {
  return RANKS.findIndex(([max]) => ws < max);
}

const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';

// ランクごとの見た目。上のランクほど翼が色づき、背景や演出が派手になる
export const STYLES = [
  { // ふつう：透明な翼、朝の砂地
    sky: ['#9fd6ee', '#e6f3f2'], wing: ['rgba(240,248,252,0.7)'], vein: 'rgba(95,82,62,0.45)',
    body: '#3d3226', stripe: 'rgba(160,135,95,0.8)', badge: '#8a7a66', wing3d: [0xf2f8fb, 0x334455],
  },
  { // りっぱな：琥珀色の翅脈と斑点
    sky: ['#8fd0f0', '#eaf5ee'], wing: ['rgba(250,246,232,0.72)'], vein: 'rgba(150,100,40,0.6)', spots: 4,
    body: '#4a3524', stripe: 'rgba(200,160,90,0.9)', badge: '#b07a3a', wing3d: [0xfaf3e0, 0x443322],
  },
  { // ネコ級：うすい金色に点々模様、黄色い縞の胴
    sky: ['#7cc8f0', '#f1f3e2'], wing: ['rgba(255,240,200,0.75)', 'rgba(250,228,170,0.7)'], vein: 'rgba(140,90,30,0.65)', spots: 9,
    body: '#3a2a1a', stripe: 'rgba(240,200,80,0.95)', badge: '#c99a2a', sparkle: 4, wing3d: [0xffefc8, 0x554411],
  },
  { // ウマ級：青く光る翼
    sky: ['#5fb6ea', '#e9f1f4'], wing: ['rgba(200,235,255,0.8)', 'rgba(150,200,255,0.75)', 'rgba(210,190,255,0.7)'], vein: 'rgba(40,70,130,0.6)',
    body: '#1f2433', stripe: 'rgba(120,200,255,0.9)', badge: '#3a7ac9', sparkle: 8, aura: 'rgba(170,215,255,0.55)', wing3d: [0xa8d4ff, 0x224477],
  },
  { // ゾウ級：夕焼けにエメラルドと金、後翅に目玉模様
    sky: ['#f2a65e', '#fbe2b0'], wing: ['rgba(160,240,190,0.8)', 'rgba(250,225,120,0.8)', 'rgba(120,220,200,0.75)'], vein: 'rgba(40,100,60,0.65)', eyes: true,
    body: '#1d2a1e', stripe: 'rgba(250,210,80,0.95)', badge: '#2f9a5a', sparkle: 12, aura: 'rgba(255,230,140,0.6)', wing3d: [0xa8f0c0, 0x445511],
  },
  { // 恐竜級：炎の翼、紫の夕暮れ
    sky: ['#5a2d6e', '#f08a5a'], wing: ['rgba(255,220,120,0.85)', 'rgba(255,130,60,0.85)', 'rgba(200,40,60,0.85)'], vein: 'rgba(110,20,10,0.7)', eyes: true,
    body: '#2a0f0f', stripe: 'rgba(255,150,60,0.95)', badge: '#d9452b', sparkle: 16, aura: 'rgba(255,140,60,0.65)', wing3d: [0xff9a50, 0x661100],
  },
  { // 伝説の怪獣：虹色の翼、星空とオーロラ、後光
    sky: ['#0d1440', '#3a2a7a'], wing: ['rgba(255,120,150,0.85)', 'rgba(255,220,110,0.85)', 'rgba(120,255,170,0.85)', 'rgba(110,190,255,0.85)', 'rgba(200,130,255,0.85)'],
    vein: 'rgba(255,255,255,0.75)', eyes: true, body: '#14102a', stripe: 'rgba(255,230,120,1)', badge: '#8a4ad9',
    sparkle: 24, aura: 'rgba(255,240,170,0.75)', rays: true, stars: true, wing3d: [0xffb8f0, 0x7744cc],
  },
];

function drawLacewing(g, cx, cy, L, st) {
  const wings = [
    [-0.18, 0.95, 0.15],
    [0.32, 0.88, 0.135],
  ];
  for (const side of [1, -1]) {
    for (const [ang, len, wid] of wings) {
      const hind = ang > 0;
      g.save();
      g.translate(cx + side * L * 0.03, cy + (hind ? L * 0.06 : 0));
      g.scale(side, 1);
      g.rotate(ang);
      const wl = L * len, ww = L * wid;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(wl * 0.2, -ww * 1.1, wl * 0.8, -ww * 1.1, wl, -ww * 0.12);
      g.bezierCurveTo(wl * 0.85, ww * 0.85, wl * 0.25, ww * 0.85, 0, 0);
      g.closePath();
      if (st.wing.length > 1) {
        const grad = g.createLinearGradient(0, 0, wl, 0);
        st.wing.forEach((col, i) => grad.addColorStop(i / (st.wing.length - 1), col));
        g.fillStyle = grad;
      } else g.fillStyle = st.wing[0];
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = st.vein;
      g.lineWidth = Math.max(1, L * 0.006);
      for (let i = 1; i < 12; i++) {
        const x = (wl * i) / 12;
        g.beginPath();
        g.moveTo(x, -ww);
        g.lineTo(x + wl * 0.05, ww);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(wl, -ww * 0.2);
      g.moveTo(0, 0);
      g.quadraticCurveTo(wl * 0.5, -ww * 0.65, wl * 0.95, -ww * 0.45);
      g.stroke();
      if (st.spots) {
        g.fillStyle = st.vein;
        for (let i = 0; i < st.spots; i++) {
          const x = wl * (0.2 + (0.7 * i) / st.spots);
          g.beginPath();
          g.arc(x, -ww * (0.15 + 0.25 * (i % 2)), ww * 0.07, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (st.eyes && hind) {
        const ex = wl * 0.62, ey = -ww * 0.05, er = ww * 0.42;
        const eg = g.createRadialGradient(ex, ey, 0, ex, ey, er);
        eg.addColorStop(0, 'rgba(20,10,10,0.9)');
        eg.addColorStop(0.35, 'rgba(20,10,10,0.9)');
        eg.addColorStop(0.4, 'rgba(255,240,180,0.95)');
        eg.addColorStop(0.7, 'rgba(255,240,180,0.6)');
        eg.addColorStop(1, 'rgba(255,240,180,0)');
        g.fillStyle = eg;
        g.beginPath();
        g.arc(ex, ey, er, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      g.strokeStyle = st.vein;
      g.lineWidth = Math.max(1.5, L * 0.008);
      g.stroke();
      g.fillStyle = st.body;
      g.beginPath();
      g.ellipse(wl * 0.8, -ww * 0.35, wl * 0.03, ww * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.fillStyle = st.body;
  g.beginPath();
  g.ellipse(cx, cy + L * 0.5, L * 0.035, L * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = st.stripe;
  g.lineWidth = Math.max(1, L * 0.008);
  for (let i = 1; i < 8; i++) {
    const y = cy + L * 0.1 + i * L * 0.1;
    g.beginPath();
    g.moveTo(cx - L * 0.03, y);
    g.lineTo(cx + L * 0.03, y);
    g.stroke();
  }
  g.fillStyle = st.body;
  g.beginPath();
  g.ellipse(cx, cy + L * 0.02, L * 0.06, L * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx, cy - L * 0.11, L * 0.055, L * 0.045, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = st.body;
  g.lineWidth = Math.max(1.5, L * 0.008);
  for (const s of [1, -1]) {
    g.beginPath();
    g.moveTo(cx + s * L * 0.02, cy - L * 0.14);
    g.quadraticCurveTo(cx + s * L * 0.06, cy - L * 0.3, cx + s * L * 0.12, cy - L * 0.36);
    g.stroke();
    g.beginPath();
    g.arc(cx + s * L * 0.12, cy - L * 0.36, L * 0.014, 0, Math.PI * 2);
    g.fill();
  }
}

function sparkle(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.25 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// 大きさ比べ用のシルエット（ヒト170cm / サッカーボール22cm / 10円玉2.35cm）
function drawReference(g, x, groundY, pxPerCm, dark) {
  const col = dark ? 'rgba(255,255,255,0.85)' : 'rgba(59,42,26,0.8)';
  g.fillStyle = col;
  g.textAlign = 'center';
  g.font = `800 15px ${FONT}`;
  if (170 * pxPerCm > 380 && 22 * pxPerCm <= 160) {
    const r = 11 * pxPerCm;
    g.fillStyle = '#fafafa';
    g.beginPath();
    g.arc(x, groundY - r, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#222';
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      g.lineTo(x + Math.cos(a) * r * 0.38, groundY - r + Math.sin(a) * r * 0.38);
    }
    g.fill();
    g.strokeStyle = '#222';
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.arc(x, groundY - r, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = col;
    g.fillText('サッカーボール', x, groundY + 20);
  } else if (170 * pxPerCm >= 14 && 170 * pxPerCm <= 380) {
    const h = 170 * pxPerCm;
    const u = h / 8;
    g.beginPath();
    g.arc(x, groundY - h + u * 0.55, u * 0.55, 0, Math.PI * 2);
    g.fill();
    roundRect(g, x - u * 0.8, groundY - h + u * 1.2, u * 1.6, u * 3.2, u * 0.4);
    g.fill();
    g.fillRect(x - u * 0.7, groundY - h + u * 4.2, u * 0.6, u * 3.8);
    g.fillRect(x + u * 0.1, groundY - h + u * 4.2, u * 0.6, u * 3.8);
    g.fillText('ヒト', x, groundY + 20);
  } else if (170 * pxPerCm >= 2 && 170 * pxPerCm < 14) {
    const h = 170 * pxPerCm;
    g.fillRect(x - Math.max(1, h * 0.12), groundY - h, Math.max(2, h * 0.24), h);
    g.fillText('↑ヒト', x, groundY + 20);
  } else {
    const r = Math.min(70, Math.max(4, 1.175 * pxPerCm));
    g.fillStyle = '#c8783c';
    g.beginPath();
    g.arc(x, groundY - r, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9a5428';
    g.font = `900 ${Math.max(8, r * 0.8)}px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('10', x, groundY - r);
    g.textBaseline = 'alphabetic';
    g.fillStyle = col;
    g.font = `800 15px ${FONT}`;
    g.fillText('10円玉', x, groundY + 20);
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function fitText(g, text, maxW, size, weight = 900) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${FONT}`;
    s -= 2;
  } while (g.measureText(text).width > maxW && s > 12);
}

function mulberry(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawCard(d) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  const st = STYLES[Math.max(0, rankIndex(d.ws))];
  const rand = mulberry(Math.floor(d.score) + 1);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, st.sky[0]);
  bg.addColorStop(0.62, st.sky[1]);
  bg.addColorStop(0.63, '#ecd39b');
  bg.addColorStop(1, '#d1aa6a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  if (st.stars) {
    for (let i = 0; i < 140; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
      g.fillRect(rand() * W, rand() * H * 0.6, 1 + rand() * 2, 1 + rand() * 2);
    }
    for (let k = 0; k < 3; k++) {
      const ag = g.createLinearGradient(0, 60 + k * 40, 0, 260 + k * 30);
      ag.addColorStop(0, 'rgba(120,255,190,0)');
      ag.addColorStop(0.5, `rgba(${k === 1 ? '170,120,255' : '120,255,190'},0.28)`);
      ag.addColorStop(1, 'rgba(120,255,190,0)');
      g.fillStyle = ag;
      g.beginPath();
      g.moveTo(0, 120 + k * 50);
      for (let x = 0; x <= W; x += 40) g.lineTo(x, 120 + k * 50 + Math.sin(x / 140 + k * 2) * 40);
      g.lineTo(W, 300 + k * 30);
      g.lineTo(0, 300 + k * 30);
      g.fill();
    }
  }

  // 翼開長が大きいほど大きく描く
  const t = Math.min(1, Math.max(0, Math.log(d.ws / 5) / Math.log(5000 / 5)));
  const L = 150 + 140 * t, cx = 330, cy = 210 + (1 - t) * 50;

  if (st.rays) {
    g.save();
    g.translate(cx, cy + L * 0.1);
    for (let i = 0; i < 18; i++) {
      g.rotate((Math.PI * 2) / 18);
      g.fillStyle = i % 2 ? 'rgba(255,240,170,0.16)' : 'rgba(255,255,255,0.08)';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-40, -700);
      g.lineTo(40, -700);
      g.fill();
    }
    g.restore();
  }
  const glow = g.createRadialGradient(cx, cy + 70, 10, cx, cy + 70, L * 1.2);
  glow.addColorStop(0, st.aura ?? 'rgba(255,255,240,0.95)');
  glow.addColorStop(1, 'rgba(255,255,240,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 660, H);

  // 巣穴
  const pit = g.createRadialGradient(330, 560, 5, 330, 560, 200);
  pit.addColorStop(0, '#a27a45');
  pit.addColorStop(1, 'rgba(180,140,85,0)');
  g.fillStyle = pit;
  g.beginPath();
  g.ellipse(330, 565, 210, 45, 0, 0, Math.PI * 2);
  g.fill();

  drawLacewing(g, cx, cy, L, st);
  drawReference(g, 585, 585, (L * 1.85) / d.ws, false);

  for (let i = 0; i < (st.sparkle ?? 0); i++) {
    const a = rand() * Math.PI * 2, r = L * (0.5 + rand() * 0.7);
    sparkle(g, cx + Math.cos(a) * r * 1.1, cy + 60 + Math.sin(a) * r * 0.7, 5 + rand() * 9, 'rgba(255,250,220,0.95)');
  }

  // 右側の情報パネル
  g.fillStyle = 'rgba(255, 251, 242, 0.9)';
  roundRect(g, 650, 40, 510, 550, 28);
  g.fill();

  g.textAlign = 'center';
  const px = 905;
  g.fillStyle = st.badge;
  g.font = `900 30px ${FONT}`;
  g.fillText(d.cleared ? '羽化成功！' : '途中で羽化…', px, 98);

  g.fillStyle = st.badge;
  fitText(g, d.rank, 460, 40);
  g.fillText(d.rank, px, 156);

  g.font = `800 22px ${FONT}`;
  g.fillStyle = '#7a6040';
  g.fillText('翼開長', px, 214);
  g.fillStyle = '#d9662b';
  g.font = `900 84px ${FONT}`;
  g.fillText(formatLen(d.ws * 10), px, 296);

  g.strokeStyle = 'rgba(122, 96, 64, 0.3)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(690, 330);
  g.lineTo(1120, 330);
  g.stroke();

  g.fillStyle = '#7a6040';
  g.font = `800 22px ${FONT}`;
  g.fillText('SCORE', px, 370);
  g.fillStyle = '#3b2a1a';
  g.font = `900 56px ${FONT}`;
  g.fillText(d.score.toLocaleString('ja-JP'), px, 428);

  const rows = [
    ['到達ラウンド', d.cleared ? '全5ラウンド制覇' : `ROUND ${d.round} / 5`],
    ['アリジゴクの体長', formatLen(d.bodyMm)],
    ['食べた獲物', `${d.eaten}匹（最大コンボ ${d.maxCombo}）`],
    ['いちばん大きな獲物', d.biggest],
  ];
  g.font = `800 20px ${FONT}`;
  rows.forEach(([k, v], i) => {
    const y = 470 + i * 31;
    g.textAlign = 'left';
    g.fillStyle = '#7a6040';
    g.fillText(k, 700, y);
    g.textAlign = 'right';
    g.fillStyle = '#3b2a1a';
    g.fillText(v, 1110, y);
  });

  g.textAlign = 'left';
  g.fillStyle = 'rgba(59, 42, 26, 0.75)';
  g.font = `900 24px ${FONT}`;
  g.fillText('アリジゴク巨大化ゲーム', 36, 604);
  return c;
}
