/* ninja-voice-game – skeleton.js
   האויב של FIGHT: לוחם שלד. משתמש באותו שלד תנועה כמו הנינג'ה (figureJoints + תנוחות), עם "עור" של עצמות:
   עצמות שנהב, צלעות, גולגולת עם עיניים זוהרות, קסדה חלודה, צעיף אדום קרוע וחרב חלודה.
   כשהוא מפסיד – מתפרק לערימת עצמות, והגולגולת מתגלגלת משם.
   נטען אחרי fight.js. */

const BONE = { front: '#f3ecdc', back: '#cbbfa3', shade: 'rgba(120,100,70,.35)', eye: '#fb923c', helm: '#6b5f55', helmHi: '#8a7c70', rust: '#9a5b2e', scarf: '#b91c1c' };

// מצייר עצם: גליל עם "כפתור" עגול בכל קצה
function boneSeg(a, b, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.fillStyle = col; circle(a[0], a[1], w * 0.62); circle(b[0], b[1], w * 0.62);
}

function drawSkeletonFig(fx, fy, facing, scale, P) {
  const S = RIG.shape, now = performance.now() / 1000;
  ctx.save();
  ctx.translate(fx, fy + (P.bob || 0) * scale); ctx.scale(facing * scale, scale);
  const J = figureJoints(P), up = J.up, fw = J.fw;
  const seg = (o, a, l1, l2) => { const k = endOf(o[0], o[1], a[0], l1); return [o, k, endOf(k[0], k[1], a[1], l2)]; };
  const legB = seg(J.hipB, P.legs[0], S.thigh, S.shin), legF = seg(J.hipF, P.legs[1], S.thigh, S.shin);
  const armB = seg(J.shB, P.arms[0], S.upper, S.fore), armF = seg(J.shF, P.arms[1], S.upper, S.fore);
  const limb = (q, col, w) => { boneSeg(q[0], q[1], w, col); boneSeg(q[1], q[2], w * 0.85, col); };
  const at = (p, f, u) => [p[0] + fw[0] * f + up[0] * u, p[1] + fw[1] * f + up[1] * u];

  // צעיף אדום קרוע מאחור – מתנופף
  const nk = at(J.neck, -0.3, -0.4), wv = Math.sin(now * 9) * 0.6;
  ctx.fillStyle = BONE.scarf; ctx.beginPath(); ctx.moveTo(nk[0], nk[1]);
  ctx.quadraticCurveTo(nk[0] - 3.5, nk[1] + 0.5 + wv, nk[0] - 6.5, nk[1] + 1.8 - wv);
  ctx.lineTo(nk[0] - 5.6, nk[1] + 2.6 - wv); ctx.lineTo(nk[0] - 4.6, nk[1] + 2.0); ctx.lineTo(nk[0] - 3.6, nk[1] + 2.9 + wv * 0.5);
  ctx.quadraticCurveTo(nk[0] - 1.5, nk[1] + 1.6, nk[0] + 0.2, nk[1] + 0.9); ctx.closePath(); ctx.fill();

  limb(legB, BONE.back, 1.05); limb(armB, BONE.back, 0.95);
  ctx.fillStyle = BONE.back; circle(armB[2][0], armB[2][1], 0.75);              // כף יד אחורית

  // אגן
  ctx.save(); ctx.translate(J.hip[0], J.hip[1]); ctx.rotate(P.lean);
  ctx.fillStyle = BONE.front; ctx.beginPath(); ctx.ellipse(0, -0.2, 1.7, 1.05, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BONE.shade; ctx.beginPath(); ctx.ellipse(0.1, 0, 0.75, 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // עמוד שדרה: חוליות מהאגן לצוואר
  for (let k = 0; k <= 5; k++) {
    const q = k / 5, p = q < 0.5 ? [lerp(J.hip[0], J.waist[0], q * 2), lerp(J.hip[1], J.waist[1], q * 2)] : [lerp(J.waist[0], J.neck[0], (q - 0.5) * 2), lerp(J.waist[1], J.neck[1], (q - 0.5) * 2)];
    ctx.fillStyle = BONE.front; circle(p[0], p[1], 0.55);
  }
  // כלוב צלעות: שלוש צלעות מעוקלות קדימה ומטה, ועצם חזה
  ctx.strokeStyle = BONE.front; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const q = 0.35 + k * 0.2, p = [lerp(J.waist[0], J.neck[0], q), lerp(J.waist[1], J.neck[1], q)];
    const c = at(p, 2.4, 0.3), e = at(p, 1.6, -0.7), c2 = at(p, -1.2, 0.2), e2 = at(p, -0.9, -0.6);
    ctx.lineWidth = 0.55 - k * 0.05;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(c2[0], c2[1], e2[0], e2[1]); ctx.stroke();
  }
  const st0 = at([lerp(J.waist[0], J.neck[0], 0.3), lerp(J.waist[1], J.neck[1], 0.3)], 1.7, 0), st1 = at(J.neck, 1.2, -0.5);
  ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(st0[0], st0[1]); ctx.lineTo(st1[0], st1[1]); ctx.stroke();

  // גולגולת עם קסדה
  const headA = J.lean2 + (P.headTilt || 0), hs = S.headR / 3;
  ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(headA); ctx.scale(hs, hs);
  ctx.fillStyle = BONE.front; circle(0, 0, 2.75);                                    // גולגולת
  ctx.beginPath(); ctx.moveTo(-0.2, 1.4); ctx.lineTo(2.9, 1.2); ctx.lineTo(2.7, 3.0); ctx.lineTo(0.3, 3.1); ctx.closePath(); ctx.fill();   // לסת
  ctx.fillStyle = BONE.shade; ctx.fillRect(0.6, 2.05, 2.1, 0.22);                    // קו הפה
  ctx.fillStyle = '#3f3a33'; for (let k = 0; k < 4; k++) ctx.fillRect(0.75 + k * 0.52, 1.75, 0.12, 0.65);   // שיניים
  const glow = P.eyes === 'wide' ? 1.25 : P.eyes === 'squint' ? 0.85 : 1;
  ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(1.35, -0.1, 0.95, 0.85 * glow, 0, 0, Math.PI * 2); ctx.fill();   // ארובת עין
  ctx.fillStyle = 'rgba(251,146,60,.35)'; circle(1.5, -0.05, 0.75 * glow);           // ניצוץ בעין
  ctx.fillStyle = BONE.eye; circle(1.5, -0.05, 0.38 * glow);
  ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(2.55, 0.55); ctx.lineTo(2.25, 1.2); ctx.lineTo(2.85, 1.15); ctx.closePath(); ctx.fill();   // אף
  ctx.fillStyle = BONE.shade; ctx.beginPath(); ctx.ellipse(-1.2, 0.6, 1.0, 0.8, 0, 0, Math.PI * 2); ctx.fill();   // צל בצד האחורי
  // קסדה חלודה: כיפה, שוליים, מסמרות וקרן קטנה
  ctx.fillStyle = BONE.helm; ctx.beginPath(); ctx.arc(0, -0.2, 3.0, Math.PI * 1.05, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = BONE.helmHi; ctx.beginPath(); ctx.arc(-0.3, -0.6, 2.2, Math.PI * 1.2, Math.PI * 1.55); ctx.lineTo(-0.3, -0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = BONE.helm; ctx.fillRect(-3.3, -0.55, 6.6, 0.75);                    // שוליים
  ctx.fillStyle = BONE.rust; circle(-1.8, -0.2, 0.22); circle(0.2, -0.2, 0.22); circle(2.1, -0.2, 0.22); circle(-0.6, -1.9, 0.35);   // מסמרות וחלודה
  ctx.fillStyle = '#d6cbb3'; ctx.beginPath(); ctx.moveTo(-0.6, -3.0); ctx.quadraticCurveTo(-1.6, -4.6, -0.4, -5.4); ctx.quadraticCurveTo(-0.6, -4.2, 0.4, -3.1); ctx.closePath(); ctx.fill();   // קרן
  ctx.restore();

  limb(legF, BONE.front, 1.1); limb(armF, BONE.front, 1.0);
  ctx.restore();
}

// הקצה של היד הקדמית – לחרב (אותו חישוב כמו handAt)
function drawSkeletonEnemy(fx, fy, facing, s, P) {
  drawSkeletonFig(fx, fy, facing, s, P);
  if (P.swordA !== undefined) { const [hx, hy] = handAt(fx, fy, facing, s, P); drawBlade(hx, hy, P.swordA, facing, s, BONE.front, true); }
}

/* ---------- התפרקות: ערימת עצמות וגולגולת מתגלגלת ---------- */
let duelBones = [];
function skeletonBreak(o) {
  const x = o.x, base = GROUND - 8;
  const piece = (kind, dx, dy, len) => duelBones.push({ kind, x: x + dx, y: base + dy, vx: (Math.random() - 0.3) * 30, vy: -25 - Math.random() * 30, a: Math.random() * 6, va: (Math.random() - 0.5) * 18, len, t: 0, rest: false });
  for (let k = 0; k < 8; k++) piece('bone', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8, 2.0 + Math.random() * 1.2);
  piece('ribs', 0, -2, 0); piece('pelvis', 0, 3, 0); piece('helm', 1, -8, 0);
  duelBones.push({ kind: 'skull', x: x + 1, y: GROUND - 16, vx: 8, vy: -40, a: 0, va: 4, t: 0, rest: false });
  burst(x, GROUND - 8, '#f3ecdc', 12, 30);
}
function skeletonBonesUpdate(dt) {
  for (const b of duelBones) {
    b.t += dt;
    const r = b.kind === 'skull' ? 2.6 : 0.6;
    if (b.kind === 'skull' && b.t > 1.1) { b.vx = 55; b.va = b.vx / r; b.rest = false; }   // אחרי רגע – הגולגולת בורחת בגלגול
    if (!b.rest) {
      b.vy += 110 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
      if (b.y >= GROUND - r) {                                                    // נוחת וקופץ קצת
        b.y = GROUND - r;
        if (Math.abs(b.vy) > 12 && b.kind !== 'skull') { b.vy *= -0.35; b.vx *= 0.6; b.va *= 0.5; }
        else if (b.kind === 'skull') { b.vy = b.t > 1.1 ? 0 : b.vy * -0.4; if (Math.abs(b.vy) < 6) b.vy = 0; b.va = b.vx / r; }
        else { b.vy = 0; b.vx = 0; b.va = 0; b.rest = true; }
      }
    }
    b.x -= curSpeed() * dt;                                                       // זזים עם העולם
  }
  duelBones = duelBones.filter(b => b.x > -12 && b.x < W + 20 && b.t < 5);
}
function drawSkeletonBones() {
  for (const b of duelBones) {
    const fade = b.kind === 'skull' ? 1 : Math.max(0, Math.min(1, (5 - b.t) / 1.5));
    ctx.save(); ctx.globalAlpha *= fade; ctx.translate(b.x, b.y); ctx.rotate(b.a);
    if (b.kind === 'bone') boneSeg([-b.len / 2, 0], [b.len / 2, 0], 0.9, BONE.front);
    else if (b.kind === 'ribs') { ctx.strokeStyle = BONE.front; ctx.lineWidth = 0.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, k * 0.9, 1.6 - k * 0.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
    else if (b.kind === 'pelvis') { ctx.fillStyle = BONE.front; ctx.beginPath(); ctx.ellipse(0, 0, 1.7, 1.0, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (b.kind === 'helm') { ctx.fillStyle = BONE.helm; ctx.beginPath(); ctx.arc(0, 0.8, 2.6, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(-2.9, 0.5, 5.8, 0.6); }
    else if (b.kind === 'skull') {
      ctx.fillStyle = BONE.front; circle(0, 0, 2.6); ctx.fillRect(-0.2, 1.0, 2.6, 1.5);
      ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(1.2, -0.2, 0.85, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BONE.eye; circle(1.3, -0.15, 0.3);
      ctx.fillStyle = '#3f3a33'; for (let k = 0; k < 3; k++) ctx.fillRect(0.4 + k * 0.6, 1.6, 0.12, 0.6);
    }
    ctx.restore();
  }
}
