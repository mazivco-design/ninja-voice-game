/* ninja-voice-game – fair.js
   דוכן המשחקים ביריד (שלב בפיתוח, 2026-11-24): הנינג'ה רץ בכפר בלילה ומגיע לדוכן יריד.
   ברגע שהוא עומד מולו – המסך מתחלף למבט מעבר לכתף שלו: רואים את הגב, הראש והיד שלו בפינה, ואת הדוכן מקרוב ובעומק.
   הכול בקול בלבד, בתזמון: הכוונת זזה לבד, והילד אומר THROW ברגע הנכון. שלוש תחנות:
     1. סל: סמן נע מצד לצד מעל פס עם אזור ירוק. THROW כשהוא בירוק – הכדור נכנס לסל. שלושה סלים.
     2. מטרות קופצות: מטרה צצה מאחד החורים ונעלמת מהר. THROW כשהיא בחוץ. שלוש פגיעות.
     3. פירמידת פחיות: כוונת נעה מעל הפחיות. THROW – הכדור מפיל את הפחיות שליד הכוונת (ומה שעליהן). עד שכולן נופלות.
   בסוף פרס (פנדה פרווה), והמסך חוזר לריצה הרגילה. בלי לבבות. אחרי שתיקה המשחק אומר THROW.
   הציור של מבט הכתף נעשה בפיקסלים של המסך (setTransform), בגובה מאה יחידות – לא בקואורדינטות העולם.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const FR = { e0: 14, b0: 26, b1: 76, w: 90, fade: 0.6, hint: 5, coins: 6, hoops: 3, pops: 3 };
let frS = null;
const frE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const frL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const frRnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function frNX() { return PLAYER.x + 4; }
function frSetup(o) { o.w = FR.w; }
function frStart(o) {
  frS = { o, p: 'in', t: 0, st: 0, idle: 0, hinted: 0, nx: FR.e0, msg: null, msgT: 9, throwT: 9, ball: null, score: 0, seed: 1, chipOk: 0,
          aim: 0, holes: [], cans: frCans(), done: 0 };
}
function frCans() {                                                              // פירמידה: שלוש למטה, שתיים באמצע, אחת למעלה
  const c = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) c.push({ x: (i - (2 - r) / 2) * 7, r, st: 'up', vx: 0, vy: 0, dx: 0, dy: 0, rot: 0, vr: 0 });
  return c;
}
function frP(p) { frS.p = p; frS.t = 0; frS.idle = 0; frS.hinted = 0; }
function frMsg(text) { frS.msg = text; frS.msgT = 0; }

/* ---------- העדכון ---------- */
function frUpdate(dt, pb) {
  if (!frS) {
    const o = obstacles.find(o => o.type === 'fair' && !o.passed && frNX() >= o.x + FR.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    frStart(o); return;
  }
  const S = frS, o = S.o; S.t += dt; S.msgT += dt; S.throwT += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { frS = null; return; }
  const demo = state !== 'play';
  switch (S.p) {
    case 'in': if (S.t >= FR.fade + 0.2) { S.st = 1; S.score = 0; frP('title'); frMsg('BASKETBALL'); } break;   // מעבר למבט הכתף
    case 'title': if (S.t >= 1.4) frP('play'); break;
    case 'play': frPlay(dt, demo); break;
    case 'next': frPlay(dt, true, true); if (S.t >= 1.3) { S.st++; S.score = 0; S.ball = null; if (S.st > 3) { frP('prize'); frMsg('YOU WIN!'); sfx('win'); } else { frP('title'); frMsg(['', 'BASKETBALL', 'POP-UP TARGETS', 'CAN PYRAMID'][S.st]); } } break;
    case 'prize': if (S.t >= 2.6) frP('out'); break;
    case 'out': if (S.t >= FR.fade) frP('exit'); break;                          // חזרה לריצה הרגילה
    case 'exit': {
      S.nx += 15 * dt;
      const over = o.x + S.nx - frNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + FR.b1 < -20 || S.t > 8) {
        cleared(o); frS = null;
        if (mode === 'journey' && state === 'play') { picked += FR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + FR.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
}
function frPlay(dt, demo, animOnly) {
  const S = frS, t = S.t;
  if (!animOnly) {                                                               // הכוונת הנעה של כל תחנה
    if (S.st === 1) S.aim = Math.sin(t * 2.1) * 0.95;                             // -1..1 מעל פס; הירוק באמצע
    if (S.st === 2) frHoles(dt);
    if (S.st === 3) S.aim = Math.sin(t * 1.6) * 0.95;
  }
  const B = S.ball;                                                              // הכדור / הכוכב באוויר
  if (B) {
    B.t += dt; const k = Math.min(1, B.t / B.T);
    if (k >= 1 && !B.done) { B.done = 1; frLand(B); }
    if (B.done && B.t > B.T + 1.0 && S.p === 'play') S.ball = null;
  }
  if (S.st === 2 && S.pop && S.pop.st === 'hit') S.pop.t += animOnly ? dt : 0;
  if (S.st === 3) for (const c of S.cans) if (c.st === 'fall') { c.vy += 120 * dt; c.dx += c.vx * dt; c.dy += c.vy * dt; c.rot += c.vr * dt; if (c.dy > 40) c.st = 'gone'; }
  if (animOnly) return;
  if (frWant()) {                                                                // רמז ושחקן מדגים
    if (demo) { command('throw', 'demo'); speak('throw'); }
    else if (state === 'play') { S.idle += dt; if (S.idle > FR.hint + S.hinted * FR.hint) { S.hinted++; speak('throw'); } }
  }
}
function frHoles(dt) {                                                           // תחנה 2: מטרה אחת קופצת בכל פעם
  const S = frS;
  if (!S.pop || S.pop.st === 'gone') {
    S.gap = (S.gap || 0) - dt;
    if (S.gap <= 0) { S.seed++; S.pop = { i: Math.floor(frRnd(S.seed) * 5), t: 0, st: 'up', up: 1.25 + frRnd(S.seed + 9) * 0.4 }; sfx('pop'); }
    return;
  }
  const P = S.pop; P.t += dt;
  if (P.st === 'up' && P.t > P.up) { P.st = 'down'; P.t = 0; }
  if (P.st === 'down' && P.t > 0.25) { P.st = 'gone'; S.gap = 0.5 + frRnd(S.seed + 3) * 0.6; }
  if (P.st === 'hit' && P.t > 0.6) { P.st = 'gone'; S.gap = 0.6; }
}
function frLand(B) {
  const S = frS;
  if (S.st === 1) {
    if (B.good) { S.score++; sfx('coin'); frMsg(S.score < FR.hoops ? 'SWISH! ' + S.score : 'SWISH! ⭐'); if (S.score >= FR.hoops) frP('next'); }
    else { sfx('thud'); frMsg('MISS'); }
  } else if (S.st === 2) {
    const P = S.pop;
    if (P && P.st === 'up' && P.i === B.i) { P.st = 'hit'; P.t = 0; S.score++; sfx('hit'); frMsg(S.score < FR.pops ? 'HIT! ' + S.score : 'HIT! ⭐'); if (S.score >= FR.pops) frP('next'); }
    else { sfx('thud'); frMsg('TOO LATE'); }
  } else if (S.st === 3) {
    let n = 0; const hitX = B.x;
    for (const c of S.cans) if (c.st === 'up' && Math.abs(c.x - hitX) < 5.5 && c.r === 0) { frKnock(c, hitX); n++; }
    for (const c of S.cans) if (c.st === 'up' && Math.abs(c.x - hitX) < 4 && c.r > 0) { frKnock(c, hitX); n++; }
    let again = true; while (again) { again = false;                               // פחית שאין מתחתיה תמיכה – נופלת
      for (const c of S.cans) if (c.st === 'up' && c.r > 0) { const sup = S.cans.filter(d => d.r === c.r - 1 && d.st === 'up' && Math.abs(d.x - c.x) < 4).length; if (sup < 2) { frKnock(c, hitX); n++; again = true; } } }
    if (n) { sfx('hit'); frMsg(n >= 3 ? 'CRASH!' : 'BANG!'); } else { sfx('thud'); frMsg('MISS'); }
    if (S.cans.every(c => c.st !== 'up')) { frMsg('ALL DOWN! ⭐'); frP('next'); }
  }
}
function frKnock(c, hx) { c.st = 'fall'; c.vx = (c.x - hx) * 6 + (frRnd(c.x + c.r) - 0.3) * 20; c.vy = -30 - frRnd(c.r + 5) * 20; c.vr = (frRnd(c.x * 3) - 0.5) * 14; }
function frWant() {                                                              // האם עכשיו רגע טוב לזרוק
  const S = frS; if (!S || S.p !== 'play' || S.ball || S.throwT < 0.4) return false;
  if (S.st === 1) return Math.abs(S.aim) < 0.18;
  if (S.st === 2) return S.pop && S.pop.st === 'up' && S.pop.t > 0.15 && S.pop.t < S.pop.up - 0.45;
  if (S.st === 3) { const x = S.aim * 14; return S.cans.some(c => c.st === 'up' && c.r === 0 && Math.abs(c.x - x) < 2.5); }
  return false;
}
function frPhysics() { if (!frS) return false; vy = 0; py = 0; return true; }
function frSpeed() { return frS ? 0 : null; }

/* ---------- פקודות ---------- */
function frCmd(word) {
  if (!frS || word !== 'throw') return false;
  const S = frS; if (S.p !== 'play' || S.ball || S.throwT < 0.4) return true;
  S.throwT = 0; S.chipOk = 0.9; S.idle = 0; S.hinted = 0; sfx('swish');
  if (S.st === 1) S.ball = { T: 0.75, t: 0, good: Math.abs(S.aim) < 0.24, x: S.aim };
  else if (S.st === 2) S.ball = { T: 0.32, t: 0, i: S.pop && S.pop.st === 'up' ? S.pop.i : Math.floor(frRnd(S.seed + 4) * 5) };
  else S.ball = { T: 0.55, t: 0, x: S.aim * 14 };
  return true;
}
function frExpected() { const S = frS; if (!S) return null; return frWant() ? ['throw'] : []; }
function frAuto() { if (frS && frWant()) command('throw', 'auto'); }
function frTap() { return frS && frS.p === 'play' ? 'throw' : null; }

/* ---------- הצד: הדוכן מרחוק והנינג'ה מגיע/יוצא ---------- */
function frPanda(x, y, s) {                                                      // פנדה פרווה (הפרס)
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -3.6, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2937'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 1.7, -5.3, 0.8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(sx * 0.8, -3.7, 0.55, 0.7, sx * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx * 2.3, 0, 0.8, 1.5, sx * 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 0.75, -3.85, 0.18, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(0, -2.9, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(-1.4, -3.0, 0.3, 0, Math.PI * 2); ctx.arc(1.4, -3.0, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawFair(o) {                                                           // הדוכן במבט הצד (לפני ואחרי)
  const S = frS && frS.o === o ? frS : null, g = GROUND, X0 = o.x + FR.b0, X1 = o.x + FR.b1;
  ctx.fillStyle = '#fde68a'; ctx.fillRect(X0, g - 30, X1 - X0, 30);
  ctx.fillStyle = '#fcd34d'; for (let x = X0; x < X1; x += 6) ctx.fillRect(x, g - 30, 3, 30);
  const hx = (X0 + X1) / 2 - 10;                                                 // סל קטן, מטרה ופחיות על הקיר – רמז למה שבפנים
  ctx.fillStyle = '#fff'; ctx.fillRect(hx - 4, g - 27, 8, 5); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(hx, g - 21.5, 2.4, 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  for (const [r, c] of [[3, '#ef4444'], [2, '#fff'], [1, '#ef4444']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx + 14, g - 22, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#94a3b8'; for (const [cx, cy] of [[-2, 0], [0, 0], [2, 0], [-1, -2.4], [1, -2.4], [0, -4.8]]) ctx.fillRect(hx + 26 + cx - 0.8, g - 14 + cy, 1.6, 2.2);
  ctx.fillStyle = '#b91c1c'; ctx.fillRect(X0 - 1, g - 9, X1 - X0 + 2, 9);
  ctx.fillStyle = '#fef3c7'; for (let x = X0 + 2; x < X1 - 2; x += 8) { ctx.beginPath(); ctx.arc(x + 2, g - 4.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7f1d1d'; ctx.fillRect(X0 - 1.5, g - 9.8, X1 - X0 + 3, 1);
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(X0 - 1.5, g - 36, 1.5, 36); ctx.fillRect(X1, g - 36, 1.5, 36);
  for (let i = 0, x = X0 - 3; x < X1 + 3; x += 5, i++) { ctx.fillStyle = i % 2 ? '#fff' : '#dc2626'; ctx.beginPath(); ctx.moveTo(x, g - 40); ctx.lineTo(x + 5, g - 40); ctx.lineTo(x + 5, g - 35); ctx.arc(x + 2.5, g - 35, 2.5, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.roundRect((X0 + X1) / 2 - 15, g - 47, 30, 6, 1.5); ctx.fill();
  ctx.fillStyle = '#fde047'; ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★ FUN FAIR ★', (X0 + X1) / 2, g - 43.9);
  if (!S || !['prize', 'out', 'exit'].includes(S.p)) frPanda(X1 - 6, g - 13, 0.8);
}
function frDrawNinja() {
  const S = frS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx;
  let P = poseIdle(now);
  if (S.p === 'exit') { P = poseRun(S.nx * 0.55); P.arms = [[0.9, 1.9], [1.0, 2.0]]; }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, GROUND, 1, 1, P, 1);
  if (S.p === 'exit') frPanda(fx + 2.2, GROUND - 7.5, 0.8);                      // יוצא עם הפנדה ביד
  return true;
}

/* ---------- מבט מעבר לכתף ---------- */
function frPovAlpha(S) {
  if (S.p === 'in') return frE((S.t - 0.2) / FR.fade);
  if (S.p === 'out') return 1 - frE(S.t / FR.fade);
  if (S.p === 'exit') return 0;
  return 1;
}
function drawFairFront(o) {
  const S = frS && frS.o === o ? frS : null; if (!S) return;
  const a = frPovAlpha(S); if (a <= 0) return;
  const c = ctx.canvas, u = c.height / 100, Wd = c.width / u, now = performance.now() / 1000;
  ctx.save(); ctx.setTransform(u, 0, 0, u, 0, 0); ctx.globalAlpha = a;
  frPovBg(Wd, now);
  if (S.st === 1) frPovHoop(S, Wd, now);
  else if (S.st === 2) frPovPops(S, Wd, now);
  else if (S.st === 3) frPovCans(S, Wd, now);
  frPovNinja(S, Wd, now);
  frPovHud(S, Wd, now);
  ctx.restore();
}
function frPovBg(Wd, now) {                                                      // תוך הדוכן בעומק: קיר פסים, גגון, נורות, דלפק קרוב
  const cx = Wd / 2;
  ctx.fillStyle = '#0f1b4d'; ctx.fillRect(0, 0, Wd, 100);
  ctx.fillStyle = '#fde68a'; ctx.fillRect(cx - 62, 12, 124, 62);
  ctx.fillStyle = '#fcd34d'; for (let x = cx - 62; x < cx + 62; x += 12) ctx.fillRect(x, 12, 6, 62);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(cx - 62, 66, 124, 8);
  for (let i = 0, x = cx - 70; x < cx + 70; x += 10, i++) { ctx.fillStyle = i % 2 ? '#fff' : '#dc2626'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x + 10, 9); ctx.arc(x + 5, 9, 5, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  for (let i = 0; i < 12; i++) { const x = cx - 66 + i * 12, on = Math.sin(now * 4 + i) > -0.3;                // שרשרת נורות
    ctx.fillStyle = on ? ['#fde047', '#f472b6', '#60a5fa'][i % 3] : 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(x, 17 + Math.sin(i * 1.3) * 1.2, 1.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(cx - 70, 0, 8, 100); ctx.fillRect(cx + 62, 0, 8, 100);       // עמודים
  ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(cx - 80, 100); ctx.lineTo(cx - 64, 74); ctx.lineTo(cx + 64, 74); ctx.lineTo(cx + 80, 100); ctx.closePath(); ctx.fill();   // דלפק קרוב, בפרספקטיבה
  ctx.fillStyle = '#7f1d1d'; ctx.fillRect(cx - 64, 74, 128, 2.2);
  ctx.fillStyle = 'rgba(254,243,199,.75)'; for (let x = cx - 56; x <= cx + 56; x += 16) { ctx.beginPath(); ctx.arc(x, 86, 3, 0, Math.PI * 2); ctx.fill(); }
}
function frBall(x, y, r) {                                                       // כדורסל כתום עם תפרים
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - r * 1.3, y, r * 0.9, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + r * 1.3, y, r * 0.9, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill();
}
function frHand(Wd) { return [Wd / 2 - 14, 86]; }                                // היד של הנינג'ה – מאיפה זורקים
function frPovHoop(S, Wd, now) {
  const cx = Wd / 2, hy = 32;
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 12, hy - 15, 24, 15);                // לוח
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8; ctx.strokeRect(cx - 12, hy - 15, 24, 15); ctx.strokeRect(cx - 5, hy - 9, 10, 7);
  ctx.fillStyle = '#64748b'; ctx.fillRect(cx - 1, hy, 2, 40);
  const B = S.ball;
  ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, hy, 7, 1.8, 0, Math.PI, Math.PI * 2); ctx.stroke();   // חצי הטבעת האחורי
  if (B) {
    const [hx0, hy0] = frHand(Wd), k = Math.min(1, B.t / B.T), tx = cx + B.x * 22, r = frL(5, 2.6, k);
    let x = frL(hx0, B.good ? cx : tx, k), y = frL(hy0, hy - 2, k) - Math.sin(k * Math.PI) * 38;
    if (B.done) { const t2 = B.t - B.T; if (B.good) { x = cx; y = hy + t2 * 40; } else { x = tx + (tx > cx ? 1 : -1) * t2 * 25; y = hy - 2 - Math.sin(Math.min(1, t2 * 2) * Math.PI) * 8 + Math.max(0, t2 - 0.5) * 60; } }
    frBall(x, y, r);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.4;                // הרשת והחצי הקדמי של הטבעת – לפני הכדור
  const sw = B && B.good && B.done && B.t < B.T + 0.5 ? Math.sin((B.t - B.T) * 20) * 0.8 : 0;
  for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 2.2, hy + 0.5); ctx.lineTo(cx + k * 1.2 + sw, hy + 9); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx - 6, hy + 3); ctx.lineTo(cx + 6, hy + 3); ctx.moveTo(cx - 4.5, hy + 6); ctx.lineTo(cx + 4.5, hy + 6); ctx.stroke();
  ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, hy, 7, 1.8, 0, 0, Math.PI); ctx.stroke();
  const by = 60, bw = 46;                                                        // הפס והסמן: אזור ירוק באמצע
  ctx.fillStyle = 'rgba(15,23,42,.75)'; ctx.beginPath(); ctx.roundRect(cx - bw / 2 - 2, by - 3, bw + 4, 6, 3); ctx.fill();
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.roundRect(cx - bw * 0.12, by - 2, bw * 0.24, 4, 2); ctx.fill();
  if (!S.ball) { const mx = cx + S.aim * bw / 2; ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(mx, by - 2.5); ctx.lineTo(mx - 2.2, by - 6.5); ctx.lineTo(mx + 2.2, by - 6.5); ctx.closePath(); ctx.fill(); ctx.fillRect(mx - 0.5, by - 2.5, 1, 5); }
  frDots(S, cx, 6, FR.hoops);
}
function frPovPops(S, Wd, now) {
  const cx = Wd / 2, by = 56;
  ctx.fillStyle = '#92400e'; ctx.fillRect(cx - 55, by, 110, 12);                // לוח עץ עם חמישה חורים
  ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 55, by, 110, 2);
  for (let i = 0; i < 5; i++) {
    const x = cx - 44 + i * 22, P = S.pop && S.pop.i === i ? S.pop : null;
    let up = 0;
    if (P) { if (P.st === 'up') up = frE(P.t / 0.15); else if (P.st === 'down') up = 1 - frE(P.t / 0.25); else if (P.st === 'hit') up = 1; }
    if (up > 0) {                                                               // המטרה עולה מהחור; כשנפגעת – מתהפכת אחורה
      ctx.save(); ctx.beginPath(); ctx.rect(x - 10, by - 30, 20, 31); ctx.clip();
      const flip = P.st === 'hit' ? Math.cos(Math.min(1, P.t * 3) * Math.PI / 2) : 1, ty = by + 10 - up * 18;
      ctx.fillStyle = '#78350f'; ctx.fillRect(x - 0.6, ty, 1.2, 14);
      ctx.save(); ctx.translate(x, ty); ctx.scale(1, Math.max(0.05, flip));
      for (const [r, col] of [[7, '#ef4444'], [5, '#fff'], [3, '#ef4444'], [1.2, '#fff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); ctx.restore();
    }
    ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(x, by + 1, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  const B = S.ball;                                                              // כוכב נינג'ה עף אל החור
  if (B) { const [hx0, hy0] = frHand(Wd), k = Math.min(1, B.t / B.T), tx = cx - 44 + B.i * 22;
    if (!B.done) star4(frL(hx0, tx, k), frL(hy0, by - 8, k) - Math.sin(k * Math.PI) * 6, frL(4, 2.2, k), B.t * 30, '#475569');
    else if (B.t < B.T + 0.6) star4(tx + 3, by - 4, 2.2, 0.6, '#475569'); }
  frDots(S, cx, 6, FR.pops);
}
function frCan(x, y, s, rot) {                                                   // פחית: גוף כסוף עם פס אדום
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-2.6 * s, -6 * s, 5.2 * s, 6 * s);
  ctx.fillStyle = '#dc2626'; ctx.fillRect(-2.6 * s, -4.4 * s, 5.2 * s, 2.4 * s);
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-1.8 * s, -5.8 * s, 0.8 * s, 5.6 * s);
  ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(0, -6 * s, 2.6 * s, 0.7 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function frPovCans(S, Wd, now) {
  const cx = Wd / 2, sy = 58, sc = 1.25;
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(cx - 24, sy, 48, 3); ctx.fillRect(cx - 20, sy + 3, 2, 16); ctx.fillRect(cx + 18, sy + 3, 2, 16);   // מדף
  for (const c of S.cans) if (c.st !== 'gone') frCan(cx + c.x * sc + c.dx, sy - c.r * 7.6 * sc + c.dy, sc, c.rot);
  const B = S.ball;
  if (B) { const [hx0, hy0] = frHand(Wd), k = Math.min(1, B.t / B.T), tx = cx + B.x * sc;
    ctx.fillStyle = '#2563eb';
    if (!B.done) { ctx.beginPath(); ctx.arc(frL(hx0, tx, k), frL(hy0, sy - 6, k) - Math.sin(k * Math.PI) * 20, frL(4.5, 2, k), 0, Math.PI * 2); ctx.fill(); }
    else if (B.t < B.T + 0.8) { const t2 = B.t - B.T; ctx.beginPath(); ctx.arc(tx, sy - 6 + t2 * 30, 2, 0, Math.PI * 2); ctx.fill(); } }
  if (!S.ball && S.p === 'play') {                                               // כוונת נעה מעל הפחיות
    const mx = cx + S.aim * 14 * sc, my = sy - 5;
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, Math.PI * 2); ctx.moveTo(mx - 5, my); ctx.lineTo(mx - 2, my); ctx.moveTo(mx + 2, my); ctx.lineTo(mx + 5, my); ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my - 2); ctx.moveTo(mx, my + 2); ctx.lineTo(mx, my + 5); ctx.stroke();
  }
}
function frDots(S, cx, y, n) { for (let i = 0; i < n; i++) star4(cx - (n - 1) * 3.5 + i * 7, y, 2.4, 0, i < S.score ? '#facc15' : 'rgba(255,255,255,.3)'); }
function frPovNinja(S, Wd, now) {                                                // הגב, הראש והיד של הנינג'ה בפינה השמאלית-תחתונה
  const cx = Wd / 2, bx = cx - 40, col = playerColor(), suit = '#1f2937', hood = '#273449';
  const tb = S.throwT, throwK = tb < 0.35 ? Math.sin(tb / 0.35 * Math.PI) : 0;
  ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(bx, 114, 26, 22, 0, 0, Math.PI * 2); ctx.fill();          // כתפיים
  ctx.fillStyle = hood; ctx.beginPath(); ctx.ellipse(bx + 1, 84, 11, 12, 0, 0, Math.PI * 2); ctx.fill();       // ראש מאחור (ברדס)
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.ellipse(bx - 3, 79, 4, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bx - 10.5, 80, 23, 4, 1.5); ctx.fill();                  // סרט ראש וקשר מאחור
  ctx.beginPath(); ctx.ellipse(bx - 1, 82, 2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  const flut = Math.sin(now * 6) * 2;
  ctx.beginPath(); ctx.moveTo(bx - 2, 82); ctx.quadraticCurveTo(bx - 10, 86 + flut, bx - 15, 93 + flut); ctx.lineTo(bx - 12, 94 + flut); ctx.quadraticCurveTo(bx - 7, 88, bx, 83.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - 1, 83); ctx.quadraticCurveTo(bx - 4, 90 + flut * 0.6, bx - 7, 97 + flut * 0.6); ctx.lineTo(bx - 4.5, 97.5 + flut * 0.6); ctx.quadraticCurveTo(bx - 2, 90, bx + 1, 84); ctx.fill();
  const [hx, hy] = frHand(Wd), ax = hx + throwK * 8, ay = hy - throwK * 16;                                       // היד הזורקת – מימין לראש
  ctx.strokeStyle = suit; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 16, 100); ctx.quadraticCurveTo(hx - 2, 98, ax, ay + 4); ctx.stroke();
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(ax, ay, 3.6, 0, Math.PI * 2); ctx.fill();                  // כפפה
  if (!S.ball && S.p === 'play') {                                                // מה שביד לפני הזריקה
    if (S.st === 1) frBall(ax + 1, ay - 5, 4.5);
    else if (S.st === 2) star4(ax + 1, ay - 5, 3.6, 0.3, '#475569');
    else { ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(ax + 1, ay - 5, 4, 0, Math.PI * 2); ctx.fill(); }
  }
}
function frPovHud(S, Wd, now) {
  const cx = Wd / 2;
  if (S.msg && S.msgT < 1.4 && S.p !== 'prize') {                                // כותרת / תוצאה
    const k = Math.min(1, S.msgT * 4), big = S.p === 'title';
    ctx.save(); ctx.translate(cx, big ? 42 : 46); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
    ctx.font = '900 ' + (big ? 9 : 7) + 'px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 2; ctx.strokeStyle = '#1e1b4b'; ctx.strokeText(S.msg, 0, 0); ctx.fillStyle = big ? '#fde047' : '#fff'; ctx.fillText(S.msg, 0, 0);
    ctx.restore();
  }
  if (S.p === 'prize') {                                                         // הפרס: פנדה ענקית יורדת למרכז
    const k = frE(S.t / 0.7);
    ctx.fillStyle = 'rgba(15,23,42,' + 0.5 * k + ')'; ctx.fillRect(0, 0, Wd, 100);
    frPanda(cx, frL(-10, 62, k), 5);
    ctx.font = '900 9px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 2; ctx.strokeStyle = '#1e1b4b';
    ctx.strokeText('YOU WIN!', cx, 18); ctx.fillStyle = '#fde047'; ctx.fillText('YOU WIN!', cx, 18);
  }
  if (state !== 'play' || S.p !== 'play') return;
  const ok = S.chipOk > 0, want = frWant(); if (!ok && !want) return;              // THROW – אפור כשמחכים, ירוק כשנקלט
  const txt = (ok ? '✓ ' : '') + 'THROW', sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pw = ctx.measureText(txt).width + sz * 1.6, ph = sz * 1.55;
  ctx.translate(cx + 30, 92);
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText(txt, 0, sz * 0.05);
  ctx.restore();
}

sceneAdd({
  type: 'fair', word: 'fair', label: true,
  listen: ['throw'],
  active: () => !!frS,
  reset: () => { frS = null; },
  setup: frSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + FR.e0 + PLAYER.w / 2,
  draw: drawFair, drawFront: drawFairFront, drawNinja: frDrawNinja,
  update: frUpdate, physics: frPhysics, speed: frSpeed,
  expected: frExpected, cmd: frCmd, auto: frAuto, tap: frTap,
  intro: { banner: 'THROW at the right moment!', time: 45,
           demo: () => { const o = { type: 'fair' }; frSetup(o); o.x = frNX() - FR.e0; obstacles.push(o); } }
});
