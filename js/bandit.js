/* ninja-voice-game – bandit.js
   דו־קרב עם סמוראי (שלב בפיתוח, 2026-11-24): סמוראי אדום עם חרב חוסם את הדרך בכפר בלילה. רואים אותו כבר מרחוק.
   הוא מניף את החרב מעל הראש – BLOCK: הנינג'ה מרים מגן, החרב פוגעת במגן (קלאנג!) והסמוראי מסוחרר.
   כשהוא מסוחרר – KICK: הנינג'ה מזנק ובועט. שלוש בעיטות – הסמוראי נופל, קם ובורח ומשאיר שק מטבעות.
   לא חסם בזמן – החרב פוגעת ("OUCH!"), הנינג'ה נהדף קצת אחורה, בלי לבבות, והסיבוב חוזר. לא בעט בזמן – השודד מתאושש וחוזר לתקוף.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const BD = { e0: 16, b0: 31, w: 60, hp: 3, ready: 1.0, wind: 1.5, swing: 0.3, dizzy: 3.0, hint: 3.5, coins: 5, walkV: 15 };
const BD_CHIP = { block: 'BLOCK', kick: 'KICK' };
let bdS = null;
const bdE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const bdL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function bdNX() { return PLAYER.x + 4; }
function bdSetup(o) { o.w = BD.w; }
function bdStart(o) {
  bdS = { o, bp: 'ready', bt: 0, np: 'stand', nt: 0, nx: BD.e0, bx: BD.b0, by: 0, hp: BD.hp, idle: 0, hinted: 0, held: null, chipOk: 0, chipW: null, sparks: [], bag: null, ouch: 0 };
}
function bdB(p) { bdS.bp = p; bdS.bt = 0; }
function bdN(p) { bdS.np = p; bdS.nt = 0; }
function bdIdle() { bdS.idle = 0; bdS.hinted = 0; }

/* ---------- העדכון ---------- */
function bdUpdate(dt, pb) {
  if (!bdS) {
    const o = obstacles.find(o => o.type === 'bandit' && !o.passed && bdNX() >= o.x + BD.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    bdStart(o); return;
  }
  const S = bdS, o = S.o; S.bt += dt; S.nt += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.ouch > 0) S.ouch -= dt;
  if (!obstacles.includes(o)) { bdS = null; return; }
  const demo = state !== 'play';
  if (demo) { const w = (bdExpected() || [])[0]; if (w && S.bt > (w === 'block' ? 0.6 : 0.8)) { command(w, 'demo'); speak(w); } }
  /* ---- השודד ---- */
  switch (S.bp) {
    case 'ready': if (S.bt >= BD.ready) { bdB('wind'); bdIdle(); } break;        // מסובב את המקל
    case 'wind': if (S.bt >= BD.wind) bdB('swing'); break;                         // מניף מעל הראש – עכשיו BLOCK
    case 'swing':
      if (S.bt >= BD.swing && !S.struck) {
        S.struck = 1;
        if (S.np === 'block') { sfx('hit'); bdSparks(); floatText(o.x + S.nx + 3, GROUND - 20, 'CLANG!', '#facc15'); bdB('dizzy'); bdIdle(); }
        else { sfx('thud'); S.ouch = 1.0; bdN('hurt'); floatText(o.x + S.nx, GROUND - 22, 'OUCH!', '#dc2626'); }
      }
      if (S.bp === 'swing' && S.bt >= BD.swing + 0.9) { S.struck = 0; bdB('ready'); }
      break;
    case 'dizzy':                                                                  // מסוחרר – עכשיו KICK
      if (S.held === 'kick') { S.held = null; bdN('kick'); }
      if (S.bt >= BD.dizzy && S.np !== 'kick') { S.struck = 0; bdB('ready'); if (S.np === 'block') bdN('stand'); }
      break;
    case 'hurt': S.bx = bdL(S.bx, BD.b0 + 5, dt * 6); if (S.bt >= 0.9) { S.struck = 0; if (S.hp <= 0) { bdB('fall'); sfx('thud'); } else { bdB('back'); } } break;
    case 'back': S.bx = bdL(S.bx, BD.b0, dt * 4); if (S.bt >= 0.6) bdB('ready'); break;   // חוזר למקום
    case 'fall': if (S.bt >= 1.2) { bdB('flee'); S.bag = { x: S.bx - 2, y: -8, vy: -12, vx: -6, st: 'fly' }; sfx('swish'); } break;
    case 'flee': S.bx += 32 * dt; if (S.bt >= 1.0 && S.np !== 'exit') bdN('exit'); break;
  }
  /* ---- הנינג'ה ---- */
  switch (S.np) {
    case 'stand': if (S.held === 'block' && (S.bp === 'wind' || S.bp === 'swing')) { S.held = null; bdN('block'); } break;
    case 'block': if (S.bp === 'ready') bdN('stand'); break;
    case 'hurt': S.nx = bdL(S.nx, BD.e0 - 3, dt * 6); if (S.nt >= 0.8) { bdN('recover'); } break;
    case 'recover': S.nx = bdL(S.nx, BD.e0, dt * 5); if (S.nt >= 0.5) { S.nx = BD.e0; bdN('stand'); } break;
    case 'kick': {                                                                 // זינוק קדימה – בעיטה – חזרה
      const t = S.nt;
      S.nx = t < 0.25 ? bdL(BD.e0, S.bx - 7.5, bdE(t / 0.25)) : t < 0.55 ? S.bx - 7.5 : bdL(S.bx - 7.5, BD.e0, bdE((t - 0.55) / 0.35));
      if (t >= 0.33 && !S.kicked) { S.kicked = 1; S.hp--; sfx('hit'); bdSparks(1); floatText(o.x + S.bx, GROUND - 22, S.hp > 0 ? 'POW!' : 'POW! ⭐', '#ca8a04'); bdB('hurt'); }
      if (t >= 0.9) { S.kicked = 0; S.nx = BD.e0; bdN('stand'); }
      break;
    }
    case 'exit': {
      S.nx += BD.walkV * dt;
      const b = S.bag;
      if (b && b.st === 'ground' && Math.abs(b.x - S.nx) < 2.5) { b.st = 'gone'; sfx('coin'); floatText(o.x + b.x, GROUND - 10, '💰', '#ca8a04'); }
      const over = o.x + S.nx - bdNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + S.nx > o.x + BD.b0 + 40 || S.nt > 8) {
        cleared(o); bdS = null;
        if (mode === 'journey' && state === 'play') { picked += BD.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BD.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  if (S.bag && S.bag.st === 'fly') { const b = S.bag; b.vy += 90 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= -1.2) { b.y = -1.2; b.st = 'ground'; sfx('coin'); } }
  for (const p of S.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
  S.sparks = S.sparks.filter(p => p.t < 0.5);
  const want = (bdExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > (want === 'block' ? 0.5 : 1.0) + S.hinted * 5 && S.hinted < (want === 'block' ? 1 : 3)) { S.hinted++; speak(want); }
  }
}
function bdSparks(kick) {
  const S = bdS, x = kick ? S.bx - 3 : S.nx + 3, y = kick ? -9 : -17;
  for (let k = 0; k < 8; k++) { const a = Math.random() * Math.PI * 2; S.sparks.push({ x, y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14 - 4, t: 0 }); }
}
function bdPhysics() { if (!bdS) return false; vy = 0; py = 0; return true; }
function bdSpeed() { return bdS ? 0 : null; }

/* ---------- פקודות ---------- */
function bdCmd(word) {
  if (!bdS || !['block', 'kick'].includes(word)) return false;
  const S = bdS;
  if (word === 'block') {
    if (S.np === 'stand' && (S.bp === 'wind' || (S.bp === 'swing' && !S.struck))) { bdN('block'); bdChipOk('block'); }
    else if (S.np === 'stand' && S.bp === 'ready' && S.bt > 0.6) { S.held = 'block'; bdChipOk('block'); }
  } else if (S.bp === 'dizzy' && S.np !== 'kick') { if (S.np === 'block') bdN('stand'); bdN('kick'); bdChipOk('kick'); }
  return true;
}
function bdChipOk(w) { bdS.chipOk = 1.1; bdS.chipW = w; }
function bdExpected() {
  const S = bdS; if (!S) return null;
  if (S.np === 'stand' && (S.bp === 'wind' || (S.bp === 'swing' && !S.struck))) return ['block'];
  if (S.bp === 'dizzy' && S.np !== 'kick') return ['kick'];
  return [];
}
function bdAuto() { const S = bdS; if (!S) return; const w = (bdExpected() || [])[0]; if (w && S.bt > (w === 'block' ? 0.5 : 0.6)) command(w, 'auto'); }
function bdTap() { return bdS ? (bdExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function bdBanditPose(S, now) {
  const P = poseIdle(now * 1.2 + 1), t = S.bt;
  if (S.bp === 'ready') { P.arms = [[0.9, 1.6], [1.1, 1.7]]; P.lean = 0.05; P.legs = [[-0.5, -0.3], [0.5, 0.1]]; return P; }
  if (S.bp === 'wind') { const k = bdE(t / 0.4); P.arms = [[bdL(0.9, 2.8, k), bdL(1.6, 3.2, k)], [bdL(1.1, 2.9, k), bdL(1.7, 3.3, k)]]; P.lean = bdL(0.05, -0.15, k); P.legs = [[-0.55, -0.3], [0.55, 0.15]]; return P; }
  if (S.bp === 'swing') { const k = bdE(t / BD.swing); P.arms = [[bdL(2.8, 1.3, k), bdL(3.2, 1.5, k)], [bdL(2.9, 1.4, k), bdL(3.3, 1.6, k)]]; P.lean = bdL(-0.15, 0.3, k); P.legs = [[-0.6, -0.3], [0.7, 0.2]]; return P; }
  if (S.bp === 'dizzy') { P.lean = Math.sin(now * 4) * 0.12; P.arms = [[0.4, 0.6], [0.3, 0.5]]; P.eyes = 'squint'; P.headTilt = Math.sin(now * 4 + 1) * 0.2; return P; }
  if (S.bp === 'hurt') { P.lean = -0.35; P.arms = [[-0.8, -0.4], [2.2, 2.6]]; P.eyes = 'squint'; P.legs = [[-0.2, -0.6], [0.9, 0.4]]; return P; }
  if (S.bp === 'fall') { P.lean = -1.2 * bdE(t / 0.3); P.hipY = bdL(-4.5, -2.0, t / 0.3); P.legs = [[1.0, 0.2], [1.3, 0.5]]; P.arms = [[2.4, 2.8], [2.6, 3.0]]; P.eyes = 'squint'; return P; }
  if (S.bp === 'flee') return poseRun(S.bx * 0.6);
  return P;
}
function drawBandit(o, S) {
  const now = performance.now() / 1000, bx = o.x + (S ? S.bx : BD.b0), P = S ? bdBanditPose(S, now) : (() => { const Q = poseIdle(now * 1.2 + 1); Q.arms = [[0.9, 1.6], [1.1, 1.7]]; return Q; })();
  const facing = S && S.bp === 'flee' ? 1 : -1;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(bx, GROUND + 0.2, 3.6, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx: bx, fy: GROUND, facing, scale: 1.12, kind: 'enemy', accent: '#facc15', pose: P, suit: null });
    // החרב של הסמוראי ממשיכה את כיוון האמה (ninja-figure.js) – לא מציירים נשק נוסף
  if (S && S.bp === 'dizzy') { ctx.fillStyle = '#facc15'; ctx.font = '3px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) { const a = now * 6 + k / 3 * Math.PI * 2; ctx.fillText('★', bx + Math.cos(a) * 3.8, GROUND - 17.5 + Math.sin(a) * 1.1); } }
  if (S) {                                                                       // פס חיים
    const hx = bx, hy = GROUND - 23;
    if (S.hp > 0 && S.bp !== 'flee') { ctx.fillStyle = 'rgba(30,41,59,.75)'; ctx.beginPath(); ctx.roundRect(hx - 6.5, hy, 13, 2.4, 1); ctx.fill();
      for (let i = 0; i < BD.hp; i++) { ctx.fillStyle = i < S.hp ? '#ef4444' : '#475569'; ctx.beginPath(); ctx.roundRect(hx - 6 + i * 4.1, hy + 0.5, 3.6, 1.4, 0.6); ctx.fill(); } }
  }
}
function drawBanditScene(o) {
  const S = bdS && bdS.o === o ? bdS : null;
  drawBandit(o, S);
  if (S && S.bag && S.bag.st !== 'gone') {                                        // שק מטבעות
    const b = S.bag, x = o.x + b.x, y = GROUND + b.y;
    ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(x, y - 0.2, 1.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.ellipse(x - 0.4, y - 0.5, 0.8, 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a16207'; ctx.fillRect(x - 0.5, y - 2.2, 1, 1); ctx.fillStyle = '#facc15'; ctx.font = '900 1.4px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 0.3);
  }
}
function drawBanditFront(o) {
  const S = bdS && bdS.o === o ? bdS : null; if (!S) return;
  for (const p of S.sparks) { ctx.fillStyle = 'rgba(253,224,71,' + (1 - p.t / 0.5) + ')'; ctx.beginPath(); ctx.arc(o.x + p.x, GROUND + p.y, 0.45, 0, Math.PI * 2); ctx.fill(); }
  bdDrawChip();
}
function bdDrawChip() {
  const S = bdS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (bdExpected() || [])[0];
  if (!w) return;
  const txt = BD_CHIP[w] || w.toUpperCase(), y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}

/* ---------- הנינג'ה ---------- */
function bdNinjaPose(S, now) {
  const t = S.nt;
  if (S.np === 'exit') return poseRun(S.nx * 0.55);
  if (S.np === 'block') { const P = poseIdle(now); P.legs = [[-0.5, -0.4], [0.45, 0.1]]; return applyBlock(P); }
  if (S.np === 'kick') { const P = poseIdle(now); if (t < 0.25) { const R = poseRun(t * 12); R.lean = 0.3; return R; } return applyKick(P, Math.min(1, (t - 0.25) / 0.5)); }
  if (S.np === 'hurt') { const P = poseIdle(now); P.lean = -0.3; P.arms = [[-0.6, -0.3], [1.0, 2.8]]; P.eyes = 'squint'; return P; }
  const P = poseIdle(now); P.legs = [[-0.45, -0.3], [0.45, 0.1]]; P.arms = [[-0.4, 0.4], [0.9, 2.0]]; P.lean = 0.06;   // עמידת קרב
  return P;
}
function bdDrawNinja() {
  const S = bdS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, P = bdNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, GROUND, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'bandit', word: 'bandit', label: true,
  listen: ['block', 'kick'],
  active: () => !!bdS,
  reset: () => { bdS = null; },
  setup: bdSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + BD.e0 + PLAYER.w / 2,
  draw: drawBanditScene, drawFront: drawBanditFront, drawNinja: bdDrawNinja,
  update: bdUpdate, physics: bdPhysics, speed: bdSpeed,
  expected: bdExpected, cmd: bdCmd, auto: bdAuto, tap: bdTap,
  intro: { banner: 'BLOCK · KICK!', time: 20,
           demo: () => { const o = { type: 'bandit' }; bdSetup(o); o.x = bdNX() - BD.e0; obstacles.push(o); } }
});
