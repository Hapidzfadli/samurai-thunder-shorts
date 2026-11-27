"""Sekolah dua lantai ber-menara jam (gaya low-poly lembut, tanpa garis tepi) di Blender EEVEE.
Pakai: blender -b -noaudio --python sekolah2.py -- <shot> <keluaran.png>   shot: drone | depan | dekat"""
import bpy, bmesh, math, random, sys, time
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
SHOT, OUT = ARGS[0], ARGS[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
rng = np.random.default_rng(3)


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


# ------------------------------------------------------------------ tekstur
def to_img(name, arr):
    h, w, _ = arr.shape
    im = bpy.data.images.new(name, w, h, alpha=True)
    rgba = np.concatenate([arr, np.ones((h, w, 1))], axis=2)[::-1]
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    im.pack()
    return im


def noise(h, w, k, seed):
    r = np.random.default_rng(seed)
    return np.kron(r.random((h // k + 2, w // k + 2)), np.ones((k, k)))[:h, :w]


def tex_roof():
    H = W = 512
    img = np.zeros((H, W, 3))
    cols = [lin(c) for c in ("#c4261f", "#bc221c", "#cb2e24", "#b81e1a")]
    th = tw = 32
    for r in range(H // th):
        for c in range(W // tw):
            col = np.array(cols[int(rng.integers(0, 4))]) * (0.975 + 0.05 * rng.random())
            x0 = (c * tw + (tw // 2 if r % 2 else 0)) % W
            xs = (np.arange(tw) + x0) % W
            u = np.arange(tw) / tw
            shade = 0.82 + 0.26 * np.sin(u * math.pi)
            img[r * th:(r + 1) * th, xs] = col[None, None, :] * shade[None, :, None]
            img[r * th + th - 4:(r + 1) * th, xs] *= 0.7
    img *= (0.985 + 0.03 * noise(H, W, 6, 1))[..., None]
    return to_img("roof", np.clip(img, 0, 1))


def tex_plaster(base, var=0.08, seed=2):
    H = W = 512
    c = np.array(lin(base))
    n = 0.5 * noise(H, W, 3, seed) + 0.5 * noise(H, W, 24, seed + 1)
    return to_img("pl" + base + str(seed), np.clip(c[None, None, :] * (1 - var / 2 + var * n)[..., None], 0, 1))


def tex_paving(base="#d7c7a8"):
    H = W = 512
    c = np.array(lin(base))
    img = np.zeros((H, W, 3))
    cell = 128
    for r in range(H // cell):
        for q in range(W // cell):
            img[r * cell:(r + 1) * cell, q * cell:(q + 1) * cell] = c * (0.93 + 0.12 * rng.random())
    seam = np.zeros((H, W), bool)
    seam[::cell] = True
    seam[:, ::cell] = True
    img[seam] *= 0.78
    return to_img("paving", np.clip(img, 0, 1))


def tex_wood(base):
    H = W = 512
    c = np.array(lin(base))
    cols = np.repeat(noise(1, W, 30, 21), H, axis=0)
    img = c[None, None, :] * (0.85 + 0.25 * cols)[..., None]
    for x in range(0, W, 128):
        img[:, x:x + 4] *= 0.55
    return to_img("wood" + base, np.clip(img, 0, 1))


# ------------------------------------------------------------------ material (Principled, bayangan lembut)
def mat(name, base="#cccccc", tex=None, tile=1.0, rough=0.85, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    if tex is not None:
        tc = N.new("ShaderNodeTexCoord")
        mp = N.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (tile, tile, tile)
        ti = N.new("ShaderNodeTexImage")
        ti.image = tex
        ti.projection = "BOX"
        ti.projection_blend = 0.0
        L.new(tc.outputs["Object"], mp.inputs[0])
        L.new(mp.outputs[0], ti.inputs[0])
        L.new(ti.outputs[0], b.inputs["Base Color"])
    else:
        b.inputs["Base Color"].default_value = (*lin(base), 1)
    if emit:
        b.inputs["Emission Color"].default_value = (*lin(base), 1)
        b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*lin(base), 1)
    return m


def box(loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return o


def cyl(loc, r, h, m, rot=(0, 0, 0), v=20, r2=None, smooth=True):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object
    if smooth:
        bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


def sph(loc, r, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=20, ring_count=12)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


T_ROOF, T_PAV = tex_roof(), tex_paving()
M = {
    "wall": mat("dinding", "#d9a64c", tex_plaster("#d9a64c", 0.12, 3), tile=0.3),
    "wall2": mat("dindingB", "#cf9a42", tex_plaster("#cf9a42", 0.12, 5), tile=0.3),
    "cream": mat("krem", "#ecdfc6", tex_plaster("#ecdfc6", 0.06, 7), tile=0.4),
    "stone": mat("batu", "#cdbd9f", tex_plaster("#cdbd9f", 0.1, 9), tile=0.4),
    "roof": mat("genteng", "#c4261f", T_ROOF, tile=0.35, rough=0.7),
    "shutter": mat("daun", "#b04a2c", tex_plaster("#b04a2c", 0.1, 11), tile=0.5),
    "glass": mat("kaca", "#2e3a48", None, rough=0.15),
    "glassL": mat("kacaT", "#f0e6c8", None, rough=0.6, emit=0.35),
    "door": mat("pintu", "#6a3a22", tex_wood("#6a3a22"), tile=0.7),
    "wood": mat("kayu", "#a8703a", tex_wood("#a8703a"), tile=0.7),
    "paving": mat("paving", "#d7c7a8", T_PAV, tile=0.45, rough=0.95),
    "lawn": mat("rumput", "#7fc24a", tex_plaster("#7fc24a", 0.16, 13), tile=0.5, rough=1.0),
    "curb": mat("kerb", "#e6dac0", None, rough=0.9),
    "black": mat("hitam", "#1d1a1c", None, rough=0.5),
    "gold": mat("emas", "#d8aa3a", None, rough=0.35),
    "clock": mat("jam", "#e8dcb8", None, rough=0.6),
    "trunk": mat("batang", "#7a4a2a", None, rough=0.95),
    "leafA": mat("daunA", "#6fae3e", None, rough=1.0),
    "leafB": mat("daunB", "#5c9a34", None, rough=1.0),
    "leafC": mat("daunC", "#86c04e", None, rough=1.0),
    "water": mat("air", "#6ec6d8", None, rough=0.1, emit=0.25),
    "lamp": mat("lampu", "#fff1b8", None, rough=0.5, emit=3.0),
    "metal": mat("logam", "#3a3640", None, rough=0.4),
}

# ------------------------------------------------------------------ ukuran
W, D = 22.0, 9.0
F1 = 0.4                 # lantai satu
FH = 3.4                 # tinggi tiap lantai
F2 = F1 + FH
EAVE = F1 + 2 * FH       # 7.2
YF = -D / 2

# ------------------------------------------------------------------ tanah, jalan, taman berkerb
bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, -0.05))
g0 = bpy.context.object
hm = mat("rumput_luas", "#7fb64a", tex_plaster("#7fb64a", 0.1, 31), tile=0.2, rough=1.0)
_N, _L = hm.node_tree.nodes, hm.node_tree.links
_bsdf = _N["Principled BSDF"]
_tex = [n for n in _N if n.type == "TEX_IMAGE"][0]
_tc = _N.new("ShaderNodeTexCoord")
_vm = _N.new("ShaderNodeVectorMath")
_vm.operation = "LENGTH"
_mr = _N.new("ShaderNodeMapRange")
_mr.inputs["From Min"].default_value = 70
_mr.inputs["From Max"].default_value = 210
_mx = _N.new("ShaderNodeMix")
_mx.data_type = "RGBA"
_mx.inputs[7].default_value = (*lin("#e29a62"), 1)
_L.new(_tc.outputs["Object"], _vm.inputs[0])
_L.new(_vm.outputs["Value"], _mr.inputs[0])
_L.new(_mr.outputs[0], _mx.inputs[0])
_L.new(_tex.outputs[0], _mx.inputs[6])
_L.new(_mx.outputs[2], _bsdf.inputs["Base Color"])
g0.data.materials.append(hm)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -12, 0.0))
g = bpy.context.object
g.scale = (46, 42, 1)
bpy.ops.object.transform_apply(scale=True)
g.data.materials.append(mat("paving_ground", "#d7c7a8", T_PAV, tile=0.45, rough=0.95))


def lawn(cx, cy, w, d):
    box((cx, cy, 0.09), (w + 0.5, d + 0.5, 0.18), M["curb"])
    box((cx, cy, 0.14), (w, d, 0.12), M["lawn"])


lawn(-10.5, -19.5, 9.0, 13.0)
lawn(10.5, -19.5, 9.0, 13.0)
lawn(-14.0, -10.5, 7.0, 3.6)
lawn(14.0, -10.5, 7.0, 3.6)
lawn(-6.2, -10.5, 3.2, 3.6)
lawn(6.2, -10.5, 3.2, 3.6)
box((0, 0, 0.2), (W + 0.7, D + 0.7, 0.4), M["stone"])               # fondasi

# ------------------------------------------------------------------ badan gedung
box((0, 0, F1 + FH), (W, D, 2 * FH), M["wall"])
box((0, YF - 0.1, F2), (W + 0.3, 0.22, 0.3), M["cream"])           # list antar lantai
box((0, 0, EAVE - 0.1), (W + 0.7, D + 0.7, 0.3), M["cream"])        # lis atap
box((0, YF - 0.05, F1 + 0.35), (W + 0.12, 0.14, 0.7), M["stone"])    # kaki dinding

CENTER_FREE = 1.6


def window(x, zc, y, lit):
    gl = M["glassL"] if lit else M["glass"]
    box((x, y - 0.06, zc), (1.5, 0.16, 2.3), M["cream"])
    box((x, y - 0.13, zc), (1.22, 0.08, 2.0), gl)
    box((x, y - 0.19, zc), (0.06, 0.06, 2.0), M["cream"])
    for dz in (-0.33, 0.33):
        box((x, y - 0.19, zc + dz), (1.22, 0.06, 0.06), M["cream"])
    box((x, y - 0.15, zc - 1.2), (1.8, 0.34, 0.12), M["cream"])        # ambang
    box((x, y - 0.1, zc + 1.22), (1.8, 0.2, 0.16), M["cream"])         # ambalan atas
    for s in (-1, 1):
        box((x + s * 1.02, y - 0.09, zc), (0.42, 0.07, 2.25), M["shutter"])
        for k in range(6):
            box((x + s * 1.02, y - 0.14, zc - 0.95 + k * 0.38), (0.36, 0.03, 0.045), M["wall2"])


for i, x in enumerate((-9.0, -6.0, -3.0, 3.0, 6.0, 9.0)):
    window(x, F1 + 1.75, YF, lit=(i % 3 == 1))
    window(x, F2 + 1.75, YF, lit=((i + 2) % 3 == 1))
window(0.0, F2 + 1.75, YF, lit=False)
# jendela sisi
for sx in (-1, 1):
    for yy in (-2.2, 2.2):
        for zc, lit in ((F1 + 1.75, False), (F2 + 1.75, True)):
            box((sx * (W / 2 + 0.06), yy, zc), (0.16, 1.5, 2.3), M["cream"])
            box((sx * (W / 2 + 0.13), yy, zc), (0.08, 1.2, 2.0), M["glassL" if lit else "glass"])
            for s in (-1, 1):
                box((sx * (W / 2 + 0.1), yy + s * 1.1, zc), (0.07, 0.6, 2.25), M["shutter"])

# ------------------------------------------------------------------ teras bertiang + balkon
PY = YF - 1.7
box((0, YF - 1.5, 0.3), (7.2, 3.0, 0.6), M["stone"])               # lantai teras
for k in range(3):
    box((0, YF - 3.2 - k * 0.45, 0.3 - k * 0.1 - 0.05), (6.0 - k * 0.0, 0.5, 0.5 - k * 0.2 - 0.0), M["stone"])
box((0, YF - 1.5, F2 + 0.1), (7.4, 3.2, 0.42), M["cream"])          # lantai balkon
for x in (-2.7, -0.9, 0.9, 2.7):
    cyl((x, YF - 2.7, F1 + 1.65 + 0.0), 0.27, FH - 0.2, M["cream"], v=20)
    box((x, YF - 2.7, F1 + 0.12), (0.7, 0.7, 0.24), M["cream"])
    box((x, YF - 2.7, F2 - 0.18), (0.62, 0.62, 0.2), M["cream"])
# pagar balkon
box((0, YF - 3.05, F2 + 0.62), (7.4, 0.12, 0.1), M["cream"])
box((0, YF - 3.05, F2 + 0.42), (7.4, 0.14, 0.12), M["cream"])
for sx in (-1, 1):
    box((sx * 3.65, YF - 1.5, F2 + 0.62), (0.12, 3.2, 0.1), M["cream"])
    for k in range(7):
        box((sx * 3.65, YF - 0.4 - k * 0.45, F2 + 0.4), (0.06, 0.06, 0.5), M["cream"])
for k in range(17):
    box((-3.6 + k * 0.45, YF - 3.05, F2 + 0.4), (0.06, 0.06, 0.5), M["cream"])
# pintu utama ganda
box((0, YF - 0.06, F1 + 1.45), (2.6, 0.16, 2.9), M["cream"])
for s in (-1, 1):
    box((s * 0.55, YF - 0.13, F1 + 1.35), (1.0, 0.1, 2.6), M["door"])
    box((s * 0.55, YF - 0.2, F1 + 1.9), (0.7, 0.04, 0.9), M["wood"])
    box((s * 0.55, YF - 0.2, F1 + 0.75), (0.7, 0.04, 0.9), M["wood"])
    sph((s * 0.12, YF - 0.22, F1 + 1.3), 0.05, M["gold"])
# lampu dinding teras
for s in (-1, 1):
    box((s * 3.3, YF - 0.2, F1 + 2.6), (0.18, 0.18, 0.36), M["lamp"])

# ------------------------------------------------------------------ atap limas + menara jam
XE, YE = W / 2 + 0.9, D / 2 + 0.9
Z0 = EAVE + 0.1
XR = W / 2 - 4.5
RISE = YE * math.tan(math.radians(25))
bm = bmesh.new()
v = [bm.verts.new(c) for c in [(-XE, -YE, Z0), (XE, -YE, Z0), (XE, YE, Z0), (-XE, YE, Z0), (-XR, 0, Z0 + RISE), (XR, 0, Z0 + RISE)]]
for f in ((0, 1, 5, 4), (2, 3, 4, 5), (3, 0, 4), (1, 2, 5)):
    bm.faces.new([v[i] for i in f])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("atap")
bm.to_mesh(me)
bm.free()
roof = bpy.data.objects.new("atap", me)
bpy.context.collection.objects.link(roof)
bpy.context.view_layer.objects.active = roof
so = roof.modifiers.new("t", "SOLIDIFY")
so.thickness = 0.22
so.offset = -1
roof.data.materials.append(M["roof"])
# lisplang di tepi
for yy in (-YE, YE):
    box((0, yy, Z0 - 0.12), (2 * XE, 0.14, 0.34), M["cream"])
for xx in (-XE, XE):
    box((xx, 0, Z0 - 0.12), (0.14, 2 * YE, 0.34), M["cream"])
# bubungan
box((0, 0, Z0 + RISE + 0.05), (2 * XR + 0.4, 0.5, 0.28), M["roof"])
# cerobong
for (cx, cy) in ((-7.2, 1.6), (7.2, 1.6), (-3.5, 1.2)):
    zr = Z0 + (YE - abs(cy)) * math.tan(math.radians(25))
    box((cx, cy, zr + 0.9), (1.1, 1.1, 1.8), M["cream"])
    box((cx, cy, zr + 1.9), (1.4, 1.4, 0.22), M["roof"])

# menara jam
TZ = Z0 + RISE - 0.5
box((0, 0, TZ + 1.9), (3.4, 3.4, 3.8), M["wall"])
box((0, 0, TZ + 3.85), (3.9, 3.9, 0.28), M["cream"])
pz = TZ + 3.99
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.78, radius2=0.0, depth=3.0, location=(0, 0, pz + 1.5), rotation=(0, 0, math.radians(45)))
pr = bpy.context.object
pr.data.materials.append(M["roof"])
sph((0, 0, pz + 3.05), 0.2, M["gold"])
cyl((0, 0, pz + 3.65), 0.05, 1.2, M["black"], v=8)
box((0, 0, pz + 3.85), (0.7, 0.07, 0.07), M["black"])
for (nx, ny, rz) in ((0, -1, 0), (1, 0, 90), (-1, 0, -90), (0, 1, 180)):
    px, py = nx * 1.72, ny * 1.72
    cyl((px, py, TZ + 2.2), 1.0, 0.14, M["black"], rot=(math.radians(90), 0, math.radians(rz)), v=36)
    cyl((nx * 1.78, ny * 1.78, TZ + 2.2), 0.86, 0.12, M["clock"], rot=(math.radians(90), 0, math.radians(rz)), v=36)
    for k in range(12):
        a = k * math.pi / 6
        tx, tz_ = math.sin(a) * 0.74, math.cos(a) * 0.74
        big = 0.12 if k % 3 == 0 else 0.07
        # tanda jam digambar di bidang lokal lalu diputar
        lp = Vector((tx, 0, tz_))
        c, s = math.cos(math.radians(rz)), math.sin(math.radians(rz))
        wx, wy = lp.x * c, lp.x * s
        box((nx * 1.85 + wx, ny * 1.85 + wy, TZ + 2.2 + tz_), (0.05 if rz in (0, 180) else 0.04, 0.04 if rz in (0, 180) else 0.05, big), M["black"], rot=(0, 0, 0))
    # jarum jam (10:10)
    for ang, ln in ((-60, 0.55), (60, 0.75)):
        a = math.radians(ang)
        c, s = math.cos(math.radians(rz)), math.sin(math.radians(rz))
        hx, hz = math.sin(a) * ln / 2, math.cos(a) * ln / 2
        box((nx * 1.88 + hx * c, ny * 1.88 + hx * s, TZ + 2.2 + hz), (0.05 if rz in (0, 180) else 0.04, 0.04 if rz in (0, 180) else 0.05, ln), M["black"], rot=(0, math.radians(-ang) if rz in (0, 180) else 0, 0))

# ------------------------------------------------------------------ taman: pohon low-poly, bangku, lampu, air mancur
rr = random.Random(9)


def tree(x, y, s=1.0, mk=0):
    cyl((x, y, 1.5 * s + 0.15), 0.3 * s, 3.0 * s, M["trunk"], r2=0.2 * s, v=8, smooth=False)
    for k, (dx, dy, dz, r) in enumerate(((0, 0, 3.6, 2.0), (-0.9, 0.5, 3.1, 1.3), (0.9, -0.4, 3.3, 1.4))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r * s, location=(x + dx * s, y + dy * s, 0.15 + dz * s))
        o = bpy.context.object
        for vt in o.data.vertices:
            vt.co *= 0.85 + 0.3 * rr.random()
        o.scale = (1, 1, 1.12)
        o.data.materials.append(M[("leafA", "leafB", "leafC")[(mk + k) % 3]])


for i, (x, y, s) in enumerate([(-4.6, -12.5, 1.0), (4.6, -12.5, 1.0), (-4.6, -23.0, 1.05), (4.6, -23.0, 1.0), (-10.5, -19.5, 1.1), (10.5, -19.5, 1.1),
                               (-15.5, -10.5, 1.0), (15.5, -10.5, 1.0), (-14.0, -25, 0.95), (14.0, -25, 0.95)]):
    tree(x, y, s, i)


def bench(x, y, rot=0):
    c, s = math.cos(rot), math.sin(rot)
    box((x, y, 0.5), (1.7, 0.5, 0.08), M["wood"], rot=(0, 0, rot))
    box((x - 0.2 * s, y + 0.2 * c, 0.85), (1.7, 0.08, 0.45), M["wood"], rot=(0, 0, rot))
    for k in (-1, 1):
        box((x + k * 0.7 * c, y + k * 0.7 * s, 0.25), (0.08, 0.5, 0.5), M["metal"], rot=(0, 0, rot))


bench(-4.0, -15.5)
bench(4.0, -15.5)
bench(-4.0, -20.0)
bench(4.0, -20.0)
for (x, y) in ((-3.4, -9.0), (3.4, -9.0), (-3.4, -18.0), (3.4, -18.0), (-3.4, -26.0), (3.4, -26.0)):
    cyl((x, y, 1.9), 0.07, 3.6, M["black"], v=10)
    box((x, y, 3.85), (0.5, 0.5, 0.5), M["lamp"])
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.42, radius2=0.0, depth=0.34, location=(x, y, 4.2), rotation=(0, 0, math.radians(45)))
    bpy.context.object.data.materials.append(M["black"])
    cyl((x, y, 0.3), 0.14, 0.3, M["black"], v=10)
# air mancur
FX, FY = 0.0, -15.5
cyl((FX, FY, 0.4), 2.4, 0.5, M["stone"], v=32)
cyl((FX, FY, 0.52), 2.0, 0.34, M["water"], v=32)
cyl((FX, FY, 1.2), 0.45, 1.2, M["stone"], v=16)
cyl((FX, FY, 1.95), 1.1, 0.35, M["stone"], v=24, r2=0.6)
cyl((FX, FY, 2.2), 0.8, 0.12, M["water"], v=24)
sph((FX, FY, 2.65), 0.3, M["stone"])

# perbukitan berkabut menutupi cakrawala
hz = mat("bukit", "#cf8e58", None, rough=1.0)
for k in range(30):
    a = k * (2 * math.pi / 30)
    rd = 190 + (k % 3) * 30
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=34 + (k % 4) * 9, location=(math.cos(a) * rd, math.sin(a) * rd - 12, -6))
    hl = bpy.context.object
    hl.scale = (1.5, 1.2, 0.4)
    hl.data.materials.append(hz if k % 2 else mat("bukit2", "#c28050", None, rough=1.0))
# ------------------------------------------------------------------ langit senja + cahaya
w = bpy.data.worlds.new("senja")
sc.world = w
w.use_nodes = True
Nw, Lw = w.node_tree.nodes, w.node_tree.links
Nw.clear()
wo = Nw.new("ShaderNodeOutputWorld")
bg = Nw.new("ShaderNodeBackground")
tc = Nw.new("ShaderNodeTexCoord")
sp = Nw.new("ShaderNodeSeparateXYZ")
rp = Nw.new("ShaderNodeValToRGB")
els = rp.color_ramp.elements
els[0].position = 0.50
els[0].color = (*lin("#fbbd70"), 1)
els[1].position = 0.64
els[1].color = (*lin("#7a4658"), 1)
els.new(0.55).color = (*lin("#ee7f40"), 1)
Lw.new(tc.outputs["Generated"], sp.inputs[0])
Lw.new(sp.outputs["Z"], rp.inputs[0])
Lw.new(rp.outputs[0], bg.inputs[0])
bg.inputs[1].default_value = 1.0
Lw.new(bg.outputs[0], wo.inputs[0])

d = Vector((0.4, 0.55, -0.42)).normalized()
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
sun.data.energy = 3.4
sun.data.color = (1.0, 0.82, 0.6)
sun.data.angle = math.radians(3)
bpy.ops.object.light_add(type="SUN")
fill = bpy.context.object
fill.rotation_euler = Vector((-0.4, -0.6, -0.7)).to_track_quat("-Z", "Y").to_euler()
fill.data.energy = 0.9
fill.data.color = (0.8, 0.82, 1.0)
fill.data.use_shadow = False

# ------------------------------------------------------------------ kamera
CAMS = {
    "drone": ((-17.0, -34.0, 17.5), (1.0, -7.0, 6.5), 34, None),
    "depan": ((0.0, -36.0, 6.0), (0.0, -4.0, 6.0), 36, None),
    "dekat": ((1.2, -19.5, 6.8), (0.0, -6.0, 4.6), 36, 14.5),
}
loc, tgt, lens, focus = CAMS[SHOT]
bpy.ops.object.camera_add(location=loc)
cam = bpy.context.object
cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = lens
cam.data.clip_end = 500
sc.camera = cam
if focus:
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = focus
    cam.data.dof.aperture_fstop = 2.8

sc.render.engine = "BLENDER_EEVEE"
ee = sc.eevee
ee.use_gtao = True
ee.gtao_distance = 1.2
ee.gtao_factor = 1.0
ee.use_soft_shadows = True
ee.taa_render_samples = 48
ee.shadow_cascade_size = "4096"
ee.shadow_cube_size = "2048"
ee.use_bloom = True
ee.bloom_threshold = 1.0
ee.bloom_intensity = 0.04
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.filepath = OUT
sc.render.image_settings.file_format = "PNG"
bpy.ops.wm.save_as_mainfile(filepath=OUT.replace(".png", ".blend"))
t0 = time.time()
bpy.ops.render.render(write_still=True)
print(f"WAKTU {SHOT}: {time.time() - t0:.1f} dtk")
