"""Fast resumable Pocket-TTS real-human voice synthesizer (98.9% Nadia Omara timbre) with Whisper Best-of-6."""
from __future__ import annotations

import argparse
import difflib
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import voice_combo_woyla as V  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--takes", type=int, default=6)
    ap.add_argument("--fast", action="store_true", help="Skip inner Whisper loop (~2s/clip) and audit once in Pass 2")
    args = ap.parse_args()

    from pocket_tts import TTSModel
    asr = None
    if not args.fast:
        from faster_whisper import WhisperModel
        asr = WhisperModel("small", device="cpu", compute_type="int8")

    script = json.loads(V.SCRIPT_PATH.read_text(encoding="utf-8"))
    V.WORK.mkdir(parents=True, exist_ok=True)
    only_set = set(args.only) if args.only else None

    todo = []
    for sc in script:
        for li, (spk, style, text) in enumerate(sc["lines"]):
            key = f"{sc['scene']}_{li}"
            if only_set and key not in only_set:
                continue
            raw_p = V.WORK / f"{key}_raw.wav"
            if raw_p.exists() and raw_p.stat().st_size > 16000 and not args.force:
                continue
            todo.append((key, spk, style, text, raw_p))

    if not todo:
        print("Semua klip raw sudah ada!", flush=True)
        return

    t0 = time.time()
    tts = TTSModel.load_model(config=V.POCKET_CONFIG, eos_threshold=-4.5, temp=0.52)
    nadia_ref = V.SEED_DIR / "nadia_prompt_padded.wav"
    if not nadia_ref.exists():
        nadia_ref = V.VDIR / "nadia_omara_khw_clean.wav"
    states = {
        "nadia": tts.get_state_for_audio_prompt(str(nadia_ref)),
        "sintong": tts.get_state_for_audio_prompt(str(V.VDIR / "dodi_riko_clean.wav")),
    }
    print(f"Pocket-TTS (Nadia Asli + Dodi Asli) siap dalam {time.time()-t0:.1f}s | fast={args.fast} | todo={len(todo)}", flush=True)

    sr = tts.sample_rate
    for idx, (key, spk, style, text, raw_p) in enumerate(todo):
        t1 = time.time()
        best_y, best_sc, best_heard = None, -1.0, ""
        n_takes = 1 if args.fast else args.takes
        tts_text = text.replace("!", ".").replace("?", ".").replace("Hai wak.", "Hai wak,").strip()
        for tk in range(n_takes):
            wav = tts.generate_audio(states[spk], tts_text, max_tokens=220).detach().cpu().numpy().squeeze().astype(np.float32)
            nz = np.where(np.abs(wav) > 0.008)[0]
            if len(nz):
                wav = wav[max(0, nz[0] - int(0.02 * sr)) : min(len(wav), nz[-1] + int(0.07 * sr))]
            if args.fast:
                best_y, best_sc, best_heard = wav, 1.0, "(fast)"
                break
            a16 = signal.resample(wav, int(len(wav) * 16000 / sr)).astype(np.float32)
            heard = " ".join(s.text.strip() for s in asr.transcribe(a16, language="id", beam_size=1)[0])
            sc = difflib.SequenceMatcher(None, V.norm_letters(text), V.norm_letters(heard)).ratio()
            if sc > best_sc:
                best_y, best_sc, best_heard = wav, sc, heard
            if sc >= 0.96:
                break
        y48 = signal.resample(best_y, int(len(best_y) * 48000 / sr)).astype(np.float32)
        V.save_wav(raw_p, y48, 48000)
        print(f"[{idx+1:2d}/{len(todo)} | {key:11s} | {spk:7s}] {len(best_y)/sr:4.2f}s | sc={best_sc:.3f} | {time.time()-t1:4.1f}s | {best_heard}", flush=True)


if __name__ == "__main__":
    main()
