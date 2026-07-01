# Quest Graph Schema

Schema version: `obelisks.quest_graph.v1`

The quest graph YAML supports:

- `meta`: pack, Minecraft version, quest system, and optional schema name.
- `chapters`: map of stable chapter keys to chapter metadata.
- `nodes`: map of stable quest node keys to quest metadata.

Required chapter fields:

- `title`
- `order`
- `icon`

Required quest node fields:

- `type: quest`
- `title`
- `chapter`
- `icon`
- `stage`
- `x`
- `y`
- `body`
- `tasks`
- `rewards`

Optional quest node fields:

- `requires`: list of dependency node keys.
- `tags`: list of authoring tags.
- `source_tags`: list of source/system tags.
- `mod_tags`: list of mod IDs.
- `optional`: marks optional branch nodes.
- `ftb`: exporter hints.
- `icon_path`: explicit local icon path for site rendering.

Supported task shapes:

```yaml
- type: item
  item: minecraft:dirt
  count: 1
```

```yaml
- type: fluid
  fluid: minecraft:water
  amount: 1000
```

```yaml
- type: entity
  entity: minecraft:zombie
  count: 1
```

Supported reward shapes:

```yaml
- type: item
  item: minecraft:diamond
  count: 1
```

Stable FTB IDs are generated deterministically from YAML IDs. Existing live/repo FTB ID
drift is ignored by this exporter.
