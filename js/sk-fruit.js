/* ninja-voice-game – sk-fruit.js   (סקיצה, סבב 1 – 25 בנובמבר 2026)
   נינג'ה פירות – תזמון, בהשראת Fruit Ninja. מעוט קטן מעיף פירות בקשת גבוהה, והם עוברים דרך עיגול מקווקו מול הנינג'ה.
   CUT כשהפרי בתוך העיגול – הנינג'ה מניף חרב, הפרי נחצה לשניים ומיץ ניתז. לפעמים עפה פצצה: לא חותכים!
   חתך פצצה – BOOM והנינג'ה מפויח לרגע (בלי לבבות). חמישה פירות חתוכים – סיום.  נבנה על sketchkit.js. */

const FC = { ringX: 24, ringH: 20, ringR: 7, from: 54, to: -6, T: 3.0, every: 2.4, need: 5, order: ['melon', 'orange', 'bomb', 'apple', 'melon', 'bomb', 'orange', 'apple', 'melon', 'orange'],
             skin: { melon: '#15803d', orange: '#f97316', apple: '#dc2626' }, flesh: { melon: '#fb7185', orange: '#fdba74', apple: '#fef3c7' } };
function fcPos(it) { const k = it.t / FC.T; return [kxL(FC.from, FC.to, k), Math.sin(k * Math.PI) * 22.5]; }
function fcIn(it, r) { const [x, h] = fcPos(it); return Math.abs(x - FC.ringX) < r && h > FC.ringH - r; }
function fcFruit(kind, x, y, r, rot, half) {                                     // half: 0 שלם, 1 / -1 חצי
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (kind === 'bomb') {
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.9, -r * 1.3); ctx.stroke();
    ctx.fillStyle = Math.sin(performance.now() / 40) > 0 ? '#facc15' : '#f97316'; ctx.beginPath(); ctx.arc(r * 0.9, -r * 1.3, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.1); ctx.lineTo(r * 0.4, r * 0.6); ctx.moveTo(r * 0.4, -r * 0.1); ctx.lineTo(-r * 0.4, r * 0.6); ctx.stroke();
  } else {
    const a0 = half ? (half > 0 ? -Math.PI / 2 : Math.PI / 2) : 0, a1 = half ? a0 + Math.PI : Math.PI * 2;
    ctx.fillStyle = FC.skin[kind]; ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fill();
    if (half) { ctx.fillStyle = FC.flesh[kind]; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.86, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'melon') { ctx.strokeStyle = '#14532d'; ctx.lineWidth = 0.4; for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(0, 0, r * Math.abs(k) + 0.2, r * 0.95, 0, 0, Math.PI * 2); ctx.stroke(); } }
    else { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(r * 0.3, -r, r * 0.4, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
kxScene({
  type: 'fruitcut', listen: ['cut'], w: 78, e0: 14, banner: 'CUT the fruit – not the bombs!', time: 28, coins: 5, hint: 1.3, autoGap: 0.5,
  start: () => ({ p: 'play', items: [], n: 0, next: 0.6, cuts: 0, slash: 9, halves: [], drops: [], soot: 0, launch: 9 }),
  update(S, dt) {
    S.slash += dt; S.launch += dt; if (S.soot > 0) S.soot -= dt;
    if (S.p === 'play') {
      S.next -= dt;
      if (S.next <= 0) { S.next = FC.every; S.items.push({ kind: FC.order[S.n++ % FC.order.length], t: 0, rot: 0 }); S.launch = 0; sfx('swish'); }
    }
    for (const it of S.items) { it.t += dt; it.rot += dt * 3; }
    S.items = S.items.filter(it => it.t < FC.T && !it.cut);
    for (const h of S.halves) { h.t += dt; h.vh -= 60 * dt; h.x += h.vx * dt; h.h += h.vh * dt; h.rot += h.vr * dt; }
    S.halves = S.halves.filter(h => h.h > -2);
    for (const d of S.drops) { d.t += dt; d.vh -= 70 * dt; d.x += d.vx * dt; d.h += d.vh * dt; }
    S.drops = S.drops.filter(d => d.t < 0.7);
    if (S.p === 'win' && S.t > 1.4) kxP(S, 'exit');
    if (S.p === 'exit' && kxExit(S, dt, FC.from)) return 'done';
  },
  expected: S => (S.p === 'play' && S.slash > 0.4 && S.items.some(it => it.kind !== 'bomb' && fcIn(it, 3.2)) ? ['cut'] : []),
  hintWord: S => (S.p === 'play' && S.items.some(it => it.kind !== 'bomb' && fcIn(it, FC.ringR)) ? 'cut' : null),
  cmd(S) {
    if (S.p !== 'play' || S.slash < 0.35) return;
    S.slash = 0; kxOk(S, 'cut'); sfx('swish');
    const it = S.items.find(it => fcIn(it, FC.ringR)); if (!it) return;
    const [x, h] = fcPos(it); it.cut = 1;
    if (it.kind === 'bomb') { S.soot = 1.5; sfx('thud'); floatText(S.o.x + x, GROUND - h - 6, 'BOOM!', '#1f2937'); for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28; S.drops.push({ x, h, vx: Math.cos(a) * 22, vh: Math.sin(a) * 22, t: 0, c: k % 2 ? '#f97316' : '#374151' }); } return; }
    S.cuts++; sfx('hit'); floatText(S.o.x + x, GROUND - h - 6, S.cuts < FC.need ? 'SLICE! ' + S.cuts : 'SLICE! ⭐', '#16a34a');
    for (const s of [1, -1]) S.halves.push({ kind: it.kind, x, h, vx: -8 + s * 7, vh: 10 + s * 6, rot: it.rot, vr: s * 6, half: s, t: 0 });
    for (let k = 0; k < 10; k++) S.drops.push({ x, h, vx: (Math.random() - 0.5) * 26, vh: Math.random() * 20, t: 0, c: FC.flesh[it.kind] });
    if (S.cuts >= FC.need) { kxP(S, 'win'); sfx('win'); }
  },
  draw(o, S) {
    const g = GROUND, cx = o.x + FC.from, k = S ? Math.min(1, S.launch / 0.25) : 1;   // המעוט: בסיס, זרוע שקופצת בכל שיגור, סל פירות
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(cx - 5, g); ctx.lineTo(cx, g - 6); ctx.lineTo(cx + 5, g); ctx.fill();
    ctx.save(); ctx.translate(cx, g - 6); ctx.rotate(kxL(-1.0, -0.2, k)); ctx.fillStyle = '#b45309'; ctx.fillRect(-9, -0.7, 12, 1.4); ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(-9, -0.4, 2, 0, Math.PI); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.roundRect(cx + 7, g - 5, 9, 5, 1); ctx.fill();
    fcFruit('melon', cx + 9.5, g - 6, 2.2, 0, 0); fcFruit('orange', cx + 13, g - 6.2, 1.9, 0, 0); fcFruit('apple', cx + 11.3, g - 8.2, 1.8, 0, 0);
    const rx = o.x + FC.ringX, ry = g - FC.ringH, hot = S && S.items.some(it => it.kind !== 'bomb' && fcIn(it, FC.ringR));
    ctx.strokeStyle = hot ? '#16a34a' : 'rgba(30,41,59,.45)'; ctx.lineWidth = hot ? 0.8 : 0.5; ctx.setLineDash([1.6, 1.4]); ctx.beginPath(); ctx.arc(rx, ry, FC.ringR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  },
  front(o, S) {
    const g = GROUND;
    for (const it of S.items) { const [x, h] = fcPos(it); fcFruit(it.kind, o.x + x, g - h, 4.2, it.rot, 0); }
    for (const h of S.halves) fcFruit(h.kind, o.x + h.x, g - h.h, 4.2, h.rot, h.half);
    for (const d of S.drops) { ctx.fillStyle = d.c; ctx.globalAlpha = 1 - d.t / 0.7; ctx.beginPath(); ctx.arc(o.x + d.x, g - d.h, 0.7, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
    if (S.slash < 0.22) {                                                        // שובל החרב
      const a = kxL(-2.2, 0.5, S.slash / 0.16), hx = o.x + S.nx + 2, hy = g - 11;
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - S.slash / 0.22) + ')'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, hy, 11, -2.2, a); ctx.stroke();
    }
    ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b'; ctx.fillText('🍉 ' + S.cuts + ' / ' + FC.need, o.x + FC.ringX, g - 34);
  },
  ninja(S, now) {
    let P = poseIdle(now), a = 2.6;
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else {
      if (S.slash < 0.35) a = S.slash < 0.16 ? kxL(2.9, 0.7, kxE(S.slash / 0.16)) : kxL(0.7, 2.6, kxE((S.slash - 0.16) / 0.19));
      P.arms = [P.arms[0], [a, a + 0.15]]; P.legs = [[-0.4, -0.3], [0.4, 0.1]]; P.lean = S.slash < 0.2 ? 0.15 : 0;
      if (S.soot > 0) P.eyes = 'squint';
      if (S.p === 'win') P.arms = [[2.5, 2.9], [2.9, 3.05]];
    }
    const h = kxNinja(S, P), ang = Math.PI / 2 - (P.arms[1][1] || a);                 // החרב ממשיכה את האמה
    if (S.p !== 'exit') {
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.lineTo(h[0] + Math.cos(ang) * 9, h[1] + Math.sin(ang) * 9); ctx.stroke();
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(h[0] - Math.cos(ang) * 1.2, h[1] - Math.sin(ang) * 1.2); ctx.lineTo(h[0] + Math.cos(ang) * 0.8, h[1] + Math.sin(ang) * 0.8); ctx.stroke();
    }
    if (S.soot > 0) { ctx.fillStyle = 'rgba(31,41,55,' + Math.min(0.75, S.soot) + ')'; ctx.beginPath(); ctx.ellipse(S.o.x + S.nx + 0.8, GROUND - 12.3, 2.4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
});
