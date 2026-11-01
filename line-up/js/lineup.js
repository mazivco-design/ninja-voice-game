/* ============================================================
   line-up/js/lineup.js – Line Up! אב־טיפוס ראשון: דוכן נודלס ודוכן קינוחים.
   מבט מוטה כמו הכפר הדו־ממדי: הקרקע "שוכבת" (y × K), העצמים עומדים זקופים.
   קואורדינטות "קרקע" (x, y) → על המסך (x, y*K). הדמויות והעצים מצוירים בקוד של הכפר (core.js / world.js).

   הרצף: שלושה נינג'ות בתור לפני הנינג'ה של הילד → כל אחד מזמין נודלס ויושב לשולחן →
   תור הילד (בועה עם מיקרופון) → כולם אוכלים יחד → קמים והולכים לדוכן הקינוחים →
   כל נינג'ה בוחר קינוח אחר (cake / ice cream / cookie) → הילד בוחר מה שהוא רוצה → חוזרים לשולחן.
   ============================================================ */
(() => {

// ---------- המקום ----------
const NOODLE = { x: 270, y: 300, c: '#b91c1c', sign: 'NOODLES' };
const SWEET = { x: 850, y: 300, c: '#db2777', sign: 'SWEETS' };
const TABLE = { x: 560, y: 566, hw: 140, hd: 26, h: 18 };
const SEATS = [473, 531, 589, 647].map(x => ({ x, y: TABLE.y - TABLE.hd - 10 }));
const QN = [[270, 372], [274, 434], [266, 496], [270, 558]];       // התור לנודלס (הראשון ליד הדוכן)
const QS = [[850, 372], [846, 434], [854, 496], [850, 558]];       // התור לקינוחים
const DESSERTS = ['cake', 'ice cream', 'cookie'];
const VIEW = { x0: 105, x1: 1015, y0: 40, y1: 452 };              // מה שרואים (x בקרקע, y על המסך)

// ---------- הדמויות ----------
const look = accent => Object.assign({}, NINJA_LOOK, { accent });
function playerColor() {
  try {
    const ps = JSON.parse(localStorage.getItem('ninjaVoice_players') || '[]'), id = JSON.parse(localStorage.getItem('ninjaVoice_current') || 'null');
    const p = ps.find(q => q.id === id); if (p && p.color) return p.color;
  } catch (e) {}
  return '#dc2626';
}
const ME_COLOR = playerColor();
const NPC_COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0d9488'].filter(c => c !== ME_COLOR).slice(0, 3);
const COOK_LOOK = Object.assign({}, MERCHANT_LOOK, { body: '#f8fafc', limb: '#e2e8f0', limbBack: '#cbd5e1', accent: '#b91c1c', hat: null });
const BAKER_LOOK = Object.assign({}, VILLAGER_LOOK, { accent: '#fde68a' });

function mk(L, x, y, dir, rate) {
  return { look: L, x, y, dir: dir || 'down', phase: Math.random() * 6, walking: false, path: [], speed: 82, sit: 0, sitTo: 0,
           hold: null, bubble: null, rate: rate || 1, arrive: null, bob: 0 };
}
let npcs, me, cook, baker, chars, tableItems, step, runId = 0;

function reset() {
  npcs = NPC_COLORS.map((c, i) => mk(look(c), QN[i][0], QN[i][1], 'up', [1.1, 1.17, 1.24][i]));
  me = mk(look(ME_COLOR), 270, 760, 'up'); me.isMe = true;
  cook = mk(COOK_LOOK, NOODLE.x, NOODLE.y - 80, 'down'); cook.keeper = true;
  baker = mk(BAKER_LOOK, SWEET.x, SWEET.y - 80, 'down'); baker.keeper = true;
  chars = [...npcs, me];
  tableItems = [null, null, null, null];
  step = '';
}

// ---------- עזרים לזמן ----------
const wait = s => new Promise(r => setTimeout(r, s * 1000));
let myRun = 0;
async function W(s) { const id = myRun; await wait(s); if (id !== runId) throw 'stop'; }

function walkTo(c, pts) {
  c.sitTo = 0;
  c.path = pts.map(p => p.slice());
  return new Promise(r => { c.arrive = r; });
}
function updateChar(c, dt) {
  c.sit += (c.sitTo - c.sit) * Math.min(1, dt * 8);
  if (c.path.length) {
    const [tx, ty] = c.path[0], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), st = c.speed * dt;
    if (Math.abs(dx) > Math.abs(dy) * K) c.dir = dx > 0 ? 'right' : 'left'; else c.dir = dy > 0 ? 'down' : 'up';
    if (d <= st) { c.x = tx; c.y = ty; c.path.shift(); } else { c.x += dx / d * st; c.y += dy / d * st; }
    c.walking = true; c.phase += dt * 9;
    if (!c.path.length) { c.walking = false; const r = c.arrive; c.arrive = null; if (r) r(); }
  } else { c.walking = false; c.phase += dt * 2; }
  c.bob = Math.max(0, c.bob - dt * 6);
}

// ---------- בועות ----------
// kind: say (לבנה) · whisper (קטנה, תכלת – רמז) · mic (צהובה – "תורך") · think (בחירה)
function say(c, text, opts) { c.bubble = Object.assign({ text, t0: performance.now(), kind: 'say' }, opts || {}); }
function hush(c) { c.bubble = null; }
async function speakLine(c, text, side) {
  say(c, text, { side });
  const dur = await playLine(text, c.rate);
  await W(dur + 0.35);
}

// ============================================================
//   הרצף
// ============================================================
async function serve(stall, keeper, queue, itemFor, toSeat, side) {
  while (queue.length) {
    const c = queue[0];
    window.luStep = step = (stall === NOODLE ? 'noodles' : 'sweets') + ':' + (c.isMe ? 'me' : npcs.indexOf(c));
    c.dir = 'up';
    await W(0.35);
    await speakLine(keeper, 'What do you want?', 0);
    let item;
    if (c.isMe) item = await myTurn(stall, keeper, c);
    else {
      item = itemFor(c);
      hush(keeper);
      await speakLine(c, 'I want ' + itemText(item) + ', please.', side);
    }
    hush(c);
    await speakLine(keeper, 'Here you go!', 0);
    hush(keeper);
    c.hold = item; c.bob = 1;
    await W(0.35);
    queue.shift();
    toSeat(c);                                                        // הולך לשבת – בלי לחכות
    await W(0.5);
    const moves = queue.map((q, i) => walkTo(q, [(stall === NOODLE ? QN : QS)[i]]));
    await Promise.all(moves);
  }
}
function itemText(item) { return item === 'cookie' ? 'a cookie' : item; }
const SENT = item => 'I want ' + itemText(item) + ', please.';

function seatPath(c, from) {
  const i = chars.indexOf(c), s = SEATS[i];
  const mid = from === 'noodles' ? [[330 + i * 12, 470]] : [[760 - i * 10, 486 - i * 4]];
  return walkTo(c, [...mid, [s.x, s.y]]).then(() => {
    c.dir = 'down'; c.sitTo = 1;
    tableItems[i] = { kind: c.hold, left: 1, next: performance.now() + 900 + i * 400 }; c.hold = null;
  });
}

async function run() {
  const id = myRun = ++runId;
  reset();
  document.getElementById('end').style.display = 'none';
  try {
    await W(0.4);
    await walkTo(me, [[270, 640], QN[3]]);                            // הנינג'ה של הילד מצטרף לסוף התור
    me.dir = 'up';
    await W(0.4);
    const seated = [];
    await serve(NOODLE, cook, [...chars], () => 'noodles', c => seated.push(seatPath(c, 'noodles')), 1);
    await Promise.all(seated);
    window.luStep = step = 'eat';
    await W(1.0);
    await speakLine(npcs[1], 'Yum!', 0); hush(npcs[1]);
    await W(2.6);
    await speakLine(npcs[0], 'Dessert time!', 0); hush(npcs[0]);
    // קמים לפי הסדר והולכים לתור של הקינוחים
    tableItems = tableItems.map(t => null);
    const goes = chars.map((c, i) => W(i * 0.7).then(() => walkTo(c, [[700 + i * 8, 500 - i * 6], QS[i]])).then(() => { c.dir = 'up'; }));
    await Promise.all(goes);
    await W(0.4);
    const seated2 = [];
    await serve(SWEET, baker, [...chars], c => DESSERTS[npcs.indexOf(c)], c => seated2.push(seatPath(c, 'sweets')), -1);
    await Promise.all(seated2);
    window.luStep = step = 'end';
    await W(2.4);
    await speakLine(baker, 'Great job!', 0); hush(baker);
    await W(0.6);
    document.getElementById('end').style.display = 'flex';
  } catch (e) { if (e !== 'stop') throw e; }
}

// ---------- תור הילד ----------
let turn = null;      // { stall, wanted: [...], resolve, t0, hints, helper }
function myTurn(stall, keeper, c) {
  return new Promise(resolve => {
    hush(keeper);
    const wanted = stall === NOODLE ? ['noodles'] : DESSERTS;
    turn = { stall, wanted, resolve, t0: performance.now(), lastHint: performance.now(), hints: 0, heard: [], keeper };
    say(c, '', { kind: 'mic', side: stall === NOODLE ? 1 : -1 });
    if (!voiceReady()) setStatus(model ? 'אפשר לגעת בבועה במקום לדבר' : 'טוען את מנוע הקול… בינתיים אפשר לגעת בבועה');
    listener = (ws, isFinal) => {
      if (!turn) return;
      turn.heard = ws;
      const item = ws.find(w => turn.wanted.includes(w));
      if (item && ws.includes('want')) return done(item);
      if (isFinal) {
        turn.heard = [];
        if (item) hint('say');                                        // אמר רק "noodles" – מזכירים את המשפט המלא
        else if (ws.includes('want') && stall === SWEET) { say(keeper, 'Which one?', { kind: 'say' }); turn.lastHint = performance.now(); }
      }
    };
    turn.done = done;
    function done(item) {
      if (!turn) return;
      listener = null; setStatus('');
      const t = turn; turn = null;
      hush(t.keeper); helperHush();
      say(c, SENT(item), { side: stall === NOODLE ? 1 : -1, mine: true });
      setTimeout(() => resolve(item), 1300);
    }
  });
}
let helper = null;
function helperHush() { if (helper) { hush(helper); helper = null; } }
// רמז: נינג'ה שכבר הזמין "לוחש" (בועה קטנה). פעם שנייה – אומר את המשפט בקול
function hint(how) {
  if (!turn) return;
  turn.lastHint = performance.now(); turn.hints++;
  helperHush();
  helper = npcs[2];
  const item = turn.stall === NOODLE ? 'noodles' : DESSERTS[(turn.hints) % 3];
  const text = turn.stall === NOODLE ? SENT(item) : SENT(item);
  if (how === 'aloud') { say(helper, text, { side: -1 }); playLine(text, helper.rate); }
  else say(helper, text, { kind: 'whisper', side: -1 });
}
function updateTurn() {
  if (!turn) return;
  const since = (performance.now() - turn.lastHint) / 1000;
  if (performance.now() < ignoreUntil) return;
  if (since > 6.5) hint(turn.hints % 2 === 1 ? 'aloud' : 'whisper');
}

// ============================================================
//   ציור
// ============================================================
let z = 1, ox = 0, oy = 0, groundCv = null;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  z = Math.min(SW / (VIEW.x1 - VIEW.x0), SH / (VIEW.y1 - VIEW.y0));
  ox = SW / 2 - (VIEW.x0 + VIEW.x1) / 2 * z; oy = SH / 2 - (VIEW.y0 + VIEW.y1) / 2 * z;
  groundCv = null;
}
addEventListener('resize', resize);
const toScreen = (x, ys) => [ox + x * z, oy + ys * z];

// הקרקע – דשא ושבילי חצץ אורגניים, נבנית פעם אחת לתמונה
function pathBlobs(pts, seed, base) {
  const out = []; let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let d = 0; d < len; d += 5) {
      const t = dist + d, k = d / len, wob = Math.sin(t / 53 + seed) * 5 + Math.sin(t / 21 + seed * 2) * 2;
      out.push([ax + (bx - ax) * k + nx * wob, ay + (by - ay) * k + ny * wob, base + Math.sin(t / 61 + seed * 3) * 4 + Math.sin(t / 23 + seed) * 1.5]);
    }
    dist += len;
  }
  return out;
}
function buildGround() {
  const c = document.createElement('canvas');
  c.width = Math.ceil(SW * DPR); c.height = Math.ceil(SH * DPR);
  const g = c.getContext('2d');
  g.setTransform(DPR * z, 0, 0, DPR * z * K, DPR * ox, DPR * oy);       // קואורדינטות קרקע
  const X0 = (-ox) / z - 40, X1 = (SW - ox) / z + 40, Y0 = (-oy) / z / K - 40, Y1 = (SH - oy) / z / K + 40;
  g.fillStyle = '#5d8f45'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  const R = rng(7);
  for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(40,80,30,.18)' : 'rgba(150,190,90,.14)'; ell(g, X0 + R() * (X1 - X0), Y0 + R() * (Y1 - Y0), 30 + R() * 70, 20 + R() * 40); }
  const blobs = [
    ...pathBlobs([[270, 320], [272, 450], [266, 600], [262, 820]], 1.3, 30),
    ...pathBlobs([[850, 320], [848, 450], [856, 600], [860, 820]], 2.1, 30),
    ...pathBlobs([[270, 640], [420, 650], [560, 646], [700, 650], [850, 640]], 3.7, 24),
    ...pathBlobs([[270, 300], [560, 300], [850, 300]], 4.4, 26),
  ];
  // רחבה מתחת לשולחן
  for (let a = 0; a < 6.28; a += 0.05) {
    const r = 1 + Math.sin(a * 3) * 0.05 + Math.sin(a * 7 + 1) * 0.03;
    blobs.push([TABLE.x + Math.cos(a) * 175 * r, TABLE.y + Math.sin(a) * 74 * r, 26]);
  }
  blobs.push([TABLE.x, TABLE.y, 160]); blobs.push([TABLE.x - 70, TABLE.y, 70]); blobs.push([TABLE.x + 70, TABLE.y, 70]);
  // רחבות מול הדוכנים
  [NOODLE, SWEET].forEach(s => { for (let k = -2; k <= 2; k++) blobs.push([s.x + k * 26, s.y + 18, 34]); });
  const layer = (grow, col) => { g.fillStyle = col; blobs.forEach(([x, y, w]) => ell(g, x, y, w + grow, (w + grow) * 0.85)); };
  layer(7, 'rgba(50,60,30,.22)'); layer(3, '#a99c7c'); layer(-1, '#cfc4a7');
  for (let i = 0; i < blobs.length; i++) if (R() < 0.12) { const [x, y, w] = blobs[i]; g.fillStyle = R() < 0.6 ? 'rgba(232,224,204,.55)' : 'rgba(170,160,130,.35)'; ell(g, x + (R() - 0.5) * w, y + (R() - 0.5) * w * 0.6, 4 + R() * 8, 3 + R() * 5); }
  for (let i = 0; i < 260; i++) {                                   // חצץ
    const [x, y, w] = blobs[Math.floor(R() * blobs.length)];
    g.fillStyle = R() < 0.5 ? '#b6aa8c' : '#e2d9c2'; ell(g, x + (R() - 0.5) * w * 1.4, y + (R() - 0.5) * w, 1.6 + R() * 1.6, 1.3 + R() * 1.2);
  }
  // גבעולי דשא
  g.strokeStyle = 'rgba(40,85,30,.55)'; g.lineWidth = 1.4;
  for (let i = 0; i < 320; i++) {
    const x = X0 + R() * (X1 - X0), y = Y0 + R() * (Y1 - Y0);
    if (blobs.some(([bx, by, w]) => Math.abs(bx - x) < w + 6 && Math.abs(by - y) < w + 6)) continue;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 9); g.moveTo(x, y); g.lineTo(x + 2.5, y - 10); g.stroke();
  }
  // כריות ישיבה ליד השולחן
  SEATS.forEach((s, i) => {
    g.fillStyle = 'rgba(30,40,20,.25)'; rr(g, s.x - 17, s.y - 13, 36, 28, 6); g.fill();
    g.fillStyle = ['#7f1d1d', '#1e3a8a', '#7f1d1d', '#1e3a8a'][i]; rr(g, s.x - 18, s.y - 15, 36, 28, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, s.x - 14, s.y - 12, 28, 8, 4); g.fill();
  });
  groundCv = c;
}

// ---------- הדוכנים ----------
function drawStallFull(g, s, keeper, now) {
  const yb = s.y * K, x0 = s.x - 52;
  drawChar(g, keeper.x, s.y * K - 50, 'down', keeper.phase, false, keeper.look);           // עומד מאחורי הדלפק
  if (keeper === cook) {                                                                     // כובע טבח
    const hy = s.y * K - 50 - 31;
    g.fillStyle = '#f8fafc'; rr(g, keeper.x - 8, hy - 18, 16, 12, 4); g.fill();
    circ(g, keeper.x - 5, hy - 19, 5); circ(g, keeper.x + 5, hy - 19, 5); circ(g, keeper.x, hy - 22, 6);
  }
  drawStall(g, { x: s.x, y: s.y, c: s.c }, now);
  const top = yb - 46;
  if (s === NOODLE) {
    // סיר מהביל וקערות
    g.fillStyle = '#1f2937'; rr(g, x0 + 10, top - 14, 34, 20, 5); g.fill();
    g.fillStyle = '#374151'; ell(g, x0 + 27, top - 14, 17, 5);
    g.fillStyle = '#f2d27a'; ell(g, x0 + 27, top - 14, 13, 3.4);
    for (let k = 0; k < 3; k++) {
      const t = (now / 1400 + k / 3) % 1, a = 0.35 * (1 - t);
      g.fillStyle = 'rgba(255,255,255,' + a + ')'; circ(g, x0 + 22 + k * 6 + Math.sin(t * 6 + k) * 3, top - 20 - t * 30, 4 + t * 6);
    }
    for (let k = 0; k < 3; k++) { g.fillStyle = '#b91c1c'; ell(g, x0 + 66 + k * 13, top + 2, 6, 4); g.fillStyle = '#7f1d1d'; ell(g, x0 + 66 + k * 13, top - 0.5, 6, 1.6); }
    g.fillStyle = '#b91c1c'; ell(g, x0 + 72, top - 6, 6, 4); ell(g, x0 + 85, top - 6, 6, 4);
  } else {
    DESSERTS.forEach((d, i) => {
      const ix = x0 + 20 + i * 32, lit = turn && turn.stall === SWEET && turn.heard.includes(d);
      g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, ix, top + 4, 13, 4.2);
      if (lit) { g.strokeStyle = '#fde047'; g.lineWidth = 2; g.beginPath(); g.ellipse(ix, top + 4, 15, 5.5, 0, 0, 6.29); g.stroke(); }
      drawItem(g, d, ix, top + 4, 1.05, 1, now);
      g.fillStyle = '#fef3c7'; g.font = '800 7px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const parts = d.toUpperCase().split(' ');
      parts.forEach((t, k) => g.fillText(t, ix, yb - 13 + (k - (parts.length - 1) / 2) * 8));
    });
  }
  // שלט עץ מעל הגגון
  const sy = yb - 140;
  g.fillStyle = '#4a3527'; g.fillRect(s.x - 1.5, sy + 14, 3, 14);
  g.fillStyle = '#7c5233'; rr(g, s.x - 38, sy - 2, 76, 18, 4); g.fill();
  g.fillStyle = '#9c6c45'; rr(g, s.x - 38, sy - 2, 76, 4, 2); g.fill();
  g.fillStyle = '#fef3c7'; g.font = '900 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(s.sign, s.x, sy + 7.5);
}

// ---------- אוכל ----------
// y = תחתית החפץ (על המסך), left = כמה נשאר (1 = מלא)
function drawItem(g, kind, x, y, s, left, now) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (kind === 'noodles') {
    g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, 0, 0.5, 9, 2.6);
    g.fillStyle = '#b91c1c'; g.beginPath(); g.moveTo(-9, -8); g.quadraticCurveTo(-8, 0, 0, 0); g.quadraticCurveTo(8, 0, 9, -8); g.closePath(); g.fill();
    g.fillStyle = '#7f1d1d'; ell(g, 0, -8, 9, 2.8);
    if (left > 0.05) { g.fillStyle = '#f2d27a'; ell(g, 0, -8.2, 7.6 * Math.sqrt(left), 2.2 * Math.sqrt(left)); g.strokeStyle = '#e0b85a'; g.lineWidth = 0.8;
      g.beginPath(); for (let k = -5; k <= 5; k += 2.5) { g.moveTo(k * left, -9); g.quadraticCurveTo(k * left + 1.5, -7.5, k * left, -6.8); } g.stroke(); }
    g.strokeStyle = '#a16207'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(2, -8); g.lineTo(10, -19); g.moveTo(4, -8); g.lineTo(13, -18); g.stroke();
    if (now !== undefined && left > 0.2) for (let k = 0; k < 2; k++) {
      const t = (now / 1300 + k / 2 + x * 0.01) % 1; g.fillStyle = 'rgba(255,255,255,' + 0.3 * (1 - t) + ')'; circ(g, -3 + k * 5 + Math.sin(t * 5) * 2, -11 - t * 14, 2 + t * 3);
    }
  } else if (kind === 'cake') {
    const h = 4 + 7 * left;
    g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, 0, 0.5, 8.5, 2.4);
    g.fillStyle = '#f5d6a8'; g.fillRect(-7, -h, 14, h); ell(g, 0, 0, 7, 2);
    g.fillStyle = '#f9a8d4'; ell(g, 0, -h, 7, 2.2); g.fillRect(-7, -h, 14, 2.2);
    g.fillStyle = '#fbcfe8'; ell(g, -1.5, -h - 0.5, 3.5, 1);
    if (left > 0.6) { g.fillStyle = '#dc2626'; circ(g, 0, -h - 2.2, 2.2); g.fillStyle = 'rgba(255,255,255,.6)'; circ(g, -0.7, -h - 2.9, 0.7); }
  } else if (kind === 'ice cream') {
    g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, 0, 0.5, 6, 2);
    g.fillStyle = '#d6a15a'; g.beginPath(); g.moveTo(-5.5, -10); g.lineTo(5.5, -10); g.lineTo(0, 1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,70,20,.45)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-3.5, -10); g.lineTo(1.5, -1.5); g.moveTo(3.5, -10); g.lineTo(-1.5, -1.5); g.stroke();
    if (left > 0.05) { const r = 2.5 + 3.8 * left; g.fillStyle = '#86efac'; circ(g, 0, -10 - r * 0.6, r); g.fillStyle = '#f9a8d4'; if (left > 0.5) circ(g, 0.5, -10 - r * 1.7, r * 0.85);
      g.fillStyle = 'rgba(255,255,255,.5)'; circ(g, -1.6, -10 - r, 1.1); }
  } else if (kind === 'cookie') {
    g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, 0, 0.3, 8, 2.4);
    g.fillStyle = '#c08443'; g.beginPath(); g.ellipse(0, -2.5, 7.5, 3.6, 0, left < 0.9 ? 0.6 : 0, left < 0.9 ? 6.28 - 0.4 - (1 - left) * 2.5 : 6.29); g.lineTo(0, -2.5); g.closePath(); g.fill();
    g.fillStyle = '#d9a05b'; ell(g, -1, -3.3, 5.5, 2.3);
    g.fillStyle = '#4a2a14'; [[-3, -3], [1.5, -4], [3, -2], [-0.5, -1.8], [-4.5, -2]].forEach(([a, b], i) => { if (i < 2 + left * 4) circ(g, a, b, 0.9); });
  }
  g.restore();
}
function drawHeld(g, c) {
  if (!c.hold) return;
  const lift = c.bob * 6, y = c.y * K - 9 - lift;
  if (c.dir === 'left') drawItem(g, c.hold, c.x - 9, y, 0.9, 1);
  else if (c.dir === 'right') drawItem(g, c.hold, c.x + 9, y, 0.9, 1);
  else drawItem(g, c.hold, c.x, y + 1, 0.9, 1);
}

// ---------- השולחן ----------
function drawTable(g, now) {
  const T = TABLE, x0 = T.x - T.hw, x1 = T.x + T.hw, yb = (T.y - T.hd) * K - T.h, yf = (T.y + T.hd) * K - T.h;
  g.fillStyle = 'rgba(30,40,20,.28)'; ell(g, T.x + 6, (T.y + T.hd) * K + 2, T.hw + 12, 9);
  g.fillStyle = '#5b3a22'; [x0 + 10, x1 - 16].forEach(x => g.fillRect(x, yf, 6, T.h - 2));
  g.fillStyle = '#6b4428'; rr(g, x0, yf - 1, x1 - x0, 6, 2); g.fill();
  g.fillStyle = '#9a6a42'; rr(g, x0, yb, x1 - x0, yf - yb, 5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 3; k++) g.fillRect(x0 + 8, yb + 4 + k * 7, x1 - x0 - 16, 1.2);
  g.fillStyle = 'rgba(255,240,210,.18)'; rr(g, x0 + 4, yb + 2, x1 - x0 - 8, 4, 2); g.fill();
  tableItems.forEach((t, i) => {
    if (!t) return;
    if (now > t.next && t.left > 0.12) { t.left = Math.max(0.12, t.left - 0.11); t.next = now + 1300 + Math.random() * 900; chars[i].bob = 0.5; }
    drawItem(g, t.kind, SEATS[i].x, (T.y - 2) * K - T.h, 1.3, t.left, now);
  });
}

// ---------- בועות (בפיקסלים של המסך) ----------
function headAt(c) {
  if (c.keeper) { const s = c === cook ? NOODLE : SWEET; return toScreen(s.x, s.y * K - 128); }
  return toScreen(c.x, c.y * K - 46 + c.sit * 6 - c.bob * 4);
}
function drawBubble(g, c, now) {
  const b = c.bubble; if (!b) return;
  const u = Math.max(0.8, Math.min(1.5, z / 1.3)), age = (now - b.t0) / 1000, pop = Math.min(1, age / 0.18);
  let [ax, ay] = headAt(c);
  let text = b.text, fs = 21 * u, fill = '#ffffff', col = '#111827';
  if (b.kind === 'whisper') { fs = 16 * u; fill = '#e0f2fe'; col = '#0c4a6e'; text = '🤫 ' + text; }
  if (b.kind === 'mic') {
    fill = '#fde047'; col = '#1e3a8a';
    const heard = turn ? turn.heard.filter(w => w !== 'i' && w !== 'a') : [];
    const blink = Math.floor(now / 450) % 2 ? '🎤' : '🎙️';
    text = blink + ' ' + (heard.length ? heard.join(' ') + '…' : 'Your turn!');
  }
  if (b.mine) { fill = '#fef9c3'; col = '#1e3a8a'; }
  g.save();
  g.font = '800 ' + fs + 'px -apple-system, system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + fs * 1.3, h = fs * 1.85, side = b.side || 0;
  let cx = ax + side * (w / 2 - fs * 1.1);
  cx = Math.max(w / 2 + 8, Math.min(SW - w / 2 - 8, cx));
  const by = ay - 10 * u, T = by - h, L = cx - w / 2, Rr = cx + w / 2, r = h / 2.2;
  const tx = Math.max(L + r, Math.min(Rr - r, ax));
  const sc = 0.6 + 0.4 * pop + Math.sin(pop * Math.PI) * 0.08;
  g.translate(ax, by); g.scale(sc, sc); g.translate(-ax, -by);
  g.beginPath();
  g.moveTo(L + r, T); g.lineTo(Rr - r, T); g.quadraticCurveTo(Rr, T, Rr, T + r); g.lineTo(Rr, by - r); g.quadraticCurveTo(Rr, by, Rr - r, by);
  g.lineTo(tx + 9 * u, by); g.lineTo(ax, by + 10 * u); g.lineTo(tx - 3 * u, by);
  g.lineTo(L + r, by); g.quadraticCurveTo(L, by, L, by - r); g.lineTo(L, T + r); g.quadraticCurveTo(L, T, L + r, T); g.closePath();
  g.fillStyle = fill; g.lineWidth = 2.6 * u; g.strokeStyle = '#111827'; g.lineJoin = 'round';
  if (b.kind === 'whisper') g.setLineDash([5 * u, 4 * u]);
  g.fill(); g.stroke(); g.setLineDash([]);
  if (b.kind === 'mic') {                                                  // עוצמת הקול – פס שמתמלא כשהילד מדבר
    const lv = micLevel(); g.fillStyle = 'rgba(30,58,138,.18)'; rr(g, L + 10 * u, by - 7 * u, (w - 20 * u) * lv, 3.5 * u, 2); g.fill();
  }
  g.fillStyle = col; g.fillText(text, cx, (T + by) / 2 + 1);
  g.restore();
  b.rect = [L, T, w, h];
}
function drawMeMarker(g, now) {                                            // משולש קטן מעל הנינג'ה של הילד
  if (me.bubble) return;
  const [x, y] = headAt(me), u = Math.max(0.8, Math.min(1.5, z / 1.3)), bob = Math.sin(now / 300) * 3 * u;
  g.fillStyle = ME_COLOR; g.strokeStyle = '#fff'; g.lineWidth = 2 * u;
  g.beginPath(); g.moveTo(x - 8 * u, y - 14 * u + bob); g.lineTo(x + 8 * u, y - 14 * u + bob); g.lineTo(x, y - 3 * u + bob); g.closePath(); g.fill(); g.stroke();
}

// ---------- קישוטים ----------
const DECOR = [
  { y: 330, d: (g, n) => drawCherry(g, 560, 330 * K, 1.05) },
  { y: 470, d: (g, n) => drawPine(g, 130, 470 * K, 0.9) },
  { y: 500, d: (g, n) => drawPine(g, 1000, 500 * K, 0.85) },
  { y: 345, d: (g, n) => drawLantern(g, [180, 345], n) }, { y: 345, d: (g, n) => drawLantern(g, [360, 345], n) },
  { y: 345, d: (g, n) => drawLantern(g, [760, 345], n) }, { y: 345, d: (g, n) => drawLantern(g, [940, 345], n) },
  ...[[150, 600, 16, true], [985, 640, 15, false], [415, 720, 14, true], [705, 728, 13, false], [440, 360, 11, true], [690, 360, 12, false]]
    .map(b => ({ y: b[1], d: g => drawBush(g, b) })),
  ...[[60, 300], [75, 312], [1040, 300], [1058, 316], [1024, 322]].map((b, i) => ({ y: b[1], d: (g, n) => drawStalk(g, [b[0], b[1] * K, 0.95, i * 0.7], n) })),
  { y: 230, d: g => drawPine(g, 420, 230 * K, 0.75) }, { y: 225, d: g => drawPine(g, 705, 225 * K, 0.7) },
  ...[[560, 790, 15, false], [330, 800, 12, true], [800, 805, 13, true], [40, 760, 14, false], [1080, 770, 14, true]]
    .map(b => ({ y: b[1], d: g => drawBush(g, b) })),
  ...[[385, 430, 7], [735, 425, 6], [125, 690, 8], [1000, 420, 7], [520, 735, 6]].map(r => ({ y: r[1], d: g => drawRock(g, r) })),
];

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  luUpdate(dt);
  draw(now);
  requestAnimationFrame(frame);
}
function luUpdate(dt) { [...chars, cook, baker].forEach(c => updateChar(c, dt)); updateTurn(); }
window.luUpdate = luUpdate;

function draw(now) {
  if (!groundCv) buildGround();
  ctx.direction = 'ltr';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(groundCv, 0, 0);
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * ox, DPR * oy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const items = DECOR.map(o => ({ y: o.y, d: g => o.d(g, now) }));
  items.push({ y: NOODLE.y, d: g => drawStallFull(g, NOODLE, cook, now) });
  items.push({ y: SWEET.y, d: g => drawStallFull(g, SWEET, baker, now) });
  items.push({ y: TABLE.y - TABLE.hd + 2, d: g => drawTable(g, now) });
  chars.forEach(c => items.push({ y: c.y, d: g => {
    const sitDrop = c.sit * 7;
    if (c.dir === 'up') drawHeld(g, c);
    drawChar(g, c.x, c.y * K + sitDrop, c.dir, c.phase, c.walking, c.look, c.bob * 4);
    if (c.dir !== 'up') drawHeld(g, c);
  } }));
  items.sort((a, b) => a.y - b.y).forEach(o => o.d(ctx));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawMeMarker(ctx, now);
  [cook, baker, ...chars].forEach(c => drawBubble(ctx, c, now));
}

// ---------- נגיעה: במקום לדבר (בינתיים) ----------
cv.addEventListener('pointerdown', e => {
  if (!turn) return;
  const x = e.clientX, y = e.clientY;
  if (turn.stall === SWEET) {                                              // נגיעה בקינוח על הדלפק
    for (let i = 0; i < 3; i++) {
      const [sx, sy] = toScreen(SWEET.x - 52 + 20 + i * 32, SWEET.y * K - 50);
      if (Math.abs(x - sx) < 16 * z && Math.abs(y - sy) < 18 * z) return turn.done(DESSERTS[i]);
    }
  }
  const b = me.bubble && me.bubble.rect;
  if (b && x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3]) {
    turn.done(turn.stall === NOODLE ? 'noodles' : DESSERTS[Math.floor(Math.random() * 3)]);
  }
});

// ---------- התחלה ----------
document.getElementById('go').onclick = async () => {
  audioInit();
  document.getElementById('start').style.display = 'none';
  micInit();
  run();
};
document.getElementById('again').onclick = () => { audioInit(); run(); };

// לבדיקות: LU.hear('i want noodles please') – כאילו הילד אמר
window.LU = {
  hear(text) { if (listener) { lastLoudT = performance.now(); listener(tokens(text), true); } },
  state() { return { step, turn: !!turn, me: [me.x, me.y], items: tableItems.map(t => t && t.kind) }; },
};

reset(); resize();
requestAnimationFrame(frame);
loadModel();
})();
