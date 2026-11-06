/* ninja-voice-game – jetstage.js
   שלב תרמיל הסילון (JET PACK): הנינג'ה מגיע לשפת תהום רחבה, ולידה מונח תרמיל סילון.
   PICK UP – מרים אותו · PUT ON – לובש אותו על הגב · FLY – ממריא מעל התהום.
   בזמן הטיסה: UP / DOWN – עולים ויורדים בין שלושה גבהים, אוספים מטבעות ואבני חן ומתחמקים מציפורים.
   מעל הצד השני: DOWN – נוחתים, מורידים את התרמיל (הוא נשאר שם) וממשיכים.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const JS = { stop: 4, pack: 9, edge: 26, gap: 180, after: 40, lanes: [9, 19, 29], start: 1, flyV: 10, birdV: 6,
             pickT: 0.8, putT: 1.1, takeT: 1.0, landT: 1.0, dropT: 0.9, hitR: 4.2, getR: 4.2, coins: 3 };
// מה יש בדרך מעל התהום: מרחק מתחילת התהום, נתיב (0 נמוך, 1 אמצע, 2 גבוה), סוג
const JS_ITEMS = [
  { dx: 22,  lane: 1, k: 'coin' }, { dx: 42, lane: 2, k: 'gem' },
  { dx: 66,  lane: 2, k: 'bird' }, { dx: 68, lane: 0, k: 'coin' },
  { dx: 92,  lane: 0, k: 'gem' },
  { dx: 118, lane: 0, k: 'bird' }, { dx: 120, lane: 1, k: 'bird' }, { dx: 123, lane: 2, k: 'gem' },
  { dx: 148, lane: 1, k: 'coin' }, { dx: 160, lane: 2, k: 'bird' }
];
let jetS = null;   // { o, p: שלב, t, lane, alt, items, got, hit }

function jsSetup(o) { o.w = JS.edge + JS.gap + JS.after; }
function jsEdge(o) { return o.x + JS.edge; }                                       // שפת התהום
function jsFar(o) { return o.x + JS.edge + JS.gap; }                               // הצד השני
function jsHole(o) { return { x: jsEdge(o), w: JS.gap }; }                         // החור באדמה (draw.js)
function jsBusy() { return !!jetS; }
function jsWorn() { return !!jetS && ['wear', 'take', 'fly', 'hover', 'land'].includes(jetS.p); }
function jsFlying() { return !!jetS && ['take', 'fly', 'hover', 'land'].includes(jetS.p); }

function jsSpeed() {
  if (!jetS) return null;
  const p = jetS.p;
  if (p === 'take') return JS.flyV * Math.min(1, jetS.t / JS.takeT);
  if (p === 'fly') return JS.flyV;
  if (p === 'drop') return 0;
  return 0;
}

function jsUpdate(dt, pb) {
  if (!jetS) {
    const o = obstacles.find(o => o.type === 'jetgap' && !o.passed && pb.r >= o.x + JS.stop - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - (o.x + JS.stop); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    jetS = { o, p: 'find', t: 0, lane: JS.start, alt: 0, items: JS_ITEMS.map(it => Object.assign({ x: it.dx, done: false }, it)), got: 0, hit: 0 };
    return;
  }
  const S = jetS, o = S.o; S.t += dt;
  if (!obstacles.includes(o)) { jetS = null; return; }
  const go = p => { S.p = p; S.t = 0; }, demo = state !== 'play';
  if (demo) {                                                                    // הדגמה
    if (S.p === 'find' && S.t > 0.8) command('pick up', 'demo');
    else if (S.p === 'hold' && S.t > 0.6) command('put on', 'demo');
    else if (S.p === 'wear' && S.t > 0.6) command('fly', 'demo');
    else if (S.p === 'fly' || S.p === 'hover') jsAuto('demo');
  }
  switch (S.p) {
    case 'pick': if (S.t >= JS.pickT) go('hold'); break;                         // מרים את התרמיל
    case 'put': if (S.t >= JS.putT) go('wear'); break;                           // לובש אותו על הגב
    case 'take':                                                                 // ממריא
      S.alt = JS.lanes[S.lane] * Math.min(1, S.t / JS.takeT);
      if (S.t >= JS.takeT) go('fly');
      break;
    case 'fly': case 'hover': {
      S.alt += (JS.lanes[S.lane] - S.alt) * Math.min(1, dt * 6);
      const far = jsFar(o), nx = PLAYER.x + PLAYER.w / 2;
      for (const it of S.items) {                                               // אוספים / נפגעים
        if (it.done) continue;
        if (it.k === 'bird') it.x -= JS.birdV * dt;
        const ix = jsEdge(o) + it.x, iy = JS.lanes[it.lane];
        if (Math.abs(ix - nx) < (it.k === 'bird' ? JS.hitR : JS.getR) && Math.abs(iy - S.alt) < 5) {
          it.done = true;
          if (it.k === 'bird') {                                                // ציפור – מכה, נוצות, ממשיכים לעוף
            S.hit++; sfx('hit'); shakeT = 0.2; burst(ix, GROUND - iy - 4, '#e2e8f0', 8, 12);
            flash = { text: '🐦 UP / DOWN – fly around the birds!', t: 1.4 };
            if (state === 'play') { hits++; if (typeof voiceMark === 'function') voiceMark('hit'); renderHud(); }
          } else {                                                               // מטבע / אבן חן
            S.got++; sfx('coin'); burst(ix, GROUND - iy - 3, it.k === 'gem' ? '#67e8f9' : '#fde047', 7, 10);
            if (mode === 'journey' && state === 'play') { picked++; coinsFlying++; flyCoinToHud({ x: ix }, GROUND - iy - 3); }
          }
        }
      }
      if (S.p === 'fly' && nx > far + 6) go('hover');                            // מעל הצד השני – מחכים ל-DOWN
      if (S.p === 'hover' && state === 'play' && S.t > 2.5 && !S.hinted) { S.hinted = 1; sayWords(['down'], 1.6); }
      break;
    }
    case 'land':                                                                 // יורד לקרקע בצד השני
      S.alt = Math.max(0, S.alt - dt * Math.max(14, JS.lanes[2] / JS.landT));
      if (S.alt <= 0) { S.alt = 0; go('drop'); sfx('thud'); burst(PLAYER.x + 4, GROUND - 1, WORLDS[world].dust, 8, 12); }
      break;
    case 'drop':                                                                 // מוריד את התרמיל – הוא נשאר על הקרקע
      if (S.t >= JS.dropT) {
        o.packX = PLAYER.x - 6 - o.x;                                            // איפה התרמיל נשאר (יחסית למכשול)
        cleared(o); jetS = null;
        if (mode === 'journey' && state === 'play') { picked += JS.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + JS.coins + ' 🟡', '#ca8a04'); }
      }
      break;
  }
  if (S.p === 'find' && state === 'play' && S.t > 4 && !S.h1) { S.h1 = 1; sayWords(['pick up'], 1.6); }
  if (S.p === 'hold' && state === 'play' && S.t > 4 && !S.h2) { S.h2 = 1; sayWords(['put on'], 1.6); }
  if (S.p === 'wear' && state === 'play' && S.t > 4 && !S.h3) { S.h3 = 1; sayWords(['fly'], 1.6); }
}
function jsPhysics() {
  if (!jetS) return false;
  py = jetS.alt; vy = 0; duckT = 0; flyT = 0;
  if (jsFlying() && Math.random() < 0.8) particles.push({ x: PLAYER.x + 0.5 + (Math.random() - 0.5), y: GROUND - py - 2, vx: -6 + Math.random() * 4, vy: 22 + Math.random() * 10, g: 0, life: 0.3, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', size: 1 + Math.random() * 0.6 });
  return true;
}

/* ---------- פקודות ---------- */
// מחזיר true כשהמילה שייכת לשלב הסילון (ואז שאר הפקודות לא מופעלות)
function jsCmd(word) {
  const S = jetS; if (!S) return false;
  if (word === 'pick up') { if (S.p === 'find') { S.p = 'pick'; S.t = 0; sfx('swish'); } return true; }
  if (word === 'put on') { if (S.p === 'hold') { S.p = 'put'; S.t = 0; sfx('swish'); } return true; }
  if (word === 'fly') { if (S.p === 'wear') { S.p = 'take'; S.t = 0; sfx('jump'); } return true; }
  if (word === 'up') { if (S.p === 'fly' || S.p === 'hover') S.lane = Math.min(2, S.lane + 1); return true; }
  if (word === 'down') {
    if (S.p === 'hover') { S.p = 'land'; S.t = 0; }                             // מעל הצד השני – נוחתים
    else if (S.p === 'fly') S.lane = Math.max(0, S.lane - 1);
    return true;
  }
  return ['jump', 'kick', 'throw', 'catch', 'run', 'stop'].includes(word) ? true : false;   // בזמן השלב – שאר המילים לא עושות כלום
}
function jsExpected() {
  const S = jetS; if (!S) return null;
  return { find: ['pick up'], hold: ['put on'], wear: ['fly'], fly: ['up', 'down'], hover: ['down'] }[S.p] || [];
}
// טייס אוטומטי (בודק / הדגמה): מתחמק מציפורים ופונה אל המטבעות
function jsAuto(src) {
  const S = jetS; if (!S) return;
  src = src || 'auto';
  if (S.p === 'find' && S.t > 0.5) return command('pick up', src);
  if (S.p === 'hold' && S.t > 0.5) return command('put on', src);
  if (S.p === 'wear' && S.t > 0.5) return command('fly', src);
  if (S.p === 'hover' && S.t > 0.4) return command('down', src);
  if (S.p !== 'fly') return;
  if ((S.autoCd = (S.autoCd || 0) - 1 / 60) > 0) return;
  const nx = PLAYER.x + PLAYER.w / 2, X = it => jsEdge(S.o) + it.x;
  const bad = l => S.items.some(it => !it.done && it.k === 'bird' && it.lane === l && X(it) > nx - 5 && X(it) < nx + 34);
  const clear = (a, b) => { for (let l = Math.min(a, b); l <= Math.max(a, b); l++) if (bad(l)) return false; return true; };
  let want = S.lane;
  const good = S.items.find(it => !it.done && it.k !== 'bird' && X(it) > nx - 2 && X(it) < nx + 26 && clear(S.lane, it.lane));
  if (bad(S.lane)) want = [0, 1, 2].filter(l => !bad(l)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane))[0] ?? S.lane;
  else if (good) want = good.lane;
  if (want > S.lane) { command('up', src); S.autoCd = 0.35; }
  else if (want < S.lane) { command('down', src); S.autoCd = 0.35; }
}

/* ---------- תנוחות ---------- */
function jsPose(P) {
  const S = jetS; if (!S) return P;
  const now = performance.now() / 1000;
  if (S.p === 'pick') { const k = Math.sin(Math.PI * Math.min(1, S.t / JS.pickT)); P = poseIdle(now); P.lean = 0.5 * k; P.hipY = -4.6 + 1.4 * k; P.arms = [[0.9, 1.3], [1.0, 1.4]]; return P; }   // מתכופף ומרים
  if (S.p === 'hold') { P = poseIdle(now); P.arms = [[0.9, 2.0], [1.0, 2.1]]; return P; }   // מחזיק מול החזה
  if (S.p === 'put') { const k = Math.min(1, S.t / JS.putT); P = poseIdle(now); P.arms = [[0.9 + 1.4 * k, 2.0 + 0.8 * k], [1.0 + 1.3 * k, 2.1 + 0.7 * k]]; P.lean = -0.08 * Math.sin(Math.PI * k); return P; }   // מעביר אל הגב
  if (S.p === 'wear') { P = poseIdle(now); P.arms = [[0.15, 0.6], [0.2, 0.7]]; P.eyes = 'wide'; return P; }   // אוחז ברצועות
  if (S.p === 'drop') { P = poseIdle(now); P.lean = -0.06; return P; }
  if (jsFlying()) {                                                              // עף קדימה, רגליים מאחור
    const A = poseAir(false); A.lean = S.p === 'land' ? 0.15 : 0.55; A.legs = S.p === 'land' ? [[0.2, 0.1], [0.35, 0.2]] : [[-0.55, -0.9], [-0.25, -0.6]];
    A.arms = [[-1.2, -0.9], [1.3, 1.9]]; A.eyes = 'squint';
    return A;
  }
  return P;
}

/* ---------- ציור ---------- */
// התהום: קירות סלע, עומק בערפל ונהר למטה (נקרא מ-draw.js עם המכשולים הרחבים)
function drawJetGap(o, bottom) {
  const x = jsEdge(o), w = JS.gap, t = performance.now() / 1000, WY = GROUND + 34;
  const g = ctx.createLinearGradient(0, GROUND - 2, 0, WY);
  g.addColorStop(0, '#c9e6d3'); g.addColorStop(0.6, '#a8cbbb'); g.addColorStop(1, '#8fb4a8');
  ctx.fillStyle = g; ctx.fillRect(x, GROUND - 2, w, WY - GROUND + 2);
  ctx.strokeStyle = 'rgba(70,100,90,.18)'; ctx.lineWidth = 0.8;
  for (let yy = GROUND + 4; yy < WY - 1; yy += 5) { ctx.beginPath(); for (let xx = x; xx <= x + w; xx += 3) ctx.lineTo(xx, yy + Math.sin(xx * 0.18 + yy) * 0.8); ctx.stroke(); }
  const wg = ctx.createLinearGradient(0, WY, 0, bottom); wg.addColorStop(0, '#38bdf8'); wg.addColorStop(1, '#075985');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(x, bottom);
  for (let xx = x; xx <= x + w; xx += 2) ctx.lineTo(xx, WY + Math.sin(xx * 0.35 + t * 2.5) * 0.6);
  ctx.lineTo(x + w, bottom); ctx.closePath(); ctx.fill();
  for (const [ex, dir] of [[x, 1], [x + w, -1]]) {                              // קירות הצוק
    ctx.fillStyle = '#8b6b4a'; ctx.beginPath(); ctx.moveTo(ex, GROUND);
    for (let yy = GROUND; yy <= bottom; yy += 3) ctx.lineTo(ex + dir * (1.5 + Math.sin(yy * 0.7 + ex) * 1.2 + (yy - GROUND) * 0.06), yy);
    ctx.lineTo(ex, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,25,.35)'; ctx.lineWidth = 0.5;
    for (let yy = GROUND + 3; yy < bottom; yy += 4) { ctx.beginPath(); ctx.moveTo(ex, yy); ctx.lineTo(ex + dir * 2.2, yy + 1); ctx.stroke(); }
  }
}
function jsPack(x, y, rot, flame) {                                            // תרמיל סילון: שני מכלים, רצועות, נחירים
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.lineCap = 'round';
  for (const dx of [-1.1, 1.1]) {
    ctx.fillStyle = '#94a3b8'; roundRect(dx - 0.95, -3.4, 1.9, 6.2, 0.9); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(dx - 0.6, -3, 0.5, 5.2);
    ctx.fillStyle = '#dc2626'; circle(dx, -3.3, 0.85);
    ctx.fillStyle = '#334155'; ctx.fillRect(dx - 0.6, 2.7, 1.2, 0.8);
    if (flame) {
      const f = 2.4 + Math.sin(performance.now() / 40 + dx) * 0.8;
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(dx - 0.6, 3.4); ctx.lineTo(dx + 0.6, 3.4); ctx.lineTo(dx, 3.4 + f + 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(dx - 0.35, 3.4); ctx.lineTo(dx + 0.35, 3.4); ctx.lineTo(dx, 3.4 + f * 0.6 + 0.6); ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-1.6, -1.2); ctx.lineTo(1.6, -1.2); ctx.moveTo(-1.6, 1.0); ctx.lineTo(1.6, 1.0); ctx.stroke();
  ctx.restore();
}
function jsBird(x, y, t) {                                                     // ציפור שעפה שמאלה
  ctx.save(); ctx.translate(x, y); ctx.scale(1.7, 1.7); ctx.translate(-x, -y);
  const w = Math.sin(t * 14) * 1.6;
  ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(x, y, 2.2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 2, y - 0.6, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(x - 2.8, y - 0.7); ctx.lineTo(x - 3.9, y - 0.4); ctx.lineTo(x - 2.8, y - 0.2); ctx.fill();
  ctx.fillStyle = '#fff'; circle(x - 2.2, y - 0.9, 0.3);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 0.5, y - 0.4); ctx.quadraticCurveTo(x + 0.8, y - 2.5 - w, x + 2.2, y - 0.8 - w * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 3.4, y - 0.6); ctx.stroke();
  ctx.restore();
}
// התרמיל על הקרקע / בידיים, והדברים שבאוויר (נקרא לפני הנינג'ה)
function drawJetStage(o) {
  const S = jetS && jetS.o === o ? jetS : null, t = performance.now() / 1000;
  if (!S && o.packX === undefined) jsPack(o.x + JS.pack, GROUND - 2.4, Math.PI / 2 - 0.15, false);        // מונח על הקרקע ליד התהום
  if (!S && o.packX !== undefined) jsPack(o.x + o.packX, GROUND - 2.4, Math.PI / 2 + 0.1, false);          // נשאר בצד השני
  if (S && S.p === 'find') jsPack(o.x + JS.pack, GROUND - 2.4, Math.PI / 2 - 0.15, false);
  if (S && (S.p === 'drop')) { const k = Math.min(1, S.t / JS.dropT); jsPack(PLAYER.x - 1 - k * 5, GROUND - 9 + k * 6.6, (Math.PI / 2 + 0.1) * k, false); }
  if (S) {
    for (const it of S.items) {
      if (it.done) continue;
      const ix = jsEdge(o) + it.x, iy = GROUND - JS.lanes[it.lane] - 4;
      if (ix < viewL() - 6 || ix > viewR() + 6) continue;
      if (it.k === 'bird') jsBird(ix, iy, t + it.dx);
      else if (it.k === 'gem') {
        ctx.save(); ctx.translate(ix, iy); ctx.scale(1.5, 1.5); ctx.translate(-ix, -iy);
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(ix, iy - 2.2); ctx.lineTo(ix + 1.8, iy - 0.6); ctx.lineTo(ix, iy + 2); ctx.lineTo(ix - 1.8, iy - 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(ix - 0.6, iy - 1.2); ctx.lineTo(ix + 0.2, iy - 1.6); ctx.lineTo(ix - 0.2, iy - 0.2); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else { ctx.fillStyle = '#facc15'; circle(ix, iy, 2.2 + Math.sin(t * 5 + it.dx) * 0.12); ctx.fillStyle = '#fde68a'; circle(ix - 0.6, iy - 0.6, 0.8); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(ix, iy, 2.2, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
}
// התרמיל ביד / על הגב (נקרא אחרי ציור הנינג'ה)
function drawJetHeld() {
  const S = jetS; if (!S) return;
  if (S.p === 'pick') { const k = Math.min(1, S.t / JS.pickT); jsPack(lerp(S.o.x + JS.pack, playerHand[0] + 0.6, k), lerp(GROUND - 2.4, playerHand[1], k), (Math.PI / 2 - 0.15) * (1 - k), false); }
  if (S.p === 'hold') jsPack(playerHand[0] + 0.6, playerHand[1], 0, false);
  if (S.p === 'put') { const k = Math.min(1, S.t / JS.putT), e = k * k * (3 - 2 * k); jsPack(lerp(playerHand[0] + 0.6, PLAYER.x + 1.2, e), lerp(playerHand[1], GROUND - py - 9.5, e) - Math.sin(Math.PI * e) * 4, 0, false); }
}
