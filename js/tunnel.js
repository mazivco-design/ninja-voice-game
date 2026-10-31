/* ninja-voice-game – tunnel.js
   CRAWL: גוש סלע ענק חוסם את הדרך, ומתחתיו מחילה בתוך האדמה (רואים את הקרקע בחתך).
   הנינג'ה נעצר בפתח (בלי פסילה) ומחכה. אומרים CRAWL – נשכב, זוחל במורד הפתח, לאורך המחילה מתחת לסלע, ועולה בצד השני.
   אחרי שתיקה ארוכה המשחק אומר CRAWL בקול.
   (סוג המכשול נשאר 'bramble' – כדי שהמסע, הניקוד והשלבים לא ישתנו)
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const TUN = { ramp: 19, len: 38, depth: 16, h: 8.5, rockH: 34, hint: 3.5, hintEvery: 6 };
function tunnelW() { return TUN.ramp * 2 + TUN.len; }
// רצפת המחילה בנקודה x (מתחת ל-GROUND = מספר גדול יותר)
function tunnelFloor(o, x) {
  const r = x - o.x, w = o.w, ease = q => q * q * (3 - 2 * q);
  if (r <= 0 || r >= w) return GROUND;
  if (r < TUN.ramp) return GROUND + TUN.depth * ease(r / TUN.ramp);
  if (r > w - TUN.ramp) return GROUND + TUN.depth * ease((w - r) / TUN.ramp);
  return GROUND + TUN.depth;
}
function tunnelSlope(o, x) { return Math.atan2(tunnelFloor(o, x + 1.5) - tunnelFloor(o, x - 1.5), 3); }
function tunnelRock(o) { return { l: o.x + TUN.ramp - 3, r: o.x + o.w - TUN.ramp + 3 }; }   // הסלע יושב מעל המחילה

let tunnelWait = null;   // { o, idle, hinted } – עומדים בפתח ומחכים ל-CRAWL
function tunnelHere() { const cx = PLAYER.x + 4; return obstacles.find(o => o.type === 'bramble' && o.inTunnel && cx > o.x - 2 && cx < o.x + o.w + 2); }
// העולם עוצר בפתח עד שאומרים CRAWL
function tunnelHolds() { return !!tunnelWait; }

function tunnelUpdate(dt, pb) {
  for (const o of obstacles) {
    if (o.type !== 'bramble' || o.passed) continue;
    const atMouth = pb.r >= o.x - 0.3 && pb.l < o.x + o.w;
    if (!o.inTunnel && act.crawlWant > 0 && pb.r >= o.x - 8 && pb.l < o.x + o.w && py <= 0.5) {   // CRAWL ליד הפתח – נכנסים
      o.inTunnel = true; tunnelWait = null;
    }
    if (o.inTunnel) {
      act.crawl = Math.max(act.crawl, 0.25); duckT = 0;
      if (PLAYER.x > o.x + o.w) { o.inTunnel = false; act.crawl = 0; cleared(o); }          // יצא מהצד השני – קם ורץ
      continue;
    }
    if (atMouth && !tunnelWait) {                                               // הגיע לפתח בלי CRAWL – נעצר ומחכה
      const over = pb.r - o.x; if (over > 0) ropeShiftBy(-over);
      tunnelWait = { o, idle: 0, hinted: 0 };
    }
  }
  if (tunnelWait) {
    const W8 = tunnelWait;
    if (!obstacles.includes(W8.o) || W8.o.inTunnel || W8.o.passed) { tunnelWait = null; return; }
    W8.idle += dt;
    if (W8.idle >= TUN.hint + W8.hinted * TUN.hintEvery && state === 'play') { W8.hinted++; sayWords(['crawl'], 1.6); }
  }
}

/* ---------- ציור ---------- */
function drawTunnel(o) {
  const x = o.x, w = o.w, D = TUN.depth, H = TUN.h, now = performance.now() / 1000;
  const G = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  const floor = xx => tunnelFloor(o, xx), roof = xx => tunnelFloor(o, xx) - H;
  // חלל המחילה: מהפתח למטה, לאורך, ולמעלה ביציאה
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x - 1, GROUND - 0.2);
  for (let k = 0; k <= w; k += 1) ctx.lineTo(x + k, Math.max(GROUND - 0.2, roof(x + k)));
  ctx.lineTo(x + w + 1, GROUND - 0.2);
  for (let k = w; k >= 0; k -= 1) ctx.lineTo(x + k, floor(x + k));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, GROUND - 2, 0, GROUND + D);
  g.addColorStop(0, '#5b4433'); g.addColorStop(1, '#2a1d14');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  const dark = ctx.createLinearGradient(x, 0, x + w, 0);                       // באמצע חשוך יותר
  dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(0.35, 'rgba(10,6,3,.45)'); dark.addColorStop(0.65, 'rgba(10,6,3,.45)'); dark.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dark; ctx.fillRect(x, GROUND - 3, w, D + 3);
  ctx.restore();
  // קווי המחילה: קרקעית ותקרה, עם אבנים קטנות ושורשים שמשתלשלים מהתקרה
  ctx.strokeStyle = 'rgba(20,12,6,.55)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); for (let k = 0; k <= w; k += 1) ctx.lineTo(x + k, floor(x + k)); ctx.stroke();
  ctx.beginPath(); let on = false;
  for (let k = 0; k <= w; k += 1) { const y = roof(x + k); if (y > GROUND + 0.2) { on ? ctx.lineTo(x + k, y) : ctx.moveTo(x + k, y); on = true; } else on = false; }
  ctx.stroke();
  ctx.strokeStyle = '#7c5a3a'; ctx.lineWidth = 0.35;
  for (let k = TUN.ramp + 2; k < w - TUN.ramp - 1; k += 5 + hash(k) * 4) {
    const y = roof(x + k), L = 1.5 + hash(k * 2.1) * 2.2, sw = Math.sin(now * 1.3 + k) * 0.25;
    ctx.beginPath(); ctx.moveTo(x + k, y); ctx.quadraticCurveTo(x + k + 0.6 + sw, y + L * 0.5, x + k + sw, y + L); ctx.stroke();
  }
  for (let k = 3; k < w - 3; k += 4 + hash(k * 1.7) * 5) {                       // חלוקים על הרצפה
    ctx.fillStyle = hash(k) > 0.5 ? '#6b5a49' : '#4a3b2e';
    ctx.beginPath(); ctx.ellipse(x + k, floor(x + k) - 0.4, 0.8 + hash(k * 3) * 0.6, 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
  // אבנים קטנות בתוך האדמה סביב המחילה – נראה כמו חתך
  for (let k = 0; k < 9; k++) {
    const sx = x + 3 + hash(k * 4.3 + 1) * (w - 6), sy = GROUND + D + 2.5 + hash(k * 7.1) * 6;
    ctx.fillStyle = 'rgba(70,52,38,.55)'; ctx.beginPath(); ctx.ellipse(sx, sy, 1 + hash(k) * 1.2, 0.6 + hash(k * 2) * 0.5, hash(k * 5), 0, Math.PI * 2); ctx.fill();
  }
  // שפת הדשא נקטעת בפתחים
  if (G) {
    ctx.fillStyle = G.grass ? G.grass[1] : WORLDS[world].top;
    ctx.fillRect(x - 1.5, GROUND - 0.6, 1.5, 1.4); ctx.fillRect(x + w, GROUND - 0.6, 1.5, 1.4);
  }
  drawTunnelRock(o);
  if (!o.passed && !o.inTunnel) label('CRAWL', x + TUN.ramp / 2, GROUND - TUN.rockH - 6, 4, '#fde047', '#1e293b');
}
function drawTunnelRock(o) {                                                    // גוש סלע ענק וזוויתי (פאות ישרות), נשען על הקרקע מעל המחילה
  const R = tunnelRock(o), l = R.l, r = R.r, w = r - l, top = GROUND - TUN.rockH;
  const X = k => l + w * k, poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); };
  // נקודות המתאר: צדדים כמעט ישרים, ראש שבור לכמה פאות
  const A = [l - 0.5, GROUND], B = [l - 2, GROUND - 13], C = [X(0.06), GROUND - 27], D = [X(0.3), top + 1.5], E = [X(0.62), top - 0.5],
        F = [X(0.86), top + 5], G = [r + 1.5, GROUND - 17], H = [r, GROUND];
  const M = [X(0.42), GROUND - 21], N = [X(0.7), GROUND - 16], Q = [X(0.25), GROUND - 9];      // נקודות פנימיות – קווי השבר בין הפאות
  ctx.save();
  poly([A, B, C, D, E, F, G, H], '#8a8074');                                    // גוף הסלע
  poly([C, D, E, M], '#b3a99b');                                                // הפאה העליונה – מוארת
  poly([B, C, M, Q], '#9d9386');                                                // פאה שמאלית
  poly([E, F, G, N, M], '#736a5f');                                             // פאה ימנית – בצל
  poly([G, H, [X(0.62), GROUND], N], '#5f574d');                                // תחתית ימין – הכי כהה
  poly([A, Q, M, N, [X(0.62), GROUND]], '#857b6f');                             // החזית
  ctx.strokeStyle = 'rgba(40,34,28,.35)'; ctx.lineWidth = 0.35; ctx.lineJoin = 'round';   // קווי שבר בין הפאות
  ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.lineTo(M[0], M[1]); ctx.lineTo(E[0], E[1]); ctx.moveTo(M[0], M[1]); ctx.lineTo(N[0], N[1]); ctx.lineTo(G[0], G[1]);
  ctx.moveTo(B[0], B[1]); ctx.lineTo(Q[0], Q[1]); ctx.lineTo(M[0], M[1]); ctx.moveTo(N[0], N[1]); ctx.lineTo(X(0.62), GROUND); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 0.45;                 // סדקים
  ctx.beginPath(); ctx.moveTo(X(0.5), GROUND - 18); ctx.lineTo(X(0.47), GROUND - 12); ctx.lineTo(X(0.52), GROUND - 6);
  ctx.moveTo(X(0.15), GROUND - 20); ctx.lineTo(X(0.2), GROUND - 15); ctx.stroke();
  ctx.fillStyle = '#65a30d';                                                    // טחב בשקעים של הפאה העליונה
  for (const [k, dy, rw] of [[0.36, 2.2, 2.4], [0.5, 1.2, 1.8], [0.7, 3.4, 1.5]]) { ctx.beginPath(); ctx.ellipse(X(k), top + dy, rw, 0.7, -0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(l - 0.5, GROUND - 0.6, w + 1, 0.8);   // קו מגע עם הקרקע
  ctx.restore();
}
