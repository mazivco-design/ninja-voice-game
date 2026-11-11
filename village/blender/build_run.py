"""
village/blender/build_run.py – בונה בבלנדר את מסלול הריצה (אב־טיפוס "ריצה על מסילה").

  עמק ארוך עם שביל מתפתל שעולה ויורד, ושלושה מכשולים:
    JUMP  – בול עץ שוכב על השביל
    PUSH  – גדר עם שער דו־כנפי
    CLIMB – צוק סלע לרוחב העמק עם סולם
  בדרך: בית יפני, פנס אבן, עצי דובדבן; בסוף: שער טוֹרִי אדום.

הרצה:  python3 build_run.py <תיקיית פלט>     (SAMPLES=מספר לאיכות התמונה, NORENDER=1 לדלג על התמונה)
פלט:   run.blend, run.glb (לא דחוס – דוחסים אחר כך עם gltf-transform meshopt),
       run.json (נקודות השביל, מיקומי המכשולים, ומפת גבהים למצלמה), run.png
"""
import bpy, bmesh, math, random, sys, os, json
OUT = (sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else (sys.argv[1] if len(sys.argv) > 1 else '.'))
os.makedirs(OUT, exist_ok=True)
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
from nature import *
import nature

# ---------- המסלול ----------
X0, X1, YW = -14.0, 164.0, 30.0           # גבולות העולם (x לאורך, y לרוחב)
START, END = -8.0, 156.0                  # תחילת הריצה וסופה
JUMP_X, HOUSE_X, GATE_X, CLIFF_X, TORII_X = 38.0, 58.0, 82.0, 120.0, 150.0
CLIFF_H = 4.6

def path_y(x): return 6.5 * math.sin(x * 0.055) + 2.5 * math.sin(x * 0.13 + 1)
def path_dy(x): return 6.5 * 0.055 * math.cos(x * 0.055) + 2.5 * 0.13 * math.cos(x * 0.13 + 1)
def bump(x, c, w): return math.exp(-((x - c) / w) ** 2)
def cliff_x(y): return CLIFF_X + noise.noise(Vector((0.0, y * 0.18, 5.0))) * 0.9          # קו הצוק מתפתל מעט
def base(x, y):                            # גובה קרקעית העמק: גלי, עולה בהדרגה, וקופץ בצוק
    b = 1.3 * math.sin(x * 0.045) + 2.2 * smooth(44, 100, x) + 1.5 * smooth(128, 156, x)
    return b + CLIFF_H * smooth(-0.3, 0.3, x - cliff_x(y))
HOFF = 8.5
def raw_height(x, y):
    d = abs(y - path_y(x))
    left = y < path_y(x)                                               # הצד של מצלמת הצד בקפיצה
    valley = 4.2 + 1.0 * math.sin(x * 0.07) + (9.0 if left else 2.5) * bump(x, JUMP_X, 11) + 1.5 * bump(x, GATE_X, 6)   # רחב יותר ליד המכשולים
    t = max(0.0, d - valley)
    slope = 13.0 * (1 - math.exp(-((t / 9.5) ** 1.55)))                # עולה בהדרגה ומתיישר לראש גבעה (בלי "מדף" חתוך)
    if left: slope *= 1.2
    n = noise.noise(Vector((x * 0.09, y * 0.09, 0.3))) * 1.6 * min(1, t / 4)
    n += noise.noise(Vector((x * 0.05, y * 0.05, 4.1))) * 2.4 * smooth(6, 16, t)          # גבעות רכות למעלה
    n += noise.noise(Vector((x * 0.35, y * 0.35, 1.7))) * 0.2
    return base(x, y) + slope + n
def height(x, y):
    h = raw_height(x, y)
    hy = path_y(HOUSE_X) + HOFF; dist = math.hypot(x - HOUSE_X, y - hy)
    k = smooth(7.5, 4.0, dist)                                         # מרפסת שטוחה לבית
    h = h * (1 - k) + (raw_height(HOUSE_X, hy) * 0.5 + base(HOUSE_X, hy) * 0.5) * k
    return h - 0.1 * smooth(1.3, 0.8, abs(y - path_y(x)))              # השביל שקוע מעט
nature.HEIGHT[0] = height

# ---------- קרקע ----------
xs = []; x = X0
while x <= X1 + 1e-6:
    xs.append(x); x += 0.12 if abs(x - CLIFF_X) < 1.6 else 0.45       # צפוף יותר סביב הצוק
ys = [-YW + j * 0.5 for j in range(int(2 * YW / 0.5) + 1)]
bm = bmesh.new()
grid = [[bm.verts.new((x, y, height(x, y))) for x in xs] for y in ys]
for j in range(len(ys) - 1):
    for i in range(len(xs) - 1):
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
col = bm.loops.layers.color.new('Col')
G1, G2, ROCK, ROCK2, DIRT = srgb('86b84e'), srgb('5c9640'), srgb('aaa698'), srgb('8f8b7f'), srgb('b88a57')
bm.normal_update(); bm.verts.index_update()
vcol = {}
for v in bm.verts:
    c = v.co; d = abs(c.y - path_y(c.x)); nz = v.normal.z; rel = c.z - base(c.x, c.y)
    k = max(0, min(1, (rel / 7) + noise.noise(c * 0.2) * 0.3))
    rgb = mix(G1, G2, k)
    rgb = mix(rgb, DIRT, smooth(1.35, 0.85, d + noise.noise(c * 0.8) * 0.15))                # שביל
    rk = mix(ROCK, ROCK2, 0.5 + 0.5 * noise.noise(c * 0.6))
    rgb = mix(rgb, rk, smooth(0.62, 0.45, nz))                                               # תלול מאוד → סלע (גם הצוק)
    vcol[v.index] = rgb
for f in bm.faces:
    for l in f.loops: l[col] = (*vcol[l.vert.index], 1)
obj_from_bm('Ground', bm, M['ground'], smooth=True)          # חלק – כדי שקווי המתאר (בסגנון המצויר) לא יסמנו כל משולש

# ---------- מכשולים ----------
def along(x, lat=0.0):
    """נקודה על השביל (או במרחק צידי ממנו) + זווית כיוון השביל."""
    a = math.atan(path_dy(x)); px, py = x - math.sin(a) * lat, path_y(x) + math.cos(a) * lat
    return px, py, a

# JUMP – בול עץ שוכב לרוחב השביל
px, py, a = along(JUMP_X)
b = bmesh.new(); tube(b, [Vector((0, -1.9, 0)), Vector((0, -0.6, 0.04)), Vector((0, 0.7, 0)), Vector((0, 1.9, 0.03))], [0.5, 0.48, 0.5, 0.46], 10)
log = obj_from_bm('LogWood', b, M['bark'], smooth=True)
caps = [cyl('LogCap', 0.47, 0.47, 0.03, (0, 0, 0), M['wall'], 10) for _ in range(2)]
caps[0].rotation_euler.x = math.pi / 2; caps[0].location = (0, -1.89, 0); caps[1].rotation_euler.x = -math.pi / 2; caps[1].location = (0, 1.89, 0.03)
stub = bmesh.new(); tube(stub, [Vector((0.1, 0.5, 0.3)), Vector((0.25, 0.6, 0.75)), Vector((0.3, 0.65, 1.0))], [0.12, 0.09, 0.05], 6)
group('Log', [log, *caps, obj_from_bm('LogStub', stub, M['bark'], smooth=True)], (px, py, height(px, py) + 0.42), a)

# PUSH – גדר לרוחב העמק עם שער דו־כנפי (הכנפיים הן חפצים נפרדים עם ציר, כדי שהמשחק יסובב אותן)
px, py, a = along(GATE_X); gz = height(px, py); parts = []
GW, GH = 1.35, 2.3                                                     # חצי רוחב הפתח, גובה השער
for side in (-1, 1):
    parts.append(box('GatePost', (0.34, 0.34, GH + 0.9), (0, side * (GW + 0.17), (GH + 0.9) / 2 - 0.2), M['woodDark']))
    for k in range(1, 9):                                              # גדר כלונסאות שמתרחקת ומטפסת על המדרון
        lat = side * (GW + 0.17 + k * 1.15); wx, wy, _ = along(GATE_X, lat)
        hz = height(wx, wy) - gz
        parts.append(box('FencePost', (0.2, 0.2, 1.9), (0, lat, hz + 0.75), M['wood']))
        if k > 1 or True:
            plat = side * (GW + 0.17 + (k - 0.5) * 1.15); qx, qy, _ = along(GATE_X, plat); pz = height(qx, qy) - gz
            for hh in (0.55, 1.25): parts.append(box('FenceRail', (0.09, 1.2, 0.16), (0, plat, pz + hh), M['wood']))
parts.append(box('GateBeam', (0.3, 2 * GW + 1.5, 0.3), (0, 0, GH + 0.55), M['woodDark']))
parts.append(box('GateBeam2', (0.42, 2 * GW + 2.3, 0.22), (0, 0, GH + 0.95), M['roof']))
gate = group('Gate', parts, (px, py, gz), a)
for side, name in ((-1, 'GateL'), (1, 'GateR')):
    leaf = [box('Plank', (0.1, GW - 0.04, GH - 0.1), (0, -side * (GW - 0.04) / 2, GH / 2), M['wood'])]
    for hh in (0.35, GH - 0.45): leaf.append(box('Brace', (0.16, GW - 0.04, 0.16), (0, -side * (GW - 0.04) / 2, hh), M['woodDark']))
    leaf.append(box('Ring', (0.2, 0.12, 0.12), (0.02, -side * (GW - 0.22), GH * 0.5), M['stoneDark']))
    e = group(name, leaf, (0, side * GW, 0.02), 0); e.parent = gate   # הציר בקצה החיצוני של כל כנף

# CLIMB – סולם על הצוק
cy = path_y(CLIFF_X); cx = cliff_x(cy)
zb, zt = height(cx - 1.2, cy), height(cx + 1.2, cy)
lad = []; LH = zt - zb + 0.9
for s in (-1, 1): lad.append(box('Rail', (0.12, 0.12, LH), (0, s * 0.42, LH / 2), M['wood']))
for k in range(int(LH / 0.5)): lad.append(box('Rung', (0.08, 0.84, 0.08), (0, 0, 0.35 + k * 0.5), M['woodDark']))
ladder = group('Ladder', lad, (cx - 0.62, cy, zb - 0.05), 0); ladder.rotation_euler.y = 0.1

# בית, פנס, דובדבנים
hx, hy = HOUSE_X, path_y(HOUSE_X) + HOFF
house(hx, hy, 0); lantern(hx - 3.0, hy - 3.8)
ch = cherry(0, 0, 1.0); instance(ch, hx + 4.8, hy - 3.6, 0.8, dz=-0.15); instance(ch, hx - 6.0, hy + 1.0, 0.7, dz=-0.15)
instance(ch, 132, path_y(132) - 5.5, 0.9, dz=-0.15); instance(ch, 141, path_y(141) + 5.0, 0.8, dz=-0.15); instance(ch, 4, path_y(4) + 5.5, 0.85, dz=-0.15)

# שער טורי בסוף
px, py, a = along(TORII_X); RED = mat('Torii', srgb('c0392b'), 0.6); t = []
for s in (-1, 1):
    p = cyl('ToriiPost', 0.24, 0.2, 4.4, (0, s * 1.9, 0), RED, 10); p.rotation_euler.x = -s * 0.04; t.append(p)
    t.append(cyl('ToriiBase', 0.34, 0.3, 0.35, (0, s * 1.9, 0), M['stoneDark'], 10))
t.append(box('ToriiTie', (0.22, 4.6, 0.26), (0, 0, 3.35), RED)); t.append(box('ToriiTop', (0.3, 5.4, 0.3), (0, 0, 4.3), RED))
t.append(box('ToriiCap', (0.42, 6.0, 0.2), (0, 0, 4.55), M['roof']))
group('Torii', t, (px, py, height(px, py) - 0.05), a)

# ---------- צמחייה: כמה דגמים, הרבה עותקים קלים ----------
nature.HEIGHT[0] = lambda x, y: 0.0
pines = [pine(0, 0, 1.0) for _ in range(5)]; leafy = [broadleaf(0, 0, 1.0) for _ in range(3)]
bushes = [bush(0, 0, 1.0) for _ in range(3)]; rocks = [rock(0, 0, 1.0) for _ in range(4)]
nature.HEIGHT[0] = height
def clear_of_things(x, y, r=0.0):
    if math.hypot(x - hx, y - hy) < 9.5 + r: return False
    if abs(x - cliff_x(y)) < 2.6: return False
    if abs(x - GATE_X) < 2.5: return False
    if abs(x - JUMP_X) < 15 and y < path_y(x) and path_y(x) - y < 21: return False        # שדה ראייה נקי למצלמת הצד בקפיצה
    return True
placed = []
for _ in range(4000):
    if len(placed) >= 135: break
    x = random.uniform(X0 + 1, X1 - 1); side = random.choice((-1, 1))
    y = path_y(x) + side * random.uniform(7.2, 21)
    if abs(y) > YW - 1.5 or not clear_of_things(x, y): continue
    if abs(y - path_y(x)) < 9 + 3.5 * bump(x, JUMP_X, 9): continue
    if any(math.hypot(x - a, y - b) < 3.4 for a, b in placed): continue
    placed.append((x, y))
    instance(random.choice(pines) if random.random() < 0.7 else random.choice(leafy), x, y, random.uniform(0.65, 1.05), dz=-0.15)
for _ in range(46):
    x = random.uniform(START, END); y = path_y(x) + random.choice((-1, 1)) * random.uniform(2.3, 5.0)
    if clear_of_things(x, y, -6) and abs(x - JUMP_X) > 3: instance(random.choice(bushes), x, y, random.uniform(0.55, 1.1))
for _ in range(50):
    x = random.uniform(X0 + 1, X1 - 1); y = path_y(x) + random.choice((-1, 1)) * random.uniform(2.4, 10)
    if clear_of_things(x, y, -6) and abs(x - JUMP_X) > 3:
        o = instance(random.choice(rocks), x, y, random.uniform(0.5, 1.5)); o.location.z = height(x, y) + 0.05
for o in pines + leafy + bushes + rocks + [ch]: remove_tree(o)

# ---------- נתונים למשחק ----------
path = []; x = START
while x <= END + 1e-6:
    path.append([round(x, 3), round(path_y(x), 3), round(height(x, path_y(x)) + 0.1, 3)]); x += 0.5
HM = 0.5; hxs = [X0 + i * HM for i in range(int((X1 - X0) / HM) + 1)]
data = {
    'note': 'Blender coords: x along, y sideways, z up.  three.js: (x, z, -y)',
    'path': path,
    'obstacles': [
        {'type': 'JUMP', 'x': JUMP_X}, {'type': 'PUSH', 'x': GATE_X},
        {'type': 'CLIMB', 'x': round(cx - 0.62, 3), 'top_x': round(cx + 0.9, 3), 'z0': round(zb, 3), 'z1': round(zt + 0.02, 3)}],
    'house': [hx, hy], 'torii': TORII_X,
    'hm': {'x0': X0, 'y0': -YW, 'd': HM, 'nx': len(hxs), 'ny': len(ys), 'h': [round(height(x, y), 2) for y in ys for x in hxs]},
}
json.dump(data, open(os.path.join(OUT, 'run.json'), 'w'), separators=(',', ':'))

# ---------- אור, מצלמה, שמירה, ייצוא ----------
world = bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*srgb('bfe3f5'), 1); bg.inputs['Strength'].default_value = 0.9
sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')); scene.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = math.radians(4); sun.rotation_euler = (math.radians(52), 0, math.radians(-65))   # השמש מאחורי הרץ – מאירה את פני הצוק
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 28
def shot(name, loc, target):
    cam.location = loc; cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'run.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'run.glb'), export_format='GLB', export_apply=True, export_lights=False, export_cameras=False)
print('EXPORTED')
if not os.environ.get('NORENDER'):
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = int(os.environ.get('SAMPLES', 32)); scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1600, 900; scene.view_settings.view_transform = 'Standard'
    shot('run.png', (60, -58, 62), (72, 2, 0))                                  # מבט־על על כל המסלול
    shot('run_jump.png', (JUMP_X + 2, path_y(JUMP_X) - 11, height(JUMP_X + 2, path_y(JUMP_X) - 11) + 2.2), (JUMP_X, path_y(JUMP_X), height(JUMP_X, path_y(JUMP_X)) + 1))
    shot('run_gate.png', (GATE_X - 12, path_y(GATE_X - 12) - 1, height(GATE_X - 12, path_y(GATE_X - 12)) + 4), (GATE_X, path_y(GATE_X), gz + 1.5))
    shot('run_cliff.png', (CLIFF_X - 11, cy - 3, zb + 2.0), (cx, cy, zb + 3.2))
print('DONE', OUT)
