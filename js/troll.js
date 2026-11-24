/* ninja-voice-game – troll.js
   קרב בוס: טרול. הטרול מסתער עם אלה – אומרים ROLL ומתגלגלים בין הרגליים שלו. הוא מבולבל –
   PICK UP אבן, THROW לראש. שלוש פגיעות – הטרול יושב המום והדרך נפתחת.
   הציור והתנועה של הטרול נבנו בדף הניסוי (טרול – מחזור הליכה): צורת הזנב ושמונה תמונות המפתח של ההליכה. */

/* ---------- ציור הטרול (מדף הניסוי) ---------- */
function trLimb(c, a, b, r1, r2, col) {                                   // איבר עבה ומתחדד מ-a אל b
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  c.fillStyle = col; c.beginPath();
  c.moveTo(a[0] + nx * r1, a[1] + ny * r1); c.lineTo(b[0] + nx * r2, b[1] + ny * r2); c.lineTo(b[0] - nx * r2, b[1] - ny * r2); c.lineTo(a[0] - nx * r1, a[1] - ny * r1); c.fill();
  c.beginPath(); c.arc(a[0], a[1], r1, 0, Math.PI * 2); c.arc(b[0], b[1], r2, 0, Math.PI * 2); c.fill();
}
function trIk2(h, f, l1, l2, fwd) {                                         // ברך בין ירך לקרסול; fwd – לאיזה צד הברך מתכופפת
  const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx), c1 = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const k = a - c1 * fwd; return [h[0] + Math.cos(k) * l1, h[1] + Math.sin(k) * l1];
}
// כף יד: כף, שלוש אצבעות עבות ואגודל. ang – כיוון האמה. grip – סגורה סביב ידית (האלה)
function trollHand(c, p, ang, col, dk, grip) {                           // כף יד: שלוש אצבעות עבות ואגודל. grip – סגורה סביב ידית
  c.save(); c.translate(p[0], p[1]); c.rotate(ang);
  c.fillStyle = col; c.beginPath(); c.ellipse(0, 1.3, 2.3, 2.0, 0, 0, Math.PI * 2); c.fill();
  if (grip) {                                                             // אצבעות מקופלות סביב הידית, אגודל מהצד השני
    for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(1.7, 0 + k * 1.3, 1.45, 0.78, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = dk; c.lineWidth = 0.28; for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(0.6, -0.65 + k * 1.3); c.lineTo(3, -0.65 + k * 1.3); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(-1.6, 0.2, 0.9, 1.6, 0.35, 0, Math.PI * 2); c.fill();
    c.strokeStyle = dk; c.beginPath(); c.moveTo(-0.9, -0.9); c.quadraticCurveTo(-0.6, 0.4, -1.1, 1.6); c.stroke();
  } else {
    for (let k = 0; k < 3; k++) { const fx = -1.25 + k * 1.25, L = 3 - Math.abs(k - 1) * 0.45;
      c.fillStyle = col; c.beginPath(); c.roundRect(fx - 0.6, 2, 1.2, L, 0.6); c.fill();
      c.strokeStyle = dk; c.lineWidth = 0.25; if (k) { c.beginPath(); c.moveTo(fx - 0.62, 2.4); c.lineTo(fx - 0.62, 2 + L - 0.4); c.stroke(); }
      c.fillStyle = '#e7dcc0'; c.beginPath(); c.ellipse(fx, 2 + L - 0.35, 0.38, 0.28, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(2.3, 1.4, 0.75, 1.6, -0.7, 0, Math.PI * 2); c.fill();      // אגודל
    c.strokeStyle = dk; c.lineWidth = 0.25; c.beginPath(); c.moveTo(1.6, 0.5); c.quadraticCurveTo(1.9, 1.5, 2.6, 2.4); c.stroke();
  }
  c.restore();
}
function trollFist(c, p, ang, col, dk) {                                // אגרוף סגור: כף עגולה, אצבעות מקופלות, אגודל מעליהן
  c.save(); c.translate(p[0] + Math.sin(ang) * 1.4, p[1] + Math.cos(ang) * 1.4); c.rotate(-ang);
  c.fillStyle = col; c.beginPath(); c.ellipse(0, 0.4, 2.2, 2.3, 0, 0, Math.PI * 2); c.fill();
  for (const fx of [-1.15, 0, 1.15]) { c.beginPath(); c.ellipse(fx, 2.2, 0.68, 0.75, 0, 0, Math.PI * 2); c.fill(); }   // פרקי האצבעות
  c.strokeStyle = dk; c.lineWidth = 0.25; for (const fx of [-0.58, 0.58]) { c.beginPath(); c.moveTo(fx, 1.2); c.lineTo(fx, 2.8); c.stroke(); }
  c.fillStyle = col; c.beginPath(); c.ellipse(1.5, 0.9, 0.7, 1.5, 0.5, 0, Math.PI * 2); c.fill();   // אגודל
  c.beginPath(); c.moveTo(1.1, -0.3); c.quadraticCurveTo(1.6, 0.9, 1.3, 2); c.stroke();
  c.restore();
}
function trArmSpots(c, a, b, col) {                                       // נקודות כהות על הזרוע, כמו על הגב
  c.fillStyle = col; for (const [t, o, r] of [[0.3, 0.6, 0.32], [0.55, -0.5, 0.26], [0.75, 0.4, 0.3]]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o, r, 0, Math.PI * 2); c.fill(); }
}
// o: t – שלב ההליכה (0..1 למחזור), walk – 0 עומד / 1 הולך / 2 מסתער, club 0..1, look, hurt, sit, noClub
const TR_TL = { thigh: 7.4, shin: 7.4 };                                  // אורכי הרגל (מחזור הליכה)
const TR_TAIL0 = [[0.837, -4.753, 0.837, -4.753, -2.442, -0.709], [-9.6, 1.5, -5.201, 0.719, -6.933, 3.433], [4.443, 2.022, 0.176, 3.222, 4.443, 2.022], [5.245, -2.675, 6.428, 0.18, 3.598, -5.012]];   // הזנב – הצורה שערכת בדף
var TR_TAIL_SHAPE = null;                                                  // צורה ערוכה (מהדף)
function trFarHip(h) { return h > 0 ? -h * 0.3 : -h; }              // ירך רחוקה: קדימה במלואה, אחורה רק מעט – כדי שלא תצא מהגוף
const TR_SG = -1;                                                          // קוצי הזנב בולטים החוצה, מהקשת העליונה
function drawTroll(c, x, dir, o = {}) {
  o = Object.assign({}, o, { noSkirt: true });                           // ניסוי: בלי חצאית ובלי תחתונים
  const G_ = n => { c.save(); if (c.__closestGroupOrSvg) c.__closestGroupOrSvg().setAttribute('id', n); }, E_ = () => c.restore();   // קבוצות בייצוא לקובץ וקטורי
  const SK = '#79a84f', SKD = '#55803a', SKL = '#a9c97c', CL = '#8a5a34', CLD = '#6b4325', AR = '#84b358', ARD = '#5d8a40';   // AR – הידיים בגוון קצת שונה מהגוף
  const sit = !!o.sit, club = o.club || 0, wk = o.walk || 0, ph = (o.t || 0) * Math.PI * 2;
  const sw = wk ? Math.sin(ph) : 0, lift = v => Math.max(0, v), amp = wk === 2 ? 3.2 : 2.2;
  c.save(); c.translate(x, o.gy); c.scale(dir, 1);
  const only = o.only; if (only) c.globalAlpha = 0;                      // only='frontleg' – מציירים רק את הרגל הקרובה (מעל הנינג'ה שמתגלגל) c.lineJoin = 'round';
  const foot = (ax, ay, col, tilt = 0) => { c.save(); c.translate(ax, ay); c.rotate(tilt); c.translate(-ax, -ay); c.fillStyle = col; c.beginPath(); c.ellipse(ax + 1.4, ay + 0.3, 3.1, 1.25, 0, Math.PI, 0); c.lineTo(ax + 4.5, ay + 1); c.lineTo(ax - 1.7, ay + 1); c.fill();
    G_('toenails'); c.fillStyle = '#e7dcc0'; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(ax + 2.4 + k * 0.85, ay + 0.55, 0.35, 0.28, 0, 0, Math.PI * 2); c.fill(); } E_(); c.restore(); };
  // גוף מתנדנד: יורד כשרגל נוחתת, עולה באמצע הצעד
  const P = o.P;                                                           // תנוחה מתמונות מפתח (מחזור הליכה)
  const bob = P ? -P.hipY : wk ? -Math.abs(Math.cos(ph)) * 0.2 + Math.abs(Math.sin(ph)) * (wk === 2 ? 1.0 : 0.7) : 0;
  const lean = P ? P.lean : sit ? -0.1 : 0.35 + (wk === 2 ? 0.15 : 0) + sw * 0.04;
  const by = (sit ? -4 : -13.5) - bob, hipY = sit ? -3.5 : -13 - bob;
  // הגוף מסתובב קצת כמו כדור – כל מה שעליו (בטן, פופיק, קו חזה, נקודות, כתף וירך קדמיות) זז יחד
  const yaw = P ? Math.max(-1, Math.min(1, (P.legB[0] - P.legF[0]) * 0.9)) : 0.2;   // רגל רחוקה קדימה → הגוף פונה אלינו
  const yA = yaw * 0.28, hs = P && P.hip !== undefined ? -P.hip : 2.4 * Math.sin(yA);   // P.hip – כמה הירך הקדמית זזה קדימה (שלילי = אחורה, לאזור האגן)                         // הירכיים זזות הפוך זו לזו כשהאגן מסתובב
  const hipB = P ? [-0.8 + (P && P.hip !== undefined ? trFarHip(P.hip) : hs), hipY] : [-3.2, hipY], hipF = P ? [1.6 - hs, hipY] : [3.6, hipY];
  const fk = (a, ang, L) => [a[0] + Math.sin(ang) * L, a[1] + Math.cos(ang) * L];
  // כפות הרגליים: בכל חצי מחזור רגל אחת מתרוממת וזזה קדימה, השנייה דוחפת אחורה
  let ankF = sit ? [15, -1.6] : [8.6 + sw * amp, -1.3 - lift(sw) * 2.6], ankB = sit ? [11, -1.2] : [-10.2 - sw * amp, -1.3 - lift(-sw) * 2.6];
  let kneeF, kneeB;
  if (P) { kneeF = fk(hipF, P.legF[0], TR_TL.thigh); ankF = fk(kneeF, P.legF[1], TR_TL.shin); kneeB = fk(hipB, P.legB[0], TR_TL.thigh); ankB = fk(kneeB, P.legB[1], TR_TL.shin); }
  else {
  kneeF = sit ? [9, -6.5] : trIk2(hipF, ankF, 8.1, 6.4, 1); kneeB = sit ? [5, -5.5] : trIk2(hipB, ankB, 7.2, 8.2, 1); }
  G_('x');
  E_(); G_('back-leg');
  const thF = Math.atan2(kneeF[0] - hipF[0], kneeF[1] - hipF[1]), thB = Math.atan2(kneeB[0] - hipB[0], kneeB[1] - hipB[1]);
  const BR = '#7a4a28', BRD = '#5e3820', BRL = '#94603a';                // חום – תחתונים
  // בליטת ירך – שריר בראש הרגל, מחובר לרגל וזז איתה
  const bulge = (h, th, col) => { c.save(); c.translate(h[0], h[1]); c.rotate(-th); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0.3, 3.25, 3.0, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
  // שרוול התחתונים על הירך – זז עם הירך
  const cuff = (h, th, col) => { if (o.noSkirt) return; c.save(); c.translate(h[0], h[1]); c.rotate(-th); c.beginPath(); c.moveTo(-5, -5); c.lineTo(5, -5); c.lineTo(5, 1.0); c.quadraticCurveTo(0, 1.9, -5, 1.0); c.closePath(); c.clip();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0.3, 3.4, 3.15, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(0, -0.4, 2.95, 0, Math.PI * 2); c.fill();      // אותה צורה כמו בליטת הירך, רק החלק העליון
    c.strokeStyle = BRD; c.lineWidth = 0.35; c.beginPath(); c.moveTo(-4, 0.85); c.quadraticCurveTo(0, 1.75, 4, 0.85); c.stroke(); c.restore(); };
  // רגל אחורית (רחוקה, כהה)
  G_('back-thigh'); trLimb(c, hipB, kneeB, 2.8, 2.4, SKD);
  G_('back-shin'); trLimb(c, kneeB, ankB, 2.4, 1.2, SKD); G_('back-foot'); foot(ankB[0], ankB[1] + 0.3, SKD, P ? P.feet[0] : 0); E_(); E_();
  E_();
  E_();
  G_('tail');                                                         // הזנב מעל הרגל האחורית, מתחת לגוף
  // זנב קטן מאחור עם קוצים – מתנדנד עם הצעדים
  const tw = P ? (P.tail || 0) : wk ? Math.sin(ph * 2) * 0.35 : 0;
  c.save(); c.translate(-5, hipY - 1.2); c.rotate(tw * 0.3);
  // צורת הזנב: נקודות עם ידיות עיקום (אפשר לערוך בדף הניסוי). כל נקודה: [x, y, ידית נכנסת x, y, ידית יוצאת x, y]
  const TS = (typeof TR_TAIL_SHAPE !== 'undefined' && TR_TAIL_SHAPE) || TR_TAIL0, n = TS.length;
  c.fillStyle = SK; c.beginPath(); c.moveTo(TS[0][0], TS[0][1]);
  for (let i = 0; i < n; i++) { const A = TS[i], Bn = TS[(i + 1) % n]; c.bezierCurveTo(A[4], A[5], Bn[2], Bn[3], Bn[0], Bn[1]); }
  c.closePath(); c.fill();
  G_('tail-spikes'); c.fillStyle = '#4d7a33'; { const A = TS[0], Bn = TS[1 % n];   // קוצים לאורך הקטע הראשון (הקשת העליונה)
    for (const t of [0.3, 0.52, 0.72]) {
      const u = 1 - t, Bz = (p0, p1, p2, p3) => u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3, Dz = (p0, p1, p2, p3) => 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
      const qx = Bz(A[0], A[4], Bn[2], Bn[0]), qy = Bz(A[1], A[5], Bn[3], Bn[1]), tx = Dz(A[0], A[4], Bn[2], Bn[0]), ty = Dz(A[1], A[5], Bn[3], Bn[1]), Ln = Math.hypot(tx, ty) || 1, nx = ty / Ln, ny = -tx / Ln, k = 0.55;
      c.beginPath(); c.moveTo(qx - tx / Ln * k, qy - ty / Ln * k); c.lineTo(qx + TR_SG * nx * 1.2 - tx / Ln * 0.25, qy + TR_SG * ny * 1.2 - ty / Ln * 0.25); c.lineTo(qx + tx / Ln * k, qy + ty / Ln * k); c.fill(); } }
  E_();
  c.restore();
  E_();
  const SX = 0.5, SR = 8.6, sx = x0 => { const th = Math.asin(Math.max(-1, Math.min(1, (x0 - SX) / SR))) - yA; return [SX + Math.sin(th) * SR, Math.max(0.05, Math.cos(th))]; };
  const T = (px, py) => [px * Math.cos(lean) - py * Math.sin(lean), by + px * Math.sin(lean) + py * Math.cos(lean)];
  const shS = P && P.hip !== undefined ? -P.hip * 0.8 : 0;            // הכתפיים זזות הפוך מהירכיים: רגל קרובה הכי אחורה → כתף קרובה הכי קדימה
  const shB = T(1.5 - shS, -12.2), shF0 = T(3.6 + shS, -12.6), shO = (P && P.shF) || [0, 0], shF = [shF0[0] + shO[0], shF0[1] + shO[1]];   // shO – מיקום חיבור הכתף (מהעורך)               // הכתף הקדמית זזה עם סיבוב הגוף
  G_('back-arm');
  // זרוע אחורית: מתנופפת הפוך לרגל הקדמית; כשמבולבל – מגרד בראש
  const ab = o.look ? 2.7 : P ? P.armB[0] : 0.25 - sw * 0.45, eb = o.look ? 0.9 : P ? P.armB[1] : ab + 0.5;
  const elB = [shB[0] + Math.sin(ab) * 6, shB[1] + Math.cos(ab) * 6], hdB = [elB[0] + Math.sin(eb) * 6.9, elB[1] + Math.cos(eb) * 6.9];
  G_('back-upper-arm'); trLimb(c, shB, elB, 2.3, 1.8, ARD); trArmSpots(c, shB, elB, '#456b2f');
  G_('back-forearm'); trLimb(c, elB, hdB, 1.8, 1.6, ARD); trArmSpots(c, elB, hdB, '#456b2f'); G_('back-fist'); trollFist(c, hdB, eb, ARD, '#3f5f2a'); E_(); E_(); E_();
  E_(); G_('body');
  // גוף אחד בצורת ביצה הפוכה – רחב למעלה (חזה וכתפיים), צר יותר למטה, כולל הישבן
  c.save(); c.translate(0, by); c.rotate(lean);
  const egg = () => { c.beginPath(); for (let k = 0; k <= 64; k++) { const t = k / 64 * Math.PI * 2, sn = Math.sin(t), f = 1 - 0.16 * sn;
      const px = 0.3 + 8.7 * Math.cos(t) * f, py = -7.4 + 9.6 * sn; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
  c.fillStyle = SK; egg(); c.fill();
  c.save(); egg(); c.clip();
  // ניסוי: גוף בצבע אחיד – בלי בטן ובלי נקודות
  G_('shorts'); if (!o.noSkirt) {                                                       // תחתונים: עוטפים את תחתית הביצה, קו המותניים מקיף אותה ומסתובב איתה
    c.rotate(-lean); c.translate(0, -by);                                 // חזרה לקואורדינטות העולם (החיתוך נשאר)
    const hc = (hipB[0] + hipF[0]) / 2 + 0.6, wy = hipY - 4.2, RW = 9.5;
    const wpt = th => [hc + RW * Math.sin(th - yA), wy + 1.1 * Math.cos(th - yA)];
    c.fillStyle = BR; c.beginPath(); let q = wpt(-Math.PI / 2); c.moveTo(q[0] - 3, q[1]);
    for (let k = 0; k <= 24; k++) { q = wpt(-Math.PI / 2 + k / 24 * Math.PI); c.lineTo(q[0], q[1]); }
    c.lineTo(q[0] + 3, q[1]); c.lineTo(q[0] + 3, hipY + 9); c.lineTo(hc - RW - 3, hipY + 9); c.closePath(); c.fill();
    c.strokeStyle = BRD; c.lineWidth = 0.9; c.beginPath(); for (let k = 0; k <= 24; k++) { q = wpt(-Math.PI / 2 + k / 24 * Math.PI); k ? c.lineTo(q[0], q[1] + 0.35) : c.moveTo(q[0], q[1] + 0.35); } c.stroke();   // חגורה
    const sm = wpt(0); c.strokeStyle = BRD; c.lineWidth = 0.3; c.beginPath(); c.moveTo(sm[0], sm[1] + 0.8); c.lineTo(sm[0] + 0.4, sm[1] + 4.5); c.stroke();   // תפר באמצע – זז עם הסיבוב
  } E_();
  c.restore();
  c.restore();
  E_(); G_('front-leg'); if (only) c.globalAlpha = 1;
  // רגל קדמית – מעל הגוף והבטן
  G_('front-thigh'); trLimb(c, hipF, kneeF, 2.8, 2.5, SK);
  G_('front-shin'); trLimb(c, kneeF, ankF, 2.5, 1.25, SK); G_('front-foot'); foot(ankF[0], ankF[1] + 0.3, SK, P ? P.feet[1] : 0); E_();
  G_('kneecap'); c.fillStyle = SKL; c.beginPath(); c.ellipse(kneeF[0] + 0.6, kneeF[1], 1.2, 1.5, 0, 0, Math.PI * 2); c.fill(); E_(); E_();
  E_();
  E_(); G_('butt'); if (only) c.globalAlpha = 0;
  E_(); G_('head');
  // ראש
  const hp = T(7.2, -16.2), hx = hp[0] + (o.look ? -1.5 : 0) + (sit ? -2 : 0), hy = hp[1] + (o.hurt ? 1 : 0);   // הראש יושב על הכתפיים, קצת קדימה
  c.save(); c.translate(hx, hy); c.rotate((o.hurt ? -0.35 : 0) + (o.look ? -0.25 : 0));
  c.fillStyle = SK; c.beginPath(); c.ellipse(0, -1.5, 4.4, 4.1, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(-3.5, 0); c.quadraticCurveTo(-3, 4.6, 2, 4.4); c.quadraticCurveTo(5.6, 4, 5.2, 0.5); c.fill();
  c.fillStyle = SKD; c.beginPath(); c.moveTo(-3.6, -2.6); c.lineTo(-7.4, -4.6); c.lineTo(-4, -0.2); c.fill();
  c.fillStyle = '#3f5f2a'; c.beginPath(); c.moveTo(-2, -5.3); c.lineTo(-1.2, -7); c.lineTo(-0.3, -5.5); c.lineTo(0.6, -7.2); c.lineTo(1.3, -5.4); c.fill();
  c.fillStyle = SK; c.beginPath(); c.ellipse(4.6, -0.8, 1.7, 1.4, 0.3, 0, Math.PI * 2); c.fill();
  G_('nostrils'); c.fillStyle = '#3f5f2a'; for (const [nx, ny] of [[4.2, -0.3], [5.7, -0.7]]) { c.beginPath(); c.ellipse(nx, ny, 0.32, 0.24, 0.3, 0, Math.PI * 2); c.fill(); } E_();   // נקבי האף
  G_('eyes'); if (o.hurt || sit) { c.strokeStyle = '#1e293b'; c.lineWidth = 0.42; for (const ex of [0.9, 3.1]) { c.beginPath(); c.moveTo(ex - 0.65, -3.3); c.lineTo(ex + 0.65, -2.1); c.moveTo(ex + 0.65, -3.3); c.lineTo(ex - 0.65, -2.1); c.stroke(); } }
  else { c.fillStyle = '#fef9c3'; for (const ex of [0.9, 3.1]) { c.beginPath(); c.ellipse(ex, -2.6, 0.95, 0.8, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#1e293b'; for (const ex of [0.9, 3.1]) { c.beginPath(); c.arc(ex + (o.look ? -0.4 : 0.35), -2.5, 0.45, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#3f5f2a'; c.beginPath(); c.moveTo(-0.4, o.look ? -4.4 : -3.6); c.lineTo(4.3, -4.1); c.lineTo(4.2, -3.5); c.lineTo(-0.4, o.look ? -3.8 : -3.1); c.fill(); } E_();
  G_('mouth'); c.fillStyle = '#1e293b'; c.beginPath(); c.moveTo(-0.5, 2.2); c.quadraticCurveTo(2.5, o.hurt ? 3.6 : 2.9, 4.8, 1.8); c.lineTo(4.6, 1.4); c.quadraticCurveTo(2.5, 2.2, -0.5, 1.8); c.fill();
  c.fillStyle = '#fffbeb'; for (const tx of [0.3, 3.6]) { c.beginPath(); c.moveTo(tx, 2.4); c.lineTo(tx + 0.5, 0.4); c.lineTo(tx + 1.1, 2.3); c.fill(); } E_();
  c.restore();
  E_(); G_('front-arm-club');
  // זרוע קדמית עם האלה – הכתף מתחילה בתוך הגוף, עם בליטת שריר
  const sw2 = P ? P.armF[0] - 0.2 : sw * 0.35;                            // נדנוד קטן בהליכה
  const swF = P ? -(P.legF[0] - P.legB[0]) * 0.2 : sw2 * 0.3;          // מתנדנדת סביב הכתף – הפוך לרגל הקדמית
  const keyed = P && club < 0.5 && !sit;                                  // בהליכה: זרוע ואמה מתמונות המפתח – המרפק מתכופף ומתיישר
  const a1 = sit ? 0.5 : keyed ? P.armF[0] : club < 0.5 ? 0.62 + swF : -0.3 + club * 3.0 + sw * 0.1, a2 = sit ? 0.9 : keyed ? P.armF[1] : club < 0.5 ? 1.25 + swF * 0.5 : a1 + 0.9 - club * 0.6;   // זרוע ארוכה באלכסון קדימה
  let elF = [shF[0] + Math.sin(a1) * 7, shF[1] + Math.cos(a1) * 7], hdF = [elF[0] + Math.sin(a2) * 6.9, elF[1] + Math.cos(a2) * 6.9];
  const fkArm = keyed && P.club !== undefined;                           // תמונות מפתח לזרוע, לאמה ולאלה (מהעורך)
  if (keyed && !fkArm) {                                                  // בהליכה: כף היד (והאלה) נשארת כמעט במקום – המרפק מתכופף לפי תנועת הכתף
    const s0 = T(3.6, -12.6), uu = -(P.legF[0] - P.legB[0]);
    const rest = [s0[0] + Math.sin(0.62) * 7 + Math.sin(1.6) * 6.9, s0[1] + Math.cos(0.62) * 7 + Math.cos(1.6) * 6.9];   // מיקום היד במנוחה – נמוך יותר
    const tgt = [rest[0] + (shF[0] - s0[0]) * 0.45 + uu * 0.3, rest[1] + (shF[1] - s0[1]) * 0.45 - Math.abs(uu) * 0.2];   // היד זזה עם הכתף, אבל פחות ממנה
    elF = trIk2(shF, tgt, 7, 6.9, -1); hdF = tgt;
    const eR = trIk2(s0, rest, 7, 6.9, -1); var A2r = Math.atan2(rest[0] - eR[0], rest[1] - eR[1]);
  }
  const A2 = Math.atan2(hdF[0] - elF[0], hdF[1] - elF[1]), A1 = Math.atan2(elF[0] - shF[0], elF[1] - shF[1]);
  const wr = keyed && !fkArm ? Math.sin(Math.atan2(P.legB[0] - P.legF[0], 1) * 2.2) * 0.12 : 0;   // פרק היד מתכופף מעט
  const ca = fkArm ? P.club : keyed ? 1.0 - (A2 - A2r) * 0.6 + wr : 2.0 - a2;
  const fist = [hdF[0] + Math.sin(A2) * 1.5, hdF[1] + Math.cos(A2) * 1.5];
  if (o.capture) { o.capture.armF = [A1, A2]; o.capture.club = ca;     // לחישוב תמונות המפתח ולידיות הגרירה בעורך
    o.capture.j = { shF, elF, hdF, fist, tip: [fist[0] + Math.sin(ca) * 13, fist[1] - Math.cos(ca) * 13], hipF, kneeF, ankF, hipB, kneeB, ankB, shB, elB, hdB }; }
  G_('front-upper-arm'); c.fillStyle = AR; c.beginPath(); c.ellipse(shF[0], shF[1] + 0.6, 2.6, 2.3, lean, 0, Math.PI * 2); c.fill();   // כתף
  trLimb(c, shF, elF, 2.6, 2.0, AR); trArmSpots(c, shF, elF, SKD);
  G_('front-forearm'); trLimb(c, elF, hdF, 2.0, 1.8, AR); trArmSpots(c, elF, hdF, SKD);
  G_('front-hand'); if (o.noClub) trollHand(c, hdF, -a2, AR, SKD, false);
  else {
    c.save(); c.translate(fist[0], fist[1]); c.rotate(ca);              // מערכת האלה: הידית לאורך y
    c.fillStyle = AR; c.beginPath(); c.ellipse(-0.3, 0, 2.3, 2.4, 0, 0, Math.PI * 2); c.fill();      // כף היד – מאחורי הידית
    G_('club'); c.fillStyle = '#8b5a2b'; c.beginPath(); c.moveTo(-0.7, 3.2); c.quadraticCurveTo(0, 3.8, 0.7, 3.2); c.lineTo(1.9, -12); c.quadraticCurveTo(0, -15, -1.9, -12); c.fill();   // ידית בולטת מתחת לאגרוף
    c.fillStyle = '#6b4325'; for (const [kx, ky] of [[1, -9.5], [-0.9, -11.2], [0.4, -13], [-0.4, -7.5]]) { c.beginPath(); c.arc(kx, ky, 0.5, 0, Math.PI * 2); c.fill(); } E_();
    G_('fingers'); c.fillStyle = AR; for (const fy of [-1.25, 0, 1.25]) { c.beginPath(); c.ellipse(0.35, fy, 1.75, 0.68, 0, 0, Math.PI * 2); c.fill(); }   // אצבעות עוטפות מקדימה
    c.strokeStyle = SKD; c.lineWidth = 0.26; for (const fy of [-0.62, 0.62]) { c.beginPath(); c.moveTo(-1, fy); c.lineTo(1.9, fy); c.stroke(); }
    c.fillStyle = AR; c.beginPath(); c.ellipse(-0.9, -1.7, 0.75, 1.5, 0.9, 0, Math.PI * 2); c.fill();   // אגודל מעל
    c.beginPath(); c.moveTo(-1.6, -2.2); c.quadraticCurveTo(-0.9, -1.2, 0.3, -1.6); c.stroke(); E_();
    c.restore();
  }
  E_(); G_('elbow-crease'); c.strokeStyle = SKD; c.lineWidth = 0.3; c.beginPath(); c.arc(elF[0], elF[1], 1.1, -0.5 + A1, 1.2 + A1); c.stroke(); E_(); E_(); E_();   // קפל מרפק
  E_();
  c.restore();
}

/* ---------- מחזור ההליכה: שמונה תמונות מפתח (נשמרו מהעורך) ---------- */
const TR_KEYS = [{"hip":2.55,"lean":0.39,"hipY":0.25,"legB":[-0.039,-1.115],"legF":[0.959,-0.233],"armB":[0.25,0.75],"armF":[-0.445,0.532],"feet":[0.55,-0.15],"tail":0.169,"club":1.158,"shF":[-0.735,-1.922]},{"hip":1.26,"lean":0.36,"hipY":0.75,"legB":[0.63,-1.329],"legF":[0.851,-0.608],"armB":[0.017,0.746],"armF":[-0.327,0.662],"feet":[0.2,0],"tail":0.248,"club":1.031,"shF":[-0.627,-1.641]},{"hip":0,"lean":0.33,"hipY":-0.45,"legB":[1.192,-0.667],"legF":[0.464,-0.726],"armB":[-0.545,0.735],"armF":[-0.043,0.976],"feet":[-0.1,0],"tail":-0.169,"club":0.724,"shF":[-0.368,-0.961]},{"hip":-1.26,"lean":0.36,"hipY":0.05,"legB":[1.192,-0.154],"legF":[0.193,-0.936],"armB":[-1.107,0.724],"armF":[0.242,1.29],"feet":[-0.25,0.1],"tail":-0.248,"club":0.417,"shF":[-0.108,-0.281]},{"hip":-2.55,"lean":0.39,"hipY":0.25,"legB":[0.959,-0.233],"legF":[-0.039,-1.115],"armB":[-1.34,0.72],"armF":[0.36,1.42],"feet":[-0.15,0.55],"tail":-0.169,"club":0.29,"shF":[0,0]},{"hip":-1.2,"lean":0.36,"hipY":0.75,"legB":[1.005,-0.337],"legF":[0.408,-1.441],"armB":[-1.107,0.724],"armF":[0.242,1.29],"feet":[0,0.2],"tail":0.248,"club":0.417,"shF":[-0.108,-0.281]},{"hip":0.45,"lean":0.33,"hipY":-0.45,"legB":[0.68,-0.527],"legF":[0.889,-1.018],"armB":[-0.545,0.735],"armF":[-0.043,0.976],"feet":[0,-0.1],"tail":-0.169,"club":0.724,"shF":[-0.368,-0.961]},{"hip":1.86,"lean":0.36,"hipY":0.05,"legB":[0.387,-0.865],"legF":[1.056,-0.524],"armB":[0.017,0.746],"armF":[-0.327,0.662],"feet":[0.1,-0.25],"tail":-0.248,"club":1.031,"shF":[-0.627,-1.641]}];
function trCr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function trSample(u) {                                                            // Catmull-Rom בלולאה
  u = ((u % 1) + 1) % 1; const f = u * 8, i = Math.floor(f), t = f - i, k = n => TR_KEYS[(i + n + 8) % 8];
  const S = g => trCr(g(k(-1)), g(k(0)), g(k(1)), g(k(2)), t), out = {};
  for (const key of ['lean', 'hipY', 'tail', 'hip', 'club']) out[key] = S(q => q[key]);
  for (const key of ['legB', 'legF', 'armB', 'armF', 'feet', 'shF']) out[key] = [S(q => q[key][0]), S(q => q[key][1])];
  return out;
}

/* ---------- הסצנה ----------
   שני מצבים במקביל: S.tp – הטרול, S.np – הנינג'ה. סבב:
   הטרול מסתער → ROLL: מתגלגל בין הרגליים ורץ לקצה השני (שם אבן) → מסתובב → PICK UP →
   הטרול מסתובב ומתקרב → THROW: האבן טסה ישר לראש → הטרול המום ונסוג → מסתער שוב */
const TR = { e0: 4, e1: 100, w: 108, after: 30, hp: 3, runV: 32, walkV: 9, chargeV: 21, stride: 34,
             rollAt: 40, dashV: 24, rollMin: 5, hitAt: 7, hint: 3.5, hintEvery: 5, giveUp: 10, coins: 5 };
let trS = null;
const trE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const trL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function trNX() { return PLAYER.x + 4; }                                          // מרכז הנינג'ה הרגיל על המסך
function trSetup(o) { o.w = TR.w; }
function trT(p) { const S = trS; S.tp = p; S.tt = 0; }                            // מצב הטרול
function trN(p) { const S = trS; S.np = p; S.nt = 0; S.idle = 0; S.hinted = 0; }  // מצב הנינג'ה
function trStart(o) {
  trS = { o, tp: 'meet', tt: 0, np: 'idle', nt: 0, idle: 0, hinted: 0, hp: TR.hp, n: TR.e0, nf: 1, x: TR.e1, d: -1, ph: 0.3, club: 0,
          held: null, stones: [], has: 0, look: 0, hurt: 0, said: 0, fly: null };
}
function trMove(dx) { const S = trS; S.x += dx; S.ph += Math.abs(dx) / TR.stride; }   // הרגליים דורכות: השלב מתקדם לפי המרחק שעבר
function trEnd(sideOfTroll) { return sideOfTroll > 0 ? TR.e1 : TR.e0; }           // הקצה בצד הזה של הטרול

function trUpdate(dt, pb) {
  if (!trS) {
    const o = obstacles.find(o => o.type === 'troll' && !o.passed && trNX() >= o.x + TR.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    trStart(o); return;
  }
  const S = trS, o = S.o; S.tt += dt; S.nt += dt;
  if (!obstacles.includes(o)) { trS = null; return; }
  const demo = state !== 'play', dist = Math.abs(S.x - S.n), toN = Math.sign(S.n - S.x) || 1, toT = -toN;   // toN – מהטרול אל הנינג'ה, toT – מהנינג'ה אל הטרול
  if (demo) {                                                                         // ההדגמה אומרת את המילים בעצמה
    const w = (trExpected() || [])[0];
    const ready = w === 'roll' ? S.tp === 'charge' && dist <= TR.rollAt - 6 : w === 'throw' ? S.tp === 'approach' && dist < 46 : S.nt > 0.9;
    if (w && ready) { const k0 = S.np; command(w, 'demo'); if (S.np !== k0) speak(w); }
  }
  /* ---- הטרול ---- */
  switch (S.tp) {
    case 'meet':                                                                      // מסתובב אל הנינג'ה, מרים את האלה ונוהם
      S.d = toN; S.look = 0; S.club = trL(0.15, 0.85, S.tt / 0.8);
      if (S.tt > 0.3 && !S.said) { S.said = 1; sfx('thud'); }
      if (S.tt >= 1.1) { S.said = 0; trT('charge'); }
      break;
    case 'charge':                                                                    // הסתערות
      S.club = 0.85; trMove(S.d * TR.chargeV * dt);
      if (S.held === 'roll' && dist <= TR.rollAt - 2 && S.np === 'idle') { S.held = null; trRoll(); }
      else if (dist < TR.hitAt && S.np !== 'roll' && S.np !== 'dash') trSmack();
      else if (S.np === 'run' || S.x < TR.e0 - 6 || S.x > TR.e1 + 6) trT('skid');   // הנינג'ה עבר מתחתיו – בולם
      break;
    case 'skid':                                                                      // בולם – ומחפש לאן נעלם הנינג'ה
      trMove(S.d * 7 * dt * Math.max(0, 1 - S.tt / 0.45)); S.club = trL(0.85, 0.15, S.tt / 0.5);
      if (S.tt >= 0.5) { S.look = 1; trT('look'); }
      break;
    case 'look':                                                                      // מבולבל – מחכה עד שהנינג'ה מרים אבן (או שנמאס לו)
      if ((S.has && S.tt > 0.6) || S.tt > TR.giveUp) trT('turn');
      break;
    case 'turn':                                                                      // מסתובב אל הנינג'ה
      S.look = 0; if (S.tt >= 0.2) S.d = toN; S.club = trL(0.15, 0.35, S.tt / 0.4);
      if (S.tt >= 0.45) trT(S.has ? 'approach' : 'meet');
      break;
    case 'approach':                                                                  // מתקרב בכבדות – עכשיו THROW
      S.d = toN; S.club = 0.3; trMove(S.d * TR.walkV * dt);
      if (dist < TR.hitAt) trSmack();
      break;
    case 'smack':                                                                     // מכה – ונסוג קצת
      S.club = trL(0.85, 0.2, S.tt / 0.35);
      if (S.tt > 0.35) trMove(-S.d * 8 * dt);
      if (S.tt >= 1.0) { S.said = 0; trT('meet'); }
      break;
    case 'hurt':                                                                      // פגיעה בראש: כוכבים, ואז נסוג
      S.hurt = 1; S.club = 0.1;
      if (S.tt >= 0.9) { S.hurt = 0; if (S.hp <= 0) { S.sit = 1; trT('down'); trN('win'); sfx('win'); } else trT('stagger'); }
      break;
    case 'stagger':                                                                   // נסוג אחורה כדי שיהיה מקום להסתער
      trMove(-S.d * 13 * dt);
      if (S.tt >= 0.9 || S.x < TR.e0 + 18 && -S.d < 0 || S.x > TR.e1 - 18 && -S.d > 0) { S.said = 0; trT('meet'); }
      break;
    case 'down': if (S.tt >= 1.8) { trT('exit'); trN('exit'); } break;               // שלוש פגיעות – יושב המום
    case 'exit': break;
  }
  /* ---- הנינג'ה ---- */
  switch (S.np) {
    case 'idle': S.nf = toT; break;
    case 'dash':                                                                      // רץ אל הטרול – ואז מתגלגל מתחת לרגליים
      S.nf = S.rollDir; S.n += S.rollDir * TR.dashV * dt;
      if ((dist < 11 && S.nt >= 0.4) || dist < 7) { S.roll0 = S.n; trN('roll'); sfx('swish'); }   // כמה צעדי ריצה – ואז גלגול
      break;
    case 'roll': {                                                                    // כדור מתגלגל בין הרגליים
      const k = S.nt / 0.45; S.n += S.rollDir * TR.runV * 1.1 * dt;
      if (k >= 1) trN('run');
      break;
    }
    case 'run': {                                                                     // רץ לקצה השני – שם האבן
      const tgt = S.runTo, dd = tgt - S.n; S.nf = Math.sign(dd) || S.nf;
      S.n += Math.sign(dd) * Math.min(Math.abs(dd), TR.runV * dt);
      if (Math.abs(dd) < 0.3) { S.nf = -S.nf; trN('pickWait'); }                     // נעצר ומסתובב אל הטרול
      break;
    }
    case 'pickWait': S.nf = toT; break;
    case 'picking': S.nf = toT; if (S.nt >= 0.45) { S.has = 1; S.stones = S.stones.filter(st => Math.abs(st - S.n) > 6); trN('armed'); } break;
    case 'armed': S.nf = toT; break;
    case 'throwing':
      S.nf = toT;
      if (S.nt >= 0.4 && S.has) { S.has = 0; const hd = trHead(); S.fly = { x0: (playerHand ? playerHand[0] - o.x : S.n + S.nf * 2.5), y0: (playerHand ? playerHand[1] - GROUND : -16), x1: hd[0], y1: hd[1], t: 0 }; sfx('swish'); }
      if (S.fly) { S.fly.t += dt / 0.16; if (S.fly.t >= 1) { S.fly = null; trHit(); } }
      if (S.nt >= 0.8 && !S.fly) trN('idle');
      break;
    case 'knocked':                                                                   // נהדף מהמכה
      S.n = Math.max(TR.e0 - 3, Math.min(TR.e1 + 3, S.n + S.kn * 22 * dt * Math.max(0, 1 - S.nt / 0.5)));
      if (S.nt >= 0.7) trN('idle');
      break;
    case 'win': S.nf = 1; break;
    case 'exit': {                                                                    // ממשיכים בדרך; העולם זז כשהנינג'ה מגיע למקומו הרגיל
      S.n += TR.walkV * 1.6 * dt; S.nf = 1;
      const over = o.x + S.n - trNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + S.x < -30 || S.nt > 9) {
        cleared(o); trS = null;
        if (mode === 'journey' && state === 'play') { picked += TR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + TR.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  // רמזים: אחרי שתיקה המשחק אומר את המילה
  const want = (trExpected() || [])[0];
  const waiting = want && (want === 'roll' ? S.tp === 'charge' && dist <= TR.rollAt + 12 : want === 'throw' ? S.tp === 'approach' : true);
  if (waiting && !demo && state === 'play') {
    S.idle += dt;
    if (want === 'roll' || want === 'throw' ? !S.hinted && S.idle > 0.4 : S.idle > TR.hint + S.hinted * TR.hintEvery) { S.hinted++; speak(want); }
  }
}
function trRoll() {
  const S = trS; S.rollDir = -S.d; S.runTo = trEnd(-S.d);                           // מאחורי הטרול – לקצה שבגבו
  if (!S.stones.some(st => Math.abs(st - (S.runTo + S.d * 3)) < 2)) S.stones.push(S.runTo + S.d * 3);   // אבן מחכה שם
  S.roll0 = S.n; trN('dash');
}
function trSmack() {
  const S = trS, o = S.o; sfx('thud'); trT('smack');
  S.kn = S.d; trN('knocked'); S.has = 0; S.fly = null;
  if (state === 'play') { o.hit = false; onHit(o); if (nextType === 'troll') nextType = null; o.hit = false; shakeT = 0; }   // בלי רעידת מסך
}
function trHead() { const S = trS; return [S.x + S.d * 7, -28]; }                 // נקודת הראש (יחסית לקרקע)
function trHit() {
  const S = trS; S.hp--; sfx('hit');
  const hd = trHead(); floatText(S.o.x + hd[0], GROUND + hd[1] - 4, S.hp > 0 ? 'BONK!' : 'BONK! ⭐', '#ca8a04');
  trT('hurt');
}
function trPhysics() { if (!trS) return false; vy = 0; py = 0; return true; }
function trSpeed() { return trS ? 0 : null; }

/* ---------- פקודות ---------- */
function trCmd(word) {
  if (!trS || !['roll', 'pick up', 'throw'].includes(word)) return false;
  const S = trS, dist = Math.abs(S.x - S.n);
  if (word === 'roll') {
    if (S.np === 'idle' && S.tp === 'charge') { if (dist <= TR.rollAt && dist >= TR.rollMin) trRoll(); else if (dist > TR.rollAt) S.held = 'roll'; }
    else if (S.np === 'idle' && S.tp === 'meet') S.held = 'roll';
  } else if (word === 'pick up') {
    if (S.np === 'pickWait') { trN('picking'); sfx('pop'); }
  } else if (word === 'throw') {
    if (S.np === 'armed') trN('throwing');
  }
  return true;
}
function trExpected() {
  if (!trS) return null;
  const S = trS;
  return S.np === 'idle' && (S.tp === 'charge' || S.tp === 'meet') ? ['roll'] : S.np === 'pickWait' ? ['pick up'] : S.np === 'armed' ? ['throw'] : [];
}
function trAuto() {
  const S = trS; if (!S) return;
  const w = (trExpected() || [])[0]; if (!w) return;
  const dist = Math.abs(S.x - S.n);
  if (w === 'roll' ? S.tp === 'charge' && dist <= TR.rollAt - 6 : w === 'throw' ? S.tp === 'approach' && dist < 40 : S.nt > 0.6) command(w, 'auto');
}
function trTap() { const S = trS; if (!S) return null; return (trExpected() || [])[0] || null; }

/* ---------- ציור ---------- */
function trTrollOpts(S) {
  const o = { gy: GROUND + 0.6, club: S.club >= 0.5 ? S.club : 0, look: S.look, hurt: S.hurt };
  if (S.sit) { o.sit = 1; o.hurt = 1; o.noClub = 1; delete o.club; return o; }
  o.P = trSample(S.ph);
  return o;
}
function drawTrollScene(o) {
  const S = trS && trS.o === o ? trS : null;
  if (!S) { drawTroll(ctx, o.x + TR.e1, -1, { gy: GROUND + 0.6, P: trSample(0.3), club: 0 }); return; }   // מחכה בקצה הזירה
  const opt = trTrollOpts(S);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(o.x + S.x, GROUND + 0.5, 11, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  for (const st of S.stones) trStone(o.x + st, GROUND - 0.9, 1.15);
  drawTroll(ctx, o.x + S.x, S.d, opt);
  const hx = o.x + S.x, hy = GROUND - 44;                                             // פס חיים
  ctx.fillStyle = 'rgba(30,41,59,.75)'; ctx.beginPath(); ctx.roundRect(hx - 8, hy, 16, 2.6, 1); ctx.fill();
  for (let i = 0; i < TR.hp; i++) { ctx.fillStyle = i < S.hp ? '#ef4444' : '#475569'; ctx.beginPath(); ctx.roundRect(hx - 7.4 + i * 5, hy + 0.55, 4.4, 1.5, 0.6); ctx.fill(); }
  if (S.look) { ctx.fillStyle = '#1e293b'; ctx.font = '800 6px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', hx + Math.sin(S.tt * 3) * 3, GROUND - 46); }
  if (S.hurt) { ctx.fillStyle = '#facc15'; ctx.font = '3px system-ui'; ctx.textAlign = 'center'; const hd = trHead();
    for (let k = 0; k < 4; k++) { const a = S.tt * 5 + k / 4 * Math.PI * 2; ctx.fillText('★', o.x + hd[0] + Math.cos(a) * 4.5, GROUND + hd[1] - 4 + Math.sin(a) * 1.4); } }
  if (S.fly) {                                                                      // האבן טסה ישר ומהר אל הראש, עם שובל
    const f = S.fly, x = trL(f.x0, f.x1, f.t), y = trL(f.y0, f.y1, f.t);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(o.x + trL(f.x0, f.x1, f.t - 0.35), GROUND + trL(f.y0, f.y1, f.t - 0.35)); ctx.lineTo(o.x + x, GROUND + y); ctx.stroke();
    trStone(o.x + x, GROUND + y, 1);
  }
}
function trStone(x, y, r) { ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a8a29e'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
const TR_BALL = { hipY: -2.6, lean: 0.55, spine: 0.95, headTilt: 1.0, bob: 0, legs: [[2.85, 0.0], [3.0, 0.15]], arms: [[1.9, 1.35], [2.1, 1.5]] };   // כדור מכווץ
function trNinjaPose(S, now) {
  if (S.np === 'roll') return Object.assign(poseIdle(0), TR_BALL);
  if (S.np === 'run' || S.np === 'dash' || S.np === 'exit') return poseRun(now * 13);
  if (S.np === 'picking') { const k = trE(S.nt / 0.25); const P = poseIdle(now);
    return Object.assign(P, { hipY: trL(-4.6, -3.4, k), lean: trL(0.05, 0.55, k), spine: 0.25 * k, legs: [[trL(-0.15, -0.5, k), trL(-0.1, -2.0, k)], [trL(0.18, 1.35, k), trL(0.12, -0.1, k)]], arms: [[0.6 * k, 0.9 * k], [0.35, 0.55]] }); }
  if (S.np === 'throwing') {                                                         // תנופה: מהמותן אל מאחורי הראש – ואז נמתחת קדימה אל ראש הטרול
    const hd = S.x !== undefined ? trHead() : [S.n + 30, -28], aim = Math.atan2(Math.abs(hd[0] - S.n), hd[1] + 11) - Math.PI * 2;
    const P = poseIdle(now), t = S.nt, LOW = [0.45, 1.25], BACK = [-2.6, -3.15], END = [aim, aim];
    const L2 = (A, B, k) => [trL(A[0], B[0], k), trL(A[1], B[1], k)];
    let arm, lean;
    if (t < 0.26) { const k = trE(t / 0.26); arm = [trL(LOW[0], BACK[0] + 2 * Math.PI * 0, k), trL(LOW[1], BACK[1], k)]; arm = L2(LOW, BACK, k); lean = trL(0.05, -0.12, k); }
    else { const k = trE((t - 0.26) / 0.14); arm = L2(BACK, END, k); lean = trL(-0.12, 0.3, k); }
    P.arms = [[trL(0.3, -0.4, t / 0.4), 0.3], arm]; P.lean = lean; return P; }
  if (S.np === 'knocked') return poseAir(false, 0.5);
  if (S.np === 'win') { const P = poseIdle(now); P.arms = [[-0.3, 0.2], [2.9, 3.0]]; return P; }   // יד מורמת – ניצחון
  if (S.np === 'armed') { const P = poseIdle(now); P.arms = [P.arms[0], [0.45, 1.25 + Math.sin(now * 3) * 0.08]]; return P; }   // האבן ביד, נמוך – מחכה לפקודה
  return poseIdle(now);
}
function trDrawNinja() {
  const S = trS; if (!S) return false;
  const now = performance.now() / 1000, o = S.o, fx = o.x + S.n, fy = GROUND, P = trNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  if (S.np === 'roll') {                                                            // כדור מתגלגל, צמוד לקרקע
    const rot = (S.n - S.roll0) / 2.8;
    ctx.save(); ctx.translate(fx, fy - 2.9); ctx.rotate(rot);
    drawFigure({ fx: 0, fy: 2.9, facing: S.rollDir, scale: 0.92, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() }); ctx.restore();
    if (Math.abs(S.n - S.x) < 12) drawTroll(ctx, o.x + S.x, S.d, Object.assign(trTrollOpts(S), { only: 'frontleg' }));   // הרגל הקרובה של הטרול מעל הנינג'ה
  } else {
    drawFigure({ fx, fy, facing: S.nf, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    playerHand = figHand(fx, fy, S.nf, 1, P, 1);
    if (S.has) trStone(playerHand[0], playerHand[1], 1);
  }
  return true;
}

sceneAdd({
  type: 'troll', word: 'troll', label: true,
  listen: ['roll', 'pick up', 'throw'],
  active: () => !!trS,
  reset: () => { trS = null; },
  setup: trSetup, afterGap: 0.8, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + TR.e0 + PLAYER.w / 2,
  draw: drawTrollScene, drawNinja: trDrawNinja,
  update: trUpdate, physics: trPhysics, speed: trSpeed,
  expected: trExpected, cmd: trCmd, auto: trAuto, tap: trTap,
  intro: { banner: 'ROLL · PICK UP · THROW!', time: 34,
           demo: () => { const o = { type: 'troll' }; trSetup(o); o.x = trNX() - TR.e0; obstacles.push(o); } }
});
