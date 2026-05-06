# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_20260506-090319`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| baseline | PASS | 0 | 14360.8 | 0.0 | 4599.9 | 5568.6 | 16384x16384x4 | 10488 | client_joined_server |
| no_coldsweat_only | FAIL | 4 |  |  |  |  |  |  | server_fail |
| no_farmers_delight_stack | PASS | 28 | 13056.2 | 1304.6 | 4418.5 | 5790.9 | 16384x16384x4 | 9959 | client_joined_server |
| no_body_needs_stack | PASS | 10 | 14402.1 | -41.3 | 4561.5 | 5968.1 | 16384x16384x4 | 11205 | client_joined_server |
| no_ars_blood_malum_stack | PASS | 16 | 12348.9 | 2011.9 | 4328.2 | 5804.7 | 16384x16384x4 | 11181 | client_joined_server |
| no_botania_only | PASS | 2 | 13078.8 | 1282.0 | 4491.3 | 6118.1 | 16384x16384x4 | 10725 | client_joined_server |
| no_adventure_mob_stack | FAIL | 16 |  |  |  |  |  |  | server_fail |
| no_top_visuals | PASS | 14 | 13784.8 | 576.0 | 3630.4 | 6622.0 | 16384x16384x4 | 8509 | client_joined_server |
