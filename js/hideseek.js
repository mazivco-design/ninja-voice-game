/* ninja-voice-game – hideseek.js
   מחבואים עם החבר (שלב בפיתוח, 2026-11-24): החבר כבר נראה מרחוק, עומד ליד שיח גדול.
   "Hide and seek! You hide!" – הוא מסתובב, מכסה עיניים וסופר. HIDE: הנינג'ה מתחבא מאחורי השיח.
   "Ready or not, here I come!" – החבר מחפש ומגיע עד השיח. כשהוא מסתכל לכיוון השיח – JUMP רק גורם לנינג'ה להציץ ולהתחבא שוב.
   כשהוא מסתובב עם הגב ("Hmm... where is he?") – JUMP: הנינג'ה קופץ החוצה, "Boo!", החבר נבהל וקופץ, ושניהם צוחקים.
   בלי פגיעות ובלי לבבות. כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const HS = { e0: 12, bush: 24, f0: 46, fStop: 39, w: 76, look: 2.2, back: 3.0, hint: 3.5, hintEvery: 5, coins: 4, walkV: 15 };
const HS_CHIP = { hide: 'HIDE', jump: 'JUMP' };
const HS_LINES = { hi: 'Hide and seek! You hide!', count: 'One... two... three...', ready: 'Ready or not, here I come!', where: 'Hmm... where is he?', got: 'You got me! Ha ha!' };
let hsS = null;
const hsE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const hsL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function hsNX() { return PLAYER.x + 4; }
function hsSetup(o) { o.w = HS.w; }
function hsStart(o) {
  hsS = { o, p: 'hi', t: 0, fp: 'face', ft: 0, idle: 0, hinted: 0, held: null, nx: HS.e0, ny: 0, fx: HS.f0, fy: 0, line: null, lineT: 0, nLine: null, nLineT: 0,
          peek: 0, backs: 0, chipOk: 0, chipW: null, rustle: 9 };
  hsSay('hi');
}
function hsP(p) { const S = hsS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }
function hsSay(k) { const S = hsS; S.line = HS_LINES[k]; S.lineT = 0; speak('friend: ' + HS_LINES[k].toLowerCase()); }

/* ---------- העדכון ---------- */
function hsUpdate(dt, pb) {
  if (!hsS) {
    const o = obstacles.find(o => o.type === 'hideseek' && !o.passed && hsNX() >= o.x + HS.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    hsStart(o); return;
  }
  const S = hsS, o = S.o; S.t += dt; S.lineT += dt; S.nLineT += dt; S.rustle += dt; if (S.chipOk > 0) S.chipOk -= dt; if (S.peek > 0) S.peek -= dt;
  if (!obstacles.includes(o)) { hsS = null; return; }
  const demo = state !== 'play';
  if (demo) { const w = (hsExpected() || [])[0]; if (w && S.t > (w === 'jump' ? 0.9 : 1.2)) { command(w, 'demo'); speak(w); } }
  switch (S.p) {
    case 'hi': if (S.t >= 2.2) { hsP('hideWait'); hsSay('count'); } break;       // מסביר – ואז מסתובב ומכסה עיניים
    case 'hideWait': if (S.held === 'hide') { S.held = null; hsP('hiding'); sfx('swish'); } break;
    case 'hiding': {                                                             // רץ אל מאחורי השיח וכורע
      const k = hsE(S.t / 0.7); S.nx = hsL(HS.e0, HS.bush, k);
      if (S.t >= 0.75) { S.rustle = 0; hsP('wait'); }
      break;
    }
    case 'wait': if (S.t >= 1.3) { hsP('seek'); hsSay('ready'); } break;
    case 'seek': {                                                               // החבר הולך לכיוון השיח ומסתכל סביב
      const k = Math.min(1, S.t / 3.0); S.fx = hsL(HS.f0, HS.fStop, k);
      if (S.t >= 3.0) hsP('look');
      break;
    }
    case 'look': if (S.t >= HS.look) { hsP('back'); if (!S.backs++) hsSay('where'); } break;   // מסתכל על השיח – ואז מסתובב עם הגב
    case 'back': if (S.held === 'jump') { S.held = null; hsBoo(); } else if (S.t >= HS.back) hsP('look'); break;
    case 'boo': {                                                                // קופץ מעל השיח אל החבר
      const k = hsE(S.t / 0.55); S.nx = hsL(HS.bush, HS.fStop - 6.5, k); S.ny = -Math.sin(k * Math.PI) * 11;
      S.fy = S.t > 0.35 && S.t < 1.0 ? -Math.sin((S.t - 0.35) / 0.65 * Math.PI) * 6 : 0;   // החבר נבהל וקופץ
      if (S.t >= 0.55 && !S.landed) { S.landed = 1; S.ny = 0; sfx('land'); }
      if (S.t >= 1.3) { hsP('laugh'); hsSay('got'); }
      break;
    }
    case 'laugh': if (S.t >= 2.4) hsP('exit'); break;
    case 'exit': {
      S.fx += HS.walkV * 1.3 * dt; S.nx += HS.walkV * dt;
      const over = o.x + S.nx - hsNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + S.fx > viewR() + 20 && o.x + HS.bush < -30 || S.t > 10) {
        cleared(o); hsS = null;
        if (mode === 'journey' && state === 'play') { picked += HS.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + HS.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  const want = (hsExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > (want === 'jump' ? 1.4 : HS.hint) + S.hinted * HS.hintEvery) { S.hinted++; speak(want); }
  }
}
function hsBoo() { const S = hsS; hsP('boo'); S.landed = 0; S.rustle = 0; S.nLine = 'BOO!'; S.nLineT = 0; speak('ninja: boo!'); sfx('swish'); }
function hsPhysics() { if (!hsS) return false; vy = 0; py = 0; return true; }
function hsSpeed() { return hsS ? 0 : null; }

/* ---------- פקודות ---------- */
function hsCmd(word) {
  if (!hsS || !['hide', 'jump'].includes(word)) return false;
  const S = hsS;
  if (word === 'hide' && (S.p === 'hideWait' || S.p === 'hi')) { S.held = 'hide'; hsChipOk('hide'); }
  else if (word === 'jump') {
    if (S.p === 'back') { hsChipOk('jump'); hsBoo(); }
    else if (['wait', 'seek', 'look'].includes(S.p) && S.peek <= 0) { S.peek = 0.7; S.rustle = 0; sfx('swish'); }   // מוקדם מדי – רק מציץ ומתחבא שוב
  }
  return true;
}
function hsChipOk(w) { hsS.chipOk = 1.1; hsS.chipW = w; }
function hsExpected() { const S = hsS; if (!S) return null; return S.p === 'hideWait' ? ['hide'] : S.p === 'back' ? ['jump'] : []; }
function hsAuto() { const S = hsS; if (!S) return; const w = (hsExpected() || [])[0]; if (w && S.idle > 0.8) command(w, 'auto'); }
function hsTap() { return hsS ? (hsExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function hsBush(x, rustle) {                                                     // שיח גדול ועגול – מסתיר נינג'ה כורע
  const g = GROUND, sh = rustle < 0.5 ? Math.sin(rustle * 40) * 0.35 * (1 - rustle / 0.5) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(x, g + 0.3, 8.5, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  const blobs = [[-5.6, -4, 4.8, 4.3], [5.6, -3.8, 5, 4.2], [0, -7, 6.4, 5.2], [-3.2, -9.6, 4.1, 3.4], [3.6, -9.4, 4.3, 3.5], [0, -2.9, 6.8, 3.1]];
  ctx.fillStyle = '#2f7a2c'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(x + bx + sh, g + by + 0.5, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3f9638'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(x + bx + sh - 0.4, g + by - 0.3, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#5cb84a'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(x + bx + sh - 1.1, g + by - 1.2, rx * 0.45, ry * 0.4, -0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#f472b6'; for (const [fx, fy] of [[-4.5, -6.8], [2.8, -10.8], [6.2, -5], [-1, -3.4]]) { ctx.beginPath(); ctx.arc(x + fx + sh, g + fy, 0.55, 0, Math.PI * 2); ctx.fill(); }   // פרחים קטנים
}
function drawHideSeek(o) {
  const S = hsS && hsS.o === o ? hsS : null;
  if (!S) {                                                                      // החבר כבר נראה מרחוק: מנופף לשלום
    const now = performance.now() / 1000, P = poseIdle(now + 0.4); P.arms = [P.arms[0], [2.7, 3.0 + Math.sin(now * 8) * 0.35]];
    const ffx = o.x + HS.f0;
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
    drawFriend({ fx: ffx, fy: GROUND, pose: P, facing: -1 });
  }
}
function drawHideSeekFront(o) {
  const S = hsS && hsS.o === o ? hsS : null;
  hsBush(o.x + HS.bush, S ? S.rustle : 9);                                       // השיח לפני הנינג'ה – מסתיר אותו
  if (!S) return;
  const now = performance.now() / 1000;
  if (S.p === 'hideWait' || S.p === 'hiding' || S.p === 'wait') {               // ספירה בבועה – מספר עולה
    const n = Math.min(10, 1 + Math.floor((S.p === 'hideWait' ? S.t : 3 + S.t) / 1.1));
    drawBubble(n < 10 ? n + '...' : '10!', o.x + S.fx - 2, GROUND - 18, { age: 1, tail: 1, color: '#1d4ed8', size: 3.6 });
  } else if (S.line && S.lineT < 2.6) drawBubble(S.line, o.x + S.fx + (S.p === 'seek' ? -3 : 3), GROUND - 18, { age: S.lineT, tail: S.p === 'seek' || S.p === 'look' ? 1 : -1, color: '#1d4ed8', size: 3.6 });
  if (S.p === 'look' || (S.p === 'seek' && S.t > 2)) {                           // סימן שאלה מעל החבר
    ctx.fillStyle = '#1d4ed8'; ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', o.x + S.fx, GROUND - 17 + Math.sin(now * 4) * 0.4);
  }
  if (S.nLine && S.nLineT < 1.6) drawBubble(S.nLine, o.x + S.nx, GROUND + S.ny - 18, { age: S.nLineT, tail: 1, color: playerColor(), size: 4.4 });
  if (S.p === 'boo' && S.t > 0.35 && S.t < 1.3) { ctx.fillStyle = '#ef4444'; ctx.font = '900 3.6px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!!', o.x + S.fx + 0.5, GROUND + S.fy - 16); }
  hsDrawChip();
}
function hsDrawChip() {
  const S = hsS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (hsExpected() || [])[0];
  if (!w) return;
  const txt = HS_CHIP[w] || w.toUpperCase(), y = 24, sz = 6;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText((ok ? '✓ ' : '') + txt).width, pw = tw + sz * 1.6, ph = sz * 1.55, pop = ok ? 1 + Math.max(0, S.chipOk - 0.8) * 0.5 : 1;
  ctx.translate(W / 2, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 0.4; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText((ok ? '✓ ' : '') + txt, 0, sz * 0.05);
  ctx.restore();
}

/* ---------- הדמויות ---------- */
const HS_CROUCH = { hipY: -2.2, lean: 0.35, spine: 0.25, headTilt: 0.2, legs: [[-0.45, -2.3], [1.5, -0.2]], arms: [[0.4, 1.4], [0.6, 1.6]] };
function hsCrouch(P, k) {
  const Q = Object.assign({}, P);
  for (const key of ['hipY', 'lean', 'spine', 'headTilt']) Q[key] = hsL(P[key] || 0, HS_CROUCH[key], k);
  Q.legs = P.legs.map((l, i) => [hsL(l[0], HS_CROUCH.legs[i][0], k), hsL(l[1], HS_CROUCH.legs[i][1], k)]);
  Q.arms = P.arms.map((a, i) => [hsL(a[0], HS_CROUCH.arms[i][0], k), hsL(a[1], HS_CROUCH.arms[i][1], k)]);
  return Q;
}
function hsNinjaPose(S, now) {
  const P = poseIdle(now), t = S.t;
  if (S.p === 'exit') return poseRun(S.nx * 0.55);
  if (S.p === 'hiding') { if (t < 0.55) return poseRun(t * 9); return hsCrouch(P, hsE((t - 0.55) / 0.2)); }
  if (['wait', 'seek', 'look', 'back'].includes(S.p)) {                          // כורע מאחורי השיח; מציץ אם אמר JUMP מוקדם
    const Q = hsCrouch(P, 1); if (S.peek > 0) { const k = Math.sin(S.peek / 0.7 * Math.PI); Q.hipY = hsL(-2.2, -3.6, k); Q.lean = hsL(0.35, 0.05, k); Q.headTilt = -0.1 * k; }
    if (S.p === 'back') Q.eyes = 'squint';                                       // מחכה לרגע הנכון
    return Q;
  }
  if (S.p === 'boo') { if (t < 0.55) { const A = poseAir(now); A.arms = [[2.6, 3.4], [2.8, 3.5]]; return A; } P.arms = [[2.5, 3.3], [2.7, 3.4]]; return P; }   // ידיים למעלה – בוווו!
  if (S.p === 'laugh') { P.arms = [[0.3, 2.4], [0.4, 2.5]]; P.eyes = 'squint'; P.lean = -0.08 + Math.sin(now * 12) * 0.04; return P; }       // מחזיק את הבטן מצחוק
  if (S.p === 'hi') P.headTilt = 0.05;
  return P;
}
function hsFriendPose(S, now) {
  const P = poseIdle(now + 0.4), t = S.t;
  if (S.p === 'hi') { P.arms = [P.arms[0], [2.7, 3.0 + Math.sin(now * 8) * 0.35]]; return P; }                      // מנופף
  if (['hideWait', 'hiding', 'wait'].includes(S.p)) { P.arms = [[0.55, 2.75], [0.5, 2.7]]; P.headTilt = 0.25; P.lean = 0.05; return P; }   // מכסה עיניים וסופר
  if (S.p === 'seek') { const R = poseRun(S.fx * 0.35); R.headTilt = Math.sin(now * 2) * 0.15; return R; }
  if (S.p === 'look') { P.headTilt = Math.sin(t * 3) * 0.2; P.arms = [P.arms[0], [1.2, 2.6]]; return P; }             // יד על המצח – מחפש
  if (S.p === 'back') { P.arms = [P.arms[0], [0.9, 2.9 + Math.sin(now * 6) * 0.2]]; P.headTilt = -0.1; return P; }  // מגרד בראש
  if (S.p === 'boo') { if (t > 0.35 && t < 1.0) { P.arms = [[2.4, 2.6], [2.5, 2.7]]; P.eyes = 'open'; P.legs = [[-0.6, -0.9], [0.6, 0.2]]; } return P; }
  if (S.p === 'laugh') { P.arms = [[0.3, 2.4], [0.4, 2.5]]; P.eyes = 'squint'; P.lean = -0.08 + Math.sin(now * 12 + 1) * 0.04; return P; }
  if (S.p === 'exit') return poseRun(S.fx * 0.5);
  return P;
}
function hsFriendFacing(S) {
  if (S.p === 'hi') return -1;
  if (['hideWait', 'hiding', 'wait', 'back'].includes(S.p)) return 1;           // הגב אל הנינג'ה
  if (S.p === 'seek' || S.p === 'look') return -1;
  if (S.p === 'boo' || S.p === 'laugh') return -1;
  return 1;
}
function hsDrawNinja() {
  const S = hsS; if (!S) return false;
  const now = performance.now() / 1000, o = S.o;
  const ffx = o.x + S.fx, FP = hsFriendPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(ffx, GROUND + 0.2, 3, 0.65, 0, 0, Math.PI * 2); ctx.fill();
  drawFriend({ fx: ffx, fy: GROUND + S.fy, pose: FP, facing: hsFriendFacing(S) });
  const fx = o.x + S.nx, fy = GROUND + S.ny, P = hsNinjaPose(S, now);
  if (S.ny > -0.5) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'hideseek', word: 'hideseek', label: true,
  listen: ['hide', 'jump'],
  active: () => !!hsS,
  reset: () => { hsS = null; },
  setup: hsSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + HS.e0 + PLAYER.w / 2,
  draw: drawHideSeek, drawFront: drawHideSeekFront, drawNinja: hsDrawNinja,
  update: hsUpdate, physics: hsPhysics, speed: hsSpeed,
  expected: hsExpected, cmd: hsCmd, auto: hsAuto, tap: hsTap,
  intro: { banner: 'HIDE · JUMP!', time: 20,
           demo: () => { const o = { type: 'hideseek' }; hsSetup(o); o.x = hsNX() - HS.e0; obstacles.push(o); } }
});
