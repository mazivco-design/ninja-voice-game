/* ninja-voice-game – sk-fly.js   (סקיצה, סבב 2 – 25 בנובמבר 2026)
   פורטל הדרקון – בהשראת Space Harrier / Star Fox. דרך הפורטל (sk-portal.js) יוצאים לשמיים, רכובים על דרקון, במבט מהגב.
   שלושה גבהים: UP / DOWN. ענני סערה עם ברקים מתקרבים – עוברים לגובה פנוי; טבעות זהב – עפים דרכן (נספרות כמטבעות).
   נכנס לענן – "OUCH!" (בלי לבבות).  נבנה על sketchkit.js + sk-portal.js. */

pfScene({
  type: 'portalfly', neg: 'up', pos: 'down', hue: 190, gateBase: 11.5, banner: 'UP · DOWN – fly the dragon!',
  chips: { up: '↑ UP', down: '↓ DOWN' },
  waves: [{ b: [1], c: 0 }, { b: [0], c: 1 }, { b: [1, 2], c: 0 }, { b: [0], c: 1 }, { b: [0, 1], c: 2 }, { b: [2], c: 1 }],
  vp: cx => [cx, 48], lanePos: (l, cx) => [cx, 26 + l * 24],
  bg(S, Wd, now, cx) {
    let g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, '#38bdf8'); g.addColorStop(0.6, '#bae6fd'); g.addColorStop(1, '#fde68a'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, 100);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx + 50, 20, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(cx + 50, 20, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a7f3d0'; for (const [mx, mw, mh] of [[-70, 60, 9], [0, 80, 12], [70, 60, 8]]) { ctx.beginPath(); ctx.moveTo(cx + mx - mw / 2, 100); ctx.quadraticCurveTo(cx + mx, 100 - mh * 2, cx + mx + mw / 2, 100); ctx.fill(); }   // הרים רחוקים למטה
    for (let i = 0; i < 12; i++) {                                               // עננים לבנים שחולפים בצדדים
      const z = ((i + 1 - (S.dist * 0.8 % 1)) / 12) * 1.4, s = pfS(z), side = i % 2 ? 1 : -1, ox = side * (55 + hash(i) * 60), oy = (hash(i + 20) - 0.5) * 110;
      const x = cx + ox * s, y = 48 + oy * s, r = 16 * s;
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, 0.3 + s) + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.ellipse(x - r * 0.4, y - r * 0.2, r * 0.5, r * 0.35, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.35, y - r * 0.25, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  block([x, y], s, now, l) {                                                     // ענן סערה עם ברק
    const r = 20 * s;
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, Math.PI * 2); ctx.ellipse(x - r * 0.6, y - r * 0.25, r * 0.7, r * 0.45, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.5, y - r * 0.3, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    if (Math.sin(now * 9 + l * 2) > 0.2) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(x + r * 0.1, y + r * 0.2); ctx.lineTo(x - r * 0.3, y + r * 0.85); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x - r * 0.2, y + r * 1.4); ctx.lineTo(x + r * 0.35, y + r * 0.6); ctx.lineTo(x + r * 0.05, y + r * 0.65); ctx.closePath(); ctx.fill(); }
  },
  coin([x, y], s) {                                                              // טבעת זהב לעוף דרכה
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3.4 * s; ctx.beginPath(); ctx.ellipse(x, y, 12 * s, 9 * s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.ellipse(x, y, 12 * s, 9 * s, 0, 0, Math.PI * 2); ctx.stroke();
  },
  wall() {},
  hero(S, [x, y], now) {                                                         // דרקון מהגב: כנפיים מתנופפות, זנב, והנינג'ה רכוב
    const flap = Math.sin(now * 8), pitch = (S.lane - S.lx) * 5, col = playerColor();
    y += Math.sin(now * 3) * 0.8;
    ctx.save(); ctx.translate(x, y);
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.moveTo(sd * 4, -1); ctx.quadraticCurveTo(sd * 16, -8 - flap * 9, sd * 30, -3 - flap * 12); ctx.quadraticCurveTo(sd * 24, 1 - flap * 5, sd * 19, 3 - flap * 4); ctx.quadraticCurveTo(sd * 14, 0 - flap * 2, sd * 10, 4); ctx.quadraticCurveTo(sd * 7, 1, sd * 4, 4); ctx.fill();
      ctx.strokeStyle = '#14532d'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(sd * 4, -1); ctx.quadraticCurveTo(sd * 16, -8 - flap * 9, sd * 30, -3 - flap * 12); ctx.stroke();
    }
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(Math.sin(now * 4) * 3, 11, Math.sin(now * 4 + 1) * 5, 17 + pitch * 0.4); ctx.stroke();   // זנב – אלינו
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, 1, 7.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -8 - pitch * 0.5, 3.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();                       // ראש הדרקון – מעבר לנינג'ה
    ctx.fillStyle = '#fef08a'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 1.6, -10 - pitch * 0.5); ctx.lineTo(sd * 3.2, -14.5 - pitch * 0.5); ctx.lineTo(sd * 3, -9.5 - pitch * 0.5); ctx.fill(); }
    ctx.fillStyle = '#facc15'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-1.2, 3 + k * 2.4); ctx.lineTo(0, 0.8 + k * 2.4); ctx.lineTo(1.2, 3 + k * 2.4); ctx.fill(); }   // קוצי גב
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.ellipse(0, -1.5, 3.4, 4, 0, 0, Math.PI * 2); ctx.fill();          // הנינג'ה
    ctx.fillStyle = '#273449'; ctx.beginPath(); ctx.arc(0, -6.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(-3, -8, 6, 1.4); const fl = Math.sin(now * 12) * 1.2; ctx.beginPath(); ctx.moveTo(0, -7.6); ctx.quadraticCurveTo(-3, -5 + fl, -6, -2 + fl); ctx.lineTo(-4.6, -1.6 + fl); ctx.quadraticCurveTo(-2, -5, 0.6, -6.6); ctx.fill();
    ctx.restore();
  }
});
