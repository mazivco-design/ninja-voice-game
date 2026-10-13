/* ninja-voice-game – players.js
   שמירה ב-iPad: שחקנים, כוכבים, שיאים, ליגות, מילים פתוחות
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   שמירה ב-iPad: שחקנים, ולכל שחקן – קושי, כוכבים, שיא, מטבעות
   ============================================================ */
function store(key, val) { try { localStorage.setItem('ninjaVoice_' + key, JSON.stringify(val)); } catch (e) {} }
function load(key, def) {
  try { const v = localStorage.getItem('ninjaVoice_' + key); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
}

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#db2777', '#ca8a04', '#0d9488'];
let players = load('players', []);   // [{ id, name, color }]
let player = null;                    // השחקן שמשחק עכשיו

// כל מה ששייך לשחקן נשמר עם התחילית שלו
function pStore(k, v) { if (player) store('p' + player.id + '_' + k, v); }
function pLoad(k, def) { return player ? load('p' + player.id + '_' + k, def) : def; }
function loadDiff() { const d = pLoad('difficulty', 'easy'); return LEVELS[d] ? d : 'easy'; }
function getStars() { return pLoad('stars', {}); }               // { "0": 3, "1": 2, ... }
function getBest(d) { return pLoad('best_' + d + '_' + leagueOf(playWords.length), 0); }   // שיא בריצה האינסופית – לפי רמה וליגה
// ליגות: משווים רק שחקנים שרצו עם מספר דומה של מילים
const LEAGUES = { rookie: { name: 'Rookie League', icon: '🥉', max: 4 }, ninja: { name: 'Ninja League', icon: '🥈', max: 10 }, master: { name: 'Master League', icon: '🥇', max: 99 } };
function leagueOf(n) { return n <= 4 ? 'rookie' : n <= 10 ? 'ninja' : 'master'; }
const ENDLESS = { lives: 3, ramp: 0.012, maxMult: 1.6 };
const MILESTONES = { 10: '🥉 Bronze!', 20: '🥈 Silver!', 30: '🥇 Gold!', 50: '💎 Diamond!', 75: '👑 Legend!', 100: '🐉 Dragon Master!' };
let runBest = 0, recordShown = false;
function endlessProgress() {
  if (runBest > 0 && score > runBest && !recordShown) {           // שבירת שיא באמצע הריצה
    recordShown = true; sfx('record'); confetti();
    banner = { text: '🏆 NEW RECORD!', sub: 'Keep going!', t: 2 };
    return;
  }
  if (score % 10 === 0) {                                          // תחנה כל 10 מכשולים
    sfx('checkpoint');
    banner = { text: MILESTONES[score] || ('⭐ ' + score + '!'), sub: '', t: 1.6 };
    for (let i = 0; i < 18; i++) burst(PLAYER.x + 4, GROUND - 10, ['#fde047', '#f472b6', '#60a5fa'][i % 3], 1, 40);
  }
}
function renderBoard(diff, lg) {                                  // שלושת השיאים הכי גבוהים באייפד, באותה ליגה ורמה
  const rows = players.map(p => ({ p, b: load('p' + p.id + '_best_' + diff + '_' + lg, 0) })).filter(r => r.b > 0)
                      .sort((a, b) => b.b - a.b).slice(0, 3);
  const box = $('board');
  if (!rows.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="bt">' + LEAGUES[lg].icon + ' ' + LEAGUES[lg].name + ' · ' + diff + '</div>' +
    rows.map((r, i) => '<div class="br' + (player && r.p.id === player.id ? ' me' : '') + '">' + ['🥇', '🥈', '🥉'][i] +
      ' <span class="dot" style="background:' + r.p.color + '"></span><span class="nm"></span><span class="sc">' + r.b + '</span></div>').join('');
  box.querySelectorAll('.nm').forEach((el, i) => el.textContent = rows[i].p.name);
}
function playerColor() { return player ? player.color : '#dc2626'; }
function savePlayers() { store('players', players); }

function createPlayer(name, color) {
  const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, color };
  const first = players.length === 0;
  players.push(p); savePlayers();
  if (first) migrateOld(p);
  return p;
}

// הכוכבים והשיאים מהגרסאות הקודמות עוברים לשחקן הראשון
function migrateOld(p) {
  const pre = 'p' + p.id + '_';
  const st = load('stars', null); if (st) store(pre + 'stars', st);
  const d = load('difficulty', null); if (d) store(pre + 'difficulty', d);
  for (const k of Object.keys(LEVELS)) {
    let old = 0;
    try { old = parseInt(localStorage.getItem('ninjaVoiceBest_' + k)) || 0; } catch (e) {}
    const b = Math.max(old, load('best_' + k, 0));
    if (b) store(pre + 'best_' + k, b);
  }
}

function deletePlayer(id) {
  const pre = 'ninjaVoice_p' + id + '_';
  try { Object.keys(localStorage).filter(k => k.startsWith(pre)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  players = players.filter(p => p.id !== id); savePlayers();
  if (player && player.id === id) { player = null; store('current', null); }
}

function totalStars(p) {
  const st = load('p' + p.id + '_stars', {});
  return Object.values(st).reduce((a, b) => a + b, 0);
}

// מטבעות שנאספו נכנסים לקופה של השחקן (פעם אחת לכל משחק)
let banked = false;
function bankCoins() {
  if (banked || !caught) return;
  banked = true;
  pStore('coins', pLoad('coins', 0) + caught);
}

// בודק מובנה – לא צריך ליצור אותו, ולא מופיע ברשימת השחקנים.
// נכנסים אליו בהחזקה של שנייה על 🧪 הקטן בפינה. הכל פתוח, וההתקדמות שלו נפרדת.
const TESTER = { id: 'tester', name: 'Tester', color: '#64748b', builtIn: true };
function isTester() { return !!player && (player.id === 'tester' || player.name.trim().toLowerCase() === 'tester'); }
function isUnlocked(i, stars) { return isTester() || i === 0 || (stars[i - 1] || 0) > 0; }

// ב-Free Play משתמשים בכל המילים מהשלבים שכבר נפתחו
// מילה נפתחת כשהשלב הראשון שמלמד אותה נפתח
function unlockedWords() {
  const stars = getStars(), set = new Set();
  STAGES.forEach((s, i) => { if (isUnlocked(i, stars)) s.words.forEach(w => set.add(w)); });
  return WORDS.filter(w => set.has(w));
}
// המילים שהשחקן בחר ל-Free Play (נשמר לכל שחקן). ברירת מחדל: כל המילים הפתוחות
function freeWords() {
  const open = unlockedWords();
  const sel = (pLoad('freeSel', null) || open).filter(w => open.includes(w));
  return sel.length ? sel : open;
}

let freeSel = [];
function openFreePick() {
  hideAllOverlays();
  freeSel = freeWords();
  renderFreePick();
  $('freePick').classList.add('show');
}
function renderFreePick() {
  const open = unlockedWords(), grid = $('freeGrid');
  const lg = LEAGUES[leagueOf(freeSel.length)];
  $('freeInfo').textContent = lg.icon + ' ' + lg.name + ' · ' + freeSel.length + ' words · Record: ' + pLoad('best_' + diffKey + '_' + leagueOf(freeSel.length), 0);
  grid.innerHTML = '';
  WORDS.forEach(w => {
    const b = document.createElement('button');
    const isOpen = open.includes(w), on = freeSel.includes(w);
    b.className = 'word' + (!isOpen ? ' locked' : on ? '' : ' off');
    b.disabled = !isOpen;
    b.innerHTML = '<span class="ic">' + (isOpen ? WORD_ICON[w] : '🔒') + '</span>' + w.toUpperCase() +
                  (isOpen ? '' : '<span class="lock">locked</span>');
    b.onclick = () => {
      if (on && freeSel.length === 1) { $('freeErr').textContent = 'Choose at least one word'; return; }
      freeSel = on ? freeSel.filter(x => x !== w) : [...freeSel, w];
      $('freeErr').textContent = '';
      renderFreePick();
    };
    grid.appendChild(b);
  });
}
$('freeStart').onclick = () => { pStore('freeSel', freeSel); play('free'); };
$('freeBack').onclick = () => { hideAllOverlays(); $('menu').classList.add('show'); };

