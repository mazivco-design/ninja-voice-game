/* ninja-voice-game – menu.js
   מסך הפתיחה: רמות קושי ורשת השלבים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מסך פתיחה
   ============================================================ */
function renderMenu() {
  if (player) { $('pchipName').textContent = (isTester() ? '🧪 ' : '') + player.name; $('pchipDot').style.background = player.color; }
  document.querySelectorAll('.diff').forEach(b => b.classList.toggle('sel', b.dataset.diff === diffKey));
  if (!player) return;
  const st = getStation(), learned = getLearned(), pend = pendingWord();
  // המסע: שורת תחנות. כל תחנה = מילה. ירוק = נלמדה, צהוב = נפתחה ומחכה לשיעור, אפור = עוד לא הגענו
  const tr = $('jTrack'); tr.innerHTML = '';
  WORDS.forEach((w, i) => {
    const d = document.createElement('div');
    d.className = 'jDot' + (i > st ? ' far' : learned.includes(w) ? ' done' : ' wait') + (i === st ? ' cur' : '');
    d.innerHTML = '<span>' + (i > st ? '🔒' : WORD_ICON[w]) + '</span><b>' + i + '</b>';
    d.title = w.toUpperCase();
    tr.appendChild(d);
  });
  $('jSt').textContent = '🚩 ' + st + ' / ' + (WORDS.length - 1) + '  ·  Record ' + pLoad('jbest_' + diffKey, 0);
  $('jMsg').textContent = pend ? '🔓 ' + pend.toUpperCase() + ' is waiting for you in training!' : st >= WORDS.length - 1 ? 'All words unlocked – how far can you go?' : 'Next station unlocks ' + WORDS[st + 1].toUpperCase();
  $('jGo').textContent = pend ? '🥋 Learn ' + pend.toUpperCase() : st > 0 ? '▶ Continue from 🚩' + st : '▶ Start the journey';
  $('jGo').disabled = !model;
  $('jRestart').classList.toggle('hide', st === 0 || !!pend);
  $('jRestart').disabled = !model;
  renderSideBoard($('jBoard'));
  // אימון: שיעור לכל מילה שנפתחה במסע
  const stars = getStars(), box = $('stages'), open = openWords();
  box.innerHTML = '';
  STAGES.forEach((s, i) => {
    if (!isLesson(i)) return;
    const w = s.words[0], unlocked = open.includes(w), got = stars[i] || 0;
    const b = document.createElement('button');
    b.className = 'stage' + (unlocked ? '' : ' locked') + (w === pend ? ' pend' : '');
    b.disabled = !model || !unlocked;
    b.innerHTML = '<div class="num">' + (unlocked ? WORD_ICON[w] : '🔒') + '</div>' +
                  '<div class="info"><div class="name">' + w.toUpperCase() + '</div>' +
                  '<div class="stars">' + (unlocked ? '★'.repeat(got) + '☆'.repeat(3 - got) : '&nbsp;') + '</div></div>';
    b.onclick = () => play('stage', i);
    box.appendChild(b);
  });
  $('hintTgl').textContent = hintsOn() ? '💡 Hints: ON' : '💡 Hints: OFF';
  $('hintTgl').classList.toggle('off', !hintsOn());
  $('freeBtn').disabled = !model;
}
$('jGo').onclick = continueJourney;
$('jRestart').onclick = () => play('journey', 0);
$('hintTgl').onclick = () => { pStore('hints', !hintsOn()); renderMenu(); };

document.querySelectorAll('.diff').forEach(b => {
  b.onclick = () => { diffKey = b.dataset.diff; cfg = LEVELS[diffKey]; pStore('difficulty', diffKey); renderMenu(); };
});
$('freeBtn').onclick = openFreePick;

