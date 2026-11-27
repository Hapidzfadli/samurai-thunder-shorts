"""
Headless Blender 4.x script (HIGH-CRAFT BEVELED & SUBDIVIDED EDITION) for Set A:
  Modern Silicon Valley Exterior + Mountain View Social Services Building
  with seamlessly connected Modern Waiting Room Interior & animated sliding GlassDoor.

Visual Upgrades:
  - Beveled edges + smooth normals on architectural piers, furniture, cars, planters, counters
  - Sculpted ergonomic curved waiting chairs, smooth aerodynamic modern sedans, layered organic trees
  - High-res 1024x1024 architectural concrete, terrazzo, asphalt, and painted wall art textures
  - Soft baked floor contact-shadow / ambient-occlusion decals under furniture, planters, and cars
  - Material-batched static geometry (~45 draw calls) with animated GlassDoor_Left & GlassDoor_Right

Usage:
    blender --background --python scripts/build_wa_exterior_glb.py -- public/models/wa_exterior_welfare.glb
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
OUT_PATH = custom_args[0] if custom_args else os.path.abspath("public/models/wa_exterior_welfare.glb")
os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_image_from_rgba(name: str, rgba: np.ndarray):
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True)
    img.pixels.foreach_set(np.flipud(rgba).ravel().astype(np.float32))
    img.pack()
    return img


def gen_terrazzo_tile(name="terrazzo_hq"):
    w, h = 1024, 1024
    rng = np.random.default_rng(42)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.ones((h, w, 4), dtype=np.float32)
    subtle = 0.015 * np.sin(xx * 0.02) * np.cos(yy * 0.02) + rng.normal(0, 0.008, (h, w))
    img[:, :, 0] = np.clip(0.89 + subtle, 0.78, 0.96)
    img[:, :, 1] = np.clip(0.88 + subtle, 0.77, 0.95)
    img[:, :, 2] = np.clip(0.85 + subtle, 0.74, 0.93)
    # Multi-tone natural terrazzo chips
    palette = [(0.52, 0.54, 0.57), (0.72, 0.68, 0.62), (0.38, 0.42, 0.48), (0.95, 0.94, 0.91), (0.66, 0.58, 0.50)]
    for _ in range(3200):
        x = int(rng.integers(0, w - 8))
        y = int(rng.integers(0, h - 8))
        sx = int(rng.integers(2, 7))
        sy = int(rng.integers(2, 7))
        c = palette[int(rng.integers(0, len(palette)))]
        img[y:y + sy, x:x + sx, :3] = c
    # Fine architectural grout seams
    for g in range(0, w, 256):
        img[:, g:g + 3, :3] = (0.73, 0.72, 0.70)
        img[g:g + 3, :, :3] = (0.73, 0.72, 0.70)
    return make_image_from_rgba(name, img)


def gen_concrete_facade(name="concrete_hq"):
    w, h = 1024, 1024
    rng = np.random.default_rng(108)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    wave = 0.018 * np.sin(xx * 0.015 + yy * 0.008) + 0.010 * np.cos(yy * 0.03)
    noise = rng.normal(0, 0.012, size=(h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.87 + wave + noise, 0.74, 0.95)
    img[:, :, 1] = np.clip(0.85 + wave + noise, 0.72, 0.94)
    img[:, :, 2] = np.clip(0.81 + wave + noise, 0.68, 0.91)
    # Architectural panel joints + subtle tie-rod dots
    for y in range(0, h, 256):
        img[y:y + 4, :, :3] = (0.68, 0.66, 0.63)
        img[y + 4:y + 7, :, :3] = (0.92, 0.91, 0.88)
    for x in range(0, w, 512):
        img[:, x:x + 3, :3] = (0.69, 0.67, 0.64)
    return make_image_from_rgba(name, img)


def gen_asphalt(name="asphalt_hq"):
    w, h = 512, 512
    rng = np.random.default_rng(77)
    n = rng.normal(0, 0.028, size=(h, w))
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, 0] = np.clip(0.19 + n, 0.10, 0.30)
    img[:, :, 1] = np.clip(0.20 + n, 0.10, 0.31)
    img[:, :, 2] = np.clip(0.23 + n, 0.12, 0.34)
    return make_image_from_rgba(name, img)


def gen_soft_ao_shadow(name="ao_soft"):
    """Radial soft elliptical ambient occlusion shadow decal for grounding furniture/objects."""
    size = 256
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx = (xx - size / 2.0) / (size / 2.0)
    dy = (yy - size / 2.0) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)
    alpha = (np.clip(1.0 - r, 0.0, 1.0) ** 1.8) * 0.44
    img = np.zeros((size, size, 4), dtype=np.float32)
    img[:, :, 0] = 0.05
    img[:, :, 1] = 0.06
    img[:, :, 2] = 0.09
    img[:, :, 3] = alpha
    return make_image_from_rgba(name, img)


def gen_clock_dial(name="clock_modern", hour_deg=-150.0, min_deg=90.0):
    size = 512
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx = (xx - size / 2.0) / (size / 2.0)
    dy = (yy - size / 2.0) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)
    img = np.ones((size, size, 4), dtype=np.float32)
    img[:, :, :3] = (0.98, 0.98, 0.99)
    # Subtle inner bevel shading
    shade = np.clip((r - 0.72) * 0.35, 0, 0.12)
    img[:, :, 0] -= shade
    img[:, :, 1] -= shade
    img[:, :, 2] -= shade
    img[(r > 0.89) & (r < 0.98), :3] = (0.14, 0.16, 0.20)
    for k in range(12):
        th = k * (2.0 * math.pi / 12.0)
        tx = dx * math.cos(th) + dy * math.sin(th)
        ty = -dx * math.sin(th) + dy * math.cos(th)
        thick = 0.026 if k % 3 == 0 else 0.013
        inner = 0.66 if k % 3 == 0 else 0.75
        img[(tx > inner) & (tx < 0.84) & (np.abs(ty) < thick), :3] = (0.12, 0.14, 0.18)
    for deg, length, width in [(hour_deg, 0.45, 0.028), (min_deg, 0.66, 0.018)]:
        rad = math.radians(deg)
        tx = dx * math.cos(rad) + dy * math.sin(rad)
        ty = -dx * math.sin(rad) + dy * math.cos(rad)
        img[(tx > -0.06) & (tx < length) & (np.abs(ty) < width), :3] = (0.10, 0.12, 0.16)
    img[r < 0.05, :3] = (0.88, 0.22, 0.20)
    return make_image_from_rgba(name, img)


def gen_poster_art(name="poster_art", accent=(0.18, 0.56, 0.52), bg=(0.94, 0.96, 0.97)):
    w, h = 512, 640
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, :3] = bg
    # Minimalist geometric Bauhaus/civic art poster
    r1 = np.sqrt((u - 0.5) ** 2 + (v - 0.36) ** 2)
    img[r1 < 0.24, :3] = accent
    img[(u > 0.16) & (u < 0.84) & (v > 0.66) & (v < 0.71), :3] = (0.18, 0.22, 0.28)
    img[(u > 0.24) & (u < 0.76) & (v > 0.75) & (v < 0.78), :3] = (0.45, 0.50, 0.58)
    img[(u > 0.28) & (u < 0.72) & (v > 0.81) & (v < 0.84), :3] = (0.55, 0.60, 0.68)
    return make_image_from_rgba(name, img)


def make_mat(name, color, roughness=0.55, metallic=0.0, emission=None, emission_strength=0.0, alpha=1.0, img=None, uv_scale=(1.0, 1.0), use_alpha_img=False):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if alpha < 0.999 or use_alpha_img:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = "BLEND"
    if emission is not None and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if img is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (uv_scale[0], uv_scale[1], 1.0)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if use_alpha_img:
            nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    return mat


def _apply_box_uv(mesh, size, uv_fit=False):
    uv = mesh.uv_layers.new(name="UVMap")
    sx, sy, sz = max(size[0], 1e-4), max(size[1], 1e-4), max(size[2], 1e-4)
    for poly in mesh.polygons:
        n = poly.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            if uv_fit:
                if az >= ax and az >= ay:
                    uv.data[li].uv = (co.x / sx + 0.5, co.y / sy + 0.5)
                elif ax >= ay:
                    uv.data[li].uv = (co.y / sy + 0.5, co.z / sz + 0.5)
                else:
                    uv.data[li].uv = (co.x / sx + 0.5, co.z / sz + 0.5)
            else:
                if az >= ax and az >= ay:
                    uv.data[li].uv = (co.x * 0.35 + 0.5, co.y * 0.35 + 0.5)
                elif ax >= ay:
                    uv.data[li].uv = (co.y * 0.35 + 0.5, co.z * 0.35 + 0.5)
                else:
                    uv.data[li].uv = (co.x * 0.35 + 0.5, co.z * 0.35 + 0.5)


def add_box(name, loc, size, mat, rot=(0.0, 0.0, 0.0), parent=None, bevel=0.0, segs=2, smooth=False, uv_fit=False):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0.0:
        max_b = min(size[0], size[1], size[2]) * 0.42
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=min(bevel, max_b),
            segments=segs,
            affect="EDGES",
            clamp_overlap=True,
        )
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
    _apply_box_uv(mesh, size, uv_fit=uv_fit)
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot, "XYZ")
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def add_ao_decal(name, x, y, z, sx, sy, mat_ao):
    """Soft ambient-occlusion contact shadow decal hugging the floor under objects."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    hx, hy = sx * 0.5, sy * 0.5
    v0 = bm.verts.new((-hx, -hy, 0))
    v1 = bm.verts.new((hx, -hy, 0))
    v2 = bm.verts.new((hx, hy, 0))
    v3 = bm.verts.new((-hx, hy, 0))
    bm.faces.new((v0, v1, v2, v3))
    bm.to_mesh(mesh)
    bm.free()
    uv = mesh.uv_layers.new(name="UVMap")
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for i, u in enumerate(uvs):
        uv.data[i].uv = u
    obj.location = Vector((x, y, z))
    obj.data.materials.append(mat_ao)
    return obj


def add_cyl(name, loc, r, h, mat, segs=24, rot=(0.0, 0.0, 0.0), parent=None, r2=None, smooth=True):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segs,
        radius1=r, radius2=r if r2 is None else r2, depth=h,
    )
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot, "XYZ")
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def add_organic_blob(name, loc, r, mat, subdiv=2, scale=(1, 1, 1), seed=1, wobble=0.10):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    rng = np.random.default_rng(seed)
    for v in bm.verts:
        n = 1.0 + wobble * math.sin(v.co.x * 4.5 + seed) * math.cos(v.co.y * 4.2 - seed) + rng.uniform(-wobble * 0.4, wobble * 0.4)
        v.co.x *= scale[0] * n
        v.co.y *= scale[1] * n
        v.co.z *= scale[2] * n
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj.location = Vector(loc)
    obj.data.materials.append(mat)
    return obj


def add_disc_clock(name, loc, r, mat_face, mat_rim, rot=(math.pi / 2, 0.0, 0.0)):
    add_cyl(f"{name}_Rim", loc, r * 1.08, 0.045, mat_rim, segs=36, rot=rot)
    mesh = bpy.data.meshes.new(f"{name}_Face")
    obj = bpy.data.objects.new(f"{name}_Face", mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    segs = 36
    center = bm.verts.new((0, 0, 0))
    ring = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    for i in range(segs):
        bm.faces.new((center, ring[i], ring[(i + 1) % segs]))
    bm.to_mesh(mesh)
    bm.free()
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = (co.x / (2 * r) + 0.5, co.y / (2 * r) + 0.5)
    obj.location = Vector((loc[0], loc[1] - 0.028, loc[2]))
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.data.materials.append(mat_face)


def add_tree(prefix, x, y, z, scale, mats, seed=10):
    h = 2.65 * scale
    # Tapered trunk + 2 angled branches
    add_cyl(f"{prefix}_Trunk", (x, y, z + h * 0.5), 0.17 * scale, h, mats["bark"], segs=14, r2=0.09 * scale)
    add_cyl(f"{prefix}_Br1", (x - 0.35 * scale, y + 0.15 * scale, z + h * 0.78), 0.07 * scale, 1.1 * scale, mats["bark"], segs=10, r2=0.04 * scale, rot=(0.2, -0.55, 0))
    add_cyl(f"{prefix}_Br2", (x + 0.38 * scale, y - 0.12 * scale, z + h * 0.80), 0.07 * scale, 1.0 * scale, mats["bark"], segs=10, r2=0.04 * scale, rot=(-0.2, 0.55, 0))
    # Smooth lush organic layered canopy (subdiv=2 + smooth normals)
    blobs = [
        (0.0, 0.0, h + 0.62 * scale, 1.08 * scale, mats["leaf1"]),
        (-0.62 * scale, 0.28 * scale, h + 0.38 * scale, 0.82 * scale, mats["leaf2"]),
        (0.64 * scale, -0.22 * scale, h + 0.44 * scale, 0.80 * scale, mats["leaf2"]),
        (0.08 * scale, -0.45 * scale, h + 0.96 * scale, 0.78 * scale, mats["leaf3"]),
        (-0.22 * scale, 0.46 * scale, h + 0.88 * scale, 0.72 * scale, mats["leaf1"]),
    ]
    for idx, (dx, dy, dz, r, m) in enumerate(blobs):
        add_organic_blob(f"{prefix}_Crown{idx}", (x + dx, y + dy, z + dz), r, m, subdiv=2, scale=(1.05, 1.05, 0.84), seed=seed + idx * 7, wobble=0.11)


def add_modern_car(prefix, x, y, z, body_mat, mats, rot_z=0.0):
    """Aerodynamic beveled modern EV sedan with smooth wheel arches & lights."""
    def rpt(lx, ly):
        c, s = math.cos(rot_z), math.sin(rot_z)
        return x + lx * c - ly * s, y + lx * s + ly * c

    add_ao_decal(f"{prefix}_AO", x, y, z + 0.025, 4.7, 2.25, mats["ao_soft"])
    cx, cy = rpt(0, 0)
    add_box(f"{prefix}_Lower", (cx, cy, z + 0.50), (4.30, 1.82, 0.60), body_mat, (0, 0, rot_z), bevel=0.14, segs=3, smooth=True)
    # Sculpted curved greenhouse cabin
    cx2, cy2 = rpt(-0.18, 0)
    add_box(f"{prefix}_Cabin", (cx2, cy2, z + 1.02), (2.30, 1.56, 0.58), body_mat, (0, 0, rot_z), bevel=0.18, segs=3, smooth=True)
    add_box(f"{prefix}_Glass", (cx2, cy2, z + 1.04), (2.34, 1.50, 0.44), mats["car_glass"], (0, 0, rot_z), bevel=0.12, segs=2, smooth=True)
    # LED lightbars
    hx, hy = rpt(2.12, 0)
    add_box(f"{prefix}_Head", (hx, hy, z + 0.58), (0.06, 1.48, 0.11), mats["lamp_warm"], (0, 0, rot_z), bevel=0.02, segs=2, smooth=True)
    tx, ty = rpt(-2.12, 0)
    add_box(f"{prefix}_Tail", (tx, ty, z + 0.58), (0.06, 1.50, 0.10), mats["led_red"], (0, 0, rot_z), bevel=0.02, segs=2, smooth=True)
    # 4 Smooth wheels + alloy rims
    for i, (wx, wy) in enumerate([(-1.30, -0.86), (-1.30, 0.86), (1.30, -0.86), (1.30, 0.86)]):
        px, py = rpt(wx, wy)
        add_cyl(f"{prefix}_Tire{i}", (px, py, z + 0.34), 0.34, 0.24, mats["tire"], segs=22, rot=(math.pi / 2, 0, rot_z))
        add_cyl(f"{prefix}_Rim{i}", (px, py, z + 0.34), 0.21, 0.26, mats["chrome"], segs=18, rot=(math.pi / 2, 0, rot_z))


def add_indoor_plant(prefix, x, y, z, scale, mats):
    """High-craft indoor monstera/ficus with smooth ceramic planter & arching leaves."""
    add_ao_decal(f"{prefix}_AO", x, y, z + 0.012, 0.95 * scale, 0.95 * scale, mats["ao_soft"])
    add_cyl(f"{prefix}_Pot", (x, y, z + 0.28 * scale), 0.20 * scale, 0.56 * scale, mats["planter"], segs=24, r2=0.25 * scale)
    add_cyl(f"{prefix}_PotRim", (x, y, z + 0.56 * scale), 0.26 * scale, 0.04 * scale, mats["planter"], segs=24)
    add_cyl(f"{prefix}_Soil", (x, y, z + 0.55 * scale), 0.22 * scale, 0.03 * scale, mats["bark"], segs=18)
    # 7 arching lush leaves
    for k in range(7):
        ang = k * (2 * math.pi / 7.0) + 0.3
        rad = 0.22 * scale
        lh = (0.72 + (k % 3) * 0.16) * scale
        lx = x + math.cos(ang) * rad
        ly = y + math.sin(ang) * rad
        add_cyl(f"{prefix}_Stem{k}", (x + math.cos(ang) * rad * 0.45, y + math.sin(ang) * rad * 0.45, z + lh * 0.65),
                0.014 * scale, lh * 0.72, mats["leaf1"], segs=8, rot=(math.sin(ang) * 0.35, -math.cos(ang) * 0.35, 0))
        add_organic_blob(f"{prefix}_Leaf{k}", (lx, ly, z + lh), 0.21 * scale,
                         mats["leaf2"] if k % 2 == 0 else mats["leaf1"], subdiv=2, scale=(1.25, 0.85, 0.32), seed=k * 19 + 3, wobble=0.06)


def build():
    clear_scene()
    mats = {
        "concrete": make_mat("Concrete", (0.87, 0.85, 0.81), roughness=0.62, img=gen_concrete_facade(), uv_scale=(1.2, 1.2)),
        "concrete_dark": make_mat("ConcreteDark", (0.56, 0.58, 0.61), roughness=0.68),
        "charcoal": make_mat("CharcoalMetal", (0.14, 0.16, 0.20), roughness=0.28, metallic=0.68),
        "chrome": make_mat("Chrome", (0.86, 0.89, 0.92), roughness=0.14, metallic=0.92),
        "wood_slat": make_mat("WoodSlat", (0.64, 0.44, 0.26), roughness=0.42),
        "wood_desk": make_mat("WoodDesk", (0.74, 0.56, 0.38), roughness=0.36),
        "glass_ext": make_mat("GlassExt", (0.30, 0.54, 0.76), roughness=0.06, metallic=0.35, alpha=0.48),
        "glass_door": make_mat("GlassDoor", (0.56, 0.78, 0.92), roughness=0.05, metallic=0.22, alpha=0.30),
        "glass_counter": make_mat("GlassCounter", (0.76, 0.88, 0.96), roughness=0.06, metallic=0.15, alpha=0.24),
        "terrazzo": make_mat("Terrazzo", (0.89, 0.88, 0.85), roughness=0.22, img=gen_terrazzo_tile(), uv_scale=(2.8, 2.4)),
        "wall_int": make_mat("WallInt", (0.94, 0.94, 0.92), roughness=0.70),
        "wall_accent": make_mat("WallAccent", (0.20, 0.34, 0.50), roughness=0.58),
        "ceiling": make_mat("Ceiling", (0.96, 0.96, 0.97), roughness=0.80),
        "asphalt": make_mat("Asphalt", (0.19, 0.20, 0.23), roughness=0.84, img=gen_asphalt(), uv_scale=(5.0, 2.5)),
        "road_line": make_mat("RoadLine", (0.95, 0.80, 0.22), roughness=0.55),
        "sidewalk": make_mat("Sidewalk", (0.80, 0.79, 0.76), roughness=0.74),
        "grass": make_mat("Grass", (0.26, 0.52, 0.24), roughness=0.88),
        "planter": make_mat("Planter", (0.72, 0.71, 0.69), roughness=0.58),
        "bark": make_mat("Bark", (0.34, 0.24, 0.16), roughness=0.88),
        "leaf1": make_mat("Leaf1", (0.18, 0.47, 0.21), roughness=0.62),
        "leaf2": make_mat("Leaf2", (0.27, 0.58, 0.25), roughness=0.58),
        "leaf3": make_mat("Leaf3", (0.35, 0.65, 0.29), roughness=0.56),
        "chair_blue": make_mat("ChairBlue", (0.20, 0.40, 0.64), roughness=0.48),
        "white_matte": make_mat("WhiteMatte", (0.96, 0.96, 0.97), roughness=0.38),
        "paper": make_mat("Paper", (0.98, 0.97, 0.94), roughness=0.72),
        "screen_blue": make_mat("ScreenBlue", (0.22, 0.58, 0.92), roughness=0.16, emission=(0.25, 0.64, 0.96), emission_strength=1.2),
        "led_panel": make_mat("LedPanel", (0.99, 0.99, 1.0), roughness=0.18, emission=(0.99, 0.99, 1.0), emission_strength=1.7),
        "lamp_warm": make_mat("LampWarm", (1.0, 0.90, 0.68), roughness=0.16, emission=(1.0, 0.88, 0.60), emission_strength=2.2),
        "led_red": make_mat("LedRed", (0.96, 0.20, 0.18), roughness=0.18, emission=(0.98, 0.22, 0.18), emission_strength=1.8),
        "water_jug": make_mat("WaterJug", (0.45, 0.80, 0.98), roughness=0.10, metallic=0.12, alpha=0.58),
        "car_silver": make_mat("CarSilver", (0.80, 0.83, 0.88), roughness=0.18, metallic=0.72),
        "car_navy": make_mat("CarNavy", (0.14, 0.25, 0.44), roughness=0.18, metallic=0.65),
        "car_glass": make_mat("CarGlass", (0.08, 0.14, 0.22), roughness=0.08, metallic=0.45),
        "tire": make_mat("Tire", (0.10, 0.10, 0.12), roughness=0.86),
        "skyline_bldg": make_mat("SkylineBldg", (0.46, 0.56, 0.70), roughness=0.32, metallic=0.40),
        "skyline_win": make_mat("SkylineWin", (0.76, 0.86, 0.96), roughness=0.12, metallic=0.55),
        "poster_teal": make_mat("PosterTeal", (1, 1, 1), roughness=0.45, img=gen_poster_art("p_teal", (0.16, 0.58, 0.54))),
        "poster_amber": make_mat("PosterAmber", (1, 1, 1), roughness=0.45, img=gen_poster_art("p_amber", (0.86, 0.54, 0.18))),
        "clock_face": make_mat("ClockFace", (1, 1, 1), roughness=0.32, img=gen_clock_dial("clock_modern", -150.0, 90.0)),
        "ao_soft": make_mat("AoSoft", (0.04, 0.05, 0.08), roughness=1.0, img=gen_soft_ao_shadow(), use_alpha_img=True),
    }

    # ==================== 1. SITE, STREET, PLAZA & SILICON VALLEY SKYLINE ====================
    add_box("Ground_Grass", (0, -4.0, -0.10), (60.0, 52.0, 0.20), mats["grass"])
    add_box("Plaza_Main", (0, -7.2, 0.02), (25.0, 9.2, 0.12), mats["sidewalk"], bevel=0.03, segs=2, smooth=True)
    add_box("Plaza_Curb", (0, -11.9, 0.04), (52.0, 0.36, 0.16), mats["concrete_dark"], bevel=0.03, segs=2, smooth=True)
    add_box("Road_Main", (0, -16.8, -0.02), (60.0, 9.6, 0.08), mats["asphalt"])
    for x in range(-22, 24, 4):
        add_box(f"Road_Dash_{x}", (x, -16.8, 0.03), (2.0, 0.16, 0.015), mats["road_line"])
    add_box("Road_SidewalkFar", (0, -22.8, 0.03), (60.0, 2.6, 0.12), mats["sidewalk"])

    # Distant sleek Silicon Valley glass office towers
    skyline_specs = [
        (-19, 12, 7.5, 6.0, 14.5), (-13, 18, 8.5, 6.5, 20.0),
        (16, 15, 8.0, 6.0, 17.5), (22, 11, 6.5, 6.0, 13.0), (0, 24, 14.5, 7.0, 22.0),
    ]
    for idx, (bx, by, bw, bd, bh) in enumerate(skyline_specs):
        add_box(f"Skyline_{idx}", (bx, by, bh * 0.5), (bw, bd, bh), mats["skyline_bldg"], bevel=0.12, segs=2, smooth=True)
        for fl in range(1, int(bh // 2.8)):
            add_box(f"SkylineWin_{idx}_{fl}", (bx, by - bd * 0.5 - 0.04, fl * 2.6 + 0.6), (bw * 0.88, 0.08, 1.30), mats["skyline_win"])

    # ==================== 2. BUILDING SHELL (BEVELED MODERN ARCHITECTURE) ====================
    add_box("Bldg_Slab", (0, 0.8, 0.125), (14.4, 10.2, 0.25), mats["concrete_dark"], bevel=0.03, segs=2, smooth=True)
    add_box("Front_Step1", (0, -4.65, 0.06), (5.5, 1.32, 0.12), mats["concrete_dark"], bevel=0.025, segs=2, smooth=True)
    add_box("Front_Step2", (0, -4.35, 0.18), (4.7, 0.76, 0.12), mats["concrete_dark"], bevel=0.025, segs=2, smooth=True)
    add_ao_decal("Bldg_FrontAO", 0, -4.8, 0.088, 14.8, 2.8, mats["ao_soft"])

    # Interior terrazzo floor + sleek baseboard skirting
    add_box("Int_Floor", (0, 0.8, 0.255), (13.6, 9.4, 0.02), mats["terrazzo"])
    add_box("Int_Ceiling", (0, 0.8, 4.05), (13.6, 9.4, 0.14), mats["ceiling"])
    add_box("Wall_Back_Ext", (0, 5.65, 4.35), (14.4, 0.30, 8.70), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Wall_Back_Int", (0, 5.45, 2.15), (13.6, 0.08, 3.85), mats["wall_int"])
    add_box("Wall_Back_Accent", (0, 5.38, 2.25), (9.2, 0.08, 3.10), mats["wall_accent"], bevel=0.02, segs=2, smooth=True)
    add_box("Wall_Back_Baseboard", (0, 5.36, 0.34), (13.5, 0.08, 0.16), mats["charcoal"])
    for side, sx in [("L", -7.0), ("R", 7.0)]:
        add_box(f"Wall_Side_{side}", (sx, 0.8, 4.35), (0.36, 10.0, 8.70), mats["concrete"], bevel=0.04, segs=2, smooth=True)
        add_box(f"Wall_SideInt_{side}", (sx + (0.20 if sx < 0 else -0.20), 0.8, 2.15), (0.06, 9.4, 3.85), mats["wall_int"])

    # Beveled Front Facade Wall with REAL DOORWAY OPENING (X in [-1.55, +1.55])
    add_box("Front_Pier_FarL", (-6.25, -4.0, 2.15), (1.90, 0.34, 3.85), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Front_Pier_FarR", (6.25, -4.0, 2.15), (1.90, 0.34, 3.85), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Front_Pier_MidL", (-2.15, -4.0, 2.15), (1.20, 0.34, 3.85), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Front_Pier_MidR", (2.15, -4.0, 2.15), (1.20, 0.34, 3.85), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    for side, wx in [("L", -4.02), ("R", 4.02)]:
        add_box(f"Front_Sill_{side}", (wx, -4.0, 0.62), (2.60, 0.34, 0.74), mats["concrete"], bevel=0.03, segs=2, smooth=True)
        add_box(f"Front_Head_{side}", (wx, -4.0, 3.65), (2.60, 0.34, 0.82), mats["concrete"], bevel=0.03, segs=2, smooth=True)
        add_box(f"Front_WinGlass_{side}", (wx, -4.0, 2.12), (2.52, 0.06, 2.26), mats["glass_ext"])
        add_box(f"Front_WinMulV_{side}", (wx, -4.0, 2.12), (0.07, 0.16, 2.26), mats["charcoal"], bevel=0.012, segs=2, smooth=True)
        add_box(f"Front_WinMulH_{side}", (wx, -4.0, 2.12), (2.54, 0.16, 0.07), mats["charcoal"], bevel=0.012, segs=2, smooth=True)
    add_box("Front_Door_Transom", (0, -4.0, 3.65), (3.20, 0.34, 0.98), mats["concrete"], bevel=0.03, segs=2, smooth=True)
    add_box("DoorFrame_L", (-1.56, -4.0, 1.70), (0.11, 0.38, 2.90), mats["charcoal"], bevel=0.018, segs=2, smooth=True)
    add_box("DoorFrame_R", (1.56, -4.0, 1.70), (0.11, 0.38, 2.90), mats["charcoal"], bevel=0.018, segs=2, smooth=True)
    add_box("DoorFrame_Top", (0, -4.0, 3.16), (3.22, 0.38, 0.11), mats["charcoal"], bevel=0.018, segs=2, smooth=True)

    # ANIMATED SLIDING GLASS DOORS (excluded from batching via prefix "GlassDoor")
    for side, dx in [("Left", -0.76), ("Right", 0.76)]:
        piv = bpy.data.objects.new(f"GlassDoor_{side}", None)
        bpy.context.collection.objects.link(piv)
        piv.location = Vector((dx, -4.0, 0.25))
        add_box(f"GlassDoor_{side}_Pane", (0, 0, 1.42), (1.46, 0.04, 2.80), mats["glass_door"], parent=piv)
        add_box(f"GlassDoor_{side}_TopBar", (0, 0, 2.80), (1.50, 0.08, 0.08), mats["charcoal"], parent=piv, bevel=0.012, segs=2, smooth=True)
        add_box(f"GlassDoor_{side}_BotBar", (0, 0, 0.08), (1.50, 0.08, 0.16), mats["charcoal"], parent=piv, bevel=0.012, segs=2, smooth=True)
        add_box(f"GlassDoor_{side}_MidBar", (0, 0, 1.12), (1.48, 0.06, 0.06), mats["charcoal"], parent=piv, bevel=0.01, segs=2, smooth=True)
        hx = 0.62 if side == "Left" else -0.62
        add_cyl(f"GlassDoor_{side}_Handle", (hx, -0.07, 1.25), 0.022, 0.65, mats["chrome"], segs=16, parent=piv)

    # Second Floor Modern Curtain Wall + Wood Louvers
    add_box("Floor2_Belt", (0, -4.08, 4.25), (14.65, 0.50, 0.36), mats["charcoal"], bevel=0.035, segs=2, smooth=True)
    add_box("Floor2_WallL", (-6.35, -4.0, 6.40), (1.70, 0.34, 4.30), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Floor2_WallR", (6.35, -4.0, 6.40), (1.70, 0.34, 4.30), mats["concrete"], bevel=0.04, segs=2, smooth=True)
    add_box("Floor2_GlassBand", (0, -3.98, 6.35), (11.1, 0.08, 3.30), mats["glass_ext"])
    for mx in [-5.5, -3.6, -1.8, 0.0, 1.8, 3.6, 5.5]:
        add_box(f"Floor2_Mullion_{mx:.1f}", (mx, -4.02, 6.35), (0.10, 0.20, 3.50), mats["charcoal"], bevel=0.015, segs=2, smooth=True)
    add_box("Floor2_MullionH", (0, -4.02, 6.35), (11.2, 0.18, 0.10), mats["charcoal"], bevel=0.015, segs=2, smooth=True)
    for side_x in (-6.35, 6.35):
        for k in range(-3, 4):
            add_box(f"Louver_{side_x:.1f}_{k}", (side_x + k * 0.22, -4.22, 6.35), (0.08, 0.16, 3.85), mats["wood_slat"], bevel=0.015, segs=2, smooth=True)
    add_box("Roof_Slab", (0, 0.8, 8.65), (14.8, 10.6, 0.36), mats["concrete_dark"], bevel=0.05, segs=2, smooth=True)
    add_box("Roof_Parapet_F", (0, -4.15, 8.95), (14.8, 0.34, 0.45), mats["charcoal"], bevel=0.035, segs=2, smooth=True)
    add_box("Roof_HVAC1", (-3.5, 1.5, 9.25), (2.2, 1.6, 0.9), mats["concrete_dark"], bevel=0.04, segs=2, smooth=True)
    add_box("Roof_HVAC2", (3.8, 2.0, 9.18), (1.8, 1.4, 0.75), mats["concrete_dark"], bevel=0.04, segs=2, smooth=True)

    # Beveled Canopy + Wood Slat Ceiling + Signboard
    add_box("Canopy_Frame", (0, -5.25, 3.62), (5.45, 2.38, 0.18), mats["charcoal"], bevel=0.03, segs=2, smooth=True)
    for k in range(-9, 10):
        add_box(f"Canopy_Slat_{k}", (k * 0.26, -5.25, 3.53), (0.14, 2.15, 0.04), mats["wood_slat"], bevel=0.008, segs=2, smooth=True)
    for lx in (-1.4, 0.0, 1.4):
        add_cyl(f"Canopy_Light_{lx:.1f}", (lx, -5.25, 3.50), 0.11, 0.03, mats["lamp_warm"], segs=18)
    add_cyl("Canopy_ColL", (-2.45, -6.15, 1.85), 0.095, 3.55, mats["charcoal"], segs=18)
    add_cyl("Canopy_ColR", (2.45, -6.15, 1.85), 0.095, 3.55, mats["charcoal"], segs=18)
    add_box("Signboard_Back", (0, -4.25, 4.78), (6.45, 0.18, 0.98), mats["charcoal"], bevel=0.03, segs=2, smooth=True)
    add_box("Signboard_Trim", (0, -4.34, 4.78), (6.2, 0.04, 0.82), mats["wall_accent"])

    # ==================== 3. EXTERIOR PROPS (PLAZA, LUSH TREES, SMOOTH CARS) ====================
    for idx, px in enumerate((-8.2, -5.6, 5.6, 8.2)):
        add_ao_decal(f"PlanterAO_{idx}", px, -6.4, 0.09, 2.25, 2.25, mats["ao_soft"])
        add_box(f"Planter_{idx}", (px, -6.4, 0.34), (1.78, 1.78, 0.56), mats["planter"], bevel=0.05, segs=3, smooth=True)
        add_tree(f"Tree_{idx}", px, -6.4, 0.58, 1.06 if abs(px) > 7 else 0.86, mats, seed=30 + idx * 17)

    for lx in (-9.8, -3.9, 3.9, 9.8):
        add_cyl(f"StreetPole_{lx:.1f}", (lx, -10.8, 2.3), 0.08, 4.6, mats["charcoal"], segs=16, r2=0.055)
        add_box(f"StreetArm_{lx:.1f}", (lx, -11.2, 4.55), (0.10, 0.90, 0.08), mats["charcoal"], bevel=0.02, segs=2, smooth=True)
        add_box(f"StreetLamp_{lx:.1f}", (lx, -11.55, 4.49), (0.28, 0.45, 0.06), mats["lamp_warm"], bevel=0.015, segs=2, smooth=True)

    for bx in (-4.4, 4.4):
        add_ao_decal(f"BenchAO_{bx:.1f}", bx, -9.2, 0.09, 2.25, 0.95, mats["ao_soft"])
        add_box(f"Bench_Seat_{bx:.1f}", (bx, -9.2, 0.48), (1.88, 0.56, 0.08), mats["wood_slat"], bevel=0.025, segs=2, smooth=True)
        add_box(f"Bench_Back_{bx:.1f}", (bx, -8.94, 0.78), (1.88, 0.07, 0.36), mats["wood_slat"], (-0.16, 0, 0), bevel=0.022, segs=2, smooth=True)
        add_box(f"Bench_LegL_{bx:.1f}", (bx - 0.75, -9.2, 0.24), (0.08, 0.50, 0.46), mats["charcoal"], bevel=0.015, segs=2, smooth=True)
        add_box(f"Bench_LegR_{bx:.1f}", (bx + 0.75, -9.2, 0.24), (0.08, 0.50, 0.46), mats["charcoal"], bevel=0.015, segs=2, smooth=True)

    add_cyl("TrashBin_R", (3.15, -6.4, 0.48), 0.22, 0.88, mats["chrome"], segs=20)
    add_cyl("TrashBin_Top", (3.15, -6.4, 0.94), 0.23, 0.06, mats["charcoal"], segs=20)
    for bx in (-2.9, 2.9):
        add_cyl(f"Bollard_{bx:.1f}", (bx, -7.8, 0.42), 0.09, 0.80, mats["charcoal"], segs=18)
        add_cyl(f"BollardGlow_{bx:.1f}", (bx, -7.8, 0.74), 0.092, 0.14, mats["lamp_warm"], segs=18)
    add_modern_car("Car_Silver", -6.5, -13.6, 0.02, mats["car_silver"], mats, rot_z=0.0)
    add_modern_car("Car_Navy", 6.8, -13.6, 0.02, mats["car_navy"], mats, rot_z=math.pi)

    # ==================== 4. INTERIOR: MODERN SOCIAL SERVICES WAITING ROOM ====================
    for lx in (-3.6, 0.0, 3.6):
        for ly in (-1.2, 2.4):
            add_box(f"CeilLED_{lx:.1f}_{ly:.1f}", (lx, ly, 3.97), (1.52, 0.66, 0.04), mats["led_panel"], bevel=0.01, segs=2, smooth=True)

    # Beveled Service Counter + Glass Teller Shields
    add_ao_decal("CounterAO", 0, 3.35, 0.268, 10.2, 1.65, mats["ao_soft"])
    add_box("Counter_Base", (0, 3.55, 0.78), (9.6, 0.85, 1.04), mats["white_matte"], bevel=0.03, segs=2, smooth=True)
    add_box("Counter_Top", (0, 3.50, 1.32), (9.85, 1.04, 0.08), mats["wood_desk"], bevel=0.025, segs=3, smooth=True)
    for px in (-4.6, -1.55, 1.55, 4.6):
        add_cyl(f"Counter_Post_{px:.1f}", (px, 3.12, 1.88), 0.035, 1.12, mats["chrome"], segs=14)
    add_box("Counter_Glass", (0, 3.12, 1.92), (9.15, 0.04, 0.96), mats["glass_counter"])
    for mx in (-3.0, 0.0, 3.0):
        add_box(f"Clerk_Mon_{mx:.1f}", (mx, 3.72, 1.66), (0.62, 0.045, 0.38), mats["charcoal"], bevel=0.014, segs=2, smooth=True)
        add_box(f"Clerk_Scr_{mx:.1f}", (mx, 3.695, 1.66), (0.56, 0.02, 0.33), mats["screen_blue"])
        add_cyl(f"Clerk_Stand_{mx:.1f}", (mx, 3.74, 1.43), 0.03, 0.18, mats["chrome"], segs=12)
        add_box(f"Clerk_KB_{mx:.1f}", (mx, 3.52, 1.38), (0.42, 0.14, 0.025), mats["charcoal"], bevel=0.008, segs=2, smooth=True)
        add_box(f"Brochure_{mx:.1f}", (mx + 0.65, 3.22, 1.46), (0.20, 0.12, 0.22), mats["paper"], bevel=0.01, segs=2, smooth=True)

    add_box("QueueBoard_Frame", (0, 5.30, 3.15), (1.98, 0.12, 0.66), mats["charcoal"], bevel=0.025, segs=2, smooth=True)
    add_box("QueueBoard_Glow", (0, 5.23, 3.15), (1.75, 0.03, 0.45), mats["led_red"])
    add_disc_clock("Int_Clock", (3.5, 5.30, 3.05), 0.36, mats["clock_face"], mats["charcoal"])
    add_box("Poster_L_Frame", (-3.55, 5.30, 2.55), (1.12, 0.06, 1.38), mats["charcoal"], bevel=0.018, segs=2, smooth=True)
    add_box("Poster_L_Art", (-3.55, 5.26, 2.55), (0.98, 0.03, 1.24), mats["poster_teal"], uv_fit=True)
    add_box("Poster_R_Frame", (3.55, 5.30, 2.05), (1.06, 0.06, 1.02), mats["charcoal"], bevel=0.018, segs=2, smooth=True)
    add_box("Poster_R_Art", (3.55, 5.26, 2.05), (0.93, 0.03, 0.88), mats["poster_amber"], uv_fit=True)

    # Contoured Waiting Room Chairs
    for side_x in (-4.0, 4.0):
        add_ao_decal(f"WaitAO_{side_x:.1f}", side_x, 0.3, 0.268, 1.05, 3.1, mats["ao_soft"])
        add_box(f"WaitBeam_{side_x:.1f}", (side_x, 0.3, 0.64), (0.10, 2.6, 0.08), mats["chrome"], bevel=0.02, segs=2, smooth=True)
        for row_y in (-0.75, 0.30, 1.35):
            facing = -1 if side_x > 0 else 1
            add_box(f"WaitSeat_{side_x:.1f}_{row_y:.2f}", (side_x, row_y, 0.72), (0.56, 0.52, 0.09), mats["chair_blue"], bevel=0.038, segs=3, smooth=True)
            add_box(f"WaitBack_{side_x:.1f}_{row_y:.2f}", (side_x - facing * 0.25, row_y, 1.05), (0.09, 0.50, 0.56), mats["chair_blue"], bevel=0.038, segs=3, smooth=True)
            add_cyl(f"WaitLeg_{side_x:.1f}_{row_y:.2f}", (side_x, row_y, 0.48), 0.032, 0.44, mats["chrome"], segs=12)

    for qx in (-1.65, 1.65):
        for qy in (-1.6, 0.4, 2.1):
            add_cyl(f"StanchionBase_{qx:.1f}_{qy:.1f}", (qx, qy, 0.29), 0.16, 0.05, mats["chrome"], segs=18)
            add_cyl(f"StanchionPost_{qx:.1f}_{qy:.1f}", (qx, qy, 0.76), 0.03, 0.92, mats["chrome"], segs=14)
        add_box(f"QueueBelt_{qx:.1f}", (qx, 0.25, 1.12), (0.025, 3.7, 0.06), mats["chair_blue"])

    add_box("FormTable_Top", (-5.5, 2.2, 1.18), (0.86, 1.86, 0.06), mats["wood_desk"], bevel=0.02, segs=2, smooth=True)
    add_box("FormTable_Leg1", (-5.5, 1.45, 0.71), (0.75, 0.07, 0.92), mats["charcoal"], bevel=0.015, segs=2, smooth=True)
    add_box("FormTable_Leg2", (-5.5, 2.95, 0.71), (0.75, 0.07, 0.92), mats["charcoal"], bevel=0.015, segs=2, smooth=True)
    add_box("FormStack1", (-5.45, 1.85, 1.26), (0.30, 0.42, 0.10), mats["paper"], bevel=0.008, segs=2, smooth=True)
    add_box("FormStack2", (-5.45, 2.55, 1.25), (0.30, 0.42, 0.08), mats["paper"], bevel=0.008, segs=2, smooth=True)

    add_box("Dispenser_Body", (5.8, 3.2, 0.85), (0.48, 0.48, 1.20), mats["white_matte"], bevel=0.04, segs=3, smooth=True)
    add_cyl("Dispenser_Jug", (5.8, 3.2, 1.72), 0.18, 0.56, mats["water_jug"], segs=20)
    add_indoor_plant("IntPlant_L", -5.8, -2.5, 0.25, 1.15, mats)
    add_indoor_plant("IntPlant_R", 5.8, -2.5, 0.25, 1.15, mats)
    add_indoor_plant("IntPlant_BackL", -5.7, 4.4, 0.25, 1.0, mats)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from blender_opt import join_static_by_material
    join_static_by_material(exclude_prefixes=("GlassDoor",))

    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"Exported HQ Set A: {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1e6:.2f} MB)")


if __name__ == "__main__":
    build()
