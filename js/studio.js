/* ninja-voice-game – studio.js
   סטודיו עיצוב (נכנסים מ-🎬 → 🎨 Design): מעלים SVG לכל מכשול, מתאימים גודל ומיקום, ורואים אותו במשחק.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let studio = { slot: 'ice', hit: true, move: false };

function studioObstacle() {
  const s = studio.slot, o = { type: s, x: 70, passed: false, hit: false };
  if (s === 'bramble') { o.x = 34; o.w = BRAMBLE.ramp + Math.max(30, LEVELS.medium.speed * BRAMBLE.factor) + BRAMBLE.exit; }
  if (s === 'beam') o.x = 60;
  return o;
}
function openStudio() {
  stopAudio(); hideAllOverlays(); $('lab').classList.remove('show');
  state = 'studio'; mode = 'free';
  ['hudFree', 'hudStage', 'progress', 'catchHud', 'endBtn', 'pauseBtn', 'skipBtn', 'labBtn'].forEach(id => $(id).classList.add('hide'));
  $('lives').textContent = '';
  cfg = LEVELS.medium; speed = cfg.speed; py = 0; vy = 0; duckT = 0; flyT = 0; resetAct();
  shurikens = []; fireballs = []; pickups = []; particles = []; flag = null; banner = null; flash = null;
  studioPick(studio.slot);
  $('studio').classList.add('show');
}
function closeStudio() { $('studio').classList.remove('show'); artOff = false; obstacles = []; if (player) toMenu(); else showPlayers(); }
function studioPick(id) {
  studio.slot = id; artOff = false;
  world = (id === 'bramble' || id === 'ice') ? 3 : id === 'window' ? 4 : 0;
  obstacles = [studioObstacle()];
  renderStudio();
}

function curArt() { return artLocal[studio.slot] || null; }
function setArt(a) { if (a) artLocal[studio.slot] = a; else delete artLocal[studio.slot]; saveArtLocal(); artCache.clear(); renderStudio(); }

// מתאים את הציור לגודל המשבצת – נשען על הקרקע, באמצע
function fitArt(a) {
  const s = ART_SLOT[studio.slot], sz = svgSize(a.svg);
  if (s.stretch) { a.extra = 8; a.h = s.h; a.dx = s.dx; a.dy = s.dy; a.w = 0; return a; }
  const k = Math.min(s.w / sz.w, s.h / sz.h);
  a.w = sz.w * k; a.h = sz.h * k; a.dx = s.dx + (s.w - a.w) / 2; a.dy = s.dy;
  return a;
}

function renderStudio() {
  const box = $('stSlots'); box.innerHTML = '';
  ART_SLOTS.forEach(s => {
    const b = document.createElement('button');
    b.className = 'lb' + (s.id === studio.slot ? ' on' : '') + (artLocal[s.id] || artBase[s.id] ? ' has' : '');
    b.textContent = s.name; b.onclick = () => studioPick(s.id);
    box.appendChild(b);
  });
  const a = curArt(), s = ART_SLOT[studio.slot];
  $('stCompare').classList.toggle('on', artOff);
  $('stHit').classList.toggle('on', studio.hit);
  $('stMove').classList.toggle('on', studio.move);
  document.querySelectorAll('#studio [data-a]').forEach(b => b.disabled = !a);
  $('stRemove').disabled = !a;
  document.querySelectorAll('#studio .onlyStretch').forEach(b => b.classList.toggle('hide', !s.stretch));
  $('stInfo').textContent = !a ? (artBase[studio.slot] ? 'Using the drawing from the project pack. Upload an SVG to replace it.' : 'No drawing yet – the game draws this one in code. Upload an SVG.')
    : (s.stretch ? 'height ' + a.h.toFixed(1) + ' · extra width ' + (a.extra || 0).toFixed(1) : 'size ' + a.w.toFixed(1) + '×' + a.h.toFixed(1)) +
      ' · x ' + a.dx.toFixed(1) + ' · up ' + a.dy.toFixed(1) + (a.flip ? ' · flipped' : '') + ' · ' + (a.svg.length / 1024).toFixed(1) + ' KB';
}

$('stFile').onchange = e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const svg = String(r.result || '');
    if (!/<svg[\s>]/i.test(svg)) { $('stInfo').textContent = '⚠️ That file is not an SVG'; return; }
    if (svg.length > 600 * 1024) { $('stInfo').textContent = '⚠️ The SVG is very big (' + Math.round(svg.length / 1024) + ' KB). Try exporting it simpler (no embedded images).'; return; }
    setArt(fitArt({ svg, flip: false }));
  };
  r.readAsText(f);
};
$('stRemove').onclick = () => setArt(null);
$('stCompare').onclick = () => { artOff = !artOff; renderStudio(); };
$('stHit').onclick = () => { studio.hit = !studio.hit; renderStudio(); };
$('stMove').onclick = () => { studio.move = !studio.move; if (!studio.move) obstacles = [studioObstacle()]; renderStudio(); };
document.querySelectorAll('#studio [data-a]').forEach(b => b.onclick = () => {
  const a = curArt(); if (!a) return;
  const s = ART_SLOT[studio.slot], st = 0.5;
  switch (b.dataset.a) {
    case 'size+': case 'size-': {
      const k = b.dataset.a === 'size+' ? 1.05 : 1 / 1.05;
      if (s.stretch) a.h *= k;
      else { const cx = a.dx + a.w / 2; a.w *= k; a.h *= k; a.dx = cx - a.w / 2; }
      break;
    }
    case 'wide+': a.extra = (a.extra || 0) + 1; break;
    case 'wide-': a.extra = (a.extra || 0) - 1; break;
    case 'left': a.dx -= st; break;
    case 'right': a.dx += st; break;
    case 'up': a.dy += st; break;
    case 'down': a.dy -= st; break;
    case 'flip': a.flip = !a.flip; break;
    case 'fit': fitArt(a); break;
  }
  setArt(a);
});
// חבילה: כל הציורים בקובץ אחד – לשמור, להעביר לאייפד אחר, או לשלוח כדי שיכנס לפרויקט
$('stExport').onclick = () => {
  const pack = Object.assign({}, artBase, artLocal);
  const blob = new Blob([JSON.stringify(pack)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ninja-art-pack.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$('stImport').onchange = e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { const p = JSON.parse(r.result); Object.keys(p).forEach(k => { if (ART_SLOT[k] && p[k] && p[k].svg) artLocal[k] = p[k]; }); saveArtLocal(); artCache.clear(); renderStudio(); }
    catch (err) { $('stInfo').textContent = '⚠️ Could not read that pack'; }
  };
  r.readAsText(f);
};
$('stClose').onclick = closeStudio;
$('labDesign').onclick = openStudio;

// הסצנה: העולם, הנינג'ה והמכשול. אפשר להזיז את המכשול כמו בריצה, ולראות את אזור הפגיעה
function drawStudio(dt) {
  if (studio.move) {
    const o = obstacles[0]; o.x -= 30 * dt; bgX += 30 * dt;
    if (o.x + (o.w || 25) < -10) o.x = W + 4;
  }
  const oy0 = oy, pan = $('studio').querySelector('.panel');      // מרימים את העולם מעל הפנל, כדי לראות את הקרקע ואת הנינג'ה
  oy = Math.min(oy, ch - pan.offsetHeight - 24 - (GROUND + 4) * scale);
  draw();
  const o = obstacles[0];
  if (o && studio.hit) {
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
  ctx.lineWidth = 0.35; ctx.setLineDash([1.2, 0.8]);
  const b = obstacleBox(o);
  ctx.strokeStyle = 'rgba(220,38,38,.9)';                                   // אדום = האזור שהנינג'ה נפגע ממנו
  if (o.type === 'bramble') {
    ctx.beginPath(); for (let k = 0; k <= o.w; k += 1) ctx.lineTo(o.x + k, caveCeiling(o, o.x + k)); ctx.stroke();
  } else ctx.strokeRect(b.l, Math.max(b.t, GROUND - 70), b.r - b.l, Math.min(b.b, GROUND + 2) - Math.max(b.t, GROUND - 70));
  const a = artFor(o.type);
  if (a) { const R = artRect(o, a); ctx.strokeStyle = 'rgba(37,99,235,.9)'; ctx.strokeRect(R.l, R.t, R.w, R.h); }   // כחול = גבולות הציור
  const pb = playerBox(); ctx.strokeStyle = 'rgba(22,163,74,.9)'; ctx.strokeRect(pb.l, pb.t, pb.r - pb.l, pb.b - pb.t);   // ירוק = הנינג'ה
  ctx.restore();
  }
  oy = oy0;
}
