/* ============================================================
   line-up/js/voice.js – הקול של המשחק (הקלטות Michael) וזיהוי הדיבור (Vosk).
   ההקלטות נמצאות ב־audio/voice/ (משותפות לארקייד). כל דובר מנגן אותן במהירות קצת אחרת,
   כך שהנינג'ות בתור נשמעים צעירים יותר מהמוכר.
   ============================================================ */

const MODEL_URL = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';
const VOICE_VER = 'michael3';
const LU_KEY = 'ninjaVoice_lineup_';

// משפט → שם הקובץ
const CLIPS = {
  'What do you want?': 'what-do-you-want',
  'Here you go!': 'here-you-go',
  'I want noodles, please.': 'i-want-noodles-please',
  'I want cake, please.': 'i-want-cake-please',
  'I want ice cream, please.': 'i-want-ice-cream-please',
  'I want a cookie, please.': 'i-want-a-cookie-please',
  'Yum!': 'yum',
  'Great job!': 'great-job',
  'Dessert time!': 'dessert-time',
};

let actx = null, voiceOut = null, voiceSrc = null;
const bufs = {};
let ignoreUntil = 0;                  // בזמן שהמשחק מדבר – לא מקשיבים (אחרת המיקרופון שומע את הרמקול)

function audioInit() {
  if (actx) { try { actx.resume(); } catch (e) {} return; }
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const g = actx.createGain(), c = actx.createDynamicsCompressor();
  g.gain.value = 2.4; c.threshold.value = -10; c.knee.value = 6; c.ratio.value = 8; c.attack.value = 0.003; c.release.value = 0.15;
  g.connect(c); c.connect(actx.destination); voiceOut = g;
  try { actx.resume(); } catch (e) {}
  for (const slug of new Set(Object.values(CLIPS))) loadClip(slug);
}
function loadClip(slug) {
  if (bufs[slug]) return Promise.resolve(bufs[slug]);
  return fetch('../audio/voice/' + slug + '.mp3?v=' + VOICE_VER).then(r => r.arrayBuffer())
    .then(b => new Promise((res, rej) => actx.decodeAudioData(b, res, rej)))
    .then(buf => (bufs[slug] = buf)).catch(() => null);
}
// מנגן משפט. מחזיר את משך הדיבור בשניות (גם אם אין הקלטה – הערכה לפי האורך)
async function playLine(text, rate) {
  rate = rate || 1;
  const slug = CLIPS[text];
  if (!actx || !slug) return text.length * 0.07;
  const buf = await loadClip(slug);
  if (!buf) return text.length * 0.07;
  try { if (actx.state !== 'running') actx.resume(); } catch (e) {}
  if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} }
  const src = actx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(voiceOut); src.start();
  voiceSrc = src;
  const dur = buf.duration / rate;
  ignoreUntil = performance.now() + dur * 1000 + 450;
  return dur;
}

/* ---------- זיהוי דיבור ---------- */
// דקדוק סגור: רק המילים של הסיטואציות. ביטוי "ice cream" מאוחד בטוקניזציה.
const GRAMMAR = ['i', 'want', 'noodles', 'noodle', 'please', 'cake', 'ice', 'cream', 'a', 'cookie', 'cookies'];
let model = null, rec = null, mic = null, noise = 0.01, lastLoudT = -1e9;
let listener = null;                  // פונקציה שמקבלת את המילים ששמענו בתור הילד (או null כשלא מקשיבים)
let heardNow = [];                    // המילים של המשפט הנוכחי (מהזיהוי החלקי)

function setStatus(t) { document.getElementById('status').textContent = t || ''; }

async function loadModel() {
  if (typeof Vosk === 'undefined') { setStatus('ספריית הקול לא נטענה – בדקו אינטרנט'); logRow('model', 'Vosk missing'); return; }
  try {
    const t0 = performance.now();
    model = await Vosk.createModel(MODEL_URL);
    logRow('model', 'ready ' + ((performance.now() - t0) / 1000).toFixed(1) + 's');
    attachRecognizer();
  } catch (e) { setStatus('מנוע הקול לא נטען'); logRow('model', 'ERROR ' + (e.message || e)); }
}

// חייב לקרות בתוך נגיעה (הרשאת מיקרופון)
async function micInit() {
  if (mic) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    const src = actx.createMediaStreamSource(stream), an = actx.createAnalyser();
    an.fftSize = 1024; src.connect(an);
    mic = { stream, src, an, buf: new Float32Array(1024) };
    logRow('mic', 'on ' + actx.sampleRate + 'Hz');
    attachRecognizer();
    return true;
  } catch (e) { setStatus('אין גישה למיקרופון – אפשר לגעת בבועה במקום לדבר'); logRow('mic', 'ERROR ' + (e.message || e)); return false; }
}

function attachRecognizer() {
  if (!model || !mic || rec) return;
  rec = new model.KaldiRecognizer(actx.sampleRate, JSON.stringify([...GRAMMAR, '[unk]']));
  rec.on('partialresult', m => onText(m.result.partial, false));
  rec.on('result', m => onText(m.result.text, true));
  const node = actx.createScriptProcessor(2048, 1, 1);
  node.onaudioprocess = e => { try { rec.acceptWaveform(e.inputBuffer); } catch (err) {} };
  mic.src.connect(node); node.connect(actx.destination);
  mic.node = node;
  logRow('listen', GRAMMAR.join(' '));
}
function voiceReady() { return !!rec; }

function tokens(text) {
  const t = (text || '').toLowerCase().split(/\s+/).filter(w => w && w !== '[unk]'), out = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === 'ice' && t[i + 1] === 'cream') { out.push('ice cream'); i++; }
    else if (t[i] === 'noodle') out.push('noodles');
    else if (t[i] === 'cookies') out.push('cookie');
    else if (t[i] === 'ice' || t[i] === 'cream') out.push('ice cream');   // חצי מהביטוי – מספיק
    else out.push(t[i]);
  }
  return out;
}
function onText(text, isFinal) {
  if (!text) return;
  const ws = tokens(text);
  if (performance.now() < ignoreUntil) { if (isFinal) logRow('speaker', text); return; }
  if (performance.now() - lastLoudT > 2500) { if (isFinal) logRow('quiet', text); return; }
  heardNow = ws;
  if (isFinal) logRow(listener ? 'heard' : 'off', text);
  if (listener) listener(ws, isFinal);
  if (isFinal) heardNow = [];
}
// עוצמת המיקרופון – רק קול ברור נחשב (נקרא בכל פריים)
function micLevel() {
  if (!mic) return 0;
  mic.an.getFloatTimeDomainData(mic.buf);
  let s = 0; for (let i = 0; i < mic.buf.length; i++) s += mic.buf[i] * mic.buf[i];
  const rms = Math.sqrt(s / mic.buf.length), loud = rms > Math.max(0.012, noise * 3);
  if (loud) lastLoudT = performance.now(); else noise = noise * 0.97 + rms * 0.03;
  return loud ? Math.min(1, rms * 12) : 0;
}

/* ---------- יומן שמיעה (כפתור 🐞) ---------- */
let logRows = [];
try { logRows = JSON.parse(localStorage.getItem(LU_KEY + 'vlog') || '[]'); } catch (e) {}
function logRow(kind, text) {
  const d = new Date(), hh = n => String(n).padStart(2, '0');
  logRows.push(hh(d.getHours()) + ':' + hh(d.getMinutes()) + ':' + hh(d.getSeconds()) + '\t' + (window.luStep || '-') + '\t' + kind + '\t' + text);
  if (logRows.length > 400) logRows.splice(0, logRows.length - 400);
  try { localStorage.setItem(LU_KEY + 'vlog', JSON.stringify(logRows)); } catch (e) {}
  const pre = document.getElementById('dbgLog'); if (pre && pre.offsetParent) pre.textContent = logRows.slice().reverse().join('\n');
}
document.getElementById('dbgBtn').onclick = () => {
  const d = document.getElementById('dbg'); d.style.display = 'flex';
  document.getElementById('dbgLog').textContent = logRows.slice().reverse().join('\n');
};
document.getElementById('dbgClose').onclick = () => { document.getElementById('dbg').style.display = 'none'; };
document.getElementById('dbgShare').onclick = () => {
  const text = '# Line Up – heard log\n' + navigator.userAgent + '\n\n' + logRows.join('\n');
  if (navigator.share) navigator.share({ title: 'Line Up heard log', text }).catch(() => {});
  else navigator.clipboard && navigator.clipboard.writeText(text);
};
