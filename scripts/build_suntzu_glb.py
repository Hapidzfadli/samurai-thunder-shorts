"""PREVIEW: interpreted Wu court, Spring and Autumn period; not a reconstruction.
Export only: blender -b --python scripts/build_suntzu_glb.py -- public/models/suntzu-palace.glb
Shared school helpers supply geometry, actual UVs and packed Principled textures.
Blender (X,Y,Z) -> THREE (X,Z,-Y). No lights, characters, audio or animation.
"""
import os, sys, math, importlib.util, json
import bpy
import numpy as np
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT = os.path.abspath(args[0] if args else 'public/models/suntzu-palace.glb')
spec = importlib.util.spec_from_file_location('school_helpers', os.path.join(HERE,'build_school_glb.py'))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
PI = math.pi

def B(n,p,d,m,c='Architecture',rot=(0,0,0),uv=.5):
    return S.add_box(n,p,d,m,c,rot=rot,uv_scale=uv)
def C(n,p,r,h,m,c='Architecture',r2=None,rot=(0,0,0),seg=12):
    return S.add_cylinder(n,p,r,r if r2 is None else r2,h,seg,m,c,rot)
def I(n,p,r,m,c='Garden',scale=(1,1,1),seed=1):
    return S.add_icosphere(n,p,r,2,m,c,scale=scale,jitter=.12,seed=seed)
def bar(n,a,b,w,m,c='Architecture'):
    a,b=Vector(a),Vector(b); d=b-a
    return B(n,tuple((a+b)/2),(w,w,d.length),m,c,tuple(d.to_track_quat('Z','Y').to_euler()))
def empty(n,p,**extras):
    o=bpy.data.objects.new(n,None);o.location=p;S.link_obj(o,'Waypoints')
    for k,v in extras.items():o[k]=v
    return o

def texture(n,base,kind):
    rng=np.random.default_rng(31);yy,xx=np.mgrid[:256,:256]
    v=.91+.14*rng.random((256,256))+.035*np.sin(xx*.14+yy*.07)
    if kind=='tile':v*=np.where((yy%32>28)|(xx%24<2),.53,1)
    if kind=='wood':v*=.86+.14*np.sin(xx*.5+.5*np.sin(yy*.025))
    if kind=='mat':v*=np.where((xx%6==0)|(yy%9==0),.72,1)
    a=np.ones((256,256,4),np.float32);a[:,:,:3]=np.clip(np.array(base)[None,None,:]*v[:,:,None],0,1)
    return S.make_image_from_rgba(n,a)
def materials():
    S.init_materials()
    for n,col,kind in [('Wu_Earth',(.49,.36,.22),'earth'),('Wu_Rammed',(.63,.49,.32),'earth'),('Wu_RedWood',(.37,.105,.075),'wood'),('Wu_DarkWood',(.17,.095,.048),'wood'),('Wu_Tile',(.26,.29,.29),'tile'),('Wu_Mat',(.61,.49,.29),'mat'),('Wu_Panel',(.38,.24,.12),'wood')]:
        S.make_mat(n,col,roughness=.92,image=texture('Tex_'+n,col,kind))
    for n,col in [('Wu_Stone',(.43,.42,.35)),('Wu_Plas',(.71,.62,.44)),('Wu_Cloth',(.40,.12,.075)),('Wu_Indigo',(.14,.21,.24)),('Wu_Clay',(.39,.25,.14)),('Wu_Patina',(.18,.34,.29)),('Wu_Hide',(.62,.49,.31)),('Wu_Ink',(.055,.048,.032))]:S.make_mat(n,col,roughness=.9)
    S.make_mat('Wu_Bronze',(.36,.29,.12),roughness=.55,metallic=.55)
    S.make_mat('Wu_Flame',(1,.58,.12),emission=(1,.4,.06),emission_strength=1)

def roof(n,x,y,z,w,d,h,c):
    S.add_hip_roof(n+'_GrayTiles',(x,y,z),w,d,h,.62,'Wu_Tile',c)
    # Low straight eaves, restrained ridge; no imperial yellow roofs/dragons.
    for sy in [-1,1]:
        B(n+'_Fascia'+str(sy),(x,y+sy*d/2,z),(w,.18,.19),'Wu_DarkWood',c)
        # exposed rafter ends beneath eaves, lightweight repeated geometry
        for j in range(int(w/.65)):
            B(n+'_Rafter'+str(sy)+'_'+str(j),(x-w/2+.32+j*.65,y+sy*(d/2-.25),z-.12),(.10,.65,.12),'Wu_RedWood',c)
    C(n+'_Ridge',(x,y,z+h+.045),.12,w*.62,'Wu_Tile',c,rot=(0,PI/2,0))
    for sx in [-1,1]:B(n+'_SideFascia'+str(sx),(x+sx*w/2,y,z),(.16,d,.19),'Wu_DarkWood',c)

def post(n,x,y,z,h,c):
    C(n+'_StoneFoot',(x,y,z+.12),.31,.24,'Wu_Stone',c)
    C(n,(x,y,z+h/2),.19,h,'Wu_RedWood',c,seg=10)
    B(n+'_Cap',(x,y,z+h-.12),(.63,.52,.20),'Wu_DarkWood',c)
    B(n+'_Bracket',(x,y,z+h-.32),(.82,.24,.12),'Wu_RedWood',c)

def table(n,x,y,z,w,d,c):
    B(n+'_Top',(x,y,z+.60),(w,d,.12),'Wu_DarkWood',c)
    for sx in [-1,1]:
        for sy in [-1,1]:B(n+'_Leg'+str(sx)+str(sy),(x+sx*(w/2-.18),y+sy*(d/2-.16),z+.29),(.13,.13,.58),'Wu_RedWood',c)

def jar(n,x,y,z,s=1,c='Garden'):
    # Revolved hollow vessel with actual lip and dark interior, not a capped cylinder.
    profile=[(.20,0),(.34,.12),(.43,.47),(.34,.74),(.19,.88),(.21,.98),(.15,.98),(.14,.88),(.27,.70),(.33,.45),(.25,.18),(0,.16)]
    verts=[];faces=[];N=16
    for r,h in profile:
        for i in range(N):a=i*2*PI/N;verts.append((x+s*r*math.cos(a),y+s*r*math.sin(a),z+s*h))
    for j in range(len(profile)-1):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(n,me);me.materials.append(S.MATS['Wu_Clay']);S.link_obj(o,c)
    for h in [.21,.68]:C(n+'_Band'+str(h),(x,y,z+s*h),s*(.375 if h==.68 else .39),s*.025,'Wu_DarkWood',c)

def lamp(n,x,y,z,c):
    C(n+'_Foot',(x,y,z+.04),.20,.08,'Wu_Bronze',c)
    C(n+'_Stem',(x,y,z+.27),.045,.46,'Wu_Bronze',c)
    C(n+'_Dish',(x,y,z+.51),.25,.09,'Wu_Bronze',c,r2=.30)
    C(n+'_Oil',(x,y,z+.56),.235,.012,'Wu_Ink',c)
    I(n+'_Flame',(x+.12,y,z+.66),.065,'Wu_Flame',c,scale=(.5,.7,1.8))

def banner(n,x,y,z,c):
    C(n+'_Pole',(x,y,z+2.1),.052,4.2,'Wu_DarkWood',c,seg=8)
    bar(n+'_Crossbar',(x-.12,y,z+3.85),(x+1.05,y,z+3.85),.045,'Wu_Bronze',c)
    B(n+'_Cloth',(x+.47,y,z+3.13),(.95,.025,1.40),'Wu_Cloth',c)
    for j in [-1,1]:B(n+'_Border'+str(j),(x+.47+j*.40,y-.02,z+3.13),(.045,.025,1.34),'Wu_Mat',c)
    # Abstract geometric device, deliberately not an asserted historical Wu emblem.
    for j in [-1,1]:B(n+'_Device'+str(j),(x+.47,y-.036,z+3.2),(.38,.025,.055),'Wu_Mat',c,rot=(0,j*.7,0))

def hall():
    c='Hall';x=0;y=11;z=.95
    B('Hall_RammedEarthPlatform',(x,y,.36),(17,11,.72),'Wu_Rammed',c)
    B('Hall_StoneCoping',(x,y,.79),(17.2,11.2,.18),'Wu_Stone',c)
    B('Hall_TimberFloor',(x,y,.91),(15.7,9.8,.10),'Floor_Wood',c,uv=.15)
    for k in range(4):B('Hall_FrontStep'+str(k),(0,4.65+k*.32,.12+k*.21),(5.0,1.8-k*.28,.24),'Wu_Stone',c)
    for xx in [-7.5,-3.8,3.8,7.5]:
        for yy in [6.5,15.5]:post('Hall_Column_'+str(xx)+'_'+str(yy),xx,yy,z,3.8,c)
    for yy in [6.5,15.5]:B('Hall_Header'+str(yy),(0,yy,4.60),(15.8,.28,.32),'Wu_RedWood',c)
    # Rear wall and framed inset panel bays.
    B('Hall_RearWall',(0,15.65,2.75),(15.2,.20,3.6),'Wu_Plas',c)
    for i in range(8):
        xx=-6.65+i*1.9
        B('Hall_RearPanel'+str(i),(xx,15.50,2.18),(1.72,.10,2.2),'Wu_Panel',c)
        for zz in [1.12,3.22]:B('Hall_PanelRail'+str(i)+str(zz),(xx,15.40,zz),(1.8,.12,.09),'Wu_RedWood',c)
        B('Hall_PanelStile'+str(i),(xx-.88,15.39,2.18),(.09,.14,2.25),'Wu_RedWood',c)
        for j in range(3):B('Hall_PanelMotif'+str(i)+str(j),(xx,15.40,2.25+j*.22),(.54,.025,.045),'Wu_Mat',c)
    for sx in [-1,1]:
        xx=sx*7.55
        wall=B('Hall_SideWall'+str(sx),(xx,11,2.75),(.18,9.2,3.6),'Wu_Plas',c)
        cuts=[B('CUT_SideWindow'+str(sx)+str(j),(xx,yy,3.10),(.8,2.1,1.6),'Wu_Plas',c) for j,yy in enumerate([8.8,13])]
        S.add_boolean_cut(wall,cuts)
        B('Hall_SideWainscot'+str(sx),(xx-sx*.13,11,1.52),(.10,9.0,1.05),'Wu_Panel',c)
        for yy in [8.8,13]:
            B('Hall_WindowSill'+str(sx)+str(yy),(xx,yy,2.28),(.43,2.25,.12),'Wu_RedWood',c)
            for dy in [-.72,0,.72]:B('Hall_WindowLattice'+str(sx)+str(yy)+str(dy),(xx,yy+dy,3.10),(.09,.055,1.6),'Wu_DarkWood',c)
    # Front built in separate bays: central 7.2m portal is genuinely empty.
    for sx in [-1,1]:
        B('Hall_FrontPanel'+str(sx),(sx*5.7,6.5,2.20),(3.4,.16,2.5),'Wu_Panel',c)
        for j in range(6):B('Hall_FrontSlat'+str(sx)+str(j),(sx*5.7-1.45+j*.58,6.38,2.28),(.065,.09,2.50),'Wu_RedWood',c)
        jar('Hall_Jar'+str(sx),sx*6.3,13.8,z,1.1,c)
        lamp('Hall_OilLamp'+str(sx),sx*3.1,13.4,z,c)
    # Exposed beams; no artificial opaque ceiling blocking interior views.
    for xx in [-5.6,0,5.6]:B('Hall_RoofBeam'+str(xx),(xx,11,4.65),(.23,9.7,.30),'Wu_DarkWood',c)
    roof('Hall_Roof',0,11,4.85,18.4,12.1,1.8,c)
    B('Throne_LowDais',(0,14,.99),(3.4,2,.18),'Wu_DarkWood',c)
    B('Throne_Seat',(0,14.25,1.19),(1.9,1,.23),'Wu_RedWood',c)
    B('Throne_Cushion',(0,14.20,1.35),(1.7,.8,.10),'Wu_Cloth',c)
    B('Throne_LowBack',(0,14.72,1.70),(2,.13,.9),'Wu_DarkWood',c)
    for sx in [-1,1]:B('Throne_Arm'+str(sx),(sx*.95,14.2,1.56),(.13,1.0,.14),'Wu_RedWood',c)
    table('King_LowTable',0,12.65,z,2.6,.9,c)
    for xx,yy in [(-3.7,10.3),(3.7,10.3),(-3.7,12),(3.7,12),(0,10)]:B('Hall_Mat'+str(xx)+str(yy),(xx,yy,.99),(1.6,1.25,.045),'Wu_Mat',c)
    for i in range(12):B('ACTION_BambooSlip_'+str(i),(-.65+i*.105,12.65,1.63),(.085,.52,.018),'Wu_Mat','ActionProps')
    for yy in [12.48,12.82]:B('BambooSlip_Cord'+str(yy),(-.07,yy,1.645),(1.28,.014,.012),'Wu_Ink',c)
    C('ACTION_KingCup',(.88,12.63,1.72),.09,.15,'Wu_Bronze','ActionProps')

def pavilion():
    c='CommandPavilion';x=-13;y=1;z=.40
    B('Command_StonePlatform',(x,y,.18),(8,7,.36),'Wu_Stone',c)
    B('Command_WoodFloor',(x,y,.39),(7.6,6.6,.08),'Floor_Wood',c,uv=.17)
    for dx in [-3.5,3.5]:
        for dy in [-2.9,2.9]:post('Command_Post'+str(dx)+str(dy),x+dx,y+dy,z,3.35,c)
    for dy in [-2.9,2.9]:B('Command_Header'+str(dy),(x,y+dy,3.72),(7.8,.24,.26),'Wu_RedWood',c)
    roof('Command_Roof',x,y,3.9,9.2,8,1.25,c)
    table('Command_LowTable',x,y+1,z,2.8,1.2,c)
    B('Command_Mat',(x,y-.4,z+.06),(2.6,1.2,.035),'Wu_Mat',c)
    # Independent movable command baton, tablets and tally blocks.
    C('ACTION_CommandBaton',(x+.7,y+.8,1.13),.04,.85,'Wu_DarkWood','ActionProps',rot=(PI/2,0,.25),seg=8)
    for j in range(6):B('ACTION_OrderTablet'+str(j),(x-.9+j*.15,y+1.1,1.08),(.12,.65,.025),'Wu_Mat','ActionProps')
    lamp('Command_Lamp',x+1.8,y+1.8,z,c)
    jar('Command_WaterJar',x-2.8,y+2,z,.85,c)
    banner('Command_Banner',x-3.1,y+2.2,z,c)
    B('Command_RearLowPanel',(x,y+2.9,1.1),(6.8,.12,1.3),'Wu_Panel',c)
    for j in range(9):B('Command_PanelUpright'+str(j),(x-3.2+j*.8,y+2.82,1.1),(.06,.10,1.25),'Wu_RedWood',c)

def props():
    c='TrainingProps';x=10.5;y=2.5
    # Bronze bell: hollow open bottom via lathed ring profile.
    for dx in [-1.2,1.2]:post('Bell_Frame'+str(dx),x+dx,y,0,2.75,c)
    B('Bell_Crossbeam',(x,y,2.76),(3,.22,.23),'Wu_RedWood',c)
    C('Bell_Hanger',(x,y,2.38),.055,.6,'Wu_Bronze',c)
    # Open-bottom elliptical shell with internal cavity.
    N=20;verts=[];faces=[]
    for r,z in [(.69,.92),(.58,1.65),(.35,2.05),(.28,2.16),(.22,2.12),(.28,2.01),(.50,1.65),(.61,.92)]:
        for i in range(N):a=2*PI*i/N;verts.append((x+r*math.cos(a),y+.7*r*math.sin(a),z))
    for j in range(7):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    me=bpy.data.meshes.new('BellShell');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('ACTION_BronzeBell',me);me.materials.append(S.MATS['Wu_Bronze']);S.link_obj(o,'ActionProps')
    for i in [-1,0,1]:
        for j in range(3):I('Bell_Boss'+str(i)+str(j),(x+i*.27,y-.40,1.26+j*.19),.045,'Wu_Patina',c,scale=(1,.55,1))
    C('ACTION_BellMallet',(x+1.8,y-.25,1),.045,1.1,'Wu_DarkWood','ActionProps',rot=(.2,.3,0),seg=8)
    I('ACTION_BellMalletHead',(x+1.96,y-.36,1.5),.14,'Wu_DarkWood','ActionProps')
    # Drum face is normal toward courtyard/south, with bronze body and hide skin.
    dx=-8;dy=-3
    for sx in [-1,1]:
        bar('Drum_Stand'+str(sx),(dx+sx*.7,dy-.45,.05),(dx+sx*.55,dy,1.6),.15,'Wu_RedWood',c)
    C('ACTION_CommandDrum',(dx,dy,1.6),.70,.88,'Wu_Bronze','ActionProps',rot=(PI/2,0,0),seg=20)
    for sy in [-1,1]:
        C('Drum_Hide'+str(sy),(dx,dy+sy*.455,1.6),.65,.035,'Wu_Hide',c,rot=(PI/2,0,0),seg=20)
        for j in range(12):
            a=j*PI/6;I('Drum_Stud'+str(sy)+str(j),(dx+.63*math.cos(a),dy+sy*.48,1.6+.63*math.sin(a)),.035,'Wu_Bronze',c)
    for i in range(2):C('ACTION_Drumstick'+str(i),(dx+.95+i*.16,dy-.35,1),.035,.8,'Wu_DarkWood','ActionProps',rot=(0,.4,0),seg=8)
    # Spear rack on east flank, no weapons across camera/character lanes.
    x=12;y=7
    for xx in [x-1.5,x+1.5]:
        B('SpearRack_Foot'+str(xx),(xx,y,.08),(.6,1,.16),'Wu_DarkWood',c)
        B('SpearRack_Post'+str(xx),(xx,y,.9),(.14,.14,1.8),'Wu_RedWood',c)
    for zz in [.45,1.5]:B('SpearRack_Rail'+str(zz),(x,y,zz),(3.4,.12,.12),'Wu_DarkWood',c)
    for j in range(6):
        xx=x-1.22+j*.48
        shaft=C('ACTION_Spear_'+str(j),(xx,y-.12,1.44),.032,2.85,'Wu_DarkWood','ActionProps',seg=8)
        C('ACTION_SpearHead_'+str(j),(xx,y-.12,2.97),.09,.32,'Wu_Bronze','ActionProps',r2=0,seg=4)
    for i,(x,y) in enumerate([(-5,-8),(6,-8),(-8,4),(12,10)]):banner('Court_Banner'+str(i),x,y,0,c)

def landscape():
    c='Garden'
    B('Terrain',(0,3,-.22),(67,65,.4),'Grass_Main',c)
    B('Palace_RammedEarthCourt',(0,1,-.01),(36,35,.20),'Wu_Earth',c,uv=.26)
    B('Training_CompactedSoil',(0,-3,.105),(16,14,.045),'Wu_Earth','Training',uv=.38)
    # Two narrow stone edge walks; the central training ground remains bare earth.
    for sx in [-1,1]:
        for j in range(15):B('Walk_Paver'+str(sx)+str(j),(sx*8.6,-11+j*1.45,.13),(1.0,1.3,.10),'Wu_Stone',c)
    for i in range(14):B('Gateway_ApproachStone'+str(i),(-1.5+(i%3)*1.5,-22+(i//3)*1.5,.04),(1.35,1.35,.08),'Wu_Stone',c)
    # Enclosure front wall leaves a true 5.6m-wide gateway void.
    for sx in [-1,1]:
        B('Enclosure_Front'+str(sx),(sx*10.5,-16,1.3),(15.4,.48,2.6),'Wu_Rammed',c)
        B('Enclosure_Coping'+str(sx),(sx*10.5,-16,2.65),(15.7,.64,.16),'Wu_Tile',c)
        B('Enclosure_Side'+str(sx),(sx*18,1,1.3),(.48,34,2.6),'Wu_Rammed',c)
        B('Enclosure_SideCoping'+str(sx),(sx*18,1,2.65),(.64,34,.16),'Wu_Tile',c)
    B('Enclosure_Rear',(0,18,1.3),(36,.48,2.6),'Wu_Rammed',c)
    for sx in [-1,1]:post('Gateway_Post'+str(sx),sx*2.8,-16,0,3.5,'Gateway')
    B('Gateway_Lintel',(0,-16,3.5),(6.5,.38,.35),'Wu_RedWood','Gateway')
    roof('Gateway_Roof',0,-16,3.75,8,4,1.0,'Gateway')
    # Door leaves pivoted OUT of central opening, can be animated independently.
    for sx in [-1,1]:
        o=B('ACTION_GateLeaf'+str(sx),(sx*3.0,-14.85,1.5),(.16,2.3,2.8),'Wu_DarkWood','ActionProps')
        for zz in [.4,2.4]:B('GateLeaf_Brace'+str(sx)+str(zz),(sx*3.12,-14.85,zz),(.10,2.25,.12),'Wu_RedWood','Gateway')
    for i,(x,y,s) in enumerate([(-23,-12,1.1),(23,-9,1),(-22,10,1.25),(23,13,1.2),(-11,19,1.1),(12,22,1.2),(-26,24,1.4),(28,27,1.5)]):
        C('Tree_Trunk'+str(i),(x,y,1.65*s),.24*s,3.3*s,'Tree_Trunk',c,r2=.14*s,seg=8)
        for j,(dx,dy,dz,r) in enumerate([(0,0,4.2,1.9),(-1.3,.25,3.65,1.4),(1.1,-.3,3.7,1.5)]):
            bar('Tree_Branch'+str(i)+str(j),(x,y,2*s),(x+dx*s,y+dy*s,dz*s),.16*s,'Tree_Trunk',c)
            I('Tree_Canopy'+str(i)+str(j),(x+dx*s,y+dy*s,dz*s),r*s,['Leaf_A','Leaf_B','Leaf_C'][j],c,scale=(1.2,.85,.63),seed=i*5+j)
    for i,(x,y) in enumerate([(-15,-9),(-13,-10),(15,-8),(16,-6),(-12,15),(14,14),(-23,5),(22,20)]):
        I('Garden_Rock'+str(i),(x,y,.3),.8+(i%3)*.25,'Wu_Stone',c,scale=(1.4,.8,.85),seed=50+i)
    for i,(x,y) in enumerate([(-16,7),(-15,8),(15,1),(15,2),(-6,16),(7,16)]):jar('Court_StorageJar'+str(i),x,y,.10,.8+(i%3)*.22,c)
    # Far low hills provide depth without heavy foliage or opaque sky geometry.
    for i in range(6):I('Far_Hill'+str(i),(-70+i*29,58,-3),24,'Leaf_C',c,scale=(1.6,1,.42),seed=100+i)

# Vertical-fov values for THREE PerspectiveCamera; all in Blender coordinates here.
CAMERAS={
 'Exterior':((0,-40,13),(0,1,2.3),52),
 'Hall':((1.1,7.7,2.6),(0,13.6,1.9),57),
 'Training':((4,-12,3.6),(-.5,-1,1.2),57),
 'Command':((-11,-5,2.6),(-13,1.3,1.45),56),
 'PropsDetail':((8.7,-1.0,2.0),(10.5,2.5,1.5),48),
}
CHARACTERS={'SunTzu_Training':(0,1,.14),'CaptainA':(-2.5,-2,.14),'CaptainB':(2.5,-3,.14),'King':(0,14.15,1.4),'SunTzu_Hall':(0,10,.99),'SunTzu_Command':(-13,.1,.44)}
def main():
    S.clear_scene();materials();landscape();hall();pavilion();props()
    # Keep attached moving components independently addressable as well.
    for o in list(bpy.data.objects):
        if o.type=='MESH' and o.name.startswith(('Drum_Hide','Drum_Stud','Bell_Boss','GateLeaf_Brace','BambooSlip_Cord')):
            o.name='ACTION_'+o.name
    for n,(p,t,fov) in CAMERAS.items():
        empty('WP_Cam_'+n,p,fov=fov,target_blender=list(t),target_three=[t[0],t[2],-t[1]])
        empty('WP_Target_'+n,t)
    for n,p in CHARACTERS.items():empty('WP_Char_'+n,p)
    for i,p in enumerate([(0,-23,2.2),(0,-18,2.2),(0,-14,2.2),(0,-9,2.2),(0,3,2.4),(0,5.7,2.6),(0,8,2.6)]):empty('WP_Cam_FlyIn_'+str(i),p)
    # Merge only static components by collection+material, preserving all action meshes.
    from collections import defaultdict
    groups=defaultdict(list)
    for o in list(bpy.data.objects):
        if o.type=='MESH' and not o.name.startswith('ACTION_'):
            groups[(o.users_collection[0].name,o.data.materials[0].name)].append(o)
    for (c,m),objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]
        if len(objs)>1:bpy.ops.object.join()
        bpy.context.object.name=c+'__'+m
    for mat in S.MATS.values():mat.use_backface_culling=False
    os.makedirs(os.path.dirname(OUT),exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_yup=True,export_materials='EXPORT',export_texcoords=True,export_normals=True,export_apply=True,export_extras=True)
    meshes=[o for o in bpy.data.objects if o.type=='MESH'];tris=0
    for o in meshes:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    print('SUNTZU_EXPORT',json.dumps({'path':OUT,'bytes':os.path.getsize(OUT),'meshes':len(meshes),'triangles':tris,'cameras':CAMERAS}))
if __name__=='__main__':main()
