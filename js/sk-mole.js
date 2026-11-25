/* ninja-voice-game – sk-mole.js   (סקיצה, סבב 3 – 25 בנובמבר 2026)
   חפרפרות – תגובה מהירה, בהשראת Whac-A-Mole. שלוש מחילות, וחפרפרות קופצות מהן עם קסדה צבעונית – אדומה, כחולה או ירוקה.
   אומרים את צבע הקסדה – RED / BLUE / GREEN – והנינג'ה זורק כוכב ומפיל אותה לפני שהיא חוזרת למחילה. הצבע לא קשור למחילה, אז צריך להסתכל.
   בהמשך קופצות שתיים יחד, והן נשארות פחות זמן בחוץ. שש חפרפרות – סיום.  נבנה על sketchkit.js. */

const ML = { holes: [34, 47, 60], need: 6, cols: { red: '#ef4444', blue: '#3b82f6', green: '#22c55e' },
             script: [[[1, 'red']], [[0, 'blue']], [[2, 'green']], [[0, 'red'], [2, 'blue']], [[1, 'green']], [[2, 'red'], [0, 'green']], [[1, 'blue']], [[0, 'blue'], [1, 'red']]] };
const mlUp = m => (m.hit ? Math.max(0, 1 - (m.t - m.hitT) / 0.35) : kxE(Math.min(m.t / 0.25, (m.life - m.t) / 0.25)));
function mlMole(x, m) {
  const g = GROUND, k = mlUp(m), y = g - k * 7.5, dizzy = m.hit;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 6, g - 14, 12, 14); ctx.clip();
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect(x - 3.6, y, 7.2, 12, 3.4); ctx.fill();                               // גוף
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(x - 0.6, y + 5.2, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();               // חוטם
  ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(x - 1.4, y + 4.7, 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1.5, y + 6.2, 0.8, 1); ctx.fillRect(x - 0.5, y + 6.2, 0.8, 1);
  if (dizzy) { ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 0.35; for (const ex of [-2.2, 0.6]) { ctx.beginPath(); ctx.moveTo(x + ex - 0.6, y + 2.6); ctx.lineTo(x + ex + 0.6, y + 3.8); ctx.moveTo(x + ex + 0.6, y + 2.6); ctx.lineTo(x + ex - 0.6, y + 3.8); ctx.stroke(); } }
  else { ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(x - 2.2, y + 3.2, 0.55, 0, Math.PI * 2); ctx.arc(x + 0.6, y + 3.2, 0.55, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = ML.cols[m.col]; ctx.beginPath(); ctx.arc(x, y + 2, 4.1, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - 4.7, y + 1.5, 9.4, 1.1, 0.5); ctx.fill();   // קסדה
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - 1.6, y - 0.4, 1.3, 0.6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (dizzy) for (let i = 0; i < 3; i++) star4(x + Math.cos(m.t * 9 + i * 2.1) * 4.5, y - 3 + Math.sin(m.t * 9 + i * 2.1) * 1.2, 0.9, 0, '#fde047');
}
kxScene({
  type: 'molewhack', listen: ['red', 'blue', 'green'], w: 82, e0: 13, banner: 'Say the color – RED · BLUE · GREEN!', time: 30, coins: 5, hint: 2.2, autoGap: 0.55,
  start: () => ({ p: 'play', moles: [], n: 0, next: 1.0, hits: 0, stars: [], thr: 9, oops: 9 }),
  update(S, dt) {
    S.thr += dt; S.oops += dt;
    for (const m of S.moles) m.t += dt;
    for (const s of S.stars) { s.t += dt; if (s.t >= s.T && !s.done) { s.done = 1; const m = s.m; m.hit = 1; m.hitT = m.t; sfx('hit'); S.hits++; floatText(S.o.x + ML.holes[m.h], GROUND - 15, S.hits < ML.need ? 'BONK! ' + S.hits : 'BONK! ⭐', '#16a34a'); if (S.hits >= ML.need && S.p === 'play') { kxP(S, 'win'); sfx('win'); } } }
    S.stars = S.stars.filter(s => !s.done);
    S.moles = S.moles.filter(m => (m.hit ? m.t - m.hitT < 0.4 : m.t < m.life));
    if (S.p === 'play') {
      S.next -= dt;
      if (S.next <= 0 && !S.moles.length) { const life = Math.max(2.0, 3.0 - S.n * 0.12); for (const [h, col] of ML.script[S.n % ML.script.length]) S.moles.push({ h, col, t: 0, life }); S.n++; S.next = 0.7; sfx('pop'); }
    } else if (S.p === 'win' && S.t > 1.6) kxP(S, 'exit');
    else if (S.p === 'exit' && kxExit(S, dt, 66)) return 'done';
  },
  expected: S => { if (S.p !== 'play' || S.thr < 0.4) return []; const m = S.moles.find(m => !m.hit && !m.aim && m.t > 0.95 && m.life - m.t > 0.5); return m ? [m.col] : []; },
  cmd(S, w) {
    if (S.p !== 'play' || S.thr < 0.25) return;
    const m = S.moles.find(m => !m.hit && !m.aim && m.col === w && m.life - m.t > 0.2);
    if (!m) { if (S.moles.some(m => !m.hit && !m.aim)) { S.oops = 0; sfx('thud'); floatText(S.o.x + S.nx, GROUND - 22, 'Oops!', '#dc2626'); } return; }
    m.aim = 1; m.life = Math.max(m.life, m.t + 0.6); S.thr = 0; kxOk(S, w); sfx('swish'); S.stars.push({ m, t: 0, T: 0.14 + (ML.holes[m.h] - S.nx) * 0.006 });
  },
  draw(o, S) {
    const g = GROUND;
    for (let i = 0; i < 3; i++) { const x = o.x + ML.holes[i]; ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.ellipse(x, g - 0.2, 7, 2.2, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(x, g - 0.3, 4.6, 1.1, 0, 0, Math.PI * 2); ctx.fill(); }   // תלוליות ומחילות
    if (!S) { const now = performance.now() / 1000, i = Math.floor(now / 1.6) % 3; mlMole(o.x + ML.holes[i], { t: now % 1.6, life: 1.6, col: ['red', 'blue', 'green'][i] }); }                       // מרחוק: רואים חפרפרת מציצה
    else for (const m of S.moles) mlMole(o.x + ML.holes[m.h], m);
    for (let i = 0; i < 3; i++) { const x = o.x + ML.holes[i]; ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.ellipse(x, g + 0.5, 6.4, 1.3, 0, 0, Math.PI); ctx.fill(); }                             // שפת התלולית מלפנים
  },
  front(o, S) {
    const g = GROUND;
    for (const s of S.stars) { const k = s.t / s.T, x0 = o.x + S.nx + 3, x1 = o.x + ML.holes[s.m.h], x = kxL(x0, x1, k), y = g - 11 + k * 5 - Math.sin(k * Math.PI) * 2; star4(x, y, 1.8, s.t * 40, '#e2e8f0'); ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x, y, 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = '900 4px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b'; ctx.fillText('🔨 ' + S.hits + ' / ' + ML.need, o.x + ML.holes[1], g - 26);
  },
  ninja(S, now) {
    let P = poseIdle(now);
    if (S.p === 'exit') P = poseRun(S.nx * 0.55);
    else if (S.p === 'win') P.arms = [[2.5, 2.9], [2.6, 3.0]];
    else if (S.thr < 0.25) { const k = S.thr / 0.25; P.arms = [P.arms[0], [kxL(2.6, 1.2, k), kxL(2.9, 1.3, k)]]; P.lean = 0.2; }
    else if (S.oops < 0.7) { P.eyes = 'squint'; P.arms = [P.arms[0], [0.9, 2.9]]; }
    kxNinja(S, P);
  }
});
