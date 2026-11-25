/* ninja-voice-game – sketchkit.js
   ערכה קטנה לסקיצות (HANDOFF-NEW-STAGES.md, סעיף 9): סקיצה = קובץ קצר שקורא ל-kxScene({...}).
   הערכה עושה את כל מה שחוזר על עצמו: כניסה לסצנה כשהנינג'ה מגיע, עצירת הריצה, רמז קולי אחרי שתיקה,
   השחקן האוטומטי וההדגמה, צ'יפ המילה (אפור – מחכים, ירוק – נקלטה), יציאה, מטבעות ורישום ב-sceneAdd.
   שדות של kxScene:
     type, listen[], w (רוחב), e0 (איפה הנינג'ה נעצר), banner, time (אורך ההדגמה), coins, hint (שניות של שתיקה, מצטברות בזמן שיש מה לומר, עד רמז קולי)
     start(o) → שדות התחלתיים למצב S.   update(S, dt, demo) → מחזיר 'done' כשנגמר.
     expected(S) → [מילה] שהשחקן האוטומטי יגיד עכשיו (חלון התזמון הטוב), או [].
     hintWord(S) → המילה לרמז קולי אחרי שתיקה (ברירת מחדל: expected).   cmd(S, word).
     draw(o, S|null) – מאחורי הנינג'ה (גם לפני שהסצנה התחילה).   front(o, S) – מלפנים.   ninja(S, now) – מצייר את הנינג'ה.
     chip: false – בלי צ'יפ (למשל במשחק זיכרון).   chips: { word: 'TEXT' }.   screenChip: [x, y] ביחידות מסך (לסצנות במבט אחר).
   מצב S תמיד כולל: o, t (זמן בשלב p), p, nx (מיקום הנינג'ה יחסית למכשול), quiet, chipOk, chipW.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const KX = {};                                                                   // type → מצב הסצנה (או null)
const kxE = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const kxL = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function kxNX() { return PLAYER.x + 4; }
function kxP(S, p) { S.p = p; S.t = 0; }
function kxOk(S, w) { S.chipOk = 1.0; S.chipW = w; }                              // המילה נקלטה – צ'יפ ירוק
function kxFollow(S, lead) { const over = S.o.x + S.nx - (kxNX() + (lead || 0)); if (over > 0) ropeShiftBy(over); }   // העולם זז עם הנינג'ה
function kxExit(S, dt, endX) { S.nx += 15 * dt; kxFollow(S); return S.o.x + endX < -20 || S.t > 8; }               // ריצה החוצה; true כשיצא
function kxShadow(x, y) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, (y === undefined ? GROUND : y) + 0.2, 3.2, 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
function kxNinja(S, P, h) {                                                      // הנינג'ה במקום S.nx, בגובה h מעל הקרקע
  const fx = S.o.x + S.nx, fy = GROUND - (h || 0);
  kxShadow(fx);
  drawFigure({ fx, fy, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, suit: playerSuit() });
  return playerHand = figHand(fx, fy, 1, 1, P, 1);
}
function kxFriend(x, P, facing, h) {                                             // החבר; מחזיר את היד שלו
  kxShadow(x); drawFriend({ fx: x, fy: GROUND - (h || 0), pose: P, facing: facing || 1 });
  return figHand(x, GROUND - (h || 0), facing || 1, FRIEND.scale, P, 1);
}
function kxChipAt(cx, y, txt, ok, sz) {
  sz = sz || 6; txt = (ok ? '✓ ' : '') + txt;
  ctx.save(); ctx.font = '900 ' + sz + 'px -apple-system, system-ui, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pw = ctx.measureText(txt).width + sz * 1.6, ph = sz * 1.55;
  ctx.translate(cx, y);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 0.4, -ph / 2 + 0.6, pw, ph, ph / 2); ctx.fill();
  ctx.fillStyle = ok ? '#16a34a' : 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
  if (!ok) { ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = sz * 0.07; ctx.stroke(); }
  ctx.fillStyle = ok ? '#fff' : '#6b7280'; ctx.fillText(txt, 0, sz * 0.05);
  ctx.restore();
}
function kxScreen(fn) {                                                          // ציור ביחידות מסך: גובה המסך = מאה, fn(רוחב)
  const c = ctx.canvas, u = c.height / 100;
  ctx.save(); ctx.setTransform(u, 0, 0, u, 0, 0); fn(c.width / u); ctx.restore();
}
function kxBig(txt, cx, y, sz, col) {                                            // כיתוב גדול עם קו מתאר
  ctx.font = '900 ' + sz + 'px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = sz * 0.22; ctx.strokeStyle = '#1e1b4b'; ctx.lineJoin = 'round'; ctx.strokeText(txt, cx, y); ctx.fillStyle = col || '#fff'; ctx.fillText(txt, cx, y);
}

function kxScene(d) {
  const T = d.type, e0 = d.e0 || 12, get = () => KX[T] || null;
  KX[T] = null;
  const want = S => (d.expected(S) || [])[0] || null;
  function update(dt, pb) {
    let S = get();
    if (!S) {
      const o = obstacles.find(o => o.type === T && !o.passed && kxNX() >= o.x + e0 - 0.3 && pb.l < o.x + o.w);
      if (!o) return;
      py = 0; vy = 0; duckT = 0; flyT = 0; act.run = 0;
      KX[T] = Object.assign({ o, t: 0, p: 'start', nx: e0, quiet: 0, chipOk: 0, chipW: null, autoT: 0 }, d.start(o) || {});
      return;
    }
    const o = S.o; S.t += dt; S.autoT += dt; if (S.chipOk > 0) S.chipOk -= dt;
    if (!obstacles.includes(o)) { KX[T] = null; return; }
    const demo = state !== 'play';
    if (d.update(S, dt, demo) === 'done') {
      cleared(o); KX[T] = null;
      if (mode === 'journey' && state === 'play') { const n = d.coins || 4; picked += n; coinsFlying++; flyCoinToHud({ x: PLAYER.x + 1 }, GROUND - 18); floatText(PLAYER.x + 4, GROUND - 26, '+' + n + ' 🟡', '#ca8a04'); }
      return;
    }
    const w = want(S);
    if (demo) { if (w && S.autoT > (d.autoGap || 0.5)) { S.autoT = 0; command(w, 'demo'); speak(w); } }
    else if (state === 'play') {                                                  // רמז קולי אחרי שתיקה
      const hw = d.hintWord ? d.hintWord(S) : w;
      if (hw) { S.quiet += dt; if (S.quiet > (d.hint || 4)) { S.quiet = 0; speak(hw); } }   // השתיקה נצברת רק כשיש מה לומר, ומתאפסת כשהילד אומר מילה
    }
  }
  sceneAdd({
    type: T, word: T, label: true, listen: d.listen,
    active: () => !!get(), reset: () => { KX[T] = null; },
    setup: o => { o.w = d.w || 70; }, afterGap: 0.6, noCollide: true,
    box: o => ({ l: o.x, r: o.x + o.w, t: GROUND - 2, b: GROUND }),
    stopAt: o => o.x + e0 + PLAYER.w / 2,
    draw: o => { const S = get(); d.draw(o, S && S.o === o ? S : null); },
    drawFront: o => {
      const S = get(); if (!S || S.o !== o) return;
      if (d.front) d.front(o, S);
      if (d.chip === false || state !== 'play') return;
      const ok = S.chipOk > 0, w = ok ? S.chipW : want(S); if (!w) return;
      const txt = (d.chips && d.chips[w]) || w.toUpperCase();
      if (d.screenChip) kxScreen(Wd => kxChipAt(Wd / 2 + d.screenChip[0], d.screenChip[1], txt, ok));
      else kxChipAt(W / 2, 24 - (typeof camDY === 'number' ? camDY : 0), txt, ok);
    },
    drawNinja: () => { const S = get(); if (!S) return false; d.ninja(S, performance.now() / 1000); return true; },
    update, physics: () => { if (!get()) return false; vy = 0; py = 0; return true; }, speed: () => (get() ? 0 : null),
    expected: () => { const S = get(); return S ? d.expected(S) || [] : null; },
    cmd: word => { const S = get(); if (!S || !d.listen.includes(word)) return false; S.quiet = 0; d.cmd(S, word); return true; },
    auto: () => { const S = get(); if (!S) return; const w = want(S); if (w && S.autoT > (d.autoGap || 0.5)) { S.autoT = 0; command(w, 'auto'); } },
    tap: () => { const S = get(); return S ? want(S) || (d.hintWord && d.hintWord(S)) || null : null; },
    intro: { banner: d.banner, time: d.time || 25, demo: () => { const o = { type: T }; o.w = d.w || 70; o.x = kxNX() - e0; obstacles.push(o); } }
  });
}
