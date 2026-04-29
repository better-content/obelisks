# Loot Table Pass Report

## Scope

This pass controls the high-value loot paths found in the generated loot table dump from the live playtest instance:

- `artifacts` chest/entity injection tables
- `sophisticatedbackpacks` chest injection tables
- `apotheosis` valuable chest, spawner chest, tome tower, and treasure goblin tables
- `apotheotic_additions` themed spawner chest tables
- Apotheosis adventure config broad affix/gem injection rules

The goal is not to make loot empty. The goal is to stop loot from bypassing progression while keeping adventure rewards useful through bounded coins and expedition supplies.

## MUST DO

### Disable Artifacts Random Injection

- Proposal: Override all `artifacts:inject/*` and `artifacts:entity_equipment/*` loot tables with empty tables.
- Evidence: The dump showed Artifacts injecting mobility, food, magnet, mining, combat, and survival items into common chests, village chests, archaeology tables, and mob equipment.
- Why it fits the design: Artifacts like permanent food, magnetism, flight-adjacent movement, and mining helpers bypass bounded survival, logistics, and early tech gates when found randomly.
- Risk: Artifacts become mostly unavailable until authored into specific quest/dimension rewards.
- Implementation surface: `kubejs/data/artifacts/loot_tables/inject/**` and `kubejs/data/artifacts/loot_tables/entity_equipment/**`.
- Confidence level: High.

### Curate Generic Artifact Pool

- Proposal: Replace `artifacts:artifact` with a small low-bypass selector.
- Evidence: The original generic pool included high-impact items such as permanent food, strong movement, magnets, mining helpers, and teleport/survival-adjacent effects.
- Why it fits the design: If another table references the generic artifact pool, it can only produce lower-impact utility or flavor artifacts.
- Risk: Some curated items may still need playtest tuning.
- Implementation surface: `kubejs/data/artifacts/loot_tables/artifact.json`.
- Confidence level: Medium-high.

### Disable Sophisticated Backpacks Chest Injection

- Proposal: Override `sophisticatedbackpacks:inject/chests/*` tables with empty tables.
- Evidence: The dump showed random backpacks, copper backpacks, higher backpacks, pickup upgrades, magnet upgrades, and feeding upgrades in structure chests.
- Why it fits the design: Carry capacity and backpack upgrades are progression/quest infrastructure, not random chest bypasses.
- Risk: Exploration no longer grants backpack surprises; this is intended until authored rewards exist.
- Implementation surface: `kubejs/data/sophisticatedbackpacks/loot_tables/inject/chests/**`.
- Confidence level: High.

### Replace Apotheosis High-Value Loot

- Proposal: Replace Apotheosis valuable chest, tome tower, treasure goblin, and spawner chest tables with bounded coin and supply rewards.
- Evidence: Original tables contained random gems, random affix items, diamond gear, and other high-value outputs.
- Why it fits the design: Apotheosis combat loot should not skip metallurgy, magic gates, or equipment progression. Coins preserve the adventure reward loop.
- Risk: Apotheosis reward identity is reduced until later dimension/obelisk rewards are authored.
- Implementation surface: `kubejs/data/apotheosis/loot_tables/chests/**` and `kubejs/data/apotheosis/loot_tables/entity/treasure_goblin.json`.
- Confidence level: High.

### Replace Apotheotic Additions Spawner Loot

- Proposal: Replace all themed `apotheotic_additions` spawner chest tables that leaked Apotheosis gem materials.
- Evidence: The dump showed `apotheosis:gem_dust` and `apotheosis:gem_fused_slate` in nine themed spawner tables.
- Why it fits the design: Gem crafting/progression should not be seeded broadly through spawner chests.
- Risk: Themed spawner chests become less mod-flavored until authored tier rewards are added.
- Implementation surface: `kubejs/data/apotheotic_additions/loot_tables/chests/*.json`.
- Confidence level: High.

### Reduce Apotheosis Broad Injection Rules

- Proposal: Remove broad `minecraft:chests.*`, `.*chests.*`, and universal affix conversion rules from Apotheosis config; keep only low-rate End City and Twilight structure hooks.
- Evidence: `config/apotheosis/adventure.cfg` permitted affix/gem injection across broad chest patterns and natural overworld boss spawns.
- Why it fits the design: High-stat randomized gear can be an adventure reward, but should not appear everywhere or undermine local crafting progression.
- Risk: Needs playtest to decide whether End/Twilight rates are too low or still too broad.
- Implementation surface: `config/apotheosis/adventure.cfg`.
- Confidence level: Medium-high.

## SHOULD DO

### Author Tiered Dimension Reward Tables Later

- Proposal: Add explicit obelisk/dimension reward tables by coin tier rather than relying on mod defaults.
- Evidence: The current pass removes high-impact defaults but does not yet create a complete authored reward ladder.
- Why it fits the design: The pack already wants adventure/dimension tiers mapped to coin tiers and support-stock rewards.
- Risk: Requires design/balance pass per dimension.
- Implementation surface: future datapack/KubeJS loot tables and FTB Quest rewards.
- Confidence level: High.

## MAYBE

### Add Runtime LootJS Scrub Rules

- Proposal: Add a runtime item scrub for known banned loot items if the local LootJS API supports table-wide item removal safely.
- Evidence: Datapack overrides cover confirmed high-value chokepoints, but a runtime scrub would catch undiscovered injected loot.
- Why it fits the design: A denylist protects against future mod additions and config drift.
- Risk: Unknown LootJS API shape in this pack; a bad script could break loot loading.
- Implementation surface: `kubejs/server_scripts/50_loot/` after confirming API in runtime docs or generated examples.
- Confidence level: Medium.

## DO NOT DO

### Do Not Leave Random Permanent Food, Magnet, Flight, or Infinite Storage Loot Enabled

- Proposal: Do not rely on rarity alone for items that erase survival, distance, logistics, or storage constraints.
- Evidence: Many of these items appeared in common/village/structure injection tables.
- Why it fits the design: The pack thesis depends on bounded matter, bounded distance, survival prep, and authored logistics.
- Risk: None; these can return later as authored rewards.
- Implementation surface: loot overrides and future authored tables.
- Confidence level: High.

## Generated Overrides

- Artifacts: 36 injection tables, 10 entity equipment tables, and the generic `artifact` pool.
- Sophisticated Backpacks: 9 chest injection tables.
- Apotheosis: 6 high-value chest/entity tables.
- Apotheotic Additions: 9 themed spawner chest tables.

## Manual Runtime Checks

- Open village, bonus, mineshaft, ruined portal, and shipwreck chests; confirm no Artifacts or Sophisticated Backpacks injection rewards appear.
- Open Apotheosis rogue spawner valuable chests; confirm rewards are coins and mundane supplies.
- Kill a treasure goblin; confirm it drops coins/supplies instead of random affix gear and gems.
- Check End City and Twilight loot in a disposable world; confirm Apotheosis affix/gem rates are low and not present in ordinary overworld loot.

## Loot As Crafting Economy

Loot tables are an essential crafting system in this pack. They convert exploration, combat, dimensions, risk, and route knowledge into materials and currency. Future loot passes should audit loot tables with the same rigor as recipes, villager trades, Wares contracts, and quest rewards.

### MUST DO

#### Proposal: Add a full loot-table graph audit

- Evidence: Wares contracts, package rewards, Apotheosis chests, entity loot, and dimension rewards can all mint progression resources outside normal recipe screens.
- Why it fits the design: bounded matter requires every material source to be authored, including loot.
- Risk: random loot can bypass deposits, machine casings, Blood Magic tiers, or coin scarcity.
- Implementation surface: `kubejs/data/**/loot_tables`, instance `dump/data_raw/loot_tables`, entity loot, chest loot, Wares agreement/package tables.
- Confidence level: High.

## World Chest Coin Injection

A first world-loot coin pass now injects low and mid-low Dot Coin tiers into confirmed vanilla/world chest tables through LootJS instead of replacing whole loot tables. This makes scouting and structure discovery part of the crafting economy while keeping gold-and-higher coin tiers reserved for harder dimension, obelisk, and boss systems. See `docs/world_loot_coin_pass_report.md`.
