/* ninja-voice-game – heights.js
   שביל הגבהים (שלב בפיתוח, 2026-11-24): מסלול שעולה ויורד, והמצלמה עולה ויורדת עם הנינג'ה (camLift ב-draw.js).
   CLIMB בסולם אל גג – JUMP מגג לגג גבוה יותר – CLIMB בגפן אל ראש מגדל – SWING על חבל מעל התהום ונוחתים על מדף נמוך –
   JUMP למטה אל פטרייה ענקית שמקפיצה עד ראש צוק גבוה מאוד – OPEN: מצנח, ריחוף ארוך אל הקרקע ואיסוף מטבעות באוויר.
   בלי פגיעות ובלי לבבות. אחרי שתיקה המשחק אומר את המילה.
   גבהים בקובץ: h חיובי למעלה מהקרקע (על המסך: GROUND - h).
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const HT = {
  e0: 10, w: 230,
  bldA: [18, 40, 22],  ladder: 16.4,                 // בית A: x מ-18 עד 40, גג בגובה 22; סולם בצד שמאל
  bldB: [50, 66, 30],                                 // בית B: גג בגובה 30
  tower: [66, 77, 60], vine: 65.4,                    // מגדל אבן עד 60, גפן על הקיר השמאלי
  pivot: [94, 98], ropeL: 30,                          // ענף העץ שממנו תלוי החבל
  ledge: [106, 119, 40],                              // מדף סלע
  mush: 131,                                          // פטרייה ענקית על הקרקע
  cliff: [141, 156, 78],                              // צוק גבוה מאוד
  land: 205, climbV: 13, walkV: 13, hint: 3.5, hintEvery: 5, coins: 6
};
const HT_CHIP = { climb: 'CLIMB', jump: 'JUMP', swing: 'SWING', open: 'OPEN' };
let htS = null;
const htE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const htL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function htNX() { return PLAYER.x + 4; }
function htSetup(o) { o.w = HT.w; }
function htStart(o) {
  const coins = [];
  for (let k = 0; k < 7; k++) { const kk = (k + 0.5) / 7; coins.push({ x: htL(HT.cliff[1] + 4, HT.land - 6, kk), h: htL(HT.cliff[2] - 6, 8, kk) + Math.sin(k * 1.7) * 3, got: 0 }); }   // מטבעות בדרך של המצנח
  coins.push({ x: 30, h: HT.bldA[2] + 3, got: 0 }, { x: 59, h: HT.bldB[2] + 3, got: 0 }, { x: 112, h: HT.ledge[2] + 3, got: 0 });
  htS = { o, p: 'start', t: 0, idle: 0, hinted: 0, held: null, nx: HT.e0, h: 0, rope: -0.62, chute: 0, squash: 0, coins, chipOk: 0, chipW: null, swayT: 0 };
}
function htP(p) { const S = htS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }
const HT_WAIT = { start: 'climb', edgeA: 'jump', baseT: 'climb', edgeT: 'swing', edgeL: 'jump', edgeC: 'open' };

/* ---------- העדכון ---------- */
function htUpdate(dt, pb) {
  if (!htS) {
    const o = obstacles.find(o => o.type === 'heights' && !o.passed && htNX() >= o.x + HT.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    htStart(o); return;
  }
  const S = htS, o = S.o; S.t += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.squash > 0) S.squash -= dt;
  if (!obstacles.includes(o)) { htS = null; return; }
  const demo = state !== 'play';
  const want = HT_WAIT[S.p];
  if (demo && want && S.t > 0.7) { command(want, 'demo'); speak(want); }
  if (want && S.held === want) { S.held = null; htGo(); }
  const walkTo = (x, next) => { S.nx = Math.min(x, S.nx + HT.walkV * dt); if (S.nx >= x) htP(next); };
  switch (S.p) {
    case 'climbA': { const d = HT.bldA[2]; S.nx = HT.ladder - 1.6; S.h = Math.min(d, S.t * HT.climbV); if (S.h >= d) htP('overA'); break; }
    case 'overA': htHop(HT.ladder - 1.6, HT.bldA[2], HT.bldA[0] + 3, HT.bldA[2], 0.45, 2.5, 'walkA'); break;
    case 'walkA': walkTo(HT.bldA[1] - 2.5, 'edgeA'); break;
    case 'jumpA': htHop(HT.bldA[1] - 2.5, HT.bldA[2], HT.bldB[0] + 3, HT.bldB[2], 0.8, 11, 'walkB'); break;
    case 'walkB': walkTo(HT.vine - 1.8, 'baseT'); break;
    case 'climbT': { const d = HT.tower[2]; S.nx = HT.vine - 1.6; S.h = Math.min(d, HT.bldB[2] + S.t * HT.climbV); if (S.h >= d) htP('overT'); break; }
    case 'overT': htHop(HT.vine - 1.6, HT.tower[2], HT.tower[0] + 3, HT.tower[2], 0.45, 2.5, 'walkT'); break;
    case 'walkT': walkTo(HT.tower[1] - 2, 'edgeT'); break;
    case 'swing': {                                                                // תופס את החבל ומתנדנד מעל התהום
      const T = 1.5, k = htE(S.t / T); S.rope = htL(-0.62, 0.78, k);
      const e = htRopeEnd(S.rope); S.nx = e[0] - 0.6; S.h = e[1] - 13;
      if (S.t >= T) { htP('release'); S.rx = S.nx; S.rh = S.h; }
      break;
    }
    case 'release': S.rope = htL(0.78, 0, htE(S.t / 1.2)); htHop(S.rx, S.rh, HT.ledge[0] + 4, HT.ledge[2], 0.6, 4, 'walkL'); break;
    case 'walkL': S.rope = htL(S.rope, 0, dt * 3); walkTo(HT.ledge[1] - 2, 'edgeL'); break;
    case 'dropM': htHop(HT.ledge[1] - 2, HT.ledge[2], HT.mush, 7.5, 0.75, 4, 'boing'); break;
    case 'boing': if (!S.boinged) { S.boinged = 1; S.squash = 0.35; sfx('jump'); floatText(o.x + HT.mush, GROUND - 16, 'BOING!', '#e11d48'); }
      if (S.t >= 0.15) htP('bounce'); break;
    case 'bounce': htHop(HT.mush, 7.5, HT.cliff[0] + 3.5, HT.cliff[2], 1.25, 12, 'walkC'); break;
    case 'walkC': walkTo(HT.cliff[1] - 2, 'edgeC'); break;
    case 'para': {                                                                // מצנח: ריחוף ארוך אל הקרקע עם נדנוד
      const T = 7.0, k = Math.min(1, S.t / T);
      S.chute = htE(S.t / 0.5); S.swayT += dt;
      S.nx = htL(HT.cliff[1] - 2, HT.land, k); S.h = S.t < 0.5 ? HT.cliff[2] + Math.sin(S.t / 0.5 * Math.PI) * 2 : htL(HT.cliff[2], 0, (S.t - 0.5) / (T - 0.5));
      if (S.t >= T) { S.h = 0; sfx('land'); htP('landed'); }
      break;
    }
    case 'landed': S.chute = 1 - htE(S.t / 0.6); if (S.t >= 1.0) htP('exit'); break;
    case 'exit': {
      S.nx += 15 * dt;
      if (o.x + HT.land < -20 || S.t > 8) {
        cleared(o); htS = null;
        if (mode === 'journey' && state === 'play') { picked += HT.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + HT.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  // העולם זז כשהנינג'ה מתקדם – הוא נשאר קצת שמאלה מהאמצע, כדי לראות מה בא
  const over = o.x + S.nx - (htNX() + 16); if (over > 0) ropeShiftBy(over);
  for (const c of S.coins) if (!c.got && Math.abs(c.x - S.nx) < 3 && c.h > S.h - 1 && c.h < S.h + 14) { c.got = 1; sfx('coin'); }
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > HT.hint + S.hinted * HT.hintEvery) { S.hinted++; speak(want); }
  }
}
function htHop(x0, h0, x1, h1, T, peak, next) {                                   // קפיצה בקשת בין שני משטחים
  const S = htS, k = Math.min(1, S.t / T);
  S.nx = htL(x0, x1, k); S.h = htL(h0, h1, k) + Math.sin(k * Math.PI) * peak;
  if (S.t >= T) { S.nx = x1; S.h = h1; sfx('land'); htP(next); }
}
function htGo() {
  const S = htS;
  const nx = { start: 'climbA', edgeA: 'jumpA', baseT: 'climbT', edgeT: 'swing', edgeL: 'dropM', edgeC: 'para' }[S.p];
  htChipOk(HT_WAIT[S.p]);
  if (nx === 'dropM') S.boinged = 0;
  if (nx === 'para') sfx('swish'); else if (nx === 'jumpA' || nx === 'dropM') sfx('jump'); else sfx('swish');
  htP(nx);
}
function htRopeEnd(a) { return [HT.pivot[0] + Math.sin(a) * HT.ropeL, HT.pivot[1] - Math.cos(a) * HT.ropeL]; }
function htPhysics() { if (!htS) return false; vy = 0; py = 0; return true; }
function htSpeed() { return htS ? 0 : null; }
function htCam() { const S = htS; if (!S) return 0; return Math.max(0, S.h - 18); }   // המצלמה עולה כשהנינג'ה גבוה

/* ---------- פקודות ---------- */
function htCmd(word) {
  if (!htS || !['climb', 'jump', 'swing', 'open'].includes(word)) return false;
  const S = htS, want = HT_WAIT[S.p];
  if (want === word) { S.held = word; }
  else {                                                                          // מוקדם מעט – נשמר לתחנה הבאה, אם זו המילה שלה
    const nextWait = { walkA: 'jump', overA: 'jump', walkB: 'climb', jumpA: 'climb', walkT: 'swing', overT: 'swing', walkL: 'jump', release: 'jump', walkC: 'open', bounce: 'open' }[S.p];
    if (nextWait === word) { S.held = word; htChipOk(word); }
  }
  return true;
}
function htChipOk(w) { htS.chipOk = 1.1; htS.chipW = w; }
function htExpected() { const S = htS; if (!S) return null; const w = HT_WAIT[S.p]; return w ? [w] : []; }
function htAuto() { const S = htS; if (!S) return; const w = (htExpected() || [])[0]; if (w && S.idle > 0.7) command(w, 'auto'); }
function htTap() { return htS ? (htExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function htHouse(o, [x0, x1, h], wall, roof) {                                    // בית יפני: קיר, חלונות מוארים, גג מעוקל – הגג שטוח למעלה (משטח הליכה)
  const g = GROUND, X0 = o.x + x0, X1 = o.x + x1, top = g - h;
  ctx.fillStyle = wall; ctx.fillRect(X0 + 1, top + 3, X1 - X0 - 2, h - 3);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(X1 - 4, top + 3, 3, h - 3);
  ctx.fillStyle = '#fde68a'; for (let y = top + 6; y < g - 5; y += 7) for (let x = X0 + 4; x < X1 - 5; x += 7) ctx.fillRect(x, y, 2.6, 3.2);
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(X0 + (X1 - X0) / 2 - 1.6, g - 6, 3.2, 6);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(X0 - 2.5, top + 3.6); ctx.quadraticCurveTo(X0 + 1, top + 2.2, X0 + 1.5, top); ctx.lineTo(X1 - 1.5, top);
  ctx.quadraticCurveTo(X1 - 1, top + 2.2, X1 + 2.5, top + 3.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(X0 + 1.5, top, X1 - X0 - 3, 0.6);
}
function htLadder(x, h0, h1) {
  const g = GROUND; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 1.2, g - h0); ctx.lineTo(x - 1.2, g - h1 - 1); ctx.moveTo(x + 1.2, g - h0); ctx.lineTo(x + 1.2, g - h1 - 1); ctx.stroke();
  ctx.lineWidth = 0.35; for (let h = h0 + 1.5; h < h1; h += 2.2) { ctx.beginPath(); ctx.moveTo(x - 1.2, g - h); ctx.lineTo(x + 1.2, g - h); ctx.stroke(); }
}
function htVine(x, h0, h1) {
  const g = GROUND, now = performance.now() / 1000;
  ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(x, g - h1);
  for (let h = h1; h >= h0; h -= 2) ctx.lineTo(x + Math.sin(h * 0.5 + now * 0.8) * 0.45, g - h); ctx.stroke();
  ctx.fillStyle = '#22c55e'; for (let h = h0 + 2; h < h1; h += 3.2) { const s = (h * 7) % 2 > 1 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + s * 0.9, g - h, 0.95, 0.45, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
}
function htRock(o, [x0, x1, h], light) {                                         // עמוד סלע עם דשא למעלה
  const g = GROUND, X0 = o.x + x0, X1 = o.x + x1, top = g - h;
  ctx.fillStyle = '#6b6259'; ctx.beginPath(); ctx.moveTo(X0 - 1.5, g); ctx.lineTo(X0 - 0.3, g - h * 0.5); ctx.lineTo(X0 + 0.3, top + 2); ctx.quadraticCurveTo(X0 + 0.5, top, X0 + 2, top);
  ctx.lineTo(X1 - 2, top); ctx.quadraticCurveTo(X1 - 0.5, top, X1 - 0.3, top + 2); ctx.lineTo(X1 + 0.6, g - h * 0.45); ctx.lineTo(X1 + 1.8, g); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(X0 + 1.5, top + 1); ctx.lineTo(X0 + (X1 - X0) * 0.45, top + 1); ctx.lineTo(X0 + (X1 - X0) * 0.35, g - 4); ctx.lineTo(X0 + 1, g - 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,34,28,.35)'; ctx.lineWidth = 0.4;
  for (let y = top + 7; y < g - 3; y += 9) { ctx.beginPath(); ctx.moveTo(X0 + 2, y); ctx.lineTo(X0 + (X1 - X0) * 0.6, y + 1.5); ctx.stroke(); }
  ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.roundRect(X0 - 0.5, top - 0.8, X1 - X0 + 1, 1.8, 0.9); ctx.fill();
}
function htTower(o) {                                                             // מגדל אבן עם לבנים וגג קטן
  const [x0, x1, h] = HT.tower, g = GROUND, X0 = o.x + x0, X1 = o.x + x1, top = g - h;
  ctx.fillStyle = '#94a3b8'; ctx.fillRect(X0, top, X1 - X0, h);
  ctx.fillStyle = '#7b8798'; ctx.fillRect(X1 - 3, top, 3, h);
  ctx.strokeStyle = 'rgba(51,65,85,.35)'; ctx.lineWidth = 0.3;
  for (let y = top + 3, r = 0; y < g; y += 3, r++) { ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke(); for (let x = X0 + (r % 2 ? 2 : 4); x < X1; x += 4) { ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y); ctx.stroke(); } }
  ctx.fillStyle = '#64748b'; for (let x = X0; x < X1; x += 2.8) ctx.fillRect(x, top - 1.6, 1.6, 1.6);   // שיניים בראש המגדל
}
function htTree(o) {                                                             // עץ גבוה מאוד עם ענף שממנו תלוי החבל
  const g = GROUND, tx = o.x + HT.pivot[0] + 9, top = g - HT.pivot[1];
  ctx.fillStyle = '#7c5a3a'; ctx.beginPath(); ctx.moveTo(tx - 2.6, g); ctx.lineTo(tx - 1.4, top - 6); ctx.lineTo(tx + 1.4, top - 6); ctx.lineTo(tx + 2.8, g); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7c5a3a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, top - 1); ctx.quadraticCurveTo(tx - 5, top - 1.5, o.x + HT.pivot[0] - 2, top + 0.2); ctx.stroke();
  const blobs = [[0, -12, 10, 7], [-6, -7, 7, 5], [6, -8, 8, 5.5], [0, -17, 7, 5]];
  for (const [c, dy] of [['#2f6b2a', 0.8], ['#3f8a35', -0.4]]) { ctx.fillStyle = c; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx, top + by + dy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); } }
}
function htMushroom(o, squash) {                                                 // פטרייה ענקית: גבעול בהיר, כובע אדום עם נקודות
  const g = GROUND, x = o.x + HT.mush, sq = squash > 0 ? Math.sin(squash / 0.35 * Math.PI) * 0.35 : 0;
  ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(x - 1.8, g); ctx.lineTo(x - 1.3, g - 5 + sq * 3); ctx.lineTo(x + 1.3, g - 5 + sq * 3); ctx.lineTo(x + 1.8, g); ctx.fill();
  ctx.save(); ctx.translate(x, g - 5 + sq * 3); ctx.scale(1 + sq * 0.4, 1 - sq);
  ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.6, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#be123c'; ctx.fillRect(-7, -0.4, 14, 0.8);
  ctx.fillStyle = '#fff'; for (const [dx, dy, r] of [[-3.5, -1.6, 0.9], [0.5, -2.8, 1], [3.8, -1.4, 0.8], [-0.8, -1.1, 0.5]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function htChute(x, y, k, sway) {                                               // מצנח: כיפה צבעונית בפסים וחוטים אל הכתפיים
  if (k <= 0.02) return;
  const cx = x + Math.sin(sway) * 1.2, cy = y - 22 * k, r = 9 * k;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.22;
  for (const s of [-1, -0.35, 0.35, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r, cy); ctx.lineTo(x + s * 0.8, y - 11); ctx.stroke(); }
  const cols = ['#ef4444', '#facc15', '#3b82f6', '#facc15', '#ef4444'];
  for (let i = 0; i < 5; i++) { const a0 = Math.PI + i / 5 * Math.PI, a1 = Math.PI + (i + 1) / 5 * Math.PI;
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.ellipse(cx, cy, r, r * 0.6, 0, a0, a1); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.18, 0, 0, Math.PI); ctx.fill();
}
function drawHeights(o) {
  const S = htS && htS.o === o ? htS : null, now = performance.now() / 1000;
  htTree(o);
  htHouse(o, HT.bldA, '#f5e6c8', '#334155'); htLadder(o.x + HT.ladder, 0, HT.bldA[2]);
  htHouse(o, HT.bldB, '#efd9b4', '#7f1d1d');
  htTower(o); htVine(o.x + HT.vine, HT.bldB[2], HT.tower[2]);
  htRock(o, HT.ledge, '#7d7368'); htRock(o, HT.cliff, '#7d7368');
  htMushroom(o, S ? S.squash : 0);
  // החבל: תלוי מהענף; בזמן הנדנוד – הקצה ביד של הנינג'ה
  const a = S ? S.rope : -0.0, e = htRopeEnd(S && ['swing'].includes(S.p) ? a : (S ? S.rope : 0) + Math.sin(now * 1.3) * (S && S.p !== 'edgeT' && S.p !== 'walkT' ? 0.05 : 0.05));
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(o.x + HT.pivot[0], GROUND - HT.pivot[1]); ctx.lineTo(o.x + e[0], GROUND - e[1]); ctx.stroke();
  ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(o.x + e[0], GROUND - e[1], 0.55, 0, Math.PI * 2); ctx.fill();
  // מטבעות
  const coins = S ? S.coins : [];
  for (const c of coins) if (!c.got) { const sx = Math.max(0.2, Math.abs(Math.cos(now * 4 + c.x * 0.2)));
    ctx.save(); ctx.translate(o.x + c.x, GROUND - c.h + Math.sin(now * 5 + c.x) * 0.4); ctx.scale(sx, 1);
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}
function drawHeightsFront(o) {
  const S = htS && htS.o === o ? htS : null; if (!S) return;
  htDrawChip();
}
function htDrawChip() {
  const S = htS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (htExpected() || [])[0];
  if (!w) return;
  const txt = HT_CHIP[w] || w.toUpperCase(), y = 24 - camDY, sz = 6;             // נשאר במקום על המסך גם כשהמצלמה עולה
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}

/* ---------- הנינג'ה ---------- */
function htNinjaPose(S, now) {
  const p = S.p, t = S.t;
  if (p === 'climbA' || p === 'climbT') return poseClimb(now, (S.h / 6) % 1);
  if (['overA', 'overT', 'jumpA', 'release', 'bounce', 'dropM'].includes(p)) return poseAir(true, Math.min(1, t / 0.6));
  if (['walkA', 'walkB', 'walkT', 'walkL', 'walkC', 'exit'].includes(p)) return poseRun(S.nx * 0.5);
  if (p === 'swing') { const P = poseIdle(now); P.arms = [[3.0, 3.1], [3.05, 3.15]]; P.legs = [[0.25 + S.rope * 0.3, 0.1], [0.45 + S.rope * 0.3, 0.3]]; P.hipY = -4.8; return P; }   // תלוי על החבל
  if (p === 'boing') { const P = poseIdle(now); P.hipY = -3.2; P.legs = [[-0.5, -1.6], [0.8, -0.4]]; return P; }
  if (p === 'para' || p === 'landed') { const P = poseIdle(now); P.arms = [[2.7, 3.0], [2.8, 3.05]]; P.legs = [[-0.1 + Math.sin(now * 3) * 0.15, 0], [0.15 - Math.sin(now * 3) * 0.15, 0.1]]; return P; }
  const P = poseIdle(now);
  if (p === 'start' || p === 'baseT') P.headTilt = -0.35;                         // מביט למעלה
  if (p === 'edgeL' || p === 'edgeC') { P.headTilt = 0.3; P.lean = 0.08; }         // מביט למטה
  if (p === 'edgeT') { P.headTilt = -0.25; P.arms = [P.arms[0], [2.3, 2.6]]; }    // מושיט יד אל החבל
  return P;
}
function htDrawNinja() {
  const S = htS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, fy = GROUND - S.h, P = htNinjaPose(S, now);
  const onSurf = ['start', 'walkA', 'edgeA', 'walkB', 'baseT', 'walkT', 'edgeT', 'walkL', 'edgeL', 'walkC', 'edgeC', 'exit', 'landed'].includes(S.p);
  if (onSurf) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, fy + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  if (S.chute > 0) htChute(fx, fy, S.chute, S.swayT * 1.6);
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'heights', word: 'heights', label: true,
  listen: ['climb', 'jump', 'swing', 'open'],
  active: () => !!htS,
  reset: () => { htS = null; },
  setup: htSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + HT.e0 + PLAYER.w / 2,
  draw: drawHeights, drawFront: drawHeightsFront, drawNinja: htDrawNinja,
  update: htUpdate, physics: htPhysics, speed: htSpeed, camLift: o => (htS && htS.o === o ? htCam() : 0),
  expected: htExpected, cmd: htCmd, auto: htAuto, tap: htTap,
  intro: { banner: 'CLIMB · JUMP · SWING · OPEN!', time: 40,
           demo: () => { const o = { type: 'heights' }; htSetup(o); o.x = htNX() - HT.e0; obstacles.push(o); } }
});
