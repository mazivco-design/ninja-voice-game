/* ninja-voice-game – mud.js
   HELP (חילוץ מבוץ): הנינג'ה רץ לתוך שלולית בוץ ונתקע עד המותניים. העולם עוצר והוא צועק "Help!".
   נינג'ה חבר רץ אליו מהצד, עומד על הקרקע היציבה, זורק חבל וצועק "Catch!".
   · CATCH – הנינג'ה תופס את קצה החבל. בלי CATCH החבל שוקע בבוץ, החבר מושך אותו בחזרה וזורק שוב.
   · אחרי שתפס החבר צועק "Hold on!" ומתחיל למשוך. HOLD – הנינג'ה מחזיק חזק ונשלף החוצה.
     בלי HOLD החבל מחליק מהידיים, החבר נופל אחורה, אוסף את החבל וזורק שוב.
   בשלב הזה הילד לא אומר HELP – המשחק אומר. (בהמשך הילד יגיד HELP בעצמו.)
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const MUD = { w: 32, stuck: 12, deep: 4.3, pit: 9, sinkT: 0.6, helpT: 1.1, run: 62, stand: 7, throwT: 0.35, flyT: 0.7,
              catchWin: 4.5, dropT: 0.6, reelT: 1.1, caughtT: 0.7, holdWin: 4.5, slipT: 0.9, pullT: 1.9, thanksT: 1.6, coins: 4 };
let mud = null;   // { o, phase: 'sink' | 'help' | 'come' | 'throw' | 'fly' | 'dangle' | 'drop' | 'reel' | 'caught' | 'tug' | 'slip' | 'pull' | 'thanks', t, throws, slips }

function mudWin(base) { return base * (cfg && cfg.forgive ? 1.3 : 1); }           // ברמה הקלה – יותר זמן לענות
function mudStuckX(o) { return o.x + MUD.stuck; }
function mudStand(o) { return MUD.w + MUD.stand; }                                // איפה החבר עומד (יחסית ל-o.x)
function friendX(o) { return o.x + (o.fr === undefined ? W + 12 - o.x : o.fr); }
function mudAccent() { const c = typeof playerColor === 'function' ? playerColor() : '#dc2626'; return c === '#2563eb' ? '#f59e0b' : '#2563eb'; }
function mudPullDist() { return MUD.w + 1 - MUD.stuck; }

// עומק הבוץ בנקודה x (0 מחוץ לשלולית). שפות משופעות
function mudDepthAt(o, x) {
  const r = x - o.x, s = 6, ease = q => q * q * (3 - 2 * q);
  if (r <= 0 || r >= MUD.w) return 0;
  if (r < s) return MUD.pit * ease(r / s);
  if (r > MUD.w - s) return MUD.pit * ease((MUD.w - r) / s);
  return MUD.pit;
}
// כמה הנינג'ה שקוע (לציור)
function mudSink(fx) {
  if (mud) {
    const M = mud, p = M.phase;
    if (p === 'sink') { const k = Math.min(1, M.t / MUD.sinkT); return MUD.deep * k * k * (3 - 2 * k); }
    if (p === 'pull') { const k = Math.min(1, M.t / MUD.pullT); return Math.min(MUD.deep, mudDepthAt(M.o, fx) * 0.7) * (1 - k * 0.15); }
    if (p === 'thanks') return 0;
    return MUD.deep + Math.sin(performance.now() / 1000 * 2.2) * 0.25;
  }
  if (py > 0) return 0;
  const o = obstacles.find(o => o.type === 'mud' && !o.passed && fx > o.x && fx < o.x + MUD.w);   // הולך פנימה – שוקע בהדרגה
  return o ? Math.min(MUD.deep, mudDepthAt(o, fx) * 0.7) : 0;
}
function mudBusy() { return !!mud; }

// מהירות העולם בזמן השלב (null = לא בשליטה שלנו)
function mudSpeed() {
  if (!mud) return null;
  if (mud.phase === 'pull') return mudPullDist() / MUD.pullT;
  return 0;
}

function mudUpdate(dt, pb) {
  if (!mud) {
    const cx = PLAYER.x + 4;
    const o = obstacles.find(o => o.type === 'mud' && !o.passed && cx >= mudStuckX(o) - 0.3 && cx < o.x + MUD.w - 4);
    if (!o) return;
    const over = cx - mudStuckX(o); if (over > 0) ropeShiftBy(over);           // נתקע בדיוק באמצע השלולית
    py = 0; vy = 0; duckT = 0; flyT = 0; act.crawl = 0; act.run = 0;
    mud = { o, phase: 'sink', t: 0, throws: 0, slips: 0 };
    o.fr = W + 12 - o.x; sfx('pop'); burst(PLAYER.x + 4, GROUND, '#6b4423', 10, 22);
    return;
  }
  const M = mud, o = M.o; M.t += dt;
  if (!obstacles.includes(o)) { mud = null; return; }
  const demo = state !== 'play';
  const go = (ph) => { M.phase = ph; M.t = 0; };
  switch (M.phase) {
    case 'sink': if (M.t >= MUD.sinkT) { go('help'); speak('help!'); } break;
    case 'help': if (M.t >= MUD.helpT) go('come'); break;
    case 'come': {                                                                // החבר רץ אליו
      o.fr = Math.max(mudStand(o), o.fr - MUD.run * dt);
      if (o.fr <= mudStand(o)) go('throw');
      break;
    }
    case 'throw': if (M.t >= MUD.throwT) { go('fly'); M.throws++; sfx('swish'); speak('catch'); } break;
    case 'fly': if (M.t >= MUD.flyT) { go('dangle'); burst(PLAYER.x + 9, GROUND + 0.5, '#6b4423', 5, 12); } break;
    case 'dangle':
      if (demo && M.t >= 0.9) { if (banner) banner.text = 'Say CATCH!'; command('catch', 'demo'); }
      else if (!demo && M.throws >= 2 && !M.hinted && M.t >= 2) { M.hinted = 1; sayWords(['catch'], 1.6); }
      if (M.phase === 'dangle' && M.t >= mudWin(MUD.catchWin)) { go('drop'); M.hinted = 0; }
      break;
    case 'drop': if (M.t >= MUD.dropT) go('reel'); break;                         // החבל שוקע בבוץ
    case 'reel': if (M.t >= MUD.reelT) go('throw'); break;                        // החבר מושך אותו בחזרה ומגלגל
    case 'caught': if (M.t >= MUD.caughtT) { go('tug'); } break;
    case 'tug':
      if (M.t < dt * 1.5) speak('hold on!');
      if (demo && M.t >= 1.3) { if (banner) banner.text = 'Say HOLD!'; command('hold', 'demo'); }
      else if (!demo && M.slips >= 1 && !M.hinted && M.t >= 1.8) { M.hinted = 1; sayWords(['hold'], 1.6); }
      if (M.phase === 'tug' && M.t >= mudWin(MUD.holdWin)) { go('slip'); M.slips++; M.hinted = 0; sfx('swish'); }
      break;
    case 'slip': if (M.t >= MUD.slipT) go('reel'); break;                         // החבל ברח – החבר נופל אחורה ואוסף אותו
    case 'pull':
      o.fr += mudPullDist() / MUD.pullT * 0.8 * dt;                               // החבר צועד אחורה תוך כדי משיכה
      if (Math.random() < 0.3) particles.push({ x: PLAYER.x + 2 + Math.random() * 4, y: GROUND, vx: -6 - Math.random() * 6, vy: -8 - Math.random() * 6, g: 50, life: 0.4, color: '#6b4423', size: 0.9 });
      if (M.t >= MUD.pullT) {
        go('thanks'); sfx('clear'); speak('great job!'); burst(PLAYER.x + 4, GROUND - 6, '#fde68a', 12, 28);
        if (mode === 'journey' && state === 'play') { picked += MUD.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + MUD.coins + ' 🟡', '#ca8a04'); }
      }
      break;
    case 'thanks': if (M.t >= MUD.thanksT) { cleared(o); o.waving = true; mud = null; } break;
  }
}

/* ---------- פקודות ---------- */
function mudCatch() {
  if (!mud) return false;
  const M = mud;
  if ((M.phase === 'fly' && M.t >= MUD.flyT * 0.45) || M.phase === 'dangle') { M.phase = 'caught'; M.t = 0; M.hinted = 0; sfx('pop'); }
  return true;
}
function mudHold() {
  if (!mud) return false;
  const M = mud;
  if (M.phase === 'caught' || M.phase === 'tug') { M.phase = 'pull'; M.t = 0; M.hinted = 0; }
  return true;
}
function mudExpected() {
  if (!mud) return null;
  const p = mud.phase;
  if (p === 'fly' || p === 'dangle') return ['catch'];
  if (p === 'caught' || p === 'tug') return ['hold'];
  return [];
}
function mudAuto() {                                                              // מצב בודק 🤖
  if (!mud) return;
  if (mud.phase === 'dangle' && mud.t > 0.4) command('catch', 'auto');
  if (mud.phase === 'tug' && mud.t > 1.3) command('hold', 'auto');
}

/* ---------- תנוחות ---------- */
function mudPose(P) {
  if (!mud) return P;
  const p = mud.phase, now = performance.now() / 1000;
  if (['caught', 'tug', 'pull'].includes(p)) {                                   // אוחז בחבל בשתי ידיים, קדימה אל החבר
    P = poseIdle(now);
    P.arms = [[1.35, 1.5], [1.45, 1.6]];
    P.lean = p === 'tug' ? -0.12 + Math.sin(now * 9) * 0.03 : p === 'pull' ? 0.12 : 0;
    return P;
  }
  if (p === 'thanks') { P = poseIdle(now); P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; return P; }   // מנופף לחבר
  P = poseIdle(now);                                                              // תקוע – מנופף בשתי הידיים
  const w = Math.sin(now * 7);
  P.arms = [[-2.6 - w * 0.25, -3.0 - w * 0.2], [2.6 + w * 0.25, 3.0 + w * 0.2]];
  P.lean = Math.sin(now * 3) * 0.06;
  return P;
}
function friendPose(o) {
  const now = performance.now() / 1000, M = mud && mud.o === o ? mud : null, p = M ? M.phase : 'done';
  let P;
  if (p === 'come') P = poseRun(now * 20);
  else if (p === 'tug') { P = posePull(now * 0.7); P.lean = -0.3; }
  else if (p === 'pull') { P = posePull(now * 1.6); P.lean = -0.35; }
  else if (p === 'reel') P = posePull(now * 1.8);
  else if (p === 'slip') { const k = Math.min(1, M.t / MUD.slipT); P = poseIdle(now); P.lean = -0.7 * Math.sin(Math.PI * k); P.arms = [[-1.2, -0.8], [1.9, 2.4]]; }
  else if (p === 'caught') { P = poseIdle(now); P.arms = [[0.9, 1.1], [1.0, 1.25]]; P.lean = 0.1; }
  else if (p === 'thanks' || o.waving) { P = poseIdle(now); P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; }
  else { P = poseIdle(now); if (p !== 'sink' && p !== 'help') P.arms[1] = [0.6, 1.2]; }
  if (p === 'throw') { const k = Math.min(1, M.t / MUD.throwT); applyThrow(P, k); }
  return P;
}

/* ---------- ציור ---------- */
function friendHand(o) { return [friendX(o) - 3.4, GROUND - 8.2]; }
function ninjaHand() { const nx = PLAYER.x + 4; return [nx + 3.4, GROUND + mudSink(nx) - 9.2]; }

// מאחורי הנינג'ה: החבר (ועוד לא נכנס – כלום)
function drawMudBack(o) {
  const fx = friendX(o);
  if (fx > W + 10) return;
  const M = mud && mud.o === o ? mud : null;
  drawFigure({ fx, fy: GROUND, facing: -1, scale: 1, kind: 'ninja', accent: mudAccent(), pose: friendPose(o) });
  const p = M ? M.phase : 'done';
  if (['sink', 'help', 'come', 'throw', 'reel'].includes(p)) drawCoil(fx - 1.8, GROUND - 5.6, p === 'reel' ? 0.45 + 0.25 * Math.min(1, M.t / MUD.reelT) : 0.7, false);   // החבל המגולגל ביד
  else if (M) drawCoil(fx - 2.2, GROUND - 6.2, 0.42, false);                     // מה שנשאר מהחבל ביד
}

// מעל הנינג'ה: הבוץ עצמו (מכסה את הרגליים), החבל והבועות
function drawMudFront(o) {
  const t = performance.now() / 1000, S = GROUND - 0.2, x0 = o.x, x1 = o.x + MUD.w;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x0 - 0.5, S);
  for (let x = x0 - 0.5; x <= x1 + 0.5; x += 1) ctx.lineTo(x, S + Math.sin(x * 0.7 + t * 1.6) * 0.18);
  for (let x = x1; x >= x0; x -= 1) ctx.lineTo(x, GROUND + Math.max(0.6, mudDepthAt(o, x)) + 0.8);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, S, 0, GROUND + MUD.pit);
  g.addColorStop(0, '#9a7048'); g.addColorStop(0.12, '#7a5230'); g.addColorStop(0.4, '#5c3b1f'); g.addColorStop(1, '#3a2412');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,236,200,.22)';                                        // ברק רטוב על פני הבוץ
  for (let k = 0; k < 4; k++) { const xx = x0 + 4 + ((k * 9 + t * 0.8) % (MUD.w - 8)); ctx.beginPath(); ctx.ellipse(xx, S + 0.45, 2.2, 0.28, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(40,22,8,.35)';                                            // כתמים כהים
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x0 + 4 + k * 4.6, GROUND + 3 + (k % 3) * 1.8, 1.4, 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#4a2f17';                                                      // שפות רטובות וכתמי בוץ על הדשא
  for (const [x, w] of [[x0 - 1.2, 3.2], [x1 + 1.2, 3.2], [x0 - 4, 1.2], [x1 + 4.5, 1]]) { ctx.beginPath(); ctx.ellipse(x, GROUND - 0.05, w, 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let k = 0; k < 3; k++) {                                                   // בועות שמתנפחות ומתפוצצות
    const ph = (t * 0.6 + k * 0.37) % 1, bx = x0 + 6 + k * 9 + Math.sin(k * 5) * 2, r = 0.3 + ph * 0.9;
    if (ph < 0.85) { ctx.strokeStyle = 'rgba(120,80,45,.9)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(bx, S, r, Math.PI, 0); ctx.stroke(); }
  }
  if (mud && mud.o === o) {
    const nx = PLAYER.x + 4, sk = mudSink(nx);
    if (sk > 1) {                                                                 // טבעת בוץ סביב המותניים
      ctx.fillStyle = '#4a2f17'; ctx.beginPath(); ctx.ellipse(nx + 0.5, S + 0.2, 4.2, 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,236,200,.25)'; ctx.beginPath(); ctx.ellipse(nx - 0.5, S - 0.05, 2.4, 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawMudRope(o);
  drawMudTalk(o);
}

function ropeLine(a, b, sag, wob) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (wob || 0), Math.max(a[1], b[1]) + sag, b[0], b[1]);
  ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1.05; ctx.stroke();
  ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.55; ctx.stroke();
}
function drawMudRope(o) {
  const M = mud && mud.o === o ? mud : null; if (!M) return;
  const p = M.phase, t = performance.now() / 1000, fh = friendHand(o), nh = ninjaHand(), nx = PLAYER.x + 4;
  const floatAt = [nx + 5.5, GROUND + 0.3];                                       // קצה החבל צף על הבוץ מול הנינג'ה
  ctx.save(); ctx.lineCap = 'round';
  if (p === 'fly') {
    const k = Math.min(1, M.t / MUD.flyT), ex = lerp(fh[0], floatAt[0], k), ey = lerp(fh[1], floatAt[1], k) - Math.sin(Math.PI * k) * 12;
    ropeLine(fh, [ex, ey], 2 + 4 * k);
    drawCoil(ex, ey, 0.38 * (1 - k) + 0.12, false);
  } else if (p === 'dangle' || p === 'drop') {
    const k = p === 'drop' ? Math.min(1, M.t / MUD.dropT) : 0, end = [floatAt[0], floatAt[1] + Math.sin(t * 2.5) * 0.2 + k * 1.2];
    ropeLine(fh, end, 3.5, 0);
    ctx.fillStyle = '#fbbf24'; ctx.globalAlpha = 1 - k * 0.7; circle(end[0], end[1], 0.55); ctx.globalAlpha = 1;
    if (p === 'dangle' && labelsVisible()) label('CATCH', end[0] + 1, GROUND - 24, 4, '#fde047', '#1e293b');
  } else if (p === 'reel') {
    const k = Math.min(1, M.t / MUD.reelT), e = k * k * (3 - 2 * k), end = [lerp(floatAt[0], fh[0] - 1, e), lerp(floatAt[1] + 1, fh[1], e * e)];
    if (k < 0.97) ropeLine(fh, end, 3 * (1 - e), 0);
  } else if (p === 'caught' || p === 'tug' || p === 'pull') {
    const taut = p === 'caught' ? 2.2 : 0.35, wob = p === 'tug' ? Math.sin(t * 22) * 0.4 : 0;
    ropeLine(fh, nh, taut, wob);
    if (p === 'tug' && labelsVisible()) label('HOLD', nx, GROUND - 26, 4, '#fde047', '#1e293b');
  } else if (p === 'slip') {                                                      // החבל בורח מהידיים
    const k = Math.min(1, M.t / 0.35), end = [lerp(nh[0], fh[0] - 6, k), lerp(nh[1], GROUND - 1, k)];
    ropeLine(fh, end, 1.5 + k * 2, 0);
  }
  ctx.restore();
}
function drawMudTalk(o) {                                                         // בועות קומיקס
  const M = mud && mud.o === o ? mud : null, fx = friendX(o), nx = PLAYER.x + 4;
  if (!M) { if (o.waving && fx < W + 4 && fx > -6) drawBubble('Bye! 👋', fx, GROUND - 17, { tail: -1, size: 3.4 }); return; }
  const p = M.phase, ny = GROUND + mudSink(nx) - 17;
  if (['help', 'come', 'throw', 'reel'].includes(p) || (p === 'drop')) drawBubble('Help! 😱', nx + 1, ny, { age: p === 'help' ? M.t : undefined, tail: 1, color: '#b91c1c' });
  if (p === 'come' && fx < W - 4) drawBubble("I'm coming!", fx, GROUND - 17, { age: M.t, tail: -1, size: 3.6 });
  if (p === 'fly' || p === 'dangle') drawBubble('Catch!', fx, GROUND - 17, { age: p === 'fly' ? M.t : undefined, tail: -1, color: '#1d4ed8' });
  if (p === 'tug') drawBubble('Hold on!', fx, GROUND - 17, { age: M.t, tail: -1, color: '#1d4ed8' });
  if (p === 'slip') drawBubble('Oops!', fx, GROUND - 15, { age: M.t, tail: -1, size: 3.6 });
  if (p === 'thanks') { drawBubble('Great job!', fx + 3, GROUND - 17, { age: M.t, tail: -1, color: '#15803d' }); if (M.t > 0.5) drawBubble('Thank you!', nx - 3, GROUND - 17, { age: M.t - 0.5, tail: 1, color: '#be185d', size: 3.6 }); }
}
