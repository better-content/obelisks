# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_jvm_xmx6g_thp_off_string_dedup_20260506`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| trimmed_repo_stack | PASS | 131 | 10432.3 | 0.0 | 3690.1 | 4185.5 | 16384x8192x4 |  | client_joined_server |
