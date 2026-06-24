# Progression

## Spine

The pack has two primary crafting spines and one pressure spine:

- Tech spine: Tinkers seared/scorched metallurgy into Create andesite/brass automation, then Power Grid, OC2R, Creating Space, and AE2-local intelligence.
- Magic spine: Still-Beating Heart and Blood Magic orb/slate progression parent most side magic rather than letting each magic mod open independently.
- Adventure spine: obelisks, dimensions, combat, villages, wares, and coins provide route pressure and recovery options without replacing production.

Local logistics stays first. Create trains and physical routes should matter before AE2 dominates a site, and OC2R is the intended intersite information bridge.

## Death Loop

Death is a structured life-length and location penalty, not a random item-loss pressure. `defaultconfigs/configurabledeath-server.toml` keeps inventory, armor, hotbar, mainhand, offhand, food, and saturation on death, with no durability loss on kept items. The costly loss is the current life's RPG Stats power and the trip back to the locked spawn.

RPG Stats awards one stat point for each new XP level above `lifePeakLevel`. On death, `generated/custom-mod-sources/rpg-stats` clears unspent points and allocations, baselines the next life to the post-death XP level, and delivers a level-stamped `rpgstats:still_beating_heart` on respawn when Blood Magic is present. The heart records how far that life got and then feeds the Blood Magic bridge; it is the high-score token for the run, not a bulk currency.

Spawn is intentionally sticky. New players use Class Selector or embark onboarding to lock both starting supplies and a starting site. `config/biomespawnpoint/spawnbiomes.txt` is constrained to temperate grass/forest starts, with `kubejs/data/kubejs/tags/worldgen/biome/temperate_spawn_biomes.json` documenting the same target set for datapack-side consumers. `kubejs/startup_scripts/20_globals/10_immobile_spawn.js` cancels ordinary spawn changes, and Class Selector persists `classselector:respawn_*` coordinates, refreshes them before death, rejects bed and respawn-anchor style changes while locked, and teleports the player back there on respawn with protection plus scripted sound and particle FX. Player-facing spawn relocation should remain a very-late-game exception; normal beds are not a progression bypass.

## Obelisk Dimension Graph Starts

Meteor/obelisk dimensions are origin proofs for outside reward systems. A valid edge needs native dimensional resources, hazards or structures, a first meaningful proof item, and a system whose entry feels earned there. The dimension is not a self-label and does not take ownership of the main tech or magic spine.

Current graph-start recipe gates are in `kubejs/server_scripts/30_recipe_replace/155_dimension_proof_graph_starts.js`. Existing Nether proof lives in the TCon grout pass; Undergarden now remains a later deep-survival material route rather than the first Blood Altar body.

Dimension travel has two authored surfaces only: Dimensional Fonts from `dimensionalfonts-1.0.0.jar` plus `config/obelisks/`, and Creating Space rocket graph entries under `kubejs/data/*/creatingspace/rocket_accessible_dimension/`. Direct portal/key routes are removed or hidden by `170_space_dimension_access_gates.js`, `40_hide_quarantined_systems.js`, `config/twilightforest-common.toml`, and `config/structurify.json`. Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths are space-routed adventure dimensions.

| Dimension | Graph Start Opened | Proof Route |
| --- | --- | --- |
| Nether | TConstruct metallurgy proof edge | Netherrack grout and Nether heat/material recipes prove the first serious molten-material route. This keeps TCon rooted in the tech spine while letting Nether travel supply its first hard proof. |
| Undergarden | Deep survival and later magic materials | Shiverstone, depthrock, cloggrum, regalium, and blood globules remain deep-route materials for later magic and survival escalation after the first heart-bound Blood Altar is online. |
| Aether | Air travel and expedition mobility | `aether:blue_aercloud`, `aether:skyroot_stick`, `aether:zanite_gemstone`, `aether:aerogel`, `aether:quicksoil_glass`, and `aether:ambrosium_shard` enter Hang Glider wings/frameworks and Immersive Aircraft sail/hull/propeller components. |
| Everdawn | Heat/desert hydration and brewing route supplies | `blue_skies:brewberry`, `blue_skies:pyrope_gem`, `blue_skies:lunar_planks`, and `blue_skies:polished_umber` open Cold Sweat waterskins and Brewin kegs. Thirst bowls, bottles, buckets, and basic water purification remain ungated by dimensions. |

Everbright, Otherside, and End have no active graph-start mapping until their material identities are redesigned.

Mod-specific natural ore and geode origins that are not part of the Realistic Ores deposit pass are meteor-dimension content. Their Overworld and ordinary Nether biome modifiers are suppressed by `datapacks/meteor_ore_relocation`, then reintroduced in Aether, Blue Skies, Undergarden, Otherside, or Nether-obelisk target tags with Excavated Variants support for the local stone skins. Gravel is registered as a gravel Excavated Variants substrate, so gravel-specific meteor ores resolve to `excavated_variants:gravel_*` blocks and remain shovel-gated. This relocates raw worldgen origins only; workstation and recipe entry still follows the Blood-Magic-parented magic spine unless a future pass deliberately changes that spine. JEI/EMI-facing ore origin tooltips live in `kubejs/client_scripts/15_ore_origin_tooltips.js` and should be updated with any future ore source move.

## Machine Casing Ladder

The active casing catalogue is `global.BTM_MACHINE_CASING_TIERS` in `kubejs/startup_scripts/00_globals/20_progression_catalogues.js`:

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

## Early Chokepoints

- No Tree Punching is replaced by a KubeJS first-hour gate: bare hands can break only the `kubejs:hand_breakable` block whitelist and loose surfaces such as sand or gravel, while other blocks need matching tools. Surface plants and all leaf-like blocks, including Dynamic Trees leaves, are knife-only. The first authored tools are a flint TConstruct hand axe made from flint, Farmer's Delight straw, and a stick, and a flint/wood TConstruct butcher knife made from three flint and a stick.
- TConstruct tool variety comes from authored tool families rather than vanilla-tier disposable tools. Current add-ons include Additional Weaponry, Battle Spades, Tinkers' Things, Katanas, Rapier, and Weaponry; their Better Combat categories are explicit datapack attributes so halberds, katanas, rapiers, lances, pikes, greatswords, and related tools animate consistently.
- Netherrack grout keeps seared metallurgy tied to Nether-obelisk preparation.
- `create:andesite_alloy` is an alloying output, not easy nugget crafting.
- `create:deployer` gates `create:andesite_casing`.
- More Red is the terrestrial primitive circuitry layer around early Create: red alloy comes from Create mixing, wire from Create pressing, and the soldering table consumes andesite-tier parts instead of Nether/blaze ingredients.
- Vanilla-style automation such as pistons, hoppers, observers, rails, carts, and similar modded hand-stacked machinery is assembled on Create surfaces by `145_vanillish_recipe_expert_pass.js`; magic/alchemy workstations such as brewing, enchanting, Ars apparatus, and hellforged processing use Blood Magic alchemy instead of grid or furnace recipes. The late grid policy in `80_recipe_policy/10_no_complex_grid_defaults.js` moves complex shaped/shapeless defaults from expert tech, magic, mobility, portable-storage, and mass-building namespaces onto non-grid surfaces while preserving vanilla-power survival, camp, decor, ordinary block recipes, and named early progression roots in the grid. Shaped tech defaults become Create mechanical crafting, shapeless tech defaults become Create mixing, and small magic defaults use Blood Magic alchemy.
- Finished circuit items belong to PNCR assembly laser/drill. Earlier surfaces prepare boards, traces, wafers, and printed processors; PNCR assembly completes the circuit.
- Passive Create SU sources are pushed to the andesite machine-casing tier.
- Clean water, serious extraction, and body-system recovery depend on sustainable tech rather than free early infrastructure.

Deadlock checks:

- Do not require Create andesite casing before the first TCon seared/scorched infrastructure.
- Do not require brass machinery before andesite casing is reachable.
- Do not require Nether/blaze materials for the first primitive circuit table or More Red red-alloy wire.
- Do not require AE2 storage or automation before the AE2 casing tier itself.
- If grout requires netherrack, Nether access must remain reachable before melter/smeltery dependence.

## Deposits And Y Bands

Deposit progression is authored through ADLODS configs, Realistic Ores tags, and KubeJS processing. Active deposit config files exist for aluminum, amethyst, ancient debris, coal, cobalt, copper, diamond, emerald, gas pockets, gold, iridium, iron, lapis, lead, nether gold, nether quartz, nickel, osmium, palladium, platinum, redstone, rhodium, ruby, ruthenium, sapphire, silver, tin, topaz, uranium, and zinc.

The starter catalogue in `global.BTM_STARTER_DEPOSITS` currently names coal measures, ironstone, copper sulfide, tin, zinc, lead-zinc vein, quartz vein, and bauxite laterite. Processing should keep furnace output as a poor fallback, TCon melter/smeltery as first primary interpretation, foundry/byproduct work as better interpretation, and Create/PNCR chemistry as later material identity. Excavated gravel variants are part of the deposit surface, not a separate ore family: Realistic Ores stone configured features include gravel replacement targets, `excavated_variants:gravel_*` blocks stay shovel-mineable, and gravel substrate support lives in `defaultresources/excavated_variants`.

The late lava-diving band is Overworld terrain below Y 0, enabled by Tectonic `min_y = -64` and lava tunnels. `datapacks/realistic_ores_lava_depths` adds lava-exposed Realistic Ores uranium, thorium, and osmiridium lava sulfide in Y -64 to 0 only; the custom `realisticores:lava_exposed_ore` feature only places ore blocks that touch lava. Magma cubes are the current lava-band hazard, and Protection Pixel Tosaki gear is the intended post-AE2 diving suit for this route.

All non-grown renewable resource sources should be absent or quarantined. Geological, fluid, ore, and manufactured material growth comes from finite worldgen, authored dimension routes, lava-depth routes, loot, or processing of already-owned matter, not from passive ore rituals, bottomless pumps, conjured islands, fluid sigils/glyphs, lava fermentation, or restocking raw-material trades.

## Magic Gates

Still-Beating Hearts bridge the death loop and body systems into Blood Magic. `rpgstats:still_beating_heart` is a milestone item, not bulk fuel. Current KubeJS adds pack-owned heart keys and Blood Orb altar recipes in `40_blood_orbs_from_still_beating_hearts.js`; the weak orb also has a direct still-beating-heart altar fallback so the first Blood Magic loop is not bricked by its own catalyst chain. `82_blood_magic_lifeforce_rework.js` makes the Blood Altar consume the heart directly, while later altar/rune escalation remains costly.

Growables now feed chemistry through `57_grown_material_acid_ball_processing.js`. Plants, fungi, honeycomb, meat, fish, hide, bone, feather, and venomous tissue use the same solvent/grinding-ball language as Realistic Ores, so farm and animal loops produce differentiated chemical side streams rather than one generic biomass output.

The downstream chemistry pass makes those side streams matter without turning them into free matter. `60_create_chemical_transformations.js` supplies carbonate roasting, oxide reduction, leaching, precipitation, salt conversion, and gas-scrubbing loops. `61_chemical_existing_item_alternatives.js` spends chemicals on existing pack items such as grout, technical glass, explosives, Create mechanisms, PNCR pressure hardware, and shielding. `62_chemical_electronics_magic_growth_routes.js` spends chemicals on electronics precursors, magic salts, Blood Magic manual alternatives, fertilizer, feed, and biological material substitutes. `63_chemlib_full_integration_routes.js` extends that standard across guarded ChemLib element and molecule families: every registered family gets source pressure, transformation chemistry, existing-item sinks, and a Blood Magic manual yield route when its IDs exist.

Chemical alternatives can offer higher yield, earlier access with more setup, or byproduct-consuming substitutions depending on the target. Finished circuits remain PNCR assembly authority; chemistry prepares wafers, boards, printed processors, etchants, capacitors, and transistors rather than bypassing that completion step. Create recipes represent open bulk processing, grinding media, acids, precipitation, and reduction; PNCR recipes represent sealed pressure, gas handling, thermal control, polymers, and etching; Blood Magic recipes are deliberately manual LP/slate routes with better yield instead of unattended throughput.

Blood Magic slates are the side-magic authority:

- Blank Slate: first side-magic/workstation permissions such as Hexerei, Malum, and early utility.
- Reinforced Slate: Ars-style entry and Altar II magic.
- Infused Slate: Occultism basics, Tome of Blood, Goety, and comparable mid magic.
- Demonic Slate: Botania runic tier, Forbidden and Arcanus, and stronger magic.
- Ethereal Slate: late programmable or endgame magic where installed and confirmed.

Do not gate guidebooks when a workstation/core item can be gated. Do not use hearts in side-magic recipe spam; use slates and authored intermediates.

Iron's Spells is integrated as a cross-magic spellcraft branch, not as an independent vanilla-crafting branch. `126_cross_magic_irons_spellcraft.js` removes the direct Iron's spellcraft outputs and rebuilds them through Blood Magic tier costs plus Ars apparatus, Botania runic altar, Hexerei cauldron, Malum spirit infusion, and Goety ritual work. Malum spirits are the shared reagent language for schools and upgrades; Occultism, Forbidden and Arcanus, Hexerei, Botania, Goety, Reliquary, and Ars reagents provide theme and tier identity. Low-tier scroll discovery may remain loot-based, but high-tier spell books, upgrade orbs, high inks, and high-tier scroll tables are scrubbed as progression bypasses.

## Late And Post-AE2

AE2 is late local intelligence, not early global logistics. `impossible_machine_casing` should mark the point where AE2-scale systems, high Sophisticated Storage control, and late utility can appear. Post-AE2 branches currently include Protection Pixel, Tome of Blood, hooks/drones/backpack utility gates, and Creating Space dimension access gates where the installed mods exist.

Lava-depth osmiridium is a post-AE2 material pressure point for Protection Pixel Tosaki recipes and selected late utility. JEI/EMI ore-origin tooltips should make clear when a material is a normal deposit, meteor-dimension origin, or lava-diving origin.

Theurgy, Psi, and Hex Casting are not active manifest entries in the current repo. Treat references to them in old reports or generator comments as candidate/future design, not current pack state.
