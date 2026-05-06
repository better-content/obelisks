# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_proposed_content_baseline_20260506`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| proposed_content_baseline | PASS | 118 | 9014.7 | 0.0 | 2699.8 | 4350.0 | 16384x8192x4 | 7657 | client_joined_server |
