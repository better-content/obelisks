# Automated Pack Test Report

Generated: 2026-05-05T07:12:11.305Z

Repo: `/home/gerald/obelisks`

Instance: `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft`

## Result

| Class         | Count |
| ------------- | ----- |
| Passes        | 55    |
| Hard failures | 1     |
| Soft findings | 3     |
| Skipped       | 1     |

## Hard Failures

| Test                                     | Detail             |
| ---------------------------------------- | ------------------ |
| engine reached integrated server startup | missing log marker |

## Soft Findings

| Rank   | Test                                                     | Detail                                                                                                                              |
| ------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| MUST   | generated recipe graph is older than repo recipe scripts | 122_pneumaticcraft_create_pressing_gates.js is newer than live recipe dump; reload the instance to refresh full_recipe_index_*.json |
| MUST   | spawn preparation time is measurable                     | missing "Time elapsed" marker                                                                                                       |
| SHOULD | world save duration is measurable                        | missing shutdown save markers                                                                                                       |

## Passes

| Test                                                                | Detail                   |
| ------------------------------------------------------------------- | ------------------------ |
| progression catalog parses                                          | 10 tiers                 |
| all repo JSON parses                                                | 119 files                |
| all KubeJS/tool JS parses with node --check                         | 85 files                 |
| performance budget: JSON and JS syntax validation                   | 3918.7 ms <= 8000 ms     |
| critical expert-pack surfaces exist                                 | 19 files                 |
| machine casing IDs are referenced                                   | 8 casings                |
| AE2 machine casing does not consume AE2 controller                  |                          |
| TiCEX Reconstruction Core is hard-gated post-AE2                    |                          |
| Protection Pixel is hard-gated as post-AE2 armor                    |                          |
| Advanced AE quantum armor is displaced by Protection Pixel          |                          |
| Tome of Blood is hard-gated as post-AE2 hybrid magic                |                          |
| Tome of Blood is no longer gated as an Altar III side mod           |                          |
| Hooks and Create SA drones are tier-gated                           |                          |
| High-impact backpack upgrades are post-AE2                          |                          |
| Quarantined machines/upgrades are removed and hidden                |                          |
| Fallout Wastelands portal is gated by Creating Space                |                          |
| Twilight Forest portal is advancement-locked by Creating Space      |                          |
| Creating Space access advancement has a concrete space item trigger |                          |
| performance budget: critical progression surfaces                   | 3.89 ms <= 750 ms        |
| all chapters are assigned to existing chapter groups                | 56 chapters              |
| chapter titles do not duplicate chapter group labels                |                          |
| quest dependencies resolve                                          | 650 refs                 |
| quest nodes expose stable recipe hooks                              |                          |
| Starting Out rewards exactly 4 copper per quest                     | 20 quests                |
| non-Starting quest coin rewards use 4-count tier packets            |                          |
| quest book covers major progression nodes                           | 30 anchors               |
| Food chapter exposes food showcase coverage                         | 9 representative foods   |
| TCon chapter exposes weapon and tool showcase coverage              | 6 representative tools   |
| TCon showcase tasks ignore NBT                                      |                          |
| performance budget: quest book validation                           | 10.3 ms <= 250 ms        |
| Wares contracts do not use emerald currency                         | 17 tables                |
| Wares contracts contain dotcoin currency                            | 17 tables                |
| villager trade script covers broad profession set                   | 13 professions           |
| villager trade script has no emerald currency                       |                          |
| sell-trade helper pays copper coins instead of emeralds             |                          |
| performance budget: Wares and villager trade validation             | 0.66 ms <= 250 ms        |
| repo loot table JSON parses                                         | 95 tables                |
| repo loot tables inject many coin sources                           | 32 tables                |
| repo loot tables contain no direct emerald loot                     |                          |
| repo loot tables contain no obvious high-power outputs              |                          |
| performance budget: repo loot data validation                       | 1.68 ms <= 500 ms        |
| performance budget: generated recipe graph validation               | 25.74 ms <= 5000 ms      |
| performance budget: generated loot dump validation                  | 0.13 ms <= 2500 ms       |
| latest engine log is recent                                         | 14.09 minutes old        |
| world became playable/servable                                      | ModernFix in-game marker |
| server tick-behind budget                                           | 0 warnings, max 0 ms     |
| dimension save fanout                                               | 0 dimensions             |
| Distant Horizons shutdown backlog                                   | 0 incomplete tasks       |
| EMI reload budget                                                   | 12314 ms <= 90000 ms     |
| no newer crash report than latest engine log                        |                          |
| performance budget: engine and world performance log analysis       | 17.41 ms <= 250 ms       |
| dev dump script emits expected artifacts                            |                          |
| dev food effect dump script emits expected artifacts                |                          |
| food effect graph analyzer emits expected artifacts                 |                          |
| performance budget: dev dump health validation                      | 0.2 ms <= 50 ms          |

## Skipped

| Test                      | Detail                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| generated loot dump tests | missing /home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/dump/data_raw/loot_tables |

## Metrics

```json
{
  "questChapters": 56,
  "villagerProfessionsCovered": 13,
  "engineWorld": {
    "latestLog": "/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/logs/latest.log",
    "latestLogAgeMinutes": 14.09,
    "latestLogLines": 19530,
    "reachedIntegratedServer": false,
    "startedServingLan": false,
    "reachedInGame": true,
    "mainMenuToInGameMs": 16551,
    "totalLoadToWorldMs": 65403,
    "spawnPrepTimeMs": null,
    "serverTickBehindWarnings": 0,
    "maxTickBehindMs": 0,
    "totalTickBehindMs": 0,
    "maxTickBehindTicks": 0,
    "worldSaveDurationMs": null,
    "worldSaveFromSavingWorldsMs": null,
    "dimensionSaveCount": 0,
    "distantHorizonsIncompleteTasks": 0,
    "settlementRoadsRebuilds": 0,
    "settlementRoadsMaxDiscoveredStructures": 0,
    "settlementRoadsMaxConnections": 0,
    "emiTotalReloadMs": 12314,
    "emiSlowestPluginMs": 1368,
    "emiSlowestPlugin": "jemi",
    "newestCrashReport": null,
    "newestCrashReportAfterLatestLog": false
  },
  "performance": {
    "budgetsMs": {
      "JSON and JS syntax validation": 8000,
      "critical progression surfaces": 750,
      "quest book validation": 250,
      "Wares and villager trade validation": 250,
      "repo loot data validation": 500,
      "generated recipe graph validation": 5000,
      "generated loot dump validation": 2500,
      "engine and world performance log analysis": 250,
      "dev dump health validation": 50
    },
    "hardLimitsMs": {
      "JSON and JS syntax validation": 24000,
      "critical progression surfaces": 3000,
      "quest book validation": 1500,
      "Wares and villager trade validation": 1500,
      "repo loot data validation": 3000,
      "generated recipe graph validation": 20000,
      "generated loot dump validation": 10000,
      "engine and world performance log analysis": 1500,
      "dev dump health validation": 500
    },
    "results": [
      {
        "name": "JSON and JS syntax validation",
        "durationMs": 3918.7,
        "budgetMs": 8000,
        "hardLimitMs": 24000
      },
      {
        "name": "critical progression surfaces",
        "durationMs": 3.89,
        "budgetMs": 750,
        "hardLimitMs": 3000
      },
      {
        "name": "quest book validation",
        "durationMs": 10.3,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "Wares and villager trade validation",
        "durationMs": 0.66,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "repo loot data validation",
        "durationMs": 1.68,
        "budgetMs": 500,
        "hardLimitMs": 3000
      },
      {
        "name": "generated recipe graph validation",
        "durationMs": 25.74,
        "budgetMs": 5000,
        "hardLimitMs": 20000
      },
      {
        "name": "generated loot dump validation",
        "durationMs": 0.13,
        "budgetMs": 2500,
        "hardLimitMs": 10000
      },
      {
        "name": "engine and world performance log analysis",
        "durationMs": 17.41,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "dev dump health validation",
        "durationMs": 0.2,
        "budgetMs": 50,
        "hardLimitMs": 500
      }
    ]
  }
}
```
