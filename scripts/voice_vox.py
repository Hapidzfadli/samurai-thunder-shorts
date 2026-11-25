"""Mesin suara standar: VoxCPM2 (OpenBMB, Apache-2.0) dengan gaya bertutur dodi.
Dipilih user: exports/riset/suara/voxcpm2-pembuka-perang-emu.mp3 (mode referensi + tag gaya per kalimat,
contoh suara dodi per emosi). Mode lanjutan (prompt_text) TIDAK dipakai: tag gaya ikut terbaca.

Aturan (lihat CLAUDE.md bagian Suara):
- Satuan = kalimat UTUH (boleh beda emosi per kalimat), jangan dipecah jadi frasa pendek.
- Tiap kalimat dibuat beberapa kali; whisper memilih take yang paling cocok (tag bocor / kata hilang ditolak).
- Loudness dinormalisasi untuk seluruh trek. Timing kata (whisper) disimpan untuk sinkron aksi/caption.

Pakai (dengan .venv/bin/python):
    python3 scripts/voice_vox.py naskah.json <nama>
naskah.json: [{"scene": "hook", "lines": [["narasi", "Kalimat utuh."], ["tegang", "Kalimat utuh!", "nadia"]]}, ...]
emosi: narasi | santai | tegang | tegas | bisik
suara (opsional, kolom ke-3 tiap baris atau "voice" per adegan): kunci di voices/pengisi_suara.json
    (dodi | nadia | nadia_ceria | butini | ara). Tanpa itu dipakai "default" (dodi bersih).
    "dodi_lama" = potongan emosi dodi lama dari analysis/mp3 (perilaku sebelum 25 Nov 2026).
Hasil: public/audio/<nama>_voice.wav (+ .mp3) dan src/<nama>_voice.json.
"""
import difflib, json, re, subprocess, sys, time, wave
from pathlib import Path
import numpy as np, torch

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
WORK = ROOT / "out" / "voice"; WORK.mkdir(parents=True, exist_ok=True)
# Contoh suara dodi per emosi, dipotong di batas kalimat utuh (detik mulai, detik akhir)
REFS = {"santai": (0.00, 10.40), "narasi": (18.00, 28.30), "tegang": (38.60, 48.85)}
REF_OF = {"narasi": "narasi", "santai": "santai", "tegang": "tegang", "tegas": "tegang", "bisik": "santai"}
# Pengisi suara standar pilihan user (suara bersih); lihat voices/pengisi_suara.json
CAST = json.loads((ROOT / "voices" / "pengisi_suara.json").read_text())
DEFAULT_VOICE = CAST["default"]
STYLE = {
    "narasi": "lively storyteller, warm, flowing",
    "santai": "casual, amused, relaxed",
    "tegang": "tense, dramatic, suspenseful",
    "tegas": "commanding, firm, loud",
    "bisik": "whispering, sly, quiet",
}
_NUM = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|nol)\b"


def letters(x: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(_NUM, " ", x.lower()))


class Voice:
    def __init__(self, use_style_tags: bool = True):
        from voxcpm import VoxCPM
        from faster_whisper import WhisperModel
        torch.set_num_threads(4)
        self.refs = {}
        for k, (a, b) in REFS.items():
            self.refs[k] = WORK / f"ref_{k}.wav"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(a), "-t", str(b - a), "-i", str(DODI), "-af",
                            f"afade=t=in:d=0.05,afade=t=out:st={b - a - 0.12}:d=0.12", "-ar", "24000", "-ac", "1", str(self.refs[k])], check=True)
        self.cast = {}
        for k, v in CAST["voices"].items():  # suara bersih: satu referensi utuh per tokoh, gaya lewat tag
            self.cast[k] = WORK / f"cast_{k}.wav"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(ROOT / v["file"]), "-ar", "24000", "-ac", "1", str(self.cast[k])], check=True)
        self.tts = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
        self.sr = self.tts.tts_model.sample_rate
        self.asr = WhisperModel("small", device="cpu", compute_type="int8")
        self.use_style_tags = use_style_tags

    def hear(self, y: np.ndarray, sr: int):
        from scipy import signal
        a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
        segs, _ = self.asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
        words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
        return " ".join(w[0] for w in words), words

    def line(self, text: str, style: str = "narasi", n: int = 3, steps: int = 10, voice: str = DEFAULT_VOICE):
        tag = STYLE.get(style, style)
        full = (f"({tag})" if (tag and self.use_style_tags) else "") + text
        if voice == "dodi_lama":
            ref = self.refs[REF_OF.get(style, "narasi")]
        elif voice in self.cast:
            ref = self.cast[voice]
        else:
            raise SystemExit(f"Suara '{voice}' tidak ada di voices/pengisi_suara.json (pilihan: {', '.join(self.cast)}, dodi_lama)")
        best = None
        for i in range(n):
            y = np.asarray(self.tts.generate(text=full, reference_wav_path=str(ref), inference_timesteps=steps, cfg_value=2.0), np.float32)
            idx = np.where(np.abs(y) > 0.008)[0]
            y = y[max(0, idx[0] - int(0.04 * self.sr)): idx[-1] + int(0.08 * self.sr)]
            heard, words = self.hear(y, self.sr)
            score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
            print(f"    take {i + 1}/{n}: {score:.2f} <- {heard}", flush=True)
            if best is None or score > best[0]:
                best = (score, y, words)
            if score > 0.97:
                break
        return best


def build(script_path: Path, name: str):
    script = json.loads(Path(script_path).read_text())
    v = Voice(); sr = v.sr; fade = int(0.025 * sr)
    chunks = [np.zeros(int(0.25 * sr), np.float32)]; cur = 0.25; scenes = []
    for sc in script:
        sc_from = cur; lines = []
        for li, ln in enumerate(sc["lines"]):
            style, text = ln[0], ln[1]
            voice = ln[2] if len(ln) > 2 else sc.get("voice", DEFAULT_VOICE)
            t0 = time.time(); print(f"[{sc['scene']} | {style} | {voice}] {text}", flush=True)
            cached = WORK / name / f"{sc['scene']}_{li}.wav"
            if cached.exists():  # lanjutkan proses yang terhenti: pakai potongan yang sudah jadi
                with wave.open(str(cached)) as wf:
                    y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767
                heard, words = v.hear(y, sr)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"    (cache) {score:.2f} <- {heard}", flush=True)
            else:
                score, y, words = v.line(text, style, n=sc.get("takes", 3), voice=voice)
            y = y.copy(); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
            # simpan juga potongan per kalimat (untuk ditata ulang oleh skrip mix per video)
            clip_dir = WORK / name; clip_dir.mkdir(parents=True, exist_ok=True)
            clip_path = clip_dir / f"{sc['scene']}_{li}.wav"
            with wave.open(str(clip_path), "wb") as wf:
                wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
            lines.append({"style": style, "voice": voice, "text": text, "score": round(score, 3), "file": str(clip_path.relative_to(ROOT)),
                          "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words], "from": int(round(cur * FPS)),
                          "to": int(round((cur + len(y) / sr) * FPS)),
                          "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words]})
            # jeda alami: koma/elipsis pendek, akhir kalimat sedang, akhir adegan lebih panjang
            last = li == len(sc["lines"]) - 1
            gap = 0.45 if last else (0.14 if text.rstrip().endswith((",", "...")) else 0.26)
            chunks += [y, np.zeros(int(gap * sr), np.float32)]; cur += len(y) / sr + gap
            print(f"    -> {len(y)/sr:.1f}s ({time.time()-t0:.0f}s)", flush=True)
        scenes.append({"scene": sc["scene"], "from": int(round(sc_from * FPS)), "to": int(round(cur * FPS)), "lines": lines})
    mix = np.concatenate(chunks)
    raw = WORK / f"{name}_raw.wav"
    with wave.open(str(raw), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    out = ROOT / "public" / "audio" / f"{name}_voice.wav"; out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", str(out)], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-b:a", "192k", str(out.with_suffix(".mp3"))], check=True)
    timing = {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 8, "scenes": scenes}
    (ROOT / "src" / f"{name}_voice.json").write_text(json.dumps(timing, indent=1, ensure_ascii=False))
    print(f"Saved: {out} ({cur:.1f}s) & src/{name}_voice.json")


if __name__ == "__main__":
    build(Path(sys.argv[1]), sys.argv[2])
