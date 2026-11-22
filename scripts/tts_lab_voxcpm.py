"""Uji VoxCPM2 (OpenBMB, Apache-2.0, 30 bahasa termasuk Indonesia): klon suara + tag gaya
dalam kurung, mis. "(tense, dramatic)". Jalankan dengan .venv/bin/python."""
import json, sys, time, wave
from pathlib import Path
import numpy as np, torch
from voxcpm import VoxCPM

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "out" / "tts_lab"  # ref_*.wav dibuat oleh tts_lab_omnivoice.py
torch.set_num_threads(4)
STYLE = {
    "narasi": "(storyteller, clear, lively)",
    "santai": "(casual, deadpan, amused)",
    "tegang": "(tense, dramatic, suspenseful)",
    "tegas": "(commanding, loud, firm)",
}
REF = {"narasi": "narasi", "santai": "santai", "tegang": "tegang", "tegas": "tegang"}
t0 = time.time()
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
print(f"model dimuat {time.time()-t0:.0f}s", flush=True)
SR = model.tts_model.sample_rate
script = json.loads(Path(sys.argv[1]).read_text()); tag = Path(sys.argv[1]).stem
chunks = [np.zeros(int(0.25 * SR), np.float32)]
for sc in script:
    for emo, text in sc["phrases"]:
        t1 = time.time()
        wav = model.generate(text=STYLE[emo] + text, reference_wav_path=str(WORK / f"ref_{REF[emo]}.wav"), cfg_value=2.0, inference_timesteps=10)
        wav = np.asarray(wav, np.float32).reshape(-1); wav = wav / (np.abs(wav).max() + 1e-6) * 0.88
        print(f"[{emo}] {text}  ({len(wav)/SR:.1f}s audio, {time.time()-t1:.0f}s)", flush=True)
        chunks += [wav, np.zeros(int(0.22 * SR), np.float32)]
mix = np.concatenate(chunks); out = WORK / f"{tag}_voxcpm2.wav"
with wave.open(str(out), "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((mix * 32767).astype(np.int16).tobytes())
print("Saved:", out, f"{len(mix)/SR:.1f}s")
