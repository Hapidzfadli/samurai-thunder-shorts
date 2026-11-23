"""Mix audio + jadwal adegan "Bandung Lautan Api (23-24 Maret 1946)".
Mengikuti arsitektur audio referensi "Kantor di Atas Awan" (build_audio_awan.py)
& "Pertempuran Surabaya" (build_audio_sby.py):
  - Suara : VoxCPM2 + referensi suara Dodi 4-emosi + alignment kata Whisper (scripts/voice_vox.py)
  - Mix   : Stereo, scene swooshes, SFX tersinkron kata (EVENTS), pad piano emosional (sad_pad),
            war_bed dinamis, ducking halus, dan loudnorm EBU R128 (-14 LUFS).

Masukan : src/bandung_voice.json + out/voice/bandung/*.wav
Keluaran: public/audio/bandung_master.mp3 dan src/bandung_timing.json
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

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "bandung_voice.json"
TIMING_JSON = ROOT / "src" / "bandung_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "bandung_master.mp3"

# Pacing alami per adegan (gaya Kantor di Atas Awan: napas awal, jeda antar kalimat, napas visual)
SCENE_CFG = {
    "hook": dict(pre=0.35, post=0.55, gaps=[0.0, 0.25]),
    "ultimatum": dict(pre=0.45, post=0.65, gaps=[0.0, 0.28]),
    "markas": dict(pre=0.45, post=0.60, gaps=[0.0, 0.28]),
    "bakar": dict(pre=0.55, post=0.75, gaps=[0.0, 0.35]),
    "susup": dict(pre=0.45, post=0.60, gaps=[0.0, 0.28]),
    "dinamit": dict(pre=0.45, post=0.65, gaps=[0.0, 0.30]),
    "ledakan": dict(pre=0.40, post=0.80, gaps=[0.0, 0.30]),
    "fajar": dict(pre=0.65, post=1.40, gaps=[0.0, 0.40]),
}

# Sinkronisasi SFX ke kata persis hasil Whisper (pola EVENTS Kantor di Atas Awan)
EVENTS = {
    "hook.bakar": ("hook", 0, "membakar", -3),
    "hook.api": ("hook", 1, "lautan", -2),
    "ult.udara": ("ultimatum", 0, "udara", -6),
    "ult.ultimatum": ("ultimatum", 0, "ultimatum", -2),
    "ult.jam": ("ultimatum", 1, "tujuh", -3),
    "markas.peta": ("markas", 0, "peta", -3),
    "markas.bumi": ("markas", 1, "bumihanguskan", -3),
    "bakar.obor": ("bakar", 0, "obor", -4),
    "bakar.api": ("bakar", 1, "lautan", -3),
    "susup.sorot": ("susup", 1, "sorot", -3),
    "susup.gudang": ("susup", 1, "gudang", -2),
    "dinamit.letak": ("dinamit", 0, "meletakkan", -3),
    "dinamit.sumbu": ("dinamit", 0, "sumbunya", -4),
    "dinamit.mundur": ("dinamit", 1, "mundur", -2),
    "ledakan.boom": ("ledakan", 0, "START", -6),
    "ledakan.hancur": ("ledakan", 1, "hancur", -3),
    "fajar.akhir": ("fajar", 1, "bandung", -2),
}

HIGHLIGHTS = {
    "1946", "membakar", "lautan", "api", "ultimatum", "tujuh", "jam", "nasution",
    "bumihanguskan", "bumi", "dua", "ratus", "ribu", "sebelas", "dayeuhkolot",
    "toha", "ramdan", "dinamit", "ledakan", "dahsyat", "delapan", "belas",
    "bandung", "abadi",
}

LINE_IDS = {
    "hook": ["h1", "h2"],
    "ultimatum": ["u1", "u2"],
    "markas": ["m1", "m2"],
    "bakar": ["b1", "b2"],
    "susup": ["s1", "s2"],
    "dinamit": ["d1", "d2"],
    "ledakan": ["l1", "l2"],
    "fajar": ["f1", "f2"],
}


def sfx_fuse_sizzle(dur: float, seed: int = 77):
    """Desis percikan sumbu dinamit terbakar (high-freq crackle + sparks)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    hiss = bp(nz(n, seed), 3200, 9500) * (0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 17 * t)))
    rng = np.random.default_rng(seed + 1)
    sparks = (rng.random(n) > 0.996).astype(np.float32) * rng.uniform(0.6, 1.4, n)
    sparks = bp(sparks.astype(np.float32), 2500, 9000)
    env = np.minimum(1.0, t / 0.12) * np.minimum(1.0, (dur - t) / 0.15)
    return norm(((hiss * 0.45 + sparks * 1.4) * env).astype(np.float32), 0.72)


def sfx_searchlight_hum(dur: float):
    """Dengung lampu sorot malam yang menegangkan."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    hum = np.sin(2 * np.pi * 110 * t) * 0.35 + np.sin(2 * np.pi * 165 * t) * 0.18
    sweep = 0.55 + 0.45 * np.sin(2 * np.pi * 0.55 * t)
    env = np.minimum(1.0, t / 0.3) * np.minimum(1.0, (dur - t) / 0.3)
    return norm((hum * sweep * env).astype(np.float32), 0.35)


def build_captions(words_global: list[dict]) -> list[dict]:
    """Kelompokkan kata Whisper menjadi 1-2 kata kinetik (gaya Banjir Molase / Awan)."""
    cues = []
    i = 0
    while i < len(words_global):
        w1 = words_global[i]
        if (
            i + 1 < len(words_global)
            and words_global[i + 1]["from"] - w1["to"] <= 6
            and len(w1["w"]) + len(words_global[i + 1]["w"]) <= 12
            and not w1["w"].endswith((".", "!", "?", ","))
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
        is_hl = any(hw in clean for hw in HIGHLIGHTS)
        cues.append({
            "text": txt,
            "startFrame": sf,
            "endFrame": ef,
            "highlight": is_hl,
        })
    return cues


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
    scenes_meta = {}
    lines_by_id = {}
    lines_by_scene = {}
    all_words_global = []
    clips = []
    cur = 0.0

    for sc in V["scenes"]:
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        start = cur
        t = cfg["pre"]
        sc_lines = []
        ids = LINE_IDS[name]
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.28
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            words_local = [
                {"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))}
                for w, a, b in aligned
            ]
            words_glob = [
                {"w": w, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            ]
            all_words_global.extend(words_glob)
            entry = {
                "scene": name,
                "emotion": ln["style"],
                "text": ln["text"],
                "startSec": round(start + t, 3),
                "endSec": round(start + t + d, 3),
                "from": int(round(t * FPS)),
                "to": int(round((t + d) * FPS)),
                "globalFrom": int(round((start + t) * FPS)),
                "globalTo": int(round((start + t + d) * FPS)),
                "words": words_local,
            }
            sc_lines.append(entry)
            if i < len(ids):
                lines_by_id[ids[i]] = {k: v for k, v in entry.items() if k != "words"}
            clips.append((start + t, y))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        start_f = int(round(start * FPS))
        end_s = start + dur_f / FPS
        scenes_meta[name] = {
            "startSec": round(start, 3),
            "endSec": round(end_s, 3),
            "startFrame": start_f,
            "durationInFrames": dur_f,
        }
        lines_by_scene[name] = sc_lines
        cur = end_s

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
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]")
        return max(0, ln["from"] + off)

    events_local = {}
    for ev_name, (scene, li, word, off) in EVENTS.items():
        events_local[ev_name] = ev_frame(scene, li, word, off)

    captions = build_captions(all_words_global)
    timing = {
        "fps": FPS,
        "totalDurationSec": round(total, 3),
        "totalFrames": total_frames,
        "order": order,
        "scenes": scenes_meta,
        "lines": lines_by_id,
        "events": events_local,
        "captions": captions,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False))

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    END = {k: S[k] + v["durationInFrames"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}

    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)

    for t0, y in clips:
        put(vo, y, t0, 1.0)

    # Transisi swoosh bersih antar semua adegan (ciri khas Kantor di Atas Awan)
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.38, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.22), 0.26)

    # Ambience angin / api latar per adegan
    for k in ["hook", "ultimatum", "bakar", "susup", "ledakan", "fajar"]:
        put(sfx, E.sfx_wind(END[k] - S[k], 5 + len(k)), S[k], 0.14)

    # 1. HOOK — Bandung Membara
    put(sfx, E.sfx_fire(END["hook"] - S["hook"]), S["hook"], 0.34)
    put(sfx, AWAN.sfx_steps(5, 0.26, 20), S["hook"] + 0.15, 0.35, -0.3)
    put(sfx, SBY.boom(3, 0.75), EV["hook.bakar"] + 0.08, 0.55)
    put(sfx, E.sfx_whiz(16), EV["hook.api"], 0.35)

    # 2. ULTIMATUM — Pesawat Sekutu + Selebaran + Tank Sherman + Jam 7 Jam
    put(sfx, SBY.plane(4.2, 6), S["ultimatum"] + 0.15, 0.58, -0.25)
    for j in range(6):
        put(sfx, E.sfx_paper(30 + j), S["ultimatum"] + 1.0 + j * 0.34, 0.35, (j % 2) * 0.7 - 0.35)
    put(sfx, SBY.tank(END["ultimatum"] - S["ultimatum"] - 1.2, 8), S["ultimatum"] + 1.0, 0.38, -0.35)
    put(sfx, E.sfx_stamp(10), EV["ult.ultimatum"] + 0.05, 0.55)
    put(sfx, E.sfx_tick_clock(max(1.2, END["ultimatum"] - EV["ult.jam"])), EV["ult.jam"] - 0.15, 0.25, 0.35)

    # 3. MARKAS — Pos Komando Divisi III TRI (Kolonel Nasution)
    put(sfx, K.sfx_room(END["markas"] - S["markas"], 42, murmur=False), S["markas"], 0.20)
    put(sfx, AWAN.sfx_steps(4, 0.28, 35), S["markas"] + 0.15, 0.35, -0.4)
    put(sfx, E.sfx_paper(21), S["markas"] + 1.65, 0.60, 0.0)
    put(sfx, E.sfx_paper(22), EV["markas.peta"] + 0.08, 0.45, 0.2)
    put(sfx, E.sfx_slam(9), EV["markas.bumi"] + 0.06, 0.72)

    # 4. BAKAR — 200.000 Warga Mengungsi + Pad Piano Emosional (gaya sedih Kantor di Atas Awan!)
    put(sfx, AWAN.sad_pad(END["bakar"] - S["bakar"] + 0.5, seed=1), S["bakar"], 0.52)
    put(sfx, E.sfx_fire(END["bakar"] - S["bakar"]), S["bakar"], 0.32)
    put(sfx, E.sfx_whiz(18), EV["bakar.obor"] + 0.05, 0.45, -0.25)
    put(sfx, SBY.boom(12, 0.55), EV["bakar.api"] + 0.10, 0.42, 0.2)
    put(sfx, AWAN.sfx_steps(6, 0.32, 60), S["bakar"] + 3.2, 0.28, 0.3)

    # 5. SUSUP — Menembus Lampu Sorot ke Gudang Mesiu Dayeuhkolot
    put(sfx, sfx_searchlight_hum(END["susup"] - S["susup"]), S["susup"], 0.28, 0.3)
    put(sfx, AWAN.sfx_steps(8, 0.48, 70), S["susup"] + 0.3, 0.30, -0.35)
    put(sfx, E.sfx_tik(1600, 7), EV["susup.sorot"], 0.38, 0.3)
    put(sfx, E.sfx_thump(71, 95), EV["susup.gudang"] + 0.1, 0.42)

    # 6. DINAMIT — Di Dalam Gudang Penuh Peti Peledak
    put(sfx, K.sfx_room(END["dinamit"] - S["dinamit"], 49, murmur=False), S["dinamit"], 0.22)
    put(sfx, AWAN.sfx_steps(4, 0.28, 80), S["dinamit"] + 0.15, 0.35, -0.3)
    put(sfx, E.sfx_thump(82, 110), EV["dinamit.letak"] + 0.05, 0.65)
    put(sfx, E.sfx_tik(2600, 9, 0.03), EV["dinamit.sumbu"] - 0.05, 0.55)
    fuse_dur = max(1.5, END["dinamit"] - EV["dinamit.sumbu"] + 0.35)
    put(sfx, sfx_fuse_sizzle(fuse_dur, 77), EV["dinamit.sumbu"], 0.26, 0.0)
    put(sfx, AWAN.sfx_steps(5, 0.22, 85), EV["dinamit.mundur"] + 0.25, 0.40, 0.45)

    # 7. LEDAKAN — 18.000 Ton Mesiu Dayeuhkolot Meledak Dahsyat!
    boom_t = S["ledakan"] + 0.32
    put(sfx, SBY.boom(50, 1.35), boom_t, 1.00, 0.0)
    put(sfx, SBY.boom(52, 1.05), boom_t + 0.28, 0.85, -0.45)
    put(sfx, SBY.boom(55, 0.95), boom_t + 0.55, 0.78, 0.45)
    put(sfx, AWAN.sfx_shatter(), boom_t + 0.18, 0.72, 0.25)
    put(sfx, E.sfx_crack(62), boom_t + 0.45, 0.65, -0.3)
    put(sfx, E.sfx_fire(END["ledakan"] - boom_t), boom_t + 0.4, 0.42)
    put(sfx, SBY.boom(64, 0.75), EV["ledakan.hancur"] + 0.1, 0.55)

    # 8. FAJAR — Asap, Bara & Semangat Abadi (Pad Piano Emosional + Fanfare Heroik!)
    put(sfx, AWAN.sad_pad(END["fajar"] - S["fajar"], seed=0), S["fajar"], 0.62)
    put(sfx, E.sfx_fire(END["fajar"] - S["fajar"]), S["fajar"], 0.16)
    put(sfx, AWAN.sfx_flutter(END["fajar"] - S["fajar"]), S["fajar"], 0.18, -0.25)
    put(sfx, E.sfx_fanfare(), EV["fajar.akhir"] + 0.15, 0.38)

    # Musik latar perang dinamis (mute di bagian emosional bakar & fajar agar sad_pad bernapas!)
    levels = [
        (S["hook"], END["hook"], 0.88),
        (S["ultimatum"], END["ultimatum"], 0.72),
        (S["markas"], END["markas"], 0.55),
        (S["bakar"], END["bakar"], 0.0),
        (S["susup"], END["dinamit"], 0.78),
        (S["ledakan"], END["ledakan"], 1.00),
        (S["fajar"], total, 0.0),
    ]
    mus = SBY.war_bed(total, levels)

    # Ducking & mastering identik dengan Kantor di Atas Awan (build_audio_awan.py)
    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = (
        mus[:N] * 0.55 * (1.0 / (1.0 + 7.0 * env))[:, None]
        + sfx * (1.0 / (1.0 + 1.2 * env))[:, None]
        + vo * 1.15
    )
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.08) * np.clip((total - tt) / 0.8, 0.0, 1.0))[:, None]
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
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(wav),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-ar", "44100", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()
