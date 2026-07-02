# Content Systems

## Recipe Authority

KubeJS recipe overrides are the authoritative content surface. The active server recipe passes live under `kubejs/server_scripts/20_recipe_remove/`, `30_recipe_replace/`, `35_villager_trades/`, `40_recipe_add/`, `50_loot/`, and `60_worldgen/`.

Important policies:

- Remove easy metal compression and raw nugget/ingot/block liquidity.
- Replace vanilla valuables in high-impact recipes with manufactured parts, casings, slates, alloys, plates, circuits, or terrain-gated materials.
- Keep easy hand-stacked automation and furnace metal shortcuts out of the grid/furnace: `145_vanillish_recipe_expert_pass.js` routes ordinary engineering to Create assembly/compaction and magic or alchemy workstations to Blood Magic alchemy. `80_recipe_policy/10_no_complex_grid_defaults.js` is the late guard for complex defaults: only large-format patterns and named milestone assemblies should stay exclusive mechanical-crafter recipes, while ordinary `3x3` and smaller core-infrastructure finished goods should resolve to crafting-table assembly that spends manufactured intermediates. Shapeless tech defaults still reroute mainly to Create mixing, and small magic defaults still prefer Blood Magic alchemy.
- Remove teleportation, chunk-loading, creative, infinity, and package-wormhole bypasses unless explicitly re-authored.
- Keep recipes Rhino-safe and deterministic under `kubejs:*` IDs.

Dimension travel is intentionally narrow: Dimensional Fonts and Creating Space rocket routes are the only authored cross-dimension surfaces. Direct portal/key recipes, portal structures, and JEI/EMI visibility for those route items should stay disabled unless a route is deliberately re-authored through one of those two surfaces.
Current Dimensional Fonts graveyard generation is structure-set driven rather than biome-modifier feature driven. The procedural graveyard design still embeds each raised altar into a copper-framed square junction court: packed mud stays the outer graveyard path language, the altar seam is reclaimed into a built ritual square, and biome-reactive court dressing is limited to perimeter pots rather than loose center clutter.

KubeJS layout remains load-order grouped by responsibility. `startup_scripts/00_boot` is for shared globals/helpers, startup item/block registration lives under startup item/block domains, and global startup behavior toggles live under startup globals. Server scripts use `10_tags`, `20_recipe_remove`, `30_recipe_replace`, `35_villager_trades`, `40_recipe_add`, `50_loot`, `60_worldgen`, `70_spawn`, `80_recipe_policy`, and `90_dev_debug`; keep `90_dev_debug` empty for release. Client scripts own JEI/EMI visibility, tooltips, and client-only presentation.

## Materials And Chemistry

Deposit processing is multi-surface:

- `45_deposit_furnace_fallbacks.js`: poor emergency fallback.
- `60_worldgen/10_r_ores_melted.js`: TCon melter and ore-melting outputs.
- `50_create_deposit_preprocessing.js`: Create crushing/washing preparation.
- `55_realistic_ores_identity_outputs.js`: deposit identity outputs and acid/ball routes.
- `57_grown_material_acid_ball_processing.js`: plant, fungus, honeycomb, and animal acid/ball extraction.
- `56_alchemistry_dissolver_create_port.js`, `58_create_pncr_molecular_synthesis.js`, and `59_formulaic_synthesis_magic_routes.js`: Create/PNCR/magic-facing chemistry parity.
- `60_create_chemical_transformations.js`, `61_chemical_existing_item_alternatives.js`, `62_chemical_electronics_magic_growth_routes.js`, and `63_chemlib_full_integration_routes.js`: downstream chemistry use. These scripts turn acid/ball outputs into transformation loops, existing-item alternate crafts, electronics precursors, magic reagents, fertilizer/feed routes, explosives, refractory materials, pressure/electronics components, and broad molecule/element family roles.
- `65_chemlib_plate_manufacturing_routes.js`: Chemlib plates through Create pressing and TCon casting where supported.

Alchemistry/ChemLib content informs material identity, but the authored progression route is Create, TCon, PNCR, and Blood Magic-adjacent synthesis rather than a direct free transmutation lane. Chemicals now have downstream jobs as reagents, intermediates, and specialty manufacturing inputs: common biological and ore byproducts feed bulk routes, while rarer salts, oxides, platinum-group materials, tungsten, beryllium, thorium, uranium, and titanium chemistry feed precision machinery and late protection. A properly integrated ChemLib element or molecule must have a clear identity, at least one believable source, at least one transformation role, existing-item demand, sensible tier placement, and no dead-end bulk production. Create is the open bulk chemistry surface, PNCR is sealed pressure/thermal/gas/plastic/etching authority, and Blood Magic is manual LP-paid high-yield chemistry rather than passive automation.

Most pack-authored KubeJS crafting intermediates are currently disabled as standalone registered items. Reusable processing media, such as grinding balls for the Realistic Ores routes, remain valid registered components. Recipe surfaces should otherwise prefer direct casing, material, pressure, and machine-authority gates instead of reintroducing new bespoke subassembly items unless the progression docs are updated first.

Non-grown infinite matter is not an authored resource source. `30_remove_items.js` removes passive ore/matter generators such as Occultism miners, Blood Magic meteors, Botania Orechid/Marimorphosis/catalyst routes, Ars conjured islands/fluid glyph routes, and Create Diesel lava fermentation. Create bottomless draining and finite-water biome refills are disabled in config; raw/geologic/material villager buy restocks are skipped by `35_villager_trades/10_coin_villager_trades.js`. Renewable grown sources such as crops, trees, animals, and ordinary biological drops remain valid economy inputs.

The lava-depth material loop is a late exception within the Overworld geology stack. Tectonic extends terrain to Y -64; `datapacks/realistic_ores_lava_depths` places only lava-exposed Realistic Ores uranium, thorium, and osmiridium lava sulfide in the Y -64 to 0 band. Osmiridium feeds Create washing, TCon ore melting, acid/ball chemistry, Protection Pixel Tosaki gear, and selected post-AE2 utility.

Vanilla Overworld ore placed features are removed by `datapacks/worldgen_compat_fixes`, and representative vanilla ore value is folded back into Realistic Ores acid/ball outputs through explicit deposit/solvent/media extras. Realistic Ores also owns gravel ore coverage: `defaultresources/excavated_variants` registers gravel as an Excavated Variants substrate, `defaultresources/excavated_variants/excavated_variants/variants/realisticores.json5` emits `excavated_variants:gravel_*` variants for custom deposits, and `datapacks/worldgen_compat_fixes/data/realisticores/worldgen/configured_feature` adds gravel replacement targets to the Realistic Ores stone features.

## Create And Tinkers

Tinkers establishes seared/scorched metallurgy before Create authority. Create addon integration is handled through `121_create_stack_integration_gates.js`; PNCR compression gates in `122_pneumaticcraft_create_pressing_gates.js` make compressed iron and compressed stone Create pressing outputs and remove pressure/explosion shortcuts. Core machine blocks now default to ordinary shaped assembly from manufactured parts and casing tiers, and the active pack content no longer authors Create mechanical-crafting recipes. TCon remains the molten metallurgy surface, Blood Magic alchemy owns magic work, and PNCR pressure or assembly owns late electronics/circuit completion.

The first hand tools are authored TConstruct stacks: a flint hand axe crafted from flint, Farmer's Delight straw, and a stick, plus a flint/wood butcher knife crafted from three flint and a stick. No Tree Punching tools, loose rocks, and pottery/vessel routes are not part of the active early-game spine.

Installed TConstruct tool add-ons broaden the authored tool and weapon surface without returning to disposable vanilla-tier tools. Additional Weaponry and Battle Spades provide the current primitive/survival+ edge; Tinkers' Things, Katanas, Rapier, and Weaponry add halberd, staff, chisel, shortbow/blowpipe, katana, shuriken, rapier/estoc, greatsword, lance, and pike families. Better Combat weapon attributes are pack-authored under `kubejs/data/*/weapon_attributes/` for these added tools so animation categories stay explicit.

`60_vanilla_tools_to_tcon_heads.js` removes and hides vanilla-shaped pickaxe, axe, shovel, sword, and hoe outputs from Minecraft and installed tool-clone mods, plus disposable material-tier knives, mattocks, saws, spears, daggers, and battleaxes where they duplicate the vanilla tool lane. Existing vanilla tool inputs are remapped to TConstruct parts where recipes still need that semantic role; player-facing tool progression should remain TConstruct-authored rather than disposable material-tier clones.

Create trains and physical logistics are a first-class progression lane. Package teleportation remains removed until redesigned. The bundled `create_train_fuel_scaling` addon keeps Create's normal powered-top-speed fuel rate but scales drain exponentially by actual train speed, so slower local routes are cheaper and high-speed routes pay a heavier fuel premium.

`123_more_red_primitive_circuitry.js` makes More Red the primitive electronics layer. Red alloy is a terrestrial Create mixing product, red alloy wire is pressed from that alloy, and the soldering table is built from andesite-tier Create parts. Later circuit recipes in Power Grid, PneumaticCraft, OC2R, AE2, and redstone-bearing Create controls consume More Red wire/diodes/gates before escalating to Power Grid integrated circuits. `143_circuit_pncr_assembly_authority.js` makes the finished circuit step a PNCR assembly laser/drill operation: upstream processes can prepare boards, traces, wafers, or printed processors, but completed PCB, Power Grid, OC2R, AE2, and impossible-circuit outputs come from PNCR assembly.

Chemistry alternates respect that boundary. Create, Blood Magic, and PNCR pressure routes may prepare etched boards, doped wafers, capacitors, transistors, printed AE2 precursors, ceramic substrates, and trace chemicals, but finished circuit outputs remain under the existing PNCR assembly authority for their tier.

## World Physics

Realistic Block Physics stays explicit-definition only in `config/rbp/world_definitions/overworld.toml`; the default block definition remains empty so non-solid blocks are not swept in by fallback physics. The generated `config/rbp/block_definitions/generated_pack_solid_blocks.toml` surface comes from the current runtime block audit plus RBP IDs, giving pack solid/collision-like blocks broad coverage while excluding bedrock, Dynamic Trees-managed namespaces, virtual/control blocks, plants/fluids, and most attached or support-owned blocks. Known explicit overrides matter: Dynamic Trees rooty soils are dirt-profile physics blocks, and `quark:stick_block` belongs to the wood profile rather than generated stone/solid profiles so placed sticks remain axe-breakable.

RBP coverage should continue as explicit allowlists by profile, not broad fallback physics. Solid generated candidates include terrain mass, construction blocks, storage/metals, solid machine bodies, utility blocks with real block bodies, FramedBlocks solid construction forms, pack-owned casings/crates, and normal modded leaves outside Dynamic Trees. Lifecycle, support, admin, and attached decor blocks should not enter the generated solid sweep; if they need physics at all, keep them in narrow explicit support profiles like the current door, bed, miscellaneous, ladder, or flower-pot style definitions. Any broad RBP expansion needs a generator/audit pass plus fresh runtime registry or collision evidence before acceptance.

## Burnt Compatibility

Burnt compatibility is now split into three maintained surfaces: generated compatibility block tags under `kubejs/data/{burnt,minecraft,forge}/tags/blocks/`, explicit false-positive exclusions in `tools/burnt_coverage_block_tag_exclusions.json`, and downstream validation behind the Kotlin-backed `tools/btm internal validate-burnt-coverage` and `tools/btm internal sync-burnt-coverage-tags` paths for the `config/adpother/Emitters/burnt$*.cfg` and `config/adpother/Breakables/burnt$burnt_blocks.cfg` consumers. The generated pass keeps manual tag values intact and treats `burnt:grass_blocks` as an audited/generated surface instead of a tiny hand-maintained list.

This pass only owns first-order compatibility tags such as `burnt:plants_will_burn`, `burnt:grass_blocks`, `burnt:fire_resistant`, and the shared vanilla or forge wood, leaf, crop, carpet, and mushroom tag families Burnt consumes in practice. Burnt-native transient or output-state tags such as `burning_*`, `smoldering_*`, `wood_fire`, `stairs_fire`, `sooty_*`, and `burnt_*` remain upstream-owned unless a concrete regression proves otherwise.

## Blood Magic And Body Systems

Blood Magic is the magic parent spine. `40_blood_orbs_from_still_beating_hearts.js` removes default Blood Orb altar recipes and replaces them with level-threshold heart-key recipes, including a direct still-beating-heart fallback for the first weak orb. `82_blood_magic_lifeforce_rework.js` makes the first Blood Altar heart-bound instead of dimension-bound, keeps rune escalation costly, and keeps sacrifice helpers deeper in the tree. `58_blood_magic_manual_create_yields.js` adds LP-paid manual batch alternatives for essential Create materials without replacing factory automation.

The death overhaul is a body-system progression surface. `defaultconfigs/configurabledeath-server.toml` keeps carried items and food state on death while dropping XP, so deaths are not balanced around random inventory scatter but still erase the current life's vanilla experience. `rpg-stats` owns the life ledger: `PointAwarder` grants power from new XP levels above `lifePeakLevel`, `CommonForgeEvents` clears allocations and unspent points on death, and `StillBeatingHeartData` creates the respawn-delivered `rpgstats:still_beating_heart` with that life's level. The intended pressure is "how long and how far did this life get" plus the return to the locked spawn.

Permanent-ish spawn is owned by Class Selector onboarding and the no-moving-spawn startup hook. Players lock a starting site during class or embark selection; ordinary spawn changes are cancelled, bed and respawn-anchor updates are rejected while the class spawn is locked, and respawn teleports back to the stored `classselector:respawn_*` point with mob repel protection plus scripted sound and sculk-particle FX. Any future player-facing spawn relocation should be late-game content, not a bed-level convenience.

Food and potion identity are handled through `70_food_potion_reagents.js`: food blocks discover/refine effect identity, and the brewing stand combines processed extracts rather than serving as the main discovery ladder. Body-survival mods and configs include Diet, Thirst Was Taken, Cold Sweat, Diminishing Health defaults, PlayerRevive, and related KubeJS tooltip/content support.

Grown-material chemistry is also a production lane. Crop, tree, animal, bone, hide, feather, honeycomb, and venom acid/ball outputs can be spent on fertilizer, feed, leather/string/slime alternatives, potion-adjacent reagents, and Blood Magic/magic salts. These routes are renewable but infrastructure-heavy; they are not a passive replacement for finite geology.

Non-village natural crop and edible-plant diversity is relocated into Undergarden forage by `datapacks/datapack_foraging_everywhere`. Village farms, Wares, and villager food routes remain the explicit surface exception; ordinary Overworld biome forage should not be the first renewable source for specialty crops.

Starting loadouts are owned by the embark point-buy config in `config/classselector/embark.json`; `config/classselector/kits.json` remains safe legacy fallback data. The active embark quota is 18 points. The Class Selector embark UI now presents one dozen high-signal support choices instead of a broad catalogue: hydration, climate scouting, light, route marking, rope, a small vanilla rail start, and basic rations. It must not include starter tools, armor, logs/planks, functional crafting blocks, generic storage, coins, scuba gear, gliders, recovery compass routes, renewable specialty crop starts, ready-made TNT or TNT inputs, Protection Pixel gear, AE2, PNCR pressure items, Blood Magic LP/orbs, Create trains, Wares routes, or other missing-logistics progression before those systems provide power.

`126_cross_magic_irons_spellcraft.js` is the current Iron's Spells integration surface. It treats Iron's spellcraft as an authored branch of the magic spine: Blood Magic slates set tier, Ars apparatus handles source stabilization, Botania runic altar handles rune school identity, Hexerei cauldron handles folk/alchemical setup, Malum spirit infusion upgrades school power, and Goety rituals handle cursed/high-danger artifacts. Occultism, Forbidden and Arcanus, Reliquary, Hexerei, Botania, Goety, Ars, and Malum reagents are intentionally mixed into the recipes so Iron's spell outputs cannot be mass-crafted from only vanilla valuables and Iron's own drops.

## Casings And Manufactured Parts

The casing economy is the cross-mod machine-frame system. `99_machine_casing_progression.js`, `130_manufactured_plate_recipe_pass.js`, `136_machine_casing_ecosystem_expansion.js`, `137_casing_aesthetic_component_routes.js`, and `142_late_tier_material_economy_completion.js` spread casing and manufactured-part requirements across automation, logistics, electronics, and utility blocks. The first-pass shared intermediate set is intentionally narrow: brass Create control parts use `kubejs:brass_control_assembly`, sealed fluid/gas infrastructure uses `kubejs:airtight_fluid_module`, late electrical blocks use `kubejs:electrical_control_module`, and impossible-tier AE2 control blocks use `kubejs:ae_logic_package`.

Do not add a simple crafting recipe for a component that bypasses a cased or manufactured route. Benign aesthetic or low-power variants are acceptable only when they do not shortcut a stronger machine surface.

## Loot, Coins, Wares, And Trades

Coins are defined in `global.BTM_COIN_TIERS`: copper, zinc, iron, industrial iron, brass, gold, and platinum using Create Deco coin items. `35_villager_trades/10_coin_villager_trades.js` replaces village trades with dotcoin purchases and lossy coin exchange.

Villager and wandering-trader markets are recovery and route-planning support, not renewable material factories. Their registration helper rejects raw/geologic/material buy results such as stone, ores/metals, redstone-class dusts, Botania/Blood/Ars matter shortcuts, AE2 sky stone/certus, and core Create material components; grown foods, fibers, animal products, and selected expedition drops can still participate in the coin lane.

Loot is treated as a crafting surface:

- `20_world_chest_coin_tiers.js` injects tiered coin rewards into world chests.
- `30_global_loot_progression_scrub.js` removes creative, netherite, flight, global-bypass items, and high-tier Iron's Spells books/orbs/inks from random loot; selected high-tier Iron's scroll tables also have scrolls removed while low-tier discovery remains possible.
- `40_emerald_loot_coin_replacement.js` replaces emerald currency loot with coins in chest, entity, package, and wares tables while excluding block ore drops.
- `kubejs/data/wares/` contains current Wares package and agreement loot tables.

Trades should support recovery and route planning without replacing factories, metallurgy, or chemistry.

## Quests

Quest generation is driven by the internal quest-book generator and exported generated state under `generated/ftbquests/`. The generator retains future/candidate quest definitions, but only installed manifests, bundled jars, and emitted current quest files are source truth. When quest intent changes, update this doc or `progression.md`, then regenerate and validate the generated quest content.

Quest authoring uses stable chapter and node keys with explicit stage, icon, position, body, tasks, rewards, dependency, source tag, mod tag, optional-branch, FTB-export, and icon-path metadata where needed. Supported task shapes are item, fluid, and entity tasks; rewards are item-shaped unless an exporter explicitly adds more. Generated quest/site outputs are build products, not living documentation.

Explosion Overhaul helper files are config surfaces, not docs. `DestroyingBlacklist.json` lists crater-immune blocks, `GlassBlacklist.json` lists blocks exempt from glass breaking, and `ExplosionSourceBlacklist.json` maps entity IDs to `DEFAULT`, `VANILLA`, `NO_DESTRUCTION`, or `NO_DESTRUCTION_GLASSWORKS`. These JSON files must remain strict JSON because invalid syntax causes the mod to fall back to defaults.
