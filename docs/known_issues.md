# Known Issues

- Some higher casing gates intentionally leave the first machine of a tier ungated to avoid recipe deadlocks.
- `kubejs:master_blood_heart` depends on RPGStats storing the wither death cause as `wither`; if runtime uses a different cause ID, adjust the DSL requirement.
- Quest dependencies/visibility are not fully authored yet; this pass prioritizes chapter structure, task targets, and reward economy.
- Villager trades are a first balance pass and should be tuned after seeing coin income from obelisk/dimension content.
