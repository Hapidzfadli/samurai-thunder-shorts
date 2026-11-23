"""Audio + timing for 'Hari Pertama ke Ancol' - romantic true-story short (stickman).
Writes src/ancol_timing.json and public/audio/ancol_master.mp3."""
import argparse
import importlib.util
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("hm", ROOT / "scripts" / "build_audio_hamil.py")
hm = importlib.util.module_from_spec(spec)
sys.modules["hm"] = hm
spec.loader.exec_module(hm)
l, r, g = hm.l, hm.r, hm.g
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "ancol_timing.json"

ASTI = {"pitch": 1.14, "rate": 1.0, "k": 1.5, "warm": True}
HAPID = {"pitch": 0.96, "rate": 1.05, "k": 1.5}
KAKAK = {"pitch": 1.22, "rate": 1.08, "k": 1.55}
PETUGAS = {"pitch": 0.9, "rate": 1.04, "k": 1.45}
N = lambda **k: dict({"rate": 1.02, "k": 1.45, "warm": True}, **k)

SCENES = [
    ("chat", 0.15, 0.3, 8.0, [
        ("chat_1", 0.0, "Aku dan Asti kenal lewat Facebook. Awalnya cuma saling sapa. Lama-lama, kami chatting setiap hari.", N(emph=["Facebook", "sapa", "setiap", "hari"]), 3),
        ("chat_2", 0.20, "Ada saja yang kami obrolkan, sampai aku ingin bertemu langsung.", N(emph=["obrolkan", "bertemu"]), 3),
    ]),
    ("rencana", 0.15, 0.3, 9.0, [
        ("rencana_1", 0.0, "Akhirnya, aku beranikan diri, mengajaknya main ke Ancol.", N(emph=["beranikan", "Ancol"]), 3),
        ("rencana_2", 0.15, "Dek Asti, kita ke Ancol yuk?", dict(HAPID, emph=["Ancol", "yuk"]), 3),
        ("rencana_3", 0.15, "Boleh, Kak Hapid!", dict(ASTI, emph=["Boleh", "Hapid"]), 3),
        ("rencana_4", 0.20, "Kami sepakat berangkat di waktu yang pas. Dapat voucher diskon pula, jadi hemat beberapa ribu.", N(emph=["voucher", "diskon", "hemat"]), 3),
    ]),
    ("jemput", 0.15, 0.3, 9.0, [
        ("jemput_1", 0.0, "Hari yang ditunggu tiba. Aku menjemputnya ke kosan, dengan memakai masker.", N(emph=["menjemputnya", "masker"]), 3),
        ("jemput_2", 0.20, "Pertama kali bertemu, kami cuma saling memandang. Dia tidak memakai masker, jadi dia malu.", N(emph=["memandang", "tidak", "malu"]), 3),
    ]),
    ("malu", 0.15, 0.3, 10.0, [
        ("malu_1", 0.0, "Asti menutupi wajahnya dengan tangan, seolah-olah sedang pakai masker. Lalu dia naik ke motorku.", N(emph=["menutupi", "seolah-olah", "motorku"]), 3),
        ("malu_2", 0.15, "Kak Hapid, sebentar ya. Aku pinjam masker ke temanku dulu.", dict(ASTI, emph=["sebentar", "pinjam", "masker"]), 3),
        ("malu_3", 0.15, "Dia pun berlari mencari masker ke temannya. Aku cuma bisa tertawa.", N(emph=["berlari", "tertawa"]), 3),
    ]),
    ("jalan", 0.15, 0.3, 9.0, [
        ("jalan_1", 0.0, "Dengan masker baru, kami berangkat. Sepanjang jalan, jantungku berdebar.", N(emph=["berangkat", "berdebar"]), 3),
        ("jalan_2", 0.20, "Sampai di Ancol, kami masih malu-malu, dan saling memakai masker.", N(emph=["Ancol", "malu-malu"]), 3),
    ]),
    ("foto", 0.15, 0.3, 11.0, [
        ("foto_1", 0.0, "Kami ingin berfoto. Aku minta tolong seorang kakak untuk memotret kami.", N(emph=["berfoto", "memotret"]), 3),
        ("foto_2", 0.15, "Semoga langgeng ya, Kak!", dict(KAKAK, emph=["langgeng", "Kak"]), 3),
        ("foto_3", 0.20, "Kami langsung tertawa. Pacaran saja belum!", N(emph=["tertawa", "belum"]), 3),
    ]),
    ("muter", 0.15, 0.3, 10.0, [
        ("muter_1", 0.0, "Setelah mengantre, kami naik wahana pertama. Wahana yang berputar-putar.", N(emph=["mengantre", "berputar-putar"]), 3),
        ("muter_2", 0.15, "Kak Hapid, aku mual.", dict(ASTI, emph=["mual"], end="fall"), 3),
        ("muter_3", 0.15, "Asti sampai mual. Tapi menurutku, seru banget!", N(emph=["mual", "seru", "banget"]), 3),
    ]),
    ("minum", 0.15, 0.3, 9.0, [
        ("minum_1", 0.0, "Kami mau minum. Tapi, sama-sama tidak mau membuka masker.", N(emph=["minum", "tidak", "masker"]), 3),
        ("minum_2", 0.20, "Jadi, kami minum bergantian, sambil saling membelakangi. Malu banget!", N(emph=["bergantian", "membelakangi", "Malu"]), 3),
    ]),
    ("eskrim", 0.15, 0.3, 10.0, [
        ("eskrim_1", 0.0, "Lalu kami beli es krim. Masih malu-malu juga, sampai es krimku jatuh.", N(emph=["es", "krim", "jatuh"]), 3),
        ("eskrim_2", 0.15, "Yah, Kak, es krimnya jatuh!", dict(ASTI, emph=["Yah", "jatuh"]), 3),
        ("eskrim_3", 0.20, "Akhirnya, kami sepakat, membuka masker bersama-sama.", N(emph=["sepakat", "membuka", "bersama-sama"]), 3),
    ]),
    ("biang", 0.15, 0.3, 11.0, [
        ("biang_1", 0.0, "Kami naik biang lala, sambil melihat pemandangan laut Ancol yang indah.", N(emph=["biang", "lala", "indah"]), 3),
        ("biang_2", 0.15, "Indah banget ya, Kak Hapid.", dict(ASTI, emph=["Indah", "banget"]), 3),
        ("biang_3", 0.20, "Aku cuma tersenyum. Dalam hati, aku berharap, waktu berhenti sebentar.", N(emph=["tersenyum", "berharap", "berhenti"]), 3),
    ]),
    ("makan", 0.15, 0.3, 13.0, [
        ("makan_1", 0.0, "Setelah itu, kami makan di sebuah tempat makan. Saat membayar, dompetku jatuh.", N(emph=["membayar", "dompetku", "jatuh"]), 3),
        ("makan_2", 0.15, "Mas, ini dompetnya jatuh.", dict(PETUGAS, emph=["dompetnya", "jatuh"]), 3),
        ("makan_3", 0.15, "Alhamdulillah, petugasnya baik, dan mengembalikannya padaku.", N(emph=["Alhamdulillah", "baik", "mengembalikannya"]), 3),
        ("makan_4", 0.20, "Sambil makan, kami ngobrol panjang. Rasanya seperti sudah kenal lama.", N(emph=["ngobrol", "panjang", "kenal", "lama"]), 3),
    ]),
    ("coaster", 0.15, 0.3, 14.0, [
        ("coaster_1", 0.0, "Lalu, kami naik wahana yang lebih ekstrem. Roller coaster. Antreannya panjang sekali.", N(emph=["ekstrem", "Roller", "coaster", "panjang"]), 3),
        ("coaster_2", 0.15, "Kak Hapid, aku deg-degan.", dict(ASTI, emph=["deg-degan"]), 3),
        ("coaster_3", 0.15, "Ternyata, seru banget! Kami berteriak sepanjang permainan.", N(rate=1.06, emph=["seru", "banget", "berteriak"]), 3),
        ("coaster_4", 0.20, "Setelahnya, agak pusing. Tapi kami bahagia.", N(emph=["pusing", "bahagia"]), 3),
    ]),
    ("pulang", 0.15, 0.3, 10.0, [
        ("pulang_1", 0.0, "Hari mulai petang, kami pulang. Aku antar Asti, sampai ke kosannya.", N(emph=["petang", "antar", "kosannya"]), 3),
        ("pulang_2", 0.15, "Makasih ya, Kak Hapid. Hari ini seru banget.", dict(ASTI, emph=["Makasih", "seru"]), 3),
        ("pulang_3", 0.15, "Sama-sama, Dek. Hati-hati ya.", dict(HAPID, emph=["Sama-sama", "Hati-hati"]), 3),
    ]),
    ("akhir", 0.20, 1.5, 10.0, [
        ("akhir_1", 0.0, "Dalam perjalanan pulang, aku senyum-senyum sendiri. Ini adalah hari yang spesial, bagiku.", N(emph=["senyum-senyum", "spesial", "bagiku"], end="fall"), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "chat.type": s("chat_1", 0.1), "chat.heart": s("chat_1", 0.7), "chat.meet": s("chat_2", 0.6),
        "rencana.ask": s("rencana_2"), "rencana.yes": s("rencana_3"), "rencana.voucher": s("rencana_4", 0.5),
        "jemput.arrive": s("jemput_1"), "jemput.out": s("jemput_2"), "jemput.look": s("jemput_2", 0.45),
        "malu.cover": s("malu_1"), "malu.mount": s("malu_1", 0.7), "malu.ask": s("malu_2"), "malu.go": s("malu_3"), "malu.back": s("malu_3", 0.7),
        "jalan.go": s("jalan_1"), "jalan.heart": s("jalan_1", 0.6), "jalan.arrive": s("jalan_2"),
        "foto.ask": s("foto_1", 0.5), "foto.say": s("foto_2"), "foto.flash": s("foto_2", 0.95), "foto.laugh": s("foto_3"),
        "muter.start": s("muter_1", 0.5), "muter.mual": s("muter_2"), "muter.fun": s("muter_3", 0.55),
        "minum.want": s("minum_1", 0.1), "minum.turn": s("minum_2"), "minum.drink": s("minum_2", 0.5),
        "eskrim.buy": s("eskrim_1"), "eskrim.drop": s("eskrim_1", 0.82), "eskrim.sigh": s("eskrim_2"), "eskrim.mask": s("eskrim_3", 0.5),
        "biang.ride": s("biang_1"), "biang.view": s("biang_1", 0.6), "biang.say": s("biang_2"), "biang.smile": s("biang_3"),
        "makan.pay": s("makan_1", 0.55), "makan.drop": s("makan_1", 0.82), "makan.give": s("makan_2"), "makan.thanks": s("makan_3", 0.3), "makan.talk": s("makan_4"),
        "coaster.queue": s("coaster_1", 0.5), "coaster.nerv": s("coaster_2"), "coaster.go": s("coaster_3"), "coaster.scream": s("coaster_3", 0.5), "coaster.dizzy": s("coaster_4"),
        "pulang.ride": s("pulang_1"), "pulang.arrive": s("pulang_1", 0.72), "pulang.thanks": s("pulang_2"), "pulang.reply": s("pulang_3"),
        "akhir.smile": s("akhir_1"), "akhir.sunset": s("akhir_1", 0.6),
    }


def sfx_motor(dur=3.0, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 62 + 6 * np.sin(2 * np.pi * 9 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + g._lp(rng.standard_normal(n), 400) * 0.25
    x *= (0.7 + 0.3 * np.sin(2 * np.pi * 14 * t)) * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.3)
    return (x * 0.7).astype(np.float32)


def sfx_heart(beats=4, bpm=96):
    n = int(SR * (beats * 60 / bpm + 0.4))
    x = np.zeros(n)
    for i in range(beats):
        for off, a in ((0.0, 1.0), (0.17, 0.7)):
            st = int(SR * (i * 60 / bpm + off))
            m = min(int(SR * 0.16), n - st)
            tt = np.arange(m) / SR
            x[st:st + m] += np.sin(2 * np.pi * 62 * tt) * np.exp(-tt * 22) * a
    return (x * 0.9).astype(np.float32)


def sfx_ding(f=1568.0):
    t = np.arange(int(SR * 0.7)) / SR
    return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t * 7) * 0.3).astype(np.float32)


def sfx_clack(dur=3.0, bpm=330):
    n = int(SR * dur)
    x = np.zeros(n)
    step = int(SR * 60 / bpm)
    for st in range(0, n - 600, step):
        tt = np.arange(600) / SR
        x[st:st + 600] += np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 60) * 0.7
    return (x * np.minimum(1, (dur - np.arange(n) / SR) / 0.3)).astype(np.float32)


def sfx_splat():
    rng = np.random.default_rng(9)
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    x = g._lp(rng.standard_normal(n), 1400) * np.exp(-t * 9) + np.sin(2 * np.pi * (180 - 100 * t) * t) * np.exp(-t * 10) * 0.6
    return (x * 0.7).astype(np.float32)


def sfx_coin(dur=1.0):
    t = np.arange(int(SR * dur)) / SR
    x = np.zeros_like(t)
    for i, fr in enumerate([2093.0, 2637.0]):
        tt = np.maximum(0, t - i * 0.09)
        x += np.sin(2 * np.pi * fr * tt) * np.exp(-tt * 9) * (t >= i * 0.09)
    return (x * 0.3).astype(np.float32)


def build(voice_arg, out_name="ancol_master.mp3"):
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

    base = {k: 0.6 for k in order}
    base.update({"chat": 0.5, "foto": 0.7, "muter": 0.8, "coaster": 0.85, "biang": 0.45, "pulang": 0.5, "akhir": 0.4})
    ip_t, ip_v = [0.0], [0.5]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mus = r.music_bed(total, (ip_t, ip_v), [])
    tt = np.linspace(0, total, N_, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 3.0, total], [0, 1, 1, 0])[:, None]
    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.25)

    for nm, off in (("chat.type", 0.0), ("chat.type", 0.9), ("chat.type", 1.8)):
        add(sfx, sfx_ding(1318.5), G(nm) + off, gain=0.35)
    add(sfx, sfx_heart(3), G("chat.heart"), gain=0.5)
    add(sfx, sfx_ding(1760.0), G("chat.meet"), gain=0.4)
    add(sfx, l.sfx_pop(900), G("rencana.ask"), gain=0.3)
    add(sfx, sfx_ding(1568.0), G("rencana.yes"), gain=0.4)
    add(sfx, sfx_coin(), G("rencana.voucher"), gain=0.6)
    add(sfx, sfx_motor(3.2, 1), G("jemput.arrive") - 0.2, gain=0.5)
    add(sfx, sfx_heart(3), G("jemput.look"), gain=0.45)
    add(sfx, l.sfx_boing(0.5), G("malu.cover"), gain=0.3)
    add(sfx, l.sfx_pop(800), G("malu.mount"), gain=0.35)
    add(sfx, r.sfx_swoosh(0.5, 4), G("malu.go"), gain=0.5)
    add(sfx, l.sfx_pop(1000), G("malu.back"), gain=0.35)
    add(sfx, sfx_motor(5.5, 2), G("jalan.go"), gain=0.5)
    add(sfx, sfx_heart(4), G("jalan.heart"), gain=0.5)
    add(sfx, r.sfx_ting(1568.0, 0.8), G("jalan.arrive"), gain=0.25)
    add(sfx, l.sfx_click(4), G("foto.flash"), gain=0.9)
    add(sfx, l.sfx_boing(0.5), G("foto.laugh"), gain=0.3)
    add(sfx, hm.sfx_whoosh_up(2.4), G("muter.start"), gain=0.45)
    add(sfx, hm.sfx_retch(0.9, 8), G("muter.mual") + 0.6, gain=0.3)
    add(sfx, r.sfx_ting(1760.0, 0.6), G("muter.fun"), gain=0.3)
    add(sfx, l.sfx_gulp(1.2), G("minum.drink"), gain=0.4)
    add(sfx, l.sfx_pop(700), G("eskrim.buy"), gain=0.3)
    add(sfx, sfx_splat(), G("eskrim.drop"), gain=0.7)
    add(sfx, l.sfx_sigh(), G("eskrim.sigh") + 0.9, gain=0.3)
    add(sfx, sfx_ding(1568.0), G("eskrim.mask"), gain=0.4)
    add(sfx, sfx_clack(6.0, 120), G("biang.ride"), gain=0.15)
    add(sfx, hm.sfx_chime_up(), G("biang.smile"), gain=0.35)
    add(sfx, l.sfx_pop(500), G("makan.drop"), gain=0.4)
    add(sfx, l.sfx_bonk(), G("makan.drop") + 0.1, gain=0.3)
    add(sfx, sfx_coin(), G("makan.give") + 0.4, gain=0.5)
    add(sfx, r.sfx_ting(1318.5, 0.8), G("makan.talk"), gain=0.2)
    add(sfx, sfx_clack(4.0, 220), G("coaster.queue"), gain=0.1)
    add(sfx, sfx_heart(4, 130), G("coaster.nerv"), gain=0.6)
    add(sfx, sfx_clack(2.6, 360), G("coaster.go") - 0.2, gain=0.5)
    add(sfx, hm.sfx_whoosh_up(3.0), G("coaster.go"), gain=0.55)
    add(sfx, hm.sfx_whoosh_up(2.0), G("coaster.scream") + 0.8, gain=0.4)
    add(sfx, l.sfx_boing(0.6), G("coaster.dizzy"), gain=0.3)
    add(sfx, sfx_motor(4.5, 3), G("pulang.ride"), gain=0.45)
    add(sfx, r.sfx_ting(1046.5, 0.8), G("pulang.arrive"), gain=0.25)
    add(sfx, sfx_ding(1568.0), G("pulang.thanks"), gain=0.3)
    add(sfx, hm.sfx_chime_up(), G("akhir.sunset"), gain=0.45)
    add(sfx, sfx_heart(3, 80), G("akhir.smile"), gain=0.4)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    master = mus * 0.85 * (1.0 / (1.0 + 6.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.0 * env))[:, None] + vo * 1.25
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
    print(f"Selesai! {out_mp3}, jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
    ap.add_argument("--out", default="ancol_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)
