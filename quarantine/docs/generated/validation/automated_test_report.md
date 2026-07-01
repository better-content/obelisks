# Automated Pack Test Report

Generated: 2026-06-30T12:09:21.022064983Z

Repo: `/home/dev/workspace`

Instance: `/tmp/btm-mod-coverage-smoke`

Validation profile: `runtime-only`

Runtime evidence mode: `strict`

Data dump evidence mode: `opportunistic`

## Result
| Class         | Count |
| ------------- | ----- |
| Passes        | 8     |
| Hard failures | 0     |
| Soft findings | 1     |
| Skipped       | 2     |
## Hard Failures
| Test | Detail |
| ---- | ------ |
## Soft Findings
| Rank   | Test                                                                   | Detail             |
| ------ | ---------------------------------------------------------------------- | ------------------ |
| SHOULD | performance budget exceeded: engine and world performance log analysis | 477.48 ms > 250 ms |
## Passes
| Test                                    | Detail               |
| --------------------------------------- | -------------------- |
| progression catalog parses              | 10 tiers             |
| latest engine log is recent             | 0.03 minutes old     |
| engine reached dedicated server startup |                      |
| world became playable/servable          |                      |
| spawn preparation budget                | 25318 ms <= 60000 ms |
| server tick-behind budget               | 0 warnings, max 0 ms |
| world save budget                       | 1010 ms <= 10000 ms  |
| hard engine log failure scan            |                      |
## Skipped
| Test                                        | Detail                                                  |
| ------------------------------------------- | ------------------------------------------------------- |
| source contract validation profile          | runtime-only mode skips repo-wide source validators     |
| source asset and tooling validation profile | runtime-only mode skips repo-wide asset/tool validators |
## Metrics

```json
{"engineWorld":{"latestLog":"/tmp/btm-mod-coverage-smoke/logs/latest.log", "latestLogAgeMinutes":0.03, "latestLogLines":22959, "reachedIntegratedServer":false, "reachedDedicatedServer":true, "startedServingLan":false, "reachedInGame":true, "spawnPrepTimeMs":25318, "serverTickBehindWarnings":0, "maxTickBehindMs":0, "distantHorizonsIncompleteTasks":0, "emiTotalReloadMs":null, "kubejsRecipeParseErrors":0, "kubejsFailedRecipeCount":0, "newestCrashReport":null, "newestCrashReportAfterLatestLog":false, "hardLogScanOk":true, "hardLogScan":"ok - hard log failure scan (/tmp/btm-mod-coverage-smoke/logs/latest.log)"}, "performance":{"budgetsMs":{"JSON and JS syntax validation":8000, "critical progression surfaces":750, "pack contract validation":1000, "contract completeness classification":1000, "autonomous contract validation":1500, "quest book validation":250, "Wares and villager trade validation":250, "repo loot data validation":500, "generated recipe graph validation":5000, "generated loot dump validation":2500, "engine and world performance log analysis":250, "Realistic Hands validation":2000, "KubeJS asset validation":2000, "chemistry identity validation":1500, "dev dump health validation":50}, "hardLimitsMs":{"JSON and JS syntax validation":24000, "critical progression surfaces":3000, "pack contract validation":5000, "contract completeness classification":5000, "autonomous contract validation":6000, "quest book validation":1500, "Wares and villager trade validation":1500, "repo loot data validation":3000, "generated recipe graph validation":20000, "generated loot dump validation":10000, "engine and world performance log analysis":1500, "Realistic Hands validation":4000, "KubeJS asset validation":4000, "chemistry identity validation":4000, "dev dump health validation":500}, "results":[{"name":"engine and world performance log analysis", "durationMs":477.48, "budgetMs":250, "hardLimitMs":1500}]}}
```
