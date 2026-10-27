/* ninja-voice-game – dragon.js
   RIDE: דרקון שוכב ומחכה. אומרים RIDE – הנינג'ה קופץ על הגב והם ממריאים.
   בשמיים: סלע מרחף בגובה שלך → UP / DOWN כדי לעבור לגובה השני. ענן סערה → FIRE (הדרקון יורק אש).
   אחרי כמה מכשולים בשמיים הדרקון נוחת, הנינג'ה קופץ למטה והדרקון עף משם.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let ride = null;   // { o, phase: 'wait' | 'mount' | 'takeoff' | 'fly' | 'land' | 'leave', t, py, lane, left, dist, gap, demo }
const DRAGON = { w: 34, saddle: 20, stopAt: 4, lie: 6, hi: 34, lo: 12, climb: 60, mount: 0.7, takeoff: 0.9, land: 1.0, sky: 3, leave: 1.6 };
const SKY_TYPES = ['skyrock', 'storm'];
const SKYROCK = { w: 11 }, STORM = { w: 22 };

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
    if (r.left <= 0 && !pending && r.dist > speed * 0.5) { r.phase = 'land'; r.t = 0; r.from = r.py; }
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

// מכשול בשמיים: סלע בגובה שבו הדרקון נמצא (צריך לעבור לגובה השני), או ענן סערה בכל הגובה (צריך FIRE)
function skySpawn(r) {
  const storm = Math.random() < 0.4 && !(r.lastStorm >= 2);
  const o = storm ? { type: 'storm', x: W + 2, w: STORM.w } : { type: 'skyrock', x: W + 2, w: SKYROCK.w, lane: r.lane };
  r.lastStorm = storm ? (r.lastStorm || 0) + 1 : 0;
  o.passed = false; o.hit = false; o.pts = obstacleValue(o.type); o.seed = Math.random() * 100;
  obstacles.push(o); spawned++; r.left--; r.dist = 0;
  r.gap = speed * rand(cfg.gapT[0], cfg.gapT[1]) + o.w;
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
  if (o.type === 'storm') return { l: o.x + 1, r: o.x + o.w - 1, t: -1e6, b: GROUND - 4 };
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
  // רגליים
  ctx.fillStyle = '#15803d';
  if (lie) { ctx.beginPath(); ctx.ellipse(x - 4, y + 6.6, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.ellipse(x + 6, y + 6.6, 2.6, 1.1, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (fly) { ctx.beginPath(); ctx.ellipse(x - 4, bodyY + 3.6, 1.2, 2.2, 0.7, 0, Math.PI * 2); ctx.ellipse(x + 5, bodyY + 3.6, 1.2, 2.2, 0.7, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillRect(x - 5, bodyY + 2, 2.2, 4.6); ctx.fillRect(x + 4.5, bodyY + 2, 2.2, 4.6); }
  // גוף ובטן
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(x, bodyY, 9.5, 4.3 + breathe, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(x + 1, bodyY + 2.2, 7, 1.9, 0, 0, Math.PI * 2); ctx.fill();
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
  } else if (o.type === 'storm' && !o.broken) {                    // ענן סערה – גוש עננים כהה מהשמיים עד הקרקע, גשם וברקים
    const t = performance.now() / 1000, cx = o.x + o.w / 2;
    const rg = ctx.createLinearGradient(0, GROUND - 56, 0, GROUND);                          // מסך גשם כהה מהענן עד הקרקע – חוסם את שני הגבהים
    rg.addColorStop(0, 'rgba(71,85,105,.85)'); rg.addColorStop(1, 'rgba(100,116,139,.35)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(o.x - 1, GROUND - 56);
    for (let yy = GROUND - 56; yy <= GROUND; yy += 4) ctx.lineTo(o.x + 1 + Math.sin(yy * 0.3 + t * 2) * 1.2 + (yy - GROUND + 56) * 0.04, yy);
    for (let yy = GROUND; yy >= GROUND - 56; yy -= 4) ctx.lineTo(o.x + o.w - 1 + Math.sin(yy * 0.27 + t * 2 + 1) * 1.2 - (yy - GROUND + 56) * 0.04, yy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(226,232,240,.7)'; ctx.lineWidth = 0.35;
    for (let k = 0; k < 10; k++) { const xx = o.x + 2 + k * 2, yy = GROUND - 52 + ((t * 45 + k * 13) % 50); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 0.9, yy + 3); ctx.stroke(); }
    const puffs = [];
    for (let k = 0; k < 13; k++) {                                 // ענן גדול ורחב למעלה
      const u = hash(k + o.seed), v = hash(k * 2.7 + o.seed);
      puffs.push({ x: cx + (u - 0.5) * (o.w + 10), y: GROUND - 68 + v * 14, r: 6.5 + v * 3 });
    }
    for (const p of puffs) { ctx.fillStyle = '#475569'; circle(p.x + Math.sin(t * 0.8 + p.y) * 0.6, p.y, p.r); }
    for (const p of puffs) { ctx.fillStyle = '#64748b'; circle(p.x - p.r * 0.25 + Math.sin(t * 0.8 + p.y) * 0.6, p.y - p.r * 0.3, p.r * 0.62); }
    for (const p of puffs) if (p.y < GROUND - 60) { ctx.fillStyle = 'rgba(203,213,225,.5)'; circle(p.x - p.r * 0.35 + Math.sin(t * 0.8 + p.y) * 0.6, p.y - p.r * 0.5, p.r * 0.3); }
    if ((t + o.seed) % 1.3 < 0.13) {                               // ברק
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(cx + 1, GROUND - 46); ctx.lineTo(cx - 3, GROUND - 34); ctx.lineTo(cx + 2, GROUND - 31); ctx.lineTo(cx - 2, GROUND - 16); ctx.stroke();
      ctx.fillStyle = 'rgba(254,249,195,.18)'; ctx.fillRect(o.x - 6, GROUND - 70, o.w + 12, 70);
    }
    label('FIRE', o.x + o.w / 2, GROUND - 72, 3.4, '#fde047', '#1e293b');
  }
}

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
