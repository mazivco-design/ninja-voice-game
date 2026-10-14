/* ninja-voice-game – merchant.js
   I WANT: לפני דלת נעולה עומד סוחר עם עגלה. הוא שואל "What do you want?" ומציג את החפצים בקול ובהצבעה.
   הילד אומר I WANT (העגלה נפתחת) ואז את שם החפץ. המפתח פותח את הדלת.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let merchant = null;          // { o, phase: 'ask' | 'choose' | 'give' | 'open' | 'done', t, hi, bubble, item, said }
const MERCHANT_OFFER = ['key', 'rope', 'torch'];
const SAY_ASK = [[0.3, -1, 'What do you want?'], [2.0, 0, 'I have ' + ITEMS.key.say], [3.3, 1, ITEMS.rope.say], [4.6, 2, 'and ' + ITEMS.torch.say], [5.9, -1, 'What do you want?']];

function cartX(o) { return o.x - 32; }                        // העגלה עומדת לפני הדלת, והסוחר בינה לבין הדלת
const ITEM_GAP = 7;

function merchantUpdate(dt, pb) {
  if (!merchant) {
    const d = obstacles.find(o => o.type === 'door' && !o.unlocked && !o.hit && o.x - pb.r <= DOOR.stopAt && o.x > pb.l);
    if (d) { merchant = { o: d, phase: 'ask', t: 0, hi: -1, bubble: '', said: 0 }; duckT = 0; }
    return;
  }
  const m = merchant; m.t += dt;
  if (!obstacles.includes(m.o)) { merchant = null; return; }
  if (m.phase === 'ask') {                                      // שואל ומציג את החפצים אחד אחרי השני
    while (m.said < SAY_ASK.length && m.t >= SAY_ASK[m.said][0]) {
      const [, hi, text] = SAY_ASK[m.said++]; m.hi = hi; m.bubble = text; speak(text);
    }
    if (m.t > 14) { m.t = 0; m.said = 0; }                      // אם הילד שותק – שואל שוב
  } else if (m.phase === 'give') {                              // החפץ עף מהעגלה לנינג'ה
    if (m.t > 0.7) { m.phase = 'open'; m.t = 0; }
  } else if (m.phase === 'open') {                              // המפתח נכנס למנעול והדלת נפתחת
    if (m.t > 0.35 && !m.o.unlocked) { m.o.unlocked = true; m.o.uT = 0; sfx('clear'); burst(m.o.x + 2, GROUND - 14, '#facc15', 12, 30); cleared(m.o); }
    if (m.t > 1.0) { m.phase = 'done'; m.bubble = 'Good luck!'; m.hi = -1; }
  }
  if (m.o.unlocked) m.o.uT = (m.o.uT || 0) + dt;
}

function merchantWant() {
  const m = merchant; if (!m || m.phase !== 'ask') return;
  m.phase = 'choose'; m.t = 0; m.hi = -1; m.bubble = 'Which one?'; speak('Which one?');
}
function merchantItem(w) {
  const m = merchant; if (!m || m.phase !== 'choose') return;  // צריך קודם להגיד I WANT
  m.hi = MERCHANT_OFFER.indexOf(w);
  if (w === DOOR.needs) { m.phase = 'give'; m.t = 0; m.item = w; m.bubble = 'Here you go!'; speak('Here you go!'); sfx('coin'); return; }
  m.bubble = 'Hmm… a ' + w + ' won\'t open the door!'; speak('Hmm, that won\'t open the door.');   // חפץ לא מתאים – מנסים שוב
  shakeT = 0.2;
  if (state === 'play') hits++;
}

/* ---------- ציור ---------- */
function drawBubble(text, x, y) {                               // בועת דיבור עם זנב למטה
  ctx.font = '800 3.4px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 4, h = 6;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.35;
  roundRect(x - w / 2, y - h, w, h, 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 1, y - 0.2); ctx.lineTo(x + 3.5, y + 2.2); ctx.lineTo(x + 3.6, y - 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1e293b'; ctx.fillText(text, x, y - h / 2 + 0.2);
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
  MERCHANT_OFFER.forEach((w, i) => {                            // החפצים על הדוכן, עם השם מתחת – קוראים ושומעים
    if (m && m.item === w && (m.phase === 'give' || m.phase === 'open' || m.phase === 'done')) return;   // כבר נמסר
    const ix = x + 3.5 + i * ITEM_GAP, lit = m && m.hi === i && m.phase !== 'done';
    const bob = lit ? -1.2 - Math.abs(Math.sin(now * 8)) * 0.8 : 0;
    if (lit) { ctx.fillStyle = 'rgba(253,224,71,.55)'; circle(ix, GROUND - 13 + bob, 3.4); }
    ctx.font = '4.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ITEMS[w].icon, ix, GROUND - 12.6 + bob);
    ctx.font = '900 2px -apple-system, system-ui, Arial, sans-serif'; ctx.fillStyle = lit ? '#fde047' : '#fff';
    ctx.fillText(w.toUpperCase(), ix, GROUND - 6.2);
  });
  if (m && m.item && m.phase === 'give') {                      // החפץ עף לנינג'ה
    const k = Math.min(1, m.t / 0.7), sx = x + 3.5 + MERCHANT_OFFER.indexOf(m.item) * ITEM_GAP, sy = GROUND - 13, ex = PLAYER.x + 6, ey = GROUND - 9;
    ctx.font = '4.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ITEMS[m.item].icon, sx + (ex - sx) * k, sy + (ey - sy) * k - Math.sin(Math.PI * k) * 10);
  }
  if (m && m.item && m.phase === 'open') {                      // המפתח טס אל המנעול
    const k = Math.min(1, m.t / 0.35), sx = PLAYER.x + 6, sy = GROUND - 9, ex = o.x + 2, ey = GROUND - 14;
    if (k < 1) { ctx.font = '4.4px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ITEMS[m.item].icon, sx + (ex - sx) * k, sy + (ey - sy) * k); }
  }
  // הסוחר מצויר אחרי העגלה – כדי שהיד המצביעה תיראה מעל הדוכן
  drawFigure({ fx: mx, fy: GROUND, facing: -1, scale: 1.15, kind: 'guard', friendly: true, pose: P,
               suit: { body: '#166534', back: '#14532d', front: '#15803d', edge: '#052e16' } });
  if (m && m.bubble) drawBubble(m.bubble, mx - 4, GROUND - 26);
  if (!m && !o.unlocked && labelsVisible()) label('I WANT', x + 8, GROUND - 28, 4, '#fde047', '#1e293b');
}

function drawDoor(o) {                                          // דלת עץ נעולה במסגרת אבן
  const x = o.x, w = DOOR.w, h = DOOR.h, top = GROUND - h;
  ctx.fillStyle = '#78716c'; ctx.fillRect(x - 2, top - 3, w + 4, 3.2); ctx.fillRect(x - 2, top, 2, h); ctx.fillRect(x + w, top, 2, h);   // מסגרת
  ctx.fillStyle = '#57534e'; for (let y = top + 3; y < GROUND; y += 4) { ctx.fillRect(x - 2, y, 2, 0.4); ctx.fillRect(x + w, y, 2, 0.4); }
  const open = o.unlocked ? Math.min(1, (o.uT || 0) / 0.5) : 0, dw = w * (1 - open * 0.85);   // נפתחת: מסתובבת על הציר
  ctx.fillStyle = '#92400e'; ctx.fillRect(x, top, dw, h);
  ctx.fillStyle = '#78350f'; for (let k = 1; k < 4; k++) ctx.fillRect(x + dw * k / 4 - 0.2, top, 0.4, h);
  ctx.fillStyle = '#44403c'; ctx.fillRect(x, top + 5, dw, 1.2); ctx.fillRect(x, GROUND - 7, dw, 1.2);   // חישוקי ברזל
  if (!o.unlocked) {                                            // מנעול זהב גדול
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x + 2, GROUND - 15.6, 1.4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#facc15'; roundRect(x + 0.2, GROUND - 15.6, 3.6, 3.4, 0.6); ctx.fill();
    ctx.fillStyle = '#78350f'; circle(x + 2, GROUND - 14.3, 0.45); ctx.fillRect(x + 1.8, GROUND - 14.2, 0.4, 1);
  }
}
