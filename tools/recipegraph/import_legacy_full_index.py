#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SCHEMA = "obelisks.recipe_graph.v1"
MC_VERSION = "1.20.1"
DEFAULT_SOURCE = (
    "/home/gerald/.local/share/PrismLauncher/instances/"
    "Better Content-Playtest 4 - v1/minecraft/kubejs/config"
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert legacy full_recipe_index_*.json dumps into generated/runtime-dumps."
    )
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="Directory containing full_recipe_index_manifest.json")
    parser.add_argument("--out", default="generated/runtime-dumps", help="Output runtime-dumps directory")
    args = parser.parse_args()

    source = Path(args.source).expanduser()
    out = Path(args.out)
    recipes = [_normalize_legacy_record(record) for record in _read_legacy_records(source)]
    out.mkdir(parents=True, exist_ok=True)

    (out / "recipes.json").write_text(
        json.dumps(
            {
                "schema": SCHEMA,
                "minecraft": MC_VERSION,
                "loader": "forge",
                "generated_at": "legacy_full_recipe_index_import",
                "source": str(source),
                "recipes": recipes,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    (out / "registries.json").write_text(
        json.dumps(_registries_from_recipes(recipes), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (out / "tags.json").write_text(
        json.dumps(_tags_from_recipes(recipes), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (out / "mods.json").write_text(
        json.dumps(_mods_from_recipes(recipes), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Imported {len(recipes)} recipes from {source}")
    print(f"Wrote {out}/recipes.json")


def _read_legacy_records(source: Path) -> list[dict[str, Any]]:
    manifest_path = source / "full_recipe_index_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"missing legacy manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    chunk_count = int(manifest.get("chunkCount", 0))
    records: list[dict[str, Any]] = []
    for index in range(chunk_count):
        chunk_path = source / f"full_recipe_index_{index:04d}.json"
        if not chunk_path.exists():
            raise SystemExit(f"missing legacy chunk: {chunk_path}")
        chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
        records.extend(chunk.get("recipes", []))
    return records


def _normalize_legacy_record(record: dict[str, Any]) -> dict[str, Any]:
    rid = str(record.get("id") or "UNKNOWN")
    rtype = str(record.get("type") or "UNKNOWN")
    raw_text = str(record.get("json") or "{}")
    parsed = True
    try:
        raw = json.loads(raw_text)
    except json.JSONDecodeError:
        raw = {"text": raw_text}
        parsed = False
    if "...<truncated " in raw_text:
        parsed = False

    inputs = _parse_inputs(raw) if isinstance(raw, dict) else []
    outputs = _parse_outputs(raw) if isinstance(raw, dict) else []
    fluids_in = _parse_fluids(raw, input_side=True) if isinstance(raw, dict) else []
    fluids_out = _parse_fluids(raw, input_side=False) if isinstance(raw, dict) else []

    return {
        "id": rid,
        "type": rtype,
        "category": rtype,
        "source": {
            "kind": "legacy_full_recipe_index",
            "declared_by": "kubejs_or_datapack_unknown",
            "file": None,
        },
        "inputs": inputs,
        "outputs": outputs,
        "catalysts": _parse_catalysts(raw) if isinstance(raw, dict) else [],
        "fluids_in": fluids_in,
        "fluids_out": fluids_out,
        "requirements": _requirements(raw) if isinstance(raw, dict) else _requirements({}),
        "machines": [{"id": rtype, "label": _machine_label(rtype)}],
        "tags": [],
        "parsed": parsed,
        "raw": raw,
    }


def _parse_inputs(raw: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for key in ("ingredient", "ingredients", "input", "inputs"):
        _collect_ingredient(raw.get(key), out)
    key_map = raw.get("key")
    if isinstance(key_map, dict):
        for value in key_map.values():
            _collect_ingredient(value, out)
    return _dedupe_entries(out)


def _parse_catalysts(raw: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for key in ("tool", "tools", "catalyst", "catalysts", "cast"):
        _collect_ingredient(raw.get(key), out)
    return _dedupe_entries(out)


def _collect_ingredient(value: Any, out: list[dict[str, Any]]) -> None:
    if value is None:
        return
    if isinstance(value, list):
        for entry in value:
            _collect_ingredient(entry, out)
        return
    if not isinstance(value, dict):
        return
    if isinstance(value.get("ingredient"), (dict, list)):
        _collect_ingredient(value.get("ingredient"), out)
    if isinstance(value.get("item"), str):
        out.append({"kind": "item", "id": value["item"], "count": _count(value)})
    elif isinstance(value.get("tag"), str):
        out.append({"kind": "tag", "id": value["tag"], "count": _count(value)})
    elif isinstance(value.get("id"), str) and ":" in value["id"] and "amount" not in value:
        out.append({"kind": "item", "id": value["id"], "count": _count(value)})


def _parse_outputs(raw: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for key in ("result", "results", "output", "outputs"):
        _collect_output(raw.get(key), out)
    return _dedupe_entries(out)


def _collect_output(value: Any, out: list[dict[str, Any]]) -> None:
    if value is None:
        return
    if isinstance(value, str):
        if ":" in value:
            out.append({"kind": "item", "id": value, "count": 1, "chance": 1.0})
        return
    if isinstance(value, list):
        for entry in value:
            _collect_output(entry, out)
        return
    if not isinstance(value, dict):
        return
    if isinstance(value.get("item"), str):
        out.append({"kind": "item", "id": value["item"], "count": _count(value), "chance": _chance(value)})
    elif isinstance(value.get("id"), str) and ":" in value["id"] and "amount" not in value:
        out.append({"kind": "item", "id": value["id"], "count": _count(value), "chance": _chance(value)})


def _parse_fluids(raw: dict[str, Any], input_side: bool) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    keys = (
        ("fluidIngredient", "fluidIngredients", "fluid_input", "fluid_inputs", "fluidInput", "fluidInputs")
        if input_side
        else ("fluidResult", "fluidResults", "fluid_output", "fluid_outputs", "fluidOutput", "fluidOutputs")
    )
    for key in keys:
        _collect_fluid(raw.get(key), out)
    return _dedupe_entries(out)


def _collect_fluid(value: Any, out: list[dict[str, Any]]) -> None:
    if value is None:
        return
    if isinstance(value, list):
        for entry in value:
            _collect_fluid(entry, out)
        return
    if isinstance(value, str):
        if ":" in value:
            out.append({"kind": "fluid", "id": value, "amount": 1000})
        return
    if not isinstance(value, dict):
        return
    fluid = value.get("fluid") or value.get("id") or value.get("name")
    if isinstance(fluid, dict):
        fluid = fluid.get("name") or fluid.get("id") or fluid.get("fluid")
    if isinstance(fluid, str) and ":" in fluid:
        out.append({"kind": "fluid", "id": fluid, "amount": int(value.get("amount") or 1000)})


def _requirements(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "heat": raw.get("heatRequirement") or raw.get("heat") or raw.get("temperature"),
        "pressure": raw.get("pressure"),
        "energy": raw.get("energy") or raw.get("fe") or raw.get("rf"),
        "time": raw.get("processingTime") or raw.get("time") or raw.get("duration") or raw.get("cookingtime"),
    }


def _registries_from_recipes(recipes: list[dict[str, Any]]) -> dict[str, Any]:
    items: dict[str, dict[str, str]] = {}
    fluids: dict[str, dict[str, str]] = {}
    for recipe in recipes:
        for entry in recipe["inputs"] + recipe["outputs"] + recipe["catalysts"]:
            if entry.get("kind") == "item":
                _add_registry_entry(items, entry["id"])
        for entry in recipe["fluids_in"] + recipe["fluids_out"]:
            if entry.get("kind") == "fluid":
                _add_registry_entry(fluids, entry["id"])
    return {
        "schema": "obelisks.registries.v1",
        "items": items,
        "blocks": {},
        "fluids": fluids,
        "entities": {},
    }


def _tags_from_recipes(recipes: list[dict[str, Any]]) -> dict[str, Any]:
    item_tags: dict[str, list[str]] = {}
    fluid_tags: dict[str, list[str]] = {}
    for recipe in recipes:
        for entry in recipe["inputs"] + recipe["catalysts"]:
            if entry.get("kind") == "tag":
                item_tags.setdefault(entry["id"], [])
    return {"schema": "obelisks.tags.v1", "item_tags": item_tags, "fluid_tags": fluid_tags}


def _mods_from_recipes(recipes: list[dict[str, Any]]) -> dict[str, Any]:
    mods: dict[str, dict[str, str]] = {}
    for recipe in recipes:
        for rid in _recipe_ids(recipe):
            if ":" in rid:
                modid = rid.split(":", 1)[0]
                mods.setdefault(modid, {"name": modid, "version": "UNKNOWN"})
    return {"schema": "obelisks.mods.v1", "mods": mods}


def _recipe_ids(recipe: dict[str, Any]) -> list[str]:
    ids = [str(recipe.get("id", "")), str(recipe.get("type", ""))]
    for key in ("inputs", "outputs", "catalysts", "fluids_in", "fluids_out"):
        ids.extend(str(entry.get("id", "")) for entry in recipe.get(key, []))
    return ids


def _add_registry_entry(registry: dict[str, dict[str, str]], rid: str) -> None:
    namespace, path = rid.split(":", 1) if ":" in rid else ("UNKNOWN", rid)
    registry.setdefault(rid, {"namespace": namespace, "path": path, "display_name": _display_name(path)})


def _dedupe_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for entry in entries:
        key = json.dumps(entry, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        out.append(entry)
    return out


def _count(value: dict[str, Any]) -> int:
    return int(value.get("count") or value.get("Count") or 1)


def _chance(value: dict[str, Any]) -> float:
    return float(value.get("chance") or value.get("Chance") or 1.0)


def _machine_label(rtype: str) -> str:
    labels = {
        "minecraft:crafting_shaped": "Crafting Table",
        "minecraft:crafting_shapeless": "Crafting Table",
        "minecraft:smelting": "Furnace",
        "minecraft:blasting": "Blast Furnace",
        "create:pressing": "Mechanical Press",
        "create:mixing": "Mechanical Mixer",
        "create:crushing": "Crushing Wheels",
        "create:cutting": "Mechanical Saw",
        "create:deploying": "Deployer",
        "create:sequenced_assembly": "Sequenced Assembly",
    }
    return labels.get(rtype, rtype)


def _display_name(path: str) -> str:
    return path.replace("/", " / ").replace("_", " ").title()


if __name__ == "__main__":
    main()
