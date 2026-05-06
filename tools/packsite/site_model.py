from __future__ import annotations

import re


def slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value).replace(":", "__").replace("/", "_"))


def namespace(value: str) -> str:
    text = str(value)
    return text.split(":", 1)[0] if ":" in text else "minecraft"


def display_name(registries: dict, kind: str, item_id: str) -> str:
    bucket = registries.get(kind) or {}
    entry = bucket.get(item_id) or {}
    return entry.get("display_name") or item_id
