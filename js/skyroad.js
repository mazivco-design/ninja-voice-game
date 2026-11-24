/* ninja-voice-game – skyroad.js
   דרך השמיים (שלב בפיתוח, 2026-11-24): עולם בלי קרקע. הקרקע נגמרת בצוק, ומשם רק איים מרחפים, ענני אבן, חבלים ובלון,
   והמסלול יורד עמוק ועולה גבוה. המצלמה זזה חופשי גם מתחת לגובה ההתחלה (camFree), והשלב מצייר שמיים משלו (drawSky):
   למעלה השמיים מתכהים ומופיעים כוכבים, למטה הם נעשים ורודים־כתומים כמו שקיעה, ושכבות עננים חולפות לפי הגובה.
   המילים: JUMP, DOWN (גלישה בחבל), OPEN (מצנח), CLIMB (גפן), SWING (חבל), RIDE (בלון). בסוף נוחתים שוב על קרקע.
   אם הילד לא אומר את המילה – הנינג'ה מחכה בקצה המשטח, לא נופל. אחרי שתיקה המשחק אומר את המילה.
   גבהים בקובץ: h חיובי למעלה מהקרקע (על המסך: GROUND - h).
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const SK = { e0: 10, edge0: 14, edge1: 372, w: 410, walkV: 13, climbV: 13, hint: 3.5, hintEvery: 5, coins: 8 };
// המשטחים: [x0, x1, h, סוג]
const SK_ISLES = [
  [22, 36, -12, 'isle'], [45, 56, -26, 'isle'], [61, 76, -64, 'isle'], [84, 95, -72, 'cloud'], [128, 148, -142, 'isle'],
  [156, 168, -96, 'isle'], [168, 183, -56, 'isle'], [213, 228, -44, 'cloud'], [242, 258, 40, 'isle'], [258, 272, 78, 'isle']
];
// הדרך: כל צעד – איפה מחכים (x, h), המילה, ואיך עוברים
const SK_STEPS = [
  { at: [SK.e0, 0], w: 'jump', kind: 'hop', to: [24.5, -12], T: 0.75, peak: 6 },
  { at: [34, -12], w: 'jump', kind: 'hop', to: [47.5, -26], T: 0.75, peak: 6 },
  { at: [54, -26], w: 'down', kind: 'rope', rope: 58, to: [63.5, -64] },
  { at: [74, -64], w: 'jump', kind: 'hop', to: [86.5, -72], T: 0.7, peak: 5 },
  { at: [93, -72], w: 'open', kind: 'para', to: [133, -142], T: 6.0 },
  { at: [142, -142], w: 'jump', kind: 'spring', to: [158.5, -96], T: 1.1, peak: 14 },
  { at: [166.2, -96], w: 'climb', kind: 'vine', vine: 168.6, to: [171.5, -56] },
  { at: [181, -56], w: 'swing', kind: 'swing', pivot: [197, -8], L: 36, a0: -0.46, a1: 0.66, to: [216.5, -44] },
  { at: [221, -44], w: 'ride', kind: 'balloon', to: [246.5, 40], T: 4.0 },
  { at: [256.2, 40], w: 'climb', kind: 'vine', vine: 258.6, to: [261.5, 78] },
  { at: [270, 78], w: 'open', kind: 'para', to: [382, 0], T: 9.0 }
];
const SK_CHIP = { jump: 'JUMP', down: 'DOWN', open: 'OPEN', climb: 'CLIMB', swing: 'SWING', ride: 'RIDE' };
let skS = null;
const skE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const skL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function skNX() { return PLAYER.x + 4; }
function skSetup(o) { o.w = SK.w; }
function skStart(o) {
  const coins = [];
  for (const [x, h] of [[30, -9], [51, -23], [70, -61], [100, -80], [108, -95], [116, -110], [124, -125], [162, -93], [176, -53], [205, -48], [232, -10], [238, 15], [266, 81], [285, 68], [300, 57], [315, 45], [330, 33], [345, 22], [360, 12]]) coins.push({ x, h, got: 0 });
  skS = { o, i: 0, p: 'wait', t: 0, idle: 0, hinted: 0, held: null, nx: SK.e0, h: 0, rot: 0, chute: 0, sway: 0, squash: 0, coins, chipOk: 0, chipW: null,
          rope: SK_STEPS[7].a0, ball: { x: 224.5, h: -44 }, done: 0 };
}
function skP(p) { const S = skS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }
function skStep() { return SK_STEPS[skS.i]; }

/* ---------- העדכון ---------- */
function skUpdate(dt, pb) {
  if (!skS) {
    const o = obstacles.find(o => o.type === 'skyroad' && !o.passed && skNX() >= o.x + SK.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    skStart(o); return;
  }
  const S = skS, o = S.o; S.t += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.squash > 0) S.squash -= dt; S.sway += dt;
  if (!obstacles.includes(o)) { skS = null; return; }
  const demo = state !== 'play', st = skStep();
  if (S.p === 'wait') {
    if (demo && S.t > 0.7) { command(st.w, 'demo'); speak(st.w); }
    if (S.held === st.w) { S.held = null; skChipOk(st.w); skP('move'); S.from = [S.nx, S.h]; sfx(st.kind === 'hop' || st.kind === 'spring' ? 'jump' : 'swish'); }
    else if (!demo && state === 'play') { S.idle += dt; if (S.idle > SK.hint + S.hinted * SK.hintEvery) { S.hinted++; speak(st.w); } }
  } else if (S.p === 'move') skMove(st, dt);
  else if (S.p === 'walk') {                                                      // הולכים עד קצה המשטח הבא
    const next = SK_STEPS[S.i];
    if (!next) { S.nx += 15 * dt; if (o.x + SK.edge1 < -20 || S.t > 8) { skFinish(); return; } }
    else { S.nx = Math.min(next.at[0], S.nx + SK.walkV * dt); if (S.nx >= next.at[0]) skP('wait'); }
  }
  // העולם זז כשהנינג'ה מתקדם
  const over = o.x + S.nx - (skNX() + 14); if (over > 0) ropeShiftBy(over);
  for (const c of S.coins) if (!c.got && Math.abs(c.x - S.nx) < 3 && c.h > S.h - 1.5 && c.h < S.h + 14) { c.got = 1; sfx('coin'); }
}
function skMove(st, dt) {
  const S = skS, t = S.t, [x0, h0] = S.from, [x1, h1] = st.to;
  const arrive = () => { S.nx = x1; S.h = h1; S.rot = 0; sfx('land'); S.i++; skP('walk'); };
  if (st.kind === 'hop' || st.kind === 'spring') {
    if (st.kind === 'spring' && t < 0.18) { S.squash = 0.35; return; }          // הפטרייה נלחצת – ואז מעיפה
    const tt = st.kind === 'spring' ? t - 0.18 : t, k = Math.min(1, tt / st.T);
    S.nx = skL(x0, x1, k); S.h = skL(h0, h1, k) + Math.sin(k * Math.PI) * st.peak;
    if (k >= 1) arrive();
  } else if (st.kind === 'rope') {                                                // גלישה בחבל: צעד אל החבל, ירידה, צעד אל המשטח
    const d = h0 - h1, Td = d / 26;
    if (t < 0.35) { S.nx = skL(x0, st.rope - 0.8, skE(t / 0.35)); S.h = h0 + Math.sin(t / 0.35 * Math.PI) * 1.5; }
    else if (t < 0.35 + Td) { S.nx = st.rope - 0.8; S.h = skL(h0, h1 + 0.5, (t - 0.35) / Td); }
    else { const k = skE((t - 0.35 - Td) / 0.35); S.nx = skL(st.rope - 0.8, x1, k); S.h = h1 + Math.sin(k * Math.PI) * 1.5; if (k >= 1) arrive(); }
  } else if (st.kind === 'vine') {                                                // טיפוס בגפן עד המשטח שמעל
    const Tc = (h1 - h0) / SK.climbV;
    if (t < Tc) { S.nx = st.vine - 1.6; S.h = skL(h0, h1, t / Tc); }
    else { const k = Math.min(1, (t - Tc) / 0.45); S.nx = skL(st.vine - 1.6, x1, k); S.h = h1 + Math.sin(k * Math.PI) * 2.5; if (k >= 1) arrive(); }
  } else if (st.kind === 'para') {                                               // מצנח: ריחוף ארוך עם נדנוד
    const k = Math.min(1, t / st.T); S.chute = skE(t / 0.5);
    S.nx = skL(x0, x1, k); S.h = t < 0.5 ? h0 + Math.sin(t / 0.5 * Math.PI) * 2 : skL(h0, h1, (t - 0.5) / (st.T - 0.5));
    if (k >= 1) { S.chute = 0; arrive(); }
  } else if (st.kind === 'swing') {                                              // חבל מעל התהום: נדנוד ושחרור אל המשטח
    const T = 1.5;
    if (t < T) { S.rope = skL(st.a0, st.a1, skE(t / T)); const e = skRopeEnd(st, S.rope); S.nx = e[0] - 0.6; S.h = e[1] - 13; S.rx = S.nx; S.rh = S.h; }
    else { const k = Math.min(1, (t - T) / 0.55); S.rope = skL(st.a1, 0, skE((t - T) / 1.2)); S.nx = skL(S.rx, x1, k); S.h = skL(S.rh, h1, k) + Math.sin(k * Math.PI) * 3; if (k >= 1) arrive(); }
  } else if (st.kind === 'balloon') {                                            // בלון: קפיצה לסל, עלייה, קפיצה החוצה
    const B = S.ball, bx0 = 224.5, bh0 = -44;
    if (t < 0.45) { const k = t / 0.45; S.nx = skL(x0, bx0, k); S.h = skL(h0, bh0 + 2.4, k) + Math.sin(k * Math.PI) * 4; }
    else if (t < 0.45 + st.T) { const k = skE((t - 0.45) / st.T); B.x = skL(bx0, x1 - 6, k); B.h = skL(bh0, h1 - 2.4, k); S.nx = B.x; S.h = B.h + 2.4; }
    else { const k = Math.min(1, (t - 0.45 - st.T) / 0.45); S.nx = skL(x1 - 6, x1, k); S.h = h1 + Math.sin(k * Math.PI) * 3; if (k >= 1) arrive(); }
  }
}
function skFinish() {
  const S = skS, o = S.o; cleared(o); skS = null;
  if (mode === 'journey' && state === 'play') { picked += SK.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + SK.coins + ' 🟡', '#ca8a04'); }
}
function skRopeEnd(st, a) { return [st.pivot[0] + Math.sin(a) * st.L, st.pivot[1] - Math.cos(a) * st.L]; }
function skPhysics() { if (!skS) return false; vy = 0; py = 0; return true; }
function skSpeed() { return skS ? 0 : null; }
function skCam(o) {                                                               // המצלמה: אחרי הנינג'ה, קצת מתחת אליו – רואים מה למטה
  const S = skS; if (!S || S.o !== o) return 0;
  if (S.i >= SK_STEPS.length && S.h <= 0.5) return 0;
  return S.h - 12;
}

/* ---------- פקודות ---------- */
function skCmd(word) {
  if (!skS || !SK_CHIP[word]) return false;
  const S = skS, st = skStep();
  if (st && st.w === word && (S.p === 'wait' || S.p === 'walk')) { S.held = word; if (S.p === 'walk') skChipOk(word); }
  return true;
}
function skChipOk(w) { skS.chipOk = 1.1; skS.chipW = w; }
function skExpected() { const S = skS; if (!S) return null; return S.p === 'wait' && skStep() ? [skStep().w] : []; }
function skAuto() { const S = skS; if (!S) return; const w = (skExpected() || [])[0]; if (w && S.idle > 0.7) command(w, 'auto'); }
function skTap() { return skS ? (skExpected() || [])[0] || null : null; }

/* ---------- השמיים ---------- */
function skMix(a, b, k) {                                                         // ערבוב שני צבעים #rrggbb
  k = Math.max(0, Math.min(1, k)); const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',') + ')';
}
function skSkyCols(c) {                                                           // c = גובה המצלמה: למעלה כהה, למטה שקיעה
  if (c >= 0) { const k = Math.min(1, c / 110); return [skMix('#7dd3fc', '#0b1640', k), skMix('#e0f2fe', '#2547a8', k)]; }
  const k = Math.min(1, -c / 140); return [skMix('#7dd3fc', '#c084fc', k), skMix('#e0f2fe', '#fdba74', k)];
}
function skSkyFill(o, left, right, top, bottom) {                                // צבע השמיים, כוכבים ושכבות עננים – בתוך החיתוך הנוכחי
  const c = camDY, now = performance.now() / 1000;
  const [ca, cb] = skSkyCols(c), g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, ca); g.addColorStop(1, cb); ctx.fillStyle = g; ctx.fillRect(left, top, right - left, bottom - top);
  const ga = ctx.globalAlpha, st = Math.max(0, Math.min(1, (c - 40) / 60));       // כוכבים גבוה למעלה
  if (st > 0) for (let i = 0; i < 70; i++) { const sx = left + hash(i) * (right - left), sy = top + hash(i + 30) * (bottom - top);
    ctx.globalAlpha = ga * st * (0.4 + 0.6 * Math.abs(Math.sin(now * (0.7 + hash(i + 5)) + i))); ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 0.6, 0.6); }
  ctx.globalAlpha = ga;
  // שכבות עננים: רחוקות זזות לאט, קרובות מהר – גם למעלה־למטה לפי הגובה
  for (const [p, sz, al, sp] of [[0.2, 7, 0.45, 46], [0.45, 10, 0.6, 58], [0.8, 14, 0.75, 76]]) {
    const ox = o.x * p, oy = -c * (1 - p);
    const ix0 = Math.floor((left - ox) / sp) - 1, ix1 = Math.ceil((right - ox) / sp) + 1, iy0 = Math.floor((top - oy) / (sp * 0.7)) - 1, iy1 = Math.ceil((bottom - oy) / (sp * 0.7)) + 1;
    for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) {
      const hh = hash(ix * 31 + iy * 17 + p * 100); if (hh < 0.45) continue;
      const cx = ox + ix * sp + hash(ix * 7 + iy) * sp * 0.6, cy = oy + iy * sp * 0.7 + hash(iy * 13 + ix) * 10, s = sz * (0.7 + hh * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,' + al * (c > 60 ? 0.6 : 1) + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy, s, s * 0.35, 0, 0, Math.PI * 2); ctx.ellipse(cx - s * 0.4, cy - s * 0.18, s * 0.45, s * 0.3, 0, 0, Math.PI * 2); ctx.ellipse(cx + s * 0.35, cy - s * 0.22, s * 0.5, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function skDrawSky(o, left, right, top, bottom) {
  // בין שני הצוקים – תמיד שמיים. מחוץ להם (הקרקע של ההתחלה והסוף) השמיים מכסים את הנוף לפי הגובה:
  // כשהמצלמה רחוקה מגובה הקרקע לא רואים קרקע בכלל, והיא מופיעה בהדרגה כשמתקרבים אליה
  const e0 = o.x + SK.edge0, e1 = o.x + SK.edge1, fade = Math.min(1, Math.abs(camDY) / 30);
  const x0 = Math.max(left, e0), x1 = Math.min(right, e1);
  if (x1 > x0) { ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bottom - top); ctx.clip(); skSkyFill(o, left, right, top, bottom); ctx.restore(); }
  if (fade > 0.01) {
    ctx.save(); ctx.globalAlpha = fade; ctx.beginPath();
    if (e0 > left) ctx.rect(left, top, e0 - left, bottom - top);
    if (e1 < right) ctx.rect(e1, top, right - e1, bottom - top);
    ctx.clip(); skSkyFill(o, left, right, top, bottom); ctx.restore();
  }
  // קירות הצוק בשני הקצוות – הקרקע נגמרת ומתחילה (נעלמים יחד עם הקרקע כשהמצלמה רחוקה)
  ctx.save(); ctx.globalAlpha = 1 - fade;
  for (const [ex, dir] of [[e0, -1], [e1, 1]]) if (ex > left - 10 && ex < right + 10 && fade < 0.99) {
    ctx.fillStyle = '#6b5440'; ctx.beginPath(); ctx.moveTo(ex, GROUND); ctx.lineTo(ex + dir * 2, GROUND + 14); ctx.lineTo(ex - dir * 1, GROUND + 30); ctx.lineTo(ex + dir * 3, bottom + 5); ctx.lineTo(ex + dir * 10, bottom + 5); ctx.lineTo(ex + dir * 10, GROUND); ctx.fill();
  }
  ctx.restore();
}

/* ---------- המשטחים ---------- */
function skIsle(x0, x1, h, kind, seed) {
  const g = GROUND - h, w = x1 - x0, cx = (x0 + x1) / 2;
  if (kind === 'cloud') {                                                         // ענן אבן: משטח לבן־אפרפר, תחתית מעוגלת
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(cx, g + 2, w * 0.55, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; for (const [dx, r] of [[-0.3, 0.32], [0, 0.4], [0.3, 0.3]]) { ctx.beginPath(); ctx.ellipse(cx + dx * w, g + 0.6, w * r, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  ctx.fillStyle = '#7c5a3a'; ctx.beginPath(); ctx.moveTo(x0 - 1, g + 0.5);          // אי מרחף: קונוס סלע עם שורשים
  ctx.quadraticCurveTo(x0 + w * 0.1, g + w * 0.35, cx - w * 0.08, g + w * 0.55 + 2); ctx.lineTo(cx + w * 0.05, g + w * 0.62 + 2);
  ctx.quadraticCurveTo(x1 - w * 0.1, g + w * 0.3, x1 + 1, g + 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5f4630'; ctx.beginPath(); ctx.moveTo(cx, g + 1); ctx.quadraticCurveTo(x1 - w * 0.15, g + w * 0.25, cx + w * 0.05, g + w * 0.62 + 2); ctx.lineTo(x1 + 1, g + 0.5); ctx.fill();
  ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 0.3;
  for (let k = 0; k < 3; k++) { const rx = x0 + w * (0.25 + k * 0.25); ctx.beginPath(); ctx.moveTo(rx, g + 2); ctx.quadraticCurveTo(rx + 1, g + 5 + hash(seed + k) * 4, rx - 0.5, g + 7 + hash(seed + k + 9) * 5); ctx.stroke(); }
  ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.roundRect(x0 - 1.2, g - 0.8, w + 2.4, 2.2, 1.1); ctx.fill();
  ctx.fillStyle = '#22c55e'; for (let x = x0; x < x1; x += 1.7) { ctx.beginPath(); ctx.moveTo(x, g - 0.5); ctx.lineTo(x + 0.4, g - 1.8); ctx.lineTo(x + 0.8, g - 0.5); ctx.fill(); }
}
function skChute(x, y, k, sway) {
  if (k <= 0.02) return;
  const cx = x + Math.sin(sway) * 1.2, cy = y - 22 * k, r = 9 * k;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.22;
  for (const s of [-1, -0.35, 0.35, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r, cy); ctx.lineTo(x + s * 0.8, y - 11); ctx.stroke(); }
  const cols = ['#ef4444', '#facc15', '#3b82f6', '#facc15', '#ef4444'];
  for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.ellipse(cx, cy, r, r * 0.6, 0, Math.PI + i / 5 * Math.PI, Math.PI + (i + 1) / 5 * Math.PI); ctx.closePath(); ctx.fill(); }
}
function drawSkyRoad(o) {
  const S = skS && skS.o === o ? skS : null, now = performance.now() / 1000, X = x => o.x + x, Y = h => GROUND - h;
  SK_ISLES.forEach(([a, b, h, k], i) => skIsle(X(a), X(b), h, k, i * 11));
  // חבל הגלישה למטה – קשור לעמוד בקצה האי
  const r = SK_STEPS[2]; ctx.fillStyle = '#a16207'; ctx.fillRect(X(r.rope) - 2, Y(r.at[1]) - 4, 0.9, 4);
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(X(r.rope) - 1.5, Y(r.at[1]) - 3.5); ctx.quadraticCurveTo(X(r.rope) + 0.5, Y(r.at[1]) - 2, X(r.rope), Y(r.at[1]) + 2);
  ctx.lineTo(X(r.rope) + Math.sin(now) * 0.3, Y(r.to[1]) - 1); ctx.stroke();
  // פטריית הקפיצה
  { const x = X(146), g = Y(-142), sq = S && S.squash > 0 ? Math.sin(S.squash / 0.35 * Math.PI) * 0.35 : 0;
    ctx.fillStyle = '#fef3c7'; ctx.fillRect(x - 1.2, g - 3.5 + sq * 2, 2.4, 3.5 - sq * 2);
    ctx.save(); ctx.translate(x, g - 3.5 + sq * 2); ctx.scale(1 + sq * 0.4, 1 - sq); ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.ellipse(0, 0, 4.6, 2.6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; for (const [dx, dy, rr] of [[-2.2, -1.1, 0.6], [0.6, -1.9, 0.7], [2.4, -0.9, 0.5]]) { ctx.beginPath(); ctx.arc(dx, dy, rr, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  // גפנים – תלויות מהאי שמעל
  for (const st of SK_STEPS) if (st.kind === 'vine') {
    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(X(st.vine), Y(st.to[1]) + 1);
    for (let h = st.to[1]; h >= st.at[1] - 2; h -= 2) ctx.lineTo(X(st.vine) + Math.sin(h * 0.5 + now * 0.8) * 0.45, Y(h)); ctx.stroke();
    ctx.fillStyle = '#22c55e'; for (let h = st.at[1]; h < st.to[1]; h += 3.2) { const s = (h * 7) % 2 > 1 ? 1 : -1; ctx.beginPath(); ctx.ellipse(X(st.vine) + s * 0.9, Y(h), 0.95, 0.45, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  // חבל הנדנוד – תלוי מכדור־עוגן מרחף
  { const st = SK_STEPS[7], a = S ? S.rope : st.a0, e = skRopeEnd(st, S && (S.i === 7 || S.i === 8) ? a : st.a0 * 0.2 + Math.sin(now) * 0.05);
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(X(st.pivot[0]), Y(st.pivot[1]) - 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(X(st.pivot[0]), Y(st.pivot[1])); ctx.lineTo(X(e[0]), Y(e[1])); ctx.stroke(); }
  // הבלון
  { const B = S ? S.ball : { x: 224.5, h: -44 }, bx = X(B.x), by = Y(B.h), bob = Math.sin(now * 1.5) * 0.4;
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(bx - 2.4, by - 2.4 + bob, 4.8, 2.6, 0.5); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.25; ctx.beginPath(); for (const s of [-2, 2]) { ctx.moveTo(bx + s, by - 2.4 + bob); ctx.lineTo(bx + s * 2.2, by - 14 + bob); } ctx.stroke();
    const cols = ['#f97316', '#facc15', '#f97316', '#facc15'];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.ellipse(bx, by - 20 + bob, 7.5 * (1 - i / 4), 8.5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(bx - 3, by - 23 + bob, 1.5, 3, 0.3, 0, Math.PI * 2); ctx.fill(); }
  // מטבעות
  for (const c of (S ? S.coins : [])) if (!c.got) { const sx = Math.max(0.2, Math.abs(Math.cos(now * 4 + c.x * 0.2)));
    ctx.save(); ctx.translate(X(c.x), Y(c.h) + Math.sin(now * 5 + c.x) * 0.4); ctx.scale(sx, 1);
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}
function drawSkyRoadFront(o) {
  const S = skS && skS.o === o ? skS : null; if (!S || state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (skExpected() || [])[0];
  if (!w) return;
  const txt = SK_CHIP[w] || w.toUpperCase(), y = 24 - camDY, sz = 6;
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
function skNinjaPose(S, now) {
  const st = skStep(), t = S.t;
  if (S.p === 'walk') return poseRun(S.nx * 0.5);
  if (S.p === 'move' && st) {
    if (st.kind === 'hop' || st.kind === 'spring') return poseAir(true, Math.min(1, t / 0.6));
    if (st.kind === 'rope') { const P = poseIdle(now); P.arms = [[2.9, 3.0], [3.0, 3.1]]; P.legs = [[0.2, 0.1], [0.35, 0.2]]; return P; }
    if (st.kind === 'vine') return poseClimb(now, (S.h / 6) % 1);
    if (st.kind === 'para' || st.kind === 'balloon') { const P = poseIdle(now); P.arms = st.kind === 'para' ? [[2.7, 3.0], [2.8, 3.05]] : [[0.8, 1.6], [0.9, 1.7]]; return P; }
    if (st.kind === 'swing') { const P = poseIdle(now); P.arms = [[3.0, 3.1], [3.05, 3.15]]; P.legs = [[0.25 + S.rope * 0.3, 0.1], [0.45 + S.rope * 0.3, 0.3]]; P.hipY = -4.8; return P; }
  }
  const P = poseIdle(now);
  if (st) { const dh = st.to[1] - st.at[1]; P.headTilt = dh > 0 ? -0.35 : 0.3; if (dh < 0) P.lean = 0.08; }   // מביט אל המשטח הבא – למעלה או למטה
  return P;
}
function skDrawNinja() {
  const S = skS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, fy = GROUND - S.h, P = skNinjaPose(S, now);
  if (S.p !== 'move') { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, fy + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  if (S.chute > 0) skChute(fx, fy, S.chute, S.sway * 1.6);
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'skyroad', word: 'skyroad', label: true,
  listen: ['jump', 'down', 'open', 'climb', 'swing', 'ride'],
  active: () => !!skS,
  reset: () => { skS = null; },
  setup: skSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + SK.e0 + PLAYER.w / 2,
  draw: drawSkyRoad, drawFront: drawSkyRoadFront, drawNinja: skDrawNinja, drawSky: skDrawSky,
  update: skUpdate, physics: skPhysics, speed: skSpeed, camLift: skCam, camFree: true,
  expected: skExpected, cmd: skCmd, auto: skAuto, tap: skTap,
  intro: { banner: 'JUMP · DOWN · OPEN · CLIMB · SWING · RIDE!', time: 60,
           demo: () => { const o = { type: 'skyroad' }; skSetup(o); o.x = skNX() - SK.e0; obstacles.push(o); } }
});
