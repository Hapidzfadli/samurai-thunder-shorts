"""Latar & Properti 3D V2 (ULTRA-DETAIL & RAMAI) "Kucing Mata-Mata CIA $20 Juta (1966)" di Blender headless:
  L1 (ox=0)   : Lab Rahasia CIA 1960-an (ubin catur detail, papan peta Cold War + poster skema kucing tajam,
                jam dinding 1960-an, 2 mainframe berpita magnetik ANIM_ReelLabL/R, rak buku penuh binder,
                meja mesin tik + telepon putar + lampu banker + mug kopi, pipa plafon, tanaman pot, jendela kota)
  L2 (ox=400) : Mobil Van Penyadap CIA 1960-an (konsol padat dengan 2 CRT osiloskop, 3 VU meter kuning,
                kabel patch warna-warni, 2 reel pita ANIM_ReelVanL/R, kursi putar, kotak donat + kopi,
                peta dinding, pintu geser ANIM_VanDoor, radar atap ANIM_VanRadar, plus kota & awan di luar!)
  L3 (ox=800) : Taman Kota & Jalanan Washington 1960-an (langit senja + matahari emas + 14 awan 3D berlapis +
                siluet gedung bata Washington & kubah Capitol berjendela nyala, aspal + zebra cross + got besi +
                batu tepi trotoar + hidran merah + kotak pos biru + rambu STOP + tong sampah + mobil klasik parkir +
                jalan setapak taman + 40+ rumpun rumput & semak bunga + daun gugur + ANIM_YellowTaxi + ANIM_FishCart!)

Objek 'ANIM_*' dipisahkan dengan pivot lokal presisi agar bisa dianimasikan mulus di Remotion Three.js!
"""
import importlib.util
import math
import os
import sys
import numpy as np
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index("--") + 1:]
OUTDIR = ARGS[0]
WANT = ARGS[1] if len(ARGS) > 1 else "none"
GLB = ARGS[2] if len(ARGS) > 2 else None
os.makedirs(OUTDIR, exist_ok=True)

spec = importlib.util.spec_from_file_location("sch", os.path.join(HERE, "build_school_glb.py"))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
S.clear_scene()
S.init_materials()
PI = math.pi
RNG = np.random.default_rng(1966)


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def img(name, arr):
    h, w, _ = arr.shape
    return S.make_image_from_rgba(name, np.concatenate([arr, np.ones((h, w, 1))], axis=2).astype(np.float32))


def snoise(h, w, k, seed):
    r = np.random.default_rng(seed)
    n = r.random((h // k + 3, w // k + 3))
    ys = np.linspace(0, n.shape[0] - 1.001, h)
    xs = np.linspace(0, n.shape[1] - 1.001, w)
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
    return (
        n[y0][:, x0] * (1 - fx) * (1 - fy)
        + n[y0][:, x0 + 1] * fx * (1 - fy)
        + n[y0 + 1][:, x0] * (1 - fx) * fy
        + n[y0 + 1][:, x0 + 1] * fx * fy
    )


def tex_mat(name, arr, rough=0.72, metal=0.0, scale=1.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img(f"T_{name}", arr)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, 1.0)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if emit > 0:
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    S.MATS[name] = m
    return m


def solid_mat(name, hex_c, rough=0.65, metal=0.0, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    c = lin(hex_c)
    bsdf.inputs["Base Color"].default_value = (*c, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit > 0:
        bsdf.inputs["Emission Color"].default_value = (*c, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
    S.MATS[name] = m
    return m


def build_textures():
    H = W = 256
    yy, xx = np.mgrid[0:H, 0:W]

    # 1. Retro 1960s Lab Checker Tile (rich micro-speckle + crisp grout)
    chk = ((xx // 64) + (yy // 64)) % 2
    n = snoise(H, W, 6, 11) * 0.05 + snoise(H, W, 24, 12) * 0.04
    c1, c2 = np.array(lin("#D4DCD2")), np.array(lin("#8FA395"))
    arr = np.where(chk[:, :, None] == 0, c1, c2) + n[:, :, None]
    grout = ((xx % 64) < 3) | ((yy % 64) < 3)
    arr[grout] *= 0.62
    tex_mat("Lab_Tile", np.clip(arr, 0, 1), rough=0.40, scale=4.5)

    # 2. Lab Wall Panel
    n = snoise(H, W, 10, 13) * 0.045
    arr = np.ones((H, W, 3)) * np.array(lin("#C9D6C8")) + n[:, :, None]
    arr[(xx % 64) < 2] *= 0.86
    tex_mat("Lab_Wall", np.clip(arr, 0, 1), rough=0.78, scale=2.5)

    # 3. Warm Walnut Wood
    n1, n2 = snoise(H, W, 16, 14), snoise(H, W, 4, 15)
    grain = np.sin(yy * 0.28 + n1 * 4.2) * 0.055 + n2 * 0.035
    arr = np.ones((H, W, 3)) * np.array(lin("#7A4D2A")) + grain[:, :, None]
    tex_mat("Wood_Walnut", np.clip(arr, 0, 1), rough=0.56, scale=2.0)

    # 4. Van Ribbed Metal Floor
    rib = ((xx % 16) < 4).astype(float) * 0.07
    arr = np.ones((H, W, 3)) * np.array(lin("#28303B")) + rib[:, :, None]
    tex_mat("Van_Floor", np.clip(arr, 0, 1), rough=0.50, metal=0.42, scale=3.0)

    # 5. Detailed Asphalt with aggregate grit & subtle wheel-track wear
    n1 = snoise(H, W, 3, 21) * 0.07
    n2 = snoise(H, W, 20, 22) * 0.05
    arr = np.ones((H, W, 3)) * np.array(lin("#2C313A")) + (n1 + n2 - 0.05)[:, :, None]
    tex_mat("Asphalt", np.clip(arr, 0, 1), rough=0.88, scale=6.0)

    # 6. Stone Sidewalk Pavers with warm variation
    n = snoise(H, W, 6, 23) * 0.06
    tile_v = ((xx // 64) * 3 + (yy // 64) * 7) % 3
    base = np.array(lin("#BDB29E"))
    arr = np.ones((H, W, 3)) * base + (tile_v[:, :, None] - 1) * 0.025 + n[:, :, None]
    grout = ((xx % 64) < 3) | ((yy % 64) < 3)
    arr[grout] *= 0.62
    tex_mat("Sidewalk", np.clip(arr, 0, 1), rough=0.82, scale=5.0)

    # 7. Rich Multi-Tone Park Grass (blades + dappled sun variation!)
    n1 = snoise(H, W, 16, 24)
    n2 = snoise(H, W, 4, 25)
    n3 = snoise(H, W, 2, 26)
    g1 = np.array(lin("#3E6E35"))
    g2 = np.array(lin("#6BA047"))
    g3 = np.array(lin("#84AB48"))
    t = np.clip(n1 * 0.55 + n2 * 0.30 + n3 * 0.15, 0, 1)[:, :, None]
    arr = np.where(t < 0.65, g1 * (1 - t / 0.65) + g2 * (t / 0.65), g2 * (1 - (t - 0.65) / 0.35) + g3 * ((t - 0.65) / 0.35))
    tex_mat("Park_Grass", np.clip(arr, 0, 1), rough=0.92, scale=6.0)

    # 8. Red Brick 1960s Washington Townhouses
    row = yy // 24
    bx = (xx + (row % 2) * 32) % 64
    mortar = ((yy % 24) < 3) | (bx < 3)
    n = snoise(H, W, 8, 31) * 0.06
    brick_var = ((row * 5 + (xx // 64) * 3) % 4) * 0.022
    arr = np.ones((H, W, 3)) * np.array(lin("#8E4231")) + n[:, :, None] + brick_var[:, :, None]
    arr[mortar] = np.array(lin("#C7BFA9"))
    tex_mat("Brick_Wash", np.clip(arr, 0, 1), rough=0.85, scale=3.0)

    # 9. Limestone / Federal Classic Building Facade
    n = snoise(H, W, 12, 32) * 0.04
    arr = np.ones((H, W, 3)) * np.array(lin("#D4C9B4")) + n[:, :, None]
    arr[(yy % 42) < 2] *= 0.85
    tex_mat("Stone_Federal", np.clip(arr, 0, 1), rough=0.80, scale=2.5)

    # 10. Striped Fish Cart Awning
    stripe = ((xx // 32) % 2 == 0)[:, :, None]
    arr = np.where(stripe, np.array(lin("#CE332B")), np.array(lin("#FAF2E1")))
    tex_mat("Awning_Stripe", arr, rough=0.75, scale=2.0)

    # 11. Glowing Green CRT Oscilloscope
    arr = np.ones((H, W, 3)) * np.array(lin("#072116"))
    arr[((xx % 32) == 0) | ((yy % 32) == 0)] = np.array(lin("#125236"))
    wave_y = (H / 2 + np.sin(xx * 0.09) * 40 + np.sin(xx * 0.24) * 16).astype(int)
    for dy in range(-3, 4):
        arr[np.clip(wave_y + dy, 0, H - 1), np.arange(W)] = np.array(lin("#52FFA0"))
    tex_mat("CRT_Scope", np.clip(arr, 0, 1), rough=0.18, emit=1.8, scale=1.0)

    # 12. Warm Glowing Yellow VU Meter Dial
    arr = np.ones((H, W, 3)) * np.array(lin("#FFF0B8"))
    arr[:12, :] = arr[-12:, :] = arr[:, :12] = arr[:, -12:] = np.array(lin("#23252A"))
    # Red zone right side
    arr[30:90, 165:230] = np.array(lin("#E63B32"))
    # Needle diagonal
    for k in range(130):
        nx = int(128 + k * 0.55)
        ny = int(225 - k * 1.15)
        if 0 <= nx < W and 0 <= ny < H:
            arr[max(0, ny - 2):min(H, ny + 3), max(0, nx - 2):min(W, nx + 3)] = np.array(lin("#1A1A1E"))
    tex_mat("VU_Meter", np.clip(arr, 0, 1), rough=0.2, emit=1.1, scale=1.0)

    # 13. Cold War World Map Poster (for CIA Lab & Van wall!)
    arr = np.ones((H, W, 3)) * np.array(lin("#1B3B54"))
    arr[((xx % 32) == 0) | ((yy % 32) == 0)] = np.array(lin("#285270"))
    land = snoise(H, W, 32, 77) > 0.50
    arr[land] = np.array(lin("#7A9E65"))
    # Red pins & dotted route
    for px, py in [(65, 110), (140, 95), (195, 130)]:
        d = (xx - px) ** 2 + (yy - py) ** 2
        arr[d < 36] = np.array(lin("#FF3B30"))
    tex_mat("World_Map", np.clip(arr, 0, 1), rough=0.72, emit=0.12, scale=1.0)

    # 14. Cat Blueprint Diagram Poster (bright crisp chalk on navy blueprint!)
    arr = np.ones((H, W, 3)) * np.array(lin("#18375A"))
    arr[((xx % 24) == 0) | ((yy % 24) == 0)] = np.array(lin("#254E7A"))
    arr[:10, :] = arr[-10:, :] = arr[:, :10] = arr[:, -10:] = np.array(lin("#E8F2FF"))
    # Glowing cat head & antenna diagram in middle
    d = np.sqrt((xx - 128) ** 2 + (yy - 135) ** 2)
    arr[(d > 42) & (d < 49)] = np.array(lin("#FFE45E"))
    # Ears
    for ex in (96, 160):
        arr[(np.abs(xx - ex) < 16) & (yy > 65) & (yy < 102)] = np.array(lin("#FFE45E"))
    # Radio arcs on right
    for rad in (22, 38, 54):
        da = np.sqrt((xx - 185) ** 2 + (yy - 100) ** 2)
        arr[(np.abs(da - rad) < 3) & (xx > 185)] = np.array(lin("#52FFA0"))
    tex_mat("Cat_Blueprint", np.clip(arr, 0, 1), rough=0.55, emit=0.35, scale=1.0)

    # Solid & emissive materials
    solid_mat("Metal_Steel", "#B8C4CF", rough=0.25, metal=0.84)
    solid_mat("Metal_Dark", "#2A313A", rough=0.45, metal=0.72)
    solid_mat("Chrome", "#E4ECF2", rough=0.12, metal=0.95)
    solid_mat("Brass_Gold", "#E4B844", rough=0.24, metal=0.88)
    solid_mat("Cabinet_Olive", "#495A4C", rough=0.56, metal=0.22)
    solid_mat("Mainframe_Grey", "#5C6870", rough=0.46, metal=0.36)
    solid_mat("Reel_Red", "#D13B32", rough=0.36, metal=0.18)
    solid_mat("Reel_Tape", "#1F1B18", rough=0.42, metal=0.10)
    solid_mat("Glow_Warm", "#FFE5A8", rough=0.15, emit=4.5)
    solid_mat("Glow_Window", "#FFD98A", rough=0.20, emit=2.6)
    solid_mat("Glow_Sun", "#FFE184", rough=0.10, emit=8.0)
    solid_mat("Glow_Ember", "#FF5722", rough=0.20, emit=4.0)
    solid_mat("Glow_Green", "#47FF8E", rough=0.20, emit=2.8)
    solid_mat("Glow_Red", "#FF3B30", rough=0.20, emit=3.0)
    solid_mat("Glow_Cyan", "#4FE2FF", rough=0.15, emit=2.6)
    solid_mat("Van_Body", "#2E4361", rough=0.34, metal=0.42)
    solid_mat("Van_Stripe", "#D9B35C", rough=0.42, metal=0.28)
    solid_mat("Van_Interior", "#2C3542", rough=0.78)
    solid_mat("Glass_Dark", "#1D3247", rough=0.08, metal=0.18, alpha=0.58)
    solid_mat("Taxi_Yellow", "#F7BD24", rough=0.28, metal=0.22)
    solid_mat("Taxi_Checker", "#1B1B1D", rough=0.40)
    solid_mat("Car_Blue", "#4D82A8", rough=0.30, metal=0.35)
    solid_mat("Car_Mint", "#659E88", rough=0.30, metal=0.32)
    solid_mat("Rubber_Tire", "#1D1E22", rough=0.88)
    solid_mat("Tree_Trunk", "#5C3D26", rough=0.88)
    solid_mat("Tree_Leaf1", "#3B6E33", rough=0.82)
    solid_mat("Tree_Leaf2", "#568E3F", rough=0.82)
    solid_mat("Tree_Autumn", "#D17D2E", rough=0.82)
    solid_mat("Tree_Gold", "#E0A834", rough=0.82)
    solid_mat("Grass_Tuft", "#4D8538", rough=0.85)
    solid_mat("Bush_Dark", "#2F5B2B", rough=0.85)
    solid_mat("Flower_Red", "#E63E4A", rough=0.65)
    solid_mat("Flower_Yellow", "#FFD43B", rough=0.65)
    solid_mat("Flower_Purple", "#9C5CE6", rough=0.65)
    solid_mat("Road_Line", "#F5CB4C", rough=0.65)
    solid_mat("Zebra_White", "#ECE8DC", rough=0.75)
    solid_mat("Hydrant_Red", "#D42C26", rough=0.36, metal=0.35)
    solid_mat("Mailbox_Blue", "#285894", rough=0.42, metal=0.45)
    solid_mat("Sign_Green", "#216E45", rough=0.48)
    solid_mat("Paper_Cream", "#F4E8CE", rough=0.85)
    solid_mat("Fish_Silver", "#A5C4DE", rough=0.22, metal=0.58)
    solid_mat("Fish_Grill", "#C97D38", rough=0.48)
    solid_mat("Lamp_Post", "#212A28", rough=0.40, metal=0.70)
    solid_mat("Bench_Wood", "#8F5A32", rough=0.66)
    solid_mat("Cloud_Warm", "#FFF1DC", rough=0.95, emit=0.42)
    solid_mat("Cloud_Peach", "#F4C29B", rough=0.95, emit=0.28)
    solid_mat("Book_Red", "#B5332E", rough=0.72)
    solid_mat("Book_Blue", "#2F5A8A", rough=0.72)
    solid_mat("Book_Green", "#376E48", rough=0.72)
    solid_mat("Book_Gold", "#C99632", rough=0.72)
    solid_mat("Cable_Yellow", "#F2C94C", rough=0.45)
    solid_mat("Cable_Blue", "#3B9EFF", rough=0.45)
    solid_mat("Cable_Red", "#E0453E", rough=0.45)
    solid_mat("Pot_Terra", "#B85C3A", rough=0.78)
    solid_mat("Clock_Face", "#F8F3E6", rough=0.35, emit=0.25)


def col(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def B(name, loc, sz, mat, c, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = sz
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        bv = o.modifiers.new("Bevel", "BEVEL")
        bv.width = bevel
        bv.segments = 2
    o.data.materials.append(S.MATS[mat])
    for col_old in list(o.users_collection):
        col_old.objects.unlink(o)
    c.objects.link(o)
    return o


def CY(name, loc, r, h, mat, c, rot=(0, 0, 0), segs=16, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=segs, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(S.MATS[mat])
    for p in o.data.polygons:
        p.use_smooth = True
    for col_old in list(o.users_collection):
        col_old.objects.unlink(o)
    c.objects.link(o)
    return o


def SP(name, loc, sz, mat, c, segs=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=9, radius=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = sz
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(S.MATS[mat])
    for p in o.data.polygons:
        p.use_smooth = True
    for col_old in list(o.users_collection):
        col_old.objects.unlink(o)
    c.objects.link(o)
    return o


def make_anim_group(name, loc, parts_fn, c):
    created = parts_fn(loc, c)
    bpy.ops.object.select_all(action="DESELECT")
    for o in created:
        o.select_set(True)
    bpy.context.view_layer.objects.active = created[0]
    if len(created) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    saved = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = Vector(loc)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = saved
    obj.name = name
    return obj


def add_sky_and_washington_skyline(ox, c, y_base=18.5):
    """Add rich 3D sunset clouds, golden sun disc, & 1960s Washington brick/federal skyline with lit windows!"""
    # Glowing sunset sun disc in background sky
    SP(f"SunDisc_{ox}", (ox - 10.5, y_base + 14.0, 12.5), (2.4, 0.8, 2.4), "Glow_Sun", c, segs=18)

    # 12 Puffy Layered 3D Sunset Clouds floating across the sky!
    cloud_specs = [
        (ox - 16, y_base + 8, 12.2, 2.2),
        (ox - 9, y_base + 10, 14.0, 2.6),
        (ox - 2, y_base + 7, 11.4, 2.1),
        (ox + 5, y_base + 9, 13.5, 2.8),
        (ox + 13, y_base + 8, 12.0, 2.4),
        (ox + 19, y_base + 11, 14.5, 2.3),
        (ox - 14, y_base - 12, 13.0, 2.0),
        (ox + 2, y_base - 14, 14.2, 2.4),
        (ox + 14, y_base - 11, 12.8, 2.1),
    ]
    for ci, (cx, cy, cz, cs) in enumerate(cloud_specs):
        mat = "Cloud_Warm" if ci % 2 == 0 else "Cloud_Peach"
        SP(f"CloudA_{ox}_{ci}", (cx, cy, cz), (1.8 * cs, 0.9 * cs, 0.72 * cs), mat, c, segs=12)
        SP(f"CloudB_{ox}_{ci}", (cx - 1.1 * cs, cy + 0.2, cz - 0.12 * cs), (1.2 * cs, 0.75 * cs, 0.58 * cs), mat, c, segs=10)
        SP(f"CloudC_{ox}_{ci}", (cx + 1.15 * cs, cy - 0.1, cz - 0.10 * cs), (1.3 * cs, 0.75 * cs, 0.62 * cs), mat, c, segs=10)

    # Distant Washington 1960s Brick & Federal Buildings across horizon!
    buildings = [
        (ox - 16.5, y_base, 5.2, 4.2, 9.2, "Brick_Wash"),
        (ox - 10.8, y_base + 0.8, 5.6, 4.0, 11.4, "Stone_Federal"),
        (ox - 4.8, y_base + 1.5, 5.4, 4.2, 8.6, "Brick_Wash"),
        (ox + 1.4, y_base + 2.2, 6.8, 4.6, 10.2, "Stone_Federal"),  # Federal Hall with Capitol-style dome!
        (ox + 8.4, y_base + 1.0, 5.5, 4.0, 9.4, "Brick_Wash"),
        (ox + 14.5, y_base + 0.4, 5.8, 4.2, 11.8, "Stone_Federal"),
    ]
    for bi, (bx, by, bw, bd, bh, bmat) in enumerate(buildings):
        B(f"Bldg_{ox}_{bi}", (bx, by, bh * 0.5), (bw, bd, bh), bmat, c)
        B(f"Cornice_{ox}_{bi}", (bx, by, bh + 0.18), (bw + 0.35, bd + 0.35, 0.36), "Stone_Federal", c)
        # Rows of warm glowing windows on front facade
        cols = max(2, int(bw // 1.4))
        rows = max(2, int(bh // 2.2))
        for r in range(rows):
            for col_i in range(cols):
                wx = bx - (cols - 1) * 0.55 + col_i * 1.1
                wz = 2.0 + r * 2.0
                if wz < bh - 0.8:
                    lit = ((bi + r + col_i) % 3) != 0
                    B(f"BWin_{ox}_{bi}_{r}_{col_i}", (wx, by - bd * 0.5 - 0.03, wz), (0.62, 0.05, 0.95), "Glow_Window" if lit else "Glass_Dark", c)
        # Iconic Washington Dome on building #3!
        if bi == 3:
            CY(f"CapBase_{ox}", (bx, by, bh + 1.3), 1.85, 2.2, "Stone_Federal", c, segs=16)
            SP(f"CapDome_{ox}", (bx, by, bh + 2.5), (1.75, 1.75, 1.85), "Stone_Federal", c, segs=16)
            CY(f"CapLantern_{ox}", (bx, by, bh + 4.5), 0.42, 0.95, "Glow_Warm", c, segs=12)


def add_park_tree(prefix, tx, ty, sc, lmat, c):
    """Layered lush park tree with exposed root flare, branches & multi-puff foliage."""
    CY(f"{prefix}_Root", (tx, ty, 0.22 * sc), 0.36 * sc, 0.45 * sc, "Tree_Trunk", c, r2=0.25 * sc, segs=10)
    CY(f"{prefix}_Trunk", (tx, ty, 1.55 * sc), 0.25 * sc, 2.8 * sc, "Tree_Trunk", c, r2=0.17 * sc, segs=10)
    SP(f"{prefix}_CanA", (tx, ty, 3.35 * sc), (1.60 * sc, 1.50 * sc, 1.25 * sc), lmat, c, segs=14)
    SP(f"{prefix}_CanB", (tx + 0.82 * sc, ty - 0.32 * sc, 2.95 * sc), (1.12 * sc, 1.05 * sc, 0.95 * sc), lmat, c, segs=12)
    SP(f"{prefix}_CanC", (tx - 0.78 * sc, ty + 0.28 * sc, 3.05 * sc), (1.05 * sc, 1.02 * sc, 0.92 * sc), lmat, c, segs=12)
    SP(f"{prefix}_CanTop", (tx + 0.1 * sc, ty + 0.1 * sc, 4.15 * sc), (0.98 * sc, 0.95 * sc, 0.82 * sc), lmat, c, segs=12)


def build_L1_LabCIA(ox):
    """L1 V2: Bustling 1960s CIA Secret Acoustic Kitty Lab — maps, blueprints, typewriter desk, bookshelves, pipes & spinning reels!"""
    c = col("L1_LabCIA")
    B("LabFloor", (ox, 0, -0.05), (14, 12, 0.1), "Lab_Tile", c)
    B("LabCeil", (ox, 0, 4.6), (14, 12, 0.15), "Lab_Wall", c)
    B("LabWallBack", (ox, 4.2, 2.3), (14, 0.25, 4.7), "Lab_Wall", c)
    B("LabWallFront", (ox, -5.8, 2.3), (14, 0.25, 4.7), "Lab_Wall", c)
    B("LabWallLeft", (ox - 6.2, -0.8, 2.3), (0.25, 11, 4.7), "Lab_Wall", c)
    B("LabWallRight", (ox + 6.2, -0.8, 2.3), (0.25, 11, 4.7), "Lab_Wall", c)

    # Wood wainscotting + ceiling beams & metal ventilation duct pipes!
    B("TrimBack", (ox, 4.04, 0.65), (13.6, 0.08, 1.3), "Wood_Walnut", c)
    B("TrimLeft", (ox - 6.04, -0.8, 0.65), (0.08, 10.6, 1.3), "Wood_Walnut", c)
    B("TrimRight", (ox + 6.04, -0.8, 0.65), (0.08, 10.6, 1.3), "Wood_Walnut", c)
    for py in (-1.6, 1.4, 3.6):
        B(f"CeilBeam_{py}", (ox, py, 4.38), (13.5, 0.26, 0.30), "Metal_Dark", c)
    CY("VentPipe1", (ox, 3.55, 4.15), 0.16, 13.0, "Metal_Steel", c, rot=(0, PI / 2, 0), segs=12)
    CY("VentPipe2", (ox - 5.4, -0.5, 4.15), 0.12, 9.5, "Metal_Steel", c, rot=(PI / 2, 0, 0), segs=12)

    # Back Wall Centerpiece: Glowing Cat Blueprint + Cold War World Map + Retro Wall Clock!
    B("FrameBlue", (ox - 0.85, 4.02, 2.48), (2.25, 0.07, 1.65), "Wood_Walnut", c, bevel=0.02)
    B("CatBluePoster", (ox - 0.85, 3.97, 2.48), (2.05, 0.03, 1.46), "Cat_Blueprint", c)
    B("FrameMap", (ox + 1.50, 4.02, 2.48), (2.05, 0.07, 1.45), "Wood_Walnut", c, bevel=0.02)
    B("WorldMapPoster", (ox + 1.50, 3.97, 2.48), (1.88, 0.03, 1.28), "World_Map", c)
    # Vintage 1960s round CIA Wall Clock above board!
    CY("ClockRim", (ox + 0.35, 4.00, 3.68), 0.34, 0.10, "Metal_Dark", c, rot=(PI / 2, 0, 0), segs=20)
    CY("ClockFace", (ox + 0.35, 3.94, 3.68), 0.29, 0.03, "Clock_Face", c, rot=(PI / 2, 0, 0), segs=20)
    B("ClockH", (ox + 0.35, 3.91, 3.74), (0.03, 0.02, 0.16), "Metal_Dark", c)
    B("ClockM", (ox + 0.43, 3.91, 3.68), (0.18, 0.02, 0.025), "Reel_Red", c)

    # Vintage Mainframe Computer Rack (Left Back: ox - 3.6, y = 3.15) + Side Rack!
    mx, my = ox - 3.6, 3.15
    B("MainframeCab", (mx, my, 1.40), (1.75, 1.05, 2.8), "Mainframe_Grey", c, bevel=0.03)
    B("MainframePanel", (mx, my - 0.53, 2.10), (1.50, 0.04, 1.08), "Metal_Dark", c)
    B("MainframeDesk", (mx, my - 0.72, 1.05), (1.60, 0.48, 0.08), "Metal_Steel", c)
    for i, lx in enumerate([-0.55, -0.35, -0.15, 0.05, 0.25, 0.45]):
        B(f"MF_Light_{i}", (mx + lx, my - 0.56, 1.32), (0.09, 0.04, 0.09), "Glow_Green" if i % 2 == 0 else "Glow_Red", c)
    # Thick power cables snaking along floor from mainframe to table!
    B("FloorCable1", (ox - 2.0, 2.25, 0.03), (3.4, 0.08, 0.05), "Metal_Dark", c, rot=(0, 0, -0.32))
    B("FloorCable2", (ox - 1.9, 2.05, 0.03), (3.2, 0.06, 0.04), "Cable_Yellow", c, rot=(0, 0, -0.28))

    # ANIMATED SPINNING TAPE REELS ON MAINFRAME!
    for side, rx in [("L", mx - 0.37), ("R", mx + 0.37)]:
        def _reel(loc, coll):
            return [
                CY("Hub", loc, 0.28, 0.05, "Reel_Tape", coll, rot=(PI / 2, 0, 0), segs=20),
                CY("Core", (loc[0], loc[1] - 0.03, loc[2]), 0.11, 0.04, "Metal_Steel", coll, rot=(PI / 2, 0, 0), segs=14),
                B("Spoke1", (loc[0], loc[1] - 0.035, loc[2]), (0.48, 0.02, 0.055), "Reel_Red", coll),
                B("Spoke2", (loc[0], loc[1] - 0.035, loc[2]), (0.055, 0.02, 0.48), "Reel_Red", coll),
            ]
        make_anim_group(f"ANIM_ReelLab{side}", (rx, my - 0.58, 2.18), _reel, c)

    # Bookshelf stuffed with colourful secret binders (Left Wall: ox - 5.55, y = 0.8)
    B("BookShelfBack", (ox - 5.65, 0.6, 1.35), (0.55, 2.4, 2.7), "Wood_Walnut", c, bevel=0.02)
    bcols = ["Book_Red", "Book_Blue", "Book_Green", "Book_Gold", "Paper_Cream"]
    for shelf_z in (0.45, 1.05, 1.65, 2.25):
        B(f"Shelf_{shelf_z}", (ox - 5.50, 0.6, shelf_z - 0.22), (0.52, 2.3, 0.05), "Wood_Walnut", c)
        for bi in range(11):
            by = -0.35 + bi * 0.18
            bh = 0.26 + ((bi * 7) % 3) * 0.04
            B(f"Book_{shelf_z}_{bi}", (ox - 5.45, by, shelf_z - 0.04), (0.32, 0.11, bh), bcols[(bi + int(shelf_z * 3)) % len(bcols)], c)

    # Filing Cabinets TOP SECRET (Right Back: ox + 3.4 & +4.5)
    for idx, fx in enumerate([ox + 3.4, ox + 4.45]):
        B(f"FileCab_{idx}", (fx, 3.25, 1.05), (0.95, 0.95, 2.1), "Cabinet_Olive", c, bevel=0.02)
        for dz in (0.35, 0.90, 1.45, 1.85):
            pull = -0.24 if (idx == 0 and dz == 1.45) else 0.0
            B(f"Drawer_{idx}_{dz}", (fx, 2.75 + pull, dz), (0.82, 0.08, 0.38), "Mainframe_Grey", c)
            B(f"Handle_{idx}_{dz}", (fx, 2.68 + pull, dz), (0.24, 0.05, 0.05), "Brass_Gold", c)
            if pull < 0:
                B("SecretFile", (fx, 2.82 + pull, dz + 0.16), (0.62, 0.24, 0.18), "Paper_Cream", c)
    # Potted Office Plant beside cabinets
    CY("PlantPot", (ox + 5.35, 3.0, 0.28), 0.22, 0.56, "Pot_Terra", c, r2=0.30, segs=14)
    for pi, (dx, dy, dz) in enumerate([(0, 0, 0.78), (0.18, -0.1, 0.95), (-0.18, 0.1, 0.92), (0.05, 0.18, 1.05)]):
        SP(f"PlantLeaf_{pi}", (ox + 5.35 + dx, 3.0 + dy, dz), (0.24, 0.18, 0.28), "Tree_Leaf2", c, segs=10)

    # Central Stainless Research / Cat Gadget Table (ox, y = 1.45)
    tx, ty = ox, 1.45
    B("LabTableTop", (tx, ty, 0.92), (2.75, 1.25, 0.10), "Metal_Steel", c, bevel=0.02)
    B("LabTableShelf", (tx, ty, 0.28), (2.55, 1.05, 0.05), "Metal_Dark", c)
    for lx in (-1.20, 1.20):
        for ly in (-0.48, 0.48):
            CY(f"LabLeg_{lx}_{ly}", (tx + lx, ty + ly, 0.45), 0.045, 0.90, "Metal_Dark", c, segs=10)
    # Retro Oscilloscope + VU Meter + Cat Red Cushion + Spy Toolbox + Coffee Mug on table!
    B("TableScopeBox", (tx - 0.98, ty + 0.12, 1.24), (0.58, 0.46, 0.54), "Mainframe_Grey", c, bevel=0.02)
    B("TableScopeCRT", (tx - 0.98, ty - 0.12, 1.26), (0.44, 0.03, 0.36), "CRT_Scope", c)
    B("TableVUBox", (tx - 0.98, ty + 0.12, 1.62), (0.42, 0.34, 0.24), "Metal_Dark", c, bevel=0.01)
    B("TableVUDial", (tx - 0.98, ty - 0.06, 1.62), (0.34, 0.02, 0.18), "VU_Meter", c)
    B("CatCushion", (tx + 0.22, ty, 1.03), (0.92, 0.72, 0.13), "Reel_Red", c, bevel=0.03)
    B("GadgetBox", (tx + 1.05, ty + 0.15, 1.10), (0.46, 0.36, 0.26), "Cabinet_Olive", c, bevel=0.02)
    B("StackPapers", (tx + 0.96, ty - 0.28, 1.01), (0.34, 0.26, 0.08), "Paper_Cream", c)
    CY("CoffeeMug", (tx - 0.40, ty - 0.36, 1.04), 0.055, 0.14, "Paper_Cream", c, segs=12)

    # Secondary CIA Typewriter & Rotary Phone Desk (Right Side: ox + 4.4, y = -0.2)
    B("SideDeskTop", (ox + 4.4, -0.2, 0.82), (1.35, 1.85, 0.09), "Wood_Walnut", c, bevel=0.02)
    B("SideDeskPed", (ox + 4.6, -0.65, 0.41), (0.95, 0.65, 0.78), "Wood_Walnut", c)
    B("Typewriter", (ox + 4.25, -0.1, 0.98), (0.42, 0.46, 0.22), "Metal_Dark", c, bevel=0.02)
    B("TypePaper", (ox + 4.35, -0.1, 1.18), (0.04, 0.32, 0.28), "Paper_Cream", c, rot=(0, -0.2, 0))
    B("BankerLampBase", (ox + 4.6, 0.45, 0.92), (0.18, 0.18, 0.12), "Brass_Gold", c)
    B("BankerShade", (ox + 4.6, 0.45, 1.18), (0.28, 0.36, 0.14), "Glow_Green", c)

    # 3 Overhead Workshop Pendant Lamps
    for lx in (ox - 2.4, ox, ox + 2.4):
        CY(f"LampRod_{lx}", (lx, 1.4, 3.85), 0.03, 1.5, "Metal_Dark", c, segs=8)
        CY(f"LampCone_{lx}", (lx, 1.4, 3.05), 0.48, 0.32, "Cabinet_Olive", c, r2=0.14, segs=18)
        SP(f"LampBulb_{lx}", (lx, 1.4, 2.90), (0.14, 0.14, 0.12), "Glow_Warm", c, segs=12)

    # Large Window on Right Wall with glowing warm afternoon light & blinds
    B("WindowFrame", (ox + 6.02, 0.6, 2.45), (0.14, 3.2, 1.9), "Wood_Walnut", c)
    B("WindowGlow", (ox + 6.08, 0.6, 2.45), (0.04, 2.9, 1.65), "Glow_Warm", c)
    for bz in np.linspace(1.75, 3.15, 7):
        B(f"Blind_{bz:.2f}", (ox + 5.96, 0.6, float(bz)), (0.06, 2.85, 0.04), "Paper_Cream", c)


def build_L2_VanCIA(ox):
    """L2 V2: Richly Packed CIA Surveillance Van Interior + Crisp Exterior with Skyline & Clouds!"""
    c = col("L2_VanCIA")
    B("VanStreetGround", (ox, 0, -0.05), (36, 36, 0.1), "Asphalt", c)
    B("VanSidewalk", (ox, 5.2, 0.04), (36, 3.0, 0.18), "Sidewalk", c)
    B("VanParkGrass", (ox, 12.5, 0.05), (36, 12.5, 0.18), "Park_Grass", c)
    add_sky_and_washington_skyline(ox, c, y_base=19.0)

    # Van Interior Shell (spacious 4.2m wide x 6.2m long)
    B("VanFloorInner", (ox, 0, 0.22), (4.2, 6.2, 0.14), "Van_Floor", c)
    B("VanRoofInner", (ox, 0, 2.95), (4.2, 6.2, 0.16), "Van_Body", c)
    B("VanWallLeft", (ox - 2.05, 0, 1.58), (0.14, 6.2, 2.75), "Van_Interior", c)
    B("VanWallBack", (ox, -3.05, 1.58), (4.2, 0.14, 2.75), "Van_Interior", c)
    # Exterior trim stripe & chrome bumper on van outside
    B("VanExtStripeL", (ox - 2.13, 0, 1.35), (0.04, 6.1, 0.24), "Van_Stripe", c)
    B("VanExtBumperR", (ox, -3.20, 0.42), (4.3, 0.22, 0.24), "Chrome", c)
    for wx in (-2.05, 2.05):
        for wy in (-1.85, 1.85):
            CY(f"VanTire_{wx}_{wy}", (ox + wx, wy, 0.42), 0.42, 0.28, "Rubber_Tire", c, rot=(0, PI / 2, 0), segs=16)
            CY(f"VanHub_{wx}_{wy}", (ox + wx * 1.05, wy, 0.42), 0.20, 0.12, "Chrome", c, rot=(0, PI / 2, 0), segs=12)

    # Front windshield frame
    B("VanDashBase", (ox, 2.95, 0.78), (4.2, 0.35, 1.15), "Van_Interior", c)
    B("VanHeaderFront", (ox, 2.95, 2.68), (4.2, 0.30, 0.45), "Van_Body", c)
    B("VanPillarL", (ox - 1.95, 2.95, 1.85), (0.25, 0.30, 1.4), "Van_Body", c)
    B("VanPillarR", (ox + 1.95, 2.95, 1.85), (0.25, 0.30, 1.4), "Van_Body", c)
    B("VanWallRightRear", (ox + 2.05, -1.75, 1.58), (0.14, 2.6, 2.75), "Van_Interior", c)
    B("VanWallRightFront", (ox + 2.05, 2.15, 1.58), (0.14, 1.8, 2.75), "Van_Interior", c)
    # Map pinned on right interior rear wall
    B("VanWallMap", (ox + 1.94, -1.65, 1.78), (0.04, 1.45, 1.05), "World_Map", c)

    # ANIMATED SLIDING VAN DOOR!
    def _vandoor(loc, coll):
        return [
            B("DoorPanel", loc, (0.14, 1.90, 2.48), "Van_Body", coll, bevel=0.02),
            B("DoorStripe", (loc[0] + 0.08, loc[1], loc[2] - 0.18), (0.03, 1.86, 0.24), "Van_Stripe", coll),
            B("DoorHandle", (loc[0] + 0.10, loc[1] + 0.65, loc[2] - 0.02), (0.06, 0.22, 0.06), "Chrome", coll),
            B("DoorWin", (loc[0] + 0.02, loc[1], loc[2] + 0.56), (0.16, 1.28, 0.78), "Glass_Dark", coll),
        ]
    make_anim_group("ANIM_VanDoor", (ox + 2.18, 0.40, 1.56), _vandoor, c)

    # Packed Surveillance Console along Left Wall (CRTs, VU meters, patch cables, donut box, coffee!)
    B("ConsoleDesk", (ox - 1.40, 0.4, 0.92), (1.15, 4.4, 0.12), "Wood_Walnut", c, bevel=0.02)
    B("ConsoleBase", (ox - 1.52, 0.4, 0.54), (0.88, 4.2, 0.68), "Metal_Dark", c)
    B("ConsoleRack", (ox - 1.62, 0.4, 1.76), (0.68, 4.1, 1.52), "Mainframe_Grey", c, bevel=0.02)
    B("VanCRT1", (ox - 1.26, 1.45, 1.70), (0.04, 0.90, 0.64), "CRT_Scope", c)
    B("VanCRT2", (ox - 1.26, -0.45, 1.70), (0.04, 0.90, 0.64), "CRT_Scope", c)
    # 3 Warm Glowing VU Meters
    for vi, vy in enumerate([0.25, 0.58, 0.91]):
        B(f"VanVU_{vi}", (ox - 1.26, vy, 1.45), (0.04, 0.26, 0.18), "VU_Meter", c)
    # Coloured Audio Patch Cables & Status Buttons
    for k, ky in enumerate([-1.35, -1.10, -0.85, 0.15, 0.40, 0.65, 1.95, 2.15]):
        B(f"VanBtn_{k}", (ox - 1.25, ky, 1.15), (0.06, 0.11, 0.11), "Glow_Red" if k % 3 == 0 else "Glow_Green", c)
    B("PatchCab1", (ox - 1.22, -0.95, 1.45), (0.04, 0.42, 0.04), "Cable_Yellow", c, rot=(0.45, 0, 0))
    B("PatchCab2", (ox - 1.22, -0.88, 1.38), (0.04, 0.46, 0.04), "Cable_Red", c, rot=(-0.38, 0, 0))
    B("PatchCab3", (ox - 1.22, 1.05, 1.35), (0.04, 0.38, 0.04), "Cable_Blue", c, rot=(0.35, 0, 0))
    # Donut Box & Coffee Cups on Surveillance Desk (classic stakeout touch!)
    B("DonutBox", (ox - 1.05, -0.95, 1.06), (0.38, 0.38, 0.14), "Paper_Cream", c, bevel=0.01)
    B("DonutStripe", (ox - 1.05, -0.95, 1.135), (0.38, 0.12, 0.02), "Reel_Red", c)
    CY("VanCoffee1", (ox - 1.02, -0.42, 1.08), 0.055, 0.18, "Paper_Cream", c, r2=0.068, segs=12)
    CY("VanCoffee2", (ox - 1.12, 1.25, 1.08), 0.055, 0.18, "Paper_Cream", c, r2=0.068, segs=12)
    # Swivel chair inside van
    CY("ChairBase", (ox - 0.35, 0.15, 0.36), 0.28, 0.06, "Metal_Dark", c, segs=12)
    CY("ChairStem", (ox - 0.35, 0.15, 0.56), 0.045, 0.36, "Chrome", c, segs=10)
    B("ChairSeat", (ox - 0.35, 0.15, 0.78), (0.52, 0.52, 0.10), "Reel_Red", c, bevel=0.02)
    B("ChairBack", (ox - 0.12, 0.15, 1.12), (0.10, 0.48, 0.58), "Reel_Red", c, bevel=0.02)

    # ANIMATED SPINNING TAPE REELS IN VAN CONSOLE!
    for side, ry in [("L", 0.32), ("R", 0.84)]:
        def _vreel(loc, coll):
            return [
                CY("Hub", loc, 0.23, 0.05, "Reel_Tape", coll, rot=(0, PI / 2, 0), segs=18),
                CY("Core", (loc[0] + 0.03, loc[1], loc[2]), 0.085, 0.04, "Metal_Steel", coll, rot=(0, PI / 2, 0), segs=12),
                B("Spoke1", (loc[0] + 0.035, loc[1], loc[2]), (0.02, 0.40, 0.045), "Reel_Red", coll),
                B("Spoke2", (loc[0] + 0.035, loc[1], loc[2]), (0.02, 0.045, 0.40), "Reel_Red", coll),
            ]
        make_anim_group(f"ANIM_ReelVan{side}", (ox - 1.25, ry, 2.12), _vreel, c)

    SP("VanDomeLight", (ox, 0.4, 2.82), (0.30, 0.30, 0.09), "Glow_Warm", c, segs=12)

    # ANIMATED ROTATING ROOF RADAR DISH ON TOP OF VAN!
    def _radar(loc, coll):
        return [
            CY("Mast", (loc[0], loc[1], loc[2] + 0.32), 0.09, 0.66, "Metal_Dark", coll, segs=10),
            CY("Dish", (loc[0], loc[1] + 0.18, loc[2] + 0.72), 0.65, 0.18, "Metal_Steel", coll, rot=(PI * 0.42, 0, 0), r2=0.14, segs=22),
            CY("DishRim", (loc[0], loc[1] + 0.15, loc[2] + 0.70), 0.67, 0.05, "Brass_Gold", coll, rot=(PI * 0.42, 0, 0), segs=22),
            CY("Feed", (loc[0], loc[1] + 0.42, loc[2] + 0.76), 0.035, 0.40, "Brass_Gold", coll, rot=(PI * 0.42, 0, 0), segs=8),
            SP("Tip", (loc[0], loc[1] + 0.58, loc[2] + 0.80), (0.08, 0.08, 0.08), "Glow_Red", coll, segs=10),
        ]
    make_anim_group("ANIM_VanRadar", (ox, 0.2, 3.05), _radar, c)

    # Lush trees & streetlamp outside front windshield
    add_park_tree("VanTreeL", ox - 3.6, 8.2, 1.15, "Tree_Autumn", c)
    add_park_tree("VanTreeR", ox + 3.2, 8.8, 1.25, "Tree_Leaf1", c)
    add_park_tree("VanTreeMid", ox - 0.4, 11.2, 1.30, "Tree_Leaf2", c)
    CY("VanOutLamp", (ox + 1.8, 4.4, 1.95), 0.07, 3.7, "Lamp_Post", c, segs=8)
    SP("VanOutGlobe", (ox + 1.8, 4.4, 3.92), (0.22, 0.22, 0.26), "Glow_Warm", c, segs=10)


def build_L3_TamanWashington(ox):
    """L3 V2: Bustling 1960s Washington Park & Avenue — Sunset Clouds, Capitol Skyline, Crosswalk, Hydrant, Mailbox, Grass Tufts, Flowers, Taxi & Fish Cart!"""
    c = col("L3_TamanWashington")
    add_sky_and_washington_skyline(ox, c, y_base=18.5)

    # Asphalt Street + Double Yellow Center Line + Zebra Crosswalk + Iron Manhole Cover!
    B("StreetRoad", (ox, -2.6, -0.06), (40, 6.6, 0.12), "Asphalt", c)
    for dy in (-0.12, 0.12):
        B(f"CenterYellow_{dy}", (ox, -2.6 + dy, 0.008), (38, 0.09, 0.012), "Road_Line", c)
    # Crisp Zebra Crosswalk right where Agen Meong dashes across!
    for zi in range(-2, 3):
        B(f"Zebra_{zi}", (ox - 1.6, -2.6 + zi * 1.12, 0.010), (2.2, 0.56, 0.012), "Zebra_White", c)
    CY("ManholeCover", (ox + 3.4, -1.3, 0.012), 0.45, 0.025, "Metal_Dark", c, segs=16)

    # Segmented Stone Curb Blocks + Textured Sidewalk + Park Lawn
    B("Sidewalk", (ox, 2.0, 0.04), (40, 3.1, 0.22), "Sidewalk", c, bevel=0.02)
    for cx in range(-14, 16, 2):
        B(f"Curb_{cx}", (ox + cx, 0.48, 0.07), (1.92, 0.22, 0.28), "Stone_Federal", c, bevel=0.015)
    B("ParkLawn", (ox, 11.2, 0.05), (40, 15.6, 0.20), "Park_Grass", c)

    # Curved Park Stone Pathway leading from entrance into the park!
    for pi in range(9):
        py = 3.7 + pi * 0.95
        px = ox - 0.4 + math.sin(pi * 0.45) * 0.85
        CY(f"PathStone_{pi}", (px, py, 0.16), 0.62, 0.05, "Sidewalk", c, segs=12)

    # Wrought-Iron Park Fence with ornamental spear tips
    for fx in list(range(-14, -2)) + list(range(3, 15)):
        B(f"FencePost_{fx}", (ox + fx, 3.55, 0.68), (0.07, 0.07, 1.15), "Lamp_Post", c)
        CY(f"FenceTip_{fx}", (ox + fx, 3.55, 1.32), 0.05, 0.16, "Brass_Gold", c, r2=0.01, segs=6)
    B("FenceRailL1", (ox - 8.0, 3.55, 1.10), (12, 0.06, 0.07), "Lamp_Post", c)
    B("FenceRailL2", (ox - 8.0, 3.55, 0.35), (12, 0.06, 0.07), "Lamp_Post", c)
    B("FenceRailR1", (ox + 8.5, 3.55, 1.10), (12, 0.06, 0.07), "Lamp_Post", c)
    B("FenceRailR2", (ox + 8.5, 3.55, 0.35), (12, 0.06, 0.07), "Lamp_Post", c)
    # Stone Gate Pillars flanking park entrance
    for gx in (ox - 2.35, ox + 2.35):
        B(f"GatePillar_{gx}", (gx, 3.55, 0.88), (0.52, 0.52, 1.55), "Stone_Federal", c, bevel=0.03)
        SP(f"GateOrb_{gx}", (gx, 3.55, 1.82), (0.22, 0.22, 0.22), "Brass_Gold", c, segs=12)

    # Vintage Streetlamps + Red Fire Hydrant + Classic US Blue Mailbox + STOP Sign + Trash Bin!
    for lx in (ox - 5.4, ox + 0.15, ox + 6.0):
        CY(f"LampPole_{lx}", (lx, 0.95, 1.98), 0.08, 3.75, "Lamp_Post", c, r2=0.05, segs=10)
        CY(f"LampBase_{lx}", (lx, 0.95, 0.38), 0.22, 0.58, "Lamp_Post", c, r2=0.12, segs=10)
        SP(f"LampGlobe_{lx}", (lx, 0.95, 4.02), (0.25, 0.25, 0.29), "Glow_Warm", c, segs=12)

    # Classic Red Fire Hydrant on sidewalk (ox - 3.0, y = 0.92)
    hx, hy = ox - 3.0, 0.92
    CY("HydrantBody", (hx, hy, 0.45), 0.14, 0.62, "Hydrant_Red", c, segs=12)
    SP("HydrantCap", (hx, hy, 0.78), (0.15, 0.15, 0.12), "Hydrant_Red", c, segs=12)
    CY("HydrantNozzle", (hx, hy, 0.56), 0.06, 0.38, "Hydrant_Red", c, rot=(0, PI / 2, 0), segs=10)

    # Classic US Blue Mailbox (ox + 1.7, y = 1.05)
    mx, my = ox + 1.7, 1.05
    B("MailBoxBody", (mx, my, 0.78), (0.48, 0.44, 0.76), "Mailbox_Blue", c, bevel=0.03)
    CY("MailBoxTop", (mx, my, 1.16), 0.24, 0.44, "Mailbox_Blue", c, rot=(PI / 2, 0, 0), segs=14)
    for lx in (-0.18, 0.18):
        B(f"MailLeg_{lx}", (mx + lx, my, 0.28), (0.06, 0.36, 0.34), "Metal_Dark", c)

    # Street Sign & Red STOP Sign (ox - 0.1, y = 0.85)
    CY("SignPole", (ox - 2.35, 0.85, 1.45), 0.04, 2.7, "Metal_Steel", c, segs=8)
    CY("StopOct", (ox - 2.35, 0.80, 2.35), 0.34, 0.04, "Hydrant_Red", c, rot=(PI / 2, 0, PI / 8), segs=8)
    B("StreetBlade", (ox - 2.35, 0.85, 2.78), (0.85, 0.05, 0.20), "Sign_Green", c)

    # Park Wooden Trash Bin near bench
    CY("TrashBin", (ox + 0.65, 5.1, 0.52), 0.26, 0.76, "Bench_Wood", c, segs=12)
    CY("TrashRim", (ox + 0.65, 5.1, 0.90), 0.28, 0.07, "Metal_Dark", c, segs=12)

    # 2 Diplomat Wooden Park Benches
    for bi, (bx, by, rotz) in enumerate([(ox - 1.35, 5.35, 0.0), (ox + 4.8, 6.2, -0.35)]):
        B(f"BenchSeat_{bi}", (bx, by, 0.58), (2.25, 0.58, 0.09), "Bench_Wood", c, rot=(0, 0, rotz), bevel=0.015)
        B(f"BenchBack_{bi}", (bx, by + 0.25, 0.96), (2.25, 0.09, 0.52), "Bench_Wood", c, rot=(math.radians(-12), 0, rotz), bevel=0.015)
        for sx in (-0.92, 0.92):
            B(f"BenchLeg_{bi}_{sx}", (bx + sx, by, 0.36), (0.10, 0.52, 0.50), "Lamp_Post", c)

    # 8 Lush Layered Park Trees (Green + Autumn Gold + Deep Forest!)
    trees = [
        (ox - 8.2, 6.8, 1.25, "Tree_Leaf1"),
        (ox - 4.6, 8.6, 1.35, "Tree_Autumn"),
        (ox - 1.2, 10.6, 1.28, "Tree_Gold"),
        (ox + 2.2, 8.8, 1.22, "Tree_Leaf2"),
        (ox + 6.6, 6.8, 1.32, "Tree_Leaf1"),
        (ox + 9.8, 9.2, 1.20, "Tree_Autumn"),
        (ox - 11.2, 9.4, 1.15, "Tree_Leaf2"),
        (ox + 12.2, 7.6, 1.18, "Tree_Gold"),
    ]
    for i, (tx, ty, sc, lmat) in enumerate(trees):
        add_park_tree(f"ParkTree_{i}", tx, ty, sc, lmat, c)

    # 45+ 3D Grass Tufts, Bushes, Flower Beds, & Fallen Autumn Leaves across park & sidewalk edge!
    fcols = ["Flower_Red", "Flower_Yellow", "Flower_Purple"]
    # Bushes lining fence & behind benches
    for bi, (bx, by, bs) in enumerate([
        (ox - 6.2, 4.1, 0.72), (ox - 3.4, 4.0, 0.65), (ox + 3.4, 4.1, 0.68),
        (ox + 7.2, 4.2, 0.78), (ox - 2.6, 5.8, 0.60), (ox + 1.8, 6.4, 0.64),
        (ox - 5.2, 7.0, 0.75), (ox + 5.8, 7.8, 0.70),
    ]):
        SP(f"Bush_{bi}", (bx, by, 0.42 * bs), (0.95 * bs, 0.78 * bs, 0.68 * bs), "Bush_Dark" if bi % 2 == 0 else "Tree_Leaf1", c, segs=10)
        # Cute flowers dotted on bushes!
        for fi in range(3):
            SP(f"BFlow_{bi}_{fi}", (bx + (fi - 1) * 0.28 * bs, by - 0.38 * bs, (0.55 + (fi % 2) * 0.14) * bs), (0.09, 0.09, 0.09), fcols[(bi + fi) % 3], c, segs=8)

    # 30 3D Grass Tufts + Flowers scattered across the lawn!
    for gi in range(32):
        gx = ox + float(RNG.uniform(-11.5, 11.5))
        gy = float(RNG.uniform(3.9, 12.5))
        gs = float(RNG.uniform(0.18, 0.34))
        CY(f"TuftA_{gi}", (gx, gy, 0.15 + gs * 0.4), gs * 0.25, gs, "Grass_Tuft", c, rot=(0.25, 0.2, gi), r2=0.01, segs=5)
        CY(f"TuftB_{gi}", (gx + 0.08, gy - 0.05, 0.15 + gs * 0.35), gs * 0.22, gs * 0.85, "Tree_Leaf2", c, rot=(-0.25, -0.2, gi), r2=0.01, segs=5)
        if gi % 3 == 0:
            SP(f"LawnFlow_{gi}", (gx + 0.12, gy + 0.06, 0.26), (0.075, 0.075, 0.05), fcols[gi % 3], c, segs=6)

    # Fallen Autumn Leaves along sidewalk & grass edge
    for li in range(22):
        lx = ox + float(RNG.uniform(-8.5, 8.5))
        ly = float(RNG.uniform(0.8, 4.8))
        B(f"Leaf_{li}", (lx, ly, 0.165), (0.14, 0.09, 0.015), "Tree_Autumn" if li % 2 == 0 else "Tree_Gold", c, rot=(0, 0, float(RNG.uniform(0, 3.14))))

    # Parked CIA Surveillance Van Exterior (left side of street) + 2 Vintage 1960s Parked Sedans!
    vx, vy = ox - 6.0, -0.75
    B("ExtVanBody", (vx, vy, 1.18), (3.65, 1.78, 1.58), "Van_Body", c, bevel=0.08)
    B("ExtVanHood", (vx + 2.08, vy, 0.88), (0.78, 1.70, 0.96), "Van_Body", c, bevel=0.06)
    B("ExtVanStripe", (vx, vy - 0.91, 1.08), (3.55, 0.04, 0.20), "Van_Stripe", c)
    B("ExtVanWin", (vx + 1.80, vy, 1.50), (0.14, 1.50, 0.60), "Glass_Dark", c)
    B("ExtVanBumper", (vx + 2.50, vy, 0.44), (0.16, 1.76, 0.18), "Chrome", c)
    for wx in (-1.2, 1.4):
        for wy in (-0.88, 0.88):
            CY(f"ExtVanW_{wx}_{wy}", (vx + wx, vy + wy, 0.38), 0.38, 0.24, "Rubber_Tire", c, rot=(PI / 2, 0, 0), segs=16)
            CY(f"ExtVanH_{wx}_{wy}", (vx + wx, vy + wy * 1.05, 0.38), 0.18, 0.12, "Chrome", c, rot=(PI / 2, 0, 0), segs=10)

    # Extra parked 1960s classic sedan on far right street so avenue feels alive!
    for ci, (cx, cy, cmat) in enumerate([(ox + 9.2, -0.75, "Car_Blue"), (ox - 11.8, -4.3, "Car_Mint")]):
        B(f"CarLow_{ci}", (cx, cy, 0.58), (3.2, 1.52, 0.62), cmat, c, bevel=0.07)
        B(f"CarCab_{ci}", (cx - 0.1, cy, 1.10), (1.65, 1.38, 0.52), cmat, c, bevel=0.06)
        B(f"CarWin_{ci}", (cx - 0.1, cy, 1.10), (1.70, 1.42, 0.38), "Glass_Dark", c)
        for wx in (-0.98, 0.98):
            for wy in (-0.76, 0.76):
                CY(f"CarW_{ci}_{wx}_{wy}", (cx + wx, cy + wy, 0.32), 0.32, 0.20, "Rubber_Tire", c, rot=(PI / 2, 0, 0), segs=14)

    # ANIMATED 1960s CLASSIC YELLOW TAXI V2 (chrome grille, checkered trim, roof light, dual headlights!)
    def _taxi(loc, coll):
        x, y, z = loc
        objs = [
            B("TaxiLower", (x, y, z + 0.62), (3.42, 1.60, 0.66), "Taxi_Yellow", coll, bevel=0.07),
            B("TaxiCabin", (x - 0.12, y, z + 1.18), (1.78, 1.44, 0.56), "Taxi_Yellow", coll, bevel=0.06),
            B("TaxiGlass", (x - 0.12, y, z + 1.18), (1.84, 1.48, 0.40), "Glass_Dark", coll),
            B("TaxiSign", (x - 0.12, y, z + 1.56), (0.52, 0.26, 0.20), "Glow_Warm", coll, bevel=0.03),
            B("TaxiStripeF", (x, y - 0.81, z + 0.68), (3.25, 0.03, 0.14), "Taxi_Checker", coll),
            B("TaxiGrille", (x + 1.72, y, z + 0.60), (0.06, 0.92, 0.34), "Chrome", coll),
            B("TaxiBumperF", (x + 1.74, y, z + 0.40), (0.18, 1.66, 0.18), "Chrome", coll),
            B("TaxiBumperR", (x - 1.74, y, z + 0.40), (0.18, 1.66, 0.18), "Chrome", coll),
        ]
        for hy in (-0.54, 0.54):
            objs.append(SP(f"TaxiHead_{hy}", (x + 1.70, y + hy, z + 0.72), (0.09, 0.15, 0.15), "Glow_Warm", coll, segs=10))
            objs.append(SP(f"TaxiTail_{hy}", (x - 1.70, y + hy, z + 0.72), (0.08, 0.13, 0.13), "Glow_Red", coll, segs=10))
        for wx in (-1.05, 1.05):
            for wy in (-0.79, 0.79):
                objs.append(CY(f"TaxiTire_{wx}_{wy}", (x + wx, y + wy, z + 0.34), 0.34, 0.22, "Rubber_Tire", coll, rot=(PI / 2, 0, 0), segs=16))
                objs.append(CY(f"TaxiHub_{wx}_{wy}", (x + wx, y + wy * 1.06, z + 0.34), 0.17, 0.16, "Chrome", coll, rot=(PI / 2, 0, 0), segs=12))
        return objs
    make_anim_group("ANIM_YellowTaxi", (ox + 1.4, -2.5, 0.0), _taxi, c)

    # ANIMATED GRILLED FISH VENDOR CART V2 (glowing embers, scalloped awning, piled shiny fish, sauce bottles!)
    def _fishcart(loc, coll):
        x, y, z = loc
        objs = [
            B("CartBody", (x, y, z + 0.72), (2.2, 1.18, 0.92), "Wood_Walnut", coll, bevel=0.03),
            B("CartTrim", (x, y - 0.60, z + 0.72), (2.05, 0.04, 0.52), "Awning_Stripe", coll),
            B("CartCounter", (x, y, z + 1.22), (2.35, 1.32, 0.10), "Metal_Steel", coll, bevel=0.02),
            B("CartGrill", (x - 0.42, y, z + 1.32), (0.98, 0.80, 0.14), "Metal_Dark", coll),
            B("CartEmbers", (x - 0.42, y, z + 1.37), (0.86, 0.68, 0.06), "Glow_Ember", coll),
            B("CartTray", (x + 0.58, y, z + 1.31), (0.84, 0.82, 0.08), "Paper_Cream", coll),
            B("AwningRoof", (x, y, z + 2.55), (2.68, 1.72, 0.16), "Awning_Stripe", coll, rot=(math.radians(9), 0, 0), bevel=0.02),
            CY("SauceRed", (x + 0.98, y - 0.42, z + 1.42), 0.055, 0.24, "Hydrant_Red", coll, segs=10),
            CY("SauceYel", (x + 0.84, y - 0.44, z + 1.40), 0.055, 0.22, "Taxi_Yellow", coll, segs=10),
        ]
        for px in (-1.02, 1.02):
            for py in (-0.54, 0.54):
                objs.append(CY(f"CartPole_{px}_{py}", (x + px, y + py, z + 1.90), 0.036, 1.32, "Chrome", coll, segs=8))
        for wx in (-0.78, 0.78):
            objs.append(CY(f"CartWheel_{wx}", (x + wx, y - 0.64, z + 0.34), 0.34, 0.10, "Rubber_Tire", coll, rot=(PI / 2, 0, 0), segs=16))
            objs.append(CY(f"CartHub_{wx}", (x + wx, y - 0.67, z + 0.34), 0.14, 0.08, "Brass_Gold", coll, rot=(PI / 2, 0, 0), segs=10))
        fish_pos = [
            (x - 0.65, y - 0.14, z + 1.45, "Fish_Grill"),
            (x - 0.35, y + 0.14, z + 1.45, "Fish_Grill"),
            (x - 0.12, y - 0.10, z + 1.45, "Fish_Grill"),
            (x + 0.42, y - 0.18, z + 1.40, "Fish_Silver"),
            (x + 0.68, y + 0.06, z + 1.40, "Fish_Silver"),
            (x + 0.52, y + 0.20, z + 1.48, "Fish_Silver"),
            (x + 0.72, y - 0.14, z + 1.48, "Fish_Silver"),
        ]
        for idx, (fx, fy, fz, fmat) in enumerate(fish_pos):
            objs.append(SP(f"FishBody_{idx}", (fx, fy, fz), (0.24, 0.085, 0.06), fmat, coll, segs=12))
            objs.append(CY(f"FishTail_{idx}", (fx + 0.24, fy, fz), 0.08, 0.10, fmat, coll, rot=(0, PI / 2, 0), r2=0.01, segs=6))
        return objs
    make_anim_group("ANIM_FishCart", (ox + 4.4, 2.05, 0.12), _fishcart, c)


build_textures()
OX = {"L1": 0, "L2": 400, "L3": 800}
build_L1_LabCIA(OX["L1"])
build_L2_VanCIA(OX["L2"])
build_L3_TamanWashington(OX["L3"])


def render_previews():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 24
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.max_bounces = 4
    sc.cycles.use_denoising = False
    sc.render.resolution_x = 540
    sc.render.resolution_y = 720
    sc.view_settings.view_transform = "Filmic"
    sc.view_settings.look = "Medium High Contrast"

    w = bpy.data.worlds.new("PreviewWorld")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 0.85
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.05
    ramp.color_ramp.elements[0].color = (*lin("#F5B678"), 1.0)
    el_mid = ramp.color_ramp.elements.new(0.28)
    el_mid.color = (*lin("#D98C6C"), 1.0)
    ramp.color_ramp.elements[2].position = 0.62
    ramp.color_ramp.elements[2].color = (*lin("#274478"), 1.0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    def add_pt(name, ltype, loc, rot, energy, col_h="#FFF2D6", sz=1.5):
        ld = bpy.data.lights.new(name, type=ltype)
        ld.energy = energy
        ld.color = lin(col_h)
        if ltype == "AREA":
            ld.size = sz
        o = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        return o

    add_pt("Sun", "SUN", (0, 0, 20), (math.radians(52), 0, math.radians(-35)), 3.2, "#FFE6BD")
    add_pt("L1_Key", "AREA", (0, -0.6, 3.6), (math.radians(22), 0, 0), 340, "#FFF0D0", 3.2)
    add_pt("L1_Fill", "POINT", (-2.6, 1.2, 2.6), (0, 0, 0), 130, "#B8E4FF")
    add_pt("L2_In", "POINT", (400.2, 0.2, 2.55), (0, 0, 0), 210, "#FFE4A3")
    add_pt("L2_ExtFill", "AREA", (406.0, -4.0, 4.0), (math.radians(52), 0, math.radians(40)), 260, "#FFE0B0", 3.0)
    add_pt("L3_Warm", "AREA", (804.0, -1.5, 4.8), (math.radians(42), 0, 0), 340, "#FFD89B", 3.0)

    cam_d = bpy.data.cameras.new("PreviewCam")
    cam = bpy.data.objects.new("PreviewCam", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam

    shots = [
        ("01_lab_wide.png", (0.7, -3.7, 2.05), (-0.2, 2.5, 1.55), 30),
        ("02_lab_mainframe.png", (-0.6, -1.2, 1.85), (-3.5, 2.6, 1.65), 32),
        ("03_van_inside.png", (401.35, -1.95, 1.72), (398.9, 1.0, 1.48), 25),
        ("04_van_radar_door.png", (406.4, -3.4, 2.65), (400.3, 0.6, 1.90), 32),
        ("05_taman_wide.png", (798.2, -8.2, 2.75), (800.6, 4.5, 2.1), 28),
        ("06_taman_fishcart.png", (800.2, -5.2, 2.05), (804.2, 2.4, 1.55), 32),
    ]
    for fn, loc, tgt, lens in shots:
        cam.location = loc
        cam_d.lens = lens
        cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(OUTDIR, fn)
        bpy.ops.render.render(write_still=True)
        print("PREVIEW_OK", fn, flush=True)


if WANT == "all":
    render_previews()


def merge_for_export():
    from collections import defaultdict
    for o in list(bpy.data.objects):
        if o.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(o, do_unlink=True)

    groups = defaultdict(list)
    for o in list(bpy.data.objects):
        if o.type != "MESH" or not o.data.materials or not o.users_collection:
            continue
        if o.name.startswith("ANIM_"):
            continue
        groups[(o.users_collection[0].name, o.data.materials[0].name)].append(o)
    for (colname, mn), objs in groups.items():
        if len(objs) < 2:
            objs[0].name = f"{colname}__{mn}"
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        bpy.context.object.name = f"{colname}__{mn}"


if GLB:
    os.makedirs(os.path.dirname(os.path.abspath(GLB)), exist_ok=True)
    merge_for_export()
    bpy.ops.export_scene.gltf(
        filepath=GLB,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_apply=True,
    )
    print("GLB_OK", GLB, os.path.getsize(GLB) // 1024, "KB", flush=True)
