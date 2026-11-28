"""Mix audio + jadwal adegan "Terowongan ke Brankas" (Nice 1976; dialog Dodi <-> Ara + narasi singkat).
Mode --estimasi: buat src/terowongan_timing.json dari panjang teks (tanpa suara) agar adegan bisa dirakit lebih dulu.

Pola: build_audio_bandung.py (SCENE_CFG + EVENTS + caption 1-2 kata), musik mars komedi dari
build_audio_emu.music_bed, SFX dari emu/kelompok/awan/sby/mie/horor + SFX kelelawar baru.

Masukan : src/terowongan_voice.json + out/voice/kelelawar/*.wav (scripts/voice_vox.py)
Keluaran: public/audio/terowongan_master.mp3 dan src/terowongan_timing.json
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

VOICE_JSON = ROOT / "src" / "terowongan_voice.json"
TIMING_JSON = ROOT / "src" / "terowongan_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "terowongan_master.mp3"

# jeda rapat untuk tektokan, lebih panjang sebelum punchline
SCENE_CFG = {
    "hook": dict(pre=0.55, post=0.55, gaps=[0.0, 0.55]),
    "ide": dict(pre=0.35, post=0.45, gaps=[0.0, 0.25, 0.30]),
    "got": dict(pre=0.70, post=0.45, gaps=[0.0, 0.30]),
    "gali": dict(pre=0.45, post=0.55, gaps=[0.0, 0.30, 0.25]),
    "brankas": dict(pre=0.45, post=0.40, gaps=[0.0, 0.30, 0.45]),
    "uang": dict(pre=0.80, post=0.55, gaps=[0.0, 0.90]),
    "pesan": dict(pre=0.55, post=0.70, gaps=[0.0, 0.25, 1.00]),
    "tangkap": dict(pre=0.45, post=0.55, gaps=[0.0, 0.45]),
    "kabur": dict(pre=0.35, post=1.60, gaps=[0.0, 0.40, 0.30, 0.45]),
}

# (adegan, indeks baris, kata, offset frame)
EVENTS = {
    "hook.brankas": ("hook", 0, "brankas", -2),
    "hook.dibuka": ("hook", 0, "dibuka", -2),
    "hook.dalam": ("hook", 1, "dalam", -3),
    "ide.foto": ("ide", 0, "foto", -2),
    "ide.peta": ("ide", 1, "peta", -2),
    "ide.samping": ("ide", 1, "samping", -2),
    "ide.brankas2": ("ide", 2, "brankas", -3),
    "got.bau": ("got", 0, "baunya", -2),
    "got.dibayar": ("got", 1, "dibayar", -2),
    "got.jalan": ("got", 1, "jalan", -2),
    "gali.minggu": ("gali", 0, "berminggu", -2),
    "gali.delapan": ("gali", 0, "delapan", -2),
    "gali.ambruk": ("gali", 1, "ambruk", -2),
    "gali.bersin": ("gali", 2, "bersin", -2),
    "brk.bastille": ("brankas", 0, "bastille", -2),
    "brk.waktu": ("brankas", 0, "waktu", -2),
    "brk.kotak": ("brankas", 1, "kotak", -2),
    "brk.sopan": ("brankas", 2, "sopan", -2),
    "uang.tangkap": ("uang", 0, "tangkap", -3),
    "uang.wangi": ("uang", 1, "wanginya", -2),
    "uang.got": ("uang", 1, "got", -2),
    "psn.tembok": ("pesan", 0, "tembok", -2),
    "psn.senjata": ("pesan", 1, "senjata", -2),
    "psn.kekerasan": ("pesan", 1, "kekerasan", -2),
    "psn.mencuri": ("pesan", 2, "mencuri", -2),
    "tkp.polisi": ("tangkap", 0, "polisi", -2),
    "tkp.lenyap": ("tangkap", 0, "lenyap", -2),
    "tkp.tertangkap": ("tangkap", 0, "tertangkap", -2),
    "tkp.kubilang": ("tangkap", 1, "kubilang", -2),
    "kbr.peta": ("kabur", 0, "peta", -2),
    "kbr.caranya": ("kabur", 0, "caranya", -2),
    "kbr.melompat": ("kabur", 1, "melompat", -3),
    "kbr.atap": ("kabur", 1, "atap", -2),
    "kbr.motor": ("kabur", 1, "motor", -2),
    "kbr.hah": ("kabur", 2, "hah", -3),
    "kbr.ditemukan": ("kabur", 3, "ditemukan", -2),
    "kbr.lagi": ("kabur", 3, "lagi", -2),
}

HIGHLIGHTS = {"nice", "brankas", "dalam", "got", "foto", "peta", "delapan", "bastille", "kotak", "sopan", "tangkap",
              "wanginya", "senjata", "kebencian", "kekerasan", "mencuri", "franc", "tertangkap", "melompat", "motor", "lagi", "ditemukan"}


# ------------------------------------------------------------------ SFX baru
def sfx_drill(dur=1.2, seed=1):
    """bor listrik: dengung gergaji + getar."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    from scipy import signal as sg
    f = 180 + 40 * np.sin(2 * np.pi * 6 * t)
    x = sg.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.6 + 0.4 * bp(nz(n, seed), 1500, 5000)
    x *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1)
    return norm(lp(x.astype(np.float32), 6000), 0.6)


def sfx_drawer(dur=0.5, seed=2):
    """laci baja ditarik: gesek logam + klak di ujung."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, seed), 900, 4200) * (0.4 + 0.6 * np.sin(np.pi * t / dur)) * 0.6
    c = E.sfx_clack(seed + 3)
    out = np.zeros(n + len(c), np.float32)
    out[:n] += x
    out[n - 200:n - 200 + len(c)] += c * 0.8
    return norm(out, 0.6)


def sfx_drips(dur, rate=2.5, seed=3):
    """tetesan air got."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for i in range(int(dur * rate)):
        f0 = rng.uniform(900, 1700)
        m = int(SR * 0.12)
        t = np.arange(m) / SR
        c = np.sin(2 * np.pi * f0 * (1 + 0.8 * t) * t) * np.exp(-t * 40)
        s = int(rng.uniform(0, max(1e-3, dur - 0.15)) * SR)
        out[s:s + m] += c[: max(0, n - s)] * rng.uniform(0.4, 1.0)
    return norm(out, 0.5)


def sfx_weld(dur=1.4, seed=4):
    """las: desis + percik acak."""
    n = int(SR * dur)
    rng = np.random.default_rng(seed)
    x = bp(nz(n, seed), 2500, 9000) * 0.45
    crack = (rng.random(n) > 0.9985).astype(np.float32) * rng.uniform(0.5, 1.0, n)
    x += bp(np.convolve(crack, np.exp(-np.arange(300) / 40), mode="same").astype(np.float32), 1200, 8000)
    t = np.arange(n) / SR
    x *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.15)
    return norm(x.astype(np.float32), 0.55)


def sfx_moto(dur=2.0, seed=5):
    """motor 2-tak: raung naik lalu menjauh."""
    return E.sfx_engine(dur, 62.0, seed, rev=1.8)


def sfx_brush(dur=0.6, seed=6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, seed), 1500, 6000) * np.sin(np.pi * t / dur) ** 2
    return norm(x.astype(np.float32), 0.4)


def sfx_bonk():
    """mendarat di atap mobil: dentum logam."""
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 140 * t) + 0.6 * np.sin(2 * np.pi * 330 * t) + 0.3 * np.sin(2 * np.pi * 517 * t)) * np.exp(-t * 7)
    return norm(x.astype(np.float32), 0.8)


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




def estimasi():
    """jadwal sementara dari panjang teks: 0,12 dtk + 0,065 dtk/huruf per kata"""
    import re
    N = json.loads((ROOT / "scripts" / "naskah" / "terowongan.json").read_text())
    scenes = []
    for sc in N:
        lines = []
        for style, text, voice in sc["lines"]:
            words = text.split()
            t = 0.0
            ws = []
            for w in words:
                d = 0.12 + 0.065 * len(re.sub(r"[^\w]", "", w))
                ws.append([w, t, t + d * 0.92])
                t += d + (0.18 if w.endswith((",", ".", "?", "!")) else 0.0)
            lines.append({"style": style, "text": text, "voice": voice, "file": None, "wordsSec": ws, "dur": t})
        scenes.append({"scene": sc["scene"], "lines": lines})
    return {"scenes": scenes}


def main():
    V = estimasi() if "--estimasi" in sys.argv else json.loads(VOICE_JSON.read_text())
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
            if ln.get("file"):
                y = E.load_wav(ROOT / ln["file"])
                d = len(y) / SR
                aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            else:
                d = ln["dur"]
                y = np.zeros(int(SR * d), np.float32)
                aligned = [(w, a, b) for w, a, b in ln["wordsSec"]]
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

    if "--estimasi" in sys.argv:
        print(f"ESTIMASI total {total:.2f}s ({total_frames} frames) -> {TIMING_JSON}")
        for k in order:
            print(f"  {k:8s} {scenes_meta[k]['durationInFrames']:4d}f")
        return
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

    # transisi antar-adegan
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.38, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.22), 0.24)

    # 1 HOOK: ruang brankas, roda pintu ditarik (klak-klak), jatuh terduduk, sting "dari dalam"
    put(sfx, K.sfx_room(END["hook"] - S["hook"], 11, murmur=False), S["hook"], 0.16)
    for i in range(3):
        put(sfx, E.sfx_clack(12 + i), S["hook"] + 1.2 + i * 0.45, 0.45, -0.1)
    put(sfx, E.sfx_thump(13, 60), EV["hook.dibuka"] + 0.2, 0.45)
    put(sfx, HOR.sfx_record_scratch(14), EV["hook.dalam"] - 0.15, 0.40)
    put(sfx, SBY.boom(15, 0.5), EV["hook.dalam"] + 0.1, 0.35)

    # 2 IDE: studio, jam berdetak, kertas peta, ting ide
    put(sfx, K.sfx_room(END["ide"] - S["ide"], 21, murmur=False), S["ide"], 0.14)
    put(sfx, E.sfx_tick_clock(END["ide"] - S["ide"]), S["ide"], 0.10)
    put(sfx, E.sfx_paper(22), EV["ide.peta"] - 0.1, 0.45)
    put(sfx, E.sfx_scribble(0.8, 23), EV["ide.samping"], 0.30)
    put(sfx, E.sfx_boing(420, 0.35), EV["ide.brankas2"] + 0.1, 0.30)

    # 3 GOT: tutup got besi digeser, tetes air, langkah becek, gema
    put(sfx, E.sfx_slam(31), S["got"] + 0.05, 0.45)
    put(sfx, sfx_drips(END["got"] - S["got"], 3.0, 32), S["got"], 0.35)
    put(sfx, E.sfx_water(END["got"] - S["got"]), S["got"], 0.12)
    put(sfx, AWAN.sfx_steps(8, 0.36, 33), S["got"] + 0.6, 0.30, 0.15)
    put(sfx, E.sfx_boing(260, 0.4), EV["got.bau"] + 0.1, 0.20)

    # 4 GALI: bor, sekop, ember, mobil lewat di atas, krik setelah "bersin"
    put(sfx, sfx_drill(1.6, 41), S["gali"] + 0.6, 0.40)
    put(sfx, sfx_drill(1.0, 42), EV["gali.delapan"] + 0.2, 0.35)
    put(sfx, E.sfx_engine(2.2, 40.0, 43), EV["gali.ambruk"] - 1.2, 0.28)
    put(sfx, E.sfx_crack(44), EV["gali.ambruk"] + 0.05, 0.30)
    put(sfx, AWAN.sfx_crickets(0.9), EV["gali.bersin"] + 0.4, 0.22)

    # 5 BRANKAS: beton jebol, angin dalam ruang, ting kacamata, kaching
    put(sfx, E.sfx_crack(51), S["brankas"] + 0.1, 0.55)
    put(sfx, SBY.boom(52, 0.4), S["brankas"] + 0.15, 0.30)
    put(sfx, E.sfx_tinkle(5, 53), EV["brk.bastille"] - 0.2, 0.30)
    put(sfx, E.sfx_hud(2), EV["brk.kotak"] - 0.1, 0.30)
    put(sfx, AWAN.sfx_kaching(), EV["brk.sopan"] + 0.35, 0.40)

    # 5b UANG: laci ditarik, lempar (swoosh), tangkap (pop), endus
    put(sfx, sfx_drawer(0.5, 61), S["uang"] + 0.15, 0.55, -0.2)
    put(sfx, E.sfx_swoosh(0.4, 62), EV["uang.tangkap"] + 0.15, 0.40)
    put(sfx, K.sfx_pop(700), EV["uang.tangkap"] + 0.6, 0.45, 0.2)
    put(sfx, AWAN.sfx_coin(), EV["uang.wangi"] - 0.2, 0.35, 0.2)

    # 6 PESAN: kuas di tembok, las pintu, krik sebelum punchline
    put(sfx, sfx_brush(0.6, 71), EV["psn.senjata"] - 0.1, 0.40)
    put(sfx, sfx_brush(0.6, 72), EV["psn.kekerasan"] - 0.1, 0.40)
    put(sfx, sfx_weld(1.4, 73), S["pesan"] + 0.1, 0.25, -0.3)
    put(sfx, AWAN.sfx_crickets(1.0), EV["psn.mencuri"] - 1.0, 0.28)
    put(sfx, E.sfx_wahwah(), EV["psn.mencuri"] + 0.6, 0.30)

    # 7 TANGKAP: sirene, langkah polisi, borgol klik
    put(sfx, SBY.radio_static(1.0, 81), S["tangkap"] + 0.1, 0.20)
    put(sfx, AWAN.sfx_steps(5, 0.28, 82), EV["tkp.polisi"], 0.30)
    put(sfx, AWAN.sfx_click_lock(), EV["tkp.tertangkap"] + 0.2, 0.55)
    put(sfx, E.sfx_stamp(83), EV["tkp.kubilang"] + 0.3, 0.35)

    # 8 KABUR: kipas angin kantor, kaca/jendela, lompat, bonk atap mobil, motor menjauh, sting penutup
    put(sfx, E.sfx_fan(END["kabur"] - S["kabur"]), S["kabur"], 0.10)
    put(sfx, E.sfx_whiz(91), EV["kbr.melompat"], 0.40)
    put(sfx, sfx_bonk(), EV["kbr.atap"] + 0.05, 0.55)
    put(sfx, sfx_moto(2.4, 92), EV["kbr.motor"], 0.45, 0.3)
    put(sfx, HOR.sfx_record_scratch(93), EV["kbr.hah"] - 0.12, 0.45)
    put(sfx, E.sfx_fanfare(), EV["kbr.lagi"] + 0.3, 0.30)

    # musik heist: pelan di misteri, naik di aksi, mati di jeda komedi
    ip_t = [0, S["ide"], S["got"], S["gali"], S["brankas"], S["uang"], S["pesan"], S["tangkap"], S["kabur"], EV["kbr.melompat"], total]
    ip_v = [0.55, 0.50, 0.55, 0.65, 0.75, 0.80, 0.55, 0.45, 0.60, 0.95, 0.70]
    mutes = [
        (EV["hook.dalam"] - 0.2, EV["hook.dalam"] + 0.9),
        (EV["gali.bersin"] + 0.3, END["gali"]),
        (EV["psn.mencuri"] - 1.0, EV["psn.mencuri"] + 0.4),
        (EV["kbr.hah"] - 0.15, EV["kbr.hah"] + 0.6),
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
