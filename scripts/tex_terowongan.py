"""Tekstur untuk latar "Terowongan ke Brankas" (PIL). Hasil: blender/tex_terowongan/*.png
Pakai: python3 scripts/tex_terowongan.py
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "blender", "tex_terowongan")
os.makedirs(OUT, exist_ok=True)
R = random.Random(11)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(p, s):
    try:
        return ImageFont.truetype(p, s)
    except Exception:
        return ImageFont.load_default()


def hx(h, k=1.0):
    h = h.lstrip("#")
    return tuple(max(0, min(255, int(int(h[i:i + 2], 16) * k))) for i in (0, 2, 4))


def grime(im, n=60, col=(40, 30, 20), a=(10, 40), r=(8, 60)):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for _ in range(n):
        x, y, rr = R.randint(0, im.width), R.randint(0, im.height), R.randint(*r)
        d.ellipse([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], fill=(*col, R.randint(*a)))
    ov = ov.filter(ImageFilter.GaussianBlur(10))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def speck(im, n=2000, cols=((0, 0, 0),), a=0.15):
    px = im.load()
    for _ in range(n):
        x, y = R.randrange(im.width), R.randrange(im.height)
        c = R.choice(cols)
        p = px[x, y]
        px[x, y] = tuple(int(p[i] * (1 - a) + c[i] * a) for i in range(3))
    return im


def save(im, name):
    im.save(os.path.join(OUT, name + ".png"))


def bricks(name, base, mortar, moss=False, W=512, H=512):
    im = Image.new("RGB", (W, H), hx(mortar))
    d = ImageDraw.Draw(im)
    bh, bw = 32, 96
    for row in range(H // bh + 1):
        off = (row % 2) * bw // 2
        for col in range(-1, W // bw + 2):
            x0, y0 = col * bw + off + 3, row * bh + 3
            k = R.uniform(0.75, 1.12)
            d.rounded_rectangle([x0, y0, x0 + bw - 6, y0 + bh - 6], 4, fill=hx(base, k))
            d.line([x0 + 4, y0 + bh - 8, x0 + bw - 10, y0 + bh - 8], fill=hx(base, k * 0.8), width=2)
    im = grime(im, 50, (30, 22, 18), (20, 70))
    if moss:
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(ov)
        for _ in range(40):
            x = R.randint(0, W)
            y = R.randint(int(H * 0.5), H)
            rr = R.randint(10, 50)
            dd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(70, 110, 50, R.randint(60, 150)))
        for _ in range(14):  # rembesan air
            x = R.randint(0, W)
            dd.rectangle([x, 0, x + R.randint(3, 9), R.randint(80, 300)], fill=(30, 40, 30, 90))
        im = Image.alpha_composite(im.convert("RGBA"), ov.filter(ImageFilter.GaussianBlur(4))).convert("RGB")
    save(speck(im, 4000), name)


def layered(name, base, pebbles, W=512, H=512, dots=(3, 9), n=260, roots=False):
    im = Image.new("RGB", (W, H), hx(base))
    im = grime(im, 90, hx(base, 0.6), (40, 90), (20, 80))
    d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y, r = R.randint(0, W), R.randint(0, H), R.randint(*dots)
        c = hx(R.choice(pebbles), R.uniform(0.85, 1.1))
        d.ellipse([x - r, y - r * 0.75, x + r, y + r * 0.75], fill=c, outline=hx(base, 0.55), width=2)
        d.arc([x - r * 0.6, y - r * 0.5, x + r * 0.4, y + r * 0.2], 200, 300, fill=(255, 255, 255), width=1)
    if roots:
        for _ in range(8):
            x, y = R.randint(0, W), R.randint(0, H // 3)
            for _ in range(10):
                nx, ny = x + R.randint(-20, 20), y + R.randint(8, 30)
                d.line([x, y, nx, ny], fill=hx("#6a4428"), width=3)
                x, y = nx, ny
    save(speck(im, 6000, ((0, 0, 0), (255, 240, 210))), name)


def cobble(name, W=512, H=512):
    im = Image.new("RGB", (W, H), hx("#5a5048"))
    d = ImageDraw.Draw(im)
    s = 42
    for row in range(H // s + 2):
        for col in range(W // s + 2):
            x0, y0 = col * s + (row % 2) * s // 2 + R.randint(-3, 3), row * s + R.randint(-3, 3)
            c = hx(R.choice(["#a89a86", "#9a8e7c", "#b4a690", "#8e8474"]), R.uniform(0.85, 1.1))
            d.rounded_rectangle([x0 + 3, y0 + 3, x0 + s - 3, y0 + s - 3], 12, fill=c)
            d.arc([x0 + 6, y0 + 6, x0 + s - 10, y0 + s - 10], 190, 260, fill=hx("#d8ccb8"), width=2)
    save(speck(grime(im, 40, (30, 26, 22), (20, 60)), 3000), name)


def ashlar(name, base="#e6d6b4", W=512, H=512, bh=64, bw=128):
    im = Image.new("RGB", (W, H), hx(base, 0.72))
    d = ImageDraw.Draw(im)
    for row in range(H // bh + 1):
        off = (row % 2) * bw // 2
        for col in range(-1, W // bw + 2):
            x0, y0 = col * bw + off + 2, row * bh + 2
            d.rectangle([x0, y0, x0 + bw - 4, y0 + bh - 4], fill=hx(base, R.uniform(0.92, 1.05)))
            d.line([x0, y0 + bh - 5, x0 + bw - 4, y0 + bh - 5], fill=hx(base, 0.8), width=2)
    im = grime(im, 50, (90, 70, 50), (10, 40))
    save(speck(im, 5000, ((80, 60, 40),), 0.2), name)


def plaster(name, base, W=512, H=512, cracks=4, stains=40):
    im = Image.new("RGB", (W, H), hx(base))
    im = grime(im, stains, hx(base, 0.55), (15, 60), (20, 90))
    d = ImageDraw.Draw(im)
    for _ in range(cracks):
        x, y = R.randint(0, W), R.randint(0, H)
        for _ in range(12):
            nx, ny = x + R.randint(-14, 14), y + R.randint(4, 22)
            d.line([x, y, nx, ny], fill=hx(base, 0.45), width=2)
            x, y = nx, ny
    save(speck(im, 5000, ((0, 0, 0), (255, 255, 255)), 0.08), name)


def drawers(name, W=1024, H=1024, cols=6, rows=8):
    im = Image.new("RGB", (W, H), hx("#5e646e"))
    d = ImageDraw.Draw(im)
    f = font(FS, 22)
    cw, ch = W // cols, H // rows
    n = 101
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * cw + 6, r * ch + 6
            k = R.uniform(0.92, 1.08)
            d.rectangle([x0, y0, x0 + cw - 12, y0 + ch - 12], fill=hx("#aeb4bc", k), outline=hx("#3a3e46"), width=4)
            d.rectangle([x0 + 8, y0 + 8, x0 + cw - 20, y0 + 16], fill=hx("#d8dde4", k))
            # pelat nomor kuningan + lubang kunci ganda
            px, py = x0 + cw // 2 - 34, y0 + 22
            d.rectangle([px, py, px + 68, py + 30], fill=hx("#c9a24a"), outline=hx("#6a4a1a"), width=2)
            d.text((px + 8, py + 2), str(n), fill=hx("#2a1a08"), font=f)
            for kx in (-18, 18):
                cx, cy = x0 + cw // 2 + kx, y0 + ch - 44
                d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=hx("#c9a24a"), outline=hx("#3a2a10"), width=2)
                d.rectangle([cx - 2, cy - 5, cx + 2, cy + 5], fill=hx("#1a1a1a"))
            n += 1
    im = grime(im, 60, (40, 40, 44), (10, 40))
    save(speck(im, 3000), name)


def starburst(name, W=1024):
    im = Image.new("RGB", (W, W), hx("#d8d2c4"))
    d = ImageDraw.Draw(im)
    c = W / 2
    for i in range(32):
        a0, a1 = i * 2 * math.pi / 32, (i + 1) * 2 * math.pi / 32
        if i % 2 == 0:
            d.polygon([(c, c), (c + math.cos(a0) * W, c + math.sin(a0) * W), (c + math.cos(a1) * W, c + math.sin(a1) * W)], fill=hx("#b8b2a6"))
    for rr, col in ((W * 0.48, None), (W * 0.18, "#a49a88"), (W * 0.1, "#cfc6b4")):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], fill=hx(col) if col else None, outline=hx("#6a645a"), width=6)
    im = grime(im, 80, (60, 54, 46), (10, 50), (20, 100))
    save(speck(im, 6000), name)


def wallpaper(name, W=512, H=512):
    im = Image.new("RGB", (W, H), hx("#e8d6a8"))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 64):
        d.rectangle([x, 0, x + 22, H], fill=hx("#d8c08a"))
        for y in range(16, H, 64):
            cx, cy = x + 43, y + (x // 64 % 2) * 32
            for a in range(5):
                ang = a * 2 * math.pi / 5
                d.ellipse([cx + math.cos(ang) * 7 - 5, cy + math.sin(ang) * 7 - 5, cx + math.cos(ang) * 7 + 5, cy + math.sin(ang) * 7 + 5], fill=hx("#b4562e"))
            d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=hx("#6a8a3a"))
    im = grime(im, 50, (90, 70, 40), (10, 40), (20, 90))
    save(speck(im, 3000), name)


def sign(name, text, fg, bg, W=1024, H=256, fp=FB, size=150, border=None):
    im = Image.new("RGB", (W, H), hx(bg))
    d = ImageDraw.Draw(im)
    f = font(fp, size)
    bb = d.textbbox((0, 0), text, font=f)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], (H - (bb[3] - bb[1])) / 2 - bb[1]), text, fill=hx(fg), font=f)
    if border:
        d.rectangle([8, 8, W - 9, H - 9], outline=hx(border), width=10)
    save(grime(im, 20, (40, 30, 20), (5, 25)), name)


def sewer_map(name, W=1024, H=768):
    im = Image.new("RGB", (W, H), hx("#e9dcb4"))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 48):
        d.line([x, 0, x, H], fill=hx("#d2c49a"), width=1)
    for y in range(0, H, 48):
        d.line([0, y, W, y], fill=hx("#d2c49a"), width=1)
    for _ in range(9):  # jalan kota
        y = R.randint(40, H - 40)
        d.line([0, y, W, y + R.randint(-60, 60)], fill=hx("#bfae86"), width=26)
    pts = [(60, 600), (260, 560), (420, 470), (560, 460), (700, 380), (860, 360)]
    d.line(pts, fill=hx("#2a5a9a"), width=12)
    for p in pts:
        d.ellipse([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8], fill=hx("#2a5a9a"))
    d.rectangle([840, 250, 960, 340], outline=hx("#b02a22"), width=8)
    d.line([860, 360, 900, 340], fill=hx("#b02a22"), width=6)
    f = font(FS, 34)
    d.text((842, 200), "BANQUE", fill=hx("#b02a22"), font=f)
    d.text((70, 640), "EGOUT", fill=hx("#2a5a9a"), font=f)
    d.ellipse([870, 270, 930, 330], outline=hx("#b02a22"), width=6)
    save(grime(im, 40, (120, 90, 50), (20, 60)), name)


def photos(name, W=1024, H=256):
    im = Image.new("RGB", (W, H), hx("#2a2420"))
    d = ImageDraw.Draw(im)
    for i in range(6):
        x0 = 20 + i * 168
        d.rectangle([x0, 20, x0 + 150, 236], fill=hx("#f4efe4"))
        sky = R.choice(["#9cc4e4", "#e8b878", "#a8a8b8"])
        d.rectangle([x0 + 10, 30, x0 + 140, 190], fill=hx(sky))
        d.polygon([(x0 + 10, 190), (x0 + 60, 110), (x0 + 100, 150), (x0 + 140, 100), (x0 + 140, 190)], fill=hx("#5a7a4a"))
        d.ellipse([x0 + 100, 42, x0 + 124, 66], fill=hx("#f8e8a0"))
    save(im, name)


def books(name, W=512, H=512):
    im = Image.new("RGB", (W, H), hx("#3a2418"))
    d = ImageDraw.Draw(im)
    for sh in range(4):
        y1 = (sh + 1) * H // 4 - 10
        x = 6
        while x < W - 10:
            w = R.randint(14, 30)
            h = R.randint(70, 110)
            c = R.choice(["#8a2a22", "#2a3a6a", "#2a5a3a", "#6a4a2a", "#a88a3a", "#4a2a4a", "#7a6a5a"])
            d.rectangle([x, y1 - h, x + w, y1], fill=hx(c, R.uniform(0.8, 1.1)), outline=hx("#1a1008"), width=2)
            d.line([x + 3, y1 - h + 12, x + w - 3, y1 - h + 12], fill=hx("#d8b84a"), width=2)
            x += w + 1
        d.rectangle([0, y1, W, y1 + 10], fill=hx("#5a3a22"))
    save(im, name)


def concrete(name, base="#8e8c88"):
    plaster(name, base, cracks=7, stains=70)


def door_face(name, W=1024):
    im = Image.new("RGB", (W, W), hx("#2a2a2a"))
    d = ImageDraw.Draw(im)
    c = W / 2
    for rr, col in ((W * 0.5, "#a8823a"), (W * 0.46, "#d8aa4a"), (W * 0.36, "#c4963e"), (W * 0.33, "#e2b85a"), (W * 0.12, "#a8823a")):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], fill=hx(col), outline=hx("#5a3a10"), width=5)
    for i in range(24):
        a = i * 2 * math.pi / 24
        x, y = c + math.cos(a) * W * 0.41, c + math.sin(a) * W * 0.41
        d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=hx("#8a6a2a"), outline=hx("#3a2a08"), width=3)
    d.rectangle([c - 150, c - 300, c + 150, c - 230], fill=hx("#2a2a2a"), outline=hx("#5a3a10"), width=4)
    for k in range(4):
        x = c - 120 + k * 80
        d.ellipse([x - 26, c - 292, x + 26, c - 238], fill=hx("#f4f0e0"), outline=hx("#2a2a2a"), width=3)
    im = grime(im, 60, (60, 40, 10), (10, 50))
    save(im, name)


bricks("bata_merah", "#a8503c", "#c8b8a0")
bricks("bata_got", "#7a4a38", "#5a5448", moss=True)
layered("tanah", "#b07844", ["#d8a46a", "#8a5a32", "#c49060", "#9a9a8a"], roots=True)
layered("kerikil", "#8a8478", ["#b4ac9c", "#6a6458", "#d0c8b4"], dots=(4, 12), n=700)
layered("lempung", "#9a5a34", ["#c47a48", "#7a4224"], dots=(2, 6), n=160)
layered("batu", "#6a6a70", ["#8a8a92", "#4a4a52", "#a2a2aa"], dots=(14, 34), n=90)
layered("aspal", "#3e3e44", ["#5a5a60", "#2a2a2e"], dots=(1, 3), n=900)
cobble("batu_jalan")
ashlar("fasad_batu")
plaster("plester_oker", "#e2b06a")
plaster("plester_merah", "#d88a6a")
plaster("plester_kuning", "#ecd08a")
plaster("plester_krem", "#e8dcc4")
concrete("beton")
drawers("laci_deposit")
starburst("lantai_brankas")
wallpaper("wallpaper")
sign("papan_banque", "BANQUE", "#e8c860", "#1e2a3a", border="#e8c860")
sign("papan_cafe", "CAFÉ DU PORT", "#f4ecd8", "#7a2a22", size=110)
sign("papan_palais", "PALAIS DE JUSTICE", "#2a2218", "#e6d6b4", size=90)
sign("papan_photo", "PHOTO", "#f8e8b0", "#2a3a2a", size=150, border="#f8e8b0")
sewer_map("peta_got")
photos("deretan_foto")
books("rak_buku")
door_face("muka_pintu")
print("tekstur ->", OUT, len(os.listdir(OUT)))

# lantai brankas versi tergeser setengah (pusat sinar di tengah box UV)
import numpy as _np
_a = _np.array(Image.open(os.path.join(OUT, "lantai_brankas.png")))
Image.fromarray(_np.roll(_np.roll(_a, _a.shape[0] // 2, 0), _a.shape[1] // 2, 1)).save(os.path.join(OUT, "lantai_brankas_roll.png"))
sign("papan_coffres", "SALLE DES COFFRES", "#f4ecd8", "#2a3442", size=88, border="#c9a24a")
sign("papan_danger", "DANGER", "#1a1a1a", "#e8c032", size=150, border="#1a1a1a")
