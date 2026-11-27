"""Mix audio + jadwal adegan "Perang Ember Kayu 1325 (Modena vs Bologna)".

Masukan : src/ember_voice.json + out/voice/ember/*.wav (scripts/voice_vox_ember.py)
Keluaran: public/audio/ember_master.mp3 dan src/ember_timing.json
"""
import importlib.util
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def _load_mod(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
K = _load_mod("kel_audio", "scripts/build_audio_kelompok.py")
SBY = _load_mod("sby_audio", "scripts/build_audio_sby.py")
AWAN = _load_mod("awan_audio", "scripts/build_audio_awan.py")
HOR = _load_mod("horor_audio", "scripts/build_audio_horor.py")

SR, FPS = E.SR, E.FPS
put = E.put

VOICE_JSON = ROOT / "src" / "ember_voice.json"
TIMING_JSON = ROOT / "src" / "ember_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "ember_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.45, post=0.45, gaps=[0.0, 0.35]),
    "rival": dict(pre=0.40, post=0.50, gaps=[0.0, 0.25]),
    "jumlah": dict(pre=0.40, post=0.50, gaps=[0.0, 0.28]),
    "zappolino": dict(pre=0.40, post=0.50, gaps=[0.0, 0.25]),
    "gerbang": dict(pre=0.40, post=0.50, gaps=[0.0, 0.28]),
    "mitos": dict(pre=0.40, post=0.45, gaps=[0.0, 0.28]),
    "akhir": dict(pre=0.45, post=1.30, gaps=[0.0, 0.30]),
}

EVENTS = {
    "hook.ember": ("hook", 1, "ember", -2),
    "riv.kastil": ("rival", 0, "kastil", -2),
    "riv.serang": ("rival", 1, "serang", -2),
    "jum.menang": ("jumlah", 0, "menang", -2),
    "jum.cek": ("jumlah", 1, "yakin", -2),
    "zap.serang": ("zappolino", 0, "serang", -2),
    "zap.mundur": ("zappolino", 1, "mundur", -2),
    "ger.ambil": ("gerbang", 0, "ember", -2),
    "ger.balikin": ("gerbang", 1, "balikin", -2),
    "mit.kalah": ("mitos", 1, "kalah", -2),
    "akh.modena": ("akhir", 0, "modena", -2),
    "akh.abad": ("akhir", 1, "abad", -2),
}

HIGHLIGHTS = {
    "ember", "kayu", "bologna", "modena", "kastil", "direbut", "serang",
    "tiga", "tujuh", "menang", "yakin", "mundur", "kocar", "gerbang",
    "balikin", "kalah", "malu", "modena", "tujuh", "abad", "serius",
}


def build_captions(words_global: list[dict]) -> list[dict]:
    cues = []
    i = 0
    while i < len(words_global):
        w1 = words_global[i]
        if (
            i + 1 < len(words_global)
            and words_global[i + 1]["from"] - w1["to"] <= 6
            and len(w1["w"]) + len(words_global[i + 1]["w"]) <= 11
            and not w1["w"].endswith((".", "!", "?", ","))
            and words_global[i + 1]["voice"] == w1["voice"]
        ):
            w2 = words_global[i + 1]
            txt = f"{w1['w']} {w2['w']}"
            sf, ef = w1["from"], max(w1["from"] + 2, w2["to"])
            i += 2
        else:
            txt = w1["w"]
            sf, ef = w1["from"], max(w1["from"] + 2, w1["to"])
            i += 1
        clean = txt.lower().strip(".,?!;:\"'")
        cues.append({
            "text": txt,
            "startFrame": sf,
            "endFrame": ef,
            "highlight": any(hw in clean for hw in HIGHLIGHTS),
            "voice": w1["voice"],
        })
    for a, b in zip(cues, cues[1:]):
        if b["startFrame"] - a["endFrame"] <= 8:
            a["endFrame"] = b["startFrame"]
    return cues


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
    scenes_meta, lines_by_scene = {}, {}
    all_words_global, clips = [], []
    cur = 0.0

    for sc in V["scenes"]:
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        start = cur
        t = cfg["pre"]
        sc_lines = []
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.25
            clip_path = ROOT / ln["file"] if "file" in ln else ROOT / "out" / "voice" / "ember" / f"{name}_{i}.wav"
            y = E.load_wav(clip_path)
            d = len(y) / SR
            if "wordsSec" in ln:
                wsec = ln["wordsSec"]
            else:
                ln_from = ln["from"]
                wsec = [[w["w"], max(0.0, w["from"] / FPS - ln_from), max(0.0, w["to"] / FPS - ln_from)] for w in ln["words"]]
            aligned = E.align_script(ln["text"], wsec, d)
            voice = ln.get("voice", "dodi")
            words_local = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in aligned]
            all_words_global.extend(
                {"w": w, "voice": voice, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            )
            sc_lines.append({
                "voice": voice,
                "style": ln["style"],
                "text": ln["text"],
                "from": int(round(t * FPS)),
                "to": int(round((t + d) * FPS)),
                "words": words_local,
            })
            clips.append((start + t, y, voice))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        scenes_meta[name] = {"startFrame": int(round(start * FPS)), "durationInFrames": dur_f}
        lines_by_scene[name] = sc_lines
        cur = start + dur_f / FPS

    total = cur
    total_frames = int(round(total * FPS))

    def ev_frame(scene, li, word, off):
        ln = lines_by_scene[scene][li]
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return max(0, w["from"] + off)
        return max(0, ln["from"] + off)

    events_local = {k: ev_frame(*v) for k, v in EVENTS.items()}
    timing = {
        "fps": FPS,
        "totalDurationSec": round(total, 3),
        "totalFrames": total_frames,
        "order": order,
        "scenes": scenes_meta,
        "lines": lines_by_scene,
        "events": events_local,
        "captions": build_captions(all_words_global),
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=1, ensure_ascii=False))

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    END = {k: S[k] + v["durationInFrames"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}
    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y, voice in clips:
        put(vo, y, t0, 1.0, -0.12 if voice == "dodi" else 0.12)

    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.36, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.20), 0.24)

    # 1 HOOK
    put(sfx, K.sfx_room(END["hook"] - S["hook"], 11, murmur=False), S["hook"], 0.14)
    put(sfx, HOR.sfx_record_scratch(12), EV["hook.ember"] - 0.15, 0.42)
    put(sfx, E.sfx_boing(460, 0.30), EV["hook.ember"] + 0.12, 0.32)

    # 2 RIVAL
    put(sfx, K.sfx_room(END["rival"] - S["rival"], 21, murmur=False), S["rival"], 0.15)
    put(sfx, E.sfx_clack(22), EV["riv.kastil"] + 0.1, 0.38)
    put(sfx, E.sfx_slam(23), EV["riv.serang"] - 0.25, 0.48)
    put(sfx, E.sfx_stamp(24), EV["riv.serang"] + 0.3, 0.42)

    # 3 JUMLAH
    put(sfx, E.sfx_wind(END["jumlah"] - S["jumlah"], 31), S["jumlah"], 0.16)
    put(sfx, E.sfx_boing(520, 0.28), EV["jum.menang"] + 0.15, 0.28)
    put(sfx, AWAN.sfx_crickets(0.85), EV["jum.cek"] + 0.4, 0.22)

    # 4 ZAPPOLINO
    put(sfx, E.sfx_wind(END["zappolino"] - S["zappolino"], 41), S["zappolino"], 0.18)
    put(sfx, SBY.boom(42, 0.65), EV["zap.serang"] + 0.15, 0.48)
    put(sfx, AWAN.sfx_steps(10, 0.14, 43), EV["zap.mundur"] - 0.6, 0.30, 0.2)
    put(sfx, E.sfx_whiz(44), EV["zap.mundur"] - 0.1, 0.30)

    # 5 GERBANG
    put(sfx, E.sfx_wind(END["gerbang"] - S["gerbang"], 51), S["gerbang"], 0.14)
    put(sfx, E.sfx_door(52), S["gerbang"] + 2.5, 0.42)
    put(sfx, K.sfx_pop(780), EV["ger.ambil"] + 0.2, 0.35)
    put(sfx, E.sfx_boing(400, 0.32), EV["ger.balikin"] - 0.2, 0.34)

    # 6 MITOS
    put(sfx, K.sfx_room(END["mitos"] - S["mitos"], 61, murmur=False), S["mitos"], 0.14)
    put(sfx, E.sfx_tik(2200, 62, 0.03), S["mitos"] + 0.8, 0.28)
    put(sfx, HOR.sfx_record_scratch(63), EV["mit.kalah"] - 0.1, 0.36)

    # 7 AKHIR
    put(sfx, K.sfx_room(END["akhir"] - S["akhir"], 71, murmur=False), S["akhir"], 0.14)
    put(sfx, E.sfx_stamp(72), EV["akh.modena"] + 0.2, 0.42)
    put(sfx, E.sfx_wahwah(), EV["akh.abad"] + 0.45, 0.35)

    ip_t = [0, S["rival"], S["jumlah"], S["zappolino"], S["gerbang"], S["mitos"], S["akhir"], total]
    ip_v = [0.70, 0.58, 0.65, 0.90, 0.72, 0.50, 0.42, 0.30]
    mutes = [
        (EV["hook.ember"] - 0.3, EV["hook.ember"] + 0.6),
        (EV["akh.abad"] + 0.2, total),
    ]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.48 * (1.0 / (1.0 + 7.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.15
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.08) * np.clip((total - tt) / 0.6, 0.0, 1.0))[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.5) / np.tanh(1.5) * 0.92
    master = master[: int(SR * total)]

    wav = OUT_MP3.with_suffix(".wav")
    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(master, -1.0, 1.0) * 32767).astype(np.int16).tobytes())
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", "44100", "-b:a", "192k", str(OUT_MP3)],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()
