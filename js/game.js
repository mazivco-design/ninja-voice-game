/* ninja-voice-game – game.js
   מהלך המשחק: התחלה, סיום, מכשולים, פגיעות, עדכון כל פריים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מהלך המשחק
   ============================================================ */
// עוצרים את המיקרופון כשלא משחקים – כדי שסימן ההאזנה בדפדפן ייעלם
function stopAudio() {
  if (!audio) return;
  try { audio.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { audio.node.disconnect(); } catch (e) {}
  try { audio.ctx.close(); } catch (e) {}
  try { audio.rec.remove(); } catch (e) {}
  audio = null; seenWords = [];
  $('mic').className = '';
  dbg('mic', 'off');
}

async function play(m, idx) {
  if (!model) return;
  const words = m === 'stage' ? STAGES[idx || 0].words : m === 'journey' ? journeyWords(WORDS.length) : freeWords();   // במסע מקשיבים לכל המילים שנלמדו
  listenWords = words.includes('fly') && !words.includes('jump') ? [...words, 'jump'] : [...words];   // FLY צריך גם JUMP
  stopAudio();                      // מתחילים מחדש עם רשימת המילים של המשחק הזה
  const ok = await ensureAudio();   // נקרא ישירות מהלחיצה
  if (ok) startGame(m, idx);
}

function startGame(m, idx) {
  mode = m; stageIdx = idx || 0; cfg = LEVELS[diffKey];
  playWords = mode === 'stage' ? STAGES[stageIdx].words : freeWords();
  banked = false; resetAct(); sinkT = 0; coinsFlying = 0; dragonUsed = false; petX = 0; runGain = 0; segSettled = true;
  world = m === 'stage' ? PAIR_WORLD[Math.floor((idx || 0) / 3)] : 0;
  speed = cfg.speed; score = 0; lives = m === 'journey' ? cfg.lives : Infinity; hits = 0; done = 0; spawned = 0; caught = 0; coins = 0; picked = 0;   // באימון אין פסילה
  obstacles = []; shurikens = []; fireballs = []; pickups = []; particles = []; flag = null;
  distSinceSpawn = 0; nextType = pickType(); nextGap = speed * 2.4;   // המכשול הראשון אחרי ~2 שניות
  py = 0; vy = 0; duckT = 0; invulnT = 0; kickT = 0; flyT = 0; catchT = 0; throwT = 0; throwCd = 0; resetAct();
  flash = null; heard = null; seenWords = [];
  if (mode === 'journey') { jStation = stageIdx; startJourneySegment(true); }
  banner = mode === 'stage' ? { text: '🥋 ' + STAGES[stageIdx].name, sub: STAGES[stageIdx].hint, t: 3 }
         : mode === 'journey' ? { text: '🏔️ Station ' + jStation + ' → ' + (jStation + 1), sub: 'Record: ' + pLoad('jbest_' + diffKey, 0), t: 3 }
         : { text: '🎛️ Free mix', sub: playWords.length + ' words · training', t: 3 };
  runBest = 0; recordShown = false;

  hideAllOverlays();
  $('endBtn').classList.remove('hide');
  $('pauseBtn').classList.remove('hide');
  $('hudFree').classList.toggle('hide', mode === 'stage');
  $('hudStage').classList.toggle('hide', mode === 'free');
  $('progress').classList.toggle('hide', mode === 'free');
  $('catchHud').classList.toggle('hide', mode !== 'journey');   // מטבעות נאספים לקופה רק במסע
  $('bestWrap').classList.toggle('hide', mode !== 'journey');
  if (mode === 'stage') $('stageName').textContent = '🥋 ' + STAGES[stageIdx].name;
  if (mode === 'journey') $('best').textContent = pLoad('jbest_' + diffKey, 0);
  renderHud();
  dbg('game', mode + (mode === 'stage' ? ' ' + (stageIdx + 1) : '') + ' / ' + diffKey);
  $('labBtn').classList.add('hide');
  if (mode === 'stage') startIntro();
  else state = 'play';
}

function renderHud() {
  $('score').textContent = score;
  $('caught').textContent = caught + picked - coinsFlying;      // מטבע שעוד עף – נספר כשהוא מגיע
  if (mode === 'stage') $('progressBar').style.width = (100 * done / STAGES[stageIdx].count) + '%';
  if (mode === 'journey') $('progressBar').style.width = (100 * Math.min(1, done / segLen(jStation))) + '%';
  if (!isFinite(lives)) $('lives').textContent = '';
  else $('lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, cfg.lives - lives));
}

// חלון סיום – משותף לכל המצבים
function showOver(title, big, sub, primaryLabel, primaryAction, starsStyle) {
  state = 'over';
  $('board').innerHTML = '';
  $('altBtn').classList.add('hide');
  stopAudio();
  $('skipBtn').classList.add('hide');
  bankCoins();
  $('endBtn').classList.add('hide');
  $('pauseBtn').classList.add('hide');
  $('overTitle').textContent = title;
  $('overBig').textContent = big;
  $('overBig').classList.toggle('starsBig', !!starsStyle);
  $('overSub').textContent = sub;
  $('primaryBtn').textContent = primaryLabel;
  $('primaryBtn').onclick = primaryAction;
  $('over').classList.add('show');
}

function catchText() { return coins ? '  ·  🟡 ' + caught + ' / ' + coins : ''; }

function endFree(byButton) {                     // סיום מיקס חופשי באימון – בלי שיאים
  sfx('win');
  showOver('Nice training!', '🥋 ' + score, (hits === 0 ? 'No misses!' : hits + (hits === 1 ? ' miss' : ' misses')) + catchText(),
           'Train again', () => play('free'));
  altButton('🏔️ Journey', () => { hideAllOverlays(); toMenu(); });
}

function stageComplete() {
  confetti(); sfx('win');
  const misses = hits;                      // כל פגיעה וכל מטבע שהוחמץ מורידים כוכב
  const got = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
  const stars = getStars();
  if (got > (stars[stageIdx] || 0)) { stars[stageIdx] = got; pStore('stars', stars); }
  const w = STAGES[stageIdx].words[0], wasNew = !isLearned(w);
  setLearned(w);                                    // עבר את השיעור – המילה מצטרפת למסע
  const sub = (hits === 0 ? 'Perfect – no misses!' : hits === 1 ? '1 miss' : hits + ' misses') + catchText();
  if (wasNew) showOver('🎓 ' + w.toUpperCase() + ' learned!', '★'.repeat(got) + '☆'.repeat(3 - got),
                       sub + '  ·  ' + w.toUpperCase() + ' joins the journey', 'Back to the journey ▶', () => play('journey', getStation()), true);
  else showOver(STAGES[stageIdx].name + ' – done!', '★'.repeat(got) + '☆'.repeat(3 - got), sub, 'Train again', () => play('stage', stageIdx), true);
}

function stageFailed() {
  sfx('over');
  showOver('Try again!', '💥', 'Stage ' + (stageIdx + 1) + ': ' + STAGES[stageIdx].name, 'Retry', () => play('stage', stageIdx));
}

function rand(a, b) { return a + Math.random() * (b - a); }

// מטבעות לאורך המסע: שורה ברווח שאחרי המכשול, ולפעמים קשת מעל ארגז (נאספת בקפיצה)
const PICKUP = { chance: 0.55, arc: 0.4, max: 4, spacing: 5, y: GROUND - 6, catchBonus: 4 };   // מטבע CATCH גדול שווה 5
function addPickups(o) {
  if (o.type === 'box' && Math.random() < PICKUP.arc) for (const [dx, dy] of [[-5, 13], [3, 18], [11, 13]]) pickups.push({ x: o.x + dx, y: GROUND - dy });
  if (Math.random() > PICKUP.chance) return;
  const start = o.x + (o.w || 12) + speed * 0.45, end = o.x + (o.w || 0) + nextGap - speed * 0.5;
  const n = Math.min(PICKUP.max, Math.floor((end - start) / PICKUP.spacing));
  for (let i = 0; i < n; i++) pickups.push({ x: start + i * PICKUP.spacing, y: PICKUP.y - Math.sin(i / Math.max(1, n - 1) * Math.PI) * 2 });
}

// כמה נקודות שווה מכשול (במסע). באימון כל מכשול = 1
function obstacleValue(type) {
  if (mode !== 'journey') return 1;
  const w = Object.keys(WORD_OBSTACLE).find(k => WORD_OBSTACLE[k] === type);
  return (WORD_POINTS[w] || 1) + Math.floor(jStation / 3);
}

// בוחר את המכשול הבא. לא יותר מ-3 מאותו סוג ברצף
function pickType() {
  let w = playWords[Math.floor(Math.random() * playWords.length)];
  const last = obstacles.slice(-3).map(o => o.type);
  if (playWords.length > 1 && last.length === 3 && last.every(t => t === WORD_OBSTACLE[w])) {
    const others = playWords.filter(x => WORD_OBSTACLE[x] !== WORD_OBSTACLE[w]);
    w = others[Math.floor(Math.random() * others.length)];
  }
  return WORD_OBSTACLE[w];
}

function riverWidth() {
  const airtime = 2 * cfg.jumpV / cfg.gravity;   // כמה זמן קפיצה רגילה באוויר
  return speed * airtime * RIVER_FACTOR;         // רחב מדי לקפיצה בלבד
}

function spawn() {
  if (mode === 'free') world = Math.floor(spawned / 12) % WORLDS.length;   // ב-Free Play העולם מתחלף כל 12 מכשולים
  const type = nextType;
  const o = { type, x: W + 2, passed: false, hit: false };
  if (type === 'river') o.w = riverWidth();
  if (type === 'lake') o.w = speed * LAKE.factor;        // רחב מדי לקפיצה
  if (type === 'bridge') o.w = speed * BRIDGE.factor;    // רחב מדי לקפיצה, ארוך מדי להליכה
  if (type === 'pond') o.w = Math.max(40, speed * POND.factor);   // הרשת באמצע
  if (type === 'bramble') o.w = BRAMBLE.ramp + Math.max(30, speed * BRAMBLE.factor) + BRAMBLE.exit;   // כניסה שהולכת ונעשית צרה + החלק הנמוך + יציאה
  if (type === 'coin') coins++;
  o.pts = obstacleValue(type);
  obstacles.push(o);
  spawned++;
  distSinceSpawn = 0;

  // הרווח עד המכשול הבא – בשניות, ועוד אורך הנהר אם יש
  nextType = pickType();
  nextGap = speed * rand(cfg.gapT[0], cfg.gapT[1]) + (o.w || 0);
  if (type === 'river') nextGap += speed * FLY.time * 0.8;   // זמן לנחות מהגלישה לפני המכשול הבא
  if (type === 'bridge') nextGap += speed * 1.0;             // אחרי RUN העולם מהיר – עוד מרווח
  if (mode === 'journey') addPickups(o);
  if (type === 'cliff') nextGap += speed * 1.3 + CLIFF.ladder;   // זמן לרדת מהצוק הגבוה
  if (nextType === 'enemy') nextGap *= 1.35;   // אויב רץ מהר יותר – נותנים לו יותר מרווח
  if (nextType === 'arrows') nextGap *= 1.4;   // חיצים מהירים
  if (nextType === 'guard') nextGap *= 1.15;
}

function playerBox() {
  if (act.leap > 0) return { l: PLAYER.x - 2, r: PLAYER.x + LEAP.w - 2, t: GROUND - py - LEAP.h, b: GROUND - py };   // גוף אופקי, בגובה הקשת
  if (diving()) return { l: PLAYER.x - 2, r: PLAYER.x + 10, t: GROUND + POND.deep + 2, b: GROUND + POND.deep + 8 };           // עמוק מתחת למים – מתחת לרשת
  if (crawling()) return { l: PLAYER.x - 2, r: PLAYER.x + 10, t: GROUND - 5, b: GROUND };                                       // זוחל
  const ducking = duckT > 0;
  const w = ducking ? PLAYER.duckW : PLAYER.w;
  const h = ducking ? PLAYER.duckH : PLAYER.h;
  const bottom = GROUND - py;
  return { l: PLAYER.x, r: PLAYER.x + w, t: bottom - h, b: bottom };
}

function obstacleBox(o) {
  switch (o.type) {
    case 'box':   return { l: o.x, r: o.x + BOX.w, t: GROUND - BOX.h, b: GROUND };
    case 'beam':  return { l: o.x, r: o.x + BEAM.w, t: -1e6, b: GROUND - BEAM.clear };
    case 'wall':  return { l: o.x, r: o.x + WALL.w, t: GROUND - WALL.h, b: GROUND };
    case 'ice':   return { l: o.x, r: o.x + ICE.w, t: GROUND - ICE.h, b: GROUND };
    case 'enemy': return { l: o.x, r: o.x + ENEMY.w, t: GROUND - ENEMY.h, b: GROUND };
    case 'river': return { l: o.x, r: o.x + o.w, t: GROUND, b: GROUND + 20 };
    case 'coin':return { l: o.x, r: o.x + 6, t: COIN.y - 3, b: COIN.y + 3 };
    case 'rock': {
      if (o.fallK === undefined) return { l: o.x, r: o.x + ROCK.size, t: ROCK.hangY, b: ROCK.hangY + ROCK.size };
      return { l: o.x, r: o.x + ROCK.size, t: rockY(o), b: rockY(o) + ROCK.size };
    }
    case 'bridge': case 'lake': return { l: o.x, r: o.x + o.w, t: GROUND, b: GROUND + 20 };
    case 'cliff':   return { l: o.x, r: o.x + CLIFF.w, t: GROUND - CLIFF.h, b: GROUND };
    case 'boulder': return { l: o.x + 1, r: o.x + BOULDER.r * 2 - 1, t: GROUND - BOULDER.r * 2 + 1, b: GROUND };
    case 'gate':    return { l: o.x, r: o.x + GATE.w, t: -1e6, b: GROUND };
    case 'guard':   return { l: o.x, r: o.x + GUARD.span, t: -1e6, b: GROUND };   // הפנסים רואים גם באוויר – רק HIDE עובד
    case 'arrows':  return { l: o.x, r: o.x + ARROWS.w, t: GROUND - 23, b: GROUND - 2 };
    case 'window':  return { l: o.x, r: o.x + WINDOW.w, t: -1e6, b: GROUND };
    case 'pond':    return { l: o.x, r: o.x + o.w, t: GROUND, b: GROUND + 20 };
    case 'bramble': return { l: o.x, r: o.x + o.w, t: -1e6, b: GROUND - BRAMBLE.gap };
  }
}
function rockY(o) {   // הסלע נופל בתאוצה מהחבל עד הקרקע
  const k = Math.min(1, o.fallK || 0);
  return ROCK.hangY + (GROUND - ROCK.size - ROCK.hangY) * k * k;
}

// האם הנינג'ה נפגע מהמכשול הזה עכשיו
// ברמה הקלה (forgive) מכווצים את אזור הפגיעה – נגיעה בקצה לא נחשבת
function collides(o, pb) {
  if (o.demo || o.type === 'coin' || o.broken || o.defeated) return false;
  if (o.climbed || o.pushed || o.open || o.deflected || o.landed) return false;
  if (o.type === 'rock' && o.fallK === undefined) return false;
  if (o.type === 'guard' && hidingFrom === o) return false;   // מתכופף מאחורי הסלעים – השומרים לא רואים
  const m = cfg.forgive || 0;
  const cx = (pb.l + pb.r) / 2;
  if (o.type === 'lake')   return (o.drown || 0) >= drownTime();                // שקע עד הסוף בלי SWIM
  if (o.type === 'bridge') return o.front !== undefined && act.climb <= 0 && cx > o.x + 1 && cx < o.x + o.w - 1 && o.x + o.front >= cx - 1;   // האש השיגה אותו – נשרף גם בקפיצה
  const ov = (b) => pb.l < b.r - m && pb.r > b.l + m && pb.t < b.b - m && pb.b > b.t + m;
  if (o.type === 'window')  // רק החלון פתוח: חלק עליון וחלק תחתון של הקיר
    { const ovw = b => pb.l < b.r && pb.r > b.l && pb.t < b.b && pb.b > b.t;   // בלי מרווח סלחנות – רק זינוק עובר בחלון
      return ovw({ l: o.x, r: o.x + WINDOW.w, t: -1e6, b: WINDOW.top }) || ovw({ l: o.x, r: o.x + WINDOW.w, t: WINDOW.bot, b: GROUND + 1 }); }
  if (o.type === 'bramble') {  // מערה: התקרה יורדת בהדרגה. רק זחילה עוברת בחלק הנמוך (גם התכופפות גבוהה מדי)
    for (let k = 0; k <= 6; k++) { const xx = pb.l + m + (pb.r - pb.l - 2 * m) * k / 6; if (pb.t < caveCeiling(o, xx)) return true; }
    return false;
  }
  if (o.type === 'pond') { const nx = netX(o); return ov({ l: nx, r: nx + POND.net, t: -1e6, b: GROUND + POND.deep + 1 }); }   // הרשת יורדת עמוק לתוך המים
  if (o.type === 'river') {
    const cx = (pb.l + pb.r) / 2;
    return py === 0 && cx > o.x + 2 + m * 2 && cx < o.x + o.w - 2 - m * 2;   // עומד על הקרקע מעל המים
  }
  const b = obstacleBox(o);
  return pb.l < b.r - m && pb.r > b.l + m && pb.t < b.b - m && pb.b > b.t + m;
}

function onHit(o) {
  o.hit = true;
  shakeT = 0.3; sfx('hit');
  if (o.type === 'bridge' || o.type === 'river' || o.type === 'lake') { sinkT = SINK_TIME; sinkType = o.type === 'lake' ? 'lake' : o.type === 'river' ? 'lava' : 'burn'; }   // נשרף / נופל ללבה / שוקע במים
  if (state === 'demo' || state === 'intro') {   // בהדגמה – בלי עונש
    flash = { text: HIT_WORD[o.type], t: 1.2 }; invulnT = INVULN_TIME; return;
  }
  if (dragonSave()) { invulnT = INVULN_TIME; sinkT = 0; o.pts = 0; cleared(o); return; }   // הדרקון חוסם את הפגיעה – בלי לאבד לב
  hits++; done++;
  if (mode === 'journey') nextType = o.type;     // במסע: מכשול שפספסו חוזר מיד
  flash = { text: HIT_WORD[o.type], t: 1.2 };   // מראה את המילה הנכונה
  invulnT = INVULN_TIME;
  if (isFinite(lives)) {
    lives--;
    renderHud();
    if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; }
  } else if (cfg.penalty && mode === 'free') {
    score = Math.max(0, score - cfg.penalty);
  }
  renderHud();
}

// הצלחה במכשול (בעיטה, שוריקן, תפיסה, או מעבר)
function cleared(o) {
  if (o.passed) return;
  const v = o.pts === undefined ? 1 : o.pts;
  o.passed = true; done++; score += v;
  if (mode === 'journey' && state === 'play' && v > 0) floatText(PLAYER.x + 4, GROUND - 24, '+' + v, '#7c3aed');
  if (o.type !== 'coin') sfx('clear');
  if (mode === 'free' && state === 'play') endlessProgress();
  renderHud();
}

let floats = [];               // טקסטים קטנים שעולים ונעלמים (+1 וכו')
function floatText(x, y, text, color) { floats.push({ x, y, text, color: color || '#16a34a', t: 0.9 }); }
function catchCoin(s) {
  s.caught = true; s.ct = 0; caught++; coinsFlying++;
  cleared(s); sfx('coin');
  burst(s.x + 3, COIN.y, '#fde047', 16, 40);
  picked += PICKUP.catchBonus;                      // מטבע גדול שתפסו ב-CATCH שווה 5
  floatText(s.x + 3, COIN.y - 6, '+' + (1 + PICKUP.catchBonus) + ' 🟡', '#ca8a04');
  if (py <= 0 && act.climb <= 0) { vy = cfg.jumpV * 0.45; py = 0.001; }   // קפיצה קטנה עם הידיים למעלה – רואים שהוא תפס
  flyCoinToHud(s);
}
// המטבע עף אל המונה למעלה – רואים שהוא נאסף ונכנס לקופה
let coinsFlying = 0;
function flyCoinToHud(s, y) {
  const hud = $('catchHud'), r = hud.getBoundingClientRect();
  if (hud.classList.contains('hide')) { setTimeout(() => { coinsFlying = Math.max(0, coinsFlying - 1); }, 300); return; }
  const c = document.createElement('span'); c.className = 'coinIco flyCoin';
  c.style.left = (ox + (s.x + 3) * scale) + 'px'; c.style.top = (oy + (y === undefined ? COIN.y : y) * scale) + 'px';
  $('app').appendChild(c);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    c.style.left = (r.left + 18) + 'px'; c.style.top = (r.top + r.height / 2) + 'px'; c.style.transform = 'scale(.8)';
  }));
  setTimeout(() => { c.remove(); coinsFlying = Math.max(0, coinsFlying - 1); $('caught').textContent = caught + picked - coinsFlying; hud.classList.remove('pop'); void hud.offsetWidth; hud.classList.add('pop'); }, 620);
}

/* ---------- חלקיקים (ניצוצות, שברי לבנים) ---------- */
function burst(x, y, color, n, power) {
  power = power || 30;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = power * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, life: 0.6 + Math.random() * 0.4, color, size: 0.8 + Math.random() * 1.2 });
  }
}

function overWide(type, pb) {           // הנינג'ה מעל אגם / גשר / נהר?
  const cx = (pb.l + pb.r) / 2;
  return obstacles.find(o => o.type === type && cx > o.x + 1 && cx < o.x + o.w - 1);
}
function netX(o) { return o.x + o.w / 2 - POND.net / 2; }
function inPond() { const cx = PLAYER.x + PLAYER.w / 2; return obstacles.find(o => o.type === 'pond' && cx > o.x + 1 && cx < o.x + o.w - 1); }
function diving() { return act.dive > 0 && py <= 0 && !!inPond(); }
// גובה תקרת המערה בנקודה x (מספר קטן = גבוה במסך). מחוץ למערה – אין תקרה
function caveCeiling(o, x) {
  let r = x - o.x; const low = GROUND - BRAMBLE.gap, high = GROUND - BRAMBLE.mouth;
  if (r < -0.01 || r > o.w + 0.01) return -1e6;
  r = Math.max(0, Math.min(o.w, r));                                         // סטייה זעירה של חישוב לא תזרוק את התקרה לשמיים
  const ease = q => q * q * (3 - 2 * q);
  const ramp = Math.min(BRAMBLE.ramp, o.w * 0.5), exit = Math.min(BRAMBLE.exit, o.w * 0.18);
  if (r < ramp) return high + (low - high) * ease(r / ramp);                 // הכניסה: התקרה יורדת
  if (r > o.w - exit) return low + (high - low) * ease((r - (o.w - exit)) / exit);   // היציאה: עולה שוב
  return low;
}
function inBramble() { const cx = PLAYER.x + PLAYER.w / 2; return obstacles.find(o => o.type === 'bramble' && cx > o.x - 4 && cx < o.x + o.w + 4); }
function crawling() { return act.crawl > 0 && py <= 0 && act.leap <= 0; }
let leapWin = null;          // החלון שמזנקים דרכו עכשיו
function drownTime() { return cfg.forgive ? DROWN.easy : DROWN.other; }
let drownK = 0;                         // 0..1 – כמה הנינג'ה שקע (לציור)
function cliffTop() {                   // עומד על צוק שטיפס עליו?
  return obstacles.find(o => o.type === 'cliff' && o.climbed && PLAYER.x + PLAYER.w > o.x - 2 && PLAYER.x < o.x + CLIFF.w);
}
function swimmingNow() { return py <= 0 && ((act.swim > 0 && !!overWide('lake', playerBox())) || !!inPond()); }   // בבריכת DIVE שוחים לבד

function update(dt) {
  if (cfg.accel && mode === 'stage') speed = Math.min(cfg.maxSpeed, speed + cfg.accel * dt);

  // הנינג'ה
  const wasAir = py > 0;
  if (act.climb > 0) {                     // מטפס על הסולם – עולה ומתקדם באלכסון
    climbK = Math.min(1, climbK + dt / CLIFF.time);
    py = CLIFF.h * climbK; vy = 0;
    if (climbK >= 1) { act.climb = 0; py = CLIFF.h; vy = 0; }           // למעלה – הולך על הצוק ואז קופץ למטה
  } else if (act.leap > 0) {               // זינוק אופקי: מרחף בגובה החלון עד שעבר אותו
    act.leap -= dt; vy = 0;
    let u = leapWin ? (leapWin.leapFrom - leapWin.x) / Math.max(1, leapWin.leapFrom - (PLAYER.x - 2.5 - WINDOW.w)) : 1 - act.leap / LEAP.free;   // 0 → 1 לאורך הזינוק
    u = Math.max(0, Math.min(1, u));
    py = LEAP.y + LEAP.arc * Math.sin(Math.PI * u);                       // קשת קלה – הכי גבוה בתוך הטבעת
    if (leapWin && PLAYER.x - 2 > leapWin.x + WINDOW.w + 0.5) act.leap = 0;
    if (act.leap <= 0) { act.leap = 0; leapWin = null; vy = 6; }
  } else if (vy <= 0 && py >= CLIFF.h - 0.5 && cliffTop()) {
    py = CLIFF.h; vy = 0;                  // הולך על ראש הצוק
  } else if (flyT > 0) {
    flyT -= dt;
    vy = -FLY.sink;                 // גולש – יורד לאט
    py += vy * dt;
    if (py <= 0) { py = 0; vy = 0; flyT = 0; }
  } else if (py > 0 || vy > 0) {
    vy -= cfg.gravity * dt;
    py += vy * dt;
    if (py <= 0) { py = 0; vy = 0; }
  }
  if (wasAir && py === 0) burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 7, 14);   // אבק בנחיתה
  if (duckT > 0) duckT -= dt;
  hideT = act.hide > 0 || act.hiding > 0 ? hideT + dt : 0;
  if (invulnT > 0) invulnT -= dt;
  if (kickT > 0) kickT -= dt;
  if (catchT > 0) catchT -= dt;
  if (throwT > 0) throwT -= dt;
  if (throwCd > 0) throwCd -= dt;
  if (act.fireCd > 0) act.fireCd -= dt;
  for (const k of ['stop', 'run', 'swim', 'climbWant', 'push', 'pull', 'pullWant', 'hide', 'block', 'leapWant', 'dive', 'crawl', 'crawlWant']) if (act[k] > 0) act[k] = Math.max(0, act[k] - dt);
  if (flash && (flash.t -= dt) <= 0) flash = null;
  if (heard && (heard.t -= dt) <= 0) heard = null;
  if (banner && (banner.t -= dt) <= 0) banner = null;

  // מכשולים חדשים / דגל סיום
  const v = curSpeed(), dx = v * dt;
  bgX += dx;
  distSinceSpawn += dx;
  if (state === 'play' && distSinceSpawn >= nextGap) {
    if (mode === 'free' || spawned < (mode === 'journey' ? segLen(jStation) : STAGES[stageIdx].count)) spawn();
    else if (!flag) flag = { x: W + 2 };
  }

  const pb = playerBox();
  if (state === 'demo' || state === 'intro') demoAuto(pb, dt);
  if (state === 'intro' && (introT -= dt) <= 0) introNext();

  // שוריקנים
  for (const s of shurikens) {
    s.x += SHURIKEN.speed * throwMul() * dt; s.rot += dt * 18;
    for (const o of obstacles) {
      if (o.type !== 'enemy' || o.defeated) continue;
      const b = obstacleBox(o);
      if (s.x > b.l && s.x < b.r && s.y > b.t && s.y < b.b) {
        o.defeated = true; o.ft = 0; s.dead = true;
        burst(o.x + ENEMY.w / 2, GROUND - ENEMY.h / 2, '#ef4444', 10);
        cleared(o);
        break;
      }
    }
  }
  shurikens = shurikens.filter(s => !s.dead && s.x < W + 10);
  for (const f of fireballs) {                                              // כדורי אש – מנפצים קיר קרח
    f.x += FIREBALL.speed * dt; f.t += dt;
    if (Math.random() < 0.7) particles.push({ x: f.x - 2, y: f.y + (Math.random() - 0.5) * 2, vx: -20, vy: -4, g: -6, life: 0.35, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', size: 0.9 });
    for (const o of obstacles) {
      if (o.type !== 'ice' || o.broken) continue;
      if (f.x + 2 >= o.x && f.x - 2 <= o.x + ICE.w) {
        o.broken = true; f.dead = true; sfx('hit');
        for (let i = 0; i < 26; i++) particles.push({ x: o.x + Math.random() * ICE.w, y: GROUND - Math.random() * ICE.h, vx: 15 + Math.random() * 45, vy: -10 - Math.random() * 35,
          g: 90, life: 0.9 + Math.random() * 0.5, color: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#ffffff'][i % 4], size: 1 + Math.random() * 1.6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
        burst(o.x + ICE.w / 2, GROUND - ICE.h / 2, '#fb923c', 8);
        cleared(o);
        break;
      }
    }
  }
  fireballs = fireballs.filter(f => !f.dead && f.x < W + 10);
  for (const c of pickups) {                                                // מטבעות קטנים – נאספים בנגיעה
    c.x -= curSpeed() * dt;
    if (hasGear('owl') && !c.got && c.x - pb.r < 16 && c.x > pb.l - 2) { c.x += (pb.r - 2 - c.x) * 0.2; c.y += (pb.t + 6 - c.y) * 0.2; }   // הינשוף מושך מטבעות
    if (!c.got && c.x + 1.5 > pb.l && c.x - 1.5 < pb.r && c.y + 1.5 > pb.t && c.y - 1.5 < pb.b) {
      c.got = true; picked++; coinsFlying++; sfx('coin'); flyCoinToHud({ x: c.x - 3 }, c.y);
    }
  }
  pickups = pickups.filter(c => !c.got && c.x > -10);

  const cx = (pb.l + pb.r) / 2;
  drownK = 0;
  for (const o of obstacles) {
    o.x -= dx;
    if (o.type === 'enemy' && !o.defeated) o.x -= speed * ENEMY.extra * dt;   // אויב רץ לקראתך
    if (o.type === 'guard') {
      if (o.rx === undefined) {                                          // הסלע: מגיע לנינג'ה כשהשומרים עוד 25 יחידות מאחוריו
        const vv = Math.max(v, 0.001);
        o.rx = v > 0 ? PLAYER.x + (o.x - PLAYER.x - HIDE_ROCK.lead) / (1 + GUARD.walk / vv) - HIDE_ROCK.w / 2 + PLAYER.w / 2 : PLAYER.x - HIDE_ROCK.w / 2 + PLAYER.w / 2;
        o.rx += dx;
      }
      o.rx -= dx;
      o.x -= (hidingFrom === o ? GUARD_PASS : GUARD.walk) * dt;          // שומרים הולכים לקראתך (ועוברים מהר כשמתחבאים)
    }
    if (o.type === 'arrows' && !o.deflected) o.x -= ARROWS.speed * dt;       // חיצים עפים
    if (o.pushed) { o.x += (v + 60) * dt; o.rot = (o.rot || 0) + dt * 6; }   // סלע שנדחף מתגלגל קדימה
    if (o.defeated) o.ft += dt;
    if (o.caught) o.ct += dt;
    if (o.deflected) o.dt2 = (o.dt2 || 0) + dt;
    if (o.open) o.oT = (o.oT || 0) + dt;

    // בעיטה שוברת קיר שקרוב מספיק
    if (o.type === 'wall' && !o.broken && kickT > 0 && o.x - pb.r <= KICK.range * kickMul() && o.x + WALL.w > pb.l) {
      o.broken = true;
      for (let i = 0; i < 14; i++) burst(o.x + 2.5, GROUND - Math.random() * WALL.h, '#94a3b8', 1, 45);
      cleared(o);
    }
    // STOP: הסלע נופל כשמגיעים אליו – או מיד, אם עצרו לידו
    if (o.type === 'rock') {
      if (o.fallK === undefined) {
        const d = o.x - pb.r;
        const nearStopped = act.stop > 0 && d > -ROCK.size && d <= Math.max(60, speed * 2.5);
        const arriving = v > 0 && d > -ROCK.size && d / v <= ROCK.warn;
        if (nearStopped || arriving) {
          o.fallK = 0;
          if (nearStopped) { o.fallDur = ROCK.fall; o.vTrig = 0; }          // עצרו – נופל לפניהם ומתנפץ
          else {                                                              // ממשיכים – מתוזמן ליפול בדיוק עליהם
            const tArr = Math.max(0.05, d / v), tc = (ROCK.size + PLAYER.w) / v;
            o.fallDur = Math.max(0.2, tArr + tc * 0.5); o.vTrig = v;   // נוחת בדיוק עליהם – גם אם התכופפו
          }
        }
      } else if (!o.landed) {
        // אם העולם מאיץ (RUN) – גם הנפילה מאיצה באותו יחס, ולכן אי אפשר "לברוח" מהסלע
        o.fallK += dt / o.fallDur * (v > 0 && o.vTrig > 0 ? v / o.vTrig : 1);
        if (o.fallK >= 1) {
          o.landed = true;
          burst(o.x + ROCK.size / 2, GROUND - 2, '#78716c', 14, 35);
          // נפל על הנינג'ה (גם אם התכופף) – פגיעה. נפל לפניו – הצלחה
          const on = pb.l < o.x + ROCK.size - (cfg.forgive || 0) && pb.r > o.x + (cfg.forgive || 0);
          if (!o.hit && on && invulnT <= 0) onHit(o);
          else if (!o.hit) cleared(o);
          if (state === 'over') return;
        }
      }
    }
    // RUN: אש שמתחילה בכניסה לשדה ורודפת אחרי הנינג'ה
    if (o.type === 'bridge') {
      if (o.stepT === undefined && cx > o.x && cx < o.x + o.w) o.stepT = 0;
      if (o.stepT !== undefined && (o.stepT += dt) > BRIDGE.delay) o.front = Math.min(o.w + 6, (o.front || 0) + speed * BRIDGE.chase * dt);   // חזית האש מתקדמת
      if (o.front >= o.w) o.cT = (o.cT || 0) + dt;
      if (act.run > 0 && cx > o.x - 2 && cx < o.x + o.w) act.run = Math.max(act.run, 0.3);   // בתוך השדה – ממשיך לרוץ עד שיוצאים
    }
    // CLIMB: מתחיל לטפס כשהצוק בטווח
    if (o.type === 'cliff' && !o.climbed && act.climbWant > 0 && act.climb <= 0) {
      const foot = o.x - CLIFF.ladder;                 // תחתית הסולם
      if (pb.r >= foot - CLIFF.range && pb.r <= o.x + 1 && py <= 0) {
        o.climbed = true; act.climb = 1; climbK = Math.max(0, Math.min(0.9, (pb.r - foot) / CLIFF.ladder));
        act.climbWant = 0; duckT = 0; flyT = 0; py = CLIFF.h * climbK; vy = 0;
        cleared(o);
      }
    }
    // PUSH: דוחף סלע שקרוב מספיק
    if (o.type === 'boulder' && !o.pushed && act.push > 0 && o.x - pb.r <= BOULDER.range && o.x + BOULDER.r * 2 > pb.l) {
      o.pushed = true; burst(o.x, GROUND - 2, WORLDS[world].dust, 10, 20); cleared(o);
    }
    // PULL: מושך בחבל ופותח שער שקרוב מספיק
    if (o.type === 'gate' && !o.open && !o.lifting && act.pullWant > 0 && pb.r >= o.x - GATE.rope - 1.5 && pb.r <= o.x) {
      o.lifting = true; o.liftK = 0; act.pulling = 1; act.pullWant = 0; duckT = 0;   // עוצר ליד החבל ומתחיל למשוך
    }
    if (o.type === 'gate' && o.lifting) {
      o.liftK = Math.min(1, o.liftK + dt / GATE.time);
      if (o.liftK >= 1) { o.lifting = false; o.open = true; o.oT = 1; act.pulling = 0; cleared(o); }
    }
    // SWIM: במים בלי לשחות – שוקעים לאט. SWIM בזמן הזה מציל. מי שכבר שוחה – ממשיך עד הסוף
    if (o.type === 'lake') {
      const inside = py <= 0 && cx > o.x + 2 && cx < o.x + o.w - 2;
      if (inside) o.wet = true;
      if (inside && act.swim > 0) { act.swim = Math.max(act.swim, 0.2); o.swam = true; o.drown = Math.max(0, (o.drown || 0) - dt * 3); }
      else if (inside && !o.hit) o.drown = (o.drown || 0) + dt;
      if (inside) drownK = Math.min(1, (o.drown || 0) / drownTime());
      // אי אפשר לחצות אגם בלי לשחות (גם לא בריצה או בקפיצה לתוך המים)
      if (o.wet && !o.swam && !o.hit && cx >= o.x + o.w - 2) o.drown = drownTime();
    }
    // CRAWL: זוחלים עד סוף המערה (אם התחילו לזחול לפני שהתקרה נעשתה נמוכה)
    if (o.type === 'bramble') {
      const near = pb.r > o.x - 3 && PLAYER.x < o.x + o.w + 1;
      if (near && py <= 0 && (act.crawlWant > 0 || act.crawl > 0)) act.crawl = Math.max(act.crawl, 0.25);
    }
    // HIDE: כשמגיעים לסלעים – מתכופפים מאחוריהם, העולם עוצר, והשומרים עוברים מאחורי הסלעים
    const atRock = o.type === 'guard' && o.rx !== undefined && o.rx + HIDE_ROCK.w / 2 <= PLAYER.x + PLAYER.w / 2 + 1.5 && o.rx + HIDE_ROCK.w > PLAYER.x + 2;
    if (o.type === 'guard' && !o.passed && !hidingFrom && act.hide > 0 && atRock && o.x + GUARD.span > PLAYER.x - 2) {
      hidingFrom = o; act.hiding = 1; duckT = 0;
    }
    if (o.type === 'guard' && hidingFrom === o) {
      act.hide = Math.max(act.hide, 0.2);
      if (o.x + GUARD.span < PLAYER.x - 1) { hidingFrom = null; act.hiding = 0; act.hide = 0; cleared(o); }   // עברו – יוצאים
    }
    // LEAP: מזנק כשהחלון ממש לפניו
    if (o.type === 'window' && !o.leapt && act.leapWant > 0 && act.leap <= 0 && o.x - pb.r <= WINDOW.range && o.x + WINDOW.w > PLAYER.x) {
      o.leapt = true; o.leapFrom = o.x; leapWin = o; act.leap = 1.2; act.leapWant = 0; duckT = 0; flyT = 0; py = LEAP.y; vy = 0;
    }
    // BLOCK: המגן הודף את החיצים
    if (o.type === 'arrows' && !o.deflected && act.block > 0) {
      const b = obstacleBox(o);
      if (b.l < pb.r + 4 && b.r > pb.l) { o.deflected = true; burst(o.x, GROUND - 12, '#e5e7eb', 10, 30); cleared(o); }
    }

    if (!o.hit && !o.passed && invulnT <= 0 && collides(o, pb)) { onHit(o); if (state === 'over') return; }
    const ob = obstacleBox(o);
    if (!o.passed && !o.hit && ob.r < pb.l) {
      if (o.type === 'coin') { onHit(o); if (state === 'over') return; }   // מטבע שהוחמץ – מאבדים לב (CATCH צריך לתפוס)
      else cleared(o);                                                     // עבר את המכשול בשלום
    }
  }
  obstacles = obstacles.filter(o => {
    const r = o.w ? o.x + o.w : Math.max(o.x, o.rx === undefined ? -1e9 : o.rx) + 25;
    return r > -10 && o.x < W + 40 && !(o.caught && o.ct > 0.35);
  });

  if (flag) {
    flag.x -= dx;
    if (flag.x <= PLAYER.x + PLAYER.w) { if (mode === 'journey') stationReached(); else stageComplete(); return; }
  }
  dbg('speed', v.toFixed(1));
}

