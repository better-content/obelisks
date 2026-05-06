# Joined RAM Cross-Section - 2026-05-06

Method:

- Every measured phase used a dedicated server plus a Prism quick-play client join.
- Each phase temporarily disabled matching jars in both the live Prism instance and `server-instance`.
- The runner waited after join, captured `/proc/*/smaps_rollup`, `jcmd GC.heap_info`, `jcmd VM.metaspace`, `jcmd GC.class_histogram`, copied logs, then restored jars.
- The block atlas stayed `16384x16384x4` for all successful joined runs; this is not the previous atlas-doubling failure mode.
- RSS varies substantially between baselines, so compare each phase primarily to the baseline from the same run directory.

Evidence directories:

- `docs/ram_profile/joined_cross_section_20260506-074908/`
- `docs/ram_profile/joined_cross_section_20260506-081837/`
- `docs/ram_profile/joined_cross_section_20260506-090319/`

Runner:

- `tools/joined_memory_cross_section.py`

## Baseline Range

| Run | Baseline RSS MiB | Notes |
| --- | ---: | --- |
| `20260506-074908` | 14507.5 | First full matrix |
| `20260506-074908` repeat | 14051.3 | Same matrix repeat |
| `20260506-081837` | 13245.3 | Dependency-safe broad matrix |
| `20260506-090319` | 14360.8 | Focused breakdown matrix |

Baseline noise/current-state drift is about 1.2 GiB across these runs. The most defensible results are repeated large deltas or deltas with clear supporting class/log evidence.

## Strongest Positive Deltas

| Slice removed | Run baseline | RSS MiB | Delta MiB | Evidence status |
| --- | ---: | ---: | ---: | --- |
| TiCEX only | 14507.5 | 12465.9 | 2041.6 | Strong |
| Ars/Blood/Malum/Occultism stack | 14360.8 | 12348.9 | 2011.9 | Strong |
| Cold Sweat + FIAHI | 13245.3 | 11283.0 | 1962.3 | Strong |
| Food/farming broad stack | 13245.3 | 11444.1 | 1801.2 | Strong, but EMI did not reload |
| Steam Rails only | 14507.5 | 12807.2 | 1700.3 | Strong |
| Distant Horizons only | 14507.5 | 12837.7 | 1669.8 | Strong diagnostic cost, not a shipping removal recommendation |
| Magic/adventure/mob broad stack | 13245.3 | 11710.2 | 1535.1 | Strong |
| Custom mods broad stack | 14507.5 | 12998.8 | 1508.7 | Strong, needs per-mod breakdown before action |
| Farmer's Delight + food addons | 14360.8 | 13056.2 | 1304.6 | Strong |
| Botania only | 14360.8 | 13078.8 | 1282.0 | Strong |
| Chipped only | 14507.5 | 13238.8 | 1268.7 | Strong |
| Quark/Supplementaries/Amendments | 13245.3 | 12346.6 | 898.7 | Moderate |
| Top visuals combined | 14360.8 | 13784.8 | 576.0 | Moderate, not additive |
| Create addons broad stack | 13245.3 | 12778.6 | 466.7 | Moderate |
| AE2 addons | 14507.5 | 14214.5 | 293.0 | Small |

## Not Current RAM Targets

| Slice removed | Result |
| --- | --- |
| Body-needs stack: Diet, Thirst Was Taken, Sol Carrot, AppleSkin, Cravings | Neutral: `14402.1 MiB` vs `14360.8 MiB` baseline |
| FIAHI alone | Neutral/slightly worse: `13346.8 MiB` vs `13245.3 MiB` baseline |
| JEI only | Small: `13181.3 MiB` vs `13245.3 MiB` baseline |
| EMI only | Worse RSS despite zero EMI stack histogram; use class-histogram evidence only |
| Nature's Spirit family | Worse RSS in joined snapshot |
| Dynamic Trees family | Worse RSS in joined snapshot |
| Placebo/Apotheosis/Fast* stack | Worse RSS in joined snapshot |
| Create New Age + dependent custom stack | Slightly worse RSS |
| Biome/worldgen/dimension broad stack | Worse RSS in joined snapshot, though histogram fell |

## Failure Notes

| Phase | Failure | Evidence |
| --- | --- | --- |
| `no_chipped_no_ticex` | Server watchdog after client join | Crash stack: FIAHI `tickContainer` -> Cold Sweat biome temperature -> C2ME chunk await |
| `no_emi_jei_recipe_index` | Client fatal after dependency-safe server boot | Removing both EMI and JEI is not a valid pack state |
| `no_coldsweat_only` | Server boot dependency fail | FIAHI requires Cold Sweat |
| `no_adventure_mob_stack` | Server boot dependency fail | Occultism requires SmartBrainLib |

The watchdog crash is important but not a Chipped/TiCEX-specific conclusion. It surfaced during that phase because post-join server tick timing crossed the watchdog threshold. The stack points at the Cold Sweat + FIAHI temperature/container integration under C2ME chunk waiting.

## Interpretation

Current RAM usage is not caused by a single mod. The joined-client budget is dominated by several independent buckets:

- Visual/model/content pressure: Chipped, Steam Rails, Distant Horizons, Quark/Supplementaries.
- Recipe/item graph pressure: TiCEX is the clearest single contributor; EMI/JEI metrics are noisy because removing one changes the other and full removal is not a valid client state.
- Large content systems: Farmer's Delight addons, Botania, and the Ars/Blood/Malum/Occultism stack.
- Runtime integration pressure: Cold Sweat + FIAHI is both a large RAM slice and implicated in a server watchdog path.
- Pack custom mods together are large enough to justify a per-custom-mod joined profile, but the broad `no_custom_mods` result is not actionable by itself.

## Recommended Next Tests

1. Per-custom-mod joined-client pass for `acid_vat`, `gases_and_plasmas`, `fission_reactor`, `heatsync`, `liquid_coolant`, `obelisks`, `settlementroads`, and `villagewalls`.
2. Per-food-addon pass under the Farmer's Delight stack, starting with `FarmersDelight`, `Delightful`, `BrewinAndChewin`, `farmersrespite`, `rusticdelight`, and `ends_delight`.
3. Per-magic pass for `ars_nouveau`, `bloodmagic`, `malum`, `occultism`, and `Botania`.
4. Investigate and patch or configure the Cold Sweat + FIAHI server tick path before treating C2ME as the root cause.
5. Re-run top single contributors with two baseline repeats if choosing removal/optimization targets, because observed baseline RSS noise is about 1.2 GiB.
