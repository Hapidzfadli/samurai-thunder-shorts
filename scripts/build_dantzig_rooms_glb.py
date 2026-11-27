"""
Headless Blender 4.x script to build the 3 interior 1939 sets for
'Kisah Nyata George Dantzig (1939)':
  Set 1 (X =  0): Kamar Belajar Malam George & Anne (banker's lamp, clock 02:00, crumpled papers)
  Set 2 (X = 24): Ruang Kerja Prof. Jerzy Neyman (towering paper mountains, library, globe)
  Set 3 (X = 48): Ruang Tamu & Pintu Depan Minggu Pagi (clock 08:00, hinged 3D front door + sunlit porch)

Usage:
    blender --background --python scripts/build_dantzig_rooms_glb.py -- public/models/dantzig_rooms.glb

Coordinate Convention (export_yup=True):
    Three.X =  Blender.X
    Three.Y =  Blender.Z
    Three.Z = -Blender.Y
"""

import math
import os
import random
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Euler

argv = sys.argv
custom_args = argv[argv.index("--") + 1:] if "--" in argv else []
OUT_PATH = custom_args[0] if custom_args else os.path.abspath("public/models/dantzig_rooms.glb")
os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_image_from_rgba(name: str, rgba: np.ndarray):
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True)
    img.pixels.foreach_set(np.flipud(rgba).ravel().astype(np.float32))
    img.pack()
    return img


def gen_wood_planks(name, tones):
    w, h = 512, 512
    img = np.ones((h, w, 4), dtype=np.float32)
    rng = np.random.default_rng(abs(hash(name)) % (2**31))
    n = 8
    ph = h // n
    for i in range(n):
        y0 = i * ph
        y1 = (i + 1) * ph if i < n - 1 else h
        c = tones[i % len(tones)]
        yy = np.linspace(0, 1, y1 - y0)[:, None]
        xx = np.linspace(0, 1, w)[None, :]
        grain = 0.035 * np.sin(yy * 26.0 + 1.5 * np.sin(xx * 6.0 + i)) + 0.015 * rng.normal(size=(y1 - y0, w))
        for ch in range(3):
            img[y0:y1, :, ch] = np.clip(c[ch] + grain, 0.04, 0.96)
        img[y0:y0 + 3, :, :3] = (0.12, 0.07, 0.04)
        img[y1 - 2:y1, :, :3] = (0.12, 0.07, 0.04)
        jx = int(((i * 191 + 75) % (w - 80)) + 40)
        img[y0:y1, jx:jx + 3, :3] = (0.12, 0.07, 0.04)
    return make_image_from_rgba(name, img)


def gen_clock_dial(name: str, hour_deg: float, min_deg: float):
    """Crisp circular clock face texture. 0 deg = 3 o'clock, -90 deg = 12 o'clock."""
    size = 384
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    cx = cy = size / 2.0
    dx = (xx - cx) / (size / 2.0)
    dy = (yy - cy) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)

    img = np.ones((size, size, 4), dtype=np.float32)
    img[:, :, 0] = 0.96
    img[:, :, 1] = 0.93
    img[:, :, 2] = 0.85

    img[(r > 0.88) & (r < 0.97), :3] = (0.14, 0.12, 0.11)
    for k in range(12):
        th = k * (2.0 * math.pi / 12.0)
        tx = dx * math.cos(th) + dy * math.sin(th)
        ty = -dx * math.sin(th) + dy * math.cos(th)
        thick = 0.036 if k % 3 == 0 else 0.020
        inner = 0.60 if k % 3 == 0 else 0.68
        img[(tx > inner) & (tx < 0.82) & (np.abs(ty) < thick), :3] = (0.11, 0.10, 0.10)

    for deg, length, width in [(hour_deg, 0.46, 0.034), (min_deg, 0.66, 0.022)]:
        rad = math.radians(deg)
        tx = dx * math.cos(rad) + dy * math.sin(rad)
        ty = -dx * math.sin(rad) + dy * math.cos(rad)
        img[(tx > -0.06) & (tx < length) & (np.abs(ty) < width), :3] = (0.08, 0.08, 0.09)

    img[r < 0.06, :3] = (0.10, 0.09, 0.09)
    return make_image_from_rgba(name, img)


def gen_night_sky():
    w, h = 256, 256
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = 0.05 + 0.07 * v
    img[:, :, 1] = 0.08 + 0.10 * v
    img[:, :, 2] = 0.19 + 0.16 * v
    # Crescent moon
    r_m = np.sqrt((u - 0.68) ** 2 + (v - 0.28) ** 2)
    r_c = np.sqrt((u - 0.72) ** 2 + (v - 0.25) ** 2)
    moon = (r_m < 0.11) & (r_c > 0.095)
    img[moon, :3] = (0.98, 0.94, 0.76)
    # Stars
    rng = np.random.default_rng(1939)
    for _ in range(40):
        sx, sy = int(rng.integers(8, w - 8)), int(rng.integers(8, h - 40))
        img[sy - 1:sy + 2, sx - 1:sx + 2, :3] = (0.96, 0.95, 0.86)
    return make_image_from_rgba("Tex_NightSky", img)


def gen_rug_texture(name, bg, border, accent):
    w, h = 256, 256
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    img = np.ones((h, w, 4), dtype=np.float32)
    for ch in range(3):
        img[:, :, ch] = bg[ch]
    b1 = (u < 0.10) | (u > 0.90) | (v < 0.10) | (v > 0.90)
    b2 = ((u > 0.13) & (u < 0.17)) | ((u > 0.83) & (u < 0.87)) | ((v > 0.13) & (v < 0.17)) | ((v > 0.83) & (v < 0.87))
    diamond = (np.abs(u - 0.5) + np.abs(v - 0.5)) < 0.18
    for ch in range(3):
        img[b1, ch] = border[ch]
        img[b2, ch] = accent[ch]
        img[diamond, ch] = accent[ch]
    return make_image_from_rgba(name, img)


def gen_plaster(name, rgb):
    w, h = 256, 256
    rng = np.random.default_rng(abs(hash(name)) % (2**31))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    n = 0.02 * np.sin(u * 14 + v * 9) + 0.012 * rng.normal(size=(h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    for ch in range(3):
        img[:, :, ch] = np.clip(rgb[ch] + n, 0.04, 0.96)
    return make_image_from_rgba(name, img)


MATS = {}


def make_mat(name, color, roughness=0.75, metallic=0.0, emission=None, emission_strength=0.0, image=None, uv_scale=1.0):
    if name in MATS:
        return MATS[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF") or nt.nodes.new("ShaderNodeBsdfPrincipled")
    if image is not None:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (uv_scale, uv_scale, uv_scale)
        tx = nt.nodes.new("ShaderNodeTexImage")
        tx.image = image
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], tx.inputs["Vector"])
        nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.22
    if emission is not None and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    MATS[name] = mat
    return mat


def init_materials():
    tex_floor_warm = gen_wood_planks("Tex_FloorWarm", [(0.52, 0.33, 0.18), (0.45, 0.27, 0.14), (0.56, 0.36, 0.20)])
    tex_floor_dark = gen_wood_planks("Tex_FloorDark", [(0.36, 0.22, 0.12), (0.31, 0.18, 0.10), (0.40, 0.25, 0.14)])
    tex_clock_02 = gen_clock_dial("Tex_Clock0200", -30, -90)   # 02:00 AM
    tex_clock_08 = gen_clock_dial("Tex_Clock0800", 150, -90)   # 08:00 AM
    tex_night = gen_night_sky()
    tex_rug_study = gen_rug_texture("Tex_RugStudy", (0.24, 0.33, 0.44), (0.15, 0.21, 0.30), (0.76, 0.62, 0.36))
    tex_rug_office = gen_rug_texture("Tex_RugOffice", (0.54, 0.16, 0.16), (0.34, 0.09, 0.10), (0.82, 0.66, 0.30))
    tex_rug_foyer = gen_rug_texture("Tex_RugFoyer", (0.64, 0.44, 0.24), (0.42, 0.26, 0.14), (0.88, 0.78, 0.56))
    tex_wall_study = gen_plaster("Tex_WallStudy", (0.64, 0.58, 0.44))
    tex_wall_office = gen_plaster("Tex_WallOffice", (0.83, 0.76, 0.61))
    tex_wall_foyer = gen_plaster("Tex_WallFoyer", (0.90, 0.83, 0.68))

    make_mat("Floor_Warm", (0.50, 0.32, 0.18), roughness=0.68, image=tex_floor_warm, uv_scale=2.8)
    make_mat("Floor_Dark", (0.35, 0.21, 0.11), roughness=0.70, image=tex_floor_dark, uv_scale=2.8)
    make_mat("Wall_Study", (0.64, 0.58, 0.44), roughness=0.88, image=tex_wall_study, uv_scale=2.0)
    make_mat("Wall_Office", (0.83, 0.76, 0.61), roughness=0.86, image=tex_wall_office, uv_scale=2.0)
    make_mat("Wall_Foyer", (0.90, 0.83, 0.68), roughness=0.84, image=tex_wall_foyer, uv_scale=2.0)
    make_mat("Ceiling_Cream", (0.86, 0.82, 0.72), roughness=0.90)

    make_mat("Wood_Walnut", (0.34, 0.19, 0.10), roughness=0.68)
    make_mat("Wood_Mahogany", (0.28, 0.13, 0.08), roughness=0.62)
    make_mat("Wood_Oak", (0.50, 0.32, 0.17), roughness=0.66)
    make_mat("Wood_Trim", (0.44, 0.26, 0.14), roughness=0.65)
    make_mat("Wood_Cream", (0.92, 0.88, 0.79), roughness=0.70)
    make_mat("Leather_Brown", (0.36, 0.18, 0.10), roughness=0.52)

    make_mat("Brass_Gold", (0.82, 0.64, 0.24), roughness=0.35, metallic=0.65)
    make_mat("Iron_Dark", (0.14, 0.14, 0.16), roughness=0.45, metallic=0.60)
    make_mat("Lamp_Green", (0.10, 0.52, 0.24), roughness=0.25, emission=(0.14, 0.65, 0.30), emission_strength=0.45)
    make_mat("Bulb_Glow", (1.0, 0.90, 0.64), roughness=0.2, emission=(1.0, 0.88, 0.55), emission_strength=2.8)
    make_mat("DayWindow_Glow", (0.88, 0.94, 1.0), roughness=0.2, emission=(0.85, 0.92, 1.0), emission_strength=1.1)
    make_mat("Morning_Glow", (1.0, 0.88, 0.66), roughness=0.3, emission=(1.0, 0.86, 0.60), emission_strength=0.95)
    make_mat("Night_Sky", (0.08, 0.12, 0.24), roughness=0.9, emission=(0.12, 0.16, 0.30), emission_strength=0.4, image=tex_night)

    make_mat("Paper_White", (0.96, 0.94, 0.89), roughness=0.86)
    make_mat("Paper_Cream", (0.91, 0.86, 0.75), roughness=0.88)
    make_mat("Folder_Red", (0.76, 0.22, 0.18), roughness=0.75)
    make_mat("Folder_Blue", (0.20, 0.36, 0.62), roughness=0.75)
    make_mat("Folder_Green", (0.20, 0.48, 0.28), roughness=0.75)
    make_mat("Folder_Yellow", (0.84, 0.64, 0.18), roughness=0.75)
    make_mat("Curtain_Teal", (0.18, 0.32, 0.38), roughness=0.90)
    make_mat("Quilt_Navy", (0.22, 0.30, 0.48), roughness=0.90)
    make_mat("Pillow_White", (0.95, 0.93, 0.88), roughness=0.88)
    make_mat("Globe_Blue", (0.26, 0.54, 0.72), roughness=0.55)
    make_mat("Grass_Porch", (0.24, 0.54, 0.20), roughness=0.90)
    make_mat("Flower_Pink", (0.90, 0.42, 0.50), roughness=0.80)

    make_mat("Rug_Study", (0.3, 0.4, 0.5), roughness=0.92, image=tex_rug_study)
    make_mat("Rug_Office", (0.5, 0.2, 0.2), roughness=0.92, image=tex_rug_office)
    make_mat("Rug_Foyer", (0.6, 0.4, 0.2), roughness=0.92, image=tex_rug_foyer)
    make_mat("Clock_0200", (0.95, 0.92, 0.85), roughness=0.6, image=tex_clock_02)
    make_mat("Clock_0800", (0.95, 0.92, 0.85), roughness=0.6, image=tex_clock_08)


def ensure_col(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def link_obj(obj, col_name):
    ensure_col(col_name).objects.link(obj)
    return obj


def set_box_uv(bm, scale=0.4):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in f.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                loop[uv].uv = (co.x * scale, co.y * scale)
            elif ax >= ay and ax >= az:
                loop[uv].uv = (co.y * scale, co.z * scale)
            else:
                loop[uv].uv = (co.x * scale, co.z * scale)


def add_box(name, center, size, mat, col, rot=(0, 0, 0), bevel=0.0, uv_scale=0.4):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect="EDGES", clamp_overlap=True)
    set_box_uv(bm, uv_scale)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(center)
    o.rotation_euler = Euler(rot, "XYZ")
    o.data.materials.append(MATS[mat])
    return link_obj(o, col)


def add_cyl(name, center, r1, r2, h, segs, mat, col, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h)
    set_box_uv(bm, 0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(center)
    o.rotation_euler = Euler(rot, "XYZ")
    o.data.materials.append(MATS[mat])
    return link_obj(o, col)


def add_ico(name, center, r, sub, mat, col, jitter=0.0, seed=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    if jitter > 0:
        rng = random.Random(seed)
        for v in bm.verts:
            v.co *= 1.0 + rng.uniform(-jitter, jitter)
    set_box_uv(bm, 0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(center)
    o.data.materials.append(MATS[mat])
    return link_obj(o, col)


def add_quad(name, center, w, h, normal, mat, col):
    bm = bmesh.new()
    hw, hh = w / 2, h / 2
    if normal == "-Y":
        vs = [bm.verts.new((-hw, 0, -hh)), bm.verts.new((hw, 0, -hh)), bm.verts.new((hw, 0, hh)), bm.verts.new((-hw, 0, hh))]
    elif normal == "+X":
        vs = [bm.verts.new((0, -hw, -hh)), bm.verts.new((0, hw, -hh)), bm.verts.new((0, hw, hh)), bm.verts.new((0, -hw, hh))]
    else:  # +Z
        vs = [bm.verts.new((-hw, -hh, 0)), bm.verts.new((hw, -hh, 0)), bm.verts.new((hw, hh, 0)), bm.verts.new((-hw, hh, 0))]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.verify()
    for lp, p in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        lp[uv].uv = p
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(center)
    o.data.materials.append(MATS[mat])
    return link_obj(o, col)


def add_wall_clock(name, pos, radius, mat_dial, col):
    # Faces -Y (South -> +Z in Three.js)
    add_cyl(f"{name}_Rim", pos, radius * 1.12, radius * 1.12, 0.08, 28, "Wood_Walnut", col, rot=(math.pi / 2, 0, 0))
    bm = bmesh.new()
    segs = 28
    vs = [bm.verts.new((radius * math.cos(2 * math.pi * i / segs), radius * math.sin(2 * math.pi * i / segs), 0.048)) for i in range(segs)]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.verify()
    for i, lp in enumerate(f.loops):
        a = 2 * math.pi * i / segs
        lp[uv].uv = (0.5 + 0.49 * math.cos(a), 0.5 + 0.49 * math.sin(a))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(pos)
    o.rotation_euler = Euler((math.pi / 2, 0, 0), "XYZ")
    o.data.materials.append(MATS[mat_dial])
    return link_obj(o, col)


def add_bookshelf(prefix, cx, cy, z0, w, h, d, col, seed=1):
    rng = random.Random(seed)
    add_box(f"{prefix}_Back", (cx, cy + d / 2 - 0.03, z0 + h / 2), (w, 0.05, h), "Wood_Mahogany", col)
    add_box(f"{prefix}_Left", (cx - w / 2 + 0.04, cy, z0 + h / 2), (0.08, d, h), "Wood_Walnut", col, bevel=0.01)
    add_box(f"{prefix}_Right", (cx + w / 2 - 0.04, cy, z0 + h / 2), (0.08, d, h), "Wood_Walnut", col, bevel=0.01)
    book_mats = ["Folder_Red", "Folder_Blue", "Folder_Green", "Folder_Yellow", "Wood_Oak", "Leather_Brown"]
    n_shelves = 5
    for s in range(n_shelves + 1):
        sz = z0 + 0.12 + s * ((h - 0.22) / n_shelves)
        add_box(f"{prefix}_Sh{s}", (cx, cy, sz), (w, d, 0.05), "Wood_Trim", col, bevel=0.008)
        if s < n_shelves:
            bx = cx - w / 2 + 0.14
            bidx = 0
            while bx < cx + w / 2 - 0.16:
                bw = rng.uniform(0.06, 0.11)
                bh = rng.uniform(0.24, 0.34)
                bd = rng.uniform(0.20, 0.27)
                m = rng.choice(book_mats)
                add_box(f"{prefix}_B{s}_{bidx}", (bx + bw / 2, cy - 0.02, sz + 0.025 + bh / 2), (bw, bd, bh), m, col, bevel=0.005)
                bx += bw + 0.012
                bidx += 1


def add_boolean_cut(target_obj, cutter_objs):
    for c in cutter_objs:
        mod = target_obj.modifiers.new(name="BoolCut", type="BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.object = c
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = target_obj.evaluated_get(dg)
    nm = bpy.data.meshes.new_from_object(ev)
    om = target_obj.data
    target_obj.modifiers.clear()
    target_obj.data = nm
    bpy.data.meshes.remove(om)
    for c in cutter_objs:
        bpy.data.objects.remove(c, do_unlink=True)


# ---------------------------------------------------------------------------
# SET 1: Kamar Belajar Malam George & Anne (X = 0)
# ---------------------------------------------------------------------------
def build_study_room(ox=0.0):
    col = "Set1_StudyRoom"
    # Floor + Rug
    add_quad("Study_Floor", (ox, 0, 0.01), 7.6, 7.2, "+Z", "Floor_Dark", col)
    add_quad("Study_Rug", (ox, 0.5, 0.025), 4.2, 3.2, "+Z", "Rug_Study", col)
    # Walls + Ceiling
    add_box("Study_NorthWall", (ox, 3.55, 1.8), (7.6, 0.14, 3.6), "Wall_Study", col)
    add_box("Study_WestWall", (ox - 3.75, 0, 1.8), (0.14, 7.2, 3.6), "Wall_Study", col)
    add_box("Study_EastWall", (ox + 3.75, 0, 1.8), (0.14, 7.2, 3.6), "Wall_Study", col)
    add_box("Study_Ceiling", (ox, 0, 3.65), (7.8, 7.4, 0.14), "Ceiling_Cream", col)
    # Wainscoting North/West/East
    add_box("Study_WainN", (ox, 3.46, 0.55), (7.5, 0.06, 1.10), "Wood_Walnut", col, bevel=0.01)
    add_box("Study_WainNRail", (ox, 3.43, 1.12), (7.5, 0.11, 0.08), "Wood_Trim", col, bevel=0.01)
    add_box("Study_WainW", (ox - 3.66, 0, 0.55), (0.06, 7.1, 1.10), "Wood_Walnut", col)
    add_box("Study_WainE", (ox + 3.66, 0, 0.55), (0.06, 7.1, 1.10), "Wood_Walnut", col)

    # Night Window with Starry Sky + Moon + Curtains (North Wall)
    add_quad("Study_NightSky", (ox - 0.1, 3.45, 2.20), 1.85, 1.65, "-Y", "Night_Sky", col)
    add_box("Study_WinTop", (ox - 0.1, 3.42, 3.06), (2.05, 0.12, 0.10), "Wood_Cream", col, bevel=0.01)
    add_box("Study_WinBot", (ox - 0.1, 3.39, 1.35), (2.15, 0.18, 0.10), "Wood_Cream", col, bevel=0.01)
    add_box("Study_WinL", (ox - 1.06, 3.42, 2.20), (0.10, 0.12, 1.75), "Wood_Cream", col, bevel=0.01)
    add_box("Study_WinR", (ox + 0.86, 3.42, 2.20), (0.10, 0.12, 1.75), "Wood_Cream", col, bevel=0.01)
    add_box("Study_WinMulV", (ox - 0.1, 3.42, 2.20), (0.05, 0.06, 1.65), "Wood_Cream", col)
    add_box("Study_WinMulH", (ox - 0.1, 3.42, 2.20), (1.85, 0.06, 0.05), "Wood_Cream", col)
    # Curtains
    add_box("Study_CurtL", (ox - 1.24, 3.34, 2.15), (0.36, 0.14, 1.95), "Curtain_Teal", col, bevel=0.03)
    add_box("Study_CurtR", (ox + 1.04, 3.34, 2.15), (0.36, 0.14, 1.95), "Curtain_Teal", col, bevel=0.03)

    # Wall Clock showing 02:00 AM!
    add_wall_clock("Study_Clock0200", (ox + 1.85, 3.44, 2.52), 0.34, "Clock_0200", col)

    # Tall Bookshelf on Left-North corner
    add_bookshelf("Study_Shelf", ox - 2.55, 3.15, 0.0, 1.55, 2.55, 0.42, col, seed=11)

    # Cozy 1939 Bed on East side background
    add_box("Study_BedFrame", (ox + 2.65, 1.6, 0.32), (1.65, 2.2, 0.42), "Wood_Walnut", col, bevel=0.02)
    add_box("Study_BedHead", (ox + 3.40, 1.6, 0.78), (0.12, 2.2, 1.10), "Wood_Walnut", col, bevel=0.02)
    add_box("Study_BedQuilt", (ox + 2.62, 1.6, 0.58), (1.58, 2.10, 0.24), "Quilt_Navy", col, bevel=0.04)
    add_box("Study_Pillow", (ox + 3.12, 1.6, 0.74), (0.44, 0.86, 0.16), "Pillow_White", col, bevel=0.05)

    # Hero Study Desk (center)
    dx, dy = ox - 0.05, 2.15
    add_box("Study_DeskTop", (dx, dy, 0.78), (2.25, 1.05, 0.08), "Wood_Oak", col, bevel=0.018)
    add_box("Study_DeskDrawerL", (dx - 0.78, dy, 0.39), (0.58, 0.92, 0.74), "Wood_Walnut", col, bevel=0.015)
    add_box("Study_DeskDrawerR", (dx + 0.78, dy, 0.39), (0.58, 0.92, 0.74), "Wood_Walnut", col, bevel=0.015)
    for sx in (-0.78, 0.78):
        for dz in (0.25, 0.52):
            add_box(f"Study_Handle_{sx}_{dz}", (dx + sx, dy - 0.48, dz), (0.16, 0.04, 0.03), "Brass_Gold", col)
    # Study Chair
    add_box("Study_ChairSeat", (dx, dy - 0.72, 0.46), (0.54, 0.50, 0.06), "Wood_Oak", col, bevel=0.012)
    add_box("Study_ChairBack", (dx, dy - 0.95, 0.80), (0.54, 0.06, 0.56), "Wood_Oak", col, bevel=0.012)
    for lx in (-0.22, 0.22):
        for ly in (-0.20, 0.20):
            add_box(f"Study_CLeg_{lx}_{ly}", (dx + lx, dy - 0.72 + ly, 0.23), (0.05, 0.05, 0.46), "Wood_Walnut", col)

    # Iconic Green Banker's Lamp on Desk (Left side)
    lx, ly = dx - 0.78, dy + 0.24
    add_cyl("BankerLamp_Base", (lx, ly, 0.84), 0.13, 0.11, 0.04, 16, "Brass_Gold", col)
    add_cyl("BankerLamp_Stem", (lx, ly, 1.04), 0.022, 0.022, 0.38, 10, "Brass_Gold", col)
    add_box("BankerLamp_Shade", (lx + 0.05, ly - 0.04, 1.24), (0.34, 0.18, 0.13), "Lamp_Green", col, rot=(0.22, 0, -0.25), bevel=0.03)
    add_ico("BankerLamp_Bulb", (lx + 0.05, ly - 0.04, 1.18), 0.055, 2, "Bulb_Glow", col)

    # Desktop books, scratchpads & pen cup
    add_box("Study_Book1", (dx + 0.72, dy + 0.24, 0.855), (0.34, 0.26, 0.07), "Folder_Red", col, rot=(0, 0, 0.15), bevel=0.008)
    add_box("Study_Book2", (dx + 0.74, dy + 0.22, 0.915), (0.30, 0.24, 0.05), "Folder_Blue", col, rot=(0, 0, -0.08), bevel=0.008)
    add_box("Study_DeskPaper1", (dx - 0.08, dy - 0.08, 0.825), (0.42, 0.32, 0.015), "Paper_White", col, rot=(0, 0, 0.05))
    add_box("Study_DeskPaper2", (dx + 0.22, dy - 0.12, 0.828), (0.36, 0.28, 0.015), "Paper_Cream", col, rot=(0, 0, -0.18))
    add_cyl("Study_PenCup", (dx + 0.44, dy + 0.28, 0.89), 0.05, 0.055, 0.14, 10, "Wood_Mahogany", col)

    # Wooden Wastebasket + Scattered Crumpled Paper Balls on Floor!
    add_cyl("Study_Trash", (dx + 1.32, dy - 0.25, 0.22), 0.16, 0.22, 0.42, 12, "Wood_Walnut", col)
    wad_spots = [
        (dx + 1.26, dy - 0.25, 0.44), (dx + 1.38, dy - 0.18, 0.43),
        (dx + 1.05, dy - 0.65, 0.06), (dx + 1.48, dy - 0.55, 0.055),
        (dx - 0.85, dy - 0.85, 0.06), (dx - 1.25, dy - 0.45, 0.055),
        (dx + 0.65, dy - 1.05, 0.055), (dx - 0.35, dy - 1.15, 0.05),
        (dx + 1.18, dy - 0.92, 0.06), (dx - 1.05, dy - 1.12, 0.055),
    ]
    for i, (wx, wy, wz) in enumerate(wad_spots):
        add_ico(f"PaperWad_{i}", (wx, wy, wz), 0.065, 1, "Paper_White", col, jitter=0.28, seed=100 + i)


# ---------------------------------------------------------------------------
# SET 2: Ruang Kerja Prof. Jerzy Neyman (X = 24.0)
# ---------------------------------------------------------------------------
def build_professor_office(ox=24.0):
    col = "Set2_ProfOffice"
    add_quad("Office_Floor", (ox, 0, 0.01), 8.0, 7.2, "+Z", "Floor_Warm", col)
    add_quad("Office_Rug", (ox, 0.6, 0.025), 4.8, 3.6, "+Z", "Rug_Office", col)
    add_box("Office_NorthWall", (ox, 3.55, 1.9), (8.0, 0.14, 3.8), "Wall_Office", col)
    add_box("Office_WestWall", (ox - 3.95, 0, 1.9), (0.14, 7.2, 3.8), "Wall_Office", col)
    add_box("Office_EastWall", (ox + 3.95, 0, 1.9), (0.14, 7.2, 3.8), "Wall_Office", col)
    add_box("Office_Ceiling", (ox, 0, 3.85), (8.2, 7.4, 0.14), "Ceiling_Cream", col)
    add_box("Office_WainN", (ox, 3.46, 0.62), (7.9, 0.07, 1.24), "Wood_Mahogany", col)
    add_box("Office_WainNRail", (ox, 3.42, 1.26), (7.9, 0.12, 0.09), "Wood_Trim", col, bevel=0.015)

    # Tall Bright Daytime Window Center-North
    add_quad("Office_DayWin", (ox, 3.45, 2.30), 2.1, 1.95, "-Y", "DayWindow_Glow", col)
    add_box("Office_WinTop", (ox, 3.41, 3.30), (2.30, 0.14, 0.11), "Wood_Cream", col, bevel=0.015)
    add_box("Office_WinBot", (ox, 3.38, 1.32), (2.38, 0.20, 0.11), "Wood_Cream", col, bevel=0.015)
    add_box("Office_WinL", (ox - 1.10, 3.41, 2.30), (0.11, 0.14, 2.02), "Wood_Cream", col, bevel=0.015)
    add_box("Office_WinR", (ox + 1.10, 3.41, 2.30), (0.11, 0.14, 2.02), "Wood_Cream", col, bevel=0.015)
    add_box("Office_WinMulV", (ox, 3.41, 2.30), (0.055, 0.07, 1.95), "Wood_Cream", col)
    add_box("Office_WinMulH", (ox, 3.41, 2.30), (2.10, 0.07, 0.055), "Wood_Cream", col)

    # Twin Floor-to-Ceiling Library Bookcases!
    add_bookshelf("Office_ShelfL", ox - 2.45, 3.16, 0.0, 1.90, 3.25, 0.44, col, seed=21)
    add_bookshelf("Office_ShelfR", ox + 2.45, 3.16, 0.0, 1.90, 3.25, 0.44, col, seed=37)

    # Executive Professor Desk (center)
    dx, dy = ox, 1.35
    add_box("Office_DeskTop", (dx, dy, 0.80), (2.60, 1.18, 0.09), "Wood_Mahogany", col, bevel=0.02)
    add_box("Office_DeskFront", (dx, dy - 0.50, 0.40), (2.42, 0.08, 0.74), "Wood_Walnut", col, bevel=0.015)
    add_box("Office_DeskSideL", (dx - 0.92, dy, 0.40), (0.64, 1.04, 0.74), "Wood_Mahogany", col, bevel=0.015)
    add_box("Office_DeskSideR", (dx + 0.92, dy, 0.40), (0.64, 1.04, 0.74), "Wood_Mahogany", col, bevel=0.015)

    # High-backed Leather Professor Chair behind desk
    add_box("Office_ChairSeat", (dx, dy + 0.84, 0.48), (0.66, 0.58, 0.10), "Leather_Brown", col, bevel=0.03)
    add_box("Office_ChairBack", (dx, dy + 1.12, 0.98), (0.64, 0.12, 0.96), "Leather_Brown", col, bevel=0.04)

    # FAMOUS CLUTTERED PAPER MOUNTAINS ON PROF. NEYMAN'S DESK!
    stack_specs = [
        (dx - 0.88, dy - 0.05, 8, 0.34, 0.26, "Paper_White"),
        (dx - 0.52, dy + 0.18, 12, 0.36, 0.28, "Paper_Cream"),
        (dx + 0.58, dy - 0.08, 14, 0.38, 0.28, "Paper_White"),   # Tallest hero mountain!
        (dx + 0.94, dy + 0.16, 9, 0.34, 0.26, "Paper_Cream"),
        (dx + 0.22, dy + 0.26, 6, 0.32, 0.24, "Paper_White"),
    ]
    rng = random.Random(1939)
    for s_idx, (sx, sy, count, sw, sd, pmat) in enumerate(stack_specs):
        z = 0.855
        for k in range(count):
            mat = "Folder_Yellow" if k % 5 == 4 else ("Folder_Red" if k % 7 == 6 else pmat)
            rot_z = rng.uniform(-0.22, 0.22)
            ox_j = rng.uniform(-0.025, 0.025)
            oy_j = rng.uniform(-0.025, 0.025)
            add_box(f"Office_Stack_{s_idx}_{k}", (sx + ox_j, sy + oy_j, z), (sw, sd, 0.024), mat, col, rot=(0, 0, rot_z))
            z += 0.025

    # Vintage Brass Globe on Left Corner of Desk
    gx, gy = dx - 1.05, dy + 0.34
    add_cyl("Globe_Base", (gx, gy, 0.87), 0.11, 0.08, 0.05, 12, "Brass_Gold", col)
    add_cyl("Globe_Stem", (gx, gy, 0.95), 0.02, 0.02, 0.14, 8, "Brass_Gold", col)
    add_ico("Globe_Sphere", (gx, gy, 1.12), 0.17, 2, "Globe_Blue", col)

    # Filing cabinet on East side
    add_box("Office_Cabinet", (ox + 3.25, 0.8, 0.72), (0.68, 0.74, 1.44), "Wood_Walnut", col, bevel=0.02)
    for dz in (0.35, 0.72, 1.08):
        add_box(f"Office_CabPull_{dz}", (ox + 2.90, 0.8, dz), (0.04, 0.18, 0.04), "Brass_Gold", col)


# ---------------------------------------------------------------------------
# SET 3: Ruang Tamu & Pintu Depan Minggu Pagi 08:00 (X = 48.0)
# ---------------------------------------------------------------------------
def build_front_door_foyer(ox=48.0):
    col = "Set3_SundayDoor"
    # Interior Floor + Rug
    add_quad("Foyer_Floor", (ox, -0.2, 0.01), 7.6, 6.4, "+Z", "Floor_Warm", col)
    add_quad("Foyer_Rug", (ox, 0.5, 0.025), 3.2, 3.6, "+Z", "Rug_Foyer", col)
    # Interior Side Walls & Ceiling
    add_box("Foyer_WestWall", (ox - 3.75, -0.2, 1.8), (0.14, 6.4, 3.6), "Wall_Foyer", col)
    add_box("Foyer_EastWall", (ox + 3.75, -0.2, 1.8), (0.14, 6.4, 3.6), "Wall_Foyer", col)
    add_box("Foyer_Ceiling", (ox, -0.2, 3.65), (7.8, 6.6, 0.14), "Ceiling_Cream", col)

    # North Wall with REAL Boolean Doorway at X = ox, Y = 2.85, Z = 0..2.38!
    n_wall = add_box("Foyer_NorthWall", (ox, 2.85, 1.80), (7.6, 0.24, 3.60), "Wall_Foyer", col)
    door_cut = add_box("_Cut_FrontDoor", (ox, 2.85, 1.19), (1.30, 0.90, 2.38), "Wall_Foyer", col)
    add_boolean_cut(n_wall, [door_cut])

    # Door Frame trim around opening
    add_box("Foyer_DoorFrameTop", (ox, 2.82, 2.44), (1.50, 0.30, 0.12), "Wood_Trim", col, bevel=0.015)
    add_box("Foyer_DoorFrameL", (ox - 0.70, 2.82, 1.22), (0.12, 0.30, 2.44), "Wood_Trim", col, bevel=0.015)
    add_box("Foyer_DoorFrameR", (ox + 0.70, 2.82, 1.22), (0.12, 0.30, 2.44), "Wood_Trim", col, bevel=0.015)

    # HINGED 3D FRONT DOOR (parented to Empty pivot at left hinge X = ox - 0.64, Y = 2.85, Z = 0!)
    pivot = bpy.data.objects.new("FrontDoor_Pivot", None)
    pivot.location = Vector((ox - 0.64, 2.85, 0.0))
    link_obj(pivot, col)

    door_leaf = add_box("FrontDoor_Leaf", (0.64, 0.0, 1.18), (1.26, 0.09, 2.34), "Wood_Walnut", col, bevel=0.015)
    door_panel1 = add_box("FrontDoor_PanelLow", (0.64, -0.04, 0.62), (0.86, 0.04, 0.82), "Wood_Mahogany", col, bevel=0.01)
    door_panel2 = add_box("FrontDoor_PanelTop", (0.64, -0.04, 1.66), (0.86, 0.04, 0.74), "Morning_Glow", col, bevel=0.01)
    door_knob_in = add_ico("FrontDoor_KnobIn", (1.12, -0.09, 1.05), 0.055, 2, "Brass_Gold", col)
    door_knob_out = add_ico("FrontDoor_KnobOut", (1.12, 0.09, 1.05), 0.055, 2, "Brass_Gold", col)
    for part in (door_leaf, door_panel1, door_panel2, door_knob_in, door_knob_out):
        part.parent = pivot

    # Wall Clock showing 08:00 AM right beside the front door!
    add_wall_clock("Foyer_Clock0800", (ox - 1.55, 2.71, 2.32), 0.36, "Clock_0800", col)

    # Wooden Coat Rack (left of door)
    rx, ry = ox - 2.35, 2.25
    add_cyl("CoatRack_Base", (rx, ry, 0.05), 0.28, 0.16, 0.10, 10, "Wood_Mahogany", col)
    add_cyl("CoatRack_Pole", (rx, ry, 0.95), 0.045, 0.035, 1.85, 10, "Wood_Walnut", col)
    for ang in (0, 1.57, 3.14, 4.71):
        add_cyl(f"CoatRack_Hook_{ang}", (rx + 0.12 * math.cos(ang), ry + 0.12 * math.sin(ang), 1.72), 0.018, 0.018, 0.22, 6, "Brass_Gold", col, rot=(0.6 * math.sin(ang), 0.6 * math.cos(ang), 0))

    # Console Table + Flower Vase (right of door)
    tx, ty = ox + 1.85, 2.35
    add_box("Foyer_ConsoleTop", (tx, ty, 0.82), (1.28, 0.48, 0.06), "Wood_Oak", col, bevel=0.015)
    for lx in (-0.54, 0.54):
        for ly in (-0.18, 0.18):
            add_box(f"Foyer_ConLeg_{lx}_{ly}", (tx + lx, ty + ly, 0.41), (0.06, 0.06, 0.80), "Wood_Walnut", col)
    add_cyl("Foyer_Vase", (tx + 0.22, ty, 0.98), 0.08, 0.06, 0.26, 12, "Folder_Blue", col)
    add_ico("Foyer_Flower1", (tx + 0.22, ty, 1.18), 0.11, 2, "Flower_Pink", col, jitter=0.18, seed=7)
    add_ico("Foyer_Flower2", (tx + 0.30, ty - 0.05, 1.14), 0.08, 2, "Folder_Yellow", col, jitter=0.15, seed=8)

    # Sunny Sunday Morning Exterior Porch right outside doorway (Y = 2.95 .. 6.2)!
    add_box("Porch_Deck", (ox, 4.35, -0.06), (6.4, 2.9, 0.14), "Wood_Oak", col, bevel=0.02)
    add_box("Porch_RailBack", (ox, 5.72, 0.88), (6.4, 0.10, 0.10), "Wood_Cream", col)
    for px in (-2.8, -1.6, 1.6, 2.8):
        add_box(f"Porch_Post_{px}", (ox + px, 5.72, 1.45), (0.14, 0.14, 2.90), "Wood_Cream", col, bevel=0.015)
    add_box("Porch_Roof", (ox, 4.45, 2.95), (6.8, 3.2, 0.18), "Wood_Cream", col)
    # Lush sunlit yard bushes & glowing morning horizon backdrop behind porch
    add_box("Porch_YardGrass", (ox, 8.2, -0.25), (14.0, 6.0, 0.2), "Grass_Porch", col)
    for idx, (bx, by) in enumerate([(-2.2, 6.5), (2.3, 6.6), (0.0, 7.2)]):
        add_ico(f"Porch_Bush_{idx}", (ox + bx, by, 0.65), 0.95, 2, "Grass_Porch", col, jitter=0.14, seed=50 + idx)
    add_quad("Porch_MorningSky", (ox, 10.5, 3.2), 16.0, 9.0, "-Y", "Morning_Glow", col)


def main():
    clear_scene()
    init_materials()
    build_study_room(0.0)
    build_professor_office(24.0)
    build_front_door_foyer(48.0)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from blender_opt import join_static_by_material
    join_static_by_material(exclude_prefixes=("FrontDoor",))

    n_mesh = len([o for o in bpy.data.objects if o.type == "MESH"])
    print(f"[build_dantzig_rooms_glb] Built {n_mesh} meshes across 3 sets.")
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_apply=True,
    )
    print(f"[build_dantzig_rooms_glb] Exported -> {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
