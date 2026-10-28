/* ninja-voice-game – menu.js
   מסך הפתיחה: רמות קושי ורשת השלבים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מסך פתיחה
   ============================================================ */
// אייקון קטן של הנינג'ה עם סרט בצבע של השחקן – עומד בתחנה שהגיע אליה
function ninjaIcon(color, body) {
  body = body || '#1e293b';
  return '<svg viewBox="0 0 44 46" aria-hidden="true">' +
    '<ellipse cx="22" cy="43" rx="11" ry="2.6" fill="rgba(0,0,0,.25)"/>' +
    '<path d="M12 9.5 q-7 -3 -10 1.5 M12 10.5 q-6 2 -8.5 7" stroke="' + color + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<rect x="13" y="23" width="18" height="17" rx="6" fill="' + body + '"/>' +
    '<rect x="13" y="30" width="18" height="3" fill="' + color + '"/>' +
    '<circle cx="22" cy="16" r="11.5" fill="' + body + '"/>' +
    '<rect x="12.5" y="12" width="19" height="7.5" rx="3.7" fill="#fde2c4"/>' +
    '<circle cx="18.5" cy="15.8" r="1.7" fill="#0f172a"/><circle cx="25.5" cy="15.8" r="1.7" fill="#0f172a"/>' +
    '<rect x="10.5" y="7.5" width="23" height="4" rx="2" fill="' + color + '"/>' +
    '<rect x="15" y="39" width="5" height="4" rx="1.5" fill="' + body + '"/><rect x="24" y="39" width="5" height="4" rx="1.5" fill="' + body + '"/></svg>';
}

function renderMenu() {
  if (player) { $('pchipName').textContent = (isTester() ? '🧪 ' : '') + player.name; $('pchipDot').style.background = player.color; }
  document.querySelectorAll('.diff').forEach(b => b.classList.toggle('sel', b.dataset.diff === diffKey));
  if (!player) return;
  const st = getStation(), learned = getLearned(), pend = pendingWord();
  // המסע: שורת תחנות. כל תחנה = מילה. ירוק = נלמדה, צהוב = נפתחה ומחכה לשיעור, אפור = עוד לא הגענו
  const tr = $('jTrack'); tr.innerHTML = '';
  WORDS.forEach((w, i) => {
    const d = document.createElement('div');
    const cls = i > st ? 'far' : learned.includes(w) ? 'done' : 'wait';
    d.className = 'jNode ' + cls + (i === st ? ' cur' : '') + (i < st ? ' passed' : '');
    d.innerHTML = (i < WORDS.length - 1 ? '<i class="jLine"></i>' : '') +
                  '<div class="jCircle">' + (i > st ? '🔒' : WORD_ICON[w]) +
                  (i === st ? '<div class="jNinja">' + ninjaIcon(player ? player.color : '#dc2626', (shopItem(getEquip().suit) || {}).swatch) + '</div>' : '') + '</div><b>' + (i === WORDS.length - 1 ? '🏁' : i) + '</b>';
    d.title = w.toUpperCase();
    tr.appendChild(d);
  });
  $('jSt').textContent = '🚩 ' + st + ' / ' + (WORDS.length - 1) + '  ·  Record ' + pLoad('jbest_' + diffKey, 0);
  $('jMsg').textContent = pend ? '🔓 ' + pend.toUpperCase() + ' is waiting for you in training!' : st >= WORDS.length - 1 ? 'All words unlocked – how far can you go?' : 'Next station unlocks ' + WORDS[st + 1].toUpperCase();
  $('jGo').textContent = pend ? '🥋 Learn ' + pend.toUpperCase() : st > 0 ? '▶ Continue from 🚩' + st : '▶ Start the journey';
  $('jGo').disabled = !model;
  $('jRestart').classList.toggle('hide', st === 0 || !!pend);
  $('jRestart').disabled = !model;
  renderSideBoard($('jBoard')); renderMyBoard($('meBoard')); showSbTab();
  // אימון: שיעור לכל מילה שנפתחה במסע
  const stars = getStars(), box = $('stages'), open = openWords();
  box.innerHTML = '';
  WORDS.map(w => lessonIdx(w)).filter(i => i >= 0).forEach(i => {                // לפי סדר המסע (השלבים עצמם לא זזים – הכוכבים נשמרים)
    const s = STAGES[i];
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
  $('shopBtnCoins').textContent = isTester() ? '∞' : coinsNow();
  $('orderBtn').classList.toggle('hide', !isTester());
}
$('jGo').onclick = continueJourney;
$('jRestart').onclick = () => play('journey', 0);
$('hintTgl').onclick = () => { pStore('hints', !hintsOn()); renderMenu(); };

document.querySelectorAll('.diff').forEach(b => {
  b.onclick = () => { diffKey = b.dataset.diff; cfg = LEVELS[diffKey]; pStore('difficulty', diffKey); renderMenu(); };
});
$('freeBtn').onclick = openFreePick;

