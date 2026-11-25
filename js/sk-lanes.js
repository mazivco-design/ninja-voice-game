/* ninja-voice-game – sk-lanes.js   (סקיצה, סבב 1 – 25 בנובמבר 2026)
   ריצה מהגב – כיוון, בהשראת Temple Run / OutRun. הנינג'ה עובר בשער טורי, והמסך מתחלף למבט מאחוריו:
   שביל עם שלושה מסלולים שנמשך אל האופק. סלעים מתקרבים וגדלים – LEFT / RIGHT כדי לעבור למסלול פנוי, ומטבעות במסלולים הפנויים.
   נתקע בסלע – "OUCH!" והמסך מהבהב (בלי לבבות). אחרי שישה גלים מגיע שער שני, והמסך חוזר לריצה הרגילה.
   מבט הגב מצויר ביחידות מסך (kxScreen), כמו ביריד.  נבנה על sketchkit.js. */

const LR = { gate: 24, fade: 0.6, travel: 3.0, gap: 3.3, hz: 40, feet: 92,
             waves: [[1], [0, 1], [2], [1, 2], [0], [0, 2]], coin: [0, 2, 1, 0, 2, 1] };
const lrS = z => 1 / (1 + Math.max(0, z) * 7);                                   // קנה מידה לפי מרחק: 1 קרוב, קטן רחוק
const lrY = z => LR.hz + (LR.feet - LR.hz) * lrS(z);
function lrGate(x, g, s, col) {                                                  // שער טורי
  ctx.fillStyle = col || '#dc2626'; ctx.fillRect(x - 9 * s, g - 24 * s, 2.2 * s, 24 * s); ctx.fillRect(x + 6.8 * s, g - 24 * s, 2.2 * s, 24 * s);
  ctx.fillRect(x - 11 * s, g - 20 * s, 22 * s, 1.8 * s);
  ctx.beginPath(); ctx.moveTo(x - 13 * s, g - 27 * s); ctx.quadraticCurveTo(x, g - 24.5 * s, x + 13 * s, g - 27 * s); ctx.lineTo(x + 12 * s, g - 24 * s); ctx.lineTo(x - 12 * s, g - 24 * s); ctx.fill();
}
function lrAlpha(S) { return S.p === 'in' ? kxE((S.t - 0.3) / LR.fade) : S.p === 'out' ? 1 - kxE(S.t / LR.fade) : S.p === 'exit' || S.p === 'start' ? 0 : 1; }
function lrNext(S) { return S.ws.find(w => w.z > 0.04) || null; }
function lrPov(S, Wd, now) {
  const cx = Wd / 2, hz = LR.hz;
  let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#e0f2fe'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, hz);
  ctx.fillStyle = '#86efac'; for (const [mx, mw, mh] of [[-60, 50, 16], [-10, 60, 22], [50, 55, 14]]) { ctx.beginPath(); ctx.moveTo(cx + mx - mw / 2, hz); ctx.quadraticCurveTo(cx + mx, hz - mh * 2, cx + mx + mw / 2, hz); ctx.fill(); }
  g = ctx.createLinearGradient(0, hz, 0, 100); g.addColorStop(0, '#4ade80'); g.addColorStop(1, '#16a34a'); ctx.fillStyle = g; ctx.fillRect(0, hz, Wd, 100 - hz);
  const k1 = (100 - hz) / (LR.feet - hz);                                        // הדרך: טרפז מהאופק עד תחתית המסך
  ctx.fillStyle = '#c8a26b'; ctx.beginPath(); ctx.moveTo(cx - 2, hz); ctx.lineTo(cx + 2, hz); ctx.lineTo(cx + 56 * k1, 100); ctx.lineTo(cx - 56 * k1, 100); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 10; i++) {                                                 // קווי המסלולים – מקטעים שזורמים אלינו
    const z0 = ((i + 1 - (S.dist % 1)) / 10) * 1.2, z1 = z0 - 0.045; if (z1 < -0.02) continue;
    const s0 = lrS(z0), s1 = 1 / (1 + z1 * 7);
    for (const off of [-18, 18]) { ctx.lineWidth = 1.4 * s1; ctx.beginPath(); ctx.moveTo(cx + off * s0, hz + (LR.feet - hz) * s0); ctx.lineTo(cx + off * s1, hz + (LR.feet - hz) * s1); ctx.stroke(); }
  }
  for (let i = 0; i < 7; i++) {                                                  // במבוק בצדדים
    const z = ((i + 1 - (S.dist * 0.7 % 1)) / 7) * 1.3, s = lrS(z), y = lrY(z);
    for (const side of [-1, 1]) { const x = cx + side * 74 * s; ctx.fillStyle = '#65a30d'; ctx.fillRect(x - 1.3 * s, y - 60 * s, 2.6 * s, 60 * s); ctx.fillStyle = '#4d7c0f'; ctx.beginPath(); ctx.ellipse(x + side * 5 * s, y - 46 * s, 7 * s, 2 * s, side * -0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  const things = [];                                                             // סלעים, מטבעות והשער – מהרחוק לקרוב
  for (const w of S.ws) if (w.z > -0.12 && w.z < 1.25) things.push(w);
  things.sort((a, b) => b.z - a.z);
  for (const w of things) {
    const s = lrS(w.z), y = lrY(w.z);
    if (w.gate) { lrGate(cx, y, 2.6 * s); continue; }
    for (const l of w.block) { const x = cx + (l - 1) * 36 * s;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(x - 13 * s, y); ctx.quadraticCurveTo(x - 12 * s, y - 16 * s, x - 2 * s, y - 19 * s); ctx.quadraticCurveTo(x + 11 * s, y - 17 * s, x + 13 * s, y); ctx.fill();
      ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(x - 9 * s, y - 4 * s); ctx.quadraticCurveTo(x - 8 * s, y - 14 * s, x - 2 * s, y - 16 * s); ctx.quadraticCurveTo(x - 1 * s, y - 8 * s, x - 9 * s, y - 4 * s); ctx.fill(); }
    if (!w.got) { const x = cx + (w.coin - 1) * 36 * s, sx = Math.max(0.25, Math.abs(Math.cos(now * 5)));
      ctx.save(); ctx.translate(x, y - 9 * s); ctx.scale(sx, 1); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 3.7 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  // הנינג'ה מהגב: רגליים רצות, גוף, ראש וסרט מתנופף; נוטה כשמחליף מסלול
  const x = cx + (S.lx - 1) * 36 + (S.ouch > 0 ? Math.sin(now * 50) * 1.2 : 0), run = now * 11, bob = Math.abs(Math.sin(run)) * 1.6, col = playerColor(), suit = '#1f2937';
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, LR.feet + 0.5, 8, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, LR.feet); ctx.rotate((S.lane - S.lx) * 0.28); ctx.translate(0, -bob);
  for (const sd of [-1, 1]) { const up = Math.max(0, Math.sin(run + (sd > 0 ? 0 : Math.PI))) * 5; ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(sd * 3.4 - 2, -12, 4, 12 - up + bob, 2); ctx.fill(); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(sd * 3.4, -up + bob, 2.6, 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const sd of [-1, 1]) { const sw = Math.sin(run + (sd > 0 ? Math.PI : 0)) * 3; ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(sd * 8.5, -19 + sw, 2.2, 5, sd * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(sd * 9.3, -14.5 + sw, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(0, -19, 7.5, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-7, -15, 14, 2.2);
  ctx.fillStyle = '#273449'; ctx.beginPath(); ctx.arc(0, -32, 6.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-6.6, -35, 13.2, 3, 1); ctx.fill();
  const fl = Math.sin(now * 9) * 2; ctx.beginPath(); ctx.moveTo(-1, -34); ctx.quadraticCurveTo(-7, -31 + fl, -11, -25 + fl); ctx.lineTo(-8.5, -24 + fl); ctx.quadraticCurveTo(-5, -30, 1, -32.5); ctx.fill();
  ctx.restore();
  if (S.ouch > 0) { ctx.fillStyle = 'rgba(239,68,68,' + S.ouch * 0.25 + ')'; ctx.fillRect(0, 0, Wd, 100); kxBig('OUCH!', cx, 30, 9, '#fecaca'); }
  for (let i = 0; i < S.coins; i++) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(8 + i * 6, 8, 2.4, 0, Math.PI * 2); ctx.fill(); }
}
kxScene({
  type: 'lanerun', listen: ['left', 'right'], w: 60, e0: 12, banner: 'LEFT · RIGHT – dodge the rocks!', time: 35, coins: 5, hint: 1.4, autoGap: 0.45,
  chips: { left: '← LEFT', right: 'RIGHT →' }, screenChip: [0, 12],
  start: () => ({ p: 'in', lane: 1, lx: 1, dist: 0, ouch: 0, coins: 0, wi: 0, next: 1.0, ws: [] }),
  update(S, dt) {
    if (S.ouch > 0) S.ouch -= dt;
    S.lx += (S.lane - S.lx) * Math.min(1, dt * 9);
    if (S.p === 'in') { S.nx = kxL(12, LR.gate, kxE(S.t / 0.5)); if (S.t > 0.3 + LR.fade) kxP(S, 'run'); }
    else if (S.p === 'run') {
      const sp = S.ouch > 0.5 ? 0.4 : 1; S.dist += dt * 2.6 * sp;
      S.next -= dt;
      if (S.next <= 0 && S.wi <= LR.waves.length) { const i = S.wi++; S.next = LR.gap; S.ws.push(i < LR.waves.length ? { z: 1.2, block: LR.waves[i], coin: LR.coin[i] } : { z: 1.2, gate: 1, block: [] }); }
      for (const w of S.ws) {
        const z0 = w.z; w.z -= dt * sp * 1.2 / LR.travel;
        if (z0 > 0.03 && w.z <= 0.03) {                                          // הגל הגיע אלינו
          const l = Math.round(S.lx);
          if (w.gate) { kxP(S, 'out'); sfx('win'); }
          else if (w.block.includes(l)) { S.ouch = 1; sfx('thud'); }
          else if (w.coin === l) { w.got = 1; S.coins++; sfx('coin'); }
        }
      }
    } else if (S.p === 'out') { if (S.t > LR.fade) kxP(S, 'exit'); }
    else if (S.p === 'exit' && kxExit(S, dt, 40)) return 'done';
  },
  expected(S) {
    if (S.p !== 'run') return [];
    const w = lrNext(S); if (!w || w.gate || w.z > 0.85) return [];
    const free = [0, 1, 2].filter(l => !w.block.includes(l)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane) || (a === w.coin ? -1 : 1));
    let target = S.lane;
    if (w.block.includes(S.lane)) target = free[0];                               // חסום – למסלול הפנוי הקרוב
    else if (!w.got && free.includes(w.coin) && Math.abs(w.coin - S.lane) === 1 && w.z > 0.3) target = w.coin;   // פנוי – אל המטבע, אם הוא צמוד
    return target < S.lane ? ['left'] : target > S.lane ? ['right'] : [];
  },
  hintWord(S) { const w = S.p === 'run' ? lrNext(S) : null; if (!w || w.gate || w.z > 0.7 || !w.block.includes(S.lane)) return null; const free = [0, 1, 2].filter(l => !w.block.includes(l)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane))[0]; return free < S.lane ? 'left' : 'right'; },
  cmd(S, w) { if (S.p !== 'run') return; S.lane = Math.max(0, Math.min(2, S.lane + (w === 'left' ? -1 : 1))); kxOk(S, w); sfx('swish'); },
  draw(o, S) { lrGate(o.x + LR.gate, GROUND, 1); },
  front(o, S) { const a = lrAlpha(S); if (a > 0) kxScreen(Wd => { ctx.globalAlpha = a; lrPov(S, Wd, performance.now() / 1000); ctx.globalAlpha = 1; }); },
  ninja(S, now) { kxNinja(S, S.p === 'exit' || S.p === 'in' ? poseRun(S.nx * 0.55) : poseIdle(now)); }
});
