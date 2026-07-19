# Automated Pack Test Report

Generated: 2026-07-19T13:10:49.827993681Z

Repo: `/home/dev/workspace`

Instance: `/home/dev/.cache/bc/dimension-worldgen/prepared/server`

Validation profile: `runtime-only`

Runtime evidence mode: `strict`

Data dump evidence mode: `opportunistic`

## Result
| Class         | Count |
| ------------- | ----- |
| Passes        | 19    |
| Hard failures | 0     |
| Soft findings | 0     |
| Skipped       | 2     |
## Hard Failures
| Test | Detail |
| ---- | ------ |
## Soft Findings
| Rank | Test | Detail |
| ---- | ---- | ------ |
## Passes
| Test                                                                | Detail                                  |
| ------------------------------------------------------------------- | --------------------------------------- |
| progression catalog parses                                          | 10 tiers                                |
| runtime risky core tags have item-tag counterparts                  | 10 tags with runtime item-tag consumers |
| runtime risky core tag block/item membership stays aligned          |                                         |
| owned risky core tags use delta ownership                           |                                         |
| representative authored generic core-tag consumers remain in source |                                         |
| representative runtime generic core-tag consumers remain present    |                                         |
| crafting table recipe keeps generic plank ingredient                |                                         |
| runtime minecraft:planks item tag keeps vanilla and mahogany planks | 131 values                              |
| generic wood storage fallback routes remain registered              |                                         |
| representative wood-specific recipes remain specialized             |                                         |
| performance budget: runtime core tag regression validation          | 524.05 ms <= 1500 ms                    |
| latest engine log is recent                                         | 0.06 minutes old                        |
| engine reached dedicated server startup                             |                                         |
| world became playable/servable                                      |                                         |
| spawn preparation budget                                            | 30465 ms <= 60000 ms                    |
| server tick-behind budget                                           | 0 warnings, max 0 ms                    |
| world save budget                                                   | 1397 ms <= 10000 ms                     |
| hard engine log failure scan                                        |                                         |
| performance budget: engine and world performance log analysis       | 607.15 ms <= 750 ms                     |
## Skipped
| Test                                        | Detail                                                  |
| ------------------------------------------- | ------------------------------------------------------- |
| source contract validation profile          | runtime-only mode skips repo-wide source validators     |
| source asset and tooling validation profile | runtime-only mode skips repo-wide asset/tool validators |
## Metrics

```json
{"runtimeCoreTagRecipeGraph":{"path":"/home/dev/.cache/bc/dimension-worldgen/prepared/server/generated/runtime-dumps/recipes.json", "sizeBytes":26706197}, "runtimeCoreTagConsumers":{"logs":41, "logs_that_burn":1, "wooden_buttons":5, "wooden_slabs":78, "wooden_doors":6, "wooden_pressure_plates":6, "wooden_stairs":3, "wooden_trapdoors":3, "fence_gates":1, "wooden_fences":6}, "engineWorld":{"latestLog":"/home/dev/.cache/bc/dimension-worldgen/prepared/server/logs/latest.log", "latestLogAgeMinutes":0.06, "latestLogLines":24116, "reachedIntegratedServer":false, "reachedDedicatedServer":true, "startedServingLan":false, "reachedInGame":true, "spawnPrepTimeMs":30465, "serverTickBehindWarnings":0, "maxTickBehindMs":0, "distantHorizonsIncompleteTasks":0, "emiTotalReloadMs":null, "kubejsRecipeParseErrors":0, "kubejsFailedRecipeCount":0, "newestCrashReport":null, "newestCrashReportAfterLatestLog":false, "hardLogScanOk":true, "hardLogScan":"ok - hard log failure scan (/home/dev/.cache/bc/dimension-worldgen/prepared/server/logs/latest.log)"}, "performance":{"budgetsMs":{"JSON and JS syntax validation":8000, "critical progression surfaces":750, "progression parenting and economy validation":2500, "pack contract validation":1000, "contract completeness classification":1000, "autonomous contract validation":1500, "quest book validation":250, "Wares and villager trade validation":250, "repo loot data validation":500, "runtime core tag regression validation":1500, "generated recipe graph validation":5000, "generated loot dump validation":2500, "engine and world performance log analysis":750, "Realistic Hands validation":2000, "KubeJS asset validation":2000, "chemistry identity validation":1500, "dev dump health validation":50, "plank regression static validation":250}, "hardLimitsMs":{"JSON and JS syntax validation":24000, "critical progression surfaces":3000, "progression parenting and economy validation":10000, "pack contract validation":5000, "contract completeness classification":5000, "autonomous contract validation":6000, "quest book validation":1500, "Wares and villager trade validation":1500, "repo loot data validation":3000, "runtime core tag regression validation":6000, "generated recipe graph validation":20000, "generated loot dump validation":10000, "engine and world performance log analysis":1500, "Realistic Hands validation":5000, "KubeJS asset validation":5000, "chemistry identity validation":4000, "dev dump health validation":500, "plank regression static validation":1500}, "results":[{"name":"runtime core tag regression validation", "durationMs":524.05, "budgetMs":1500, "hardLimitMs":6000}, {"name":"engine and world performance log analysis", "durationMs":607.15, "budgetMs":750, "hardLimitMs":1500}]}}
```
