"""Latar 'Gurun Carlsbad saat senja' bergaya toon untuk Blender (dipanggil dari stick.py)."""
import bpy, bmesh, math, random
import numpy as np
from mathutils import Vector, noise


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def _img(name, arr):
    h, w, _ = arr.shape
    im = bpy.data.images.new(name, w, h, alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im


def strata_image():
    """tekstur lapisan batu bergelombang (warna senja), digambar dengan numpy"""
    W, H = 1024, 512
    cols = ["#7a2f3e", "#b8431f", "#d9622b", "#e8893f", "#f2ad5e", "#c2552d", "#8f3a35", "#e07a3a", "#f4c07a", "#a63f2a"]
    rng = np.random.default_rng(3)
    y = np.arange(H)[:, None] + 9 * np.sin(np.arange(W)[None, :] * 0.012) + 4 * np.sin(np.arange(W)[None, :] * 0.043 + 1)
    band = np.floor(y / 34).astype(int) % len(cols)
    C = np.array([lin(c) for c in cols])
    img = C[band]
    seam = (np.mod(y, 34) > 31)
    img[seam] *= 0.62
    img *= (0.9 + 0.1 * rng.random((H, W)))[..., None]
    streak = (rng.random(W) > 0.93)[None, :] * (rng.random((H, 1)) > 0.3)
    img[streak] *= 0.82
    rgba = np.concatenate([img, np.ones((H, W, 1))], axis=2)[::-1]
    return _img("strata", rgba)


def toon(name, base=None, image=None, shade_mul=0.58, rim=0.18, emit_boost=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N = nt.nodes
    L = nt.links
    N.clear()
    out = N.new("ShaderNodeOutputMaterial")
    dif = N.new("ShaderNodeBsdfDiffuse")
    s2r = N.new("ShaderNodeShaderToRGB")
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].color = (shade_mul * 0.95, shade_mul * 0.85, shade_mul * 1.15, 1)
    e[1].position = 0.17
    e[1].color = (1, 1, 1, 1)
    e.new(0.62).color = (1.1, 1.06, 1.0, 1)
    mul = N.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1
    if image is not None:
        tx = N.new("ShaderNodeTexImage")
        tx.image = image
        L.new(tx.outputs[0], mul.inputs[6])
    else:
        mul.inputs[6].default_value = (*lin(base), 1)
    L.new(dif.outputs[0], s2r.inputs[0])
    L.new(s2r.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], mul.inputs[7])
    lw = N.new("ShaderNodeLayerWeight")
    lw.inputs[0].default_value = 0.2
    rr = N.new("ShaderNodeValToRGB")
    rr.color_ramp.interpolation = "CONSTANT"
    rr.color_ramp.elements[0].color = (0, 0, 0, 1)
    rr.color_ramp.elements[1].position = 0.6
    rr.color_ramp.elements[1].color = (rim, rim * 0.75, rim * 0.5, 1)
    L.new(lw.outputs["Facing"], rr.inputs[0])
    add = N.new("ShaderNodeMix")
    add.data_type = "RGBA"
    add.blend_type = "ADD"
    add.inputs[0].default_value = 1
    L.new(mul.outputs[2], add.inputs[6])
    L.new(rr.outputs[0], add.inputs[7])
    em = N.new("ShaderNodeEmission")
    em.inputs[1].default_value = emit_boost
    L.new(add.outputs[2], em.inputs[0])
    L.new(em.outputs[0], out.inputs[0])
    m.diffuse_color = (*(lin(base) if base else (0.8, 0.4, 0.2)), 1)
    return m


def haze(name, base, k):
    """warna memudar ke arah langit senja untuk objek jauh (perspektif udara)"""
    c = np.array(lin(base))
    h = np.array(lin("#ffb38a"))
    mix = c * (1 - k) + h * k
    hexs = "#" + "".join(f"{int(round((v ** (1 / 2.2)) * 255)):02x}" for v in mix)
    return toon(name, hexs, shade_mul=0.75 + 0.2 * k, rim=0.0)


INK = None


def ink():
    global INK
    if INK:
        return INK
    INK = bpy.data.materials.new("ink_bg")
    INK.use_nodes = True
    INK.use_backface_culling = True
    N = INK.node_tree.nodes
    N.clear()
    o = N.new("ShaderNodeOutputMaterial")
    e = N.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*lin("#2a1420"), 1)
    INK.node_tree.links.new(e.outputs[0], o.inputs[0])
    return INK


def outline(o, t):
    o.data.materials.append(ink())
    s = o.modifiers.new("ink", "SOLIDIFY")
    s.thickness = -t
    s.use_flip_normals = True
    s.material_offset = len(o.data.materials) - 1
    s.use_rim = False


def mesa(loc, rx, ry, h, mat, ol=0.06, seed=0, top_mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1, depth=1, location=(0, 0, 0))
    o = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(o.data)
    rnd = random.Random(seed)
    for v in bm.verts:
        a = math.atan2(v.co.y, v.co.x)
        jag = 1 + 0.12 * math.sin(a * 3 + seed) + 0.06 * rnd.random()
        taper = 1.18 if v.co.z < 0 else 0.92
        v.co.x *= rx * jag * taper
        v.co.y *= ry * jag * taper
        v.co.z = (v.co.z + 0.5) * h
    bm.to_mesh(o.data)
    bm.free()
    o.location = loc
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cylinder_project(direction="ALIGN_TO_OBJECT", scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    o.data.materials.append(mat)
    if top_mat:
        o.data.materials.append(top_mat)
        for p in o.data.polygons:
            if p.normal.z > 0.7:
                p.material_index = 1
    if ol:
        outline(o, ol)
    return o


def cactus(loc, s, mat):
    parts = []
    def cap(a, b, r):
        a, b = Vector(a), Vector(b)
        d = b - a
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=12)
        c = bpy.context.object
        c.rotation_mode = "QUATERNION"
        c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
        parts.append(c)
        for p in (a, b):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=p, segments=12, ring_count=8)
            parts.append(bpy.context.object)
    x, y, z = loc
    cap((x, y, z), (x, y, z + 1.9 * s), 0.17 * s)
    cap((x + 0.18 * s, y, z + 0.8 * s), (x + 0.42 * s, y, z + 0.8 * s), 0.1 * s)
    cap((x + 0.42 * s, y, z + 0.8 * s), (x + 0.42 * s, y, z + 1.35 * s), 0.1 * s)
    cap((x - 0.16 * s, y, z + 1.1 * s), (x - 0.38 * s, y, z + 1.1 * s), 0.09 * s)
    cap((x - 0.38 * s, y, z + 1.1 * s), (x - 0.38 * s, y, z + 1.5 * s), 0.09 * s)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    outline(o, 0.025 * s)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def rock(loc, s, mat, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=s, location=loc)
    o = bpy.context.object
    rnd = random.Random(seed)
    for v in o.data.vertices:
        v.co *= 0.8 + 0.35 * rnd.random()
        v.co.z *= 0.6
    o.data.materials.append(mat)
    outline(o, 0.02 * s / 0.5)
    return o


def cloud(loc, s, mat):
    parts = []
    for dx, dz, r in ((0, 0, 1.0), (1.1, -0.15, 0.8), (-1.0, -0.2, 0.75), (0.5, 0.45, 0.7), (-0.4, 0.35, 0.65), (1.8, -0.3, 0.5)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r * s, location=(loc[0] + dx * s, loc[1], loc[2] + dz * s), segments=16, ring_count=8)
        o = bpy.context.object
        o.scale = (1, 0.45, 0.8)
        parts.append(o)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def cave(loc, s, rock_mat, dark_mat):
    x, y, z = loc
    bpy.ops.mesh.primitive_torus_add(major_radius=1.4 * s, minor_radius=0.55 * s, location=(x, y, z), rotation=(math.radians(90), 0, 0), major_segments=20, minor_segments=8)
    t = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(t.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.2 * s], context="VERTS")
    rnd = random.Random(4)
    for v in bm.verts:
        v.co *= 0.92 + 0.16 * rnd.random()
    bm.to_mesh(t.data)
    bm.free()
    t.data.materials.append(rock_mat)
    outline(t, 0.05)
    bpy.ops.mesh.primitive_circle_add(vertices=24, radius=1.25 * s, fill_type="NGON", location=(x, y + 0.25 * s, z), rotation=(math.radians(90), 0, 0))
    d = bpy.context.object
    d.data.materials.append(dark_mat)
    return t


def bat(loc, s, mat, flap):
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18 * s, location=loc, segments=12, ring_count=8)
    parts.append(bpy.context.object)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.5 * s, depth=0.02 * s, location=(loc[0] + side * 0.45 * s, loc[1], loc[2] + flap * 0.15 * s), rotation=(math.radians(90), 0, math.radians(90 + side * 90)))
        w = bpy.context.object
        w.rotation_euler[1] = side * flap * 0.6
        parts.append(w)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.06 * s, depth=0.14 * s, location=(loc[0] + side * 0.09 * s, loc[1], loc[2] + 0.2 * s))
        parts.append(bpy.context.object)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.data.materials.append(mat)
    return o


def build(scene, frames=90):
    random.seed(7)
    strata = strata_image()
    rock_m = toon("batu", image=strata, rim=0.25)
    top_m = toon("puncak", "#d9874a", rim=0.1)
    sand = toon("pasir", "#e9b27a", shade_mul=0.72, rim=0.05)
    sand2 = toon("pasir2", "#d99a62", shade_mul=0.72, rim=0.05)
    green = toon("kaktus", "#5e9a4e", rim=0.2)
    pebble = toon("kerikil", "#b8714a", rim=0.15)
    cloud_m = toon("awan", "#ffe2c8", shade_mul=0.8, rim=0.0, emit_boost=1.0)
    dark = bpy.data.materials.new("gelap")
    dark.use_nodes = True
    dark.node_tree.nodes.clear()
    o = dark.node_tree.nodes.new("ShaderNodeOutputMaterial")
    e = dark.node_tree.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*lin("#1a0c18"), 1)
    dark.node_tree.links.new(e.outputs[0], o.inputs[0])
    batm = toon("kelelawar", "#4a3a52", rim=0.3)

    # tanah: bukit pasir berombak
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=120, y_subdivisions=120, size=140, location=(0, 50, 0))
    g = bpy.context.object
    for v in g.data.vertices:
        wx, wy = v.co.x, v.co.y + 50
        dist = max(0.0, (wy - 3) / 60)
        v.co.z = (noise.noise(Vector((wx * 0.05, wy * 0.05, 0))) * 1.2 + math.sin(wx * 0.15 + wy * 0.05) * 0.4) * min(1, dist * 3)
    bpy.ops.object.shade_smooth()
    g.data.materials.append(sand)

    # mesa dekat (dengan garis tepi), menengah & jauh memudar
    mesa((-7.5, 16, -0.2), 4.5, 3.0, 6.5, rock_m, 0.08, 1, top_m)
    mesa((9.0, 22, -0.2), 6.0, 3.5, 9.0, rock_m, 0.08, 2, top_m)
    mesa((-2.0, 34, -0.2), 5.0, 3.0, 5.0, rock_m, 0.08, 3, top_m)
    for i, (x, y, rx, h) in enumerate([(-20, 55, 9, 10), (18, 60, 11, 13), (2, 75, 14, 8), (-38, 80, 12, 14), (38, 85, 10, 11)]):
        mesa((x, y, -0.5), rx, rx * 0.6, h, haze(f"jauh{i}", "#b8532d", 0.45 + i * 0.06), 0, 10 + i)
    for i in range(7):
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=14 + i * 3, depth=12 + (i % 3) * 5, location=(-60 + i * 20, 115, 3))
        bpy.context.object.data.materials.append(haze(f"gunung{i}", "#9a5a6a", 0.68))

    # gua di kaki mesa kiri + kelelawar keluar
    cave((-3.6, 13.2, 0.9), 1.1, rock_m, dark)
    bats = []
    rnd = random.Random(11)
    for i in range(24):
        b = bat((-3.6 + rnd.uniform(-1, 1), 12.5, 1.2), 0.35 + rnd.random() * 0.25, batm, 0.5)
        bats.append((b, rnd.uniform(0, 1), rnd.uniform(-1, 1), rnd.uniform(0.6, 1.2)))
    for b, ph, sx, sp in bats:
        for f in range(1, frames + 1, 6):
            k = ((f / frames) * sp + ph) % 1.0
            b.location = (-3.6 + sx * 2 + k * 10 * sx + math.sin(f * 0.3 + ph * 6) * 0.4, 12.5 - k * 3, 1.2 + k * 9)
            b.keyframe_insert("location", frame=f)
            b.rotation_euler[1] = math.sin(f * 0.9 + ph * 6) * 0.5
            b.keyframe_insert("rotation_euler", index=1, frame=f)

    # kaktus, batu, kerikil di tengah & depan
    for (x, y, s) in [(-3.2, 4.5, 0.9), (3.6, 6.5, 1.1), (-4.8, 9.0, 1.3), (6.5, 11, 1.0), (1.4, 14, 0.8), (-1.8, 2.6, 0.55)]:
        cactus((x, y, 0), s, green)
    for i, (x, y, s) in enumerate([(-2.4, 3.0, 0.35), (2.6, 2.2, 0.45), (4.4, 5.0, 0.6), (-4.0, 6.5, 0.7), (0.8, 8.0, 0.4), (-1.0, 1.6, 0.18), (1.6, 1.2, 0.15)]):
        rock((x, y, s * 0.2), s, pebble, i)
    # latar depan dekat kamera (blur DOF) + riak pasir
    for i,(x,y,s) in enumerate([(-1.35,-1.1,0.42),(1.5,-0.9,0.5),(-0.7,-1.4,0.2),(0.9,-1.5,0.16),(0.15,-1.0,0.1),(-1.9,-0.4,0.3)]):
        rock((x,y,s*0.15), s, pebble, 30+i)
    cactus((1.9,-0.5,0), 0.7, green)
    for i in range(14):
        y0=-3+i*1.2
        bpy.ops.mesh.primitive_torus_add(major_radius=6+i*0.3, minor_radius=0.025, location=(0.3*(i%3),y0+6,0.01), major_segments=48, minor_segments=4)
        r=bpy.context.object; r.scale=(1.6,0.25,0.2); r.data.materials.append(sand2)
    # awan senja
    for (x, y, z, s) in [(-12, 70, 22, 3.0), (10, 80, 28, 3.8), (26, 70, 18, 2.5), (-28, 85, 30, 3.2), (0, 90, 35, 2.8)]:
        cloud((x, y, z), s, cloud_m)

    # langit gradasi + matahari terbenam
    w = bpy.data.worlds.new("senja")
    scene.world = w
    w.use_nodes = True
    N = w.node_tree.nodes
    L = w.node_tree.links
    N.clear()
    out = N.new("ShaderNodeOutputWorld")
    bg = N.new("ShaderNodeBackground")
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    ramp = N.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[0].color = (*lin("#ffb06e"), 1)
    els[1].position = 0.45
    els[1].color = (*lin("#5a4aa0"), 1)
    els.new(0.12).color = (*lin("#ff8a7a"), 1)
    els.new(0.26).color = (*lin("#c86aa0"), 1)
    L.new(tc.outputs["Generated"], sep.inputs[0])
    L.new(sep.outputs["Z"], ramp.inputs[0])
    sun_d = N.new("ShaderNodeTexGradient")
    sun_d.gradient_type = "SPHERICAL"
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Location"].default_value = (-0.55, -0.95, -0.03)
    mp.inputs["Scale"].default_value = (9, 9, 9)
    L.new(tc.outputs["Generated"], mp.inputs[0])
    L.new(mp.outputs[0], sun_d.inputs[0])
    sramp = N.new("ShaderNodeValToRGB")
    sramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    sramp.color_ramp.elements[1].position = 0.9
    sramp.color_ramp.elements[1].color = (1.6, 1.3, 0.7, 1)
    L.new(sun_d.outputs["Fac"], sramp.inputs[0])
    addc = N.new("ShaderNodeMix")
    addc.data_type = "RGBA"
    addc.blend_type = "ADD"
    addc.inputs[0].default_value = 1
    L.new(ramp.outputs[0], addc.inputs[6])
    L.new(sramp.outputs[0], addc.inputs[7])
    L.new(addc.outputs[2], bg.inputs[0])
    bg.inputs[1].default_value = 1.0
    L.new(bg.outputs[0], out.inputs[0])
    # cakram matahari besar di cakrawala
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=7, fill_type="NGON", location=(14, 118, 9), rotation=(math.radians(90), 0, 0))
    sd = bpy.context.object
    sm = bpy.data.materials.new("matahari")
    sm.use_nodes = True
    sm.node_tree.nodes.clear()
    o2 = sm.node_tree.nodes.new("ShaderNodeOutputMaterial")
    e2 = sm.node_tree.nodes.new("ShaderNodeEmission")
    e2.inputs[0].default_value = (*lin("#fff0b0"), 1)
    e2.inputs[1].default_value = 2.2
    sm.node_tree.links.new(e2.outputs[0], o2.inputs[0])
    sd.data.materials.append(sm)

    # cahaya: matahari rendah hangat dari belakang-kanan + isi biru dari langit
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(72), math.radians(18), math.radians(160)))
    s = bpy.context.object
    s.data.energy = 4.0
    s.data.color = (1.0, 0.78, 0.55)
    s.data.angle = math.radians(4)
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(40), math.radians(-30), math.radians(-30)))
    f2 = bpy.context.object
    f2.data.energy = 1.4
    f2.data.color = (0.85, 0.8, 1.0)
    f2.data.use_shadow = False

    ee = scene.eevee
    ee.use_bloom = True
    ee.bloom_threshold = 1.2
    ee.bloom_intensity = 0.06
    ee.use_gtao = True
    ee.use_soft_shadows = True
    ee.shadow_cascade_size = "2048"
