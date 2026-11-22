"""Measure how expressive each narrated line is (pitch range, movement, ending, speed).
Usage: python3 scripts/analyze_intonation.py scripts/build_audio_kabayan.py"""
import importlib.util, sys, json
from pathlib import Path
import numpy as np
import pyworld as pw

ROOT = Path(__file__).resolve().parent.parent
mod_path = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("bm", mod_path)
bm = importlib.util.module_from_spec(spec); sys.modules["bm"] = bm; spec.loader.exec_module(bm)
g, SR = bm.g, bm.g.SR
narr_wav = g.prepare_voice_prompt("voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
state = g.tts_model.get_state_for_audio_prompt(str(narr_wav))
rows = []
for key, _, _, _, segs in bm.SCENES:
    for sid, gap, text, fx, n in segs:
        raw = g.get_raw(state, narr_wav.name, sid, text, n)
        clip = g.apply_fx(raw, fx, text, sid).astype(np.float64)
        f0, t = pw.harvest(clip, SR, f0_floor=60, f0_ceil=500, frame_period=10)
        v = f0[f0 > 0]
        if len(v) < 10:
            continue
        st = 12 * np.log2(v / np.median(v))
        rng = float(np.percentile(st, 92) - np.percentile(st, 8))
        move = float(np.mean(np.abs(np.diff(st))) * 100)  # semitones per second-ish
        tail = st[int(len(st) * 0.8):].mean() - st[int(len(st) * 0.4):int(len(st) * 0.7)].mean()
        dur = len(clip) / SR
        wps = len(text.split()) / dur
        rows.append(dict(scene=key, id=sid, who=("narator" if fx.get("pitch") is None else f"pitch{fx.get('pitch')}"), range=round(rng, 1), move=round(move, 1), end=round(float(tail), 1), wps=round(wps, 2), dur=round(dur, 2), q=text.strip().endswith("?"), text=text))
for r in rows:
    flag = []
    if r["range"] < 5: flag.append("DATAR")
    if r["q"] and r["end"] < 1: flag.append("TANYA-TIDAK-NAIK")
    if r["wps"] < 2.2: flag.append("LAMBAT")
    if r["wps"] > 3.6: flag.append("TERLALU-CEPAT")
    r["flag"] = flag
    print(f"{r['scene']:9s} {r['id']:4s} range={r['range']:5.1f}st move={r['move']:5.1f} end={r['end']:+5.1f} wps={r['wps']:.2f} {','.join(flag):24s} {r['text'][:60]}")
json.dump(rows, open(ROOT / "out" / "l30" / "intonation.json", "w"), indent=1)
