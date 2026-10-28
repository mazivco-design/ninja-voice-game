/* ninja-voice-game – lab.js
   מעבדת האנימציות (🎬)
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   מעבדת אנימציות – בודקים כל תנועה לבד, לאט, עם שלד
   ============================================================ */
const LAB_POSES = ['run', 'idle', 'jump', 'duck', 'kick', 'throw', 'catch', 'fly'];
const LAB_SPEEDS = [0.1, 0.25, 0.5, 1];
let lab = { pose: 'run', speed: 0.25, playing: true, skeleton: true, enemy: false, t: 0 };

function openLab() {
  stopAudio();
  hideAllOverlays();
  state = 'lab';
  ['hudFree', 'hudStage', 'progress', 'catchHud', 'endBtn', 'pauseBtn', 'skipBtn', 'labBtn'].forEach(id => $(id).classList.add('hide'));
  $('lives').textContent = '';
  renderLab();
  $('lab').classList.add('show');
}
function closeLab() {
  $('lab').classList.remove('show');
  if (player) toMenu(); else showPlayers();
}
function renderLab() {
  const mk = (box, items, cur, fmt, set) => {
    box.innerHTML = '';
    items.forEach(v => {
      const b = document.createElement('button');
      b.className = 'lb' + (v === cur ? ' on' : ''); b.textContent = fmt(v);
      b.onclick = () => { set(v); renderLab(); };
      box.appendChild(b);
    });
  };
  mk($('labPoses'), LAB_POSES, lab.pose, v => v.toUpperCase(), v => { lab.pose = v; lab.t = 0; });
  mk($('labSpeeds'), LAB_SPEEDS, lab.speed, v => v + '×', v => { lab.speed = v; });
  $('labPlay').textContent = lab.playing ? '⏸' : '▶';
  $('labSkel').classList.toggle('on', lab.skeleton);
  $('labEnemy').classList.toggle('on', lab.enemy);
}
$('labBtn').onclick = openLab;
$('labClose').onclick = closeLab;
$('labPlay').onclick = () => { lab.playing = !lab.playing; renderLab(); };
$('labStep').onclick = () => { lab.playing = false; lab.t += 1 / 30; renderLab(); };
$('labSkel').onclick = () => { lab.skeleton = !lab.skeleton; renderLab(); };
$('labEnemy').onclick = () => { lab.enemy = !lab.enemy; renderLab(); };

// התנוחה לפי הזמן במעבדה – אותן פונקציות בדיוק כמו במשחק
function labPose(t) {
  const L = LEVELS.medium, air = 2 * L.jumpV / L.gravity;
  let P, lift = 0, info = '';
  switch (lab.pose) {
    case 'run':  P = poseRun(t * 50 * 0.42); info = 'phase ' + ((t * 21) % (Math.PI * 2)).toFixed(2); break;
    case 'idle': P = poseIdle(t); break;
    case 'jump': {
      const c = t % (air + 0.6);
      if (c < air) { lift = L.jumpV * c - L.gravity * c * c / 2; P = poseAir(L.jumpV - L.gravity * c > 0); }
      else P = poseIdle(t);
      info = 'height ' + lift.toFixed(1); break;
    }
    case 'duck': P = poseDuck(); break;
    case 'kick':  { const c = t % 1.2; P = poseIdle(t); if (c < KICK.time) applyKick(P, c / KICK.time); info = 'k ' + Math.min(1, c / KICK.time).toFixed(2); break; }
    case 'throw': { const c = t % 1.0; P = poseIdle(t); if (c < 0.25) applyThrow(P, c / 0.25); info = 'k ' + Math.min(1, c / 0.25).toFixed(2); break; }
    case 'catch': { const c = t % 1.2; P = poseIdle(t); if (c < 0.4) applyCatch(P); break; }
    case 'fly':  P = poseFly(t); lift = 12; break;
  }
  return { P, lift, info };
}

function drawLab(dt) {
  if (lab.playing) lab.t += dt * lab.speed;
  ctx.fillStyle = '#e0f2fe'; ctx.fillRect(0, 0, cw, ch);
  const u = Math.min(cw / 60, ch / 34);                   // יחידה גדולה – הדמות ענקית
  const fx = cw / 2 - (lab.enemy ? 9 * u : 0), fy = ch * 0.6;
  // רשת עזר
  ctx.strokeStyle = 'rgba(15,23,42,.08)'; ctx.lineWidth = 1;
  for (let y = fy; y > 0; y -= u * 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); }
  for (let x = fx % (u * 2); x < cw; x += u * 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, fy); ctx.stroke(); }
  ctx.fillStyle = '#a16207'; ctx.fillRect(0, fy, cw, ch - fy);
  ctx.fillStyle = '#4ade80'; ctx.fillRect(0, fy, cw, u * 0.5);

  const { P, lift, info } = labPose(lab.t);
  ctx.save(); ctx.translate(fx, fy); ctx.scale(u, u);
  if (lab.pose === 'fly') {                               // גלשן
    ctx.fillStyle = playerColor();
    ctx.beginPath(); ctx.moveTo(-12, -lift - 15); ctx.lineTo(0.5, -lift - 21); ctx.lineTo(13, -lift - 15); ctx.lineTo(0.5, -lift - 17); ctx.closePath(); ctx.fill();
  }
  drawFigure({ fx: 0, fy: -lift, facing: 1, scale: 1, kind: 'ninja', accent: playerColor(), pose: P, skeleton: lab.skeleton });
  if (lab.enemy) {
    const E = lab.pose === 'run' ? poseRun(lab.t * 10) : labPose(lab.t).P;
    drawFigure({ fx: 18, fy: 0, facing: -1, scale: ENEMY.h / 14, kind: 'enemy', pose: E, skeleton: lab.skeleton });
  }
  ctx.restore();
  $('labInfo').textContent = lab.pose.toUpperCase() + ' · t=' + lab.t.toFixed(2) + 's · ' + lab.speed + '×' + (info ? ' · ' + info : '') +
                             (lab.skeleton ? '   (red = body · green = front limbs · orange = back limbs)' : '');
}

