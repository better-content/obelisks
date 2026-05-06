from __future__ import annotations

import base64
import json
from pathlib import Path

MISSING_ICON_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVR42mP8z8Dwn4ECwESJ5lEDRg0YNWDUgFEDBg0AAGjCAhHfG4p6AAAAAElFTkSuQmCC"
)


def resolve_icons(item_ids, out_dir: str):
    root = Path(out_dir)
    icons_dir = root / "assets" / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    missing = icons_dir / "missing.png"
    if not missing.exists():
        missing.write_bytes(MISSING_ICON_PNG)
    manifest = {}
    for item_id in sorted(item_ids):
        manifest[item_id] = "assets/icons/missing.png"
    (root / "assets" / "icon-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
