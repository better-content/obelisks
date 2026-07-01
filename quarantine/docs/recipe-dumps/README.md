# Runtime Recipe Dumps

The static pack site consumes normalized runtime dumps from:

- `generated/runtime-dumps/recipes.json`
- `generated/runtime-dumps/registries.json`
- `generated/runtime-dumps/tags.json`
- `generated/runtime-dumps/mods.json`

These files should describe what the Minecraft runtime actually loaded after datapacks
and KubeJS changes. Existing audit dumps are useful for investigation, but they are not
the final recipe graph source of truth.

## Current Bridge From Existing Dumps

The live instance already emits chunked legacy audit dumps:

```text
kubejs/config/full_recipe_index_manifest.json
kubejs/config/full_recipe_index_0000.json
kubejs/config/full_recipe_index_0001.json
...
```

Convert those into the pack-site runtime schema:

```bash
python3 tools/recipegraph/import_legacy_full_index.py
python3 tools/packsite/build.py
```

The importer writes:

```text
generated/runtime-dumps/recipes.json
generated/runtime-dumps/registries.json
generated/runtime-dumps/tags.json
generated/runtime-dumps/mods.json
```

This bridge is evidence-oriented, not the final runtime dumper. It preserves raw
recipe JSON and extracts common item/tag/fluid inputs and outputs so item pages,
recipe pages, graph data, and policies can run against the current loaded recipe
set.

## Target Runtime Dumper

`kubejs/server_scripts/90_dev_debug/30_runtime_graph_dumps.js` is the forward
runtime-dump path. It should eventually emit complete registry, tag, and mod
metadata directly, rather than relying on the legacy audit-dump importer.
