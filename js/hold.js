/* ninja-voice-game – hold.js
   HOLD: טורנדו ביער הבמבוק. בדרך יש חורשה של שלושה קני במבוק נפרדים. כשהנינג'ה בתוכה העולם עוצר,
   וטורנדו מתקרב מימין. הרוח מתחזקת, הבמבוק מתכופף, והנינג'ה מתחיל להיסחף אחורה ואז לעוף.
   אומרים HOLD – הוא נתפס בקנה הקרוב: רק הידיים מחזיקות, והגוף מתנופף באוויר כמו דגל. כשהטורנדו נחלש – נוחת וממשיך.
   בלי HOLD – הרוח מעיפה אותו מהמסך (פגיעה), ואחרי הסערה הוא רץ חזרה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let gust = null;   // { o, phase: 'storm' | 'calm' | 'lost' | 'back' | 'done', t, k, gx, vx, lift, held, want, tx, ang }
const GUST = { stalks: [0, 13, 26], near: 70, stopAt: 2, build: { easy: 2.2, medium: 1.7, hard: 1.3 }, peak: 2.2, calm: 0.9,
               push: 46, reach: 6.5, want: 0.9, grip: 13, h: 52, back: 0.9 };

function gustBuild() { return GUST.build[diffKey] || GUST.build.medium; }
function gustHolds() { return !!gust && gust.phase !== 'done'; }                                  // העולם עומד בזמן הסערה
function gustActive() { return !!gust && gust.phase === 'storm' && gust.held === null; }          // מחכים ל-HOLD
function stalkX(o, i) { return o.x + GUST.stalks[i]; }

// עוצמת הרוח עכשיו (0..1) – לבמבוק ברקע ולאפקטים
let windLevel = 0;
let gustApproach = 0;   // 0..1 – כמה קרוב לחורשה (הרוח מאטה את הריצה בהדרגה)
let walkPh = 0;         // שלב הצעדים בהליכה נגד הרוח
let gustAdv = 0;        // כמה הנינג'ה התקדם על המסך בזמן ההאטה – כדי שהמאבק יהיה קרוב יותר למרכז
const GUST_ADV = 24;
function windNow() { return windLevel; }
let tornado = null;   // { x, k (גודל), a (שקיפות) }

function gustUpdate(dt, pb) {
  const grove = obstacles.find(o => o.type === 'gust' && !o.passed && !o.hit && stalkX(o, 2) - pb.r <= GUST.near + GUST_ADV && stalkX(o, 0) > pb.l - 40);
  let target = 0;
  gustApproach = 0;
  if (!gust) gustAdv = Math.max(0, gustAdv - dt * 30);
  if (grove && !gust) {                                                          // מתקרבים: הטורנדו מופיע רחוק מימין, והרוח מאטה את הנינג'ה בהדרגה
    const q = 1 - Math.max(0, stalkX(grove, 2) - pb.r - GUST_ADV - GUST.stopAt) / (GUST.near - GUST.stopAt);
    gustApproach = q;
    gustAdv = GUST_ADV * q * q * (3 - 2 * q);                                   // העולם מאט – והנינג'ה ממשיך לצעוד קדימה על המסך
    target = 0.3 * q;
    walkPh += dt * (6 + 4 * (1 - q));
    if (!tornado) tornado = { x: W + 22, k: 0.55, a: 0 };
    tornado.a = Math.min(1, tornado.a + dt * 1.5);
    tornado.x = lerp(W + 22, W - 22, q);                                         // הטורנדו נכנס מקצה המסך בזמן ההתקרבות
  }
  if (gust) target = gust.k;
  windLevel += (target - windLevel) * Math.min(1, dt * 4);
  if (windLevel < 0.003) windLevel = 0;
  windSound(windLevel);                                                          // רעש רוח שמתחזק עם הרוח
  gustEffects(dt);
  if (!gust) {
    if (grove && stalkX(grove, 2) - (pb.r + gustAdv) <= GUST.stopAt) {
      gust = { o: grove, phase: 'storm', t: 0, k: 0.25, gx: gustAdv, vx: 0, lift: 0, held: null, want: grove.holdWant ? GUST.want : 0, ang: 0 };
      if (!tornado) tornado = { x: W + 22, k: 0.55, a: 1 };
      duckT = 0;
    } else if (!grove && tornado) { tornado.a -= dt * 2; if (tornado.a <= 0) tornado = null; }
    return;
  }
  const g = gust, o = g.o, B = gustBuild(); g.t += dt;
  if (!obstacles.includes(o)) { gust = null; tornado = null; return; }
  if (g.want > 0) g.want -= dt;
  if (g.phase === 'storm') {
    const total = B + GUST.peak;
    g.k = g.t < B ? 0.3 + 0.7 * (g.t / B) : 1;
    tornado.x = lerp(tornado.x, PLAYER.x + 58, Math.min(1, dt * 1.2));          // הטורנדו מתקרב ונעצר מימין לנינג'ה
    tornado.k = Math.min(1, tornado.k + dt * 0.4);
    if (g.held === null) {
      if (g.t < B) {                                                            // מנסה ללכת מכופף נגד הרוח – ובכל זאת נדחף אחורה לאט
        const gp = Math.pow(Math.max(0, Math.sin(g.t * 4.6 - 0.8)), 2);       // משבים: רגעי שקט לסירוגין עם דחיפות חזקות
        const base = 4 + 19 * g.k * g.k;
        g.gp = gp;
        g.vx = -base * (0.3 + 1.7 * gp) + 3.5 * (1 - gp) * (1 - 0.6 * g.k);       // בשקט – מצליח להתקדם קצת; במשב – נזרק אחורה
        g.lift = 0;
        walkPh += dt * (7 + 7 * gp);                                            // במשב הרגליים מדשדשות מהר יותר
        if (gp > 0.45 && Math.random() < dt * 22)                              // אבק מתחת לרגליים שמחליקות אחורה
          particles.push({ x: PLAYER.x + 4 + g.gx + (Math.random() - 0.5) * 3, y: GROUND - 0.4, vx: -25 - 30 * gp, vy: -4 - Math.random() * 5, g: 10, life: 0.5, color: 'rgba(214,211,209,.85)', size: 0.9 + Math.random() * 0.8 });
      } else {                                                                  // המשב החזק: מתרומם ועף אחורה
        const e = Math.min(1, (g.t - B) / 0.5);
        g.vx = -GUST.push * (0.35 + 0.65 * e); g.lift = Math.min(10, (g.t - B) * 18);
      }
      g.gx = Math.min(GUST_ADV + 3, g.gx + g.vx * dt);                                    // בשקט מתקדם קצת, אבל לא עובר את החורשה
      if (g.want > 0) {                                                         // HOLD: נתפס בקנה שבהישג יד
        const hand = PLAYER.x + 4 + g.gx + 3;
        let best = null;
        GUST.stalks.forEach((_, i) => { const d = Math.abs(stalkX(o, i) - hand); if (d <= GUST.reach && (best === null || d < best.d)) best = { i, d }; });
        if (best) { g.held = best.i; g.want = 0; g.vx = 0; sfx('coin'); burst(stalkX(o, best.i), GROUND - GUST.grip, '#a3e635', 6, 16); }
      }
      if (PLAYER.x + 4 + g.gx < -8) {                                           // עף מהמסך – פגיעה
        g.phase = 'lost'; g.t = 0;
        if (o.demo) { flash = { text: HIT_WORD.gust, t: 1.2 }; o.hit = true; } else onHit(o);
        return;
      }
    }
    if (g.held !== null) {                                                      // מחזיק: הגוף מתרומם לאט עד שהוא מתנופף באוויר
      const want = Math.min(Math.PI / 2, Math.max(0.35, (g.k - 0.35) / 0.65 * Math.PI / 2));
      g.ang += (want - g.ang) * Math.min(1, dt * 5);
    }
    if (g.t >= total) { g.phase = 'calm'; g.t = 0; }
  } else if (g.phase === 'calm') {                                              // הטורנדו נחלש ונעלם
    const e = g.t / GUST.calm;
    g.k = 1 - e; tornado.k = 1 - e; tornado.a = 1 - e;
    g.ang = Math.max(0, g.ang - dt * 3.5);
    if (g.held === null) { g.lift = Math.max(0, g.lift - dt * 30); }
    if (g.t >= GUST.calm) {
      tornado = null; g.k = 0;
      if (!o.demo) cleared(o); else o.passed = true;
      g.phase = 'back'; g.t = 0; g.from = g.held !== null ? stalkX(o, g.held) - (PLAYER.x + 4) - 3 : g.gx; g.held = null; g.lift = 0;
    }
  } else if (g.phase === 'lost') {                                              // מחוץ למסך – מחכים שהסערה תיגמר
    g.k = g.t < 1.0 ? 1 : Math.max(0, 1 - (g.t - 1.0) / 0.7);
    tornado.a = Math.min(1, g.k + 0.1); tornado.k = Math.max(0.3, g.k);
    if (g.t >= 1.7) { tornado = null; g.phase = 'back'; g.t = 0; g.from = -PLAYER.x - 14; g.lift = 0; g.k = 0; }
  } else if (g.phase === 'back') {                                              // רץ חזרה למקום הרגיל
    const e = Math.min(1, g.t / GUST.back);
    g.gx = g.from * (1 - e);
    if (e >= 1) { g.phase = 'done'; g.t = 0; g.gx = 0; }
  } else if (g.phase === 'done') {
    g.k = 0; if (g.t > 0.2) gust = null;
  }
}

function holdCmd() {                                                            // HOLD: נתפס בקנה הקרוב (או יתפס ברגע הקרוב, כשיגיע לקנה)
  if (gust) { if (gustActive()) gust.want = GUST.want; return; }
  const pb = playerBox();
  const o = obstacles.find(o => o.type === 'gust' && !o.passed && !o.hit && stalkX(o, 2) - (pb.r + gustAdv) <= 48 && stalkX(o, 0) > pb.l - 40);
  if (o) o.holdWant = true;
}

function gustOff() {                                                            // כמה הנינג'ה זז מהמקום הרגיל (נסחף אחורה / רץ חזרה)
  if (!gust) return gustAdv;
  if (gust.held !== null && gust.phase !== 'back') return 0;                    // מחזיק – מצויר מהקנה
  return gust.gx;
}

/* ---------- אפקטים: פסי רוח, אבק ועלים ---------- */
let windStreaks = [];
function gustEffects(dt) {
  const k = windLevel;
  for (const s of windStreaks) { s.x -= s.v * dt; s.life -= dt; }
  windStreaks = windStreaks.filter(s => s.life > 0 && s.x + s.len > -20);
  if (k <= 0.05 || state === 'paused') return;
  if (Math.random() < k * 1.6 * dt * 30) windStreaks.push({ x: W + 10 + Math.random() * 20, y: 8 + Math.random() * (GROUND - 10), len: 6 + Math.random() * 14 * k, v: 90 + 120 * k, life: 1.6, a: 0.25 + 0.5 * k });
  if (k > 0.55 && Math.random() < (k - 0.5) * dt * 26)                         // אבק מהקרקע
    particles.push({ x: W * 0.4 + Math.random() * W * 0.6, y: GROUND - 0.5, vx: -60 - 60 * k, vy: -6 - Math.random() * 8, g: 8, life: 0.8, color: 'rgba(214,211,209,.8)', size: 1 + Math.random() });
  if (gust && k > 0.8 && Math.random() < dt * 8)                                // עלים שנתלשים מהקנים ועפים
    particles.push({ x: stalkX(gust.o, Math.floor(Math.random() * 3)), y: GROUND - GUST.h * (0.6 + Math.random() * 0.35), vx: -70 - Math.random() * 50, vy: (Math.random() - 0.5) * 16, g: 4, life: 1.2,
                     color: Math.random() < 0.5 ? '#65a30d' : '#84cc16', size: 1.4, rot: Math.random() * 6, vr: 8 + Math.random() * 8 });
}
function drawWind() {
  if (windStreaks.length) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 0.45;
    for (const s of windStreaks) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (s.a * Math.min(1, s.life * 2)).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + s.len * 0.5, s.y - 0.8, s.x + s.len, s.y); ctx.stroke();
    }
    ctx.restore();
  }
}

// טורנדו: משפך מסתובב, צר למטה ורחב למעלה, עם אבק בבסיס ועלים שמסתובבים סביבו
function drawTornado() {
  if (!tornado || tornado.a <= 0) return;
  const now = performance.now() / 1000, T = tornado, H = 78 * T.k, base = GROUND, x0 = T.x;
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, T.a));
  const rows = 16;
  for (let i = rows; i >= 0; i--) {                                             // טבעות מלמעלה למטה
    const q = i / rows, y = base - q * H, w = 3 + q * q * 24 * T.k;
    const cx = x0 + Math.sin(now * 3 + q * 4) * (2 + q * 4);                    // המשפך מתפתל
    ctx.fillStyle = 'rgba(148,163,184,' + (0.35 + 0.25 * (1 - q)) + ')';
    ctx.beginPath(); ctx.ellipse(cx, y, w, 2.2 + q * 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(241,245,249,.55)'; ctx.lineWidth = 0.5;
    const ph = now * 9 + i * 0.7;
    ctx.beginPath(); ctx.ellipse(cx, y, w * 0.8, 1.6 + q * 2, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + 1.8); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(214,211,209,.55)';                                     // ענן אבק בבסיס
  for (let k = 0; k < 6; k++) circle(x0 + Math.sin(now * 5 + k * 1.1) * 6, base - 1 - (k % 3), 3 + (k % 2) * 1.5);
  for (let k = 0; k < 7; k++) {                                                 // עלים ושברים מסתובבים
    const a = now * (5 + k * 0.4) + k * 0.9, q = 0.15 + (k / 7) * 0.8, r = 4 + q * q * 22 * T.k;
    const lx = x0 + Math.cos(a) * r, ly = base - q * H + Math.sin(a) * 1.5;
    ctx.fillStyle = k % 3 ? '#65a30d' : '#a16207';
    ctx.beginPath(); ctx.ellipse(lx, ly, 1.3, 0.5, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ---------- ציור הקנים ---------- */
// שלושה קני במבוק נפרדים, דקים ובהירים (בולטים מהרקע). הרוח מכופפת אותם שמאלה, והענפים נמשכים עם הרוח
function drawGustBamboo(o) {
  const now = performance.now() / 1000, k = windNow();
  GUST.stalks.forEach((dx, i) => {
    const bx = o.x + dx, h = GUST.h - (i % 2) * 6, w = 2.3, seed = i * 0.37 + 0.1;
    const held = gust && gust.o === o && gust.held === i;
    const sway = k * (9 + 3 * Math.sin(now * (6 + i) + i * 5)) + (held ? gust.ang * 3 : 0) + Math.sin(now * 1.3 + i) * 0.5;
    const tipX = bx - sway, tipY = GROUND - h + sway * 0.25;
    const pt = q => { const u = q * q; return [bx + (tipX - bx) * u, GROUND + (tipY - GROUND) * q]; };
    const col = i === 1 ? '#eab308' : '#facc15';                                // במבוק זהוב – ברור שבהם נתפסים
    ctx.fillStyle = col; ctx.beginPath();
    for (let j = 0; j <= 12; j++) { const [x, y] = pt(j / 12); ctx.lineTo(x - w / 2 * (1 - j / 30), y); }
    for (let j = 12; j >= 0; j--) { const [x, y] = pt(j / 12); ctx.lineTo(x + w / 2 * (1 - j / 30), y); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(161,98,7,.45)'; ctx.beginPath();                      // צל עדין בצד ימין – נראה עגול
    for (let j = 0; j <= 12; j++) { const [x, y] = pt(j / 12); ctx.lineTo(x + w * 0.1, y); }
    for (let j = 12; j >= 0; j--) { const [x, y] = pt(j / 12); ctx.lineTo(x + w / 2 * (1 - j / 30), y); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a16207';                                                  // מפרקים
    for (let j = 1; j < 8; j++) { const [x, y] = pt(j / 8); ctx.fillRect(x - w / 2 - 0.25, y, w + 0.5, 0.6); }
    ctx.fillStyle = 'rgba(101,163,13,.75)';                                     // פסים ירוקים דקים של במבוק זהוב
    for (let j = 0; j < 8; j++) { const [x, y] = pt(j / 8 + 0.06); ctx.fillRect(x - 0.25 + (j % 2 ? 0.4 : -0.4), y - 2.2, 0.5, 2.6); }
    for (let j = 4; j < 8; j++) {                                               // ענפים ועלים בחלק העליון
      const q = j / 8, [x, y] = pt(q), dir = (j + i) % 2 ? 1 : -1;
      const flutter = Math.sin(now * (14 + j) + seed * 3 + j) * (0.12 + 0.3 * k);
      const ang = (dir > 0 ? -0.6 : 3.75) * (1 - k) + (Math.PI + 0.12) * k + flutter;
      const bl = 3.5 + (j % 2);
      const ex = x + Math.cos(ang) * bl, ey = y + Math.sin(ang) * bl * (1 - 0.6 * k) - 0.5;
      ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      for (let m = 0; m < 3; m++) {
        const la = ang + (m - 1) * (0.55 - 0.35 * k) + flutter * 0.6, lx = ex + Math.cos(la) * 1.5, ly = ey + Math.sin(la) * 1.5;
        ctx.fillStyle = m === 1 ? '#65a30d' : '#4d7c0f';
        ctx.beginPath(); ctx.ellipse(lx, ly, 2.2, 0.6, la, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(bx, GROUND + 0.5, 2.6, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  });
  if (!o.passed && !o.hit && (!gust || gust.o !== o || gustActive())) label('HOLD', o.x + GUST.stalks[1], GROUND - GUST.h - 6, 4, '#fde047', '#1e293b');
}

/* ---------- הנינג'ה בסערה ---------- */
// הליכה מכופפת נגד הרוח. k = חוזק הרוח, gp = משב עכשיו (0..1): בשקט נשען קדימה, במשב הגוף נדחף לאחור והיד מכסה את הפנים
function poseStruggle(k, gp) {
  const R = poseRun(walkPh);
  R.lean = 0.45 + 0.35 * k - 0.35 * gp; R.spine = 0.3 - 0.15 * gp; R.headTilt = -0.4 + 0.25 * gp;
  R.bob = (R.bob || 0) * 0.5;
  R.arms = [[-0.9 - 0.6 * gp, -0.4 - 0.4 * gp], [1.75 + 0.2 * gp, 2.9]];
  R.eyes = gp > 0.5 || k > 0.8 ? 'wide' : 'squint';
  return R;
}
function gustSlow() { return gust ? 1 : 1 - 0.72 * gustApproach * gustApproach; }   // מהירות העולם כשמתקרבים לטורנדו

function gustPlayerPose(P, now) {
  if (!gust && gustApproach > 0.4) return poseStruggle(0.6 * gustApproach, 0);   // עוד לפני העצירה – עובר מריצה להליכה מאומצת
  if (!gust || gust.held !== null) return P;
  const g = gust;
  if (g.phase === 'back') { const R = poseRun(now * 14); R.lean = 0.3; return R; }   // רץ חזרה
  if (g.phase === 'storm' && g.lift > 1) { const F = poseFly(now * 3); F.lean = -0.7; F.eyes = 'wide'; F.headTilt = 0.4; return F; }   // עף אחורה
  if (g.phase === 'storm') {                                                    // הולך מכופף נגד הרוח: צעדים איטיים, ראש למטה, יד מגינה על הפנים
    return poseStruggle(g.k, g.gp || 0);
  }
  return P;
}
// מצייר את הנינג'ה כשהוא מחזיק בקנה (רק הידיים על הקנה, הגוף באוויר) או עף. מחזיר true אם צויר כאן
function drawGustNinja() {
  if (!gust) return false;
  const g = gust, now = performance.now() / 1000;
  if (g.phase === 'lost') return true;                                          // מחוץ למסך
  if (g.held !== null && g.phase !== 'back') {
    const flap = Math.sin(now * 13) * 0.08 * g.ang, P = poseIdle(now);
    Object.assign(P, { hipY: -4.6, lean: 0, spine: 0, bob: 0, headTilt: -0.15, eyes: 'squint',
                       arms: [[Math.PI - 0.08, Math.PI - 0.05], [Math.PI + 0.06, Math.PI + 0.04]],          // שתי ידיים ישרות מעל הראש – על הקנה
                       legs: [[-0.2 + Math.sin(now * 15) * 0.35 * g.ang, -0.1], [0.15 - Math.sin(now * 15 + 1.5) * 0.35 * g.ang, 0.05]] });   // רגליים מתנופפות
    const [lx, ly] = handAt(0, 0, 1, 1, P);                                     // איפה הידיים ביחס לכפות הרגליים
    const hx = stalkX(g.o, g.held) - 0.8, hy = GROUND + ly;                     // הידיים על הקנה, בגובה שבו הרגליים נוגעות בקרקע כשעומדים
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(g.ang + flap);              // הגוף נמשך שמאלה עם הרוח – עד שהוא אופקי באוויר
    drawFigure({ fx: -lx, fy: -ly, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    ctx.restore();
    return true;
  }
  if (g.phase === 'storm' && g.lift > 0.5) {                                    // עף אחורה באוויר, מסתחרר קצת
    const fx = PLAYER.x + 4, fy = GROUND - g.lift,                              // (ההזזה אחורה כבר הוחלה ב-drawNinja)
          P = gustPlayerPose(poseIdle(now), now);
    ctx.save(); ctx.translate(fx, fy - 6); ctx.rotate(-0.5 - Math.sin(now * 6) * 0.25);
    drawFigure({ fx: 0, fy: 6, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    ctx.restore();
    return true;
  }
  return false;
}
