"""
Headless Blender 4.x script (HIGH-CRAFT BEVELED & SUBDIVIDED EDITION) for Sets B, C, D:
  Set B (X =  0): Modern Programmer Apartment at Night (cinematic 1024px bokeh skyline, beveled desk/monitors, plush sofa, AO decals)
  Set C (X = 28): Modern Glass Tech HQ & WhatsApp Startup Office (beveled oak slat wall, sleek workstations, espresso bar, server rack, wall art)
  Set D (X = 56): Executive Penthouse Boardroom at Golden Hour (painted Bay Area sunset clouds, veined dark marble table, gold LED ring chandelier, contoured caramel leather chairs)

Usage:
    blender --background --python scripts/build_wa_spaces_glb.py -- public/models/wa_modern_spaces.glb
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
OUT_PATH = custom_args[0] if custom_args else os.path.abspath("public/models/wa_modern_spaces.glb")
os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_image_from_rgba(name: str, rgba: np.ndarray):
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name=name, width=w, height=h, alpha=True)
    img.pixels.foreach_set(np.flipud(rgba).ravel().astype(np.float32))
    img.pack()
    return img


def gen_wood_planks(name, tones, seed=10):
    w, h = 1024, 1024
    img = np.ones((h, w, 4), dtype=np.float32)
    rng = np.random.default_rng(seed)
    n = 8
    ph = h // n
    for i in range(n):
        y0, y1 = i * ph, (i + 1) * ph if i < n - 1 else h
        c = tones[i % len(tones)]
        yy = np.linspace(0, 1, y1 - y0)[:, None]
        xx = np.linspace(0, 1, w)[None, :]
        grain = (
            0.022 * np.sin(yy * 32.0 + 1.8 * np.sin(xx * 5.0 + i))
            + 0.010 * np.sin(yy * 75.0 + xx * 3.0)
            + 0.008 * rng.normal(size=(y1 - y0, w))
        )
        for ch in range(3):
            img[y0:y1, :, ch] = np.clip(c[ch] + grain, 0.04, 0.96)
        img[y0:y0 + 3, :, :3] = (c[0] * 0.42, c[1] * 0.42, c[2] * 0.42)
        jx = int(((i * 317 + 160) % (w - 140)) + 70)
        img[y0:y1, jx:jx + 3, :3] = (c[0] * 0.42, c[1] * 0.42, c[2] * 0.42)
    return make_image_from_rgba(name, img)


def gen_marble_dark(name="marble_dark_hq"):
    """Rich veined dark Nero Marquina marble with subtle gold & white veins."""
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) / float(w)
    warp = 0.25 * np.sin(xx * 9.0 + yy * 5.0) + 0.14 * np.cos(xx * 18.0 - yy * 14.0)
    vein1 = np.exp(-((np.sin((xx * 4.5 + yy * 3.2 + warp) * math.pi)) ** 2) * 55.0)
    vein2 = np.exp(-((np.sin((xx * 9.0 - yy * 7.5 + warp * 1.4) * math.pi)) ** 2) * 90.0)
    img = np.ones((h, w, 4), dtype=np.float32)
    base_var = 0.025 * np.sin(xx * 12.0) * np.cos(yy * 10.0)
    img[:, :, 0] = np.clip(0.11 + base_var + vein1 * 0.46 + vein2 * 0.30, 0.05, 0.92)
    img[:, :, 1] = np.clip(0.12 + base_var + vein1 * 0.42 + vein2 * 0.24, 0.06, 0.88)
    img[:, :, 2] = np.clip(0.15 + base_var + vein1 * 0.36 + vein2 * 0.15, 0.07, 0.84)
    return make_image_from_rgba(name, img)


def gen_night_city_sky():
    """Cinematic 1024x1024 Silicon Valley twilight skyline with atmospheric horizon glow & layered towers."""
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h  # v=0 top, v=1 bottom
    img = np.ones((h, w, 4), dtype=np.float32)
    # Rich cinematic twilight indigo -> warm amber horizon glow
    horizon_glow = np.exp(-((v - 0.82) ** 2) * 18.0) * 0.28
    img[:, :, 0] = np.clip(0.03 + 0.08 * (v ** 1.4) + horizon_glow * 1.15, 0, 1)
    img[:, :, 1] = np.clip(0.06 + 0.11 * (v ** 1.2) + horizon_glow * 0.72, 0, 1)
    img[:, :, 2] = np.clip(0.16 + 0.16 * v - horizon_glow * 0.15, 0, 1)

    # Soft crescent moon + luminous atmospheric halo
    rm = np.sqrt((u - 0.76) ** 2 + (v - 0.20) ** 2)
    rc = np.sqrt((u - 0.79) ** 2 + (v - 0.18) ** 2)
    halo = np.exp(-rm * 11.0) * 0.38
    img[:, :, 0] = np.clip(img[:, :, 0] + halo * 0.95, 0, 1)
    img[:, :, 1] = np.clip(img[:, :, 1] + halo * 0.92, 0, 1)
    img[:, :, 2] = np.clip(img[:, :, 2] + halo * 0.82, 0, 1)
    img[(rm < 0.055) & (rc > 0.048), :3] = (1.0, 0.97, 0.86)

    # Fine delicate twinkling stars (tiny soft dots, not chunky squares!)
    rng = np.random.default_rng(2009)
    for _ in range(110):
        sx, sy = int(rng.integers(10, w - 10)), int(rng.integers(10, int(h * 0.54)))
        br = float(rng.uniform(0.45, 0.95))
        img[sy:sy + 2, sx:sx + 2, :3] = np.clip(img[sy:sy + 2, sx:sx + 2, :3] + br, 0, 1)

    # Far hazy mountain ridge
    ridge = 0.66 + 0.03 * np.sin(u * 6.5) + 0.018 * np.cos(u * 13.0)
    img[v > ridge, :3] = (0.06, 0.09, 0.16)

    # Layer 1: Far misty skyscrapers
    far_towers = [(0.04, 0.12, 0.50), (0.18, 0.26, 0.44), (0.34, 0.44, 0.47), (0.58, 0.68, 0.42), (0.78, 0.88, 0.48)]
    for x0, x1, top in far_towers:
        bx0, bx1, by0 = int(x0 * w), int(x1 * w), int(top * h)
        img[by0:h, bx0:bx1, :3] = (0.07, 0.10, 0.18)
        for wy in range(by0 + 14, h - 20, 16):
            if rng.random() > 0.42:
                img[wy:wy + 3, bx0 + 8:bx1 - 8, :3] = (0.45, 0.55, 0.70)

    # Layer 2: Sleek near glass skyscrapers with soft warm/cool horizontal office light bands
    near_towers = [
        (0.00, 0.11, 0.58), (0.10, 0.21, 0.48), (0.23, 0.35, 0.54),
        (0.41, 0.54, 0.41), (0.53, 0.63, 0.52), (0.67, 0.79, 0.46), (0.83, 0.98, 0.55),
    ]
    for x0, x1, top in near_towers:
        bx0, bx1, by0 = int(x0 * w), int(x1 * w), int(top * h)
        # Subtle glass vertical gradient on tower facade
        tw_h = h - by0
        grad = np.linspace(0.0, 0.04, tw_h)[:, None]
        img[by0:h, bx0:bx1, 0] = 0.04 + grad
        img[by0:h, bx0:bx1, 1] = 0.06 + grad
        img[by0:h, bx0:bx1, 2] = 0.11 + grad * 1.4
        # Crisp rim highlight along tower edge
        img[by0:h, bx0:bx0 + 3, :3] = (0.16, 0.22, 0.34)
        for wy in range(by0 + 16, h - 18, 18):
            if rng.random() > 0.28:
                # Realistic continuous office floor light band with random dark offices
                for wx in range(bx0 + 10, bx1 - 14, 18):
                    if rng.random() > 0.40:
                        col = (1.0, 0.86, 0.58) if rng.random() > 0.38 else (0.58, 0.84, 1.0)
                        img[wy:wy + 5, wx:wx + 11, :3] = col
        # Subtle red aviation beacon on tallest roofs
        if top < 0.48:
            mid = (bx0 + bx1) // 2
            img[max(0, by0 - 6):by0, mid - 2:mid + 2, :3] = (0.95, 0.25, 0.22)

    # Warm golden city mist rising from street level
    mist = np.clip((v - 0.76) / 0.24, 0, 1) ** 1.6 * 0.26
    img[:, :, 0] = np.clip(img[:, :, 0] + mist * 0.95, 0, 1)
    img[:, :, 1] = np.clip(img[:, :, 1] + mist * 0.65, 0, 1)
    img[:, :, 2] = np.clip(img[:, :, 2] + mist * 0.32, 0, 1)
    return make_image_from_rgba("night_city_hq", img)


def gen_sunset_city_sky():
    """Cinematic 1024x1024 California golden-hour Bay Area panorama with painted clouds & sunlit towers."""
    w, h = 1024, 1024
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    img = np.ones((h, w, 4), dtype=np.float32)
    # Lush sunset sky gradient: deep cerulean -> lavender -> warm peach -> golden amber
    img[:, :, 0] = np.clip(0.18 + 0.82 * (v ** 0.95), 0, 1)
    img[:, :, 1] = np.clip(0.28 + 0.50 * v - 0.22 * (v ** 3.2), 0, 1)
    img[:, :, 2] = np.clip(0.66 - 0.34 * (v ** 1.1), 0.22, 0.95)

    # Painted soft golden sunset clouds
    cloud = (
        np.exp(-((v - 0.36 - 0.04 * np.sin(u * 7.0)) ** 2) * 95.0) * (0.5 + 0.5 * np.sin(u * 11.0))
        + np.exp(-((v - 0.48 - 0.03 * np.cos(u * 9.0)) ** 2) * 130.0) * (0.5 + 0.5 * np.cos(u * 8.0 + 1.2))
    )
    img[:, :, 0] = np.clip(img[:, :, 0] + cloud * 0.35, 0, 1)
    img[:, :, 1] = np.clip(img[:, :, 1] + cloud * 0.22, 0, 1)
    img[:, :, 2] = np.clip(img[:, :, 2] + cloud * 0.14, 0, 1)

    # Volumetric golden sun disc & soft atmospheric scatter
    rs = np.sqrt((u - 0.62) ** 2 + (v - 0.54) ** 2)
    glow = np.exp(-rs * 4.5) * 0.55
    img[:, :, 0] = np.clip(img[:, :, 0] + glow, 0, 1)
    img[:, :, 1] = np.clip(img[:, :, 1] + glow * 0.84, 0, 1)
    img[:, :, 2] = np.clip(img[:, :, 2] + glow * 0.42, 0, 1)
    img[rs < 0.042, :3] = (1.0, 0.98, 0.88)

    # Layered California hills (far violet-blue -> near warm charcoal-purple)
    hill1 = 0.68 + 0.04 * np.sin(u * 6.0 + 0.8) + 0.015 * np.cos(u * 14.0)
    hill2 = 0.76 + 0.035 * np.cos(u * 8.0) + 0.012 * np.sin(u * 19.0)
    img[v > hill1, :3] = (0.36, 0.32, 0.44)
    img[v > hill2, :3] = (0.24, 0.22, 0.30)

    # Sunlit Silicon Valley glass towers reflecting warm gold
    towers = [(0.04, 0.13, 0.56), (0.15, 0.25, 0.50), (0.27, 0.36, 0.60), (0.71, 0.82, 0.53), (0.84, 0.96, 0.46)]
    for x0, x1, top in towers:
        bx0, bx1, by0 = int(x0 * w), int(x1 * w), int(top * h)
        img[by0:h, bx0:bx1, :3] = (0.18, 0.20, 0.28)
        img[by0:h, bx1 - 6:bx1, :3] = (0.88, 0.66, 0.38)  # golden sunset rim edge!
        for wy in range(by0 + 16, h - 14, 18):
            img[wy:wy + 5, bx0 + 10:bx1 - 10, :3] = (0.94, 0.76, 0.46)
    return make_image_from_rgba("sunset_city_hq", img)


def gen_code_screen(name="code_screen", accent=(0.18, 0.90, 0.50)):
    w, h = 512, 320
    img = np.ones((h, w, 4), dtype=np.float32)
    img[:, :, :3] = (0.06, 0.08, 0.12)
    img[0:26, :, :3] = (0.11, 0.14, 0.20)
    img[8:18, 12:22, :3] = (0.95, 0.35, 0.32)
    img[8:18, 28:38, :3] = (0.96, 0.76, 0.24)
    img[8:18, 44:54, :3] = (0.25, 0.84, 0.45)
    img[26:h, 0:78, :3] = (0.08, 0.10, 0.15)
    rng = np.random.default_rng(abs(hash(name)) % (2**31))
    cols = [accent, (0.40, 0.76, 1.0), (0.96, 0.78, 0.36), (0.86, 0.90, 0.95), (0.86, 0.52, 0.96)]
    for y in range(42, h - 16, 14):
        indent = int(rng.choice([0, 0, 18, 36, 54]))
        x = 96 + indent
        for _ in range(int(rng.integers(2, 6))):
            ln = int(rng.integers(24, 92))
            if x + ln > w - 18:
                break
            c = cols[int(rng.integers(0, len(cols)))]
            img[y:y + 6, x:x + ln, :3] = c
            x += ln + 10
    return make_image_from_rgba(name, img)


def gen_soft_ao_shadow(name="ao_soft"):
    size = 256
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx = (xx - size / 2.0) / (size / 2.0)
    dy = (yy - size / 2.0) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)
    alpha = (np.clip(1.0 - r, 0.0, 1.0) ** 1.8) * 0.42
    img = np.zeros((size, size, 4), dtype=np.float32)
    img[:, :, :3] = (0.03, 0.04, 0.07)
    img[:, :, 3] = alpha
    return make_image_from_rgba(name, img)


def gen_clock_dial(name="clock_0215", hour_deg=-25.0, min_deg=0.0):
    size = 512
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx = (xx - size / 2.0) / (size / 2.0)
    dy = (yy - size / 2.0) / (size / 2.0)
    r = np.sqrt(dx * dx + dy * dy)
    img = np.ones((size, size, 4), dtype=np.float32)
    img[:, :, :3] = (0.12, 0.14, 0.19)
    img[(r > 0.89) & (r < 0.98), :3] = (0.85, 0.88, 0.92)
    for k in range(12):
        th = k * (2.0 * math.pi / 12.0)
        tx = dx * math.cos(th) + dy * math.sin(th)
        ty = -dx * math.sin(th) + dy * math.cos(th)
        thick = 0.026 if k % 3 == 0 else 0.013
        inner = 0.66 if k % 3 == 0 else 0.75
        img[(tx > inner) & (tx < 0.84) & (np.abs(ty) < thick), :3] = (0.92, 0.94, 0.97)
    for deg, length, width in [(hour_deg, 0.45, 0.030), (min_deg, 0.66, 0.018)]:
        rad = math.radians(deg)
        tx = dx * math.cos(rad) + dy * math.sin(rad)
        ty = -dx * math.sin(rad) + dy * math.cos(rad)
        img[(tx > -0.06) & (tx < length) & (np.abs(ty) < width), :3] = (0.96, 0.98, 1.0)
    img[r < 0.055, :3] = (0.18, 0.86, 0.46)
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
        if emission_strength > 0:
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_box(name, loc, size, mat, rot=(0.0, 0.0, 0.0), bevel=0.0, segs=2, smooth=False, uv_fit=False):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0.0:
        max_b = min(size[0], size[1], size[2]) * 0.42
        bmesh.ops.bevel(
            bm, geom=list(bm.edges), offset=min(bevel, max_b),
            segments=segs, affect="EDGES", clamp_overlap=True,
        )
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
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
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot, "XYZ")
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_ao_decal(name, x, y, z, sx, sy, mat_ao):
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
    for i, u in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[i].uv = u
    obj.location = Vector((x, y, z))
    obj.data.materials.append(mat_ao)
    return obj


def add_cyl(name, loc, r, h, mat, segs=22, rot=(0.0, 0.0, 0.0), r2=None, smooth=True):
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
    return obj


def add_torus(name, loc, major_r, minor_r, mat, segs=48, rot=(0.0, 0.0, 0.0)):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    minor_segs = 14
    rings = []
    for i in range(segs):
        th = 2.0 * math.pi * i / segs
        ct, st = math.cos(th), math.sin(th)
        ring = []
        for j in range(minor_segs):
            ph = 2.0 * math.pi * j / minor_segs
            r = major_r + minor_r * math.cos(ph)
            z = minor_r * math.sin(ph)
            ring.append(bm.verts.new((r * ct, r * st, z)))
        rings.append(ring)
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(minor_segs):
            jn = (j + 1) % minor_segs
            bm.faces.new((r0[j], r1[j], r1[jn], r0[jn]))
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj.location = Vector(loc)
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.data.materials.append(mat)
    return obj


def add_organic_blob(name, loc, r, mat, subdiv=2, scale=(1, 1, 1), seed=1, wobble=0.08):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    for v in bm.verts:
        n = 1.0 + wobble * math.sin(v.co.x * 5.0 + seed) * math.cos(v.co.y * 4.5 - seed)
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


def add_ergo_chair(prefix, x, y, z, seat_mat, mats, rot_z=0.0):
    """High-craft sculpted modern ergonomic chair with soft rounded cushions, headrest & chrome casters."""
    c, s = math.cos(rot_z), math.sin(rot_z)
    def rp(lx, ly):
        return x + lx * c - ly * s, y + lx * s + ly * c

    add_ao_decal(f"{prefix}_AO", x, y, z + 0.015, 0.92, 0.92, mats["ao_soft"])
    add_cyl(f"{prefix}_Stem", (x, y, z + 0.26), 0.036, 0.36, mats["chrome"], segs=16)
    for k in range(5):
        a = rot_z + k * 2 * math.pi / 5
        lx, ly = x + 0.16 * math.cos(a), y + 0.16 * math.sin(a)
        add_box(f"{prefix}_Foot{k}", (lx, ly, z + 0.075), (0.31, 0.038, 0.032), mats["chrome"], (0, 0, a), bevel=0.01, segs=2, smooth=True)
        wx, wy = x + 0.29 * math.cos(a), y + 0.29 * math.sin(a)
        add_cyl(f"{prefix}_Wheel{k}", (wx, wy, z + 0.035), 0.032, 0.028, mats["metal_dark"], segs=12, rot=(math.pi / 2, 0, a))
    # Plush rounded seat pan
    add_box(f"{prefix}_Seat", (x, y, z + 0.46), (0.56, 0.52, 0.10), seat_mat, (0, 0, rot_z), bevel=0.042, segs=3, smooth=True)
    # Contoured backrest + cushioned headrest
    bx, by = rp(0, -0.23)
    add_box(f"{prefix}_Back", (bx, by, z + 0.84), (0.50, 0.09, 0.62), seat_mat, (0.08 * math.cos(rot_z), 0.08 * math.sin(rot_z), rot_z), bevel=0.04, segs=3, smooth=True)
    hx, hy = rp(0, -0.25)
    add_box(f"{prefix}_Head", (hx, hy, z + 1.22), (0.32, 0.08, 0.15), seat_mat, (0, 0, rot_z), bevel=0.035, segs=3, smooth=True)
    # Sculpted curved armrests
    for sx in (-0.28, 0.28):
        ax, ay = rp(sx, -0.02)
        add_box(f"{prefix}_Arm{sx:.1f}", (ax, ay, z + 0.65), (0.055, 0.34, 0.038), mats["metal_dark"], (0, 0, rot_z), bevel=0.014, segs=2, smooth=True)
        px, py = rp(sx, -0.08)
        add_cyl(f"{prefix}_ArmPost{sx:.1f}", (px, py, z + 0.55), 0.018, 0.19, mats["chrome"], segs=10)


def add_indoor_plant(prefix, x, y, z, scale, mats, pot_mat=None):
    add_ao_decal(f"{prefix}_AO", x, y, z + 0.015, 1.0 * scale, 1.0 * scale, mats["ao_soft"])
    add_cyl(f"{prefix}_Pot", (x, y, z + 0.28 * scale), 0.20 * scale, 0.56 * scale, pot_mat or mats["pot_white"], segs=24, r2=0.25 * scale)
    add_cyl(f"{prefix}_PotRim", (x, y, z + 0.56 * scale), 0.26 * scale, 0.04 * scale, pot_mat or mats["pot_white"], segs=24)
    add_cyl(f"{prefix}_Soil", (x, y, z + 0.55 * scale), 0.22 * scale, 0.03 * scale, mats["walnut"], segs=16)
    for k in range(7):
        ang = k * (2 * math.pi / 7.0) + 0.25
        rad = 0.22 * scale
        lh = (0.74 + (k % 3) * 0.18) * scale
        lx = x + math.cos(ang) * rad
        ly = y + math.sin(ang) * rad
        add_cyl(f"{prefix}_Stem{k}", (x + math.cos(ang) * rad * 0.45, y + math.sin(ang) * rad * 0.45, z + lh * 0.65),
                0.014 * scale, lh * 0.72, mats["leaf1"], segs=8, rot=(math.sin(ang) * 0.35, -math.cos(ang) * 0.35, 0))
        add_organic_blob(f"{prefix}_Leaf{k}", (lx, ly, z + lh), 0.22 * scale,
                         mats["leaf2"] if k % 2 == 0 else mats["leaf1"], subdiv=2, scale=(1.25, 0.85, 0.30), seed=k * 13 + 7, wobble=0.06)


def add_books_row(prefix, x0, y, z, count, mats, width=0.82):
    b_mats = [mats["book_navy"], mats["book_teal"], mats["book_amber"], mats["book_red"], mats["white_matte"]]
    step = width / max(1, count)
    for i in range(count):
        bh = 0.22 + (i % 3) * 0.045
        add_box(f"{prefix}_B{i}", (x0 + i * step, y, z + bh * 0.5), (step * 0.82, 0.18, bh), b_mats[i % len(b_mats)], bevel=0.008, segs=2, smooth=True)


def build():
    clear_scene()
    mats = {
        "floor_dark": make_mat("FloorDark", (0.34, 0.24, 0.17), roughness=0.32,
                               img=gen_wood_planks("wood_dark_hq", [(0.36, 0.25, 0.17), (0.31, 0.21, 0.14), (0.39, 0.28, 0.19)], 11), uv_scale=(2.2, 2.2)),
        "floor_oak": make_mat("FloorOak", (0.72, 0.57, 0.40), roughness=0.30,
                              img=gen_wood_planks("wood_oak_hq", [(0.74, 0.59, 0.42), (0.69, 0.54, 0.38), (0.77, 0.62, 0.45)], 22), uv_scale=(2.2, 2.2)),
        "floor_exec": make_mat("FloorExec", (0.28, 0.19, 0.13), roughness=0.24,
                               img=gen_wood_planks("wood_exec_hq", [(0.30, 0.20, 0.14), (0.25, 0.17, 0.11), (0.33, 0.23, 0.16)], 33), uv_scale=(2.2, 2.2)),
        "wall_night": make_mat("WallNight", (0.16, 0.20, 0.28), roughness=0.68),
        "wall_office": make_mat("WallOffice", (0.93, 0.94, 0.95), roughness=0.66),
        "wall_exec": make_mat("WallExec", (0.20, 0.18, 0.20), roughness=0.52),
        "ceiling_light": make_mat("CeilLight", (0.95, 0.96, 0.97), roughness=0.78),
        "ceiling_dark": make_mat("CeilDark", (0.16, 0.18, 0.22), roughness=0.72),
        "walnut": make_mat("Walnut", (0.34, 0.22, 0.14), roughness=0.26),
        "oak_slat": make_mat("OakSlat", (0.68, 0.49, 0.30), roughness=0.38),
        "marble_dark": make_mat("MarbleDark", (1, 1, 1), roughness=0.14, metallic=0.18, img=gen_marble_dark(), uv_scale=(1.2, 1.2)),
        "metal_dark": make_mat("MetalDark", (0.12, 0.14, 0.18), roughness=0.26, metallic=0.72),
        "chrome": make_mat("Chrome", (0.88, 0.90, 0.93), roughness=0.12, metallic=0.94),
        "brass": make_mat("Brass", (0.86, 0.68, 0.32), roughness=0.18, metallic=0.88),
        "white_matte": make_mat("WhiteMatte", (0.96, 0.97, 0.98), roughness=0.34),
        "pot_white": make_mat("PotWhite", (0.92, 0.92, 0.90), roughness=0.40),
        "glass_part": make_mat("GlassPart", (0.64, 0.84, 0.94), roughness=0.05, metallic=0.22, alpha=0.22),
        "glass_clear": make_mat("GlassClear", (0.85, 0.94, 0.99), roughness=0.04, metallic=0.18, alpha=0.32),
        "rug_night": make_mat("RugNight", (0.22, 0.28, 0.40), roughness=0.92),
        "rug_office": make_mat("RugOffice", (0.76, 0.78, 0.82), roughness=0.90),
        "rug_exec": make_mat("RugExec", (0.86, 0.82, 0.75), roughness=0.88),
        "chair_mesh": make_mat("ChairMesh", (0.15, 0.17, 0.21), roughness=0.58),
        "chair_white": make_mat("ChairWhite", (0.92, 0.94, 0.96), roughness=0.38),
        "chair_leather": make_mat("ChairLeather", (0.58, 0.34, 0.17), roughness=0.32),
        "sofa_grey": make_mat("SofaGrey", (0.34, 0.38, 0.46), roughness=0.80),
        "pillow_gold": make_mat("PillowGold", (0.90, 0.68, 0.20), roughness=0.74),
        "curtain": make_mat("Curtain", (0.24, 0.29, 0.38), roughness=0.82),
        "leaf1": make_mat("Leaf1", (0.18, 0.48, 0.22), roughness=0.60),
        "leaf2": make_mat("Leaf2", (0.28, 0.60, 0.27), roughness=0.56),
        "book_navy": make_mat("BookNavy", (0.16, 0.30, 0.54), roughness=0.55),
        "book_teal": make_mat("BookTeal", (0.15, 0.55, 0.48), roughness=0.55),
        "book_amber": make_mat("BookAmber", (0.86, 0.56, 0.18), roughness=0.55),
        "book_red": make_mat("BookRed", (0.76, 0.22, 0.22), roughness=0.55),
        "mug_green": make_mat("MugGreen", (0.16, 0.74, 0.42), roughness=0.22),
        "led_cyan": make_mat("LedCyan", (0.22, 0.84, 1.0), roughness=0.18, emission=(0.22, 0.86, 1.0), emission_strength=2.2),
        "led_green": make_mat("LedGreen", (0.18, 0.90, 0.46), roughness=0.18, emission=(0.18, 0.92, 0.46), emission_strength=2.0),
        "led_warm": make_mat("LedWarm", (1.0, 0.90, 0.68), roughness=0.16, emission=(1.0, 0.88, 0.60), emission_strength=2.4),
        "led_white": make_mat("LedWhite", (0.98, 0.99, 1.0), roughness=0.18, emission=(0.98, 0.99, 1.0), emission_strength=1.9),
        "code_scr1": make_mat("CodeScr1", (1, 1, 1), roughness=0.16, emission=(1, 1, 1), emission_strength=1.15,
                              img=gen_code_screen("code1", (0.18, 0.90, 0.50))),
        "code_scr2": make_mat("CodeScr2", (1, 1, 1), roughness=0.16, emission=(1, 1, 1), emission_strength=1.15,
                              img=gen_code_screen("code2", (0.35, 0.75, 1.0))),
        "night_sky": make_mat("NightSky", (1, 1, 1), roughness=0.2, emission=(1, 1, 1), emission_strength=1.15, img=gen_night_city_sky()),
        "sunset_sky": make_mat("SunsetSky", (1, 1, 1), roughness=0.2, emission=(1, 1, 1), emission_strength=1.15, img=gen_sunset_city_sky()),
        "clock_0215": make_mat("Clock0215", (1, 1, 1), roughness=0.32, img=gen_clock_dial("clock_0215", -25.0, 0.0)),
        "ao_soft": make_mat("AoSoft", (0.03, 0.04, 0.07), roughness=1.0, img=gen_soft_ao_shadow(), use_alpha_img=True),
    }

    # =========================================================================
    # SET B (X = 0): MODERN PROGRAMMER APARTMENT AT NIGHT (2009 — WHATSAPP)
    # =========================================================================
    bx = 0.0
    add_box("B_Floor", (bx, 0.2, -0.05), (10.6, 8.0, 0.10), mats["floor_dark"])
    add_box("B_Ceiling", (bx, 0.2, 3.85), (10.6, 8.0, 0.12), mats["ceiling_dark"])
    add_box("B_CeilCove", (bx, 3.35, 3.74), (6.5, 0.14, 0.05), mats["led_warm"])
    add_box("B_Rug", (bx, -0.4, 0.012), (4.6, 3.2, 0.025), mats["rug_night"], bevel=0.01, segs=2, smooth=True)
    # Back wall + huge cinematic twilight skyline window
    add_box("B_WallBack_L", (bx - 3.95, 3.65, 1.90), (2.7, 0.20, 3.85), mats["wall_night"])
    add_box("B_WallBack_R", (bx + 3.85, 3.65, 1.90), (2.9, 0.20, 3.85), mats["wall_night"])
    add_box("B_WallBack_Bot", (bx - 0.1, 3.65, 0.24), (5.1, 0.20, 0.48), mats["wall_night"], bevel=0.02, segs=2, smooth=True)
    add_box("B_WallBack_Top", (bx - 0.1, 3.65, 3.58), (5.1, 0.20, 0.50), mats["wall_night"], bevel=0.02, segs=2, smooth=True)
    add_box("B_NightView", (bx - 0.1, 3.84, 1.90), (5.15, 0.05, 3.00), mats["night_sky"], uv_fit=True)
    for mx in (-2.6, -0.95, 0.75, 2.4):
        add_box(f"B_WinMulV_{mx:.1f}", (bx + mx, 3.62, 1.90), (0.075, 0.16, 2.95), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
    add_box("B_WinMulH", (bx - 0.1, 3.62, 1.90), (5.05, 0.16, 0.075), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
    # Soft pleated curtains
    for k in range(3):
        add_cyl(f"B_CurtL_{k}", (bx - 2.68 - k * 0.15, 3.45, 1.95), 0.09, 3.42, mats["curtain"], segs=14)
        add_cyl(f"B_CurtR_{k}", (bx + 2.48 + k * 0.15, 3.45, 1.95), 0.09, 3.42, mats["curtain"], segs=14)
    add_box("B_WallL", (bx - 5.2, 0.2, 1.90), (0.20, 8.0, 3.85), mats["wall_night"])
    add_box("B_WallR", (bx + 5.2, 0.2, 1.90), (0.20, 8.0, 3.85), mats["wall_night"])
    for k in range(6):
        add_box(f"B_SlatR_{k}", (bx + 2.95 + k * 0.20, 3.52, 1.90), (0.10, 0.06, 3.60), mats["oak_slat"], bevel=0.014, segs=2, smooth=True)

    # PROGRAMMER WORKSTATION DESK (Beveled Walnut + Soft AO Contact Shadow + Sleek Dual Monitors)
    dx, dy = bx - 0.2, 1.65
    add_ao_decal("B_DeskAO", dx, dy, 0.028, 3.0, 1.35, mats["ao_soft"])
    add_box("B_DeskTop", (dx, dy, 0.78), (2.58, 0.90, 0.075), mats["walnut"], bevel=0.022, segs=3, smooth=True)
    add_box("B_DeskLED", (dx, dy + 0.44, 0.78), (2.48, 0.03, 0.035), mats["led_cyan"])
    for lx in (-1.16, 1.16):
        add_box(f"B_DeskLegF_{lx:.1f}", (dx + lx, dy - 0.36, 0.38), (0.06, 0.06, 0.74), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
        add_box(f"B_DeskLegB_{lx:.1f}", (dx + lx, dy + 0.36, 0.38), (0.06, 0.06, 0.74), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
        add_box(f"B_DeskBar_{lx:.1f}", (dx + lx, dy, 0.10), (0.06, 0.78, 0.05), mats["metal_dark"], bevel=0.01, segs=2, smooth=True)
    # Main ultrawide beveled monitor
    add_box("B_Mon1_Frame", (dx + 0.10, dy + 0.22, 1.24), (0.98, 0.04, 0.52), mats["metal_dark"], bevel=0.016, segs=3, smooth=True)
    add_box("B_Mon1_Screen", (dx + 0.10, dy + 0.195, 1.24), (0.91, 0.015, 0.45), mats["code_scr1"], uv_fit=True)
    add_cyl("B_Mon1_Stand", (dx + 0.10, dy + 0.26, 0.94), 0.032, 0.28, mats["chrome"], segs=14)
    add_box("B_Mon1_Base", (dx + 0.10, dy + 0.24, 0.825), (0.30, 0.18, 0.022), mats["chrome"], bevel=0.008, segs=2, smooth=True)
    # Left vertical coding monitor
    add_box("B_Mon2_Frame", (dx - 0.66, dy + 0.14, 1.28), (0.44, 0.04, 0.70), mats["metal_dark"], (0, 0, -0.26), bevel=0.016, segs=3, smooth=True)
    add_box("B_Mon2_Screen", (dx - 0.65, dy + 0.115, 1.28), (0.38, 0.015, 0.63), mats["code_scr2"], (0, 0, -0.26), uv_fit=True)
    add_cyl("B_Mon2_Stand", (dx - 0.68, dy + 0.18, 0.92), 0.028, 0.24, mats["chrome"], segs=14)
    # Sleek aluminum laptop
    add_box("B_Lap_Base", (dx + 0.88, dy + 0.08, 0.825), (0.42, 0.30, 0.02), mats["chrome"], (0, 0, 0.22), bevel=0.008, segs=2, smooth=True)
    add_box("B_Lap_Lid", (dx + 0.92, dy + 0.23, 0.96), (0.42, 0.02, 0.28), mats["chrome"], (0.18, 0, 0.22), bevel=0.008, segs=2, smooth=True)
    add_box("B_Lap_Scr", (dx + 0.91, dy + 0.215, 0.96), (0.38, 0.015, 0.24), mats["code_scr2"], (0.18, 0, 0.22), uv_fit=True)
    # Mechanical keyboard, desk mat, sculpted mouse, ceramic mug, architect lamp
    add_box("B_DeskMat", (dx + 0.05, dy - 0.12, 0.82), (0.94, 0.36, 0.012), mats["metal_dark"], bevel=0.005, segs=2, smooth=True)
    add_box("B_Keyboard", (dx - 0.02, dy - 0.12, 0.836), (0.44, 0.15, 0.026), mats["chair_mesh"], bevel=0.008, segs=2, smooth=True)
    add_box("B_KeyGlow", (dx - 0.02, dy - 0.12, 0.850), (0.40, 0.11, 0.008), mats["led_green"])
    add_box("B_Mouse", (dx + 0.34, dy - 0.14, 0.836), (0.072, 0.12, 0.028), mats["chair_mesh"], bevel=0.012, segs=3, smooth=True)
    add_cyl("B_Mug", (dx + 0.56, dy - 0.16, 0.88), 0.055, 0.12, mats["mug_green"], segs=20)
    add_cyl("B_LampBase", (dx - 1.05, dy + 0.18, 0.83), 0.10, 0.032, mats["metal_dark"], segs=20)
    add_cyl("B_LampArm1", (dx - 1.05, dy + 0.18, 1.12), 0.018, 0.58, mats["brass"], segs=12, rot=(0, 0.18, 0))
    add_box("B_LampHead", (dx - 0.92, dy + 0.14, 1.38), (0.28, 0.08, 0.042), mats["metal_dark"], bevel=0.014, segs=2, smooth=True)
    add_box("B_LampGlow", (dx - 0.92, dy + 0.14, 1.355), (0.24, 0.06, 0.015), mats["led_warm"])
    add_box("B_MiniServer", (dx - 1.08, dy - 0.18, 0.98), (0.18, 0.28, 0.34), mats["metal_dark"], bevel=0.018, segs=2, smooth=True)
    for ly in (0.90, 0.96, 1.02, 1.08):
        add_box(f"B_SrvLED_{ly:.2f}", (dx - 1.08, dy - 0.325, ly), (0.10, 0.015, 0.02), mats["led_green"])

    # Ergonomic mesh chair angled neatly beside desk
    add_ergo_chair("B_Chair", dx - 1.15, dy - 0.85, 0.0, mats["chair_mesh"], mats, rot_z=-0.55)

    # Modern Bookshelf + Plush Rounded Sofa + Standing Lamp
    sx = bx - 3.65
    for px in (-0.52, 0.52):
        add_box(f"B_ShelfPostF_{px:.2f}", (sx + px, 3.10, 1.15), (0.04, 0.04, 2.30), mats["metal_dark"], bevel=0.008, segs=2, smooth=True)
        add_box(f"B_ShelfPostB_{px:.2f}", (sx + px, 3.46, 1.15), (0.04, 0.04, 2.30), mats["metal_dark"], bevel=0.008, segs=2, smooth=True)
    for sz in (0.25, 0.85, 1.45, 2.05):
        add_box(f"B_Shelf_{sz:.2f}", (sx, 3.28, sz), (1.08, 0.38, 0.04), mats["walnut"], bevel=0.01, segs=2, smooth=True)
        if sz < 2.0:
            add_books_row(f"B_Books_{sz:.2f}", sx - 0.42, 3.28, sz + 0.02, 7, mats, width=0.84)
    add_disc_clock("B_Clock0215", (bx + 3.45, 3.46, 2.75), 0.30, mats["clock_0215"], mats["chrome"])
    add_ao_decal("B_SofaAO", bx + 3.65, 1.30, 0.016, 1.35, 2.45, mats["ao_soft"])
    add_box("B_SofaBase", (bx + 3.65, 1.30, 0.30), (1.06, 2.18, 0.46), mats["sofa_grey"], bevel=0.08, segs=3, smooth=True)
    add_box("B_SofaBack", (bx + 4.05, 1.30, 0.72), (0.28, 2.18, 0.58), mats["sofa_grey"], bevel=0.08, segs=3, smooth=True)
    add_box("B_Pillow1", (bx + 3.78, 0.75, 0.66), (0.18, 0.42, 0.38), mats["pillow_gold"], (0, -0.22, 0.15), bevel=0.06, segs=3, smooth=True)
    add_box("B_Pillow2", (bx + 3.78, 1.85, 0.66), (0.18, 0.42, 0.38), mats["book_teal"], (0, -0.22, -0.15), bevel=0.06, segs=3, smooth=True)
    add_cyl("B_StandLampPole", (bx + 4.35, 2.85, 0.95), 0.024, 1.90, mats["brass"], segs=14)
    add_cyl("B_StandLampShade", (bx + 4.35, 2.85, 1.92), 0.24, 0.34, mats["led_warm"], segs=24, r2=0.17)
    add_indoor_plant("B_PlantL", bx - 4.35, 1.20, 0.0, 1.10, mats)

    # =========================================================================
    # SET C (X = 28): MODERN GLASS TECH HQ & WHATSAPP STARTUP OFFICE (2009-2013)
    # =========================================================================
    cx = 28.0
    add_box("C_Floor", (cx, 0.2, -0.05), (12.0, 8.4, 0.10), mats["floor_oak"])
    add_box("C_Ceiling", (cx, 0.2, 3.95), (12.0, 8.4, 0.12), mats["ceiling_light"])
    add_box("C_Rug", (cx, 0.6, 0.012), (4.9, 3.5, 0.022), mats["rug_office"], bevel=0.01, segs=2, smooth=True)
    add_box("C_WallBack", (cx, 3.65, 1.95), (12.0, 0.20, 3.95), mats["wall_office"])
    add_box("C_Baseboard", (cx, 3.53, 0.08), (11.8, 0.05, 0.16), mats["metal_dark"])
    for side_x in (-4.4, 4.4):
        for k in range(-6, 7):
            add_box(f"C_Slat_{side_x:.1f}_{k}", (cx + side_x + k * 0.18, 3.51, 1.95), (0.09, 0.06, 3.75), mats["oak_slat"], bevel=0.014, segs=2, smooth=True)
    add_box("C_WallL", (cx - 5.9, 0.2, 1.95), (0.20, 8.4, 3.95), mats["wall_office"])
    add_box("C_WallR", (cx + 5.9, 0.2, 1.95), (0.20, 8.4, 3.95), mats["wall_office"])
    add_box("C_GlassPart", (cx - 4.15, 0.6, 1.85), (0.05, 5.8, 3.65), mats["glass_part"])
    for py in (-2.2, -0.3, 1.6, 3.4):
        add_box(f"C_GlassMul_{py:.1f}", (cx - 4.15, py, 1.85), (0.09, 0.09, 3.70), mats["metal_dark"], bevel=0.014, segs=2, smooth=True)
    add_box("C_GlassTop", (cx - 4.15, 0.6, 3.65), (0.10, 5.8, 0.09), mats["metal_dark"], bevel=0.014, segs=2, smooth=True)

    # 75" Beveled Ultra-Thin Display
    add_box("C_TV_Frame", (cx, 3.50, 2.25), (3.14, 0.08, 1.78), mats["metal_dark"], bevel=0.022, segs=3, smooth=True)
    add_box("C_TV_Screen", (cx, 3.45, 2.25), (2.96, 0.02, 1.62), mats["code_scr1"], uv_fit=True)

    # 3 Sleek Suspended Linear LED Office Lights
    for lx in (-2.6, 0.0, 2.6):
        add_box(f"C_LinearBody_{lx:.1f}", (cx + lx, 1.0, 3.35), (0.14, 2.4, 0.08), mats["metal_dark"], bevel=0.018, segs=2, smooth=True)
        add_box(f"C_LinearGlow_{lx:.1f}", (cx + lx, 1.0, 3.30), (0.10, 2.34, 0.02), mats["led_white"])
        add_cyl(f"C_Wire1_{lx:.1f}", (cx + lx, 0.1, 3.65), 0.009, 0.56, mats["chrome"], segs=8)
        add_cyl(f"C_Wire2_{lx:.1f}", (cx + lx, 1.9, 3.65), 0.009, 0.56, mats["chrome"], segs=8)

    # Beveled Modern Conference Table + Soft Floor AO + Laptops
    add_ao_decal("C_TableAO", cx, 0.70, 0.028, 3.5, 1.75, mats["ao_soft"])
    add_box("C_TableTop", (cx, 0.70, 0.78), (2.98, 1.20, 0.07), mats["white_matte"], bevel=0.024, segs=3, smooth=True)
    add_box("C_TableRim", (cx, 0.70, 0.75), (2.99, 1.21, 0.03), mats["oak_slat"], bevel=0.012, segs=2, smooth=True)
    for tx in (-1.22, 1.22):
        add_box(f"C_TableLeg_{tx:.1f}", (cx + tx, 0.70, 0.38), (0.08, 0.90, 0.74), mats["metal_dark"], bevel=0.016, segs=2, smooth=True)
    add_box("C_Lap1_B", (cx - 0.65, 0.80, 0.825), (0.40, 0.28, 0.02), mats["chrome"], bevel=0.008, segs=2, smooth=True)
    add_box("C_Lap1_S", (cx - 0.65, 0.94, 0.95), (0.40, 0.02, 0.26), mats["chrome"], (0.18, 0, 0), bevel=0.008, segs=2, smooth=True)
    add_box("C_Lap2_B", (cx + 0.68, 0.65, 0.825), (0.40, 0.28, 0.02), mats["chrome"], (0, 0, math.pi), bevel=0.008, segs=2, smooth=True)
    add_box("C_Lap2_S", (cx + 0.68, 0.51, 0.95), (0.40, 0.02, 0.26), mats["chrome"], (-0.18, 0, math.pi), bevel=0.008, segs=2, smooth=True)
    add_cyl("C_Cup1", (cx - 0.15, 0.75, 0.88), 0.045, 0.11, mats["mug_green"], segs=18)
    add_cyl("C_Cup2", (cx + 0.20, 0.65, 0.88), 0.045, 0.11, mats["white_matte"], segs=18)

    # 4 Sculpted Ergonomic Office Chairs neatly tucked around table
    add_ergo_chair("C_Ch1", cx - 0.75, 1.48, 0.0, mats["chair_white"], mats, rot_z=math.pi)
    add_ergo_chair("C_Ch2", cx + 0.75, 1.48, 0.0, mats["chair_white"], mats, rot_z=math.pi)
    add_ergo_chair("C_Ch3", cx - 1.38, 0.25, 0.0, mats["chair_white"], mats, rot_z=0.35)
    add_ergo_chair("C_Ch4", cx + 1.38, 0.25, 0.0, mats["chair_white"], mats, rot_z=-0.35)

    for side, wx in [("L", cx - 2.95), ("R", cx + 2.95)]:
        add_ao_decal(f"C_DevAO_{side}", wx, 2.35, 0.016, 1.95, 1.05, mats["ao_soft"])
        add_box(f"C_DevDesk_{side}", (wx, 2.35, 0.76), (1.65, 0.72, 0.06), mats["white_matte"], bevel=0.02, segs=2, smooth=True)
        add_box(f"C_DevLeg1_{side}", (wx - 0.75, 2.35, 0.37), (0.06, 0.64, 0.74), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
        add_box(f"C_DevLeg2_{side}", (wx + 0.75, 2.35, 0.37), (0.06, 0.64, 0.74), mats["metal_dark"], bevel=0.012, segs=2, smooth=True)
        add_box(f"C_iMac_{side}", (wx, 2.55, 1.15), (0.70, 0.04, 0.45), mats["chrome"], bevel=0.015, segs=3, smooth=True)
        add_box(f"C_iMacScr_{side}", (wx, 2.525, 1.16), (0.64, 0.02, 0.38), mats["code_scr2"], uv_fit=True)
        add_box(f"C_iMacFoot_{side}", (wx, 2.58, 0.87), (0.14, 0.12, 0.18), mats["chrome"], bevel=0.01, segs=2, smooth=True)
        add_ergo_chair(f"C_DevCh_{side}", wx, 1.68, 0.0, mats["chair_mesh"], mats, rot_z=0.0)

    add_box("C_CoffeeCab", (cx + 4.85, 2.45, 0.46), (1.15, 0.65, 0.92), mats["walnut"], bevel=0.02, segs=2, smooth=True)
    add_box("C_CoffeeTop", (cx + 4.85, 2.45, 0.94), (1.20, 0.70, 0.05), mats["white_matte"], bevel=0.015, segs=2, smooth=True)
    add_box("C_Espresso", (cx + 4.85, 2.52, 1.22), (0.48, 0.36, 0.50), mats["chrome"], bevel=0.025, segs=3, smooth=True)
    add_box("C_EspressoAcc", (cx + 4.85, 2.34, 1.26), (0.40, 0.03, 0.24), mats["metal_dark"], bevel=0.008, segs=2, smooth=True)
    add_box("C_SrvCab", (cx + 4.85, 0.55, 1.05), (0.78, 0.72, 2.10), mats["metal_dark"], bevel=0.025, segs=2, smooth=True)
    add_box("C_SrvGlass", (cx + 4.44, 0.55, 1.05), (0.04, 0.62, 1.92), mats["glass_part"])
    for sz in (0.45, 0.75, 1.05, 1.35, 1.65):
        add_box(f"C_SrvLED_{sz:.2f}", (cx + 4.46, 0.38, sz), (0.04, 0.14, 0.03), mats["led_green"])
        add_box(f"C_SrvLED2_{sz:.2f}", (cx + 4.46, 0.68, sz), (0.04, 0.14, 0.03), mats["led_cyan"])

    add_indoor_plant("C_PlantL", cx - 3.55, 3.05, 0.0, 1.25, mats)
    add_indoor_plant("C_PlantR", cx + 3.85, 3.05, 0.0, 1.25, mats)

    # =========================================================================
    # SET D (X = 56): EXECUTIVE PENTHOUSE BOARDROOM AT GOLDEN HOUR ($19B DEAL)
    # =========================================================================
    ex = 56.0
    add_box("D_Floor", (ex, 0.2, -0.05), (12.0, 8.6, 0.10), mats["floor_exec"])
    add_box("D_Ceiling", (ex, 0.2, 4.05), (12.0, 8.6, 0.14), mats["ceiling_dark"])
    add_box("D_CeilCoveL", (ex - 3.5, 0.8, 3.94), (0.14, 5.6, 0.05), mats["led_warm"])
    add_box("D_CeilCoveR", (ex + 3.5, 0.8, 3.94), (0.14, 5.6, 0.05), mats["led_warm"])
    add_box("D_Rug", (ex, 0.7, 0.012), (5.5, 3.7, 0.025), mats["rug_exec"], bevel=0.012, segs=2, smooth=True)
    # Panoramic Silicon Valley Golden-Hour Sunset Glass Wall
    add_box("D_SunsetView", (ex, 3.90, 2.02), (11.0, 0.06, 3.90), mats["sunset_sky"], uv_fit=True)
    add_box("D_WinFrameBot", (ex, 3.65, 0.16), (11.6, 0.20, 0.32), mats["metal_dark"], bevel=0.02, segs=2, smooth=True)
    add_box("D_WinFrameTop", (ex, 3.65, 3.86), (11.6, 0.20, 0.36), mats["metal_dark"], bevel=0.02, segs=2, smooth=True)
    for mx in (-5.2, -2.6, 0.0, 2.6, 5.2):
        add_box(f"D_WinMul_{mx:.1f}", (ex + mx, 3.64, 2.02), (0.10, 0.18, 3.85), mats["metal_dark"], bevel=0.015, segs=2, smooth=True)
    add_box("D_WallL", (ex - 5.8, 0.2, 2.02), (0.22, 8.6, 4.05), mats["wall_exec"])
    add_box("D_WallR", (ex + 5.8, 0.2, 2.02), (0.22, 8.6, 4.05), mats["wall_exec"])
    for k in range(-8, 9):
        add_box(f"D_FluteL_{k}", (ex - 5.65, 0.4 + k * 0.36, 2.02), (0.06, 0.18, 3.80), mats["walnut"], bevel=0.015, segs=2, smooth=True)
        add_box(f"D_FluteR_{k}", (ex + 5.65, 0.4 + k * 0.36, 2.02), (0.06, 0.18, 3.80), mats["walnut"], bevel=0.015, segs=2, smooth=True)
    add_box("D_BrassL", (ex - 5.60, 0.4, 1.15), (0.04, 6.2, 0.045), mats["brass"], bevel=0.01, segs=2, smooth=True)
    add_box("D_BrassR", (ex + 5.60, 0.4, 1.15), (0.04, 6.2, 0.045), mats["brass"], bevel=0.01, segs=2, smooth=True)

    # Luxury Brushed-Brass + Glowing Ring LED Chandelier (48-segment smooth torus!)
    add_torus("D_ChandelierRing", (ex, 0.85, 3.22), 1.08, 0.048, mats["brass"], segs=48)
    add_torus("D_ChandelierGlow", (ex, 0.85, 3.18), 1.08, 0.032, mats["led_warm"], segs=48)
    for ang in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        add_cyl(f"D_ChandWire_{ang:.1f}", (ex + 1.08 * math.cos(ang), 0.85 + 1.08 * math.sin(ang), 3.62), 0.008, 0.78, mats["brass"], segs=8)

    # Grand Veined Dark Marble + Brass-Inlay Beveled Conference Table + AO Shadow
    add_ao_decal("D_TableAO", ex, 0.80, 0.028, 4.4, 2.0, mats["ao_soft"])
    add_box("D_TableTop", (ex, 0.80, 0.80), (3.88, 1.40, 0.085), mats["marble_dark"], bevel=0.032, segs=3, smooth=True, uv_fit=True)
    add_box("D_TableTrim", (ex, 0.80, 0.755), (3.90, 1.42, 0.025), mats["brass"], bevel=0.008, segs=2, smooth=True)
    add_box("D_TablePedL", (ex - 1.25, 0.80, 0.38), (0.56, 0.84, 0.74), mats["walnut"], bevel=0.04, segs=3, smooth=True)
    add_box("D_TablePedR", (ex + 1.25, 0.80, 0.38), (0.56, 0.84, 0.74), mats["walnut"], bevel=0.04, segs=3, smooth=True)
    add_box("D_LapB", (ex - 1.15, 0.90, 0.85), (0.42, 0.28, 0.02), mats["chrome"], (0, 0, -0.20), bevel=0.008, segs=2, smooth=True)
    add_box("D_LapS", (ex - 1.18, 1.04, 0.98), (0.42, 0.02, 0.26), mats["chrome"], (0.18, 0, -0.20), bevel=0.008, segs=2, smooth=True)
    add_box("D_Tablet", (ex + 1.15, 0.85, 0.85), (0.30, 0.22, 0.015), mats["metal_dark"], (0, 0, 0.18), bevel=0.006, segs=2, smooth=True)
    add_cyl("D_Pitcher", (ex + 0.05, 1.12, 0.98), 0.068, 0.26, mats["glass_clear"], segs=20, r2=0.052)
    for gx in (-0.28, 0.32):
        add_cyl(f"D_Glass_{gx:.2f}", (ex + gx, 1.05, 0.91), 0.036, 0.12, mats["glass_clear"], segs=18)

    # Sculpted Caramel Leather Executive Chairs
    add_ergo_chair("D_Ch1", ex - 1.05, 1.65, 0.0, mats["chair_leather"], mats, rot_z=math.pi)
    add_ergo_chair("D_Ch2", ex + 1.05, 1.65, 0.0, mats["chair_leather"], mats, rot_z=math.pi)
    add_ergo_chair("D_Ch3", ex - 1.62, 0.15, 0.0, mats["chair_leather"], mats, rot_z=0.40)
    add_ergo_chair("D_Ch4", ex + 1.62, 0.15, 0.0, mats["chair_leather"], mats, rot_z=-0.40)

    add_box("D_Credenza", (ex + 4.35, 2.85, 0.44), (1.85, 0.56, 0.88), mats["walnut"], bevel=0.025, segs=2, smooth=True)
    add_box("D_CredTop", (ex + 4.35, 2.85, 0.89), (1.90, 0.60, 0.035), mats["marble_dark"], bevel=0.012, segs=2, smooth=True)
    add_organic_blob("D_Sculpture", (ex + 4.35, 2.85, 1.12), 0.18, mats["brass"], subdiv=2, seed=88, wobble=0.18)
    add_indoor_plant("D_PlantL", ex - 4.35, 2.95, 0.0, 1.35, mats)
    add_indoor_plant("D_PlantR", ex + 4.55, 1.55, 0.0, 1.25, mats)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from blender_opt import join_static_by_material
    join_static_by_material(exclude_prefixes=())

    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"Exported HQ Sets B/C/D: {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1e6:.2f} MB)")


if __name__ == "__main__":
    build()
