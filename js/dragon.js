/* ninja-voice-game – dragon.js
   RIDE: דרקון שוכב ומחכה. אומרים RIDE – הנינג'ה קופץ על הגב והם ממריאים.
   בשמיים: סלע מרחף בגובה שלך → UP / DOWN כדי לעבור לגובה השני. עטלף ענק שעף מולך → FIRE (הדרקון יורק אש והעטלף בורח).
   לאורך הטיסה יש מטבעות וכוכבים לאיסוף.
   אחרי כמה מכשולים בשמיים הדרקון נוחת, הנינג'ה קופץ למטה והדרקון עף משם.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let ride = null;   // { o, phase: 'wait' | 'mount' | 'takeoff' | 'fly' | 'land' | 'leave', t, py, lane, left, dist, gap, demo }
const DRAGON = { w: 34, saddle: 20, stopAt: 4, lie: 6, hi: 34, lo: 12, climb: 60, mount: 0.7, takeoff: 0.9, land: 1.0, sky: 7, leave: 1.6, gapMul: 1.35 };   // sky = כמה מכשולים בטיסה
const SKY_TYPES = ['skyrock', 'bat'];
const SKYROCK = { w: 11 }, BAT = { w: 12, h: 9, fly: 4, flee: 1.2, gapMul: 1.5 };   // fly – כמה מהר העטלף מתקרב (לאט יותר = יותר זמן להתכונן)
let skyPrizes = [];   // מטבעות וכוכבים בשמיים: { x, y, star, got }
function laneY(lane) { return GROUND - (lane ? DRAGON.hi : DRAGON.lo) - 4; }   // גובה הנינג'ה היושב בכל נתיב

// כמה "גבוה" המצלמה: 0 על הקרקע, 1 בשמיים (הקרקע וההרים מתרחקים למטה)
function skyAmount() {
  if (!ride) return 0;
  const e = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  if (ride.phase === 'takeoff') return e(ride.t / DRAGON.takeoff);
  if (ride.phase === 'fly') return 1;
  if (ride.phase === 'land') return 1 - e(ride.t / (DRAGON.land * 0.9));
  return 0;
}
// עננים שחולפים מהר ליד הדרקון – תחושת מהירות וגובה
function drawSkyClouds(left, right, top, k) {
  ctx.save(); ctx.globalAlpha = k;
  repeat(left, right, 0.3, 26, (x, i) => {                         // ים עננים רחוק מעל ההרים
    const y = GROUND + 14 + hash(i + 320) * 8, r = 4 + hash(i + 321) * 4;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(x, y, r); circle(x + r, y - r * 0.4, r * 1.1); circle(x + r * 2, y, r * 0.8);
  });
  repeat(left, right, 0.9, 32, (x, i) => {
    const y = top + 8 + hash(i + 300) * (GROUND + 18 - top), r = 2.5 + hash(i + 301) * 3.5;
    if (hash(i + 302) < 0.35) return;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    circle(x, y, r); circle(x + r * 1.2, y - r * 0.5, r * 1.2); circle(x + r * 2.5, y, r * 0.9); ctx.fillRect(x, y - 0.1, r * 2.5, r * 0.9);
  });
  ctx.restore();
}

function rideCtl() { return !!ride && ['mount', 'takeoff', 'fly', 'land'].includes(ride.phase); }   // הנינג'ה על הדרקון – הגובה נקבע כאן
function rideFlying() { return !!ride && (ride.phase === 'takeoff' || ride.phase === 'fly'); }
function rideHolds() { return !!ride && (ride.phase === 'wait' || ride.phase === 'mount'); }          // העולם עומד
function rideBusy() { return !!ride && ride.phase !== 'leave'; }                                       // לא מוסיפים מכשולים רגילים בזמן הטיסה

function rideUpdate(dt, pb) {
  if (!ride) {
    const d = obstacles.find(o => o.type === 'dragon' && !o.passed && o.x - pb.r <= DRAGON.stopAt && o.x + DRAGON.w > pb.l);
    if (d) { ride = { o: d, phase: 'wait', t: 0, py: 0, lane: 1, left: DRAGON.sky, dist: 0, gap: 0, demo: state !== 'play' }; duckT = 0; }
    return;
  }
  const r = ride; r.t += dt;
  if (r.phase === 'wait' && !r.demo && state === 'play' && r.t >= 3.5 + (r.hinted || 0) * 6) { r.hinted = (r.hinted || 0) + 1; sayWords(['ride'], 1.6, r); }   // שותקים מול הדרקון – שומעים את המילה (ואחר כך שוב כל כמה שניות)
  if (r.phase === 'mount') {                                       // קופץ על הגב, והעולם זז כך שהאוכף מגיע מתחתיו
    const k = Math.min(1, r.t / DRAGON.mount), e = k * k * (3 - 2 * k);
    const pan = r.pan * e; ropeShiftBy(pan - r.panned); r.panned = pan;
    r.py = DRAGON.lie * k + 9 * Math.sin(Math.PI * k);
    if (k >= 1) {
      if (!r.o.demo) cleared(r.o); obstacles = obstacles.filter(o => o !== r.o);
      r.phase = 'takeoff'; r.t = 0; r.from = r.py; sfx('jump');
      burst(PLAYER.x + 4, GROUND - 1, WORLDS[world].dust, 12, 24);
    }
  } else if (r.phase === 'takeoff') {                              // ממריאים לגובה העליון
    const k = Math.min(1, r.t / DRAGON.takeoff);
    const top = r.demo ? DRAGON.lo : DRAGON.hi;                     // בהדגמה – נשארים נמוך, מתחת לכותרת
    r.py = r.from + (top - r.from) * (1 - (1 - k) * (1 - k));
    if (k >= 1) { r.phase = 'fly'; r.t = 0; r.lane = r.demo ? 0 : 1; r.gap = speed * 1.3; r.dist = 0; }
  } else if (r.phase === 'fly') {
    const target = r.lane ? DRAGON.hi : DRAGON.lo, step = DRAGON.climb * dt;
    r.py += Math.max(-step, Math.min(step, target - r.py));
    if (r.demo) return;                                            // בהדגמה – רק מרחפים
    r.dist += curSpeed() * dt;
    if (r.left > 0 && r.dist >= r.gap && state === 'play') skySpawn(r);
    const pending = obstacles.some(o => SKY_TYPES.includes(o.type) && o.x + o.w > PLAYER.x - 10);
    if (r.left <= 0 && !pending && r.dist > speed * 0.5) { r.phase = 'land'; r.t = 0; r.from = r.py; skyPrizes = skyPrizes.filter(c => c.got || c.x < PLAYER.x); }   // יורדים – מה שעוד לפנינו נעלם
  } else if (r.phase === 'land') {                                 // יורדים לקרקע
    const k = Math.min(1, r.t / DRAGON.land);
    r.py = r.from * (1 - k * k * (3 - 2 * k));
    if (k >= 1) {
      r.phase = 'leave'; r.t = 0; r.lx = PLAYER.x + 4;
      py = 0.001; vy = cfg.jumpV * 0.35; sfx('jump');                 // קופץ מהדרקון
      burst(PLAYER.x + 4, GROUND - 1, WORLDS[world].dust, 10, 20);
      distSinceSpawn = 0; nextGap = speed * 1.4;
    }
  } else if (r.phase === 'leave') {                                // הדרקון עף משם
    if (r.t > DRAGON.leave) ride = null;
  }
}

// מכשול בשמיים: סלע בגובה שבו הדרקון נמצא (צריך לעבור לגובה השני), או עטלף שעף מולך באותו גובה (FIRE – או לעקוף ב-UP/DOWN)
function skySpawn(r) {
  const bat = Math.random() < 0.4 && !(r.lastBat >= 2);
  const o = bat ? { type: 'bat', x: viewR() + 2, w: BAT.w, lane: r.lane } : { type: 'skyrock', x: viewR() + 2, w: SKYROCK.w, lane: r.lane };
  r.lastBat = bat ? (r.lastBat || 0) + 1 : 0;
  o.passed = false; o.hit = false; o.pts = obstacleValue(o.type); o.seed = Math.random() * 100;
  obstacles.push(o); spawned++; r.left--; r.dist = 0;
  r.gap = speed * rand(cfg.gapT[0], cfg.gapT[1]) * DRAGON.gapMul + o.w;     // רווחים נדיבים – לא קשה מדי
  if (bat) o.x += speed * BAT.gapMul * 0.5;                                      // עטלף מופיע רחוק יותר – רואים אותו מוקדם ויש זמן להגיד FIRE
  if (r.left <= 0) return;                                                      // אחרי המכשול האחרון הדרקון יורד – בלי מטבעות וכוכבים שאי אפשר לאסוף
  // פרסים ברווח שאחרי המכשול: שורת מטבעות בנתיב הבטוח (ליד סלע – בנתיב השני), ולפעמים כוכב גדול
  const lane = o.type === 'skyrock' ? 1 - o.lane : o.lane, x0 = o.x + o.w + speed * 0.6, n = 4;
  for (let i = 0; i < n; i++) skyPrizes.push({ x: x0 + i * 5, y: laneY(lane) - Math.sin(i / (n - 1) * Math.PI) * 2, star: false });
  if (Math.random() < 0.45) skyPrizes.push({ x: x0 + n * 5 + 6, y: laneY(1 - lane), star: true });   // כוכב בנתיב השני – צריך לעבור כדי לקחת אותו
}
function skyPrizesUpdate(dt) {
  if (!skyPrizes.length) return;
  const v = curSpeed(), pb = rideCtl() ? rideBox() : playerBox();
  for (const c of skyPrizes) {
    c.x -= v * dt;
    const R = c.star ? 3 : 1.6;
    if (!c.got && rideCtl() && c.x + R > pb.l && c.x - R < pb.r && c.y + R > pb.t && c.y - R < pb.b) {
      c.got = true; sfx('coin');
      if (c.star) { burst(c.x, c.y, '#fde047', 14, 36); floatText(c.x, c.y - 5, '+5 ⭐', '#ca8a04'); }
      if (mode === 'journey' && state === 'play') { picked += c.star ? 5 : 1; coinsFlying++; flyCoinToHud({ x: c.x - 3 }, c.y); }
    }
  }
  skyPrizes = skyPrizes.filter(c => !c.got && c.x > -10);
}
function drawSkyPrizes() {
  const tc = performance.now() / 1000;
  for (const c of skyPrizes) {
    const bob = Math.sin(tc * 4 + c.x) * 0.5;
    if (c.star) {
      const g = ctx.createRadialGradient(c.x, c.y + bob, 0.5, c.x, c.y + bob, 6); g.addColorStop(0, 'rgba(253,224,71,.55)'); g.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = g; circle(c.x, c.y + bob, 6); starShape(c.x, c.y + bob, 3, 1.35, tc * 1.2, '#facc15', '#a16207');
    } else {
      const sx = Math.max(0.2, Math.abs(Math.cos(tc * 4 + c.x * 0.2)));
      ctx.save(); ctx.translate(c.x, c.y + bob); ctx.scale(sx, 1);
      ctx.fillStyle = '#b45309'; circle(0, 0, 2.2); ctx.fillStyle = '#facc15'; circle(0, 0, 1.8); ctx.fillStyle = '#fef9c3'; ctx.fillRect(-0.9, -1, 0.5, 0.9);
      ctx.restore();
    }
  }
}

function rideCmd() {                                               // RIDE: עולים על הדרקון
  if (!ride || ride.phase !== 'wait') return;
  ride.phase = 'mount'; ride.t = 0; ride.panned = 0; ride.py = 0;
  ride.pan = (ride.o.x + DRAGON.saddle) - (PLAYER.x + 4);
  duckT = 0; sfx('coin');
}
function rideLane(up) {                                            // UP / DOWN בזמן הטיסה. מחזיר true אם טופל
  if (!rideFlying()) return false;
  ride.lane = up ? 1 : 0; return true;
}

function skyBox(o) {
  if (o.type === 'bat') { if (o.broken) return { l: -1e6, r: -1e6, t: 0, b: 0 }; const y = laneY(o.lane) + batBob(o); return { l: o.x + 2, r: o.x + o.w - 2, t: y - 3.5, b: y + 3 }; }
  return o.lane ? { l: o.x, r: o.x + o.w, t: GROUND - 51, b: GROUND - 31 } : { l: o.x, r: o.x + o.w, t: GROUND - 27, b: GROUND - 6 };
}
function rideBox() {                                               // הנינג'ה יושב + הדרקון מתחתיו
  const b = GROUND - ride.py;
  return { l: PLAYER.x - 6, r: PLAYER.x + 15, t: b - 11, b: b + 5 };
}

/* ---------- ציור ---------- */
// x,y = האוכף (איפה שהנינג'ה יושב). mode: 'lie' שוכב ומחכה, 'stand' קם, 'fly' עף
function drawDragon(x, y, mode) {
  const now = performance.now() / 1000, fly = mode === 'fly', lie = mode === 'lie';
  const flap = fly ? Math.sin(now * 9) : 0, breathe = lie ? Math.sin(now * 2) * 0.35 : 0;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bodyY = y + 3.2;
  // כנף אחורית (מאחורי הגוף)
  const wing = (dx, dy, k, col) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
    if (fly) { const tip = -14 - k * 9; ctx.lineTo(x + dx - 4, y + tip); ctx.lineTo(x + dx - 9, y + tip * 0.55); ctx.lineTo(x + dx - 13, y + tip * 0.25 + 2); ctx.lineTo(x + dx - 7, y + dy + 1); }
    else { ctx.lineTo(x + dx - 6, y + dy - 4); ctx.lineTo(x + dx - 12, y + dy - 2); ctx.lineTo(x + dx - 8, y + dy + 1.5); }
    ctx.closePath(); ctx.fill();
  };
  wing(2, 0.5, flap, '#5b21b6');
  // זנב עם קוצים
  const sw = Math.sin(now * (lie ? 1.6 : 4)) * (lie ? 1.2 : 2);
  ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 6, bodyY + 0.5); ctx.quadraticCurveTo(x - 14, bodyY + (lie ? 3 : 2) + sw * 0.4, x - 20, bodyY + (lie ? 2.5 : -1) + sw); ctx.stroke();
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(x - 20, bodyY + (lie ? 2.5 : -1) + sw - 1.8); ctx.lineTo(x - 23.5, bodyY + (lie ? 2.5 : -1) + sw); ctx.lineTo(x - 20, bodyY + (lie ? 2.5 : -1) + sw + 1.8); ctx.fill();
  // גוף ובטן
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(x, bodyY, 9.5, 4.3 + breathe, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(x + 1, bodyY + 2.2, 7, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  // רגליים – מעל הגוף, כדי שרואים אותן
  ctx.fillStyle = '#166534';
  if (lie) { ctx.beginPath(); ctx.ellipse(x - 4, y + 6.6, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.ellipse(x + 6, y + 6.6, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (fly) {                                                  // רגליים מקופלות לאחור, עם טפרים
    ctx.strokeStyle = '#166534'; ctx.lineWidth = 2.1;
    for (const lx of [-3.5, 5.5]) { ctx.beginPath(); ctx.moveTo(x + lx, bodyY + 1.4); ctx.lineTo(x + lx - 3.2, bodyY + 4.6); ctx.lineTo(x + lx - 5.2, bodyY + 4.2); ctx.stroke(); }
    ctx.fillStyle = '#fde68a'; for (const lx of [-3.5, 5.5]) { circle(x + lx - 5.6, bodyY + 4.1, 0.5); }
  }
  else { ctx.fillRect(x - 5, bodyY + 2, 2.2, 4.6); ctx.fillRect(x + 4.5, bodyY + 2, 2.2, 4.6); }
  ctx.fillStyle = '#f97316';                                                       // קוצים על הגב
  for (const sx of [-7, -3.5, 7.5]) { ctx.beginPath(); ctx.moveTo(x + sx - 1.2, bodyY - 3.6); ctx.lineTo(x + sx, bodyY - 6); ctx.lineTo(x + sx + 1.2, bodyY - 3.6); ctx.fill(); }
  ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(x, y + 0.2, 3.4, 1.3, 0, 0, Math.PI * 2); ctx.fill();   // אוכף
  // צוואר וראש
  const hx = lie ? x + 15 : x + 13.5, hy = lie ? y + 3.4 : y - 4.5 + (fly ? Math.sin(now * 4.5) * 0.6 : 0);
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.moveTo(x + 6, bodyY - 1); ctx.quadraticCurveTo(x + 10, lie ? bodyY - 2 : y - 2, hx - 1.5, hy + 0.5); ctx.stroke();
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(hx, hy, 3.4, 2.6, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 3, hy + 0.9, 2.6, 1.6, 0.1, 0, Math.PI * 2); ctx.fill();           // חוטם
  ctx.fillStyle = '#15803d'; circle(hx + 4.6, hy + 0.3, 0.35);                                           // נחיר
  ctx.fillStyle = '#facc15';                                                                             // קרניים
  ctx.beginPath(); ctx.moveTo(hx - 1.6, hy - 1.8); ctx.lineTo(hx - 3.6, hy - 4.6); ctx.lineTo(hx - 0.4, hy - 2.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 0.2, hy - 2.3); ctx.lineTo(hx - 0.8, hy - 5.2); ctx.lineTo(hx + 1.3, hy - 2.4); ctx.fill();
  const blink = lie && (now % 3.2) < 0.15;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(hx + 0.6, hy - 0.6, 1.1, blink ? 0.15 : 1.1, 0, 0, Math.PI * 2); ctx.fill();
  if (!blink) { ctx.fillStyle = '#111'; circle(hx + 0.9, hy - 0.6, 0.55); ctx.fillStyle = '#fff'; circle(hx + 1.1, hy - 0.9, 0.2); }
  // כנף קדמית
  wing(3, 0, flap * 0.9, '#7c3aed');
  ctx.restore();
  if (lie && Math.random() < 0.02) particles.push({ x: hx + 5, y: hy, vx: 3, vy: -4, g: -2, life: 0.8, color: 'rgba(203,213,225,.8)', size: 1.1 });   // עשן קטן מהנחיריים
}

function drawSky(o) {
  if (o.type === 'skyrock') {                                      // סלע מרחף עם דשא למעלה
    const b = skyBox(o), cx = (b.l + b.r) / 2, bob = Math.sin(performance.now() / 600 + o.seed) * 0.8;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = '#78716c'; ctx.beginPath();
    ctx.moveTo(b.l - 1, b.t + 4); ctx.lineTo(b.l + 2, b.t + 1); ctx.lineTo(b.r - 2, b.t); ctx.lineTo(b.r + 1, b.t + 4);
    ctx.lineTo(b.r - 1, b.t + 11); ctx.lineTo(cx + 2, b.b); ctx.lineTo(cx - 1, b.b - 1); ctx.lineTo(b.l + 1, b.t + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.moveTo(cx, b.t + 4); ctx.lineTo(b.r - 1, b.t + 11); ctx.lineTo(cx + 2, b.b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4ade80'; ctx.fillRect(b.l + 1, b.t, o.w - 2, 1.8);
    ctx.fillStyle = '#a8a29e'; ctx.fillRect(b.l + 2, b.t + 5, 2, 0.6); ctx.fillRect(cx, b.t + 8, 2.4, 0.6);
    ctx.restore();
    label(o.lane ? 'DOWN' : 'UP', cx, (o.lane ? b.b + 5 : b.t - 4) + bob, 3.4, '#fde047', '#1e293b');
  } else if (o.type === 'bat') {                                  // עטלף ענק – כנפיים מנפנפות, עיניים אדומות. אחרי FIRE הוא בורח למעלה
    const t = performance.now() / 1000, k = o.broken ? Math.min(1, (o.ft || 0) / BAT.flee) : 0;
    const cx = o.x + o.w / 2 + k * 20, cy = laneY(o.lane) + batBob(o) - k * k * 50;
    if (k >= 1) return;
    const flap = Math.sin(t * (o.broken ? 26 : 14) + o.seed), s = 1;
    ctx.save(); ctx.translate(cx, cy); if (o.broken) ctx.rotate(-0.5 * k); ctx.globalAlpha = 1 - k * 0.6;
    for (const dir of [-1, 1]) {                                   // כנפיים
      ctx.fillStyle = dir < 0 ? '#3b0764' : '#4c1d95'; ctx.beginPath(); ctx.moveTo(0, -1);
      const tipY = -3 - flap * 4;
      ctx.lineTo(dir * 4 * s, tipY - 1); ctx.lineTo(dir * 8 * s, tipY + 1); ctx.lineTo(dir * 7 * s, 0.5); ctx.lineTo(dir * 5.5 * s, 1.6);
      ctx.lineTo(dir * 4 * s, 0.6); ctx.lineTo(dir * 2.4 * s, 1.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(167,139,250,.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(dir * 1, -0.8); ctx.lineTo(dir * 4 * s, tipY - 0.8); ctx.moveTo(dir * 1, -0.5); ctx.lineTo(dir * 7.5 * s, tipY + 1.2); ctx.stroke();
    }
    ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.ellipse(0, 0.6, 2.1, 2.7, 0, 0, Math.PI * 2); ctx.fill();   // גוף
    ctx.beginPath(); ctx.moveTo(-1.6, -1.4); ctx.lineTo(-1.2, -3.8); ctx.lineTo(-0.3, -1.8); ctx.moveTo(1.6, -1.4); ctx.lineTo(1.2, -3.8); ctx.lineTo(0.3, -1.8); ctx.fill();   // אוזניים
    ctx.fillStyle = o.broken ? '#fde68a' : '#ef4444'; circle(-0.8, -0.6, 0.55); circle(0.8, -0.6, 0.55);         // עיניים
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-0.6, 1.3); ctx.lineTo(-0.3, 2.1); ctx.lineTo(0, 1.3); ctx.moveTo(0.3, 1.3); ctx.lineTo(0.6, 2.1); ctx.lineTo(0.9, 1.3); ctx.fill();   // ניבים קטנים
    ctx.restore();
    if (!o.broken) label('FIRE', cx, cy - 9, 3.4, '#fde047', '#1e293b');
  }
}
function batBob(o) { return Math.sin(performance.now() / 260 + o.seed) * 1.2; }

function drawRideDragon(fx, fy) {                                  // מתחת לנינג'ה בזמן שהוא על הדרקון
  if (!ride) return;
  if (ride.phase === 'takeoff' || ride.phase === 'fly' || ride.phase === 'land') drawDragon(fx, fy, ride.phase === 'land' && ride.t > DRAGON.land * 0.8 ? 'stand' : 'fly');
}
function drawRideLeave() {                                         // הדרקון עף משם אחרי הנחיתה
  if (!ride || ride.phase !== 'leave') return;
  const k = ride.t / DRAGON.leave;
  ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.7) / 0.3);
  drawDragon(ride.lx + 10 + k * k * 90, GROUND - DRAGON.lie - k * 45, 'fly');
  ctx.restore();
}
function poseRide() {                                              // יושב על הדרקון, רגליים משני הצדדים, ידיים קדימה
  const P = poseAir(false), now = performance.now() / 1000;
  P.hipY = -1.4; P.lean = 0.25; P.bob = Math.sin(now * 9) * 0.25;
  P.legs = [[1.05, 0.25], [1.25, 0.35]]; P.arms = [[1.25, 1.65], [1.4, 1.75]];
  return P;
}

// הרישום של הסצנה (scenes.js). סצנה ישנה – נשארו בבסיס: המילים RIDE / UP / DOWN / FIRE ב-speech.js (הסדר שם חשוב),
// עצירת העולם (rideHolds ב-state.js), הגובה על הדרקון (rideCtl ב-game.js), התנוחה והציור ב-draw.js
sceneAdd({
  type: 'dragon', word: 'ride',
  listen: ['up', 'down', 'fire'],                                                    // בשמיים צריך UP / DOWN / FIRE
  active: () => !!ride && ride.phase === 'wait',                                    // מחכים ל-RIDE
  reset: () => { ride = null; skyPrizes = []; },
  setup: o => { o.w = DRAGON.w; }, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 10, b: GROUND }),
  update: (dt, pb) => { rideUpdate(dt, pb); skyPrizesUpdate(dt); },
  expected: () => !ride ? null : ride.phase === 'wait' ? ['ride'] : ride.phase === 'mount' || ride.phase === 'takeoff' ? ['up', 'down', 'fire'] : null,
  auto: () => { if (ride && ride.phase === 'wait') command('ride', 'auto'); },
  intro: { time: 6, demo: () => { obstacles.push({ type: 'dragon', x: PLAYER.x + PLAYER.w + DRAGON.stopAt - 1, w: DRAGON.w }); },
           steps: () => [{ at: 0.9, w: 'ride' }, { at: 2.9, w: 'up' }, { at: 3.8, w: 'down' }, { at: 4.6, w: 'fire' }] }
});
