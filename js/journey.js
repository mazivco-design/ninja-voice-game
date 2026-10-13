/* ninja-voice-game – journey.js
   המסע (המסלול המרכזי): תחנות. בכל תחנה נפתחת מילה חדשה, לפי הסדר של WORDS.
   את המילה החדשה לומדים באימון (שיעור), ורק אז היא מצטרפת למסע.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const JOURNEY = { segBase: 8, segStep: 1, segMax: 16, speedStep: 0.02, speedMax: 0.2 };
function segLen(st) { return Math.min(JOURNEY.segMax, JOURNEY.segBase + st * JOURNEY.segStep); }   // כמה מכשולים עד התחנה הבאה
function lessonIdx(w) { return STAGES.findIndex(s => s.words.length === 1 && s.words[0] === w); }   // השיעור של מילה
function isLesson(i) { return STAGES[i] && STAGES[i].words.length === 1; }

// המילים שהשחקן כבר למד (עבר את השיעור שלהן). JUMP ידועה מההתחלה
function getLearned() {
  if (isTester()) return [...WORDS];
  let l = pLoad('learned', null);
  if (!l) {                                                      // שחקן ותיק: מי שקיבל כוכב בשיעור – כבר למד את המילה
    const stars = getStars(); l = ['jump'];
    STAGES.forEach((s, i) => { if (isLesson(i) && (stars[i] || 0) > 0 && !l.includes(s.words[0])) l.push(s.words[0]); });
    pStore('learned', l);
  }
  return l;
}
function isLearned(w) { return !w || getLearned().includes(w); }
function setLearned(w) { const l = getLearned(); if (!l.includes(w)) { l.push(w); pStore('learned', l); } }

// התחנה הרחוקה ביותר שהשחקן הגיע אליה. בתחנה s פתוחות המילים WORDS[0..s]
function getStation(p) {
  if (p ? (p.id === 'tester' || p.name.trim().toLowerCase() === 'tester') : isTester()) return WORDS.length - 1;
  const pre = 'p' + (p || player || {}).id + '_';
  const v = p ? load(pre + 'station', null) : pLoad('station', null);
  if (v !== null) return v;
  let l = p ? load(pre + 'learned', null) : getLearned();       // שחקן ותיק: כמה מילים ברצף כבר למד (לפי הכוכבים)
  if (!l) { const stars = load(pre + 'stars', {}); l = ['jump']; STAGES.forEach((s, i) => { if (isLesson(i) && (stars[i] || 0) > 0) l.push(s.words[0]); }); }
  let s = 0;
  while (s + 1 < WORDS.length && l.includes(WORDS[s + 1])) s++;
  if (!p) pStore('station', s);
  return s;
}
function openWords() { return WORDS.slice(0, getStation() + 1); }                       // מילים שנפתחו במסע
function pendingWord() { const w = WORDS[getStation()]; return isLearned(w) ? null : w; }   // מילה שנפתחה ועוד לא נלמדה
function journeyBest(p, d) { return p ? load('p' + p.id + '_jbest_' + d, 0) : pLoad('jbest_' + d, 0); }

// מילים במסע שיוצא מתחנה st – כל המילים עד התחנה (כולן כבר נלמדו)
function journeyWords(st) { return WORDS.slice(0, Math.min(WORDS.length, st + 1)).filter(w => isLearned(w)); }

let jStation = 0;          // התחנה שממנה יצאנו לקטע הנוכחי

function startJourneySegment(first) {
  playWords = journeyWords(jStation);
  world = jStation % WORLDS.length;
  speed = cfg.speed * (1 + Math.min(JOURNEY.speedMax, jStation * JOURNEY.speedStep));
  spawned = 0; done = 0; flag = null; distSinceSpawn = 0; nextType = pickType(); nextGap = speed * (first ? 2.4 : 1.6);
  $('stageName').textContent = '🚩 ' + jStation + ' → ' + (jStation + 1);
  $('catchHud').classList.toggle('hide', !playWords.includes('catch'));
}

// הגענו לדגל של התחנה
function stationReached() {
  jStation++;
  if (jStation > getStation()) pStore('station', jStation);
  sfx('checkpoint'); confetti();
  const w = WORDS[jStation];
  if (w && !isLearned(w)) {                                      // מילה חדשה נפתחה – הולכים ללמוד אותה
    saveJourneyBest();
    showOver('🚩 Station ' + jStation + '!', '🔓 ' + WORD_ICON[w] + ' ' + w.toUpperCase(),
             'New word unlocked! Learn it in training, then come back to continue.', 'Learn ' + w.toUpperCase() + ' ▶',
             () => play('stage', lessonIdx(w)));
    return;
  }
  banner = { text: '🚩 Station ' + jStation + '!', sub: 'Keep going!', t: 1.8 };   // תחנה שכבר עברנו בעבר – ממשיכים
  startJourneySegment(false);
  renderHud();
}

function saveJourneyBest() {
  const prev = pLoad('jbest_' + diffKey, 0);
  if (score > prev) pStore('jbest_' + diffKey, score);
  return { prev, isNew: score > prev && score > 0 };
}

function journeyOver(byButton) {
  const { prev, isNew } = saveJourneyBest();
  sfx(isNew ? 'record' : 'over');
  if (isNew) confetti();
  const from = getStation();
  showOver(isNew ? '🏆 New record!' : byButton ? 'Well done!' : 'Out of lives!', '🚩 ' + jStation + '  ·  ' + score,
           (isNew ? 'Your best journey run!' : 'Your record: ' + prev) + catchText(),
           'Try again from 🚩' + from, continueJourney);
  if (from > 0) altButton('↺ From start', () => play('journey', 0));
  renderJourneyBoard($('board'));
}

// ממשיכים במסע מהתחנה הרחוקה – ואם יש מילה שמחכה, קודם לומדים אותה
function continueJourney() { const w = pendingWord(); if (w) play('stage', lessonIdx(w)); else play('journey', getStation()); }

// כפתור נוסף בחלון הסיום
function altButton(text, fn) { const b = $('altBtn'); b.textContent = text; b.onclick = fn; b.classList.remove('hide'); }

// טבלת השחקנים: מי הגיע הכי רחוק, ואם שווה – מי צבר יותר בריצה אחת
function renderJourneyBoard(box) {
  const rows = players.map(p => ({ p, s: getStation(p), b: journeyBest(p, diffKey) }))
                      .sort((a, b) => b.s - a.s || b.b - a.b).slice(0, 5);
  if (!rows.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="bt">🏔️ Journey · ' + diffKey + '</div>' +
    rows.map((r, i) => '<div class="br' + (player && r.p.id === player.id ? ' me' : '') + '">' + (['🥇', '🥈', '🥉'][i] || (i + 1) + '.') +
      ' <span class="dot" style="background:' + r.p.color + '"></span><span class="nm"></span><span class="sc">🚩' + r.s +
      ' <small>· ' + r.b + '</small></span></div>').join('');
  box.querySelectorAll('.nm').forEach((el, i) => el.textContent = rows[i].p.name);
}

// רמזים (המילה על המכשול): באימון – לפי המתג. במסע – אין
function hintsOn() { return pLoad('hints', true); }
function labelsVisible() {
  if (state === 'intro' || state === 'demo' || state === 'menu') return true;
  return mode === 'journey' ? false : hintsOn();
}
