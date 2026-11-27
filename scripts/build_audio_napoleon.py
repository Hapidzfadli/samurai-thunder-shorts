"""Mix audio + jadwal adegan "Napoleon vs Kelinci 1807" (dialog Dodi <-> Ara + narasi singkat).

Pola: build_audio_bandung.py (SCENE_CFG + EVENTS + caption 1-2 kata), musik mars komedi dari
build_audio_emu.music_bed, SFX dari emu/kelompok/awan/sby/mie/horor + SFX napoleon baru.

Masukan : src/napoleon_voice.json + out/voice/napoleon/*.wav (scripts/voice_vox.py)
Keluaran: public/audio/napoleon_master.mp3 dan src/napoleon_timing.json
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
MIE = _load_mod("mie_audio", "scripts/build_audio_mie.py")
HOR = _load_mod("horor_audio", "scripts/build_audio_horor.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "napoleon_voice.json"
TIMING_JSON = ROOT / "src" / "napoleon_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "napoleon_master.mp3"

# jeda dialog dibuat rapat (tektokan), jeda komedi sengaja lebih panjang sebelum punchline
SCENE_CFG = {
    "hook": dict(pre=0.55, post=0.50, gaps=[0.0, 0.50]),
    "tilsit": dict(pre=0.50, post=0.60, gaps=[0.0, 0.25, 0.30, 0.20, 0.30]),
    "ide": dict(pre=0.40, post=0.50, gaps=[0.0, 0.25, 0.25, 0.25]),
    "ternak": dict(pre=0.40, post=0.60, gaps=[0.0, 0.30, 0.25, 0.30]),
    "hari": dict(pre=0.50, post=0.50, gaps=[0.0, 0.30, 0.25, 0.30, 0.35, 0.30]),
    "serbu": dict(pre=0.40, post=0.50, gaps=[0.0, 0.20, 0.20, 0.25]),
    "kereta": dict(pre=0.40, post=0.50, gaps=[0.0, 0.20, 0.25, 0.20]),
    "akhir": dict(pre=0.50, post=1.60, gaps=[0.0, 0.30, 0.45, 0.60]),
}

EVENTS = {
    "hook.kelinci": ("hook", 1, "kelinci", -2),
    "til.tanda": ("tilsit", 0, "menandatangani", -2),
    "til.bosan": ("tilsit", 2, "bosan", -2),
    "ide.ratusan": ("ide", 3, "ratusan", -2),
    "ter.beli": ("ternak", 1, "beli", -3),
    "ter.jinak": ("ternak", 3, "jinak", -2),
    "hari.buka": ("hari", 1, "bukalah", -2),
    "hari.hm": ("hari", 3, "hm", -2),
    "hari.sini": ("hari", 4, "sini", -2),
    "hari.arahku": ("hari", 5, "arahku", -2),
    "ser.makanan": ("serbu", 0, "makanan", -2),
    "ser.usir": ("serbu", 3, "usir", -2),
    "ker.cepat": ("kereta", 0, "cepat", -2),
    "ker.masuk": ("kereta", 2, "masuk", -2),
    "akh.lapar": ("akhir", 3, "lapar", -2),
}

HIGHLIGHTS = {
    "napoleon", "kelinci", "bosan", "perjanjian", "ratusan", "jinak", "terlalu", "senapan", "kandangnya", "makanan",
    "pengawal", "usir", "kereta", "masuk", "rahasia", "lapar", "sembilan", "menang",
}


# ------------------------------------------------------------------ caption
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
    # tahan caption sampai caption berikutnya bila jeda pendek (tidak berkedip)
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
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            voice = ln.get("voice", "dodi")
            words_local = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in aligned]
            all_words_global.extend(
                {"w": w, "voice": voice, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))} for w, a, b in aligned
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
        if word == "START":
            return max(0, ln["from"] + off)
        if word == "END":
            return max(0, ln["to"] + off)
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return max(0, w["from"] + off)
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]: {ln['text']}")
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
        print(f"  {k:8s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y, voice in clips:  # Dodi sedikit kiri, Ara sedikit kanan (sesuai posisi di layar)
        put(vo, y, t0, 1.0, -0.12 if voice == "dodi" else 0.12)

    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.38, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.22), 0.24)

    # 1 HOOK: angin + riak sungai, ting judul, boing kelinci
    put(sfx, E.sfx_wind(END["hook"] - S["hook"], 3), S["hook"], 0.16)
    put(sfx, E.sfx_boing(420, 0.35), EV["hook.kelinci"] + 0.25, 0.32)
    put(sfx, SBY.boom(2, 0.55), EV["hook.kelinci"] + 0.45, 0.30)

    # 2 TILSIT: ruangan, goresan pena + stempel, krik "bosan"
    put(sfx, K.sfx_room(END["tilsit"] - S["tilsit"], 61, murmur=False), S["tilsit"], 0.16)
    put(sfx, E.sfx_tik(2400, 62, 0.03), EV["til.tanda"] + 0.15, 0.30)
    put(sfx, E.sfx_stamp(63), EV["til.tanda"] + 0.9, 0.45)
    put(sfx, AWAN.sfx_crickets(0.9), EV["til.bosan"] + 0.2, 0.22)

    # 3 IDE: tenda, ting ide, gebrakan meja, stempel "ratusan"
    put(sfx, K.sfx_room(END["ide"] - S["ide"], 64, murmur=False), S["ide"], 0.14)
    put(sfx, E.sfx_boing(520, 0.3), S["ide"] + 0.9, 0.30)
    put(sfx, E.sfx_slam(65), EV["ide.ratusan"] - 1.3, 0.40)
    put(sfx, E.sfx_stamp(66), EV["ide.ratusan"] + 0.5, 0.50)

    # 4 TERNAK: langkah di tanah, jentikan jari, pop serah-terima kelinci
    put(sfx, E.sfx_wind(END["ternak"] - S["ternak"], 67), S["ternak"], 0.12)
    put(sfx, AWAN.sfx_steps(5, 0.30, 68), S["ternak"] + 0.2, 0.28, 0.2)
    put(sfx, E.sfx_tik(1700, 69, 0.02), EV["ter.beli"] + 0.05, 0.45)
    put(sfx, K.sfx_pop(800), EV["ter.beli"] + 1.6, 0.30)
    put(sfx, E.sfx_stamp(70), EV["ter.jinak"] + 1.4, 0.40)

    # 5 HARI: angin lapangan, palang kandang, derap kelinci, krik, rekaman rusak
    put(sfx, E.sfx_wind(END["hari"] - S["hari"], 71), S["hari"], 0.15)
    put(sfx, AWAN.sfx_steps(6, 0.28, 72), S["hari"] + 3.2, 0.26, 0.2)
    put(sfx, E.sfx_clack(73), EV["hari.buka"] + 1.0, 0.45)
    put(sfx, AWAN.sfx_crickets(0.9), EV["hari.hm"] - 0.8, 0.22)
    put(sfx, HOR.sfx_record_scratch(41), EV["hari.hm"] - 0.12, 0.50)
    put(sfx, AWAN.sfx_flutter(END["hari"] - EV["hari.sini"] + 0.5), EV["hari.sini"] - 0.5, 0.30, 0.2)
    put(sfx, E.sfx_whiz(74), EV["hari.arahku"] - 0.1, 0.30)

    # 6 SERBU: derap kelinci rame, stempel "kelinci lapar", gebrakan
    put(sfx, AWAN.sfx_flutter(END["serbu"] - S["serbu"]), S["serbu"], 0.30)
    put(sfx, AWAN.sfx_steps(10, 0.14, 75), S["serbu"] + 0.2, 0.26, -0.2)
    put(sfx, E.sfx_stamp(76), EV["ser.makanan"] + 1.9, 0.50)
    put(sfx, SBY.boom(77, 0.7), EV["ser.usir"] - 0.05, 0.50)

    # 7 KERETA: roda kereta, pintu, boing kelinci masuk, wah-wah
    put(sfx, AWAN.sfx_steps(8, 0.16, 78), S["kereta"], 0.28, 0.3)
    put(sfx, E.sfx_door(79), EV["ker.cepat"] + 1.6, 0.50)
    put(sfx, E.sfx_boing(380, 0.3), EV["ker.masuk"] - 0.3, 0.35)
    put(sfx, K.sfx_pop(900), EV["ker.masuk"] + 0.6, 0.35)

    # 8 AKHIR: angin malam, jangkrik, sting rendah + boing kelinci mendarat di topi
    put(sfx, E.sfx_wind(END["akhir"] - S["akhir"], 81), S["akhir"], 0.12)
    put(sfx, AWAN.sfx_crickets(END["akhir"] - S["akhir"]), S["akhir"], 0.16)
    put(sfx, E.sfx_boing(500, 0.25), EV["akh.lapar"] - 0.4, 0.40)
    put(sfx, E.sfx_wahwah(), EV["akh.lapar"] + 0.5, 0.36)

    # musik mars komedi: berhenti untuk jeda komedi & twist, keras di kekacauan
    ip_t = [0, S["tilsit"], S["ide"], S["ternak"], S["hari"], EV["hari.hm"], S["serbu"], S["kereta"], S["akhir"], total]
    ip_v = [0.75, 0.50, 0.70, 0.55, 0.65, 0.40, 0.90, 0.85, 0.35, 0.30]
    mutes = [
        (EV["hari.hm"] - 0.9, EV["hari.hm"] + 0.7),
        (EV["akh.lapar"] - 0.6, total),
    ]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.50 * (1.0 / (1.0 + 7.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.15
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
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", "44100", "-b:a", "192k", str(OUT_MP3)], check=True)
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()
