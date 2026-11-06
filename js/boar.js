/* ninja-voice-game – boar.js
   חזיר בר ביער (HIDE + SNEAK): שביל ביער עמוק עם חמישה עצים עבים ורווחים גדולים ביניהם.
   חזיר בר רועה עשב בצד השני של היער, פונה אל הנינג'ה. הוא אוכל עם הראש למטה, ומדי פעם האוזניים זזות,
   הוא מרים את הראש ומסתכל – ואז מתקדם כמה צעדים לכיוון הנינג'ה וחוזר לאכול.
   הנינג'ה מתגנב מעץ לעץ: SNEAK כשהחזיר אוכל → רץ בשקט לעץ הבא. האוזניים זזות → HIDE מאחורי הגזע.
   SNEAK כשהאוזניים זזות / כשהוא מסתכל, או לא מתחבאים בזמן → החזיר רואה אותו, מסתער ומפיל אותו (כוכב, לא לב).
   באמצע היער הם נפגשים – כשהחזיר מאחורי הנינג'ה, הוא כבר לא רואה אותו, והנינג'ה יוצא מהיער.
   היער מצויר בשכבות (רחוק בערפל, אמצע, השביל) – תחושת עומק.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

// העצים על השביל: מרחק מהעץ הראשון (לא שווה), עובי, צבע, נטייה קלה וענפים [גובה יחסי, צד, אורך]
const BOAR_TREES = [
  { dx: 0,   w: 9.5, col: '#8a6a4c', lean: 0,      br: [[0.40, -1, 10], [0.62, 1, 8]] },
  { dx: 62,  w: 8.8, col: '#93734f', lean: 0.025,  br: [[0.50, 1, 9]] },
  { dx: 112, w: 11,  col: '#7e6045', lean: -0.02,  br: [[0.33, -1, 12], [0.55, 1, 9], [0.72, -1, 7]] },
  { dx: 186, w: 9,   col: '#8c6c4e', lean: 0.012,  br: [[0.46, -1, 9], [0.66, 1, 6]] },
  { dx: 250, w: 10,  col: '#866548', lean: -0.015, br: [[0.38, 1, 11], [0.6, -1, 8]] },
  { dx: 306, w: 8.8, col: '#907052', lean: 0.02,   br: [[0.52, -1, 9]] },
  { dx: 374, w: 10.5, col: '#826347', lean: -0.01, br: [[0.36, -1, 10], [0.58, 1, 9], [0.74, 1, 6]] }
];
const BOAR_STARTS = [150, 342];   // שני חזירים: הראשון באמצע היער, השני בהמשך (יחסית לתחילת היער)
const BOAR = { pawT: 1.0, returnV: 9, size: 1.2, lead: 200, ramp: 70, edge: 110, tree0: 24, trees: BOAR_TREES.length,  adv: 12, stepT: 1.6, walkV: 14, duckT: 0.35,
               waitMin: 1.6, waitMax: 3.0, lookT: 1.8, chargeT: 0.7, fallT: 1.1, returnT: 1.3, knock: 7, passBy: 18, coins: 4, fade: 55 };
const BOAR_EARS = { easy: 2.0, medium: 1.5, hard: 1.15 };                         // כמה זמן יש להגיד HIDE מרגע שהאוזניים זזות
let boarS = null;   // { o, np: ninja phase, nt, bp: boar phase, bt, bo: מקום החזיר (יחסית ל-o.x), i: העץ שאליו הולכים, warnAt, miss, hinted }

function boarLead() { return forestFull() ? 30 : BOAR.lead; }                      // באימון – כבר ביער, אין אזור ביניים
function boarSetup(o) { o.lead = boarLead(); o.w = o.lead + BOAR.tree0 + BOAR_TREES[BOAR.trees - 1].dx + 30; }
// היער מתחיל אחרי אזור ביניים (lead): קודם הבמבוק מידלדל והשיחים מתרבים, ורק אז נכנסים ליער
function fo(o) { return o.x + (o.lead || BOAR.lead); }                                        // תחילת היער
function fw(o) { return o.w - (o.lead || BOAR.lead); }                                        // אורך היער
function boarTreeX(o, i) { return fo(o) + BOAR.tree0 + BOAR_TREES[i].dx; }          // מרכז הגזע
function boarX(o, j) {                                                                // איפה חזיר j עכשיו (ברירת מחדל: החזיר שצריך לעבור עכשיו)
  const S = boarS && boarS.o === o ? boarS : null; if (j === undefined) j = S ? S.b : 0;
  return fo(o) + (S ? S.bos[j] : BOAR_STARTS[j]);
}
// שלב האימון מתחיל ישר ביער (בלי במבוק); במסע – נכנסים ליער דרך אזור ביניים
function forestFull() { return mode === 'stage' && playWords.includes('boar'); }
function boarStandGap(i) { return BOAR_TREES[i].w / 2 + 0.4; }
function boarStandR(o, i) { return boarTreeX(o, i) - boarStandGap(i); }          // הקצה הימני של הנינג'ה כשהוא עומד ליד העץ
function boarHideDX() { return boarStandGap(boarS ? boarS.i : 0) + PLAYER.w / 2; }   // כמה זזים כדי להיות בדיוק מאחורי הגזע
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

const BOAR_CHARGE = { easy: 7, medium: 9, hard: 11.5 };                             // מהירות ההסתערות – יש זמן להתחבא
function boarChargeV() { return BOAR_CHARGE[diffKey] || 16; }
function boarSnout() { return boarChargeX() - 14.5 * BOAR.size; }                    // קצה האף בזמן הסתערות (פונה שמאלה)
function boarOnScreen(o) { return boarX(o) < viewR() - 14; }                         // חזיר שעוד לא רואים במסך – לא מסתכל ולא מסתער

function boarSpotted() {                                                             // החזיר ראה את הנינג'ה – מתחיל לרוץ אליו (אפשר עוד להתחבא!)
  const S = boarS;
  S.bp = 'charge'; S.bt = 0; S.cx = S.bos[S.b]; S.face = -1;
  if (S.np !== 'hidden' && S.np !== 'duck') { S.np = 'spotted'; S.nt = 0; }
  sfx('thud'); burst(boarX(S.o) - 14, GROUND - 6, 'rgba(255,255,255,.8)', 5, 10);     // נחירה
  flash = { text: '🐗 He saw you – HIDE!', t: 1.6 };
}

function boarUpdate(dt, pb) {
  if (!boarS) {
    const o = obstacles.find(o => o.type === 'boar' && !o.passed && pb.r >= boarStandR(o, 0) - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - boarStandR(o, 0); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0; act.hide = 0;
    boarS = { o, np: 'stand', nt: 0, bp: 'graze', bt: 0, bos: BOAR_STARTS.slice(), b: 0, i: 0, warnAt: boarWait(), miss: 0, hinted: 0,
              face: -1, turnTo: -1, cx: null, atTree: true, awayT: 0 };
    return;
  }
  const S = boarS, o = S.o; S.nt += dt; S.bt += dt;
  if (!obstacles.includes(o)) { boarS = null; return; }
  const demo = state !== 'play', passed = PLAYER.x > boarX(o) + 6;               // החזיר כבר מאחורי הנינג'ה
  const goN = p => { S.np = p; S.nt = 0; }, goB = p => { S.bp = p; S.bt = 0; };
  const turn = to => { S.turnTo = to; goB('turn'); };
  if (demo) {                                                                         // הדגמה: SNEAK כשאוכל, HIDE כשהאוזניים זזות / כשהוא רץ
    if ((S.np === 'stand' || S.np === 'hidden') && ((S.bp === 'graze' && S.bt > 0.8) || S.bp === 'away')) command('sneak', 'demo');
    if ((S.bp === 'ears' && S.bt > 0.6 && S.np === 'stand') || (S.np === 'spotted' && S.atTree && S.bt > 0.6)) command('hide', 'demo');
  }
  // החזיר
  switch (S.bp) {
    case 'graze':
      if (!passed && S.bt >= S.warnAt && boarOnScreen(o)) {
        const rem = S.np === 'walk' ? (boarStandR(o, S.i) - pb.r) / BOAR.walkV : 0;    // באמצע הדרך – רק אם יספיק להגיע לעץ ולהתחבא
        if (S.np === 'stand' || S.np === 'hidden' || (S.np === 'walk' && rem < boarEarsT() - 0.8)) {
          if (!demo && !S.justTurned && Math.random() < 0.3) { turn(1); S.justTurned = 1; }   // לפעמים מסתובב לצד השני ואוכל שם
          else { S.justTurned = 0; goB('ears'); sfx('swish'); }                       // מפסיק ללעוס, האוזניים זזות
        }
      }
      break;
    case 'turn':                                                                     // מסתובב (חצי שנייה)
      if (S.bt >= 0.5) {
        S.face = S.turnTo;
        if (S.face === 1) { goB('away'); S.awayT = 2.5 + Math.random() * 1.5; }       // אוכל עם הגב לנינג'ה – בטוח להתגנב
        else { goB('graze'); S.warnAt = boarWait(); }
      }
      break;
    case 'away':
      if (S.bt >= S.awayT) turn(-1);                                                  // מסתובב בחזרה
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
      S.bos[S.b] -= BOAR.adv * dt / BOAR.stepT;
      if (S.bt >= BOAR.stepT) { goB('graze'); S.warnAt = boarWait(); }
      break;
    case 'charge': {                                                                 // קודם גורף ברגל ונוחר, ואז רץ אל הנינג'ה – בקצב שמשאיר זמן להגיד HIDE
      if (S.bt < BOAR.pawT) break;
      S.cx -= boarChargeV() * Math.min(1, (S.bt - BOAR.pawT) / 0.6) * dt;
      if (Math.random() < 0.5) particles.push({ x: boarChargeX() + 10, y: GROUND - 0.5, vx: 8, vy: -3, g: 8, life: 0.35, color: WORLDS[world].dust, size: 0.9 });
      const snout = boarSnout();
      if (S.np === 'hidden' || S.np === 'duck') {
        if (snout <= boarTreeX(o, S.i) + BOAR_TREES[S.i].w / 2 + 3) { goB('lost'); sfx('swish'); }   // הגיע לעץ – לא מוצא אף אחד
      } else if (snout <= PLAYER.x + PLAYER.w + 1) {                                    // נגח!
        goB('return'); goN('fall'); shakeT = 0.3; sfx('hit'); burst(PLAYER.x + 6, GROUND - 6, WORLDS[world].dust, 8, 16); S.miss++;
        if (state === 'play') { hits++; if (typeof voiceMark === 'function') voiceMark('hit'); renderHud(); }
      }
      break;
    }
    case 'lost':                                                                      // מרחרח ליד העץ, מוותר וחוזר
      if (S.bt >= 1.3) goB('return');
      break;
    case 'return':
      S.cx = Math.min(S.bos[S.b], S.cx + BOAR.returnV * dt);
      if (S.cx >= S.bos[S.b] - 0.01) { S.cx = null; S.face = 1; turn(-1); }
      break;
  }
  if (passed && S.b < BOAR_STARTS.length - 1 && !boarCharging(o)) {                  // עבר את החזיר הזה – עכשיו החזיר הבא
    S.b++; S.face = -1; goB('graze'); S.warnAt = boarWait() + 0.8;
    return;
  }
  // הנינג'ה
  switch (S.np) {
    case 'duck': if (S.nt >= BOAR.duckT) goN('hidden'); break;
    case 'fall': if (S.nt >= BOAR.fallT) { goN('walk'); S.atTree = false; } break;     // קם וממשיך לעץ שאליו הלך
    case 'walk':
      if (passed && !boarCharging(o)) { goN('exit'); break; }
      if (pb.r >= boarStandR(o, S.i) - 0.01) {
        const over = pb.r - boarStandR(o, S.i); if (over > 0) ropeShiftBy(-over);
        goN('stand'); S.atTree = true;
      }
      break;
    case 'stand': case 'hidden':
      if (passed && !boarCharging(o)) goN('exit');                                     // החזיר מאחוריו – כבר לא רואה אותו, יוצאים מהיער
      break;
    case 'exit':
      if (PLAYER.x > boarX(o) + BOAR.passBy) {
        cleared(o); boarS = null;
        if (mode === 'journey' && state === 'play') { picked += BOAR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BOAR.coins + ' 🟡', '#ca8a04'); }
      }
      break;
  }
  if (S.np === 'stand' && state === 'play' && S.miss >= 2 && !S.hinted) { S.hinted = 1; sayWords(['sneak', 'hide'], 1.8); }
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
  const S = boarS;
  if (S.np === 'stand' || (S.np === 'spotted' && S.atTree)) { S.np = 'duck'; S.nt = 0; sfx('swish'); }
  return true;                                                                         // ביער – HIDE תמיד שייך לחזיר
}
function boarSafe() {                                                                // החזיר לא מסתכל לכיוון הנינג'ה
  const S = boarS, b = S.bp;
  return b === 'graze' || b === 'step' || b === 'away' || b === 'return' || (b === 'turn' && S.turnTo === 1);
}
function boarSneak() {
  if (!boarS) return false;
  const S = boarS;
  if (S.np !== 'stand' && S.np !== 'hidden') return true;
  if (!boarSafe()) { if (S.bp === 'ears' || S.bp === 'look' || S.bp === 'turn') boarSpotted(); return true; }   // יצא בזמן הלא נכון – החזיר רואה אותו
  if (S.i < BOAR.trees - 1) S.i++;
  S.np = 'walk'; S.nt = 0; S.atTree = false;
  return true;
}
function boarExpected() {
  if (!boarS) return null;
  const S = boarS;
  return S.np === 'stand' ? ['sneak', 'hide'] : S.np === 'hidden' ? ['sneak'] : S.np === 'spotted' && S.atTree ? ['hide'] : [];
}
function boarAuto() {
  const S = boarS; if (!S) return;
  if (S.np === 'spotted' && S.atTree && S.bt > 0.5) { command('hide', 'auto'); return; }
  if (S.np !== 'stand' && S.np !== 'hidden') return;
  if (S.bp === 'ears' && S.bt > 0.4 && S.np === 'stand') command('hide', 'auto');
  else if ((S.bp === 'graze' && S.bt > 0.5) || S.bp === 'away') command('sneak', 'auto');
}

/* ---------- תנוחות ---------- */
// הליכת התגנבות: גוף כפוף ונמוך, צעדים איטיים עם הרמת ברך, יד קדמית מושטת ויד אחורית ליד הפנים
function poseSneak(q) {
  const s = Math.sin(q), k = (s + 1) / 2, lift = x => 0.5 * Math.max(0, Math.sin(x));
  const F = [0.8, 0.0], B = [-0.1, -0.9], lg = u => [B[0] + (F[0] - B[0]) * u, B[1] + (F[1] - B[1]) * u];
  const P = poseIdle(0), l0 = lg(1 - k), l1 = lg(k);
  l0[0] += lift(q + Math.PI + 1.6); l1[0] += lift(q + 1.6);
  P.hipY = -3.7 + Math.abs(s) * 0.12; P.lean = 0.35; P.spine = 0.12; P.bob = 0; P.headTilt = 0.18; P.eyes = 'wide';
  P.legs = [l0, l1]; P.feet = [0, 0]; P.arms = [[0.6, 1.9], [1.3, 2.6]];
  return P;
}
function boarPose(P) {
  if (!boarS) return P;
  const S = boarS, p = S.np, now = performance.now() / 1000;
  if (p === 'exit') return S.nt < 1.2 ? poseWalk(bgX * 0.42 * RIG.run.cadence * 1.6) : poseRun(bgX * 0.42 * RIG.run.cadence);
  if (p === 'walk') return poseSneak(bgX * 0.42 * RIG.run.cadence * 1.25);   // מתגנב: כפוף, על קצות האצבעות, יד אחת קדימה
  if (p === 'duck') { P = poseWalk(S.nt * 22); P.lean = 0.1; return P; }
  if (p === 'hidden') { P = poseIdle(now); P.lean = -0.06; P.arms = [[0.25, 0.4], [0.3, 0.45]]; P.eyes = 'wide'; return P; }   // נצמד לגזע, ידיים צמודות
  if (p === 'stand') { P = poseIdle(now); if (S.bp === 'ears') P.eyes = 'wide'; return P; }
  if (p === 'spotted') { P = poseIdle(now); P.eyes = 'wide'; P.lean = -0.1; return P; }
  if (p === 'fall') { P = S.nt < 0.6 ? poseAir(false) : poseIdle(now); if (S.nt < 0.6) { P.lean = -0.5; P.eyes = 'wide'; } return P; }
  return P;
}

/* ---------- ציור ---------- */
function boarRnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
let fc = ctx;   // היער הרחוק מצויר לקנבס נפרד ונמוג בהדרגה בכניסה ליער (drawForestBack)
function fTrunk(x, w, top, bottom, col, bark, roots) {
  fc.fillStyle = col; fc.beginPath();
  fc.moveTo(x - w / 2, top); fc.lineTo(x + w / 2, top);
  fc.lineTo(x + w / 2 + (roots ? w * 0.35 : 0), bottom); fc.lineTo(x - w / 2 - (roots ? w * 0.35 : 0), bottom); fc.closePath(); fc.fill();
  if (bark) {
    fc.strokeStyle = bark; fc.lineWidth = Math.max(0.15, w * 0.04);
    for (let i = 0; i < 5; i++) { const bx = x - w / 2 + w * (0.15 + i * 0.18); fc.beginPath(); fc.moveTo(bx, top); for (let y = top; y < bottom; y += 3) fc.lineTo(bx + Math.sin(y * 0.4 + i) * w * 0.04, y); fc.stroke(); }
  }
}
// עץ ברקע: גזע שמתחדד כלפי מעלה, נטייה קלה, וצמרת עגולה בראשו
function fTree(x, w, cy, base, col, crown, r, seed, lean, bark) {
  const H = base - cy, tx = x + lean * H;
  fc.fillStyle = col; fc.beginPath();
  fc.moveTo(x - w / 2 - w * 0.25, base); fc.lineTo(tx - w * 0.28, cy + r * 0.3); fc.lineTo(tx + w * 0.28, cy + r * 0.3); fc.lineTo(x + w / 2 + w * 0.25, base); fc.closePath(); fc.fill();
  if (bark) { fc.strokeStyle = bark; fc.lineWidth = Math.max(0.12, w * 0.06); fc.beginPath(); fc.moveTo(x, base); fc.lineTo(tx, cy + r * 0.5); fc.stroke(); }
  fc.strokeStyle = col; fc.lineWidth = Math.max(0.2, w * 0.22); fc.lineCap = 'round';                // שני ענפים קטנים אל הצמרת
  fc.beginPath(); fc.moveTo(tx, cy + r * 0.9); fc.lineTo(tx - r * 0.45, cy + r * 0.25); fc.moveTo(tx, cy + r * 1.1); fc.lineTo(tx + r * 0.4, cy + r * 0.35); fc.stroke();
  fBlobs(tx, cy, r, crown, 6, seed);
}
function fBlobs(x, y, r, col, n, seed) {
  fc.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = boarRnd(seed + i) * Math.PI * 2, d = boarRnd(seed + i * 3) * r * 0.7; fc.beginPath(); fc.arc(x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 0.6, r * (0.45 + boarRnd(seed + i * 7) * 0.35), 0, Math.PI * 2); fc.fill(); }
}
// עץ עבה: הגזע מתרחב בבסיס לשורשים, והפסים של הקליפה מתרחבים איתו. ענפים עם עלווה, נוף למעלה
function bigTree(x, top, T, i) {
  const G = GROUND + 2, H = G - top, n = 26;
  const half = u => T.w / 2 * (1 - 0.16 * u) + T.w * 0.55 * Math.pow(Math.max(0, 1 - u / 0.15), 2);   // u: 0 בקרקע, 1 למעלה
  const cx = u => x + T.lean * H * u, Y = u => G - H * u;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 0.5, T.w * 0.95, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = T.col; ctx.beginPath();
  for (let k = 0; k <= n; k++) { const u = k / n; ctx.lineTo(cx(u) - half(u), Y(u)); }
  for (let k = n; k >= 0; k--) { const u = k / n; ctx.lineTo(cx(u) + half(u), Y(u)); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,170,.16)'; ctx.beginPath();                               // צד מואר – צמוד לקצה, מתרחב איתו
  for (let k = 0; k <= n; k++) { const u = k / n; ctx.lineTo(cx(u) - half(u) * 0.97, Y(u)); }
  for (let k = n; k >= 0; k--) { const u = k / n; ctx.lineTo(cx(u) - half(u) * 0.62, Y(u)); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,38,20,.38)'; ctx.lineWidth = Math.max(0.18, T.w * 0.035); ctx.lineCap = 'round';   // קליפה – הפסים נפתחים לשורשים
  for (let f = -0.6; f <= 0.61; f += 0.3) {
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) { const u = k / 40, y = Y(u); ctx.lineTo(cx(u) + (f + Math.sin(y * 0.35 + f * 9 + i) * 0.05) * half(u), y); }
    ctx.stroke();
  }
  for (const [h, side, len] of T.br) {                                                   // ענפים
    const u = h, sx = cx(u) + side * half(u) * 0.8, sy = Y(u), ex = sx + side * len, ey = sy - len * 0.55, th = T.w * 0.16;
    ctx.fillStyle = T.col; ctx.beginPath();
    ctx.moveTo(sx, sy - th); ctx.quadraticCurveTo(sx + side * len * 0.5, sy - th - len * 0.1, ex, ey);
    ctx.quadraticCurveTo(sx + side * len * 0.45, sy + th * 0.2 - len * 0.05, sx, sy + th); ctx.closePath(); ctx.fill();
    fBlobs(ex, ey - 1, 3.6 + len * 0.15, i % 2 ? '#3f6e3c' : '#46753f', 5, 90 + i * 7 + h * 50);
  }
  ctx.fillStyle = '#2f5a2e'; ctx.beginPath(); ctx.ellipse(cx(0.3) + half(0.3) * 0.4, Y(0.3), 1.8, 1, 0.4, 0, Math.PI * 2); ctx.fill();   // טחב
  fBlobs(cx(1), top + 2, 13 + T.w * 0.4, '#3c6a3a', 7, 60 + i * 13);                   // נוף העץ למעלה
}
const wrapX = (x, L, R) => { const w = R - L; return ((x - L) % w + w) % w + L; };
// היער מאחור: שמיים ירוקים, עצים רחוקים בערפל, קרני אור, ושורת עצים ושיחים באמצע. העומק – כל שכבה זזה במהירות אחרת
function forestOn(o) { if (forestFull()) return true; return fo(o) - BOAR.ramp - 10 < viewR() && fo(o) + fw(o) + BOAR.ramp + 10 > viewL(); }
function forestMask(o, x) {                                                            // 0 מחוץ ליער, 1 בתוכו – עם מעבר רך בכניסה וביציאה
  if (!o) return 1;
  const a = forestFull() ? 1 : (x - (fo(o) - BOAR.ramp)) / (BOAR.ramp - 5), b = ((fo(o) + fw(o) + BOAR.ramp) - x) / (BOAR.ramp - 5);
  return Math.max(0, Math.min(1, a, b));
}
// אזור הביניים לפני היער (ואחריו): הבמבוק הולך ומידלדל ושיחים הולכים ומתרבים. 0 = רק במבוק, 1 = יער
function forestEdge(x) {
  if (forestFull()) return 1;
  let t = 0;
  for (const o of obstacles) if (o.type === 'boar') {
    const a = (x - (fo(o) - BOAR.ramp - BOAR.edge)) / BOAR.edge, b = ((fo(o) + fw(o) + BOAR.ramp + BOAR.edge) - x) / BOAR.edge;
    t = Math.max(t, Math.min(1, a, b));
  }
  return Math.max(0, t);
}
function thinOut(x, h, draw) {                                                         // מצייר במבוק – או נותן לו לדהות כשמתקרבים ליער
  const k = Math.max(0, Math.min(1, (1 - forestEdge(x) - h * 0.85) * 4));
  if (k <= 0) return; if (k >= 1) { draw(); return; }
  ctx.save(); ctx.globalAlpha *= k; draw(); ctx.restore();
}
function edgeBushes(left, right) {                                                     // שיחים שמתחילים לפני היער ומתעבים לקראתו
  if (forestFull() || !obstacles.some(o => o.type === 'boar')) return;
  repeat(left, right, 0.35, 8, (x, i) => {
    const k = Math.max(0, Math.min(1, (forestEdge(x) - hash(i + 91) * 0.75) * 4)); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k; fc = ctx;
    const r = 3.2 + hash(i + 93) * 3, bx = x + hash(i + 95) * 5;
    fBlobs(bx, GROUND - r * 0.45, r, i % 2 ? '#4f8a48' : '#458040', 5, i * 13);
    fBlobs(bx + r * 0.3, GROUND - r * 0.6, r * 0.55, 'rgba(160,210,140,.55)', 2, i * 17);   // צד מואר
    ctx.restore();
  });
}
let forestCv = null;
// כניסה הדרגתית: היער (שמיים, ערפל, עצים רחוקים ואמצעיים, שביל העפר) מצויר לקנבס נפרד, ואז נמוג בצד שלו – בהתחלה כמה עצים דלילים, ואז יער מלא
function drawForestScenes(top) {                                                      // נקרא מ-draw.js לפני שאר המכשולים
  const os = obstacles.filter(o => o.type === 'boar');
  if (forestFull()) { drawForestBack(os[0] || null, top); return; }
  for (const o of os) drawForestBack(o, top);
}
function drawForestBack(o, top) {
  if (o && !forestOn(o)) return;
  if (!forestCv) forestCv = document.createElement('canvas');
  if (forestCv.width !== canvas.width || forestCv.height !== canvas.height) { forestCv.width = canvas.width; forestCv.height = canvas.height; }
  const c = forestCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, forestCv.width, forestCv.height); c.setTransform(ctx.getTransform());
  fc = c;
  forestLayers(o, top);
  if (!o) { fc = ctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(forestCv, 0, 0); ctx.restore(); return; }
  const L = viewL() - 2, R = viewR() + 2, g = c.createLinearGradient(fo(o) - BOAR.ramp, 0, fo(o) + fw(o) + BOAR.ramp, 0), W = fw(o) + BOAR.ramp * 2;
  g.addColorStop(0, forestFull() ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)'); g.addColorStop(Math.min(0.49, (BOAR.ramp - 5) / W), 'rgba(0,0,0,1)'); g.addColorStop(Math.max(0.51, 1 - (BOAR.ramp - 5) / W), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(L, top - 5, R - L, GROUND + 80 - top); c.globalCompositeOperation = 'source-over';
  fc = ctx;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(forestCv, 0, 0); ctx.restore();
}
function forestLayers(o, top) {
  const ctx = fc, a = 1;
  const L = viewL() - 2, R = viewR() + 2, G = GROUND - 1;
  ctx.save();
  const g = ctx.createLinearGradient(0, top, 0, G); g.addColorStop(0, '#cfe8c8'); g.addColorStop(0.5, '#9cc89a'); g.addColorStop(1, '#6f9f72');
  ctx.fillStyle = g; ctx.fillRect(L, top, R - L, G - top);
  for (let i = 0; i < 11; i++) {                                                         // רחוק, בערפל: עצים דקים עם צמרת, בגבהים שונים
    const x = wrapX(L + i * 16.5 + boarRnd(i) * 8 - bgX * 0.12, L - 8, R + 8), cy = top + 8 + boarRnd(i + 20) * 20;
    fTree(x, 1 + boarRnd(i) * 0.9, cy, G - 10, 'rgba(118,158,126,.6)', 'rgba(150,192,150,.62)', 5 + boarRnd(i + 30) * 4, i * 5, (boarRnd(i + 60) - 0.5) * 0.04);
  }
  fBlobs(wrapX(40 - bgX * 0.12, L - 30, R + 30), top + 8, 20, 'rgba(150,190,150,.5)', 8, 3);
  fBlobs(wrapX(120 - bgX * 0.12, L - 30, R + 30), top + 5, 24, 'rgba(150,190,150,.5)', 9, 9);
  const m = ctx.createLinearGradient(0, G - 30, 0, G - 8); m.addColorStop(0, 'rgba(225,240,220,0)'); m.addColorStop(0.6, 'rgba(225,240,220,.55)'); m.addColorStop(1, 'rgba(225,240,220,0)');
  ctx.fillStyle = m; ctx.fillRect(L, G - 30, R - L, 22);                                  // ערפל
  ctx.save(); ctx.globalCompositeOperation = 'lighter';                                   // קרני אור בין העצים
  for (let i = 0; i < 4; i++) { const x = wrapX(L + 18 + i * 42 + boarRnd(i + 40) * 12 - bgX * 0.2, L - 30, R + 10); ctx.fillStyle = 'rgba(255,240,190,' + (0.08 * a) + ')'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 7, top); ctx.lineTo(x + 26, G); ctx.lineTo(x + 12, G); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 4; i++) {                                                          // אמצע: עצים בינוניים עם צמרת
    const x = wrapX(L + i * 45 + boarRnd(i + 5) * 12 - bgX * 0.42, L - 12, R + 12), cy = top + 4 + boarRnd(i + 25) * 12;
    fTree(x, 2.2 + boarRnd(i + 2) * 1.2, cy, G - 3, '#6e8262', i % 2 ? '#3f6e3c' : '#46733f', 10 + boarRnd(i + 35) * 4, 40 + i * 9, (boarRnd(i + 66) - 0.5) * 0.05, 'rgba(0,0,0,.15)');
  }
  fBlobs(wrapX(50 - bgX * 0.42, L - 40, R + 40), top - 2, 26, '#3f6b3d', 10, 33);
  fBlobs(wrapX(135 - bgX * 0.42, L - 40, R + 40), top - 3, 28, '#3a643a', 10, 51);
  const pg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 30); pg.addColorStop(0, '#a88a62'); pg.addColorStop(1, '#836747');   // שביל עפר ביער
  ctx.fillStyle = pg; ctx.fillRect(L, GROUND - 1.3, R - L, 60);
  ctx.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 24; i++) { const x = wrapX(L + boarRnd(i + 70) * 200 - bgX, L - 3, R + 3); ctx.beginPath(); ctx.ellipse(x, GROUND + 2 + boarRnd(i + 80) * 14, 0.8 + boarRnd(i), 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// העצים העבים על השביל (מעל הנינג'ה – מתחבאים מאחוריהם), גזעים מטושטשים בקדמת התמונה ועלים נושרים
function drawForestFront(o, top, bottom) {
  if (!forestOn(o)) return;
  ctx.save();
  for (let i = 0; i < BOAR.trees; i++) {
    const x = boarTreeX(o, i);
    if (x < viewL() - 20 || x > viewR() + 20) continue;
    bigTree(x, top, BOAR_TREES[i], i);
  }
  const act = boarS && boarS.o === o ? boarS.b : 0;
  for (let j = 0; j < BOAR_STARTS.length; j++) {                                     // החזירים – לפני הגזעים, שלא יסתתרו מאחוריהם
    if (j === act && boarCharging(o)) drawBoarFig(boarChargeX(), GROUND + 2.2, BOAR.size * 1.04, o, null);   // מסתער על השביל
    else { const bx = boarX(o, j); if (bx > viewL() - 25 && bx < viewR() + 25) drawBoarFig(bx, GROUND + 2.2, BOAR.size, o, j === act ? null : 'graze'); }
  }
  const t = performance.now() / 1000, L = viewL(), R = viewR();
  ctx.fillStyle = '#c98a2e';                                                           // עלים נושרים
  for (let i = 0; i < 8; i++) {
    const s = 0.4 + boarRnd(i + 400) * 0.8, y = top + ((t * (4 + s * 5) + boarRnd(i + 300) * 80) % (GROUND - top)), x = wrapX(L + boarRnd(i + 200) * (R - L) + Math.sin(t * 1.3 + i) * 3 - bgX * (0.2 + s * 0.3), L, R);
    const m = forestMask(o, x); if (m <= 0) continue;
    ctx.save(); ctx.globalAlpha = m; ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.beginPath(); ctx.ellipse(0, 0, 0.9 * s, 0.45 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function boarChargeX() {                                                               // איפה החזיר בהסתערות / בחזרה
  const S = boarS;
  return S.cx !== null ? fo(S.o) + S.cx : boarX(S.o);
}
// חזיר הבר בפרופיל, פונה שמאלה. head: 0 = ראש למטה (אוכל), 1 = ראש למעלה (מסתכל)
function drawBoarFig(x, y, s, o, force) {
  const S = boarS && boarS.o === o && !force ? boarS : null, t = performance.now() / 1000 + (force ? x * 0.13 : 0);
  const bp = force || (S ? S.bp : 'graze'), running = bp === 'charge', walking = bp === 'return' || bp === 'step';
  let head = 0;
  if (bp === 'look') head = Math.min(1, S.bt / 0.25) * (S.bt > BOAR.lookT - 0.3 ? (BOAR.lookT - S.bt) / 0.3 : 1);
  if (bp === 'charge') head = S && S.bt < BOAR.pawT ? 0.1 : 0.6;   // גורף ברגל עם ראש מורכן, ואז רץ
  if (bp === 'return') head = 0.3;
  if (bp === 'step') head = 0.2;
  if (bp === 'turn') head = 0.25;
  const chew = bp === 'graze' || bp === 'away' || bp === 'lost' ? Math.sin(t * 9) * 0.06 : 0;
  const ear = bp === 'ears' ? Math.sin(t * 22) * 0.35 : 0;
  const ang = -0.9 * (1 - head) + chew;                                                   // אוכל: הראש למטה עד האדמה
  let dir = -1;                                                                          // -1 = פונה שמאלה (אל הנינג'ה), 1 = לצד השני
  if (S) {
    if (bp === 'turn') { const k = Math.min(1, S.bt / 0.5), e = k * k * (3 - 2 * k), d = lerp(S.face, S.turnTo, e); dir = Math.sign(d || S.turnTo) * Math.max(0.15, Math.abs(d)); }
    else if (bp === 'return' || bp === 'away') dir = 1;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.scale(-dir, 1);                                                                    // מסתובב / הולך חזרה
  const pawing = S && bp === 'charge' && S.bt < BOAR.pawT;
  const legA = pawing ? 0 : running ? Math.sin(t * 16) * 0.55 : walking ? Math.sin(t * 8) * 0.4 : bp === 'turn' ? Math.sin(t * 12) * 0.3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0.3, 9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  const body = '#4a3426', dark = '#2e1f16';
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  [[-5, 1], [-3, -1], [4, 1], [6, -1]].forEach(([lx, d], li) => { const pw = pawing && li === 0 ? Math.sin(t * 11) : 0; ctx.beginPath(); ctx.moveTo(lx, -5); ctx.lineTo(lx + Math.sin(legA * d) * 3 + pw * 1.6, -0.4 - Math.max(0, pw) * 0.8); ctx.stroke(); });   // גורף ברגל הקדמית לפני ההסתערות
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(1, -7.5, 9, 5, -0.08, 0, Math.PI * 2); ctx.fill();
  const NM = 16, back = u => -11.6 - Math.sin(Math.PI * Math.min(1, (u + 0.1) / 1.1)) * 0.9 + u * 0.9;   // קו הגב
  ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.moveTo(-7.5, back(0) + 2.2);            // רעמת זיפים שחורה: ארוכה בצוואר, הולכת ומתקצרת לכיוון הזנב
  for (let i = 0; i <= NM; i++) {
    const u = i / NM, bx = -7.5 + u * 17, by = back(u);
    const h = (0.35 + 4.4 * Math.pow(1 - u, 1.6)) * (i % 2 ? 1 : 0.55);                         // אורך הזיף
    ctx.lineTo(bx + h * 0.35, by - h);                                                          // הזיפים נוטים קצת אחורה
    ctx.lineTo(bx + 0.53, by + 0.2);
  }
  for (let i = NM; i >= 0; i--) { const u = i / NM; ctx.lineTo(-7.5 + u * 17, back(u) + 0.3 + 1.9 * (1 - u)); }   // הבסיס של הרעמה – עבה בצוואר, דק בזנב, צמוד לגב
  ctx.closePath(); ctx.fill();
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
function drawBoar(o) {}                                                                // החזירים מצוירים מעל העצים (drawForestFront)
function boarCharging(o) { return !!boarS && boarS.o === o && boarS.cx !== null && (boarS.bp === 'charge' || boarS.bp === 'lost' || boarS.bp === 'return'); }
