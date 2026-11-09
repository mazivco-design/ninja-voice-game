/* ninja-voice-game – boar.js
   חזירי בר ביער (SNEAK + HIDE): הנינג'ה מתגנב ממחסה למחסה – שלושה עצים וסלע גדול, במרחקים שונים. החבר תמיד מחסה אחד לפניו.
   שני חזירים מסיירים בתורות ומסתובבים רק מחוץ למסך:
   · חזיר על השביל (מלפנים) הולך שמאלה, אל הנינג'ה. HIDE מולו = מאחורי הגזע.
   · חזיר מאחורי העצים (בעומק) הולך ימינה. HIDE מולו = בצד הקדמי של הגזע (הגזע מסתיר אותו מאחור).
   כל חזיר עוצר לאכול (פס ירוק מעליו = כמה זמן עוד יאכל), האוזניים זזות (אדום) ואז מרים את הראש ומסתכל.
   SNEAK פתוח תמיד. אם חזיר מסתכל כשהנינג'ה בחוץ / בצד הלא נכון – הוא מסתער. HIDE ליד מחסה מציל; לא מתחבאים – נופלים (כוכב, לא לב).
   החבר לוחש "Now!" כשבטוח ו-"Hide!" כשהאוזניים זזות – בשני המחסות הראשונים, וגם אחרי שתי נפילות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

// המחסות: מרחק מהמחסה הראשון (שונים – קצר / ארוך), סוג, עובי, צבע, נטייה וענפים [גובה יחסי, צד, אורך]
const BOAR_TREES = [
  { dx: 0,   kind: 'tree', w: 9.5, col: '#8a6a4c', lean: 0,      br: [[0.40, -1, 10], [0.62, 1, 8]] },
  { dx: 42,  kind: 'tree', w: 8.8, col: '#93734f', lean: 0.025,  br: [[0.50, 1, 9]] },
  { dx: 104, kind: 'rock', w: 24 },
  { dx: 146, kind: 'tree', w: 10.5, col: '#826347', lean: -0.01, br: [[0.36, -1, 10], [0.58, 1, 9], [0.74, 1, 6]] }
];
const BOAR = { size: 1.2, lead: 200, ramp: 70, edge: 110, tree0: 24, trees: BOAR_TREES.length, walkV: 14, duckT: 0.35,
               bWalkV: 10, walkMin: 1.6, walkMax: 2.6, grazeMin: 2.6, grazeMax: 5.2, lookT: 1.5, pawT: 1.0, lostT: 1.3,
               fallT: 1.1, knock: 7, passBy: 26, coins: 4, enter: 16, rockH: 15, tutor: 2, near: 24, deepY: -3.2, deepS: 0.8 };
const BOAR_EARS = { easy: 2.0, medium: 1.5, hard: 1.15 };                         // כמה זמן יש להגיד HIDE מרגע שהאוזניים זזות
const BOAR_GRAZE = { easy: 1.25, medium: 1, hard: 0.85 };                         // כמה זמן החזיר אוכל (פס ירוק)
const BOAR_CHARGE = { easy: 2.8, medium: 2.2, hard: 1.7 };                           // כמה שניות לוקחת ההסתערות (אחרי הגריפה) – יש זמן להתחבא
let boarS = null;   // { o, np, nt, i, side: 'back'/'front', boars: [{x, dir, m, t, dur, g}], ch, f: החבר {x, i, np, nt}, miss, fs }

function boarLead() { return forestFull() ? 30 : BOAR.lead; }                      // באימון – כבר ביער, אין אזור ביניים
function boarSetup(o) { o.lead = boarLead(); o.w = o.lead + BOAR.tree0 + BOAR_TREES[BOAR.trees - 1].dx + 30; }
function fo(o) { return o.x + (o.lead || BOAR.lead); }                             // תחילת היער
function fw(o) { return o.w - (o.lead || BOAR.lead); }                             // אורך היער
function boarTreeX(o, i) { return fo(o) + BOAR.tree0 + BOAR_TREES[i].dx; }          // מרכז המחסה
function forestFull() { return mode === 'stage' && playWords.includes('boar'); }
function boarStandGap(i) { return BOAR_TREES[i].w / 2 + 0.4; }
function boarStandR(o, i) { return boarTreeX(o, i) - boarStandGap(i); }          // הקצה הימני של הנינג'ה כשהוא עומד ליד המחסה
function boarHideDX() { return boarStandGap(boarS ? boarS.i : 0) + PLAYER.w / 2; }   // כמה זזים כדי להיות בדיוק מול / מאחורי המחסה
function boarEarsT() { return BOAR_EARS[diffKey] || 1.6; }
function boarBusy() { return !!boarS; }
function boarChargeV() { const B = boarS && boarS.ch; return Math.max(8, B ? B.dist / (BOAR_CHARGE[diffKey] || 2.2) : 9); }
function boarNX() { return PLAYER.x + PLAYER.w / 2; }
const rnd = (a, b) => a + Math.random() * (b - a);
function boarGrazeDur() { return rnd(BOAR.grazeMin, BOAR.grazeMax) * (BOAR_GRAZE[diffKey] || 1); }
function boarIsLast() { return false; }                                             // (הטיפוס בסוף – כבוי בינתיים)
function boarClimb() { return false; }

// מהירות העולם בזמן הסצנה
function boarSpeed() {
  if (!boarS) return null;
  const S = boarS, p = S.np;
  if (p === 'walk') return BOAR.walkV;
  if (p === 'exit') return lerp(BOAR.walkV, speed, Math.min(1, S.nt / 1.5));
  if (p === 'duck') return S.atTrunk ? 0 : boarHideDX() / BOAR.duckT;
  if (p === 'fall') return S.nt < 0.4 ? -BOAR.knock / 0.4 : 0;
  return 0;
}

/* ---------- החזירים המסיירים ---------- */
// dir -1: על השביל, הולך שמאלה (אל הנינג'ה). dir 1: מאחורי העצים, הולך ימינה. שניהם: הליכה → אוכל (פס ירוק) → אוזניים → מרים ראש → ממשיך
function boarNew(dir, x, delay) { return { x, dir, m: delay ? 'off' : 'walk', t: 0, dur: delay || rnd(BOAR.walkMin, BOAR.walkMax), g: boarGrazeDur() }; }
function boarDeep(B) { return B.dir === 1; }                                        // מאחורי העצים
function boarDanger(B) {                                                             // יכול לראות את הנינג'ה מאיפה שהוא
  if (B.m === 'off' || B.x > viewR() - 4 || B.x < viewL() + 4) return false;
  return B.dir === -1 ? B.x > boarNX() + BOAR.near : Math.abs(B.x - boarNX()) > 8;
}
function boarSideFor(B) { return boarDeep(B) ? 'front' : 'back'; }                 // באיזה צד של הגזע מתחבאים ממנו
function boarSafeFrom(B) { const S = boarS; return (S.np === 'hidden' || (S.np === 'duck' && S.nt > 0.15)) && S.side === boarSideFor(B); }
function boarSees(B) { return boarDanger(B) && B.m === 'look' && !boarSafeFrom(B); }
function boarThreat() {                                                              // החזיר שהכי קרוב להרים את הראש
  let best = null, bt = Infinity;
  for (const B of boarS.boars) { const t = boarTimeToLook(B); if (t < bt) { bt = t; best = B; } }
  return best;
}
// כמה שניות עד שהחזיר הזה ירים את הראש (לסימן "כדאי לצאת")
function boarTimeToLook(B) {
  if (B === (boarS && boarS.ch)) return 0;
  if (B.m === 'off') return Math.max(0, B.dur - B.t) + 1.5 + B.g;
  if (B.dir === -1 && B.x < boarNX() + BOAR.near) return Infinity;                  // עבר אותו
  if (B.m === 'look' || B.m === 'ears') return 0;
  if (B.m === 'graze') return Math.max(0, B.dur - B.t);
  if (B.m === 'walk') { const enter = B.dir === -1 ? Math.max(0, (B.x - (viewR() - 4)) / BOAR.bWalkV) : Math.max(0, ((viewL() + 4) - B.x) / BOAR.bWalkV); return Math.max(enter, B.dur - B.t) + B.g; }
  return Infinity;
}
function boarPatrol(B, dt) {
  B.t += dt;
  const L = viewL() - BOAR.enter, R = viewR() + BOAR.enter;
  if (B.dir === -1 && (B.m === 'graze' || B.m === 'ears' || B.m === 'look') && B.x < boarNX() + BOAR.near) { B.m = 'walk'; B.t = 0; B.dur = 99; }   // הנינג'ה התקרב – ממשיך ללכת ועובר
  switch (B.m) {
    case 'off': if (B.t >= B.dur) { B.m = 'walk'; B.t = 0; B.dur = rnd(BOAR.walkMin, BOAR.walkMax); B.x = B.dir === -1 ? R : L; } break;
    case 'walk':
      B.x += B.dir * BOAR.bWalkV * dt;
      if (B.dir === 1 && B.x > R) { B.dir = -1; B.m = 'off'; B.t = 0; B.dur = rnd(0.6, 2.0); B.g = boarGrazeDur(); B.stops = 0; }   // יצא מימין – מסתובב מחוץ למסך ועובר לשביל
      else if (B.dir === -1 && B.x < L) { B.dir = 1; B.m = 'off'; B.t = 0; B.dur = rnd(0.6, 2.0); B.g = boarGrazeDur(); B.stops = 0; }   // יצא משמאל – מסתובב מחוץ למסך ועובר אל מאחורי העצים
      else if (B.t >= B.dur && boarDanger(B) && (B.stops || 0) < (B.dir === 1 ? 1 : 2)) { B.m = 'graze'; B.t = 0; B.dur = B.g; B.stops = (B.stops || 0) + 1; }   // עוצר לאכול (בעומק – פעם אחת במעבר)
      break;
    case 'graze':
      if (B.t >= B.dur) {
        if (boarS && boarS.boars.some(b => b !== B && (b.m === 'ears' || b.m === 'look' || b === boarS.ch) && boarDanger(b))) B.dur += 1.5;   // לא שניהם בבת אחת – מחכה שהשני יסיים
        else { B.m = 'ears'; B.t = 0; sfx('swish'); }
      }
      break;
    case 'ears': if (B.t >= boarEarsT()) { B.m = 'look'; B.t = 0; } break;
    case 'look': if (B.t >= BOAR.lookT) { B.m = 'walk'; B.t = 0; B.dur = B.dir === 1 && B.x > boarNX() ? 99 : rnd(BOAR.walkMin, BOAR.walkMax); B.g = boarGrazeDur(); } break;
  }
}

/* ---------- הסצנה ---------- */
function boarFriendX(o, i) { return i >= BOAR.trees ? boarTreeX(o, BOAR.trees - 1) + 30 : boarStandR(o, i) - PLAYER.w / 2; }   // איפה החבר עומד ליד מחסה i
function boarUpdate(dt, pb) {
  for (const o of obstacles) if (o.type === 'boar' && o.lastS && o.lastS !== boarS) {   // אחרי הסצנה – החזירים והחבר ממשיכים ללכת עד שהם יוצאים מהמסך
    const L = o.lastS, d = o.x - L.ox;
    for (const B of L.boars) { B.x += d; if (B.m !== 'off') { if (B.m !== 'walk' && B.m !== 'pass') { B.m = 'walk'; B.t = 0; } B.x += B.dir * BOAR.bWalkV * dt; } }
    L.f.x += d + 16 * dt; L.f.np = 'run'; L.ox = o.x; L.ch = null;
  }
  if (!boarS) {
    const o = obstacles.find(o => o.type === 'boar' && !o.passed && pb.r >= boarStandR(o, 0) - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - boarStandR(o, 0); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0; act.hide = 0;
    boarS = { o, np: 'stand', nt: 0, i: 0, side: 'back', miss: 0, fs: null, fsT: 0, ch: null, ox: o.x,
              f: { x: boarFriendX(o, 1), i: 1, np: 'stand', nt: 0, from: 0 },
              boars: [boarNew(-1, viewR() + 6, 0), boarNew(1, viewL() - BOAR.enter, 5.5)] };
    o.lastS = boarS;
    return;
  }
  const S = boarS, o = S.o; S.nt += dt; S.fsT += dt;
  if (!obstacles.includes(o)) { boarS = null; return; }
  const d = o.x - S.ox; if (d) { for (const B of S.boars) B.x += d; S.f.x += d; }    // החזירים והחבר זזים יחד עם היער
  S.ox = o.x;
  const demo = state !== 'play', goN = p => { S.np = p; S.nt = 0; };
  const atCover = S.np === 'stand' || S.np === 'hidden';
  // החזירים מסיירים (חוץ מזה שמסתער)
  for (const B of S.boars) if (B !== S.ch) {
    boarPatrol(B, dt);
    if (!S.ch && S.np !== 'fall' && S.np !== 'exit' && boarSees(B)) boarCharge(B);   // ראה אותו – מסתער
  }
  // ההסתערות: גורף ברגל ורץ אל הנינג'ה (גם חזיר מהעומק יוצא לשביל). מוסתר – מרחרח ומוותר. לא מוסתר – מפיל
  if (S.ch) {
    const B = S.ch; B.t += dt;
    if (B.m === 'charge') {
      if (B.lift < 1) B.lift = Math.min(1, B.lift + dt * 2.5);                         // מהעומק אל השביל
      if (B.t >= B.paw) {
        B.x += B.cdir * boarChargeV() * Math.min(1, (B.t - B.paw) / 0.6) * dt;
        if (Math.random() < 0.5) particles.push({ x: B.x - B.cdir * 10, y: GROUND - 0.5, vx: -B.cdir * 8, vy: -3, g: 8, life: 0.35, color: WORLDS[world].dust, size: 0.9 });
      }
      const snout = B.x + B.cdir * 14.5 * BOAR.size, cx = boarTreeX(o, S.i), hw = BOAR_TREES[S.i].w / 2 + 3;
      if (S.np === 'hidden' || S.np === 'duck') {
        if (B.cdir < 0 ? snout <= cx + hw : snout >= cx - hw) { B.m = 'lost'; B.t = 0; sfx('swish'); }   // הגיע למחסה – לא מוצא אף אחד
      } else if (B.cdir < 0 ? snout <= PLAYER.x + PLAYER.w + 1 : snout >= PLAYER.x - 1) {          // נגח!
        B.m = 'pass'; B.t = 0; goN('fall'); shakeT = 0.3; sfx('hit'); burst(PLAYER.x + 6, GROUND - 6, WORLDS[world].dust, 8, 16); S.miss++;
        if (state === 'play') { hits++; if (typeof voiceMark === 'function') voiceMark('hit'); renderHud(); }
      }
    } else if (B.m === 'lost' && B.t >= BOAR.lostT) { B.m = 'pass'; B.t = 0; }
    else if (B.m === 'pass') {                                                                    // ממשיך באותו כיוון ויוצא מהמסך
      B.x += B.cdir * BOAR.bWalkV * 1.4 * dt;
      if (B.x < viewL() - BOAR.enter || B.x > viewR() + BOAR.enter) { B.dir = B.cdir < 0 ? 1 : -1; B.m = 'off'; B.t = 0; B.dur = rnd(1, 2.5); B.lift = 0; B.stops = 0; S.ch = null; }
    }
  }
  // הנינג'ה
  switch (S.np) {
    case 'duck': if (S.nt >= BOAR.duckT) { goN('hidden'); S.atTrunk = 1; } break;
    case 'fall': if (S.nt >= BOAR.fallT) { if (S.walking) goN('walk'); else { goN('stand'); S.atTrunk = 0; } } break;
    case 'walk':
      if (pb.r >= boarStandR(o, S.i) - 0.01) {
        const over = pb.r - boarStandR(o, S.i); if (over > 0) ropeShiftBy(-over);
        goN('stand'); S.walking = 0; S.atTrunk = 0;
      }
      break;
    case 'exit':
      if (PLAYER.x > boarTreeX(o, BOAR.trees - 1) + BOAR.passBy) {
        cleared(o); boarS = null;
        if (mode === 'journey' && state === 'play') { picked += BOAR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BOAR.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
  }
  // החבר: מחסה אחד לפני הנינג'ה. מתחבא לבד בצד הנכון, ויוצא למחסה הבא כשהנינג'ה יוצא
  const F = S.f; F.nt += dt;
  const fx = boarFriendX(o, F.i);
  if (F.x < fx - 0.05) { F.np = 'walk'; F.x = Math.min(fx, F.x + BOAR.walkV * 1.15 * dt); }
  else {
    const th = S.boars.find(b => (b.m === 'ears' || b.m === 'look' || b === S.ch) && boarDanger(b));
    F.np = th && F.i < BOAR.trees ? 'hidden' : F.i >= BOAR.trees ? 'wave' : 'stand'; F.side = th ? boarSideFor(th) : F.side || 'back';
  }
  // החבר לוחש "Now!" / "Hide!" בשני המחסות הראשונים (וגם אחרי שתי נפילות)
  const tutor = (S.i < BOAR.tutor || S.miss >= 2) && !demo && S.np !== 'exit';
  if (tutor && atCover) {
    const ears = S.boars.find(b => b.m === 'ears' && boarDanger(b) && !boarSafeFrom(b));
    if (ears) { if (S.fs !== 'hide') { S.fs = 'hide'; S.fsT = 0; if (VOICE_CLIPS['friend: hide!']) speak('friend: hide!'); } }
    else if (boarSneakGood() && S.fs !== 'now' && S.nt > 0.6) { S.fs = 'now'; S.fsT = 0; if (VOICE_CLIPS['friend: now!']) speak('friend: now!'); }
    else if (!boarSneakGood() && S.fs === 'now') S.fs = null;
    else if (S.fs === 'hide' && !ears) S.fs = null;
  } else S.fs = null;
  if (demo) {                                                                        // הדגמה: SNEAK כשכדאי, HIDE כשהאוזניים זזות
    const say = w => { const np = S.np, sd = S.side; command(w, 'demo'); if (S.np !== np || S.side !== sd) speak(w); };
    if (atCover && S.boars.some(b => b.m === 'ears' && boarDanger(b) && !boarSafeFrom(b) && b.t > 0.3)) say('hide');
    else if (atCover && boarSneakGood() && S.nt > 0.8) say('sneak');
  }
}
function boarCharge(B, paw) {                                                        // החזיר ראה את הנינג'ה – גורף ברגל ומסתער (אפשר עוד להתחבא!)
  const S = boarS; S.ch = B; B.m = 'charge'; B.t = 0; B.paw = paw || BOAR.pawT; B.lift = boarDeep(B) ? 0 : 1;
  B.cdir = B.x > boarNX() ? -1 : 1; B.dist = Math.max(10, Math.abs(B.x - boarNX()) - 14.5 * BOAR.size - PLAYER.w / 2);
  sfx('thud'); burst(B.x + B.cdir * 14, GROUND - 6, 'rgba(255,255,255,.8)', 5, 10);
  flash = { text: '🐗 He saw you – HIDE!', t: 1.6 };
}
function boarPhysics() {
  if (!boarS) return false;
  const S = boarS;
  if (S.np === 'fall') { const k = Math.min(1, S.nt / 0.4); py = S.nt < 0.4 ? Math.sin(Math.PI * k) * 3 : 0; vy = 0; return true; }
  py = 0; vy = 0; return true;
}

/* ---------- פקודות ---------- */
// HIDE: הצד נבחר לפי החזיר המאיים – מהשביל → מאחורי הגזע, מאחורי העצים → בצד הקדמי. HIDE שוב מחליף צד
function boarHide() {
  if (!boarS) return false;
  const S = boarS;
  if (S.np === 'stand' || S.np === 'hidden') {
    const th = S.ch || boarThreat(), side = th ? boarSideFor(th) : 'back';
    if (S.np === 'hidden' && side === S.side) return true;
    S.side = side; S.np = 'duck'; S.nt = 0; sfx('swish');
  }
  return true;                                                                       // ביער – HIDE תמיד שייך לחזיר
}
// עכשיו כדאי לצאת: אף חזיר לא ירים את הראש לפני שהנינג'ה יגיע למחסה הבא
function boarTripT() { const S = boarS; if (!S) return 0; const tx = S.i >= BOAR.trees - 1 ? boarTreeX(S.o, S.i) + BOAR.passBy : boarStandR(S.o, S.i + 1); return (tx - (PLAYER.x + PLAYER.w)) / BOAR.walkV + 0.4; }
function boarSneakGood() {
  const S = boarS; if (!S || S.ch) return false;
  const need = boarTripT();
  return S.boars.every(b => boarTimeToLook(b) > need || (b.dir === 1 && b.x > boarNX() + 30 && b.m === 'walk'));
}
function boarSneak() {                                                               // SNEAK פתוח תמיד – יוצאים למחסה הבא (מהאחרון – יוצאים מהיער)
  if (!boarS) return false;
  const S = boarS;
  if (S.np !== 'stand' && S.np !== 'hidden') return true;
  if (S.i >= BOAR.trees - 1) { S.np = 'exit'; S.nt = 0; S.f.i = BOAR.trees; return true; }
  S.i++; S.np = 'walk'; S.nt = 0; S.walking = 1; S.atTrunk = 0; S.fs = null; S.fsT = 0;
  S.f.i = Math.min(BOAR.trees, S.i + 1);                                              // החבר יוצא למחסה שאחרי
  return true;
}
function boarExpected() {
  if (!boarS) return null;
  const S = boarS;
  const warn = S.ch || S.boars.some(b => (b.m === 'ears' || b.m === 'look') && boarDanger(b) && !boarSafeFrom(b));
  if (S.np === 'stand') return warn ? ['hide'] : ['sneak', 'hide'];
  if (S.np === 'hidden') return warn ? ['hide', 'sneak'] : ['sneak'];
  return [];
}
function boarAuto() {
  const S = boarS; if (!S) return;
  if (S.np !== 'stand' && S.np !== 'hidden') return;
  if (S.ch || S.boars.some(b => b.m === 'ears' && boarDanger(b) && !boarSafeFrom(b) && b.t > 0.4)) command('hide', 'auto');
  else if (boarSneakGood() && S.nt > 0.5) command('sneak', 'auto');
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
function poseCrouchHide(now) {                                                        // כורע מאחורי סלע
  const P = poseIdle(now); P.hipY = -2.0; P.lean = 0.35; P.legs = [[1.5, -0.4], [1.3, -0.6]]; P.arms = [[0.9, 2.2], [1.1, 2.4]]; P.eyes = 'wide'; P.bob = 0;
  return P;
}
function poseTreeHug(now) { const P = poseIdle(now); P.lean = -0.06; P.arms = [[0.25, 0.4], [0.3, 0.45]]; P.eyes = 'wide'; return P; }   // נצמד לגזע
function poseFor(np, nt, now, kind, bt) {                                             // התנוחה לפי מצב (גם לחבר)
  if (np === 'walk') return poseSneak(bt);
  if (np === 'duck') { const P = poseWalk(nt * 22); P.lean = 0.1; return P; }
  if (np === 'hidden') return kind === 'rock' ? poseCrouchHide(now) : poseTreeHug(now);
  if (np === 'fall') { const P = nt < 0.6 ? poseAir(false) : poseIdle(now); if (nt < 0.6) { P.lean = -0.5; P.eyes = 'wide'; } return P; }
  if (np === 'climb') return poseClimb(nt * 7);
  if (np === 'climbed') { const P = poseIdle(now); P.hipY = -2.2; P.legs = [[1.45, -0.15], [1.55, -0.05]]; P.arms = [[0.4, 0.3], [2.7, 3.0]]; P.eyes = 'wide'; return P; }   // יושב על ענף, מחזיק בגזע
  if (np === 'down') return poseAir(nt < 0.3);
  return poseIdle(now);
}
function boarPose(P) {
  if (!boarS) return P;
  const S = boarS, p = S.np, now = performance.now() / 1000, kind = BOAR_TREES[S.i].kind;
  if (p === 'exit') return S.nt < 1.2 ? poseWalk(bgX * 0.42 * RIG.run.cadence * 1.6) : poseRun(bgX * 0.42 * RIG.run.cadence);
  if (p === 'stand') { P = poseIdle(now); if (S.ch || S.boars.some(b => b.m === 'ears' && boarDanger(b))) P.eyes = 'wide'; return P; }
  return poseFor(p, S.nt, now, kind, bgX * 0.42 * RIG.run.cadence * 1.25);
}

/* ---------- ציור ---------- */
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
    fTree(x, 1 + boarRnd(i) * 0.9, cy, G - 2, 'rgba(140,138,110,.55)', 'rgba(150,192,150,.62)', 5 + boarRnd(i + 30) * 4, i * 5, (boarRnd(i + 60) - 0.5) * 0.04);
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
    fTree(x, 2.2 + boarRnd(i + 2) * 1.2, cy, G - 3, '#8a7458', i % 2 ? '#3f6e3c' : '#46733f', 10 + boarRnd(i + 35) * 4, 40 + i * 9, (boarRnd(i + 66) - 0.5) * 0.05);
  }
  fBlobs(wrapX(50 - bgX * 0.42, L - 40, R + 40), top - 2, 26, '#3f6b3d', 10, 33);
  fBlobs(wrapX(135 - bgX * 0.42, L - 40, R + 40), top - 3, 28, '#3a643a', 10, 51);
  ctx.fillStyle = 'rgba(120,112,78,.55)'; ctx.beginPath(); ctx.moveTo(L, G + 1);       // קרקע היער מאחור – העצים עומדים עליה ולא צפים
  for (let x = L; x <= R + 3; x += 3) ctx.lineTo(x, G - 3.2 - Math.sin((x + bgX * 0.3) * 0.11) * 1.1 - Math.sin((x + bgX * 0.3) * 0.37) * 0.5);
  ctx.lineTo(R + 3, G + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(132,124,86,.9)'; ctx.beginPath(); ctx.moveTo(L, G + 1);
  for (let x = L; x <= R + 3; x += 3) ctx.lineTo(x, G - 1.4 - Math.sin((x + bgX * 0.42) * 0.17 + 2) * 0.7);
  ctx.lineTo(R + 3, G + 1); ctx.closePath(); ctx.fill();
  const pg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 30); pg.addColorStop(0, '#a88a62'); pg.addColorStop(1, '#836747');   // שביל עפר ביער
  ctx.fillStyle = pg; ctx.fillRect(L, GROUND - 1.3, R - L, 60);
  ctx.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 24; i++) { const x = wrapX(L + boarRnd(i + 70) * 200 - bgX, L - 3, R + 3); ctx.beginPath(); ctx.ellipse(x, GROUND + 2 + boarRnd(i + 80) * 14, 0.8 + boarRnd(i), 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// המחסות על השביל (מעל הנינג'ה – מתחבאים מאחוריהם), החזיר המסתער, הסימנים ועלים נושרים
function drawRock(x, w) {
  const h = BOAR.rockH, G = GROUND + 1.2;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 0.6, w * 0.62, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b6f73'; ctx.beginPath(); ctx.moveTo(x - w / 2, G);
  ctx.quadraticCurveTo(x - w / 2 - 0.5, G - h * 0.7, x - w * 0.18, G - h); ctx.quadraticCurveTo(x + w * 0.2, G - h * 1.08, x + w * 0.42, G - h * 0.62);
  ctx.quadraticCurveTo(x + w / 2 + 0.6, G - h * 0.3, x + w / 2, G); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(x - w * 0.18, G - h * 0.78, w * 0.22, h * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();   // אור
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x + w * 0.22, G - h * 0.3, w * 0.24, h * 0.24, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4f7a3f'; ctx.beginPath(); ctx.ellipse(x - w * 0.05, G - h * 0.98, w * 0.2, 0.7, 0.1, 0, Math.PI * 2); ctx.fill();   // טחב
  ctx.strokeStyle = 'rgba(40,40,40,.35)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(x + 1, G - h * 0.9); ctx.lineTo(x + 2.2, G - h * 0.55); ctx.lineTo(x + 1.6, G - h * 0.3); ctx.stroke();   // סדק
}
function drawForestFront(o, top, bottom) {
  if (!forestOn(o)) return;
  ctx.save();
  const S = boarS && boarS.o === o ? boarS : o.lastS || null, live = S && S === boarS;
  for (let i = 0; i < BOAR.trees; i++) {
    const x = boarTreeX(o, i), T = BOAR_TREES[i];
    if (x < viewL() - 20 || x > viewR() + 20) continue;
    if (T.kind === 'rock') drawRock(x, T.w); else bigTree(x, top, T, i);
  }
  if (S) {
    if (S.f.side === 'front' && S.f.np === 'hidden') drawBoarFriend(S);               // החבר בצד הקדמי של המחסה
    if (live && S.side === 'front' && (S.np === 'hidden' || (S.np === 'duck' && S.nt > 0.12))) drawNinja();   // הנינג'ה בצד הקדמי – מעל הגזע
    for (const B of S.boars) {                                                       // חזירים על השביל – לפני המחסות
      if (B.m === 'off' || B.x < viewL() - 25 || B.x > viewR() + 25) continue;
      if (B === S.ch) { const k = B.lift === undefined ? 1 : B.lift; drawBoarFig(B.x, lerp(GROUND + BOAR.deepY, GROUND + 2.2, k), BOAR.size * lerp(BOAR.deepS, 1.04, k), Object.assign({}, B, { dir: B.cdir })); }
      else if (B.dir === -1) drawBoarFig(B.x, GROUND + 2.2, BOAR.size, B);
    }
    if (live) { drawBoarBars(S); drawSneakSign(S); drawFriendTalk(S); }
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
// החזירים מאחורי העצים (בעומק) והחבר (כשהוא לא בצד הקדמי) – לפני הנינג'ה והמחסות
function drawBoar(o) {
  const S = boarS && boarS.o === o ? boarS : o.lastS || null;
  if (!S) return;
  for (const B of S.boars) {
    if (B === S.ch || B.dir !== 1 || B.m === 'off' || B.x < viewL() - 25 || B.x > viewR() + 25) continue;
    ctx.save(); ctx.globalAlpha *= 0.9; drawBoarFig(B.x, GROUND + BOAR.deepY, BOAR.size * BOAR.deepS, B); ctx.restore();
  }
  if (!(S.f.side === 'front' && S.f.np === 'hidden')) drawBoarFriend(S);
}
function drawBoarFriend(S) {
  const F = S.f, now = performance.now() / 1000;
  if (F.x < viewL() - 10 || F.x > viewR() + 10) return;
  const kind = F.i < BOAR.trees ? BOAR_TREES[F.i].kind : 'tree';
  let P;
  if (F.np === 'run') P = poseRun(now * 9);
  else if (F.np === 'walk') P = poseSneak(now * 9);
  else if (F.np === 'hidden') P = kind === 'rock' ? poseCrouchHide(now) : poseTreeHug(now);
  else if (F.np === 'wave') { P = poseIdle(now); P.arms = [[0.4, 0.5], [2.7, 3.1 + Math.sin(now * 10) * 0.35]]; }   // מחכה מחוץ ליער ומנופף
  else P = poseIdle(now);
  if (S.fs === 'now' && F.np === 'stand') P.arms = [[0.4, 0.5], [2.0, 2.3 + Math.sin(now * 8) * 0.3]];   // מסמן "עכשיו!"
  const hx = F.np === 'hidden' && F.i < BOAR.trees ? boarTreeX(S.o, F.i) : F.x;     // מתחבא – צמוד למרכז המחסה
  drawFigure({ fx: hx, fy: GROUND, facing: F.np === 'wave' ? -1 : 1, scale: 0.92, kind: 'ninja', accent: '#2563eb', pose: P, suit: null });
}
function drawFriendTalk(S) {                                                          // מה החבר לוחש
  const txt = { now: 'Now!', hide: 'Hide!' }[S.fs];
  if (!txt) return;
  const red = S.fs === 'hide', F = S.f, x = F.np === 'hidden' && F.i < BOAR.trees ? boarTreeX(S.o, F.i) : F.x, y = GROUND - 19;
  ctx.save(); ctx.font = '900 3.2px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width + 3;
  ctx.fillStyle = red ? '#fee2e2' : '#ffffff'; roundRect(x - w / 2, y - 2.6, w, 5.2, 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 1, y + 2.5); ctx.lineTo(x, y + 4.2); ctx.lineTo(x + 1, y + 2.5); ctx.fill();
  ctx.fillStyle = red ? '#b91c1c' : '#15803d'; ctx.fillText(txt, x, y + 0.2); ctx.restore();
}
// פס מעל כל חזיר שיכול לראות: ירוק שמתקצר = כמה זמן עוד יאכל, אדום = האוזניים זזות / מסתכל
function drawBoarBars(S) {
  const t = performance.now() / 1000;
  for (const B of S.boars) {
    if (B === S.ch || !boarDanger(B)) continue;
    const deep = boarDeep(B), x = B.x - B.dir * -3, y = deep ? GROUND + BOAR.deepY - 17 : GROUND - 17.5, w = deep ? 10 : 12;
    let f = 1, col = '#22c55e', icon = '🌿';
    if (B.m === 'graze') { f = 1 - B.t / B.dur; col = f < 0.3 ? '#f59e0b' : '#22c55e'; }
    else if (B.m === 'walk') { f = 1; col = '#86efac'; icon = '👃'; }
    else { col = '#ef4444'; f = 1; icon = B.m === 'look' ? '👀' : '👂'; }
    ctx.save();
    if (B.m === 'ears' || B.m === 'look') ctx.globalAlpha = 0.75 + Math.sin(t * 14) * 0.25;
    ctx.fillStyle = 'rgba(15,23,42,.55)'; roundRect(x - w / 2, y, w, 1.8, 0.9); ctx.fill();
    ctx.fillStyle = col; roundRect(x - w / 2, y, Math.max(0.9, w * f), 1.8, 0.9); ctx.fill();
    ctx.font = '2.6px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, x - w / 2 - 2, y + 0.9);
    ctx.restore();
  }
}
// חזיר הבר בפרופיל. B.dir: -1 פונה שמאלה (אל הנינג'ה), 1 ימינה. head: 0 = ראש למטה (אוכל), 1 = ראש למעלה (מסתכל)
function drawBoarFig(x, y, s, B) {
  const t = performance.now() / 1000 + x * 0.013, m = B.m;
  const pawing = m === 'charge' && B.t < B.paw, running = m === 'charge' && !pawing, walking = m === 'walk' || m === 'pass';
  let head = 0;
  if (m === 'look') head = Math.min(1, B.t / 0.25) * (B.t > BOAR.lookT - 0.3 ? (BOAR.lookT - B.t) / 0.3 : 1);
  if (m === 'charge') head = pawing ? 0.1 : 0.6;
  if (walking) head = 0.2;
  if (m === 'dizzy') head = 0.35;
  const chew = m === 'graze' || m === 'lost' ? Math.sin(t * 9) * 0.06 : 0;
  const ear = m === 'ears' ? Math.sin(t * 22) * 0.35 : 0;
  const ang = -0.9 * (1 - head) + chew;
  const dir = B.dir || -1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.scale(-dir, 1);
  if (m === 'dizzy') ctx.rotate(Math.sin(t * 9) * 0.06);
  const legA = pawing ? 0 : running ? Math.sin(t * 16) * 0.55 : walking ? Math.sin(t * (B.dir === 1 ? 12 : 8)) * 0.4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0.3, 9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  const body = '#4a3426', dark = '#2e1f16';
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  [[-5, 1], [-3, -1], [4, 1], [6, -1]].forEach(([lx, d], li) => { const pw = pawing && li === 0 ? Math.sin(t * 11) : 0; ctx.beginPath(); ctx.moveTo(lx, -5); ctx.lineTo(lx + Math.sin(legA * d) * 3 + pw * 1.6, -0.4 - Math.max(0, pw) * 0.8); ctx.stroke(); });
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(1, -7.5, 9, 5, -0.08, 0, Math.PI * 2); ctx.fill();
  const NM = 16, back = u => -11.6 - Math.sin(Math.PI * Math.min(1, (u + 0.1) / 1.1)) * 0.9 + u * 0.9;
  ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.moveTo(-7.5, back(0) + 2.2);
  for (let i = 0; i <= NM; i++) {
    const u = i / NM, bx = -7.5 + u * 17, by = back(u);
    const h = (0.35 + 4.4 * Math.pow(1 - u, 1.6)) * (i % 2 ? 1 : 0.55);
    ctx.lineTo(bx + h * 0.35, by - h); ctx.lineTo(bx + 0.53, by + 0.2);
  }
  for (let i = NM; i >= 0; i--) { const u = i / NM; ctx.lineTo(-7.5 + u * 17, back(u) + 0.3 + 1.9 * (1 - u)); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(9.8, -9); ctx.quadraticCurveTo(11.5, -10 + Math.sin(t * 6) * 0.6, 11, -7.5); ctx.stroke();   // זנב
  ctx.save(); ctx.translate(-6, -9); ctx.rotate(ang); ctx.translate(6, 9);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(-11, -10, -14, -6.5); ctx.lineTo(-14.5, -4.2); ctx.quadraticCurveTo(-10, -2.5, -5, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a5a4a'; ctx.beginPath(); ctx.ellipse(-14.4, -5.4, 0.9, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0f0a'; ctx.beginPath(); ctx.arc(-14.5, -5.8, 0.25, 0, Math.PI * 2); ctx.arc(-14.4, -4.9, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5ecd7'; ctx.beginPath(); ctx.moveTo(-12.6, -4.2); ctx.quadraticCurveTo(-14, -5.5, -13.2, -7.2); ctx.lineTo(-12.7, -6.8); ctx.quadraticCurveTo(-13.1, -5.4, -12, -4.3); ctx.fill();   // ניב
  if (head > 0.3 || running) {
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(-9.6, -8.4, 0.75, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-9.8, -8.4, 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-11, -9.8); ctx.lineTo(-8.6, -9.2); ctx.stroke();
  } else { ctx.strokeStyle = '#111'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(-9.7, -8.6, 0.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.save(); ctx.translate(-5.4, -10.8); ctx.rotate(ear);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-1.1, -0.2); ctx.lineTo(0, -3.2); ctx.lineTo(1, 0); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.restore();
  if (m === 'ears') {                                                                 // קווקווים ליד האוזן
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.35;
    for (let k = 0; k < 3; k++) { const a = -2.2 + k * 0.45; ctx.beginPath(); ctx.moveTo(x - 5.4 * s + Math.cos(a) * 4, y - 13 * s + Math.sin(a) * 4); ctx.lineTo(x - 5.4 * s + Math.cos(a) * 5.5, y - 13 * s + Math.sin(a) * 5.5); ctx.stroke(); }
  }
  if (m === 'dizzy') {                                                                // כוכבים מסתובבים מעל הראש
    ctx.fillStyle = '#fde047';
    for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; ctx.font = '2.4px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', x - 8 * s + Math.cos(a) * 3, y - 15 * s + Math.sin(a) * 1); }
  }
}
// סימן מעל הנינג'ה: עקבות ירוקות = כדאי להתגנב עכשיו, יד אדומה = עדיף לחכות / להתחבא
function drawSneakSign(S) {
  if (S.np !== 'stand' && S.np !== 'hidden') return;
  const safe = boarSneakGood(), t = performance.now() / 1000;
  const x = PLAYER.x + PLAYER.w / 2, y = GROUND - 21 + Math.sin(t * 4) * 0.4, r = 2.7 * (safe ? 1 + Math.sin(t * 6) * 0.06 : 1);
  ctx.save();
  ctx.fillStyle = safe ? 'rgba(34,197,94,.92)' : 'rgba(220,38,38,.92)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.35; ctx.stroke();
  ctx.font = '3px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(safe ? '👣' : '✋', x, y + 0.15);
  ctx.restore();
}
function boarCharging(o) { return !!boarS && boarS.o === o && !!boarS.ch; }
