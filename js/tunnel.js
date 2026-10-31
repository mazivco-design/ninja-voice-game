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
function drawTunnelRock(o) {                                                    // גוש סלע ענק, נשען על הקרקע מעל המחילה
  const R = tunnelRock(o), l = R.l, r = R.r, w = r - l, top = GROUND - TUN.rockH;
  const P = [[l, GROUND], [l - 1.5, GROUND - 8], [l + 1, GROUND - 19], [l + w * 0.12, GROUND - 28], [l + w * 0.32, top + 1], [l + w * 0.55, top - 1],
             [l + w * 0.78, top + 2.5], [r - 1, GROUND - 24], [r + 1.5, GROUND - 12], [r, GROUND]];
  ctx.save();
  const g = ctx.createLinearGradient(l, top, r, GROUND);
  g.addColorStop(0, '#b4aa9c'); g.addColorStop(0.5, '#8d8376'); g.addColorStop(1, '#5f574d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) { const [px, py2] = P[i], [qx, qy] = P[i - 1]; ctx.quadraticCurveTo(qx, qy, (px + qx) / 2, (py2 + qy) / 2); }
  ctx.lineTo(r, GROUND); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)';                                      // פאה מוארת
  ctx.beginPath(); ctx.moveTo(l + w * 0.2, GROUND - 26); ctx.lineTo(l + w * 0.42, top + 2); ctx.lineTo(l + w * 0.5, GROUND - 20); ctx.lineTo(l + w * 0.3, GROUND - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.16)';                                            // צל בצד ימין
  ctx.beginPath(); ctx.moveTo(l + w * 0.68, top + 3); ctx.lineTo(r - 0.5, GROUND - 22); ctx.lineTo(r + 1, GROUND - 6); ctx.lineTo(l + w * 0.72, GROUND - 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,34,28,.45)'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';   // סדקים
  ctx.beginPath();
  ctx.moveTo(l + w * 0.55, top + 1); ctx.lineTo(l + w * 0.5, GROUND - 22); ctx.lineTo(l + w * 0.58, GROUND - 15); ctx.lineTo(l + w * 0.54, GROUND - 7);
  ctx.moveTo(l + w * 0.18, GROUND - 14); ctx.lineTo(l + w * 0.27, GROUND - 9);
  ctx.moveTo(l + w * 0.8, GROUND - 18); ctx.lineTo(l + w * 0.72, GROUND - 13);
  ctx.stroke();
  ctx.fillStyle = '#65a30d';                                                    // קצת טחב למעלה
  for (let k = 0; k < 5; k++) { const mx = l + w * (0.25 + k * 0.12), my = top + 1.5 + Math.abs(k - 2) * 1.2; ctx.beginPath(); ctx.ellipse(mx, my, 2.2, 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(l, GROUND - 0.6, w, 0.8);    // קו מגע עם הקרקע
  ctx.restore();
}
