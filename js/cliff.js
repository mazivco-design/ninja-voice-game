/* ninja-voice-game – cliff.js
   הצוק והאגם (שלב בפיתוח, 2026-11-24): צוק סלע גבוה עם גפן תלויה, ומאחוריו אגם. הצוק נראה כבר מרחוק.
   CLIMB – הנינג'ה מטפס על הגפן עד מדף באמצע הדרך; CLIMB שוב – עד הפסגה. שם תיבת אוצר נפתחת מעצמה (יהלום).
   הוא הולך לקצה ומביט למטה – DIVE: זינוק בקשת, ראש קודם, אל האגם, ספלאש, צף, שוחה לגדה ויוצא. בלי פגיעות ובלי לבבות.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const CL = { e0: 10, vine: 13.6, c0: 14, c1: 34, top: -40, ledge: -20, chest: 25, lake0: 35, lake1: 66, w: 80, climbT: 1.6, hint: 3.5, hintEvery: 5, coins: 4, walkV: 15 };
const CL_CHIP = { climb: 'CLIMB', dive: 'DIVE' };
let clS = null;
const clE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const clL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function clNX() { return PLAYER.x + 4; }
function clSetup(o) { o.w = CL.w; }
function clStart(o) { clS = { o, p: 'look', t: 0, idle: 0, hinted: 0, held: null, nx: CL.e0, ny: 0, rot: 0, lid: 0, gem: null, splash: [], ripples: [], chipOk: 0, chipW: null }; }
function clP(p) { const S = clS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }

/* ---------- העדכון ---------- */
function clUpdate(dt, pb) {
  if (!clS) {
    const o = obstacles.find(o => o.type === 'cliffdive' && !o.passed && clNX() >= o.x + CL.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    clStart(o); return;
  }
  const S = clS, o = S.o; S.t += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { clS = null; return; }
  const demo = state !== 'play';
  if (demo) { const w = (clExpected() || [])[0]; if (w && S.t > 0.8) { command(w, 'demo'); speak(w); } }
  switch (S.p) {
    case 'look': if (S.t >= 0.6) clP('climbWait'); break;                           // מביט למעלה אל הצוק
    case 'climbWait': if (S.held === 'climb') { S.held = null; clP('climb1'); } break;
    case 'climb1': S.nx = CL.vine - 1.6; S.ny = clL(0, CL.ledge, S.t / CL.climbT); if (S.t >= CL.climbT) clP('ledge'); break;
    case 'ledge': if (S.held === 'climb') { S.held = null; clP('climb2'); } break;   // נח על המדף – CLIMB שוב
    case 'climb2': S.ny = clL(CL.ledge, CL.top, S.t / CL.climbT); if (S.t >= CL.climbT) clP('over'); break;
    case 'over': { const k = clE(S.t / 0.5); S.nx = clL(CL.vine - 1.6, CL.c0 + 4, k); S.ny = CL.top - Math.sin(k * Math.PI) * 2.5; if (S.t >= 0.5) { S.ny = CL.top; clP('walkChest'); sfx('land'); } break; }
    case 'walkChest': S.nx = Math.min(CL.chest - 4, S.nx + CL.walkV * 0.6 * dt); if (S.nx >= CL.chest - 4) clP('open'); break;
    case 'open':                                                                    // התיבה נפתחת – יהלום קופץ החוצה
      S.lid = clE(S.t / 0.35);
      if (S.t >= 0.3 && !S.gem) { S.gem = { x: CL.chest, y: CL.top - 3, vy: -14, t: 0 }; sfx('coin'); floatText(o.x + CL.chest, GROUND + CL.top - 10, '💎', '#0ea5e9'); }
      if (S.t >= 1.3) clP('walkEdge');
      break;
    case 'walkEdge': S.nx = Math.min(CL.c1 - 2.5, S.nx + CL.walkV * 0.6 * dt); if (S.nx >= CL.c1 - 2.5) clP('diveWait'); break;
    case 'diveWait': if (S.held === 'dive') { S.held = null; clP('dive'); sfx('swish'); } break;
    case 'dive': {                                                                  // זינוק בקשת – ראש קודם – אל המים
      const T = 1.0, k = Math.min(1, S.t / T), x0 = CL.c1 - 2.5, x1 = 48, y0 = CL.top, y1 = 4;
      S.nx = clL(x0, x1, k); S.ny = y0 + (y1 - y0) * k * k - Math.sin(k * Math.PI) * 6;
      S.rot = clL(0, 2.2, clE(k * 1.2));
      if (S.t >= T) { S.rot = 2.2; clSplash(x1); clP('under'); }
      break;
    }
    case 'under': S.ny = clL(4, 7, S.t / 0.3) - (S.t > 0.3 ? (S.t - 0.3) / 0.5 * 6 : 0); S.rot = clL(2.2, Math.PI / 2, S.t / 0.6); S.nx += 4 * dt;
      if (S.t >= 0.8) { S.ny = 1.2; S.rot = 0; clP('swim'); S.ripples.push({ x: S.nx, t: 0 }); sfx('splash'); } break;
    case 'swim': S.nx += 9 * dt; if (Math.random() < dt * 3) S.ripples.push({ x: S.nx - 2, t: 0 });
      { const over = o.x + S.nx - clNX(); if (over > 0) ropeShiftBy(over); }
      if (S.nx >= CL.lake1 - 1) clP('out'); break;
    case 'out': { const k = clE(S.t / 0.5); S.ny = clL(1.2, 0, k) - Math.sin(k * Math.PI) * 3; S.nx += 6 * dt; if (S.t >= 0.5) { S.ny = 0; clP('exit'); } break; }
    case 'exit': {
      S.nx += CL.walkV * dt;
      const over = o.x + S.nx - clNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + CL.lake1 < -10 || S.t > 6) {
        cleared(o); clS = null;
        if (mode === 'journey' && state === 'play') { picked += CL.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + CL.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  if (S.gem) { const g = S.gem; g.t += dt; if (g.t < 1.2) { g.vy += 30 * dt; g.y += g.vy * dt; } }
  for (const p of S.splash) { p.t += dt; p.vy += 70 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  S.splash = S.splash.filter(p => p.t < 0.9 && p.y < 2);
  for (const r of S.ripples) r.t += dt; S.ripples = S.ripples.filter(r => r.t < 1.2);
  const want = (clExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > CL.hint + S.hinted * CL.hintEvery) { S.hinted++; speak(want); }
  }
}
function clSplash(x) {
  const S = clS; sfx('splash');
  for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6; const v = 14 + Math.random() * 14; S.splash.push({ x, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 }); }
  S.ripples.push({ x, t: 0 });
  floatText(S.o.x + x, GROUND - 14, 'SPLASH!', '#0ea5e9');
}
function clPhysics() { if (!clS) return false; vy = 0; py = 0; return true; }
function clSpeed() { return clS ? 0 : null; }

/* ---------- פקודות ---------- */
function clCmd(word) {
  if (!clS || !['climb', 'dive'].includes(word)) return false;
  const S = clS;
  if (word === 'climb') { if (S.p === 'climbWait' || S.p === 'ledge' || S.p === 'look' || (S.p === 'climb1' && S.t > CL.climbT - 0.6)) { S.held = 'climb'; clChipOk('climb'); } }
  else if (S.p === 'diveWait' || (S.p === 'walkEdge')) { S.held = 'dive'; clChipOk('dive'); }
  return true;
}
function clChipOk(w) { clS.chipOk = 1.1; clS.chipW = w; }
function clExpected() { const S = clS; if (!S) return null; return S.p === 'climbWait' || S.p === 'ledge' ? ['climb'] : S.p === 'diveWait' ? ['dive'] : []; }
function clAuto() { const S = clS; if (!S) return; const w = (clExpected() || [])[0]; if (w && S.idle > 0.7) command(w, 'auto'); }
function clTap() { return clS ? (clExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function clLake(o) {                                                                // האגם: מים במקום הקרקע, גדות משופעות
  const x0 = o.x + CL.lake0, x1 = o.x + CL.lake1, g = GROUND;
  ctx.fillStyle = '#7c5a3a'; ctx.beginPath(); ctx.moveTo(x0 - 2, g); ctx.lineTo(x1 + 2, g); ctx.lineTo(x1 - 2, H); ctx.lineTo(x0 + 2, H); ctx.fill();
  const gr = ctx.createLinearGradient(0, g, 0, H); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, g + 0.6); ctx.lineTo(x1, g + 0.6); ctx.lineTo(x1 - 3, H); ctx.lineTo(x0 + 3, H); ctx.fill();
  const now = performance.now() / 1000;
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35;                  // גלים קטנים על פני המים
  for (let x = x0 + 3; x < x1 - 3; x += 6) { const ph = Math.sin(now * 2 + x); ctx.beginPath(); ctx.moveTo(x, g + 1.2 + ph * 0.2); ctx.quadraticCurveTo(x + 1.5, g + 0.6, x + 3, g + 1.2 + ph * 0.2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x0 + 4, g + 4, (x1 - x0) * 0.3, 0.5); ctx.fillRect(x0 + (x1 - x0) * 0.55, g + 8, (x1 - x0) * 0.25, 0.5);
}
function clCliff(o) {                                                               // הצוק: סלע עם שכבות, דשא למעלה, מדף באמצע
  const x0 = o.x + CL.c0, x1 = o.x + CL.c1, g = GROUND, top = g + CL.top;
  ctx.fillStyle = '#6b6259'; ctx.beginPath();
  ctx.moveTo(x0 - 1.2, g); ctx.lineTo(x0 - 0.4, g - 12); ctx.lineTo(x0 + 0.4, g - 26); ctx.lineTo(x0 - 0.2, top + 3); ctx.quadraticCurveTo(x0, top, x0 + 2, top);
  ctx.lineTo(x1 - 2, top); ctx.quadraticCurveTo(x1, top, x1 + 0.2, top + 3); ctx.lineTo(x1 + 0.8, g - 18); ctx.lineTo(x1 + 1.6, g); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7d7368';                                                        // צד מואר
  ctx.beginPath(); ctx.moveTo(x0 + 2, top + 1); ctx.lineTo(x0 + 9, top + 1); ctx.lineTo(x0 + 7, g - 8); ctx.lineTo(x0 + 1.5, g - 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,34,28,.35)'; ctx.lineWidth = 0.4;                      // סדקים ושכבות
  for (const [ax, ay, bx, by] of [[3, -33, 12, -31], [8, -24, 18, -25], [4, -13, 11, -11], [13, -9, 19, -6], [14, -35, 17, -29]]) { ctx.beginPath(); ctx.moveTo(x0 + ax, g + ay); ctx.lineTo(x0 + bx, g + by); ctx.stroke(); }
  ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.roundRect(x0 - 0.6, top - 0.8, x1 - x0 + 1.2, 1.8, 0.9); ctx.fill();   // דשא למעלה
  ctx.fillStyle = '#22c55e'; for (let x = x0; x < x1; x += 1.6) { ctx.beginPath(); ctx.moveTo(x, top - 0.5); ctx.lineTo(x + 0.4, top - 1.8); ctx.lineTo(x + 0.8, top - 0.5); ctx.fill(); }
  ctx.fillStyle = '#5b534b'; ctx.beginPath(); ctx.roundRect(x0 - 3.4, g + CL.ledge - 0.4, 4.2, 1.6, 0.6); ctx.fill();   // המדף
  ctx.fillStyle = '#4ade80'; ctx.fillRect(x0 - 3.2, g + CL.ledge - 0.7, 3.8, 0.5);
}
function clVine(o) {                                                                // גפן מהפסגה עד הקרקע, עם עלים
  const x = o.x + CL.vine, g = GROUND, top = g + CL.top, now = performance.now() / 1000;
  ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.55; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 0.4, top);
  for (let y = top; y <= g; y += 2) ctx.lineTo(x + Math.sin(y * 0.5 + now * 0.8) * 0.45, y); ctx.stroke();
  ctx.fillStyle = '#22c55e';
  for (let y = top + 2; y < g - 1; y += 3.2) { const vx = x + Math.sin(y * 0.5 + now * 0.8) * 0.45, s = (y * 7) % 2 > 1 ? 1 : -1;
    ctx.beginPath(); ctx.ellipse(vx + s * 0.9, y, 0.95, 0.45, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
}
function clChest(o, lid) {                                                          // תיבת אוצר: עץ חום עם פסים זהובים
  const x = o.x + CL.chest, y = GROUND + CL.top;
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(x - 2.6, y - 3.2, 5.2, 3.2, 0.4); ctx.fill();
  ctx.fillStyle = '#facc15'; ctx.fillRect(x - 2.6, y - 2.2, 5.2, 0.45); ctx.fillRect(x - 0.4, y - 3.2, 0.8, 1.6);
  ctx.save(); ctx.translate(x - 2.6, y - 3.2); ctx.rotate(-lid * 1.9);              // מכסה מתרומם על ציר אחורי
  ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.roundRect(0, -1.8, 5.2, 1.8, [1.2, 1.2, 0.2, 0.2]); ctx.fill();
  ctx.fillStyle = '#facc15'; ctx.fillRect(2.2, -1.8, 0.8, 1.8);
  ctx.restore();
  if (lid > 0.3) { ctx.fillStyle = 'rgba(250,204,21,' + (0.5 * lid) + ')'; ctx.beginPath(); ctx.ellipse(x, y - 3.4, 2.4, 0.8, 0, 0, Math.PI * 2); ctx.fill(); }   // ברק זהב
}
function clGem(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 6) * 0.15);
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(1.3, -0.4); ctx.lineTo(0, 1.6); ctx.lineTo(-1.3, -0.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(1.3, -0.4); ctx.lineTo(0, -0.2); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawCliffScene(o) {
  const S = clS && clS.o === o ? clS : null;
  clLake(o); clCliff(o); clVine(o); clChest(o, S ? S.lid : 0);
  if (S && S.gem && S.gem.t < 1.2) clGem(o.x + S.gem.x, GROUND + S.gem.y, S.gem.t);
}
function drawCliffFront(o) {
  const S = clS && clS.o === o ? clS : null; if (!S) return;
  if (['under', 'swim'].includes(S.p)) {                                           // מים מעל הגוף השקוע
    ctx.fillStyle = 'rgba(14,116,144,.55)'; ctx.fillRect(o.x + CL.lake0 + 0.5, GROUND + 0.6, CL.lake1 - CL.lake0 - 1, 14);
  }
  for (const r of S.ripples) { const k = r.t / 1.2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(o.x + r.x, GROUND + 0.8, 1 + k * 6, 0.3 + k * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#e0f2fe'; for (const p of S.splash) { ctx.beginPath(); ctx.arc(o.x + p.x, GROUND + p.y, 0.55, 0, Math.PI * 2); ctx.fill(); }
  clDrawChip();
}
function clDrawChip() {
  const S = clS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (clExpected() || [])[0];
  if (!w) return;
  const txt = CL_CHIP[w] || w.toUpperCase(), y = 14, sz = 6;                       // גבוה יותר – הצוק תופס את אמצע המסך
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
function clNinjaPose(S, now) {
  const t = S.t;
  if (S.p === 'climb1' || S.p === 'climb2') return poseClimb(now, (t / CL.climbT * 4) % 1);
  if (S.p === 'ledge') { const P = poseClimb(now, 0.25); P.headTilt = -0.3; return P; }   // נאחז ומביט למעלה
  if (S.p === 'over') return poseAir(true, Math.min(1, t / 0.5));
  if (S.p === 'walkChest' || S.p === 'walkEdge') return poseRun(S.nx * 0.45);
  if (S.p === 'open') { const P = poseIdle(now); P.arms = [[2.4, 2.8], [2.6, 3.0]]; P.eyes = t > 0.3 ? 'squint' : P.eyes; return P; }   // ידיים למעלה בשמחה
  if (S.p === 'diveWait') { const P = poseIdle(now); P.headTilt = 0.35; P.lean = 0.1; P.arms = [[-0.6, -0.3], [-0.5, -0.2]]; return P; }   // מביט למטה אל המים
  if (S.p === 'dive' || S.p === 'under') return poseLeap();
  if (S.p === 'swim') return poseSwim(now);
  if (S.p === 'out') return poseAir(true, Math.min(1, t / 0.5));
  if (S.p === 'exit') return poseRun(S.nx * 0.55);
  const P = poseIdle(now); P.headTilt = -0.35; return P;                            // מביט למעלה אל הצוק
}
function clDrawNinja() {
  const S = clS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.nx, fy = GROUND + S.ny, P = clNinjaPose(S, now);
  if (S.ny > -0.5 && S.p !== 'swim' && S.p !== 'under') { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  if (S.ny <= CL.top + 0.5 && ['walkChest', 'open', 'walkEdge', 'diveWait'].includes(S.p)) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, fy + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save();
  if (S.rot) { ctx.translate(fx, fy - 6); ctx.rotate(S.rot); ctx.translate(-fx, -(fy - 6)); }
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  ctx.restore();
  playerHand = figHand(fx, fy, 1, 1, P, 1);
  return true;
}

sceneAdd({
  type: 'cliffdive', word: 'cliffdive', label: true,
  listen: ['climb', 'dive'],
  active: () => !!clS,
  reset: () => { clS = null; },
  setup: clSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + CL.e0 + PLAYER.w / 2,
  draw: drawCliffScene, drawFront: drawCliffFront, drawNinja: clDrawNinja,
  update: clUpdate, physics: clPhysics, speed: clSpeed,
  expected: clExpected, cmd: clCmd, auto: clAuto, tap: clTap,
  intro: { banner: 'CLIMB · DIVE!', time: 20,
           demo: () => { const o = { type: 'cliffdive' }; clSetup(o); o.x = clNX() - CL.e0; obstacles.push(o); } }
});
