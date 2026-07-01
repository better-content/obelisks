# Server Scripts Layout

These scripts run on server datapack reload. This runtime copy should match the source tree after sync; make lasting edits in root `kubejs/server_scripts/`.

- `10_tags/`: block/item tag changes
- `20_recipe_remove/`: recipe removals only
- `30_recipe_replace/`: input/output rewrites and recipe transformations
- `35_villager_trades/`: trade and coin economy rewrites
- `40_recipe_add/`: new recipes and custom recipe definitions
- `50_loot/`: LootJS and loot table modifiers
- `60_worldgen/`: worldgen/material system integration scripts
- `70_spawn/`: spawn and respawn behavior
- `80_recipe_policy/`: late global recipe-surface policy guards
- `90_dev_debug/`: temporary diagnostics (keep empty in release)

Naming convention:

- Prefix files with load order such as `10_`, `20_`, or `30_`.
- Keep one responsibility per script.
- Keep `90_dev_debug/` empty in release builds.
