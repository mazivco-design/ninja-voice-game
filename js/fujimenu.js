/* ninja-voice-game – fujimenu.js
   המסך הראשי בסגנון יפני: שמיים בכחול-כתום, שמש, עננים, גבעות רחוקות, הר פוג'י עם שלג,
   ועל ההר דרך בזיגזג עם כל תחנות המסע. התפריט בצד או לרוחב למטה (לפי בחירה), ולוח הניקוד זז ומתקפל.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const FUJI_INK = '#2c4a7c', FUJI_RED = '#c8372d', FUJI_GOLD = '#e9b949', FUJI_PAPER = '#faf3e3';

function fujiPortrait() { return innerHeight > innerWidth; }
function menuLayout() { return fujiPortrait() ? 'bottom' : load('menuLayout', 'side'); }       // לאורך – תמיד למטה
function fujiSideW() { return Math.round(Math.min(420, Math.max(330, innerWidth * 0.33))); }
function fujiBotH() { return Math.round(fujiPortrait() ? Math.min(470, Math.max(360, innerHeight * 0.38)) : Math.min(250, Math.max(205, innerHeight * 0.3))); }

const LAYOUT_ICONS = {
  toBottom: '<svg viewBox="0 0 24 24" fill="none" stroke="#2c4a7c" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><rect x="3" y="14" width="18" height="6" rx="1" fill="#2c4a7c"/></svg>',
  toSide: '<svg viewBox="0 0 24 24" fill="none" stroke="#2c4a7c" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="1" fill="#2c4a7c"/></svg>'
};

function applyMenuLayout() {
  const m = $('menu'), lay = menuLayout();
  m.classList.toggle('mBottom', lay === 'bottom'); m.classList.toggle('mSide', lay !== 'bottom');
  m.style.setProperty('--sideW', fujiSideW() + 'px'); m.style.setProperty('--botH', fujiBotH() + 'px');
  $('layoutBtn').innerHTML = lay === 'bottom' ? LAYOUT_ICONS.toSide : LAYOUT_ICONS.toBottom;
  $('layoutBtn').setAttribute('aria-label', lay === 'bottom' ? 'Move the menu to the side' : 'Move the menu to the bottom');
  $('layoutBtn').classList.toggle('hide', fujiPortrait());
}
$('layoutBtn').onclick = () => { store('menuLayout', menuLayout() === 'bottom' ? 'side' : 'bottom'); applyMenuLayout(); renderFujiScene(); };

/* ---------- הנוף והמסלול ---------- */
let fujiLast = null;                                                   // מה שצריך כדי לצייר שוב כשהמסך משנה גודל
function renderFujiScene(info) {
  if (info) fujiLast = info;
  info = fujiLast;
  const box = $('fujiScene');
  if (!box || !info) return;
  const W = box.clientWidth || innerWidth, H = box.clientHeight || innerHeight, lay = menuLayout();
  drawFuji(box, W, H, 0, lay === 'bottom' ? W : W - fujiSideW() - 32, 92, lay === 'bottom' ? H - fujiBotH() - 40 : H - 26, info);
}
// מסך קבלת הפנים: אותו נוף בלי התחנות, ונינג'ה קטן למרגלות ההר
function renderWelcomeScene() {
  const box = $('welcomeScene');
  if (!box) return;
  const W = box.clientWidth || innerWidth, H = box.clientHeight || innerHeight;
  const g = drawFuji(box, W, H, 0, W, Math.round(H * 0.16), H - 26, null);
  $('players').style.setProperty('--wTop', Math.round(g.snowBottom + 18) + 'px');   // חלון השחקנים יושב קצת מתחת לשלג
}
function drawFuji(box, W, H, x0, x1, yt, yb, info) {
  const f1 = n => n.toFixed(1), gid = box.id;                       // מזהים נפרדים לכל נוף – אחרת השמיים וההר מאבדים את הצבעים
  const AW = x1 - x0, AH = Math.max(160, yb - yt);
  const MH = Math.min(AH, AW * 0.92), s = MH / 680, CX = x0 + AW / 2, TOP = yb - MH, BASE = yb;
  const fy = f => TOP + f * MH;
  const hw = y => s * (12 + 418 * Math.pow(Math.max(0, (y - TOP) / (BASE - TOP)), 1.12));   // פסגה מחודדת, מדרונות שנפתחים לבסיס רחב

  // ההר, הצל שלו וכיפת השלג
  const left = [], right = [];
  for (let y = TOP; y <= BASE + 0.1; y += 6) { left.push([CX - hw(y), y]); right.push([CX + hw(y), y]); }
  const footL = [], footR = [];                                            // ההר ממשיך להתרחב עד תחתית המסך – בלי קצה חתוך
  for (let y = BASE + 6; y <= H + 6; y += 6) { footL.push([CX - hw(y), y]); footR.push([CX + hw(y), y]); }
  const pts = a => a.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L');
  const crown = 'Q' + f1(CX) + ' ' + f1(TOP - 5 * s) + ' ' + f1(CX + hw(TOP)) + ' ' + f1(TOP);
  const mountD = 'M' + pts(footL.slice().reverse()) + ' L' + pts(left.slice().reverse()) + ' ' + crown + ' L' + pts(right) + (footR.length ? ' L' + pts(footR) : '') + ' Z';
  const shadeD = 'M' + f1(CX + 4 * s) + ' ' + f1(TOP - 8 * s) + ' Q' + f1(CX + 40 * s) + ' ' + f1(fy(0.45)) + ' ' + f1(CX + 130 * s) + ' ' + f1(BASE) + ' L' + pts(right.slice().reverse()) + ' Z';
  const SNOW = fy(0.22), sl = CX - hw(SNOW), sr = CX + hw(SNOW), jag = [];
  for (let i = 0; i <= 12; i++) jag.push([sl + (sr - sl) * i / 12, SNOW + ((i % 2 ? 22 : 0) + (i % 4 === 1 ? 8 : 0)) * s]);
  const snowL = left.filter(p => p[1] <= SNOW), snowR = right.filter(p => p[1] <= SNOW);
  const snowD = 'M' + pts(snowL.slice().reverse()) + ' ' + crown + ' L' + pts(snowR) + ' L' + pts(jag.slice().reverse()) + ' Z';

  // הדרך בזיגזג ומיקום התחנות לאורכה
  const ctrl = [];
  [0.919, 0.757, 0.603, 0.463, 0.338].forEach((f, r) => {
    const y = fy(f), w = Math.max(30 * s, hw(y) - 60 * s), a = Math.max(x0 + 34 * s, CX - w), b = Math.min(x1 - 34 * s, CX + w);
    if (r % 2 === 0) ctrl.push([a, y], [b, y]); else ctrl.push([b, y], [a, y]);
  });
  ctrl.push([CX, fy(0.235)], [CX, TOP - 2 * s]);
  const roadD = 'M' + pts(ctrl);
  const segs = []; let total = 0;
  for (let i = 1; i < ctrl.length; i++) { const L = Math.hypot(ctrl[i][0] - ctrl[i - 1][0], ctrl[i][1] - ctrl[i - 1][1]); segs.push(L); total += L; }
  const at = d => { let i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; } const k = Math.min(1, d / segs[i]); return [ctrl[i][0] + (ctrl[i + 1][0] - ctrl[i][0]) * k, ctrl[i][1] + (ctrl[i + 1][1] - ctrl[i][1]) * k]; };

  // עננים (אף ענן לא מאחורי הפסגה), שמש, גבעות רחוקות עם עצים ועצי אורן
  const cloud = (x, y, w, h, flip) => {
    const parts = [0.2, 0.3, 0.26, 0.24], hs = [0.55, 1, 0.8, 0.5]; let cx = x, d = 'M' + f1(x) + ' ' + f1(y);
    for (let i = 0; i < parts.length; i++) { const bw = parts[i] * w; d += ' A' + f1(bw / 2) + ' ' + f1(h * hs[i]) + ' 0 0 1 ' + f1(cx + bw) + ' ' + f1(y); cx += bw; }
    [[0.3, 0.22], [0.42, 0.3], [0.28, 0.18]].forEach(([pw, ph]) => { const lw = pw * w; d += ' A' + f1(lw / 2) + ' ' + f1(h * ph) + ' 0 0 1 ' + f1(cx - lw) + ' ' + f1(y); cx -= lw; });
    const ex = flip ? x : x + w, sg = flip ? -1 : 1, k = h / 34;
    const curl = 'M' + f1(ex) + ' ' + f1(y + 4 * k) + ' q' + f1(sg * 16 * k) + ' 0 ' + f1(sg * 16 * k) + ' ' + f1(-9 * k) + ' q0 ' + f1(-7 * k) + ' ' + f1(-sg * 7 * k) + ' ' + f1(-7 * k) + ' q' + f1(-sg * 6 * k) + ' 0 ' + f1(-sg * 6 * k) + ' ' + f1(5 * k) + ' q0 ' + f1(4 * k) + ' ' + f1(sg * 4 * k) + ' ' + f1(4 * k);
    return '<path d="' + d + ' Z" fill="#fbf5e6" stroke="' + FUJI_INK + '" stroke-width="1.6" stroke-opacity=".55" stroke-linejoin="round"/>' +
           '<path d="' + curl + '" stroke="' + FUJI_INK + '" stroke-width="1.6" stroke-opacity=".55" fill="none" stroke-linecap="round"/>';
  };
  const cloudOf = (x, y, w, h, flip) => {                                // סגנון העננים (FUJI_CLOUD): 1 בליטות, 2 פסים, 3 סלסולים, 4 רך, 5 ערפל זהב, 6 משחק
    const st = typeof FUJI_CLOUD === 'number' ? FUJI_CLOUD : 1;
    if (st === 1) return cloud(x, y, w, h, flip);
    const k = w / 240, tf = 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + k.toFixed(3) + ')' + (flip ? ' translate(240 0) scale(-1 1)' : '');
    const ns = ' vector-effect="non-scaling-stroke"';
    const ART = {
      2: '<g fill="#fbf5e6" stroke="#c9944a" stroke-width="2"' + ns + '><rect x="20" y="-54" width="170" height="18" rx="9"' + ns + '/><rect x="56" y="-36" width="184" height="18" rx="9"' + ns + '/><rect x="0" y="-18" width="160" height="18" rx="9"' + ns + '/></g>' +
         '<g stroke="#c9944a" stroke-width="1.2" opacity=".7"><path d="M34 -45 H160 M72 -27 H214 M16 -9 H140"' + ns + '/></g>',
      3: '<path d="M10 -14 C0 -34 26 -50 44 -40 C50 -64 86 -70 100 -50 C112 -72 152 -70 158 -44 C174 -56 202 -46 198 -26 C216 -24 220 -4 202 0 L22 0 C6 0 2 -10 10 -14 Z" fill="#fbf5e6" stroke="#2c4a7c" stroke-width="1.8" stroke-opacity=".65"' + ns + '/>' +
         '<g stroke="#2c4a7c" stroke-width="1.8" stroke-opacity=".65" fill="none" stroke-linecap="round"><path d="M48 -22 a5 5 0 1 1 5 5 a9 9 0 1 1 -9 -9 a13 13 0 0 1 13 13"' + ns + '/><path d="M106 -30 a6 6 0 1 1 6 6 a11 11 0 1 1 -11 -11 a16 16 0 0 1 16 16"' + ns + '/><path d="M166 -22 a5 5 0 1 1 5 5 a9 9 0 1 1 -9 -9 a13 13 0 0 1 13 13"' + ns + '/></g>',
      4: '<ellipse cx="130" cy="-4" rx="112" ry="11" fill="#f1c79a" opacity=".7"/><g fill="#fff" opacity=".9"><ellipse cx="80" cy="-20" rx="54" ry="22"/><ellipse cx="130" cy="-32" rx="48" ry="30"/><ellipse cx="182" cy="-20" rx="56" ry="22"/><ellipse cx="130" cy="-12" rx="110" ry="14"/></g>',
      5: '<path d="M0 -44 H200 A12 12 0 0 1 200 -20 H150 A10 10 0 0 0 150 0 H10 A10 10 0 0 1 10 -20 H40 A12 12 0 0 0 40 -44 Z" fill="#ead7a8" opacity=".92" stroke="#b9873f" stroke-width="1.6"' + ns + '/>',
      6: '<g fill="#fff"><circle cx="34" cy="-24" r="24"/><circle cx="90" cy="-40" r="44"/><circle cx="150" cy="-30" r="36"/><circle cx="200" cy="-18" r="24"/><rect x="8" y="-30" width="218" height="30" rx="15"/></g><rect x="16" y="-14" width="202" height="14" rx="7" fill="#dbe7f3"/>'
    };
    return '<g transform="' + tf + '">' + ART[st] + '</g>';
  };
  const cl = (dx, dy, w, h, flip) => { const x = Math.max(4, Math.min(W - w * s - 24, CX + dx * s)); return cloudOf(x, TOP + dy * s, w * s, h * s, flip); };
  const hills = (y, amp, col, treeCol, step, th) => {
    let d = 'M-20 ' + f1(y), trees = '';
    for (let x = 0; x <= W + 40; x += 40) d += ' L' + f1(x) + ' ' + f1(y + Math.sin(x * 0.012 + y) * amp);
    d += ' L' + f1(W + 40) + ' ' + f1(H) + ' L-20 ' + f1(H) + ' Z';
    for (let x = 6; x < W; x += step) { const ty = y + Math.sin(x * 0.012 + y) * amp + 4 + (x % 3) * 2; trees += '<path d="M' + f1(x) + ' ' + f1(ty) + ' l' + f1(th * 0.35) + ' ' + f1(-th) + ' l' + f1(th * 0.35) + ' ' + f1(th) + ' z" fill="' + treeCol + '"/>'; }
    return '<path d="' + d + '" fill="' + col + '"/>' + trees;
  };
  const pine = (x, y, k) => '<rect x="' + f1(x - 4 * k) + '" y="' + f1(y - 70 * k) + '" width="' + f1(8 * k) + '" height="' + f1(70 * k) + '" fill="#5b3a1e"/>' +
    '<path d="M' + f1(x) + ' ' + f1(y - 140 * k) + ' l' + f1(40 * k) + ' ' + f1(50 * k) + ' l' + f1(-28 * k) + ' ' + f1(-4 * k) + ' l' + f1(36 * k) + ' ' + f1(44 * k) + ' l' + f1(-96 * k) + ' 0 l' + f1(36 * k) + ' ' + f1(-44 * k) + ' l' + f1(-28 * k) + ' ' + f1(4 * k) + ' z" fill="#2f5a3d"/>';

  // התחנות: אדום עם כוכב = נלמדה, זהב = נפתחה ומחכה לשיעור, נייר עם מספר = עוד לא הגענו
  const N = info ? WORDS.length : 0, ts = Math.max(0.75, Math.min(1.3, s)), tw = 34 * ts, th = 32 * ts, rr = 9 * ts, dep = 5 * ts;
  let tiles = '';
  if (!info) {                                                         // קבלת פנים: נינג'ה בצבעי ברירת המחדל עומד למרגלות ההר, ודגל על הפסגה
    const nw = 44 * ts * 1.6, nh = 46 * ts * 1.6, nx = CX - 230 * s, ny = BASE - 30 * s - nh;
    tiles += ninjaIcon('#dc2626').replace('<svg ', '<svg x="' + f1(nx - nw / 2) + '" y="' + f1(ny) + '" width="' + f1(nw) + '" height="' + f1(nh) + '" ');
    tiles += '<rect x="' + f1(CX - 2 * ts) + '" y="' + f1(TOP - 48 * ts) + '" width="' + f1(4 * ts) + '" height="' + f1(46 * ts) + '" fill="#1f2a44"/>' +
             '<path d="M' + f1(CX + 2 * ts) + ' ' + f1(TOP - 48 * ts) + ' l' + f1(30 * ts) + ' ' + f1(10 * ts) + ' l' + f1(-30 * ts) + ' ' + f1(10 * ts) + ' z" fill="' + FUJI_RED + '"/>';
  }
  for (let i = 0; i < N; i++) {
    const [x, y] = at(total * i / (N - 1)), w = WORDS[i], last = i === N - 1, cur = i === info.st;
    const learned = info.learned.includes(w), reached = i <= info.st;
    if (last) {                                                        // הסוף – דגל על הפסגה
      tiles += '<rect x="' + f1(x - 2 * ts) + '" y="' + f1(y - 46 * ts) + '" width="' + f1(4 * ts) + '" height="' + f1(46 * ts) + '" fill="#1f2a44"/>' +
               '<path d="M' + f1(x + 2 * ts) + ' ' + f1(y - 46 * ts) + ' l' + f1(30 * ts) + ' ' + f1(10 * ts) + ' l' + f1(-30 * ts) + ' ' + f1(10 * ts) + ' z" fill="' + FUJI_RED + '"/>';
    } else {
      const big = cur ? 1.3 : 1, W2 = tw * big, H2 = th * big;
      const face = cur ? '#ffffff' : !reached ? FUJI_PAPER : learned ? FUJI_RED : FUJI_GOLD;
      const edge = cur ? '#b9a97f' : !reached ? '#b9a97f' : learned ? '#7f1d1d' : '#a07a22';
      tiles += '<g' + (cur ? '' : '') + '>' +
        (cur ? '<rect x="' + f1(x - W2 / 2 - 6 * ts) + '" y="' + f1(y - H2 / 2 - 6 * ts) + '" width="' + f1(W2 + 12 * ts) + '" height="' + f1(H2 + 12 * ts + dep) + '" rx="' + f1(rr + 5 * ts) + '" fill="' + FUJI_GOLD + '"/>' : '') +
        '<rect x="' + f1(x - W2 / 2) + '" y="' + f1(y - H2 / 2 + dep) + '" width="' + f1(W2) + '" height="' + f1(H2) + '" rx="' + f1(rr) + '" fill="' + edge + '"/>' +
        '<rect x="' + f1(x - W2 / 2) + '" y="' + f1(y - H2 / 2) + '" width="' + f1(W2) + '" height="' + f1(H2) + '" rx="' + f1(rr) + '" fill="' + face + '"/>';
      const done = reached && learned && !cur;                         // נלמדה: מספר בזהב על אדום, וכוכב קטן בפינה
      tiles += '<text x="' + f1(x) + '" y="' + f1(y + 5.5 * ts * big) + '" text-anchor="middle" font-family="Shippori Mincho B1, serif" font-weight="800" font-size="' + f1(15 * ts * big) + '" fill="' + (cur ? FUJI_RED : !reached ? FUJI_INK : done ? FUJI_GOLD : '#4a2f0b') + '">' + i + '</text>';
      if (done) tiles += '<path transform="translate(' + f1(x + W2 / 2 - 8 * ts) + ' ' + f1(y - H2 / 2 - 7 * ts) + ') scale(' + f1(14 * ts / 24) + ')" d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="' + FUJI_GOLD + '" stroke="#7f1d1d" stroke-width="1.6"/>';
      tiles += '</g>';
    }
    if (cur) {                                                         // הנינג'ה עומד בתחנה הנוכחית, בצבעים שלו
      const nw = 44 * ts * 1.35, nh = 46 * ts * 1.35, ny = last ? y - 46 * ts - nh * 0.55 : y - th * 0.65 - nh;
      tiles += ninjaIcon(info.color, info.suit).replace('<svg ', '<svg x="' + f1(x - nw / 2 - (last ? 18 * ts : 0)) + '" y="' + f1(ny) + '" width="' + f1(nw) + '" height="' + f1(nh) + '" ');
    }
  }

  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="' + gid + 'Sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4a7a"/><stop offset=".3" stop-color="#4f7fae"/>' +
    '<stop offset=".55" stop-color="#a7c1d6"/><stop offset=".75" stop-color="#f1c79a"/><stop offset="1" stop-color="#ec9a5c"/></linearGradient>' +
    '<linearGradient id="' + gid + 'Body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d82b3"/><stop offset="1" stop-color="#7d9cc4"/></linearGradient></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#' + gid + 'Sky)"/>' +
    '<circle cx="' + f1(CX + 260 * s) + '" cy="' + f1(TOP + 40 * s) + '" r="' + f1(54 * s) + '" fill="#d9453a"/>' +
    cl(100, 80, 200, 32) + cl(150, 180, 230, 36, true) + cl(470, 0, 190, 30) + cl(-362, 330, 160, 28, true) + cl(550, 230, 180, 30) +
    hills(fy(0.72), 10 * s, '#c3d3dc', '#aec3cf', 23, 20 * s) + hills(fy(0.81), 8 * s, '#a9c2b9', '#93b0a5', 31, 26 * s) +
    '<path d="' + mountD + '" fill="url(#' + gid + 'Body)"/><path d="' + shadeD + '" fill="#4f74a6" opacity=".5"/><path d="' + snowD + '" fill="#fbf5e6"/>' +
    pine(CX - 340 * s, BASE - 40 * s, s) + pine(CX + 366 * s, BASE - 50 * s, s) +
    (!info ? '' : '<path d="' + roadD + '" stroke="#8a6a3a" stroke-width="' + f1(18 * ts) + '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>' +
    '<path d="' + roadD + '" stroke="#ead2a2" stroke-width="' + f1(12 * ts) + '" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>') +
    tiles + '</svg>';
  return { snowBottom: SNOW + 30 * s, TOP, BASE };
}

/* ---------- לוח הניקוד: גוררים מהכותרת, מקפלים מהחץ ---------- */
const SB_GRIP = '<svg viewBox="0 0 24 24" fill="#2c4a7c" aria-hidden="true"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg>';
function placeSideBoard() {
  const sb = $('sideBoard'), closed = !!load('sbClosed', false), pos = load('sbPos', null);
  sb.classList.toggle('closed', closed);
  $('sbMin').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#2c4a7c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (closed ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6') + '"/></svg>';
  $('sbMin').setAttribute('aria-label', closed ? 'Open scores' : 'Minimize scores');
  if (pos) {
    const w = sb.offsetWidth || 272, h = sb.offsetHeight || 60;
    sb.style.left = Math.max(0, Math.min(innerWidth - w, pos.x)) + 'px';
    sb.style.top = Math.max(0, Math.min(innerHeight - Math.min(h, 60), pos.y)) + 'px';
  } else { sb.style.left = ''; sb.style.top = ''; }
}
$('sbHead').querySelector('.grip').innerHTML = SB_GRIP;
$('sbMin').onclick = e => { e.stopPropagation(); store('sbClosed', !load('sbClosed', false)); placeSideBoard(); };
$('sbMin').addEventListener('pointerdown', e => e.stopPropagation());
(() => {
  const head = $('sbHead'), sb = $('sideBoard');
  let drag = null;
  head.addEventListener('pointerdown', e => {
    const r = sb.getBoundingClientRect(), a = $('app').getBoundingClientRect();
    drag = { px: e.clientX, py: e.clientY, x: r.left - a.left, y: r.top - a.top };
    try { head.setPointerCapture(e.pointerId); } catch (err) {}
  });
  head.addEventListener('pointermove', e => {
    if (!drag) return;
    const x = Math.max(0, Math.min(innerWidth - sb.offsetWidth, drag.x + e.clientX - drag.px));
    const y = Math.max(0, Math.min(innerHeight - 50, drag.y + e.clientY - drag.py));
    sb.style.left = x + 'px'; sb.style.top = y + 'px';
  });
  const end = () => { if (!drag) return; store('sbPos', { x: parseFloat(sb.style.left) || 0, y: parseFloat(sb.style.top) || 0 }); drag = null; };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
})();

addEventListener('resize', () => {
  if ($('menu').classList.contains('show')) { applyMenuLayout(); renderFujiScene(); placeSideBoard(); }
  if ($('players').classList.contains('show') || $('editP').classList.contains('show')) renderWelcomeScene();
});
