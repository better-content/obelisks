# Validation Report

## Static Checks

- KubeJS files were syntax-checked with `node --check`.
- Registry IDs used in new recipes were checked against the live instance item/fluid dumps where practical.
- MoreJS event names and method signatures were checked with `javap` against `morejs-forge-1.20.1-0.10.1.jar`.
- RPGStats heart type DSL was checked against `/home/gerald/mcmods/rpgstats` source.
- Acid Vat recipe JSON shapes were checked against `/home/gerald/mcmods/acid_vat` docs/source and generated recipe dumps.
- `packwiz refresh` was run after adding/modifying pack files.
- `git diff --check` was run before commit.

## Runtime-Adjacent Checks

- `/home/gerald/mcmods/acid_vat` Forge game tests passed: 24 required game tests complete.
- `/home/gerald/mcmods/acid_vat` currently has one unrelated failing standalone unit test: `AcidVatSlurryMixingTest > different slurry products and acid variants cannot merge()`.

## Bypass Check

- Andesite alloy vanilla/Create crafting and mixing bypasses are removed by explicit recipe IDs.
- Direct TCon molten iron/zinc basin casting into `create:andesite_alloy` is removed.
- Andesite alloy now uses TCon alloying into `tinkersinnovation:molten_andesite_alloy`, then existing Tinkers Innovation casting.
- Andesite casing item application is removed; `create:deploying` is the intended route.
- Water wheel/windmill already require `create:andesite_casing` via existing script.
- Nether grout is Create mixing only via existing script; normal grout remains netherrack-based via existing script.
- Starter deposits now have explicit poor furnace/blasting fallback recipes and stronger TCon/Create/Acid routes.
- Acid Vat block machines are gated behind `kubejs:brass_machine_casing` where recipe inputs allow it.
- Blood Orbs are no longer made from generic Still-Beating Heart NBT recipes; they consume specific typed heart items.

## Not Headlessly Proven

- Full modpack Minecraft/KubeJS startup was not run in this pass.
- FTB Quest chapter load needs an in-client reload check.
- Villager trade runtime behavior needs a throwaway-world verification.

## High-Value Mod Gate Pass

- Added `kubejs/server_scripts/30_recipe_replace/100_high_value_mod_progression_gates.js`.
- Static KubeJS syntax check passed after adding high-value gates.
- `git diff --check` passed after adding high-value gates.
- `packwiz refresh` was run after adding high-value gates and audit docs.
- Runtime EMI verification is still required for output-based replacement breadth and multi-input hard-gate costs.

## Loot Table Pass

- Generated loot table overrides were JSON-validated with `python3 -m json.tool`.
- Artifacts injection and entity equipment tables preserve their original loot table type while clearing pools.
- Sophisticated Backpacks injection tables preserve their original loot table type while clearing pools.
- Apotheosis and Apotheotic Additions high-value tables were replaced with bounded coin/supply loot.
- Generated overrides were searched for `apotheosis:gem`, `random_gem`, `random_affix`, `create:andesite_alloy`, and `minecraft:netherite_scrap`; none remain in the replacement tables.
- Full Minecraft loot reload still needs an in-client `/reload` check.
