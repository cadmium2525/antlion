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

const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';

function drawLacewing(g, cx, cy, L) {
  const wings = [
    [-0.18, 0.95, 0.15],
    [0.32, 0.88, 0.135],
  ];
  for (const side of [1, -1]) {
    for (const [ang, len, wid] of wings) {
      g.save();
      g.translate(cx + side * L * 0.03, cy + (ang < 0 ? 0 : L * 0.06));
      g.scale(side, 1);
      g.rotate(ang);
      const wl = L * len, ww = L * wid;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(wl * 0.2, -ww * 1.1, wl * 0.8, -ww * 1.1, wl, -ww * 0.12);
      g.bezierCurveTo(wl * 0.85, ww * 0.85, wl * 0.25, ww * 0.85, 0, 0);
      g.closePath();
      g.fillStyle = 'rgba(240, 248, 252, 0.7)';
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(95, 82, 62, 0.45)';
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
      g.restore();
      g.strokeStyle = 'rgba(80, 66, 48, 0.75)';
      g.lineWidth = Math.max(1.5, L * 0.008);
      g.stroke();
      g.fillStyle = 'rgba(70, 55, 40, 0.8)';
      g.beginPath();
      g.ellipse(wl * 0.8, -ww * 0.35, wl * 0.03, ww * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.fillStyle = '#3d3226';
  g.beginPath();
  g.ellipse(cx, cy + L * 0.5, L * 0.035, L * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(160, 135, 95, 0.8)';
  g.lineWidth = Math.max(1, L * 0.006);
  for (let i = 1; i < 8; i++) {
    const y = cy + L * 0.1 + i * L * 0.1;
    g.beginPath();
    g.moveTo(cx - L * 0.03, y);
    g.lineTo(cx + L * 0.03, y);
    g.stroke();
  }
  g.fillStyle = '#3d3226';
  g.beginPath();
  g.ellipse(cx, cy + L * 0.02, L * 0.06, L * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx, cy - L * 0.11, L * 0.055, L * 0.045, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3d3226';
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

export function drawCard(d) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#7cc4e4');
  bg.addColorStop(0.62, '#e3f1ef');
  bg.addColorStop(0.63, '#ecd39b');
  bg.addColorStop(1, '#d1aa6a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(330, 280, 10, 330, 280, 300);
  glow.addColorStop(0, 'rgba(255,255,240,0.95)');
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

  // 翼開長が大きいほど大きく描く
  const t = Math.min(1, Math.max(0, Math.log(d.ws / 5) / Math.log(5000 / 5)));
  drawLacewing(g, 330, 210 + (1 - t) * 50, 150 + 140 * t);

  // 右側の情報パネル
  g.fillStyle = 'rgba(255, 251, 242, 0.9)';
  roundRect(g, 650, 40, 510, 550, 28);
  g.fill();

  g.textAlign = 'center';
  const px = 905;
  g.fillStyle = '#a9481a';
  g.font = `900 30px ${FONT}`;
  g.fillText(d.cleared ? '羽化成功！' : '途中で羽化…', px, 98);

  g.fillStyle = '#3b2a1a';
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
