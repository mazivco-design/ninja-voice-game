/* ninja-voice-game – sound.js
   צלילים שנוצרים בקוד, וכפתור השתקה
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   צלילים – נוצרים בקוד (בלי קבצים). כפתור 🔊 בפינה משתיק
   ============================================================ */
let sfxCtx = null, muted = false;
try { muted = JSON.parse(localStorage.getItem('ninjaVoice_mute') || 'false'); } catch (e) {}
function sfxInit() {
  try { if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); if (sfxCtx.state !== 'running') sfxCtx.resume(); } catch (e) {}
}
function tone(f0, f1, dur, type, vol, delay) {
  const c = sfxCtx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
}
function noiseBurst(dur, vol) {
  const c = sfxCtx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = vol;
  src.buffer = b; src.connect(f); f.connect(g); g.connect(c.destination); src.start();
}
const SFX = {
  jump: () => tone(320, 760, 0.14, 'square', 0.06),
  clear: () => tone(700, 1050, 0.08, 'triangle', 0.09),
  coin: () => { tone(988, 0, 0.07, 'square', 0.07); tone(1319, 0, 0.22, 'square', 0.07, 0.07); },
  hit: () => { noiseBurst(0.22, 0.35); tone(220, 70, 0.25, 'sawtooth', 0.08); },
  checkpoint: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0, 0.16, 'triangle', 0.1, i * 0.08)),
  record: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, 0, 0.18, 'square', 0.07, i * 0.09)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0, 0.25, 'triangle', 0.1, i * 0.1)),
  clash: () => { tone(2400, 1500, 0.09, 'square', 0.045); tone(3100, 0, 0.32, 'triangle', 0.05, 0.01); tone(1650, 0, 0.26, 'triangle', 0.04, 0.01); },
  pop: () => { noiseBurst(0.12, 0.25); tone(900, 1800, 0.12, 'sine', 0.08); },
  squawk: () => { tone(1400, 900, 0.09, 'square', 0.05); tone(1500, 1000, 0.1, 'square', 0.05, 0.11); },
  wind: () => noiseBurst(1.2, 0.22),
  swish: () => tone(900, 260, 0.11, 'sawtooth', 0.025),
  over: () => [440, 349, 262].forEach((f, i) => tone(f, 0, 0.3, 'triangle', 0.1, i * 0.18))
};
// רעש רוח רציף (לשלב HOLD): רעש לבן בלולאה דרך מסנן, העוצמה לפי חוזק הרוח
let windNode = null;
function windSound(level) {
  if (!sfxCtx) return;
  try {
    if (!windNode) {
      if (level <= 0) return;
      const c = sfxCtx, n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      let last = 0; for (let i = 0; i < n; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }   // רעש "חום" רך
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = b; src.loop = true; f.type = 'bandpass'; f.Q.value = 0.7; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
      windNode = { f, g };
    }
    const t = sfxCtx.currentTime, on = !muted && (state === 'play' || state === 'intro' || state === 'demo');
    windNode.g.gain.setTargetAtTime(on ? Math.pow(Math.min(1, level), 1.3) * 0.45 : 0, t, 0.15);
    windNode.f.frequency.setTargetAtTime(300 + 900 * level + 180 * Math.sin(t * 2.3), t, 0.2);   // שריקה שעולה ויורדת
  } catch (e) {}
}
setInterval(() => { if (windNode && typeof state !== 'undefined' && state !== 'play' && state !== 'intro' && state !== 'demo') windSound(0); }, 250);   // השהיה / סוף משחק – שקט
function sfx(name) { if (muted || !sfxCtx || !SFX[name]) return; try { SFX[name](); } catch (e) {} }
document.addEventListener('pointerdown', sfxInit, { capture: true });

