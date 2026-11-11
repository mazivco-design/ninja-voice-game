/* ninja-voice-game – bike.js
   BIKE (רכיבה על אופניים עם חבר): האופניים עומדים ליד עץ, החבר כבר על האופניים שלו וקורא "Let's ride!"
   · RIDE – הנינג'ה קופץ על האופניים ושניהם רוכבים.
   · ברווז חוצה את השביל – עוצרים. RING – הפעמון מצלצל והברווז עף. בלי RING – אחרי זמן מה הוא הולך לבד.
   · רמפה לפני שלולית – עוצרים. JUMP – עולים ברמפה ועפים מעל השלולית.
   · גבעה: עולים, ובירידה האופניים מאיצים. BRAKE – מאטים ועוצרים לפני הבול שבתחתית. בלי BRAKE – נתקעים בבול,
     עפים מעל הכידון ומאבדים לב, קמים וממשיכים.
   · קו הסיום: STOP – עוצרים על הקו, GET OFF – יורדים מהאופניים. החבר שמח, והאופניים נשארים ליד הקו.
   סבלני: העולם מחכה למילה (חוץ מהירידה), ואחרי שתיקה ארוכה המשחק אומר אותה.
   פאזות: rideWait → mount → ride → duckWait → duckGo → ride → rampWait → rampGo → ride → (climb) down → logStop / crash → up → liftOver → ride
          → stopWait → stopping → offWait → off → cheer */

const BK = { stop: 40, friendDX: -14, duck: 115, duckStop: 15, ramp: 200, rampW: 12, rampH: 4.2, puddle: 26, fly: 9,
             hillUp: 290, hillTop: 326, top: 12, hillDown: 440, hillH: 12, log: 452, end: 560, after: 60,
             v: 26, climbV: 18, slow: 9, fastV: 48, mountT: 0.7, duckSelf: 7, duckGoT: 1.1, crashT: 1.3, upT: 1.0, liftT: 1.1,
             stopZone: 45, stopT: 0.6, offT: 0.6, cheerT: 1.6, hint: 3.5, hintEvery: 6, brakeHint: 1.6, coins: 4,
             wheel: 3.0, wb: 4.4 };
let bikeS = null;   // { o, p, t, idle, hinted, braked, crank }

function bkSetup(o) { o.w = BK.end + BK.after; }
function bkBusy() { return !!bikeS; }
function bkNX() { return PLAYER.x + PLAYER.w / 2; }                                 // מרכז הנינג'ה (העולם)
function bkHillH(o, x) {                                                           // גובה הגבעה בנקודה x (עולם)
  const r = x - o.x, s = q => q * q * (3 - 2 * q);
  if (r <= BK.hillUp || r >= BK.hillDown) return 0;
  if (r < BK.hillTop) return BK.hillH * s((r - BK.hillUp) / (BK.hillTop - BK.hillUp));
  if (r < BK.hillTop + BK.top) return BK.hillH;
  return BK.hillH * (1 - s((r - BK.hillTop - BK.top) / (BK.hillDown - BK.hillTop - BK.top)));
}
function bkSlope(o, x) { return Math.atan2(bkHillH(o, x + 1) - bkHillH(o, x - 1), 2); }   // חיובי = עלייה
function bkRampH(o, x) {                                                           // הרמפה: עולה בקו ישר
  const r = x - o.x - BK.ramp;
  return r > 0 && r < BK.rampW ? BK.rampH * r / BK.rampW : 0;
}
function bkGroundH(o, x) { return bkHillH(o, x) + bkRampH(o, x); }
function bkJumpH(o, x) {                                                           // הרמפה והקשת מעל השלולית
  const r = x - o.x, a = BK.ramp + BK.rampW, L = BK.puddle + BK.fly;
  if (r <= BK.ramp || r >= a + L) return 0;
  if (r <= a) return BK.rampH * (r - BK.ramp) / BK.rampW;
  const q = (r - a) / L; return BK.rampH * (1 - q) + Math.sin(Math.PI * q) * 9;
}
function bkLogX(o) { return o.x + BK.log; }
function bkRiding() { return !!bikeS && !['rideWait', 'off', 'cheer'].includes(bikeS.p) && !(bikeS.p === 'mount' && bikeS.t < BK.mountT * 0.5); }

// מהירות העולם
function bkSpeed() {
  if (!bikeS) return null;
  const S = bikeS, o = S.o, p = S.p, r = bkNX() - o.x;
  if (p === 'mount') return 5 / BK.mountT;                                        // הצעד אל האופניים
  if (p === 'ride') {
    if (r > BK.hillUp && r < BK.hillTop) return BK.climbV;                           // עלייה – לאט
    return BK.v;
  }
  if (p === 'duckGo') return S.t > 0.4 ? BK.v * Math.min(1, (S.t - 0.4) / 0.5) : 0;
  if (p === 'rampGo') return BK.v * 1.25;
  if (p === 'down') return S.v;
  if (p === 'liftOver') return S.t > 0.35 && S.t < 0.85 ? 18 : 0;               // מרים את האופניים מעל הבול
  if (p === 'stopWait') { const d = o.x + BK.end - bkNX(); return d > 0.5 ? Math.min(BK.v, Math.max(BK.slow, d * 0.5)) : 0; }   // מאט לקראת הקו (בלי STOP – עוצר על הקו ומחכה)
  if (p === 'stopping') { const d = o.x + BK.end - bkNX(); return d > 0.3 ? Math.min(Math.max(BK.slow, S.v0 || BK.slow), d * 2 + 1) : 0; }   // בולמים ונעצרים על הקו
  if (p === 'cheer' || p === 'off') return 0;
  if (p === 'walk') return null;
  return 0;
}
function bkUpdate(dt, pb) {
  if (!bikeS) {
    const nx0 = (pb.l + pb.r) / 2;
    const o = obstacles.find(o => o.type === 'bikeway' && !o.passed && nx0 >= o.x + BK.stop - 5 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    const over = nx0 - (o.x + BK.stop - 5); if (over > 0) ropeShiftBy(-over);
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    bikeS = { o, p: 'rideWait', t: 0, idle: 0, hinted: 0, braked: 0, crank: 0, v: BK.v };
    say2('friend: let\'s ride!', "Let's ride!");
    return;
  }
  const S = bikeS, o = S.o; S.t += dt;
  if (!obstacles.includes(o)) { bikeS = null; return; }
  const go = p => { S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }, demo = state !== 'play', nx = bkNX(), r = nx - o.x;
  S.crank += dt * (bkSpeed() || 0) * 0.55;                                         // הפדלים מסתובבים לפי המהירות
  if (demo) {
    const w = (bkExpected() || [])[0];
    if (w && S.t > 0.9 && S.p !== 'down') command(w, 'demo');
    if (S.p === 'down' && S.t > 0.6) command('brake', 'demo');
  }
  switch (S.p) {
    case 'mount': if (S.t >= BK.mountT) { go('ride'); sfx('swish'); } break;
    case 'ride':
      if (!o.duckDone && r >= BK.duck - BK.duckStop) { go('duckWait'); sfx('squawk'); }
      else if (!o.rampDone && r >= BK.ramp - 4) go('rampWait');
      else if (r >= BK.hillTop + BK.top * 0.5 && !o.hillDone) { go('down'); S.v = BK.v; }
      else if (r >= BK.end - BK.stopZone) go('stopWait');
      break;
    case 'duckWait':
      if (Math.random() < dt * 0.7) sfx('squawk');
      if (S.t >= BK.duckSelf) { go('duckGo'); S.walkOff = 1; }                  // לא צלצלו – הברווז הולך לבד
      break;
    case 'duckGo': if (S.t >= BK.duckGoT) { o.duckDone = 1; S.walkOff = 0; go('ride'); } break;
    case 'rampWait': break;
    case 'rampGo':                                                                 // עולים ברמפה ועפים מעל השלולית
      if (r >= BK.ramp + BK.rampW + BK.puddle + BK.fly) { o.rampDone = 1; go('ride'); sfx('thud'); burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 8, 14); }
      break;
    case 'down': {                                                                 // ירידה: בלי בלם מאיצים, עם בלם מאטים
      const dLog = BK.log - 7 - r, target = S.braked ? Math.max(4, Math.min(18, dLog * 0.9)) : BK.fastV;   // עם בלם: נוסעים לאט ועוצרים בעדינות לפני הבול
      S.v += (target - S.v) * Math.min(1, dt * (S.braked ? 2.2 : 0.55));
      if (!S.braked && Math.random() < dt * 4) particles.push({ x: PLAYER.x + 1, y: GROUND - bkGroundH(o, nx) - 3, vx: -14, vy: 0, g: 0, life: 0.35, color: 'rgba(255,255,255,.8)', size: 0.4 });   // קווי מהירות
      if (S.braked && r >= BK.log - 7) { o.hillDone = 1; go('liftOver'); sfx('thud'); }   // עוצרים לפני הבול ומרימים מעליו
      else if (!S.braked && r >= BK.log - 4.5) {                                  // נתקעים בבול
        o.hillDone = 1; go('crash'); sfx('hit'); shakeT = 0.3; burst(bkLogX(o), GROUND - 2, '#a16207', 10, 18);
        if (state === 'play' && !shieldSave() && !dragonSave()) {
          hits++; if (typeof voiceMark === 'function') voiceMark('hit');
          flash = { text: '🚲 BRAKE!', t: 1.4 }; speak('brake');
          if (isFinite(lives)) { lives--; renderHud(); if (lives <= 0) { mode === 'stage' ? stageFailed() : mode === 'journey' ? journeyOver(false) : endFree(false); return; } }
          renderHud();
        }
      }
      if (!demo && state === 'play' && !S.braked && S.t >= BK.brakeHint && !S.hinted) { S.hinted = 1; sayWords(['brake'], 1.2, S); }
      break;
    }
    case 'crash': if (S.t >= BK.crashT) go('up'); break;                            // עף מעל הכידון ונוחת
    case 'up': if (S.t >= BK.upT) go('liftOver'); break;                            // קם ומרים את האופניים
    case 'liftOver': if (S.t >= BK.liftT) { S.braked = 0; go('ride'); } break;
    case 'stopWait': break;
    case 'stopping': if (o.x + BK.end - nx <= 0.4) { go('offWait'); } break;
    case 'off': if (S.t >= BK.offT) { go('cheer'); sfx('clear'); say2('friend: great ride!', 'Great ride!'); } break;
    case 'cheer':
      if (S.t >= BK.cheerT) {
        o.parked = 1; cleared(o); bikeS = null;
        if (mode === 'journey' && state === 'play') { picked += BK.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BK.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
  }
  // רמז כשהשחקן שותק (במסע – חצי לב, פעם אחת לכל המכשול)
  if (['rideWait', 'duckWait', 'rampWait', 'stopWait', 'offWait'].includes(S.p) && !demo && state === 'play') {
    S.idle += dt;
    const w = (bkExpected() || [])[0];
    if (w && S.idle >= BK.hint + S.hinted * BK.hintEvery) { S.hinted++; sayWords([w], 1.6, S); }
  }
}
function say2(clip, text) { flash = { text: '🗣️ ' + text, t: 1.6, size: 8 }; if (VOICE_CLIPS[clip]) speak(clip); }
function bkPhysics() {
  if (!bikeS) return false;
  const S = bikeS, o = S.o, p = S.p, nx = bkNX(), r = nx - o.x; vy = 0;
  if (p === 'mount') { const k = Math.min(1, S.t / BK.mountT); py = Math.sin(Math.PI * k) * 4; return true; }
  if (p === 'rampGo') {
    py = bkJumpH(o, nx); return true;
  }
  if (p === 'crash') { const k = Math.min(1, S.t / BK.crashT); py = Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.4)) * 7); return true; }
  py = bkGroundH(o, nx);
  return true;
}

/* ---------- פקודות ---------- */
function bkCmd(word) {
  if (!bikeS || !['ride', 'ring', 'jump', 'brake', 'stop', 'get off'].includes(word)) return false;
  const S = bikeS, o = S.o, go = p => { S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }, r = bkNX() - o.x;
  if (word === 'ride' && S.p === 'rideWait') { go('mount'); sfx('jump'); }
  else if (word === 'ring') { sfx('bell'); if (S.p === 'duckWait') { go('duckGo'); S.walkOff = 0; sfx('squawk'); } }   // הפעמון מצלצל תמיד
  else if (word === 'jump' && S.p === 'rampWait') { go('rampGo'); sfx('jump'); }
  else if (word === 'brake' && (S.p === 'down' || (S.p === 'ride' && r > BK.hillTop - 12 && !o.hillDone)) && !S.braked) { S.braked = 1; sfx('brake'); }
  else if (word === 'stop' && S.p === 'stopWait') { S.v0 = bkSpeed() || 0; go('stopping'); sfx('brake'); }
  else if (word === 'get off' && S.p === 'offWait') { go('off'); sfx('jump'); }
  return true;                                                                       // בזמן הסצנה המילים האלה לא עושות את הפעולה הרגילה
}
function bkExpected() {
  if (!bikeS) return null;
  const S = bikeS, p = S.p, r = bkNX() - S.o.x;
  if (p === 'rideWait') return ['ride'];
  if (p === 'duckWait') return ['ring'];
  if (p === 'rampWait') return ['jump'];
  if ((p === 'down' || (p === 'ride' && r > BK.hillTop - 12 && !S.o.hillDone)) && !S.braked) return ['brake'];
  if (p === 'stopWait') return ['stop'];
  if (p === 'offWait') return ['get off'];
  return [];
}
function bkAuto() {
  const S = bikeS; if (!S) return;
  const w = (bkExpected() || [])[0];
  if (w && (S.t > 0.5 || S.p === 'down')) command(w, 'auto');
}

/* ---------- ציור ---------- */
function drawBike(cx, gy, tilt, col, crank, sc) {                                 // אופניים: (cx, gy) = אמצע, נקודת המגע עם הקרקע
  sc = sc || 1;
  const R = BK.wheel, wb = BK.wb;
  ctx.save(); ctx.translate(cx, gy); ctx.rotate(-tilt); ctx.scale(sc, sc);
  const rw = [-wb, -R], fw = [wb, -R], ck = [-0.4, -R + 0.2], st = [-1.7, -R - 4.3], hd = [wb - 1.1, -R - 4.0], bar = [wb - 1.6, -R - 5.6];
  for (const w of [rw, fw]) {                                                        // גלגלים
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(w[0], w[1], R - 0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(148,163,184,.7)'; ctx.lineWidth = 0.12;
    for (let k = 0; k < 4; k++) { const a = crank * 1.6 + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(w[0] - Math.cos(a) * (R - 0.7), w[1] - Math.sin(a) * (R - 0.7)); ctx.lineTo(w[0] + Math.cos(a) * (R - 0.7), w[1] + Math.sin(a) * (R - 0.7)); ctx.stroke(); }
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(w[0], w[1], 0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = col; ctx.lineWidth = 0.55; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(rw[0], rw[1]); ctx.lineTo(ck[0], ck[1]); ctx.lineTo(st[0], st[1]); ctx.lineTo(rw[0], rw[1]);   // משולש אחורי
  ctx.moveTo(ck[0], ck[1]); ctx.lineTo(hd[0], hd[1]); ctx.lineTo(st[0] + 0.2, st[1] + 0.6);                                     // שלדה
  ctx.moveTo(hd[0], hd[1]); ctx.lineTo(fw[0], fw[1]); ctx.stroke();                                                               // מזלג
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(hd[0], hd[1]); ctx.lineTo(bar[0], bar[1]); ctx.lineTo(bar[0] - 1.1, bar[1] + 0.1); ctx.stroke();   // כידון
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(st[0] - 0.2, st[1] - 0.35, 1.25, 0.4, 0, 0, Math.PI * 2); ctx.fill();   // מושב
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(bar[0] - 0.3, bar[1] - 0.35, 0.35, 0, Math.PI * 2); ctx.fill();               // פעמון
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.35; const pa = [Math.cos(crank) * 1.2, Math.sin(crank) * 1.2];                   // פדלים
  ctx.beginPath(); ctx.moveTo(ck[0] - pa[0], ck[1] - pa[1]); ctx.lineTo(ck[0] + pa[0], ck[1] + pa[1]); ctx.stroke();
  ctx.restore();
  return { seat: [st[0] - 0.2, st[1] - 0.6], bar: [bar[0] - 1.0, bar[1] + 0.1], ck, pa };
}
function bkIK(h, t, l1, l2, bend) {                                                // שתי עצמות: זווית עליונה ותחתונה כך שהקצה מגיע ל-t
  const dx = t[0] - h[0], dy = t[1] - h[1], d = Math.min(l1 + l2 - 0.02, Math.max(0.3, Math.hypot(dx, dy)));
  const a0 = Math.atan2(dx, dy), off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const a1 = a0 + bend * off, k = [h[0] + Math.sin(a1) * l1, h[1] + Math.cos(a1) * l1];
  return [a1, Math.atan2(t[0] - k[0], t[1] - k[1])];
}
// הנינג'ה (או החבר) על האופניים: הרגליים על הפדלים, הידיים על הכידון
function drawBikeRider(cx, gy, tilt, crank, accent, suit, sc, extra) {
  sc = sc || 1;
  const B = drawBike(cx, gy, tilt, accent, crank, sc), S = RIG.shape, now = performance.now() / 1000;
  const P = poseIdle(now); P.hipY = -4.6; P.lean = 0.42 + (extra && extra.lean || 0); P.bob = 0; P.spine = 0.05;
  if (extra && extra.eyes) P.eyes = extra.eyes;
  const J = figureJoints(P);
  // נקודות של האופניים במערכת של הדמות: (fx, fy) כך שהירך על המושב
  const fy = B.seat[1] - P.hipY, fx = B.seat[0];
  const toFig = q => [q[0] - fx, q[1] - fy];
  const ped = s => toFig([B.ck[0] + s * B.pa[0], B.ck[1] + s * B.pa[1]]);
  P.legs = [bkIK(J.hipB, ped(-1), S.thigh, S.shin, 1), bkIK(J.hipF, ped(1), S.thigh, S.shin, 1)];
  const bar = toFig(B.bar);
  P.arms = [bkIK(J.shB, [bar[0] - 0.3, bar[1]], S.upper, S.fore, -1), bkIK(J.shF, bar, S.upper, S.fore, -1)];
  if (extra && extra.arms) P.arms = extra.arms;
  ctx.save(); ctx.translate(cx, gy); ctx.rotate(-tilt); ctx.scale(sc, sc);
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent, pose: P, suit });
  ctx.restore();
}
function bkDuckPos(o) {                                                            // הברווז: הולך הלוך ושוב על השביל, ואז עף / הולך
  const S = bikeS && bikeS.o === o ? bikeS : null, now = performance.now() / 1000, x0 = o.x + BK.duck + 4;
  if (o.duckDone) return null;
  if (S && S.p === 'duckGo') {
    const k = Math.min(1, S.t / BK.duckGoT);
    return S.walkOff ? { x: x0 + k * 30, y: GROUND, fly: 0, dir: 1, walk: 1 } : { x: x0 + k * 26, y: GROUND - k * k * 26, fly: 1, dir: 1 };
  }
  const sx = Math.sin(now * 0.8) * 3;
  return { x: x0 + sx, y: GROUND, fly: 0, dir: Math.cos(now * 0.8) >= 0 ? 1 : -1, walk: 1 };
}
function drawDuck(D) {
  const now = performance.now() / 1000, wob = D.walk ? Math.sin(now * 10) * 0.12 : 0;
  ctx.save(); ctx.translate(D.x, D.y); ctx.scale(D.dir * 1.5, 1.5); ctx.rotate(wob);   // ברווז גדול וברור
  if (!D.fly) { ctx.strokeStyle = '#f97316'; ctx.lineWidth = 0.35; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0.2 * s, -1.2); ctx.lineTo(0.2 * s + Math.sin(now * 10) * 0.4 * s, 0); ctx.stroke(); } }
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(0, -2.6, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();   // גוף
  ctx.beginPath(); ctx.moveTo(-2.2, -2.9); ctx.lineTo(-3.2, -3.9); ctx.lineTo(-2.0, -3.6); ctx.fill();           // זנב
  ctx.beginPath(); ctx.arc(1.9, -4.6, 1.15, 0, Math.PI * 2); ctx.fill();                                          // ראש
  ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(2.9, -4.8); ctx.lineTo(4.2, -4.4); ctx.lineTo(2.9, -4.1); ctx.fill();   // מקור
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(2.3, -4.9, 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e2e8f0'; const wa = D.fly ? Math.sin(now * 20) * 0.9 : 0;                                    // כנף
  ctx.beginPath(); ctx.ellipse(-0.3, -2.9 - (D.fly ? 1 : 0), 1.5, 0.75, -0.3 - wa, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBikeWay(o) {
  const S = bikeS && bikeS.o === o ? bikeS : null, now = performance.now() / 1000, G = (typeof GROUND_STYLE !== 'undefined' && GROUND_STYLE[world]) || null, wd = WORLDS[world];
  // הגבעה
  const hl = o.x + BK.hillUp, hr = o.x + BK.hillDown;
  if (hr > viewL() - 5 && hl < viewR() + 5) {
    ctx.fillStyle = G ? G.dirt[0] : wd.ground; ctx.beginPath(); ctx.moveTo(hl, GROUND + 0.5);
    for (let x = hl; x <= hr; x += 1.5) ctx.lineTo(x, GROUND - bkHillH(o, x));
    ctx.lineTo(hr, GROUND + 0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = G ? G.grass[1] : wd.top; ctx.lineWidth = 1.1; ctx.beginPath();
    for (let x = hl; x <= hr; x += 1.5) ctx.lineTo(x, GROUND - bkHillH(o, x) + 0.3); ctx.stroke();
  }
  // הבול בתחתית הגבעה
  const lx = bkLogX(o);
  if (lx > viewL() - 6 && lx < viewR() + 6) {
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.ellipse(lx, GROUND - 1.5, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6a15a'; ctx.beginPath(); ctx.ellipse(lx + 0.6, GROUND - 1.5, 1.2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.15; ctx.beginPath(); ctx.ellipse(lx + 0.6, GROUND - 1.5, 0.6, 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // הרמפה והשלולית
  const rx = o.x + BK.ramp;
  if (rx + 60 > viewL() && rx < viewR() + 5) {
    ctx.fillStyle = 'rgba(56,189,248,.85)'; ctx.beginPath(); ctx.ellipse(rx + BK.rampW + BK.puddle / 2 + 1, GROUND + 0.2, BK.puddle / 2 + 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.ellipse(rx + BK.rampW + BK.puddle / 2 + 1, GROUND - 0.1, BK.puddle / 2 - 3, 0.6, 0, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(rx, GROUND + 0.3); ctx.lineTo(rx + BK.rampW, GROUND - BK.rampH); ctx.lineTo(rx + BK.rampW, GROUND + 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.25; for (const f of [0.35, 0.7]) { ctx.beginPath(); ctx.moveTo(rx + BK.rampW * f, GROUND + 0.3); ctx.lineTo(rx + BK.rampW * f, GROUND - BK.rampH * f); ctx.stroke(); }
  }
  // קו הסיום
  const ex = o.x + BK.end;
  if (ex > viewL() - 10 && ex < viewR() + 10) {
    ctx.fillStyle = '#e5e7eb'; for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#111827' : '#f8fafc'; ctx.fillRect(ex - 0.6, GROUND - 0.6 + k * 0.4 - 0.3, 1.2, 0.4); }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ex - 6, GROUND); ctx.lineTo(ex - 6, GROUND - 20); ctx.moveTo(ex + 6, GROUND); ctx.lineTo(ex + 6, GROUND - 20); ctx.stroke();
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111827' : '#f8fafc'; ctx.fillRect(ex - 6 + i, GROUND - 20 + j, 1, 1); }
    ctx.fillStyle = '#dc2626'; ctx.font = '900 2.4px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FINISH', ex, GROUND - 16.6);
  }
  // הברווז
  const D = bkDuckPos(o); if (D && D.x > viewL() - 6 && D.x < viewR() + 6) drawDuck(D);
  // העץ והאופניים החונים בהתחלה
  const bx = o.x + BK.stop;
  if (bx > viewL() - 20 && bx < viewR() + 20) {
    const tx = bx + 9; ctx.fillStyle = '#7c4a1e'; ctx.fillRect(tx - 1, GROUND - 16, 2, 16);
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(tx, GROUND - 19, 6, 0, Math.PI * 2); ctx.arc(tx - 4, GROUND - 16, 4.5, 0, Math.PI * 2); ctx.arc(tx + 4, GROUND - 16, 4.5, 0, Math.PI * 2); ctx.fill();
    if (!S || S.p === 'rideWait' || (S.p === 'mount' && S.t < BK.mountT * 0.5)) drawBike(bx, GROUND, 0, playerColor(), 0, 1);
  }
  // האופניים שנשארו ליד הקו
  if (o.parked) { drawBike(ex + 10, GROUND, 0, playerColor(), 0, 1); drawBike(ex + 20, GROUND, 0, '#2563eb', 0.6, 0.95); }
  // החבר
  if (!o.parked) drawBikeFriend(o);
  drawBikeTalk(o);
}
function bkFriendX(o) {                                                              // החבר: מחכה על האופניים, ואז רוכב מאחורי הנינג'ה
  const S = bikeS && bikeS.o === o ? bikeS : null;
  if (S && !['rideWait'].includes(S.p) && !(S.p === 'mount')) return bkNX() + BK.friendDX;
  return o.x + BK.stop + BK.friendDX;
}
function drawBikeFriend(o) {
  const S = bikeS && bikeS.o === o ? bikeS : null, x = bkFriendX(o), now = performance.now() / 1000;
  if (x < viewL() - 12 || x > viewR() + 12) return;
  const gh = bkHillH(o, x) + (S ? bkJumpH(o, x) : 0) + Math.max(0, 3 - Math.abs(x - bkLogX(o)) * 0.75), crank = S ? S.crank : 0;   // החבר קופץ גם הוא מהרמפה ומעל הבול
  const extra = {};
  if (!S || S.p === 'rideWait') extra.arms = [[1.3, 1.5], [2.7, 3.2 + Math.sin(now * 10) * 0.35]];   // מנופף
  if (S && (S.p === 'cheer' || S.p === 'off')) extra.arms = [[2.5, 2.9], [2.6, 3.0]];
  drawBikeRider(x, GROUND - gh, bkSlope(o, x), crank * 0.97 + 1.3, '#2563eb', null, 0.94, extra);
}
function drawBikeTalk(o) {
  const S = bikeS && bikeS.o === o ? bikeS : null;
  if (!S || !labelsVisible()) return;
  const p = S.p, lx = PLAYER.x + 4, ly = GROUND - bkGroundH(o, bkNX()) - 24;
  const L = { rideWait: 'RIDE', duckWait: 'RING', rampWait: 'JUMP', stopWait: 'STOP', offWait: 'GET OFF' }[p] || (bkExpected()[0] === 'brake' ? 'BRAKE' : null);
  if (L) label(L, lx, ly, 4, '#fde047', '#1e293b');
}
// הנינג'ה עצמו – מצויר כאן במקום הציור הרגיל (true = צויר)
function bkDrawNinja() {
  if (!bikeS) return false;
  const S = bikeS, o = S.o, p = S.p, cx = PLAYER.x + 4, nx = bkNX(), now = performance.now() / 1000;
  if (p === 'rideWait' || (p === 'mount' && S.t < BK.mountT * 0.5)) return false;    // עוד הולך – ציור רגיל
  if (p === 'crash' || p === 'up') {                                                 // האופניים שוכבים ליד הבול, הנינג'ה עף ונוחת
    const lx = bkLogX(o);
    drawBike(lx - 6.5, GROUND, 0.3, playerColor(), 0, 1);                                // האופניים נתקעו – הגלגל הקדמי על הבול
    if (p === 'crash') {
      const k = Math.min(1, S.t / BK.crashT), x = lx - 3 + k * 9, y = GROUND - Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.15)) * 9);
      ctx.save(); ctx.translate(x, y - 5); ctx.rotate(k * Math.PI * 1.6); drawFigure({ fx: 0, fy: 5, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: poseAir(false), suit: playerSuit() }); ctx.restore();
    } else {
      const P = poseIdle(now); P.eyes = 'wide'; P.lean = 0.5 * (1 - S.t / BK.upT); P.hipY = -4.6 + 2 * (1 - S.t / BK.upT);
      drawFigure({ fx: lx + 6, fy: GROUND, facing: -1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    }
    return true;
  }
  if (p === 'liftOver') {                                                            // מרים את האופניים מעל הבול והולך
    const k = Math.min(1, S.t / BK.liftT), lift = Math.sin(Math.PI * k) * 3.5;
    drawBike(cx + 3, GROUND - lift, 0, playerColor(), 0, 1);
    const P = poseWalk(now * 12); P.arms = [[1.6, 1.9], [1.7, 2.0]];
    drawFigure({ fx: cx - 3, fy: GROUND, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    return true;
  }
  if (p === 'off' || p === 'cheer') {                                                // ירד – עומד ליד האופניים
    const k = p === 'off' ? Math.min(1, S.t / BK.offT) : 1;
    drawBike(cx + 3 * k, GROUND, 0, playerColor(), S.crank, 1);
    const P = k < 1 ? poseAir(k < 0.5) : poseIdle(now);
    if (p === 'cheer') P.arms = [[2.5, 2.9], [2.6, 3.0 + Math.sin(now * 10) * 0.3]];
    drawFigure({ fx: cx - 4 * k, fy: GROUND - Math.sin(Math.PI * k) * 3, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
    return true;
  }
  const tilt = p === 'rampGo' && nx - o.x > BK.ramp + BK.rampW ? 0.25 - Math.min(0.5, (nx - o.x - BK.ramp - BK.rampW) / (BK.puddle + BK.fly) * 0.5) : p === 'rampGo' ? Math.atan2(BK.rampH, BK.rampW) : bkSlope(o, nx);
  const extra = {};
  if (p === 'down' && !S.braked) { extra.eyes = 'wide'; extra.lean = 0.12; }
  if (p === 'mount') extra.eyes = 'squint';
  drawBikeRider(cx, GROUND - py, tilt, S.crank, playerColor(), playerSuit(), 1, extra);
  if (p === 'duckWait' || p === 'rampWait' || p === 'stopWait' || p === 'offWait') {}
  return true;
}
