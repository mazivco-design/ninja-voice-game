/* ninja-voice-game – snowball.js
   קרב כדורי שלג (שלב בפיתוח, 2026-11-24): יטי שובב מאחורי חומת שלג, והנינג'ה מאחורי חומה משלו.
   היטי מציץ ומניף כדור – DUCK: הנינג'ה מתכופף, והכדור מתנפץ על החומה שלו. לא התכופף – SPLAT על הפנים (בלי לבבות).
   אחרי שהיטי זרק הוא נשאר בחוץ וצוחק – THROW: הנינג'ה קם וזורק. שלוש פגיעות – היטי מנופף בדגל לבן.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const SB = { e0: 14, wallN: 19, wallY: 70, yeti: 74, w: 92, hp: 3, wind: 1.4, fly: 0.95, laugh: 3.2, hide: 1.0, hint: 3.5, hintEvery: 5, coins: 4, walkV: 15 };
const SB_CHIP = { duck: 'DUCK', throw: 'THROW' };
let sbS = null;
const sbE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const sbL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function sbNX() { return PLAYER.x + 4; }
function sbSetup(o) { o.w = SB.w; }
function sbStart(o) {
  sbS = { o, yp: 'hidden', yt: 0, np: 'stand', nt: 0, n: SB.e0, hp: SB.hp, idle: 0, hinted: 0, held: null, balls: [], puffs: [], splat: 0, hurt: 0, chipOk: 0, chipW: null, round: 0, first: 1 };
}
function sbY(p) { sbS.yp = p; sbS.yt = 0; }
function sbN(p) { sbS.np = p; sbS.nt = 0; }
function sbIdle() { sbS.idle = 0; sbS.hinted = 0; }

/* ---------- העדכון ---------- */
function sbUpdate(dt, pb) {
  if (!sbS) {
    const o = obstacles.find(o => o.type === 'snowfight' && !o.passed && sbNX() >= o.x + SB.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    sbStart(o); return;
  }
  const S = sbS, o = S.o; S.yt += dt; S.nt += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.splat > 0) S.splat -= dt;
  if (!obstacles.includes(o)) { sbS = null; return; }
  const demo = state !== 'play';
  if (demo) {
    const w = (sbExpected() || [])[0];
    const ready = w === 'duck' ? S.yp === 'wind' && S.yt > 0.5 : w === 'throw' ? S.yt > 0.7 : false;
    if (w && ready) { command(w, 'demo'); speak(w); }
  }
  /* ---- היטי ---- */
  switch (S.yp) {
    case 'hidden': if (S.yt >= (S.first ? 1.2 : SB.hide)) { S.first = 0; sbY('wind'); sbIdle(); } break;       // מתחבא – ואז מציץ עם כדור
    case 'wind': if (S.yt >= SB.wind) { sbY('throw'); sbThrowBall(-1); } break;    // מניף את הכדור מעל הראש
    case 'throw': if (S.yt >= 0.35) { sbY('laugh'); sbIdle(); } break;
    case 'laugh':                                                                  // נשאר בחוץ וצוחק – עכשיו THROW
      if (S.held === 'throw' && S.np !== 'throwing') { S.held = null; sbNinjaThrow(); }
      if (S.yt >= SB.laugh && S.np !== 'throwing' && !S.balls.some(b => b.dir > 0)) { sbY('hidden'); if (S.np === 'duck') sbN('stand'); }
      break;
    case 'hurt': if (S.yt >= 0.9) { if (S.hp <= 0) { sbY('give'); sbN('win'); sfx('win'); } else { sbY('hidden'); if (S.np === 'duck') sbN('stand'); } } break;
    case 'give': if (S.yt >= 2.2 && S.np === 'win') sbN('exit'); break;            // דגל לבן
  }
  /* ---- הנינג'ה ---- */
  switch (S.np) {
    case 'stand': if (S.held === 'duck') { S.held = null; sbN('duck'); } break;
    case 'duck': break;
    case 'throwing':
      if (S.nt >= 0.38 && !S.thrown) { S.thrown = 1; sbThrowBall(1); }
      if (S.nt >= 0.8) sbN('stand');
      break;
    case 'win': break;
    case 'exit': {
      S.n += SB.walkV * dt;
      const over = o.x + S.n - sbNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + SB.yeti < -30 || S.nt > 10) {
        cleared(o); sbS = null;
        if (mode === 'journey' && state === 'play') { picked += SB.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + SB.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  /* ---- הכדורים ---- */
  for (const b of S.balls) {
    if (b.dir < 0 && !b.wall && S.np === 'duck' && b.t < 0.75) { b.wall = 1; b.x1 = SB.wallN + 1.5; b.y1 = -7; }   // התכופף בזמן שהכדור באוויר – הוא נוחת על החומה
    b.t += dt / b.T; const k = Math.min(1, b.t);
    b.x = sbL(b.x0, b.x1, k); b.y = sbL(b.y0, b.y1, k) - Math.sin(k * Math.PI) * b.arc;
    if (k >= 1 && !b.done) { b.done = 1; sbLand(b); }
  }
  S.balls = S.balls.filter(b => !b.done);
  for (const p of S.puffs) p.t += dt;
  S.puffs = S.puffs.filter(p => p.t < 0.7);
  // רמזים
  const want = (sbExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > (want === 'duck' ? 0.6 : SB.hint) + S.hinted * SB.hintEvery && (want !== 'duck' || !S.hinted)) { S.hinted++; speak(want); }
  }
}
function sbThrowBall(dir) {
  const S = sbS;
  if (dir < 0) {                                                                  // היטי זורק אל הנינג'ה
    const duck = S.np === 'duck';
    S.balls.push({ dir, x0: SB.yeti - 2, y0: -19, x1: duck ? SB.wallN + 1.5 : S.n + 0.5, y1: duck ? -7 : -12.5, t: 0, T: SB.fly, arc: 7, x: 0, y: 0 });
  } else {                                                                        // הנינג'ה זורק אל היטי
    const up = S.yp === 'laugh' || S.yp === 'throw';
    S.balls.push({ dir, x0: S.n + 2.5, y0: -14, x1: up ? SB.yeti - 1 : SB.yeti - 6, y1: up ? -16 : -8, t: 0, T: 0.55, arc: 6, x: 0, y: 0 });
  }
  sfx('swish');
}
function sbLand(b) {
  const S = sbS;
  if (b.dir < 0) {
    if (S.np === 'duck' || b.x1 < S.n + 0.5 - 0.1 && b.x1 > SB.wallN) { S.puffs.push({ x: b.x, y: b.y, t: 0 }); sfx('thud'); floatText(S.o.x + SB.wallN, GROUND - 16, 'Phew!', '#0ea5e9'); }   // מתנפץ על החומה
    else { S.splat = 1.3; S.puffs.push({ x: b.x, y: b.y, t: 0 }); sfx('splash'); floatText(S.o.x + S.n, GROUND - 22, 'SPLAT!', '#0ea5e9'); }
  } else {
    if (S.yp === 'laugh' || S.yp === 'throw') { S.hp--; S.hurt = 1; sbY('hurt'); sfx('hit'); S.puffs.push({ x: b.x, y: b.y, t: 0 }); floatText(S.o.x + SB.yeti, GROUND - 30, S.hp > 0 ? 'BONK!' : 'BONK! ⭐', '#ca8a04'); }
    else { S.puffs.push({ x: b.x, y: b.y, t: 0 }); sfx('thud'); }                 // היטי מוסתר – הכדור פוגע בחומה שלו
  }
}
function sbNinjaThrow() { const S = sbS; S.thrown = 0; sbN('throwing'); sbIdle(); }
function sbPhysics() { if (!sbS) return false; vy = 0; py = 0; return true; }
function sbSpeed() { return sbS ? 0 : null; }

/* ---------- פקודות ---------- */
function sbCmd(word) {
  if (!sbS || !['duck', 'throw'].includes(word)) return false;
  const S = sbS;
  if (word === 'duck') {
    if (S.np === 'stand') { sbN('duck'); sbChipOk('duck'); }
  } else {
    if (S.np === 'duck' || S.np === 'stand') {
      if (S.balls.some(b => b.dir > 0)) {}
      else if (S.yp === 'laugh') { sbChipOk('throw'); sbNinjaThrow(); }
      else if (S.yp === 'throw') { S.held = 'throw'; sbChipOk('throw'); }
      else if (S.yp === 'hidden' || S.yp === 'wind') sbNinjaThrow();               // מוקדם מדי – הכדור פוגע בחומה
    }
  }
  return true;
}
function sbChipOk(w) { sbS.chipOk = 1.1; sbS.chipW = w; }
function sbExpected() {
  const S = sbS; if (!S) return null;
  if (S.yp === 'wind' && S.np === 'stand') return ['duck'];
  if (S.yp === 'laugh' && S.np !== 'throwing' && !S.balls.length) return ['throw'];
  return [];
}
function sbAuto() {
  const S = sbS; if (!S) return; const w = (sbExpected() || [])[0]; if (!w) return;
  if (w === 'duck' ? S.yt > 0.6 : S.yt > 0.5) command(w, 'auto');
}
function sbTap() { return sbS ? (sbExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function sbBall(x, y, r) {
  ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, Math.PI * 2); ctx.fill();
}
function sbWall(x, w, h) {                                                       // חומת שלג: גושים מעוגלים, צל כחלחל למטה
  const g = GROUND;
  ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.roundRect(x - w / 2, g - h, w, h + 0.5, [h * 0.5, h * 0.5, 0, 0]); ctx.fill();
  ctx.fillStyle = '#dbeafe'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 0.3, g - h, w - 1.2, h - 1.2, [h * 0.5, h * 0.4, 1, 1]); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 4; k++) { const bx = x - w / 2 + w * (0.15 + k * 0.24); ctx.beginPath(); ctx.ellipse(bx, g - h + 0.9, w * 0.13, 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 0.3;               // קווי הגושים
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 1, g - h * 0.45); ctx.lineTo(x + w / 2 - 1, g - h * 0.45);
  for (const k of [0.3, 0.7]) { ctx.moveTo(x - w / 2 + w * k, g - h * 0.45); ctx.lineTo(x - w / 2 + w * k, g - 0.3); }
  ctx.moveTo(x, g - h * 0.45); ctx.lineTo(x, g - h + 1.5); ctx.stroke();
}
// היטי: גוף פרוותי לבן-תכלכל, פנים כחלחלות, עיניים גדולות. up – כמה הוא מעל החומה (0 מוסתר, 1 בחוץ)
function drawYeti(x, S) {
  const g = GROUND, t = performance.now() / 1000;
  const yp = S ? S.yp : 'hidden', yt = S ? S.yt : 0;
  let up = 0, arm = 0, lean = 0, face = 'smile', flag = 0;
  if (yp === 'hidden') up = S && !S.first && yt < 0.25 ? 1 - sbE(yt / 0.25) : 0;
  if (yp === 'wind') { up = sbE(yt / 0.3); arm = sbE(yt / 0.6); face = 'sly'; }
  if (yp === 'throw') { up = 1; arm = 1 - sbE(yt / 0.2) * 2; lean = 0.15; }
  if (yp === 'laugh') { up = 1; arm = -0.4; face = 'laugh'; lean = Math.sin(t * 14) * 0.05; }
  if (yp === 'hurt') { up = sbL(1, 0.45, yt / 0.3); face = 'hurt'; lean = -0.2 * sbE(yt / 0.2); }
  if (yp === 'give') { up = sbE(yt / 0.4); face = 'hurt'; flag = sbE((yt - 0.3) / 0.4); }
  const by = g - 6 - up * 11;                                                    // מרכז הגוף
  ctx.save(); ctx.translate(x, by); ctx.rotate(lean);
  const fur = (cx, cy, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92, Math.min(rx, ry) * 0.28, 0, Math.PI * 2); ctx.fill(); } };
  // זרוע אחורית
  fur(-5.6, 0, 1.6, 3.2, '#a5b4fc');
  fur(0, 0, 6.2, 7.5, '#a5b4fc');                                                 // הגוף
  fur(0.4, -0.6, 5.0, 6.3, '#c7d2fe');
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.roundRect(-5.2, -0.9, 9.6, 1.9, 0.9); ctx.fill(); ctx.fillRect(1.6, 0, 1.8, 4.2);   // צעיף אדום
  // הפנים
  ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.ellipse(-1.1, -3.4, 3.4, 2.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bfdbfe'; ctx.beginPath(); ctx.ellipse(-1.4, -4.1, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e293b';
  if (face === 'hurt') { ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.35; for (const ex of [-2.5, 0.1]) { ctx.beginPath(); ctx.moveTo(ex - 0.6, -4.6); ctx.lineTo(ex + 0.6, -3.6); ctx.moveTo(ex + 0.6, -4.6); ctx.lineTo(ex - 0.6, -3.6); ctx.stroke(); } }
  else if (face === 'laugh') { ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.4; for (const ex of [-2.5, 0.1]) { ctx.beginPath(); ctx.arc(ex, -3.9, 0.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
  else { for (const ex of [-2.5, 0.1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -4.1, 0.85, 0.95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(ex - 0.35, -4.0, 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (face === 'sly') { ctx.fillStyle = '#93c5fd'; ctx.fillRect(-3.5, -5.3, 4.8, 0.75); } }               // עפעפיים חצי סגורים – זומם
  // פה
  ctx.fillStyle = '#1e3a8a';
  if (face === 'laugh') { ctx.beginPath(); ctx.ellipse(-1.2, -1.6, 1.4, 0.9 + Math.abs(Math.sin(t * 14)) * 0.4, 0, 0, Math.PI); ctx.fill(); }
  else if (face === 'hurt') { ctx.beginPath(); ctx.ellipse(-1.2, -1.5, 0.7, 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(-1.2, -2.3, 1.1, 0.3, Math.PI - 0.3); ctx.stroke(); }
  // זרוע קדמית: מניפה כדור מעל הראש / מורמת עם דגל
  const ang = flag ? -2.6 : -0.2 - arm * 2.6;                                     // 0 = למטה, שלילי = אחורה-למעלה (היטי פונה שמאלה)
  ctx.save(); ctx.translate(-4.2, -0.8); ctx.rotate(-ang);
  fur(0, 3, 1.6, 3.4, '#a5b4fc');
  if (yp === 'wind' || (yp === 'throw' && arm > 0)) sbBall(0, 6.6, 1.5);
  ctx.restore();
  if (flag) {                                                                    // דגל לבן
    const hx = -4.2 + Math.sin(-ang) * 6.4, hy = -0.8 + Math.cos(-ang) * 6.4;
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(hx, hy + 2); ctx.lineTo(hx, hy - 9 * flag); ctx.stroke();
    const wv = Math.sin(t * 8) * 0.8;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(hx, hy - 9 * flag); ctx.quadraticCurveTo(hx - 3, hy - 9 * flag + wv, hx - 6, hy - 8.5 * flag); ctx.lineTo(hx - 6, hy - 5 * flag); ctx.quadraticCurveTo(hx - 3, hy - 5.5 * flag - wv, hx, hy - 5.5 * flag); ctx.fill();
  }
  ctx.restore();
  if (S && S.yp === 'hurt') { ctx.fillStyle = '#facc15'; ctx.font = '3px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) { const a = S.yt * 6 + k / 3 * Math.PI * 2; ctx.fillText('★', x - 1 + Math.cos(a) * 4, by - 9 + Math.sin(a) * 1.2); } }
}
function drawSnowFight(o) {
  const S = sbS && sbS.o === o ? sbS : null;
  drawYeti(o.x + SB.yeti, S);
  sbWall(o.x + SB.yeti - 4, 13, 9.5);                                             // החומה של היטי – לפניו
  if (S && S.hp > 0) {                                                            // פס חיים מעל החומה של היטי
    const hx = o.x + SB.yeti - 4, hy = GROUND - 36;
    ctx.fillStyle = 'rgba(30,41,59,.75)'; ctx.beginPath(); ctx.roundRect(hx - 8, hy, 16, 2.6, 1); ctx.fill();
    for (let i = 0; i < SB.hp; i++) { ctx.fillStyle = i < S.hp ? '#38bdf8' : '#475569'; ctx.beginPath(); ctx.roundRect(hx - 7.4 + i * 5, hy + 0.55, 4.4, 1.5, 0.6); ctx.fill(); }
  }
  // ערימת כדורים קטנה ליד הנינג'ה
  for (const [dx, dy] of [[-3, -0.9], [-1.4, -0.9], [-2.2, -2.3]]) sbBall(o.x + SB.wallN - 3.5 + dx, GROUND + dy, 0.85);
}
function drawSnowFront(o) {
  const S = sbS && sbS.o === o ? sbS : null;
  sbWall(o.x + SB.wallN, 9, 8);                                                    // החומה של הנינג'ה – מעליו
  if (!S) return;
  for (const b of S.balls) sbBall(o.x + b.x, GROUND + b.y, 1.3);
  for (const p of S.puffs) {                                                      // התנפצות – פירורי שלג
    const k = p.t / 0.7; ctx.fillStyle = 'rgba(255,255,255,' + (1 - k) + ')';
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ctx.beginPath(); ctx.arc(o.x + p.x + Math.cos(a) * k * 4, GROUND + p.y + Math.sin(a) * k * 3 + k * k * 3, 0.8 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill(); }
  }
  if (S.splat > 0) {                                                               // שלג על הפנים
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, S.splat) + ')';
    const fx = o.x + S.n + 1.5, fy = GROUND - 12.2;
    for (const [dx, dy, r] of [[0, 0, 1.6], [1.2, 0.6, 1.0], [-0.9, 0.8, 0.9], [0.4, -1.1, 0.9]]) { ctx.beginPath(); ctx.arc(fx + dx, fy + dy, r, 0, Math.PI * 2); ctx.fill(); }
  }
  sbDrawChip();
}
function sbDrawChip() {
  const S = sbS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (sbExpected() || [])[0];
  if (!w) return;
  const txt = SB_CHIP[w] || w.toUpperCase(), y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}

/* ---------- הנינג'ה ---------- */
const SB_CROUCH = { hipY: -2.3, lean: 0.45, spine: 0.3, headTilt: 0.35, legs: [[-0.45, -2.3], [1.5, -0.2]], arms: [[2.2, 3.3], [2.5, 3.6]] };   // כורע, ידיים מעל הראש
function sbNinjaPose(S, now) {
  const P = poseIdle(now), t = S.nt;
  if (S.np === 'exit') return poseRun(S.n * 0.55);
  if (S.np === 'duck') { const k = sbE(t / 0.15); const Q = Object.assign({}, P);
    for (const key of ['hipY', 'lean', 'spine', 'headTilt']) Q[key] = sbL(P[key] || 0, SB_CROUCH[key], k);
    Q.legs = P.legs.map((l, i) => [sbL(l[0], SB_CROUCH.legs[i][0], k), sbL(l[1], SB_CROUCH.legs[i][1], k)]);
    Q.arms = P.arms.map((a, i) => [sbL(a[0], SB_CROUCH.arms[i][0], k), sbL(a[1], SB_CROUCH.arms[i][1], k)]);
    Q.eyes = 'squint'; return Q; }
  if (S.np === 'throwing') {                                                       // תנופה לאחור – וזריקה קדימה-למעלה
    let arm, lean;
    if (t < 0.26) { const k = sbE(t / 0.26); arm = [sbL(0.45, -2.5, k), sbL(1.25, -3.0, k)]; lean = sbL(0.05, -0.15, k); }
    else { const k = sbE((t - 0.26) / 0.14); arm = [sbL(-2.5, 2.0, k), sbL(-3.0, 1.9, k)]; lean = sbL(-0.15, 0.25, k); }
    P.arms = [[sbL(0.3, -0.4, t / 0.4), 0.3], arm]; P.lean = lean; return P;
  }
  if (S.np === 'win') { P.arms = [[-0.3, 0.2], [2.9, 3.0]]; return P; }
  if (S.splat > 0) { P.arms = [P.arms[0], [1.3, 2.9 + Math.sin(now * 16) * 0.3]]; P.eyes = 'squint'; P.headTilt = 0.15; return P; }   // מנגב את השלג מהפנים
  if (S.np === 'stand' && S.yp !== 'hidden') { P.arms = [P.arms[0], [0.45, 1.25]]; }   // כדור ביד, מוכן
  return P;
}
function sbDrawNinja() {
  const S = sbS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.n, fy = GROUND, P = sbNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1);
  if ((S.np === 'stand' && S.yp !== 'hidden' && S.splat <= 0) || (S.np === 'throwing' && !S.thrown)) sbBall(playerHand[0], playerHand[1], 1.2);
  return true;
}

sceneAdd({
  type: 'snowfight', word: 'snowball', label: true,
  listen: ['duck', 'throw'],
  active: () => !!sbS,
  reset: () => { sbS = null; },
  setup: sbSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + SB.e0 + PLAYER.w / 2,
  draw: drawSnowFight, drawFront: drawSnowFront, drawNinja: sbDrawNinja,
  update: sbUpdate, physics: sbPhysics, speed: sbSpeed,
  expected: sbExpected, cmd: sbCmd, auto: sbAuto, tap: sbTap,
  intro: { banner: 'DUCK · THROW!', time: 20,
           demo: () => { const o = { type: 'snowfight' }; sbSetup(o); o.x = sbNX() - SB.e0; obstacles.push(o); } }
});
