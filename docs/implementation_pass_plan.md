# Implementation Pass Plan

Repo is authoritative. Use live dumps to confirm IDs and report drift.

## Pass 1: Ore Deposit Catalogue

- Create one KubeJS-compatible or JSON source-of-truth deposit catalogue.
- Include confirmed source block IDs, crushed item IDs, Y band, terrain notes, danger tier, primary/secondary/tertiary materials, molten fluid tags or `UNKNOWN`, late processing role, unsupported outputs, and notes.
- Start with coal measures, ironstone, copper sulfide, tin, zinc, lead-zinc vein, quartz vein, and bauxite laterite.
- Produce `docs/ore_deposit_catalog.md`.
- Do not generate production recipes yet.

## Pass 2: Early Ore Processing Recipes

- Use only the reviewed deposit catalogue.
- Remove normal smelting/blasting outputs for starter deposits.
- Add poor furnace fallback nugget recipes.
- Add TCon Melter/Smeltery primary molten output recipes.
- Add Foundry/byproduct recipes only where grammar and molten outputs are confirmed.
- Produce `docs/ore_processing_pass2_report.md`.

## Pass 3: Create Ore Preprocessing

- Use existing Realistic Ores crushed items where appropriate.
- Implement selected `create:crushing` and `create:splashing` chains for starter deposits.
- Keep Create preprocessing upstream of TCon metallurgy; do not output final ingots as the main route.
- Report skipped deposits and missing intermediates before adding custom items.
- Audit installed Create-family mods as the replacement route for player-facing Alchemistry-style chemistry/synthesis; preserve or recreate needed Alchemistry recipe parity through Acid Vat/Create-family routes.

## Pass 3.5: Machine Casing Catalogue

- Create a source-of-truth casing tier catalogue before changing broad machine recipes.
- Initial tier order: TCon seared, TCon scorched, Create andesite, Create brass, Power Grid, OC2R, Space, AE2.
- For each tier, identify the core casing item/block, required previous casing, new alloy/material route, workstation/machine dependency, and bypass risks.
- Prefer alloy variety and cross-mod manufacturing complexity over steel-centric frame recipes.
- Produce `docs/machine_casing_tier_catalog.md`.
- Do not bulk-edit machine recipes until the catalogue is reviewed.

## Pass 4: Starting Progression Gates

- Make grout require netherrack and not Create mixing.
- Make andesite alloy exclusively TCon alloying.
- Remove non-alloying andesite alloy bypasses.
- Ensure hand crank, millstone, and deployer are reachable after alloying.
- Replace andesite casing with deployer assembly only.
- Change water wheel/windmill recipes to require andesite casings.
- Add gravel-to-gunpowder and accessible TNT route.
- Report removed and added recipes and bypass checks.
- Do not modify quests unless explicitly requested.

## Quest Sync Pass

- Decide whether repo or live FTB Quest files are authoritative before editing quest content.
- Live currently has a newer Starting Out cut and many chapter stubs absent from repo.
- Replace emerald placeholder rewards with confirmed Copper Coin IDs only after registry confirmation.
- Keep Starting Out tutorial-sized; move Create press/mixer/basin/depot into later Create chapter if retained.
- Use `docs/ftb_quest_audit.md` as the comparison baseline.

## Pass 5: Magic Blood Gates

- Use only existing Blood Magic materials.
- Treat `rpgstats:still_beating_heart` as a death-trophy milestone key, not a bulk ingredient.
- Review existing heart-to-Blood-Orb recipes before adding more heart requirements.
- Gate first real workstation/core items, not guidebooks.
- Blank Slate: Hexerei, Roots Classic, Malum, early Reliquary.
- Reinforced Slate: Ars Nouveau entry, Ars Additions, Ars Instrumentum, Ars Elemental, Nature's Aura, Iron's Spells.
- Imbued Slate: Tome of Blood, Occultism basics, Mahou Tsukai, Eidolon:Repraised, Goety.
- Demonic Slate: Botania, Forbidden & Arcanus, Theurgy, Ars Creo, Ars Technica, Ars Caelum.
- Ethereal Slate: Hex Casting, Psi, Mana and Artifice, Hexalia, Ars Energistique, late Ars Nouveau.
- Report uncertain recipes and missing IDs instead of inventing them.

## Validation Pass

- Check KubeJS syntax and recipe event compatibility.
- Check deterministic, unique recipe IDs.
- Check no invented IDs remain.
- Check bypasses for grout, andesite alloy, casing, water wheel/windmill, ore fallback, and magic gates.
- Check no obvious deadlocks from fresh start.
- Produce `docs/validation_report.md`, `docs/manual_test_plan.md`, and `docs/known_issues.md`.

## Defaults For Implementation

- Prefer `event.custom` for third-party recipe types unless a local KubeJS helper is already proven.
- Prefix generated recipe IDs with `kubejs:` and group by pass/system.
- Use exact item IDs from registry dumps and repo resources.
- Use `UNKNOWN` in docs and skip recipe generation for unknown IDs.
- Treat Alchemistry as a compatibility/reference surface, not as the player-facing machine path. Prefer Acid Vat plus Create-family mods for chemical and synthesis progression, including dissolver-style parity.
