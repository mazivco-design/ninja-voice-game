/* ninja-voice-game – village.js
   אב־טיפוס: כפר במבט צד עם עומק (שלושה נתיבים), בית שנכנסים אליו, סולם לגג, ודמויות שמדברות.
   בלי זיהוי קולי בינתיים – התשובות בכפתורים, כדי להרגיש את העולם. משתמש באותה דמות (ninja-figure.js). */

const $ = id => document.getElementById(id);
const canvas = $('c'), ctx = canvas.getContext('2d');
const W = 160, H = 100, WORLD_W = 540;
const LANES = [{ y: 66, s: 0.88 }, { y: 72, s: 1 }, { y: 79, s: 1.12 }];     // אחורי · אמצעי · קדמי: גובה הקרקע וקנה מידה
let cw = 0, ch = 0, scale = 1, ox = 0, oy = 0, camX = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1, r = $('app').getBoundingClientRect();
  cw = r.width; ch = r.height;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.min(cw / W, ch / H); ox = (cw - W * scale) / 2; oy = (ch - H * scale) * 0.7;
}
window.addEventListener('resize', resize); resize();
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} }

/* ---------- העולם ---------- */
const HOUSES = [
  { x: 48, w: 50, h: 30, color: '#f1dcc0', roof: '#b45309', sign: 'SHOP', awning: true },
  { x: 160, w: 46, h: 26, color: '#dbe4f0', roof: '#475569', door: true, chimney: true },
  { x: 290, w: 64, h: 44, color: '#fde8c8', roof: '#7c2d12', ladder: 352, chimney: true, balcony: true }
];
const ROOF3 = { x: 290, w: 64, y: 66 - 44 };                               // הגג של הבית השלישי – אפשר לעמוד עליו
const NPCS = [
  { id: 'merchant', x: 108, lane: 0, kind: 'guard', friendly: true, suit: { body: '#166534', back: '#14532d', front: '#15803d', edge: '#052e16' }, face: -1,
    ask: 'Hello! What do you want?', answers: [['I want an apple', 'Here is a red apple!', '🍎'], ['I want a key', 'A key? Not today.'], ['Bye!', 'Bye bye!']] },
  { id: 'kid', x: 230, lane: 1, kind: 'ninja', accent: '#f59e0b', scale: 0.8, walk: [205, 262], face: 1,
    ask: 'Hi! Do you want to play?', answers: [['Yes!', 'Catch me!'], ['No, thank you', 'OK… maybe later.']] },
  { id: 'cat', x: 330, roof: true, cat: true, ask: 'Meow?', answers: [['Hello, cat', 'Meow!'], ['Come here', 'Meeeow…']] },
  { id: 'cook', scene: 'house', x: 110, lane: 1, kind: 'guard', friendly: true, suit: { body: '#f8fafc', back: '#cbd5e1', front: '#ffffff', edge: '#64748b' }, face: -1,
    ask: 'Are you hungry?', answers: [['Yes, I want soup', 'Hot soup for the ninja!', '🍲'], ['No, I want water', 'Fresh water.', '💧'], ['Bye!', 'Come back soon!']] }
];
const PROPS = [
  { kind: 'barrels', x: 128, lane: 2 }, { kind: 'cart', x: 60, lane: 0 }, { kind: 'tree', x: 400, lane: 2 }, { kind: 'well', x: 440, lane: 1 },
  { kind: 'lamp', x: 150, lane: 0 }, { kind: 'lamp', x: 270, lane: 0 }, { kind: 'gate', x: 500, lane: 0 }, { kind: 'bush', x: 20, lane: 2 }, { kind: 'bush', x: 470, lane: 2 }
];

/* ---------- הנינג'ה ---------- */
const N = { x: 30, lane: 1, y: LANES[1].y, target: null, scene: 'street', roof: false, climb: null, face: 1, t: 0, bag: [] };
const SPEED = 38, LANE_SPEED = 14;
let talk = null;                                                     // { npc, line, t, answers }
function laneY() { return N.roof ? ROOF3.y : LANES[N.lane].y; }

/* ---------- קלט ---------- */
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  const wx = (e.clientX - r.left - ox) / scale + camX, wy = (e.clientY - r.top - oy) / scale;
  if (talk) { endTalk(); return; }
  // דמויות / דלת / סולם קודם
  for (const p of NPCS) if (p.scene === (N.scene === 'house' ? 'house' : undefined) && Math.abs(wx - p.x) < 9 && wy < 80) { walkTo(p.x + (N.x < p.x ? -10 : 10), p.roof ? N.lane : (p.lane ?? N.lane), () => startTalk(p)); return; }
  if (N.scene === 'street') {
    const h2 = HOUSES[1], dx = h2.x + h2.w / 2;
    if (!N.roof && Math.abs(wx - dx) < 7 && wy > 40 && wy < 68) { walkTo(dx, 0, () => enterHouse()); return; }
    const h3 = HOUSES[2];
    if (Math.abs(wx - h3.ladder) < 6 && wy > ROOF3.y - 6 && wy < 68) { if (N.roof) startClimb(false); else walkTo(h3.ladder, 0, () => startClimb(true)); return; }
    if (N.roof) { walkTo(Math.max(ROOF3.x + 4, Math.min(ROOF3.x + ROOF3.w - 4, wx)), N.lane); return; }
  } else if (N.scene === 'house' && wx < 22) { walkTo(14, 1, () => leaveHouse()); return; }
  const lane = N.roof ? N.lane : wy < 69 ? 0 : wy < 76 ? 1 : 2;
  walkTo(wx, lane);
});
function walkTo(x, lane, then) { N.target = { x: Math.max(4, Math.min((N.scene === 'house' ? W : WORLD_W) - 4, x)), lane, then }; }
function startTalk(p) { N.face = p.x > N.x ? 1 : -1; talk = { npc: p, line: p.ask, t: 0, answers: p.answers }; speak(p.ask); renderUI(); }
function answer(a) {
  const p = talk.npc; talk = { npc: p, line: a[1], t: 0, answers: null }; speak(a[1]);
  if (a[2]) { N.bag.push(a[2]); fly = { icon: a[2], x: p.x, y: laneY() - 12, t: 0 }; }
  renderUI(); setTimeout(() => { if (talk && !talk.answers) endTalk(); }, 2600);
}
function endTalk() { talk = null; renderUI(); }
function renderUI() {
  const ui = $('ui'); ui.innerHTML = '';
  if (talk && talk.answers) talk.answers.forEach(a => { const b = document.createElement('button'); b.textContent = '🗣 ' + a[0]; b.onclick = () => answer(a); ui.appendChild(b); });
}
function enterHouse() { N.scene = 'house'; N.x = 18; N.lane = 1; N.y = LANES[1].y; N.face = 1; }
function leaveHouse() { N.scene = 'street'; const h2 = HOUSES[1]; N.x = h2.x + h2.w / 2; N.lane = 0; N.y = LANES[0].y; N.face = 1; }
function startClimb(up) { N.climb = { up, k: 0 }; N.target = null; }
let fly = null;

/* ---------- עדכון ---------- */
let lastT = 0, dayT = 0;
function update(dt) {
  N.t += dt; dayT += dt;
  if (N.climb) {                                                     // טיפוס על הסולם
    N.climb.k = Math.min(1, N.climb.k + dt / 1.4);
    const k = N.climb.up ? N.climb.k : 1 - N.climb.k;
    N.y = LANES[0].y + (ROOF3.y - LANES[0].y) * k;
    if (N.climb.k >= 1) { N.roof = N.climb.up; N.lane = 0; N.climb = null; }
    return;
  }
  if (N.target) {
    const d = N.target.x - N.x, step = SPEED * dt;
    if (Math.abs(d) > step) { N.x += Math.sign(d) * step; N.face = Math.sign(d); }
    else N.x = N.target.x;
    if (!N.roof && N.lane !== N.target.lane) {                       // מעבר נתיב – הגוף זז בהדרגה לקו הקרקע החדש
      const ty = LANES[N.target.lane].y, dy = ty - N.y, s = LANE_SPEED * dt;
      if (Math.abs(dy) > s) N.y += Math.sign(dy) * s; else { N.y = ty; N.lane = N.target.lane; }
    }
    if (N.x === N.target.x && (N.roof || N.lane === N.target.lane)) { const f = N.target.then; N.target = null; if (f) f(); }
  }
  for (const p of NPCS) if (p.walk && !(talk && talk.npc === p)) {   // הילד מסתובב ברחוב
    p.dir = p.dir || 1; p.x += p.dir * 9 * dt;
    if (p.x > p.walk[1]) p.dir = -1; if (p.x < p.walk[0]) p.dir = 1; p.face = p.dir;
  }
  if (talk) talk.t += dt;
  if (fly) { fly.t += dt; if (fly.t > 0.9) fly = null; }
  const vis = N.scene === 'house' ? 0 : Math.max(0, Math.min(WORLD_W - W, N.x - W * 0.42));
  camX += (vis - camX) * Math.min(1, dt * 4);
}

/* ---------- ציור ---------- */
function dayK() { return 0.5 + 0.5 * Math.cos(dayT / 60 * Math.PI * 2); }   // 1 = צהריים, 0 = לילה (מחזור של דקה)
function mix(a, b, k) { const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; const A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; }
function draw() {
  const k = dayK(), night = 1 - k;
  const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, mix('#1e1b4b', '#7dd3fc', k)); g.addColorStop(1, mix('#312e81', '#e0f2fe', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
  const left = -ox / scale, right = W + ox / scale, top = -oy / scale, bottom = H + (ch - oy) / scale;
  if (N.scene === 'house') drawRoom(left, right, top, bottom); else drawStreet(left, right, top, bottom, k);
  if (fly) { ctx.font = '7px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; const kk = fly.t / 0.9; ctx.fillText(fly.icon, fly.x - camX + (N.x - fly.x) * kk, fly.y - Math.sin(kk * Math.PI) * 10 + (laneY() - 10 - fly.y) * kk); }
  if (talk) bubble(talk.line, (talk.npc.x) - camX, (talk.npc.roof ? ROOF3.y : LANES[talk.npc.lane ?? 1].y) - (talk.npc.cat ? 8 : 20));
  if (N.bag.length) { ctx.font = '6px system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = '#000'; ctx.fillText(N.bag.join(' '), right - 4, top + 10); }
  ctx.restore();
}
function drawStreet(left, right, top, bottom, k) {
  const night = 1 - k, now = N.t;
  // רקע רחוק: גבעות ועננים (פרלקסה)
  ctx.fillStyle = mix('#1e293b', '#bbf7d0', k); ctx.beginPath(); ctx.moveTo(left, 66);
  for (let x = left; x <= right + 4; x += 4) ctx.lineTo(x, 66 - 22 * (0.5 + 0.3 * Math.sin((x + camX * 0.1) * 0.05) + 0.2 * Math.sin((x + camX * 0.1) * 0.13 + 1))); ctx.lineTo(right + 4, 66); ctx.fill();
  ctx.fillStyle = mix('#334155', '#86efac', k); ctx.beginPath(); ctx.moveTo(left, 66);
  for (let x = left; x <= right + 4; x += 4) ctx.lineTo(x, 66 - 12 * (0.5 + 0.35 * Math.sin((x + camX * 0.25) * 0.08 + 2))); ctx.lineTo(right + 4, 66); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * k) + ')';
  for (let i = 0; i < 6; i++) { const cx = ((i * 97 - camX * 0.05 - now * 1.2) % 260 + 260) % 260 - 50 + left, cy = 10 + hash(i) * 14, r = 3 + hash(i + 3) * 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.arc(cx + r, cy - r * 0.4, r * 1.2, 0, 7); ctx.arc(cx + r * 2.2, cy, r * 0.9, 0, 7); ctx.fill(); }
  if (night > 0.3) { ctx.fillStyle = 'rgba(255,255,255,' + (night - 0.3) + ')'; for (let i = 0; i < 40; i++) ctx.fillRect(left + hash(i) * (right - left), top + hash(i + 50) * 40, 0.5, 0.5); }
  ctx.save(); ctx.translate(-camX, 0);
  // קרקע: שלושה נתיבים – אחורי (ליד הבתים), דרך, קדמי (דשא)
  ctx.fillStyle = mix('#3f3f46', '#a16207', k); ctx.fillRect(camX + left, 66, right - left, bottom - 66);
  ctx.fillStyle = mix('#52525b', '#d6b26b', k); ctx.fillRect(camX + left, 69, right - left, 9);          // הדרך
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = Math.floor((camX + left) / 10) * 10; x < camX + right; x += 10) ctx.fillRect(x, 73 + hash(x) * 2, 4, 0.6);
  ctx.fillStyle = mix('#14532d', '#4ade80', k); ctx.fillRect(camX + left, 78, right - left, bottom - 78);   // דשא קדמי
  ctx.fillStyle = mix('#166534', '#22c55e', k); ctx.fillRect(camX + left, 78, right - left, 1.5);
  // בתים (על הנתיב האחורי)
  HOUSES.forEach((h, i) => drawHouse(h, i, k));
  // פריטים ודמויות, לפי נתיב (אחורי קודם) – מה שקדימה מסתיר את מה שמאחור
  const items = [];
  PROPS.forEach(p => items.push({ lane: p.lane, fn: () => drawProp(p, k) }));
  NPCS.forEach(p => { if (p.scene) return; items.push({ lane: p.roof ? -1 : p.lane, fn: () => drawNPC(p) }); });
  items.push({ lane: N.roof || N.climb ? -1 : N.lane, y: N.y, fn: drawNinja });
  items.sort((a, b) => a.lane - b.lane);
  items.forEach(it => it.fn());
  if (night > 0.2) { ctx.fillStyle = 'rgba(15,23,42,' + (night * 0.35) + ')'; ctx.fillRect(camX + left, top, right - left, bottom - top); }   // לילה
  PROPS.filter(p => p.kind === 'lamp').forEach(p => { if (night > 0.2) { ctx.fillStyle = 'rgba(253,224,71,' + (night * 0.25) + ')'; ctx.beginPath(); ctx.arc(p.x, LANES[0].y - 22, 14, 0, 7); ctx.fill(); } });
  ctx.restore();
}
function drawHouse(h, i, k) {
  const y = LANES[0].y, top = y - h.h, now = N.t;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(h.x - 1, y - 1, h.w + 2, 2);                       // צל על הקרקע
  ctx.fillStyle = h.color; ctx.fillRect(h.x, top, h.w, h.h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(h.x + h.w * 0.6, top, h.w * 0.4, h.h);                // צד מוצל
  ctx.fillStyle = h.roof; ctx.beginPath(); ctx.moveTo(h.x - 4, top); ctx.lineTo(h.x + h.w / 2, top - 10); ctx.lineTo(h.x + h.w + 4, top); ctx.closePath(); ctx.fill();
  if (h.balcony) { ctx.fillStyle = h.roof; ctx.fillRect(h.x - 4, top, h.w + 8, 2); ctx.fillStyle = '#92400e'; for (let xx = h.x - 3; xx < h.x + h.w + 4; xx += 4) ctx.fillRect(xx, top - 5, 0.8, 5); ctx.fillRect(h.x - 4, top - 5, h.w + 8, 0.8); }
  for (let wx = h.x + 6; wx < h.x + h.w - 8; wx += 14) {                                                 // חלונות – מוארים בלילה
    for (let wy = top + 6; wy < y - 10; wy += 14) { ctx.fillStyle = k > 0.5 ? '#bfdbfe' : '#fde68a'; ctx.fillRect(wx, wy, 6, 6); ctx.strokeStyle = h.roof; ctx.lineWidth = 0.5; ctx.strokeRect(wx, wy, 6, 6); ctx.beginPath(); ctx.moveTo(wx + 3, wy); ctx.lineTo(wx + 3, wy + 6); ctx.moveTo(wx, wy + 3); ctx.lineTo(wx + 6, wy + 3); ctx.stroke(); }
  }
  if (h.door) { const dx = h.x + h.w / 2 - 5; ctx.fillStyle = '#7c2d12'; ctx.fillRect(dx, y - 14, 10, 14); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(dx + 8, y - 7, 0.8, 0, 7); ctx.fill(); ctx.strokeStyle = '#451a03'; ctx.lineWidth = 0.6; ctx.strokeRect(dx, y - 14, 10, 14); }
  if (h.awning) { for (let s = 0; s < 6; s++) { ctx.fillStyle = s % 2 ? '#fef3c7' : '#dc2626'; ctx.fillRect(h.x + 4 + s * 7, y - 16, 7, 4); } ctx.fillStyle = '#1e293b'; ctx.font = '700 4px system-ui'; ctx.textAlign = 'center'; ctx.fillText(h.sign, h.x + h.w / 2, top + 5); }
  if (h.chimney) { ctx.fillStyle = '#57534e'; ctx.fillRect(h.x + h.w - 12, top - 9, 4, 8);
    for (let s = 0; s < 4; s++) { const t = (now * 0.5 + s * 0.25) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - t)) + ')'; ctx.beginPath(); ctx.arc(h.x + h.w - 10 + Math.sin(t * 6 + s) * 2, top - 10 - t * 14, 1.5 + t * 2.5, 0, 7); ctx.fill(); } }
  if (h.ladder) { ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(h.ladder - 2.5, y); ctx.lineTo(h.ladder - 2.5, top - 1); ctx.moveTo(h.ladder + 2.5, y); ctx.lineTo(h.ladder + 2.5, top - 1); ctx.stroke();
    ctx.lineWidth = 0.6; for (let yy = y - 3; yy > top; yy -= 4) { ctx.beginPath(); ctx.moveTo(h.ladder - 2.5, yy); ctx.lineTo(h.ladder + 2.5, yy); ctx.stroke(); } }
}
function drawProp(p, k) {
  const y = LANES[p.lane].y, s = LANES[p.lane].s; ctx.save(); ctx.translate(p.x, y); ctx.scale(s, s);
  const shadow = () => { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0.6, 7, 1.2, 0, 0, 7); ctx.fill(); };
  if (p.kind === 'barrels') { shadow(); for (const [bx, by] of [[-5, 0], [3, 0], [-1, -8]]) { ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 3.5, by - 9, 7, 9, 1.5) : ctx.rect(bx - 3.5, by - 9, 7, 9); ctx.fill(); ctx.fillStyle = '#44403c'; ctx.fillRect(bx - 3.5, by - 7, 7, 0.8); ctx.fillRect(bx - 3.5, by - 3, 7, 0.8); } }
  if (p.kind === 'cart') { shadow(); ctx.fillStyle = '#b45309'; ctx.fillRect(-9, -8, 18, 6); ctx.fillStyle = '#3f2a1d'; ctx.beginPath(); ctx.arc(-5, -1.5, 2, 0, 7); ctx.arc(5, -1.5, 2, 0, 7); ctx.fill(); ctx.font = '5px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('🍎🍐🍋', 0, -9); }
  if (p.kind === 'tree') { shadow(); ctx.fillStyle = '#7c2d12'; ctx.fillRect(-1.5, -16, 3, 16); ctx.fillStyle = mix('#14532d', '#16a34a', k); for (const [cx, cy, r] of [[0, -22, 8], [-6, -17, 6], [6, -17, 6], [0, -14, 6]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); } }
  if (p.kind === 'well') { shadow(); ctx.fillStyle = '#78716c'; ctx.fillRect(-6, -7, 12, 7); ctx.fillStyle = '#57534e'; for (let yy = -6; yy < 0; yy += 2.5) ctx.fillRect(-6, yy, 12, 0.5); ctx.fillStyle = '#a16207'; ctx.fillRect(-5, -16, 1.2, 9); ctx.fillRect(3.8, -16, 1.2, 9); ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(0, -21); ctx.lineTo(8, -16); ctx.closePath(); ctx.fill(); }
  if (p.kind === 'lamp') { ctx.fillStyle = '#1e293b'; ctx.fillRect(-0.6, -22, 1.2, 22); ctx.fillStyle = k > 0.5 ? '#94a3b8' : '#fde047'; ctx.fillRect(-2, -25, 4, 4); }
  if (p.kind === 'gate') { ctx.fillStyle = '#57534e'; ctx.fillRect(-14, -26, 4, 26); ctx.fillRect(10, -26, 4, 26); ctx.fillRect(-16, -28, 32, 3); ctx.fillStyle = '#78716c'; for (let xx = -9; xx < 10; xx += 3) ctx.fillRect(xx, -24, 1, 24); ctx.fillStyle = '#fde68a'; ctx.font = '700 3.5px system-ui'; ctx.textAlign = 'center'; ctx.fillText('FOREST', 0, -30); }
  if (p.kind === 'bush') { shadow(); ctx.fillStyle = mix('#14532d', '#15803d', k); for (const [cx, cy, r] of [[-4, -3, 4], [3, -4, 4.5], [0, -2, 3.5]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); } }
  ctx.restore();
}
function drawNPC(p) {
  if (p.cat) { const y = ROOF3.y; ctx.save(); ctx.translate(p.x, y - 10); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-4, -1.5, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5.5, -2.5); ctx.lineTo(-5, -5); ctx.lineTo(-3.8, -3); ctx.moveTo(-2.5, -2.5); ctx.lineTo(-3, -5); ctx.lineTo(-4.2, -3); ctx.fill();
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(8, -2 + Math.sin(N.t * 3) * 1.5, 7, -5); ctx.stroke();
    ctx.fillStyle = '#16a34a'; ctx.fillRect(-4.8, -2, 0.7, 0.7); ctx.fillRect(-3.4, -2, 0.7, 0.7); ctx.restore(); return; }
  const y = LANES[p.lane].y, s = LANES[p.lane].s * (p.scale || 1);
  const walking = p.walk && !(talk && talk.npc === p);
  const P = walking ? poseRun(N.t * 9) : poseIdle(N.t + p.x);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, y + 0.6, 4.5 * s, 0.9, 0, 0, 7); ctx.fill();
  drawFigure({ fx: p.x, fy: y, facing: p.face || -1, scale: s, kind: p.kind, friendly: p.friendly, accent: p.accent, suit: p.suit, pose: P });
}
function drawNinja() {
  const s = N.roof || N.climb ? LANES[0].s : LANES[N.lane].s;
  const P = N.climb ? poseClimb(N.t) : N.target && N.x !== N.target.x ? poseRun(N.t * 9) : poseIdle(N.t);
  if (!N.climb) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(N.x, N.y + 0.6, 4.5 * s, 0.9, 0, 0, 7); ctx.fill(); }
  drawFigure({ fx: N.x, fy: N.y, facing: N.face, scale: s, kind: 'ninja', accent: '#0d9488', pose: P });
}
function drawRoom(left, right, top, bottom) {
  ctx.fillStyle = '#fde68a'; ctx.fillRect(left, top, right - left, bottom - top);                  // קיר
  ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let x = left; x < right; x += 12) ctx.fillRect(x, top, 0.6, bottom - top);
  ctx.fillStyle = '#92400e'; ctx.fillRect(left, 72, right - left, bottom - 72);                     // רצפת עץ
  ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let y = 76; y < bottom; y += 6) ctx.fillRect(left, y, right - left, 0.5);
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(4, 48, 12, 24); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(13, 60, 1, 0, 7); ctx.fill();   // דלת יציאה
  ctx.fillStyle = '#1e293b'; ctx.font = '700 3.5px system-ui'; ctx.textAlign = 'center'; ctx.fillText('EXIT', 10, 45);
  ctx.fillStyle = '#bfdbfe'; ctx.fillRect(60, 40, 16, 14); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.8; ctx.strokeRect(60, 40, 16, 14);   // חלון
  ctx.fillStyle = '#57534e'; ctx.fillRect(120, 46, 30, 26); ctx.fillStyle = '#f97316'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(128 + i * 7, 50 + Math.sin(N.t * 8 + i) * 0.5, 1.5, 0, 7); ctx.fill(); }   // תנור עם אש
  ctx.fillStyle = '#44403c'; ctx.fillRect(122, 44, 26, 2); ctx.font = '7px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('🍲', 135, 43);
  ctx.fillStyle = '#a16207'; ctx.fillRect(80, 62, 26, 2); ctx.fillRect(82, 64, 2, 8); ctx.fillRect(102, 64, 2, 8); ctx.fillText('🍞🧀', 93, 61);   // שולחן
  for (const p of NPCS) if (p.scene === 'house') drawNPC(p);
  drawNinja();
}
function bubble(text, x, y) {
  ctx.font = '700 4px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 5, h = 7, bx = Math.max(w / 2 + 1, Math.min(W - w / 2 - 1, x));
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - w / 2, y - h, w, h, 2) : ctx.rect(bx - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 1, y - 0.2); ctx.lineTo(x, y + 2.5); ctx.lineTo(x + 2, y - 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1e293b'; ctx.fillText(text, bx, y - h / 2 + 0.2); ctx.textBaseline = 'alphabetic';
}

function loop(ts) { const dt = Math.min(0.05, (ts - (lastT || ts)) / 1000); lastT = ts; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
