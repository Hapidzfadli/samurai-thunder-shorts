"""Generate 16-frame 4x4 contact sheet (still-check OR directly from final MP4)."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
TIMING = ROOT / "src" / "woyla_timing.json"


def _ffmpeg_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "ffmpeg",
        Path.home() / ".local" / "bin" / "ffmpeg",
        ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg",
    ):
        if cand.exists():
            return str(cand)
    return "ffmpeg"


def pick_16_frames() -> list[tuple[int, str]]:
    t = json.loads(TIMING.read_text(encoding="utf-8"))
    order = t["order"]
    scenes = t["scenes"]
    out = []
    for sc in order:
        st = scenes[sc]["startFrame"]
        dur = scenes[sc]["durationInFrames"]
        if sc == "ababa":
            f1 = st + int(dur * 0.30)
            f2 = st + int(dur * 0.78)
            out.append((f1, f"{sc} · Sintong VHF"))
            out.append((f2, f"{sc} · Pin Pull"))
        elif sc == "klimaks":
            f1 = st + 14
            f2 = st + int(dur * 0.62)
            out.append((f1, f"{sc} · Breach+Flash"))
            out.append((f2, f"{sc} · Bullet-Time 360"))
        else:
            out.append((st + int(dur * 0.25), f"{sc} · A"))
            out.append((st + int(dur * 0.72), f"{sc} · B"))
    return out[:16]


def stitch_grid(img_paths: list[tuple[Path, int, str]], out_png: Path, title: str):
    tw, th = 270, 480
    pad = 14
    hdr = 56
    cols, rows = 4, 4
    W = pad + cols * (tw + pad)
    H = hdr + pad + rows * (th + pad)
    canvas = Image.new("RGB", (W, H), (8, 12, 22))
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, 16), title, fill=(248, 250, 252))

    for idx, (p, frame_no, label) in enumerate(img_paths):
        r, c = divmod(idx, cols)
        x = pad + c * (tw + pad)
        y = hdr + pad + r * (th + pad)
        im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y, x + tw, y + 26], fill=(6, 12, 24))
        draw.text((x + 6, y + 6), f"#{idx+1:02d} f={frame_no} {label}", fill=(250, 204, 21))

    out_png.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_png)
    print(f"Saved contact sheet: {out_png} ({W}x{H})", flush=True)


def from_bundle(bundle_dir: Path, out_png: Path):
    tmp = ROOT / "out" / "woyla_stillcheck_frames"
    tmp.mkdir(parents=True, exist_ok=True)
    picks = pick_16_frames()
    items = []
    for idx, (fno, lbl) in enumerate(picks):
        p = tmp / f"f_{idx:02d}_{fno}.png"
        subprocess.run(
            [
                "npx", "remotion", "still", str(bundle_dir), "Woyla", str(p),
                f"--frame={fno}", "--scale=0.5", "--gl=swangle",
                "--browser-executable=/usr/bin/google-chrome",
            ],
            cwd=str(ROOT),
            check=True,
        )
        items.append((p, fno, lbl))
    stitch_grid(items, out_png, "OPERASI WOYLA 1981 · 16-FRAME STILL-CHECK AUDIT")


def from_mp4(mp4_path: Path, out_png: Path):
    tmp = ROOT / "out" / "woyla_final_frames"
    tmp.mkdir(parents=True, exist_ok=True)
    picks = pick_16_frames()
    ff = _ffmpeg_bin()
    items = []
    for idx, (fno, lbl) in enumerate(picks):
        sec = fno / 30.0
        p = tmp / f"mp4_{idx:02d}_{fno}.png"
        subprocess.run(
            [ff, "-y", "-v", "error", "-ss", f"{sec:.3f}", "-i", str(mp4_path), "-frames:v", "1", str(p)],
            check=True,
        )
        items.append((p, fno, lbl))
    stitch_grid(items, out_png, "OPERASI WOYLA 1981 · FINAL MP4 16-FRAME AUDIT")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", type=Path, default=None)
    ap.add_argument("--mp4", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    if args.bundle:
        from_bundle(args.bundle, args.out)
    elif args.mp4:
        from_mp4(args.mp4, args.out)
    else:
        raise SystemExit("Pass --bundle or --mp4")


if __name__ == "__main__":
    main()
