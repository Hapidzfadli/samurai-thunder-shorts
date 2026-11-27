"""Assemble still-only design review sheets. Requires python3-pil."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math, zipfile
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'exports/riset'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def sheet(group, indices, title, subtitle, name, cols=3, w=480):
    h=round(w*1920/1080); gap=18; top=130; bot=50
    rows=math.ceil(len(indices)/cols)
    im=Image.new('RGB',(cols*w+(cols+1)*gap,top+rows*(h+gap)+bot),'#f2eadb')
    d=ImageDraw.Draw(im)
    d.text((25,22),title,font=ImageFont.truetype(BOLD,32),fill='#29262d')
    d.text((25,72),subtitle,font=ImageFont.truetype(FONT,18),fill='#665c50')
    for k,v in enumerate(indices):
        src=ROOT/f'out/suntzu/{group}/{v}.png'
        tile=Image.open(src).convert('RGB').resize((w,h),Image.Resampling.LANCZOS)
        x=gap+(k%cols)*(w+gap);y=top+(k//cols)*(h+gap)
        im.paste(tile,(x,y))
    d.text((25,im.height-33),'SUN TZU / DESAIN 01 - Belum audio, animasi final, atau render video penuh.',font=ImageFont.truetype(FONT,17),fill='#665c50')
    path=OUT/name;im.save(path,optimize=True);print('CONTACT_OK',path,im.size)
sheet('latar',range(6),'LATAR ISTANA WU / 6 SUDUT','Render aktual aset Blender GLB di Remotion. Bentuk bangunan adalah interpretasi artistik.','suntzu-latar.png')
sheet('properti',[6,7,8,9],'DETAIL PROPERTI & AKSI','Genderang, bilah bambu, cawan, tombak dan meja komando. Objek aksi tetap terpisah.','suntzu-properti.png',cols=2,w=540)
sheet('story',range(8),'RANCANGAN 8 ADEGAN / POSE AWAL','Bukan kontak frame final. Rencana gerakan kamera lengkap ada di suntzu-rancangan.md.','suntzu-adegan.png',cols=4,w=432)
files=['suntzu-karakter.png','suntzu-ekspresi.png','suntzu-latar.png','suntzu-properti.png','suntzu-adegan.png','suntzu-rancangan.md','suntzu-model-notes.md']
with zipfile.ZipFile(ROOT/'exports/suntzu-preview-paket.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in files:z.write(OUT/name,arcname=name)
print('PACKAGE_OK')
