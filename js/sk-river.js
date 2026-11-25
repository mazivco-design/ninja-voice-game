/* ninja-voice-game – sk-river.js   (סקיצה, סבב 2 – 25 בנובמבר 2026)
   פורטל הנהר – בהשראת Toobin' / גלישת נהר. דרך הפורטל (sk-portal.js) נוחתים על קרש גלישה בנהר שזורם בקניון, במבט מהגב.
   LEFT / RIGHT – בין סלעים עם קצף, ולאסוף מטבעות.  JUMP – מעל בול עץ שצף לרוחב הנהר.
   נתקע – "OUCH!" (בלי לבבות).  נבנה על sketchkit.js + sk-portal.js. */

pfScene({
  type: 'portalriver', neg: 'left', pos: 'right', acts: { jump: 0.9 }, hue: 150, banner: 'LEFT · RIGHT · JUMP – ride the river!',
  chips: { left: '← LEFT', right: 'RIGHT →', jump: '↑ JUMP' },
  waves: [{ b: [1], c: 2 }, { b: [2], c: 1 }, { all: 'jump' }, { b: [0, 1], c: 2 }, { b: [2], c: 1 }, { all: 'jump' }],
  vp: cx => [cx, 36], lanePos: (l, cx) => [cx + (l - 1) * 34, 90],
  bg(S, Wd, now, cx) {
    const hz = 36, Y = s => hz + 54 * s, k1 = (100 - hz) / 54;
    let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#fdba74'); g.addColorStop(1, '#fef3c7'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, hz);
    ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.moveTo(cx - 40, hz); ctx.lineTo(cx - 26, hz - 14); ctx.lineTo(cx - 8, hz - 6); ctx.lineTo(cx + 12, hz - 18); ctx.lineTo(cx + 40, hz); ctx.fill();   // צוקים רחוקים
    for (const sd of [-1, 1]) {                                                  // קירות הקניון: עולים מהאופק אל שולי המסך
      const ex = sd > 0 ? Wd : 0;
      ctx.fillStyle = sd > 0 ? '#c2703a' : '#a85a2a'; ctx.beginPath(); ctx.moveTo(cx + sd * 3, hz); ctx.lineTo(cx + sd * 3, hz - 7); ctx.lineTo(ex, 4); ctx.lineTo(ex, 100); ctx.lineTo(cx + sd * 58 * k1, 100); ctx.fill();
      ctx.strokeStyle = 'rgba(120,53,15,.35)'; ctx.lineWidth = 0.6; for (const f of [0.3, 0.6]) { ctx.beginPath(); ctx.moveTo(cx + sd * 3, hz - 7 * f); ctx.lineTo(ex, 100 - 96 * f); ctx.stroke(); }
      ctx.fillStyle = '#65a30d'; ctx.beginPath(); ctx.moveTo(cx + sd * 3, hz - 7); ctx.lineTo(ex, 4); ctx.lineTo(ex, 0); ctx.lineTo(cx + sd * 3, hz - 8.5); ctx.fill();   // דשא על שפת הצוק
    }
    g = ctx.createLinearGradient(0, hz, 0, 100); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#0284c7'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 3, hz); ctx.lineTo(cx + 3, hz); ctx.lineTo(cx + 58 * k1, 100); ctx.lineTo(cx - 58 * k1, 100); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineCap = 'round';             // פסי זרם וקצף בגדות
    for (let i = 0; i < 16; i++) { const z0 = ((i + 1 - (S.dist * 1.3 % 1)) / 16) * 1.25, z1 = z0 - 0.05; if (z1 < -0.02) continue; const s0 = pfS(z0), s1 = 1 / (1 + z1 * 7), off = (hash(i * 7) - 0.5) * 96;
      ctx.lineWidth = 1.1 * s1; ctx.beginPath(); ctx.moveTo(cx + off * s0, Y(s0)); ctx.lineTo(cx + off * s1, Y(s1)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 9; i++) { const z = ((i + 1 - (S.dist % 1)) / 9) * 1.2, s = pfS(z); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sd * 56 * s, Y(s), 4 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill(); } }
  },
  block([x, y], s, now) {                                                        // סלע עם קצף
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x, y, 15 * s, 3.4 * s + Math.sin(now * 6) * 0.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.moveTo(x - 11 * s, y); ctx.quadraticCurveTo(x - 9 * s, y - 15 * s, x, y - 17 * s); ctx.quadraticCurveTo(x + 10 * s, y - 13 * s, x + 11 * s, y); ctx.fill();
    ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 4 * s); ctx.quadraticCurveTo(x - 6 * s, y - 12 * s, x - 1 * s, y - 14 * s); ctx.quadraticCurveTo(x, y - 7 * s, x - 7 * s, y - 4 * s); ctx.fill();
  },
  coin: (p, s, now) => pfCoin(p, s, now, 10),
  wall(kind, P, s) {                                                             // בול עץ שצף לרוחב הנהר
    const [x, y] = P(1);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x, y + 1 * s, 60 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(x - 56 * s, y - 7 * s, 112 * s, 8 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.fillRect(x - 54 * s, y - 6 * s, 108 * s, 2.2 * s);
    for (const sd of [-1, 1]) { ctx.fillStyle = '#fcd9a8'; ctx.beginPath(); ctx.ellipse(x + sd * 54 * s, y - 3 * s, 2.4 * s, 3.8 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  },
  hero(S, [x, y], now) {                                                         // הנינג'ה עומד על קרש, שובל מים מאחוריו
    const jump = S.act === 'jump' ? Math.sin(Math.min(1, S.actT / 0.9) * Math.PI) * 16 : 0, tilt = (S.lane - S.lx) * 0.3, bob = Math.sin(now * 5) * 0.7;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    if (!jump) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * 6, y + 1); ctx.quadraticCurveTo(x + sd * 12, y + 5, x + sd * (16 + Math.sin(now * 9) * 2), y + 11); ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 9, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.translate(x, y - jump + bob); ctx.rotate(tilt);
    ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.ellipse(0, 0.5, 11, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(0, -0.2, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.fillRect(-0.6, -2.4, 1.2, 4.6);
    ctx.restore();
    pfNinjaBack(x, y - 1.5 + bob, now, { tilt, lift: jump, arms: 1 });
  }
});
