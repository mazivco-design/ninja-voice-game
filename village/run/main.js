/* ============================================================
   village/run/main.js – אב־טיפוס "ריצה על מסילה" בעולם תלת־ממדי.

   העולם (assets/run.glb + run.json) נבנה בבלנדר: village/blender/build_run.py.
   הנינג'ה רץ לבד לאורך השביל המתפתל; לכל מכשול מילה אחת (JUMP / PUSH / CLIMB).
   אין תזמון מדויק: אם אמרו את המילה מוקדם – הפעולה תתבצע כשיגיע למכשול;
   אם לא אמרו – הנינג'ה מאט, נעצר לפני המכשול ומחכה.
   המצלמה מחליפה זווית לפי הקטע (ZONES), תמיד במעבר רך ותמיד לפני המכשול.
   בינתיים נגיעה במילה במקום קול.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeStyle, STYLES } from './style.js';

const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto');                       // לבדיקות: אומר את המילים לבד
const TS = +Q.get('ts') || 1;
const $ = id => document.getElementById(id);
const STYLE = Q.get('style') in STYLES ? Q.get('style') : null;   // toon / ink / water – מראה מצויר (style.js); בלי – המראה הרגיל
let style = null;

// ---------- במה ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbfe3f5); scene.fog = new THREE.Fog(0xbfe3f5, 55, 150);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.3, 400);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x6f7f52, 1.5));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 140 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(0.714, -0.616, -0.333).normalize();   // כמו השמש בבלנדר: מאחורי הרץ, מאירה את הצוק

// בלנדר (x לאורך, y לרוחב, z למעלה) → three.js
const B = (x, y, z) => new THREE.Vector3(x, z, -y);

// ---------- טעינה ----------
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const load = url => new Promise((ok, no) => loader.load(url, ok, undefined, no));
let D, P = [], CUM = [], LEN = 0, HM;
let ninja, mixer, acts = {}, cur = null, gateL, gateR;

Promise.all([fetch('assets/run.json').then(r => r.json()), load('assets/run.glb'), load('../kit/assets/char/Rogue_Hooded.glb')]).then(([data, world, ch]) => {
  D = data; HM = data.hm;
  P = data.path.map(p => B(p[0], p[1], p[2]));
  CUM = [0]; for (let i = 1; i < P.length; i++) CUM.push(CUM[i - 1] + P[i].distanceTo(P[i - 1]));
  LEN = CUM[CUM.length - 1];

  // העולם: חפצים שחוזרים הרבה (עצים, שיחים, סלעים) הופכים ל־InstancedMesh – הרבה פחות עבודה לאייפד
  world.scene.updateMatrixWorld(true);
  if (STYLE) { style = makeStyle(renderer, scene, camera, STYLE); style.toonify(world.scene); style.toonify(ch.scene); }
  gateL = world.scene.getObjectByName('GateL'); gateR = world.scene.getObjectByName('GateR');
  const groups = new Map();
  world.scene.traverse(o => { if (o.isMesh) { const k = o.geometry.uuid + '|' + o.material.uuid; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); } });
  for (const list of groups.values()) {
    if (list.length < 4) { list.forEach(o => { o.castShadow = o.name !== 'Ground'; o.receiveShadow = true; }); continue; }
    const im = new THREE.InstancedMesh(list[0].geometry, list[0].material, list.length);
    list.forEach((o, i) => { im.setMatrixAt(i, o.matrixWorld); o.removeFromParent(); });
    im.castShadow = im.receiveShadow = true; scene.add(im);
  }
  scene.add(world.scene);

  // הנינג'ה
  const hide = /knife|dagger|crossbow|sword|axe|bow|shield|staff|wand|mug|quiver|arrow|throwable|spellbook/i;
  ch.scene.traverse(o => { if (o.isMesh) { if (hide.test(o.name)) o.visible = false; o.castShadow = true; o.frustumCulled = false; } });
  const box = new THREE.Box3().setFromObject(ch.scene); ch.scene.scale.setScalar(1.75 / (box.max.y - box.min.y));
  ninja = new THREE.Group(); ninja.add(ch.scene); scene.add(ninja); ninja.model = ch.scene;
  mixer = new THREE.AnimationMixer(ch.scene);
  ch.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); });
  ['Jump_Full_Long', 'Interact', 'Cheer'].forEach(n => { acts[n].setLoop(THREE.LoopOnce); acts[n].clampWhenFinished = true; });

  setup(); $('load').style.display = 'none';
  window.__run = { S, say, OBS, cam, sOfX, get ninja() { return ninja; } };
  requestAnimationFrame(loop);
}).catch(e => { console.error(e); $('load').textContent = 'לא הצלחתי לטעון את העמק.'; });

function play(n, fade = 0.18, scale = 1) {
  const a = acts[n]; if (!a) return; a.timeScale = scale;
  if (cur === a) return;
  a.reset().fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a;
}

// ---------- השביל ----------
function sOfX(x) { const f = (x - D.path[0][0]) / 0.5, i = Math.max(0, Math.min(P.length - 2, Math.floor(f))); return CUM[i] + (CUM[i + 1] - CUM[i]) * (f - i); }
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function at(s, out) {                                   // נקודה על השביל במרחק s מההתחלה
  s = Math.max(0, Math.min(LEN - 0.001, s)); let lo = 0, hi = CUM.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= s) lo = m; else hi = m; }
  return out.lerpVectors(P[lo], P[hi], (s - CUM[lo]) / (CUM[hi] - CUM[lo]));
}
function groundAt(x, z) {                               // גובה הקרקע (ממפת הגבהים) – כדי שהמצלמה לא תיכנס לאדמה
  const fx = (x - HM.x0) / HM.d, fy = (-z - HM.y0) / HM.d;
  const i = Math.max(0, Math.min(HM.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(HM.ny - 2, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j)), h = HM.h, n = HM.nx;
  return (h[j * n + i] * (1 - u) + h[j * n + i + 1] * u) * (1 - v) + (h[(j + 1) * n + i] * (1 - u) + h[(j + 1) * n + i + 1] * u) * v;
}

// ---------- מצב המשחק ----------
const RUN = 7.2;                                        // מהירות ריצה
const S = { s: 0, speed: 0, phase: 'run', t: 0, y: 0, pos: new THREE.Vector3(), fwd: new THREE.Vector3(1, 0, 0), done: false };
let OBS = [];
function setup() {
  OBS = D.obstacles.map(o => {
    const s = sOfX(o.x);
    if (o.type === 'JUMP') return { type: o.type, s, stop: s - 2.3, show: 16, tagAt: at(s, new THREE.Vector3()).add(new THREE.Vector3(0, 2.3, 0)) };
    if (o.type === 'PUSH') return { type: o.type, s, stop: s - 1.25, show: 16, tagAt: at(s, new THREE.Vector3()).add(new THREE.Vector3(0, 4.1, 0)) };
    const st = sOfX(o.x) - 0.5;                           // CLIMB: עוצרים צמוד לסולם, מטפסים, וממשיכים מלמעלה
    return { type: o.type, s: st, stop: st, show: 15, top: sOfX(o.top_x), y0: o.z0 + 0.05, y1: o.z1, x: o.x - 0.5,
             tagAt: at(st, new THREE.Vector3()).add(new THREE.Vector3(0.3, (o.z1 - o.z0) * 0.62, 0)) };
  });
  OBS.forEach(o => { o.done = false; o.armed = false; });
  S.s = Q.has('s') ? sOfX(+Q.get('s')) : 0; S.speed = 0; S.phase = 'run'; S.done = false; S.t = 0;
  OBS.forEach(o => { if (o.s < S.s) o.done = true; });
  if (gateL) { const open = OBS.find(o => o.type === 'PUSH').done ? 1 : 0; gateL.rotation.y = -1.45 * open; gateR.rotation.y = 1.45 * open; }
  cam.mode = null; cam.init = false; $('end').style.display = 'none';
  play('Running_A');
}
const nextObs = () => OBS.find(o => !o.done);

// "אמרו" מילה (כרגע: נגיעה או מקש; בהמשך – מודול הזיהוי הקולי יקרא לפונקציה הזאת)
function say(word) {
  const o = nextObs(); if (!o || o.armed || o.type !== word) return false;
  if (o.stop - S.s > o.show) return false;               // עוד רחוק מדי – המילה עוד לא מוצגת
  o.armed = true; $('say').classList.add('ok'); $('tag').classList.add('ok'); $('say').textContent = $('tag').textContent = word + ' ✓';
  $('hint').style.opacity = '0';
  return true;
}
$('say').addEventListener('pointerdown', e => { e.preventDefault(); const o = nextObs(); if (o) say(o.type); });
addEventListener('keydown', e => { const o = nextObs(); if (o && (e.code === 'Space' || e.key.toUpperCase() === o.type[0])) say(o.type); });
$('again').addEventListener('click', setup);
document.querySelectorAll('#styles a').forEach(a => { const q = new URLSearchParams(location.search); a.dataset.s ? q.set('style', a.dataset.s) : q.delete('style'); a.href = '?' + q; a.classList.toggle('on', (a.dataset.s || null) === STYLE); });

// ---------- תנועה ----------
function update(dt) {
  const o = nextObs();
  if (S.phase === 'run') {
    let want = RUN;
    if (o && !o.armed) want = Math.min(RUN, Math.max(0, (o.stop - S.s) * 1.3));     // מאטים ונעצרים לפני המכשול
    if (o && o.armed && o.type !== 'JUMP') want = Math.min(RUN, Math.max(1.2, (o.stop - S.s) * 2.5));
    if (!o && S.s > LEN - 5) want = Math.max(0, (LEN - 1.2 - S.s) * 1.5);
    S.speed += (want - S.speed) * Math.min(1, dt * 6);
    S.s += S.speed * dt;
    if (o && S.s >= o.stop - 0.05 && !(o.type === 'JUMP' && o.armed)) { S.s = Math.min(S.s, o.stop); }
    at(S.s, S.pos); S.y = S.pos.y;
    if (S.speed > 3.5) play('Running_A', 0.2, S.speed / RUN * 1.05); else if (S.speed > 0.4) play('Walking_A', 0.2, 1.2); else play('Idle', 0.25);
    if (AUTO && o && !o.armed && o.stop - S.s < o.show * 0.5) say(o.type);
    // התחלת הפעולה
    if (o && o.armed) {
      if (o.type === 'JUMP' && S.s >= o.s - 3.4) { S.phase = 'jump'; S.t = 0; S.j0 = S.s; S.j1 = o.s + 2.6; S.jv = Math.max(S.speed, 5.5); play('Jump_Full_Long', 0.1, 1.25); }
      else if (o.type === 'PUSH' && S.s >= o.stop - 0.08) { S.phase = 'push'; S.t = 0; S.speed = 0; play('Interact', 0.12, 1.1); }
      else if (o.type === 'CLIMB' && S.s >= o.stop - 0.08) { S.phase = 'climb'; S.t = 0; S.speed = 0; play('Walking_A', 0.15, 2.0); }
    }
    if (!o && !S.done && S.s > LEN - 1.6 && S.speed < 0.3) { S.done = true; S.phase = 'done'; play('Cheer', 0.2); setTimeout(() => { $('end').style.display = 'flex'; }, 1600); }
  } else if (S.phase === 'jump') {                         // קשת מעל הבול
    const dur = (S.j1 - S.j0) / S.jv; S.t += dt; const k = Math.min(1, S.t / dur);
    S.s = S.j0 + (S.j1 - S.j0) * k; at(S.s, S.pos); S.y = S.pos.y + Math.sin(Math.PI * k) * 1.55;
    if (k >= 1) { o.done = true; S.phase = 'run'; S.speed = RUN * 0.8; cur = null; play('Running_A', 0.15); }
  } else if (S.phase === 'push') {                         // דחיפה: הכנפיים נפתחות קדימה
    S.t += dt; const k = Math.max(0, Math.min(1, (S.t - 0.35) / 0.8)), e = 1 - (1 - k) * (1 - k);
    gateL.rotation.y = -1.45 * e; gateR.rotation.y = 1.45 * e;
    if (S.t > 1.15) { o.done = true; S.phase = 'run'; }
  } else if (S.phase === 'climb') {                        // טיפוס בסולם ואז צעד קדימה אל ראש הצוק
    S.t += dt; const up = Math.min(1, S.t / 1.9), fw = Math.max(0, Math.min(1, (S.t - 1.9) / 0.45));
    S.y = o.y0 + (o.y1 - o.y0) * up;
    at(o.stop, _a); at(o.top, _b); S.pos.lerpVectors(_a, _b, fw); S.s = o.stop + (o.top - o.stop) * fw;
    if (fw >= 1) { o.done = true; S.phase = 'run'; S.speed = 2; at(S.s, S.pos); S.y = S.pos.y; }
  }
  // כיוון הריצה (מוחלק) והצבת הדמות
  at(S.s + 0.6, _a); at(S.s - 0.6, _b); _a.sub(_b); _a.y = 0;
  if (_a.lengthSq() > 1e-6) S.fwd.lerp(_a.normalize(), Math.min(1, dt * 8)).normalize();
  ninja.position.set(S.pos.x, S.y, S.pos.z);
  ninja.rotation.y = Math.atan2(S.fwd.x, S.fwd.z);
  ninja.model.rotation.x = S.phase === 'climb' && S.t < 1.9 ? -0.22 : 0;       // נשען מעט אל הסולם
}

// ---------- מצלמה: זווית לכל קטע ----------
// היסטים במערכת של הנינג'ה: [קדימה, ימינה, למעלה] למיקום המצלמה ולנקודת המבט
const SHOTS = {
  front:  { p: [9.5, 3.5, 3.2],  l: [0, 0, 1.3] },       // מלפנים – פתיחה וסיום
  behind: { p: [-8.5, 0, 4.2],   l: [5, 0, 1.2] },       // מאחור – ריצה רגילה ושער
  side:   { p: [1.5, 10.5, 2.4], l: [1.5, 0, 1.1] },     // מהצד, כמו בארקייד – קפיצה
  threeq: { p: [-6.5, 6.5, 4.5], l: [3, -1.5, 1.2] },    // שלושת־רבעי – ליד הבית
  high:   { p: [-13, -2, 12],    l: [7, 0, 0] },         // מלמעלה – רואים את הדרך אל הצוק
  low:    { p: [-7.5, 2.6, 1.3], l: [1.5, 0, 3.6] },     // מלמטה – לפני הטיפוס
  crane:  { p: [-9, -4, 7],      l: [6, 0, 1.5] },       // אחרי הטיפוס – מתגלה השער האדום
};
// מאיזה x (של בלנדר) מתחילה כל זווית – תמיד הרבה לפני המכשול, כדי שהיא תהיה יציבה כשהמילה מופיעה
const ZONES = [[-99, 'front'], [1, 'behind'], [15, 'side'], [45, 'threeq'], [59, 'behind'], [88, 'high'], [98, 'low'], [123, 'crane'], [136, 'behind'], [151, 'front']];
const cam = { mode: null, from: null, k: 1, init: false, p: new THREE.Vector3(), l: new THREE.Vector3(), cp: [0, 0, 0], cl: [0, 0, 0] };
const up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(), tmp = new THREE.Vector3();
function placeCamera(dt) {
  const x = ninja.position.x; let mode = ZONES[0][1];
  for (const [zx, m] of ZONES) if (x >= zx) mode = m;
  if (mode !== cam.mode) { cam.from = { p: [...cam.cp], l: [...cam.cl] }; cam.mode = mode; cam.k = cam.init ? 0 : 1; }
  cam.k = Math.min(1, cam.k + dt / 2.2); const e = cam.k * cam.k * (3 - 2 * cam.k), T = SHOTS[mode];
  for (let i = 0; i < 3; i++) { cam.cp[i] = cam.from.p[i] + (T.p[i] - cam.from.p[i]) * e; cam.cl[i] = cam.from.l[i] + (T.l[i] - cam.from.l[i]) * e; }
  right.crossVectors(S.fwd, up).normalize();
  const base = tmp.set(S.pos.x, S.phase === 'jump' ? S.pos.y : S.y, S.pos.z);   // בקפיצה המצלמה לא קופצת עם הדמות
  const wp = new THREE.Vector3().copy(base).addScaledVector(S.fwd, cam.cp[0]).addScaledVector(right, cam.cp[1]); wp.y += cam.cp[2];
  const wl = new THREE.Vector3().copy(base).addScaledVector(S.fwd, cam.cl[0]).addScaledVector(right, cam.cl[1]); wl.y += cam.cl[2];
  wp.y = Math.max(wp.y, groundAt(wp.x, wp.z) + 1.0);                           // לא נכנסים לאדמה
  const f = cam.init ? Math.min(1, dt * 3.2) : 1; cam.p.lerp(wp, f); cam.l.lerp(wl, cam.init ? Math.min(1, dt * 5) : 1); cam.init = true;
  camera.position.copy(cam.p); camera.lookAt(cam.l);
  sun.target.position.copy(ninja.position); sun.position.copy(ninja.position).addScaledVector(SUN_DIR, -70);
}

// ---------- המילה על המסך ----------
const v = new THREE.Vector3();
function updateWord() {
  const o = nextObs(), tag = $('tag'), btn = $('say');
  const on = !!o && o.stop - S.s < o.show && S.phase === 'run' || (!!o && o.armed);
  if (on && !o.armed && btn.textContent !== o.type) { btn.textContent = tag.textContent = o.type; btn.classList.remove('ok'); tag.classList.remove('ok'); }
  btn.classList.toggle('on', !!on && !o.armed || (!!o && o.armed && S.phase !== 'run' && false));
  if (o && o.armed) btn.classList.add('on');
  if (!o || !on) { btn.classList.remove('on'); tag.style.display = 'none'; return; }
  v.copy(o.tagAt).project(camera);
  const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && S.phase === 'run';   // בזמן הפעולה עצמה התווית לא מסתירה את הדמות
  tag.style.display = vis ? 'block' : 'none';
  tag.style.left = (v.x + 1) / 2 * innerWidth + 'px'; tag.style.top = (1 - v.y) / 2 * innerHeight + 'px';
}

// ---------- לולאה ----------
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  for (let i = 0; i < TS; i++) { update(dt); mixer.update(dt); placeCamera(dt); }     // TS>1 רק לבדיקות (הרצה מהירה)
  updateWord();
  if (style) style.render(); else renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
