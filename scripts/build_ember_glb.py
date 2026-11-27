"""Latar 3D "Perang Ember Kayu 1325 (Modena vs Bologna)" di Blender headless:
  L1: Museum Menara Ghirlandina (Modena, era sekarang)
  L2: Balai Dewan Bologna (ruang rapat perang 1325)
  L3: Bukit & Padang Zappolino (medan pertempuran)
  L4: Gerbang Porta San Felice & Sumur Batu Bologna

Memakai helper build_school_glb.py (UV asli + tekstur prosedural packed + material Principled -> GLB).

Pakai:
  blender -b -noaudio --python scripts/build_ember_glb.py -- <folder_preview> [tampilan|none|all] [public/models/ember.glb]
"""
import importlib.util
import math
import os
import sys
import time
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
rng = np.random.default_rng(1325)


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def img(name, arr):
    h, w, _ = arr.shape
    return S.make_image_from_rgba(name, np.concatenate([arr, np.ones((h, w, 1))], axis=2).astype(np.float32))


def noise(h, w, k, seed):
    r = np.random.default_rng(seed)
    return np.kron(r.random((h // k + 2, w // k + 2)), np.ones((k, k)))[:h, :w]


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


# ------------------------------------------------------------------ Tekstur Prosedural Italia
def tex_marble_checker():
    H = W = 256
    c1, c2 = np.array(lin("#f2e8d4")), np.array(lin("#cbb89a"))
    yy, xx = np.mgrid[:H, :W]
    chk = ((xx // 64) + (yy // 64)) % 2
    out = np.where(chk[..., None] == 0, c1, c2)
    vein = 0.94 + 0.09 * snoise(H, W, 16, 11)
    out = out * vein[..., None]
    out[yy % 64 < 2] *= 0.65
    out[xx % 64 < 2] *= 0.65
    return img("marble_chk", np.clip(out, 0, 1))


def tex_brick(c_base="#a84634", c_mortar="#d8cab4", seed=21):
    H = W = 256
    out = np.ones((H, W, 3)) * np.array(lin(c_base))
    n = 0.85 + 0.28 * snoise(H, W, 12, seed)
    out *= n[..., None]
    bh, bw = 32, 64
    mortar = np.array(lin(c_mortar))
    for r in range(H // bh):
        y0 = r * bh
        out[y0:y0 + 3, :] = mortar
        off = (bw // 2) if (r % 2) else 0
        for c in range(W // bw + 1):
            x0 = (c * bw + off) % W
            out[y0:y0 + bh, x0:min(W, x0 + 3)] = mortar
            # sedikit variasi warna tiap bata
            v = 0.92 + 0.16 * ((r * 7 + c * 13) % 5) / 4.0
            x1 = min(W, x0 + bw - 3)
            if x0 + 3 < x1:
                out[y0 + 3:y0 + bh, x0 + 3:x1] *= v
    return img("brick_" + c_base.lstrip("#"), np.clip(out, 0, 1))


def tex_terracotta():
    H = W = 256
    c1, c2 = np.array(lin("#c4724e")), np.array(lin("#a85c3c"))
    yy, xx = np.mgrid[:H, :W]
    chk = ((xx // 48) + (yy // 48)) % 2
    out = np.where(chk[..., None] == 0, c1, c2) * (0.9 + 0.18 * snoise(H, W, 10, 31))[..., None]
    out[yy % 48 < 3] *= 0.55
    out[xx % 48 < 3] *= 0.55
    return img("terracotta", np.clip(out, 0, 1))


def tex_cobble():
    H = W = 256
    out = np.ones((H, W, 3)) * np.array(lin("#9e9484"))
    out *= (0.82 + 0.34 * snoise(H, W, 14, 41))[..., None]
    sh, sw = 28, 36
    grout = np.array(lin("#5c5448"))
    for r in range(H // sh + 1):
        y0 = r * sh
        out[y0:min(H, y0 + 3), :] = grout
        off = (sw // 2) if (r % 2) else 0
        for c in range(W // sw + 1):
            x0 = (c * sw + off) % W
            out[y0:min(H, y0 + sh), x0:min(W, x0 + 3)] = grout
    return img("cobble", np.clip(out, 0, 1))


def tex_stripes(c1, c2, n=10):
    H = W = 256
    a, b = np.array(lin(c1)), np.array(lin(c2))
    x = (np.arange(W) * n // W) % 2
    row = np.where(x[:, None] == 0, a[None, :], b[None, :])
    return img("str_" + c1 + c2, np.repeat(row[None, :, :], H, axis=0) * (0.95 + 0.08 * noise(H, W, 4, 3))[..., None])


def tex_grass():
    H = W = 256
    a, b = np.array(lin("#84b34a")), np.array(lin("#658f36"))
    n = 0.55 * snoise(H, W, 32, 12) + 0.45 * snoise(H, W, 8, 13)
    out = a[None, None, :] * (1 - n)[..., None] + b[None, None, :] * n[..., None]
    return img("grass_it", np.clip(out * (0.93 + 0.14 * snoise(H, W, 3, 14))[..., None], 0, 1))


def tex_dirt():
    H = W = 256
    base = np.array(lin("#a6845a"))
    n = 0.5 * snoise(H, W, 8, 8) + 0.5 * snoise(H, W, 28, 9)
    return img("dirt_it", np.clip(base[None, None, :] * (0.8 + 0.36 * n)[..., None], 0, 1))


def tex_map_emilia():
    H = W = 512
    out = np.ones((H, W, 3)) * np.array(lin("#efe0b8"))
    out *= (0.92 + 0.1 * noise(H, W, 6, 2))[..., None]
    yy, xx = np.ogrid[:H, :W]
    # Wilayah Modena (kiri, biru) & Bologna (kanan, merah)
    m_mod = ((xx - 155) / 115) ** 2 + ((yy - 255) / 150) ** 2 < 1
    m_bol = ((xx - 360) / 120) ** 2 + ((yy - 255) / 155) ** 2 < 1
    out[m_mod] = np.array(lin("#547db8")) * 0.92
    out[m_bol] = np.array(lin("#c9544e")) * 0.92
    # Sungai Panaro di tengah
    river = np.abs(xx - (256 + 18 * np.sin(yy / 55.0))) < 6
    out[river] = np.array(lin("#4f8ec4"))
    # Grid peta
    for k in range(7):
        out[64 + k * 64:67 + k * 64, :] *= 0.65
        out[:, 64 + k * 64:67 + k * 64] *= 0.65
    out[:10] = out[-10:] = out[:, :10] = out[:, -10:] = np.array(lin("#6b4622"))
    return img("peta_emilia", np.clip(out, 0, 1))


def tex_roof_tile():
    H = W = 256
    out = np.ones((H, W, 3)) * np.array(lin("#b0472c"))
    yy, xx = np.mgrid[:H, :W]
    wave = 0.86 + 0.22 * np.sin(xx * 2 * PI / 24.0)
    out *= wave[..., None]
    out[yy % 32 < 3] *= 0.55
    return img("roof_tile", np.clip(out, 0, 1))


# ------------------------------------------------------------------ Material
M = S.make_mat
M("Marble_Floor", lin("#e8dcc4"), roughness=0.55, image=tex_marble_checker(), uv_scale=0.45)
M("Plaster_Warm", lin("#f2e7d0"), roughness=0.9)
M("Stone_Light", lin("#d9ccb4"), roughness=0.82)
M("Stone_Dark", lin("#8f8678"), roughness=0.9)
M("Brick_Bologna", lin("#a84634"), roughness=0.88, image=tex_brick("#a84634", "#d9cbb4", 21), uv_scale=0.45)
M("Brick_Dark", lin("#873426"), roughness=0.9, image=tex_brick("#873426", "#c4b49c", 22), uv_scale=0.45)
M("Terracotta", lin("#bc6c4a"), roughness=0.82, image=tex_terracotta(), uv_scale=0.5)
M("Cobble", lin("#9e9484"), roughness=0.92, image=tex_cobble(), uv_scale=0.4)
M("Roof_Tile", lin("#b0472c"), roughness=0.85, image=tex_roof_tile(), uv_scale=0.6)
M("Wood_Oak", lin("#6e4422"), roughness=0.8)
M("Wood_Dark", lin("#452914"), roughness=0.82)
M("Wood_Warm", lin("#9c6838"), roughness=0.8)
M("Velvet_Red", lin("#8a1824"), roughness=0.9)
M("Modena_Blue", lin("#1f4a94"), roughness=0.82)
M("Modena_Gold", lin("#e6b830"), roughness=0.75)
M("Bologna_Red", lin("#bd222b"), roughness=0.82)
M("Bologna_White", lin("#f5efe0"), roughness=0.85)
M("Gold", lin("#deb038"), roughness=0.32, metallic=0.65)
M("Iron", lin("#2c3038"), roughness=0.45, metallic=0.6)
M("Glass_Case", lin("#d8f2ff"), roughness=0.08)
M("Meadow", lin("#7fb34a"), roughness=0.98, image=tex_grass(), uv_scale=0.25)
M("Dirt", lin("#a6845a"), roughness=0.98, image=tex_dirt(), uv_scale=0.35)
M("Hill_Far", lin("#678a44"), roughness=0.98)
M("Hill_Far2", lin("#557538"), roughness=0.98)
M("Canvas_Modena", lin("#f0e8d4"), roughness=0.9, image=tex_stripes("#224c94", "#e6b830", 12), uv_scale=1.0)
M("Canvas_Bologna", lin("#f0e8d4"), roughness=0.9, image=tex_stripes("#bd222b", "#f5efe0", 12), uv_scale=1.0)
M("Map_Emilia", lin("#efe0b8"), roughness=0.88, image=tex_map_emilia(), uv_scale=1.0)
M("Paper", lin("#f4ead2"), roughness=0.92)
M("Flame", lin("#ffc858"), roughness=0.25, emission=lin("#ffaa33"), emission_strength=6.0)
M("Sky_Window", lin("#c4e4fa"), roughness=0.2, emission=lin("#9ed0f5"), emission_strength=1.4)
M("Leaf_Cypress", lin("#2e5c30"), roughness=0.92)
M("Water_Dark", lin("#1d2b38"), roughness=0.25)
M("Paint_Blue", lin("#4f7396"), roughness=0.88)
M("Paint_Warm", lin("#8c5e3c"), roughness=0.88)
M("Book_Green", lin("#2d6b45"), roughness=0.85)
M("Book_Red", lin("#9c2828"), roughness=0.85)
M("Book_Blue", lin("#274d8c"), roughness=0.85)

# Buat Glass_Case semi-transparan di Principled BSDF
if "Glass_Case" in S.MATS:
    bsdf = S.MATS["Glass_Case"].node_tree.nodes.get("Principled BSDF")
    if bsdf and "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = 0.22
    S.MATS["Glass_Case"].blend_method = "BLEND"


def B(name, c, size, mat, col, rot=(0, 0, 0), uv=0.5, bevel=0.0):
    return S.add_box(name, c, size, mat, col, rot=rot, bevel=bevel, uv_scale=uv)


def CY(name, c, r, h, mat, col, rot=(0, 0, 0), segs=16, r2=None):
    return S.add_cylinder(name, c, r, r if r2 is None else r2, h, segs, mat, col, rot)


def BALL(name, c, r, mat, col, scale=(1, 1, 1), jit=0.0, seed=1, sub=2):
    return S.add_icosphere(name, c, r, sub, mat, col, scale=scale, jitter=jit, seed=seed)


def CYPRESS(name, x, y, s, col):
    CY(name + "_t", (x, y, 0.9 * s), 0.22 * s, 1.8 * s, "Wood_Dark", col, segs=8)
    CY(name + "_c1", (x, y, 3.0 * s), 0.72 * s, 3.4 * s, "Leaf_Cypress", col, r2=0.18 * s, segs=10)
    BALL(name + "_c2", (x, y, 4.7 * s), 0.35 * s, "Leaf_Cypress", col, scale=(0.8, 0.8, 1.6), sub=1)


# ================================================================== L1 · MUSEUM GHIRLANDINA (ox=0)
def build_L1(ox):
    c = "L1_Museum"
    # Lantai marmer kotak-kotak hangat + langit-langit berkasau kayu
    B("LantaiMuseum", (ox, 0, -0.1), (16, 14, 0.2), "Marble_Floor", c, uv=0.4)
    B("PlafonMuseum", (ox, 0, 6.2), (16, 14, 0.3), "Plaster_Warm", c)
    for y in (-4.5, -1.5, 1.5, 4.5):
        B(f"BalokAtap{y}", (ox, y, 5.95), (15.5, 0.35, 0.35), "Wood_Dark", c)
    # Dinding belakang, kiri, kanan
    B("DindingBlk", (ox, 4.6, 3.1), (16, 0.4, 6.4), "Plaster_Warm", c)
    B("DindingKiri", (ox - 6.8, 0, 3.1), (0.4, 14, 6.4), "Plaster_Warm", c)
    B("DindingKanan", (ox + 6.8, 0, 3.1), (0.4, 14, 6.4), "Plaster_Warm", c)
    # Panel kayu bawah dinding (wainscoting) + lis atas
    B("WainscotBlk", (ox, 4.35, 0.7), (15.6, 0.14, 1.4), "Wood_Oak", c, bevel=0.02)
    B("WainscotLis", (ox, 4.3, 1.44), (15.6, 0.22, 0.1), "Wood_Dark", c)
    B("WainscotKiri", (ox - 6.55, 0, 0.7), (0.14, 13.6, 1.4), "Wood_Oak", c)
    B("WainscotKanan", (ox + 6.55, 0, 0.7), (0.14, 13.6, 1.4), "Wood_Oak", c)
    # 4 Pilar batu marmer klasik dengan alas & kapital
    for sx in (-3.6, 3.6):
        for sy in (4.15, 0.4):
            B(f"Pilar_{sx}_{sy}", (ox + sx, sy, 3.1), (0.62, 0.62, 6.0), "Stone_Light", c, bevel=0.04)
            B(f"PilarAlas_{sx}_{sy}", (ox + sx, sy, 0.25), (0.86, 0.86, 0.5), "Stone_Dark", c, bevel=0.03)
            B(f"PilarKap_{sx}_{sy}", (ox + sx, sy, 5.85), (0.88, 0.88, 0.32), "Gold", c, bevel=0.02)
    # Pigura lukisan kuno di dinding belakang (kiri & kanan)
    for idx, lx in enumerate((-2.15, 2.15)):
        B(f"Pigura_{idx}", (ox + lx, 4.32, 3.45), (1.5, 0.14, 1.9), "Gold", c, bevel=0.03)
        B(f"Kanvas_{idx}", (ox + lx, 4.24, 3.45), (1.22, 0.04, 1.62), "Paint_Blue" if idx == 0 else "Paint_Warm", c)
        B(f"BukitLukis_{idx}", (ox + lx, 4.21, 3.05), (1.18, 0.03, 0.65), "Hill_Far" if idx == 0 else "Wood_Warm", c)
        B(f"MenaraLukis_{idx}", (ox + lx + 0.15, 4.2, 3.55), (0.24, 0.03, 0.85), "Stone_Light", c)
    # Spanduk kuning-biru Modena di tengah belakang
    CY("TiangSpanduk", (ox, 4.25, 5.1), 0.045, 2.0, "Gold", c, rot=(0, PI / 2, 0), segs=10)
    B("SpandukBiru", (ox, 4.28, 3.75), (1.5, 0.06, 2.6), "Modena_Blue", c)
    B("SpandukKuning", (ox, 4.24, 3.75), (0.48, 0.06, 2.6), "Modena_Gold", c)
    # Pedestal beludru merah + plakat emas + rangka etalase kaca (embernya dari Remotion agar bisa dianimasi!)
    B("PedestalBawah", (ox, 1.3, 0.12), (1.6, 1.6, 0.24), "Wood_Dark", c, bevel=0.03)
    B("PedestalBadan", (ox, 1.3, 0.82), (1.32, 1.32, 1.2), "Velvet_Red", c, bevel=0.03)
    B("PedestalAtas", (ox, 1.3, 1.48), (1.42, 1.42, 0.12), "Gold", c, bevel=0.02)
    B("Plakat1325", (ox, 0.62, 1.05), (0.72, 0.05, 0.3), "Gold", c, bevel=0.01)
    # Rangka kaca etalase (4 tiang sudut tipis + tutup atas)
    for cx in (-0.6, 0.6):
        for cy in (-0.6, 0.6):
            B(f"KacaTiang_{cx}_{cy}", (ox + cx, 1.3 + cy, 2.2), (0.045, 0.045, 1.4), "Gold", c)
    B("KacaAtas", (ox, 1.3, 2.92), (1.26, 1.26, 0.05), "Gold", c)
    # Tiang pembatas museum + tali merah di depan pedestal
    for sx in (-1.65, 1.65):
        CY(f"StanchionAlas_{sx}", (ox + sx, -0.25, 0.05), 0.2, 0.1, "Gold", c, segs=12)
        CY(f"StanchionTiang_{sx}", (ox + sx, -0.25, 0.55), 0.04, 1.0, "Gold", c, segs=10)
        BALL(f"StanchionBola_{sx}", (ox + sx, -0.25, 1.08), 0.08, "Gold", c, sub=1)
    CY("TaliMuseum", (ox, -0.25, 0.88), 0.035, 3.2, "Velvet_Red", c, rot=(0, PI / 2, 0), segs=8)
    # Lampu sorot museum menggantung di atas etalase
    CY("KabelLampu", (ox, 1.3, 5.45), 0.025, 1.2, "Iron", c, segs=8)
    CY("KapLampu", (ox, 1.3, 4.75), 0.36, 0.42, "Iron", c, r2=0.14, segs=12)
    BALL("BohlamMuseum", (ox, 1.3, 4.55), 0.12, "Flame", c, sub=1)


# ================================================================== L2 · BALAI DEWAN BOLOGNA (ox=400)
def build_L2(ox):
    c = "L2_Balai"
    B("LantaiBalai", (ox, 0, -0.1), (16, 14, 0.2), "Terracotta", c, uv=0.45)
    B("PlafonBalai", (ox, 0, 6.2), (16, 14, 0.3), "Wood_Dark", c)
    for y in (-4, -1.5, 1.0, 3.5):
        B(f"BalokBalai_{y}", (ox, y, 5.85), (15.5, 0.38, 0.45), "Wood_Oak", c)
    # Dinding bata merah khas Bologna + plaster hangat
    B("DindingBlkBalai", (ox, 4.5, 3.1), (16, 0.45, 6.4), "Plaster_Warm", c)
    B("DindingKiriBalai", (ox - 6.6, 0, 3.1), (0.45, 14, 6.4), "Brick_Bologna", c, uv=0.4)
    B("DindingKananBalai", (ox + 6.6, 0, 3.1), (0.45, 14, 6.4), "Brick_Bologna", c, uv=0.4)
    # Pilar bata merah di belakang
    for sx in (-3.2, 3.2):
        B(f"PilarBata_{sx}", (ox + sx, 4.05, 3.1), (0.85, 0.85, 6.1), "Brick_Bologna", c, uv=0.45, bevel=0.03)
        B(f"PilarBataCap_{sx}", (ox + sx, 4.05, 5.85), (1.05, 1.05, 0.35), "Stone_Light", c)
    # Jendela tinggi melengkung di tengah belakang
    B("KusenJendela", (ox, 4.24, 3.75), (2.25, 0.24, 3.05), "Stone_Light", c, bevel=0.03)
    B("KacaJendela", (ox, 4.22, 3.75), (1.9, 0.08, 2.7), "Sky_Window", c)
    B("PalangJendelaV", (ox, 4.16, 3.75), (0.1, 0.1, 2.7), "Wood_Dark", c)
    B("PalangJendelaH", (ox, 4.16, 3.75), (1.9, 0.1, 0.1), "Wood_Dark", c)
    # Spanduk salib merah Bologna kiri & kanan jendela
    for sx in (-1.95, 1.95):
        B(f"PanjiBol_{sx}", (ox + sx, 4.22, 3.85), (1.05, 0.06, 2.25), "Bologna_White", c)
        B(f"SalibV_{sx}", (ox + sx, 4.18, 3.85), (0.26, 0.06, 2.05), "Bologna_Red", c)
        B(f"SalibH_{sx}", (ox + sx, 4.18, 4.15), (0.92, 0.06, 0.26), "Bologna_Red", c)
    # Rak buku & gulungan perkamen di kiri belakang
    B("RakBadan", (ox - 4.8, 3.5, 1.65), (1.8, 0.7, 3.3), "Wood_Oak", c, bevel=0.02)
    for rz in (0.6, 1.4, 2.2, 2.95):
        B(f"RakPapan_{rz}", (ox - 4.8, 3.45, rz), (1.68, 0.65, 0.09), "Wood_Dark", c)
        for bi, bmat in enumerate(("Book_Red", "Book_Blue", "Book_Green", "Paper", "Book_Red")):
            B(f"Buku_{rz}_{bi}", (ox - 5.35 + bi * 0.28, 3.32, rz + 0.26), (0.18, 0.36, 0.42), bmat, c)
    # Meja peta perang kayu besar di tengah ruangan
    B("MejaAtas", (ox, 0.9, 1.18), (4.6, 2.2, 0.18), "Wood_Oak", c, bevel=0.03)
    for lx in (-2.0, 2.0):
        for ly in (-0.85, 0.85):
            B(f"MejaKaki_{lx}_{ly}", (ox + lx, 0.9 + ly, 0.56), (0.22, 0.22, 1.12), "Wood_Dark", c)
    # Peta Emilia-Romagna bertekstur di atas meja
    B("PetaMeja", (ox, 0.9, 1.29), (3.65, 1.72, 0.03), "Map_Emilia", c, uv=1.0)
    # Bidak Kastil Monteveglio 3D di tengah peta
    B("KastilMini", (ox - 0.15, 0.95, 1.48), (0.34, 0.34, 0.36), "Stone_Light", c, bevel=0.02)
    CY("AtapKastilMini", (ox - 0.15, 0.95, 1.76), 0.26, 0.26, "Modena_Blue", c, r2=0.03, segs=4)
    # Bidak pasukan di peta
    for i, (px, py, pm) in enumerate(((-1.0, 1.1, "Modena_Blue"), (-0.75, 0.7, "Modena_Blue"), (0.85, 1.0, "Bologna_Red"), (1.1, 0.65, "Bologna_Red"), (0.7, 0.6, "Bologna_Red"))):
        CY(f"Bidak_{i}", (ox + px, py, 1.38), 0.09, 0.18, pm, c, segs=10)
    # Kandelabra emas & lilin menyala di ujung meja
    CY("KandilAlas", (ox + 1.85, 1.35, 1.31), 0.16, 0.08, "Gold", c, segs=12)
    CY("KandilTiang", (ox + 1.85, 1.35, 1.56), 0.04, 0.45, "Gold", c, segs=10)
    CY("LilinBalai", (ox + 1.85, 1.35, 1.88), 0.045, 0.25, "Paper", c, segs=10)
    BALL("ApiBalai", (ox + 1.85, 1.35, 2.08), 0.075, "Flame", c, scale=(1, 1, 1.5), sub=1)


# ================================================================== L3 · BUKIT & PADANG ZAPPOLINO (ox=800)
def build_L3(ox):
    c = "L3_Zappolino"
    # Padang rumput luas + jalan tanah melintas
    B("Padang", (ox, 2, -0.25), (90, 80, 0.5), "Meadow", c, uv=0.12)
    B("JalanMedan", (ox, -0.5, 0.02), (60, 3.6, 0.05), "Dirt", c, uv=0.25)
    # Perbukitan bergelombang di belakang
    BALL("BukitKiri", (ox - 10, 18, 0.5), 8.5, "Hill_Far", c, scale=(1.5, 1.0, 0.55), sub=2)
    BALL("BukitTengah", (ox + 3, 22, 1.0), 10.5, "Hill_Far2", c, scale=(1.6, 1.1, 0.62), sub=2)
    BALL("BukitKanan", (ox + 15, 19, 0.4), 8.0, "Hill_Far", c, scale=(1.4, 1.0, 0.52), sub=2)
    # Benteng batu Zappolino di puncak bukit tengah
    B("BentengBadan", (ox + 3.0, 18.5, 6.4), (4.2, 2.8, 2.8), "Stone_Light", c, bevel=0.05)
    B("BentengMenara", (ox + 1.2, 18.5, 7.6), (1.4, 1.4, 3.6), "Stone_Dark", c, bevel=0.04)
    CY("BentengAtap", (ox + 1.2, 18.5, 9.8), 1.1, 1.2, "Roof_Tile", c, r2=0.08, segs=4)
    # Tenda komando Modena (biru-kuning bergaris) di kiri
    CY("TendaModenaB", (ox - 3.6, 5.2, 1.25), 1.45, 2.5, "Canvas_Modena", c, r2=1.25, segs=12)
    CY("TendaModenaA", (ox - 3.6, 5.2, 3.1), 1.55, 1.35, "Modena_Gold", c, r2=0.06, segs=12)
    # Tenda komando Bologna (merah-putih bergaris) di kanan
    CY("TendaBolognaB", (ox + 3.6, 5.2, 1.25), 1.45, 2.5, "Canvas_Bologna", c, r2=1.25, segs=12)
    CY("TendaBolognaA", (ox + 3.6, 5.2, 3.1), 1.55, 1.35, "Bologna_Red", c, r2=0.06, segs=12)
    # Panji perang tinggi kiri & kanan
    for sx, mat in ((-2.0, "Modena_Blue"), (2.0, "Bologna_Red")):
        CY(f"TiangPanji_{sx}", (ox + sx, 3.2, 2.2), 0.05, 4.4, "Wood_Dark", c, segs=8)
        B(f"KainPanji_{sx}", (ox + sx + 0.55, 3.2, 3.8), (1.1, 0.05, 0.72), mat, c)
    # Pohon cemara Italia (cypress) & peti/tong logistik
    for idx, (tx, ty, ts) in enumerate(((-6.5, 8.5, 1.1), (-5.2, 10.2, 0.95), (6.2, 8.8, 1.15), (7.6, 10.5, 0.9))):
        CYPRESS(f"Cemara_{idx}", ox + tx, ty, ts, c)
    B("PetiPerang", (ox - 2.6, 2.8, 0.38), (0.85, 0.65, 0.76), "Wood_Warm", c, bevel=0.02)
    CY("TongPerang", (ox + 2.7, 2.9, 0.45), 0.34, 0.9, "Wood_Oak", c, segs=12)


# ================================================================== L4 · GERBANG PORTA SAN FELICE & SUMUR (ox=1200)
def build_L4(ox):
    c = "L4_Gerbang"
    # Jalan batu cobblestone Italia
    B("JalanBatu", (ox, 0, -0.15), (40, 30, 0.3), "Cobble", c, uv=0.35)
    # Tembok kota bata merah Bologna (tinggi 4.6m agar Ara bisa mengintip di atasnya!)
    B("TembokKota", (ox, 3.8, 2.3), (18, 1.4, 4.6), "Brick_Bologna", c, uv=0.35)
    # Gigi benteng (crenellations) di puncak tembok
    for bx in (-6.0, -4.5, -3.0, -1.5, 0.0, 1.5, 3.0, 4.5, 6.0):
        B(f"Gigi_{bx}", (ox + bx, 3.35, 4.95), (0.82, 0.55, 0.72), "Brick_Dark", c, bevel=0.02)
    # Dua menara pengawal di ujung kiri & kanan tembok
    for sx in (-6.2, 6.2):
        B(f"MenaraJaga_{sx}", (ox + sx, 3.8, 3.6), (2.4, 2.2, 7.2), "Brick_Dark", c, uv=0.35, bevel=0.04)
        CY(f"AtapMenara_{sx}", (ox + sx, 3.8, 7.85), 1.85, 1.4, "Roof_Tile", c, r2=0.1, segs=4)
    # Gerbang kayu Porta San Felice (tertutup rapat + bingkai batu + besi)
    B("BingkaiGerbang", (ox, 3.05, 1.85), (3.1, 0.35, 3.7), "Stone_Light", c, bevel=0.04)
    B("PintuGerbang", (ox, 3.12, 1.72), (2.55, 0.25, 3.4), "Wood_Dark", c)
    for hz in (0.7, 1.7, 2.7):
        B(f"BesiPintu_{hz}", (ox, 2.98, hz), (2.45, 0.06, 0.14), "Iron", c)
    # Sumur batu tua beratap genteng di kanan depan (ox + 1.65, y = 0.6)
    wx, wy = ox + 1.65, 0.55
    CY("SumurBadan", (wx, wy, 0.55), 0.76, 1.1, "Stone_Dark", c, r2=0.82, segs=16)
    CY("SumurBibir", (wx, wy, 1.12), 0.84, 0.14, "Stone_Light", c, segs=16)
    CY("SumurAir", (wx, wy, 1.08), 0.62, 0.06, "Water_Dark", c, segs=14)
    for tx in (-0.68, 0.68):
        B(f"TiangSumur_{tx}", (wx + tx, wy, 1.65), (0.14, 0.14, 2.1), "Wood_Oak", c)
    CY("KatrolSumur", (wx, wy, 2.15), 0.065, 1.45, "Wood_Dark", c, rot=(0, PI / 2, 0), segs=10)
    CY("AtapSumur", (wx, wy, 2.85), 1.25, 0.85, "Roof_Tile", c, r2=0.08, segs=4)
    # Tong kayu & peti di sisi kiri
    CY("TongGerbang", (ox - 2.2, 1.3, 0.45), 0.35, 0.9, "Wood_Oak", c, segs=12)
    B("PetiGerbang", (ox - 2.9, 1.5, 0.35), (0.75, 0.75, 0.7), "Wood_Warm", c, bevel=0.02)
    CYPRESS("CemaraGerbangKiri", ox - 7.8, 1.8, 1.05, c)
    CYPRESS("CemaraGerbangKanan", ox + 7.8, 1.6, 1.1, c)


OX = {"L1": 0, "L2": 400, "L3": 800, "L4": 1200}
build_L1(OX["L1"])
build_L2(OX["L2"])
build_L3(OX["L3"])
build_L4(OX["L4"])


def merge_for_export():
    """Gabungkan objek per (latar, material) agar draw call kecil & render cepat di Remotion."""
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
