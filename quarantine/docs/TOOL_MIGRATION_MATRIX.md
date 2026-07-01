# Tool Migration Matrix

This matrix classifies the current tool surface after quarantining the original shell and Python files.

## `public`

- `tools/btm`
- `tools/btm.main.kts`

## `internal-kotlin`

- `tools/btm.main.kts`

## `temporary-js-internal`

- `tools/audit_cross_magic_spellcraft.mjs`
- `tools/audit_indirect_casing_economy.mjs`
- `tools/audit_realistic_hands.mjs`
- `tools/audit_starting_item_economy.mjs`
- `tools/burnt_coverage_block_tag_exclusions.json`
- `tools/expert_graph_audit.mjs`
- `tools/lib/realistic_hands_policy.mjs`
- `tools/pack_contract.json`
- `tools/realistic_hands_exemptions.json`

## `quarantined-pruned`

- `tools/quarantine/pruned-non-kts/compat-shims/contract_completeness_report.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/log_hard_failure_scan.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/minecraft_client_argfile.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/pack_test_suite.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/prune_runtime_mods.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/resolve_packwiz_downloads.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/sync_burnt_coverage_tags.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_autonomous_contracts.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_burnt_coverage.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_chemistry_identity.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_kubejs_assets.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_pack_contract.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_player_progression_contracts.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_progression_reachability.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_realistic_hands.mjs`
- `tools/quarantine/pruned-non-kts/compat-shims/validate_synthesis_pipeline.mjs`
- `tools/quarantine/pruned-non-kts/analyze_class_histogram.mjs`
- `tools/quarantine/pruned-non-kts/analyze_food_effect_graph.mjs`
- `tools/quarantine/pruned-non-kts/apply_quest_dependencies.mjs`
- `tools/quarantine/pruned-non-kts/audit_synthesis_pipeline_completeness.mjs`
- `tools/quarantine/pruned-non-kts/engine_world_log_metrics.mjs`
- `tools/quarantine/pruned-non-kts/generate_alchemistry_dissolver_port.mjs`
- `tools/quarantine/pruned-non-kts/generate_expert_quest_book.mjs`
- `tools/quarantine/pruned-non-kts/generate_rbp_pack_solid_blocks.mjs`
- `tools/quarantine/pruned-non-kts/packsite/__init__.py`
- `tools/quarantine/pruned-non-kts/packsite/build.py`
- `tools/quarantine/pruned-non-kts/packsite/icons.py`
- `tools/quarantine/pruned-non-kts/packsite/site_model.py`
- `tools/quarantine/pruned-non-kts/packsite/validation.py`
- `tools/quarantine/pruned-non-kts/plan_food_effect_pass.mjs`
- `tools/quarantine/pruned-non-kts/questgraph/__init__.py`
- `tools/quarantine/pruned-non-kts/questgraph/export_ftbquests.py`
- `tools/quarantine/pruned-non-kts/questgraph/model.py`
- `tools/quarantine/pruned-non-kts/questgraph/simple_yaml.py`
- `tools/quarantine/pruned-non-kts/questgraph/validate.py`
- `tools/quarantine/pruned-non-kts/recipegraph/__init__.py`
- `tools/quarantine/pruned-non-kts/recipegraph/import_legacy_full_index.py`
- `tools/quarantine/pruned-non-kts/recipegraph/normalize.py`
- `tools/quarantine/pruned-non-kts/recipegraph/policies.py`
- `tools/quarantine/pruned-non-kts/recipegraph/render_site.py`
- `tools/quarantine/pruned-non-kts/recipegraph/validate.py`
- `tools/quarantine/pruned-non-kts/validate_quest_dependencies.mjs`

## `quarantined-original`

- `tools/quarantine/original-tools/_runtime_common.sh`
- `tools/quarantine/original-tools/agent_validate.sh`
- `tools/quarantine/original-tools/bootstrap_client_runtime.sh`
- `tools/quarantine/original-tools/bootstrap_server.sh`
- `tools/quarantine/original-tools/c2me_feature_matrix.py`
- `tools/quarantine/original-tools/client_join_probe.sh`
- `tools/quarantine/original-tools/client_join_probe_direct.sh`
- `tools/quarantine/original-tools/cluster_memory_ab_menu.sh`
- `tools/quarantine/original-tools/cluster_memory_cross_section.py`
- `tools/quarantine/original-tools/content_memory_inventory.py`
- `tools/quarantine/original-tools/dimension_worldgen_stress.py`
- `tools/quarantine/original-tools/disable_thp_exec.py`
- `tools/quarantine/original-tools/export_modpack_bundles.sh`
- `tools/quarantine/original-tools/forest_tree_audit.py`
- `tools/quarantine/original-tools/half_mod_split_probe.py`
- `tools/quarantine/original-tools/joined_memory_cross_section.py`
- `tools/quarantine/original-tools/launch_client_direct.sh`
- `tools/quarantine/original-tools/launch_prism_instance.sh`
- `tools/quarantine/original-tools/launch_server_direct.sh`
- `tools/quarantine/original-tools/lc_tfth_c2me_dh_stability.py`
- `tools/quarantine/original-tools/legacy_live_tool_guard.py`
- `tools/quarantine/original-tools/legacy_live_tool_guard.sh`
- `tools/quarantine/original-tools/make_reduced_memory_phases.py`
- `tools/quarantine/original-tools/mod_memory_cross_section.sh`
- `tools/quarantine/original-tools/move_unkept_mods.py`
- `tools/quarantine/original-tools/pack_mod_source.py`
- `tools/quarantine/original-tools/portable_minecraft_harness.py`
- `tools/quarantine/original-tools/profile_prism_variant.sh`
- `tools/quarantine/original-tools/profile_server_client_ab.sh`
- `tools/quarantine/original-tools/run_best_jvm_tps_probe.py`
- `tools/quarantine/original-tools/run_jvm_arg_experiments.py`
- `tools/quarantine/original-tools/server_content_smoke.sh`
- `tools/quarantine/original-tools/server_worldgen_harness.sh`
- `tools/quarantine/original-tools/six_cluster_cascade_ab.py`
- `tools/quarantine/original-tools/six_cluster_memory_ab.py`
- `tools/quarantine/original-tools/sync_to_client.sh`
- `tools/quarantine/original-tools/sync_to_server.sh`
- `tools/quarantine/original-tools/test_agent_validate_surfaces.sh`

## Notes

- There are no active top-level `.py` or `.sh` files left under `tools/`.
- Supported `btm test`, `btm build`, and `btm doctor` flows now route through Kotlin in `tools/btm.main.kts`.
- Supported static/runtime/smoke validation no longer depends on Node; remaining `.mjs` files are internal audits or compatibility shims that still need direct Kotlin replacements.
- Thin Node wrappers that only forward into `tools/btm` or Kotlin scripts are quarantined and are no longer part of the active tool root.
- Hand-authored quests, pack-site generation, recipe/quest graph export, telemetry analytics, and one-off planning/generator scripts are quarantined rather than treated as supported migration targets.
- Quarantined originals remain for archival reference and fallback investigation. They are not the supported public workflow surface.
