/* ============================================================
   village/2d/top/main.js – דוגמה 1: פינת כפר במבט מלמעלה.
   Phaser 3 + Kenney Tiny Town (CC0). המפה נבנית כאן במערכים;
   בגרסה האמיתית היא תגיע מקובץ Tiled.
   ============================================================ */

const T = 16, W = 30, H = 36;

// מספרי אריחים בגיליון Tiny Town (מתחילים מ־0, 12 בשורה)
const GRASS = [0, 0, 0, 0, 0, 0, 1, 1, 2];
const DIRT = { tl: 12, t: 13, tr: 14, l: 24, c: 25, r: 26, bl: 36, b: 37, br: 38 };
const TREES = [16, 16, 28, 5, 5, 3, 27];   // עצים של אריח אחד
const HOUSE_RED = [[52, 53, 54], [64, 65, 66], [72, 74, 75]];
const HOUSE_GREY = [[48, 49, 50], [60, 61, 62], [72, 74, 75]];
const FENCE = { l: 80, m: 81, r: 82 };
const WELL = 104, SIGN = 83, LOG = 106, HIVE = 94;

// מחולל אקראי קבוע, כדי שהמפה תיראה אותו דבר בכל טעינה
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function buildMap() {
  const path = [...Array(H)].map(() => Array(W).fill(false));
  const rect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (path[y] && x >= 0 && x < W) path[y][x] = true; };
  rect(14, 0, 15, H - 1);      // הדרך הראשית מדרום לצפון
  rect(8, 23, 21, 29);         // כיכר הכפר
  rect(16, 8, 25, 9);          // שביל צדדי מזרחה (מבוי סתום)

  const ground = [...Array(H)].map((_, y) => [...Array(W)].map((_, x) => {
    if (!path[y][x]) return GRASS[Math.floor(rnd() * GRASS.length)];
    const P = (dx, dy) => { const yy = y + dy, xx = x + dx; return yy < 0 || yy >= H || xx < 0 || xx >= W ? true : path[yy][xx]; };
    const u = P(0, -1), d = P(0, 1), l = P(-1, 0), r = P(1, 0);
    if (!u && !l) return DIRT.tl; if (!u && !r) return DIRT.tr; if (!d && !l) return DIRT.bl; if (!d && !r) return DIRT.br;
    if (!u) return DIRT.t; if (!d) return DIRT.b; if (!l) return DIRT.l; if (!r) return DIRT.r;
    return DIRT.c;
  }));

  const obj = [...Array(H)].map(() => Array(W).fill(-1));
  const put = (x, y, id) => { if (y >= 0 && y < H && x >= 0 && x < W) obj[y][x] = id; };
  const stamp = (x, y, rows) => rows.forEach((row, j) => row.forEach((id, i) => put(x + i, y + j, id)));

  // בתים מעל הכיכר ומתחתיה
  stamp(9, 20, HOUSE_RED); stamp(17, 20, HOUSE_GREY); stamp(9, 30, HOUSE_GREY); stamp(18, 30, HOUSE_RED);
  put(11, 26, WELL); put(13, 30, SIGN); put(20, 27, LOG); put(7, 27, HIVE);

  // השער – גדר לרוחב הדרך בצפון הכפר (המכשול לדוגמה)
  put(12, 14, FENCE.l); put(13, 14, FENCE.m); put(16, 14, FENCE.m); put(17, 14, FENCE.r);

  // עצים: צפופים בשוליים, דלילים ליד הדרך
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (path[y][x] || obj[y][x] !== -1) continue;
    const nearPath = Math.min(Math.abs(x - 14.5) - 1, 99);
    const inVillage = y >= 18 && x >= 6 && x <= 23;
    const edge = x < 3 || x > W - 4;
    let p = edge ? 0.8 : inVillage ? 0.03 : nearPath < 2 ? 0.04 : 0.3;
    if (y === 14 && x >= 11 && x <= 18) p = 0;
    if (rnd() < p) {
      put(x, y, TREES[Math.floor(rnd() * TREES.length)]);
    }
  }
  return { ground, obj };
}

class Village extends Phaser.Scene {
  preload() {
    this.load.spritesheet('tt', '../assets/tiny-town/tilemap_packed.png', { frameWidth: T, frameHeight: T });
  }
  create() {
    makeCharTextures(this, 1);
    const { ground, obj } = buildMap();
    const g = this.make.tilemap({ data: ground, tileWidth: T, tileHeight: T });
    g.createLayer(0, g.addTilesetImage('tt'), 0, 0);
    const o = this.make.tilemap({ data: obj, tileWidth: T, tileHeight: T });
    this.walls = o.createLayer(0, o.addTilesetImage('tt'), 0, 0).setDepth(2);
    this.walls.setCollisionByExclusion([-1]);

    // שער שנפתח במילה: גוף חסימה נפרד + תווית מילה מעליו
    this.gate = this.add.rectangle(15 * T, 14 * T + 8, 2 * T, 10, 0x8b5a2b).setStrokeStyle(1, 0x4a2c10).setDepth(2);
    this.physics.add.existing(this.gate, true);
    this.word = this.add.text(15 * T, 13 * T - 2, 'PUSH', { fontFamily: 'system-ui, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1e293bcc', padding: { x: 3, y: 1 } })
      .setOrigin(0.5).setResolution(4).setDepth(5).setInteractive();
    this.word.on('pointerdown', (p, lx, ly, e) => { e.stopPropagation(); this.openGate(); });

    this.ninja = this.physics.add.sprite(15 * T, 27 * T, 'ninja_up0').setDepth(3);
    this.ninja.body.setSize(8, 5).setOffset(4, 10);
    this.ninja.setCollideWorldBounds(true);
    this.dog = this.add.sprite(13 * T, 28 * T, 'dog0').setDepth(3);
    this.physics.world.setBounds(0, 0, W * T, H * T);
    this.physics.add.collider(this.ninja, this.walls);
    this.gateCollider = this.physics.add.collider(this.ninja, this.gate);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * T, H * T).startFollow(this.ninja, true, 0.15, 0.15).setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());

    this.dir = 'up'; this.target = null; this.stuck = 0;
    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.on('pointerdown', p => { this.target = new Phaser.Math.Vector2(p.worldX, p.worldY); this.stuck = 0; });
    window.__v2d = this;
  }
  fitZoom() { this.cameras.main.setZoom(Math.max(2, Math.round(Math.min(this.scale.width, this.scale.height) / 260))); }
  openGate() {
    if (!this.gate.active) return;
    this.word.setText('PUSH ✓').setBackgroundColor('#16a34acc');
    this.tweens.add({ targets: this.gate, x: this.gate.x + 26, alpha: 0, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => { this.gate.destroy(); this.gateCollider.destroy(); this.time.delayedCall(800, () => this.word.destroy()); } });
  }
  update(t, dt) {
    const k = this.keys, w = this.wasd, n = this.ninja;
    let vx = (k.right.isDown || w.D.isDown) - (k.left.isDown || w.A.isDown);
    let vy = (k.down.isDown || w.S.isDown) - (k.up.isDown || w.W.isDown);
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - n.x, dy = this.target.y - (n.y + 5);
      if (Math.hypot(dx, dy) < 3) this.target = null; else { vx = dx; vy = dy; }
      // אם נתקעים במכשול – עוצרים (לא מחפשים מסלול בדוגמה)
      if (n.body.speed < 5 && this.target) { this.stuck += dt; if (this.stuck > 400) this.target = null; } else this.stuck = 0;
    }
    const len = Math.hypot(vx, vy);
    const speed = 60;
    if (len) { n.setVelocity(vx / len * speed, vy / len * speed); this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up'); }
    else n.setVelocity(0, 0);
    setCharFrame(n, this.dir, !!len, t);
    n.setDepth(3 + n.y / 10000);

    // הכלב עוקב מאחור
    const d = this.dog, bx = n.x - (this.dir === 'right' ? 14 : this.dir === 'left' ? -14 : 0), by = n.y + (this.dir === 'up' ? 14 : this.dir === 'down' ? -14 : 2);
    const ddx = bx - d.x, ddy = by - d.y, dd = Math.hypot(ddx, ddy);
    if (dd > 3) { const s = Math.min(dd, speed * 1.1 * dt / 1000); d.x += ddx / dd * s; d.y += ddy / dd * s; d.setFlipX(ddx < 0); d.setTexture('dog' + (Math.floor(t / 120) % 2)); }
    else d.setTexture('dog0');
    d.setDepth(3 + d.y / 10000);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, backgroundColor: '#3f6b3a', pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade' },
  scene: Village
});
