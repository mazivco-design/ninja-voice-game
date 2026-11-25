/* ninja-voice-game – sk-lanes.js   (סקיצה, סבב 2 – 25 בנובמבר 2026; מחליפה את "ריצה מהגב" מסבב 1)
   פורטל הריצה – בהשראת Temple Run. נכנסים דרך הפורטל (sk-portal.js) לשביל עם שלושה מסלולים במבט מהגב.
   LEFT / RIGHT – להתחמק מסלעים ולאסוף מטבעות.  JUMP – מעל בול עץ שחוסם את כל השביל.  DOWN – מתחת לקורה נמוכה.
   נתקע – "OUCH!" (בלי לבבות).  נבנה על sketchkit.js + sk-portal.js. */

pfScene({
  type: 'lanerun', neg: 'left', pos: 'right', acts: { jump: 0.9, down: 1.1 }, hue: 265, banner: 'LEFT · RIGHT · JUMP · DOWN!',
  chips: { left: '← LEFT', right: 'RIGHT →', jump: '↑ JUMP', down: '↓ DOWN' },
  waves: [{ b: [1], c: 0 }, { all: 'jump' }, { b: [0], c: 1 }, { all: 'down' }, { b: [1, 2], c: 0 }, { b: [0], c: 1 }, { all: 'jump' }],
  vp: cx => [cx, 40], lanePos: (l, cx) => [cx + (l - 1) * 36, 92],
  bg(S, Wd, now, cx) {
    const hz = 40, Y = s => hz + 52 * s;
    let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#e0f2fe'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, hz);
    ctx.fillStyle = '#86efac'; for (const [mx, mw, mh] of [[-60, 50, 16], [-10, 60, 22], [50, 55, 14]]) { ctx.beginPath(); ctx.moveTo(cx + mx - mw / 2, hz); ctx.quadraticCurveTo(cx + mx, hz - mh * 2, cx + mx + mw / 2, hz); ctx.fill(); }
    g = ctx.createLinearGradient(0, hz, 0, 100); g.addColorStop(0, '#4ade80'); g.addColorStop(1, '#16a34a'); ctx.fillStyle = g; ctx.fillRect(0, hz, Wd, 100 - hz);
    const k1 = (100 - hz) / 52;
    ctx.fillStyle = '#c8a26b'; ctx.beginPath(); ctx.moveTo(cx - 2, hz); ctx.lineTo(cx + 2, hz); ctx.lineTo(cx + 56 * k1, 100); ctx.lineTo(cx - 56 * k1, 100); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 10; i++) { const z0 = ((i + 1 - (S.dist % 1)) / 10) * 1.2, z1 = z0 - 0.045; if (z1 < -0.02) continue; const s0 = pfS(z0), s1 = 1 / (1 + z1 * 7);
      for (const off of [-18, 18]) { ctx.lineWidth = 1.4 * s1; ctx.beginPath(); ctx.moveTo(cx + off * s0, Y(s0)); ctx.lineTo(cx + off * s1, Y(s1)); ctx.stroke(); } }
    for (let i = 0; i < 7; i++) { const z = ((i + 1 - (S.dist * 0.7 % 1)) / 7) * 1.3, s = pfS(z), y = Y(s);
      for (const side of [-1, 1]) { const x = cx + side * 74 * s; ctx.fillStyle = '#65a30d'; ctx.fillRect(x - 1.3 * s, y - 60 * s, 2.6 * s, 60 * s); ctx.fillStyle = '#4d7c0f'; ctx.beginPath(); ctx.ellipse(x + side * 5 * s, y - 46 * s, 7 * s, 2 * s, side * -0.5, 0, Math.PI * 2); ctx.fill(); } }
  },
  block([x, y], s) {                                                             // סלע
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(x - 13 * s, y); ctx.quadraticCurveTo(x - 12 * s, y - 16 * s, x - 2 * s, y - 19 * s); ctx.quadraticCurveTo(x + 11 * s, y - 17 * s, x + 13 * s, y); ctx.fill();
    ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(x - 9 * s, y - 4 * s); ctx.quadraticCurveTo(x - 8 * s, y - 14 * s, x - 2 * s, y - 16 * s); ctx.quadraticCurveTo(x - 1 * s, y - 8 * s, x - 9 * s, y - 4 * s); ctx.fill();
  },
  coin: (p, s, now) => pfCoin(p, s, now),
  wall(kind, P, s) {
    const [x, y] = P(1);
    if (kind === 'jump') {                                                       // בול עץ לרוחב השביל
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 0.5 * s, 58 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(x - 56 * s, y - 9 * s, 112 * s, 9 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#b45309'; ctx.fillRect(x - 54 * s, y - 8 * s, 108 * s, 2.4 * s);
      for (const sd of [-1, 1]) { ctx.fillStyle = '#fcd9a8'; ctx.beginPath(); ctx.ellipse(x + sd * 54 * s, y - 4.5 * s, 2.6 * s, 4.3 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {                                                                     // קורה נמוכה בין שני עמודים – מתכופפים
      for (const sd of [-1, 1]) { ctx.fillStyle = '#7c2d12'; ctx.fillRect(x + sd * 58 * s - 2 * s, y - 40 * s, 4 * s, 40 * s); }
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(x - 62 * s, y - 38 * s, 124 * s, 9 * s);
      ctx.fillStyle = '#fde047'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 22 * s - 3 * s, y - 36 * s); ctx.lineTo(x + k * 22 * s + 3 * s, y - 36 * s); ctx.lineTo(x + k * 22 * s, y - 31 * s); ctx.fill(); }
    }
  },
  hero(S, [x, y], now) {
    const jump = S.act === 'jump' ? Math.sin(Math.min(1, S.actT / 0.9) * Math.PI) * 17 : 0, duck = S.act === 'down' ? Math.sin(Math.min(1, S.actT / 1.1) * Math.PI) : 0;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y + 0.5, 8 - jump * 0.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    pfNinjaBack(x, y, now, { run: !jump, tilt: (S.lane - S.lx) * 0.28, lift: jump, sy: 1 - Math.min(1, duck * 1.6) * 0.45 });
  }
});
