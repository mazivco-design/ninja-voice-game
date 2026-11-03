/* ninja-voice-game – boat.js
   PUSH TOGETHER (סירה): סירת עץ עומדת על החוף ליד נהר רחב, ונינג'ה חבר מחכה לידה.
   הנינג'ה נעצר מאחורי הסירה. החבר אומר "Let's push!" – הילד אומר PUSH, ושניהם דוחפים: הסירה זזה צעד על החול.
   אחרי כמה דחיפות הסירה במים. החבר קופץ פנימה ואומר "Jump in!" – הילד אומר JUMP וקופץ לסירה.
   שניהם חותרים לצד השני (לבד, בלי מילה), הנינג'ה קופץ לגדה, והחבר נשאר בסירה ומנופף.
   סבלני: העולם מחכה למילה. אחרי שתיקה ארוכה המשחק אומר את המילה בקול.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const BOAT = { sand: 40, river: 96, len: 28, h: 6.5, bx0: 4, pushes: 3, step: 9, pushT: 0.7, hiT: 1.2, boardT: 0.7, boardDX: 13,
               row: 26, landT: 0.75, landDX: 21, byeT: 1.0, hint: 3.5, hintEvery: 6, coins: 4 };
let boat = null;   // { o, phase: 'hi' | 'wait' | 'push' | 'friendIn' | 'jumpWait' | 'board' | 'row' | 'land', t, idle, hinted, n }

function boatStern(o) { return o.x + o.bx; }                                       // הקצה האחורי של הסירה (שם דוחפים)
function riverL(o) { return o.x + BOAT.sand; }
function riverR(o) { return o.x + BOAT.sand + BOAT.river; }
function boatPool(o) { return { x: riverL(o), w: BOAT.river }; }
function boatAfloat(o) { return boatStern(o) + BOAT.len * 0.45 > riverL(o); }      // רוב הסירה כבר במים
function boatBob() { return Math.sin(performance.now() / 1000 * 2.4) * 0.35; }
// גובה תחתית הסירה: על החול – על הקרקע. במים – צפה (שוקעת קצת), בשפה – באלכסון
function boatKeelY(o) {
  const mid = boatStern(o) + BOAT.len / 2, k = Math.max(0, Math.min(1, (mid - riverL(o) + 6) / 12));
  return lerp(GROUND, waterY() + 2.2 + boatBob(), k);
}
function boatDeck(o) { return boatKeelY(o) - 3.4; }                                // איפה יושבים בתוך הסירה
function boatBusy() { return !!boat; }

// מהירות העולם בזמן השלב (null = לא בשליטה שלנו)
function boatSpeed() {
  if (!boat) return null;
  const p = boat.phase;
  if (p === 'push') return BOAT.step / BOAT.pushT;
  if (p === 'board') return BOAT.boardDX / BOAT.boardT;
  if (p === 'row') return BOAT.row;
  if (p === 'land') return BOAT.landDX / BOAT.landT;
  return 0;
}

function boatUpdate(dt, pb) {
  if (!boat) {
    const o = obstacles.find(o => o.type === 'boat' && !o.passed && pb.r >= boatStern(o) - 0.3 && pb.l < riverR(o));
    if (!o) return;
    const over = pb.r - boatStern(o); if (over > 0) ropeShiftBy(over);         // בדיוק מאחורי הסירה
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    boat = { o, phase: 'hi', t: 0, idle: 0, hinted: 0, n: 0 };
    return;
  }
  const B = boat, o = B.o, v = boatSpeed(); B.t += dt;
  if (!obstacles.includes(o)) { boat = null; return; }
  const demo = state !== 'play';
  const go = ph => { B.phase = ph; B.t = 0; B.idle = 0; B.hinted = 0; };
  if (B.phase === 'push' || B.phase === 'row') o.bx += v * dt;                   // הסירה זזה יחד עם הנינג'ה (העולם זז אחורה)
  if (B.phase === 'land') o.bx += 0;                                              // הסירה נשארת בגדה
  if (B.phase === 'wait' || B.phase === 'jumpWait') {                             // מחכים למילה – אחרי שתיקה ארוכה המשחק אומר אותה
    B.idle += dt;
    const w = B.phase === 'wait' ? 'push' : 'jump';
    if (demo) { if (B.idle >= 0.9) { if (banner) banner.text = 'Say ' + w.toUpperCase() + '!'; command(w, 'demo'); } }
    else if (B.idle >= BOAT.hint + B.hinted * BOAT.hintEvery) { B.hinted++; sayWords([w], 1.6); }
  }
  switch (B.phase) {
    case 'hi': if (B.t < dt * 1.5) speak("let's push!"); if (B.t >= BOAT.hiT) go('wait'); break;
    case 'push':
      if (Math.random() < 0.5) particles.push({ x: PLAYER.x + 2 + Math.random() * 3, y: GROUND, vx: -8 - Math.random() * 8, vy: -4 - Math.random() * 5, g: 40, life: 0.45, color: '#e7cf9a', size: 0.8 });   // חול שעף מהרגליים
      if (B.t >= BOAT.pushT) {
        B.n++; sfx('hit');
        if (B.n >= BOAT.pushes) { go('friendIn'); burst(boatStern(o) + BOAT.len * 0.8, waterY(), '#e0f2fe', 12, 24); sfx('pop'); }   // הסירה במים – התזה
        else go('wait');
      }
      break;
    case 'friendIn': if (B.t >= 0.8) { go('jumpWait'); speak('jump in!'); } break;   // החבר קופץ פנימה ראשון
    case 'board': if (B.t >= BOAT.boardT) { go('row'); burst(PLAYER.x + 4, boatDeck(o), '#e0f2fe', 6, 14); } break;
    case 'row': if (boatStern(o) + BOAT.len >= riverR(o) - 1) go('land'); break;   // החרטום נגע בגדה השנייה
    case 'land':
      if (B.t >= BOAT.landT) {
        py = 0; vy = 0; burst(PLAYER.x + 4, GROUND - 0.5, WORLDS[world].dust, 7, 14); sfx('clear');
        if (mode === 'journey' && state === 'play') { picked += BOAT.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + BOAT.coins + ' 🟡', '#ca8a04'); }
        cleared(o); o.waving = true; boat = null;
      }
      break;
  }
}
// גובה הנינג'ה: קפיצה לסירה וקפיצה ממנה לגדה (true = השלב שולט בגובה)
function boatPhysics(dt) {
  if (!boat) return false;
  const B = boat, p = B.phase;
  if (p === 'board') { const k = Math.min(1, B.t / BOAT.boardT); py = Math.sin(Math.PI * k) * 9; vy = 0; return true; }
  if (p === 'land') { const k = Math.min(1, B.t / BOAT.landT); py = Math.sin(Math.PI * k) * 8; vy = 0; return true; }
  if (p === 'row') { py = 0; vy = 0; return true; }
  return false;
}
// כמה הנינג'ה מצויר נמוך מהקרקע (יושב בתוך הסירה)
function boatSink() {
  if (!boat) return 0;
  const B = boat, p = B.phase, d = boatDeck(B.o) - GROUND;
  if (p === 'board') return d * Math.min(1, B.t / BOAT.boardT);
  if (p === 'row') return d;
  if (p === 'land') return d * (1 - Math.min(1, B.t / BOAT.landT));
  return 0;
}

/* ---------- פקודות ---------- */
function boatPush() {
  if (!boat) return false;
  if (boat.phase === 'wait') { boat.phase = 'push'; boat.t = 0; }
  return true;
}
function boatJump() {                                                             // true = ה-JUMP טופל כאן
  if (!boat) return false;
  if (boat.phase === 'jumpWait') { boat.phase = 'board'; boat.t = 0; sfx('jump'); }
  return true;
}
function boatExpected() {
  if (!boat) return null;
  return boat.phase === 'wait' ? ['push'] : boat.phase === 'jumpWait' ? ['jump'] : [];
}
function boatAuto() { if (boat && boat.idle > 0.4) { const w = boatExpected()[0]; if (w) command(w, 'auto'); } }

/* ---------- תנוחות ---------- */
function rowArms(P, now, ph) {                                                    // חתירה: ידיים קדימה ואחורה עם המשוט
  const c = Math.sin(now * 4 + (ph || 0));
  P.arms = [[1.2 + c * 0.5, 1.7 + c * 0.3], [1.3 + c * 0.5, 1.8 + c * 0.3]];
  P.lean = 0.1 - c * 0.18;
  return P;
}
function sitLegs(P) { P.legs = [[1.45, -0.15], [1.55, -0.05]]; P.hipY = -2.2; P.bob = 0; return P; }
function boatPose(P) {
  if (!boat) return P;
  const p = boat.phase, now = performance.now() / 1000;
  if (p === 'push') return posePush();
  if (p === 'wait' || p === 'hi' || p === 'friendIn' || p === 'jumpWait') { P = poseIdle(now); P.arms = [[1.3, 1.45], [1.4, 1.55]]; P.lean = 0.12; return P; }   // ידיים על הסירה
  if (p === 'board' || p === 'land') return poseAir(boat.t < (p === 'board' ? BOAT.boardT : BOAT.landT) / 2);
  if (p === 'row') return rowArms(sitLegs(poseIdle(now)), now);
  return P;
}

/* ---------- ציור ---------- */
function friendSpot(o) {                                                          // איפה החבר ובאיזו תנוחה
  const B = boat && boat.o === o ? boat : null, p = B ? B.phase : 'done', now = performance.now() / 1000, st = boatStern(o);
  const side = st + 8, sy = GROUND - 4.6;                                         // עומד בצד הרחוק של הסירה, ידיים על הדופן – דוחפים ביחד
  if (!B && !o.waving) return { x: side, y: sy, P: poseIdle(now), scale: 0.92 };
  if (p === 'hi' || p === 'wait') { const P = poseIdle(now); P.arms = [[1.2, 1.5], [1.3, 1.6]]; P.lean = 0.15; if (p === 'hi') P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35]; return { x: side, y: sy, P, scale: 0.92 }; }
  if (p === 'push') return { x: side, y: sy, P: posePush(), scale: 0.92 };
  const seat = st + BOAT.len * 0.72, deck = boatDeck(o);
  if (p === 'friendIn') {                                                        // קופץ פנימה בקשת
    const k = Math.min(1, B.t / 0.6), e = k * k * (3 - 2 * k);
    return { x: lerp(side, seat, e), y: lerp(sy, deck, e) - Math.sin(Math.PI * k) * 8, P: k < 1 ? poseAir(k < 0.5) : sitLegs(poseIdle(now)), scale: 0.92 };
  }
  if (p === 'row') return { x: seat, y: deck, P: rowArms(sitLegs(poseIdle(now)), now, 0.4), scale: 0.92 };
  const P = sitLegs(poseIdle(now)); P.arms[1] = [2.7, 3.2 + Math.sin(now * 10) * 0.35];   // נשאר בסירה ומנופף
  return { x: seat, y: deck, P, scale: 0.92 };
}

// לפני הנינג'ה: חוף החול, הנהר, פנים הסירה, משוטים והחבר
function drawBoatBack(o) {
  const t = performance.now() / 1000, P = boatPool(o), bottom = GROUND + 40, wy = waterY();
  const sx = o.x - 6, sw = BOAT.sand + 10;                                        // חול על החוף
  const sg = ctx.createLinearGradient(0, GROUND - 0.4, 0, GROUND + 3);
  sg.addColorStop(0, '#f3dfae'); sg.addColorStop(1, '#d9bc80');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(sx, GROUND + 3);
  for (let x = sx; x <= sx + sw; x += 2) ctx.lineTo(x, GROUND - 0.35 + Math.sin(x * 0.6) * 0.15);
  ctx.lineTo(sx + sw, GROUND + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(160,120,60,.35)'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(sx + 3 + k * 5.3, GROUND + 0.9 + (k % 2) * 0.8, 0.5, 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
  drawBasinWall(P, bottom);                                                       // הנהר – בנוי כמו האגם
  const g = ctx.createLinearGradient(0, wy, 0, GROUND + 30);
  g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = g; waterPath(P, bottom); ctx.fill();
  drawShore(P);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.35;              // זרם – פסים קטנים שזזים
  for (let i = 0; i < BOAT.river / 9; i++) { const xx = P.x + 8 + ((i * 9 + t * 6) % (BOAT.river - 16)); ctx.beginPath(); ctx.moveTo(xx, wy + 2 + (i % 3) * 1.6); ctx.lineTo(xx + 2.6, wy + 2 + (i % 3) * 1.6); ctx.stroke(); }
  const F = friendSpot(o), inBoat = !!(boat && boat.o === o && ['friendIn', 'jumpWait', 'board', 'row', 'land'].includes(boat.phase) && !(boat.phase === 'friendIn' && boat.t < 0.35)) || o.waving;
  if (!inBoat) drawFigure({ fx: F.x, fy: F.y, facing: 1, scale: F.scale, kind: 'ninja', accent: mudAccent(), pose: F.P });
  drawBoatHull(o, true);                                                          // פנים הסירה (הדופן הרחוקה)
  if (inBoat) drawFigure({ fx: F.x, fy: F.y, facing: 1, scale: F.scale, kind: 'ninja', accent: mudAccent(), pose: F.P });
}
// אחרי הנינג'ה: הדופן הקרובה של הסירה (מסתירה את הרגליים של היושבים), מים מעל תחתית הסירה, ובועות דיבור
function drawBoatFront(o) {
  drawBoatHull(o, false);
  const kd = boatKeelY(o);
  if (kd > GROUND + 0.5) {                                                        // הסירה צפה – המים מכסים קצת את התחתית
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#38bdf8'; waterPath(boatPool(o), GROUND + 40); ctx.clip();
    ctx.fillRect(boatStern(o) - 2, waterY(), BOAT.len + 4, 3); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.35;
    const t = performance.now() / 1000; for (const dx of [-1.5, BOAT.len + 1.5]) { ctx.beginPath(); ctx.ellipse(boatStern(o) + dx, waterY() + 0.4, 1.6 + Math.sin(t * 3) * 0.3, 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  drawBoatTalk(o);
}
function drawBoatHull(o, inner) {                                                 // סירת עץ: דופן מעוגלת, קרשים, שפה עליונה, משוטים
  const x0 = boatStern(o), L = BOAT.len, kb = boatKeelY(o), top = kb - BOAT.h, now = performance.now() / 1000;
  const k = Math.max(0, Math.min(1, (x0 + L / 2 - riverL(o) + 6) / 12)), tilt = (1 - Math.abs(k * 2 - 1)) * -0.06;   // בשפה – נוטה קצת
  ctx.save(); ctx.translate(x0 + L / 2, kb); ctx.rotate(tilt); ctx.translate(-(x0 + L / 2), -kb);
  if (inner) {
    ctx.fillStyle = '#7c4a1e'; ctx.beginPath(); ctx.moveTo(x0 - 1, top + 0.4); ctx.lineTo(x0 + L + 1.5, top - 0.6); ctx.lineTo(x0 + L - 1, top + 2.2); ctx.lineTo(x0 + 1, top + 2.6); ctx.closePath(); ctx.fill();   // פנים הסירה
    const rowing = boat && boat.o === o && boat.phase === 'row', c = Math.sin(now * 4);   // משוטים
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    for (const [ox, ph] of [[L * 0.35, 0], [L * 0.72, 0.4]]) {
      const a = rowing ? 0.5 + Math.sin(now * 4 + ph) * 0.45 : 0.15, hx = x0 + ox, hy = top + 0.5;
      ctx.beginPath(); ctx.moveTo(hx - Math.cos(a) * 4, hy - Math.sin(a) * 3); ctx.lineTo(hx + Math.cos(a) * 9, hy + Math.sin(a) * 6 + 2); ctx.stroke();
      ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * 9, hy + Math.sin(a) * 6 + 2, 1.8, 0.6, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(0, top, 0, kb);
  g.addColorStop(0, '#b45309'); g.addColorStop(1, '#78350f');
  ctx.fillStyle = g; ctx.beginPath();                                             // הדופן: ירכתיים ישרים, חרטום מורם ומחודד
  ctx.moveTo(x0 - 1, top); ctx.lineTo(x0 + L + 2.5, top - 1.2);
  ctx.quadraticCurveTo(x0 + L + 1, kb - 1.5, x0 + L - 3, kb);
  ctx.lineTo(x0 + 2, kb); ctx.quadraticCurveTo(x0 - 0.2, kb - 1, x0 - 1, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(66,32,6,.45)'; ctx.lineWidth = 0.25;                  // קרשים
  for (const f of [0.38, 0.7]) { ctx.beginPath(); ctx.moveTo(x0 - 0.4, lerp(top, kb, f)); ctx.lineTo(x0 + L + 1.2 - f * 2.5, lerp(top - 1.1, kb, f) - 0.2); ctx.stroke(); }
  ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.moveTo(x0 - 1.2, top - 0.5); ctx.lineTo(x0 + L + 2.8, top - 1.7); ctx.lineTo(x0 + L + 2.6, top - 0.8); ctx.lineTo(x0 - 1.2, top + 0.5); ctx.closePath(); ctx.fill();   // השפה העליונה
  ctx.fillStyle = '#422006'; for (const f of [0.15, 0.5, 0.85]) { ctx.beginPath(); ctx.arc(x0 + L * f, lerp(top, top - 1.1, f) + 0.05, 0.25, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawBoatTalk(o) {
  const B = boat && boat.o === o ? boat : null, F = friendSpot(o), by = F.y - 15.5;
  if (!B) { if (o.waving && F.x < W + 4 && F.x > -6) drawBubble('Bye! 👋', F.x, by, { tail: -1, size: 3.4 }); return; }
  const p = B.phase;
  if (p === 'hi') drawBubble("Let's push!", F.x, by, { age: B.t, tail: -1, color: '#1d4ed8' });
  if (p === 'wait' && B.n > 0) drawBubble('Again!', F.x, by, { age: B.idle, tail: -1, color: '#1d4ed8', size: 3.8 });
  if (p === 'push') drawBubble(B.n === BOAT.pushes - 1 ? 'Yes!' : 'Hup!', F.x, by, { age: B.t, tail: -1, size: 3.6 });
  if (p === 'jumpWait' || (p === 'friendIn' && B.t > 0.6)) drawBubble('Jump in!', F.x, by, { age: p === 'jumpWait' ? B.t + 0.3 : 0, tail: -1, color: '#1d4ed8' });
  if (p === 'row' && B.t < 1.6) drawBubble('Row, row! 🚣', F.x, by, { age: B.t, tail: -1, size: 3.6 });
  if (labelsVisible()) {
    if (p === 'wait') label('PUSH', boatStern(o) - 3, GROUND - 24, 4, '#fde047', '#1e293b');
    if (p === 'jumpWait') label('JUMP', PLAYER.x + 4, GROUND - 24, 4, '#fde047', '#1e293b');
  }
}
