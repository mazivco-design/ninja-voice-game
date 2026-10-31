/* ============================================================
   village/3d/main3d.js – אב־טיפוס תלת־ממדי של פינה בכפר (three.js).
   סגנון "לואו־פולי": הכול בנוי מצורות פשוטות עם הצללה שטוחה.
   נינג'ה עם מפרקים (ירך/ברך, כתף/מרפק) והליכה, כלב שיבה שמלווה,
   ומצלמה חופשית: גרירה = סיבוב, שתי אצבעות = זום/סיבוב, נגיעה = הליכה.
   רק לבדוק תחושה – בלי קול, בלי משימות.
   ============================================================ */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- במה ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const SKY = 0xbfe0ef;                       // צבע האופק (וגם צבע הערפל הקרוב)
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
// שמיים של בוקר בהיר: כיפה עם מעבר מכחול עמוק למעלה לבהיר באופק
(function skyDome() {
  const g = new THREE.SphereGeometry(1000, 32, 20), p = g.attributes.position, cols = [], c = new THREE.Color();
  const top = new THREE.Color(0x2f7fd0), mid = new THREE.Color(0x6fb3e6), hor = new THREE.Color(SKY);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 1000;
    if (y < 0) c.copy(hor); else if (y < 0.18) c.copy(hor).lerp(mid, y / 0.18); else c.copy(mid).lerp(top, Math.min(1, (y - 0.18) / 0.6));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.name = 'sky'; m.renderOrder = -1; m.userData.dyn = true; m.onBeforeRender = (r, sc, cam2) => m.position.copy(cam2.position);
  scene.add(m);
})();
scene.fog = new THREE.Fog(SKY, 40, 135);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1100);

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
// ============================================================
//   המסלול: עמק צר ומתפתל מהכפר (בדרום) אל ההר (בצפון, z שלילי).
//   צומת א: שתי דרכים (שמאל/ימין) שנפגשות שוב. צומת ב: דרך צדדית למבוי סתום עם תיבה.
//   אפשר ללכת רק בתוך העמק (רוחב CORR מכל צד של השביל) ובתוך רחבת הכפר.
// ============================================================
const PLAY = 150;                    // (לתאימות: מעל זה אין התנגשויות)
const CORR = 5.5;                    // חצי רוחב העמק
const VILLAGE = { x: 0, z: 4, r: 19 };
const BOX = { x0: -45, x1: 45, z0: -150, z1: 30 };
const ROUTE = {
  main1:  [[0, 14], [1, 4.6], [3, -6], [2, -16], [0, -26], [-3, -36], [-1, -44], [0, -48]],
  left:   [[0, -48], [-9, -56], [-13, -66], [-8, -76], [0, -82]],
  right:  [[0, -48], [9, -56], [12, -66], [7, -75], [0, -82]],
  main2:  [[0, -82], [-2, -92], [1, -102], [0, -108]],
  dead:   [[0, -108], [10, -110], [18, -116], [21, -122]],
  main3:  [[0, -108], [-3, -118], [-1, -130], [0, -141]]
};
const CHEST_AT = [21.5, -123.5];
// דגימה של כל השבילים + רשת חיפוש מהירה למרחק
const RPTS = [];
Object.values(ROUTE).forEach(pts => {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])));
  const L = c.getLength();
  for (let s = 0; s <= L; s += 0.7) { const q = c.getPointAt(s / L); RPTS.push([q.x, q.z]); }
});
const RG = 6, rgrid = new Map();
RPTS.forEach(p => { const k = Math.floor(p[0] / RG) + ',' + Math.floor(p[1] / RG); if (!rgrid.has(k)) rgrid.set(k, []); rgrid.get(k).push(p); });
// מרחק לשביל הקרוב + הנקודה הקרובה
function routeNear(x, z) {
  const cx = Math.floor(x / RG), cz = Math.floor(z / RG);
  let best = Infinity, bp = null;
  for (let r = 0; r < 6 && (bp === null || r <= 1 + Math.ceil(Math.sqrt(best) / RG)); r++)
    for (let i = cx - r; i <= cx + r; i++) for (let j = cz - r; j <= cz + r; j++) {
      if (Math.max(Math.abs(i - cx), Math.abs(j - cz)) !== r) continue;
      const arr = rgrid.get(i + ',' + j); if (!arr) continue;
      for (const p of arr) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; bp = p; } }
    }
  if (!bp) { for (const p of RPTS) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; bp = p; } } }
  return { d: Math.sqrt(best), p: bp };
}
// כמה רחוק מחוץ לשטח ההליכה (שלילי = בפנים)
function edgeDist(x, z) {
  const v = Math.hypot(x - VILLAGE.x, z - VILLAGE.z) - VILLAGE.r;
  return Math.min(routeNear(x, z).d - CORR, v);
}
function nearCorr(x, z) { return edgeDist(x, z) < 3; }

// גובה הקרקע: שטוח בעמק, ועולה לגבעות משני הצדדים (גם האי בין שתי הדרכים של הצומת)
function groundH(x, z) {
  const e = edgeDist(x, z);
  if (e < 0.5) return 0;
  const k = e - 0.5, u = Math.min(1, k / 9);
  return u * u * (3 - 2 * u) * 7 + Math.sin(x * 0.21) * Math.cos(z * 0.17) * Math.min(k, 5) * 0.3;
}

// ---------- קרקע ----------
(function ground() {
  const S = 340, N = 170, CZ = -60;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, CZ);
  const p = g.attributes.position, cols = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), e = edgeDist(x, z);
    p.setY(i, groundH(x, z) + (e > 1.5 ? (R() - 0.5) * 0.3 : 0));
    const v = R();
    c.setHSL(0.27 + v * 0.03, 0.42 + v * 0.1, 0.36 + v * 0.06 + (e > 1.5 ? -0.035 : 0));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.receiveShadow = true; m.name = 'ground';
  scene.add(m);
  // מעט גבעות רחוקות ונמוכות באופק (בלי שלג) – לא מתחרות בהר המטרה
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.15 + i / 6 * Math.PI * 0.7 + (R() - 0.5) * 0.15;        // רק בדרום/בצדדים
    const d = 220 + R() * 30, h = 14 + R() * 10, r = 45 + R() * 20;
    const mtn = mesh(new THREE.ConeGeometry(r, h, 7), 0x9fbfc9, Math.cos(a) * d, h / 2 - 3, -60 + Math.sin(a) * d, scene, { fog: false });
    mtn.castShadow = false; mtn.scale.z = 0.7;
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
// (קבועים ישנים – נשארו כדי שפונקציות שלא בשימוש לא ישברו)
const WALL_Z = -30, GATE_X = 0;
function riverX(z) { return 999; }
const RIVER_HALF = 3.2, BRIDGE_Z = 5, CROSS_Z = 26;
const LAKE = { x: -999, z: 0, rx: 1, rz: 1 };
const CLIFF2 = { x: 999, z: 999, s: 1 };
const MARKET = { x: 999, z: 999, r: 1 };
const PATHS = Object.values(ROUTE);
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
const pathPts = [];
pathCurves.forEach(c => { const L = c.getLength(); for (let s = 0; s <= L; s += 0.6) { const p = c.getPointAt(s / L); pathPts.push(p.x, p.z); } });
function nearPath(x, z, pad) {
  const pp = pad * pad;
  for (let i = 0; i < pathPts.length; i += 2) { const dx = pathPts[i] - x, dz = pathPts[i + 1] - z; if (dx * dx + dz * dz < pp) return true; }
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
function house(x, z, w, d, kind, noCollide) {
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
  if (!noCollide) addBox(x - w / 2 - 0.3, z - d / 2 - 0.3, x + w / 2 + 0.3, z + d / 2 + 0.6);
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
  if (Math.max(Math.abs(x), Math.abs(z)) < 22) { crown.userData.dyn = true; swayers.push({ o: crown, a: 0.025, ph: R() * 6 }); }
  // עלי כותרת על הקרקע
  if (nearCorr(x, z)) for (let i = 0; i < 18; i++) {
    const a = R() * 6.28, d = R() * 2.2 * s, p = mesh(new THREE.CircleGeometry(0.05 + R() * 0.04, 5), R() < 0.5 ? 0xfbcfe8 : 0xf4a4c8, x + Math.cos(a) * d, 0.04, z + Math.sin(a) * d);
    p.rotation.x = -Math.PI / 2; p.castShadow = false;
  }
  if (nearCorr(x, z)) addCircle(x, z, 0.3 * s);
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
  if (Math.max(Math.abs(x), Math.abs(z)) < 22) { pads.userData.dyn = true; swayers.push({ o: pads, a: 0.012, ph: R() * 6 }); }
  if (nearCorr(x, z)) addCircle(x, z, 0.3 * s);
}
function bamboo(cx, cz, n, still, spread) {
  for (let i = 0; i < n; i++) {
    const sp = spread === undefined ? 2.4 : spread, x = cx + (R() - 0.5) * sp, z = cz + (R() - 0.5) * sp, h = 4.5 + R() * 2.5;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    mesh(Cyl(0.065, 0.075, h, 6), 0x6a9a3c, 0, h / 2, 0, g);
    for (let y = 0.8; y < h; y += 0.75 + R() * 0.2) mesh(Cyl(0.085, 0.085, 0.05, 6), 0x3f6b25, 0, y, 0, g);
    for (let k = 0; k < 5; k++) {
      const lf = mesh(new THREE.ConeGeometry(0.07, 0.75, 3), 0x4f8a2e, 0, h * (0.6 + k * 0.08), 0, g);
      lf.rotation.z = (k % 2 ? 1 : -1) * (1.0 + R() * 0.4); lf.rotation.y = R() * 6; lf.position.x = (k % 2 ? -1 : 1) * 0.3;
    }
    if (!still) { g.userData.dyn = true; swayers.push({ o: g, a: 0.035, ph: R() * 6, z: true }); }
    addCircle(x, z, 0.12);
  }
}
function bush(x, z, s, flower) {
  const gy = groundH(x, z);
  const b = mesh(Ico(0.7 * s, 1), 0x2c6228, x, 0.35 * s + gy, z); b.scale.y = 0.7;
  mesh(Ico(0.45 * s, 1), 0x3d7d33, x - 0.25 * s, 0.6 * s + gy, z + 0.15 * s);
  if (flower) for (let i = 0; i < 7; i++) { const a = R() * 6.28; mesh(Ico(0.08, 0), 0xf472b6, x + Math.cos(a) * 0.55 * s, 0.4 * s + R() * 0.35 * s, z + Math.sin(a) * 0.5 * s); }
  if (nearCorr(x, z)) addCircle(x, z, 0.55 * s);
}
function rock(x, z, s) {
  const r = mesh(new THREE.DodecahedronGeometry(s, 0), R() < 0.5 ? 0x8a867b : 0x9d998e, x, s * 0.35 + groundH(x, z), z);
  r.scale.set(1, 0.65, 0.9); r.rotation.set(R(), R() * 6, R());
  if (nearCorr(x, z)) addCircle(x, z, s * 0.85);
}

// ---------- בריכה עם דגי קוי ----------
const koi = [];
function pond(x, z, rx, rz) {
  const w = mesh(new THREE.CircleGeometry(1, 28), 0x2f6b82, x, 0.05, z); w.rotation.x = -Math.PI / 2; w.scale.set(rx, rz, 1); w.castShadow = false;
  const w2 = mesh(new THREE.CircleGeometry(1, 28), 0x4a8ea6, x - 0.3, 0.06, z - 0.3, scene, { transparent: true, opacity: 0.6 }); w2.rotation.x = -Math.PI / 2; w2.scale.set(rx * 0.7, rz * 0.6, 1); w2.castShadow = false;
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + R() * 0.1; rock(x + Math.cos(a) * (rx + 0.15), z + Math.sin(a) * (rz + 0.15), 0.22 + R() * 0.18); }
  [[0.55, 0.3, 0.9], [-0.5, -0.2, -0.6]].forEach(([u, v, ph]) => { const lp = mesh(new THREE.CircleGeometry(0.32, 10), 0x4b8f3b, x + u * rx, 0.08, z + v * rz); lp.rotation.x = -Math.PI / 2; });
  [0xf97316, 0xfafafa, 0xef4444].forEach((c, i) => {
    const f = new THREE.Group(); f.userData.dyn = true; scene.add(f);
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
function cliff(x, z, sc) {
  sc = sc || 1;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); scene.add(g);
  [[0, 1.6, 0, 2.6], [1.8, 1.1, 0.6, 1.9], [-1.7, 1.2, -0.4, 2.0], [0.4, 3.6, -0.6, 1.9], [-0.6, 5.0, -0.8, 1.3], [1.5, 3.2, -1.2, 1.5]]
    .forEach(([cx, cy, cz, r], i) => { const m = mesh(new THREE.DodecahedronGeometry(r, 0), [0x8a867b, 0x7d7a6f, 0x9a8f7a][i % 3], cx, cy, cz, g); m.rotation.set(i, i * 2, i * 0.5); m.scale.y = 1.15; });
  mesh(Ico(0.9, 1), 0x3f8458, -0.4, 6.0, -0.8, g).scale.y = 0.5;
  const pole = mesh(Cyl(0.03, 0.03, 1.6, 4), 0x5a3a1f, -0.5, 6.9, -0.8, g);
  const flag = mesh(Box(0.6, 0.35, 0.02), 0xdc2626, -0.2, 7.5, -0.8, g); flag.userData.dyn = true; swayers.push({ o: flag, a: 0.15, ph: 1, z: false, y: true });
  // סולם
  const lad = new THREE.Group(); lad.position.set(0.9, 0, 2.2); lad.rotation.x = -0.32; g.add(lad);
  [-0.3, 0.3].forEach(px => mesh(Box(0.08, 4.6, 0.08), 0x8b5e3c, px, 2.3, 0, lad));
  for (let y = 0.4; y < 4.5; y += 0.42) mesh(Box(0.6, 0.06, 0.06), 0x9c6c45, 0, y, 0, lad);
  addCircle(x, z, 3.2 * sc);
}

// ---------- תושבים (דמויות פשוטות שמסתובבות אל הנינג'ה כשהוא קרוב) ----------
const people = [];
function person(x, z, look, dir) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = dir || 0; g.userData.dyn = true; scene.add(g);
  const SMp = { flatShading: false };
  [-0.11, 0.11].forEach(lx => mesh(Cyl(0.085, 0.075, 0.42, 10), look.limb, lx, 0.21, 0, g, SMp));
  mesh(new THREE.CapsuleGeometry(0.25, 0.14, 4, 12), look.body, 0, 0.66, 0, g, SMp).scale.set(1, 0.85, 0.8);
  mesh(Cyl(0.255, 0.255, 0.07, 16), look.accent, 0, 0.5, 0, g, SMp).scale.z = 0.8;
  [-1, 1].forEach(sd => { const arm = mesh(Cyl(0.065, 0.06, 0.38, 10), look.limb, sd * 0.29, 0.62, 0, g, SMp); arm.rotation.z = sd * 0.18; mesh(new THREE.SphereGeometry(0.075, 10, 8), look.skin, sd * 0.33, 0.42, 0, g, SMp); });
  const head = new THREE.Group(); head.position.y = 1.2; g.add(head);
  mesh(new THREE.SphereGeometry(0.3, 18, 14), look.skin, 0, 0, 0, head, SMp);
  [-0.09, 0.09].forEach(ex => mesh(new THREE.SphereGeometry(0.035, 8, 6), 0x1f2937, ex, 0.02, 0.28, head, SMp).scale.set(1, 1.3, 0.6));
  if (look.hair) mesh(new THREE.SphereGeometry(0.31, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), look.hair, 0, 0.03, -0.02, head, SMp);
  if (look.beard) mesh(new THREE.SphereGeometry(0.16, 12, 10), look.beard, 0, -0.17, 0.2, head, SMp).scale.set(1.1, 1, 0.6);
  if (look.hat) { mesh(new THREE.ConeGeometry(0.55, 0.32, 18), look.hat, 0, 0.27, 0, head); mesh(Cyl(0.56, 0.56, 0.03, 18), look.hat, 0, 0.12, 0, head); }
  if (look.helmet) { mesh(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), look.helmet, 0, 0.04, 0, head, SMp); mesh(Box(0.5, 0.06, 0.1), 0xfacc15, 0, 0.3, 0.2, head); }
  if (look.spear) { mesh(Cyl(0.025, 0.025, 2.2, 6), 0x5a3a1f, 0.42, 1.1, 0.1, g); mesh(new THREE.ConeGeometry(0.06, 0.25, 6), 0xcbd5e1, 0.42, 2.3, 0.1, g); }
  const col = { t: 'c', x, z, r: 0.35 }; colliders.push(col);
  const ent = { g, head, x, z, base: dir || 0, ph: R() * 6, col };
  people.push(ent);
  return ent;
}
const LOOKS = {
  elder:   { body: 0x6b4f2e, limb: 0x56401f, accent: 0xa16207, skin: 0xf1c7a1, hat: 0xd9b968, beard: 0xe7e5e4 },
  merchant:{ body: 0x0f766e, limb: 0x0b5e58, accent: 0xf59e0b, skin: 0xf1c7a1, hair: 0x1f2937 },
  cook:    { body: 0xf5f5f4, limb: 0x44403c, accent: 0xdc2626, skin: 0xf1c7a1, hair: 0x1f2937 },
  guard:   { body: 0x2f2a44, limb: 0x241f36, accent: 0xb45309, skin: 0xf1c7a1, helmet: 0x3f3a52, spear: true },
  farmer:  { body: 0x4d7c0f, limb: 0x3f6212, accent: 0xa16207, skin: 0xf1c7a1, hat: 0xd9b968 },
  fisher:  { body: 0x475569, limb: 0x334155, accent: 0x0ea5e9, skin: 0xf1c7a1, hat: 0xd9b968 },
  girl:    { body: 0x9d174d, limb: 0x831843, accent: 0xfde68a, skin: 0xfcd9b6, hair: 0x1f2937 },
  boy:     { body: 0x1d4ed8, limb: 0x1e40af, accent: 0xfef3c7, skin: 0xfcd9b6, hair: 0x3b2a1a },
  monk:    { body: 0xc2410c, limb: 0x9a3412, accent: 0xfbbf24, skin: 0xf1c7a1 }
};

// ---------- צפון: חומה, שער ושוק ----------
function wallSeg(x0, x1) {
  const w = x1 - x0, cx = (x0 + x1) / 2, H = 2.2;
  mesh(Box(w, 0.5, 0.9), 0x7a756c, cx, 0.25, WALL_Z);
  mesh(Box(w, H, 0.7), 0xece4d2, cx, 0.5 + H / 2, WALL_Z);
  mesh(Box(w + 0.02, 0.45, 0.72), 0x5b4a3a, cx, 0.72, WALL_Z);
  for (let x = x0 + 2; x < x1 - 0.5; x += 4) mesh(Box(0.22, H, 0.76), 0x4a3527, x, 0.5 + H / 2, WALL_Z);
  mesh(roofGeo(1.5, w + 0.3, 0.45, 0.16, 0.12), 0x3f4757, cx, 0.5 + H, WALL_Z);
  addBox(x0, WALL_Z - 0.5, x1, WALL_Z + 0.5);
}
const gateDoors = [];
let gateCol = null;
function gate() {
  const x = GATE_X, z = WALL_Z, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  [-2.2, 2.2].forEach(px => { mesh(Box(0.5, 4, 0.5), 0x3a2a1e, px, 2, 0, g); mesh(Box(0.7, 0.4, 0.7), 0x7a756c, px, 0.2, 0, g); });
  mesh(Box(5.2, 0.4, 0.6), 0x4a3527, 0, 3.7, 0, g);
  mesh(roofGeo(2.4, 6.6, 0.9, 0.24, 0.3), 0x2a303c, 0, 3.95, 0, g);
  // דלתות: סגורות עד שמנצחים את השומר (FIGHT), ואז נפתחות פנימה
  gateDoors.length = 0;
  [-1, 1].forEach(sd => {
    const hinge = new THREE.Group(); hinge.position.set(sd * 1.95, 0, -0.1); hinge.userData.dyn = true; g.add(hinge); gateDoors.push({ hinge, sd });
    mesh(Box(1.9, 3.2, 0.14), 0x6b4226, -sd * 0.95, 1.7, 0, hinge);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) mesh(new THREE.SphereGeometry(0.05, 6, 4), 0xfbbf24, -sd * (0.45 + j * 0.5), 0.9 + k * 0.8, 0.08, hinge);
  });
  addCircle(x - 2.2, z, 0.35); addCircle(x + 2.2, z, 0.35);
  gateCol = { t: 'b', x0: x - 2.1, z0: z - 0.4, x1: x + 2.1, z1: z + 0.3 }; colliders.push(gateCol);
  [-1, 1].forEach(sd => { const l = mesh(new THREE.SphereGeometry(0.32, 10, 8), 0xdc2626, x + sd * 2.2, 3.1, z + 0.45, scene, { emissive: 0x7a1010 }); l.scale.y = 1.25; });
}
function stall(x, z, rot, color, goods) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]].forEach(([px, pz]) => mesh(Box(0.12, 2.5, 0.12), 0x4a3527, px, 1.25, pz, g));
  mesh(Box(3.2, 0.9, 1.1), 0x8b5e3c, 0, 0.45, 0.25, g);
  mesh(Box(3.3, 0.08, 1.2), 0x9c6c45, 0, 0.93, 0.25, g);
  for (let k = 0; k < 8; k++) { const st = mesh(Box(0.42, 0.06, 1.6), k % 2 ? 0xf8fafc : color, -1.47 + k * 0.42, 2.55, 0.1, g); st.rotation.x = -0.25; }
  for (let k = 0; k < 8; k++) mesh(Box(0.42, 0.25, 0.04), k % 2 ? 0xf8fafc : color, -1.47 + k * 0.42, 2.35, 0.86, g);
  const items = { fruit: [0xef4444, 0xf97316, 0xfacc15], fish: [0x94a3b8], pots: [0x7c4a2a, 0x3b6e8f, 0x9a5f36], cloth: [0xec4899, 0x22c55e, 0x3b82f6, 0xf59e0b], sweets: [0xfbcfe8, 0xf8fafc, 0xbbf7d0] }[goods];
  for (let i = 0; i < 12; i++) {
    const c = items[i % items.length], px = -1.3 + (i % 6) * 0.52, pz = 0.05 + Math.floor(i / 6) * 0.4;
    if (goods === 'fish') mesh(new THREE.SphereGeometry(0.12, 8, 6), c, px, 1.05, pz, g).scale.set(2, 0.6, 0.8);
    else if (goods === 'pots') mesh(Cyl(0.12, 0.16, 0.3, 8), c, px, 1.12, pz, g);
    else if (goods === 'cloth') mesh(Box(0.4, 0.12, 0.32), c, px, 1.03, pz, g);
    else mesh(new THREE.SphereGeometry(goods === 'sweets' ? 0.09 : 0.13, 8, 6), c, px, 1.08, pz, g);
  }
  const cw = Math.cos(rot), sw = Math.sin(rot);
  addBox(x - 1.8, z - 1.8, x + 1.8, z + 1.8);
}
function noodleStand(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  mesh(Box(3, 1, 1.3), 0x7a4a26, 0, 0.5, 0, g);
  mesh(Box(3.2, 0.1, 1.5), 0x9c6c45, 0, 1.05, 0.1, g);
  [-1.4, 1.4].forEach(px => mesh(Box(0.12, 2.6, 0.12), 0x3a2a1e, px, 1.3, -0.6, g));
  mesh(roofGeo(1.9, 3.6, 0.5, 0.16, 0.15), 0x7a1d1d, 0, 2.6, -0.1, g);
  for (let k = 0; k < 4; k++) mesh(Box(0.68, 0.7, 0.04), 0x1e3a5f, -1.05 + k * 0.7, 2.15, 0.62, g);
  [[-0.9, 0.1], [0, 0.25], [0.9, 0.1]].forEach(([px, pz]) => { mesh(Cyl(0.2, 0.13, 0.15, 12), 0xdc2626, px, 1.17, pz, g); mesh(Cyl(0.17, 0.17, 0.02, 12), 0xf5d58a, px, 1.24, pz, g); });
  mesh(Cyl(0.35, 0.35, 0.5, 12), 0x57534e, 1.0, 1.35, -0.35, g);
  [-1.4, 1.4].forEach(px => { const l = mesh(new THREE.SphereGeometry(0.22, 10, 8), 0xdc2626, px, 1.95, 0.75, g, { emissive: 0x7a1010 }); l.scale.y = 1.3; });
  [-1, 0, 1].forEach(k => mesh(Cyl(0.22, 0.22, 0.5, 10), 0x8b5e3c, k * 0.9, 0.25, 1.3, g));
  addBox(x - 1.8, z - 1.2, x + 1.8, z + 1.2);
}

// ---------- מזרח: נהר, גשר הרוס, אבני קפיצה, שדות אורז ----------
function river() {
  const N = 140, v = [], idx = [], v2 = [], idx2 = [];
  for (let i = 0; i <= N; i++) {
    const z = -PLAY - 20 + (PLAY * 2 + 40) * i / N, x = riverX(z);
    v.push(x - RIVER_HALF - 0.6, 0.02, z, x + RIVER_HALF + 0.6, 0.02, z);
    v2.push(x - RIVER_HALF + 0.4, 0.045, z, x + RIVER_HALF - 0.4, 0.045, z);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); idx2.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  [[v, idx, 0x7d7660], [v2, idx2, 0x3a7d96]].forEach(([vv, ii, c]) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vv, 3)); g.setIndex(ii); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  });
  for (let i = 0; i < 260; i++) { const z = -PLAY + R() * PLAY * 2, sd = R() < 0.5 ? -1 : 1; if (Math.abs(z - CROSS_Z) < 2.6 || Math.abs(z - BRIDGE_Z) < 2.6) continue; rock(riverX(z) + sd * (RIVER_HALF + 0.3 + R() * 0.7), z, 0.22 + R() * 0.25); }
  for (let i = 0; i < 70; i++) { const z = -PLAY + R() * PLAY * 2, x = riverX(z) + (R() - 0.5) * RIVER_HALF * 1.4, f = mesh(Box(0.5 + R() * 0.8, 0.01, 0.06), 0xd6edf3, x, 0.06, z); f.castShadow = false; }
  // גשר עץ הרוס: שני קצוות, ובאמצע חסר
  const bx = riverX(BRIDGE_Z);
  [-1, 1].forEach(sd => {
    const g = new THREE.Group(); g.position.set(bx + sd * 2.6, 0, BRIDGE_Z); scene.add(g);
    for (let k = 0; k < 6; k++) { const pl = mesh(Box(0.45, 0.1, 2.2), 0x8b5e3c, -sd * (k * 0.48 - 1.1), 0.55 + k * 0.03, 0, g); pl.rotation.z = sd * (k > 3 ? 0.12 : 0.02); }
    [-1, 1].forEach(e => { mesh(Box(0.14, 1.6, 0.14), 0x6b4226, sd * 1.2, 0.8, e * 1.1, g); mesh(Box(2.8, 0.1, 0.1), 0x8b5e3c, 0, 1.25, e * 1.1, g).rotation.z = -sd * 0.05; });
    mesh(Box(0.25, 1.2, 0.25), 0x5a3a1f, -sd * 1.3, 0.2, -0.9, g); mesh(Box(0.25, 1.2, 0.25), 0x5a3a1f, -sd * 1.3, 0.2, 0.9, g);
  });
  const broken = mesh(Box(0.45, 0.1, 2.0), 0x7a5232, bx + 0.3, 0.1, BRIDGE_Z + 0.4); broken.rotation.set(0.3, 0.6, 0.2);
  // אבני קפיצה
  [-2.4, -0.8, 0.8, 2.4].forEach((dx, i) => { const st = mesh(Cyl(0.6, 0.75, 0.35, 8), 0x8a867b, riverX(CROSS_Z) + dx, 0.15, CROSS_Z + (i % 2 ? 0.3 : -0.3)); st.scale.z = 0.85; });
}
const paddies = [];
function paddy(x, z, w, d) {
  mesh(Box(w + 0.5, 0.18, d + 0.5), 0x7d6b4a, x, 0.09, z);
  const water = mesh(Box(w, 0.04, d), 0x5f8f96, x, 0.19, z); water.castShadow = false;
  for (let gx = -w / 2 + 0.4; gx < w / 2 - 0.2; gx += 0.55) for (let gz = -d / 2 + 0.4; gz < d / 2 - 0.2; gz += 0.55) {
    const t = mesh(new THREE.ConeGeometry(0.07, 0.42, 3), R() < 0.5 ? 0x4f9a3a : 0x6aa84a, x + gx + (R() - 0.5) * 0.1, 0.4, z + gz); t.castShadow = false;
  }
  paddies.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
}
function cart(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set(0.08, rot, 0.12); scene.add(g);
  const mud = mesh(new THREE.CircleGeometry(1.8, 14), 0x4a3a25, 0, 0.03, 0, g); mud.rotation.x = -Math.PI / 2; mud.scale.y = 0.7; mud.castShadow = false;
  mesh(Box(1.6, 0.5, 2.4), 0x8b5e3c, 0, 0.75, 0, g);
  mesh(Box(1.5, 0.08, 2.3), 0x6b4226, 0, 1.01, 0, g);
  [-0.85, 0.85].forEach(px => { const wh = mesh(Cyl(0.55, 0.55, 0.12, 12), 0x5a3a1f, px, 0.35, 0.2, g); wh.rotation.z = Math.PI / 2; });
  [-0.4, 0.4].forEach(px => mesh(Box(0.08, 0.08, 1.8), 0x6b4226, px, 0.7, 2, g));
  for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.22, 8, 6), 0xd9b968, (R() - 0.5) * 1.1, 1.15, (R() - 0.5) * 1.8, g).scale.set(1, 0.7, 1.6);
  addCircle(x, z, 1.3);
}
function scarecrow(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R() * 6; scene.add(g);
  mesh(Box(0.1, 2, 0.1), 0x6b4a2b, 0, 1, 0, g); mesh(Box(1.6, 0.08, 0.08), 0x6b4a2b, 0, 1.45, 0, g);
  mesh(Box(0.6, 0.6, 0.3), 0x2563eb, 0, 1.4, 0, g); mesh(new THREE.SphereGeometry(0.22, 10, 8), 0xe7d6a8, 0, 1.9, 0, g);
  mesh(new THREE.ConeGeometry(0.45, 0.25, 12), 0xd9b968, 0, 2.12, 0, g);
}

// ---------- מערב: אגם, בית על כלונסאות, מזח וסירה ----------
function lake() {
  const L = LAKE;
  const w = mesh(new THREE.CircleGeometry(1, 40), 0x2f6b82, L.x, 0.04, L.z); w.rotation.x = -Math.PI / 2; w.scale.set(L.rx, L.rz, 1); w.castShadow = false;
  const w2 = mesh(new THREE.CircleGeometry(1, 40), 0x4a8ea6, L.x - 2, 0.05, L.z - 1.5, scene, { transparent: true, opacity: 0.55 }); w2.rotation.x = -Math.PI / 2; w2.scale.set(L.rx * 0.75, L.rz * 0.65, 1); w2.castShadow = false;
  for (let i = 0; i < 70; i++) { const a = i / 70 * 6.28 + R() * 0.05; rock(L.x + Math.cos(a) * (L.rx + 0.3), L.z + Math.sin(a) * (L.rz + 0.3), 0.25 + R() * 0.25); }
  for (let i = 0; i < 9; i++) { const a = R() * 6.28, d = 0.45 + R() * 0.45, lp = mesh(new THREE.CircleGeometry(0.4 + R() * 0.2, 10), 0x4b8f3b, L.x + Math.cos(a) * L.rx * d, 0.07, L.z + Math.sin(a) * L.rz * d); lp.rotation.x = -Math.PI / 2; lp.castShadow = false; }
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, x = L.x + Math.cos(a) * (L.rx - 0.4), z = L.z + Math.sin(a) * (L.rz - 0.4); if (x > L.x + L.rx - 3 && Math.abs(z - 6.5) < 2) continue; mesh(Cyl(0.02, 0.03, 0.9 + R() * 0.6, 4), 0x4d7a2b, x, 0.5, z).castShadow = false; }
  addEll(L.x, L.z, L.rx + 0.3, L.rz + 0.3);
  // בית על כלונסאות באמצע
  const P = { x: L.x - 1, z: L.z - 1 };
  for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) mesh(Cyl(0.15, 0.15, 1.6, 6), 0x4a3527, P.x + i * 3.1, 0.45, P.z + j * 2.6);
  mesh(Box(7, 0.25, 6), 0x8b5e3c, P.x, 1.2, P.z);
  for (let k = -3; k <= 3; k += 0.5) mesh(Box(0.06, 0.6, 0.06), 0x6b4226, P.x + k, 1.6, P.z + 3);
  const hg = house(P.x, P.z - 0.6, 5, 3.6, 'thatch', true); hg.position.y = 1.0;
  // מזח מהחוף
  const dz = 6.5, x0 = L.x + L.rx + 1.5;
  for (let k = 0; k < 9; k++) mesh(Box(0.5, 0.1, 1.6), k % 2 ? 0x9c6c45 : 0x8b5e3c, x0 - k * 0.52, 0.32, dz);
  [0, 2, 4].forEach(k => [-0.75, 0.75].forEach(e => mesh(Cyl(0.08, 0.08, 0.9, 6), 0x5a3a1f, x0 - k * 1.05, 0.2, dz + e)));
  // סירה קשורה
  const b = new THREE.Group(); b.position.set(x0 - 5.2, -0.05, dz + 1.6); b.rotation.y = 0.15; b.userData.dyn = true; scene.add(b);
  const hull = new THREE.Shape(); hull.moveTo(-1.6, 0); hull.quadraticCurveTo(0, -0.75, 1.6, 0); hull.lineTo(1.4, 0.35); hull.lineTo(-1.4, 0.35); hull.closePath();
  const hg2 = new THREE.ExtrudeGeometry(hull, { depth: 1.1, bevelEnabled: false, curveSegments: 8 }); hg2.translate(0, 0, -0.55);
  mesh(hg2, 0x8b5e3c, 0, 0.1, 0, b);
  mesh(Box(2.6, 0.06, 0.9), 0x6b4226, 0, 0.35, 0, b);
  mesh(Box(0.3, 0.12, 0.9), 0x5a3a1f, 0.3, 0.42, 0, b);
  const oar = mesh(Box(2.2, 0.05, 0.12), 0xa16207, -0.2, 0.5, 0.2, b); oar.rotation.y = 0.3;
  swayers.push({ o: b, a: 0.03, ph: 2, boat: true });
}

// ============================================================
//   בניית העולם: הכפר בדרום, ואחריו העמק אל ההר
// ============================================================
house(-7.5, -3.5, 6, 4.2, 'tile');
house(7, -4.2, 5.6, 4, 'thatch');
well(2.2, 0.6);
pond(-11, 12, 3.6, 2.4);
torii(1.6, 12.5, 1);
[[-2.2, 2.2], [4.6, 2.6], [-1.6, 15], [4.4, 15], [10.5, 3.2], [-11.5, 3.4]].forEach(([x, z]) => stoneLantern(x, z));
bamboo(-15, -6, 10, true); bamboo(13, 13, 8, true);
[[-14, 1.5, 1], [-3.2, 9.2, 0.9], [13.5, 3.8, 1.05], [-15, 15, 1.05], [5.5, 9.5, 0.85]].forEach(([x, z, s]) => cherry(x, z, s));
[[-12, -12, 1.05], [12, -12, 1], [16, 6, 1.05], [-5, 19, 1], [9, 19, 0.95]].forEach(([x, z, s]) => pine(x, z, s));
const elder = person(-5, 7.5, LOOKS.elder, Math.PI * 0.1);
person(-9.2, 13.8, LOOKS.fisher, -0.6);
person(11.5, 9, LOOKS.boy, -0.4);
// פנסי אבן לאורך העמק
[[4.5, -20], [-4.6, -32], [2.8, -42], [-3.6, -88], [3.2, -98], [-4.8, -114], [2.4, -126]].forEach(([x, z]) => stoneLantern(x, z));

// ---------- גבולות העמק: עצים, סלעים ושיחים על המדרונות ----------
function scatter(n, x0, z0, x1, z1, fn) { let made = 0; for (let a = 0; a < n * 30 && made < n; a++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0); if (fn(x, z)) made++; } }
function freeAt(x, z, pad) {
  return !colliders.some(c => c.t === 'c' ? Math.hypot(c.x - x, c.z - z) < c.r + pad : c.t === 'b' ? x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad : Math.hypot((x - c.x) / (c.rx + pad), (z - c.z) / (c.rz + pad)) < 1);
}
const decor = [];
function roomFor(x, z, r) { for (const q of decor) if ((q[0] - x) ** 2 + (q[1] - z) ** 2 < (q[2] + r) ** 2) return false; decor.push([x, z, r]); return true; }
// שורה צפופה בשולי העמק (ממש מחוץ לשטח ההליכה) – כדי שיהיה ברור איפה הגבול
scatter(260, BOX.x0, BOX.z0, BOX.x1, -10, (x, z) => {
  const e = edgeDist(x, z);
  if (e < 0.6 || e > 4) return false;
  if (!roomFor(x, z, 1.6)) return false;
  const r = R();
  if (r < 0.45) pine(x, z, 0.9 + R() * 0.45); else if (r < 0.62) cherry(x, z, 0.85 + R() * 0.35);
  else if (r < 0.82) rock(x, z, 0.6 + R() * 0.7); else bush(x, z, 0.8 + R() * 0.5, R() < 0.3);
  return true;
});
// על הגבעות עצמן: מעט עצים
scatter(90, BOX.x0, BOX.z0, BOX.x1, -10, (x, z) => {
  const e = edgeDist(x, z);
  if (e < 4 || e > 22) return false;
  if (!roomFor(x, z, 3)) return false;
  (R() < 0.75 ? pine : cherry)(x, z, 1 + R() * 0.5);
  return true;
});
// בתוך העמק: כמה שיחים וסלעים קטנים בצדי השביל
scatter(24, BOX.x0, BOX.z0, BOX.x1, -12, (x, z) => {
  const e = edgeDist(x, z);
  if (e > -0.6 || nearPath(x, z, 2.2) || !freeAt(x, z, 1.2) || !roomFor(x, z, 1.2)) return false;
  R() < 0.6 ? bush(x, z, 0.6 + R() * 0.4, R() < 0.35) : rock(x, z, 0.25 + R() * 0.25);
  return true;
});
// דשא ופרחים בעמק ובכפר
scatter(420, BOX.x0, BOX.z0, BOX.x1, BOX.z1, (x, z) => {
  if (edgeDist(x, z) > 0.5 || nearPath(x, z, 1.5) || !freeAt(x, z, 0.3)) return false;
  const tuft = mesh(new THREE.ConeGeometry(0.06, 0.28, 3), R() < 0.5 ? 0x3f7d2a : 0x6aa84a, x, 0.14, z); tuft.castShadow = false;
  if (R() < 0.25) { const f = mesh(Ico(0.07, 0), [0xf8fafc, 0xfde047, 0xf9a8d4, 0xc4b5fd][Math.floor(R() * 4)], x + 0.12, 0.25, z); f.castShadow = false; }
  return true;
});

// ---------- עמודי אבן ממוספרים: כאן יהיו התחנות (בינתיים בלי מכשולים) ----------
function numberTex(text, done) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = done ? '#16a34a' : '#f6e7c4'; g.beginPath(); g.arc(64, 64, 58, 0, 6.283); g.fill();
  g.lineWidth = 8; g.strokeStyle = done ? '#14532d' : '#8b5e3c'; g.stroke();
  g.fillStyle = done ? '#fff' : '#3b2a1a'; g.font = 'bold 70px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(done ? '✓' : text, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function markerPost(x, z, num) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(Cyl(0.55, 0.65, 0.3, 8), 0x8e8b82, 0, 0.15, 0, g);
  mesh(Box(0.5, 1.6, 0.5), 0x9d998e, 0, 1.0, 0, g);
  mesh(Box(0.7, 0.18, 0.7), 0x7d7a72, 0, 1.88, 0, g);
  addCircle(x, z, 0.45);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: numberTex(String(num), false), transparent: true, depthWrite: false }));
  sp.scale.set(1.1, 1.1, 1); sp.position.set(x, 2.75, z); sp.userData.dyn = true; scene.add(sp);
  return sp;
}
// ---------- תיבה במבוי הסתום ----------
const chest = (function () {
  const [x, z] = CHEST_AT, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.6; g.userData.dyn = true; scene.add(g);
  mesh(Box(1.3, 0.75, 0.85), 0x7a4a26, 0, 0.38, 0, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.76, -0.42); g.add(lid);
  mesh(Box(1.34, 0.3, 0.88), 0x8b5e3c, 0, 0.13, 0.42, lid);
  [-0.5, 0.5].forEach(bx => mesh(Box(0.08, 0.8, 0.9), 0xb8860b, bx, 0.42, 0, g));
  mesh(Box(0.18, 0.2, 0.06), 0xfacc15, 0, 0.62, 0.45, g);
  rock(x + 1.8, z - 1.2, 0.9); rock(x - 1.6, z - 1.6, 0.7);
  addCircle(x, z, 0.8);
  return { g, lid };
})();

// ---------- איחוד: כל מה שלא זז מתאחד לכמה רשתות גדולות (הרבה פחות ציורים בכל פריים) ----------
(function mergeStatic() {
  scene.updateMatrixWorld(true);
  const buckets = new Map(), victims = [];
  scene.traverse(o => {
    if (!o.isMesh || o.name === 'ground' || o.material.vertexColors) return;
    for (let p = o; p; p = p.parent) if (p.userData && p.userData.dyn) return;
    if (glowMats.includes(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    Object.keys(g.attributes).forEach(k => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid + (o.castShadow ? 's' : '');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, list: [] });
    buckets.get(key).list.push(g); victims.push(o);
  });
  victims.forEach(o => o.parent.remove(o));
  buckets.forEach(b => {
    const merged = mergeGeometries(b.list, false);
    if (!merged) return;
    const m = new THREE.Mesh(merged, b.mat); m.castShadow = b.cast; m.receiveShadow = true; m.matrixAutoUpdate = false;
    scene.add(m);
  });
})();

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
  // פעולות: דחיפה (שתי ידיים קדימה), מכה (יד ימין מניפה), אכילה
  if (n.action) {
    const a = n.action, k = Math.min(1, a.t / 0.18) * Math.min(1, Math.max(0, (a.dur - a.t) / 0.25));
    if (a.type === 'push') { n.arms.L.pivot.rotation.x = n.arms.R.pivot.rotation.x = -1.45 * k; n.fore.L.pivot.rotation.x = n.fore.R.pivot.rotation.x = -0.15; n.torso.rotation.x = 0.35 * k; n.hips.L.pivot.rotation.x = 0.5 * k; n.hips.R.pivot.rotation.x = -0.4 * k; }
    if (a.type === 'hit') { const sw = Math.sin(Math.min(1, a.t / 0.3) * Math.PI); n.arms.R.pivot.rotation.x = -2.6 * sw; n.arms.R.pivot.rotation.z = 0.28 + 0.6 * sw; n.fore.R.pivot.rotation.x = -0.2; n.chest.rotation.y = -0.6 * sw; n.torso.rotation.x = 0.25 * sw; }
    if (a.type === 'eat') { n.arms.R.pivot.rotation.x = -1.9 * k; n.fore.R.pivot.rotation.x = -1.6 * k; n.head.rotation.x = Math.sin(a.t * 12) * 0.12 * k; }
  }
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
    // העמק: אם יצאנו מהשטח – חוזרים לשפה הקרובה (של העמק או של רחבת הכפר)
    const vr = VILLAGE.r - NR, vd = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    if (vd > vr) {
      const rn = routeNear(x, z), lim = CORR - NR;
      if (rn.d > lim) {
        const ex = rn.p[0] + (x - rn.p[0]) / rn.d * lim, ez = rn.p[1] + (z - rn.p[1]) / rn.d * lim;
        const vx = VILLAGE.x + (x - VILLAGE.x) / vd * vr, vz = VILLAGE.z + (z - VILLAGE.z) / vd * vr;
        if ((ex - x) ** 2 + (ez - z) ** 2 < (vx - x) ** 2 + (vz - z) ** 2) { x = ex; z = ez; } else { x = vx; z = vz; }
      }
    }
    x = Math.max(BOX.x0, Math.min(BOX.x1, x)); z = Math.max(BOX.z0, Math.min(BOX.z1, z));
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
  let speedK = 1;
  if (kf || ks) { n.target = null; marker.visible = false; mx = fx * kf - fz * ks; mz = fz * kf + fx * ks; noteMoved(); }
  else if (stick.vx || stick.vy) {                                       // ג'ויסטיק: למעלה = קדימה (לפי המצלמה)
    const sf = -stick.vy, ss = stick.vx, m = Math.hypot(sf, ss);
    if (m > 0.15) { mx = fx * sf - fz * ss; mz = fz * sf + fx * ss; speedK = Math.min(1, (m - 0.15) / 0.6 + 0.35); }
  }
  else if (n.target) {
    const dx = n.target[0] - n.x, dz = n.target[1] - n.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { n.target = null; marker.visible = false; }
    else { mx = dx / d; mz = dz / d; }
  }
  const len = Math.hypot(mx, mz);
  const want = len ? SPEED * speedK : 0;
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
  let bx = n.x - Math.sin(n.dir) * 1.3 + Math.cos(n.dir) * 0.7, bz = n.z - Math.cos(n.dir) * 1.3 - Math.sin(n.dir) * 0.7;
  const lead = typeof dogLeadTarget === 'function' ? dogLeadTarget() : null;
  if (lead) { bx = lead[0]; bz = lead[1]; }
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
// מבטים: רחוק (ברירת מחדל), קרוב מאחורי הכתף, מלמעלה, ומהעיניים של הנינג'ה (גוף ראשון).
// בכל מבט: גרירה מסובבת, הג'ויסטיק הולך "קדימה" לפי כיוון המבט.
const VIEWS = {
  far:  { label: 'רחוק',    pitch: 0.24, dist: 12, ty: 2.8 },      // נמוך מאחור – רואים את ההר באופק
  near: { label: 'קרוב',    pitch: 0.12, dist: 6, ty: 1.9 },
  top:  { label: 'מלמעלה',  pitch: 1.1, dist: 22, ty: 0.5 },
  eyes: { label: 'עיניים',  eyes: true }
};
const cam = { mode: 'far', yaw: 0, pitch: 0.72, dist: 15, look: -0.08, tx: ninja.x, tz: ninja.z, ty: 1.0, blend: 1 };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
function setView(mode) {
  const v = VIEWS[mode]; if (!v) return;
  cam.mode = mode;
  if (!v.eyes) { cam.pitch = v.pitch; cam.dist = v.dist; }
  else cam.look = -0.08;
  cam.blend = 0;                                   // מעבר רך בין מבטים
  ninja.root.visible = !v.eyes;
  document.querySelectorAll('#views button').forEach(b => b.classList.toggle('on', b.dataset.v === mode));
  try { localStorage.setItem('ninjaVoice_village3d_view', mode); } catch (e) {}
}
function placeCamera(dt) {
  cam.tx += (ninja.x - cam.tx) * Math.min(1, dt * 4); cam.tz += (ninja.z - cam.tz) * Math.min(1, dt * 4);
  if (keys.q) cam.yaw += dt * 1.6; if (keys.e) cam.yaw -= dt * 1.6;
  const v = VIEWS[cam.mode];
  cam.ty += ((v.ty || 1) - cam.ty) * Math.min(1, dt * 5);
  if (v.eyes) {
    const ey = 1.22 + ninja.body.position.y, fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), cl = Math.cos(cam.look);
    wantPos.set(ninja.x + fx * 0.12, ey, ninja.z + fz * 0.12);
    wantLook.set(wantPos.x + fx * cl, ey + Math.sin(cam.look), wantPos.z + fz * cl);
    if (!ninja.speed || ninja.speed < 0.1) ninja.dir = turnTo(ninja.dir, Math.atan2(fx, fz), Math.min(1, dt * 10));
  } else {
    const cp = Math.cos(cam.pitch);
    wantPos.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
    wantLook.set(cam.tx, cam.ty + (cam.mode === "top" ? 0 : 3.2), cam.tz);       // מבט מעט כלפי מעלה – ההר והעשן נשארים בתמונה
  }
  if (cam.intro) {                                   // פתיחה: מסתכלים מהנינג'ה אל פסגת ההר, ואחר כך יורדים אליו
    const k = cam.intro.k, ex = ninja.x + 0.8, ez = ninja.z + 6;
    wantPos.set(ex, 2.2 + 1.6 * k, ez + 2 * k);
    wantLook.set(ninja.x * k, (MTN.h * 0.75) * (1 - k) + 1.1 * k, mountain.g.position.z * (1 - k) + ninja.z * k);
    cam.blend = 1;
  }
  if (cam.blend < 1) { cam.blend = Math.min(1, cam.blend + dt * 2.5); const k = cam.blend * cam.blend * (3 - 2 * cam.blend); camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); }
  else { camPos.copy(wantPos); camLook.copy(wantLook); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  sun.position.set(ninja.x + 12, 24, ninja.z + 9); sun.target.position.set(ninja.x, 0, ninja.z);
}
// כפתורי המבטים
(function viewButtons() {
  const bar = document.createElement('div'); bar.id = 'views';
  Object.entries(VIEWS).forEach(([k, v]) => {
    const b = document.createElement('button'); b.textContent = v.label; b.dataset.v = k;
    b.addEventListener('click', e => { e.stopPropagation(); setView(k); });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
})();
addEventListener('keydown', e => { if (e.key === 'v' || e.key === 'V') { const ks = Object.keys(VIEWS); setView(ks[(ks.indexOf(cam.mode) + 1) % ks.length]); } });

// ---------- קלט מגע ----------
const hintEl = document.getElementById('hint');
let moved = false;
function noteMoved() { if (!moved) { moved = true; setTimeout(() => { hintEl.style.opacity = '0'; }, 2500); } }
const marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.06; marker.visible = false; scene.add(marker);
const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function tapAt(px, py) {
  if (journey.tap(px, py)) return;
  const v = new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
  ray.setFromCamera(v, camera);
  if (!ray.ray.intersectPlane(groundPlane, hit)) return;
  const [x, z] = resolve(Math.max(BOX.x0, Math.min(BOX.x1, hit.x)), Math.max(BOX.z0, Math.min(BOX.z1, hit.z)));
  ninja.target = [x, z]; marker.position.x = x; marker.position.z = z; marker.visible = true; marker.userData.t = 0;
  noteMoved();
}
// כל אצבע מקבלת תפקיד כשהיא נוגעת:
//   חצי שמאלי של המסך (40%) – ג'ויסטיק: גוררים כדי ללכת, בכל כיוון, יחסית למצלמה.
//   שאר המסך – מצלמה: גרירה מסובבת, שתי אצבעות – זום וסיבוב.
//   נגיעה קצרה בלי גרירה בכל מקום – הליכה למקום שנגעו בו.
// כך אפשר ללכת ביד אחת ולסובב את המצלמה ביד השנייה באותו זמן.
const ptrs = new Map();
let gesture = null;
const stick = { id: null, ox: 0, oy: 0, vx: 0, vy: 0 };
const STICK_R = 60;
const stickBase = document.createElement('div'), stickKnob = document.createElement('div');
Object.assign(stickBase.style, { position: 'fixed', width: STICK_R * 2 + 'px', height: STICK_R * 2 + 'px', borderRadius: '50%', border: '3px solid rgba(255,255,255,.7)',
  background: 'rgba(15,23,42,.18)', pointerEvents: 'none', display: 'none', transform: 'translate(-50%,-50%)' });
Object.assign(stickKnob.style, { position: 'fixed', width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,.85)',
  boxShadow: '0 2px 8px rgba(0,0,0,.25)', pointerEvents: 'none', display: 'none', transform: 'translate(-50%,-50%)' });
document.body.append(stickBase, stickKnob);
function showStick(on) { stickBase.style.display = stickKnob.style.display = on ? 'block' : 'none'; }
function placeStick() {
  stickBase.style.left = stick.ox + 'px'; stickBase.style.top = stick.oy + 'px';
  stickKnob.style.left = stick.ox + stick.vx * STICK_R + 'px'; stickKnob.style.top = stick.oy + stick.vy * STICK_R + 'px';
}
const cv = renderer.domElement;
function camPtrs() { return [...ptrs.values()].filter(q => q.role === 'cam'); }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const p = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
  p.role = (e.clientX < innerWidth * 0.4 && stick.id === null && e.pointerType !== 'mouse') ? 'stick' : 'cam';
  ptrs.set(e.pointerId, p);
  if (p.role === 'stick') { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.vx = stick.vy = 0; }
  const cp = camPtrs(); if (cp.length === 2) gesture = twoInfo(cp);
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10) p.drag = true;
  if (p.role === 'stick') {
    if (!p.drag) return;
    let vx = (p.x - stick.ox) / STICK_R, vy = (p.y - stick.oy) / STICK_R, m = Math.hypot(vx, vy);
    if (m > 1) { vx /= m; vy /= m; }
    stick.vx = vx; stick.vy = vy; showStick(true); placeStick();
    ninja.target = null; marker.visible = false; noteMoved();
    return;
  }
  const cp = camPtrs();
  if (cp.length === 1) {
    if (p.drag) {
      cam.yaw -= dx * (cam.mode === 'eyes' ? 0.006 : 0.008);
      if (cam.mode === 'eyes') cam.look = Math.max(-0.8, Math.min(0.7, cam.look - dy * 0.004));
      else cam.pitch = Math.max(0.12, Math.min(1.4, cam.pitch + dy * 0.005));
      noteMoved();
    }
  } else if (cp.length === 2 && gesture) {
    const g = twoInfo(cp);
    if (cam.mode !== 'eyes') cam.dist = Math.max(3.5, Math.min(32, cam.dist * gesture.d / g.d));
    let da = g.a - gesture.a; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    cam.yaw -= da;
    gesture = g; cp.forEach(q => { q.drag = true; });
  }
});
function twoInfo(cp) { const [a, b] = cp; return { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), a: Math.atan2(b.y - a.y, b.x - a.x) }; }
function endPtr(e, cancel) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  ptrs.delete(e.pointerId);
  if (p.role === 'stick') { stick.id = null; stick.vx = stick.vy = 0; showStick(false); }
  if (camPtrs().length < 2) gesture = null;
  if (!cancel && !p.drag && performance.now() - p.t < 450 && ![...ptrs.values()].some(q => q.role === 'cam' && q.drag)) tapAt(e.clientX, e.clientY);
}
cv.addEventListener('pointerup', e => endPtr(e, false));
cv.addEventListener('pointercancel', e => endPtr(e, true));
cv.addEventListener('wheel', e => { e.preventDefault(); if (cam.mode !== 'eyes') cam.dist = Math.max(3.5, Math.min(32, cam.dist * (1 + e.deltaY * 0.001))); }, { passive: false });

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ============================================================
//   המסע: ההר באופק, פתיחה שמסבירה את המטרה, תחנות שחוסמות את הדרך,
//   והכלב שמוביל לתחנה הבאה. בינתיים אין זיהוי קולי – נוגעים בשלט עם המילה.
// ============================================================
const KEY_PROG = 'ninjaVoice_village3d_progress';
try { if (/[?&]reset\b/.test(location.search)) localStorage.removeItem(KEY_PROG); } catch (e) {}
const prog = (() => { try { return JSON.parse(localStorage.getItem(KEY_PROG) || '{}'); } catch (e) { return {}; } })();
prog.done = prog.done || [];
function saveProg() { try { localStorage.setItem(KEY_PROG, JSON.stringify(prog)); } catch (e) {} }

// ---------- ההר הגדול בצפון, ואור בפסגה ----------
const MTN = { x: 0, z: -330, h: 95, r: 120 };       // רחוק מאוד, כדי שההתקרבות לאורך המסע תורגש
// הר "אמיתי": משטח עם רכסים וגבשושיות, צבעים לפי גובה (יער → סלע → שלג), וערפל אוויר שמבהיר את מה שרחוק
function peakGeo(r, h, seed, haze) {
  const RS = 64, HS = 40, g = new THREE.CylinderGeometry(0, r, h, RS, HS, true);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position, cols = [], c = new THREE.Color(), sky = new THREE.Color(SKY);
  const n = (a, y) => Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7 + seed * 2 + y * 0.03) * 0.25 + Math.sin(a * 13 + seed * 3 + y * 0.07) * 0.12 + Math.sin(a * 23 + y * 0.11) * 0.06;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = y / h, a = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    const ridge = 1 + n(a, y) * 0.32 * (1 - u * 0.4);                // רכסים ושקעים
    const k = Math.pow(1 - u, 0.85);                                    // מדרון: תלול למעלה, רחב למטה
    const nr = r * k * ridge;
    if (rr > 1e-6) { p.setX(i, x / rr * nr); p.setZ(i, z / rr * nr); }
    p.setY(i, y + Math.sin(a * 5 + seed) * h * 0.015 * (1 - u));
    const snowLine = 0.62 + n(a, 0) * 0.07;
    if (u > snowLine) c.setHex(0xffffff);
    else if (u > 0.3) c.setHex(0x4e5c6c).lerp(new THREE.Color(0x66727f), Math.max(0, n(a * 2, y)));
    else c.setHex(0x2f4f35).lerp(new THREE.Color(0x4a5e52), u / 0.3);
    c.multiplyScalar(0.78 + 0.32 * Math.max(-1, Math.min(1, (x * 0.8 + z * 0.4) / (rr + 1e-6))) * (u > snowLine ? 0.35 : 1)); // צד מואר / צד בצל
    c.lerp(sky, haze);                                                    // ערפל אוויר
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}
const mountain = (function buildMountain() {
  const g = new THREE.Group(); g.position.set(MTN.x, -4, MTN.z); scene.add(g);
  const mm = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false });
  const add = (geo, x, z, ry) => { const m = new THREE.Mesh(geo, mm); m.position.set(x, 0, z); m.rotation.y = ry || 0; g.add(m); return m; };
  add(peakGeo(MTN.r, MTN.h, 1.3, 0.08), 0, 0);
  add(peakGeo(MTN.r * 0.7, MTN.h * 0.5, 4.1, 0.2), -MTN.r * 0.95, 40, 1);        // כתף משמאל
  add(peakGeo(MTN.r * 0.65, MTN.h * 0.45, 7.7, 0.22), MTN.r * 1.0, 30, 2);        // כתף מימין
  // מקדש קטן בפסגה (גדול מספיק כדי לראות אותו מרחוק)
  const S = 1.5, top = new THREE.Group(); top.position.set(0, MTN.h - 2, 0); top.scale.setScalar(S); g.add(top);
  const F = { fog: false };
  mesh(Box(5, 3, 5), 0x7a1d1d, 0, 1.5, 0, top, F);
  mesh(new THREE.ConeGeometry(5, 3, 4), 0x2a303c, 0, 4.4, 0, top, F).rotation.y = Math.PI / 4;
  // עשן: עמוד דק כמו מדורה רחוקה – פתיתים רכים שעולים, מתרחבים, נוטים ברוח ונעלמים
  const smokeTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const puffs = [], N = 26;
  for (let i = 0; i < N; i++) {
    const m = new THREE.SpriteMaterial({ map: smokeTex, color: 0xd8dcdf, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(m); sp.position.set(0, MTN.h + 6, 0); g.add(sp);
    puffs.push({ sp, life: i / N, rnd: R() });
  }
  g.userData.dyn = true;
  return { g, puffs, smoke: 0 };
})();
// ההר "מתקרב" לאט ככל שהולכים צפונה: בכפר הוא רחוק וקטן באופק, ולרגליו הוא ענק.
// (המרחק האמיתי גדול מדי כדי שההליכה תשנה אותו – לכן מקרבים אותו לפי ההתקדמות)
function placeMountain() {
  const t = Math.max(0, Math.min(1, (6 - ninja.z) / 147)), e = t * t * (3 - 2 * t);
  mountain.g.position.z = ninja.z - (480 - 320 * e);
}
// עוצמת העשן: 0 = אין, 1 = עמוד מלא
function setSmoke(k) { mountain.smoke = k; }
function updateSmoke(dt) {
  const H0 = MTN.h + 5, RISE = 70;
  mountain.puffs.forEach(p => {
    p.life += dt / 9;                                           // כל פתית חי ~9 שניות
    if (p.life >= 1) { p.life -= 1; p.rnd = R(); }
    const u = p.life, k = mountain.smoke;
    p.sp.position.set(Math.sin(u * 3 + p.rnd * 6) * 1.5 + u * u * 22, H0 + u * RISE, Math.cos(u * 2 + p.rnd * 5) * 1.5);
    const size = 4 + u * 16 + p.rnd * 3;
    p.sp.scale.set(size, size, 1);
    p.sp.material.opacity = k * Math.min(1, u * 6) * (1 - u) * 0.55;
    p.sp.material.rotation = p.rnd * 6 + u;
  });
}

// ---------- כיתוב על המסך: אנגלית גדולה + עברית קטנה ----------
const cap = document.createElement('div');
Object.assign(cap.style, { position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)', padding: '14px 22px', borderRadius: '18px',
  background: 'rgba(15,23,42,.72)', color: '#fff', textAlign: 'center', fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
  opacity: '0', transition: 'opacity .4s', maxWidth: '86vw' });
document.body.appendChild(cap);
let capT = 0;
function caption(en, he, secs) {
  cap.innerHTML = '<div style="font-size:30px;font-weight:700;direction:ltr">' + en + '</div>' + (he ? '<div style="font-size:17px;opacity:.85;margin-top:4px">' + he + '</div>' : '');
  cap.style.opacity = '1'; capT = secs || 3.2;
}
const goalEl = document.createElement('div');
Object.assign(goalEl.style, { position: 'fixed', right: '12px', bottom: '14px', padding: '7px 13px', borderRadius: '999px', background: 'rgba(15,23,42,.55)',
  color: '#fde68a', font: '15px system-ui, sans-serif', display: 'none' });
goalEl.textContent = '⛰️ המטרה: להגיע אל המסטר בהר';
document.body.appendChild(goalEl);

// ---------- שלטים עם מילה (ספרייט בעולם) ----------
function wordSprite(word) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(10, 16, 492, 156, 34); g.fill();
  g.fillStyle = '#f6e7c4'; g.beginPath(); g.roundRect(4, 6, 492, 156, 34); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#8b5e3c'; g.stroke();
  g.fillStyle = '#b45309'; g.beginPath(); g.roundRect(44, 46, 30, 52, 15); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#b45309'; g.beginPath(); g.arc(59, 84, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(59, 110); g.lineTo(59, 128); g.stroke();
  g.fillStyle = '#3b2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 86; g.font = 'bold ' + fs + 'px system-ui, sans-serif';
  while (g.measureText(word).width > 380 && fs > 40) { fs -= 4; g.font = 'bold ' + fs + 'px system-ui, sans-serif'; }
  g.fillText(word, 290, 86);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(3.4, 1.2, 1); sp.renderOrder = 10; sp.visible = false; scene.add(sp);
  return sp;
}
// עמוד אור שמסמן את התחנה הבאה (נראה מרחוק)
function beacon() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  m.position.y = 15; scene.add(m); return m;
}

// ---------- התחנות: בינתיים רק מקומות ממוספרים לאורך המסלול (בלי מכשולים) ----------
// ב־3 יש שתי אפשרויות (צומת א – שמאל או ימין); כל אחת מהן נחשבת.
const STATIONS = [
  { id: '1', num: 1, spots: [[2.6, -16]] },
  { id: '2', num: 2, spots: [[-2.6, -36]] },
  { id: '3', num: 3, spots: [[-13, -66], [12, -66]] },
  { id: '4', num: 4, spots: [[-1.5, -92]] },
  { id: '5', num: 5, spots: [[-2.4, -120]] },
  { id: '6', num: 6, spots: [[0, -138]] }
];
STATIONS.forEach(st => { st.posts = st.spots.map(([x, z]) => { const sp = markerPost(x + 1.6, z, st.num); return { x, z, sp }; }); st.at = st.spots[0]; st.near = 4; });
const bcn = beacon();
const anims = [];
function markDone(st) { st.posts.forEach(p => { p.sp.material.map = numberTex('', true); p.sp.material.needsUpdate = true; }); }
STATIONS.forEach(st => { if (prog.done.includes(st.id)) markDone(st); });
if (prog.chest) chest.lid.rotation.x = -1.9;
function current() { return STATIONS.find(st => !prog.done.includes(st.id)); }
function nearestSpot(st) { let b = st.spots[0], bd = Infinity; st.spots.forEach(p => { const d = Math.hypot(ninja.x - p[0], ninja.z - p[1]); if (d < bd) { bd = d; b = p; } }); return b; }

// ---------- ניצוצות ----------
const sparkList = [];
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
function sparks(x, y, z) {
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), sparkMat); m.position.set(x, y, z); scene.add(m);
    sparkList.push({ m, v: new THREE.Vector3((R() - 0.5) * 5, 2 + R() * 3, (R() - 0.5) * 5), t: 0 }); }
}

// ---------- "Woof!" מעל הכלב ----------
const woof = wordSprite('Woof!'); woof.scale.set(1.6, 0.56, 1); woof.material.depthTest = true;
let woofT = 0, idleT = 0;

// ---------- פתיחה ----------
let introT = prog.intro ? -1 : 0;
setSmoke(prog.intro ? 1 : 0);
if (introT === 0) { ninja.x = -0.5; ninja.z = 3; dog.x = 0.8; dog.z = 3.8; cam.yaw = 0; ninja.dir = Math.PI; cam.intro = { k: 0 }; hintEl.style.display = 'none'; }
else goalEl.style.display = 'block';
function endIntro() {
  if (introT < 0) return;
  introT = -1; prog.intro = true; saveProg(); setSmoke(1);
  cam.intro = null; hintEl.style.display = ''; cam.tx = ninja.x; cam.tz = ninja.z;
  const v = VIEWS[cam.mode]; if (!v.eyes) { cam.pitch = v.pitch; cam.dist = v.dist; }
  cam.blend = 0; goalEl.style.display = 'block'; woofT = 1.5;
}
function updateIntro(dt) {
  introT += dt;
  const t = introT;
  ninja.dir = turnTo(ninja.dir, Math.PI, 0.1);
  cam.yaw = 0;
  if (cam.intro) { const u = Math.min(1, Math.max(0, (t - 10) / 3)); cam.intro.k = u * u * (3 - 2 * u); }
  if (t > 1.5) setSmoke(Math.min(1, (t - 1.5) / 3));
  if (t > 3.2 && !updateIntro.c1) { updateIntro.c1 = 1; caption('Smoke on the mountain!', 'עשן עולה מההר!', 3.2); }
  if (t > 6.6 && !updateIntro.c2) { updateIntro.c2 = 1; caption('The master needs help!', 'הזקן: "זה האות של המסטר! הוא קורא לעזרה"', 3.6); }
  if (t > 10.4 && !updateIntro.c3) { updateIntro.c3 = 1; caption('Go to the mountain!', 'הזקן: "אתה חייב להגיע להר!"', 3.4); }
  if (t > 14 && !updateIntro.c4) { updateIntro.c4 = 1; caption('Follow your dog!', 'הכלב יראה לך את הדרך', 3); woofT = 2; }
  if (t > 17.2) endIntro();
}

// ---------- עדכון כל פריים ----------
let lastSt = null;
function updateJourney(dt, now) {
  if (introT >= 0) updateIntro(dt);
  if (capT > 0) { capT -= dt; if (capT <= 0) cap.style.opacity = '0'; }
  if (ninja.action) { ninja.action.t += dt; if (ninja.action.t > ninja.action.dur) ninja.action = null; }
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t += dt; if (a.t < 0) continue; const k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k); a.f(e); if (k >= 1) anims.splice(i, 1); }
  for (let i = sparkList.length - 1; i >= 0; i--) { const p = sparkList[i]; p.t += dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.y += dt * 8; if (p.t > 0.7) { scene.remove(p.m); sparkList.splice(i, 1); } }
  updateSmoke(dt);
  placeMountain();
  const st = current();
  if (st) {
    st.at = nearestSpot(st);
    const d = Math.hypot(ninja.x - st.at[0], ninja.z - st.at[1]);
    bcn.visible = introT < 0; bcn.position.x = st.at[0] + 1.6; bcn.position.z = st.at[1];
    const dc = Math.hypot(camera.position.x - bcn.position.x, camera.position.z - bcn.position.z);   // קרוב למצלמה – נעלם, כדי שלא יכסה את המסך
    bcn.material.opacity = (0.16 + Math.sin(now / 400) * 0.05) * Math.min(1, Math.max(0.25, (d - 4) / 10)) * Math.min(1, Math.max(0, (dc - 6) / 10));
    if (d < st.near && introT < 0) {
      prog.done.push(st.id); saveProg(); markDone(st);
      sparks(st.at[0] + 1.6, 2.6, st.at[1]);
      const nx = current();
      caption('Station ' + st.num + ' ✓', nx ? 'כאן יהיה מכשול. ממשיכים לתחנה ' + nx.num : 'הגעת לרגלי ההר! הטיפוס – בפרק הבא', 2.6);
      if (nx) setTimeout(() => { woofT = 1.6; }, 1800);
    }
  } else bcn.visible = false;
  // התיבה במבוי הסתום
  if (!prog.chest && Math.hypot(ninja.x - CHEST_AT[0], ninja.z - CHEST_AT[1]) < 3.4) {
    prog.chest = true; saveProg(); sparks(CHEST_AT[0], 1.2, CHEST_AT[1]);
    anims.push({ t: 0, dur: 0.8, f: k => { chest.lid.rotation.x = -1.9 * k; } });
    caption('A secret chest!', 'מצאת תיבה סודית! (מה יש בה – נחליט בהמשך)', 3);
  }
  // הכלב נובח כשהנינג'ה עומד הרבה זמן
  idleT = ninja.speed > 0.3 ? 0 : idleT + dt;
  if (idleT > 5 && st && Math.hypot(ninja.x - st.at[0], ninja.z - st.at[1]) > 8) { idleT = 0; woofT = 1.6; }
  if (woofT > 0) { woofT -= dt; woof.visible = true; woof.position.set(dog.x, 1.4 + Math.abs(Math.sin(now / 120)) * 0.15, dog.z); } else woof.visible = false;
}
// הכלב: רץ קצת לפני הנינג'ה בכיוון התחנה הבאה, ומחכה ליד התחנה
function dogLeadTarget() {
  const st = current();
  if (!st || introT >= 0) return null;
  const dx = st.at[0] - ninja.x, dz = st.at[1] - ninja.z, d = Math.hypot(dx, dz);
  if (d < 5) return [st.at[0] + 1.2, st.at[1] + 1.2];
  const k = Math.min(d - 2, 5.5);
  return [ninja.x + dx / d * k, ninja.z + dz / d * k];
}
// נגיעה בשלט = אמירת המילה
const spRay = new THREE.Raycaster();
const journey = {
  tap(px, py) {
    if (introT >= 0) { if (introT > 1) endIntro(); return true; }
    return false;
  }
};
function sayWord() {}

// ---------- מפה: כפתור בפינה, מפה על נייר עם המסלול, התחנות, התיבה והנינג'ה ----------
const mapBtn = document.createElement('button');
mapBtn.textContent = '🗺️ מפה';
Object.assign(mapBtn.style, { position: 'fixed', right: '12px', top: '52px', padding: '7px 12px', borderRadius: '10px', border: '0',
  background: 'rgba(15,23,42,.55)', color: '#f8fafc', font: '15px system-ui, sans-serif', cursor: 'pointer' });
document.body.appendChild(mapBtn);
const mapWrap = document.createElement('div');
Object.assign(mapWrap.style, { position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,.35)' });
const mapCv = document.createElement('canvas');
mapWrap.appendChild(mapCv); document.body.appendChild(mapWrap);
let mapOpen = false;
mapBtn.addEventListener('click', e => { e.stopPropagation(); mapOpen = !mapOpen; mapWrap.style.display = mapOpen ? 'flex' : 'none'; });
mapWrap.addEventListener('pointerdown', e => { e.stopPropagation(); mapOpen = false; mapWrap.style.display = 'none'; });
const MAPB = { x0: -32, x1: 32, z0: -152, z1: 26 };
function drawMap(now) {
  const H = Math.min(innerHeight * 0.86, 720), W = H * (MAPB.x1 - MAPB.x0) / (MAPB.z1 - MAPB.z0) * 1.15, dpr = Math.min(2, devicePixelRatio || 1);
  if (mapCv.width !== Math.round(W * dpr)) { mapCv.width = Math.round(W * dpr); mapCv.height = Math.round(H * dpr); mapCv.style.width = W + 'px'; mapCv.style.height = H + 'px'; }
  const g = mapCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 26, sx = (W - pad * 2) / (MAPB.x1 - MAPB.x0), sz = (H - pad * 2) / (MAPB.z1 - MAPB.z0);
  const P = (x, z) => [pad + (x - MAPB.x0) * sx, pad + (z - MAPB.z0) * sz];
  // נייר
  g.fillStyle = '#efe2c2'; g.beginPath(); g.roundRect(0, 0, W, H, 16); g.fill();
  g.strokeStyle = '#8b5e3c'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = 'rgba(139,94,60,.35)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(9, 9, W - 18, H - 18, 10); g.stroke();
  // עמק
  g.lineCap = 'round'; g.lineJoin = 'round';
  const line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => { const [X, Y] = P(p[0], p[1]); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); };
  Object.values(ROUTE).forEach(pts => line(pts, CORR * 2 * sx, '#d6e3b0'));
  { const [X, Y] = P(VILLAGE.x, VILLAGE.z); g.fillStyle = '#d6e3b0'; g.beginPath(); g.ellipse(X, Y, VILLAGE.r * sx, VILLAGE.r * sz, 0, 0, 6.283); g.fill(); }
  Object.values(ROUTE).forEach(pts => line(pts, 3, '#a0743f'));
  // הכפר וההר
  g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#5b3a1e';
  { const [X, Y] = P(VILLAGE.x, VILLAGE.z); g.fillText('🏠 הכפר', X, Y + 4); }
  { const [X, Y] = P(0, -146); g.fillStyle = '#56606b'; g.beginPath(); g.moveTo(X - 22, Y + 6); g.lineTo(X, Y - 16); g.lineTo(X + 22, Y + 6); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(X - 7, Y - 9); g.lineTo(X, Y - 16); g.lineTo(X + 7, Y - 9); g.closePath(); g.fill();
    g.fillStyle = 'rgba(120,120,120,.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + 3 + i * 3, Y - 20 - i * 6 - (now / 300 % 6), 3 + i, 0, 6.283); g.fill(); } }
  // תיבה
  { const [X, Y] = P(CHEST_AT[0], CHEST_AT[1]); g.font = '18px system-ui'; g.fillText(prog.chest ? '📦' : '❔', X, Y + 6); }
  // תחנות
  const cur = current();
  STATIONS.forEach(st => st.spots.forEach(([x, z]) => {
    const [X, Y] = P(x, z), done = prog.done.includes(st.id), next = st === cur;
    const r = next ? 11 + Math.sin(now / 250) * 2 : 10;
    g.fillStyle = done ? '#16a34a' : next ? '#f59e0b' : '#f6e7c4'; g.beginPath(); g.arc(X, Y, r, 0, 6.283); g.fill();
    g.strokeStyle = '#5b3a1e'; g.lineWidth = 2; g.stroke();
    g.fillStyle = done ? '#fff' : '#3b2a1a'; g.font = 'bold 13px system-ui'; g.fillText(done ? '✓' : String(st.num), X, Y + 5);
  }));
  // הנינג'ה
  { const [X, Y] = P(ninja.x, ninja.z); g.fillStyle = 'rgba(220,38,38,.25)'; g.beginPath(); g.arc(X, Y, 12 + Math.sin(now / 200) * 2, 0, 6.283); g.fill();
    g.fillStyle = '#dc2626'; g.beginPath(); g.arc(X, Y, 6, 0, 6.283); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#dc2626'; g.lineWidth = 3; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.sin(ninja.dir) * 14, Y + Math.cos(ninja.dir) * 14 * (sz / sx)); g.stroke(); }
  g.fillStyle = '#5b3a1e'; g.font = '13px system-ui'; g.fillText('נגיעה – סגירה', W / 2, H - 10);
}

// ---------- לולאה ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (introT < 0) updateNinja(dt, now); else { ninja.speed = 0; poseNinja(ninja, dt, now); ninja.root.rotation.y = ninja.dir; }
  updateDog(dt, now); updateJourney(dt, now); placeCamera(dt);
  if (mapOpen) drawMap(now);
  swayers.forEach(s => { if (s.y) s.o.rotation.y = Math.sin(now / 400 + s.ph) * s.a; else { s.o.rotation.z = Math.sin(now / 1300 + s.ph) * s.a; if (s.z) s.o.rotation.x = Math.cos(now / 1700 + s.ph) * s.a * 0.6; } });
  koi.forEach(k => {
    const a = k.a + now / 1000 * k.sp, x = k.x + Math.cos(a) * k.rx, z = k.z + Math.sin(a) * k.rz;
    k.f.position.set(x, 0.035, z); k.f.rotation.y = Math.atan2(-Math.sin(a) * k.rx * k.sp, Math.cos(a) * k.rz * k.sp);
    k.tail.rotation.z = Math.sin(now / 150) * 0.4;
  });
  glowMats.forEach((m, i) => { m.emissiveIntensity = 0.85 + Math.sin(now / 170 + i) * 0.08; });
  people.forEach(p => {                                   // תושב קרוב מסתובב אל הנינג'ה
    const dx = ninja.x - p.x, dz = ninja.z - p.z, near = dx * dx + dz * dz < 36;
    p.g.rotation.y = turnTo(p.g.rotation.y, near ? Math.atan2(dx, dz) : p.base, Math.min(1, dt * 4));
    p.g.position.y = Math.sin(now / 800 + p.ph) * 0.012; p.head.rotation.z = Math.sin(now / 1500 + p.ph) * 0.05;
  });
  if (marker.visible) { marker.userData.t = (marker.userData.t || 0) + dt; const k = (marker.userData.t % 0.9) / 0.9; marker.scale.setScalar(1 + k * 1.2); marker.material.opacity = 0.8 * (1 - k); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
placeCamera(1);
try { const sv = localStorage.getItem('ninjaVoice_village3d_view'); setView(VIEWS[sv] ? sv : 'far'); } catch (e) { setView('far'); }
cam.blend = 1;
requestAnimationFrame(loop);

// לבדיקות בלבד
window.__v3d = { openMap() { mapOpen = true; mapWrap.style.display = 'flex'; }, mountain, scene, ninja, dog, cam, tapAt, setView, STATIONS, sayWord, current, endIntro, prog, introAt(t) { introT = t; }, get introT() { return introT; }, setSmoke, colliders, goTo(x, z) { ninja.target = [x, z]; }, tp(x, z) { ninja.x = x; ninja.z = z; ninja.target = null; } };
