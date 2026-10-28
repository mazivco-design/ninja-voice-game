/* ============================================================
   village/js/core.js – עזרים משותפים והדמויות (נינג'ה ותושבים).
   סדר הטעינה ב־index.html: core → world → room → main.
   הכפר במבט מוטה: הקרקע "שוכבת" (y מוכפל ב־K), העצמים עומדים זקופים.
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
const GUARD_LOOK = { body: '#2f2a44', limb: '#241f36', limbBack: '#17131f', skin: '#f1c7a1', eyes: '#000', accent: '#b45309', band: false, hat: '#c9a85a', spear: true };
const MERCHANT_LOOK = { body: '#0f766e', limb: '#0b5e58', limbBack: '#084540', skin: '#f1c7a1', eyes: '#1f2937', accent: '#f59e0b', band: false };
const MONK_LOOK = { body: '#c2410c', limb: '#9a3412', limbBack: '#7c2d12', skin: '#f1c7a1', eyes: '#1f2937', accent: '#fbbf24', band: false };
const FARMER_LOOK = { body: '#4d7c0f', limb: '#3f6212', limbBack: '#365314', skin: '#f1c7a1', eyes: '#1f2937', accent: '#a16207', band: false, hat: '#d9b968' };
const FISHER_LOOK = { body: '#475569', limb: '#334155', limbBack: '#1e293b', skin: '#f1c7a1', eyes: '#1f2937', accent: '#0ea5e9', band: false, hat: '#d9b968' };
const VILLAGER_LOOK = { body: '#9d174d', limb: '#831843', limbBack: '#500724', skin: '#fcd9b6', eyes: '#1f2937', accent: '#fde68a', band: false };
const VILLAGER2_LOOK = { body: '#1d4ed8', limb: '#1e40af', limbBack: '#172554', skin: '#fcd9b6', eyes: '#1f2937', accent: '#fef3c7', band: false };

// lift = כמה הדמות באוויר (קפיצה); הצל נשאר על הקרקע
function drawChar(g, x, y, dir, phase, walking, L, lift) {
  lift = lift || 0;
  const step = walking && !lift ? Math.sin(phase) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * 1.4 : Math.sin(phase * 0.5) * 0.4;
  const sh = Math.max(0.5, 1 - lift / 40);
  g.fillStyle = 'rgba(20,30,10,.28)'; ell(g, x, y, 11 * sh, 4.2 * sh);
  g.save(); g.translate(x, y - bob - lift);
  if (dir === 'left') g.scale(-1, 1);
  if (L.spear && dir === 'up') drawSpear(g);
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
  if (L.spear && dir !== 'up') drawSpear(g);
  g.restore();
}
function drawSpear(g) {
  g.fillStyle = '#5a3a1f'; g.fillRect(11, -54, 2.2, 58);
  g.fillStyle = '#cbd5e1'; g.beginPath(); g.moveTo(12.1, -66); g.lineTo(15.2, -54); g.lineTo(9, -54); g.closePath(); g.fill();
  g.fillStyle = '#b91c1c'; g.fillRect(9.5, -54, 5.2, 2.4);
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

