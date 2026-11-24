/* ninja-voice-game – apple.js
   עץ התפוחים (שלב בפיתוח, 2026-11-24): הנינג'ה נעצר מתחת לעץ תפוחים.
   SHAKE – העץ רועד, עלים ותפוחים נופלים. בניעור השני תפוח נוחת לו על הראש (BONK!).
   EAT – מרים תפוח, שלוש נגיסות, זורק את הגלעין וממשיך. התפוחים שעל הקרקע נאספים בדרך.
   אין פגיעות ואין לבבות. אחרי שתיקה המשחק אומר את המילה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const AP = { e0: 18, tree: 26, w: 64, walkV: 15, hint: 3.5, hintEvery: 5, shakeT: 1.1, coins: 3, grav: 95 };
// התפוחים על העץ, יחסית לבסיס הגזע (x ימינה, y למעלה שלילי). round – באיזה ניעור הוא נופל
const AP_APPLES = [
  { x: 5, y: -33, round: 0 }, { x: 11, y: -29, round: 0 },
  { x: -1, y: -41, round: 1 }, { x: -11, y: -31, round: 1 }, { x: 8, y: -40, round: 1 },
  { x: -8, y: -27, round: 1, head: true }                                       // מעל הראש של הנינג'ה
];
const AP_CHIP = { shake: 'SHAKE', eat: 'EAT' };
let apS = null;
const apE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const apL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function apNX() { return PLAYER.x + 4; }                                          // מרכז הנינג'ה הרגיל על המסך
function apSetup(o) { o.w = AP.w; }
function apP(p) { const S = apS; S.p = p; S.t = 0; S.idle = 0; S.hinted = 0; }
function apStart(o) {
  apS = { o, p: 'look', t: 0, idle: 0, hinted: 0, n: AP.e0, round: 0, held: null, bonk: 0, bites: 0, wob: 0, wobT: 9,
          apples: AP_APPLES.map(a => ({ x: AP.tree + a.x, y: a.y, hx: a.x, hy: a.y, round: a.round, head: !!a.head, st: 'hang', vx: 0, vy: 0, rot: 0, sp: 0 })),
          leaves: [], hand: null, core: null, chipOk: 0, chipW: null };
}

/* ---------- העדכון ---------- */
function apUpdate(dt, pb) {
  if (!apS) {
    const o = obstacles.find(o => o.type === 'apples' && !o.passed && apNX() >= o.x + AP.e0 - 0.3 && pb.l < o.x + o.w);
    if (!o) return;
    py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
    apStart(o); return;
  }
  const S = apS, o = S.o; S.t += dt; S.wobT += dt; if (S.chipOk > 0) S.chipOk -= dt;
  if (!obstacles.includes(o)) { apS = null; return; }
  const demo = state !== 'play';
  if (demo) {                                                                     // ההדגמה אומרת את המילים בעצמה
    const w = (apExpected() || [])[0];
    if (w && S.t > 0.9) { command(w, 'demo'); speak(w); }
  }
  // העץ רועד – דועך
  S.wob = S.wobT < AP.shakeT ? Math.sin(S.wobT * 34) * 0.07 * (1 - S.wobT / AP.shakeT) : 0;
  switch (S.p) {
    case 'look': if (S.t >= 0.7) apP('shakeWait'); break;                        // מביט למעלה אל התפוחים
    case 'shakeWait': if (S.held === 'shake') { S.held = null; apShake(); } break;
    case 'shaking':
      if (S.t >= 0.3 && !S.dropped) { S.dropped = 1; apDrop(S.round); }
      if (S.t >= AP.shakeT) {
        S.round++; S.dropped = 0;
        if (S.round < 2) apP('shakeWait');
        else apP('after');
      }
      break;
    case 'after':                                                                // מחכים שהתפוחים ינחתו (וה-BONK ייגמר)
      if (S.bonk <= 0 && S.t > 0.4 && !S.apples.some(a => a.st === 'fall')) apP('eatWait');
      break;
    case 'eatWait': if (S.held === 'eat') { S.held = null; apEat(); } break;
    case 'eating': {
      const t = S.t;
      if (t >= 0.45 && !S.hand) { const a = apNearest(); if (a) { a.st = 'hand'; S.hand = a; } }      // מרים תפוח מהרצפה
      for (const [at, k] of [[1.0, 1], [1.45, 2], [1.9, 3]]) if (t >= at && S.bites < k) { S.bites = k; sfx('pop'); }
      if (t >= 2.15 && !S.yum) { S.yum = 1; floatText(o.x + S.n + 2, GROUND - 22, 'Yum! 😋', '#16a34a'); }
      if (t >= 2.55 && S.hand) {                                                 // זורק את הגלעין אחורה
        const h = S.handPos || [o.x + S.n, GROUND - 14];
        S.core = { x: h[0] - o.x, y: h[1] - GROUND, vx: -26, vy: -30, rot: 0 }; S.hand = null; sfx('swish');
      }
      if (t >= 3.0) apP('exit');
      break;
    }
    case 'exit': {                                                               // ממשיכים בדרך ואוספים את התפוחים שעל הקרקע
      S.n += AP.walkV * dt;
      for (const a of S.apples) if (a.st === 'ground' && Math.abs(a.x - S.n) < 2.5) {
        a.st = 'gone'; sfx('coin'); floatText(o.x + a.x, GROUND - 8, '+🍎', '#dc2626');
      }
      const over = o.x + S.n - apNX(); if (over > 0) ropeShiftBy(over);
      if (o.x + AP.tree < -30 || S.t > 9) {
        cleared(o); apS = null;
        if (mode === 'journey' && state === 'play') { picked += AP.coins; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + AP.coins + ' 🟡', '#ca8a04'); }
        return;
      }
      break;
    }
  }
  if (S.bonk > 0) S.bonk -= dt;
  // תפוחים שנופלים, קופצים ומתגלגלים
  for (const a of S.apples) {
    if (a.st !== 'fall') continue;
    a.vy += AP.grav * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.sp * dt;
    if (a.head && !a.bonked && a.y >= -16.5 && Math.abs(a.x - S.n) < 3) {          // נוחת על הראש
      a.bonked = 1; a.y = -16.5; a.vy = -24; a.vx = 9; a.sp = 7; S.bonk = 1.4; sfx('thud');
      floatText(o.x + S.n, GROUND - 24, 'BONK!', '#dc2626');
    }
    if (a.y >= -1.3) {
      a.y = -1.3;
      if (a.vy > 14) { a.vy *= -0.35; a.vx *= 0.6; if (!a.head || a.bonked) sfx('thud'); }
      else { a.vy = 0; a.vx *= Math.pow(0.02, dt); a.sp = a.vx / 1.3; if (Math.abs(a.vx) < 0.4) { a.st = 'ground'; a.vx = 0; } }
    }
  }
  // עלים
  for (const l of S.leaves) { l.t += dt; l.y = Math.min(-0.4, l.y + 7 * dt); l.x += Math.sin(l.t * 3 + l.ph) * 6 * dt; l.r += dt * 2; }
  S.leaves = S.leaves.filter(l => l.t < 3.2);
  if (S.core) { const c = S.core; c.vy += AP.grav * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot -= 9 * dt; if (c.y >= -1) { c.y = -1; c.vy = 0; c.vx = 0; } }
  // רמזים: אחרי שתיקה המשחק אומר את המילה
  const want = (apExpected() || [])[0];
  if (want && !demo && state === 'play') {
    S.idle += dt;
    if (S.idle > AP.hint + S.hinted * AP.hintEvery) { S.hinted++; speak(want); }
  }
}
function apShake() {
  const S = apS; apP('shaking'); S.wobT = 0; sfx('swish');
  for (let k = 0; k < 9; k++) S.leaves.push({ x: AP.tree - 14 + Math.random() * 28, y: -44 + Math.random() * 18, t: 0, ph: Math.random() * 6, r: Math.random() * 3, c: Math.random() });
}
function apDrop(round) {
  const S = apS;
  for (const a of S.apples) if (a.st === 'hang' && a.round === round) {
    const p = apHangPos(a, S.wob);
    a.x = p[0]; a.y = p[1]; a.st = 'fall'; a.vy = -2 - Math.random() * 3; a.vx = a.head ? 0 : (a.hx > 0 ? 3 : -2) + Math.random() * 3; a.sp = (Math.random() - 0.5) * 4;
    if (a.head) { a.x = S.n + 0.6; a.vy = 0; }
  }
}
function apNearest() {
  const S = apS; let best = null;
  for (const a of S.apples) if (a.st === 'ground' && (!best || Math.abs(a.x - S.n - 3) < Math.abs(best.x - S.n - 3))) best = a;
  return best;
}
function apEat() { const S = apS; apP('eating'); S.bites = 0; S.yum = 0; const a = apNearest(); S.pickX = a ? a.x : S.n + 4; }
function apHangPos(a, wob) {                                                     // תפוח תלוי – זז עם הצמרת שרועדת סביב הגזע
  const px = 0, py = -20, dx = a.hx - px, dy = a.hy - py, c = Math.cos(wob), s = Math.sin(wob);
  return [AP.tree + px + dx * c - dy * s, py + dx * s + dy * c + Math.abs(wob) * 3];
}
function apPhysics() { if (!apS) return false; vy = 0; py = 0; return true; }
function apSpeed() { return apS ? 0 : null; }

/* ---------- פקודות ---------- */
function apCmd(word) {
  if (!apS || !['shake', 'eat'].includes(word)) return false;
  const S = apS;
  if (word === 'shake') {
    if (S.p === 'shakeWait') { apChipOk('shake'); apShake(); }
    else if (S.p === 'look' || (S.p === 'shaking' && S.round === 0 && S.t > 0.5)) { S.held = 'shake'; apChipOk('shake'); }
  } else if (word === 'eat') {
    if (S.p === 'eatWait') { apChipOk('eat'); apEat(); }
    else if (S.p === 'after' || (S.p === 'shaking' && S.round === 1)) { S.held = 'eat'; apChipOk('eat'); }
  }
  return true;
}
function apChipOk(w) { apS.chipOk = 1.1; apS.chipW = w; }
function apExpected() {
  if (!apS) return null;
  return apS.p === 'shakeWait' ? ['shake'] : apS.p === 'eatWait' ? ['eat'] : [];
}
function apAuto() { const S = apS; if (!S) return; const w = (apExpected() || [])[0]; if (w && S.idle > 0.6) command(w, 'auto'); }
function apTap() { return apS ? (apExpected() || [])[0] || null : null; }

/* ---------- ציור ---------- */
function apApple(x, y, r, rot, bites) {                                         // תפוח אדום עם הברקה, גבעול ועלה. bites: 0–2 נגיסות, 3 = גלעין
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  if (bites >= 3) {                                                             // גלעין: אמצע צר בהיר, כיפות אדומות למעלה ולמטה
    ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.ellipse(0, -r * 0.78, r * 0.62, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, r * 0.8, r * 0.55, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#44403c'; ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.08, r * 0.16, 0.2, 0, Math.PI * 2); ctx.ellipse(r * 0.12, r * 0.2, r * 0.08, r * 0.16, -0.2, 0, Math.PI * 2); ctx.fill();
  } else {
    const B = [[r * 1.05, -r * 0.15], [-r * 1.05, r * 0.05]].slice(0, bites);
    for (const [bx, by] of B) { ctx.beginPath(); ctx.rect(-r * 3, -r * 3, r * 6, r * 6); ctx.arc(bx, by, r * 0.62, 0, Math.PI * 2, true); ctx.clip(); }   // נגיסה – חור עגול בצד
    ctx.fillStyle = '#dc2626'; ctx.beginPath();
    ctx.moveTo(0, -r * 0.7); ctx.bezierCurveTo(r * 0.6, -r * 1.15, r * 1.25, -r * 0.6, r * 1.0, r * 0.25);
    ctx.bezierCurveTo(r * 0.8, r * 0.95, r * 0.3, r * 1.05, 0, r * 0.85); ctx.bezierCurveTo(-r * 0.3, r * 1.05, -r * 0.8, r * 0.95, -r * 1.0, r * 0.25);
    ctx.bezierCurveTo(-r * 1.25, -r * 0.6, -r * 0.6, -r * 1.15, 0, -r * 0.7); ctx.fill();
    ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.35, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();   // צל עדין בצד
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.3, r * 0.2, r * 0.32, 0.4, 0, Math.PI * 2); ctx.fill();
    if (bites) { ctx.fillStyle = '#fef3c7'; for (const [bx, by] of B) { ctx.beginPath(); ctx.arc(bx, by, r * 0.72, 0, Math.PI * 2); ctx.arc(bx, by, r * 0.62, 0, Math.PI * 2, true); ctx.fill(); } }   // הבשר הבהיר בשולי הנגיסה
  }
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.72); ctx.quadraticCurveTo(r * 0.05, -r * 1.1, r * 0.25, -r * 1.3); ctx.stroke();
  if (bites < 3) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 1.12, r * 0.42, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function apLeaf(x, y, r, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r);
  ctx.fillStyle = c > 0.5 ? '#4d9a3a' : '#6cb84a'; ctx.beginPath(); ctx.ellipse(0, 0, 1.1, 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawAppleTree(o) {
  const S = apS && apS.o === o ? apS : null, wob = S ? S.wob : 0, tx = o.x + AP.tree, g = GROUND;
  // צל על הקרקע
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(tx, g + 0.4, 17, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  // גזע: מתרחב בבסיס, שני ענפים עבים אל הצמרת
  ctx.save();
  ctx.fillStyle = '#7c5a3a';
  ctx.beginPath(); ctx.moveTo(tx - 3.2, g); ctx.quadraticCurveTo(tx - 1.6, g - 4, tx - 1.7, g - 12); ctx.lineTo(tx - 1.4, g - 21); ctx.lineTo(tx + 1.6, g - 21);
  ctx.lineTo(tx + 1.8, g - 12); ctx.quadraticCurveTo(tx + 1.7, g - 4, tx + 3.4, g); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#654630'; ctx.beginPath(); ctx.moveTo(tx + 0.6, g); ctx.quadraticCurveTo(tx + 1.2, g - 6, tx + 1.0, g - 21); ctx.lineTo(tx + 1.6, g - 21); ctx.lineTo(tx + 1.8, g - 12); ctx.quadraticCurveTo(tx + 1.7, g - 4, tx + 3.4, g); ctx.fill();   // צד בצל
  ctx.strokeStyle = 'rgba(60,40,25,.45)'; ctx.lineWidth = 0.35;                   // קליפה
  for (const [y0, y1, dx] of [[g - 3, g - 8, -0.6], [g - 10, g - 15, 0.4], [g - 6, g - 11, 1.1]]) { ctx.beginPath(); ctx.moveTo(tx + dx, y0); ctx.quadraticCurveTo(tx + dx + 0.4, (y0 + y1) / 2, tx + dx, y1); ctx.stroke(); }
  // הצמרת מסתובבת קצת סביב בסיס הענפים כשהעץ רועד
  ctx.translate(tx, g - 20); ctx.rotate(wob); ctx.translate(-tx, -(g - 20));
  ctx.strokeStyle = '#7c5a3a'; ctx.lineCap = 'round';
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx, g - 20); ctx.quadraticCurveTo(tx - 3, g - 25, tx - 8, g - 28); ctx.stroke();
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx, g - 20); ctx.quadraticCurveTo(tx + 3, g - 26, tx + 8, g - 30); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx, g - 21); ctx.lineTo(tx + 0.5, g - 33); ctx.stroke();
  // עלווה: גושים חופפים, כהה מאחור ובהיר מלפנים-למעלה (בלי קו מתאר)
  const blobs = [[-11, -30, 7.5, 6], [10, -31, 8, 6.2], [0, -38, 10, 7.5], [-6, -43, 7, 5], [7, -42, 7.5, 5.2], [-1, -29, 9, 5.5], [13, -36, 5.5, 4.5], [-14, -36, 5.5, 4.5]];
  ctx.fillStyle = '#3f7d2e'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx, g + by + 0.8, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#4f9a38'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 0.5, g + by - 0.4, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#69b548'; for (const [bx, by, rx, ry] of blobs) { ctx.beginPath(); ctx.ellipse(tx + bx - 1.4, g + by - 1.6, rx * 0.5, ry * 0.42, -0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // תפוחים שעוד תלויים
  if (S) { for (const a of S.apples) if (a.st === 'hang') { const p = apHangPos(a, wob); apApple(o.x + p[0], g + p[1], 1.35, wob, 0); } }
  else for (const a of AP_APPLES) apApple(tx + a.x, g + a.y, 1.35, 0, 0);
  if (S) {
    for (const a of S.apples) if (a.st === 'ground') apApple(o.x + a.x, g + a.y, 1.35, a.rot, 0);
    if (S.core) apApple(o.x + S.core.x, g + S.core.y, 1.35, S.core.rot, 3);
  }
}
function drawAppleFront(o) {
  const S = apS && apS.o === o ? apS : null; if (!S) return;
  for (const a of S.apples) if (a.st === 'fall') apApple(o.x + a.x, GROUND + a.y, 1.35, a.rot, 0);
  for (const l of S.leaves) apLeaf(o.x + l.x, GROUND + l.y, l.r, l.c);
  if (S.bonk > 0) {                                                              // כוכבים סביב הראש
    ctx.fillStyle = '#facc15'; ctx.font = '3px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) { const a = S.bonk * 6 + k / 3 * Math.PI * 2; ctx.fillText('★', o.x + S.n + Math.cos(a) * 3.6, GROUND - 17.5 + Math.sin(a) * 1.1); }
  }
  apDrawChip();
}
function apDrawChip() {                                                         // המילה שמחכים לה – בראש המסך: אפורה, ירוקה עם ✓ כשנקלטה
  const S = apS; if (state !== 'play') return;
  let w = null, ok = false;
  if (S.chipOk > 0) { w = S.chipW; ok = true; } else w = (apExpected() || [])[0];
  if (!w) return;
  const txt = AP_CHIP[w] || w.toUpperCase(), y = 24, sz = 6;
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
function apNinjaPose(S, now) {
  const P = poseIdle(now), t = S.t;
  if (S.p === 'exit') return poseRun(S.n * 0.55);
  if (S.bonk > 0) {                                                              // משפשף את הראש, עיניים מצומצמות
    const k = apE((1.4 - S.bonk) / 0.2);
    P.arms = [P.arms[0], [apL(0.25, 2.75, k), apL(0.7, 4.3 + Math.sin(now * 14) * 0.25, k)]]; P.eyes = 'squint'; P.headTilt = 0.15 * k; P.lean = -0.04;
    return P;
  }
  if (S.p === 'look' || S.p === 'shakeWait') { P.headTilt = -0.3; return P; }  // מביט למעלה אל התפוחים
  if (S.p === 'shaking') {                                                       // אוחז בגזע ומנער
    const sw = Math.sin(t * 34) * (1 - t / AP.shakeT);
    P.arms = [[1.35, 1.5], [1.45, 1.6]]; P.lean = 0.18 + sw * 0.1; P.hipY = -4.4 + Math.abs(sw) * 0.3; P.eyes = 'squint';
    P.legs = [[-0.35, -0.5], [0.3, 0.1]];
    return P;
  }
  if (S.p === 'eating') {
    if (t < 0.45) { const k = apE(t / 0.25);                                     // מתכופף אל התפוח
      return Object.assign(P, { hipY: apL(-4.6, -3.4, k), lean: apL(0.05, 0.55, k), spine: 0.25 * k, legs: [[apL(-0.15, -0.5, k), apL(-0.1, -2.0, k)], [apL(0.18, 1.35, k), apL(0.12, -0.1, k)]], arms: [[0.6 * k, 0.9 * k], [0.35, 0.55]] }); }
    if (t < 2.55) {                                                              // התפוח אל הפה – נגיסות
      const up = apE((t - 0.45) / 0.35), bite = [1.0, 1.45, 1.9].some(b => t >= b - 0.12 && t < b + 0.08);
      P.arms = [P.arms[0], [apL(0.35, 0.55, up), apL(0.55, 2.75, up)]]; P.headTilt = bite ? 0.2 : 0.05; P.eyes = t >= 2.1 ? 'squint' : P.eyes;
      return P;
    }
    const k = apE((t - 2.55) / 0.2);                                             // זורק את הגלעין אחורה מעבר לכתף
    P.arms = [P.arms[0], [apL(0.55, -2.6, k), apL(2.75, -2.2, k)]]; P.lean = apL(0.05, -0.08, k);
    return P;
  }
  return P;
}
function apDrawNinja() {
  const S = apS; if (!S) return false;
  const now = performance.now() / 1000, fx = S.o.x + S.n, fy = GROUND, P = apNinjaPose(S, now);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, GROUND + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  playerHand = figHand(fx, fy, 1, 1, P, 1); S.handPos = playerHand;
  if (S.hand) { const up = S.p === 'eating' && S.t > 0.5; apApple(playerHand[0] + (up ? 0.6 : 0.4), playerHand[1] - (up ? 0.9 : 0.6), 1.35, 0, S.bites); }
  return true;
}

sceneAdd({
  type: 'apples', word: 'apples', label: true,
  listen: ['shake', 'eat'],
  active: () => !!apS,
  reset: () => { apS = null; },
  setup: apSetup, afterGap: 0.6, noCollide: true,
  box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
  stopAt: o => o.x + AP.e0 + PLAYER.w / 2,
  draw: drawAppleTree, drawFront: drawAppleFront, drawNinja: apDrawNinja,
  update: apUpdate, physics: apPhysics, speed: apSpeed,
  expected: apExpected, cmd: apCmd, auto: apAuto, tap: apTap,
  intro: { banner: 'SHAKE · EAT!', time: 13,
           demo: () => { const o = { type: 'apples' }; apSetup(o); o.x = apNX() - AP.e0; obstacles.push(o); } }
});
