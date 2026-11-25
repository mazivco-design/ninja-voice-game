/* ninja-voice-game – sk-ice.js   (סקיצה, סבב 3 – 25 בנובמבר 2026)
   מערת הקרח – חידה, בהשראת חדרי הקרח המחליקים (פוקימון, Sokoban). הנינג'ה נכנס למערה והמבט מתחלף למבט מלמעלה.
   על קרח אי אפשר לעצור: UP / DOWN / LEFT / RIGHT – והנינג'ה מחליק עד שהוא נתקע בסלע או בקיר.
   אוספים שלוש אבני חן, ואז הדלת נפתחת ומחליקים אליה. אין צ'יפ עם התשובה (זו חידה); אחרי שתיקה המשחק לוחש את הצעד הבא.
   נבנה על sketchkit.js. */

const IC = { W: 8, H: 5, c: 11.5, start: [0, 4], exit: [5, 2], gems: [[5, 1], [6, 4], [6, 0]],
             rocks: [[2, 2], [7, 3], [4, 4], [7, 0], [7, 1], [1, 4], [0, 1], [0, 0]],
             dir: { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, cave: 20 };
const icRock = (x, y) => x < 0 || y < 0 || x >= IC.W || y >= IC.H || IC.rocks.some(r => r[0] === x && r[1] === y);
function icSlide(x, y, m, d) {                                                   // מחליק עד מכשול; מחזיר מסלול, אבנים שנאספו והאם הגיע לדלת פתוחה
  const path = []; let win = false;
  while (!icRock(x + d[0], y + d[1])) {
    x += d[0]; y += d[1]; path.push([x, y]);
    IC.gems.forEach((g, i) => { if (g[0] === x && g[1] === y) m |= 1 << i; });
    if (m === 7 && x === IC.exit[0] && y === IC.exit[1]) { win = true; break; }
  }
  return { x, y, m, path, win };
}
function icSolve(x0, y0, m0) {                                                   // הצעד הבא בדרך הקצרה ביותר (BFS)
  const q = [[x0, y0, m0, null]], seen = new Set([x0 + ',' + y0 + ',' + m0]);
  while (q.length) {
    const [x, y, m, first] = q.shift();
    for (const k in IC.dir) {
      const s = icSlide(x, y, m, IC.dir[k]); if (!s.path.length) continue;
      if (s.win) return first || k;
      const key = s.x + ',' + s.y + ',' + s.m; if (seen.has(key)) continue;
      seen.add(key); q.push([s.x, s.y, s.m, first || k]);
    }
  }
  return null;
}
function icNinjaTop(x, y, r, dir, col) {                                         // נינג'ה מלמעלה: גוף, ראש, סרט
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 0.6, y + 1, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - dir[0] * r * 0.5, y - dir[1] * r * 0.5); ctx.lineTo(x - dir[0] * r * 1.5, y - dir[1] * r * 1.5 + Math.sin(performance.now() / 90) * 0.5); ctx.stroke();
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(x + dir[0] * r * 0.3, y + dir[1] * r * 0.3, r * 0.3, r * 0.14, Math.atan2(dir[1], dir[0]) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
}
kxScene({
  type: 'iceslide', listen: ['up', 'down', 'left', 'right'], w: 60, e0: 14, banner: 'UP · DOWN · LEFT · RIGHT – slide on the ice!', time: 26, coins: 5, chip: false, hint: 6, autoGap: 0.75,
  start: () => ({ p: 'in', x: IC.start[0], y: IC.start[1], m: 0, fx: IC.start[0], fy: IC.start[1], d: [1, 0], said: null, saidT: 9, bump: 9, trail: [], spark: [] }),
  update(S, dt) {
    S.saidT += dt; S.bump += dt;
    for (const s of S.spark) s.t += dt; S.spark = S.spark.filter(s => s.t < 0.6);
    if (S.p === 'in' && S.t > 0.9) { kxP(S, 'play'); S.nx = IC.cave + 12; kxFollow(S); }   // מאחורי המסך: הנינג'ה כבר בצד השני של המערה
    else if (S.p === 'slide') {
      const k = Math.min(1, S.t / S.dur), e = 1 - (1 - k) * (1 - k);
      S.fx = kxL(S.from[0], S.x, e); S.fy = kxL(S.from[1], S.y, e);
      IC.gems.forEach((g, i) => { if (S.m & (1 << i) && !(S.got & (1 << i)) && Math.abs(S.fx - g[0]) + Math.abs(S.fy - g[1]) < 0.5) { S.got |= 1 << i; sfx('coin'); S.spark.push({ x: g[0], y: g[1], t: 0 }); } });
      if (k >= 1) { if (S.win) { kxP(S, 'win'); sfx('win'); } else { kxP(S, 'play'); sfx('land'); if (icSolve(S.x, S.y, S.m) === null) kxP(S, 'stuck'); } }
    } else if (S.p === 'stuck' && S.t > 1.2) { S.x = S.fx = IC.start[0]; S.y = S.fy = IC.start[1]; S.m = S.got = 0; kxP(S, 'play'); }
    else if (S.p === 'win' && S.t > 1.5) kxP(S, 'out');
    else if (S.p === 'out' && S.t > 0.7) kxP(S, 'exit');
    else if (S.p === 'exit' && kxExit(S, dt, 60)) return 'done';
  },
  expected: S => { if (S.p !== 'play' || S.t < 0.25) return []; const k = icSolve(S.x, S.y, S.m); return k ? [k] : []; },
  cmd(S, w) {
    if (S.p !== 'play') return;
    const d = IC.dir[w], s = icSlide(S.x, S.y, S.m, d); S.said = w; S.saidT = 0; S.d = d;
    if (!s.path.length) { S.bump = 0; sfx('thud'); return; }
    S.from = [S.x, S.y]; S.got = S.m; S.x = s.x; S.y = s.y; S.m = s.m; S.win = s.win; S.dur = 0.16 + s.path.length * 0.09; sfx('swish'); kxP(S, 'slide');
  },
  draw(o, S) {                                                                   // מבחוץ: גבעת קרח עם פתח מערה
    const g = GROUND, cx = o.x + IC.cave;
    ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.moveTo(cx - 16, g); ctx.lineTo(cx - 9, g - 15); ctx.lineTo(cx - 2, g - 23); ctx.lineTo(cx + 8, g - 19); ctx.lineTo(cx + 15, g - 9); ctx.lineTo(cx + 19, g); ctx.fill();
    ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.moveTo(cx - 9, g - 15); ctx.lineTo(cx - 2, g - 23); ctx.lineTo(cx + 3, g - 21); ctx.lineTo(cx - 3, g - 13); ctx.fill();
    ctx.fillStyle = '#0c4a6e'; ctx.beginPath(); ctx.moveTo(cx - 6, g); ctx.quadraticCurveTo(cx - 6, g - 13, cx, g - 13); ctx.quadraticCurveTo(cx + 6, g - 13, cx + 6, g); ctx.fill();
    ctx.fillStyle = '#e0f2fe'; for (const k of [-4, -1, 3]) { ctx.beginPath(); ctx.moveTo(cx + k - 0.9, g - 12.4 + Math.abs(k) * 0.5); ctx.lineTo(cx + k + 0.9, g - 12.4 + Math.abs(k) * 0.5); ctx.lineTo(cx + k, g - 8.5 + Math.abs(k) * 0.4); ctx.fill(); }
    star4(cx + 9, g - 21, 1.6 + Math.sin(performance.now() / 300) * 0.4, 0, '#fff');
  },
  front(o, S) {
    const a = S.p === 'in' ? kxE(S.t / 0.7) : S.p === 'out' ? 1 - kxE(S.t / 0.6) : S.p === 'exit' || S.p === 'start' ? 0 : 1; if (a <= 0) return;
    kxScreen(Wd => {
      const c = IC.c, x0 = Wd / 2 - IC.W * c / 2, y0 = 24, now = performance.now() / 1000, open = S.m === 7;
      ctx.globalAlpha = a;
      const bg = ctx.createRadialGradient(Wd / 2, 54, 10, Wd / 2, 54, Wd * 0.7); bg.addColorStop(0, '#164e63'); bg.addColorStop(1, '#082f49'); ctx.fillStyle = bg; ctx.fillRect(0, 0, Wd, 100);
      ctx.fillStyle = '#0c4a6e'; ctx.beginPath(); ctx.roundRect(x0 - 3, y0 - 3, IC.W * c + 6, IC.H * c + 6, 4); ctx.fill();
      const ice = ctx.createLinearGradient(x0, y0, x0 + IC.W * c, y0 + IC.H * c); ice.addColorStop(0, '#e0f2fe'); ice.addColorStop(1, '#a5d8f3'); ctx.fillStyle = ice; ctx.beginPath(); ctx.roundRect(x0, y0, IC.W * c, IC.H * c, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.5; for (let i = 0; i < 9; i++) { const sx = x0 + 6 + hash(i * 7.1) * (IC.W * c - 16), sy = y0 + 5 + hash(i * 3.3) * (IC.H * c - 10); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 5, sy - 3); ctx.stroke(); }
      const ex = x0 + (IC.exit[0] + 0.5) * c, ey = y0 + (IC.exit[1] + 0.5) * c;                       // הדלת: בור מדרגות, זוהר כשהיא פתוחה
      if (open) { ctx.fillStyle = 'rgba(250,204,21,' + (0.3 + Math.sin(now * 6) * 0.15) + ')'; ctx.beginPath(); ctx.arc(ex, ey, c * 0.62, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = open ? '#facc15' : '#64748b'; ctx.beginPath(); ctx.roundRect(ex - c * 0.36, ey - c * 0.36, c * 0.72, c * 0.72, 1.4); ctx.fill();
      ctx.fillStyle = open ? '#422006' : '#334155'; ctx.beginPath(); ctx.roundRect(ex - c * 0.26, ey - c * 0.26, c * 0.52, c * 0.52, 1); ctx.fill();
      ctx.font = '900 ' + c * 0.4 + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(open ? '⭐' : '🔒', ex, ey + 0.3);
      for (const r of IC.rocks) {                                                 // סלעים
        const rx = x0 + (r[0] + 0.5) * c, ry = y0 + (r[1] + 0.5) * c, h = hash(r[0] * 5 + r[1]);
        ctx.fillStyle = 'rgba(8,47,73,.25)'; ctx.beginPath(); ctx.ellipse(rx + 0.8, ry + 1.2, c * 0.44, c * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(rx - c * 0.42, ry + c * 0.1); ctx.lineTo(rx - c * 0.2, ry - c * (0.36 + h * 0.08)); ctx.lineTo(rx + c * 0.25, ry - c * 0.4); ctx.lineTo(rx + c * 0.43, ry); ctx.lineTo(rx + c * 0.2, ry + c * 0.4); ctx.lineTo(rx - c * 0.25, ry + c * 0.38); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(rx - c * 0.2, ry - c * 0.36); ctx.lineTo(rx + c * 0.25, ry - c * 0.4); ctx.lineTo(rx + c * 0.05, ry - c * 0.05); ctx.lineTo(rx - c * 0.25, ry); ctx.fill();
      }
      const got = S.p === 'slide' ? S.got : S.m;
      IC.gems.forEach((gm, i) => { if (got & (1 << i)) return; const gx = x0 + (gm[0] + 0.5) * c, gy = y0 + (gm[1] + 0.5) * c + Math.sin(now * 3 + i) * 0.5;   // אבני חן
        ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.moveTo(gx, gy - 3.2); ctx.lineTo(gx + 2.6, gy - 0.6); ctx.lineTo(gx, gy + 3.2); ctx.lineTo(gx - 2.6, gy - 0.6); ctx.fill();
        ctx.fillStyle = '#a5f3fc'; ctx.beginPath(); ctx.moveTo(gx, gy - 3.2); ctx.lineTo(gx + 2.6, gy - 0.6); ctx.lineTo(gx - 2.6, gy - 0.6); ctx.fill(); });
      for (const s of S.spark) star4(x0 + (s.x + 0.5) * c, y0 + (s.y + 0.5) * c - s.t * 8, 3.5 * (1 - s.t / 0.6), s.t * 5, '#fde047');
      let nx = x0 + (S.fx + 0.5) * c, ny = y0 + (S.fy + 0.5) * c;
      if (S.bump < 0.2) { const k = Math.sin(S.bump / 0.2 * Math.PI) * 1.6; nx += S.d[0] * k; ny += S.d[1] * k; }
      if (S.p === 'slide') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round'; for (const k of [-1.6, 0, 1.6]) { ctx.beginPath(); ctx.moveTo(nx - S.d[0] * 5 + S.d[1] * k, ny - S.d[1] * 5 + S.d[0] * k); ctx.lineTo(nx - S.d[0] * 10 + S.d[1] * k, ny - S.d[1] * 10 + S.d[0] * k); ctx.stroke(); } }
      if (S.p !== 'win' || S.t < 0.5) icNinjaTop(nx, ny, c * (S.p === 'win' ? 0.36 * (1 - S.t / 0.5) : 0.36), S.d, playerColor());
      const lab = [['up', Wd / 2, y0 - 8, '▲ UP'], ['down', Wd / 2, y0 + IC.H * c + 8, '▼ DOWN'], ['left', x0 - 11, y0 + IC.H * c / 2, '◀', 'LEFT'], ['right', x0 + IC.W * c + 11, y0 + IC.H * c / 2, '▶', 'RIGHT']];
      for (const [w, lx, ly, txt, sub] of lab) { const hot = S.said === w && S.saidT < 0.5, sz = hot ? 6 : 4.6, col = hot ? '#facc15' : '#e0f2fe'; if (sub) { kxBig(txt, lx, ly - 3.5, sz, col); kxBig(sub, lx, ly + 3, sz * 0.85, col); } else kxBig(txt, lx, ly, sz, col); }
      for (let i = 0; i < 3; i++) { const gx = Wd / 2 - 8 + i * 8, gy = 6; ctx.fillStyle = got & (1 << i) ? '#22d3ee' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(gx, gy - 2.6); ctx.lineTo(gx + 2.1, gy - 0.5); ctx.lineTo(gx, gy + 2.6); ctx.lineTo(gx - 2.1, gy - 0.5); ctx.fill(); }
      if (S.p === 'stuck') kxBig('Oops! Again!', Wd / 2, 54, 9, '#fca5a5');
      if (S.p === 'win') kxBig('YOU DID IT! ⭐', Wd / 2, 54, 9, '#fde047');
      ctx.globalAlpha = 1;
    });
  },
  ninja(S, now) { if (S.p === 'start' || S.p === 'in' && S.t < 0.3) kxNinja(S, poseIdle(now)); else if (S.p === 'exit') kxNinja(S, poseRun(S.nx * 0.55)); else if (S.p === 'out') kxNinja(S, poseIdle(now)); }
});
