# Ore Deposit Catalogue

This pass keeps `kubejs/server_scripts/60_worldgen/10_r_ores_melted.js` as the active recipe generator and adds `global.BTM_STARTER_DEPOSITS` in `kubejs/startup_scripts/00_globals/20_progression_catalogues.js` as the pack-facing starter catalogue.

## Six Y Bands

- `surface_or_shallow_underground`: tutorial and survival deposits; low danger.
- `shallow_underground`: first real mine planning and TNT use; medium danger.
- `hills`: regional movement incentive; medium danger.
- `mountains`: terrain-gated high value; medium/high danger.
- `deepslate_underground`: late-mid dense extraction; high danger.
- `lava_depths`: specialist heat/lava extraction; very high danger.

## Starter Subset

| Deposit | Tag | Band | Primary | Secondary | Tertiary | First useful tier | Notes |
|---|---|---|---|---|---|---|---|
| Coal Measures | `kubejs:deposit_blocks/coal_measures` | surface/shallow | coal | iron | none | furnace/Create preprocess | Active TCon fallback maps to molten iron where needed. |
| Ironstone | `kubejs:deposit_blocks/ironstone` | shallow | iron | nickel | chromium | melter | Chromium is the confirmed molten trace substitute. |
| Copper Sulfide | `kubejs:deposit_blocks/copper_sulfide` | shallow/hills | copper | iron | gold | melter | Starter copper sulfide route. |
| Tin Vein | `kubejs:deposit_blocks/tin` | hills/shallow | tin | quartz | tungsten | melter | Bronze support without steel-axis progression. |
| Zinc Vein | `kubejs:deposit_blocks/zinc` | hills | zinc | lead | cadmium | melter | Create brass support. |
| Lead-Zinc Vein | `kubejs:deposit_blocks/lead_zinc_vein` | underground | lead | zinc | silver | melter | Power/OC2R trace route. |
| Quartz Vein | `kubejs:deposit_blocks/quartz_vein` | hills/mountains | quartz | none | none | Create preprocess | Supports silicon/AE2 routing when confirmed by tags. |
| Bauxite Laterite | `kubejs:deposit_blocks/bauxite_laterite` | surface/hills | aluminum | iron | nickel | melter | Space alloy support. |

## Active Recipe Surface

- Furnace fallback remains intentionally poor through `kubejs/server_scripts/30_recipe_replace/50_badfurnace.js`.
- TCon melter and ore_melting recipes are generated in `kubejs/server_scripts/60_worldgen/10_r_ores_melted.js`.
- Foundry-style byproducts use TCon `ore_melting` byproducts where molten outputs exist.
- Acid Vat remains the planned dissolver-parity layer; Alchemistry is retained only as reference/compat data.
