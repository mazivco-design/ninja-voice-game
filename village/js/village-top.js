/* ============================================================
   village/js/village-top.js – אב־טיפוס של הכפר במבט מלמעלה (מוטה).
   כפר יפני בסגנון עולמות הארקייד: בתי עץ עם קירות נייר וגגות מעוקלים,
   במבוק, עצי דובדבן ואורנים, פנסי אבן, שער טוריי ובריכת קוי.
   הקרקע "שוכבת" (מכווצת לגובה), והעצמים עומדים זקופים – כך נוצרת הזווית.
   רק לבדוק תחושה: בלי קול, בלי צלילים ובלי תוכן לימודי.
   ============================================================ */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');

let SW = 0, SH = 0, DPR = 1;

const K = 0.6;                          // כמה הקרקע מכווצת לגובה (1 = מבט ישר מלמעלה)
const ACCENT = '#dc2626';               // צבע ברירת המחדל של השחקן בארקייד
const NR = 9;                           // "רדיוס" הנינג'ה לצורך התנגשויות (בקואורדינטות קרקע)
const SPEED = 140;                      // פיקסלים על המסך בשנייה

// ---------- עזרים ----------
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); g.fill(); }
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255;
  const f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
}
function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ============================================================
//   הדמויות – נינג'ה שטוח בלי קו מתאר, ב־4 כיוונים
// ============================================================
const NINJA_LOOK = { body: '#1e293b', limb: '#111a2b', limbBack: '#0b1220', skin: '#fcd9b6', eyes: '#000', accent: ACCENT, band: true };
const ELDER_LOOK = { body: '#6b4f2e', limb: '#56401f', limbBack: '#3f2e16', skin: '#f1c7a1', eyes: '#2b1d10', accent: '#a16207', band: false, hat: '#d9b968', beard: '#e7e5e4' };

function drawChar(g, x, y, dir, phase, walking, L) {
  const step = walking ? Math.sin(phase) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * 1.4 : Math.sin(phase * 0.5) * 0.4;
  g.fillStyle = 'rgba(20,30,10,.28)'; ell(g, x, y, 11, 4.2);
  g.save(); g.translate(x, y - bob);
  if (dir === 'left') g.scale(-1, 1);
  if (dir === 'up' || dir === 'down') {
    g.fillStyle = L.limb;
    const lL = 10 - Math.max(0, step) * 3, lR = 10 - Math.max(0, -step) * 3;
    rr(g, -6.5, -11, 5, lL + 1, 2.3); g.fill();
    rr(g, 1.5, -11, 5, lR + 1, 2.3); g.fill();
    const aL = step * 1.6, aR = -step * 1.6;
    if (dir === 'up') armsFB(g, L, aL, aR);
    g.fillStyle = L.body; rr(g, -8, -24, 16, 15, 5); g.fill();
    g.fillStyle = L.accent; g.fillRect(-8, -13.5, 16, 2.4);
    if (dir === 'down') armsFB(g, L, aL, aR);
    drawHead(g, L, dir, step);
  } else {
    const sw = step * 0.55;
    legSide(g, L.limbBack, -sw);
    armSide(g, L.limbBack, L.accent, sw * 1.1, true);
    legSide(g, L.limb, sw);
    g.fillStyle = L.body; rr(g, -6.5, -24, 13, 15, 5); g.fill();
    g.fillStyle = L.accent; g.fillRect(-6.5, -13.5, 13, 2.4);
    armSide(g, L.limb, L.accent, -sw * 1.1, false);
    drawHead(g, L, 'right', step);
  }
  g.restore();
}
function armsFB(g, L, aL, aR) {
  g.fillStyle = L.limb;
  rr(g, -11.5, -23 + aL, 4.2, 11, 2.1); g.fill();
  rr(g, 7.3, -23 + aR, 4.2, 11, 2.1); g.fill();
  g.fillStyle = L.accent; circ(g, -9.4, -11.5 + aL, 2.4); circ(g, 9.4, -11.5 + aR, 2.4);
}
function legSide(g, col, a) { g.save(); g.translate(0, -11); g.rotate(a); g.fillStyle = col; rr(g, -2.6, 0, 5.2, 11, 2.4); g.fill(); g.restore(); }
function armSide(g, col, acc, a, back) {
  g.save(); g.translate(back ? 1.5 : -0.5, -22); g.rotate(a);
  g.fillStyle = col; rr(g, -2.1, 0, 4.2, 11, 2.1); g.fill();
  g.fillStyle = acc; circ(g, 0, 11.2, 2.3); g.restore();
}
function drawHead(g, L, dir, step) {
  const hy = -31, R = 9;
  g.fillStyle = L.body; circ(g, 0, hy, R);
  g.save(); g.beginPath(); g.arc(0, hy, R, 0, Math.PI * 2); g.clip();
  if (L.band) { g.fillStyle = L.accent; g.fillRect(-R, hy - 6.2, 2 * R, 2.6); }
  if (dir === 'down') {
    g.fillStyle = L.skin; rr(g, -6.6, hy - 2.6, 13.2, 5.6, 2.6); g.fill();
    g.fillStyle = L.eyes; circ(g, -2.8, hy + 0.2, 1.15); circ(g, 2.8, hy + 0.2, 1.15);
  } else if (dir === 'right') {
    g.fillStyle = L.skin; rr(g, 1, hy - 2.6, 9, 5.6, 2.6); g.fill();
    g.fillStyle = L.eyes; circ(g, 5.6, hy + 0.2, 1.15);
  }
  if (L.beard && dir === 'down') { g.fillStyle = L.beard; ell(g, 0, hy + 6.5, 5.5, 4); }
  g.restore();
  if (L.band) {
    g.fillStyle = L.accent; const t = step * 1.5;
    if (dir === 'up') {
      circ(g, 0, hy - 4.9, 2);
      g.beginPath(); g.moveTo(-1, hy - 4); g.lineTo(-3.5 + t, hy + 6); g.lineTo(-1.2 + t, hy + 6.5); g.lineTo(0.5, hy - 4); g.fill();
      g.beginPath(); g.moveTo(1, hy - 4); g.lineTo(3.6 - t, hy + 5); g.lineTo(1.6 - t, hy + 5.6); g.lineTo(-0.2, hy - 4); g.fill();
    } else if (dir === 'right') {
      circ(g, -8.2, hy - 4.9, 1.9);
      g.beginPath(); g.moveTo(-8.5, hy - 5.5); g.lineTo(-15 + t, hy - 2 + t); g.lineTo(-14.5 + t, hy + 0.4 + t); g.lineTo(-8, hy - 4); g.fill();
    }
  }
  if (L.hat) {
    g.fillStyle = 'rgba(0,0,0,.12)'; ell(g, 0, hy + 1.5, 13.5, 6);
    g.fillStyle = L.hat; g.beginPath(); g.moveTo(-14, hy + 1); g.quadraticCurveTo(0, hy - 14, 14, hy + 1); g.quadraticCurveTo(0, hy + 4, -14, hy + 1); g.fill();
    g.fillStyle = '#c9a54f'; g.fillRect(-0.6, hy - 8, 1.2, 3);
  }
}

// ============================================================
//   הכפר בחוץ (כל הקואורדינטות כאן הן "קרקע"; על המסך y מוכפל ב־K)
// ============================================================
const OUT = {
  w: 1400, h: 1000, cell: 16,
  start: { x: 700, y: 650, dir: 'down' },
  paths: [
    [[-20, 610], [300, 596], [700, 566], [1100, 586], [1420, 566]],
    [[520, 580], [520, 432]],
    [[810, 572], [915, 470], [915, 352]],
    [[1000, 584], [1000, 815], [1155, 815], [1155, 752]],
    [[700, 566], [700, 900], [470, 920]]
  ],
  houses: [
    { x: 430, y: 300, w: 180, h: 130, roof: 'tile', enter: true },
    { x: 830, y: 230, w: 170, h: 120, roof: 'thatch', enter: false },
    { x: 1070, y: 620, w: 170, h: 130, roof: 'tile2', enter: false }
  ],
  trees: [['cherry', 262, 290, 1.1], ['pine', 200, 410, 1], ['cherry', 330, 470, 0.85], ['pine', 650, 250, 1], ['cherry', 1110, 330, 1],
          ['pine', 1190, 460, 0.9], ['cherry', 1305, 480, 0.9], ['pine', 880, 720, 1], ['cherry', 565, 715, 0.9], ['pine', 1300, 800, 1.1],
          ['cherry', 150, 910, 1], ['pine', 80, 700, 1], ['cherry', 1010, 935, 0.9], ['pine', 1350, 660, 0.9], ['cherry', 880, 860, 0.8]],
  groves: [[380, 170, 9], [760, 140, 8], [1230, 170, 8], [120, 230, 7], [1230, 905, 7], [560, 960, 6]],
  lanterns: [[470, 532], [600, 614], [880, 614], [640, 770], [760, 770]],
  torii: { x: 700, y: 820, half: 44 },
  well: { x: 800, y: 690, r: 24 },
  pond: { x: 330, y: 790, rx: 125, ry: 72 },
  rocks: [[1060, 470, 10], [960, 690, 8], [210, 700, 12], [445, 715, 9], [465, 860, 10]],
  bushes: []
};
(function makeBorder() {
  const R = rng(7);
  for (let x = 30; x < OUT.w; x += 60) {
    OUT.bushes.push([x + R() * 20, 28 + R() * 10, 22 + R() * 8, R() < 0.4]);
    OUT.bushes.push([x + R() * 20, OUT.h - 12 - R() * 6, 22 + R() * 8, R() < 0.4]);
  }
  for (let y = 90; y < OUT.h - 60; y += 60) {
    if (Math.abs(y - 605) > 60) OUT.bushes.push([18 + R() * 8, y + R() * 20, 22 + R() * 8, R() < 0.4]);
    if (Math.abs(y - 566) > 60) OUT.bushes.push([OUT.w - 18 - R() * 8, y + R() * 20, 22 + R() * 8, R() < 0.4]);
  }
  // גבעולי במבוק לכל חורשה
  OUT.groves = OUT.groves.map(([gx, gy, n], gi) => {
    const R2 = rng(100 + gi), stalks = [];
    for (let i = 0; i < n; i++) stalks.push([gx + (R2() - 0.5) * 70, gy + (R2() - 0.5) * 34, 0.75 + R2() * 0.5, R2()]);
    return { x: gx, y: gy, stalks };
  });
})();
const WALL = 60, RISE = 44;
OUT.houses.forEach(h => {
  h.doorX = h.x + h.w / 2;
  h.zone = { x: h.doorX - 17, y: h.y + h.h, w: 34, h: 22 };
  h.front = (h.y + h.h) * K;
  h.eave = h.front - WALL + 6;
  h.ridge = (h.y + h.h / 2) * K - WALL - RISE;
  h.hit = { x: h.x - 26, y: h.ridge - 12, w: h.w + 52, h: h.front - h.ridge + 12 };   // על המסך
});

OUT.blocked = function (x, y) {
  if (x < 34 || y < 56 || x > this.w - 34 || y > this.h - 26) return true;
  for (const h of this.houses) if (x > h.x - NR && x < h.x + h.w + NR && y > h.y - NR && y < h.y + h.h + 6) return true;
  const hitC = (cx, cy, r) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r; };
  for (const t of this.trees) if (hitC(t[1], t[2], 9 + NR)) return true;
  for (const g of this.groves) for (const s of g.stalks) if (hitC(s[0], s[1], 5 + NR)) return true;
  for (const l of this.lanterns) if (hitC(l[0], l[1], 7 + NR)) return true;
  for (const r of this.rocks) if (hitC(r[0], r[1], r[2] + NR - 2)) return true;
  if (hitC(this.torii.x - this.torii.half, this.torii.y, 5 + NR) || hitC(this.torii.x + this.torii.half, this.torii.y, 5 + NR)) return true;
  if (hitC(this.well.x, this.well.y, this.well.r + NR)) return true;
  { const p = this.pond, dx = (x - p.x) / (p.rx + NR - 6), dy = (y - p.y) / (p.ry + NR - 6); if (dx * dx + dy * dy < 1) return true; }
  return false;
};

// ---------- הקרקע (פעם אחת, לקנבס נפרד, בקואורדינטות קרקע) ----------
let groundCv = null;
function buildGround() {
  const GS = Math.min(2, Math.max(1, view.z * DPR));
  groundCv = document.createElement('canvas');
  groundCv.width = Math.ceil(OUT.w * GS); groundCv.height = Math.ceil(OUT.h * GS * K);
  const g = groundCv.getContext('2d');
  g.scale(GS, GS * K);
  const R = rng(42);
  // טחב ודשא בשכבות עדינות
  g.fillStyle = '#5d8f45'; g.fillRect(0, 0, OUT.w, OUT.h);
  for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,90,30,.07)' : 'rgba(170,210,110,.07)'; ell(g, R() * OUT.w, R() * OUT.h, 60 + R() * 140, 40 + R() * 90); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(35,80,25,.11)'; ell(g, R() * OUT.w, R() * OUT.h, 6 + R() * 18, 4 + R() * 12); }
  // עלי כותרת ורודים מתחת לעצי הדובדבן
  OUT.trees.forEach(t => {
    if (t[0] !== 'cherry') return;
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = R() * 60; g.fillStyle = R() < 0.5 ? 'rgba(251,207,232,.85)' : 'rgba(244,164,200,.8)'; ell(g, t[1] + Math.cos(a) * d + 8, t[2] + Math.sin(a) * d, 2, 2.6); }
  });
  // שבילי חצץ: שוליים כהים, חצץ בהיר, אבנים קטנות
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (w, col) => { g.strokeStyle = col; g.lineWidth = w; OUT.paths.forEach(p => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }); };
  stroke(52, 'rgba(50,60,30,.3)');
  stroke(46, '#a89c7e');
  stroke(38, '#d6ccb2');
  stroke(18, 'rgba(236,230,214,.5)');
  OUT.paths.forEach(p => {
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i], len = Math.hypot(bx - ax, by - ay);
      for (let d = 0; d < len; d += 6) {
        if (R() < 0.4) continue;
        const k = d / len, ox = (R() - 0.5) * 32, oy = (R() - 0.5) * 32;
        g.fillStyle = R() < 0.5 ? 'rgba(120,110,85,.45)' : 'rgba(250,246,235,.6)'; ell(g, ax + (bx - ax) * k + ox, ay + (by - ay) * k + oy, 1.4 + R() * 1.6, 1.4 + R() * 1.6);
      }
    }
  });
  // כיכר הבאר – אבנים מרוצפות
  g.fillStyle = '#a89c7e'; ell(g, OUT.well.x, OUT.well.y + 6, 64, 54);
  g.fillStyle = '#c9bea2'; ell(g, OUT.well.x, OUT.well.y + 6, 57, 47);
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = 30 + R() * 22; g.fillStyle = 'rgba(140,130,105,.55)'; ell(g, OUT.well.x + Math.cos(a) * d, OUT.well.y + 6 + Math.sin(a) * d * 0.82, 6 + R() * 3, 5 + R() * 3); }
  // בריכת קוי: גדה, מים, ברק, עלי לוטוס, קנים
  const p = OUT.pond;
  g.fillStyle = '#7d7660'; ell(g, p.x, p.y + 4, p.rx + 10, p.ry + 10);
  g.fillStyle = '#2b5f74'; ell(g, p.x, p.y, p.rx, p.ry);
  g.fillStyle = '#3a7d96'; ell(g, p.x - 8, p.y - 10, p.rx - 20, p.ry - 22);
  g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, p.x - 40, p.y - 30, 28, 7); ell(g, p.x + 34, p.y + 14, 16, 4);
  g.fillStyle = '#4b8f3b'; ell(g, p.x + 72, p.y - 22, 10, 10); ell(g, p.x - 62, p.y + 28, 9, 9); ell(g, p.x + 54, p.y + 34, 7, 7);
  g.fillStyle = '#f9a8d4'; circ(g, p.x + 72, p.y - 24, 3);
  for (let i = 0; i < 18; i++) { const a = R() * 6.28; g.fillStyle = R() < 0.5 ? '#8d8a80' : '#a8a498'; ell(g, p.x + Math.cos(a) * (p.rx + 6), p.y + Math.sin(a) * (p.ry + 6), 7 + R() * 6, 6 + R() * 5); }
  // גבעולי דשא (גבוהים יותר כי הקרקע מתכווצת לגובה) ופרחים
  for (let i = 0; i < 700; i++) {
    const x = R() * OUT.w, y = R() * OUT.h;
    if (onPath(x, y, 26)) continue;
    g.strokeStyle = R() < 0.5 ? 'rgba(40,95,30,.7)' : 'rgba(140,190,90,.7)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 8); g.moveTo(x + 1.5, y); g.lineTo(x + 2.5, y - 10); g.moveTo(x + 3, y); g.lineTo(x + 5, y - 7); g.stroke();
  }
  const FL = ['#f8fafc', '#fde047', '#f9a8d4', '#c4b5fd'];
  for (let i = 0; i < 24; i++) {
    const cx = R() * OUT.w, cy = R() * OUT.h, col = FL[Math.floor(R() * FL.length)];
    if (onPath(cx, cy, 34)) continue;
    for (let j = 0; j < 7; j++) { const x = cx + (R() - 0.5) * 34, y = cy + (R() - 0.5) * 26; g.fillStyle = col; ell(g, x, y, 1.8, 2.6); g.fillStyle = '#facc15'; ell(g, x, y, 0.7, 1); }
  }
}
function onPath(x, y, pad) {
  for (const p of OUT.paths) for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], vx = bx - ax, vy = by - ay;
    const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    if (Math.hypot(x - ax - vx * k, y - ay - vy * k) < pad) return true;
  }
  return Math.hypot((x - OUT.pond.x) / 1.6, y - OUT.pond.y) < OUT.pond.ry + 14;
}

// ---------- ציור עצמים בחוץ (בקואורדינטות מסך: y כבר מוכפל ב־K) ----------
const ROOFS = {
  tile:  { base: '#3f4757', dark: '#2a303c', light: '#59627a' },
  tile2: { base: '#4a3f57', dark: '#30283b', light: '#665a78' },
  thatch:{ base: '#8f7a4c', dark: '#6b5a35', light: '#ad9663', thatch: true }
};
function drawHouse(g, h, now) {
  const X = h.x, W = h.w, F = h.front, wallTop = F - WALL, eave = h.eave, ridge = h.ridge, back = h.y * K - WALL;
  const RC = ROOFS[h.roof], inset = W * 0.24, OV = 18;
  // צל על הקרקע
  g.fillStyle = 'rgba(20,40,10,.24)';
  g.beginPath(); g.moveTo(X + W, h.y * K); g.lineTo(X + W + 30, h.y * K + 4); g.lineTo(X + W + 30, F + 8); g.lineTo(X + 10, F + 8); g.lineTo(X, F); g.closePath(); g.fill();
  // יסוד אבן ומרפסת עץ (אנגאווה)
  g.fillStyle = '#8d8a80'; g.fillRect(X - 2, F - 8, W + 4, 8);
  g.fillStyle = '#76726a'; g.fillRect(X - 2, F - 2, W + 4, 2);
  g.fillStyle = '#9b7550'; g.fillRect(X - 8, F - 15, W + 16, 7);
  g.fillStyle = '#b48b62'; g.fillRect(X - 8, F - 15, W + 16, 2);
  // קיר: עמודי עץ כהים, לוחות נייר (שוג'י) עם סבכה, לוח עץ תחתון
  const wy = wallTop, wh = WALL - 15;
  g.fillStyle = '#4a3527'; g.fillRect(X, wy, W, wh);
  const cols = 4, cw = W / cols;
  for (let i = 0; i < cols; i++) {
    const px = X + i * cw + 4, pw = cw - 8;
    const isDoor = i === 1 || i === 2;
    if (isDoor) continue;
    g.fillStyle = '#f2ead6'; g.fillRect(px, wy + 6, pw, wh - 18);
    g.fillStyle = 'rgba(255,214,140,.25)'; g.fillRect(px, wy + 6 + (wh - 18) * 0.55, pw, (wh - 18) * 0.45);
    g.fillStyle = '#c4b393';
    for (let k = 1; k < 3; k++) g.fillRect(px + pw * k / 3 - 0.6, wy + 6, 1.2, wh - 18);
    for (let k = 1; k < 4; k++) g.fillRect(px, wy + 6 + (wh - 18) * k / 4 - 0.6, pw, 1.2);
    g.fillStyle = '#5c4433'; g.fillRect(px, wy + wh - 12, pw, 10);
  }
  // הכניסה באמצע
  const dX = X + cw + 4, dW = 2 * cw - 8;
  if (h.enter) {
    g.fillStyle = '#2a1d14'; g.fillRect(dX, wy + 4, dW, wh - 2);
    g.fillStyle = 'rgba(255,190,110,.35)'; g.fillRect(dX + 4, wy + wh * 0.55, dW - 8, wh * 0.45 - 2);
    // וילון נורן כחול עם סמל לבן
    const sway = Math.sin(now / 900) * 1.2;
    g.fillStyle = '#25345e';
    for (let k = 0; k < 3; k++) { const sx = dX + 6 + k * (dW - 12) / 3; rr(g, sx + 1, wy + 4, (dW - 12) / 3 - 2, wh * 0.5 + (k === 1 ? sway : -sway * 0.5), 2); g.fill(); }
    g.strokeStyle = '#e8e6e0'; g.lineWidth = 2; g.beginPath(); g.arc(X + W / 2, wy + 4 + wh * 0.25, 7, 0, Math.PI * 2); g.stroke();
  } else {
    g.fillStyle = '#e8dfc8'; g.fillRect(dX, wy + 6, dW, wh - 8);
    g.fillStyle = '#b8a888';
    for (let k = 1; k < 4; k++) g.fillRect(dX + dW * k / 4 - 0.6, wy + 6, 1.2, wh - 8);
    for (let k = 1; k < 4; k++) g.fillRect(dX, wy + 6 + (wh - 8) * k / 4 - 0.6, dW, 1.2);
    g.fillStyle = '#4a3527'; g.fillRect(X + W / 2 - 1.5, wy + 6, 3, wh - 8);
  }
  g.fillStyle = '#3a2a1e';
  for (let i = 0; i <= cols; i++) g.fillRect(X + i * cw - (i === cols ? 6 : i === 0 ? 0 : 3), wy, 6, wh);
  g.fillRect(X, wy, W, 6);
  // מדרגת אבן מול הכניסה
  g.fillStyle = '#9d998e'; rr(g, h.doorX - 22, F - 6, 44, 9, 3); g.fill();
  g.fillStyle = '#b5b1a6'; rr(g, h.doorX - 20, F - 6, 40, 3, 2); g.fill();

  // ---- גג ----
  // מדרון אחורי (כמעט מוסתר)
  g.fillStyle = RC.dark;
  g.beginPath(); g.moveTo(X - OV + 4, back); g.lineTo(X + W + OV - 4, back); g.lineTo(X + W - inset, ridge); g.lineTo(X + inset, ridge); g.closePath(); g.fill();
  // מדרונות הצד (משולשים)
  g.fillStyle = shade(RC.base, -0.22);
  g.beginPath(); g.moveTo(X + inset, ridge); g.lineTo(X - OV + 4, back); g.lineTo(X - OV, eave); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(X + W - inset, ridge); g.lineTo(X + W + OV - 4, back); g.lineTo(X + W + OV, eave); g.closePath(); g.fill();
  // מדרון קדמי עם קצוות מעוקלים כלפי מעלה
  const frontPath = () => {
    g.beginPath(); g.moveTo(X + inset, ridge); g.lineTo(X + W - inset, ridge);
    g.quadraticCurveTo(X + W + OV - 6, eave - 18, X + W + OV + 12, eave - 14);
    g.lineTo(X + W + OV + 2, eave + 2);
    g.quadraticCurveTo(X + W / 2, eave + 9, X - OV - 2, eave + 2);
    g.lineTo(X - OV - 12, eave - 14);
    g.quadraticCurveTo(X - OV + 6, eave - 18, X + inset, ridge); g.closePath();
  };
  frontPath(); g.fillStyle = RC.base; g.fill();
  g.save(); frontPath(); g.clip();
  if (RC.thatch) {
    g.fillStyle = RC.dark;
    for (let y = ridge + 6; y < eave + 10; y += 7) g.fillRect(X - OV - 14, y, W + 2 * OV + 28, 1.6);
    g.fillStyle = RC.light; for (let y = ridge + 9; y < eave + 10; y += 7) for (let x = X - OV; x < X + W + OV; x += 9) g.fillRect(x + hash(x + y) * 6, y, 1, 3);
  } else {
    // שורות רעפים לאורך המדרון
    for (let x = X - OV - 12; x < X + W + OV + 12; x += 8) {
      g.fillStyle = RC.dark; g.fillRect(x, ridge, 2.4, eave - ridge + 10);
      g.fillStyle = RC.light; g.fillRect(x + 3, ridge, 1.6, eave - ridge + 10);
    }
  }
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X - OV - 14, ridge, W + 2 * OV + 28, (eave - ridge) * 0.35);
  g.restore();
  // שפת המרזב
  g.strokeStyle = RC.dark; g.lineWidth = 4; g.beginPath();
  g.moveTo(X - OV - 12, eave - 14); g.lineTo(X - OV - 2, eave + 2); g.quadraticCurveTo(X + W / 2, eave + 9, X + W + OV + 2, eave + 2); g.lineTo(X + W + OV + 12, eave - 14); g.stroke();
  // רכס עם קישוטי קצה
  g.fillStyle = shade(RC.dark, -0.25); rr(g, X + inset - 8, ridge - 7, W - 2 * inset + 16, 9, 3); g.fill();
  g.beginPath(); g.moveTo(X + inset - 8, ridge + 1); g.quadraticCurveTo(X + inset - 14, ridge - 6, X + inset - 12, ridge - 14); g.lineTo(X + inset - 4, ridge - 6); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(X + W - inset + 8, ridge + 1); g.quadraticCurveTo(X + W - inset + 14, ridge - 6, X + W - inset + 12, ridge - 14); g.lineTo(X + W - inset + 4, ridge - 6); g.closePath(); g.fill();
  if (h.roof === 'tile2') { g.fillStyle = '#7a756c'; g.fillRect(X + W - inset - 30, ridge - 22, 14, 20); g.fillStyle = '#5f5a52'; g.fillRect(X + W - inset - 32, ridge - 24, 18, 5); }
  // פנסים אדומים תלויים בפינות
  [X + 4, X + W - 4].forEach((lx, i) => {
    const ly = eave + 16 + Math.sin(now / 700 + i + h.x) * 0.8;
    g.strokeStyle = '#2a1d14'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, eave + 4); g.lineTo(lx, ly - 7); g.stroke();
    g.fillStyle = 'rgba(248,113,113,.22)'; circ(g, lx, ly, 13);
    g.fillStyle = '#dc2626'; ell(g, lx, ly, 6, 8);
    g.fillStyle = '#f87171'; ell(g, lx - 1.5, ly - 1, 2.2, 5);
    g.fillStyle = '#1f2937'; g.fillRect(lx - 4, ly - 9, 8, 2); g.fillRect(lx - 4, ly + 7, 8, 2);
  });
}
function drawCherry(g, x, y, s) {
  g.fillStyle = 'rgba(20,40,10,.26)'; ell(g, x + 12, y + 2, 34 * s, 11 * s);
  g.strokeStyle = '#4a2f24'; g.lineCap = 'round';
  g.lineWidth = 8 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 6 * s, y - 24 * s, x + 2 * s, y - 42 * s); g.stroke();
  g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x + 1, y - 34 * s); g.quadraticCurveTo(x + 18 * s, y - 44 * s, x + 26 * s, y - 56 * s); g.stroke();
  g.beginPath(); g.moveTo(x, y - 38 * s); g.quadraticCurveTo(x - 16 * s, y - 46 * s, x - 24 * s, y - 58 * s); g.stroke();
  const cy = y - 66 * s, P = [[0, 0, 26], [-22, 6, 18], [22, 6, 19], [-12, -14, 17], [12, -16, 18], [0, 12, 16]];
  g.fillStyle = '#d97aa6'; P.forEach(([dx, dy, r]) => circ(g, x + dx * s, cy + dy * s + 4, r * s));
  g.fillStyle = '#f2a7c8'; P.forEach(([dx, dy, r]) => circ(g, x + dx * s - 1, cy + dy * s, r * s * 0.85));
  g.fillStyle = '#fbd3e4'; [[-8, -12, 9], [10, -18, 7], [-20, 0, 6], [18, 2, 6]].forEach(([dx, dy, r]) => circ(g, x + dx * s, cy + dy * s, r * s));
}
function drawPine(g, x, y, s) {
  g.fillStyle = 'rgba(20,40,10,.26)'; ell(g, x + 10, y + 2, 30 * s, 10 * s);
  g.strokeStyle = '#5a3a28'; g.lineCap = 'round';
  g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10 * s, y - 30 * s, x - 4 * s, y - 64 * s); g.stroke();
  g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(x + 4 * s, y - 30 * s); g.lineTo(x - 22 * s, y - 40 * s); g.moveTo(x + 2 * s, y - 50 * s); g.lineTo(x + 22 * s, y - 56 * s); g.stroke();
  const pad = (px, py, w) => {
    g.fillStyle = '#1f4f33'; ell(g, px, py + 3 * s, w * s, 9 * s);
    g.fillStyle = '#2f6b45'; ell(g, px - 2 * s, py, w * s * 0.92, 7.5 * s);
    g.fillStyle = '#3f8458'; ell(g, px - 5 * s, py - 3 * s, w * s * 0.5, 3.5 * s);
  };
  pad(x - 24 * s, y - 42 * s, 18); pad(x + 24 * s, y - 58 * s, 17); pad(x - 4 * s, y - 72 * s, 22); pad(x + 2 * s, y - 88 * s, 13);
}
function drawStalk(g, st, now) {
  const [x, y, s, ph] = st, H = 120 * s, sway = Math.sin(now / 1400 + ph * 6) * 3 * s;
  g.fillStyle = 'rgba(20,40,10,.2)'; ell(g, x + 4, y + 1, 7, 2.6);
  g.strokeStyle = '#6a9a3c'; g.lineWidth = 4.2 * s; g.lineCap = 'butt';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x, y - H * 0.6, x + sway, y - H); g.stroke();
  g.strokeStyle = '#8fbf55'; g.lineWidth = 1.3 * s; g.beginPath(); g.moveTo(x - 1, y); g.quadraticCurveTo(x - 1, y - H * 0.6, x - 1 + sway, y - H); g.stroke();
  g.fillStyle = '#3f6b25';
  for (let k = 1; k < 6; k++) { const t = k / 6, sx = x + sway * t * t; g.fillRect(sx - 2.4 * s, y - H * t, 4.8 * s, 1.6); }
  g.fillStyle = '#4f8a2e';
  for (let k = 0; k < 5; k++) {
    const t = 0.55 + k * 0.1, lx = x + sway * t * t, ly = y - H * t, dir = k % 2 ? 1 : -1;
    g.save(); g.translate(lx, ly); g.rotate(dir * (0.5 + hash(ph * 10 + k) * 0.4)); ell(g, dir * 9 * s, 0, 10 * s, 2.4 * s); g.restore();
  }
}
function drawBush(g, b) {
  const [x, y0, r, flower] = b, y = y0 * K;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 6, y + 2, r, r * 0.35);
  g.fillStyle = '#2c6228'; circ(g, x, y - r * 0.55, r * 0.8); circ(g, x - r * 0.55, y - r * 0.3, r * 0.55); circ(g, x + r * 0.55, y - r * 0.3, r * 0.55);
  g.fillStyle = '#3d7d33'; circ(g, x - r * 0.15, y - r * 0.75, r * 0.5);
  if (flower) { const R = rng(Math.round(x * 7 + y0)); g.fillStyle = '#f472b6'; for (let i = 0; i < 8; i++) circ(g, x + (R() - 0.5) * r * 1.4, y - r * (0.3 + R() * 0.8), 2.2); }
}
function drawRock(g, r) {
  const [x, y0, s] = r, y = y0 * K;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 3, y + 1, s * 1.2, s * 0.4);
  g.fillStyle = '#7e7b72'; ell(g, x, y - s * 0.5, s * 1.15, s * 0.85);
  g.fillStyle = '#a3a095'; ell(g, x - s * 0.3, y - s * 0.8, s * 0.55, s * 0.35);
}
function drawLantern(g, l, now) {
  const x = l[0], y = l[1] * K;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 5, y + 1, 12, 4);
  g.fillStyle = '#8e8b82'; rr(g, x - 9, y - 6, 18, 6, 2); g.fill();
  g.fillStyle = '#9d9a90'; g.fillRect(x - 3.5, y - 26, 7, 21);
  g.fillStyle = '#8e8b82'; rr(g, x - 9, y - 30, 18, 5, 2); g.fill();
  g.fillStyle = '#9d9a90'; g.fillRect(x - 7, y - 42, 14, 12);
  const fl = 0.75 + Math.sin(now / 180 + x) * 0.08;
  g.fillStyle = 'rgba(253,200,90,' + (0.22 * fl) + ')'; circ(g, x, y - 36, 14);
  g.fillStyle = 'rgba(255,214,120,' + fl + ')'; g.fillRect(x - 3.5, y - 40, 7, 8);
  g.fillStyle = '#7d7a72'; g.beginPath(); g.moveTo(x - 14, y - 41); g.quadraticCurveTo(x, y - 46, x + 14, y - 41); g.lineTo(x + 16, y - 44); g.quadraticCurveTo(x, y - 56, x - 16, y - 44); g.closePath(); g.fill();
  g.fillStyle = '#8e8b82'; circ(g, x, y - 53, 3);
}
function drawTorii(g, t) {
  const x = t.x, y = t.y * K, hw = t.half;
  [x - hw, x + hw].forEach(px => { g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, px + 6, y + 1, 9, 3); });
  g.fillStyle = '#b91c1c'; g.fillRect(x - hw - 4, y - 92, 8, 92); g.fillRect(x + hw - 4, y - 92, 8, 92);
  g.fillStyle = '#1f2937'; g.fillRect(x - hw - 5, y - 8, 10, 8); g.fillRect(x + hw - 5, y - 8, 10, 8);
  g.fillStyle = '#dc2626'; g.fillRect(x - hw - 14, y - 76, 2 * hw + 28, 7);                 // קורה תחתונה
  g.fillStyle = '#991b1b'; g.fillRect(x - 3, y - 92, 6, 16);
  g.fillStyle = '#dc2626';
  g.beginPath(); g.moveTo(x - hw - 26, y - 98); g.quadraticCurveTo(x, y - 92, x + hw + 26, y - 98); g.lineTo(x + hw + 30, y - 106); g.quadraticCurveTo(x, y - 98, x - hw - 30, y - 106); g.closePath(); g.fill();
  g.fillStyle = '#1f2937';
  g.beginPath(); g.moveTo(x - hw - 30, y - 106); g.quadraticCurveTo(x, y - 98, x + hw + 30, y - 106); g.lineTo(x + hw + 32, y - 111); g.quadraticCurveTo(x, y - 103, x - hw - 32, y - 111); g.closePath(); g.fill();
}
function drawWell(g, w) {
  const x = w.x, y = w.y * K, r = w.r;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 10, y + 3, r + 6, r * 0.4);
  // תיבת עץ מרובעת
  g.fillStyle = '#6b4a2b'; g.fillRect(x - r, y - 24, 2 * r, 24);
  g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = -r + 8; i < r; i += 9) g.fillRect(x + i, y - 24, 1.4, 24);
  g.fillStyle = '#8b5e3c'; g.beginPath(); g.moveTo(x - r, y - 24); g.lineTo(x + r, y - 24); g.lineTo(x + r - 4, y - 24 - r * K * 1.4); g.lineTo(x - r + 4, y - 24 - r * K * 1.4); g.closePath(); g.fill();
  g.fillStyle = '#1e3a4a'; g.beginPath(); g.moveTo(x - r + 6, y - 27); g.lineTo(x + r - 6, y - 27); g.lineTo(x + r - 8, y - 22 - r * K * 1.4); g.lineTo(x - r + 8, y - 22 - r * K * 1.4); g.closePath(); g.fill();
  // עמודים וגגון מעוקל
  g.fillStyle = '#4a3527'; g.fillRect(x - r - 2, y - 72, 5, 50); g.fillRect(x + r - 3, y - 72, 5, 50);
  g.fillStyle = '#5a3a1f'; g.fillRect(x - r, y - 58, 2 * r, 3);
  g.fillStyle = '#3f4757';
  g.beginPath(); g.moveTo(x - r - 16, y - 66); g.quadraticCurveTo(x - r, y - 70, x, y - 90); g.quadraticCurveTo(x + r, y - 70, x + r + 16, y - 66); g.lineTo(x + r + 18, y - 72); g.quadraticCurveTo(x + r, y - 76, x, y - 96); g.quadraticCurveTo(x - r, y - 76, x - r - 18, y - 72); g.closePath(); g.fill();
  g.fillStyle = '#59627a'; g.beginPath(); g.moveTo(x - r - 10, y - 69); g.quadraticCurveTo(x - r / 2, y - 76, x, y - 90); g.lineTo(x, y - 86); g.quadraticCurveTo(x - r / 2, y - 72, x - r - 8, y - 67); g.fill();
  g.fillStyle = '#5a3a1f'; g.fillRect(x + 5, y - 55, 1.6, 18); g.fillStyle = '#8b6b45'; rr(g, x + 1, y - 38, 9, 9, 2); g.fill();
}
let koi = [{ a: 0, r: 0.55, sp: 0.5, c: '#f97316' }, { a: 2, r: 0.4, sp: -0.7, c: '#fafafa' }, { a: 4, r: 0.65, sp: 0.35, c: '#ef4444' }];
function drawKoi(g, now) {     // בקואורדינטות קרקע (בתוך שכבת הקרקע המכווצת)
  const p = OUT.pond;
  koi.forEach(f => {
    const a = f.a + now / 1000 * f.sp, x = p.x + Math.cos(a) * p.rx * f.r, y = p.y + Math.sin(a) * p.ry * f.r;
    const h = Math.atan2(Math.cos(a) * p.ry * f.sp, -Math.sin(a) * p.rx * f.sp);
    g.save(); g.translate(x, y); g.rotate(h);
    g.fillStyle = 'rgba(0,0,0,.15)'; ell(g, 2, 3, 9, 3.5);
    g.fillStyle = f.c; ell(g, 0, 0, 9, 3.5);
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -4 + Math.sin(now / 150) * 2); g.lineTo(-14, 4 + Math.sin(now / 150) * 2); g.closePath(); g.fill();
    if (f.c === '#fafafa') { g.fillStyle = '#ef4444'; ell(g, 3, 0, 3, 2); }
    g.restore();
  });
}

// ============================================================
//   בתוך הבית – חדר יפני (טטאמי, קיר שוג'י, טוקונומה)
// ============================================================
const BW = 120;     // גובה הקיר האחורי על המסך
const ROOM = {
  w: 640, h: 430, cell: 12,
  start: { x: 320, y: 362, dir: 'up' },
  table: { x: 210, y: 190, rx: 62, ry: 42 },
  futon: { x: 462, y: 36, w: 140, h: 112 },
  jars: [[568, 318, 15], [598, 346, 12]],
  lamp: [96, 300],
  elder: { x: 330, y: 96, phase: 0 },
  exit: { x: 290, y: 390, w: 60, h: 40 }
};
ROOM.blocked = function (x, y) {
  if (x < 18 + NR || x > this.w - 18 - NR || y < 10 + NR) return true;
  if (y > 386 && !(x > 298 && x < 342)) return true;
  if (y > 426) return true;
  { const t = this.table, dx = (x - t.x) / (t.rx + NR), dy = (y - t.y) / (t.ry + NR); if (dx * dx + dy * dy < 1) return true; }
  { const f = this.futon; if (x > f.x - NR && x < f.x + f.w + NR && y > f.y - NR && y < f.y + f.h + NR) return true; }
  const hitC = (cx, cy, r) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r; };
  for (const j of this.jars) if (hitC(j[0], j[1], j[2] + NR)) return true;
  if (hitC(this.lamp[0], this.lamp[1], 12 + NR)) return true;
  if (hitC(this.elder.x, this.elder.y, 12 + NR)) return true;
  return false;
};
function drawRoomFloor(g) {     // בקואורדינטות קרקע, בתוך שכבה מכווצת
  const W = ROOM.w, H = 400;
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  g.fillStyle = '#c9bd84'; g.fillRect(0, 0, W, H);
  // מחצלות טטאמי: 160x80, עם פס כהה בצדדים הארוכים
  for (let row = 0; row < 5; row++) {
    const off = row % 2 ? -80 : 0;
    for (let x = off; x < W; x += 160) {
      const y = row * 80;
      g.fillStyle = row % 2 ? '#cdc188' : '#c4b77d'; g.fillRect(x + 1, y + 1, 158, 78);
      g.fillStyle = 'rgba(120,110,60,.25)'; for (let k = 6; k < 78; k += 5) g.fillRect(x + 1, y + k, 158, 1);
      g.fillStyle = '#3f4a2a'; g.fillRect(x, y, 160, 4); g.fillRect(x, y + 76, 160, 4);
      g.fillStyle = 'rgba(60,50,30,.35)'; g.fillRect(x, y, 1.5, 80);
    }
  }
  // אור חם מהקיר
  g.fillStyle = 'rgba(255,225,160,.12)'; g.fillRect(0, 0, W, 120);
  // כריות ישיבה (זאבוטון) סביב השולחן
  [[210, 128], [128, 196], [292, 196], [210, 258]].forEach(([x, y]) => {
    g.fillStyle = 'rgba(40,20,10,.2)'; rr(g, x - 20, y - 18, 44, 40, 8); g.fill();
    g.fillStyle = '#7e3a6b'; rr(g, x - 22, y - 20, 44, 40, 8); g.fill();
    g.fillStyle = '#9b4f86'; rr(g, x - 17, y - 15, 34, 30, 6); g.fill();
    g.fillStyle = '#fbbf24'; circ(g, x, y, 2.4);
  });
  // מזרן פוטון
  const f = ROOM.futon;
  g.fillStyle = 'rgba(40,20,10,.2)'; rr(g, f.x + 6, f.y + 6, f.w, f.h, 8); g.fill();
  g.fillStyle = '#f3efe6'; rr(g, f.x, f.y, f.w, f.h, 8); g.fill();
  g.fillStyle = '#ffffff'; rr(g, f.x + 34, f.y + 8, f.w - 68, 22, 8); g.fill();
  g.fillStyle = '#2d4a8a'; rr(g, f.x + 4, f.y + 38, f.w - 8, f.h - 42, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = f.x + 16; x < f.x + f.w - 8; x += 22) circ(g, x, f.y + 70, 4);
  // שטיחון כניסה ואור מהפתח
  g.fillStyle = 'rgba(255,240,200,.25)'; g.fillRect(290, 370, 60, 30);
  g.restore();
}
function drawRoomBack(g, now) {     // בקואורדינטות מסך
  const W = ROOM.w, top = -BW;
  g.fillStyle = '#4a3527'; g.fillRect(0, top, W, BW);
  // טוקונומה (גומחה) משמאל: מגילה וכד פרחים
  g.fillStyle = '#3a2a1e'; g.fillRect(28, top + 14, 150, BW - 14);
  g.fillStyle = '#d8cdb2'; g.fillRect(36, top + 20, 134, BW - 26);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(36, top + 20, 134, 10);
  g.fillStyle = '#6b4a2b'; g.fillRect(30, -12, 146, 12);
  g.fillStyle = '#f5f0e2'; g.fillRect(84, top + 26, 34, 72);
  g.fillStyle = '#5a3a1f'; g.fillRect(80, top + 24, 42, 4); g.fillRect(80, top + 96, 42, 4);
  g.strokeStyle = '#334155'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(88, top + 80); g.lineTo(96, top + 58); g.lineTo(102, top + 70); g.lineTo(108, top + 50); g.lineTo(114, top + 80); g.stroke();
  g.fillStyle = '#dc2626'; circ(g, 106, top + 40, 4);
  g.fillStyle = '#1e3a5f'; rr(g, 140, top + 82, 16, 22, 6); g.fill();
  g.strokeStyle = '#4d7c0f'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(148, top + 82); g.quadraticCurveTo(144, top + 62, 136, top + 56); g.moveTo(148, top + 82); g.quadraticCurveTo(154, top + 60, 162, top + 54); g.stroke();
  g.fillStyle = '#f9a8d4'; circ(g, 136, top + 56, 3.2); circ(g, 162, top + 54, 3.2); circ(g, 150, top + 64, 2.6);
  // קיר שוג'י מואר
  const sx = 196, sw = W - 214, n = 4, pw = sw / n;
  for (let i = 0; i < n; i++) {
    const px = sx + i * pw + 3;
    g.fillStyle = '#f4ecd6'; g.fillRect(px, top + 22, pw - 6, BW - 34);
    g.fillStyle = 'rgba(255,214,140,.3)'; g.fillRect(px, top + 22 + (BW - 34) * 0.5, pw - 6, (BW - 34) * 0.5);
    // צל של במבוק מבחוץ
    g.fillStyle = 'rgba(80,110,60,.18)';
    for (let k = 0; k < 2; k++) { const bx = px + 16 + k * 40 + Math.sin(now / 1500 + i + k) * 2; g.fillRect(bx, top + 22, 3, BW - 34); }
    g.fillStyle = '#b8a888';
    for (let k = 1; k < 3; k++) g.fillRect(px + (pw - 6) * k / 3 - 0.6, top + 22, 1.2, BW - 34);
    for (let k = 1; k < 5; k++) g.fillRect(px, top + 22 + (BW - 34) * k / 5 - 0.6, pw - 6, 1.2);
  }
  g.fillStyle = '#3a2a1e'; g.fillRect(0, top, W, 12); g.fillRect(sx - 4, top + 12, 6, BW - 12);
  for (let i = 1; i < n; i++) g.fillRect(sx + i * pw - 3, top + 12, 6, BW - 12);
  g.fillStyle = '#2a1d14'; g.fillRect(0, -6, W, 6);
}
function drawRoomSides(g) {
  const H = 400 * K;
  g.fillStyle = '#3a2a1e'; g.fillRect(0, -BW, 18, BW + H + 18); g.fillRect(ROOM.w - 18, -BW, 18, BW + H + 18);
}
function drawRoomFront(g) {     // קיר קדמי נמוך עם פתח הדלת (מעל הכול)
  const y = 400 * K;
  g.fillStyle = '#4a3527'; g.fillRect(0, y - 4, 292, 22); g.fillRect(348, y - 4, ROOM.w - 348, 22);
  g.fillStyle = '#3a2a1e'; g.fillRect(0, y - 4, 292, 4); g.fillRect(348, y - 4, ROOM.w - 348, 4);
  g.fillStyle = '#3a2a1e'; g.fillRect(286, y - 30, 8, 48); g.fillRect(346, y - 30, 8, 48);
}
function drawTable(g) {
  const t = ROOM.table, x = t.x, y = t.y * K, rx = t.rx, ry = t.ry * K, lift = 16;
  g.fillStyle = 'rgba(40,20,5,.25)'; ell(g, x + 6, y + 4, rx, ry);
  g.fillStyle = '#3a2a1e'; g.fillRect(x - rx * 0.6, y - lift + 2, 6, lift); g.fillRect(x + rx * 0.6 - 6, y - lift + 2, 6, lift);
  g.fillStyle = '#5a3a24'; ell(g, x, y - lift + 4, rx, ry);
  g.fillStyle = '#7a5234'; ell(g, x, y - lift, rx, ry);
  g.fillStyle = 'rgba(255,255,255,.08)'; ell(g, x - rx * 0.2, y - lift - ry * 0.3, rx * 0.6, ry * 0.4);
  // קומקום וכוסות
  g.fillStyle = '#2f3b2e'; ell(g, x - 10, y - lift - 8, 11, 9); g.fillRect(x - 14, y - lift - 19, 8, 4);
  g.strokeStyle = '#1f2937'; g.lineWidth = 1.6; g.beginPath(); g.arc(x - 10, y - lift - 14, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = '#e7e5e4'; [[16, -4], [28, 2]].forEach(([dx, dy]) => { g.fillRect(x + dx - 4, y - lift + dy - 8, 8, 7); g.fillStyle = '#9ca3af'; ell(g, x + dx, y - lift + dy - 8, 4, 1.6); g.fillStyle = '#e7e5e4'; });
}
function drawJar(g, j) {
  const [x, y0, s] = j, y = y0 * K;
  g.fillStyle = 'rgba(40,20,5,.28)'; ell(g, x + 4, y + 1, s, s * 0.4);
  g.fillStyle = '#7c4a2a'; ell(g, x, y - s * 0.95, s, s * 1.05);
  g.fillStyle = '#9a5f36'; ell(g, x - s * 0.3, y - s * 1.15, s * 0.35, s * 0.55);
  g.fillStyle = '#3b6e8f'; g.fillRect(x - s, y - s * 1.1, s * 2, 2.4);
  g.fillStyle = '#6a3c20'; ell(g, x, y - s * 1.9, s * 0.5, s * 0.22);
  g.fillStyle = '#2a170c'; ell(g, x, y - s * 1.9, s * 0.32, s * 0.12);
}
function drawLamp(g, now) {
  const [x, y0] = ROOM.lamp, y = y0 * K, fl = 0.85 + Math.sin(now / 200) * 0.05;
  g.fillStyle = 'rgba(255,214,140,' + (0.2 * fl) + ')'; circ(g, x, y - 30, 34);
  g.fillStyle = 'rgba(40,20,5,.25)'; ell(g, x + 4, y + 1, 12, 4);
  g.fillStyle = '#3a2a1e'; g.fillRect(x - 10, y - 6, 20, 6); g.fillRect(x - 10, y - 50, 3, 46); g.fillRect(x + 7, y - 50, 3, 46);
  g.fillStyle = 'rgba(255,236,190,' + fl + ')'; g.fillRect(x - 8, y - 46, 16, 32);
  g.fillStyle = '#3a2a1e'; g.fillRect(x - 10, y - 52, 20, 4); g.fillRect(x - 10, y - 30, 20, 2);
}

// ============================================================
//   מצב, מצלמה, ניווט
// ============================================================
const view = { z: 1.5, cx: 0, cy: 0 };
let scene = OUT;
const ninja = { x: OUT.start.x, y: OUT.start.y, dir: 'down', phase: 0, walking: false, path: [], goal: null };
let doorArmed = true, bubble = null, marker = null, fade = null, moved = false;
const keys = {};

function zoomFor(s) { return s === ROOM ? Math.min(SW / 680, SH / (400 * K + BW + 70), 2.2) : Math.max(1.15, Math.min(SW / 820, SH / 560, 2)); }

function buildGrid(s) {
  const C = s.cell, cols = Math.ceil(s.w / C), rows = Math.ceil(s.h / C), g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[r * cols + c] = s.blocked((c + 0.5) * C, (r + 0.5) * C) ? 1 : 0;
  s.grid = { cols, rows, g };
}
function lineFree(s, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 5);
  for (let i = 1; i <= n; i++) { const k = i / n; if (s.blocked(ax + (bx - ax) * k, ay + (by - ay) * k)) return false; }
  return true;
}
function findPath(s, sx, sy, tx, ty) {
  if (lineFree(s, sx, sy, tx, ty)) return [[tx, ty]];
  const { cols, rows, g } = s.grid, C = s.cell;
  const idx = (x, y) => Math.max(0, Math.min(rows - 1, Math.floor(y / C))) * cols + Math.max(0, Math.min(cols - 1, Math.floor(x / C)));
  const start = idx(sx, sy), goal = idx(tx, ty);
  if (g[goal]) return null;
  const N = cols * rows, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [start]; gs[start] = 0;
  const h = i => { const dx = Math.abs(i % cols - goal % cols), dy = Math.abs(Math.floor(i / cols) - Math.floor(goal / cols)); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (gs[open[i]] + h(open[i]) < gs[open[bi]] + h(open[bi])) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % cols, cy = Math.floor(cur / cols);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx; if (g[ni] || closed[ni]) continue;
      if (dx && dy && (g[cy * cols + nx] || g[ny * cols + cx])) continue;
      const ng = gs[cur] + (dx && dy ? 1.414 : 1);
      if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push(ni); }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const pts = [[tx, ty]];
  for (let i = from[goal]; i !== -1 && i !== start; i = from[i]) pts.unshift([(i % cols + 0.5) * C, (Math.floor(i / cols) + 0.5) * C]);
  const out = []; let px = sx, py = sy, k = 0;
  while (k < pts.length) {
    let far = k;
    for (let j = pts.length - 1; j > k; j--) if (lineFree(s, px, py, pts[j][0], pts[j][1])) { far = j; break; }
    out.push(pts[far]); px = pts[far][0]; py = pts[far][1]; k = far + 1;
  }
  return out;
}
function nearestFree(s, x, y) {
  const { cols, rows, g } = s.grid, C = s.cell;
  const c0 = Math.max(0, Math.min(cols - 1, Math.floor(x / C))), r0 = Math.max(0, Math.min(rows - 1, Math.floor(y / C)));
  for (let rad = 0; rad < 30; rad++) {
    let best = null, bd = Infinity;
    for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || g[r * cols + c]) continue;
      if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== rad) continue;
      const px = (c + 0.5) * C, py = (r + 0.5) * C, d = Math.hypot(px - x, (py - y) * K);
      if (d < bd) { bd = d; best = [px, py]; }
    }
    if (best) return best;
  }
  return null;
}
function goTo(wx, wy, goal) {
  let tx = wx, ty = wy;
  if (scene.blocked(tx, ty)) { const f = nearestFree(scene, tx, ty); if (!f) return; [tx, ty] = f; }
  const p = findPath(scene, ninja.x, ninja.y, tx, ty);
  if (!p) return;
  ninja.path = p; ninja.goal = goal || null;
  marker = { x: tx, y: ty, t: 0 };
  noteMoved();
}
function onTap(sx, sy) {
  if (fade) return;
  const mx = sx / view.z + view.cx, my = sy / view.z + view.cy;     // על המסך (לפני הכיווץ)
  if (scene === OUT) {
    for (const h of OUT.houses) if (inRect(mx, my, h.hit)) { goTo(h.doorX, h.zone.y + 10, { house: h }); return; }
  } else if (inRect(mx, my, { x: 276, y: 380 * K, w: 88, h: 60 })) { goTo(320, 410, { exit: true }); return; }
  goTo(mx, my / K, null);
}
function noteMoved() { if (!moved) { moved = true; hintEl.style.opacity = '0'; } }

// ---------- קלט ----------
let pointerDown = false, lastDrag = 0;
cv.addEventListener('pointerdown', e => { pointerDown = true; onTap(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => {
  if (!pointerDown) return; const now = performance.now();
  if (now - lastDrag > 140) { lastDrag = now; onTap(e.clientX, e.clientY); }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => { pointerDown = false; }));
const KEYMAP = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });

// ---------- מעברים בין מסכים ----------
function switchScene(next, x, y, dir) { fade = { t: 0, next, x, y, dir }; }
function applySwitch(f) {
  scene = f.next;
  ninja.x = f.x; ninja.y = f.y; ninja.dir = f.dir; ninja.path = []; ninja.goal = null; marker = null;
  view.z = zoomFor(scene);
  if (!scene.grid) buildGrid(scene);
  doorArmed = true;
}
function checkDoors() {
  let inAny = false;
  if (scene === OUT) {
    for (const h of OUT.houses) {
      if (!inRect(ninja.x, ninja.y, h.zone)) continue;
      inAny = true;
      const wants = ninja.dir === 'up' || (ninja.goal && ninja.goal.house === h && !ninja.path.length);
      if (doorArmed && wants) {
        doorArmed = false;
        if (h.enter) switchScene(ROOM, ROOM.start.x, ROOM.start.y, 'up');
        else bubble = { text: 'סגור', x: h.doorX, y: h.front - WALL + 10, t: 0 };
      }
    }
  } else if (inRect(ninja.x, ninja.y, ROOM.exit)) {
    inAny = true;
    const wants = ninja.dir === 'down' || (ninja.goal && ninja.goal.exit);
    if (doorArmed && wants) {
      doorArmed = false;
      const h = OUT.houses[0];
      switchScene(OUT, h.doorX, h.zone.y + h.zone.h + 6, 'down');
    }
  }
  if (!inAny) doorArmed = true;
}

// ---------- עדכון ----------
function setDirFrom(dx, dy) {       // dx, dy על המסך
  if (Math.abs(dx) > Math.abs(dy) * 1.15) ninja.dir = dx > 0 ? 'right' : 'left';
  else if (Math.abs(dy) > 0.01) ninja.dir = dy > 0 ? 'down' : 'up';
}
function update(dt) {
  if (fade) {
    fade.t += dt;
    if (!fade.done && fade.t >= 0.22) { fade.done = true; applySwitch(fade); }
    if (fade.t >= 0.48) fade = null;
    return;
  }
  const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  ninja.walking = false;
  if (kx || ky) {
    ninja.path = []; ninja.goal = null; marker = null; noteMoved();
    const n = Math.hypot(kx, ky), step = SPEED * dt;
    const mx = kx / n * step, my = ky / n * step / K;           // מהירות קבועה על המסך
    let didMove = false;
    if (mx && !scene.blocked(ninja.x + mx, ninja.y)) { ninja.x += mx; didMove = true; }
    if (my && !scene.blocked(ninja.x, ninja.y + my)) { ninja.y += my; didMove = true; }
    setDirFrom(kx, ky);
    ninja.walking = didMove;
  } else if (ninja.path.length) {
    let left = SPEED * dt;
    while (left > 0 && ninja.path.length) {
      const [tx, ty] = ninja.path[0], dx = tx - ninja.x, dy = ty - ninja.y, ds = Math.hypot(dx, dy * K);
      if (ds < 0.5) { ninja.x = tx; ninja.y = ty; ninja.path.shift(); continue; }
      setDirFrom(dx, dy * K);
      const f = Math.min(1, left / ds); ninja.x += dx * f; ninja.y += dy * f; left -= ds * f;
      if (f >= 1) ninja.path.shift();
    }
    ninja.walking = true;
    if (!ninja.path.length) {
      marker = null;
      if (ninja.goal && ninja.goal.house) ninja.dir = 'up';
      if (ninja.goal && ninja.goal.exit) ninja.dir = 'down';
    }
  }
  ninja.phase += dt * (ninja.walking ? 11 : 2.5);
  ROOM.elder.phase += dt * 2.5;
  checkDoors();
  if (!ninja.path.length && !(ninja.goal && (ninja.goal.house || ninja.goal.exit))) ninja.goal = null;
  if (marker) marker.t += dt;
  if (bubble) { bubble.t += dt; if (bubble.t > 1.6) bubble = null; }
}

// ---------- ציור ----------
function camera() {
  const vw = SW / view.z, vh = SH / view.z;
  if (scene === ROOM) {
    const top = -BW - 20, bottom = 400 * K + 40;
    view.cx = (ROOM.w - vw) / 2;
    view.cy = (top + bottom - vh) / 2;
    return;
  }
  const lo = -90, hi = OUT.h * K + 10;
  view.cx = Math.max(0, Math.min(OUT.w - vw, ninja.x - vw / 2));
  view.cy = Math.max(lo, Math.min(hi - vh, ninja.y * K - 20 - vh / 2));
}
function render() {
  const now = performance.now();
  camera();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = scene === OUT ? '#2d4a26' : '#1c140c'; ctx.fillRect(0, 0, SW, SH);
  ctx.setTransform(DPR * view.z, 0, 0, DPR * view.z, -view.cx * view.z * DPR, -view.cy * view.z * DPR);
  const items = [];
  // שכבת הקרקע (מכווצת)
  ctx.save(); ctx.scale(1, K);
  if (scene === OUT) { ctx.drawImage(groundCv, 0, 0, OUT.w, OUT.h); drawKoi(ctx, now); }
  else drawRoomFloor(ctx);
  if (marker) {
    const k = (marker.t % 0.9) / 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(marker.x, marker.y, 6 + k * 12, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // עצמים זקופים, ממוינים לפי עומק
  if (scene === OUT) {
    OUT.houses.forEach(h => items.push({ y: h.y + h.h, d: g => drawHouse(g, h, now) }));
    OUT.trees.forEach(t => items.push({ y: t[2], d: g => (t[0] === 'cherry' ? drawCherry : drawPine)(g, t[1], t[2] * K, t[3]) }));
    OUT.groves.forEach(gr => gr.stalks.forEach(s => items.push({ y: s[1], d: g => drawStalk(g, [s[0], s[1] * K, s[2], s[3]], now) })));
    OUT.bushes.forEach(b => items.push({ y: b[1], d: g => drawBush(g, b) }));
    OUT.rocks.forEach(r => items.push({ y: r[1], d: g => drawRock(g, r) }));
    OUT.lanterns.forEach(l => items.push({ y: l[1], d: g => drawLantern(g, l, now) }));
    items.push({ y: OUT.torii.y, d: g => drawTorii(g, OUT.torii) });
    items.push({ y: OUT.well.y + 4, d: g => drawWell(g, OUT.well) });
  } else {
    drawRoomBack(ctx, now);
    items.push({ y: ROOM.table.y + ROOM.table.ry * 0.3, d: drawTable });
    ROOM.jars.forEach(j => items.push({ y: j[1], d: g => drawJar(g, j) }));
    items.push({ y: ROOM.lamp[1], d: g => drawLamp(g, now) });
    const E = ROOM.elder;
    items.push({ y: E.y, d: g => drawChar(g, E.x, E.y * K, ninja.y < E.y - 10 ? 'up' : 'down', E.phase, false, ELDER_LOOK) });
  }
  items.push({ y: ninja.y, d: g => drawChar(g, ninja.x, ninja.y * K, ninja.dir, ninja.phase, ninja.walking, NINJA_LOOK) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.d(ctx));
  if (scene === ROOM) { drawRoomSides(ctx); drawRoomFront(ctx); }
  if (bubble) {
    const a = Math.min(1, (1.6 - bubble.t) * 3);
    ctx.globalAlpha = a; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rr(ctx, bubble.x - 22, bubble.y - 22, 44, 22, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(bubble.text, bubble.x, bubble.y - 6.5); ctx.globalAlpha = 1;
  }
  if (fade) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const a = fade.t < 0.22 ? fade.t / 0.22 : Math.max(0, 1 - (fade.t - 0.22) / 0.26);
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, SW, SH);
  }
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  view.z = zoomFor(scene);
  buildGround();
}
addEventListener('resize', resize);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render();
  requestAnimationFrame(loop);
}
resize();
buildGrid(OUT);
requestAnimationFrame(loop);

// לבדיקות בלבד
window.__village = { ninja, goTo, onTap, get scene() { return scene === OUT ? 'out' : 'room'; }, OUT, ROOM, view };
