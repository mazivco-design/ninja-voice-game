/* ninja-voice-game – kite.js
   העפיפון של החבר (שלב בפיתוח, 2026-11-24): החבר עומד מתחת לעץ – העפיפון שלו נתקע בצמרת והחוט תלוי גבוה מדי.
   "Oh no! My kite!" – הוא מתכופף ומציע את הכתפיים: "Climb on me!" – CLIMB: הנינג'ה עולה על הכתפיים שלו (שניהם מתנדנדים).
   "Pull it!" – PULL: פעם ראשונה העץ רק רועד ("Again!"), בשנייה העפיפון משתחרר ועף. החבר תופס את החוט, "Thanks, buddy!",
   ורץ קדימה עם העפיפון בשמיים. בלי פגיעות ובלי לבבות. אחרי שתיקה המשחק אומר את המילה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const KI = { e0: 12, fr: 21, tree: 33, w: 70, sh: -11.2, hint: 3.5, hintEvery: 5, coins: 4, walkV: 15, pulls: 2 };
const KI_CHIP = { climb: 'CLIMB', pull: 'PULL' };
const KI_LINES = { oh: 'Oh no! My kite!', climb: 'Climb on me!', pull: 'Pull it!', again: 'Again!', thanks: 'Thanks, buddy!' };
let kiS = null;
const kiE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const kiL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function kiNX() { return PLAYER.x + 4; }
function kiSetup(o) { o.w = KI.w; }
function kiStart(o) {
  kiS = { o, p: 'oh', t: 0, idle: 0, hinted: 0, held: null, pulls: 0, nx: KI.e0, ny: 0, fx: KI.fr, line: null, lineT: 0, kite: { x: KI.tree + 5, y: -47, free: 0, vx: 0, vy: 0 }, shake: 9, chipOk: 0, chipW: null };
  kiSay('oh');
}
function kiP(p) { const S = kiS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }
function kiSay(k) { const S = kiS; S.line = KI_LINES[k]; S.lineT = 0; speak('friend: ' + KI_LINES[k].toLowerCase()); }

/* ---------- העדכון ---------- */
function kiUpdate(dt, pb) {
  if (!kiS) {
    const o = obstacles.find(o => o.type === 'kite' && !o.passed && kiNX() >= o.x + KI.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    kiStart(o); return;
  }
  const S = kiS, o = S.o; S.t += dt; S.lineT += dt; S.shake += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { kiS = null; return; }
  const demo = state !== 'play';
  if (demo) { const w = (kiExpected() || [])[0]; if (w && S.t > 0.8) { command(w, 'demo'); speak(w); } }
  switch (S.p) {
    case 'oh': if (S.t >= 1.8) { kiP('offer'); kiSay('climb'); } break;          // מצביע על העפיפון – ואז מתכופף ומציע כתפיים
    case 'offer': if (S.held === 'climb' && S.t > 0.4) { S.held = null; kiP('climbing'); sfx('swish'); } break;
    case 'climbing': {                                                           // קפיצה בקשת אל הכתפיים
      const k = kiE(S.t / 0.7);
      S.nx = kiL(KI.e0, KI.fr - 0.3, k); S.ny = kiL(0, KI.sh, k) - Math.sin(k * Math.PI) * 5;
      if (S.t >= 0.7) { S.nx = KI.fr - 0.3; S.ny = KI.sh; kiP('up'); sfx('land'); }
      break;
    }
    case 'up': if (S.t >= 0.8 && !S.saidPull) { S.saidPull = 1; kiSay('pull'); kiP('pullWait'); } break;
    case 'pullWait': if (S.held === 'pull') { S.held = null; kiPull(); } break;
    case 'pulling':
      if (S.t >= 0.25 && !S.tug) { S.tug = 1; S.shake = 0; sfx('swish'); if (S.pulls >= KI.pulls) { const K = S.kite; K.free = 1; K.vx = -6; K.vy = -14; sfx('pop'); } }
      if (S.t >= 0.9) {
        if (S.pulls < KI.pulls) { kiP('pullWait'); kiSay('again'); }
        else kiP('down');
      }
      break;
    case 'down': {                                                               // קופץ למטה קדימה, החבר מקבל את החוט
      const k = kiE(S.t / 0.6);
      S.nx = kiL(KI.fr - 0.3, KI.fr + 7, k); S.ny = kiL(KI.sh, 0, k) - Math.sin(k * Math.PI) * 4;
      if (S.t >= 0.6 && !S.landed) { S.landed = 1; S.nx = KI.fr + 7; S.ny = 0; sfx('land'); kiSay('thanks'); }
      if (S.t >= 2.0) kiP('exit');
      break;
    }
    case 'exit': {                                                               // החבר רץ קדימה עם העפיפון, הנינג'ה אחריו
      S.fx += KI.walkV * 1.35 * dt; S.nx += KI.walkV * dt;
      const over = o.x + S.nx - kiNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + S.fx > viewR() + 20 && o.x + KI.tree < -30 || S.t > 10) {
        cleared(o); kiS = null;
        if (mode === 'journey' && state === 'play') { picked += KI.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + KI.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  // העפיפון: תקוע בצמרת עד שמשתחרר – אז עולה ומרחף, ובסוף צמוד לחבר
  const K = S.kite;
  if (K.free) {
    const tx = S.fx + 6, ty = -52;
    K.vx += (tx - K.x) * 3 * dt; K.vy += (ty - K.y) * 3 * dt; K.vx *= Math.pow(0.25, dt); K.vy *= Math.pow(0.25, dt);
    K.x += K.vx * dt; K.y += K.vy * dt;
  }
  const want = (kiExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > KI.hint + S.hinted * KI.hintEvery) { S.hinted++; speak(want); }
  }
}
function kiPull() { const S = kiS; S.pulls++; S.tug = 0; kiP('pulling'); }
function kiPhysics() { if (!kiS) return false; vy = 0; py = 0; return true; }
function kiSpeed() { return kiS ? 0 : null; }

/* ---------- פקודות ---------- */
function kiCmd(word) {
  if (!kiS || !['climb', 'pull'].includes(word)) return false;
  const S = kiS;
  if (word === 'climb' && (S.p === 'offer' || S.p === 'oh')) { if (S.p === 'offer' && S.t > 0.4) { kiP('climbing'); sfx('swish'); } else S.held = 'climb'; kiChipOk('climb'); }
  else if (word === 'pull') {
    if (S.p === 'pullWait') { kiChipOk('pull'); kiPull(); }
    else if (S.p === 'up' || (S.p === 'pulling' && S.t > 0.5 && S.pulls < KI.pulls)) { S.held = 'pull'; kiChipOk('pull'); }
  }
  return true;
}
function kiChipOk(w) { kiS.chipOk = 1.1; kiS.chipW = w; }
function kiExpected() { const S = kiS; if (!S) return null; return S.p === 'offer' ? ['climb'] : S.p === 'pullWait' ? ['pull'] : []; }
function kiAuto() { const S = kiS; if (!S) return; const w = (kiExpected() || [])[0]; if (w && S.idle > 0.7) command(w, 'auto'); }
function kiTap() { return kiS ? (kiExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function kiKite(x, y, rot, t) {                                                 // עפיפון מעוין צהוב-אדום עם זנב פרפרים
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(2.9, -0.6); ctx.lineTo(0, 4.4); ctx.lineTo(-2.9, -0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(2.9, -0.6); ctx.lineTo(0, -0.6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 4.4); ctx.lineTo(-2.9, -0.6); ctx.lineTo(0, -0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,53,15,.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(0, 4.4); ctx.moveTo(-2.9, -0.6); ctx.lineTo(2.9, -0.6); ctx.stroke();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(0, 4.4);
  for (let k = 1; k <= 6; k++) ctx.lineTo(Math.sin(t * 5 + k) * 0.9 - k * 0.3, 4.4 + k * 1.3); ctx.stroke();
  for (let k = 2; k <= 6; k += 2) { const bx = Math.sin(t * 5 + k) * 0.9 - k * 0.3, by = 4.4 + k * 1.3; ctx.fillStyle = k === 4 ? '#3b82f6' : '#ef4444';
    ctx.beginPath(); ctx.moveTo(bx - 0.8, by - 0.5); ctx.lineTo(bx + 0.8, by + 0.5); ctx.lineTo(bx + 0.8, by - 0.5); ctx.lineTo(bx - 0.8, by + 0.5); ctx.fill(); }
  ctx.restore();
}
function kiTree(tx, wob) {                                                       // עץ גבוה עם צמרת עגולה (בלי קו מתאר)
  const g = GROUND;
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(tx, g + 0.4, 15, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7c5a3a';
  ctx.beginPath(); ctx.moveTo(tx - 3, g); ctx.quadraticCurveTo(tx - 1.6, g - 5, tx - 1.6, g - 14); ctx.lineTo(tx - 1.3, g - 31); ctx.lineTo(tx + 1.4, g - 31); ctx.lineTo(tx + 1.7, g - 14); ctx.quadraticCurveTo(tx + 1.7, g - 5, tx + 3.2, g); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#654630'; ctx.beginPath(); ctx.moveTo(tx + 0.5, g); ctx.quadraticCurveTo(tx + 1, g - 8, tx + 0.8, g - 31); ctx.lineTo(tx + 1.4, g - 31); ctx.lineTo(tx + 1.7, g - 14); ctx.quadraticCurveTo(tx + 1.7, g - 5, tx + 3.2, g); ctx.fill();
  ctx.save(); ctx.translate(tx, g - 28); ctx.rotate(wob); ctx.translate(-tx, -(g - 28));
  ctx.strokeStyle = '#7c5a3a'; ctx.lineCap = 'round'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(tx, g - 27); ctx.quadraticCurveTo(tx - 5, g - 31, tx - 10, g - 32); ctx.moveTo(tx, g - 29); ctx.quadraticCurveTo(tx + 4, g - 35, tx + 8, g - 38); ctx.stroke();
  const blobs = [[-9, -36, 8, 6], [9, -38, 8.5, 6.5], [0, -45, 11, 8], [-5, -51, 7, 5], [7, -50, 7.5, 5.5], [-1, -35, 8, 5]];
  ctx.fillStyle = '#2f6b2a'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx, g + by + 0.8, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3f8a35'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 0.5, g + by - 0.4, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#5aa845'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 1.4, g + by - 1.6, rx * 0.5, ry * 0.42, -0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawKiteScene(o) {
  const S = kiS && kiS.o === o ? kiS : null, now = performance.now() / 1000;
  const wob = S && S.shake < 0.8 ? Math.sin(S.shake * 30) * 0.05 * (1 - S.shake / 0.8) : 0;
  kiTree(o.x + KI.tree, wob);
  const K = S ? S.kite : { x: KI.tree + 5, y: -47, free: 0 };
  const kx = o.x + K.x + (K.free ? 0 : wob * 20), ky = GROUND + K.y;
  // החוט: תקוע – תלוי עד מעל החבר; חופשי – אל היד של החבר
  let ex, ey;
  if (!K.free) { const tug = S && S.p === 'pulling' && S.t < 0.5 ? Math.sin(S.t / 0.5 * Math.PI) * 2.5 : 0; ex = o.x + KI.fr + 0.5; ey = GROUND - 25 + tug; }
  else if (S && S.fHand) { ex = S.fHand[0]; ey = S.fHand[1]; } else { ex = kx; ey = ky + 6; }
  if (S && S.p === 'pulling' && !K.free && S.nHand) { ex = S.nHand[0]; ey = S.nHand[1]; }
  else if (S && S.p === 'pullWait' && S.nHand && S.pulls > 0) { ex = S.nHand[0]; ey = S.nHand[1]; }
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(kx, ky + 4.4);
  ctx.quadraticCurveTo((kx + ex) / 2 + (K.free ? 4 : 0), (ky + ey) / 2 + (K.free ? 5 : 2), ex, ey); ctx.stroke();
  kiKite(kx, ky, K.free ? Math.sin(now * 2) * 0.15 : 0.5 + wob * 3, now);
}
function drawKiteFront(o) {
  const S = kiS && kiS.o === o ? kiS : null; if (!S) return;
  if (S.line && S.lineT < 2.6) drawBubble(S.line, o.x + S.fx + 3, GROUND - (S.p === 'up' || S.p === 'pullWait' || S.p === 'pulling' ? 14.5 : 18), { age: S.lineT, tail: -1, color: '#1d4ed8', size: 3.6 });
  kiDrawChip();
}
function kiDrawChip() {
  const S = kiS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (kiExpected() || [])[0];
  if (!w) return;
  const txt = KI_CHIP[w] || w.toUpperCase(), y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}

/* ---------- הדמויות ---------- */
function kiFriendPose(S, now) {
  const P = poseIdle(now + 0.4), t = S.t;
  if (S.p === 'oh') { P.arms = [P.arms[0], [2.6 + Math.sin(now * 3) * 0.1, 2.9]]; P.headTilt = -0.35; return P; }        // מצביע למעלה על העפיפון
  if (S.p === 'offer' || (S.p === 'climbing' && t < 0.45)) {                                                            // מתכופף, ידיים משולבות קדימה-נמוך
    const k = kiE((S.p === 'offer' ? t : 1) / 0.35);
    return Object.assign(P, { hipY: kiL(P.hipY, -3.3, k), lean: kiL(0, 0.35, k), legs: [[kiL(-0.1, -0.6, k), kiL(-0.1, -1.6, k)], [kiL(0.1, 0.9, k), kiL(0.1, -0.3, k)]], arms: [[kiL(0.3, 0.9, k), kiL(0.5, 1.6, k)], [kiL(0.3, 0.9, k), kiL(0.5, 1.6, k)]], headTilt: -0.15 });
  }
  if (['climbing', 'up', 'pullWait', 'pulling'].includes(S.p) || (S.p === 'down' && t < 0.3)) {                         // מחזיק את הנינג'ה על הכתפיים, מתנדנד
    const sw = Math.sin(now * 5) * 0.06 + (S.p === 'pulling' && t < 0.5 ? Math.sin(t / 0.5 * Math.PI) * 0.12 : 0);
    return Object.assign(P, { hipY: -4.3, lean: sw, legs: [[-0.3, -0.5], [0.3, 0.05]], arms: [[2.75, 3.3], [2.85, 3.4]], headTilt: 0.12, eyes: 'squint' });
  }
  if (S.p === 'down') { P.arms = [P.arms[0], [2.4, 2.6]]; P.headTilt = -0.25; return P; }                             // מחזיק את החוט, מביט בעפיפון
  if (S.p === 'exit') { const R = poseRun(S.fx * 0.5); R.arms = [R.arms[0], [2.4, 2.6]]; return R; }
  return P;
}
function kiNinjaPose(S, now) {
  const P = poseIdle(now), t = S.t;
  if (S.p === 'exit') return poseRun(S.nx * 0.55);
  if (S.p === 'climbing' || S.p === 'down') return poseAir(now);
  if (S.p === 'up' || S.p === 'pullWait') {                                                                             // על הכתפיים, יד מושטת אל החוט
    P.arms = [[0.5 + Math.sin(now * 5) * 0.2, 0.7], [3.0, 3.05]]; P.headTilt = -0.3; P.lean = Math.sin(now * 5) * 0.05; P.legs = [[-0.15, -0.2], [0.15, 0.1]]; return P;
  }
  if (S.p === 'pulling') {
    const k = t < 0.25 ? kiE(t / 0.25) : 1 - kiE((t - 0.25) / 0.6) * 0.5;
    P.arms = [[2.5, 2.7], [kiL(3.0, 2.3, k), kiL(3.05, 2.6, k)]]; P.lean = -0.12 * k; P.eyes = 'squint'; P.headTilt = -0.2; P.legs = [[-0.15, -0.2], [0.15, 0.1]]; return P;
  }
  if (S.p === 'oh' || S.p === 'offer') { P.headTilt = -0.25; }
  return P;
}
function kiDrawNinja() {
  const S = kiS; if (!S) return false;
  const now = performance.now() / 1000, o = S.o;
  // החבר מאחור
  const ffx = o.x + S.fx, FP = kiFriendPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
  drawFriend({ fx: ffx, fy: GROUND, pose: FP, facing: S.p === 'offer' || S.p === 'climbing' ? -1 : 1 });
  S.fHand = figHand(ffx, GROUND, 1, FRIEND.scale, FP, 1);
  // הנינג'ה
  const fx = o.x + S.nx, fy = GROUND + S.ny, P = kiNinjaPose(S, now);
  if (S.ny > -0.5) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1); S.nHand = playerHand;
  return true;
}

sceneAdd({
  type: 'kite', word: 'kite', label: true,
  listen: ['climb', 'pull'],
  active: () => !!kiS,
  reset: () => { kiS = null; },
  setup: kiSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + KI.e0 + PLAYER.w / 2,
  draw: drawKiteScene, drawFront: drawKiteFront, drawNinja: kiDrawNinja,
  update: kiUpdate, physics: kiPhysics, speed: kiSpeed,
  expected: kiExpected, cmd: kiCmd, auto: kiAuto, tap: kiTap,
  intro: { banner: 'CLIMB · PULL!', time: 15,
           demo: () => { const o = { type: 'kite' }; kiSetup(o); o.x = kiNX() - KI.e0; obstacles.push(o); } }
});
