"""Latar "Terowongan ke Brankas" (Nice 1976) di Blender headless -> GLB untuk Remotion.
L1 jalan Nice + fasad bank, L2 studio foto, L3 got bawah kota, L4 penampang (cutaway) jalan-got-terowongan-brankas,
L5 ruang brankas, L6 kantor hakim lantai atas + jalan di bawah jendela.
Tekstur dari scripts/tex_terowongan.py (blender/tex_terowongan/*.png, di-pack ke GLB).

Pakai:
  blender -b -noaudio --python scripts/build_terowongan_glb.py -- public/models/terowongan.glb
Koordinat Blender -> Three.js: X=X, Y(tinggi)=Z, Z=-Y. OX per latar: L1 0, L2 400, L3 800, L4 1200, L5 1600, L6 2000.
"""
import importlib.util, math, os, sys, random
import bmesh
import bpy
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEX = os.path.join(ROOT, "blender", "tex_terowongan")
ARGS = sys.argv[sys.argv.index("--") + 1:]
GLB = ARGS[0]
ONLY = ARGS[1].split(",") if len(ARGS) > 1 else None

spec = importlib.util.spec_from_file_location("sch", os.path.join(HERE, "build_school_glb.py"))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
S.clear_scene()
S.init_materials()
MATS = S.MATS
PI = math.pi
RND = random.Random(5)


def lin(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def TIMG(f):
    im = bpy.data.images.load(os.path.join(TEX, f + ".png"))
    im.pack()
    return im


M = S.make_mat
TM = lambda name, f, uv=1.0, rough=0.85, metal=0.0: M(name, (1, 1, 1), roughness=rough, metallic=metal, image=TIMG(f), uv_scale=uv)
# ---- material bertekstur
TM("Bata_Merah", "bata_merah", 1.0)
TM("Bata_Got", "bata_got", 0.9)
TM("Tanah", "tanah", 0.35, 1.0)
TM("Kerikil", "kerikil", 0.5, 1.0)
TM("Lempung", "lempung", 0.4, 1.0)
TM("Batu_Dasar", "batu", 0.5, 1.0)
TM("Aspal", "aspal", 0.25, 0.9)
TM("Batu_Jalan", "batu_jalan", 1.1, 0.95)
TM("Fasad_Batu", "fasad_batu", 0.35, 0.9)
TM("Plester_Oker", "plester_oker", 0.3, 0.92)
TM("Plester_Merah", "plester_merah", 0.3, 0.92)
TM("Plester_Kuning", "plester_kuning", 0.3, 0.92)
TM("Plester_Krem", "plester_krem", 0.35, 0.92)
TM("Beton", "beton", 0.3, 0.9)
TM("Laci_Deposit", "laci_deposit", 0.5, 0.45, 0.5)
TM("Lantai_Brankas", "lantai_brankas_roll", 1 / 9.0, 0.22)
TM("Lantai_Brankas_Kecil", "lantai_brankas_roll", 1 / 5.0, 0.5)
TM("Wallpaper", "wallpaper", 0.6, 0.9)
TM("Papan_Banque", "papan_banque", 1.0, 0.5)
TM("Papan_Cafe", "papan_cafe", 1.0, 0.7)
TM("Papan_Palais", "papan_palais", 1.0, 0.7)
TM("Papan_Photo", "papan_photo", 1.0, 0.7)
TM("Papan_Coffres", "papan_coffres", 1.0, 0.6)
TM("Papan_Danger", "papan_danger", 1.0, 0.6)
TM("Peta_Got", "peta_got", 1.0, 0.9)
TM("Deretan_Foto", "deretan_foto", 1.0, 0.6)
TM("Rak_Buku", "rak_buku", 1.0, 0.9)
TM("Muka_Pintu", "muka_pintu", 1.0, 0.35, 0.55)
# ---- material polos
for nm, col, kw in [
    ("Baja", "#8a9098", dict(roughness=0.35, metallic=0.75)), ("Baja_Gelap", "#3a3e46", dict(roughness=0.45, metallic=0.6)),
    ("Emas", "#d8aa3a", dict(roughness=0.3, metallic=0.8)), ("Kuningan", "#b8923a", dict(roughness=0.4, metallic=0.7)),
    ("Karat", "#7a4a2a", dict(roughness=0.9, metallic=0.3)), ("Besi_Hitam", "#1e2024", dict(roughness=0.5, metallic=0.5)),
    ("Air_Got", "#2a3a30", dict(roughness=0.12)), ("Lumut", "#4a7a3a", dict(roughness=1.0)), ("Tanah_Gelap", "#3a2414", dict(roughness=1.0)),
    ("Kayu_Penyangga", "#8a6234", dict(roughness=0.9)), ("Kayu_Tua", "#5a3a22", dict(roughness=0.85)),
    ("Karung", "#b8a070", dict(roughness=1.0)), ("Kertas", "#f2ecdc", dict(roughness=0.9)), ("Uang", "#7aa06a", dict(roughness=0.8)),
    ("Mutiara", "#f4f0e8", dict(roughness=0.25)), ("Permata_Merah", "#c8243a", dict(roughness=0.1, metallic=0.2)),
    ("Tabung_Merah", "#b8302a", dict(roughness=0.4, metallic=0.3)), ("Tabung_Hijau", "#2a6a3a", dict(roughness=0.4, metallic=0.3)),
    ("Selang", "#202020", dict(roughness=0.7)), ("Kaca_Gelap", "#2a3a4a", dict(roughness=0.1, metallic=0.3)),
    ("Ban", "#1a1a1a", dict(roughness=0.8)), ("Krom", "#d0d4d8", dict(roughness=0.15, metallic=0.9)),
    ("Mobil_Merah", "#c8402e", dict(roughness=0.35)), ("Mobil_Biru", "#3a6ab0", dict(roughness=0.35)), ("Mobil_Krem", "#e8d8a8", dict(roughness=0.35)),
    ("Mobil_Hijau", "#6a9a5a", dict(roughness=0.35)), ("Daun_Palem", "#3e7a34", dict(roughness=0.9)), ("Batang_Palem", "#8a6a44", dict(roughness=1.0)),
    ("Jendela_Hijau", "#3e6a4a", dict(roughness=0.7)), ("Jendela_Biru", "#4a6a8a", dict(roughness=0.7)), ("Kusen_Putih", "#ece6d8", dict(roughness=0.7)),
    ("Tenda_Merah", "#b8322a", dict(roughness=0.9)), ("Tenda_Putih", "#f0ece0", dict(roughness=0.9)), ("Kain_Merah", "#8a2228", dict(roughness=0.95)),
    ("Kain_Hijau", "#3a5a3a", dict(roughness=0.95)), ("Bendera_Biru", "#1f3f9a", dict(roughness=0.85)), ("Bendera_Putih", "#f6f2e8", dict(roughness=0.85)),
    ("Bendera_Merah", "#c4262c", dict(roughness=0.85)), ("Pot_Tanah", "#b0603a", dict(roughness=0.9)), ("Daun", "#4a8a3a", dict(roughness=0.9)),
    ("Kulit", "#4a2a1a", dict(roughness=0.6)), ("Plastik_Hitam", "#202024", dict(roughness=0.4)), ("Krem", "#e8dcc0", dict(roughness=0.8)),
    ("Tikus", "#6a6460", dict(roughness=0.9)), ("Merpati", "#9a9aa8", dict(roughness=0.9)), ("Laut", "#3a8ab0", dict(roughness=0.15)),
    ("Bukit", "#6a8a5a", dict(roughness=1.0)), ("Atap_Genteng", "#b0583a", dict(roughness=0.85)), ("Lampu_Kuning", "#ffe0a0", dict(roughness=0.3, emission=lin("#ffc870"), emission_strength=4.0)),
    ("Lampu_Putih", "#f4f4ff", dict(roughness=0.3, emission=lin("#e8f0ff"), emission_strength=4.0)), ("Cahaya_Lubang", "#fff4d8", dict(roughness=0.3, emission=lin("#fff0d0"), emission_strength=6.0)),
    ("Plafon_Brankas", "#e6dcc8", dict(roughness=0.85)), ("Plafon_Emas", "#c9a24a", dict(roughness=0.35, metallic=0.7)), ("Plafon_Biru", "#2a3a6a", dict(roughness=0.8)),
    ("Plafon_Studio", "#efe4cc", dict(roughness=0.9)), ("Plafon_Krem", "#ece2cc", dict(roughness=0.9)),
    ("Lampu_Merah", "#ff4030", dict(roughness=0.3, emission=lin("#ff3020"), emission_strength=3.0)),
]:
    M(nm, lin(col), **kw)


def B(name, c, size, mat, col, rot=(0, 0, 0), uv=0.5, bevel=0.0):
    return S.add_box(name, c, size, mat, col, rot=rot, bevel=bevel, uv_scale=uv)


def CY(name, c, r, h, mat, col, rot=(0, 0, 0), segs=16, r2=None):
    return S.add_cylinder(name, c, r, r if r2 is None else r2, h, segs, mat, col, rot)


def BALL(name, c, r, mat, col, scale=(1, 1, 1), jit=0.0, seed=1, sub=2):
    return S.add_icosphere(name, c, r, sub, mat, col, scale=scale, jitter=jit, seed=seed)


def Q(name, c, w, h, axis, mat, col):
    return S.add_planar_quad(name, c, w, h, axis, mat, col)


def CUT(target, cutters):
    S.add_boolean_cut(target, cutters)


def DISC(name, center, r, mat, col, axis="-Y", segs=48):
    """cakram dengan UV radial (gambar persegi dipetakan ke lingkaran)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    c = bm.verts.new((0, 0, 0))
    ring = []
    for i in range(segs):
        a = 2 * PI * i / segs
        if axis == "-Y":
            ring.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a))))
        else:
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), 0)))
    for i in range(segs):
        f = bm.faces.new((c, ring[i], ring[(i + 1) % segs]))
        a0, a1 = 2 * PI * i / segs, 2 * PI * (i + 1) / segs
        for lp, uv in zip(f.loops, ((0.5, 0.5), (0.5 + 0.5 * math.cos(a0), 0.5 + 0.5 * math.sin(a0)), (0.5 + 0.5 * math.cos(a1), 0.5 + 0.5 * math.sin(a1)))):
            lp[uvl].uv = uv
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = Vector(center)
    o.data.materials.append(MATS[mat])
    S.link_obj(o, col)
    return o


def RING(name, c, r_out, r_in, depth, mat, col, rot=(PI / 2, 0, 0), segs=40):
    o = CY(name, c, r_out, depth, mat, col, rot=rot, segs=segs)
    k = CY(name + "_k", c, r_in, depth + 0.4, mat, col, rot=rot, segs=segs)
    CUT(o, [k])
    return o


def CAR(name, x, y, z, mat, col, s=1):
    B(name + "_badan", (x, y, z + 0.6), (3.9, 1.65, 0.65), mat, col, bevel=0.12)
    B(name + "_kabin", (x - 0.25 * s, y, z + 1.17), (2.1, 1.45, 0.6), mat, col, bevel=0.1)
    for sy in (-1, 1):
        B(f"{name}_kaca{sy}", (x - 0.25 * s, y + sy * 0.73, z + 1.2), (1.8, 0.02, 0.42), "Kaca_Gelap", col)
    B(name + "_kacaD", (x + 0.78 * s, y, z + 1.17), (0.04, 1.3, 0.45), "Kaca_Gelap", col)
    for sx in (-1, 1):
        for sy in (-1, 1):
            CY(f"{name}_ban{sx}{sy}", (x + sx * 1.25, y + sy * 0.8, z + 0.36), 0.36, 0.26, "Ban", col, rot=(PI / 2, 0, 0), segs=16)
            CY(f"{name}_velg{sx}{sy}", (x + sx * 1.25, y + sy * 0.94, z + 0.36), 0.17, 0.04, "Krom", col, rot=(PI / 2, 0, 0), segs=12)
        B(f"{name}_bemper{sx}", (x + sx * 1.98, y, z + 0.42), (0.1, 1.7, 0.16), "Krom", col)
    for sy in (-1, 1):
        CY(f"{name}_lampu{sy}", (x + 1.96 * s, y + sy * 0.55, z + 0.68), 0.13, 0.05, "Lampu_Kuning", col, rot=(0, PI / 2, 0), segs=12)


def PALM(name, x, y, col, h=6.0, seed=1):
    r = random.Random(seed)
    lean = r.uniform(-0.25, 0.25)
    n = 8
    for i in range(n):
        CY(f"{name}_b{i}", (x + lean * i * h / n * 0.3, y, h * (i + 0.5) / n), 0.24 - i * 0.012, h / n + 0.05, "Batang_Palem", col, segs=10, r2=0.22 - i * 0.012)
    top = (x + lean * h * 0.3, y, h)
    BALL(name + "_kepala", top, 0.35, "Batang_Palem", col, sub=1)
    for k in range(9):
        a = 2 * PI * k / 9 + r.uniform(-0.2, 0.2)
        d = r.uniform(0.25, 0.6)
        B(f"{name}_d{k}", (top[0] + math.cos(a) * 1.3, top[1] + math.sin(a) * 1.3, top[2] - 0.35 - d * 0.4), (2.8, 0.55, 0.05), "Daun_Palem", col, rot=(0, d, a))


def LAMPPOST(name, x, y, col, h=4.2):
    CY(name + "_kaki", (x, y, 0.25), 0.2, 0.5, "Besi_Hitam", col, segs=10)
    CY(name + "_tiang", (x, y, h / 2), 0.07, h, "Besi_Hitam", col, segs=8)
    B(name + "_kap", (x, y, h + 0.35), (0.42, 0.42, 0.12), "Besi_Hitam", col)
    B(name + "_kaca", (x, y, h + 0.12), (0.32, 0.32, 0.38), "Lampu_Kuning", col)
    S.add_hip_roof(name + "_atap", (x, y, h + 0.41), 0.5, 0.5, 0.25, 0.0, "Besi_Hitam", col)


def FLAG(name, x, y, z, col, rotz=0.0, size=1.0):
    CY(name + "_tiang", (x, y, z), 0.035, 2.0 * size, "Kuningan", col, rot=(0.6, 0, rotz), segs=8)
    for i, m in enumerate(("Bendera_Biru", "Bendera_Putih", "Bendera_Merah")):
        B(f"{name}_{i}", (x + (i - 1) * 0.34 * size, y - 0.5 * size, z + 0.5 * size), (0.34 * size, 0.02, 0.7 * size), m, col, rot=(0, 0.05 * i, 0))


def WIN(name, x, y, z, w, h, col, shutter="Jendela_Hijau", bars=False, balcony=False, axis_y=True):
    """jendela di dinding yang menghadap -Y (kusen, kaca gelap, daun jendela, teralis/balkon)"""
    B(name + "_kaca", (x, y - 0.02, z), (w, 0.05, h), "Kaca_Gelap", col)
    B(name + "_kusenA", (x, y - 0.06, z + h / 2 + 0.06), (w + 0.24, 0.12, 0.12), "Kusen_Putih", col)
    B(name + "_kusenB", (x, y - 0.1, z - h / 2 - 0.06), (w + 0.36, 0.22, 0.1), "Kusen_Putih", col)
    for sx in (-1, 1):
        B(f"{name}_kusen{sx}", (x + sx * (w / 2 + 0.05), y - 0.06, z), (0.1, 0.12, h), "Kusen_Putih", col)
        if shutter:
            B(f"{name}_daun{sx}", (x + sx * (w / 2 + 0.3), y - 0.08, z), (0.5, 0.05, h * 0.96), shutter, col)
            for k in range(5):
                B(f"{name}_kisi{sx}{k}", (x + sx * (w / 2 + 0.3), y - 0.12, z - h * 0.4 + k * h * 0.2), (0.44, 0.02, 0.04), "Kusen_Putih", col)
    if bars:
        for k in range(5):
            CY(f"{name}_jeruji{k}", (x - w / 2 + (k + 0.5) * w / 5, y - 0.15, z), 0.025, h, "Besi_Hitam", col, segs=6)
    if balcony:
        B(name + "_balkonLt", (x, y - 0.45, z - h / 2 - 0.05), (w + 0.8, 0.9, 0.1), "Fasad_Batu", col)
        B(name + "_balkonPeg", (x, y - 0.88, z - h / 2 + 0.5), (w + 0.8, 0.04, 0.05), "Besi_Hitam", col)
        for k in range(9):
            B(f"{name}_balkonJ{k}", (x - (w + 0.8) / 2 + k * (w + 0.8) / 8, y - 0.88, z - h / 2 + 0.25), (0.03, 0.03, 0.5), "Besi_Hitam", col)


def TABLE(name, x, y, z, w, d, h, top, col, leg="Kayu_Tua"):
    B(name + "_atas", (x, y, z + h), (w, d, 0.07), top, col)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"{name}_kaki{sx}{sy}", (x + sx * (w / 2 - 0.06), y + sy * (d / 2 - 0.06), z + h / 2), (0.06, 0.06, h), leg, col)


def CHAIR(name, x, y, z, col, mat="Kayu_Tua", face=-1):
    B(name + "_duduk", (x, y, z + 0.46), (0.48, 0.46, 0.05), mat, col)
    B(name + "_sandar", (x, y - face * 0.22, z + 0.78), (0.48, 0.04, 0.6), mat, col)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B(f"{name}_k{sx}{sy}", (x + sx * 0.2, y + sy * 0.2, z + 0.23), (0.04, 0.04, 0.46), mat, col)


def PLANT(name, x, y, z, col, s=1.0, seed=3):
    CY(name + "_pot", (x, y, z + 0.22 * s), 0.2 * s, 0.44 * s, "Pot_Tanah", col, segs=12, r2=0.26 * s)
    r = random.Random(seed)
    for k in range(6):
        BALL(f"{name}_d{k}", (x + r.uniform(-0.2, 0.2) * s, y + r.uniform(-0.2, 0.2) * s, z + (0.6 + r.uniform(0, 0.5)) * s), 0.22 * s, "Daun", col, jit=0.2, seed=seed + k, sub=1)


def RUBBLE(name, x, y, z, n, col, spread=0.8, size=0.14, seed=9, mat="Beton"):
    r = random.Random(seed)
    for k in range(n):
        BALL(f"{name}{k}", (x + r.uniform(-spread, spread), y + r.uniform(-spread, spread), z + size * 0.4), size * r.uniform(0.5, 1.4), mat, col, jit=0.35, seed=seed + k, sub=1)


# ====================================================================== L1 · Jalan Nice + fasad bank
def build_L1(ox):
    c = "L1_Jalan"
    B("Jalan", (ox, 0, -0.1), (120, 12, 0.2), "Batu_Jalan", c, uv=1.0)
    for sy in (-1, 1):
        B(f"Trotoar{sy}", (ox, sy * 8.5, 0.08), (120, 5, 0.36), "Plester_Krem", c, uv=0.5)
        B(f"Kanstin{sy}", (ox, sy * 6.05, 0.12), (120, 0.12, 0.42), "Fasad_Batu", c)
    B("Belakang", (ox, 0, -0.3), (300, 300, 0.2), "Plester_Krem", c, uv=0.2)
    for k in range(12):
        B(f"Marka{k}", (ox - 55 + k * 10, 0, 0.005), (3.0, 0.14, 0.01), "Kertas", c)
    DISC("TutupGot", (ox - 3.0, -1.8, 0.012), 0.42, "Besi_Hitam", c, axis="Z")
    for k in range(6):
        B(f"KisiTutupGot{k}", (ox - 3.0, -1.8 - 0.3 + k * 0.12, 0.03), (0.6, 0.03, 0.03), "Baja_Gelap", c)
    # --- gedung bank (utara jalan, menghadap -Y)
    by = 11.0
    fas = B("BankFasad", (ox, by, 7.0), (16, 0.6, 14), "Fasad_Batu", c, uv=0.35)
    cuts = [B("BankPintuCut", (ox, by, 1.6), (2.6, 1.6, 3.2), "Fasad_Batu", c)]
    CUT(fas, cuts)
    B("BankBadan", (ox, by + 6.3, 7.0), (16, 12, 14), "Fasad_Batu", c, uv=0.35)
    B("BankPintu", (ox, by + 0.25, 1.6), (2.6, 0.1, 3.2), "Kayu_Tua", c)
    for sx in (-1, 1):
        B(f"BankDaunPintu{sx}", (ox + sx * 0.64, by - 0.05, 1.5), (1.2, 0.08, 2.9), "Kayu_Tua", c)
        B(f"BankGagang{sx}", (ox + sx * 0.15, by - 0.12, 1.5), (0.05, 0.06, 0.4), "Kuningan", c)
    for k, sx in enumerate((-2.2, -1.5, 1.5, 2.2)):
        CY(f"BankTiang{k}", (ox + sx, by - 0.7, 2.2), 0.24, 4.4, "Plester_Krem", c, segs=16)
        B(f"BankKapital{k}", (ox + sx, by - 0.7, 4.45), (0.6, 0.6, 0.18), "Plester_Krem", c)
    B("BankPortiko", (ox, by - 0.7, 4.7), (5.6, 1.6, 0.4), "Plester_Krem", c)
    Q("PapanBanque", (ox, by - 1.52, 5.4), 4.6, 1.15, "-Y", "Papan_Banque", c)
    B("PapanBanqueBingkai", (ox, by - 1.48, 5.4), (4.8, 0.05, 1.3), "Emas", c)
    for k in range(3):
        B(f"BankTangga{k}", (ox, by - 1.2 - k * 0.35, 0.3 - k * 0.1), (5.0, 0.4, 0.2), "Fasad_Batu", c)
    for sx in (-1, 1):
        for k in range(2):
            x = ox + sx * (4.0 + k * 2.6)
            WIN(f"BankJdlBawah{sx}{k}", x, by - 0.3, 2.2, 1.4, 2.4, c, shutter=None, bars=True)
    for fl in range(2):
        for k in range(5):
            WIN(f"BankJdl{fl}{k}", ox - 6 + k * 3, by - 0.3, 6.6 + fl * 3.6, 1.2, 2.0, c, shutter="Jendela_Biru", balcony=(fl == 0))
    B("BankCornice", (ox, by - 0.45, 13.6), (16.6, 1.0, 0.5), "Plester_Krem", c)
    B("BankCornice2", (ox, by - 0.4, 5.1), (16.4, 0.5, 0.25), "Plester_Krem", c)
    S.add_hip_roof("BankAtap", (ox, by + 6, 13.9), 16.6, 13, 3.0, 0.7, "Atap_Genteng", c)
    FLAG("BankBendera1", ox - 3.3, by - 0.6, 9.4, c)
    FLAG("BankBendera2", ox + 3.3, by - 0.6, 9.4, c)
    # --- gedung tetangga (warna-warni Nice)
    nb = [(-17, "Plester_Oker", 12), (-31, "Plester_Merah", 15), (17, "Plester_Kuning", 13), (31, "Plester_Oker", 11), (-45, "Plester_Kuning", 14), (45, "Plester_Merah", 12)]
    for i, (dx, mat, h) in enumerate(nb):
        x = ox + dx
        B(f"Tetangga{i}", (x, by + 6, h / 2), (13.6, 13, h), mat, c, uv=0.3)
        S.add_hip_roof(f"TetanggaAtap{i}", (x, by + 6, h), 14.2, 13.6, 2.4, 0.6, "Atap_Genteng", c)
        B(f"TetanggaListplang{i}", (x, by - 0.6, h - 0.2), (14, 0.4, 0.3), "Kusen_Putih", c)
        for fl in range(int((h - 3.5) // 3.2)):
            for k in range(4):
                WIN(f"TtgJdl{i}_{fl}{k}", x - 4.5 + k * 3, by - 0.5, 5.0 + fl * 3.2, 1.0, 1.8, c, balcony=(k % 2 == 0 and fl == 0))
        if i == 0:  # kafe di lantai dasar
            Q("PapanCafe", (x, by - 0.56, 3.3), 4.4, 1.0, "-Y", "Papan_Cafe", c)
            for k in range(6):
                B(f"TendaKafe{k}", (x - 3.75 + k * 1.5, by - 1.6, 2.75), (1.5, 2.2, 0.06), "Tenda_Merah" if k % 2 else "Tenda_Putih", c, rot=(0.38, 0, 0))
            for k in range(3):
                TABLE(f"MejaKafe{k}", x - 3 + k * 3, by - 3.2, 0.26, 0.7, 0.7, 0.72, "Kusen_Putih", c, leg="Besi_Hitam")
                for sx in (-1, 1):
                    CHAIR(f"KursiKafe{k}{sx}", x - 3 + k * 3 + sx * 0.7, by - 3.2, 0.26, c, mat="Jendela_Hijau")
                CY(f"CangkirKafe{k}", (x - 3 + k * 3, by - 3.2, 1.06), 0.05, 0.08, "Kertas", c, segs=8)
            B("PintuKafe", (x, by - 0.32, 1.5), (1.6, 0.1, 2.6), "Kaca_Gelap", c)
        else:
            B(f"TokoBawah{i}", (x, by - 0.32, 1.5), (5.0, 0.1, 2.4), "Kaca_Gelap", c)
            B(f"TendaToko{i}", (x, by - 1.0, 2.9), (5.4, 1.5, 0.06), "Tenda_Merah" if i % 2 else "Jendela_Hijau", c, rot=(0.3, 0, 0))
    # --- sisi selatan: gedung rendah + palem
    for i in range(8):
        x = ox - 52 + i * 15
        h = 9 + (i % 3) * 2.5
        B(f"Selatan{i}", (x, -17, h / 2), (13.5, 10, h), ["Plester_Kuning", "Plester_Krem", "Plester_Merah"][i % 3], c, uv=0.3)
        S.add_hip_roof(f"SelatanAtap{i}", (x, -17, h), 14, 10.6, 2.2, 0.6, "Atap_Genteng", c)
        for fl in range(int((h - 2) // 3.2)):
            for k in range(3):
                B(f"SelJdl{i}_{fl}{k}", (x - 4 + k * 4, -11.97, 3.0 + fl * 3.2), (1.0, 0.05, 1.7), "Kaca_Gelap", c)
                B(f"SelDaun{i}_{fl}{k}", (x - 4 + k * 4 - 0.75, -11.95, 3.0 + fl * 3.2), (0.45, 0.06, 1.7), "Jendela_Hijau", c)
    for k in range(9):
        PALM(f"Palem{k}", ox - 40 + k * 10 + (k % 2) * 2, -8.8, c, h=5.5 + (k % 3) * 0.8, seed=k)
    for k in range(10):
        LAMPPOST(f"LampuJalan{k}", ox - 45 + k * 10, 6.7, c)
    # --- mobil 1970-an parkir & lewat
    for i, (x, y, m, s) in enumerate([(-9, -4.6, "Mobil_Merah", 1), (-14.5, -4.6, "Mobil_Krem", 1), (8, 4.6, "Mobil_Biru", -1), (14, 4.6, "Mobil_Hijau", -1), (24, -4.6, "Mobil_Biru", 1), (-26, 4.6, "Mobil_Krem", -1)]):
        CAR(f"Mobil{i}", ox + x, y, 0, m, c, s)
    # bangku, tempat sampah, kios, pot bunga, merpati
    for k in range(3):
        x = ox - 30 + k * 22
        B(f"Bangku{k}", (x, -7.6, 0.75), (1.8, 0.45, 0.06), "Jendela_Hijau", c)
        B(f"BangkuSandar{k}", (x, -7.38, 1.05), (1.8, 0.05, 0.4), "Jendela_Hijau", c)
        for sx in (-1, 1):
            B(f"BangkuKaki{k}{sx}", (x + sx * 0.8, -7.6, 0.5), (0.06, 0.4, 0.5), "Besi_Hitam", c)
        CY(f"Sampah{k}", (x + 2.2, -10.6, 0.7), 0.25, 0.8, "Jendela_Hijau", c, segs=10)
    for k in range(6):
        PLANT(f"PotJalan{k}", ox - 7.5 + k * 3.0 if k < 3 else ox + 1.5 + (k - 3) * 3.0, 7.7, 0.26, c, s=1.2, seed=20 + k)
    for k in range(9):
        BALL(f"Merpati{k}", (ox - 4 + k * 0.9 + RND.uniform(-0.3, 0.3), -6.5 - RND.uniform(0, 1.2), 0.38), 0.13, "Merpati", c, scale=(1.4, 0.8, 0.9), sub=1)
    B("Kios", (ox - 22, -8.2, 1.3), (2.0, 1.6, 2.2), "Jendela_Hijau", c)
    S.add_hip_roof("KiosAtap", (ox - 22, -8.2, 2.4), 2.4, 2.0, 0.8, 0.0, "Jendela_Hijau", c)
    for k in range(4):
        B(f"Koran{k}", (ox - 22.0 + (k - 1.5) * 0.4, -9.05, 1.2), (0.32, 0.03, 0.44), "Kertas", c)
    for k in range(10):
        B(f"KertasJalan{k}", (ox + RND.uniform(-12, 12), RND.uniform(-5.5, 5.5), 0.012), (0.22, 0.3, 0.01), "Kertas", c, rot=(0, 0, RND.uniform(0, 3)))
    # latar jauh: bukit + laut
    for i in range(7):
        BALL(f"BukitJauh{i}", (ox - 180 + i * 60, 150, -6), 50, "Bukit", "Langit", scale=(1.6, 1.0, 0.6), sub=2)
    B("LautJauh", (ox, -140, -0.2), (400, 120, 0.2), "Laut", "Langit")


# ====================================================================== L2 · studio foto
def build_L2(ox):
    c = "L2_Studio"
    W, D, H = 7.0, 6.0, 3.3
    B("Lantai", (ox, 0, -0.05), (W, D, 0.1), "Floor_Wood", c, uv=0.6)
    B("DindingBlk", (ox, D / 2, H / 2), (W, 0.2, H), "Wallpaper", c, uv=0.6)
    kiri = B("DindingKiri", (ox - W / 2, 0, H / 2), (0.2, D, H), "Wallpaper", c, uv=0.6)
    CUT(kiri, [B("JdlCut", (ox - W / 2, 0.2, 1.75), (1.0, 1.8, 1.7), "Wallpaper", c)])
    B("DindingKanan", (ox + W / 2, 0, H / 2), (0.2, D, H), "Wallpaper", c, uv=0.6)
    for nm, (x, y, sx, sy) in {"B": (0, D / 2 - 0.12, W, 0.06), "Ki": (-W / 2 + 0.12, 0, 0.06, D), "Ka": (W / 2 - 0.12, 0, 0.06, D)}.items():
        B(f"Lambris{nm}", (ox + x, y, 0.55), (sx, sy, 1.1), "Wood_Wainscot", c)
        B(f"ListLambris{nm}", (ox + x, y, 1.12), (sx, sy + 0.04, 0.06), "Wood_Trim", c)
        B(f"Plint{nm}", (ox + x, y, H - 0.1), (sx, sy + 0.06, 0.2), "Kusen_Putih", c)
    # jendela kiri + tirai + pot di ambang
    for k, dy in enumerate((-0.7, 1.1)):
        B(f"KusenJdl{k}", (ox - W / 2 + 0.05, 0.2 + dy * 0.5, 1.75), (0.14, 0.08, 1.7), "Kusen_Putih", c)
    B("KusenJdlAtas", (ox - W / 2 + 0.05, 0.2, 2.62), (0.16, 1.9, 0.1), "Kusen_Putih", c)
    B("AmbangJdl", (ox - W / 2 + 0.15, 0.2, 0.88), (0.36, 2.0, 0.08), "Kusen_Putih", c)
    B("PalangJdl", (ox - W / 2 + 0.05, 0.2, 1.75), (0.06, 1.8, 0.05), "Kusen_Putih", c)
    for sy in (-1, 1):
        B(f"Tirai{sy}", (ox - W / 2 + 0.22, 0.2 + sy * 1.1, 1.85), (0.08, 0.5, 2.3), "Kain_Merah", c)
    B("RelTirai", (ox - W / 2 + 0.25, 0.2, 3.0), (0.05, 2.9, 0.05), "Kuningan", c)
    PLANT("PotJendela", ox - W / 2 + 0.2, 0.7, 0.92, c, s=0.6, seed=4)
    # meja kerja + peta got + lampu meja + kursi
    TABLE("MejaKerja", ox + 0.3, 2.1, 0, 2.4, 1.1, 0.78, "Wood_Desk", c)
    B("LaciMeja", (ox + 0.3, 1.55, 0.6), (2.2, 0.04, 0.3), "Wood_Desk_Dark", c)
    Q("PetaMeja", (ox + 0.1, 2.05, 0.83), 1.5, 0.9, "Z", "Peta_Got", c)
    for k in range(5):
        B(f"KertasMeja{k}", (ox + 0.9 + k * 0.08, 2.3 - k * 0.07, 0.825 + k * 0.004), (0.3, 0.42, 0.004), "Kertas", c, rot=(0, 0, 0.3 * k))
    CY("LampuMejaKaki", (ox + 1.2, 2.4, 0.84), 0.12, 0.04, "Besi_Hitam", c, segs=12)
    B("LampuMejaLengan", (ox + 1.2, 2.3, 1.1), (0.03, 0.03, 0.55), "Besi_Hitam", c, rot=(0.4, 0, 0))
    CY("LampuMejaKap", (ox + 1.2, 2.05, 1.32), 0.17, 0.2, "Jendela_Hijau", c, rot=(0.6, 0, 0), segs=14, r2=0.07)
    BALL("LampuMejaBohlam", (ox + 1.2, 2.0, 1.25), 0.06, "Lampu_Kuning", c, sub=1)
    CY("Asbak", (ox - 0.6, 2.4, 0.84), 0.08, 0.04, "Kaca_Gelap", c, segs=10)
    CY("CangkirKopi", (ox - 0.4, 1.9, 0.86), 0.05, 0.1, "Kusen_Putih", c, segs=10)
    CHAIR("KursiKerja", ox + 0.2, 1.2, 0, c, face=-1)
    # kamera di tripod + payung lampu studio
    for k in range(3):
        a = k * 2 * PI / 3
        B(f"KakiTripod{k}", (ox + 2.3 + math.cos(a) * 0.25, -0.6 + math.sin(a) * 0.25, 0.7), (0.03, 0.03, 1.45), "Besi_Hitam", c, rot=(math.sin(a) * 0.3, -math.cos(a) * 0.3, 0))
    B("Kamera", (ox + 2.3, -0.6, 1.5), (0.36, 0.24, 0.24), "Plastik_Hitam", c)
    CY("Lensa", (ox + 2.3, -0.75, 1.5), 0.09, 0.2, "Krom", c, rot=(PI / 2, 0, 0), segs=14)
    CY("TiangPayung", (ox + 2.6, 1.8, 1.0), 0.03, 2.0, "Besi_Hitam", c, segs=8)
    CY("Payung", (ox + 2.6, 1.6, 2.05), 0.65, 0.35, "Tenda_Putih", c, rot=(1.2, 0, 0.5), segs=14, r2=0.04)
    # tali jemuran foto
    for k in range(2):
        B(f"TaliFoto{k}", (ox, -0.8 + k * 0.9, 2.55), (5.0, 0.01, 0.01), "Selang", c)
        Q(f"DeretFoto{k}", (ox - 0.3 + k * 0.4, -0.8 + k * 0.9, 2.38), 2.4, 0.6, "-Y", "Deretan_Foto", c)
    # rak + kotak film, lemari, poster, jam, lampu gantung
    B("Rak", (ox + W / 2 - 0.3, 1.5, 1.2), (0.4, 1.6, 2.4), "Wood_Desk_Dark", c)
    for s in range(4):
        B(f"RakPapan{s}", (ox + W / 2 - 0.32, 1.5, 0.3 + s * 0.6), (0.42, 1.5, 0.04), "Wood_Desk", c)
        for k in range(4):
            B(f"KotakFilm{s}{k}", (ox + W / 2 - 0.35, 0.95 + k * 0.36, 0.42 + s * 0.6), (0.3, 0.3, 0.2 + 0.05 * (k % 2)), ["Tabung_Merah", "Mobil_Krem", "Jendela_Hijau", "Plastik_Hitam"][(k + s) % 4], c)
    Q("PosterPhoto", (ox - 1.6, D / 2 - 0.12, 2.0), 1.6, 0.4, "-Y", "Papan_Photo", c)
    Q("PetaDinding", (ox + 0.4, D / 2 - 0.12, 2.05), 1.5, 1.1, "-Y", "Peta_Got", c)
    B("BingkaiPetaDinding", (ox + 0.4, D / 2 - 0.1, 2.05), (1.62, 0.03, 1.22), "Kayu_Tua", c)
    for k in range(4):
        B(f"PinPeta{k}", (ox + 0.4 + (k - 1.5) * 0.4, D / 2 - 0.14, 2.3 - (k % 2) * 0.4), (0.04, 0.04, 0.04), "Lampu_Merah", c)
    DISC("Jam", (ox - 1.6, D / 2 - 0.13, 2.65), 0.22, "Clock_Face", c)
    B("Lemari", (ox - 2.6, 2.4, 1.0), (1.2, 0.7, 2.0), "Wood_Wainscot", c)
    for k in range(3):
        B(f"LemariLaci{k}", (ox - 2.6, 2.04, 0.4 + k * 0.55), (1.1, 0.03, 0.45), "Wood_Wainscot_Panel", c)
    B("Karpet", (ox + 0.2, 0.6, 0.005), (3.0, 2.2, 0.01), "Kain_Merah", c)
    CY("KabelLampu", (ox + 0.2, 0.8, 2.95), 0.01, 0.7, "Selang", c, segs=6)
    CY("KapGantung", (ox + 0.2, 0.8, 2.5), 0.32, 0.25, "Jendela_Hijau", c, segs=14, r2=0.08)
    BALL("BohlamGantung", (ox + 0.2, 0.8, 2.38), 0.08, "Lampu_Kuning", c, sub=1)
    PLANT("TanamanSudut", ox - 2.9, -1.5, 0, c, s=1.3, seed=8)
    B("Plafon", (ox, 0.3, H + 0.1), (W, D + 0.6, 0.2), "Plafon_Studio", c)
    CY("GantunganTopi", (ox - 3.0, 0.9 + 0.2, 0.9), 0.03, 1.8, "Kayu_Tua", c, segs=8)
    BALL("Topi", (ox - 3.0, 1.1, 1.8), 0.16, "Kulit", c, scale=(1.2, 1.2, 0.6), sub=1)


# ====================================================================== L3 · got bawah kota
def build_L3(ox):
    c = "L3_Got"
    L, R0, zc = 46.0, 2.05, 0.8
    y0 = 17.0
    tube = CY("TabungGot", (ox, y0, zc), R0 + 0.3, L, "Bata_Got", c, rot=(PI / 2, 0, 0), segs=36)
    inner = CY("TabungGotIsi", (ox, y0, zc), R0, L + 0.6, "Bata_Got", c, rot=(PI / 2, 0, 0), segs=36)
    shaft = CY("PotongLubang", (ox + 0.9, 0, 3.0), 0.45, 3.0, "Bata_Got", c, segs=20)
    cabang = CY("PotongCabang", (ox - 2.2, 16, 0.9), 1.3, 3.0, "Bata_Got", c, rot=(0, PI / 2, 0), segs=24)
    CUT(tube, [inner, shaft, cabang])
    B("TutupUjung", (ox, y0 + L / 2 + 0.2, zc), (5, 0.3, 5), "Bata_Got", c)
    # saluran air + jalan setapak
    B("Air", (ox, y0, -0.42), (1.6, L, 0.06), "Air_Got", c)
    B("DasarSaluran", (ox, y0, -0.9), (1.7, L, 0.9), "Bata_Got", c)
    for sx in (-1, 1):
        B(f"Setapak{sx}", (ox + sx * 1.35, y0, -0.6), (1.1, L, 1.2), "Beton", c, uv=0.6)
        B(f"TepiSetapak{sx}", (ox + sx * 0.82, y0, -0.02), (0.06, L, 0.06), "Lumut", c)
    # sumur lubang naik ke jalan + tangga + cahaya
    sh = RING("SumurLubang", (ox + 0.9, 0, 4.6), 0.6, 0.45, 3.6, "Bata_Got", c, rot=(0, 0, 0), segs=20)
    for k in range(10):
        B(f"AnakTangga{k}", (ox + 0.9 + 0.36, 0, 0.3 + k * 0.4), (0.06, 0.44, 0.04), "Karat", c)
    for sy in (-1, 1):
        B(f"TiangTangga{sy}", (ox + 0.9 + 0.4, sy * 0.22, 2.0), (0.05, 0.05, 4.2), "Karat", c)
    DISC("CahayaLubang", (ox + 0.9, 0, 6.35), 0.45, "Cahaya_Lubang", c, axis="Z")
    # lorong cabang (kiri)
    cb = CY("TabungCabang", (ox - 4.2, 16, 0.9), 1.6, 4.4, "Bata_Got", c, rot=(0, PI / 2, 0), segs=24)
    CUT(cb, [CY("TabungCabangIsi", (ox - 4.2, 16, 0.9), 1.3, 5.0, "Bata_Got", c, rot=(0, PI / 2, 0), segs=24)])
    B("TutupCabang", (ox - 6.3, 16, 0.9), (0.2, 3.2, 3.2), "Tanah_Gelap", c)
    B("LantaiCabang", (ox - 4.2, 16, -0.15), (4.4, 1.6, 0.2), "Beton", c)
    # pipa berkarat di dinding, kabel + bohlam, lumut, rembesan
    for sx, z, r in ((1, 2.0, 0.14), (1, 1.6, 0.09), (-1, 2.2, 0.11)):
        CY(f"Pipa{sx}{z}", (ox + sx * 1.62, y0, z), r, L, "Karat", c, rot=(PI / 2, 0, 0), segs=10)
        for k in range(8):
            B(f"KlemPipa{sx}{z}{k}", (ox + sx * 1.62, y0 - L / 2 + 3 + k * 6, z), (r * 2.6, 0.08, r * 2.6), "Besi_Hitam", c)
    B("Kabel", (ox - 1.45, y0, 2.62), (0.03, L, 0.03), "Selang", c)
    for k in range(8):
        y = -4 + k * 6
        BALL(f"Bohlam{k}", (ox - 1.4, y, 2.5), 0.08, "Lampu_Kuning", c, sub=1)
        B(f"KapBohlam{k}", (ox - 1.4, y, 2.6), (0.18, 0.18, 0.05), "Besi_Hitam", c)
    for k in range(14):
        sx = 1 if k % 2 else -1
        BALL(f"Lumut{k}", (ox + sx * 1.9, -5 + k * 3.2 + RND.uniform(0, 1), 0.1 + RND.uniform(0, 1.2)), RND.uniform(0.3, 0.6), "Lumut", c, scale=(0.3, 1.4, 1.0), jit=0.3, seed=k, sub=1)
    # troli tambang + peti + karung + ember + papan peringatan
    B("TroliBak", (ox + 1.35, 7.5, 0.55), (0.8, 1.4, 0.55), "Karat", c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            CY(f"TroliRoda{sx}{sy}", (ox + 1.35 + sx * 0.42, 7.5 + sy * 0.5, 0.17), 0.15, 0.06, "Besi_Hitam", c, rot=(0, PI / 2, 0), segs=12)
    B("TroliPegangan", (ox + 1.35, 6.7, 0.95), (0.6, 0.04, 0.04), "Besi_Hitam", c)
    for k in range(3):
        BALL(f"TanahTroli{k}", (ox + 1.35 + (k - 1) * 0.2, 7.5, 0.85), 0.25, "Tanah", c, jit=0.3, seed=k, sub=1)
    for k in range(3):
        B(f"Peti{k}", (ox - 1.45, 10 + k * 0.75, 0.25 + (k == 2) * 0.5), (0.7, 0.7, 0.5), "Kayu_Penyangga", c, rot=(0, 0, 0.1 * k))
    BALL("Karung1", (ox - 1.4, 12.5, 0.35), 0.38, "Karung", c, scale=(1, 0.9, 0.8), jit=0.12, seed=3, sub=2)
    CY("Ember", (ox + 1.5, 4.0, 0.2), 0.18, 0.35, "Baja", c, segs=12, r2=0.22)
    Q("PapanDanger", (ox + 1.88, 3.0, 1.8), 0.8, 0.22, "-X", "Papan_Danger", c)
    for k in range(4):
        BALL(f"Tikus{k}", (ox + (1 if k % 2 else -1) * 1.05, 3 + k * 5, 0.07), 0.08, "Tikus", c, scale=(1.0, 1.8, 0.8), sub=1)
    for k in range(6):
        B(f"Sampah{k}", (ox + RND.uniform(-0.5, 0.5), 2 + k * 5, -0.38), (0.15, 0.22, 0.02), "Kertas", c, rot=(0, 0, RND.uniform(0, 3)))
    # teralis besi di ujung jauh (bingkai depan)
    for k in range(9):
        CY(f"Teralis{k}", (ox - 1.6 + k * 0.4, 36, 0.9), 0.03, 4.0, "Karat", c, segs=6)
    B("TeralisAtas", (ox, 36, 2.6), (3.4, 0.06, 0.08), "Karat", c)


# ====================================================================== L4 · penampang (cutaway)
def build_L4(ox):
    c = "L4_Penampang"
    X0, X1, Yf, Yb = -16, 16, -2.0, 2.4
    W, D, yc = X1 - X0, Yb - Yf, (Yf + Yb) / 2
    layers = [("Aspal", 0.0, -0.3), ("Kerikil", -0.3, -1.3), ("Tanah", -1.3, -4.2), ("Lempung", -4.2, -7.2), ("Batu_Dasar", -7.2, -11.0)]
    # rongga (cx, cz, sx, sz, jenis) dipotong dari semua lapisan; y dari depan sampai belakang-0.5
    cav = [
        ("cyl", (-8.0, -4.6), 1.55),                  # got
        ("box", (-2.6, -4.85), (8.6, 1.15)),          # terowongan
        ("box", (7.4, -4.0), (7.4, 4.6)),             # ruang brankas (termasuk dinding)
        ("cyl_v", (-8.0, -1.6), 0.5),                 # sumur lubang
    ]
    for nm, z0, z1 in layers:
        o = B(f"Lapis{nm}", (ox, yc, (z0 + z1) / 2), (W, D, z0 - z1), nm, c, uv=0.45)
        cutters = []
        for kind, (cx, cz), s in cav:
            if kind == "cyl":
                cutters.append(CY(f"cut{nm}g", (ox + cx, yc - 0.6, cz), s, D + 0.2, nm, c, rot=(PI / 2, 0, 0), segs=36))
            elif kind == "cyl_v":
                cutters.append(CY(f"cut{nm}s", (ox + cx, Yf + 0.7, cz), s, 3.4, nm, c, segs=20))
            else:
                cutters.append(B(f"cut{nm}b{cx}", (ox + cx, yc - 0.6, cz), (s[0], D + 0.2 - 0.0, s[1]), nm, c))
        CUT(o, cutters)
    # dinding belakang rongga (tanah gelap) agar tidak tembus
    B("BelakangTerowongan", (ox - 2.6, Yb - 0.75, -4.85), (8.6, 0.1, 1.2), "Tanah_Gelap", c)
    # --- got: cincin bata + air + bata belakang
    RING("CincinGot", (ox - 8.0, yc - 0.6, -4.6), 1.55, 1.3, D - 1.2, "Bata_Got", c, segs=36)
    DISC("BelakangGot", (ox - 8.0, Yb - 0.72, -4.6), 1.35, "Bata_Got", c)
    B("AirGot", (ox - 8.0, yc - 0.6, -5.55), (2.3, D - 1.2, 0.35), "Air_Got", c)
    RING("CincinSumur", (ox - 8.0, Yf + 0.7, -1.6), 0.5, 0.42, 3.2, "Bata_Got", c, rot=(0, 0, 0), segs=20)
    for k in range(7):
        B(f"TanggaSumur{k}", (ox - 8.0 + 0.34, Yf + 0.7, -2.9 + k * 0.4), (0.05, 0.4, 0.04), "Karat", c)
    # --- terowongan: penyangga kayu, lampu, ember, gundukan tanah
    for k in range(7):
        x = ox - 6.4 + k * 1.25
        for sy in (Yf + 0.25, Yb - 0.85):
            B(f"Tiang{k}{sy:.1f}", (x, sy, -4.85), (0.12, 0.12, 1.1), "Kayu_Penyangga", c)
        B(f"Balok{k}", (x, yc - 0.3, -4.32), (0.14, D - 1.0, 0.12), "Kayu_Penyangga", c)
        if k % 2 == 0:
            BALL(f"LampuTerowongan{k}", (x + 0.6, yc - 0.3, -4.42), 0.06, "Lampu_Kuning", c, sub=1)
    B("KabelTerowongan", (ox - 2.6, yc - 0.3, -4.37), (8.2, 0.02, 0.02), "Selang", c)
    for k in range(4):
        BALL(f"GundukTanah{k}", (ox - 5.5 + k * 2.4, yc + 0.6, -5.35), 0.3, "Tanah", c, scale=(1.4, 1, 0.5), jit=0.3, seed=k, sub=1)
    CY("EmberTerowongan", (ox - 1.0, yc + 0.2, -5.25), 0.13, 0.26, "Baja", c, segs=10, r2=0.16)
    # --- ruang brankas di penampang: dinding beton tebal + laci + pintu + lubang
    vx, vz = ox + 7.4, -4.0
    shell = B("DindingBrankas", (vx, yc - 0.3, vz), (7.4, D - 0.6, 4.6), "Beton", c, uv=0.5)
    CUT(shell, [B("RonggaBrankas", (vx, yc - 0.7, vz + 0.1), (6.2, D, 3.6), "Beton", c),
                B("LubangTembus", (ox + 3.6, yc - 0.6, -4.9), (1.2, D - 0.6, 0.9), "Beton", c)])
    Q("LaciPenampang", (vx - 0.6, Yb - 0.84, vz + 0.4), 4.6, 2.6, "-Y", "Laci_Deposit", c)
    B("LantaiBrankasP", (vx, yc - 0.6, vz - 1.68), (6.1, D - 1.2, 0.04), "Lantai_Brankas_Kecil", c, uv=1 / 5.0)
    DISC("PintuBrankasP", (vx + 2.4, Yb - 0.86, vz + 0.2), 1.05, "Muka_Pintu", c)
    RING("RangkaPintuP", (vx + 2.4, Yb - 0.9, vz + 0.2), 1.2, 1.05, 0.12, "Baja", c)
    RUBBLE("PuingP", ox + 4.2, yc - 0.4, vz - 1.66, 12, c, spread=0.5, size=0.1)
    for k in range(5):
        B(f"LaciTerbuka{k}", (vx - 1.6 + k * 0.7, yc - 0.2, vz - 1.55), (0.32, 0.42, 0.18), "Baja", c, rot=(0, 0, 0.3 * k))
    BALL("KarungP", (vx - 0.4, yc - 0.5, vz - 1.35), 0.32, "Karung", c, scale=(1, 0.9, 0.9), jit=0.1, seed=2, sub=2)
    # --- di atas tanah: jalan, trotoar, fasad bank, gedung, mobil, palem, lampu
    for k in range(8):
        B(f"MarkaP{k}", (ox - 15 + k * 4, yc - 0.6, 0.005), (1.6, 0.12, 0.01), "Kertas", c)
    B("TrotoarP", (ox + 9.0, yc, 0.12), (14, D, 0.24), "Plester_Krem", c, uv=0.5)
    B("TrotoarKiriP", (ox - 13.5, yc, 0.12), (5, D, 0.24), "Plester_Krem", c, uv=0.5)
    DISC("TutupGotP", (ox - 8.0, Yf + 0.7, 0.012), 0.5, "Besi_Hitam", c, axis="Z")
    bank = B("BankP", (ox + 8.5, Yb + 6, 7.0), (11, 12, 14), "Fasad_Batu", c, uv=0.35)
    Q("PapanBanqueP", (ox + 8.5, Yb - 0.02, 4.8), 3.6, 0.9, "-Y", "Papan_Banque", c)
    for k in range(3):
        WIN(f"BankPJdl{k}", ox + 5.5 + k * 3, Yb - 0.01, 2.1, 1.3, 2.3, c, shutter=None, bars=True)
        WIN(f"BankPJdlAtas{k}", ox + 5.5 + k * 3, Yb - 0.01, 7.4, 1.2, 2.0, c, shutter="Jendela_Biru", balcony=True)
    S.add_hip_roof("BankPAtap", (ox + 8.5, Yb + 6, 14.0), 11.6, 12.6, 2.6, 0.7, "Atap_Genteng", c)
    FLAG("BankPBendera", ox + 8.5, Yb - 0.2, 9.8, c)
    for i, (x, mat, h) in enumerate([(-4.5, "Plester_Oker", 11), (-13.0, "Plester_Merah", 9), (18.5, "Plester_Kuning", 12)]):
        B(f"GedungP{i}", (ox + x, Yb + 7, h / 2), (7.6, 13, h), mat, c, uv=0.3)
        S.add_hip_roof(f"GedungPAtap{i}", (ox + x, Yb + 7, h), 8.2, 13.6, 2.2, 0.6, "Atap_Genteng", c)
        for fl in range(int((h - 2) // 3)):
            for k in range(2):
                WIN(f"GedPJdl{i}{fl}{k}", ox + x - 1.6 + k * 3.2, Yb + 0.49, 2.4 + fl * 3, 1.0, 1.8, c, balcony=(fl == 1))
    CAR("MobilP1", ox - 3.0, yc - 0.6, 0, "Mobil_Merah", c, 1)
    CAR("MobilP2", ox - 11.5, yc + 0.3, 0, "Mobil_Krem", c, -1)
    for k, x in enumerate((-13.5, 3.2, 14.5)):
        PALM(f"PalemP{k}", ox + x, yc + 1.0, c, h=5.2 + k * 0.4, seed=40 + k)
    for k, x in enumerate((-10.5, 2.6)):
        LAMPPOST(f"LampuP{k}", ox + x, Yb - 0.6, c)
    for k in range(4):
        BALL(f"MerpatiP{k}", (ox + 4 + k * 0.6, yc - 0.6, 0.36), 0.12, "Merpati", c, scale=(1.4, 0.8, 0.9), sub=1)
    # detail dalam tanah: pipa air & kabel (penampang bundar), batu besar, akar, tulang/botol (gag)
    for k, (x, z, r, m) in enumerate([(-12.5, -1.9, 0.22, "Karat"), (-3.5, -1.7, 0.16, "Plastik_Hitam"), (0.5, -2.1, 0.3, "Beton"), (12.5, -2.0, 0.2, "Karat")]):
        RING(f"PipaTanah{k}", (ox + x, yc, z), r, r * 0.7, D, m, c, segs=16)
    for k in range(9):
        BALL(f"BatuBesar{k}", (ox - 14 + k * 3.5, Yf + 0.05, -8.0 - (k % 3) * 0.9), RND.uniform(0.4, 0.8), "Batu_Dasar", c, scale=(1.3, 0.3, 0.9), jit=0.25, seed=k, sub=1)
    CY("BotolTanah", (ox - 11.0, Yf + 0.03, -3.0), 0.08, 0.36, "Tabung_Hijau", c, rot=(0, 1.2, 0), segs=8)


# ====================================================================== L5 · ruang brankas
def build_L5(ox):
    c = "L5_Brankas"
    W, D, H = 10.0, 9.0, 4.4
    yb = 4.5
    slab = B("LantaiBeton", (ox, 0, -0.25), (W + 1, D + 1, 0.5), "Beton", c, uv=0.5)
    lantai = B("LantaiSinar", (ox, 0.6, 0.01), (9.0, 9.0, 0.04), "Lantai_Brankas", c, uv=1 / 9.0)
    hx, hy = ox - 1.7, -1.4
    CUT(slab, [CY("LubangA", (hx, hy, -0.2), 0.62, 1.2, "Beton", c, segs=24)])
    CUT(lantai, [CY("LubangB", (hx, hy, 0), 0.62, 0.5, "Beton", c, segs=24)])
    RING("SumurBrankas", (hx, hy, -1.3), 0.7, 0.6, 2.2, "Tanah", c, rot=(0, 0, 0), segs=24)
    DISC("DasarSumur", (hx, hy, -2.3), 0.62, "Tanah_Gelap", c, axis="Z")
    RUBBLE("Puing", hx, hy, 0.02, 22, c, spread=1.1, size=0.13)
    CY("BongkahLantai", (hx - 0.9, hy + 0.75, 0.18), 0.6, 0.2, "Beton", c, rot=(0.25, 0.15, 0), segs=20)
    # dinding: belakang (pintu brankas), kiri/kanan (laci), depan rendah
    back = B("DindingBlk", (ox, yb, H / 2), (W, 0.6, H), "Beton", c, uv=0.5)
    CUT(back, [CY("LubangPintu", (ox, yb, 2.05), 1.95, 1.0, "Beton", c, rot=(PI / 2, 0, 0), segs=48)])
    for sx in (-1, 1):
        B(f"Dinding{sx}", (ox + sx * W / 2, 0, H / 2), (0.4, D, H), "Beton", c, uv=0.5)
        B(f"PanelLaci{sx}", (ox + sx * (W / 2 - 0.22), 0.3, 2.0), (0.05, 7.6, 3.2), "Laci_Deposit", c, uv=1 / 1.8)
        B(f"ListLaciAtas{sx}", (ox + sx * (W / 2 - 0.25), 0.3, 3.66), (0.12, 7.7, 0.12), "Baja", c)
        B(f"ListLaciBawah{sx}", (ox + sx * (W / 2 - 0.25), 0.3, 0.36), (0.12, 7.7, 0.12), "Baja", c)
        for k in range(2):
            B(f"PanelLaciB{sx}{k}", (ox + sx * (2.85 - k * 0.0) + (-sx) * k * 1.7 * 0, yb - 0.32, 2.0), (1.9 - k * 0.0, 0.05, 3.2), "Laci_Deposit", c, uv=1 / 1.8) if k == 0 else None
    B("DindingDepan", (ox, -D / 2, 0.6), (W, 0.4, 1.2), "Beton", c, uv=0.5)
    for sx in (-1, 1):
        B(f"Kolom{sx}", (ox + sx * (W / 2 - 0.35), yb - 0.35, H / 2), (0.5, 0.5, H), "Beton", c)
    # pintu brankas bundar raksasa
    RING("RangkaPintu", (ox, yb - 0.32, 2.05), 2.15, 1.85, 0.4, "Baja", c, segs=56)
    for k in range(20):
        a = 2 * PI * k / 20
        CY(f"BautRangka{k}", (ox + math.cos(a) * 2.0, yb - 0.55, 2.05 + math.sin(a) * 2.0), 0.06, 0.06, "Baja_Gelap", c, rot=(PI / 2, 0, 0), segs=8)
    CY("DaunPintu", (ox, yb - 0.3, 2.05), 1.84, 0.4, "Kuningan", c, rot=(PI / 2, 0, 0), segs=56)
    DISC("MukaPintu", (ox, yb - 0.51, 2.05), 1.82, "Muka_Pintu", c, segs=56)
    CY("PorosRoda", (ox, yb - 0.75, 2.05), 0.2, 0.5, "Emas", c, rot=(PI / 2, 0, 0), segs=20)
    for k in range(3):
        B(f"JariRoda{k}", (ox, yb - 0.95, 2.05), (1.6, 0.08, 0.08), "Emas", c, rot=(0, k * PI / 3, 0))
        for sgn in (-1, 1):
            a = k * PI / 3
            BALL(f"UjungRoda{k}{sgn}", (ox + sgn * math.cos(a) * 0.82, yb - 0.95, 2.05 - sgn * math.sin(a) * 0.82), 0.09, "Emas", c, sub=1)
    RING("LingkarRoda", (ox, yb - 0.95, 2.05), 0.72, 0.64, 0.06, "Emas", c, segs=40)
    for k in range(2):
        CY(f"Engsel{k}", (ox + 2.05, yb - 0.55, 1.0 + k * 2.1), 0.16, 0.6, "Baja", c, segs=14)
    B("BatangKunci", (ox - 2.4, yb - 0.4, 2.05), (0.5, 0.2, 0.18), "Baja", c)
    Q("PapanCoffres", (ox, yb - 0.32, 4.15), 2.6, 0.4, "-Y", "Papan_Coffres", c)
    # tanda las di sambungan pintu (percikan hitam)
    for k in range(10):
        a = PI * 0.8 + k * 0.15
        BALL(f"BekasLas{k}", (ox + math.cos(a) * 1.86, yb - 0.53, 2.05 + math.sin(a) * 1.86), 0.05, "Besi_Hitam", c, sub=1)
    # laci yang dibuka: menonjol dari dinding + berserakan
    for k in range(10):
        sx = -1 if k < 6 else 1
        y = -2.5 + (k % 6) * 1.0
        z = 0.8 + (k * 7 % 5) * 0.55
        B(f"LaciMenonjol{k}", (ox + sx * (W / 2 - 0.45), y, z), (0.5, 0.28, 0.2), "Baja", c)
    for k in range(9):
        x, y = ox + RND.uniform(-3.5, 3.5), RND.uniform(-2.8, 2.4)
        if abs(x - hx) < 1.2 and abs(y - hy) < 1.2:
            continue
        B(f"LaciLantai{k}", (x, y, 0.13), (0.3, 0.5, 0.2), "Baja", c, rot=(0, 0, RND.uniform(0, 3)))
    for k in range(26):
        x, y = ox + RND.uniform(-4, 4), RND.uniform(-3.5, 3)
        B(f"KertasLantai{k}", (x, y, 0.035), (0.22, 0.3, 0.005), "Kertas", c, rot=(0, 0, RND.uniform(0, 3)))
    for k in range(14):
        BALL(f"Perhiasan{k}", (ox + RND.uniform(-2, 2.5), RND.uniform(-2, 2), 0.08), 0.05, ["Emas", "Mutiara", "Permata_Merah"][k % 3], c, sub=1)
    for k in range(6):
        B(f"BundelUang{k}", (ox + 1.2 + k * 0.25, -0.6 + (k % 2) * 0.3, 0.1), (0.2, 0.1, 0.06), "Uang", c, rot=(0, 0, 0.4 * k))
    # karung jarahan
    for k in range(4):
        BALL(f"Karung{k}", (ox + 2.6 + (k % 2) * 0.7, -2.4 + (k // 2) * 0.7, 0.35), 0.36, "Karung", c, scale=(1, 0.9, 0.95), jit=0.12, seed=k, sub=2)
        CY(f"IkatKarung{k}", (ox + 2.6 + (k % 2) * 0.7, -2.4 + (k // 2) * 0.7, 0.7), 0.08, 0.12, "Karung", c, segs=8)
    # meja lipat + lampu kerja + termos + peta
    TABLE("MejaLipat", ox - 3.2, 1.6, 0, 1.6, 0.8, 0.76, "Kayu_Penyangga", c, leg="Baja_Gelap")
    Q("PetaMejaB", (ox - 3.3, 1.6, 0.8), 0.8, 0.55, "Z", "Peta_Got", c)
    CY("Termos", (ox - 2.7, 1.7, 0.95), 0.07, 0.34, "Tabung_Merah", c, segs=10)
    CY("RotiBaguette", (ox - 3.7, 1.45, 0.84), 0.05, 0.6, "Karung", c, rot=(0, PI / 2, 0.3), segs=8)
    # lampu sorot di tripod mengarah ke pintu
    for k in range(3):
        a = k * 2 * PI / 3
        B(f"TripodSorot{k}", (ox + 2.6 + math.cos(a) * 0.3, 0.4 + math.sin(a) * 0.3, 0.75), (0.04, 0.04, 1.5), "Baja_Gelap", c, rot=(math.sin(a) * 0.35, -math.cos(a) * 0.35, 0))
    CY("LampuSorot", (ox + 2.6, 0.5, 1.6), 0.25, 0.4, "Baja_Gelap", c, rot=(1.3, 0, 0.5), segs=16)
    DISC("KacaSorot", (ox + 2.5, 0.72, 1.66), 0.22, "Lampu_Putih", c)
    # tabung las + selang + obor
    for k, m in enumerate(("Tabung_Merah", "Tabung_Hijau")):
        CY(f"TabungLas{k}", (ox + 3.8 + k * 0.45, 3.4, 0.7), 0.18, 1.4, m, c, segs=14)
        BALL(f"KepalaTabung{k}", (ox + 3.8 + k * 0.45, 3.4, 1.42), 0.1, "Kuningan", c, sub=1)
    for k in range(6):
        B(f"Selang{k}", (ox + 3.6 - k * 0.35, 3.0 - k * 0.12, 0.04), (0.38, 0.04, 0.04), "Selang", c, rot=(0, 0, 0.3 + 0.1 * k))
    # bor, linggis, ember, kabel
    B("BorBadan", (ox - 0.8, -2.8, 0.15), (0.5, 0.18, 0.22), "Tabung_Hijau", c)
    CY("BorMata", (ox - 0.4, -2.8, 0.15), 0.03, 0.45, "Krom", c, rot=(0, PI / 2, 0), segs=8)
    B("Linggis", (ox + 0.6, -3.1, 0.04), (1.1, 0.04, 0.04), "Tabung_Merah", c, rot=(0, 0, 0.6))
    CY("EmberB", (ox - 2.6, -2.4, 0.2), 0.2, 0.38, "Baja", c, segs=12, r2=0.24)
    B("KabelLantai", (ox - 0.2, -0.9, 0.03), (6.0, 0.03, 0.03), "Selang", c, rot=(0, 0, 0.35))
    # pipa di langit-langit + lampu gantung sangkar + bel alarm + jam
    for k in range(2):
        CY(f"PipaAtas{k}", (ox, yb - 0.6 - k * 0.3, 4.1 - k * 0.15), 0.08, W, "Baja_Gelap", c, rot=(0, PI / 2, 0), segs=10)
    for k, x in enumerate((-2.5, 2.5)):
        CY(f"TaliLampu{k}", (ox + x, 0.5, 3.9), 0.015, 1.0, "Selang", c, segs=6)
        CY(f"KapLampu{k}", (ox + x, 0.5, 3.4), 0.3, 0.2, "Baja_Gelap", c, segs=14, r2=0.06)
        BALL(f"BohlamB{k}", (ox + x, 0.5, 3.3), 0.08, "Lampu_Kuning", c, sub=1)
    CY("BelAlarm", (ox - 4.6, 3.6, 3.4), 0.22, 0.1, "Tabung_Merah", c, rot=(0, PI / 2, 0), segs=16)
    DISC("JamDinding", (ox + 3.6, yb - 0.31, 3.6), 0.26, "Clock_Face", c)
    # plafon berkubah kotak-kotak (tidak membuat bayangan, lihat cinemaKit) + lampu gantung kristal
    B("Plafon", (ox, 0.2, H + 0.1), (W, D + 0.6, 0.2), "Plafon_Biru", c)
    for k in range(6):
        B(f"BalokPlafonX{k}", (ox - W / 2 + (k + 0.5) * W / 6, 0.2, H - 0.05), (0.16, D + 0.6, 0.18), "Plafon_Emas", c)
    for k in range(5):
        B(f"BalokPlafonY{k}", (ox, -D / 2 + 0.2 + (k + 0.5) * (D + 0.6) / 5, H - 0.05), (W, 0.16, 0.18), "Plafon_Emas", c)
    B("ListPlafon", (ox, yb - 0.32, H - 0.25), (W, 0.2, 0.2), "Plafon_Emas", c)
    CY("TaliKandil", (ox, 0.3, H - 0.4), 0.02, 0.8, "Plafon_Emas", c, segs=6)
    RING("CincinKandil", (ox, 0.3, H - 0.85), 0.75, 0.68, 0.08, "Plafon_Emas", c, rot=(0, 0, 0), segs=32)
    for k in range(10):
        a = 2 * PI * k / 10
        BALL(f"KristalKandil{k}", (ox + math.cos(a) * 0.72, 0.3 + math.sin(a) * 0.72, H - 0.75), 0.07, "Lampu_Kuning", c, scale=(1, 1, 1.5), sub=1)
    BALL("PusatKandil", (ox, 0.3, H - 1.05), 0.16, "Lampu_Kuning", c, scale=(1, 1, 1.6), sub=2)


# ====================================================================== L6 · kantor hakim (lantai 2) + jalan
def build_L6(ox):
    c = "L6_Hakim"
    fz = 4.6
    W, D, H = 9.0, 7.0, 3.4
    # jalan & trotoar di depan gedung (sisi -Y)
    B("JalanH", (ox, -9, -0.1), (80, 14, 0.2), "Aspal", c, uv=0.4)
    B("TrotoarH", (ox, -1.0, 0.1), (80, 2.6, 0.3), "Plester_Krem", c, uv=0.5)
    B("TanahBlkH", (ox, 20, -0.1), (200, 40, 0.2), "Plester_Krem", c, uv=0.2)
    for k in range(8):
        B(f"MarkaH{k}", (ox - 35 + k * 10, -9, 0.005), (3, 0.14, 0.01), "Kertas", c)
    # gedung pengadilan berongga: dinding depan dengan jendela besar (terbuka) di ruang hakim
    front = B("FasadDepan", (ox, 0.25, 7.0), (24, 0.5, 14), "Fasad_Batu", c, uv=0.35)
    jx = ox - 1.8
    cuts = [B("JdlHakimCut", (jx, 0.25, fz + 1.55), (1.6, 1.2, 2.1), "Fasad_Batu", c), B("PintuCut", (ox + 7, 0.25, 1.5), (2.4, 1.2, 3.0), "Fasad_Batu", c)]
    CUT(front, cuts)
    B("BadanGedung", (ox, 0.5 + D + 4.5, 7.0), (24, 8, 14), "Fasad_Batu", c, uv=0.35)
    for sx in (-1, 1):
        B(f"SayapGedung{sx}", (ox + sx * (W / 2 + 4.0), 0.5 + D / 2, 7.0), (24 / 2 - W / 2 - 0.0 if False else 7.4, D, 14), "Fasad_Batu", c, uv=0.35)
    B("LantaiDasarH", (ox, 0.5 + D / 2, fz / 2), (W, D, fz), "Fasad_Batu", c, uv=0.35)
    B("LantaiRuang", (ox, 0.5 + D / 2, fz - 0.05), (W, D, 0.1), "Floor_Wood", c, uv=0.6)
    B("PlafonRuang", (ox, 0.5 + D / 2, fz + H + 0.1), (W, D, 0.2), "Plafon_Krem", c)
    B("AtasGedung", (ox, 0.5 + D / 2, (fz + H + 0.2 + 14) / 2), (W, D, 14 - fz - H - 0.2), "Fasad_Batu", c, uv=0.35)
    B("DindingBlkRuang", (ox, 0.5 + D - 0.1, fz + H / 2), (W, 0.2, H), "Plester_Krem", c, uv=0.5)
    for sx in (-1, 1):
        B(f"DindingSisiRuang{sx}", (ox + sx * (W / 2 - 0.1), 0.5 + D / 2, fz + H / 2), (0.2, D, H), "Plester_Krem", c, uv=0.5)
        B(f"LambrisRuang{sx}", (ox + sx * (W / 2 - 0.22), 0.5 + D / 2, fz + 0.5), (0.05, D, 1.0), "Wood_Wainscot", c)
    B("LambrisBlk", (ox, 0.5 + D - 0.22, fz + 0.5), (W, 0.05, 1.0), "Wood_Wainscot", c)
    # kusen jendela hakim (terbuka, daun jendela mengayun ke dalam)
    for sx in (-1, 1):
        B(f"KusenJH{sx}", (jx + sx * 0.84, 0.0, fz + 1.55), (0.1, 0.6, 2.2), "Kusen_Putih", c)
        B(f"DaunJH{sx}", (jx + sx * 1.0, 0.9, fz + 1.55), (0.06, 0.75, 2.0), "Kaca_Gelap", c, rot=(0, 0, sx * 0.2))
    B("AmbangJH", (jx, -0.05, fz + 0.45), (1.9, 0.7, 0.1), "Kusen_Putih", c)
    B("AtasJH", (jx, -0.05, fz + 2.66), (1.9, 0.6, 0.12), "Kusen_Putih", c)
    for sy in (-1, 1):
        B(f"TiraiH{sy}", (jx + sy * 1.15, 0.62, fz + 1.7), (0.5, 0.08, 2.5), "Kain_Hijau", c)
    # jendela-jendela lain di fasad + papan nama + tiang bendera
    for fl, z in enumerate((1.9, fz + 1.55, 10.4)):
        for k in range(7):
            x = ox - 10.5 + k * 3.5
            if abs(x - jx) < 1.5 and fl == 1:
                continue
            if fl == 0 and abs(x - (ox + 7)) < 2:
                continue
            WIN(f"JdlH{fl}{k}", x, 0.0, z, 1.3, 2.1, c, shutter="Jendela_Biru", bars=(fl == 0))
    Q("PapanPalais", (ox, -0.02, 3.8), 6.0, 0.8, "-Y", "Papan_Palais", c)
    B("PintuH", (ox + 7, 0.35, 1.5), (2.4, 0.1, 3.0), "Kayu_Tua", c)
    for k in range(3):
        B(f"TanggaH{k}", (ox + 7, -0.4 - k * 0.3, 0.32 - k * 0.1), (3.2, 0.35, 0.2), "Fasad_Batu", c)
    B("CorniceH", (ox, -0.1, 13.6), (24.4, 0.8, 0.5), "Plester_Krem", c)
    B("CorniceH2", (ox, -0.05, fz - 0.15), (24.4, 0.4, 0.25), "Plester_Krem", c)
    FLAG("BenderaH", ox + 4.0, -0.3, 9.0, c)
    S.add_hip_roof("AtapH", (ox, 7.0, 14.0), 24.6, 14, 3.0, 0.7, "Atap_Genteng", c)
    # mobil di bawah jendela (pendaratan), motor menunggu, lampu jalan, pohon, gedung seberang
    CAR("MobilBawahJdl", jx + 0.2, -3.2, 0, "Mobil_Krem", c, 1)
    mx, my = ox + 3.4, -4.8
    for sx in (-1, 1):
        CY(f"RodaMotor{sx}", (mx + sx * 0.65, my, 0.32), 0.32, 0.1, "Ban", c, rot=(PI / 2, 0, 0), segs=16)
    B("BadanMotor", (mx, my, 0.62), (1.0, 0.3, 0.35), "Tabung_Merah", c, bevel=0.06)
    B("JokMotor", (mx - 0.2, my, 0.86), (0.6, 0.28, 0.1), "Plastik_Hitam", c)
    B("StangMotor", (mx + 0.55, my, 1.05), (0.06, 0.7, 0.05), "Krom", c)
    CY("LampuMotor", (mx + 0.7, my, 0.9), 0.08, 0.06, "Lampu_Kuning", c, rot=(0, PI / 2, 0), segs=10)
    for k in range(5):
        LAMPPOST(f"LampuH{k}", ox - 16 + k * 8, -2.0, c)
    for k in range(4):
        PALM(f"PalemH{k}", ox - 14 + k * 9, -2.0 if k % 2 else -1.4, c, h=5.0, seed=60 + k)
    for i in range(6):
        x = ox - 30 + i * 12
        h = 10 + (i % 3) * 2
        B(f"SeberangH{i}", (x, -22, h / 2), (11.5, 8, h), ["Plester_Oker", "Plester_Kuning", "Plester_Merah"][i % 3], c, uv=0.3)
    # --- isi ruang hakim
    oy = 0.5
    TABLE("MejaHakim", ox + 0.8, oy + 4.6, fz, 2.6, 1.2, 0.8, "Wood_Desk_Dark", c, leg="Wood_Desk_Dark")
    B("PanelMejaHakim", (ox + 0.8, oy + 4.0, fz + 0.42), (2.6, 0.06, 0.76), "Wood_Wainscot_Panel", c)
    B("MesinTik", (ox + 0.3, oy + 4.6, fz + 0.92), (0.5, 0.36, 0.18), "Plastik_Hitam", c, bevel=0.03)
    B("KertasMesinTik", (ox + 0.3, oy + 4.72, fz + 1.1), (0.3, 0.02, 0.25), "Kertas", c)
    for k in range(4):
        B(f"MapBerkas{k}", (ox + 1.5, oy + 4.7, fz + 0.86 + k * 0.05), (0.42, 0.32, 0.04), ["Folder_Orange", "Jendela_Biru", "Kertas", "Folder_Orange"][k], c, rot=(0, 0, 0.1 * k))
    Q("PetaHakim", (ox + 0.9, oy + 4.3, fz + 0.845), 0.7, 0.45, "Z", "Peta_Got", c)
    CY("LampuMejaH", (ox + 1.9, oy + 4.9, fz + 0.98), 0.03, 0.3, "Kuningan", c, segs=8)
    CY("KapLampuH", (ox + 1.9, oy + 4.9, fz + 1.18), 0.16, 0.14, "Jendela_Hijau", c, segs=12, r2=0.1)
    CHAIR("KursiHakim", ox + 0.8, oy + 5.5, fz, c, mat="Kulit", face=-1)
    B("SandaranTinggi", (ox + 0.8, oy + 5.75, fz + 1.2), (0.6, 0.06, 1.0), "Kulit", c)
    CHAIR("KursiTerperiksa", ox + 0.3, oy + 3.0, fz, c, face=-1)
    CHAIR("KursiPanitera", ox - 2.6, oy + 4.2, fz, c, face=1)
    TABLE("MejaPanitera", ox - 2.6, oy + 4.8, fz, 1.2, 0.7, 0.75, "Wood_Desk", c)
    Q("RakBukuH", (ox + 3.0, oy + D - 0.22, fz + 1.5), 2.2, 2.6, "-Y", "Rak_Buku", c)
    B("BingkaiRakH", (ox + 3.0, oy + D - 0.2, fz + 1.5), (2.4, 0.08, 2.8), "Wood_Desk_Dark", c)
    FLAG("BenderaRuang", ox - 1.0, oy + D - 0.6, fz + 1.4, c, size=0.8)
    B("BingkaiPotret", (ox - 0.8, oy + D - 0.22, fz + 2.3), (1.0, 0.05, 1.2), "Gold_Frame", c)
    Q("Potret", (ox - 0.8, oy + D - 0.26, fz + 2.3), 0.8, 1.0, "-Y", "Painting_Hills", c)
    DISC("JamH", (ox + 3.2, oy + D - 0.22, fz + 3.05), 0.22, "Clock_Face", c)
    B("Lemari Arsip", (ox - 3.9, oy + 2.0, fz + 0.8), (0.6, 1.4, 1.6), "Baja_Gelap", c)
    for k in range(3):
        B(f"LaciArsip{k}", (ox - 3.58, oy + 2.0, fz + 0.35 + k * 0.5), (0.03, 1.2, 0.4), "Baja", c)
    CY("KipasTiang", (ox - 3.6, oy + 5.6, fz + 0.75), 0.03, 1.5, "Krom", c, segs=8)
    DISC("KipasDaun", (ox - 3.55, oy + 5.5, fz + 1.55), 0.3, "Krom", c)
    PLANT("TanamanH", ox + 3.8, oy + 1.4, fz, c, s=1.2, seed=33)
    B("KarpetH", (ox + 0.5, oy + 3.8, fz + 0.005), (4.4, 3.0, 0.01), "Kain_Merah", c)
    CY("TaliLampuH", (ox + 0.5, oy + 3.6, fz + H - 0.3), 0.015, 0.6, "Selang", c, segs=6)
    BALL("LampuGantungH", (ox + 0.5, oy + 3.6, fz + H - 0.7), 0.2, "Lampu_Kuning", c, scale=(1, 1, 0.7), sub=2)


OX = {"L1": 0, "L2": 400, "L3": 800, "L4": 1200, "L5": 1600, "L6": 2000}
BUILD = {"L1": build_L1, "L2": build_L2, "L3": build_L3, "L4": build_L4, "L5": build_L5, "L6": build_L6}
for k, fn in BUILD.items():
    if ONLY and k not in ONLY:
        continue
    fn(OX[k])
    print("selesai", k, flush=True)


def merge_for_export():
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


# ====================================================================== BAKE cahaya pantul (BAKE=1)
# Per latar: gabung semua mesh jadi satu objek (material tetap), UV kedua "LM" (smart project), Cycles bake DIFFUSE
# INDIRECT (pantulan saja; cahaya langsung tetap real-time di Remotion) -> public/models/terowongan_lm_<L>.png
SUN_DIR = {"L1": (26, -20, 42), "L2": (-22, -26, 30), "L3": (-20, -18, 40), "L4": (26, -20, 42), "L5": (30, 10, 34), "L6": (26, -20, 42)}
SUN_E = {"L1": 3.5, "L2": 2.6, "L3": 0.15, "L4": 3.5, "L5": 2.0, "L6": 3.5}
POINTS = {
    "L2": [(1.2, 2.0, 1.25, 60), (0.2, 0.8, 2.3, 120)],
    "L3": [(-1.4, -4 + 6 * k, 2.4, 40) for k in range(8)] + [(0.9, 0, 5.5, 250), (1.3, 1.6, 1.3, 60)],
    "L4": [(-6 + 2.2 * k, -1.0, -4.5, 30) for k in range(4)] + [(7.4, -0.6, -3.2, 150), (-8, -0.6, -4.6, 40)],
    "L5": [(0, 0.3, 3.3, 400), (-2.5, 0.5, 3.2, 150), (2.5, 0.5, 3.2, 150), (2.5, 0.7, 1.66, 150)],
    "L6": [(0.5, 4.1, 4.6 + 2.7, 150)],
}
LM_RES = {"L1": 2048, "L2": 1024, "L3": 1024, "L4": 2048, "L5": 1024, "L6": 2048}


def bake_latar(L, outdir):
    import numpy as np
    col = bpy.data.collections.get(BUILD_COL[L])
    ox = OX[L]
    objs = [o for o in col.objects if o.type == "MESH" and o.data.materials]
    keep, solo = [], []
    for o in objs:
        big = max(o.dimensions) > 60
        plaf = o.data.materials[0].name.startswith("Plafon")
        (solo if (big or plaf) else keep).append(o)
        if plaf:
            o.visible_shadow = False
    bpy.ops.object.select_all(action="DESELECT")
    for o in keep:
        o.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.object.join()
    J = bpy.context.object
    J.name = BUILD_COL[L]
    uv = J.data.uv_layers.new(name="LM")
    J.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    J.data.uv_layers.active = J.data.uv_layers[0]
    J.data.uv_layers[0].active_render = True
    # lampu
    added = []
    bpy.ops.object.light_add(type="SUN")
    sun = bpy.context.object
    sun.rotation_euler = Vector(SUN_DIR[L]).to_track_quat("Z", "Y").to_euler()
    sun.data.energy = SUN_E[L]
    sun.data.angle = math.radians(4)
    added.append(sun)
    for (x, y, z, w) in POINTS.get(L, []):
        bpy.ops.object.light_add(type="POINT", location=(ox + x, y, z))
        li = bpy.context.object
        li.data.energy = w
        li.data.color = (1.0, 0.85, 0.62)
        li.data.shadow_soft_size = 0.2
        added.append(li)
    # target gambar
    res = LM_RES[L]
    im = bpy.data.images.new(f"lm_{L}", res, res, alpha=False, float_buffer=True)
    nodes = []
    for m in J.data.materials:
        nt = m.node_tree
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = im
        nt.nodes.active = n
        nodes.append((nt, n))
    bpy.ops.object.select_all(action="DESELECT")
    J.select_set(True)
    bpy.context.view_layer.objects.active = J
    t0 = time.time()
    r = bpy.ops.object.bake(type="DIFFUSE", pass_filter={"INDIRECT"}, uv_layer="LM", margin=8, use_clear=True)
    print("bake result", r, flush=True)
    print(f"BAKE {L} {time.time() - t0:.0f} dtk", flush=True)
    for nt, n in nodes:
        nt.nodes.remove(n)
    for li in added:
        bpy.data.objects.remove(li, do_unlink=True)
    # haluskan (pantulan berfrekuensi rendah) lalu simpan 8-bit gamma
    a = np.array(im.pixels[:], dtype=np.float32).reshape(res, res, 4)[..., :3]
    k = 3
    for ax in (0, 1):
        acc = np.zeros_like(a)
        for d in range(-k, k + 1):
            acc += np.roll(a, d, axis=ax)
        a = acc / (2 * k + 1)
    out = np.ones((res, res, 4), dtype=np.float32)
    out[..., :3] = np.clip(a / (1 + a), 0, 1) ** (1 / 2.2)  # tonemap Reinhard -> sRGB
    im2 = bpy.data.images.new(f"lm8_{L}", res, res, alpha=False)
    im2.pixels.foreach_set(out.ravel())
    im2.filepath_raw = os.path.join(outdir, f"terowongan_lm_{L}.png")
    im2.file_format = "PNG"
    im2.save()
    # objek besar/plafon tetap terpisah, beri nama latar__material
    for o in solo:
        o.name = f"{BUILD_COL[L]}__solo_{o.data.materials[0].name}"


BUILD_COL = {"L1": "L1_Jalan", "L2": "L2_Studio", "L3": "L3_Got", "L4": "L4_Penampang", "L5": "L5_Brankas", "L6": "L6_Hakim"}
import time
os.makedirs(os.path.dirname(os.path.abspath(GLB)), exist_ok=True)
if os.environ.get("BAKE"):
    import addon_utils
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = int(os.environ.get("BAKE_SAMPLES", "48"))
    sc.cycles.use_denoising = False
    sc.cycles.sample_clamp_indirect = 1.5
    sc.cycles.max_bounces = 4
    sc.view_layers[0].cycles.use_denoising = False
    sc.render.bake.margin = 8
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.7, 0.95, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    for L in BUILD_COL:
        if ONLY and L not in ONLY:
            continue
        bake_latar(L, os.path.dirname(os.path.abspath(GLB)))
    for o in list(bpy.data.objects):  # sisa objek (Langit) tetap digabung per material
        pass
else:
    merge_for_export()
bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB", export_yup=True, export_materials="EXPORT", export_texcoords=True, export_normals=True, export_apply=True)
print("GLB", GLB, os.path.getsize(GLB) // 1024, "KB")
