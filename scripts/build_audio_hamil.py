"""Audio + timing for 'Asti dan Alarm Hidung' - health education about morning sickness in pregnancy (stickman).

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/hamil_timing.json and public/audio/hamil_master.mp3.
"""
import argparse
import importlib.util
import math
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("l", ROOT / "scripts" / "build_audio_level30.py")
l = importlib.util.module_from_spec(spec)
sys.modules["l"] = l
spec.loader.exec_module(l)
r, g = l.r, l.g
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "hamil_timing.json"


ASTI = {"pitch": 1.14, "rate": 1.0, "k": 1.5, "warm": True}
HAPID = {"pitch": 0.93, "rate": 1.1, "k": 1.55}
BIDAN = {"pitch": 1.02, "rate": 0.93, "k": 1.4, "warm": True}
KURIR = {"pitch": 1.45, "rate": 1.12, "k": 1.55}
SATPAM = {"pitch": 0.8, "rate": 1.05, "k": 1.6}
N = lambda **k: dict({"rate": 1.06, "k": 1.5}, **k)

SCENES = [
    ("hook", 0.15, 0.3, 7.0, [
        ("hook_1", 0.0, "Pagi hari. Pak Hapid dengan bangga memasak nasi goreng spesial, untuk istrinya, Bu Asti.", N(emph=["bangga", "spesial", "Asti"]), 3),
        ("hook_2", 0.20, "Sayang, sarapan sudah siap!", dict(HAPID, emph=["sarapan", "siap"]), 3),
        ("hook_3", 0.15, "Tapi begitu aromanya tercium, Bu Asti langsung lari!", N(emph=["tercium", "lari"]), 3),
    ]),
    ("mandi", 0.15, 0.3, 9.0, [
        ("mandi_1", 0.0, "Di kamar mandi, Bu Asti mual dan muntah. Pak Hapid panik.", N(emph=["mual", "muntah", "panik"]), 3),
        ("mandi_2", 0.15, "Astaga! Apa nasi gorengku beracun?!", dict(HAPID, emph=["Astaga", "beracun"]), 3),
        ("mandi_3", 0.20, "Tenang, Pak Hapid. Bukan salah nasi gorengnya. Ini sangat umum. Sekitar tujuh dari sepuluh ibu hamil mengalaminya.", N(emph=["Tenang", "umum", "tujuh", "sepuluh"]), 3),
    ]),
    ("klinik", 0.15, 0.3, 10.0, [
        ("klinik_1", 0.0, "Di klinik, Bu Bidan Ratih menjelaskan.", N(), 3),
        ("klinik_2", 0.15, "Ini sering disebut morning sickness. Padahal bisa muncul kapan saja. Pagi, siang, bahkan malam.", dict(BIDAN, emph=["kapan", "saja", "malam"]), 3),
        ("klinik_3", 0.15, "Jadi, bukan salah nasi goreng, Bu Bidan?", dict(HAPID, emph=["bukan", "salah"]), 3),
        ("klinik_4", 0.15, "Bukan, Pak. Mari kita lihat ke dalam tubuh Bu Asti.", dict(BIDAN, emph=["Bukan", "dalam"]), 3),
    ]),
    ("tubuh", 0.15, 0.3, 11.0, [
        ("tubuh_1", 0.0, "Di awal kehamilan, kadar hormon naik pesat. Antara lain hormon hCG, dan estrogen.", N(emph=["hormon", "naik", "pesat", "hCG", "estrogen"]), 3),
        ("tubuh_2", 0.15, "Surat! Surat untuk semua organ! Kamu hamil!", dict(KURIR, emph=["Surat", "hamil"]), 3),
        ("tubuh_3", 0.20, "Lonjakan hormon ini dikaitkan dengan rasa mual, tapi bukan satu-satunya penyebab.", N(emph=["dikaitkan", "mual", "bukan"]), 3),
    ]),
    ("hidung", 0.15, 0.3, 11.0, [
        ("hidung_1", 0.0, "Hidung juga jadi jauh lebih peka terhadap bau. Ini masih dugaan, penyebab pastinya belum sepenuhnya diketahui.", N(emph=["peka", "dugaan", "belum"]), 3),
        ("hidung_2", 0.15, "Awas! Bau nasi goreng! Alarm! Alarm!", dict(SATPAM, emph=["Awas", "Alarm"]), 3),
        ("hidung_3", 0.20, "Akibatnya, aroma yang biasanya enak, bisa terasa menyebalkan.", N(emph=["enak", "menyebalkan"]), 3),
    ]),
    ("grafik", 0.15, 0.3, 11.0, [
        ("grafik_1", 0.0, "Kabar baiknya, ada masanya. Biasanya mulai sekitar minggu kelima, memuncak sekitar minggu kesembilan, lalu membaik sekitar minggu keenam belas sampai kedelapan belas.", N(emph=["kelima", "kesembilan", "membaik"]), 3),
        ("grafik_2", 0.20, "Jadi, ini nggak selamanya, ya?", dict(ASTI, emph=["nggak", "selamanya"]), 3),
    ]),
    ("tips", 0.15, 0.3, 11.0, [
        ("tips_1", 0.0, "Ada beberapa tips. Taruh biskuit kering di samping kasur, makan sedikit tapi sering, dan minum sedikit demi sedikit.", dict(BIDAN, emph=["biskuit", "sedikit", "sering", "minum"]), 3),
        ("tips_2", 0.20, "Siap, Bu Bidan! Serahkan padaku!", dict(HAPID, emph=["Siap", "Serahkan"]), 3),
    ]),
    ("siaga", 0.15, 0.3, 11.0, [
        ("siaga_1", 0.0, "Sejak itu, Pak Hapid jadi suami siaga.", N(emph=["suami", "siaga"]), 3),
        ("siaga_2", 0.15, "Biskuit sudah! Jendela dibuka! Penanak nasi, aku asingkan!", dict(HAPID, emph=["Biskuit", "Jendela", "asingkan"]), 3),
        ("siaga_3", 0.20, "Sayang, biskuitnya terlalu banyak.", dict(ASTI, emph=["terlalu", "banyak"], end="fall"), 3),
    ]),
    ("bahaya", 0.15, 0.3, 14.0, [
        ("bahaya_1", 0.0, "Tapi tetap waspada. Segera ke dokter atau bidan, kalau muntah terus sampai tidak bisa makan atau minum, badan lemas, air seni sangat pekat atau jarang, atau berat badan turun.", N(rate=1.0, emph=["waspada", "Segera", "lemas", "pekat", "turun"]), 3),
        ("bahaya_2", 0.20, "Itu bisa jadi hiperemesis gravidarum, dan perlu penanganan medis.", N(rate=1.0, emph=["hiperemesis", "gravidarum", "medis"]), 3),
    ]),
    ("akhir", 0.20, 1.5, 11.0, [
        ("akhir_1", 0.0, "Beberapa minggu kemudian, Bu Asti sudah bisa menikmati nasi goreng lagi.", N(emph=["minggu", "menikmati", "lagi"]), 3),
        ("akhir_2", 0.25, "Sayang, tambah kerupuknya!", dict(ASTI, emph=["tambah", "kerupuknya"]), 3),
        ("akhir_3", 0.30, "Ingat, ini konten edukasi, bukan pengganti konsultasi dengan bidan atau dokter.", N(rate=1.0, emph=["edukasi", "bukan", "bidan", "dokter"]), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.cook": s("hook_1", 0.2), "hook.call": s("hook_2"), "hook.smell": s("hook_3", 0.25), "hook.run": s("hook_3", 0.6),
        "mandi.retch": s("mandi_1", 0.3), "mandi.panic": s("mandi_2"), "mandi.stat": s("mandi_3", 0.55),
        "klinik.in": s("klinik_1"), "klinik.morning": s("klinik_2", 0.2), "klinik.night": s("klinik_2", 0.8), "klinik.ask": s("klinik_3"), "klinik.zoom": s("klinik_4", 0.55),
        "tubuh.in": s("tubuh_1"), "tubuh.mail": s("tubuh_2"), "tubuh.shout": s("tubuh_2", 0.3), "tubuh.cause": s("tubuh_3"),
        "hidung.nose": s("hidung_1", 0.1), "hidung.guess": s("hidung_1", 0.55), "hidung.alarm": s("hidung_2"), "hidung.bad": s("hidung_3"),
        "grafik.start": s("grafik_1", 0.0), "grafik.peak": s("grafik_1", 0.5), "grafik.end": s("grafik_1", 0.82), "grafik.ask": s("grafik_2"),
        "tips.biscuit": s("tips_1", 0.2), "tips.small": s("tips_1", 0.5), "tips.drink": s("tips_1", 0.78), "tips.ok": s("tips_2"),
        "siaga.start": s("siaga_1"), "siaga.run": s("siaga_2"), "siaga.pile": s("siaga_2", 0.4), "siaga.fall": s("siaga_2", 0.85), "siaga.asti": s("siaga_3"),
        "bahaya.sign": s("bahaya_1"), "bahaya.i1": s("bahaya_1", 0.35), "bahaya.i2": s("bahaya_1", 0.55), "bahaya.i3": s("bahaya_1", 0.75), "bahaya.i4": s("bahaya_1", 0.9), "bahaya.name": s("bahaya_2"),
        "akhir.eat": s("akhir_1"), "akhir.ask": s("akhir_2"), "akhir.card": s("akhir_3"),
    }


# ------------------------------------------------------------------ SFX
def sfx_sizzle(dur=3.0, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 2500, 9000) * (0.5 + 0.5 * rng.random(n) ** 3)
    x *= np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.4)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.35).astype(np.float32)


def sfx_retch(dur=1.3, seed=2):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 190 - 90 * t / dur + 18 * np.sin(2 * np.pi * 7 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + g._lp(rng.standard_normal(n), 900) * 0.4
    x *= (0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 2.6 * t))) * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.25)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.55).astype(np.float32)


def sfx_siren(dur=2.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 700 + 300 * np.sign(np.sin(2 * np.pi * 2.5 * t))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    x = g._lp(x, 3500) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.1)
    return (x * 0.5).astype(np.float32)


def sfx_whoosh_up(dur=1.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 200 + 1400 * (t / dur) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35 + g._bp(np.random.default_rng(4).standard_normal(n), 800, 5000) * 0.3
    x *= np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2)
    return (x * 0.6).astype(np.float32)


def sfx_warn(dur=1.2):
    n = int(SR * dur)
    t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * 3.3 * t) > 0).astype(float)
    x = (np.sin(2 * np.pi * 880 * t) * 0.5 + np.sin(2 * np.pi * 660 * t) * 0.3) * gate
    x *= np.minimum(1, (dur - t) / 0.1)
    return (x * 0.45).astype(np.float32)


def sfx_chime_up():
    t = np.arange(int(SR * 1.4)) / SR
    x = np.zeros_like(t)
    for i, fr in enumerate([523.3, 659.3, 784.0, 1046.5]):
        tt = np.maximum(0, t - i * 0.12)
        x += np.sin(2 * np.pi * fr * tt) * np.exp(-tt * 4) * (t >= i * 0.12)
    return (x * 0.25).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="hamil_master.mp3"):
    narr_wav = g.prepare_voice_prompt(voice_arg)
    narr = g.tts_model.get_state_for_audio_prompt(str(narr_wav))
    g.SCENES = SCENES
    g.TIMING_JSON = TIMING_JSON
    g.STEP_F = {}

    clips = {}
    for key, _, _, _, segs in SCENES:
        for sid, gap, text, fx, n in segs:
            raw = g.get_raw(narr, narr_wav.name, sid, text, n)
            clips[sid] = g.apply_fx(raw, fx, text, sid)
            print(f"  {sid:10s} {len(clips[sid]) / SR:4.2f}s  {text[:56]}")
    P = g.plan(clips)
    ev = anchors(P)
    timing = g.write_timing(P, ev)
    total = P["total_s"]
    print(f"Total durasi video: {total:.1f}s ({timing['total_frames']} frame)")
    for k, v in P["scenes"].items():
        print(f"  scene {k:8s} {v['frames']:4d}f  mulai {v['start_s']:.2f}s")

    g.set_duration(total)
    N_ = g.N_SAMPLES
    S = {k: v["start_s"] for k, v in P["scenes"].items()}
    L = P["lines"]
    G = lambda name: S[name.split(".")[0]] + ev[name]
    order = [k for k, *_ in SCENES]
    scene_end = {k: S[k] + P["scenes"][k]["frames"] / FPS for k in order}

    sfx = np.zeros((N_, 2), dtype=np.float32)
    vo = np.zeros((N_, 2), dtype=np.float32)
    add = g.add_clip

    base = {"hook": 0.6, "mandi": 0.5, "klinik": 0.45, "tubuh": 0.65, "hidung": 0.65, "grafik": 0.5, "tips": 0.55, "siaga": 0.75, "bahaya": 0.25, "akhir": 0.6}
    ip_t, ip_v = [0.0], [0.55]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("bahaya.sign") - 0.2, G("bahaya.sign") + 0.4)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N_, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.3)

    add(sfx, sfx_sizzle(L["hook_1"]["le"] - L["hook_1"]["ls"] + 1.0), G("hook.cook") - 0.2, gain=0.6)
    add(sfx, r.sfx_ting(1568.0, 0.5), G("hook.call") - 0.1, gain=0.2)
    add(sfx, l.sfx_sniff(), G("hook.smell"), gain=0.5)
    add(sfx, r.sfx_swoosh(0.5, 5), G("hook.run"), gain=0.5)
    add(sfx, sfx_retch(1.3, 2), G("mandi.retch"), gain=0.7)
    add(sfx, sfx_retch(1.1, 5), G("mandi.retch") + 1.4, gain=0.55)
    add(sfx, l.sfx_boing(0.6), G("mandi.panic"), gain=0.3)
    add(sfx, r.sfx_ting(1760.0, 0.8), G("mandi.stat"), gain=0.3)
    add(sfx, r.sfx_ting(1318.5, 0.6), G("klinik.in"), gain=0.2)
    add(sfx, r.sfx_ting(1568.0, 0.5), G("klinik.morning"), gain=0.2)
    add(sfx, r.sfx_ting(988.0, 0.6), G("klinik.night"), gain=0.2)
    add(sfx, sfx_whoosh_up(1.4), G("klinik.zoom"), gain=0.7)
    add(sfx, r.sfx_swoosh(0.6, 9), G("tubuh.mail"), gain=0.5)
    add(sfx, l.sfx_pop(900), G("tubuh.shout"), gain=0.3)
    add(sfx, r.sfx_ting(1760.0, 0.8), G("tubuh.cause"), gain=0.25)
    add(sfx, l.sfx_sniff(), G("hidung.nose"), gain=0.4)
    add(sfx, sfx_siren(2.0), G("hidung.alarm"), gain=0.55)
    add(sfx, l.sfx_pop(500), G("hidung.bad"), gain=0.3)
    add(sfx, r.sfx_ting(1046.5, 0.8), G("grafik.start"), gain=0.25)
    add(sfx, r.sfx_ting(1568.0, 0.8), G("grafik.peak"), gain=0.3)
    add(sfx, sfx_chime_up(), G("grafik.end"), gain=0.5)
    add(sfx, l.sfx_pop(900), G("tips.biscuit"), gain=0.35)
    add(sfx, l.sfx_pop(1100), G("tips.small"), gain=0.35)
    add(sfx, l.sfx_drip(1200, 2), G("tips.drink"), gain=0.4)
    add(sfx, l.sfx_boing(0.5), G("tips.ok"), gain=0.3)
    add(sfx, r.sfx_swoosh(0.4, 11), G("siaga.run"), gain=0.5)
    add(sfx, l.sfx_pop(700), G("siaga.pile"), gain=0.3)
    add(sfx, l.sfx_bonk(), G("siaga.fall"), gain=0.6)
    add(sfx, r.sfx_crinkle(1.0, 6), G("siaga.fall") + 0.1, gain=0.4)
    add(sfx, sfx_warn(1.2), G("bahaya.sign"), gain=0.7)
    for i in (1, 2, 3, 4):
        add(sfx, r.sfx_ting(880.0, 0.4), G(f"bahaya.i{i}"), gain=0.25)
    add(sfx, r.sfx_ting(659.3, 0.9), G("bahaya.name"), gain=0.3)
    add(sfx, sfx_sizzle(1.6, 3), G("akhir.eat") - 0.2, gain=0.3)
    add(sfx, l.sfx_crunch(1), G("akhir.ask") + 0.5, gain=0.5)
    add(sfx, sfx_chime_up(), G("akhir.card"), gain=0.4)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 6.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.0 * env)
    master = mus * 0.85 * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
    fade_in = np.minimum(1.0, np.linspace(0, total, N_) / 0.1)
    fade_out = np.minimum(1.0, np.linspace(total, 0, N_) / 0.8)
    master *= (fade_in * fade_out)[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.6) / np.tanh(1.6) * 0.92

    out_mp3 = g.OUT_DIR / out_name
    wav_path = out_mp3.with_suffix(".wav")
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(out_mp3)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wav_path.unlink(missing_ok=True)
    print(f"Selesai! Master audio: {out_mp3} ({out_mp3.stat().st_size // 1024} KB), jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
    ap.add_argument("--out", default="hamil_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)
