# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_reduced_ars_tome_20260506`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| reduced_baseline_top4 | PASS | 8 | 10064.9 | 0.0 | 3290.6 | 4296.3 | 16384x16384x4 | 9302 | client_joined_server |
| reduced_no_ars_tome | PASS | 14 | 9460.1 | 604.8 | 3221.4 | 4266.1 | 16384x16384x4 | 8543 | client_joined_server |
