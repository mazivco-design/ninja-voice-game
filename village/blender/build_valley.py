"""
village/blender/build_valley.py – בונה בבלנדר קטע עמק לדוגמה ומייצא אותו למשחק.

  קרקע רציפה עם מדרונות טבעיים, שביל עפר מתעקל, בית יפני קטן,
  אורנים, עץ דובדבן, סלעים ופנס אבן.

הרצה (בלנדר כמודול פייתון):   python3 build_valley.py  [תיקיית פלט]
או מתוך בלנדר:                 blender --background --python build_valley.py -- [תיקיית פלט]

פלט: valley.blend (לפתיחה ועריכה בבלנדר), valley.glb (למשחק), valley.png (תמונה).
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector, noise

OUT = (sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else (sys.argv[1] if len(sys.argv) > 1 else '.'))
os.makedirs(OUT, exist_ok=True)
random.seed(7)

# ---------- ניקוי ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
from nature import *
import nature

M['ground'] = M.get('ground') or mat('Ground', None, vcol=True)

# ---------- קרקע ----------
W, D, N = 60.0, 44.0, 150            # רוחב (x), עומק (y), צפיפות
def path_y(x):                        # מרכז השביל לאורך x – מתעקל
    return 3.0 * math.sin(x * 0.11) + 1.2 * math.sin(x * 0.27 + 1)
HX, HOFF = 6.0, 7.5                    # מיקום הבית: מרפסת שטוחה על המדרון
def raw_height(x, y):
    d = abs(y - path_y(x))
    valley = 4.2 + 1.0 * math.sin(x * 0.07)            # חצי רוחב קרקעית העמק
    t = max(0.0, d - valley)
    slope = (t ** 1.45) * 0.30                          # מדרון שהולך ומתלול
    if y < path_y(x): slope *= 1.3                      # צד אחד תלול יותר
    n = noise.noise(Vector((x * 0.09, y * 0.09, 0.3))) * 1.6 * min(1, t / 4)
    n += noise.noise(Vector((x * 0.35, y * 0.35, 1.7))) * 0.2
    return min(slope + n, 16)
def height(x, y):
    h = raw_height(x, y)
    hy = path_y(HX) + HOFF; dist = math.hypot(x - HX, y - hy)
    k = smooth(7.5, 4.0, dist)                          # מרפסת שטוחה לבית
    h = h * (1 - k) + raw_height(HX, hy) * 0.55 * k
    d = abs(y - path_y(x))
    return h - 0.1 * smooth(1.3, 0.8, d)                # השביל שקוע מעט

bm = bmesh.new()
grid = [[bm.verts.new((-W / 2 + i * W / N, -D / 2 + j * D / N, 0)) for i in range(N + 1)] for j in range(N + 1)]
for row in grid:
    for v in row: v.co.z = height(v.co.x, v.co.y)
for j in range(N):
    for i in range(N):
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
col = bm.loops.layers.color.new('Col')
G1, G2, ROCK, DIRT = srgb('86b84e'), srgb('5c9640'), srgb('8d8a7e'), srgb('b88a57')
bm.normal_update(); bm.verts.index_update()
vcol = {}
for v in bm.verts:                                         # צבע לכל קודקוד – מעברים רכים
    c = v.co; d = abs(c.y - path_y(c.x)); nz = v.normal.z
    k = max(0, min(1, (c.z / 7) + noise.noise(c * 0.2) * 0.3))
    rgb = mix(G1, G2, k)
    rgb = mix(rgb, ROCK, smooth(0.62, 0.48, nz) if c.z > 1 else 0)          # תלול מאוד → סלע
    rgb = mix(rgb, ROCK, smooth(11, 14, c.z + noise.noise(c * 0.3) * 1.5))  # גבוה מאוד → סלע
    rgb = mix(rgb, DIRT, smooth(1.35, 0.85, d + noise.noise(c * 0.8) * 0.15))  # שביל
    vcol[v.index] = rgb
for f in bm.faces:
    for l in f.loops: l[col] = (*vcol[l.vert.index], 1)
ground = obj_from_bm('Ground', bm, M['ground'])            # הצללה שטוחה – מראה "צבוע" נקי
nature.HEIGHT[0] = height

# ---------- הצבה ----------
hx = HX; hy = path_y(hx) + HOFF
house(hx, hy, 0)                                    # החזית (הדלת) פונה לשביל
lantern(hx - 3.0, hy - 3.6)
cherry(hx + 4.6, hy - 3.6, 0.8); cherry(hx - 5.8, hy + 1.5, 0.7)
placed = []
for _ in range(400):                                               # אורנים ועצי עלים על המדרונות
    if len(placed) >= 46: break
    x = random.uniform(-W / 2 + 2, W / 2 - 2); side = random.choice((-1, 1))
    y = path_y(x) + side * random.uniform(7.5, 18)
    if abs(y) > D / 2 - 2 or math.hypot(x - hx, y - hy) < 9: continue
    if any(math.hypot(x - a, y - b) < 3.6 for a, b in placed): continue   # לא צפוף מדי
    placed.append((x, y))
    (pine if random.random() < 0.7 else broadleaf)(x, y, random.uniform(0.65, 1.0))
for _ in range(14): x = random.uniform(-W / 2 + 2, W / 2 - 2); bush(x, path_y(x) + random.choice((-1, 1)) * random.uniform(2.2, 4.5), random.uniform(0.6, 1.1))
for _ in range(16): x = random.uniform(-W / 2 + 2, W / 2 - 2); rock(x, path_y(x) + random.choice((-1, 1)) * random.uniform(2.2, 9), random.uniform(0.5, 1.4))

# ---------- אור, שמיים, מצלמה ----------
world = bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*srgb('bfe3f5'), 1); bg.inputs['Strength'].default_value = 0.9
sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')); scene.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = math.radians(4); sun.rotation_euler = (math.radians(50), 0, math.radians(35))
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 32
cam.location = (-26, path_y(-26) - 3.5, 9.5); target = Vector((7, path_y(7) + 3.5, 1.5))   # בתוך העמק, מבט לאורך השביל
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()

# ---------- שמירה וייצוא ----------
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'valley.blend'))
for o in scene.objects:                                            # מחילים את מתקני העובי לפני הייצוא
    o.select_set(o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'valley.glb'), export_format='GLB', export_apply=True, export_lights=False, export_cameras=False)

scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = int(os.environ.get('SAMPLES', 48))
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
scene.view_settings.view_transform = 'Standard'
scene.render.filepath = os.path.join(OUT, 'valley.png')
bpy.ops.render.render(write_still=True)

# ---------- תמונת תקריב: שלושת סוגי העצים (רק לתמונה, לא נשמר בקבצים) ----------
nature.HEIGHT[0] = lambda x, y: 0.0; random.seed(3)
for o in list(scene.objects):
    if o.type in ('MESH', 'EMPTY'): o.hide_render = True
LX = 200
fl = box('Floor', (40, 20, 0.1), (LX, 0, -0.05), M['ground']); fl.hide_render = False
fl.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
for d in fl.data.color_attributes['Col'].data: d.color = (*srgb('86b84e'), 1)
for o in (pine(LX - 7, 0, 1.0), broadleaf(LX, 0, 1.0), cherry(LX + 7, 0, 1.0)):
    o.rotation_euler.z = 0.4
cam.location = (LX, -17, 4.2); cam.rotation_euler = (Vector((LX, 0, 2.6)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1600, 700
scene.render.filepath = os.path.join(OUT, 'trees.png')
bpy.ops.render.render(write_still=True)
print('DONE', OUT)
