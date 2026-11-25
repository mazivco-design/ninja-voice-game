/* ninja-voice-game – sk-dojo.js   (סקיצה, סבב 3 – 25 בנובמבר 2026)
   חקה את המאסטר – לזהות תנועה ולומר את שמה, בהשראת PaRappa the Rapper ו-Simon Says. החבר (המאסטר) עומד על במת עץ ועושה תנועה בלי לדבר:
   קופץ, בועט, חוסם או מתכופף. הילד אומר את שם התנועה – JUMP / KICK / BLOCK / DOWN – והנינג'ה מחקה אותה.
   פס זמן מתרוקן: תשובה מהירה = FAST! ⭐. טעות – "Oops!" והמאסטר מראה שוב. אין צ'יפ עם התשובה; אחרי שתיקה המשחק לוחש.
   שמונה תנועות, כל פעם קצת יותר מהר.  נבנה על sketchkit.js. */

const DJ = { mx: 44, moves: ['jump', 'kick', 'down', 'block', 'kick', 'jump', 'block', 'down'], fast: 2.2, col: { jump: '#3b82f6', kick: '#ef4444', down: '#22c55e', block: '#a855f7' } };
function djPose(m, t, now) {                                                     // תנועה m בזמן t (שניות); מחזיר [תנוחה, גובה]
  const c = t % 1.2, k = Math.min(1, c / 0.7);
  if (m === 'jump') return c < 0.7 ? [poseAir(k < 0.5, k), Math.sin(k * Math.PI) * 9] : [poseIdle(now), 0];
  if (m === 'kick') { const P = poseIdle(now); if (c < 0.7) applyKick(P, k); return [P, 0]; }
  if (m === 'down') return [poseDuck(), 0];
  if (m === 'block') { const P = poseIdle(now); P.legs = [[-0.5, -0.4], [0.45, 0.1]]; return [applyBlock(P), 0]; }
  return [poseIdle(now), 0];
}
kxScene({
  type: 'dojocopy', listen: ['jump', 'kick', 'down', 'block'], w: 70, e0: 14, banner: 'Copy the sensei! JUMP · KICK · BLOCK · DOWN', time: 30, coins: 5, chip: false, hint: 4.5, autoGap: 0.6,
  start: () => ({ p: 'bow', n: 0, doM: null, doT: 9, combo: 0, oops: 9 }),
  update(S, dt) {
    S.doT += dt; S.oops += dt;
    if (S.p === 'bow' && S.t > 1.2) kxP(S, 'show');
    else if (S.p === 'good' && S.t > 0.95) { S.n++; if (S.n >= DJ.moves.length) { kxP(S, 'win'); sfx('win'); } else kxP(S, 'show'); }
    else if (S.p === 'win' && S.t > 1.8) kxP(S, 'exit');
    else if (S.p === 'exit' && kxExit(S, dt, DJ.mx + 10)) return 'done';
  },
  expected: S => (S.p === 'show' && S.t > 0.7 ? [DJ.moves[S.n]] : []),
  hintWord: S => (S.p === 'show' ? DJ.moves[S.n] : null),
  cmd(S, w) {
    if (S.p !== 'show' || S.t < 0.25) return;
    S.doM = w; S.doT = 0;
    if (w !== DJ.moves[S.n]) { S.oops = 0; S.combo = 0; sfx('thud'); floatText(S.o.x + S.nx, GROUND - 22, 'Oops!', '#dc2626'); return; }
    const fast = S.t < DJ.fast - S.n * 0.1; S.combo++; sfx(fast ? 'coin' : 'pop');
    floatText(S.o.x + S.nx + 2, GROUND - 24, fast ? 'FAST! ⭐' : 'GOOD!', fast ? '#ca8a04' : '#16a34a'); kxP(S, 'good');
  },
  draw(o, S) {
    const g = GROUND, cx = o.x + DJ.mx, now = performance.now() / 1000;
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(cx - 11, g - 2.2, 22, 2.2, 0.5); ctx.fill();                                // במת עץ
    ctx.fillStyle = '#b45309'; ctx.fillRect(cx - 11, g - 2.2, 22, 0.7);
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 12, g); ctx.lineTo(cx + 12, g - 26); ctx.stroke();   // דגל הדוג'ו
    ctx.fillStyle = '#fef2f2'; ctx.beginPath(); ctx.roundRect(cx + 12.6, g - 26, 7, 13, 0.6); ctx.fill(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.arc(cx + 16.1, g - 19.5, 2.1, 0, Math.PI * 2); ctx.fill();
    let P = poseIdle(now + 0.4), h = 0;
    if (!S) [P, h] = djPose(['kick', 'jump', 'block'][Math.floor(now / 1.2) % 3], now, now);          // מרחוק: רואים אותו מתאמן
    else if (S.p === 'bow') P.lean = 0.5 * Math.sin(Math.min(1, S.t / 1.0) * Math.PI);
    else if (S.p === 'show') [P, h] = djPose(DJ.moves[S.n], S.t, now);
    else if (S.p === 'good') P.arms = [P.arms[0], [2.3, 2.7]];
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else if (S.p === 'exit') P.arms = [P.arms[0], [2.7, 3.0 + Math.sin(now * 8) * 0.35]];   // נשאר על הבמה ומנופף לשלום
    kxFriend(cx, P, -1, 2.2 + h);
  },
  front(o, S) {
    const g = GROUND, cx = o.x + 29, y = g - 30, n = DJ.moves.length;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < S.n ? DJ.col[DJ.moves[i]] : 'rgba(30,41,59,.2)'; ctx.beginPath(); ctx.arc(cx - (n - 1) * 1.7 + i * 3.4, y, 1.15, 0, Math.PI * 2); ctx.fill(); }
    if (S.p === 'show') {                                                        // פס הזמן
      const lim = DJ.fast - S.n * 0.1, k = Math.max(0, 1 - S.t / lim);
      ctx.fillStyle = 'rgba(30,41,59,.2)'; ctx.beginPath(); ctx.roundRect(cx - 10, y + 3, 20, 1.6, 0.8); ctx.fill();
      if (k > 0) { ctx.fillStyle = k > 0.35 ? '#facc15' : '#f97316'; ctx.beginPath(); ctx.roundRect(cx - 10, y + 3, 20 * k, 1.6, 0.8); ctx.fill(); }
      ctx.font = '900 3.4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b'; ctx.fillText('🎤 WHAT IS IT?', cx, y - 4);
    }
    if (S.doT < 0.9 && S.doM) { ctx.font = '900 5px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = S.oops < 0.9 ? '#dc2626' : DJ.col[S.doM]; ctx.fillText(S.doM.toUpperCase() + (S.oops < 0.9 ? ' ✗' : '!'), o.x + S.nx, g - 17 - S.doT * 3); }
  },
  ninja(S, now) {
    let P = poseIdle(now), h = 0;
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.p === 'bow') P.lean = 0.5 * Math.sin(Math.min(1, S.t / 1.0) * Math.PI);
    else if (S.doT < 0.8 && S.doM) { [P, h] = djPose(S.doM, S.doT, now); if (S.oops < 0.8) P.eyes = 'squint'; }
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    kxNinja(S, P, h);
  }
});
