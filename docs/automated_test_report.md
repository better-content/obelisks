# Automated Pack Test Report

Generated: 2026-05-16T03:53:07.109Z

Repo: `/home/gerald/obelisks`

Instance: `/tmp/btm-content-smoke`

## Result

| Class         | Count |
| ------------- | ----- |
| Passes        | 60    |
| Hard failures | 0     |
| Soft findings | 0     |
| Skipped       | 7     |

## Hard Failures

| Test | Detail |
| ---- | ------ |

## Soft Findings

| Rank | Test | Detail |
| ---- | ---- | ------ |

## Passes

| Test                                                                    | Detail                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| progression catalog parses                                              | 12 tiers                                                                              |
| all repo JSON parses                                                    | 172 files                                                                             |
| all KubeJS/tool JS parses with node --check                             | 96 files                                                                              |
| performance budget: JSON and JS syntax validation                       | 4519.58 ms <= 8000 ms                                                                 |
| critical expert-pack surfaces exist                                     | 19 files                                                                              |
| retired Acid Vat deposit slurry script is absent                        |                                                                                       |
| server runtime mod pruner uses shared side-exclusion policy             |                                                                                       |
| server bootstrap prunes stale cached mods                               |                                                                                       |
| machine casing IDs are referenced                                       | 10 casings                                                                            |
| Raw Impossible casing does not consume AE2 controller                   |                                                                                       |
| TiCEX Reconstruction Core is hard-gated post-AE2                        |                                                                                       |
| Protection Pixel is hard-gated as post-AE2 armor                        |                                                                                       |
| Protection Pixel late armor is displaced into explicit post-AE2 recipes |                                                                                       |
| Tome of Blood is hard-gated as post-AE2 hybrid magic                    |                                                                                       |
| Tome of Blood is no longer gated as an Altar III side mod               |                                                                                       |
| Hooks and Create SA drones are tier-gated                               |                                                                                       |
| High-impact backpack upgrades are post-AE2                              |                                                                                       |
| Quarantined machines/upgrades are removed and hidden                    |                                                                                       |
| Fallout Wastelands portal is gated by Creating Space                    |                                                                                       |
| Twilight Forest portal is advancement-locked by Creating Space          |                                                                                       |
| Creating Space access advancement has a concrete space item trigger     |                                                                                       |
| performance budget: critical progression surfaces                       | 5.53 ms <= 750 ms                                                                     |
| quest book is intentionally empty                                       | 0 chapters and no chapter groups                                                      |
| performance budget: quest book validation                               | 0.35 ms <= 250 ms                                                                     |
| Wares contracts do not use emerald currency                             | 17 tables                                                                             |
| Wares contracts contain Create Deco coin currency                       | 17 tables                                                                             |
| villager trade script covers broad profession set                       | 13 professions                                                                        |
| villager trade script has no emerald currency                           |                                                                                       |
| sell-trade helper pays copper coins instead of emeralds                 |                                                                                       |
| performance budget: Wares and villager trade validation                 | 0.91 ms <= 250 ms                                                                     |
| repo loot table JSON parses                                             | 96 tables                                                                             |
| repo loot tables inject many coin sources                               | 32 tables                                                                             |
| repo loot tables contain no direct emerald loot                         |                                                                                       |
| repo loot tables contain no obvious high-power outputs                  |                                                                                       |
| performance budget: repo loot data validation                           | 1.9 ms <= 500 ms                                                                      |
| generated recipe chunks match manifest                                  | 26364 recipes                                                                         |
| generated recipes have unique IDs                                       |                                                                                       |
| generated recipe JSON parses                                            |                                                                                       |
| no forbidden creative/debug outputs are craftable                       |                                                                                       |
| performance budget: generated recipe graph validation                   | 155.17 ms <= 5000 ms                                                                  |
| performance budget: generated loot dump validation                      | 0.21 ms <= 2500 ms                                                                    |
| latest engine log is recent                                             | 0.09 minutes old                                                                      |
| engine reached dedicated server startup                                 |                                                                                       |
| world became playable/servable                                          | dedicated server Done marker                                                          |
| spawn preparation budget                                                | 22152 ms <= 60000 ms                                                                  |
| server tick-behind budget                                               | 0 warnings, max 0 ms                                                                  |
| world save budget                                                       | 649 ms <= 10000 ms                                                                    |
| dimension save fanout                                                   | 21 dimensions                                                                         |
| Distant Horizons shutdown backlog                                       | 0 incomplete tasks                                                                    |
| KubeJS recipe parse health                                              | 0 parse errors, 0 failed recipes                                                      |
| no newer crash report than latest engine log                            |                                                                                       |
| performance budget: engine and world performance log analysis           | 37.16 ms <= 250 ms                                                                    |
| KubeJS custom assets validate                                           | ok - kubejs assets validate (54 custom items, 10 casings, 16 crate tiers, 106 models) |
| performance budget: KubeJS asset validation                             | 62.01 ms <= 500 ms                                                                    |
| chemistry identity matrix validates                                     | ok - chemistry identity matrix validates                                              |
| performance budget: chemistry identity validation                       | 64.04 ms <= 500 ms                                                                    |
| dev dump script emits expected artifacts                                |                                                                                       |
| dev food effect dump script emits expected artifacts                    |                                                                                       |
| food effect graph analyzer emits expected artifacts                     |                                                                                       |
| performance budget: dev dump health validation                          | 0.24 ms <= 50 ms                                                                      |

## Skipped

| Test                                    | Detail                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| quest dependency validation             | quest book removed                                                                             |
| quest reward validation                 | quest book removed                                                                             |
| quest progression anchor validation     | quest book removed                                                                             |
| food and TCon quest showcase validation | quest book removed                                                                             |
| Alchemistry player-facing recipe check  | current KubeJS dump is a pre-mutation audit; disabled Alchemistry removals run after this dump |
| final effective recipe graph assertions | current KubeJS dump is a pre-mutation audit; it does not include kubejs-added recipe IDs       |
| generated loot dump tests               | missing /tmp/btm-content-smoke/dump/data_raw/loot_tables                                       |

## Metrics

```json
{
  "questChapters": 0,
  "villagerProfessionsCovered": 13,
  "generatedRecipes": 26364,
  "engineWorld": {
    "latestLog": "/tmp/btm-content-smoke/logs/latest.log",
    "latestLogAgeMinutes": 0.09,
    "latestLogLines": 16822,
    "reachedIntegratedServer": false,
    "reachedDedicatedServer": true,
    "startedServingLan": false,
    "reachedInGame": true,
    "mainMenuToInGameMs": null,
    "totalLoadToWorldMs": null,
    "spawnPrepTimeMs": 22152,
    "serverTickBehindWarnings": 0,
    "maxTickBehindMs": 0,
    "totalTickBehindMs": 0,
    "maxTickBehindTicks": 0,
    "worldSaveDurationMs": 649,
    "worldSaveFromSavingWorldsMs": 648,
    "dimensionSaveCount": 21,
    "distantHorizonsIncompleteTasks": 0,
    "settlementRoadsRebuilds": 0,
    "settlementRoadsMaxDiscoveredStructures": 0,
    "settlementRoadsMaxConnections": 0,
    "emiTotalReloadMs": null,
    "emiSlowestPluginMs": 0,
    "emiSlowestPlugin": null,
    "kubejsRecipeParseErrors": 0,
    "kubejsFailedRecipeCount": 0,
    "hardLogFindings": 0,
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
      "KubeJS asset validation": 500,
      "chemistry identity validation": 500,
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
      "KubeJS asset validation": 2000,
      "chemistry identity validation": 2000,
      "dev dump health validation": 500
    },
    "results": [
      {
        "name": "JSON and JS syntax validation",
        "durationMs": 4519.58,
        "budgetMs": 8000,
        "hardLimitMs": 24000
      },
      {
        "name": "critical progression surfaces",
        "durationMs": 5.53,
        "budgetMs": 750,
        "hardLimitMs": 3000
      },
      {
        "name": "quest book validation",
        "durationMs": 0.35,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "Wares and villager trade validation",
        "durationMs": 0.91,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "repo loot data validation",
        "durationMs": 1.9,
        "budgetMs": 500,
        "hardLimitMs": 3000
      },
      {
        "name": "generated recipe graph validation",
        "durationMs": 155.17,
        "budgetMs": 5000,
        "hardLimitMs": 20000
      },
      {
        "name": "generated loot dump validation",
        "durationMs": 0.21,
        "budgetMs": 2500,
        "hardLimitMs": 10000
      },
      {
        "name": "engine and world performance log analysis",
        "durationMs": 37.16,
        "budgetMs": 250,
        "hardLimitMs": 1500
      },
      {
        "name": "KubeJS asset validation",
        "durationMs": 62.01,
        "budgetMs": 500,
        "hardLimitMs": 2000
      },
      {
        "name": "chemistry identity validation",
        "durationMs": 64.04,
        "budgetMs": 500,
        "hardLimitMs": 2000
      },
      {
        "name": "dev dump health validation",
        "durationMs": 0.24,
        "budgetMs": 50,
        "hardLimitMs": 500
      }
    ]
  }
}
```
