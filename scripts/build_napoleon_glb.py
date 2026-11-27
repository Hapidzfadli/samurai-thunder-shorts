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


def tex_grass():
    H = W = 256
    a, b = np.array(lin("#7fb64a")), np.array(lin("#639e3a"))
    n = noise(H, W, 8, 12)
    out = a[None, None, :] * (1 - n)[..., None] + b[None, None, :] * n[..., None]
    out[rng.random((H, W)) > 0.99] = np.array(lin("#a8d868"))
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
            for j in range(6):
                B(f"Jeruji{lvl}{k}{j}", (x - 0.85 + j * 0.34, 7.7, z0), (0.03, 0.03, 0.82), "Iron_Dark", c)
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
        TREE(f"PohonL4{i}", ox - 30 + i * 9 + (i % 2) * 3, -10 - (i % 3) * 9, 1.1, c, 600 + i)


# ====================================================================== L5 · kereta kuda
def build_L5(ox):
    c = "L5_Kereta"
    B("JalanKereta", (ox, 0, -0.1), (400, 14, 0.2), "Dirt", c, uv=0.2)
    B("RumputKereta", (ox, 0, -0.14), (400, 400, 0.2), "Meadow", c, uv=0.15)
    cx = ox
    # badan kereta
    B("Alas", (cx, 0, 1.0), (4.2, 2.3, 0.25), "Carriage_Blue", c)
    B("Kabin", (cx, 0, 2.1), (3.2, 2.0, 2.1), "Carriage_Blue", c, bevel=0.06)
    B("AtapKabin", (cx, 0, 3.35), (3.7, 2.4, 0.22), "Carriage_Blue", c, bevel=0.05)
    B("ListEmas", (cx, 0, 3.22), (3.8, 2.5, 0.07), "Gold", c)
    B("ListEmasBawah", (cx, 0, 1.18), (4.3, 2.4, 0.07), "Gold", c)
    for sy in (-1, 1):
        jendela = B(f"JendelaKereta{sy}", (cx, sy * 1.02, 2.3), (1.5, 0.12, 1.1), "Window_Glass_Dark", c)
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


OX = {"L1": 0, "L2": 80, "L3": 160, "L4": 240, "L5": 320}
BUILD = {"L1": build_L1, "L2": build_L2, "L3": build_L3, "L4": build_L4, "L5": build_L5}

# (nama, latar, kamera, target, lensa, malam, lampu titik)
VIEWS = [
    ("l1_udara", "L1", (-16, -26, 13), (0, 0, 3.2), 30, False, []),
    ("l1_dalam", "L1", (2.6, -2.7, 3.0), (-0.3, 1.6, 2.1), 26, False, [(0, 0.2, 3.4, 600), (-1.5, 0.3, 2.6, 60), (1.5, 0.3, 2.6, 60)]),
    ("l2_dalam", "L2", (3.8, -4.2, 2.3), (-0.3, 2.0, 1.3), 26, False, [(0, 0, 4.0, 700), (1.4, 1.0, 2.1, 80), (-5.2, -2.6, 1.3, 100)]),
    ("l2_luar", "L2", (-17, -30, 7.0), (0, -1, 2.8), 24, False, []),
    ("l3_luar", "L3", (-9, -22, 3.2), (0, 3, 2.2), 30, False, []),
    ("l3_dalam", "L3", (0.6, 2.6, 1.55), (-0.2, 9.0, 1.45), 24, False, [(0, 5, 2.6, 260)]),
    ("l4_luas", "L4", (-1, -21, 4.6), (1, 5, 2.2), 26, False, []),
    ("l5_luar", "L5", (-7, -12, 3.2), (3.6, 0, 2.2), 32, False, []),
    ("l5_dalam", "L5", (1.15, -0.75, 2.35), (-1.3, 0.55, 2.05), 18, False, [(0, 0, 3.0, 150)]),
    ("l6_malam", "L2", (3.8, -4.2, 2.3), (-0.3, 2.0, 1.3), 26, True, [(0, 0, 4.0, 500), (1.4, 1.0, 2.1, 220), (-5.2, -2.6, 1.3, 220), (4.8, 3.0, 1.6, 90)]),
]
need = {v[1] for v in VIEWS if WANT == "all" or v[0] in WANT.split(",")}
for k in ("L1", "L2", "L3", "L4", "L5"):
    if k in need or GLB:
        BUILD[k](OX[k])

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
wbg = w.node_tree.nodes["Background"]

bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = Vector((0.45, 0.55, -0.5)).to_track_quat("-Z", "Y").to_euler()
sun.data.angle = math.radians(3)
bpy.ops.object.camera_add(location=(0, 0, 0))
cam = bpy.context.object
sc.camera = cam
extra = []


def set_day(night):
    if night:
        wbg.inputs[0].default_value = (*lin("#26346a"), 1)
        wbg.inputs[1].default_value = 0.9
        sun.data.energy = 0.5
        sun.data.color = (0.5, 0.6, 1.0)
    else:
        wbg.inputs[0].default_value = (*lin("#bcd8f0"), 1)
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

if GLB:
    bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB", export_yup=True, export_materials="EXPORT", export_texcoords=True, export_normals=True, export_apply=True)
    print("GLB", GLB, os.path.getsize(GLB) // 1024, "KB")
