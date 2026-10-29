/* ninja-voice-game – shop.js
   החנות: קונים במטבעות שנאספו. חליפות (צבע), נשקים (נראים על הנינג'ה ומשפרים פעולה), וחברים שמלווים בריצה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const SHOP = [
  { id: 'suit_night', at: 0,   cat: 'suit',   name: 'Night',   price: 0,  suit: null, swatch: '#1e293b' },
  { id: 'suit_crimson', at: 1, cat: 'suit',   name: 'Crimson', price: 30, suit: { body: '#7f1d1d', back: '#450a0a', front: '#991b1b', edge: '#2a0505' }, swatch: '#991b1b' },
  { id: 'suit_forest', at: 2,  cat: 'suit',   name: 'Forest',  price: 30, suit: { body: '#14532d', back: '#052e16', front: '#166534', edge: '#022c16' }, swatch: '#166534' },
  { id: 'suit_ocean', at: 3,   cat: 'suit',   name: 'Ocean',   price: 30, suit: { body: '#1e3a8a', back: '#172554', front: '#1d4ed8', edge: '#0b1640' }, swatch: '#1d4ed8' },
  { id: 'suit_purple', at: 4,  cat: 'suit',   name: 'Shadow',  price: 40, suit: { body: '#4c1d95', back: '#2e1065', front: '#6d28d9', edge: '#1e0a45' }, swatch: '#6d28d9' },
  { id: 'suit_snow', at: 5,    cat: 'suit',   name: 'Snow',    price: 50, suit: { body: '#e2e8f0', back: '#94a3b8', front: '#f8fafc', edge: '#64748b' }, swatch: '#f1f5f9' },
  { id: 'suit_gold', at: 7,    cat: 'suit',   name: 'Gold',    price: 80, suit: { body: '#a16207', back: '#713f12', front: '#ca8a04', edge: '#422006' }, swatch: '#ca8a04' },
  { id: 'katana', at: 4,   cat: 'weapon', name: 'Katana',        price: 60, icon: '🗡️', desc: 'On your back · KICK reaches farther' },
  { id: 'goldstar', at: 5, cat: 'weapon', name: 'Gold shuriken', price: 60, icon: '⭐', desc: 'THROW flies faster' },
  { id: 'dragon', at: 9,   cat: 'pet',    name: 'Baby dragon',   price: 150, icon: '🐉', desc: 'Flies with you · saves you once each journey run' },
  { id: 'owl', at: 6,      cat: 'pet',    name: 'Owl',           price: 100, icon: '🦉', desc: 'Flies with you · pulls coins to you, CATCH reaches farther' },
  // פריטים חד-פעמיים: קונים מנות, כל שימוש מוריד אחת (power.js)
  { id: 'shield', at: 2,   cat: 'power',  name: 'Bubble shield', price: 15, icon: '🫧', desc: 'Say SHIELD – a bubble stops the next hit', use: true },
  { id: 'jet', at: 4,      cat: 'power',  name: 'Jet pack',      price: 25, icon: '🚀', desc: 'Say JET – fly over everything for 5 seconds', use: true }
];
const SHOP_CATS = [['suit', '🥷 Suits'], ['weapon', '⚔️ Weapons'], ['pet', '🐉 Friends'], ['power', '⚡ Power-ups']];

function coinsNow() { return pLoad('coins', 0); }
function getOwned() { return isTester() ? SHOP.map(i => i.id) : pLoad('owned', ['suit_night']); }
function getEquip() { return Object.assign({ suit: 'suit_night', weapon: null, pet: null }, pLoad('equip', {})); }
function equipped(id) { const e = getEquip(); return e.suit === id || e.weapon === id || e.pet === id; }
function shopItem(id) { return SHOP.find(i => i.id === id); }

// מה שהנינג'ה לובש ומחזיק עכשיו
function playerSuit() { const it = shopItem(getEquip().suit); return it ? it.suit : null; }
function hasGear(id) { return !!player && equipped(id); }
function kickMul()  { return hasGear('katana') ? 1.5 : 1; }
function throwMul() { return hasGear('goldstar') ? 1.45 : 1; }
function reachMul() { return hasGear('owl') ? 1.6 : 1; }

let dragonUsed = false;   // הדרקון מציל פעם אחת בכל ריצה במסע
function dragonSave() {
  if (mode !== 'journey' || !hasGear('dragon') || dragonUsed) return false;
  dragonUsed = true; sfx('checkpoint');
  banner = { text: '🐉 Dragon saved you!', sub: '', t: 1.6 };
  for (let i = 0; i < 16; i++) burst(PLAYER.x - 6, GROUND - 26, ['#f97316', '#facc15', '#ef4444'][i % 3], 1, 35);
  return true;
}

function buyItem(it) {
  if (it.use) {                                                                  // חד-פעמי: עוד מנה
    if (coinsNow() < it.price) { $('shopMsg').textContent = 'Not enough coins – catch more in the journey!'; return; }
    pStore('coins', coinsNow() - it.price);
    const p = getPowers(); p[it.id] = (p[it.id] || 0) + 1; pStore('powers', p);
    sfx('coin'); speak(it.id); $('shopMsg').textContent = it.icon + ' +1 · say ' + it.id.toUpperCase() + ' in a run to use it'; renderShop(); return;
  }
  const owned = getOwned();
  if (owned.includes(it.id)) return;
  if (coinsNow() < it.price) { $('shopMsg').textContent = 'Not enough coins – catch more in the journey!'; return; }
  pStore('coins', coinsNow() - it.price);
  pStore('owned', [...owned, it.id]);
  sfx('coin'); confetti();
  equipItem(it);
}
function equipItem(it) {
  const e = getEquip();
  if (it.cat !== 'suit' && e[it.cat] === it.id) e[it.cat] = null;   // לחיצה שנייה מורידה נשק / חבר
  else e[it.cat] = it.id;
  pStore('equip', e);
  renderShop();
}

let shopCat = 'suit';
function openShop() {
  hideAllOverlays();
  $('shopMsg').textContent = '';
  renderShop();
  $('shop').classList.add('show');
}
function renderShop() {
  $('shopCoins').textContent = isTester() ? '∞' : coinsNow();
  $('shopTabs').innerHTML = SHOP_CATS.map(([c, t]) => '<button class="sbTab' + (c === shopCat ? ' sel' : '') + '" data-c="' + c + '">' + t + '</button>').join('');
  $('shopTabs').querySelectorAll('button').forEach(b => b.onclick = () => { shopCat = b.dataset.c; $('shopMsg').textContent = ''; renderShop(); });
  const owned = getOwned(), grid = $('shopGrid'), col = player ? player.color : '#dc2626';
  grid.innerHTML = '';
  SHOP.filter(it => it.cat === shopCat).forEach(it => {
    const has = owned.includes(it.id), on = equipped(it.id);
    const d = document.createElement('div');
    d.className = 'shopItem' + (on ? ' on' : '');
    const pic = it.cat === 'suit' ? ninjaIcon(col, it.swatch) : '<span class="shopIc">' + it.icon + '</span>';
    d.innerHTML = '<div class="shopPic">' + pic + '</div><div class="shopName">' + it.name + '</div>' +
                  (it.desc ? '<div class="shopDesc">' + it.desc + '</div>' : '') + '<button class="shopBtn"></button>';
    const b = d.querySelector('button');
    if (it.use) {                                                              // חד-פעמי: כמה יש, וכפתור לקנות עוד
      const n = powerCount(it.id), locked = !isTester() && getStation() < (it.at || 0);
      d.insertBefore(Object.assign(document.createElement('div'), { className: 'shopCount', textContent: 'You have: ' + (n === Infinity ? '∞' : n) }), b);
      if (locked) { b.textContent = '🔒 Station ' + it.at; b.className = 'shopBtn lock'; d.classList.add('locked'); }
      else { b.innerHTML = '+1 · <span class="coinIco"></span> ' + it.price; b.className = 'shopBtn buy' + (coinsNow() < it.price ? ' poor' : ''); b.onclick = () => buyItem(it); }
      grid.appendChild(d); return;
    }
    const locked = !has && !isTester() && getStation() < (it.at || 0);
    if (locked) { b.textContent = '🔒 Station ' + it.at; b.className = 'shopBtn lock'; d.classList.add('locked'); }
    else if (!has) { b.innerHTML = '<span class="coinIco"></span> ' + it.price; b.className = 'shopBtn buy' + (coinsNow() < it.price ? ' poor' : ''); b.onclick = () => buyItem(it); }
    else if (on) { b.textContent = it.cat === 'suit' ? '✓ Wearing' : '✓ Equipped · tap to remove'; b.className = 'shopBtn eq'; b.onclick = () => equipItem(it); }
    else { b.textContent = it.cat === 'suit' ? 'Wear' : 'Equip'; b.className = 'shopBtn use'; b.onclick = () => equipItem(it); }
    grid.appendChild(d);
  });
}
$('shopBtn').onclick = openShop;
$('shopBack').onclick = () => { hideAllOverlays(); toMenu(); };

/* ---------- ציור הציוד בריצה ---------- */
// קטאנה על הגב – מצוירת לפני הנינג'ה, לפי אותה תנוחה, כדי שתהיה מאחורי הגוף
function drawKatana(fx, fy, P) {
  const J = figureJoints(P), up = J.up, fw = J.fw;
  const pt = (o, a, b) => [o[0] + fw[0] * a + up[0] * b, o[1] + fw[1] * a + up[1] * b];
  const top = pt(J.neck, -4.6, 5.6), guard = pt(J.neck, -2.6, 2.4), bot = pt(J.hip, -3.4, -3.2);   // באלכסון: ידית מעל הכתף, להב עד מתחת לירך
  ctx.save(); ctx.translate(fx, fy + (P.bob || 0)); ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(guard[0], guard[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();   // נדן שחור
  ctx.fillStyle = '#facc15'; circle(bot[0], bot[1], 0.7);                                                         // קצה זהוב
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(guard[0], guard[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();   // ידית לבנה
  ctx.strokeStyle = playerColor(); ctx.lineWidth = 0.5;                                                           // ליפוף בצבע השחקן
  for (let k = 0.25; k < 1; k += 0.25) { const q = [guard[0] + (top[0] - guard[0]) * k, guard[1] + (top[1] - guard[1]) * k]; ctx.beginPath(); ctx.moveTo(q[0] - 0.5, q[1] - 0.4); ctx.lineTo(q[0] + 0.5, q[1] + 0.4); ctx.stroke(); }
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(guard[0], guard[1], 1.2, 0.55, Math.atan2(top[1] - guard[1], top[0] - guard[0]) + Math.PI / 2, 0, Math.PI * 2); ctx.fill();   // מגן
  ctx.restore();
}

// החבר שמלווה את הנינג'ה – דרקון קטן או ינשוף, עף מאחוריו
let petX = 0, petY = 0;
function drawPet(fx, fy) {
  const pet = getEquip().pet; if (!pet || !player) return;
  const now = performance.now() / 1000;
  const tx = fx - 10, ty = Math.min(fy, GROUND) - 22 + Math.sin(now * 3) * 1.4;
  if (!petX) { petX = tx; petY = ty; }
  petX += (tx - petX) * 0.15; petY += (ty - petY) * 0.15;
  const flap = Math.sin(now * 14);
  ctx.save(); ctx.translate(petX, petY);
  if (pet === 'dragon') {
    if (dragonUsed) ctx.globalAlpha = 0.55;                                        // כבר הציל בריצה הזאת
    ctx.fillStyle = '#7c3aed';                                                     // כנפיים
    ctx.beginPath(); ctx.moveTo(-0.5, -1); ctx.lineTo(-3.5, -4.5 - flap * 2.2); ctx.lineTo(1.5, -2); ctx.fill();
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';      // זנב
    ctx.beginPath(); ctx.moveTo(-2.5, 0.5); ctx.quadraticCurveTo(-5.5, 2.5, -6.5, -0.5); ctx.stroke();
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-6.5, -0.5); ctx.lineTo(-7.6, -1.6); ctx.lineTo(-6.0, -1.4); ctx.fill();
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2, -0.1, 0, Math.PI * 2); ctx.fill();   // גוף
    ctx.fillStyle = '#bbf7d0'; ctx.beginPath(); ctx.ellipse(0.6, 0.8, 1.8, 0.9, 0, 0, Math.PI * 2); ctx.fill();   // בטן
    ctx.fillStyle = '#22c55e'; circle(3, -1.6, 1.8);                                // ראש
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(2.2, -3.1); ctx.lineTo(2.0, -4.4); ctx.lineTo(2.9, -3.3); ctx.fill();   // קרניים
    ctx.beginPath(); ctx.moveTo(3.4, -3.3); ctx.lineTo(3.6, -4.6); ctx.lineTo(4.1, -3.2); ctx.fill();
    ctx.fillStyle = '#fff'; circle(3.6, -1.9, 0.7); ctx.fillStyle = '#111'; circle(3.8, -1.9, 0.38);   // עין
    if (!dragonUsed && Math.random() < 0.06) particles.push({ x: petX + 4.8, y: petY - 1.2, vx: 14, vy: -2, g: -3, life: 0.35, color: '#fb923c', size: 0.7 });   // ניצוץ אש קטן
  } else if (pet === 'owl') {
    ctx.fillStyle = '#92400e';                                                     // כנפיים
    ctx.beginPath(); ctx.ellipse(-2.6, 0, 1.2, 2.6 + flap * 0.6, 0.5 + flap * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.6, 0, 1.2, 2.6 - flap * 0.6, -0.5 - flap * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();   // גוף
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(0, 1.1, 1.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();   // בטן
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(-2.2, -2.4); ctx.lineTo(-2.0, -4); ctx.lineTo(-0.8, -2.8); ctx.fill();   // אוזניים
    ctx.beginPath(); ctx.moveTo(2.2, -2.4); ctx.lineTo(2.0, -4); ctx.lineTo(0.8, -2.8); ctx.fill();
    ctx.fillStyle = '#fff'; circle(-1, -1.3, 1.05); circle(1, -1.3, 1.05);         // עיניים גדולות
    ctx.fillStyle = '#111'; circle(-0.8, -1.3, 0.55); circle(1.2, -1.3, 0.55);
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(-0.4, -0.5); ctx.lineTo(0.4, -0.5); ctx.lineTo(0, 0.4); ctx.fill();   // מקור
  }
  ctx.restore();
}
