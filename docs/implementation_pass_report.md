# Implementation Pass Report

## Implemented

- Added pack-owned progression catalogues for coin tiers, machine casing tiers, and starter deposits.
- Registered casing blocks from `kubejs:seared_machine_casing` through `kubejs:ae2_machine_casing`.
- Registered blood-heart key items and AE2-facing `kubejs:sky_steel_ingot` / `kubejs:sky_steel_sheet`.
- Replaced Blood Orb recipes with specific typed-heart altar recipes.
- Added RPGStats typed-heart definitions using non-consumed Blood Orb catalysts after the weak tier.
- Removed non-alloying andesite alloy recipe bypasses and added TCon alloying for molten andesite alloy.
- Removed direct andesite casing item-application bypasses and added Create Deployer assembly.
- Added gravel -> gunpowder routes and an early TNT recipe.
- Added tiered machine casing recipes and used them to gate major block-machine recipes.
- Recreated FTB Quest chapters with dotcoin rewards.
- Replaced vanilla villager trades with coin-spending MoreJS trades.

## Casing Chain

1. TCon seared: `kubejs:seared_machine_casing`
2. TCon scorched: `kubejs:scorched_machine_casing`
3. Create andesite: `kubejs:andesite_machine_casing`
4. Create brass: `kubejs:brass_machine_casing`
5. Power Grid: `kubejs:power_grid_machine_casing`
6. OC2R: `kubejs:oc2r_machine_casing`
7. Creating Space: `kubejs:space_machine_casing`
8. AE2: `kubejs:ae2_machine_casing`

## Intentional Deadlock Avoidance

- `create:deployer` is not gated by `kubejs:andesite_machine_casing` because the Deployer is required to make `create:andesite_casing`.
- `powergrid:conductive_casing` and `powergrid:circuit_design_table` are not gated by `kubejs:power_grid_machine_casing` because they are inputs to that casing tier.
- `creatingspace:rocket_engineer_table` and `creatingspace:rocket_casing` are not gated by `kubejs:space_machine_casing` because they are inputs to that casing tier.
- `ae2:inscriber` and `ae2:charger` are not gated by `kubejs:ae2_machine_casing` because processor/sky-steel production must precede that casing tier.

## Known Risks

- FTB Quest SNBT is syntactically simple but should be loaded in-client once to verify layout and task parsing.
- MoreJS trade signatures were checked from the installed jar, but trade balance needs playtest.
- RPGStats death-cause matching for `wither` depends on the mod's stored death cause string. The End/dimension archmage gate is more robust.
