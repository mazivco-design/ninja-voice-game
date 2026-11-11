/* ninja-voice-game – cart.js
   PUSH TOGETHER (עגלה): ילד מהכפר מנסה לדחוף עגלה מלאה דלעות ותפוחים במעלה גבעה.
   העגלה זזה קצת קדימה ומתגלגלת בחזרה – שוב ושוב. הנינג'ה מגיע, הילד מבקש "Can you help me push?".
   דוחפים ביחד עם ספירה: הילד אומר "One… two… THREE!" – והילד שמשחק אומר PUSH בשלוש.
   · PUSH מוקדם – "Wait for three!", העגלה מחליקה קצת אחורה וסופרים שוב.
   · בלי PUSH אחרי השלוש – "Again!", העגלה מחליקה קצת אחורה וסופרים שוב.
   ארבע דחיפות טובות – פסגה. הילד קופץ לעגלה וקורא "Jump in!" – JUMP, ושניהם דוהרים במורד.
   בתחתית הנינג'ה קופץ החוצה וממשיך, והילד מנופף "Thank you!".
   ההר עצמו מגביה את הנינג'ה דרך terrainLift (rope.js).
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const HILL = { up: 46, top: 26, down: 46, h: 19 };
const CART = { watch: 26, tryT: 1.9, watchT: 1.2, walkT: 1.1, len: 18, cp0: 4, pushes: 3, step: 15, pushT: 0.75, askT: 1.8, stepT: 0.5, stepDX: 7, beat: 0.9, win: 2.4, backT: 1.0,
               boardT: 0.6, boardDX: 9, outT: 0.8, outDX: 24, coins: 5,
               rollT: 3.2, rollV: 64, kidOutT: 0.8, fiveT: 1.2, thanksT: 1.7, byeT: 1.4 };   // roll: אחרי הגבעה ממשיכה ומאטה בהדרגה
let cart = null;   // { o, phase: 'ask' | 'step' | 'count' | 'push' | 'early' | 'late' | 'kidIn' | 'jumpWait' | 'board' | 'ride' | 'out', t, idle, n, late, beats }

function cartSetup(o) { o.cp = CART.cp0; o.w = HILL.up + HILL.top + HILL.down + 30 + CART.rollV * CART.rollT / 3 + 30; }   // כולל הנסיעה הארוכה אחרי הגבעה
const cartEase = q => q * q * (3 - 2 * q);
function hillLiftAt(o, x) {                                                       // גובה הגבעה מעל GROUND בנקודה x
  const r = x - o.x;
  if (r <= 0) return 0;
  if (r < HILL.up) return HILL.h * cartEase(r / HILL.up);
  if (r < HILL.up + HILL.top) return HILL.h;
  if (r < HILL.up + HILL.top + HILL.down) return HILL.h * (1 - cartEase((r - HILL.up - HILL.top) / HILL.down));
  return 0;
}
function cartHillLift(x) { let L = 0; for (const o of obstacles) if (o.type === 'cart') L = Math.max(L, hillLiftAt(o, x)); return L; }
function hillYo(o, x) { return GROUND - hillLiftAt(o, x); }
function hillAo(o, x) { return Math.atan2(hillYo(o, x + 1) - hillYo(o, x - 1), 2); }
// כמה העגלה זזה קדימה בזמן שהילד מנסה לבד – קצת קדימה, ואז מתגלגלת בחזרה
function attempt(t) {                                                             // ניסיון לבד: דוחף – העגלה עולה קצת – ומתגלגלת בחזרה
  const u = (t % CART.tryT) / CART.tryT;
  return u < 0.55 ? { off: 7 * cartEase(u / 0.55), back: false } : { off: 7 * (1 - cartEase((u - 0.55) / 0.45)), back: true };
}
function soloT(o) { return cart && cart.o === o ? cart.t : performance.now() / 1000; }
function soloing(o) { return (!cart || cart.o !== o || cart.phase === 'watch') && !o.passed && !o.waving; }
function soloOff(o) { return soloing(o) ? attempt(soloT(o)).off : 0; }
function cartRear(o) { return o.x + o.cp + soloOff(o); }
function cartBusy() { return !!cart; }
function cartRiding() { return !!cart && (cart.phase === 'ride' || cart.phase === 'roll'); }
function rollK() { return cart && cart.phase === 'roll' ? Math.min(1, cart.t / CART.rollT) : 0; }
const KID_OUT = ['kidOut', 'five', 'thanks', 'byeK'];                                // הילד ירד מהעגלה ועומד מול הנינג'ה

// מהירות העולם בזמן השלב
function cartSpeed() {
  if (!cart) return null;
  const C = cart, p = C.phase, o = C.o;
  if (p === 'step') return (CART.stepDX + CART.watch) / CART.walkT;
  if (p === 'push') return CART.step / CART.pushT;
  if (p === 'early' || p === 'late') return C.back ? -C.back / CART.backT : 0;     // מחליקה אחורה – העולם זז ימינה
  if (p === 'board') return CART.boardDX / CART.boardT;
  if (p === 'ride') { const m = o.cp + CART.len / 2, d = Math.max(0, Math.min(1, (m - HILL.up - HILL.top) / HILL.down)); return 14 + 50 * d; }
  if (p === 'roll') { const k = rollK(); return CART.rollV * (1 - k) * (1 - k); }   // מאטה בהדרגה עד שעוצרת
  if (p === 'out') return CART.outDX / CART.outT;
  return 0;
}

function cartUpdate(dt, pb) {
  if (!cart) {
    const o = obstacles.find(o => o.type === 'cart' && !o.passed && !o.waving && pb.r >= o.x + o.cp - CART.stepDX - CART.watch - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - (o.x + o.cp - CART.stepDX - CART.watch); if (over > 0) ropeShiftBy(over);   // נעצר קצת לפני – ורואה את הילד מנסה לבד
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    cart = { o, phase: 'watch', t: 0, idle: 0, n: 0, late: 0, beats: 0 };
    return;
  }
  const C = cart, o = C.o, v = cartSpeed(); C.t += dt;
  if (!obstacles.includes(o)) { cart = null; return; }
  const demo = state !== 'play';
  const go = ph => { C.phase = ph; C.t = 0; C.idle = 0; };
  if (['push', 'ride', 'roll', 'early', 'late'].includes(C.phase)) o.cp += v * dt;        // העגלה זזה יחד עם הנינג'ה
  switch (C.phase) {
    case 'watch': if (C.t >= CART.watchT - 0.02) { go('ask'); speak('kid: can you help me push?'); } break;   // שני ניסיונות לבד, ואז מבקש עזרה
    case 'ask': if (C.t >= CART.askT) go('yesWait'); break;                         // הילד שאל – מחכים ל-YES
    case 'yesWait':
      C.idle += dt;
      if (demo) { if (C.idle >= 0.9) { if (banner) banner.text = 'Say YES!'; command('yes', 'demo'); speak('yes'); } }
      else if (C.idle >= 3.5 + (C.hinted || 0) * 6) { C.hinted = (C.hinted || 0) + 1; sayWords(['yes'], 1.6, C); }
      break;
    case 'nod': if (C.t >= 0.95) go('step'); break;                                // הנינג'ה מהנהן "כן" ורק אז רץ
    case 'step': if (C.t >= CART.walkT) { go('count'); C.beats = 0; } break;
    case 'count':                                                                 // One… two… THREE! – ואז חלון ל-PUSH
      if (C.beats === 0) { C.beats = 1; speak('kid: one'); }
      if (C.beats === 1 && C.t >= CART.beat) { C.beats = 2; speak('kid: two'); }
      if (C.beats === 2 && C.t >= CART.beat * 2) { C.beats = 3; speak('kid: three'); }
      if (demo && C.t >= CART.beat * 2 + 0.35) command('push', 'demo');
      if (C.phase === 'count' && C.t >= CART.beat * 2 + CART.win) {               // לא אמר PUSH בזמן
        go('late'); C.late++; C.back = Math.min(CART.step * 0.5, o.cp - CART.cp0); speak('kid: again');
        if (C.late >= 2) flash = { text: '🪨 Say PUSH on THREE!', t: 1.8 };
      }
      break;
    case 'push':
      if (Math.random() < 0.5) particles.push({ x: PLAYER.x + 2 + Math.random() * 3, y: GROUND - cartHillLift(PLAYER.x + 4), vx: -8 - Math.random() * 6, vy: -3 - Math.random() * 3, g: 8, life: 0.3, color: WORLDS[world].dust, size: 0.8 });
      if (C.t >= CART.pushT) { C.n++; sfx('thud'); if (C.n >= CART.pushes) { go('kidIn'); } else { go('count'); C.beats = 0; } }
      break;
    case 'early': case 'late': if (C.t >= CART.backT + 0.4) { C.back = 0; go('count'); C.beats = 0; } break;
    case 'kidIn': if (C.t >= 0.7) { go('jumpWait'); speak('kid: jump in!'); } break;
    case 'jumpWait':
      C.idle += dt;
      if (demo) { if (C.idle >= 0.9) { if (banner) banner.text = 'Say JUMP IN!'; command('jump', 'demo'); } }
      else if (C.idle >= 3.5 + (C.hinted || 0) * 6) { C.hinted = (C.hinted || 0) + 1; sayWords(['jump in'], 1.6, C); }
      break;
    case 'board': if (C.t >= CART.boardT) { go('ride'); sfx('jump'); } break;
    case 'ride':
      if (Math.random() < 0.4) particles.push({ x: o.x + o.cp + 2, y: hillYo(o, o.x + o.cp + 2), vx: -12, vy: -4, g: 8, life: 0.3, color: WORLDS[world].dust, size: 0.9 });
      if (o.cp >= HILL.up + HILL.top + HILL.down + 2) { go('roll'); }
      break;
    case 'roll':                                                                  // ממשיכה על הקרקע הישרה ומאטה
      if (Math.random() < 0.3 * (1 - rollK())) particles.push({ x: o.x + o.cp + 2, y: GROUND, vx: -10, vy: -3, g: 8, life: 0.3, color: WORLDS[world].dust, size: 0.8 });
      if (C.t >= CART.rollT) go('out');
      break;
    case 'out':
      if (C.t >= CART.outT) {
        py = 0; vy = 0; burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 7, 14); sfx('clear'); go('kidOut');
        C.seat = cartRear(o) + CART.len / 2 + 4.5; C.kx = PLAYER.x + 4 - 9;                 // הילד קופץ מהמושב אל מול הנינג'ה
        if (mode === 'journey' && state === 'play') { picked += CART.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + CART.coins + ' 🟡', '#ca8a04'); }
      }
      break;
    case 'kidOut': if (C.t >= CART.kidOutT) { go('five'); } break;                  // פרידה: הילד יורד מהעגלה
    case 'five':                                                                    // היי פייב
      if (C.t >= 0.5 && !C.fived) { C.fived = 1; sfx('pop'); const hx = (C.kx + PLAYER.x + 4) / 2; burst(hx, GROUND - 15, '#fde047', 12, 22); burst(hx, GROUND - 15, '#ffffff', 5, 14); }
      if (C.t >= CART.fiveT) { go('thanks'); speak('kid: thank you!'); }
      break;
    case 'thanks': if (C.t >= CART.thanksT) go('byeK'); break;                     // הילד אומר תודה, הנינג'ה קד
    case 'byeK': if (C.t >= CART.byeT) { o.kidRel = C.kx - o.x; cleared(o); o.waving = true; cart = null; } break;   // מנופפים – והנינג'ה ממשיך
  }
}
function cartPhysics(dt) {
  if (!cart) return false;
  const C = cart, p = C.phase;
  const arc = (T, h) => { const k = Math.min(1, C.t / T); py = Math.sin(Math.PI * k) * h; vy = 0; return true; };
  if (p === 'board') return arc(CART.boardT, 7);
  if (p === 'out') return arc(CART.outT, 8);
  if (p === 'ride' || p === 'roll') { py = 0; vy = 0; return true; }
  if (KID_OUT.includes(p)) { py = 0; vy = 0; return true; }
  return false;
}

/* ---------- פקודות ---------- */
function cartPush() {
  if (!cart) return false;
  const C = cart;
  if (C.phase === 'count') {
    if (C.t >= CART.beat * 2 - 0.15) { C.phase = 'push'; C.t = 0; C.late = 0; }   // בשלוש (או ממש לפניו) – דוחפים
    else { C.phase = 'early'; C.t = 0; C.back = Math.min(CART.step * 0.4, C.o.cp - CART.cp0); speak('kid: wait for three!'); }   // מוקדם מדי
  }
  return true;
}
function cartYes() {                                                              // YES – עונים לילד שביקש עזרה
  if (!cart || cart.phase !== 'yesWait') return false;
  cart.phase = 'nod'; cart.t = 0; cart.idle = 0;
  return true;
}
function cartJump() {
  if (!cart) return false;
  if (cart.phase === 'jumpWait') { cart.phase = 'board'; cart.t = 0; sfx('jump'); }
  return true;
}
function cartExpected() {
  if (!cart) return null;
  return cart.phase === 'count' ? ['push'] : cart.phase === 'yesWait' ? ['yes'] : cart.phase === 'jumpWait' ? ['jump'] : [];
}
function cartAuto() {
  if (!cart) return;
  if (cart.phase === 'count' && cart.t >= CART.beat * 2 + 0.35) command('push', 'auto');
  if (cart.phase === 'jumpWait' && cart.idle > 0.4) command('jump', 'auto');
  if (cart.phase === 'yesWait' && cart.idle > 0.4) command('yes', 'auto');
}

/* ---------- תנוחות ---------- */
function cartPose(P) {
  if (!cart) return P;
  const C = cart, p = C.phase, now = performance.now() / 1000;
  if (p === 'push') return posePush();
  if (p === 'step') return poseRun(now * 18);
  if (p === 'watch') return poseIdle(now);
  if (p === 'nod') { P = poseIdle(now); P.headTilt = 0.32 * (1 - Math.cos(2 * Math.PI * C.t / 0.45)) / 2; return P; }   // כן עם הראש, פעמיים
  if (p === 'kidOut') return poseIdle(now);
  if (p === 'five') { P = poseIdle(now); const k = Math.min(1, C.t / 0.4); P.arms[1] = [lerp(0.3, 2.45, k), lerp(0.4, 2.6, k)]; P.lean = 0.08; return P; }   // יד למעלה – היי פייב
  if (p === 'thanks') { P = poseIdle(now); const b = Math.sin(Math.PI * Math.min(1, Math.max(0, (C.t - 0.35) / 1.0))); P.lean = 0.75 * b; P.headTilt = 0.3 * b; P.arms = [[0.1, 0.15], [0.1, 0.15]]; return P; }   // קידה
  if (p === 'byeK') { P = poseIdle(now); P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; return P; }   // מנופף
  if (p === 'count' || p === 'kidIn' || p === 'jumpWait') { P = poseIdle(now); P.arms = [[1.2, 1.5], [1.3, 1.6]]; P.lean = 0.2; if (p === 'count' && C.beats === 3) { P = posePush(); P.lean = 0.45; } return P; }   // ידיים על העגלה, מוכן
  if (p === 'early' || p === 'late') { P = poseIdle(now); P.lean = -0.25; P.arms = [[1.0, 1.3], [1.1, 1.4]]; return P; }   // העגלה דוחפת אותו אחורה
  if (p === 'board' || p === 'out') return poseAir(C.t < (p === 'board' ? CART.boardT : CART.outT) / 2);
  return P;
}

/* ---------- ציור ---------- */
function drawCartHill(o) {
  const G = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null, wd = WORLDS[world];
  const x0 = o.x, x1 = o.x + HILL.up + HILL.top + HILL.down;
  ctx.beginPath(); ctx.moveTo(x0, GROUND);
  for (let x = x0; x <= x1; x += 1) ctx.lineTo(x, hillYo(o, x));
  for (let x = x1; x >= x0; x -= 1) ctx.lineTo(x, GROUND + 3.6 * Math.min(1, hillLiftAt(o, x) / 1.5));   // מכסה גם את פס הדשא של הקרקע מתחת לגבעה
  ctx.closePath();
  ctx.fillStyle = G ? G.dirt[0] : wd.ground; ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = G ? G.grass[1] : wd.top; ctx.lineWidth = 2.2; ctx.beginPath(); for (let x = x0; x <= x1; x += 1) ctx.lineTo(x, hillYo(o, x) + 0.9); ctx.stroke();
  ctx.strokeStyle = G ? G.grass[0] : wd.top; ctx.lineWidth = 1; ctx.beginPath(); for (let x = x0; x <= x1; x += 1) ctx.lineTo(x, hillYo(o, x) + 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 7; k++) { const x = x0 + 12 + k * 17; ctx.beginPath(); ctx.ellipse(x, hillYo(o, x) + 5 + (k % 3) * 2, 1.4, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawPumpkin(x, y, r) {
  ctx.fillStyle = '#ea580c'; for (const dx of [-0.55, 0.55]) { ctx.beginPath(); ctx.ellipse(x + dx * r, y, r * 0.62, r * 0.88, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(124,45,18,.45)'; ctx.lineWidth = 0.3; for (const dx of [-0.45, 0.45]) { ctx.beginPath(); ctx.ellipse(x + dx * r, y, r * 0.18, r * 0.82, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.25, r * 0.15, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(x, y - r * 0.85); ctx.quadraticCurveTo(x + 0.3, y - r * 1.2, x + 0.8, y - r * 1.3); ctx.stroke();
}
// העגלה: x = הקצה האחורי. נוטה לפי השיפוע. riders – מי שיושב בפנים (לפני הדופן הקדמית)
function drawCartBody(o, x, opt) {
  const p = opt || {}, L = CART.len, cx = x + L / 2, a = hillAo(o, cx), y = hillYo(o, cx), t = performance.now() / 1000;
  ctx.save(); ctx.translate(cx, y); ctx.rotate(a);
  const bounce = p.bounce ? Math.abs(Math.sin(t * 14)) * 1.2 * (p.bounce === true ? 1 : p.bounce) : 0;
  const load = [[-5, -10, 2.5, 'p'], [0.3, -10.6, 2.7, 'p'], [5.2, -10, 2.4, 'p'], [-2.5, -12.9, 1.15, 'a'], [2.8, -13.3, 1.15, 'a'], [-6.9, -11.9, 1.05, 'a'], [7, -12.2, 1.05, 'o']];
  for (const [dx, dy, r, k] of load) {
    const yy = dy - bounce * (k === 'p' ? 0.6 : 1.4);
    if (k === 'p') drawPumpkin(dx, yy, r);
    else { ctx.fillStyle = k === 'a' ? '#dc2626' : '#f59e0b'; ctx.beginPath(); ctx.arc(dx, yy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#365314'; ctx.fillRect(dx - 0.1, yy - r - 0.6, 0.25, 0.7); }
  }
  if (p.riders) p.riders();
  ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.moveTo(-L / 2, -8.5); ctx.lineTo(L / 2, -8.5); ctx.lineTo(L / 2 - 1, -3); ctx.lineTo(-L / 2 + 1, -3); ctx.closePath(); ctx.fill();   // ארגז העץ
  ctx.fillStyle = '#ca8a04'; ctx.fillRect(-L / 2, -9.1, L, 0.9);
  ctx.strokeStyle = 'rgba(66,32,6,.5)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-L / 2 + 0.4, -5.8); ctx.lineTo(L / 2 - 0.4, -5.8); ctx.stroke();
  ctx.fillStyle = '#78350f'; for (const dx of [-L / 2 + 1.5, 0, L / 2 - 1.5]) ctx.fillRect(dx - 0.35, -8.6, 0.7, 5.5);
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L / 2, -7.5); ctx.lineTo(-L / 2 - 3, -9.5); ctx.stroke();   // ידית
  for (const dx of [-5.5, 5.5]) {                                                 // גלגלים (מסתובבים כשהעגלה זזה)
    const rot = (x - o.x) * 0.38;
    ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.arc(dx, -2.6, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8a29e'; ctx.beginPath(); ctx.arc(dx, -2.6, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 0.4; for (let k = 0; k < 4; k++) { const aa = rot + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(dx + Math.cos(aa) * 1.8, -2.6 + Math.sin(aa) * 1.8); ctx.lineTo(dx - Math.cos(aa) * 1.8, -2.6 - Math.sin(aa) * 1.8); ctx.stroke(); }
    ctx.fillStyle = '#44403c'; ctx.beginPath(); ctx.arc(dx, -2.6, 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// ילד מהכפר: חולצה כחולה, מכנסיים קצרים חומים, שיער שחור עם קוקו, פנים גלויות
function drawKid(fx, fy, facing, sc, P, mood) {
  const S = RIG.shape, J = figureJoints(P), skin = '#f1c7a1', shirt = '#2563eb', pants = '#78350f', hair = '#1f1a17';
  ctx.save(); ctx.translate(fx, fy + (P.bob || 0) * sc); ctx.scale(facing * sc, sc); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const limb = (o, a, l1, l2, w, c1, c2) => {
    const k = endOf(o[0], o[1], a[0], l1), e = endOf(k[0], k[1], a[1], l2);
    ctx.strokeStyle = c1; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(k[0], k[1]); ctx.stroke();
    ctx.strokeStyle = c2; ctx.lineWidth = w * 0.9; ctx.beginPath(); ctx.moveTo(k[0], k[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
  };
  limb(J.hipB, P.legs[0], S.thigh, S.shin, 1.9, pants, skin);
  limb(J.shB, P.arms[0], S.upper, S.fore, 1.5, shirt, skin);
  ctx.strokeStyle = shirt; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(J.hip[0], J.hip[1] - 0.4); ctx.lineTo(J.waist[0], J.waist[1]); ctx.lineTo(J.neck[0], J.neck[1]); ctx.stroke();
  ctx.strokeStyle = pants; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(J.hip[0], J.hip[1] + 0.3); ctx.lineTo(J.hip[0] + J.up[0] * 0.8, J.hip[1] + J.up[1] * 0.8); ctx.stroke();
  limb(J.hipF, P.legs[1], S.thigh, S.shin, 1.9, pants, skin);
  const h = J.head, ha = J.lean2 + (P.headTilt || 0);
  ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate(ha);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0.3, 0, 2.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0.1, -0.5, 3.0, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-2.2, -0.2, 1.1, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-0.6, -3.6, 1.1, 0, Math.PI * 2); ctx.fill();                     // קוקו
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(1.4, 0.1, 0.38, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(2.7, 0.1, 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244,114,182,.45)'; ctx.beginPath(); ctx.arc(1.1, 1.2, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 0.35; ctx.beginPath();
  if (mood === 'sad') { ctx.moveTo(1.4, 1.9); ctx.quadraticCurveTo(2.1, 1.4, 2.8, 1.9); ctx.stroke(); }
  else if (mood === 'wow') { ctx.fillStyle = '#7c2d12'; ctx.ellipse(2.1, 1.7, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.moveTo(1.3, 1.4); ctx.quadraticCurveTo(2.1, 2.2, 2.9, 1.4); ctx.stroke(); }
  ctx.restore();
  limb(J.shF, P.arms[1], S.upper, S.fore, 1.5, shirt, skin);
  ctx.restore();
  if (mood === 'sad') { ctx.fillStyle = '#7dd3fc'; for (const [dx, dy] of [[-2.5, -15.5], [3.2, -14]]) { ctx.beginPath(); ctx.moveTo(fx + dx, fy + dy - 1); ctx.quadraticCurveTo(fx + dx + 0.7, fy + dy, fx + dx, fy + dy + 0.6); ctx.quadraticCurveTo(fx + dx - 0.7, fy + dy, fx + dx, fy + dy - 1); ctx.fill(); } }   // טיפות זיעה
}
function kidSit(P) { P.legs = [[1.45, -0.15], [1.55, -0.05]]; P.hipY = -2.2; P.bob = 0; return P; }

// הגבעה, העגלה, הילד (ו – כשרוכבים – גם הנינג'ה בתוך העגלה)
function drawCartBack(o) {
  drawCartHill(o);
  const C = cart && cart.o === o ? cart : null, p = C ? C.phase : (o.waving ? 'gone' : 'alone'), now = performance.now() / 1000, rear = cartRear(o);
  const kidY = x => hillYo(o, x), wave = P => { P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; return P; };
  const inCart = ['kidIn', 'jumpWait', 'board', 'ride', 'roll', 'out'].includes(p);
  if (!inCart) {
    drawCartBody(o, rear);
    if (KID_OUT.includes(p) || p === 'gone') {                                    // הילד עומד מחוץ לעגלה, מול הנינג'ה
      let kx = p === 'gone' ? o.x + o.kidRel : C.kx, ky = GROUND, P = poseIdle(now), face = 1;
      if (p === 'kidOut') { const k = Math.min(1, C.t / CART.kidOutT), seat = C.seat; kx = lerp(seat, C.kx, k); ky = lerp(GROUND - 9.6 + 4.2, GROUND, k) - Math.sin(Math.PI * k) * 5; P = poseAir(k < 0.5); }
      else if (p === 'five') { const k = Math.min(1, C.t / 0.4); P.arms[1] = [lerp(0.3, 2.45, k), lerp(0.4, 2.6, k)]; P.lean = 0.08; }
      else if (p === 'thanks') { const b = Math.sin(Math.PI * Math.min(1, C.t / 0.9)); P.lean = 0.35 * b; P.headTilt = 0.2 * b; }
      else P = wave(P);
      drawKid(kx, ky, face, 0.8, P, 'smile');
    }
    if (p === 'alone' || p === 'watch') {                                        // דוחף לבד: נשען קדימה, ונהדף אחורה כשהעגלה חוזרת
      const P = posePush(); P.lean += attempt(soloT(o)).back ? -0.4 : 0.1;
      drawKid(rear - 3.6, kidY(rear - 3.6), 1, 0.8, P, 'sad');
    }
    return;
  }
  const cheer = p === 'ride' || (p === 'roll' && rollK() < 0.6);
  const kidP = cheer ? Object.assign(kidSit(poseIdle(now)), { arms: [[-2.6, -3.0], [2.6, 3.0]] }) : p === 'out' ? wave(kidSit(poseIdle(now))) : p === 'kidIn' && C.t < 0.45 ? poseAir(C.t < 0.22) : (p === 'jumpWait' ? wave(kidSit(poseIdle(now))) : kidSit(poseIdle(now)));
  drawCartBody(o, rear, { bounce: p === 'ride' ? true : p === 'roll' ? (1 - rollK()) * 0.8 : false, riders: () => {
    if (p === 'ride' || p === 'roll') { const Pn = kidSit(poseIdle(now)); Pn.arms = [[-2.5, -2.9], [2.5, 2.9]]; Pn.lean = -0.2; drawFigure({ fx: -3.5, fy: -9.6, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: Pn, suit: playerSuit() }); }
    drawKid(4.5, -9.6 - (p === 'kidIn' && C.t < 0.45 ? Math.sin(Math.PI * C.t / 0.45) * 6 : 0), 1, 0.8, kidP, cheer ? 'wow' : 'smile');
  } });
  if (p === 'ride' || (p === 'roll' && rollK() < 0.55)) {                       // קווי מהירות
    const cx = rear + CART.len / 2, y = hillYo(o, cx);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(rear - 3 - k * 2, y - 5 - k * 3.2); ctx.lineTo(rear - 12 - k * 2, y - 5 - k * 3.2 + (cartSpeed() > 20 ? -3 : 0)); ctx.stroke(); }
  }
}
// הילד שדוחף ליד הנינג'ה – לפני הנינג'ה (קרוב יותר אלינו), ובועות הדיבור
function drawCartFront(o) {
  const C = cart && cart.o === o ? cart : null, now = performance.now() / 1000, rear = cartRear(o);
  if (C && ['ask', 'nod', 'step', 'count', 'push', 'early', 'late'].includes(C.phase)) {
    let x = rear - 1.8, P;
    if (C.phase === 'ask') { const k = cartEase(Math.min(1, Math.max(0, (C.t - 0.9) / 0.6))); x = lerp(rear - 3.6, rear - 1.8, k); P = poseIdle(now); if (C.t < 1.2) P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; drawKid(x, hillYo(o, x) + 1.3 * k, C.t < 0.9 ? -1 : 1, 0.8, P, 'smile'); }
    else { P = C.phase === 'push' ? posePush() : C.phase === 'count' && C.beats === 3 ? posePush() : poseIdle(now); if (C.phase === 'count' && C.beats < 3) { P.arms = [[1.2, 1.5], [1.3, 1.6]]; P.lean = 0.2; } drawKid(x, hillYo(o, x) + 1.3, 1, 0.8, P, C.phase === 'early' || C.phase === 'late' ? 'sad' : 'smile'); }
  }
  // בועות
  const kx = C && ['ask', 'nod', 'step', 'count', 'push', 'early', 'late'].includes(C.phase) ? rear - 1.8 : rear + CART.len / 2 + 4.5, ky = hillYo(o, Math.min(kx, rear + CART.len)) - 22;
  const say = (txt, opt) => drawBubble(txt, kx, ky, Object.assign({ tail: -1, color: '#1d4ed8' }, opt));
  if (!C || C.phase === 'watch') {
    if (C) { drawBubble(attempt(C.t).back ? 'Oh no!' : 'Ugh! Too heavy!', rear - 3.6, hillYo(o, rear) - 21, { tail: -1, size: 3.4 }); return; }
    if (o.waving) { const fx = o.x + (o.kidRel || 0); if (fx < viewR() + 4 && fx > viewL() - 6) drawBubble('Bye! 👋', fx, GROUND - 19, { tail: -1, size: 3.4, color: '#be185d' }); }
    else if (rear < viewR() - 4) drawBubble('Ugh! Too heavy!', rear - 3.6, hillYo(o, rear) - 21, { tail: -1, size: 3.4 });
    return;
  }
  const p = C.phase;
  if (p === 'ask') say('Can you help me push?', { age: C.t, size: 3.8 });
  if (p === 'count') {
    const txt = C.beats <= 1 ? 'One…' : C.beats === 2 ? 'One… two…' : 'One… two… THREE!';
    say(txt, { age: C.beats === 3 ? C.t - CART.beat * 2 : undefined, size: C.beats === 3 ? 4.4 : 4, color: C.beats === 3 ? '#b91c1c' : '#1d4ed8' });
    if (labelsVisible() && C.beats === 3) label('PUSH', PLAYER.x + 4, hillYo(o, PLAYER.x + 4) - 24, 4, '#fde047', '#1e293b');
  }
  if (p === 'push') say(C.n === CART.pushes - 1 ? 'Yes! The top!' : 'Hup!', { age: C.t, size: 3.6, color: '#111827' });
  if (p === 'early') say('Wait for three!', { age: C.t, size: 3.6, color: '#b91c1c' });
  if (p === 'late') say('Again!', { age: C.t, size: 3.8, color: '#b91c1c' });
  if (p === 'jumpWait' || (p === 'kidIn' && C.t > 0.5)) { say('Jump in!', { age: p === 'jumpWait' ? C.t + 0.3 : 0 }); if (labelsVisible() && p === 'jumpWait') label('JUMP IN', PLAYER.x + 4, hillYo(o, PLAYER.x + 4) - 24, 4, '#fde047', '#1e293b'); }
  if (p === 'five' && C.t > 0.35) drawBubble('High five! ✋', (C.kx + PLAYER.x + 4) / 2, GROUND - 22, { age: C.t - 0.35, size: 3.4, color: '#b45309' });
  if (p === 'thanks') drawBubble('Thank you!', C.kx - 1, GROUND - 19, { age: C.t, tail: -1, size: 3.6, color: '#be185d' });
  if (p === 'byeK') { drawBubble('Bye! 👋', C.kx - 1, GROUND - 19, { age: C.t, tail: -1, size: 3.4, color: '#be185d' }); if (C.t > 0.3) drawBubble('Bye!', PLAYER.x + 5, GROUND - 22, { age: C.t - 0.3, tail: 1, size: 3.4, color: '#1d4ed8' }); }
  if (p === 'ride' || (p === 'roll' && C.t < 1.2)) say('Wheee!', { age: p === 'ride' ? C.t : undefined, color: '#be185d', size: 4.2 });
}

// הרישום של הסצנה – הבסיס מכיר אותה רק דרך הטבלה (scenes.js). הציור עדיין מחובר ב-draw.js
sceneAdd({
  type: 'cart', word: 'push on three', label: true,
  listen: ['jump in', 'push', 'jump', 'yes'],                                        // PUSH בספירה, ואז JUMP / JUMP IN
  active: () => !!cart,
  reset: () => { cart = null; },
  setup: cartSetup, afterGap: 0.8, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + o.cp - CART.stepDX - CART.watch,                               // מול הילד עם העגלה
  update: cartUpdate, physics: cartPhysics, speed: cartSpeed, pose: cartPose,
  expected: cartExpected, auto: cartAuto,
  act: word => word === 'jump' ? cartJump() : word === 'yes' ? cartYes() : word === 'push' ? cartPush() : false,
  intro: { banner: 'PUSH on THREE, then JUMP in!', time: 31,
           demo: () => { const o = { type: 'cart' }; cartSetup(o); o.x = PLAYER.x + PLAYER.w + CART.stepDX + CART.watch - CART.cp0; obstacles.push(o); } }   // מתחיל מול הילד (cartUpdate מפעיל את ההדגמה)
});
