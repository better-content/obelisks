# Worldgen And Dimension Integration Notes - 2026-05-05

This records the current scoped fixes and evidence from the continuation pass. It does not claim the full settlement/wall campaign is complete.

## Settlement Roads

Touched source:

- `/home/gerald/mcmods/settlement-roads/src/main/kotlin/com/gerald/settlementroads/runtime/SettlementRoadsRuntime.kt`

Current deployed jar:

- `settlementroads-0.1.0.jar`
- SHA-256: `c764ea4c2768e3c574415a824728b66dcb68916143cdc5d65a5fd491b47df3ce`

Validated:

- `./gradlew test`
- `./gradlew --no-daemon clean build`
- Client join probe: `docs/client_join_probe/20260505-204349`
- Client join probe: `docs/client_join_probe/20260505-205014`

Implemented in this pass:

- Runtime level-unload cleanup now clears placement throttle state for the unloaded level.
- Existing dirty settlement-roads source already had player/chunk gating and rebuild log removal. Those broader changes were built and deployed, but were not all introduced in this continuation.

Residual risk:

- The runtime package is still weakly covered by direct tests.
- This validates startup/join behavior, not a long settlement-generation walk test.

## Village Walls

Touched source:

- `/home/gerald/mcmods/village-walls/src/main/java/com/example/villagewalls/world/AutoVillageWallBuilder.java`

Current deployed jar:

- `villagewalls-1.0.0.jar`
- SHA-256: `d8dd86e9e3823cb62a16020709b6626b10fa5a47e0369e2586232489307b2efa`

Validated:

- `./gradlew --no-daemon clean build`
- Client join probe: `docs/client_join_probe/20260505-204349`
- Client join probe: `docs/client_join_probe/20260505-205014`
- Client join probe: `docs/client_join_probe/20260505-205626`

Implemented in this pass:

- Automatic village-wall generation is capped to one build per server tick.
- Too-small or failed village cells are marked processed instead of retrying forever.
- This targets boot/join/tick-thread work inflation.
- Rampart body walls no longer use decorative missing-block holes.
- Rampart roof torches are placed on the interior lane every 8 blocks with sturdy support checks.
- Rampart ladders are skipped over water and require a sturdy wall face behind the ladder.
- Campfire candidates are skipped when the source wall column was water-skipped.
- Gate iron bars now set explicit north/south or east/west pane connections.

Still not fixed:

- Rampart corner join geometry may still need a specific world fixture.
- Walls cutting into or skipping settlement buildings still needs an outline/building coverage test.

Those require targeted geometry/worldgen tests, not just join validation.

## Deep Slate Unearthed

Installed mod evidence:

- Jar: `UnEarthed-2.3.0-1.20.1-forge-all.jar`
- Mod ID/version from metadata: `unearthed`, `2.3.0-1.20.1-forge`
- The jar's Hyle feature uses block tag `hyle:replaceable`.

Fix:

- Repo script `kubejs/server_scripts/10_tags/20_replaceable_deepslate.js` adds `minecraft:deepslate` to `hyle:replaceable`.
- The server-instance and live Prism copies were synced back to that same `hyle:replaceable` tag after drift had changed the server copy to the wrong `unearthed:replaceable` tag.

Validation:

- `node --check kubejs/server_scripts/10_tags/20_replaceable_deepslate.js`
- Server boot completed after sync.
- Client join probe passed at `docs/client_join_probe/20260505-205014`.

Remaining validation:

- Generate or inspect fresh relevant terrain to prove Unearthed replacement visually/structurally occurs in new deepslate worldgen.

## Lost Cities Via Creating Space

Installed mod evidence:

- Lost Cities: `lostcities-1.20-7.4.11.jar`, mod ID `lostcities`, version `1.20-7.4.11`.
- Creating Space: `creatingspace-1.20.1-1.7.13.jar`, mod ID `creatingspace`, version `1.20.1_1.7.13`.
- Lost Cities config includes `lostcities:lostcity=biosphere`.
- Creating Space uses registry path `creatingspace:rocket_accessible_dimension`.

Added datapack files:

- `kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json`
- `kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json`

Current route:

- `creatingspace:earth_orbit` has adjacent dimension `lostcities:lostcity`.
- `lostcities:lostcity` has adjacent dimension `creatingspace:earth_orbit`.
- Delta-v values are PROVISIONAL - requires playtesting.

Validation:

- Both JSON files pass `python3 -m json.tool`.
- Server boot logged Creating Space travel-map update after deployment.
- Client join probe passed at `docs/client_join_probe/20260505-205014`.

Remaining validation:

- Confirm the route appears in the Creating Space client UI and that travel succeeds.

## TFTH Status

No installed mod or config was confidently identified as `TFTH`.

Evidence checked:

- Pack mod metadata and config/script searches found Lost Cities, Creating Space, `ThirstWasTaken`, and `fallout_wastelands_`, but no clear `TFTH` mod ID.
- Because IDs must not be invented, no TFTH dimension-control patch was made.

Next action:

- Identify the intended TFTH jar/mod ID before implementing dimension allow/deny rules.
