# Expert Pack Design Handoff

This document is the authoritative design handoff for the Forge 1.20.1 expert modpack currently referred to as **The Matter Problem** / **Bound to Matter**.

The design is fixed. Implementation specifics are to be discovered from the repo, generated dumps, configs, recipe data, registry data, custom mod sources, and mod documentation when local data is insufficient.

## Operating Rule

Agents may discover exact IDs, recipe formats, tags, item names, fluids, chokepoints, bypasses, and implementation surfaces.

Agents must not reinterpret the pack design. Ambiguity is limited to implementation specifics.

## Pack Thesis

This pack is about bounded matter, bounded distance, local infrastructure, dangerous extraction, material transformation, authored logistics, and human commitment under constraint.

Core rules:

- No teleportation as normal player logistics.
- No creative flight.
- No infinite storage.
- No infinite non-grown materials.
- Distance, material locality, deposits, terrain, villages, trade, obelisks, and dimensions matter.
- AE2 is local site intelligence, not global logistics.
- OC2R is preferred for intersite communication.
- Create trains are preferred for intersite logistics.

Material identity should come from many distinct alloys and material transformations, not a generic steel ladder. Steel can exist, but the pack should not become another steel pack; later machine tiers should prefer alloy variety, awkward alloying routes, and cross-mod manufacturing complexity.

## Main Progression Authorities

Tech/crafting progression is driven by Tinkers' Construct, metallurgy, Create, ore processing, Create-family chemistry/synthesis, and physical logistics.

Magic/crafting progression is driven by Blood Magic as the backbone. Ars Nouveau is the mid/late-game magic powerhouse. Other magic mods are parented to Blood Magic tiers.

Adventure progression is driven by obelisks, dimensions, coins, villages, markets, combat, and the ARPG-like loop. It should support progression without replacing tech or magic.

## Starting Out

Starting Out is a tutorial chapter, not a giant checklist. Every quest in Starting Out rewards `16 Copper Coins`. Holding `16 Copper Coins` unlocks Villager Trading.

Quest access begins only after spectator scouting is complete, spawn is locked, and the starting kit/racket is chosen. The kit/spawn mod should provide persistent state such as `onboarding_complete`, `starting_kit`, and optionally `starting_site`. Stage mirroring is acceptable for `onboarding_complete`, `kit_miner`, `kit_lumberjack`, `kit_farmer`, `kit_rail_engineer`, `kit_brewer`, and `kit_explorer`.

Starting Out teaches first foothold, light/water/shelter, food and nutrition, Tinkers station and repair, Nether obelisk prep, netherrack grout, meltery, smeltery, first alloying, andesite alloy by alloying, Create basics, deployer-assembled andesite casings, sustainable SU power, clean water, then exits to Tech 1, Magic 1, and Adventuring.

Starting Out recipe rules:

- Grout requires netherrack.
- Grout does not require Create mixing.
- Early Nether obelisk access is forced by netherrack grout.
- Create comes after alloying.
- Andesite alloy is made exclusively through alloying.
- Hand crank, millstone, and deployer are the early important Create machines.
- Press is not part of the Starting Out core.
- Mixer is not a grout gate.
- Andesite casings require deployer assembly.
- Water wheels and windmills require andesite casings instead of shafts.
- Sand water filter is post-Create survival infrastructure.
- Thirst includes water quality, not just thirst.

## Starting Out Gates

Use existing tags only. Do not invent new tags unless explicitly approved. Prefer exact item IDs confirmed from dumps for pack-specific systems.

Key intended gates:

- First Foothold: `onboarding_complete`.
- Stabilize the Base: basic light, water vessel, shelter.
- Food Is Infrastructure: seeds/crops/meal/cooking-pot progression as appropriate.
- Tinkers Basics: `tconstruct:tinker_station`.
- Backpacks and Hooks: `sophisticatedbackpacks:backpack` or `rehooked:wood_hook`.
- Villages, Coins, Routes: holding 16 copper coins unlocks Villager Trading.
- Grout and Smeltery: grout inputs including netherrack, then meltery/smeltery components.
- Andesite Alloy: `create:andesite_alloy`, made only via alloying.
- Create Basics: `create:hand_crank`, `create:millstone`, `create:deployer`.
- Andesite Casings: `create:andesite_casing`, only via deployer assembly.
- Sustainable Power: water wheel or windmill.
- Clean Water Infrastructure: sand water filter and clean/purified water or water-quality check.

## Blast Mining

TNT is intended to be the early/mid-game mining choice. Gunpowder must be accessible from gravel. TNT should be early enough to matter, strong, risky, visible, and useful for ore/deposit gathering.

## Ore System

The ore system is deposit-first, not vanilla ore-first. Players should think in terms of deposits, such as copper sulfide, not single-output ore blocks.

Each deposit may have primary, secondary, tertiary, and processing-tier-dependent yields. Deposits should be Y-banded by surface/near-surface, underground, hills, mountains, deepslate underground, and lava depths.

Ore processing ladder:

- Tier 0: furnace, awful nugget fallback.
- Tier 1: TCon Melter/Smeltery, primary molten output.
- Tier 2: TCon Foundry, primary plus byproducts.
- Tier 3: Create crushing/washing, better preprocessing.
- Tier 4: Acid Vat and Create-family chemistry routes, slurry and many-output chemical interpretation.
- Tier 5: later Create-family chemistry/fission/fusion/synthesis replacements.

Alchemistry remains present as a compatibility/reference surface for other mods and recipe semantics. Do not make Alchemistry the player-facing progression target; future chemistry/synthesis planning should provide dissolver-style parity through Acid Vat and Create-family replacement mods where those recipes matter.

Create a source-of-truth deposit catalogue before generating recipes. Initial starter subset: coal measures, ironstone, copper sulfide, tin, zinc, lead-zinc vein, quartz vein if confirmed, and bauxite laterite if confirmed.

## Magic Progression

Blood Magic is the magic progression backbone. Ars Nouveau is the mid/late-game magic powerhouse. Other magic mods must be parented directly to Blood Magic tiers.

Still-Beating Hearts from `rpgstats` are death trophies and the thematic bridge into Blood Magic. They are high-durability, low-turnover evidence of unusual, dangerous, or meaningful deaths. Use them as milestone-quality progression keys, not bulk crafting fuel or spammed consumables. Food, water, nutrition, and survival teach the player to maintain the body; hearts teach that the body can be spent, witnessed, and transformed.

Do not add custom magic gate materials. Use existing Blood Magic materials:

- `bloodmagic:blankslate`
- `bloodmagic:reinforcedslate`
- `bloodmagic:infusedslate`
- `bloodmagic:demonslate`
- `bloodmagic:etherealslate`
- Demon Will materials where appropriate

Do not use Blood Orbs as consumed ingredients unless unavoidable. Prefer slates. Gate the first real workstation/core item that makes a mod operational. Do not gate guidebooks unless unavoidable.

Magic tiering:

- Altar I / Blank Slate: Hexerei, Roots Classic, Malum, early Reliquary.
- Altar II / Reinforced Slate: Ars Nouveau entry, Ars Additions, Ars Instrumentum, Ars Elemental, Nature's Aura, Iron's Spells.
- Altar III / Imbued Slate: Tome of Blood, Occultism basics, Mahou Tsukai, Eidolon:Repraised, Goety.
- Altar IV / Demonic Slate: Botania, Forbidden & Arcanus, Theurgy, Ars Creo, Ars Technica, Ars Caelum.
- Altar V / Ethereal Slate: Hex Casting, Psi, Mana and Artifice, Hexalia, Ars Energistique, late Ars Nouveau / Archmage systems.

## Create / Tech Gating

Starting tech progression is:

`Tinker Station -> repair mindset -> Nether-obelisk netherrack for grout -> grout -> meltery -> smeltery -> first alloy -> andesite alloy by alloying -> hand crank -> millstone -> deployer -> andesite casings via deployer -> water wheel or windmill -> sand water filter -> Tech 1`

## Machine Casing Tier Model

Use an E2E-style casing ladder where each tier adds another mod's manufacturing complexity. Each tier requires all previous tier capabilities.

Initial tier order:

- TCon seared
- TCon scorched
- Create andesite
- Create brass
- Power Grid
- OC2R
- Space
- AE2

Implementation rule: do not collapse these into a steel-heavy chain. Casing recipes should introduce new alloys, fluids, assemblies, data/control components, logistics, or environmental constraints from the new tier while retaining dependency on previous casing tiers.

Required recipe edits for later passes:

- Remove or nerf normal furnace ore outputs.
- Add gravel to gunpowder route.
- Make TNT accessible and useful.
- Make grout require netherrack.
- Make andesite alloy exclusively through alloying.
- Disable all bypasses for andesite alloy, casings, and early SU power.

## Logistics And Economy

AE2 is local site intelligence. Do not allow AE2 to become infinite storage, global teleport logistics, or a base-to-base cable replacement for trains.

Copper Coins: every Starting Out quest rewards `16 Copper Coins`; holding `16 Copper Coins` unlocks Villager Trading. Coin acquisition comes from player-killing mobs in obelisk/dimension content. Trading supports convenience, recovery, deco exclusives, and ARPG progression without trivializing production.

## Staged Workflow

Pass 0 is discovery and planning only. It produces:

- `docs/progression_audit.md`
- `docs/material_registry_map.md`
- `docs/recipe_type_capabilities.md`
- `docs/progression_chokepoints.md`
- `docs/bypass_and_deadlock_report.md`
- `docs/discovered_connections.md`
- `docs/implementation_pass_plan.md`

Later passes implement the ore deposit catalogue, early ore processing, Create preprocessing, Starting progression recipe gates, Magic Blood gates, and validation.

## Ranked Proposal Format

Rank proposals as MUST DO, SHOULD DO, MAYBE, or DO NOT DO.

Each proposal must include proposal, evidence, why it fits the design, risk, implementation surface, and confidence.
