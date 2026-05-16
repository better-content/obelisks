# KubeJS Recipe Audit Dumps

This pack has an opt-in KubeJS recipe audit script for checking the final recipe graph after KubeJS has applied recipe removals, replacements, and additions.

## Files

- `kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js`
- `kubejs/config/audit_dumps.json`

The script is disabled by default and has no gameplay effect while disabled.

## How To Run

1. Set `enabled` to `true` in `kubejs/config/audit_dumps.json`.
2. Launch the pack or run `/reload` in an existing world.
3. Inspect the generated files under `kubejs/config/`.
4. Set `enabled` back to `false` before committing release builds or shipping an instance.

The pack keeps `writeFullRecipeIndex` enabled for dev. Full graph output is chunked by `fullRecipeChunkSize` to avoid very large single-file writes.

## Generated Dumps

- `recipe_audit_summary.json`: recipe count, type counts, namespace counts, and match counts.
- `progression_recipe_mentions.json`: recipes mentioning core progression items such as grout, andesite alloy, machine casings, blood orbs, AE2 controller, and Create/PNCR.
- `valuable_material_usage_recipes.json`: recipes that still reference vanilla valuable materials or common tags for iron, copper, gold, redstone, lapis, diamond, emerald, or amethyst.
- `known_bypass_candidate_recipes.json`: suspicious recipes for known bypass classes such as non-alloying andesite alloy, item-application andesite casing, crafted nether grout, or Blood Magic teleposer.
- `full_recipe_index_manifest.json`: manifest for the full graph chunks.
- `full_recipe_index_####.json`: chunked full recipe graph when `writeFullRecipeIndex` is enabled.

## Notes

This is more useful than the current external recipe dump when validating KubeJS changes because it runs inside `ServerEvents.recipes` after the pack scripts earlier in load order have made their changes.

It is still a text/JSON scan. It should be treated as an audit aid, not a formal proof. Final validation still needs in-game EMI checks for important recipes and a fresh startup log review.

For routine recipe and content work, prefer the end-to-end server smoke wrapper:

```sh
tools/server_content_smoke.sh --server-dir /tmp/btm-content-smoke --reset-runtime
```

That command bootstraps a disposable server, prunes stale runtime mods, waits for the dedicated server `Done` marker, stops cleanly, scans hard log failures, and runs `tools/pack_test_suite.mjs` against the same runtime.
