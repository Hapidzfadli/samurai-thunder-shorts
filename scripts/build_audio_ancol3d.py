"""Audio + timing for 'Hari Pertama ke Ancol' - romantic true-story short (stickman).
Writes src/ancol3d_timing.json and public/audio/ancol_master.mp3."""
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
spec2 = importlib.util.spec_from_file_location("a2", ROOT / "scripts" / "build_audio_ancol.py")
a2 = importlib.util.module_from_spec(spec2)
sys.modules["a2"] = a2
spec2.loader.exec_module(a2)
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "ancol3d_timing.json"

ASTI = {"pitch": 1.14, "rate": 1.0, "k": 1.5, "warm": True}
HAPID = {"pitch": 0.96, "rate": 1.05, "k": 1.5}
KAKAK = {"pitch": 1.22, "rate": 1.08, "k": 1.55}
PETUGAS = {"pitch": 0.9, "rate": 1.04, "k": 1.45}
N = lambda **k: dict({"rate": 1.02, "k": 1.45, "warm": True}, **k)

SCENES = [
    ("chat", 0.15, 0.3, 8.0, [
        ("c1", 0.0, "Aku dan Asti kenal lewat Facebook. Awalnya cuma saling sapa, tapi lama-lama, kami chatting setiap hari.", N(emph=["Facebook", "sapa", "setiap", "hari"]), 3),
        ("c2", 0.20, "Sampai akhirnya, aku ingin bertemu langsung.", N(emph=["akhirnya", "bertemu"]), 3),
    ]),
    ("rencana", 0.15, 0.3, 9.0, [
        ("r1", 0.0, "Aku beranikan diri, mengajaknya ke Ancol.", N(emph=["beranikan", "Ancol"]), 3),
        ("r2", 0.15, "Dek Asti, kita ke Ancol yuk?", dict(HAPID, emph=["Ancol", "yuk"]), 3),
        ("r3", 0.15, "Boleh, Kak Hapid!", dict(ASTI, emph=["Boleh", "Hapid"]), 3),
        ("r4", 0.20, "Kami sepakat berangkat di waktu yang pas, dan dapat voucher diskon, jadi hemat beberapa ribu.", N(emph=["voucher", "diskon", "hemat"]), 3),
    ]),
    ("bersiap", 0.15, 0.3, 6.0, [
        ("b1", 0.0, "Hari yang ditunggu pun tiba. Aku grogi sekali, sampai memakai masker.", N(emph=["tiba", "grogi", "masker"]), 3),
    ]),
    ("jemput", 0.15, 0.3, 16.0, [
        ("j1", 0.0, "Aku menjemputnya ke kosan. Pertama kali bertemu, kami cuma saling memandang. Dia tidak pakai masker, jadi dia malu.", N(emph=["menjemputnya", "memandang", "tidak", "malu"]), 3),
        ("j2", 0.15, "Dia menutupi wajahnya dengan tangan, lalu naik ke motorku.", N(emph=["menutupi", "motorku"]), 3),
        ("j3", 0.15, "Kak Hapid, sebentar ya. Aku pinjam masker ke temanku dulu.", dict(ASTI, emph=["sebentar", "pinjam", "masker"]), 3),
        ("j4", 0.15, "Dia pun berlari mencari masker, dan aku cuma bisa tertawa.", N(emph=["berlari", "tertawa"]), 3),
    ]),
    ("motor", 0.15, 0.3, 7.0, [
        ("m1", 0.0, "Dengan masker baru, kami berangkat ke Ancol. Sepanjang jalan, jantungku berdebar.", N(emph=["berangkat", "Ancol", "berdebar"]), 3),
    ]),
    ("foto", 0.15, 0.3, 11.0, [
        ("f1", 0.0, "Di Ancol, kami masih malu-malu. Aku minta tolong seorang kakak, untuk memotret kami.", N(emph=["malu-malu", "memotret"]), 3),
        ("f2", 0.15, "Semoga langgeng ya, Kak!", dict(KAKAK, emph=["langgeng", "Kak"]), 3),
        ("f3", 0.20, "Kami langsung tertawa. Pacaran saja belum!", N(emph=["tertawa", "belum"]), 3),
    ]),
    ("muter", 0.15, 0.3, 10.0, [
        ("w1", 0.0, "Setelah mengantre, kami naik wahana pertama. Wahana yang berputar-putar.", N(emph=["mengantre", "berputar-putar"]), 3),
        ("w2", 0.15, "Kak Hapid, aku mual.", dict(ASTI, emph=["mual"], end="fall"), 3),
        ("w3", 0.15, "Asti sampai mual. Tapi menurutku, seru banget!", N(emph=["mual", "seru", "banget"]), 3),
    ]),
    ("cair", 0.15, 0.3, 17.0, [
        ("e1", 0.0, "Kami mau minum, tapi sama-sama tidak mau membuka masker. Jadi, kami minum bergantian, sambil saling membelakangi.", N(emph=["minum", "tidak", "bergantian", "membelakangi"]), 3),
        ("e2", 0.15, "Lalu kami beli es krim. Masih malu-malu, sampai es krimku jatuh.", N(emph=["es", "krim", "jatuh"]), 3),
        ("e3", 0.15, "Yah, Kak, es krimnya jatuh!", dict(ASTI, emph=["Yah", "jatuh"]), 3),
        ("e4", 0.20, "Akhirnya, kami sepakat, membuka masker bersama-sama.", N(emph=["sepakat", "membuka", "bersama-sama"]), 3),
    ]),
    ("biang", 0.15, 0.3, 11.0, [
        ("g1", 0.0, "Kami naik biang lala, sambil melihat pemandangan laut Ancol yang indah.", N(emph=["biang", "lala", "indah"]), 3),
        ("g2", 0.15, "Indah banget ya, Kak Hapid.", dict(ASTI, emph=["Indah", "banget"]), 3),
        ("g3", 0.20, "Aku cuma tersenyum. Dalam hati, aku berharap, waktu berhenti sebentar.", N(emph=["tersenyum", "berharap", "berhenti"]), 3),
    ]),
    ("makan", 0.15, 0.3, 13.0, [
        ("k1", 0.0, "Kami makan di sebuah tempat makan. Saat membayar, dompetku jatuh.", N(emph=["membayar", "dompetku", "jatuh"]), 3),
        ("k2", 0.15, "Mas, ini dompetnya jatuh.", dict(PETUGAS, emph=["dompetnya", "jatuh"]), 3),
        ("k3", 0.15, "Alhamdulillah, petugasnya baik, dan mengembalikannya. Sambil makan, kami ngobrol panjang, seperti sudah kenal lama.", N(emph=["Alhamdulillah", "baik", "ngobrol", "kenal", "lama"]), 3),
    ]),
    ("coaster", 0.15, 0.3, 14.0, [
        ("s1", 0.0, "Lalu kami naik wahana yang lebih ekstrem, roller coaster. Antreannya panjang sekali.", N(emph=["ekstrem", "roller", "coaster", "panjang"]), 3),
        ("s2", 0.15, "Kak Hapid, aku deg-degan.", dict(ASTI, emph=["deg-degan"]), 3),
        ("s3", 0.15, "Ternyata, seru banget! Kami berteriak sepanjang permainan. Setelahnya agak pusing, tapi kami bahagia.", N(rate=1.05, emph=["seru", "banget", "berteriak", "pusing", "bahagia"]), 3),
    ]),
    ("pulang", 0.15, 0.3, 10.0, [
        ("p1", 0.0, "Hari mulai petang, kami pulang. Aku antar Asti, sampai ke kosannya.", N(emph=["petang", "antar", "kosannya"]), 3),
        ("p2", 0.15, "Makasih ya, Kak Hapid. Hari ini seru banget.", dict(ASTI, emph=["Makasih", "seru"]), 3),
        ("p3", 0.15, "Sama-sama, Dek. Hati-hati ya.", dict(HAPID, emph=["Sama-sama", "Hati-hati"]), 3),
    ]),
    ("akhir", 0.20, 1.5, 10.0, [
        ("a1", 0.0, "Dalam perjalanan pulang, aku senyum-senyum sendiri. Ini adalah hari yang spesial, bagiku.", N(emph=["senyum-senyum", "spesial", "bagiku"], end="fall"), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "chat.cal": s("c1", 0.15), "chat.type": s("c1", 0.4), "chat.heart": s("c1", 0.8), "chat.meet": s("c2", 0.4),
        "rencana.ask": s("r2"), "rencana.yes": s("r3"), "rencana.voucher": s("r4", 0.45),
        "bersiap.mirror": s("b1", 0.3), "bersiap.mask": s("b1", 0.78),
        "jemput.arrive": s("j1"), "jemput.look": s("j1", 0.45), "jemput.cover": s("j2"), "jemput.mount": s("j2", 0.75), "jemput.ask": s("j3"), "jemput.go": s("j4"), "jemput.back": s("j4", 0.7),
        "motor.go": s("m1"), "motor.heart": s("m1", 0.6),
        "foto.ask": s("f1", 0.6), "foto.say": s("f2"), "foto.flash": s("f2", 0.95), "foto.laugh": s("f3"),
        "muter.start": s("w1", 0.6), "muter.mual": s("w2"), "muter.fun": s("w3", 0.55),
        "cair.want": s("e1", 0.1), "cair.turn": s("e1", 0.5), "cair.buy": s("e2"), "cair.drop": s("e2", 0.85), "cair.sigh": s("e3"), "cair.mask": s("e4", 0.5),
        "biang.ride": s("g1"), "biang.view": s("g1", 0.6), "biang.say": s("g2"), "biang.smile": s("g3"),
        "makan.pay": s("k1", 0.55), "makan.drop": s("k1", 0.85), "makan.give": s("k2"), "makan.thanks": s("k3", 0.15), "makan.talk": s("k3", 0.55),
        "coaster.queue": s("s1", 0.5), "coaster.nerv": s("s2"), "coaster.go": s("s3"), "coaster.scream": s("s3", 0.35), "coaster.dizzy": s("s3", 0.75),
        "pulang.ride": s("p1"), "pulang.arrive": s("p1", 0.7), "pulang.thanks": s("p2"), "pulang.reply": s("p3"),
        "akhir.smile": s("a1"), "akhir.sunset": s("a1", 0.6),
    }


def build(voice_arg, out_name="ancol3d_master.mp3"):
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

    for off in (0.0, 0.9, 1.8):
        add(sfx, a2.sfx_ding(1318.5), G("chat.type") + off, gain=0.35)
    add(sfx, a2.sfx_heart(3), G("chat.heart"), gain=0.5)
    add(sfx, a2.sfx_ding(1760.0), G("chat.meet"), gain=0.4)
    add(sfx, l.sfx_pop(900), G("rencana.ask"), gain=0.3)
    add(sfx, a2.sfx_ding(1568.0), G("rencana.yes"), gain=0.4)
    add(sfx, a2.sfx_coin(), G("rencana.voucher"), gain=0.6)
    add(sfx, l.sfx_click(1), G("bersiap.mirror"), gain=0.3)
    add(sfx, l.sfx_pop(800), G("bersiap.mask"), gain=0.4)
    add(sfx, a2.sfx_motor(3.2, 1), G("jemput.arrive") - 0.4, gain=0.5)
    add(sfx, a2.sfx_heart(3), G("jemput.look"), gain=0.45)
    add(sfx, l.sfx_boing(0.5), G("jemput.cover"), gain=0.3)
    add(sfx, l.sfx_pop(800), G("jemput.mount"), gain=0.35)
    add(sfx, r.sfx_swoosh(0.5, 4), G("jemput.go"), gain=0.5)
    add(sfx, l.sfx_pop(1000), G("jemput.back"), gain=0.35)
    add(sfx, a2.sfx_motor(6.0, 2), G("motor.go"), gain=0.5)
    add(sfx, a2.sfx_heart(4), G("motor.heart"), gain=0.5)
    add(sfx, l.sfx_click(4), G("foto.flash"), gain=0.9)
    add(sfx, l.sfx_boing(0.5), G("foto.laugh"), gain=0.3)
    add(sfx, hm.sfx_whoosh_up(2.4), G("muter.start"), gain=0.45)
    add(sfx, hm.sfx_retch(0.9, 8), G("muter.mual") + 0.6, gain=0.3)
    add(sfx, r.sfx_ting(1760.0, 0.6), G("muter.fun"), gain=0.3)
    add(sfx, l.sfx_gulp(1.2), G("cair.turn") + 0.3, gain=0.4)
    add(sfx, l.sfx_pop(700), G("cair.buy"), gain=0.3)
    add(sfx, a2.sfx_splat(), G("cair.drop"), gain=0.7)
    add(sfx, l.sfx_sigh(), G("cair.sigh") + 0.9, gain=0.3)
    add(sfx, a2.sfx_ding(1568.0), G("cair.mask"), gain=0.4)
    add(sfx, a2.sfx_clack(7.0, 120), G("biang.ride"), gain=0.15)
    add(sfx, hm.sfx_chime_up(), G("biang.smile"), gain=0.35)
    add(sfx, l.sfx_pop(500), G("makan.drop"), gain=0.4)
    add(sfx, l.sfx_bonk(), G("makan.drop") + 0.1, gain=0.3)
    add(sfx, a2.sfx_coin(), G("makan.give") + 0.4, gain=0.5)
    add(sfx, r.sfx_ting(1318.5, 0.8), G("makan.talk"), gain=0.2)
    add(sfx, a2.sfx_clack(4.0, 220), G("coaster.queue"), gain=0.1)
    add(sfx, a2.sfx_heart(4, 130), G("coaster.nerv"), gain=0.6)
    add(sfx, a2.sfx_clack(2.6, 360), G("coaster.go") - 0.2, gain=0.5)
    add(sfx, hm.sfx_whoosh_up(3.0), G("coaster.go"), gain=0.55)
    add(sfx, hm.sfx_whoosh_up(2.0), G("coaster.scream") + 0.8, gain=0.4)
    add(sfx, l.sfx_boing(0.6), G("coaster.dizzy"), gain=0.3)
    add(sfx, a2.sfx_motor(4.5, 3), G("pulang.ride"), gain=0.45)
    add(sfx, r.sfx_ting(1046.5, 0.8), G("pulang.arrive"), gain=0.25)
    add(sfx, a2.sfx_ding(1568.0), G("pulang.thanks"), gain=0.3)
    add(sfx, hm.sfx_chime_up(), G("akhir.sunset"), gain=0.45)
    add(sfx, a2.sfx_heart(3, 80), G("akhir.smile"), gain=0.4)

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
    ap.add_argument("--out", default="ancol3d_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)
