"""Mix audio + jadwal adegan "Masak Mie Instan Jam 2 Pagi, Malah Bikin Kebakaran Kosan".
Mengikuti arsitektur referensi "Kantor di Atas Awan" (build_audio_awan.py):
  - Suara : VoxCPM2 + Dodi 4-emosi + alignment kata Whisper (src/mie_voice.json)
  - Mix   : Stereo, swoosh antar adegan, SFX dapur/komedi tersinkron kata (EVENTS),
            musik komedi dinamis (E.music_bed), tawa halus, ducking, loudnorm -14 LUFS.

Masukan : src/mie_voice.json + out/voice/mie/*.wav
Keluaran: public/audio/mie_master.mp3 dan src/mie_timing.json
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
AWAN = _load_mod("awan_audio", "scripts/build_audio_awan.py")
SBY = _load_mod("sby_audio", "scripts/build_audio_sby.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "mie_voice.json"
TIMING_JSON = ROOT / "src" / "mie_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "mie_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.40, post=0.55, gaps=[0.0, 0.25]),
    "koridor": dict(pre=0.40, post=0.50, gaps=[0.0, 0.25]),
    "chef": dict(pre=0.40, post=0.55, gaps=[0.0, 0.28]),
    "menyambar": dict(pre=0.35, post=0.60, gaps=[0.0, 0.28]),
    "gayung": dict(pre=0.35, post=0.70, gaps=[0.0, 0.25]),
    "heboh": dict(pre=0.35, post=0.65, gaps=[0.0, 0.30]),
    "handuk": dict(pre=0.40, post=0.75, gaps=[0.0, 0.32]),
    "makan": dict(pre=0.45, post=1.45, gaps=[0.0, 0.35]),
}

EVENTS = {
    "hook.keroncong": ("hook", 0, "keroncongan", -3),
    "hook.kebakaran": ("hook", 1, "kebakaran", -2),
    "koridor.endap": ("koridor", 0, "mengendap", -2),
    "koridor.tini": ("koridor", 1, "tini", -2),
    "chef.koki": ("chef", 0, "koki", -2),
    "chef.minyak": ("chef", 1, "minyaknya", -3),
    "chef.wajan": ("chef", 1, "wajan", -2),
    "sambar.api": ("menyambar", 0, "api", -3),
    "sambar.gosong": ("menyambar", 1, "gosong", -2),
    "gayung.siram": ("gayung", 0, "menyiram", -3),
    "gayung.meledak": ("gayung", 1, "meledak", -3),
    "heboh.pintu": ("heboh", 0, "pintu", -3),
    "heboh.dobrak": ("heboh", 1, "mendobrak", -3),
    "handuk.lempar": ("handuk", 0, "melempar", -3),
    "handuk.padam": ("handuk", 1, "padam", -2),
    "handuk.aroma": ("handuk", 1, "aroma", -2),
    "makan.bareng": ("makan", 0, "makan", -2),
    "makan.telor": ("makan", 1, "telor", -2),
}

HIGHLIGHTS = {
    "dua", "pagi", "mie", "instan", "kebakaran", "kosan", "pelan", "tini",
    "koki", "segalon", "estetik", "api", "menyambar", "gosong", "panik",
    "gayung", "air", "meledak", "plafon", "heboh", "mendobrak", "handuk",
    "basah", "padam", "aroma", "makan", "bareng", "telor", "riko",
}

LINE_IDS = {
    "hook": ["h1", "h2"],
    "koridor": ["k1", "k2"],
    "chef": ["c1", "c2"],
    "menyambar": ["s1", "s2"],
    "gayung": ["g1", "g2"],
    "heboh": ["b1", "b2"],
    "handuk": ["d1", "d2"],
    "makan": ["m1", "m2"],
}


def sfx_stomach(dur=0.95, seed=11):
    """Efek perut keroncongan komedi (gurgling low-mid sweep)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 95 + 55 * np.sin(2 * np.pi * 4.5 * t) * np.exp(-t * 1.4) + 30 * np.sin(2 * np.pi * 11 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.65 + lp(nz(n, seed), 260) * 0.45
    x *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7 * (0.6 + 0.4 * np.sin(2 * np.pi * 16 * t))
    return norm(bp(x.astype(np.float32), 60, 480), 0.75)


def sfx_stove_ignite():
    """Cetek-cetek pemantik kompor gas + WHOOSH api biru menyala!"""
    c1 = E.sfx_tik(2800, 1, 0.03)
    c2 = E.sfx_tik(2900, 2, 0.03)
    n = int(SR * 0.55)
    t = np.arange(n) / SR
    whoosh = bp(nz(n, 3), 250, 1800) * np.exp(-t * 6.5) * np.minimum(1, t / 0.03)
    out = np.zeros(int(SR * 0.95), np.float32)
    out[: len(c1)] += c1 * 0.9
    out[int(SR * 0.16) : int(SR * 0.16) + len(c2)] += c2 * 0.95
    out[int(SR * 0.28) : int(SR * 0.28) + len(whoosh)] += whoosh * 1.1
    return norm(out, 0.85)


def sfx_oil_sizzle(dur=3.5, seed=21):
    """Desis minyak goreng panas & wajan dioseng."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    hiss = bp(nz(n, seed), 2800, 9200) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2)
    rng = np.random.default_rng(seed + 1)
    pops = (rng.random(n) > 0.9975).astype(np.float32) * rng.uniform(0.6, 1.4, n)
    pops = bp(pops.astype(np.float32), 1800, 7500)
    env = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.25)
    return norm(((hiss * 0.45 + pops * 1.3) * env).astype(np.float32), 0.55)


def sfx_fire_whoosh(dur=1.2, seed=31):
    """Sambaran lidah api wajan (FWOOSH berat + crackle)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    w = bp(nz(n, seed), 160, 1600) * np.minimum(1, t / 0.06) * np.exp(-t * 2.4)
    lo = np.sin(2 * np.pi * (85 - 35 * np.clip(t / dur, 0, 1)) * t) * np.exp(-t * 3.5) * 0.6
    return norm((w + lo).astype(np.float32), 0.92)


def sfx_water_splash(dur=0.65, seed=41):
    """Cipratan air dari gayung."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, seed), 700, 5200) * np.minimum(1, t / 0.04) * np.exp(-t * 4.5)
    x *= 0.65 + 0.35 * np.sin(2 * np.pi * 24 * t)
    return norm(x.astype(np.float32), 0.85)


def sfx_steam_snuff(dur=1.35, seed=51):
    """PSSSSSHHH! Uap putih saat handuk basah memadamkan api wajan."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    thump = E.sfx_thump(seed, 95)
    steam = bp(nz(n, seed + 1), 1600, 8200) * np.minimum(1, t / 0.05) * np.exp(-t * 2.2)
    out = steam.astype(np.float32)
    m = min(len(out), len(thump))
    out[:m] += thump[:m] * 0.85
    return norm(out, 0.88)


def sfx_sniff(seed=61):
    """Endusan ganda lucu saat Bu Tini mencium bau mie goreng."""
    out = np.zeros(int(SR * 0.7), np.float32)
    for off in [0.0, 0.28]:
        n = int(SR * 0.22)
        t = np.arange(n) / SR
        s = bp(nz(n, seed + int(off * 10)), 1400, 4800) * np.sin(np.pi * t / 0.22) ** 1.3
        j = int(off * SR)
        out[j : j + n] += s
    return norm(out, 0.65)


def build_captions(words_global: list[dict]) -> list[dict]:
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
        cues.append({"text": txt, "startFrame": sf, "endFrame": ef, "highlight": is_hl})
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

    events_local = {ev_name: ev_frame(sc, li, w, off) for ev_name, (sc, li, w, off) in EVENTS.items()}
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
    T_LAUGH = ROOT / "exports" / "riset" / "tawa"

    for t0, y in clips:
        put(vo, y, t0, 1.0)

    # Transisi swoosh bersih antar semua adegan (khas Kantor di Atas Awan)
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.36, abs(hash(k)) % 50 + 3), max(0.0, S[k] - 0.20), 0.28)

    # 1. HOOK — Kamar Kos 02:00 (kipas angin + perut keroncongan + alarm komedi)
    put(sfx, E.sfx_fan(END["hook"] - S["hook"]), S["hook"], 0.16, 0.35)
    put(sfx, E.sfx_tick_clock(END["hook"] - S["hook"]), S["hook"], 0.12, -0.35)
    put(sfx, sfx_stomach(0.95), EV["hook.keroncong"] + 0.05, 0.65)
    put(sfx, sfx_fire_whoosh(1.0, 19), EV["hook.kebakaran"], 0.55)
    put(sfx, E.sfx_boing(260, 0.38), EV["hook.kebakaran"] + 0.45, 0.32)

    # 2. KORIDOR — Operasi Senyap (jangkrik malam + langkah jinjit)
    put(sfx, AWAN.sfx_crickets(END["koridor"] - S["koridor"]), S["koridor"], 0.14)
    put(sfx, AWAN.sfx_steps(6, 0.42, 22), S["koridor"] + 0.4, 0.35, -0.2)
    put(sfx, E.sfx_tik(1500, 5), EV["koridor.tini"], 0.32, 0.35)

    # 3. CHEF — Dapur Kos & Sok Koki Bintang 5
    put(sfx, K.sfx_room(END["chef"] - S["chef"], 41, murmur=False), S["chef"], 0.16)
    put(sfx, sfx_stove_ignite(), S["chef"] + 0.45, 0.72, 0.1)
    put(sfx, K.sfx_pour(1.2), EV["chef.minyak"] - 0.1, 0.52, -0.2)
    put(sfx, sfx_oil_sizzle(END["chef"] - S["chef"] - 1.2, 24), S["chef"] + 1.1, 0.45, 0.15)
    put(sfx, E.sfx_whiz(17), EV["chef.wajan"], 0.35)

    # 4. MENYAMBAR — Api Tajam Menyambar & Lemari Gosong!
    put(sfx, sfx_fire_whoosh(1.4, 33), EV["sambar.api"] - 0.12, 0.90)
    put(sfx, E.sfx_fire(END["menyambar"] - S["menyambar"]), S["menyambar"], 0.44)
    put(sfx, E.sfx_crack(35), EV["sambar.gosong"], 0.55, 0.2)
    put(sfx, E.sfx_boing(320, 0.35), EV["sambar.api"] + 0.55, 0.30, -0.3)

    # 5. GAYUNG — Siram Minyak Panas Pakai Gayung Air -> MELEDAK!
    put(sfx, E.sfx_fire(END["gayung"] - S["gayung"]), S["gayung"], 0.42)
    put(sfx, AWAN.sfx_steps(4, 0.20, 44), S["gayung"] + 0.15, 0.40, -0.35)
    put(sfx, sfx_water_splash(0.65, 45), EV["gayung.siram"] + 0.08, 0.85, -0.1)
    boom_t = EV["gayung.meledak"] - 0.05
    put(sfx, SBY.boom(50, 1.15), boom_t, 0.92)
    put(sfx, sfx_fire_whoosh(1.6, 51), boom_t + 0.08, 0.95)
    put(sfx, E.sfx_crack(52), boom_t + 0.25, 0.55, 0.3)

    # 6. HEBOH — Satu Kosan Heboh + Bu Tini Mendobrak!
    put(sfx, E.sfx_door(60), EV["heboh.pintu"] - 0.1, 0.62, -0.55)
    put(sfx, E.sfx_door(61), EV["heboh.pintu"] + 0.35, 0.62, 0.0)
    put(sfx, E.sfx_door(62), EV["heboh.pintu"] + 0.80, 0.62, 0.55)
    put(sfx, AWAN.sfx_steps(7, 0.18, 63), EV["heboh.pintu"] + 0.5, 0.42)
    put(sfx, E.sfx_slam(9), EV["heboh.dobrak"] + 0.05, 0.90)
    put(sfx, E.sfx_thump(65, 65), EV["heboh.dobrak"] + 0.10, 0.72)

    # 7. HANDUK — Jurus Pro Bu Tini + Plot Twist Aroma Mie
    put(sfx, E.sfx_fire(max(0.5, EV["handuk.padam"] - S["handuk"])), S["handuk"], 0.35)
    put(sfx, E.sfx_swoosh(0.45, 70), EV["handuk.lempar"] + 0.05, 0.65, -0.2)
    put(sfx, sfx_steam_snuff(1.4, 71), EV["handuk.padam"] - 0.15, 0.82)
    put(sfx, sfx_sniff(72), EV["handuk.aroma"] + 0.15, 0.62, 0.15)
    put(sfx, E.sfx_tinkle(8, 73), EV["handuk.aroma"] + 0.55, 0.35)

    # 8. MAKAN — Ending Kocak Makan Bareng Jam 2 Pagi
    put(sfx, K.sfx_room(END["makan"] - S["makan"], 80, murmur=True), S["makan"], 0.24)
    put(sfx, K.sfx_gulp(), EV["makan.bareng"] + 0.25, 0.45, -0.25)
    put(sfx, E.sfx_fanfare(), EV["makan.telor"] + 0.25, 0.32)
    if (T_LAUGH / "tawa_istana_ramai.mp3").exists():
        put(vo, norm(E.load_mp3(T_LAUGH / "tawa_istana_ramai.mp3", 1.1), 0.26)[: int(SR * 1.9)], EV["makan.telor"] + 0.55, 0.36, 0.2)

    # Musik latar komedi playful gaya Kantor di Atas Awan (mute dramatis pas Bu Tini mendobrak -> melempar handuk!)
    base = {
        "hook": 0.68,
        "koridor": 0.48,
        "chef": 0.82,
        "menyambar": 0.78,
        "gayung": 0.88,
        "heboh": 0.75,
        "handuk": 0.0,
        "makan": 0.85,
    }
    ip_t, ip_v = [0.0], [0.35]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(EV["heboh.dobrak"] - 0.05, EV["handuk.aroma"] + 0.4)]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    # Ducking & mastering identik Kantor di Atas Awan (build_audio_awan.py)
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
