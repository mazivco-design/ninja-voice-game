/* ninja-voice-game – wolves.js
   WOLVES (יער מושלג בערב): הנינג'ה נעצר על סלע קטן, וזאבים יוצאים מבין העצים משני הצדדים ומצמצמים את המעגל.
   כדור פורח מגיע מלמעלה, החבר בסל משלשל חבל:
   · CATCH – תופס את החבל.  · HOLD – הכדור הפורח מרים אותו (זאב קופץ ומפספס) ועף איתו מעל הזאבים.
   · LET GO – מעל הגבעה הבטוחה: עוזב את החבל ונוחת.
   אם הזאבים מגיעים אליו לפני שהתרומם – נפגע, הזאבים נסוגים, והחבל משתלשל מחדש.
   פאזות: arrive → circle → rope → caught → lift → ride → lower → hover → drop → land → exit */

const WF = { stop: 30, rockH: 2.4, hill: 108, hillW: 30, hillH: 8, flyV: 16, liftT: 1.7, liftH: 11, balH: 25, balS: 1.6, lowerT: 1.3, arriveT: 1.8, balloonIn: 1.0, balloonT: 2.4,
             ropeT: 0.8, bite: 9.5, backT: 1.1, hint: 4, hintEvery: 6, coins: 4, after: 40 };
const WF_WOLVES = [{ side: -1, d0: 32, sp: 0.8 }, { side: 1, d0: 30, sp: 0.85 }, { side: 1, d0: 50, sp: 1 }];   // צד, מרחק התחלה, יחס מהירות (הזאב המהיר מגיע ראשון)
const WF_THREAT = { easy: 17, medium: 13, hard: 10 };                              // כמה שניות עד שהזאבים מגיעים (מההתחלה של המעגל)
let wolfS = null;   // { o, p, t, k (0..1 – כמה התקרבו), idle, hinted, miss, leapT }

function wfSetup(o) { o.w = WF.hill + WF.hillW + WF.after; }
function wfBusy() { return !!wolfS; }
function wfCamLift() {                                                             // כמה להוריד את המצלמה: כשהסצנה על המסך
  const o = obstacles.find(o => o.type === 'wolfden' && !o.passed && o.x < viewR() + 30 && o.x + o.w > viewL());
  return o ? 16 : 0;
}
function wfC(o) { return o.x + WF.stop - PLAYER.w / 2; }                            // מרכז הסלע (העולם)
function wfHillX(o) { return o.x + WF.hill; }
function wfHillY(o, x) {                                                            // גובה הגבעה בנקודה x
  const u = (x - wfHillX(o)) / WF.hillW;
  if (Math.abs(u) >= 1) return 0;
  const a = Math.abs(u); return WF.hillH * (a < 0.45 ? 1 : 1 - Math.pow((a - 0.45) / 0.55, 2) * (3 - 2 * (a - 0.45) / 0.55));
}
function wfThreat() { return (WF_THREAT[diffKey] || 13) * (cfg && cfg.forgive ? 1.15 : 1); }
function wfDist(i) {                                                                 // כמה רחוק זאב i מהסלע
  const W8 = WF_WOLVES[i], S = wolfS, k = S ? S.k : 0;
  return Math.max(WF.bite, W8.d0 - (W8.d0 - WF.bite) * Math.min(1, k * W8.sp));
}
function wfSpeed() {
  if (!wolfS) return null;
  const S = wolfS, p = S.p;
  if (p === 'ride') return WF.flyV * Math.min(1, S.t / 0.8);
  if (p === 'exit') return null;
  return 0;
}
function wfUpdate(dt, pb) {
  if (!wolfS) {
    const o = obstacles.find(o => o.type === 'wolfden' && !o.passed && pb.r >= o.x + WF.stop - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - (o.x + WF.stop); if (over > 0) ropeShiftBy(-over);
    py = WF.rockH; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    wolfS = { o, p: 'arrive', t: 0, k: 0, idle: 0, hinted: 0, miss: 0, leapT: -1, bal: 0 };
    sfx('woof');
    return;
  }
  const S = wolfS, o = S.o; S.t += dt;
  if (!obstacles.includes(o)) { wolfS = null; return; }
  const go = p => { S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }, demo = state !== 'play';
  if (demo) {
    const dc = (w, at) => { if (S.t > at) { const p = S.p; command(w, 'demo'); if (S.p !== p) speak(w); } };
    if (S.p === 'rope') dc('catch', 0.7); else if (S.p === 'caught') dc('hold', 0.9); else if (S.p === 'hover') dc('let go', 0.8);
  }
  const closing = ['circle', 'rope', 'caught'].includes(S.p);
  if (closing && !demo) S.k += dt / wfThreat();                                       // הזאבים מתקרבים (בהדגמה – רק קצת)
  if (closing && demo) S.k = Math.min(0.35, S.k + dt / wfThreat());
  if (S.p !== 'arrive') S.bal = Math.min(1, S.bal + dt / WF.balloonT);              // הכדור הפורח יורד אל מעל הסלע
  if (closing && Math.random() < dt * 0.5) sfx('woof');                               // נהמות
  // הזאבים הגיעו – נפגע, והכול מתחיל מחדש
  if (closing && S.k >= 1) {
    shakeT = 0.3; sfx('hit'); burst(PLAYER.x + 4, GROUND - 6, '#e2e8f0', 10, 16); S.miss++;
    const w = (wfExpected() || [])[0];
    go('back');
    if (state === 'play' && !shieldSave() && !dragonSave()) {                          // כמו בדו-קרב: לב אחד, והמילה נשמעת
      hits++; if (typeof voiceMark === 'function') voiceMark('hit');
      flash = { text: '🐺 ' + (w || 'catch').toUpperCase() + '!', t: 1.4 }; if (w) speak(w);
      if (isFinite(lives)) { lives--; renderHud(); if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; } }
      renderHud();
    }
    return;
  }
  switch (S.p) {
    case 'arrive': if (S.t >= WF.arriveT) go('circle'); break;                       // הזאבים יוצאים מבין העצים
    case 'back':                                                                       // נסוגים אחרי הנשיכה
      S.k = Math.max(0, S.k - dt / WF.backT);
      if (S.t >= WF.backT) { S.k = 0; go(S.bal >= 1 ? 'rope' : 'circle'); S.ropeK = 0; }
      break;
    case 'circle': if (S.bal >= 1) { go('rope'); S.ropeK = 0; } break;
    case 'rope': S.ropeK = Math.min(1, (S.ropeK || 0) + dt / WF.ropeT); break;
    case 'lift': if (S.leapT < 0 && S.t > 0.35) S.leapT = 0; if (S.t >= WF.liftT) go('ride'); break;
    case 'ride': if (PLAYER.x + PLAYER.w / 2 >= wfHillX(o) - 1) go('lower'); break;
    case 'lower': if (S.t >= WF.lowerT) go('hover'); break;
    case 'drop': if (S.t >= 0.32) { go('land'); sfx('thud'); burst(PLAYER.x + 4, GROUND - WF.hillH, '#f8fafc', 8, 10); } break;
    case 'land': if (S.t >= 0.7) go('exit'); break;
    case 'exit':
      if (PLAYER.x > wfHillX(o) + WF.hillW + 2) {
        cleared(o); wolfS = null;
        if (mode === 'journey' && state === 'play') { picked += WF.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + WF.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
  }
  if (S.leapT >= 0) S.leapT += dt;
  if (S.ropeK !== undefined && S.p !== 'rope' && S.p !== 'back') S.ropeK = 1;
  // רמז כשהשחקן שותק (במסע – חצי לב, פעם אחת לכל המכשול)
  const want = wfExpected();
  if (want && want.length && !demo && state === 'play' && (S.p !== 'rope' || S.ropeK >= 1)) {
    S.idle += dt;
    if (S.idle >= WF.hint + S.hinted * WF.hintEvery) { S.hinted++; sayWords([want[0]], 1.6, S); }
  }
}
function wfPhysics() {
  if (!wolfS) return false;
  const S = wolfS, p = S.p, o = S.o; vy = 0;
  const e = q => q * q * (3 - 2 * q), bob = Math.sin(performance.now() / 1000 * 2.2) * 0.6;
  if (p === 'lift') py = WF.rockH + (WF.liftH - WF.rockH) * e(Math.min(1, S.t / WF.liftT));
  else if (p === 'ride') py = WF.liftH + bob * Math.min(1, S.t);
  else if (p === 'lower') py = WF.liftH + (WF.hillH + 3.5 - WF.liftH) * e(Math.min(1, S.t / WF.lowerT));
  else if (p === 'hover') py = WF.hillH + 3.5 + bob * 0.5;
  else if (p === 'drop') { const k = Math.min(1, S.t / 0.32); py = WF.hillH + 3.5 * (1 - k * k); }
  else if (p === 'land' || p === 'exit') py = wfHillY(o, PLAYER.x + PLAYER.w / 2);
  else py = WF.rockH;
  return true;
}

/* ---------- פקודות ---------- */
function wfCmd(word) {
  if (!wolfS || !['catch', 'hold', 'let go'].includes(word)) return false;
  const S = wolfS, go = p => { S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; };
  if (word === 'catch' && S.p === 'rope' && S.ropeK >= 0.7) { go('caught'); sfx('swish'); }
  else if (word === 'hold' && S.p === 'caught') { go('lift'); S.leapT = -1; sfx('wind'); }
  else if (word === 'let go' && S.p === 'hover') { go('drop'); sfx('swish'); }
  return true;
}
function wfExpected() {
  if (!wolfS) return null;
  const p = wolfS.p;
  return p === 'rope' ? ['catch'] : p === 'caught' ? ['hold'] : p === 'hover' ? ['let go'] : [];
}
function wfAuto() {
  const S = wolfS; if (!S) return;
  if ((S.p === 'rope' && S.ropeK >= 1 && S.t > 1) || (S.p === 'caught' && S.t > 0.6) || (S.p === 'hover' && S.t > 0.5)) command(wfExpected()[0], 'auto');
}

/* ---------- תנוחות ---------- */
function wfHanging() { return !!wolfS && ['caught', 'lift', 'ride', 'lower', 'hover'].includes(wolfS.p); }
function wfPose(P) {
  if (!wolfS) return P;
  const S = wolfS, p = S.p, now = performance.now() / 1000;
  if (wfHanging()) {
    P = poseIdle(now); const sw = Math.sin(now * 2.2) * 0.12;
    P.arms = [[2.95, 3.05], [2.95, 3.05]]; P.lean = sw; P.bob = 0;
    P.legs = p === 'caught' ? P.legs : [[-0.25 + sw, -0.15], [0.2 + sw, 0.25]];
    P.eyes = p === 'caught' || p === 'lift' ? 'wide' : P.eyes;
    return P;
  }
  if (p === 'drop') return poseAir(true);
  if (p === 'exit') return S.t < 0.5 ? poseWalk(S.t * 20) : P;
  if (p === 'land') { P = poseIdle(now); return P; }
  P = poseIdle(now);                                                                   // על הסלע: מסתכל על הזאבים / למעלה אל הכדור הפורח
  P.eyes = 'wide';
  if (p === 'rope') { P.headTilt = -0.3; P.arms = [[1.6, 2.2], [1.7, 2.3]]; }
  else P.lean = -0.06;
  return P;
}

/* ---------- ציור ---------- */
function wfRnd(i) { const x = Math.sin(i * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); }
function wfMask(o, x) {                                                              // 0 מחוץ לסצנה, 1 בתוכה – עם מעבר רך
  const a = o.x - 70, b = o.x + o.w + 10, r = 40;
  return Math.max(0, Math.min(1, (x - a) / r, (b - x) / r));
}
function drawWolfFig(x, y, dir, t, mode) {                                           // dir: 1 = פונה ימינה, -1 = שמאלה
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const walk = mode === 'walk' || mode === 'run', legA = walk ? Math.sin(t * (mode === 'run' ? 16 : 9)) * 0.5 : 0;
  const body = '#6b7280', dark = '#374151', light = '#8d94a0';                       // כל הגוף בצבע אחד, גוון בהיר רק על הגב
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 0.3, 8, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = body; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  [[-5, 1], [-3.4, -1], [4, 1], [5.6, -1]].forEach(([lx, d]) => { ctx.beginPath(); ctx.moveTo(lx, -5); ctx.lineTo(lx + Math.sin(legA * d) * 2.6, -0.3); ctx.stroke(); });
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -7, 8, 3.6, 0.04, 0, Math.PI * 2); ctx.fill();   // גוף
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -7, 8, 3.6, 0.04, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-0.5, -10.2, 7.2, 1.9, 0.03, 0, Math.PI * 2); ctx.fill(); ctx.restore();   // גוון בהיר על הגב
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-7.4, -8.5); ctx.quadraticCurveTo(-12, -7 + Math.sin(t * 3) * 0.8, -13.5, -3.5 + Math.sin(t * 3) * 0.8); ctx.quadraticCurveTo(-10, -6, -7.2, -6.2); ctx.fill();   // זנב
  const hy = mode === 'growl' ? -8.4 : mode === 'up' ? -12 : -9.5;                     // ראש: מורכן כשנוהם, מורם כשמסתכל למעלה
  ctx.save(); ctx.translate(6.5, hy);
  if (mode === 'up') ctx.rotate(-0.5);
  const snarl = mode !== 'up';                                                          // נוהם – פה פתוח עם ניבים (חוץ מכשמסתכל למעלה)
  const open = mode === 'growl' ? 1.25 : mode === 'run' ? 1.4 : snarl ? 0.75 : 0.2;
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0.5, 0, 3.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1.8, -1.5); ctx.lineTo(7.2, 0.1); ctx.lineTo(7, 0.9); ctx.lineTo(2, 0.9); ctx.fill();   // לסת עליונה וחוטם
  ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(2.4, 0.9); ctx.lineTo(6.9, 0.9); ctx.lineTo(6.2, 0.9 + open); ctx.lineTo(2.4, 1.2 + open * 0.6); ctx.fill();   // פה פתוח (אדום כהה)
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(2.2, 1.2 + open * 0.6); ctx.lineTo(6.2, 0.9 + open); ctx.lineTo(5.9, 1.6 + open); ctx.lineTo(2.2, 2.2 + open * 0.5); ctx.fill();   // לסת תחתונה
  ctx.fillStyle = '#fff';                                                              // ניבים חדים למעלה ולמטה
  for (const [x, l] of [[3.3, 1.0], [4.4, 0.7], [5.4, 0.7], [6.4, 1.1]]) { ctx.beginPath(); ctx.moveTo(x - 0.32, 0.9); ctx.lineTo(x, 0.9 + l * Math.min(1, open + 0.2)); ctx.lineTo(x + 0.32, 0.9); ctx.fill(); }
  if (open > 0.5) for (const [x, l] of [[3.8, 0.8], [5.8, 0.8]]) { const y0 = 0.9 + open * 0.95; ctx.beginPath(); ctx.moveTo(x - 0.3, y0 + 0.2); ctx.lineTo(x, y0 - l * 0.8); ctx.lineTo(x + 0.3, y0 + 0.2); ctx.fill(); }
  ctx.strokeStyle = dark; ctx.lineWidth = 0.22;                                        // קמטים של נהימה על החוטם
  if (snarl) { ctx.beginPath(); ctx.moveTo(3.8, -0.7); ctx.quadraticCurveTo(4.3, -1.1, 4.8, -0.6); ctx.moveTo(4.6, -0.4); ctx.quadraticCurveTo(5.1, -0.8, 5.6, -0.3); ctx.stroke(); }
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(7.05, 0.35, 0.55, 0, Math.PI * 2); ctx.fill();   // אף
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-1.6, -1.6); ctx.lineTo(-1.1, -5.4); ctx.lineTo(0.6, -2); ctx.fill(); ctx.beginPath(); ctx.moveTo(0.2, -2); ctx.lineTo(1.1, -5.6); ctx.lineTo(2.2, -1.6); ctx.fill();   // אוזניים מחודדות לאחור
  // עין צרה וחדה: שקד צהוב-כתום עם אישון אנכי, וגבה כהה בזווית למטה
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(1.6, -0.5); ctx.quadraticCurveTo(2.5, -1.3, 3.4, -0.9); ctx.quadraticCurveTo(2.5, -0.15, 1.6, -0.5); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(2.6, -0.75, 0.16, 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.45; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1.3, -1.7); ctx.lineTo(3.6, -1.05); ctx.stroke();   // גבה זועפת
  ctx.restore();
  ctx.restore();
}
function drawPine(x, base, h, seed) {
  const w = h * 0.42;
  ctx.fillStyle = '#3f2a1d'; ctx.fillRect(x - 0.6, base - h * 0.18, 1.2, h * 0.18);
  for (let k = 0; k < 3; k++) {
    const y0 = base - h * 0.15 - k * h * 0.27, ww = w * (1 - k * 0.27);
    ctx.fillStyle = '#1f3b33'; ctx.beginPath(); ctx.moveTo(x - ww, y0); ctx.lineTo(x, y0 - h * 0.42); ctx.lineTo(x + ww, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x - ww * 0.75, y0 - h * 0.08); ctx.lineTo(x, y0 - h * 0.42); ctx.lineTo(x + ww * 0.55, y0 - h * 0.1);
    ctx.quadraticCurveTo(x, y0 - h * 0.2 - wfRnd(seed + k) * 1.2, x - ww * 0.75, y0 - h * 0.08); ctx.fill();   // שלג על הענפים
  }
}
function drawWolfScene(o) {
  const L = viewL() - 2, R = viewR() + 2, t = performance.now() / 1000;
  // ערב: השמיים מתכהים לסגול ככל שהסצנה במרכז המסך
  const mid = wfMask(o, (L + R) / 2);
  if (mid > 0) {                                                                    // רקע שקט משלו: שמיים רכים + גבעות מושלגות רחוקות (מכסה את העצים של העולם)
    const top = (0 - oy) / scale - 2;
    ctx.globalAlpha = mid;
    const g = ctx.createLinearGradient(0, top, 0, GROUND);
    g.addColorStop(0, '#8fa3c8'); g.addColorStop(1, '#d6deec');
    ctx.fillStyle = g; ctx.fillRect(L, top, R - L, GROUND - top + 1);
    ctx.fillStyle = '#c3cde0'; ctx.beginPath(); ctx.moveTo(L, GROUND + 1);                 // גבעות רחוקות, נמוכות ובהירות
    for (let x = L; x <= R + 2; x += 2) ctx.lineTo(x, GROUND - 13 - Math.sin((x + bgX * 0.15) * 0.035) * 4 - Math.sin((x + bgX * 0.15) * 0.011 + 1) * 3);
    ctx.lineTo(R + 2, GROUND + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2e8f2'; ctx.beginPath(); ctx.moveTo(L, GROUND + 1);
    for (let x = L; x <= R + 2; x += 2) ctx.lineTo(x, GROUND - 6 - Math.sin((x + bgX * 0.3) * 0.05 + 2) * 2.5);
    ctx.lineTo(R + 2, GROUND + 1); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // בלי עצים – רקע שקט, שהזאבים והנינג'ה בולטים
  // שלג על הקרקע
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath(); ctx.moveTo(L, GROUND + 6);
  for (let x = L; x <= R; x += 1.5) { const m = wfMask(o, x); ctx.lineTo(x, GROUND - wfHillY(o, x) - 0.6 * m + (1 - m) * 6 + Math.sin(x * 0.35) * 0.25 * m); }
  ctx.lineTo(R, GROUND + 6); ctx.closePath();
  ctx.globalAlpha = 0.97; ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(L, GROUND + 6);
  for (let x = L; x <= R; x += 1.5) { const m = wfMask(o, x); ctx.lineTo(x, GROUND + 1.6 * m + (1 - m) * 6); }
  ctx.lineTo(R, GROUND + 6); ctx.closePath(); ctx.fill();
  // הגבעה הבטוחה
  // הסלע הקטן
  const c = wfC(o);
  ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(c - 6.5, GROUND + 0.5); ctx.quadraticCurveTo(c - 6, GROUND - WF.rockH - 0.6, c - 1, GROUND - WF.rockH); ctx.quadraticCurveTo(c + 5, GROUND - WF.rockH - 0.4, c + 6.5, GROUND + 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(c - 0.5, GROUND - WF.rockH + 0.1, 4.6, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  // נפתית שלג
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 26; i++) {
    const sx = L + ((wfRnd(i) * (R - L) + t * (3 + wfRnd(i + 9) * 3) + bgX * 0.3) % (R - L) + (R - L)) % (R - L), sy = (wfRnd(i + 4) * 80 + t * (5 + wfRnd(i + 2) * 4)) % 80;
    if (wfMask(o, sx) > 0.3) { ctx.beginPath(); ctx.arc(sx, sy, 0.35 + wfRnd(i + 7) * 0.3, 0, Math.PI * 2); ctx.fill(); }
  }
  // הזאבים
  const S = wolfS && wolfS.o === o ? wolfS : null;
  WF_WOLVES.forEach((W8, i) => {
    let d = S ? wfDist(i) : W8.d0 + 40, yy = GROUND, mode = 'walk', dir = -W8.side;
    if (S && S.p === 'arrive') d = W8.d0 + 40 * (1 - Math.min(1, S.t / WF.arriveT));    // יוצאים מבין העצים
    if (S && ['circle', 'rope', 'caught'].includes(S.p)) mode = Math.sin(t * 1.3 + i * 2) > 0.2 ? 'growl' : 'walk';
    if (S && S.p === 'back') mode = 'walk';
    if (S && ['lift', 'ride', 'lower', 'hover', 'drop', 'land', 'exit'].includes(S.p)) {
      mode = 'up'; d = S.liftD ? S.liftD[i] : d;
      if (!S.liftD) S.liftD = WF_WOLVES.map((w, j) => wfDist(j));
      if (i === 1 && S.leapT >= 0 && S.leapT < 0.9) { const k = S.leapT / 0.9; yy = GROUND - Math.sin(Math.PI * k) * 8; d = S.liftD[i] - Math.sin(Math.PI * k) * 5; mode = 'run'; }   // קופץ – ומפספס
    }
    if (!S) mode = 'walk';
    const x = c + W8.side * d;
    if (x < L - 20 || x > R + 20 || !S) return;
    drawWolfFig(x, yy, dir, t + i, mode);
  });
}
function drawBalloon(bx, by) {                                                        // by = תחתית הסל
  const t = performance.now() / 1000, sw = Math.sin(t * 1.4) * 0.6;
  ctx.save(); ctx.translate(bx + sw, by); ctx.scale(WF.balS, WF.balS);   // כדור פורח גדול באמת – החלק העליון יכול לצאת מהמסך
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.35;
  [[-3, -11.5], [3, -11.5], [-1, -11], [1, -11]].forEach(([x2, y2]) => { ctx.beginPath(); ctx.moveTo(x2 * 1.2, -3.6); ctx.lineTo(x2 * 2.4, y2 - 2); ctx.stroke(); });
  const g = ctx.createLinearGradient(-11, 0, 11, 0); g.addColorStop(0, '#b91c1c'); g.addColorStop(0.5, '#f87171'); g.addColorStop(1, '#991b1b');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-5, -12.5); ctx.bezierCurveTo(-14, -18, -13, -34, 0, -34); ctx.bezierCurveTo(13, -34, 14, -18, 5, -12.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(-1.6, -12.6); ctx.bezierCurveTo(-4.5, -18, -4.5, -33, 0, -34); ctx.bezierCurveTo(4.5, -33, 4.5, -18, 1.6, -12.6); ctx.closePath(); ctx.fill();   // פס צהוב באמצע
  ctx.fillStyle = '#92400e'; ctx.fillRect(-3.6, -3.6, 7.2, 3.6); ctx.fillStyle = '#b45309'; ctx.fillRect(-3.6, -3.6, 7.2, 0.8);   // הסל
  ctx.restore();
  drawFigure({ fx: bx + sw - 0.6, fy: by - 1.2, facing: -1, scale: 0.72, kind: 'ninja', accent: mudAccent(), pose: Object.assign(poseIdle(t), { arms: [[1.2, 1.6], [0.2, 0.4]] }) });   // החבר בסל
}
function drawWolves(o) {
  drawWolfScene(o);
  const S = wolfS && wolfS.o === o ? wolfS : null;
  if (!S || S.p === 'arrive' || S.p === 'exit') return;
  const nx = PLAYER.x + PLAYER.w / 2, e = q => q * q * (3 - 2 * q);
  let bx = nx + 1, by = GROUND - WF.rockH - WF.balH;                                        // מרחף מעל הנינג'ה
  if (S.p === 'circle' || (S.p === 'back' && S.bal < 1)) { const k = e(S.bal); bx = nx + 1 + (1 - k) * 80; by = by - (1 - k) * 60; }
  if (wfHanging() || S.p === 'drop' || S.p === 'land') by = GROUND - py - WF.balH;
  if (S.p === 'drop' || S.p === 'land') { const k = Math.min(1, (S.p === 'land' ? S.t + 0.32 : S.t) / 1.0); by = GROUND - WF.hillH - 3.5 - WF.balH - k * k * 30; bx = nx + 1 + k * 16; }
  // החבל
  const top = [bx, by];
  if (S.ropeK !== undefined && S.p !== 'drop' && S.p !== 'land') {
    let end;
    if (wfHanging()) end = playerHand;
    else { const len = S.ropeK * (WF.balH - 16.5), sw = Math.sin(performance.now() / 1000 * 2.4) * 1.4 * S.ropeK; end = [bx + sw, by + len]; }
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo((top[0] + end[0]) / 2 + 0.6, (top[1] + end[1]) / 2, end[0], end[1]); ctx.stroke();
    if (!wfHanging()) { ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(end[0], end[1], 0.7, 0, Math.PI * 2); ctx.fill(); }   // קשר בקצה
  }
  drawBalloon(bx, by);
}
