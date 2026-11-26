"""Gedung SD Indonesia bergaya toon 'pro' di Blender (EEVEE): tekstur lukisan, garis tepi, cahaya sore.
Pakai: blender -b -noaudio --python sekolah.py -- <shot: hero|dekat> <keluaran.png> [glb:<file.glb>]"""
import bpy, bmesh, math, random, sys, time
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
SHOT, OUT = ARGS[0], ARGS[1]
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import latar as LT

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
rng = np.random.default_rng(5)
lin = LT.lin


# ------------------------------------------------------------------ tekstur numpy (bisa diulang)
def to_img(name, arr):
    h, w, _ = arr.shape
    im = bpy.data.images.new(name, w, h, alpha=True)
    rgba = np.concatenate([arr, np.ones((h, w, 1))], axis=2)[::-1]
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    im.pack()
    return im


def noise(h, w, k, seed):
    r = np.random.default_rng(seed)
    base = r.random((h // k + 2, w // k + 2))
    big = np.kron(base, np.ones((k, k)))[:h, :w]
    return big


def tex_roof():
    H = W = 512
    img = np.zeros((H, W, 3))
    cols = [lin(c) for c in ("#c4502c", "#b84826", "#d26036", "#a83f22")]
    th, tw = 64, 64
    for r in range(H // th):
        for c in range(W // tw):
            col = np.array(cols[int(rng.integers(0, 4))]) * (0.93 + 0.14 * rng.random())
            x0 = c * tw + (tw // 2 if r % 2 else 0)
            for xx in range(tw):
                x = (x0 + xx) % W
                # lengkung genteng: tengah lebih terang, tepi gelap
                u = xx / tw
                shade = 0.78 + 0.32 * math.sin(u * math.pi)
                img[r * th:(r + 1) * th, x] = col * shade
            # tepi bawah genteng lebih gelap (bayangan tumpuk) + ujung terang
            img[r * th + th - 7:(r + 1) * th, (x0 % W):(x0 % W) + tw if (x0 % W) + tw <= W else W] *= 0.62
            img[r * th:r * th + 5, (x0 % W):(x0 % W) + tw if (x0 % W) + tw <= W else W] *= 1.12
    img *= (0.94 + 0.12 * noise(H, W, 8, 1))[..., None]
    return to_img("roof", np.clip(img, 0, 1))


def tex_plaster(base="#f3e6c9", stain=0.10, seed=2):
    H = W = 512
    c = np.array(lin(base))
    n = 0.5 * noise(H, W, 4, seed) + 0.5 * noise(H, W, 32, seed + 1)
    img = c[None, None, :] * (0.93 + 0.12 * n)[..., None]
    streak = noise(H, 1, 64, seed + 2)
    img *= (1 - stain * np.repeat(streak, W, axis=1) * np.linspace(0, 1, H)[:, None])[..., None]
    return to_img("plaster" + base, np.clip(img, 0, 1))


def tex_paving(base="#bdb3a6"):
    H = W = 512
    c = np.array(lin(base))
    img = np.zeros((H, W, 3))
    cell = 128
    for r in range(H // cell):
        for q in range(W // cell):
            img[r * cell:(r + 1) * cell, q * cell:(q + 1) * cell] = c * (0.88 + 0.22 * rng.random())
    seam = np.zeros((H, W), bool)
    seam[::cell] = True
    seam[:, ::cell] = True
    seam |= np.roll(seam, 1, 0) | np.roll(seam, 1, 1)
    img[seam] *= 0.55
    img *= (0.94 + 0.1 * noise(H, W, 6, 8))[..., None]
    return to_img("paving", np.clip(img, 0, 1))


def tex_grass():
    H = W = 512
    a, b = np.array(lin("#9cc95c")), np.array(lin("#82b44c"))
    n = noise(H, W, 16, 11)
    img = a[None, None, :] * (1 - n)[..., None] + b[None, None, :] * n[..., None]
    sp = rng.random((H, W))
    img[sp > 0.985] = np.array(lin("#9bd35f"))
    img[sp < 0.012] = np.array(lin("#6a9e40"))
    return to_img("grass", np.clip(img, 0, 1))


def tex_wood(base="#8a5a34"):
    H = W = 512
    c = np.array(lin(base))
    cols = np.repeat(noise(1, W, 40, 21), H, axis=0)
    img = c[None, None, :] * (0.82 + 0.3 * cols)[..., None]
    for x in range(0, W, 128):
        img[:, x:x + 5] *= 0.45
    img *= (0.95 + 0.1 * noise(H, W, 3, 4))[..., None]
    return to_img("wood" + base, np.clip(img, 0, 1))


# ------------------------------------------------------------------ material toon dengan/ tanpa tekstur box-projection
def mat(name, base="#cccccc", tex=None, tile=1.0, shade=(0.66, 0.58, 0.78), rim=0.10, emit=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    N.clear()
    out = N.new("ShaderNodeOutputMaterial")
    dif = N.new("ShaderNodeBsdfDiffuse")
    s2r = N.new("ShaderNodeShaderToRGB")
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].position = 0
    e[0].color = (*shade, 1)
    e[1].position = 0.16
    e[1].color = (0.97, 0.95, 0.98, 1)
    e.new(0.58).color = (1.1, 1.07, 1.02, 1)
    mul = N.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1
    if tex is not None:
        tc = N.new("ShaderNodeTexCoord")
        mp = N.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (tile, tile, tile)
        ti = N.new("ShaderNodeTexImage")
        ti.image = tex
        ti.projection = "BOX"
        ti.projection_blend = 0.0
        ti.interpolation = "Linear"
        L.new(tc.outputs["Object"], mp.inputs[0])
        L.new(mp.outputs[0], ti.inputs[0])
        L.new(ti.outputs[0], mul.inputs[6])
    else:
        mul.inputs[6].default_value = (*lin(base), 1)
    L.new(dif.outputs[0], s2r.inputs[0])
    L.new(s2r.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], mul.inputs[7])
    lw = N.new("ShaderNodeLayerWeight")
    lw.inputs[0].default_value = 0.22
    rr = N.new("ShaderNodeValToRGB")
    rr.color_ramp.interpolation = "CONSTANT"
    rr.color_ramp.elements[0].color = (0, 0, 0, 1)
    rr.color_ramp.elements[1].position = 0.6
    rr.color_ramp.elements[1].color = (rim, rim * 0.8, rim * 0.55, 1)
    L.new(lw.outputs["Facing"], rr.inputs[0])
    add = N.new("ShaderNodeMix")
    add.data_type = "RGBA"
    add.blend_type = "ADD"
    add.inputs[0].default_value = 1
    L.new(mul.outputs[2], add.inputs[6])
    L.new(rr.outputs[0], add.inputs[7])
    em = N.new("ShaderNodeEmission")
    em.inputs[1].default_value = emit
    L.new(add.outputs[2], em.inputs[0])
    L.new(em.outputs[0], out.inputs[0])
    m.diffuse_color = (*lin(base), 1)
    return m


def glass_mat():
    m = bpy.data.materials.new("kaca")
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.clear()
    out = N.new("ShaderNodeOutputMaterial")
    em = N.new("ShaderNodeEmission")
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.2
    ramp.color_ramp.elements[0].color = (*lin("#9fd4ee"), 1)
    ramp.color_ramp.elements[1].position = 0.8
    ramp.color_ramp.elements[1].color = (*lin("#3a78a8"), 1)
    L.new(tc.outputs["Object"], sep.inputs[0])
    L.new(sep.outputs["Z"], ramp.inputs[0])
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1, 1, 0.45)
    mp.inputs["Location"].default_value = (0, 0, 0.65)
    L.new(tc.outputs["Object"], mp.inputs[0])
    L.new(mp.outputs[0], sep.inputs[0])
    L.new(ramp.outputs[0], em.inputs[0])
    em.inputs[1].default_value = 1.0
    L.new(em.outputs[0], out.inputs[0])
    return m


INK = bpy.data.materials.new("ink")
INK.use_nodes = True
INK.use_backface_culling = True
N_ = INK.node_tree.nodes
N_.clear()
_o = N_.new("ShaderNodeOutputMaterial")
_e = N_.new("ShaderNodeEmission")
_e.inputs[0].default_value = (*lin("#2d1a22"), 1)
INK.node_tree.links.new(_e.outputs[0], _o.inputs[0])


def outline(o, t):
    o.data.materials.append(INK)
    s = o.modifiers.new("ink", "SOLIDIFY")
    s.thickness = -t
    s.use_flip_normals = True
    s.use_even_offset = True
    s.material_offset = len(o.data.materials) - 1
    s.use_rim = False


def finish(o, m, ol):
    o.data.materials.append(m)
    if ol:
        outline(o, ol)
    return o


def box(loc, size, m, ol=0.035, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, ol)


def cyl(loc, r, h, m, ol=0.03, rot=(0, 0, 0), v=24, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object
    if smooth:
        bpy.ops.object.shade_smooth()
    return finish(o, m, ol)


def sph(loc, r, m, ol=0.03, scale=(1, 1, 1), seg=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=rings)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.shade_smooth()
    return finish(o, m, ol)


def blob(loc, r, m, ol=0.05, seed=0, n=5, spread=1.0, sy=0.8):
    rr = random.Random(seed)
    parts = []
    for i in range(n):
        p = (loc[0] + rr.uniform(-1, 1) * r * 0.7 * spread, loc[1] + rr.uniform(-1, 1) * r * 0.6 * spread, loc[2] + rr.uniform(-0.3, 0.6) * r)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r * rr.uniform(0.55, 0.85), location=p)
        o = bpy.context.object
        o.scale = (1, 1, sy)
        parts.append(o)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.object.shade_smooth()
    return finish(o, m, ol)


# ------------------------------------------------------------------ material
T_ROOF, T_PLA, T_PAV, T_GRASS = tex_roof(), tex_plaster(), tex_paving(), tex_grass()
M = {
    "roof": mat("genteng", "#c4502c", T_ROOF, tile=0.55, rim=0.05),
    "wall": mat("dinding", "#f3e6c9", T_PLA, tile=0.35, rim=0.06),
    "dado": mat("dado", "#3f9a86", tex_plaster("#3f9a86", 0.18, 7), tile=0.35, rim=0.05),
    "trim": mat("list", "#fbf6ea", tex_plaster("#fbf6ea", 0.05, 9), tile=0.4, rim=0.05),
    "plinth": mat("plinth", "#9d968c", T_PAV, tile=0.5, rim=0.0),
    "paving": mat("paving", "#bdb3a6", T_PAV, tile=0.45, rim=0.0, shade=(0.8, 0.72, 0.84)),
    "grass": mat("rumput", "#8fbe58", T_GRASS, tile=1.6, rim=0.0, shade=(0.72, 0.7, 0.86)),
    "wood": mat("kayu", "#8a5a34", tex_wood("#8a5a34"), tile=0.7, rim=0.05),
    "frame": mat("kusen", "#5c3a24", tex_wood("#5c3a24"), tile=0.9, rim=0.05),
    "glass": glass_mat(),
    "col": mat("tiang", "#f7f0e0", tex_plaster("#f7f0e0", 0.06, 12), tile=0.4, rim=0.1),
    "metal": mat("logam", "#8a929c", None, rim=0.2),
    "gold": mat("emas", "#f0c850", None, rim=0.25),
    "red": mat("merah", "#d63a36", None, rim=0.1),
    "white": mat("putih", "#fffaf0", None, rim=0.1),
    "leafA": mat("daunA", "#4f9a3c", None, rim=0.18, shade=(0.5, 0.62, 0.75)),
    "leafB": mat("daunB", "#6fb04a", None, rim=0.18, shade=(0.55, 0.64, 0.75)),
    "leafC": mat("daunC", "#3c8a4a", None, rim=0.18, shade=(0.5, 0.62, 0.78)),
    "trunk": mat("batang", "#7a5238", None, rim=0.1),
    "pot": mat("pot", "#c8683e", None, rim=0.15),
    "flowR": mat("bungaM", "#ff6a7a", None, rim=0.3),
    "flowY": mat("bungaK", "#ffd23a", None, rim=0.3),
    "sign": mat("papan", "#2f7f70", tex_plaster("#2f7f70", 0.05, 13), tile=0.4, rim=0.1),
    "lamp": mat("lampu", "#fff2b0", None, emit=2.0, rim=0.0),
}

# ------------------------------------------------------------------ gedung
W, Db = 18.0, 5.0          # lebar & kedalaman badan
YF = -Db / 2               # dinding depan
Z0 = 0.30                  # lantai
WH = 3.6                   # tinggi dinding

# tanah & halaman
bpy.ops.mesh.primitive_plane_add(size=240, location=(0, 40, 0))
g = bpy.context.object
g.data.materials.append(M["grass"])
box((0, -9.0, 0.02), (W + 8, 15.5, 0.04), M["paving"], 0.0)                 # halaman utama
box((0, -26.0, 0.02), (4.6, 20, 0.04), M["paving"], 0.0)                       # jalan setapak ke gerbang
box((0, -19.0, 0.02), (W + 14, 7.0, 0.04), M["paving"], 0.0)
box((0, -3.9, 0.15), (W + 0.6, 3.4, 0.30), M["plinth"], 0.03)                 # teras
box((0, 0, 0.15), (W + 0.4, Db + 0.4, 0.30), M["plinth"], 0.03)               # fondasi

# dinding
box((0, 0, Z0 + 0.5), (W, Db, 1.0), M["dado"], 0.04)                           # dado
box((0, 0, Z0 + 1.0 + 1.3), (W, Db, 2.6), M["wall"], 0.04)                     # dinding atas
box((0, YF - 0.03, Z0 + 1.02), (W + 0.08, 0.1, 0.1), M["trim"], 0.02)          # list pemisah
box((0, YF - 0.03, Z0 + WH - 0.08), (W + 0.08, 0.12, 0.16), M["trim"], 0.02)  # list atas

# tiang teras + balok
for x in (-9, -6, -3, 3, 6, 9):
    cyl((x, -5.5, Z0 + 1.75), 0.17, 3.5, M["col"], 0.03)
    box((x, -5.5, Z0 + 0.12), (0.5, 0.5, 0.24), M["trim"], 0.025)
    box((x, -5.5, Z0 + 3.5 - 0.1), (0.46, 0.46, 0.2), M["trim"], 0.025)
box((0, -5.5, Z0 + 3.5 + 0.18), (W + 0.4, 0.4, 0.5), M["trim"], 0.035)         # balok depan
box((0, -5.5, Z0 + 3.5 - 0.26), (W + 0.4, 0.34, 0.1), M["dado"], 0.02)

# atap pelana berubin
TH = math.radians(22)
RY = -0.9                  # sumbu bubungan
half = 4.35
slab_len = half / math.cos(TH)
eave = Z0 + 3.5 + 0.45
rise = half * math.tan(TH)
for sgn, yoff in ((1, -half / 2), (-1, half / 2)):
    box((0, RY + yoff, eave + rise / 2 + 0.05), (W + 1.8, slab_len, 0.2), M["roof"], 0.045, rot=(sgn * TH, 0, 0))
cyl((0, RY, eave + rise + 0.12), 0.2, W + 1.9, M["roof"], 0.04, rot=(0, math.radians(90), 0), v=12)
box((0, RY - half - 0.05, eave - 0.14), (W + 1.8, 0.12, 0.34), M["trim"], 0.03)   # papan lisplang depan
box((0, RY + half + 0.05, eave - 0.14), (W + 1.8, 0.12, 0.34), M["trim"], 0.03)

# segitiga gable di kedua sisi + ventilasi
for sx in (-1, 1):
    bm = bmesh.new()
    pts = [(-4.9, Z0 + WH), (3.2, Z0 + WH), (RY, eave + rise - 0.1)]
    vs = [bm.verts.new((0, y, z)) for y, z in pts]
    bm.faces.new(vs)
    me = bpy.data.meshes.new("gable")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("gable", me)
    bpy.context.collection.objects.link(o)
    o.location = (sx * (W / 2 + 0.05), 0, 0)
    bpy.context.view_layer.objects.active = o
    so = o.modifiers.new("t", "SOLIDIFY")
    so.thickness = 0.25
    so.offset = 0
    finish(o, M["wall"], 0.04)
    cyl((sx * (W / 2 + 0.32), RY, Z0 + WH + 1.05), 0.42, 0.06, M["trim"], 0.025, rot=(0, math.radians(90), 0))
    cyl((sx * (W / 2 + 0.36), RY, Z0 + WH + 1.05), 0.3, 0.05, M["frame"], 0.0, rot=(0, math.radians(90), 0))

# jendela depan
for x in (-6.6, -3.4, 3.4, 6.6):
    zc = Z0 + 2.35
    box((x, YF - 0.06, zc), (1.95, 0.14, 1.55), M["frame"], 0.03)
    box((x, YF - 0.12, zc), (1.7, 0.06, 1.3), M["glass"], 0.0)
    box((x, YF - 0.17, zc), (0.07, 0.05, 1.3), M["frame"], 0.0)
    box((x, YF - 0.17, zc + 0.1), (1.7, 0.05, 0.07), M["frame"], 0.0)
    box((x, YF - 0.17, zc - 0.3), (1.7, 0.05, 0.05), M["frame"], 0.0)
    box((x, YF - 0.16, zc - 0.84), (2.2, 0.28, 0.1), M["trim"], 0.025)           # ambang
    box((x, YF - 0.12, zc + 0.86), (2.2, 0.12, 0.1), M["trim"], 0.025)           # alis atas
    for s in (-1, 1):
        box((x + s * 1.25, YF - 0.08, zc), (0.5, 0.08, 1.55), M["dado"], 0.025)  # daun jendela hijau
        for k in range(6):
            box((x + s * 1.25, YF - 0.13, zc - 0.65 + k * 0.26), (0.46, 0.04, 0.05), M["trim"], 0.0)

# pintu ganda + kusen + oberlis
dz = Z0 + 1.2
box((0, YF - 0.07, dz + 0.15), (2.7, 0.16, 2.85), M["frame"], 0.03)
for s in (-1, 1):
    box((s * 0.58, YF - 0.13, dz), (1.1, 0.08, 2.4), M["wood"], 0.025)
    box((s * 0.58, YF - 0.18, dz + 0.55), (0.8, 0.03, 0.8), M["frame"], 0.0)
    box((s * 0.58, YF - 0.18, dz - 0.6), (0.8, 0.03, 0.8), M["frame"], 0.0)
    sph((s * 0.12, YF - 0.2, dz), 0.05, M["gold"], 0.01)
box((0, YF - 0.12, dz + 1.43), (2.3, 0.06, 0.34), M["glass"], 0.0)
for st in range(3):
    box((0, YF - 0.5 - st * 0.45, Z0 - 0.03 - 0.0 + 0.1 * (2 - st)), (3.6 + st * 0.0, 0.5, 0.1 + 0.1 * (2 - st) - 0.1), M["plinth"], 0.02)

# papan nama di atas pintu
box((0, YF - 0.12, Z0 + 3.12), (5.2, 0.12, 0.7), M["sign"], 0.03)
bpy.ops.object.text_add(location=(0, YF - 0.2, Z0 + 3.02), rotation=(math.radians(90), 0, 0))
t = bpy.context.object
t.data.body = "SD NEGERI HARAPAN 01"
t.data.size = 0.34
t.data.align_x = "CENTER"
t.data.extrude = 0.025
bpy.ops.object.convert(target="MESH")
t = bpy.context.object
t.data.materials.append(M["white"])

# lampu teras, pipa talang, lampu dinding
for x in (-4.5, 4.5):
    cyl((x, -5.5, Z0 + 3.35), 0.015, 0.3, M["metal"], 0.0)
    sph((x, -5.5, Z0 + 3.05), 0.17, M["lamp"], 0.02)
for sx in (-1, 1):
    cyl((sx * (W / 2 - 0.1), YF - 0.12, Z0 + 1.9), 0.07, 3.4, M["metal"], 0.02)

# pot tanaman & semak di teras
for x in (-2.6, 2.6):
    cyl((x, -4.6, Z0 + 0.3), 0.28, 0.6, M["pot"], 0.025)
    blob((x, -4.6, Z0 + 0.95), 0.55, M["leafA"], 0.03, seed=int(x * 7), n=4, sy=0.9)
    for k in range(3):
        sph((x + (k - 1) * 0.28, -4.75, Z0 + 1.2 + (k % 2) * 0.12), 0.08, M["flowR" if k % 2 else "flowY"], 0.015)

# taman bunga di depan teras
for i, x in enumerate([-8.2, -6.0, -3.9, 3.9, 6.0, 8.2]):
    box((x, -7.6, 0.18), (1.7, 1.0, 0.36), M["plinth"], 0.03)
    for k in range(7):
        rr = random.Random(100 + i * 10 + k)
        mk = "flowR" if (i + k) % 2 else "flowY"
        sph((x + rr.uniform(-0.65, 0.65), -7.6 + rr.uniform(-0.3, 0.3), 0.5 + rr.uniform(0, 0.12)), 0.11, M[mk], 0.015)
    blob((x, -7.6, 0.45), 0.5, M["leafB"], 0.03, seed=200 + i, n=3, sy=0.5)
# tiang lampu halaman
for x in (-10.5, 10.5):
    cyl((x, -12.5, 1.6), 0.06, 3.2, M["metal"], 0.025)
    sph((x, -12.5, 3.3), 0.22, M["lamp"], 0.025)
# tiang bendera + bendera
cyl((-7.6, -11.6, 4.5), 0.07, 9.0, M["metal"], 0.03)
for sx_, sy_, ss_ in ((-12.5, -8.0, 0.9),):
    pass
sph((-7.6, -11.6, 9.1), 0.13, M["gold"], 0.02)
box((-7.6 + 0.93, -11.6, 8.35), (1.8, 0.03, 0.55), M["red"], 0.02)
box((-7.6 + 0.93, -11.6, 7.8), (1.8, 0.03, 0.55), M["white"], 0.02)
box((-7.6, -11.6, 0.1), (0.9, 0.9, 0.2), M["plinth"], 0.03)

# pagar & gerbang
for i in range(-11, 12):
    x = i * 1.0
    if abs(x) <= 2.2:
        continue
    box((x, -16.2, 0.55), (0.12, 0.12, 1.1), M["trim"], 0.02)
    sph((x, -16.2, 1.15), 0.09, M["dado"], 0.012)
for z in (0.35, 0.8):
    for sx in (-1, 1):
        box((sx * 7.1, -16.2, z), (9.8, 0.07, 0.09), M["dado"], 0.02)
for sx in (-1, 1):
    box((sx * 2.45, -16.2, 0.95), (0.4, 0.4, 1.9), M["trim"], 0.03)
    box((sx * 2.45, -16.2, 1.95), (0.55, 0.55, 0.12), M["dado"], 0.02)
    sph((sx * 2.45, -16.2, 2.12), 0.14, M["gold"], 0.015)

# pohon & semak
for (x, y, s, sd) in [(-13, -6, 1.15, 1), (13.5, -5, 1.0, 2), (-15.5, -13, 1.3, 3), (16.5, -12, 1.1, 4), (11, -19, 0.9, 5)]:
    cyl((x, y, 1.6 * s), 0.28 * s, 3.2 * s, M["trunk"], 0.04)
    for k, (dx, dy, dz_, rr, mk) in enumerate([(0, 0, 4.4, 2.2, "leafA"), (-1.3, 0.6, 3.7, 1.6, "leafC"), (1.4, -0.4, 3.9, 1.7, "leafB"), (0.3, 0.9, 5.5, 1.3, "leafB")]):
        blob((x + dx * s, y + dy * s, dz_ * s), rr * s, M[mk], 0.06, seed=sd * 10 + k, n=4, sy=0.85)
for i, x in enumerate([-8.6, -5.2, -1.2, 1.2, 5.2, 8.6]):
    blob((x, -6.6, 0.45), 0.6, M["leafC" if i % 2 else "leafA"], 0.04, seed=40 + i, n=3, sy=0.8)

# awan, bukit, gunung jauh
cloud_m = LT.toon("awan", "#fff0dc", shade_mul=0.82, rim=0.0)
for (x, y, z, s) in [(-30, 90, 30, 4.0), (24, 100, 36, 5.0), (-5, 110, 46, 4.5), (45, 90, 24, 3.2), (-52, 80, 22, 3.4), (8, 70, 26, 2.6), (30, 60, 40, 3.0), (-18, 65, 36, 2.4)]:
    LT.cloud((x, y, z), s, cloud_m)
for i, (x, y, r, h, k) in enumerate([(-40, 70, 26, 9, 0.5), (-5, 85, 30, 12, 0.58), (38, 75, 24, 8, 0.5), (70, 95, 34, 14, 0.62)]):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, 0), segments=32, ring_count=16)
    hl = bpy.context.object
    hl.scale = (1.6, 1, h / r)
    hl.data.materials.append(LT.haze(f"bukit{i}", "#5d9a54", k))
for i in range(6):
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=26 + i * 3, depth=26 + (i % 3) * 8, location=(-110 + i * 44, 150, 8))
    bpy.context.object.data.materials.append(LT.haze(f"gn{i}", "#7a6a9a", 0.7))

bpy.ops.mesh.primitive_circle_add(vertices=48, radius=9, fill_type="NGON", location=(48, 150, 22), rotation=(math.radians(90), 0, 0))
sd = bpy.context.object
sm = bpy.data.materials.new("matahari")
sm.use_nodes = True
sm.node_tree.nodes.clear()
_a = sm.node_tree.nodes.new("ShaderNodeOutputMaterial")
_b = sm.node_tree.nodes.new("ShaderNodeEmission")
_b.inputs[0].default_value = (*lin("#fff3c0"), 1)
_b.inputs[1].default_value = 2.5
sm.node_tree.links.new(_b.outputs[0], _a.inputs[0])
sd.data.materials.append(sm)
# ------------------------------------------------------------------ langit sore & cahaya
w = bpy.data.worlds.new("sore")
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
els[0].position = 0.46
els[0].color = (*lin("#ffd9a8"), 1)
els[1].position = 0.9
els[1].color = (*lin("#5aa0e0"), 1)
els.new(0.6).color = (*lin("#bcdcf2"), 1)
Lw.new(tc.outputs["Generated"], sp.inputs[0])
Lw.new(sp.outputs["Z"], rp.inputs[0])
Lw.new(rp.outputs[0], bg.inputs[0])
bg.inputs[1].default_value = 1.15
Lw.new(bg.outputs[0], wo.inputs[0])

bpy.ops.object.light_add(type="SUN", rotation=(math.radians(66), math.radians(-8), math.radians(-38)))
sun = bpy.context.object
sun.data.energy = 3.6
sun.data.color = (1.0, 0.86, 0.66)
sun.data.angle = math.radians(3)
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), math.radians(10), math.radians(140)))
fill = bpy.context.object
fill.data.energy = 1.1
fill.data.color = (0.78, 0.84, 1.0)
fill.data.use_shadow = False

# ------------------------------------------------------------------ kamera
def look(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

CAMS = {
    "hero": ((-9.5, -18.5, 2.9), (0.8, -3.0, 3.3), 27, None),
    "dekat": ((-2.6, -13.5, 1.45), (0.3, -4.0, 2.3), 40, 10.2),
}
loc, tgt, lens, focus = CAMS[SHOT]
bpy.ops.object.camera_add(location=loc)
cam = bpy.context.object
look(cam, tgt)
cam.data.lens = lens
cam.data.clip_end = 600
sc.camera = cam
if focus:
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = focus
    cam.data.dof.aperture_fstop = 2.2

sc.render.engine = "BLENDER_EEVEE"
ee = sc.eevee
ee.use_gtao = True
ee.gtao_distance = 0.6
ee.gtao_factor = 1.2
ee.use_soft_shadows = True
ee.use_bloom = True
ee.bloom_threshold = 1.0
ee.bloom_intensity = 0.05
ee.taa_render_samples = 32
ee.shadow_cascade_size = "4096"
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.filepath = OUT
sc.render.image_settings.file_format = "PNG"
bpy.ops.wm.save_as_mainfile(filepath=OUT.replace(".png", ".blend"))
t0 = time.time()
bpy.ops.render.render(write_still=True)
print(f"WAKTU {SHOT}: {time.time() - t0:.1f} dtk")
