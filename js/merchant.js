/* ninja-voice-game – merchant.js
   I WANT: לפני דלת נעולה עומד סוחר עם עגלה. הוא שואל פעם אחת "What do you want?" (בבועת קומיקס), והחפצים מוצגים עם השמות שלהם.
   כשהוא מסיים לשאול – בועה מעל הנינג'ה עם מיקרופון מהבהב: תורך. אומרים I WANT A KEY (במשפט אחד), או I WANT ואז KEY.
   אחרי שתיקה – המשחק אומר את המשפט בקול ומדגיש את החפץ הנכון.
   מה שעומד אחרי הדוכן קובע מה לבקש (לסירוגין): דלת נעולה → KEY · צוק גבוה → ROPE (זורק חבל עם וו ומטפס) · מערה חשוכה → TORCH (לפיד שמאיר את הדרך).
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let merchant = null;          // { o, phase: 'ask' | 'choose' | 'give' | 'walk' | 'open' | 'hook' | 'climb' | 'top' | 'down' | 'cave' | 'done', t, hi, bubble, item, said }
const GATES = { key: { w: 15 }, rope: { w: 22, h: 38 }, torch: { w: 60, h: 24 } };   // הצוק / המערה
let merchNext = 'key';
function doorSetup(o) { o.need = merchNext; merchNext = { key: 'rope', rope: 'torch', torch: 'key' }[merchNext]; o.w = GATES[o.need].w; }
function needOf(o) { return (o && o.need) || 'key'; }
const MERCHANT_WALK = 0.4;    // מהירות ההליכה אל הדלת (חלק מהמהירות הרגילה)
const KEY_HAND = { dx: 6, dy: 9 };   // איפה המפתח ביד הנינג'ה
const MERCHANT_OFFER = ['key', 'rope', 'torch'];
const SAY_ASK = [[0.3, -1, 'What do you want?']];
const GATE_CLIMB = 1.6;
const MERCH = { turn: 1.7, hint: 5.5, hintEvery: 7, choiceHint: 4 };   // turn: מתי מופיעה בועת "תורך" (אחרי שהשאלה נגמרה)

function cartX(o) { return o.x - 32; }                        // העגלה עומדת לפני הדלת, והסוחר בינה לבין הדלת
const ITEM_GAP = 7;

function merchantUpdate(dt, pb) {
  if (!merchant) {
    const d = obstacles.find(o => o.type === 'door' && !o.unlocked && !o.hit && o.x - pb.r <= DOOR.stopAt && o.x > pb.l);
    if (d) { merchant = { o: d, phase: 'ask', t: 0, hi: -1, bubble: '', said: 0, hinted: 0, bT: 0 }; duckT = 0; }
    return;
  }
  const m = merchant; m.t += dt; m.bT += dt;
  if (!obstacles.includes(m.o)) { merchant = null; return; }
  if (m.phase === 'ask') {                                      // שואל פעם אחת, ואז מחכה. החפצים מהבהבים בתורם (בלי קול) – רואים מה יש
    while (m.said < SAY_ASK.length && m.t >= SAY_ASK[m.said][0]) {
      const [, hi, text] = SAY_ASK[m.said++]; m.hi = hi; setBubble(m, text); speak(text);
    }
    if (m.t > MERCH.turn && m.hinted === 0) m.hi = Math.floor((m.t - MERCH.turn) / 0.9) % MERCHANT_OFFER.length;
    if (m.t >= MERCH.hint + m.hinted * MERCH.hintEvery && state === 'play') {   // שתיקה – המשחק אומר את המשפט ומדגיש את המפתח
      const nd = needOf(m.o); m.hinted++; m.hi = MERCHANT_OFFER.indexOf(nd); speak('I want a ' + nd); flash = { text: '🙋 I WANT A ' + nd.toUpperCase() + '!', t: 2 };
    }
  } else if (m.phase === 'choose') {
    const nd = needOf(m.o);
    if (m.t >= MERCH.choiceHint + m.hinted * MERCH.hintEvery && state === 'play') { m.hinted++; m.hi = MERCHANT_OFFER.indexOf(nd); speak(nd); flash = { text: ITEMS[nd].icon + ' ' + nd.toUpperCase() + '!', t: 1.6 }; }
  } else if (m.phase === 'give') {                              // החפץ עף מהעגלה לנינג'ה
    if (m.t > 0.7) { m.phase = 'walk'; m.t = 0; }
  } else if (m.phase === 'walk') {                              // הנינג'ה הולך עם החפץ עד הדלת / הצוק / המערה
    if (m.o.x - pb.r <= 1.5 || m.t > 6) {
      const over = pb.r - (m.o.x - 1.5); if (over > 0) ropeShiftBy(-over);
      const nd = needOf(m.o); m.t = 0;
      if (nd === 'key') m.phase = 'open';
      else if (nd === 'rope') { m.phase = 'hook'; m.o.unlocked = true; sfx('swish'); }
      else { m.phase = 'cave'; m.o.unlocked = true; sfx('clear'); }
    }
  } else if (m.phase === 'hook' && m.t > 0.7) { m.phase = 'climb'; m.t = 0; sfx('coin'); }   // הוו נתפס בקצה – מטפסים
  else if (m.phase === 'climb' && m.t > GATE_CLIMB) { m.phase = 'top'; m.t = 0; }
  else if (m.phase === 'top' && PLAYER.x > m.o.x + m.o.w - 1) { m.phase = 'down'; m.t = 0; vy = cfg.jumpV * 0.3; sfx('jump'); }   // קופץ מהצוק למטה
  else if (m.phase === 'cave' && PLAYER.x > m.o.x + m.o.w + 1) { cleared(m.o); m.phase = 'done'; m.t = 0; m.hi = -1; } else if (m.phase === 'open') {                              // המפתח נכנס למנעול והדלת נפתחת
    if (m.t > 0.35 && !m.o.unlocked) { m.o.unlocked = true; m.o.uT = 0; sfx('clear'); burst(m.o.x + 2, GROUND - 14, '#facc15', 12, 30); cleared(m.o); }
    if (m.t > 1.0) { m.phase = 'done'; setBubble(m, 'Good luck!'); m.hi = -1; }
  }
  if (m.o.unlocked) m.o.uT = (m.o.uT || 0) + dt;
}

function merchantWant() {
  const m = merchant; if (!m || m.phase !== 'ask') return;
  m.phase = 'choose'; m.t = 0; m.hi = -1; m.hinted = 0; setBubble(m, 'Which one?');   // בלי קול – כדי שהמילה הבאה של הילד ("key") לא תיבלע
}
function merchantItem(w) {
  const m = merchant; if (!m || m.phase !== 'choose') return;  // צריך קודם להגיד I WANT
  m.hi = MERCHANT_OFFER.indexOf(w);
  if (w === needOf(m.o)) { m.phase = 'give'; m.t = 0; m.item = w; setBubble(m, 'Here you go!'); speak('Here you go!'); sfx('coin'); return; }
  if (needOf(m.o) === 'key') { setBubble(m, 'Hmm… a ' + w + ' won\'t open the door!'); speak('Hmm, that won\'t open the door.'); }   // חפץ לא מתאים – מנסים שוב
  else { setBubble(m, 'Hmm… a ' + w + ' won\'t help here!'); speak('Hmm, that won\'t help here.'); }
  shakeT = 0.2;
  if (state === 'play') hits++;
}

/* ---------- ציור ---------- */
// חפץ במרכז (x, y): חבל מצויר בקוד, השאר אמוג'י
function drawItem(w, x, y) {
  if (w === 'rope') return drawRope(x, y);
  if (w === 'torch') return drawTorchItem(x, y);
  ctx.font = '5.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; ctx.fillText(ITEMS[w].icon, x, y);       // צבע אטום – אחרת האמוג'י יוצא שקוף
}

// סליל חבל חום בהיר: ערימת ליפופים עם פיתולים אלכסוניים, וקצה שמשתלשל
function drawRope(x, y) {
  const fill = '#d9a56a', line = '#3b2412', W = 4.9, rows = 4, rh = 1.3, top = y - 2.6, bot = top + 0.9 + (rows - 1) * rh + rh / 2;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // הקצה המשתלשל – חבל עם פיתולים, יוצא מהסליל למעלה ונופל לימין
  const tail = []; for (let k = 0; k <= 16; k++) { const t = k / 16, u = 1 - t;
    tail.push([u * u * (x + 1.5) + 2 * u * t * (x + 3.6) + t * t * (x + 2.75), u * u * (top + 0.2) + 2 * u * t * (top + 0.4) + t * t * (bot + 0.3)]); }
  ropeStroke(tail, 0.72, fill, line);
  ctx.fillStyle = '#99978b'; ctx.strokeStyle = line; ctx.lineWidth = 0.15; ctx.beginPath(); ctx.arc(tail[16][0], tail[16][1], 0.36, 0, 7); ctx.fill(); ctx.stroke();   // הקצה החתוך
  for (let r = rows - 1; r >= 0; r--) {                         // ליפופים מלמטה למעלה
    const cy = top + 0.9 + r * rh;
    ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 0.3;
    roundRect(x - W / 2, cy - rh / 2 - 0.1, W, rh + 0.2, (rh + 0.2) / 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.16; ctx.beginPath();                      // פיתולי החבל
    for (let k = x - W / 2 + 0.5; k < x + W / 2 - 0.3; k += 0.72) { ctx.moveTo(k, cy + rh / 2); ctx.lineTo(k + 0.5, cy - rh / 2); }
    ctx.stroke();
  }
  // החלק העליון: הליפוף האחרון מתעגל פנימה – שתי טבעות חבל עם פיתולים וחור באמצע
  const ring = (rx, ry, cy) => { const pts = []; for (let k = 0; k <= 28; k++) { const a = k / 28 * Math.PI * 2; pts.push([x + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return pts; };
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, top + 0.25, W / 2 - 0.2, 0.95, 0, 0, Math.PI * 2); ctx.fill();
  ropeStroke(ring(W / 2 - 0.55, 0.62, top + 0.25), 0.7, fill, line);
  ropeStroke(ring(W / 2 - 1.35, 0.3, top + 0.25), 0.5, fill, line);
  ctx.fillStyle = '#5b3416'; ctx.beginPath(); ctx.ellipse(x, top + 0.25, 0.42, 0.13, 0, 0, Math.PI * 2); ctx.fill();   // החור במרכז
  ctx.restore();
}

// חבל לאורך נקודות: קו מתאר כהה, מילוי בהיר, ופסים אלכסוניים לאורכו (הפיתולים)
function ropeStroke(pts, w, fill, line) {
  ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.strokeStyle = line; ctx.lineWidth = w + 0.3; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
  ctx.strokeStyle = line; ctx.lineWidth = 0.13; ctx.beginPath();
  let acc = 0.3; const step = Math.max(0.6, w * 1.05);
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1], [bx, by] = pts[k], len = Math.hypot(bx - ax, by - ay); if (!len) continue;
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx;
    for (; acc < len; acc += step) {
      const px = ax + tx * acc, py = ay + ty * acc, h = w / 2 - 0.05;
      ctx.moveTo(px - nx * h - tx * 0.22, py - ny * h - ty * 0.22); ctx.lineTo(px + nx * h + tx * 0.22, py + ny * h + ty * 0.22);
    }
    acc -= len;
  }
  ctx.stroke();
}
function setBubble(m, text) { if (m.bubble !== text) { m.bubble = text; m.bT = 0; } }
// בועת קומיקס: לבנה עם קו מתאר עבה, פינות עגולות, זנב משולש אל הדובר, ו"קפיצה" קטנה כשהיא מופיעה. tail: 1 = הזנב ימינה-למטה, -1 = שמאלה-למטה
function drawBubble(text, x, y, opt) {
  const o = opt || {}, size = o.size || 4.2, pop = o.age === undefined ? 1 : Math.min(1, o.age / 0.18), sc = 0.6 + 0.4 * pop + Math.sin(Math.min(1, pop) * Math.PI) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.font = '900 ' + size + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + size * 1.6, h = size * 2, tail = o.tail || 1, tx = tail * Math.min(w / 2 - 2.5, 4);
  ctx.lineJoin = 'round'; ctx.lineWidth = 0.6; ctx.strokeStyle = '#111827'; ctx.fillStyle = o.fill || '#ffffff';
  ctx.beginPath();                                                // גוף הבועה + הזנב בצורה אחת – בלי קו באמצע
  const r = h / 2.2, L = -w / 2, R = w / 2, T = -h - 2.4, B = -2.4;
  ctx.moveTo(L + r, T); ctx.lineTo(R - r, T); ctx.quadraticCurveTo(R, T, R, T + r); ctx.lineTo(R, B - r); ctx.quadraticCurveTo(R, B, R - r, B);
  ctx.lineTo(tx + 1.6 * tail, B); ctx.lineTo(tx + 2.8 * tail, 0.6); ctx.lineTo(tx - 0.4 * tail, B);   // הזנב
  ctx.lineTo(L + r, B); ctx.quadraticCurveTo(L, B, L, B - r); ctx.lineTo(L, T + r); ctx.quadraticCurveTo(L, T, L + r, T); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.color || '#111827'; ctx.fillText(text, 0, (T + B) / 2 + 0.2);
  ctx.restore();
}

function drawMerchant(o) {
  const x = cartX(o), now = performance.now() / 1000, m = merchant && merchant.o === o ? merchant : null;
  // הסוחר עומד ליד העגלה, פונה אל הנינג'ה ומצביע על החפץ שהוא מדבר עליו
  const mx = x + 25.5, P = poseIdle(now);
  if (m && m.hi >= 0 && m.phase !== 'done') P.arms[1] = [1.75 + (2 - m.hi) * 0.05, 1.85 + (2 - m.hi) * 0.05];   // יד מושטת לעבר החפץ
  ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x + 0.5, GROUND - 22, 0.8, 22); ctx.fillRect(x + 19.7, GROUND - 22, 0.8, 22);   // עמודי הסוכך
  for (let k = 0; k < 7; k++) {                                // סוכך מפוספס
    ctx.fillStyle = k % 2 ? '#fef3c7' : '#dc2626';
    ctx.beginPath(); ctx.moveTo(x - 1 + k * 3.2, GROUND - 22); ctx.lineTo(x + 2.2 + k * 3.2, GROUND - 22); ctx.lineTo(x + 2.2 + k * 3.2, GROUND - 19.5);
    ctx.quadraticCurveTo(x + 0.6 + k * 3.2, GROUND - 18.2, x - 1 + k * 3.2, GROUND - 19.5); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#92400e'; roundRect(x - 1, GROUND - 9.5, 23, 7, 1); ctx.fill();          // הדוכן
  ctx.fillStyle = '#b45309'; ctx.fillRect(x - 1, GROUND - 9.5, 23, 1.4);
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.3;
  for (let k = 7.5; k < 22; k += 7) { ctx.beginPath(); ctx.moveTo(x - 1 + k, GROUND - 8); ctx.lineTo(x - 1 + k, GROUND - 2.5); ctx.stroke(); }
  for (const wx of [x + 3, x + 18]) {                       // גלגלים
    ctx.fillStyle = '#3f2a1d'; circle(wx, GROUND - 1.8, 2.2); ctx.fillStyle = '#a16207'; circle(wx, GROUND - 1.8, 0.8);
  }
  // מגש תצוגה: תא חום לכל חפץ – החפצים בולטים על רקע כהה
  ctx.fillStyle = '#5b3416'; roundRect(x - 0.6, GROUND - 18.6, 22.2, 9.4, 0.8); ctx.fill();
  MERCHANT_OFFER.forEach((w, i) => {
    const given = m && m.item === w && m.phase !== 'choose', lit = m && m.hi === i && m.phase !== 'done' && !given, ix = x + 3.5 + i * ITEM_GAP;
    ctx.fillStyle = lit ? '#a8641f' : '#7a4520'; roundRect(ix - 3.1, GROUND - 17.9, 6.2, 8, 0.6); ctx.fill();
    if (lit) { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 0.5; ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(ix - 3.1, GROUND - 17.9, 6.2, 0.9);    // צל בחלק העליון של התא
  });
  MERCHANT_OFFER.forEach((w, i) => {                            // החפצים במגש, עם השם מתחת – קוראים ושומעים
    if (m && m.item === w && m.phase !== 'choose') return;   // כבר נמסר
    const ix = x + 3.5 + i * ITEM_GAP, lit = m && m.hi === i && m.phase !== 'done';
    const bob = lit ? -0.6 - Math.abs(Math.sin(now * 8)) * 0.6 : 0;
    ctx.font = '5.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    drawItem(w, ix, GROUND - 13.4 + bob);
    ctx.font = '900 2px -apple-system, system-ui, Arial, sans-serif'; ctx.fillStyle = lit ? '#fde047' : '#fff';
    ctx.fillText(w.toUpperCase(), ix, GROUND - 6.2);
  });
  if (m && m.item && m.phase === 'give') {                      // החפץ עף לנינג'ה
    const k = Math.min(1, m.t / 0.7), sx = x + 3.5 + MERCHANT_OFFER.indexOf(m.item) * ITEM_GAP, sy = GROUND - 13.4, ex = PLAYER.x + KEY_HAND.dx, ey = GROUND - KEY_HAND.dy;
    ctx.font = '4.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    drawItem(m.item, sx + (ex - sx) * k, sy + (ey - sy) * k - Math.sin(Math.PI * k) * 10);
  }
  if (m && m.item && m.phase === 'walk') drawItem(m.item, PLAYER.x + KEY_HAND.dx, GROUND - KEY_HAND.dy - Math.abs(Math.sin(now * 9)) * 0.5);   // המפתח ביד בזמן ההליכה
  if (m && m.item && m.phase === 'open') {                      // המפתח טס אל המנעול
    const k = Math.min(1, m.t / 0.35), sx = PLAYER.x + KEY_HAND.dx, sy = GROUND - KEY_HAND.dy, ex = o.x + 2, ey = GROUND - 14;
    if (k < 1) { ctx.font = '4.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; drawItem(m.item, sx + (ex - sx) * k, sy + (ey - sy) * k); }
  }
  // הסוחר מצויר אחרי העגלה – כדי שהיד המצביעה תיראה מעל הדוכן
  drawFigure({ fx: mx, fy: GROUND, facing: -1, scale: 1.15, kind: 'guard', friendly: true, pose: P,
               suit: { body: '#166534', back: '#14532d', front: '#15803d', edge: '#052e16' } });
  const myTurn = m && ((m.phase === 'ask' && m.t > MERCH.turn) || (m.phase === 'choose' && m.t > 1.1));   // תור הילד – הבועה של הסוחר נעלמת
  if (m && m.bubble && !myTurn) drawBubble(m.bubble, mx - 4, GROUND - 25, { age: m.bT, tail: 1 });   // הסוחר מדבר
  if (myTurn) {   // תורך! בועה מעל הנינג'ה עם מיקרופון מהבהב
    const blink = Math.floor(now * 3) % 2, txt = (blink ? '🎤 ' : '🎙️ ') + (m.phase === 'ask' ? 'I want a …?' : 'KEY? ROPE? TORCH?');
    drawBubble(txt, PLAYER.x + 9, GROUND - 22, { age: m.phase === 'ask' ? m.t - MERCH.turn : m.t - 1.1, tail: -1, fill: '#fef9c3', color: '#1d4ed8', size: 3.8 });
  }
  if (!m && !o.unlocked && labelsVisible()) label('I WANT', x + 8, GROUND - 28, 4, '#fde047', '#1e293b');
}

function drawDoor(o) {                                          // דלת עץ נעולה במסגרת אבן
  const x = o.x, w = DOOR.w, h = DOOR.h, top = GROUND - h;
  ctx.fillStyle = '#78716c'; ctx.fillRect(x - 2, top - 3, w + 4, 3.2); ctx.fillRect(x - 2, top, 2, h); ctx.fillRect(x + w, top, 2, h);   // מסגרת
  ctx.fillStyle = '#57534e'; for (let y = top + 3; y < GROUND; y += 4) { ctx.fillRect(x - 2, y, 2, 0.4); ctx.fillRect(x + w, y, 2, 0.4); }
  // נפתחת: הדלת מסתובבת על הציר שבצד הרחוק, לכיוון הצופה – נהיית צרה, הקצה הקרוב גדל קצת (פרספקטיבה) ומתכהה
  const open = o.unlocked ? Math.min(1, (o.uT || 0) / 0.6) : 0, e = open * (2 - open);   // האטה בסוף התנועה
  if (open > 0) { ctx.fillStyle = 'rgba(255,247,214,' + (0.35 * e) + ')'; ctx.fillRect(x, top, w, h); }   // אור בפתח
  const nx = x + w * 0.78 * e, nt = top - 2.2 * e, nb = GROUND + 0.6 * e, hx = x + w;
  const P = (u, v) => [nx + (hx - nx) * u, (nt + (top - nt) * u) + ((nb + (GROUND - nb) * u) - (nt + (top - nt) * u)) * v];   // u: קרוב→ציר, v: למעלה→למטה
  const quad = (u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = '#92400e'; quad(0, 0, 1, 1);
  ctx.fillStyle = '#78350f'; for (let k = 1; k < 5; k++) quad(k / 5 - 0.015, 0, k / 5 + 0.015, 1);   // קרשים
  ctx.fillStyle = '#44403c'; quad(0, 5 / h, 1, 6.2 / h); quad(0, (h - 7) / h, 1, (h - 5.8) / h);    // חישוקי ברזל
  if (open > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + (0.35 * e) + ')'; quad(0, 0, 1, 1);                              // צד הדלת בצל
    ctx.fillStyle = '#5b3416'; ctx.beginPath(); ctx.moveTo(nx, nt); ctx.lineTo(nx - 1.1 * e, nt + 0.4); ctx.lineTo(nx - 1.1 * e, nb - 0.3); ctx.lineTo(nx, nb); ctx.closePath(); ctx.fill();   // עובי הדלת
    ctx.fillStyle = '#facc15'; const hd = P(0.12, 0.55); circle(hd[0], hd[1], 0.55);                 // ידית
  }
  if (!o.unlocked) {                                            // מנעול זהב גדול
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x + 2, GROUND - 15.6, 1.4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#facc15'; roundRect(x + 0.2, GROUND - 15.6, 3.6, 3.4, 0.6); ctx.fill();
    ctx.fillStyle = '#78350f'; circle(x + 2, GROUND - 14.3, 0.45); ctx.fillRect(x + 1.8, GROUND - 14.2, 0.4, 1);
  }
}

// חומת אבן גבוהה שהדלת בתוכה – מצוירת אחרי הנינג'ה. הפתח (הדלת) שקוף, כך שרואים אותו עובר בתוך הפתח
const DOOR_WALL = { left: 0, right: 7, top: 62 };   // החומה מתחילה במסגרת הדלת – הנינג'ה שעומד לפני הדלת לא מוסתר
function drawDoorWall(o) {
  const x = o.x, w = DOOR.w, h = DOOR.h, dTop = GROUND - h - 3, top = GROUND - DOOR_WALL.top, L = x - 2 - DOOR_WALL.left, R = x + w + 2 + DOOR_WALL.right;
  ctx.save();
  ctx.beginPath();                                              // החומה כולה פחות הפתח
  ctx.rect(L, top, R - L, GROUND - top); ctx.rect(x + w, dTop + 3, -w, h);   // מלבן הפתח בכיוון הפוך – "חור"
  const g = ctx.createLinearGradient(L, 0, R, 0);
  g.addColorStop(0, '#8b8178'); g.addColorStop(0.5, '#a39a90'); g.addColorStop(1, '#7d746b');
  ctx.fillStyle = g; ctx.fill('evenodd'); ctx.clip('evenodd');
  ctx.strokeStyle = 'rgba(60,52,45,.45)'; ctx.lineWidth = 0.4;  // שורות אבנים
  for (let y = top + 4, r = 0; y < GROUND; y += 4, r++) {
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    for (let bx = L + (r % 2 ? 3.5 : 0); bx < R; bx += 7) { ctx.beginPath(); ctx.moveTo(bx, y - 4); ctx.lineTo(bx, y); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let y = top + 0.5; y < GROUND; y += 8) ctx.fillRect(L, y, R - L, 1.2);
  ctx.restore();
  ctx.fillStyle = '#6b625a';                                    // שיניים בראש החומה
  for (let bx = L; bx < R - 0.5; bx += 6) ctx.fillRect(bx, top - 3.5, 3.6, 3.6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(L, top, R - L, 0.8);
  ctx.fillStyle = '#57534e'; ctx.fillRect(x - 2, dTop, w + 4, 3.2);   // משקוף מעל הפתח
  ctx.fillRect(x - 2, dTop, 2, h + 3); ctx.fillRect(x + w, dTop, 2, h + 3);   // מסגרת
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, dTop + 3, 1.2, h);           // צל בתוך הפתח
}

/* ---------- הצוק (ROPE) והמערה (TORCH) ---------- */
// גובה הנינג'ה בזמן הטיפוס / ההליכה על הצוק / הירידה. מחזיר true כשהוא בשליטה כאן
function merchPhysics(dt) {
  const m = merchant; if (!m) return false;
  const H = GATES.rope.h;
  if (m.phase === 'hook') { py = 0; vy = 0; return true; }
  if (m.phase === 'climb') { const k = Math.min(1, m.t / GATE_CLIMB); py = H * k; vy = 0; return true; }
  if (m.phase === 'top') { py = H; vy = 0; return true; }
  if (m.phase === 'down') {
    vy -= cfg.gravity * dt; py += vy * dt;
    if (py <= 0) { py = 0; vy = 0; burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 8, 16); cleared(m.o); m.phase = 'done'; m.t = 0; m.hi = -1; }
    return true;
  }
  return false;
}
function merchSpeed() {                                          // null = לא בשליטה כאן
  const m = merchant; if (!m) return null;
  if (m.phase === 'walk') return speed * MERCHANT_WALK;
  if (m.phase === 'top' || m.phase === 'down') return speed * 0.7;
  if (m.phase === 'cave') return speed * 0.55;                  // הולכים בזהירות בחושך
  if (m.phase === 'done') return null;
  return 0;
}
function merchPose(P) {
  const m = merchant; if (!m) return P;
  if (m.phase === 'climb') { P = poseClimb(performance.now() / 1000); P.lean = 0.1; }
  if (m.phase === 'hook') { P.arms = [P.arms[0], [2.6 - Math.min(1, m.t / 0.3) * 0.8, 2.9]]; }   // זורק את הוו למעלה
  if (m.phase === 'cave') { P.arms = [P.arms[0], [1.9, 2.5]]; }   // מחזיק את הלפיד גבוה
  return P;
}
function drawGate(o) {                                          // מה שעומד אחרי הדוכן
  const nd = needOf(o);
  if (nd === 'key') return drawDoor(o);
  if (nd === 'rope') return drawRopeCliff(o);
  drawCave(o);
}
function drawGateFront(o) {                                     // מעל הנינג'ה
  const nd = needOf(o);
  if (nd === 'key') return drawDoorWall(o);
  if (nd === 'torch') return drawCaveDark(o);
  if (nd === 'rope') drawClimbRope(o);
}
function drawRopeCliff(o) {                                     // צוק סלע גבוה עם ראש שטוח
  const x = o.x, w = o.w, H = GATES.rope.h, top = GROUND - H;
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#8a7a68'); g.addColorStop(0.5, '#a08f7b'); g.addColorStop(1, '#6b5d50');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, GROUND);
  for (let k = 0; k <= 8; k++) ctx.lineTo(x - 0.8 + hash(k * 3.3 + 1) * 1.6, GROUND - H * k / 8);
  ctx.lineTo(x + w * 0.5, top - 1); for (let k = 8; k >= 0; k--) ctx.lineTo(x + w + 0.8 - hash(k * 2.1 + 5) * 1.6, GROUND - H * k / 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 0.4;
  for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + 1, GROUND - H * k / 8); ctx.lineTo(x + w * (0.4 + hash(k) * 0.5), GROUND - H * k / 8 + 0.8); ctx.stroke(); }
  const Gs = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null;
  ctx.fillStyle = Gs && Gs.grass ? Gs.grass[1] : WORLDS[world].top; ctx.fillRect(x - 0.5, top - 1.2, w + 1, 1.8);   // דשא על הראש
  if (!o.unlocked && labelsVisible() && !merchant) label('ROPE', x + w / 2, top - 6, 4, '#fde047', '#1e293b');
}
function drawClimbRope(o) {                                     // החבל עם הוו: נזרק למעלה, נתפס בקצה, והנינג'ה מטפס עליו
  const m = merchant; if (!m || m.o !== o || !['hook', 'climb', 'top', 'down', 'done'].includes(m.phase)) { if (!(o.unlocked)) return; }
  const H = GATES.rope.h, ex = o.x + 1.2, ey = GROUND - H + 0.5;
  let hx = ex, hy = ey;
  if (m && m.o === o && m.phase === 'hook') { const k = Math.min(1, m.t / 0.6); hx = lerp(PLAYER.x + 7, ex, k); hy = lerp(GROUND - 10, ey, k) - Math.sin(Math.PI * k) * 8; }
  ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 0.6, m && m.o === o && m.phase === 'hook' ? GROUND - 9 : GROUND); ctx.stroke();
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.7;                // הוו
  ctx.beginPath(); ctx.arc(hx + 0.8, hy - 0.8, 1.1, Math.PI * 0.5, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}
function drawCave(o) {                                          // מערה: גוש סלע עם פתח, ובפנים חושך עם נטיפים ואבני חן קטנות
  const x = o.x, w = o.w, H = GATES.torch.h, top = GROUND - H - 10;
  ctx.fillStyle = '#1c1917'; ctx.fillRect(x + 2, GROUND - H, w - 4, H);                  // הפנים
  const t = performance.now() / 1000;
  for (let k = 0; k < 6; k++) { const gx = x + 6 + k * (w - 12) / 5, gy = GROUND - 3 - (k % 3) * 5; ctx.fillStyle = 'rgba(125,211,252,' + (0.5 + 0.3 * Math.sin(t * 3 + k)) + ')'; ctx.beginPath(); ctx.moveTo(gx, gy - 1.2); ctx.lineTo(gx + 0.7, gy); ctx.lineTo(gx, gy + 1.2); ctx.lineTo(gx - 0.7, gy); ctx.fill(); }
  ctx.fillStyle = '#44403c'; for (let k = 0; k < 7; k++) { const sx = x + 5 + k * (w - 10) / 6; ctx.beginPath(); ctx.moveTo(sx - 1.4, GROUND - H); ctx.lineTo(sx, GROUND - H + 3 + hash(k) * 3); ctx.lineTo(sx + 1.4, GROUND - H); ctx.fill(); }   // נטיפים
}
function drawCaveDark(o) {                                      // גוף הסלע מעל ומסביב, וחושך בפנים – הלפיד מאיר עיגול סביב הנינג'ה
  const x = o.x, w = o.w, H = GATES.torch.h, top = GROUND - H - 12, m = merchant && merchant.o === o ? merchant : null;
  const inCave = m && m.phase === 'cave' && PLAYER.x + 8 > x && PLAYER.x < x + w;
  ctx.save();
  if (!o.passed) {                                              // חושך בתוך המערה (חוץ מעיגול האור של הלפיד)
    ctx.beginPath(); ctx.rect(x + 2, GROUND - H, w - 4, H);
    ctx.clip();
    const lx = PLAYER.x + 7, ly = GROUND - 12, R = 15 + Math.sin(performance.now() / 90) * 0.6;
    if (inCave) {
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, R);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(10,6,2,.35)'); g.addColorStop(1, 'rgba(8,6,4,.97)');
      ctx.fillStyle = g; ctx.fillRect(x, GROUND - H - 2, w, H + 4);
      ctx.fillStyle = 'rgba(8,6,4,.97)';                       // מחוץ לרדיוס – חושך מלא
      ctx.beginPath(); ctx.rect(x, GROUND - H - 2, w, H + 4); ctx.arc(lx, ly, R, 0, Math.PI * 2, true); ctx.fill();
      ctx.fillStyle = 'rgba(251,146,60,.12)'; ctx.beginPath(); ctx.arc(lx, ly, R * 0.7, 0, Math.PI * 2); ctx.fill();   // אור חם
    } else { ctx.fillStyle = 'rgba(8,6,4,.92)'; ctx.fillRect(x, GROUND - H - 2, w, H + 4); }
  }
  ctx.restore();
  // הסלע עצמו – כיפה מעל המערה, עם קשתות פתח משני הצדדים
  const g = ctx.createLinearGradient(0, top, 0, GROUND); g.addColorStop(0, '#a8a29e'); g.addColorStop(1, '#78716c');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x - 4, GROUND); ctx.lineTo(x - 3, GROUND - H * 0.6); ctx.quadraticCurveTo(x - 1, top + 2, x + w * 0.25, top);
  ctx.quadraticCurveTo(x + w * 0.5, top - 4, x + w * 0.75, top); ctx.quadraticCurveTo(x + w + 1, top + 2, x + w + 3, GROUND - H * 0.6); ctx.lineTo(x + w + 4, GROUND);
  ctx.lineTo(x + w - 2, GROUND); ctx.lineTo(x + w - 2, GROUND - H + 3); ctx.quadraticCurveTo(x + w - 2, GROUND - H, x + w - 5, GROUND - H);
  ctx.lineTo(x + 5, GROUND - H); ctx.quadraticCurveTo(x + 2, GROUND - H, x + 2, GROUND - H + 3); ctx.lineTo(x + 2, GROUND); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.5;
  for (let k = 0; k < 6; k++) { const cx = x + 4 + k * w / 6; ctx.beginPath(); ctx.moveTo(cx, top + 3 + hash(k) * 3); ctx.lineTo(cx + 3, top + 6 + hash(k + 2) * 3); ctx.stroke(); }
  if (inCave) {                                                 // הלפיד ביד – להבה
    const fx = PLAYER.x + 7, fy = GROUND - 13, f = Math.sin(performance.now() / 70) * 0.4;
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(fx - 0.35, fy, 0.7, 4);
    ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.ellipse(fx, fy - 1 + f * 0.3, 1.2, 2 + f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(fx, fy - 0.6, 0.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!o.unlocked && labelsVisible() && !merchant) label('TORCH', x + w / 2, top - 6, 4, '#fde047', '#1e293b');
}
function drawTorchItem(x, y) {                                  // לפיד: מקל עם להבה (אמריקאית – torch זה לפיד, לא פנס)
  const f = Math.sin(performance.now() / 80) * 0.3;
  ctx.fillStyle = '#78350f'; ctx.save(); ctx.translate(x, y); ctx.rotate(0.25);
  ctx.fillRect(-0.5, -1, 1, 4.6); ctx.fillStyle = '#a16207'; ctx.fillRect(-0.8, -1.4, 1.6, 1);
  ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.ellipse(0, -2.8 + f * 0.3, 1.3, 1.9 + f, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(0, -2.4, 0.6, 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
