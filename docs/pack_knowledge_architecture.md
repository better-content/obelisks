# Pack Knowledge Architecture

This pass adds the first dependency-free implementation of the pack knowledge cockpit.

## What Exists

- `quests/graph.yml`: fixture quest graph source of truth.
- `quests/schema.md`: authoring schema and validation rules.
- `recipe-dumps/schema.md`: runtime dump schema contract.
- `recipe-policies.yml`: first policy examples and scaffolding.
- `tools/questgraph/`: quest graph model, validator, and generated FTB exporter.
- `tools/recipegraph/`: runtime dump normalizer, validator, policy evaluator, graph data builder.
- `tools/packsite/`: static site builder and placeholder icon resolver.
- `kubejs/server_scripts/90_dev_debug/30_runtime_graph_dumps.js`: enabled runtime recipe dump scaffold.

## Build

```bash
python3 tools/packsite/build.py
```

Outputs:

- `generated/pack-site/index.html`
- `generated/ftbquests/`

The generated site works from `file://`. Graph pages use local JavaScript data files:

- `generated/pack-site/assets/quest-graph-data.js`
- `generated/pack-site/assets/recipe-graph-data.js`

## Runtime Dumps

The desired runtime dump files are:

- `generated/runtime-dumps/recipes.json`
- `generated/runtime-dumps/registries.json`
- `generated/runtime-dumps/tags.json`
- `generated/runtime-dumps/mods.json`

The KubeJS scaffold is currently enabled and emits a first recipe-event dump during
server recipe processing:

```json
{
  "enabled": true,
  "outputDir": "generated/runtime-dumps/"
}
```

in `kubejs/config/runtime_graph_dumps.json`.

The latest promoted runtime dump came from the dedicated server under:

```text
server-instance/generated/runtime-dumps/
```

and was copied to:

```text
generated/runtime-dumps/
```

The current KubeJS scaffold is intentionally conservative and parser-light. It records
the loaded recipe set for policy/site validation, but `registries.json`, `tags.json`,
and `mods.json` are still placeholder/minimal files and are not the final registry,
tag, or mod metadata solution.

## FTB Quests Export

Generated FTB files are written only to:

```text
generated/ftbquests/
```

The exporter generates deterministic 16-character IDs from YAML keys and ignores live
FTB ID drift. Do not overwrite `config/ftbquests/` as part of this architecture pass.

## Intentional Limits In This Pass

- No detailed quest book content pass.
- No live quest file edits.
- No gameplay balance changes.
- No 3D block icon rendering.
- No internet-loaded assets.
- No final runtime registry/tag/mod dump implementation yet.
