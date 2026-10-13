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
  if (state === 'lab') drawLab(dt); else draw();
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
  $('dict').classList.remove('show');
  try { speechSynthesis.cancel(); } catch (e) {}
  $('over').classList.remove('show');
  $('endBtn').classList.add('hide');
  $('hudFree').classList.remove('hide');
  $('hudStage').classList.add('hide');
  $('progress').classList.add('hide');
  $('catchHud').classList.add('hide');
  $('lives').textContent = '';
  obstacles = []; shurikens = []; fireballs = []; particles = []; flag = null;
  py = 0; vy = 0; duckT = 0; invulnT = 0; kickT = 0; flyT = 0; catchT = 0; throwT = 0; resetAct();
  renderMenu();
  if (model) setStatus('Ready! Choose a stage');
  $('menu').classList.add('show');
}
$('menuBtn').onclick = toMenu;
$('endBtn').onclick = () => {
  if (state === 'intro') { try { speechSynthesis.cancel(); } catch (e) {} toMenu(); return; }
  if (state !== 'play') return;
  if (mode === 'free') endFree(true); else { bankCoins(); toMenu(); }
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
