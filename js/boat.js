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

const BOAT = { shore: 72, sail: 230, isl: 50, islands: 0,   /* בלי אי – שטים ישר לחוף השני */ len: 28, h: 6.5, bx0: 30, pushes: 1, step: 30, pushT: 1.4, greetT: 2.6, greatT: 2.0, thanksT: 2.7, byeT: 1.4,
               askT: 1.6, stepT: 0.5, stepDX: 7, hiT: 1.3, boardT: 0.7, boardDX: 13, row: 26, waveT: 1.4, waveAt: 24, stuckT: 0.7,
               outT: 0.7, landT: 0.75, landDX: 21, hint: 3.5, hintEvery: 6, coins: 6 };
let boat = null;   // { o, phase, t, idle, hinted, n }
// FISHING (o.mode === 'fish'): הסירה כבר במים ליד החוף והחבר יושב בה – JUMP פנימה, שטים, ובכל מקום דייג:
// THROW – זורקים חכה. המצוף צף ... שוקע (נשיכה) – PULL ומושכים דג. מוקדם מדי – "Wait for the bite!", מאוחר מדי – הדג בורח וזורקים שוב.
// אחרי הנשיכה הדג נלחם (fight): הוא מושך את הנינג'ה לחרטום, וצריך עוד PULL-ים (בסך הכול pulls). לא מושכים בזמן – נופלים למים (fall),
// החבר צועק "Swim!" – SWIM ושוחים חזרה לסירה (swimBack → climbIn). לא שוחים – שוקעים, לב אחד, והחבר מושה אותו (sink → rescue → climbIn).
const FISH = { spots: 2, first: 70, gap: 150, tail: 90, askT: 1.3, castT: 0.75, floatMin: 2.6, floatMax: 4.2, biteT: 4.5, earlyOk: 1.2, reelT: 1.0, caughtT: 1.5, goneT: 1.2, cast: 36, coins: 2,
               hookD: 11, pulls: 3, drag0: 0.2, dragT: 4.0, pullBack: 0.5, fightHint: 2.0, lean: 7, fallT: 0.9, swimWaitT: 6, swimT: 1.8, sinkT: 1.3, rescueT: 1.5, climbT: 0.7 };
const FISHING = ['fishAsk', 'throwWait', 'cast', 'float', 'bite', 'fight', 'reel', 'caught', 'gone', 'fall', 'swimWait', 'swimBack', 'sink', 'rescue', 'climbIn'];
const FISH_WET = ['swimWait', 'swimBack', 'sink', 'rescue'];                         // הנינג'ה בתוך המים
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
  if (B.phase === 'wait' || B.phase === 'yesWait' || B.phase === 'jumpWait' || B.phase === 'throwWait' || B.phase === 'bite' || B.phase === 'fight' || B.phase === 'swimWait') {   // מחכים למילה – אחרי שתיקה ארוכה המשחק אומר אותה
    B.idle += dt;
    const w = B.phase === 'wait' ? 'push' : B.phase === 'yesWait' ? 'yes' : B.phase === 'jumpWait' ? 'jump' : B.phase === 'throwWait' ? 'throw' : B.phase === 'swimWait' ? 'swim' : 'pull';
    const sw = w === 'jump' ? 'jump in' : w;                                     // בסירה מלמדים JUMP IN (גם JUMP לבד עובד)
    if (demo) { if (B.idle >= 0.9) { if (banner) banner.text = 'Say ' + sw.toUpperCase() + '!'; command(w, 'demo'); } }
    else if (B.phase === 'bite') { if (B.idle >= 2.2 && !B.hinted) { B.hinted++; sayWords([w], 1.2, B); } }   // בנשיכה – רמז מהר, החלון קצר
    else if (B.phase === 'fight') { if (B.idle >= FISH.fightHint && !B.fightHinted) { B.fightHinted = 1; sayWords([w], 1.2, B); } }   // הדג גורר – רמז אחד
    else if (B.phase === 'swimWait') {}                                           // החבר כבר צעק "Swim!"
    else if (B.idle >= BOAT.hint + B.hinted * BOAT.hintEvery) { B.hinted++; sayWords([sw], 1.6, B); }
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
    case 'cast': if (B.t >= FISH.castT) { go('float'); B.col = '#1e3a8a'; B.wait = FISH.floatMin + Math.random() * (FISH.floatMax - FISH.floatMin); sfx('splash'); burst(fishBobX(), waterY(), '#e0f2fe', 6, 12); } break;   // הדג שנושך – כחול כהה, בולט על המים הבהירים
    case 'float': if (B.early > 0) B.early -= dt; if (B.t >= B.wait) { const held = B.pullHeld; B.pullHeld = 0; go('bite'); sfx('splash'); burst(fishBobX(), waterY(), '#e0f2fe', 8, 16); if (held) boatPull(); } break;   // PULL שנאמר רגע לפני הנשיכה – מושכים מיד כשהיא מגיעה   // המצוף צף ... עד שהדג נושך
    case 'bite':
      if (Math.random() < dt * 5) burst(fishBobX(), waterY(), '#e0f2fe', 3, 10);    // המצוף קופץ ושוקע
      if (B.t >= FISH.biteT) { go('gone'); sfx('hit'); }                            // איחרנו – הדג ברח עם הפיתיון
      break;
    case 'fight':                                                                   // הדג מושך את הנינג'ה לחרטום
      B.drag += dt / FISH.dragT; if (B.yank > 0) B.yank -= dt;
      if (Math.random() < dt * 2.5) burst(fishBobX() + 2 + Math.random() * 4, waterY(), '#e0f2fe', 1, 8);
      if (B.drag >= 1) { go('fall'); sfx('wind'); shakeT = 0.2; }
      break;
    case 'fall': if (B.t >= FISH.fallT) { go('swimWait'); sfx('splash'); burst(fishBobX() - 4, waterY(), '#e0f2fe', 7, 15); shakeT = 0.25; flash = { text: '🗣️ Swim!', t: 1.6, size: 8 }; speak('swim'); } break;
    case 'swimWait':
      if (B.t >= FISH.swimWaitT && !demo) {                                         // לא שחה – שוקע ומאבד לב
        go('sink'); sfx('hit'); shakeT = 0.25;
        if (state === 'play' && !shieldSave() && !dragonSave()) {
          hits++; if (typeof voiceMark === 'function') voiceMark('hit');
          if (isFinite(lives)) { lives--; renderHud(); if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; } }
          renderHud();
        }
      }
      break;
    case 'swimBack': if (Math.random() < dt * 3) burst(PLAYER.x + 4 + boatDX() + 4, waterY(), '#e0f2fe', 1, 6); if (B.t >= FISH.swimT) go('climbIn'); break;
    case 'sink': if (Math.random() < dt * 6) particles.push({ x: PLAYER.x + 5 + boatDX(), y: waterY() + 6, vx: 0, vy: -8, g: -4, life: 0.8, color: 'rgba(255,255,255,.8)', size: 0.7 }); if (B.t >= FISH.sinkT) go('rescue'); break;
    case 'rescue': if (B.t >= FISH.rescueT) go('climbIn'); break;                   // החבר מושה אותו בחזרה
    case 'climbIn': if (B.t >= FISH.climbT) { go('gone'); burst(PLAYER.x + 4, boatDeck(o), '#e0f2fe', 6, 12); } break;   // הדג ברח בינתיים
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
  if (FISHING.includes(p) && !['fight', 'reel', 'caught', 'gone', 'fishAsk', 'throwWait', 'cast', 'float', 'bite'].includes(p)) return fishWetY() - GROUND;
  if (['row', 'wave', 'stuck'].includes(p) || FISHING.includes(p)) return d;
  if (p === 'out') return d * (1 - Math.min(1, B.t / BOAT.outT));
  if (p === 'land') return d * (1 - Math.min(1, B.t / BOAT.landT));
  return 0;
}

// דייג: כמה הנינג'ה זז קדימה מהמושב (נגרר לחרטום / במים) ובאיזה גובה כף הרגל שלו כשהוא במים
const fishEase = q => q * q * (3 - 2 * q);
function boatDX() {
  if (!boat || boat.o.mode !== 'fish') return 0;
  const B = boat, p = B.phase, k = T => Math.min(1, B.t / T), wx = FISH.cast - 6;
  if (p === 'fight') return B.drag * FISH.lean - Math.max(0, B.yank || 0) * 3;
  if (p === 'fall') return lerp(FISH.lean, wx, fishEase(k(FISH.fallT)));
  if (p === 'swimWait' || p === 'sink') return wx + Math.sin(performance.now() / 1000 * 1.5) * 0.4;
  if (p === 'swimBack') return lerp(wx, BOAT.len - 1, fishEase(k(FISH.swimT)));
  if (p === 'rescue') return lerp(wx, BOAT.len - 1, fishEase(k(FISH.rescueT)));
  if (p === 'climbIn') return lerp(BOAT.len - 1, 0, fishEase(k(FISH.climbT)));
  return 0;
}
function fishWetY() {                                                             // גובה הרגליים כשהנינג'ה מחוץ למושב
  const B = boat, wy = waterY(), deck = boatDeck(B.o), k = T => Math.min(1, B.t / T), now = performance.now() / 1000;
  switch (B.phase) {
    case 'fall': { const q = k(FISH.fallT); return lerp(deck, wy + 9, q * q) - Math.sin(Math.PI * Math.min(1, q * 1.3)) * 6; }
    case 'swimWait': return wy + 9 + Math.sin(now * 3) * 0.5;                       // צף – הראש מעל המים
    case 'swimBack': return GROUND + 1.5;                                          // שוחה על פני המים
    case 'sink': return wy + 9 + fishEase(k(FISH.sinkT)) * 11;
    case 'rescue': { const q = k(FISH.rescueT); return q < 0.5 ? lerp(wy + 20, wy + 8, fishEase(q * 2)) : wy + 8; }
    case 'climbIn': { const q = k(FISH.climbT); return lerp(wy + 7, deck, fishEase(q)) - Math.sin(Math.PI * q) * 6; }
  }
  return deck;
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
  if (boat.phase === 'bite') { boat.phase = 'fight'; boat.t = 0; boat.idle = 0; boat.n = 1; boat.drag = FISH.drag0; boat.yank = 0.3; boat.fightHinted = 0; burst(fishBobX(), waterY(), '#e0f2fe', 6, 16); sfx('splash'); }   // הדג על הקרס – ועכשיו הוא נלחם
  else if (boat.phase === 'fight') {                                              // עוד משיכה: הנינג'ה נזרק אחורה והדג מתקרב
    boat.n++; boat.idle = 0; boat.yank = 0.3; boat.drag = Math.max(0, boat.drag - FISH.pullBack); sfx('swish'); burst(fishBobX(), waterY(), '#e0f2fe', 4, 12);
    if (boat.n >= FISH.pulls) { boat.phase = 'reel'; boat.t = 0; sfx('splash'); }
  }
  else if (boat.phase === 'float') {
    if (boat.wait - boat.t <= FISH.earlyOk) { boat.pullHeld = 1; earlyWord = null; }   // כמעט נשיכה – לא פוסלים: ה-PULL נשמר ומושך ברגע שהדג נושך
    else boat.early = 1.4;                                                        // מוקדם מדי – מחכים לנשיכה
  }
  return true;
}
function boatSwim() {                                                             // דייג: נפל למים – SWIM שוחה חזרה לסירה
  if (!boat || boat.o.mode !== 'fish' || !FISHING.includes(boat.phase)) return false;
  if (boat.phase === 'swimWait') { boat.phase = 'swimBack'; boat.t = 0; boat.idle = 0; sfx('splash'); }
  return true;
}
function boatJump() {                                                             // true = ה-JUMP טופל כאן
  if (!boat) return false;
  if (boat.phase === 'jumpWait') { boat.phase = 'board'; boat.t = 0; sfx('jump'); }
  return true;
}
function boatExpected() {
  if (!boat) return null;
  return boat.phase === 'wait' ? ['push'] : boat.phase === 'yesWait' ? ['yes'] : boat.phase === 'jumpWait' ? ['jump'] : boat.phase === 'throwWait' ? ['throw'] : boat.phase === 'bite' || boat.phase === 'fight' || (boat.phase === 'float' && boat.wait - boat.t <= FISH.earlyOk) ? ['pull'] : boat.phase === 'swimWait' ? ['swim'] : [];
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
  if (p === 'fall') return poseAir(B.t < FISH.fallT * 0.4);                       // עף מהסירה למים
  if (p === 'swimWait' || p === 'sink') { P = poseFly(now * (p === 'sink' ? 6 : 4)); return P; }   // דורך מים / שוקע – מנופף בידיים
  if (p === 'swimBack') return poseSwim(now);
  if (p === 'rescue') { P = poseIdle(now); P.arms = [[2.5, 2.9], [2.4, 2.8]]; return P; }   // ידיים למעלה – החבר מושך אותו
  if (p === 'climbIn') return poseAir(B.t < FISH.climbT / 2);
  if (FISHING.includes(p)) {                                                       // מחזיק חכה בשתי ידיים
    P = sitLegs(poseIdle(now));
    if (p === 'fight') {                                                           // הדג גורר: נוטה קדימה, ידיים מתוחות. במשיכה – נזרק אחורה
      const y = Math.max(0, B.yank || 0) / 0.3, sh = Math.sin(now * 30) * 0.04;
      P.lean = lerp(0.3 + B.drag * 0.45, -0.3, y) + sh; P.arms = [[lerp(1.2, 1.9, y), lerp(0.9, 2.2, y)], [lerp(1.1, 1.8, y), lerp(0.8, 2.1, y)]];
      if (B.drag > 0.55) P.legs = [[1.1, 0.1], [1.25, 0.2]];                       // הרגליים מתרוממות מהמושב
    } P.arms = [[1.05, 0.55], [0.95, 0.45]]; P.lean = 0.05;
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
    if (p === 'fight') { P.arms = [[2.4, 2.9], [2.5, 3.0 + Math.sin(now * 12) * 0.3]]; }   // מעודד
    if (p === 'fall' || p === 'swimWait' || p === 'sink') { P.lean = 0.25; P.arms[1] = [1.5, 1.3]; P.arms[0] = [1.4, 1.2]; }   // נבהל ומושיט יד
    if (p === 'swimBack' || p === 'rescue' || p === 'climbIn') { P.lean = 0.45; P.arms = [[1.3, 1.5], [1.2, 1.4]]; }   // מושך אותו פנימה
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
  if (o.mode === 'fish') drawClearWater(o, P, bottom, t);                          // דייג: מים צלולים עם עומק – רואים את הקרס והדג
  else {
    const g = ctx.createLinearGradient(0, wy, 0, GROUND + 30);
    g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = g; waterPath(P, bottom); ctx.fill();
    ctx.save(); waterPath(P, bottom); ctx.clip(); drawRiverLife(o, P, t); ctx.restore();   // קצת דגים וצמחים מתחת למים
  }
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
const BED_Y = x => GROUND + 22.5 + Math.sin(x * 0.07) * 1.2 + Math.sin(x * 0.19 + 1) * 0.5;   // גובה הקרקעית בנקודה x
function drawRiverBed(P, bottom, t) {
  const L = Math.max(P.x - 2, viewL() - 6), R = Math.min(P.x + P.w + 2, viewR() + 6);
  const sg = ctx.createLinearGradient(0, GROUND + 21, 0, GROUND + 30);               // חול
  sg.addColorStop(0, '#d9c38f'); sg.addColorStop(1, '#a8895a');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(L, bottom);
  for (let x = L; x <= R; x += 1.5) ctx.lineTo(x, BED_Y(x));
  ctx.lineTo(R, bottom); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(120,96,60,.35)';                                          // חלוקים קטנים
  for (let i = Math.floor((L - P.x) / 4.3); P.x + i * 4.3 < R; i++) { const x = P.x + i * 4.3 + hash(i) * 2; ctx.beginPath(); ctx.ellipse(x, BED_Y(x) + 1.6 + hash(i * 1.7) * 3, 0.6 + hash(i * 3.1) * 0.5, 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
  // כל ~11 יחידות: אבן גדולה, צמח ארוך (אצה), שיח עלים רחבים, או עשב קצר – לפי hash קבוע (לא מרצד)
  const step = 11;
  for (let i = Math.floor((L - P.x - 12) / step); P.x + i * step < R + 12; i++) {
    const x = P.x + 6 + i * step + hash(i * 9.1) * 6, y = BED_Y(x), k = hash(i * 4.7), sw = Math.sin(t * 1.2 + i * 1.3);
    if (x < P.x + 4 || x > P.x + P.w - 4) continue;
    if (k < 0.3) {                                                                  // אבנים: אחת גדולה ועוד קטנות לידה
      const n = 1 + Math.floor(hash(i * 2.3) * 3);
      for (let j = 0; j < n; j++) {
        const rx = x + (j - (n - 1) / 2) * 2.6 + hash(i + j * 5.5) * 0.8, rw = (j === 0 ? 2.4 : 1.4) + hash(i * 3 + j) * 0.9, rh = rw * (0.55 + hash(i * 7 + j) * 0.2);
        const shade = ['#64748b', '#78716c', '#57534e', '#6b7280'][Math.floor(hash(i * 11 + j) * 4)];
        ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(rx, BED_Y(rx) + 0.4 - rh * 0.55, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(rx - rw * 0.25, BED_Y(rx) + 0.4 - rh * 0.95, rw * 0.5, rh * 0.3, -0.2, 0, Math.PI * 2); ctx.fill();   // אור מלמעלה
        ctx.fillStyle = 'rgba(34,197,94,.35)'; ctx.beginPath(); ctx.ellipse(rx + rw * 0.3, BED_Y(rx) + 0.4 - rh * 0.2, rw * 0.45, rh * 0.25, 0, 0, Math.PI * 2); ctx.fill();   // אצה ירוקה על האבן
      }
    } else if (k < 0.55) {                                                           // אצה ארוכה: כמה סרטים מתנופפים
      for (let b = 0; b < 4; b++) {
        const bx = x + (b - 1.5) * 0.9, h = 9 + hash(i * 5 + b) * 8, s = sw * 1.8 + Math.sin(t * 1.7 + b) * 0.6;
        ctx.strokeStyle = ['#15803d', '#16a34a', '#166534', '#22c55e'][b]; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, y + 0.5); ctx.bezierCurveTo(bx + s * 0.3, y - h * 0.35, bx - s * 0.4, y - h * 0.7, bx + s, y - h); ctx.stroke();
      }
    } else if (k < 0.78) {                                                           // שיח עלים רחבים
      for (let b = 0; b < 5; b++) {
        const a = -Math.PI / 2 + (b - 2) * 0.42 + sw * 0.08, len = 4 + hash(i * 3 + b) * 2.5;
        ctx.save(); ctx.translate(x, y + 0.3); ctx.rotate(a);
        ctx.fillStyle = b % 2 ? '#059669' : '#10b981';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -1.1, len, 0); ctx.quadraticCurveTo(len * 0.5, 1.1, 0, 0); ctx.fill();
        ctx.restore();
      }
    } else {                                                                         // עשב קצר ודק
      ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 0.4; ctx.lineCap = 'round';
      for (let b = 0; b < 6; b++) { const bx = x + (b - 2.5) * 0.6, h = 2.5 + hash(i * 13 + b) * 2.5; ctx.beginPath(); ctx.moveTo(bx, y + 0.4); ctx.quadraticCurveTo(bx + sw * 0.3, y - h * 0.6, bx + sw * 0.6 + (b - 2.5) * 0.25, y - h); ctx.stroke(); }
    }
  }
}
function drawClearWater(o, P, bottom, t) {
  const wy = waterY(), bed = GROUND + 27;
  ctx.save(); waterPath(P, bottom); ctx.clip();
  const g = ctx.createLinearGradient(0, wy, 0, bed + 6);                          // בהיר ושקוף למעלה, כחול עמוק למטה
  g.addColorStop(0, '#a5f3fc'); g.addColorStop(0.35, '#38bdf8'); g.addColorStop(1, '#075985');
  ctx.fillStyle = g; ctx.fillRect(P.x - 2, wy - 1, P.w + 4, bottom - wy + 2);
  drawRiverBed(P, bottom, t);                                                      // קרקעית: חול גלי, אבנים וצמחי מים
  for (let i = 0; i < 7; i++) {                                                     // קרני אור מהשמש שנכנסות למים
    const x = viewL() + 8 + i * 24 + Math.sin(t * 0.6 + i * 1.9) * 3, w = 3 + (i % 3) * 1.5;
    const rg = ctx.createLinearGradient(0, wy, 0, bed); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x + w, wy); ctx.lineTo(x + w - 9, bed); ctx.lineTo(x - 11, bed); ctx.closePath(); ctx.fill();
  }
  drawRiverLife(o, P, t, true);                                                   // רק הדגים – הצמחים כבר על הקרקעית
  const dg = ctx.createLinearGradient(0, wy, 0, bed + 4);                         // עומק: מה שרחוק מפני המים קצת דהוי וכחול
  dg.addColorStop(0, 'rgba(8,47,73,0)'); dg.addColorStop(0.4, 'rgba(8,47,73,.12)'); dg.addColorStop(1, 'rgba(8,47,73,.45)');
  ctx.fillStyle = dg; ctx.fillRect(P.x - 2, wy - 1, P.w + 4, bottom - wy + 2);
  drawFishUnder(o);                                                               // אחרי הגוון של העומק – הקרס והדג נשארים חדים
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(P.x - 2, wy - 0.2, P.w + 4, 0.6);   // ברק דק על פני המים
  ctx.restore();
}
function drawRiverLife(o, P, t, fishOnly) {                                                 // מעט צמחי מים שמתנופפים מהקרקעית, ודגים ששוחים לאט הלוך ושוב
  const bed = GROUND + 27;
  if (!fishOnly) for (let i = 0, x = P.x + 22; x < P.x + P.w - 22; i++, x += 38 + hash(i * 3.3) * 22) {
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
    if (fishOnly && boat && boat.o === o && ['float', 'bite', 'fight', 'gone'].includes(boat.phase) && Math.abs(x - fishBobX() - 2) < 14) continue;   // ליד הקרס – רק הדג שנושך, שלא יתבלבלו
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
  const h = figHand(PLAYER.x + 4 + boatDX(), deck, 1, 1, boatPose(poseIdle(now)), 1);
  let a = -0.95;                                                                   // זווית החכה: למעלה-קדימה
  if (B && B.o === o) {
    if (B.phase === 'cast') { const k = Math.min(1, B.t / FISH.castT); a = k < 0.45 ? lerp(-0.95, -2.2, k / 0.45) : lerp(-2.2, -0.7, Math.min(1, (k - 0.45) / 0.3)); }
    if (B.phase === 'float' || B.phase === 'gone') a = -0.7;
    if (B.phase === 'bite') a = -0.62 + Math.sin(now * 18) * 0.05;               // הדג מושך – החכה רועדת
    if (B.phase === 'fight') a = -0.35 + B.drag * 0.25 - Math.max(0, B.yank || 0) * 2 + Math.sin(now * 20) * 0.06;   // החכה מתכופפת אל המים
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
  if (['fall', 'swimWait', 'swimBack', 'sink', 'rescue', 'climbIn'].includes(B.phase)) { drawWetCover(o); return; }   // נפל למים – בלי חכה
  const R = fishRod(o); drawRod(R);
  const p = B.phase, bx = fishBobX();
  if (p === 'fight') {                                                             // חוט מתוח מקצה החכה אל המים
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(R.tx, R.ty); ctx.lineTo(bx, wy + 0.3); ctx.stroke();
    drawFightMeter();
  }
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
function drawFightMeter() {                                                     // כמה משיכות נשארו (דגים קטנים) ומד המתח
  const B = boat, cx = PLAYER.x + 6, cy = GROUND - 34;
  for (let i = 0; i < FISH.pulls; i++) {
    const x = cx + (i - (FISH.pulls - 1) / 2) * 5, on = i < B.n;
    ctx.globalAlpha = on ? 1 : 0.35; drawBigFish(x, cy, 0, on ? '#22c55e' : '#e2e8f0'); ctx.globalAlpha = 1;
  }
  const w = 16, d = Math.min(1, B.drag);
  ctx.fillStyle = 'rgba(15,23,42,.55)'; roundRect(cx - w / 2, cy + 3, w, 1.6, 0.8); ctx.fill();
  ctx.fillStyle = d > 0.7 ? '#ef4444' : d > 0.4 ? '#f59e0b' : '#22c55e'; roundRect(cx - w / 2, cy + 3, Math.max(0.8, w * d), 1.6, 0.8); ctx.fill();
}
function drawWetCover(o) {                                                         // הנינג'ה במים – מים שקופים מכסים את החלק התחתון שלו
  const x = PLAYER.x + 4 + boatDX(), wy = waterY(), t = performance.now() / 1000;
  ctx.save(); waterPath(boatPool(o), GROUND + 40); ctx.clip();
  const g = ctx.createLinearGradient(0, wy, 0, GROUND + 33); g.addColorStop(0, 'rgba(165,243,252,.45)'); g.addColorStop(0.35, 'rgba(56,189,248,.55)'); g.addColorStop(1, 'rgba(7,89,133,.8)');
  ctx.fillStyle = g; ctx.fillRect(viewL() - 2, wy, viewR() - viewL() + 4, 40);   // כל המים, באותם צבעים – בלי מלבן שבולט
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.35;
  const r = 2.5 + (t * 2 % 1) * 2; ctx.beginPath(); ctx.ellipse(x + 0.5, wy + 0.4, r, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();   // טבעות סביבו
}
// מתחת למים: החוט יורד מהמצוף אל הקרס עם תולעת, והדג מתקרב, מסתובב ונושך. בזמן המאבק – הדג על הקרס מושך
function fishUnderPos(B) {                                                        // מרכז הדג. הפה בקצה הקדמי (3 יחידות לכיוון הפנים)
  const hx = fishBobX(), hy = waterY() + FISH.hookD, now = performance.now() / 1000;
  if (B.phase === 'float') {
    const k = Math.min(1, B.t / B.wait), r = Math.max(0, (0.8 - k) / 0.8);             // ב-80% הראשונים מתקרב ומסתובב, ואז מרחרח את הפיתיון
    if (r > 0) return { x: hx + 3.4 + r * 26 + Math.sin(k * 11) * 3 * r, y: hy + Math.sin(k * 7 + 1) * 5 * r, dir: Math.cos(k * 11) * r > 0.15 ? 1 : -1, a: Math.sin(now * 8) * 0.06 };
    return { x: hx + 3.4 + Math.abs(Math.sin(now * 7)) * 1.2, y: hy + Math.sin(now * 3) * 0.2, dir: -1, a: Math.sin(now * 8) * 0.05 };   // נוגע ומתרחק – מנקר בפיתיון
  }
  if (B.phase === 'bite') return { x: hx + 2.8 + Math.sin(now * 20) * 0.35, y: hy + Math.sin(now * 13) * 0.25, dir: -1, a: Math.sin(now * 25) * 0.12 };   // הפיתיון בפה
  if (B.phase === 'fight') return { x: hx + 5 + B.drag * 6 + Math.sin(now * 9) * 1.2, y: hy + 1.5 + B.drag * 4 + Math.sin(now * 6) * 1, dir: -1, a: Math.sin(now * 22) * 0.3 };   // נמשך אחורה ומשתולל, הקרס בפה
  if (B.phase === 'gone' && B.t < 1) return { x: hx + 4 + B.t * 40, y: hy + 1 + B.t * 6, dir: 1, a: Math.sin(now * 25) * 0.2 };   // בורח עם הפיתיון
  return null;
}
function fishMouth(F) { return { x: F.x + F.dir * 2.9 * Math.cos(F.a), y: F.y + 2.9 * Math.sin(F.a) }; }   // drawBigFish: הפה ב-(3,0), מסובב ב-a והפוך לפי הכיוון
function drawHook(x, y, bait, t) {                                               // (x,y) = כיפוף הקרס, שם יושב הפיתיון
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 0.8, y - 1.6); ctx.lineTo(x + 0.8, y); ctx.arc(x, y, 0.8, 0, Math.PI, false); ctx.lineTo(x - 0.8, y - 0.6); ctx.stroke();
  if (bait) { ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(x + 0.6, y - 0.9); ctx.quadraticCurveTo(x - 0.6 + Math.sin(t * 6) * 0.5, y + 0.2, x + 0.2, y + 1.9 + Math.sin(t * 5) * 0.2); ctx.stroke(); }   // תולעת מתפתלת
}
function drawFishUnder(o) {
  const B = boat && boat.o === o ? boat : null;
  if (!B || !['float', 'bite', 'fight', 'gone'].includes(B.phase)) return;
  const t = performance.now() / 1000, hx = fishBobX(), wy = waterY(), hy = wy + FISH.hookD, F = fishUnderPos(B), col = B.col || '#fb923c';
  const inMouth = F && (B.phase === 'bite' || B.phase === 'fight'), M = F ? fishMouth(F) : null;
  const hook = inMouth ? { x: M.x + 0.3, y: M.y + 0.2 } : { x: hx - 0.8, y: hy };   // בנשיכה הקרס בפה של הדג
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.15;                  // החוט מתחת למים
  ctx.beginPath(); ctx.moveTo(hx, wy + 0.3); ctx.lineTo(hook.x + 0.8, hook.y - 1.6); ctx.stroke();
  drawHook(hook.x, hook.y, B.phase === 'float', t);                              // הקרס (עם תולעת לפני הנשיכה) – מאחורי הדג
  if (!F) return;
  ctx.save(); ctx.translate(F.x, F.y); ctx.scale(F.dir, 1);
  ctx.save(); ctx.rotate(F.a); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(0, 0, 3.0, 1.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();   // קו בהיר סביב – בולט במים
  drawBigFish(0, 0, F.a, col); ctx.restore();
  if (inMouth) {                                                                   // הפה סגור על הפיתיון: קצה התולעת מציץ החוצה
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(M.x + 0.4, M.y + 0.1); ctx.quadraticCurveTo(M.x - 0.6, M.y + 0.6 + Math.sin(t * 9) * 0.3, M.x - 0.3 + Math.sin(t * 7) * 0.4, M.y + 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(15,23,42,.6)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(M.x + 0.1, M.y + 0.15); ctx.lineTo(M.x + 1.1, M.y + 0.45); ctx.stroke();   // קו הפה
    if (Math.random() < 0.2) particles.push({ x: M.x, y: M.y - 1, vx: 0, vy: -6, g: -3, life: 0.6, color: 'rgba(255,255,255,.75)', size: 0.5 });   // בועות
  }
}
function drawRod(R) {
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(R.bx - (R.tx - R.bx) * 0.12, R.by - (R.ty - R.by) * 0.12); ctx.lineTo(R.tx, R.ty); ctx.stroke();
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(R.bx + (R.tx - R.bx) * 0.06, R.by + (R.ty - R.by) * 0.06, 0.55, 0, Math.PI * 2); ctx.fill();   // הגלגלת
}
function drawBigFish(x, y, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const fl = Math.sin(performance.now() / 1000 * 9 + x) * 0.25;                    // הסנפירים מנפנפים
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1.6, -1.0); ctx.lineTo(-1.3, -2.45 - fl * 0.3); ctx.quadraticCurveTo(-0.1, -2.3, 0.7, -1.35); ctx.closePath(); ctx.fill();   // סנפיר גב
  ctx.beginPath(); ctx.moveTo(-1.3, 1.1); ctx.lineTo(-1.5, 2.5); ctx.quadraticCurveTo(-0.3, 2.0, 0.4, 1.25); ctx.closePath(); ctx.fill();   // סנפיר בטן קטן
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(-1.6, -1.0); ctx.lineTo(-1.3, -2.45 - fl * 0.3); ctx.quadraticCurveTo(-0.1, -2.3, 0.7, -1.35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 3.0, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(-4.4, -1.5); ctx.lineTo(-4.4, 1.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(0.3, -0.5, 1.6, 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(1.7, -0.35, 0.33, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(0.9, 0.35); ctx.rotate(0.5 + fl);                      // סנפיר צד מאחורי הזימים
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-1.3, -0.9, -2.5, 0.0); ctx.quadraticCurveTo(-1.3, 0.9, 0, 0);
  ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.14; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.15; ctx.beginPath(); ctx.arc(1.0, 0, 1.0, -1.1, 1.1); ctx.stroke();   // קו הזימים
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
    if (p === 'fight') say(B.n === 1 ? "It's a big one! Pull!" : 'Pull! Pull!', { age: B.idle, size: 3.6, color: '#b91c1c' });
    if (p === 'fall') say('Whoa!', { age: B.t, size: 3.8, color: '#b91c1c' });
    if (p === 'swimWait') say('Swim! Swim back!', { age: B.t, size: 3.8, color: '#b91c1c' });
    if (p === 'swimBack') say('Good! Come on!', { age: B.t, size: 3.6, color: '#15803d' });
    if (p === 'rescue') say('I got you!', { age: B.t, size: 3.6 });
    if (labelsVisible()) {
      if (p === 'jumpWait') label('JUMP IN', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
      if (p === 'throwWait') label('THROW', PLAYER.x + 6, GROUND - 26, 4, '#fde047', '#1e293b');
      if (p === 'bite') label('PULL', PLAYER.x + 6, GROUND - 26, 4, '#fde047', '#1e293b');
      if (p === 'fight') label('PULL', PLAYER.x + 6, GROUND - 26, 4, '#fde047', '#1e293b');
      if (p === 'swimWait') label('SWIM', PLAYER.x + 4 + boatDX(), waterY() - 12, 4, '#fde047', '#1e293b');
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
    if (p === 'jumpWait') label('JUMP IN', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
  }
}

// הרישום של הסצנה – הבסיס מכיר אותה רק דרך הטבלה (scenes.js). כולל הציור
// סצנה אחת לשני שלבים: PUSH TOGETHER (דוחפים את הסירה עם החבר) ו-FISHING (אותה סירה במצב דיג – מכשול 'fishboat')
sceneAdd({
  type: 'boat', words: ['push together', 'fishing'], label: true,
  variants: { fishboat: { mode: 'fish' } }, variantOf: o => o.mode === 'fish' ? 'fishboat' : 'boat',
  listen: { 'push together': ['jump in', 'push', 'jump', 'yes'], fishing: ['jump in', 'jump', 'throw', 'pull', 'swim'] },   // אפשר להגיד גם JUMP IN
  active: () => !!boat,
  reset: () => { boat = null; },
  setup: boatSetup, afterGap: 0.8, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => boatStern(o) - BOAT.stepDX,                                          // ליד החבר שעומד מאחורי הסירה
  draw: drawBoatBack, drawFront: drawBoatFront,                                       // הדופן הקרובה של הסירה מעל היושבים
  update: boatUpdate, physics: boatPhysics, speed: boatSpeed, pose: boatPose,
  expected: boatExpected, auto: boatAuto,
  act: word => word === 'jump' ? boatJump() : word === 'throw' ? boatThrow() : word === 'swim' ? boatSwim() : word === 'yes' ? boatYes() : word === 'push' ? boatPush() : word === 'pull' ? boatPull() : false,
  intro: {
    'push together': { banner: 'PUSH with your friend, then JUMP in!', time: 14,
                       demo: () => { const o = { type: 'boat' }; boatSetup(o); o.x = PLAYER.x + PLAYER.w + BOAT.stepDX - BOAT.bx0; obstacles.push(o); } },   // מתחיל צמוד לסירה (boatUpdate מפעיל את ההדגמה)
    fishing: { banner: 'THROW the line, then PULL!', time: 16,
               demo: () => { const o = { type: 'boat', mode: 'fish' }; boatSetup(o); o.x = PLAYER.x + PLAYER.w + BOAT.stepDX - o.bx; obstacles.push(o); } }   // הסירה במים והחבר בתוכה
  }
});
