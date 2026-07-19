# Runtime Validation

The supported runtime surface is one explicit lifecycle smoke:

```text
tools/bc test smoke --bootstrap-mode always
```

It prepares one disposable dedicated-server world and one Xvfb-backed client under `~/.cache/bc/smoke`, connects `SmokeClient`, waits 30 seconds, disconnects it through the server, and stops the server. The test fails on startup, join, lifecycle, or hard-log failures and writes diagnostics beneath its disposable run root.

Optional controls are `--run-root PATH`, `--bootstrap-mode always|once|never`, `--port N`, and `--idle-seconds N`. It never creates cycles, variants, cloned worlds, or additional test worlds.

## Complementary source checks

```text
tools/bc doctor env
tools/bc test static
tools/bc test kotlin
tools/bc test fast
```

The smoke proves lifecycle and client/server network compatibility only. Gameplay, worldgen distributions, progression routes, and visual quality require separately designed evidence.
