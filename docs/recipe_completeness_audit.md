# Recipe Completeness Audit

Date: 2026-04-29

Instance audited:

`/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft`

Repo branch:

`codex/expert-progression-implementation`

## Summary

Recipe completeness is not there yet. The current pack has strong targeted gates for the intended expert-pack spine, but it does not yet have a complete authored recipe graph.

The implemented recipe work is best described as:

- early progression hard gates
- machine casing ladder skeleton
- starter deposit processing subset
- Blood Magic entry gates
- high-value bypass suppression
- first material-economy rewrite pass
- first loot/trade/Wares/high-value reward passes

It is not yet:

- a full recipe rewrite for all major mods
- a complete per-tier machine catalogue
- a complete magic placement pass for every operational power spike
- a complete post-AE2 branch design
- a proven final effective recipe graph dump
- a complete authored loot/trade/contract graph

## Evidence

The KubeJS audit dump under the instance scanned 50,077 recipes and found 528 recipe types across 179 namespaces.

Top recipe namespaces by count:

| Namespace | Count | Audit note |
|---|---:|---|
| `alchemistry` | 5410 | Still huge compatibility/reference surface. Player-facing replacement is not complete. |
| `railways` | 2670 | Physical logistics recipes are mostly unreviewed. |
| `create` | 2599 | Core Create recipes are partly gated, but broad Create-family coverage remains incomplete. |
| `tconstruct` | 2336 | Main metallurgy system, but foundry/byproduct progression is starter-focused. |
| `mna` | 1796 | Late magic system not fully placed. |
| `goety` | 1480 | Magic/adventure power not fully placed beyond initial gates. |
| `minecraft` | 1440 | Vanilla material economy pass is partial by design. |
| `theurgy` | 1359 | Huge transformation surface, not fully integrated. |
| `botania` | 1302 | Gate exists conceptually, but full Botania economy is not authored. |
| `bloodmagic` | 772 | Backbone present, but quest/tutorial and heart/orb ladder incomplete. |
| `ars_nouveau` | 633 | Entry and some strong glyphs touched; full Ars economy incomplete. |
| `ae2` | 458 | Core AE2 recipes partially rewritten; addon/post-AE2 graph incomplete. |

Top recipe types by count:

| Type | Count | Audit note |
|---|---:|---|
| `minecraft:crafting_shaped` | 15703 | Far too many for manual one-off gating; needs generated/catalogue audit. |
| `minecraft:stonecutting` | 7538 | Mostly decorative, but can hide material bypasses. |
| `minecraft:crafting_shapeless` | 4530 | High bypass risk for utility conversions. |
| `alchemistry:fusion` | 3481 | Compatibility/reference surface must be quarantined or mirrored into Create/Acid Vat progression. |
| `create:cutting` | 1283 | Mostly block processing; broad review pending. |
| `create:mixing` | 1158 | High progression risk because mixing can bypass TCon/alloying intent. |
| `alchemistry:dissolver` | 1075 | Needs Acid Vat parity decisions. |
| `tconstruct:melting` | 493 | Core metallurgy surface. |
| `create:sequenced_assembly` | 310 | Strong candidate for tiered casing complexity. |
| `create:mechanical_crafting` | 202 | Strong candidate for mid/late machine tiers. |
| `create:crushing` | 185 | Needs ore/deposit completeness pass. |
| `ars_nouveau:enchanting_apparatus` | 156 | Magic power surface not fully integrated. |
| `create:deploying` | 141 | Important for casing/assembly gates. |

Vanilla valuable material mentions remain common in the pre-addition recipe graph:

| Material | Matched recipes |
|---|---:|
| iron | 1168 |
| gold | 586 |
| redstone | 558 |
| diamond | 461 |
| copper | 388 |
| lapis | 174 |
| amethyst | 157 |
| emerald | 139 |

This does not mean every hit is wrong. It means the material economy pass has only covered high-impact classes and cannot be considered globally complete.

## Audit Tool Limitation

The current KubeJS dump script runs inside `ServerEvents.recipes`. It can inspect many recipes, but the interim dump proved that it does not include KubeJS-added recipes from the same reload as final recipe-manager state:

- `namespaceCounts.kubejs` was absent.
- `kubejs:*_machine_casing` recipe mentions were absent even though the repo scripts define them.
- Known KubeJS additions are visible in scripts and logs, but not in the pre-addition `forEachRecipe` scan.

A chunked full export has now been reloaded successfully and produced 51 chunks for 50,077 scanned recipes. It still does not contain `kubejs:` recipe IDs, which confirms this exporter is a pre-addition recipe-event audit rather than final recipe-manager state. Until a command-driven or final-manager dump exists, recipe graph reports must be treated as strong pre-addition audits, not proof of final effective recipes.

## Confirmed Strong Points

### Starting Progression Bypasses

The targeted dump reports:

| Bypass class | Count | Status |
|---|---:|---|
| non-alloying andesite alloy | 0 | Good in scanned graph. |
| item-application andesite casing | 0 | Good in scanned graph. |
| Blood Magic teleposer | 0 | Good in scanned graph. |
| nether grout crafting candidate | 1 | Not a bypass; the hit is the guidebook recipe `tconstruct:common/fantastic_foundry` using `tconstruct:nether_grout`. |

### Implemented Recipe Surfaces

Confirmed by repo scripts:

- `kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js`
- `kubejs/server_scripts/30_recipe_replace/99_machine_casing_progression.js`
- `kubejs/server_scripts/30_recipe_replace/100_high_value_mod_progression_gates.js`
- `kubejs/server_scripts/30_recipe_replace/110_extreme_y_band_reward_gates.js`
- `kubejs/server_scripts/30_recipe_replace/115_material_economy_recipe_pass.js`
- `kubejs/server_scripts/40_recipe_add/45_deposit_furnace_fallbacks.js`
- `kubejs/server_scripts/40_recipe_add/50_create_deposit_preprocessing.js`
- `kubejs/server_scripts/40_recipe_add/60_acid_vat_deposit_slurries.js`
- `kubejs/server_scripts/60_worldgen/10_r_ores_melted.js`

These support the intended design direction, but they are not sufficient for full pack completeness.

## Major Gaps

### MUST DO

#### Proposal: Verify final effective recipe graph with chunked KubeJS output

- Evidence: Current dump has no `kubejs` namespace despite KubeJS recipe scripts defining many recipes.
- Why it fits the design: future audits must distinguish real bypasses from dump-tool blind spots.
- Risk: Without this, recipe work can appear missing or complete incorrectly.
- Implementation surface: `kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js`, generated `kubejs/config/full_recipe_index_*.json`.
- Confidence: High.

#### Proposal: Build a catalogue-driven machine recipe audit

- Evidence: `99_machine_casing_progression.js` gates selected block-like machines, but broad machine families across Create addons, Power Grid, OC2R, Space, AE2 addons, Theurgy, Botania, and magic tech are not exhaustively catalogued.
- Why it fits the design: the pack thesis depends on each tier adding manufacturing complexity, not a few representative gates.
- Risk: Ungated machines can bypass entire tiers.
- Implementation surface: new data catalogue plus generated KubeJS reports/recipes.
- Confidence: High.

#### Proposal: Treat loot, villager trades, Wares contracts, and quest rewards as recipes

- Evidence: Wares delivery agreements are driven by loot tables, villager trades are generated through MoreJS, quest rewards mint Dot Coins, and dimension/combat loot supplies progression currency.
- Why it fits the design: these systems convert effort and location into materials exactly like machines do. They are essential crafting surfaces for bounded matter and bounded distance.
- Risk: if audited as passive rewards, they can bypass casing tiers, ore deposits, magic gates, or coin scarcity.
- Implementation surface: `kubejs/data/**/loot_tables`, `kubejs/server_scripts/35_villager_trades`, FTB Quest rewards, obelisk/dimension mob loot, Wares agreement tables.
- Confidence: High.

#### Proposal: Complete Acid Vat / Create replacement for Alchemistry player-facing progression

- Evidence: `alchemistry` contributes 5410 recipes, including 1075 dissolver recipes and 3481 fusion recipes. Current Acid Vat pass only covers starter deposits.
- Why it fits the design: user explicitly wants Alchemistry present for reference/compat, not as the progression authority.
- Risk: Alchemistry can remain the real chemistry game if not quarantined or mirrored.
- Implementation surface: Acid Vat recipe generation, Create-family synthesis mods, recipe removals/visibility, docs.
- Confidence: High.

#### Proposal: Expand ore/deposit processing beyond starter subset

- Evidence: starter subset covers 8 deposits. The pack design requires deposit-first material identity across Y bands and terrain.
- Why it fits the design: bounded matter and terrain value need deposits to remain meaningful past early game.
- Risk: later materials fall back to vanilla/mod default ore processing.
- Implementation surface: `global.BTM_STARTER_DEPOSITS` expanded to full deposit catalogue; generator scripts for furnace, TCon, Create, Acid Vat, later synthesis.
- Confidence: High.

#### Proposal: Replace output-based gates with explicit recipes for critical machines

- Evidence: many current gates use `event.replaceInput({ output })`. This is good for broad first pass but can create multi-replacement weirdness or miss recipes whose ingredients do not match expected old inputs.
- Why it fits the design: expert packs need stable, inspectable critical-path recipes.
- Risk: EMI may show unintuitive duplicate casing requirements or miss gates.
- Implementation surface: explicit shaped/custom recipes for each tier-critical machine.
- Confidence: High.

#### Proposal: Audit and fix failed recipe/advancement parse errors

- Evidence: reload logs show 30 failed recipes and many advancement/tool-definition errors, including missing `computercraft:wireless_modem_advanced`, `miners_delight:water_cup`, `createaddition:electrum_ingot`, and multiple `ticex:*` missing catalysts.
- Why it fits the design: broken recipe data degrades EMI visibility and can hide deadlocks/bypasses.
- Risk: players see broken or missing recipes; audit data becomes noisy.
- Implementation surface: datapack removals, KubeJS removals, mod config cleanup, dependency correction.
- Confidence: High.

### SHOULD DO

#### Proposal: Continue material economy pass by output class, not global ingredient replacement

- Evidence: remaining valuable material hits are high-volume, but many are decorative or low-impact.
- Why it fits the design: preserves material familiarity while making powerful crafts spend authored infrastructure.
- Risk: blind global replacement would make the pack tedious and break low-impact crafts.
- Implementation surface: add category lists for logistics, storage, magic, AE2, adventure, building power tools, automation.
- Confidence: High.

#### Proposal: Add recipe audits for teleportation, flight, wireless/global logistics, infinite storage, and resource loops

- Evidence: current pass removes known examples, but the full pack has many mods with hidden mobility/logistics features.
- Why it fits the design: these directly threaten the pack thesis.
- Risk: one missed item can invalidate distance/locality.
- Implementation surface: denylist/allowlist catalogue, recipe graph scanner, KubeJS removals/gates.
- Confidence: High.

#### Proposal: Split magic recipe placement by Blood Magic tier

- Evidence: initial slate gates exist, but major internal power spikes in large mods remain unreviewed.
- Why it fits the design: Blood Magic is the permission backbone.
- Risk: side magic mods can unlock each other or bypass Blood tiers.
- Implementation surface: per-mod first-workstation and escalation-item catalogue.
- Confidence: Medium/high.

#### Proposal: Add post-AE2 branch recipes only after choosing branch mods

- Evidence: current post-AE2 work is mostly Advanced AE/extreme rewards, not multiple complete branches.
- Why it fits the design: user wants fewer stronger post-AE2 branches, not scattered rewards.
- Risk: premature recipes create incoherent endgame.
- Implementation surface: design doc update, selected mods, branch catalogues, recipe pass.
- Confidence: Medium.

### MAYBE

#### Proposal: Generate a machine-cost matrix

- Evidence: many tiers now use different casings/alloys, but cost balance is not normalized.
- Why it fits the design: helps avoid accidental cheap power spikes.
- Risk: too much spreadsheet work before playtesting.
- Implementation surface: script that estimates ingredient depth and scarce materials per output.
- Confidence: Medium.

#### Proposal: Make recipe audit command-driven instead of reload-driven

- Evidence: reload dumping is useful but slow and noisy in a large pack.
- Why it fits the design: faster iteration.
- Risk: KubeJS command access to final recipe manager may be API-sensitive.
- Implementation surface: custom command or tiny dev helper mod.
- Confidence: Medium.

### DO NOT DO

#### Proposal: Do not globally replace every iron/copper/gold/redstone/lapis/diamond/emerald/amethyst use

- Evidence: 1168 iron hits and thousands of decorative recipes would be affected.
- Why it conflicts: makes the pack noisy and tedious instead of authored.
- Risk: huge recipe breakage and low signal.
- Implementation surface: none.
- Confidence: High.

#### Proposal: Do not make Alchemistry the player-facing chemistry route

- Evidence: design says Create-family replacements and Acid Vat parity should carry synthesis.
- Why it conflicts: one universal machine chain undermines material transformation and authored infrastructure.
- Risk: Alchemistry becomes the actual pack spine.
- Implementation surface: restrict/remove/gate Alchemistry recipes as needed while preserving compat references.
- Confidence: High.

## Immediate Next Work

1. Run a clean reload after the chunked full graph exporter and confirm `full_recipe_index_manifest.json` plus `full_recipe_index_*.json` exist.
2. Use the full graph chunks to produce an output-index report for all `kubejs:` casing recipes and tier-critical machines.
3. Build a generated recipe coverage table: `output -> tier -> current recipe count -> gate material -> bypass risk`.
4. Start explicit critical-machine recipe pass for the casing ladder.
5. Start a quest graph implementation pass after quest audit decisions are accepted.
