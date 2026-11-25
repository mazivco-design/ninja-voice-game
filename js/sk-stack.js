/* ninja-voice-game – sk-stack.js   (סקיצה, סבב 3 – 25 בנובמבר 2026)
   מגדל הארגזים – תזמון, בהשראת Stacker / Tower Bloxx. מנוף במבוק מניף ארגז מצד לצד מעל המגדל.
   STOP – הנינג'ה מושך בידית והארגז נופל. קרוב למרכז – הוא נוחת על המגדל (מדויק ממש = PERFECT). רחוק מדי – הוא מחליק ונופל, ומנסים שוב.
   כל ארגז מתנדנד קצת יותר מהר. חמישה ארגזים – דגל על הראש וסיום.  נבנה על sketchkit.js. */

const ST = { tx: 40, sw: 15, hook: 39, box: 5, bw: 9, need: 5, ok: 4.2, perfect: 1.2, sp: [1.5, 1.8, 2.1, 2.4, 2.7], cols: ['#d97706', '#b45309', '#ca8a04', '#c2410c', '#a16207'] };
function stBox(x, y, col, rot) {
  ctx.save(); ctx.translate(x, y - ST.box / 2); ctx.rotate(rot || 0);
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-ST.bw / 2, -ST.box / 2, ST.bw, ST.box, 0.6); ctx.fill();
  ctx.strokeStyle = 'rgba(69,26,3,.55)'; ctx.lineWidth = 0.45; ctx.strokeRect(-ST.bw / 2 + 0.6, -ST.box / 2 + 0.6, ST.bw - 1.2, ST.box - 1.2);
  ctx.beginPath(); ctx.moveTo(-ST.bw / 2 + 0.6, -ST.box / 2 + 0.6); ctx.lineTo(ST.bw / 2 - 0.6, ST.box / 2 - 0.6); ctx.stroke();
  ctx.restore();
}
const stTop = S => S.tower.length * ST.box;
kxScene({
  type: 'stacker', listen: ['stop'], w: 74, e0: 13, banner: 'Say STOP – drop the box on the tower!', time: 30, coins: 5, hint: 3.5, autoGap: 0.4,
  start: () => ({ p: 'swing', ph: -1.2, tower: [], lever: 9, fall: null, junk: [], lastOff: 0 }),
  update(S, dt) {
    S.lever += dt;
    for (const j of S.junk) { j.t += dt; j.vh -= 70 * dt; j.x += j.vx * dt; j.h += j.vh * dt; j.rot += j.vr * dt; if (j.h < 0 && !j.hit) { j.hit = 1; j.h = 0; j.vh = 12; j.vx *= 0.5; sfx('thud'); } }
    S.junk = S.junk.filter(j => j.t < 1.6);
    if (S.p === 'swing') S.ph += dt * ST.sp[Math.min(S.tower.length, ST.sp.length - 1)];
    else if (S.p === 'drop') {
      const f = S.fall; f.vh -= 95 * dt; f.h += f.vh * dt;
      const base = S.tower.length ? S.tower[S.tower.length - 1] : 0, off = f.x - base, top = stTop(S);
      if (Math.abs(off) <= ST.ok && f.h <= top) {                                 // נחת על המגדל
        S.tower.push(f.x); S.fall = null; sfx('land'); S.lastOff = off;
        const perfect = Math.abs(off) <= ST.perfect; if (perfect) sfx('coin');
        floatText(S.o.x + ST.tx + f.x, GROUND - top - 9, perfect ? 'PERFECT! ⭐' : 'GOOD!', perfect ? '#ca8a04' : '#16a34a');
        if (S.tower.length >= ST.need) { kxP(S, 'win'); sfx('win'); } else { kxP(S, 'next'); }
      } else if (Math.abs(off) > ST.ok && f.h <= (Math.abs(off) < ST.bw ? top : 0)) {   // פספוס: נתקל בקצה ומתגלגל, או נופל לקרקע
        S.junk.push({ x: f.x, h: Math.max(0, f.h), vx: Math.sign(off) * 9, vh: 14, rot: 0, vr: Math.sign(off) * 5, t: 0, col: f.col }); S.fall = null; sfx('thud');
        floatText(S.o.x + ST.tx + f.x, GROUND - top - 9, 'Oops!', '#dc2626'); kxP(S, 'next');
      }
    } else if (S.p === 'next' && S.t > 0.7) { S.ph = -1.3; kxP(S, 'swing'); }
    else if (S.p === 'win' && S.t > 2) kxP(S, 'exit');
    else if (S.p === 'exit' && kxExit(S, dt, 56)) return 'done';
  },
  expected: S => { if (S.p !== 'swing' || S.t < 0.5) return []; const base = S.tower.length ? S.tower[S.tower.length - 1] : 0; return Math.abs(Math.sin(S.ph) * ST.sw - base) < 1.0 ? ['stop'] : []; },
  hintWord: S => (S.p === 'swing' ? 'stop' : null),
  cmd(S) {
    if (S.p !== 'swing' || S.t < 0.3) return;
    kxOk(S, 'stop'); S.lever = 0; sfx('swish');
    S.fall = { x: Math.sin(S.ph) * ST.sw, h: ST.hook - 3 - ST.box, vh: 0, col: ST.cols[S.tower.length % ST.cols.length] }; kxP(S, 'drop');
  },
  draw(o, S) {
    const g = GROUND, cx = o.x + ST.tx, mast = o.x + ST.tx + 22, now = performance.now() / 1000;
    ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mast, g); ctx.lineTo(mast, g - ST.hook - 4); ctx.stroke();       // המנוף: תורן וזרוע
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mast + 5, g - ST.hook - 1); ctx.lineTo(cx - ST.sw - 4, g - ST.hook - 3); ctx.stroke();
    ctx.strokeStyle = '#365314'; ctx.lineWidth = 0.4; for (let h = 6; h < ST.hook; h += 7) { ctx.beginPath(); ctx.moveTo(mast - 0.9, g - h); ctx.lineTo(mast + 0.9, g - h); ctx.stroke(); }
    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(mast, g - ST.hook - 4); ctx.lineTo(mast + 7, g); ctx.stroke();
    ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 7, g - 1, 14, 1);                                                                                           // בסיס
    ctx.strokeStyle = 'rgba(30,41,59,.25)'; ctx.lineWidth = 0.35; ctx.setLineDash([1.2, 1.2]); const bx = S && S.tower.length ? S.tower[S.tower.length - 1] : 0; ctx.beginPath(); ctx.moveTo(cx + bx, g - (S ? stTop(S) : 0) - 0.5); ctx.lineTo(cx + bx, g - ST.hook + 4); ctx.stroke(); ctx.setLineDash([]);
    if (S) S.tower.forEach((x, i) => stBox(cx + x, g - i * ST.box, ST.cols[i % ST.cols.length]));
    const sx = S ? Math.sin(S.ph) * ST.sw : Math.sin(now * 1.5) * ST.sw, hang = !S || S.p === 'swing', hx = cx + sx, hy = g - ST.hook;
    const tilt = S && S.p === 'swing' ? Math.cos(S.ph) * 0.12 : 0;
    ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.roundRect(hx - 2, hy - 3.6, 4, 1.8, 0.5); ctx.fill();                                                    // עגלה על הזרוע
    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx - tilt * 8, hy + (hang ? 3 : 1.5)); ctx.stroke();
    if (hang) stBox(hx - tilt * 12, hy + 3 + ST.box, ST.cols[(S ? S.tower.length : 0) % ST.cols.length], -tilt);
    if (S && S.fall) stBox(cx + S.fall.x, g - S.fall.h, S.fall.col);
    if (S) for (const j of S.junk) { ctx.globalAlpha = Math.min(1, (1.6 - j.t) * 2); stBox(cx + j.x, g - j.h, j.col, j.rot); ctx.globalAlpha = 1; }
    if (S && S.p === 'win') { const k = kxE(S.t / 0.5), ty = g - stTop(S), fx = cx + S.tower[S.tower.length - 1];                                         // דגל על הראש
      ctx.strokeStyle = '#44403c'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(fx, ty); ctx.lineTo(fx, ty - 8 * k); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx, ty - 8 * k); ctx.lineTo(fx + 5 * k, ty - 6.5 * k + Math.sin(now * 8) * 0.4); ctx.lineTo(fx, ty - 5 * k); ctx.fill();
      for (let i = 0; i < 5; i++) star4(fx + Math.cos(i * 1.26 + now * 2) * 9, ty - 6 + Math.sin(i * 1.26 + now * 2) * 6, 1.4, now * 3, '#fde047'); }
    const lx = o.x + 19, la = S ? kxL(0.9, -0.5, S.lever / 0.25) : -0.5;                                                                                    // ידית המנוף ליד הנינג'ה
    ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.roundRect(lx - 2.5, g - 3, 5, 3, 0.6); ctx.fill();
    ctx.strokeStyle = '#44403c'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(lx, g - 2.5); ctx.lineTo(lx + Math.sin(la) * 6.5, g - 2.5 - Math.cos(la) * 6.5); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(lx + Math.sin(la) * 6.5, g - 2.5 - Math.cos(la) * 6.5, 1.1, 0, Math.PI * 2); ctx.fill();
  },
  front(o, S) { ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b'; ctx.fillText('📦 ' + S.tower.length + ' / ' + ST.need, o.x + ST.tx, GROUND - ST.hook - 8); },
  ninja(S, now) {
    let P = poseIdle(now);
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else { const k = S.lever < 0.3 ? Math.sin(S.lever / 0.3 * Math.PI) : 0; P.arms = [P.arms[0], [1.1 + k * 0.5, 1.3 + k * 0.6]]; P.lean = 0.1 + k * 0.15; P.headTilt = -0.12; }
    kxNinja(S, P);
  }
});
