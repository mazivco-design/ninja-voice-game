/* ninja-voice-game – kite.js
   העפיפון של החבר (שלב בפיתוח, 2026-11-24): החבר עומד מתחת לעץ גבוה ומביט למעלה – רואים אותו כבר כשמתקרבים.
   העפיפון שלו תקוע בתחתית הצמרת והחוט תלוי גבוה מדי. "Oh no! My kite!" – "Take the stick!" – PICK UP: הנינג'ה מרים מקל.
   "Climb on me!" – CLIMB: עולה על הכתפיים של החבר. "Push it!" – PUSH: דוחף את העפיפון עם המקל. בפעם הראשונה הוא רק רועד ("Again!"),
   בשנייה משתחרר ועף. הנינג'ה קופץ למטה, "Thanks, buddy!", והחבר רץ קדימה עם העפיפון בשמיים. בלי פגיעות ובלי לבבות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const KI = { e0: 12, stick: 15.5, fr: 22, tree: 35, kx: 28, ky: -45, w: 72, sh: -11.2, stickL: 16, hint: 3.5, hintEvery: 5, coins: 4, walkV: 15, pushes: 2 };
const KI_CHIP = { 'pick up': 'PICK UP', climb: 'CLIMB', push: 'PUSH' };
const KI_LINES = { oh: 'Oh no! My kite!', stick: 'Take the stick!', climb: 'Climb on me!', push: 'Push it!', again: 'Again!', thanks: 'Thanks, buddy!' };
let kiS = null;
const kiE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const kiL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function kiNX() { return PLAYER.x + 4; }
function kiSetup(o) { o.w = KI.w; }
function kiStart(o) {
  kiS = { o, p: 'oh', t: 0, idle: 0, hinted: 0, held: null, pushes: 0, nx: KI.e0, ny: 0, fx: KI.fr, has: 0, line: null, lineT: 0,
          kite: { x: KI.kx, y: KI.ky, free: 0, vx: 0, vy: 0 }, shake: 9, chipOk: 0, chipW: null };
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
    case 'oh': if (S.t >= 1.8) { kiP('stickWait'); kiSay('stick'); } break;      // מצביע על העפיפון – ואז על המקל
    case 'stickWait': if (S.held === 'pick up' && S.t > 0.3) { S.held = null; kiP('picking'); sfx('pop'); } break;
    case 'picking': if (S.t >= 0.35 && !S.has) S.has = 1; if (S.t >= 0.8) { kiP('offer'); kiSay('climb'); } break;
    case 'offer': if (S.held === 'climb' && S.t > 0.4) { S.held = null; kiP('climbing'); sfx('swish'); } break;
    case 'climbing': {                                                           // קפיצה בקשת אל הכתפיים
      const k = kiE(S.t / 0.7);
      S.nx = kiL(KI.e0, KI.fr - 0.3, k); S.ny = kiL(0, KI.sh, k) - Math.sin(k * Math.PI) * 5;
      if (S.t >= 0.7) { S.nx = KI.fr - 0.3; S.ny = KI.sh; kiP('up'); sfx('land'); }
      break;
    }
    case 'up': if (S.t >= 0.7) { kiSay('push'); kiP('pushWait'); } break;
    case 'pushWait': if (S.held === 'push') { S.held = null; kiPush(); } break;
    case 'pushing':
      if (S.t >= 0.22 && !S.poked) { S.poked = 1; S.shake = 0; sfx('thud'); if (S.pushes >= KI.pushes) { const K = S.kite; K.free = 1; K.vx = 4; K.vy = -16; sfx('pop'); } }
      if (S.t >= 0.9) { if (S.pushes < KI.pushes) { kiP('pushWait'); kiSay('again'); } else kiP('down'); }
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
  const K = S.kite;                                                              // משוחרר – עולה ומרחף מעל החבר
  if (K.free) {
    const tx = S.fx + 7, ty = -56;
    K.vx += (tx - K.x) * 3 * dt; K.vy += (ty - K.y) * 3 * dt; K.vx *= Math.pow(0.25, dt); K.vy *= Math.pow(0.25, dt);
    K.x += K.vx * dt; K.y += K.vy * dt;
  }
  const want = (kiExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > KI.hint + S.hinted * KI.hintEvery) { S.hinted++; speak(want); }
  }
}
function kiPush() { const S = kiS; S.pushes++; S.poked = 0; kiP('pushing'); }
function kiPhysics() { if (!kiS) return false; vy = 0; py = 0; return true; }
function kiSpeed() { return kiS ? 0 : null; }

/* ---------- פקודות ---------- */
function kiCmd(word) {
  if (!kiS || !['pick up', 'climb', 'push'].includes(word)) return false;
  const S = kiS;
  if (word === 'pick up' && (S.p === 'stickWait' || S.p === 'oh')) { S.held = 'pick up'; kiChipOk('pick up'); }
  else if (word === 'climb' && (S.p === 'offer' || S.p === 'picking')) { S.held = 'climb'; kiChipOk('climb'); }
  else if (word === 'push') {
    if (S.p === 'pushWait') { kiChipOk('push'); kiPush(); }
    else if (S.p === 'up' || (S.p === 'pushing' && S.t > 0.5 && S.pushes < KI.pushes)) { S.held = 'push'; kiChipOk('push'); }
  }
  return true;
}
function kiChipOk(w) { kiS.chipOk = 1.1; kiS.chipW = w; }
function kiExpected() { const S = kiS; if (!S) return null; return S.p === 'stickWait' ? ['pick up'] : S.p === 'offer' ? ['climb'] : S.p === 'pushWait' ? ['push'] : []; }
function kiAuto() { const S = kiS; if (!S) return; const w = (kiExpected() || [])[0]; if (w && S.idle > 0.7) command(w, 'auto'); }
function kiTap() { return kiS ? (kiExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
const KI_TIP = 4.4;                                                              // הקצה התחתון של העפיפון – משם יוצא החוט
function kiTipPos(x, y, rot) { return [x - Math.sin(rot) * KI_TIP, y + Math.cos(rot) * KI_TIP]; }
function kiKite(x, y, rot, t) {                                                 // עפיפון מעוין צהוב-אדום עם זנב פרפרים
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(2.9, -0.6); ctx.lineTo(0, KI_TIP); ctx.lineTo(-2.9, -0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(2.9, -0.6); ctx.lineTo(0, -0.6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, KI_TIP); ctx.lineTo(-2.9, -0.6); ctx.lineTo(0, -0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,53,15,.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(0, -4.2); ctx.lineTo(0, KI_TIP); ctx.moveTo(-2.9, -0.6); ctx.lineTo(2.9, -0.6); ctx.stroke();
  // הזנב יוצא מהקצה העליון, כדי שלא יתבלבל עם החוט
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(0, -4.2);
  for (let k = 1; k <= 6; k++) ctx.lineTo(Math.sin(t * 5 + k) * 0.9 + k * 1.1, -4.2 - k * 0.6 + k * k * 0.12); ctx.stroke();
  for (let k = 2; k <= 6; k += 2) { const bx = Math.sin(t * 5 + k) * 0.9 + k * 1.1, by = -4.2 - k * 0.6 + k * k * 0.12; ctx.fillStyle = k === 4 ? '#3b82f6' : '#ef4444';
    ctx.beginPath(); ctx.moveTo(bx - 0.5, by - 0.8); ctx.lineTo(bx + 0.5, by + 0.8); ctx.lineTo(bx - 0.5, by + 0.8); ctx.lineTo(bx + 0.5, by - 0.8); ctx.fill(); }
  ctx.restore();
}
function kiString(x0, y0, x1, y1, sag, sway) {                                  // חוט רך עם שקיעה וקצת נדנוד
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 0.32; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3 + sway, y0 + (y1 - y0) * 0.3 + sag, x0 + (x1 - x0) * 0.7 - sway * 0.6, y0 + (y1 - y0) * 0.7 + sag, x1, y1);
  ctx.stroke();
}
function kiTree(tx, wob) {                                                       // עץ גבוה עם צמרת רחבה (בלי קו מתאר)
  const g = GROUND;
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(tx, g + 0.4, 16, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7c5a3a';
  ctx.beginPath(); ctx.moveTo(tx - 3.4, g); ctx.quadraticCurveTo(tx - 1.8, g - 5, tx - 1.8, g - 16); ctx.lineTo(tx - 1.4, g - 44); ctx.lineTo(tx + 1.5, g - 44); ctx.lineTo(tx + 1.9, g - 16); ctx.quadraticCurveTo(tx + 1.9, g - 5, tx + 3.6, g); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#654630'; ctx.beginPath(); ctx.moveTo(tx + 0.6, g); ctx.quadraticCurveTo(tx + 1.1, g - 10, tx + 0.9, g - 44); ctx.lineTo(tx + 1.5, g - 44); ctx.lineTo(tx + 1.9, g - 16); ctx.quadraticCurveTo(tx + 1.9, g - 5, tx + 3.6, g); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,25,.45)'; ctx.lineWidth = 0.35;
  for (const [y0, y1, dx] of [[g - 4, g - 10, -0.7], [g - 14, g - 21, 0.5], [g - 27, g - 33, -0.3]]) { ctx.beginPath(); ctx.moveTo(tx + dx, y0); ctx.quadraticCurveTo(tx + dx + 0.4, (y0 + y1) / 2, tx + dx, y1); ctx.stroke(); }
  ctx.save(); ctx.translate(tx, g - 40); ctx.rotate(wob); ctx.translate(-tx, -(g - 40));
  ctx.strokeStyle = '#7c5a3a'; ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(tx, g - 40); ctx.quadraticCurveTo(tx - 4, g - 43, tx - 9, g - 45); ctx.moveTo(tx, g - 42); ctx.quadraticCurveTo(tx + 4, g - 48, tx + 9, g - 50); ctx.stroke();
  const blobs = [[-10, -50, 8.5, 6], [10, -52, 9, 6.5], [0, -58, 12, 8.5], [-6, -64, 7.5, 5], [7, -63, 8, 5.5], [-1, -49, 8.5, 5]];
  ctx.fillStyle = '#2f6b2a'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx, g + by + 0.8, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3f8a35'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 0.5, g + by - 0.4, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#5aa845'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 1.4, g + by - 1.6, rx * 0.5, ry * 0.42, -0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function kiStick(x0, y0, ang, len) {                                            // מקל עץ עם ענף קטן
  const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
  ctx.strokeStyle = '#8b5e34'; ctx.lineWidth = 0.75; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#a97142'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(x0 + Math.cos(ang) * len * 0.15, y0 + Math.sin(ang) * len * 0.15 - 0.15); ctx.lineTo(x1, y1 - 0.15); ctx.stroke();
  const mx = x0 + Math.cos(ang) * len * 0.55, my = y0 + Math.sin(ang) * len * 0.55;
  ctx.strokeStyle = '#8b5e34'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(ang - 0.6) * 1.4, my + Math.sin(ang - 0.6) * 1.4); ctx.stroke();
  return [x1, y1];
}
function drawKiteScene(o) {
  const S = kiS && kiS.o === o ? kiS : null, now = performance.now() / 1000;
  const wob = S && S.shake < 0.8 ? Math.sin(S.shake * 30) * 0.05 * (1 - S.shake / 0.8) : 0;
  kiTree(o.x + KI.tree, wob);
  if (!S || !S.has) kiStick(o.x + KI.stick - KI.stickL * 0.45, GROUND - 0.5, -0.03, KI.stickL * 0.9);   // המקל על הקרקע
  const K = S ? S.kite : { x: KI.kx, y: KI.ky, free: 0 };
  const shk = K.free ? 0 : wob * 16 + (S && S.p === 'pushing' && S.t > 0.2 && S.t < 0.6 ? Math.sin(S.t * 40) * 0.6 : 0);
  const kx = o.x + K.x + shk, ky = GROUND + K.y, rot = K.free ? Math.sin(now * 2) * 0.15 - 0.2 : 0.45 + shk * 0.1;
  const tip = kiTipPos(kx, ky, rot), sway = Math.sin(now * 1.7) * 1.2;
  if (!K.free) kiString(tip[0], tip[1], tip[0] - 2 + sway * 0.8, GROUND - 31, 1.5, sway);    // החוט תלוי מהקצה – גבוה מדי
  else { const h = S && S.fHand ? S.fHand : [kx, GROUND - 10]; kiString(tip[0], tip[1], h[0], h[1], 6, sway * 0.5); }
  kiKite(kx, ky, rot, now);
  if (!S) {                                                                      // החבר כבר שם כשמתקרבים: מביט למעלה ומצביע
    const P = poseIdle(now + 0.4); P.arms = [P.arms[0], [2.6 + Math.sin(now * 3) * 0.1, 2.9]]; P.headTilt = -0.35;
    const ffx = o.x + KI.fr;
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
    drawFriend({ fx: ffx, fy: GROUND, pose: P, facing: 1 });
  }
}
function drawKiteFront(o) {
  const S = kiS && kiS.o === o ? kiS : null; if (!S) return;
  const high = ['up', 'pushWait', 'pushing'].includes(S.p);
  if (S.line && S.lineT < 2.6) drawBubble(S.line, o.x + S.fx + (high ? 5 : 3), GROUND - (high ? 14.5 : 18), { age: S.lineT, tail: -1, color: '#1d4ed8', size: 3.6 });
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
  if (S.p === 'stickWait') { P.arms = [P.arms[0], [0.75, 0.85]]; P.headTilt = 0.25; return P; }                      // מצביע על המקל שעל הקרקע
  if (S.p === 'picking') return P;
  if (S.p === 'offer' || (S.p === 'climbing' && t < 0.45)) {                                                            // מתכופף, ידיים משולבות קדימה-נמוך
    const k = kiE((S.p === 'offer' ? t : 1) / 0.35);
    return Object.assign(P, { hipY: kiL(P.hipY, -3.3, k), lean: kiL(0, 0.35, k), legs: [[kiL(-0.1, -0.6, k), kiL(-0.1, -1.6, k)], [kiL(0.1, 0.9, k), kiL(0.1, -0.3, k)]], arms: [[kiL(0.3, 0.9, k), kiL(0.5, 1.6, k)], [kiL(0.3, 0.9, k), kiL(0.5, 1.6, k)]], headTilt: -0.15 });
  }
  if (['climbing', 'up', 'pushWait', 'pushing'].includes(S.p) || (S.p === 'down' && t < 0.3)) {                         // מחזיק את הנינג'ה על הכתפיים, מתנדנד
    const sw = Math.sin(now * 5) * 0.06 + (S.p === 'pushing' && t < 0.5 ? Math.sin(t / 0.5 * Math.PI) * 0.1 : 0);
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
  if (S.p === 'picking') {                                                                                              // מתכופף אל המקל וקם
    const k = t < 0.35 ? kiE(t / 0.25) : 1 - kiE((t - 0.35) / 0.3);
    return Object.assign(P, { hipY: kiL(-4.6, -3.4, k), lean: kiL(0.05, 0.55, k), spine: 0.25 * k, legs: [[kiL(-0.15, -0.5, k), kiL(-0.1, -2.0, k)], [kiL(0.18, 1.35, k), kiL(0.12, -0.1, k)]], arms: [[0.6 * k, 0.9 * k], [kiL(0.35, 0.7, k), kiL(0.55, 0.9, k)]] });
  }
  if (['up', 'pushWait', 'pushing'].includes(S.p)) {                                                                    // על הכתפיים, המקל מכוון אל העפיפון
    const jab = S.p === 'pushing' ? (S.t < 0.22 ? kiE(S.t / 0.22) : 1 - kiE((S.t - 0.22) / 0.4)) : 0;
    P.arms = [[2.2 + jab * 0.3, 2.5], [kiL(2.35, 2.75, jab), kiL(2.5, 2.85, jab)]]; P.headTilt = -0.35; P.lean = Math.sin(now * 5) * 0.04 + jab * 0.08; P.legs = [[-0.15, -0.2], [0.15, 0.1]];
    if (S.p === 'pushing') P.eyes = 'squint';
    return P;
  }
  if (S.has) P.arms = [P.arms[0], [0.55, 1.1]];                                                                        // מחזיק את המקל
  if (S.p === 'oh' || S.p === 'stickWait' || S.p === 'offer') P.headTilt = S.p === 'stickWait' ? 0.2 : -0.25;
  return P;
}
function kiDrawNinja() {
  const S = kiS; if (!S) return false;
  const now = performance.now() / 1000, o = S.o;
  const ffx = o.x + S.fx, FP = kiFriendPose(S, now);                            // החבר מאחור
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
  drawFriend({ fx: ffx, fy: GROUND, pose: FP, facing: S.p === 'offer' || S.p === 'climbing' ? -1 : 1 });
  S.fHand = figHand(ffx, GROUND, 1, FRIEND.scale, FP, 1);
  const fx = o.x + S.nx, fy = GROUND + S.ny, P = kiNinjaPose(S, now);
  if (S.ny > -0.5) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  const h = playerHand = figHand(fx, fy, 1, 1, P, 1);
  if (S.has && S.p !== 'exit' && !(S.p === 'down' && S.t > 0.6)) {
    let ang = -1.15, len = KI.stickL, back = 4;
    if (['up', 'pushWait', 'pushing'].includes(S.p)) {                          // מכוון אל העפיפון; בדחיפה – נוגע בו
      const K = S.kite, tx = o.x + K.x, ty = GROUND + K.y + 1.5;
      ang = Math.atan2(ty - h[1], tx - h[0]);
      const d = Math.hypot(tx - h[0], ty - h[1]), jab = S.p === 'pushing' ? (S.t < 0.22 ? kiE(S.t / 0.22) : 1 - kiE((S.t - 0.22) / 0.4)) : 0;
      len = Math.min(KI.stickL + back, d - 2.2 + jab * 2.6 + back);
    } else if (S.p === 'picking' && S.t < 0.35) { ang = -0.05; back = KI.stickL * 0.45; }
    kiStick(h[0] - Math.cos(ang) * back, h[1] - Math.sin(ang) * back, ang, len);
  }
  if (S.p === 'down' && S.t > 0.6) kiStick(o.x + KI.fr + 9, GROUND - 0.5, Math.PI - 0.03, KI.stickL * 0.9);   // הניח את המקל
  return true;
}

sceneAdd({
  type: 'kite', word: 'kite', label: true,
  listen: ['pick up', 'climb', 'push'],
  active: () => !!kiS,
  reset: () => { kiS = null; },
  setup: kiSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + KI.e0 + PLAYER.w / 2,
  draw: drawKiteScene, drawFront: drawKiteFront, drawNinja: kiDrawNinja,
  update: kiUpdate, physics: kiPhysics, speed: kiSpeed,
  expected: kiExpected, cmd: kiCmd, auto: kiAuto, tap: kiTap,
  intro: { banner: 'PICK UP · CLIMB · PUSH!', time: 18,
           demo: () => { const o = { type: 'kite' }; kiSetup(o); o.x = kiNX() - KI.e0; obstacles.push(o); } }
});
