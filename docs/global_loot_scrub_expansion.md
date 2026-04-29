# Global Loot Scrub Expansion

The generic loot scrub now removes every current registry item whose ID contains either:

- `creative`
- `netherite`

It also removes `minecraft:elytra`.

## Reason

Loot is a crafting surface in this pack. Creative items, netherite items/blocks/upgrades, netherite-derived mod equipment, and elytra are all progression bypasses unless placed intentionally into authored endgame branches.

## Scope

The removal list is generated from the current item registry and currently contains 127 items. It covers vanilla and modded variants such as:

- creative energy/source/storage blocks
- creative tools and unlockers
- vanilla netherite gear/materials/templates
- modded netherite equipment and storage upgrades
- netherite decorative blocks and sheets
- netherite drill heads and specialty tools

## Reintroduction Rule

If any of these items are desired later, they should be reintroduced through one of:

- explicit post-AE2 recipe branches
- extreme Y-band material rewards
- boss/dimension loot tables with authored context
- coin/Wares contracts at the appropriate tier

They should not enter through generic structure/entity loot by accident.
