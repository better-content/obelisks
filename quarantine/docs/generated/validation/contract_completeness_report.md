# Contract Completeness Report

Generated: `2026-05-31T17:57:28.940Z`

Contract: `tools/pack_contract.json`

## Summary

| Metric                        | Count |
| ----------------------------- | ----- |
| Dimensions classified         | 12    |
| Strong proof dimensions       | 9     |
| Explicit weak/open dimensions | 3     |
| Open requirements             | 6     |
| Errors                        | 0     |
| Warnings                      | 0     |

## Status Counts

| Status             | Count |
| ------------------ | ----- |
| hard_checked       | 7     |
| marker_checked     | 1     |
| runtime_checked    | 2     |
| scenario_required  | 1     |
| telemetry_required | 1     |

## Dimension Matrix

| Dimension                        | Status             | Tiers      | Systems                              | Open requirements |
| -------------------------------- | ------------------ | ---------- | ------------------------------------ | ----------------- |
| source_integrity                 | hard_checked       | L0         | -                                    | 0                 |
| static_registry_assets           | hard_checked       | L1         | -                                    | 0                 |
| progression_recipe_graph         | runtime_checked    | L2, L3     | machine_casing_spine                 | 0                 |
| bounded_matter_geology_chemistry | hard_checked       | L1, L2     | bounded_matter_geology_chemistry     | 0                 |
| magic_body_survival              | hard_checked       | L2, L3     | magic_body_survival_spine            | 0                 |
| coin_villager_wares_economy      | hard_checked       | L2, L3     | coin_villager_wares_economy          | 0                 |
| adventure_dimensions_combat      | scenario_required  | L4         | adventure_dimensions_combat_pressure | 2                 |
| runtime_concurrency_performance  | runtime_checked    | L3, L4     | runtime_concurrency_performance      | 0                 |
| client_visibility_quests         | hard_checked       | L3, L4     | client_visibility_guidance           | 0                 |
| worldgen_statistics              | marker_checked     | L5         | worldgen_statistical_sampling        | 2                 |
| custom_mods                      | hard_checked       | L0, L1, L4 | -                                    | 0                 |
| playtest_telemetry_friction      | telemetry_required | L6         | playtest_telemetry_friction          | 2                 |

## Open Requirements

| Dimension                   | Status             | Requirement                                                                                                                  |
| --------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| adventure_dimensions_combat | scenario_required  | Run and retain fresh evidence for actual Creating Space travel UI and travel to Lost Cities.                                 |
| adventure_dimensions_combat | scenario_required  | Add long-run pillager campaign, settlement-roads, and village-walls generation scenarios.                                    |
| worldgen_statistics         | marker_checked     | Add deterministic seed sampling for deposits, Y-bands, villages, roads, walls, structures, forageables, and spawn viability. |
| worldgen_statistics         | marker_checked     | Define acceptable distance/depth distributions and fail outside confidence bounds.                                           |
| playtest_telemetry_friction | telemetry_required | Capture route telemetry for time-to-tier, deaths, lookup stalls, travel distance, recovery loops, and player confusion.      |
| playtest_telemetry_friction | telemetry_required | Define friction budgets per progression segment and compare playtest traces against them.                                    |

## Errors

| Error |
| ----- |

## Warnings

| Warning |
| ------- |

