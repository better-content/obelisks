# Progression

## Spine

The pack has two primary crafting spines, one independent magic lane, and one pressure spine:

- Tech spine: Tinkers seared/scorched metallurgy into Create andesite/brass automation, then Power Grid, OC2R, Creating Space, and AE2-local intelligence.
- Magic spines: `Dimension Drink -> Hexerei -> Occultism` and `Blood Magic -> Malum -> Goety`, with Blood Magic still supplying shared slate proofs where recipes need explicit authority.
- Independent magic lane: Ars Nouveau opens as an early teaser book, but real spell power comes from manuscript-authored glyph unlocks fed by both dirty spines plus control/electrical precision.
- Adventure spine: dimension_drink, dimensions, combat, villages, wares, and coins provide route pressure and recovery options without replacing production.

Local logistics stays first. Create trains and physical routes should matter before AE2 dominates a site, and OC2R is the intended intersite information bridge.

The canonical progression manifests now live in `kubejs/config/tech_parenting.json`, `kubejs/config/magic_parenting.json`, `kubejs/config/economy_acquisition.json`, and `kubejs/config/surface_registry.json`. Recipe scripts and reward surfaces are still authored in KubeJS/config/data files, but tier/branch/policy truth is audited against those manifests. The contract generator treats both runtime recipe outputs and authored KubeJS recipe/gate scripts as evidence, so milestone gates that mutate existing recipes still receive explicit era or Blood-parent entries.

Combat pressure is spatial first, temporal second. Ordinary hostile spawns are toned down under open sky, but cave and covered-space spawns persist through the day, use longer pathing ranges, and are expected to leave underground spaces to hunt the player. Pillager campaign forces also stage away from the player and path in from the surrounding terrain instead of materializing as point-blank time checks. Safe play should come more from settlement siting, cave control, walls, sightlines, patrol routes, and route discipline than from simply waiting for daylight.

Pillager campaign pressure is adaptive by warband rather than global time scaling. New warbands open at the gentlest strength tier, each successfully defeated raid increases that warband's future raid strength by 1, and each raid that kills a player reduces its future strength by 1 while ending that active push for roughly a day and marking the death site with the warband's banner. Players also get a fixed five-minute no-raid grace window after their initial spawn and after every respawn, but that timer only starts once they are actually back in survival; creative and spectator players are never valid campaign targets, and any active push against them pauses until they return to survival and their grace expires. This keeps successful settlements under escalating surface pressure while giving losing players an automatic easing path instead of immediate repeat pressure. Campaign squads materialize only on deterministic dry-land sites in loaded chunks near the intended approach point; coastal failures stay retryable instead of falling back to boats. Warbands persist a fixed archetype so rally warlords and campaign squads keep the same visual/mechanical identity, with warlords tuned as large armored boss targets. Loaded-chunk rally warlords are fixed sentries once materialized rather than roaming patrol leaders. Rally drift remains an off-screen pressure mechanic only: warbands do not relocate their rally while any chunk on the current-to-destination drift path is already loaded. Those same strength tiers now feed the coin lane directly: player kills on campaign followers, captains, and warlords award progressively larger and rarer coin bundles as a warband hardens.

Tier design should feel like conquest rather than checklisting: each new tier needs a new resource domain plus a signature transformation, not just a renamed ingredient. Matter should keep memory of where it came from, so geology, death, heat, pressure, distance, and biological growth remain visible in downstream recipes instead of collapsing into generic dusts.

Magic should now read as two dirty parent traditions feeding one later clean formalism. Fonts leads into Hexerei and then Occultism's attunement and entity bargaining. Blood Magic leads into Malum and then Goety's dangerous command work. Ars Nouveau is no longer a separate light-ritual branch; the novice book appears early, but meaningful glyph access is spread across authored manuscripts crafted throughout the pack.

## Death Loop

Death is a structured life-length and location penalty, not a random item-loss pressure. `defaultconfigs/configurabledeath-server.toml` keeps inventory, armor, hotbar, mainhand, offhand, food, and saturation on death, with no durability loss on kept items. The costly loss is the current life's RPG Stats power and the trip back to the locked spawn.

RPG Stats awards one stat point for each new XP level above `lifePeakLevel`. On death, `generated/custom-mod-sources/rpg-stats` clears unspent points and allocations, baselines the next life to the post-death XP level, and delivers a level-stamped `rpgstats:still_beating_heart` on respawn when Blood Magic is present. The heart records how far that life got and then feeds the Blood Magic bridge; it is the high-score token for the run, not a bulk currency.

Spawn is intentionally sticky. New players use fixed Class Selector onboarding to lock both starting supplies and a starting site. `config/biomespawnpoint/spawnbiomes.txt` is constrained to temperate grass/forest starts, with `kubejs/data/kubejs/tags/worldgen/biome/temperate_spawn_biomes.json` documenting the same target set for datapack-side consumers. `kubejs/startup_scripts/20_globals/10_immobile_spawn.js` cancels ordinary spawn changes, and Class Selector persists `classselector:respawn_*` coordinates, refreshes them before death, rejects bed and respawn-anchor style changes while locked, and teleports the player back there on respawn with protection plus scripted sound and particle FX. Player-facing spawn relocation should remain a very-late-game exception; normal beds are not a progression bypass.

Starting identities should read like jobs with partial truths, not solved classes. Useful loadout space is route support, hydration, light, food variety, low-value trade, animal handling, and camp utility. Unsafe loadout space is production machinery, storage systems, strong tools, raw metals, casing/circuit materials, explosives, magic/network starts, armor, and anything that skips the first logistics problem.

## Dimension Drink Graph Starts

Dimension Drink/obelisk dimensions are origin proofs for outside reward systems. A valid edge needs native dimensional resources, hazards or structures, a first meaningful proof item, and a system whose entry feels earned there. The dimension is not a self-label and does not take ownership of the main tech or magic spine.

Current graph-start recipe gates are in `kubejs/server_scripts/30_recipe_replace/155_dimension_proof_graph_starts.js`. Existing Nether proof lives in the TCon grout pass, Aether owns early air mobility, Undergarden owns food/forage/body-survival pressure, and Otherside is the origin for sculk, echo, soul, and resonance matter refined by Blood Magic.

Dimension travel has two authored surfaces only: Dimension Drink from `dimensiondrink-1.0.0.jar` plus `config/dimension_drink/`, and Creating Space rocket graph entries under `kubejs/data/*/creatingspace/rocket_accessible_dimension/`. Direct portal/key routes are removed or hidden by `170_space_dimension_access_gates.js`, `40_hide_quarantined_systems.js`, `config/twilightforest-common.toml`, and `config/structurify.json`. The authored early font set is Nether, Aether, Undergarden, and Otherside; End font access is removed while strongholds remain disabled. Font shrine structure-set spacing is now 30 with separation 9, making shrines roughly twice as common as the earlier 42/12 spread. Lost Cities, Twilight Forest, and Fallout Wastelands are space-routed adventure dimensions.

| Dimension | Graph Start Opened | Proof Route |
| --- | --- | --- |
| Nether | TConstruct metallurgy proof edge | Netherrack grout and Nether heat/material recipes prove the first serious molten-material route. This keeps TCon rooted in the tech spine while letting Nether travel supply its first hard proof. |
| Undergarden | Food, forage, pantry, and body survival | Shiverstone, depthrock, cloggrum, regalium, blood globules, and Undergarden forage support the survival pantry and body-system loop without owning Blood Magic entry. |
| Aether | Air travel and expedition mobility | `aether:blue_aercloud`, `aether:skyroot_stick`, `aether:zanite_gemstone`, `aether:aerogel`, `aether:quicksoil_glass`, and `aether:ambrosium_shard` enter Hang Glider wings/frameworks and Immersive Aircraft sail/hull/propeller components. |
| Otherside | Magic material origin | `deeperdarker:cobbled_sculk_stone`, gloomslate, echo wood/shards, soul dust, sculk bone, soul crystal, resonarium, and reinforced echo shards become the common substrate for Blood-refined non-Hexerei magic materials. |

The removed sky-dimension mod is no longer active pack content. End has no authored Dimensional Font access.

Mod-specific natural ore and geode origins that are not part of the Realistic Ores deposit pass are dimension-drink content. Their Overworld and ordinary Nether biome modifiers are suppressed by `datapacks/dimension_drink_ore_relocation`, then reintroduced in Aether, Undergarden, Otherside, or Nether-obelisk target tags with Excavated Variants support for the local stone skins. Gravel is registered as a gravel Excavated Variants substrate, so gravel-specific dimension drink ores resolve to `excavated_variants:gravel_*` blocks and remain shovel-gated. This relocates raw worldgen origins only; workstation and recipe entry still follows the authored two-spine magic graph plus the independent Ars manuscript lane. JEI/EMI-facing ore origin tooltips live in `kubejs/client_scripts/15_ore_origin_tooltips.js` and should be updated with any future ore source move.

## Machine Casing Ladder

The active casing catalogue is `global.BC_MACHINE_CASING_TIERS` in `kubejs/startup_scripts/00_globals/20_progression_catalogues.js`:

| Order | Casing | Authority |
| --- | --- | --- |
| 1 | `kubejs:seared_machine_casing` | TCon seared/scorched |
| 2 | `kubejs:andesite_machine_casing` | Create andesite |
| 3 | `kubejs:brass_machine_casing` | Create brass |
| 4 | `kubejs:airtight_machine_casing` | PneumaticCraft pressure |
| 5 | `kubejs:electrical_machine_casing` | Power Grid, PNCR assembly, and OC2R |
| 6 | `kubejs:space_machine_casing` | Creating Space |
| 7 | `kubejs:raw_impossible_casing` | unfinished AE2 body |
| 8 | `kubejs:impossible_machine_casing` | AE2 and final Blood Magic |

`kubejs/server_scripts/30_recipe_replace/99_machine_casing_progression.js`, `136_machine_casing_ecosystem_expansion.js`, and related replacement passes keep high-impact machines tied to this ladder. Seared and scorched are merged into one TCon casing tier; recipes that need scorched proof consume scorched bricks/glass directly. Electrical and circuited are merged into one post-airtight electrical/control casing built from Power Grid, PNCR, and OC2R parts. Each new tier should depend on earlier tier capabilities and add a real manufacturing dependency from its own tier.

Machine casings are structural machine-frame gates, not generic era tokens. Direct casing inputs are reserved for production, logistics, storage, and control bodies. Non-producing support gear, passive components, decor/theme items, and convenience upgrades should consume era support intermediates instead; those intermediates must be manufactured on surfaces already unlocked by the relevant casing tier.

The pack currently uses a narrow set of standalone KubeJS intermediates where the recipe graph still needs explicit manufactured subassemblies. Pressure seals, compressor cores, late control modules, impossible-circuit parts, and selected chemistry or magic components remain registered; reusable processing media such as grinding balls remain registered as well. New one-off intermediates should still be avoided unless the progression docs and validation contracts are updated with the reason they exist.

## Early Chokepoints

- No Tree Punching is replaced by a Forge-side `bcfixes` first-hour gate driven by explicit `bcfixes:realistic_hands/*` tags: loose primitive surfaces stay hand-or-shovel usable where tagged, while other tagged blocks need matching tools. Surface plants and leaf-like blocks remain knife-gated through explicit tags. The first authored tools are TConstruct hand axes and butcher knives made from flint, PVJ bones, or PVJ rocks. Hand axes use two head materials plus Farmer's Delight straw and a stick; butcher knives use three head materials plus a stick.
- TConstruct tool variety comes from authored tool families rather than vanilla-tier disposable tools. Current add-ons include Additional Weaponry, Battle Spades, Tinkers' Things, Katanas, Rapier, and Weaponry; their Better Combat categories are explicit datapack attributes so halberds, katanas, rapiers, lances, pikes, greatswords, and related tools animate consistently.
- Netherrack grout keeps seared metallurgy tied to Nether-obelisk preparation.
- `create:andesite_alloy` is an alloying output, not easy nugget crafting.
- `create:deployer` gates `create:andesite_casing`.
- More Red is the terrestrial primitive circuitry layer around early Create: red alloy comes from Create mixing, wire from Create pressing, and the soldering table consumes andesite-tier parts instead of Nether/blaze ingredients.
- Vanilla-style automation such as pistons, hoppers, observers, rails, carts, and similar modded hand-stacked machinery is no longer rebuilt as pack-authored Create mechanical crafting. Magic/alchemy workstations such as brewing, enchanting, Ars apparatus, and hellforged processing still use Blood Magic alchemy instead of grid or furnace recipes. The late grid policy in `80_recipe_policy/10_no_complex_grid_defaults.js` now leaves shaped defaults in place unless they can be rerouted to Blood Magic alchemy, while shapeless tech defaults still reroute mainly to Create mixing and small magic defaults use Blood Magic alchemy.
- Finished circuit items belong to PNCR assembly laser/drill. Earlier surfaces prepare boards, traces, wafers, and printed processors; PNCR assembly completes the circuit.
- Passive Create SU sources are pushed to the andesite machine-casing tier.
- Clean water, serious extraction, and body-system recovery depend on sustainable tech rather than free early infrastructure.

Deadlock checks:

- Do not require Create andesite casing before the first TCon seared/scorched infrastructure.
- Do not require brass machinery before andesite casing is reachable.
- Do not require Nether/blaze materials for the first primitive circuit table or More Red red-alloy wire.
- Do not require AE2 storage or automation before the AE2 casing tier itself.
- If grout requires netherrack, Nether access must remain reachable before melter/smeltery dependence.
- Starting options, quest rewards, village trades, Wares, and loot must not expose future milestone outputs before their casing, slate, dimension, or route proof exists.

## Deposits And Y Bands

Deposit progression is authored through ADLODS configs, Realistic Ores tags, and KubeJS processing. Active deposit config files exist for aluminum, amethyst, ancient debris, coal, cobalt, copper, diamond, emerald, gas pockets, gold, iridium, iron, lapis, lead, nether gold, nether quartz, nickel, osmium, palladium, platinum, redstone, rhodium, ruby, ruthenium, sapphire, silver, tin, topaz, uranium, and zinc.

The starter catalogue in `global.BC_STARTER_DEPOSITS` currently names coal measures, ironstone, copper sulfide, tin, zinc, lead-zinc vein, quartz vein, and bauxite laterite. Processing should keep furnace output as a poor fallback, TCon melter/smeltery as first primary interpretation, foundry/byproduct work as better interpretation, and Create/PNCR chemistry as later material identity. Excavated gravel variants are part of the deposit surface, not a separate ore family: Realistic Ores stone configured features include gravel replacement targets, `excavated_variants:gravel_*` blocks stay shovel-mineable, and gravel substrate support lives in `defaultresources/excavated_variants`.

The late lava-diving band is Overworld terrain below Y 0, enabled by Tectonic `min_y = -64` and lava tunnels. This lower band is an authored progression zone rather than ordinary branch mining: Born in Chaos monsters only spawn below Y 0, and the lava-depth ore set is meant to be recovered as a prepared expedition with real lava-survival gear. `datapacks/realistic_ores_lava_depths` adds lava-exposed Realistic Ores uranium, thorium, and osmiridium lava sulfide in Y -64 to 0 only; the custom `realisticores:lava_exposed_ore` feature only places ore blocks that touch lava. Magma cubes are the current lava-band hazard, and Protection Pixel Tosaki gear is the intended post-AE2 diving suit for this route.

All non-grown renewable resource sources should be absent or quarantined. Geological, fluid, ore, and manufactured material growth comes from finite worldgen, authored dimension routes, lava-depth routes, loot, or processing of already-owned matter, not from passive ore rituals, bottomless pumps, conjured islands, fluid sigils/glyphs, or lava fermentation. Villager buy restocks now only skip knowledge and deep-progression outputs such as experience bottles, echo shards, and sculk catalysts.

## Magic Gates

Still-Beating Hearts bridge the death loop and body systems into Blood Magic. `rpgstats:still_beating_heart` is a milestone item, not bulk fuel. Current KubeJS adds pack-owned heart keys and Blood Orb altar recipes in `40_blood_orbs_from_still_beating_hearts.js`; the weak orb also has a direct still-beating-heart altar fallback so the first Blood Magic loop is not bricked by its own catalyst chain. `82_blood_magic_lifeforce_rework.js` makes the first Blood Altar consume the heart plus common Otherside proof from `deeperdarker:cobbled_sculk_stone`, while later altar/rune escalation remains costly.

Growables now feed chemistry through `57_grown_material_acid_ball_processing.js`. Plants, fungi, honeycomb, meat, fish, hide, bone, feather, and venomous tissue use the same solvent/grinding-ball language as Realistic Ores, so farm and animal loops produce differentiated chemical side streams rather than one generic biomass output.

The downstream chemistry pass makes those side streams matter without turning them into free matter. `60_create_chemical_transformations.js` supplies carbonate roasting, oxide reduction, leaching, precipitation, salt conversion, and gas-scrubbing loops. `61_chemical_existing_item_alternatives.js` spends chemicals on existing pack items such as grout, technical glass, explosives, Create mechanisms, PNCR pressure hardware, and shielding. `62_chemical_electronics_magic_growth_routes.js` spends chemicals on electronics precursors, magic salts, Blood Magic manual alternatives, fertilizer, feed, and biological material substitutes. `63_chemlib_full_integration_routes.js` extends that standard across guarded ChemLib element and molecule families: every registered family gets source pressure, transformation chemistry, existing-item sinks, and a Blood Magic manual yield route when its IDs exist.

Chemical alternatives can offer higher yield, earlier access with more setup, or byproduct-consuming substitutions depending on the target. Finished circuits remain PNCR assembly authority; chemistry prepares wafers, boards, printed processors, etchants, capacitors, and transistors rather than bypassing that completion step. Create recipes represent open bulk processing, grinding media, acids, precipitation, and reduction; PNCR recipes represent sealed pressure, gas handling, thermal control, polymers, and etching; Blood Magic recipes are deliberately manual LP/slate routes with better yield instead of unattended throughput.

Blood Magic slates are the side-magic authority where a recipe needs hard proof, and Otherside matter is now the shared raw substrate for non-Hexerei magic infrastructure:

- Blank Slate: first Blood work, Malum, common cobbled sculk stone, and the earliest Ars teaser/manuscript proofs.
- Reinforced Slate: Hexerei and low-tier cross-magic utility, usually paired with gloomslate or echo wood outside Hexerei's core folk identity.
- Infused Slate: Occultism bridge content, Ars source handling, stronger manuscript conversion, and sculk sensor/catalyst/shrieker or echo-shard matter.
- Demonic Slate: Goety operations, heavier Ars apparatus/glyph manuscripts, Forbidden and Arcanus, and soul dust or sculk bone matter.
- Ethereal Slate: late programmable or endgame magic using soul crystal, resonarium, or reinforced echo shard matter where installed and confirmed.

This keeps the agreed graph explicit:

- Fonts spine: Dimension Drink -> Hexerei -> Occultism
- Blood spine: Blood Magic -> Malum -> Goety
- Ars lane: early novice book, then manuscript-authored glyph unlocks fed by both dirty spines plus Create/control precision
- Otherside: common origin for Blood-refined magic matter, not a standalone magic workstation spine.

Cross-mod material standardization stays moderate:

- Exact duplicate physical materials collapse to one canonical family. The active example is mahogany, where Hexerei inputs are redirected into `natures_spirit` mahogany.
- Shared feedstocks such as planks, logs, generic glass, silica-bearing inputs, and plate/sheet tags should standardize through tags and common substrates.
- Mod-native proof reagents stay distinct. Do not flatten Blood Magic slates, Ars source items, Malum spirits, Occultism attunement matter, Goety cursed matter, AE2 certus/fluix/sky stone, PNCR PCB stages, or OC2R wafers into interchangeable "magic parts."

Do not gate guidebooks when a workstation/core item can be gated. Do not use hearts in side-magic recipe spam; use slates and authored intermediates.

Iron's Spells is integrated as a cross-magic spellcraft branch, not as an independent vanilla-crafting branch. `126_cross_magic_irons_spellcraft.js` removes the direct Iron's spellcraft outputs and rebuilds them through Blood Magic tier costs plus Ars apparatus, Hexerei cauldron, Malum spirit infusion, and Goety ritual work. Malum spirits are the shared reagent language for schools and upgrades; Occultism, Forbidden and Arcanus, Hexerei, Goety, Reliquary, and Ars reagents provide theme and tier identity. Low-tier scroll discovery may remain loot-based, but high-tier spell books, upgrade orbs, high inks, and high-tier scroll tables are scrubbed as progression bypasses.

## Late And Post-AE2

AE2 is late local intelligence, not early global logistics. `impossible_machine_casing` should mark the point where AE2-scale systems, high Sophisticated Storage control, and late utility can appear. Post-AE2 branches currently include Protection Pixel, Tome of Blood, hooks/drones/backpack utility gates, and Creating Space dimension access gates where the installed mods exist. Tome of Blood is the intended hybrid finisher here: the science side proves raw impossible matter through AE2 processors, sky steel, fluix, and sealed pressure assembly, while the magic side proves that the unstable body can be stabilized through Blood Magic, Ars source refinement, and late dark bindings.

Lava-depth osmiridium is a post-AE2 material pressure point for Protection Pixel Tosaki recipes and selected late utility. The intended read is "gear up, dive, and come back with matter the surface cannot give," not "strip-mine deeper." JEI/EMI ore-origin tooltips should make clear when a material is a normal deposit, dimension-drink origin, or lava-diving origin.

Theurgy, Psi, and Hex Casting are not active manifest entries in the current repo. Treat references to them in old reports or generator comments as candidate/future design, not current pack state.
