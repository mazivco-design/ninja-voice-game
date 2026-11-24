/* ninja-voice-game – pillow.js
   קרב כריות עם החבר (שלב בפיתוח, 2026-11-24): החבר מחכה עם כרית ורודה, ורואים אותו כבר מרחוק. "Pillow fight!"
   הוא מרים את הכרית גבוה – DUCK (הכרית עוברת מעל הראש). הוא מתכופף ומטאטא נמוך – JUMP (קופצים מעל).
   אחרי שהוא מחטיא הוא מסתחרר ומאבד שיווי משקל – SWING: הנינג'ה מכה עם הכרית הכחולה, נוצות עפות, "Oof!".
   טעה או איחר – הכרית פוגעת בנינג'ה (נוצות, "Hey!") והסיבוב חוזר, בלי לבבות. שלוש מכות – "Okay, okay! You win!" ושניהם צוחקים.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const PW = { e0: 14, fr: 30, w: 70, tele: 1.4, swing: 0.3, open: 2.6, need: 3, hint: 3.5, coins: 4 };
const PW_CHIP = { duck: 'DUCK', jump: 'JUMP', swing: 'SWING' };
const PW_LINES = { start: 'Pillow fight!', oof: 'Oof!', win: 'Okay, okay! You win!' };
let pwS = null;
const pwE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const pwL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function pwNX() { return PLAYER.x + 4; }
function pwSetup(o) { o.w = PW.w; }
function pwStart(o) {
  pwS = { o, fp: 'intro', ft: 0, np: 'stand', nt: 0, kind: 'high', round: 0, hits: 0, idle: 0, hinted: 0, held: null, feathers: [], line: null, lineT: 9, nLine: null, nLineT: 9, chipOk: 0, chipW: null, nx: PW.e0, fx: PW.fr };
  pwSay('start');
}
function pwF(p) { pwS.fp = p; pwS.ft = 0; pwS.idle = 0; pwS.hinted = 0; }
function pwN(p) { pwS.np = p; pwS.nt = 0; }
function pwSay(k) { const S = pwS; S.line = PW_LINES[k]; S.lineT = 0; speak('friend: ' + PW_LINES[k].toLowerCase()); }

/* ---------- העדכון ---------- */
function pwUpdate(dt, pb) {
  if (!pwS) {
    const o = obstacles.find(o => o.type === 'pillow' && !o.passed && pwNX() >= o.x + PW.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    pwStart(o); return;
  }
  const S = pwS, o = S.o; S.ft += dt; S.nt += dt; S.lineT += dt; S.nLineT += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { pwS = null; return; }
  const demo = state !== 'play', want = (pwExpected() || [])[0];
  if (demo && want && S.ft > (want === 'swing' ? 0.6 : 0.6)) { command(want, 'demo'); speak(want); }
  switch (S.fp) {
    case 'intro': if (S.ft >= 1.6) pwNext(); break;
    case 'tele': if (S.held && S.held === (S.kind === 'high' ? 'duck' : 'jump')) { S.held = null; pwDodge(); } if (S.ft >= PW.tele) pwF('swing'); break;   // מניף – עכשיו DUCK או JUMP
    case 'swing':
      if (S.ft >= PW.swing * 0.6 && !S.struck) {
        S.struck = 1;
        const safe = S.dodged && ((S.kind === 'high' && S.np === 'duck') || (S.kind === 'low' && S.np === 'jump') || S.np === 'stand');
        if (safe) { pwF('dizzy'); sfx('swish'); }
        else { pwN('hit'); sfx('thud'); pwPuff(S.nx + 1, -11); S.nLine = 'Hey!'; S.nLineT = 0; }
      }
      if (S.fp === 'swing' && S.ft >= PW.swing + 0.6) pwNext();
      break;
    case 'dizzy':                                                                  // מסתחרר – עכשיו SWING
      if (S.held === 'swing') { S.held = null; pwN('whack'); }
      if (S.ft >= PW.open && S.np !== 'whack') pwNext();
      break;
    case 'oof': if (S.ft >= 1.1) { if (S.hits >= PW.need) { pwF('lose'); pwSay('win'); sfx('win'); for (let k = 0; k < 24; k++) pwPuff(PW.fr - 6 + Math.random() * 14, -18 - Math.random() * 6, 1); } else pwNext(); } break;
    case 'lose': if (S.ft >= 2.8 && S.np !== 'exit') pwN('exit'); break;
  }
  switch (S.np) {
    case 'duck': if (S.nt >= 0.9 && S.fp !== 'tele' && S.fp !== 'swing') pwN('stand'); break;   // נשאר כפוף עד שהכרית עוברת
    case 'jump': if (S.nt >= 0.7) pwN('stand'); break;
    case 'hit': if (S.nt >= 0.9) pwN('stand'); break;
    case 'whack':
      if (S.nt >= 0.28 && !S.whacked) { S.whacked = 1; S.hits++; sfx('hit'); pwPuff(PW.fr - 2, -12); pwF('oof'); pwSay('oof'); }
      if (S.nt >= 0.7) { S.whacked = 0; pwN('stand'); }
      break;
    case 'exit': {
      S.nx += 15 * dt; S.fx += 15 * dt;
      const over = o.x + S.nx - pwNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + S.fx > viewR() + 15 || S.nt > 8) {
        cleared(o); pwS = null;
        if (mode === 'journey' && state === 'play') { picked += PW.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + PW.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  for (const f of S.feathers) { f.t += dt; f.vy = Math.min(f.vy + 12 * dt, 3); f.x += f.vx * dt + Math.sin(f.t * 4 + f.ph) * 3 * dt; f.vx *= Math.pow(0.3, dt); f.h -= f.vy * dt; f.r += dt * 2; }
  S.feathers = S.feathers.filter(f => f.t < 3 && f.h > 0);
  if (want && !demo && state === 'play') {
    S.idle += dt;
    const lim = want === 'swing' ? 1.0 : 0.5;
    if (S.idle > lim + S.hinted * 5 && (want === 'swing' || !S.hinted)) { S.hinted++; speak(want); }
  }
}
function pwNext() { const S = pwS; S.round++; S.struck = 0; S.dodged = 0; S.kind = [0, 1, 0, 0, 1, 1, 0, 1][S.round % 8] ? 'low' : 'high'; pwF('tele'); }
function pwDodge() { const S = pwS; S.dodged = 1; pwN(S.kind === 'high' ? 'duck' : 'jump'); pwChipOk(S.kind === 'high' ? 'duck' : 'jump'); sfx('swish'); }
function pwPuff(x, h, slow) { for (let k = 0; k < (slow ? 1 : 10); k++) { const a = Math.random() * Math.PI * 2, v = slow ? 2 : 6 + Math.random() * 8; pwS.feathers.push({ x, h: -h, vx: Math.cos(a) * v, vy: -Math.abs(Math.sin(a) * v), t: 0, r: Math.random() * 3, ph: Math.random() * 6 }); } }
function pwPhysics() { if (!pwS) return false; vy = 0; py = 0; return true; }
function pwSpeed() { return pwS ? 0 : null; }

/* ---------- פקודות ---------- */
function pwCmd(word) {
  if (!pwS || !PW_CHIP[word]) return false;
  const S = pwS;
  if ((word === 'duck' || word === 'jump') && S.np === 'stand' && !S.dodged && (S.fp === 'tele' || (S.fp === 'swing' && !S.struck))) {
    if (word === (S.kind === 'high' ? 'duck' : 'jump')) pwDodge(); else { pwN(word); sfx('swish'); }   // מילה לא נכונה – עושה אותה, ונפגע
  } else if (word === 'swing' && S.fp === 'dizzy' && S.np === 'stand') { pwN('whack'); pwChipOk('swing'); }
  return true;
}
function pwChipOk(w) { pwS.chipOk = 1.1; pwS.chipW = w; }
function pwExpected() {
  const S = pwS; if (!S) return null;
  if (S.np === 'stand' && S.fp === 'tele' && !S.dodged) return [S.kind === 'high' ? 'duck' : 'jump'];
  if (S.np === 'stand' && S.fp === 'dizzy') return ['swing'];
  return [];
}
function pwAuto() { const S = pwS; if (!S) return; const w = (pwExpected() || [])[0]; if (w && S.ft > 0.6) command(w, 'auto'); }
function pwTap() { return pwS ? (pwExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function pwPillow(hand, ang, col) {                                             // כרית: מלבן מעוגל בצבע, אוחזים בפינה
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-0.6, -1.9, 7, 3.8, 1.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.roundRect(0.4, -1.3, 5, 1, 0.5); ctx.fill();
  ctx.restore();
}
function pwFriendPose(S, now) {
  const P = poseIdle(now + 0.4), t = S.ft;
  if (S.fp === 'intro') { P.arms = [P.arms[0], [2.6, 2.9]]; return P; }
  if (S.fp === 'tele') {
    if (S.kind === 'high') { const k = pwE(t / 0.4); P.arms = [[pwL(0.3, 2.9, k), pwL(0.4, 3.3, k)], [pwL(0.4, 2.8, k), pwL(0.5, 3.2, k)]]; P.lean = -0.1 * k; return P; }
    const k = pwE(t / 0.4); return Object.assign(P, { hipY: pwL(P.hipY, -3.2, k), lean: 0.35 * k, legs: [[-0.6, -1.4], [0.9, -0.3]], arms: [[pwL(0.3, -1.2, k), -0.8], [pwL(0.4, -1.1, k), -0.7]] });
  }
  if (S.fp === 'swing') {
    const k = pwE(t / PW.swing);
    if (S.kind === 'high') { P.arms = [[pwL(2.9, 1.2, k), pwL(3.3, 1.4, k)], [pwL(2.8, 1.3, k), pwL(3.2, 1.5, k)]]; P.lean = 0.25 * k; return P; }
    return Object.assign(P, { hipY: -3.2, lean: 0.4, legs: [[-0.6, -1.4], [0.9, -0.3]], arms: [[pwL(-1.2, 0.9, k), pwL(-0.8, 1.0, k)], [pwL(-1.1, 1.0, k), pwL(-0.7, 1.1, k)]] });
  }
  if (S.fp === 'dizzy') { P.lean = Math.sin(now * 5) * 0.15; P.eyes = 'squint'; P.arms = [[-0.6, -0.3], [1.0, 1.2]]; P.headTilt = Math.sin(now * 5 + 1) * 0.2; return P; }
  if (S.fp === 'oof') { P.lean = -0.3; P.eyes = 'squint'; P.arms = [[-0.8, -0.4], [2.0, 2.4]]; return P; }
  if (S.fp === 'lose') { if (S.np === 'exit') return poseRun(S.fx * 0.5); P.eyes = 'squint'; P.arms = [[0.3, 2.4], [0.4, 2.5]]; P.lean = -0.08 + Math.sin(now * 12) * 0.04; return P; }   // צוחק
  return P;
}
function pwNinjaPose(S, now) {
  const P = poseIdle(now), t = S.nt;
  if (S.np === 'exit') return poseRun(S.nx * 0.55);
  if (S.np === 'duck') { const k = t < 0.15 ? pwE(t / 0.15) : t > 0.7 ? 1 - pwE((t - 0.7) / 0.2) : 1;
    return Object.assign(P, { hipY: pwL(P.hipY, -2.3, k), lean: 0.45 * k, spine: 0.3 * k, headTilt: 0.35 * k, legs: [[pwL(-0.1, -0.45, k), pwL(-0.1, -2.3, k)], [pwL(0.1, 1.5, k), pwL(0.1, -0.2, k)]], arms: [[pwL(0.3, 2.2, k), pwL(0.4, 3.3, k)], [pwL(0.4, 0.6, k), pwL(0.5, 1.2, k)]], eyes: 'squint' }); }
  if (S.np === 'jump') return poseAir(true, Math.min(1, t / 0.7));
  if (S.np === 'hit') { P.lean = -0.3; P.eyes = 'squint'; P.arms = [[-0.8, -0.4], [2.2, 2.7]]; return P; }
  if (S.np === 'whack') { const k = t < 0.15 ? pwE(t / 0.15) : 1, sw = t < 0.15 ? 0 : pwE((t - 0.15) / 0.15);
    P.arms = [P.arms[0], [pwL(pwL(0.6, 2.9, k), 1.4, sw), pwL(pwL(0.8, 3.2, k), 1.6, sw)]]; P.lean = pwL(-0.1, 0.3, sw); return P; }
  if (S.fp === 'lose') { P.eyes = 'squint'; P.arms = [[0.3, 2.4], [0.4, 2.5]]; return P; }
  P.arms = [P.arms[0], [0.6, 0.8]]; P.legs = [[-0.4, -0.3], [0.4, 0.1]]; return P;  // עמידת קרב עם כרית
}
function pwJumpH(S) { return S.np === 'jump' ? Math.sin(Math.min(1, S.nt / 0.7) * Math.PI) * 7 : 0; }
function drawPillowScene(o) {
  const S = pwS && pwS.o === o ? pwS : null; if (S) return;
  const now = performance.now() / 1000, P = poseIdle(now + 0.4); P.arms = [P.arms[0], [2.6, 2.9 + Math.sin(now * 6) * 0.3]];   // מרחוק: מנופף עם הכרית
  const ffx = o.x + PW.fr;
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
  drawFriend({ fx: ffx, fy: GROUND, pose: P, facing: -1 });
  pwPillow(figHand(ffx, GROUND, -1, FRIEND.scale, P, 1), -Math.PI / 2 - 0.3, '#f9a8d4');
}
function drawPillowFront(o) {
  const S = pwS && pwS.o === o ? pwS : null; if (!S) return;
  for (const f of S.feathers) { ctx.save(); ctx.translate(o.x + f.x, GROUND - f.h); ctx.rotate(f.r); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 1.0, 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (S.line && S.lineT < 2.4) drawBubble(S.line, o.x + S.fx + 2, GROUND - 18, { age: S.lineT, tail: -1, color: '#1d4ed8', size: 3.6 });
  if (S.nLine && S.nLineT < 1.2) drawBubble(S.nLine, o.x + S.nx, GROUND - 18, { age: S.nLineT, tail: 1, color: playerColor(), size: 3.6 });
  if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (pwExpected() || [])[0];
  if (!w) return;
  const txt = PW_CHIP[w], y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55;
  ctx.translate(W / 2, y);
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}
function pwDrawNinja() {
  const S = pwS; if (!S) return false;
  const now = performance.now() / 1000, o = S.o;
  const flunge = S.fp === 'swing' ? Math.sin(Math.min(1, S.ft / (PW.swing + 0.5)) * Math.PI) * 5 : S.fp === 'tele' ? pwE(S.ft / 0.6) * 1.5 : 0;   // צעד קדימה במכה
  const ffx = o.x + S.fx - flunge, FP = pwFriendPose(S, now), ff = S.np === 'exit' ? 1 : -1;
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
  drawFriend({ fx: ffx, fy: GROUND, pose: FP, facing: ff });
  const fh = figHand(ffx, GROUND, ff, FRIEND.scale, FP, 1), fa = FP.arms[1];
  pwPillow(fh, ff < 0 ? Math.PI / 2 + fa[1] : Math.PI / 2 - fa[1], '#f9a8d4');   // הכרית ממשיכה את כיוון האמה
  const lunge = S.np === 'whack' ? Math.sin(Math.min(1, S.nt / 0.7) * Math.PI) * 5 : 0;   // צעד קדימה בזמן המכה
  const fx = o.x + S.nx + lunge, fy = GROUND - pwJumpH(S), P = pwNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  const h = playerHand = figHand(fx, fy, 1, 1, P, 1);
  pwPillow(h, Math.PI / 2 - P.arms[1][1], '#93c5fd');
  return true;
}

sceneAdd({
  type: 'pillow', word: 'pillow', label: true,
  listen: ['duck', 'jump', 'swing'],
  active: () => !!pwS,
  reset: () => { pwS = null; },
  setup: pwSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + PW.e0 + PLAYER.w / 2,
  draw: drawPillowScene, drawFront: drawPillowFront, drawNinja: pwDrawNinja,
  update: pwUpdate, physics: pwPhysics, speed: pwSpeed,
  expected: pwExpected, cmd: pwCmd, auto: pwAuto, tap: pwTap,
  intro: { banner: 'DUCK · JUMP · SWING!', time: 25,
           demo: () => { const o = { type: 'pillow' }; pwSetup(o); o.x = pwNX() - PW.e0; obstacles.push(o); } }
});
