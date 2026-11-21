"""Audio + timing for 'Hari Pertama ke Ancol' - romantic true-story short (stickman).
Writes src/sadap_timing.json and public/audio/ancol_master.mp3."""
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
TIMING_JSON = ROOT / "src" / "sadap_timing.json"

PRES = {"pitch": 0.86, "rate": 0.98, "k": 1.5, "warm": True}
OKNUM = {"pitch": 0.94, "rate": 0.95, "k": 1.4, "warm": True}
PETUGAS = {"pitch": 1.06, "rate": 1.05, "k": 1.5}
N = lambda **k: dict({"rate": 1.1, "k": 1.45}, **k)

SCENES = [
    ("istana", 0.1, 0.25, 5.5, [
        ("i1", 0.0, "Di istana, Pak Presiden sedang asyik joget, sambil menelepon.", N(emph=["istana", "joget", "menelepon"]), 3),
        ("i2", 0.15, "Beliau tidak tahu, ada yang ikut mendengarkan.", N(emph=["tidak", "tahu", "mendengarkan"]), 3),
    ]),
    ("kerja", 0.1, 0.25, 6.5, [
        ("k1", 0.0, "Bobby, nanti makan siang pakai sambal ya. Yang pedas.", dict(PRES, emph=["Bobby", "sambal", "pedas"]), 3),
        ("k2", 0.15, "Isi teleponnya? Rahasia negara tingkat tinggi. Soal sambal.", N(emph=["Rahasia", "negara", "sambal"]), 3),
    ]),
    ("server", 0.1, 0.25, 8.0, [
        ("v1", 0.0, "Menurut penyidik, nomor itu diduga dimasukkan ke sistem penyadapan resmi bernama LIMS, tanpa prosedur verifikasi.", N(emph=["diduga", "LIMS", "tanpa", "verifikasi"]), 3),
        ("v2", 0.15, "Pintu verifikasinya ada. Cuma, tidak dilewati.", N(emph=["ada", "tidak", "dilewati"]), 3),
    ]),
    ("daftar", 0.1, 0.25, 9.0, [
        ("d1", 0.0, "Dan bukan cuma nomor Presiden. Yang diduga ikut disadap: pejabat, politisi, jurnalis, ormas, LSM, sampai pengusaha.", N(emph=["bukan", "pejabat", "politisi", "jurnalis", "ormas", "pengusaha"]), 3),
        ("d2", 0.15, "Kalau daftarnya dicetak, struknya lebih panjang dari struk belanja bulanan.", N(emph=["struknya", "panjang", "bulanan"]), 3),
    ]),
    ("bosan", 0.1, 0.25, 5.5, [
        ("b1", 0.0, "Isinya cuma kucing sama sambal lagi.", dict(OKNUM, emph=["kucing", "sambal"], end="fall"), 3),
        ("b2", 0.15, "Ternyata, menyadap itu tidak seseru di film.", N(emph=["tidak", "seseru", "film"]), 3),
    ]),
    ("hapus", 0.1, 0.25, 7.5, [
        ("h1", 0.0, "Lalu sekitar Oktober, rekaman hasil penyadapan diduga diperintahkan untuk dihapus.", N(emph=["Oktober", "diduga", "dihapus"]), 3),
        ("h2", 0.15, "Seperti menghapus riwayat chat, sebelum HP dicek ibu.", N(emph=["riwayat", "chat", "ibu"]), 3),
    ]),
    ("lapor", 0.1, 0.25, 9.0, [
        ("l1", 0.0, "Tapi pada tiga puluh Oktober, seorang petugas melapor.", N(emph=["tiga", "puluh", "Oktober", "melapor"]), 3),
        ("l2", 0.12, "Lapor, Ndan. Ini tidak sesuai SOP.", dict(PETUGAS, emph=["Lapor", "tidak", "SOP"]), 3),
        ("l3", 0.15, "Sistem secanggih apa pun, kalah oleh satu orang yang masih membaca SOP.", N(emph=["secanggih", "kalah", "satu", "SOP"]), 3),
    ]),
    ("bareskrim", 0.1, 0.25, 10.0, [
        ("r1", 0.0, "Bareskrim pun menetapkan sejumlah perwira tinggi sebagai tersangka. Ada yang menjalani sidang etik.", N(emph=["Bareskrim", "tersangka", "sidang", "etik"]), 3),
        ("r2", 0.15, "Pemerintah menyebut, kasus ini mengarah ke dugaan makar. Dalang dan motifnya, masih didalami.", N(emph=["dugaan", "makar", "Dalang", "didalami"]), 3),
    ]),
    ("penutup", 0.15, 1.5, 9.5, [
        ("p1", 0.0, "Kalau mau tahu isi HP saya, tanya saja. Isinya joget, sama foto Bobby.", dict(PRES, emph=["tanya", "joget", "Bobby"]), 3),
        ("p2", 0.2, "Ini parodi. Kasusnya masih berjalan, dan semua tersangka berhak atas praduga tak bersalah.", N(rate=1.0, emph=["parodi", "berjalan", "praduga", "bersalah"]), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "istana.joget": s("i1", 0.4), "istana.rec": s("i2", 0.3),
        "kerja.talk": s("k1"), "kerja.meow": s("k1", 0.3), "kerja.stamp": s("k2", 0.45),
        "server.toss": s("v1", 0.35), "server.door": s("v2"), "server.chain": s("v2", 0.6),
        "daftar.print": s("d1", 0.35), "daftar.long": s("d2", 0.3),
        "bosan.yawn": s("b1"), "bosan.film": s("b2", 0.3),
        "hapus.press": s("h1", 0.6), "hapus.chat": s("h2"),
        "lapor.read": s("l1"), "lapor.salute": s("l2"), "lapor.sop": s("l3", 0.5),
        "bareskrim.set": s("r1", 0.4), "bareskrim.etik": s("r1", 0.8), "bareskrim.makar": s("r2", 0.3),
        "penutup.phone": s("p1", 0.3), "penutup.card": s("p2"),
    }


def sfx_ring(dur=1.4):
    t = np.arange(int(SR * dur)) / SR
    gate = ((t * 4) % 1 < 0.45).astype(float) * (t % 0.7 < 0.45)
    x = (np.sin(2 * np.pi * 1320 * t) * 0.4 + np.sin(2 * np.pi * 1760 * t) * 0.3) * gate
    return (x * 0.5).astype(np.float32)


def sfx_sting():
    t = np.arange(int(SR * 1.6)) / SR
    x = np.zeros_like(t)
    for i, fr in enumerate([196.0, 185.0, 155.6]):
        tt = np.maximum(0, t - i * 0.32)
        x += (np.sign(np.sin(2 * np.pi * fr * tt)) * 0.3 + np.sin(2 * np.pi * fr * tt) * 0.5) * np.exp(-tt * 2.2) * (t >= i * 0.32)
    return (g._lp(x, 2200) * 0.5).astype(np.float32)


def sfx_meow():
    t = np.arange(int(SR * 0.7)) / SR
    f = 700 + 300 * np.sin(np.pi * t / 0.7)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.7) ** 0.7
    return (x * 0.35).astype(np.float32)


def sfx_print(dur=2.5, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 900, 4000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t)))
    x *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1)
    return (x * 0.3).astype(np.float32)


def sfx_keys(dur=1.5, seed=5):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    x = np.zeros(n)
    for k in range(int(dur * 9)):
        st = int(rng.uniform(0, dur - 0.05) * SR)
        m = int(0.03 * SR)
        x[st:st + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.004 * SR))
    return (g._bp(x, 1500, 6000) * 0.5).astype(np.float32)


def build(voice_arg, out_name="sadap_master.mp3"):
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

    base = {k: 0.55 for k in order}
    base.update({"istana": 0.7, "server": 0.45, "hapus": 0.5, "lapor": 0.45, "bareskrim": 0.4, "penutup": 0.65})
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

    add(sfx, sfx_ring(1.4), G("istana.joget") - 1.0, gain=0.4)
    add(sfx, sfx_sting(), G("istana.rec"), gain=0.7)
    add(sfx, sfx_meow(), G("kerja.meow"), gain=0.6)
    add(sfx, hm.sfx_stamp() if hasattr(hm, "sfx_stamp") else l.sfx_bonk(), G("kerja.stamp"), gain=0.6)
    for k in range(5):
        add(sfx, l.sfx_pop(700 + k * 90), G("server.toss") + k * 0.35, gain=0.3)
    add(sfx, l.sfx_bonk(), G("server.chain"), gain=0.45)
    add(sfx, sfx_print(3.2), G("daftar.print"), gain=0.6)
    add(sfx, sfx_print(2.0, 7), G("daftar.long"), gain=0.5)
    add(sfx, l.sfx_sigh(), G("bosan.yawn") + 0.8, gain=0.4)
    add(sfx, l.sfx_click(3), G("hapus.press"), gain=0.8)
    add(sfx, a2.sfx_ding(523.3), G("hapus.press") + 0.1, gain=0.3)
    add(sfx, sfx_keys(1.2), G("hapus.chat"), gain=0.5)
    add(sfx, l.sfx_click(5), G("lapor.salute"), gain=0.4)
    add(sfx, r.sfx_ting(1568.0, 0.8), G("lapor.sop"), gain=0.3)
    add(sfx, l.sfx_bonk(), G("bareskrim.set"), gain=0.6)
    add(sfx, l.sfx_bonk(), G("bareskrim.etik"), gain=0.6)
    add(sfx, sfx_sting(), G("bareskrim.makar"), gain=0.5)
    add(sfx, sfx_ring(1.0), G("penutup.phone") - 0.8, gain=0.3)
    add(sfx, hm.sfx_chime_up(), G("penutup.card"), gain=0.35)

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
    ap.add_argument("--out", default="sadap_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)
