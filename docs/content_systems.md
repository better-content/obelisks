# Content Systems

## Recipe Authority

KubeJS recipe overrides are the authoritative content surface. The active server recipe passes live under `kubejs/server_scripts/20_recipe_remove/`, `30_recipe_replace/`, `35_villager_trades/`, `40_recipe_add/`, `50_loot/`, and `60_worldgen/`.

Progression parenting and acquisition policy are now audited through four explicit manifests in `kubejs/config/`: `tech_parenting.json`, `magic_parenting.json`, `economy_acquisition.json`, and `surface_registry.json`. When a new craftable, reward surface, or recipe type is introduced, those manifests must remain in sync.

Important policies:

- Remove easy metal compression and raw nugget/ingot/block liquidity.
- Replace vanilla valuables in high-impact recipes with manufactured parts, casings, slates, alloys, plates, circuits, or terrain-gated materials.
- Keep easy hand-stacked automation and furnace metal shortcuts out of the grid/furnace: `145_vanillish_recipe_expert_pass.js` routes ordinary engineering to Create assembly/compaction and magic or alchemy workstations to Blood Magic alchemy. `80_recipe_policy/10_no_complex_grid_defaults.js` is the late guard for complex defaults: ordinary `3x3` and smaller core-infrastructure finished goods should resolve to crafting-table assembly that spends manufactured intermediates, while larger milestone assemblies should be explicitly justified instead of defaulting to a Create mechanical-crafter recipe. Shapeless tech defaults still reroute mainly to Create mixing, and small magic defaults still prefer Blood Magic alchemy.
- Remove teleportation, chunk-loading, creative, infinity, and package-wormhole bypasses unless explicitly re-authored.
- Keep recipes Rhino-safe and deterministic under `kubejs:*` IDs.

Dimension travel is intentionally narrow: Dimension Drink and Creating Space rocket routes are the only authored cross-dimension surfaces. Direct portal/key recipes, portal structures, and JEI/EMI visibility for those route items should stay disabled unless a route is deliberately re-authored through one of those two surfaces.
Current Dimension Drink shrine generation is structure-set driven rather than biome-modifier feature driven. The procedural site design embeds each raised altar into a copper-framed square junction court, uses packed-mud paths and relic/trophy dressing as the ancient interdimensional language, and no longer registers or places grave-soil tiles. Shrine spacing is 30 with separation 9, roughly doubling shrine frequency from the earlier 42/12 spread. The authored early font set is Nether, Aether, Undergarden, and Otherside; the removed sky-dimension mod and End font access are not active content. Returning from a font run reapplies the drink's Slowness IV and Darkness I for one second.
KubeJS layout remains load-order grouped by responsibility. `startup_scripts/00_boot` is for shared globals/helpers, startup item/block registration lives under startup item/block domains, and global startup behavior toggles live under startup globals. Server scripts use `10_tags`, `20_recipe_remove`, `30_recipe_replace`, `35_villager_trades`, `40_recipe_add`, `50_loot`, `60_worldgen`, `70_spawn`, `80_recipe_policy`, and `90_dev_debug`; keep `90_dev_debug` empty for release. Client scripts own JEI/EMI visibility, tooltips, and client-only presentation.

The live FTB Quests repo surface keeps `Basic Tools` and `Metals and Metal Tools` in their progression groups, collects unfinished progression chapters under `Work in Progress`, and carries a separate `Completionist` chapter group under `config/ftbquests/quests/chapters/` with scaffold chapters for consumables, potion effects, enchantments, TCon weapon families, plants, and armour sets. The completionist chapters are exhaustive starter stubs meant for in-place authoring refinement later, not polished progression chapters: collectible categories use broad item-task coverage, while effect and enchantment coverage uses checkmark quests with runtime/source hints instead of brittle NBT-perfect tasks.

## Materials And Chemistry

Cross-mod standardization is moderate rather than total:

- Collapse exact duplicate physical materials into one canonical family when the pack already has a clear owner. Mahogany is the active case: `146_hexerei_mahogany_to_natures_spirit.js` rewrites Hexerei mahogany inputs into `natures_spirit` mahogany.
- Standardize generic feedstocks through tags and shared substrate items where possible: planks/logs, generic glass, common sheets/plates, silica-bearing feedstocks, and chemistry precursors.
- Keep mod-native proof reagents distinct. Blood Magic slates and orbs, Ars source items, Malum spirits, Occultism attunement materials, Goety cursed matter, AE2 certus/fluix/sky stone, PneumaticCraft PCB stages, and OC2R wafers should interoperate in recipes without collapsing into generic substitutes.

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
Containment hardware is infrastructure, not feedstock: `latent_chemlib:sealed_chemical_cell`, gas tanks, and similar vessel parts should gate or host sealed chemistry, but authored chemistry routes should spend the actual gas, acid, seal, slate, or electrode input rather than consuming the vessel itself batch after batch.

The active pack carries a narrow set of standalone KubeJS crafting intermediates where the authored graph needs explicit manufactured subassemblies: pressure seals, compressor cores, control modules, impossible-circuit parts, era support modules, and selected chemistry or magic components. Reusable processing media, such as grinding balls for the Realistic Ores routes, remain valid registered components. Machine casings are reserved for machine, logistics, storage, and control bodies; non-producing support, wearable, decor, or convenience items should inherit their era through machine-made support intermediates rather than consuming casings directly.

Non-grown infinite matter is not an authored resource source. `30_remove_items.js` removes passive ore/matter generators such as Occultism miners, Blood Magic dimension drink, Ars conjured islands/fluid glyph routes, and Create Diesel lava fermentation. Create bottomless draining and finite-water biome refills are disabled in config; villager buy restocks only skip knowledge and deep-progression outputs such as experience bottles, echo shards, and sculk catalysts in `35_villager_trades/10_coin_villager_trades.js`. Renewable grown sources such as crops, trees, animals, and ordinary biological drops remain valid economy inputs.

The lava-depth material loop is a late exception within the Overworld geology stack. Tectonic extends terrain to Y -128; `datapacks/realistic_ores_lava_depths` places only lava-exposed Realistic Ores osmiridium lava sulfide in the Y -128 to 0 band. Osmiridium feeds Create washing, TCon ore melting, acid/ball chemistry, Protection Pixel Tosaki gear, and selected post-AE2 utility. Uranium and thorium are unrelated full-height, rock-hosted strategic ADLODS deposits.

Vanilla Overworld ore placed features are removed by `datapacks/worldgen_compat_fixes`, and representative vanilla ore value is folded back into Realistic Ores acid/ball outputs through explicit deposit/solvent/media extras. Realistic Ores also owns gravel ore coverage: `defaultresources/excavated_variants` registers gravel as an Excavated Variants substrate, `defaultresources/excavated_variants/excavated_variants/variants/realisticores.json5` emits `excavated_variants:gravel_*` variants for custom deposits, and `datapacks/worldgen_compat_fixes/data/realisticores/worldgen/configured_feature` adds gravel replacement targets to the Realistic Ores stone features.

## Create And Tinkers

Tinkers establishes seared/scorched metallurgy before Create authority. Create addon integration is handled through `121_create_stack_integration_gates.js`; PNCR compression gates in `122_pneumaticcraft_create_pressing_gates.js` make compressed iron and compressed stone Create pressing outputs and remove pressure/explosion shortcuts. Core machine blocks now default to ordinary shaped assembly from manufactured parts and casing tiers, and the active pack content no longer authors Create mechanical-crafting recipes. TCon remains the molten metallurgy surface, Blood Magic alchemy owns magic work, and PNCR pressure or assembly owns late electronics/circuit completion.

`50_loot/50_player_kill_coin_drops.js` awards one copper coin for every non-player living entity killed by a player, including player-fired projectiles. Campaign pillagers keep their separate strength-scaled coin bundles, so the surface threat remains a premium combat payout rather than being flattened into the global baseline.

The first hand tools are authored TConstruct stacks: a hand axe crafted from flint, PVJ bones, or PVJ rocks plus Farmer's Delight straw and a stick, plus a butcher knife crafted from flint, PVJ bones, or PVJ rocks plus a stick. Those same inputs work in the TConstruct part builder: flint keeps its native flint identity, PVJ bones map to bone, and PVJ rocks map to the stone rock variant. The pack-owned no-tree-punching gate applies only to logs and accepts Forge-tagged axes; normal terrain, stone, ores, plants, leaves, and decorative blocks use their ordinary harvesting behavior. The former exhaustive Realistic Hands policy is quarantined outside runtime resources.

The butcher knife consumes durability when it successfully clears grass, tall grass, ferns, or large ferns.

Installed TConstruct tool add-ons broaden the authored tool and weapon surface without returning to disposable vanilla-tier tools. Additional Weaponry and Battle Spades provide the current primitive/survival+ edge; Tinkers' Things, Katanas, Rapier, and Weaponry add halberd, staff, chisel, shortbow/blowpipe, katana, shuriken, rapier/estoc, greatsword, lance, and pike families. Better Combat weapon attributes are pack-authored under `kubejs/data/*/weapon_attributes/` for these added tools so animation categories stay explicit.

`60_vanilla_tools_to_tcon_heads.js` removes and hides vanilla-shaped pickaxe, axe, shovel, sword, and hoe outputs from Minecraft and installed tool-clone mods, plus disposable material-tier knives, mattocks, saws, spears, daggers, and battleaxes where they duplicate the vanilla tool lane. Existing vanilla tool inputs are remapped to TConstruct parts where recipes still need that semantic role; player-facing tool progression should remain TConstruct-authored rather than disposable material-tier clones.

Create trains and physical logistics are a first-class progression lane. Package teleportation remains removed until redesigned. The bundled `create_train_fuel_scaling` addon keeps Create's normal powered-top-speed fuel rate but scales drain exponentially by actual train speed, so slower local routes are cheaper and high-speed routes pay a heavier fuel premium.

Valkyrien Skies transport extends that physical-logistics thesis without flattening it. Eureka wooden ships are a primitive post-Part-Builder exploration hook and use material-bearing TConstruct handles, blades, and repair kits instead of metal. Trackwork land propulsion consumes railway casing and precision mechanisms beside Create trains. Aether/brass opens unpowered gliding, while sealed Eureka balloons and functional Clockwork flight controllers require both native Aether matter and the Airtight casing tier.

`123_more_red_primitive_circuitry.js` makes More Red the primitive electronics layer. Red alloy is a terrestrial Create mixing product, red alloy wire is pressed from that alloy, and the soldering table is built from andesite-tier Create parts. Later circuit recipes in Power Grid, PneumaticCraft, OC2R, AE2, and redstone-bearing Create controls consume More Red wire/diodes/gates before escalating to Power Grid integrated circuits. `143_circuit_pncr_assembly_authority.js` makes the finished circuit step a PNCR assembly laser/drill operation: upstream processes can prepare boards, traces, wafers, or printed processors, but completed PCB, Power Grid, OC2R, AE2, and impossible-circuit outputs come from PNCR assembly.

K-Turrets belongs to that same electrical-era defense lane, not to untiered survival crafting. Its turret, drone, ammo, and upgrade outputs should inherit the `electrical` tech era alongside OC2R/Power Grid surfaces unless they are explicitly re-authored to an even later machine route.

Chemistry alternates respect that boundary. Create, Blood Magic, and PNCR pressure routes may prepare etched boards, doped wafers, capacitors, transistors, printed AE2 precursors, ceramic substrates, and trace chemicals, but finished circuit outputs remain under the existing PNCR assembly authority for their tier.

## World Physics

Realistic Block Physics stays explicit-definition only in `config/rbp/world_definitions/overworld.toml`; the default block definition remains empty so non-solid blocks are not swept in by fallback physics. The generated `config/rbp/block_definitions/generated_pack_solid_blocks.toml` surface comes from the current runtime block audit plus RBP IDs, giving pack solid/collision-like blocks broad coverage while excluding bedrock, Dynamic Trees-managed namespaces, virtual/control blocks, plants/fluids, and most attached or support-owned blocks. Known explicit overrides matter: Dynamic Trees rooty soils are dirt-profile physics blocks, and `quark:stick_block` belongs to the wood profile rather than generated stone/solid profiles so placed sticks remain axe-breakable. RBP is tuned for lightweight physical feedback rather than strict structural engineering: all block definitions now allow diagonal attachment and use at least `BeamStrength = 0.9`, preserving broad stability for generated structures while still allowing physics when supports are disturbed.

RBP coverage should continue as explicit allowlists by profile, not broad fallback physics. Solid generated candidates include terrain mass, construction blocks, storage/metals, solid machine bodies, utility blocks with real block bodies, FramedBlocks solid construction forms, pack-owned casings/crates, and normal modded leaves outside Dynamic Trees. Lifecycle, support, admin, and attached decor blocks should not enter the generated solid sweep; if they need physics at all, keep them in narrow explicit support profiles like the current door, bed, miscellaneous, ladder, or flower-pot style definitions. Any broad RBP expansion needs a generator/audit pass plus fresh runtime registry or collision evidence before acceptance.

## Spatial Threat Model

Hostile pressure is authored as a terrain and route problem, not a simple night-cycle timer. Normal surface spawns are reduced, but ordinary hostiles should not spawn directly under open sky day or night. Covered ground, caves, and other underground-adjacent spaces remain active hostile feeders; those mobs persist through daytime and can leave caves to pursue nearby players on the surface. The ambient monster cap is 84, minimum hostile follow range is 48 blocks, and Zombie Awareness sensing is bounded to 40 blocks so nearby terrain delivers pressure without importing most enemies from several chunks away. Daylight reduces direct spawn injection, not existing-threat pressure.

Pillager Campaigns follows the same rule. Warbands stage away from the player and path across the world into contact, so settlement defense depends on line of sight, perimeter control, cave sealing, walls, elevation, and route management rather than on surviving a fixed night window. Difficulty should feel spatial: the world gets more dangerous when nearby terrain can deliver enemies to you, not merely because the clock advanced.
Campaign-spawned pillagers are also an authored loot surface rather than generic attrition trash: the `pillagercampaigns` runtime now forces 100% equipment drop chance on every carried gear slot, so killing a squad or warlord always yields the exact weapons, armor, banners, and offhand items they were using. Player-caused kills on those campaign enemies also pay Create Deco coin bundles whose count and highest unlocked tier scale from the current warband strength, with captains and warlords paying larger, rarer bundles than ordinary followers.

Vertical danger is also explicit. Born in Chaos monsters are confined to the Overworld below Y 0, making the deep band a separate combat regime rather than a generic cave extension. The lava-depth ore route in `datapacks/realistic_ores_lava_depths` is therefore both a geology gate and a survival-equipment gate: osmiridium lava sulfide recovery is intended to require prepared lava diving, with Protection Pixel Tosaki gear as the expected late solution.

## Burnt Compatibility

Burnt compatibility is now split into three maintained surfaces: generated compatibility block tags under `kubejs/data/{burnt,minecraft,forge}/tags/blocks/`, explicit false-positive exclusions in `tools/burnt_coverage_block_tag_exclusions.json`, and downstream validation behind the Kotlin-backed `tools/bc internal validate-burnt-coverage` and `tools/bc internal sync-burnt-coverage-tags` paths for the `config/adpother/Emitters/burnt$*.cfg` and `config/adpother/Breakables/burnt$burnt_blocks.cfg` consumers. The generated pass keeps manual tag values intact and treats `burnt:grass_blocks` as an audited/generated surface instead of a tiny hand-maintained list.

This pass only owns first-order compatibility tags such as `burnt:plants_will_burn`, `burnt:grass_blocks`, `burnt:fire_resistant`, and the shared vanilla or forge wood, leaf, crop, carpet, and mushroom tag families Burnt consumes in practice. Burnt-native transient or output-state tags such as `burning_*`, `smoldering_*`, `wood_fire`, `stairs_fire`, `sooty_*`, and `burnt_*` remain upstream-owned unless a concrete regression proves otherwise.

## Blood Magic And Body Systems

Blood Magic remains one of the two authored dirty-magic spines rather than the universal parent of every magical system. `40_blood_orbs_from_still_beating_hearts.js` removes default Blood Orb altar recipes and replaces them with level-threshold heart-key recipes, including a direct still-beating-heart fallback for the first weak orb. `82_blood_magic_lifeforce_rework.js` makes the first Blood Altar heart-bound and requires common Otherside proof through `deeperdarker:cobbled_sculk_stone`, keeps rune escalation costly, and keeps sacrifice helpers deeper in the tree. `58_blood_magic_manual_create_yields.js` adds LP-paid manual batch alternatives for essential Create materials without replacing factory automation.

The death overhaul is a body-system progression surface. `defaultconfigs/configurabledeath-server.toml` keeps carried items and food state on death while dropping XP, so deaths are not balanced around random inventory scatter but still erase the current life's vanilla experience. `rpg-stats` owns the life ledger: `PointAwarder` grants power from new XP levels above `lifePeakLevel`, `CommonForgeEvents` clears allocations and unspent points on death, and `StillBeatingHeartData` creates the respawn-delivered `rpgstats:still_beating_heart` with that life's level. The intended pressure is "how long and how far did this life get" plus the return to the locked spawn.

Still-Beating Hearts use the highest empty main-inventory slot, then empty ender storage, and otherwise remain pending; delivery never shifts existing inventory. Revival is the pack-owned "down but not out" layer in front of that death pipeline: eligible lethal damage produces a 60-second prone-crawl state, one helper can complete a hold-to-revive channel in five seconds, additional helpers contribute additively, and interrupted progress decays after a one-second grace period. A revival returns the player at one heart with five seconds of weakness and slowness. Bleed-out, give-up, environmental death, disconnect, and an explicitly chorded player finisher all resolve through normal death, so the life ledger, Still-Beating Heart, and permanent Class Selector respawn remain authoritative.

Living-attacker damage cannot finish a downed body; environmental damage can. Players deliberately finish a downed target with Alt+Shift+Attack, which is server-revalidated for target, range, line of sight, and attribution. Revival uses no global marker or glow: the prone body and a quiet 32-block positional sculk whisper are the rescue signal. Client state is removed directly by authoritative transition packets on revival or death and is also pruned when its player entity leaves the client level, eliminating the stale-overlay compatibility patch previously required for PlayerRevive.

Permanent-ish spawn is owned by Class Selector onboarding and the no-moving-spawn startup hook. Players lock a starting site during class or embark selection; ordinary spawn changes are cancelled, bed and respawn-anchor updates are rejected while the class spawn is locked, and respawn teleports back to the stored `classselector:respawn_*` point with mob repel protection plus scripted sound and sculk-particle FX. Any future player-facing spawn relocation should be late-game content, not a bed-level convenience.

Unfinalized players receive a private list of other unfinalized players and render those tracked peers glowing; completed players are excluded. Respawn protection discards every hostile inside the exact 64-block sphere without loot, XP, death events, or inventory mutation, while Pillager Campaigns reconciles purged campaign mobs and warlords into paused or dormant state.

Early hydration includes `bcfixes:rain_collector`, an isolated plank-tier vessel implementation intended to remain easy to move into its own mod. Exposed collectors gain one of four charges during rain, provide Thirst hydration/quench or fill supported containers, and consume a charge only on successful transfer. Snow blocks anywhere in the 3×3×3 cube centered on a lit campfire melt to water after a bounded delay; the campfire remains lit during the conversion. RBP no longer treats snow layers as generated solid physics blocks.

Pollution of the Realms no longer receives emissions from player block-breaking or ordinary hostile death/burning hooks; machine and automation paths remain. Pollution dust settles as Supplementaries ash layers, which are excluded from RBP physics.

Food and potion identity are handled through `70_food_potion_reagents.js`: food blocks discover/refine effect identity, and the brewing stand combines processed extracts rather than serving as the main discovery ladder. Body-survival mods and configs include Diet, Thirst Was Taken, Cold Sweat, Diminishing Health defaults, Revival, and related KubeJS tooltip/content support. Cold Sweat climate authoring is Celsius-first in `config/coldsweat/world.toml`; active vanilla, Nature's Spirit, Aether, Undergarden, Deeper and Darker, and Fallout Wastelands biome surfaces have explicit spatial ranges to avoid abrupt local biome-boundary cliffs while preserving harsh cold, scorched, deep, and wasteland regions. Spring, summer, and autumn stay intentionally mild, while winter remains a meaningful but bounded Serene Seasons cooling penalty.

Grown-material chemistry is also a production lane. Crop, tree, animal, bone, hide, feather, honeycomb, and venom acid/ball outputs can be spent on fertilizer, feed, leather/string/slime alternatives, potion-adjacent reagents, and Blood Magic/magic salts. These routes are renewable but infrastructure-heavy; they are not a passive replacement for finite geology.

Non-village natural crop and edible-plant diversity is relocated into Undergarden forage by `datapacks/datapack_foraging_everywhere`. Undergarden is the pantry and body-survival dimension, not the Blood Magic entry owner. Village farms, Wares, and villager food routes remain the explicit surface exception; ordinary Overworld biome forage should not be the first renewable source for specialty crops.

Starting loadouts are owned by the fixed class selector in `config/classselector/kits.json`; `config/classselector/embark.json` is set to class mode and remains inactive point-buy fallback data. If embark mode is re-enabled later, its support pool should stay narrow: hydration, climate scouting, light, route marking, rope, a small vanilla rail start, and basic rations. Starting choices must not include starter tools, armor, logs/planks, functional crafting blocks, generic storage, coins, scuba gear, gliders, recovery compass routes, renewable specialty crop starts, ready-made TNT or TNT inputs, Protection Pixel gear, AE2, PNCR pressure items, Blood Magic LP/orbs, Create trains, Wares routes, or other missing-logistics progression before those systems provide power.

`formal_magic_domains.json`, `126_cross_magic_irons_spellcraft.js`, and `127_ars_manuscript_progression.js` are the formal spell-access surface. Ars and Iron's are separate systems with shared infrastructure and inks: Ars composes glyphs while Iron's writes fixed school spells. Empty books and authoring stations are intentionally early. Common through legendary ink requires progressively stronger proof from any dirty route, while native domain reagents prevent one route from exposing every glyph family or Iron's school.

The current slate order is deliberate and should stay easy to audit in recipes and docs:

- Blank Slate: first Blood work, Malum, and common formal-ink proof
- Reinforced Slate: Hexerei and low-tier cross-magic utility
- Infused Slate: Occultism bridge content, Ars source handling, and rare formal-ink proof
- Demonic Slate: Goety operations, epic formal-ink proof, and stronger hybrid magic
- Ethereal Slate: legendary formal-ink proof plus programmable, networked, or post-AE2 hybrid magic

## Casings And Manufactured Parts

The casing economy is the cross-mod machine-frame system. `99_machine_casing_progression.js`, `130_manufactured_plate_recipe_pass.js`, `136_machine_casing_ecosystem_expansion.js`, `137_casing_aesthetic_component_routes.js`, and `142_late_tier_material_economy_completion.js` spread casing and manufactured-part requirements across automation, logistics, electronics, and utility blocks. Direct casing inputs are limited to production, logistics, storage, and control bodies. Support gear, passive components, decor, and convenience items use era support intermediates such as `kubejs:brass_utility_assembly`, `kubejs:electrical_instrumentation_module`, `kubejs:space_expedition_kit`, and `kubejs:raw_impossible_storage_matrix`; those support parts are produced on machine surfaces unlocked by the relevant casing.

Do not add a simple crafting recipe for a component that bypasses a cased or manufactured route. Benign aesthetic or low-power variants are acceptable only when they do not shortcut a stronger machine surface.

## Loot, Coins, Wares, And Trades

Coins are defined in `global.BC_COIN_TIERS`: copper, zinc, iron, industrial iron, brass, gold, and platinum using Create Deco coin items. `35_villager_trades/10_coin_villager_trades.js` replaces village trades with dotcoin purchases and lossy coin exchange.
Pillager Campaigns is now part of that coin economy too: active campaign kills are a combat payout surface, not just incidental loot, and their bundles scale upward with the warband's current adaptive raid strength rather than using a flat mob table.

Villager and wandering-trader markets are recovery and route-planning support, not renewable material factories. The current trade pass leans early and midgame on hydration, field utility, walls, signs, minecarts, rope, boats, and similar settlement stock, while keeping deep-progression knowledge outputs like experience bottles, echo shards, and sculk catalysts out of normal buy restocks.

Loot is treated as a crafting surface:

- `20_world_chest_coin_tiers.js` injects tiered coin rewards into world chests.
- `30_global_loot_progression_scrub.js` removes creative, netherite, flight, global-bypass items, and usable Iron's scrolls, inks, or spellbooks from random loot so formal spellcraft begins through authored reagents.
- `40_emerald_loot_coin_replacement.js` replaces emerald currency loot with coins in chest, entity, package, and wares tables while excluding block ore drops.
- `kubejs/data/wares/` contains current Wares package and agreement loot tables.

Trades should support recovery and route planning without replacing factories, metallurgy, or chemistry.

## Quests

The live quest book is hand-authored under `config/ftbquests/`, especially `config/ftbquests/quests/chapters/`. That tree is the current source of truth for chapter layout, quest text, tasks, rewards, and progression presentation. When quest intent changes, update this doc or `progression.md`, then validate the live `config/ftbquests/` content.

Progression-chapter quest text is for first-time players, not for internal pack notes. Each player-facing node should tell the player what to do now, why it matters now, and what concrete uncertainty it clears. Titles and task labels should name the object or action directly. Descriptions should prefer operational guidance, route planning, and next-step clarity over pack-thesis language, TODO phrasing, or abstract commentary about what a chapter is supposed to feel like. Completionist chapters remain scaffold/reference surfaces unless they are explicitly promoted into guided progression.

Quest authoring uses stable chapter and node keys with explicit stage, icon, position, body, tasks, rewards, dependency, source tag, mod tag, optional-branch, FTB-export, and icon-path metadata where needed. Supported task shapes are item, fluid, entity, and dimension tasks where installed FTB Quests surfaces support them. `generated/ftbquests/` and generated site outputs are artifact surfaces only, not living documentation or the authoring source.

Explosion Overhaul helper files are config surfaces, not docs. `DestroyingBlacklist.json` lists crater-immune blocks, `GlassBlacklist.json` lists blocks exempt from glass breaking, and `ExplosionSourceBlacklist.json` maps entity IDs to `DEFAULT`, `VANILLA`, `NO_DESTRUCTION`, or `NO_DESTRUCTION_GLASSWORKS`. These JSON files must remain strict JSON because invalid syntax causes the mod to fall back to defaults.
