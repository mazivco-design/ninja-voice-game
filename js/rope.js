/* ninja-voice-game – rope.js
   LET GO: תהום עם חבל שמתנדנד מעל. הנינג'ה נעצר בקצה, אומרים CATCH כשהחבל מתקרב – נתלה ומתנדנד לצד השני,
   ואומרים LET GO בצד הרחוק – נוחת. LET GO מוקדם מדי = נופל לתהום. שתיקה = החבל ממשיך להתנדנד בסבלנות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let rope = null;    // { o, phase: 'wait' | 'hang' | 'land' | 'fall' | 'done', t, theta, grabWant, bubble }
const ROPE = { len: 40, amp: 0.95, period: 2.8, anchorH: 42, want: 1.5, nearAt: 0.7, farAt: 0.55, stopAt: 3 };
const CHASM = { w: 52 };

function ropeAnchor(o) { return [o.x + o.w / 2, GROUND - ROPE.anchorH]; }
function ropeEnd(o, th) { const [ax, ay] = ropeAnchor(o); return [ax + Math.sin(th) * ROPE.len, ay + Math.cos(th) * ROPE.len]; }
function ropeTheta(t) { return ROPE.amp * Math.cos(2 * Math.PI * t / ROPE.period); }   // t=0: בצד הרחוק, חצי מחזור: בצד שלנו

function ropeUpdate(dt, pb) {
  if (!rope) {
    const c = obstacles.find(o => o.type === 'chasm' && !o.passed && !o.hit && o.x - pb.r <= ROPE.stopAt && o.x > pb.l);
    if (c) { rope = { o: c, phase: 'wait', t: 0, theta: ROPE.amp, grabWant: 0 }; duckT = 0; }
    return;
  }
  const r = rope; r.t += dt; r.theta = ropeTheta(r.t);
  if (!obstacles.includes(r.o)) { rope = null; return; }
  if (r.phase === 'wait') {                                      // מחכים ל-CATCH כשהחבל קרוב
    if (r.grabWant > 0) { r.grabWant -= dt; if (r.theta <= -ROPE.amp * ROPE.nearAt) { r.phase = 'hang'; r.grabWant = 0; sfx('coin'); } }
  } else if (r.phase === 'land') {                               // שוחרר בצד הרחוק – העולם "קופץ" כך שהקצה הרחוק מתחת לנינג'ה
    if (r.t > 0.25) { ropeShift(r.o); r.o.unlocked = true; cleared(r.o); r.phase = 'done'; r.t = 0; }
  } else if (r.phase === 'fall') {                               // נפל לתהום – אחרי האנימציה ממשיכים מהצד הרחוק
    if (sinkT <= 0) { ropeShift(r.o); r.o.unlocked = true; r.phase = 'done'; r.t = 0; }
  } else if (r.phase === 'done' && r.t > 0.4) rope = null;
}
function ropeShift(o) {                                          // מזיזים את כל העולם כך שהקצה הרחוק של התהום נמצא מאחורי הנינג'ה
  const shift = (o.x + o.w) - (PLAYER.x - 1);
  for (const ob of obstacles) { ob.x -= shift; if (ob.rx !== undefined) ob.rx -= shift; }
  for (const p of pickups) p.x -= shift;
  bgX += shift; distSinceSpawn += shift;
}
function ropeCatch() {                                           // CATCH: תופסים את החבל כשהוא מגיע (או בחצי שנייה הקרובה)
  if (!rope || rope.phase !== 'wait') return false;
  rope.grabWant = ROPE.want; return true;
}
function ropeLetGo() {                                           // LET GO: בצד הרחוק – נוחתים. מוקדם מדי – נופלים
  if (!rope || rope.phase !== 'hang') return;
  if (rope.theta >= ROPE.amp * ROPE.farAt) { rope.phase = 'land'; rope.t = 0; py = 0.001; vy = -18; sfx('jump'); }
  else { rope.fallX = ropeEnd(rope.o, rope.theta)[0] - 1; rope.phase = 'fall'; rope.t = 0; onHit(rope.o); sinkT = SINK_TIME; sinkType = 'fall'; }   // נופל מהמקום שבו שחרר
}
function ropeHanging() { return !!rope && rope.phase === 'hang'; }

/* ---------- ציור ---------- */
function drawChasm(o, bottom) {                                  // בור עמוק בקרקע, עם שפות סלעיות
  const x = o.x, w = o.w;
  const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 40);
  g.addColorStop(0, '#3b2a1e'); g.addColorStop(0.5, '#1c1410'); g.addColorStop(1, '#0a0705');
  ctx.fillStyle = g; ctx.fillRect(x, GROUND - 0.5, w, bottom - GROUND + 1);
  ctx.fillStyle = '#57534e';                                                                  // שפות
  for (const [ex, dir] of [[x, 1], [x + w, -1]]) {
    ctx.beginPath(); ctx.moveTo(ex, GROUND - 0.5);
    for (let k = 0; k < 7; k++) ctx.lineTo(ex + dir * (1.5 + hash(k * 3.1 + ex) * 2.5), GROUND + 2 + k * 5.5);
    ctx.lineTo(ex, GROUND + 40); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 3, GROUND - 0.5, 3, 1.2); ctx.fillRect(x + w, GROUND - 0.5, 3, 1.2);
  // מסגרת עץ מעל התהום שהחבל קשור אליה
  const [ax, ay] = ropeAnchor(o);
  ctx.fillStyle = '#78350f'; ctx.fillRect(x - 6, ay, 2.4, GROUND - ay); ctx.fillRect(x + w + 3.6, ay, 2.4, GROUND - ay);   // עמודים
  ctx.fillStyle = '#92400e'; ctx.fillRect(x - 7, ay - 2.2, w + 14, 2.6);                                                  // קורה
  ctx.fillStyle = '#451a03'; ctx.fillRect(x - 7, ay - 0.4, w + 14, 0.8);
  ctx.fillStyle = '#1c1917'; circle(ax, ay, 1.1);                                                                        // הטבעת של החבל
}
function drawRopeSwing(o) {                                      // החבל (וגם הנינג'ה כשהוא תלוי)
  const th = rope && rope.o === o ? rope.theta : ropeTheta(performance.now() / 1000);
  const [ax, ay] = ropeAnchor(o), [ex, ey] = ropeEnd(o, th);
  const segs = 10; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay);
  for (let i = 1; i <= segs; i++) { const k = i / segs, sag = Math.sin(k * Math.PI) * 1.2 * Math.cos(th); ctx.lineTo(ax + (ex - ax) * k + sag, ay + (ey - ay) * k); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.3; ctx.beginPath();                 // פיתולים
  for (let i = 1; i < segs * 3; i++) { const k = i / (segs * 3); const px = ax + (ex - ax) * k, py2 = ay + (ey - ay) * k; ctx.moveTo(px - 0.5, py2 + 0.3); ctx.lineTo(px + 0.5, py2 - 0.3); }
  ctx.stroke();
  ctx.fillStyle = '#854d0e'; circle(ex, ey, 1.6); ctx.fillStyle = '#a16207'; circle(ex, ey, 0.9);   // קשר בקצה
  if (rope && rope.o === o && rope.phase === 'hang') {                                          // הנינג'ה תלוי: ידיים למעלה, רגליים מתנדנדות
    const P = poseIdle(performance.now() / 1000);
    P.arms = [[2.95, 3.05], [2.95, 3.05]]; P.legs = [[-0.25 - th * 0.3, -0.15], [0.2 - th * 0.3, 0.25]]; P.lean = th * 0.45; P.bob = 0; P.eyes = 'squint';
    const hx = ex - Math.sin(th * 0.45) * 13.5, hy = ey + Math.cos(th * 0.45) * 13.5;             // כף הרגל – 13.5 יחידות מתחת לידיים, לאורך קו הגוף
    drawFigure({ fx: hx, fy: hy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  }
  if (rope && rope.o === o && rope.phase === 'wait' && labelsVisible()) label('CATCH', ax, ay - 8, 4, '#fde047', '#1e293b');
  if (rope && rope.o === o && rope.phase === 'hang' && labelsVisible()) label('LET GO', ax, ay - 8, 4, '#fde047', '#1e293b');
}
