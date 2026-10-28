/* ============================================================
   village/js/world.js – העולם בחוץ: מפה גדולה בחמישה אזורים.
   מרכז הכפר (המקורי) באמצע; מדרום יער במבוק עם מקדש קטן (פתוח).
   ממערב: מקדש גדול – מאחורי סלע שחוסם את הדרך (PUSH).
   ממזרח: שדות אורז – מעבר לנהר, על אבני קפיצה (JUMP).
   מצפון: שוק – מאחורי חומה ושער עם שומר (FIGHT). השער בצפון כי במבט שלנו
   רואים רק את הצד הדרומי של קירות – כך הנינג'ה מגיע אל השער מלפנים.
   הכול מכוסה בערפל שמתפזר כשהולכים, והמעברים נפתחים במילים.
   (בינתיים אין זיהוי קולי: נגיעה בשלט עם המילה פותחת את המעבר.)
   ============================================================ */

const OUT = { w: 3400, h: 2600, cell: 8, start: { x: 1700, y: 1440, dir: 'down' } };
const WALL = 60, RISE = 44;                         // גובה קיר הבית וגובה הגג
const CLIFF_X = 1000, GAP = [1372, 1448];           // רכס הסלעים במערב, והפתח שהסלע הגדול חוסם
const WALL_Y = 900, GATE_X = 1715, GATE_HALF = 26;  // החומה בצפון והשער
const RIVER_HALF = 56;
function riverX(y) { return 2525 + Math.sin(y / 260) * 40 + Math.sin(y / 97) * 8; }
const CROSS_Y = 1376, CROSS_X = riverX(CROSS_Y);    // אבני הקפיצה בנהר
const WALL_END = riverX(WALL_Y) - 40;

// מפתחות שמירה (localStorage) – עם קידומת של הכפר כדי לא להתנגש בארקייד
const KEY_FOG = 'ninjaVoice_village_fog', KEY_OPEN = 'ninjaVoice_village_open';
try { if (/[?&]reset\b/.test(location.search)) { localStorage.removeItem(KEY_FOG); localStorage.removeItem(KEY_OPEN); } } catch (e) {}

// ============================================================
//   הנתונים
// ============================================================
OUT.paths = [
  [[300, 1480], [560, 1462], [760, 1432], [1000, 1410], [1300, 1396], [1700, 1366], [2100, 1386], [2420, 1372]],   // הדרך הראשית (מערב ← מרכז)
  [[2590, 1386], [3000, 1424], [3330, 1404]],                                                                        // ממשיכה מעבר לנהר
  [[1520, 1380], [1520, 1232]],
  [[1810, 1372], [1915, 1270], [1915, 1152]],
  [[2000, 1384], [2000, 1615], [2155, 1615], [2155, 1552]],
  [[1700, 1366], [1700, 1700], [1470, 1720]],
  [[1700, 1700], [1716, 1880], [1660, 2100], [1710, 2330], [1640, 2540]],                                          // דרומה ליער
  [[1700, 1366], [1690, 1150], [1715, 900], [1718, 670]],                                                            // צפונה, דרך השער, לשוק
  [[1710, 2330], [1900, 2352], [2048, 2334], [2048, 2278]],                                                          // למקדש הקטן ביער
  [[1660, 2100], [1420, 2180], [1230, 2300]],                                                                        // לעץ הזקן ביער
  [[430, 1468], [455, 1330], [460, 1075]],                                                                           // למקדש הגדול
  [[760, 1432], [718, 1650]],                                                                                        // לבריכה במערב
  [[2800, 1400], [2900, 1250], [2965, 1135]],                                                                        // לבית החווה
  [[1960, 380], [2235, 262]]                                                                                         // מהשוק לבית התה
];
OUT.houses = [
  { x: 1430, y: 1100, w: 180, h: 130, roof: 'tile', enter: true },
  { x: 1830, y: 1030, w: 170, h: 120, roof: 'thatch' },
  { x: 2070, y: 1420, w: 170, h: 130, roof: 'tile2' },
  { x: 2880, y: 1000, w: 170, h: 120, roof: 'thatch' },
  { x: 300, y: 860, w: 320, h: 190, roof: 'temple', pillar: '#9f1d1d' },
  { x: 2150, y: 120, w: 170, h: 120, roof: 'tile' }
];
OUT.houses.forEach(h => {
  h.doorX = h.x + h.w / 2;
  h.zone = { x: h.doorX - 17, y: h.y + h.h, w: 34, h: 22 };
  h.front = (h.y + h.h) * K;
  h.eave = h.front - WALL + 6;
  h.ridge = (h.y + h.h / 2) * K - WALL - RISE;
  h.hit = { x: h.x - 26, y: h.ridge - 12, w: h.w + 52, h: h.front - h.ridge + 12 };   // על המסך
});
OUT.ponds = [{ x: 1330, y: 1590, rx: 125, ry: 72, koi: 3 }, { x: 700, y: 1745, rx: 105, ry: 62, koi: 2 }];
OUT.well = { x: 1800, y: 1490, r: 24 };
OUT.toriis = [{ x: 1700, y: 1620, half: 44 }, { x: 456, y: 1300, half: 50 }, { x: 2048, y: 2300, half: 34, s: 0.72 }];
OUT.plazas = [
  { x: 1800, y: 1496, rx: 64, ry: 54, kind: 'stone' },
  { x: 1720, y: 470, rx: 300, ry: 185, kind: 'earth' },
  { x: 460, y: 1185, rx: 200, ry: 100, kind: 'gravel' }
];
OUT.paddies = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) OUT.paddies.push({ x: 2660 + i * 180, y: 1470 + j * 150, w: 140, h: 110 });
for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) OUT.paddies.push({ x: 2660 + i * 180, y: 350 + j * 150, w: 140, h: 110 });
OUT.stalls = [
  { x: 1450, y: 610, c: '#dc2626', goods: 'fruit' }, { x: 1990, y: 610, c: '#16a34a', goods: 'pots' },
  { x: 1460, y: 345, c: '#2563eb', goods: 'fish' }, { x: 1720, y: 335, c: '#9333ea', goods: 'sweets' }, { x: 1980, y: 345, c: '#ca8a04', goods: 'cloth' }
];
OUT.people = [
  { x: 1450, y: 568, look: MERCHANT_LOOK }, { x: 1640, y: 470, look: VILLAGER_LOOK }, { x: 1830, y: 445, look: VILLAGER2_LOOK },
  { x: 585, y: 1128, look: MONK_LOOK }, { x: 2820, y: 1750, look: FARMER_LOOK }, { x: 1300, y: 1692, look: FISHER_LOOK, dir: 'up' }
].map((p, i) => Object.assign({ dir: 'down', phase: i * 1.3 }, p));
OUT.shrine = { x: 2048, y: 2240 };
OUT.jizo = [[1990, 2255], [2108, 2255], [2130, 2290]];
OUT.scarecrows = [[3000, 1600], [3180, 1900], [2820, 600]];
OUT.oldTree = { x: 1180, y: 2345 };

// ---------- מה תופס מקום על הקרקע (לבדיקות מיקום) ----------
function onPath(x, y, pad) {
  for (const p of OUT.paths) for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], vx = bx - ax, vy = by - ay;
    const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    if (Math.hypot(x - ax - vx * k, y - ay - vy * k) < pad) return true;
  }
  return false;
}
function inWater(x, y, pad) {
  if (Math.abs(x - riverX(y)) < RIVER_HALF + 20 + pad) return true;
  for (const p of OUT.ponds) { const dx = (x - p.x) / (p.rx + 12 + pad), dy = (y - p.y) / (p.ry + 12 + pad); if (dx * dx + dy * dy < 1) return true; }
  return false;
}
function inPaddy(x, y, pad) { for (const r of OUT.paddies) if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true; return false; }
function inPlaza(x, y, pad) { for (const p of OUT.plazas) { const dx = (x - p.x) / (p.rx + pad), dy = (y - p.y) / (p.ry + pad); if (dx * dx + dy * dy < 1) return true; } return false; }
function inHouse(x, y, pad) { for (const h of OUT.houses) if (x > h.x - pad && x < h.x + h.w + pad && y > h.y - pad - 20 && y < h.y + h.h + pad) return true; return false; }
function nearBarrier(x, y, pad) {
  if (Math.abs(x - CLIFF_X) < 40 + pad) return true;
  if (Math.abs(y - WALL_Y) < 26 + pad && x > CLIFF_X - 20 && x < WALL_END + 60) return true;
  return false;
}
function region(x, y) { if (x < CLIFF_X) return 'west'; if (x > riverX(y)) return 'east'; if (y < WALL_Y) return 'north'; return 'center'; }

// ---------- עצמים: תחילה מה שתוכנן ביד (מרכז הכפר המקורי), ואחר כך מילוי אקראי ----------
OUT.trees = []; OUT.stalks = []; OUT.bushes = []; OUT.rocks = []; OUT.lanterns = []; OUT.cliff = [];
const placed = [];      // [x, y, r] – כדי שעצמים לא ייפלו זה על זה
function roomFor(x, y, r) { for (const q of placed) { const dx = x - q[0], dy = y - q[1], m = r + q[2]; if (dx * dx + dy * dy < m * m) return false; } return true; }
function okSpot(x, y, r, pathPad) {
  return x > 50 && y > 60 && x < OUT.w - 50 && y < OUT.h - 40 && !onPath(x, y, pathPad) && !inWater(x, y, 6) && !inPaddy(x, y, 10) &&
         !inPlaza(x, y, 40) && !inHouse(x, y, 34) && !nearBarrier(x, y, 8) && roomFor(x, y, r);
}
function put(list, item, x, y, r) { list.push(item); placed.push([x, y, r]); }

(function buildObjects() {
  // הבנויים
  OUT.stalls.forEach(s => placed.push([s.x, s.y - 20, 60]));
  OUT.people.forEach(p => placed.push([p.x, p.y, 16]));
  OUT.jizo.forEach(j => placed.push([j[0], j[1], 14]));
  OUT.scarecrows.forEach(s => placed.push([s[0], s[1], 14]));
  placed.push([OUT.shrine.x, OUT.shrine.y, 40], [OUT.well.x, OUT.well.y, 40], [OUT.oldTree.x, OUT.oldTree.y, 40]);
  OUT.toriis.forEach(t => placed.push([t.x - t.half, t.y, 10], [t.x + t.half, t.y, 10]));
  // מרכז הכפר המקורי (מוזז ל־1000,800)
  [['cherry', 1262, 1090, 1.1], ['pine', 1200, 1210, 1], ['cherry', 1330, 1270, 0.85], ['cherry', 2110, 1130, 1], ['pine', 2190, 1260, 0.9],
   ['cherry', 2305, 1280, 0.9], ['pine', 1880, 1520, 1], ['cherry', 1565, 1515, 0.9], ['pine', 2300, 1600, 1.1], ['cherry', 1150, 1710, 1],
   ['cherry', 2010, 1735, 0.9], ['pine', 2350, 1460, 0.9], ['cherry', 1880, 1660, 0.8]]
    .forEach(t => { if (!onPath(t[1], t[2], 30)) put(OUT.trees, t, t[1], t[2], 26 * t[3]); });
  OUT.trees.push(['pine', OUT.oldTree.x, OUT.oldTree.y, 1.55]);
  [[1470, 1332], [1600, 1414], [1880, 1414], [1640, 1570], [1760, 1570], [390, 1180], [530, 1180], [1968, 2300], [2128, 2300],
   [1340, 330], [2110, 330], [1340, 640], [2110, 640], [1635, 950], [1795, 950], [2600, 1440], [3040, 1170]]
    .forEach(l => put(OUT.lanterns, l, l[0], l[1], 14));
  [[2060, 1270, 10], [1960, 1490, 8], [1210, 1500, 12], [1445, 1515, 9], [1465, 1660, 10]].forEach(r => put(OUT.rocks, r, r[0], r[1], r[2] + 6));
  [[1380, 970, 9], [2230, 970, 8], [1120, 1030, 7], [2230, 1705, 7], [1560, 1760, 6]].forEach(([gx, gy, n], gi) => {
    const R2 = rng(100 + gi);
    for (let i = 0; i < n; i++) { const x = gx + (R2() - 0.5) * 70, y = gy + (R2() - 0.5) * 34; if (!onPath(x, y, 30) && !nearBarrier(x, y, 10)) put(OUT.stalks, [x, y, 0.75 + R2() * 0.5, R2()], x, y, 6); }
  });
  // רכס הסלעים במערב (עם פתח לדרך)
  const RC = rng(311);
  for (let y = 30; y < OUT.h - 10; y += 44) {
    if (y > GAP[0] - 34 && y < GAP[1] + 26) continue;
    OUT.cliff.push([CLIFF_X + (RC() - 0.5) * 16, y, 24 + RC() * 14, RC() * 100]);
  }
  OUT.cliff.push([CLIFF_X - 4, GAP[0] - 22, 30, 7], [CLIFF_X + 2, GAP[1] + 20, 32, 9]);
  // שולי העולם: אורנים ושיחים
  const RB = rng(7);
  for (let x = 40; x < OUT.w - 20; x += 64) {
    if (RB() < 0.6) put(OUT.trees, ['pine', x + RB() * 20, 40 + RB() * 16, 0.95 + RB() * 0.3], x, 48, 8);
    else put(OUT.bushes, [x + RB() * 20, 44 + RB() * 12, 24 + RB() * 8, RB() < 0.3], x, 48, 8);
    put(OUT.bushes, [x + RB() * 20, OUT.h - 14 - RB() * 6, 22 + RB() * 8, RB() < 0.4], x, OUT.h - 14, 8);
  }
  for (let y = 100; y < OUT.h - 40; y += 64) {
    put(OUT.bushes, [22 + RB() * 8, y + RB() * 20, 22 + RB() * 8, RB() < 0.4], 26, y, 8);
    put(OUT.bushes, [OUT.w - 22 - RB() * 8, y + RB() * 20, 22 + RB() * 8, RB() < 0.4], OUT.w - 26, y, 8);
  }
  // מילוי אקראי לפי אזור
  const R = rng(2026);
  const fill = (n, area, fn) => { let made = 0; for (let a = 0; a < n * 25 && made < n; a++) { const x = area[0] + R() * (area[2] - area[0]), y = area[1] + R() * (area[3] - area[1]); if (fn(x, y)) made++; } };
  // יער הבמבוק בדרום
  fill(380, [1030, 1880, 2420, 2560], (x, y) => {
    if (Math.hypot(x - 2048, (y - 2255) * 1.3) < 150 || Math.hypot(x - OUT.oldTree.x, y - OUT.oldTree.y) < 100 || inHouse(x, y, 60)) return false;
    if (!okSpot(x, y, 9, 44)) return false;
    put(OUT.stalks, [x, y, 0.8 + R() * 0.55, R()], x, y, 7); return true;
  });
  fill(22, [1030, 1880, 2420, 2560], (x, y) => okSpot(x, y, 28, 56) && (put(OUT.trees, ['pine', x, y, 0.9 + R() * 0.4], x, y, 28), true));
  // שאר האזורים: עצים, שיחים וסלעים
  const scatter = (area, nTrees, nBush, nRock, mix) => {
    fill(nTrees, area, (x, y) => okSpot(x, y, 34, 58) && (put(OUT.trees, [R() < mix ? 'cherry' : 'pine', x, y, 0.85 + R() * 0.35], x, y, 30), true));
    fill(nBush, area, (x, y) => okSpot(x, y, 20, 52) && (put(OUT.bushes, [x, y, 18 + R() * 10, R() < 0.35], x, y, 20), true));
    fill(nRock, area, (x, y) => okSpot(x, y, 12, 30) && (put(OUT.rocks, [x, y, 7 + R() * 7], x, y, 12), true));
  };
  scatter([60, 80, 960, 2560], 70, 50, 26, 0.45);                 // מערב
  scatter([2640, 80, 3360, 2560], 18, 26, 14, 0.4);               // מזרח (בין השדות)
  scatter([1040, 70, 2440, 860], 22, 34, 12, 0.6);                 // צפון (השוק)
  scatter([1040, 880, 2440, 1820], 10, 18, 8, 0.5);               // מרכז (מעט, כדי לא להעמיס)
  // סוף מילוי
  OUT.trees.push(['cherry', 740, 980, 1.5], ['cherry', 190, 1110, 1.25], ['cherry', 1250, 190, 1.1], ['cherry', 2240, 700, 1.1]);
})();

// ============================================================
//   חסימות: רשת של תאים בגודל 8 – מסמנים כל מכשול (מורחב ברדיוס הנינג'ה)
// ============================================================
const SC = OUT.cell, SCOLS = Math.ceil(OUT.w / SC), SROWS = Math.ceil(OUT.h / SC);
const solid = new Uint8Array(SCOLS * SROWS);
OUT.grid = { cols: SCOLS, rows: SROWS, g: solid };
function markArea(x0, y0, x1, y1, pred, v) {
  const c0 = Math.max(0, Math.floor(x0 / SC)), c1 = Math.min(SCOLS - 1, Math.floor(x1 / SC));
  const r0 = Math.max(0, Math.floor(y0 / SC)), r1 = Math.min(SROWS - 1, Math.floor(y1 / SC));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const x = (c + 0.5) * SC, y = (r + 0.5) * SC;
    if (!pred || pred(x, y)) solid[r * SCOLS + c] = v === undefined ? 1 : v;
  }
}
function markCircle(x, y, r) { const R = r + NR; markArea(x - R, y - R, x + R, y + R, (a, b) => (a - x) ** 2 + (b - y) ** 2 < R * R); }
function markRect(x0, y0, x1, y1) { markArea(x0 - NR, y0 - NR, x1 + NR, y1 + NR); }
function markEllipse(x, y, rx, ry) { markArea(x - rx, y - ry, x + rx, y + ry, (a, b) => ((a - x) / rx) ** 2 + ((b - y) / ry) ** 2 < 1); }

function buildSolid() {
  solid.fill(0);
  markArea(0, 0, OUT.w, 46); markArea(0, OUT.h - 26, OUT.w, OUT.h); markArea(0, 0, 32, OUT.h); markArea(OUT.w - 32, 0, OUT.w, OUT.h);
  markArea(CLIFF_X - 22, 0, CLIFF_X + 22, GAP[0]); markArea(CLIFF_X - 22, GAP[1], CLIFF_X + 22, OUT.h);
  OUT.cliff.forEach(c => markCircle(c[0], c[1], c[2] * 0.75));
  markArea(riverX(0) - 140, 0, riverX(0) + 140, OUT.h, (x, y) => Math.abs(x - riverX(y)) < RIVER_HALF + 4);
  markRect(CLIFF_X, WALL_Y - 8, WALL_END + 60, WALL_Y + 8);
  OUT.houses.forEach(h => markArea(h.x - NR, h.y - NR, h.x + h.w + NR, h.y + h.h + 6));
  OUT.trees.forEach(t => markCircle(t[1], t[2], 9 * t[3]));
  OUT.stalks.forEach(s => markCircle(s[0], s[1], 4));
  OUT.bushes.forEach(b => markCircle(b[0], b[1], b[2] * 0.55));
  OUT.rocks.forEach(r => markCircle(r[0], r[1], r[2] - 2));
  OUT.lanterns.forEach(l => markCircle(l[0], l[1], 7));
  OUT.toriis.forEach(t => { markCircle(t.x - t.half, t.y, 5); markCircle(t.x + t.half, t.y, 5); });
  markCircle(OUT.well.x, OUT.well.y, OUT.well.r);
  OUT.ponds.forEach(p => markEllipse(p.x, p.y, p.rx + NR - 6, p.ry + NR - 6));
  OUT.paddies.forEach(r => markArea(r.x - NR + 4, r.y - NR + 4, r.x + r.w + NR - 4, r.y + r.h + NR - 4));
  OUT.stalls.forEach(s => markArea(s.x - 56 - NR, s.y - 46, s.x + 56 + NR, s.y + 6));
  OUT.people.forEach(p => markCircle(p.x, p.y, 10));
  OUT.jizo.forEach(j => markCircle(j[0], j[1], 7));
  OUT.scarecrows.forEach(s => markCircle(s[0], s[1], 5));
  markRect(OUT.shrine.x - 22, OUT.shrine.y - 14, OUT.shrine.x + 22, OUT.shrine.y + 2);
  // המעברים
  const B = barrier;
  if (B('push').open) markCircle(BOULDER_TO[0], BOULDER_TO[1], 34); else markCircle(CLIFF_X, 1410, 40);
  if (B('fight').open) { markArea(GATE_X - GATE_HALF + NR, WALL_Y - 30, GATE_X + GATE_HALF - NR, WALL_Y + 30, null, 0); markCircle(GUARD_TO[0], GUARD_TO[1], 10); }
  else markCircle(GATE_X, WALL_Y + 30, 12);
  if (B('jump').open) markArea(CROSS_X - 100, CROSS_Y - 14, CROSS_X + 100, CROSS_Y + 14, null, 0);
}
OUT.blocked = function (x, y) {
  if (x < 0 || y < 0 || x >= OUT.w || y >= OUT.h) return true;
  return solid[Math.floor(y / SC) * SCOLS + Math.floor(x / SC)] === 1;
};

// ============================================================
//   המעברים שנפתחים במילים
// ============================================================
const BOULDER_TO = [1056, 1500], GUARD_TO = [GATE_X + 80, WALL_Y + 34];
const BARRIERS = [
  { id: 'push', word: 'PUSH', ax: 1066, ay: 1408, sx: CLIFF_X, sy: 1410 * K - 92 },
  { id: 'jump', word: 'JUMP', ax: CROSS_X - 100, ay: CROSS_Y, sx: CROSS_X - 88, sy: CROSS_Y * K - 74 },
  { id: 'fight', word: 'FIGHT', ax: GATE_X, ay: WALL_Y + 104, sx: GATE_X + 70, sy: WALL_Y * K - 96 }
];
(function loadOpen() {
  let open = [];
  try { open = JSON.parse(localStorage.getItem(KEY_OPEN) || '[]'); } catch (e) {}
  BARRIERS.forEach(b => { b.open = open.includes(b.id); b.t = b.open ? 1 : 0; b.show = 0; });
})();
function barrier(id) { return BARRIERS.find(b => b.id === id); }
function saveOpen() { try { localStorage.setItem(KEY_OPEN, JSON.stringify(BARRIERS.filter(b => b.open).map(b => b.id))); } catch (e) {} }
const sparkles = [];
function openBarrier(b) {
  if (b.open) return;
  b.open = true; b.t = 0; saveOpen(); buildSolid();
  const cx = b.id === 'push' ? CLIFF_X : b.id === 'jump' ? CROSS_X : GATE_X, cy = b.id === 'push' ? 1410 : b.id === 'jump' ? CROSS_Y : WALL_Y + 20;
  for (let i = 0; i < 16; i++) sparkles.push({ x: cx, y: cy * K - 30, a: i / 16 * 6.283, t: 0 });
}
function updateBarriers(dt, nx, ny) {
  BARRIERS.forEach(b => {
    if (b.open) b.t = Math.min(1, b.t + dt / 0.9);
    const near = !b.open && Math.hypot(nx - b.ax, (ny - b.ay) * K) < 170;
    b.show += ((near ? 1 : 0) - b.show) * Math.min(1, dt * 6);
  });
  for (let i = sparkles.length - 1; i >= 0; i--) { sparkles[i].t += dt; if (sparkles[i].t > 0.9) sparkles.splice(i, 1); }
}
function signHit(mx, my) {
  for (const b of BARRIERS) if (b.show > 0.5 && Math.abs(mx - b.sx) < 60 && Math.abs(my - b.sy) < 34) return b;
  return null;
}
function boulderPos() { const b = barrier('push'), k = b.open ? easeIO(b.t) : 0; return [CLIFF_X + (BOULDER_TO[0] - CLIFF_X) * k, 1410 + (BOULDER_TO[1] - 1410) * k, k * 2.4]; }
function guardPos() { const b = barrier('fight'), k = b.open ? easeIO(b.t) : 0; return [GATE_X + (GUARD_TO[0] - GATE_X) * k, WALL_Y + 30 + (GUARD_TO[1] - WALL_Y - 30) * k]; }
function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); }
// גובה הקפיצה כשעוברים על האבנים (3 קפיצות)
function hopLift(x, y) {
  if (!barrier('jump').open || Math.abs(y - CROSS_Y) > 24) return 0;
  const u = (x - (CROSS_X - 70)) / 140;
  return u > 0 && u < 1 ? Math.abs(Math.sin(u * Math.PI * 3)) * 15 : 0;
}

// ============================================================
//   ציורי העצמים (מהגרסה הקודמת)
// ============================================================
const ROOFS = {
  tile:  { base: '#3f4757', dark: '#2a303c', light: '#59627a' },
  tile2: { base: '#4a3f57', dark: '#30283b', light: '#665a78' },
  thatch:{ base: '#8f7a4c', dark: '#6b5a35', light: '#ad9663', thatch: true },
  temple:{ base: '#3a4150', dark: '#262b36', light: '#555e72' }
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
  g.fillStyle = h.pillar || '#3a2a1e';
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
  if (t.s && t.s !== 1) { g.save(); g.translate(t.x, t.y * K); g.scale(t.s, t.s); drawTorii(g, { x: 0, y: 0, half: t.half / t.s }); g.restore(); return; }
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
const KOI_COLORS = ['#f97316', '#fafafa', '#ef4444'];
function drawKoi(g, p, now) {     // בקואורדינטות קרקע (בתוך שכבת הקרקע המכווצת)
  for (let n = 0; n < p.koi; n++) {
    const f = { a: n * 2.1 + p.x, r: [0.55, 0.4, 0.65][n % 3], sp: [0.5, -0.7, 0.35][n % 3], c: KOI_COLORS[n % 3] };
    const a = f.a + now / 1000 * f.sp, x = p.x + Math.cos(a) * p.rx * f.r, y = p.y + Math.sin(a) * p.ry * f.r;
    const h = Math.atan2(Math.cos(a) * p.ry * f.sp, -Math.sin(a) * p.rx * f.sp);
    g.save(); g.translate(x, y); g.rotate(h);
    g.fillStyle = 'rgba(0,0,0,.15)'; ell(g, 2, 3, 9, 3.5);
    g.fillStyle = f.c; ell(g, 0, 0, 9, 3.5);
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -4 + Math.sin(now / 150) * 2); g.lineTo(-14, 4 + Math.sin(now / 150) * 2); g.closePath(); g.fill();
    if (f.c === '#fafafa') { g.fillStyle = '#ef4444'; ell(g, 3, 0, 3, 2); }
    g.restore();
  }
}


// ============================================================
//   ציורים חדשים: רכס, סלע, חומה ושער, דוכנים, ג'יזו, מקדש קטן, דחליל, שלט
// ============================================================
function drawCliffRock(g, x, yS, s, seed) {
  g.fillStyle = 'rgba(20,40,10,.26)'; ell(g, x + 6, yS + 2, s * 1.25, s * 0.42);
  const h = s * (1.3 + hash(seed) * 0.5);
  g.fillStyle = '#6d6a60';
  g.beginPath(); g.moveTo(x - s * 1.1, yS); g.lineTo(x - s * 0.95, yS - h * 0.55); g.lineTo(x - s * 0.45, yS - h); g.lineTo(x + s * 0.35, yS - h * 0.95);
  g.lineTo(x + s * 1.05, yS - h * 0.5); g.lineTo(x + s * 1.15, yS); g.closePath(); g.fill();
  g.fillStyle = '#8a867b';
  g.beginPath(); g.moveTo(x - s * 0.95, yS - h * 0.55); g.lineTo(x - s * 0.45, yS - h); g.lineTo(x + s * 0.35, yS - h * 0.95); g.lineTo(x + s * 0.1, yS - h * 0.55); g.closePath(); g.fill();
  g.fillStyle = '#a5a196'; g.beginPath(); g.moveTo(x - s * 0.45, yS - h); g.lineTo(x + s * 0.35, yS - h * 0.95); g.lineTo(x - s * 0.05, yS - h * 0.78); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + s * 0.1, yS - h * 0.5, 1.4, h * 0.4);
  g.fillStyle = '#4f8a3a'; ell(g, x - s * 0.7, yS - 2, 6, 3); ell(g, x + s * 0.8, yS - 1, 5, 2.5);
}
function drawBoulder(g, x, yS, ang) {
  const r = 36;
  g.fillStyle = 'rgba(20,40,10,.3)'; ell(g, x + 8, yS + 2, r * 1.15, r * 0.4);
  g.fillStyle = '#6f6c62'; ell(g, x, yS - r * 0.8, r, r * 0.88);
  g.fillStyle = '#8c887d'; ell(g, x - 6, yS - r * 1.0, r * 0.75, r * 0.62);
  g.fillStyle = '#a7a397'; ell(g, x - 12, yS - r * 1.25, r * 0.32, r * 0.22);
  g.save(); g.translate(x, yS - r * 0.8); g.rotate(ang);
  g.strokeStyle = 'rgba(40,35,30,.45)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-14, -10); g.lineTo(-4, 2); g.lineTo(-8, 14); g.moveTo(10, -16); g.lineTo(16, -2); g.stroke();
  g.fillStyle = '#4f8a3a'; ell(g, 8, 18, 12, 5); ell(g, -16, 14, 7, 4);
  g.restore();
}
function drawWall(g, x0, x1) {
  const y = WALL_Y * K, H = 44, w = x1 - x0;
  g.fillStyle = 'rgba(20,40,10,.22)'; g.fillRect(x0, y, w, 9);
  g.fillStyle = '#ece4d2'; g.fillRect(x0, y - H, w, H);
  g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x0, y - H, w, 10);
  g.fillStyle = '#5b4a3a'; g.fillRect(x0, y - 13, w, 13);
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = x0 + 10; x < x1; x += 22) g.fillRect(x, y - 13, 1.5, 13);
  g.fillStyle = '#4a3527'; for (let x = x0 + 40; x < x1 - 10; x += 90) g.fillRect(x, y - H, 6, H - 13);
  g.fillStyle = '#3f4757'; g.fillRect(x0 - 4, y - H - 10, w + 8, 13);
  g.fillStyle = '#2a303c'; for (let x = x0; x < x1; x += 8) g.fillRect(x, y - H - 7, 2.2, 10);
  g.fillStyle = '#59627a'; g.fillRect(x0 - 4, y - H - 10, w + 8, 3);
}
function drawGate(g) {
  const b = barrier('fight'), t = b.open ? easeIO(b.t) : 0, x = GATE_X, y = WALL_Y * K, H = 74;
  g.fillStyle = 'rgba(20,40,10,.22)'; g.fillRect(x - 46, y, 92, 9);
  // דלתות: נפתחות פנימה (צפונה)
  const leaf = (hinge, dir) => {
    const w = 27 * (1 - 0.8 * t), lift = t * 9;
    g.fillStyle = '#6b4226';
    g.beginPath(); g.moveTo(hinge, y); g.lineTo(hinge + dir * w, y - lift); g.lineTo(hinge + dir * w, y - lift - 58); g.lineTo(hinge, y - 58); g.closePath(); g.fill();
    g.fillStyle = '#fbbf24'; for (let k = 0; k < 3; k++) circ(g, hinge + dir * w * 0.5, y - lift * 0.5 - 12 - k * 16, 1.6);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(Math.min(hinge, hinge + dir * w), y - 58, Math.abs(w), 4);
  };
  leaf(x - 27, 1); leaf(x + 27, -1);
  g.fillStyle = '#3a2a1e'; g.fillRect(x - 40, y - H, 13, H); g.fillRect(x + 27, y - H, 13, H);
  g.fillStyle = '#4a3527'; g.fillRect(x - 44, y - H, 88, 8);
  g.fillStyle = '#2a303c';
  g.beginPath(); g.moveTo(x - 64, y - H + 2); g.quadraticCurveTo(x, y - H - 12, x + 64, y - H + 2); g.lineTo(x + 70, y - H - 7);
  g.quadraticCurveTo(x, y - H - 34, x - 70, y - H - 7); g.closePath(); g.fill();
  g.fillStyle = '#59627a'; g.beginPath(); g.moveTo(x - 62, y - H - 5); g.quadraticCurveTo(x, y - H - 28, x + 62, y - H - 5); g.lineTo(x + 60, y - H - 2); g.quadraticCurveTo(x, y - H - 22, x - 60, y - H - 2); g.closePath(); g.fill();
}
function drawStall(g, st, now) {
  const x0 = st.x - 52, yb = st.y * K, dS = 26;
  g.fillStyle = 'rgba(20,40,10,.25)'; g.fillRect(x0 + 6, yb - 4, 108, 10);
  g.fillStyle = '#4a3527'; g.fillRect(x0 + 2, yb - dS - 92, 4, 92 - 26); g.fillRect(x0 + 98, yb - dS - 92, 4, 92 - 26);
  g.fillStyle = '#8b5e3c'; g.fillRect(x0, yb - 26 - dS, 104, dS);
  g.fillStyle = '#9c6c45'; g.fillRect(x0, yb - 26 - dS, 104, 3);
  const top = yb - 26 - dS + 6, R = rng(Math.round(st.x));
  if (st.goods === 'fruit') for (let i = 0; i < 14; i++) { g.fillStyle = ['#ef4444', '#f97316', '#facc15'][i % 3]; circ(g, x0 + 10 + (i % 7) * 14, top + 4 + Math.floor(i / 7) * 9, 4.5); }
  if (st.goods === 'fish') for (let i = 0; i < 5; i++) { g.fillStyle = '#94a3b8'; ell(g, x0 + 16 + i * 18, top + 8, 8, 3); g.fillStyle = '#cbd5e1'; ell(g, x0 + 14 + i * 18, top + 7, 4, 1.4); }
  if (st.goods === 'pots') for (let i = 0; i < 5; i++) { g.fillStyle = ['#7c4a2a', '#3b6e8f', '#9a5f36'][i % 3]; ell(g, x0 + 14 + i * 19, top + 4, 7, 8); g.fillStyle = '#2a170c'; ell(g, x0 + 14 + i * 19, top - 3, 3.5, 1.4); }
  if (st.goods === 'cloth') for (let i = 0; i < 5; i++) { g.fillStyle = ['#ec4899', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7'][i]; g.fillRect(x0 + 6 + i * 19, top - 2, 16, 12); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x0 + 6 + i * 19, top - 2, 16, 2); }
  if (st.goods === 'sweets') for (let i = 0; i < 16; i++) { g.fillStyle = ['#fbcfe8', '#f8fafc', '#bbf7d0'][i % 3]; circ(g, x0 + 9 + (i % 8) * 12, top + 2 + Math.floor(i / 8) * 8, 3.6); }
  if (st.goods === 'fans') for (let i = 0; i < 5; i++) { g.fillStyle = ['#ef4444', '#f8fafc', '#0ea5e9'][i % 3]; g.beginPath(); g.moveTo(x0 + 14 + i * 19, top + 10); g.arc(x0 + 14 + i * 19, top + 10, 9, Math.PI, 0); g.closePath(); g.fill(); }
  g.fillStyle = '#6b4a2b'; g.fillRect(x0, yb - 26, 104, 26);
  g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = x0 + 13; x < x0 + 104; x += 13) g.fillRect(x, yb - 26, 1.4, 26);
  g.fillStyle = '#4a3527'; g.fillRect(x0 + 2, yb - 92, 4, 92); g.fillRect(x0 + 98, yb - 92, 4, 92);
  // גגון בד מפוספס
  const ay = yb - 92 - dS * 0.5, sway = Math.sin(now / 900 + st.x) * 1.2;
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f8fafc' : st.c; g.fillRect(x0 - 8 + k * 15, ay - 14, 15, 18); }
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f8fafc' : st.c; g.beginPath(); g.arc(x0 - 0.5 + k * 15, ay + 4, 7.5, 0, Math.PI); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x0 - 8, ay - 14, 120, 3);
  g.fillStyle = shade(st.c, -0.3); g.fillRect(x0 - 8, ay - 18 + sway * 0.2, 120, 4);
}
function drawJizo(g, x, yS) {
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 3, yS + 1, 9, 3);
  g.fillStyle = '#8f8b80'; rr(g, x - 7, yS - 20, 14, 20, 6); g.fill();
  g.fillStyle = '#a3a095'; circ(g, x, yS - 25, 6.2);
  g.fillStyle = '#dc2626'; g.beginPath(); g.moveTo(x - 7, yS - 19); g.lineTo(x + 7, yS - 19); g.lineTo(x, yS - 9); g.closePath(); g.fill();
  g.fillStyle = '#b91c1c'; g.beginPath(); g.arc(x, yS - 27, 6.4, Math.PI, 0); g.fill();
  g.fillStyle = '#334155'; circ(g, x - 2.2, yS - 24.5, 0.8); circ(g, x + 2.2, yS - 24.5, 0.8);
}
function drawShrine(g, x, yS) {
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 6, yS + 2, 30, 7);
  g.fillStyle = '#8f8b80'; g.fillRect(x - 24, yS - 12, 48, 12);
  g.fillStyle = '#a7a397'; g.fillRect(x - 24, yS - 12, 48, 3);
  g.fillStyle = '#7a5232'; g.fillRect(x - 15, yS - 40, 30, 28);
  g.fillStyle = '#2a1d14'; g.fillRect(x - 8, yS - 34, 16, 20);
  g.fillStyle = '#fbbf24'; circ(g, x, yS - 22, 3);
  g.fillStyle = '#f97316'; circ(g, x - 18, yS - 15, 3); circ(g, x + 18, yS - 15, 3);
  g.fillStyle = '#3f4757'; g.beginPath(); g.moveTo(x - 26, yS - 38); g.quadraticCurveTo(x, yS - 46, x + 26, yS - 38); g.lineTo(x + 22, yS - 50); g.quadraticCurveTo(x, yS - 62, x - 22, yS - 50); g.closePath(); g.fill();
  g.fillStyle = '#dc2626'; g.fillRect(x - 15, yS - 41, 30, 3);
}
function drawScarecrow(g, x, yS, now) {
  const sw = Math.sin(now / 1100 + x) * 0.05;
  g.fillStyle = 'rgba(20,40,10,.25)'; ell(g, x + 4, yS + 1, 10, 3);
  g.save(); g.translate(x, yS); g.rotate(sw);
  g.fillStyle = '#6b4a2b'; g.fillRect(-1.6, -50, 3.2, 50); g.fillRect(-22, -38, 44, 3);
  g.fillStyle = '#2563eb'; rr(g, -11, -40, 22, 20, 4); g.fill();
  g.fillStyle = '#facc15'; g.fillRect(-4, -34, 6, 6);
  g.fillStyle = '#e7d6a8'; circ(g, 0, -46, 6);
  g.fillStyle = '#d9b968'; g.beginPath(); g.moveTo(-14, -46); g.quadraticCurveTo(0, -60, 14, -46); g.quadraticCurveTo(0, -43, -14, -46); g.fill();
  g.fillStyle = '#d9b968'; g.fillRect(-25, -39, 4, 5); g.fillRect(21, -39, 4, 5);
  g.restore();
}
function drawStones(g, now) {
  const open = barrier('jump').open;
  [-48, -16, 16, 48].forEach((dx, i) => {
    const x = CROSS_X + dx, y = (CROSS_Y + (i % 2 ? 3 : -3)) * K, r = 13;
    const rip = (now / 1400 + i * 0.3) % 1;
    g.strokeStyle = 'rgba(220,240,245,' + (0.5 * (1 - rip)) + ')'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(x, y + 2, r + rip * 10, (r + rip * 10) * 0.45, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#5d5a52'; ell(g, x, y + 1, r, r * 0.5);
    g.fillStyle = open ? '#9d998d' : '#8a867b'; ell(g, x - 1, y - 2, r * 0.9, r * 0.42);
    g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, x - 4, y - 3.5, r * 0.4, r * 0.15);
  });
}
function drawSign(g, b, now) {
  if (b.show < 0.02) return;
  const s = (0.85 + 0.15 * b.show) * (1 + Math.sin(now / 320) * 0.025);
  g.save(); g.globalAlpha = Math.min(1, b.show * 1.2); g.translate(b.sx, b.sy); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, -54, -26, 112, 56, 10); g.fill();
  g.fillStyle = '#6b4a2b'; g.fillRect(-3, 24, 6, 26);
  g.fillStyle = '#f6e7c4'; rr(g, -56, -30, 112, 56, 10); g.fill();
  g.strokeStyle = '#8b5e3c'; g.lineWidth = 3; rr(g, -56, -30, 112, 56, 10); g.stroke();
  // מיקרופון קטן
  g.fillStyle = '#b45309'; rr(g, -45, -14, 9, 15, 4.5); g.fill();
  g.strokeStyle = '#b45309'; g.lineWidth = 2; g.beginPath(); g.arc(-40.5, -5, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(-40.5, 3); g.lineTo(-40.5, 8); g.stroke();
  g.fillStyle = '#3b2a1a'; g.font = 'bold 26px system-ui, -apple-system, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(b.word, 10, -2);
  g.restore();
}
function drawSparkles(g) {
  sparkles.forEach(p => {
    const k = p.t / 0.9, d = 10 + k * 70;
    g.fillStyle = 'rgba(253,224,71,' + (1 - k) + ')';
    circ(g, p.x + Math.cos(p.a) * d, p.y + Math.sin(p.a) * d * 0.6, 3.5 * (1 - k) + 1);
  });
}

// ============================================================
//   הקרקע: מצוירת בחתיכות של 512, רק מה שקרוב למסך, ונשמרת בזיכרון
// ============================================================
const CH = 512, CCOLS = Math.ceil(OUT.w / CH), CROWS = Math.ceil(OUT.h / CH);
const buckets = Array.from({ length: CCOLS * CROWS }, () => []);
function decal(x0, y0, x1, y1, f) {
  const c0 = Math.max(0, Math.floor(x0 / CH)), c1 = Math.min(CCOLS - 1, Math.floor(x1 / CH));
  const r0 = Math.max(0, Math.floor(y0 / CH)), r1 = Math.min(CROWS - 1, Math.floor(y1 / CH));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) buckets[r * CCOLS + c].push(f);
}
function dEll(x, y, rx, ry, col) { decal(x - rx, y - ry, x + rx, y + ry, g => { g.fillStyle = col; ell(g, x, y, rx, ry); }); }

// שבילים אורגניים: מעגלים פינות, סטייה צדדית ורוחב משתנה → רשימת כתמים [x, y, רוחב, זווית]
function organicPaths() {
  const out = [];
  OUT.paths.forEach((p0, pi) => {
    let p = p0.map(q => q.slice());
    for (let it = 0; it < 3; it++) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const [ax, ay] = p[i], [bx, by] = p[i + 1];
        q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      q.push(p[p.length - 1]); p = q;
    }
    let dist = 0; const ph = pi * 1.7;
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i], len = Math.hypot(bx - ax, by - ay);
      if (len < 0.01) continue;
      const nx = -(by - ay) / len, ny = (bx - ax) / len, ang = Math.atan2(by - ay, bx - ax);
      for (let d = 0; d < len; d += 5) {
        const t = dist + d, k = d / len;
        const wob = Math.sin(t / 53 + ph) * 5 + Math.sin(t / 21 + ph * 2) * 2;
        const w = 23 + Math.sin(t / 61 + ph * 3) * 4 + Math.sin(t / 23 + ph) * 1.5;
        out.push([ax + (bx - ax) * k + nx * wob, ay + (by - ay) * k + ny * wob, w, ang]);
      }
      dist += len;
    }
  });
  return out;
}

(function buildDecals() {
  const R = rng(42), A = OUT.w * OUT.h / 1.4e6;
  // כתמי דשא
  for (let i = 0; i < 70 * A; i++) { const x = R() * OUT.w, y = R() * OUT.h, rx = 60 + R() * 140, ry = 40 + R() * 90; dEll(x, y, rx, ry, R() < 0.5 ? 'rgba(40,90,30,.07)' : 'rgba(170,210,110,.07)'); }
  for (let i = 0; i < 260 * A; i++) dEll(R() * OUT.w, R() * OUT.h, 6 + R() * 18, 4 + R() * 12, 'rgba(35,80,25,.11)');
  // הנהר: גדות, מים, אמצע בהיר
  for (let y = -6; y < OUT.h + 6; y += 6) {
    const x = riverX(y);
    decal(x - 90, y - 4, x + 90, y + 10, g => {
      g.fillStyle = '#7d7660'; g.fillRect(x - 76, y, 152, 7);
      g.fillStyle = '#2f6378'; g.fillRect(x - RIVER_HALF - 4, y, (RIVER_HALF + 4) * 2, 7);
      g.fillStyle = '#3b7a92'; g.fillRect(x - RIVER_HALF + 6, y, (RIVER_HALF - 6) * 2, 7);
      g.fillStyle = '#4a8ea6'; g.fillRect(x - 26, y, 52, 7);
    });
  }
  for (let i = 0; i < 320; i++) {
    const y = R() * OUT.h, x = riverX(y) + (R() - 0.5) * 80, L = 8 + R() * 18;
    decal(x - L, y - 4, x + L, y + 4, g => { g.fillStyle = 'rgba(220,240,245,.35)'; g.fillRect(x - L / 2, y, L, 1.6); });
  }
  for (let i = 0; i < 260; i++) {
    const y = R() * OUT.h, side = R() < 0.5 ? -1 : 1, x = riverX(y) + side * (62 + R() * 12), s = 4 + R() * 6, col = R() < 0.5 ? '#8d8a80' : '#a8a498';
    dEll(x, y, s, s * 0.8, col);
  }
  // בריכות
  OUT.ponds.forEach(p => decal(p.x - p.rx - 30, p.y - p.ry - 30, p.x + p.rx + 30, p.y + p.ry + 30, g => {
    const RR = rng(Math.round(p.x));
    g.fillStyle = '#7d7660'; ell(g, p.x, p.y + 4, p.rx + 10, p.ry + 10);
    g.fillStyle = '#2b5f74'; ell(g, p.x, p.y, p.rx, p.ry);
    g.fillStyle = '#3a7d96'; ell(g, p.x - 8, p.y - 10, p.rx - 20, p.ry - 22);
    g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, p.x - 40, p.y - 30, 28, 7); ell(g, p.x + 34, p.y + 14, 16, 4);
    g.fillStyle = '#4b8f3b'; ell(g, p.x + p.rx * 0.58, p.y - 22, 10, 10); ell(g, p.x - p.rx * 0.5, p.y + 28, 9, 9);
    g.fillStyle = '#f9a8d4'; circ(g, p.x + p.rx * 0.58, p.y - 24, 3);
    for (let i = 0; i < 18; i++) { const a = RR() * 6.28; g.fillStyle = RR() < 0.5 ? '#8d8a80' : '#a8a498'; ell(g, p.x + Math.cos(a) * (p.rx + 6), p.y + Math.sin(a) * (p.ry + 6), 7 + RR() * 6, 6 + RR() * 5); }
  }));
  // שדות אורז
  OUT.paddies.forEach(r => decal(r.x - 6, r.y - 14, r.x + r.w + 6, r.y + r.h + 6, g => {
    g.fillStyle = '#7d6b4a'; g.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    g.fillStyle = '#5f8f96'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(200,230,235,.3)'; g.fillRect(r.x, r.y, r.w, r.h * 0.28);
    g.strokeStyle = '#4f9a3a'; g.lineWidth = 1.4;
    for (let y = r.y + 12; y < r.y + r.h - 2; y += 14) for (let x = r.x + 9; x < r.x + r.w - 4; x += 12) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2.4, y - 8); g.moveTo(x, y); g.lineTo(x + 2.2, y - 9); g.moveTo(x, y); g.lineTo(x + 0.2, y - 10); g.stroke();
    }
  }));
  // שבילים
  const blobs = organicPaths();
  const layer = (grow, col, squash) => blobs.forEach(([x, y, w, a]) => {
    const r = w + grow + 2;
    decal(x - r, y - r, x + r, y + r, g => { g.fillStyle = col; g.save(); g.translate(x, y); g.rotate(a); ell(g, 0, 0, w + grow, (w + grow) * squash); g.restore(); });
  });
  layer(7, 'rgba(50,60,30,.22)', 0.8);
  layer(3, '#a99c7c', 0.82);
  layer(-1, '#cfc4a7', 0.85);
  blobs.forEach(([x, y, w]) => { if (R() < 0.18) dEll(x + (R() - 0.5) * w, y + (R() - 0.5) * w, 5 + R() * w * 0.5, 4 + R() * w * 0.35, R() < 0.6 ? 'rgba(232,224,204,.55)' : 'rgba(170,160,130,.35)'); });
  blobs.forEach(([x, y, w]) => {
    for (let k = 0; k < 3; k++) { if (R() < 0.35) continue; const s = 1.3 + R() * 1.6; dEll(x + (R() - 0.5) * w * 1.6, y + (R() - 0.5) * w * 1.6, s, s, R() < 0.5 ? 'rgba(120,110,85,.45)' : 'rgba(250,246,235,.6)'); }
    if (R() < 0.07) { const a = R() * 6.28, d = w * (0.85 + R() * 0.3), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d; dEll(sx + 1, sy + 2, 5 + R() * 3, 4 + R() * 2, 'rgba(60,55,40,.3)'); dEll(sx, sy, 4.5 + R() * 3, 3.5 + R() * 2, R() < 0.5 ? '#9d998e' : '#b2aea2'); }
    if (R() < 0.14) {
      const a = R() * 6.28, d = w * (0.88 + R() * 0.2), gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d, rx = 3 + R() * 5, ry = 2 + R() * 4, c2 = R() < 0.5 ? 'rgba(40,95,30,.75)' : 'rgba(140,190,90,.75)';
      decal(gx - 10, gy - 14, gx + 10, gy + 6, g => { g.fillStyle = 'rgba(93,143,69,.9)'; ell(g, gx, gy, rx, ry); g.strokeStyle = c2; g.lineWidth = 1.3; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 2, gy - 8); g.moveTo(gx + 2, gy); g.lineTo(gx + 3, gy - 10); g.stroke(); });
    }
  });
  // כיכרות
  OUT.plazas.forEach(p => {
    const RR = rng(Math.round(p.x + p.y));
    const col = p.kind === 'earth' ? ['#a8916b', '#c2ab84'] : p.kind === 'gravel' ? ['#b9b19c', '#d8d1bf'] : ['#a89c7e', '#c9bea2'];
    dEll(p.x, p.y, p.rx, p.ry, col[0]); dEll(p.x, p.y, p.rx - 7, p.ry - 7, col[1]);
    if (p.kind === 'gravel') decal(p.x - p.rx, p.y - p.ry, p.x + p.rx, p.y + p.ry, g => {
      g.strokeStyle = 'rgba(150,140,120,.35)'; g.lineWidth = 1.2;
      for (let k = 1; k < 7; k++) { g.beginPath(); g.ellipse(p.x, p.y, p.rx * k / 7.5, p.ry * k / 7.5, 0, 0, Math.PI * 2); g.stroke(); }
    });
    else for (let i = 0; i < p.rx * p.ry / 120; i++) { const a = RR() * 6.28, d = RR() * 0.92; dEll(p.x + Math.cos(a) * p.rx * d, p.y + Math.sin(a) * p.ry * d, 5 + RR() * 4, 4 + RR() * 3, p.kind === 'earth' ? 'rgba(120,100,70,.25)' : 'rgba(140,130,105,.55)'); }
  });
  // עלי כותרת מתחת לדובדבנים
  OUT.trees.forEach(t => {
    if (t[0] !== 'cherry') return;
    for (let i = 0; i < 40 * t[3]; i++) { const a = R() * 6.28, d = R() * 60 * t[3]; dEll(t[1] + Math.cos(a) * d + 8, t[2] + Math.sin(a) * d, 2, 2.6, R() < 0.5 ? 'rgba(251,207,232,.85)' : 'rgba(244,164,200,.8)'); }
  });
  // גבעולי דשא ופרחים
  const bare = (x, y, pad) => onPath(x, y, pad) || inWater(x, y, 0) || inPaddy(x, y, 8) || inPlaza(x, y, 4);
  for (let i = 0; i < 700 * A; i++) {
    const x = R() * OUT.w, y = R() * OUT.h;
    if (bare(x, y, 26)) continue;
    const c2 = R() < 0.5 ? 'rgba(40,95,30,.7)' : 'rgba(140,190,90,.7)';
    decal(x - 4, y - 12, x + 7, y + 2, g => { g.strokeStyle = c2; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 8); g.moveTo(x + 1.5, y); g.lineTo(x + 2.5, y - 10); g.moveTo(x + 3, y); g.lineTo(x + 5, y - 7); g.stroke(); });
  }
  const FL = ['#f8fafc', '#fde047', '#f9a8d4', '#c4b5fd'];
  for (let i = 0; i < 24 * A; i++) {
    const cx = R() * OUT.w, cy = R() * OUT.h, col = FL[Math.floor(R() * FL.length)];
    if (bare(cx, cy, 34)) continue;
    for (let j = 0; j < 7; j++) { const x = cx + (R() - 0.5) * 34, y = cy + (R() - 0.5) * 26; dEll(x, y, 1.8, 2.6, col); dEll(x, y, 0.7, 1, '#facc15'); }
  }
})();

const chunkCache = new Map();
let groundScale = 1;
function setGroundScale(s) { if (s !== groundScale) { groundScale = s; chunkCache.clear(); } }
function buildChunk(i) {
  const c = i % CCOLS, r = Math.floor(i / CCOLS), GS = groundScale;
  const cvx = document.createElement('canvas');
  cvx.width = Math.ceil(CH * GS); cvx.height = Math.ceil(CH * K * GS);
  const g = cvx.getContext('2d');
  g.setTransform(GS, 0, 0, GS * K, -c * CH * GS, -r * CH * K * GS);
  g.fillStyle = '#5d8f45'; g.fillRect(c * CH - 2, r * CH - 2, CH + 4, CH + 4);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const f of buckets[i]) f(g);
  return cvx;
}
// מצייר את הקרקע בתחום הנראה (בקואורדינטות מסך־עולם). בונה עד כמה חתיכות חדשות בפריים.
function drawGround(g, vx0, vy0, vx1, vy1) {
  const c0 = Math.max(0, Math.floor(vx0 / CH)), c1 = Math.min(CCOLS - 1, Math.floor(vx1 / CH));
  const r0 = Math.max(0, Math.floor(vy0 / (CH * K))), r1 = Math.min(CROWS - 1, Math.floor(vy1 / (CH * K)));
  let budget = chunkCache.size ? 2 : 99;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * CCOLS + c;
    let cvx = chunkCache.get(i);
    if (cvx) { chunkCache.delete(i); chunkCache.set(i, cvx); }
    else if (budget-- > 0) { cvx = buildChunk(i); chunkCache.set(i, cvx); }
    if (cvx) g.drawImage(cvx, c * CH, r * CH * K, CH + 0.7, CH * K + 0.7);
    else { g.fillStyle = '#5d8f45'; g.fillRect(c * CH, r * CH * K, CH + 0.7, CH * K + 0.7); }
  }
  while (chunkCache.size > 16) chunkCache.delete(chunkCache.keys().next().value);
}

// ============================================================
//   הערפל: מכסה כל מה שעוד לא ביקרו בו, ומתפזר בהדרגה סביב הנינג'ה
// ============================================================
const FC = 40, FCOLS = Math.ceil(OUT.w / FC), FROWS = Math.ceil(OUT.h / FC), FP = 8;
const fogSeen = new Uint8Array(FCOLS * FROWS);
const fogCv = document.createElement('canvas'); fogCv.width = FCOLS * FP; fogCv.height = FROWS * FP;
const fg = fogCv.getContext('2d');
const fogQueue = [];
let fogDirtyT = -1;
function fogErase(c, r, a) {
  const x = (c + 0.5) * FP, y = (r + 0.5) * FP, Rr = FP * 1.9;
  const gr = fg.createRadialGradient(x, y, 0, x, y, Rr);
  gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.5, 'rgba(0,0,0,' + a * 0.85 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  fg.globalCompositeOperation = 'destination-out'; fg.fillStyle = gr; fg.fillRect(x - Rr, y - Rr, Rr * 2, Rr * 2);
  fg.globalCompositeOperation = 'source-over';
}
(function fogInit() {
  fg.fillStyle = '#e7ece7'; fg.fillRect(0, 0, fogCv.width, fogCv.height);
  const R = rng(99);
  for (let i = 0; i < 1100; i++) {
    const x = R() * fogCv.width, y = R() * fogCv.height, r = 5 + R() * 22;
    const gr = fg.createRadialGradient(x, y, 0, x, y, r);
    const c = R() < 0.55 ? '255,255,255' : '200,210,204';
    gr.addColorStop(0, 'rgba(' + c + ',.45)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    fg.fillStyle = gr; fg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  let saved = '';
  try { saved = localStorage.getItem(KEY_FOG) || ''; } catch (e) {}
  for (let i = 0; i < fogSeen.length && i < saved.length; i++) if (saved.charCodeAt(i) === 49) fogSeen[i] = 1;
  for (let i = 0; i < fogSeen.length; i++) if (fogSeen[i]) { fogErase(i % FCOLS, Math.floor(i / FCOLS), 0.75); fogErase(i % FCOLS, Math.floor(i / FCOLS), 0.75); }
})();
function fogReveal(x, y, now) {
  const RV = 300, home = region(x, y), c0 = Math.max(0, Math.floor((x - RV) / FC)), c1 = Math.min(FCOLS - 1, Math.floor((x + RV) / FC));
  const r0 = Math.max(0, Math.floor((y - RV * 1.2) / FC)), r1 = Math.min(FROWS - 1, Math.floor((y + RV * 1.2) / FC));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * FCOLS + c;
    if (fogSeen[i]) continue;
    const dx = (c + 0.5) * FC - x, dy = ((r + 0.5) * FC - y) * 0.85;
    const d = Math.hypot(dx, dy) || 1, px = (c + 0.5) * FC - dx / d * 50, py = (r + 0.5) * FC - dy / 0.85 / d * 50;
    if (dx * dx + dy * dy < RV * RV && region(px, py) === home) { fogSeen[i] = 1; fogQueue.push({ c, r, n: 0 }); fogDirtyT = now; }
  }
  for (let k = fogQueue.length - 1; k >= 0; k--) { const q = fogQueue[k]; fogErase(q.c, q.r, 0.2); if (++q.n >= 10) fogQueue.splice(k, 1); }
  if (fogDirtyT > 0 && now - fogDirtyT > 1500) {
    fogDirtyT = -1;
    let s = ''; for (let i = 0; i < fogSeen.length; i++) s += fogSeen[i] ? '1' : '0';
    try { localStorage.setItem(KEY_FOG, s); } catch (e) {}
  }
}

// ============================================================
//   רשימת העצמים הזקופים (ממוינת לפי עומק פעם אחת)
// ============================================================
const STATIC = [];
(function buildStatic() {
  const add = (x0, x1, y, top, d) => STATIC.push({ x0, x1, y, top, d });
  OUT.houses.forEach(h => add(h.x - 40, h.x + h.w + 40, h.y + h.h, 150, (g, now) => drawHouse(g, h, now)));
  OUT.trees.forEach(t => add(t[1] - 50 * t[3], t[1] + 50 * t[3], t[2], 120 * t[3], g => (t[0] === 'cherry' ? drawCherry : drawPine)(g, t[1], t[2] * K, t[3])));
  OUT.stalks.forEach(s => add(s[0] - 30, s[0] + 30, s[1], 140 * s[2], (g, now) => drawStalk(g, [s[0], s[1] * K, s[2], s[3]], now)));
  OUT.bushes.forEach(b => add(b[0] - b[2], b[0] + b[2], b[1], b[2] * 1.4, g => drawBush(g, b)));
  OUT.rocks.forEach(r => add(r[0] - 20, r[0] + 20, r[1], 20, g => drawRock(g, r)));
  OUT.cliff.forEach(c => add(c[0] - c[2] * 1.3, c[0] + c[2] * 1.3, c[1], c[2] * 2, g => drawCliffRock(g, c[0], c[1] * K, c[2], c[3])));
  OUT.lanterns.forEach(l => add(l[0] - 20, l[0] + 20, l[1], 60, (g, now) => drawLantern(g, l, now)));
  OUT.toriis.forEach(t => add(t.x - t.half - 40, t.x + t.half + 40, t.y, 115, g => drawTorii(g, t)));
  add(OUT.well.x - 50, OUT.well.x + 50, OUT.well.y + 4, 100, g => drawWell(g, OUT.well));
  OUT.stalls.forEach(s => add(s.x - 64, s.x + 64, s.y, 140, (g, now) => drawStall(g, s, now)));
  OUT.jizo.forEach(j => add(j[0] - 12, j[0] + 12, j[1], 36, g => drawJizo(g, j[0], j[1] * K)));
  OUT.scarecrows.forEach(s => add(s[0] - 28, s[0] + 28, s[1], 64, (g, now) => drawScarecrow(g, s[0], s[1] * K, now)));
  add(OUT.shrine.x - 30, OUT.shrine.x + 30, OUT.shrine.y, 64, g => drawShrine(g, OUT.shrine.x, OUT.shrine.y * K));
  add(CLIFF_X, GATE_X - 46, WALL_Y, 60, g => drawWall(g, CLIFF_X, GATE_X - 46));
  add(GATE_X + 46, WALL_END + 50, WALL_Y, 60, g => drawWall(g, GATE_X + 46, WALL_END + 50));
  STATIC.sort((a, b) => a.y - b.y);
})();

buildSolid();
