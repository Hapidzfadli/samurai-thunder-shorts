"""Uji kelancaran VoxCPM2: satu tarikan napas vs per kalimat utuh (bukan potongan frasa).
Jalankan dengan .venv/bin/python scripts/tts_lab_smooth.py"""
import subprocess, time, wave
from pathlib import Path
import numpy as np, torch
from voxcpm import VoxCPM

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "out" / "tts_lab"; WORK.mkdir(parents=True, exist_ok=True)
DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
torch.set_num_threads(4)
# Referensi bersih: dua kalimat utuh (tidak terpotong di tengah kata/kalimat)
REF = WORK / "ref_bersih.wav"
REF_TEXT = ("Dodi, tukang cukur baru itu, bisa membuat rambut orang berdiri cuma dengan lewat. "
            "Rambut deretan pelanggan di bangku tunggu tegak serentak dan condong ke arahnya, seperti padi yang tertiup angin.")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "0", "-t", "10.45", "-i", str(DODI), "-af", "afade=t=out:st=10.3:d=0.15", "-ar", "24000", "-ac", "1", str(REF)], check=True)

SENT = [
    ("narasi", "Tahun sembilan belas tiga puluh dua, Australia menyatakan perang... melawan burung."),
    ("narasi", "Dua puluh ribu emu menyerbu ladang gandum."),
    ("tegas", "Pemerintah tidak tinggal diam. Kirim senapan mesin!"),
    ("tegang", "Tapi baru sebentar menembak, senapannya macet."),
    ("santai", "Dan emunya? Kabur dengan santai."),
]
STYLE = {"narasi": "(lively storyteller, warm, flowing)", "santai": "(casual, amused, relaxed)",
         "tegang": "(tense, dramatic)", "tegas": "(commanding, firm, loud)"}
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
SR = model.tts_model.sample_rate

def save(name, y):
    p = WORK / f"{name}.wav"
    with wave.open(str(p), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    out = WORK / f"{name}_ln.wav"  # normalisasi loudness seluruh trek (bukan per frasa)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(p), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), str(out)], check=True)
    print("Saved:", out, f"{len(y)/SR:.1f}s", flush=True)

full = " ".join(t for _, t in SENT)
t0 = time.time()
a = model.generate(text="(lively storyteller, expressive, humorous)" + full, reference_wav_path=str(REF))
save("smooth_A_satu_tarikan", np.asarray(a, np.float32)); print(f"A {time.time()-t0:.0f}s", flush=True)

t0 = time.time()
b = model.generate(text=full, prompt_wav_path=str(REF), prompt_text=REF_TEXT, reference_wav_path=str(REF))
save("smooth_B_lanjutan", np.asarray(b, np.float32)); print(f"B {time.time()-t0:.0f}s", flush=True)

# C: per kalimat utuh + tag emosi, jeda alami 0.30s, crossfade 30ms
t0 = time.time(); parts = []
for emo, t in SENT:
    y = np.asarray(model.generate(text=STYLE[emo] + t, reference_wav_path=str(REF)), np.float32)
    idx = np.where(np.abs(y) > 0.01)[0]; y = y[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.06 * SR)]
    parts.append(y)
fade = int(0.03 * SR); out = np.zeros(0, np.float32)
for y in parts:
    y = y.copy(); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    out = np.concatenate([out, y, np.zeros(int(0.30 * SR), np.float32)])
save("smooth_C_per_kalimat", out); print(f"C {time.time()-t0:.0f}s", flush=True)
