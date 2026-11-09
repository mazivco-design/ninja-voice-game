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

# ---------- חומרים ----------
def mat(name, rgb, rough=0.85, vcol=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    if vcol:
        a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
        m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*rgb, 1)
    return m

def srgb(h):  # צבע מ־hex לליניארי
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

M = {
    'ground': mat('Ground', None, vcol=True),
    'wood': mat('Wood', srgb('7a4a2a')), 'woodDark': mat('WoodDark', srgb('4a2c1a')),
    'wall': mat('Wall', srgb('efe6d2')), 'roof': mat('Roof', srgb('3b4655'), 0.6),
    'stone': mat('Stone', srgb('9a9a92')), 'stoneDark': mat('StoneDark', srgb('77776f')),
    'pine': mat('Pine', srgb('2f5d35')), 'pineLight': mat('PineLight', srgb('3f7a42')),
    'bark': mat('Bark', srgb('5a3a26')), 'blossom': mat('Blossom', srgb('f2b6c8')),
    'leaf': mat('Leaf', srgb('5f9a3e')), 'water': mat('Water', srgb('5aa7c9'), 0.1),
}

def obj_from_bm(name, bm, material, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    if material: me.materials.append(material)
    for p in me.polygons: p.use_smooth = smooth
    return o

# ---------- קרקע ----------
W, D, N = 60.0, 44.0, 150            # רוחב (x), עומק (y), צפיפות
def path_y(x):                        # מרכז השביל לאורך x – מתעקל
    return 3.0 * math.sin(x * 0.11) + 1.2 * math.sin(x * 0.27 + 1)
HX, HOFF = 6.0, 7.5                    # מיקום הבית: מרפסת שטוחה על המדרון
def smooth(a, b, v): t = max(0, min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t)
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
mix = lambda a, b, k: tuple(a[i] * (1 - k) + b[i] * k for i in range(3))
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

# ---------- עזרים ----------
def box(name, size, loc, material, rot=0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    o = obj_from_bm(name, bm, material); o.location = loc; o.rotation_euler.z = rot; return o
def cyl(name, r1, r2, h, loc, material, seg=8):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    o = obj_from_bm(name, bm, material); o.location = loc; return o
def blob(name, r, loc, material, squash=(1, 1, 1), sub=1, jitter=0.15):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        v.co += v.co.normalized() * random.uniform(-jitter, jitter) * r
        v.co.x *= squash[0]; v.co.y *= squash[1]; v.co.z *= squash[2]
    o = obj_from_bm(name, bm, material); o.location = loc; return o
def group(name, objs, loc=(0, 0, 0), rot=0, scale=1):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e)
    for o in objs: o.parent = e
    e.location = loc; e.rotation_euler.z = rot; e.scale = (scale,) * 3; return e
def ground_z(x, y): return height(x, y)

# ---------- בית יפני ----------
def roof_mesh(name, w, d, h, over, lift):
    """גג ארבע־שיפועים עם קצוות מורמים בפינות (סגנון יפני)."""
    bm = bmesh.new()
    ex, ey = w / 2 + over, d / 2 + over
    e = [bm.verts.new(p) for p in ((-ex, -ey, lift), (ex, -ey, lift), (ex, ey, lift), (-ex, ey, lift))]
    mids = [bm.verts.new(p) for p in ((0, -ey, 0), (ex, 0, 0), (0, ey, 0), (-ex, 0, 0))]   # אמצע הצלעות נמוך יותר → קשת
    r = max(0.01, (w - d) / 2)
    ridge = [bm.verts.new((-r, 0, h)), bm.verts.new((r, 0, h))]
    bm.faces.new((e[0], mids[0], ridge[0])); bm.faces.new((mids[0], e[1], ridge[1])); bm.faces.new((mids[0], ridge[1], ridge[0]))
    bm.faces.new((e[2], mids[2], ridge[1])); bm.faces.new((mids[2], e[3], ridge[0])); bm.faces.new((mids[2], ridge[0], ridge[1]))
    bm.faces.new((e[1], mids[1], ridge[1])); bm.faces.new((mids[1], e[2], ridge[1]))
    bm.faces.new((e[3], mids[3], ridge[0])); bm.faces.new((mids[3], e[0], ridge[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, M['roof'])
    s = o.modifiers.new('thick', 'SOLIDIFY'); s.thickness = 0.22; s.offset = 0
    return o

def house(x, y, rot):
    z = ground_z(x, y); parts = []
    w, d, hw = 5.2, 3.8, 2.3
    parts.append(box('Base', (w + 0.8, d + 0.8, 0.5), (0, 0, 0.0), M['stone']))
    parts.append(box('Floor', (w + 0.6, d + 0.6, 0.18), (0, 0, 0.42), M['woodDark']))   # מרפסת עץ
    parts.append(box('Walls', (w, d, hw), (0, 0, 0.5 + hw / 2), M['wall']))
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(box('Post', (0.22, 0.22, hw + 0.2), (sx * w / 2, sy * d / 2, 0.5 + hw / 2), M['wood']))
    for k in range(-2, 3):                                        # מסגרות שוג'י בקיר הקדמי
        parts.append(box('Frame', (0.07, 0.06, hw), (k * w / 5, -d / 2 - 0.02, 0.5 + hw / 2), M['wood']))
    parts.append(box('Beam', (w + 0.1, 0.1, 0.12), (0, -d / 2 - 0.03, 0.5 + hw * 0.62), M['wood']))
    parts.append(box('Beam2', (w + 0.3, d + 0.3, 0.22), (0, 0, 0.5 + hw + 0.08), M['woodDark']))
    parts.append(box('Door', (1.1, 0.06, 1.8), (0, -d / 2 - 0.05, 0.5 + 0.9), M['woodDark']))
    r = roof_mesh('Roof', w, d, 1.9, 1.1, 0.55); r.location = (0, 0, 0.5 + hw + 0.25); parts.append(r)
    parts.append(box('Ridge', (w - d + 1.0, 0.3, 0.3), (0, 0, 0.5 + hw + 0.25 + 1.95), M['woodDark']))
    for s in (-1, 1): parts.append(box('Step', (1.4, 0.5, 0.25 - s * 0.05), (0, -d / 2 - 0.65 - (0.35 if s > 0 else 0), 0.12 if s < 0 else 0.0), M['stone']))
    return group('House', parts, (x, y, z), rot)

# ---------- עצים ----------
def pine(x, y, s=1.0):
    z = ground_z(x, y) - 0.1; parts = []; lean = random.uniform(-0.25, 0.25)
    h = 3.6 * s
    t = cyl('Trunk', 0.28 * s, 0.14 * s, h, (0, 0, 0), M['bark'], 6); t.rotation_euler.y = lean * 0.4; parts.append(t)
    for k in range(4):                                             # "כריות" עלווה שטוחות – אורן יפני
        hk = h * (0.45 + k * 0.17); off = (math.sin(k * 2.1) * 0.9 * s, math.cos(k * 1.7) * 0.7 * s)
        rr = (1.6 - k * 0.3) * s
        parts.append(blob('Pad', rr, (off[0] + lean * hk * 0.4, off[1], hk), M['pine' if k % 2 else 'pineLight'], (1.15, 1.0, 0.42), 1, 0.12))
    return group('Pine', parts, (x, y, z), random.uniform(0, 6.28))

def cherry(x, y, s=1.0):
    z = ground_z(x, y) - 0.1; parts = [cyl('Trunk', 0.3 * s, 0.18 * s, 2.4 * s, (0, 0, 0), M['bark'], 6)]
    for k in range(5):
        a = k * 1.26; parts.append(blob('Bloom', 1.25 * s, (math.cos(a) * 0.9 * s, math.sin(a) * 0.9 * s, 2.8 * s + (k % 2) * 0.5 * s), M['blossom'], (1, 1, 0.75), 1, 0.15))
    return group('Cherry', parts, (x, y, z), random.uniform(0, 6.28))

def bush(x, y, s=1.0):
    return group('Bush', [blob('Bush', 0.9 * s, (0, 0, 0.4 * s), M['leaf'], (1.2, 1, 0.75), 1, 0.2)], (x, y, ground_z(x, y)))

def rock(x, y, s=1.0):
    o = blob('Rock', 0.8 * s, (x, y, ground_z(x, y) + 0.1 * s), M['stone' if random.random() < 0.5 else 'stoneDark'], (1.3, 1, 0.7), 1, 0.25)
    o.rotation_euler.z = random.uniform(0, 6.28); return o

def lantern(x, y):
    z = ground_z(x, y); p = []
    p.append(cyl('L1', 0.35, 0.35, 0.2, (0, 0, 0), M['stone'], 6))
    p.append(cyl('L2', 0.13, 0.13, 0.9, (0, 0, 0.2), M['stone'], 6))
    p.append(box('L3', (0.55, 0.55, 0.45), (0, 0, 1.32), M['stoneDark']))
    p.append(cyl('L4', 0.6, 0.05, 0.45, (0, 0, 1.55), M['stone'], 6))
    return group('Lantern', p, (x, y, z), 0.3)

# ---------- הצבה ----------
hx = HX; hy = path_y(hx) + HOFF
house(hx, hy, 0)                                    # החזית (הדלת) פונה לשביל
lantern(hx - 3.0, hy - 3.6)
cherry(hx + 5.2, hy - 0.5, 1.0)
for _ in range(70):                                                # אורנים על המדרונות
    x = random.uniform(-W / 2 + 2, W / 2 - 2); side = random.choice((-1, 1))
    y = path_y(x) + side * random.uniform(6.5, 18)
    if abs(y) > D / 2 - 2 or (abs(x - hx) < 8 and abs(y - hy) < 6): continue
    pine(x, y, random.uniform(0.7, 1.15))
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
print('DONE', OUT)
