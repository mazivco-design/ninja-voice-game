/* ninja-voice-game – sk-cannon.js   (סקיצה, סבב 3 – 25 בנובמבר 2026)
   תותח הבמבוק – כיוון, בהשראת Angry Birds ומשחקי ארטילריה. הנינג'ה ליד תותח במבוק, ומולו שלוש מטרות על עמודים בגבהים ובמרחקים שונים.
   קו מקווקו מראה לאן הכדור יעוף. UP / DOWN מרימים ומורידים את הקנה, ו-FIRE יורה. פגיעה – המטרה מתפוצצת לכוכבים והבאה נדלקת.
   פספוס – הכדור נוחת ומנסים שוב.  נבנה על sketchkit.js. */

const CN = { cx: 22, ch: 5, v: 42, g: 34, ang: [0.3, 0.45, 0.6, 0.75, 0.9, 1.05], targets: [{ i: 3, x: 58 }, { i: 1, x: 70 }, { i: 5, x: 46 }] };
function cnAt(i, t) { const a = CN.ang[i]; return [CN.cx + Math.cos(a) * (5 + CN.v * t), CN.ch + Math.sin(a) * (5 + CN.v * t) - CN.g * t * t / 2]; }
function cnTime(i, x) { return (x - CN.cx - Math.cos(CN.ang[i]) * 5) / (Math.cos(CN.ang[i]) * CN.v); }
for (const t of CN.targets) { t.t = cnTime(t.i, t.x); t.h = cnAt(t.i, t.t)[1]; }
function cnTarget(x, y, r, hot) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hot ? '#ef4444' : '#94a3b8'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x, y, r * 0.68, 0, Math.PI * 2, true); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, Math.PI * 2); ctx.fill();
}
kxScene({
  type: 'cannonaim', listen: ['up', 'down', 'fire'], w: 96, e0: 13, banner: 'UP · DOWN to aim – then FIRE!', time: 30, coins: 5, hint: 4.5, autoGap: 0.7,
  start: () => ({ p: 'aim', a: 2, av: CN.ang[2], n: 0, ball: null, boom: [], kick: 9, puffs: [] }),
  update(S, dt) {
    S.kick += dt; S.av += (CN.ang[S.a] - S.av) * Math.min(1, dt * 12);
    for (const b of S.boom) b.t += dt; S.boom = S.boom.filter(b => b.t < 0.8);
    if (S.ball) {
      const b = S.ball; b.t += dt; const [x, h] = cnAt(b.i, b.t), T = CN.targets[S.n];
      if (b.i === T.i && b.t >= T.t) { S.ball = null; S.boom.push({ x: T.x, h: T.h, t: 0 }); sfx('hit'); sfx('coin'); S.n++; floatText(S.o.x + T.x, GROUND - T.h - 8, S.n < 3 ? 'HIT! ' + S.n : 'HIT! ⭐', '#16a34a'); if (S.n >= 3) { kxP(S, 'win'); sfx('win'); } else kxP(S, 'aim'); }
      else if (h <= 0) { S.ball = null; S.puffs.push({ x, t: 0 }); sfx('thud'); floatText(S.o.x + x, GROUND - 8, 'Oops!', '#dc2626'); kxP(S, 'aim'); }
    }
    for (const p of S.puffs) p.t += dt; S.puffs = S.puffs.filter(p => p.t < 0.6);
    if (S.p === 'win' && S.t > 1.6) kxP(S, 'exit');
    else if (S.p === 'exit' && kxExit(S, dt, 80)) return 'done';
  },
  expected: S => { if (S.p !== 'aim' || S.t < 0.35) return []; const T = CN.targets[S.n]; return [S.a < T.i ? 'up' : S.a > T.i ? 'down' : 'fire']; },
  cmd(S, w) {
    if (S.p !== 'aim') return;
    if (w === 'fire') { kxOk(S, w); S.ball = { i: S.a, t: 0 }; S.kick = 0; sfx('thud'); sfx('swish'); kxP(S, 'shot'); return; }
    const a = S.a + (w === 'up' ? 1 : -1); if (a < 0 || a >= CN.ang.length) { sfx('thud'); return; }
    S.a = a; kxOk(S, w); sfx('pop'); S.t = 0;
  },
  draw(o, S) {
    const g = GROUND, now = performance.now() / 1000;
    CN.targets.forEach((T, i) => {                                               // עמודי במבוק ומטרות
      const x = o.x + T.x, y = g - T.h, done = S && i < S.n, hot = S ? i === S.n : i === 0;
      ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 1.5, g); ctx.lineTo(x + 1.5, y); ctx.stroke();
      ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 0.35; for (let h = 5; h < T.h; h += 6) { ctx.beginPath(); ctx.moveTo(x + 0.8, g - h); ctx.lineTo(x + 2.2, g - h); ctx.stroke(); }
      if (!done) { if (hot && S) { ctx.fillStyle = 'rgba(250,204,21,' + (0.25 + Math.sin(now * 6) * 0.12) + ')'; ctx.beginPath(); ctx.arc(x, y, 6.3, 0, Math.PI * 2); ctx.fill(); } cnTarget(x, y, 4.2, hot); }
    });
    const cx = o.x + CN.cx, cy = g - CN.ch, a = S ? S.av : CN.ang[2], rec = S && S.kick < 0.2 ? Math.sin(S.kick / 0.2 * Math.PI) * 1.4 : 0;
    if (S && S.p === 'aim') { ctx.fillStyle = 'rgba(30,41,59,.5)'; for (let t = 0.1; t < 3; t += 0.085) { const [x, h] = cnAt(S.a, t); if (h < 0) break; ctx.beginPath(); ctx.arc(o.x + x, g - h, 0.55, 0, Math.PI * 2); ctx.fill(); } }   // קו הכיוון
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a);                           // הקנה
    ctx.fillStyle = '#4d7c0f'; ctx.beginPath(); ctx.roundRect(-3 - rec, -2, 9.5, 4, 1); ctx.fill();
    ctx.fillStyle = '#365314'; ctx.fillRect(1 - rec, -2, 0.6, 4); ctx.fillRect(5.6 - rec, -2.3, 1, 4.6);
    ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(6.6 - rec, 0, 0.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    if (S && S.kick < 0.15) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(9, 0, 3 * (1 - S.kick / 0.15) + 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.moveTo(cx - 5, g); ctx.lineTo(cx - 1.5, cy); ctx.lineTo(cx + 1.5, cy); ctx.lineTo(cx + 5, g); ctx.fill();          // כן
    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(cx, cy, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2937'; for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.arc(cx + 8 + k * 2.2 - (k === 2 ? 3.3 : 0), g - 1.1 - (k === 2 ? 1.9 : 0), 1.1, 0, Math.PI * 2); ctx.fill(); }   // ערימת כדורים
  },
  front(o, S) {
    const g = GROUND;
    if (S.ball) { const [x, h] = cnAt(S.ball.i, S.ball.t); ctx.fillStyle = 'rgba(31,41,55,.3)'; for (const k of [0.05, 0.1]) { const [tx, th] = cnAt(S.ball.i, Math.max(0, S.ball.t - k)); ctx.beginPath(); ctx.arc(o.x + tx, g - th, 1, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(o.x + x, g - h, 1.5, 0, Math.PI * 2); ctx.fill(); }
    for (const b of S.boom) { const k = b.t / 0.8; ctx.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; star4(o.x + b.x + Math.cos(a) * k * 12, g - b.h + Math.sin(a) * k * 12 + k * k * 6, 2 * (1 - k) + 0.6, k * 4, i % 2 ? '#fde047' : '#ef4444'); } ctx.globalAlpha = 1; }
    for (const p of S.puffs) { ctx.fillStyle = 'rgba(120,113,108,' + (0.5 - p.t / 1.2) + ')'; ctx.beginPath(); ctx.arc(o.x + p.x, g - 1 - p.t * 4, 2 + p.t * 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b'; ctx.fillText('🎯 ' + S.n + ' / 3', o.x + CN.cx + 2, g - 34);
  },
  ninja(S, now) {
    let P = poseIdle(now);
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else { P.arms = [P.arms[0], [1.2 + S.av * 0.4, 1.3 + S.av * 0.4]]; P.lean = S.kick < 0.25 ? -0.15 : 0.08; if (S.kick < 0.25) P.eyes = 'squint'; }
    kxNinja(S, P);
  }
});
