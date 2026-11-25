"""Mix audio + jadwal adegan "Bom Kelelawar 1943" (dialog Dodi <-> Ara + narasi singkat).

Pola: build_audio_bandung.py (SCENE_CFG + EVENTS + caption 1-2 kata), musik mars komedi dari
build_audio_emu.music_bed, SFX dari emu/kelompok/awan/sby/mie/horor + SFX kelelawar baru.

Masukan : src/kelelawar_voice.json + out/voice/kelelawar/*.wav (scripts/voice_vox.py)
Keluaran: public/audio/kelelawar_master.mp3 dan src/kelelawar_timing.json
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

VOICE_JSON = ROOT / "src" / "kelelawar_voice.json"
TIMING_JSON = ROOT / "src" / "kelelawar_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "kelelawar_master.mp3"

# jeda dialog dibuat rapat (tektokan), jeda komedi sengaja lebih panjang sebelum punchline
SCENE_CFG = {
    "hook": dict(pre=0.55, post=0.45, gaps=[0.0, 0.45]),
    "gua": dict(pre=0.55, post=0.70, gaps=[0.0]),
    "lab": dict(pre=0.35, post=0.55, gaps=[0.0, 0.22, 0.22]),
    "kulkas": dict(pre=0.35, post=0.55, gaps=[0.0, 0.20, 1.05]),
    "cara": dict(pre=0.35, post=0.50, gaps=[0.0, 0.35, 0.18]),
    "kandang": dict(pre=0.85, post=0.45, gaps=[0.0, 0.25, 0.55]),
    "tangki": dict(pre=0.35, post=1.90, gaps=[0.0, 0.30]),
    "akhir": dict(pre=0.55, post=1.60, gaps=[0.0, 0.30, 0.40, 0.65]),
}

# (adegan, indeks baris, kata, offset frame)
EVENTS = {
    "hook.kelelawar": ("hook", 1, "kelelawar", -2),
    "gua.jutaan": ("gua", 0, "jutaan", -2),
    "gua.gua": ("gua", 0, "gua", -2),
    "lab.lihat": ("lab", 0, "lihat", -2),
    "lab.bom": ("lab", 0, "bom", -2),
    "lab.kecil": ("lab", 1, "kecil", -2),
    "lab.ribuan2": ("lab", 2, "ribuan", -2),
    "lab.kebakaran": ("lab", 2, "kebakaran", -2),
    "kul.kulkas": ("kulkas", 1, "kulkas", -3),
    "kul.tidur": ("kulkas", 1, "tidur", -2),
    "kul.lucu": ("kulkas", 2, "lucu", -2),
    "kul.loli": ("kulkas", 2, "loli", -2),
    "cara.pesawat": ("cara", 0, "pesawat", -3),
    "cara.hangat": ("cara", 0, "hangat", -2),
    "cara.atap": ("cara", 0, "atap", -2),
    "cara.gelap": ("cara", 1, "gelap", -2),
    "cara.tinggi": ("cara", 1, "tinggi", -2),
    "cara.persis": ("cara", 2, "persis", -2),
    "kan.bangun": ("kandang", 0, "bangun", -2),
    "kan.hah": ("kandang", 1, "hah", -3),
    "kan.buka": ("kandang", 1, "buka", -2),
    "kan.kasihan": ("kandang", 2, "kasihan", -2),
    "tan.itu": ("tangki", 0, "itu", -2),
    "tan.jangan": ("tangki", 1, "START", 0),
    "tan.jangan2": ("tangki", 1, "END", -14),
    "akh.berhasil": ("akhir", 0, "berhasil", -2),
    "akh.sendiri": ("akhir", 0, "sendiri", -2),
    "akh.atom": ("akhir", 1, "atom", -2),
    "akh.menang": ("akhir", 2, "menang", -2),
    "akh.kelelawarnya": ("akhir", 3, "kelelawarnya", -2),
}

HIGHLIGHTS = {
    "1943", "rahasia", "kelelawar", "kelelawarnya", "dokter", "gigi", "jutaan", "bom", "api", "ribuan",
    "kebakaran", "kulkas", "loli", "pesawat", "atap", "gelap", "tinggi", "persis", "kandangnya",
    "kasihan", "jangan", "berhasil", "pangkalan", "atom", "menang",
}


# ------------------------------------------------------------------ SFX baru
def sfx_squeak(seed=1, f0=4200.0, dur=0.12):
    """cicit kelelawar: chirp FM tinggi yang menurun."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    f = f0 * (1.0 + rng.uniform(-0.12, 0.12)) * (1.15 - 0.45 * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph + 0.6 * np.sin(2 * np.pi * 55 * t)) * np.sin(np.pi * t / dur) ** 1.5
    return norm(x.astype(np.float32), 0.6)


def sfx_squeaks(dur, rate=7.0, seed=3):
    """kawanan kelelawar: banyak cicit acak + kepak."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    k = int(dur * rate)
    for i in range(k):
        c = sfx_squeak(seed + i, rng.uniform(3200, 5600), rng.uniform(0.07, 0.14)) * rng.uniform(0.4, 1.0)
        s = int(rng.uniform(0, max(1e-3, dur - 0.15)) * SR)
        out[s:s + len(c)] += c[: max(0, n - s)]
    return norm(out, 0.7)


def sfx_cold_hiss(dur=1.2, seed=5):
    """uap dingin keluar kulkas."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, seed), 2500, 9000) * np.exp(-t * 2.2) * np.minimum(1, t / 0.03)
    return norm(x.astype(np.float32), 0.6)


def sfx_shiver(dur=0.6, seed=6):
    """gemeletuk gigi kedinginan (tik-tik cepat)."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    for i in range(int(dur * 22)):
        c = E.sfx_tik(1800 + (i % 3) * 300, seed + i, 0.02) * (0.6 + 0.4 * (i % 2))
        s = int(i / 22 * SR)
        out[s:s + len(c)] += c[: max(0, n - s)]
    return norm(out, 0.55)


def sfx_alarm(dur=2.5, seed=7):
    """sirene pangkalan naik-turun."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 620 + 260 * np.sin(2 * np.pi * 0.9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.3)
    return norm(lp(x.astype(np.float32), 2400), 0.5)


def sfx_horn(seed=8):
    """klakson mobil tua 'aa-OOGA' pendek."""
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    f = np.where(t < 0.18, 260 + 300 * t / 0.18, 420 - 120 * (t - 0.18) / 0.32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    from scipy import signal as sg
    x = sg.sawtooth(ph) * np.minimum(1, t / 0.01) * np.minimum(1, (0.5 - t) / 0.06)
    return norm(lp(x.astype(np.float32), 1800), 0.55)


def sfx_ding():
    """bohlam ide 'ting'."""
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2349 * t)) * np.exp(-t * 4.5)
    return norm(x.astype(np.float32), 0.6)


def sfx_sting_low():
    """sting penutup: hantaman rendah + gong."""
    n = int(SR * 2.0)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 55 * t * (1 - 0.15 * t)) * np.exp(-t * 2.2) + 0.4 * np.sin(2 * np.pi * 110 * t) * np.exp(-t * 3)
    x += 0.3 * bp(nz(n, 99), 80, 600) * np.exp(-t * 6)
    return norm(x.astype(np.float32), 0.85)


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

    # 1 HOOK: kepak mendekat + cicit + ting judul
    put(sfx, AWAN.sfx_flutter(END["hook"] - S["hook"]), S["hook"], 0.30)
    put(sfx, E.sfx_wind(END["hook"] - S["hook"], 3), S["hook"], 0.12)
    put(sfx, sfx_squeak(11, 4600, 0.16), EV["hook.kelelawar"] - 0.1, 0.55, 0.1)
    put(sfx, E.sfx_boing(420, 0.35), EV["hook.kelelawar"] + 0.25, 0.30)
    put(sfx, SBY.boom(2, 0.55), EV["hook.kelelawar"] + 0.55, 0.35)

    # 2 GUA: angin gurun, kawanan menyembur, ting ide
    put(sfx, E.sfx_wind(END["gua"] - S["gua"], 8), S["gua"], 0.18)
    put(sfx, sfx_squeaks(END["gua"] - EV["gua.jutaan"] + 0.4, 12, 21), EV["gua.jutaan"] - 0.4, 0.42)
    put(sfx, AWAN.sfx_flutter(END["gua"] - EV["gua.jutaan"] + 0.4), EV["gua.jutaan"] - 0.4, 0.34, 0.2)
    put(sfx, sfx_ding(), END["gua"] - 1.0, 0.45)

    # 3 LAB: ruangan, angkat kelelawar, ikat tabung, ribuan api
    put(sfx, K.sfx_room(END["lab"] - S["lab"], 61, murmur=False), S["lab"], 0.18)
    put(sfx, sfx_squeak(31), EV["lab.lihat"] + 0.1, 0.45, -0.2)
    put(sfx, E.sfx_clack(33), EV["lab.bom"] + 0.05, 0.45, -0.1)
    put(sfx, sfx_squeak(34, 5200, 0.09), EV["lab.kecil"] + 0.05, 0.40, 0.1)
    put(sfx, E.sfx_hud(2), EV["lab.ribuan2"] - 0.1, 0.30)
    put(sfx, MIE.sfx_fire_whoosh(1.0, 35), EV["lab.kebakaran"], 0.40)

    # 4 KULKAS: langkah, pintu, uap dingin, gemeletuk, krik (jeda komedi), pop
    put(sfx, K.sfx_room(END["kulkas"] - S["kulkas"], 62, murmur=False), S["kulkas"], 0.16)
    put(sfx, AWAN.sfx_steps(3, 0.28, 41), S["kulkas"] + 0.1, 0.30, 0.2)
    put(sfx, E.sfx_door(42), EV["kul.kulkas"] - 0.1, 0.50, 0.1)
    put(sfx, sfx_cold_hiss(1.3, 43), EV["kul.kulkas"] + 0.05, 0.40)
    put(sfx, sfx_shiver(0.7, 44), EV["kul.tidur"] + 0.1, 0.40, 0.15)
    put(sfx, AWAN.sfx_crickets(0.9), EV["kul.lucu"] - 1.0, 0.28)
    put(sfx, K.sfx_pop(900), EV["kul.loli"] + 0.25, 0.40)
    put(sfx, E.sfx_slam(45), END["kulkas"] - 0.35, 0.35)

    # 5 CARA: x-ray, pesawat, jatuh (whiz), parasut, kepak menyebar, ting "persis"
    put(sfx, E.sfx_xray(), S["cara"] + 0.2, 0.35)
    put(sfx, SBY.plane(1.8, 9), EV["cara.pesawat"] - 0.3, 0.35, -0.3)
    put(sfx, E.sfx_whiz(51), EV["cara.pesawat"] + 0.6, 0.35)
    put(sfx, E.sfx_swoosh(0.5, 52), EV["cara.hangat"] - 0.1, 0.35)
    put(sfx, sfx_squeaks(1.6, 9, 53), EV["cara.hangat"] + 0.1, 0.35, 0.2)
    put(sfx, E.sfx_tik(2200, 54), EV["cara.atap"], 0.35)
    put(sfx, E.sfx_tick_clock(1.2), EV["cara.gelap"] - 0.2, 0.18)
    put(sfx, E.sfx_stamp(55), EV["cara.persis"], 0.50)

    # 6 KANDANG: terik siang (jangkrik gurun), engsel, kepak keluar, scratch rekaman, krik
    put(sfx, E.sfx_wind(END["kandang"] - S["kandang"], 61), S["kandang"], 0.16)
    put(sfx, AWAN.sfx_krek(), S["kandang"] + 0.35, 0.45, 0.25)
    put(sfx, sfx_squeaks(END["kandang"] - S["kandang"] - 0.6, 6, 62), S["kandang"] + 0.6, 0.32, 0.25)
    put(sfx, AWAN.sfx_flutter(END["kandang"] - S["kandang"] - 0.6), S["kandang"] + 0.6, 0.26, 0.25)
    put(sfx, HOR.sfx_record_scratch(41), EV["kan.hah"] - 0.12, 0.55)
    put(sfx, E.sfx_boing(300, 0.3), EV["kan.hah"] + 0.05, 0.35)
    put(sfx, AWAN.sfx_crickets(1.2), EV["kan.kasihan"] + 0.2, 0.25)

    # 7 TANGKI: kawanan ke tangki, desis sumbu, api besar, ledakan, sirene, klakson jenderal
    put(sfx, sfx_squeaks(2.0, 10, 71), S["tangki"] + 0.2, 0.36, 0.3)
    put(sfx, AWAN.sfx_steps(6, 0.17, 72), EV["tan.jangan"] + 0.2, 0.40, -0.25)
    fire_t = EV["tan.jangan2"]
    put(sfx, E.sfx_tik(2600, 73, 0.03), fire_t - 0.5, 0.45)
    put(sfx, MIE.sfx_fire_whoosh(1.4, 74), fire_t, 0.70)
    put(sfx, SBY.boom(75, 1.0), fire_t + 0.15, 0.85)
    put(sfx, SBY.boom(76, 0.8), fire_t + 0.65, 0.65, 0.4)
    put(sfx, E.sfx_fire(END["tangki"] - fire_t), fire_t + 0.2, 0.45)
    put(sfx, sfx_alarm(END["tangki"] - fire_t), fire_t + 0.4, 0.26, -0.3)
    put(sfx, sfx_horn(77), END["tangki"] - 0.75, 0.45, 0.35)

    # 8 AKHIR: api mengecil, sirene jauh, wah-wah, sting & cicit terakhir
    put(sfx, E.sfx_fire(END["akhir"] - S["akhir"]), S["akhir"], 0.22)
    put(sfx, E.sfx_wind(END["akhir"] - S["akhir"], 81), S["akhir"], 0.14)
    put(sfx, E.sfx_wahwah(), EV["akh.sendiri"] + 0.45, 0.40)
    put(sfx, AWAN.sfx_crickets(1.0), EV["akh.menang"] + 0.4, 0.22)
    put(sfx, sfx_sting_low(), EV["akh.kelelawarnya"] - 0.05, 0.55)
    put(sfx, sfx_squeak(88, 4800, 0.18), EV["akh.kelelawarnya"] + 0.55, 0.55, -0.1)

    # musik mars komedi: berhenti untuk jeda komedi & twist, keras di kekacauan
    ip_t = [0, S["gua"], S["lab"], S["kulkas"], S["cara"], S["kandang"], S["tangki"], EV["tan.jangan2"], S["akhir"], total]
    ip_v = [0.75, 0.45, 0.70, 0.60, 0.75, 0.40, 0.85, 1.00, 0.35, 0.30]
    mutes = [
        (EV["kul.lucu"] - 1.05, EV["kul.lucu"] + 0.1),
        (EV["kan.hah"] - 0.15, EV["kan.hah"] + 0.9),
        (EV["kan.kasihan"] - 0.3, END["kandang"]),
        (EV["akh.menang"] - 0.6, total),
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
