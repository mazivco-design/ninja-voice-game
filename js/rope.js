/* ninja-voice-game – rope.js
   LET GO: תהום עם חבל שמתנדנד מעל. הנינג'ה נעצר בקצה, אומרים CATCH כשהחבל מתקרב – נתלה ומתנדנד לצד השני,
   ואומרים LET GO בצד הרחוק – נוחת. LET GO מוקדם מדי = נופל לתהום. שתיקה = החבל ממשיך להתנדנד בסבלנות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let rope = null;    // { o, phase: 'wait' | 'hang' | 'land' | 'fall' | 'done', t, theta, grabWant, bubble }
const ROPE = { len: 40, amp: 0.95, period: 2.8, anchorH: 42, want: 1.5, nearAt: 0.7, farAt: 0.55, stopAt: 3 };
const CHASM = { w: 52, h: 14, slope: 30, top: 8 };   // h = גובה הצוקים, slope = אורך השיפוע, top = משטח שטוח על כל צוק

// גובה הקרקע מעל GROUND בנקודה x – גבעה שעולה לצוק, תהום, צוק שני ויורד חזרה (רק ליד תהום)
function terrainLift(x) {
  for (const o of obstacles) {
    if (o.type !== 'chasm') continue;
    const a = o.x - CHASM.top - CHASM.slope, b = o.x - CHASM.top, c = o.x + o.w + CHASM.top, d = c + CHASM.slope;
    if (x <= a || x >= d) continue;
    const ease = q => q * q * (3 - 2 * q);
    if (x < b) return CHASM.h * ease((x - a) / CHASM.slope);
    if (x > c) return CHASM.h * ease((d - x) / CHASM.slope);
    return CHASM.h;                                              // על הצוקים ומעל התהום
  }
  return 0;
}

function ropeAnchor(o) { return [o.x + o.w / 2, GROUND - CHASM.h - ROPE.anchorH]; }
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
  if (rope.theta >= ROPE.amp * ROPE.farAt) { rope.phase = 'land'; rope.t = 0; sfx('jump'); }
  else { rope.fallX = ropeEnd(rope.o, rope.theta)[0] - 1; rope.phase = 'fall'; rope.t = 0; onHit(rope.o); sinkT = SINK_TIME; sinkType = 'fall'; }   // נופל מהמקום שבו שחרר
}
function ropeHanging() { return !!rope && rope.phase === 'hang'; }

/* ---------- ציור ---------- */
function drawChasm(o, bottom) {                                  // גבעה עם שיפוע, צוק, תהום עמוק, צוק שני ושיפוע למטה
  const x = o.x, w = o.w, H = CHASM.h, T = GROUND - H, wd = WORLDS[world];
  const G = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  const dirt = G ? G.dirt[0] : wd.ground, grass = G ? G.grass[1] : wd.top;
  const a = x - CHASM.top - CHASM.slope, d = x + w + CHASM.top + CHASM.slope;
  // התהום: מהקרקע ומטה, ובין הצוקים – חושך עמוק
  const g = ctx.createLinearGradient(0, T, 0, GROUND + 40);
  g.addColorStop(0, '#2a1f17'); g.addColorStop(0.5, '#140e0a'); g.addColorStop(1, '#050302');
  ctx.fillStyle = g; ctx.fillRect(x, T, w, bottom - T);
  // שתי הגבעות: מילוי באדמה, ופס דשא לאורך הקו העליון
  const hill = (from, to, edgeX, side) => {
    ctx.fillStyle = dirt; ctx.beginPath(); ctx.moveTo(from, GROUND + 0.5);
    for (let xx = from; side < 0 ? xx <= to : xx <= to; xx += 1) ctx.lineTo(xx, GROUND - terrainLift(xx));
    ctx.lineTo(to, bottom); ctx.lineTo(side < 0 ? to : from, bottom); ctx.lineTo(from, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = grass; ctx.lineWidth = 2; ctx.beginPath();
    for (let xx = from; xx <= to; xx += 1) ctx.lineTo(xx, GROUND - terrainLift(xx) + 0.6); ctx.stroke();
  };
  hill(a, x, x, -1); hill(x + w, d, x + w, 1);
  // קירות הצוקים: סלע עם שכבות וקצה מחוספס, שיורד עמוק לתוך התהום
  for (const [ex, dir] of [[x, 1], [x + w, -1]]) {
    const rg = ctx.createLinearGradient(0, T, 0, GROUND + 40);
    rg.addColorStop(0, '#8a7a68'); rg.addColorStop(0.35, '#5f5246'); rg.addColorStop(1, '#2a221c');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(ex - dir * 0.5, T);
    for (let k = 0; k < 10; k++) ctx.lineTo(ex + dir * (1.2 + hash(k * 3.1 + ex) * 3), T + 2 + k * 5);
    ctx.lineTo(ex - dir * 0.5, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.5;
    for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(ex - dir * 0.5, T + k * 6); ctx.lineTo(ex + dir * (1.5 + hash(k + ex) * 2), T + k * 6 + 1); ctx.stroke(); }
    ctx.fillStyle = grass; ctx.fillRect(dir > 0 ? ex - 3 : ex, T - 0.4, 3, 1.6);               // שפת הדשא על קצה הצוק
  }
  // מסגרת עץ על שני הצוקים שהחבל קשור אליה
  const [ax, ay] = ropeAnchor(o);
  ctx.fillStyle = '#78350f'; ctx.fillRect(x - 6, ay, 2.4, T - ay); ctx.fillRect(x + w + 3.6, ay, 2.4, T - ay);   // עמודים
  ctx.fillStyle = '#92400e'; ctx.fillRect(x - 7, ay - 2.2, w + 14, 2.6);                                          // קורה
  ctx.fillStyle = '#451a03'; ctx.fillRect(x - 7, ay - 0.4, w + 14, 0.8);
  ctx.fillStyle = '#1c1917'; circle(ax, ay, 1.1);                                                                // הטבעת של החבל
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
