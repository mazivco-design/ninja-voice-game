/* ninja-voice-game – boar.js
   חזיר בר ביער (HIDE + GO): שביל ביער עמוק עם חמישה עצים עבים ורווחים גדולים ביניהם.
   חזיר בר רועה עשב בצד השני של היער, פונה אל הנינג'ה. הוא אוכל עם הראש למטה, ומדי פעם האוזניים זזות,
   הוא מרים את הראש ומסתכל – ואז מתקדם כמה צעדים לכיוון הנינג'ה וחוזר לאכול.
   הנינג'ה מתגנב מעץ לעץ: GO כשהחזיר אוכל → רץ בשקט לעץ הבא. האוזניים זזות → HIDE מאחורי הגזע.
   GO כשהאוזניים זזות / כשהוא מסתכל, או לא מתחבאים בזמן → החזיר רואה אותו, מסתער ומפיל אותו (כוכב, לא לב).
   באמצע היער הם נפגשים – כשהחזיר מאחורי הנינג'ה, הוא כבר לא רואה אותו, והנינג'ה יוצא מהיער.
   היער מצויר בשכבות (רחוק בערפל, אמצע, השביל) – תחושת עומק.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const BOAR = { tree0: 24, gap: 40, trees: 5, start: 104, adv: 12, stepT: 1.6, standGap: 5, walkV: 11, duckT: 0.35,
               waitMin: 1.6, waitMax: 3.0, lookT: 1.8, chargeT: 0.7, fallT: 1.1, returnT: 1.3, knock: 7, passBy: 18, coins: 4, fade: 55 };
const BOAR_EARS = { easy: 2.0, medium: 1.5, hard: 1.15 };                         // כמה זמן יש להגיד HIDE מרגע שהאוזניים זזות
let boarS = null;   // { o, np: ninja phase, nt, bp: boar phase, bt, bo: מקום החזיר (יחסית ל-o.x), i: העץ שאליו הולכים, warnAt, miss, hinted }

function boarSetup(o) { o.w = BOAR.tree0 + BOAR.gap * (BOAR.trees - 1) + 30; }
function boarTreeX(o, i) { return o.x + BOAR.tree0 + BOAR.gap * i; }             // מרכז הגזע
function boarX(o) { return o.x + (boarS && boarS.o === o ? boarS.bo : BOAR.start); }   // איפה החזיר עכשיו
function boarStandR(o, i) { return boarTreeX(o, i) - BOAR.standGap; }             // הקצה הימני של הנינג'ה כשהוא עומד ליד העץ
function boarHideDX() { return PLAYER.w + BOAR.standGap - PLAYER.w / 2; }        // כמה זזים כדי להיות בדיוק מאחורי הגזע
function boarEarsT() { return BOAR_EARS[diffKey] || 1.6; }
function boarBusy() { return !!boarS; }
function boarWait() { return BOAR.waitMin + Math.random() * (BOAR.waitMax - BOAR.waitMin); }
function boarHeadDown() { return boarS && (boarS.bp === 'graze' || boarS.bp === 'step'); }   // אוכל / הולך עם הראש למטה – לא רואה

// מהירות העולם בזמן הסצנה
function boarSpeed() {
  if (!boarS) return null;
  const S = boarS, p = S.np;
  if (p === 'walk') return BOAR.walkV;
  if (p === 'exit') return lerp(BOAR.walkV, speed, Math.min(1, S.nt / 1.5));        // עבר את החזיר – מאיץ בהדרגה
  if (p === 'duck') return boarHideDX() / BOAR.duckT;
  if (p === 'fall') return S.nt < 0.4 ? -BOAR.knock / 0.4 : 0;                    // נהדף אחורה
  return 0;
}

function boarSpotted() {                                                             // החזיר ראה את הנינג'ה!
  const S = boarS, goB = p => { S.bp = p; S.bt = 0; };
  goB('charge'); S.np = 'spotted'; S.nt = 0; sfx('thud'); S.miss++;
  burst(boarX(S.o) - 14, GROUND - 6, 'rgba(255,255,255,.8)', 5, 10);              // נחירה
  flash = { text: '🐗 GO when he eats · HIDE when the ears move!', t: 2 };
  if (state === 'play') { hits++; if (typeof voiceMark === 'function') voiceMark('hit'); renderHud(); }
}

function boarUpdate(dt, pb) {
  if (!boarS) {
    const o = obstacles.find(o => o.type === 'boar' && !o.passed && pb.r >= boarStandR(o, 0) - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - boarStandR(o, 0); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0; act.hide = 0;
    boarS = { o, np: 'stand', nt: 0, bp: 'graze', bt: 0, bo: BOAR.start, i: 0, warnAt: boarWait(), miss: 0, hinted: 0 };
    return;
  }
  const S = boarS, o = S.o; S.nt += dt; S.bt += dt;
  if (!obstacles.includes(o)) { boarS = null; return; }
  const demo = state !== 'play', passed = PLAYER.x > boarX(o) + 6;               // החזיר כבר מאחורי הנינג'ה
  const goN = p => { S.np = p; S.nt = 0; }, goB = p => { S.bp = p; S.bt = 0; };
  if (demo && (S.np === 'stand' || S.np === 'hidden')) {                           // הדגמה: GO כשאוכל, HIDE כשהאוזניים זזות
    if (S.bp === 'graze' && S.bt > 0.8) command('go', 'demo');
    if (S.bp === 'ears' && S.bt > 0.6 && S.np === 'stand') command('hide', 'demo');
  }
  // החזיר
  switch (S.bp) {
    case 'graze':
      if (!passed && S.bt >= S.warnAt) {                                                // מפסיק ללעוס, האוזניים זזות
        const rem = S.np === 'walk' ? (boarStandR(o, S.i) - pb.r) / BOAR.walkV : 0;    // באמצע הדרך – רק אם יספיק להגיע לעץ ולהתחבא
        if ((S.np === 'stand' || S.np === 'hidden' || (S.np === 'walk' && rem < boarEarsT() - 0.8))) { goB('ears'); sfx('swish'); }
      }
      break;
    case 'ears':
      if (S.bt >= boarEarsT()) {
        if (S.np === 'hidden' || S.np === 'duck' || passed) goB('look');               // מרים את הראש – ולא רואה כלום (או שהנינג'ה כבר מאחוריו)
        else boarSpotted();
      }
      break;
    case 'look':
      if (S.bt >= BOAR.lookT) goB('step');                                              // מתקדם כמה צעדים לכיוון הנינג'ה
      break;
    case 'step':
      S.bo -= BOAR.adv * dt / BOAR.stepT;
      if (S.bt >= BOAR.stepT) { goB('graze'); S.warnAt = boarWait(); }
      break;
    case 'charge':
      if (Math.random() < 0.5) particles.push({ x: boarChargeX() + 10, y: GROUND - 0.5, vx: 8, vy: -3, g: 8, life: 0.35, color: WORLDS[world].dust, size: 0.9 });
      if (S.bt >= BOAR.chargeT) { goB('return'); goN('fall'); shakeT = 0.3; sfx('hit'); burst(PLAYER.x + 6, GROUND - 6, WORLDS[world].dust, 8, 16); }
      break;
    case 'return':
      if (S.bt >= BOAR.returnT) { goB('graze'); S.warnAt = boarWait() + 0.4; }
      break;
  }
  // הנינג'ה
  switch (S.np) {
    case 'duck': if (S.nt >= BOAR.duckT) goN('hidden'); break;
    case 'fall': if (S.nt >= BOAR.fallT) goN('walk'); break;                             // קם וממשיך לעץ שאליו הלך
    case 'walk':
      if (passed && S.bp !== 'charge') { goN('exit'); break; }
      if (pb.r >= boarStandR(o, S.i) - 0.01) {
        const over = pb.r - boarStandR(o, S.i); if (over > 0) ropeShiftBy(-over);
        goN('stand');
      }
      break;
    case 'stand': case 'hidden':
      if (passed && S.bp !== 'charge' && S.bp !== 'return') goN('exit');               // החזיר מאחוריו – כבר לא רואה אותו, יוצאים מהיער
      break;
    case 'exit':
      if (PLAYER.x > boarX(o) + BOAR.passBy) {
        cleared(o); boarS = null;
        if (mode === 'journey' && state === 'play') { picked += BOAR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BOAR.coins + ' 🟡', '#ca8a04'); }
      }
      break;
  }
  if (S.np === 'stand' && state === 'play' && S.miss >= 2 && !S.hinted) { S.hinted = 1; sayWords(['go', 'hide'], 1.8); }
}
function boarPhysics() {
  if (!boarS) return false;
  const S = boarS;
  if (S.np === 'fall') { const k = Math.min(1, S.nt / 0.4); py = S.nt < 0.4 ? Math.sin(Math.PI * k) * 3 : 0; vy = 0; return true; }
  py = 0; vy = 0; return true;
}

/* ---------- פקודות ---------- */
function boarHide() {
  if (!boarS) return false;
  if (boarS.np === 'stand') { boarS.np = 'duck'; boarS.nt = 0; sfx('swish'); }
  return true;                                                                         // ביער – HIDE תמיד שייך לחזיר
}
function boarGo() {
  if (!boarS) return false;
  const S = boarS;
  if (S.np !== 'stand' && S.np !== 'hidden') return true;
  if (S.bp === 'ears' || S.bp === 'look') { boarSpotted(); return true; }             // יצא בזמן הלא נכון – החזיר רואה אותו
  if (S.bp !== 'graze' && S.bp !== 'step') return true;
  if (S.i < BOAR.trees - 1) S.i++;
  S.np = 'walk'; S.nt = 0;
  return true;
}
function boarExpected() {
  if (!boarS) return null;
  return boarS.np === 'stand' ? ['go', 'hide'] : boarS.np === 'hidden' ? ['go'] : [];
}
function boarAuto() {
  const S = boarS; if (!S || (S.np !== 'stand' && S.np !== 'hidden')) return;
  if (S.bp === 'ears' && S.bt > 0.4 && S.np === 'stand') command('hide', 'auto');
  else if (S.bp === 'graze' && S.bt > 0.5) command('go', 'auto');
}

/* ---------- תנוחות ---------- */
function boarPose(P) {
  if (!boarS) return P;
  const S = boarS, p = S.np, now = performance.now() / 1000;
  if (p === 'exit') return S.nt < 1.2 ? poseWalk(bgX * 0.42 * RIG.run.cadence * 1.6) : poseRun(bgX * 0.42 * RIG.run.cadence);
  if (p === 'walk') { P = poseWalk(bgX * 0.42 * RIG.run.cadence * 1.3); P.lean = 0.22; P.arms = [[1.6, 2.6], [1.7, 2.7]]; P.eyes = 'wide'; return P; }   // על קצות האצבעות, ידיים מורמות
  if (p === 'duck') { P = poseWalk(S.nt * 22); P.lean = 0.1; return P; }
  if (p === 'hidden') { P = poseIdle(now); P.lean = -0.06; P.arms = [[0.25, 0.4], [0.3, 0.45]]; P.eyes = 'wide'; return P; }   // נצמד לגזע, ידיים צמודות
  if (p === 'stand') { P = poseIdle(now); if (S.bp === 'ears') P.eyes = 'wide'; return P; }
  if (p === 'spotted') { P = poseIdle(now); P.eyes = 'wide'; P.lean = -0.1; return P; }
  if (p === 'fall') { P = S.nt < 0.6 ? poseAir(false) : poseIdle(now); if (S.nt < 0.6) { P.lean = -0.5; P.eyes = 'wide'; } return P; }
  return P;
}

/* ---------- ציור ---------- */
function boarRnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function forestAlpha(o) {                                                               // נכנסים ליער בהדרגה ויוצאים ממנו בהדרגה
  const a = (viewR() - (o.x - 10)) / BOAR.fade, b = ((o.x + o.w + 30) - viewL()) / BOAR.fade;
  return Math.max(0, Math.min(1, a, b));
}
function fTrunk(x, w, top, bottom, col, bark, roots) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w / 2 + (roots ? w * 0.35 : 0), bottom); ctx.lineTo(x - w / 2 - (roots ? w * 0.35 : 0), bottom); ctx.closePath(); ctx.fill();
  if (bark) {
    ctx.strokeStyle = bark; ctx.lineWidth = Math.max(0.15, w * 0.04);
    for (let i = 0; i < 5; i++) { const bx = x - w / 2 + w * (0.15 + i * 0.18); ctx.beginPath(); ctx.moveTo(bx, top); for (let y = top; y < bottom; y += 3) ctx.lineTo(bx + Math.sin(y * 0.4 + i) * w * 0.04, y); ctx.stroke(); }
  }
}
function fBlobs(x, y, r, col, n, seed) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = boarRnd(seed + i) * Math.PI * 2, d = boarRnd(seed + i * 3) * r * 0.7; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 0.6, r * (0.45 + boarRnd(seed + i * 7) * 0.35), 0, Math.PI * 2); ctx.fill(); }
}
const wrapX = (x, L, R) => { const w = R - L; return ((x - L) % w + w) % w + L; };
// היער מאחור: שמיים ירוקים, עצים רחוקים בערפל, קרני אור, ושורת עצים ושיחים באמצע. העומק – כל שכבה זזה במהירות אחרת
function drawForestBack(o, top) {
  const a = forestAlpha(o); if (a <= 0) return;
  const L = viewL() - 2, R = viewR() + 2, G = GROUND - 1;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, top, 0, G); g.addColorStop(0, '#cfe8c8'); g.addColorStop(0.5, '#9cc89a'); g.addColorStop(1, '#6f9f72');
  ctx.fillStyle = g; ctx.fillRect(L, top, R - L, G - top);
  for (let i = 0; i < 26; i++) { const x = wrapX(L + i * 7.3 + boarRnd(i) * 5 - bgX * 0.12, L - 4, R + 4); fTrunk(x, 1 + boarRnd(i) * 1, top, G - 12, 'rgba(120,160,128,.55)'); }   // רחוק, בערפל
  fBlobs(wrapX(40 - bgX * 0.12, L - 30, R + 30), top + 8, 20, 'rgba(150,190,150,.5)', 8, 3);
  fBlobs(wrapX(120 - bgX * 0.12, L - 30, R + 30), top + 5, 24, 'rgba(150,190,150,.5)', 9, 9);
  const m = ctx.createLinearGradient(0, G - 30, 0, G - 8); m.addColorStop(0, 'rgba(225,240,220,0)'); m.addColorStop(0.6, 'rgba(225,240,220,.55)'); m.addColorStop(1, 'rgba(225,240,220,0)');
  ctx.fillStyle = m; ctx.fillRect(L, G - 30, R - L, 22);                                  // ערפל
  ctx.save(); ctx.globalCompositeOperation = 'lighter';                                   // קרני אור בין העצים
  for (let i = 0; i < 4; i++) { const x = wrapX(L + 18 + i * 42 + boarRnd(i + 40) * 12 - bgX * 0.2, L - 30, R + 10); ctx.fillStyle = 'rgba(255,240,190,' + (0.08 * a) + ')'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 7, top); ctx.lineTo(x + 26, G); ctx.lineTo(x + 12, G); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 8; i++) { const x = wrapX(L + i * 22 + boarRnd(i + 5) * 9 - bgX * 0.42, L - 6, R + 6); fTrunk(x, 2.2 + boarRnd(i + 2) * 1.2, top, G - 4, '#4a5d3f', 'rgba(0,0,0,.15)'); }   // אמצע
  for (let i = 0; i < 13; i++) { const x = wrapX(L + i * 14 + boarRnd(i + 9) * 7 - bgX * 0.42, L - 10, R + 10); fBlobs(x, G - 5, 4.5 + boarRnd(i) * 2.5, i % 2 ? '#4f7a48' : '#45703f', 5, i * 11); }
  fBlobs(wrapX(50 - bgX * 0.42, L - 40, R + 40), top - 2, 26, '#3f6b3d', 10, 33);
  fBlobs(wrapX(135 - bgX * 0.42, L - 40, R + 40), top - 3, 28, '#3a643a', 10, 51);
  const pg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 30); pg.addColorStop(0, '#7a5a3a'); pg.addColorStop(1, '#4e3826');   // שביל עפר ביער
  ctx.fillStyle = pg; ctx.fillRect(L, GROUND - 0.6, R - L, 60);
  ctx.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 24; i++) { const x = wrapX(L + boarRnd(i + 70) * 200 - bgX, L - 3, R + 3); ctx.beginPath(); ctx.ellipse(x, GROUND + 2 + boarRnd(i + 80) * 14, 0.8 + boarRnd(i), 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#4c8a43'; for (let x = Math.floor(L - (bgX % 1.6)); x < R; x += 1.6) { const h = boarRnd(Math.round(x + bgX) * 0.37); ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 0.6, GROUND - 1.6 - h * 1.8); ctx.lineTo(x + 1.2, GROUND); ctx.fill(); }
  ctx.restore();
}
// העצים העבים על השביל (מעל הנינג'ה – מתחבאים מאחוריהם), גזעים מטושטשים בקדמת התמונה ועלים נושרים
function drawForestFront(o, top, bottom) {
  const a = forestAlpha(o); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  for (let i = 0; i < BOAR.trees; i++) {
    const x = boarTreeX(o, i);
    if (x < viewL() - 20 || x > viewR() + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 0.5, 9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    fTrunk(x, 9.5, top, GROUND + 0.6, '#5b3f2a', 'rgba(30,18,10,.45)', true);
    ctx.fillStyle = 'rgba(255,230,170,.16)'; ctx.fillRect(x - 4.7, top, 1.8, GROUND - top);   // צד מואר
    ctx.fillStyle = '#2f5a2e'; ctx.beginPath(); ctx.ellipse(x + 2.5, GROUND - 26, 1.8, 1, 0.4, 0, Math.PI * 2); ctx.fill();   // טחב
    fBlobs(x, top + 2, 16, '#3c6a3a', 7, 60 + i * 13);                                   // נוף העץ למעלה
  }
  if (boarCharging(o)) drawBoarFig(boarChargeX(), GROUND + 0.5, 1.0, o);             // מסתער על השביל – לפני העצים
  else if (forestAlpha(o) > 0) drawBoarFig(boarX(o), GROUND - 1.2, 0.95, o);          // רועה / הולך – לפני הגזעים, שלא יסתתר מאחוריהם
  const t = performance.now() / 1000, L = viewL(), R = viewR();
  ctx.fillStyle = '#c98a2e';                                                           // עלים נושרים
  for (let i = 0; i < 8; i++) {
    const s = 0.4 + boarRnd(i + 400) * 0.8, y = top + ((t * (4 + s * 5) + boarRnd(i + 300) * 80) % (GROUND - top)), x = wrapX(L + boarRnd(i + 200) * (R - L) + Math.sin(t * 1.3 + i) * 3 - bgX * (0.2 + s * 0.3), L, R);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.beginPath(); ctx.ellipse(0, 0, 0.9 * s, 0.45 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function boarChargeX() {                                                               // איפה החזיר בהסתערות / בחזרה
  const S = boarS, home = boarX(S.o), tgt = PLAYER.x + PLAYER.w + 13;
  if (S.bp === 'charge') { const k = Math.min(1, S.bt / BOAR.chargeT); return lerp(home, tgt, k * k); }
  if (S.bp === 'return') { const k = Math.min(1, S.bt / BOAR.returnT); return lerp(tgt + 4, home, k * k * (3 - 2 * k)); }
  return home;
}
// חזיר הבר בפרופיל, פונה שמאלה. head: 0 = ראש למטה (אוכל), 1 = ראש למעלה (מסתכל)
function drawBoarFig(x, y, s, o) {
  const S = boarS && boarS.o === o ? boarS : null, t = performance.now() / 1000;
  const bp = S ? S.bp : 'graze', running = bp === 'charge' || bp === 'return';
  let head = 0;
  if (bp === 'look') head = Math.min(1, S.bt / 0.25) * (S.bt > BOAR.lookT - 0.3 ? (BOAR.lookT - S.bt) / 0.3 : 1);
  if (bp === 'charge') head = 0.6;
  if (bp === 'return') head = 0.3;
  if (bp === 'step') head = 0.2;
  const chew = bp === 'graze' ? Math.sin(t * 9) * 0.06 : 0;
  const ear = bp === 'ears' ? Math.sin(t * 22) * 0.35 : 0;
  const ang = -0.6 * (1 - head) + chew;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (bp === 'return') ctx.scale(-1, 1);                                                // הולך חזרה – פונה ימינה
  const legA = running ? Math.sin(t * (bp === 'charge' ? 26 : 14)) * 0.6 : bp === 'step' ? Math.sin(t * 8) * 0.4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0.3, 9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  const body = '#4a3426', dark = '#2e1f16';
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  [[-5, 1], [-3, -1], [4, 1], [6, -1]].forEach(([lx, d]) => { ctx.beginPath(); ctx.moveTo(lx, -5); ctx.lineTo(lx + Math.sin(legA * d) * 3, -0.4); ctx.stroke(); });
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(1, -7.5, 9, 5, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-6, -10.5);                         // רעמת זיפים
  for (let i = 0; i <= 12; i++) ctx.lineTo(-6 + i * 1.2, -12.2 - (i % 2) * 1.3 + Math.sin(i * 0.5) * 0.6 + (i < 4 ? (4 - i) * 0.2 : 0));
  ctx.lineTo(9, -10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(9.8, -9); ctx.quadraticCurveTo(11.5, -10 + Math.sin(t * 6) * 0.6, 11, -7.5); ctx.stroke();   // זנב
  ctx.save(); ctx.translate(-6, -9); ctx.rotate(ang); ctx.translate(6, 9);              // הראש מסתובב סביב הצוואר
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(-11, -10, -14, -6.5); ctx.lineTo(-14.5, -4.2); ctx.quadraticCurveTo(-10, -2.5, -5, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a5a4a'; ctx.beginPath(); ctx.ellipse(-14.4, -5.4, 0.9, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0f0a'; ctx.beginPath(); ctx.arc(-14.5, -5.8, 0.25, 0, Math.PI * 2); ctx.arc(-14.4, -4.9, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5ecd7'; ctx.beginPath(); ctx.moveTo(-12.6, -4.2); ctx.quadraticCurveTo(-14, -5.5, -13.2, -7.2); ctx.lineTo(-12.7, -6.8); ctx.quadraticCurveTo(-13.1, -5.4, -12, -4.3); ctx.fill();   // ניב
  if (head > 0.3 || running) {                                                         // עין פקוחה כשמסתכל
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(-9.6, -8.4, 0.75, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-9.8, -8.4, 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-11, -9.8); ctx.lineTo(-8.6, -9.2); ctx.stroke();
  } else { ctx.strokeStyle = '#111'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(-9.7, -8.6, 0.6, 0.2, Math.PI - 0.2); ctx.stroke(); }   // עין עצומה למחצה – אוכל בנחת
  ctx.save(); ctx.translate(-5.4, -10.8); ctx.rotate(ear);                              // אוזן – זזה כשהוא עומד להרים את הראש
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-1.1, -0.2); ctx.lineTo(0, -3.2); ctx.lineTo(1, 0); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.restore();
  if (bp === 'ears') {                                                                 // קווקווים קטנים ליד האוזן
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.35;
    for (let k = 0; k < 3; k++) { const a = -2.2 + k * 0.45; ctx.beginPath(); ctx.moveTo(x - 5.4 * s + Math.cos(a) * 4, y - 13 * s + Math.sin(a) * 4); ctx.lineTo(x - 5.4 * s + Math.cos(a) * 5.5, y - 13 * s + Math.sin(a) * 5.5); ctx.stroke(); }
  }
}
function drawBoar(o) {                                                                 // החזיר ועשב סביב הפה
  const a = forestAlpha(o); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const hx = boarX(o);
  ctx.fillStyle = '#5a9a48';
  for (let k = 0; k < 9; k++) { const gx = hx - 20 + k * 1.5; ctx.beginPath(); ctx.moveTo(gx, GROUND - 2.4); ctx.lineTo(gx + 0.5, GROUND - 5 - boarRnd(k + 90) * 2.5); ctx.lineTo(gx + 1, GROUND - 2.4); ctx.fill(); }
  ctx.restore();
}
function boarCharging(o) { return !!boarS && boarS.o === o && (boarS.bp === 'charge' || boarS.bp === 'return'); }
