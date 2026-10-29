/* ninja-voice-game – power.js
   פריטים חד-פעמיים מהחנות (Power-ups). קונים מנות, וכל שימוש מוריד אחת.
   SHIELD – בועה שקופה סביב הנינג'ה שסופגת את הפגיעה הבאה (הבועה מתפוצצת, בלי לאבד לב).
   JET    – תרמיל סילון: הנינג'ה ממריא ועף מעל כל המכשולים 5 שניות, עם טיימר מעל הראש.
            ליד שלב מיוחד (חבל, דרקון, שלד, טורנדו, סוחר) הוא נוחת לבד, ואי אפשר להפעיל אותו שם.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const POWER_WORDS = ['shield', 'jet'];
const JET = { time: 5, alt: 30, rise: 3.5, land: 0.45, guard: 75 };
const SPECIAL_TYPES = ['chasm', 'dragon', 'duel', 'gust', 'door'];
let shieldOn = false, shieldPop = 0, jetT = 0, jetGrace = 0, jetPh = 0;

function getPowers() { return Object.assign({ shield: 0, jet: 0 }, pLoad('powers', {})); }
function powerCount(id) { return isTester() ? Infinity : (getPowers()[id] || 0); }
function usePower(id) {
  if (isTester()) return true;
  const p = getPowers(); if (!(p[id] > 0)) return false;
  p[id]--; pStore('powers', p); return true;
}
function powerWordsOwned() { return POWER_WORDS.filter(w => powerCount(w) > 0); }
function resetPowers() { shieldOn = false; shieldPop = 0; jetT = 0; jetGrace = 0; }

function specialNear(range) {                                                   // שלב מיוחד קרוב / פעיל – לא עפים לידו
  if ((rope && rope.phase !== 'done') || (ride && ride.phase !== 'leave') || duel || gust || (merchant && merchant.phase !== 'done')) return true;
  const pb = playerBox();
  return obstacles.some(o => SPECIAL_TYPES.includes(o.type) && !o.passed && o.x - pb.r < range && o.x + (o.w || 10) > pb.l - 10);
}

// SHIELD: מפעילים את הבועה (אם יש מנה ואין כבר בועה)
function shieldCmd() {
  if (shieldOn) return;
  if (!usePower('shield')) { flash = { text: '🫧 0 – Shop!', t: 1 }; return; }
  shieldOn = true; sfx('coin'); renderPowerHud();
  for (let i = 0; i < 14; i++) particles.push({ x: PLAYER.x + 4 + Math.cos(i) * 9, y: GROUND - py - 7 + Math.sin(i) * 9, vx: -Math.cos(i) * 12, vy: -Math.sin(i) * 12, g: 0, life: 0.35, color: '#bae6fd', size: 1 });
}
// נקרא כשהנינג'ה עומד להיפגע. מחזיר true אם הבועה ספגה את הפגיעה
function shieldSave() {
  if (!shieldOn) return false;
  shieldOn = false; shieldPop = 0.35; sfx('pop'); renderPowerHud();
  const cx = PLAYER.x + 4, cy = GROUND - py - 7;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; particles.push({ x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 9, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, g: 20, life: 0.5, color: i % 2 ? '#e0f2fe' : '#7dd3fc', size: 1.1 }); }
  banner = { text: '🫧 Shield saved you!', sub: '', t: 1.2 };
  return true;
}

// JET: ממריאים לחמש שניות
function jetCmd() {
  if (jetT > 0) return;
  if (specialNear(JET.guard)) { flash = { text: '🚀 Not here!', t: 0.9 }; return; }
  if (!usePower('jet')) { flash = { text: '🚀 0 – Shop!', t: 1 }; return; }
  jetT = JET.time; duckT = 0; flyT = 0; sfx('jump'); renderPowerHud();
}
// פיזיקה בזמן הטיסה (נקרא מ-update). מחזיר true אם הסילון שולט בגובה
function jetPhysics(dt) {
  if (jetGrace > 0) jetGrace -= dt;
  if (jetT <= 0) return false;
  jetT -= dt; jetPh += dt;
  if (specialNear(JET.guard)) jetT = Math.min(jetT, 0.01);                       // שלב מיוחד באופק – נוחתים
  if (jetT <= 0) { jetT = 0; jetGrace = JET.land + 0.6; vy = 0; return false; } // מכאן הכבידה מורידה אותו, ועוד רגע חסינות בנחיתה
  const target = JET.alt + Math.sin(jetPh * 3) * 1.2;
  py += (target - py) * Math.min(1, dt * JET.rise); vy = 0; duckT = 0; flyT = 0;
  if (Math.random() < 0.8) particles.push({ x: PLAYER.x + 0.5 + (Math.random() - 0.5), y: GROUND - py - 2, vx: -6 + Math.random() * 4, vy: 22 + Math.random() * 10, g: 0, life: 0.3, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', size: 1 + Math.random() * 0.6 });
  return true;
}
function jetSafe() { return jetT > 0 || jetGrace > 0; }                          // באוויר עם הסילון (ורגע אחרי) – אין פגיעות

/* ---------- ציור ---------- */
function drawPowerBack(fx, fy, P) {                                             // תרמיל הסילון על הגב – לפני הדמות
  if (jetT <= 0) return;
  const J = figureJoints(P), up = J.up, fw = J.fw;
  const at = (p, f, u) => [fx + p[0] + fw[0] * f + up[0] * u, fy + (P.bob || 0) + p[1] + fw[1] * f + up[1] * u];
  const top = at(J.neck, -2.6, -0.4), bot = at(J.waist, -2.6, -1.6);
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(top[0] - 0.5, top[1]); ctx.lineTo(bot[0] - 0.5, bot[1]); ctx.stroke();
  ctx.fillStyle = '#dc2626'; circle(top[0], top[1], 1.1);
  const f = 2.5 + Math.sin(performance.now() / 40) * 0.8;                       // להבה מתחת
  ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(bot[0] - 1.1, bot[1]); ctx.lineTo(bot[0] + 1.1, bot[1]); ctx.lineTo(bot[0], bot[1] + f + 1.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(bot[0] - 0.6, bot[1]); ctx.lineTo(bot[0] + 0.6, bot[1]); ctx.lineTo(bot[0], bot[1] + f * 0.6 + 0.8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawPowerFront(fx, fy) {                                               // בועה סביב הנינג'ה, וטיימר מעל הראש בזמן טיסה
  const now = performance.now() / 1000, cy = fy - 7.5;
  if (shieldOn || shieldPop > 0) {
    const pop = shieldPop > 0 ? 1 + (0.35 - shieldPop) * 2 : 1, a = shieldPop > 0 ? shieldPop / 0.35 : 1, r = 10 * pop + Math.sin(now * 3) * 0.3;
    ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(fx - 3, cy - 4, 1, fx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(0.75, 'rgba(186,230,253,.18)'); g.addColorStop(1, 'rgba(125,211,252,.55)');
    ctx.fillStyle = g; circle(fx, cy, r);
    ctx.strokeStyle = 'rgba(224,242,254,.9)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(fx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(fx, cy, r - 1.6, Math.PI * 1.1 + Math.sin(now) * 0.1, Math.PI * 1.45); ctx.stroke();   // ברק
    const hue = (now * 60) % 360; ctx.strokeStyle = 'hsla(' + hue + ',90%,75%,.35)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(fx, cy, r - 0.4, now % (Math.PI * 2), now % (Math.PI * 2) + 1.2); ctx.stroke();   // צבעי בועת סבון
    ctx.restore();
  }
  if (jetT > 0) {                                                               // טיימר: פס שמתרוקן
    const k = jetT / JET.time, w = 12, y = fy - 22;
    ctx.fillStyle = 'rgba(15,23,42,.55)'; roundRect(fx - w / 2 - 0.6, y - 0.6, w + 1.2, 2.6, 1.2); ctx.fill();
    ctx.fillStyle = k > 0.3 ? '#fb923c' : (Math.floor(now * 8) % 2 ? '#ef4444' : '#fca5a5'); roundRect(fx - w / 2, y, w * k, 1.4, 0.7); ctx.fill();
    ctx.font = '900 3px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🚀 ' + Math.ceil(jetT), fx, y - 1.4);
  }
}
function powerTick(dt) { if (shieldPop > 0) shieldPop = Math.max(0, shieldPop - dt); }
function jetPose(P) {                                                           // עף קדימה, רגליים מאחור
  if (jetT <= 0) return P;
  const A = poseAir(false); A.lean = 0.55; A.legs = [[-0.55, -0.9], [-0.25, -0.6]]; A.arms = [[-1.2, -0.9], [1.3, 1.9]]; A.eyes = 'squint';
  return A;
}

// מונה קטן בפינה: כמה מגינים ותרמילים יש (ומה פעיל עכשיו)
function renderPowerHud() {
  const box = $('powerHud'); if (!box) return;
  const playing = state === 'play' || state === 'paused';
  const items = POWER_WORDS.map(w => [w, powerCount(w)]).filter(([w, n]) => n > 0 || (w === 'shield' && shieldOn) || (w === 'jet' && jetT > 0));
  box.classList.toggle('hide', !playing || !items.length);
  box.innerHTML = items.map(([w, n]) => '<span class="pw' + ((w === 'shield' && shieldOn) || (w === 'jet' && jetT > 0) ? ' on' : '') + '">' +
    (w === 'shield' ? '🫧' : '🚀') + ' <b>' + w.toUpperCase() + '</b> ' + (n === Infinity ? '∞' : n) + '</span>').join('');
}
