"""Encode atomic rendered frame sequence + stereo master audio into final 1080x1920 30fps MP4."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMING = ROOT / "src" / "woyla_timing.json"
FRAMES = ROOT / "out" / "woyla_seq"
AUDIO = ROOT / "public" / "audio" / "woyla_master.mp3"
OUT_MP4 = ROOT / "exports" / "operasi-woyla-1981.mp4"


def _ffmpeg_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "ffmpeg",
        Path.home() / ".local" / "bin" / "ffmpeg",
        ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg",
    ):
        if cand.exists():
            return str(cand)
    return "ffmpeg"


def main():
    total = json.loads(TIMING.read_text(encoding="utf-8"))["totalFrames"]
    step = 2
    expected = list(range(0, total, step))
    files = {}
    for p in FRAMES.glob("f_*.jpeg"):
        if p.stat().st_size > 4000:
            idx = int(p.stem.replace("f_", ""))
            files[idx] = p.resolve()

    missing = [f for f in expected if f not in files]
    if missing:
        raise SystemExit(f"Missing {len(missing)}/{len(expected)} frames! First missing: {missing[:10]}")

    lst = FRAMES / "frames_concat.txt"
    dur_each = step / 30.0
    lines = []
    for f in expected:
        lines.append(f"file '{files[f]}'")
        lines.append(f"duration {dur_each:.7f}")
    lines.append(f"file '{files[expected[-1]]}'")
    lst.write_text("\n".join(lines) + "\n", encoding="utf-8")

    ff = _ffmpeg_bin()
    OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            ff, "-y", "-v", "error",
            "-f", "concat", "-safe", "0", "-i", str(lst),
            "-i", str(AUDIO),
            "-map", "0:v:0", "-map", "1:a:0",
            "-vf", "scale=1080:1920:flags=lanczos,fps=30",
            "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            "-shortest",
            str(OUT_MP4),
        ],
        check=True,
    )
    mb = OUT_MP4.stat().st_size / (1024 * 1024)
    print(f"FINAL MASTER MP4 READY: {OUT_MP4} ({mb:.2f} MiB, {len(expected)} unique frames -> 30fps 1080x1920)", flush=True)


if __name__ == "__main__":
    main()
