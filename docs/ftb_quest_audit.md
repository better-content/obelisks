# FTB Quest Audit

This audit compares quest files in the repo with the live Prism instance.

Repo path:

- `config/ftbquests/quests`

Live path:

- `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1-33781602/minecraft/config/ftbquests/quests`

## Summary

The live instance has newer quest work than the repo. Do not overwrite live quests from repo without a sync decision.

Repo chapters:

- `starting_out.snbt`: active chapter, 7604 bytes.
- `f.snbt`: empty placeholder, 176 bytes.

Live chapters:

- `starting_out.snbt`: active chapter, 4480 bytes.
- `death.snbt`: active small chapter, 762 bytes.
- `synthesis_i.snbt`: active chapter, 3433 bytes.
- `books.snbt`: empty stub.
- `brews.snbt`: empty stub.
- `create_i.snbt`: empty stub.
- `create_ii.snbt`: empty stub.
- `create_iii.snbt`: empty stub.
- `electricity.snbt`: empty stub.
- `food.snbt`: empty stub.
- `hybrid_matter.snbt`: empty stub.
- `magic_i.snbt`: empty stub.
- `magic_ii.snbt`: empty stub.
- `space.snbt`: empty stub.
- `synthesis_ii.snbt`: empty stub.
- `tinkers_construct.snbt`: empty stub.

Both repo and live have empty `chapter_groups.snbt`.

## Starting Out

Repo Starting Out includes:

- `sophisticatedbackpacks:backpack`
- `minecraft:torch`
- `thirst:terracotta_water_bowl`
- `cold_sweat:sewing_table`
- `farmersdelight:cooking_pot`
- `tconstruct:tinker_station`
- `tconstruct:part_builder`
- `tconstruct:crafting_station`
- Nether location task
- `tconstruct:grout`
- melter set: `tconstruct:seared_melter`, `tconstruct:seared_heater`, `tconstruct:seared_faucet`, `tconstruct:seared_basin`, `tconstruct:seared_table`
- `create:andesite_alloy`
- smeltery set: `tconstruct:smeltery_controller`, `tconstruct:seared_fuel_tank`
- Create tail: `create:hand_crank`, `create:millstone`, `create:mechanical_press`, `create:mechanical_mixer`, `create:basin`, `create:depot`, `create:andesite_casing`, `create:water_wheel`, `create:windmill_bearing`
- `thirst:sand_filter`
- `rehooked:wood_hook`

Live Starting Out includes:

- `sophisticatedbackpacks:backpack`
- `minecraft:torch`
- `thirst:terracotta_water_bowl`
- `cold_sweat:sewing_table`
- `farmersdelight:cooking_pot`
- `tconstruct:tinker_station`
- `tconstruct:part_builder`
- `tconstruct:crafting_station`
- `rehooked:wood_hook`
- `minecraft:tnt`
- Nether location task
- `tconstruct:grout`
- melter set: `tconstruct:seared_melter`, `tconstruct:seared_heater`, `tconstruct:seared_faucet`, `tconstruct:seared_basin`, `tconstruct:seared_table`

Interpretation:

- Live Starting Out is closer to the cleaned design because it is shorter and removes press/mixer/casing/power from the tutorial core.
- Live adds explicit hook and TNT tasks, matching support and blast-mining intent.
- Both repo and live currently use `minecraft:emerald` as rewards, not the intended Copper Coin reward.
- Copper Coin item IDs are still unconfirmed in this audit.

## Death

Live `death.snbt` contains:

- `rpgstats:still_beating_heart`
- `bloodmagic:altar`
- `bloodmagic:apprenticebloodorb`

The Apprentice Orb quest depends on both the still-beating heart and Blood Altar tasks.

Interpretation:

- This is a useful start for the Magic 1 bridge: death/body systems into Blood Magic.
- It currently targets `bloodmagic:apprenticebloodorb`, while the fixed magic-gating model mostly uses slates for side-mod access. This is not necessarily wrong as a quest milestone, but recipe gates should avoid broadly consuming blood orbs.
- Still-Beating Hearts should be treated as trophy/milestone keys in this chapter, not as farmable reagent checks.

## Synthesis I

Live `synthesis_i.snbt` contains the Create/progression tail removed from live Starting Out:

- `tconstruct:smeltery_controller`
- `tconstruct:seared_fuel_tank`
- `create:andesite_alloy`
- `create:hand_crank`
- `create:mechanical_press`
- `create:millstone`
- `create:mechanical_mixer`
- `create:basin`
- `create:depot`
- `create:andesite_casing`
- `create:water_wheel`
- `create:windmill_bearing`
- `thirst:sand_filter`

Interpretation:

- This chapter is currently closer to Create / Tech 1 than Synthesis I.
- It preserves useful quest work from the repo's old Starting Out tail.
- Press, mixer, basin, and depot should stay outside Starting Out. They can be retained in a later Create/Tech chapter after recipe gates are mechanically true.
- The smeltery and andesite-alloy lead-in is sensible if this chapter becomes the bridge out of Starting Out.

## Empty Live Stubs

These chapters exist in live but currently contain no quests:

- Books
- Brews
- Create I
- Create II
- Create III
- Electricity
- Food
- Hybrid Matter
- Magic I
- Magic II
- Space
- Synthesis II
- Tinkers Construct

Interpretation:

- The user has already established the intended chapter taxonomy in live.
- Repo lacks these stubs, so quest sync is needed before editing quest content in repo.

## Required Follow-Up

MUST DO:

- Decide whether to import live FTB Quest files into repo before any quest edits.
- Confirm Copper Coin item IDs before replacing `minecraft:emerald` rewards.
- Keep live Starting Out's shorter tutorial shape unless the user explicitly asks to restore the repo's Create tail.

SHOULD DO:

- Reframe live `synthesis_i.snbt` as Create/Tech 1, or move its content into the appropriate Create chapter.
- Keep `death.snbt` as the Magic 1 bridge and later expand it around body/death/sacrifice before side magic.
- Use chapter stubs as planning anchors for later pass sequencing.

DO NOT DO:

- Do not blindly overwrite live quests with repo quests.
- Do not reinsert press/mixer into Starting Out core.
- Do not assume emerald rewards are final economy design.
