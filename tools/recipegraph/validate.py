from __future__ import annotations

from dataclasses import dataclass, field

from .normalize import RecipeGraph, fluid_ids, item_ids


@dataclass
class RecipeValidation:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def validate_recipe_graph(graph: RecipeGraph) -> RecipeValidation:
    result = RecipeValidation()
    seen = set()
    for recipe in graph.recipes:
        rid = recipe.get("id")
        if not rid:
            result.errors.append("recipe missing id")
        elif rid in seen:
            result.errors.append(f"duplicate recipe id: {rid}")
        seen.add(rid)
        if not recipe.get("type"):
            result.errors.append(f"recipe {rid}: missing type")
        if recipe.get("parsed") is False:
            result.warnings.append(f"recipe {rid}: unparsed serializer {recipe.get('type')}")
    for item in sorted(item_ids(graph)):
        if item not in graph.produced_by:
            result.warnings.append(f"item has no producing recipe: {item}")
        if item not in graph.used_in:
            result.warnings.append(f"item has no recipe uses: {item}")
    for fluid in sorted(fluid_ids(graph)):
        if fluid not in graph.fluid_produced_by:
            result.warnings.append(f"fluid has no producing recipe: {fluid}")
        if fluid not in graph.fluid_used_in:
            result.warnings.append(f"fluid has no consumers: {fluid}")
    return result
