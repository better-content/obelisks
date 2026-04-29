# KubeJS Recipe Audit Dumps

This pack has an opt-in KubeJS recipe audit script for checking the final recipe graph after KubeJS has applied recipe removals, replacements, and additions.

## Files

- `kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js`
- `kubejs/config/audit_dumps.json`

The script is disabled by default and has no gameplay effect while disabled.

## How To Run

1. Set `enabled` to `true` in `kubejs/config/audit_dumps.json`.
2. Launch the pack or run `/reload` in an existing world.
3. Inspect the generated files under `kubejs/recipe_dumps/`.
4. Set `enabled` back to `false` before committing release builds or shipping an instance.

Optional: set `writeFullRecipeIndex` to `true` to dump every scanned recipe. This can generate a large file.

## Generated Dumps

- `recipe_audit_summary.json`: recipe count, type counts, namespace counts, and match counts.
- `progression_recipe_mentions.json`: recipes mentioning core progression items such as grout, andesite alloy, machine casings, blood orbs, AE2 controller, and Acid Vat.
- `valuable_material_usage_recipes.json`: recipes that still reference vanilla valuable materials or common tags for iron, copper, gold, redstone, lapis, diamond, emerald, or amethyst.
- `known_bypass_candidate_recipes.json`: suspicious recipes for known bypass classes such as non-alloying andesite alloy, item-application andesite casing, crafted nether grout, or Blood Magic teleposer.
- `full_recipe_index.json`: optional full index when `writeFullRecipeIndex` is enabled.

## Notes

This is more useful than the current external recipe dump when validating KubeJS changes because it runs inside `ServerEvents.recipes` after the pack scripts earlier in load order have made their changes.

It is still a text/JSON scan. It should be treated as an audit aid, not a formal proof. Final validation still needs in-game EMI checks for important recipes and a fresh startup log review.
