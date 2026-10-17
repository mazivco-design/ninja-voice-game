/* ninja-voice-game – state.js
   משתני המצב של המשחק, וחלונית הדיבאג
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מצב המשחק
   ============================================================ */
const $ = id => document.getElementById(id);
const canvas = $('c'), ctx = canvas.getContext('2d');

let state = 'menu';           // menu | play | over
let mode = 'free';            // free | stage
let diffKey = 'easy', cfg = LEVELS[diffKey];
let stageIdx = 0, playWords = ['jump', 'down'];
let speed = 0, score = 0, lives = 0, hits = 0, done = 0, spawned = 0, caught = 0, coins = 0;
let pickups = [], picked = 0;   // מטבעות קטנים לאורך המסע – נאספים בנגיעה
let obstacles = [], shurikens = [], particles = [], fireballs = [];
let distSinceSpawn = 0, nextGap = 0, nextType = null, flag = null;
let py = 0, vy = 0, duckT = 0, invulnT = 0, kickT = 0, flyT = 0, catchT = 0, throwT = 0, throwCd = 0;
let flash = null, heard = null, banner = null;
// טיימרים של הפעולות החדשות
const act = { fireCd: 0, stop: 0, run: 0, swim: 0, climb: 0, climbWant: 0, push: 0, pull: 0, pullWant: 0, pulling: 0, hide: 0, block: 0,
              leap: 0, leapWant: 0, roll: 0, rollWant: 0, dive: 0, hiding: 0, crawl: 0, crawlWant: 0 };
let hidingFrom = null;       // השומרים שמתחבאים מהם עכשיו
const HIDE_RANGE = 70;       // מתחבאים כשהשומרים במרחק הזה
const GUARD_PASS = 34;       // כמה מהר השומרים עוברים כשהנינג'ה מתחבא
let climbK = 0;              // התקדמות בטיפוס על הסולם 0→1
function resetAct() { for (const k in act) act[k] = 0; climbK = 0; leapWin = null; hidingFrom = null; hideT = 0; }
let hideT = 0;               // כמה זמן הנינג'ה כבר בשיח (לאנימציה)
// מהירות העולם בפועל: STOP ו-CLIMB עוצרים אותו, RUN מאיץ
function curSpeed() {
  if (merchant && merchant.phase === 'walk') return speed * MERCHANT_WALK;   // עם המפתח ביד – הולכים לאט אל הדלת
  if (act.climb > 0) return CLIFF.ladder / CLIFF.time;         // על הסולם – מתקדמים לאט באלכסון
  if (act.stop > 0 || act.pulling > 0 || act.hiding > 0 || (merchant && merchant.phase !== 'done' && merchant.phase !== 'walk')) return 0;   // …או עומדים ליד הסוחר   // עוצרים / מושכים בחבל / מתחבאים בשיח
  return speed * (act.run > 0 ? RUN_BOOST.mult : 1) * (crawling() ? BRAMBLE.slow : 1);
}
let bgX = 0, lastT = 0;
let world = 0, shakeT = 0;
let sinkT = 0, sinkType = '';   // אנימציית נפילה לתהום / שקיעה במים אחרי כישלון
const SINK_TIME = 0.9;   // world: 0 יער במבוק, 1 כפר בלילה, 2 הרים מושלגים

/* ============================================================
   דיבאג
   ============================================================ */
const dbgLines = {};
function dbg(key, val) {
  dbgLines[key] = val;
  if ($('debug').classList.contains('show')) renderDebug();
}
function renderDebug() {
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = (typeof voiceLogRows !== 'undefined' ? voiceLogRows : []).slice(-25).reverse();
  $('debug').innerHTML = '<div class="dbgText">' + esc(Object.entries(dbgLines).map(([k, v]) => k + ': ' + v).join('\n')) + '</div>' +
    '<div class="dbgHead">Heard log · ' + (typeof voiceLogRows !== 'undefined' ? voiceLogRows.length : 0) + ' <button id="vlogShare">Share</button><button id="vlogCopy">Copy</button><button id="vlogClear">Clear</button></div>' +
    '<div class="dbgText">' + (rows.length ? rows.map(r => esc(r.t + ' ' + r.st + ' @' + r.ob + '  ' + r.w + ' → ' + r.how + (r.c ? ' ' + r.c : ''))).join('\n') : '(nothing yet)') + '</div>';
  $('vlogShare').onclick = () => voiceLogShare();
  $('vlogCopy').onclick = () => { try { navigator.clipboard.writeText(voiceLogReport()); } catch (e) {} };
  $('vlogClear').onclick = () => { voiceLogRows = []; store('vlog', []); renderDebug(); };
}
$('dbgBtn').onclick = () => { $('debug').classList.toggle('show'); renderDebug(); };

