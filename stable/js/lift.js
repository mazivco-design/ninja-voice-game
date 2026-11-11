/* ninja-voice-game – lift.js
   PICK UP + PUT DOWN: סלע על הדרך. הנינג'ה נעצר לידו – אומרים PICK UP והוא מרים אותו מעל הראש וממשיך ללכת (לאט, הסלע כבד).
   שני מצבים (לסירוגין):
   · קיר גבוה – גבוה מדי לקפיצה. ליד הקיר הוא נעצר – PUT DOWN מניח את הסלע צמוד לקיר, הוא עולה עליו, ו-JUMP מעל הקיר.
   · פרס גבוה – כוכב זהב שמרחף גבוה מדי לקפיצה רגילה. מתחתיו יש סימן על הקרקע – PUT DOWN שם, עולים על הסלע ו-JUMP אל הכוכב (בונוס).
   · הצלה – גור כלבים תקוע בתחתית בור עמוק בדרך (רואים את הבור בחתך). PICK UP מרים חבל מגולגל, THROW זורק אותו לבור, הגור נושך את החבל, ו-PULL מושך אותו החוצה. הגור מודה ונותן מטבעות.
   · קרש – במקום סלע יש קרש עץ ארוך. בהמשך בור עם נחל: בשפה PUT DOWN – הקרש נוחת לרוחב הבור, והנינג'ה עובר עליו בהליכה (הקרש מתנדנד קצת).
   הכול סבלני: העולם מחכה למילה. אחרי שתיקה ארוכה המשחק אומר את המילה בקול.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let lift = null;   // { o, phase: 'atRock' | 'lifting' | 'carry' | 'atTarget' | 'placing' | 'climb' | 'onRock' | 'jumping' | 'crossing' | 'throwing' | 'bite' | 'waitPull' | 'pulling' | 'thanks', t, idle, hinted }
const RESC = { pitAt: 44, half: 8, deep: 23, throwT: 0.65, biteT: 0.6, pullT: 2.2, thanksT: 1.4, coins: 5 };   // בור צר ועמוק בדרך – רואים אותו בחתך, והגור בתחתית
const GRAB = { w: 12, coins: 3 }, GRAB_ITEMS = ['chest', 'bag', 'scroll'], GRAB_ICON = { chest: '🎁', bag: '💰', scroll: '📜' };   // אוצרות להרים (שיעור PICK UP)
const FAM = { cross: 1.8 };   // הגור שעובר על הקרש אל אמא שלו
const PLANK = { len: 42, th: 2.6, gapAt: 52, gapW: 32, deep: 22, cross: 0.55 };   // קרש מעל בור
const LIFT = { rockW: 10, rockH: 8, gap: 46, wallW: 10, wallH: 22, starDY: 39, starAhead: 7, starR: 4.2, carry: 0.7,
               liftT: 0.5, putT: 0.45, climbT: 0.45, hint: 3.5, hintEvery: 6, prizeCoins: 5 };
let liftKindNext = null, liftIdx = 0, ptIdx = 0;   // ptIdx: PUSH TOGETHER – עגלה / סירה לסירוגין
// אילו סצנות מתאימות למצב הנוכחי – למידה הדרגתית:
// שיעור PICK UP – רק אוצרות להרים · PICK UP + PUT DOWN – קיר / כוכב / קרש · PICK UP + THROW – הצלת הגור (ואוצר)
// במסע – לפי המילים שכבר נלמדו
function liftKinds() {
  if (mode === 'stage') {
    const ws = (STAGES[stageIdx] || {}).words || [];
    if (ws.includes('put down')) return ['wall', 'prize', 'plank'];
    if (ws.includes('throw')) return ['rescue', 'grab'];
    return ['grab'];
  }
  const k = ['grab'];
  if (mode === 'free' || isLearned('put down')) k.push('wall', 'prize', 'plank');
  if (mode === 'free' || (isLearned('throw') && isLearned('pull'))) k.push('rescue');
  return k;
}

function liftSetup(o) {                                                         // נקרא ב-spawn
  o.item = GRAB_ITEMS[Math.floor(Math.random() * GRAB_ITEMS.length)];
  if (liftKindNext) { o.kind = liftKindNext; liftKindNext = null; }           // בהדגמה / בבדיקות – סצנה מסוימת
  else { const ks = liftKinds(); o.kind = ks[liftIdx++ % ks.length]; }
  o.rock = 'ground';                                                            // ground | carried | placed
  o.w = o.kind === 'grab' ? GRAB.w : o.kind === 'rescue' ? RESC.pitAt + RESC.half + 6 : o.kind === 'plank' ? PLANK.gapAt + PLANK.gapW + 26 : LIFT.gap + (o.kind === 'wall' ? LIFT.wallW : 0) + 4;
}
function liftWallX(o) { return o.x + LIFT.gap; }                                // הקיר (או הסימן של הפרס) – תחילתו
function liftPlaceX(o) { return o.kind === 'rescue' ? o.x + RESC.pitAt - RESC.half - 14 : o.kind === 'plank' ? o.x + PLANK.gapAt - 13 : o.x + LIFT.gap - LIFT.rockW; }   // איפה הסלע מונח (בקרש: שפת הבור)
function plankGap(o) { return { l: o.x + PLANK.gapAt, r: o.x + PLANK.gapAt + PLANK.gapW }; }
function plankSpan(o) { const g = plankGap(o), m = (PLANK.len - PLANK.gapW) / 2; return { l: g.l - m, r: g.r + m }; }   // הקרש מונח לרוחב הבור
function liftStar(o) { return [liftPlaceX(o) + LIFT.rockW / 2 + LIFT.starAhead, GROUND - LIFT.starDY]; }
function liftBase() { return speed || runSpeed || (cfg && cfg.speed) || 35; }                  // בהדגמה העולם עומד (speed = 0) – אז לפי מהירות הריצה

// מהירות העולם בזמן השלב (null = לא בשליטה שלנו)
function liftSpeed() {
  if (!lift) return null;
  const p = lift.phase;
  if (p === 'carry') return liftBase() * LIFT.carry;
  if (p === 'jumping') return lift.o.kind === 'wall' && !lift.o.overWall ? 0 : liftBase();
  if (p === 'crossing') return liftBase() * PLANK.cross;                       // הולך בזהירות על הקרש
  if (p === 'hop') return liftBase();
  if (p === 'walkOut') return liftBase() * 0.8;
  if (p === 'pupCross') return 0;                               // הולך לשפת הבור ואז קופץ                                          // קופץ מעל הבור הצר וממשיך
  return 0;
}
function liftCarrying() { return !!lift && ['lifting', 'carry', 'atTarget', 'placing'].includes(lift.phase); }
function pitX(o) { return o.x + RESC.pitAt; }

function liftUpdate(dt, pb) {
  for (const p of obstacles) if (p.type === 'lift' && p.pup && p.pup.run) p.pup.run += dt;   // הגור שניצל רץ קדימה (וקופץ מעל הבור)
  if (!lift) {
    const o = obstacles.find(o => o.type === 'lift' && !o.passed && o.rock === 'ground' && o.x - pb.r <= 1.5 && o.x + (o.kind === 'plank' ? PLANK.len : LIFT.rockW) > pb.l);
    if (o && py <= 0) { lift = { o, phase: 'atRock', t: 0, idle: 0, hinted: 0 }; duckT = 0; }
    return;
  }
  const L = lift, o = L.o; L.t += dt;
  if (!obstacles.includes(o)) { lift = null; return; }
  if (L.phase === 'atRock' || L.phase === 'atTarget' || L.phase === 'onRock' || L.phase === 'waitPull') {   // מחכים למילה – אחרי שתיקה ארוכה המשחק אומר אותה
    L.idle += dt;
    if (L.idle >= LIFT.hint + L.hinted * LIFT.hintEvery && state === 'play') { L.hinted++; sayWords([liftExpected()[0]], 1.6, L); }
  }
  if (o.kind === 'rescue' && liftRescueStep(L, o, dt, pb)) return;
  if (L.phase === 'lifting' && L.t >= LIFT.liftT && o.kind === 'grab') {   // אוצר: נכנס לתיק – מטבעות, והולכים הלאה
    o.rock = 'taken'; sfx('coin'); burst(PLAYER.x + 4, GROUND - 18, '#fde047', 14, 34);
    if (mode === 'journey' && state === 'play') { picked += GRAB.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 24, '+' + GRAB.coins + ' 🟡', '#ca8a04'); }
    else floatText(PLAYER.x + 4, GROUND - 24, GRAB_ICON[o.item] || '⭐', '#ca8a04');
    cleared(o); lift = null; return;
  }
  if (L.phase === 'lifting' && L.t >= LIFT.liftT) { L.phase = 'carry'; L.t = 0; }
  else if (L.phase === 'carry') {
    const over = pb.r - liftPlaceX(o);
    if (over >= -0.3) { if (over > 0) ropeShiftBy(-over); L.phase = 'atTarget'; L.t = 0; L.idle = 0; L.hinted = 0; }   // הגיע – נעצר בדיוק לפני המקום
  }
  else if (L.phase === 'placing' && L.t >= LIFT.putT && o.kind === 'plank') {   // הקרש נחת לרוחב הבור – עוברים עליו
    o.rock = 'placed'; sfx('thud'); const sp = plankSpan(o); burst(sp.l + 1, GROUND - 0.5, WORLDS[world].dust, 6, 14); burst(sp.r - 1, GROUND - 0.5, WORLDS[world].dust, 6, 14);
    L.phase = 'pupCross'; L.t = 0;                                               // קודם הגור עובר אל אמא שלו
  }
  else if (L.phase === 'pupCross' && L.t >= FAM.cross) {
    L.phase = 'crossing'; L.t = 0; sfx('woof'); const g = plankGap(o); burst(g.r + 6, GROUND - 8, '#f472b6', 10, 20); o.reunited = true;
  }
  else if (L.phase === 'crossing') {
    if (PLAYER.x > plankGap(o).r + 1) { cleared(o); lift = null; }               // עבר את הבור
  }
  else if (L.phase === 'placing' && L.t >= LIFT.putT) {
    o.rock = 'placed'; sfx('thud'); burst(liftPlaceX(o) + LIFT.rockW / 2, GROUND - 1, WORLDS[world].dust, 10, 18);
    L.phase = 'climb'; L.t = 0; L.shift = (liftPlaceX(o) + LIFT.rockW / 2) - (PLAYER.x + 4); L.shifted = 0;
  }
  else if (L.phase === 'climb') {                                              // עולה על הסלע: העולם זז קצת כדי שהסלע יהיה מתחת לרגליים
    const k = Math.min(1, L.t / LIFT.climbT), e = k * k * (3 - 2 * k);
    ropeShiftBy(L.shift * e - L.shifted); L.shifted = L.shift * e;
    if (k >= 1) { L.phase = 'onRock'; L.t = 0; L.idle = 0; L.hinted = 0; }
  }
  else if (L.phase === 'jumping') {
    if (o.kind === 'wall' && !o.overWall && py >= LIFT.wallH + 1) o.overWall = true;   // גבוה מעל הקיר – העולם ממשיך לזוז
    if (o.kind === 'prize' && !o.got) {
      const [sx, sy] = liftStar(o);
      if (pb.r > sx - LIFT.starR && pb.l < sx + LIFT.starR && pb.t < sy + LIFT.starR && pb.b > sy - LIFT.starR) liftGrab(o, sx, sy);
    }
  }
}
function liftGrab(o, sx, sy) {                                                  // תפס את הכוכב
  o.got = true; sfx('coin'); burst(sx, sy, '#fde047', 18, 45); burst(sx, sy, '#ffffff', 8, 30);
  if (mode === 'journey' && state === 'play') { picked += LIFT.prizeCoins; coinsFlying++; flyCoinToHud({ x: sx - 3 }, sy); floatText(sx, sy - 6, '+' + LIFT.prizeCoins + ' 🟡', '#ca8a04'); }
  else floatText(sx, sy - 6, '⭐', '#ca8a04');
}

// גובה הנינג'ה בזמן השלב (מחזיר true כשהשלב שולט בגובה)
function liftPhysics(dt) {
  if (!lift) return false;
  const L = lift, p = L.phase;
  if (p === 'climb') { const k = Math.min(1, L.t / LIFT.climbT); py = LIFT.rockH * k + Math.sin(Math.PI * k) * 3; vy = 0; return true; }
  if (p === 'onRock') { py = LIFT.rockH; vy = 0; return true; }
  if (p === 'hop') {
    vy -= cfg.gravity * dt; py += vy * dt;
    if (py <= 0 && vy < 0) { py = 0; vy = 0; cleared(L.o); lift = null; }
    return true;
  }
  if (p === 'jumping') {
    vy -= cfg.gravity * dt; py += vy * dt;
    if (py <= 0 && vy < 0) {                                                    // נחת אחרי הקיר / אחרי הכוכב
      py = 0; vy = 0; burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 7, 14);
      cleared(L.o); lift = null;
    }
    return true;
  }
  return false;
}

/* ---------- פקודות ---------- */
function liftPick() {
  if (!lift) return false;
  if (lift.phase === 'atRock') { lift.phase = 'lifting'; lift.t = 0; lift.o.rock = 'carried'; vy = 0; py = 0; sfx('jump'); }
  return true;
}
function liftPut() {
  if (!lift) return false;
  if (lift.o.kind === 'rescue') { if (lift.phase === 'atTarget') flash = { text: '🐶 THROW the rope!', t: 1 }; return true; }
  if (lift.phase === 'atTarget') { lift.phase = 'placing'; lift.t = 0; }
  else if (lift.phase === 'carry') flash = { text: '👀 Not here yet!', t: 0.9 };
  return true;
}
function liftJump() {                                                           // true = ה-JUMP טופל כאן
  if (!lift) return false;
  if (lift.phase === 'onRock') { lift.phase = 'jumping'; lift.t = 0; vy = cfg.jumpV; sfx('jump'); return true; }
  return lift.phase !== 'atRock' && lift.phase !== 'atTarget';                  // עם הסלע בידיים / באמצע – לא קופצים. ליד הסלע או הקיר – קפיצה רגילה במקום
}
function liftExpected() {
  if (!lift) return null;
  if (lift.o.kind === 'rescue' && lift.phase === 'atTarget') return ['throw'];
  if (lift.phase === 'waitPull') return ['pull'];
  return lift.phase === 'atRock' ? ['pick up'] : lift.phase === 'atTarget' ? ['put down'] : lift.phase === 'onRock' ? ['jump'] : [];
}
function liftAuto() {                                                           // מצב בודק 🤖
  if (!lift || lift.idle < 0.35) return;
  const w = liftExpected()[0]; if (w) command(w, 'auto');
}

/* ---------- ציור ---------- */
function drawLiftRock(x, y, s) {                                                // סלע אפור לא עגול לגמרי. (x, y) = שמאל-למטה
  const w = LIFT.rockW * (s || 1), h = LIFT.rockH * (s || 1);
  ctx.save();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, '#a8a29e'); g.addColorStop(1, '#57534e');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x + 0.5, y);
  ctx.quadraticCurveTo(x - 0.4, y - h * 0.55, x + w * 0.22, y - h * 0.92);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 1.08, x + w * 0.8, y - h * 0.9);
  ctx.quadraticCurveTo(x + w + 0.4, y - h * 0.5, x + w - 0.4, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(x + w * 0.35, y - h * 0.72, w * 0.18, h * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();   // ברק
  ctx.strokeStyle = 'rgba(41,37,36,.35)'; ctx.lineWidth = 0.4; ctx.beginPath();                                                                               // סדקים
  ctx.moveTo(x + w * 0.6, y - h * 0.85); ctx.lineTo(x + w * 0.52, y - h * 0.5); ctx.lineTo(x + w * 0.64, y - h * 0.3);
  ctx.moveTo(x + w * 0.2, y - h * 0.3); ctx.lineTo(x + w * 0.32, y - h * 0.18); ctx.stroke();
  ctx.restore();
}
function drawLiftObstacle(o) {
  const placing = lift && lift.o === o && lift.phase === 'placing';
  if (o.kind === 'grab') { if (o.rock === 'ground') drawTreasure(o.item, o.x + 5, GROUND); }
  else if (o.kind === 'rescue') { drawRescue(o); }
  else if (o.kind === 'plank') { drawPlankScene(o, placing); }
  else {
    if (o.rock === 'ground') drawLiftRock(o.x, GROUND);
    if (o.rock === 'placed') drawLiftRock(liftPlaceX(o), GROUND);
  }
  const tx = liftWallX(o);
  if (o.kind === 'plank' || o.kind === 'rescue' || o.kind === 'grab') {}
  else if (o.kind === 'wall') {                                                     // קיר אבנים גבוה
    const h = LIFT.wallH, top = GROUND - h;
    ctx.fillStyle = '#78716c'; ctx.fillRect(tx, top, LIFT.wallW, h);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
      const bx = tx + c * 3.4 + (r % 2 ? -1.7 : 0), by = top + r * (h / 6);
      ctx.fillStyle = (r + c) % 3 === 0 ? '#a8a29e' : (r + c) % 3 === 1 ? '#8f8882' : '#9c958f';
      const bw = Math.min(tx + LIFT.wallW, bx + 3.4) - Math.max(tx, bx) - 0.6; if (bw > 0.2) ctx.fillRect(Math.max(tx, bx) + 0.3, by + 0.3, bw, h / 6 - 0.6);
    }
    ctx.fillStyle = '#57534e'; ctx.fillRect(tx - 0.5, top - 1.2, LIFT.wallW + 1, 1.6);   // כרכוב למעלה
  } else if (!o.got) {                                                         // פרס: כוכב זהב שמרחף, וסימן על הקרקע איפה להניח
    const [sx, sy] = liftStar(o), t = performance.now() / 1000, bob = Math.sin(t * 2.4) * 0.8;
    if (o.rock !== 'placed' && !placing) {
      ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(t * 4) * 0.2;
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 0.9; ctx.setLineDash([1.6, 1.2]);
      ctx.beginPath(); ctx.ellipse(liftPlaceX(o) + LIFT.rockW / 2, GROUND - 0.2, LIFT.rockW / 2 + 1, 1.3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([0.8, 2]); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(sx - LIFT.starAhead, GROUND - 2); ctx.lineTo(sx, sy + 5); ctx.stroke();   // קו דק מהסימן אל הכוכב
      ctx.restore();
    }
    const glow = ctx.createRadialGradient(sx, sy + bob, 0.5, sx, sy + bob, 9);
    glow.addColorStop(0, 'rgba(253,224,71,.55)'); glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow; circle(sx, sy + bob, 9);
    starShape(sx, sy + bob, LIFT.starR, LIFT.starR * 0.45, t * 0.8, '#facc15', '#a16207');
  }
  if (lift && lift.o === o && labelsVisible()) {
    if (o.kind === 'rescue') { const t2 = { atRock: 'PICK UP', atTarget: 'THROW', waitPull: 'PULL' }[lift.phase]; if (t2) label(t2, lift.phase === 'atRock' ? o.x + 3 : pitX(o), GROUND - 26, 4, '#fde047', '#1e293b'); return; }
    const pl = o.kind === 'plank', tag = { atRock: ['PICK UP', o.x + (pl ? PLANK.len / 2 : LIFT.rockW / 2), GROUND - 26], atTarget: ['PUT DOWN', pl ? plankGap(o).l + PLANK.gapW / 2 : liftPlaceX(o) + LIFT.rockW / 2, GROUND - 30], onRock: ['JUMP', PLAYER.x + 4, GROUND - LIFT.rockH - 24] }[lift.phase];
    if (tag) label(tag[0], tag[1], tag[2], 4, '#fde047', '#1e293b');
  }
}
function starShape(cx, cy, r1, r2, rot, fill, line) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? r2 : r1; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 0.4; ctx.stroke();
}
// הסלע בידיים – מצויר אחרי הנינג'ה (מעל הראש)
function drawLiftCarry(fx, fy) {
  if (!liftCarrying()) return;
  const L = lift, o = L.o, top = fy - 13.6;
  if (o.kind === 'plank') { drawPlankCarry(fx, fy); return; }
  if (o.kind === 'rescue') { drawCoilCarry(fx, fy); return; }
  if (o.kind === 'grab') { const k = Math.min(1, L.t / LIFT.liftT), e = k * k * (3 - 2 * k); drawTreasure(o.item, lerp(o.x + 5, fx + 1, e), lerp(GROUND, fy - 14, e), 1 - e * 0.35); return; }
  let x = fx - LIFT.rockW / 2, y = top;                                         // מעל הראש
  if (L.phase === 'lifting') { const k = Math.min(1, L.t / LIFT.liftT), e = k * k * (3 - 2 * k); x = lerp(o.x, x, e); y = lerp(GROUND, top, e); }
  if (L.phase === 'placing') { const k = Math.min(1, L.t / LIFT.putT), e = k * k * (3 - 2 * k); x = lerp(x, liftPlaceX(o), e); y = lerp(top, GROUND, e); }
  drawLiftRock(x, y);
}
function liftPose(P) {                                                          // ידיים למעלה מחזיקות את הסלע
  if (lift && lift.o.kind === 'rescue') return rescuePose(P);
  if (!liftCarrying()) return P;
  const L = lift;
  let k = 1;
  if (L.phase === 'lifting') k = Math.min(1, L.t / LIFT.liftT);
  if (L.phase === 'placing') k = 1 - Math.min(1, L.t / LIFT.putT);
  const upB = [-2.25, -2.95], upF = [2.25, 2.95], fwd = [1.5, 1.4];          // ידיים פרושות למעלה – אוחזות בצדי הסלע
  P.arms = [[lerp(fwd[0], upB[0] + Math.PI * 2, k), lerp(fwd[1], upB[1] + Math.PI * 2, k)], [lerp(fwd[0], upF[0], k), lerp(fwd[1], upF[1], k)]];
  P.lean = (P.lean || 0) * 0.4 + (1 - k) * 0.35;
  if (L.phase === 'carry') P.bob = (P.bob || 0) * 1.3;
  return P;
}

/* ---------- הקרש והבור ---------- */
function drawPlank(x0, y0, x1, y1) {                                            // קרש עץ בין שתי נקודות (הקו העליון)
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
  ctx.fillStyle = '#a16207'; ctx.fillRect(0, 0, L, PLANK.th);
  ctx.fillStyle = '#ca8a04'; ctx.fillRect(0, 0, L, 0.6);                         // צד עליון בהיר
  ctx.fillStyle = 'rgba(66,32,6,.55)'; ctx.fillRect(0, PLANK.th - 0.5, L, 0.5);
  ctx.strokeStyle = 'rgba(66,32,6,.45)'; ctx.lineWidth = 0.25;                  // סיבי עץ
  ctx.beginPath(); for (let k = 3; k < L - 2; k += 7) { ctx.moveTo(k, 1); ctx.lineTo(k + 4, 1.2); } ctx.stroke();
  ctx.fillStyle = '#422006'; for (const k of [1.5, L - 1.5]) { ctx.beginPath(); ctx.arc(k, PLANK.th / 2, 0.35, 0, Math.PI * 2); ctx.fill(); }   // מסמרים
  ctx.restore();
}
function drawPlankScene(o, placing) {
  const g = plankGap(o), D = PLANK.deep, t = performance.now() / 1000, wd = WORLDS[world];
  const Gs = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  // הבור: קירות אדמה ומים בתחתית
  const bg = ctx.createLinearGradient(0, GROUND, 0, GROUND + D);
  bg.addColorStop(0, Gs ? Gs.dirt[1] : '#5b4433'); bg.addColorStop(1, '#2a1d14');
  ctx.fillStyle = bg; ctx.fillRect(g.l, GROUND - 0.3, g.r - g.l, D + 0.3);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(g.l, GROUND, 2.2, D); ctx.fillRect(g.r - 2.2, GROUND, 2.2, D);   // צל בדפנות
  const wy = GROUND + D - 5;
  const wg = ctx.createLinearGradient(0, wy, 0, GROUND + D + 6);
  wg.addColorStop(0, '#38bdf8'); wg.addColorStop(1, '#0369a1');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.l, GROUND + D + 8);
  for (let xx = g.l; xx <= g.r; xx += 1.5) ctx.lineTo(xx, wy + Math.sin(xx * 0.5 + t * 3) * 0.5);
  ctx.lineTo(g.r, GROUND + D + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 3; k++) ctx.fillRect(g.l + 3 + ((k * 7 + t * 5) % (g.r - g.l - 6)), wy + 1.5 + k, 2.5, 0.35);
  if (Gs) { ctx.fillStyle = Gs.grass ? Gs.grass[1] : wd.top; ctx.fillRect(g.l - 1.5, GROUND - 0.6, 1.5, 1.4); ctx.fillRect(g.r, GROUND - 0.6, 1.5, 1.4); }
  // הקרש: על הדרך / מונח מעל הבור (מתנדנד כשהולכים עליו)
  if (o.rock === 'ground') drawPlank(o.x, GROUND - PLANK.th, o.x + PLANK.len, GROUND - PLANK.th);
  if (o.rock === 'placed') {
    const sp = plankSpan(o), pupOn = lift && lift.o === o && lift.phase === 'pupCross', cx = pupOn ? famPup(o).x : PLAYER.x + 4, on = lift && lift.o === o && (lift.phase === 'crossing' || pupOn) && cx > sp.l && cx < sp.r;
    const sag = on ? Math.sin(Math.PI * (cx - sp.l) / (sp.r - sp.l)) * (pupOn ? 0.5 : 1) * (1 + Math.sin(t * 9) * 0.35) : 0;
    const mid = (sp.l + sp.r) / 2;
    const yb = GROUND - 0.5;                                                      // מונח על שתי השפות – הרגליים בדיוק על הקרש
    drawPlank(sp.l, yb, mid, yb + sag); drawPlank(mid - 0.3, yb + sag, sp.r, yb);
  }
  drawFamily(o);
}
// הגור המיילל בצד שלנו, ואמא שלו בצד השני של הבור
function famPup(o) {
  const g = plankGap(o), L = lift && lift.o === o ? lift : null, home = g.r + 5.5;
  if (o.reunited || (L && L.phase === 'crossing')) return { x: home, y: GROUND, face: -1, happy: true };
  if (L && L.phase === 'pupCross') { const k = Math.min(1, L.t / FAM.cross), e = k * k * (3 - 2 * k); return { x: lerp(g.l - 5, home, e), y: GROUND - 0.6, face: 1, run: true }; }
  return { x: g.l - 5, y: GROUND, face: 1, sad: true };
}
function drawFamily(o) {
  const g = plankGap(o), t = performance.now() / 1000, P = famPup(o), mx = g.r + 19;
  drawPuppy(mx, GROUND, -1, { big: true, happy: !!o.reunited });               // אמא
  drawPuppy(P.x, P.y, P.face, P);
  const bubble = (x, y, txt, col) => { ctx.font = '900 3.4px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(txt).width + 3; ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(x - w / 2, y - 2.5, w, 5, 2); ctx.fill(); ctx.fillStyle = col; ctx.fillText(txt, x, y + 0.2); };
  if (P.sad) { bubble(P.x + 1, GROUND - 13 + Math.sin(t * 3) * 0.5, 'Mama! 😢', '#1d4ed8'); if (Math.sin(t * 2.2) > 0.2) bubble(mx - 1, GROUND - 18, 'Woof! Woof!', '#92400e'); }
  if (o.reunited) { const k = (t * 0.8) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.font = '4px system-ui'; ctx.textAlign = 'center'; ctx.fillText('❤️', (P.x + mx) / 2, GROUND - 12 - k * 8); ctx.restore(); }
}
function drawPlankCarry(fx, fy) {                                               // הקרש בידיים – לרוחב מעל הראש, ובהנחה נוחת לרוחב הבור
  const L = lift, o = L.o, top = fy - 13.6 - PLANK.th, half = PLANK.len / 2;
  let x0 = fx - half + 3, y0 = top, x1 = fx + half + 3, y1 = top;
  if (L.phase === 'lifting') { const k = Math.min(1, L.t / LIFT.liftT), e = k * k * (3 - 2 * k); x0 = lerp(o.x, x0, e); x1 = lerp(o.x + PLANK.len, x1, e); y0 = y1 = lerp(GROUND - PLANK.th, top, e); }
  if (L.phase === 'placing') {
    const k = Math.min(1, L.t / LIFT.putT), e = k * k * (3 - 2 * k), sp = plankSpan(o);
    x0 = lerp(x0, sp.l, e); x1 = lerp(x1, sp.r, e); y0 = lerp(top, GROUND - 0.5, e); y1 = lerp(top, GROUND - 0.5, Math.min(1, e * 1.25));   // הקצה הרחוק נוחת קודם
  }
  drawPlank(x0, y0, x1, y1);
}

/* ---------- הצלת הגור ---------- */
function liftThrow() {                                                          // THROW ליד הבור – החבל עף פנימה
  if (!lift || lift.o.kind !== 'rescue') return false;
  if (lift.phase === 'atTarget') { lift.phase = 'throwing'; lift.t = 0; throwT = 0.25; sfx('swish'); }
  return lift.phase !== 'atRock';                                                // ליד החבל המגולגל – זריקה רגילה (שוריקן)
}
function liftPull() {
  if (!lift || lift.o.kind !== 'rescue') return false;
  if (lift.phase === 'waitPull') { lift.phase = 'pulling'; lift.t = 0; }
  return true;
}
function liftRescueStep(L, o, dt, pb) {                                              // השלבים אחרי הזריקה. true = טופל
  if (L.phase === 'throwing' && L.t >= RESC.throwT) { L.phase = 'bite'; L.t = 0; sfx('woof'); }
  else if (L.phase === 'bite' && L.t >= RESC.biteT) { L.phase = 'waitPull'; L.t = 0; L.idle = 0; L.hinted = 0; }
  else if (L.phase === 'pulling' && L.t >= RESC.pullT) {
    L.phase = 'thanks'; L.t = 0; sfx('woof'); o.saved = true;
    const px = pitX(o), py2 = GROUND - 6; burst(px, py2, '#fde68a', 12, 30);
    if (mode === 'journey' && state === 'play') { picked += RESC.coins; coinsFlying++; flyCoinToHud({ x: px - 3 }, py2); floatText(px, py2 - 8, '+' + RESC.coins + ' 🟡', '#ca8a04'); }
    else floatText(px, py2 - 8, '❤️', '#e11d48');
  }
  else if (L.phase === 'thanks' && L.t >= RESC.thanksT) { L.phase = 'walkOut'; L.t = 0; }   // הגור נשאר מאחור ומכשכש, הנינג'ה ממשיך לבד
  else if (L.phase === 'walkOut') { if (pb.r >= pitX(o) - RESC.half - 1) { L.phase = 'hop'; L.t = 0; vy = cfg.jumpV * 0.75; py = 0.001; sfx('jump'); } }   // בשפה – קופץ מעל הבור
  else return false;
  return true;
}
// איפה הגור: בתוך הבור, עולה בזמן המשיכה, ואז קופץ החוצה ורץ קדימה
function pupPos(o) {
  const px = pitX(o), l = px - RESC.half, r = px + RESC.half, L = lift && lift.o === o ? lift : null, bot = GROUND + RESC.deep, out = l - 5;
  if (o.pup && o.pup.run) {                                                     // רץ קדימה וקופץ מעל הבור
    const x = out + o.pup.run * 45, over = x > l - 3 && x < r + 4, q = over ? (x - (l - 3)) / (r + 4 - (l - 3)) : 0;
    return { x, y: over ? GROUND - Math.sin(Math.PI * q) * 9 : GROUND - Math.abs(Math.sin(o.pup.run * 14)) * 1.6, face: 1, run: true };
  }
  if (o.saved || (L && L.phase === 'thanks')) {                                 // מטפס מעל השפה אל הצד של הנינג'ה ומכשכש
    const k = L && L.phase === 'thanks' ? Math.min(1, L.t / 0.45) : 1;
    return { x: lerp(l + 4, out, k), y: lerp(GROUND + 8.8, GROUND, k) - Math.sin(Math.PI * k) * 6, face: -1, happy: true };
  }
  if (L && L.phase === 'pulling') { const k = Math.min(1, L.t / RESC.pullT), e = k * k * (3 - 2 * k); return { x: l + 4, y: lerp(bot, GROUND + 8.8, e), vert: true, bite: true, climb: true }; }   // עולה לאורך הדופן השמאלית: ראש למעלה, הרגליים על הקיר. בסוף הפה בגובה השפה
  return { x: px + 1, y: bot, face: -1, bite: L && (L.phase === 'bite' || L.phase === 'waitPull'), sad: !L || ['atRock', 'lifting', 'carry', 'atTarget', 'throwing'].includes(L.phase) };
}
function pupMouth(P) { return P.vert ? [P.x + 1.5, P.y - 8.8] : [P.x + 5.4 * (P.face || 1), P.y - 4.2]; }
function drawPuppy(x, y, face, P) {                                             // גור קטן: (x, y) = הרגליים
  const t = performance.now() / 1000, f = face || 1;
  ctx.save(); ctx.translate(x, y);
  if (P.vert) { ctx.translate(0, -2.8); ctx.rotate(Math.PI / 2); ctx.translate(0, 2.8); ctx.scale(-1, 1); } else ctx.scale(f, 1);   // עולה בבור: הגוף אנכי, הראש למעלה, הרגליים אל הדופן השמאלית
  if (P.big) ctx.scale(1.45, 1.45);                                            // אמא – גדולה יותר וכהה יותר
  const tan = P.big ? '#b8864a' : '#d6a35c', dark = P.big ? '#6b4423' : '#8b5a2b';
  const wag = Math.sin(t * (P.happy || P.run ? 22 : 10)) * 0.5;
  ctx.strokeStyle = tan; ctx.lineWidth = 1; ctx.lineCap = 'round';               // זנב
  ctx.beginPath(); ctx.moveTo(-3.2, -3.2); ctx.quadraticCurveTo(-5, -5 + wag, -4.6 + wag, -6.4); ctx.stroke();
  const lg = P.run ? Math.sin(t * 28) * 0.9 : P.climb ? Math.sin(t * 16) * 0.8 : 0;   // רץ / מטפס על הדופן                                 // רגליים
  ctx.lineWidth = 0.9; ctx.strokeStyle = '#b07d3c';
  for (const [lx, ph] of [[-2.2, 1], [-1.2, -1], [1.4, -1], [2.4, 1]]) { ctx.beginPath(); ctx.moveTo(lx, -1.8); ctx.lineTo(lx + lg * ph, 0); ctx.stroke(); }
  ctx.fillStyle = tan; ctx.beginPath(); ctx.ellipse(0, -2.8, 3.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();   // גוף
  ctx.fillStyle = '#f5deb3'; ctx.beginPath(); ctx.ellipse(0.6, -2.2, 2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = tan; ctx.beginPath(); ctx.arc(3.6, -5, 2.3, 0, Math.PI * 2); ctx.fill();               // ראש
  ctx.fillStyle = '#f5deb3'; ctx.beginPath(); ctx.ellipse(5.3, -4.4, 1.3, 0.95, 0, 0, Math.PI * 2); ctx.fill();   // לוע
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(6.4, -4.7, 0.45, 0, Math.PI * 2); ctx.fill();      // אף
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(2.4, -5.4, 0.9, 1.7, 0.5 + wag * 0.2, 0, Math.PI * 2); ctx.fill();   // אוזן נופלת
  if (P.happy) { ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(4.3, -5.6, 0.45, Math.PI, 0); ctx.stroke(); }   // עיניים שמחות
  else { ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(4.4, -5.6, 0.38, 0, Math.PI * 2); ctx.fill(); }
  if (P.happy || P.run) { ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.ellipse(5.6, -3.4, 0.4, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }   // לשון
  ctx.restore();
}
function drawRescue(o) {
  const px = pitX(o), l = px - RESC.half, r = px + RESC.half, D = RESC.deep, L = lift && lift.o === o ? lift : null, t = performance.now() / 1000;
  const Gs = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  if (o.rock === 'ground') drawCoil(o.x + 4, GROUND - 2.6);                     // החבל המגולגל על הקרקע
  // הבור בחתך: דפנות אדמה, חושך למטה, קרקעית עם חלוקים
  const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + D);
  g.addColorStop(0, Gs ? Gs.dirt[1] : '#5b4433'); g.addColorStop(0.5, '#3a2a1d'); g.addColorStop(1, '#241811');
  ctx.fillStyle = g; ctx.fillRect(l, GROUND - 0.3, r - l, D + 1.6);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(l, GROUND, 1.8, D + 1.3); ctx.fillRect(r - 1.8, GROUND, 1.8, D + 1.3);
  ctx.strokeStyle = 'rgba(20,12,6,.5)'; ctx.lineWidth = 0.4;                    // קווי שכבות בדפנות
  for (let k = 5; k < D; k += 6) { ctx.beginPath(); ctx.moveTo(l, GROUND + k); ctx.lineTo(l + 1.6, GROUND + k + 0.6); ctx.moveTo(r, GROUND + k + 2); ctx.lineTo(r - 1.6, GROUND + k + 2.6); ctx.stroke(); }
  ctx.fillStyle = '#4a3b2e'; ctx.fillRect(l, GROUND + D, r - l, 1.6);            // קרקעית
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#6b5a49' : '#57483a'; ctx.beginPath(); ctx.ellipse(l + 2 + k * 4, GROUND + D + 0.2, 0.9, 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
  if (Gs) { ctx.fillStyle = Gs.grass ? Gs.grass[1] : WORLDS[world].top; ctx.fillRect(l - 1.5, GROUND - 0.6, 1.5, 1.4); ctx.fillRect(r, GROUND - 0.6, 1.5, 1.4); }
  // החבל: מהיד, מעל השפה, ישר למטה עד הפה של הגור
  const P = pupPos(o);
  if (L && ['throwing', 'bite', 'waitPull', 'pulling'].includes(L.phase)) {
    const hx = PLAYER.x + 7, hy = GROUND - 8, lip = [l + 0.6, GROUND - 0.2], mouth = pupMouth(P);
    ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (L.phase === 'throwing') {                                                // החבל עף פנימה ונפרש
      const k = Math.min(1, L.t / RESC.throwT), ex = lerp(hx, px - 2, k), ey = k < 0.45 ? lerp(hy, GROUND - 10, k / 0.45) : lerp(GROUND - 10, GROUND + D - 4, (k - 0.45) / 0.55);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(lerp(hx, ex, 0.5), Math.min(hy, ey) - 6 * (1 - k), ex, ey); ctx.stroke();
      drawCoil(ex, ey, 0.5 * (1 - k) + 0.2, false);
    } else {
      const sway = L.phase === 'pulling' ? Math.sin(t * 7) * 0.4 : 0;
      ctx.beginPath(); ctx.moveTo(hx, hy);
      if (mouth[1] > lip[1] + 1) { ctx.lineTo(lip[0], lip[1]); ctx.quadraticCurveTo(lip[0] + 0.8 + sway, (lip[1] + mouth[1]) / 2, mouth[0], mouth[1]); }   // מעל השפה ואז למטה בתוך הבור
      else ctx.lineTo(mouth[0], mouth[1]);                                       // הפה כבר בגובה השפה – קו ישר
      ctx.stroke();
    }
    ctx.restore();
  }
  // הגור
  if (!(P.run && P.x > W + 12)) {
    ctx.save();
    drawPuppy(P.x, P.y, P.face, P);
    ctx.restore();
  }
  // בועת "Help!" עד שזורקים חבל
  if (P.sad && !(o.pup && o.pup.run)) {
    const by = GROUND - 9 + Math.sin(t * 3) * 0.6, txt = 'Help! 🐶';
    ctx.font = '900 3.6px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 3;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(px - w / 2, by - 2.6, w, 5.2, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 1, by + 2.4); ctx.lineTo(px + 1, by + 2.4); ctx.lineTo(px, by + 4.2); ctx.fill();
    ctx.fillStyle = '#b91c1c'; ctx.fillText(txt, px, by + 0.2);
  }
  if (L && L.phase === 'thanks') {                                              // תודה!
    const k = Math.min(1, L.t / 0.3), by = GROUND - 30;
    ctx.save(); ctx.globalAlpha = k; ctx.font = '900 3.8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = 'Woof! Thank you! ❤️', w = ctx.measureText(txt).width + 3;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(px + 2 - w / 2, by - 2.7, w, 5.4, 2); ctx.fill();
    ctx.fillStyle = '#be185d'; ctx.fillText(txt, px + 2, by + 0.2); ctx.restore();
  }
}

function drawCoil(x, y, s, tail) {                                              // חבל מגולגל: לולאות עבות עם פיתולים, וקצה שבורח החוצה. (x, y) = מרכז
  const k = s || 1;
  ctx.save(); ctx.lineCap = 'round';
  const loop = (cx, cy, rx, ry) => {
    ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1.25 * k; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.75 * k; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(66,32,6,.7)'; ctx.lineWidth = 0.22 * k;               // פיתולי החבל
    for (let a = 0; a < Math.PI * 2; a += 0.55) { const ex = cx + Math.cos(a) * rx, ey = cy + Math.sin(a) * ry; ctx.beginPath(); ctx.moveTo(ex - 0.3 * k, ey - 0.35 * k); ctx.lineTo(ex + 0.3 * k, ey + 0.35 * k); ctx.stroke(); }
  };
  for (let i = 0; i < 4; i++) loop(x, y + (1.2 - i * 0.8) * k, (3.6 - i * 0.15) * k, 1.25 * k);   // ערימה של לולאות
  if (tail !== false) {                                                         // הקצה של החבל – שוכב על הקרקע
    ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1.25 * k; ctx.beginPath(); ctx.moveTo(x + 3.4 * k, y + 1.4 * k); ctx.quadraticCurveTo(x + 6 * k, y + 2.4 * k, x + 8.5 * k, y + 2 * k); ctx.stroke();
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.75 * k; ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(x + 8.6 * k, y + 2 * k, 0.55 * k, 0, Math.PI * 2); ctx.fill();   // קצה מרופט
  }
  ctx.restore();
}
function drawCoilCarry(fx, fy) {                                                // החבל המגולגל על הכתף
  const L = lift, o = L.o; let x = fx + 3.6, y = fy - 5.5;   // ליד המותן
  if (L.phase === 'lifting') { const k = Math.min(1, L.t / LIFT.liftT), e = k * k * (3 - 2 * k); x = lerp(o.x + 4, x, e); y = lerp(GROUND - 2.6, y, e); }
  drawCoil(x, y, 0.75, false);
}
function rescuePose(P) {
  const L = lift; if (!L) return P;
  if (['lifting', 'carry', 'atTarget'].includes(L.phase)) { P.arms = [P.arms[0], [0.5, 1.3]]; }       // מחזיק את החבל המגולגל ליד המותן
  if (L.phase === 'bite' || L.phase === 'waitPull') { P.arms = [[0.9, 1.1], [1.0, 1.2]]; P.lean = 0.25; }   // אוחז בחבל, ידיים קדימה-למטה
  if (L.phase === 'pulling') { P = posePull(performance.now() / 1000); P.lean = -0.25; }                      // מושך אחורה
  return P;
}

// אוצר על הקרקע: תיבה / שק מטבעות / מגילה. (x, y) = מרכז-למטה
function drawTreasure(item, x, y, sc) {
  const s = sc || 1, t = performance.now() / 1000;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const glow = ctx.createRadialGradient(0, -3, 0.5, 0, -3, 7); glow.addColorStop(0, 'rgba(253,224,71,' + (0.35 + 0.15 * Math.sin(t * 4)) + ')'); glow.addColorStop(1, 'rgba(253,224,71,0)');
  ctx.fillStyle = glow; circle(0, -3, 7);
  if (item === 'chest') {
    ctx.fillStyle = '#92400e'; roundRect(-4, -5.5, 8, 5.5, 0.6); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(-4, -5.5); ctx.quadraticCurveTo(0, -9, 4, -5.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.fillRect(-4, -5.8, 8, 0.7); ctx.fillRect(-0.6, -6.5, 1.2, 3); ctx.fillRect(-4, -0.7, 8, 0.7);
  } else if (item === 'bag') {
    ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(0, -2.8, 3.6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#854d0e'; ctx.beginPath(); ctx.moveTo(-1.6, -5.4); ctx.lineTo(1.6, -5.4); ctx.lineTo(2.2, -7); ctx.lineTo(-2.2, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.font = '900 3px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, -2.6);
  } else {
    ctx.fillStyle = '#fef3c7'; roundRect(-4, -3.6, 8, 3, 1.2); ctx.fill();
    ctx.fillStyle = '#d97706'; circle(-4, -2.1, 1.5); circle(4, -2.1, 1.5);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(-0.5, -3.7, 1, 3.2);
  }
  ctx.restore();
}
