// ゲーム内時間を1/30秒ずつ進めて撮影する
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/frames/';
const FPS = 30, STEP = 1000 / FPS;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.clock.install();
  await p.goto('http://localhost:8123/');
  await p.clock.pauseAt(Date.now() + 2000);
  await p.addStyleTag({ content: `.tapfx{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(0,0,0,.15);background:rgba(255,255,255,.35);pointer-events:none;z-index:50;animation:tapfx .45s ease-out forwards}@keyframes tapfx{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.3);opacity:0}}` });
  await p.evaluate(() => {
    const A = window.__antlion, g = A.game;
    window.__bot = { mode: 'auto', on: true };
    setInterval(() => {
      if (!window.__bot.on || g.state !== 'play') return;
      const ps = A.prey.filter(q => { if (q.state !== 'walk') return false; const v = q.obj.position.clone().project(A.camera); return Math.abs(v.x) < 0.85 && v.y < 0.6 && v.y > -0.9; });
      if (!ps.length) return;
      let best = null, bv = -1;
      for (const q of ps) {
        const r = q.size / g.s;
        let v = window.__bot.mode === 'big' ? (r > 1 && r < 4 ? 5 + r : r) : (r <= 3 ? Math.min(r, 2.5) : 0.1);
        if (q.hits > 0) v += 3;
        if (v > bv) { bv = v; best = q; }
      }
      const sp = best.type.speed * 1.5 * best.size * 0.25;
      const x = best.x + best.dx * sp, z = best.z + best.dz * sp;
      A.throwSandAt(x, z);
      const v = best.obj.position.clone(); v.x = x; v.z = z; v.project(A.camera);
      const el = document.createElement('div'); el.className = 'tapfx';
      el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
      document.body.appendChild(el); setTimeout(() => el.remove(), 500);
    }, 170);
  });
  const step = async () => {
    await p.clock.runFor(STEP);
    await p.evaluate((st) => {
      for (const a of document.getAnimations()) {
        if (!a.__v) { a.__v = 1; a.pause(); a.currentTime = 0; }
        const end = a.effect.getComputedTiming().endTime;
        if (a.currentTime + st >= end) a.finish(); else a.currentTime += st;
      }
    }, STEP);
  };
  const run = async (sec) => { for (let i = 0; i < sec * FPS; i++) await step(); };
  const shoot = async (name, sec) => {
    fs.mkdirSync(OUT + name, { recursive: true });
    for (let i = 0; i < sec * FPS; i++) {
      await step();
      await p.screenshot({ path: `${OUT}${name}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
    }
    console.log('shot', name);
  };
  const setRound = (round, s, mode) => p.evaluate(([round, s, mode]) => {
    const g = window.__antlion.game;
    window.__antlion.clearPrey();
    g.round = round; g.s = s; g.sDisp = s; g.roundStartS = s; g.time = 40; g.spawnT = 0; window.__bot.mode = mode;
  }, [round, s, mode]);

  await run(1);
  
  await p.click('#startBtn');
  await shoot('s1_r1', 7);
  await setRound(2, 40, 'auto'); await run(3);
  await shoot('s2_r3', 5);
  await setRound(3, 200, 'big'); await run(3);
  await shoot('s3_r4', 6);
  await setRound(4, 900, 'big'); await run(3);
  await shoot('s4_r5', 6);
  await p.evaluate(() => { const g = window.__antlion.game; g.score = 8200000; g.s = 6000; g.time = 0.5; window.__bot.on = false; });
  await shoot('s5_emerge', 10);
  await b.close();
})();
