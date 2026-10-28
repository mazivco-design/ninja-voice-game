/* ninja-voice-game – fight.js
   FIGHT: נינג'ה אויב עם חרב. כשמתקרבים הוא מזנק ונוחת מול הנינג'ה, והעולם עוצר לקרב.
   כל FIGHT = הנפת חרב אחת: החרבות נפגשות (ניצוצות וצליל מתכת) והאויב נהדף צעד אחורה. מונה של 3 עיגולים מעל הראש שלו.
   אחרי 3 הנפות החרב שלו עפה, הוא נופל על הישבן ובורח – והריצה ממשיכה.
   שתיקה: האויב מרים חרב (סימן ! מהבהב) ותוקף = פגיעה רגילה, והקרב ממשיך. בקל יש יותר זמן עד שהוא תוקף.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let duel = null;      // { o, phase: 'enter' | 'face' | 'attack' | 'win' | 'flee', t, atk, hits, react, push, struck, clashAt, fromX }
let fightT = 0;       // הנפת החרב של הנינג'ה (אנימציה)
let duelSwords = [];  // חרבות שעפו מהאויב – נתקעות באדמה ונשארות מאחור
const DUEL = { see: 46, gap: 17, enter: 0.75, wait: { easy: 2.8, medium: 2.0, hard: 1.5 }, windup: 0.75, lunge: 0.4,
               swing: 0.4, need: 3, fall: 1.0, run: 62, kb: 3, scale: 1.08 };
const DUEL_SUIT = { body: '#6b7280', back: '#4b5563', front: '#9ca3af', edge: '#1f2937' };   // אויב אפור עם סרט אדום
const DUEL_ACCENT = '#dc2626';

function duelHolds() { return !!duel && duel.phase !== 'flee'; }                                    // העולם עומד בזמן הקרב
function duelActive() { return !!duel && (duel.phase === 'enter' || duel.phase === 'face' || duel.phase === 'attack'); }
function duelWait() { return DUEL.wait[diffKey] || DUEL.wait.medium; }

function duelUpdate(dt, pb) {
  if (fightT > 0) fightT = Math.max(0, fightT - dt);
  for (const s of duelSwords) {                                                  // חרב עפה: נופלת ונתקעת באדמה, ואז זזה עם העולם
    if (!s.stuck) { s.vy += 90 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
      if (s.y >= GROUND - 8 && s.vy > 0) { s.stuck = true; s.y = GROUND - 8; s.a = 0.3; burst(s.x, GROUND, WORLDS[world].dust, 5, 12); } }
    else s.x -= curSpeed() * dt;
  }
  duelSwords = duelSwords.filter(s => s.x > -15);
  if (!duel) {
    const o = obstacles.find(o => o.type === 'duel' && !o.passed && !o.hit && o.x - pb.r <= DUEL.see);
    if (o) { duel = { o, phase: 'enter', t: 0, atk: duelWait(), hits: 0, react: 0, push: 0, fromX: o.x }; o.x = PLAYER.x + 4 + DUEL.gap; duckT = 0; sfx('jump'); }
    return;
  }
  const d = duel, o = d.o; d.t += dt;
  if (!obstacles.includes(o)) { duel = null; return; }
  if (d.react > 0) d.react -= dt;
  if (d.push > 0) { const m = Math.min(d.push, 18 * dt); o.x += m; d.push -= m; }
  if (d.clashAt !== undefined && (d.clashAt -= dt) <= 0) { d.clashAt = undefined; duelClash(); }
  if (d.phase === 'enter') {
    if (d.t >= DUEL.enter) { d.phase = 'face'; d.t = 0; d.atk = duelWait(); burst(o.x, GROUND - 0.5, WORLDS[world].dust, 10, 18); }
  } else if (d.phase === 'face') {
    if (!o.demo && state === 'play') d.atk -= dt;                                // בהדגמה – האויב לא תוקף
    if (d.atk <= 0) { d.phase = 'attack'; d.t = 0; d.struck = false; sfx('swish'); }
  } else if (d.phase === 'attack') {                                             // זינוק קדימה עם החרב – אם לא אמרו FIGHT בזמן
    if (!d.struck && d.t >= DUEL.lunge * 0.55) { d.struck = true; duelHurt(o); }
    if (d.t >= DUEL.lunge) { d.phase = 'face'; d.t = 0; d.atk = duelWait(); }
  } else if (d.phase === 'win') {                                                // יושב על הישבן, מבוהל
    if (d.t >= DUEL.fall) { d.phase = 'flee'; d.t = 0; }
  } else if (d.phase === 'flee') {                                               // קם ובורח – והעולם ממשיך
    o.x += DUEL.run * dt;
    if (o.x > W + 14 || d.t > 3) { obstacles = obstacles.filter(x => x !== o); duel = null; }
  }
}

// FIGHT: הנפת חרב. מול אויב – פוגעת בחרב שלו ומקדמת את המונה
function fightCmd() {
  fightT = DUEL.swing; duckT = 0; sfx('swish');
  if (!duelActive()) return;                                                       // גם באמצע ההתקפה שלו – המכה נספרת
  const d = duel;
  if (d.phase === 'enter') { d.phase = 'face'; d.t = 0; o2land(d.o); }                         // אמר FIGHT עוד באוויר – נוחת מיד
  d.hits++; d.react = 0.45; d.push += DUEL.kb; d.clashAt = DUEL.swing * 0.38;
  if (d.phase === 'attack') { d.phase = 'face'; d.t = 0; }                                       // עצר את ההתקפה באמצע
  d.atk = duelWait();
  if (d.hits >= DUEL.need) { d.phase = 'win'; d.t = 0; d.won = true; if (!d.o.demo) cleared(d.o); else d.o.passed = true; }
}
function o2land(o) { burst(o.x, GROUND - 0.5, WORLDS[world].dust, 10, 18); }

function duelClash() {                                                           // המפגש של שתי החרבות
  if (!duel) return;
  const o = duel.o, cx = (PLAYER.x + 4 + o.x) / 2 + 1, cy = GROUND - 12;
  sfx('clash'); shakeT = Math.max(shakeT, 0.12);
  burst(cx, cy, '#fde047', 9, 34); burst(cx, cy, '#ffffff', 6, 26);
  if (duel.won) {                                                                // ההנפה השלישית – החרב של האויב עפה
    duelSwords.push({ x: o.x - 2, y: GROUND - 15, vx: 26, vy: -62, a: 3.2, va: 15, stuck: false });
    burst(o.x, GROUND - 14, '#fde047', 14, 40);
  }
}

// האויב פגע – כמו פגיעה רגילה, אבל הקרב ממשיך (לא מסמנים את המכשול כ"פגוע")
function duelHurt(o) {
  shakeT = 0.3; sfx('hit');
  if (state === 'demo' || state === 'intro' || o.demo) { flash = { text: HIT_WORD.duel, t: 1.2 }; invulnT = INVULN_TIME; return; }
  if (dragonSave()) { invulnT = INVULN_TIME; return; }                           // הדרקון שומר עליו
  hits++;
  if (typeof voiceMark === 'function') voiceMark('hit');
  flash = { text: HIT_WORD.duel, t: 1.2 }; invulnT = INVULN_TIME;
  if (isFinite(lives)) {
    lives--; renderHud();
    if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; }
  } else if (cfg.penalty && mode === 'free') score = Math.max(0, score - cfg.penalty);
  renderHud();
}

/* ---------- תנוחות ---------- */
// עמידת קרב: רגליים פסוקות, חרב מורמת קדימה. swordA = זווית החרב (מ"ישר למטה", חיובי = קדימה)
function poseGuard(now) {
  const P = poseIdle(now);
  P.hipY = -4.3; P.lean = 0.08; P.spine = 0.05;
  P.legs = [[-0.45, -0.25], [0.5, 0.15]]; P.arms = [[-0.5, 0.3], [0.9, 2.1]];
  P.swordA = 2.45;
  return P;
}
function applySwing(P, k) {                                                     // מרים מעל הראש → מכה קדימה → חוזר לעמידה
  let arm, sw, lean, lunge;
  if (k < 0.25) { const e = k / 0.25; arm = [lerp(0.9, 2.7, e), lerp(2.1, 3.1, e)]; sw = lerp(2.45, 3.5, e); lean = lerp(0.08, -0.12, e); lunge = 0; }
  else if (k < 0.5) { const e = (k - 0.25) / 0.25; arm = [lerp(2.7, 1.5, e), lerp(3.1, 1.45, e)]; sw = lerp(3.5, 1.6, e); lean = lerp(-0.12, 0.35, e); lunge = e; }
  else { const e = (k - 0.5) / 0.5; arm = [lerp(1.5, 0.9, e), lerp(1.45, 2.1, e)]; sw = lerp(1.6, 2.45, e); lean = lerp(0.35, 0.08, e); lunge = 1 - e; }
  P.arms = [P.arms[0], arm]; P.swordA = sw; P.lean = lean;
  if (P.legs) P.legs = [[-0.45 - 0.3 * lunge, -0.25], [0.5 + 0.45 * lunge, 0.15]];
  P.eyes = 'squint';
  return P;
}
// הנינג'ה בזמן קרב / הנפה (נקרא מ-playerPose)
function duelPlayerPose(P, now) {
  const armed = (duel && duel.phase !== 'flee') || fightT > 0;
  if (!armed) return P;
  if (py <= 0 && duckT <= 0 && curSpeed() === 0) P = poseGuard(now);
  else P.swordA = 2.2;
  if (fightT > 0) applySwing(P, 1 - fightT / DUEL.swing);
  return P;
}

/* ---------- ציור ---------- */
function handAt(fx, fy, facing, scale, P) {                                      // איפה היד הקדמית של הדמות בעולם
  const S = RIG.shape, J = figureJoints(P), a = P.arms[1];
  const k = endOf(J.shF[0], J.shF[1], a[0], S.upper), e = endOf(k[0], k[1], a[1], S.fore);
  return [fx + facing * scale * e[0], fy + (P.bob || 0) * scale + scale * e[1]];
}
function drawBlade(hx, hy, ang, facing, scale, glove) {                          // קטאנה ביד: ידית, מגן יד, להב עם ברק
  const ux = Math.sin(ang) * facing, uy = Math.cos(ang), s = scale;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.0 * s;
  ctx.beginPath(); ctx.moveTo(hx - ux * 1.8 * s, hy - uy * 1.8 * s); ctx.lineTo(hx + ux * 0.9 * s, hy + uy * 0.9 * s); ctx.stroke();
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.8 * s;
  ctx.beginPath(); ctx.moveTo(hx + ux * 1.2 * s, hy + uy * 1.2 * s); ctx.lineTo(hx + ux * 9.5 * s, hy + uy * 9.5 * s); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 0.25 * s;
  ctx.beginPath(); ctx.moveTo(hx + ux * 1.6 * s - uy * 0.15, hy + uy * 1.6 * s + ux * 0.15); ctx.lineTo(hx + ux * 9.0 * s - uy * 0.15, hy + uy * 9.0 * s + ux * 0.15); ctx.stroke();
  ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.ellipse(hx + ux * 1.05 * s, hy + uy * 1.05 * s, 0.45 * s, 1.15 * s, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.fill();   // מגן יד
  if (glove) { ctx.fillStyle = glove; circle(hx, hy, RIG.shape.handR * s); }      // הכפפה מעל הידית
  ctx.restore();
}
function drawPlayerSword(fx, fy, P) {
  if (P.swordA === undefined) return;
  const [hx, hy] = handAt(fx, fy, 1, 1, P);
  drawBlade(hx, hy, P.swordA, 1, 1, playerColor());
  if (fightT > 0) {                                                            // קשת לבנה של ההנפה
    const k = 1 - fightT / DUEL.swing;
    if (k > 0.22 && k < 0.6) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 - Math.abs(k - 0.4) * 3) + ')'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(fx + 1, fy - 9, 10, -1.9, 0.1); ctx.stroke(); }
  }
}

function duelEnemyPose(d, now) {
  const P = poseGuard(now + 1.3); P.eyes = 'squint';
  if (!d) return P;                                                             // עוד לא התחיל – עומד ומחכה
  if (d.phase === 'enter') {                                                    // מזנק פנימה עם חרב מורמת
    const A = poseAir(true); A.arms = [[-1.6, -1.9], [2.6, 3.0]]; A.swordA = 3.4; A.eyes = 'squint'; return A;
  }
  if (d.phase === 'win') {                                                      // יושב על הישבן, ידיים מאחור, עיניים פעורות
    Object.assign(P, { hipY: -1.3, lean: -0.45, spine: -0.1, bob: 0, legs: [[1.35, 1.6], [1.6, 1.85]], arms: [[-1.0, -0.55], [-0.85, -0.35]], eyes: 'wide', swordA: undefined, headTilt: 0.25 });
    return P;
  }
  if (d.phase === 'flee') { const R = poseRun(now * 16); R.eyes = 'wide'; R.lean = 0.35; return R; }
  if (d.phase === 'attack') {                                                   // מכה קדימה
    const e = Math.min(1, d.t / (DUEL.lunge * 0.55));
    P.arms = [P.arms[0], [lerp(2.6, 1.5, e), lerp(3.05, 1.45, e)]]; P.swordA = lerp(3.6, 1.6, e); P.lean = lerp(-0.15, 0.4, e);
    P.legs = [[-0.75, -0.25], [0.95, 0.15]];
    return P;
  }
  if (d.react > 0) {                                                            // חוסם את המכה ונהדף – מופתע
    P.arms = [P.arms[0], [1.25, 2.85]]; P.swordA = 3.05; P.lean = -0.25; P.eyes = 'wide';
    return P;
  }
  if (d.atk <= DUEL.windup) {                                                   // מתכונן לתקוף: חרב מעל הראש
    P.arms = [P.arms[0], [2.6, 3.05]]; P.swordA = 3.6; P.lean = -0.15;
  }
  return P;
}

function drawDuelEnemy(o) {
  const d = duel && duel.o === o ? duel : null, now = performance.now() / 1000;
  let fx = o.x, fy = GROUND, facing = d && d.phase === 'flee' ? 1 : -1;
  if (d && d.phase === 'enter') {                                               // קשת הזינוק מהמקום שבו עמד אל מול הנינג'ה
    const k = Math.min(1, d.t / DUEL.enter);
    fx = lerp(d.fromX, o.x, k); fy = GROUND - Math.sin(Math.PI * k) * 22;
  }
  if (d && d.phase === 'attack') fx -= Math.sin(Math.PI * Math.min(1, d.t / DUEL.lunge)) * 6;   // זינוק קדימה במכה
  const P = duelEnemyPose(d, now), s = DUEL.scale;
  if (fy >= GROUND - 0.1) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.6, 4.5, 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save();
  if (d && d.phase === 'flee') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, d.t - 0.9) / 0.6);
  drawFigure({ fx, fy, facing, scale: s, kind: 'ninja', accent: DUEL_ACCENT, suit: DUEL_SUIT, pose: P });
  if (P.swordA !== undefined) { const [hx, hy] = handAt(fx, fy, facing, s, P); drawBlade(hx, hy, P.swordA, facing, s, DUEL_ACCENT); }
  ctx.restore();
  // מונה: 3 עיגולים מעל הראש, מתמלאים בכל FIGHT
  const hits = d ? d.hits : 0, cy = fy - 24;
  if (!d || d.phase !== 'flee') {
    for (let i = 0; i < DUEL.need; i++) {
      const cx = fx + (i - 1) * 4.2;
      ctx.fillStyle = 'rgba(15,23,42,.55)'; circle(cx, cy, 1.75);
      ctx.fillStyle = i < hits ? '#fde047' : 'rgba(255,255,255,.35)'; circle(cx, cy, 1.25);
    }
  }
  if (d && d.phase === 'face' && d.atk <= DUEL.windup && !o.demo) {           // סימן אזהרה פועם: עוד רגע הוא תוקף
    const r = 2.6 + 0.5 * Math.sin(now * 18), ax = fx - 8, ay = fy - 17;
    ctx.fillStyle = 'rgba(220,38,38,.3)'; circle(ax, ay, r + 1.2);
    ctx.fillStyle = '#dc2626'; circle(ax, ay, r);
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + (r * 1.4).toFixed(2) + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', ax, ay + 0.2);
  }
  if (!d || d.phase === 'face' || d.phase === 'attack' || d.phase === 'enter') label('FIGHT', fx, cy - 6, 4, '#fde047', '#1e293b');
}
function drawDuelFx() {                                                         // החרב שעפה מהאויב
  for (const s of duelSwords) {
    ctx.save();
    if (s.stuck) { ctx.beginPath(); ctx.rect(s.x - 20, s.y - 20, 40, GROUND + 0.3 - (s.y - 20)); ctx.clip(); }   // הלהב נעוץ באדמה
    ctx.translate(s.x, s.y); ctx.rotate(s.a);
    drawBlade(0, 0, 0, 1, 1, null);
    ctx.restore();
  }
}
