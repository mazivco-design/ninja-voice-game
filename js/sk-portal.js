/* ninja-voice-game – sk-portal.js   (סקיצות, סבב 2 – 25 בנובמבר 2026)
   הפורטל – מנוע משותף לעולמות שנכנסים אליהם דרך פורטל (המשוב של זיו: "שיהיה לזה מראה של פורטל, והוא יפתח מלא אפשרויות").
   במבט הצד עומד פורטל: טבעת אור מסתחררת עם ניצוצות. הנינג'ה קופץ פנימה, המסך נשאב במערבולת – ונפתח עולם במבט מהגב,
   שבו דברים מתקרבים מהאופק בשלושה נתיבים. בסוף מגיע פורטל יציאה, מערבולת, והנינג'ה נפלט מפורטל שני בחזרה לריצה.
   כל עולם הוא קובץ קצר שקורא ל-pfScene ונותן רק את הציור שלו והגלים שלו (דוגמאות: sk-lanes.js, sk-fly.js, sk-river.js):
     neg / pos – המילים לשני הכיוונים (left/right או up/down).   acts – מילות פעולה ומשך בשניות, למשל { jump: 0.9, down: 1.1 }.
     waves – [{ b: [נתיבים חסומים], c: נתיב המטבע } | { all: 'jump' }] – גל "all" חוסם את כל הנתיבים ודורש את הפעולה.
     vp(cx) – נקודת המגוז.   lanePos(l, cx) – מקום הנתיב בגודל מלא.   bg / block / coin / wall / hero – הציור.
   הכול מצויר ביחידות מסך (kxScreen: גובה המסך = מאה).  נבנה על sketchkit.js. */

const PF = { portal: 26, exit: 50, travel: 3.0, gap: 3.2 };
const pfS = z => 1 / (1 + Math.max(0, z) * 7);                                   // קנה מידה לפי מרחק
function pfPortal(x, g, s, now, hue, open) {                                     // פורטל: טבעת אור, מערבולת בפנים, ניצוצות סביב
  if (open !== undefined && open <= 0.02) return; if (open !== undefined) s *= open;
  const cy = g - 11.5 * s, rx = 6.2 * s, ry = 11 * s, H = h => 'hsl(' + ((hue + h) % 360) + ',';
  let gr = ctx.createRadialGradient(x, cy, ry * 0.4, x, cy, ry * 1.5); gr.addColorStop(0, H(0) + '95%,70%,.55)'); gr.addColorStop(1, H(0) + '95%,70%,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, cy, rx * 1.9, ry * 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  gr = ctx.createRadialGradient(x, cy, 0, x, cy, ry); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, H(40) + '95%,75%)'); gr.addColorStop(1, '#1e1b4b'); ctx.fillStyle = gr; ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.55 * s; ctx.lineCap = 'round';
  for (let a = 0; a < 3; a++) { ctx.beginPath(); for (let r = 0.08; r <= 1; r += 0.08) { const an = a * 2.094 + r * 5 - now * 4; ctx.lineTo(x + Math.cos(an) * r * rx, cy + Math.sin(an) * r * ry); } ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = H(0) + '95%,62%)'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.4 * s; ctx.beginPath(); ctx.ellipse(x, cy, rx * 0.93, ry * 0.96, 0, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 7; k++) { const an = now * 1.7 + k * 0.9, rr = 1.15 + Math.sin(now * 3 + k) * 0.12; ctx.fillStyle = k % 2 ? '#fff' : H(60) + '100%,80%)'; ctx.beginPath(); ctx.arc(x + Math.cos(an) * rx * rr, cy + Math.sin(an) * ry * rr, (0.3 + (k % 3) * 0.12) * s, 0, Math.PI * 2); ctx.fill(); }
}
function pfSwirl(Wd, k, alpha, now, hue, from) {                                 // from: [x, y] במסך – משם המערבולת נפתחת (הפורטל)                                       // מערבולת שממלאת את המסך (k = כמה מהמסך, 0..1)
  if (k <= 0.01 || alpha <= 0.01) return;
  const cx = from ? kxL(from[0], Wd / 2, k) : Wd / 2, cy = from ? kxL(from[1], 50, k) : 50, R = (Math.hypot(Wd / 2, 50) + 6) * k, H = h => 'hsl(' + ((hue + h) % 360) + ',';
  ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R)); gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, H(40) + '100%,80%)'); gr.addColorStop(0.6, H(0) + '85%,55%)'); gr.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd, 100);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let a = 0; a < 5; a++) { ctx.beginPath(); for (let r = 2; r <= R; r += 3) { const an = a * 1.2566 + r * 0.06 - now * 6; ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } ctx.stroke(); }
  ctx.fillStyle = '#fff'; for (let i = 0; i < 24; i++) { const r = ((hash(i) + now * 0.9) % 1) * R, an = hash(i + 50) * 6.283 + now; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * r, cy + Math.sin(an) * r, 0.4 + hash(i + 9), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.globalAlpha = alpha; ctx.strokeStyle = H(0) + '95%,72%)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function pfNinjaBack(x, feetY, now, o) {                                         // הנינג'ה מהגב. o: run, tilt, sy (מעיכה), lift (גובה קפיצה)
  o = o || {}; const run = now * 11, bob = o.run ? Math.abs(Math.sin(run)) * 1.6 : 0, col = playerColor(), suit = '#1f2937';
  ctx.save(); ctx.translate(x, feetY - (o.lift || 0)); ctx.rotate(o.tilt || 0); ctx.scale(1, o.sy || 1); ctx.translate(0, -bob);
  for (const sd of [-1, 1]) { const up = o.run ? Math.max(0, Math.sin(run + (sd > 0 ? 0 : Math.PI))) * 5 : (o.lift ? 3 : 0); ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(sd * 3.4 - 2, -12, 4, 12 - up + bob, 2); ctx.fill(); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.ellipse(sd * 3.4, -up + bob, 2.6, 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const sd of [-1, 1]) { const sw = o.run ? Math.sin(run + (sd > 0 ? Math.PI : 0)) * 3 : (o.arms || 0); ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(sd * (8.5 + (o.arms ? 2 : 0)), -19 + sw, 2.2, 5, sd * (0.25 + (o.arms ? 0.9 : 0)), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(sd * (9.3 + (o.arms ? 5 : 0)), -14.5 + sw - (o.arms ? 3 : 0), 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = suit; ctx.beginPath(); ctx.ellipse(0, -19, 7.5, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-7, -15, 14, 2.2);
  ctx.fillStyle = '#273449'; ctx.beginPath(); ctx.arc(0, -32, 6.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-6.6, -35, 13.2, 3, 1); ctx.fill();
  const fl = Math.sin(now * 9) * 2; ctx.beginPath(); ctx.moveTo(-1, -34); ctx.quadraticCurveTo(-7, -31 + fl, -11, -25 + fl); ctx.lineTo(-8.5, -24 + fl); ctx.quadraticCurveTo(-5, -30, 1, -32.5); ctx.fill();
  ctx.restore();
}
function pfCoin(p, s, now, up) { const sx = Math.max(0.25, Math.abs(Math.cos(now * 5))); ctx.save(); ctx.translate(p[0], p[1] - (up === undefined ? 9 : up) * s); ctx.scale(sx, 1); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 3.7 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function pfPov(d, S, Wd, now) {
  const cx = Wd / 2, vp = d.vp(cx);
  d.bg(S, Wd, now, cx);
  const things = S.ws.filter(w => w.z > -0.12 && w.z < 1.25).sort((a, b) => b.z - a.z);   // מהרחוק לקרוב
  for (const w of things) {
    const s = pfS(w.z), P = l => { const p = d.lanePos(l, cx); return [vp[0] + (p[0] - vp[0]) * s, vp[1] + (p[1] - vp[1]) * s]; };
    if (w.gate) { const p = P(1); pfPortal(p[0], p[1] + (d.gateBase || 0) * 2.6 * s, 2.6 * s, now, d.hue + 140); }
    else if (w.all) d.wall(w.all, P, s, now);
    else { for (const l of w.b) d.block(P(l), s, now, l); if (w.c !== undefined && !w.got) d.coin(P(w.c), s, now); }
  }
  const a = d.lanePos(0, cx), b = d.lanePos(2, cx), k = S.lx / 2, sh = S.ouch > 0 ? Math.sin(now * 50) * 1.2 : 0;
  d.hero(S, [a[0] + (b[0] - a[0]) * k + sh, a[1] + (b[1] - a[1]) * k], now);
  if (S.ouch > 0) { ctx.fillStyle = 'rgba(239,68,68,' + S.ouch * 0.25 + ')'; ctx.fillRect(0, 0, Wd, 100); kxBig('OUCH!', cx, 30, 9, '#fecaca'); }
  for (let i = 0; i < S.coins; i++) { ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(8 + i * 6, 8, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(8 + i * 6, 8, 2.1, 0, Math.PI * 2); ctx.fill(); }
}
function pfScene(d) {
  const neg = d.neg, pos = d.pos, acts = d.acts || {};
  const tArr = w => Math.max(0, w.z) / 1.2 * PF.travel;                           // כמה שניות עד שהגל מגיע
  const next = S => S.ws.find(w => w.z > 0.04) || null;
  function want(S, coinsToo) {
    if (S.p !== 'run') return null;
    const w = next(S); if (!w || w.gate || w.z > 0.85) return null;
    if (w.all) { const t = tArr(w); return !S.act && t < 0.62 && t > 0.22 ? w.all : null; }
    let target = S.lane;
    if (w.b.includes(S.lane)) target = [0, 1, 2].filter(l => !w.b.includes(l)).sort((a, b) => Math.abs(a - S.lane) - Math.abs(b - S.lane) || (a === w.c ? -1 : 1))[0];
    else if (coinsToo && !w.got && w.c !== undefined && !w.b.includes(w.c) && Math.abs(w.c - S.lane) === 1 && w.z > 0.3) target = w.c;
    return target < S.lane ? neg : target > S.lane ? pos : null;
  }
  function hop(S, x, k, scale) {                                                  // הנינג'ה קופץ אל הפורטל / ממנו, ומתכווץ
    const fx = S.o.x + x, fy = GROUND - Math.sin(k * Math.PI) * 5 - (1 - scale) * 7;
    drawFigure({ fx, fy, facing: 1, scale, kind: 'ninja', accent: playerColor(), pose: poseAir(true, k), suit: playerSuit() });
  }
  kxScene({
    type: d.type, listen: [neg, pos].concat(Object.keys(acts)), w: 76, e0: 12, banner: d.banner, time: 44, coins: 5, hint: 1.3, autoGap: 0.45, chips: d.chips, screenChip: [0, 12],
    start: () => ({ p: 'in', lane: 1, lx: 1, dist: 0, ouch: 0, coins: 0, wi: 0, next: 0.8, ws: [], act: null, actT: 9 }),
    update(S, dt) {
      if (S.ouch > 0) S.ouch -= dt;
      S.lx += (S.lane - S.lx) * Math.min(1, dt * 9); S.actT += dt; if (S.act && S.actT > acts[S.act]) S.act = null;
      if (S.p === 'in') { S.nx = kxL(12, PF.portal, kxE(S.t / 0.45)); if (S.t > 0.4 && !S.whoosh) { S.whoosh = 1; sfx('swish'); } if (S.t > 1.3) kxP(S, 'run'); }
      else if (S.p === 'run') {
        const sp = S.ouch > 0.5 ? 0.4 : 1; S.dist += dt * 2.6 * sp; S.next -= dt;
        if (S.next <= 0 && S.wi <= d.waves.length) { const i = S.wi++; S.next = PF.gap; S.ws.push(i < d.waves.length ? Object.assign({ z: 1.2, b: [] }, d.waves[i]) : { z: 1.2, gate: 1, b: [] }); }
        for (const w of S.ws) {
          const z0 = w.z; w.z -= dt * sp * 1.2 / PF.travel;
          if (z0 > 0.03 && w.z <= 0.03) {                                         // הגל הגיע אלינו
            const l = Math.round(S.lx);
            if (w.gate) { kxP(S, 'out'); sfx('swish'); }
            else if (w.all) { if (S.act === w.all && S.actT > 0.06) { S.coins++; sfx('coin'); } else { S.ouch = 1; sfx('thud'); } }
            else if (w.b.includes(l)) { S.ouch = 1; sfx('thud'); }
            else if (w.c === l) { w.got = 1; S.coins++; sfx('coin'); }
          }
        }
      }
      else if (S.p === 'out') { if (S.t > 0.9) { S.nx = PF.exit; kxP(S, 'pop'); sfx('pop'); } }
      else if (S.p === 'pop') { if (S.t > 0.45) { S.nx = PF.exit + 5; kxP(S, 'exit'); } }
      else if (S.p === 'exit' && kxExit(S, dt, PF.exit + 12)) return 'done';
    },
    expected: S => { const w = want(S, true); return w ? [w] : []; },
    hintWord(S) { if (S.p !== 'run') return null; const w = next(S); if (!w || w.gate) return null; if (w.all) return tArr(w) < 0.9 && !S.act ? w.all : null; return w.z < 0.7 && w.b.includes(S.lane) ? want(S, false) : null; },
    cmd(S, w) {
      if (S.p !== 'run') return;
      if (w === neg || w === pos) { S.lane = Math.max(0, Math.min(2, S.lane + (w === neg ? -1 : 1))); kxOk(S, w); sfx('swish'); }
      else if (acts[w] && !S.act) { S.act = w; S.actT = 0; kxOk(S, w); sfx('jump'); }
    },
    draw(o, S) {
      const now = performance.now() / 1000;
      pfPortal(o.x + PF.portal, GROUND, 1, now, d.hue);
      if (S && (S.p === 'pop' || S.p === 'exit' || (S.p === 'out' && S.t > 0.4))) pfPortal(o.x + PF.exit, GROUND, 1, now, d.hue + 140, S.p === 'exit' ? 1 - kxE((S.t - 0.6) / 0.5) : 1);   // פורטל היציאה נסגר אחרינו
    },
    front(o, S) {
      if (S.p === 'pop' || S.p === 'exit' || (S.p === 'in' && S.t < 0.4)) return;
      const m = ctx.getTransform(), u = ctx.canvas.height / 100, scr = x => [(m.a * (o.x + x) + m.e) / u, (m.d * (GROUND - 11.5) + m.f) / u];   // מקום הפורטלים על המסך
      const pIn = scr(PF.portal), pOut = scr(PF.exit);
      kxScreen(Wd => {
        const now = performance.now() / 1000, t = S.t;
        if (S.p === 'in') { if (t < 0.9) pfSwirl(Wd, kxE((t - 0.4) / 0.5), 1, now, d.hue, pIn); else { pfPov(d, S, Wd, now); pfSwirl(Wd, 1, 1 - kxE((t - 0.9) / 0.4), now, d.hue); } }
        else if (S.p === 'run') pfPov(d, S, Wd, now);
        else if (S.p === 'out') { if (t < 0.4) { pfPov(d, S, Wd, now); pfSwirl(Wd, 1, kxE(t / 0.4), now, d.hue + 140); } else pfSwirl(Wd, 1 - kxE((t - 0.4) / 0.5), 1, now, d.hue + 140, pOut); }
      });
    },
    ninja(S, now) {
      if (S.p === 'in') { if (S.t < 0.45) { const k = S.t / 0.45; hop(S, S.nx, k, 1 - kxE((k - 0.55) / 0.45) * 0.75); } }
      else if (S.p === 'pop') { const k = S.t / 0.45; hop(S, PF.exit + k * 5, k, 0.3 + 0.7 * kxE(k * 1.6)); }
      else if (S.p === 'exit') kxNinja(S, poseRun(S.nx * 0.55));
    }
  });
}
