/* ninja-voice-game – screens.js
   מסכים: בחירת שחקן, מילון מילים, הדגמה בתחילת שלב
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   בחירת שחקן וניהול שחקנים
   ============================================================ */
let managing = false, editing = null, editColor = COLORS[0], delArmed = false, delTimer = null;

function hideAllOverlays() { ['menu', 'over', 'editP', 'dict', 'players', 'pause', 'lab', 'freePick', 'shop', 'orderPick'].forEach(id => $(id).classList.remove('show')); }

function showPlayers() {
  state = 'menu';
  stopAudio();
  $('labBtn').classList.remove('hide');
  $('lab').classList.remove('show');
  hideAllOverlays();
  try { speechSynthesis.cancel(); } catch (e) {}
  if (!players.length) { openEdit(null); return; }
  renderPlayers();
  $('players').classList.add('show');
}

function renderPlayers() {
  const g = $('playerGrid');
  g.innerHTML = '';
  g.classList.toggle('managing', managing);
  players.forEach(p => {
    const b = document.createElement('button');
    b.className = 'pcard';
    b.innerHTML = '<div class="face"><div class="band" style="background:' + p.color + '"></div></div>' +
                  '<div class="pname" dir="auto"></div>' +
                  '<div class="pstats">★ ' + totalStars(p) + ' · <span class="coinIco" style="font-size:12px;vertical-align:-2px"></span> ' + load('p' + p.id + '_coins', 0) + '</div>' +
                  '<span class="edit">✏️</span>';
    b.querySelector('.pname').textContent = p.name;
    b.onclick = () => managing ? openEdit(p) : selectPlayer(p);
    g.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'pcard add';
  add.innerHTML = '<span>+</span>New player';
  add.onclick = () => openEdit(null);
  g.appendChild(add);
  $('manageBtn').textContent = managing ? '✓ Done' : '✏️ Manage players';
}

function selectPlayer(p) {
  player = p; store('current', p.id);
  diffKey = loadDiff(); cfg = LEVELS[diffKey];
  managing = false;
  hideAllOverlays();
  renderMenu(); renderTester();
  if (model) setStatus('Ready! Choose a stage');
  $('menu').classList.add('show');
}

function openEdit(p) {
  editing = p;
  const used = players.map(x => x.color);
  editColor = p ? p.color : (COLORS.find(c => !used.includes(c)) || COLORS[0]);
  $('editTitle').textContent = p ? 'Edit player' : (players.length ? 'New player' : 'Welcome! What is your name?');
  $('pName').value = p ? p.name : '';
  $('pErr').textContent = '';
  $('pDelete').classList.toggle('hide', !p);
  $('pReset').classList.toggle('hide', !p); resetArmed = false; $('pReset').textContent = '↺ Reset all progress';
  $('pCancel').classList.toggle('hide', !players.length);
  disarmDelete();
  renderSwatches();
  hideAllOverlays();
  $('editP').classList.add('show');
  setTimeout(() => { try { $('pName').focus(); } catch (e) {} }, 50);
}

function renderSwatches() {
  const box = $('swatches');
  box.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw' + (c === editColor ? ' sel' : '');
    b.style.background = c;
    b.onclick = () => { editColor = c; renderSwatches(); };
    box.appendChild(b);
  });
}

function disarmDelete() {
  delArmed = false; clearTimeout(delTimer);
  $('pDelete').textContent = '🗑 Delete player';
}

$('pSave').onclick = () => {
  const name = $('pName').value.trim();
  if (!name) { $('pErr').textContent = 'Please type a name'; return; }
  if (editing) {
    editing.name = name; editing.color = editColor; savePlayers();
    showPlayers();
  } else {
    selectPlayer(createPlayer(name, editColor));   // שחקן חדש – מתחיל לשחק מיד
  }
};
$('pCancel').onclick = showPlayers;
// איפוס התקדמות: מוחק את כל ההתקדמות של השחקן (חוץ מרמת הקושי). לחיצה שנייה מאשרת
let resetArmed = false;
$('pReset').onclick = () => {
  if (!editing) return;
  if (!resetArmed) { resetArmed = true; $('pReset').textContent = '⚠️ Tap again to reset ' + editing.name; setTimeout(() => { resetArmed = false; $('pReset').textContent = '↺ Reset all progress'; }, 3000); return; }
  const pre = 'ninjaVoice_p' + editing.id + '_';
  try { Object.keys(localStorage).filter(k => k.startsWith(pre) && !k.endsWith('_difficulty')).forEach(k => localStorage.removeItem(k)); } catch (e) {}   // הכל מתאפס: כוכבים, מילים, תחנות, שיאים ומטבעות
  resetArmed = false; showPlayers();
};
$('pDelete').onclick = () => {
  if (!editing) return;
  if (!delArmed) {   // לחיצה ראשונה – מבקשים אישור
    delArmed = true;
    $('pDelete').textContent = '⚠️ Tap again to delete "' + editing.name + '"';
    delTimer = setTimeout(disarmDelete, 3000);
    return;
  }
  deletePlayer(editing.id);
  managing = players.length > 0 && managing;
  showPlayers();
};
$('manageBtn').onclick = () => { managing = !managing; renderPlayers(); };
$('pchip').onclick = () => { managing = false; showPlayers(); };
function renderMute() { $('muteBtn').textContent = muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = () => { muted = !muted; try { localStorage.setItem('ninjaVoice_mute', JSON.stringify(muted)); } catch (e) {} renderMute(); };
renderMute();
document.querySelectorAll('.testerBtn').forEach(b => {
  let timer = null;
  const cancel = () => { clearTimeout(timer); timer = null; b.classList.remove('holding'); };
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); b.classList.add('holding');
    timer = setTimeout(() => { cancel(); managing = false; selectPlayer(TESTER); }, 1000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, cancel));
  b.addEventListener('contextmenu', e => e.preventDefault());
});

/* ============================================================
   מילון מילים – לוחצים על מילה, שומעים אותה ורואים מה היא עושה
   ============================================================ */
// במילון אין משחק: הנינג'ה עומד במקום, העולם לא זז, ואין זיהוי קולי.
// לוחצים על מילה → שומעים אותה → הנינג'ה מבצע את הפעולה מול חפץ קטן לידו.
let demoSteps = [], demoClock = 0;

function renderDict() {
  const grid = $('wordGrid');
  grid.innerHTML = '';
  WORDS.forEach(w => {
    const b = document.createElement('button');
    b.className = 'word'; b.dataset.w = w;
    b.innerHTML = '<span class="ic">' + WORD_ICON[w] + '</span>' + w.toUpperCase();
    b.onclick = () => showWord(w);
    grid.appendChild(b);
  });
}

function resetDemo() {
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; windLevel = 0; windStreaks = []; particles = []; flag = null; banner = null; flash = null; heard = null;
  py = 0; vy = 0; duckT = 0; invulnT = 0; kickT = 0; flyT = 0; catchT = 0; throwT = 0; throwCd = 0; resetAct();
  demoSteps = []; demoClock = 0;
}

function openDict() {
  stopAudio();
  state = 'demo'; mode = 'demo'; world = 0;
  cfg = LEVELS.medium; speed = 0; lives = Infinity;   // speed 0 = העולם עומד
  resetDemo();
  $('menu').classList.remove('show');
  ['hudFree', 'hudStage', 'progress', 'catchHud', 'endBtn', 'pauseBtn'].forEach(id => $(id).classList.add('hide'));
  $('lives').textContent = '';
  renderDict();
  $('dict').classList.add('show');
}

function speak(w) {
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w);
    u.lang = 'en-US'; u.rate = 0.85;
    const voices = speechSynthesis.getVoices();
    const v = voices.find(x => /^en[-_]US/i.test(x.lang)) || voices.find(x => /^en/i.test(x.lang));
    if (v) u.voice = v;
    ignoreVoiceUntil = performance.now() + 1600;
    u.onend = () => { ignoreVoiceUntil = performance.now() + 400; };
    speechSynthesis.speak(u);
  } catch (e) {}
}

// חפץ קטן ליד הנינג'ה (אם צריך), ורשימת פעולות לפי זמן
function showWord(w) {
  speak(w);
  document.querySelectorAll('.word').forEach(b => b.classList.toggle('active', b.dataset.w === w));
  resetDemo();
  setupDemo(w);
  demoSteps.forEach(st => st.at -= 0.45);   // במילון – הפעולה מגיעה מהר יותר
}

function demoAuto(pb, dt) {
  demoClock += dt;
  while (demoSteps.length && demoClock >= demoSteps[0].at) command(demoSteps.shift().w, 'demo');
}

$('dictBtn').onclick = openDict;
$('dictClose').onclick = () => toMenu();   // toMenu מוגדר ב-main.js, שנטען אחרי הקובץ הזה

// חלקיקים ורעידה – ממשיכים לזוז גם במסך הסיום (קונפטי)
function updateEffects(dt) {
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  if (sinkT > 0 && state !== 'paused') sinkT = Math.max(0, sinkT - dt);
  for (const f of floats) { f.t -= dt; f.y -= 9 * dt; }
  floats = floats.filter(f => f.t > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g === undefined ? 60 : p.g) * dt; p.life -= dt;
    if (p.rot !== undefined) p.rot += p.vr * dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function confetti() {
  const cols = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#facc15'];
  for (let i = 0; i < 80; i++) {
    particles.push({ x: 10 + Math.random() * (W - 20), y: -5 - Math.random() * 25, vx: (Math.random() - 0.5) * 12, vy: 8 + Math.random() * 10,
                     g: 6, life: 3 + Math.random() * 1.5, color: cols[i % cols.length], size: 1.6 + Math.random(), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
  }
}

/* ============================================================
   הדגמה בתחילת שלב – רואים ושומעים כל מילה לפני שמשחקים
   ============================================================ */
let introWords = [], introT = 0, runSpeed = 0;

// מציב חפץ קטן ליד הנינג'ה ומתזמן את הפעולה (משותף למילון ולהדגמה)
function setupDemo(w) {
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; windLevel = 0; windStreaks = []; flash = null; invulnT = 0;
  py = 0; vy = 0; duckT = 0; flyT = 0; kickT = 0; catchT = 0; throwT = 0; resetAct();
  demoSteps = []; demoClock = 0;
  const near = PLAYER.x + PLAYER.w;
  if (w === 'kick')  obstacles.push({ type: 'wall',  x: near + 6 });
  if (w === 'throw') obstacles.push({ type: 'enemy', x: near + 55 });
  if (w === 'catch') obstacles.push({ type: 'coin',  x: near + 12 });
  if (w === 'stop')  obstacles.push({ type: 'rock',  x: near + 18 });
  if (w === 'swim')  obstacles.push({ type: 'lake',  x: PLAYER.x - 12, w: 34, wet: true, swam: true });
  if (w === 'climb') obstacles.push({ type: 'cliff', x: near + CLIFF.ladder });
  if (w === 'push')  obstacles.push({ type: 'boulder', x: near + 14 });
  if (w === 'pull')  obstacles.push({ type: 'gate',  x: near + GATE.rope + 0.5 });
  if (w === 'leap')  obstacles.push({ type: 'window', x: near + 3 });
  if (w === 'dive')  obstacles.push({ type: 'pond', x: PLAYER.x - 10, w: 40 });
  if (w === 'crawl') obstacles.push({ type: 'bramble', x: PLAYER.x - 6, w: 60 });
  if (w === 'hide')  obstacles.push({ type: 'guard', x: near + 14 });
  if (w === 'block') obstacles.push({ type: 'arrows', x: near + 28 });
  if (w === 'fire')  obstacles.push({ type: 'ice', x: near + 30 });
  if (w === 'want')  obstacles.push({ type: 'door', x: near + DOOR.stopAt - 2 });
  if (w === 'ride') obstacles.push({ type: 'dragon', x: near + DRAGON.stopAt - 1, w: DRAGON.w });
  if (w === 'let go') obstacles.push({ type: 'chasm', x: near + ROPE.stopAt - 2, w: CHASM.w });
  if (w === 'fight') obstacles.push({ type: 'duel', x: near + 40, w: 8 });
  if (w === 'hold') obstacles.push({ type: 'gust', x: near + 1 - GUST.stalks[2], w: GUST.stalks[2] + 4 });
  obstacles.forEach(o => { o.passed = false; o.hit = false; o.demo = true; });   // בהדגמה – בלי פגיעות
  demoSteps = w === 'fly' ? [{ at: 0.9, w: 'jump' }, { at: 1.3, w: 'fly' }]
            : w === 'want' ? [{ at: 0.8, w: 'want' }, { at: 1.8, w: 'key' }]
            : w === 'let go' ? [{ at: 0.9, w: 'catch' }, { at: 2.7, w: 'let go' }]
            : w === 'ride' ? [{ at: 0.9, w: 'ride' }, { at: 2.9, w: 'up' }, { at: 3.8, w: 'down' }, { at: 4.6, w: 'fire' }]
            : w === 'hold' ? [{ at: 1.2, w }]
            : w === 'fight' ? [{ at: 1.3, w }, { at: 2.1, w }, { at: 2.9, w }]
            : w === 'swim' ? [{ at: 0.5, w }]
            : [{ at: 0.9, w }];
}

function startIntro() {
  runSpeed = speed; speed = 0;            // העולם עומד בזמן ההדגמה
  introWords = [...STAGES[stageIdx].words];
  state = 'intro';
  $('pauseBtn').classList.add('hide');
  $('startBtn').classList.remove('ready');
  introNext();
}

// אחרי ההדגמה – מחכים ל-START (אפשר לשמוע שוב עם Again)
function introNext() {
  if (!introWords.length) {
    setupDemo('idle'); demoSteps = []; heard = null;
    banner = { text: 'Ready? Press START', sub: STAGES[stageIdx].hint, t: 99 };
    introT = 1e9;
    $('startBtn').classList.add('ready');
    return;
  }
  const w = introWords.shift();
  setupDemo(w);
  speak(w);
  banner = { text: 'Say ' + w.toUpperCase() + '!', sub: STAGES[stageIdx].hint, t: 99 };
  introT = w === 'fly' ? 4.6 : w === 'want' || w === 'let go' ? 5 : w === 'ride' ? 6 : w === 'fight' ? 5 : w === 'hold' ? 5 : 2.8;
}

function finishIntro() {
  if (state !== 'intro') return;
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; windLevel = 0; windStreaks = []; demoSteps = []; flash = null; invulnT = 0;
  py = 0; vy = 0; duckT = 0; flyT = 0; kickT = 0; catchT = 0; throwT = 0; resetAct();
  speed = runSpeed; distSinceSpawn = 0; nextGap = speed * 2.4;
  seenWords = [];
  banner = { text: 'Go!', sub: '', t: 1.2 };
  $('skipBtn').classList.add('hide');
  $('pauseBtn').classList.remove('hide');
  state = 'play';
  renderTester();
}
$('skipBtn').onclick = () => { try { speechSynthesis.cancel(); } catch (e) {} finishIntro(); };
$('startBtn').onclick = () => { try { speechSynthesis.cancel(); } catch (e) {} finishIntro(); };
$('againBtn').onclick = () => {
  if (state !== 'intro') return;
  $('startBtn').classList.remove('ready');
  introWords = [...STAGES[stageIdx].words]; introNext();
};

