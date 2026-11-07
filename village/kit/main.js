/* ============================================================
   village/kit/main.js – דוגמה 3: העמק בתלת־ממד עם מודלים מוכנים.
   three.js + KayKit (CC0): Medieval Hexagon Pack (אריחים, בתים, טבע)
   ו־Adventurers (דמות "Rogue_Hooded" עם 76 אנימציות).
   העולם בנוי על רשת משושים; כל משושה = משבצת שאפשר לעמוד עליה או לא.
   הכלב מצויר בקוד (אין כלב בחבילות).
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- במה ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3f5);
scene.fog = new THREE.Fog(0xbfe3f5, 70, 190);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 400);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x6f7f52, 1.6));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// ---------- רשת משושים (חוד למעלה, שורות אי־זוגיות מוזזות) ----------
const S = 3.5;                                  // הגדלה של המודלים (משושה ברוחב 2 → 7)
const HX = 2 * S, HZ = Math.sqrt(3) * S;
const hexPos = (c, r) => ({ x: HX * (c + (r & 1) / 2), z: HZ * r });
const key = (c, r) => c + ',' + r;
function nbrs(c, r) {
  return (r & 1)
    ? [[c + 1, r], [c - 1, r], [c + 1, r - 1], [c, r - 1], [c + 1, r + 1], [c, r + 1]]
    : [[c + 1, r], [c - 1, r], [c, r - 1], [c - 1, r - 1], [c, r + 1], [c - 1, r + 1]];
}
function hexAt(x, z) {
  const r0 = Math.round(z / HZ); let best = null, bd = Infinity;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    const c = Math.round(x / HX - (r & 1) / 2);
    for (let cc = c - 1; cc <= c + 1; cc++) { const p = hexPos(cc, r), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = [cc, r]; } }
  }
  return best;
}
const DEG60 = Math.PI / 3;      // סיבוב של 60° נגד כיוון השעון (ממבט מלמעלה): מזרח → צפון־מזרח → ...

function rng(seed) { let s = seed; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const R = rng(2026);
const pick = a => a[Math.floor(R() * a.length)];

// ---------- תכנון העמק ----------
const C0 = -6, C1 = 40, R0 = -7, R1 = 7;
const cells = new Map();         // key → { tile, rot, block }
const props = [];                // { name, c, r, rot, sc, dx, dz }
for (let r = R0; r <= R1; r++) for (let c = C0; c <= C1; c++) cells.set(key(c, r), { c, r, tile: 'hex_grass', rot: 0, block: Math.abs(r) >= 3 || c <= C0 + 1 || c >= 34 });
const cell = (c, r) => cells.get(key(c, r));
const setTile = (c, r, tile, rot) => { const k = cell(c, r); if (k) { k.tile = tile; k.rot = rot || 0; } };
const prop = (name, c, r, o) => { props.push(Object.assign({ name, c, r, rot: 0, sc: 1, dx: 0, dz: 0 }, o)); if (!(o && o.walk)) { const k = cell(c, r); if (k) k.block = true; } };
const used = new Set();
const mark = (c, r) => used.add(key(c, r));

// הדרך הראשית: מערב → מזרח בשורה 0
for (let c = -2; c <= 32; c++) { setTile(c, 0, 'hex_road_A'); mark(c, 0); }
setTile(-3, 0, 'hex_road_M', Math.PI);                       // תחילת הדרך בכפר
setTile(33, 0, 'hex_road_M'); mark(33, 0); cell(33, 0).block = false;   // סוף הדרך – למרגלות ההר

// הכפר בהתחלה
prop('building_home_A_red', 0, -1, { rot: 0 });
prop('building_home_B_red', 2, -1, { rot: 0 });
prop('building_tavern_red', -2, -2, { rot: 0 });
prop('building_market_red', 1, 1, { rot: Math.PI });
prop('building_well_red', 3, 1, { rot: 0 });
prop('building_windmill_red', -1, 2, { rot: Math.PI });
prop('building_home_A_red', 4, -2, { rot: 0 });
['wheelbarrow', 'bucket_water'].forEach((n, i) => prop(n, 3 + i, -1 + i * 3 - 1, { sc: 1.4, walk: true, dx: 1.5, dz: 1.2 }));
for (let c = -4; c <= 5; c++) for (let r = -2; r <= 2; r++) mark(c, r);

// גדר עץ לרוחב העמק עם שער (PUSH). בחבילה הגדרות יושבות על הצלעות שבין המשושים,
// לכן הגדר עוברת בזיגזג לאורך הגבול; ההליכה נחסמת במעבר דרך צלע מגודרת.
const GATE = [8, 0];
const blockedEdges = new Set();
const ekey = (a, b) => key(...a) + '|' + key(...b);
const EDGE = { W: 0, SW: DEG60, NW: -DEG60 };       // סיבוב חלק הגדר לכל צלע (הצלע המערבית = בלי סיבוב)
function across(c, r, side) { const odd = r & 1; return side === 'W' ? [c - 1, r] : side === 'NW' ? (odd ? [c, r - 1] : [c - 1, r - 1]) : (odd ? [c, r + 1] : [c - 1, r + 1]); }
function fenceEdge(c, r, side, isGate) {
  if (!isGate) prop('fence_wood_straight', c, r, { rot: EDGE[side], walk: true });
  const nb = across(c, r, side); blockedEdges.add(ekey([c, r], nb)); blockedEdges.add(ekey(nb, [c, r]));
}
for (let r = -2; r <= 2; r++) {
  mark(GATE[0], r); mark(GATE[0] - 1, r);
  fenceEdge(GATE[0], r, 'W', r === 0);
  if (!(r & 1)) { fenceEdge(GATE[0], r, 'NW'); fenceEdge(GATE[0], r, 'SW'); }
}

// נהר שחוצה את העמק באלכסון (צפון־מזרח ← → דרום־מערב) עם גשר על הדרך
// צפונה – השכן הצפון־מזרחי, דרומה – השכן הדרום־מערבי
const RIVER = [];
{ let p = [16, 0]; const up = [p], down = [];
  let q = p; while (q[1] > R0) { q = (q[1] & 1) ? [q[0] + 1, q[1] - 1] : [q[0], q[1] - 1]; up.push(q); }
  q = p; while (q[1] < R1) { q = (q[1] & 1) ? [q[0], q[1] + 1] : [q[0] - 1, q[1] + 1]; down.push(q); }
  RIVER.push(...up, ...down); }
RIVER.forEach(([c, r]) => { const k = cell(c, r); if (!k) return; k.tile = 'hex_river_A'; k.rot = DEG60; k.block = true; mark(c, r); k.river = true; });
const BRIDGE = [16, 0];
cell(...BRIDGE).block = false;
prop('building_bridge_A', BRIDGE[0], BRIDGE[1], { rot: Math.PI / 2, walk: true });

// צומת: דרך צדדית לצפון־מזרח שנגמרת במבוי סתום עם תיבה
const JUNC = [22, 0];
setTile(JUNC[0], JUNC[1], 'hex_road_E');
setTile(22, -1, 'hex_road_A', DEG60); mark(22, -1);
setTile(23, -2, 'hex_road_M', DEG60); mark(23, -2);
const CHEST = [23, -2];
prop('crate_open', CHEST[0], CHEST[1], { sc: 1.6, walk: true, dx: 1.2, dz: -0.9 });
mark(24, -2); mark(22, -2);

// למרגלות ההר: סולם (בהמשך – CLIMB)
prop('ladder', 33, 0, { sc: 2.2, walk: true, dx: 2.6, rot: -Math.PI / 2 });

// הרים וגבעות בשוליים
for (const k of cells.values()) {
  if (used.has(key(k.c, k.r)) || k.river) continue;
  const ar = Math.abs(k.r);
  if (k.c >= 34) continue;
  if (ar === 3 || (k.c <= C0 + 1 && ar < 3)) prop(pick(['hills_A_trees', 'hills_B_trees', 'hills_C_trees', 'mountain_A_grass_trees', 'mountain_B_grass_trees']), k.c, k.r, { rot: Math.floor(R() * 6) * DEG60, sc: 1.1 + R() * 0.3 });
  else if (ar >= 4 && R() < 0.85) prop(pick(['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'mountain_A_grass', 'mountain_B', 'mountain_C']), k.c, k.r, { rot: Math.floor(R() * 6) * DEG60, sc: 1.3 + (ar - 4) * 0.25 + R() * 0.3 });
  else if (ar === 2 && R() < 0.55) prop(pick(['trees_A_medium', 'trees_B_medium', 'trees_A_small', 'trees_B_small', 'tree_single_A', 'tree_single_B']), k.c, k.r, { rot: Math.floor(R() * 6) * DEG60 });
  else if (ar === 1 && R() < 0.12) prop(pick(['tree_single_A', 'tree_single_B', 'rock_single_A', 'rock_single_C']), k.c, k.r, { rot: R() * 6, dx: (R() - 0.5) * 3, dz: (R() - 0.5) * 2 });
}
// ההר הגדול בסוף העמק
prop('mountain_A_grass_trees', 37, 0, { sc: 4.2, rot: 0 });
prop('mountain_C_grass', 36, -3, { sc: 3.2, rot: DEG60 });
prop('mountain_B_grass_trees', 36, 3, { sc: 3.4, rot: 2 * DEG60 });
prop('cloud_big', 10, -5, { sc: 2, walk: true, dy: 26 }); prop('cloud_small', 24, 4, { sc: 2, walk: true, dy: 30 }); prop('cloud_big', 34, -2, { sc: 2.4, walk: true, dy: 34 });

// ---------- טעינה ----------
const loader = new GLTFLoader();
const names = new Set([...[...cells.values()].map(k => k.tile), ...props.map(p => p.name), 'fence_wood_straight_gate']);
const tpl = {};
const loadOne = n => new Promise((ok, no) => loader.load('assets/hex/' + n + '.gltf', g => { tpl[n] = g.scene; ok(); }, undefined, no));
const loadChar = () => new Promise((ok, no) => loader.load('assets/char/Rogue_Hooded.glb', ok, undefined, no));

const Y = new THREE.Vector3(0, 1, 0);
function matFor(x, y, z, rot, sx, sy, sz) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, rot), new THREE.Vector3(sx, sy, sz));
}
// כל סוג מודל נבנה כ־InstancedMesh אחד – מהיר גם באייפד
function buildInstances(list) {
  const by = new Map();
  list.forEach(it => { if (!by.has(it.name)) by.set(it.name, []); by.get(it.name).push(it.m); });
  const tmp = new THREE.Matrix4();
  for (const [n, ms] of by) {
    const t = tpl[n]; t.updateMatrixWorld(true);
    t.traverse(o => {
      if (!o.isMesh) return;
      let geo = o.geometry;
      if (n.startsWith('hex_road') || n === 'hex_grass') {           // כל הנורמלים למעלה והשפה בצבע הדשא – בלי קווי משושים
        // השיפוע בשולי כל משושה (נורמל אלכסוני) מורם לגובה פני הקרקע ונצבע בדשא – כך המשושים מתחברים בלי קווים
        geo = geo.clone(); const nr = geo.attributes.normal, ps = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < nr.count; i++) { const ny = nr.getY(i); if (ny > 0.5 && ny < 0.9) { nr.setXYZ(i, 0, 1, 0); uv.setXY(i, GRASS_UV[0], GRASS_UV[1]); } if (ps.getY(i) > -0.06) ps.setY(i, 0); }
        ps.needsUpdate = true;
        nr.needsUpdate = uv.needsUpdate = true;
      }
      const im = new THREE.InstancedMesh(geo, o.material, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, tmp.multiplyMatrices(m, o.matrixWorld)));
      im.castShadow = !n.startsWith('hex_'); im.receiveShadow = true;
      scene.add(im);
    });
  }
}

let ninja, dog, gate, mixer, acts = {}, cur = null, gMesh = null, GRASS_UV = [0, 0];
const state = { gateOpen: false, chest: false, busy: 0 };

Promise.all([...[...names].map(loadOne), loadChar()]).then(([...res]) => {
  const g = res[res.length - 1];
  greener();
  // צבע הדשא: נקודת הטקסטורה של פני אריח הדשא (לא השפה שלו)
  tpl.hex_grass.traverse(o => { if (o.isMesh && !gMesh) gMesh = o; });
  { const ga = gMesh.geometry.attributes; for (let i = 0; i < ga.position.count; i++) if (ga.normal.getY(i) > 0.99 && ga.position.getY(i) > -0.01) { GRASS_UV = [ga.uv.getX(i), ga.uv.getY(i)]; break; } }
  const list = [];
  // דשא ודרך: משושים "מוחלקים" (בלי קווי שוליים) – נראים כקרקע אחת רציפה; הנהר נשאר עם גדות
  for (const k of cells.values()) { const p = hexPos(k.c, k.r); list.push({ name: k.tile, m: matFor(p.x, 0, p.z, k.rot, S * 1.004, S, S * 1.004) }); }   // חפיפה זעירה – בלי קווי תפר
  props.forEach(q => { const p = hexPos(q.c, q.r); const s = S * q.sc; list.push({ name: q.name, m: matFor(p.x + q.dx, q.dy || 0, p.z + q.dz, q.rot, (q.sx ? q.sx / 1.13 : 1) * s, s, s) }); });
  buildInstances(list);
  // קרקע רחוקה מתחת לכל המפה (שלא ייראה "סוף העולם")
  // קרקע רחוקה מסביב למפה: אותו חומר ואותו צבע כמו הדשא
  const pg = new THREE.PlaneGeometry(900, 900);
  for (let i = 0; i < pg.attributes.uv.count; i++) pg.attributes.uv.setXY(i, GRASS_UV[0], GRASS_UV[1]);
  const far = new THREE.Mesh(pg, gMesh.material);
  far.rotation.x = -Math.PI / 2; far.position.set(120, -0.45, 0); far.receiveShadow = true; scene.add(far);

  // השער (לבד, כי הוא זז)
  const gp = hexPos(...GATE);
  gate = tpl.fence_wood_straight_gate.clone(); gate.position.set(gp.x, 0, gp.z); gate.scale.setScalar(S); scene.add(gate);
  gate.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  gate.door = gate.getObjectByName('fence_wood_straight_door');
  while (gate.door.parent !== gate && gate.door.parent.children.length === 1 && !gate.door.parent.isScene) gate.door = gate.door.parent;

  // הנינג'ה: Rogue_Hooded בלי כלי נשק
  ninja = { root: g.scene, x: 0, z: 0, dir: Math.PI / 2, speed: 0, path: [], target: null };
  const hide = /knife|dagger|crossbow|sword|axe|bow|shield|staff|wand|mug|quiver|arrow|throwable|spellbook/i;
  g.scene.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { if (hide.test(o.name)) o.visible = false; o.castShadow = true; o.frustumCulled = false; } });
  const box = new THREE.Box3().setFromObject(g.scene); const h = box.max.y - box.min.y;
  g.scene.scale.setScalar(2.1 / h);
  scene.add(g.scene);
  const sp = hexPos(-1, 0); ninja.x = sp.x; ninja.z = sp.z;
  mixer = new THREE.AnimationMixer(g.scene);
  g.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); });
  ['Interact', 'PickUp', 'Cheer', 'Jump_Full_Short'].forEach(n => { if (acts[n]) { acts[n].setLoop(THREE.LoopOnce); acts[n].clampWhenFinished = true; } });
  play('Idle');
  mixer.addEventListener('finished', () => { state.busy = 0; play(ninja.speed > 0.3 ? 'Walking_A' : 'Idle'); });

  dog = buildDog(); dog.x = ninja.x - 2; dog.z = ninja.z + 1.5;
  window.__kit = { ninja, dog, cells, hexPos, hexAt, goTo, openGate, acts, state, camera, cam, names: Object.keys(acts), tp };
  requestAnimationFrame(loop);
}).catch(e => { console.error(e); document.getElementById('err').style.display = 'flex'; });

// גוון: הדשא בחבילה צהבהב מאוד – מזיזים אותו לירוק (רק פיקסלים ירקרקים־צהובים בטקסטורה המשותפת)
function greener() {
  let tex = null; const mats = [];
  Object.values(tpl).forEach(t => t.traverse(o => { if (o.isMesh && o.material.map) { mats.push(o.material); tex = tex || o.material.map; } }));
  if (!tex) return;
  const img = tex.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const r = a[i], gg = a[i + 1], b = a[i + 2]; if (gg >= r * 0.92 && gg > b * 1.6 && gg > 90) { a[i] = r * 0.74; a[i + 1] = gg * 0.97; } }
  x.putImageData(d, 0, 0);
  const nt = new THREE.CanvasTexture(cv); nt.flipY = tex.flipY; nt.colorSpace = tex.colorSpace; nt.magFilter = tex.magFilter; nt.minFilter = tex.minFilter; nt.wrapS = tex.wrapS; nt.wrapT = tex.wrapT;
  mats.forEach(m => { m.map = nt; m.needsUpdate = true; });
}

function play(n, fade = 0.2) {
  const a = acts[n]; if (!a || cur === a) return;
  if (a.loop === THREE.LoopOnce) { clearTimeout(play.t); play.t = setTimeout(() => { state.busy = 0; }, a.getClip().duration * 1000 + 600); }   // ליתר ביטחון
  a.reset().fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a;
}

// ---------- הכלב (מצויר בקוד) ----------
function buildDog() {
  const root = new THREE.Group(); scene.add(root);
  const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const box = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const o = 0xd9822b, wht = 0xf5ecdc, k = 1.5;
  const body = new THREE.Group(); body.position.y = 0.36 * k; body.scale.setScalar(k); root.add(body);
  box(0.32, 0.28, 0.62, o, 0, 0, 0, body); box(0.24, 0.12, 0.5, wht, 0, -0.1, 0.02, body);
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.38); body.add(head);
  box(0.3, 0.26, 0.28, o, 0, 0, 0, head); box(0.18, 0.13, 0.16, wht, 0, -0.05, 0.19, head); box(0.06, 0.05, 0.04, 0x111111, 0, -0.01, 0.28, head);
  [-0.08, 0.08].forEach(ex => box(0.04, 0.04, 0.02, 0x111111, ex, 0.05, 0.145, head));
  [-0.1, 0.1].forEach(ex => box(0.07, 0.12, 0.05, o, ex, 0.18, -0.02, head));
  const tail = box(0.06, 0.06, 0.24, o, 0, 0.16, -0.36, body); tail.rotation.x = 0.7;
  const legs = [[-0.11, 0.22], [0.11, 0.22], [-0.11, -0.22], [0.11, -0.22]].map(([lx, lz]) => { const p = new THREE.Group(); p.position.set(lx, -0.08, lz); body.add(p); box(0.08, 0.28, 0.08, o, 0, -0.14, 0, p); return p; });
  return { root, body, tail, legs, x: 0, z: 0, dir: 0, phase: 0, speed: 0 };
}

// ---------- הליכה: מסלול על המשושים (BFS) ----------
const free = (c, r) => { const k = cell(c, r); return k && !k.block; };
function bfs(a, b) {
  const ka = key(...a), kb = key(...b);
  if (!free(...b)) return null;
  const prev = new Map([[ka, null]]), q = [a];
  while (q.length) {
    const p = q.shift(), kp = key(...p);
    if (kp === kb) { const out = []; let k = kp; while (k) { out.unshift(k.split(',').map(Number)); k = prev.get(k); } return out; }
    for (const n of nbrs(...p)) { const kn = key(...n); if (!prev.has(kn) && free(...n) && !blockedEdges.has(ekey(p, n))) { prev.set(kn, kp); q.push(n); } }
  }
  return null;
}
// אם לוחצים על משבצת חסומה – הולכים לשכנה הפנויה הקרובה
function goTo(x, z) {
  let h = hexAt(x, z);
  if (!free(...h)) { let best = null, bd = Infinity; for (const n of nbrs(...h)) if (free(...n)) { const p = hexPos(...n), d = (p.x - ninja.x) ** 2 + (p.z - ninja.z) ** 2; if (d < bd) { bd = d; best = n; } } if (!best) return false; h = best; const p = hexPos(...h); x = p.x; z = p.z; }
  const path = bfs(hexAt(ninja.x, ninja.z), h); if (!path) return false;
  ninja.path = path.slice(1, -1).map(([c, r]) => { const p = hexPos(c, r); return [p.x, p.z]; });
  ninja.path.push([x, z]);
  return true;
}
function tp(c, r) { const p = hexPos(c, r); ninja.x = p.x; ninja.z = p.z; ninja.path = []; dog.x = p.x - 2; dog.z = p.z; }
const turnTo = (cur, want, k) => { let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return cur + d * k; };

function updateNinja(dt) {
  const n = ninja; let mx = 0, mz = 0;
  if (n.path.length && !state.busy) {
    const [tx, tz] = n.path[0], dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.4 && n.path.length > 1) n.path.shift();
    else if (d < 0.12) n.path.shift();
    else { mx = dx / d; mz = dz / d; }
  }
  const want = mx || mz ? 5.2 : 0;
  n.speed += (want - n.speed) * Math.min(1, dt * 8);
  if (mx || mz) {
    const nx = n.x + mx * n.speed * dt, nz = n.z + mz * n.speed * dt;
    const h0 = hexAt(n.x, n.z), h1 = hexAt(nx + mx * 0.7, nz + mz * 0.7);     // בודקים קצת קדימה, שהגוף לא ייכנס לגדר
    const ok = free(...h1) && (key(...h0) === key(...h1) || !blockedEdges.has(ekey(h0, h1)));
    if (ok) { n.x = nx; n.z = nz; } else n.path = [];
    n.dir = turnTo(n.dir, Math.atan2(mx, mz), Math.min(1, dt * 10));
  }
  if (!state.busy) play(n.speed > 0.6 ? 'Walking_A' : 'Idle');
  if (acts.Walking_A) acts.Walking_A.timeScale = Math.max(0.6, n.speed / 3.6);
  n.root.position.set(n.x, 0, n.z); n.root.rotation.y = n.dir;
}
function updateDog(dt, now) {
  const d = dog, n = ninja;
  const bx = n.x - Math.sin(n.dir) * 2 + Math.cos(n.dir) * 1.1, bz = n.z - Math.cos(n.dir) * 2 - Math.sin(n.dir) * 1.1;
  const dx = bx - d.x, dz = bz - d.z, dist = Math.hypot(dx, dz);
  const want = dist > 0.8 ? Math.min(8, 2 + dist * 2) : 0;
  d.speed += (want - d.speed) * Math.min(1, dt * 6);
  if (d.speed > 0.05 && dist > 0.05) { d.x += dx / dist * d.speed * dt; d.z += dz / dist * d.speed * dt; d.dir = turnTo(d.dir, Math.atan2(dx, dz), Math.min(1, dt * 8)); }
  else d.dir = turnTo(d.dir, Math.atan2(n.x - d.x, n.z - d.z), Math.min(1, dt * 3));
  d.phase += dt * (d.speed * 4 + 1);
  d.legs.forEach((l, i) => { l.rotation.x = Math.sin(d.phase + ((i % 2) ^ (i > 1 ? 1 : 0)) * Math.PI) * 0.6 * Math.min(1, d.speed / 2); });
  d.tail.rotation.y = Math.sin(now / (d.speed > 0.3 ? 90 : 160)) * 0.5;
  d.root.position.set(d.x, 0, d.z); d.root.rotation.y = d.dir;
}

// ---------- מכשולים ----------
const wordEl = document.getElementById('word'), msgEl = document.getElementById('msg');
function msg(t) { msgEl.textContent = t; msgEl.style.opacity = '1'; clearTimeout(msg.t); msg.t = setTimeout(() => { msgEl.style.opacity = '0'; }, 2200); }
function near(c, r, d) { const p = hexPos(c, r); return Math.hypot(ninja.x - p.x, ninja.z - p.z) < d; }
function openGate() {
  if (state.gateOpen) return;
  if (!near(...GATE, 17)) { msg('צריך להתקרב לשער'); return; }
  state.gateOpen = true; state.busy = 1; ninja.path = [];
  const gp = hexPos(...GATE); ninja.dir = Math.atan2(gp.x - ninja.x, gp.z - ninja.z);
  play('Interact', 0.15);
  wordEl.textContent = 'PUSH ✓'; wordEl.classList.add('ok');
  setTimeout(() => { state.gateSwing = 0.001; const nb = across(...GATE, 'W'); blockedEdges.delete(ekey(GATE, nb)); blockedEdges.delete(ekey(nb, GATE)); }, 450);
  setTimeout(() => { wordEl.style.display = 'none'; }, 1800);
}
wordEl.addEventListener('pointerdown', e => { e.stopPropagation(); openGate(); });

// ---------- מצלמה ----------
const cam = { yaw: -Math.PI / 2 - 0.35, pitch: 0.55, dist: 22 };
const camLook = new THREE.Vector3();
function placeCamera(dt) {
  camLook.lerp(new THREE.Vector3(ninja.x, 1.6, ninja.z), Math.min(1, dt * 5));
  const cp = Math.cos(cam.pitch);
  camera.position.set(camLook.x + Math.sin(cam.yaw) * cp * cam.dist, camLook.y + Math.sin(cam.pitch) * cam.dist, camLook.z + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(camLook);
  sun.position.set(ninja.x + 18, 40, ninja.z + 14); sun.target.position.set(ninja.x, 0, ninja.z);
}

// נגיעה = הליכה; גרירה = סיבוב
const ptrs = new Map(); let pinch = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
renderer.domElement.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.dist }; } });
renderer.domElement.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2 && pinch) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; cam.dist = Math.max(8, Math.min(45, pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))); p.moved = true; return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10) p.moved = true;
  if (p.moved) { cam.yaw -= dx * 0.006; cam.pitch = Math.max(0.15, Math.min(1.25, cam.pitch + dy * 0.004)); }
});
function endPtr(e) {
  const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
  if (!p || p.moved || !ninja || ptrs.size) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(plane, hit)) {
    if (!state.chest && near(...CHEST, 30) && Math.hypot(hit.x - hexPos(...CHEST).x, hit.z - hexPos(...CHEST).z) < 3.5) { goTo(hit.x, hit.z); state.wantChest = true; }
    else goTo(hit.x, hit.z);
    document.getElementById('hint').style.opacity = '0';
  }
}
renderer.domElement.addEventListener('pointerup', endPtr);
renderer.domElement.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; });
addEventListener('wheel', e => { cam.dist = Math.max(8, Math.min(45, cam.dist * (1 + e.deltaY * 0.001))); });

// ---------- לולאה ----------
const clock = new THREE.Clock(); const v = new THREE.Vector3();
function loop() {
  const dt = Math.min(0.05, clock.getDelta()), now = performance.now();
  updateNinja(dt); updateDog(dt, now); mixer.update(dt);
  // השער נפתח בסיבוב על הציר
  if (state.gateSwing && state.gateSwing < 1) { state.gateSwing = Math.min(1, state.gateSwing + dt * 1.4); gate.door.rotation.y = Math.sin(state.gateSwing * Math.PI / 2) * 1.7; }
  // התיבה במבוי הסתום
  if (state.wantChest && !state.chest && near(...CHEST, 3.2)) { state.chest = true; state.busy = 1; ninja.path = []; play('PickUp', 0.15); msg('מצאת תיבה! 🎁'); setTimeout(() => { state.busy = 1; play('Cheer', 0.2); }, 1300); }
  placeCamera(dt);
  // המילה מעל השער
  if (!state.gateOpen || wordEl.classList.contains('ok')) {
    const gp = hexPos(...GATE); v.set(gp.x - S, 3.4, gp.z).project(camera);
    const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && near(...GATE, 45);
    wordEl.style.display = on && !(state.gateOpen && !wordEl.classList.contains('ok')) ? 'block' : 'none';
    wordEl.style.left = (v.x + 1) / 2 * innerWidth + 'px'; wordEl.style.top = (1 - v.y) / 2 * innerHeight + 'px';
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
