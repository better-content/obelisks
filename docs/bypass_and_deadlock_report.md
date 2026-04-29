# Bypass And Deadlock Report

## MUST DO

### Proposal: Index `acid_vat-0.1.0.jar` or remove it from repo/live parity claims

- Evidence: `mods/acid_vat-0.1.0.jar` exists in repo and live instance, runtime registers Acid Vat items/fluids/recipe types, but `index.toml` does not include it.
- Why it fits the design: Acid Vat is a named ore-processing tier and must be reproducible.
- Risk: Fresh pack installs may omit Acid Vat while later recipes depend on it.
- Implementation surface: packwiz index update for `mods/acid_vat-0.1.0.jar`.
- Confidence: High.

### Proposal: Remove non-alloying andesite alloy recipes

- Evidence: design requires andesite alloy exclusively through alloying; current recipe dump should be checked for non-TCon/non-alloying outputs before Pass 4.
- Why it fits the design: prevents Create from preceding metallurgy.
- Risk: Removing all recipes before adding alloying can deadlock Create.
- Implementation surface: KubeJS recipe removal plus TCon alloying recipe.
- Confidence: High.

### Proposal: Replace Create item-application casing with deployer-only casing

- Evidence: live dump has `create:item_application` recipe from `#forge:stripped_logs` + `create:andesite_alloy` to `create:andesite_casing`.
- Why it fits the design: deployer is the explicit casing gate.
- Risk: Deployer recipe must remain casing-free.
- Implementation surface: KubeJS remove target output recipe and add `create:deploying`.
- Confidence: High.

### Proposal: Avoid steel as the universal machine casing/frame material

- Evidence: user direction is to prefer many tricky alloys over another steel pack.
- Why it fits the design: reinforces material transformation and keeps deposits/alloys meaningful across tiers.
- Risk: steel-only recipes flatten progression and make later deposits/alloys optional.
- Implementation surface: machine casing catalogue and tiered recipe replacement scripts.
- Confidence: High.

### Proposal: Add an E2E-style casing tier catalogue before bulk machine recipe edits

- Evidence: user-specified tier order is TCon seared -> TCon scorched -> Create andesite -> Create brass -> Power Grid -> OC2R -> Space -> AE2.
- Why it fits the design: each tier adds manufacturing complexity from another mod while preserving previous investment.
- Risk: without a catalogue, individual recipe edits will drift into inconsistent gates or deadlocks.
- Implementation surface: `docs/machine_casing_tier_catalog.md`, then data-driven KubeJS recipe generation.
- Confidence: High.

### Proposal: Make grout require netherrack without Create mixing

- Evidence: design requires early Nether obelisk access; current worktree includes untracked recipe replacement script likely related to acid and nether grout unification.
- Why it fits the design: ties metallurgy to adventure without making Create the gate.
- Risk: If Nether obelisk is not reachable before grout, this deadlocks smeltery.
- Implementation surface: KubeJS shaped/shapeless replacement for grout, plus removal of bypass recipes.
- Confidence: High.

### Proposal: Nerf furnace/blasting outputs for Realistic Ores deposits

- Evidence: deposit-first design requires awful fallback; Realistic Ores blocks and crushed items are confirmed.
- Why it fits the design: prevents furnace from becoming the best low-effort route.
- Risk: Nugget fallback must still allow recovery from bad starts.
- Implementation surface: KubeJS remove smelting/blasting by input/output; add deterministic `kubejs:*_nugget_fallback` recipes.
- Confidence: High.

### Proposal: Keep Still-Beating Hearts as trophy milestones, not bulk crafting fuel

- Evidence: `rpgstats:still_beating_heart` captures death/context NBT and current KubeJS consumes hearts for Blood Magic orb recipes.
- Why it fits the design: death should bridge into Blood Magic as evidence of ordeal, not become a reagent farm.
- Risk: ordinary deaths become an optimized resource loop, undermining the intended body/sacrifice theme.
- Implementation surface: review `kubejs/server_scripts/40_recipe_add/40_blood_orbs_from_still_beating_hearts.js`, Blood Magic gates, and FTB Death/Magic chapters.
- Confidence: High.

## SHOULD DO

### Proposal: Build a KubeJS-compatible deposit catalogue before recipe generation

- Evidence: custom resources define deposit blocks, generation, and crushed items, but no reviewed content-layer catalogue exists.
- Why it fits the design: avoids hand-writing many unrelated recipes and enables staged generation.
- Risk: Premature output mapping can encode bad geology; use starter subset first.
- Implementation surface: new data file under KubeJS or JSON, plus `docs/ore_deposit_catalog.md` in Pass 1.
- Confidence: High.

### Proposal: Update Starting Out quests after recipe gates are proven

- Evidence: current Starting Out includes press/mixer nodes; design excludes press from core and says mixer is not a grout gate.
- Why it fits the design: quest graph should teach the actual mechanical path.
- Risk: Quest edits before recipe edits may mislead playtesters.
- Implementation surface: FTB Quest SNBT after Pass 4, only if requested.
- Confidence: Medium.

### Proposal: Sync live FTB Quest work into repo before quest edits

- Evidence: live has additional chapter stubs, a Death chapter, a Synthesis I chapter, and a newer shorter Starting Out; repo does not.
- Why it fits the design: preserves authored quest work and avoids editing stale repo state.
- Risk: importing live state without review could also import placeholder rewards and unfinished chapter names.
- Implementation surface: copy/review `config/ftbquests/quests` after explicit approval.
- Confidence: High.

### Proposal: Gate side magic by first real workstation, not guidebook

- Evidence: many magic recipe types and workstation IDs are confirmed.
- Why it fits the design: keeps books usable while Blood Magic controls permission.
- Risk: Some mods may have multiple entry surfaces; audit exact recipe outputs before editing.
- Implementation surface: KubeJS recipe replacements/removals for workstation/core recipes.
- Confidence: High for listed confirmed IDs, Medium for UNKNOWN entries.

## MAYBE

### Proposal: Use Theurgy as a late chemical/magic matter bridge

- Evidence: Theurgy has extensive alchemical sulfur/salt registry entries and many recipe types.
- Why it fits the design: matter transformation theme is strong.
- Risk: It can undermine bounded matter if allowed too early or too broadly.
- Implementation surface: Demonic Slate gate first, then later catalogue review.
- Confidence: Medium.

### Proposal: Use AE2 spatial storage as a late hybrid obelisk/hull tool

- Evidence: AE2 spatial components and Spatial IO are installed.
- Why it fits the design: Appendix-level hybrid endgame supports spatial field work and hull stripping.
- Risk: Spatial storage can function like logistics teleportation if cheap.
- Implementation surface: late recipes and power/cost constraints after core passes.
- Confidence: Medium.

## DO NOT DO

### Proposal: Gate magic by consuming Blood Orbs broadly

- Evidence: Blood Magic slate IDs are confirmed and design explicitly prefers slates.
- Why it conflicts: Blood Orbs are progression tools, not consumable tax items.
- Risk: Player frustration and accidental altar progression deadlocks.
- Implementation surface: avoid except for explicitly reviewed unavoidable cases.
- Confidence: High.

### Proposal: Use Still-Beating Hearts in many side-magic workstation recipes

- Evidence: hearts are available as NBT-rich death trophies and could technically be matched in recipes.
- Why it conflicts: side magic should be parented to Blood Magic slate tiers; hearts are milestone trophies, not universal occult glue.
- Risk: encourages heart farming and makes Blood Magic slates less meaningful.
- Implementation surface: use slates for Hexerei/Malum/Roots/Ars/etc. gates; reserve hearts for Blood Magic/death milestones.
- Confidence: High.

### Proposal: Let Create crushing/washing directly replace TCon metallurgy

- Evidence: Create ore recipes exist broadly in dumps.
- Why it conflicts: Create preprocessing should improve rates, not become the ore interpretation authority.
- Risk: TCon/foundry/Acid Vat/Create-family chemistry ladder becomes irrelevant.
- Implementation surface: keep Create outputs as concentrates/preprocessed forms, not final ingots.
- Confidence: High.

### Proposal: Build player-facing chemistry progression around Alchemistry machines

- Evidence: Alchemistry recipe types appear in the runtime dump.
- Why it conflicts: user direction is to keep Alchemistry as a reference/compatibility surface while replacing player-facing use with Acid Vat/Create-family parity.
- Risk: later passes spend effort on a system being removed and create dead content.
- Implementation surface: do not add Alchemistry machine gates as progression; audit Alchemistry recipe semantics and implement needed parity in Acid Vat/Create-family systems.
- Confidence: High.

### Proposal: Use AE2 or teleportation as normal intersite logistics

- Evidence: pack thesis explicitly forbids global logistics bypass.
- Why it conflicts: distance and trains must matter.
- Risk: collapses settlement/outpost design.
- Implementation surface: audit wireless/spatial/storage recipes before late passes.
- Confidence: High.
