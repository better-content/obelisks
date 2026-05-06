from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class RecipeGraph:
    recipes: list[dict[str, Any]] = field(default_factory=list)
    registries: dict[str, Any] = field(default_factory=dict)
    tags: dict[str, Any] = field(default_factory=dict)
    mods: dict[str, Any] = field(default_factory=dict)
    produced_by: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    used_in: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    fluid_produced_by: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    fluid_used_in: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    recipes_by_type: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    unparsed: list[dict[str, Any]] = field(default_factory=list)


def load_recipe_graph(runtime_dir: str) -> RecipeGraph:
    root = Path(runtime_dir)
    graph = RecipeGraph(
        recipes=_read_json(root / "recipes.json", {"recipes": []}).get("recipes", []),
        registries=_read_json(root / "registries.json", {}),
        tags=_read_json(root / "tags.json", {}),
        mods=_read_json(root / "mods.json", {}),
    )
    normalize_recipe_graph(graph)
    return graph


def normalize_recipe_graph(graph: RecipeGraph) -> RecipeGraph:
    for recipe in graph.recipes:
        rtype = str(recipe.get("type", "unknown"))
        graph.recipes_by_type.setdefault(rtype, []).append(recipe)
        if recipe.get("parsed") is False:
            graph.unparsed.append(recipe)
        for item in _items(recipe.get("outputs")):
            graph.produced_by.setdefault(item, []).append(recipe)
        for item in _items(recipe.get("inputs")) + _items(recipe.get("catalysts")):
            graph.used_in.setdefault(item, []).append(recipe)
        for fluid in _fluids(recipe.get("fluids_out")):
            graph.fluid_produced_by.setdefault(fluid, []).append(recipe)
        for fluid in _fluids(recipe.get("fluids_in")):
            graph.fluid_used_in.setdefault(fluid, []).append(recipe)
    return graph


def item_ids(graph: RecipeGraph) -> set[str]:
    items = set((graph.registries.get("items") or {}).keys())
    items.update(graph.produced_by.keys())
    items.update(graph.used_in.keys())
    return items


def fluid_ids(graph: RecipeGraph) -> set[str]:
    fluids = set((graph.registries.get("fluids") or {}).keys())
    fluids.update(graph.fluid_produced_by.keys())
    fluids.update(graph.fluid_used_in.keys())
    return fluids


def _items(entries) -> list[str]:
    out = []
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("kind") == "item" and entry.get("id"):
            out.append(str(entry["id"]))
    return out


def _fluids(entries) -> list[str]:
    out = []
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("kind") == "fluid" and entry.get("id"):
            out.append(str(entry["id"]))
    return out


def _read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)
