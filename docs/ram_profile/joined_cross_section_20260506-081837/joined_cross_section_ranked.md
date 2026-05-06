# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_20260506-081837`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| baseline | PASS | 0 | 13245.3 | 0.0 | 4542.7 | 6172.9 | 16384x16384x4 | 11713 | client_joined_server |
| no_emi_jei_recipe_index | FAIL | 16 |  |  |  |  | 1024x512x4 |  | client_fatal_log_signature |
| no_tcon_addon_layer | PASS | 16 | 13138.9 | 106.4 | 3903.4 | 5397.5 | 16384x16384x4 | 10373 | client_joined_server |
| no_create_addons | PASS | 50 | 12778.6 | 466.7 | 4209.4 | 5829.3 | 16384x16384x4 | 10231 | client_joined_server |
| no_biome_worldgen_dims | PASS | 48 | 14287.0 | -1041.7 | 3903.9 | 6329.2 | 16384x16384x4 | 11334 | client_joined_server |
| no_food_farming | PASS | 38 | 11444.1 | 1801.2 | 2793.2 | 3431.6 | 16384x16384x4 |  | client_joined_server |
| no_magic_adventure_mobs | PASS | 48 | 11710.2 | 1535.1 | 3965.4 | 5371.4 | 16384x16384x4 | 8837 | client_joined_server |
| no_emi_only | PASS | 4 | 14488.4 | -1243.1 | 4079.9 | 6703.8 | 16384x16384x4 |  | client_joined_server |
| no_jei_only | PASS | 4 | 13181.3 | 64.0 | 4022.1 | 6048.9 | 16384x16384x4 | 10959 | client_joined_server |
| no_fiahi | PASS | 2 | 13346.8 | -101.5 | 4166.9 | 5938.5 | 16384x16384x4 | 10955 | client_joined_server |
| no_coldsweat_fiahi | PASS | 6 | 11283.0 | 1962.3 | 4067.1 | 5365.5 | 16384x16384x4 | 10516 | client_joined_server |
| no_quark_supplementaries | PASS | 8 | 12346.6 | 898.7 | 4387.0 | 5626.8 | 16384x16384x4 | 10528 | client_joined_server |
| no_natures_spirit_family | PASS | 6 | 14023.0 | -777.7 | 2834.3 | 3469.9 | 16384x16384x4 |  | client_joined_server |
| no_dynamic_trees_family | PASS | 12 | 14498.8 | -1253.5 | 4507.1 | 6547.3 | 16384x16384x4 | 10579 | client_joined_server |
| no_placebo_apotheosis_stack | PASS | 12 | 14298.6 | -1053.3 | 4496.0 | 5311.1 | 16384x16384x4 | 10780 | client_joined_server |
| no_create_new_age_stack | PASS | 14 | 13430.1 | -184.8 | 4576.1 | 6079.1 | 16384x16384x4 | 11423 | client_joined_server |
