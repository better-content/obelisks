# Realistic Block Physics Solid Block Audit Proposal

Scope: source/config audit for `config/rbp`, using the vanilla 1.20.1 client assets, resolved server mod jars, custom jars in `mods/`, local KubeJS assets, static block tags, and current RBP definitions. This is a proposal, not an implementation pass.

## Current state

- `config/rbp/world_definitions/overworld.toml` correctly keeps `DefaultBlockDefinition = ""`. Keep this. Physics should stay explicit-definition only.
- Current RBP files contain 5,030 explicit block IDs, including 4,456 generated modded IDs.
- Static tag expansion from available assets/tags resolves 5,241 currently covered block IDs.
- Static asset heuristics found about 6,173 solid or solid-like candidates after adding pack-owned KubeJS runtime blocks.
- About 1,344 solid candidates are not currently covered.
- About 230 currently covered IDs look like support-dependent, lifecycle-owned, admin/progression-protected, or non-solid blocks and should be removed or explicitly exempted before broadening coverage.

Static caveat: blockstate/model assets do not expose every Java `canSurvive`, collision, multiblock, or fake-block rule. Treat this as the source audit pass and confirm final IDs with a fresh runtime registry/collision dump before committing generated lists.

## Include proposal

Keep RBP as an explicit allowlist. Regenerate the modded definition files from a classifier with these include classes:

- Geology and terrain mass: stone, deepslate, netherrack, end stone, ores, Realistic Ores deposits, dirt, clay, mud, packed mud, sand, gravel, sandstone, ice, snow blocks, obsidian, sculk blocks, regolith, and solid modded terrain variants.
- Construction blocks: full blocks, bricks, tiles, slabs, stairs, walls, fences, fence gates, panes, bars, trapdoors, logs, planks, stripped logs/woods, hyphae/stems, terracotta, concrete, glass, wool, sponge, coral blocks, mushroom blocks, leaves, and normal modded equivalents.
- Metals and storage blocks: vanilla storage blocks, Chemlib metal blocks, refined ore blocks, copper variants, raw ore blocks, gem blocks, lamp blocks that are real cube blocks, and compressed material blocks.
- Solid utility and machine bodies: furnaces, tanks, barrels, chests, crates, casings, controllers, vaults, solid machine blocks, altars/tables/workbenches with block bodies, and storage systems when they are actual placed blocks.
- Pack-owned KubeJS blocks: add all machine casings and the crate block family. Current runtime logs show 16 crate bases, so that means 256 `kubejs:crate_*_t01` through `kubejs:crate_*_t16` blocks, plus the 10 machine casing blocks.
- FramedBlocks: include framed solid construction forms by shape profile. These were the largest missing solid namespace in the static pass.
- Modded leaves: include normal leaves from Aether, Ars Nouveau, Blue Skies, Burnt, etc. Continue excluding Dynamic Trees namespaces because that lifecycle is owned by Dynamic Trees.

Large missing groups to add or deliberately decide on:

- `kubejs`: 266 known solid runtime blocks: 10 casings plus 256 crates.
- `framedblocks`: about 158 solid construction forms.
- `pneumaticcraft`: about 78 solid machines/utility blocks.
- `natures_spirit`: about 68 normal construction/leaves blocks not currently covered.
- `chemlib`: about 56 metal/lamp blocks.
- `everythingcopper`: about 56 copper construction variants.
- `twilightforest`, `quark`, `bloodmagic`, `tconstruct`, `create`, `createdeco`, `createbigcannons`, `sophisticatedstorage`, `blue_skies`, and `burnt`: several solid construction or utility families need profile assignment rather than one-off additions.

## Do not include

Do not give RBP physics to blocks whose placement or survival is already owned by vanilla/mod support rules, growth rules, fake-block rules, or protected structure rules.

Exclude terrain-attached and lifecycle blocks:

- Cactus, sugar cane, bamboo plants, saplings, seedlings, crops, crop stems, grass plants, ferns, flowers, dead bushes, small mushrooms/fungi, roots, sprouts, vines, cave vines, glow lichen, sculk vein, lily pads, floating aquatic plants, kelp, seagrass, sea pickles, coral fans, wall coral fans, coral plants, amethyst buds/clusters, pointed dripstone, chorus plants, and chorus flowers.
- Do not confuse these with solid storage/construction blocks. `*_grass_block`, `*_mushroom_block`, `mushroom_stem`, `dried_kelp_block`, `sugar_cane_block`, `sea_lantern`, `jack_o_lantern`, `rose_quartz_block`, `rose_quartz_tiles`, and `rose_gold_block` are solid candidates, not automatic exclusions.

Exclude face/floor/ceiling-attached decor and thin blocks:

- Torches, wall torches, sconces, candles, vanilla hanging lanterns, ladders, signs, wall signs, hanging signs, banners, heads, skulls, flower pots, potted plants, bells, end rods, lightning rods, conduits, cobwebs, tripwire, and string.
- Floor coverings and layers: carpets, rugs, mats, table cloths, and snow layers. Keep `powder_snow` only if the pack wants loose-powder RBP behavior; it is not a normal solid construction block.

Exclude redstone/support controls and track-like blocks:

- Buttons, pressure plates, levers, redstone wire, repeaters, comparators, tripwire hooks, daylight detectors, rails, modded rails, tracks, track nodes, cable faces, gauges, switches, thin brackets, wire blocks, and decorative connector faces.
- Do not exclude solid names that merely contain these tokens, such as `railway_casing`.

Exclude support-owned multiblocks/interactives:

- Doors and beds, including every modded ID covered through `#minecraft:doors` and `#minecraft:beds`.
- Brewing stands, grindstones, lecterns, stonecutters, campfires, and similar vanilla-style placed appliances that already have support/placement behavior and are not normal mass-bearing blocks.

Exclude world-control, debug, temporary, and protected structure blocks:

- Bedrock, barrier, command blocks, structure blocks, structure voids, jigsaws, end portals, end portal frames, debug blocks, creative test generators, temporary air/light/intangible blocks, fake replacement blocks, and any invisible control block.
- Keep the existing Dynamic Trees namespace exclusions.
- Keep AE2 sky stone meteor/structure blocks exempt unless a separate meteor-physics design is approved.
- Exempt adventure/progression structure controls such as Aether locked/trapped/boss/treasure doorway stones and similar portal, locked dungeon, or key-gated structure blocks.

## Current cleanup targets

Before expanding coverage, remove or isolate these current RBP inclusions:

- Vanilla tags/profiles: `#minecraft:doors`, `#minecraft:beds`, `#minecraft:wool_carpets`, `minecraft:tripwire`, `minecraft:ladder`, `minecraft:flower_pot`, vanilla heads/skulls, vanilla hanging signs, `minecraft:end_portal_frame`, and support-owned vanilla utility blocks listed above.
- Generated modded IDs matching door/bed/carpet/rug/mat/pressure-plate/sign/sconce/support-model patterns.
- Aether `boss_doorway_*`, `locked_*`, `trapped_*`, and `treasure_doorway_*` blocks.
- Ars Nouveau `*_sconce` blocks.
- Modded floor controls and mats such as `fallout_wastelands_:molder_wood_pressure_plate`, `the_finley_dimension_remastered:*_pressure_plate`, `quark:bamboo_mat`, `undergarden:*_rug`, `swem:*_rubber_mat`, and `rsgauges:glass_contact_mat`.

## Implementation shape

1. Keep `DefaultBlockDefinition = ""`.
2. Add a generator/audit tool that reads blockstates, block models, static tags, and a small hand-authored denylist.
3. Generate explicit RBP files by profile: stone/terrain, dirt, sand, wood, leaves, construction, slabs, stairs, walls, fences, glass, panes/bars, refined ore/metals, utility light/heavy, and KubeJS crates/casings.
4. Add a validation check that fails if generated RBP files contain denylisted support/lifecycle/admin patterns.
5. Run static validation, then fresh runtime validation with registry/collision evidence before accepting the generated coverage.
