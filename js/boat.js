/* ninja-voice-game – boat.js
   PUSH TOGETHER (מסע בסירה): תרגול של דחיפה משותפת וקפיצה לסירה – שלוש פעמים בכל מסע.
   · חוף חול ארוך, סירת עץ, ונינג'ה חבר שמנסה לדחוף אותה לבד – מתאמץ, הסירה רק רועדת.
     הנינג'ה שלנו מגיע ונעצר. החבר זז הצידה ומבקש "Can you help me push?". הנינג'ה ניגש לסירה.
   · PUSH – דוחפים ביחד, הסירה זזה צעד. שלוש דחיפות והיא במים. החבר קופץ פנימה וקורא "Jump in!" – JUMP.
   · שטים בנהר (לבד, בלי מילה). גל גדול מרים את הסירה ומעלה אותה על אי – היא שוב תקועה.
     שניהם קופצים החוצה, החבר אומר "Stuck again! Let's push!" – ושוב PUSH ×3 ו-JUMP.
   · אחרי האי האחרון מגיעים לחוף, הנינג'ה קופץ לגדה, והחבר נשאר בסירה ומנופף.
   סבלני: העולם מחכה למילה. אחרי שתיקה ארוכה המשחק אומר את המילה בקול.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const BOAT = { shore: 72, sail: 230, isl: 50, islands: 1, len: 28, h: 6.5, bx0: 30, pushes: 1, step: 30, pushT: 1.4, greetT: 2.6, greatT: 2.0, thanksT: 2.7, byeT: 1.4,
               askT: 1.6, stepT: 0.5, stepDX: 7, hiT: 1.3, boardT: 0.7, boardDX: 13, row: 26, waveT: 1.4, waveAt: 24, stuckT: 0.7,
               outT: 0.7, landT: 0.75, landDX: 21, hint: 3.5, hintEvery: 6, coins: 6 };
let boat = null;   // { o, phase, t, idle, hinted, n }
// FISHING (o.mode === 'fish'): הסירה כבר במים ליד החוף והחבר יושב בה – JUMP פנימה, שטים, ובכל מקום דייג:
// THROW – זורקים חכה. המצוף צף ... שוקע (נשיכה) – PULL ומושכים דג. מוקדם מדי – "Wait for the bite!", מאוחר מדי – הדג בורח וזורקים שוב.
const FISH = { spots: 2, first: 70, gap: 150, tail: 90, askT: 1.3, castT: 0.75, floatMin: 1.6, floatMax: 3.0, biteT: 2.8, reelT: 1.0, caughtT: 1.5, goneT: 1.2, cast: 36, coins: 2 };
const FISHING = ['fishAsk', 'throwWait', 'cast', 'float', 'bite', 'reel', 'caught', 'gone'];
// phase: ask → step → wait ⇄ push → friendIn → jumpWait → board → row → wave → stuck → out → hi → wait … → row → land

function boatSetup(o) {                                                            // נקרא ב-spawn / בהדגמה
  if (o.mode === 'fish') {                                                         // דייג: בלי איים, עם מקומות דייג
    o.bx = BOAT.shore + 6; o.c = 0; o.isl = []; o.fish = 0; o.spots = [];
    let x = BOAT.shore + FISH.first; for (let i = 0; i < FISH.spots; i++) { o.spots.push(x); x += FISH.gap; }
    o.end = x + FISH.tail; o.w = o.end + 12; return;
  }
  o.bx = BOAT.bx0; o.c = 0;                                                        // c = האי הבא
  o.isl = []; let x = BOAT.shore + BOAT.sail;
  for (let i = 0; i < BOAT.islands; i++) { o.isl.push({ l: x, r: x + BOAT.isl }); x += BOAT.isl + BOAT.sail; }
  o.end = x;                                                                       // החוף בצד השני
  o.w = o.end + 12;
}
function boatStern(o) { return o.x + o.bx; }
function boatMid(o) { return boatStern(o) + BOAT.len / 2; }
function boatPool(o) { return { x: o.x + BOAT.shore, w: o.end - BOAT.shore }; }
function boatBob() { return Math.sin(performance.now() / 1000 * 2.4) * 0.35; }
function sandRanges(o) { return [[o.x - 40, o.x + BOAT.shore], ...o.isl.map(s => [o.x + s.l, o.x + s.r]), [o.x + o.end, o.x + o.end + 400]]; }
// גובה תחתית הסירה: על חול – על הקרקע. במים – צפה. בשפה – באמצע. בגל – מורמת
function boatKeelY(o) {
  const m = boatMid(o); let d = -1e9;
  for (const [l, r] of sandRanges(o)) d = Math.max(d, Math.min(m - l, r - m));
  const kw = Math.max(0, Math.min(1, (6 - d) / 12));
  let y = lerp(GROUND, waterY() + 2.2 + boatBob(), kw);
  if (boat && boat.o === o && boat.phase === 'wave') y -= Math.sin(Math.PI * Math.min(1, boat.t / BOAT.waveT)) * 2.5;
  return y;
}
function boatDeck(o) { return boatKeelY(o) - 3.4; }                                // איפה יושבים בתוך הסירה
function boatBusy() { return !!boat; }
function waveDist(o) { return o.x + o.isl[o.c].l + 8 - boatStern(o); }

// מהירות העולם בזמן השלב (null = לא בשליטה שלנו). שלילי = העולם זז ימינה (יוצאים מהסירה אחורה)
function boatSpeed() {
  if (!boat) return null;
  const B = boat, p = B.phase;
  if (p === 'step') return BOAT.stepDX / BOAT.stepT;
  if (p === 'push') return BOAT.step / BOAT.pushT;
  if (p === 'board') return BOAT.boardDX / BOAT.boardT;
  if (p === 'row') return BOAT.row;
  if (p === 'wave') return B.waveV;
  if (p === 'out') return -BOAT.boardDX / BOAT.outT;
  if (p === 'land') return BOAT.landDX / BOAT.landT;
  return 0;
}

function boatUpdate(dt, pb) {
  for (const ob of obstacles) if (ob.type === 'boat' && ob.jumps) { for (const j of ob.jumps) j.t += dt; ob.jumps = ob.jumps.filter(j => j.t < 1.2); }   // הדגים הקופצים
  if (!boat) {
    const o = obstacles.find(o => o.type === 'boat' && !o.passed && !o.waving && pb.r >= boatStern(o) - BOAT.stepDX - 0.3 && pb.l < o.x + o.end);
    if (!o) return;
    const over = pb.r - (boatStern(o) - BOAT.stepDX); if (over > 0) ropeShiftBy(over);   // נעצר מאחורי החבר שדוחף לבד
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    boat = { o, phase: o.mode === 'fish' ? 'jumpWait' : 'greet', t: 0, idle: 0, hinted: 0, n: 0 };
    speak(o.mode === 'fish' ? 'friend: jump in!' : 'friend: hi! my boat is stuck in the sand.');
    return;
  }
  const B = boat, o = B.o, v = boatSpeed(); B.t += dt;
  if (!obstacles.includes(o)) { boat = null; return; }
  const demo = state !== 'play';
  const go = ph => { B.phase = ph; B.t = 0; B.idle = 0; B.hinted = 0; };
  if (['push', 'row', 'wave'].includes(B.phase)) o.bx += v * dt;                 // הסירה זזה יחד עם הנינג'ה (העולם זז אחורה)
  if (B.phase === 'wait' || B.phase === 'yesWait' || B.phase === 'jumpWait' || B.phase === 'throwWait' || B.phase === 'bite') {   // מחכים למילה – אחרי שתיקה ארוכה המשחק אומר אותה
    B.idle += dt;
    const w = B.phase === 'wait' ? 'push' : B.phase === 'yesWait' ? 'yes' : B.phase === 'jumpWait' ? 'jump' : B.phase === 'throwWait' ? 'throw' : 'pull';
    if (demo) { if (B.idle >= 0.9) { if (banner) banner.text = 'Say ' + w.toUpperCase() + '!'; command(w, 'demo'); } }
    else if (B.phase === 'bite') { if (B.idle >= 1.3 && !B.hinted) { B.hinted++; sayWords([w], 1.2, B); } }   // בנשיכה – רמז מהר, החלון קצר
    else if (B.idle >= BOAT.hint + B.hinted * BOAT.hintEvery) { B.hinted++; sayWords([w], 1.6, B); }
  }
  switch (B.phase) {
    case 'greet': if (B.t >= BOAT.greetT) { go('yesWait'); speak('friend: can you help me?'); } break;   // החבר מסתובב, מנופף ומצביע על הסירה ועל המים
    case 'great': if (B.t >= BOAT.greatT) go('step'); break;                     // "Great! Let's push together!" – וזז לצד הסירה
    case 'ask': if (B.t >= BOAT.askT) go('step'); break;                          // החבר זז הצידה ומבקש עזרה
    case 'step': if (B.t >= BOAT.stepT) { go('wait'); B.n = 0; } break;           // הנינג'ה ניגש לסירה
    case 'hi': if (B.t >= BOAT.hiT) { go('wait'); B.n = 0; } break;
    case 'push':
      if (Math.random() < 0.5) particles.push({ x: PLAYER.x + 2 + Math.random() * 3, y: GROUND, vx: -8 - Math.random() * 8, vy: -4 - Math.random() * 5, g: 40, life: 0.45, color: '#e7cf9a', size: 0.8 });   // חול שעף מהרגליים
      if (B.t >= BOAT.pushT) {
        B.n++; sfx('thud');
        if (B.n >= BOAT.pushes) { go('friendIn'); burst(boatStern(o) + BOAT.len * 0.8, waterY(), '#e0f2fe', 12, 24); sfx('splash'); }   // הסירה במים – התזה
        else go('wait');
      }
      break;
    case 'friendIn': if (B.t >= 0.8) { go('jumpWait'); speak('friend: jump in!'); } break;   // החבר קופץ פנימה ראשון
    case 'board': if (B.t >= BOAT.boardT) { go('row'); burst(PLAYER.x + 4, boatDeck(o), '#e0f2fe', 6, 14); } break;
    case 'row':
      B.fishT = (B.fishT || 0) - dt;                                               // דגים קופצים מהמים ליד הסירה
      if (B.fishT <= 0) { B.fishT = 0.9 + Math.random() * 1.1; (o.jumps = o.jumps || []).push({ rx: o.bx + (Math.random() < 0.5 ? -6 - Math.random() * 14 : BOAT.len + 4 + Math.random() * 22), t: 0, dir: Math.random() < 0.5 ? 1 : -1, h: 7 + Math.random() * 5, col: ['#fb923c', '#facc15', '#f472b6', '#38bdf8'][Math.floor(Math.random() * 4)] }); }
      if (o.mode === 'fish' && o.c < o.spots.length) { if (boatStern(o) >= o.x + o.spots[o.c]) { go('fishAsk'); o.jumps = []; } }   // הגענו למקום דייג
      else if (o.mode !== 'fish' && o.c < o.isl.length) { if (waveDist(o) <= BOAT.waveAt + 8) { B.waveV = waveDist(o) / BOAT.waveT; go('wave'); sfx('wind'); } }   // גל גדול מתקרב
      else if (boatStern(o) + BOAT.len >= o.x + o.end - 1) go('land');            // החרטום נגע בחוף
      break;
    case 'wave':
      if (Math.random() < 0.6) particles.push({ x: boatStern(o) - 2 + Math.random() * 6, y: waterY() - 1, vx: -10 - Math.random() * 10, vy: -12 - Math.random() * 8, g: 60, life: 0.6, color: '#e0f2fe', size: 0.9 });
      if (B.t >= BOAT.waveT) { go('stuck'); sfx('thud'); burst(boatMid(o), GROUND - 0.5, '#e7cf9a', 12, 20); }
      break;
    case 'stuck': if (B.t >= BOAT.stuckT) go('out'); break;                        // הסירה על האי – יוצאים
    // ---------- דייג ----------
    case 'fishAsk': if (B.t >= FISH.askT) go('throwWait'); break;                   // החבר: "Let's fish!"
    case 'cast': if (B.t >= FISH.castT) { go('float'); B.wait = FISH.floatMin + Math.random() * (FISH.floatMax - FISH.floatMin); sfx('splash'); burst(fishBobX(), waterY(), '#e0f2fe', 6, 12); } break;
    case 'float': if (B.early > 0) B.early -= dt; if (B.t >= B.wait) { go('bite'); sfx('splash'); burst(fishBobX(), waterY(), '#e0f2fe', 8, 16); } break;   // המצוף צף ... עד שהדג נושך
    case 'bite':
      if (Math.random() < dt * 5) burst(fishBobX(), waterY(), '#e0f2fe', 3, 10);    // המצוף קופץ ושוקע
      if (B.t >= FISH.biteT) { go('gone'); sfx('hit'); }                            // איחרנו – הדג ברח עם הפיתיון
      break;
    case 'reel': if (B.t >= FISH.reelT) { go('caught'); o.fish++; sfx('coin');
        if (state === 'play') { picked += FISH.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 6 }, boatDeck(o) - 10); floatText(PLAYER.x + 8, boatDeck(o) - 16, '+' + FISH.coins + ' 🟡', '#ca8a04'); } }
      break;
    case 'caught': if (B.t >= FISH.caughtT) { o.c++; go('row'); } break;              // דג בסירה – ממשיכים לשוט
    case 'gone': if (B.t >= FISH.goneT) go('throwWait'); break;                       // זורקים שוב
    case 'out': if (B.t >= BOAT.outT) { py = 0; vy = 0; o.c++; go('hi'); speak('friend: stuck again!'); burst(PLAYER.x + 4, GROUND - 0.5, '#e7cf9a', 6, 12); } break;
    case 'land':
      if (B.t >= BOAT.landT) {
        py = 0; vy = 0; burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 7, 14); sfx('clear');
        if (mode === 'journey' && state === 'play') { picked += BOAT.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BOAT.coins + ' 🟡', '#ca8a04'); }
        if (o.mode === 'fish') { cleared(o); o.waving = true; boat = null; }
        else { go('farewell'); speak('friend: thanks for your help! see you!'); }   // נפרדים: החבר מודה, הנינג'ה מסתובב ואומר Bye
      }
      break;
    case 'farewell':
      if (!B.bye && B.t >= BOAT.thanksT) { B.bye = 1; speak('ninja: bye!'); }
      if (B.t >= BOAT.thanksT + BOAT.byeT) { cleared(o); o.waving = true; boat = null; }
      break;
  }
}
// גובה הנינג'ה: קפיצות פנימה והחוצה (true = השלב שולט בגובה)
function boatPhysics(dt) {
  if (!boat) return false;
  const B = boat, p = B.phase;
  const arc = (T, h) => { const k = Math.min(1, B.t / T); py = Math.sin(Math.PI * k) * h; vy = 0; return true; };
  if (p === 'board') return arc(BOAT.boardT, 9);
  if (p === 'out') return arc(BOAT.outT, 8);
  if (p === 'land') return arc(BOAT.landT, 8);
  if (['row', 'wave', 'stuck'].includes(p) || FISHING.includes(p)) { py = 0; vy = 0; return true; }
  return false;
}
// כמה הנינג'ה מצויר נמוך מהקרקע (יושב בתוך הסירה)
function boatSink() {
  if (!boat) return 0;
  const B = boat, p = B.phase, d = boatDeck(B.o) - GROUND;
  if (p === 'board') return d * Math.min(1, B.t / BOAT.boardT);
  if (['row', 'wave', 'stuck'].includes(p) || FISHING.includes(p)) return d;
  if (p === 'out') return d * (1 - Math.min(1, B.t / BOAT.outT));
  if (p === 'land') return d * (1 - Math.min(1, B.t / BOAT.landT));
  return 0;
}

/* ---------- פקודות ---------- */
function boatYes() {                                                              // YES – עונים לחבר שביקש עזרה (true = טופל כאן)
  if (!boat || boat.phase !== 'yesWait') return false;
  boat.phase = 'great'; boat.t = 0; boat.idle = 0; boat.hinted = 0; speak("friend: great! let's push together!");
  return true;
}
function boatPush() {
  if (!boat) return false;
  if (boat.phase === 'wait') { boat.phase = 'push'; boat.t = 0; }
  return true;
}
function boatThrow() {                                                            // דייג: THROW זורק את החכה (true = טופל כאן)
  if (!boat || boat.o.mode !== 'fish') return false;
  if (boat.phase === 'throwWait') { boat.phase = 'cast'; boat.t = 0; boat.idle = 0; boat.hinted = 0; sfx('jump'); }
  return true;
}
function boatPull() {                                                             // דייג: PULL מושך כשהדג נושך
  if (!boat || boat.o.mode !== 'fish') return false;
  if (boat.phase === 'bite') { boat.phase = 'reel'; boat.t = 0; burst(fishBobX(), waterY(), '#e0f2fe', 12, 22); sfx('splash'); }
  else if (boat.phase === 'float') boat.early = 1.4;                              // מוקדם מדי – מחכים לנשיכה
  return true;
}
function boatJump() {                                                             // true = ה-JUMP טופל כאן
  if (!boat) return false;
  if (boat.phase === 'jumpWait') { boat.phase = 'board'; boat.t = 0; sfx('jump'); }
  return true;
}
function boatExpected() {
  if (!boat) return null;
  return boat.phase === 'wait' ? ['push'] : boat.phase === 'yesWait' ? ['yes'] : boat.phase === 'jumpWait' ? ['jump'] : boat.phase === 'throwWait' ? ['throw'] : boat.phase === 'bite' ? ['pull'] : [];
}
function boatAuto() { if (boat && boat.idle > 0.4) { const w = boatExpected()[0]; if (w) command(w, 'auto'); } }

/* ---------- תנוחות ---------- */
function rowArms(P, now, ph) {                                                    // חתירה: ידיים קדימה ואחורה עם המשוט
  const c = Math.sin(now * 4 + (ph || 0));
  P.arms = [[1.2 + c * 0.5, 1.7 + c * 0.3], [1.3 + c * 0.5, 1.8 + c * 0.3]];
  P.lean = 0.1 - c * 0.18;
  return P;
}
function sitLegs(P) { P.legs = [[1.45, -0.15], [1.55, -0.05]]; P.hipY = -2.2; P.bob = 0; return P; }
function handsOnBoat(P) { P.arms = [[1.2, 1.5], [1.3, 1.6]]; P.lean = 0.15; return P; }
const waveArm = now => [2.05, 2.3 + Math.sin(now * 10) * 0.45];                    // יד מנופפת קדימה-למעלה (ישר למעלה היא נעלמת מאחורי הראש)
function boatPose(P) {
  if (!boat) return P;
  const B = boat, p = B.phase, now = performance.now() / 1000;
  if (p === 'push') return posePush();
  if (p === 'step') return poseRun(now * 18);
  if (p === 'ask' || p === 'greet' || p === 'yesWait' || p === 'great') return poseIdle(now);
  if (p === 'farewell') { P = poseIdle(now); if (B.t > 0.4) P.arms[1] = waveArm(now); return P; }   // מסתובב לחבר ומנופף
  if (['wait', 'hi', 'friendIn', 'jumpWait'].includes(p)) return handsOnBoat(poseIdle(now));   // ידיים על הסירה
  if (p === 'board' || p === 'out' || p === 'land') return poseAir(B.t < ({ board: BOAT.boardT, out: BOAT.outT, land: BOAT.landT })[p] / 2);
  if (p === 'row') return rowArms(sitLegs(poseIdle(now)), now);
  if (p === 'wave' || p === 'stuck') { P = sitLegs(poseIdle(now)); P.arms = [[-2.4, -2.9], [2.4, 2.9]]; P.lean = -0.15; return P; }   // נאחז – ידיים למעלה
  if (FISHING.includes(p)) {                                                       // מחזיק חכה בשתי ידיים
    P = sitLegs(poseIdle(now)); P.arms = [[1.05, 0.55], [0.95, 0.45]]; P.lean = 0.05;
    if (p === 'cast') { const k = Math.min(1, B.t / FISH.castT); if (k < 0.45) { P.arms = [[2.0, 2.6], [1.9, 2.5]]; P.lean = -0.2; } }   // מניף אחורה
    if (p === 'reel') { const k = Math.min(1, B.t / 0.35); P.arms = [[lerp(1.0, 1.9, k), lerp(0.5, 2.3, k)], [lerp(0.9, 1.8, k), lerp(0.4, 2.2, k)]]; P.lean = -0.25 * k; }   // מושך חזק
    if (p === 'caught') { P.arms = [[-2.4, -2.9], [2.4, 2.9]]; }                     // שמחה
    return P;
  }
  return P;
}

/* ---------- ציור ---------- */
function friendSpot(o) {                                                          // איפה החבר ובאיזו תנוחה
  const B = boat && boat.o === o ? boat : null, p = B ? B.phase : (o.waving ? 'bye' : 'alone'), now = performance.now() / 1000, st = boatStern(o);
  const side = st + 8, sy = GROUND - 2.6, seat = st + BOAT.len * 0.72, deck = boatDeck(o), sc = 0.92;
  const ease = q => q * q * (3 - 2 * q);
  if (o.mode === 'fish' && p !== 'row') {                                         // דייג: החבר יושב בסירה מההתחלה
    const P = sitLegs(poseIdle(now));
    if (p === 'alone' || p === 'jumpWait' || p === 'bye' || p === 'land' || p === 'fishAsk') P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35];   // מנופף / קורא
    if (p === 'caught') P.arms = [[-2.4, -2.9], [2.4, 2.9]];
    if (p === 'bite') { P.lean = 0.2; P.arms[1] = [1.6, 1.4]; }                     // מצביע על המצוף
    return { x: seat, y: deck, P, scale: sc, inBoat: true };
  }
  if (p === 'alone') { const P = posePush(); P.lean += Math.sin(now * 14) * 0.06; return { x: st - 3.4, y: GROUND, P, scale: sc, alone: true }; }   // דוחף לבד ולא מצליח
  if (p === 'greet') {                                                           // מסתובב אל הנינג'ה ומנופף, ואז מצביע על הסירה ועל המים
    const P = poseIdle(now), t = B.t;
    if (t < 0.7) { P.arms[1] = waveArm(now); return { x: st - 0.8, y: GROUND, P, scale: sc, facing: -1 }; }
    if (t < 1.6) { P.arms[1] = [1.25, 1.2]; P.lean = 0.12; return { x: st - 0.8, y: GROUND, P, scale: sc }; }   // מצביע על הסירה התקועה
    P.arms[1] = [1.85, 1.8]; P.lean = 0.05; return { x: st - 0.8, y: GROUND, P, scale: sc };                    // ...ועל המים
  }
  if (p === 'yesWait') { const P = poseIdle(now); P.arms[1] = [1.1, 1.7 + Math.sin(now * 3) * 0.08]; P.arms[0] = [0.9, 1.5]; return { x: st - 0.8, y: GROUND, P, scale: sc, facing: -1 }; }   // פונה לנינג'ה ושואל
  if (p === 'great') {                                                           // שמח, וזז לצד הסירה
    const k = ease(Math.min(1, Math.max(0, (B.t - 0.6) / 0.8)));
    const P = k > 0 && k < 1 ? poseRun(now * 16) : poseIdle(now); if (k === 0) P.arms = [[-2.4, -2.9], [2.4, 2.9]];
    return { x: lerp(st - 0.8, side, k), y: lerp(GROUND, sy, k), P, scale: sc, facing: k === 0 ? -1 : 1 };
  }
  if (p === 'ask') {                                                             // מסתובב, מבקש עזרה וזז לצד הסירה
    const k = ease(Math.min(1, Math.max(0, (B.t - 0.5) / 0.8)));
    const P = k > 0 && k < 1 ? poseRun(now * 16) : poseIdle(now); if (k === 0) P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35];
    return { x: lerp(st - 3.4, side, k), y: lerp(GROUND, sy, k), P, scale: sc };
  }
  if (p === 'step' || p === 'wait' || p === 'hi') { const P = handsOnBoat(poseIdle(now)); if (p === 'hi' && B.t < 0.8) P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; return { x: side, y: sy, P, scale: sc }; }
  if (p === 'push') return { x: side, y: sy, P: posePush(), scale: sc };
  if (p === 'friendIn') {                                                        // קופץ פנימה בקשת
    const k = Math.min(1, B.t / 0.6), e = ease(k);
    return { x: lerp(side, seat, e), y: lerp(sy, deck, e) - Math.sin(Math.PI * k) * 8, P: k < 1 ? poseAir(k < 0.5) : sitLegs(poseIdle(now)), scale: sc, inBoat: k > 0.4 };
  }
  if (p === 'out') {                                                             // קופץ מהסירה אל צד הסירה על האי
    const k = Math.min(1, B.t / BOAT.outT), e = ease(k);
    return { x: lerp(seat, side, e), y: lerp(deck, sy, e) - Math.sin(Math.PI * k) * 8, P: poseAir(k < 0.5), scale: sc, inBoat: k < 0.5 };
  }
  if (p === 'row') return { x: seat, y: deck, P: rowArms(sitLegs(poseIdle(now)), now, 0.4), scale: sc, inBoat: true };
  if (p === 'wave' || p === 'stuck') { const P = sitLegs(poseIdle(now)); P.arms = [[-2.4, -2.9], [2.4, 2.9]]; return { x: seat, y: deck, P, scale: sc, inBoat: true }; }
  const P = sitLegs(poseIdle(now)); if (p === 'bye' || p === 'land' || p === 'farewell') P.arms[1] = waveArm(now);   // יושב בסירה (ומנופף בסוף)
  return { x: seat, y: deck, P, scale: sc, inBoat: true };
}

function drawSand(x0, x1, rise, taper) {                                                 // חול: על החוף (rise=0) או אי שעולה מהמים
  const wy = waterY(), top = GROUND - 0.3;
  const g = ctx.createLinearGradient(0, top, 0, wy + 4);
  g.addColorStop(0, '#f3dfae'); g.addColorStop(1, '#d4b373');
  ctx.fillStyle = g; ctx.beginPath();
  if (rise) {
    ctx.moveTo(x0 - 4, wy + 3.5); ctx.quadraticCurveTo(x0 + 2, top - 0.2, x0 + 8, top);
    for (let x = x0 + 8; x <= x1 - 8; x += 2) ctx.lineTo(x, top - Math.sin((x - x0) * 0.25) * 0.2);
    ctx.quadraticCurveTo(x1 - 2, top - 0.2, x1 + 4, wy + 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,110,50,.35)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, wy + 2.6, (x1 - x0) / 2 + 2, 1, 0, 0, Math.PI * 2); ctx.fill();   // חול רטוב בקו המים
  } else {                                                                        // חוף: שכבת חול שמתעבה בהדרגה מהדשא, עם קצה לא ישר (taper = באיזה צד הוא נגמר בדשא)
    const th = x => { const r = x - x0, l = x1 - x, e = Math.min(1, (taper < 0 ? r : l) / 14); return Math.max(0, e * e * (3 - 2 * e)); };
    const st = 1;
    ctx.moveTo(x0, GROUND + 0.8);
    for (let x = x0; x <= x1 + 0.01; x += st) ctx.lineTo(x, GROUND + 0.8 - (1.15 + Math.sin((x - x0) * 0.35) * 0.08) * th(x));
    for (let x = x1; x >= x0 - 0.01; x -= st) ctx.lineTo(x, GROUND + 0.8 + 3.2 * th(x));   // עמוק מספיק כדי לכסות את פס הדשא של הקרקע – החול לא נראה צף
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,120,60,.35)';                                           // גרגרים – צמודים לחול (לא לפיקסלים של המסך), אז לא מרצדים
  for (let r = 3, k = 0; r < x1 - x0 - 3; r += 5.3, k++) { if (!rise && (taper < 0 ? r : x1 - x0 - r) < 8) continue; ctx.beginPath(); ctx.ellipse(x0 + r, GROUND + 0.9 + (k % 2) * 0.6, 0.5, 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawBeach(P, dir) {                                                      // החול ממשיך לאורך הגדה: התחתית שלו יורדת בשיפוע עדין עד קו המים ומתחתיו (dir=1 – גדה שמאלית, -1 – ימנית)
  const wy = waterY(), ex = dir > 0 ? P.x : P.x + P.w, at = y => ex + dir * bankOff(P, y), deep = wy + 7, far = 22;
  const g = ctx.createLinearGradient(0, GROUND - 0.4, 0, deep);
  g.addColorStop(0, '#f3dfae'); g.addColorStop(0.5, '#dfc390'); g.addColorStop(1, '#c9a86c');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(ex - dir * far, GROUND - 0.35);
  ctx.lineTo(at(GROUND) + dir * 0.3, GROUND - 0.35);
  for (let y = GROUND; y <= deep; y += 0.5) ctx.lineTo(at(y) - dir * 0.2, y);       // צמוד לדופן הגדה
  ctx.quadraticCurveTo(at(deep) - dir * 6, deep - 1, ex - dir * far, GROUND + 3.6); // תחתית החול – עולה בשיפוע עדין בחזרה לשכבת החוף
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35;              // קצף קטן בקו המים
  ctx.beginPath(); ctx.ellipse(at(wy) + dir * 1.8, wy + 0.5, 1.8, 0.35, 0, 0, Math.PI * 2); ctx.stroke();
}
function drawPalm(x) {                                                            // עץ דקל קטן על האי
  const t = performance.now() / 1000, top = GROUND - 17;
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, GROUND - 0.3); ctx.quadraticCurveTo(x - 1.5, GROUND - 9, x + 1, top); ctx.stroke();
  ctx.fillStyle = '#16a34a';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.75 + Math.sin(t * 1.5 + k) * 0.05;
    ctx.save(); ctx.translate(x + 1, top); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -1.6, 8, 1.4); ctx.quadraticCurveTo(4, 0.6, 0, 0); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#78350f'; for (const dx of [-0.4, 0.8]) { ctx.beginPath(); ctx.arc(x + 1 + dx, top + 0.8, 0.6, 0, Math.PI * 2); ctx.fill(); }   // קוקוסים
}

// לפני הנינג'ה: חוף החול, הנהר, האיים, פנים הסירה, משוטים והחבר
function drawBoatBack(o) {
  const t = performance.now() / 1000, P = boatPool(o), bottom = GROUND + 40, wy = waterY();
  drawSand(o.x - 30, o.x + BOAT.shore + 2, false, -1);                               // חוף חול ארוך
  drawSand(o.x + o.end - 2, o.x + o.end + 40, false, 1);                            // וגם בצד השני
  drawBasinWall(P, bottom);                                                       // הנהר – בנוי כמו האגם
  const g = ctx.createLinearGradient(0, wy, 0, GROUND + 30);
  g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = g; waterPath(P, bottom); ctx.fill();
  ctx.save(); waterPath(P, bottom); ctx.clip(); drawRiverLife(o, P, t); ctx.restore();   // קצת דגים וצמחים מתחת למים
  drawShore(P);
  drawBeach(P, 1); drawBeach(P, -1);                                            // החול יורד בשיפוע עדין עד המים בשתי הגדות
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35;              // זרם – פסים קטנים שזזים
  for (let i = 0; i < P.w / 9; i++) { const xx = P.x + 8 + ((i * 9 + t * 6) % (P.w - 16)); if (xx < viewL() - 5 || xx > viewR() + 5) continue; ctx.beginPath(); ctx.moveTo(xx, wy + 2 + (i % 3) * 1.6); ctx.lineTo(xx + 2.6, wy + 2 + (i % 3) * 1.6); ctx.stroke(); }
  if (o.mode !== 'fish') drawCrows(o, P.x + 10, P.x + P.w - 10, 3, GROUND - 27);   // עורבים מעל הנהר – אי אפשר פשוט לקפוץ (לא בדייג)
  for (const s of o.isl) { const l = o.x + s.l, r = o.x + s.r; if (r < viewL() - 10 || l > viewR() + 10) continue; drawSand(l, r, true); drawPalm(r - 9); }
  const B = boat && boat.o === o ? boat : null;
  if (B && B.phase === 'wave') drawWave(o, Math.min(1, B.t / BOAT.waveT));
  const F = friendSpot(o);
  if (!F.inBoat) drawFigure({ fx: F.x, fy: F.y, facing: F.facing || 1, scale: F.scale, kind: 'ninja', accent: mudAccent(), pose: F.P });
  drawBoatHull(o, true);                                                          // פנים הסירה (הדופן הרחוקה)
  if (F.inBoat) drawFigure({ fx: F.x, fy: F.y, facing: 1, scale: F.scale, kind: 'ninja', accent: mudAccent(), pose: F.P });
}
function drawRiverLife(o, P, t) {                                                 // מעט צמחי מים שמתנופפים מהקרקעית, ודגים ששוחים לאט הלוך ושוב
  const bed = GROUND + 27;
  for (let i = 0, x = P.x + 22; x < P.x + P.w - 22; i++, x += 38 + hash(i * 3.3) * 22) {
    if (x < viewL() - 10 || x > viewR() + 10) continue;
    for (let b = 0; b < 3; b++) {
      const bx = x + b * 1.6, h = 7 + hash(i * 5 + b) * 7, sw = Math.sin(t * 1.3 + i + b * 0.8) * 1.6;
      ctx.strokeStyle = b % 2 ? 'rgba(34,197,94,.75)' : 'rgba(21,128,61,.8)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, bed); ctx.quadraticCurveTo(bx + sw, bed - h * 0.5, bx + sw * 0.4, bed - h); ctx.stroke();
    }
  }
  const cols = ['#fb923c', '#facc15', '#f472b6'];
  for (let i = 0; i < P.w / 55; i++) {
    const home = P.x + 30 + i * 55 + hash(i * 7.1) * 20, dir = Math.cos(t * 0.35 + i * 1.7) >= 0 ? 1 : -1;
    const x = home + Math.sin(t * 0.35 + i * 1.7) * 9, y = GROUND + 9 + hash(i * 2.9) * 11 + Math.sin(t * 1.2 + i) * 0.6;
    if (x < viewL() - 6 || x > viewR() + 6) continue;
    const tail = Math.sin(t * 9 + i) * 0.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.ellipse(0, 0, 2.1, 1.05, 0, 0, Math.PI * 2); ctx.fill();                  // גוף
    ctx.beginPath(); ctx.moveTo(-1.7, 0); ctx.lineTo(-3.2, -1 + tail); ctx.lineTo(-3.2, 1 + tail); ctx.closePath(); ctx.fill();   // זנב
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(1.1, -0.25, 0.25, 0, Math.PI * 2); ctx.fill();   // עין
    ctx.restore();
  }
}
function drawWave(o, k) {                                                         // גל גדול מאחורי הסירה שמרים אותה
  const x = boatStern(o) - 6, wy = waterY(), h = Math.sin(Math.PI * k) * 7, w = 20;
  ctx.fillStyle = 'rgba(56,189,248,.92)'; ctx.beginPath(); ctx.moveTo(x - w, wy + 2);
  ctx.quadraticCurveTo(x - 6, wy + 1, x, wy - h); ctx.quadraticCurveTo(x + 3, wy - h - 1.5, x + 5, wy - h + 2.5);   // הקצה המתקפל קדימה
  ctx.quadraticCurveTo(x + 7, wy, x + 14, wy + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 4, wy - h * 0.7); ctx.quadraticCurveTo(x, wy - h - 1, x + 4.5, wy - h + 2.2); ctx.stroke();   // קצף
}
// אחרי הנינג'ה: הדופן הקרובה של הסירה (מסתירה את הרגליים של היושבים), מים מעל תחתית הסירה, ובועות דיבור
function drawJumpingFish(o) {                                                     // דג קופץ בקשת מעל המים, עם התזה ביציאה ובכניסה
  if (!o.jumps) return;
  const wy = waterY();
  for (const j of o.jumps) {
    const k = Math.min(1, j.t / 0.9), x = o.x + j.rx + j.dir * (k - 0.5) * 9, y = wy + 0.5 - Math.sin(Math.PI * k) * j.h;
    if (k < 1) {
      const a = Math.atan2(-Math.cos(Math.PI * k) * j.h * Math.PI, 9 * j.dir);   // הדג פונה לכיוון התנועה
      ctx.save(); ctx.translate(x, y); ctx.rotate(j.dir > 0 ? a : a + Math.PI); ctx.scale(1, j.dir > 0 ? 1 : -1);
      ctx.fillStyle = j.col; ctx.beginPath(); ctx.ellipse(0, 0, 2.1, 1.0, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1.7, 0); ctx.lineTo(-3.2, -1); ctx.lineTo(-3.2, 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(1.1, -0.25, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (!j.s1 && j.t > 0.02) { j.s1 = 1; burst(x, wy + 0.3, '#e0f2fe', 5, 14); }
    if (!j.s2 && k >= 1) { j.s2 = 1; burst(x, wy + 0.3, '#e0f2fe', 6, 16); }
  }
}
/* ---------- דייג: חכה, חוט, מצוף ודג ---------- */
function fishRod(o) {                                                             // בסיס החכה ביד הקדמית, והקצה שלה
  const B = boat, now = performance.now() / 1000, deck = boatDeck(o);
  const h = figHand(PLAYER.x + 4, deck, 1, 1, boatPose(poseIdle(now)), 1);
  let a = -0.95;                                                                   // זווית החכה: למעלה-קדימה
  if (B && B.o === o) {
    if (B.phase === 'cast') { const k = Math.min(1, B.t / FISH.castT); a = k < 0.45 ? lerp(-0.95, -2.2, k / 0.45) : lerp(-2.2, -0.7, Math.min(1, (k - 0.45) / 0.3)); }
    if (B.phase === 'float' || B.phase === 'gone') a = -0.7;
    if (B.phase === 'bite') a = -0.62 + Math.sin(now * 18) * 0.05;               // הדג מושך – החכה רועדת
    if (B.phase === 'reel') a = lerp(-0.7, -1.7, Math.min(1, B.t / 0.4));
  }
  return { bx: h[0], by: h[1], tx: h[0] + Math.cos(a) * 14, ty: h[1] + Math.sin(a) * 14 };
}
function fishBobX() { return PLAYER.x + 4 + FISH.cast; }
function drawFishing(o) {
  const B = boat && boat.o === o ? boat : null;
  if (o.mode !== 'fish') return;
  const now = performance.now() / 1000, wy = waterY();
  // דגים בתוך הסירה – הזנבות מציצים מעל הדופן
  for (let i = 0; i < (o.fish || 0); i++) { const x = boatStern(o) + BOAT.len * 0.5 + i * 2.6, y = boatKeelY(o) - BOAT.h - 0.6; ctx.fillStyle = ['#fb923c', '#facc15', '#38bdf8', '#f472b6'][i % 4]; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x - 1.2, y - 1.4 + Math.sin(now * 6 + i) * 0.3); ctx.lineTo(x + 1.2, y - 1.4 - Math.sin(now * 6 + i) * 0.3); ctx.closePath(); ctx.fill(); }
  if (!B || !FISHING.includes(B.phase)) return;                                    // החכה רק בזמן הדייג
  const R = fishRod(o); drawRod(R);
  const p = B.phase, bx = fishBobX();
  let by = null;
  if (p === 'cast') { const k = Math.min(1, B.t / FISH.castT); if (k > 0.45) { const q = (k - 0.45) / 0.55; by = { x: lerp(R.tx, bx, q), y: lerp(R.ty, wy, q) - Math.sin(Math.PI * q) * 8 }; } }
  if (p === 'float' || p === 'gone') by = { x: bx, y: wy + 0.2 + Math.sin(now * 2.5) * 0.25 };
  if (p === 'bite') by = { x: bx + Math.sin(now * 22) * 0.3, y: wy + 0.6 + Math.abs(Math.sin(now * 9)) * 1.2 };   // המצוף שוקע וקופץ
  if (by) {                                                                        // החוט והמצוף
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.moveTo(R.tx, R.ty); ctx.quadraticCurveTo((R.tx + by.x) / 2, Math.max(R.ty, by.y) + (p === 'bite' ? 0 : 2), by.x, by.y - 0.6); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(by.x, by.y - 0.7, 0.75, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(by.x, by.y - 0.7, 0.75, 0, Math.PI); ctx.fill();
    if (p === 'float' || p === 'bite') { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.25; const r = 1.4 + (now * 2 % 1) * 2; ctx.beginPath(); ctx.ellipse(by.x, wy + 0.5, r, r * 0.25, 0, 0, Math.PI * 2); ctx.stroke(); }   // טבעות במים
  }
  if (p === 'reel') {                                                              // הדג עף מהמים אל הסירה, מתפתל
    const k = Math.min(1, B.t / FISH.reelT), fx = lerp(bx, boatStern(o) + BOAT.len * 0.5, k), fy = lerp(wy, boatKeelY(o) - BOAT.h - 2, k) - Math.sin(Math.PI * k) * 12;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.18; ctx.beginPath(); ctx.moveTo(R.tx, R.ty); ctx.lineTo(fx, fy - 1.2); ctx.stroke();
    drawBigFish(fx, fy, Math.sin(now * 25) * 0.5 - 1.2 + k * 1.4, B.col || (B.col = ['#fb923c', '#facc15', '#38bdf8', '#f472b6'][Math.floor(Math.random() * 4)]));
  }
  if (p === 'caught' && B.t < 0.9) drawBigFish(boatStern(o) + BOAT.len * 0.5, boatKeelY(o) - BOAT.h - 2 - Math.abs(Math.sin(B.t * 14)) * 1.5, Math.sin(B.t * 20) * 0.6, B.col || '#fb923c');   // מקפץ בסירה
  if (p === 'caught' && B.t >= 0.9) B.col = null;
}
function drawRod(R) {
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(R.bx - (R.tx - R.bx) * 0.12, R.by - (R.ty - R.by) * 0.12); ctx.lineTo(R.tx, R.ty); ctx.stroke();
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(R.bx + (R.tx - R.bx) * 0.06, R.by + (R.ty - R.by) * 0.06, 0.55, 0, Math.PI * 2); ctx.fill();   // הגלגלת
}
function drawBigFish(x, y, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 3.0, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(-4.4, -1.5); ctx.lineTo(-4.4, 1.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(0.3, -0.5, 1.6, 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(1.7, -0.35, 0.33, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoatFront(o) {
  drawBoatHull(o, false);
  const kd = boatKeelY(o);
  if (kd > GROUND + 0.5) {                                                        // הסירה צפה – המים מכסים קצת את התחתית
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#38bdf8'; waterPath(boatPool(o), GROUND + 40); ctx.clip();
    ctx.fillRect(boatStern(o) - 2, waterY(), BOAT.len + 4, 3); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.35;
    const t = performance.now() / 1000; for (const dx of [-1.5, BOAT.len + 1.5]) { ctx.beginPath(); ctx.ellipse(boatStern(o) + dx, waterY() + 0.4, 1.6 + Math.sin(t * 3) * 0.3, 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  drawJumpingFish(o);
  drawFishing(o);
  drawBoatTalk(o);
}
function drawBoatHull(o, inner) {                                                 // סירת עץ: דופן מעוגלת, קרשים, שפה עליונה, משוטים
  const now = performance.now() / 1000, shake = !boat && !o.waving && o.c === 0 && o.mode !== 'fish' ? Math.sin(now * 30) * 0.22 : 0;   // החבר דוחף לבד – הסירה רק רועדת
  const x0 = boatStern(o) + shake, L = BOAT.len, kb = boatKeelY(o), top = kb - BOAT.h;
  const m = boatMid(o); let d = -1e9; for (const [l, r] of sandRanges(o)) d = Math.max(d, Math.min(m - l, r - m));
  const kw = Math.max(0, Math.min(1, (6 - d) / 12)), tilt = (1 - Math.abs(kw * 2 - 1)) * -0.06;   // בשפה – נוטה קצת
  ctx.save(); ctx.translate(x0 + L / 2, kb); ctx.rotate(tilt); ctx.translate(-(x0 + L / 2), -kb);
  if (inner) {
    ctx.fillStyle = '#7c4a1e'; ctx.beginPath(); ctx.moveTo(x0 - 1, top + 0.4); ctx.lineTo(x0 + L + 1.5, top - 0.6); ctx.lineTo(x0 + L - 1, top + 2.2); ctx.lineTo(x0 + 1, top + 2.6); ctx.closePath(); ctx.fill();   // פנים הסירה
    const rowing = boat && boat.o === o && boat.phase === 'row';                   // משוטים
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    for (const [ox, ph] of [[L * 0.35, 0], [L * 0.72, 0.4]]) {
      const a = rowing ? 0.5 + Math.sin(now * 4 + ph) * 0.45 : 0.15, hx = x0 + ox, hy = top + 0.5;
      ctx.beginPath(); ctx.moveTo(hx - Math.cos(a) * 4, hy - Math.sin(a) * 3); ctx.lineTo(hx + Math.cos(a) * 9, hy + Math.sin(a) * 6 + 2); ctx.stroke();
      ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * 9, hy + Math.sin(a) * 6 + 2, 1.8, 0.6, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(0, top, 0, kb);
  g.addColorStop(0, '#b45309'); g.addColorStop(1, '#78350f');
  ctx.fillStyle = g; ctx.beginPath();                                             // הדופן: ירכתיים ישרים, חרטום מורם ומחודד
  ctx.moveTo(x0 - 1, top); ctx.lineTo(x0 + L + 2.5, top - 1.2);
  ctx.quadraticCurveTo(x0 + L + 1, kb - 1.5, x0 + L - 3, kb);
  ctx.lineTo(x0 + 2, kb); ctx.quadraticCurveTo(x0 - 0.2, kb - 1, x0 - 1, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(66,32,6,.45)'; ctx.lineWidth = 0.25;                  // קרשים
  for (const f of [0.38, 0.7]) { ctx.beginPath(); ctx.moveTo(x0 - 0.4, lerp(top, kb, f)); ctx.lineTo(x0 + L + 1.2 - f * 2.5, lerp(top - 1.1, kb, f) - 0.2); ctx.stroke(); }
  ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.moveTo(x0 - 1.2, top - 0.5); ctx.lineTo(x0 + L + 2.8, top - 1.7); ctx.lineTo(x0 + L + 2.6, top - 0.8); ctx.lineTo(x0 - 1.2, top + 0.5); ctx.closePath(); ctx.fill();   // השפה העליונה
  ctx.fillStyle = '#422006'; for (const f of [0.15, 0.5, 0.85]) { ctx.beginPath(); ctx.arc(x0 + L * f, lerp(top, top - 1.1, f) + 0.05, 0.25, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawBoatTalk(o) {
  const B = boat && boat.o === o ? boat : null, F = friendSpot(o), by = F.y - 20;
  if (!B) {
    if (o.waving) { if (F.x < viewR() + 4 && F.x > viewL() - 6) drawBubble('Bye! 👋', F.x, by, { tail: -1, size: 3.4 }); }
    else if (F.alone && F.x < W - 6) drawBubble('Ugh! Too heavy!', F.x, by, { tail: -1, size: 3.4 });
    return;
  }
  const p = B.phase, say = (txt, opt) => drawBubble(txt, F.x, by, Object.assign({ tail: -1, color: '#1d4ed8' }, opt));
  if (o.mode === 'fish') {                                                         // דייג
    if (p === 'jumpWait') say("Jump in! Let's go fishing!", { age: B.t, size: 3.6 });
    if (p === 'row' && B.t < 1.6) say(o.c === 0 ? 'Row, row! 🚣' : 'Nice! More fish ahead!', { age: B.t, size: 3.6, color: '#111827' });
    if (p === 'fishAsk' || p === 'throwWait' && B.t < 1.5) say("Lots of fish! Throw the line!", { age: p === 'fishAsk' ? B.t : B.t + FISH.askT, size: 3.6 });
    if (p === 'float' && B.early > 0) say('Wait for the bite!', { age: 1.4 - B.early, size: 3.6, color: '#b91c1c' });
    if (p === 'bite') { say('A bite! Pull!', { age: B.t, size: 3.8, color: '#b91c1c' }); drawBubble('!', fishBobX(), waterY() - 6, { age: B.t, size: 4.5, color: '#b91c1c' }); }
    if (p === 'caught') say('Nice catch! 🐟', { age: B.t, size: 3.8, color: '#15803d' });
    if (p === 'gone') say('Oh no! It got away!', { age: B.t, size: 3.6, color: '#b91c1c' });
    if (labelsVisible()) {
      if (p === 'jumpWait') label('JUMP', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
      if (p === 'throwWait') label('THROW', PLAYER.x + 6, GROUND - 26, 4, '#fde047', '#1e293b');
      if (p === 'bite') label('PULL', PLAYER.x + 6, GROUND - 26, 4, '#fde047', '#1e293b');
    }
    return;
  }
  if (p === 'ask') say('Can you help me push?', { age: B.t, size: 3.8 });
  if (p === 'greet') say('Hi! My boat is stuck in the sand.', { age: B.t, size: 3.6 });
  if (p === 'yesWait') say('Can you help me?', { age: B.t, size: 3.8 });
  if (p === 'great') say("Great! Let's push together!", { age: B.t, size: 3.6 });
  if (p === 'farewell') {
    if (B.t < BOAT.thanksT + 0.3) drawBubble('Thanks for your help! See you!', Math.max(F.x, viewL() + 26), by, { tail: -1, color: '#1d4ed8', age: B.t, size: 3.6 });   // החבר בקצה המסך – הבועה נשארת בפנים
    if (B.t >= BOAT.thanksT) drawBubble('Bye! 👋', PLAYER.x + 3, GROUND - 20, { tail: 1, size: 3.6, age: B.t - BOAT.thanksT });
  }
  if (p === 'hi') say("Stuck again! Let's push!", { age: B.t, size: 3.6 });
  if (p === 'wait' && B.n > 0) say('Again!', { age: B.idle, size: 3.8 });
  if (p === 'push') say(B.n === BOAT.pushes - 1 ? 'Yes!' : 'Hup!', { age: B.t, size: 3.6, color: '#111827' });
  if (p === 'jumpWait' || (p === 'friendIn' && B.t > 0.6)) say('Jump in!', { age: p === 'jumpWait' ? B.t + 0.3 : 0 });
  if (p === 'row' && B.t < 1.6) say('Row, row! 🚣', { age: B.t, size: 3.6, color: '#111827' });
  if (p === 'wave') say('Whoa! A big wave!', { age: B.t, size: 3.6, color: '#b91c1c' });
  if (p === 'stuck') say('Oh no! Stuck!', { age: B.t, size: 3.6, color: '#b91c1c' });
  if (labelsVisible()) {
    if (p === 'wait') label('PUSH', boatStern(o) - 3, GROUND - 24, 4, '#fde047', '#1e293b');
    if (p === 'yesWait') label('YES', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
    if (p === 'jumpWait') label('JUMP', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
  }
}
