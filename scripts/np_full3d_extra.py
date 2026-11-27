"""Uji adegan 'serbu' penuh 3D Blender: karakter 3D chibi + kelinci 3D di lapangan L4.
Dipanggil lewat NP_EXTRA oleh build_napoleon_glb.py (memakai helper & material yang sudah ada)."""
from mathutils import Euler, Matrix

C = "L4_Lapangan"
O4 = OX["L4"]
for nm, hx, r in (("Coat_Blue", "#1d3a8a", .7), ("Belt_White", "#f4f0e6", .7), ("Hat_Black", "#1a1a20", .6), ("Boots", "#1c1410", .5),
                  ("Hair_Brown", "#4a2c1a", .7), ("Jacket_Red", "#8a1c26", .7), ("Sarong_Blue", "#274a8a", .8), ("Helmet_Grey", "#8a929c", .4),
                  ("Eye_White", "#fbfaf6", .3), ("Pupil", "#15121a", .3), ("Mouth_Dark", "#5a1420", .5), ("Pink", "#f0a0a8", .6), ("Brow", "#2a1a12", .6),
                  ("Trouser_White", "#eee8da", .8), ("Skin_Toon", "#f2c49c", .7), ("Farmer_Tan", "#a98a58", .8), ("Gun_Wood", "#6a4426", .6), ("Sweat", "#9fd8f4", .2),
                  ("Fur_Brown", "#8a6a4a", .9), ("Fur_Tan", "#cdb594", .9), ("Fur_Cream", "#e8dccb", .9)):
    M(nm, lin(hx), roughness=r)
M("Outline", (0.04, 0.03, 0.05), roughness=1.0)
S.MATS["Outline"].use_backface_culling = True


def outline(o, t=0.025):
    if not o.data.materials:
        return
    o.data.materials.append(S.MATS["Outline"])
    m = o.modifiers.new("ol", "SOLIDIFY")
    m.thickness = t
    m.offset = 1
    m.use_flip_normals = True
    m.material_offset = 1


class Rig:
    """koordinat lokal karakter (x kanan, y depan = -Y dunia, z atas) -> dunia"""
    def __init__(self, pos, yaw=0.0):
        self.p = Vector(pos)
        self.R = Matrix.Rotation(yaw, 3, "Z")
        self.n = 0

    def w(self, v):
        return self.p + self.R @ Vector(v)

    def nm(self, tag):
        self.n += 1
        return f"Kar{id(self) % 9973}_{tag}{self.n}"

    def ball(self, c, r, mat, sc=(1, 1, 1), ol=True):
        o = S.add_icosphere(self.nm("b"), tuple(self.w(c)), r, 5, mat, C, scale=sc)
        o.rotation_euler = Euler((0, 0, self.R.to_euler().z))
        S_smooth(o)
        if ol:
            outline(o)
        return o

    def limb(self, a, b, r, mat, r2=None, ol=True):
        pa, pb = self.w(a), self.w(b)
        d = pb - pa
        o = S.add_cylinder(self.nm("l"), tuple((pa + pb) / 2), r, r if r2 is None else r2, d.length, 32, mat, C)
        o.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        S_smooth(o)
        sm = o.modifiers.new('ss', 'SUBSURF'); sm.levels = 2; sm.render_levels = 2
        if ol:
            outline(o)
        return o

    def box(self, c, size, mat, rot=(0, 0, 0), ol=True):
        o = S.add_box(self.nm("x"), tuple(self.w(c)), size, mat, C, bevel=min(size) * 0.3)
        o.rotation_euler = Euler((rot[0], rot[1], rot[2] + self.R.to_euler().z))
        S_smooth(o)
        sm = o.modifiers.new('ss', 'SUBSURF'); sm.levels = 1; sm.render_levels = 1
        if ol:
            outline(o, 0.02)
        return o


def S_smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def face(r, hc, hr, expr="neutral", mouth=0.0, sweat=False, blush=True):
    """wajah di sisi depan (-Y lokal) kepala bulat berpusat hc, jari-jari hr"""
    fy = -hr * 0.9
    for sx in (-1, 1):
        r.ball((hc[0] + sx * hr * .36, hc[1] + fy, hc[2] + hr * .12), hr * .19, "Eye_White", sc=(.9, .5, 1.15), ol=False)
        pp = hr * (.03 if expr in ("shock", "scared") else .0)
        r.ball((hc[0] + sx * hr * .36, hc[1] + fy - hr * .1, hc[2] + hr * .12 - pp), hr * (.07 if expr in ("shock", "scared") else .1), "Pupil", sc=(1, .5, 1.1), ol=False)
        tilt = {"angry": -.4 * sx, "scared": .45 * sx, "worried": .4 * sx, "happy": 0}.get(expr, 0)
        r.box((hc[0] + sx * hr * .36, hc[1] + fy - hr * .05, hc[2] + hr * .42 + (hr * .08 if expr in ("scared", "shock", "worried") else 0)),
              (hr * .3, hr * .05, hr * .055), "Brow", rot=(0, tilt, 0), ol=False)
        if blush:
            r.ball((hc[0] + sx * hr * .6, hc[1] + fy * .9, hc[2] - hr * .12), hr * .13, "Pink", sc=(1, .3, .7), ol=False)
    if mouth > 0.05:
        r.ball((hc[0], hc[1] + fy * 1.0, hc[2] - hr * .42), hr * (.12 + .16 * mouth), "Mouth_Dark", sc=(1, .45, 1.25 if mouth > .5 else 1), ol=False)
    else:
        r.box((hc[0], hc[1] + fy * 1.0, hc[2] - hr * .4), (hr * .26, hr * .04, hr * .05), "Mouth_Dark", ol=False)
    if sweat:
        r.ball((hc[0] + hr * .78, hc[1] + fy * .6, hc[2] + hr * .35), hr * .1, "Sweat", sc=(.8, .6, 1.4), ol=False)


def legs(r, mat, boot, spread=.17, stride=0.0, h=0.95):
    for sx in (-1, 1):
        r.limb((sx * spread, stride * sx, h), (sx * spread * 1.05, -stride * sx * .5, .12), .11, mat)
        r.box((sx * spread * 1.05, -stride * sx * .5 - .06, .07), (.2, .34, .16), boot)


def napoleon(pos, yaw=0.0, arms="up", expr="scared", mouth=.9, rifle=True, hatrab=False):
    r = Rig(pos, yaw)
    legs(r, "Trouser_White", "Boots", stride=.1)
    r.limb((0, 0, .95), (0, 0, 1.35), .27, "Coat_Blue", r2=.34)           # badan
    r.ball((0, 0, 1.22), .33, "Coat_Blue", sc=(1, .85, 1.0))
    for i in range(4):
        r.ball((0, -.3, 1.45 - i * .1), .03, "Gold", ol=False)
    r.box((0, -.29, 1.28), (.08, .02, .72), "Belt_White", rot=(0, .6, 0), ol=False)
    r.box((0, -.29, 1.28), (.08, .02, .72), "Belt_White", rot=(0, -.6, 0), ol=False)
    r.limb((0, 0, 1.0), (0, -.02, 1.02), .35, "Gold", ol=False)
    sh = {"up": ((.4, 0, 1.45), (.82, -.18, 1.98), (-.4, 0, 1.45), (-.82, -.18, 1.98)),
          "grip": ((.4, 0, 1.45), (.58, -.4, 1.22), (-.4, 0, 1.45), (-.45, -.42, 1.28))}[arms]
    r.limb(sh[0], sh[1], .09, "Coat_Blue")
    r.limb(sh[2], sh[3], .09, "Coat_Blue")
    for q in (sh[1], sh[3]):
        r.ball(q, .12, "Skin_Toon")
    for sx in (-1, 1):
        r.ball((sx * .42, 0, 1.5), .12, "Gold", sc=(1.2, 1, .5), ol=False)    # pundak
    hc = (0, 0, 1.92)
    hr = .46
    r.limb((0, 0, 1.5), (0, 0, 1.62), .12, "Skin_Toon", ol=False)
    r.ball(hc, hr, "Skin_Toon")
    face(r, hc, hr, expr, mouth, sweat=True)
    # bicorne
    r.ball((0, 0, hc[2] + hr * .78), .56, "Hat_Black", sc=(1.35, .55, .42))
    r.box((0, -.2, hc[2] + hr * .55), (.9, .1, .05), "Gold", ol=False)
    r.ball((0, -.34, hc[2] + hr * .82), .07, "Flag_Red", ol=False)
    if rifle:
        r.limb((.78, -.4, 1.0), (.95, -.3, 2.05), .04, "Gun_Wood")
    return r


def ara(pos, yaw=0.0, expr="worried", mouth=.4, arms="clasp"):
    r = Rig(pos, yaw)
    r.limb((0, 0, .95), (0, 0, .2), .3, "Sarong_Blue", r2=.44)
    r.limb((0, 0, 1.0), (0, 0, .96), .3, "Gold", ol=False)              # kain
    r.limb((0, 0, 1.0), (0, 0, 1.42), .27, "Jacket_Red", r2=.3)
    sh = {"clasp": ((.3, 0, 1.38), (.2, -.28, 1.12), (-.3, 0, 1.38), (-.18, -.28, 1.12)),
          "up": ((.3, 0, 1.38), (.55, -.2, 1.85), (-.3, 0, 1.38), (-.55, -.2, 1.85))}[arms]
    r.limb(sh[0], sh[1], .075, "Jacket_Red")
    r.limb(sh[2], sh[3], .075, "Jacket_Red")
    for q in (sh[1], sh[3]):
        r.ball(q, .1, "Skin_Toon")
    for sx in (-1, 1):
        r.box((sx * .12, 0, .06), (.2, .3, .12), "Boots", ol=False)
    hc = (0, 0, 1.85)
    hr = .43
    r.limb((0, 0, 1.45), (0, 0, 1.55), .1, "Skin_Toon", ol=False)
    r.ball(hc, hr, "Skin_Toon")
    r.ball((0, .06, hc[2] + .04), hr * 1.04, "Hair_Brown", sc=(1.0, .9, 1.0))   # rambut belakang
    r.ball((0, .1, hc[2] + hr * .95), .24, "Hair_Brown")                       # sanggul
    r.box((0, .02, hc[2] + hr * .55), (.5, .1, .06), "Gold", ol=False)
    face(r, hc, hr, expr, mouth, blush=True)
    return r


def guard(pos, yaw=0.0):
    r = Rig(pos, yaw)
    legs(r, "Coat_Blue", "Boots", stride=.2)
    r.limb((0, 0, .95), (0, 0, 1.35), .26, "Coat_Blue", r2=.3)
    r.box((0, -.27, 1.2), (.1, .02, .9), "Belt_White", rot=(0, .6, 0), ol=False)
    r.limb((.36, 0, 1.4), (.7, -.2, 1.95), .085, "Coat_Blue")
    r.limb((-.36, 0, 1.4), (-.7, -.2, 1.95), .085, "Coat_Blue")
    r.ball((.7, -.2, 1.95), .11, "Skin_Toon")
    r.ball((-.7, -.2, 1.95), .11, "Skin_Toon")
    hc = (0, 0, 1.8)
    r.ball(hc, .4, "Skin_Toon")
    face(r, hc, .4, "scared", .8, sweat=True, blush=False)
    r.ball((0, 0, hc[2] + .22), .42, "Helmet_Grey", sc=(1, 1, .75))
    r.ball((0, -.2, hc[2] + .42), .06, "Gold", ol=False)
    return r


def rabbit(pos, yaw=0.0, fur="Bunny_White", hop=0.0, sc=1.0, hungry=True):
    r = Rig((pos[0], pos[1], pos[2] + hop), yaw)
    k = sc
    r.ball((0, 0, .32 * k), .3 * k, fur, sc=(.9, 1.2, .95))                    # badan
    r.ball((0, -.2 * k, .62 * k), .22 * k, fur)                                # kepala
    for sx in (-1, 1):
        r.ball((sx * .09 * k, -.12 * k, 1.0 * k), .08 * k, fur, sc=(.8, .6, 3.3))
        r.ball((sx * .09 * k, -.16 * k, 1.0 * k), .045 * k, "Pink", sc=(.7, .4, 2.8), ol=False)
        r.ball((sx * .09 * k, -.37 * k, .66 * k), .045 * k, "Pupil", ol=False)
    r.ball((0, -.41 * k, .6 * k), .03 * k, "Pink", ol=False)
    r.ball((0, .27 * k, .3 * k), .1 * k, "Cloth_White", ol=False)
    for sx in (-1, 1):
        r.ball((sx * .14 * k, -.05 * k, .08 * k), .1 * k, fur, sc=(.8, 1.5, .6), ol=False)
    return r


NP = (O4 - 2.0, -7.2, 0.05)
napoleon(NP, yaw=0.0, arms="up", expr="scared", mouth=.95)
ara((O4 + 2.8, -8.8, 0.05), yaw=0.3, expr="worried", mouth=.5)
guard((O4 - 5.6, -8.6, 0.05), yaw=-.2)
guard((O4 - 4.4, -4.4, 0.05), yaw=-.5)
FURS = ["Bunny_White", "Bunny_White", "Fur_Tan", "Fur_Cream", "Fur_Brown", "Bunny_White"]
rr = random.Random(3)
for i in range(34):
    a = rr.uniform(0, 6.28)
    d = 1.2 + rr.random() * 3.6
    x, y = NP[0] + math.cos(a) * d, NP[1] + math.sin(a) * d * .6
    rabbit((x, y, 0.05), yaw=math.atan2(NP[0] - x, y - NP[1]) * -1 + 3.14, fur=FURS[i % 6], hop=(.25 + .15 * rr.random()) if i % 3 == 0 else 0, sc=.85 + .3 * rr.random())
for i in range(6):
    x = NP[0] - 1.1 + i * .45
    rabbit((x, NP[1] - 1.0 - (i % 2) * .6, 0.05), yaw=3.14, fur=FURS[i], hop=.2 if i % 2 else 0, sc=.9)
rabbit((NP[0] + .05, NP[1] + .0, 2.4), yaw=3.14, fur="Bunny_White", sc=.7)   # kelinci di topi bicorne

VIEWS[:] = [
    ("np_lebar", "L4", (-4.2, -18.5, 4.2), (-1.4, -6.6, 1.5), 27, False, []),
    ("np_sedang", "L4", (-2.4, -12.2, 1.7), (-1.9, -7.2, 1.7), 30, False, []),
    ("np_dekat", "L4", (-1.9, -9.4, 2.2), (-2.0, -7.2, 2.0), 36, False, []),
    ("np_ara", "L4", (4.8, -13.0, 1.9), (2.4, -8.6, 1.4), 30, False, []),
]
