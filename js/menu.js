/* ninja-voice-game – menu.js
   מסך הפתיחה: רמות קושי ורשת השלבים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מסך פתיחה
   ============================================================ */
function renderMenu() {
  if (player) { $('pchipName').textContent = (isTester() ? '🧪 ' : '') + player.name; $('pchipDot').style.background = player.color; }
  document.querySelectorAll('.diff').forEach(b => b.classList.toggle('sel', b.dataset.diff === diffKey));
  const stars = getStars();
  const box = $('stages');
  box.innerHTML = '';
  STAGES.forEach((s, i) => {
    const unlocked = isUnlocked(i, stars);
    const got = stars[i] || 0;
    const b = document.createElement('button');
    b.className = 'stage' + (unlocked ? '' : ' locked');
    b.disabled = !model || !unlocked;
    b.innerHTML = '<div class="num">' + (unlocked ? (i + 1) : '🔒') + '</div>' +
                  '<div class="info"><div class="name">' + s.name + '</div>' +
                  '<div class="stars">' + (unlocked ? '★'.repeat(got) + '☆'.repeat(3 - got) : '&nbsp;') + '</div></div>';
    b.onclick = () => play('stage', i);
    box.appendChild(b);
  });
  $('freeBtn').disabled = !model;
}

document.querySelectorAll('.diff').forEach(b => {
  b.onclick = () => { diffKey = b.dataset.diff; cfg = LEVELS[diffKey]; pStore('difficulty', diffKey); renderMenu(); };
});
$('freeBtn').onclick = openFreePick;

