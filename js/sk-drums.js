/* ninja-voice-game – sk-drums.js   (סקיצה, סבב 1 – 25 בנובמבר 2026)
   תופי הצבעים – זיכרון, בהשראת Simon. החבר (המתופף) עומד ליד שלושה תופי טאיקו: אדום, כחול, ירוק – ורואים אותו מרחוק.
   הוא מתופף רצף (התוף מהבהב והמשחק אומר את שם הצבע), ואז תור הילד: לומר את הצבעים באותו סדר – RED / BLUE / GREEN.
   שלושה סיבובים: רצף של שניים, שלושה וארבעה. טעות – "Oops!" והרצף מושמע שוב. אין צ'יפ עם התשובה (זה משחק זיכרון);
   רק אחרי שתיקה המשחק לוחש את הצבע הבא.  נבנה על sketchkit.js. */

const DM = { drums: [28, 40, 52], master: 64, cols: ['#ef4444', '#3b82f6', '#22c55e'], words: ['red', 'blue', 'green'], sfx: ['thud', 'hit', 'pop'],
             seqs: [[0, 2], [1, 0, 2], [2, 1, 1, 0]], beat: 0.8 };
function dmFlash(S, i) { S.fl[i] = 1; sfx(DM.sfx[i]); }
function dmDrum(x, i, fl, wrong) {
  const g = GROUND, y = g - 9, sh = wrong ? Math.sin(performance.now() / 20) * 0.5 : 0, s = 1 + fl * 0.18;
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 4, g); ctx.lineTo(x + 2.5, y + 2); ctx.moveTo(x + 4, g); ctx.lineTo(x - 2.5, y + 2); ctx.stroke();   // חצובה
  ctx.save(); ctx.translate(x + sh, y); ctx.scale(s, s);
  if (fl > 0.05) { ctx.fillStyle = 'rgba(255,255,255,' + fl * 0.6 + ')'; ctx.beginPath(); ctx.arc(0, 0, 7.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = DM.cols[i]; ctx.beginPath(); ctx.arc(0, 0, 5.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = DM.cols[i]; ctx.globalAlpha = 0.35 + fl * 0.65; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#facc15'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 5.1, Math.sin(a) * 5.1, 0.35, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
kxScene({
  type: 'simondrum', listen: DM.words, w: 84, e0: 12, banner: 'RED · BLUE · GREEN – remember!', time: 40, coins: 5, chip: false, hint: 5, autoGap: 0.7,
  start: () => ({ p: 'intro', r: 0, k: 0, idx: 0, fl: [0, 0, 0], hitT: 9, wrong: -1, mT: 9, mx: DM.master }),
  update(S, dt, demo) {
    for (let i = 0; i < 3; i++) S.fl[i] = Math.max(0, S.fl[i] - dt * 2.5);
    S.hitT += dt; S.mT += dt;
    const seq = DM.seqs[S.r];
    if (S.p === 'intro' && S.t > 1.2) { kxP(S, 'show'); S.k = 0; }
    else if (S.p === 'show') {                                                   // המאסטר מתופף את הרצף
      if (S.k < seq.length && S.t >= 0.5 + S.k * DM.beat) { const i = seq[S.k++]; dmFlash(S, i); S.mT = 0; S.mi = i; if (!demo) speak(DM.words[i]); }
      if (S.t >= 0.5 + seq.length * DM.beat + 0.3) { kxP(S, 'input'); S.idx = 0; }
    } else if (S.p === 'oops' && S.t > 1.3) { S.wrong = -1; kxP(S, 'show'); S.k = 0; }
    else if (S.p === 'good' && S.t > 1.1) { S.r++; if (S.r >= DM.seqs.length) { kxP(S, 'win'); sfx('win'); } else { kxP(S, 'show'); S.k = 0; } }
    else if (S.p === 'win') { if (S.t < 1.6 && Math.floor(S.t / 0.2) !== Math.floor((S.t - dt) / 0.2)) dmFlash(S, Math.floor(S.t / 0.2) % 3); if (S.t > 2) kxP(S, 'exit'); }
    else if (S.p === 'exit') { S.mx += 15 * 1.25 * dt; if (kxExit(S, dt, DM.master)) return 'done'; }
  },
  expected: S => (S.p === 'input' ? [DM.words[DM.seqs[S.r][S.idx]]] : []),
  cmd(S, w) {
    if (S.p !== 'input') return;
    const i = DM.words.indexOf(w), seq = DM.seqs[S.r]; S.hitT = 0;
    if (i === seq[S.idx]) { dmFlash(S, i); S.idx++; if (S.idx >= seq.length) { kxP(S, 'good'); floatText(S.o.x + 40, GROUND - 30, ['GOOD!', 'GREAT!', 'AMAZING! ⭐'][S.r], '#16a34a'); } }
    else { S.wrong = i; sfx('thud'); floatText(S.o.x + DM.drums[i], GROUND - 20, 'Oops!', '#dc2626'); kxP(S, 'oops'); }
  },
  draw(o, S) {
    for (let i = 0; i < 3; i++) dmDrum(o.x + DM.drums[i], i, S ? S.fl[i] : 0, S && S.wrong === i);
    const now = performance.now() / 1000, P = poseIdle(now + 0.4);
    if (S && S.p === 'exit') { kxFriend(o.x + S.mx, poseRun(S.mx * 0.5), 1); return; }
    if (!S) P.arms = [P.arms[0], [2.7, 3.0 + Math.sin(now * 8) * 0.35]];           // מרחוק: מנופף
    else if (S.mT < 0.3) { const k = Math.sin(S.mT / 0.3 * Math.PI); P.arms = [[0.6 + k, 1.2 + k], [0.8 + k * 1.4, 1.4 + k * 1.4]]; P.lean = 0.15 * k; }
    else if (S.p === 'input') { P.arms = [P.arms[0], [1.2, 2.6]]; P.headTilt = 0.1; }   // יד ליד האוזן – מקשיב
    else if (S.p === 'good' || S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    const h = kxFriend(o.x + DM.master, P, -1);
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.lineTo(h[0] - 2.5, h[1] - 2.5); ctx.stroke();   // מקל תיפוף
  },
  front(o, S) {
    const seq = DM.seqs[S.r] || [], cx = o.x + 40, y = GROUND - 24, now = performance.now() / 1000;
    if (S.p === 'show' || S.p === 'input' || S.p === 'oops' || S.p === 'good') {
      ctx.fillStyle = 'rgba(15,23,42,.7)'; ctx.beginPath(); ctx.roundRect(cx - seq.length * 2.6 - 2, y - 2.6, seq.length * 5.2 + 4, 5.2, 2.6); ctx.fill();
      for (let k = 0; k < seq.length; k++) {                                     // משבצות הרצף: מתמלאות בצבע כשהילד צודק
        const shown = S.p === 'show' ? k < S.k && k === S.k - 1 && S.fl[seq[k]] > 0.2 : k < S.idx;
        ctx.fillStyle = shown ? DM.cols[seq[k]] : 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(cx - (seq.length - 1) * 2.6 + k * 5.2, y, 1.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '900 3.4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b';
      ctx.fillText(S.p === 'show' ? '👀 WATCH' : S.p === 'input' ? '🎤 YOUR TURN' : '', cx, y - 5 + (S.p === 'input' ? Math.sin(now * 6) * 0.3 : 0));
    }
    for (let i = 0; i < 3; i++) if (S.fl[i] > 0.3) { ctx.fillStyle = DM.cols[i]; ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillText(DM.words[i].toUpperCase(), o.x + DM.drums[i], GROUND - 17 - (1 - S.fl[i]) * 3); }
  },
  ninja(S, now) {
    let P = poseIdle(now);
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.hitT < 0.3) { const k = Math.sin(S.hitT / 0.3 * Math.PI); P.arms = [P.arms[0], [0.5 + k * 1.6, 0.8 + k * 1.6]]; P.lean = 0.12 * k; }
    else if (S.p === 'oops') { P.eyes = 'squint'; P.arms = [P.arms[0], [0.9, 2.9]]; }
    else if (S.p === 'good' || S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else if (S.p === 'show') P.headTilt = -0.1;
    kxNinja(S, P);
  }
});
