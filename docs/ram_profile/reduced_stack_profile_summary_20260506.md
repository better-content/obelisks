# Reduced Stack Memory Profile - 2026-05-06

## Method

Ran the joined server/client profiler with a reduced baseline:

- disabled `ticex`
- disabled `Steam_Rails`
- disabled `Botania`
- disabled `chipped`

Then each tested phase disabled one additional mod or dependency-safe mini-family on top of that reduced baseline.

Every phase used:

- dedicated server from `server-instance`
- Prism quick-play client join
- post-join RSS capture
- post-join heap/metaspace/class histogram capture
- jar restore between phases

Output directory:

- `docs/ram_profile/joined_cross_section_reduced_stack_20260506/`

Phase matrix:

- `docs/ram_profile/reduced_stack_phase_matrix_20260506.json`

## Baseline

| Phase | RSS MiB | Heap Used MiB | Hist Total MiB |
| --- | ---: | ---: | ---: |
| `reduced_baseline_top4` | 9138.5 | 3090.1 | 2477.6 |
| `reduced_repeat_top4` | 9767.7 | 4495.2 | 3338.0 |

Same-run reduced baseline noise was about `629 MiB` RSS.

Treat small apparent wins inside that band as noise unless heap/histogram evidence also supports them.

## Main Result

The four-mod reduction is the real memory win.

Previous full-pack joined baselines were roughly `13245-14508 MiB` RSS. The reduced baseline is `9139-9768 MiB` RSS.

Approximate combined reduction from disabling:

- `ticex`
- `Steam_Rails`
- `Botania`
- `chipped`

is about `3.5-5.4 GiB`, depending which earlier full-pack baseline is used.

After those four were removed, no individually tested magic, food, custom, Create addon, or AE2 addon phase produced a credible further RSS reduction beyond baseline noise.

## Interpreted Findings

### Magic

| Phase | Result |
| --- | --- |
| `reduced_no_ars` | invalid; `tomeofblood` requires `ars_nouveau` |
| `reduced_no_bloodmagic` | passed, RSS `10407.7 MiB`; not a saving |
| `reduced_no_malum` | passed, RSS `10426.2 MiB`; not a saving |
| `reduced_no_occultism` | passed, RSS `9858.7 MiB`; baseline/noise |

The earlier Ars/Blood/Malum/Occultism stack result does not decompose into Blood, Malum, or Occultism as independent retained-RSS wins after top-four reduction.

### Quark / Supplementaries / Amendments

| Phase | Result |
| --- | --- |
| `reduced_no_quark` | passed, RSS `11386.7 MiB`; not a saving |
| `reduced_no_supplementaries` | passed, RSS `9592.7 MiB`; baseline/noise |
| `reduced_no_amendments` | passed, RSS `11728.0 MiB`; not a saving |

No independent memory target here.

### Food / Farming

| Phase | Result |
| --- | --- |
| `reduced_no_farmers_delight` | invalid; direct addons require Farmer's Delight |
| `reduced_no_brewin_and_chewin` | invalid/client fatal; missing datapack/registry references |
| individual Delight addons | mostly passed, baseline/noise or higher RSS |
| body needs mods | passed, baseline/noise or higher RSS |

The earlier broad food/farming result appears to be a cluster/load-path/shared-content effect, not one standalone addon owning the retained memory.

### Custom Mods

| Phase | Result |
| --- | --- |
| `reduced_no_liquid_coolant` | invalid; Quark failed during load after removal |
| all other individual custom removals | passed, baseline/noise or higher RSS |

No custom mod individually explains the high retained RSS in this reduced matrix.

This does not clear custom mods of non-memory bugs. It only says individual removal did not reduce post-join RSS after the top-four reduction.

### Create Addons

| Phase | Result |
| --- | --- |
| `reduced_no_create_new_age` | invalid; `heatsync`, `acid_vat`, `liquid_coolant`, `gases_and_plasmas`, and `fission_reactor` require it |
| `reduced_no_create_applied_kinetics` | invalid/server crash; missing datapack plus later concurrent map class-cast failures |
| other individual Create addon removals | passed, baseline/noise or higher RSS |

No individual Create addon tested is a memory target in this reduced matrix.

### AE2 Addons

| Phase | Result |
| --- | --- |
| `reduced_no_mae2` | invalid/client fatal; missing datapack/registry references |
| other individual AE2 addon removals | passed, not a saving |

AE2 addons remain comparatively minor/noisy relative to the four dominant contributors.

## Failed Phase Causes

| Phase | Cause |
| --- | --- |
| `reduced_no_ars` | `tomeofblood` requires `ars_nouveau` |
| `reduced_no_farmers_delight` | many addons require `farmersdelight` |
| `reduced_no_brewin_and_chewin` | missing datapack `mod:brewinandchewin`; client fatal during join |
| `reduced_no_liquid_coolant` | server load failed with Quark load failure after removal |
| `reduced_no_create_new_age` | several custom mods require `create_new_age` |
| `reduced_no_create_applied_kinetics` | missing datapack `mod:createappliedkinetics`; server crash report created |
| `reduced_no_mae2` | missing datapack `mod:mae2`; client fatal during join |

## Conclusion

The memory target list should be narrowed to:

1. `TiCEX`
2. `Steam Rails`
3. `Botania`
4. `Chipped`

The next useful pass is not more individual removal of small addons. It is source/asset-level investigation of those four:

- item/model count
- baked model count
- texture atlas contribution
- EMI/JEI recipe/index contribution
- generated dynamic assets
- client-only caches
- server retained heap where applicable

Cold Sweat/FIAHI remains a separate CPU/stall integration problem, not the main retained-RSS result of this matrix.
