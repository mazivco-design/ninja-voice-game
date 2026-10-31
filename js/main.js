/* ninja-voice-game – main.js
   הלולאה הראשית והכפתורים – נטען אחרון
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   לולאה ראשית
   ============================================================ */
function loop(t) {
  const now = t / 1000;
  const dt = Math.min(0.05, lastT ? now - lastT : 0);
  lastT = now;
  if (state === 'play' || state === 'demo' || state === 'intro') update(dt);
  updateEffects(dt);
  updateMic();
  if (state === 'lab') drawLab(dt); else if (state === 'studio') drawStudio(dt); else draw();
  $('introBar').classList.toggle('hide', state !== 'intro');   // כפתורי Again / START רק בתחילת שלב
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ============================================================
   כפתורים
   ============================================================ */
function toMenu() {
  state = 'menu';
  stopAudio();
  $('skipBtn').classList.add('hide');
  $('labBtn').classList.remove('hide');
  $('pause').classList.remove('show');
  $('pauseBtn').classList.add('hide');
  renderTester();
  $('dict').classList.remove('show');
  stopSpeak();
  $('over').classList.remove('show');
  $('endBtn').classList.add('hide');
  $('hudFree').classList.remove('hide');
  $('hudStage').classList.add('hide');
  $('progress').classList.add('hide');
  $('catchHud').classList.add('hide');
  $('lives').textContent = '';
  obstacles = []; shurikens = []; fireballs = []; pickups = []; merchant = null; rope = null; ride = null; duel = null; fightT = 0; duelBones = []; duelSwords = []; gust = null; lift = null; tunnelWait = null; gustAdv = 0; windLevel = 0; windStreaks = []; particles = []; flag = null;
  py = 0; vy = 0; duckT = 0; invulnT = 0; kickT = 0; flyT = 0; catchT = 0; throwT = 0; resetAct();
  renderMenu();
  if (model) setStatus('Ready!');
  $('menu').classList.add('show');
}
$('menuBtn').onclick = toMenu;
$('endBtn').onclick = () => {
  if (state === 'intro') { stopSpeak(); toMenu(); return; }
  if (state !== 'play') return;
  if (mode === 'free') endFree(true); else if (mode === 'journey') journeyOver(true); else { bankCoins(); toMenu(); }
};

// עצירה: המשחק קופא במקום, ופקודות קוליות לא פועלות עד שממשיכים
function pauseGame() {
  if (state !== 'play') return;
  state = 'paused';
  stopAudio();                                     // בזמן עצירה המיקרופון כבוי
  $('pause').classList.add('show');
}
async function resumeGame() {
  if (state !== 'paused') return;
  if (!(await ensureAudio())) return;              // מדליקים מחדש את המיקרופון (בתוך הלחיצה)
  $('pause').classList.remove('show');
  seenWords = []; lastT = 0;
  state = 'play';
}
$('pauseBtn').onclick = pauseGame;
$('resumeBtn').onclick = resumeGame;
$('pauseMenuBtn').onclick = () => { bankCoins(); toMenu(); };

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pauseGame(); if (state !== 'play' && state !== 'intro') stopAudio(); }   // יצאו מהאפליקציה – עוצרים
  else if (audio) audio.ctx.resume();
});

dbg('model', '—'); dbg('mic', 'off'); dbg('heard', '—'); dbg('command', '—');
renderMenu();
showPlayers();
loadModel();

// ספארי באייפד מתעלם מ-user-scalable=no – חוסמים זום בצביטה ובהקשה כפולה, כדי שהמסך לא "ייתקע" מוגדל בלי הכפתורים
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
let lastTapT = 0;
document.addEventListener('touchend', e => {                     // הקשה כפולה מהירה = זום בספארי – מבטלים
  const t = performance.now(); if (t - lastTapT < 300) e.preventDefault(); lastTapT = t;
}, { passive: false });
