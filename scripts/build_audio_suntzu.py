"""Sun Tzu: Kelelawar-compatible timing, VoxCPM2 dialog and restrained soundscape.
--estimate writes timing only, without claiming generated audio.
"""
import argparse, json, math, re, subprocess, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
FPS=30
EVENTS={
 'drum':('first',0,'Genderang',-2), 'right':('first',0,'kanan',-2),
 'laugh':('first',0,'tertawa',-2), 'left':('second',0,'kiri',-2),
 'laugh2':('second',0,'tawa',-2), 'sentence':('sentence',1,'hukuman',-2),
 'death':('sentence',1,'mati',-2), 'stop':('stop',0,'menghentikan',-2),
 'refuse':('stop',1,'menolak',-2), 'turn':('turn',1,'berbelok',-2),
 'replacement':('turn',0,'pengganti',-2), 'fear':('turn',2,'takut',-2),
}
SCENE_CFG={k:dict(pre=.45,post=.55,gap=.25) for k in ['hook','leaders','first','second','sentence','stop','turn','end']}
SCENE_CFG['hook']['pre']=.8
SCENE_CFG['end']['post']=1.8
SCENE_CFG['sentence']['gap']=.5

def clean(w): return re.sub(r'[^a-z]','',w.lower())
def estimated(text):
    words=text.split(); weights=[.12+.065*len(clean(w)) for w in words]
    scale=(len(words)/2.12)/sum(weights)
    out=[]; t=.08
    for w,d in zip(words,weights):
        d*=scale; out.append((w,t,t+d*.88)); t+=d
    return out,t+.12

def align(text,heard,d):
    # Existing production aligner maps script words to Whisper boundaries.
    import importlib.util
    spec=importlib.util.spec_from_file_location('suntzu_emu',ROOT/'scripts/build_audio_emu.py')
    mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod.align_script(text,heard,d)

def build(estimate=False):
    script=json.loads((ROOT/'scripts/naskah/suntzu.json').read_text())
    actual=None if estimate else json.loads((ROOT/'src/suntzu_voice.json').read_text())
    scenes={}; lines={}; caps=[]; clips=[]; cursor=0
    for si,sc in enumerate(script):
        name=sc['scene']; cfg=SCENE_CFG[name]; t=cfg['pre']; rows=[]
        for i,(style,text,voice) in enumerate(sc['lines']):
            if i:t+=cfg['gap']
            if estimate: words,d=estimated(text)
            else:
                ln=actual['scenes'][si]['lines'][i]
                with wave.open(str(ROOT/ln['file'])) as wf:
                    sr=wf.getframerate(); raw=wf.readframes(wf.getnframes()); d=wf.getnframes()/sr
                words=align(text,ln['wordsSec'],d)
                clips.append((cursor+t,raw,sr,voice))
            local=[{'w':w,'from':round((t+a)*FPS),'to':round((t+b)*FPS)} for w,a,b in words]
            rows.append(dict(voice=voice,style=style,text=text,**{'from':round(t*FPS),'to':round((t+d)*FPS)},words=local))
            for w in local:
                caps.append(dict(text=w['w'],startFrame=round(cursor*FPS)+w['from'],endFrame=round(cursor*FPS)+max(w['from']+2,w['to']),highlight=clean(w['w']) in {'mati','tertawa','takut','kekejaman','disiplin'},voice=voice))
            t+=d
        duration=round((t+cfg['post'])*FPS)
        scenes[name]=dict(startFrame=round(cursor*FPS),durationInFrames=duration)
        lines[name]=rows; cursor+=duration/FPS
    events={}
    for key,(sc,i,word,off) in EVENTS.items():
        hits=[w for w in lines[sc][i]['words'] if clean(w['w'])==clean(word)]
        if not hits: raise ValueError(f'Event word missing: {key}')
        events[key]=max(0,hits[0]['from']+off)
    timing=dict(fps=FPS,totalDurationSec=round(cursor,3),totalFrames=round(cursor*FPS),order=list(scenes),scenes=scenes,lines=lines,events=events,captions=caps)
    (ROOT/'src/suntzu_timing.json').write_text(json.dumps(timing,ensure_ascii=False,indent=1)+'\n')
    print(('ESTIMATE' if estimate else 'ACTUAL'),cursor,'seconds',flush=True)
    if estimate:return
    import numpy as np
    from scipy.signal import resample_poly
    sr=44100; n=round(cursor*sr); vo=np.zeros((n,2),np.float32); bed=np.zeros_like(vo); fx=np.zeros_like(vo)
    def put(dst,y,t,gain=1,pan=0):
        a=max(0,round(t*sr)); m=min(len(y),len(dst)-a)
        if m<=0:return
        dst[a:a+m,0]+=y[:m]*gain*math.sqrt((1-pan)/2)
        dst[a:a+m,1]+=y[:m]*gain*math.sqrt((1+pan)/2)
    for t,raw,fs,voice in clips:
        y=np.frombuffer(raw,np.int16).astype(np.float32)/32768
        y=resample_poly(y,sr//math.gcd(sr,fs),fs//math.gcd(sr,fs))
        put(vo,y,t,1,-.12 if voice=='dodi' else .12)
    rng=np.random.default_rng(29)
    def drum():
        t=np.arange(round(.6*sr))/sr
        return (.6*np.sin(2*np.pi*(95*t-22*t*t))+.1*rng.normal(size=len(t)))*np.exp(-t*12)
    def pluck(f):
        t=np.arange(round(1.4*sr))/sr
        return sum(np.sin(2*np.pi*f*h*t)*np.exp(-t*(3+h))/h**1.5 for h in [1,2,3,4])*.08
    def glob(ev):return scenes[EVENTS[ev][0]]['startFrame']/FPS+events[ev]/FPS
    # No laughter track or execution effects: laughter is narrated, never suffering as a gag.
    for ev in ['drum','left']:put(fx,drum(),glob(ev)+2/FPS,.25)
    # Stylized pentatonic plucked strings, not presented as authentic period music.
    notes=[196,220,261.63,293.66,329.63,261.63,220,196]
    for i,t in enumerate(np.arange(0,cursor,1.5)):
        if scenes['sentence']['startFrame']/FPS <= t < scenes['turn']['startFrame']/FPS:continue
        put(bed,pluck(notes[i%len(notes)]),t,.6,(-1)**i*.3)
    from scipy.ndimage import uniform_filter1d
    env=uniform_filter1d(np.max(np.abs(vo),axis=1),4410)
    bed*=np.clip(1-env*12,.18,1)[:,None]
    mixed=vo+bed+fx
    fade=min(sr, n//2); mixed[-fade:]*=np.linspace(1,0,fade)[:,None]
    out=ROOT/'out/voice/suntzu';out.mkdir(parents=True,exist_ok=True)
    rawfile=out/'mix_pre_loudnorm.wav'
    with wave.open(str(rawfile),'wb') as wf:
        wf.setnchannels(2);wf.setsampwidth(2);wf.setframerate(sr);wf.writeframes((np.clip(mixed,-1,1)*32767).astype(np.int16).tobytes())
    dest=ROOT/'public/audio/suntzu_master.mp3';dest.parent.mkdir(parents=True,exist_ok=True)
    probe=subprocess.run(['ffmpeg','-hide_banner','-i',str(rawfile),'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    report=json.loads(probe.stderr[probe.stderr.rfind('{'):])
    filt='loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true'.format(**report)
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(rawfile),'-af',filt,'-ar','44100','-b:a','192k',str(dest)],check=True)
    (out/'loudnorm_input.json').write_text(json.dumps(report,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--estimate',action='store_true');a=p.parse_args();build(a.estimate)
