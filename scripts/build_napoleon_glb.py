"""Latar "Napoleon vs Kelinci" (1807) di Blender headless: L1 paviliun rakit, L2 tenda markas, L3 peternakan,
L4 lapangan perburuan, L5 kereta kuda. Memakai helper build_school_glb.py (UV asli + material Principled
agar ikut ke GLB).

Pakai:
  blender -b -noaudio --python scripts/build_napoleon_glb.py -- <folder_keluaran> [tampilan,tampilan|all] [file.glb]
Contoh tampilan: l1_udara,l1_dalam,l2_dalam,l3_luar,l3_dalam,l4_luas,l5_luar,l5_dalam,l6_malam
"""
import importlib.util, math, os, random, sys, time
import numpy as np
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index("--") + 1:]
OUTDIR = ARGS[0]
WANT = (ARGS[1] if len(ARGS) > 1 else "all")
GLB = ARGS[2] if len(ARGS) > 2 else None
os.makedirs(OUTDIR, exist_ok=True)

spec = importlib.util.spec_from_file_location("sch", os.path.join(HERE, "build_school_glb.py"))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
S.clear_scene()
S.init_materials()
MATS = S.MATS
PI = math.pi
rng = np.random.default_rng(7)


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def img(name, arr):
    h, w, _ = arr.shape
    return S.make_image_from_rgba(name, np.concatenate([arr, np.ones((h, w, 1))], axis=2).astype(np.float32))


def noise(h, w, k, seed):
    r = np.random.default_rng(seed)
    return np.kron(r.random((h // k + 2, w // k + 2)), np.ones((k, k)))[:h, :w]


def tex_stripes(c1, c2, n=8):
    H = W = 256
    a, b = np.array(lin(c1)), np.array(lin(c2))
    x = (np.arange(W) * n // W) % 2
    row = np.where(x[:, None] == 0, a[None, :], b[None, :])
    return img("stripes" + c1 + c2, np.repeat(row[None, :, :], H, axis=0) * (0.96 + 0.06 * noise(H, W, 4, 3))[..., None])


def tex_straw():
    H = W = 256
    base = np.array(lin("#d9b25a"))
    n = np.repeat(noise(1, W, 3, 5), H, axis=0)
    out = base[None, None, :] * (0.78 + 0.4 * n)[..., None]
    out[rng.random((H, W)) > 0.97] = np.array(lin("#f0d58a"))
    return img("straw", np.clip(out, 0, 1))


def tex_dirt():
    H = W = 256
    base = np.array(lin("#8a6a46"))
    n = 0.5 * noise(H, W, 4, 8) + 0.5 * noise(H, W, 32, 9)
    out = base[None, None, :] * (0.8 + 0.4 * n)[..., None]
    out[rng.random((H, W)) > 0.985] = np.array(lin("#b89a72"))
    return img("dirt", np.clip(out, 0, 1))


def snoise(h, w, k, seed):
    r = np.random.default_rng(seed)
    n = r.random((h // k + 3, w // k + 3))
    ys = np.linspace(0, n.shape[0] - 1.001, h)
    xs = np.linspace(0, n.shape[1] - 1.001, w)
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
    return n[y0][:, x0] * (1 - fx) * (1 - fy) + n[y0][:, x0 + 1] * fx * (1 - fy) + n[y0 + 1][:, x0] * (1 - fx) * fy + n[y0 + 1][:, x0 + 1] * fx * fy


def tex_grass():
    H = W = 256
    a, b, c3 = np.array(lin("#86bd50")), np.array(lin("#6aa23c")), np.array(lin("#9ccb62"))
    n = 0.55 * snoise(H, W, 32, 12) + 0.45 * snoise(H, W, 8, 13)
    out = a[None, None, :] * (1 - n)[..., None] + b[None, None, :] * n[..., None]
    out = out * (0.93 + 0.14 * snoise(H, W, 3, 14))[..., None]
    sp = rng.random((H, W))
    out[sp > 0.992] = c3
    out[sp < 0.004] = np.array(lin("#4f8a30"))
    return img("grass2", np.clip(out, 0, 1))


def tex_map():
    H = W = 512
    out = np.ones((H, W, 3)) * np.array(lin("#e9d8aa"))
    out *= (0.92 + 0.1 * noise(H, W, 6, 2))[..., None]
    # daratan berwarna + garis batas + titik kota
    for (cx, cy, rx, ry, col) in ((170, 170, 120, 90, "#9bb87a"), (330, 150, 110, 70, "#c8a678"), (260, 330, 150, 110, "#a4b890"), (110, 340, 70, 60, "#d2b27a")):
        yy, xx = np.ogrid[:H, :W]
        m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
        out[m] = np.array(lin(col)) * (0.9 + 0.1 * noise(H, W, 8, cx)[m][:, None])
    for k in range(6):
        out[60 + k * 70:63 + k * 70, :] *= 0.6
        out[:, 60 + k * 70:63 + k * 70] *= 0.6
    for _ in range(12):
        cx, cy = int(rng.integers(40, 470)), int(rng.integers(40, 470))
        out[cy - 5:cy + 5, cx - 5:cx + 5] = np.array(lin("#8a2a22"))
    out[:6] = out[-6:] = out[:, :6] = out[:, -6:] = np.array(lin("#6a4a2a"))
    return img("peta", np.clip(out, 0, 1))


def tex_rug():
    H = W = 256
    base = np.array(lin("#7a1e24"))
    out = np.ones((H, W, 3)) * base
    out[8:H:48] = np.array(lin("#c89a3a"))
    out[:, 8:W:48] = np.array(lin("#c89a3a"))
    out[:14] = out[-14:] = out[:, :14] = out[:, -14:] = np.array(lin("#d8aa3a"))
    out[20:28] = out[-28:-20] = out[:, 20:28] = out[:, -28:-20] = np.array(lin("#2a2f6a"))
    return img("karpet", out * (0.93 + 0.1 * noise(H, W, 4, 4))[..., None])


T_STR_BLUE = tex_stripes("#f0e8d4", "#6c88b8", 10)
T_STR_RED = tex_stripes("#f0e8d4", "#b0342e", 12)
M = S.make_mat
M("Water", lin("#3d92aa"), roughness=0.12)
M("Water_Deep", lin("#2c6f8c"), roughness=0.15)
M("Canvas_Cream", lin("#efe3c6"), roughness=0.95)
M("Canvas_Blue", lin("#f0e8d4"), roughness=0.92, image=T_STR_BLUE, uv_scale=1.0)
M("Canvas_Red", lin("#f0e8d4"), roughness=0.92, image=T_STR_RED, uv_scale=1.0)
M("Velvet_Red", lin("#6a1018"), roughness=0.9)
M("Velvet_Blue", lin("#1f2f6a"), roughness=0.9)
M("Rug", lin("#7a1e24"), roughness=0.95, image=tex_rug(), uv_scale=1.0)
M("Straw", lin("#d9b25a"), roughness=1.0, image=tex_straw(), uv_scale=1.0)
M("Dirt", lin("#8a6a46"), roughness=1.0, image=tex_dirt(), uv_scale=0.5)
M("Meadow", lin("#7fb64a"), roughness=1.0, image=tex_grass(), uv_scale=0.35)
M("Map_Table", lin("#e9d8aa"), roughness=0.9, image=tex_map(), uv_scale=1.0)
M("Flag_Blue", lin("#1f3f9a"), roughness=0.85)
M("Flag_White", lin("#f6f2e8"), roughness=0.85)
M("Flag_Red", lin("#c4262c"), roughness=0.85)
M("Gold", lin("#d8aa3a"), roughness=0.35, metallic=0.6)
M("Flame", lin("#ffc860"), roughness=0.3, emission=lin("#ffb040"), emission_strength=6.0)
M("Lamp_Warm", lin("#ffe0a0"), roughness=0.3, emission=lin("#ffc870"), emission_strength=3.0)
M("Wire", lin("#4a4a52"), roughness=0.5, metallic=0.6)
M("Leather", lin("#2a1c16"), roughness=0.7)
M("Carriage_Blue", lin("#1c2f6a"), roughness=0.4, metallic=0.1)
M("Horse_Brown", lin("#7a4a2a"), roughness=0.8)
M("Horse_White", lin("#e8e0d0"), roughness=0.8)
M("Mane", lin("#2a1a12"), roughness=0.9)
M("Bunny_White", lin("#f1ece2"), roughness=0.9)
M("Plank_Pale", lin("#c8a070"), roughness=0.85)
M("Wood_Dark", lin("#4a2e1a"), roughness=0.8)
M("Leaf_Pine", lin("#2a5a34"), roughness=0.9)
M("Paper", lin("#f4eddc"), roughness=0.9)
M("Cloth_White", lin("#f6f0e2"), roughness=0.9)
M("Carrot", lin("#e8721c"), roughness=0.8)
M("Hay_Stack", lin("#caa24e"), roughness=1.0, image=tex_straw(), uv_scale=1.0)
M("Hill_Far", lin("#6f9a58"), roughness=1.0)
M("Hill_Far2", lin("#8aa868"), roughness=1.0)

col_i = [0]


def B(name, c, size, mat, col, rot=(0, 0, 0), uv=0.5, bevel=0.0):
    return S.add_box(name, c, size, mat, col, rot=rot, bevel=bevel, uv_scale=uv)


def CY(name, c, r, h, mat, col, rot=(0, 0, 0), segs=16, r2=None):
    return S.add_cylinder(name, c, r, r if r2 is None else r2, h, segs, mat, col, rot)


def BALL(name, c, r, mat, col, scale=(1, 1, 1), jit=0.0, seed=1, sub=2):
    return S.add_icosphere(name, c, r, sub, mat, col, scale=scale, jitter=jit, seed=seed)


def TREE(name, x, y, s, col, seed, pine=False):
    CY(name + "_t", (x, y, 1.6 * s), 0.3 * s, 3.2 * s, "Tree_Trunk", col, r2=0.2 * s, segs=8)
    if pine:
        for k in range(4):
            CY(f"{name}_p{k}", (x, y, (3.0 + k * 1.3) * s), (2.1 - k * 0.45) * s, 1.8 * s, "Leaf_Pine", col, segs=8, r2=0.1 * s)
    else:
        for k, (dx, dy, dz, r, mm) in enumerate(((0, 0, 4.3, 2.1, "Leaf_A"), (-1.2, 0.6, 3.6, 1.5, "Leaf_B"), (1.3, -0.4, 3.8, 1.6, "Leaf_C"))):
            BALL(f"{name}_c{k}", (x + dx * s, y + dy * s, dz * s), r * s, mm, col, scale=(1, 1, 1.1), jit=0.18, seed=seed + k, sub=1)


def FLAG(name, x, y, z, kind, col, along="x"):
    CY(name + "_pole", (x, y, z + 1.6), 0.04, 3.4, "Gold", col, segs=8)
    BALL(name + "_tip", (x, y, z + 3.35), 0.08, "Gold", col, sub=1)
    w, h = 0.5, 0.9
    for i, m in enumerate(("Flag_Blue", "Flag_White", "Flag_Red") if kind == "fr" else ("Flag_White", "Flag_Blue", "Flag_Red")):
        if kind == "fr":
            B(f"{name}_{i}", (x + 0.27 + i * w * 0.7 - 0.0, y, z + 2.7), (w * 0.7, 0.03, h), m, col)
        else:
            B(f"{name}_{i}", (x + 0.45, y, z + 3.05 - i * 0.28), (0.9, 0.03, 0.28), m, col)


# ====================================================================== L1 · paviliun rakit Niemen
def build_L1(ox):
    c = "L1_Rakit"
    B("Sungai", (ox, 0, -0.45), (260, 200, 0.9), "Water", c)
    B("TepiSeberang", (ox, 105, 0.2), (260, 34, 1.6), "Meadow", c, uv=0.2)
    B("TepiSini", (ox, -88, 0.2), (260, 34, 1.6), "Meadow", c, uv=0.2)
    for i in range(10):
        CY(f"Log{i}", (ox - 6.2 + i * 1.38, 0, 0.1), 0.48, 11.6, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=10)
    B("Geladak", (ox, 0, 0.6), (14, 11, 0.3), "Floor_Wood", c, uv=0.3)
    B("LantaiPaviliun", (ox, 0, 0.82), (9.4, 7.4, 0.16), "Floor_Wood", c, uv=0.3)
    B("Karpet", (ox, 0.2, 0.92), (6.2, 4.2, 0.03), "Rug", c, uv=0.17)
    top = 4.9
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"Tiang{sx}{sy}", (ox + sx * 4.5, sy * 3.55, 2.9), (0.38, 0.38, 4.1), "Stone_Trim", c)
            B(f"Kapital{sx}{sy}", (ox + sx * 4.5, sy * 3.55, top - 0.15), (0.65, 0.65, 0.3), "Gold", c)
    S.add_hip_roof("Atap", (ox, 0, top), 11.2, 9.0, 2.5, 0.5, "Canvas_Blue", c)
    B("Lisplang", (ox, 0, top + 0.05), (11.4, 9.2, 0.18), "Gold", c, uv=0.5)
    # dinding kain: belakang, kiri, kanan, depan (dengan jendela besar dan pintu)
    B("DindingBelakang", (ox, 3.5, 2.9), (9.0, 0.14, 4.0), "Canvas_Cream", c)
    B("DindingKiri", (ox - 4.5, 0, 2.9), (0.14, 7.0, 4.0), "Canvas_Cream", c)
    B("DindingKanan", (ox + 4.5, 0, 2.9), (0.14, 7.0, 4.0), "Canvas_Cream", c)
    front = B("DindingDepan", (ox, -3.5, 2.9), (9.0, 0.14, 4.0), "Canvas_Cream", c)
    cut1 = B("PotongJendela", (ox + 1.2, -3.5, 3.1), (2.8, 1.0, 2.4), "Canvas_Cream", c)
    cut2 = B("PotongPintu", (ox - 2.6, -3.5, 2.1), (1.5, 1.0, 2.5), "Canvas_Cream", c)
    S.add_boolean_cut(front, [cut1, cut2])
    for sx in (-1, 1):
        B(f"TirainJendela{sx}", (ox + 1.2 + sx * 1.6, -3.38, 3.0), (0.55, 0.16, 2.6), "Velvet_Red", c)
        B(f"TaliTirai{sx}", (ox + 1.2 + sx * 1.35, -3.3, 2.8), (0.16, 0.2, 0.12), "Gold", c)
    B("AmbangJendela", (ox + 1.2, -3.4, 1.95), (3.0, 0.3, 0.1), "Stone_Trim", c)
    # meja perjanjian, kursi, dokumen, lilin
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"KakiMeja{sx}{sy}", (ox + sx * 1.6, 0.2 + sy * 0.6, 1.4), (0.14, 0.14, 1.0), "Wood_Desk_Dark", c)
    B("Meja", (ox, 0.2, 1.95), (3.8, 1.7, 0.12), "Wood_Desk", c)
    B("Taplak", (ox, 0.2, 2.03), (3.9, 1.8, 0.04), "Velvet_Red", c)
    for i, (dx, dy) in enumerate(((-0.8, 0.1), (-0.2, 0.3), (0.5, -0.1), (0.1, -0.3))):
        B(f"Dokumen{i}", (ox + dx, 0.2 + dy, 2.07), (0.55, 0.4, 0.015), "Paper", c, rot=(0, 0, 0.2 * i))
    CY("Tinta", (ox + 1.1, 0.1, 2.15), 0.07, 0.15, "Iron_Dark", c, segs=10)
    B("PenaBulu", (ox + 1.08, 0.1, 2.3), (0.03, 0.03, 0.45), "Cloth_White", c, rot=(0.25, 0, 0.3))
    for sx in (-1, 1):
        CY(f"Kandil{sx}", (ox + sx * 1.5, 0.3, 2.3), 0.05, 0.5, "Gold", c, segs=8)
        BALL(f"Api{sx}", (ox + sx * 1.5, 0.3, 2.62), 0.07, "Flame", c, scale=(1, 1, 1.5), sub=1)
    for sy, rotz in ((-1, 0), (1, PI)):
        B(f"KursiDudukan{sy}", (ox - 0.4, 0.2 + sy * 1.5, 1.4), (0.85, 0.85, 0.1), "Velvet_Blue", c)
        B(f"KursiSandaran{sy}", (ox - 0.4, 0.2 + sy * 1.9, 2.1), (0.85, 0.1, 1.0), "Velvet_Blue", c)
        for kx in (-1, 1):
            for ky in (-1, 1):
                B(f"KursiKaki{sy}{kx}{ky}", (ox - 0.4 + kx * 0.36, 0.2 + sy * 1.5 + ky * 0.36, 1.1), (0.08, 0.08, 0.5), "Wood_Desk_Dark", c)
    # dekorasi dinding & bendera & lampu gantung
    B("BingkaiLukisan", (ox, 3.4, 3.3), (2.4, 0.08, 1.7), "Gold", c)
    S.add_planar_quad("Lukisan", (ox, 3.34, 3.3), 2.15, 1.45, "-Y", "Painting_Hills", c)
    FLAG("BenderaPrancis", ox - 3.7, 3.0, 0.9, "fr", c)
    FLAG("BenderaRusia", ox + 3.5, 3.0, 0.9, "ru", c)
    B("Lemari", (ox - 4.0, 1.4, 1.85), (0.9, 1.8, 1.9), "Wood_Wainscot", c)
    BALL("Bola", (ox + 3.9, 1.2, 1.7), 0.35, "Gold", c, sub=2)
    CY("Lampu", (ox, 0.2, 4.15), 0.04, 1.4, "Gold", c, segs=8)
    for k in range(6):
        a = k * PI / 3
        BALL(f"LampuApi{k}", (ox + math.cos(a) * 0.55, 0.2 + math.sin(a) * 0.55, 3.55), 0.08, "Lamp_Warm", c, sub=1)
    # tali tambat, perahu, jembatan
    for sx in (-1, 1):
        CY(f"Bollard{sx}", (ox + sx * 6.5, -4.8, 1.0), 0.18, 0.6, "Iron_Dark", c, segs=8)
    B("Titian", (ox + 0.0, -10.5, 0.55), (2.2, 9.0, 0.15), "Floor_Wood", c, uv=0.3)
    B("PerahuLambung", (ox + 10, -3, 0.15), (4.6, 1.7, 0.7), "Wood_Wainscot", c, rot=(0, 0, 0.1))
    CY("Layar", (ox + 10, -3, 2.0), 0.03, 3.6, "Wood_Dark", c, segs=6)
    B("LayarKain", (ox + 10.4, -3, 2.3), (1.6, 0.03, 2.4), "Canvas_Cream", c, rot=(0, 0, 0.1))
    # pavilion seberang (kecil) + pohon di tepi
    B("PaviliunSeberangLantai", (ox + 40, 60, 1.0), (9, 6, 0.4), "Floor_Wood", c)
    for sx in (-1, 1):
        B(f"TiangSeberang{sx}", (ox + 40 + sx * 4, 60, 3.0), (0.3, 0.3, 3.6), "Stone_Trim", c)
    S.add_hip_roof("AtapSeberang", (ox + 40, 60, 4.8), 10, 7, 2.0, 0.5, "Canvas_Red", c)
    for i in range(14):
        TREE(f"PohonS{i}", ox - 70 + i * 11 + (i % 3) * 2, 100 + (i % 2) * 6, 1.3 + (i % 3) * 0.2, c, 100 + i, pine=(i % 2 == 0))
    for i in range(9):
        TREE(f"PohonT{i}", ox - 60 + i * 15, -90 - (i % 2) * 5, 1.2 + (i % 3) * 0.2, c, 200 + i, pine=(i % 2 == 1))
    for i in range(16):
        B(f"Gelagah{i}", (ox - 14 + i * 1.7 + (i % 3) * 0.3, -6.0 + (i % 4) * 0.5 - 9, 0.6), (0.06, 0.06, 1.6), "Leaf_B", c)


# ====================================================================== L2 · tenda markas
def build_L2(ox):
    c = "L2_Tenda"
    B("Tanah2", (ox, 0, -0.1), (160, 160, 0.2), "Meadow", c, uv=0.2)
    B("LantaiTenda", (ox, 0, 0.1), (13, 10, 0.2), "Floor_Wood", c, uv=0.3)
    B("KarpetTenda", (ox, 0, 0.24), (7.5, 5.0, 0.03), "Rug", c, uv=0.14)
    # dinding kanvas dan atap tenda (piramida tinggi)
    for sx in (-1, 1):
        B(f"DindingTendaX{sx}", (ox + sx * 6.5, 0, 1.5), (0.12, 10, 3.0), "Canvas_Cream", c)
    B("DindingTendaBelakang", (ox, 5.0, 1.5), (13, 0.12, 3.0), "Canvas_Cream", c)
    depan = B("DindingTendaDepan", (ox, -5.0, 1.5), (13, 0.12, 3.0), "Canvas_Cream", c)
    pintu = B("PotongPintuTenda", (ox, -5.0, 1.2), (3.2, 1.0, 2.4), "Canvas_Cream", c)
    S.add_boolean_cut(depan, [pintu])
    S.add_hip_roof("AtapTenda", (ox, 0, 3.0), 13.6, 10.6, 3.6, 0.35, "Canvas_Blue", c)
    for sx in (-1, 1):
        B(f"SisiAtap{sx}", (ox + sx * 6.7, 0, 3.0), (0.2, 10.6, 0.25), "Gold", c)
    CY("TiangTengah", (ox, 0, 2.6), 0.14, 5.4, "Wood_Wainscot", c, segs=10)
    # tirai pintu terikat
    for sx in (-1, 1):
        B(f"TirainPintu{sx}", (ox + sx * 1.9, -4.9, 1.3), (0.7, 0.14, 2.6), "Velvet_Red", c)
    # meja peta + peta + lampu
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"KakiMejaPeta{sx}{sy}", (ox + sx * 1.9, 0.4 + sy * 0.8, 0.75), (0.14, 0.14, 1.3), "Wood_Desk_Dark", c)
    B("MejaPeta", (ox, 0.4, 1.45), (4.3, 2.0, 0.12), "Wood_Desk", c)
    B("PetaDatar", (ox, 0.4, 1.53), (4.0, 1.8, 0.012), "Map_Table", c, uv=0.25)
    for sx in (-1, 1):
        CY(f"Pemberat{sx}", (ox + sx * 1.7, 0.4, 1.6), 0.1, 0.12, "Iron_Dark", c, segs=8)
    CY("LampuMinyakMeja", (ox + 1.4, 1.0, 1.7), 0.14, 0.26, "Gold", c, segs=10)
    BALL("ApiLampu", (ox + 1.4, 1.0, 1.9), 0.1, "Flame", c, scale=(1, 1, 1.4), sub=1)
    # tempat tidur lapangan, peti, rak senjata, kompor, kursi lipat
    B("RangkaTempatTidur", (ox - 4.6, 3.2, 0.6), (2.0, 3.4, 0.5), "Wood_Dark", c)
    B("Kasur", (ox - 4.6, 3.2, 0.95), (1.9, 3.3, 0.25), "Velvet_Blue", c)
    B("Bantal", (ox - 4.6, 4.4, 1.15), (1.2, 0.6, 0.2), "Cloth_White", c)
    for i in range(3):
        B(f"Peti{i}", (ox + 4.8, 3.6 - i * 1.4, 0.55 + 0.0), (1.2, 1.2, 0.9), "Wood_Wainscot", c)
        B(f"PetiBand{i}", (ox + 4.8, 3.6 - i * 1.4, 0.6), (1.24, 0.12, 0.95), "Iron_Dark", c)
    B("RakSenjata", (ox + 5.6, -2.0, 1.2), (0.3, 2.4, 2.0), "Wood_Dark", c)
    for i in range(4):
        CY(f"Senapan{i}", (ox + 5.35, -2.9 + i * 0.6, 1.25), 0.04, 1.9, "Iron_Dark", c, segs=8)
    CY("Kompor", (ox - 5.2, -2.6, 0.7), 0.55, 1.0, "Iron_Dark", c, segs=12)
    CY("PipaKompor", (ox - 5.2, -2.6, 2.4), 0.12, 2.4, "Iron_Dark", c, segs=8)
    BALL("ApiKompor", (ox - 5.2, -2.6, 1.15), 0.2, "Flame", c, scale=(1, 1, 1.2), sub=1)
    for sx in (-1, 1):
        B(f"KursiLipat{sx}", (ox + sx * 1.4, -1.5, 0.85), (0.8, 0.8, 0.1), "Velvet_Blue", c)
        B(f"SandaranLipat{sx}", (ox + sx * 1.4, -1.85, 1.35), (0.8, 0.08, 0.9), "Velvet_Blue", c)
    FLAG("BenderaTenda", ox - 5.0, 4.4, 0.1, "fr", c)
    # peta Eropa di dinding & lukisan
    S.add_planar_quad("PetaDinding", (ox, 4.9, 1.9), 3.2, 2.0, "-Y", "Map_Table", c)
    B("BingkaiPeta", (ox, 4.96, 1.9), (3.4, 0.06, 2.2), "Gold", c)
    # perkemahan luar
    CY("ApiUnggun", (ox + 18, -14, 0.3), 0.9, 0.6, "Wood_Dark", c, segs=10)
    for k in range(5):
        BALL(f"ApiU{k}", (ox + 18 + (k - 2) * 0.22, -14, 0.9 + (k % 2) * 0.3), 0.3, "Flame", c, scale=(1, 1, 1.6), sub=1)
    for i in range(3):
        S.add_hip_roof(f"TendaKecil{i}", (ox + 28 + i * 9, -6 + (i % 2) * 6, 0), 6, 5, 3.0, 0.2, "Canvas_Cream", c)
    for i in range(9):
        TREE(f"PohonTenda{i}", ox - 50 + i * 13, 40 + (i % 3) * 4, 1.4, c, 300 + i, pine=(i % 2 == 0))


# ====================================================================== L3 · peternakan
def build_L3(ox):
    c = "L3_Peternakan"
    B("TanahTernak", (ox, 0, -0.1), (180, 180, 0.2), "Meadow", c, uv=0.2)
    B("JalanTanah", (ox + 3, -16, 0.0), (6, 44, 0.06), "Dirt", c, uv=0.25)
    B("HalamanTanah", (ox, -2, 0.0), (30, 22, 0.06), "Dirt", c, uv=0.25)
    # lumbung
    B("LantaiLumbung", (ox, 6, 0.1), (14, 10, 0.2), "Plank_Pale", c)
    dinding_depan = B("DindingDepanL", (ox, 1.0, 2.2), (14, 0.25, 4.4), "Wood_Wainscot", c, uv=0.4)
    pintu = B("PotongPintuL", (ox, 1.0, 1.7), (5.0, 1.0, 3.4), "Wood_Wainscot", c)
    S.add_boolean_cut(dinding_depan, [pintu])
    for sx in (-1, 1):
        B(f"DindingSisiL{sx}", (ox + sx * 7.0, 6, 2.2), (0.25, 10, 4.4), "Wood_Wainscot", c, uv=0.4)
    B("DindingBelakangL", (ox, 11, 2.2), (14, 0.25, 4.4), "Wood_Wainscot", c, uv=0.4)
    S.add_hip_roof("AtapL", (ox, 6, 4.4), 15.2, 11.6, 3.0, 0.5, "Hay_Stack", c)
    for sx in (-1, 1):
        B(f"DaunPintuL{sx}", (ox + sx * 3.1, 0.7, 1.7), (0.15, 0.5, 3.4), "Wood_Dark", c, rot=(0, 0, sx * 0.9))
    # kandang kelinci bersusun di dalam (3 tingkat x 5 jalur) + kawat + kelinci
    for lvl in range(3):
        for k in range(5):
            x = ox - 5.2 + k * 2.6
            z0 = 0.55 + lvl * 1.15
            B(f"Kandang{lvl}{k}", (x, 8.5, z0), (2.2, 1.6, 0.9), "Plank_Pale", c)
            B(f"KawatDepan{lvl}{k}", (x, 7.72, z0), (2.0, 0.04, 0.8), "Wire", c)
            for j in range(5):
                B(f"Jeruji{lvl}{k}{j}", (x - 0.8 + j * 0.4, 7.7, z0), (0.06, 0.06, 0.82), "Iron_Dark", c)
            BALL(f"KelinciP{lvl}{k}", (x, 8.3, z0 - 0.1), 0.32, "Bunny_White", c, scale=(1.2, 1, 0.9), sub=1)
            BALL(f"KelinciP2{lvl}{k}", (x - 0.6, 8.4, z0 - 0.12), 0.26, "Horse_Brown" if (lvl + k) % 3 == 0 else "Bunny_White", c, scale=(1.2, 1, 0.9), sub=1)
    # jerami, tong, peti, gerobak, ember wortel, pagar, ayam, papan harga
    for i, (x, y) in enumerate(((-9.5, 4), (-9.5, 7), (-8.4, 5.5), (9.8, 5), (9.6, 8))):
        B(f"Bal{i}", (ox + x, y, 0.5 + (i % 2) * 0.0), (1.8, 1.0, 1.0), "Straw", c, uv=0.6)
    for i, (x, y) in enumerate(((-4.0, -3.0), (-3.0, -3.5), (-3.6, -2.6))):
        CY(f"Tong{i}", (ox + x, y, 0.55), 0.55, 1.1, "Wood_Wainscot", c, segs=12)
        CY(f"TongBand{i}", (ox + x, y, 0.6), 0.57, 0.1, "Iron_Dark", c, segs=12)
    for i in range(4):
        B(f"PetiWortel{i}", (ox + 5.0 + (i % 2) * 1.0, -3 - (i // 2) * 1.0, 0.4), (0.9, 0.9, 0.7), "Plank_Pale", c)
        for j in range(5):
            CY(f"Wortel{i}{j}", (ox + 4.7 + (i % 2) * 1.0 + j * 0.15, -3 - (i // 2) * 1.0, 0.9), 0.07, 0.4, "Carrot", c, rot=(0.3, 0, 0.2 * j), segs=8, r2=0.01)
    B("GerobakBadan", (ox - 11, -5.5, 0.95), (3.2, 1.7, 0.7), "Wood_Desk", c)
    for sy in (-1, 1):
        CY(f"RodaG{sy}", (ox - 11, -5.5 + sy * 1.0, 0.65), 0.65, 0.12, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=14)
    B("TarikanG", (ox - 13.8, -5.5, 0.9), (2.4, 0.12, 0.12), "Wood_Wainscot", c)
    for i in range(14):
        B(f"PagarT{i}", (ox - 15 + i * 2.3, -9.5, 0.65), (0.14, 0.14, 1.3), "Wood_Dark", c)
        for z in (0.45, 0.95):
            B(f"PagarR{i}{int(z * 10)}", (ox - 14 + i * 2.3, -9.5, z), (2.3, 0.08, 0.1), "Wood_Dark", c)
    for i in range(5):
        BALL(f"Ayam{i}", (ox + 8 + i * 0.7, -6 + (i % 2) * 0.8, 0.35), 0.28, "Cloth_White" if i % 2 else "Carrot", c, scale=(1.2, 0.9, 1.0), sub=1)
        BALL(f"AyamKepala{i}", (ox + 8.25 + i * 0.7, -6 + (i % 2) * 0.8, 0.62), 0.12, "Cloth_White", c, sub=1)
    CY("TiangPapan", (ox + 7.5, -8.2, 1.2), 0.07, 2.4, "Wood_Dark", c, segs=8)
    B("PapanHarga", (ox + 7.5, -8.3, 2.3), (2.0, 0.1, 0.9), "Plank_Pale", c)
    for i in range(10):
        TREE(f"PohonTernak{i}", ox - 60 + i * 13, 38 + (i % 3) * 5, 1.3, c, 400 + i, pine=(i % 3 == 0))
    # padang dan bukit jauh
    for i, x in enumerate((-60, -10, 45)):
        BALL(f"BukitT{i}", (ox + x, 60, -3), 32, "Hill_Far", c, scale=(1.6, 1.0, 0.5), sub=2)


# ====================================================================== L4 · lapangan perburuan
def build_L4(ox):
    c = "L4_Lapangan"
    B("Padang", (ox, 0, -0.1), (300, 300, 0.2), "Meadow", c, uv=0.15)
    B("JalanSetapak", (ox + 6, -20, 0.0), (5, 60, 0.05), "Dirt", c, uv=0.25)
    # tenda pesta bergaris
    for sx in (-1, 1):
        for sy in (-1, 1):
            CY(f"TiangPesta{sx}{sy}", (ox - 10 + sx * 5, 8 + sy * 3.5, 1.8), 0.1, 3.6, "Wood_Wainscot", c, segs=8)
    S.add_hip_roof("AtapPesta", (ox - 10, 8, 3.6), 12.0, 9.0, 2.2, 0.5, "Canvas_Red", c)
    B("LantaiPesta", (ox - 10, 8, 0.06), (11, 8, 0.1), "Rug", c, uv=0.12)
    B("MejaPanjang", (ox - 10, 8, 1.0), (8.5, 1.5, 0.12), "Wood_Desk", c)
    B("TaplakPanjang", (ox - 10, 8, 1.08), (8.7, 1.7, 0.03), "Cloth_White", c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"KakiMejaP{sx}{sy}", (ox - 10 + sx * 4, 8 + sy * 0.6, 0.5), (0.12, 0.12, 1.0), "Wood_Desk_Dark", c)
    for i in range(9):
        BALL(f"Hidangan{i}", (ox - 13.6 + i * 0.9, 8 + ((i % 2) - 0.5) * 0.4, 1.3), 0.2, ("Carrot", "Gold", "Leaf_B")[i % 3], c, sub=1)
    for i in range(8):
        B(f"KursiP{i}", (ox - 13 + (i % 4) * 2.2, 9.7 if i < 4 else 6.3, 0.5), (0.6, 0.6, 0.08), "Velvet_Blue", c)
        B(f"SandarP{i}", (ox - 13 + (i % 4) * 2.2, 9.95 if i < 4 else 6.05, 0.9), (0.6, 0.06, 0.7), "Velvet_Blue", c)
    for i in range(3):
        FLAG(f"BenderaL4{i}", ox - 16 + i * 6, 14, 0.0, "fr", c)
    # kandang kayu besar tempat kelinci dilepas
    B("KandangBesarLantai", (ox + 14, -2, 0.08), (8, 6, 0.16), "Plank_Pale", c)
    for sx in (-1, 1):
        B(f"KandangDinding{sx}", (ox + 14 + sx * 4, -2, 1.1), (0.15, 6, 2.2), "Wood_Wainscot", c)
    B("KandangBelakang", (ox + 14, 1, 1.1), (8, 0.15, 2.2), "Wood_Wainscot", c)
    B("KandangAtap", (ox + 14, -2, 2.25), (8.4, 6.4, 0.15), "Hay_Stack", c)
    for j in range(14):
        B(f"JerujiKandang{j}", (ox + 10.2 + j * 0.6, -5.05, 1.1), (0.05, 0.05, 2.1), "Iron_Dark", c)
    B("PalangKandang", (ox + 14, -5.1, 1.1), (7.2, 0.1, 0.12), "Wood_Dark", c)
    for i in range(14):
        BALL(f"KelinciKandang{i}", (ox + 10.8 + (i % 7) * 1.1, -4.2 + (i // 7) * 1.4, 0.35), 0.3, "Bunny_White" if i % 3 else "Horse_Brown", c, scale=(1.2, 1, 0.9), sub=1)
    # hutan tepi + bukit
    for i in range(18):
        a = -1.1 + i * 0.13
        TREE(f"HutanL4{i}", ox + math.sin(a) * 95, 70 + math.cos(a) * 10 + (i % 3) * 5, 1.4 + (i % 4) * 0.2, c, 500 + i, pine=(i % 2 == 0))
    for i, x in enumerate((-90, -30, 40, 100)):
        BALL(f"BukitL4{i}", (ox + x, 130, -4), 40, "Hill_Far2", c, scale=(1.7, 1.0, 0.45), sub=2)
    for i in range(8):
        TREE(f"PohonL4{i}", ox + (1 if i % 2 else -1) * (22 + i * 3), -10 - (i % 3) * 9, 1.1, c, 600 + i)


# ====================================================================== L5 · kereta kuda
def build_L5(ox):
    c = "L5_Kereta"
    B("JalanKereta", (ox, 0, -0.1), (400, 14, 0.2), "Dirt", c, uv=0.2)
    B("RumputKereta", (ox, 0, -0.14), (400, 400, 0.2), "Meadow", c, uv=0.15)
    cx = ox
    # badan kereta
    B("Alas", (cx, 0, 1.0), (4.2, 2.3, 0.25), "Carriage_Blue", c)
    for sy in (-1, 1):
        pn = B(f"PanelKabin{sy}", (cx, sy * 0.97, 2.1), (3.2, 0.12, 2.1), "Carriage_Blue", c)
        ct = B(f"PotongJK{sy}", (cx, sy * 0.97, 2.35), (1.5, 0.5, 1.0), "Carriage_Blue", c)
        S.add_boolean_cut(pn, [ct])
    for sx in (-1, 1):
        B(f"PanelUjungKabin{sx}", (cx + sx * 1.54, 0, 2.1), (0.12, 2.0, 2.1), "Carriage_Blue", c)
    B("AtapKabin", (cx, 0, 3.35), (3.7, 2.4, 0.22), "Carriage_Blue", c, bevel=0.05)
    B("ListEmas", (cx, 0, 3.22), (3.8, 2.5, 0.07), "Gold", c)
    B("ListEmasBawah", (cx, 0, 1.18), (4.3, 2.4, 0.07), "Gold", c)
    for sy in (-1, 1):
        B(f"KacaKereta{sy}", (cx, sy * 0.97, 2.35), (1.5, 0.03, 1.0), "Glass_Blue", c)
        B(f"BingkaiJ{sy}", (cx, sy * 1.07, 2.3), (1.7, 0.06, 1.3), "Gold", c)
        B(f"TirainK{sy}", (cx + 0.55, sy * 1.0, 2.3), (0.3, 0.06, 1.1), "Velvet_Red", c)
    for sx in (-1, 1):
        B(f"PintuK{sx}", (cx + sx * 1.62, 0, 2.1), (0.06, 1.8, 1.9), "Carriage_Blue", c)
        CY(f"LampuKereta{sx}", (cx + sx * 1.75, 1.15, 2.7), 0.14, 0.4, "Lamp_Warm", c, segs=10)
    # tempat duduk kusir dan roda
    B("BangkuKusir", (cx + 2.8, 0, 1.9), (1.3, 1.8, 0.15), "Leather", c)
    B("DudukanKusir", (cx + 2.4, 0, 1.4), (0.7, 1.8, 0.7), "Carriage_Blue", c)
    for (wx, r) in ((cx - 1.3, 0.95), (cx + 1.5, 0.75)):
        for sy in (-1, 1):
            CY(f"Roda{wx:.1f}{sy}", (wx, sy * 1.35, r), r, 0.16, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=20)
            CY(f"Pusat{wx:.1f}{sy}", (wx, sy * 1.42, r), 0.16, 0.2, "Gold", c, rot=(PI / 2, 0, 0), segs=10)
            for k in range(8):
                a = k * PI / 4
                B(f"Jari{wx:.1f}{sy}{k}", (wx, sy * 1.35, r), (r * 1.9, 0.07, 0.07), "Wood_Dark", c, rot=(0, a, 0))
    # kuda (gaya low-poly), 2 ekor
    for hy, mat in ((-0.9, "Horse_Brown"), (0.9, "Horse_White")):
        hx = cx + 6.0
        B(f"BadanKuda{hy}", (hx, hy, 1.9), (2.3, 0.85, 1.0), mat, c, bevel=0.15)
        BALL(f"DadaKuda{hy}", (hx + 1.1, hy, 2.0), 0.6, mat, c, scale=(1, 0.75, 1.1), sub=2)
        B(f"LeherKuda{hy}", (hx + 1.55, hy, 2.6), (0.5, 0.5, 1.0), mat, c, rot=(0, -0.5, 0), bevel=0.1)
        B(f"KepalaKuda{hy}", (hx + 2.15, hy, 3.05), (0.85, 0.42, 0.45), mat, c, rot=(0, -0.2, 0), bevel=0.1)
        B(f"SuraiKuda{hy}", (hx + 1.35, hy, 3.05), (0.12, 0.12, 0.9), "Mane", c, rot=(0, -0.5, 0))
        for lx, ly in ((0.85, 0.28), (0.85, -0.28), (-0.85, 0.28), (-0.85, -0.28)):
            B(f"KakiKuda{hy}{lx}{ly}", (hx + lx, hy + ly * 0.7, 0.85), (0.2, 0.2, 1.7), mat, c)
        B(f"EkorKuda{hy}", (hx - 1.3, hy, 1.9), (0.14, 0.14, 1.0), "Mane", c, rot=(0, 0.4, 0))
    B("TiangPenarik", (cx + 3.5, 0, 1.2), (6.2, 0.1, 0.1), "Wood_Dark", c)
    # interior (untuk adegan dalam kereta; dibuat terlihat bila kamera di dalam)
    B("JokDepan", (cx - 0.8, 0, 1.6), (0.7, 1.8, 0.4), "Velvet_Red", c)
    B("SandaranJok", (cx - 1.4, 0, 2.2), (0.2, 1.8, 1.1), "Velvet_Red", c)
    B("JokBelakang", (cx + 0.8, 0, 1.6), (0.7, 1.8, 0.4), "Velvet_Red", c)
    B("SandaranJok2", (cx + 1.4, 0, 2.2), (0.2, 1.8, 1.1), "Velvet_Red", c)
    B("LantaiDalam", (cx, 0, 1.2), (3.0, 1.8, 0.04), "Rug", c, uv=0.2)
    B("PlafonDalam", (cx, 0, 3.15), (3.0, 1.8, 0.05), "Velvet_Blue", c)
    for i in range(16):
        TREE(f"PohonJalan{i}", ox - 80 + i * 10 + (i % 2) * 2, 12 + (i % 3) * 3 if i % 2 else -12 - (i % 3) * 3, 1.3 + (i % 3) * 0.2, c, 700 + i, pine=(i % 3 == 0))
    for i, x in enumerate((-100, -30, 50, 120)):
        BALL(f"BukitK{i}", (ox + x, 90, -4), 38, "Hill_Far", c, scale=(1.8, 1.0, 0.5), sub=2)



# ====================================================================== PUSTAKA PROPERTI & LANGIT
M("Skin", lin("#e8c4a0"), roughness=0.8)
M("Sack", lin("#cdb98a"), roughness=1.0)
M("Terracotta", lin("#c8683e"), roughness=0.9)
M("Porcelain", lin("#f4f0e6"), roughness=0.3)
M("Felt_Green", lin("#2f5a3c"), roughness=0.95)
M("Rope", lin("#b89a6a"), roughness=1.0)
M("Glass_Blue", lin("#a8d0ea"), roughness=0.08)
M("Flower_Y", lin("#ffd23a"), roughness=0.8)
M("Flower_P", lin("#f06a9a"), roughness=0.8)
M("Flower_W", lin("#fffaf0"), roughness=0.8)
M("Flower_B", lin("#7a8aff"), roughness=0.8)
M("Cloud", lin("#ffffff"), roughness=1.0, emission=lin("#ffffff"), emission_strength=0.35)
M("Sun", lin("#fff3c0"), roughness=0.5, emission=lin("#fff0b0"), emission_strength=6.0)
M("Marble", lin("#e8e4dc"), roughness=0.35)
RND = random.Random(21)
BOOK_MATS = ["Velvet_Red", "Velvet_Blue", "Leaf_A", "Gold", "Paper", "Wood_Dark", "Carrot", "Leaf_Pine", "Horse_Brown"]
FLOWERS = ["Flower_Y", "Flower_P", "Flower_W", "Flower_B", "Flag_Red"]


def rope(name, p0, p1, mat, col, th=0.035):
    a, b = Vector(p0), Vector(p1)
    d = b - a
    e = d.to_track_quat("Z", "Y").to_euler()
    return B(name, tuple((a + b) / 2), (th, th, d.length), mat, col, rot=tuple(e))


def text3d(name, body, loc, size, mat, col, rot=(PI / 2, 0, 0), extrude=0.03):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    t = bpy.context.object
    t.name = name
    t.data.body = body
    t.data.size = size
    t.data.align_x = "CENTER"
    t.data.extrude = extrude
    bpy.ops.object.convert(target="MESH")
    t = bpy.context.object
    t.data.materials.append(MATS[mat])
    for cc in list(t.users_collection):
        cc.objects.unlink(t)
    S.ensure_collection(col).objects.link(t)
    return t


def chair(name, x, y, z, col, back=1, seat="Velvet_Blue", wood="Wood_Desk_Dark", sc=1.0):
    B(name + "_s", (x, y, z + 0.45 * sc), (0.7 * sc, 0.7 * sc, 0.1 * sc), seat, col)
    for kx in (-1, 1):
        for ky in (-1, 1):
            B(f"{name}_l{kx}{ky}", (x + kx * 0.3 * sc, y + ky * 0.3 * sc, z + 0.2 * sc), (0.07, 0.07, 0.4 * sc), wood, col)
    B(name + "_b", (x, y + back * 0.32 * sc, z + 0.98 * sc), (0.7 * sc, 0.08, 0.95 * sc), seat, col)
    B(name + "_r", (x, y + back * 0.32 * sc, z + 1.48 * sc), (0.78 * sc, 0.1, 0.08), "Gold", col)


def vase(name, x, y, z, col, mat="Porcelain", flowers=True, sc=1.0):
    CY(name + "_b", (x, y, z + 0.05 * sc), 0.1 * sc, 0.1 * sc, mat, col, segs=12)
    BALL(name + "_v", (x, y, z + 0.25 * sc), 0.17 * sc, mat, col, scale=(1, 1, 1.2), sub=1)
    CY(name + "_n", (x, y, z + 0.5 * sc), 0.07 * sc, 0.16 * sc, mat, col, segs=10)
    if flowers:
        for k in range(8):
            a = k * 0.8
            BALL(f"{name}_f{k}", (x + math.cos(a) * 0.12 * sc, y + math.sin(a) * 0.12 * sc, z + (0.68 + (k % 3) * 0.06) * sc), 0.065 * sc, FLOWERS[k % 5], col, sub=1)
            CY(f"{name}_st{k}", (x + math.cos(a) * 0.06 * sc, y + math.sin(a) * 0.06 * sc, z + 0.55 * sc), 0.008, 0.2 * sc, "Leaf_B", col, segs=4)


def candelabra(name, x, y, z, col, h=0.55, floor=False):
    sc = 2.4 if floor else 1.0
    CY(name + "_b", (x, y, z + 0.03), 0.12 * sc, 0.06, "Gold", col, segs=12)
    CY(name + "_s", (x, y, z + (0.3 * sc if floor else 0.3)), 0.03 * sc, h * sc if floor else 0.55, "Gold", col, segs=8)
    top = z + (0.3 * sc if floor else 0.3) + ((h * sc if floor else 0.55) / 2)
    B(name + "_a", (x, y, top), (0.5 * sc, 0.03, 0.03), "Gold", col)
    for k, dx in enumerate((-0.25, 0.0, 0.25)):
        CY(f"{name}_c{k}", (x + dx * sc, y, top + 0.1), 0.025 * sc, 0.2, "Cloth_White", col, segs=8)
        BALL(f"{name}_f{k}", (x + dx * sc, y, top + 0.24), 0.04 * sc, "Flame", col, scale=(1, 1, 1.6), sub=1)


def bookshelf(name, x, y, z, w, h, d, col, rows=4):
    for sx in (-1, 1):
        B(f"{name}_p{sx}", (x + sx * (w / 2 - 0.05), y, z + h / 2), (0.1, d, h), "Wood_Wainscot", col)
    B(name + "_back", (x, y + d / 2 - 0.03, z + h / 2), (w, 0.05, h), "Wood_Dark", col)
    B(name + "_top", (x, y, z + h + 0.04), (w + 0.12, d + 0.08, 0.1), "Gold", col)
    for i in range(rows + 1):
        zz = z + 0.05 + i * (h - 0.1) / rows
        B(f"{name}_sh{i}", (x, y, zz), (w - 0.1, d, 0.06), "Wood_Wainscot", col)
        if i < rows:
            cur = x - w / 2 + 0.12
            k = 0
            while cur < x + w / 2 - 0.2:
                bw = RND.uniform(0.05, 0.11)
                bh = RND.uniform(0.22, 0.34) * (h / rows) / 0.5
                bh = min(bh, (h - 0.1) / rows - 0.1)
                B(f"{name}_bk{i}_{k}", (cur + bw / 2, y - d * 0.1, zz + 0.03 + bh / 2), (bw, d * 0.7, bh), RND.choice(BOOK_MATS), col)
                cur += bw + 0.01
                k += 1


def drape(name, x, y, z, h, col, w=1.1, mat="Velvet_Red"):
    n = 6
    for i in range(n):
        B(f"{name}_f{i}", (x - w / 2 + (i + 0.5) * w / n, y + (0.05 if i % 2 else 0.0), z + h / 2), (w / n * 0.95, 0.12, h), mat, col)
    B(name + "_val", (x, y - 0.04, z + h - 0.12), (w + 0.2, 0.2, 0.28), "Gold", col)
    BALL(name + "_tas", (x + w / 2 - 0.1, y - 0.1, z + h * 0.45), 0.08, "Gold", col, sub=1)


def portrait(name, x, y, z, w, h, col, face="Skin"):
    B(name + "_fr", (x, y, z), (w, 0.07, h), "Gold", col)
    B(name + "_cv", (x, y - 0.01, z), (w - 0.14, 0.07, h - 0.14), RND.choice(["Velvet_Blue", "Wood_Dark", "Velvet_Red"]), col)
    BALL(name + "_hd", (x, y - 0.06, z + h * 0.12), w * 0.14, face, col, sub=1)
    B(name + "_bd", (x, y - 0.06, z - h * 0.12), (w * 0.4, 0.04, h * 0.32), "Leaf_Pine", col)


def flower_patch(name, x, y, w, d, n, col, z=0.0):
    for k in range(n):
        fx, fy = x + RND.uniform(-w / 2, w / 2), y + RND.uniform(-d / 2, d / 2)
        CY(f"{name}_s{k}", (fx, fy, z + 0.14), 0.01, 0.28, "Leaf_B", col, segs=4)
        BALL(f"{name}_f{k}", (fx, fy, z + 0.3), 0.07, FLOWERS[k % 5], col, sub=1)


def sack(name, x, y, z, col):
    B(name, (x, y, z + 0.35), (0.55, 0.4, 0.7), "Sack", col, bevel=0.12)
    B(name + "_tie", (x, y, z + 0.7), (0.3, 0.2, 0.06), "Rope", col)


def ladder(name, x, y, z, h, col, along="y"):
    for sx in (-1, 1):
        B(f"{name}_r{sx}", (x + sx * 0.3, y, z + h / 2), (0.07, 0.07, h), "Wood_Wainscot", col, rot=(0.18, 0, 0))
    for k in range(int(h / 0.35)):
        B(f"{name}_t{k}", (x, y + 0.03 * k * 0.5, z + 0.3 + k * 0.35), (0.6, 0.06, 0.06), "Wood_Wainscot", col)


def cannon(name, x, y, col, rot=0.0):
    CY(name + "_tb", (x, y, 0.75), 0.28, 1.9, "Iron_Dark", col, rot=(0, PI / 2 + 0.12, rot), segs=14, r2=0.2)
    B(name + "_cr", (x, y, 0.5), (1.4, 0.7, 0.3), "Wood_Wainscot", col)
    for sy in (-1, 1):
        CY(f"{name}_w{sy}", (x, y + sy * 0.42, 0.45), 0.45, 0.1, "Wood_Wainscot", col, rot=(PI / 2, 0, 0), segs=14)
    for k in range(6):
        BALL(f"{name}_ball{k}", (x - 1.2 + (k % 3) * 0.22, y - 0.9 + (k // 3) * 0.2, 0.12 + (k // 3) * 0.2), 0.11, "Iron_Dark", col, sub=1)


def horse(name, hx, hy, mat, col):
    B(f"{name}_bd", (hx, hy, 1.9), (2.3, 0.85, 1.0), mat, col, bevel=0.15)
    BALL(f"{name}_dd", (hx + 1.1, hy, 2.0), 0.6, mat, col, scale=(1, 0.75, 1.1), sub=2)
    B(f"{name}_lh", (hx + 1.55, hy, 2.6), (0.5, 0.5, 1.0), mat, col, rot=(0, -0.5, 0), bevel=0.1)
    B(f"{name}_kp", (hx + 2.15, hy, 3.05), (0.85, 0.42, 0.45), mat, col, rot=(0, -0.2, 0), bevel=0.1)
    B(f"{name}_sr", (hx + 1.35, hy, 3.05), (0.12, 0.12, 0.9), "Mane", col, rot=(0, -0.5, 0))
    for lx, ly in ((0.85, 0.28), (0.85, -0.28), (-0.85, 0.28), (-0.85, -0.28)):
        B(f"{name}_k{lx}{ly}", (hx + lx, hy + ly * 0.7, 0.85), (0.2, 0.2, 1.7), mat, col)
        B(f"{name}_h{lx}{ly}", (hx + lx, hy + ly * 0.7, 0.07), (0.24, 0.24, 0.14), "Iron_Dark", col)
    B(f"{name}_ek", (hx - 1.3, hy, 1.9), (0.14, 0.14, 1.0), "Mane", col, rot=(0, 0.4, 0))
    B(f"{name}_pelana", (hx - 0.1, hy, 2.45), (0.9, 0.9, 0.1), "Leather", col)
    B(f"{name}_tali", (hx + 1.55, hy, 3.0), (0.5, 0.5, 0.06), "Leather", col, rot=(0, -0.5, 0))


def sky(ox, col="Langit"):
    """awan di langit + cakram matahari + kabut bukit jauh (ikut ke GLB; Remotion menambah kubah langit)"""
    for i in range(18):
        x = ox + RND.uniform(-190, 190)
        y = RND.uniform(150, 280)
        z = RND.uniform(40, 95)
        s = RND.uniform(7, 15)
        for k, (dx, dz, r) in enumerate(((0, 0, 1.0), (1.2, -0.15, 0.78), (-1.1, -0.2, 0.74), (0.5, 0.4, 0.66), (-0.45, 0.3, 0.6), (1.9, -0.3, 0.5))):
            BALL(f"Awan{i}_{k}", (x + dx * s, y, z + dz * s), r * s, "Cloud", col, scale=(1, 0.5, 0.7), sub=1)
    CY("Matahari", (ox + 110, 285, 80), 18, 0.6, "Sun", col, rot=(PI / 2, 0, 0), segs=40)
    for i in range(7):
        BALL(f"BukitJauh{i}", (ox - 180 + i * 62, 230, -8), 55, "Hill_Far2" if i % 2 else "Hill_Far", col, scale=(1.7, 1.0, 0.5), sub=2)


# ====================================================================== PENGAYAAN PROPERTI PER LATAR
def enrich_L1(ox):
    c = "L1_Rakit"
    B("PanelBelakang", (ox, 3.36, 1.6), (8.8, 0.06, 1.4), "Wood_Wainscot", c)
    B("ListPanelB", (ox, 3.33, 2.33), (8.8, 0.08, 0.07), "Gold", c)
    for sx in (-1, 1):
        B(f"PanelSisi{sx}", (ox + sx * 4.38, 0, 1.6), (0.06, 6.8, 1.4), "Wood_Wainscot", c)
        B(f"ListSisi{sx}", (ox + sx * 4.35, 0, 2.33), (0.08, 6.8, 0.07), "Gold", c)
        bookshelf(f"RakBuku{sx}", ox + sx * 2.95, 3.0, 0.92, 1.7, 3.0, 0.5, c)
        B(f"Pilaster{sx}", (ox + sx * 1.95, 3.33, 2.7), (0.28, 0.1, 3.7), "Stone_Trim", c)
        drape(f"TiraiBlk{sx}", ox + sx * 3.95, 3.3, 0.95, 3.6, c, w=0.8)
        x = ox + sx * 3.5
        B(f"MejaSamping{sx}", (x, -1.6, 1.55), (0.9, 0.6, 0.07), "Wood_Desk", c)
        for kx in (-1, 1):
            for ky in (-1, 1):
                B(f"KakiMS{sx}{kx}{ky}", (x + kx * 0.38, -1.6 + ky * 0.24, 1.2), (0.06, 0.06, 0.65), "Wood_Desk_Dark", c)
        vase(f"VasMS{sx}", x, -1.6, 1.6, c)
        candelabra(f"KandilLantai{sx}", ox + sx * 2.5, 2.2, 0.92, c, floor=True)
        chair(f"KursiDinding{sx}", ox + sx * 3.8, 0.2, 0.92, c, back=-sx * 0 + 1, seat="Velvet_Red")
    portrait("PotretA", ox + 3.9, -3.36, 3.3, 1.0, 1.4, c)
    portrait("PotretB", ox - 4.0, 3.28, 3.5, 0.9, 1.3, c)
    B("AlasPatung", (ox - 3.0, 1.4, 1.45), (0.55, 0.55, 1.0), "Marble", c)
    BALL("KepalaPatung", (ox - 3.0, 1.4, 2.2), 0.24, "Marble", c, sub=2)
    B("BahuPatung", (ox - 3.0, 1.4, 1.98), (0.62, 0.3, 0.26), "Marble", c, bevel=0.06)
    CY("CincinLampu", (ox, 0.2, 3.7), 0.8, 0.08, "Gold", c, segs=24)
    for k in range(8):
        a = k * PI / 4
        CY(f"LilinCincin{k}", (ox + math.cos(a) * 0.8, 0.2 + math.sin(a) * 0.8, 3.85), 0.03, 0.2, "Cloth_White", c, segs=8)
        BALL(f"ApiCincin{k}", (ox + math.cos(a) * 0.8, 0.2 + math.sin(a) * 0.8, 3.99), 0.045, "Flame", c, scale=(1, 1, 1.6), sub=1)
    for i in range(10):
        B(f"Swag{i}", (ox - 4.0 + i * 0.9, 3.15, 4.65), (0.7, 0.1, 0.3), "Velvet_Red", c)
        B(f"SwagD{i}", (ox - 4.0 + i * 0.9, -3.15, 4.65), (0.7, 0.1, 0.3), "Velvet_Red", c)
    vase("VasJendela", ox + 1.2, -3.1, 1.98, c, sc=0.9)
    for i in range(5):
        B(f"Bantal{i}", (ox + 2.6 + (i % 3) * 0.5, -1.4 + (i // 3) * 0.5, 1.07), (0.5, 0.5, 0.15), ("Velvet_Blue", "Velvet_Red", "Gold")[i % 3], c, bevel=0.06)
    B("SegelLilin", (ox + 0.6, -0.3, 2.07), (0.14, 0.14, 0.02), "Flag_Red", c)
    CY("Teh", (ox - 1.2, 0.8, 2.15), 0.1, 0.16, "Porcelain", c, segs=12)
    # luar: monogram, bunting, tong dan peti, rel titian, lentera, bebek, teratai, batu
    B("PlakatN", (ox - 0.9, -3.63, 4.0), (0.9, 0.07, 0.9), "Gold", c)
    text3d("MonogramN", "N", (ox - 0.9, -3.7, 3.7), 0.7, "Velvet_Blue", c)
    B("PlakatA", (ox + 3.6, -3.63, 4.0), (0.9, 0.07, 0.9), "Gold", c)
    text3d("MonogramA", "A", (ox + 3.6, -3.7, 3.7), 0.7, "Velvet_Red", c)
    for i in range(22):
        B(f"Bunting{i}", (ox - 5.3 + i * 0.5, -4.75, 4.75 - 0.05 * (i % 2)), (0.3, 0.02, 0.36), ("Flag_Blue", "Flag_White", "Flag_Red")[i % 3], c, rot=(0, PI / 4, 0))
    for i in range(3):
        B(f"PetiGeladak{i}", (ox + 5.4, 3.8 - i * 1.1, 0.95 + (0.0)), (0.9, 0.9, 0.8), "Plank_Pale", c)
    for i in range(3):
        CY(f"TongGeladak{i}", (ox - 5.5 + i * 0.9, 4.0, 1.0), 0.4, 0.8, "Wood_Wainscot", c, segs=12)
        CY(f"BandTong{i}", (ox - 5.5 + i * 0.9, 4.0, 1.05), 0.42, 0.08, "Iron_Dark", c, segs=12)
    CY("GulunganTali", (ox + 6.2, -4.2, 0.85), 0.4, 0.2, "Rope", c, segs=14)
    for sx in (-1, 1):
        CY(f"TiangLenteraRakit{sx}", (ox + sx * 6.7, -5.0, 1.8), 0.05, 2.4, "Wood_Dark", c, segs=8)
        BALL(f"LenteraRakit{sx}", (ox + sx * 6.7, -5.0, 3.1), 0.2, "Lamp_Warm", c, sub=1)
    for k in range(7):
        y = -14.4 + k * 1.3
        for sx in (-1, 1):
            B(f"TiangTitian{k}{sx}", (ox + sx * 1.1, y, 1.25), (0.08, 0.08, 1.0), "Wood_Dark", c)
        for sx in (-1, 1):
            B(f"RelTitian{k}{sx}", (ox + sx * 1.1, y + 0.65, 1.55), (0.06, 1.3, 0.06), "Wood_Dark", c)
    for i in range(6):
        BALL(f"Bebek{i}", (ox - 18 + i * 1.6 + (i % 2) * 0.8, -12 - (i % 3) * 1.4, 0.16), 0.3, "Cloth_White" if i % 2 else "Horse_White", c, scale=(1.3, 0.8, 0.7), sub=1)
        BALL(f"BebekK{i}", (ox - 17.7 + i * 1.6 + (i % 2) * 0.8, -12 - (i % 3) * 1.4, 0.42), 0.13, "Cloth_White", c, sub=1)
    for i in range(12):
        CY(f"Teratai{i}", (ox + 12 + (i % 4) * 2.2, -16 - (i // 4) * 2.4, 0.03), 0.6, 0.03, "Leaf_B", c, segs=14)
        if i % 3 == 0:
            BALL(f"BungaTeratai{i}", (ox + 12 + (i % 4) * 2.2, -16 - (i // 4) * 2.4, 0.15), 0.18, "Flower_P", c, sub=1)
    for i in range(14):
        BALL(f"BatuTepi{i}", (ox - 60 + i * 9 + RND.uniform(-2, 2), -72 + RND.uniform(-1, 1), 1.0), RND.uniform(0.6, 1.4), "Stone_Base", c, scale=(1.3, 1, 0.6), jit=0.2, seed=i, sub=1)
    for i in range(30):
        B(f"GelagahT{i}", (ox - 50 + i * 3.4 + RND.uniform(-1, 1), -70 + RND.uniform(-1.5, 1.5), 1.9), (0.06, 0.06, 2.0), "Leaf_B", c)
    for k in range(5):
        flower_patch(f"BungaTepi{k}", ox - 40 + k * 20, -78, 10, 6, 14, c, z=1.0)
    sky(ox)


def enrich_L2(ox):
    c = "L2_Tenda"
    for sx, w in ((-1, 1.8), (1, 2.0)):
        bookshelf(f"RakTenda{sx}", ox + sx * (2.9 if sx == 1 else 2.8), 4.55, 0.25, w, 2.7, 0.5, c)
    # manekin seragam + pedang + topi
    CY("TiangManekin", (ox + 5.2, -4.0, 1.0), 0.04, 1.5, "Wood_Dark", c, segs=8)
    B("DasarManekin", (ox + 5.2, -4.0, 0.3), (0.8, 0.08, 0.06), "Wood_Dark", c)
    B("DasarManekin2", (ox + 5.2, -4.0, 0.3), (0.08, 0.8, 0.06), "Wood_Dark", c)
    B("TorsoManekin", (ox + 5.2, -4.0, 1.75), (0.62, 0.34, 0.8), "Carriage_Blue", c, bevel=0.08)
    B("SabukManekin", (ox + 5.2, -4.0, 1.75), (0.64, 0.36, 0.1), "Gold", c)
    BALL("KepalaManekin", (ox + 5.2, -4.0, 2.35), 0.2, "Skin", c, sub=1)
    B("BicorneManekin", (ox + 5.2, -4.0, 2.6), (0.9, 0.26, 0.2), "Mane", c, bevel=0.05)
    B("PedangManekin", (ox + 5.7, -3.8, 1.2), (0.05, 0.05, 1.2), "Iron_Dark", c, rot=(0, 0.2, 0))
    B("GagangPedang", (ox + 5.73, -3.8, 1.85), (0.28, 0.05, 0.05), "Gold", c)
    # meja teh bundar
    CY("MejaTehKaki", (ox - 3.0, -3.4, 0.65), 0.07, 0.8, "Wood_Dark", c, segs=8)
    CY("MejaTehAtas", (ox - 3.0, -3.4, 1.07), 0.55, 0.06, "Wood_Desk", c, segs=20)
    BALL("Teko", (ox - 3.0, -3.4, 1.24), 0.16, "Porcelain", c, scale=(1, 1, 0.9), sub=1)
    B("TekoCerat", (ox - 2.8, -3.4, 1.25), (0.2, 0.05, 0.05), "Porcelain", c, rot=(0, 0.5, 0))
    for k in range(2):
        CY(f"Cangkir{k}", (ox - 3.3 + k * 0.5, -3.7, 1.13), 0.06, 0.07, "Porcelain", c, segs=10)
    # teleskop di tripod
    for k, (dx, dy) in enumerate(((0.5, 0.0), (-0.3, 0.45), (-0.3, -0.45))):
        rope(f"KakiTeleskop{k}", (ox + 3.6, -0.9, 1.7), (ox + 3.6 + dx, -0.9 + dy, 0.25), "Wood_Dark", c, th=0.05)
    CY("TabungTeleskop", (ox + 3.3, -0.9, 1.9), 0.07, 1.4, "Gold", c, rot=(0, PI / 2.4, 0), segs=12)
    # genderang, tong gulungan peta, pelana, sepatu bot, sabel silang, perisai
    CY("Genderang", (ox - 2.0, 3.7, 0.55), 0.45, 0.5, "Terracotta", c, segs=18)
    CY("KulitGenderang", (ox - 2.0, 3.7, 0.82), 0.46, 0.04, "Cloth_White", c, segs=18)
    CY("TongPeta", (ox + 0.6, 4.2, 0.65), 0.35, 0.8, "Wood_Wainscot", c, segs=12)
    for k in range(5):
        CY(f"GulunganPeta{k}", (ox + 0.45 + k * 0.08, 4.2 + (k % 2) * 0.1, 1.25), 0.05, 0.6, "Paper", c, rot=(0, 0.08 * k, 0), segs=8)
    for sx in (-1, 1):
        B(f"KakiPelana{sx}", (ox + 1.3 + sx * 0.3, 3.6, 0.5), (0.08, 0.5, 0.5), "Wood_Dark", c)
    B("Pelana", (ox + 1.3, 3.6, 0.95), (0.9, 0.5, 0.18), "Leather", c, bevel=0.07)
    BALL("Tanduk", (ox + 1.7, 3.6, 1.1), 0.1, "Leather", c, sub=1)
    for sx in (-1, 1):
        B(f"Bot{sx}", (ox - 3.4 + sx * 0.14, 2.0, 0.5), (0.18, 0.34, 0.5), "Leather", c)
    B("SabelA", (ox - 0.3, 4.85, 3.5), (0.05, 0.03, 1.7), "Iron_Dark", c, rot=(0, 0.7, 0))
    B("SabelB", (ox + 0.3, 4.85, 3.5), (0.05, 0.03, 1.7), "Iron_Dark", c, rot=(0, -0.7, 0))
    CY("Perisai", (ox, 4.83, 3.5), 0.38, 0.06, "Gold", c, rot=(PI / 2, 0, 0), segs=24)
    portrait("PotretTendaA", ox - 5.0, -4.9, 2.0, 1.0, 1.4, c)
    portrait("PotretTendaB", ox + 5.0, -4.9, 2.0, 1.0, 1.4, c)
    # lentera di tiang tengah, tempat tinta, jarum peta, bantal, karpet kedua
    CY("CincinTiang", (ox, 0, 3.4), 0.5, 0.06, "Gold", c, segs=20)
    for k in range(3):
        a = k * 2.1
        rope(f"TaliLentera{k}", (ox, 0, 3.4), (ox + math.cos(a) * 0.5, math.sin(a) * 0.5, 3.0), "Rope", c, th=0.02)
        BALL(f"Lentera{k}", (ox + math.cos(a) * 0.5, math.sin(a) * 0.5, 2.9), 0.16, "Lamp_Warm", c, sub=1)
    CY("TintaTenda", (ox - 1.2, 0.9, 1.6), 0.07, 0.12, "Iron_Dark", c, segs=10)
    CY("Kompas", (ox - 0.6, -0.1, 1.56), 0.12, 0.04, "Gold", c, segs=14)
    for k in range(6):
        BALL(f"Jarum{k}", (ox - 1.6 + k * 0.62, 0.4 + RND.uniform(-0.6, 0.6), 1.58), 0.06, "Flag_Red", c, sub=1)
    for i in range(3):
        B(f"BantalLantai{i}", (ox + 1.9 + i * 0.7, -1.1, 0.35), (0.55, 0.55, 0.16), ("Velvet_Red", "Velvet_Blue", "Gold")[i], c, bevel=0.07)
    B("KarpetBed", (ox - 4.6, 3.2, 0.27), (2.6, 3.8, 0.03), "Rug", c, uv=0.2)
    CY("Ember", (ox - 5.6, -1.4, 0.45), 0.3, 0.5, "Wood_Wainscot", c, segs=12)
    CY("AirEmber", (ox - 5.6, -1.4, 0.7), 0.27, 0.03, "Water", c, segs=12)
    CY("Kendi", (ox - 5.0, -1.0, 0.55), 0.18, 0.6, "Terracotta", c, segs=12, r2=0.1)
    # luar tenda
    FLAG("BenderaPuncak", ox, 0, 5.0, "fr", c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            rope(f"TaliTenda{sx}{sy}", (ox + sx * 6.8, sy * 5.3, 3.0), (ox + sx * 9.6, sy * 7.6, 0.1), "Rope", c, th=0.04)
            CY(f"PatokTali{sx}{sy}", (ox + sx * 9.6, sy * 7.6, 0.2), 0.06, 0.5, "Wood_Dark", c, segs=6)
    for k, (hx, hy, m) in enumerate(((ox + 16, -12, "Horse_Brown"), (ox + 16, -8, "Horse_White"))):
        horse(f"KudaTenda{k}", hx, hy, m, c)
        rope(f"TaliKuda{k}", (hx + 2.0, hy, 2.6), (hx + 4.4, hy, 1.1), "Rope", c, th=0.04)
    for k in range(2):
        CY(f"TiangTambat{k}", (ox + 20.4, -12 + k * 4, 0.9), 0.1, 1.8, "Wood_Dark", c, segs=8)
    cannon("MeriamTenda", ox + 12, -20, c)
    for k in range(8):
        a = k * PI / 4
        BALL(f"BatuUnggun{k}", (ox + 18 + math.cos(a) * 1.5, -14 + math.sin(a) * 1.5, 0.2), 0.28, "Stone_Base", c, jit=0.2, seed=k, sub=1)
    for k in range(3):
        rope(f"TiangPanci{k}", (ox + 18, -14, 3.0), (ox + 18 + math.cos(k * 2.1) * 1.6, -14 + math.sin(k * 2.1) * 1.6, 0.1), "Wood_Dark", c, th=0.07)
    CY("Panci", (ox + 18, -14, 1.5), 0.35, 0.4, "Iron_Dark", c, segs=12)
    for k in range(3):
        CY(f"KayuDuduk{k}", (ox + 18 + math.cos(k * 2.1 + 1) * 3.0, -14 + math.sin(k * 2.1 + 1) * 3.0, 0.3), 0.3, 1.8, "Wood_Wainscot", c, rot=(PI / 2, 0, k * 1.0), segs=10)
    B("MejaLuar", (ox + 24, -12, 0.95), (2.6, 1.2, 0.1), "Wood_Desk", c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"KakiMejaLuar{sx}{sy}", (ox + 24 + sx * 1.1, -12 + sy * 0.45, 0.5), (0.1, 0.1, 0.9), "Wood_Desk_Dark", c)
        B(f"BangkuLuar{sx}", (ox + 24, -12 + sx * 1.1, 0.55), (2.4, 0.4, 0.08), "Wood_Wainscot", c)
    B("GerobakTenda", (ox - 24, -14, 1.0), (3.4, 1.8, 0.7), "Wood_Desk", c)
    for sy in (-1, 1):
        CY(f"RodaGT{sy}", (ox - 24, -14 + sy * 1.05, 0.7), 0.7, 0.12, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=14)
    for k in range(3):
        CY(f"TongGT{k}", (ox - 24.8 + k * 0.8, -14, 1.7), 0.35, 0.8, "Wood_Wainscot", c, segs=10)
    BALL("Tumpukan", (ox - 18, 10, 0.9), 2.0, "Hay_Stack", c, scale=(1, 1, 1.1), sub=2)
    CY("TiangPetunjuk", (ox + 30, -2, 1.4), 0.07, 2.8, "Wood_Dark", c, segs=8)
    B("PetunjukA", (ox + 30.5, -2, 2.4), (1.4, 0.06, 0.34), "Plank_Pale", c)
    for k in range(5):
        flower_patch(f"BungaT{k}", ox - 30 + k * 18, 14, 10, 6, 14, c)
    sky(ox)


def enrich_L3(ox):
    c = "L3_Peternakan"
    for i in range(3):
        B(f"Balok{i}", (ox, 3.5 + i * 3.0, 4.2), (14, 0.3, 0.3), "Wood_Dark", c)
    # loteng jerami di kiri + tangga
    B("Loteng", (ox - 5.4, 4.0, 2.9), (3.0, 4.0, 0.2), "Plank_Pale", c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"TiangLoteng{sx}{sy}", (ox - 5.4 + sx * 1.4, 4.0 + sy * 1.8, 1.5), (0.14, 0.14, 2.8), "Wood_Dark", c)
    for k in range(6):
        BALL(f"JeramiLoteng{k}", (ox - 6.0 + (k % 3) * 0.9, 3.2 + (k // 3) * 1.3, 3.4), 0.55, "Hay_Stack", c, scale=(1.3, 1, 0.8), sub=1)
    ladder("TanggaLoteng", ox - 3.8, 2.2, 0.2, 2.8, c)
    # karung, palung, rak toples, gerobak dorong, garpu, lentera, ember, sapu
    for k in range(6):
        sack(f"Karung{k}", ox + 4.6 + (k % 3) * 0.6, 3.2 + (k // 3) * 0.5, 0.2 + (0.7 if k > 3 else 0), c)
    B("PalungDasar", (ox - 1.2, 3.2, 0.5), (2.4, 0.6, 0.12), "Wood_Wainscot", c)
    for sy in (-1, 1):
        B(f"PalungSisi{sy}", (ox - 1.2, 3.2 + sy * 0.3, 0.7), (2.4, 0.08, 0.4), "Wood_Wainscot", c)
    for sx in (-1, 1):
        B(f"PalungUjung{sx}", (ox - 1.2 + sx * 1.2, 3.2, 0.7), (0.08, 0.6, 0.4), "Wood_Wainscot", c)
    for k in range(7):
        CY(f"Wortel2{k}", (ox - 2.0 + k * 0.28, 3.2, 0.7), 0.07, 0.4, "Carrot", c, rot=(PI / 2, 0, 0.3 * k), segs=8, r2=0.01)
    for z in (1.2, 2.0):
        B(f"Rak{int(z * 10)}", (ox - 6.75, 5.6, z), (0.35, 3.0, 0.06), "Wood_Wainscot", c)
        for k in range(5):
            CY(f"Toples{int(z * 10)}{k}", (ox - 6.75, 4.5 + k * 0.55, z + 0.2), 0.12, 0.3, "Glass_Blue", c, segs=10)
    B("GerobakDorong", (ox + 2.5, 3.0, 0.7), (0.9, 0.7, 0.3), "Wood_Desk", c, rot=(0, 0.1, 0.2))
    CY("RodaDorong", (ox + 3.0, 3.0, 0.35), 0.3, 0.08, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=12)
    B("GagangDorong", (ox + 1.7, 3.0, 0.85), (0.9, 0.06, 0.06), "Wood_Wainscot", c, rot=(0, -0.3, 0))
    B("GarpuGagang", (ox - 5.9, 1.7, 1.3), (0.05, 0.05, 2.2), "Wood_Wainscot", c, rot=(0.25, 0, 0))
    for k in range(3):
        B(f"GarpuMata{k}", (ox - 5.9 + (k - 1) * 0.12, 1.5, 2.4), (0.03, 0.03, 0.4), "Iron_Dark", c, rot=(0.25, 0, 0))
    for k in range(2):
        rope(f"TaliLenteraL{k}", (ox - 2.5 + k * 5.0, 5.0, 4.2), (ox - 2.5 + k * 5.0, 5.0, 3.5), "Rope", c, th=0.03)
        BALL(f"LenteraL{k}", (ox - 2.5 + k * 5.0, 5.0, 3.35), 0.2, "Lamp_Warm", c, sub=1)
    CY("EmberL", (ox + 2.8, 5.6, 0.45), 0.3, 0.5, "Wood_Wainscot", c, segs=12)
    CY("AirEmberL", (ox + 2.8, 5.6, 0.7), 0.27, 0.03, "Water", c, segs=12)
    B("Sapu", (ox + 6.4, 2.0, 1.2), (0.05, 0.05, 2.0), "Wood_Wainscot", c, rot=(0.1, 0.05, 0))
    B("SapuIjuk", (ox + 6.4, 2.0, 0.3), (0.35, 0.1, 0.5), "Straw", c)
    BALL("Kucing", (ox + 5.2, 3.0, 1.45), 0.22, "Mane", c, scale=(1.3, 0.8, 0.9), sub=1)
    BALL("KucingKepala", (ox + 5.5, 3.0, 1.5), 0.13, "Mane", c, sub=1)
    # luar: papan, sumur, kandang ayam, kebun, orang-orangan sawah, kolam, rumah anjing, bunga
    text3d("TulisanPapan", "KELINCI", (ox + 7.5, -8.4, 2.1), 0.3, "Wood_Dark", c)
    CY("Sumur", (ox + 13, -1, 0.5), 0.95, 1.0, "Stone_Base", c, segs=16)
    CY("AirSumur", (ox + 13, -1, 0.95), 0.8, 0.03, "Water", c, segs=16)
    for sx in (-1, 1):
        B(f"TiangSumur{sx}", (ox + 13 + sx * 1.0, -1, 1.7), (0.12, 0.12, 2.2), "Wood_Dark", c)
    S.add_hip_roof("AtapSumur", (ox + 13, -1, 2.8), 2.8, 2.0, 0.9, 0.2, "Hay_Stack", c)
    CY("EmberSumur", (ox + 13, -1, 1.7), 0.2, 0.3, "Wood_Wainscot", c, segs=10)
    B("KandangAyam", (ox - 14, 3, 0.9), (2.6, 1.9, 1.3), "Wood_Wainscot", c)
    S.add_hip_roof("AtapAyam", (ox - 14, 3, 1.55), 3.0, 2.3, 1.0, 0.2, "Hay_Stack", c)
    B("TanggaAyam", (ox - 14, 1.6, 0.4), (0.5, 1.1, 0.06), "Wood_Wainscot", c, rot=(0.4, 0, 0))
    for k in range(4):
        B(f"Barisan{k}", (ox + 11 + 0.0, 8 + k * 1.1, 0.12), (6, 0.7, 0.24), "Dirt", c, uv=0.3)
        for j in range(7):
            BALL(f"Kubis{k}{j}", (ox + 8.6 + j * 0.8, 8 + k * 1.1, 0.4), 0.28, "Leaf_B" if (j + k) % 2 else "Leaf_A", c, sub=1)
    CY("TiangOrang", (ox + 9, 14, 1.2), 0.05, 2.4, "Wood_Wainscot", c, segs=8)
    B("LenganOrang", (ox + 9, 14, 1.9), (1.6, 0.06, 0.06), "Wood_Wainscot", c)
    BALL("KepalaOrang", (ox + 9, 14, 2.55), 0.22, "Hay_Stack", c, sub=1)
    CY("TopiOrang", (ox + 9, 14, 2.8), 0.34, 0.06, "Wood_Dark", c, segs=14)
    CY("TopiOrang2", (ox + 9, 14, 2.95), 0.2, 0.25, "Wood_Dark", c, segs=12)
    CY("Kolam", (ox + 22, -7, 0.02), 4.5, 0.06, "Water", c, segs=24)
    for k in range(5):
        BALL(f"BebekKolam{k}", (ox + 20 + k * 1.0, -6 + (k % 2), 0.2), 0.3, "Cloth_White", c, scale=(1.3, 0.8, 0.7), sub=1)
    B("RumahAnjing", (ox - 16, -6, 0.6), (1.4, 1.2, 1.1), "Wood_Wainscot", c)
    S.add_hip_roof("AtapAnjing", (ox - 16, -6, 1.15), 1.8, 1.5, 0.6, 0.2, "Hay_Stack", c)
    for k in range(4):
        flower_patch(f"BungaTernak{k}", ox - 8 + k * 6, -10, 5, 3, 12, c)
    for k in range(6):
        CY(f"BungaMatahari{k}", (ox - 22 + k * 1.2, 12, 1.0), 0.04, 2.0, "Leaf_B", c, segs=6)
        BALL(f"KelopakM{k}", (ox - 22 + k * 1.2, 11.85, 2.05), 0.28, "Flower_Y", c, scale=(1, 0.3, 1), sub=1)
    for k in range(3):
        CY(f"TumpukanKayu{k}", (ox + 16, 3 + k * 0.5, 0.3 + 0.0), 0.25, 2.0, "Wood_Wainscot", c, rot=(PI / 2, 0, 0), segs=8)
    sky(ox)


def enrich_L4(ox):
    c = "L4_Lapangan"
    for sx in (-1, 1):
        for sy in (-1, 1):
            CY(f"TiangBiru{sx}{sy}", (ox + sx * 4, 24 + sy * 3, 1.8), 0.1, 3.6, "Wood_Wainscot", c, segs=8)
    S.add_hip_roof("AtapBiru", (ox, 24, 3.6), 10, 8, 2.0, 0.5, "Canvas_Blue", c)
    B("KarpetBiru", (ox, 24, 0.06), (8.4, 5.6, 0.04), "Rug", c, uv=0.14)
    for k in range(4):
        chair(f"KursiBiru{k}", ox - 3 + k * 2, 22.4, 0.06, c, back=-1, seat="Velvet_Red")
    candelabra("KandilTenda", ox, 24, 0.06, c, floor=True)
    # bunting antar tiang bendera
    for i in range(36):
        B(f"BuntingL{i}", (ox - 16 + i * 0.85, 14.2, 3.1 - 0.4 * math.sin(i / 35 * PI)), (0.32, 0.02, 0.4), ("Flag_Blue", "Flag_White", "Flag_Red")[i % 3], c, rot=(0, PI / 4, 0))
    # makanan di meja panjang
    for k in range(3):
        CY(f"KueTingkat{k}", (ox - 10, 8, 1.15 + k * 0.16), 0.32 - k * 0.08, 0.16, "Cloth_White", c, segs=14)
    BALL("KueBuah", (ox - 10, 8, 1.65), 0.09, "Flag_Red", c, sub=1)
    for k in range(5):
        CY(f"Botol{k}", (ox - 12.6 + k * 0.35, 8.4, 1.25), 0.07, 0.4, "Leaf_Pine", c, segs=8)
        CY(f"Piring{k}", (ox - 8.2 + k * 0.5, 7.6, 1.1), 0.2, 0.02, "Porcelain", c, segs=14)
    for k in range(6):
        BALL(f"BuahMeja{k}", (ox - 7.8 + (k % 3) * 0.28, 8.5 + (k // 3) * 0.28, 1.2), 0.12, ("Flag_Red", "Carrot", "Leaf_B")[k % 3], c, sub=1)
    # banner di sepanjang jalan
    for k in range(7):
        CY(f"TiangSpanduk{k}", (ox - 6 + k * 4.5, -14, 2.2), 0.06, 4.4, "Wood_Dark", c, segs=8)
        B(f"Spanduk{k}", (ox - 5.6 + k * 4.5, -14, 3.8), (0.8, 0.03, 1.2), ("Flag_Red", "Flag_Blue")[k % 2], c)
        BALL(f"UjungSpanduk{k}", (ox - 6 + k * 4.5, -14, 4.5), 0.1, "Gold", c, sub=1)
    # sasaran memanah + bal jerami
    for k in range(3):
        x = ox + 26 + k * 3.2
        B(f"BalSasaran{k}", (x, 12, 0.6), (1.6, 0.6, 1.2), "Straw", c)
        for j, (r, m) in enumerate(((0.6, "Flag_White"), (0.45, "Flag_Red"), (0.3, "Flag_White"), (0.15, "Flag_Red"))):
            CY(f"Sasaran{k}{j}", (x, 11.65, 1.7), r, 0.04 + j * 0.005, m, c, rot=(PI / 2, 0, 0), segs=20)
        B(f"KakiSasaran{k}", (x, 11.9, 0.9), (0.1, 0.1, 1.2), "Wood_Dark", c)
    cannon("MeriamL4", ox + 30, -10, c)
    for k, (hx, hy, m) in enumerate(((ox - 32, 20, "Horse_Brown"), (ox - 28, 26, "Horse_White"))):
        horse(f"KudaL4{k}", hx, hy, m, c)
    # tikar piknik, keranjang, bantal
    B("TikarPiknik", (ox - 24, -6, 0.04), (5, 4, 0.04), "Rug", c, uv=0.2)
    B("Keranjang", (ox - 24, -6, 0.4), (0.8, 0.6, 0.4), "Rope", c, bevel=0.05)
    for k in range(3):
        B(f"BantalPiknik{k}", (ox - 25.5 + k * 1.4, -4.6, 0.17), (0.6, 0.6, 0.16), ("Velvet_Red", "Velvet_Blue", "Gold")[k], c, bevel=0.07)
    for k in range(6):
        flower_patch(f"BungaL4{k}", ox - 30 + k * 12, -2 + (k % 3) * 6, 12, 7, 18, c)
    for k in range(10):
        BALL(f"SemakL4{k}", (ox - 40 + k * 8.5, 40 + (k % 3) * 5, 0.5), 1.4, "Leaf_A", c, scale=(1.3, 1, 0.8), jit=0.15, seed=k, sub=1)
        BALL(f"BatuL4{k}", (ox - 34 + k * 7.9, 30 + (k % 4) * 7, 0.3), RND.uniform(0.5, 1.2), "Stone_Base", c, scale=(1.3, 1, 0.6), jit=0.2, seed=k + 5, sub=1)
    sky(ox)


def enrich_L5(ox):
    c = "L5_Kereta"
    cx = ox
    # koper di atap, ban cadangan, pijakan, cambuk, tali kekang
    for k, (dx, w) in enumerate(((-0.7, 1.3), (0.8, 1.0))):
        B(f"Koper{k}", (cx + dx, 0, 3.7), (w, 1.0, 0.5), "Leather", c, bevel=0.07)
        B(f"SabukKoper{k}", (cx + dx, 0, 3.7), (0.1, 1.02, 0.52), "Gold", c)
        B(f"SabukKoperB{k}", (cx + dx + 0.3, 0, 3.7), (0.1, 1.02, 0.52), "Gold", c)
    CY("BanCadangan", (cx - 2.15, 0, 1.6), 0.7, 0.2, "Wood_Wainscot", c, rot=(0, PI / 2, 0), segs=20)
    for sy in (-1, 1):
        B(f"Pijakan{sy}", (cx, sy * 1.2, 0.75), (1.4, 0.4, 0.1), "Gold", c)
        B(f"TanggaPijak{sy}", (cx, sy * 1.15, 0.9), (0.1, 0.12, 0.4), "Gold", c)
    B("Cambuk", (cx + 3.2, 0.7, 2.3), (0.04, 0.04, 1.4), "Wood_Dark", c, rot=(0.5, 0.2, 0))
    for k in range(2):
        rope(f"TaliKekang{k}", (cx + 2.4, 0.2 - k * 0.4, 1.8), (cx + 7.6, -0.9 + k * 1.8, 2.8), "Leather", c, th=0.025)
    for k, hy in enumerate((-0.9, 0.9)):
        B(f"KerahKuda{k}", (cx + 7.2, hy, 2.45), (0.4, 0.75, 0.65), "Leather", c, bevel=0.1)
        B(f"PelanaKuda{k}", (cx + 5.9, hy, 2.45), (0.9, 0.9, 0.1), "Leather", c)
        for sx in (-1, 1):
            BALL(f"Lonceng{k}{sx}", (cx + 7.2, hy + sx * 0.4, 2.1), 0.07, "Gold", c, sub=1)
    # interior: lentera, bantal, kotak topi, buku
    rope("TaliLenteraK", (cx, 0, 3.1), (cx, 0, 2.7), "Rope", c, th=0.02)
    BALL("LenteraKereta", (cx, 0, 2.55), 0.16, "Lamp_Warm", c, sub=1)
    for k in range(3):
        B(f"BantalK{k}", (cx - 0.8 + (k % 2) * 1.6, -0.5 + (k // 2) * 0.9, 1.9), (0.4, 0.4, 0.14), ("Velvet_Blue", "Gold", "Velvet_Blue")[k], c, bevel=0.06)
    B("KotakTopi", (cx - 0.8, 0.55, 1.95), (0.5, 0.4, 0.3), "Marble", c, bevel=0.05)
    B("BukuK", (cx + 0.7, -0.4, 1.4), (0.2, 0.28, 0.06), "Velvet_Red", c)
    # jalan: tiang jarak, papan petunjuk, pagar, rumah desa, bunga, batang kayu
    for k in range(4):
        B(f"BatuJarak{k}", (ox - 22 + k * 24, -7.6, 0.45), (0.5, 0.35, 0.9), "Stone_Base", c, bevel=0.1)
        BALL(f"KepalaBatu{k}", (ox - 22 + k * 24, -7.6, 0.95), 0.25, "Stone_Base", c, sub=1)
    CY("TiangPetunjukK", (ox - 12, 8, 1.4), 0.07, 2.8, "Wood_Dark", c, segs=8)
    B("PapanPetunjukA", (ox - 11.5, 8, 2.5), (1.5, 0.06, 0.36), "Plank_Pale", c)
    B("PapanPetunjukB", (ox - 12.5, 8, 2.0), (1.5, 0.06, 0.36), "Plank_Pale", c)
    for i in range(30):
        B(f"PagarK{i}", (ox - 70 + i * 4.6, 8.6, 0.6), (0.14, 0.14, 1.2), "Wood_Dark", c)
        if i < 29:
            for z in (0.45, 0.9):
                B(f"PagarKR{i}{int(z * 10)}", (ox - 67.7 + i * 4.6, 8.6, z), (4.6, 0.07, 0.1), "Wood_Dark", c)
    for k in range(7):
        x = ox - 90 + k * 30
        B(f"RumahDesa{k}", (x, 62 + (k % 2) * 6, 2.0), (7, 5, 4), "Stucco_Ext", c, uv=0.3)
        S.add_hip_roof(f"AtapDesa{k}", (x, 62 + (k % 2) * 6, 4.0), 8, 6, 2.6, 0.5, "Roof_Red", c)
        B(f"PintuDesa{k}", (x, 59.4 + (k % 2) * 6, 1.2), (1.2, 0.1, 2.0), "Door_Wood", c)
    B("MenaraGereja", (ox + 20, 70, 6.0), (5, 5, 12), "Stone_Trim", c)
    S.add_hip_roof("AtapGereja", (ox + 20, 70, 12.0), 6, 6, 5, 0.0, "Roof_DarkRed", c)
    for k in range(6):
        flower_patch(f"BungaJalan{k}", ox - 60 + k * 24, 10, 12, 4, 16, c)
        BALL(f"SemakJalan{k}", (ox - 48 + k * 20, -9.5, 0.55), 1.2, "Leaf_A", c, scale=(1.3, 1, 0.8), jit=0.15, seed=k, sub=1)
    CY("BatangTumbang", (ox - 30, -8.8, 0.45), 0.45, 5.0, "Wood_Wainscot", c, rot=(0, PI / 2, 0.2), segs=10)
    sky(ox)


ENRICH = {"L1": enrich_L1, "L2": enrich_L2, "L3": enrich_L3, "L4": enrich_L4, "L5": enrich_L5}

OX = {"L1": 0, "L2": 400, "L3": 800, "L4": 1200, "L5": 1600}
BUILD = {"L1": build_L1, "L2": build_L2, "L3": build_L3, "L4": build_L4, "L5": build_L5}

# (nama, latar, kamera, target, lensa, malam, lampu titik)
VIEWS = [
    ("l1_udara", "L1", (-17, -27, 6.5), (0, 0, 4.6), 30, False, []),
    ("l1_dalam", "L1", (2.6, -2.7, 3.0), (-0.3, 1.6, 2.1), 26, False, [(0, 0.2, 3.4, 600), (-1.5, 0.3, 2.6, 60), (1.5, 0.3, 2.6, 60)]),
    ("l1_dalam2", "L1", (1.7, 1.9, 2.9), (1.0, -3.4, 2.7), 24, False, [(0, 0.2, 3.4, 600), (2, -2, 3.0, 200)]),
    ("l2_luar", "L2", (-19, -31, 5.0), (6, -8, 3.6), 26, False, []),
    ("l2_dalam", "L2", (3.8, -4.2, 2.3), (-0.3, 2.0, 1.3), 26, False, [(0, 0, 4.0, 700), (1.4, 1.0, 2.1, 80), (-5.2, -2.6, 1.3, 100)]),
    ("l2_dalam2", "L2", (-3.4, -3.9, 2.4), (3.2, 2.4, 1.6), 24, False, [(0, 0, 4.0, 700), (2.8, 3.0, 2.0, 120), (-3, -3, 1.6, 80)]),
    ("l3_luar", "L3", (-10, -25, 3.0), (1, 3, 3.6), 28, False, []),
    ("l3_dalam", "L3", (0.6, 2.6, 1.55), (-0.2, 9.0, 1.45), 24, False, [(0, 5, 2.6, 260)]),
    ("l3_dalam2", "L3", (3.4, 2.0, 1.7), (-5.5, 4.4, 2.0), 22, False, [(0, 5, 2.6, 260), (-5, 4, 2.4, 120)]),
    ("l4_luas", "L4", (-6, -26, 8.5), (2, 6, 3.0), 26, False, []),
    ("l4_tenda", "L4", (-3.0, -2.5, 2.4), (-10, 8, 1.5), 22, False, []),
    ("l5_luar", "L5", (-8, -13, 2.6), (3.6, 0, 2.4), 30, False, []),
    ("l5_dalam", "L5", (1.3, 0.1, 2.4), (-1.3, 0.2, 2.05), 20, False, [(0, 0, 3.0, 150)]),
    ("l6_malam", "L2", (3.8, -4.2, 2.3), (-0.3, 2.0, 1.3), 26, True, [(0, 0, 4.0, 500), (1.4, 1.0, 2.1, 220), (-5.2, -2.6, 1.3, 220), (4.8, 3.0, 1.6, 90)]),
]
if os.environ.get("NP_EXTRA"):
    exec(open(os.environ["NP_EXTRA"]).read(), globals())
need = {v[1] for v in VIEWS if WANT == "all" or v[0] in WANT.split(",")}
for k in ("L1", "L2", "L3", "L4", "L5"):
    if k in need or GLB:
        BUILD[k](OX[k])
        ENRICH[k](OX[k])

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
ee = sc.eevee
ee.use_gtao = True
ee.gtao_distance = 1.0
ee.use_soft_shadows = True
ee.taa_render_samples = 32
ee.shadow_cascade_size = "2048"
ee.use_bloom = True
ee.bloom_intensity = 0.04
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x, sc.render.resolution_y = 720, 1280

w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
Nw, Lw = w.node_tree.nodes, w.node_tree.links
wbg = Nw["Background"]
_tc, _sp, wr = Nw.new("ShaderNodeTexCoord"), Nw.new("ShaderNodeSeparateXYZ"), Nw.new("ShaderNodeValToRGB")
Lw.new(_tc.outputs["Generated"], _sp.inputs[0])
Lw.new(_sp.outputs["Z"], wr.inputs[0])
Lw.new(wr.outputs[0], wbg.inputs[0])
wr.color_ramp.elements.new(0.62)

bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = Vector((0.45, 0.55, -0.5)).to_track_quat("-Z", "Y").to_euler()
sun.data.angle = math.radians(3)
bpy.ops.object.camera_add(location=(0, 0, 0))
cam = bpy.context.object
sc.camera = cam
extra = []


def set_day(night):
    e = wr.color_ramp.elements
    if night:
        e[0].position, e[1].position, e[2].position = 0.5, 0.56, 0.7
        e[0].color, e[1].color, e[2].color = (*lin("#34447a"), 1), (*lin("#1c2858"), 1), (*lin("#0c1230"), 1)
        wbg.inputs[1].default_value = 0.9
        sun.data.energy = 0.5
        sun.data.color = (0.5, 0.6, 1.0)
    else:
        e[0].position, e[1].position, e[2].position = 0.5, 0.56, 0.7
        e[0].color, e[1].color, e[2].color = (*lin("#f6f0dc"), 1), (*lin("#a8cdf2"), 1), (*lin("#4a86d8"), 1)
        wbg.inputs[1].default_value = 1.0
        sun.data.energy = 3.4
        sun.data.color = (1.0, 0.9, 0.72)


for name, lat, cp, tg, lens, night, pts in VIEWS:
    if WANT != "all" and name not in WANT.split(","):
        continue
    o = OX[lat]
    cam.location = (o + cp[0], cp[1], cp[2])
    cam.rotation_euler = (Vector((o + tg[0], tg[1], tg[2])) - Vector(cam.location)).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens
    cam.data.clip_end = 600
    set_day(night)
    for l in extra:
        bpy.data.objects.remove(l, do_unlink=True)
    extra = []
    for (px, py, pz, pw) in pts:
        bpy.ops.object.light_add(type="POINT", location=(o + px, py, pz))
        li = bpy.context.object
        li.data.energy = pw * (0.38 if not night else 2.4)
        li.data.color = (1.0, 0.82, 0.58)
        li.data.shadow_soft_size = 0.3
        extra.append(li)
    sc.render.filepath = os.path.join(OUTDIR, name + ".png")
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"WAKTU {name}: {time.time() - t0:.1f} dtk")

def merge_for_export():
    """gabungkan objek per (latar, material) agar jumlah draw call kecil di Remotion"""
    from collections import defaultdict
    groups = defaultdict(list)
    for o in list(bpy.data.objects):
        if o.type != "MESH" or not o.data.materials or not o.users_collection:
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
    merge_for_export()
    bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB", export_yup=True, export_materials="EXPORT", export_texcoords=True, export_normals=True, export_apply=True)
    print("GLB", GLB, os.path.getsize(GLB) // 1024, "KB")
