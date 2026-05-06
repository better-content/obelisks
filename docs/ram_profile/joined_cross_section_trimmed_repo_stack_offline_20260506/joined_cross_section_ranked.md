# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_trimmed_repo_stack_offline_20260506`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| trimmed_repo_stack | PASS | 131 | 10407.6 | 0.0 | 4084.1 | 5177.3 | 16384x8192x4 |  | client_joined_server |
