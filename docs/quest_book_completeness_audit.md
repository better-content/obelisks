# Quest Book Completeness Audit

Date: 2026-04-29

Audited sources:

- Repo: `config/ftbquests/quests/chapters`
- Instance: `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/config/ftbquests/quests/chapters`

## Summary

Quest book completeness is not there yet. The current quest book is a useful skeleton and has the right rough chapter names, but it is not yet an authored progression guide.

The strongest current property is that the quest book already references many intended critical-path items. The weakest current property is that there is no dependency graph or onboarding/stage gating.

## Current Chapter Coverage

The repo and instance both have 12 chapter files:

| Chapter file | Repo title | Instance title | Task groups | Reward groups | Dependency terms |
|---|---|---|---:|---:|---:|
| `starting_out.snbt` | Starting Out | Carry More | 13 | 13 | 0 |
| `tinkers_construct.snbt` | Iron Tier - Tinkers Construct | Seared Machine Casing | 4 | 4 | 0 |
| `create_i.snbt` | Tin Tier - Create I | Alloyed Andesite | 8 | 8 | 0 |
| `create_ii.snbt` | Bronze Tier - Create II | Andesite Machine Casing | 4 | 4 | 0 |
| `death.snbt` | Iron Tier - Death and Blood | Still-Beating Heart | 4 | 4 | 0 |
| `magic_i.snbt` | Tin Tier - Magic I | Blank Slate Permission | 4 | 4 | 0 |
| `electricity.snbt` | Brass Tier - Power Grid | Conductive Casing | 3 | 3 | 0 |
| `oc2r.snbt` | Silver Tier - OC2R | OC2R Machine Casing | 3 | 3 | 0 |
| `space.snbt` | Gold Tier - Creating Space | Rocket Engineer Table | 3 | 3 | 0 |
| `ae2.snbt` | Diamond Tier - AE2 Local Intelligence | AE2 Machine Casing | 3 | 3 | 0 |
| `synthesis_i.snbt` | Gold Tier - Acid Chemistry | Acid Vat | 4 | 4 | 0 |
| `adventuring.snbt` | Copper Tier - Adventuring | Route Supplies | 2 | 2 | 0 |

Total authored item-task groups: 55.

Total explicit dependency terms found by text scan: 0.

## Current Item Coverage

### Starting Out

Current tasks:

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
- `minecraft:netherrack`
- `tconstruct:grout`
- meltery components: `tconstruct:seared_melter`, `tconstruct:seared_heater`, `tconstruct:seared_faucet`, `tconstruct:seared_basin`, `tconstruct:seared_table`

Status:

- Good: rewards are copper-only, matching the Starting Out reward rule.
- Good: includes carry, water, cooking, TCon, TNT, netherrack, grout, and meltery.
- Missing: no `onboarding_complete` gate.
- Missing: no explicit shelter/base stabilization check.
- Missing: no food/nutrition sequence beyond cooking pot.
- Missing: no clear Nether obelisk prep/expedition lesson text in the graph.
- Missing: no smeltery, first alloying, andesite alloy, Create basics, deployer casing, sustainable power, clean water, and three terminal exits inside the Starting Out graph. Some of these exist in other chapters but are not dependency-linked.

### Tinkers Construct

Current tasks:

- `kubejs:seared_machine_casing`
- `tconstruct:smeltery_controller`
- `tconstruct:seared_fuel_tank`
- `kubejs:scorched_machine_casing`
- `tconstruct:foundry_controller`

Status:

- Good skeleton for seared/scorched transition.
- Missing TCon repair/tool-material education.
- Missing alloying milestones and foundry byproduct explanation.
- Missing dependency on Starting Out meltery/grout path.

### Create I / II

Current Create I tasks:

- `create:andesite_alloy`
- `create:hand_crank`
- `create:millstone`
- `create:deployer`
- `create:andesite_casing`
- `create:water_wheel`
- `thirst:sand_filter`
- `realisticores:crushed_copper_sulfide_ore`

Current Create II tasks:

- `kubejs:andesite_machine_casing`
- `create:mechanical_press`
- `create:mechanical_mixer`
- `kubejs:brass_machine_casing`

Status:

- Good: Create I matches the intended early Create path closely.
- Good: sand filter appears after Create power in the rough sequence.
- Missing: no dependency links enforce TCon alloying before Create I.
- Missing: no explicit deployer-casing explanation or bypass warning.
- Missing: no brass logistics/precision mechanism subgraph beyond casing.

### Death / Magic I

Current Death tasks:

- `rpgstats:still_beating_heart`
- `bloodmagic:altar`
- `kubejs:weak_blood_heart`
- `bloodmagic:weakbloodorb`

Current Magic I tasks:

- `bloodmagic:blankslate`
- `hexerei:mixing_cauldron`
- `bloodmagic:reinforcedslate`
- `ars_nouveau:imbuement_chamber`

Status:

- Good: the Still-Beating Heart bridge is represented.
- Good: Blank/Reinforced slate progression starts the intended Blood Magic authority model.
- Missing: no body/food/water/sacrifice bridge from Starting Out.
- Missing: no Blood Altar tier ladder beyond early slates.
- Missing: no full mod placement chapters for Malum, Roots, Reliquary, Occultism, Mahou, Eidolon, Goety, Botania, Theurgy, Hex Casting, Psi, MNA, Hexalia, Ars Energistique.

### Electricity / OC2R / Space / AE2 / Synthesis

Current tasks are mostly one casing plus two or three representative machines per chapter.

Status:

- Good: chapter names align with casing ladder.
- Good: coin reward tiers roughly track progression.
- Missing: no dependency graph.
- Missing: no manufacturing subgraphs.
- Missing: no local-site AE2 explanation.
- Missing: no post-AE2 branch structure.
- Missing: no Acid Vat parity tutorial beyond first machines and two elements.

### Adventuring

Current tasks:

- `minecraft:compass`
- `minecraft:map`

Status:

- Not complete.
- Missing obelisks, dimensions, coin acquisition, markets, villages, routes, combat loop, boss/dimension reward lanes, and Villager Trading unlock.

## Reward Coverage

Starting Out uses only `dotcoinmod:copper_coin`, which is correct.

Non-Starting chapters use cumulative coin tiers. This matches the stated reward direction in rough form.

Missing reward work:

- no explicit Villager Trading unlock on holding 16 copper coins
- no quest dependencies tying chapters to coin tiers
- no authored adventure coin sources reflected in quests
- no Wares contract tutorial despite Wares being an essential crafting/economy surface
- no reward warnings to avoid bypassing recipe gates

## Major Gaps

### MUST DO

#### Proposal: Add an actual quest dependency graph

- Evidence: all 12 chapters have zero dependency terms in SNBT scan.
- Why it fits the design: the quest book should teach the fixed progression order rather than show disconnected item checks.
- Risk: players can view/complete chapters out of order and miss the intended thesis.
- Implementation surface: FTB Quests SNBT dependencies, chapter visibility, quest prerequisites.
- Confidence: High.

#### Proposal: Gate quest access behind onboarding completion

- Evidence: no `onboarding_complete` reference appears in quest files.
- Why it fits the design: Starting Out begins only after spectator scouting, spawn lock, and kit/racket selection.
- Risk: quests can start before the player has selected their start state.
- Implementation surface: FTB stages/task/visibility if available; KubeJS/player stage mirror from onboarding mod.
- Confidence: High.

#### Proposal: Rebuild Starting Out as the design graph, not a checklist

- Evidence: Starting Out has 13 task groups but lacks explicit dependencies and terminal exits.
- Why it fits the design: Starting Out is the teaching spine for bounded survival, TCon, early Nether, Create entry, clean water, and exits.
- Risk: players get items but not progression meaning.
- Implementation surface: `starting_out.snbt` quest graph, text quests, item tasks, rewards.
- Confidence: High.

#### Proposal: Add Villager Trading unlock quest

- Evidence: design says holding 16 Copper Coins unlocks Villager Trading; current Adventuring chapter only checks compass/map and copper coins.
- Why it fits the design: villages and trade are a main progression authority.
- Risk: coin economy exists mechanically but is not taught or gated.
- Implementation surface: quest item task for `dotcoinmod:copper_coin` x16, chapter visibility/dependency for Villager Trading.
- Confidence: High.

#### Proposal: Add Wares contract-crafting quest chain

- Evidence: Wares agreements are generated from loot tables and now use Dot Coin tiers, but the quest book does not teach delivery tables, packagers, packaging, sealed agreements, or village warehouse routes.
- Why it fits the design: Wares is a crafting system based on trade contracts and local logistics. It reinforces villages, distance, routes, and non-machine material conversion.
- Risk: players miss one of the core economic crafting lanes, or treat contracts as random loot.
- Implementation surface: Villager Trading, Adventuring, and Logistics quest chapters; item tasks for `wares:delivery_table`, `wares:cardboard_box`, `wares:sealed_delivery_agreement`, and contract-completion text/check tasks.
- Confidence: High.

#### Proposal: Add chapter dependency links matching casing tiers

- Evidence: chapters exist in the correct rough order but are not linked.
- Why it fits the design: each casing tier requires previous tiers.
- Risk: players can treat tiers as parallel stubs.
- Implementation surface: dependencies from TCon -> Create I -> Create II -> Electricity -> OC2R -> Space -> AE2; side links for Synthesis and Magic.
- Confidence: High.

### SHOULD DO

#### Proposal: Add text quests explaining why each gate exists

- Evidence: current chapters are mostly item checks.
- Why it fits the design: the pack thesis is conceptual: bounded matter, distance, local infrastructure, dangerous extraction.
- Risk: players see arbitrary expensive recipes instead of authored constraints.
- Implementation surface: FTB text tasks/descriptions.
- Confidence: High.

#### Proposal: Split magic into Blood tier chapters

- Evidence: Magic I only covers Blank/Reinforced slate and two mod entries.
- Why it fits the design: Blood Magic tiers are the magic backbone.
- Risk: side magic mods become a pile of unstructured recipes.
- Implementation surface: Magic I-V chapters or subchapters; slate-tier tasks.
- Confidence: Medium/high.

#### Proposal: Add ore/deposit and blast-mining quest chain

- Evidence: Create I has one crushed copper sulfide check; Starting Out has TNT, but there is no deposit-first teaching chain.
- Why it fits the design: ore/deposit identity is central to bounded matter.
- Risk: players keep thinking vanilla ore-first.
- Implementation surface: quest text, sample item tasks, TNT/blast prep tasks, processing ladder tasks.
- Confidence: High.

#### Proposal: Add AE2-locality chapter warnings and tasks

- Evidence: AE2 chapter has casing, controller, drive only.
- Why it fits the design: AE2 must be local site intelligence, not global logistics.
- Risk: players default to global network assumptions.
- Implementation surface: AE2 chapter descriptions, OC2R/trains cross-links, wireless/global restrictions explained.
- Confidence: High.

### MAYBE

#### Proposal: Add visual chapter backgrounds/icons by tier

- Evidence: current chapters have functional titles but little authored presentation.
- Why it fits the design: strong chapter identity can reinforce material tiers and coin tiers.
- Risk: aesthetic work before mechanics can waste time.
- Implementation surface: FTB Quest chapter display metadata.
- Confidence: Medium.

#### Proposal: Generate quest skeletons from progression catalogues

- Evidence: casing tiers and coin tiers already exist in `global.BTM_MACHINE_CASING_TIERS` and `global.BTM_COIN_TIERS`.
- Why it fits the design: reduces drift between recipe gates and quest gates.
- Risk: FTB Quest SNBT generation may be brittle.
- Implementation surface: helper script outside game, not runtime KubeJS.
- Confidence: Medium.

### DO NOT DO

#### Proposal: Do not turn Starting Out into a giant checklist

- Evidence: design explicitly says Starting Out is a tutorial chapter, not a giant checklist.
- Why it conflicts: it hides the core learning path under noise.
- Risk: onboarding fatigue.
- Implementation surface: none.
- Confidence: High.

#### Proposal: Do not use quest rewards to bypass hard recipe gates

- Evidence: current design uses coins, not machine outputs, as quest reward currency.
- Why it conflicts: bypasses authored recipe progression.
- Risk: players skip TCon/Create/magic spine by quest completion.
- Implementation surface: reward table review.
- Confidence: High.

## Immediate Next Work

1. Decide whether repo or instance quest titles are authoritative. The task/item content is aligned, but titles differ.
2. Add dependency graph and onboarding gate.
3. Rebuild Starting Out to match the design graph with three terminal exits.
4. Add Villager Trading chapter/unlock.
5. Add Wares contract-crafting tutorial and connect it to villages/routes/coins.
6. Expand Tech, Magic, Adventure, Synthesis, AE2, and Post-AE2 chapters from skeletons into authored progression.
