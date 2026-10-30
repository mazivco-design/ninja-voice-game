/* ============================================================
   village/3d/main3d.js – אב־טיפוס תלת־ממדי של פינה בכפר (three.js).
   סגנון "לואו־פולי": הכול בנוי מצורות פשוטות עם הצללה שטוחה.
   נינג'ה עם מפרקים (ירך/ברך, כתף/מרפק) והליכה, כלב שיבה שמלווה,
   ומצלמה חופשית: גרירה = סיבוב, שתי אצבעות = זום/סיבוב, נגיעה = הליכה.
   רק לבדוק תחושה – בלי קול, בלי משימות.
   ============================================================ */
import * as THREE from 'three';

// ---------- במה ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const SKY = 0xcfe6ee;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 30, 80);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 220);

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5c7a3c, 1.1));
const sun = new THREE.DirectionalLight(0xfff0d4, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// ---------- עזרים ----------
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const R = rng(2026);
const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, extra || {})));
  return matCache.get(key);
}
function mesh(geo, color, x, y, z, parent, extra) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}
const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cyl = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 8);
const Ico = (r, d) => new THREE.IcosahedronGeometry(r, d || 0);

// התנגשויות: עיגולים, מלבנים ואליפסות (על הקרקע, x/z)
const colliders = [];
const addCircle = (x, z, r) => colliders.push({ t: 'c', x, z, r });
const addBox = (x0, z0, x1, z1) => colliders.push({ t: 'b', x0, z0, x1, z1 });
const addEll = (x, z, rx, rz) => colliders.push({ t: 'e', x, z, rx, rz });
const PLAY = 20;           // גבולות האזור שאפשר ללכת בו

// גובה הקרקע: שטוח באזור המשחק, גבעות מסביב
function groundH(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (d < PLAY + 2) return 0;
  const k = d - PLAY - 2;
  return k * 0.42 + Math.sin(x * 0.21) * Math.cos(z * 0.17) * Math.min(k, 6) * 0.35;
}

// ---------- קרקע ----------
(function ground() {
  const S = 110, N = 80;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.max(Math.abs(x), Math.abs(z));
    p.setY(i, groundH(x, z) + (d > PLAY + 3 ? (R() - 0.5) * 0.35 : 0));
    const v = R();
    c.setHSL(0.27 + v * 0.03, 0.42 + v * 0.1, 0.36 + v * 0.06 + (d > PLAY + 3 ? -0.03 : 0));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.receiveShadow = true; m.name = 'ground';
  scene.add(m);
  // הרים רחוקים
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + R() * 0.3, d = 72 + R() * 12, h = 14 + R() * 14, r = 10 + R() * 8;
    const mtn = mesh(new THREE.ConeGeometry(r, h, 6), 0x7d93a0, Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d);
    mtn.castShadow = false;
    const cap = mesh(new THREE.ConeGeometry(r * 0.28, h * 0.28, 6), 0xeef3f6, mtn.position.x, h - 2 - h * 0.14, mtn.position.z);
    cap.castShadow = false;
  }
})();

// ---------- שבילים: סרט ברוחב משתנה לאורך עקומה ----------
function ribbon(pts, width, color, y, seed) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])));
  const N = Math.ceil(curve.getLength() * 3), v = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const nx = -tg.z, nz = tg.x, w = width * (1 + 0.13 * Math.sin(t * 19 + seed) + 0.06 * Math.sin(t * 57 + seed * 2)) / 2;
    v.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  m.receiveShadow = true; scene.add(m);
  return curve;
}
const PATHS = [
  [[-22, 7], [-12, 6.2], [-4, 4.4], [3, 4.8], [10, 6.5], [22, 5.6]],
  [[-7.5, 4.6], [-7.5, -0.6]],
  [[6.5, 5.6], [7.2, 1.6], [7, -1.4]],
  [[1, 4.6], [0.5, 9], [-2, 13], [-1.5, 22]],
  [[3, 4.8], [9, 0], [13.5, -7.5]]
];
const pathCurves = PATHS.map((p, i) => { ribbon(p, 2.6, 0x9e9172, 0.02, i); return ribbon(p, 2.1, 0xcfc4a7, 0.03, i + 7); });
// חצץ ואבנים על השבילים
pathCurves.forEach(c => {
  const L = c.getLength();
  for (let s = 0; s < L; s += 0.35) {
    if (R() < 0.45) continue;
    const p = c.getPointAt(s / L), r = 0.04 + R() * 0.07;
    const pb = mesh(Ico(r), R() < 0.5 ? 0x9d998e : 0xe9e2cf, p.x + (R() - 0.5) * 2, 0.035, p.z + (R() - 0.5) * 2);
    pb.scale.y = 0.4; pb.castShadow = false;
  }
});
function nearPath(x, z, pad) {
  for (const c of pathCurves) { const L = c.getLength(); for (let s = 0; s <= L; s += 0.5) { const p = c.getPointAt(s / L); if ((p.x - x) ** 2 + (p.z - z) ** 2 < pad * pad) return true; } }
  return false;
}

// ---------- גג יפני: פרופיל מעוקל שנמתח לאורך הבית ----------
function roofGeo(span, length, rise, thick, lift) {
  const D = span / 2, s = new THREE.Shape();
  s.moveTo(-D - 0.15, lift);
  s.quadraticCurveTo(-D * 0.5, -0.1, 0, rise);
  s.quadraticCurveTo(D * 0.5, -0.1, D + 0.15, lift);
  s.lineTo(D + 0.1, lift - thick);
  s.quadraticCurveTo(D * 0.5, -0.1 - thick, 0, rise - thick);
  s.quadraticCurveTo(-D * 0.5, -0.1 - thick, -D - 0.1, lift - thick);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -length / 2); g.rotateY(Math.PI / 2);
  return g;
}

// ---------- בית יפני ----------
function house(x, z, w, d, kind) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const H = 2.4, base = 0.4, thatch = kind === 'thatch';
  mesh(Box(w + 0.4, base, d + 0.4), 0x8f8b80, 0, base / 2, 0, g);
  mesh(Box(w + 0.8, 0.14, 1), 0x9b7550, 0, base + 0.07, d / 2 + 0.5, g);                 // מרפסת עץ
  mesh(Box(w, H, d), 0xefe6d0, 0, base + H / 2, 0, g);                                       // קירות
  mesh(Box(w + 0.02, 0.5, d + 0.02), 0x5c4433, 0, base + 0.25, 0, g);                       // לוח תחתון
  const cols = 4, cw = w / cols;
  for (let i = 0; i <= cols; i++) {                                                          // עמודים
    const px = -w / 2 + i * cw;
    mesh(Box(0.2, H, 0.2), 0x3a2a1e, px, base + H / 2, d / 2 + 0.02, g);
    mesh(Box(0.2, H, 0.2), 0x3a2a1e, px, base + H / 2, -d / 2 - 0.02, g);
  }
  mesh(Box(w + 0.1, 0.22, d + 0.1), 0x3a2a1e, 0, base + H - 0.11, 0, g);                   // קורה עליונה
  for (let i = 0; i < cols; i++) {                                                           // לוחות שוג'י
    const px = -w / 2 + (i + 0.5) * cw;
    if (i === 1 || i === 2) continue;
    mesh(Box(cw - 0.3, 1.4, 0.05), 0xf6eed8, px, base + 1.35, d / 2 + 0.03, g, { emissive: 0x3a2a10 });
    for (let k = 1; k < 3; k++) mesh(Box(0.035, 1.4, 0.07), 0xb8a888, px - (cw - 0.3) / 2 + (cw - 0.3) * k / 3, base + 1.35, d / 2 + 0.04, g);
    for (let k = 1; k < 4; k++) mesh(Box(cw - 0.3, 0.035, 0.07), 0xb8a888, px, base + 0.65 + 1.4 * k / 4, d / 2 + 0.04, g);
  }
  // כניסה עם וילון נורן
  mesh(Box(cw * 2 - 0.3, H - 0.3, 0.05), 0x2a1d14, 0, base + (H - 0.3) / 2, d / 2 + 0.03, g);
  for (let k = 0; k < 3; k++) mesh(Box((cw * 2 - 0.6) / 3 - 0.06, 0.9, 0.04), 0x25345e, -(cw * 2 - 0.6) / 3 + k * (cw * 2 - 0.6) / 3, base + H - 0.75, d / 2 + 0.08, g);
  mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 16), 0xe8e6e0, 0, base + H - 0.62, d / 2 + 0.11, g);
  mesh(Box(1.4, 0.18, 0.6), 0x9d998e, 0, 0.09, d / 2 + 1.25, g);                           // אבן כניסה
  // משולשי הגמלון
  const rise = thatch ? 2.3 : 1.7, thick = thatch ? 0.55 : 0.28, lift = thatch ? 0.15 : 0.35, tri = new THREE.Shape();
  // הגמלון הולך לפי הצד התחתון של הגג המעוקל (כדי שלא יבלוט דרכו)
  const D = (d + 1.9) / 2, under = t => { const u = 1 - t; return [u * u * (D + 0.1) + 2 * u * t * D * 0.5, u * u * (lift - thick) + 2 * u * t * (-0.1 - thick) + t * t * (rise - thick) - 0.15 - 0.06]; };
  tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0);
  const pts = []; for (let i = 0; i <= 24; i++) { const [ux, uy] = under(i / 24); if (ux <= d / 2) pts.push([ux, Math.max(0, uy)]); }
  pts.forEach(([ux, uy]) => tri.lineTo(ux, uy));
  pts.slice().reverse().forEach(([ux, uy]) => tri.lineTo(-ux, uy));
  tri.closePath();
  [-1, 1].forEach(sd => { const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }); tg.rotateY(Math.PI / 2); const t = mesh(tg, 0xe3d9c2, sd * w / 2 - (sd > 0 ? 0.1 : 0), base + H, 0, g); });
  // גג
  const rc = thatch ? 0x9c8452 : kind === 'tile2' ? 0x4a3f57 : 0x3f4757;
  mesh(roofGeo(d + 1.9, w + 1.3, rise, thatch ? 0.55 : 0.28, thatch ? 0.15 : 0.35), rc, 0, base + H - 0.15, 0, g);
  mesh(Box(w + 1.5, 0.3, 0.42), thatch ? 0x6b5a35 : 0x262b36, 0, base + H - 0.15 + rise + 0.08, 0, g);   // רכס
  if (!thatch) [-1, 1].forEach(sd => { const o = mesh(Box(0.25, 0.5, 0.3), 0x262b36, sd * (w / 2 + 0.75), base + H + rise + 0.1, 0, g); o.rotation.z = sd * 0.5; });
  // פנסים אדומים בפינות
  [-1, 1].forEach(sd => {
    const lx = sd * (w / 2 - 0.2), ly = base + H - 0.6;
    mesh(Cyl(0.01, 0.01, 0.4, 4), 0x2a1d14, lx, ly + 0.45, d / 2 + 0.6, g);
    mesh(new THREE.SphereGeometry(0.22, 10, 8), 0xdc2626, lx, ly, d / 2 + 0.6, g, { emissive: 0x7a1010 }).scale.y = 1.25;
    mesh(Cyl(0.13, 0.13, 0.06, 8), 0x1f2937, lx, ly + 0.27, d / 2 + 0.6, g);
    mesh(Cyl(0.13, 0.13, 0.06, 8), 0x1f2937, lx, ly - 0.27, d / 2 + 0.6, g);
  });
  addBox(x - w / 2 - 0.3, z - d / 2 - 0.3, x + w / 2 + 0.3, z + d / 2 + 0.6);
  return g;
}

// ---------- שער טוריי ----------
function torii(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1); scene.add(g);
  [-1.4, 1.4].forEach(px => { mesh(Cyl(0.17, 0.2, 3.3, 10), 0xc81e1e, px, 1.65, 0, g); mesh(Cyl(0.24, 0.24, 0.3, 10), 0x1f2937, px, 0.15, 0, g); });
  mesh(Box(3.5, 0.2, 0.22), 0xdc2626, 0, 2.55, 0, g);
  mesh(Box(0.16, 0.6, 0.2), 0xb91c1c, 0, 2.95, 0, g);
  const sh = new THREE.Shape();
  sh.moveTo(-2.3, 0.25); sh.quadraticCurveTo(0, -0.08, 2.3, 0.25); sh.lineTo(2.38, 0.5); sh.quadraticCurveTo(0, 0.18, -2.38, 0.5); sh.closePath();
  const kg = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: false, curveSegments: 12 }); kg.translate(0, 0, -0.18);
  mesh(kg, 0xdc2626, 0, 3.05, 0, g);
  const top = new THREE.Shape();
  top.moveTo(-2.38, 0.5); top.quadraticCurveTo(0, 0.18, 2.38, 0.5); top.lineTo(2.42, 0.64); top.quadraticCurveTo(0, 0.3, -2.42, 0.64); top.closePath();
  const tg = new THREE.ExtrudeGeometry(top, { depth: 0.4, bevelEnabled: false, curveSegments: 12 }); tg.translate(0, 0, -0.2);
  mesh(tg, 0x1f2937, 0, 3.05, 0, g);
  const k = s || 1; addCircle(x - 1.4 * k, z, 0.25 * k); addCircle(x + 1.4 * k, z, 0.25 * k);
}

// ---------- פנס אבן ----------
const glowMats = [];
function stoneLantern(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(Cyl(0.35, 0.42, 0.25, 6), 0x8e8b82, 0, 0.12, 0, g);
  mesh(Cyl(0.13, 0.16, 0.9, 6), 0x9d9a90, 0, 0.7, 0, g);
  mesh(Cyl(0.32, 0.25, 0.14, 6), 0x8e8b82, 0, 1.2, 0, g);
  const light = mesh(Box(0.36, 0.34, 0.36), 0xffd27a, 0, 1.44, 0, g, { emissive: 0xffb340 });
  glowMats.push(light.material);
  mesh(Box(0.44, 0.06, 0.44), 0x9d9a90, 0, 1.64, 0, g);
  const roof = mesh(new THREE.ConeGeometry(0.62, 0.42, 4), 0x7d7a72, 0, 1.88, 0, g); roof.rotation.y = Math.PI / 4;
  mesh(new THREE.SphereGeometry(0.09, 6, 5), 0x8e8b82, 0, 2.15, 0, g);
  addCircle(x, z, 0.38);
}

// ---------- עצים, במבוק, שיחים, סלעים ----------
const swayers = [];
function cherry(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, groundH(x, z), z); g.scale.setScalar(s); g.rotation.y = R() * 6; scene.add(g);
  const t = mesh(Cyl(0.13, 0.24, 2.1, 6), 0x4a2f24, 0, 1.05, 0, g); t.rotation.z = 0.08;
  const b1 = mesh(Cyl(0.06, 0.1, 1.2, 5), 0x4a2f24, 0.35, 2.1, 0, g); b1.rotation.z = -0.7;
  const b2 = mesh(Cyl(0.06, 0.1, 1.1, 5), 0x4a2f24, -0.3, 2.05, 0.1, g); b2.rotation.z = 0.75;
  const crown = new THREE.Group(); crown.position.y = 2.7; g.add(crown);
  [[0, 0.2, 0, 1.05], [-0.85, -0.1, 0.2, 0.75], [0.85, -0.05, -0.1, 0.8], [0.1, 0.55, -0.5, 0.7], [-0.3, 0.1, 0.75, 0.7], [0.45, -0.2, 0.7, 0.6]]
    .forEach(([cx, cy, cz, r], i) => mesh(Ico(r, 1), [0xf2a7c8, 0xe58ab0, 0xfbd3e4][i % 3], cx, cy, cz, crown));
  swayers.push({ o: crown, a: 0.025, ph: R() * 6 });
  // עלי כותרת על הקרקע
  if (Math.max(Math.abs(x), Math.abs(z)) < PLAY) for (let i = 0; i < 26; i++) {
    const a = R() * 6.28, d = R() * 2.2 * s, p = mesh(new THREE.CircleGeometry(0.05 + R() * 0.04, 5), R() < 0.5 ? 0xfbcfe8 : 0xf4a4c8, x + Math.cos(a) * d, 0.04, z + Math.sin(a) * d);
    p.rotation.x = -Math.PI / 2; p.castShadow = false;
  }
  if (Math.max(Math.abs(x), Math.abs(z)) < PLAY + 1) addCircle(x, z, 0.3 * s);
}
function pine(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, groundH(x, z), z); g.scale.setScalar(s); g.rotation.y = R() * 6; scene.add(g);
  let px = 0, py = 0;
  [[0.18, 1.0, 0.18], [0.14, 1.0, -0.3], [0.1, 0.9, 0.25]].forEach(([r, h, lean]) => {
    const seg = mesh(Cyl(r * 0.8, r, h, 6), 0x5a3a28, px + Math.sin(lean) * h / 2, py + h / 2, 0, g); seg.rotation.z = -lean;
    px += Math.sin(lean) * h; py += Math.cos(lean) * h * 0.98;
  });
  const pads = new THREE.Group(); g.add(pads);
  [[-0.9, 1.5, 0.2, 0.85], [0.9, 2.1, -0.2, 0.8], [0.1, 2.75, 0.1, 1.0], [0.25, 3.3, 0, 0.6]].forEach(([cx, cy, cz, r], i) => {
    const pd = mesh(Ico(r, 1), [0x1f4f33, 0x2f6b45, 0x3f8458][i % 3], cx, cy, cz, pads); pd.scale.y = 0.42;
  });
  swayers.push({ o: pads, a: 0.012, ph: R() * 6 });
  if (Math.max(Math.abs(x), Math.abs(z)) < PLAY + 1) addCircle(x, z, 0.3 * s);
}
function bamboo(cx, cz, n) {
  for (let i = 0; i < n; i++) {
    const x = cx + (R() - 0.5) * 2.4, z = cz + (R() - 0.5) * 2.4, h = 4.5 + R() * 2.5;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    mesh(Cyl(0.065, 0.075, h, 6), 0x6a9a3c, 0, h / 2, 0, g);
    for (let y = 0.8; y < h; y += 0.75 + R() * 0.2) mesh(Cyl(0.085, 0.085, 0.05, 6), 0x3f6b25, 0, y, 0, g);
    for (let k = 0; k < 5; k++) {
      const lf = mesh(new THREE.ConeGeometry(0.07, 0.75, 3), 0x4f8a2e, 0, h * (0.6 + k * 0.08), 0, g);
      lf.rotation.z = (k % 2 ? 1 : -1) * (1.0 + R() * 0.4); lf.rotation.y = R() * 6; lf.position.x = (k % 2 ? -1 : 1) * 0.3;
    }
    swayers.push({ o: g, a: 0.035, ph: R() * 6, z: true });
    addCircle(x, z, 0.12);
  }
}
function bush(x, z, s, flower) {
  const b = mesh(Ico(0.7 * s, 1), 0x2c6228, x, 0.35 * s, z); b.scale.y = 0.7;
  mesh(Ico(0.45 * s, 1), 0x3d7d33, x - 0.25 * s, 0.6 * s, z + 0.15 * s);
  if (flower) for (let i = 0; i < 7; i++) { const a = R() * 6.28; mesh(Ico(0.08, 0), 0xf472b6, x + Math.cos(a) * 0.55 * s, 0.4 * s + R() * 0.35 * s, z + Math.sin(a) * 0.5 * s); }
  addCircle(x, z, 0.55 * s);
}
function rock(x, z, s) {
  const r = mesh(new THREE.DodecahedronGeometry(s, 0), R() < 0.5 ? 0x8a867b : 0x9d998e, x, s * 0.35 + groundH(x, z), z);
  r.scale.set(1, 0.65, 0.9); r.rotation.set(R(), R() * 6, R());
  if (Math.max(Math.abs(x), Math.abs(z)) < PLAY + 1) addCircle(x, z, s * 0.85);
}

// ---------- בריכה עם דגי קוי ----------
const koi = [];
function pond(x, z, rx, rz) {
  const w = mesh(new THREE.CircleGeometry(1, 28), 0x2f6b82, x, 0.05, z); w.rotation.x = -Math.PI / 2; w.scale.set(rx, rz, 1); w.castShadow = false;
  const w2 = mesh(new THREE.CircleGeometry(1, 28), 0x4a8ea6, x - 0.3, 0.06, z - 0.3, scene, { transparent: true, opacity: 0.6 }); w2.rotation.x = -Math.PI / 2; w2.scale.set(rx * 0.7, rz * 0.6, 1); w2.castShadow = false;
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + R() * 0.1; rock(x + Math.cos(a) * (rx + 0.15), z + Math.sin(a) * (rz + 0.15), 0.22 + R() * 0.18); }
  [[0.55, 0.3, 0.9], [-0.5, -0.2, -0.6]].forEach(([u, v, ph]) => { const lp = mesh(new THREE.CircleGeometry(0.32, 10), 0x4b8f3b, x + u * rx, 0.08, z + v * rz); lp.rotation.x = -Math.PI / 2; });
  [0xf97316, 0xfafafa, 0xef4444].forEach((c, i) => {
    const f = new THREE.Group(); scene.add(f);
    const body = mesh(new THREE.SphereGeometry(0.16, 8, 6), c, 0, 0, 0, f); body.scale.set(1, 0.4, 2.2); body.castShadow = false;
    const tail = mesh(new THREE.ConeGeometry(0.12, 0.25, 4), c, 0, 0, -0.42, f); tail.rotation.x = -Math.PI / 2; tail.scale.y = 0.5;
    koi.push({ f, tail, x, z, rx: rx * [0.55, 0.4, 0.65][i], rz: rz * [0.55, 0.4, 0.65][i], sp: [0.5, -0.7, 0.35][i], a: i * 2 });
  });
  addEll(x, z, rx + 0.2, rz + 0.2);
}

// ---------- באר ----------
function well(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(Cyl(0.85, 0.9, 0.8, 10), 0x8f8b80, 0, 0.4, 0, g);
  const water = mesh(new THREE.CircleGeometry(0.68, 12), 0x1e3a4a, 0, 0.78, 0, g); water.rotation.x = -Math.PI / 2;
  [-0.8, 0.8].forEach(px => mesh(Box(0.14, 2.2, 0.14), 0x4a3527, px, 1.1, 0, g));
  mesh(Box(1.8, 0.1, 0.1), 0x5a3a1f, 0, 1.75, 0, g);
  mesh(roofGeo(1.9, 2.3, 0.7, 0.14, 0.15), 0x3f4757, 0, 2.15, 0, g).rotation.y = Math.PI / 2;
  mesh(Cyl(0.13, 0.11, 0.22, 8), 0x8b6b45, 0.2, 1.1, 0, g);
  addCircle(x, z, 0.95);
}

// ---------- צוק עם סולם (טעימה ל־CLIMB) ----------
function cliff(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  [[0, 1.6, 0, 2.6], [1.8, 1.1, 0.6, 1.9], [-1.7, 1.2, -0.4, 2.0], [0.4, 3.6, -0.6, 1.9], [-0.6, 5.0, -0.8, 1.3], [1.5, 3.2, -1.2, 1.5]]
    .forEach(([cx, cy, cz, r], i) => { const m = mesh(new THREE.DodecahedronGeometry(r, 0), [0x8a867b, 0x7d7a6f, 0x9a8f7a][i % 3], cx, cy, cz, g); m.rotation.set(i, i * 2, i * 0.5); m.scale.y = 1.15; });
  mesh(Ico(0.9, 1), 0x3f8458, -0.4, 6.0, -0.8, g).scale.y = 0.5;
  const pole = mesh(Cyl(0.03, 0.03, 1.6, 4), 0x5a3a1f, -0.5, 6.9, -0.8, g);
  const flag = mesh(Box(0.6, 0.35, 0.02), 0xdc2626, -0.2, 7.5, -0.8, g); swayers.push({ o: flag, a: 0.15, ph: 1, z: false, y: true });
  // סולם
  const lad = new THREE.Group(); lad.position.set(0.9, 0, 2.2); lad.rotation.x = -0.32; g.add(lad);
  [-0.3, 0.3].forEach(px => mesh(Box(0.08, 4.6, 0.08), 0x8b5e3c, px, 2.3, 0, lad));
  for (let y = 0.4; y < 4.5; y += 0.42) mesh(Box(0.6, 0.06, 0.06), 0x9c6c45, 0, y, 0, lad);
  addCircle(x, z, 3.2);
}

// ---------- הכפר ----------
house(-7.5, -3.5, 6, 4.2, 'tile');
house(7, -4.2, 5.6, 4, 'thatch');
well(2.2, 0.6);
pond(-11, 12, 3.6, 2.4);
torii(1.6, 12.5, 1);
[[-2.2, 2.2], [4.6, 2.6], [-1.6, 15], [4.4, 15], [10.5, 3.2], [-11.5, 3.4]].forEach(([x, z]) => stoneLantern(x, z));
cliff(15, -12);
bamboo(-16, -6, 12); bamboo(-3, -12, 10); bamboo(12, 14, 9);
[[-14, 1.5, 1], [-3.2, 9.2, 0.9], [13.5, 3.8, 1.05], [-17, 16, 1.1], [5.5, 9.5, 0.85]].forEach(([x, z, s]) => cherry(x, z, s));
[[-15.5, -13, 1.1], [3.5, -11, 1], [17, 7, 1.05], [-5, 18, 1], [10, 18.5, 0.95]].forEach(([x, z, s]) => pine(x, z, s));
for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 38, z = (R() - 0.5) * 38; if (!nearPath(x, z, 2.4) && !colliders.some(c => c.t === 'c' ? Math.hypot(c.x - x, c.z - z) < c.r + 1.4 : c.t === 'b' ? x > c.x0 - 1.2 && x < c.x1 + 1.2 && z > c.z0 - 1.2 && z < c.z1 + 1.2 : Math.hypot((x - c.x) / (c.rx + 1.2), (z - c.z) / (c.rz + 1.2)) < 1)) (R() < 0.6 ? bush(x, z, 0.7 + R() * 0.5, R() < 0.35) : rock(x, z, 0.3 + R() * 0.3)); }
// יער על הגבעות מסביב
for (let i = 0; i < 70; i++) {
  const a = R() * 6.28, d = 24 + R() * 18, x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (Math.abs(x) < 4 && z > 0) continue;             // משאירים פתח לשביל בדרום
  (R() < 0.7 ? pine : cherry)(x, z, 1 + R() * 0.6);
}
// פרחים ודשא
for (let i = 0; i < 160; i++) {
  const x = (R() - 0.5) * 40, z = (R() - 0.5) * 40;
  if (nearPath(x, z, 1.5)) continue;
  const tuft = mesh(new THREE.ConeGeometry(0.06, 0.28, 3), R() < 0.5 ? 0x3f7d2a : 0x6aa84a, x, 0.14, z); tuft.castShadow = false;
  if (R() < 0.25) { const f = mesh(Ico(0.07, 0), [0xf8fafc, 0xfde047, 0xf9a8d4, 0xc4b5fd][Math.floor(R() * 4)], x + 0.12, 0.25, z); f.castShadow = false; }
}

// ============================================================
//   הנינג'ה: שלד עם מפרקים
// ============================================================
const C = { body: 0x1e293b, limb: 0x111a2b, skin: 0xfcd9b6, accent: 0xdc2626 };
// SM = חומר חלק (לא מדורג) לדמות – כדורים נראים עגולים ולא "מגולפים"
const SM = { flatShading: false };
// איבר = צינור רציף (גליל שמצטמצם קצת) + כדור באותו עובי במפרק, כך שבכיפוף הוא נראה כמו צינור אחד ולא כמו חרוזים
function limb(parent, x, y, len, r, color, r2) {
  r2 = r2 || r * 0.9;
  const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
  mesh(new THREE.CylinderGeometry(r, r2, len, 14), color, 0, -len / 2, 0, pivot, SM);
  mesh(new THREE.SphereGeometry(r, 14, 10), color, 0, 0, 0, pivot, SM);
  const joint = new THREE.Group(); joint.position.y = -len; pivot.add(joint);
  mesh(new THREE.SphereGeometry(r2, 14, 10), color, 0, 0, 0, joint, SM);
  return { pivot, joint };
}
// הנינג'ה בפרופורציות של הדמות הדו־ממדית: ראש גדול ועגול, גוף קצר ורחב, רגליים וידיים קצרות ועבות
function buildNinja() {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const HIP = 0.4;
  const hips = { L: limb(body, -0.12, HIP, 0.2, 0.085, C.limb, 0.075), R: limb(body, 0.12, HIP, 0.2, 0.085, C.limb, 0.075) };
  const knees = { L: limb(hips.L.joint, 0, 0, 0.19, 0.075, C.limb, 0.07), R: limb(hips.R.joint, 0, 0, 0.19, 0.075, C.limb, 0.07) };
  [knees.L, knees.R].forEach(k => mesh(new THREE.SphereGeometry(0.085, 12, 8), C.limb, 0, -0.01, 0.04, k.joint, SM).scale.set(1, 0.6, 1.5));
  const torso = new THREE.Group(); torso.position.y = HIP; body.add(torso);
  mesh(new THREE.CapsuleGeometry(0.25, 0.1, 4, 14), C.body, 0, 0.22, 0, torso, SM).scale.set(1, 0.72, 0.78);
  mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.075, 18), C.accent, 0, 0.09, 0, torso, SM).scale.z = 0.8;
  const chest = new THREE.Group(); chest.position.y = 0.2; torso.add(chest);
  const arms = { L: limb(chest, -0.27, 0.17, 0.17, 0.068, C.limb, 0.06), R: limb(chest, 0.27, 0.17, 0.17, 0.068, C.limb, 0.06) };
  const fore = { L: limb(arms.L.joint, 0, 0, 0.15, 0.06, C.limb, 0.055), R: limb(arms.R.joint, 0, 0, 0.15, 0.06, C.limb, 0.055) };
  [fore.L, fore.R].forEach(f => mesh(new THREE.SphereGeometry(0.085, 12, 10), C.accent, 0, -0.03, 0, f.joint, SM));
  const head = new THREE.Group(); head.position.y = 0.2; chest.add(head);
  const HR = 0.36, HY = 0.3;
  mesh(new THREE.SphereGeometry(HR, 24, 18), C.body, 0, HY, 0, head, SM);
  // פס הפנים הבהיר והעיניים
  mesh(new THREE.SphereGeometry(HR + 0.006, 24, 8, Math.PI * 0.5 - 0.85, 1.7, Math.PI * 0.43, Math.PI * 0.15), C.skin, 0, HY, 0, head, SM);
  [-0.11, 0.11].forEach(ex => mesh(new THREE.SphereGeometry(0.042, 10, 8), 0x000000, ex, HY + 0.005, HR - 0.015, head, SM).scale.set(1, 1.25, 0.6));
  // סרט ראש וקשר מאחור
  const band = mesh(new THREE.TorusGeometry(HR - 0.02, 0.04, 8, 28), C.accent, 0, HY + 0.15, 0, head, SM); band.rotation.x = Math.PI / 2; band.scale.z = 1.4;
  mesh(new THREE.SphereGeometry(0.055, 10, 8), C.accent, 0, HY + 0.15, -HR + 0.02, head, SM);
  const tails = [-1, 1].map(sd => { const t = mesh(Box(0.055, 0.025, 0.3), C.accent, sd * 0.05, HY + 0.13, -HR - 0.14, head, SM); t.rotation.y = sd * 0.3; return t; });
  return { root, body, torso, chest, head, hips, knees, arms, fore, tails, x: 0, z: 8, dir: 0, phase: 0, speed: 0, target: null };
}
const ninja = buildNinja();
ninja.root.position.set(ninja.x, 0, ninja.z);
function poseNinja(n, dt, now) {
  const w = Math.min(1, n.speed / 3.5), ph = n.phase;
  const s = Math.sin(ph), c = Math.cos(ph);
  n.hips.L.pivot.rotation.x = s * 0.75 * w; n.hips.R.pivot.rotation.x = -s * 0.75 * w;
  n.knees.L.pivot.rotation.x = Math.max(0, -c) * 1.0 * w + 0.05; n.knees.R.pivot.rotation.x = Math.max(0, c) * 1.0 * w + 0.05;
  n.arms.L.pivot.rotation.x = -s * 0.75 * w; n.arms.R.pivot.rotation.x = s * 0.75 * w;
  n.arms.L.pivot.rotation.z = -0.28; n.arms.R.pivot.rotation.z = 0.28;
  n.fore.L.pivot.rotation.x = -0.25 - 0.6 * w; n.fore.R.pivot.rotation.x = -0.25 - 0.6 * w;
  n.body.position.y = Math.abs(Math.sin(ph)) * 0.05 * w + Math.sin(now / 700) * 0.008 * (1 - w);
  n.torso.rotation.x = 0.08 * w; n.head.rotation.x = -0.05 * w; n.chest.rotation.y = s * 0.12 * w;
  n.tails.forEach((t, i) => { t.rotation.x = 0.2 + Math.sin(now / 120 + i) * 0.15 * (0.3 + w); });
}

// ---------- הכלב (שיבה) ----------
function buildDog() {
  const root = new THREE.Group(); scene.add(root);
  const o = 0xd9822b, wht = 0xf5ecdc;
  const body = new THREE.Group(); body.position.y = 0.36; root.add(body);
  mesh(Box(0.32, 0.28, 0.62), o, 0, 0, 0, body);
  mesh(Box(0.24, 0.12, 0.5), wht, 0, -0.1, 0.02, body);
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.38); body.add(head);
  mesh(Box(0.3, 0.26, 0.28), o, 0, 0, 0, head);
  mesh(Box(0.18, 0.13, 0.16), wht, 0, -0.05, 0.19, head);
  mesh(Box(0.06, 0.05, 0.04), 0x111111, 0, -0.01, 0.28, head);
  [-0.08, 0.08].forEach(ex => mesh(Box(0.04, 0.04, 0.02), 0x111111, ex, 0.05, 0.145, head));
  [-0.1, 0.1].forEach(ex => { const e = mesh(new THREE.ConeGeometry(0.06, 0.14, 4), o, ex, 0.18, -0.02, head); e.rotation.y = Math.PI / 4; });
  const tail = mesh(new THREE.TorusGeometry(0.09, 0.04, 6, 10, Math.PI * 1.5), o, 0, 0.2, -0.33, body); tail.rotation.y = Math.PI / 2;
  const legs = [[-0.11, 0.22], [0.11, 0.22], [-0.11, -0.22], [0.11, -0.22]].map(([lx, lz]) => {
    const p = new THREE.Group(); p.position.set(lx, -0.08, lz); body.add(p);
    mesh(Box(0.08, 0.28, 0.08), o, 0, -0.14, 0, p); return p;
  });
  return { root, body, head, tail, legs, x: 1.5, z: 9.5, dir: Math.PI, phase: 0, speed: 0 };
}
const dog = buildDog();
dog.root.position.set(dog.x, 0, dog.z);

// ---------- תנועה והתנגשויות ----------
const NR = 0.34;
function resolve(x, z) {
  for (let it = 0; it < 3; it++) {
    for (const c of colliders) {
      if (c.t === 'c') {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + NR;
        if (d < m && d > 1e-6) { x = c.x + dx / d * m; z = c.z + dz / d * m; }
      } else if (c.t === 'b') {
        const cx = Math.max(c.x0, Math.min(c.x1, x)), cz = Math.max(c.z0, Math.min(c.z1, z));
        const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
        if (d < NR) {
          if (d > 1e-6) { x = cx + dx / d * NR; z = cz + dz / d * NR; }
          else { const l = x - c.x0, r = c.x1 - x, t = z - c.z0, b = c.z1 - z, m = Math.min(l, r, t, b); if (m === l) x = c.x0 - NR; else if (m === r) x = c.x1 + NR; else if (m === t) z = c.z0 - NR; else z = c.z1 + NR; }
        }
      } else {
        const ux = (x - c.x) / (c.rx + NR), uz = (z - c.z) / (c.rz + NR), d = Math.hypot(ux, uz);
        if (d < 1 && d > 1e-6) { x = c.x + ux / d * (c.rx + NR); z = c.z + uz / d * (c.rz + NR); }
      }
    }
    x = Math.max(-PLAY, Math.min(PLAY, x)); z = Math.max(-PLAY, Math.min(PLAY + 2, z));
  }
  return [x, z];
}
function turnTo(cur, want, k) { let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return cur + d * k; }

const keys = {};
const KEYMAP = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r', q: 'q', e: 'e', Q: 'q', E: 'e' };
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });

const SPEED = 4.2;
let stuckT = 0;
function updateNinja(dt, now) {
  const n = ninja;
  let mx = 0, mz = 0;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);           // "קדימה" לפי כיוון המצלמה
  const kf = (keys.u ? 1 : 0) - (keys.d ? 1 : 0), ks = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if (kf || ks) { n.target = null; marker.visible = false; mx = fx * kf - fz * ks; mz = fz * kf + fx * ks; noteMoved(); }
  else if (n.target) {
    const dx = n.target[0] - n.x, dz = n.target[1] - n.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { n.target = null; marker.visible = false; }
    else { mx = dx / d; mz = dz / d; }
  }
  const len = Math.hypot(mx, mz);
  const want = len ? SPEED : 0;
  n.speed += (want - n.speed) * Math.min(1, dt * 10);
  if (len && n.speed > 0.05) {
    const step = n.speed * dt;
    const [nx, nz] = resolve(n.x + mx / len * step, n.z + mz / len * step);
    const moved = Math.hypot(nx - n.x, nz - n.z);
    if (n.target && moved < step * 0.15) { stuckT += dt; if (stuckT > 0.4) { n.target = null; marker.visible = false; } } else stuckT = 0;
    n.x = nx; n.z = nz;
    n.dir = turnTo(n.dir, Math.atan2(mx, mz), Math.min(1, dt * 12));
  }
  n.phase += dt * n.speed * 3.4;
  n.root.position.set(n.x, 0, n.z); n.root.rotation.y = n.dir;
  poseNinja(n, dt, now);
}
function updateDog(dt, now) {
  const d = dog, n = ninja;
  const bx = n.x - Math.sin(n.dir) * 1.3 + Math.cos(n.dir) * 0.7, bz = n.z - Math.cos(n.dir) * 1.3 - Math.sin(n.dir) * 0.7;
  const dx = bx - d.x, dz = bz - d.z, dist = Math.hypot(dx, dz);
  const want = dist > 0.6 ? Math.min(6, 1.5 + dist * 1.8) : 0;
  d.speed += (want - d.speed) * Math.min(1, dt * 6);
  if (d.speed > 0.05 && dist > 0.05) {
    const [nx, nz] = resolve(d.x + dx / dist * d.speed * dt, d.z + dz / dist * d.speed * dt);
    d.x = nx; d.z = nz; d.dir = turnTo(d.dir, Math.atan2(dx, dz), Math.min(1, dt * 8));
  } else d.dir = turnTo(d.dir, Math.atan2(n.x - d.x, n.z - d.z), Math.min(1, dt * 3));
  d.phase += dt * (d.speed * 5 + 1);
  d.legs.forEach((l, i) => { l.rotation.x = Math.sin(d.phase + (i % 2 ^ (i > 1 ? 1 : 0)) * Math.PI) * 0.6 * Math.min(1, d.speed / 2); });
  d.tail.rotation.z = Math.sin(now / (d.speed > 0.3 ? 90 : 160)) * 0.5;
  d.body.position.y = 0.36 + Math.abs(Math.sin(d.phase)) * 0.03 * Math.min(1, d.speed / 2);
  d.head.rotation.x = Math.sin(now / 900) * 0.08;
  d.root.position.set(d.x, 0, d.z); d.root.rotation.y = d.dir;
}

// ---------- מצלמה: מסתובבת סביב הנינג'ה ----------
const cam = { yaw: 0, pitch: 0.72, dist: 15, tx: ninja.x, tz: ninja.z };
function placeCamera(dt) {
  cam.tx += (ninja.x - cam.tx) * Math.min(1, dt * 4); cam.tz += (ninja.z - cam.tz) * Math.min(1, dt * 4);
  if (keys.q) cam.yaw += dt * 1.6; if (keys.e) cam.yaw -= dt * 1.6;
  const ty = 1.0, cp = Math.cos(cam.pitch);
  camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.tx, ty, cam.tz);
  sun.position.set(cam.tx + 12, 24, cam.tz + 9); sun.target.position.set(cam.tx, 0, cam.tz);
}

// ---------- קלט מגע ----------
const hintEl = document.getElementById('hint');
let moved = false;
function noteMoved() { if (!moved) { moved = true; setTimeout(() => { hintEl.style.opacity = '0'; }, 2500); } }
const marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.06; marker.visible = false; scene.add(marker);
const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function tapAt(px, py) {
  const v = new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
  ray.setFromCamera(v, camera);
  if (!ray.ray.intersectPlane(groundPlane, hit)) return;
  const [x, z] = resolve(Math.max(-PLAY, Math.min(PLAY, hit.x)), Math.max(-PLAY, Math.min(PLAY + 2, hit.z)));
  ninja.target = [x, z]; marker.position.x = x; marker.position.z = z; marker.visible = true; marker.userData.t = 0;
  noteMoved();
}
const ptrs = new Map();
let gesture = null;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
  if (ptrs.size === 2) gesture = twoInfo();
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) p.drag = true;
    if (p.drag) { cam.yaw -= dx * 0.008; cam.pitch = Math.max(0.3, Math.min(1.25, cam.pitch + dy * 0.005)); noteMoved(); }
  } else if (ptrs.size === 2 && gesture) {
    const g = twoInfo();
    cam.dist = Math.max(6, Math.min(30, cam.dist * gesture.d / g.d));
    let da = g.a - gesture.a; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    cam.yaw -= da;
    gesture = g; ptrs.forEach(q => { q.drag = true; });
  }
});
function twoInfo() { const [a, b] = [...ptrs.values()]; return { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), a: Math.atan2(b.y - a.y, b.x - a.x) }; }
function endPtr(e) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) gesture = null;
  if (!p.drag && performance.now() - p.t < 450 && ptrs.size === 0) tapAt(e.clientX, e.clientY);
}
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', e => ptrs.delete(e.pointerId));
cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(6, Math.min(30, cam.dist * (1 + e.deltaY * 0.001))); }, { passive: false });

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- לולאה ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  updateNinja(dt, now); updateDog(dt, now); placeCamera(dt);
  swayers.forEach(s => { if (s.y) s.o.rotation.y = Math.sin(now / 400 + s.ph) * s.a; else { s.o.rotation.z = Math.sin(now / 1300 + s.ph) * s.a; if (s.z) s.o.rotation.x = Math.cos(now / 1700 + s.ph) * s.a * 0.6; } });
  koi.forEach(k => {
    const a = k.a + now / 1000 * k.sp, x = k.x + Math.cos(a) * k.rx, z = k.z + Math.sin(a) * k.rz;
    k.f.position.set(x, 0.035, z); k.f.rotation.y = Math.atan2(-Math.sin(a) * k.rx * k.sp, Math.cos(a) * k.rz * k.sp);
    k.tail.rotation.z = Math.sin(now / 150) * 0.4;
  });
  glowMats.forEach((m, i) => { m.emissiveIntensity = 0.85 + Math.sin(now / 170 + i) * 0.08; });
  if (marker.visible) { marker.userData.t = (marker.userData.t || 0) + dt; const k = (marker.userData.t % 0.9) / 0.9; marker.scale.setScalar(1 + k * 1.2); marker.material.opacity = 0.8 * (1 - k); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
placeCamera(1);
requestAnimationFrame(loop);

// לבדיקות בלבד
window.__v3d = { ninja, dog, cam, tapAt, colliders, goTo(x, z) { ninja.target = [x, z]; }, tp(x, z) { ninja.x = x; ninja.z = z; ninja.target = null; } };
