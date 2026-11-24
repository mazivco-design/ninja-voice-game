/* ninja-voice-game – daruma.js
   דארומה (שלב בפיתוח, 2026-11-24) – בהשראת "רמזור אדום, רמזור ירוק" היפני (Daruma-san ga koronda).
   בובת דארומה ענקית עומדת ליד פעמון. כשהיא מסובבת את הגב – RUN: הנינג'ה רץ (וממשיך לרוץ עד שעוצרים אותו).
   כשהיא מתחילה להסתובב (רועדת) – STOP: הנינג'ה קופא בתנוחה מצחיקה. אם הוא עוד זז כשהיא מסתכלת – "SEEN!" והוא נזרק אחורה.
   ליד הפעמון – RING: דינג! הדארומה מחייכת ונותנת לעבור. בלי לבבות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const DR = { e0: 10, bell: 74, doll: 86, w: 100, runV: 11, warn: 0.75, look: 2.0, hint: 3.5, coins: 4 };
const DR_CHIP = { run: 'RUN', stop: 'STOP', ring: 'RING' };
let drS = null;
const drE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const drL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function drNX() { return PLAYER.x + 4; }
function drSetup(o) { o.w = DR.w; }
function drStart(o) { drS = { o, dp: 'back', dt: 0, dDur: 2.6, run: 0, nx: DR.e0, idle: 0, hinted: 0, held: null, seen: 0, rung: 0, chipOk: 0, chipW: null, freeze: 0, rounds: 0, p: 'play', t: 0, bellT: 9 }; }
function drD(p) { const S = drS; S.dp = p; S.dt = 0; S.idle = 0; S.hinted = 0; if (p === 'back') { S.rounds++; S.dDur = 2.2 + ((S.rounds * 0.37) % 1) * 1.2; } }

/* ---------- העדכון ---------- */
function drUpdate(dt, pb) {
  if (!drS) {
    const o = obstacles.find(o => o.type === 'daruma' && !o.passed && drNX() >= o.x + DR.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    drStart(o); return;
  }
  const S = drS, o = S.o; S.dt += dt; S.t += dt; S.bellT += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.seen > 0) S.seen -= dt;
  if (!obstacles.includes(o)) { drS = null; return; }
  const demo = state !== 'play';
  const want = (drExpected() || [])[0];
  if (demo && want) { const ready = want === 'stop' ? S.dt > 0.15 : S.dt > 0.5; if (ready) { command(want, 'demo'); speak(want); } }
  if (S.p === 'play') {
    // הדארומה: גב (אפשר לרוץ) → רועדת ומסתובבת → מסתכלת → שוב גב
    if (S.dp === 'back' && S.dt >= S.dDur && S.nx < DR.bell - 4) drD('warn');
    else if (S.dp === 'warn' && S.dt >= DR.warn) { drD('look'); if (S.run) drCaught(); }
    else if (S.dp === 'look' && S.dt >= DR.look) drD('back');
    if (S.dp === 'look' && S.run) drCaught();
    if (S.run) { S.nx += DR.runV * dt; if (S.nx >= DR.bell - 4) { S.nx = DR.bell - 4; S.run = 0; } }
    if (S.held === 'ring' && S.nx >= DR.bell - 4.5) { S.held = null; drRing(); }
  } else if (S.p === 'ring') { if (S.t >= 1.8) { S.p = 'exit'; S.t = 0; } }
  else if (S.p === 'exit') {
    S.nx += 15 * dt;
    const over = o.x + S.nx - drNX(); if (over > 0) ropeShiftBy(over);
    if (o.x + DR.doll < -20 || S.t > 8) {
      cleared(o); drS = null;
      if (mode === 'journey' && state === 'play') { picked += DR.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + DR.coins + ' 🟡', '#ca8a04'); }
      return;
    }
  }
  if (S.p === 'exit' || S.p === 'ring') return;
  if (want && !demo && state === 'play') {
    S.idle += dt;
    const lim = want === 'stop' ? 0.25 : DR.hint;
    if (S.idle > lim + S.hinted * 5 && (want !== 'stop' || !S.hinted)) { S.hinted++; speak(want); }
  }
}
function drCaught() {
  const S = drS; S.run = 0; S.seen = 1.2; sfx('thud');
  floatText(S.o.x + S.nx, GROUND - 22, 'SEEN!', '#dc2626');
  S.back0 = S.nx; S.back1 = Math.max(DR.e0, S.nx - 14);
}
function drRing() { const S = drS; S.rung = 1; S.p = 'ring'; S.t = 0; S.bellT = 0; drChipOk('ring'); sfx('coin'); floatText(S.o.x + DR.bell, GROUND - 26, 'DING!', '#ca8a04'); }
function drPhysics() { if (!drS) return false; vy = 0; py = 0; return true; }
function drSpeed() { return drS ? 0 : null; }

/* ---------- פקודות ---------- */
function drCmd(word) {
  if (!drS || !DR_CHIP[word]) return false;
  const S = drS; if (S.p !== 'play' || S.seen > 0.6) return true;
  if (word === 'run' && !S.run && S.nx < DR.bell - 4.5) { S.run = 1; S.freeze = 0; drChipOk('run'); }
  else if (word === 'stop' && S.run) { S.run = 0; S.freeze = 1; drChipOk('stop'); sfx('swish'); }
  else if (word === 'ring' && S.nx >= DR.bell - 4.5) { S.held = 'ring'; }
  return true;
}
function drChipOk(w) { drS.chipOk = 1.1; drS.chipW = w; }
function drExpected() {
  const S = drS; if (!S || S.p !== 'play' || S.seen > 0) return S ? [] : null;
  if (S.nx >= DR.bell - 4.5) return ['ring'];
  if (S.run && S.dp === 'warn') return ['stop'];
  if (!S.run && S.dp === 'back') return ['run'];
  return [];
}
function drAuto() { const S = drS; if (!S) return; const w = (drExpected() || [])[0]; if (!w) return; if (w === 'stop' ? S.dt > 0.2 : S.dt > 0.4 || w === 'ring') command(w, 'auto'); }
function drTap() { return drS ? (drExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function drDoll(x, S) {                                                          // בובת דארומה: גוף אדום עגול, פנים לבנות, גבות שחורות
  const g = GROUND, now = performance.now() / 1000;
  let face = 0;                                                                  // 0 = גב, 1 = פנים
  if (S) { if (S.dp === 'warn') face = drE(S.dt / DR.warn); else if (S.dp === 'look') face = 1; else face = S.dt < 0.3 && S.rounds > 1 ? 1 - drE(S.dt / 0.3) : 0; }
  const shake = S && S.dp === 'warn' ? Math.sin(now * 40) * 0.08 : 0, r = 11;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, g + 0.3, r * 0.95, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, g); ctx.rotate(shake); ctx.translate(-x, -g);
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.ellipse(x, g - r * 1.05, r, r * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(x + r * 0.35, g - r * 0.9, r * 0.6, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, g - r * 1.55, r * 0.22, r * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
  // הפנים: מחליקות מהצד כשהיא מסתובבת
  const fx = x + drL(r * 1.4, 0, face), fw = r * 0.62 * Math.max(0.05, face);
  if (face > 0.03) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, g - r * 1.05, r, r * 1.08, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.ellipse(fx, g - r * 1.2, fw, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2937';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * fw * 0.42, g - r * 1.25, fw * 0.2, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx + s * fw * 0.42 - fw * 0.05, g - r * 1.3, r * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.moveTo(fx + s * fw * 0.15, g - r * 1.5); ctx.quadraticCurveTo(fx + s * fw * 0.5, g - r * 1.68, fx + s * fw * 0.85, g - r * 1.5); ctx.lineWidth = 0.7; ctx.strokeStyle = '#1f2937'; ctx.stroke(); }
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.5; ctx.beginPath();                    // שפם ופה
    if (S && S.rung) { ctx.arc(fx, g - r * 1.0, fw * 0.25, 0.2, Math.PI - 0.2); } else { ctx.moveTo(fx - fw * 0.3, g - r * 0.95); ctx.quadraticCurveTo(fx, g - r * 1.05, fx + fw * 0.3, g - r * 0.95); }
    ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = '#facc15'; ctx.font = '900 ' + (r * 0.5) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (face < 0.5) ctx.fillText('福', x - r * 0.1, g - r * 1.0);                    // הסמל על הגב
  ctx.restore();
}
function drBell(x, ring) {                                                       // פעמון על עמוד
  const g = GROUND, sw = ring < 1.2 ? Math.sin(ring * 25) * 0.4 * (1 - ring / 1.2) : 0;
  ctx.fillStyle = '#78350f'; ctx.fillRect(x - 0.6, g - 18, 1.2, 18); ctx.fillRect(x - 3.5, g - 18.5, 4, 1);
  ctx.save(); ctx.translate(x - 3, g - 17.5); ctx.rotate(sw);
  ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.moveTo(-1.6, 4); ctx.quadraticCurveTo(-1.8, 0.4, 0, 0.2); ctx.quadraticCurveTo(1.8, 0.4, 1.6, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fde68a'; ctx.fillRect(-1.1, 1, 0.5, 2.4); ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(0, 4.3, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawDaruma(o) {
  const S = drS && drS.o === o ? drS : null;
  ctx.fillStyle = 'rgba(120,53,15,.25)'; for (const x of [DR.e0 + 4, 32, 52]) ctx.fillRect(o.x + x, GROUND - 0.2, 0.6, 0.6);
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.4; ctx.setLineDash([1, 1]); ctx.beginPath(); ctx.moveTo(o.x + DR.e0 + 2, GROUND + 0.6); ctx.lineTo(o.x + DR.e0 + 2, GROUND + 3); ctx.stroke(); ctx.setLineDash([]);   // קו התחלה
  drDoll(o.x + DR.doll, S); drBell(o.x + DR.bell, S ? S.bellT : 9);
}
function drawDarumaFront(o) {
  const S = drS && drS.o === o ? drS : null; if (!S || state !== 'play') return;
  if (S.p === 'play' && S.dp === 'back') { ctx.fillStyle = '#7c2d12'; ctx.font = '900 3px system-ui'; ctx.textAlign = 'center'; const n = Math.min(4, Math.floor(S.dt / S.dDur * 4) + 1); ctx.fillText('🙈 ' + '• '.repeat(n), o.x + DR.doll, GROUND - 27); }
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (drExpected() || [])[0];
  if (!w) return;
  const txt = DR_CHIP[w], y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}
function drNinjaPose(S, now) {
  if (S.p === 'exit') return poseRun(S.nx * 0.55);
  if (S.seen > 0) { const P = poseIdle(now); P.lean = -0.35; P.arms = [[-1.0, -0.6], [2.3, 2.8]]; P.eyes = 'squint'; return P; }
  if (S.run) return poseRun(S.nx * 0.55);
  if (S.p === 'ring') { const P = poseIdle(now); P.arms = [P.arms[0], [2.6, 2.9]]; return P; }
  if (S.freeze) { const P = poseRun(1.3); P.eyes = 'squint'; P.arms = [[-1.2, -0.4], [2.2, 2.6]]; return P; }   // קפוא באמצע ריצה – ידיים באוויר
  return poseIdle(now);
}
function drDrawNinja() {
  const S = drS; if (!S) return false;
  if (S.seen > 0 && S.back0 !== undefined) S.nx = drL(S.back0, S.back1, drE((1.2 - S.seen) / 0.5));
  const now = performance.now() / 1000, fx = S.o.x + S.nx, P = drNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy: GROUND - (S.seen > 0.7 ? Math.sin((1.2 - S.seen) / 0.5 * Math.PI) * 3 : 0), facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, GROUND, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'daruma', word: 'daruma', label: true,
  listen: ['run', 'stop', 'ring'],
  active: () => !!drS,
  reset: () => { drS = null; },
  setup: drSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + DR.e0 + PLAYER.w / 2,
  draw: drawDaruma, drawFront: drawDarumaFront, drawNinja: drDrawNinja,
  update: drUpdate, physics: drPhysics, speed: drSpeed,
  expected: drExpected, cmd: drCmd, auto: drAuto, tap: drTap,
  intro: { banner: 'RUN · STOP · RING!', time: 25,
           demo: () => { const o = { type: 'daruma' }; drSetup(o); o.x = drNX() - DR.e0; obstacles.push(o); } }
});
