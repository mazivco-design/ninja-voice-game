/* ninja-voice-game – fair.js
   דוכן המטרות ביריד (שלב בפיתוח, 2026-11-24) – בהשראת Duck Hunt ודוכני יריד.
   ברווזי עץ צהובים נוסעים על מסילה בתוך דוכן עם גגון מפוספס. באמצע יש עיגול מטרה.
   THROW כשהברווז נכנס לעיגול: הכוכב עף, הברווז מתהפך – פגיעה! מוקדם או מאוחר מדי – הכוכב נתקע בקיר האחורי.
   שלוש פגיעות – פעמון, ופרס: פנדה פרווה גדולה שהנינג'ה לוקח ביד וממשיך. בלי לבבות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const FR = { e0: 14, b0: 26, b1: 76, track: 15, aim: 51, zone: 3.6, speed: 15, every: 1.7, fly: 0.32, need: 3, hint: 3.5, coins: 4, w: 90 };
let frS = null;
const frE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const frL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function frNX() { return PLAYER.x + 4; }
function frSetup(o) { o.w = FR.w; }
function frStart(o) { frS = { o, p: 'play', t: 0, ducks: [], spawn: 0.4, stars: [], stuck: [], hits: 0, throwT: 9, idle: 0, hinted: 0, missed: 0, chipOk: 0, nx: FR.e0, prize: 0 }; }

/* ---------- העדכון ---------- */
function frUpdate(dt, pb) {
  if (!frS) {
    const o = obstacles.find(o => o.type === 'fair' && !o.passed && frNX() >= o.x + FR.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    frStart(o); return;
  }
  const S = frS, o = S.o; S.t += dt; S.throwT += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { frS = null; return; }
  const demo = state !== 'play';
  if (S.p === 'play') {
    S.spawn -= dt;
    if (S.spawn <= 0 && S.hits < FR.need) { S.spawn = FR.every; S.ducks.push({ x: FR.b0 + 2, st: 'go', flip: 0 }); }
    for (const d of S.ducks) {
      if (d.st === 'go') { d.x += FR.speed * dt; if (d.x > FR.b1 - 2) { d.st = 'gone'; if (!d.tried) S.missed++; } }
      else if (d.st === 'hit') { d.flip = Math.min(1, d.flip + dt * 5); d.x += FR.speed * 0.3 * dt; if (d.flip >= 1 && (d.t = (d.t || 0) + dt) > 0.6) d.st = 'gone'; }
    }
    S.ducks = S.ducks.filter(d => d.st !== 'gone');
    for (const s of S.stars) {                                                   // כוכבים באוויר
      s.t += dt; const k = Math.min(1, s.t / FR.fly); s.x = frL(s.x0, FR.aim, k); s.h = frL(s.h0, FR.track + 2.5, k) + Math.sin(k * Math.PI) * 2; s.rot += dt * 25;
      if (k >= 1 && !s.done) {
        s.done = 1;
        const d = S.ducks.find(d => d.st === 'go' && Math.abs(d.x - FR.aim) < FR.zone);
        if (d) { d.st = 'hit'; S.hits++; sfx('hit'); floatText(o.x + FR.aim, GROUND - FR.track - 9, S.hits < FR.need ? 'HIT! ' + S.hits : 'HIT! ⭐', '#16a34a'); if (S.hits >= FR.need) { S.p = 'win'; S.t = 0; sfx('win'); } }
        else { S.stuck.push({ x: FR.aim + (Math.random() - 0.5) * 3, h: FR.track + 6 + Math.random() * 3 }); sfx('thud'); floatText(o.x + FR.aim, GROUND - FR.track - 9, 'MISS', '#64748b'); }
      }
    }
    S.stars = S.stars.filter(s => !s.done);
    if (demo && S.throwT > 0.6 && frWant()) { command('throw', 'demo'); speak('throw'); }
    if (!demo && state === 'play') {                                             // רמז: אחרי שני ברווזים שעברו בלי זריקה
      if (S.missed >= 2 + S.hinted * 2 && frWant()) { S.hinted++; speak('throw'); }
    }
  } else if (S.p === 'win') {                                                    // הפרס יורד מהדוכן אל הידיים
    S.prize = frE(S.t / 0.9);
    if (S.t >= 2.2) { S.p = 'exit'; S.t = 0; }
  } else if (S.p === 'exit') {
    S.nx += 15 * dt;
    const over = o.x + S.nx - frNX(); if (over > 0) ropeShiftBy(over);
    if (o.x + FR.b1 < -20 || S.t > 8) {
      cleared(o); frS = null;
      if (mode === 'journey' && state === 'play') { picked += FR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + FR.coins + ' 🟡', '#ca8a04'); }
      return;
    }
  }
}
function frWant() {                                                              // ברווז שיגיע למטרה בדיוק כשהכוכב יגיע
  const S = frS; return S.ducks.some(d => d.st === 'go' && Math.abs(d.x + FR.speed * FR.fly - FR.aim) < FR.zone * 0.6);
}
function frPhysics() { if (!frS) return false; vy = 0; py = 0; return true; }
function frSpeed() { return frS ? 0 : null; }

/* ---------- פקודות ---------- */
function frCmd(word) {
  if (!frS || word !== 'throw') return false;
  const S = frS; if (S.p !== 'play' || S.throwT < 0.35) return true;
  S.throwT = 0; S.chipOk = 1.0; sfx('swish');
  for (const d of S.ducks) if (d.st === 'go' && d.x < FR.aim + 4) d.tried = 1;
  S.stars.push({ x0: S.nx + 2.5, h0: 13, x: S.nx, h: 13, t: 0, rot: 0 });
  return true;
}
function frExpected() { const S = frS; if (!S) return null; return S.p === 'play' && frWant() ? ['throw'] : []; }
function frAuto() { const S = frS; if (!S) return; if (S.p === 'play' && S.throwT > 0.6 && frWant()) command('throw', 'auto'); }
function frTap() { return frS && frS.p === 'play' ? 'throw' : null; }

/* ---------- ציור ---------- */
function frDuck(x, y, flip) {                                                    // ברווז עץ צהוב על מקל
  ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4 * (Math.cos(flip * Math.PI * 0.5) || 0.05));
  ctx.fillStyle = '#92400e'; ctx.fillRect(-0.3, 0, 0.6, 3);
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(0, -1.4, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1.7, -3.2, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(2.8, -3.3); ctx.lineTo(4.1, -3.0); ctx.lineTo(2.8, -2.6); ctx.fill();
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(2.0, -3.5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.ellipse(-0.6, -1.5, 1.2, 0.7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
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
function drawFair(o) {
  const S = frS && frS.o === o ? frS : null, g = GROUND, X0 = o.x + FR.b0, X1 = o.x + FR.b1, ty = g - FR.track, now = performance.now() / 1000;
  ctx.fillStyle = '#fde68a'; ctx.fillRect(X0, g - 30, X1 - X0, 30);               // קיר אחורי
  ctx.fillStyle = '#fcd34d'; for (let x = X0; x < X1; x += 6) ctx.fillRect(x, g - 30, 3, 30);
  // המטרה באמצע
  const ax = o.x + FR.aim, ay = ty - 2.5;
  for (const [r, c] of [[5, '#ef4444'], [3.6, '#fff'], [2.2, '#ef4444'], [0.9, '#fff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ax, ay - 6, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(239,68,68,.55)'; ctx.lineWidth = 0.4; ctx.setLineDash([0.8, 0.8]); ctx.beginPath(); ctx.moveTo(ax - FR.zone, ty - 9); ctx.lineTo(ax - FR.zone, ty + 1); ctx.moveTo(ax + FR.zone, ty - 9); ctx.lineTo(ax + FR.zone, ty + 1); ctx.stroke(); ctx.setLineDash([]);
  if (S) for (const st of S.stuck) star4(o.x + st.x, g - st.h, 1.6, 0.4, '#475569');
  // הברווזים והמסילה
  if (S) for (const d of S.ducks) frDuck(o.x + d.x, ty - 0.2, d.flip);
  ctx.fillStyle = '#78350f'; ctx.fillRect(X0, ty, X1 - X0, 1.2);
  // דלפק
  ctx.fillStyle = '#b91c1c'; ctx.fillRect(X0 - 1, g - 9, X1 - X0 + 2, 9);
  ctx.fillStyle = '#fef3c7'; for (let x = X0 + 2; x < X1 - 2; x += 8) { ctx.beginPath(); ctx.arc(x + 2, g - 4.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7f1d1d'; ctx.fillRect(X0 - 1.5, g - 9.8, X1 - X0 + 3, 1);
  // עמודים וגגון מפוספס
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(X0 - 1.5, g - 36, 1.5, 36); ctx.fillRect(X1, g - 36, 1.5, 36);
  for (let i = 0, x = X0 - 3; x < X1 + 3; x += 5, i++) { ctx.fillStyle = i % 2 ? '#fff' : '#dc2626'; ctx.beginPath(); ctx.moveTo(x, g - 40); ctx.lineTo(x + 5, g - 40); ctx.lineTo(x + 5, g - 35); ctx.arc(x + 2.5, g - 35, 2.5, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.roundRect((X0 + X1) / 2 - 15, g - 47, 30, 6, 1.5); ctx.fill();   // שלט
  ctx.fillStyle = '#fde047'; ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★ DUCK SHOT ★', (X0 + X1) / 2, g - 43.9);
  // מונה פגיעות ופרסים על המדף
  if (S) for (let i = 0; i < FR.need; i++) { ctx.fillStyle = i < S.hits ? '#facc15' : 'rgba(0,0,0,.2)'; star4(X1 - 4 - i * 4, g - 26, 1.5, 0, i < S.hits ? '#facc15' : 'rgba(0,0,0,.25)'); }
  if (!S || S.prize <= 0) frPanda(X1 - 8, g - 9.8 - 3.2, 0.8);
}
function drawFairFront(o) {
  const S = frS && frS.o === o ? frS : null; if (!S) return;
  for (const s of S.stars) star4(o.x + s.x, GROUND - s.h, 1.6, s.rot, '#475569');
  if (state !== 'play' || S.p !== 'play') return;
  const ok = S.chipOk > 0, want = frWant(); if (!ok && !want) return;
  const txt = 'THROW', y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55;
  ctx.translate(W / 2, y);
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}
function frNinjaPose(S, now) {
  if (S.p === 'exit') { const R = poseRun(S.nx * 0.55); R.arms = [[0.9, 1.9], [1.0, 2.0]]; return R; }
  const P = poseIdle(now);
  if (S.p === 'win') { P.arms = [[0.9, 1.9], [1.0, 2.0]]; P.eyes = 'squint'; return P; }  // מחבק את הפנדה
  const t = S.throwT;
  if (t < 0.45) {                                                                // תנופה לאחור – זריקה קדימה – חזרה
    const up = t < 0.12 ? frL(0.45, -2.4, frE(t / 0.12)) : t < 0.24 ? frL(-2.4, 1.9, frE((t - 0.12) / 0.12)) : frL(1.9, 0.45, frE((t - 0.24) / 0.2));
    P.arms = [P.arms[0], [up, up + 0.3]]; P.lean = t < 0.12 ? -0.1 : 0.15; return P;
  }
  P.arms = [P.arms[0], [0.45, 1.25]]; return P;
}
function frDrawNinja() {
  const S = frS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, P = frNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, GROUND, 1, 1, P, 1);
  if (S.prize > 0) { const px = frL(S.o.x + FR.b1 - 8, fx + 2.2, S.prize), py2 = frL(GROUND - 13, GROUND - 7.5, S.prize) - Math.sin(S.prize * Math.PI) * 8; frPanda(px, py2, 0.8); }
  return true;
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
  intro: { banner: 'THROW at the ducks!', time: 20,
           demo: () => { const o = { type: 'fair' }; frSetup(o); o.x = frNX() - FR.e0; obstacles.push(o); } }
});
