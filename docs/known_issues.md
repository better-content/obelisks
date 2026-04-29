# Known Issues

- Some higher casing gates intentionally leave the first machine of a tier ungated to avoid recipe deadlocks.
- `kubejs:master_blood_heart` depends on RPGStats storing the wither death cause as `wither`; if runtime uses a different cause ID, adjust the DSL requirement.
- Quest dependencies/visibility are not fully authored yet; this pass prioritizes chapter structure, task targets, and reward economy.
- Villager trades are a first balance pass and should be tuned after seeing coin income from obelisk/dimension content.
- Acid Vat source currently has one failing standalone unit test unrelated to this pack repo, while its Forge game tests pass.
- Output-based `replaceInput` gates can make some recipes require multiple casing/slate ingredients if several original inputs match; this is intentional for hard gates but should be checked in EMI.
- Relics did not appear in the current generated loot table dump; if Relics uses runtime injection or capabilities instead of data loot tables, it still needs an in-client loot/source check.
- Loot defaults are now heavily suppressed for Artifacts, Sophisticated Backpacks, Apotheosis, and Apotheotic Additions; authored dimension/obelisk reward tables still need a later design pass.
- LootJS global denylist was not added because the local API surface was not confirmed headlessly; datapack overrides cover the confirmed generated-table chokepoints.
