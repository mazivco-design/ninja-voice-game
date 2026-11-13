/* ninja-voice-game – seesaw.js
   HIGH WALL (קיר גבוה עם מקפצה, עם חבר – שיתוף פעולה, ופעם אחת התפקידים מתחלפים):
   קיר ראשון – החבר עולה ראשון:
     · החבר: "Hey! Help me up!", עולה על הקצה הקרוב לקיר: "Jump on the board!"
     · JUMP – הנינג'ה קופץ על הקצה השני, והחבר עף בסלטה ונוחת על הקיר. JUMP מוקדם מדי (לפני שהחבר על הקרש) –
       החבר נזרק הצידה: "Wait for me!", עולה שוב, ואז JUMP נוסף מהקרש.
     · החבר: "Catch the rope!" ומשלשל חבל.  CATCH – תופס.  CLIMB × 3 – מטפס, החבר מושך.  "Nice one!"
   קיר שני (גבוה יותר) – הנינג'ה עולה ראשון:
     · החבר: "Your turn! Stand on the board!" – הנינג'ה הולך על הקרש (הקרש נוטה כשהוא עובר את האמצע) עד הקצה ליד הקיר.
     · החבר: "Ready? Catch the edge!" וקופץ על הקצה השני – הנינג'ה עף למעלה ומרחף רגע ליד שפת הקיר.
       CATCH – נתפס בשפה ועולה. לא אמר בזמן – נופל, החבר: "Oops! Again!", וחוזרים. CATCH שנאמר קודם (בזמן העלייה) נשמר.
     · החבר: "Throw me the rope!"  THROW – זורק חבל.  "Pull me up!"  PULL × 3 – מושך את החבר.  "Yes! We did it!"
   אין פגיעות ואין לבבות – זה שלב של עזרה הדדית. רמזים: אחרי שתיקה המשחק אומר את המילה.
   הנינג'ה מצויר כאן (drawNinja), והמיקום שלו בעולם נקבע בכל פריים (S.nr – מרחק מתחילת הסצנה, S.nh – גובה). */

const SS = { stop: 20, p1: 40, half: 12, piv: 3, w1: 58, H1: 36, top1: 40, sl1: 40,
             p2: 165, w2: 183, H2: 44, top2: 40, sl2: 45, end: 300, after: 30,
             walkV: 16, hint: 4, hintEvery: 6, nudge: 3, coins: 4,
             float: { easy: 2.6, medium: 1.9, hard: 1.4 } };
const SS_CHIP = { jump: 'JUMP', catch: 'CATCH', climb: 'CLIMB', throw: 'THROW', pull: 'PULL' };
const SS_A0 = Math.asin(SS.piv / SS.half);                                          // זווית הקרש כשקצה אחד על הקרקע
let ssS = null;

function ssSetup(o) { o.w = SS.end + SS.after; }
function ssNX() { return PLAYER.x + PLAYER.w / 2; }
const ssE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const ssL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function ssSay(clip, text) { speak(clip); }                                    // החבר רק נשמע (כמו בסירה) – בלי כיתוב על המסך

// גובה הקרקע (הקירות והמדרונות שאחריהם), r = מרחק מתחילת הסצנה
// שני הצוקים – קווי מתאר זוויתיים (קווים ישרים ושבירות, לפי ציור הדוגמה של זיו), כל צוק בצורה אחרת.
// back: הראש והמדרון – [מרחק מהדופן, גובה]; face: הדופן – [כמה נכנסת פנימה, גובה]
const SS_CL = [
  { a: SS.w1, seed: 1.3, H: SS.H1,
    face: [[2.6, 0], [4.2, 3.5], [1.2, 9], [3.6, 14.5], [1.6, 19], [4.0, 23.5], [0.8, 27], [2.6, 31], [0.6, 33.6]],
    back: [[0, 34.8], [1.8, 36], [12, 36.4], [21, 35.8], [30, 36.5], [39, 35.7], [45, 32], [50, 30.5], [56, 20], [62, 18], [69, 10.5], [75, 4.5], [80, 0]] },
  { a: SS.w2, seed: 4.6, H: SS.H2,
    face: [[3.4, 0], [1.0, 6], [3.2, 11], [4.4, 16.5], [1.8, 22], [3.4, 28], [0.6, 33], [2.4, 38], [0.5, 41.6]],
    back: [[0, 42.8], [2.5, 44], [9, 43.6], [17, 44.6], [25, 44.2], [33, 44.7], [40, 44], [44, 37], [49, 34], [55, 33], [60, 24], [66, 18.5], [73, 16.5], [79, 8], [85, 0]] }];
function ssCliffH(C, d) {                                                             // d = מרחק מהדופן. -1 מחוץ לצוק
  const B = C.back;
  if (d < 0 || d > B[B.length - 1][0]) return -1;
  for (let i = 1; i < B.length; i++) if (d <= B[i][0]) { const [x0, y0] = B[i - 1], [x1, y1] = B[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); }
  return 0;
}
function ssGround(r) { return Math.max(0, ...SS_CL.map(C => ssCliffH(C, r - C.a))); }
// הקרש: גובה הדופן העליונה בנקודה r (או -1 מחוץ לקרש)
function ssBoardH(p, a, r) { const d = r - p, hw = SS.half * Math.cos(a); return Math.abs(d) > hw ? -1 : SS.piv + d * Math.tan(a) + 0.6; }
function ssWalkH(r) { const S = ssS; return Math.max(ssGround(r), S ? ssBoardH(SS.p1, S.a1, r) : -1, S ? ssBoardH(SS.p2, S.a2, r) : -1); }
function ssEndH(p, a, side) { return ssBoardH(p, a, p + side * SS.half * Math.cos(a) * 0.92); }   // הגובה ליד הקצה

function ssStart(o) {
  ssS = { o, p: 'meet', t: 0, idle: 0, hinted: 0, nudged: 0, n: 0, q: 0, held: null,
          a1: -SS_A0, a1T: -SS_A0, a2: SS_A0, a2T: SS_A0, nr: SS.stop, nh: 0, fc: 1, onB: 0,
          f: { r: 55, h: 0, fc: -1, rot: 0 }, ropeL: 0 };
}
function ssGo(p) { const S = ssS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; S.nudged = 0; S.said = 0; }

function ssUpdate(dt, pb) {
  if (!ssS) {
    const o = obstacles.find(o => o.type === 'seesaw' && !o.passed && ssNX() >= o.x + SS.stop - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    ssStart(o);
    return;
  }
  const S = ssS, o = S.o, f = S.f; S.t += dt;
  if (!obstacles.includes(o)) { ssS = null; return; }
  const demo = state !== 'play', A0 = SS_A0;
  if (demo) {                                                                         // ההדגמה אומרת את המילים בעצמה
    const w = (ssExpected() || [])[0], at = S.p === 'fly2' ? 0.95 : 0.9;
    if (w && S.t > at && !['climbing', 'pulling', 'ready2', 'fJump'].includes(S.p)) { const p0 = S.p; command(w, 'demo'); if (S.p !== p0) speak(w); }
  }
  // הקרשים נוטים אל המטרה
  for (const k of ['a1', 'a2']) { const d = S[k + 'T'] - S[k]; S[k] += Math.sign(d) * Math.min(Math.abs(d), dt * 7); }
  const walkTo = (r, v) => { const d = r - S.nr; S.nr += Math.sign(d) * Math.min(Math.abs(d), dt * (v || SS.walkV)); return Math.abs(r - S.nr) < 0.01; };
  const fWalk = (r, v) => { const d = r - f.r; f.r += Math.sign(d) * Math.min(Math.abs(d), dt * (v || SS.walkV)); f.h = ssWalkH(f.r); f.walk = Math.abs(d) > 0.01; if (f.walk) f.fc = Math.sign(d); return !f.walk; };
  f.walk = false;
  switch (S.p) {
    /* ---------- קיר ראשון ---------- */
    case 'meet':
      if (!S.said) { S.said = 1; ssSay('friend: hey! help me up!', 'Hey! Help me up!'); }
      if (S.t >= 2.2) { ssGo('fOn'); S.said = 0; }
      break;
    case 'fOn': {                                                                     // החבר עולה על הקצה הקרוב לקיר
      const k = Math.min(1, S.t / 0.8), x0 = S.f0 === undefined ? (S.f0 = f.r) : S.f0;
      f.r = ssL(x0, 51, k); f.h = Math.max(0, ssL(f.h0 || 0, 0.6, k)) + Math.sin(Math.PI * k) * 3; f.fc = -1; f.rot = ssL(f.rot, 0, k);
      if (k >= 1) {
        S.a1T = -A0; f.h = ssBoardH(SS.p1, S.a1, 51);
        if (S.t >= 1.1) { S.f0 = undefined; f.h0 = 0; ssGo('jumpWait'); ssSay('friend: jump on the board!', 'Jump on the board!'); }
      }
      break;
    }
    case 'jumpWait': f.h = ssBoardH(SS.p1, S.a1, 51); break;
    case 'launch1': case 'early': {                                                    // הנינג'ה קופץ על הקצה השני
      const k = Math.min(1, S.t / 0.55);
      if (!S.x0) { S.x0 = S.nr; S.h0 = S.nh; }
      S.nr = ssL(S.x0, 29.5, k);
      if (k < 1) S.nh = ssL(S.h0, ssEndH(SS.p1, S.a1, -1), k) + Math.sin(Math.PI * k) * (S.onB ? 5 : 6);
      else {
        if (!S.onB) { S.onB = 1; sfx('thud'); burst(o.x + 29.5, GROUND - S.nh, '#a16207', 6, 10); }
        if (!S.hit) { S.hit = 1; S.a1T = A0; sfx('thud'); shakeT = 0.12; }
        S.nh = ssWalkH(S.nr);
      }
      if (S.p === 'early') {                                                          // החבר עוד לא היה מוכן – נזרק הצידה
        if (S.hit) {
          const u = Math.min(1, (S.t - 0.55) / 0.5);
          if (!S.fx0) { S.fx0 = f.r; S.fh0 = f.h; }
          f.r = ssL(S.fx0, 56, u); f.h = Math.max(0, ssL(S.fh0, 0, u) + Math.sin(Math.PI * u) * 4); f.rot = -0.5 * ssE(u); f.sit = u >= 1;
          if (S.t >= 0.75 && !S.said) { S.said = 1; ssSay('friend: wait for me!', 'Wait for me!'); }
          if (S.t >= 2.4) { f.sit = false; f.h0 = 0; S.fx0 = 0; S.hit = 0; S.x0 = 0; S.said = 0; ssGo('fOn'); }
        }
      } else if (S.hit) {                                                             // החבר עף בסלטה אל ראש הקיר
        const u = Math.min(1, Math.max(0, (S.t - 0.6) / 1.3));
        if (u > 0) { f.r = ssL(51, 63, u); f.h = ssL(ssEndH(SS.p1, A0, 1), SS.H1, u) + Math.sin(Math.PI * u) * 14; f.rot = Math.PI * 2 * ssE(u); f.fc = 1; f.fly = u < 1; }
        if (u > 0 && !S.whoosh) { S.whoosh = 1; sfx('swish'); }
        if (u >= 1) { f.fly = false; f.rot = 0; f.h = SS.H1; sfx('thud'); burst(o.x + 63, GROUND - SS.H1, '#e7cf9a', 6, 10); S.x0 = 0; S.hit = 0; ssGo('fLand'); }
      }
      break;
    }
    case 'fLand': {                                                                   // החבר על הקיר: מסתובב, כורע בשפה ומשלשל חבל. הנינג'ה הולך אל הקיר
      if (S.t > 0.3) f.fc = -1;
      if (S.t > 0.45) { f.r = ssL(63, 60.5, (S.t - 0.45) / 0.3); f.kneel = 1; }
      if (S.t > 0.35 && !S.said) { S.said = 1; ssSay('friend: catch the rope!', 'Catch the rope!'); }
      S.onB = 0;
      if (S.t > 0.5) { walkTo(55, 13); S.walking = S.nr < 54.99; }
      { const tg = ssWalkH(S.nr); S.nh = S.nh > tg ? Math.max(tg, S.nh - dt * 30) : tg; }   // יורד מקצה הקרש בקפיצה קטנה
      if (S.t > 0.8) S.ropeL = Math.min(SS.H1 - 9, S.ropeL + dt * 26);
      if (S.t > 2.4 && S.nr >= 54.99) { S.walking = 0; ssGo('catchWait'); }
      break;
    }
    case 'catchWait': S.nh = 0; break;
    case 'grab': S.nh = ssL(0, 2, S.t / 0.3); if (S.t >= 0.4) { ssGo('hang'); S.n = 0; ssSay('friend: climb up!', 'Climb up!'); } break;
    case 'hang': S.nh = 2 + S.n * (SS.H1 - 17) / 3; if (S.q > 0) { S.q--; ssGo('climbing'); } break;
    case 'climbing': {
      const step = (SS.H1 - 17) / 3;
      S.nh = 2 + (S.n + ssE(S.t / 0.7)) * step;
      if (S.t >= 0.7) { S.n++; sfx('swish'); if (S.n >= 3) ssGo('mantle1'); else if (S.q > 0) { S.q--; ssGo('climbing'); } else ssGo('hang'); }
      break;
    }
    case 'mantle1': {                                                                 // עולה מעל השפה; החבר זז אחורה
      const k = S.t / 0.8;
      S.nh = ssL(SS.H1 - 15, SS.H1, ssE(k * 1.3)); S.nr = ssL(55, 61, ssE((k - 0.3) / 0.7));
      f.kneel = 0; fWalk(68, 10); f.fc = -1;
      if (k >= 1) { S.nr = 61; S.nh = SS.H1; ssGo('hi5'); ssSay('friend: nice one!', 'Nice one!'); S.ropeL = 0; }
      break;
    }
    case 'hi5': f.fc = -1; if (S.t > 0.35 && S.t < 0.4 + dt) sfx('clap'); if (S.t >= 1.3) ssGo('cross1'); break;
    case 'cross1':                                                                    // הולכים יחד מעבר לקיר, אל המקפצה השנייה
      S.walking = !walkTo(140); S.nh = ssWalkH(S.nr);
      fWalk(Math.min(146, S.nr + 10), SS.walkV * 1.1);
      if (!S.walking && S.t > 0.3) ssGo('meet2');
      break;
    /* ---------- קיר שני – התפקידים מתחלפים ---------- */
    case 'meet2':
      f.fc = -1;
      if (!S.said) { S.said = 1; ssSay('friend: your turn! stand on the board!', 'Your turn! Stand on the board!'); }
      if (S.t >= 2.0) { S.said = 0; ssGo('toBoard'); }
      break;
    case 'toBoard':                                                                   // הולך על הקרש; כשעובר את האמצע הקרש נוטה
      S.walking = !walkTo(176, 12); S.nh = ssWalkH(S.nr);
      S.a2T = S.nr > SS.p2 ? -A0 : A0;
      f.fc = S.nr > f.r ? 1 : -1;
      if (!S.walking && Math.abs(S.a2 - S.a2T) < 0.01) { ssGo('ready2'); }
      break;
    case 'ready2':
      S.nh = ssWalkH(S.nr); fWalk(146, 10); f.fc = 1;
      if (!S.said && S.t > 0.3) { S.said = 1; ssSay('friend: ready? catch the edge!', 'Ready? Catch the edge!'); }
      if (S.t >= 2.1 && !f.walk) { S.said = 0; ssGo('fJump'); }
      break;
    case 'fJump': {                                                                   // החבר קופץ על הקצה השני
      const k = Math.min(1, S.t / 0.6);
      S.nh = ssWalkH(S.nr);
      f.r = ssL(146, 154.5, k); f.h = ssL(0, ssEndH(SS.p2, S.a2, -1), k) + Math.sin(Math.PI * k) * 7; f.fc = 1; f.air = k < 1;
      if (k >= 1) { S.a2T = A0; sfx('thud'); shakeT = 0.12; ssGo('fly2'); S.h0 = S.nh; sfx('swish'); }
      break;
    }
    case 'fly2': {                                                                    // עף למעלה ומרחף רגע ליד השפה
      f.air = false; f.h = ssBoardH(SS.p2, S.a2, 154.5);
      const k = Math.min(1, S.t / 0.9), apex = SS.H2 - 15, fl = SS.float[diffKey] || SS.float.medium;
      S.nr = ssL(176, 179, k); S.nh = k < 1 ? ssL(S.h0, apex, 1 - (1 - k) * (1 - k)) : apex + Math.sin((S.t - 0.9) * 5) * 0.35;
      if (k >= 1 && S.held === 'catch') { S.held = null; ssGrabLedge(); break; }
      if (S.t >= 0.9 + fl) { ssGo('fall2'); S.h0 = S.nh; }
      break;
    }
    case 'fall2': {
      const k = Math.min(1, S.t / 0.6);
      S.nr = ssL(179, 180, k); S.nh = S.h0 * (1 - k * k);
      if (k >= 1 && !S.said) { S.said = 1; sfx('thud'); burst(o.x + 180, GROUND - 0.5, '#e7cf9a', 6, 10); ssSay('friend: oops! again!', 'Oops! Again!'); }
      if (S.t >= 1.5) { S.said = 0; ssGo('back2'); }
      break;
    }
    case 'back2': {                                                                   // קופץ בחזרה על הקצה; החבר יורד מהקרש
      const k = Math.min(1, S.t / 0.6);
      S.nr = ssL(180, 176, k);
      if (k < 1) S.nh = Math.max(ssWalkH(S.nr), Math.sin(Math.PI * k) * 6 + ssL(0, ssEndH(SS.p2, S.a2, 1), k));
      else { S.a2T = -A0; S.nh = ssWalkH(S.nr); }
      if (S.t > 0.4) fWalk(146, 10);
      else f.h = ssBoardH(SS.p2, S.a2, f.r);
      if (S.t >= 1.3 && !f.walk) ssGo('ready2');
      break;
    }
    case 'ledge': S.nh = SS.H2 - 15; if (S.t >= 0.45) ssGo('mantle2'); break;
    case 'mantle2': {
      const k = S.t / 0.9;
      S.nh = ssL(SS.H2 - 15, SS.H2, ssE(k * 1.3)); S.nr = ssL(179, 189, ssE((k - 0.3) / 0.7));
      if (S.t > 0.3) fWalk(180, 12);                                                  // החבר יורד מהקרש והולך לרגלי הקיר
      if (k >= 1) { S.nr = 189; S.nh = SS.H2; ssGo('turn2'); }
      break;
    }
    case 'turn2':
      fWalk(180, 12);
      if (S.t > 0.25) S.fc = -1;
      if (S.t >= 0.6 && !f.walk) { f.fc = 1; ssGo('throwWait'); ssSay('friend: throw me the rope!', 'Throw me the rope!'); }
      break;
    case 'throwWait': f.fc = 1; break;
    case 'throwing':
      if (S.t >= 0.9) { ssGo('pullWait'); S.n = 0; ssSay('friend: pull me up!', 'Pull me up!'); }
      break;
    case 'pullWait': f.r = 181; f.h = S.n * (SS.H2 - 15) / 3; f.climb = S.n > 0; if (S.q > 0) { S.q--; ssGo('pulling'); } break;
    case 'pulling': {
      const step = (SS.H2 - 15) / 3;
      f.r = 181; f.climb = 1; f.h = (S.n + ssE(S.t / 0.7)) * step;
      if (S.t >= 0.7) { S.n++; sfx('swish'); if (S.n >= 3) ssGo('fMantle'); else if (S.q > 0) { S.q--; ssGo('pulling'); } else ssGo('pullWait'); }
      break;
    }
    case 'fMantle': {
      const k = S.t / 0.8;
      f.h = ssL(SS.H2 - 15, SS.H2, ssE(k * 1.3)); f.r = ssL(181, 185, ssE((k - 0.3) / 0.7)); f.climb = k < 0.6;
      S.nr = ssL(189, 192, k);
      if (k >= 1) { f.climb = 0; f.h = SS.H2; f.fc = 1; ssGo('cheer2'); ssSay('friend: yes! we did it!', 'Yes! We did it!'); }
      break;
    }
    case 'cheer2': if (S.t > 0.35 && S.t < 0.4 + dt) sfx('clap'); if (S.t >= 1.6) { S.fc = 1; ssGo('exit'); } break;
    case 'exit':
      S.walking = 1; S.nr += dt * SS.walkV; S.nh = ssWalkH(S.nr);
      fWalk(S.nr + 40, SS.walkV * 1.5);
      if (S.nr >= SS.end - 8) {
        cleared(o); ssS = null;
        if (mode === 'journey' && state === 'play') { picked += SS.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + SS.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
  }
  if (!['launch1', 'early', 'fly2', 'fall2', 'back2', 'grab', 'hang', 'climbing', 'mantle1', 'ledge', 'mantle2', 'fMantle', 'catchWait'].includes(S.p) && !['cross1', 'toBoard', 'exit', 'fLand'].includes(S.p)) S.nh = ssWalkH(S.nr);
  // העולם זז כך שהנינג'ה בנקודה S.nr של הסצנה
  const shift = o.x - (ssNX() - S.nr);
  if (Math.abs(shift) > 1e-6) ropeShiftBy(shift);
  // רמזים: אחרי שתיקה החבר מעודד, ואחר כך המשחק אומר את המילה
  const want = ['jumpWait', 'catchWait', 'hang', 'throwWait', 'pullWait'].includes(S.p) ? (ssExpected() || [])[0] : null;
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle >= SS.nudge && !S.nudged) { S.nudged = 1; ssSay('friend: come on!', 'Come on!'); }
    if (S.idle >= SS.hint + S.hinted * SS.hintEvery) { S.hinted++; sayWords([want], 1.6, S); }
  }
}
function ssGrabLedge() { const S = ssS; ssGo('ledge'); sfx('thud'); wordChipOk('catch'); }
function ssPhysics() { if (!ssS) return false; vy = 0; py = ssS.nh; return true; }
function ssSpeed() { return ssS ? 0 : null; }                                         // את העולם מזיזה הסצנה עצמה (ropeShiftBy)

/* ---------- פקודות ---------- */
function ssCmd(word) {
  if (!ssS || !['jump', 'catch', 'climb', 'throw', 'pull'].includes(word)) return false;
  const S = ssS, p = S.p;
  if (word === 'jump') {
    if (p === 'jumpWait') { ssGo('launch1'); S.x0 = 0; S.hit = 0; S.whoosh = 0; sfx('jump'); wordChipOk('jump'); }
    else if (p === 'meet' || p === 'fOn') { ssGo('early'); S.x0 = 0; S.hit = 0; S.said = 0; sfx('jump'); }
  } else if (word === 'catch') {
    if (p === 'catchWait') { ssGo('grab'); sfx('swish'); wordChipOk('catch'); }
    else if (p === 'fly2') { if (S.t >= 0.9) ssGrabLedge(); else S.held = 'catch'; }
    else if (p === 'ready2' || p === 'fJump') S.held = 'catch';
  } else if (word === 'climb') {
    if (p === 'hang') { ssGo('climbing'); wordChipOk('climb'); }
    else if (p === 'climbing' && S.n + S.q < 2) S.q++;
  } else if (word === 'throw') {
    if (p === 'throwWait') { ssGo('throwing'); sfx('swish'); wordChipOk('throw'); }
  } else if (word === 'pull') {
    if (p === 'pullWait') { ssGo('pulling'); wordChipOk('pull'); }
    else if (p === 'pulling' && S.n + S.q < 2) S.q++;
  }
  return true;                                                                        // בזמן הסצנה המילים האלה לא עושות את הפעולה הרגילה
}
function ssExpected() {
  if (!ssS) return null;
  const p = ssS.p;
  return p === 'jumpWait' ? ['jump'] : p === 'catchWait' || p === 'fly2' || p === 'ready2' || p === 'fJump' ? ['catch'] : p === 'hang' || p === 'climbing' ? ['climb']
       : p === 'throwWait' ? ['throw'] : p === 'pullWait' || p === 'pulling' ? ['pull'] : [];
}
function ssAuto() {
  const S = ssS; if (!S) return;
  const w = (ssExpected() || [])[0]; if (!w) return;
  if (S.p === 'fly2' ? S.t > 1.2 : ['jumpWait', 'catchWait', 'hang', 'throwWait', 'pullWait'].includes(S.p) && S.t > 0.6) command(w, 'auto');
}
function ssTap() { const S = ssS; if (!S) return null; return ['ready2', 'fJump', 'climbing', 'pulling'].includes(S.p) ? null : (ssExpected() || [])[0]; }

/* ---------- ציור ---------- */
function ssRnd(i) { const x = Math.sin(i * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); }
function ssMask(o, x) { const a = o.x - 70, b = o.x + o.w + 10, r = 40; return Math.max(0, Math.min(1, (x - a) / r, (b - x) / r)); }   // 0 מחוץ לסצנה, 1 בתוכה
// רקע משלו: שמיים והרים רחוקים בלבד (בלי הבמבוקים), ואדמה חומה בהירה בלי דשא
function ssBack(o) {
  const L = viewL() - 2, R = viewR() + 2, mid = ssMask(o, (L + R) / 2);
  if (mid <= 0) return;
  const top = (0 - oy) / scale - 2;
  ctx.save(); ctx.globalAlpha = mid;
  const g = ctx.createLinearGradient(0, top, 0, GROUND);
  g.addColorStop(0, '#a9daf0'); g.addColorStop(1, '#f6eedf');
  ctx.fillStyle = g; ctx.fillRect(L, top, R - L, GROUND - top + 1);
  ctx.fillStyle = 'rgba(255,255,255,.85)';                                             // כמה עננים רכים
  for (let i = 0; i < 4; i++) {
    const span = R - L + 60, cx = L - 30 + (((ssRnd(i + 40) * 600 - bgX * 0.05) % span) + span) % span, cy = top + 8 + ssRnd(i + 21) * 14, w = 8 + ssRnd(i + 5) * 8;
    ctx.beginPath(); ctx.ellipse(cx, cy, w, w * 0.3, 0, 0, Math.PI * 2); ctx.ellipse(cx - w * 0.35, cy - w * 0.15, w * 0.45, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  }
  const ridge = (par, base, amp, f, ph, col, snow) => {                                // רכס הרים רחוק: פסגות זוויתיות
    const pts = [];
    for (let x = L - 12; x <= R + 12; x += 6) {
      const u = Math.round((x + bgX * par) / 6) * 6, xx = u - bgX * par;
      pts.push([xx, base - amp * (0.45 + 0.55 * Math.abs(Math.sin(u * f + ph)) * (0.6 + 0.4 * Math.sin(u * f * 0.41 + ph * 2)))]);
    }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L - 12, GROUND + 1);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(R + 12, GROUND + 1); ctx.closePath(); ctx.fill();
    if (snow) {                                                                        // שלג על הפסגות הגבוהות
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i]; if (y > pts[i - 1][1] || y > pts[i + 1][1] || y > base - amp * 0.8) continue;
        const k = 0.28;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (pts[i + 1][0] - x) * k, y + (pts[i + 1][1] - y) * k); ctx.lineTo(x, y + 1.6); ctx.lineTo(x + (pts[i - 1][0] - x) * k, y + (pts[i - 1][1] - y) * k); ctx.closePath(); ctx.fill();
      }
    }
  };
  ridge(0.03, GROUND - 14, 40, 0.045, 0.7, '#c9d5e4', false);                            // הרים רחוקים מאוד
  ridge(0.07, GROUND - 4, 26, 0.06, 2.1, '#b3c3d6', false);                             // רכס רחוק קצת יותר קרוב
  const bottom = GROUND + 60, gg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 36);   // האדמה: חום בהיר, בלי דשא
  gg.addColorStop(0, '#d2a173'); gg.addColorStop(1, '#a87648');
  ctx.fillStyle = gg; ctx.fillRect(L, GROUND - 0.2, R - L, bottom - GROUND);
  ctx.fillStyle = 'rgba(120,80,45,.35)';                                               // אבנים קטנות
  for (let i = 0; i < 14; i++) { const span = R - L + 20, x = L - 10 + (((ssRnd(i + 70) * 400 - bgX) % span) + span) % span, y = GROUND + 5 + ssRnd(i + 71) * 22, w = 0.9 + ssRnd(i + 72) * 1.3; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function ssRock(o, C) {                                                                // צוק בגוון האדמה (חום בהיר), קווי מתאר זוויתיים, בלי דשא
  const x = o.x + C.a, g = GROUND, B = C.back, end = B[B.length - 1][0], face = () => { for (const [dx, y] of C.face) ctx.lineTo(x + dx, g - y); };
  ctx.fillStyle = '#c38f61';
  ctx.beginPath(); ctx.moveTo(x + C.face[0][0], g + 0.5); face();
  for (const [d, h] of B) ctx.lineTo(x + d, g - h);
  ctx.lineTo(x + end, g + 0.5); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.10)';                                                   // צל עדין לאורך הדופן
  ctx.beginPath(); ctx.moveTo(x + C.face[0][0], g); face();
  for (let i = C.face.length - 1; i >= 0; i--) ctx.lineTo(x + C.face[i][0] + 1.8, g - C.face[i][1]);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';                                             // אור על הראש ועל פאות המדרון
  ctx.beginPath(); for (const [d, h] of B) ctx.lineTo(x + d, g - h); for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(x + B[i][0] - 1.6, g - B[i][1] + 1.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function ssBoard(o, p, a) {                                                            // מקפצה: משען משולש וקרש מסתובב
  const x = o.x + p, g = GROUND;
  ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.moveTo(x - 2.4, g + 0.3); ctx.lineTo(x, g - SS.piv); ctx.lineTo(x + 2.4, g + 0.3); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(x, g - SS.piv); ctx.rotate(-a);
  ctx.fillStyle = '#b45309'; ctx.fillRect(-SS.half, -0.6, SS.half * 2, 1.2);
  ctx.fillStyle = '#d97706'; ctx.fillRect(-SS.half, -0.6, SS.half * 2, 0.35);
  ctx.fillStyle = '#78350f'; ctx.fillRect(-SS.half, -0.6, 0.5, 1.2); ctx.fillRect(SS.half - 0.5, -0.6, 0.5, 1.2);
  ctx.restore();
  ctx.fillStyle = '#44403c'; ctx.beginPath(); ctx.arc(x, g - SS.piv, 0.5, 0, Math.PI * 2); ctx.fill();
}
function ssFriendPose(S, now) {
  const f = S.f, p = S.p;
  if (f.walk) return poseWalk(now * 9);
  if (f.fly) { const P = poseAir(true); P.legs = [[1.6, -1.2], [1.8, -1.0]]; P.arms = [[1.2, 1.6], [1.4, 1.8]]; return P; }   // מקופל בסלטה
  if (f.air) return poseAir(S.t < 0.3);
  if (f.sit) { const P = poseIdle(now); P.hipY = -1.6; P.legs = [[1.5, 1.4], [1.3, 1.2]]; P.arms = [[-0.6, -0.4], [0.5, 0.8]]; P.lean = -0.25; P.eyes = 'squint'; return P; }
  if (f.climb) return poseClimb(now);
  if (f.kneel) {                                                                       // כורע בשפה ומחזיק את החבל
    const P = poseIdle(now); P.hipY = -2.6; P.legs = [[1.2, -0.4], [-0.6, -1.6]]; P.lean = 0.35;
    P.arms = ['hang', 'climbing', 'mantle1'].includes(p) || p === 'grab' ? [[0.9, 1.2], [1.0, 1.3]] : [[1.1, 1.4], [1.2, 1.5]];
    if (p === 'climbing') { const s = Math.sin(now * 9) * 0.25; P.arms = [[0.8 + s, 1.0 + s], [0.9 - s, 1.1 - s]]; P.lean = 0.1; }
    return P;
  }
  const P = poseIdle(now);
  if (p === 'meet' || p === 'meet2') { P.arms = [[-0.2, 0.25], [2.6, 2.9 + Math.sin(now * 9) * 0.35]]; }   // מנופף / מצביע
  if (p === 'jumpWait' || p === 'ready2' || p === 'throwWait') { P.arms = [[1.3, 1.6], [1.5, 1.8]]; P.eyes = 'wide'; }
  if (p === 'pullWait' && S.n === 0) { P.arms = [[2.8, 3.0], [2.8, 3.0]]; }
  if (p === 'hi5' || p === 'cheer2') { const k = Math.min(1, S.t / 0.35); P.arms = [[-0.2, 0.25], [ssL(0.6, 2.4, k), ssL(1.0, 2.5, k)]]; if (p === 'cheer2' && S.t > 0.7) P.arms[0] = [2.6, 2.9]; }
  if (p === 'fall2' || p === 'back2') P.eyes = 'wide';
  return P;
}
function ssNinjaPose(S, now) {
  const p = S.p;
  if (S.walking) return poseWalk(now * 9);
  if (p === 'launch1' || p === 'early') return S.t < 0.55 ? poseAir(S.t < 0.28) : Object.assign(poseIdle(now), { hipY: -3.9 });
  if (p === 'catchWait') { const P = poseIdle(now); P.headTilt = -0.35; P.arms = [[1.9, 2.3], [2.0, 2.4]]; P.eyes = 'wide'; return P; }
  if (p === 'grab' || p === 'hang' || p === 'ledge') { const P = poseIdle(now); const sw = Math.sin(now * 2.2) * 0.1; P.arms = [[2.95, 3.05], [2.95, 3.05]]; P.lean = sw; P.bob = 0; P.legs = [[-0.25 + sw, -0.15], [0.2 + sw, 0.25]]; return P; }
  if (p === 'climbing' || (p === 'mantle1' && S.t < 0.5) || (p === 'mantle2' && S.t < 0.55)) return poseClimb(now);
  if (p === 'fly2') { const P = poseIdle(now); P.arms = [[2.9, 3.0], [2.95, 3.05]]; P.legs = [[-0.15, -0.1], [0.15, 0.1]]; P.bob = 0; P.eyes = S.t > 0.9 ? 'wide' : P.eyes; if (S.t > 0.9) { const s = Math.sin(now * 7) * 0.15; P.arms = [[2.75 + s, 2.95], [2.85 - s, 3.05]]; } return P; }
  if (p === 'fall2') { if (S.t < 0.6) { const P = poseAir(false); P.eyes = 'wide'; return P; } const P = poseIdle(now); P.eyes = 'squint'; return P; }
  if (p === 'back2') return S.t < 0.6 ? poseAir(S.t < 0.3) : poseIdle(now);
  if (p === 'throwing') {                                                             // תנופה וזריקה קדימה-למטה
    const P = poseIdle(now), k = Math.min(1, S.t / 0.35);
    P.arms = [[-0.3, 0.1], k < 1 ? [ssL(0.8, 2.6, k), ssL(1.2, 2.9, k)] : [ssL(2.6, 1.0, (S.t - 0.35) / 0.2), ssL(2.9, 1.2, (S.t - 0.35) / 0.2)]]; P.lean = S.t > 0.35 ? 0.3 : -0.1; return P;
  }
  if (p === 'pullWait' || p === 'pulling' || p === 'fMantle' && S.t < 0.4) return p === 'pulling' ? posePull(S.t + S.n * 0.7) : Object.assign(posePull(0), {});
  if (p === 'throwWait') { const P = poseIdle(now); P.arms = [[1.2, 1.5], [1.3, 1.6]]; return P; }   // מחזיק את החבל
  if (p === 'hi5' || p === 'cheer2') { const P = poseIdle(now), k = Math.min(1, S.t / 0.35); P.arms = [[-0.2, 0.25], [ssL(0.6, 2.4, k), ssL(1.0, 2.5, k)]]; return P; }
  const P = poseIdle(now);
  if (p === 'jumpWait' || p === 'ready2') P.eyes = 'wide';
  return P;
}
let ssNinjaXY = null;                                                                   // איפה הנינג'ה מצויר (לחבל)
function drawSeesaw(o) {
  const S = ssS && ssS.o === o ? ssS : null, now = performance.now() / 1000;
  ssBack(o);
  for (const C of SS_CL) ssRock(o, C);
  ssBoard(o, SS.p1, S ? S.a1 : -SS_A0);
  ssBoard(o, SS.p2, S ? S.a2 : SS_A0);
  if (o.passed) return;
  if (!S) { drawFriend({ fx: o.x + 55, fy: GROUND, facing: -1, pose: Object.assign(poseIdle(now), { arms: [[-0.2, 0.25], [2.6, 2.9 + Math.sin(now * 9) * 0.35]] }) }); return; }   // מחכה ומנופף
  const f = S.f, P = ssFriendPose(S, now), fx = o.x + f.r, fy = GROUND - f.h;
  if (f.rot) { ctx.save(); ctx.translate(fx, fy - 6); ctx.rotate(f.rot * f.fc); drawFriend({ fx: 0, fy: 6, facing: f.fc, pose: P }); ctx.restore(); }
  else drawFriend({ fx, fy, facing: f.fc, pose: P });
  const fh = figHand(fx, fy, f.fc, FRIEND.scale, P, 1);
  // החבלים
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
  const hand = ssNinjaXY ? ssNinjaXY.hand : playerHand;
  if (['fLand', 'catchWait', 'grab', 'hang', 'climbing', 'mantle1'].includes(S.p) && S.ropeL > 0) {   // קיר ראשון: מהחבר אל הנינג'ה
    const ax = o.x + SS.w1 - 0.4, ay = GROUND - SS.H1;
    let ex, ey;
    if (['grab', 'hang', 'climbing'].includes(S.p) || (S.p === 'mantle1' && S.t < 0.4)) { ex = hand[0]; ey = hand[1]; }
    else { const sw = Math.sin(now * 2.4) * 1.2 * Math.min(1, S.ropeL / 8); ex = ax - 1.6 + sw; ey = ay + S.ropeL; }
    ctx.beginPath(); ctx.moveTo(fh[0], fh[1]); ctx.lineTo(ax, ay); ctx.quadraticCurveTo(ax - 0.6, (ay + ey) / 2, ex, ey); ctx.stroke();
    if (S.p === 'catchWait' || S.p === 'fLand') {
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(ex, ey, 0.8, 0, Math.PI * 2); ctx.fill();
      if (S.p === 'catchWait') { ctx.strokeStyle = 'rgba(250,204,21,' + (0.55 + Math.sin(now * 6) * 0.3) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(ex, ey, 2 + Math.sin(now * 6) * 0.4, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  if (['throwing', 'pullWait', 'pulling', 'fMantle'].includes(S.p) && !(S.p === 'fMantle' && S.t > 0.5)) {   // קיר שני: מהנינג'ה אל החבר
    const ax = o.x + SS.w2 + 0.4, ay = GROUND - SS.H2;
    let ex, ey;
    if (S.p === 'throwing') {
      const k = Math.max(0, Math.min(1, (S.t - 0.3) / 0.6));
      ex = ssL(hand[0], fh[0], k); ey = ssL(hand[1], fh[1], k) - Math.sin(Math.PI * k) * 6;
      ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.quadraticCurveTo((hand[0] + ex) / 2, Math.min(hand[1], ey) - 3 * (1 - k), ex, ey); ctx.stroke();
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(ex, ey, 0.8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(ax, ay); ctx.quadraticCurveTo(ax + 0.3, (ay + fh[1]) / 2, fh[0], fh[1]); ctx.stroke();
    }
  }
}
function ssDrawNinja() {
  const S = ssS; if (!S) { ssNinjaXY = null; return false; }
  const now = performance.now() / 1000, P = ssNinjaPose(S, now), fc = S.fc;
  const fx = PLAYER.x + 4, fy = GROUND - py;
  ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.05, 0.2 - (py - ssWalkH(S.nr)) * 0.01) + ')';
  ctx.beginPath(); ctx.ellipse(fx, GROUND - ssWalkH(S.nr) + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy, facing: fc, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, fc, 1, P, 1);
  ssNinjaXY = { hand: playerHand };
  return true;
}

// הרישום של הסצנה – הבסיס מכיר אותה רק דרך הטבלה (scenes.js). כולל הציור
sceneAdd({
  type: 'seesaw', word: 'seesaw', label: true,
  listen: ['jump', 'catch', 'climb', 'throw', 'pull'],
  active: () => !!ssS,
  reset: () => { ssS = null; },
  setup: ssSetup, afterGap: 0.8, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + SS.stop + PLAYER.w / 2,                                         // לפני המקפצה הראשונה
  draw: drawSeesaw, drawNinja: ssDrawNinja,
  update: ssUpdate, physics: ssPhysics, speed: ssSpeed,
  expected: ssExpected, cmd: ssCmd, auto: ssAuto, tap: ssTap,
  intro: { banner: 'JUMP · CATCH · CLIMB · CATCH · THROW · PULL!', time: 46,
           demo: () => { const o = { type: 'seesaw' }; ssSetup(o); o.x = ssNX() - SS.stop; obstacles.push(o); } }
});
