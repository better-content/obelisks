# World Loot Coin Pass Report

Date: 2026-04-29

## Summary

World chest loot now participates in the coin economy. This pass uses LootJS to inject the lower half of the Dot Coin ladder into vanilla/world exploration chests without replacing the base loot tables.

Loot is treated as a crafting system: world chests convert scouting, route risk, structure discovery, and combat-adjacent exploration into bounded currency.

## Implementation

Added:

- `kubejs/server_scripts/50_loot/20_world_chest_coin_tiers.js`

The script uses `LootJS.modifiers` and `event.addLootTableModifier(...)` so it appends coins to existing tables rather than snapshot-overriding vanilla or modded loot.

## Coin Mapping

| Loot source class | Coin tier | Count | Chance |
|---|---|---:|---:|
| spawn/village/igloo/small underwater ruins | `dotcoinmod:copper_coin` | 4 | 55% |
| shipwreck supply/map, big underwater ruins, ruined portals | `dotcoinmod:tin_coin` | 3 | 45% |
| dungeons, mineshafts, outposts, desert/jungle temples | `dotcoinmod:iron_coin` | 3 | 50% |
| buried treasure, shipwreck treasure, stronghold corridors/crossings | `dotcoinmod:bronze_coin` | 3 | 40% |
| woodland mansions, ancient city ice boxes, nether bridge, lower bastions | `dotcoinmod:nickel_coin` | 2 | 40% |
| stronghold libraries, ancient cities, bastion other | `dotcoinmod:silver_coin` | 2 | 35% |
| bastion treasure, end city treasure | `dotcoinmod:brass_coin` | 2 | 30% |

This intentionally stops at `brass_coin`, keeping gold and higher coin tiers for harder dimension/obelisk/boss/adventure systems.

## Validation

- `node --check kubejs/server_scripts/50_loot/20_world_chest_coin_tiers.js` passed.
- All referenced `minecraft:chests/*` tables were confirmed in the live instance loot dump.

## Remaining Work

### MUST DO

#### Proposal: Add modded structure loot coin mapping

- Evidence: this pass only covers confirmed vanilla/world `minecraft:chests/*` tables.
- Why it fits the design: modded structures are often where players actually find route rewards in this pack.
- Risk: vanilla structures feel more economically relevant than modded exploration content.
- Implementation surface: instance `dump/data_raw/loot_tables/**/chests/**`, LootJS table modifiers, dimension-specific loot tables.
- Confidence level: High.

#### Proposal: Tie higher coin tiers to authored dimension and obelisk loot

- Evidence: this pass intentionally stops at brass, the lower half of the coin ladder.
- Why it fits the design: harder dimensions and obelisks should produce higher-tier currency and rewards.
- Risk: if added to generic overworld loot, high-tier coins would bypass adventure progression.
- Implementation surface: obelisk/dimension mob loot, boss loot, dimension chest tables, quest rewards.
- Confidence level: High.
