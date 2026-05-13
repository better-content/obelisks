# Crafting Surface Overhaul Plan

Date: 2026-05-13

Source inputs:
- `generated/runtime-dumps/crafting-relevant-functional-blocks.md`
- `docs/recipe_type_capabilities.md`
- `docs/crafting_graph_from_quests.md`
- `docs/progression_chokepoints.md`
- current KubeJS recipe scripts under `kubejs/server_scripts/`

This is a planning pass only. It does not change recipes.

## Goal

Make progression recipes read as authored use of the pack's functional crafting surfaces, not as broad material substitutions. The pack already has the core casing ladder and Blood Magic slate ladder; this pass should tighten the visible recipe grammar around those ladders and remove remaining high-value bypasses without turning every utility recipe into a bespoke process.

## Current Shape

The reduced functional-block dump identifies `160` crafting/process surfaces. The highest-impact namespaces for this pass are:

- Create: `basin`, `mixer`, `press`, `deployer`, `spout`, `item_drain`, `saw`, `millstone`, `crushing_wheel`, `mechanical_crafter`, `mechanical_arm`, logistics blocks.
- Tinkers' Construct: `seared_melter`, `smeltery_controller`, `foundry_controller`, casting surfaces, scorched/seared infrastructure.
- Blood Magic: `altar`, `alchemytable`, `soulforge`.
- Ars Nouveau: `imbuement_chamber`, `enchanting_apparatus`, `ritual_brazier`, `source_jar`, `scribes_table`.
- PneumaticCraft: pressure chamber multiblock, compressors, refinery, charging station, assembly line.
- AE2: charger, inscriber, molecular assembler, pattern provider, cell workbench.
- Vanilla piggyback surfaces: shaped/shapeless crafting, smelting, blasting, smoking.

Existing strong anchors:

- `99_machine_casing_progression.js` defines seared -> scorched -> andesite -> brass -> power -> OC2R -> space -> AE2 casing authority.
- `80_magic_progression_blood_slate_gates.js` defines Blood Magic slate gates for side magic.
- `122_pneumaticcraft_create_pressing_gates.js` already converts PNCR compressed iron/stone to Create pressing.
- `65_chemlib_plate_manufacturing_routes.js` already adds explicit plate manufacturing routes where known.
- `135_recipe_graph_closure.js` and `120_graph_audit_recipe_gates.js` already close many high-risk machine bypasses.

Primary weakness:

- Several important outputs are still controlled by `replaceInput` or ordinary shaped recipes. That is acceptable for background policy, but not for chapter gates, capstones, major process surfaces, or machine-frame authority.

## Recipe Grammar

Use each recipe surface for the job it communicates best:

- `create:pressing`: form-factor conversion, plates/sheets, compressed primitives, stamped electronics.
- `create:mixing`: alloys, compounds, slurries, reagents, blended intermediates. Use heated/superheated only when the heat source is meant to be a gate.
- `create:deploying`: adding a control item, circuit, casing, cast, or tool-like applied component to a base item.
- `create:filling`: fluid insertion into a part, including sequenced assembly steps. Avoid `emptying` in sequenced assembly.
- `create:cutting`: structural trimming, boards, frames, precision slots, saw-dependent manufactured forms.
- `create:crushing` / `milling` / `splashing`: deposit preprocessing, cleanup, and yield improvement. Do not let these become final-ingot bypasses.
- `create:sequenced_assembly`: precision mechanisms, machine kits, electronics with repeated deploy/press/cut/fill operations.
- `create:mechanical_crafting`: large chassis, multiblock controllers, capstone frames, and tier boundaries.
- `tconstruct:melting` / `ore_melting`: ore/deposit interpretation into fluids. Melter gives primary output; Foundry/byproduct logic stays later and explicit.
- `tconstruct:casting_table` / `casting_basin`: visible metal-forming alternatives to Create pressing when a matching molten fluid exists.
- `bloodmagic:altar`: LP-gated one-item transformations, especially slate/orb authority.
- `bloodmagic:alchemytable` / `soulforge` / `array`: magic-side compound crafting and Demon Will crafting.
- Ars recipes: use native Ars recipe types for Ars operational items; use Blood Magic slates as gates, not consumed guidebooks.
- Vanilla shaped/shapeless: early hand assembly, simple block ingredients, fallback recipes, and low-impact utility.
- Vanilla smelting/blasting/smoking: emergency fallback or fan piggyback only. Do not let furnace routes beat authored metallurgy.

## Waves

### Wave 0: Effective Graph Refresh

Regenerate the runtime recipe and functional-surface evidence after current KubeJS loads. The existing docs warn that some dumps are pre-final-manager snapshots, so the implementation pass needs a fresh baseline before editing.

Deliverables:
- refreshed recipe graph docs under `docs/`
- list of high-value outputs still produced by shaped/shapeless only
- list of duplicate recipes that bypass casing/slate tiers

Validation:
- `node --check` for touched KubeJS dump scripts
- runtime dump generation with no KubeJS errors

### Wave 1: Create Process Authoring

Scope:
- `kubejs/server_scripts/30_recipe_replace/121_create_stack_integration_gates.js`
- `kubejs/server_scripts/30_recipe_replace/130_manufactured_plate_recipe_pass.js`
- selected closures from `120_graph_audit_recipe_gates.js` and `135_recipe_graph_closure.js`

Convert only chapter-critical and capstone outputs from broad replacement or plain shaped recipes into explicit Create process recipes.

Priority candidates:
- Create logistics/control: `create:packager`, `create:repackager`, `create:stock_link`, `create:stock_ticker`, `create:redstone_requester`, `create:portable_storage_interface`, `create:portable_fluid_interface`.
- Create Connected / additional logistics: `create_connected:kinetic_battery`, `create_connected:brake`, package editor/accelerator/monitor/filter blocks.
- Power and OC2R bridge parts that currently read as ordinary crafting but are chapter gates.
- AE2 addon machine-adjacent frames and buses if they are capstone blockers.

Preferred conversions:
- deployer for circuit/control insertion
- sequenced assembly for package/control kits
- mechanical crafting for large logistics chassis only
- pressing/cutting for formed subparts

Deadlock checks:
- do not require mechanical crafter before andesite casing and mechanical crafter are reachable
- do not move deployer behind any casing that depends on deployer output
- do not require brass-only machinery for the first brass casing

### Wave 2: TCon And Metallurgy Closure

Scope:
- `60_worldgen/10_r_ores_melted.js`
- `40_recipe_add/50_create_deposit_preprocessing.js`
- `40_recipe_add/65_chemlib_plate_manufacturing_routes.js`
- grout/alloy scripts: `95_acid_and_nether_grout_unification.js`, `98_starting_progression_bypasses.js`

Actions:
- confirm every progression-used plate has Create pressing and, where molten support exists, TCon casting.
- keep `create:andesite_alloy` out of crafting/mixing bypasses if TCon alloying remains the intended authority.
- ensure deposit blocks flow through the intended ladder: deposit -> preprocessing -> melting/ore_melting -> casting/part forming.
- keep furnace/blasting as low-output fallback only.

Risk points:
- TCon Foundry multi-output grammar remains `UNKNOWN` until confirmed locally.
- TCon casting helpers may need raw `event.custom` JSON rather than addon helpers.

### Wave 3: Magic Surface Pass

Scope:
- `80_magic_progression_blood_slate_gates.js`
- `125_magic_power_spike_gates.js`
- `82_blood_magic_lifeforce_rework.js`
- `166_tome_of_blood_post_ae2_gates.js`

Actions:
- audit all functional magic surfaces from the dump against slate tiers: Ars, Aether, Blue Skies, Twilight Forest, Blood Magic.
- prefer gating the first real workstation/core item, not books.
- keep still-beating hearts as Blood Magic/body-system milestones, not bulk side-magic fuel.
- convert major Blood/Ars hybrid recipes to native Blood Magic or Ars recipe types only when the recipe itself should happen in that workstation.

Risk points:
- many side-magic mods have multiple entry surfaces; gate the operational item that actually unlocks the system.
- avoid consuming blood orbs as normal ingredients unless unavoidable.

### Wave 4: PneumaticCraft, AE2, And Late Automation

Scope:
- `122_pneumaticcraft_create_pressing_gates.js`
- `99_machine_casing_progression.js`
- `135_recipe_graph_closure.js`
- post-AE2 scripts `160`, `165`, `168`, `169`

Actions:
- decide whether PNCR is only a downstream consumer of Create pressing/compression or deserves its own pressure-chamber branch later.
- audit AE2 `charger`, `inscriber`, `molecular_assembler`, `pattern_provider`, `cell_workbench` against the AE2 casing tier.
- keep AE2 local-first; audit wireless/global/storage conveniences separately before allowing them as normal infrastructure.
- preserve post-AE2 branch identity: quantum manufacturing, Protection Pixel equipment, Tome of Blood hybrid magic.

### Wave 5: Adventure, Dimension, And Economy Surfaces

Scope:
- `100_high_value_mod_progression_gates.js`
- `110_extreme_y_band_reward_gates.js`
- `170_space_dimension_access_gates.js`
- loot/trade scripts under `50_loot/` and `35_villager_trades/`

Actions:
- audit functional surfaces from Blue Skies, Aether, Twilight Forest, Ice and Fire dragonforges, Fallout Wastelands portal pieces, and village/economy blocks.
- ensure loot/trades do not bypass casing, slate, deposit, coin, or dimension gates.
- keep coin economy as a lane, not a replacement for production.

## Implementation Rules

- Add explicit recipes only for gate/capstone/high-throughput surfaces.
- Keep broad `replaceInput` passes as policy backstops, but do not rely on them as the only expression of important gates.
- Prefer data tables for repeated recipe families.
- Use deterministic `kubejs:*` IDs.
- Keep scripts Rhino-safe.
- Mark unknown IDs or unconfirmed recipe grammar as `UNKNOWN`; do not invent IDs.
- Update docs whenever progression behavior changes.

## Validation Checklist

For each implementation wave:

1. `node --check` every touched KubeJS script.
2. Run relevant graph/audit dump scripts.
3. Verify no duplicate lower-tier recipe still outputs the same gate item.
4. Verify EMI/JEI visibility for representative recipes from each recipe type used.
5. Recheck chokepoints:
   - grout and Nether access
   - andesite alloy
   - deployer and andesite casing
   - brass casing
   - power/OC2R/space/AE2 casings
   - Blood Magic altar/slates
   - coin/trade bypasses
6. Record evidence in `docs/`.

For tooling/runtime changes, also run:

1. `bash -n tools/*.sh`
2. sync dry runs
3. `python3 -m py_compile` for touched Python tools

## First Concrete Work Package

Start with Wave 1 because it has the clearest payoff and the lowest grammar uncertainty.

Recommended first PR/change set:

1. Add helper functions for Create custom recipes in a new or existing KubeJS recipe script.
2. Convert `create:packager`, `create:repackager`, `create:stock_link`, `create:stock_ticker`, and `create:redstone_requester` from shaped recipes to explicit Create recipes.
3. Convert one package-addon control block as a pattern example.
4. Run syntax checks and graph dump.
5. Document before/after recipe IDs and any remaining shaped fallback removals.

Stop there before touching metallurgy or magic; those have different failure modes and should be validated separately.
