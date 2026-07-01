# Quest Graph SSOT

`quests/graph.yml` is the source of truth for generated quest architecture experiments.

The current graph is intentionally a fixture. It validates the pipeline without replacing
the live FTB Quests files under `config/ftbquests/`.

Build outputs are written only under:

- `generated/pack-site/`
- `generated/ftbquests/`

Do not copy generated FTB files into the live quest book without a separate review.
