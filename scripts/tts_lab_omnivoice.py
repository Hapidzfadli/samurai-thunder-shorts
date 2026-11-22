"""Uji OmniVoice (k2-fsa, Apache-2.0, 600+ bahasa) untuk narasi Indonesia ekspresif.
Gaya/emosi diambil dari potongan referensi (dodi) per emosi. Jalankan dengan .venv/bin/python."""
import json, subprocess, sys, time, wave
from pathlib import Path
import numpy as np, torch
from omnivoice.models.omnivoice import OmniVoice

ROOT = Path(__file__).resolve().parent.parent
DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
WORK = ROOT / "out" / "tts_lab"; WORK.mkdir(parents=True, exist_ok=True)
REFS = {"santai": (1.0, 10.0), "narasi": (18.0, 12.0), "tegang": (36.5, 11.0)}
torch.set_num_threads(4)

def cut(name, ss, dur):
    out = WORK / f"ref_{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(ss), "-t", str(dur), "-i", str(DODI), "-ar", "24000", "-ac", "1", str(out)], check=True)
    return out

from faster_whisper import WhisperModel
asr = WhisperModel("small", device="cpu", compute_type="int8")
def transcribe(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    segs, _ = asr.transcribe(np.frombuffer(raw, np.float32), language="id", beam_size=5)
    return " ".join(s.text.strip() for s in segs)

t0 = time.time()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", torch_dtype=torch.float32).to("cpu").eval()
print(f"model dimuat {time.time()-t0:.0f}s", flush=True)
prompts = {}
for k, (ss, dur) in REFS.items():
    p = cut(k, ss, dur); txt = transcribe(p); print(f"ref {k}: {txt}", flush=True)
    prompts[k] = model.create_voice_clone_prompt(str(p), ref_text=txt)
prompts["tegas"] = prompts["tegang"]

script = json.loads(Path(sys.argv[1]).read_text())
tag = Path(sys.argv[1]).stem
SR = 24000; chunks = [np.zeros(int(0.25 * SR), np.float32)]
for sc in script:
    for emo, text in sc["phrases"]:
        t1 = time.time()
        wav = model.generate(text=text, language="id", voice_clone_prompt=prompts[emo])[0]
        wav = np.asarray(wav, np.float32).reshape(-1)
        wav = wav / (np.abs(wav).max() + 1e-6) * 0.88
        print(f"[{emo}] {text}  ({len(wav)/SR:.1f}s audio, {time.time()-t1:.0f}s)", flush=True)
        chunks += [wav, np.zeros(int(0.22 * SR), np.float32)]
mix = np.concatenate(chunks)
wav_path = WORK / f"{tag}_omnivoice.wav"
with wave.open(str(wav_path), "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((mix * 32767).astype(np.int16).tobytes())
print("Saved:", wav_path, f"{len(mix)/SR:.1f}s", "heard:", transcribe(wav_path))
