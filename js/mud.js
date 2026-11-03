/* ninja-voice-game – mud.js
   HELP (חילוץ מבוץ): הנינג'ה רץ לתוך שלולית בוץ ונתקע עד המותניים. העולם עוצר והוא צועק "Help!".
   נינג'ה חבר רץ אליו מהצד, עומד על הקרקע היציבה, זורק חבל וצועק "Catch!".
   · CATCH – הנינג'ה תופס את קצה החבל. בלי CATCH החבל שוקע בבוץ, החבר מושך אותו בחזרה וזורק שוב.
   · אחרי שתפס החבר צועק "Hold on!" ומתחיל למשוך. HOLD – הנינג'ה מחזיק חזק ונשלף החוצה.
     בלי HOLD החבל מחליק מהידיים, החבר נופל אחורה, אוסף את החבל וזורק שוב.
   בשלב הזה הילד לא אומר HELP – המשחק אומר. (בהמשך הילד יגיד HELP בעצמו.)
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const MUD = { w: 100, stuck: 24, deep: 5.2, pit: 9, sinkT: 0.6, helpT: 1.1, run: 62, stand: 7, throwT: 0.35, flyT: 0.7,
              catchWin: 4.5, dropT: 0.6, reelT: 1.1, caughtT: 0.7, holdWin: 4.5, slipT: 0.9, pullT: 3.6, pullCyc: 1.2, thanksT: 1.6, coins: 4 };
let mud = null;   // { o, phase: 'sink' | 'help' | 'come' | 'throw' | 'fly' | 'dangle' | 'drop' | 'reel' | 'caught' | 'tug' | 'slip' | 'pull' | 'thanks', t, throws, slips }

function mudWin(base) { return base * (cfg && cfg.forgive ? 1.3 : 1); }           // ברמה הקלה – יותר זמן לענות
function mudStuckX(o) { return o.x + MUD.stuck; }
function mudStand(o) { return MUD.w + MUD.stand; }                                // איפה החבר עומד (יחסית ל-o.x)
function friendX(o) { return o.x + (o.fr === undefined ? viewR() + 12 - o.x : o.fr); }
function mudAccent() { const c = typeof playerColor === 'function' ? playerColor() : '#dc2626'; return c === '#2563eb' ? '#f59e0b' : '#2563eb'; }
function mudPullDist() { return MUD.w + 1 - MUD.stuck; }

// עומק הבוץ בנקודה x (0 מחוץ לשלולית). שפות משופעות
function mudDepthAt(o, x) {
  const r = x - o.x, s = 15, ease = q => q * q * (3 - 2 * q);
  if (r <= 0 || r >= MUD.w) return 0;
  if (r < s) return MUD.pit * ease(r / s);
  if (r > MUD.w - s) return MUD.pit * ease((MUD.w - r) / s);
  return MUD.pit;
}
// מאבק בבוץ: מחזור של דחיפה מהירה למעלה (הידיים לוחצות על הבוץ) ושקיעה איטית בחזרה (הידיים למעלה)
const STRUGGLE = 1.5;
function mudStruggle() {
  const c = (performance.now() / 1000 % STRUGGLE) / STRUGGLE, ease = q => q * q * (3 - 2 * q);
  return { c, push: c < 0.28, lift: c < 0.28 ? ease(c / 0.28) : 1 - ease((c - 0.28) / 0.72) };
}
// כמה הנינג'ה שקוע (לציור)
function mudSink(fx) {
  if (mud) {
    const M = mud, p = M.phase;
    if (p === 'sink') { const k = Math.min(1, M.t / MUD.sinkT); return MUD.deep * k * k * (3 - 2 * k); }
    if (p === 'pull') { const k = Math.min(1, M.t / MUD.pullT); return Math.min(MUD.deep, mudDepthAt(M.o, fx) * 0.7) * (1 - k * 0.15); }
    if (p === 'thanks') return 0;
    if (['caught', 'tug'].includes(p)) return MUD.deep + Math.sin(performance.now() / 1000 * 2.2) * 0.25;
    return MUD.deep + 1 - 2.4 * mudStruggle().lift;                              // נאבק: נדחף למעלה ושוקע בחזרה, כל פעם קצת יותר עמוק
  }
  if (py > 0) return 0;
  const o = obstacles.find(o => o.type === 'mud' && !o.passed && fx > o.x && fx < o.x + MUD.w);   // הולך פנימה – שוקע בהדרגה
  return o ? Math.min(MUD.deep, mudDepthAt(o, fx) * 0.7) : 0;
}
function mudBusy() { return !!mud; }

// המשיכה בגלים: כל משיכת יד גוררת את הנינג'ה קדימה, ובין משיכה למשיכה כמעט עוצרים (ממוצע = כל המרחק בזמן המשיכה)
function mudPullV(t) { return mudPullDist() / MUD.pullT * (Math.PI / 2) * Math.abs(Math.sin(Math.PI * 2 * t / MUD.pullCyc)); }
// מהירות העולם בזמן השלב (null = לא בשליטה שלנו)
function mudSpeed() {
  if (!mud) return null;
  if (mud.phase === 'pull') return mudPullV(mud.t);
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
    o.fr = viewR() + 12 - o.x; sfx('splash'); burst(PLAYER.x + 4, GROUND, '#6b4423', 10, 22);
    return;
  }
  const M = mud, o = M.o; M.t += dt;
  if (!['caught', 'tug', 'pull', 'thanks', 'sink'].includes(M.phase)) {          // בכל דחיפה למעלה – התזת בוץ
    const st = mudStruggle(), nx = PLAYER.x + 4;
    if (st.push && !M.pushed) { M.pushed = true; for (let k = 0; k < 7; k++) particles.push({ x: nx + (Math.random() - 0.5) * 7, y: waterY(), vx: (Math.random() - 0.5) * 16, vy: -10 - Math.random() * 12, g: 70, life: 0.5, color: Math.random() < 0.5 ? '#6e4c2e' : '#8a6440', size: 0.8 + Math.random() * 0.6 }); }
    if (!st.push) M.pushed = false;
  }
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
      o.fr += mudPullV(M.t) * 0.85 * dt;                                           // החבר צועד אחורה צעד בכל משיכה
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
  if ((M.phase === 'fly' && M.t >= MUD.flyT * 0.45) || M.phase === 'dangle') { M.phase = 'caught'; M.t = 0; M.hinted = 0; sfx('thud'); }
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
  P = poseIdle(now);                                                              // תקוע – נאבק כדי לצאת
  const st = mudStruggle(), w = Math.sin(now * 9);
  if (st.push) {                                                                  // לוחץ בשתי הידיים על הבוץ ומנסה להרים את עצמו
    const k = st.c / 0.28;
    P.arms = [[-0.9 + k * 0.5, -0.3], [0.9 - k * 0.5, 0.3]];
    P.lean = 0.25 * Math.sin(Math.PI * k); P.headTilt = -0.15; P.eyes = 'squint';
  } else {                                                                        // שוקע בחזרה – הידיים מושטות למעלה ומתנפנפות, מסתכל למעלה
    P.arms = [[-2.5 - w * 0.35, -2.9 - w * 0.4], [2.5 + Math.sin(now * 9 + 1.7) * 0.35, 2.9 + Math.sin(now * 9 + 1.7) * 0.4]];
    P.lean = -0.18 + Math.sin(now * 5) * 0.12; P.headTilt = -0.35 + Math.sin(now * 4) * 0.1;
  }
  return P;
}
// משיכה יד אחרי יד, בגובה החזה (לא מעל הראש): יד מושטת קדימה על החבל, תופסת ומושכת אל המותן – והשנייה באותו זמן חוזרת קדימה
function handOverHand(ph) {
  const s = q => (1 - Math.cos(2 * Math.PI * q)) / 2, arm = v => [lerp(1.5, 0.55, v), lerp(1.58, 2.35, v)];
  return [arm(s(ph + 0.5)), arm(s(ph))];
}
function friendPose(o) {
  const now = performance.now() / 1000, M = mud && mud.o === o ? mud : null, p = M ? M.phase : 'done';
  let P;
  if (p === 'come') P = poseRun(now * 20);
  else if (p === 'tug') { P = poseIdle(now); P.arms = handOverHand(0.15 + Math.sin(now * 9) * 0.03); P.lean = -0.3; P.legs = [[-0.55, -0.2], [0.6, 0.05]]; }   // מחזיק חזק, מוכן למשוך
  else if (p === 'pull') {                                                      // יד אחרי יד, לאט ובמאמץ, וצעד אחורה בכל משיכה
    const ph = M.t / MUD.pullCyc, q = Math.PI * 4 * ph, eff = Math.abs(Math.sin(Math.PI * 2 * ph));
    P = poseIdle(now); P.arms = handOverHand(ph); P.lean = -0.38 - eff * 0.12; P.headTilt = -0.2; P.hipY = -4.4 + eff * 0.3;
    P.legs = [[-0.5 + Math.sin(q) * 0.28, -0.15 - Math.max(0, Math.sin(q)) * 0.35], [0.6 - Math.sin(q) * 0.28, 0.05 - Math.max(0, -Math.sin(q)) * 0.35]];
    P.bob = -eff * 0.4;
  }
  else if (p === 'reel') P = posePull(now * 1.8);
  else if (p === 'slip') { const k = Math.min(1, M.t / MUD.slipT); P = poseIdle(now); P.lean = -0.7 * Math.sin(Math.PI * k); P.arms = [[-1.2, -0.8], [1.9, 2.4]]; }
  else if (p === 'caught') { P = poseIdle(now); P.arms = [[0.9, 1.1], [1.0, 1.25]]; P.lean = 0.1; }
  else if (p === 'thanks' || o.waving) { P = poseIdle(now); P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; }
  else { P = poseIdle(now); if (p !== 'sink' && p !== 'help') P.arms[1] = [0.6, 1.2]; }
  if (p === 'throw') { const k = Math.min(1, M.t / MUD.throwT); applyThrow(P, k); }
  return P;
}

/* ---------- ציור ---------- */
function figHand(fx, fy, facing, sc, P, i) {                                     // איפה כף היד של דמות (i: 0 אחורית, 1 קדמית) – לפי השלד של ninja-figure.js
  const S = RIG.shape, J = figureJoints(P), sh = i ? J.shF : J.shB, a = P.arms[i];
  const k = endOf(sh[0], sh[1], a[0], S.upper), e = endOf(k[0], k[1], a[1], S.fore);
  return [fx + facing * sc * e[0], fy + (P.bob || 0) * sc + sc * e[1]];
}
function friendHand(o) { return o._fh || [friendX(o) - 3.4, GROUND - 8.2]; }      // נקבע בכל פריים ב-drawMudBack – החבל צמוד ליד
function ninjaHand() { const nx = PLAYER.x + 4; return figHand(nx, GROUND + mudSink(nx), 1, 1, mudPose(poseIdle(performance.now() / 1000)), 1); }   // היד של הנינג'ה האוחז בחבל

// השלולית בנויה כמו האגם (draw.js): אגן עם גדות משופעות, ופני הבוץ קצת מתחת לקרקע – לא בולט מעליה
function mudPool(o) { return { x: o.x, w: MUD.w }; }
const MUD_BOTTOM = () => GROUND + 27;                                            // קרקעית האגן – סגור מלמטה, לא נמשך עד סוף המסך
function mudGrad() {
  const g = ctx.createLinearGradient(0, waterY(), 0, GROUND + 34);
  g.addColorStop(0, '#a47c55'); g.addColorStop(0.08, '#8a6440'); g.addColorStop(0.45, '#6e4c2e'); g.addColorStop(1, '#4e3420');
  return g;
}
function mudShore(o) {                                                           // בוץ שנמרח על השפה, וגוש דשא שנוטה מעל הבוץ
  const P = mudPool(o), wy = waterY(), wd = WORLDS[world];
  for (const [dir, ex] of [[1, P.x], [-1, P.x + P.w]]) {
    ctx.fillStyle = '#7a5838'; ctx.beginPath(); ctx.ellipse(ex + dir * (bankOff(P, wy) + 0.6), wy + 0.35, 2, 0.6, 0, 0, Math.PI * 2); ctx.fill();   // בוץ שנמרח על השפה
    ctx.fillStyle = wd.top; ctx.beginPath(); ctx.ellipse(ex - dir * 0.6, GROUND - 0.1, 2.6, 0.9, dir * 0.12, 0, Math.PI * 2); ctx.fill();
  }
}
// החבל ביד: לולאות שתלויות מכף היד ומתנדנדות עם התנועה (לא אייקון קבוע על הגוף)
function drawHangCoil(hx, hy, size, swing) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(swing); ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const rx = (1.3 + i * 0.22) * size, ry = (2.3 + i * 0.15) * size, cx = (i - 1) * 0.35 * size, cy = ry - 0.2;
    ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 0.85; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
// אחרי הזריקה: שאר החבל יוצא מהיד, יורד מאחורי החבר ושוכב ברפיון על הקרקע
function drawSlack(fx, h, n) {
  const g = [fx + 4.5, GROUND - 0.4];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = () => { ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.quadraticCurveTo(h[0] + 3.5, (h[1] + g[1]) / 2 + 2, g[0], g[1]); for (let k = 0; k < (n || 2); k++) { const cx = g[0] + 2 + k * 2.2; ctx.ellipse(cx, GROUND - 0.5 - k * 0.25, 2.4, 0.55, 0, Math.PI, Math.PI * 3); } };
  ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1.0; line(); ctx.stroke();
  ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.5; line(); ctx.stroke();
  ctx.restore();
}

// לפני הנינג'ה: הדופן הרחוקה, הבוץ, והחבר על הגדה
function drawMudBack(o) {
  const P = mudPool(o), bottom = MUD_BOTTOM(), t = performance.now() / 1000, wy = waterY();
  drawBasinWall(P, bottom);
  ctx.fillStyle = mudGrad(); waterPath(P, bottom); ctx.fill();
  mudShore(o);
  drawCrows(o, o.x + 8, o.x + MUD.w - 8, 1, GROUND - 26);                          // עורבים מעל הבוץ – מסבירים למה לא קופצים מעליו
  const fx = friendX(o);
  if (fx > viewR() + 10) return;
  const M = mud && mud.o === o ? mud : null, p = M ? M.phase : 'done';
  const FP = friendPose(o), h1 = figHand(fx, GROUND, -1, 1, FP, 1), h0 = figHand(fx, GROUND, -1, 1, FP, 0);
  const hand = h1[0] <= h0[0] ? h1 : h0, back = hand === h1 ? h0 : h1;           // החבל עובר דרך שתי הידיים: מהיד הקדמית אל הנינג'ה, ומהאחורית אל הקרקע
  o._fh = hand; o._fb = back;
  const coiled = ['sink', 'help', 'come', 'throw', 'reel'].includes(p) && !(p === 'throw' && M.t > MUD.throwT * 0.8);
  if (!coiled) drawSlack(fx, back, p === 'pull' || p === 'thanks' || p === 'done' ? 3 : 2);   // אחרי הזריקה – שאר החבל מאחוריו
  drawFigure({ fx, fy: GROUND, facing: -1, scale: 1, kind: 'ninja', accent: mudAccent(), pose: FP });
  if (coiled) {                                                                   // לפני הזריקה / באיסוף: החבל המגולגל תלוי מהיד ומתנדנד
    const sw = p === 'come' ? Math.sin(t * 16) * 0.35 : Math.sin(t * 2.2) * 0.08;
    drawHangCoil(hand[0], hand[1], p === 'reel' ? 0.55 + 0.45 * Math.min(1, M.t / MUD.reelT) : 1, sw);
  }
}

// אחרי הנינג'ה: הבוץ שוב (מכסה את הרגליים), ברק, בועות, החבל והבועות של הדיבור
function drawMudFront(o) {
  const t = performance.now() / 1000, P = mudPool(o), wy = waterY(), x0 = o.x, x1 = o.x + MUD.w, bottom = MUD_BOTTOM();
  ctx.save();
  ctx.fillStyle = mudGrad(); waterPath(P, bottom); ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,240,215,.28)';                                        // ברק רטוב על פני הבוץ
  for (let k = 0; k < MUD.w / 9; k++) { const xx = x0 + 8 + ((k * 9.7 + t * 0.8) % (MUD.w - 16)); ctx.beginPath(); ctx.ellipse(xx, wy + 0.5, 2.4, 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(70,45,25,.28)';                                           // כתמים וגושים בתוך הבוץ
  for (let k = 0; k < MUD.w / 5; k++) { ctx.beginPath(); ctx.ellipse(x0 + 10 + k * 5 + Math.sin(k * 3) * 1.5, wy + 4 + (k % 4) * 2.6, 1.6, 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  mudShore(o);
  for (let k = 0; k < MUD.w / 12; k++) {                                          // בועות שמתנפחות ומתפוצצות
    const ph = (t * 0.6 + k * 0.37) % 1, bx = x0 + 18 + k * 11 + Math.sin(k * 5) * 2, r = 0.3 + ph * 0.9;
    if (bx > x1 - 16) break;
    if (ph < 0.85) { ctx.strokeStyle = 'rgba(110,76,46,.95)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(bx, wy + 0.3, r, Math.PI, 0); ctx.stroke(); }
  }
  if (mud && mud.o === o) {
    const nx = PLAYER.x + 4, sk = mudSink(nx);
    if (sk > 1) {                                                                 // טבעת בוץ סביב המותניים
      ctx.fillStyle = '#6e4c2e'; ctx.beginPath(); ctx.ellipse(nx + 0.5, wy + 0.2, 4.2, 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,236,200,.25)'; ctx.beginPath(); ctx.ellipse(nx - 0.5, wy - 0.05, 2.4, 0.25, 0, 0, Math.PI * 2); ctx.fill();
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
  const floatAt = [nx + 5.5, waterY() + 0.3];                                       // קצה החבל צף על הבוץ מול הנינג'ה
  ctx.save(); ctx.lineCap = 'round';
  if (p === 'fly') {
    const k = Math.min(1, M.t / MUD.flyT), ex = lerp(fh[0], floatAt[0], k), ey = lerp(fh[1], floatAt[1], k) - Math.sin(Math.PI * k) * 18;
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
    if (o._fb) ropeLine(o._fb, fh, 0.3, 0);                                      // החבל בין שתי הידיים
    if (p === 'tug' && labelsVisible()) label('HOLD', nx, GROUND - 26, 4, '#fde047', '#1e293b');
  } else if (p === 'slip') {                                                      // החבל בורח מהידיים
    const k = Math.min(1, M.t / 0.35), end = [lerp(nh[0], fh[0] - 6, k), lerp(nh[1], GROUND - 1, k)];
    ropeLine(fh, end, 1.5 + k * 2, 0);
  }
  ctx.restore();
}
function drawMudTalk(o) {                                                         // בועות קומיקס
  const M = mud && mud.o === o ? mud : null, fx = friendX(o), nx = PLAYER.x + 4;
  if (!M) { if (o.waving && fx < viewR() + 4 && fx > viewL() - 6) drawBubble('Bye! 👋', fx, GROUND - 21, { tail: -1, size: 3.4 }); return; }
  const p = M.phase, ny = GROUND + mudSink(nx) - 20;
  if (['help', 'come', 'throw', 'reel'].includes(p) || (p === 'drop')) drawBubble('Help! 😱', nx + 1, ny, { age: p === 'help' ? M.t : undefined, tail: 1, color: '#b91c1c' });
  if (p === 'come' && fx < viewR() - 4) drawBubble("I'm coming!", fx, GROUND - 21, { age: M.t, tail: -1, size: 3.6 });
  if (p === 'fly' || p === 'dangle') drawBubble('Catch!', fx, GROUND - 21, { age: p === 'fly' ? M.t : undefined, tail: -1, color: '#1d4ed8' });
  if (p === 'pull') drawBubble('Hnnng!', fx, GROUND - 21, { age: M.t, tail: -1, size: 3.4, color: '#7c2d12' });
  if (p === 'tug') drawBubble('Hold on!', fx, GROUND - 21, { age: M.t, tail: -1, color: '#1d4ed8' });
  if (p === 'slip') drawBubble('Oops!', fx, GROUND - 20, { age: M.t, tail: -1, size: 3.6 });
  if (p === 'thanks') { drawBubble('Great job!', fx + 3, GROUND - 21, { age: M.t, tail: -1, color: '#15803d' }); if (M.t > 0.5) drawBubble('Thank you!', nx - 3, GROUND - 21, { age: M.t - 0.5, tail: 1, color: '#be185d', size: 3.6 }); }
}

/* ---------- עורבים ---------- */
// להקה קטנה שעפה הלוך ושוב מעל מכשול רחב (בוץ, נהר) בגובה של קפיצה – רואים שאי אפשר פשוט לקפוץ מעליו
// אם הנינג'ה מלווה בדרקון ועורב מתקרב אליו – הדרקון נושף אש ושורף אותו (העורב נופל מפויח ונעלם)
function petDragonNear(x, y) { return typeof petX !== 'undefined' && petX && typeof getEquip === 'function' && player && getEquip().pet === 'dragon' && Math.hypot(x - (petX + 5), y - petY) < 24 && x > petX - 2; }
function drawCrows(o, x0, x1, seed, y0) {
  const t = performance.now() / 1000, span = x1 - x0, n = Math.max(2, Math.min(4, Math.round(span / 35)));
  o.crowBurn = o.crowBurn || {};
  for (let i = 0; i < n; i++) {
    const ph = t * (0.32 + i * 0.05) + i * 2.1 + seed, u = (Math.sin(ph) + 1) / 2, dir = Math.cos(ph) >= 0 ? 1 : -1;
    let x = x0 + span * (0.1 + 0.8 * ((u + i / n) % 1)), y = y0 - i % 2 * 4 + Math.sin(t * 2.3 + i) * 1.2;
    const B = o.crowBurn[i];
    if (B && B.hit) {                                                             // נשרף: נופל מפויח, מעשן, ונעלם
      const a = t - B.hit; if (a > 1.3) continue;
      x = B.x + a * 4 + (o.x - B.ox); y = B.y + 26 * a * a;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - a / 1.3); ctx.translate(x, y); ctx.rotate(a * 5); ctx.translate(-x, -y);
      drawCrow(x, y, dir, 0.4, '#3f3f46'); ctx.restore();
      if (Math.random() < 0.4) particles.push({ x, y: y - 1, vx: (Math.random() - 0.5) * 3, vy: -6, g: -3, life: 0.6, color: 'rgba(87,83,78,.7)', size: 1.1 });
      continue;
    }
    if (x < viewL() - 6 || x > viewR() + 6) continue;
    if (!B && state === 'play' && petDragonNear(x, y)) { o.crowBurn[i] = { fire: t }; if (typeof petFireUntil !== 'undefined') petFireUntil = t + 0.45; sfx('swish'); }
    const F = o.crowBurn[i];
    if (F && F.fire && !F.hit) {                                                  // להבה מהפה של הדרקון אל העורב
      const a = (t - F.fire) / 0.32, mx = petX + 6.2, my = petY - 0.6, ex = lerp(mx, x, Math.min(1, a)), ey = lerp(my, y, Math.min(1, a));
      const g = ctx.createLinearGradient(mx, my, ex, ey); g.addColorStop(0, 'rgba(254,240,138,.95)'); g.addColorStop(0.5, 'rgba(251,146,60,.9)'); g.addColorStop(1, 'rgba(220,38,38,.7)');
      ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo((mx + ex) / 2, (my + ey) / 2 - 1.5, ex, ey); ctx.stroke();
      ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
      if (Math.random() < 0.7) particles.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 10, vy: -4 - Math.random() * 4, g: -2, life: 0.35, color: Math.random() < 0.5 ? '#f97316' : '#fde047', size: 0.9 });
      if (a >= 1) { F.hit = t; F.x = x; F.y = y; F.ox = o.x; burst(x, y, '#f97316', 10, 18); }
    }
    drawCrow(x, y, dir, Math.sin(t * 11 + i * 1.7));
    if (Math.sin(t * 0.9 + i * 2.7) > 0.985) drawBubble('Caw!', x, y - 3, { tail: dir, size: 2.8, color: '#111827' });
  }
}
function drawCrow(x, y, dir, flap, burnt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * 1.25, 1.25);
  const wing = (dy, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-0.8, -0.2); ctx.quadraticCurveTo(-1.6, dy * 0.6, -3.2, dy); ctx.quadraticCurveTo(-1.4, dy * 0.25 + 0.3, 0.8, 0.2); ctx.closePath(); ctx.fill(); };
  wing(-2.4 - flap * 1.6, burnt || '#374151');                                             // כנף רחוקה
  ctx.fillStyle = burnt || '#111827'; ctx.beginPath(); ctx.ellipse(0, 0.2, 2.2, 1.0, -0.08, 0, Math.PI * 2); ctx.fill();   // גוף
  ctx.beginPath(); ctx.moveTo(-1.9, 0.1); ctx.lineTo(-3.4, -0.4); ctx.lineTo(-3.3, 0.9); ctx.closePath(); ctx.fill();   // זנב
  ctx.beginPath(); ctx.arc(2.0, -0.4, 0.85, 0, Math.PI * 2); ctx.fill();          // ראש
  ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(2.7, -0.55); ctx.lineTo(3.9, -0.2); ctx.lineTo(2.7, -0.05); ctx.closePath(); ctx.fill();   // מקור
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(2.3, -0.6, 0.2, 0, Math.PI * 2); ctx.fill();   // עין
  wing(-2.0 - flap * 2.0, '#1f2937');                                             // כנף קרובה
  ctx.restore();
}
