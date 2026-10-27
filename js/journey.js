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
  spawned = 0; done = 0; flag = null; segStart = caught + picked; segSettled = false; distSinceSpawn = 0; nextType = pickType(); nextGap = speed * (first ? 2.4 : 1.6);
  $('stageName').textContent = '🚩 ' + jStation + ' → ' + (jStation + 1);
}

// הגענו לדגל של התחנה
function stationReached() {
  settleSegment();                                               // מטבעות הקטע שהסתיים נכנסים לקופה (אם עברו את השיא)
  jStation++;
  if (jStation > getStation()) pStore('station', jStation);
  sfx('checkpoint'); confetti();
  const w = WORDS[jStation];
  if (w && !isLearned(w)) {                                      // מילה חדשה נפתחה – הולכים ללמוד אותה
    saveJourneyBest(); pushHistory();
    showOver('🚩 Station ' + jStation + '!', '🔓 ' + WORD_ICON[w] + ' ' + w.toUpperCase(),
             'New word unlocked! Learn it in training, then come back to continue.' + coinText(), 'Learn ' + w.toUpperCase() + ' ▶',
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
  settleSegment();
  const { prev, isNew } = saveJourneyBest();
  pushHistory();
  sfx(isNew ? 'record' : 'over');
  if (isNew) confetti();
  const from = getStation();
  showOver(isNew ? '🏆 New record!' : byButton ? 'Well done!' : 'Out of lives!', '🚩 ' + jStation + '  ·  ' + score,
           (isNew ? 'Your best journey run!' : 'Your record: ' + prev) + coinText(),
           'Try again from 🚩' + from, continueJourney);
  if (from > 0) altButton('↺ From start', () => play('journey', 0));
  renderJourneyBoard($('board'));
}

// ממשיכים במסע מהתחנה הרחוקה – ואם יש מילה שמחכה, קודם לומדים אותה
function continueJourney() { const w = pendingWord(); if (w) play('stage', lessonIdx(w)); else play('journey', getStation()); }

// כפתור נוסף בחלון הסיום
function altButton(text, fn) { const b = $('altBtn'); b.textContent = text; b.onclick = fn; b.classList.remove('hide'); }

// טבלת השחקנים: מי הגיע הכי רחוק, ואם שווה – מי צבר יותר בריצה אחת
function renderJourneyBoard(box, max) {          // בתפריט: 3 הראשונים, ואם אני לא ביניהם – גם אני (כדי שהתפריט לא יגלוש)
  const all = players.map(p => ({ p, s: getStation(p), b: journeyBest(p, diffKey) }))
                     .sort((a, b) => b.s - a.s || b.b - a.b).map((r, i) => (r.rank = i, r));
  let rows = all.slice(0, max || 5);
  const me = player && all.find(r => r.p.id === player.id);
  if (me && !rows.includes(me)) rows = [...rows, me];
  if (!rows.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="bt">🏔️ Journey · ' + diffKey + '</div>' +
    rows.map(r => '<div class="br' + (player && r.p.id === player.id ? ' me' : '') + '">' + (['🥇', '🥈', '🥉'][r.rank] || (r.rank + 1) + '.') +
      ' <span class="dot" style="background:' + r.p.color + '"></span><span class="nm"></span><span class="sc">🚩' + r.s +
      ' <small>· ' + r.b + '</small></span></div>').join('');
  box.querySelectorAll('.nm').forEach((el, i) => el.textContent = rows[i].p.name);
}

// רשימה אנכית של כל השחקנים ליד התפריט – לפי המיקום
function renderSideBoard(box) {
  const all = players.map(p => ({ p, s: getStation(p), b: journeyBest(p, diffKey) })).sort((a, b) => b.s - a.s || b.b - a.b);
  box.innerHTML = '<div class="sbR sbH"><span class="rk">#</span><span class="nm">Player</span><span class="st">Station</span><span class="pt">Points</span></div>' +
    '<div class="sbSub">' + diffKey + '</div>' + all.map((r, i) => '<div class="sbR' + (player && r.p.id === player.id ? ' me' : '') + '">' +
    '<span class="rk">' + (['🥇', '🥈', '🥉'][i] || (i + 1)) + '</span><span class="dot" style="background:' + r.p.color + '"></span>' +
    '<span class="nm"></span><span class="st">🚩' + r.s + '</span><span class="pt">' + r.b + '</span></div>').join('');
  box.querySelectorAll('.sbR:not(.sbH) .nm').forEach((el, i) => el.textContent = all[i].p.name);
}

// היסטוריית ריצות במסע – 3 האחרונות
function pushHistory() { const h = pLoad('jhist', []); h.unshift({ d: diffKey, s: jStation, p: score, t: Date.now() }); pStore('jhist', h.slice(0, 3)); }

// לשונית "השיאים שלי"
function renderMyBoard(box) {
  if (!player) { box.innerHTML = ''; return; }
  const st = getStation(), learned = getLearned().length, stars = Object.values(getStars()).reduce((a, b) => a + b, 0);
  const row = (k, v) => '<div class="sbR"><span class="nm">' + k + '</span><span class="st">' + v + '</span></div>';
  const hist = pLoad('jhist', []);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  box.innerHTML =
    '<div class="sbSub">Journey</div>' + row('🚩 Farthest station', st) + row('📚 Words learned', learned + ' / ' + WORDS.length) +
    '<div class="sbSub">Best run</div>' + ['easy', 'medium', 'hard'].map(d => row(d[0].toUpperCase() + d.slice(1), journeyBest(player, d))).join('') +
    '<div class="sbSub">Last runs</div>' + (hist.length ? hist.map(h => '<div class="sbR"><span class="nm">' + h.d + ' · ' + ago(h.t) + '</span><span class="st">🚩' + h.s + '</span><span class="pt">' + h.p + '</span></div>').join('') : '<div class="sbR"><span class="nm" style="color:#94a3b8">No runs yet</span></div>') +
    '<div class="sbSub">Training</div>' + row('★ Stars', stars) + row('🟡 Coins', pLoad('coins', 0));
}
let sbTab = 'all';
$('tabAll').onclick = () => { sbTab = 'all'; showSbTab(); };
$('tabMe').onclick = () => { sbTab = 'me'; showSbTab(); };
function showSbTab() {
  $('tabAll').classList.toggle('sel', sbTab === 'all'); $('tabMe').classList.toggle('sel', sbTab === 'me');
  $('jBoard').classList.toggle('hide', sbTab !== 'all'); $('meBoard').classList.toggle('hide', sbTab !== 'me');
}

// רמזים (המילה על המכשול): באימון – לפי המתג. במסע – אין
function hintsOn() { return pLoad('hints', false); }   // ברירת מחדל: בלי רמז
function labelsVisible() {
  if (state === 'intro' || state === 'demo' || state === 'menu' || state === 'studio') return true;
  return mode === 'journey' ? false : hintsOn();
}

/* ---------- 🧭 סדר התחנות (רק ל-tester) ----------
   נעולות: כל התחנות עד הרחוקה ביותר שילד כלשהו הגיע אליה – כדי שאף ילד לא יאבד מילה שפתח או יקבל מילה שלא למד. */
let orderDraft = null;
function orderLockedUpTo() {                                     // אינדקס התחנה האחרונה שנעולה
  let m = 0;
  for (const p of players) if (!(p.id === 'tester' || p.name.trim().toLowerCase() === 'tester')) m = Math.max(m, getStation(p));
  return m;
}
function openOrder() { orderDraft = WORDS.slice(); renderOrder(); hideAllOverlays(); $('orderPick').classList.add('show'); }
function closeOrder() { hideAllOverlays(); renderMenu(); $('menu').classList.add('show'); }
function renderOrder() {
  const lock = orderLockedUpTo(), box = $('orderList'); box.innerHTML = '';
  $('orderInfo').textContent = 'Locked: stations 0–' + lock + ' (the farthest a child has reached)';
  orderDraft.forEach((w, i) => {
    const locked = i <= lock, r = document.createElement('div');
    r.className = 'orow' + (locked ? ' lock' : '');
    r.innerHTML = '<span class="n">' + i + '</span><span>' + (locked ? '🔒' : WORD_ICON[w]) + '</span><span class="w">' + w.toUpperCase() + '</span>';
    const mk = (txt, to) => { const b = document.createElement('button'); b.textContent = txt; b.disabled = locked || to <= lock || to >= orderDraft.length;
      b.onclick = () => { [orderDraft[i], orderDraft[to]] = [orderDraft[to], orderDraft[i]]; renderOrder(); }; r.appendChild(b); };
    mk('▲', i - 1); mk('▼', i + 1);
    box.appendChild(r);
  });
}
function applyOrder(ord) {                                       // משנים את WORDS במקום – כל המשחק קורא ממנו
  WORDS.splice(0, WORDS.length, ...ord);
  store('wordOrder', ord);
  closeOrder();
}
$('orderBtn').onclick = openOrder;
$('orderBack').onclick = closeOrder;
$('orderSave').onclick = () => applyOrder(orderDraft);
$('orderReset').onclick = () => {                                // חזרה לסדר המקורי – רק אם החלק הנעול זהה
  const lock = orderLockedUpTo();
  if (WORDS_DEFAULT.slice(0, lock + 1).join() !== WORDS.slice(0, lock + 1).join()) { $('orderInfo').textContent = 'Can\'t reset: a child already passed stations in the new order.'; return; }
  orderDraft = WORDS_DEFAULT.slice(); renderOrder();
};
