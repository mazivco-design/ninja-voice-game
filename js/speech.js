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
    dbg('listening', listenWords.join(', '));
    rec.on('partialresult', m => handleText(m.result.partial, false));
    rec.on('result', m => handleText(m.result.text, true));

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

// עוקבים אחרי רצף המילים ששמענו (למשל "down down jump").
// כל מילה חדשה בסוף הרצף מפעילה פקודה מיד.
// אם Vosk "מתקן" את המילה האחרונה (שמע down ואז הבין שזה jump) – מפעילים את המילה המתוקנת.
function handleText(text, isFinal) {
  const words = (text || '').toLowerCase().split(/\s+/).filter(w => WORDS.includes(w));
  for (let i = 0; i < words.length; i++) {
    if (i >= seenWords.length) {
      seenWords.push(words[i]);
      voiceCommand(words[i]);
    } else if (i === words.length - 1 && words[i] !== seenWords[i]) {
      seenWords[i] = words[i];
      voiceCommand(words[i]);
    }
  }
  if (text) dbg('heard', '"' + text + '"' + (isFinal ? ' (final)' : ''));
  if (isFinal) seenWords = [];
}

// בזמן שהמילון מקריא מילה, המיקרופון שומע אותה – לא מפעילים אותה פעמיים
let ignoreVoiceUntil = 0, lastLoudT = -1e9;
let listenWords = [...WORDS];          // המילים שהזיהוי מקשיב להן במשחק הנוכחי
function voiceCommand(w) {
  if (performance.now() < ignoreVoiceUntil) { dbg('heard', w + ' (ignored – speaker)'); return; }
  if (!listenWords.includes(w)) { dbg('heard', w + ' (ignored – not in this stage)'); return; }
  // מילה מתקבלת רק אם המיקרופון קלט קול ברור בשנייה וחצי האחרונות – לא רעש חלש ברקע
  if (performance.now() - lastLoudT > 1500) { dbg('heard', w + ' (ignored – too quiet)'); return; }
  command(w, 'voice');
}

// מד עוצמה – הנורית נדלקת ברגע שמתחילים לדבר
function updateMic() {
  if (!audio) return;
  audio.an.getFloatTimeDomainData(audio.buf);
  let s = 0;
  for (let i = 0; i < audio.buf.length; i++) s += audio.buf[i] * audio.buf[i];
  const rms = Math.sqrt(s / audio.buf.length);
  const loud = rms > Math.max(0.02, noise * 4);
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
  } else if (word === 'down') {
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
    if (!(act.fireCd > 0)) { const pb = playerBox(); fireballs.push({ x: pb.r + 1, y: pb.t + 5, t: 0 }); act.fireCd = FIREBALL.cooldown; throwT = 0.25; duckT = 0; sfx('jump'); }
  }
  else if (word === 'crawl') { act.crawlWant = BRAMBLE.want; act.crawl = BRAMBLE.want; duckT = 0; }   // נשכב וזוחל מיד
}

// מקלדת – לבדיקה במחשב
const KEYS = { KeyX: 'crawl', KeyA: 'leap', KeyV: 'dive', Space: 'jump', ArrowUp: 'jump', ArrowDown: 'down', KeyK: 'kick', KeyT: 'throw', KeyC: 'catch', KeyF: 'fly',
               KeyS: 'stop', KeyR: 'run', KeyW: 'swim', KeyL: 'climb', KeyO: 'push', KeyU: 'pull', KeyH: 'hide', KeyB: 'block', KeyE: 'fire' };
window.addEventListener('keydown', e => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;      // כותבים שם – לא מפעילים פקודות
  if (e.code === 'Escape' || e.code === 'KeyP') { state === 'paused' ? resumeGame() : pauseGame(); return; }
  if (KEYS[e.code]) { command(KEYS[e.code], 'key'); e.preventDefault(); }
});

