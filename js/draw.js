/* ninja-voice-game – draw.js
   ציור: עולמות, מכשולים והנינג'ה
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   ציור
   ============================================================ */
let cw = 0, ch = 0, scale = 1, ox = 0, oy = 0;

// מצמידים את המשחק בדיוק לשטח שרואים (Safari מזיז אותו לפעמים מתחת לשורת הכתובת)
function fitApp() {
  const vv = window.visualViewport, a = $('app');
  if (!vv) return;
  a.style.top = vv.offsetTop + 'px'; a.style.left = vv.offsetLeft + 'px';
  a.style.width = vv.width + 'px'; a.style.height = vv.height + 'px';
}
function resize() {
  const dpr = window.devicePixelRatio || 1;
  fitApp();
  const r = $('app').getBoundingClientRect();          // הגודל שבאמת רואים (בלי שורת הכתובת של Safari)
  cw = r.width || window.innerWidth; ch = r.height || window.innerHeight;
  window.scrollTo(0, 0);
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.min(cw / W, ch / H);
  ox = (cw - W * scale) / 2;
  oy = (ch - H * scale) * 0.75;   // במצב לאורך – יותר שמיים, פחות אדמה
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 300));
if (window.visualViewport) { window.visualViewport.addEventListener('resize', resize); window.visualViewport.addEventListener('scroll', resize); }
// אין גלילה של הדף: גרירה עובדת רק בתוך רשימות שבאמת צריך לגלול (רשימת שחקנים)
document.addEventListener('touchmove', e => { if (!e.target.closest('.playerGrid')) e.preventDefault(); }, { passive: false });
window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
resize();

// מדבקת נקודות מעל מכשול במסע – כמה הוא שווה
// LEAP: טבעת אש בתוך הפתח בקיר. front=false – החצי האחורי, front=true – החצי הקדמי (מעל הנינג'ה)
function drawFireRing(o, front) {
  const now = performance.now() / 1000, cx = o.x + WINDOW.w / 2, cy = (WINDOW.top + WINDOW.bot) / 2;
  const ry = (WINDOW.bot - WINDOW.top) / 2 + 1.2, rx = 3.2;
  const a0 = front ? Math.PI / 2 : -Math.PI / 2, a1 = a0 + Math.PI;            // חצי שמאלי מלפנים, חצי ימני מאחור
  if (!front) {                                                                 // זוהר חם מסביב
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, ry + 6);
    g.addColorStop(0, 'rgba(251,146,60,.28)'); g.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, ry + 2, ry + 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (const [col, lw] of [['rgba(220,38,38,.9)', 2.6], ['#f97316', 1.7], ['#fde047', 0.8]]) {   // הטבעת: אדום, כתום, לב צהוב
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1); ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {                                                 // לשונות אש קטנות לאורך הטבעת, כלפי חוץ
    const t = a0 + (i + 0.5) / 9 * Math.PI, fl = 0.75 + 0.35 * Math.sin(now * 12 + i * 2.3 + o.x);
    const px = cx + Math.cos(t) * rx, py0 = cy + Math.sin(t) * ry, nx = Math.cos(t), ny = Math.sin(t);
    const len = 2.4 * fl, tx = px + nx * len * 0.8, ty = py0 + ny * len - 0.8 * fl;
    ctx.fillStyle = i % 2 ? '#fb923c' : '#facc15';
    ctx.beginPath(); ctx.moveTo(px - ny * 0.7, py0 + nx * 0.7); ctx.quadraticCurveTo(tx, ty + 0.4, tx + Math.sin(now * 9 + i) * 0.4, ty - 0.6); ctx.quadraticCurveTo(tx, ty + 0.4, px + ny * 0.7, py0 - nx * 0.7); ctx.fill();
  }
}

// HIDE: ערימת סלעים. השומרים מאחוריה (רואים ראש ופנס מעליה), והנינג'ה מתכופף לפניה
function drawHideRock(o) {
  const x = o.rx, w = HIDE_ROCK.w, h = HIDE_ROCK.h;
  const a = artFor('hiderock');
  if (a) {
    const m = ctx.getTransform(), px = Math.hypot(m.a, m.b), bmp = artBitmap(a, a.w * px, a.h * px);
    if (bmp) { ctx.drawImage(bmp, x + a.dx, GROUND - a.dy - a.h, a.w, a.h); if (!o.passed) label('HIDE', x + w / 2, GROUND - a.dy - a.h - 5, 4, '#fde047', '#1e293b'); return; }
  }
  const rocks = [[0.42, 0.42, 0.62], [0.68, 0.36, 0.55], [0.18, 0.3, 0.44], [0.88, 0.24, 0.36], [0.3, 0.22, 0.3], [0.55, 0.2, 0.26], [0.06, 0.14, 0.22], [0.78, 0.16, 0.22]];   // [מרכז, רוחב יחסי, גובה יחסי] – ערימה של הרבה סלעים
  for (const [cx, rw, rh] of rocks.slice().sort((p, q) => q[2] - p[2])) {
    const X = x + w * cx, R = w * rw / 2, Hh = h * rh / 0.62;
    const g = ctx.createLinearGradient(X - R, GROUND - Hh, X + R, GROUND);
    g.addColorStop(0, '#c8beac'); g.addColorStop(0.55, '#958a78'); g.addColorStop(1, '#5e5447');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(X - R, GROUND + 2.2);
    ctx.lineTo(X - R * 0.95, GROUND - Hh * 0.45); ctx.lineTo(X - R * 0.55, GROUND - Hh * 0.92); ctx.lineTo(X + R * 0.05, GROUND - Hh);
    ctx.lineTo(X + R * 0.6, GROUND - Hh * 0.85); ctx.lineTo(X + R, GROUND - Hh * 0.35); ctx.lineTo(X + R, GROUND + 2.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(52,45,38,.6)'; ctx.lineWidth = 0.35; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)';                                    // פאה מוארת
    ctx.beginPath(); ctx.moveTo(X - R * 0.55, GROUND - Hh * 0.92); ctx.lineTo(X + R * 0.05, GROUND - Hh); ctx.lineTo(X - R * 0.1, GROUND - Hh * 0.6); ctx.lineTo(X - R * 0.8, GROUND - Hh * 0.5); ctx.fill();
  }
  ctx.fillStyle = WORLDS[world].top; ctx.globalAlpha = 0.8;                       // קצת עשב / שלג למטה
  for (let k = 0; k < w; k += 1.6) ctx.fillRect(x + k, GROUND - 0.6 - (k % 3.2 ? 0 : 0.6), 0.5, 1.2);
  ctx.globalAlpha = 1;
  if (!o.passed) label('HIDE', x + w / 2, GROUND - h - 6, 4, '#fde047', '#1e293b');
}

// סימון קטן בתוך המכשול עצמו – כמה הוא שווה במסע (לא נראה כמו משהו שאוספים)
function drawPoints(o) {
  if (o.type === 'coin') return;
  const b = obstacleBox(o), wide = o.w && o.type !== 'bramble';
  let cx = (b.l + b.r) / 2, cy = b.b - 3.2;
  if (wide) { cx = o.x + 5; cy = GROUND + 4; }                         // לבה / אגם / שדה אש / בריכה – בתוך פני השטח
  else if (o.type === 'bramble') { cx = o.x + 6; cy = GROUND - 3.2; }
  else if (o.type === 'beam') cy = b.b - BEAM.thick / 2;               // על המוט
  else if (o.type === 'rock') cy = (b.t + b.b) / 2;
  else if (o.type === 'boulder') cy = GROUND - BOULDER.r;
  const txt = String(o.pts);
  ctx.save();
  ctx.font = '900 3.2px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = Math.max(4, ctx.measureText(txt).width + 2), h = 4;
  ctx.fillStyle = 'rgba(15,23,42,.72)'; roundRect(cx - w / 2, cy - h / 2, w, h, 1.2); ctx.fill();
  ctx.fillStyle = '#e9d5ff'; ctx.fillText(txt, cx, cy + 0.2);
  ctx.restore();
}

function label(text, cx, cy, size, bg, fg) {
  if (!labelsVisible()) return;                   // במסע אין רמזים – צריך לזהות את המכשול
  ctx.font = '900 ' + size + 'px -apple-system, system-ui, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  roundRect(cx - tw / 2 - size * 0.4, cy - size * 0.65, tw + size * 0.8, size * 1.3, size * 0.35);
  ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(text, cx, cy + size * 0.05);
}

function bigText(text, y, size, color) {
  ctx.font = '900 ' + size + 'px -apple-system, system-ui, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y);
}

function star4(x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/* ---------- עולמות: יער במבוק, כפר בלילה, הרים מושלגים ---------- */
const WORLDS = [
  { sky: ['#a5f3fc', '#ecfeff'], ground: '#92400e', top: '#4ade80', mark: '#78350f', dust: '#d6d3d1' },
  { sky: ['#1e1b4b', '#4338ca'], ground: '#44403c', top: '#78716c', mark: '#292524', dust: '#a8a29e' },
  { sky: ['#bae6fd', '#f0f9ff'], ground: '#cbd5e1', top: '#f8fafc', mark: '#94a3b8', dust: '#ffffff' },
  { sky: ['#2e3f73', '#d9a6c0'], ground: '#6b4430', top: '#b98a5e', mark: '#4a2e20', dust: '#d6bfa3' },   // קניון במדבר, בדמדומים – האש בולטת
  { sky: ['#6d28d9', '#fda4af'], ground: '#57534e', top: '#a8a29e', mark: '#44403c', dust: '#d6d3d1' }    // מקדש בשקיעה
];
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// מצייר אלמנט שחוזר על עצמו ברקע, זז לאט יותר מהקרקע (parallax)
function repeat(left, right, par, spacing, fn) {
  const off = bgX * par;
  for (let i = Math.floor((left + off) / spacing) - 1; i * spacing - off < right + spacing; i++) fn(i * spacing - off, i);
}

function hills(left, right, par, amp, color, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(left, GROUND);
  for (let x = left; x <= right + 4; x += 4) {
    const u = (x + bgX * par) * 0.045 + seed;
    ctx.lineTo(x, GROUND - amp * (0.55 + 0.25 * Math.sin(u) + 0.2 * Math.sin(u * 2.3 + 1)));
  }
  ctx.lineTo(right + 4, GROUND); ctx.closePath(); ctx.fill();
}

function bamboo(x, h, seed) {
  const top = GROUND - h, w = 2.2;
  ctx.fillStyle = seed > 0.5 ? '#65a30d' : '#4d7c0f'; ctx.fillRect(x, top, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 0.3, top, 0.5, h);
  ctx.fillStyle = '#365314';
  for (let y = GROUND - 6; y > top; y -= 7) ctx.fillRect(x - 0.2, y, w + 0.4, 0.6);
  ctx.fillStyle = '#4d7c0f';
  for (let k = 0; k < 3; k++) {
    const ly = top + 4 + k * 6, dir = (k + Math.floor(seed * 10)) % 2 ? 1 : -1;
    ctx.beginPath(); ctx.ellipse(x + w / 2 + dir * 3, ly, 3.2, 0.9, dir * 0.4, 0, Math.PI * 2); ctx.fill();
  }
}

function house(x, i) {
  const w = 16 + hash(i) * 10, h = 10 + hash(i + 1) * 12, base = GROUND;
  ctx.fillStyle = '#1e1b4b'; ctx.fillRect(x, base - h, w, h);
  ctx.fillStyle = '#0f0d2e';                                   // גג עם קצוות מעוקלים
  ctx.beginPath(); ctx.moveTo(x - 3, base - h); ctx.quadraticCurveTo(x + w / 2, base - h - 9, x + w + 3, base - h);
  ctx.lineTo(x + w + 4, base - h - 1.2); ctx.lineTo(x - 4, base - h - 1.2); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 2; k++) {                                // חלונות מוארים
    if (hash(i * 3 + k) < 0.35) continue;
    const wx = x + 3 + k * (w / 2), wy = base - h + 3;
    ctx.fillStyle = 'rgba(253,230,138,.25)'; circle(wx + 1.5, wy + 2, 3.5);
    ctx.fillStyle = '#fde68a'; ctx.fillRect(wx, wy, 3, 4);
  }
  if (hash(i + 7) > 0.45) {                                    // פנס אדום
    const lx = x + w + 1, ly = base - h + 4 + Math.sin(performance.now() / 600 + i) * 0.4;
    ctx.strokeStyle = '#0f0d2e'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(lx, base - h); ctx.lineTo(lx, ly - 1.6); ctx.stroke();
    ctx.fillStyle = 'rgba(248,113,113,.35)'; circle(lx, ly, 3.4);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(lx, ly, 1.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function peak(x, i, par) {
  const w = 40 + hash(i) * 30, h = 26 + hash(i + 2) * 24;
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + w / 2, GROUND - h); ctx.lineTo(x + w, GROUND); ctx.fill();
  ctx.fillStyle = '#f8fafc';                                   // כיפת שלג
  ctx.beginPath(); ctx.moveTo(x + w / 2, GROUND - h);
  ctx.lineTo(x + w / 2 + w * 0.16, GROUND - h * 0.68); ctx.lineTo(x + w / 2 + w * 0.05, GROUND - h * 0.74);
  ctx.lineTo(x + w / 2 - w * 0.04, GROUND - h * 0.66); ctx.lineTo(x + w / 2 - w * 0.16, GROUND - h * 0.7); ctx.closePath(); ctx.fill();
}

function pine(x, i) {
  const h = 16 + hash(i) * 14, w = h * 0.5;
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(x - 0.7, GROUND - 3, 1.4, 3);
  for (let k = 0; k < 3; k++) {
    const ty = GROUND - 3 - k * h * 0.28, tw = w * (1 - k * 0.25);
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.moveTo(x - tw / 2, ty); ctx.lineTo(x, ty - h * 0.42); ctx.lineTo(x + tw / 2, ty); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.moveTo(x - tw * 0.18, ty - h * 0.3); ctx.lineTo(x, ty - h * 0.42); ctx.lineTo(x + tw * 0.18, ty - h * 0.3); ctx.fill();
  }
}

function drawWorld(left, right, top, bottom) {
  const wd = WORLDS[world], now = performance.now() / 1000;
  if (world === 0) {
    ctx.fillStyle = 'rgba(254,240,138,.35)'; circle(W * 0.82, 16, 11);
    ctx.fillStyle = 'rgba(254,240,138,.9)'; circle(W * 0.82, 16, 6);
    hills(left, right, 0.05, 30, '#bbf7d0', 0);
    hills(left, right, 0.12, 20, '#86efac', 2);
    repeat(left, right, 0.35, 15, (x, i) => { if (hash(i) > 0.25) bamboo(x + hash(i + 5) * 5, 34 + hash(i + 9) * 40, hash(i + 3)); });
  } else if (world === 1) {
    for (let i = 0; i < 45; i++) {                              // כוכבים מנצנצים
      const sx = left + hash(i) * (right - left), sy = top + hash(i + 50) * (GROUND - 35 - top);
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(now * (0.8 + hash(i + 9)) + i));
      ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 0.6, 0.6);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(254,249,195,.15)'; circle(W * 0.8, 18, 13);
    ctx.fillStyle = '#fef9c3'; circle(W * 0.8, 18, 7);
    ctx.fillStyle = '#4338ca'; circle(W * 0.8 + 2.5, 16.5, 6);   // ירח חרמש
    hills(left, right, 0.05, 28, '#312e81', 1);
    repeat(left, right, 0.3, 30, (x, i) => { if (hash(i + 4) > 0.2) house(x, i); });
  } else if (world === 2) {
    repeat(left, right, 0.05, 45, (x, i) => peak(x, i));
    hills(left, right, 0.12, 12, '#e2e8f0', 3);
    repeat(left, right, 0.32, 14, (x, i) => { if (hash(i + 1) > 0.3) pine(x + hash(i) * 6, i); });
  } else if (world === 3) {                                       // קניון: שמש גדולה, מסות שטוחות, קקטוסים
    ctx.fillStyle = 'rgba(253,230,138,.25)'; circle(W * 0.78, 46, 14);             // שמש נמוכה בדמדומים
    ctx.fillStyle = '#fde68a'; circle(W * 0.78, 46, 7);
    repeat(left, right, 0.05, 55, (x, i) => mesa(x, i, '#7d5a78', 24));
    repeat(left, right, 0.14, 38, (x, i) => mesa(x + 10, i + 20, '#5b3d55', 14));
    repeat(left, right, 0.35, 26, (x, i) => { if (hash(i + 2) > 0.4) cactus(x + hash(i) * 8, i); });
  } else {                                                        // מקדש: שקיעה סגולה, מקדשים מדורגים, עמודים עם לפידים
    ctx.fillStyle = 'rgba(254,205,211,.5)'; circle(W * 0.2, 30, 12);
    repeat(left, right, 0.06, 70, (x, i) => ziggurat(x, i));
    repeat(left, right, 0.32, 24, (x, i) => { if (hash(i + 6) > 0.35) pillar(x, i); });
  }

  // קרקע
  ctx.fillStyle = wd.ground; ctx.fillRect(left, GROUND, right - left, bottom - GROUND);
  ctx.fillStyle = wd.top; ctx.fillRect(left, GROUND, right - left, 2);
  ctx.fillStyle = wd.mark;
  if (world === 1 || world === 4) repeat(left, right, 1, 10, x => { ctx.fillRect(x, GROUND + 2, 0.5, 6); ctx.fillRect(x + 5, GROUND + 8, 0.5, 6); });
  else repeat(left, right, 1, 12, (x, i) => { ctx.fillRect(x, GROUND + 5 + hash(i) * 4, 3 + hash(i + 1) * 2, 1); });
}

function mesa(x, i, color, h0) {
  const w = 26 + hash(i) * 22, h = h0 + hash(i + 1) * 14;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 4, GROUND - h); ctx.lineTo(x + w - 4, GROUND - h); ctx.lineTo(x + w, GROUND); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + 4, GROUND - h * 0.6, w - 8, 1.2);
}
function cactus(x, i) {
  const h = 9 + hash(i) * 7;
  ctx.fillStyle = '#15803d';
  roundRect(x, GROUND - h, 2.4, h, 1.2); ctx.fill();
  roundRect(x - 2.6, GROUND - h * 0.7, 1.8, 4, 0.9); ctx.fill(); ctx.fillRect(x - 2.6, GROUND - h * 0.7 + 2.6, 2.8, 1.4);
  roundRect(x + 3.2, GROUND - h * 0.55, 1.8, 3.5, 0.9); ctx.fill(); ctx.fillRect(x + 2, GROUND - h * 0.55 + 2.2, 2.8, 1.4);
}
function ziggurat(x, i) {
  const w = 40 + hash(i) * 20, steps = 4;
  ctx.fillStyle = '#4c1d95';
  for (let k = 0; k < steps; k++) { const sw = w * (1 - k * 0.2); ctx.fillRect(x + (w - sw) / 2, GROUND - 7 * (k + 1), sw, 7.2); }
  ctx.fillStyle = 'rgba(253,224,71,.5)'; ctx.fillRect(x + w / 2 - 1.2, GROUND - 26, 2.4, 3);
}
function pillar(x, i) {
  const h = 22 + hash(i) * 10;
  ctx.fillStyle = '#78716c'; ctx.fillRect(x, GROUND - h, 4, h);
  ctx.fillStyle = '#a8a29e'; ctx.fillRect(x - 1, GROUND - h - 1.5, 6, 1.6); ctx.fillRect(x - 1, GROUND - 1.6, 6, 1.6);
  const fl = Math.sin(performance.now() / 90 + i * 3) * 0.6;                       // לפיד מהבהב
  ctx.fillStyle = 'rgba(251,146,60,.35)'; circle(x + 2, GROUND - h - 4, 3.5 + fl * 0.5);
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(x + 2, GROUND - h - 4, 1.1, 2 + fl, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(x + 2, GROUND - h - 3.5, 0.5, 1 + fl * 0.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawSnow(left, right, top, bottom) {
  if (world !== 2) return;
  const now = performance.now() / 1000, hgt = bottom - top;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 50; i++) {
    const sp = 6 + hash(i + 3) * 8;
    const y = top + (((hash(i + 2) * hgt + now * sp) % hgt) + hgt) % hgt;
    const x = left + ((((hash(i) * 200 - now * (3 + hash(i + 1) * 4) - bgX * 0.4) % 200) + 200) % 200) * ((right - left) / 200);
    circle(x + Math.sin(now + i) * 1.2, y, 0.35 + hash(i + 7) * 0.4);
  }
}

/* ---------- דמות הנינג'ה: התנוחות והציור עצמו נמצאים ב-ninja-figure.js ---------- */
function playerPose() {
  const now = performance.now() / 1000;
  let P;
  if (act.hiding > 0) P = poseDuck();                    // מתכופף מאחורי הסלעים
  else if (act.climb > 0) P = poseClimb(now);
  else if (act.leap > 0) P = poseLeap();
  else if (diving()) P = poseDive(now);
  else if (crawling()) P = poseCrawl(now);
  else if (act.pulling > 0) P = posePull(now);
  else if (swimmingNow()) P = poseSwim(now);
  else if (duckT > 0) P = poseDuck();
  else if (flyT > 0) P = poseFly(now);
  else if (py > 0 && !(py >= CLIFF.h - 0.5 && vy === 0 && cliffTop())) P = poseAir(vy > 0, Math.max(0, Math.min(1, 0.5 - vy / (2 * cfg.jumpV))));
  else if (act.push > 0) P = posePush();
  else if (act.pull > 0) P = posePull(now);
  else if (state === 'play' && curSpeed() > 0) P = poseRun(bgX * 0.42 * RIG.run.cadence);
  else if (act.run > 0) P = poseRun(now * 24);       // בהדגמה – רץ במקום
  else P = poseIdle(now);
  if (act.run > 0 && py <= 0 && duckT <= 0) P.lean = 0.38;
  if (kickT > 0) applyKick(P, 1 - kickT / KICK.time);
  if (throwT > 0) applyThrow(P, 1 - throwT / 0.25);
  if (catchT > 0) applyCatch(P);
  if (act.block > 0) applyBlock(P);
  if (act.stop > STOP_TIME - 0.8) applyStop(P);
  return P;
}

function draw() {
  const wd = WORLDS[world];
  // שמיים על כל המסך
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, wd.sky[0]); g.addColorStop(1, wd.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.translate(ox, oy); ctx.scale(scale, scale);
  if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 2.4 * shakeT * 3, (Math.random() - 0.5) * 2.4 * shakeT * 3);
  const left = -ox / scale - 3, right = (cw - ox) / scale + 3, top = -oy / scale - 3, bottom = (ch - oy) / scale + 3;

  drawWorld(left, right, top, bottom);

  // מכאן – רק בתוך שטח העולם
  ctx.save();
  ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();

  const WIDE = { river: drawRiver, lake: drawLake, bridge: drawBridge, pond: drawPond };
  for (const o of obstacles) if (WIDE[o.type]) WIDE[o.type](o, bottom);
  for (const o of obstacles) if (!WIDE[o.type]) drawObstacle(o, top);
  const tc = performance.now() / 1000;
  for (const c of pickups) {                                                  // מטבעות קטנים מסתובבים
    const sx = Math.max(0.2, Math.abs(Math.cos(tc * 4 + c.x * 0.2)));
    ctx.save(); ctx.translate(c.x, c.y + Math.sin(tc * 5 + c.x) * 0.4); ctx.scale(sx, 1);
    ctx.fillStyle = '#b45309'; circle(0, 0, 2.2); ctx.fillStyle = '#facc15'; circle(0, 0, 1.8);
    ctx.fillStyle = '#fef9c3'; ctx.fillRect(-0.9, -1, 0.5, 0.9);
    ctx.restore();
  }
  if (mode === 'journey' && (state === 'play' || state === 'paused')) for (const o of obstacles) if (!o.passed && !o.hit && o.pts) drawPoints(o);

  // דגל סיום
  if (flag) {
    ctx.fillStyle = '#475569'; ctx.fillRect(flag.x, GROUND - 26, 1.2, 26);
    const wv = Math.sin(performance.now() / 150) * 1;
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.moveTo(flag.x + 1.2, GROUND - 26); ctx.quadraticCurveTo(flag.x + 7, GROUND - 25 + wv, flag.x + 12, GROUND - 22);
    ctx.quadraticCurveTo(flag.x + 7, GROUND - 19 - wv, flag.x + 1.2, GROUND - 18); ctx.fill();
  }

  for (const o of obstacles) if (o.type === 'guard' && o.rx !== undefined) drawHideRock(o);   // הסלעים: לפני השומרים, מאחורי הנינג'ה
  drawNinja();
  for (const o of obstacles) if (o.type === 'window') drawFireRing(o, true);   // החצי הקדמי של הטבעת – מעל הנינג'ה, נראה שהוא עובר דרכה
  for (const o of obstacles) if (o.type === 'bridge') drawFieldSmoke(o);
  for (const o of obstacles) if (o.type === 'lake' || o.type === 'pond') {   // מים מעל השחיין – נראה חצי שקוע / צולל
    ctx.fillStyle = o.type === 'lake' ? 'rgba(20,184,166,.55)' : 'rgba(14,116,144,.6)'; ctx.fillRect(o.x, GROUND + 0.3, o.w, bottom - GROUND);
    if (o.type === 'pond') drawNet(o, true);                                  // הרשת לפני הצולל
  }
  for (const s of shurikens) star4(s.x, s.y, hasGear('goldstar') ? 2.6 : 2, s.rot, hasGear('goldstar') ? '#facc15' : '#475569');
  for (const f of fireballs) {                                                // כדור אש: הילה, גוף כתום, לב צהוב
    const r = 2.2 + Math.sin(f.t * 30) * 0.2;
    ctx.fillStyle = 'rgba(251,146,60,.35)'; circle(f.x, f.y, r * 2);
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(f.x - r * 3, f.y); ctx.quadraticCurveTo(f.x - r, f.y - r * 1.3, f.x + r, f.y - r * 0.2); ctx.lineTo(f.x + r, f.y + r * 0.2); ctx.quadraticCurveTo(f.x - r, f.y + r * 1.3, f.x - r * 3, f.y); ctx.fill();
    ctx.fillStyle = '#f97316'; circle(f.x, f.y, r);
    ctx.fillStyle = '#fde047'; circle(f.x + 0.3, f.y, r * 0.6);
    ctx.fillStyle = '#fffbeb'; circle(f.x + 0.6, f.y - 0.2, r * 0.25);
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.color;
    if (p.rot !== undefined) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    else ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of floats) {                                                   // +1 ועוד
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = '900 5px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  drawSnow(left, right, top, bottom);

  // מה הנינג'ה שמע
  if (heard && (state === 'play' || state === 'demo' || state === 'intro')) {
    const pb = playerBox();
    label(heard.text, PLAYER.x + 4, pb.t - (flyT > 0 ? 16 : 7), 4, '#16a34a', '#fff');
  }
  ctx.restore();

  // המילה הנכונה אחרי פגיעה / כותרת פתיחה
  if (state === 'play' || state === 'demo' || state === 'intro') {
    if (flash) bigText(flash.text, 40, 14, '#dc2626');
    else if (banner) {
      bigText(banner.text, 32, 9, '#4f46e5');
      if (banner.sub) bigText(banner.sub, 43, 5, '#1e293b');
    }
  }
  ctx.restore();

  // הבזק אדום בפגיעה
  if (shakeT > 0) { ctx.fillStyle = 'rgba(220,38,38,' + (shakeT * 0.6) + ')'; ctx.fillRect(0, 0, cw, ch); }
}

function drawObstacle(o, top) {
  const x = o.x;
  if (artDraw(o)) return;                        // יש ציור SVG מהסטודיו – הוא מחליף את הציור הרגיל
  if (o.type === 'box') {                       // ארגז עץ
    const y = GROUND - BOX.h;
    ctx.fillStyle = '#c2410c'; ctx.fillRect(x, y, BOX.w, BOX.h);
    ctx.fillStyle = '#ea580c'; ctx.fillRect(x, y, BOX.w, 1.2);
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 0.6;
    ctx.strokeRect(x + 0.3, y + 0.3, BOX.w - 0.6, BOX.h - 0.6);
    ctx.beginPath(); ctx.moveTo(x + 0.6, y + 0.6); ctx.lineTo(x + BOX.w - 0.6, GROUND - 0.6); ctx.moveTo(x + BOX.w - 0.6, y + 0.6); ctx.lineTo(x + 0.6, GROUND - 0.6); ctx.stroke();
    label('JUMP', x + BOX.w / 2, y - 5, 4, '#fde047', '#1e293b');
  } else if (o.type === 'beam') {               // מוט במבוק תלוי
    const by = GROUND - BEAM.clear - BEAM.thick;
    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, top); ctx.lineTo(x + 1.5, by);
    ctx.moveTo(x + BEAM.w - 1.5, top); ctx.lineTo(x + BEAM.w - 1.5, by);
    ctx.stroke();
    const bg = ctx.createLinearGradient(0, by, 0, by + BEAM.thick);
    bg.addColorStop(0, '#bef264'); bg.addColorStop(1, '#4d7c0f');
    ctx.fillStyle = bg; roundRect(x - 4, by, BEAM.w + 8, BEAM.thick, 2); ctx.fill();
    ctx.fillStyle = '#365314';
    for (let k = 0; k <= 3; k++) ctx.fillRect(x - 3 + k * ((BEAM.w + 6) / 3), by, 0.6, BEAM.thick);
    label('DOWN', x + BEAM.w / 2, by + BEAM.thick / 2, 3.4, '#fde047', '#1e293b');
  } else if (o.type === 'wall') {               // חומת אבנים
    if (o.broken) return;
    const y = GROUND - WALL.h;
    ctx.fillStyle = '#57534e'; ctx.fillRect(x - 0.3, y, WALL.w + 0.6, WALL.h);
    for (let r = 0; r < 10; r++) {
      const yy = y + r * 3 + 0.3, half = r % 2;
      ctx.fillStyle = r % 3 === 0 ? '#a8a29e' : '#d6d3d1';
      if (half) { ctx.fillRect(x + 0.2, yy, 1.9, 2.4); ctx.fillRect(x + 2.4, yy, 2.4, 2.4); }
      else { ctx.fillRect(x + 0.2, yy, 2.4, 2.4); ctx.fillRect(x + 2.9, yy, 1.9, 2.4); }
    }
    ctx.fillStyle = '#44403c'; ctx.fillRect(x - 0.8, y - 1, WALL.w + 1.6, 1.4);
    label('KICK', x + WALL.w / 2, y - 5.5, 4, '#fde047', '#1e293b');
  } else if (o.type === 'ice') {                // FIRE: אשכול עמודי קרח צמודים, כמו גבישים
    if (o.broken) return;
    const now = performance.now() / 1000, H = ICE.h;
    const cols = [[4.4, 4.6, 1.0], [8.0, 4.6, 0.84], [1.8, 3.8, 0.68], [11.0, 3.8, 0.6], [6.2, 3.6, 0.48]];   // [מרכז, רוחב, גובה יחסי] – האחוריים קודם
    ctx.fillStyle = 'rgba(186,230,253,.25)'; ctx.beginPath(); ctx.ellipse(x + ICE.w / 2, GROUND, ICE.w * 0.8, 1.6, 0, 0, Math.PI * 2); ctx.fill();   // זוהר קר על הקרקע
    cols.forEach(([cx, cw, k], i) => {
      const l = x + cx - cw / 2, r = x + cx + cw / 2, top = GROUND - H * k, sh = cw * 0.9, mid = x + cx + (i % 2 ? 0.3 : -0.3);
      ctx.fillStyle = 'rgba(224,242,254,.95)';                                                  // פאה מוארת (שמאל)
      ctx.beginPath(); ctx.moveTo(l, GROUND); ctx.lineTo(l, top + sh); ctx.lineTo(mid, top); ctx.lineTo(mid, GROUND); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, top, 0, GROUND);                                    // פאה מוצלת (ימין)
      g.addColorStop(0, 'rgba(125,211,252,.95)'); g.addColorStop(1, 'rgba(14,165,233,.95)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(mid, GROUND); ctx.lineTo(mid, top); ctx.lineTo(r, top + sh); ctx.lineTo(r, GROUND); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(12,74,110,.5)'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(l, GROUND); ctx.lineTo(l, top + sh); ctx.lineTo(mid, top); ctx.lineTo(r, top + sh); ctx.lineTo(r, GROUND); ctx.moveTo(mid, top); ctx.lineTo(mid, GROUND); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(l + 0.5, top + sh + 1, 0.5, H * k * 0.55);   // ברק לאורך הגביש
      const tw = 0.5 + 0.5 * Math.sin(now * 3 + i * 1.7);                                       // נצנוץ בקצה
      if (tw > 0.75) { ctx.fillStyle = 'rgba(255,255,255,' + (tw - 0.75) * 4 + ')'; star4(mid, top + 0.6, 1.3, 0, 'rgba(255,255,255,' + (tw - 0.75) * 4 + ')'); }
    });
    label('FIRE', x + ICE.w / 2, GROUND - H - 6, 4, '#fde047', '#1e293b');
  } else if (o.type === 'enemy') {
    drawEnemy(o);
  } else if (o.type === 'rock') {                // STOP: סלע תלוי בחבל, נופל כשמגיעים
    const s = ROCK.size, ry = o.fallK === undefined ? ROCK.hangY : rockY(o);
    if (o.landed) {                               // שברים על הקרקע
      ctx.fillStyle = '#78716c'; ctx.fillRect(x, GROUND - 1.5, 2.5, 1.5); ctx.fillRect(x + 3.5, GROUND - 1, 2, 1); ctx.fillRect(x + 6, GROUND - 1.8, 2.2, 1.8);
      return;
    }
    if (o.fallK === undefined) { ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + s / 2, top); ctx.lineTo(x + s / 2, ry); ctx.stroke(); }
    const k = o.fallK === undefined ? 0 : Math.min(1, o.fallK);                   // צל שגדל על הקרקע
    ctx.fillStyle = 'rgba(0,0,0,' + (0.12 + k * 0.25) + ')'; ctx.beginPath(); ctx.ellipse(x + s / 2, GROUND + 0.5, 2 + k * 3, 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#57534e';
    ctx.beginPath(); ctx.moveTo(x + 1, ry + 1.5); ctx.lineTo(x + 4.5, ry); ctx.lineTo(x + s, ry + 2.5); ctx.lineTo(x + s - 0.5, ry + s - 1); ctx.lineTo(x + 3, ry + s); ctx.lineTo(x, ry + s - 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8a29e'; ctx.fillRect(x + 2, ry + 2, 2.2, 1.2);
    if (o.fallK === undefined) label('STOP', x + s / 2, ry + s + 5, 4, '#fde047', '#1e293b');
  } else if (o.type === 'cliff') {               // CLIMB: צוק אדמה גבוה עם סולם נשען באלכסון
    if (o.climbed && x + CLIFF.w < PLAYER.x - 30) return;
    const y = GROUND - CLIFF.h, w = CLIFF.w;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#b45309'); g.addColorStop(1, '#78350f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x + 0.6, GROUND);
    for (let k = 0; k <= 9; k++) ctx.lineTo(x + (k % 2 ? 0 : 1.1), GROUND - k * CLIFF.h / 9);
    ctx.lineTo(x + w - 0.8, y); ctx.lineTo(x + w, GROUND); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let k = 1; k < 8; k++) ctx.fillRect(x + 1, y + k * 4.8 + (k % 2), w - 1.5, 0.7);
    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x + 9, y + 1); ctx.quadraticCurveTo(x + 11.5, y + 12, x + 9.5, y + 24); ctx.stroke();
    ctx.fillStyle = '#22c55e'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + 9.8 + (k % 2 ? 1 : -0.6), y + 3 + k * 4.2, 1, 0.5, k % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#16a34a'; roundRect(x - 1.2, y - 1.6, w + 2.2, 2.6, 1.2); ctx.fill();
    ctx.fillStyle = '#4ade80'; for (let k = 0; k < w + 1; k += 1.6) ctx.fillRect(x - 0.8 + k, y - 2.4 - (k % 3 ? 0 : 0.6), 0.5, 1.2);
    // סולם: מהקרקע לפני הצוק עד לראש הצוק
    const fx0 = x - CLIFF.ladder, fy0 = GROUND, tx = x + 0.6, ty = y - 1;
    const dx = tx - fx0, dy = ty - fy0, L = Math.hypot(dx, dy), nx = -dy / L * 2.6, ny = dx / L * 2.6;   // סולם רחב
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fx0 + nx, fy0 + ny); ctx.lineTo(tx + nx, ty + ny); ctx.moveTo(fx0 - nx, fy0 - ny); ctx.lineTo(tx - nx, ty - ny); ctx.stroke();
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 0.7;
    for (let k = 1; k < L / 3.4; k++) { const q = k * 3.4 / L, px = fx0 + dx * q, pyy = fy0 + dy * q; ctx.beginPath(); ctx.moveTo(px + nx, pyy + ny); ctx.lineTo(px - nx, pyy - ny); ctx.stroke(); }
    if (!o.climbed) label('CLIMB', x + w / 2, y - 7, 4, '#fde047', '#1e293b');
  } else if (o.type === 'boulder') {             // PUSH: סלע עגול גדול
    const r = BOULDER.r;
    ctx.save(); ctx.translate(x + r, GROUND - r); ctx.rotate(o.rot || 0);
    ctx.fillStyle = '#6b7280'; circle(0, 0, r);
    ctx.fillStyle = '#9ca3af'; circle(-3, -3.5, 3.5);
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(3, 4); ctx.lineTo(5, 1); ctx.stroke();
    ctx.restore();
    if (!o.pushed) label('PUSH', x + r, GROUND - 2 * r - 5, 4, '#fde047', '#1e293b');
  } else if (o.type === 'gate') {                // PULL: שער ברזל בחומה. עומדים ליד החבל ומושכים – הסורג עולה למעלה
    const lintel = GROUND - 42, k = o.open ? 1 : o.lifting ? o.liftK : 0;
    const lift = GATE.lift * (1 - Math.pow(1 - k, 2)), bot = GROUND - lift;
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.8;
    for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2.5, lintel); ctx.lineTo(x + i * 2.5, bot); ctx.stroke(); }
    for (let yy = bot - 3; yy > lintel; yy -= 5) { ctx.beginPath(); ctx.moveTo(x - 0.5, yy); ctx.lineTo(x + GATE.w + 0.5, yy); ctx.stroke(); }
    ctx.fillStyle = '#1f2937'; for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 2.5 - 0.7, bot - 0.5); ctx.lineTo(x + i * 2.5, bot + 1.2); ctx.lineTo(x + i * 2.5 + 0.7, bot - 0.5); ctx.fill(); }
    ctx.fillStyle = '#78716c'; ctx.fillRect(x - 3, top, GATE.w + 6, lintel - top);            // חומה מעל השער
    ctx.fillStyle = '#a8a29e';
    for (let yy = lintel - 3, r = 0; yy > top; yy -= 3, r++) for (let i = 0; i < 3; i++) ctx.fillRect(x - 2.6 + i * 3.7 + (r % 2 ? 1.6 : 0), yy, 2.8, 2.4);
    ctx.fillStyle = '#57534e'; ctx.fillRect(x - GATE.rope - 3, lintel - 1.2, GATE.w + GATE.rope + 6.5, 1.8);   // קורה עם גלגלת
    const rx = x - GATE.rope + 0.5, py0 = lintel + 2, spin = k * 18;
    ctx.fillStyle = '#92400e'; circle(rx, py0, 2);
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(rx + Math.cos(spin) * 1.8, py0 + Math.sin(spin) * 1.8); ctx.lineTo(rx - Math.cos(spin) * 1.8, py0 - Math.sin(spin) * 1.8); ctx.stroke();
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 0.7;                          // חבל: מהשער, דרך הגלגלת, ישר למטה אל הידיים
    ctx.beginPath(); ctx.moveTo(x + GATE.w / 2, bot - 2); ctx.lineTo(x + GATE.w / 2, py0 - 2); ctx.lineTo(rx, py0 - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - 2, py0); ctx.lineTo(rx - 2, GROUND - 2); ctx.stroke();
    ctx.fillStyle = '#854d0e';                                                   // קשרים על החבל – זזים למטה כשמושכים
    for (let yy = py0 + 2 + ((k * 40) % 4); yy < GROUND - 2; yy += 4) ctx.fillRect(rx - 2.5, yy, 1, 0.6);
    if (!o.open && !o.lifting) label('PULL', rx - 2, GROUND - 26, 4, '#fde047', '#1e293b');
  } else if (o.type === 'guard') {               // HIDE: שני שומרים עם פנסים – רואים אותך גם באוויר
    const now = performance.now() / 1000, sc = GUARD.h / 14;
    for (let g = 0; g < 2; g++) {
      const fx = x + GUARD.w / 2 + g * (GUARD.w + GUARD.gap);
      const P = poseRun(now * 5 + x + g * 1.7);
      P.arms[1] = [1.25, 1.05];                                                    // יד קדמית מחזיקה פנס קדימה
      const out = {};
      drawFigure({ fx, fy: GROUND, facing: -1, scale: sc, kind: 'guard', pose: P, out });
      const hb = out.pts.armB[2], sx = fx - hb[0] * sc, sy = GROUND + out.bobY + hb[1] * sc;   // רומח ביד האחורית
      ctx.strokeStyle = '#3f2a1d'; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + 2.2, sy + 7); ctx.lineTo(sx - 3.2, sy - 19); ctx.stroke();
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(sx - 2.9, sy - 17.4, 0.9, 1.4, -0.2, 0, Math.PI * 2); ctx.fill();   // ציצית אדומה
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(sx - 2.6, sy - 18.6); ctx.lineTo(sx - 4.5, sy - 24.5); ctx.lineTo(sx - 3.6, sy - 18.4); ctx.closePath(); ctx.fill();   // להב
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.25; ctx.stroke();
      if (Math.sin(now * 3 + g * 2) > 0.85) star4(sx - 4.1, sy - 22.5, 1, 0, '#fff');                  // ברק על הלהב
      const h = out.pts.armF[2];
      const lx = fx - h[0] * sc, ly = GROUND + out.bobY + (h[1] + 2.2) * sc;   // מיקום הפנס בעולם
      const fl = 0.85 + Math.sin(now * 13 + g) * 0.08;
      const cone = ctx.createLinearGradient(lx, 0, lx - 30, 0);
      cone.addColorStop(0, 'rgba(253,224,71,' + 0.42 * fl + ')'); cone.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = cone;                                                         // אלומת אור קדימה
      ctx.beginPath(); ctx.moveTo(lx, ly - 1); ctx.lineTo(lx - 30, ly - 14); ctx.lineTo(lx - 30, GROUND); ctx.lineTo(lx - 6, GROUND); ctx.closePath(); ctx.fill();
    }
    if (!o.passed && o.rx === undefined) label('HIDE', x + GUARD.span / 2, GROUND - GUARD.h - 9, 4, '#fde047', '#1e293b');
  } else if (o.type === 'bramble') {             // CRAWL: מערת סלעים שהולכת ונעשית צרה עד שחייבים לזחול
    const w = o.w, now = performance.now() / 1000, ceil = xx => caveCeiling(o, xx);
    const m = ctx.getTransform(), px = Math.min(8, Math.hypot(m.a, m.b));          // מציירים את המערה פעם אחת לתמונה – בלי ריצוד בתנועה
    if (!o._cave || Math.abs(o._cave.px - px) > 0.01) o._cave = buildCave(o, px);
    const cv = o._cave; ctx.drawImage(cv.canvas, x - CAVE_PAD, cv.top, cv.wu, cv.hu);
    for (let i = 0; i < 4; i++) {                                                             // גבישים קטנים שנוצצים בחושך
      const gx = x + BRAMBLE.ramp * 0.5 + i * 9, gy = GROUND - 2 - (i % 2) * 2; if (gx > x + w - 10 || gy < ceil(gx) + 2) continue;
      ctx.fillStyle = 'rgba(125,211,252,' + (0.45 + 0.35 * Math.sin(now * 3 + i * 2)) + ')';
      ctx.beginPath(); ctx.moveTo(gx, gy - 1.4); ctx.lineTo(gx + 0.8, gy); ctx.lineTo(gx, gy + 1.4); ctx.lineTo(gx - 0.8, gy); ctx.fill();
    }
    label('CRAWL', x + 14, cv.labelY, 4, '#fde047', '#1e293b');
  } else if (o.type === 'window') {              // LEAP: קיר עבה עם מעבר צר וזוהר – רק זינוק עובר
    const wtop = GROUND - 48, w = WINDOW.w, now = performance.now() / 1000;
    const part = (y0, y1) => {
      ctx.fillStyle = '#a8a29e'; ctx.fillRect(x, y0, w, y1 - y0);
      ctx.fillStyle = '#78716c';
      for (let yy = y0 + 0.4, r = 0; yy < y1 - 0.5; yy += 3, r++) { ctx.fillRect(x, yy + 2.4, w, 0.5); for (let k = (r % 2 ? 2 : 4.5); k < w; k += 5) ctx.fillRect(x + k, yy, 0.5, Math.min(2.6, y1 - yy)); }
    };
    part(wtop, WINDOW.top); part(WINDOW.bot, GROUND);
    ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(x - 2, wtop); ctx.lineTo(x + w / 2, wtop - 5); ctx.lineTo(x + w + 2, wtop); ctx.closePath(); ctx.fill();
    drawFireRing(o, false);                                                     // החצי האחורי של טבעת האש – מאחורי הנינג'ה
    if (!o.leapt) {
      label('LEAP', x + w / 2, WINDOW.top - 6, 4, '#fde047', '#1e293b');
    }
  } else if (o.type === 'arrows') {              // BLOCK: שלושה חיצים
    const d = o.dt2 || 0;
    ctx.save();
    if (o.deflected) { ctx.globalAlpha = Math.max(0, 1 - d * 2); ctx.translate(x + 3, GROUND - 7); ctx.rotate(-d * 6); ctx.translate(-(x + 3), -(GROUND - 7) + d * -20); }
    for (const hy of ARROW_HEIGHTS) {
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x + ARROWS.w, hy); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(x - 1.6, hy); ctx.lineTo(x + 0.4, hy - 0.9); ctx.lineTo(x + 0.4, hy + 0.9); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.fillRect(x + ARROWS.w - 1.6, hy - 0.9, 1.6, 0.6); ctx.fillRect(x + ARROWS.w - 1.6, hy + 0.3, 1.6, 0.6);
    }
    ctx.restore();
    if (!o.deflected) label('BLOCK', x + ARROWS.w / 2, GROUND - 28, 4, '#fde047', '#1e293b');
  } else if (o.type === 'coin') {
    if (o.caught) return;                         // עף אל המונה למעלה
    const now = performance.now() / 1000;
    let cx = x + 3, cy = COIN.y + Math.sin(now * 4 + x) * 1.6;
    const reach = !o.hit && !o.passed && x + 3 >= PLAYER.x - COIN.reachBack && x <= PLAYER.x + COIN.reachFwd * reachMul();
    if (o.hit) { o.ft = (o.ft || 0) + 1 / 60; cy += o.ft * o.ft * 60; ctx.globalAlpha = Math.max(0, 1 - o.ft * 1.5); }   // הוחמץ – נופל
    if (reach) {                                                                  // בטווח! טבעת ירוקה פועמת
      const pr = 5.5 + Math.sin(now * 12) * 0.8;
      ctx.strokeStyle = 'rgba(34,197,94,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(34,197,94,.35)'; ctx.setLineDash([1, 1.2]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(PLAYER.x + 6, GROUND - 12); ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.caught) {
      const k = Math.min(1, o.ct / 0.35), pb = playerBox();
      cx = cx + (PLAYER.x + 4 - cx) * k; cy = cy + (pb.t - cy) * k;
      ctx.globalAlpha = 1 - k * 0.7;
    }
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 7);
    glow.addColorStop(0, 'rgba(253,224,71,.65)'); glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow; circle(cx, cy, 7);
    const sx = Math.max(0.15, Math.abs(Math.cos(now * 3 + x)));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
    ctx.fillStyle = '#b45309'; circle(0, 0, 3.4);
    ctx.fillStyle = '#facc15'; circle(0, 0, 2.9);
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(0, 0, 2.1, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fef9c3'; ctx.fillRect(-1.6, -1.8, 0.9, 1.6);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = now * 2 + i * 2.1, tw = (Math.sin(now * 6 + i * 3) + 1) / 2;
      if (tw > 0.4) star4(cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 4.5, 0.9 * tw + 0.3, 0, '#fff7ae');
    }
    ctx.globalAlpha = 1;
    if (!o.caught && !o.passed && !o.hit) label(reach ? 'CATCH NOW!' : 'CATCH', cx, cy - 8, reach ? 4.2 : 3.6, reach ? '#16a34a' : '#fde047', reach ? '#fff' : '#1e293b');
  }
}

function drawLake(o, bottom) {
  const x = o.x, w = o.w, t = performance.now() / 400;
  const g = ctx.createLinearGradient(0, GROUND, 0, bottom);
  g.addColorStop(0, '#2dd4bf'); g.addColorStop(1, '#134e4a');
  ctx.fillStyle = g; ctx.fillRect(x, GROUND + 0.5, w, bottom - GROUND);
  ctx.fillStyle = '#15803d';                                                     // עלי לוטוס
  for (let i = 6; i < w - 6; i += 14) { ctx.beginPath(); ctx.ellipse(x + i + Math.sin(t + i) * 0.8, GROUND + 1.2, 2.6, 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#f9a8d4'; circle(x + w * 0.62, GROUND + 0.4, 0.9);
  ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 0.45;                                // קני סוף בשפות האגם
  for (const ex of [x + 1, x + w - 3]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(ex + k, GROUND + 1); ctx.lineTo(ex + k + 0.4 * Math.sin(t + k), GROUND - 4 - k); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35;                 // אדוות רגועות
  for (let i = 4; i < w - 6; i += 11) { ctx.beginPath(); ctx.ellipse(x + i, GROUND + 3 + (i % 3), 2.4 + Math.sin(t + i) * 0.4, 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  label('SWIM', x + w / 2, GROUND - 6, 4, '#fde047', '#1e293b');
}

const CAVE_PAD = 4;
function buildCave(o, px) {                       // מצייר את גוף המערה לקנבס נפרד, פעם אחת לכל מכשול
  const top = GROUND - 58, wu = o.w + CAVE_PAD * 2, hu = GROUND + 2 - top;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(wu * px); canvas.height = Math.ceil(hu * px);
  const g = canvas.getContext('2d');
  g.scale(canvas.width / wu, canvas.height / hu); g.translate(CAVE_PAD, -top);
  const labelY = drawCaveBody(g, { x: 0, w: o.w });
  return { canvas, px, top, wu, hu, labelY };
}
function drawCaveBody(ctx, o) {                   // ctx כאן הוא הקנבס הנפרד
  const x = o.x;
    const w = o.w, now = performance.now() / 1000;
    const ceil = xx => caveCeiling(o, xx);
    const C = { light: '#d9d0bf', mid: '#ada392', dark: '#857a69', deep: '#5e5447', ink: 'rgba(52,45,38,.55)' };
    const peak = GROUND - 50, lip = ceil(x) - 6;
    const dome = k => {                                                                       // כיפה מעוגלת לכל האורך, בלי קו ישר למעלה
      const q = Math.max(0, Math.min(1, k / w)), arc = Math.pow(Math.sin(Math.PI * Math.pow(q, 0.85)), 0.55);
      return lip + (peak - lip) * arc + (ceil(x + w) - 6 - lip) * q * (1 - arc);
    };
    const top = [];                                                                           // קו העליון שבור לפאות גדולות, כמו סלע אמיתי
    for (let k = -2; k <= w + 2; k += 8 + hash(k * 0.7 + 3) * 4) top.push([x + k, dome(k) - hash(k * 1.3 + 1) * 2.2]);
    top.push([x + w + 2, ceil(x + w) - 4]);
    const massPath = () => {
      ctx.beginPath(); ctx.moveTo(x - 2, ceil(x) + 0.5);
      for (const [px, py] of top) ctx.lineTo(px, py);
      for (let k = w; k >= 0; k -= 1.5) ctx.lineTo(x + k, ceil(x + k));
      ctx.closePath();
    };
    const f = v => Math.max(0, Math.min(1, v / w));                                           // החושך נבנה בשכבות פנימה, ומתבהר ביציאה
    const dark = ctx.createLinearGradient(x, 0, x + w, 0);
    dark.addColorStop(0, 'rgba(94,84,71,.3)'); dark.addColorStop(f(BRAMBLE.ramp * 0.3), 'rgba(62,53,44,.8)');
    dark.addColorStop(f(BRAMBLE.ramp * 0.7), '#241d18'); dark.addColorStop(f(w - BRAMBLE.exit - 3), '#241d18');
    dark.addColorStop(1, 'rgba(94,84,71,.4)');
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(x, GROUND); for (let k = 0; k <= w; k += 1.5) ctx.lineTo(x + k, ceil(x + k) - 0.5); ctx.lineTo(x + w, GROUND); ctx.closePath(); ctx.fill();
    const x0 = x + BRAMBLE.ramp * 0.3, x1 = x + w - BRAMBLE.exit * 0.5;                        // שכבה פנימית כהה יותר – עומק
    const inner = ctx.createLinearGradient(x0, 0, x1, 0);
    inner.addColorStop(0, 'rgba(14,11,9,0)'); inner.addColorStop(0.35, 'rgba(14,11,9,.85)'); inner.addColorStop(0.9, 'rgba(14,11,9,.85)'); inner.addColorStop(1, 'rgba(14,11,9,0)');
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.moveTo(x0, GROUND); for (let xx = x0; xx <= x1; xx += 1.5) ctx.lineTo(xx, ceil(xx) + 2.2); ctx.lineTo(x1, GROUND); ctx.closePath(); ctx.fill();
    if (CAVE_STYLE === 'boulders') {                                                         // ניסיון ב': סלעים גדולים כמו ב-HIDE, נערמים לכיפה
      ctx.fillStyle = C.deep; ctx.beginPath(); ctx.moveTo(x + 2, ceil(x + 2));             // גב כהה בין הסלעים – נמוך מקו הכיפה, כדי שהסלעים יקבעו את קו המתאר
      for (let k = 2; k <= w - 2; k += 2) ctx.lineTo(x + k, Math.min(ceil(x + k), dome(k) + 9));
      for (let k = w - 2; k >= 2; k -= 1.5) ctx.lineTo(x + k, ceil(x + k));
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.beginPath();                                                            // מציירים רק מעל התקרה
      ctx.moveTo(x - 6, GROUND - 90); ctx.lineTo(x + w + 6, GROUND - 90); ctx.lineTo(x + w + 6, ceil(x + w));
      for (let k = w; k >= 0; k -= 1.5) ctx.lineTo(x + k, ceil(x + k));
      ctx.lineTo(x - 6, ceil(x)); ctx.closePath(); ctx.clip();
      const rocks = [];
      for (let k = 3, col = 0; k < w - 1; col++) {
        const R = 6.5 + hash(col * 2.3 + 1) * 4.5;
        let yb = dome(k) + (9 + hash(col * 4.1) * 4) * 0.92, row = 0;
        while (row < 6) {
          const H = 9 + hash(col * 7.7 + row * 3.1) * 5;
          rocks.push([x + k + (row % 2 ? R * 0.45 : 0) + (hash(col + row * 9) - 0.5) * 2, yb, R * (0.85 + hash(row * 5 + col) * 0.3), H, hash(col * 11.3 + row * 1.7)]);
          if (yb - H * 0.35 > ceil(x + Math.min(w, k))) break;
          yb += H * 0.62; row++;
        }
        k += R * 1.35;
      }
      rocks.sort((p, q) => p[1] - q[1]);                                                     // הגבוהים מאחור, הנמוכים לפנים
      const j = (sd, i) => (hash(sd * 40 + i) - 0.5) * 0.14;
      for (const [X, yb, R, H, sd] of rocks) {
        const pts = [[X - R, yb], [X - R * (0.95 + j(sd, 1)), yb - H * (0.45 + j(sd, 2))], [X - R * (0.55 + j(sd, 3)), yb - H * (0.92 + j(sd, 4))],
                     [X + R * (0.05 + j(sd, 5)), yb - H], [X + R * (0.6 + j(sd, 6)), yb - H * (0.85 + j(sd, 7))], [X + R, yb - H * (0.35 + j(sd, 8))], [X + R, yb]];
        const g = ctx.createLinearGradient(X - R, yb - H, X + R, yb);
        g.addColorStop(0, sd > 0.5 ? '#cfc5b3' : '#c4bdb1'); g.addColorStop(0.55, sd > 0.5 ? '#958a78' : '#8f8a82'); g.addColorStop(1, '#5e5447');
        ctx.fillStyle = g; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(52,45,38,.6)'; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.22)';                                               // פאה מוארת
        ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(X - R * 0.1, yb - H * 0.6); ctx.lineTo(X - R * 0.8, yb - H * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(52,45,38,.25)'; ctx.beginPath(); ctx.ellipse(X + R * 0.35, yb - H * 0.35, R * 0.12, H * 0.05, 0.3, 0, Math.PI * 2); ctx.fill();   // כתם
      }
      ctx.strokeStyle = '#3d342b'; ctx.lineWidth = 2.4;                                       // שפה כהה לאורך התקרה
      ctx.beginPath(); for (let k = 0; k <= w; k += 1.5) ctx.lineTo(x + k, ceil(x + k)); ctx.stroke();
      ctx.restore();
    } else {
    ctx.save(); massPath(); ctx.fillStyle = C.deep; ctx.fill(); ctx.clip();                  // גוף הסלע, ובתוכו גושי סלע זוויתיים
      const poly = pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
      const chunk = (cx, cy, rw, rh, s) => {                                                  // גוש סלע זוויתי: פאה עליונה מוארת, צד מוצל
        const pts = [];
        for (let i = 0; i < 6; i++) { const an = (i / 6 + (hash(s * 50 + i) - 0.5) * 0.09) * Math.PI * 2 - Math.PI / 2, rr = 0.82 + hash(s * 31 + i) * 0.3; pts.push([cx + Math.cos(an) * rw * rr, cy + Math.sin(an) * rh * rr]); }
        const warm = s > 0.45, light = warm ? C.light : '#d3cfc6', mid = warm ? C.mid : '#a9a49b', dk = warm ? C.dark : '#78736a';
        const g = ctx.createLinearGradient(cx - rw, cy - rh, cx + rw, cy + rh); g.addColorStop(0, mid); g.addColorStop(1, dk);
        ctx.fillStyle = g; poly(pts);
        const ix = cx - rw * 0.1 + (s - 0.5) * rw * 0.3, iy = cy - rh * 0.05;                  // פאה עליונה (בהירה)
        ctx.fillStyle = light; poly([pts[4], pts[5], pts[0], pts[1], [cx + rw * 0.35, iy + rh * 0.1], [ix, iy]]);
        ctx.fillStyle = 'rgba(70,60,50,.28)'; poly([pts[1], pts[2], pts[3], [cx + rw * 0.1, cy + rh * 0.35]]);   // צל בצד הימני-תחתון
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.3; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(70,60,50,.3)'; ctx.beginPath(); ctx.ellipse(cx + (s - 0.5) * rw, cy + rh * 0.3, 0.8, 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
      };
      const list = [], n = Math.round(w * 0.6);
      for (let i = 0; i < n; i++) {                                                             // גושים מפוזרים בגדלים שונים מאוד
        const k = hash(i * 12.9 + 1) * (w + 8) - 4, d = dome(k), c = ceil(Math.min(x + w, Math.max(x, x + k)));
        if (c - d < 2) continue;
        const rw = 4.5 + Math.pow(hash(i * 3.1 + 2), 1.4) * 8, rh = rw * (0.6 + hash(i * 5.7) * 0.3);
        list.push([x + k, d + rh * 0.4 + hash(i * 7.3 + 4) * (c - d), rw, rh, hash(i * 9.1 + 5)]);
      }
      for (let k = 0; k < w; k += 7 + hash(k) * 4) { const rw = 5 + hash(k * 2.2) * 4; list.push([x + k, dome(k) + rw * 0.45, rw, rw * 0.7, hash(k * 4.4 + 9)]); }   // שורת גושים לאורך קו הכיפה
      list.sort((p, q) => p[1] - q[1]);
      for (const c of list) chunk(...c);
      ctx.strokeStyle = 'rgba(232,225,211,.55)'; ctx.lineWidth = 1.4;                           // אור על קו הכיפה
      ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1] + 0.6); for (const [px, py] of top) ctx.lineTo(px, py + 0.6); ctx.stroke();
      ctx.strokeStyle = '#3d342b'; ctx.lineWidth = 2.4;                                         // שפה כהה סביב הפתח והתקרה
      ctx.beginPath(); for (let k = 0; k <= w; k += 1.5) ctx.lineTo(x + k, ceil(x + k)); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.5; massPath(); ctx.stroke();
    }
    ctx.fillStyle = '#3d342b';                                                                // נטיפים קטנים מהתקרה
    for (let k = 3; k < w - 2; k += 4.5) { const c = ceil(x + k); ctx.beginPath(); ctx.moveTo(x + k - 0.8, c); ctx.lineTo(x + k, c + 1 + hash(k) * 0.8); ctx.lineTo(x + k + 0.8, c); ctx.fill(); }
  return dome(14) - 8;
}

function bridgeVents(o) {                         // מקומות הסדקים שמהם פורצת האש
  const n = Math.max(4, Math.round(o.w / 9)), v = [];
  for (let i = 0; i < n; i++) v.push(o.x + (i + 0.5) * o.w / n + (hash(i * 3.3 + 1) - 0.5) * 4);
  return v;
}
function drawFlame(fx, h, wd, t, a) {             // לשון אש: בסיס צהוב, קצה אדום, מרצדת
  if (h < 0.3) return;
  const sway = Math.sin(t * 9 + fx) * wd * 0.35;
  const g = ctx.createLinearGradient(0, GROUND, 0, GROUND - h);
  g.addColorStop(0, 'rgba(254,249,195,' + a + ')'); g.addColorStop(0.3, 'rgba(253,224,71,' + a + ')'); g.addColorStop(0.6, 'rgba(234,88,12,' + a + ')'); g.addColorStop(1, 'rgba(153,27,27,' + a * 0.9 + ')');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(fx - wd, GROUND + 0.5);
  ctx.quadraticCurveTo(fx - wd * 1.1, GROUND - h * 0.45, fx + sway, GROUND - h);
  ctx.quadraticCurveTo(fx + wd * 1.1, GROUND - h * 0.45, fx + wd, GROUND + 0.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,251,235,' + a * 0.8 + ')';                          // לב בהיר
  ctx.beginPath(); ctx.moveTo(fx - wd * 0.4, GROUND + 0.5); ctx.quadraticCurveTo(fx, GROUND - h * 0.45, fx + wd * 0.4, GROUND + 0.5); ctx.fill();
}
function drawBridge(o, bottom) {                  // RUN: שדה שהאדמה בו נסדקת, עשן נמוך, ושרשרת התפרצויות אש שהולכת ומאיצה
  const x = o.x, w = o.w, now = performance.now() / 1000, st = o.stepT, cT = o.cT || 0;
  const near = Math.max(0, Math.min(1, (PLAYER.x + 75 - x) / 55));             // האדמה נסדקת ככל שמתקרבים
  const front = o.front, heat = front === undefined ? 0 : Math.min(1, front / w);
  const sc = ctx.createLinearGradient(x - 4, 0, x + w + 4, 0);                 // אדמה חרוכה – נכהית בהדרגה מהקצוות
  const e = Math.min(0.25, 10 / w);
  sc.addColorStop(0, 'rgba(28,25,23,0)'); sc.addColorStop(e, 'rgba(28,25,23,.78)'); sc.addColorStop(1 - e, 'rgba(28,25,23,.78)'); sc.addColorStop(1, 'rgba(28,25,23,0)');
  ctx.fillStyle = sc; ctx.fillRect(x - 4, GROUND - 0.3, w + 8, bottom - GROUND);
  const glow = ctx.createLinearGradient(0, GROUND - 14, 0, GROUND);            // זוהר חם מעל האדמה כשהאש מתקרבת
  glow.addColorStop(0, 'rgba(249,115,22,0)'); glow.addColorStop(1, 'rgba(249,115,22,' + (0.12 + 0.4 * heat * (1 - Math.min(1, cT / 3))) * near + ')');
  ctx.fillStyle = glow; ctx.fillRect(x, GROUND - 14, w, 14);
  const vents = bridgeVents(o), n = vents.length;
  vents.forEach((vx, i) => {                                                   // סדקים זוהרים שנפערים באדמה ככל שמתקרבים
    const depth = near * (6 + hash(i * 1.7) * 9), pulse = 0.55 + 0.45 * Math.sin(now * 5 + i * 1.3);
    const pts = [[vx, GROUND]];
    for (let k = 1; k <= 5; k++) pts.push([vx + (hash(i * 7 + k * 1.9) - 0.5) * 3.2, GROUND + depth * k / 5]);
    const br = pts[2], bl = 2 + hash(i * 4.4) * 3, bs = hash(i * 2.6) > 0.5 ? 1 : -1;    // ענף צדדי
    const wd = 1.3 * near + heat * 0.6;
    ctx.fillStyle = 'rgba(249,115,22,' + (0.45 + 0.4 * (heat * 0.6 + 0.4) * pulse) * near + ')';
    ctx.beginPath(); ctx.moveTo(vx - wd, GROUND);                                // הסדק עצמו – רחב למעלה, מתחדד למטה
    pts.forEach(([px, py], k) => ctx.lineTo(px - wd * (1 - k / 5), py));
    for (let k = 5; k >= 0; k--) ctx.lineTo(pts[k][0] + wd * (1 - k / 5), pts[k][1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(249,115,22,' + 0.6 * near + ')'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(br[0], br[1]); ctx.lineTo(br[0] + bs * bl, br[1] + bl * 0.8); ctx.lineTo(br[0] + bs * bl * 1.4, br[1] + bl * 1.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(254,240,138,' + (0.4 + 0.6 * heat) * near + ')'; ctx.lineWidth = 0.35;   // לב צהוב בוהק
    ctx.beginPath(); pts.slice(0, 4).forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
  });
  const flameH = i => {                                                        // גובה האש בכל סדק: מתחילה מהצד הרחוק, מתקרבת ומאיצה
    if (front === undefined) return 0;
    const behind = front - (vents[i] - x);                                      // כמה החזית כבר עברה את הסדק הזה
    if (behind < -3) return 0;
    let h = behind < 0 ? 3 * (1 + behind / 3) : 8 + 20 * Math.min(1, behind / 10) + hash(i * 5.1) * 6;
    h *= Math.max(0, 1 - Math.max(0, cT - 1.6) / 1.2);
    return h * (0.88 + 0.12 * Math.sin(now * 14 + i * 2));
  };
  vents.forEach((vx, i) => {                                                   // עשן כהה מאחורי האש – נותן ניגוד על כל רקע
    const h = flameH(i); if (h < 4) return;
    for (let k = 0; k < 3; k++) {
      const py = GROUND - h * (0.55 + k * 0.3) - k * 2, r = h * 0.28 + k * 1.5 + 2, dx = Math.sin(now * 1.5 + i + k) * 1.5;
      ctx.save(); ctx.translate(vx + dx, py); ctx.scale(1, 1.25);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, 'rgba(41,37,36,' + (0.55 - k * 0.12) + ')'); rg.addColorStop(1, 'rgba(41,37,36,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  });
  vents.forEach((vx, i) => {
    const h = flameH(i);
    drawFlame(vx, h, h > 16 ? 4.2 : 3, now + i, 0.95);
    if (h > 6) { drawFlame(vx - 2, h * 0.6, 2, now + i + 3, 0.8); drawFlame(vx + 2.2, h * 0.5, 1.8, now + i + 7, 0.8); }
    if (h > 2 && Math.random() < 0.18) particles.push({ x: vx + (Math.random() - 0.5) * 2, y: GROUND - h * 0.7, vx: (Math.random() - 0.5) * 6, vy: -14, g: 6, life: 0.6, color: Math.random() < 0.5 ? '#fde047' : '#fb923c', size: 0.7 });
  });
  if (!(front >= w)) label('RUN', x + w / 2, GROUND - 16, 4, '#fde047', '#1e293b');
}
function drawFieldSmoke(o) {                      // עשן נמוך מעל שדה האש – מצויר מעל הנינג'ה, אז הרגליים נראות דהויות
  const x = o.x, w = o.w, now = performance.now() / 1000;
  const near = Math.max(0, Math.min(1, (PLAYER.x + 75 - x) / 55));
  if (near <= 0) return;
  const heat = o.front === undefined ? 0 : Math.min(1, o.front / w), fade = Math.max(0, 1 - Math.max(0, (o.cT || 0) - 2.5) / 1.5);
  const hgt = 3.5 + 2 * heat;
  for (let layer = 0; layer < 2; layer++)
    for (let k = -4; k < w + 4; k += 6) {
      const drift = Math.sin(now * (0.7 + layer * 0.4) + k * 0.3) * 2.5, cx = x + k + drift;
      const r = 4 + hash(k * 1.3 + layer) * 2.5, cy = GROUND - hgt * (0.4 + layer * 0.45) + Math.sin(now + k) * 0.5;
      const col = layer ? '168,162,158' : '120,113,108', a0 = (0.42 + 0.1 * heat) * near * fade;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1.6, 0.6);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, 'rgba(' + col + ',' + a0 + ')'); rg.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

function drawRiver(o, bottom) {                  // FLY: בור לבה רותחת – קופצים ועפים מעליו
  const x = o.x, w = o.w, t = performance.now() / 1000, cx = x + w / 2;
  ctx.save(); ctx.translate(cx, GROUND); ctx.scale(w / 2 + 22, 50);                       // זוהר חם רחב, עולה גבוה ונמתח מעבר לשפות
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  halo.addColorStop(0, 'rgba(251,146,60,.75)'); halo.addColorStop(0.45, 'rgba(249,115,22,.35)'); halo.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 1, Math.PI, 0); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 6; i++) {                                                              // אוויר חם מרצד שעולה מהלבה
    const hx = x + 4 + (i + 0.5) * (w - 8) / 6 + Math.sin(t * 1.3 + i) * 2;
    const grd = ctx.createLinearGradient(0, GROUND, 0, GROUND - 40);
    grd.addColorStop(0, 'rgba(251,146,60,.55)'); grd.addColorStop(0.5, 'rgba(253,186,116,.25)'); grd.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.strokeStyle = grd; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, GROUND);
    for (let yy = 0; yy <= 40; yy += 2) ctx.lineTo(hx + Math.sin(t * 5 + yy * 0.35 + i * 2) * (1 + yy * 0.06), GROUND - yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#292524'; ctx.fillRect(x, GROUND - 0.2, w, bottom - GROUND);          // סלע כהה מסביב
  const g = ctx.createLinearGradient(0, GROUND + 1, 0, GROUND + 12);
  g.addColorStop(0, '#fef08a'); g.addColorStop(0.3, '#f97316'); g.addColorStop(1, '#991b1b');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + 1.5, bottom);
  for (let i = 0; i <= w - 3; i += 2) ctx.lineTo(x + 1.5 + i, GROUND + 1.4 + Math.sin(t * 3 + i * 0.5) * 0.6);
  ctx.lineTo(x + w - 1.5, bottom); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(127,29,29,.55)';                                                     // קרום כהה שצף ונמס
  for (let i = 0; i < 4; i++) { const px = x + 3 + ((i * 41 + t * 4) % Math.max(6, w - 8)); ctx.beginPath(); ctx.ellipse(px, GROUND + 3.2 + (i % 2), 2.2, 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 7; i++) {                                                              // בועות גדולות: גדלות, מתפוצצות ומתיזות
    const per = 1.1 + (i % 3) * 0.35, ph = ((t + i * 0.53) % per) / per;
    const bx = x + 3 + ((i * 29 + Math.floor((t + i * 0.53) / per) * 13) % Math.max(6, w - 6));
    if (ph < 0.75) {
      const r = 0.7 + ph * 3.6;
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(bx, GROUND + 1.8, r, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(254,240,138,.85)'; circle(bx - r * 0.35, GROUND + 1.8 - r * 0.45, r * 0.25);
    } else {
      const k = (ph - 0.75) / 0.25;
      ctx.strokeStyle = 'rgba(254,240,138,' + (1 - k) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.ellipse(bx, GROUND + 1.8, 1.5 + k * 4.5, 0.5 + k * 1, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(253,186,116,' + (1 - k) + ')';
      for (let d = -1; d <= 1; d++) circle(bx + d * k * 3, GROUND + 1.5 - k * 5 + k * k * 4, 0.35);
    }
  }
  for (let i = 0; i < 12; i++) {                                                             // גצים שעולים גבוה ומהבהבים
    const ph = (t * 0.45 + i * 0.137) % 1, ex = x + 2 + ((i * 53) % Math.max(6, w - 4)) + Math.sin(t * 3 + i) * (1 + ph * 3);
    ctx.fillStyle = 'rgba(' + (ph < 0.5 ? '254,215,170' : '251,146,60') + ',' + (1 - ph) * (0.6 + 0.4 * Math.sin(t * 20 + i)) + ')';
    circle(ex, GROUND - ph * 30, 0.45 * (1 - ph) + 0.15);
  }
  ctx.fillStyle = '#44403c';                                                                 // שפות סלע משוננות
  for (const side of [0, 1]) {
    const ex = side ? x + w : x, d = side ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(ex, GROUND); for (let k = 1; k <= 6; k++) ctx.lineTo(ex + d * (k % 2 ? 2 : 0.7), GROUND + k * 3); ctx.lineTo(ex, GROUND + 20); ctx.closePath(); ctx.fill();
  }
  label('JUMP + FLY', cx, GROUND - 10, 4, '#fde047', '#1e293b');
}

function drawPond(o, bottom) {                   // DIVE: מים עמוקים – רשת תלויה עד פני המים
  const x = o.x, w = o.w, t = performance.now() / 400;
  const g = ctx.createLinearGradient(0, GROUND, 0, bottom);
  g.addColorStop(0, '#0ea5e9'); g.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = g; ctx.fillRect(x, GROUND + 0.5, w, bottom - GROUND);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.35;
  for (let i = 3; i < w - 4; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, GROUND + 1.2 + Math.sin(t + i) * 0.3); ctx.quadraticCurveTo(x + i + 2, GROUND + 0.6, x + i + 4, GROUND + 1.2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.35)';                                      // בועות מהעומק
  for (let i = 0; i < 4; i++) { const ph = (t * 0.3 + i * 0.27) % 1; circle(x + 5 + ((i * 29) % Math.max(6, w - 8)), GROUND + 12 - ph * 10, 0.5); }
}
function drawNet(o) {                            // רשת במבוק תלויה מקורה, עם מצופים על המים
  const nx = netX(o), top = GROUND - 30, nw = POND.net + 3, lx = nx - 1.5;
  ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(lx - 2, top - 30); ctx.lineTo(lx - 2, top); ctx.moveTo(lx + nw + 2, top - 30); ctx.lineTo(lx + nw + 2, top); ctx.stroke();
  ctx.fillStyle = '#65a30d'; roundRect(lx - 4, top - 1.6, nw + 8, 2.4, 1.1); ctx.fill();   // קורת במבוק
  ctx.strokeStyle = 'rgba(41,37,36,.85)'; ctx.lineWidth = 0.35;
  const bot = GROUND + POND.deep + 1;                                          // הרשת יורדת עמוק לתוך המים
  for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(lx + k * nw / 4, top); ctx.lineTo(lx + k * nw / 4, bot); ctx.stroke(); }
  ctx.fillStyle = '#57534e'; for (let k = 0; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(lx + k * nw / 2, bot, 0.9, 0.6, 0, 0, Math.PI * 2); ctx.fill(); }   // משקולות בתחתית
  for (let y = top + 2.5; y < bot; y += 2.5) { ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + nw, y); ctx.stroke(); }
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#ef4444'; circle(lx + k * nw / 2, GROUND + 0.9, 0.8); }
  if (!o.passed) label('DIVE', lx + nw / 2, top - 6, 4, '#fde047', '#1e293b');
}

function drawEnemy(o) {
  const w = ENEMY.w, fx = o.x + w / 2;
  ctx.save();
  if (o.defeated) {                              // נופל ונעלם
    ctx.globalAlpha = Math.max(0, 1 - o.ft * 1.5);
    ctx.translate(fx, GROUND); ctx.rotate(-Math.min(1.5, o.ft * 4)); ctx.translate(-fx, -GROUND);
  }
  const now = performance.now() / 1000;
  const pose = o.defeated ? poseIdle(now) : (speed > 0 ? poseRun(now * 10 + o.x) : poseIdle(now));
  if (!o.defeated) pose.arms[1] = [0.9, 1.9 + Math.sin(now * 8) * 0.12];   // סמוראי: חרב מורמת קדימה
  drawFigure({ fx, fy: GROUND, facing: -1, scale: ENEMY.h / 14, kind: 'enemy', pose });
  ctx.restore();
  if (!o.defeated) label('THROW', fx, GROUND - ENEMY.h - 10, 4, '#fde047', '#1e293b');
}

// שיח עגול ומלא, מתנדנד כשנכנסים, ועיניים מציצות וממצמצות
function drawBush(x, y, grow, t, now) {         // שיח מעלים מצוירים: שכבה כהה מאחור, בהירה מקדימה, וריד בכל עלה
  const sc = 0.4 + 0.6 * grow, rustle = Math.sin(t * 22) * 0.12 * Math.max(0, 1 - t / 0.7);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(-25, -40, 50, 40.6); ctx.clip();          // שום עלה לא יורד מתחת לקרקע
  const leaf = (lx, ly, len, wd, ang, col, vein) => {
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wd, len, 0); ctx.quadraticCurveTo(len * 0.45, wd, 0, 0); ctx.fill();
    ctx.strokeStyle = vein; ctx.lineWidth = 0.18; ctx.beginPath(); ctx.moveTo(0.3, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
    ctx.restore();
  };
  const PAL = ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80'];
  ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.ellipse(0, -7.2, 9, 7.2, 0, 0, Math.PI * 2); ctx.fill();   // גוף כהה מתחת לעלים
  const L = [];
  for (let i = 0; i < 150; i++) {                                      // עלים מפוזרים על כל כיפת השיח
    const ang = hash(i * 3.1) * Math.PI * 2, rr = Math.sqrt(hash(i * 7.7 + 1));
    const px = Math.cos(ang) * rr * 9.5, py = -7.5 + Math.sin(ang) * rr * 8;
    if (py > -0.6) continue;
    const shade = Math.max(0, Math.min(5, Math.round(2.2 - px * 0.12 - (py + 7.5) * 0.22 + rr * 0.6 * (py < -7 ? 1 : -1) + (hash(i + 9) - 0.5) * 1.6)));
    L.push({ px, py, rr, a: Math.atan2(py + 5, px) + (hash(i * 5) - 0.5) * 0.9, len: 3 + hash(i * 11) * 1.4, shade });
  }
  L.sort((p, q) => q.rr - p.rr);                                       // קודם העלים בשוליים, ואז הפנימיים מעליהם
  L.forEach(l => leaf(l.px, l.py, l.len, l.len * 0.42, l.a + rustle, PAL[l.shade], PAL[Math.min(5, l.shade + 2)]));
  for (let i = 0; i < 9; i++) {                                         // עלים בתחתית, נוגעים בקרקע
    const lx = -8 + i * 2, a = i < 4 ? Math.PI * 0.9 : i > 4 ? Math.PI * 0.1 : -Math.PI / 2;
    leaf(lx, -1.2, 3.4, 1.4, a + rustle, i % 2 ? '#166534' : '#15803d', '#22c55e');
  }
  ctx.fillStyle = '#f472b6'; [[-6, -4], [6.5, -9], [-2.5, -13.5], [3.5, -3]].forEach(([bx, by]) => { circle(bx, by, 0.65); ctx.fillStyle = '#fde047'; circle(bx, by, 0.25); ctx.fillStyle = '#f472b6'; });
  const blink = (now % 3) < 0.12;                                       // עיניים מציצות מבין העלים
  ctx.fillStyle = '#052e16'; ctx.beginPath(); ctx.ellipse(1, -8.6, 3.4, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-0.4, -8.6, 1.1, blink ? 0.15 : 1, 0, 0, Math.PI * 2); ctx.ellipse(2.4, -8.6, 1.1, blink ? 0.15 : 1, 0, 0, Math.PI * 2); ctx.fill();
  if (!blink) { ctx.fillStyle = '#000'; circle(-0.1, -8.6, 0.5); circle(2.7, -8.6, 0.5); }
  ctx.restore();
}

function drawNinja() {
  const pb = playerBox();
  const swim = swimmingNow();
  const drowning = drownK > 0 && !swim && py <= 0 && sinkT <= 0;     // במים בלי SWIM – שוקע
  const dive = diving(), leap = act.leap > 0, crawl = crawling() && !swim;
  const duck = duckT > 0, fx = leap || dive || crawl ? PLAYER.x + 3 : pb.l + (duck ? 5.5 : swim ? 3 : 4);
  const fy = dive ? GROUND + POND.deep + 7 : leap ? GROUND - py : swim ? GROUND + 1.5 : drowning ? GROUND + drownK * 10 : pb.b;
  const now = performance.now() / 1000;
  if (sinkT > 0 && sinkType === 'burn') {                                       // נשרף בשדה האש – מושחר ועשן עולה
    const k = 1 - sinkT / SINK_TIME;
    drawFigure({ fx, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: '#292524', pose: poseAir(false) });
    if (k < 0.35) burst(fx, GROUND - 6, '#f97316', 2, 25);
    if (Math.random() < 0.5) particles.push({ x: fx + (Math.random() - 0.5) * 5, y: GROUND - 10, vx: 0, vy: -10, g: -4, life: 0.9, color: 'rgba(68,64,60,.75)', size: 1.8 });
    return;
  }
  if (sinkT > 0) {                                                               // נופל לתהום או שוקע במים
    const k = 1 - sinkT / SINK_TIME;
    ctx.save();
    ctx.beginPath(); ctx.rect(fx - 20, GROUND - 40, 40, 40 + (sinkType === 'fall' ? 60 : 0)); ctx.clip();
    if (sinkType !== 'fall') { ctx.beginPath(); ctx.rect(fx - 20, GROUND - 40, 40, 40.5); ctx.clip(); }   // במים – נעלם מתחת לפני המים
    ctx.translate(fx, GROUND + k * k * (sinkType === 'fall' ? 45 : 16));
    ctx.rotate(sinkType === 'fall' ? k * 2.5 : 0);
    drawFigure({ fx: 0, fy: 0, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: poseAir(false), suit: playerSuit() });
    ctx.restore();
    if (sinkType !== 'fall' && k < 0.4) burst(fx, GROUND, sinkType === 'lava' ? '#f97316' : '#bae6fd', 2, 25);   // התזה
    if (sinkType === 'lava' && Math.random() < 0.4) particles.push({ x: fx + (Math.random() - 0.5) * 6, y: GROUND - 2, vx: 0, vy: -10, g: -4, life: 0.8, color: 'rgba(120,113,108,.7)', size: 1.6 });   // עשן
    return;
  }
  if (act.run > 0) {                                                              // קווי מהירות
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.5;
    for (let k = 0; k < 3; k++) { const yy = fy - 4 - k * 3.5, o2 = ((now * 60 + k * 7) % 10); ctx.beginPath(); ctx.moveTo(fx - 6 - o2, yy); ctx.lineTo(fx - 13 - o2, yy); ctx.stroke(); }
  }
  // צל על הקרקע
  if (!swim && !drowning && !dive) ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.05, 0.22 - py * 0.006) + ')';
  else ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.beginPath(); ctx.ellipse(fx + 0.5, GROUND + 0.6, Math.max(1.5, 4.5 - py * 0.08), 0.9, 0, 0, Math.PI * 2); ctx.fill();
  if (invulnT > 0 && Math.floor(invulnT * 10) % 2 === 0) return;   // הבהוב אחרי פגיעה

  // גלשן מעל הראש בזמן FLY
  if (flyT > 0) {
    const gy = fy - 15.5, gx = fx + 0.5;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(gx - 0.5, gy + 3); ctx.lineTo(gx - 9, gy - 2.5); ctx.moveTo(gx + 0.5, gy + 3); ctx.lineTo(gx + 9, gy - 2.5); ctx.stroke();
    ctx.fillStyle = playerColor();
    ctx.beginPath(); ctx.moveTo(gx - 12, gy - 1.5); ctx.lineTo(gx, gy - 7.5); ctx.lineTo(gx + 12, gy - 1.5); ctx.lineTo(gx, gy - 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(gx - 6, gy - 4.5); ctx.lineTo(gx, gy - 7.5); ctx.lineTo(gx, gy - 3.5); ctx.closePath(); ctx.fill();
  }

  if (act.roll > 0 && py <= 0 && !leap) {                         // גלגול אחרי הזינוק: מכווץ ומסתובב סיבוב שלם
    const k = 1 - act.roll / LEAP.roll, P = Object.assign(poseAir(false), { hipY: -3, lean: 0.9, legs: [[1.9, -1.2], [2.1, -1.0]], arms: [[1.6, -1.0], [1.8, -0.8]], bob: 0 });
    ctx.save(); ctx.translate(fx + 1, GROUND - 3.6); ctx.rotate(k * Math.PI * 2);
    drawFigure({ fx: 0, fy: 3.6, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    ctx.restore();
    drawPet(fx, fy);
    return;
  }
  const P = drowning ? poseFly(now * 4) : playerPose();          // שוקע – מנופף בידיים
  if (hasGear('katana')) drawKatana(fx, fy, P);                  // קטאנה על הגב – מאחורי הגוף
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  drawPet(fx, fy);
  if (drowning) {
    if (Math.random() < 0.25) particles.push({ x: fx + (Math.random() - 0.5) * 4, y: GROUND, vx: 0, vy: -8, g: 0, life: 0.5, color: '#e0f2fe', size: 0.9 });
    label('SWIM!', fx, GROUND - 22, 4.4, '#dc2626', '#fff');
  }

  // קו תנועה בבעיטה
  if (kickT > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(fx, fy - 4.6, 6.5, -1.5, -0.1); ctx.stroke();
  }
}

