/* ninja-voice-game – editor.js
   עורך סצנה לשלב החזיר (רק במצב בודק): המשחק עוצר, ואפשר לגרור באצבע –
   · מיקומים: עצים / סלע (ימינה-שמאלה = מקום, למעלה-למטה = כמה קרוב אלינו), הנינג'ות (גובה), החזירים (גובה). גדול/קטן = רוחב / גודל.
   · תנוחות: בוחרים תנוחה (צמוד לעץ / לפני הגזע / ליד הסלע) וגוררים נקודות: ידיים, רגליים, אגן (גובה) וראש (הטיה).
   שמור – נשמר באייפד והמשחק משתמש בו מיד. העתק – מעתיק את המספרים כדי להדביק לי, ואז הם נכנסים לקוד לכולם.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const ED_KEY = 'nvg-boar-layout';
const ED_POSES = { cover: 'Next to tree', hug: 'In front of trunk', crouch: 'By the rock' };
let boarPoseOv = {};                                                                // תנוחות ערוכות: { cover: {hipY, lean, legs, arms, ...}, ... }
const ED = { on: false, mode: 'place', sel: null, pose: 'cover', drag: null, T: null };
const BOAR_LAYOUT0 = boarLayoutGet();                                               // ברירת המחדל מהקוד (לאיפוס)

function boarLayoutGet() {
  return {
    tree0: +BOAR.tree0.toFixed(1), frontDY: +BOAR.frontDY.toFixed(1), ninjaDY: +BOAR.ninjaDY.toFixed(1), deepY: +BOAR.deepY.toFixed(1), deepS: +BOAR.deepS.toFixed(2), rockH: +BOAR.rockH.toFixed(1),
    covers: BOAR_TREES.map(T => ({ dx: +T.dx.toFixed(1), w: +T.w.toFixed(1) })),
    poses: JSON.parse(JSON.stringify(boarPoseOv, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v))
  };
}
function boarLayoutApply(L) {
  if (!L) return;
  for (const k of ['tree0', 'frontDY', 'ninjaDY', 'deepY', 'deepS', 'rockH']) if (typeof L[k] === 'number') BOAR[k] = L[k];
  if (Array.isArray(L.covers)) L.covers.forEach((c, i) => { if (BOAR_TREES[i] && c) { if (typeof c.dx === 'number') BOAR_TREES[i].dx = c.dx; if (typeof c.w === 'number') BOAR_TREES[i].w = c.w; } });
  boarPoseOv = L.poses && typeof L.poses === 'object' ? JSON.parse(JSON.stringify(L.poses)) : {};
  for (const o of obstacles) if (o.type === 'boar') boarSetup(o);
}
try { const L = JSON.parse(localStorage.getItem(ED_KEY) || 'null'); if (L) boarLayoutApply(L); } catch (e) {}

// תנוחה ערוכה (נקרא מ-boar.js אחרי שהתנוחה הרגילה נבנתה)
function boarPoseApply(P, name) {
  const o = boarPoseOv[name]; if (!o) return P;
  for (const k of ['hipY', 'lean', 'spine', 'headTilt']) if (typeof o[k] === 'number') P[k] = o[k];
  if (o.legs) P.legs = o.legs.map(a => a.slice());
  if (o.arms) P.arms = o.arms.map(a => a.slice());
  return P;
}
function edPoseName() { return ED.on && ED.mode === 'pose' ? ED.pose : null; }

/* ---------- הכפתורים ---------- */
function edBuildUI() {
  if ($('edPanel')) return;
  const css = document.createElement('style');
  css.textContent = `#edBtn{background:#7c3aed!important;color:#fff!important}
#edPanel{position:absolute;left:8px;right:8px;bottom:8px;z-index:61;background:rgba(15,23,42,.88);color:#fff;border-radius:16px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:600 15px system-ui;direction:ltr}
#edPanel button{font:700 15px system-ui;padding:9px 12px;border-radius:10px;border:0;background:#334155;color:#fff}
#edPanel button.on{background:#f59e0b;color:#111}
#edPanel .lbl{padding:0 6px;color:#fde68a;min-width:120px}
#edOut{position:absolute;left:8px;right:8px;bottom:120px;height:120px;z-index:62;font:12px monospace;direction:ltr}
.edHide{display:none!important}`;
  document.head.appendChild(css);
  const b = $('edBtn');                                                             // הכפתור בפס העליון, ליד Pause
  const p = document.createElement('div'); p.id = 'edPanel'; p.className = 'edHide'; document.body.appendChild(p);
  p.innerHTML = `<button data-a="place">📍 Places</button><button data-a="pose">🧍 Poses</button>
    <span id="edPoses"><button data-p="cover">Next to tree</button><button data-p="hug">In front of trunk</button><button data-p="crouch">By the rock</button></span>
    <span class="lbl" id="edLbl">tap something</span>
    <button data-a="big">➕ Bigger</button><button data-a="small">➖ Smaller</button>
    <button data-a="save">💾 Save</button><button data-a="copy">📋 Copy</button><button data-a="reset">↺ Reset</button><button data-a="close">✕ Close</button>`;
  const out = document.createElement('textarea'); out.id = 'edOut'; out.className = 'edHide'; out.readOnly = true; document.body.appendChild(out);
  b.onclick = () => {
    if (state === 'intro') { try { finishIntro(); } catch (err) {} }
    if (state !== 'play' && state !== 'paused') return;
    if (state === 'paused') { $('pause').classList.remove('show'); state = 'play'; }
    for (let n = 0; !boarS && n < 60 * 40 && state === 'play'; n++) update(1 / 60);   // עוד לא הגיע ליער – מקדמים עד העץ הראשון
    if (boarS) edOpen(true);
  };
  p.addEventListener('pointerdown', e => e.stopPropagation());
  p.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.p) { ED.pose = t.dataset.p; ED.sel = null; edSync(); return; }
    const a = t.dataset.a;
    if (a === 'place' || a === 'pose') { ED.mode = a; ED.sel = null; edSync(); }
    else if (a === 'big' || a === 'small') edResize(a === 'big' ? 1 : -1);
    else if (a === 'save') { try { localStorage.setItem(ED_KEY, JSON.stringify(boarLayoutGet())); } catch (err) {} flash = { text: '💾 Saved', t: 1 }; }
    else if (a === 'copy') { const s = JSON.stringify(boarLayoutGet()); out.value = s; out.classList.remove('edHide'); out.select(); try { navigator.clipboard.writeText(s).catch(() => {}); } catch (err) {} flash = { text: '📋 Copied – paste it to Claude', t: 1.6 }; }
    else if (a === 'reset') { boarLayoutApply(BOAR_LAYOUT0); boarPoseOv = {}; try { localStorage.removeItem(ED_KEY); } catch (err) {} edSync(); }
    else if (a === 'close') edOpen(false);
  };
}
function edOpen(on) {
  ED.on = on; ED.sel = null; ED.drag = null;
  $('edPanel').classList.toggle('edHide', !on); $('edOut').classList.add('edHide');
  if (!on && state === 'play') lastT = 0;
  edSync();
}
function edSync() {
  if (!$('edPanel')) return;
  for (const b of $('edPanel').querySelectorAll('button[data-a="place"],button[data-a="pose"]')) b.classList.toggle('on', b.dataset.a === ED.mode);
  for (const b of $('edPanel').querySelectorAll('button[data-p]')) b.classList.toggle('on', b.dataset.p === ED.pose);
  $('edPoses').classList.toggle('edHide', ED.mode !== 'pose');
  const s = ED.sel;
  $('edLbl').textContent = !s ? (ED.mode === 'pose' ? 'drag the dots' : 'tap something') :
    s.k === 'cover' ? (BOAR_TREES[s.i].kind === 'rock' ? 'Rock' : 'Tree ' + (s.i + 1)) + ' – drag / size' :
    s.k === 'ninja' ? 'Ninjas – drag up/down' : s.k === 'boar' ? 'Boars – drag up/down / size' : 'Pose: ' + s.k;
}
// נקרא כל פריים מ-draw: מראה את הכפתור רק במצב בודק בשלב החזיר
function edTick() {
  if (!$('edPanel')) edBuildUI();
  const boarHere = !!boarS || obstacles.some(o => o.type === 'boar' && !o.passed) || (typeof playWords !== 'undefined' && playWords.includes('boar'));
  const can = typeof isTester === 'function' && isTester() && boarHere && (state === 'play' || state === 'paused' || state === 'intro');
  $('edBtn').classList.toggle('hide', !can || ED.on);   // במצב בודק, בכל שלב שיש בו חזיר
  if (ED.on && !boarS) edOpen(false);
}
function edPaused() { return ED.on; }

/* ---------- גרירה ---------- */
function edWorld(e) {
  const r = canvas.getBoundingClientRect(), px = (e.clientX - r.left) * canvas.width / r.width, py0 = (e.clientY - r.top) * canvas.height / r.height;
  const p = ED.T ? ED.T.inverse().transformPoint(new DOMPoint(px, py0)) : { x: 0, y: 0 };
  return { x: p.x, y: p.y };
}
function edNinjaOrigin() { return { x: PLAYER.x + 4, y: GROUND + boarFrontDY() }; }
function edPosePoints() {                                                          // הנקודות על הנינג'ה (במצב תנוחות)
  const P = boarPose(poseIdle(0)), J = figureJoints(P), S = RIG.shape, O = edNinjaOrigin();
  const end = (a, l1, l2, ang) => [a[0] + Math.sin(ang[0]) * l1 + Math.sin(ang[1]) * l2, a[1] + Math.cos(ang[0]) * l1 + Math.cos(ang[1]) * l2];
  const W = q => ({ x: O.x + q[0], y: O.y + q[1] });
  return {
    P, J, O,
    pts: [
      { k: 'handB', ...W(end(J.shB, S.upper, S.fore, P.arms[0])) }, { k: 'handF', ...W(end(J.shF, S.upper, S.fore, P.arms[1])) },
      { k: 'footB', ...W(end(J.hipB, S.thigh, S.shin, P.legs[0])) }, { k: 'footF', ...W(end(J.hipF, S.thigh, S.shin, P.legs[1])) },
      { k: 'hip', ...W(J.hip) }, { k: 'head', ...W(J.head) }
    ]
  };
}
function edPick(w) {
  if (ED.mode === 'pose') {
    const { pts } = edPosePoints(); let best = null, bd = 3.2;
    for (const q of pts) { const d = Math.hypot(q.x - w.x, q.y - w.y); if (d < bd) { bd = d; best = q; } }
    return best ? { k: best.k } : null;
  }
  const o = boarS.o, dy = BOAR.frontDY;
  const O = edNinjaOrigin();
  if (Math.abs(w.x - O.x) < 5 && w.y < O.y + 2 && w.y > O.y - 15) return { k: 'ninja' };
  for (let i = 0; i < BOAR.trees; i++) { const x = boarTreeX(o, i), T = BOAR_TREES[i]; if (Math.abs(w.x - x) < T.w / 2 + 1 && w.y < GROUND + dy + 2 && w.y > GROUND + dy - (T.kind === 'rock' ? BOAR.rockH + 2 : 60)) return { k: 'cover', i }; }
  for (const B of boarS.boars) if (B.m !== 'off' && Math.abs(w.x - B.x) < 12 && Math.abs(w.y - (GROUND + BOAR.deepY - 6)) < 9) return { k: 'boar' };
  return null;
}
function edDragTo(w) {
  const d = ED.drag, s = ED.sel; if (!d || !s) return;
  const dx = w.x - d.x, dy = w.y - d.y;
  if (ED.mode === 'place') {
    if (s.k === 'cover') {
      if (s.i === 0) BOAR.tree0 = d.v0.tree0 + dx; else BOAR_TREES[s.i].dx = Math.max(BOAR_TREES[s.i - 1].dx + 8, d.v0.dx + dx);
      BOAR.frontDY = Math.max(0, Math.min(20, d.v0.frontDY + dy));
      for (const o of obstacles) if (o.type === 'boar') boarSetup(o);
    } else if (s.k === 'ninja') BOAR.ninjaDY = Math.max(-6, Math.min(16, d.v0.ninjaDY + dy));
    else if (s.k === 'boar') BOAR.deepY = Math.max(-14, Math.min(8, d.v0.deepY + dy));
    return;
  }
  // תנוחות: היד / הרגל הולכות אחרי האצבע (עם מפרק שמתכופף באופן טבעי), האגן – גובה, הראש – הטיה
  const { P, J, O } = edPosePoints(), S = RIG.shape, q = [w.x - O.x, w.y - O.y], ov = boarPoseOv[ED.pose] || (boarPoseOv[ED.pose] = {});
  const pick = (base, t, l1, l2, cur) => { const a = bkIK(base, t, l1, l2, 1), b = bkIK(base, t, l1, l2, -1); return Math.abs(a[0] - cur[0]) + Math.abs(a[1] - cur[1]) <= Math.abs(b[0] - cur[0]) + Math.abs(b[1] - cur[1]) ? a : b; };
  ov.arms = (ov.arms || P.arms).map(a => a.slice()); ov.legs = (ov.legs || P.legs).map(a => a.slice());
  if (s.k === 'handB') ov.arms[0] = pick(J.shB, q, S.upper, S.fore, P.arms[0]);
  if (s.k === 'handF') ov.arms[1] = pick(J.shF, q, S.upper, S.fore, P.arms[1]);
  if (s.k === 'footB') ov.legs[0] = pick(J.hipB, q, S.thigh, S.shin, P.legs[0]);
  if (s.k === 'footF') ov.legs[1] = pick(J.hipF, q, S.thigh, S.shin, P.legs[1]);
  if (s.k === 'hip') ov.hipY = Math.max(-5.5, Math.min(-1, q[1]));
  if (s.k === 'head') ov.lean = Math.max(-1, Math.min(1.2, Math.atan2(q[0] - J.hip[0], -(q[1] - J.hip[1]))));
}
function edResize(sgn) {
  const s = ED.sel; if (!s) return;
  if (s.k === 'cover') { const T = BOAR_TREES[s.i]; T.w = Math.max(4, Math.min(40, T.w * (sgn > 0 ? 1.1 : 1 / 1.1))); if (T.kind === 'rock') BOAR.rockH = Math.max(6, Math.min(30, BOAR.rockH * (sgn > 0 ? 1.1 : 1 / 1.1))); }
  if (s.k === 'boar') BOAR.deepS = Math.max(0.4, Math.min(1.3, BOAR.deepS * (sgn > 0 ? 1.08 : 1 / 1.08)));
}
document.addEventListener('pointerdown', e => {
  if (!ED.on || !boarS || e.target !== canvas) return;
  e.preventDefault();
  const w = edWorld(e), s = edPick(w);
  ED.sel = s; edSync();
  if (s) ED.drag = { x: w.x, y: w.y, v0: { tree0: BOAR.tree0, dx: s.k === 'cover' ? BOAR_TREES[s.i].dx : 0, frontDY: BOAR.frontDY, ninjaDY: BOAR.ninjaDY, deepY: BOAR.deepY } };
}, { capture: true });
document.addEventListener('pointermove', e => { if (ED.on && ED.drag) { e.preventDefault(); edDragTo(edWorld(e)); } }, { capture: true });
document.addEventListener('pointerup', () => { ED.drag = null; }, { capture: true });

/* ---------- ציור הסימונים (נקרא מ-drawForestFront, בתוך מערכת הצירים של העולם) ---------- */
function edDraw() {
  ED.T = ctx.getTransform();
  if (!ED.on || !boarS) return;
  ctx.save();
  if (ED.mode === 'pose') {
    const { pts } = edPosePoints();
    for (const q of pts) {
      const on = ED.sel && ED.sel.k === q.k, col = q.k.startsWith('hand') ? '#f472b6' : q.k.startsWith('foot') ? '#38bdf8' : q.k === 'hip' ? '#facc15' : '#a3e635';
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = on ? 0.5 : 0.3;
      ctx.beginPath(); ctx.arc(q.x, q.y, on ? 1.5 : 1.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  } else {
    const s = ED.sel, o = boarS.o;
    ctx.strokeStyle = 'rgba(250,204,21,.95)'; ctx.lineWidth = 0.4; ctx.setLineDash([1.2, 0.8]);
    if (s && s.k === 'cover') { const x = boarTreeX(o, s.i), T = BOAR_TREES[s.i], h = T.kind === 'rock' ? BOAR.rockH : 40; ctx.strokeRect(x - T.w / 2, GROUND + BOAR.frontDY - h, T.w, h); }
    if (s && s.k === 'ninja') { const O = edNinjaOrigin(); ctx.strokeRect(O.x - 4, O.y - 14, 8, 14); }
    if (s && s.k === 'boar') { ctx.beginPath(); ctx.moveTo(viewL(), GROUND + BOAR.deepY); ctx.lineTo(viewR(), GROUND + BOAR.deepY); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.restore();
}
