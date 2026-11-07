/* ============================================================
   village/2d/iso/main.js – דוגמה 2: פינה איזומטרית.
   Phaser 3 + Kenney Isometric Landscape (CC0) – בחבילה יש רק קרקע:
   דשא, מים, עפר, מדרונות ודרכים. העצים, השער, הנינג'ה והכלב מצוירים כאן בקוד.
   ============================================================ */

const N = 16;               // גודל הרשת
const HW = 66, HH = 33;     // חצי רוחב/גובה של המעוין העליון
const RAISE = 24;           // גבעה: אריח דשא מורם

// סוגי תאים: g דשא · d דרך עפר · w מים · h גבעה מוגבהת · p פסגה (נוף בלבד)
const ROWS = [
  'ggggggggggggpphp',
  'gggggggdgggghhhp',
  'gwwwggdggggghhhh',
  'gwwwwgdggggghhhh',
  'ggwwwgdggggggghh',
  'gggggdgggggggggg',
  'gggggdgggggggggg',
  'ggggdggggggggggg',
  'ggggdggggggggggg',
  'gggdgggggggggggg',
  'gggdgggggggggggg',
  'gggdgggggwwggggg',
  'ggdggggggwwwgggg',
  'ggdgggggggwwgggg',
  'gdgggggggggggggg',
  'gdgggggggggggggg'];
// מספרי האריחים לפי קובצי ה־PNG (התצוגה המקדימה בחבילה ממוספרת לא נכון)
const TILE = { g: 67, d: 83, w: 66, h: 67, p: 36 };
// היסט אנכי של ראש האריח: מים נמוכים מעט מהדשא, גבעה מורמת, פסגה – הבסיס שלה נמוך יותר בתמונה
const TOP = { g: -33, d: -33, w: -17, h: -33 - RAISE, p: -65 };
const cell = (i, j) => (ROWS[j] && ROWS[j][i]) || null;
const walkable = (i, j) => { const c = cell(i, j); return c === 'g' || c === 'd' || c === 'h'; };
const lift = (i, j) => cell(i, j) === 'h' ? RAISE : 0;
const scr = (i, j) => ({ x: (i - j) * HW, y: (i + j) * HH });

// עצים (מצוירים בקוד) – משבצות חסומות
const TREES = [[1, 8], [2, 10], [0, 12], [5, 1], [4, 0], [9, 6], [10, 8], [12, 9], [13, 12], [14, 7], [11, 14], [6, 13], [9, 2], [0, 6], [15, 10]];
const GATE = [5, 6];        // השער חוסם את הדרך

function treeTexture(scene, key, pine) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x000000, 0.18).fillEllipse(40, 104, 52, 20);
  g.fillStyle(0x8a5a33).fillRect(35, 72, 10, 32);
  if (pine) {
    g.fillStyle(0x4f8f37).fillTriangle(40, 4, 12, 56, 68, 56);
    g.fillStyle(0x6fb444).fillTriangle(40, 4, 40, 56, 68, 56);
    g.fillStyle(0x4f8f37).fillTriangle(40, 28, 6, 84, 74, 84);
    g.fillStyle(0x6fb444).fillTriangle(40, 28, 40, 84, 74, 84);
  } else {
    g.fillStyle(0x5a9e3b).fillCircle(40, 50, 30);
    g.fillStyle(0x7ac04d).fillCircle(48, 42, 20);
  }
  g.generateTexture(key, 80, 110); g.destroy();
}

class Iso extends Phaser.Scene {
  preload() {
    this.load.atlas('iso', '../assets/iso-landscape/tiles.png', '../assets/iso-landscape/tiles.json');
  }
  create() {
    makeCharTextures(this, 3);
    treeTexture(this, 'pine', true); treeTexture(this, 'oak', false);
    const blocked = new Set(TREES.map(([i, j]) => i + ',' + j));
    this.blocked = blocked;

    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = cell(i, j), p = scr(i, j);
      const id = String(TILE[c]).padStart(3, '0');
      this.add.image(p.x, p.y + TOP[c], 'iso', 'landscapeTiles_' + id + '.png').setOrigin(0.5, 0).setDepth((i + j) * 10);
    }
    TREES.forEach(([i, j], k) => {
      const p = scr(i, j);
      this.add.image(p.x, p.y - lift(i, j) + 8, k % 3 ? 'pine' : 'oak').setOrigin(0.5, 0.95).setDepth((i + j) * 10 + 5);
    });

    // שער עץ על הדרך + מילה מעליו
    const gp = scr(...GATE);
    const gg = this.add.graphics().setDepth((GATE[0] + GATE[1]) * 10 + 5);
    gg.fillStyle(0x6b4423);
    gg.fillRect(gp.x - 46, gp.y - 60, 10, 62); gg.fillRect(gp.x + 36, gp.y - 60, 10, 62);
    gg.fillStyle(0x9c6b3c);
    for (let k = 0; k < 4; k++) gg.fillRect(gp.x - 38, gp.y - 52 + k * 13, 76, 9);
    this.gateGfx = gg; blocked.add(GATE.join(','));
    this.word = this.add.text(gp.x, gp.y - 86, 'PUSH', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1e293bcc', padding: { x: 8, y: 3 } })
      .setOrigin(0.5).setDepth(9999).setInteractive();
    this.word.on('pointerdown', (p, lx, ly, e) => { e.stopPropagation(); this.openGate(); });

    // נינג'ה וכלב
    this.pos = { i: 3, j: 12 };
    this.shadow = this.add.ellipse(0, 0, 34, 14, 0x000000, 0.25);
    this.ninja = this.add.image(0, 0, 'ninja_up0').setOrigin(0.5, 0.92);
    this.dogShadow = this.add.ellipse(0, 0, 30, 12, 0x000000, 0.2);
    this.dog = this.add.image(0, 0, 'dog0').setOrigin(0.5, 0.85);
    this.dogPos = { i: 2, j: 14 };
    this.path = []; this.dir = 'up'; this.trail = [{ i: 2, j: 14 }];

    const cam = this.cameras.main;
    const b0 = scr(0, N - 1), b1 = scr(N - 1, 0), b2 = scr(N - 1, N - 1);
    cam.setBounds(b0.x - 200, -300, b1.x - b0.x + 400, b2.y + 500);
    cam.startFollow(this.ninja, true, 0.12, 0.12);
    this.fitZoom(); this.scale.on('resize', () => this.fitZoom());

    this.input.on('pointerdown', p => {
      // מסך → רשת (בקירוב, על פני הקרקע)
      const fx = p.worldX / HW, fy = (p.worldY + 8) / HH;
      const ti = Math.round((fx + fy) / 2), tj = Math.round((fy - fx) / 2);
      const path = this.bfs(this.cur(), { i: ti, j: tj });
      if (path) this.path = path;
    });
    this.keys = this.input.keyboard.createCursorKeys();
    this.place(this.ninja, this.shadow, this.pos);
    window.__v2d = this;
  }
  fitZoom() { this.cameras.main.setZoom(Math.min(this.scale.width, this.scale.height) / 900); }
  cur() { return { i: Math.round(this.pos.i), j: Math.round(this.pos.j) }; }
  free(i, j) { return i >= 0 && j >= 0 && i < N && j < N && walkable(i, j) && !this.blocked.has(i + ',' + j); }
  bfs(a, b) {
    if (!this.free(b.i, b.j)) return null;
    const prev = new Map([[a.i + ',' + a.j, null]]), q = [a];
    while (q.length) {
      const c = q.shift();
      if (c.i === b.i && c.j === b.j) { const out = []; let k = c.i + ',' + c.j; while (k) { const [i, j] = k.split(',').map(Number); out.unshift({ i, j }); k = prev.get(k); } return out.slice(1); }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { i: c.i + di, j: c.j + dj }, k = n.i + ',' + n.j;
        if (!prev.has(k) && this.free(n.i, n.j)) { prev.set(k, c.i + ',' + c.j); q.push(n); }
      }
    }
    return null;
  }
  // גובה רציף: בזמן מעבר בין תאים בגבהים שונים
  liftAt(i, j) { const a = lift(Math.floor(i + .5), Math.floor(j + .5)); return a; }
  place(img, sh, p) {
    const s = scr(p.i, p.j), h = this.liftAt(p.i, p.j);
    img.setPosition(s.x, s.y - h); sh.setPosition(s.x, s.y - h + 2);
    const d = (Math.ceil(p.i - 0.01) + Math.ceil(p.j - 0.01)) * 10 + 6;
    img.setDepth(d + 1); sh.setDepth(d);
  }
  openGate() {
    if (!this.gateGfx.active) return;
    this.word.setText('PUSH ✓').setBackgroundColor('#16a34acc');
    this.tweens.add({ targets: this.gateGfx, y: -20, alpha: 0, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => { this.gateGfx.destroy(); this.blocked.delete(GATE.join(',')); this.time.delayedCall(800, () => this.word.destroy()); } });
  }
  update(t, dt) {
    const k = this.keys;
    if (!this.path.length) {
      const c = this.cur(); let n = null;
      if (k.right.isDown) n = { i: c.i + 1, j: c.j }; else if (k.left.isDown) n = { i: c.i - 1, j: c.j };
      else if (k.up.isDown) n = { i: c.i, j: c.j - 1 }; else if (k.down.isDown) n = { i: c.i, j: c.j + 1 };
      if (n && this.free(n.i, n.j)) this.path = [n];
    }
    let moving = false;
    if (this.path.length) {
      const tgt = this.path[0], di = tgt.i - this.pos.i, dj = tgt.j - this.pos.j, dist = Math.hypot(di, dj);
      const step = 3.2 * dt / 1000;
      const sx = (di - dj), sy = (di + dj) / 2;
      this.dir = Math.abs(sx) > Math.abs(sy) * 1.2 ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
      if (dist <= step) {
        this.pos = { i: tgt.i, j: tgt.j }; this.path.shift();
        this.trail.push({ ...tgt }); if (this.trail.length > 3) this.trail.shift();
      } else { this.pos.i += di / dist * step; this.pos.j += dj / dist * step; moving = true; }
      if (this.path.length) moving = true;
    }
    setCharFrame(this.ninja, this.dir, moving, t);
    this.place(this.ninja, this.shadow, this.pos);

    // הכלב הולך בעקבות הנינג'ה, משבצת אחת מאחור
    const goal = this.trail.length > 1 ? this.trail[this.trail.length - 2] : this.trail[0];
    const di = goal.i - this.dogPos.i, dj = goal.j - this.dogPos.j, dd = Math.hypot(di, dj);
    if (dd > 0.02) { const s = Math.min(dd, 3.4 * dt / 1000); this.dogPos.i += di / dd * s; this.dogPos.j += dj / dd * s;
      this.dog.setFlipX(di - dj < 0); this.dog.setTexture('dog' + (Math.floor(t / 120) % 2)); }
    else this.dog.setTexture('dog0');
    this.place(this.dog, this.dogShadow, this.dogPos);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, backgroundColor: '#2a3b52', pixelArt: false,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: Iso
});
