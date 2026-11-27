"""Fast CPU-native Indonesian voice cloning using pocket-tts-indonesian (anak10thn)
+ Faster-Whisper word alignment & take selection.
Clones the user's exact favorite voices from voices/pengisi_suara.json:
  - dodi (voices/id_prompts/dodi_riko_clean.wav + expressive Dodi emotion refs)
  - ara  (voices/id_prompts/irene_ara_clean.wav)
Outputs the exact same WAV clips & src/<nama>_voice.json schema as scripts/voice_vox.py.

Usage:
    .venv/bin/python scripts/voice_pocket.py scripts/naskah/dantzig.json dantzig
"""
import difflib
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel
from huggingface_hub import hf_hub_download
from pocket_tts import TTSModel
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)
CAST = json.loads((ROOT / "voices" / "pengisi_suara.json").read_text())
DODI_MP3 = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
DEFAULT_VOICE = CAST["default"]
_NUM = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|nol)\b"


def letters(x: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(_NUM, " ", x.lower()))


def save_wav(path: Path, y: np.ndarray, sr: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((np.clip(y, -1.0, 1.0) * 32767).astype(np.int16).tobytes())


def extract_ref(src: Path, out: Path, ss: float, dur: float) -> Path:
    if not out.exists():
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", str(ss), "-t", str(dur), "-i", str(src), "-ar", "24000", "-ac", "1", str(out)],
            check=True,
        )
    return out


def main():
    script_path = Path(sys.argv[1])
    name = sys.argv[2]
    script = json.loads(script_path.read_text())

    cfg = hf_hub_download(
        "anak10thn/pocket-tts-indonesian",
        "indonesian_6l.yaml",
        revision="17257664e384561c957b02ac92edd1a24807f0e5",
    )
    t0 = time.time()
    tts = TTSModel.load_model(cfg.removesuffix(".yaml"))
    sr = tts.sample_rate
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    print(f"[pocket-tts] Loaded TTS (sr={sr}) + Whisper in {time.time() - t0:.1f}s", flush=True)

    # Prepare expressive voice states:
    # - dodi clean + expressive dodi emotion cuts (tegang/narasi/santai) from analysis/mp3
    # - ara clean (irene_ara_clean.wav)
    dodi_refs = {
        "narasi": ROOT / CAST["voices"]["dodi"]["file"],
        "santai": extract_ref(DODI_MP3, WORK / "p_dodi_santai.wav", 0.5, 9.5),
        "tegang": extract_ref(DODI_MP3, WORK / "p_dodi_tegang.wav", 38.0, 10.0),
        "tegas": extract_ref(DODI_MP3, WORK / "p_dodi_tegas.wav", 38.0, 10.0),
        "bisik": ROOT / CAST["voices"]["dodi"]["file"],
    }
    states = {}
    for st_k, rp in dodi_refs.items():
        states[("dodi", st_k)] = tts.get_state_for_audio_prompt(str(rp))
    extra_states = {}

    def get_voice_state(voice: str, style: str):
        if voice == "dodi":
            return states.get(("dodi", style), states[("dodi", "narasi")])
        if voice not in extra_states:
            vf = ROOT / CAST["voices"][voice]["file"]
            extra_states[voice] = tts.get_state_for_audio_prompt(str(vf))
        return extra_states[voice]

    def hear(y: np.ndarray):
        a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
        segs, _ = asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
        words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
        return " ".join(w[0] for w in words), words

    clip_dir = WORK / name
    clip_dir.mkdir(parents=True, exist_ok=True)
    fade = int(0.022 * sr)
    chunks = [np.zeros(int(0.25 * sr), np.float32)]
    cur = 0.25
    scenes = []

    for sc in script:
        sc_from = cur
        lines = []
        for li, ln in enumerate(sc["lines"]):
            style, text = ln[0], ln[1]
            voice = ln[2] if len(ln) > 2 else sc.get("voice", DEFAULT_VOICE)
            st = get_voice_state(voice, style)
            # pocket-tts-indonesian reads '!' as 'Indah/Inder', so normalize punctuation for TTS only!
            tts_text = text.replace("?!", "?").replace("!", ".").replace("...", ",")
            clip_path = clip_dir / f"{sc['scene']}_{li}.wav"
            t1 = time.time()
            print(f"[{sc['scene']} | {style} | {voice}] {text}", flush=True)

            if clip_path.exists():
                with wave.open(str(clip_path)) as wf:
                    y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767.0
                heard, words = hear(y)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"    (cache) {score:.2f} <- {heard}", flush=True)
            else:
                best = None
                n_takes = 3
                for ti in range(n_takes):
                    raw = tts.generate_audio(st, tts_text)
                    y = np.asarray(raw, np.float32).reshape(-1)
                    idx = np.where(np.abs(y) > 0.010)[0]
                    if len(idx) > 0:
                        y = y[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.07 * sr)]
                    y = y / (np.abs(y).max() + 1e-6) * 0.90
                    heard, words = hear(y)
                    score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                    print(f"    take {ti + 1}/{n_takes}: {score:.2f} <- {heard}", flush=True)
                    if best is None or score > best[0]:
                        best = (score, y, words)
                    if score >= 0.94:
                        break
                score, y, words = best
                y = y.copy()
                if len(y) > 2 * fade:
                    y[:fade] *= np.linspace(0, 1, fade)
                    y[-fade:] *= np.linspace(1, 0, fade)
                save_wav(clip_path, y, sr)

            dur = len(y) / sr
            lines.append({
                "style": style,
                "voice": voice,
                "text": text,
                "score": round(score, 3),
                "file": str(clip_path.relative_to(ROOT)),
                "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words],
                "from": int(round(cur * FPS)),
                "to": int(round((cur + dur) * FPS)),
                "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words],
            })
            last = li == len(sc["lines"]) - 1
            gap = 0.45 if last else (0.14 if text.rstrip().endswith((",", "...")) else 0.26)
            chunks += [y, np.zeros(int(gap * sr), np.float32)]
            cur += dur + gap
            print(f"    -> {dur:.2f}s ({time.time() - t1:.1f}s)", flush=True)
        scenes.append({"scene": sc["scene"], "from": int(round(sc_from * FPS)), "to": int(round(cur * FPS)), "lines": lines})

    mix = np.concatenate(chunks)
    raw_path = WORK / f"{name}_raw.wav"
    save_wav(raw_path, mix, sr)
    out = ROOT / "public" / "audio" / f"{name}_voice.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw_path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", str(out)], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-b:a", "192k", str(out.with_suffix(".mp3"))], check=True)
    timing = {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 8, "scenes": scenes}
    (ROOT / "src" / f"{name}_voice.json").write_text(json.dumps(timing, indent=1, ensure_ascii=False))
    print(f"Saved: {out} ({cur:.1f}s) & src/{name}_voice.json", flush=True)


if __name__ == "__main__":
    main()
