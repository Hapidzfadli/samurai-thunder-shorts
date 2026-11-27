"""
Headless Blender 4.x HQ script for Zhuge Liang: Strategi Kota Kosong (Xicheng Fortress).
Builds a rich, beveled, smooth-shaded ancient Chinese stone fortress city with:
  - Massive beveled stone fortress wall (X = -26..+26, Z = 0 in Three.js) with crenellated battlements & corner watchtowers
  - Real open stone archway tunnel (X = -2.4..+2.4, H = 4.3m) with animated Gate_Left & Gate_Right pivoted at hinges
  - Two-tier ornate wooden Gate Tower atop the wall (Y = 5.2m) with glowing red silk lanterns, carved balustrade,
    Guqin table + 7-string Guqin zither + bronze incense burner, and animated Banner_Shu_L / Banner_Shu_R
  - Interior Xicheng Stone Street (Three.js Z = -2..-24) lined with traditional timber houses, warm lanterns,
    stone wall stairs, and the Xicheng Command Hall (Z = -18..-23)
  - Exterior Dusty Wei Approach Plain (Three.js Z = +2..+48) with layered pine trees, rocks, and distant mountain ridges
  - 6 packed procedural 1024x1024 PBR textures + soft contact-shadow decals + material-batched static geometry

Usage:
    blender --background --python scripts/build_zhuge_glb.py -- public/models/zhuge_xicheng_hq.glb
"""

import math
import os
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Euler

argv = sys.argv
custom_args = argv[argv.index("--") + 1:] if "--" in argv else []
OUT_PATH = custom_args[0] if custom_args else os.path.abspath("public/models/zhuge_xicheng_hq.glb")
os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_image(name: str, rgba: np.ndarray):
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True)
    img.pixels.foreach_set(np.flipud(rgba).ravel().astype(np.float32))
    img.pack()
    return img


# ==================== 1024x1024 PROCEDURAL TEXTURES ====================

def gen_stone_wall():
    w, h = 1024, 1024
    rng = np.random.default_rng(228)
    img = np.ones((h, w, 4), dtype=np.float32)
    rows, cols = 16, 8
    rh, cw = h // rows, w // cols
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    grain = rng.normal(0, 0.025, (h, w)) + 0.02 * np.sin(xx * 0.04) * np.cos(yy * 0.06)
    for r in range(rows):
        off = (cw // 2) if (r % 2) else 0
        for c in range(-1, cols + 1):
            x0 = max(0, c * cw + off)
            x1 = min(w, (c + 1) * cw + off)
            y0, y1 = r * rh, (r + 1) * rh
            if x1 <= x0:
                continue
            tone = float(rng.uniform(0.36, 0.50))
            warm = float(rng.uniform(-0.025, 0.03))
            img[y0:y1, x0:x1, 0] = tone + warm
            img[y0:y1, x0:x1, 1] = tone + warm * 0.5
            img[y0:y1, x0:x1, 2] = tone - 0.02
            # Dark mortar seams
            img[y0:min(h, y0 + 4), x0:x1, :3] *= 0.48
            img[y0:y1, x0:min(w, x0 + 4), :3] *= 0.50
    # Add stone grain and subtle moss near bottom
    for ch in range(3):
        img[:, :, ch] = np.clip(img[:, :, ch] + grain, 0.14, 0.72)
    moss = np.clip((yy / h - 0.72) * 3.5, 0, 1) * np.clip(0.5 + 0.5 * np.sin(xx * 0.035 + yy * 0.02), 0, 1)
    img[:, :, 0] = np.clip(img[:, :, 0] * (1 - moss * 0.25), 0.1, 0.8)
    img[:, :, 1] = np.clip(img[:, :, 1] * (1 + moss * 0.12), 0.1, 0.8)
    img[:, :, 2] = np.clip(img[:, :, 2] * (1 - moss * 0.30), 0.1, 0.8)
    return make_image("zhuge_stone_wall", img)


def gen_cobble_road():
    w, h = 1024, 1024
    rng = np.random.default_rng(301)
    img = np.ones((h, w, 4), dtype=np.float32)
    rows, cols = 12, 12
    rh, cw = h // rows, w // cols
    for r in range(rows):
        off = (cw // 2) if (r % 2) else 0
        for c in range(-1, cols + 1):
            x0, x1 = max(0, c * cw + off), min(w, (c + 1) * cw + off)
            y0, y1 = r * rh, (r + 1) * rh
            if x1 <= x0:
                continue
            t = float(rng.uniform(0.45, 0.57))
            img[y0:y1, x0:x1, 0] = t + 0.04
            img[y0:y1, x0:x1, 1] = t + 0.01
            img[y0:y1, x0:x1, 2] = t - 0.04
            img[y0:min(h, y0 + 5), x0:x1, :3] = (0.28, 0.24, 0.19)
            img[y0:y1, x0:min(w, x0 + 5), :3] = (0.28, 0.24, 0.19)
    n = rng.normal(0, 0.022, (h, w))
    for ch in range(3):
        img[:, :, ch] = np.clip(img[:, :, ch] + n, 0.15, 0.82)
    return make_image("zhuge_cobble_road", img)


def gen_dust_ground():
    w, h = 1024, 1024
    rng = np.random.default_rng(409)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    drift = 0.035 * np.sin(xx * 0.012 + yy * 0.008) + 0.02 * np.cos(yy * 0.025)
    n = rng.normal(0, 0.026, (h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.56 + drift + n, 0.30, 0.78)
    img[:, :, 1] = np.clip(0.46 + drift * 0.85 + n, 0.24, 0.68)
    img[:, :, 2] = np.clip(0.32 + drift * 0.7 + n, 0.16, 0.52)
    # Subtle wagon wheel tracks running along Y
    for cx in [380, 640]:
        rut = np.exp(-((xx - cx) ** 2) / (2 * 22.0 ** 2))
        img[:, :, :3] *= (1.0 - 0.16 * rut[:, :, None])
    return make_image("zhuge_dust_ground", img)


def gen_roof_tile():
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(512)
    rib = 0.5 + 0.5 * np.sin(xx * (2 * math.pi * 24 / w))
    tier = ((yy % 64) / 64.0)
    shade = 0.22 + 0.11 * rib - 0.06 * (tier < 0.12).astype(np.float32) + rng.normal(0, 0.014, (h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(shade * 0.94, 0.08, 0.48)
    img[:, :, 1] = np.clip(shade * 0.98, 0.09, 0.50)
    img[:, :, 2] = np.clip(shade * 1.08, 0.10, 0.55)
    return make_image("zhuge_roof_tile", img)


def gen_wood_red():
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(615)
    grain = 0.03 * np.sin(xx * 0.18 + 3.0 * np.sin(yy * 0.015)) + rng.normal(0, 0.012, (h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.42 + grain, 0.20, 0.60)
    img[:, :, 1] = np.clip(0.14 + grain * 0.5, 0.06, 0.28)
    img[:, :, 2] = np.clip(0.11 + grain * 0.4, 0.05, 0.24)
    return make_image("zhuge_wood_red", img)


def gen_gate_wood():
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(777)
    grain = 0.025 * np.sin(xx * 0.15) + rng.normal(0, 0.012, (h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.30 + grain, 0.14, 0.46)
    img[:, :, 1] = np.clip(0.13 + grain * 0.5, 0.06, 0.25)
    img[:, :, 2] = np.clip(0.09 + grain * 0.4, 0.04, 0.19)
    # Plank seams
    for px in range(0, w, 128):
        img[:, px:px + 4, :3] *= 0.45
    # Horizontal iron bands + bronze studs
    for by in [160, 480, 820]:
        img[by:by + 42, :, :3] = (0.12, 0.12, 0.13)
        for sx in range(64, w, 128):
            rr = np.sqrt((xx - sx) ** 2 + (yy - (by + 21)) ** 2)
            stud = rr < 13
            img[stud, 0] = 0.72
            img[stud, 1] = 0.58
            img[stud, 2] = 0.26
    return make_image("zhuge_gate_wood", img)


# ==================== MATERIAL & GEOMETRY HELPERS ====================

def make_mat(name, color=(0.5, 0.5, 0.5), roughness=0.75, metalness=0.0, img=None,
             uv_scale=(1.0, 1.0), emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    if img is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (uv_scale[0], uv_scale[1], 1.0)
        coord = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(coord.outputs["UV"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    if emission is not None and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def box_uv_project(bm, scale=0.25):
    uv_layer = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for l in f.loops:
            co = l.vert.co
            if az >= ax and az >= ay:
                u, v = co.x * scale, co.y * scale
            elif ax >= ay and ax >= az:
                u, v = co.y * scale, co.z * scale
            else:
                u, v = co.x * scale, co.z * scale
            l[uv_layer].uv = (u, v)


def add_beveled_box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.04, segs=2, uv_scale=0.25, parent=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0 and min(size) > bevel * 2.5:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, affect='EDGES', clamp_overlap=True)
    box_uv_project(bm, scale=uv_scale)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = bevel > 0
    obj.location = loc
    obj.rotation_euler = Euler(rot, 'XYZ')
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj


def add_cylinder(name, radius_bottom, radius_top, depth, loc, mat, segs=16, rot=(0, 0, 0), parent=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segs,
        radius1=radius_bottom, radius2=radius_top, depth=depth
    )
    box_uv_project(bm, scale=0.4)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj.location = loc
    obj.rotation_euler = Euler(rot, 'XYZ')
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj


def add_sphere(name, radius, loc, mat, scale=(1, 1, 1), segs=16, rings=10, parent=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=radius)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    box_uv_project(bm, scale=0.5)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj.location = loc
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj


def add_pitched_roof(name, width, depth, height, loc, mat, eave_overhang=0.55, parent=None):
    """Curved upturned Chinese hip-and-gable roof mesh."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    hw = width / 2 + eave_overhang
    hd = depth / 2 + eave_overhang
    rw = max(0.4, width / 2 - depth * 0.28)
    # 3 vertical rings for graceful concave Chinese roof sweep
    rings = [
        (hw, hd, 0.0),
        (hw * 0.72 + rw * 0.28, hd * 0.52, height * 0.42),
        (rw, 0.08, height),
    ]
    v_rings = []
    for rx, ry, rz in rings:
        v_rings.append([
            bm.verts.new((-rx, -ry, rz)),
            bm.verts.new((rx, -ry, rz)),
            bm.verts.new((rx, ry, rz)),
            bm.verts.new((-rx, ry, rz)),
        ])
    for i in range(len(v_rings) - 1):
        a, b = v_rings[i], v_rings[i + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bm.faces.new(v_rings[-1])
    bm.faces.new(list(reversed(v_rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    box_uv_project(bm, scale=0.35)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj.location = loc
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj


def add_pine_tree(prefix, x, y, scale, mat_trunk, mat_leaf):
    add_cylinder(f"{prefix}_trunk", 0.26 * scale, 0.14 * scale, 3.2 * scale, (x, y, 1.6 * scale), mat_trunk, segs=10)
    tiers = [(2.8, 1.9, 0.85), (3.8, 1.45, 0.8), (4.65, 1.0, 0.72)]
    for idx, (tz, rx, rz) in enumerate(tiers):
        add_sphere(f"{prefix}_fol{idx}", 1.0, (x, y, tz * scale), mat_leaf,
                   scale=(rx * scale, rx * scale, rz * scale), segs=12, rings=8)


# ==================== BUILD XICHENG FORTRESS CITY ====================
# NOTE on Blender -> Three.js coordinates:
#   Blender (X, Y, Z) becomes Three.js (X, Z, -Y)
#   So:
#     Blender Y = 0    -> Fortress Gate Wall (Three.js Z = 0)
#     Blender Y < 0    -> Exterior Wei Approach Plain (Three.js Z > 0)
#     Blender Y > 0    -> Interior Xicheng City Street & Command Hall (Three.js Z < 0)

def build_scene():
    clear_scene()

    # Materials
    m_stone      = make_mat("StoneWall", img=gen_stone_wall(), roughness=0.88, uv_scale=(1.0, 1.0))
    m_stone_dark = make_mat("StoneDark", color=(0.24, 0.23, 0.22), roughness=0.90)
    m_cobble     = make_mat("CobbleRoad", img=gen_cobble_road(), roughness=0.84, uv_scale=(1.0, 1.0))
    m_dust       = make_mat("DustGround", img=gen_dust_ground(), roughness=0.95, uv_scale=(0.35, 0.35))
    m_roof       = make_mat("RoofTile", img=gen_roof_tile(), roughness=0.72, uv_scale=(1.2, 1.2))
    m_wood_red   = make_mat("WoodRed", img=gen_wood_red(), roughness=0.55)
    m_wood_dark  = make_mat("WoodDark", color=(0.18, 0.12, 0.08), roughness=0.62)
    m_plaster    = make_mat("WallPlaster", color=(0.82, 0.76, 0.64), roughness=0.88)
    m_gate       = make_mat("GateWood", img=gen_gate_wood(), roughness=0.60)
    m_bronze     = make_mat("Bronze", color=(0.68, 0.54, 0.28), roughness=0.32, metalness=0.78)
    m_iron       = make_mat("Iron", color=(0.14, 0.14, 0.16), roughness=0.45, metalness=0.75)
    m_lantern    = make_mat("RedLantern", color=(0.92, 0.22, 0.12), roughness=0.4,
                            emission=(1.0, 0.38, 0.10), emission_strength=2.8)
    m_shu_banner = make_mat("ShuBanner", color=(0.24, 0.44, 0.34), roughness=0.78)
    m_trunk      = make_mat("PineTrunk", color=(0.26, 0.18, 0.12), roughness=0.9)
    m_pine       = make_mat("PineLeaf", color=(0.17, 0.28, 0.16), roughness=0.85)
    m_hill       = make_mat("FarHill", color=(0.36, 0.32, 0.28), roughness=0.96)
    m_guqin      = make_mat("GuqinWood", color=(0.22, 0.11, 0.06), roughness=0.28, metalness=0.05)

    # ---- 1. GROUND PLANES ----
    # Exterior Dusty Plain (Blender Y: -55..-1.5 -> Three.js Z: +1.5..+55)
    add_beveled_box("Ext_Plain", (110, 56, 0.4), (0, -28.0, -0.2), m_dust, bevel=0, uv_scale=0.12)
    # Stone approach causeway right outside gate (Y: -12..+2)
    add_beveled_box("Gate_Causeway", (7.4, 15.0, 0.14), (0, -5.0, 0.03), m_cobble, bevel=0.04, uv_scale=0.35)
    # Interior City Ground & Stone Street (Blender Y: 0..32 -> Three.js Z: 0..-32)
    add_beveled_box("Int_Ground", (64, 34, 0.4), (0, 17.0, -0.2), m_dust, bevel=0, uv_scale=0.18)
    add_beveled_box("Int_MainStreet", (8.8, 26.0, 0.14), (0, 13.0, 0.03), m_cobble, bevel=0.04, uv_scale=0.35)

    # ---- 2. MASSIVE XICHENG STONE FORTRESS WALL (Blender Y = 0, Z = 0..5.2m) ----
    # Left & Right main wall wings leaving a crisp 4.8m wide archway at X = -2.4..+2.4
    add_beveled_box("Wall_Left",  (22.0, 3.8, 5.2), (-13.4, 0.0, 2.6), m_stone, bevel=0.08, uv_scale=0.22)
    add_beveled_box("Wall_Right", (22.0, 3.8, 5.2), (13.4,  0.0, 2.6), m_stone, bevel=0.08, uv_scale=0.22)
    # Archway lintel bridge above gate tunnel (Z = 4.3..5.2)
    add_beveled_box("Wall_GateLintel", (5.2, 4.0, 1.0), (0.0, 0.0, 4.75), m_stone, bevel=0.06, uv_scale=0.25)
    # Heavy stone gate jamb frames
    add_beveled_box("Gate_Jamb_L", (0.55, 4.1, 4.35), (-2.55, 0.0, 2.175), m_stone_dark, bevel=0.05)
    add_beveled_box("Gate_Jamb_R", (0.55, 4.1, 4.35), (2.55,  0.0, 2.175), m_stone_dark, bevel=0.05)
    # Wall top stone walkway deck
    add_beveled_box("Wall_Deck", (50.0, 4.2, 0.22), (0.0, 0.0, 5.25), m_cobble, bevel=0.04, uv_scale=0.3)

    # Buttress stone piers along exterior face for epic architectural depth
    for bx in [-20, -14, -8, 8, 14, 20]:
        add_beveled_box(f"Buttress_{bx}", (1.3, 0.9, 4.9), (bx, -2.15, 2.45), m_stone, bevel=0.07, uv_scale=0.25)

    # Crenellated stone battlements (merlons) along front & rear of wall (leaving center tower balcony open!)
    for mx in range(-23, 24, 2):
        if -5 <= mx <= 5:
            continue
        add_beveled_box(f"Merlon_F_{mx}", (1.25, 0.42, 0.95), (mx, -1.85, 5.78), m_stone, bevel=0.04, uv_scale=0.3)
        add_beveled_box(f"Merlon_B_{mx}", (1.25, 0.36, 0.65), (mx, 1.85, 5.62), m_stone, bevel=0.04, uv_scale=0.3)

    # Corner watchtowers at X = ±23.5
    for side, sx in [("L", -23.5), ("R", 23.5)]:
        add_beveled_box(f"CornerBase_{side}", (5.4, 5.4, 5.4), (sx, 0.0, 2.7), m_stone, bevel=0.08, uv_scale=0.22)
        for px in [-1.8, 1.8]:
            for py in [-1.8, 1.8]:
                add_cylinder(f"CornerPil_{side}_{px}_{py}", 0.18, 0.16, 3.2, (sx + px, py, 7.0), m_wood_red, segs=12)
        add_pitched_roof(f"CornerRoof_{side}", 4.6, 4.6, 2.1, (sx, 0.0, 8.55), m_roof, eave_overhang=0.75)

    # ---- 3. ANIMATED MASSIVE FORTRESS GATES (Gate_Left & Gate_Right) ----
    # Pivots sit at the exact hinge edges so rotating around Z in Blender (= Y in Three.js) swings them wide open!
    gate_l_root = bpy.data.objects.new("Gate_Left", None)
    bpy.context.collection.objects.link(gate_l_root)
    gate_l_root.location = (-2.34, -1.35, 0.08)
    add_beveled_box("Gate_Left_Leaf", (2.32, 0.24, 4.18), (1.16, 0.0, 2.09), m_gate, bevel=0.03, uv_scale=0.24, parent=gate_l_root)
    add_cylinder("Gate_Left_Ring", 0.16, 0.16, 0.06, (1.92, -0.16, 2.05), m_bronze, segs=16, rot=(math.pi / 2, 0, 0), parent=gate_l_root)

    gate_r_root = bpy.data.objects.new("Gate_Right", None)
    bpy.context.collection.objects.link(gate_r_root)
    gate_r_root.location = (2.34, -1.35, 0.08)
    add_beveled_box("Gate_Right_Leaf", (2.32, 0.24, 4.18), (-1.16, 0.0, 2.09), m_gate, bevel=0.03, uv_scale=0.24, parent=gate_r_root)
    add_cylinder("Gate_Right_Ring", 0.16, 0.16, 0.06, (-1.92, -0.16, 2.05), m_bronze, segs=16, rot=(math.pi / 2, 0, 0), parent=gate_r_root)

    # ---- 4. ORNATE TWO-TIER GATE TOWER & GUQIN BALCONY (Z_blender = 5.35..12.8) ----
    ty = 5.35
    # Raised timber balcony platform
    add_beveled_box("Tower_Floor", (11.0, 4.8, 0.24), (0.0, 0.0, ty + 0.12), m_wood_dark, bevel=0.04)
    # 8 cylindrical vermilion pillars (front row open at center so Zhuge Liang is 100% framed!)
    for px in [-4.8, -2.4, 2.4, 4.8]:
        for py in [-1.95, 1.95]:
            add_cylinder(f"TowerPlinth_{px}_{py}", 0.28, 0.24, 0.22, (px, py, ty + 0.32), m_stone_dark, segs=14)
            add_cylinder(f"TowerPillar_{px}_{py}", 0.19, 0.17, 3.6, (px, py, ty + 2.15), m_wood_red, segs=16)

    # Rear timber lattice screen behind Zhuge Liang (gives warm rich contrast behind his ivory robe!)
    add_beveled_box("Tower_BackWall", (9.2, 0.22, 3.3), (0.0, 1.95, ty + 1.85), m_wood_dark, bevel=0.03)
    for lx in [-3.6, -1.8, 0.0, 1.8, 3.6]:
        add_beveled_box(f"Tower_Lattice_{lx}", (1.2, 0.28, 2.2), (lx, 1.90, ty + 1.95), m_wood_red, bevel=0.02)

    # Carved front balcony railing (height 0.78m — frames Zhuge Liang's Guqin table cleanly!)
    add_beveled_box("Balcony_TopRail", (10.2, 0.14, 0.11), (0.0, -2.02, ty + 0.92), m_wood_red, bevel=0.02)
    add_beveled_box("Balcony_BotRail", (10.2, 0.12, 0.10), (0.0, -2.02, ty + 0.36), m_wood_red, bevel=0.02)
    for rx in np.linspace(-4.6, 4.6, 15):
        add_beveled_box(f"Balcony_Post_{rx:.1f}", (0.08, 0.08, 0.56), (float(rx), -2.02, ty + 0.64), m_wood_red, bevel=0.01)

    # Horizontal eaves beam & plaque frame
    add_beveled_box("Tower_BeamF", (10.8, 0.32, 0.34), (0.0, -1.95, ty + 3.85), m_wood_red, bevel=0.03)
    add_beveled_box("Tower_Plaque", (2.6, 0.16, 0.85), (0.0, -2.18, ty + 3.45), m_wood_dark, bevel=0.03)
    add_beveled_box("Tower_PlaqueGold", (2.4, 0.18, 0.68), (0.0, -2.20, ty + 3.45), m_bronze, bevel=0.02)

    # Tier 1 & Tier 2 curved Chinese roofs
    add_pitched_roof("Tower_Roof1", 11.2, 5.2, 1.65, (0.0, 0.0, ty + 3.95), m_roof, eave_overhang=0.95)
    add_beveled_box("Tower_UpperCore", (6.8, 3.0, 1.45), (0.0, 0.0, ty + 5.65), m_wood_red, bevel=0.04)
    add_pitched_roof("Tower_Roof2", 7.2, 3.4, 1.75, (0.0, 0.0, ty + 6.32), m_roof, eave_overhang=0.85)
    # Bronze ridge finials
    add_beveled_box("Tower_Ridge", (4.8, 0.22, 0.26), (0.0, 0.0, ty + 8.15), m_bronze, bevel=0.04)

    # 4 Glowing Red Silk Lanterns hanging under the gate tower eaves
    for lx in [-4.5, -2.4, 2.4, 4.5]:
        add_cylinder(f"LanternCord_{lx}", 0.018, 0.018, 0.45, (lx, -2.25, ty + 3.55), m_iron, segs=8)
        add_sphere(f"LanternGlow_{lx}", 0.26, (lx, -2.25, ty + 3.12), m_lantern, scale=(0.88, 0.88, 1.18), segs=16, rings=10)
        add_cylinder(f"LanternCapT_{lx}", 0.16, 0.18, 0.07, (lx, -2.25, ty + 3.40), m_bronze, segs=12)
        add_cylinder(f"LanternCapB_{lx}", 0.15, 0.13, 0.07, (lx, -2.25, ty + 2.82), m_bronze, segs=12)

    # ---- 5. ZHUGE LIANG'S GUQIN TABLE, 7-STRING GUQIN & INCENSE BURNER (Atop Tower!) ----
    # Placed at Blender (0, -1.25, ty + 0.24) -> Three.js (0, 5.59, +1.25) right in front of Zhuge Liang!
    add_beveled_box("Guqin_TableTop", (1.85, 0.72, 0.08), (0.0, -1.25, ty + 1.02), m_wood_dark, bevel=0.02)
    for tx in [-0.78, 0.78]:
        for tyy in [-1.52, -0.98]:
            add_beveled_box(f"Guqin_Leg_{tx}_{tyy}", (0.08, 0.08, 0.76), (tx, tyy, ty + 0.62), m_wood_dark, bevel=0.015)
    # Sculpted Guqin zither body (narrower tail, wider head)
    add_beveled_box("Guqin_Body", (1.32, 0.24, 0.055), (-0.08, -1.22, ty + 1.09), m_guqin, bevel=0.018)
    for si in range(7):
        sy = -1.30 + si * 0.026
        add_beveled_box(f"Guqin_Str_{si}", (1.22, 0.006, 0.006), (-0.08, sy, ty + 1.125), m_bronze, bevel=0)
    # Bronze Tripod Incense Burner (Ding) next to Guqin
    add_sphere("Incense_Bowl", 0.13, (0.72, -1.22, ty + 1.19), m_bronze, scale=(1.0, 1.0, 0.78), segs=14, rings=10)
    add_cylinder("Incense_Rim", 0.14, 0.12, 0.04, (0.72, -1.22, ty + 1.28), m_bronze, segs=14)
    for a in [0, 2.09, 4.18]:
        add_cylinder(f"Incense_Leg_{a:.1f}", 0.018, 0.014, 0.12,
                     (0.72 + math.cos(a) * 0.08, -1.22 + math.sin(a) * 0.08, ty + 1.09), m_bronze, segs=8)

    # ---- 6. ANIMATED SHU WAR BANNERS ON WALL (Lowered on Zhuge Liang's Order!) ----
    for side, bx in [("L", -7.2), ("R", 7.2)]:
        root = bpy.data.objects.new(f"Banner_Shu_{side}", None)
        bpy.context.collection.objects.link(root)
        root.location = (bx, -1.65, 5.35)
        add_cylinder(f"BannerPole_{side}", 0.055, 0.045, 4.4, (0, 0, 2.2), m_wood_dark, segs=10, parent=root)
        add_beveled_box(f"BannerCloth_{side}", (1.35, 0.04, 2.15), (0.72, 0, 3.1), m_shu_banner, bevel=0.01, parent=root)
        add_sphere(f"BannerFinial_{side}", 0.09, (0, 0, 4.45), m_bronze, segs=10, rings=8, parent=root)

    # ---- 7. INTERIOR XICHENG CITY STREET, HOUSES, WALL STAIRS & COMMAND HALL ----
    # Stone stairs inside wall leading up to ramparts (right side X=+8.5, Y=2.5..11.5)
    for st in range(16):
        sz = (st + 1) * (5.25 / 16.0)
        sy = 11.2 - st * 0.56
        add_beveled_box(f"WallStair_{st}", (2.4, 0.62, sz), (8.6, sy, sz / 2), m_stone, bevel=0.03, uv_scale=0.35)

    # Traditional wooden city houses flanking Xicheng Main Street (Y = 6..18)
    for side, hx in [("L", -8.2), ("R", 8.2)]:
        for hy in [9.5, 15.5]:
            if side == "R" and hy < 12.0:
                continue  # leave room for wall stairs
            add_beveled_box(f"HouseBase_{side}_{hy}", (5.6, 5.2, 0.35), (hx, hy, 0.175), m_stone_dark, bevel=0.04)
            add_beveled_box(f"HouseBody_{side}_{hy}", (5.2, 4.8, 3.2), (hx, hy, 1.95), m_plaster, bevel=0.05)
            for px in [-2.4, 0.0, 2.4]:
                add_cylinder(f"HousePil_{side}_{hy}_{px}", 0.12, 0.11, 3.2,
                             (hx + (2.5 if side == "L" else -2.5), hy + px * 0.85, 1.95), m_wood_red, segs=10)
            add_pitched_roof(f"HouseRoof_{side}_{hy}", 5.8, 5.4, 1.55, (hx, hy, 3.55), m_roof, eave_overhang=0.65)
            # Warm glowing house lantern facing the street
            lx = hx + (2.85 if side == "L" else -2.85)
            add_sphere(f"HouseLantern_{side}_{hy}", 0.22, (lx, hy, 3.05), m_lantern, scale=(0.85, 0.85, 1.15), segs=12, rings=8)

    # Xicheng Command Hall at end of interior street (Blender Y = 22.5 -> Three.js Z = -22.5)
    add_beveled_box("Hall_Platform", (14.5, 7.6, 0.55), (0.0, 22.5, 0.275), m_stone, bevel=0.06, uv_scale=0.3)
    add_beveled_box("Hall_BackWall", (13.6, 0.35, 4.2), (0.0, 25.8, 2.65), m_wood_dark, bevel=0.04)
    for px in [-5.8, -2.6, 2.6, 5.8]:
        add_cylinder(f"Hall_PilF_{px}", 0.20, 0.18, 4.1, (px, 19.3, 2.6), m_wood_red, segs=14)
        add_cylinder(f"Hall_PilB_{px}", 0.20, 0.18, 4.1, (px, 25.4, 2.6), m_wood_red, segs=14)
    add_pitched_roof("Hall_Roof", 14.4, 7.2, 2.3, (0.0, 22.5, 4.65), m_roof, eave_overhang=0.95)
    # Strategy table inside Command Hall (Blender Y = 22.2 -> Three.js Z = -22.2)
    add_beveled_box("Hall_Table", (3.2, 1.25, 0.12), (0.0, 22.2, 1.38), m_wood_dark, bevel=0.025)
    for tx in [-1.35, 1.35]:
        add_beveled_box(f"Hall_TableLeg_{tx}", (0.14, 1.0, 0.82), (tx, 22.2, 0.94), m_wood_dark, bevel=0.02)
    for lx in [-3.4, 3.4]:
        add_sphere(f"Hall_Lantern_{lx}", 0.24, (lx, 19.2, 3.9), m_lantern, scale=(0.85, 0.85, 1.15), segs=12, rings=8)

    # ---- 8. EXTERIOR TREES, ROCKS & DISTANT MOUNTAIN RIDGES (WEI APPROACH) ----
    tree_spots = [
        (-13.5, -9.5, 1.15), (-18.5, -15.0, 1.35), (-11.0, -21.0, 1.05),
        (13.5, -8.8, 1.2),   (19.0, -16.5, 1.4),   (12.2, -23.5, 1.1),
        (-16.0, 10.5, 1.1),  (16.5, 12.0, 1.15),
    ]
    for idx, (tx, ty_pos, sc) in enumerate(tree_spots):
        add_pine_tree(f"Pine_{idx}", tx, ty_pos, sc, m_trunk, m_pine)

    # Flanking roadside boulders outside gate
    rock_spots = [(-5.8, -6.5, 0.7), (6.1, -8.2, 0.85), (-8.5, -14.0, 1.1), (9.2, -16.5, 0.95)]
    for idx, (rx, ry, rs) in enumerate(rock_spots):
        add_sphere(f"Rock_{idx}", rs, (rx, ry, rs * 0.45), m_stone_dark, scale=(1.3, 1.0, 0.65), segs=10, rings=7)

    # Distant misty mountain silhouettes behind Wei army & behind Xicheng
    hill_specs = [
        (-28, -52, 24, 14, 15), (0, -56, 30, 16, 17), (30, -50, 26, 14, 14),
        (-25, 36, 22, 12, 13),  (18, 38, 26, 12, 14),
    ]
    for idx, (hx, hy, sx, sy, sz) in enumerate(hill_specs):
        add_sphere(f"Hill_{idx}", 1.0, (hx, hy, sz * 0.2), m_hill, scale=(sx, sy, sz), segs=14, rings=8)

    # ---- 9. MATERIAL-BATCH STATIC MESHES (KEEP ANIMATED GATES & BANNERS SEPARATE!) ----
    animated_prefixes = ("Gate_Left", "Gate_Right", "Banner_Shu_")
    by_mat = {}
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            continue
        if any(obj.name.startswith(p) for p in animated_prefixes) or (obj.parent and any(obj.parent.name.startswith(p) for p in animated_prefixes)):
            continue
        if not obj.data.materials:
            continue
        mname = obj.data.materials[0].name
        by_mat.setdefault(mname, []).append(obj)

    bpy.ops.object.select_all(action='DESELECT')
    for mname, objs in by_mat.items():
        if len(objs) <= 1:
            continue
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = f"Static_{mname}"
        bpy.ops.object.select_all(action='DESELECT')

    # Export GLB
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_materials='EXPORT',
        export_texcoords=True,
        export_normals=True,
    )
    sz = os.path.getsize(OUT_PATH) / (1024 * 1024)
    n_mesh = sum(1 for o in bpy.data.objects if o.type == 'MESH')
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print(f"EXPORTED XICHENG HQ GLB: {OUT_PATH} ({sz:.2f} MB, {n_mesh} meshes, ~{tris} polys)")


if __name__ == "__main__":
    build_scene()
