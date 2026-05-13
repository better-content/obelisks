# Still-Beating Heart System

Namespace: `rpgstats`

Source: `/home/gerald/mcmods/rpg-stats`

## Design Role

Still-Beating Hearts are death trophies and the thematic bridge into Blood Magic. They represent unusual, dangerous, or meaningful deaths.

They should feel like evidence of an ordeal, not farmable reagents.

Progression meaning:

- Food, water, nutrition, and bodily survival teach the player to maintain the body.
- Still-Beating Hearts teach that the body can also be spent, witnessed, and transformed.
- This leads naturally into Blood Magic as the magic backbone.

Implementation rule:

- Use hearts as milestone-quality progression keys.
- Do not use hearts as bulk crafting fuel.
- Do not make players spam-consume hearts across many unrelated recipes.
- Prefer a small number of high-meaning gates: Blood Magic entry/escalation, death/body chapter milestones, and rare composite/endgame transitions.

## Confirmed Runtime And Source IDs

Confirmed base item:

- `rpgstats:still_beating_heart`

Confirmed typed hearts from source:

- `rpgstats:myofibra_heart`
- `rpgstats:synapsis_heart`
- `rpgstats:osteon_heart`
- `rpgstats:hemostasis_heart`
- `rpgstats:carpus_heart`

Confirmed catalysts:

- `rpgstats:myofibra_catalyst`
- `rpgstats:synapsis_catalyst`
- `rpgstats:osteon_catalyst`
- `rpgstats:hemostasis_catalyst`
- `rpgstats:carpus_catalyst`

Confirmed ritual daggers:

- `rpgstats:bone_ritual_dagger`
- `rpgstats:iron_ritual_dagger`
- `rpgstats:gold_ritual_dagger`
- `rpgstats:diamond_ritual_dagger`
- `rpgstats:echo_ritual_dagger`

Other confirmed item:

- `rpgstats:heart_flesh`

## Source Mechanics

`StillBeatingHeartData.create(player, source)` stores only schema version and captured XP level under `StillBeatingHeartData` NBT.

Death handling:

- `CommonForgeEvents.onLivingDeath` captures hearts for non-spectator server players only when Blood Magic is installed.
- Captured hearts are queued in persistent player data and delivered to inventory or ender chest after respawn.
- `rpgstats:still_beating_heart` stacks to 1.
- Placing a Still-Beating Heart in a Blood Altar generates LP/t from its level: 5 LP/t base, doubling every 10 captured levels, capped at 4096 LP/t.
- The Still-Beating Heart texture is animated through native item texture animation metadata.

## Typed Heart Conversion

Typed hearts are defined through KubeJS:

- `/home/gerald/mcmods/rpgstats/kubejs/startup_scripts/rpgstats_heart_types.js`

Current typed heart requirements:

- Myofibra Heart: ritual tier 1, level 20, `rpgstats:myofibra >= 28`.
- Synapsis Heart: ritual tier 2, `rpgstats:synapsis >= 30`, `rpgstats:carpus >= 10`.
- Osteon Heart: ritual tier 3, `rpgstats:osteon >= 36`, `rpgstats:hemostasis >= 12`.
- Hemostasis Heart: ritual tier 4, level 30, `rpgstats:hemostasis >= 42`.
- Carpus Heart: ritual tier 5, Nether dimension, `rpgstats:carpus >= 45`, `rpgstats:synapsis >= 15`.

Conversion requires the matching catalyst in offhand, channels for 50-70 ticks, consumes the base Still-Beating Heart, and currently consumes the catalyst.

## Existing Blood Magic Integration

Existing script:

- `kubejs/server_scripts/40_recipe_add/40_blood_orbs_from_still_beating_hearts.js`

Current behavior:

- Removes default Blood Magic blood orb altar recipes.
- Adds level-only heart-key Blood Altar recipes:
- Level 0+ heart key -> `bloodmagic:weakbloodorb`.
- Level 10+ heart key -> `bloodmagic:apprenticebloodorb`.
- Level 20+ heart key -> `bloodmagic:magicianbloodorb`.
- Level 30+ heart key -> `bloodmagic:masterbloodorb`.
- Level 40+ heart key -> `bloodmagic:archmagebloodorb`.
- `kubejs/server_scripts/30_recipe_replace/82_blood_magic_lifeforce_rework.js` makes Blood Altars expensive and pushes non-heart LP/t helpers, such as sacrifice runes and the Dagger of Sacrifice, deeper into Blood Magic.

Design risk:

- This is a strong thematic bridge, but it consumes hearts directly for every Blood Orb tier.
- Under the trophy rule, this should remain a milestone path, not become a repeated resource sink.
- Heart production is constrained by Blood Magic being present, Blood Altar cost, and level thresholds for orb escalation.

Recommended review:

- Keep hearts as Blood Magic bridge items.
- Keep orb escalation level-only unless a future design explicitly reintroduces death-category trophies.
- Avoid using Still-Beating Hearts in side-magic workstation spam gates; side magic should use Blood Magic slates.

## Intended Heart Categories

Conceptual categories for later content:

- Ordinary danger hearts.
- Specialized environmental hearts.
- Combat hearts.
- Elemental hearts.
- Dimensional or obelisk hearts.
- Boss hearts.
- Composite/endgame hearts.

Implementation note:

- Current new heart data intentionally supports level matching only. Legacy captured hearts may still carry older snapshot fields, but new progression should not depend on them.
- Future categories should be a deliberate new design pass, not accidental reuse of old snapshot NBT.
