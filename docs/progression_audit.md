# Progression Audit

Repo is authoritative. Live dumps are evidence and drift detection.

## Relevant Files And Folders

- Pack metadata: `pack.toml`, `index.toml`, `mods/*.pw.toml`, `mods/*.jar`.
- Recipes/scripts: `kubejs/server_scripts`, especially `40_recipe_add`, `50_loot`, `60_worldgen`, and the local untracked `30_recipe_replace/95_acid_and_nether_grout_unification.js`.
- Quests: `config/ftbquests/quests`.
- Realistic Ores source: `/home/gerald/mcmods/oreoverhaul/src/main/resources/data/realisticores`.
- Acid Vat source: `/home/gerald/mcmods/acid_vat/src/main/resources`.
- RPG Stats source: `/home/gerald/mcmods/rpgstats`.
- Live dump: `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1-33781602/minecraft/dump`.

## Current State

The pack has the right major ingredients installed: TCon, Create and Create-family add-ons, Realistic Ores, Acid Vat, Blood Magic, Ars, major side magic mods, AE2, OC2R, FTB Quests, classselector, rpgstats, and obelisks.

User direction after initial audit:

- Prefer many distinct tricky alloys over steel-centric progression.
- Use E2E-style machine casings where each tier adds a mod's manufacturing complexity.
- Initial casing tier order: TCon seared -> TCon scorched -> Create andesite -> Create brass -> Power Grid -> OC2R -> Space -> AE2.
- Alchemistry remains a compatibility/reference surface; Acid Vat/Create-family routes should provide dissolver-style parity.

The implementation is not yet aligned with the cleaned progression:

- Starting Out quests still include press and mixer nodes, while the design says press is not core and mixer is not a grout gate.
- Create's native `create:item_application` andesite casing recipe exists and bypasses deployer-only casing.
- Acid Vat is present in repo/live but absent from `index.toml`, so repo packwiz state may not reproduce the live instance.
- Realistic Ores contains deposit blocks and crushed items, but there is no reviewed source-of-truth deposit catalogue for progression generation.

## Major Mod Audit

| Mod/system | Guidebook | First real gate candidate | Power spike | Recommended tier | Bypass/deadlock risk | Evidence | Confidence |
|---|---|---|---|---|---|---|---|
| TCon | `tconstruct:encyclopedia` likely | `tconstruct:tinker_station` | `tconstruct:seared_melter`, `tconstruct:smeltery_controller` | Starting tech | If grout does not require netherrack, Nether obelisk is optional | FTB quests and registry | High |
| Create | Ponder in-game | `create:hand_crank`, `create:millstone`, `create:deployer` | sustainable SU with `create:water_wheel`/`create:windmill_bearing` | After alloying | casing item-application bypass; early kit includes Create parts | FTB quests, recipe dump, class kits | High |
| Realistic Ores | none confirmed | deposit blocks | crushed deposit items and later processing | World-gen root | Without recipe rewrite, vanilla/other ore recipes may bypass deposit-first economy | custom resources and registry | High |
| Acid Vat | none confirmed | `acid_vat:acid_vat` | slurry/centrifuge chemistry | Late ore tier | Present jar not indexed; current recipes target vanilla ore tags, not Realistic Ores deposits | custom resources and recipe dump | High |
| Alchemistry | n/a | recipe compatibility/reference surface | dissolver-style semantics | Do not target as player-facing machine progression | Runtime recipe types exist; user direction is to keep it for mods to reference while providing Acid Vat/Create parity | user direction, recipe dump | High |
| Blood Magic | `patchouli` book likely UNKNOWN exact | `bloodmagic:altar` | slate tiers and blood orbs | Magic backbone | Current tooltip script mentions heart requirements, but side magic recipes may be ungated | registry and KubeJS tooltip script | High |
| RPG Stats hearts | none | `rpgstats:still_beating_heart` | typed hearts and ritual-death trophies | Magic 1 bridge | Existing blood-orb recipes consume hearts; must stay milestone-grade, not bulk fuel | source, quests, KubeJS recipes | High |
| Ars Nouveau | book item UNKNOWN | `ars_nouveau:imbuement_chamber`, `ars_nouveau:novice_spell_book` | `ars_nouveau:enchanting_apparatus`, later spell books | Reinforced; late Ethereal | Can become magic powerhouse before Blood Magic if ungated | registry and recipe types | High |
| Hexerei | guidebook UNKNOWN | `hexerei:mixing_cauldron` | cauldron recipes | Blank Slate | Low if mixing cauldron is gated | registry and recipe types | High |
| Malum | guidebook UNKNOWN | `malum:spirit_altar` | spirit infusion/runeworking | Blank Slate | Can provide early soul/spirit systems without BM | registry and recipe types | High |
| Roots Classic | guidebook UNKNOWN | Pyre/ritual core UNKNOWN | rituals | Blank Slate | Exact gate needs recipe/item confirmation | recipe types | Medium |
| Reliquary | guidebook UNKNOWN | first utility item UNKNOWN; Tome of Alkahestry later | Alkahestry duplication/recovery | Blank early; Demonic/Ethereal for Alkahestry | Infinite-ish recovery if Alkahestry left early | design plus installed mod | Medium |
| Occultism | guidebook UNKNOWN | `occultism:sacrificial_bowl` | storage/miner spirits | Imbued; storage later Demonic/Ethereal | Miner/storage can bypass bounded logistics/material pressure | registry and recipe types | High |
| Botania | Lexica Botania UNKNOWN exact | `botania:runic_altar` | runes, mana systems, Terra Plate | Demonic; Terra separately if needed | Botania can bridge tech/magic too early | registry and recipe types | High |
| Theurgy | guidebook UNKNOWN | first matter-transmutation machine UNKNOWN | alchemical sulfur/salt transformations | Demonic | Could undermine bounded matter if unrestricted | registry and recipe types | Medium |
| Hex Casting | guidebook UNKNOWN | programmable magic entry UNKNOWN | programming/spells | Ethereal | Programmable power too early | recipe type | Medium |
| Psi | guidebook UNKNOWN | CAD/programming entry UNKNOWN | programmable spells | Ethereal | Programmable power too early | recipe type | Medium |
| AE2 | guidebook through GuideME likely | `ae2:controller` | `ae2:spatial_io_port`, large network/storage | Late local site intelligence | Storage/logistics can become global if wireless/spatial paths are left cheap | registry | High |
| OC2R | docs/manual UNKNOWN | first computer/network component UNKNOWN | intersite communication | Late tech/logistics support | Should be encouraged, not over-gated | registry count confirms mod | Medium |

## Starting Out Quest Drift

Repo `starting_out.snbt` contains `create:andesite_alloy`, `create:hand_crank`, `create:millstone`, `create:mechanical_press`, `create:mechanical_mixer`, `create:basin`, `create:depot`, `create:andesite_casing`, `create:water_wheel`, `create:windmill_bearing`, and `thirst:sand_filter` in Starting Out.

Live `starting_out.snbt` is newer/different: it adds `rehooked:wood_hook` and `minecraft:tnt`, shifts the Nether/grout/melter positions, and removes the Create tail after the seared melter quest. This live version is closer to the cleaned Starting Out design because Starting Out should be tutorial-sized and should not include press/mixer as core gates.

Both repo and live currently reward `minecraft:emerald`, not the intended 16 Copper Coins. Exact coin item IDs still need confirmation before changing quest rewards.

Live quest folder has additional chapter stubs not present in repo: Books, Brews, Create I/II/III, Death, Electricity, Food, Hybrid Matter, Magic I/II, Space, Synthesis I/II, and Tinkers Construct. This is significant repo/live drift and should be resolved before quest implementation.

Detailed quest comparison is recorded in `docs/ftb_quest_audit.md`.

Recommendation: do not edit quests in Pass 4 unless explicitly requested, but use recipe gates to make the cleaned path mechanically true.

## Worktree Drift

Current worktree before Pass 0 contained:

- Modified `config/structurify.json`
- Untracked `kubejs/server_scripts/30_recipe_replace/95_acid_and_nether_grout_unification.js`

These were not modified by Pass 0 and should be reviewed before recipe passes because the untracked script likely overlaps Starting Out gate work.

## Still-Beating Heart Findings

Detailed heart-system audit is recorded in `docs/still_beating_heart_system.md`.

Confirmed behavior:

- `rpgstats:still_beating_heart` captures rich NBT on player death: death cause, attacker/direct entity, location, vitals, RPG Stats, ritual data, attributes, and equipment.
- Captured hearts are queued and returned to the player after respawn.
- Typed hearts currently exist for Myofibra, Synapsis, Osteon, Hemostasis, and Carpus, with catalyst/stat/ritual/dimension requirements.
- Current KubeJS replaces Blood Magic orb recipes with heart-NBT altar recipes.

Design risk:

- The existing heart-to-Blood-Orb script is thematically aligned, but can violate the new trophy rule if hearts become repeated consumables.
- Hearts should be used as Blood Magic milestones and death/body progression keys, not broad side-magic recipe ingredients.
