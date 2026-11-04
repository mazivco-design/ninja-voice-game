/* ninja-voice-game – sushi.js
   בונוס סושי (אב-טיפוס): מסך לבן, יד עם צ'ופסטיקס, רול סושי זז על מסוע.
   אומרים CATCH כשהרול בין המקלות → המקלות תופסים → תקריב של הנינג'ה: הפה נפתח, הסושי נכנס, לועס ומחייך.
   נפתח מכפתור 🍣 בתפריט. עוד לא משולב בשלבים – רק לצפייה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const SUSHI = {
  rolls: 5,
  speeds: [20, 24, 28, 33, 38],   // מהירות המסוע לכל רול (יחידות u בשנייה)
  zone: 10,                       // חצי רוחב אזור התפיסה (u) – מרכז הרול צריך להיות עד כאן מהמרכז
  late: 0.45,                     // סלחנות לאיחור של הקול: גם אם הרול היה באזור לפני חצי שנייה – נתפס
  readyT: 2.2, grabT: 0.95, missT: 0.45, faceT: 3.7, gapT: 0.7,
  kinds: [
    { fill: '#fb923c', dot: '#fed7aa', name: 'salmon' },
    { fill: '#4ade80', dot: '#bbf7d0', name: 'cucumber' },
    { fill: '#ef4444', dot: '#fecaca', name: 'tuna' },
    { fill: '#facc15', dot: '#fef9c3', name: 'egg' },
    { fill: '#fb923c', dot: '#fed7aa', name: 'salmon' }
  ]
};
let sushi = null;

async function openSushi() {
  stopAudio(); stopSpeak();
  hideAllOverlays();
  ['hudFree', 'hudStage', 'progress', 'catchHud', 'endBtn', 'pauseBtn', 'skipBtn', 'labBtn', 'sushiBtn'].forEach(id => $(id).classList.add('hide'));
  $('lives').textContent = '';
  state = 'sushi';
  sushiReset();
  if (model) { listenWords = ['catch']; await ensureAudio(); }   // מקשיבים רק ל-CATCH
}
function sushiReset() {
  sushi = { phase: 'ready', t: 0, idx: 0, caught: 0, x: 0, hist: [], belt: 0, cool: 0, snapX: 0, results: [], sparks: [] };
}
function closeSushi() { sushi = null; toMenu(); }

// יחידה = אחוז מהצלע הקצרה של המסך
function sU() { return Math.min(cw, ch) / 100; }
function sushiGeo() {
  const u = sU();
  const cx = cw * 0.5, beltY = ch * 0.68;
  return { u, cx, beltY, rw: 15 * u, rh: 8 * u, ry: 3.2 * u };
}

function sushiStartRoll() {
  const g = sushiGeo();
  sushi.phase = 'move'; sushi.t = 0; sushi.x = -g.rw; sushi.hist = []; sushi.cool = 0;
}

function sushiCatch() {
  if (!sushi || sushi.phase !== 'move' || sushi.cool > 0) return;
  const g = sushiGeo();
  const zone = SUSHI.zone * g.u;
  const now = sushi.t;
  const was = sushi.hist.find(h => now - h[0] <= SUSHI.late && Math.abs(h[1] - g.cx) <= zone);   // היה באזור לאחרונה
  if (Math.abs(sushi.x - g.cx) <= zone || was) {
    sushi.phase = 'grab'; sushi.t = 0; sushi.snapX = sushi.x;
    sushiTone('snap');
  } else {
    sushi.phase = 'miss'; sushi.missT = 0; sushi.cool = SUSHI.missT;
    sushiTone('click');
  }
}

function sushiTone(k) {
  if (typeof sfxCtx === 'undefined' || !sfxCtx) return;
  try {
    if (k === 'click') { tone(1800, 1200, 0.05, 'square', 0.04); tone(1500, 0, 0.05, 'square', 0.03, 0.06); }
    else if (k === 'snap') { tone(1300, 900, 0.06, 'triangle', 0.06); }
    else if (k === 'open') { tone(300, 520, 0.18, 'sine', 0.05); }
    else if (k === 'gulp') { tone(420, 160, 0.16, 'sine', 0.07); }
    else if (k === 'nom') { tone(260, 200, 0.08, 'triangle', 0.05); }
    else if (k === 'yum') { [660, 880, 1175].forEach((f, i) => tone(f, 0, 0.16, 'triangle', 0.06, i * 0.08)); }
    else if (k === 'oops') { tone(400, 250, 0.2, 'triangle', 0.05); }
  } catch (e) {}
}

function updateSushi(dt) {
  if (!sushi) return;
  const S = sushi, g = sushiGeo();
  S.t += dt;
  if (S.cool > 0) S.cool -= dt;
  S.sparks = S.sparks.filter(p => (p.life -= dt) > 0);
  for (const p of S.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * g.u * dt * 0.3; }
  const v = SUSHI.speeds[Math.min(S.idx, SUSHI.speeds.length - 1)] * g.u;
  if (S.phase === 'ready' || S.phase === 'move' || S.phase === 'miss' || S.phase === 'gap') S.belt += v * dt;

  if (S.phase === 'ready') { if (S.t >= SUSHI.readyT) sushiStartRoll(); }
  else if (S.phase === 'move' || S.phase === 'miss') {
    S.x += v * dt;
    S.hist.push([S.t, S.x]); if (S.hist.length > 60) S.hist.shift();
    if (S.phase === 'miss' && (S.missT += dt) >= SUSHI.missT) S.phase = 'move';
    if (S.x > cw + g.rw) { S.results.push(false); sushiTone('oops'); sushiNext(); }
  } else if (S.phase === 'grab') {
    if (S.t >= SUSHI.grabT) { S.phase = 'face'; S.t = 0; }
  } else if (S.phase === 'face') {
    const t = S.t, tp = t - dt;
    if (tp < 0.6 && t >= 0.6) sushiTone('open');
    if (tp < 1.15 && t >= 1.15) sushiTone('gulp');
    for (const k of [1.55, 1.85, 2.15]) if (tp < k && t >= k) sushiTone('nom');
    if (tp < 2.45 && t >= 2.45) {
      sushiTone('yum');
      const R = 30 * g.u;
      for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = (20 + Math.random() * 25) * g.u;
        S.sparks.push({ x: cw / 2 + Math.cos(a) * R * 0.9, y: ch * 0.5 + Math.sin(a) * R * 0.9, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10 * g.u, life: 0.9, col: ['#facc15', '#f472b6', '#38bdf8'][i % 3] }); }
    }
    if (t >= SUSHI.faceT) { S.caught++; S.results.push(true); sushiNext(); }
  } else if (S.phase === 'gap') { if (S.t >= SUSHI.gapT) sushiStartRoll(); }
}
function sushiNext() {
  const S = sushi;
  S.idx++;
  if (S.idx >= SUSHI.rolls) { S.phase = 'end'; S.t = 0; sushiTone('yum'); return; }
  S.phase = 'gap'; S.t = 0; S.x = -999;
}

/* ============================================================
   ציור
   ============================================================ */
const sEase = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const sSeg = (t, a, b) => sEase((t - a) / (b - a));

function drawSushi() {
  if (!sushi) return;
  const S = sushi, g = sushiGeo(), u = g.u;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch);

  if (S.phase === 'face') drawSushiFace(S.t, g);
  else if (S.phase === 'end') drawSushiEnd(g);
  else drawSushiBelt(g);

  for (const p of S.sparks) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; sStar(p.x, p.y, 1.6 * u); }
  ctx.globalAlpha = 1;

  // שורת מעקב: 5 רולים למעלה
  if (S.phase !== 'end') {
    const r = 2.6 * u, gap = 7 * u, x0 = cw / 2 - gap * (SUSHI.rolls - 1) / 2, y = 7 * u + 8;
    for (let i = 0; i < SUSHI.rolls; i++) {
      const res = S.results[i];
      ctx.globalAlpha = res === undefined ? (i === S.idx ? 0.9 : 0.25) : res ? 1 : 0.25;
      drawMakiTop(x0 + i * gap, y, r, SUSHI.kinds[i]);
      if (res === false) { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5 * u; ctx.beginPath(); ctx.moveTo(x0 + i * gap - r, y - r); ctx.lineTo(x0 + i * gap + r, y + r); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  // כפתור יציאה
  ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(7 * u, 7 * u + 8, 4.2 * u, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.8 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(5.4 * u, 5.4 * u + 8); ctx.lineTo(8.6 * u, 8.6 * u + 8); ctx.moveTo(8.6 * u, 5.4 * u + 8); ctx.lineTo(5.4 * u, 8.6 * u + 8); ctx.stroke();
}

function sText(txt, x, y, size, col, weight) {
  ctx.font = (weight || 800) + ' ' + size + 'px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}
function sStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

// רול מאקי במבט מלמעלה (לשורת המעקב)
function drawMakiTop(x, y, r, k) {
  ctx.fillStyle = '#1f2a1f'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = k.fill; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
}

// רול מאקי בצד – גליל עומד: גוף נורי + עיגול עליון עם אורז ומילוי. (x = מרכז, y = תחתית)
function drawMaki(x, y, g, k, sc) {
  sc = sc || 1;
  const w = g.rw * sc, h = g.rh * sc, ry = g.ry * sc, u = g.u * sc;
  const top = y - h;
  // גוף
  ctx.fillStyle = '#18241c';
  ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, ry, 0, Math.PI, 0, true); ctx.lineTo(x + w / 2, top); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - w * 0.32, top + u, w * 0.12, h - u * 1.5);   // ברק על הנורי
  // צד עליון
  ctx.fillStyle = '#18241c'; ctx.beginPath(); ctx.ellipse(x, top, w / 2, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.ellipse(x, top, w / 2 - 1.1 * u, ry - 0.55 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e7e2d3';                                                         // גרגירי אורז
  for (let i = 0; i < 9; i++) { const a = i * 2.39, rr = 0.55 + (i % 3) * 0.13; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * (w / 2 - 1.2 * u) * rr, top + Math.sin(a) * (ry - 0.6 * u) * rr, 0.55 * u, 0.25 * u, a, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = k.fill; ctx.beginPath(); ctx.ellipse(x, top, w * 0.18, ry * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = k.dot; ctx.beginPath(); ctx.ellipse(x - w * 0.05, top - ry * 0.12, w * 0.06, ry * 0.14, 0, 0, Math.PI * 2); ctx.fill();
}

// המקלות + יד מהצד (לפי הסרטון): הזרוע נכנסת מימין, המקלות כמעט אנכיים.
// המקל הימני קבוע – נח בגומה של האגודל ועל הקמיצה. המקל השמאלי זז – האגודל מלמעלה והאצבע המורה המקופלת מזיזים אותו,
// ולכן קצה האגודל וקצה האצבע זזים יחד איתו. (tx,ty) = האמצע בין הקצוות; gap = המרווח בין הקצוות
function drawSticks(tx, ty, gap, g) {
  const u = g.u, hu = 1.5 * u, GRIP = 36 * u;
  const dl = Math.hypot(0.28, 0.96), d = [-0.28 / dl, 0.96 / dl], e = [0.96 / dl, 0.28 / dl];   // d: מהיד אל הקצוות · e: ימינה, אל הזרוע
  const half = (g.rw - 0.4 * u) / 2;
  const FT = [tx + e[0] * half, ty + e[1] * half];                                 // קצה המקל הקבוע
  const O = [FT[0] - d[0] * GRIP, FT[1] - d[1] * GRIP];                            // נקודת האחיזה על המקל הקבוע
  const L = (p, q) => [O[0] + d[0] * p * hu + e[0] * q * hu, O[1] + d[1] * p * hu + e[1] * q * hu];
  const A = GRIP / hu, tipQ = -gap / hu;
  const qm = p => -2.4 + (tipQ + 2.4) * ((p + 3) / (A + 3));                      // המקל הזז – מסתובב קצת מעל היד, ליד הקבוע
  const skin = '#f2c29b', line = '#b97c58', nail = '#f9dcc4';

  const path = (pts) => {                                                          // צורה סגורה ומעוגלת דרך הנקודות
    const P = pts.map(p => L(p[0], p[1])), m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.beginPath(); const s = m(P[P.length - 1], P[0]); ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < P.length; i++) { const c = P[i], n = m(P[i], P[(i + 1) % P.length]); ctx.quadraticCurveTo(c[0], c[1], n[0], n[1]); }
    ctx.closePath();
  };
  const shape = (pts, fill) => { ctx.fillStyle = fill || skin; path(pts); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 0.15 * hu; ctx.lineJoin = 'round'; ctx.stroke(); };
  const curve = (pts) => { const P = pts.map(p => L(p[0], p[1])); ctx.strokeStyle = line; ctx.lineWidth = 0.15 * hu; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length - 1; i++) { const n = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; ctx.quadraticCurveTo(P[i][0], P[i][1], n[0], n[1]); } ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]); ctx.stroke(); };
  const stick = (qf, back) => {
    const p0 = L(back, qf(back)), p1 = L(A, qf(A));
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const w0 = 0.85 * u, w1 = 0.38 * u;
    ctx.fillStyle = '#e8d3b0';
    ctx.beginPath(); ctx.moveTo(p0[0] + nx * w0, p0[1] + ny * w0); ctx.lineTo(p1[0] + nx * w1, p1[1] + ny * w1); ctx.lineTo(p1[0] - nx * w1, p1[1] - ny * w1); ctx.lineTo(p0[0] - nx * w0, p0[1] - ny * w0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,110,60,0.25)';
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p1[0] + nx * w1, p1[1] + ny * w1); ctx.lineTo(p0[0] + nx * w0, p0[1] + ny * w0); ctx.closePath(); ctx.fill();
    const k = t => [p0[0] + dx * t, p0[1] + dy * t];
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2 * w0 * 0.93; ctx.lineCap = 'butt';
    const r0 = k(0.05), r1 = k(0.12); ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
  };

  // כף היד והזרוע (בלי האגודל והאצבע המורה). למטה – האמה והקמיצה מקופלות
  shape([[-4.4, 60], [-4.4, 6.4], [-4.0, 0.8], [-2.4, -1.4], [0.4, -2.1], [2.4, -2.5], [4.8, -3.5], [5.9, -3.1], [6.4, -2.0],
         [7.2, -1.7], [7.8, -0.4], [6.2, 2.0], [3.6, 5.9], [3.0, 60]]);
  curve([[5.0, -3.3], [5.8, -2.2], [6.3, -1.8]]);                                   // קו בין האמה לקמיצה
  // שרוול נינג'ה
  ctx.fillStyle = '#1e293b'; path([[-5.2, 70], [-5.2, 8.6], [-4.8, 7.8], [3.8, 7.8], [4.2, 8.6], [4.2, 70]]); ctx.fill();
  ctx.fillStyle = '#0f172a'; path([[-5.2, 10.0], [-5.2, 8.6], [-4.8, 7.8], [3.8, 7.8], [4.2, 8.6], [4.2, 10.0]]); ctx.fill();

  // המקלות
  stick(() => 0, -8.5);
  stick(qm, -8);

  // אצבע מורה – יורדת מהיד ומתקפלת סביב המקל הזז, הקצה פונה מטה-שמאלה
  const it = qm(4.2);
  shape([[1.0, 0.6], [2.0, -1.4], [3.2, it + 1.0], [4.4, it - 0.35], [5.3, it - 0.1], [5.4, it + 0.8], [4.6, -1.0], [3.6, 0.8]]);
  const ni = L(4.75, it + 0.05); ctx.fillStyle = nail; ctx.beginPath(); ctx.ellipse(ni[0], ni[1], 0.4 * hu, 0.28 * hu, Math.atan2(d[1], d[0]), 0, Math.PI * 2); ctx.fill();
  // אגודל – מונח מעל, הקצה לוחץ על המקל הזז מלמעלה
  const tt = qm(1.0);
  shape([[-3.4, 4.0], [-2.6, 0.6], [-0.8, tt + 1.5], [0.6, tt - 0.45], [1.6, tt + 0.25], [1.3, -0.8], [0.6, 1.6], [-0.2, 4.2]]);
  const nt = L(0.95, tt + 0.05); ctx.fillStyle = nail; ctx.beginPath(); ctx.ellipse(nt[0], nt[1], 0.45 * hu, 0.32 * hu, Math.atan2(d[1], d[0]), 0, Math.PI * 2); ctx.fill();
  curve([[-1.6, 1.8], [-0.6, 0.8], [-0.9, -0.4]]);                                 // קפל במפרק האגודל
}

function drawSushiBelt(g) {
  const S = sushi, u = g.u, cx = g.cx, by = g.beltY;
  // מסוע
  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, by - 0.5 * u, cw, 6 * u);
  ctx.fillStyle = '#e2e8f0';
  const step = 8 * u, off = S.belt % step;
  for (let x = -step + off; x < cw + step; x += step) ctx.fillRect(x, by + 0.6 * u, 0.6 * u, 4 * u);
  ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, by + 5.5 * u, cw, 0.8 * u);

  // אזור התפיסה – מאיר כשהרול בפנים
  const zone = SUSHI.zone * u;
  const inZone = (S.phase === 'move') && Math.abs(S.x - cx) <= zone;
  ctx.fillStyle = inZone ? 'rgba(74,222,128,0.28)' : 'rgba(148,163,184,0.16)';
  ctx.beginPath(); ctx.ellipse(cx, by + 0.4 * u, zone + g.rw * 0.35, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill();

  const k = SUSHI.kinds[Math.min(S.idx, SUSHI.kinds.length - 1)];
  const hoverY = by - g.rh - 6 * u, gripY = by - g.rh * 0.5;
  const open = g.rw + 2.5 * u, hold = g.rw - 0.4 * u;
  let tipY = hoverY, gap = open, sx = S.x, sy = by;

  if (S.phase === 'grab') {
    const t = S.t;
    const dip = sSeg(t, 0, 0.14), close = sSeg(t, 0.1, 0.26), up = sSeg(t, 0.32, 0.8);
    sx = S.snapX + (cx - S.snapX) * sSeg(t, 0, 0.2);
    tipY = hoverY + (gripY - hoverY) * dip - up * 26 * u;
    gap = open + (hold - open) * close;
    sy = by - up * 26 * u + (up > 0 ? Math.sin(t * 22) * 0.3 * u * (1 - up) : 0);
  } else if (S.phase === 'miss') {
    const m = S.missT / SUSHI.missT, c = m < 0.35 ? sSeg(m, 0, 0.18) : 1 - sSeg(m, 0.45, 1);
    tipY = hoverY + (gripY - hoverY) * c; gap = open + (0.3 * u - open) * c;
  } else if (S.phase === 'ready' || S.phase === 'move' || S.phase === 'gap') {
    gap = open + Math.sin(S.t * 4) * 0.6 * u;                                         // המקלות "מחכים" ונושמים קצת
  }

  // צל הרול
  if (S.phase !== 'ready' && S.phase !== 'gap') {
    ctx.fillStyle = 'rgba(15,23,42,0.10)';
    ctx.beginPath(); ctx.ellipse(sx, by + 0.6 * u, g.rw * 0.55, 1.4 * u, 0, 0, Math.PI * 2); ctx.fill();
    drawMaki(sx, sy, g, k);
  }
  drawSticks(cx, tipY, gap, g);

  // טקסטים
  if (S.phase === 'ready') {
    sText('🍣 Sushi Bonus!', cx, by + 14 * u, 7 * u, '#0f172a');
    sText('Say CATCH when the sushi is between the sticks', cx, by + 21 * u, 3.4 * u, '#475569', 600);
  } else if (S.phase === 'move' && inZone) {
    sText('CATCH!', cx, by + 13 * u, 6 * u, '#16a34a');
  } else if (S.phase === 'miss') {
    sText('Too soon!', cx, by + 13 * u, 4.5 * u, '#94a3b8');
  } else if (S.phase === 'gap' && S.results[S.results.length - 1] === false) {
    sText('Oops! Next one…', cx, by + 13 * u, 4.5 * u, '#94a3b8');
  } else if (S.phase === 'grab' && S.t > 0.3) {
    sText('Got it!', cx, by + 13 * u, 6 * u, '#16a34a');
  }
}

// תקריב של פני הנינג'ה: הפה נפתח, הסושי נכנס, לועס ומחייך
function drawSushiFace(t, g) {
  const u = g.u, cx = cw / 2, cy = ch * 0.52;
  const pop = 0.88 + 0.12 * sSeg(t, 0, 0.3);
  const R = 30 * u * pop;
  const k = SUSHI.kinds[Math.min(sushi.idx, SUSHI.kinds.length - 1)];
  const open = sSeg(t, 0.55, 0.95) * (1 - sSeg(t, 1.2, 1.35));                    // הפה נפתח לפני שהסושי מגיע ונסגר אחריו
  const chew = t > 1.35 && t < 2.35 ? Math.abs(Math.sin((t - 1.35) * Math.PI * 3)) : 0;
  const happy = sSeg(t, 2.35, 2.6);
  const bob = Math.sin(t * 3) * 0.4 * u + chew * 0.6 * u;

  ctx.save(); ctx.translate(cx, cy + bob);
  // זנבות סרט הראש מאחורה
  const wv = Math.sin(t * 6);
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath(); ctx.moveTo(-R * 0.86, -R * 0.42); ctx.quadraticCurveTo(-R * 1.25, -R * 0.55 + wv * 2 * u, -R * 1.45, -R * 0.25 + wv * 3 * u); ctx.lineTo(-R * 1.38, -R * 0.12 + wv * 3 * u); ctx.quadraticCurveTo(-R * 1.15, -R * 0.35, -R * 0.86, -R * 0.24); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-R * 0.86, -R * 0.36); ctx.quadraticCurveTo(-R * 1.2, -R * 0.2 - wv * 2 * u, -R * 1.32, R * 0.08 - wv * 2 * u); ctx.lineTo(-R * 1.22, R * 0.14 - wv * 2 * u); ctx.quadraticCurveTo(-R * 1.08, -R * 0.12, -R * 0.86, -R * 0.2); ctx.fill();
  // ראש
  ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(-R * 0.35, -R * 0.55, R * 0.32, R * 0.16, -0.5, 0, Math.PI * 2); ctx.fill();   // ברק
  // סרט ראש
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#dc2626'; ctx.fillRect(-R, -R * 0.52, R * 2, R * 0.2);
  ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(0, -R * 0.42, R * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // רצועת העור והעיניים
  const ew = R * 1.25, eh = R * 0.36, ey = -R * 0.1;
  ctx.fillStyle = '#fcd9b6'; sRound(-ew / 2, ey - eh / 2, ew, eh, eh * 0.45); ctx.fill();
  // לחיים סמוקות בזמן החיוך
  if (happy > 0) { ctx.fillStyle = 'rgba(244,114,182,' + 0.45 * happy + ')'; ctx.beginPath(); ctx.ellipse(-ew * 0.38, ey + eh * 0.18, R * 0.09, R * 0.05, 0, 0, Math.PI * 2); ctx.ellipse(ew * 0.38, ey + eh * 0.18, R * 0.09, R * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
  const exs = [-R * 0.24, R * 0.24];
  ctx.fillStyle = '#0f172a'; ctx.strokeStyle = '#0f172a'; ctx.lineCap = 'round';
  for (const ex of exs) {
    if (happy > 0.5) {                                                           // עיניים מחייכות ^ ^
      ctx.lineWidth = R * 0.055; ctx.beginPath(); ctx.arc(ex, ey + R * 0.04, R * 0.08, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (chew > 0) {                                                       // לועס – עיניים עצומות בהנאה
      ctx.lineWidth = R * 0.045; ctx.beginPath(); ctx.moveTo(ex - R * 0.08, ey); ctx.lineTo(ex + R * 0.08, ey); ctx.stroke();
    } else {
      const big = 1 + 0.35 * open;                                               // עיניים נפתחות כשהסושי מתקרב
      sRound(ex - R * 0.06 * big, ey - R * 0.085 * big, R * 0.12 * big, R * 0.17 * big, R * 0.05); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + R * 0.02, ey - R * 0.04 * big, R * 0.025, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0f172a';
    }
  }
  // הפה (חור במסכה)
  const my = R * 0.42;
  if (open > 0.02) {
    const mw = R * (0.16 + 0.14 * open), mh = R * 0.26 * open;
    ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.ellipse(0, my, mw, Math.max(mh, R * 0.02), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.ellipse(0, my + mh * 0.5, mw * 0.6, mh * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  } else if (chew > 0) {                                                         // לחיים מלאות ופה גלי
    ctx.fillStyle = '#273449'; ctx.beginPath(); ctx.ellipse(-R * 0.28, my - R * 0.02, R * (0.12 + chew * 0.03), R * (0.1 + chew * 0.03), 0, 0, Math.PI * 2); ctx.ellipse(R * 0.28, my - R * 0.02, R * (0.12 + chew * 0.03), R * (0.1 + chew * 0.03), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fcd9b6'; ctx.lineWidth = R * 0.035;
    ctx.beginPath(); ctx.moveTo(-R * 0.13, my); ctx.quadraticCurveTo(-R * 0.06, my - R * 0.05 * chew, 0, my); ctx.quadraticCurveTo(R * 0.06, my + R * 0.05 * chew, R * 0.13, my); ctx.stroke();
  } else if (happy > 0) {                                                        // חיוך גדול
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.moveTo(-R * 0.24, my - R * 0.04); ctx.quadraticCurveTo(0, my + R * 0.32 * happy, R * 0.24, my - R * 0.04); ctx.quadraticCurveTo(0, my + R * 0.06, -R * 0.24, my - R * 0.04); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-R * 0.2, my - R * 0.02); ctx.quadraticCurveTo(0, my + R * 0.1, R * 0.2, my - R * 0.02); ctx.quadraticCurveTo(0, my + R * 0.04, -R * 0.2, my - R * 0.02); ctx.fill();
  } else {                                                                      // פה קטן סגור
    ctx.strokeStyle = '#fcd9b6'; ctx.lineWidth = R * 0.03; ctx.beginPath(); ctx.moveTo(-R * 0.08, my); ctx.lineTo(R * 0.08, my); ctx.stroke();
  }
  ctx.restore();

  // המקלות מביאים את הסושי לפה
  const mouthX = cx, mouthY = cy + bob + R * 0.42;
  const sc = 1.15;
  const inK = sSeg(t, 0.25, 1.05);                        // מגיע מימין למעלה
  const eat = sSeg(t, 1.05, 1.22);                        // נכנס לפה
  const outK = sSeg(t, 1.25, 1.75);                       // המקלות יוצאים
  const hold = g.rw * sc - 0.4 * u;
  if (outK < 1) {
    let tx = mouthX + (1 - inK) * 55 * u + outK * 60 * u, ty = mouthY - g.rh * sc * 0.5 - (1 - inK) * 30 * u - outK * 30 * u;
    if (eat < 1) {
      const s2 = sc * (1 - 0.55 * eat);
      ctx.save();
      if (eat > 0) { ctx.beginPath(); ctx.ellipse(mouthX, mouthY, R * 0.32, R * 0.4, 0, 0, Math.PI * 2); ctx.rect(cw, 0, -cw, ch); ctx.clip('evenodd'); }   // נעלם בתוך הפה
      drawMaki(tx, ty + g.rh * sc * 0.5 + eat * 2 * u, g, k, s2);
      ctx.restore();
    }
    drawSticks(tx, ty, eat > 0 ? hold * (1 - 0.6 * eat) + 0.2 * u : hold, Object.assign({}, g, { u: u * 1.1 }));
  }
  if (happy > 0) {
    ctx.globalAlpha = happy;
    sText('Yum! 😋', cx + R * 1.15, cy - R * 0.85, 6 * u, '#ea580c');
    ctx.globalAlpha = 1;
  }
}
function sRound(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

let sushiBtns = [];
function drawSushiEnd(g) {
  const S = sushi, u = g.u, cx = cw / 2;
  sText(S.caught === SUSHI.rolls ? 'Perfect! 🎉' : 'Great job!', cx, ch * 0.22, 8 * u, '#0f172a');
  const r = 4.5 * u, gap = 12 * u, x0 = cx - gap * (SUSHI.rolls - 1) / 2;
  for (let i = 0; i < SUSHI.rolls; i++) { ctx.globalAlpha = S.results[i] ? 1 : 0.2; drawMakiTop(x0 + i * gap, ch * 0.42, r, SUSHI.kinds[i]); }
  ctx.globalAlpha = 1;
  sText('You caught ' + S.caught + ' sushi!', cx, ch * 0.56, 5 * u, '#475569', 700);
  const bw = 30 * u, bh = 10 * u, y = ch * 0.7;
  sushiBtns = [{ id: 'again', x: cx - bw - 3 * u, y, w: bw, h: bh, txt: '↻ Again', col: '#16a34a' }, { id: 'menu', x: cx + 3 * u, y, w: bw, h: bh, txt: 'Menu', col: '#475569' }];
  for (const b of sushiBtns) { ctx.fillStyle = b.col; sRound(b.x, b.y, b.w, b.h, 2.5 * u); ctx.fill(); sText(b.txt, b.x + b.w / 2, b.y + b.h / 2, 4.2 * u, '#fff'); }
}

// נגיעה במסך: ✕ יוצא, בסוף – כפתורים, אחרת נגיעה = CATCH (נוח לבדיקה בלי מיקרופון)
canvas.addEventListener('pointerdown', e => {
  if (state !== 'sushi' || !sushi) return;
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, u = sU();
  if (Math.hypot(x - 7 * u, y - 7 * u - 8) < 6 * u) { closeSushi(); return; }
  if (sushi.phase === 'end') {
    const b = sushiBtns.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (b && b.id === 'again') sushiReset(); else if (b) closeSushi();
    return;
  }
  sushiCatch();
});
$('sushiBtn').onclick = openSushi;
