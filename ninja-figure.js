/* ============================================================
   ninja-figure.js – ציור הדמויות (נינג'ה, אויב, שומר) והתנוחות שלהן.
   משותף למשחק (ninja-voice-game.html) ולעורך (animator.html),
   כך שמה שרואים בעורך זה בדיוק מה שמופיע במשחק.

   כל מה שאפשר לשנות בעורך נמצא ב-RIG:
   colors  – צבעים לכל דמות
   shape   – אורכים ועוביים של האיברים
   run     – פרמטרים של מחזור הריצה
   offsets – תיקוני זווית לכל תנועה (ברדיאנים), שנוספים על התנוחה הבסיסית
   ההגדרות נשמרות ב-iPad (localStorage) ונטענות אוטומטית גם במשחק.
   ============================================================ */

const RIG_KEY = 'ninjaVoice_rig';

const RIG_DEFAULT = {
  colors: {
    ninja: { body: '#1e293b', back: '#0b1220', front: '#3b4a63', edge: '#05080f', skin: '#fcd9b6', eyes: '#000000',
             outline: '#ffffff', outlineAlpha: 0.6, accent: '' },          // accent ריק = צבע השחקן
    enemy: { body: '#7f1d1d', back: '#5b1313', front: '#a52a2a', edge: '#3b0a0a', skin: '#fcd9b6', eyes: '#000000',
             outline: '#ffffff', outlineAlpha: 0.45, accent: '#facc15' },
    guard: { body: '#334155', back: '#1e293b', front: '#475569', edge: '#0f172a', skin: '#fcd9b6', eyes: '#000000',
             outline: '#ffffff', outlineAlpha: 0.45, accent: '#94a3b8' }
  },
  shape: {
    thigh: 2.5, shin: 2.4, upper: 2.7, fore: 2.5,       // אורכי איברים
    torso: 3.4, shoulderAt: 0.8, headUp: 2.6, headR: 3.0,
    bodyW: 4.2, armW: 1.7, legW: 2.1,                   // עוביים
    outlineW: 0.9, edgeW: 0.8, handR: 0.95
  },
  run: { legSwing: 0.85, kneeBend: 1.0, armSwing: 1.15, elbowBend: 1.55, lean: 0.18, bob: 0.6, cadence: 1.0 },
  offsets: {}   // { run: { lean, hipY, head, legB:[ירך,ברך], legF:[...], armB:[כתף,מרפק], armF:[...] }, kick: {...}, ... }
};

const MOVES = ['idle', 'run', 'jump', 'duck', 'fly', 'swim', 'climb', 'push', 'pull', 'kick', 'throw', 'catch', 'block', 'stop'];

function rigClone(o) { return JSON.parse(JSON.stringify(o)); }
// מיזוג עמוק: שדות חדשים שנוספו בעתיד מקבלים ערך ברירת מחדל
function rigMerge(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (def && typeof def === 'object') {
    const out = {};
    for (const k of Object.keys(def)) out[k] = rigMerge(def[k], val ? val[k] : undefined);
    if (val && typeof val === 'object') for (const k of Object.keys(val)) if (!(k in out)) out[k] = val[k];
    return out;
  }
  return val === undefined || val === null ? def : val;
}
function loadRig() {
  try { const v = localStorage.getItem(RIG_KEY); return rigMerge(RIG_DEFAULT, v ? JSON.parse(v) : {}); }
  catch (e) { return rigClone(RIG_DEFAULT); }
}
function saveRig(r) { try { localStorage.setItem(RIG_KEY, JSON.stringify(r)); } catch (e) {} }
function resetRig() { try { localStorage.removeItem(RIG_KEY); } catch (e) {} RIG = rigClone(RIG_DEFAULT); }

let RIG = loadRig();
// כשהעורך שומר בלשונית אחרת – המשחק מתעדכן מיד
window.addEventListener('storage', e => { if (e.key === RIG_KEY) RIG = loadRig(); });

/* ---------- עזרים ---------- */
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function lerp(a, b, k) { return a + (b - a) * k; }
function endOf(x, y, a, len) { return [x + Math.sin(a) * len, y + Math.cos(a) * len]; }
function hexA(hex, a) {
  const h = (hex || '#ffffff').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// תיקוני הזווית מהעורך – מתווספים לתנוחה
function tune(name, P) {
  const o = RIG.offsets[name];
  if (!o) return P;
  const add = (arr, d) => d ? [arr[0] + (d[0] || 0), arr[1] + (d[1] || 0)] : arr;
  P.lean += o.lean || 0;
  P.hipY += o.hipY || 0;
  P.headTilt = (P.headTilt || 0) + (o.head || 0);
  P.legs = [add(P.legs[0], o.legB), add(P.legs[1], o.legF)];
  P.arms = [add(P.arms[0], o.armB), add(P.arms[1], o.armF)];
  return P;
}

/* ---------- תנוחות ----------
   זוויות נמדדות מ"ישר למטה"; זווית חיובית = קדימה (לכיוון שאליו הדמות פונה).
   legs/arms = [אחורי, קדמי], וכל אחד [ירך/כתף, ברך/מרפק]. */
function poseIdle(now) {
  const br = Math.sin(now * 2.5);
  return tune('idle', { hipY: -4.6, torso: RIG.shape.torso, lean: 0.05, bob: br * 0.15, legs: [[-0.15, -0.1], [0.18, 0.12]], arms: [[-0.2, 0.25], [0.25, 0.7]] });
}
function poseRun(p) {
  const R = RIG.run;
  const leg = q => { const s = Math.sin(q), t = R.legSwing * s; return [t, t - R.kneeBend * Math.max(0, Math.sin(q - 1.3))]; };
  const arm = q => { const u = -R.armSwing * Math.sin(q); return [u, u + R.elbowBend]; };   // מרפק כפוף, אמה קדימה
  return tune('run', { hipY: -4.6, torso: RIG.shape.torso, lean: R.lean, bob: -Math.abs(Math.cos(p)) * R.bob,
                       legs: [leg(p + Math.PI), leg(p)], arms: [arm(p), arm(p + Math.PI)] });
}
function poseAir(rising) {
  return tune('jump', { hipY: -4.6, torso: RIG.shape.torso, lean: 0.12, bob: 0, legs: [[0.5, -0.8], [1.35, 0.15]],
                        arms: rising ? [[-2.0, -2.4], [1.9, 2.4]] : [[-1.5, -1.9], [1.4, 1.9]] });   // ידיים פרושות קדימה ואחורה
}
function poseDuck() {   // גלישה על הקרקע, רגליים קדימה, גוף נוטה אחורה
  return tune('duck', { hipY: -1.7, torso: RIG.shape.torso - 0.2, lean: -0.95, bob: 0, legs: [[1.0, -0.5], [1.48, 1.55]], arms: [[-0.55, -0.25], [1.25, 1.7]], headTilt: 0.5 });
}
function poseFly(now) {
  const sw = Math.sin(now * 3) * 0.15;
  return tune('fly', { hipY: -4.6, torso: RIG.shape.torso, lean: 0.05, bob: 0, legs: [[-0.3 + sw, -0.15 + sw], [0.05 + sw, 0.2 + sw]], arms: [[2.3, 2.6], [2.55, 2.8]] });
}
function poseSwim(t) {          // שוחה: גוף אופקי, ידיים בתנועה סיבובית, רגליים מנפנפות
  const a = t * 7, f = Math.sin(t * 12) * 0.35;
  return tune('swim', { hipY: -2.4, torso: RIG.shape.torso, lean: 1.45, bob: Math.sin(t * 7) * 0.3, headTilt: -1.1,
                        legs: [[-1.55 + f, -1.6 + f], [-1.55 - f, -1.6 - f]], arms: [[a, a + 0.4], [a + Math.PI, a + Math.PI + 0.4]] });
}
function poseClimb(t) {         // מטפס: ידיים למעלה לסירוגין, ברכיים מתכופפות
  const s = Math.sin(t * 10);
  return tune('climb', { hipY: -4.6, torso: RIG.shape.torso, lean: 0.15, bob: 0, legs: [[0.9 + 0.45 * s, -0.3], [0.9 - 0.45 * s, -0.3]], arms: [[2.7 + 0.35 * s, 2.95], [2.7 - 0.35 * s, 2.95]] });
}
function posePush() {           // דוחף: נוטה קדימה, שתי ידיים ישרות, רגל אחורית נמתחת
  return tune('push', { hipY: -4.2, torso: RIG.shape.torso, lean: 0.75, bob: 0, legs: [[-0.7, -0.5], [0.55, 0.1]], arms: [[1.45, 1.55], [1.55, 1.6]], openHand: true });
}
function posePull(t) {          // מושך: נוטה אחורה, ידיים קדימה על החבל
  const tug = Math.sin(t * 14) * 0.1;
  return tune('pull', { hipY: -4.4, torso: RIG.shape.torso, lean: -0.5 + tug, bob: 0, legs: [[-0.15, 0.05], [0.6, 0.35]], arms: [[1.35, 1.5], [1.25, 1.45]] });
}

// תוספות על תנוחה קיימת (k = התקדמות הפעולה 0→1)
function applyKick(P, k) {
  // 0–0.2: מקפלים ברך למעלה · 0.2–0.75: רגל נשלחת ישר קדימה · אחר כך חוזרת
  let thigh, shin;
  if (k < 0.2) { const e = k / 0.2; thigh = lerp(0.2, 1.65, e); shin = lerp(0.1, -0.2, e); }
  else if (k < 0.75) { const e = Math.min(1, (k - 0.2) / 0.12); thigh = lerp(1.65, 1.8, e); shin = lerp(-0.2, 1.8, e); }
  else { const e = (k - 0.75) / 0.25; thigh = lerp(1.8, 0.3, e); shin = lerp(1.8, 0.1, e); }
  const lean = k < 0.75 ? -0.5 : lerp(-0.5, 0, (k - 0.75) / 0.25);
  P.legs = [[-0.3, 0.05], [thigh, shin]];
  P.lean = lean; P.bob = 0;
  P.arms = [[-1.9, -1.5], [1.2, 2.9]];      // יד אחורית לאיזון, יד קדמית שומרת מול החזה
  P.kickFoot = k >= 0.2 && k < 0.75;
  return tune('kick', P);
}
function applyThrow(P, k) {
  const u = Math.min(1.6, -2.4 + k * 5);                    // יד מאחור-למעלה → קדימה
  P.arms = [[-0.6, -0.2], [u, u - 0.15]]; P.lean = 0.25;
  return tune('throw', P);
}
function applyCatch(P) { P.arms = [[1.75, 1.55], [2.15, 1.9]]; P.openHand = true; P.lean = 0.2; return tune('catch', P); }
function applyBlock(P) { P.arms = [[-0.4, 0.2], [1.25, 2.3]]; P.shield = true; P.lean = 0.1; return tune('block', P); }
function applyStop(P)  { P.arms = [P.arms[0], [1.55, 1.85]]; P.openHand = true; return tune('stop', P); }   // יד מורמת: "עצור!"

/* ---------- ציור הדמות ----------
   F = { fx, fy, facing, scale, kind: 'ninja'|'enemy'|'guard', accent, pose, skeleton }
   שלד: ירך → צוואר (גוף). הכתף על הגוף מתחת לצוואר, והראש מעל הצוואר. */
function figureJoints(P) {
  const S = RIG.shape;
  const along = (o, d) => [o[0] + Math.sin(P.lean) * d, o[1] - Math.cos(P.lean) * d];
  const hip = [0, P.hipY];
  const torso = P.torso || S.torso;
  const neck = along(hip, torso);
  const sh = along(hip, torso * S.shoulderAt);
  const head = along(neck, S.headUp);
  return { hip, neck, sh, head };
}

function drawFigure(F) {
  const P = F.pose, S = RIG.shape, now = performance.now() / 1000;
  const C = RIG.colors[F.kind || 'ninja'] || RIG.colors.ninja;
  const accent = C.accent || F.accent || '#dc2626';
  const outline = hexA(C.outline, C.outlineAlpha);
  ctx.save();
  ctx.translate(F.fx, F.fy + (P.bob || 0) * F.scale);
  ctx.scale(F.facing * F.scale, F.scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const { hip, neck, sh, head } = figureJoints(P);
  const pts = {};

  const limb = (o, a, l1, l2, lw, col, name) => {
    const k = endOf(o[0], o[1], a[0], l1), e = endOf(k[0], k[1], a[1], l2);
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    if (name) pts[name] = [o, k, e];
    return e;
  };
  const paint = (isOutline) => {
    const ex = isOutline ? S.outlineW : 0;
    const col = c => isOutline ? outline : c;
    if (isOutline && S.outlineW <= 0) return;
    // שכבה אחורית: רגל ויד רחוקות
    limb(hip, P.legs[0], S.thigh, S.shin, S.legW + ex, col(C.back), 'legB');
    const handB = limb(sh, P.arms[0], S.upper, S.fore, S.armW + ex, col(C.back), 'armB');
    if (!isOutline) { ctx.fillStyle = accent; circle(handB[0], handB[1], S.handR); }
    // גוף וראש
    ctx.strokeStyle = col(C.body); ctx.lineWidth = S.bodyW + ex;
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(neck[0], neck[1]); ctx.stroke();
    ctx.fillStyle = col(C.body); circle(head[0], head[1], S.headR + ex / 2);
    // שכבה קדמית: קו כהה מפריד ואז הרגל והיד הקרובות – מעל הגוף
    if (!isOutline && S.edgeW > 0) {
      limb(hip, P.legs[1], S.thigh, S.shin, S.legW + S.edgeW, C.edge);
      limb(sh, P.arms[1], S.upper, S.fore, S.armW + S.edgeW, C.edge);
    }
    const foot = limb(hip, P.legs[1], S.thigh, S.shin, S.legW + ex, col(C.front), 'legF');
    const hand = limb(sh, P.arms[1], S.upper, S.fore, S.armW + ex, col(C.front), 'armF');
    if (!isOutline) {
      if (P.kickFoot) { ctx.fillStyle = accent; circle(foot[0], foot[1], 1.35); }
      // כפפה בצבע הדמות – רואים בדיוק איפה היד נגמרת (גדולה ופתוחה בתפיסה)
      ctx.fillStyle = C.edge; circle(hand[0], hand[1], (P.openHand ? 1.6 : 1.25) * S.handR / 0.95);
      ctx.fillStyle = accent; circle(hand[0], hand[1], (P.openHand ? 1.25 : 0.95) * S.handR / 0.95);
      if (P.shield) {                                     // מגן עגול ביד הקדמית
        ctx.fillStyle = accent; circle(hand[0] + 0.8, hand[1], 4.4);
        ctx.fillStyle = '#92400e'; circle(hand[0] + 0.8, hand[1], 3.7);
        ctx.fillStyle = '#d6d3d1'; circle(hand[0] + 0.8, hand[1], 1.2);
      }
    }
  };
  paint(true); paint(false);

  // חגורה
  ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(P.lean);
  ctx.fillStyle = accent; ctx.fillRect(-S.bodyW * 0.52, -1.3, S.bodyW * 1.05, 1.1);
  ctx.restore();
  // פנים, עיניים, סרט ראש עם זנבות מתנופפים
  const hs = S.headR / 3;
  ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(P.lean + (P.headTilt || 0)); ctx.scale(hs, hs);
  ctx.fillStyle = C.skin; roundRect(-1.7, -0.85, 4.6, 1.8, 0.6); ctx.fill();
  ctx.fillStyle = C.eyes; ctx.fillRect(0.4, -0.45, 0.8, 0.9); ctx.fillRect(1.9, -0.45, 0.8, 0.9);
  ctx.fillStyle = accent; ctx.fillRect(-2.9, -2.3, 5.7, 0.95);
  const wv = Math.sin(now * 11 + F.fx) * 0.9;
  ctx.strokeStyle = accent; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-2.8, -1.8); ctx.quadraticCurveTo(-4.8, -2.1 + wv, -6.8, -1.3 - wv); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.8, -1.8); ctx.quadraticCurveTo(-4.4, -0.9 + wv, -6.1, 0.3 + wv * 0.6); ctx.stroke();
  ctx.restore();

  // מצב בדיקה: מציגים את השלד והמפרקים
  if (F.skeleton) {
    ctx.lineWidth = 0.25; ctx.strokeStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(neck[0], neck[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
    for (const [n, [a, k, e]] of Object.entries(pts)) {
      ctx.strokeStyle = n.endsWith('F') ? '#22c55e' : '#f59e0b';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; [a, k, e].forEach(q => circle(q[0], q[1], 0.35));
    }
    ctx.fillStyle = '#ef4444'; [hip, neck, sh, head].forEach(q => circle(q[0], q[1], 0.4));
  }
  ctx.restore();
}

// התנוחה של כל "תנועה" לפי זמן – משמש את העורך ואת מעבדת האנימציות
function movePose(move, t) {
  const L = { jumpV: 80, gravity: 160 }, air = 2 * L.jumpV / L.gravity;
  let P, lift = 0;
  switch (move) {
    case 'run':   P = poseRun(t * 21 * RIG.run.cadence); break;
    case 'idle':  P = poseIdle(t); break;
    case 'jump': { const c = t % (air + 0.6);
      if (c < air) { lift = L.jumpV * c - L.gravity * c * c / 2; P = poseAir(L.jumpV - L.gravity * c > 0); } else P = poseIdle(t); break; }
    case 'duck':  P = poseDuck(); break;
    case 'fly':   P = poseFly(t); lift = 12; break;
    case 'swim':  P = poseSwim(t); break;
    case 'climb': P = poseClimb(t); break;
    case 'push':  P = posePush(); break;
    case 'pull':  P = posePull(t); break;
    case 'kick':  { const c = t % 1.2; P = poseIdle(t); if (c < 0.5) applyKick(P, c / 0.5); break; }
    case 'throw': { const c = t % 1.0; P = poseIdle(t); if (c < 0.25) applyThrow(P, c / 0.25); break; }
    case 'catch': { const c = t % 1.2; P = poseIdle(t); if (c < 0.4) applyCatch(P); break; }
    case 'block': { const c = t % 1.6; P = poseIdle(t); if (c < 0.8) applyBlock(P); break; }
    case 'stop':  { const c = t % 1.6; P = poseIdle(t); if (c < 0.8) applyStop(P); break; }
    default: P = poseIdle(t);
  }
  return { P, lift };
}
