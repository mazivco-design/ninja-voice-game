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
  stopSpeak();
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
    b.innerHTML = '<div class="nj">' + ninjaIcon(p.color) + '</div>' +              // נינג'ה קטן בצבע של השחקן
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
  $('manageBtn').textContent = managing ? '✓ Done' : 'Manage players';
  renderWelcomeScene(); requestAnimationFrame(renderWelcomeScene);            // הנוף של הר פוג'י מאחור
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
  renderWelcomeScene(); requestAnimationFrame(renderWelcomeScene);
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
// כניסה לבודק: גוררים את הידית עד סוף המסילה. עוזבים באמצע – הידית חוזרת להתחלה
document.querySelectorAll('.testerSlide').forEach(b => {
  const knob = b.querySelector('.tsKnob');
  let startX = null, dx = 0;
  const maxX = () => b.clientWidth - knob.offsetWidth - 8;
  const setX = x => { dx = Math.max(0, Math.min(maxX(), x)); knob.style.transform = 'translateX(' + dx + 'px)'; b.setAttribute('aria-valuenow', Math.round(dx / maxX() * 100)); };
  const reset = () => { startX = null; b.classList.remove('dragging', 'done'); setX(0); };
  knob.addEventListener('pointerdown', e => { e.preventDefault(); startX = e.clientX - dx; b.classList.add('dragging'); knob.setPointerCapture(e.pointerId); });
  knob.addEventListener('pointermove', e => { if (startX !== null) setX(e.clientX - startX); });
  const release = () => {
    if (startX === null) return;
    b.classList.remove('dragging'); startX = null;
    if (dx >= maxX() - 4) { b.classList.add('done'); setTimeout(() => { reset(); managing = false; selectPlayer(TESTER); }, 180); }
    else setX(0);
  };
  ['pointerup', 'pointercancel'].forEach(ev => knob.addEventListener(ev, release));
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
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; lift = null; mud = null; boat = null; cart = null; boarS = null; jetS = null; wolfS = null; tunnelWait = null; skyPrizes = []; gustAdv = 0; windLevel = 0; windStreaks = []; particles = []; flag = null; banner = null; flash = null; heard = null;
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

// קול: הקלטות של כל מילה ומשפט (קול "Sarah" למילים, audio/voice/). VOICE_VER – משנים כשמחליפים הקלטות, כדי שהדפדפן לא ישתמש בישנות. אם הקלטה לא נטענת – הקול של הדפדפן כגיבוי
const VOICE_VER = 'kai4';
const VOICE_CLIPS = {"jump": "jump", "down": "down", "kick": "kick", "throw": "throw", "catch": "catch", "fly": "fly", "stop": "stop", "run": "run", "swim": "swim", "climb": "climb", "push": "push", "pull": "pull", "hide": "hide", "block": "block", "leap": "leap", "dive": "dive", "crawl": "crawl", "fire": "fire", "let go": "let-go", "ride": "ride", "fight": "fight", "hold": "hold", "up": "up", "want": "want", "key": "key", "rope": "rope", "torch": "torch", "what do you want?": "what-do-you-want", "i have a key": "i-have-a-key", "a rope": "a-rope", "and a torch": "and-a-torch", "which one?": "which-one", "here you go!": "here-you-go", "hmm, that won't open the door.": "hmm-that-won-t-open-the-door", "shield": "shield", "jet": "jet", "pick up": "pick-up", "put down": "put-down", "i want a key": "i-want-a-key", "i want a rope": "i-want-a-rope", "i want a torch": "i-want-a-torch", "hmm, that won't help here.": "hmm-that-won-t-help-here", "help": "help", "help!": "help", "hold on!": "hold-on", "let's push!": "let-s-push", "jump in!": "jump-in", "can you help me push?": "can-you-help-me-push", "kid: one": "kid-one", "friend: can you help me push?": "friend-can-you-help-me-push", "friend: jump in!": "friend-jump-in", "friend: stuck again!": "friend-stuck-again", "friend: let's push!": "friend-lets-push", "kid: two": "kid-two", "kid: three": "kid-three", "kid: can you help me push?": "kid-can-you-help-me-push", "kid: jump in!": "kid-jump-in", "kid: thank you!": "kid-thank-you", "kid: wait for three!": "kid-wait-for-three", "kid: again": "kid-again", "great job!": "great-job", "friend: i'm coming!": "friend-coming", "friend: ready?": "friend-ready", "friend: catch!": "friend-catch", "friend: oops! again!": "friend-oops-again", "friend: hold on!": "friend-hold-on", "friend: hold on tight!": "friend-hold-on-tight", "friend: almost...": "friend-almost", "friend: you did it!": "friend-you-did-it", "friend: anytime, buddy!": "friend-anytime-buddy", "friend: see you!": "friend-see-you", "friend: hi! my boat is stuck in the sand.": "friend-hi-stuck", "friend: can you help me?": "friend-can-you-help-me", "friend: great! let's push together!": "friend-great-lets-push", "friend: thanks for your help! see you!": "friend-thanks-see-you", "ninja: bye!": "ninja-bye", "yes": "yes", "ninja: thank you!": "ninja-thank-you", "what would you like?": "what-would-you-like", "i want a key, please": "i-want-a-key-please", "i want a rope, please": "i-want-a-rope-please", "i want a torch, please": "i-want-a-torch-please", "sneak": "sneak", "put on": "put-on", "merchant: hi there!": "merchant-hi-there", "ninja: hi!": "ninja-hi"};
const voiceAudio = {};
let voiceNow = null;
// מנגנים דרך Web Audio (אותו מנגנון של צלילי המשחק): נפתח פעם אחת בנגיעה הראשונה, ואז עובד בכל מקום – גם במסע בלי הדגמה.
// ועוד הגברה (כשהמיקרופון פועל, האייפד מנמיך את הצלילים), עם מגביל כדי שלא יתעוות
const VOICE_GAIN = 2.6;
const voiceBuf = {}, voiceLoading = {};
let voiceOut = null, voiceSrc = null;
function voiceChain() {
  if (voiceOut || !sfxCtx) return voiceOut;
  const g = sfxCtx.createGain(), c = sfxCtx.createDynamicsCompressor();
  g.gain.value = VOICE_GAIN; c.threshold.value = -10; c.knee.value = 6; c.ratio.value = 8; c.attack.value = 0.003; c.release.value = 0.15;
  g.connect(c); c.connect(sfxCtx.destination); voiceOut = g; return g;
}
function voiceLoad(slug) {
  if (voiceBuf[slug] || voiceLoading[slug] || !sfxCtx) return voiceLoading[slug];
  return voiceLoading[slug] = fetch('audio/voice/' + slug + '.mp3?v=' + VOICE_VER).then(r => r.arrayBuffer())
    .then(b => new Promise((res, rej) => sfxCtx.decodeAudioData(b, res, rej)))
    .then(buf => { voiceBuf[slug] = buf; return buf; }).catch(() => { delete voiceLoading[slug]; return null; });
}
function voicePreload() { if (!sfxCtx) return; for (const slug of new Set(Object.values(VOICE_CLIPS))) voiceLoad(slug); }
document.addEventListener('pointerdown', () => setTimeout(voicePreload, 50), { capture: true });   // אחרי שהצליל נפתח בנגיעה
function playVoiceBuf(buf) {
  const out = voiceChain(); if (!out) return false;
  if (sfxCtx.state !== 'running') { try { sfxCtx.resume(); } catch (e) {} return false; }   // ההקשר מושהה (קורה באייפד אחרי קול של הדפדפן) – מנגנים בנגן הרגיל במקום לשתוק
  if (voiceSrc) { try { const g0 = voiceSrc.g, t0 = sfxCtx.currentTime; g0.gain.setValueAtTime(g0.gain.value, t0); g0.gain.linearRampToValueAtTime(0, t0 + 0.04); voiceSrc.stop(t0 + 0.05); } catch (e) {} }   // הקול הקודם דועך במקום להיחתך (אחרת נשמע "תק")
  const src = sfxCtx.createBufferSource(), g = sfxCtx.createGain(); src.buffer = buf; src.connect(g); g.connect(out); src.g = g; src.start();
  voiceSrc = src;
  ignoreVoiceUntil = performance.now() + buf.duration * 1000 + 450;          // לא לשמוע את הקול של המשחק עצמו
  src.onended = () => { if (voiceSrc === src) voiceSrc = null; };
  return true;
}
function speak(w) {
  voiceSaid = (performance.now() < ignoreVoiceUntil ? voiceSaid + ' | ' : '') + String(w).toLowerCase();   // מה המשחק אומר עכשיו – רק המילים האלה ייחשבו הד מהרמקול
  const slug = VOICE_CLIPS[String(w).toLowerCase()];
  if (slug && muted) return;
  if (slug && sfxCtx) {
    try { speechSynthesis.cancel(); } catch (e) {}
    if (voiceBuf[slug]) { if (playVoiceBuf(voiceBuf[slug])) return; }
    else {                                                                      // עוד לא נטען – טוענים ומנגנים מיד כשמוכן (אם עדיין רלוונטי)
      const asked = performance.now();
      const p = voiceLoad(slug);
      if (p) { p.then(buf => { if (buf && performance.now() - asked < 1200) playVoiceBuf(buf); else if (!buf) speakFile(w, slug); }); return; }
    }
  }
  if (slug) { speakFile(w, slug); return; }
  speakSynth(w);
}
function speakFile(w, slug) {                                                   // גיבוי: נגן רגיל של הדפדפן
  try {
    try { speechSynthesis.cancel(); } catch (e) {}
    if (voiceNow) { voiceNow.pause(); voiceNow.currentTime = 0; }
    const a = voiceAudio[slug] || (voiceAudio[slug] = new Audio('audio/voice/' + slug + '.mp3?v=' + VOICE_VER));
    voiceNow = a; a.currentTime = 0; a.muted = muted; a.volume = 1;
    ignoreVoiceUntil = performance.now() + 1600;
    a.onended = () => { ignoreVoiceUntil = performance.now() + 400; };
    const p = a.play();
    if (p && p.catch) p.catch(() => speakSynth(w));
  } catch (e) { speakSynth(w); }
}
function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) {} if (voiceNow) { try { voiceNow.pause(); voiceNow.currentTime = 0; } catch (e) {} } if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} voiceSrc = null; } }
function speakSynth(w) {
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w === 'want' ? 'I want' : String(w).replace(/^(ninja|friend|kid|merchant): /i, ''));   // בלי שם הדובר
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
  if (w !== 'help' && w !== 'push together' && w !== 'push on three' && w !== 'fishing' && w !== 'boar' && w !== 'jetpack' && w !== 'wolves') speak(w);
  document.querySelectorAll('.word').forEach(b => b.classList.toggle('active', b.dataset.w === w));
  resetDemo();
  setupDemo(w);
  demoSteps.forEach(st => st.at -= 0.45);   // במילון – הפעולה מגיעה מהר יותר
}

function demoAuto(pb, dt) {
  demoClock += dt;
  while (demoSteps.length && demoClock >= demoSteps[0].at) { const s = demoSteps.shift(); if (s.say) { speak(s.w); if (banner) banner.text = 'Say ' + s.w.toUpperCase() + '!'; } command(s.w, 'demo'); }
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
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; lift = null; mud = null; boat = null; cart = null; boarS = null; jetS = null; wolfS = null; tunnelWait = null; skyPrizes = []; gustAdv = 0; windLevel = 0; windStreaks = []; flash = null; invulnT = 0;
  py = 0; vy = 0; duckT = 0; flyT = 0; kickT = 0; catchT = 0; throwT = 0; resetAct();
  demoSteps = []; demoClock = 0;
  const near = PLAYER.x + PLAYER.w;
  if (w === 'kick')  obstacles.push({ type: 'wall',  x: near + 6 });
  if (w === 'throw') obstacles.push({ type: 'enemy', x: near + 55 });
  if (w === 'catch') obstacles.push({ type: 'coin',  x: near + 12 });
  if (w === 'stop')  obstacles.push({ type: 'rock',  x: near + 18 });
  if (w === 'swim')  obstacles.push({ type: 'lake',  x: PLAYER.x - 16, w: 44, wet: true, swam: true });
  if (w === 'climb') obstacles.push({ type: 'cliff', x: near + CLIFF.ladder });
  if (w === 'push')  obstacles.push({ type: 'boulder', x: near + 14 });
  if (w === 'pull')  obstacles.push({ type: 'gate',  x: near + GATE.rope + 0.5 });
  if (w === 'leap')  obstacles.push({ type: 'window', x: near + 3 });
  if (w === 'dive')  obstacles.push({ type: 'pond', x: PLAYER.x - 14, w: 50 });
  if (w === 'crawl') obstacles.push({ type: 'bramble', x: near + 3, w: tunnelW() });
  if (w === 'hide')  obstacles.push({ type: 'guard', x: near + 14 });
  if (w === 'block') obstacles.push({ type: 'arrows', x: near + 28 });
  if (w === 'fire')  obstacles.push({ type: 'ice', x: near + 30 });
  if (w === 'want')  obstacles.push({ type: 'door', x: near + DOOR.stopAt - 2 });
  if (w === 'ride') obstacles.push({ type: 'dragon', x: near + DRAGON.stopAt - 1, w: DRAGON.w });
  if (w === 'let go') obstacles.push({ type: 'chasm', x: near + ROPE.stopAt - 2, w: CHASM.w });
  if (w === 'fight') obstacles.push({ type: 'duel', x: near + 40, w: 8 });
  if (w === 'pick up' || w === 'put down') { const o = { type: 'lift', x: near + 1 }; liftKindNext = w === 'pick up' ? 'grab' : 'wall'; liftSetup(o); obstacles.push(o); }
  if (w === 'help') { const o = { type: 'mud', x: PLAYER.x + 4 - MUD.stuck, w: MUD.w + MUD.stand + 8 }; obstacles.push(o); }   // נתקע מיד – והחבר בא (mud.js מפעיל CATCH / HOLD בהדגמה)
  if (w === 'push together') { const o = { type: 'boat' }; boatSetup(o); o.x = PLAYER.x + PLAYER.w + BOAT.stepDX - BOAT.bx0; obstacles.push(o); }   // מתחיל צמוד לסירה (boat.js מפעיל PUSH / JUMP בהדגמה)
  if (w === 'fishing') { const o = { type: 'boat', mode: 'fish' }; boatSetup(o); o.x = PLAYER.x + PLAYER.w + BOAT.stepDX - o.bx; obstacles.push(o); }   // הסירה במים והחבר בתוכה
  if (w === 'push on three') { const o = { type: 'cart' }; cartSetup(o); o.x = PLAYER.x + PLAYER.w + CART.stepDX + CART.watch - CART.cp0; obstacles.push(o); }   // מתחיל מול הילד (cart.js מפעיל PUSH / JUMP בהדגמה)
  if (w === 'wolves') { const o = { type: 'wolfden' }; wfSetup(o); o.x = PLAYER.x + PLAYER.w - WF.stop; obstacles.push(o); }   // עומד על הסלע (wolves.js מפעיל CATCH / HOLD / LET GO בהדגמה)
  if (w === 'jetpack') { const o = { type: 'jetgap' }; jsSetup(o); o.x = PLAYER.x + PLAYER.w - JS.stop; obstacles.push(o); }   // עומד ליד התרמיל (jetstage.js מפעיל את ההדגמה)
  if (w === 'boar') { const o = { type: 'boar' }; boarSetup(o); o.x = PLAYER.x + PLAYER.w - BOAR.tree0 - o.lead + boarStandGap(0); obstacles.push(o); }   // עומד ליד העץ הראשון (boar.js מפעיל HIDE בהדגמה)
  if (w === 'hold') obstacles.push({ type: 'gust', x: near + 1 - GUST.stalks[2], w: GUST.stalks[2] + 4 });
  obstacles.forEach(o => { o.passed = false; o.hit = false; o.demo = true; });   // בהדגמה – בלי פגיעות
  demoSteps = w === 'fly' ? [{ at: 0.9, w: 'jump' }, { at: 1.3, w: 'fly' }]
            : w === 'want' ? [{ at: 8.2, w: 'want' }, { at: 9.9, w: 'key' }]   // אחרי השלום
            : w === 'let go' ? [{ at: 0.9, w: 'catch' }, { at: 2.7, w: 'let go' }]
            : w === 'ride' ? [{ at: 0.9, w: 'ride' }, { at: 2.9, w: 'up' }, { at: 3.8, w: 'down' }, { at: 4.6, w: 'fire' }]
            : w === 'hold' ? [{ at: 1.2, w }]
            : w === 'help' || w === 'push together' || w === 'push on three' || w === 'fishing' || w === 'boar' || w === 'jetpack' || w === 'wolves' ? []
            : w === 'pick up' ? [{ at: 0.8, w }]
            : w === 'put down' ? [{ at: 0.8, w: 'pick up', say: true }, { at: 3.0, w }, { at: 4.4, w: 'jump', say: true }]
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
  if (w !== 'help' && w !== 'push together' && w !== 'push on three' && w !== 'fishing' && w !== 'boar' && w !== 'jetpack' && w !== 'wolves') speak(w);                                                  // HELP: הנינג'ה עצמו צועק בסצנה
  banner = { text: w === 'help' ? 'CATCH the rope, then HOLD!' : w === 'push together' ? 'PUSH with your friend, then JUMP in!' : w === 'push on three' ? 'PUSH on THREE, then JUMP in!' : w === 'fishing' ? 'THROW the line, then PULL!' : w === 'boar' ? 'SNEAK when he eats · HIDE when the ears move!' : w === 'jetpack' ? 'PICK UP · PUT ON · FLY!' : w === 'wolves' ? 'CATCH the rope · HOLD · LET GO!' : 'Say ' + w.toUpperCase() + '!', sub: STAGES[stageIdx].hint, t: 99 };
  introT = w === 'fly' ? 4.6 : w === 'want' ? 12.8 : w === 'let go' ? 5 : w === 'ride' ? 6 : w === 'fight' ? 5 : w === 'hold' ? 5 : w === 'put down' ? 6.8 : w === 'pick up' ? 2.8 : w === 'crawl' ? 5.2 : w === 'help' ? 12.7 : w === 'push together' ? 14 : w === 'push on three' ? 31 : w === 'fishing' ? 12.5 : w === 'boar' ? 10 : w === 'jetpack' ? 14 : w === 'wolves' ? 16 : 2.8;
}

function finishIntro() {
  if (state !== 'intro') return;
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; lift = null; mud = null; boat = null; cart = null; boarS = null; jetS = null; wolfS = null; tunnelWait = null; skyPrizes = []; gustAdv = 0; windLevel = 0; windStreaks = []; demoSteps = []; flash = null; invulnT = 0;
  py = 0; vy = 0; duckT = 0; flyT = 0; kickT = 0; catchT = 0; throwT = 0; resetAct();
  speed = runSpeed; distSinceSpawn = 0; nextGap = speed * 2.4; liftKindNext = null; liftIdx = 0; ptIdx = 0; merchNext = 'key';   // PICK UP: הסצנות מתחילות מההתחלה
  seenWords = [];
  banner = { text: 'Go!', sub: '', t: 1.2 };
  $('skipBtn').classList.add('hide');
  $('pauseBtn').classList.remove('hide');
  state = 'play';
  renderTester();
}
$('skipBtn').onclick = () => { stopSpeak(); finishIntro(); };
$('startBtn').onclick = () => { stopSpeak(); finishIntro(); };
$('againBtn').onclick = () => {
  if (state !== 'intro') return;
  $('startBtn').classList.remove('ready');
  introWords = [...STAGES[stageIdx].words]; introNext();
};

