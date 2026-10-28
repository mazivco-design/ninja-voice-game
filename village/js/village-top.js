/* ============================================================
   village/js/village-top.js – אב־טיפוס של הכפר במבט מלמעלה.
   רק לבדוק תחושה: הליכה לכל הכיוונים (נגיעה במקום או חצים),
   שבילים, בתים, עצים, באר ובריכה, וכניסה לבית אחד ויציאה ממנו.
   בלי קול, בלי צלילים ובלי תוכן לימודי. לא נוגע בקבצי הארקייד.
   ============================================================ */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');

let SW = 0, SH = 0, DPR = 1;

const ACCENT = '#dc2626';               // צבע ברירת המחדל של השחקן בארקייד
const NR = 9;                           // "רדיוס" הנינג'ה לצורך התנגשויות
const SPEED = 150;                      // פיקסלי עולם בשנייה

// ---------- עזרים ----------
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

// ============================================================
//   הדמויות – נינג'ה שטוח בלי קו מתאר, ב־4 כיוונים, מבט מוטה מלמעלה
// ============================================================
const NINJA_LOOK = { body: '#1e293b', limb: '#111a2b', limbBack: '#0b1220', skin: '#fcd9b6', eyes: '#000', accent: ACCENT, band: true };
const ELDER_LOOK = { body: '#6b4f2e', limb: '#56401f', limbBack: '#3f2e16', skin: '#f1c7a1', eyes: '#2b1d10', accent: '#a16207', band: false, hat: '#d9b968', beard: '#e7e5e4' };

function drawChar(g, x, y, dir, phase, walking, L) {
  const step = walking ? Math.sin(phase) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * 1.4 : Math.sin(phase * 0.5) * 0.4;
  // צל על הקרקע
  g.fillStyle = 'rgba(20,30,10,.28)'; ell(g, x, y, 11, 4.2);

  g.save(); g.translate(x, y - bob);
  if (dir === 'left') g.scale(-1, 1);
  const side = dir === 'left' || dir === 'right';

  if (!side) {
    // רגליים: מתחלפות בהרמה קטנה
    g.fillStyle = L.limb;
    const lL = 10 - Math.max(0, step) * 3, lR = 10 - Math.max(0, -step) * 3;
    rr(g, -6.5, -11, 5, lL + 1, 2.3); g.fill();
    rr(g, 1.5, -11, 5, lR + 1, 2.3); g.fill();
    // ידיים
    const aL = step * 1.6, aR = -step * 1.6;
    if (dir === 'up') drawArmsFrontBack(g, L, aL, aR);
    // גוף
    g.fillStyle = L.body; rr(g, -8, -24, 16, 15, 5); g.fill();
    g.fillStyle = L.accent; g.fillRect(-8, -13.5, 16, 2.4);
    if (dir === 'down') drawArmsFrontBack(g, L, aL, aR);
    // ראש
    drawHead(g, L, dir, step, 0);
  } else {
    // צד ימין (שמאל = מראה)
    const sw = step * 0.55;
    drawLegSide(g, L.limbBack, -sw);
    drawArmSide(g, L.limbBack, L.accent, sw * 1.1, true);
    drawLegSide(g, L.limb, sw);
    g.fillStyle = L.body; rr(g, -6.5, -24, 13, 15, 5); g.fill();
    g.fillStyle = L.accent; g.fillRect(-6.5, -13.5, 13, 2.4);
    drawArmSide(g, L.limb, L.accent, -sw * 1.1, false);
    drawHead(g, L, 'right', step, 0);
  }
  g.restore();
}
function drawArmsFrontBack(g, L, aL, aR) {
  g.fillStyle = L.limb;
  rr(g, -11.5, -23 + aL, 4.2, 11, 2.1); g.fill();
  rr(g, 7.3, -23 + aR, 4.2, 11, 2.1); g.fill();
  g.fillStyle = L.accent; circ(g, -9.4, -11.5 + aL, 2.4); circ(g, 9.4, -11.5 + aR, 2.4);
}
function drawLegSide(g, col, a) {
  g.save(); g.translate(0, -11); g.rotate(a);
  g.fillStyle = col; rr(g, -2.6, 0, 5.2, 11, 2.4); g.fill();
  g.restore();
}
function drawArmSide(g, col, acc, a, back) {
  g.save(); g.translate(back ? 1.5 : -0.5, -22); g.rotate(a);
  g.fillStyle = col; rr(g, -2.1, 0, 4.2, 11, 2.1); g.fill();
  g.fillStyle = acc; circ(g, 0, 11.2, 2.3);
  g.restore();
}
function drawHead(g, L, dir, step, _) {
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
  // קשר הסרט מאחור
  if (L.band) {
    g.fillStyle = L.accent;
    const t = step * 1.5;
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
    g.fillStyle = L.hat; ell(g, 0, hy - 1.5, 13.5, 6.5);
    g.fillStyle = '#c9a54f'; ell(g, 0, hy - 4, 5.5, 3.6);
    g.fillStyle = '#e8cd85'; ell(g, -1.5, hy - 5, 2.4, 1.3);
  }
}

// ============================================================
//   הכפר בחוץ
// ============================================================
const OUT = {
  w: 1400, h: 1000, cell: 16,
  start: { x: 700, y: 640, dir: 'down' },
  paths: [
    [[-20, 610], [300, 596], [700, 566], [1100, 586], [1420, 566]],
    [[520, 580], [520, 452]],
    [[810, 572], [910, 480], [910, 372]],
    [[1000, 584], [1000, 820], [1150, 822], [1150, 762]],
    [[700, 566], [700, 880], [470, 905]]
  ],
  houses: [
    { x: 440, y: 300, w: 160, h: 150, wall: '#e9dcc1', roof: '#b4532a', enter: true },
    { x: 830, y: 230, w: 160, h: 140, wall: '#e3d6c8', roof: '#4b6c8f', enter: false },
    { x: 1070, y: 612, w: 160, h: 148, wall: '#ecdcb8', roof: '#6d7a3a', enter: false, chimney: true }
  ],
  trees: [[200, 380, 30], [262, 290, 34], [140, 480, 28], [340, 420, 26], [640, 250, 30], [1110, 330, 32], [1190, 440, 28],
          [1310, 320, 34], [1290, 470, 26], [880, 720, 30], [870, 830, 26], [560, 720, 28], [490, 780, 24], [1300, 800, 32],
          [1220, 920, 30], [150, 900, 34], [80, 700, 30], [600, 960, 26], [1010, 930, 28], [1350, 660, 26], [380, 190, 30], [760, 160, 28]],
  well: { x: 780, y: 690, r: 26 },
  pond: { x: 330, y: 800, rx: 120, ry: 66 },
  rocks: [[600, 640, 9], [430, 660, 7], [1060, 470, 10], [960, 680, 8]],
  bushes: []
};
(function makeBorder() {
  const R = rng(7);
  for (let x = 30; x < OUT.w; x += 58) { OUT.bushes.push([x + R() * 20, 26 + R() * 10, 22 + R() * 8]); OUT.bushes.push([x + R() * 20, OUT.h - 16 - R() * 8, 22 + R() * 8]); }
  for (let y = 90; y < OUT.h - 60; y += 58) {
    if (Math.abs(y - 605) > 60) OUT.bushes.push([18 + R() * 8, y + R() * 20, 22 + R() * 8]);
    if (Math.abs(y - 566) > 60) OUT.bushes.push([OUT.w - 18 - R() * 8, y + R() * 20, 22 + R() * 8]);
  }
})();
const WALL = 56;
OUT.houses.forEach(h => {
  h.doorX = h.x + h.w / 2;
  h.zone = { x: h.doorX - 17, y: h.y + h.h, w: 34, h: 22 };
  h.hit = { x: h.x - 14, y: h.y - 44, w: h.w + 28, h: h.h + 44 };
});

OUT.blocked = function (x, y) {
  if (x < 34 || y < 52 || x > this.w - 34 || y > this.h - 30) return true;
  for (const h of this.houses) if (x > h.x - NR && x < h.x + h.w + NR && y > h.y - NR && y < h.y + h.h + 3) return true;
  for (const t of this.trees) { const dx = x - t[0], dy = y - t[1]; if (dx * dx + dy * dy < (10 + NR) ** 2) return true; }
  for (const r of this.rocks) { const dx = x - r[0], dy = y - r[1]; if (dx * dx + dy * dy < (r[2] + NR - 2) ** 2) return true; }
  { const w = this.well, dx = x - w.x, dy = y - w.y; if (dx * dx + dy * dy < (w.r + NR) ** 2) return true; }
  { const p = this.pond, dx = (x - p.x) / (p.rx + NR - 6), dy = (y - p.y) / (p.ry + NR - 6); if (dx * dx + dy * dy < 1) return true; }
  return false;
};

// ---------- ציור הקרקע (פעם אחת, לקנבס נפרד) ----------
let groundCv = null, groundScale = 1;
function buildGround() {
  groundScale = Math.min(2, Math.max(1, view.z * DPR));
  groundCv = document.createElement('canvas');
  groundCv.width = Math.ceil(OUT.w * groundScale); groundCv.height = Math.ceil(OUT.h * groundScale);
  const g = groundCv.getContext('2d');
  g.scale(groundScale, groundScale);
  const R = rng(42);
  // דשא בשכבות
  g.fillStyle = '#5f9443'; g.fillRect(0, 0, OUT.w, OUT.h);
  for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,90,30,.07)' : 'rgba(150,200,90,.06)'; ell(g, R() * OUT.w, R() * OUT.h, 60 + R() * 140, 30 + R() * 70); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(35,80,25,.12)'; ell(g, R() * OUT.w, R() * OUT.h, 6 + R() * 18, 3 + R() * 8); }
  // שבילים: שוליים כהים, משטח בהיר, חלוקי נחל
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (w, col) => { g.strokeStyle = col; g.lineWidth = w; OUT.paths.forEach(p => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); }); };
  stroke(50, 'rgba(60,70,30,.35)');
  stroke(44, '#a98557');
  stroke(36, '#cfae7c');
  stroke(20, 'rgba(225,200,150,.45)');
  OUT.paths.forEach(p => {
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i], len = Math.hypot(bx - ax, by - ay);
      for (let d = 0; d < len; d += 9) {
        if (R() < 0.55) continue;
        const k = d / len, ox = (R() - 0.5) * 30, oy = (R() - 0.5) * 30;
        g.fillStyle = R() < 0.5 ? 'rgba(120,95,60,.45)' : 'rgba(240,225,190,.55)'; ell(g, ax + (bx - ax) * k + ox, ay + (by - ay) * k + oy, 1.5 + R() * 2, 1 + R() * 1.4);
      }
    }
  });
  // כיכר סביב הבאר
  g.fillStyle = '#a98557'; ell(g, OUT.well.x, OUT.well.y + 4, 62, 42);
  g.fillStyle = '#cfae7c'; ell(g, OUT.well.x, OUT.well.y + 4, 55, 36);
  for (let i = 0; i < 24; i++) { const a = R() * 6.28, d = 30 + R() * 22; g.fillStyle = 'rgba(150,130,100,.5)'; ell(g, OUT.well.x + Math.cos(a) * d, OUT.well.y + 4 + Math.sin(a) * d * 0.66, 5 + R() * 3, 3 + R() * 2); }
  // בריכה: גדה, מים בשתי שכבות, ברק, קנים
  const p = OUT.pond;
  g.fillStyle = '#8a7a4c'; ell(g, p.x, p.y + 3, p.rx + 8, p.ry + 7);
  g.fillStyle = '#2f6f8f'; ell(g, p.x, p.y, p.rx, p.ry);
  g.fillStyle = '#3f8bab'; ell(g, p.x - 8, p.y - 8, p.rx - 18, p.ry - 18);
  g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, p.x - 40, p.y - 26, 26, 5); ell(g, p.x + 30, p.y + 10, 16, 3);
  g.fillStyle = '#3e8e3a'; ell(g, p.x + 70, p.y - 20, 9, 6); ell(g, p.x - 60, p.y + 25, 8, 5);
  g.strokeStyle = '#4d7a2b'; g.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const a = 2.2 + R() * 1.6, bx = p.x + Math.cos(a) * (p.rx + 2), by = p.y + Math.sin(a) * (p.ry + 2); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (R() - 0.5) * 6, by - 12 - R() * 8); g.stroke(); }
  // גבעולי דשא ופרחים
  for (let i = 0; i < 700; i++) {
    const x = R() * OUT.w, y = R() * OUT.h;
    if (onPath(x, y, 26)) continue;
    g.strokeStyle = R() < 0.5 ? 'rgba(40,95,30,.7)' : 'rgba(130,185,80,.7)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 1.5, y); g.lineTo(x + 2.5, y - 6); g.moveTo(x + 3, y); g.lineTo(x + 5, y - 4); g.stroke();
  }
  const FL = ['#f8fafc', '#fde047', '#f472b6', '#c4b5fd'];
  for (let i = 0; i < 26; i++) {
    const cx = R() * OUT.w, cy = R() * OUT.h, col = FL[Math.floor(R() * FL.length)];
    if (onPath(cx, cy, 34)) continue;
    for (let j = 0; j < 7; j++) { const x = cx + (R() - 0.5) * 34, y = cy + (R() - 0.5) * 20; g.fillStyle = 'rgba(40,90,30,.5)'; circ(g, x, y + 1, 2.2); g.fillStyle = col; circ(g, x, y, 1.8); g.fillStyle = '#facc15'; circ(g, x, y, 0.7); }
  }
}
function onPath(x, y, pad) {
  for (const p of OUT.paths) for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], vx = bx - ax, vy = by - ay;
    const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    if (Math.hypot(x - ax - vx * k, y - ay - vy * k) < pad) return true;
  }
  return Math.hypot((x - OUT.pond.x) / 1.6, y - OUT.pond.y) < OUT.pond.ry + 10;
}

// ---------- ציור עצמים בחוץ ----------
function drawHouse(g, h) {
  const top = h.y - 40, eave = h.y + h.h - WALL + 6, wallTop = h.y + h.h - WALL, bottom = h.y + h.h;
  // צל
  g.fillStyle = 'rgba(20,40,10,.25)';
  g.beginPath(); g.moveTo(h.x + h.w, wallTop); g.lineTo(h.x + h.w + 26, wallTop + 20); g.lineTo(h.x + h.w + 26, bottom + 12); g.lineTo(h.x + 14, bottom + 12); g.lineTo(h.x, bottom); g.closePath(); g.fill();
  // קיר קדמי
  g.fillStyle = h.wall; g.fillRect(h.x, wallTop, h.w, WALL);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(h.x, bottom - 8, h.w, 8);
  g.fillStyle = '#6b4a2b'; g.fillRect(h.x, wallTop, 7, WALL); g.fillRect(h.x + h.w - 7, wallTop, 7, WALL);
  // חלונות
  [h.x + 34, h.x + h.w - 34].forEach(wx => {
    g.fillStyle = '#6b4a2b'; g.fillRect(wx - 14, wallTop + 14, 28, 22);
    g.fillStyle = '#ffe9a8'; g.fillRect(wx - 11, wallTop + 17, 22, 16);
    g.fillStyle = 'rgba(255,190,90,.45)'; g.fillRect(wx - 11, wallTop + 25, 22, 8);
    g.fillStyle = '#6b4a2b'; g.fillRect(wx - 1, wallTop + 17, 2, 16); g.fillRect(wx - 11, wallTop + 24, 22, 2);
  });
  // דלת
  const dx = h.doorX;
  g.fillStyle = '#5a3a1f'; rr(g, dx - 17, wallTop + 10, 34, WALL - 10, 12); g.fill();
  g.fillStyle = h.enter ? '#9a6235' : '#7d5634'; rr(g, dx - 14, wallTop + 13, 28, WALL - 13, 10); g.fill();
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(dx - 0.8, wallTop + 16, 1.6, WALL - 16);
  g.fillStyle = '#fbbf24'; circ(g, dx + 8, wallTop + 34, 2);
  g.fillStyle = '#b89b6a'; rr(g, dx - 20, bottom - 1, 40, 7, 3); g.fill();      // מדרגה
  // גג – מדרון אחורי כהה, מדרון קדמי בהיר עם שורות רעפים
  const ridge = top + (eave - top) * 0.36;
  g.fillStyle = shade(h.roof, -0.28); g.fillRect(h.x - 12, top, h.w + 24, ridge - top);
  g.fillStyle = h.roof; g.fillRect(h.x - 12, ridge, h.w + 24, eave - ridge);
  g.fillStyle = shade(h.roof, -0.12);
  for (let y = ridge + 10; y < eave - 3; y += 10) g.fillRect(h.x - 12, y, h.w + 24, 2);
  g.fillStyle = shade(h.roof, 0.18); g.fillRect(h.x - 12, ridge, h.w + 24, 3);
  g.fillStyle = shade(h.roof, -0.4); g.fillRect(h.x - 12, eave - 4, h.w + 24, 5);
  if (h.chimney) { g.fillStyle = '#8b8178'; g.fillRect(h.x + h.w - 44, top - 14, 18, 30); g.fillStyle = '#6f665e'; g.fillRect(h.x + h.w - 46, top - 16, 22, 6); }
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255;
  const f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
}
function drawTree(g, t) {
  const [x, y, r] = t;
  g.fillStyle = 'rgba(20,40,10,.28)'; ell(g, x + 10, y + 2, r * 0.95, r * 0.42);
  g.fillStyle = '#6b4a2b'; rr(g, x - 5, y - 26, 10, 28, 4); g.fill();
  g.fillStyle = '#54391f'; g.fillRect(x + 1, y - 24, 3, 24);
  const cy = y - 30 - r * 0.7;
  g.fillStyle = '#2f6a2a'; circ(g, x, cy + 6, r); circ(g, x - r * 0.6, cy + 10, r * 0.65); circ(g, x + r * 0.62, cy + 10, r * 0.65);
  g.fillStyle = '#3f8434'; circ(g, x - 2, cy, r * 0.82); circ(g, x - r * 0.5, cy + 4, r * 0.5); circ(g, x + r * 0.5, cy + 3, r * 0.52);
  g.fillStyle = '#58a346'; circ(g, x - r * 0.3, cy - r * 0.25, r * 0.38); circ(g, x + r * 0.18, cy - r * 0.38, r * 0.25);
}
function drawBush(g, b) {
  const [x, y, r] = b;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 6, y + 3, r, r * 0.4);
  g.fillStyle = '#2c6228'; circ(g, x, y - r * 0.4, r * 0.8); circ(g, x - r * 0.5, y - r * 0.2, r * 0.55); circ(g, x + r * 0.5, y - r * 0.2, r * 0.55);
  g.fillStyle = '#3d7d33'; circ(g, x - r * 0.15, y - r * 0.6, r * 0.5);
}
function drawRock(g, r) {
  const [x, y, s] = r;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 3, y + 2, s * 1.2, s * 0.5);
  g.fillStyle = '#8d8a80'; ell(g, x, y - s * 0.35, s * 1.15, s * 0.8);
  g.fillStyle = '#aeaba0'; ell(g, x - s * 0.3, y - s * 0.6, s * 0.55, s * 0.35);
}
function drawWell(g, w) {
  const { x, y, r } = w;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 8, y + 6, r + 4, r * 0.55);
  g.fillStyle = '#7d7a70'; ell(g, x, y, r, r * 0.62);                         // אבן חיצונית
  g.fillStyle = '#9a978c'; g.fillRect(x - r, y - 16, 2 * r, 16); ell(g, x, y - 16, r, r * 0.62);
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = -r + 6; i < r; i += 12) g.fillRect(x + i, y - 16, 1.5, 16);
  g.fillStyle = '#1e3a4a'; ell(g, x, y - 16, r - 6, r * 0.62 - 5);               // מים בפנים
  g.fillStyle = 'rgba(160,210,230,.4)'; ell(g, x - 5, y - 19, 7, 2);
  // עמודים וגגון
  g.fillStyle = '#6b4a2b'; g.fillRect(x - r + 2, y - 56, 5, 42); g.fillRect(x + r - 7, y - 56, 5, 42);
  g.fillStyle = '#8b5e3c'; g.fillRect(x - r + 4, y - 44, 2 * r - 8, 3);
  g.fillStyle = '#9a4a24'; g.beginPath(); g.moveTo(x - r - 8, y - 52); g.lineTo(x, y - 74); g.lineTo(x + r + 8, y - 52); g.closePath(); g.fill();
  g.fillStyle = '#7a3a1c'; g.fillRect(x - r - 8, y - 54, 2 * r + 16, 4);
  g.fillStyle = '#5a3a1f'; g.fillRect(x + 4, y - 41, 2, 14); g.fillStyle = '#8b6b45'; rr(g, x + 1, y - 28, 8, 8, 2); g.fill();  // דלי
}

// ============================================================
//   בתוך הבית
// ============================================================
const ROOM = {
  w: 640, h: 440, cell: 12,
  start: { x: 320, y: 392, dir: 'up' },
  table: { x: 150, y: 196, w: 104, h: 54 },
  bed: { x: 476, y: 104, w: 112, h: 104 },
  jars: [[574, 360, 15], [548, 386, 12]],
  elder: { x: 330, y: 176, dir: 'down', phase: 0 },
  exit: { x: 290, y: 410, w: 60, h: 30 }
};
ROOM.blocked = function (x, y) {
  if (x < 18 + NR || x > this.w - 18 - NR || y < 104) return true;
  if (y > 424 - NR + 4 && !(x > 296 && x < 344)) return true;
  if (y > this.h - 4) return true;
  const inflated = (r) => x > r.x - NR && x < r.x + r.w + NR && y > r.y - 2 && y < r.y + r.h + 4;
  if (inflated(this.table) || inflated(this.bed)) return true;
  for (const j of this.jars) { const dx = x - j[0], dy = y - j[1]; if (dx * dx + dy * dy < (j[2] + NR) ** 2) return true; }
  { const dx = x - this.elder.x, dy = y - this.elder.y; if (dx * dx + dy * dy < (12 + NR) ** 2) return true; }
  return false;
};
function drawRoomBack(g) {
  const W = ROOM.w, H = ROOM.h;
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  // רצפת קרשים
  g.fillStyle = '#b8895a'; g.fillRect(0, 96, W, H - 96);
  const R = rng(5);
  for (let y = 96; y < H; y += 22) {
    g.fillStyle = 'rgba(90,55,25,.35)'; g.fillRect(0, y, W, 2);
    let x = (y / 22 % 2) * 60 - 40;
    while (x < W) { x += 90 + R() * 70; g.fillRect(x, y, 2, 22); }
    g.fillStyle = 'rgba(255,230,190,.08)'; g.fillRect(0, y + 3, W, 6);
  }
  // אור מהחלון על הרצפה
  g.fillStyle = 'rgba(255,240,190,.18)';
  g.beginPath(); g.moveTo(400, 96); g.lineTo(486, 96); g.lineTo(520, 250); g.lineTo(380, 250); g.closePath(); g.fill();
  // שטיח
  g.fillStyle = '#7f1d1d'; ell(g, 322, 300, 112, 58);
  g.fillStyle = '#b45309'; ell(g, 322, 300, 100, 50);
  g.fillStyle = '#991b1b'; ell(g, 322, 300, 84, 40);
  g.fillStyle = 'rgba(253,224,71,.5)'; for (let a = 0; a < 6.28; a += 0.5) circ(g, 322 + Math.cos(a) * 92, 300 + Math.sin(a) * 45, 2);
  // קיר אחורי
  g.fillStyle = '#7a5232'; g.fillRect(0, 0, W, 96);
  for (let x = 0; x < W; x += 26) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 2, 96); }
  g.fillStyle = '#5a3a1f'; g.fillRect(0, 88, W, 8);
  // חלון
  g.fillStyle = '#5a3a1f'; g.fillRect(398, 18, 92, 58);
  g.fillStyle = '#bfe3f5'; g.fillRect(404, 24, 80, 46);
  g.fillStyle = '#7cbf5a'; g.fillRect(404, 52, 80, 18);
  g.fillStyle = '#5a3a1f'; g.fillRect(442, 24, 4, 46); g.fillRect(404, 45, 80, 3);
  // מדף עם כלים
  g.fillStyle = '#5a3a1f'; g.fillRect(90, 46, 150, 7);
  [[110, '#b45309', 11], [136, '#64748b', 8], [160, '#0f766e', 10], [190, '#a16207', 12], [218, '#e5e7eb', 7]].forEach(([x, c, s]) => { g.fillStyle = c; rr(g, x - s / 2, 46 - s * 1.6, s, s * 1.6, s / 2.4); g.fill(); });
  // קירות צד וקיר תחתון עם פתח הדלת
  g.fillStyle = '#5a3a1f'; g.fillRect(0, 0, 18, H); g.fillRect(W - 18, 0, 18, H);
  g.fillStyle = '#4a2f18'; g.fillRect(0, H - 16, 290, 16); g.fillRect(350, H - 16, W - 350, 16);
  g.fillStyle = '#d9c39a'; g.fillRect(290, H - 16, 60, 16);                      // אור מבחוץ בפתח
  g.fillStyle = '#7c6a3c'; rr(g, 294, 402, 52, 20, 4); g.fill();                  // שטיחון כניסה
  g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 298; x < 344; x += 6) g.fillRect(x, 405, 2, 14);
  g.restore();
}
function drawTable(g) {
  const t = ROOM.table;
  g.fillStyle = 'rgba(40,20,5,.28)'; rr(g, t.x + 6, t.y + 12, t.w, t.h, 6); g.fill();
  g.fillStyle = '#5a3a1f'; g.fillRect(t.x + 6, t.y + t.h - 6, 8, 14); g.fillRect(t.x + t.w - 14, t.y + t.h - 6, 8, 14);
  g.fillStyle = '#8b5e3c'; rr(g, t.x, t.y, t.w, t.h, 6); g.fill();
  g.fillStyle = '#9c6c45'; rr(g, t.x + 4, t.y + 4, t.w - 8, t.h - 14, 4); g.fill();
  g.fillStyle = '#6b4a2b'; g.fillRect(t.x, t.y + t.h - 8, t.w, 8);
  // כד וקערה על השולחן
  g.fillStyle = '#c2683a'; ell(g, t.x + 34, t.y + 18, 11, 12); g.fillStyle = '#a3522b'; ell(g, t.x + 34, t.y + 9, 6, 3); g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, t.x + 30, t.y + 15, 3, 5);
  g.fillStyle = '#e7e5e4'; ell(g, t.x + 72, t.y + 22, 13, 7); g.fillStyle = '#ef4444'; circ(g, t.x + 68, t.y + 20, 3.4); g.fillStyle = '#facc15'; circ(g, t.x + 75, t.y + 21, 3.4);
  // שרפרפים
  [[t.x + 24, t.y + t.h + 26], [t.x + t.w - 24, t.y + t.h + 26]].forEach(([x, y]) => { g.fillStyle = 'rgba(40,20,5,.25)'; ell(g, x + 3, y + 3, 12, 5); g.fillStyle = '#7a5232'; ell(g, x, y - 4, 11, 7); g.fillStyle = '#946640'; ell(g, x, y - 6, 9, 5); });
}
function drawBed(g) {
  const b = ROOM.bed;
  g.fillStyle = 'rgba(40,20,5,.25)'; rr(g, b.x + 6, b.y + 8, b.w, b.h, 8); g.fill();
  g.fillStyle = '#6b4a2b'; rr(g, b.x, b.y, b.w, b.h, 8); g.fill();
  g.fillStyle = '#f1ede4'; rr(g, b.x + 6, b.y + 6, b.w - 12, b.h - 16, 6); g.fill();
  g.fillStyle = '#ffffff'; rr(g, b.x + 16, b.y + 10, b.w - 32, 22, 8); g.fill();
  g.fillStyle = '#2563eb'; rr(g, b.x + 6, b.y + 40, b.w - 12, b.h - 50, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = b.x + 18; x < b.x + b.w - 10; x += 18) g.fillRect(x, b.y + 42, 3, b.h - 54);
  g.fillStyle = '#5a3a1f'; g.fillRect(b.x, b.y + b.h - 10, b.w, 10);
}
function drawJar(g, j) {
  const [x, y, s] = j;
  g.fillStyle = 'rgba(40,20,5,.28)'; ell(g, x + 4, y + 2, s, s * 0.45);
  g.fillStyle = '#b45f33'; ell(g, x, y - s * 0.9, s, s * 1.05);
  g.fillStyle = '#c97646'; ell(g, x - s * 0.3, y - s * 1.1, s * 0.35, s * 0.55);
  g.fillStyle = '#8f4423'; ell(g, x, y - s * 1.85, s * 0.5, s * 0.22);
  g.fillStyle = '#5a2a12'; ell(g, x, y - s * 1.85, s * 0.32, s * 0.12);
}

// ============================================================
//   מצב, מצלמה, ניווט
// ============================================================
const view = { z: 1.5, cx: 0, cy: 0 };
let scene = OUT;
const ninja = { x: OUT.start.x, y: OUT.start.y, dir: 'down', phase: 0, walking: false, path: [], goal: null };
let doorArmed = true, bubble = null, marker = null, fade = null, moved = false;
const keys = {};

function zoomFor(s) { return s === ROOM ? Math.min(SW / 700, SH / 520, 2.2) : Math.max(1.15, Math.min(SW / 820, SH / 620, 2)); }

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
  let start = idx(sx, sy); const goal = idx(tx, ty);
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
  // החלקה: מדלגים על נקודות כשיש קו ישר פנוי
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
      const px = (c + 0.5) * C, py = (r + 0.5) * C, d = Math.hypot(px - x, py - y);
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
  const wx = sx / view.z + view.cx, wy = sy / view.z + view.cy;
  if (scene === OUT) {
    for (const h of OUT.houses) if (inRect(wx, wy, h.hit)) { goTo(h.doorX, h.zone.y + 10, { house: h }); return; }
  } else if (inRect(wx, wy, { x: 280, y: 396, w: 80, h: 44 })) { goTo(320, 426, { exit: true }); return; }
  goTo(wx, wy, null);
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
function switchScene(next, x, y, dir) {
  fade = { t: 0, next, x, y, dir };
}
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
        else bubble = { text: 'סגור', x: h.doorX, y: h.y + h.h - WALL - 4, t: 0 };
      }
    }
  } else {
    if (inRect(ninja.x, ninja.y, ROOM.exit)) {
      inAny = true;
      const wants = ninja.dir === 'down' || (ninja.goal && ninja.goal.exit);
      if (doorArmed && wants) {
        doorArmed = false;
        const h = OUT.houses[0];
        switchScene(OUT, h.doorX, h.zone.y + h.zone.h + 6, 'down');
      }
    }
  }
  if (!inAny) doorArmed = true;
}

// ---------- עדכון ----------
function setDirFrom(dx, dy) {
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
  let kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  ninja.walking = false;
  if (kx || ky) {
    ninja.path = []; ninja.goal = null; marker = null; noteMoved();
    const n = Math.hypot(kx, ky), step = SPEED * dt;
    const mx = kx / n * step, my = ky / n * step;
    let didMove = false;
    if (mx && !scene.blocked(ninja.x + mx, ninja.y)) { ninja.x += mx; didMove = true; }
    if (my && !scene.blocked(ninja.x, ninja.y + my)) { ninja.y += my; didMove = true; }
    setDirFrom(kx, ky);
    ninja.walking = didMove;
  } else if (ninja.path.length) {
    let left = SPEED * dt;
    while (left > 0 && ninja.path.length) {
      const [tx, ty] = ninja.path[0], dx = tx - ninja.x, dy = ty - ninja.y, d = Math.hypot(dx, dy);
      if (d < 0.5) { ninja.path.shift(); continue; }
      setDirFrom(dx, dy);
      const m = Math.min(d, left); ninja.x += dx / d * m; ninja.y += dy / d * m; left -= m;
      if (m >= d) ninja.path.shift();
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
  const clampC = (c, size, v) => size <= v ? (size - v) / 2 : Math.max(0, Math.min(size - v, c));
  view.cx = clampC(ninja.x - vw / 2, scene.w, vw);
  view.cy = clampC(ninja.y - vh / 2 - 10, scene.h, vh);
}
function render() {
  camera();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = scene === OUT ? '#2f4a2a' : '#1c140c'; ctx.fillRect(0, 0, SW, SH);
  ctx.setTransform(DPR * view.z, 0, 0, DPR * view.z, -view.cx * view.z * DPR, -view.cy * view.z * DPR);
  const items = [];
  const nin = { y: ninja.y, d: g => drawChar(g, ninja.x, ninja.y, ninja.dir, ninja.phase, ninja.walking, NINJA_LOOK) };
  if (scene === OUT) {
    ctx.drawImage(groundCv, 0, 0, OUT.w, OUT.h);
    OUT.houses.forEach(h => items.push({ y: h.y + h.h, d: g => drawHouse(g, h) }));
    OUT.trees.forEach(t => items.push({ y: t[1], d: g => drawTree(g, t) }));
    OUT.bushes.forEach(b => items.push({ y: b[1], d: g => drawBush(g, b) }));
    OUT.rocks.forEach(r => items.push({ y: r[1], d: g => drawRock(g, r) }));
    items.push({ y: OUT.well.y + 8, d: g => drawWell(g, OUT.well) });
  } else {
    drawRoomBack(ctx);
    items.push({ y: ROOM.table.y + ROOM.table.h, d: drawTable });
    items.push({ y: ROOM.bed.y + ROOM.bed.h, d: drawBed });
    ROOM.jars.forEach(j => items.push({ y: j[1], d: g => drawJar(g, j) }));
    const E = ROOM.elder;
    items.push({ y: E.y, d: g => drawChar(g, E.x, E.y, ninja.y < E.y - 10 ? 'up' : 'down', E.phase, false, ELDER_LOOK) });
  }
  if (marker) {
    const k = (marker.t % 0.9) / 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(marker.x, marker.y, 6 + k * 10, (6 + k * 10) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  items.push(nin);
  items.sort((a, b) => a.y - b.y).forEach(it => it.d(ctx));
  if (scene === ROOM) { ctx.fillStyle = '#4a2f18'; ctx.fillRect(0, ROOM.h - 16, 290, 16); ctx.fillRect(350, ROOM.h - 16, ROOM.w - 350, 16); }
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
