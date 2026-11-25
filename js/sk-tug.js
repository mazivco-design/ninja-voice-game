/* ninja-voice-game – sk-tug.js   (סקיצה, סבב 1 – 25 בנובמבר 2026)
   משיכת חבל – שיתוף פעולה עם החבר, מול סומו ענק. החבר כבר מחזיק את החבל ומחכה (רואים אותו ואת הסומו מרחוק).
   הסומו מאדים ונוהם ("HRRR!") – HOLD: מתבצרים ולא נגררים. לא אמרו HOLD – נגררים צעד קדימה (בלי לבבות).
   הסומו מתנשף ומזיע – PULL (עד פעמיים בכל הפסקה): מושכים אותו צעד אלינו. כשהדגל שעל החבל עובר את הקו – הסומו נופל על הפנים.
   נבנה על sketchkit.js. */

const TG = { fr: 20, sumo: 52, line: 34, win: -9, heave: 1.4, tired: 2.8 };
function tgSumo(x, S, now) {
  const g = GROUND, p = S ? S.sp : 'ready', t = S ? S.st : 0;
  const red = p === 'heave' ? kxE(t / 0.4) : 0, tired = p === 'tired', fall = p === 'fall' ? kxE(t / 0.5) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, g + 0.3, 9, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x - 6, g); ctx.rotate(-fall * 1.45 + (p === 'heave' ? 0.12 * red : tired ? -0.08 + Math.sin(now * 7) * 0.02 : 0)); ctx.translate(6, 0);   // נופל קדימה (שמאלה) על הפנים
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
function tgPose(S, now, ph) {                                                    // תנוחת המושכים: נשענים לאחור, ידיים על החבל
  const P = poseIdle(now + ph);
  if (!S) { P.arms = [[1.2, 1.4], [1.3, 1.5]]; P.lean = -0.1; return P; }
  if (S.p === 'exit') return poseRun((S.nx + ph * 9) * 0.55);
  if (S.p === 'win') { P.arms = [[2.5, 2.9], [2.6, 3.0]]; return P; }
  const jerk = S.pullT < 0.35 ? Math.sin(S.pullT / 0.35 * Math.PI) : 0, drag = S.dragT < 0.6 ? Math.sin(S.dragT / 0.6 * Math.PI) : 0;
  P.arms = [[1.2, 1.4], [1.3, 1.5]]; P.legs = [[-0.5, -0.2], [0.55, 0.15]];
  P.lean = -0.18 - jerk * 0.3 + drag * 0.45 - (S.holding ? 0.2 : 0); P.hipY = (P.hipY || -4.6) + (S.holding ? 0.9 : 0);
  if (S.holding || jerk) P.eyes = 'squint';
  return P;
}
kxScene({
  type: 'tugwar', listen: ['pull', 'hold'], w: 80, e0: 12, banner: 'HOLD when he pulls · PULL when he is tired!', time: 30, coins: 5, hint: 1.5, autoGap: 0.75,
  start: () => ({ p: 'grab', sp: 'ready', st: 0, pos: 0, px: 0, holding: 0, pulls: 0, pullT: 9, dragT: 9, fx: TG.fr }),
  update(S, dt) {
    S.st += dt; S.pullT += dt; S.dragT += dt; S.px += (S.pos - S.px) * Math.min(1, dt * 6);
    if (S.p === 'grab') { if (S.t > 0.8) { kxP(S, 'play'); S.sp = 'ready'; S.st = 0; } }
    else if (S.p === 'play') {
      if (S.sp === 'ready' && S.st > 1.0) { S.sp = 'heave'; S.st = 0; S.holding = 0; S.tugged = 0; sfx('swish'); if (S.dragged && state === 'play') speak('hold'); }   // נגררנו בפעם הקודמת – המשחק מזכיר
      else if (S.sp === 'heave') {
        if (S.st > 1.0 && !S.tugged) { S.tugged = 1; if (S.holding) { S.pos += 0.4; floatText(S.o.x + 16, GROUND - 22, 'STRONG!', '#16a34a'); } else { S.pos = Math.min(6, S.pos + 4); S.dragT = 0; S.dragged = 1; sfx('thud'); floatText(S.o.x + 16, GROUND - 22, 'Whoa!', '#dc2626'); } }
        if (S.st > TG.heave) { S.sp = 'tired'; S.st = 0; S.pulls = 0; S.holding = 0; }
      } else if (S.sp === 'tired' && S.st > TG.tired) { S.sp = 'ready'; S.st = 0.4; }
      if (S.pos <= TG.win) { kxP(S, 'win'); S.sp = 'fall'; S.st = 0; sfx('win'); floatText(S.o.x + 26, GROUND - 30, 'WE DID IT! ⭐', '#ca8a04'); }
    }
    else if (S.p === 'win') { if (S.st > 0.45 && !S.thud) { S.thud = 1; sfx('thud'); } if (S.t > 2.2) kxP(S, 'exit'); }
    else if (S.p === 'exit') { S.fx += 15 * 1.2 * dt; if (kxExit(S, dt, TG.sumo + 6)) return 'done'; }
  },
  expected: S => (S.p !== 'play' ? [] : S.sp === 'heave' && !S.holding && S.st > 0.2 && S.st < 1.0 ? ['hold'] : S.sp === 'tired' && S.pulls < 2 && S.st > 0.3 ? ['pull'] : []),
  cmd(S, w) {
    if (S.p !== 'play') return;
    if (w === 'hold' && (S.sp === 'heave' && !S.tugged || (S.sp === 'ready' && S.st > 0.6))) { S.holding = 1; kxOk(S, 'hold'); }
    else if (w === 'pull' && S.pullT > 0.5) {
      S.pullT = 0; sfx('swish');
      if (S.sp === 'tired' && S.pulls < 2) { S.pulls++; S.pos -= 3.2; kxOk(S, 'pull'); sfx('hit'); }
      else if (S.sp === 'heave') floatText(S.o.x + 16, GROUND - 22, 'Too strong!', '#64748b');   // מושכים כשהוא חזק – לא זז
    }
  },
  draw(o, S) {
    const g = GROUND, now = performance.now() / 1000, px = S ? S.px : 0, fall = S && S.sp === 'fall';
    ctx.fillStyle = '#fff'; ctx.fillRect(o.x + TG.line - 0.4, g - 0.3, 0.8, 3);                                            // הקו
    ctx.fillStyle = 'rgba(120,53,15,.35)'; ctx.beginPath(); ctx.ellipse(o.x + TG.line, g + 1.2, 5, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    tgSumo(o.x + TG.sumo + px + (fall ? -4 * kxE(S.st / 0.5) : 0), S, now);
    const exiting = S && S.p === 'exit', fP = tgPose(S, now, 0.4), fh = kxFriend(o.x + (S ? S.fx : TG.fr) + (exiting ? 0 : px), fP, 1);
    if (S) S.fHand = fh; else {                                                    // לפני שהתחלנו: החבר והסומו כבר מחזיקים את החבל
      ctx.strokeStyle = '#d6b37a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(fh[0] - 12, fh[1] + 5); ctx.quadraticCurveTo(fh[0] - 5, fh[1] + 4, fh[0], fh[1]); ctx.lineTo(o.x + TG.sumo - 9.5, g - 11.5); ctx.stroke();
    }
  },
  front(o, S) {
    if (S.p === 'exit') return;
    const g = GROUND, sx = o.x + TG.sumo + S.px - 9.5, sy = g - 11.5, a = S.nHand || [o.x + 14, g - 9], f = S.fHand || a;
    ctx.strokeStyle = '#d6b37a'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0] - 7, a[1] + 6); ctx.quadraticCurveTo(a[0] - 4, a[1] + 1, a[0], a[1]); ctx.lineTo(f[0], f[1]);
    if (S.sp === 'fall') ctx.quadraticCurveTo((f[0] + sx) / 2, g - 2, sx - 6, g - 1); else ctx.lineTo(sx, sy);
    ctx.stroke();
    const fx = o.x + TG.line + S.px, fy = f[1] + (sy - f[1]) * ((fx - f[0]) / Math.max(1, sx - f[0]));                      // הדגל על החבל
    if (S.sp !== 'fall') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 1.6, fy + 4); ctx.lineTo(fx - 1.6, fy + 4); ctx.fill(); }
  },
  ninja(S, now) { const P = tgPose(S, now, 0), h = kxNinja({ o: S.o, nx: S.nx + (S.p === 'exit' ? 0 : S.px) }, P); S.nHand = h; }
});
