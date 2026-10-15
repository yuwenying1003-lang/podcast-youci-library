#!/usr/bin/env python3
"""Validate and package both extensions from one shared content script."""

import json
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "extensions" / "shared" / "content.js"
DIST = ROOT / "dist"

for variant in ("desktop", "yandex-android"):
    manifest_path = ROOT / "extensions" / variant / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["manifest_version"] == 3
    assert manifest["version"] == "3.0.0"
    assert manifest["content_scripts"][0]["js"] == ["content.js"]
    with tempfile.TemporaryDirectory() as temporary:
        stage = Path(temporary) / f"podcast-youci-v3-{variant}"
        stage.mkdir()
        shutil.copy2(manifest_path, stage / "manifest.json")
        shutil.copy2(SHARED, stage / "content.js")
        (stage / "README.txt").write_text(
            "Podcast Youci v3.0\n\nLoad this directory as an unpacked extension. "
            "Disable v2.3 first. The learning UI is served securely from GitHub Pages.\n",
            encoding="utf-8",
        )
        DIST.mkdir(exist_ok=True)
        target = DIST / f"podcast-youci-v3.0.0-{variant}.zip"
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in sorted(stage.iterdir()):
                archive.write(item, f"{stage.name}/{item.name}")
        print(target.relative_to(ROOT))
