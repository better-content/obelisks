# Recipe Dump Schemas

## `recipes.json`

Schema: `obelisks.recipe_graph.v1`

```json
{
  "schema": "obelisks.recipe_graph.v1",
  "minecraft": "1.20.1",
  "loader": "forge",
  "generated_at": "runtime",
  "recipes": [
    {
      "id": "obelisks:compressed_iron_pressing",
      "type": "create:pressing",
      "category": "create:mechanical_press",
      "source": {
        "kind": "runtime",
        "declared_by": "kubejs_or_datapack_unknown",
        "file": null
      },
      "inputs": [
        {
          "kind": "item",
          "id": "minecraft:iron_ingot",
          "count": 1
        }
      ],
      "outputs": [
        {
          "kind": "item",
          "id": "pneumaticcraft:ingot_iron_compressed",
          "count": 1,
          "chance": 1.0
        }
      ],
      "catalysts": [],
      "fluids_in": [],
      "fluids_out": [],
      "requirements": {
        "heat": null,
        "pressure": null,
        "energy": null,
        "time": null
      },
      "machines": [
        {
          "id": "create:mechanical_press",
          "label": "Mechanical Press"
        }
      ],
      "tags": [],
      "parsed": true,
      "raw": {
        "type": "create:pressing"
      }
    }
  ]
}
```

Unknown serializers must not be dropped. Use `parsed: false`, preserve raw data where
obtainable, and leave parsed input/output arrays empty if no safe parser exists.

## `registries.json`

Schema: `obelisks.registries.v1`

Contains `items`, `blocks`, `fluids`, and `entities` maps keyed by registry ID.

## `tags.json`

Schema: `obelisks.tags.v1`

Contains `item_tags` and `fluid_tags` maps.

## `mods.json`

Schema: `obelisks.mods.v1`

Contains a `mods` map keyed by mod ID, with at least `name` and `version` when known.
