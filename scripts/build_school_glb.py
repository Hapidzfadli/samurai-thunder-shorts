"""
Headless Blender 4.x script to procedurally build a stylized 2.5D-ready
classic 2-story School Building (exterior + seamless interior classroom)
inspired by cartoon-3D YouTube Shorts (like @Dasiman3d), and export as
a self-contained GLB for Remotion + Three.js (@remotion/three).

Usage:
    blender --background --python scripts/build_school_glb.py -- public/models/school.glb

Coordinate Convention:
    Blender is Z-up (+Y North, -Y South/Front, +X East, +Z Up).
    Exported with export_yup=True -> Three.js:
        Three.X =  Blender.X
        Three.Y =  Blender.Z
        Three.Z = -Blender.Y   (so South/Front courtyard is +Z in Three.js)
"""

import math
import os
import random
import sys
import bpy
import bmesh
from mathutils import Vector, Euler, Matrix

# ---------------------------------------------------------------------------
# Parse output path from CLI args after "--"
# ---------------------------------------------------------------------------
argv = sys.argv
if "--" in argv:
    custom_args = argv[argv.index("--") + 1:]
else:
    custom_args = []

OUT_PATH = custom_args[0] if custom_args else os.path.abspath("public/models/school.glb")
os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)


# ---------------------------------------------------------------------------
# Clean scene
# ---------------------------------------------------------------------------
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


# ---------------------------------------------------------------------------
# Procedural Image Textures (built via numpy inside Blender - zero external deps)
# ---------------------------------------------------------------------------
import numpy as np


def make_image_from_rgba(name: str, rgba: np.ndarray):
    """rgba shape: (H, W, 4), float32 in [0, 1]. Packed into blend/GLB."""
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True)
    # Blender expects bottom-to-top flattened RGBA float array
    img.pixels.foreach_set(np.flipud(rgba).ravel().astype(np.float32))
    img.pack()
    return img


def gen_wood_planks_texture():
    """Stylized wooden floorboards with crisp dark comic seams like @Dasiman3d."""
    w, h = 512, 512
    img = np.ones((h, w, 4), dtype=np.float32)
    rng = np.random.default_rng(42)
    num_planks = 8
    plank_h = h // num_planks

    base_colors = [
        (0.55, 0.35, 0.19),
        (0.49, 0.30, 0.16),
        (0.60, 0.39, 0.22),
        (0.52, 0.33, 0.18),
    ]
    for i in range(num_planks):
        y0 = i * plank_h
        y1 = (i + 1) * plank_h if i < num_planks - 1 else h
        c = base_colors[i % len(base_colors)]
        # Horizontal wood grain streaks
        yy = np.linspace(0, 1, y1 - y0)[:, None]
        xx = np.linspace(0, 1, w)[None, :]
        grain = 0.04 * np.sin(yy * 28.0 + 1.8 * np.sin(xx * 6.0 + i)) + 0.02 * rng.normal(size=(y1 - y0, w))
        for ch in range(3):
            img[y0:y1, :, ch] = np.clip(c[ch] + grain, 0.05, 0.95)
        # Dark seam along top/bottom of plank
        img[y0:y0 + 3, :, :3] = (0.14, 0.08, 0.05)
        img[y1 - 2:y1, :, :3] = (0.14, 0.08, 0.05)
        # Staggered vertical plank joints
        joint_x = int(((i * 173 + 90) % (w - 80)) + 40)
        img[y0:y1, joint_x:joint_x + 3, :3] = (0.14, 0.08, 0.05)
        # Subtle nail dots next to joint
        for dy in (12, plank_h - 14):
            if y0 + dy + 2 < y1:
                img[y0 + dy:y0 + dy + 3, max(0, joint_x - 8):max(0, joint_x - 5), :3] = (0.16, 0.10, 0.07)
                img[y0 + dy:y0 + dy + 3, min(w, joint_x + 6):min(w, joint_x + 9), :3] = (0.16, 0.10, 0.07)

    return make_image_from_rgba("Tex_WoodPlanks", img)


def gen_chalkboard_texture():
    """Dusty dark-green classic slate chalkboard texture."""
    w, h = 512, 256
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w
    v = yy / h
    rng = np.random.default_rng(7)
    # Soft chalky eraser streaks
    smudge = (
        0.045 * np.exp(-((u - 0.52) ** 2 / 0.14 + (v - 0.48) ** 2 / 0.16))
        + 0.025 * np.sin(u * 14.0 + v * 5.0) * np.sin(v * 9.0)
        + 0.012 * rng.normal(size=(h, w))
    )
    vignette = 0.05 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 3.0
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.11 + smudge - vignette, 0.04, 0.35)
    img[:, :, 1] = np.clip(0.25 + smudge * 1.1 - vignette, 0.09, 0.45)
    img[:, :, 2] = np.clip(0.17 + smudge * 0.9 - vignette, 0.06, 0.35)
    return make_image_from_rgba("Tex_Chalkboard", img)


def gen_clock_face_texture():
    """Crisp vintage school clock dial with 12 hour marks & hands."""
    size = 512
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    cx = cy = size / 2.0
    dx = (xx - cx) / (size / 2.0)
    dy = (yy - cy) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dy, dx)

    img = np.ones((size, size, 4), dtype=np.float32)
    # Cream vintage dial
    img[:, :, 0] = 0.95
    img[:, :, 1] = 0.92
    img[:, :, 2] = 0.82

    # Subtle inner ring
    ring1 = (r > 0.88) & (r < 0.96)
    img[ring1, :3] = (0.18, 0.15, 0.13)
    ring2 = (r > 0.81) & (r < 0.83)
    img[ring2, :3] = (0.35, 0.30, 0.25)

    # 12 hour tick marks
    for k in range(12):
        theta = k * (2.0 * math.pi / 12.0)
        # Rotate coords into tick frame
        tx = dx * math.cos(theta) + dy * math.sin(theta)
        ty = -dx * math.sin(theta) + dy * math.cos(theta)
        thick = 0.032 if k % 3 == 0 else 0.018
        inner = 0.62 if k % 3 == 0 else 0.68
        tick = (tx > inner) & (tx < 0.80) & (np.abs(ty) < thick)
        img[tick, :3] = (0.12, 0.11, 0.10)

    # Hour hand (~10:10 look)
    for hand_deg, length, width in [(-145, 0.45, 0.032), (-30, 0.64, 0.022)]:
        rad = math.radians(hand_deg)
        tx = dx * math.cos(rad) + dy * math.sin(rad)
        ty = -dx * math.sin(rad) + dy * math.cos(rad)
        hand = (tx > -0.06) & (tx < length) & (np.abs(ty) < width)
        img[hand, :3] = (0.10, 0.09, 0.09)

    # Center pin
    img[r < 0.055, :3] = (0.12, 0.10, 0.09)
    return make_image_from_rgba("Tex_ClockFace", img)


def gen_landscape_painting_texture():
    """Green rolling hills & blue sky painting like frame 2 of @Dasiman3d."""
    w, h = 256, 192
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w
    v = yy / h  # 0 top, 1 bottom
    img = np.ones((h, w, 4), dtype=np.float32)

    # Sky gradient
    img[:, :, 0] = 0.56 + 0.24 * v
    img[:, :, 1] = 0.77 + 0.14 * v
    img[:, :, 2] = 0.92

    # Soft white clouds
    cloud = (
        np.exp(-((u - 0.28) ** 2 / 0.018 + (v - 0.26) ** 2 / 0.008))
        + np.exp(-((u - 0.36) ** 2 / 0.014 + (v - 0.23) ** 2 / 0.009))
        + np.exp(-((u - 0.72) ** 2 / 0.022 + (v - 0.22) ** 2 / 0.007))
    )
    c_mask = np.clip(cloud, 0.0, 0.85)
    for ch in range(3):
        img[:, :, ch] = img[:, :, ch] * (1.0 - c_mask) + 0.98 * c_mask

    # Distant hill
    hill1 = v > (0.58 + 0.07 * np.sin(u * 4.5 + 0.6))
    img[hill1, 0] = 0.32
    img[hill1, 1] = 0.56
    img[hill1, 2] = 0.24

    # Foreground brighter green hill
    hill2 = v > (0.68 + 0.08 * np.cos(u * 3.8 - 0.4))
    img[hill2, 0] = 0.24
    img[hill2, 1] = 0.48
    img[hill2, 2] = 0.18

    return make_image_from_rgba("Tex_LandscapePainting", img)


def gen_roof_tiles_texture():
    """Stylized terracotta roof tiles texture."""
    w, h = 256, 256
    img = np.ones((h, w, 4), dtype=np.float32)
    rows = 12
    cols = 10
    rh = h / rows
    cw = w / cols
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r_idx = (yy // rh).astype(np.int32)
    ry = (yy % rh) / rh
    rx = ((xx + (r_idx % 2) * (cw * 0.5)) % cw) / cw

    shade = 0.92 + 0.10 * (1.0 - ry) - 0.06 * np.abs(rx - 0.5)
    img[:, :, 0] = np.clip(0.64 * shade, 0.1, 0.95)
    img[:, :, 1] = np.clip(0.20 * shade, 0.05, 0.95)
    img[:, :, 2] = np.clip(0.15 * shade, 0.05, 0.95)

    # Tile shadow lines
    seam = (ry > 0.88) | (rx < 0.07)
    img[seam, :3] *= 0.58
    return make_image_from_rgba("Tex_RoofTiles", img)


def gen_stucco_texture(name, base_rgb):
    """Warm painterly plaster/stucco texture."""
    w, h = 256, 256
    rng = np.random.default_rng(abs(hash(name)) % (2**31))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    n = (
        0.025 * np.sin(u * 12.0 + v * 7.0) * np.cos(v * 11.0)
        + 0.015 * rng.normal(size=(h, w))
    )
    img = np.ones((h, w, 4), dtype=np.float32)
    for ch in range(3):
        img[:, :, ch] = np.clip(base_rgb[ch] + n, 0.02, 0.98)
    return make_image_from_rgba(name, img)


# ---------------------------------------------------------------------------
# Material Library
# ---------------------------------------------------------------------------
MATS = {}


def make_mat(name, color, roughness=0.75, metallic=0.0, emission=None, emission_strength=0.0, alpha=1.0, image=None, uv_scale=1.0):
    if name in MATS:
        return MATS[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")

    if image is not None:
        tex_coord = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (uv_scale, uv_scale, uv_scale)
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)

    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.25
    if emission is not None and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = "BLEND"

    MATS[name] = mat
    return mat


def init_materials():
    tex_planks = gen_wood_planks_texture()
    tex_chalk = gen_chalkboard_texture()
    tex_clock = gen_clock_face_texture()
    tex_paint = gen_landscape_painting_texture()
    tex_roof = gen_roof_tiles_texture()
    tex_stucco_ext = gen_stucco_texture("Tex_StuccoExt", (0.88, 0.77, 0.54))
    tex_stucco_int = gen_stucco_texture("Tex_StuccoInt", (0.80, 0.71, 0.52))

    make_mat("Stucco_Ext", (0.88, 0.77, 0.54), roughness=0.85, image=tex_stucco_ext, uv_scale=2.0)
    make_mat("Stucco_Int", (0.80, 0.71, 0.52), roughness=0.88, image=tex_stucco_int, uv_scale=2.0)
    make_mat("Stone_Trim", (0.86, 0.81, 0.71), roughness=0.82)
    make_mat("Stone_Base", (0.52, 0.49, 0.45), roughness=0.88)
    make_mat("Roof_Red", (0.62, 0.19, 0.14), roughness=0.78, image=tex_roof, uv_scale=4.0)
    make_mat("Roof_DarkRed", (0.44, 0.13, 0.10), roughness=0.75)
    make_mat("Shutter_Red", (0.56, 0.21, 0.15), roughness=0.72)
    make_mat("Window_Frame", (0.93, 0.90, 0.83), roughness=0.65)
    make_mat("Window_Glass_Dark", (0.16, 0.23, 0.32), roughness=0.18, metallic=0.15)
    make_mat("Window_Glass_Warm", (0.95, 0.78, 0.45), roughness=0.25, emission=(1.0, 0.78, 0.42), emission_strength=0.45)
    make_mat("Door_Wood", (0.28, 0.15, 0.09), roughness=0.75)
    make_mat("Iron_Dark", (0.12, 0.12, 0.14), roughness=0.45, metallic=0.65)
    make_mat("Lamp_Glow", (1.0, 0.88, 0.58), roughness=0.2, emission=(1.0, 0.85, 0.50), emission_strength=2.2)

    # Courtyard / Nature
    make_mat("Plaza_Stone", (0.60, 0.58, 0.55), roughness=0.9)
    make_mat("Walkway_Light", (0.76, 0.72, 0.65), roughness=0.88)
    make_mat("Grass_Main", (0.24, 0.52, 0.18), roughness=0.92)
    make_mat("Grass_Rim", (0.72, 0.68, 0.61), roughness=0.85)
    make_mat("Tree_Trunk", (0.31, 0.19, 0.11), roughness=0.9)
    make_mat("Leaf_A", (0.19, 0.46, 0.16), roughness=0.85)
    make_mat("Leaf_B", (0.27, 0.54, 0.19), roughness=0.85)
    make_mat("Leaf_C", (0.14, 0.36, 0.13), roughness=0.88)

    # Interior Classroom
    make_mat("Floor_Wood", (0.55, 0.35, 0.19), roughness=0.68, image=tex_planks, uv_scale=3.2)
    make_mat("Wood_Wainscot", (0.37, 0.21, 0.11), roughness=0.72)
    make_mat("Wood_Wainscot_Panel", (0.29, 0.16, 0.08), roughness=0.76)
    make_mat("Wood_Trim", (0.45, 0.27, 0.14), roughness=0.66)
    make_mat("Wood_Desk", (0.48, 0.29, 0.15), roughness=0.65)
    make_mat("Wood_Desk_Dark", (0.31, 0.18, 0.09), roughness=0.72)
    make_mat("Ceiling_Cream", (0.85, 0.80, 0.68), roughness=0.9)
    make_mat("Chalkboard_Green", (0.12, 0.27, 0.18), roughness=0.88, image=tex_chalk, uv_scale=1.0)
    make_mat("Chalk_White", (0.96, 0.96, 0.94), roughness=0.9)
    make_mat("Eraser_Felt", (0.20, 0.20, 0.22), roughness=0.95)
    make_mat("Paper_White", (0.95, 0.93, 0.88), roughness=0.85)
    make_mat("Folder_Orange", (0.88, 0.44, 0.12), roughness=0.75)
    make_mat("Gold_Frame", (0.78, 0.60, 0.22), roughness=0.4, metallic=0.45)
    make_mat("Clock_Face", (0.95, 0.92, 0.82), roughness=0.6, image=tex_clock, uv_scale=1.0)
    make_mat("Painting_Hills", (0.5, 0.7, 0.5), roughness=0.7, image=tex_paint, uv_scale=1.0)
    make_mat("Outline_Ink", (0.07, 0.06, 0.08), roughness=0.95)


# ---------------------------------------------------------------------------
# Geometry Helpers (with clean UVs and optional bevels)
# ---------------------------------------------------------------------------
def ensure_collection(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def link_obj(obj, col_name):
    col = ensure_collection(col_name)
    col.objects.link(obj)
    return obj


def set_box_uv(bm, scale=1.0):
    uv_layer = bm.loops.layers.uv.verify()
    for face in bm.faces:
        n = face.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in face.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                u, v = co.x * scale, co.y * scale
            elif ax >= ay and ax >= az:
                u, v = co.y * scale, co.z * scale
            else:
                u, v = co.x * scale, co.z * scale
            loop[uv_layer].uv = (u, v)


def add_box(name, center, size, mat_name, col_name="School", rot=(0, 0, 0), bevel=0.0, uv_scale=0.35):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0.0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect="EDGES", clamp_overlap=True)
    set_box_uv(bm, uv_scale)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new(name, me)
    obj.location = Vector(center)
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.data.materials.append(MATS[mat_name])
    link_obj(obj, col_name)
    return obj


def add_planar_quad(name, center, width, height, normal_axis, mat_name, col_name="School"):
    """Create a UV-mapped [0..1] quad for paintings, chalkboard, clock dial, etc."""
    bm = bmesh.new()
    hw, hh = width / 2.0, height / 2.0
    if normal_axis == "-Y":  # Faces South (-Y in Blender -> +Z in Three.js)
        verts = [
            bm.verts.new((-hw, 0, -hh)),
            bm.verts.new((hw, 0, -hh)),
            bm.verts.new((hw, 0, hh)),
            bm.verts.new((-hw, 0, hh)),
        ]
    elif normal_axis == "+Y":  # Faces North
        verts = [
            bm.verts.new((hw, 0, -hh)),
            bm.verts.new((-hw, 0, -hh)),
            bm.verts.new((-hw, 0, hh)),
            bm.verts.new((hw, 0, hh)),
        ]
    elif normal_axis == "+X":  # Faces East
        verts = [
            bm.verts.new((0, -hw, -hh)),
            bm.verts.new((0, hw, -hh)),
            bm.verts.new((0, hw, hh)),
            bm.verts.new((0, -hw, hh)),
        ]
    elif normal_axis == "-X":  # Faces West
        verts = [
            bm.verts.new((0, hw, -hh)),
            bm.verts.new((0, -hw, -hh)),
            bm.verts.new((0, -hw, hh)),
            bm.verts.new((0, hw, hh)),
        ]
    else:  # +Z (floor)
        verts = [
            bm.verts.new((-hw, -hh, 0)),
            bm.verts.new((hw, -hh, 0)),
            bm.verts.new((hw, hh, 0)),
            bm.verts.new((-hw, hh, 0)),
        ]
    face = bm.faces.new(verts)
    uv_layer = bm.loops.layers.uv.verify()
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for loop, uv in zip(face.loops, uvs):
        loop[uv_layer].uv = uv

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = Vector(center)
    obj.data.materials.append(MATS[mat_name])
    link_obj(obj, col_name)
    return obj


def add_cylinder(name, center, r_bottom, r_top, height, segs, mat_name, col_name="School", rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=r_bottom,
        radius2=r_top,
        depth=height,
    )
    set_box_uv(bm, 0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = Vector(center)
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.data.materials.append(MATS[mat_name])
    link_obj(obj, col_name)
    return obj


def add_icosphere(name, center, radius, subdiv, mat_name, col_name="Courtyard", scale=(1, 1, 1), jitter=0.0, seed=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    rng = random.Random(seed)
    for v in bm.verts:
        if jitter > 0:
            v.co *= 1.0 + rng.uniform(-jitter, jitter)
        v.co.x *= scale[0]
        v.co.y *= scale[1]
        v.co.z *= scale[2]
    set_box_uv(bm, 0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = Vector(center)
    obj.data.materials.append(MATS[mat_name])
    link_obj(obj, col_name)
    return obj


def add_hip_roof(name, center, width, depth, height, ridge_ratio, mat_name, col_name="Exterior"):
    """Build a crisp hipped roof (pyramid/trapezoid roof) centered at bottom Z."""
    bm = bmesh.new()
    hw, hd = width / 2.0, depth / 2.0
    rw = hw * ridge_ratio
    rd = hd * max(0.0, ridge_ratio - 0.5) if depth > width else 0.0

    # Bottom 4 corners
    v0 = bm.verts.new((-hw, -hd, 0))
    v1 = bm.verts.new((hw, -hd, 0))
    v2 = bm.verts.new((hw, hd, 0))
    v3 = bm.verts.new((-hw, hd, 0))

    if rw < 0.05:
        # Pyramid roof (clock tower)
        vt = bm.verts.new((0, 0, height))
        bm.faces.new((v0, v1, vt))
        bm.faces.new((v1, v2, vt))
        bm.faces.new((v2, v3, vt))
        bm.faces.new((v3, v0, vt))
        bm.faces.new((v3, v2, v1, v0))
    else:
        # Classic hipped roof with ridge along X
        vr0 = bm.verts.new((-rw, -rd, height))
        vr1 = bm.verts.new((rw, -rd, height))
        bm.faces.new((v0, v1, vr1, vr0))
        bm.faces.new((v1, v2, vr1))
        bm.faces.new((v2, v3, vr0, vr1))
        bm.faces.new((v3, v0, vr0))
        bm.faces.new((v3, v2, v1, v0))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    set_box_uv(bm, 0.25)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = Vector(center)
    obj.data.materials.append(MATS[mat_name])
    link_obj(obj, col_name)
    return obj


def add_boolean_cut(target_obj, cutter_objs):
    """Apply exact Boolean DIFFERENCE cuts cleanly and remove cutters."""
    for c in cutter_objs:
        mod = target_obj.modifiers.new(name="BoolCut", type="BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.object = c
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = target_obj.evaluated_get(depsgraph)
    new_mesh = bpy.data.meshes.new_from_object(eval_obj)
    old_mesh = target_obj.data
    target_obj.modifiers.clear()
    target_obj.data = new_mesh
    bpy.data.meshes.remove(old_mesh)
    for c in cutter_objs:
        bpy.data.objects.remove(c, do_unlink=True)


def add_wall_window_decor(prefix, x, y, z, w, h, normal_dir="-Y", is_open=False, warm_glass=False, col_name="Exterior"):
    """Build window frame, sill, lintel, shutters, and glass (omitted when is_open=True)."""
    # Orientation helper
    is_y = normal_dir in ("-Y", "+Y")
    sign = -1.0 if normal_dir in ("-Y", "-X") else 1.0

    def place(dx, dy, dz, sx, sy, sz, mat, name_suffix, bev=0.012):
        if is_y:
            pos = (x + dx, y + sign * dy, z + dz)
            size = (sx, sy, sz)
        else:
            pos = (x + sign * dy, y + dx, z + dz)
            size = (sy, sx, sz)
        return add_box(f"{prefix}_{name_suffix}", pos, size, mat, col_name=col_name, bevel=bev)

    frame_t = 0.09
    frame_d = 0.16
    # Outer frame
    place(0, 0.04, h / 2 - frame_t / 2, w, frame_d, frame_t, "Window_Frame", "Top")
    place(0, 0.04, -h / 2 + frame_t / 2, w, frame_d, frame_t, "Window_Frame", "Bot")
    place(-w / 2 + frame_t / 2, 0.04, 0, frame_t, frame_d, h, "Window_Frame", "Left")
    place(w / 2 - frame_t / 2, 0.04, 0, frame_t, frame_d, h, "Window_Frame", "Right")

    # Stone sill & lintel
    place(0, 0.12, -h / 2 - 0.06, w + 0.24, 0.26, 0.12, "Stone_Trim", "Sill", bev=0.02)
    place(0, 0.10, h / 2 + 0.08, w + 0.20, 0.22, 0.14, "Stone_Trim", "Lintel", bev=0.02)

    if not is_open:
        # Mullions
        place(0, 0.05, 0, 0.055, 0.08, h - 0.14, "Window_Frame", "MulV", bev=0.005)
        place(0, 0.05, 0.18, w - 0.14, 0.08, 0.055, "Window_Frame", "MulH1", bev=0.005)
        place(0, 0.05, -0.35, w - 0.14, 0.08, 0.055, "Window_Frame", "MulH2", bev=0.005)
        # Glass pane
        gmat = "Window_Glass_Warm" if warm_glass else "Window_Glass_Dark"
        place(0, 0.01, 0, w - 0.14, 0.04, h - 0.14, gmat, "Glass", bev=0.0)
    else:
        # Open casement sashes swung outward slightly for cinematic fly-through framing!
        sash_w = (w - 0.18) * 0.48
        for side, sgn in (("L", -1), ("R", 1)):
            # Outer swing position
            if is_y:
                px = x + sgn * (w / 2 - 0.04)
                py = y + sign * 0.28
                rot = (0, 0, sgn * (-0.95 if sign < 0 else 0.95))
                add_box(f"{prefix}_Sash{side}", (px, py, z), (0.06, sash_w * 0.65, h - 0.18), "Window_Frame", col_name=col_name, rot=rot, bevel=0.01)

    # Terracotta shutters flanking window
    sh_w = w * 0.34
    for side, sgn in (("L", -1), ("R", 1)):
        place(sgn * (w / 2 + sh_w / 2 + 0.05), 0.10, 0, sh_w, 0.06, h - 0.04, "Shutter_Red", f"Shutter{side}", bev=0.01)


# ---------------------------------------------------------------------------
# 1. Build Courtyard & Environment
# ---------------------------------------------------------------------------
def build_courtyard():
    col = "Courtyard"
    # Wide stone courtyard ground
    add_box("Ground_Base", (0, -4.0, -0.25), (56.0, 52.0, 0.5), "Plaza_Stone", col_name=col, uv_scale=0.15)
    # Central main stone walkway leading to school entrance
    add_box("Walkway_Main", (0, -11.5, 0.02), (4.6, 15.0, 0.06), "Walkway_Light", col_name=col, bevel=0.015)
    add_box("Walkway_Cross", (0, -5.8, 0.025), (26.0, 3.2, 0.06), "Walkway_Light", col_name=col, bevel=0.015)

    # Two front grass lawns + curbs (matching frame 1 of @Dasiman3d)
    for side, sx in (("Left", -6.8), ("Right", 6.8)):
        add_box(f"Lawn_{side}", (sx, -12.2, 0.04), (8.4, 8.8, 0.10), "Grass_Main", col_name=col, bevel=0.02)
        # Curbs
        add_box(f"Curb_{side}_N", (sx, -7.75, 0.09), (8.7, 0.22, 0.18), "Grass_Rim", col_name=col, bevel=0.02)
        add_box(f"Curb_{side}_S", (sx, -16.65, 0.09), (8.7, 0.22, 0.18), "Grass_Rim", col_name=col, bevel=0.02)
        add_box(f"Curb_{side}_W", (sx - 4.25, -12.2, 0.09), (0.22, 9.0, 0.18), "Grass_Rim", col_name=col, bevel=0.02)
        add_box(f"Curb_{side}_E", (sx + 4.25, -12.2, 0.09), (0.22, 9.0, 0.18), "Grass_Rim", col_name=col, bevel=0.02)

    # Side & back green lawns surrounding the school
    add_box("Lawn_EastSide", (15.5, 1.0, 0.03), (8.5, 22.0, 0.08), "Grass_Main", col_name=col)
    add_box("Lawn_WestSide", (-15.5, 1.0, 0.03), (8.5, 22.0, 0.08), "Grass_Main", col_name=col)

    # Small courtyard stone monument/planter in front walkway circle
    add_cylinder("Courtyard_Plinth", (0, -11.5, 0.18), 1.35, 1.25, 0.36, 16, "Stone_Trim", col_name=col)
    add_cylinder("Courtyard_Pedestal", (0, -11.5, 0.72), 0.55, 0.45, 0.85, 12, "Stone_Base", col_name=col)
    add_cylinder("Courtyard_PedestalTop", (0, -11.5, 1.22), 0.65, 0.62, 0.16, 12, "Stone_Trim", col_name=col)

    # Stylized trees (layered low-poly foliage clusters)
    tree_spots = [
        (-9.8, -9.2, 1.15), (-4.0, -9.4, 0.92), (-8.5, -14.8, 1.08),
        (4.0, -9.6, 0.95), (9.8, -9.2, 1.18), (8.2, -14.8, 1.05),
        (-13.8, -4.5, 1.25), (14.2, -4.2, 1.22), (-14.0, 3.0, 1.15), (14.4, 3.8, 1.20),
    ]
    for idx, (tx, ty, sc) in enumerate(tree_spots):
        th = 2.6 * sc
        add_cylinder(f"TreeTrunk_{idx}", (tx, ty, th / 2), 0.24 * sc, 0.14 * sc, th, 8, "Tree_Trunk", col_name=col)
        # 3 foliage puffs for lush stylized silhouette
        add_icosphere(f"TreeLeaf_{idx}_A", (tx, ty, th + 0.85 * sc), 1.25 * sc, 2, "Leaf_A", col_name=col, scale=(1.1, 1.05, 0.95), jitter=0.12, seed=idx * 11 + 1)
        add_icosphere(f"TreeLeaf_{idx}_B", (tx + 0.55 * sc, ty - 0.35 * sc, th + 0.45 * sc), 0.85 * sc, 2, "Leaf_B", col_name=col, scale=(1.0, 1.0, 0.9), jitter=0.10, seed=idx * 11 + 2)
        add_icosphere(f"TreeLeaf_{idx}_C", (tx - 0.52 * sc, ty + 0.32 * sc, th + 0.55 * sc), 0.82 * sc, 2, "Leaf_C", col_name=col, scale=(1.05, 0.95, 0.9), jitter=0.10, seed=idx * 11 + 3)

    # Vintage Courtyard Lamp Posts
    lamp_spots = [(-2.6, -7.2), (2.6, -7.2), (-2.6, -15.5), (2.6, -15.5)]
    for idx, (lx, ly) in enumerate(lamp_spots):
        add_cylinder(f"LampBase_{idx}", (lx, ly, 0.25), 0.18, 0.11, 0.5, 8, "Iron_Dark", col_name=col)
        add_cylinder(f"LampPole_{idx}", (lx, ly, 1.7), 0.06, 0.045, 2.6, 8, "Iron_Dark", col_name=col)
        add_cylinder(f"LampGlow_{idx}", (lx, ly, 3.15), 0.13, 0.18, 0.36, 6, "Lamp_Glow", col_name=col)
        add_cylinder(f"LampCap_{idx}", (lx, ly, 3.42), 0.24, 0.03, 0.18, 6, "Iron_Dark", col_name=col)

    # Courtyard Wooden Benches
    for idx, (bx, by, rotz) in enumerate([(-5.8, -7.2, 0), (5.8, -7.2, 0)]):
        add_box(f"BenchSeat_{idx}", (bx, by, 0.48), (1.7, 0.48, 0.08), "Wood_Desk", col_name=col, rot=(0, 0, rotz), bevel=0.015)
        add_box(f"BenchBack_{idx}", (bx, by + 0.22, 0.82), (1.7, 0.07, 0.42), "Wood_Desk", col_name=col, rot=(-0.18, 0, rotz), bevel=0.015)
        for lx in (-0.68, 0.68):
            add_box(f"BenchLeg_{idx}_{lx}", (bx + lx, by, 0.24), (0.08, 0.44, 0.48), "Iron_Dark", col_name=col)


# ---------------------------------------------------------------------------
# 2. Build School Exterior + Cutouts for Seamless Hero Classroom
# ---------------------------------------------------------------------------
# Hero Classroom spans:
#   X: 2.0 .. 10.4  (width 8.4m)
#   Y: -3.6 .. 5.0  (depth 8.6m)
#   Z: 4.5 .. 8.1   (height 3.6m, Floor 2 East Wing!)
# Front South Exterior Wall is at Y = -4.0 .. -3.6 (thickness 0.4m)
# East Exterior Wall is at X = 10.4 .. 10.8 (thickness 0.4m)
# Hero Open Fly-through Window is centered at X = 6.2, Y = -3.8, Z = 6.35 (width 1.65m, height 2.25m)

def build_school_exterior():
    col = "Exterior"

    # Foundation plinth
    add_box("School_Foundation", (0, 0.8, 0.30), (22.0, 10.2, 0.60), "Stone_Base", col_name=col, bevel=0.04)

    # --- Main Shell Walls ---
    # West & Center solid block (X: -10.8 .. 2.0)
    add_box("School_WestBlock", (-4.4, 0.8, 4.50), (12.8, 9.6, 7.80), "Stucco_Ext", col_name=col, bevel=0.02)

    # East Wing Floor 1 solid block (X: 2.0 .. 10.8, Z: 0.6 .. 4.5)
    add_box("School_EastF1", (6.4, 0.8, 2.55), (8.8, 9.6, 3.90), "Stucco_Ext", col_name=col, bevel=0.02)

    # East Wing Floor 2: Hollow Exterior Walls so Hero Classroom sits truly inside!
    # 1) South Front Wall (Y = -4.0 .. -3.6, X = 2.0 .. 10.8, Z = 4.5 .. 8.4)
    south_wall = add_box("School_EastF2_SouthWall", (6.4, -3.8, 6.45), (8.8, 0.40, 3.90), "Stucco_Ext", col_name=col)
    # Cut 3 real tall windows on South Front Wall (middle one is Hero Fly-through window!)
    south_win_xs = [3.7, 6.2, 8.7]
    south_cutters = []
    for i, wx in enumerate(south_win_xs):
        ww = 1.68 if i == 1 else 1.32
        wh = 2.25 if i == 1 else 2.05
        c = add_box(f"_Cut_S{i}", (wx, -3.8, 6.35), (ww, 1.2, wh), "Stucco_Ext", col_name=col)
        south_cutters.append(c)
    add_boolean_cut(south_wall, south_cutters)

    # 2) East Side Wall (X = 10.4 .. 10.8, Y = -4.0 .. 5.6, Z = 4.5 .. 8.4)
    east_wall = add_box("School_EastF2_EastWall", (10.6, 0.8, 6.45), (0.40, 9.6, 3.90), "Stucco_Ext", col_name=col)
    east_win_ys = [-0.8, 2.2]
    east_cutters = []
    for i, wy in enumerate(east_win_ys):
        c = add_box(f"_Cut_E{i}", (10.6, wy, 6.40), (1.2, 1.55, 2.15), "Stucco_Ext", col_name=col)
        east_cutters.append(c)
    add_boolean_cut(east_wall, east_cutters)

    # 3) North Back Wall of East Wing (Y = 5.2 .. 5.6, X = 2.0 .. 10.8, Z = 4.5 .. 8.4)
    add_box("School_EastF2_NorthWall", (6.4, 5.4, 6.45), (8.8, 0.40, 3.90), "Stucco_Ext", col_name=col)

    # --- Horizontal Belt Courses & Roof Cornice ---
    # Keep top of Belt_Floor2 at Z=4.46 (< classroom floor Z=4.50) so it never pokes through the wooden floorboards!
    add_box("Belt_Floor2", (0, 0.8, 4.35), (22.05, 10.05, 0.22), "Stone_Trim", col_name=col, bevel=0.03)
    add_box("Cornice_Top", (0, 0.8, 8.38), (22.30, 10.30, 0.34), "Stone_Trim", col_name=col, bevel=0.04)

    # Corner stone pilasters for classic look
    for px in (-10.82, 10.82):
        for py in (-4.02, 5.62):
            add_box(f"Pilaster_{px}_{py}", (px, py, 4.5), (0.42, 0.42, 7.8), "Stone_Trim", col_name=col, bevel=0.03)

    # --- Grand Front Entrance Portico (Center, X = -3.0 .. +3.0, Y = -5.4 .. -4.0) ---
    add_box("Portico_Steps1", (0, -5.6, 0.14), (6.4, 1.4, 0.28), "Stone_Trim", col_name=col, bevel=0.02)
    add_box("Portico_Steps2", (0, -5.1, 0.38), (5.8, 1.1, 0.28), "Stone_Trim", col_name=col, bevel=0.02)
    add_box("Portico_Floor", (0, -4.6, 0.56), (5.6, 1.4, 0.18), "Stone_Base", col_name=col, bevel=0.02)
    add_box("Portico_Roof", (0, -4.75, 4.35), (6.0, 1.85, 0.34), "Stone_Trim", col_name=col, bevel=0.04)
    # 4 Portico Columns
    for idx, cx in enumerate((-2.5, -0.88, 0.88, 2.5)):
        add_cylinder(f"Portico_Col_{idx}", (cx, -5.25, 2.45), 0.21, 0.18, 3.6, 12, "Stone_Trim", col_name=col)
        add_box(f"Portico_ColBase_{idx}", (cx, -5.25, 0.72), (0.52, 0.52, 0.22), "Stone_Base", col_name=col, bevel=0.02)
        add_box(f"Portico_ColCap_{idx}", (cx, -5.25, 4.12), (0.54, 0.54, 0.20), "Stone_Trim", col_name=col, bevel=0.02)
    # Recessed dark entrance doors
    for idx, dx in enumerate((-1.65, 0.0, 1.65)):
        add_box(f"Entrance_Door_{idx}", (dx, -4.02, 2.05), (1.15, 0.12, 2.85), "Door_Wood", col_name=col, bevel=0.02)
        add_box(f"Entrance_DoorFrame_{idx}", (dx, -4.06, 3.52), (1.35, 0.18, 0.16), "Stone_Trim", col_name=col, bevel=0.02)
    # Balcony railing above portico
    add_box("Portico_RailTop", (0, -5.50, 5.15), (5.8, 0.14, 0.10), "Stone_Trim", col_name=col, bevel=0.02)
    for bx in (-2.6, -1.7, -0.85, 0.0, 0.85, 1.7, 2.6):
        add_cylinder(f"Portico_Bal_{bx}", (bx, -5.50, 4.80), 0.06, 0.06, 0.65, 8, "Stone_Trim", col_name=col)

    # --- Exterior Windows across the facade ---
    # Floor 1 front windows (West & East wings)
    for i, wx in enumerate((-8.7, -6.2, -3.7, 3.7, 6.2, 8.7)):
        add_wall_window_decor(f"Win_F1_S{i}", wx, -4.0, 2.55, 1.32, 2.05, "-Y", is_open=False, warm_glass=(i % 2 == 1), col_name=col)

    # Floor 2 front windows (West wing & Center above portico)
    for i, wx in enumerate((-8.7, -6.2, -3.7, -1.4, 1.4)):
        add_wall_window_decor(f"Win_F2_SW{i}", wx, -4.0, 6.35, 1.32, 2.05, "-Y", is_open=False, warm_glass=(i in (1, 3)), col_name=col)

    # Floor 2 front Hero Classroom windows (actual Boolean openings!)
    add_wall_window_decor("Win_Hero_S0", 3.7, -3.98, 6.35, 1.34, 2.08, "-Y", is_open=True, col_name=col)
    add_wall_window_decor("Win_Hero_S1_FLY", 6.2, -3.98, 6.35, 1.72, 2.28, "-Y", is_open=True, col_name=col)
    add_wall_window_decor("Win_Hero_S2", 8.7, -3.98, 6.35, 1.34, 2.08, "-Y", is_open=True, col_name=col)

    # East side windows (Floor 1 decorative, Floor 2 real openings into Hero Classroom!)
    for i, wy in enumerate((-0.8, 2.2)):
        add_wall_window_decor(f"Win_F1_E{i}", 10.8, wy, 2.55, 1.45, 2.05, "+X", is_open=False, warm_glass=True, col_name=col)
        add_wall_window_decor(f"Win_Hero_E{i}", 10.78, wy, 6.40, 1.58, 2.18, "+X", is_open=True, col_name=col)

    # West side decorative windows
    for i, wy in enumerate((-0.8, 2.2)):
        add_wall_window_decor(f"Win_F1_W{i}", -10.8, wy, 2.55, 1.45, 2.05, "-X", is_open=False, col_name=col)
        add_wall_window_decor(f"Win_F2_W{i}", -10.8, wy, 6.40, 1.45, 2.05, "-X", is_open=False, col_name=col)

    # --- Main Red Hipped Roof (Z = 8.50 .. 11.40) ---
    add_hip_roof("School_MainRoof", (0, 0.8, 8.50), 23.2, 11.2, 2.95, 0.56, "Roof_Red", col_name=col)
    # Ridge cap beam
    add_box("School_RoofRidge", (0, 0.8, 11.46), (13.0, 0.34, 0.24), "Roof_DarkRed", col_name=col, bevel=0.03)

    # Rooftop chimneys/dormer vents (like frame 1)
    for idx, (cx, cy) in enumerate([(-7.4, 2.6), (7.6, 2.6)]):
        add_box(f"Chimney_{idx}", (cx, cy, 10.7), (0.95, 0.95, 2.0), "Stone_Trim", col_name=col, bevel=0.03)
        add_box(f"ChimneyCap_{idx}", (cx, cy, 11.78), (1.16, 1.16, 0.18), "Roof_DarkRed", col_name=col, bevel=0.02)

    # --- Iconic Central Clock Tower (X = -1.9 .. 1.9, Y = -1.8 .. 1.8, Z = 8.5 .. 16.5) ---
    add_box("ClockTower_Base", (0, -0.4, 10.9), (3.8, 3.8, 4.8), "Stucco_Ext", col_name=col, bevel=0.04)
    add_box("ClockTower_Cornice1", (0, -0.4, 13.32), (4.2, 4.2, 0.30), "Stone_Trim", col_name=col, bevel=0.04)

    # Circular Clock Dials + Dark Metallic Bezels on all 4 sides
    def add_clock_disc(cname, pos, rot):
        # Dark rim bezel
        add_cylinder(f"{cname}_Rim", pos, 1.06, 1.06, 0.12, 32, "Iron_Dark", col_name=col, rot=rot)
        # Circular UV-mapped dial disc slightlyproud of rim
        bm = bmesh.new()
        segs = 32
        r = 0.98
        verts = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), 0.068)) for i in range(segs)]
        face = bm.faces.new(verts)
        uv_layer = bm.loops.layers.uv.verify()
        for i, loop in enumerate(face.loops):
            ang = 2 * math.pi * i / segs
            loop[uv_layer].uv = (0.5 + 0.49 * math.cos(ang), 0.5 + 0.49 * math.sin(ang))
        me = bpy.data.meshes.new(cname)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(cname, me)
        obj.location = Vector(pos)
        obj.rotation_euler = Euler(rot, "XYZ")
        obj.data.materials.append(MATS["Clock_Face"])
        link_obj(obj, col)

    add_clock_disc("ClockDial_Front", (0, -2.32, 11.85), (math.pi / 2, 0, 0))
    add_clock_disc("ClockDial_Back", (0, 1.52, 11.85), (-math.pi / 2, 0, 0))
    add_clock_disc("ClockDial_East", (1.92, -0.4, 11.85), (0, math.pi / 2, 0))
    add_clock_disc("ClockDial_West", (-1.92, -0.4, 11.85), (0, -math.pi / 2, 0))

    # Tower pyramid roof + spire finial
    add_hip_roof("ClockTower_Roof", (0, -0.4, 13.45), 4.45, 4.45, 2.85, 0.0, "Roof_Red", col_name=col)
    add_cylinder("ClockTower_Spire", (0, -0.4, 16.85), 0.07, 0.02, 1.4, 8, "Iron_Dark", col_name=col)
    add_icosphere("ClockTower_Orb", (0, -0.4, 16.35), 0.16, 2, "Gold_Frame", col_name=col)
    add_box("ClockTower_Vane", (0, -0.4, 17.25), (0.85, 0.04, 0.12), "Iron_Dark", col_name=col)


# ---------------------------------------------------------------------------
# 3. Build Hero Classroom Interior (Floor 2 East Wing: X=2.0..10.4, Y=-3.6..5.2, Z=4.5..8.1)
# ---------------------------------------------------------------------------
def build_desk_unit(prefix, cx, cy, z_floor, col_name="Interior"):
    """Vintage wooden student desk + bench + books & inkwell (matching frame 2)."""
    # Desk tabletop (slight forward slant)
    add_box(f"{prefix}_Top", (cx, cy, z_floor + 0.78), (1.32, 0.62, 0.07), "Wood_Desk", col_name=col_name, bevel=0.014)
    # Modesty panel & cubby box
    add_box(f"{prefix}_Cubby", (cx, cy + 0.02, z_floor + 0.62), (1.18, 0.48, 0.24), "Wood_Desk_Dark", col_name=col_name, bevel=0.01)
    add_box(f"{prefix}_FrontPanel", (cx, cy + 0.26, z_floor + 0.42), (1.24, 0.06, 0.66), "Wood_Wainscot", col_name=col_name, bevel=0.01)
    # Side legs
    for sx in (-0.58, 0.58):
        add_box(f"{prefix}_Leg_{sx}", (cx + sx, cy, z_floor + 0.39), (0.08, 0.54, 0.76), "Wood_Desk_Dark", col_name=col_name, bevel=0.01)

    # Attached chair/bench behind desk (-Y side, facing +Y toward chalkboard)
    add_box(f"{prefix}_Seat", (cx, cy - 0.56, z_floor + 0.45), (1.12, 0.38, 0.06), "Wood_Desk", col_name=col_name, bevel=0.012)
    add_box(f"{prefix}_Back", (cx, cy - 0.74, z_floor + 0.74), (1.12, 0.06, 0.38), "Wood_Desk", col_name=col_name, bevel=0.012)
    for sx in (-0.48, 0.48):
        add_box(f"{prefix}_CLeg_{sx}", (cx + sx, cy - 0.56, z_floor + 0.22), (0.06, 0.34, 0.44), "Wood_Desk_Dark", col_name=col_name)

    # Desktop props: white notebook, orange folder, inkwell!
    add_box(f"{prefix}_Paper", (cx - 0.16, cy - 0.04, z_floor + 0.825), (0.34, 0.26, 0.02), "Paper_White", col_name=col_name, rot=(0, 0, 0.08))
    add_box(f"{prefix}_Folder", (cx + 0.20, cy - 0.02, z_floor + 0.83), (0.30, 0.24, 0.025), "Folder_Orange", col_name=col_name, rot=(0, 0, -0.14))
    add_cylinder(f"{prefix}_Inkwell", (cx + 0.48, cy + 0.16, z_floor + 0.865), 0.045, 0.038, 0.10, 10, "Iron_Dark", col_name=col_name)
    add_cylinder(f"{prefix}_InkCap", (cx + 0.48, cy + 0.16, z_floor + 0.925), 0.028, 0.028, 0.03, 10, "Gold_Frame", col_name=col_name)


def build_classroom_interior():
    col = "Interior"
    z0 = 4.50
    z_ceil = 8.18

    # 1) Plank Wooden Floor (Z = 4.50)
    add_planar_quad("Class_Floor", (6.2, 0.8, z0 + 0.01), 8.4, 8.8, "+Z", "Floor_Wood", col_name=col)
    # Solid floor slab underneath
    add_box("Class_FloorSlab", (6.2, 0.8, z0 - 0.08), (8.4, 8.8, 0.16), "Wood_Desk_Dark", col_name=col)

    # 2) Interior Ceiling + Exposed Wooden Beams
    add_box("Class_Ceiling", (6.2, 0.8, z_ceil + 0.10), (8.6, 9.0, 0.20), "Ceiling_Cream", col_name=col)
    for i, by in enumerate((-2.4, -0.2, 2.0, 4.2)):
        add_box(f"Class_Beam_{i}", (6.2, by, z_ceil - 0.10), (8.4, 0.24, 0.22), "Wood_Wainscot", col_name=col, bevel=0.02)

    # 3) Interior Wall Plaster Liners (North wall, West wall)
    add_box("Class_NorthPlaster", (6.2, 5.15, 6.34), (8.4, 0.12, 3.68), "Stucco_Int", col_name=col)
    add_box("Class_WestPlaster", (2.06, 0.8, 6.34), (0.12, 8.8, 3.68), "Stucco_Int", col_name=col)

    # 4) Rich Wood Wainscoting along North Wall (behind teacher & chalkboard)
    add_box("Wainscot_North_Base", (6.2, 5.06, z0 + 0.72), (8.36, 0.09, 1.44), "Wood_Wainscot", col_name=col, bevel=0.015)
    add_box("Wainscot_North_Rail", (6.2, 5.03, z0 + 1.46), (8.40, 0.15, 0.10), "Wood_Trim", col_name=col, bevel=0.018)
    add_box("Wainscot_North_Skirt", (6.2, 5.03, z0 + 0.09), (8.40, 0.14, 0.18), "Wood_Trim", col_name=col, bevel=0.015)
    # Recessed decorative wood panels (matching maxresdefault.jpg!)
    for i in range(9):
        px = 2.62 + i * 0.89
        add_box(f"Wainscot_N_Panel_{i}", (px, 5.00, z0 + 0.78), (0.68, 0.04, 1.04), "Wood_Wainscot_Panel", col_name=col, bevel=0.012)

    # Wood Wainscoting along West Wall
    add_box("Wainscot_West_Base", (2.15, 0.8, z0 + 0.72), (0.09, 8.76, 1.44), "Wood_Wainscot", col_name=col, bevel=0.015)
    add_box("Wainscot_West_Rail", (2.18, 0.8, z0 + 1.46), (0.15, 8.80, 0.10), "Wood_Trim", col_name=col, bevel=0.018)
    for i in range(9):
        py = -3.0 + i * 0.95
        add_box(f"Wainscot_W_Panel_{i}", (2.21, py, z0 + 0.78), (0.04, 0.72, 1.04), "Wood_Wainscot_Panel", col_name=col, bevel=0.012)

    # Lower Wainscoting under South & East windows (below sill height Z=5.3)
    add_box("Wainscot_South_Low", (6.2, -3.56, z0 + 0.42), (8.36, 0.10, 0.84), "Wood_Wainscot", col_name=col, bevel=0.012)
    add_box("Wainscot_East_Low", (10.36, 0.8, z0 + 0.42), (0.10, 8.76, 0.84), "Wood_Wainscot", col_name=col, bevel=0.012)

    # 5) HERO GREEN CHALKBOARD on North Wall (facing South -Y -> +Z in Three.js)
    cb_x, cb_y, cb_z = 6.2, 4.98, 6.62
    cb_w, cb_h = 5.4, 2.05
    add_planar_quad("Chalkboard_Surface", (cb_x, cb_y - 0.03, cb_z), cb_w, cb_h, "-Y", "Chalkboard_Green", col_name=col)
    add_box("Chalkboard_Backing", (cb_x, cb_y + 0.02, cb_z), (cb_w + 0.04, 0.07, cb_h + 0.04), "Wood_Desk_Dark", col_name=col)
    # Chunky Wooden Frame around Chalkboard
    ft = 0.13
    add_box("Chalkboard_FrameTop", (cb_x, cb_y - 0.03, cb_z + cb_h / 2 + ft / 2), (cb_w + 2 * ft, 0.14, ft), "Wood_Trim", col_name=col, bevel=0.02)
    add_box("Chalkboard_FrameBot", (cb_x, cb_y - 0.03, cb_z - cb_h / 2 - ft / 2), (cb_w + 2 * ft, 0.14, ft), "Wood_Trim", col_name=col, bevel=0.02)
    add_box("Chalkboard_FrameL", (cb_x - cb_w / 2 - ft / 2, cb_y - 0.03, cb_z), (ft, 0.14, cb_h), "Wood_Trim", col_name=col, bevel=0.02)
    add_box("Chalkboard_FrameR", (cb_x + cb_w / 2 + ft / 2, cb_y - 0.03, cb_z), (ft, 0.14, cb_h), "Wood_Trim", col_name=col, bevel=0.02)
    # Chalk Ledge Tray + 3D Eraser + Chalk Sticks (matching maxresdefault.jpg!)
    ledge_z = cb_z - cb_h / 2 - 0.10
    add_box("Chalkboard_Ledge", (cb_x, cb_y - 0.14, ledge_z), (cb_w + 0.20, 0.22, 0.07), "Wood_Trim", col_name=col, bevel=0.015)
    # 3D Chalkboard Eraser
    add_box("Chalk_EraserWood", (cb_x + 0.65, cb_y - 0.14, ledge_z + 0.075), (0.28, 0.10, 0.05), "Wood_Desk", col_name=col, bevel=0.01)
    add_box("Chalk_EraserFelt", (cb_x + 0.65, cb_y - 0.14, ledge_z + 0.045), (0.28, 0.10, 0.03), "Eraser_Felt", col_name=col)
    # 3D White Chalk Sticks
    add_cylinder("Chalk_Stick1", (cb_x - 0.45, cb_y - 0.13, ledge_z + 0.048), 0.014, 0.014, 0.14, 8, "Chalk_White", col_name=col, rot=(0, math.pi / 2, 0.12))
    add_cylinder("Chalk_Stick2", (cb_x - 0.20, cb_y - 0.16, ledge_z + 0.048), 0.014, 0.014, 0.11, 8, "Chalk_White", col_name=col, rot=(0, math.pi / 2, -0.25))

    # Small framed picture above Chalkboard (like top of maxresdefault.jpg!)
    add_box("TopFrame_Border", (cb_x - 0.85, 5.04, 7.90), (1.05, 0.08, 0.42), "Gold_Frame", col_name=col, bevel=0.015)
    add_planar_quad("TopFrame_Art", (cb_x - 0.85, 4.99, 7.90), 0.90, 0.30, "-Y", "Painting_Hills", col_name=col)

    # Framed Green Hills Landscape Painting on West Wall (matching frame 2!)
    add_box("WestPaint_Frame", (2.17, 1.2, 6.75), (0.09, 1.75, 1.25), "Gold_Frame", col_name=col, bevel=0.02)
    add_planar_quad("WestPaint_Canvas", (2.22, 1.2, 6.75), 1.55, 1.05, "+X", "Painting_Hills", col_name=col)

    # Wooden Classroom Door on West Wall (near South corner)
    add_box("Class_DoorFrame", (2.15, -2.2, z0 + 1.22), (0.14, 1.18, 2.44), "Wood_Trim", col_name=col, bevel=0.02)
    add_box("Class_DoorLeaf", (2.18, -2.2, z0 + 1.18), (0.08, 1.02, 2.34), "Door_Wood", col_name=col, bevel=0.015)
    add_icosphere("Class_DoorKnob", (2.26, -1.80, z0 + 1.05), 0.055, 2, "Gold_Frame", col_name=col)

    # 6) Student Desks (2 rows x 2 flanking columns leaving a clear center fly-through aisle!)
    desk_xs = [3.8, 8.6]
    desk_ys = [-0.8, 1.2]
    for r, dy in enumerate(desk_ys):
        for c, dx in enumerate(desk_xs):
            build_desk_unit(f"Desk_R{r}_C{c}", dx, dy, z0, col_name=col)

    # Teacher's Wooden Podium / Lectern off to the East side of chalkboard
    add_box("Teacher_Desk", (9.2, 3.65, z0 + 0.44), (1.15, 0.72, 0.88), "Wood_Wainscot", col_name=col, bevel=0.02)
    add_box("Teacher_DeskTop", (9.2, 3.65, z0 + 0.90), (1.28, 0.82, 0.08), "Wood_Trim", col_name=col, bevel=0.015)
    add_box("Teacher_Book", (9.05, 3.60, z0 + 0.96), (0.34, 0.24, 0.05), "Folder_Orange", col_name=col, rot=(0, 0, 0.22))


# ---------------------------------------------------------------------------
# 4. Named Camera / Character Waypoint Empties (exported into GLB!)
# ---------------------------------------------------------------------------
def add_waypoints():
    col = "Waypoints"
    # Coordinates in Blender (X, Y, Z) -> Three.js will be (X, Z, -Y)
    points = {
        "WP_Cam_Aerial": (-11.0, -21.0, 15.5),
        "WP_Cam_Courtyard": (3.2, -14.5, 8.8),
        "WP_Cam_WindowOut": (6.2, -7.2, 6.45),
        "WP_Cam_WindowIn": (6.2, -2.5, 6.30),
        "WP_Cam_ClassWide": (6.2, 0.6, 6.10),
        "WP_Cam_BoardClose": (6.2, 1.9, 6.05),
        "WP_Einstein_Pos": (5.25, 4.35, 4.50),
        "WP_Chalkboard_Center": (6.2, 4.94, 6.62),
    }
    for name, loc in points.items():
        emp = bpy.data.objects.new(name, None)
        emp.empty_display_type = "PLAIN_AXES"
        emp.location = Vector(loc)
        link_obj(emp, col)


# ---------------------------------------------------------------------------
# Main Build & Export
# ---------------------------------------------------------------------------
def main():
    clear_scene()
    init_materials()
    build_courtyard()
    build_school_exterior()
    build_classroom_interior()
    add_waypoints()

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from blender_opt import join_static_by_material
    join_static_by_material()

    # Stats summary
    total_objs = len([o for o in bpy.data.objects if o.type == "MESH"])
    total_tris = 0
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.calc_loop_triangles()
            total_tris += len(o.data.loop_triangles)

    print(f"[build_school_glb] Built {total_objs} meshes, {total_tris} triangles.")

    # Export clean self-contained GLB (Y-up for Three.js / Remotion)
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_apply=True,
    )
    size_kb = os.path.getsize(OUT_PATH) / 1024.0
    print(f"[build_school_glb] Exported -> {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
