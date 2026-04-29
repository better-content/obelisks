# Material Registry Map

Repo is authoritative. Live dump evidence comes from `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1-33781602/minecraft/dump`, generated 2026-04-29.

## Confirmed Custom Mods

| Mod | Repo/source evidence | Runtime evidence | Notes |
|---|---|---|---|
| `realisticores` | `/home/gerald/mcmods/oreoverhaul` | 63 item entries in runtime item registry | Deposit system source of truth lives in custom mod resources. |
| `acid_vat` | `/home/gerald/mcmods/acid_vat` and `mods/acid_vat-0.1.0.jar` | 12 item entries; recipe types `acid_vat:acid`, `acid_vat:acid_vat`, `acid_vat:centrifuge` | Jar is present in repo and live, but absent from `index.toml`; sync debt. |
| `obelisks` | `/home/gerald/mcmods/meteordimensions` | 2 item entries | Main adventure/dimension custom mod. |
| `instanceddimensions` | `/home/gerald/mcmods/meteordimensions/obsolete/instanced-dimensions` | jar present in live | Built from obsolete source path; keep until replacement is confirmed. |
| `classselector` | `/home/gerald/mcmods/classselector` | config `config/classselector/kits.json` | Kits are synchronized between repo and live. |
| `rpgstats` | `/home/gerald/mcmods/rpgstats` | 17 item entries | Death/body bridge; Still-Beating Hearts, typed hearts, catalysts, ritual daggers, recipes, and stats exist in custom mod resources. |

## Starting And Tech IDs

Confirmed item IDs:

- TCon: `tconstruct:tinker_station`, `tconstruct:part_builder`, `tconstruct:crafting_station`, `tconstruct:grout`, `tconstruct:seared_melter`, `tconstruct:seared_heater`, `tconstruct:seared_faucet`, `tconstruct:seared_basin`, `tconstruct:seared_table`, `tconstruct:smeltery_controller`, `tconstruct:seared_fuel_tank`.
- Create: `create:andesite_alloy`, `create:andesite_casing`, `create:hand_crank`, `create:millstone`, `create:deployer`, `create:water_wheel`, `create:windmill_bearing`.
- Survival/logistics: `sophisticatedbackpacks:backpack`, `rehooked:wood_hook`.
- Water/thirst: `thirst:terracotta_bowl`, `thirst:terracotta_water_bowl`, `toughasnails:purified_water_bottle`, `create:builders_tea`.

Evidence:

- FTB Starting Out quest file references the TCon and Create items.
- Runtime item registry confirms all listed TCon/Create IDs.
- Thirst config confirms drink/water-quality item IDs.

## Blood Magic Gate IDs

Confirmed slate IDs:

- `bloodmagic:blankslate`
- `bloodmagic:reinforcedslate`
- `bloodmagic:infusedslate`
- `bloodmagic:demonslate`
- `bloodmagic:etherealslate`

Confirmed blood orb IDs for tooltip-only/current context:

- `bloodmagic:weakbloodorb`
- `bloodmagic:apprenticebloodorb`
- `bloodmagic:magicianbloodorb`
- `bloodmagic:masterbloodorb`
- `bloodmagic:archmagebloodorb`

Design note: slates are preferred gate inputs; blood orbs should not be consumed unless unavoidable.

## Magic Workstation Candidates

| Mod | Confirmed candidate ID | Recommended tier | Confidence |
|---|---:|---|---|
| Hexerei | `hexerei:mixing_cauldron` | Blank Slate | High |
| Malum | `malum:spirit_altar` | Blank Slate | High |
| Roots Classic | UNKNOWN exact workstation; recipe types `rootsclassic:component`, `rootsclassic:ritual` confirmed | Blank Slate | Medium |
| Ars Nouveau | `ars_nouveau:imbuement_chamber`, `ars_nouveau:novice_spell_book`, `ars_nouveau:enchanting_apparatus` | Reinforced Slate entry; Ethereal late | High |
| Occultism | `occultism:sacrificial_bowl`, `occultism:golden_sacrificial_bowl` | Imbued Slate | High |
| Botania | `botania:runic_altar` | Demonic Slate | High |
| Theurgy | first machine UNKNOWN; recipe types and many alchemical sulfur/salt items confirmed | Demonic Slate | Medium |
| Hex Casting | recipe type `hexcasting:brainsweep` confirmed; entry item UNKNOWN | Ethereal Slate | Medium |
| Psi | recipe type `psi:trick_crafting` confirmed; entry item UNKNOWN | Ethereal Slate | Medium |
| Mana and Artifice | recipe types under `mna:*` confirmed; entry item UNKNOWN | Ethereal Slate | Medium |
| Hexalia | recipe types and ritual workstations confirmed; entry item UNKNOWN | Ethereal Slate | Medium |

## Realistic Ores Deposit Blocks

Confirmed block item IDs include:

- Starter subset: `realisticores:coal_measures`, `realisticores:deepslate_coal_measures`, `realisticores:ironstone`, `realisticores:deepslate_ironstone`, `realisticores:copper_sulfide_ore`, `realisticores:deepslate_copper_sulfide_ore`, `realisticores:tin_ore`, `realisticores:deepslate_tin_ore`, `realisticores:zinc_ore`, `realisticores:deepslate_zinc_ore`, `realisticores:lead_zinc_vein`, `realisticores:deepslate_lead_zinc_vein`, `realisticores:quartz_vein`, `realisticores:deepslate_quartz_vein`, `realisticores:bauxite_laterite`, `realisticores:deepslate_bauxite_laterite`.
- Extended set: `corundum_beryl_gem_vein`, `cupriferous_redbed_redstone_vein`, `emerald_schist_beryl_vein`, `kimberlite_pipe`, `lazurite_vein`, `nickel_sulfide_ore`, `phosphate_rock`, `soul_bearing_black_shale_soulstone_vein`, `sulfur_bearing_pyrite_ore`, `thorium_ore`, `tin_tungsten_greisen`, `titanium_iron_oxide_ore`, `uranium_ore`, plus deepslate variants where present.

Confirmed crushed items:

- `realisticores:crushed_coal_measures`, `realisticores:crushed_ironstone`, `realisticores:crushed_copper_sulfide_ore`, `realisticores:crushed_tin_ore`, `realisticores:crushed_zinc_ore`, `realisticores:crushed_lead_zinc_vein`, `realisticores:crushed_quartz_vein`, `realisticores:crushed_bauxite_laterite`, and crushed forms for the extended set.

## Molten Fluids

Confirmed TCon molten source fluids relevant to starter deposits:

- `tconstruct:molten_copper`
- `tconstruct:molten_iron`
- `tconstruct:molten_gold`
- `tconstruct:molten_tin`
- `tconstruct:molten_zinc`
- `tconstruct:molten_lead`
- `tconstruct:molten_silver`
- `tconstruct:molten_nickel`
- `tconstruct:molten_aluminum`
- `tconstruct:molten_quartz`

Also confirmed as Forge fluid types in runtime. Recipe examples use fluid tags such as `forge:molten_iron`.

## Acid Vat And Chemistry

Confirmed Acid Vat fluids and recipes:

- Fluid types: `acid_vat:slurry`, `acid_vat:exposed_slurry`.
- Recipe types: `acid_vat:acid`, `acid_vat:acid_vat`, `acid_vat:centrifuge`.
- Existing acids: `chemlib:acetic_acid_fluid`, `chemlib:hydrochloric_acid_fluid`, `chemlib:nitric_acid_fluid`, `chemlib:sulfuric_acid_fluid`.
- Current Acid Vat slurry examples target vanilla ore tags, e.g. `forge:ores/copper` to `acid_vat:copper_ore_slurry`.

## Unknowns For Later Passes

- Exact output mapping for each Realistic Ores deposit is not final until a deposit catalogue is reviewed.
- Exact Y bands should be extracted from `realistic_ore_generation` and `worldgen/placed_feature` during Pass 1.
- Coin IDs are not confirmed in this audit; inspect adventure/obelisk mob drops and market configs before economy edits.
