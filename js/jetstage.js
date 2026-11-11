/* ninja-voice-game – jetstage.js
   שלב תרמיל הסילון (JET PACK): הנינג'ה מגיע לשפת תהום רחבה, ולידה מונח תרמיל סילון.
   PICK UP – מרים אותו · PUT ON – לובש אותו על הגב · FLY – ממריא מעל התהום.
   בזמן הטיסה: UP / DOWN – עולים ויורדים בין שלושה גבהים ואוספים מטבעות ואבני חן.
   באמצע התהום יש צוקים קטנים: DOWN מעליהם – נוחתים, פותחים תיבת אוצר, ו-UP – ממריאים שוב.
   מעל הצד השני: DOWN – נוחתים, מורידים את התרמיל (הוא נשאר שם) וממשיכים.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const JS = { crawlD: 40, crawlT: 5.4, fuelT: 30, refuel: 0.45, stop: 4, pack: 9, edge: 26, gap: 640, cave: false, left: 0.15, lowAt: 0.4, after: 40, lanes: [9, 19, 29], start: 1, flyV: 10, birdV: 6,
             pickT: 0.8, putT: 1.1, can0: 12, takeT: 1.0, landT: 1.0, dropT: 0.9, hitR: 4.2, getR: 4.2, coins: 3 };
// מה יש בדרך מעל התהום: מרחק מתחילת התהום, נתיב (0 נמוך, 1 אמצע, 2 גבוה), סוג
const JS_ITEMS = [                                                                   // רק מטבעות באוויר (היהלומים – בתיבות על הצוקים)
  { dx: 30, lane: 1, k: 'coin' }, { dx: 48, lane: 2, k: 'coin' }, { dx: 66, lane: 1, k: 'coin' },
  { dx: 160, lane: 2, k: 'coin' }, { dx: 178, lane: 2, k: 'coin' }, { dx: 200, lane: 1, k: 'coin' },
  { dx: 300, lane: 0, k: 'coin' }, { dx: 318, lane: 1, k: 'coin' }, { dx: 336, lane: 2, k: 'coin' },
  { dx: 440, lane: 1, k: 'coin' }, { dx: 458, lane: 2, k: 'coin' }, { dx: 560, lane: 1, k: 'coin' }, { dx: 578, lane: 0, k: 'coin' }
];
// צוקים קטנים בתוך התהום: מרכז (מתחילת התהום), רוחב, גובה הראש מעל הקרקע (שלילי = נמוך יותר) – על כל אחד תיבת אוצר
const JS_PILLARS = [{ dx: 120, w: 15, top: -2 }, { dx: 250, w: 14, top: 18 }, { dx: 380, w: 15, top: 7 }, { dx: 510, w: 13, top: 24 }];   // תחנות דלק רחוקות זו מזו: נמוכה, גבוהה, בינונית, גבוהה מאוד
// אי סלע באמצע התהום: כאן הדלק נגמר. מולו קיר גבוה עם מעבר נמוך בתחתית: CRAWL פנימה – PICK UP מיכל דלק – זוחל החוצה – FLY מעל הקיר
// צוק ענק בתהום: מגיע כמעט לראש המסך. נמוך על הפן שלו בולטת "שן" (מדף) – שם עוצרים. משם מעבר צר לתוך הצוק שנפתח לחלל פנימי עם מיכל הדלק
const JS_ISLE = { face: 230, cliffW: 52, cliffTop: 47.5, ledge: -10, can: 36 };   // לפי הסקיצה השנייה: צוק בצורת כיפה, מדף בבסיס בולט שמאלה, מערה נמוכה שנפתחת לחלל
let jetS = null;   // { o, p: שלב, t, lane, alt, base, items, got, pill: [נפתח?], pi: על איזה צוק }

function jsSetup(o) { o.w = JS.edge + JS.gap + JS.after; }
function jsEdge(o) { return o.x + JS.edge; }                                       // שפת התהום
function jsFar(o) { return o.x + JS.edge + JS.gap; }                               // הצד השני
function jsHole(o) { return { x: jsEdge(o), w: JS.gap }; }                         // החור באדמה (draw.js)
function jsBusy() { return !!jetS; }
const JS_ISLE_P = ['dying', 'isle', 'atCave', 'crawlIn', 'inCave', 'grab', 'crawlOut', 'refuel', 'atWall', 'rise', 'over'];
function jsWorn() { return !!jetS && (['empty', 'fuelPick', 'fuelPour', 'wear', 'take', 'fly', 'hover', 'land', 'perchDown', 'perch', 'pFuel', 'pPour', 'pReady', 'fall'].includes(jetS.p) || JS_ISLE_P.includes(jetS.p)); }
function jsFlying() { return !!jetS && ['take', 'fly', 'hover', 'land', 'perchDown', 'dying', 'rise', 'over', 'fall'].includes(jetS.p); }
function jsIsleX(o, dx) { return jsEdge(o) + dx; }
function jsPillarX(o, k) { return jsEdge(o) + JS_PILLARS[k].dx; }
function jsPillarUnder(o) {                                                         // מעל איזה צוק הנינג'ה עכשיו (או -1)
  const nx = PLAYER.x + PLAYER.w / 2;
  return JS_PILLARS.findIndex((P, k) => Math.abs(nx - jsPillarX(o, k)) < P.w / 2 - 1.5);
}

function jsSpeed() {
  if (!jetS) return null;
  const p = jetS.p;
  if (p === 'take') return JS.flyV * Math.min(1, jetS.t / JS.takeT);
  if (['perchDown', 'perch', 'pFuel', 'pPour', 'pReady'].includes(p)) return 0;
  if (p === 'fall') return JS.flyV * Math.max(0, 1 - jetS.t);
  if (p === 'dying') return PLAYER.x + PLAYER.w / 2 < jsIsleX(jetS.o, JS_ISLE.face) - 10 ? JS.flyV * 0.75 : 0;   // עוצר מעל השן
  if (p === 'over') return JS.flyV;
  if (p === 'crawlIn') return JS.crawlD / JS.crawlT;
  if (p === 'crawlOut') return -JS.crawlD / JS.crawlT;
  if (JS_ISLE_P.includes(p)) return 0;
  if (p === 'fly') return JS.flyV;
  if (p === 'drop') return 0;
  return 0;
}

function jsUpdate(dt, pb) {
  if (!jetS) {
    const o = obstacles.find(o => o.type === 'jetgap' && !o.passed && pb.r >= o.x + JS.stop - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = pb.r - (o.x + JS.stop); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    jetS = { o, lastK: -1, fuel: 0, p: 'find', t: 0, lane: JS.start, alt: 0, base: 0, items: JS_ITEMS.map(it => Object.assign({ x: it.dx, done: false }, it)), got: 0, hit: 0, pill: JS_PILLARS.map(() => false), pi: -1 };
    return;
  }
  const S = jetS, o = S.o; S.t += dt;
  if (!obstacles.includes(o)) { jetS = null; return; }
  const go = p => { S.p = p; S.t = 0; }, demo = state !== 'play';
  if (demo) {                                                                    // הדגמה
    if (S.p === 'find' && S.t > 0.8) command('pick up', 'demo');
    else if (S.p === 'hold' && S.t > 0.6) command('put on', 'demo');
    else if (S.p === 'empty' && S.t > 1.2) command('pick up', 'demo');
    else if (S.p === 'wear' && S.t > 0.6) command('fly', 'demo');
    else if (S.p === 'fly' || S.p === 'hover' || JS_ISLE_P.includes(S.p) || S.p === 'perch' || S.p === 'pReady') jsAuto('demo');
  }
  switch (S.p) {
    case 'pick': if (S.t >= JS.pickT) go('hold'); break;                         // מרים את התרמיל
    case 'put': if (S.t >= JS.putT) { go('empty'); sfx('thud'); flash = { text: '⛽ Empty! PICK UP', t: 2.2, size: 7 }; } break;   // לובש – והמד ריק
    case 'fuelPick': if (S.t >= JS.pickT) { go('fuelPour'); sfxFile('jet-refuel'); } break;                 // מרים את מיכל הדלק שליד התרמיל
    case 'fuelPour':                                                             // שופך לתרמיל – המד מתמלא
      S.fuel = Math.min(1, Math.max(0, (S.t - 0.4) / 1.0));
      if (S.t >= 1.6) { S.fuel = 1; go('wear'); flash = { text: '🚀 Full! FLY', t: 1.6, size: 7 }; sfx('coin'); }
      break;
    case 'take':                                                                 // ממריא
      S.alt = lerp(S.base, JS.lanes[S.lane], Math.min(1, S.t / JS.takeT));
      if (S.t >= JS.takeT) { go('fly'); S.rate = 0; }
      break;
    case 'fly': case 'hover': {
      if (S.p === 'fly' && !S.rate) {                                             // קצב שריפה לקטע: מגיעים לתחנה הבאה עם בערך חמישית במיכל
        const nx0 = PLAYER.x + PLAYER.w / 2, nextK = JS_PILLARS.findIndex((P, k) => !S.pill[k] && jsPillarX(o, k) > nx0 + 2);
        const tx = nextK >= 0 ? jsPillarX(o, nextK) : jsFar(o) + 6;
        S.rate = Math.max(0.02, (S.fuel - JS.left) / Math.max(1, (tx - nx0) / JS.flyV));
      }
      S.fuel = Math.max(0, S.fuel - dt * (S.rate || 1 / JS.fuelT));               // הדלק יורד בזמן הטיסה
      if (S.fuel <= 0 && S.p === 'fly' && !JS.cave) { go('fall'); sfx('thud'); flash = { text: '⛽ Out of fuel!', t: 1.6, size: 7 }; break; }   // נגמר באוויר – נופלים
      if (S.fuel > JS.lowAt + 0.05) { S.warned = 0; S.emptySnd = 0; }                       // אחרי מילוי – אפשר להזהיר שוב
      if (S.fuel < JS.lowAt && !S.emptySnd) { S.emptySnd = 1; sfxFile('jet-empty'); }       // המיכל מתרוקן – פעם אחת בכל טיסה
      if (S.fuel < JS.lowAt && S.fuel > 0 && (S.beepT = (S.beepT || 0) - dt) <= 0) { S.beepT = 0.25 + S.fuel * 1.6; try { if (sfxCtx) tone(880, 660, 0.08, 'square', 0.04); } catch (e) {} }   // צפצוף אזהרה
      if (S.fuel < JS.lowAt && !S.warned && state === 'play') { S.warned = 1; flash = { text: '⛽ Fuel low!', t: 1.6, size: 7 }; }
      if (S.fuel <= 0 && S.lane > 0 && JS.cave) S.lane = 0;                                 // בלי דלק – יורדים לגובה הנמוך (ועדיין מגיעים לצד השני)
      S.alt += (JS.lanes[S.lane] - S.alt) * Math.min(1, dt * 6);
      const far = jsFar(o), nx = PLAYER.x + PLAYER.w / 2;
      for (const it of S.items) {                                               // אוספים / נפגעים
        if (it.done) continue;
        if (it.k === 'bird') it.x -= JS.birdV * dt;
        const ix = jsEdge(o) + it.x, iy = JS.lanes[it.lane];
        if (Math.abs(ix - nx) < (it.k === 'bird' ? JS.hitR : JS.getR) && Math.abs(iy - S.alt) < 5) {
          it.done = true;
          if (it.k === 'bird') {                                                // (כרגע אין ציפורים בשלב)
            S.hit++; sfx('hit'); shakeT = 0.2; burst(ix, GROUND - iy - 4, '#e2e8f0', 8, 12);
            flash = { text: '🐦 UP / DOWN – fly around the birds!', t: 1.4 };
            if (state === 'play') { hits++; if (typeof voiceMark === 'function') voiceMark('hit'); renderHud(); }
          } else {                                                               // מטבע / אבן חן
            S.got++; sfx('coin'); burst(ix, GROUND - iy - 3, it.k === 'gem' ? '#67e8f9' : '#fde047', 7, 10);
            if (mode === 'journey' && state === 'play') { picked++; coinsFlying++; flyCoinToHud({ x: ix }, GROUND - iy - 3); }
          }
        }
      }
      const toIsle = jsIsleX(o, JS_ISLE.face) - 46 - nx;                          // לקראת הצוק הדלק אוזל בהדרגה ונגמר בדיוק מול המערה
      if (JS.cave && !S.isleDone && S.pill[0] && S.p === 'fly' && toIsle < 90 && toIsle > 0) {
        if (!S.drain) S.drain = { f: S.fuel, d: toIsle };
        S.fuel = Math.min(S.fuel, S.drain.f * toIsle / S.drain.d);
      }
      if (JS.cave && S.p === 'fly' && !S.isleDone && nx > jsIsleX(o, JS_ISLE.face) - 46) {      // הדלק נגמר! גולשים למטה אל השן שבצוק
        S.fuel = 0; S.lane = 0; go('dying'); sfx('thud');
        flash = { text: '⛽ Out of fuel!', t: 2.2, size: 7 };
      }
      if (S.p === 'fly' && nx > far + 6) go('hover');                            // מעל הצד השני – מחכים ל-DOWN
      if (S.p === 'hover' && state === 'play' && S.t > 2.5 && !S.hinted) { S.hinted = 1; sayWords(['down'], 1.6, S); }
      break;
    }
    case 'perchDown':                                                            // יורד אל הצוק הקטן
      S.alt = Math.max(JS_PILLARS[S.pi].top, S.alt - dt * 22);
      if (S.alt <= JS_PILLARS[S.pi].top) { S.lastK = S.pi; go('perch'); sfx('thud'); burst(PLAYER.x + 4, GROUND - S.alt - 1, '#e7c39a', 6, 10); }
      break;
    case 'perch': break;                                                         // עומד על התחנה – מחכה ל-PICK UP
    case 'pFuel': if (S.t >= JS.pickT) { go('pPour'); sfxFile('jet-refuel'); } break;                       // מרים את המיכל מהסלע
    case 'pPour': {                                                              // שופך לתרמיל – המד מתמלא
      const f0 = S.f0 === undefined ? (S.f0 = S.fuel) : S.f0;
      S.fuel = Math.min(1, f0 + (1 - f0) * Math.max(0, Math.min(1, (S.t - 0.4) / 1.0)));
      if (S.t >= 1.6) { S.fuel = 1; S.f0 = undefined; S.pill[S.pi] = true; go('pReady'); sfx('coin'); flash = { text: '🚀 Full! UP', t: 1.4, size: 7 }; }
      break;
    }
    case 'fall': {                                                               // נגמר הדלק באוויר: גולש ונופל לתהום, ואז חוזר לתחנה האחרונה
      S.alt -= dt * (8 + S.t * 30);
      if (S.t >= 1.4) {
        if (state === 'play' && !shieldSave() && !dragonSave()) {
          hits++; if (typeof voiceMark === 'function') voiceMark('hit');
          if (isFinite(lives)) { lives--; renderHud(); if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; } }
          renderHud();
        }
        const nx = PLAYER.x + PLAYER.w / 2, k = S.lastK;
        const X = k >= 0 ? jsPillarX(o, k) : o.x + JS.stop - PLAYER.w / 2;
        ropeShiftBy(-(nx - X)); S.rate = 0;
        for (const it of S.items) if (it.k === 'coin' && jsEdge(o) + it.x > X) it.done = it.done;   // המטבעות שכבר נאספו – נשארים נאספים
        if (k >= 0) { S.pi = k; S.pill[k] = false; S.alt = JS_PILLARS[k].top; S.fuel = 0.05; go('perch'); flash = { text: '⛽ Try again: PICK UP', t: 2, size: 7 }; }
        else { S.alt = 0; S.fuel = 1; go('wear'); flash = { text: '🚀 Try again: FLY', t: 2, size: 7 }; }
      }
      break;
    }
    case 'dying': {                                                              // גולש למטה בלי דלק אל האי
      const nx = PLAYER.x + PLAYER.w / 2;
      const overLedge = nx > jsIsleX(o, JS_ISLE.face) - 17;                       // עד שמגיעים מעל המדף – לא יורדים מתחת לקרקע
      S.alt = Math.max(overLedge ? JS_ISLE.ledge : 3, S.alt - dt * 14);
      if (nx >= jsIsleX(o, JS_ISLE.face) - 10.1 && S.alt <= JS_ISLE.ledge + 0.01) { go('isle'); sfx('thud'); burst(PLAYER.x + 4, GROUND - S.alt - 1, '#e7c39a', 8, 12); }
      break;
    }
    case 'isle': if (S.t > 0.8) go('atCave'); break;                             // נחת על השן – מול המעבר הצר
    case 'crawlIn': if (S.t >= JS.crawlT) go('inCave'); break;                   // זוחל לתוך המערה
    case 'grab':                                                                 // מרים את מיכל הדלק
      S.canGot = true;
      if (S.t >= 0.8) go('crawlOut');
      break;
    case 'refuel':                                                               // בחוץ, על השן: שופך את הדלק לתרמיל – המד מתמלא
      S.fuel = Math.min(1, Math.max(0, (S.t - 0.4) / 1.0));
      if (S.t >= 1.6) { S.fuel = 1; S.canDrop = 0; go('atWall'); }
      break;
    case 'crawlOut': if (S.t >= JS.crawlT) go('refuel'); break;                  // זוחל החוצה – עומד מול הקיר הגבוה
    case 'rise': {                                                               // FLY – עולה ישר למעלה לאורך הצוק הענק
      const k = Math.min(1, S.t / 3.2);
      S.alt = lerp(JS_ISLE.ledge, JS_ISLE.cliffTop + 2.5, k * k * (3 - 2 * k));
      if (S.t >= 3.2) go('over');
      break;
    }
    case 'over':                                                                 // עף מעל ראש הצוק, ואז יורד בחזרה לגובה רגיל
      if (PLAYER.x + PLAYER.w / 2 > jsIsleX(o, JS_ISLE.face) + JS_ISLE.cliffW + 8) { S.lane = 2; S.isleDone = true; go('fly'); }
      break;
    case 'land':                                                                 // יורד לקרקע בצד השני
      S.alt = Math.max(0, S.alt - dt * Math.max(14, JS.lanes[2] / JS.landT));
      if (S.alt <= 0) { S.alt = 0; go('drop'); sfx('thud'); burst(PLAYER.x + 4, GROUND - 1, WORLDS[world].dust, 8, 12); }
      break;
    case 'drop':                                                                 // מוריד את התרמיל – הוא נשאר על הקרקע
      if (S.t >= JS.dropT) {
        o.packX = PLAYER.x - 6 - o.x;                                            // איפה התרמיל נשאר (יחסית למכשול)
        cleared(o); jetS = null;
        if (mode === 'journey' && state === 'play') { picked += JS.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + JS.coins + ' 🟡', '#ca8a04'); }
      }
      break;
  }
  if (S.p === 'find' && state === 'play' && S.t > 4 && !S.h1) { S.h1 = 1; sayWords(['pick up'], 1.6, S); }
  if (S.p === 'hold' && state === 'play' && S.t > 4 && !S.h2) { S.h2 = 1; sayWords(['put on'], 1.6, S); }
  if (S.p === 'empty' && state === 'play' && S.t > 4 && !S.h4) { S.h4 = 1; sayWords(['pick up'], 1.6, S); }
  if (S.p === 'wear' && state === 'play' && S.t > 4 && !S.h3) { S.h3 = 1; sayWords(['fly'], 1.6, S); }
  if (state === 'play' && S.t > 3.5 && !(S.hs = S.hs || {})[S.p + S.pi]) {          // רמזים באי ובתחנות הדלק
    const w = { atCave: 'crawl', inCave: 'pick up', atWall: 'fly', perch: 'pick up', pReady: 'up' }[S.p];
    if (w) { S.hs[S.p + S.pi] = 1; sayWords([w], 1.6, S); }
  }
}
function jsPhysics() {
  if (!jetS) return false;
  py = jetS.alt; vy = 0; duckT = 0; flyT = 0;
  const sput = jetS.fuel < JS.lowAt ? 0.35 + jetS.fuel * 1.2 : 0.8;                     // דלק נמוך – הלהבה מגמגמת
  if (jsFlying() && Math.random() < sput) particles.push({ x: PLAYER.x + 0.5 + (Math.random() - 0.5), y: GROUND - py - 2, vx: -6 + Math.random() * 4, vy: 22 + Math.random() * 10, g: 0, life: 0.3, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', size: 1 + Math.random() * 0.6 });
  return true;
}

/* ---------- פקודות ---------- */
// מחזיר true כשהמילה שייכת לשלב הסילון (ואז שאר הפקודות לא מופעלות)
function jsCmd(word) {
  const S = jetS; if (!S) return false;
  if (word === 'pick up' && S.p === 'perch') { S.p = 'pFuel'; S.t = 0; sfx('swish'); return true; }   // בתחנה: מרים את מיכל הדלק
  if (word === 'pick up') { if (S.p === 'find') { S.p = 'pick'; S.t = 0; sfx('swish'); } else if (S.p === 'empty') { S.p = 'fuelPick'; S.t = 0; sfx('swish'); } else if (S.p === 'inCave') { S.p = 'grab'; S.t = 0; sfx('coin'); } return true; }
  if (word === 'crawl') { if (S.p === 'atCave') { S.p = 'crawlIn'; S.t = 0; sfx('swish'); } return true; }
  if (word === 'fly' && S.p === 'atWall') { S.p = 'rise'; S.t = 0; sfxFile('jet-takeoff'); flash = { text: '🚀 Full!', t: 1.2, size: 7 }; return true; }
  if (word === 'put on') { if (S.p === 'hold') { S.p = 'put'; S.t = 0; sfx('swish'); } return true; }
  if (word === 'fly' && S.p === 'wear') { S.base = 0; S.p = 'take'; S.t = 0; sfxFile('jet-takeoff'); return true; }
  if (word === 'fly') return true;
  if (word === 'up' || (word === 'fly' && S.p === 'pReady')) {
    if (S.p === 'pReady') { S.base = S.alt; S.lane = Math.max(1, S.lane); S.p = 'take'; S.t = 0; sfxFile('jet-takeoff'); }   // ממריאים מהצוק
    else if ((S.p === 'fly' || S.p === 'hover') && S.fuel > 0) S.lane = Math.min(2, S.lane + 1);
    return true;
  }
  if (word === 'down') {
    if (S.p === 'hover') { S.p = 'land'; S.t = 0; }                             // מעל הצד השני – נוחתים
    else if (S.p === 'fly' && jsPillarUnder(S.o) >= 0 && !S.pill[jsPillarUnder(S.o)]) { S.pi = jsPillarUnder(S.o); S.p = 'perchDown'; S.t = 0; }   // מעל צוק קטן – נוחתים עליו
    else if (S.p === 'fly') S.lane = Math.max(0, S.lane - 1);
    return true;
  }
  return ['jump', 'kick', 'throw', 'catch', 'run', 'stop'].includes(word) ? true : false;   // בזמן השלב – שאר המילים לא עושות כלום
}
function jsExpected() {
  const S = jetS; if (!S) return null;
  return { find: ['pick up'], hold: ['put on'], empty: ['pick up'], wear: ['fly'], fly: ['up', 'down'], hover: ['down'], perch: ['pick up'], pReady: ['up'], atCave: ['crawl'], inCave: ['pick up'], atWall: ['fly'] }[S.p] || [];
}
// טייס אוטומטי (בודק / הדגמה): מתחמק מציפורים ופונה אל המטבעות
function jsAuto(src) {
  const S = jetS; if (!S) return;
  src = src || 'auto';
  if (S.p === 'find' && S.t > 0.5) return command('pick up', src);
  if (S.p === 'hold' && S.t > 0.5) return command('put on', src);
  if (S.p === 'empty' && S.t > 0.5) return command('pick up', src);
  if (S.p === 'wear' && S.t > 0.5) return command('fly', src);
  if (S.p === 'hover' && S.t > 0.4) return command('down', src);
  const isleW = { atCave: 'crawl', inCave: 'pick up', atWall: 'fly' }[S.p];
  if (isleW && S.t > 0.6) return command(isleW, src);
  if (S.p === 'perch' && S.t > 0.8) return command('pick up', src);
  if (S.p === 'pReady' && S.t > 0.6) return command('up', src);
  if (S.p === 'fly' && jsPillarUnder(S.o) >= 0 && !S.pill[jsPillarUnder(S.o)]) return command('down', src);
  if (S.p !== 'fly') return;
  if ((S.autoCd = (S.autoCd || 0) - 1 / 60) > 0) return;
  const nx = PLAYER.x + PLAYER.w / 2, X = it => jsEdge(S.o) + it.x;
  const bad = l => S.items.some(it => !it.done && it.k === 'bird' && it.lane === l && X(it) > nx - 5 && X(it) < nx + 34);
  const clear = (a, b) => { for (let l = Math.min(a, b); l <= Math.max(a, b); l++) if (bad(l)) return false; return true; };
  let want = S.lane;
  const good = S.items.find(it => !it.done && it.k !== 'bird' && X(it) > nx - 2 && X(it) < nx + 26 && clear(S.lane, it.lane));
  if (bad(S.lane)) want = [0, 1, 2].filter(l => !bad(l)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane))[0] ?? S.lane;
  else if (good) want = good.lane;
  if (want > S.lane) { command('up', src); S.autoCd = 0.35; }
  else if (want < S.lane) { command('down', src); S.autoCd = 0.35; }
}

/* ---------- תנוחות ---------- */
function jsPose(P) {
  const S = jetS; if (!S) return P;
  const now = performance.now() / 1000;
  if (S.p === 'empty') { P = poseIdle(now); P.headTilt = -0.25; P.eyes = 'wide'; return P; }   // מסתכל על המד הריק
  if (S.p === 'pFuel') { const k = Math.sin(Math.PI * Math.min(1, S.t / JS.pickT)); P = poseIdle(now); P.lean = 0.5 * k; P.hipY = -4.6 + 1.4 * k; P.arms = [[0.9, 1.3], [1.0, 1.4]]; return P; }
  if (S.p === 'fuelPick') { const k = Math.sin(Math.PI * Math.min(1, S.t / JS.pickT)); P = poseIdle(now); P.lean = 0.5 * k; P.hipY = -4.6 + 1.4 * k; P.arms = [[0.9, 1.3], [1.0, 1.4]]; return P; }
  if (S.p === 'pick') { const k = Math.sin(Math.PI * Math.min(1, S.t / JS.pickT)); P = poseIdle(now); P.lean = 0.5 * k; P.hipY = -4.6 + 1.4 * k; P.arms = [[0.9, 1.3], [1.0, 1.4]]; return P; }   // מתכופף ומרים
  if (S.p === 'hold') { P = poseIdle(now); P.arms = [[0.9, 2.0], [1.0, 2.1]]; return P; }   // מחזיק מול החזה
  if (S.p === 'put') { const k = Math.min(1, S.t / JS.putT); P = poseIdle(now); P.arms = [[0.9 + 1.4 * k, 2.0 + 0.8 * k], [1.0 + 1.3 * k, 2.1 + 0.7 * k]]; P.lean = -0.08 * Math.sin(Math.PI * k); return P; }   // מעביר אל הגב
  if (S.p === 'wear') { P = poseIdle(now); P.arms = [[0.15, 0.6], [0.2, 0.7]]; P.eyes = 'wide'; return P; }   // אוחז ברצועות
  if (S.p === 'drop' || S.p === 'perch' || S.p === 'pReady' || S.p === 'isle' || S.p === 'atCave' || S.p === 'atWall') { P = poseIdle(now); P.lean = -0.06; if (S.p === 'isle') P.eyes = 'wide'; return P; }
  if (S.p === 'crawlIn' || S.p === 'crawlOut') return poseCrawl(S.t * (S.p === 'crawlOut' ? -1 : 1));   // קצב רגיל כמו במנהרה (פי שש נראה כמו ריצוד)
  if (S.p === 'grab' || S.p === 'inCave') { P = poseCrawl(0); if (S.p === 'grab') P.eyes = 'wide'; return P; }   // בחלל הנמוך: נשאר בזחילה ותופס את המיכל
  if (S.p === 'refuel' || S.p === 'fuelPour' || S.p === 'pPour') { P = poseIdle(now); const k = Math.min(1, S.t / 0.5); P.arms = [P.arms[0], [1.2 + 1.5 * k, 2.2 + 0.8 * k]]; P.headTilt = -0.2 * k; return P; }   // מרים את המיכל אל התרמיל
  if (jsFlying()) {                                                              // עף קדימה, רגליים מאחור
    const ld = S.p === 'land' || S.p === 'perchDown'; const A = poseAir(false); A.lean = ld ? 0.15 : 0.55; A.legs = ld ? [[0.2, 0.1], [0.35, 0.2]] : [[-0.55, -0.9], [-0.25, -0.6]];
    A.arms = [[-1.2, -0.9], [1.3, 1.9]]; A.eyes = 'squint';
    return A;
  }
  return P;
}

/* ---------- ציור ---------- */
// התהום: קירות סלע, עומק בערפל ונהר למטה (נקרא מ-draw.js עם המכשולים הרחבים)
// התהום: רואים דרכו את הנוף הרחוק (ההרים יורדים מתחת לקו הקרקע), ערפל עדין, נהר רחוק למטה,
// צוקים קטנים באמצע ודפנות באותו צבע כמו הקרקע
function jsGround(c, top, bottom) {                                               // אותו צבע לקרקע, לדפנות ולצוקים
  const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, '#c58a5a'); g.addColorStop(1, '#8f5a38'); return g;
}
function jsTop(x) {                                                            // גובה פני הקרקע (לא פס ישר)
  const u = (x + bgX) * 0.06;
  return GROUND - 1.3 - Math.max(0, Math.sin(u) * 0.8 + Math.sin(u * 2.7 + 1) * 0.35 + Math.sin(u * 0.37 + 2) * 0.7);   // כמעט ישר – רק גלים קטנים
}
function jsPTop(k, x, cx, ty) { const d = x - cx; return ty - 0.35 * Math.sin(d * 0.5 + k * 2) - 0.2 * Math.sin(d * 1.3 + k); }   // ראש הצוק – כמעט ישר
function jsChestY(o, k) {                                                         // התיבה יושבת על הסלע – בלי רווח מתחתיה
  const P = JS_PILLARS[k], cx = jsEdge(o) + P.dx, ty = GROUND - P.top, bx = cx + 3; let y = Infinity;
  let lo = -Infinity;
  for (let x = bx - 2.2; x <= bx + 2.2; x += 0.25) lo = Math.max(lo, jsPTop(k, x, cx, ty));
  return lo + 0.3;                                                                // התחתית בנקודה הנמוכה – שקועה קצת בסלע, אף פעם לא באוויר
}
function drawJetGap(o, bottom) {
  const x = jsEdge(o), w = JS.gap, t = performance.now() / 1000, WY = GROUND + 46;
  const hz = ctx.createLinearGradient(0, GROUND, 0, WY);                           // ערפל עומק עדין – הנוף נשאר נראה
  hz.addColorStop(0, 'rgba(250,232,212,0)'); hz.addColorStop(1, 'rgba(236,240,244,.75)');
  ctx.fillStyle = hz; ctx.fillRect(x, GROUND - 1, w, WY - GROUND + 1);
  const wg = ctx.createLinearGradient(0, WY, 0, bottom); wg.addColorStop(0, '#a9d8ea'); wg.addColorStop(1, '#6bb2cf');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(x, bottom);
  for (let xx = x; xx <= x + w; xx += 2) ctx.lineTo(xx, WY + Math.sin(xx * 0.35 + t * 2.5) * 0.5);
  ctx.lineTo(x + w, bottom); ctx.closePath(); ctx.fill();
  JS_PILLARS.forEach((P, k) => {                                                   // צוקים קטנים לנחיתה
    const cx = x + P.dx, ty = GROUND - P.top, hw = P.w / 2;
    const path = () => {
      ctx.beginPath();
      for (let xx = cx - hw; xx <= cx + hw; xx += 0.5) ctx.lineTo(xx, jsPTop(k, xx, cx, ty));       // ראש כמעט ישר
      const ys = []; for (let d = 1; ty + d < bottom; d += 3) ys.push(d); ys.push(bottom - ty);   // נקודות קבועות ביחס לראש הצוק – שהדפנות לא ירצדו
      for (const d of ys) ctx.lineTo(cx + hw - 0.4 - Math.sin(d * 0.45 + k) * 0.9 - d * 0.05, ty + d);
      for (const d of ys.slice().reverse()) ctx.lineTo(cx - hw + 0.4 + Math.sin(d * 0.5 + k * 3) * 0.9 + d * 0.06, ty + d);
      ctx.closePath();
    };
    ctx.fillStyle = jsGround(ctx, GROUND - 5, GROUND + 30); path(); ctx.fill();
    jsRockTex(path, cx - hw - 1, cx + hw + 1, ty - 1, Math.min(bottom, ty + 60), k + 1);   // שייראה כמו סלע
  });
  drawJetIsle(o, bottom, false);
  for (const [ex, dir] of [[x, 1], [x + w, -1]]) {                              // דפנות התהום – באותו צבע כמו הקרקע
    ctx.fillStyle = jsGround(ctx, GROUND - 5, GROUND + 30);                          // בדיוק אותו מילוי כמו הקרקע – בלי קו מפריד
    const ty = jsTop(ex), mid = (ty + GROUND) / 2;
    ctx.beginPath(); ctx.moveTo(ex - dir * 0.6, ty);
    for (let yy = mid; yy <= bottom; yy += 2.5) ctx.lineTo(ex + dir * (1.5 + Math.sin(yy * 0.6 + dir * 2.3) * 1.1 - Math.max(0, yy - GROUND) * 0.05), yy);   // צורה קבועה – לא משתנה בזמן הגלילה
    ctx.lineTo(ex - dir * 0.6, bottom); ctx.closePath(); ctx.fill();
  }
}

/* ---------- נוף של צוקים (במקום הבמבוק) ---------- */
function cliffFull() { return mode === 'stage' && playWords.includes('jetpack'); }   // באימון – כל השלב בקניון
const CLIFFS = { ramp: 90 };
function cliffOn(o) { return cliffFull() || (o.x - CLIFFS.ramp - 10 < viewR() && o.x + o.w + CLIFFS.ramp + 10 > viewL()); }
let cliffCv = null;
function drawCliffScenes(top) {                                                   // נקרא מ-draw.js לפני המכשולים
  const os = obstacles.filter(o => o.type === 'jetgap');
  if (cliffFull()) { drawCliffBack(os[0] || null, top); return; }
  for (const o of os) drawCliffBack(o, top);
}
function drawCliffBack(o, top) {
  if (o && !cliffOn(o)) return;
  if (!cliffCv) cliffCv = document.createElement('canvas');
  if (cliffCv.width !== canvas.width || cliffCv.height !== canvas.height) { cliffCv.width = canvas.width; cliffCv.height = canvas.height; }
  const c = cliffCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cliffCv.width, cliffCv.height); c.setTransform(ctx.getTransform());
  cliffLayers(c, top);
  if (o && !cliffFull()) {                                                         // במסע: נכנסים לקניון ויוצאים ממנו בהדרגה
    const L = viewL() - 2, R = viewR() + 2, W = o.w + CLIFFS.ramp * 2, g = c.createLinearGradient(o.x - CLIFFS.ramp, 0, o.x + o.w + CLIFFS.ramp, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(Math.min(0.49, CLIFFS.ramp / W), 'rgba(0,0,0,1)'); g.addColorStop(Math.max(0.51, 1 - CLIFFS.ramp / W), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(L, top - 5, R - L, GROUND + 80 - top); c.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cliffCv, 0, 0); ctx.restore();
}
function cliffRnd(i) { const x = Math.sin(i * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); }
function cliffLayers(c, top) {
  const L = viewL() - 2, R = viewR() + 2, G = GROUND - 1, now = performance.now() / 1000;
  const wr = (x, a, b) => { const w = b - a; return ((x - a) % w + w) % w + a; };
  const sky = c.createLinearGradient(0, top, 0, G);                                // שמיים חמים של קניון
  sky.addColorStop(0, '#8ecae6'); sky.addColorStop(0.55, '#cfe3e8'); sky.addColorStop(0.85, '#f5d6b0'); sky.addColorStop(1, '#efc394');
  c.fillStyle = sky; c.fillRect(L, top, R - L, GROUND + 70 - top);
  c.fillStyle = 'rgba(255,240,200,.55)'; c.beginPath(); c.arc(L + (R - L) * 0.78, top + 16, 9, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,248,225,.95)'; c.beginPath(); c.arc(L + (R - L) * 0.78, top + 16, 5, 0, Math.PI * 2); c.fill();
  // הרים רחוקים: שתי שכבות של רכסים רכים בגווני אובך – בלי קווים, נמוכים ורחבים
  const HZN = GROUND + 22;                                                           // קו האופק – נמוך יותר מקו הקרקע (רואים אותו דרך התהום)
  const ridge = (par, base, amp, f1, f2, col, seed) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(L, GROUND + 70);
    for (let x = L; x <= R + 3; x += 2) {
      const u = (x + bgX * par) * f1 + seed;
      const h = base + amp * (0.55 * Math.max(0, Math.sin(u)) + 0.3 * Math.max(0, Math.sin(u * 2.3 + 1.7)) + 0.15 * Math.sin(u * 5.1));
      c.lineTo(x, HZN - h);
    }
    c.lineTo(R + 3, GROUND + 70); c.closePath(); c.fill();
  };
  ridge(0.04, 30, 22, 0.028, 0, 'rgba(196,170,190,.55)', 1.3);                       // הכי רחוק – סגלגל-אפרפר
  const hz = c.createLinearGradient(0, HZN - 30, 0, HZN + 4); hz.addColorStop(0, 'rgba(250,228,205,0)'); hz.addColorStop(1, 'rgba(250,228,205,.7)');
  c.fillStyle = hz; c.fillRect(L, HZN - 30, R - L, 34);
  ridge(0.1, 22, 15, 0.045, 0, 'rgba(220,170,135,.7)', 4.1);                         // קרוב יותר – חום-ורדרד בהיר
  c.fillStyle = hz; c.fillRect(L, HZN - 30, R - L, 34);
  const pl = c.createLinearGradient(0, HZN, 0, GROUND + 70); pl.addColorStop(0, 'rgba(228,200,170,.9)'); pl.addColorStop(1, 'rgba(214,180,150,1)');
  c.fillStyle = pl; c.fillRect(L, HZN + 2, R - L, GROUND + 70 - HZN);           // המישור הרחוק מתחת לאופק
  // הקרקע: סלע ואבנים, בגבהים שונים (לא פס ישר) – עם חור במקום התהום
  c.save(); c.beginPath(); c.rect(L, top, R - L, GROUND + 80 - top);
  for (const o of obstacles) if (o.type === 'jetgap') { const h = jsHole(o); c.rect(h.x + h.w, top, -h.w, GROUND + 80 - top); }
  c.clip('evenodd');
  c.fillStyle = jsGround(c, GROUND - 5, GROUND + 30); c.beginPath(); c.moveTo(L, GROUND + 70);
  for (let x = L; x <= R + 2; x += 1.5) c.lineTo(x, jsTop(x));
  c.lineTo(R + 2, GROUND + 70); c.closePath(); c.fill();
  c.fillStyle = 'rgba(90,50,30,.3)';
  for (let i = 0; i < 18; i++) { const x = wr(L + cliffRnd(i + 60) * 200 - bgX, L - 3, R + 3); c.beginPath(); c.ellipse(x, GROUND + 2 + cliffRnd(i + 70) * 14, 0.9 + cliffRnd(i), 0.45, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

// אי הסלע: משטח כמעט ישר, תל קטן עם מנהרה (מערה) וסלע גבוה לטיפוס. front = רק תקרת המערה (מעל הנינג'ה)
// הצוק הענק (לפי הסקיצה): בסיס רחב שבולט שמאלה – עליו נוחתים, מעליו מגדל סלע שמתרחק ימינה ככל שעולים,
// ובחיבור ביניהם מערה: פתח, מעבר שהולך ונהיה צר, ואז חלל פנימי גדול עם מיכל הדלק
// נקודות מהסקיצה (פיקסלים) → עולם: ראשית בפתח המערה (878,1232), קנה מידה אחיד
const JS_SK = 0.075;
const JS_CLIFF_SK = [[645, 1420], [620, 1322], [666, 1260], [800, 1230], [892, 1232], [878, 1150], [910, 1043], [875, 940], [872, 850], [875, 740], [917, 655], [962, 583],
  [1005, 492], [1152, 466], [1369, 492], [1474, 656], [1525, 710], [1530, 905], [1555, 1145], [1532, 1440]];
const JS_CAVE_SK = [[878, 1150], [1032, 1185], [1107, 1162], [1204, 1103], [1290, 1150], [1326, 1202], [1285, 1242], [1228, 1243], [1160, 1232], [980, 1238], [892, 1232]];
const jsSk = (fx, LY) => ([x, y]) => [fx + (x - 878) * JS_SK, LY + (y - 1232) * JS_SK];
function jsCliffPts(fx, LY, top, bottom) {
  const m = jsSk(fx, LY), pts = JS_CLIFF_SK.map(m);
  return [[pts[0][0], bottom]].concat(pts, [[fx + (1570 - 878) * JS_SK, bottom]]);
}
const JS_CAVE_SX = 1.35, JS_CAVE_SY = 1.6;                                        // המערה גדולה וארוכה יותר מהסקיצה – שהנינג'ה ייכנס בנוחות
function jsCavePts(fx, LY) { return JS_CAVE_SK.map(([x, y]) => [fx + (x - 878) * JS_SK * JS_CAVE_SX, LY + (y - 1232) * JS_SK * JS_CAVE_SY]); }
function drawJetIsle(o, bottom, front) {
  if (front || !JS.cave) return;                                                  // המערה בצד כרגע (JS.cave)
  const I = JS_ISLE, fx = jsIsleX(o, I.face), LY = GROUND - I.ledge, top = GROUND - I.cliffTop;
  if (fx + I.cliffW < viewL() - 10 || fx - 40 > viewR() + 10) return;
  const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
  ctx.fillStyle = jsGround(ctx, GROUND - 5, GROUND + 30); poly(jsCliffPts(fx, LY, top, bottom)); ctx.fill();
  jsRockTex(() => poly(jsCliffPts(fx, LY, top, bottom)), fx - 18, fx + 54, GROUND - 60, Math.min(bottom, GROUND + 30), 9);   // מרקם סלע
  const g = ctx.createLinearGradient(0, LY - 15, 0, LY); g.addColorStop(0, '#3d1f07'); g.addColorStop(1, '#8a6234');   // כמו בסקיצה: כהה למעלה, בהיר יותר ברצפה
  ctx.save(); poly(jsCliffPts(fx, LY, top, bottom)); ctx.clip();
  ctx.fillStyle = g; poly(jsCavePts(fx, LY)); ctx.fill();                           // המערה – חשוכה (רק בתוך הצוק)
  ctx.restore();
  const S = jetS && jetS.o === o ? jetS : null;
  if (!(S && S.canGot)) {                                                          // אור עמום סביב מיכל הדלק בחלל
    const gx = fx + I.can, rg = ctx.createRadialGradient(gx, LY - 3, 0.5, gx, LY - 4, 10);
    rg.addColorStop(0, 'rgba(253,224,71,.38)'); rg.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.save(); poly(jsCavePts(fx, LY)); ctx.clip(); ctx.fillStyle = rg; ctx.fillRect(gx - 11, LY - 16, 22, 16); ctx.restore();
  }
}
// מרקם של סלע בתוך צורה: פאות בהירות/כהות, סדקים, וצל בצד הימני. הכול צמוד לצורה (זז איתה – בלי ריצוד)
function jsRnd(i) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
function jsRockTex(path, x0, x1, y0, y1, seed) {
  const w = x1 - x0, h = y1 - y0;
  ctx.save(); path(); ctx.clip();
  const sh = ctx.createLinearGradient(x0, 0, x1, 0);                                 // אור משמאל, צל מימין
  sh.addColorStop(0, 'rgba(255,236,210,.10)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(70,35,12,.28)');
  ctx.fillStyle = sh; ctx.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
  const n = Math.max(4, Math.round(w * h / 90));
  for (let i = 0; i < n; i++) {                                                      // פאות – משטחים שבורים של סלע
    const r = k => jsRnd(seed * 31 + i * 7 + k), cx = x0 + r(1) * w, cy = y0 + r(2) * h, s = 3 + r(3) * 6;
    ctx.fillStyle = r(4) < 0.5 ? 'rgba(255,230,200,.10)' : 'rgba(80,40,15,.13)';
    ctx.beginPath(); ctx.moveTo(cx - s * (0.6 + r(5) * 0.4), cy + s * 0.3); ctx.lineTo(cx - s * 0.1, cy - s * (0.5 + r(6) * 0.3));
    ctx.lineTo(cx + s * (0.6 + r(7) * 0.4), cy - s * 0.1); ctx.lineTo(cx + s * 0.2, cy + s * (0.5 + r(8) * 0.3)); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,38,16,.45)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const m = Math.max(3, Math.round(w * h / 160));
  for (let i = 0; i < m; i++) {                                                      // סדקים
    const r = k => jsRnd(seed * 53 + i * 11 + k);
    let x = x0 + r(1) * w, y = y0 + r(2) * h; const len = 3 + r(3) * 6, ang = 1.2 + r(4) * 0.8;
    ctx.lineWidth = 0.25 + r(5) * 0.2; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) { x += Math.cos(ang + (r(6 + k) - 0.5) * 1.2) * len / 3; y += Math.sin(ang + (r(9 + k) - 0.5) * 1.2) * len / 3; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}
function jsCan(x, y) {                                                           // מיכל דלק אדום
  ctx.fillStyle = '#dc2626'; roundRect(x - 1.6, y - 3.6, 3.2, 3.6, 0.5); ctx.fill();
  ctx.fillStyle = '#fca5a5'; ctx.fillRect(x - 1.1, y - 3.1, 0.6, 2.6);
  ctx.fillStyle = '#1f2937'; ctx.fillRect(x - 0.3, y - 4.4, 1.2, 0.8);
  ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(x - 1.6, y - 3.6); ctx.lineTo(x + 1.6, y); ctx.stroke();
}
function jsPack(x, y, rot, flame) {                                            // תרמיל סילון: שני מכלים, רצועות, נחירים
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.lineCap = 'round';
  for (const dx of [-1.1, 1.1]) {
    ctx.fillStyle = '#94a3b8'; roundRect(dx - 0.95, -3.4, 1.9, 6.2, 0.9); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(dx - 0.6, -3, 0.5, 5.2);
    ctx.fillStyle = '#dc2626'; circle(dx, -3.3, 0.85);
    ctx.fillStyle = '#334155'; ctx.fillRect(dx - 0.6, 2.7, 1.2, 0.8);
    if (flame) {
      const f = 2.4 + Math.sin(performance.now() / 40 + dx) * 0.8;
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(dx - 0.6, 3.4); ctx.lineTo(dx + 0.6, 3.4); ctx.lineTo(dx, 3.4 + f + 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(dx - 0.35, 3.4); ctx.lineTo(dx + 0.35, 3.4); ctx.lineTo(dx, 3.4 + f * 0.6 + 0.6); ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-1.6, -1.2); ctx.lineTo(1.6, -1.2); ctx.moveTo(-1.6, 1.0); ctx.lineTo(1.6, 1.0); ctx.stroke();
  ctx.restore();
}
function jsBird(x, y, t) {                                                     // ציפור שעפה שמאלה
  ctx.save(); ctx.translate(x, y); ctx.scale(1.7, 1.7); ctx.translate(-x, -y);
  const w = Math.sin(t * 14) * 1.6;
  ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(x, y, 2.2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 2, y - 0.6, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(x - 2.8, y - 0.7); ctx.lineTo(x - 3.9, y - 0.4); ctx.lineTo(x - 2.8, y - 0.2); ctx.fill();
  ctx.fillStyle = '#fff'; circle(x - 2.2, y - 0.9, 0.3);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - 0.5, y - 0.4); ctx.quadraticCurveTo(x + 0.8, y - 2.5 - w, x + 2.2, y - 0.8 - w * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 3.4, y - 0.6); ctx.stroke();
  ctx.restore();
}
// התרמיל על הקרקע / בידיים, והדברים שבאוויר (נקרא לפני הנינג'ה)
function drawJetStage(o) {
  const S = jetS && jetS.o === o ? jetS : null, t = performance.now() / 1000;
  if (!S && o.packX === undefined) jsPack(o.x + JS.pack, GROUND - 2.4, Math.PI / 2 - 0.15, false);        // מונח על הקרקע ליד התהום
  if (!S && o.packX !== undefined) jsPack(o.x + o.packX, GROUND - 2.4, Math.PI / 2 + 0.1, false);          // נשאר בצד השני
  if (S && S.p === 'find') jsPack(o.x + JS.pack, GROUND - 2.4, Math.PI / 2 - 0.15, false);
  if ((!S && o.packX === undefined) || (S && ['find', 'pick', 'hold', 'put', 'empty'].includes(S.p))) { const cx = o.x + JS.can0; if (cx > viewL() - 6 && cx < viewR() + 6) jsCan(cx, GROUND); }   // מיכל דלק ליד התרמיל
  if (S && (S.p === 'drop')) { const k = Math.min(1, S.t / JS.dropT); jsPack(PLAYER.x - 1 - k * 5, GROUND - 9 + k * 6.6, (Math.PI / 2 + 0.1) * k, false); }
  JS_PILLARS.forEach((P, k) => {                                                  // תיבת אוצר על כל צוק קטן
    const cx = jsEdge(o) + P.dx + 3, ty = jsChestY(o, k) + 0.15, open = S ? S.pill[k] : false;
    if (cx < viewL() - 8 || cx > viewR() + 8) return;
    const taking = S && S.pi === k && ['pFuel', 'pPour'].includes(S.p);
    if (!open && !taking) {                                                         // מיכל דלק על התחנה, עם הילה צהובה
      ctx.fillStyle = 'rgba(253,224,71,' + (0.25 + Math.sin(t * 4 + k) * 0.08) + ')'; circle(cx, ty - 2, 3.4);
      jsCan(cx, ty);
    }
    if (S && S.p === 'fly' && !open) {                                             // חץ ירוק: כאן אפשר לנחות (DOWN)
      const d = cx - (PLAYER.x + PLAYER.w / 2);
      if (d > -P.w / 2 && d < 40) {
        const ay = ty - 11 + Math.sin(t * 5) * 0.7, on = jsPillarUnder(o) === k;
        ctx.fillStyle = on ? 'rgba(34,197,94,.95)' : 'rgba(34,197,94,.6)'; circle(cx - 3, ay, on ? 3 : 2.4);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 4.3, ay - 0.8); ctx.lineTo(cx - 1.7, ay - 0.8); ctx.lineTo(cx - 3, ay + 1.3); ctx.closePath(); ctx.fill(); ctx.fillRect(cx - 3.4, ay - 2, 0.8, 1.4);
      }
    }
  });
  if (JS.cave && !(S && S.canGot)) {                                               // מיכל הדלק בחלל הפנימי
    const cx = jsIsleX(o, JS_ISLE.face + JS_ISLE.can), cy = GROUND - JS_ISLE.ledge;
    if (cx > viewL() - 6 && cx < viewR() + 6) jsCan(cx, cy);
  }
  if (S) {
    for (const it of S.items) {
      if (it.done) continue;
      const ix = jsEdge(o) + it.x, iy = GROUND - JS.lanes[it.lane] - 4;
      if (ix < viewL() - 6 || ix > viewR() + 6) continue;
      if (it.k === 'bird') jsBird(ix, iy, t + it.dx);
      else if (it.k === 'gem') {
        ctx.save(); ctx.translate(ix, iy); ctx.scale(1.5, 1.5); ctx.translate(-ix, -iy);
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(ix, iy - 2.2); ctx.lineTo(ix + 1.8, iy - 0.6); ctx.lineTo(ix, iy + 2); ctx.lineTo(ix - 1.8, iy - 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(ix - 0.6, iy - 1.2); ctx.lineTo(ix + 0.2, iy - 1.6); ctx.lineTo(ix - 0.2, iy - 0.2); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else { ctx.fillStyle = '#facc15'; circle(ix, iy, 2.2 + Math.sin(t * 5 + it.dx) * 0.12); ctx.fillStyle = '#fde68a'; circle(ix - 0.6, iy - 0.6, 0.8); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(ix, iy, 2.2, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
}
// שורת השלבים בראש המסך: המילה של כל פעולה, השלב הנוכחי מודגש, מה שנעשה – ✓
const JS_STEPS_A = [['PICK UP', '🎒'], ['PUT ON', '🎒'], ['PICK UP', '⛽'], ['FLY', '🚀']];
const JS_STEPS_C = [['DOWN', '⬇️'], ['PICK UP', '⛽'], ['UP', '⬆️']];
const JS_STEPS_B = [['CRAWL', '🕳️'], ['PICK UP', '⛽'], ['FLY', '🚀']];
function jsStepNow() {
  const p = jetS.p;
  const a = { find: 0, pick: 0, hold: 1, put: 1, empty: 2, fuelPick: 2, fuelPour: 2, wear: 3, take: 3 }[p];
  if (a !== undefined && !jetS.isleDone && !(p === 'take' && jetS.pi >= 0)) return [JS_STEPS_A, a];
  if (jetS.lastK >= 0 || ['fly', 'perchDown', 'perch'].includes(p)) {             // תחנות דלק: DOWN · PICK UP · UP
    const c = { fly: 0, perchDown: 0, perch: 1, pFuel: 1, pPour: 1, pReady: 2, take: 2 }[p];
    const nextK = JS_PILLARS.findIndex((P, k) => !jetS.pill[k]);
    if (c !== undefined && (p === 'take' || p === 'pReady' || nextK >= 0)) return [JS_STEPS_C, c];
  }
  const b = { dying: 0, isle: 0, atCave: 0, crawlIn: 0, inCave: 1, grab: 1, crawlOut: 2, refuel: 2, atWall: 2, rise: 2 }[p];
  return b !== undefined ? [JS_STEPS_B, b] : null;
}
function drawJetSteps() {
  const st = jsStepNow(); if (!st) return;
  const [list, cur] = st, top = (0 - oy) / scale + 17.5, t = performance.now() / 1000;
  ctx.font = '900 3.2px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const ws = list.map(([w, ic], i) => ctx.measureText((i < cur ? '✓ ' : (i + 1) + ' ') + w + ' ' + ic).width + 3.2);
  let x = (viewL() + viewR()) / 2 - (ws.reduce((a, b) => a + b, 0) + (list.length - 1) * 1.2) / 2;
  list.forEach(([w, ic], i) => {
    const done = i < cur, now = i === cur, pulse = now ? 1 + Math.sin(t * 5) * 0.04 : 1;
    ctx.save(); ctx.translate(x + ws[i] / 2, top); ctx.scale(pulse, pulse);
    ctx.fillStyle = done ? 'rgba(22,163,74,.85)' : now ? 'rgba(250,204,21,.95)' : 'rgba(15,23,42,.45)';
    roundRect(-ws[i] / 2, -2.4, ws[i], 4.8, 2.2); ctx.fill();
    ctx.fillStyle = now ? '#1f2937' : '#fff'; ctx.fillText((done ? '✓ ' : (i + 1) + ' ') + w + ' ' + ic, -ws[i] / 2 + 1.6, 0.2);
    ctx.restore();
    x += ws[i] + 1.2;
  });
}
// התרמיל ביד / על הגב (נקרא אחרי ציור הנינג'ה)
function drawJetHeld() {
  const S = jetS; if (!S) return;
  drawJetSteps();
  if (S.p === 'grab') { const k = Math.min(1, S.t / 0.8); jsCan(lerp(jsIsleX(S.o, JS_ISLE.face + JS_ISLE.can), playerHand[0] + 1, k), lerp(GROUND - JS_ISLE.ledge, playerHand[1] + 2, k)); }   // מרים את המיכל
  if (S.p === 'crawlOut') jsCan(playerHand[0] + 1.6, Math.min(GROUND - JS_ISLE.ledge, playerHand[1] + 2.4));   // גורר את המיכל איתו החוצה
  if (S.p === 'fuelPick') { const k = Math.min(1, S.t / JS.pickT); jsCan(lerp(S.o.x + JS.can0, playerHand[0] + 1, k), lerp(GROUND, playerHand[1] + 2, k)); }   // מרים את המיכל מהקרקע
  if (S.p === 'pFuel') { const k = Math.min(1, S.t / JS.pickT), cx = jsPillarX(S.o, S.pi) + 3; jsCan(lerp(cx, playerHand[0] + 1, k), lerp(jsChestY(S.o, S.pi) + 0.15, playerHand[1] + 2, k)); }   // מרים את המיכל מהסלע
  if (S.p === 'refuel' || S.p === 'fuelPour' || S.p === 'pPour') {                  // מרים את המיכל אל התרמיל ושופך; אחר כך זורק אותו לתהום
    const k = Math.min(1, S.t / 0.5), e = k * k * (3 - 2 * k), bx = PLAYER.x + 0.6, by = GROUND - py - 13.5;   // מעל הכתף, אל פתח התרמיל שעל הגב
    const cx = lerp(playerHand[0] + 1, bx + 1.6, e), cy = lerp(playerHand[1] + 2, by, e);
    if (S.t < 1.4) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-2.1 * e); jsCan(0, 0); ctx.restore();
      if (S.t > 0.45) { ctx.fillStyle = 'rgba(250,204,21,.85)'; for (let d = 0; d < 4; d++) circle(bx - 0.4, by + 1.2 + ((S.t * 10 + d * 0.6) % 2.6), 0.35); }   // הדלק נשפך לתרמיל
    }
  }
  if (jsWorn()) {                                                // מד הדלק של הסילון – מעל הראש
    const now = performance.now() / 1000, k = S.fuel, w = 16, topY = (0 - oy) / scale;   // מד הדלק צמוד לנינג'ה – מעל הראש (הדרקון עף מאחור)
    const x = PLAYER.x + PLAYER.w / 2, above = GROUND - py - 21, y = above > topY + 22 ? above : GROUND - py + 3;   // קרוב לראש המסך (מתחת לשורת השלבים) – עובר אל מתחת לרגליים
    const low = k < JS.lowAt, hz = 3 + (JS.lowAt - Math.min(JS.lowAt, k)) * 16, blink = low && Math.floor(now * hz) % 2 === 0;   // לקראת סוף הדלק – מהבהב, ויותר מהר ככל שנשאר פחות
    if (low) { ctx.fillStyle = blink ? 'rgba(239,68,68,.55)' : 'rgba(239,68,68,.15)'; roundRect(x - w / 2 - 1.6, y - 1.6, w + 3.2, 4.6, 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(x - w / 2 - 4.6, y - 1.5, w + 5.8, 4.4, 2.2); ctx.fill();   // רקע לבן – שיבלוט על כל רקע
    ctx.fillStyle = 'rgba(15,23,42,.7)'; roundRect(x - w / 2 - 0.5, y - 0.5, w + 1, 2.4, 1.2); ctx.fill();
    ctx.fillStyle = k > JS.lowAt ? (k > 0.6 ? '#22c55e' : '#f59e0b') : (blink ? '#fecaca' : '#ef4444');
    if (k > 0) { roundRect(x - w / 2, y, w * k, 1.4, 0.7); ctx.fill(); }
    ctx.font = '900 3px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⛽', x - w / 2 - 2.4, y + 0.8);
  }
  if (S.p === 'pick') { const k = Math.min(1, S.t / JS.pickT); jsPack(lerp(S.o.x + JS.pack, playerHand[0] + 0.6, k), lerp(GROUND - 2.4, playerHand[1], k), (Math.PI / 2 - 0.15) * (1 - k), false); }
  if (S.p === 'hold') jsPack(playerHand[0] + 0.6, playerHand[1], 0, false);
  if (S.p === 'put') { const k = Math.min(1, S.t / JS.putT), e = k * k * (3 - 2 * k); jsPack(lerp(playerHand[0] + 0.6, PLAYER.x + 1.2, e), lerp(playerHand[1], GROUND - py - 9.5, e) - Math.sin(Math.PI * e) * 4, 0, false); }
}

// הרישום של הסצנה – הבסיס מכיר אותה רק דרך הטבלה (scenes.js). הציור עדיין מחובר ב-draw.js
sceneAdd({
  type: 'jetgap', word: 'jetpack', label: true,
  listen: ['pick up', 'put on', 'fly', 'up', 'down', 'crawl'],
  active: () => !!jetS,
  reset: () => { jetS = null; },
  setup: jsSetup, afterGap: 0.8, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + JS.stop,                                                       // התרמיל ליד התהום
  update: jsUpdate, physics: jsPhysics, speed: jsSpeed, pose: jsPose,
  expected: jsExpected, cmd: jsCmd, auto: jsAuto,
  intro: { banner: 'PICK UP · PUT ON · FLY!', time: 14,
           demo: () => { const o = { type: 'jetgap' }; jsSetup(o); o.x = PLAYER.x + PLAYER.w - JS.stop; obstacles.push(o); } }   // עומד ליד התרמיל (jsUpdate מפעיל את ההדגמה)
});
