# Realistic Ores Product Identity Audit

Date: 2026-05-13

## Source Audit

Current Realistic Ores worldgen in `/home/gerald/mcmods/realistic-ores` uses these high-value terrain bands:

| Deposit | Current band | Existing issue |
|---|---:|---|
| Bauxite Laterite | y 253..512 | Mountain/top-only, but mostly just aluminum bulk. |
| Emerald Schist Beryl | y 109..224 | High terrain, but output read as emerald plus generic beryllium. |
| Corundum Beryl Gem Vein | y 166..339 | Great-mountain terrain, but output read as amethyst/aluminum. |
| Kimberlite Pipe | y -64..80 | Deep/deepslate diamond source, but output was mostly carbon plus small diamond chance. |
| Tin Tungsten Greisen | y -35..109 | Deep hard-metal source, but output was tin/tungsten dust without a strong recipe identity. |
| Titanium Iron Oxide | y -64..80 | Lava-depth/deep source, but output had no unique pack-owned product. |
| Soul-Bearing Black Shale | y -64..51 | Dangerous deep source, but output was generic carbon/soul sand. |
| Cupriferous Redbed Redstone | y -35..80 | Deep signal source, but output was generic redstone/copper. |
| Lazurite Vein | y -6..138 | Deep logic pigment source, but output was generic lapis. |
| Uranium/Thorium | registered blocks/tags, no current placed features | Existing recipes could spend uranium/thorium plates without a Realistic Ores worldgen source. |

## Implemented Product Identities

Added pack-owned products from hard deposits:

- `kubejs:mountain_beryl_lens`: mountain beryl/emerald optics for Ars source mastery.
- `kubejs:corundum_lapping_grit`: great-mountain corundum abrasive for precision gem/source work.
- `kubejs:kimberlite_diamond_seed`: deep diamond seed for impossible circuits.
- `kubejs:tungsten_carbide_insert`: deep hard-metal insert for high-force ore work.
- `kubejs:titanium_thermal_plate`: lava-depth thermal plate for space and heat-managed machines.
- `kubejs:fissile_salt_blend`: uranium/thorium fuel identity for fission.
- `kubejs:soulstone_carbon_matrix`: deep soul-carbon matrix for Blood Magic binding.
- `kubejs:redbed_signal_salt`: deep redstone/copper signal salt for impossible circuits.
- `kubejs:lazurite_logic_pigment`: deep lapis/silicon pigment for later circuit work.
- `kubejs:phosphate_flux`: high-surface phosphate flux for ore and aluminum-side processing.
- `kubejs:platinum_group_residue`: nickel-sulfide noble residue for deep utility reward gates.

## Recipe Rework

- Create splashing now exposes these products directly as deposit identity outputs.
- Create mixing adds deliberate concentrate routes using crushed deposits and grinding balls.
- Space Machine Casing now spends `kubejs:titanium_thermal_plate`.
- Fission fuel acceptor and reactor rod now spend `kubejs:fissile_salt_blend`.
- Tome of Blood capstone parts now spend:
  - `kubejs:mountain_beryl_lens`
  - `kubejs:corundum_lapping_grit`
  - `kubejs:kimberlite_diamond_seed`
  - `kubejs:redbed_signal_salt`
  - `kubejs:soulstone_carbon_matrix`
- Extreme Y-band reward recipes now prefer Realistic Ores-derived products instead of abstract platinum-group/lava-depth plates where current worldgen did not back them cleanly.

## Worldgen Correction

Added `datapacks/realistic_ores_lava_depths`:

- `realisticores:deepslate_uranium_ore` now generates in the Overworld y -64..8, buried only.
- `realisticores:deepslate_thorium_ore` now generates in the Overworld y -64..8, buried only.
- Both use low count and full air-exposure discard so they behave as dangerous lava-depth finds, not surface cave loot.

## Validation

- `packwiz refresh` completed and indexed the new datapack, KubeJS assets, and recipe script.
- `node --check` passed for all KubeJS client, server, and startup scripts.
- JSON parsing passed for KubeJS asset JSON and `datapacks/realistic_ores_lava_depths` JSON.
- `git diff --check` passed.
- Grep check confirmed the updated extreme Y-band and fission gates no longer spend unbacked platinum-group/thorium plate items in those two critical recipe surfaces.

Runtime recipe dump and worldgen probe remain pending.
