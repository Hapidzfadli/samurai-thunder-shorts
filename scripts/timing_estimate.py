"""Jadwal SEMENTARA dari estimasi panjang kata (dipakai sebelum suara asli selesai).
Pakai: python3 scripts/timing_estimate.py scripts/naskah/<x>.json src/<x>_timing.json"""
import json, re, sys
N = json.load(open(sys.argv[1]))
FPS = 30
cur = 0.0
scenes, lines, caps = {}, {}, []
for sc in N:
    name = sc["scene"]
    start, t, L = cur, 0.5, []
    for i, (style, text, voice) in enumerate(sc["lines"]):
        t += 0.0 if i == 0 else 0.28
        wl, tt = [], t
        for w in text.split():
            d = 0.12 + 0.065 * len(re.sub(r"[^a-zA-Z]", "", w))
            wl.append({"w": w, "from": round(tt * FPS), "to": round((tt + d) * FPS)})
            caps.append({"text": w, "startFrame": round((start + tt) * FPS), "endFrame": round((start + tt + d) * FPS), "highlight": False, "voice": voice})
            tt += d + (0.25 if w.endswith((",", ".", "...", "?", "!")) else 0.04)
        L.append({"voice": voice, "style": style, "text": text, "from": round(t * FPS), "to": round(tt * FPS), "words": wl})
        t = tt
    t += 0.7
    df = round(t * FPS)
    scenes[name] = {"startFrame": round(start * FPS), "durationInFrames": df}
    lines[name] = L
    cur = start + df / FPS
json.dump({"fps": FPS, "totalFrames": round(cur * FPS), "order": [s["scene"] for s in N], "scenes": scenes, "lines": lines, "events": {}, "captions": caps, "provisional": True}, open(sys.argv[2], "w"), indent=1, ensure_ascii=False)
print(round(cur, 1), "dtk", {k: v["durationInFrames"] for k, v in scenes.items()})
