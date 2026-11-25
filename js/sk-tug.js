/* ninja-voice-game – sk-tug.js   (סקיצה, סבב 1 – 25 בנובמבר 2026; גרסה שנייה אחרי המשוב של זיו: "יותר חבל ויותר תחושה של מאבק ומשיכה")
   משיכת חבל – שיתוף פעולה עם החבר, מול סומו ענק. חבל ארוך ועבה מעל בור בוץ; החבר והסומו כבר מחזיקים בו כשמגיעים.
   המאבק רציף: הסומו כל הזמן גורר קצת. כשהוא מאדים ונוהם ("HRRR!") הוא גורר חזק – HOLD: מתבצרים וכמעט לא זזים.
   כשהוא מתנשף – PULL (עד פעמיים בכל הפסקה): גוררים אותו אלינו. הדגל שעל החבל זז הלוך ושוב מעל הבוץ.
   תחושת המאבק: כולם נשענים חזק לאחור, הרגליים חורשות תלמים, אבק עולה, החבל נמתח ורועד והתמונה רועדת קצת במשיכה.
   הסומו נגרר עד שפת הבור – ונופל לבוץ. אי אפשר להפסיד (הגרירה נעצרת לפני הבור).  נבנה על sketchkit.js. */

const TG = { fr: 18, mud: 42, mudW: 9, sumo: 68, win: -13, max: 9, heave: 1.4, tired: 2.7, pull: 2.9 };
function tgSumo(x, S, now, lean) {
  const g = GROUND, p = S ? S.sp : 'ready', t = S ? S.st : 0;
  const red = p === 'heave' ? kxE(t / 0.4) : 0, tired = p === 'tired', fall = p === 'fall' ? kxE(t / 0.5) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, g + 0.3, 9, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x - 6, g); ctx.rotate(-fall * 1.45 + (fall ? 0 : (lean || 0)) + (tired ? Math.sin(now * 7) * 0.02 : 0)); ctx.translate(6, 0);   // נופל קדימה (שמאלה) על הפנים
  const skin = red > 0 ? 'rgb(' + Math.round(245 - red * 10) + ',' + Math.round(201 - red * 70) + ',' + Math.round(160 - red * 60) + ')' : '#f5c9a0';
  ctx.fillStyle = skin; for (const sx of [-3.6, 3.6]) { ctx.beginPath(); ctx.roundRect(sx - 2.4, -6, 4.8, 6, 2); ctx.fill(); }               // רגליים
  ctx.beginPath(); ctx.ellipse(0, -12, 8.5, 8.5 + (tired ? Math.sin(now * 7) * 0.5 : 0), 0, 0, Math.PI * 2); ctx.fill();                       // בטן
  ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(0, -7.2, 7.6, 3.2, 0, 0, Math.PI); ctx.fill(); ctx.fillRect(-7.6, -8.2, 15.2, 1.6);   // מאוואשי
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(-1, -23, 4.6, 0, Math.PI * 2); ctx.fill();                                                     // ראש
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.ellipse(0, -27.4, 3.4, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0.5, -29, 1.3, 0, Math.PI * 2); ctx.fill();   // קוקו
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';                                                                     // פנים – פונה שמאלה
  if (tired || fall) { ctx.beginPath(); ctx.moveTo(-4, -24); ctx.lineTo(-2.6, -23.4); ctx.moveTo(-4, -23); ctx.lineTo(-2.6, -23.6); ctx.stroke(); ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.ellipse(-3.6, -20.6, 0.9, 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(-3.2, -23.6, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4.8, -25.6 + red * 0.8); ctx.lineTo(-2, -25 - red * 0.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4.4, -21); ctx.lineTo(-2.4, p === 'heave' ? -20.4 : -21.2); ctx.stroke(); }
  ctx.strokeStyle = skin; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-9.5, -11.5); ctx.stroke();                     // זרועות אל החבל
  ctx.restore();
  if (tired) { ctx.fillStyle = '#38bdf8'; for (let k = 0; k < 3; k++) { const a = (now * 1.6 + k / 3) % 1; ctx.beginPath(); ctx.arc(x + 3 + k * 2.5, g - 27 + a * 8, 0.7, 0, Math.PI * 2); ctx.fill(); } }
  if (p === 'heave') { ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#b91c1c'; ctx.fillText('HRRR!', x + Math.sin(now * 40) * 0.4, g - 33); }
  if (tired) { ctx.font = '900 3.2px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#0369a1'; ctx.fillText('phew...', x, g - 33); }
}
function tgPose(S, now, ph) {                                                    // תנוחת המושכים: נשענים חזק לאחור, ידיים על החבל
  const P = poseIdle(now + ph);
  if (S && S.p === 'exit') return poseRun((S.nx + ph * 9) * 0.55);
  if (S && S.p === 'win') { P.arms = [[2.5, 2.9], [2.6, 3.0]]; return P; }
  const jerk = S && S.pullT < 0.4 ? Math.sin(S.pullT / 0.4 * Math.PI) : 0, drag = S && S.sp === 'heave' && !S.holding ? 1 : 0, hold = S && S.holding ? 1 : 0;
  const strain = Math.sin(now * 9 + ph * 5) * 0.03;
  P.arms = [[1.25, 1.45], [1.35, 1.55]];
  P.legs = drag ? [[-0.2 + Math.sin(now * 14) * 0.3, -0.1], [0.7 + Math.cos(now * 14) * 0.3, 0.3]] : [[-0.75, -0.25], [0.6, 0.15]];   // נגררים – הרגליים מדשדשות
  P.lean = -0.42 - jerk * 0.28 - hold * 0.15 + drag * 0.55 + strain; P.hipY = (P.hipY || -4.6) + 0.7 + hold * 0.7 + jerk * 0.4;
  if (hold || jerk || drag) P.eyes = 'squint';
  return P;
}
function tgDust(S, x, n) { for (let k = 0; k < n; k++) S.dust.push({ x: x + (Math.random() - 0.5) * 3, h: 0.5, vx: (Math.random() - 0.3) * 8, vh: 3 + Math.random() * 6, t: 0 }); }
function tgRope(pts, tense, now, shift) {                                        // חבל עבה ושזור; מתוח – רועד, רפוי – שוקע
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.round(Math.abs(x1 - x0) / 3));
      for (let k = 1; k <= n; k++) { const u = k / n, sag = Math.sin(u * Math.PI) * (1 - tense) * Math.min(3, Math.abs(x1 - x0) * 0.08), jit = tense * Math.sin(now * 70 + (x0 + u * 9) * 2) * 0.22 * Math.sin(u * Math.PI);
        ctx.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + sag + jit); } } };
  ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 1.7; path(); ctx.stroke();
  ctx.strokeStyle = '#d9b77c'; ctx.lineWidth = 1.2; path(); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,80,30,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([0.5, 1.3]); ctx.lineDashOffset = -shift; path(); ctx.stroke(); ctx.setLineDash([]);
}
kxScene({
  type: 'tugwar', listen: ['pull', 'hold'], w: 100, e0: 10, banner: 'HOLD when he pulls · PULL when he is tired!', time: 34, coins: 5, hint: 1.5, autoGap: 0.75,
  start: () => ({ p: 'grab', sp: 'ready', st: 0, pos: 0, px: 0, holding: 0, pulls: 0, pullT: 9, shk: 0, fx: TG.fr, dust: [], lo: 0, hi: 0, drops: [] }),
  update(S, dt) {
    S.st += dt; S.pullT += dt; S.shk = Math.max(0, S.shk - dt * 2.5);
    const px0 = S.px; S.px += (S.pos - S.px) * Math.min(1, dt * 5); S.lo = Math.min(S.lo, S.px); S.hi = Math.max(S.hi, S.px);
    if (Math.abs(S.px - px0) > dt * 1.2 && Math.random() < dt * 22) { const dir = S.px > px0 ? 1 : -1; tgDust(S, dir > 0 ? S.nx + S.px + 2 : TG.sumo + S.px - 4, 1); tgDust(S, dir > 0 ? S.fx + S.px + 2 : TG.sumo + S.px + 3, 1); }
    for (const d of S.dust) { d.t += dt; d.x += d.vx * dt; d.h += d.vh * dt; d.vh *= Math.pow(0.2, dt); } S.dust = S.dust.filter(d => d.t < 0.8);
    for (const d of S.drops) { d.t += dt; d.vh -= 60 * dt; d.x += d.vx * dt; d.h += d.vh * dt; } S.drops = S.drops.filter(d => d.h > -1);
    if (S.p === 'grab') { if (S.t > 0.8) { kxP(S, 'play'); S.sp = 'ready'; S.st = 0; } }
    else if (S.p === 'play') {
      let drift = 0.5;                                                           // הסומו תמיד גורר קצת
      if (S.sp === 'ready' && S.st > 1.0) { S.sp = 'heave'; S.st = 0; S.holding = 0; sfx('swish'); if (S.dragged && state === 'play') speak('hold'); S.dragged = 0; }
      else if (S.sp === 'heave') {
        drift = S.st > 0.35 ? (S.holding ? 0.4 : 5.2) : 0.5; S.shk = Math.max(S.shk, S.st > 0.35 ? 0.5 : 0);
        if (S.st > 0.35 && !S.holding && !S.dragged) { S.dragged = 1; sfx('thud'); floatText(S.o.x + 16, GROUND - 24, 'Whoa!', '#dc2626'); }
        if (S.st > 0.35 && S.holding && !S.strong) { S.strong = 1; floatText(S.o.x + 16, GROUND - 24, 'STRONG!', '#16a34a'); }
        if (S.st > TG.heave) { S.sp = 'tired'; S.st = 0; S.pulls = 0; S.holding = 0; S.strong = 0; }
      } else if (S.sp === 'tired') { drift = 0; if (S.st > TG.tired) { S.sp = 'ready'; S.st = 0.3; } }
      S.pos = Math.min(TG.max, S.pos + drift * dt);
      if (S.pos <= TG.win) { kxP(S, 'win'); S.sp = 'fall'; S.st = 0; S.pos = TG.win - 6; sfx('win'); floatText(S.o.x + 26, GROUND - 32, 'WE DID IT! ⭐', '#ca8a04'); }
    }
    else if (S.p === 'win') {
      if (S.st > 0.5 && !S.thud) { S.thud = 1; sfx('splash'); S.shk = 1; for (let k = 0; k < 22; k++) { const a = Math.PI * (0.15 + Math.random() * 0.7); S.drops.push({ x: TG.mud + (Math.random() - 0.5) * 8, h: 0, vx: Math.cos(a) * 16, vh: Math.sin(a) * (14 + Math.random() * 14), t: 0 }); } }
      if (S.t > 2.4) kxP(S, 'exit');
    }
    else if (S.p === 'exit') { S.fx += 15 * 1.2 * dt; if (kxExit(S, dt, TG.sumo + 6)) return 'done'; }
  },
  expected: S => (S.p !== 'play' ? [] : S.sp === 'heave' && !S.holding && S.st > 0.05 && S.st < 0.9 ? ['hold'] : S.sp === 'tired' && S.pulls < 2 && S.st > 0.3 ? ['pull'] : []),
  hintWord: S => (S.p !== 'play' ? null : S.sp === 'tired' && S.pulls < 2 ? 'pull' : null),
  cmd(S, w) {
    if (S.p !== 'play') return;
    if (w === 'hold' && (S.sp === 'heave' || (S.sp === 'ready' && S.st > 0.5))) { S.holding = 1; kxOk(S, 'hold'); }
    else if (w === 'pull' && S.pullT > 0.5) {
      S.pullT = 0; sfx('swish');
      if (S.sp === 'tired' && S.pulls < 2) { S.pulls++; S.pos -= TG.pull; S.shk = 1; kxOk(S, 'pull'); sfx('hit'); tgDust(S, TG.sumo + S.px - 4, 5); }
      else if (S.sp === 'heave') floatText(S.o.x + 16, GROUND - 24, 'Too strong!', '#64748b');   // מושכים כשהוא חזק – לא זז
    }
  },
  draw(o, S) {
    const g = GROUND, now = performance.now() / 1000, px = S ? S.px : 0, fall = S && S.sp === 'fall', sh = S ? Math.sin(now * 55) * S.shk * 0.35 : 0;
    const mx = o.x + TG.mud;                                                     // בור הבוץ
    ctx.fillStyle = '#5b3a1e'; ctx.beginPath(); ctx.ellipse(mx, g + 0.6, TG.mudW, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4f28'; ctx.beginPath(); ctx.ellipse(mx - 1, g + 0.3, TG.mudW * 0.7, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b5e34'; for (let k = 0; k < 3; k++) { const a = (now * 0.5 + k / 3) % 1; ctx.beginPath(); ctx.arc(mx - 4 + k * 4, g + 0.4, 0.3 + a * 0.6, 0, Math.PI * 2); ctx.fill(); }
    if (S) {                                                                     // תלמים באדמה מאחורי הרגליים
      ctx.strokeStyle = 'rgba(91,58,30,.55)'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      for (const bx of [S.nx - 1.5, S.nx + 1.5, TG.fr - 1.5, TG.fr + 1.5, TG.sumo - 3.6, TG.sumo + 3.6]) { ctx.beginPath(); ctx.moveTo(o.x + bx + S.lo, g + 0.5); ctx.lineTo(o.x + bx + S.hi, g + 0.5); ctx.stroke(); }
    }
    const sLean = !S ? 0.14 : S.sp === 'heave' ? 0.3 : S.sp === 'tired' ? 0.02 : 0.16;   // הסומו נשען לאחור (ימינה)
    const sx = o.x + TG.sumo + (fall ? kxL(px0(S), TG.mud + 5 - TG.sumo, kxE(S.st / 0.5)) : px) + sh;
    tgSumo(sx, S, now, sLean);
    if (S) S.sumoX = sx;
    if (fall && S.st > 0.5) { ctx.fillStyle = '#7a4f28'; ctx.beginPath(); ctx.ellipse(sx - 14, g - 1.5, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }   // בוץ על הפנים
    const exiting = S && S.p === 'exit', fP = tgPose(S, now, 0.4), fh = kxFriend(o.x + (S ? S.fx : TG.fr) + (exiting ? 0 : px + sh), fP, 1);
    if (S) S.fHand = fh;
    else tgRope([[fh[0] - 14, g - 0.6], [fh[0] - 7, g - 0.8], [fh[0], fh[1]], [o.x + TG.sumo - 9.5, g - 11.5]], 0.5, now, 0);
  },
  front(o, S) {
    const g = GROUND, now = performance.now() / 1000;
    for (const d of S.dust) { ctx.fillStyle = 'rgba(214,190,150,' + (0.7 * (1 - d.t / 0.8)) + ')'; ctx.beginPath(); ctx.arc(o.x + d.x, g - d.h, 0.8 + d.t * 1.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#7a4f28'; for (const d of S.drops) { ctx.beginPath(); ctx.arc(o.x + d.x, g - d.h, 0.8, 0, Math.PI * 2); ctx.fill(); }
    if (S.p === 'exit') return;
    const a = S.nHand || [o.x + 14, g - 9], f = S.fHand || a, fall = S.sp === 'fall';
    const tense = fall ? 0 : S.sp === 'heave' || S.pullT < 0.5 ? 1 : S.sp === 'tired' ? 0.45 : 0.75;
    const end = fall ? [o.x + TG.mud - 6, g - 0.6] : [S.sumoX - 9.5, g - 11.5];
    tgRope([[a[0] - 13, g - 0.6], [a[0] - 6, g - 0.9], [a[0], a[1]], [f[0], f[1]], end], tense, now, S.px);
    if (!fall) {                                                                 // הדגל: תלוי על החבל, זז איתו מעל הבוץ
      const fx = o.x + TG.mud + S.px * 1.0, u = (fx - f[0]) / Math.max(1, end[0] - f[0]), fy = f[1] + (end[1] - f[1]) * u + 0.6;
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx - 0.5, fy); ctx.lineTo(fx + 2.2, fy + 5); ctx.lineTo(fx - 2.4, fy + 5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.35; ctx.setLineDash([0.8, 0.8]); ctx.beginPath(); ctx.moveTo(o.x + TG.mud, g - 22); ctx.lineTo(o.x + TG.mud, g - 1); ctx.stroke(); ctx.setLineDash([]);   // קו האמצע
    }
  },
  ninja(S, now) { const sh = Math.sin(now * 55) * S.shk * 0.35, P = tgPose(S, now, 0), h = kxNinja({ o: S.o, nx: S.nx + (S.p === 'exit' ? 0 : S.px + sh) }, P); S.nHand = h; }
});
function px0(S) { return S.pxWin === undefined ? (S.pxWin = S.px) : S.pxWin; }   // איפה הסומו עמד כשהפסיד
