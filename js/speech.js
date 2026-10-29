/* ninja-voice-game – speech.js
   זיהוי דיבור (Vosk) והפקודות שכל מילה מפעילה
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   זיהוי דיבור – Vosk
   ============================================================ */
let model = null, audio = null, noise = 0.01;
let seenWords = [];   // המילים שכבר הפעלנו במשפט הנוכחי

function setStatus(text, isErr) {
  const s = $('status');
  s.textContent = text;
  s.classList.toggle('err', !!isErr);
}

async function loadModel() {
  if (typeof Vosk === 'undefined') {
    setStatus('Voice library did not load. Check the internet and reload.', true);
    dbg('model', 'Vosk library missing');
    return;
  }
  setStatus('Loading voice engine… (first time can take a minute)');
  dbg('model', 'loading…');
  const t0 = performance.now();
  try {
    model = await Vosk.createModel(MODEL_URL);
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    setStatus('Ready! Choose a stage');
    dbg('model', 'ready (' + secs + 's)');
    renderMenu();
  } catch (e) {
    setStatus('Voice engine failed to load: ' + (e.message || e), true);
    dbg('model', 'ERROR ' + (e.message || e));
  }
}

// מפעיל את המיקרופון בפעם הראשונה (חייב לקרות בתוך לחיצה)
async function ensureAudio() {
  if (audio) { audio.ctx.resume(); return true; }
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  ac.resume();
  dbg('mic', 'requesting…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
    });
    // רשימת מילים סגורה – רק המילים של המשחק. כל השאר "לא מוכר"
    // מקשיבים רק למילים של השלב / של ה-Free Play – פחות מילים = פחות טעויות
    const rec = new model.KaldiRecognizer(ac.sampleRate, JSON.stringify([...listenWords, '[unk]']));
    try { rec.setWords(true); } catch (e) {}                    // ציון ביטחון לכל מילה (בתוצאה הסופית)
    dbg('listening', listenWords.join(', '));
    rec.on('partialresult', m => handleText(m.result.partial, false));
    rec.on('result', m => handleText(m.result.text, true, m.result.result));

    const src = ac.createMediaStreamSource(stream);
    const node = ac.createScriptProcessor(2048, 1, 1);
    node.onaudioprocess = e => { try { rec.acceptWaveform(e.inputBuffer); } catch (err) {} };
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    src.connect(an); src.connect(node); node.connect(ac.destination);

    audio = { ctx: ac, stream, node, rec, an, buf: new Float32Array(1024) };
    $('mic').className = 'on';
    dbg('mic', 'on (' + ac.sampleRate + ' Hz)');
    return true;
  } catch (e) {
    try { ac.close(); } catch (_) {}
    setStatus('Microphone problem: ' + (e.message || e), true);
    dbg('mic', 'ERROR ' + (e.message || e));
    return false;
  }
}

// עוקבים אחרי רצף המילים ששמענו (למשל "down down jump"). seenWords: [{ w, fired }]
// מילה שמתאימה למכשול שעל המסך ("מצופה") מופעלת מיד מהזיהוי החלקי – מהר.
// מילה אחרת מחכה לתוצאה הסופית, שמגיעה עם ציון ביטחון: ציון גבוה – מופעלת (וזו טעות, כמו היום). ציון נמוך – כנראה בלבול עם מילה דומה, מתעלמים.
// אם Vosk "מתקן" את המילה האחרונה (שמע down ואז הבין שזה jump) – מטפלים במילה המתוקנת.
function handleText(text, isFinal, detail) {
  const ok = w => WORDS.includes(w) || ITEM_WORDS.includes(w) || w === 'up' || POWER_WORDS.includes(w);
  const { words, confs } = tokenize(text, detail);
  const exp = expectedWords();
  for (let i = 0; i < words.length; i++) {
    const w = words[i], conf = confs ? confs[i] : undefined, fresh = i >= seenWords.length || (i === words.length - 1 && w !== seenWords[i].w);
    if (!isFinal) {
      if (!fresh) continue;
      if (seenWords[i] && seenWords[i].timer) clearTimeout(seenWords[i].timer);   // Vosk תיקן את המילה האחרונה – הישנה מתבטלת
      const entry = seenWords[i] = { w, fired: false, timer: null };
      if (exp.includes(w)) { entry.fired = true; voiceCommand(w, 'go', undefined, text); }
      else {                                                       // לא מתאימה למכשול – מחכים לציון, אבל לא יותר מ-waitMs (ילד שמדבר ברצף לא מקבל "סופי" בזמן)
        voiceLog(w, 'wait', undefined, text);
        entry.timer = setTimeout(() => { if (!entry.fired) { entry.fired = true; voiceCommand(w, 'late', undefined, text); } }, VOICE.waitMs);
      }
    } else {
      if (seenWords[i] && seenWords[i].fired && !fresh) continue;   // כבר הופעלה מהזיהוי החלקי (או מהטיימר)
      if (seenWords[i] && seenWords[i].timer) clearTimeout(seenWords[i].timer);
      if (conf === undefined || conf >= VOICE.confMin || exp.includes(w)) voiceCommand(w, conf === undefined ? 'go' : 'late', conf, text);
      else voiceLog(w, 'low', conf, text);                      // ביטחון נמוך – כנראה מילה דומה
    }
  }
  if (text) dbg('heard', '"' + text + '"' + (isFinal ? ' (final)' : ''));
  if (isFinal) {
    if (!words.length && /\[unk\]/.test(text || '')) voiceLog('?', 'unk', undefined, text);   // דיבר, ולא זוהתה אף מילה
    seenWords.forEach(e => { if (e && e.timer) clearTimeout(e.timer); });
    seenWords = [];
  }
}

// מפרק את הטקסט למילים של המשחק. "let go" (שתי מילים אצל Vosk) הופך למילה אחת 'let go', עם הציון הנמוך מבין השתיים
function tokenize(text, detail) {
  const ok = w => WORDS.includes(w) || ITEM_WORDS.includes(w) || w === 'up' || POWER_WORDS.includes(w);
  const toks = (text || '').toLowerCase().split(/\s+/).filter(Boolean);
  const dconf = detail && detail.length ? detail.map(d => d.conf) : null;
  const words = [], confs = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === 'let' && toks[i + 1] === 'go') { words.push('let go'); confs.push(dconf ? Math.min(dconf[i], dconf[i + 1]) : undefined); i++; }
    else if (ok(toks[i])) { words.push(toks[i]); confs.push(dconf ? dconf[i] : undefined); }
  }
  return { words, confs: dconf ? confs : null };
}

// המילים שמתאימות למכשולים שעל המסך לפני הנינג'ה (ולסוחר). אם אין כלום – כל המילים של השלב
function expectedWords() { return [...expectedWords0(), ...powerWordsOwned()]; }   // SHIELD / JET – תמיד מופעלות מיד
function expectedWords0() {
  if (merchant && merchant.phase !== 'done' && merchant.phase !== 'walk') return merchant.phase === 'ask' ? ['want'] : merchant.phase === 'choose' ? [...ITEM_WORDS] : [];
  if (duelActive()) return ['fight'];
  if (gustActive()) return ['hold'];
  if (ride && ride.phase === 'wait') return ['ride'];
  if (ride && (ride.phase === 'mount' || ride.phase === 'takeoff')) return ['up', 'down', 'fire'];
  if (rope && rope.phase !== 'done') return rope.phase === 'wait' ? ['catch'] : rope.phase === 'hang' ? ['let go'] : [];
  const pb = playerBox(), out = [];
  for (const o of obstacles) {
    if (o.passed || o.hit || o.caught || o.x + (o.w || 0) < pb.l || o.x > W + 10) continue;
    for (const w of OBSTACLE_WORDS[o.type] || []) if (!out.includes(w)) out.push(w);
  }
  return out.length ? out : [...listenWords];
}

// בזמן שהמילון מקריא מילה, המיקרופון שומע אותה – לא מפעילים אותה פעמיים
let ignoreVoiceUntil = 0, lastLoudT = -1e9;
let listenWords = [...WORDS];          // המילים שהזיהוי מקשיב להן במשחק הנוכחי
function voiceCommand(w, how, conf, text) {
  if (performance.now() < ignoreVoiceUntil) { dbg('heard', w + ' (ignored – speaker)'); voiceLog(w, 'speaker', conf, text); return; }
  if (!listenWords.includes(w)) { dbg('heard', w + ' (ignored – not in this stage)'); voiceLog(w, 'off', conf, text); return; }
  // מילה מתקבלת רק אם המיקרופון קלט קול ברור בשנייה וחצי האחרונות – לא רעש חלש ברקע
  if (performance.now() - lastLoudT > 2500) { dbg('heard', w + ' (ignored – too quiet)'); voiceLog(w, 'quiet', conf, text); return; }
  voiceLog(w, how, conf, text);
  command(w, 'voice');
}

/* ---------- יומן שמיעה – מה האייפד שמע ומה המשחק עשה עם זה. נשמר באייפד, רואים בחלונית הדיבאג ---------- */
// go = הופעלה מיד | late = הופעלה אחרי ציון | wait = מחכה לציון | low = נזרקה (ציון נמוך) | unk = דיבור לא מזוהה | quiet/speaker/off = סוננה
let voiceLogRows = load('vlog', []);
function voiceLog(w, how, conf, text) {
  const near = obstacles.find(o => !o.passed && !o.hit && o.x > PLAYER.x - 5);
  const d = new Date(), hh = n => String(n).padStart(2, '0');
  voiceLogRows.push({ t: hh(d.getHours()) + ':' + hh(d.getMinutes()) + ':' + hh(d.getSeconds()), w, how, c: conf === undefined ? '' : conf.toFixed(2),
                      st: mode === 'journey' ? 'journey' : (STAGES[stageIdx] || {}).name || mode, ob: merchant ? 'merchant' : near ? near.type : '-', h: text || '' });
  if (voiceLogRows.length > VOICE.logMax) voiceLogRows.splice(0, voiceLogRows.length - VOICE.logMax);
  if (how === 'go' || how === 'late') lastFired = { row: voiceLogRows[voiceLogRows.length - 1], at: performance.now() };
  store('vlog', voiceLogRows);
  if ($('debug').classList.contains('show')) renderDebug();
}
function voiceLogText() { return voiceLogRows.map(r => [r.t, r.st, r.ob, r.w, r.how, r.c, r.res || '', r.h].join('\t')).join('\n'); }
// תוצאה: אחרי שמילה הופעלה, האם המכשול הקרוב עבר (ok) או פגע (hit)? מסומן על השורה האחרונה שהופעלה ב-4 השניות האחרונות
let lastFired = null;
function voiceMark(res) {
  if (!lastFired || performance.now() - lastFired.at > 4000 || lastFired.row.res) return;
  lastFired.row.res = res; store('vlog', voiceLogRows);
}

// דוח מלא לשיתוף: כותרת עם פרטי הגרסה, סיכום (כמה מכל סוג, לפי מילה), ואז כל השורות כטבלה
function voiceLogReport() {
  const ver = (document.querySelector('script[src*="speech.js"]') || {}).src || ''; const v = (ver.match(/v=([\w]+)/) || [])[1] || '?';
  const rows = voiceLogRows, cnt = {}, byWord = {}, drops = {}, res = { ok: 0, hit: 0, none: 0 };
  for (const r of rows) {
    cnt[r.how] = (cnt[r.how] || 0) + 1;
    if (r.how === 'go' || r.how === 'late') res[r.res || 'none']++;
    const W = byWord[r.w] = byWord[r.w] || { go: 0, late: 0, low: 0, wait: 0, other: 0 };
    W[r.how in W ? r.how : 'other']++;
    if (r.how === 'low') { const k = r.w + ' near ' + r.ob; drops[k] = (drops[k] || 0) + 1; }   // מה נזרק ליד איזה מכשול – רמז לבלבולים
  }
  const L = [];
  L.push('# Ninja Voice – heard log');
  L.push('version: ' + v + ' · exported: ' + new Date().toISOString() + ' · player: ' + (player ? player.name : '-') + ' · difficulty: ' + diffKey);
  L.push('confMin: ' + VOICE.confMin + ' · waitMs: ' + VOICE.waitMs + ' · rows: ' + rows.length + ' · device: ' + navigator.userAgent);
  L.push('');
  L.push('## Legend');
  L.push('go = fired at once (expected word) · late = fired after final result with confidence · wait = deferred, waiting for confidence · low = dropped (confidence < confMin)');
  L.push('unk = speech heard but no word recognized · quiet / speaker / off = filtered (too quiet / game speaker / not in this stage)');
  L.push('');
  L.push('## Summary by outcome');
  Object.entries(cnt).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => L.push(k.padEnd(8) + n));
  L.push('');
  L.push('## Fired words – what happened next (within 4 s)');
  L.push('ok = next obstacle cleared · hit = got hit · none = nothing nearby / unknown');
  L.push('ok      ' + res.ok); L.push('hit     ' + res.hit); L.push('none    ' + res.none);
  L.push('');
  L.push('## Summary by word (go / late / low / wait / other)');
  Object.entries(byWord).sort((a, b) => a[0].localeCompare(b[0])).forEach(([w, W]) => L.push(w.padEnd(8) + [W.go, W.late, W.low, W.wait, W.other].join(' / ')));
  if (Object.keys(drops).length) { L.push(''); L.push('## Dropped (low confidence) – word near obstacle'); Object.entries(drops).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => L.push(k.padEnd(22) + n)); }
  L.push('');
  L.push('## Rows (time, stage, obstacle, word, outcome, confidence, result, heard text)');
  L.push(['time', 'stage', 'obstacle', 'word', 'outcome', 'conf', 'result', 'heard'].join('\t'));
  L.push(voiceLogText());
  return L.join('\n');
}
async function voiceLogShare() {                               // שיתוף דרך חלון השיתוף של אייפד (Claude / קבצים / מייל), ואם אין – הורדה
  const text = voiceLogReport(), name = 'ninja-voice-heard-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt';
  try {
    const file = new File([text], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Ninja Voice heard log' }); return; }
    if (navigator.share) { await navigator.share({ text, title: 'Ninja Voice heard log' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = name; a.click();
}

// מד עוצמה – הנורית נדלקת ברגע שמתחילים לדבר
function updateMic() {
  if (!audio) return;
  audio.an.getFloatTimeDomainData(audio.buf);
  let s = 0;
  for (let i = 0; i < audio.buf.length; i++) s += audio.buf[i] * audio.buf[i];
  const rms = Math.sqrt(s / audio.buf.length);
  const loud = rms > Math.max(0.012, noise * 3);
  if (loud) lastLoudT = performance.now();
  if (!loud) noise = noise * 0.97 + rms * 0.03;
  $('mic').className = loud ? 'loud' : 'on';
}

/* ============================================================
   פקודות – פועלות מיד, גם אם זו לא המילה הנכונה למכשול
   ============================================================ */
function command(word, source) {
  dbg('command', word + ' (' + source + ')');
  if (state !== 'play' && !((state === 'demo' || state === 'intro') && source === 'demo')) return;   // במילון ובהדגמה – רק ההדגמה מזיזה את הנינג'ה
  heard = { text: word.toUpperCase(), t: 0.8 };

  if (word === 'jump') {
    if (py === 0) { vy = cfg.jumpV; py = 0.001; duckT = 0; sfx('jump'); }   // קופץ גם מתוך התכופפות
  } else if (word === 'up') { rideLane(true); }                       // UP – הדרקון עולה לגובה העליון
  else if (word === 'ride') { rideCmd(); }                             // RIDE – עולים על הדרקון
  else if (word === 'down') {
    if (rideLane(false)) return;           // על הדרקון – יורדים לגובה התחתון
    duckT = DUCK_TIME;                     // כל "down" נוסף מאריך את ההתכופפות
    flyT = 0;
    if (py > 0) vy = Math.min(vy, -60);    // באוויר – נוחת מהר
  } else if (word === 'kick') {
    kickT = KICK.time;                     // בעיטה – שוברת קיר שקרוב מספיק
    duckT = 0;
  } else if (word === 'throw') {
    if (throwCd <= 0) {                    // זורק שוריקן קדימה
      const pb = playerBox();
      shurikens.push({ x: pb.r, y: pb.t + 5, rot: 0 });
      throwCd = SHURIKEN.cooldown; throwT = 0.25;
    }
  } else if (word === 'catch') {
    if (ropeCatch()) return;               // תופס את החבל מעל התהום
    catchT = 0.4;                          // תופס מטבע שקרוב מספיק
    const s = obstacles.find(o => o.type === 'coin' && !o.caught && !o.passed &&
                                  o.x + 3 >= PLAYER.x - COIN.reachBack && o.x <= PLAYER.x + COIN.reachFwd * reachMul());
    if (s) catchCoin(s);
  } else if (word === 'fly') {
    if (py > 0 && flyT <= 0) {             // FLY עובד רק באוויר – אחרי קפיצה
      flyT = FLY.time; duckT = 0;
      burst(PLAYER.x + 4, GROUND - py - 16, '#f8fafc', 6);
    }
  } else if (word === 'stop') { act.stop = STOP_TIME; act.run = 0; }       // העולם עוצר
  else if (word === 'run')   { act.run = RUN_BOOST.time; act.stop = 0; }   // דוהר מהר
  else if (word === 'swim')  { act.swim = SWIM_TIME; duckT = 0; }
  else if (word === 'climb') { act.climbWant = 0.8; }                     // מטפס כשהנינג'ה מגיע לסולם (אם זה קורה בשנייה הקרובה)
  else if (word === 'push')  { act.push = 0.6; duckT = 0; }
  else if (word === 'pull')  { act.pull = 0.6; act.pullWant = GATE.want; duckT = 0; }   // מושך כשמגיעים לחבל
  else if (word === 'hide')  { act.hide = HIDE_TIME; duckT = 0; }
  else if (word === 'block') { act.block = BLOCK_TIME; }
  else if (word === 'leap') {                                             // זינוק: אם יש חלון קרוב – מזנק כשמגיעים אליו
    const v = Math.max(curSpeed(), 1), pb = playerBox();
    const win = obstacles.find(o => o.type === 'window' && !o.leapt && o.x - pb.r > WINDOW.range && o.x - pb.r <= WINDOW.range + v * LEAP.want);
    if (win) act.leapWant = LEAP.want;
    else if (py <= 0 && act.leap <= 0) { act.leap = LEAP.free; leapWin = null; }
    duckT = 0;
  }
  else if (word === 'dive')  { act.dive = DIVE_TIME; duckT = 0; }
  else if (word === 'fire') {                                            // כדור אש קדימה – שובר קיר קרח
    if (!(act.fireCd > 0)) { const pb = playerBox(); fireballs.push(rideCtl() ? { x: PLAYER.x + 23, y: GROUND - ride.py - 4, t: 0 } : { x: pb.r + 1, y: pb.t + 5, t: 0 }); act.fireCd = FIREBALL.cooldown; throwT = 0.25; duckT = 0; sfx('jump'); }
  }
  else if (word === 'shield') shieldCmd();                                // SHIELD – בועת מגן (מהחנות)
  else if (word === 'jet') jetCmd();                                      // JET – תרמיל סילון (מהחנות)
  else if (word === 'hold') holdCmd();                                    // HOLD – נתפס בגזע הבמבוק
  else if (word === 'fight') fightCmd();                                  // FIGHT – הנפת חרב
  else if (word === 'let go') ropeLetGo();                               // LET GO – משחררים את החבל
  else if (word === 'want') merchantWant();                              // I WANT – הסוחר שואל: איזה?
  else if (ITEMS[word]) merchantItem(word);                              // שם חפץ – מבקשים אותו מהסוחר
  else if (word === 'crawl') { act.crawlWant = BRAMBLE.want; act.crawl = BRAMBLE.want; duckT = 0; }   // נשכב וזוחל מיד
}

// מקלדת – לבדיקה במחשב
const KEYS = { KeyX: 'crawl', KeyA: 'leap', KeyV: 'dive', Space: 'jump', ArrowUp: 'jump', ArrowDown: 'down', KeyK: 'kick', KeyT: 'throw', KeyC: 'catch', KeyF: 'fly',
               KeyS: 'stop', KeyR: 'run', KeyW: 'swim', KeyL: 'climb', KeyO: 'push', KeyU: 'pull', KeyH: 'hide', KeyB: 'block', KeyE: 'fire', KeyG: 'let go', KeyD: 'ride', KeyQ: 'up', KeyZ: 'fight', KeyY: 'hold', KeyI: 'shield', KeyJ: 'jet' };
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;      // כותבים שם – לא מפעילים פקודות
  if (e.code === 'Escape' || e.code === 'KeyP') { state === 'paused' ? resumeGame() : pauseGame(); return; }
  if (KEYS[e.code]) { command(KEYS[e.code], 'key'); e.preventDefault(); }
});

