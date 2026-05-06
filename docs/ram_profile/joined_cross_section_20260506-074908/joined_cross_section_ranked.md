# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_20260506-074908`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| baseline | PASS | 0 | 14507.5 | 0.0 | 4546.8 | 6448.0 | 16384x16384x4 | 10819 | client_joined_server |
| baseline_repeat_2 | PASS | 0 | 14051.3 | 456.2 | 4568.3 | 7021.0 | 16384x16384x4 | 10812 | client_joined_server |
| no_chipped | PASS | 2 | 13238.8 | 1268.7 | 4163.1 | 4999.9 | 16384x16384x4 | 9512 | client_joined_server |
| no_ticex | PASS | 2 | 12465.9 | 2041.6 | 3961.3 | 6473.8 | 16384x16384x4 | 11951 | client_joined_server |
| no_chipped_no_ticex | FAIL | 4 |  |  |  |  | 16384x16384x4 |  | server_crash_report_created |
| no_emi_jei_recipe_index | FAIL | 14 |  |  |  |  |  |  | server_fail |
| no_distant_horizons | PASS | 2 | 12837.7 | 1669.8 | 4505.9 | 5991.4 | 16384x16384x4 | 10510 | client_joined_server |
| no_steam_rails | PASS | 2 | 12807.2 | 1700.3 | 4351.9 | 5512.1 | 16384x16384x4 | 10606 | client_joined_server |
| no_tcon_addon_layer | FAIL | 8 |  |  |  |  |  |  | server_fail |
| no_ae2_addons | PASS | 18 | 14214.5 | 293.0 | 4461.7 | 5393.1 | 16384x16384x4 | 12102 | client_joined_server |
| no_create_addons | FAIL | 40 |  |  |  |  |  |  | server_fail |
| no_biome_worldgen_dims | FAIL | 44 |  |  |  |  |  |  | server_fail |
| no_food_farming | FAIL | 34 |  |  |  |  |  |  | server_fail |
| no_magic_adventure_mobs | FAIL | 38 |  |  |  |  |  |  | server_fail |
| no_custom_mods | PASS | 36 | 12998.8 | 1508.7 | 3962.1 | 5874.1 | 16384x16384x4 | 11031 | client_joined_server |
