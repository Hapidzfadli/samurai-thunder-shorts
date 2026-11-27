"""Mix audio komedi + jadwal adegan "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)".

Fitur Audio Upgraded:
  - Musik latar 1960s Spy Jazz / Espionage Comedy (walking upright bass, sneaky snaps, vibraphone stabs,
    intensif saat adegan kejar-kejaran taksi, dan sad comedy bass di penutup!)
  - SFX Komedi Foley sinkron presisi ke kata pemicu (EVENTS):
    * Suara kucing MEONG! + KRES-KRES! mengunyah ikan lewat radio
    * Bunyi mesin pita magnetik + scanner X-Ray + 3 blip gadget (mikrofon, pemancar, antena)
    * Pintu geser van KREEEET-KLAK! + bunyi panggang ikan SIZZLE!
    * Decit rem mendadak taksi kuning CIIIIIT!! + klakson BEEP-BEEP!
    * Alarm radar mengunci IKAN TONGKOL + statis radio + uap marah Pak Direktur PSSSSHH!
    * Whip-pan whoosh + cash register KA-CHING! ($20M) + sad wah-wah trombone
  - Normalisasi loudness final ke -14 LUFS + export public/audio/kucing_master.mp3 & src/kucing_timing.json

Pakai:
  python3 scripts/build_audio_kucing.py
"""
import importlib.util
import json
import math
import subprocess
import sys
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def _load_mod(name, rel):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
SR, FPS = E.SR, E.FPS
norm, bp, lp = E.norm, E.bp, E.lp
_NZ_SEED = [1966]


def nz(dur: float):
    _NZ_SEED[0] += 1
    return E.nz(int(SR * dur), _NZ_SEED[0])


def put(out: np.ndarray, clip: np.ndarray, t_sec: float, gain: float = 1.0):
    i0 = int(round(max(0.0, t_sec) * SR))
    if i0 >= len(out):
        return
    c = np.asarray(clip, dtype=np.float32)
    if c.ndim == 2:
        c = c.mean(axis=1)
    n = min(len(c), len(out) - i0)
    if n > 0:
        out[i0 : i0 + n] += c[:n] * gain

VOICE_JSON = ROOT / "src" / "kucing_voice.json"
TIMING_JSON = ROOT / "src" / "kucing_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "kucing_master.mp3"

SCENE_ORDER = ["hook", "lab", "xray", "van", "lepas", "kacau", "direktur", "akhir"]

SCENE_CFG = {
    "hook":     dict(pre=0.45, post=0.50, gaps=[0.0, 0.34]),
    "lab":      dict(pre=0.35, post=0.45, gaps=[0.0, 0.22, 0.22]),
    "xray":     dict(pre=0.38, post=0.45, gaps=[0.0, 0.24, 0.22]),
    "van":      dict(pre=0.40, post=0.45, gaps=[0.0, 0.24, 0.28]),
    "lepas":    dict(pre=0.30, post=0.40, gaps=[0.0, 0.20]),
    "kacau":    dict(pre=0.42, post=0.45, gaps=[0.0, 0.22]),
    "direktur": dict(pre=0.35, post=0.95, gaps=[0.0, 0.35]),
    "akhir":    dict(pre=0.45, post=1.35, gaps=[0.0, 0.28, 0.36]),
}

EVENTS = {
    "hook.dolar":    ("hook", 0, "dolar", -2),
    "hook.kucing":   ("hook", 1, "kucing", -3),
    "lab.meong":     ("lab", 0, "meong", -2),
    "lab.hah":       ("lab", 1, "START", -1),
    "lab.nyadap":    ("lab", 2, "nyadap", -2),
    "xr.kuping":     ("xray", 0, "kuping", -2),
    "xr.pemancar":   ("xray", 0, "pemancar", -2),
    "xr.ekor":       ("xray", 0, "ekor", -2),
    "xr.yakin":      ("xray", 1, "yakin", -2),
    "xr.profesional":("xray", 2, "profesional", -2),
    "van.napas":     ("van", 0, "napas", -2),
    "van.pintu":     ("van", 1, "pintu", -2),
    "van.ikan":      ("van", 2, "ikan", -2),
    "lep.apa":       ("lepas", 0, "START", -1),
    "lep.belok":     ("lepas", 0, "belok", -2),
    "lep.taksi":     ("lepas", 1, "taksi", -2),
    "kac.ngerem":    ("kacau", 0, "ngerem", -3),
    "kac.gerobak":   ("kacau", 0, "gerobak", -2),
    "kac.radar":     ("kacau", 1, "radar", -2),
    "kac.tongkol":   ("kacau", 1, "tongkol", -2),
    "dir.headset":   ("direktur", 0, "headset", -2),
    "dir.siapa":     ("direktur", 1, "START", -2),
    "dir.ikan":      ("direktur", 1, "ikan", -2),
    "akh.batal":     ("akhir", 0, "dibatalkan", -2),
    "akh.fakta":     ("akhir", 1, "fakta", -2),
    "akh.melayang":  ("akhir", 2, "melayang", -2),
    "akh.meong":     ("akhir", 2, "meong", -3),
}


def read_wav(p: Path):
    with wave.open(str(p), "rb") as w:
        sr = w.getframerate()
        raw = w.readframes(w.getnframes())
    y = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767.0
    if sr != SR:
        t_old = np.linspace(0, 1, len(y))
        t_new = np.linspace(0, 1, int(len(y) * SR / sr))
        y = np.interp(t_new, t_old, y).astype(np.float32)
    return y


# ============== CUSTOM COMEDY FOLEY SFX ==============
def sfx_meow(dur=0.52, pitch=660.0):
    t = np.linspace(0, dur, int(SR * dur))
    # Formant-like cat meow pitch contour: rise then slide down
    f = pitch * (0.82 + 0.38 * np.sin(np.pi * (t / dur) ** 0.7))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = 0.55 * np.sin(ph) + 0.30 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    sig = bp(sig, 500, 2800)
    env = np.sin(np.pi * t / dur) ** 0.75
    return norm(sig * env) * 0.75


def sfx_crunch(dur=0.65):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    for k in (0.04, 0.24, 0.44):
        c = bp(nz(0.14), 1200, 5200) * np.exp(-np.linspace(0, 9, int(SR * 0.14)))
        put(y, norm(c), k, 0.85)
    return norm(y) * 0.70


def sfx_kaching(dur=0.55):
    t = np.linspace(0, dur, int(SR * dur))
    ping = (np.sin(2 * np.pi * 1980 * t) + 0.6 * np.sin(2 * np.pi * 2970 * t) + 0.4 * np.sin(2 * np.pi * 4120 * t)) * np.exp(-t * 7.5)
    clack = bp(nz(0.06), 1500, 4500) * np.exp(-np.linspace(0, 14, int(SR * 0.06)))
    y = norm(ping) * 0.65
    put(y, norm(clack), 0.0, 0.55)
    return y


def sfx_tire_screech(dur=0.85):
    t = np.linspace(0, dur, int(SR * dur))
    f1 = 1550 - 380 * (t / dur) + 35 * np.sin(2 * np.pi * 24 * t)
    f2 = 2120 - 440 * (t / dur)
    ph1 = 2 * np.pi * np.cumsum(f1) / SR
    ph2 = 2 * np.pi * np.cumsum(f2) / SR
    s = (0.5 * np.sin(ph1) + 0.4 * np.sin(ph2) + 0.35 * bp(nz(dur), 1400, 3200))
    env = np.minimum(1.0, t / 0.06) * np.exp(-np.maximum(0, t - 0.55) * 8)
    return norm(s * env) * 0.72


def sfx_taxi_horn(dur=0.45):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    for st in (0.0, 0.21):
        d = 0.16
        t = np.linspace(0, d, int(SR * d))
        h = (np.sin(2 * np.pi * 440 * t) + 0.8 * np.sin(2 * np.pi * 554 * t) + 0.4 * np.sin(2 * np.pi * 880 * t))
        h = np.tanh(h * 1.4) * np.minimum(1.0, t / 0.02) * np.minimum(1.0, (d - t) / 0.02)
        put(y, norm(h), st, 0.72)
    return y


def sfx_van_door(dur=0.65):
    t = np.linspace(0, dur, int(SR * dur))
    slide = bp(nz(dur), 320, 1400) * np.sin(np.pi * t / dur)
    klak = bp(nz(0.08), 180, 900) * np.exp(-np.linspace(0, 14, int(SR * 0.08)))
    y = norm(slide) * 0.55
    put(y, norm(klak), dur - 0.10, 0.80)
    return y


def sfx_sizzle(dur=1.4):
    s = bp(nz(dur), 2600, 8000)
    t = np.linspace(0, dur, len(s))
    env = np.sin(np.pi * t / dur) ** 0.5
    return norm(s * env) * 0.42


def sfx_whip(dur=0.22):
    t = np.linspace(0, dur, int(SR * dur))
    s = bp(nz(dur), 350, 2600) * np.sin(np.pi * t / dur) ** 1.3
    return norm(s) * 0.50


def sfx_blip(freq=880.0, dur=0.14):
    t = np.linspace(0, dur, int(SR * dur))
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 16)
    return norm(s) * 0.55


def sfx_radio_static(dur=0.28):
    s = bp(nz(dur), 900, 4200)
    t = np.linspace(0, dur, len(s))
    return norm(s * np.sin(np.pi * t / dur)) * 0.55


def sfx_steam_anger(dur=0.75):
    s = bp(nz(dur), 1600, 6200)
    t = np.linspace(0, dur, len(s))
    whistle = np.sin(2 * np.pi * (1850 + 400 * t / dur) * t) * 0.28
    env = np.minimum(1.0, t / 0.06) * np.exp(-np.maximum(0, t - 0.45) * 7)
    return norm((s + whistle) * env) * 0.60


def sfx_sad_wah(dur=0.95):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    notes = [(311.1, 0.0, 0.22), (293.7, 0.23, 0.22), (277.2, 0.46, 0.45)]
    for freq, st, d in notes:
        t = np.linspace(0, d, int(SR * d))
        f = freq * (1.0 - 0.08 * (t / d)) if st > 0.4 else freq
        ph = 2 * np.pi * np.cumsum(np.full_like(t, f) if np.isscalar(f) else f) / SR
        s = (0.6 * np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.exp(-t * 3.0)
        put(y, norm(s), st, 0.55)
    return y


def spy_comedy_bgm(total_sec: float, tense_start: float, tense_end: float, end_start: float):
    """Procedural 1960s Spy Jazz / Espionage Comedy BGM (walking upright bass + sneaky snaps + vibraphone)."""
    n = int(SR * total_sec)
    bgm = np.zeros(n, dtype=np.float32)
    beat = 0.46  # ~130 BPM snappy espionage groove!
    bass_prog = [110.0, 130.8, 146.8, 155.6, 146.8, 130.8, 123.5, 98.0]  # A minor spy walking line!
    vib_notes = [440.0, 523.2, 659.3, 622.2, 523.2, 493.9, 440.0, 392.0]

    step = 0
    t_cur = 0.0
    while t_cur < total_sec - 0.3:
        in_tense = tense_start <= t_cur <= tense_end
        in_end = t_cur >= end_start
        b_dur = beat * (0.76 if in_tense else (1.25 if in_end else 1.0))

        # Plucked upright spy bass
        bf = bass_prog[step % len(bass_prog)] * (1.12 if in_tense else 1.0)
        bd = min(0.36, b_dur * 0.9)
        tb = np.linspace(0, bd, int(SR * bd))
        bass = (0.75 * np.sin(2 * np.pi * bf * tb) + 0.25 * np.sin(2 * np.pi * 2 * bf * tb)) * np.exp(-tb * 7.0)
        put(bgm, bass, t_cur, 0.28 if in_tense else 0.20)

        # Sneaky finger snap / hi-hat on off-beats
        if step % 2 == 1 and not in_end:
            snap = bp(nz(0.045), 1800, 6000) * np.exp(-np.linspace(0, 14, int(SR * 0.045)))
            put(bgm, norm(snap), t_cur, 0.14 if in_tense else 0.09)

        # Vibraphone sneaky chord stab every 2 beats
        if step % 2 == 0 and not in_end:
            vf = vib_notes[(step // 2) % len(vib_notes)]
            vd = 0.35
            tv = np.linspace(0, vd, int(SR * vd))
            vib = (np.sin(2 * np.pi * vf * tv) + 0.35 * np.sin(2 * np.pi * vf * 1.5 * tv)) * np.exp(-tv * 6.5)
            put(bgm, vib, t_cur, 0.09 if in_tense else 0.07)

        t_cur += b_dur
        step += 1

    return norm(bgm) * 0.20


def main():
    vdata = json.loads(VOICE_JSON.read_text())
    scenes_raw = vdata["scenes"]

    # 1. Build scene timeline & voice bed
    scene_meta = {}
    line_placed = []
    t_cursor = 0.0
    for sname in SCENE_ORDER:
        cfg = SCENE_CFG[sname]
        s_start = t_cursor
        t_line = s_start + cfg["pre"]
        sc_lines = scenes_raw[sname]
        placed_sc = []
        for idx, l in enumerate(sc_lines):
            gap = cfg["gaps"][idx] if idx < len(cfg["gaps"]) else 0.22
            if idx > 0:
                t_line += gap
            dur = float(l["duration"])
            item = {
                "scene": sname,
                "idx": idx,
                "voice": l["voice"],
                "style": l["style"],
                "text": l["text"],
                "wav": l["wav"],
                "start": round(t_line, 3),
                "end": round(t_line + dur, 3),
                "startFrame": int(round(t_line * FPS)),
                "endFrame": int(round((t_line + dur) * FPS)),
                "words": [
                    {
                        "word": w["word"],
                        "start": round(t_line + w["start"], 3),
                        "end": round(t_line + w["end"], 3),
                        "startFrame": int(round((t_line + w["start"]) * FPS)),
                        "endFrame": int(round((t_line + w["end"]) * FPS)),
                    }
                    for w in l["words"]
                ],
            }
            placed_sc.append(item)
            line_placed.append(item)
            t_line += dur
        s_end = t_line + cfg["post"]
        scene_meta[sname] = {
            "start": round(s_start, 3),
            "end": round(s_end, 3),
            "startFrame": int(round(s_start * FPS)),
            "endFrame": int(round(s_end * FPS)),
            "durationFrames": int(round(s_end * FPS)) - int(round(s_start * FPS)),
        }
        t_cursor = s_end

    total_sec = t_cursor + 0.25
    total_frames = int(math.ceil(total_sec * FPS))

    # Resolve named trigger events (in seconds & frames)
    ev_sec = {}
    ev_frame = {}
    for k, (sname, lidx, kw, f_off) in EVENTS.items():
        match_line = next(x for x in line_placed if x["scene"] == sname and x["idx"] == lidx)
        t_hit = match_line["start"]
        if kw != "START":
            kw_low = kw.lower()
            for w in match_line["words"]:
                if kw_low in w["word"].lower():
                    t_hit = w["start"]
                    break
        t_hit = max(0.0, t_hit + f_off / FPS)
        ev_sec[k] = round(t_hit, 3)
        ev_frame[k] = int(round(t_hit * FPS))

    # Build 1-2 word dynamic colored captions synced to Whisper words!
    captions = []
    for l in line_placed:
        ws = l["words"]
        i = 0
        while i < len(ws):
            chunk = ws[i : i + 2]
            if len(chunk) == 2 and (len(chunk[0]["word"]) > 9 or chunk[0]["word"].endswith(("!", "?", ".", "..."))):
                chunk = ws[i : i + 1]
            txt = " ".join(x["word"] for x in chunk)
            sf = chunk[0]["startFrame"]
            ef = max(sf + 5, chunk[-1]["endFrame"])
            captions.append({
                "text": txt,
                "voice": l["voice"],
                "style": l["style"],
                "startFrame": sf,
                "endFrame": ef,
            })
            i += len(chunk)

    # 2. Mix Voice + Comedy Foley SFX + Ducking Spy Jazz BGM
    n_tot = int(SR * total_sec)
    voice_bus = np.zeros(n_tot, dtype=np.float32)
    sfx_bus = np.zeros(n_tot, dtype=np.float32)

    for l in line_placed:
        y = read_wav(ROOT / l["wav"])
        # Normalize each voice line cleanly to consistent speaking peak
        y = norm(y) * (0.95 if l["voice"] == "direktur" else 0.88)
        put(voice_bus, y, l["start"], 1.0)

    S = {k: v["start"] for k, v in scene_meta.items()}

    # Synced Foley SFX!
    put(sfx_bus, sfx_kaching(), ev_sec["hook.dolar"], 0.65)
    put(sfx_bus, sfx_meow(0.55, 680.0), ev_sec["hook.kucing"] + 0.12, 0.85)
    put(sfx_bus, sfx_whip(), S["lab"], 0.55)
    put(sfx_bus, sfx_whip(), ev_sec["lab.hah"], 0.55)
    put(sfx_bus, E.sfx_xray(), S["xray"] + 0.05, 0.50)
    put(sfx_bus, sfx_blip(760), ev_sec["xr.kuping"], 0.55)
    put(sfx_bus, sfx_blip(980), ev_sec["xr.pemancar"], 0.55)
    put(sfx_bus, sfx_blip(1240), ev_sec["xr.ekor"], 0.60)
    put(sfx_bus, sfx_whip(), S["van"], 0.50)
    put(sfx_bus, sfx_van_door(), ev_sec["van.pintu"], 0.72)
    put(sfx_bus, sfx_sizzle(1.6), ev_sec["van.ikan"], 0.55)
    put(sfx_bus, sfx_whip(), ev_sec["lep.apa"], 0.60)
    put(sfx_bus, sfx_meow(0.42, 790.0), ev_sec["lep.belok"], 0.75)
    put(sfx_bus, sfx_tire_screech(0.88), ev_sec["kac.ngerem"] - 0.12, 0.78)
    put(sfx_bus, sfx_taxi_horn(), ev_sec["kac.ngerem"] + 0.35, 0.62)
    put(sfx_bus, sfx_sizzle(1.8), ev_sec["kac.gerobak"], 0.50)
    put(sfx_bus, sfx_blip(1450, 0.12), ev_sec["kac.radar"], 0.60)
    put(sfx_bus, sfx_blip(1650, 0.12), ev_sec["kac.tongkol"], 0.65)
    put(sfx_bus, sfx_radio_static(0.32), ev_sec["dir.headset"] + 0.15, 0.62)
    put(sfx_bus, sfx_meow(0.45, 720.0), ev_sec["dir.siapa"] - 0.38, 0.72)
    put(sfx_bus, sfx_crunch(0.65), ev_sec["dir.siapa"] - 0.20, 0.72)
    put(sfx_bus, sfx_steam_anger(0.85), ev_sec["dir.ikan"] + 0.25, 0.68)
    put(sfx_bus, sfx_kaching(), ev_sec["akh.melayang"], 0.50)
    put(sfx_bus, sfx_sad_wah(0.95), ev_sec["akh.meong"] + 0.45, 0.65)
    put(sfx_bus, sfx_meow(0.50, 620.0), ev_sec["akh.meong"] + 0.15, 0.72)

    # Spy Jazz BGM with smooth sidechain ducking under voice!
    bgm = spy_comedy_bgm(total_sec, S["lepas"], scene_meta["direktur"]["end"], S["akhir"])
    env_voice = np.abs(voice_bus)
    win = int(SR * 0.15)
    smooth_v = np.convolve(env_voice, np.ones(win) / win, mode="same")
    duck = 1.0 - np.clip(smooth_v * 6.5, 0.0, 0.68)
    mix = voice_bus + sfx_bus * 0.72 + bgm * duck
    mix = np.tanh(mix * 1.05) * 0.92

    tmp_wav = Path("/tmp/kucing_master_raw.wav")
    with wave.open(str(tmp_wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())

    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(tmp_wav),
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=9",
            "-b:a", "192k", str(OUT_MP3),
        ],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    timing = {
        "fps": FPS,
        "totalFrames": total_frames,
        "totalSec": round(total_sec, 3),
        "scenes": scene_meta,
        "events": ev_frame,
        "eventsSec": ev_sec,
        "lines": line_placed,
        "captions": captions,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False))
    print(f"MASTER AUDIO OK: {OUT_MP3} ({total_sec:.2f}s / {total_frames}f, {len(captions)} captions)", flush=True)


if __name__ == "__main__":
    main()
