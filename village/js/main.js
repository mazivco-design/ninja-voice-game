/* ============================================================
   village/js/main.js – מצב המשחק, ניווט (A*), קלט, עדכון וציור.
   ============================================================ */

const view = { z: 1.5, cx: 0, cy: 0 };
let scene = OUT;
const ninja = { x: OUT.start.x, y: OUT.start.y, dir: 'down', phase: 0, walking: false, path: [], goal: null };
let doorArmed = true, bubble = null, marker = null, fade = null, moved = false;
const keys = {};

function zoomFor(s) { return s === ROOM ? Math.min(SW / (ROOM.w + 50), SH / (ROOM.D * K + BW * ROOM.S0 + 80), 2.6) : Math.max(1.15, Math.min(SW / 820, SH / 560, 2)); }

// רשת לחדר (בחוץ הרשת נבנית ב־world.js)
function buildGrid(s) {
  const C = s.cell, cols = Math.ceil(s.w / C), rows = Math.ceil(s.h / C), g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[r * cols + c] = s.blocked((c + 0.5) * C, (r + 0.5) * C) ? 1 : 0;
  s.grid = { cols, rows, g };
}
function lineFree(s, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 5);
  for (let i = 1; i <= n; i++) { const k = i / n; if (s.blocked(ax + (bx - ax) * k, ay + (by - ay) * k)) return false; }
  return true;
}
// A* עם ערימה. אם אי אפשר להגיע ליעד (למשל מעבר שעוד סגור) – הולכים לנקודה הכי קרובה אליו.
function findPath(s, sx, sy, tx, ty) {
  if (lineFree(s, sx, sy, tx, ty)) return [[tx, ty]];
  const { cols, rows, g } = s.grid, C = s.cell;
  const idx = (x, y) => Math.max(0, Math.min(rows - 1, Math.floor(y / C))) * cols + Math.max(0, Math.min(cols - 1, Math.floor(x / C)));
  const start = idx(sx, sy), goal = idx(tx, ty), gc = goal % cols, gr = Math.floor(goal / cols);
  const N = cols * rows, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const h = i => { const dx = Math.abs(i % cols - gc), dy = Math.abs(Math.floor(i / cols) - gr); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  gs[start] = 0; push(h(start), start);
  let best = start, bestH = h(start), reached = false, steps = 0;
  while (heap.length && steps++ < 90000) {
    const cur = pop()[1];
    if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) { reached = true; break; }
    const hc = h(cur); if (hc < bestH) { bestH = hc; best = cur; }
    const cx = cur % cols, cy = Math.floor(cur / cols);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx; if (g[ni] || closed[ni]) continue;
      if (dx && dy && (g[cy * cols + nx] || g[ny * cols + cx])) continue;
      const ng = gs[cur] + (dx && dy ? 1.414 : 1);
      if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; push(ng + h(ni), ni); }
    }
  }
  const end = reached ? goal : best;
  if (end === start) return null;
  const pts = [reached ? [tx, ty] : [(end % cols + 0.5) * C, (Math.floor(end / cols) + 0.5) * C]];
  for (let i = from[end]; i !== -1 && i !== start; i = from[i]) pts.unshift([(i % cols + 0.5) * C, (Math.floor(i / cols) + 0.5) * C]);
  const out = []; let px = sx, py = sy, k = 0;
  while (k < pts.length) {
    let far = k;
    for (let j = Math.min(pts.length - 1, k + 60); j > k; j--) if (lineFree(s, px, py, pts[j][0], pts[j][1])) { far = j; break; }
    out.push(pts[far]); px = pts[far][0]; py = pts[far][1]; k = far + 1;
  }
  return out;
}
function nearestFree(s, x, y) {
  const { cols, rows, g } = s.grid, C = s.cell;
  const c0 = Math.max(0, Math.min(cols - 1, Math.floor(x / C))), r0 = Math.max(0, Math.min(rows - 1, Math.floor(y / C)));
  for (let rad = 0; rad < 30; rad++) {
    let best = null, bd = Infinity;
    for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || g[r * cols + c]) continue;
      if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== rad) continue;
      const px = (c + 0.5) * C, py = (r + 0.5) * C, d = Math.hypot(px - x, (py - y) * K);
      if (d < bd) { bd = d; best = [px, py]; }
    }
    if (best) return best;
  }
  return null;
}
function goTo(wx, wy, goal) {
  let tx = wx, ty = wy;
  if (scene.blocked(tx, ty)) { const f = nearestFree(scene, tx, ty); if (!f) return; [tx, ty] = f; }
  const p = findPath(scene, ninja.x, ninja.y, tx, ty);
  if (!p) return;
  ninja.path = p; ninja.goal = goal || null;
  const last = p[p.length - 1];
  marker = { x: last[0], y: last[1], t: 0 };
  noteMoved();
}
function onTap(sx, sy) {
  if (fade) return;
  const mx = sx / view.z + view.cx, my = sy / view.z + view.cy;     // על המסך (לפני הכיווץ)
  if (scene === OUT) {
    const b = signHit(mx, my);
    if (b) { openBarrier(b); afterOpen(b); return; }
    for (const h of OUT.houses) if (inRect(mx, my, h.hit)) { goTo(h.doorX, h.zone.y + 10, { house: h }); return; }
    goTo(mx, my / K, null);
  } else {
    const [gx, gy] = rUnP(mx, my);
    if (gy > ROOM.D - 16 && Math.abs(gx - 240) < 46) { goTo(240, 328, { exit: true }); return; }
    goTo(gx, gy, null);
  }
}
// אחרי שמעבר נפתח: בנהר – הנינג'ה קופץ על האבנים לצד השני
function afterOpen(b) {
  if (b.id === 'jump' && ninja.x < CROSS_X) setTimeout(() => goTo(CROSS_X + 110, CROSS_Y + 4, null), 450);
}
function noteMoved() { if (!moved) { moved = true; hintEl.style.opacity = '0'; } }

// ---------- קלט ----------
let pointerDown = false, lastDrag = 0;
cv.addEventListener('pointerdown', e => { pointerDown = true; onTap(e.clientX, e.clientY); });
cv.addEventListener('pointermove', e => {
  if (!pointerDown) return; const now = performance.now();
  if (now - lastDrag > 160) { lastDrag = now; onTap(e.clientX, e.clientY); }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => { pointerDown = false; }));
const KEYMAP = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });

// ---------- מעברים בין מסכים ----------
function switchScene(next, x, y, dir) { fade = { t: 0, next, x, y, dir }; }
function applySwitch(f) {
  scene = f.next;
  ninja.x = f.x; ninja.y = f.y; ninja.dir = f.dir; ninja.path = []; ninja.goal = null; marker = null;
  view.z = zoomFor(scene);
  if (!scene.grid) buildGrid(scene);
  doorArmed = true;
}
function checkDoors() {
  let inAny = false;
  if (scene === OUT) {
    for (const h of OUT.houses) {
      if (!inRect(ninja.x, ninja.y, h.zone)) continue;
      inAny = true;
      const wants = ninja.dir === 'up' || (ninja.goal && ninja.goal.house === h && !ninja.path.length);
      if (doorArmed && wants) {
        doorArmed = false;
        if (h.enter) switchScene(ROOM, ROOM.start.x, ROOM.start.y, 'up');
        else bubble = { text: 'סגור', x: h.doorX, y: h.front - WALL + 10, t: 0 };
      }
    }
  } else if (inRect(ninja.x, ninja.y, ROOM.exit)) {
    inAny = true;
    const wants = ninja.dir === 'down' || (ninja.goal && ninja.goal.exit);
    if (doorArmed && wants) {
      doorArmed = false;
      const h = OUT.houses[0];
      switchScene(OUT, h.doorX, h.zone.y + h.zone.h + 6, 'down');
    }
  }
  if (!inAny) doorArmed = true;
}

// ---------- עדכון ----------
function setDirFrom(dx, dy) {       // dx, dy על המסך
  if (Math.abs(dx) > Math.abs(dy) * 1.15) ninja.dir = dx > 0 ? 'right' : 'left';
  else if (Math.abs(dy) > 0.01) ninja.dir = dy > 0 ? 'down' : 'up';
}
function update(dt, now) {
  if (fade) {
    fade.t += dt;
    if (!fade.done && fade.t >= 0.22) { fade.done = true; applySwitch(fade); }
    if (fade.t >= 0.48) fade = null;
    return;
  }
  const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  ninja.walking = false;
  if (kx || ky) {
    ninja.path = []; ninja.goal = null; marker = null; noteMoved();
    const n = Math.hypot(kx, ky), step = SPEED * dt;
    const mx = kx / n * step, my = ky / n * step / K;           // מהירות קבועה על המסך
    let didMove = false;
    if (mx && !scene.blocked(ninja.x + mx, ninja.y)) { ninja.x += mx; didMove = true; }
    if (my && !scene.blocked(ninja.x, ninja.y + my)) { ninja.y += my; didMove = true; }
    setDirFrom(kx, ky);
    ninja.walking = didMove;
  } else if (ninja.path.length) {
    let left = SPEED * dt;
    while (left > 0 && ninja.path.length) {
      const [tx, ty] = ninja.path[0], dx = tx - ninja.x, dy = ty - ninja.y, ds = Math.hypot(dx, dy * K);
      if (ds < 0.5) { ninja.x = tx; ninja.y = ty; ninja.path.shift(); continue; }
      setDirFrom(dx, dy * K);
      if (left < ds) { ninja.x += dx * left / ds; ninja.y += dy * left / ds; left = 0; break; }
      ninja.x = tx; ninja.y = ty; left -= ds; ninja.path.shift();
    }
    ninja.walking = true;
    if (!ninja.path.length) {
      marker = null;
      if (ninja.goal && ninja.goal.house) ninja.dir = 'up';
      if (ninja.goal && ninja.goal.exit) ninja.dir = 'down';
    }
  }
  ninja.phase += dt * (ninja.walking ? 11 : 2.5);
  ROOM.elder.phase += dt * 2.5;
  OUT.people.forEach(p => { p.phase += dt * 2.5; });
  if (scene === OUT) { fogReveal(ninja.x, ninja.y, now); updateBarriers(dt, ninja.x, ninja.y); }
  checkDoors();
  if (!ninja.path.length && !(ninja.goal && (ninja.goal.house || ninja.goal.exit))) ninja.goal = null;
  if (marker) marker.t += dt;
  if (bubble) { bubble.t += dt; if (bubble.t > 1.6) bubble = null; }
}

// ---------- ציור ----------
function camera() {
  const vw = SW / view.z, vh = SH / view.z;
  if (scene === ROOM) {
    const top = -BW * ROOM.S0 - 20, bottom = ROOM.D * K + 40;
    view.cx = (ROOM.w - vw) / 2;
    view.cy = (top + bottom - vh) / 2;
    return;
  }
  const lo = -90, hi = OUT.h * K + 10;
  view.cx = Math.max(0, Math.min(OUT.w - vw, ninja.x - vw / 2));
  view.cy = Math.max(lo, Math.min(hi - vh, ninja.y * K - 20 - vh / 2));
}
function faceToward(p) {      // תושב מסתובב אל הנינג'ה כשהוא קרוב
  const dx = ninja.x - p.x, dy = (ninja.y - p.y) * K;
  if (dx * dx + dy * dy > 160 * 160) return p.dir;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
function render(now) {
  camera();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = scene === OUT ? '#2d4a26' : '#1c140c'; ctx.fillRect(0, 0, SW, SH);
  ctx.setTransform(DPR * view.z, 0, 0, DPR * view.z, -view.cx * view.z * DPR, -view.cy * view.z * DPR);
  const vx0 = view.cx, vy0 = view.cy, vx1 = view.cx + SW / view.z, vy1 = view.cy + SH / view.z;
  const items = [];
  if (scene === OUT) {
    drawGround(ctx, vx0, vy0, vx1, vy1);
    ctx.save(); ctx.scale(1, K); OUT.ponds.forEach(p => drawKoi(ctx, p, now)); ctx.restore();
    drawStones(ctx, now);
  } else {
    const L = rP(0, 0);
    ctx.save(); ctx.translate(L[0], 0); ctx.scale(ROOM.S0, ROOM.S0); drawRoomBack(ctx, now); ctx.restore();
    drawRoomSides(ctx);
    drawRoomFloor(ctx);
  }
  if (marker) {
    const k = (marker.t % 0.9) / 0.9, [X, Y] = scene === OUT ? [marker.x, marker.y * K] : rP(marker.x, marker.y), r = 6 + k * 12;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(X, Y, r, r * K, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (scene === OUT) {
    for (const it of STATIC) {
      const yS = it.y * K;
      if (yS - it.top > vy1 || yS + 12 < vy0 || it.x1 < vx0 || it.x0 > vx1) continue;
      items.push(it);
    }
    OUT.people.forEach(p => items.push({ y: p.y, d: g => drawChar(g, p.x, p.y * K, faceToward(p), p.phase, false, p.look) }));
    const [bx, by, ba] = boulderPos();
    items.push({ y: by, d: g => drawBoulder(g, bx, by * K, ba) });
    items.push({ y: WALL_Y + 0.5, d: drawGate });
    const [gx, gy] = guardPos();
    items.push({ y: gy, d: g => drawChar(g, gx, gy * K, barrier('fight').open ? 'left' : 'down', now / 400, false, GUARD_LOOK) });
    const lift = hopLift(ninja.x, ninja.y);
    items.push({ y: ninja.y, d: g => drawChar(g, ninja.x, ninja.y * K, ninja.dir, ninja.phase, ninja.walking, NINJA_LOOK, lift) });
  } else {
    const T = ROOM.table;
    items.push({ y: T.y + T.ry * 0.3, d: g => at(g, T.x, T.y, drawTable) });
    ROOM.jars.forEach(j => items.push({ y: j[1], d: g => at(g, j[0], j[1], g2 => drawJar(g2, j[2])) }));
    items.push({ y: ROOM.lamp[1], d: g => at(g, ROOM.lamp[0], ROOM.lamp[1], g2 => drawLamp(g2, now)) });
    const E = ROOM.elder;
    items.push({ y: E.y, d: g => at(g, E.x, E.y, g2 => drawChar(g2, 0, 0, ninja.y < E.y - 10 ? 'up' : 'down', E.phase, false, ELDER_LOOK)) });
    items.push({ y: ninja.y, d: g => at(g, ninja.x, ninja.y, g2 => drawChar(g2, 0, 0, ninja.dir, ninja.phase, ninja.walking, NINJA_LOOK)) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.d(ctx, now);
  if (scene === OUT) {
    ctx.globalAlpha = 0.97; ctx.drawImage(fogCv, 0, 0, OUT.w, OUT.h * K); ctx.globalAlpha = 1;
    BARRIERS.forEach(b => drawSign(ctx, b, now));
    drawSparkles(ctx);
  }
  if (bubble) {
    const a = Math.min(1, (1.6 - bubble.t) * 3);
    ctx.globalAlpha = a; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rr(ctx, bubble.x - 22, bubble.y - 22, 44, 22, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(bubble.text, bubble.x, bubble.y - 6.5); ctx.globalAlpha = 1;
  }
  if (fade) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const a = fade.t < 0.22 ? fade.t / 0.22 : Math.max(0, 1 - (fade.t - 0.22) / 0.26);
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, SW, SH);
  }
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  view.z = zoomFor(scene);
  setGroundScale(Math.min(2, Math.max(1, Math.round(zoomFor(OUT) * DPR * 2) / 2)));
}
addEventListener('resize', resize);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt, now); render(now);
  requestAnimationFrame(loop);
}
resize();
requestAnimationFrame(loop);

// לבדיקות בלבד
window.__village = {
  ninja, goTo, onTap, OUT, ROOM, view, BARRIERS, openBarrier, afterOpen, fogSeen,
  get scene() { return scene === OUT ? 'out' : 'room'; },
  tp(x, y) { ninja.x = x; ninja.y = y; ninja.path = []; }
};
