/* ninja-voice-game – dragonfeed.js
   להאכיל דרקון קטן (שלב בפיתוח, 2026-11-24) – תרגול הבנה: לבחור את המילה הנכונה לפי מה שרואים.
   דרקון תינוק ירוק יושב בקן על סלע, ורואים אותו כבר מרחוק. על שולחן ליד הנינג'ה: תפוח, דג ועוגה.
   הדרקון מראה בבועה מה הוא רוצה (ציור, בלי מילה). הילד אומר APPLE / FISH / CAKE – הנינג'ה זורק את המאכל.
   נכון – הדרקון בולע, לבבות, והוא גדל קצת. לא נכון – "Bleh!", הוא מתעטש אש קטנה והנינג'ה מפויח לרגע (בלי לבבות).
   שלוש ארוחות – הדרקון מעופף בשמחה ומשאיר אבן חן.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const DF = { e0: 13, table: 19, dragon: 44, w: 70, meals: ['fish', 'cake', 'apple'], hint: 3.5, hintEvery: 5, coins: 4 };
const DF_CHIP = { apple: 'APPLE', fish: 'FISH', cake: 'CAKE' };
let dfS = null;
const dfE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const dfL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function dfNX() { return PLAYER.x + 4; }
function dfSetup(o) { o.w = DF.w; }
function dfStart(o) { dfS = { o, p: 'want', t: 0, i: 0, idle: 0, hinted: 0, toss: null, grow: 0, hearts: [], soot: 0, chipOk: 0, chipW: null, nx: DF.e0, fly: 0, gem: null, flames: [] }; }
function dfP(p) { const S = dfS; S.p = p; S.t = 0; }
function dfWant() { return DF.meals[dfS.i]; }

/* ---------- העדכון ---------- */
function dfUpdate(dt, pb) {
  if (!dfS) {
    const o = obstacles.find(o => o.type === 'dragonfeed' && !o.passed && dfNX() >= o.x + DF.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    dfStart(o); return;
  }
  const S = dfS, o = S.o; S.t += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.soot > 0) S.soot -= dt;
  if (!obstacles.includes(o)) { dfS = null; return; }
  const demo = state !== 'play';
  if (S.p === 'want') {
    if (demo && S.t > 1.0) { command(dfWant(), 'demo'); speak(dfWant()); }
    if (!demo && state === 'play') { S.idle += dt; if (S.idle > DF.hint + S.hinted * DF.hintEvery) { S.hinted++; speak(dfWant()); } }
  } else if (S.p === 'toss') {                                                    // המאכל עף בקשת אל הפה
    const k = Math.min(1, S.t / 0.6), T = S.toss;
    T.x = dfL(DF.table + 2, DF.dragon - 4, k); T.h = dfL(9, 9 + S.grow * 1.5, k) + Math.sin(k * Math.PI) * 9; T.rot += dt * 8;
    if (k >= 1) {
      if (T.kind === dfWant()) { dfP('eat'); sfx('pop'); for (let n = 0; n < 5; n++) S.hearts.push({ x: DF.dragon + (Math.random() - 0.5) * 6, h: 16 + S.grow * 2, t: -n * 0.08 }); floatText(o.x + DF.dragon, GROUND - 26 - S.grow * 2, 'Yum!', '#16a34a'); }
      else { dfP('bleh'); sfx('thud'); floatText(o.x + DF.dragon, GROUND - 26 - S.grow * 2, 'Bleh!', '#dc2626'); }
      S.toss.done = 1;
    }
  } else if (S.p === 'eat') {
    if (S.t >= 0.4 && !S.grown) { S.grown = 1; S.grow++; }
    if (S.t >= 1.6) { S.grown = 0; S.i++; S.idle = 0; S.hinted = 0; S.toss = null; if (S.i >= DF.meals.length) { dfP('happy'); sfx('win'); } else dfP('want'); }
  } else if (S.p === 'bleh') {                                                    // מתעטש אש קטנה – הנינג'ה מפויח
    if (S.t >= 0.5 && !S.sneezed) { S.sneezed = 1; sfx('swish'); for (let n = 0; n < 14; n++) S.flames.push({ x: DF.dragon - 5, h: 10 + S.grow * 1.5, vx: -28 - Math.random() * 10, vh: (Math.random() - 0.5) * 6, t: 0 }); }
    if (S.t >= 0.95 && !S.sooted) { S.sooted = 1; S.soot = 1.4; floatText(o.x + S.nx, GROUND - 22, 'Achoo!', '#f97316'); }
    if (S.t >= 2.0) { S.sneezed = 0; S.sooted = 0; S.toss = null; S.idle = 0; dfP('want'); }
  } else if (S.p === 'happy') {                                                   // מעופף בשמחה ומשאיר אבן חן
    S.fly = dfE(S.t / 0.8);
    if (S.t >= 1.2 && !S.gem) { S.gem = { x: DF.dragon - 6, h: 22, vh: 0 }; sfx('coin'); }
    if (S.t >= 3.0) dfP('exit');
  } else if (S.p === 'exit') {
    S.nx += 15 * dt;
    if (S.gem && !S.gem.got && S.gem.h <= 1.5 && Math.abs(S.gem.x - S.nx) < 3) { S.gem.got = 1; sfx('coin'); floatText(o.x + S.gem.x, GROUND - 10, '💎', '#0ea5e9'); }
    const over = o.x + S.nx - dfNX(); if (over > 0) ropeShiftBy(over);
    if (o.x + DF.dragon < -20 || S.t > 8) {
      cleared(o); dfS = null;
      if (mode === 'journey' && state === 'play') { picked += DF.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + DF.coins + ' 🟡', '#ca8a04'); }
      return;
    }
  }
  if (S.gem && !S.gem.got) { S.gem.vh -= 40 * dt; S.gem.h = Math.max(1.5, S.gem.h + S.gem.vh * dt); }
  for (const h of S.hearts) h.t += dt; S.hearts = S.hearts.filter(h => h.t < 1.4);
  for (const f of S.flames) { f.t += dt; f.x += f.vx * dt; f.h += f.vh * dt; } S.flames = S.flames.filter(f => f.t < 0.6);
}
function dfPhysics() { if (!dfS) return false; vy = 0; py = 0; return true; }
function dfSpeed() { return dfS ? 0 : null; }

/* ---------- פקודות ---------- */
function dfCmd(word) {
  if (!dfS || !DF_CHIP[word]) return false;
  const S = dfS; if (S.p !== 'want') return true;
  S.toss = { kind: word, x: DF.table + 2, h: 9, rot: 0 }; dfP('toss'); sfx('swish');
  S.chipOk = 1.1; S.chipW = word; S.chipGood = word === dfWant();
  return true;
}
function dfExpected() { const S = dfS; if (!S) return null; return S.p === 'want' ? [dfWant()] : []; }
function dfAuto() { const S = dfS; if (!S) return; if (S.p === 'want' && S.t > 0.8) command(dfWant(), 'auto'); }
function dfTap() { return dfS && dfS.p === 'want' ? dfWant() : null; }

/* ---------- ציור ---------- */
function dfFood(kind, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  if (kind === 'apple') {
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(-0.5, 0, 1.3, 0, Math.PI * 2); ctx.arc(0.5, 0, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-0.8, -0.5, 0.3, 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(0, -1.1); ctx.lineTo(0.2, -1.9); ctx.stroke();
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(0.7, -1.7, 0.6, 0.25, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'fish') {
    ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.8, 0); ctx.lineTo(3.1, -1.1); ctx.lineTo(3.1, 1.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.ellipse(-0.3, 0.35, 1.4, 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(-1.4, -0.25, 0.25, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(-1.8, 1.2); ctx.lineTo(1.8, 1.2); ctx.lineTo(1.8, -0.4); ctx.lineTo(-1.8, -1.4); ctx.closePath(); ctx.fill();   // פרוסת עוגה
    ctx.fillStyle = '#f9a8d4'; ctx.fillRect(-1.8, 0.1, 3.6, 0.4);
    ctx.fillStyle = '#fbcfe8'; ctx.beginPath(); ctx.moveTo(-1.9, -1.5); ctx.lineTo(1.9, -0.5); ctx.lineTo(1.9, -0.1); ctx.lineTo(-1.9, -1.0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-0.6, -1.6, 0.55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function dfDragon(x, S) {                                                        // דרקון תינוק: גוף שמנמן ירוק, בטן בהירה, כנפיים קטנות, עיניים גדולות
  const g = GROUND, now = performance.now() / 1000, grow = S ? S.grow : 0, s = 1 + grow * 0.12;
  const fly = S ? S.fly : 0, hy = fly * (14 + Math.sin(now * 5) * 2), hx = fly * Math.sin(now * 2) * 6;
  const p = S ? S.p : 'want', mouth = p === 'toss' && S.t > 0.3 ? 1 : p === 'eat' && S.t < 0.4 ? 1 - S.t / 0.4 : p === 'bleh' && S.t > 0.45 && S.t < 0.9 ? 0.8 : 0;
  // הקן והסלע
  ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.ellipse(x, g - 2.5, 9, 3.2, 0, Math.PI, 0); ctx.lineTo(x + 9, g); ctx.lineTo(x - 9, g); ctx.fill();
  ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(x, g - 5.2, 6.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 0.3; for (let k = -5; k <= 5; k += 1.5) { ctx.beginPath(); ctx.moveTo(x + k, g - 6.2); ctx.lineTo(x + k + 1.4, g - 4.3); ctx.stroke(); }
  ctx.save(); ctx.translate(x + hx, g - 6 - hy); ctx.scale(-s, s);                  // פונה שמאלה אל הנינג'ה
  const flap = Math.sin(now * (fly ? 18 : 3)) * (fly ? 0.6 : 0.15);
  ctx.fillStyle = '#15803d'; for (const sgn of [1, -0.6]) { ctx.save(); ctx.translate(-0.5, -6.5); ctx.rotate(-0.4 * sgn + flap * sgn); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -4, -6, -1); ctx.quadraticCurveTo(-4, -1.5, -3.5, 0.5); ctx.quadraticCurveTo(-2, -0.5, 0, 1); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, -4, 4, 4.4, 0, 0, Math.PI * 2); ctx.fill();          // גוף
  ctx.beginPath(); ctx.moveTo(-3.5, -2); ctx.quadraticCurveTo(-8, -1, -7, -4.5); ctx.quadraticCurveTo(-6.5, -2.5, -3, -3.5); ctx.fill();   // זנב
  ctx.fillStyle = '#bbf7d0'; ctx.beginPath(); ctx.ellipse(1.2, -3.3, 2.2, 3.0, 0.15, 0, Math.PI * 2); ctx.fill();   // בטן
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(2.3, -9.2, 3.4, 3.0, 0, 0, Math.PI * 2); ctx.fill();    // ראש
  ctx.beginPath(); ctx.ellipse(4.8, -8.4 + mouth * 0.4, 2.2, 1.5 + mouth * 0.3, 0.1, 0, Math.PI * 2); ctx.fill(); // חרטום
  if (mouth > 0) { ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.ellipse(5.6, -7.6, 1.2, 0.9 * mouth, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fef08a'; for (const hx2 of [0.6, 2.6]) { ctx.beginPath(); ctx.moveTo(hx2, -11.6); ctx.lineTo(hx2 - 0.6, -13.8); ctx.lineTo(hx2 + 0.6, -11.8); ctx.fill(); }   // קרניים
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(3.0, -9.9, 1.2, 1.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(3.4, -9.8, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3.6, -10.1, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.arc(6.1, -8.9, 0.22, 0, Math.PI * 2); ctx.fill();             // נחיר
  if (p === 'happy' || p === 'eat') { ctx.fillStyle = 'rgba(244,114,182,.6)'; ctx.beginPath(); ctx.arc(3.8, -8.0, 0.6, 0, Math.PI * 2); ctx.fill(); }   // סומק
  ctx.restore();
  return [x + hx - 5 * s, g - 6 - hy - 8.5 * s];                                   // הפה
}
function drawDragonFeed(o) {
  const S = dfS && dfS.o === o ? dfS : null, g = GROUND, tx = o.x + DF.table;
  // השולחן עם שלושת המאכלים
  ctx.fillStyle = '#92400e'; ctx.fillRect(tx - 6, g - 7, 12, 1.2); ctx.fillRect(tx - 5, g - 6, 0.9, 6); ctx.fillRect(tx + 4.1, g - 6, 0.9, 6);
  ['apple', 'fish', 'cake'].forEach((k, i) => dfFood(k, tx - 3.6 + i * 3.6, g - 8.8, 0.75, 0));
  dfDragon(o.x + DF.dragon, S);
  if (S && S.gem && !S.gem.got) { const x = o.x + S.gem.x, y = g - S.gem.h; ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(x, y - 1.6); ctx.lineTo(x + 1.3, y - 0.4); ctx.lineTo(x, y + 1.3); ctx.lineTo(x - 1.3, y - 0.4); ctx.closePath(); ctx.fill(); }
}
function drawDragonFeedFront(o) {
  const S = dfS && dfS.o === o ? dfS : null; if (!S) return;
  const g = GROUND, now = performance.now() / 1000;
  if (S.toss && !S.toss.done) dfFood(S.toss.kind, o.x + S.toss.x, g - S.toss.h, 0.9, S.toss.rot);
  if (S.p === 'want' || S.p === 'toss') {                                         // בועת מחשבה עם ציור המאכל
    const bx = o.x + DF.dragon + 2, by = g - 27 - S.grow * 1.5 + Math.sin(now * 2) * 0.4;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(bx, by, 5.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx - 2.6, by + 5.4, 1.1, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(bx - 3.6, by + 7.6, 0.6, 0, Math.PI * 2); ctx.fill();
    dfFood(dfWant(), bx, by, 1.25, 0);
  }
  for (const h of S.hearts) if (h.t > 0) { ctx.globalAlpha = 1 - h.t / 1.4; ctx.fillStyle = '#ec4899'; ctx.font = '3px system-ui'; ctx.textAlign = 'center'; ctx.fillText('♥', o.x + h.x, g - h.h - h.t * 8); }
  ctx.globalAlpha = 1;
  for (const f of S.flames) { const k = f.t / 0.6; ctx.fillStyle = 'rgba(' + (251) + ',' + Math.round(146 - k * 100) + ',60,' + (1 - k) + ')'; ctx.beginPath(); ctx.arc(o.x + f.x, g - f.h, 1.2 + k * 1.2, 0, Math.PI * 2); ctx.fill(); }
  if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (dfExpected() || [])[0];
  if (!w || (!ok && S.t < 3.5 + 0 && S.p === 'want' && !S.hinted)) return;          // בהתחלה בלי צ'יפ – הילד צריך להבין מהציור; אחרי רמז – מופיע
  const txt = DF_CHIP[w], y = 24, sz = 6, good = ok ? S.chipGood : true;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? (good ? '✓ ' : '✗ ') : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55;
  ctx.translate(W / 2, y);
  ctx.fillStyle = ok ? (good ? '#16a34a' : '#dc2626') : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? (good ? '✓ ' : '✗ ') : '') + txt, 0, sz * 0.05);
  ctx.restore();
}
function dfNinjaPose(S, now) {
  if (S.p === 'exit') return poseRun(S.nx * 0.55);
  const P = poseIdle(now);
  if (S.p === 'toss' && S.t < 0.35) { const k = S.t < 0.12 ? dfE(S.t / 0.12) : 1 - dfE((S.t - 0.12) / 0.23); P.arms = [P.arms[0], [dfL(0.45, 2.4, k), dfL(0.6, 2.6, k)]]; P.lean = 0.1; return P; }
  if (S.soot > 0) { P.eyes = 'squint'; P.arms = [P.arms[0], [1.3, 2.9 + Math.sin(now * 16) * 0.3]]; return P; }   // מנגב את הפיח
  if (S.p === 'happy') { P.arms = [[2.5, 2.9], [2.6, 3.0]]; return P; }
  return P;
}
function dfDrawNinja() {
  const S = dfS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, P = dfNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, GROUND, 1, 1, P, 1);
  if (S.soot > 0) { ctx.fillStyle = 'rgba(31,41,55,' + Math.min(0.7, S.soot) + ')'; ctx.beginPath(); ctx.ellipse(fx + 0.8, GROUND - 12.3, 2.3, 1.9, 0, 0, Math.PI * 2); ctx.fill();   // פיח על הפנים
    ctx.fillStyle = 'rgba(100,116,139,' + Math.min(0.6, S.soot) + ')'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(fx + 1 + Math.sin(now * 3 + k) * 1.5, GROUND - 16 - k * 1.5 - (1.4 - S.soot) * 4, 0.8, 0, Math.PI * 2); ctx.fill(); } }
  return true;
}

sceneAdd({
  type: 'dragonfeed', word: 'dragonfeed', label: true,
  listen: ['apple', 'fish', 'cake'],
  active: () => !!dfS,
  reset: () => { dfS = null; },
  setup: dfSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + DF.e0 + PLAYER.w / 2,
  draw: drawDragonFeed, drawFront: drawDragonFeedFront, drawNinja: dfDrawNinja,
  update: dfUpdate, physics: dfPhysics, speed: dfSpeed,
  expected: dfExpected, cmd: dfCmd, auto: dfAuto, tap: dfTap,
  intro: { banner: 'APPLE · FISH · CAKE?', time: 22,
           demo: () => { const o = { type: 'dragonfeed' }; dfSetup(o); o.x = dfNX() - DF.e0; obstacles.push(o); } }
});
