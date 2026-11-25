/* ninja-voice-game – sk-rope.js   (סקיצה, סבב 1 – 25 בנובמבר 2026)
   קפיצה בחבל – קצב, בהשראת משחקי הקפיצה בחבל של Mario Party / Rhythm Heaven. החבר מסובב חבל שקשור לעמוד במבוק,
   ורואים אותו מסובב כבר מרחוק. הנינג'ה נכנס לאמצע. JUMP בכל פעם שהחבל יורד – והמונה סופר: 1, 2, 3...
   כל קפיצה מוצלחת מזרזת קצת את החבל. לא קפץ בזמן – החבל נתקע ברגליים ("Oops!") ומתחילים שוב לסובב (המונה לא מתאפס).
   שש קפיצות – סיום.  נבנה על sketchkit.js. */

const JR = { post: 8, fr: 34, cx: 21, R: 9.5, T0: 2.0, Tmin: 1.45, need: 6, jump: 0.75 };
let jrIdle = 0;                                                                  // הזווית של החבל לפני שהסצנה התחילה
function jrRope(o, ph, front, hand) {                                            // חצי קדמי (יורד) עבה ובהיר, חצי אחורי דק וכהה
  if ((Math.sin(ph) >= 0) !== front) return;
  const g = GROUND, ax = o.x + JR.post, ay = g - 9.5, bx = hand[0], by = hand[1], c = Math.cos(ph);
  ctx.strokeStyle = front ? '#f59e0b' : '#b45309'; ctx.lineWidth = front ? 0.8 : 0.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, g - 9.5 - 2 * c * JR.R, bx, by); ctx.stroke();
}
function jrFriendPose(S, now, ph) {
  const P = poseIdle(now + 0.4);
  if (S && S.p === 'exit') return poseRun(S.fx * 0.5);
  if (S && S.p === 'win') { P.arms = [[2.5, 2.9], [2.6, 3.0]]; return P; }
  const a = 1.5 + Math.cos(ph) * 0.9; P.arms = [P.arms[0], [a, a + 0.1]]; return P;   // היד מסתובבת עם החבל
}
kxScene({
  type: 'jumprope', listen: ['jump'], w: 70, e0: JR.cx, banner: 'JUMP every time the rope comes down!', time: 26, coins: 4, hint: 0.55, autoGap: 0.3,
  start: () => ({ p: 'ready', ph: jrIdle % (Math.PI * 2), T: JR.T0, jt: 9, n: 0, trip: 0, fx: JR.fr, big: 9 }),
  update(S, dt) {
    S.jt += dt; S.big += dt;
    if (S.p === 'ready' && S.t > 0.8) kxP(S, 'play');
    if (S.p === 'ready' || S.p === 'play') {
      if (S.trip > 0) { S.trip -= dt; if (S.trip <= 0) S.ph = Math.PI + 0.5; return; }   // החבל תקוע ברגליים
      const p0 = S.ph; S.ph = (S.ph + dt * Math.PI * 2 / S.T) % (Math.PI * 2);
      if (S.p === 'play' && p0 < Math.PI && S.ph >= Math.PI) {                   // החבל עובר מתחת לרגליים
        const h = S.jt < JR.jump ? Math.sin(S.jt / JR.jump * Math.PI) * 6.5 : 0;
        if (h > 1.5) { S.n++; S.big = 0; sfx('coin'); S.T = Math.max(JR.Tmin, S.T - 0.1); if (S.n >= JR.need) { kxP(S, 'win'); sfx('win'); } }
        else { S.trip = 1.1; S.ph = Math.PI; sfx('thud'); floatText(S.o.x + JR.cx, GROUND - 20, 'Oops!', '#dc2626'); }
      }
    } else if (S.p === 'win') { if (S.t > 1.6) kxP(S, 'exit'); }
    else if (S.p === 'exit') { S.fx += 15 * 1.25 * dt; if (kxExit(S, dt, JR.fr + 6)) return 'done'; }
  },
  expected(S) {
    if (S.p !== 'play' || S.trip > 0 || S.jt < JR.jump) return [];
    const tb = ((Math.PI - S.ph + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / S.T);   // כמה זמן עד שהחבל למטה
    return tb > 0.16 && tb < 0.48 ? ['jump'] : [];
  },
  cmd(S) { if ((S.p === 'play' || S.p === 'ready') && S.jt >= JR.jump && S.trip <= 0) { S.jt = 0; kxOk(S, 'jump'); sfx('jump'); } },
  draw(o, S) {
    const g = GROUND, now = performance.now() / 1000;
    if (!S) jrIdle = now * Math.PI * 2 / JR.T0;
    const ph = S ? S.ph : jrIdle;
    ctx.fillStyle = '#65a30d'; ctx.fillRect(o.x + JR.post - 0.9, g - 14, 1.8, 14); ctx.fillStyle = '#4d7c0f'; for (const h of [4.5, 9.5]) ctx.fillRect(o.x + JR.post - 1.1, g - h, 2.2, 0.5);   // עמוד במבוק
    const P = jrFriendPose(S, now, ph), hand = kxFriend(o.x + (S ? S.fx : JR.fr), P, -1);
    (S || KX).hand = hand;
    if (!S || (S.p !== 'exit' && S.p !== 'win')) jrRope(o, ph, false, hand);
  },
  front(o, S) {
    const g = GROUND;
    if (S.p !== 'exit' && S.p !== 'win') jrRope(o, S.ph, true, S.hand);
    else if (S.p === 'win') { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(o.x + JR.post, g - 9.5); ctx.quadraticCurveTo(o.x + JR.cx, g + 8, S.hand[0], S.hand[1]); ctx.stroke(); }
    const k = Math.min(1, S.big / 0.25), a = S.big < 0.9 ? 1 : Math.max(0.35, 1.9 - S.big);   // המונה הגדול
    if (S.n > 0) { ctx.save(); ctx.globalAlpha = a; ctx.translate(o.x + JR.cx, g - 30); ctx.scale(1.5 - 0.5 * k, 1.5 - 0.5 * k); kxBig(String(S.n), 0, 0, 9, S.n >= JR.need ? '#facc15' : '#fff'); ctx.restore(); }
    for (let i = 0; i < JR.need; i++) { ctx.fillStyle = i < S.n ? '#facc15' : 'rgba(30,41,59,.25)'; ctx.beginPath(); ctx.arc(o.x + JR.cx - (JR.need - 1) * 1.6 + i * 3.2, g - 39, 1.1, 0, Math.PI * 2); ctx.fill(); }
  },
  ninja(S, now) {
    let P = poseIdle(now), h = 0;
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else if (S.trip > 0) { P.lean = 0.3; P.eyes = 'squint'; P.arms = [[-0.8, -0.4], [1.8, 2.2]]; }
    else if (S.jt < JR.jump) { h = Math.sin(S.jt / JR.jump * Math.PI) * 6.5; P = poseAir(true, S.jt / JR.jump); }
    kxNinja(S, P, h);
  }
});
