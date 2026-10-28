/* village/js/room.js – פנים הבית (חדר יפני בפרספקטיבה). */

// ============================================================
//   בתוך הבית – חדר יפני קטן, במבט לתוך "קופסה" עם פרספקטיבה:
//   מה שרחוק (ליד הקיר האחורי) מצטמצם, וכך רואים את קירות הצד מבפנים.
// ============================================================
const BW = 132;     // גובה הקירות (ביחידות של קדמת החדר)
const ROOM = {
  w: 480, h: 342, cell: 10, D: 320, S0: 0.74,
  start: { x: 240, y: 286, dir: 'up' },
  table: { x: 170, y: 150, rx: 50, ry: 34 },
  futon: { x: 330, y: 22, w: 122, h: 92 },
  cushions: [[170, 104], [108, 152], [232, 152], [170, 198]],
  jars: [[428, 258, 13], [454, 282, 10]],
  lamp: [44, 236],
  elder: { x: 262, y: 70, phase: 0 },
  exit: { x: 212, y: 304, w: 56, h: 38 }
};
function rS(y) { return ROOM.S0 + (1 - ROOM.S0) * Math.max(0, Math.min(1.1, y / ROOM.D)); }
function rP(x, y) { const c = ROOM.w / 2; return [c + (x - c) * rS(y), y * K]; }
function rUnP(X, Y) { const y = Y / K, c = ROOM.w / 2; return [c + (X - c) / rS(y), y]; }
function rPoly(g, pts) { g.beginPath(); pts.forEach((p, i) => { const [X, Y] = rP(p[0], p[1]); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); }
function rQuad(g, x, y, w, h) { rPoly(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function at(g, x, y, fn) { const [X, Y] = rP(x, y), s = rS(y); g.save(); g.translate(X, Y); g.scale(s, s); fn(g); g.restore(); }

ROOM.blocked = function (x, y) {
  if (x < 6 + NR || x > this.w - 6 - NR || y < 4 + NR) return true;
  if (y > 306 && !(x > 218 && x < 262)) return true;
  if (y > 340) return true;
  { const t = this.table, dx = (x - t.x) / (t.rx + NR), dy = (y - t.y) / (t.ry + NR); if (dx * dx + dy * dy < 1) return true; }
  { const f = this.futon; if (x > f.x - NR && x < f.x + f.w + NR && y > f.y - NR && y < f.y + f.h + NR) return true; }
  const hitC = (cx, cy, r) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r; };
  for (const j of this.jars) if (hitC(j[0], j[1], j[2] + NR)) return true;
  if (hitC(this.lamp[0], this.lamp[1], 11 + NR)) return true;
  if (hitC(this.elder.x, this.elder.y, 11 + NR)) return true;
  return false;
};

function drawRoomFloor(g) {
  const W = ROOM.w, D = ROOM.D;
  g.save(); rPoly(g, [[0, 0], [W, 0], [W, D], [0, D]]); g.clip();
  g.fillStyle = '#c9bd84'; g.fillRect(-60, -10, W + 120, D * K + 20);
  // מחצלות טטאמי עם פס כהה בצדדים הארוכים
  const MW = 128, MH = 64;
  for (let row = 0; row < 5; row++) {
    const off = row % 2 ? -64 : 0;
    for (let x = off; x < W; x += MW) {
      const y = row * MH;
      g.fillStyle = (row + Math.round((x - off) / MW)) % 2 ? '#cdc188' : '#c4b77d'; rQuad(g, x + 1, y + 1, MW - 2, MH - 2); g.fill();
      g.strokeStyle = 'rgba(120,110,60,.2)'; g.lineWidth = 0.8;
      for (let k = 6; k < MH; k += 5) { const A = rP(x + 1, y + k), B = rP(x + MW - 1, y + k); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }
      g.fillStyle = '#3f4a2a'; rQuad(g, x, y, MW, 3); g.fill(); rQuad(g, x, y + MH - 3, MW, 3); g.fill();
      g.fillStyle = 'rgba(60,50,30,.35)'; rQuad(g, x, y, 1.5, MH); g.fill();
    }
  }
  // כריות ישיבה
  ROOM.cushions.forEach(([x, y]) => {
    g.fillStyle = 'rgba(40,20,10,.2)'; rQuad(g, x - 18, y - 13, 40, 30); g.fill();
    g.fillStyle = '#7e3a6b'; rQuad(g, x - 20, y - 15, 40, 30); g.fill();
    g.fillStyle = '#9b4f86'; rQuad(g, x - 15, y - 11, 30, 22); g.fill();
    const [X, Y] = rP(x, y); g.fillStyle = '#fbbf24'; ell(g, X, Y, 2.2, 1.5);
  });
  // פוטון
  const f = ROOM.futon;
  g.fillStyle = 'rgba(40,20,10,.22)'; rQuad(g, f.x + 5, f.y + 5, f.w, f.h); g.fill();
  g.fillStyle = '#f3efe6'; rQuad(g, f.x, f.y, f.w, f.h); g.fill();
  g.fillStyle = '#ffffff'; rQuad(g, f.x + 30, f.y + 7, f.w - 60, 20); g.fill();
  g.fillStyle = '#2d4a8a'; rQuad(g, f.x + 4, f.y + 34, f.w - 8, f.h - 38); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = f.x + 16; x < f.x + f.w - 8; x += 22) { const [X, Y] = rP(x, f.y + 62); ell(g, X, Y, 3.6, 2.4); }
  // אור חם ליד הקיר האחורי, צל בפינות
  let gr = g.createLinearGradient(0, 0, 0, D * K);
  gr.addColorStop(0, 'rgba(255,225,160,.2)'); gr.addColorStop(0.55, 'rgba(255,225,160,0)'); gr.addColorStop(1, 'rgba(40,20,5,.12)');
  g.fillStyle = gr; g.fillRect(-60, 0, W + 120, D * K);
  g.fillStyle = 'rgba(0,0,0,.14)'; rQuad(g, 0, 0, W, 9); g.fill();
  g.fillStyle = 'rgba(0,0,0,.1)'; rQuad(g, 0, 0, 10, D); g.fill(); rQuad(g, W - 10, 0, 10, D); g.fill();
  g.restore();
  // סף עץ בקדמת החדר, ופתח עם אבן כניסה וסנדלים
  g.fillStyle = '#6b4a2b'; rQuad(g, 0, D, 214, 7); g.fill(); rQuad(g, 266, D, W - 266, 7); g.fill();
  const yA = rP(0, D + 7)[1];
  g.fillStyle = '#3a2a1e'; g.fillRect(rP(0, D + 7)[0], yA, rP(214, D + 7)[0] - rP(0, D + 7)[0], 9); g.fillRect(rP(266, D + 7)[0], yA, rP(W, D + 7)[0] - rP(266, D + 7)[0], 9);
  g.fillStyle = '#8f8b80'; rQuad(g, 210, D + 2, 60, 24); g.fill();
  g.fillStyle = '#a7a397'; rQuad(g, 212, D + 3, 56, 7); g.fill();
  [[228, D + 14], [246, D + 15]].forEach(([x, y]) => { const [X, Y] = rP(x, y); g.fillStyle = '#7a5232'; rr(g, X - 3.5, Y - 6, 7, 12, 3); g.fill(); g.fillStyle = '#b91c1c'; g.fillRect(X - 3, Y - 3, 6, 1.4); });
}
function drawRoomBack(g, now) {     // הקיר האחורי, בקואורדינטות מקומיות: רוחב ROOM.w, גובה BW
  const W = ROOM.w, top = -BW;
  g.fillStyle = '#4a3527'; g.fillRect(0, top, W, BW);
  // טוקונומה (גומחה): מגילה וכד פרחים
  g.fillStyle = '#3a2a1e'; g.fillRect(24, top + 14, 150, BW - 14);
  g.fillStyle = '#d8cdb2'; g.fillRect(32, top + 20, 134, BW - 26);
  g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(32, top + 20, 134, 12);
  g.fillStyle = '#6b4a2b'; g.fillRect(26, -12, 146, 12);
  g.fillStyle = '#f5f0e2'; g.fillRect(80, top + 28, 36, 76);
  g.fillStyle = '#5a3a1f'; g.fillRect(76, top + 26, 44, 4); g.fillRect(76, top + 102, 44, 4);
  g.strokeStyle = '#334155'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(85, top + 86); g.lineTo(93, top + 62); g.lineTo(99, top + 74); g.lineTo(105, top + 54); g.lineTo(111, top + 86); g.stroke();
  g.fillStyle = '#dc2626'; circ(g, 103, top + 42, 4);
  g.fillStyle = '#1e3a5f'; rr(g, 136, top + 88, 16, 24, 6); g.fill();
  g.strokeStyle = '#4d7c0f'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(144, top + 88); g.quadraticCurveTo(140, top + 68, 132, top + 62); g.moveTo(144, top + 88); g.quadraticCurveTo(150, top + 66, 158, top + 60); g.stroke();
  g.fillStyle = '#f9a8d4'; circ(g, 132, top + 62, 3.2); circ(g, 158, top + 60, 3.2); circ(g, 146, top + 70, 2.6);
  // קיר שוג'י מואר עם צללי במבוק
  const sx = 192, sw = W - 204, n = 4, pw = sw / n;
  for (let i = 0; i < n; i++) {
    const px = sx + i * pw + 3;
    g.fillStyle = '#f4ecd6'; g.fillRect(px, top + 22, pw - 6, BW - 34);
    g.fillStyle = 'rgba(255,214,140,.3)'; g.fillRect(px, top + 22 + (BW - 34) * 0.5, pw - 6, (BW - 34) * 0.5);
    g.fillStyle = 'rgba(80,110,60,.18)';
    for (let k = 0; k < 2; k++) { const bx = px + 12 + k * 30 + Math.sin(now / 1500 + i + k) * 2; g.fillRect(bx, top + 22, 3, BW - 34); }
    g.fillStyle = '#b8a888';
    for (let k = 1; k < 3; k++) g.fillRect(px + (pw - 6) * k / 3 - 0.6, top + 22, 1.2, BW - 34);
    for (let k = 1; k < 5; k++) g.fillRect(px, top + 22 + (BW - 34) * k / 5 - 0.6, pw - 6, 1.2);
  }
  g.fillStyle = '#3a2a1e'; g.fillRect(0, top, W, 12); g.fillRect(sx - 4, top + 12, 6, BW - 12);
  for (let i = 1; i < n; i++) g.fillRect(sx + i * pw - 3, top + 12, 6, BW - 12);
  g.fillStyle = '#2a1d14'; g.fillRect(0, -6, W, 6);
}
function drawRoomSides(g) {     // קירות הצד מבפנים – מרובעים מוטים בפרספקטיבה
  const W = ROOM.w, D = ROOM.D, s0 = ROOM.S0;
  [0, W].forEach((x, side) => {
    const [bx, by] = rP(x, 0), [fx, fy] = rP(x, D + 7);
    const fs = rS(D + 7), btop = by - BW * s0, ftop = fy - BW * fs;
    const q = (t, zf) => [bx + (fx - bx) * t, (by + (fy - by) * t) - BW * (s0 + (fs - s0) * t) * zf];
    g.fillStyle = side ? '#4f3929' : '#5a4130'; poly(g, [[bx, by], [bx, btop], [fx, ftop], [fx, fy]]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
    for (let t = 0.07; t < 1; t += 0.07) { const A = q(t, 0), B = q(t, 1); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }
    // חלון שוג'י בקיר הצד
    g.fillStyle = '#3a2a1e'; poly(g, [q(0.28, 0.32), q(0.66, 0.32), q(0.66, 0.84), q(0.28, 0.84)]); g.fill();
    g.fillStyle = '#f1e8cf'; poly(g, [q(0.3, 0.35), q(0.64, 0.35), q(0.64, 0.81), q(0.3, 0.81)]); g.fill();
    g.fillStyle = 'rgba(255,214,140,.28)'; poly(g, [q(0.3, 0.35), q(0.64, 0.35), q(0.64, 0.55), q(0.3, 0.55)]); g.fill();
    g.strokeStyle = '#b8a888'; g.lineWidth = 1.1;
    [0.41, 0.53].forEach(t => { const A = q(t, 0.35), B = q(t, 0.81); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); });
    [0.5, 0.66].forEach(z => { const A = q(0.3, z), B = q(0.64, z); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); });
    // פס תחתון, קורה עליונה ועמוד בפינה האחורית
    g.strokeStyle = '#3a2a1e'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, by - 2); g.lineTo(fx, fy - 3); g.stroke();
    g.strokeStyle = '#2a1d14'; g.lineWidth = 7; g.beginPath(); g.moveTo(bx, btop); g.lineTo(fx, ftop); g.stroke();
    g.fillStyle = '#2a1d14'; g.fillRect(bx - 3, btop, 6, by - btop);
    // עמוד חזיתי (קצה הקיר החתוך)
    g.fillStyle = '#2a1d14'; g.fillRect(side ? fx - 2 : fx - 10, ftop - 4, 12, fy - ftop + 14);
  });
  // קורה בראש הקיר האחורי
  const L = rP(0, 0), R2 = rP(ROOM.w, 0);
  g.fillStyle = '#2a1d14'; g.fillRect(L[0] - 3, L[1] - BW * s0 - 4, R2[0] - L[0] + 6, 7);
}
function drawTable(g) {     // מקומי, מרכז השולחן ב־(0,0)
  const t = ROOM.table, rx = t.rx, ry = t.ry * K, lift = 15;
  g.fillStyle = 'rgba(40,20,5,.25)'; ell(g, 6, 4, rx, ry);
  g.fillStyle = '#3a2a1e'; g.fillRect(-rx * 0.6, -lift + 2, 6, lift); g.fillRect(rx * 0.6 - 6, -lift + 2, 6, lift);
  g.fillStyle = '#5a3a24'; ell(g, 0, -lift + 4, rx, ry);
  g.fillStyle = '#7a5234'; ell(g, 0, -lift, rx, ry);
  g.fillStyle = 'rgba(255,255,255,.08)'; ell(g, -rx * 0.2, -lift - ry * 0.3, rx * 0.6, ry * 0.4);
  g.fillStyle = '#2f3b2e'; ell(g, -10, -lift - 8, 10, 8.5); g.fillRect(-14, -lift - 18, 8, 4);
  g.strokeStyle = '#1f2937'; g.lineWidth = 1.6; g.beginPath(); g.arc(-10, -lift - 13, 8.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  [[14, -4], [25, 2]].forEach(([dx, dy]) => { g.fillStyle = '#e7e5e4'; g.fillRect(dx - 4, -lift + dy - 8, 8, 7); g.fillStyle = '#9ca3af'; ell(g, dx, -lift + dy - 8, 4, 1.6); });
}
function drawJar(g, s) {    // מקומי
  g.fillStyle = 'rgba(40,20,5,.28)'; ell(g, 4, 1, s, s * 0.4);
  g.fillStyle = '#7c4a2a'; ell(g, 0, -s * 0.95, s, s * 1.05);
  g.fillStyle = '#9a5f36'; ell(g, -s * 0.3, -s * 1.15, s * 0.35, s * 0.55);
  g.fillStyle = '#3b6e8f'; g.fillRect(-s, -s * 1.1, s * 2, 2.4);
  g.fillStyle = '#6a3c20'; ell(g, 0, -s * 1.9, s * 0.5, s * 0.22);
  g.fillStyle = '#2a170c'; ell(g, 0, -s * 1.9, s * 0.32, s * 0.12);
}
function drawLamp(g, now) {   // מקומי
  const fl = 0.85 + Math.sin(now / 200) * 0.05;
  g.fillStyle = 'rgba(255,214,140,' + (0.2 * fl) + ')'; circ(g, 0, -30, 34);
  g.fillStyle = 'rgba(40,20,5,.25)'; ell(g, 4, 1, 12, 4);
  g.fillStyle = '#3a2a1e'; g.fillRect(-10, -6, 20, 6); g.fillRect(-10, -50, 3, 46); g.fillRect(7, -50, 3, 46);
  g.fillStyle = 'rgba(255,236,190,' + fl + ')'; g.fillRect(-8, -46, 16, 32);
  g.fillStyle = '#3a2a1e'; g.fillRect(-10, -52, 20, 4); g.fillRect(-10, -30, 20, 2);
}

