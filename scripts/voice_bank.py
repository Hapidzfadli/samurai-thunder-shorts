"""Reusable helper to load Indonesian Character Voice Bank presets for VoxCPM2 episodes.

Usage in any episode voice script:
    from voice_bank import load_catalog, get_preset, apply_preset_polish

    preset = get_preset("01_nadia_storyteller")
    ref_wav = preset["wavRefPath"]
    style_tag = preset["style"]
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "voices" / "bank_karakter" / "catalog.json"

# Friendly short aliases for episode scripts
ALIASES = {
    "nadia": "01_nadia_storyteller",
    "storyteller_cewek": "01_nadia_storyteller",
    "ara": "02_cewek_polos_lucu",
    "cewek_polos": "02_cewek_polos_lucu",
    "cici": "03_cewek_heboh_kartun",
    "cewek_heboh": "03_cewek_heboh_kartun",
    "bu_tini": "04_bu_tini_ibu_kos",
    "ibu_kos": "04_bu_tini_ibu_kos",
    "mbak_nisa": "05_mbak_nisa_santai",
    "nisa": "05_mbak_nisa_santai",
    "riko": "06_riko_panikan",
    "bagas": "07_bagas_santai",
    "dodi": "08_narator_komedi",
    "narator": "08_narator_komedi",
    "qinmu": "09_narator_qinmu_epik",
    "narator_epik": "09_narator_qinmu_epik",
    "bang_udin": "10_bapak_bang_udin",
    "pak_rt": "10_bapak_bang_udin",
    "bapak": "10_bapak_bang_udin",
    "sombong": "11_rival_sombong",
    "rival": "11_rival_sombong",
    "pocong": "12_hantu_pocong_lucu",
    "hantu": "12_hantu_pocong_lucu",
}


def load_catalog() -> dict[str, dict]:
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for entry in data.get("voices", []):
        item = dict(entry)
        if item.get("wavRef"):
            item["wavRefPath"] = ROOT / item["wavRef"]
        if item.get("mp3"):
            item["mp3Path"] = ROOT / item["mp3"]
        out[item["id"]] = item
    return out


def get_preset(name_or_id: str) -> dict:
    catalog = load_catalog()
    key = ALIASES.get(name_or_id.lower().strip(), name_or_id.strip())
    if key not in catalog:
        avail = ", ".join(sorted(catalog.keys()))
        raise KeyError(f"Voice preset '{name_or_id}' tidak ditemukan. Tersedia: {avail}")
    return catalog[key]


def apply_preset_polish(in_wav: Path, out_wav: Path, preset: dict, sr_out: int = 48000) -> None:
    filters = list(preset.get("filters") or ["highpass=f=75"])
    af = ",".join(filters + ["loudnorm=I=-15:TP=-1.5:LRA=9"])
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(in_wav), "-af", af, "-ar", str(sr_out), "-ac", "1", str(out_wav)],
        check=True,
    )
