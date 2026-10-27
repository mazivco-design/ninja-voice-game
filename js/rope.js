/* ninja-voice-game – rope.js
   LET GO: תהום עם חבל שמתנדנד מעל. הנינג'ה נעצר בקצה, אומרים CATCH כשהחבל מתקרב – נתלה ומתנדנד לצד השני,
   ואומרים LET GO בצד הרחוק – נוחת. LET GO מוקדם מדי = נופל לתהום. שתיקה = החבל ממשיך להתנדנד בסבלנות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let rope = null;    // { o, phase: 'wait' | 'hang' | 'land' | 'fall' | 'done', t, theta, grabWant, bubble }
const ROPE = { len: 74, amp: 0.45, period: 2.8, anchorH: 86, want: 1.5, nearAt: 0.7, farAt: 0.55, stopAt: 3, water: 20 };   // החבל תלוי מגבוה, מעבר לראש המסך
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
  } else if (r.phase === 'land') {                               // שוחרר בצד הרחוק: קפיצה קטנה אל הצוק, והמצלמה זזה איתו חזרה למקום הרגיל
    const D = r.air + 0.15, k = Math.min(1, r.t / D), hop = Math.min(1, r.t / r.air);   // באוויר – זז קדימה בקצב קבוע
    const figX = r.fromX + (r.landX - r.fromX) * hop;                // איפה הנינג'ה בעולם (לפני ההזזה)
    const pan = (r.landX - (PLAYER.x + 4)) * (k * k * (3 - 2 * k));  // כמה העולם זז עד עכשיו
    ropeShiftBy(pan - r.panned); r.panned = pan;
    r.drawOff = figX - pan - (PLAYER.x + 4);                         // הנינג'ה מצויר במקום שלו בעולם, לא במקום הרגיל
    if (k >= 1) { r.drawOff = 0; r.o.unlocked = true; cleared(r.o); r.phase = 'done'; r.t = 0; }
  } else if (r.phase === 'fall') {                               // נפל לתהום – למים. אחרי האנימציה ממשיכים מהצד הרחוק
    if (!r.splash && r.t > 0.74) { r.splash = true; burst(r.fallX, GROUND + ROPE.water, '#bae6fd', 14, 40); burst(r.fallX, GROUND + ROPE.water, '#ffffff', 8, 30); sfx('hit'); }
    if (sinkT <= 0) { ropeShift(r.o); r.o.unlocked = true; r.phase = 'done'; r.t = 0; }
  } else if (r.phase === 'done' && r.t > 0.4) rope = null;
}
function ropeShift(o) { ropeShiftBy((o.x + o.w) - (PLAYER.x - 1)); }   // הקצה הרחוק של התהום – מאחורי הנינג'ה
function ropeShiftBy(shift) {                                    // מזיזים את כל העולם שמאלה
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
  if (rope.theta >= ROPE.amp * ROPE.farAt) {
    const f = ropeFeet(rope.o, rope.theta), farX = rope.o.x + rope.o.w + 5;
    rope.phase = 'land'; rope.t = 0; rope.panned = 0; rope.fromX = f[0]; rope.landX = Math.max(f[0], farX) + 14; rope.drawOff = f[0] - (PLAYER.x + 4);
    py = Math.max(0.5, (GROUND - CHASM.h) - f[1]); vy = cfg.jumpV * 0.55; sfx('jump');   // קופץ מהחבל בקשת אל הצוק
    rope.air = (vy + Math.sqrt(vy * vy + 2 * cfg.gravity * py)) / cfg.gravity;      // כמה זמן הוא באוויר
  }
  else { rope.fallX = ropeEnd(rope.o, rope.theta)[0] - 1; rope.phase = 'fall'; rope.t = 0; onHit(rope.o); sinkT = SINK_TIME; sinkType = 'fall'; }   // נופל מהמקום שבו שחרר
}
function ropeHanging() { return !!rope && rope.phase === 'hang'; }
function ropeFeet(o, th) { const [ex, ey] = ropeEnd(o, th); return [ex - Math.sin(th * 0.45) * 13.5, ey + Math.cos(th * 0.45) * 13.5]; }   // איפה כפות הרגליים של הנינג'ה התלוי

/* ---------- ציור ---------- */
function drawChasm(o, bottom) {                                  // גבעה עם שיפוע, צוק, תהום עמוק, צוק שני ושיפוע למטה
  const x = o.x, w = o.w, H = CHASM.h, T = GROUND - H, wd = WORLDS[world];
  const G = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  const dirt = G ? G.dirt[0] : wd.ground, grass = G ? G.grass[1] : wd.top;
  const a = x - CHASM.top - CHASM.slope, d = x + w + CHASM.top + CHASM.slope;
  // בתוך התהום: ערפל בהיר של עומק (לא חושך), ובתחתית – מים
  const sky = wd.sky[1], WY = GROUND + ROPE.water, t = performance.now() / 1000;
  const g = ctx.createLinearGradient(0, GROUND - 2, 0, WY);                                     // הקיר הרחוק של הנקיק – דהוי מערפל, כמו הנוף הרחוק
  g.addColorStop(0, '#c9e6d3'); g.addColorStop(0.6, '#a8cbbb'); g.addColorStop(1, '#8fb4a8');
  ctx.fillStyle = g; ctx.fillRect(x, GROUND - 2, w, WY - GROUND + 2);
  ctx.strokeStyle = 'rgba(70,100,90,.18)'; ctx.lineWidth = 0.8;                                   // שכבות סלע רחוקות
  for (let yy = GROUND + 4; yy < WY - 1; yy += 5) { ctx.beginPath(); for (let xx = x; xx <= x + w; xx += 3) ctx.lineTo(xx, yy + Math.sin(xx * 0.18 + yy) * 0.8); ctx.stroke(); }
  if (world === 5) {                                                                            // בערוץ: מפל קטן נופל מהקיר האחורי אל המים
    const fx = x + w * 0.62, fw = 4;
    ctx.fillStyle = 'rgba(240,249,255,.9)'; ctx.fillRect(fx, GROUND - 2, fw, WY - GROUND + 2);
    ctx.fillStyle = 'rgba(125,180,205,.6)';
    for (let k = 0; k < 3; k++) ctx.fillRect(fx + 0.6 + k * 1.2, GROUND - 2 + ((t * 26 + k * 7) % (WY - GROUND)), 0.5, 4);
  }
  const wg = ctx.createLinearGradient(0, WY, 0, bottom);
  wg.addColorStop(0, '#38bdf8'); wg.addColorStop(0.4, '#0284c7'); wg.addColorStop(1, '#075985');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(x, bottom);
  for (let xx = x; xx <= x + w; xx += 2) ctx.lineTo(xx, WY + Math.sin(xx * 0.35 + t * 2.5) * 0.6);
  ctx.lineTo(x + w, bottom); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.5; ctx.beginPath();                // קצף על פני המים
  for (let xx = x; xx <= x + w; xx += 2) ctx.lineTo(xx, WY + Math.sin(xx * 0.35 + t * 2.5) * 0.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let k = 0; k < 5; k++) { const xx = x + 4 + ((k * 11 + t * 6) % (w - 8)); ctx.fillRect(xx, WY + 3 + (k % 2) * 3, 3, 0.4); }
  if (world === 5) { ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 3; k++) circle(x + w * 0.62 + 2 + (k - 1) * 2.5, WY + Math.sin(t * 3 + k) * 0.4, 1.8); }   // קצף בתחתית המפל
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
  for (const [ex, dir, sd] of [[x, 1, 3], [x + w, -1, 11]]) {          // sd קבוע לכל צד – הצורה לא משתנה כשהעולם זז
    const rg = ctx.createLinearGradient(0, T, 0, GROUND + ROPE.water);
    rg.addColorStop(0, '#8a7a68'); rg.addColorStop(0.5, '#6b5d50'); rg.addColorStop(1, '#4a3f36');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(ex - dir * 0.5, T);
    for (let k = 0; k < 10; k++) ctx.lineTo(ex + dir * (1.2 + hash(k * 3.1 + sd) * 3), T + 2 + k * 5);
    ctx.lineTo(ex - dir * 0.5, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.5;
    for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(ex - dir * 0.5, T + k * 6); ctx.lineTo(ex + dir * (1.5 + hash(k + sd) * 2), T + k * 6 + 1); ctx.stroke(); }
    ctx.fillStyle = grass; ctx.fillRect(dir > 0 ? ex - 3 : ex, T - 0.4, 3, 1.6);               // שפת הדשא על קצה הצוק
  }
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
    const [hx, hy] = ropeFeet(o, th);                                                             // כף הרגל – 13.5 יחידות מתחת לידיים, לאורך קו הגוף
    drawFigure({ fx: hx, fy: hy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  }
  if (rope && rope.o === o && rope.phase === 'wait' && labelsVisible()) label('CATCH', ax, ay - 8, 4, '#fde047', '#1e293b');
  if (rope && rope.o === o && rope.phase === 'hang' && labelsVisible()) label('LET GO', ax, ay - 8, 4, '#fde047', '#1e293b');
}
