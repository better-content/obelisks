# Immersion-First Recipe Overhaul Report

Date: 2026-05-13

## Implemented Scope

- Committed and pushed the pre-existing dirty worktree as `ec1592a00` before starting.
- Rechecked current pack mod inventory from `mods/` and fallback Prism inventory:
  - repo `mods/`: 209 `.pw.toml`/`.jar` entries.
  - repo custom jars include `realisticores-0.1.0.jar`, `rpgstats-1.0.0.jar`, `obelisks-1.0.0.jar`, and other pack-critical custom jars.
  - fallback Prism mods: 207 jar entries.
  - fallback confirms current Burnt, PNCR, CDG, Ars, Blood Magic, Tome of Blood, Power Grid, OC2R, Chemlib, Alchemistry, and Realistic Ores jars.
  - repo no longer has `mods/acid_vat-0.1.0.jar` after the pre-overhaul checkpoint.
- Expanded the machine casing source of truth to:
  - Seared Machine Casing
  - Scorched Machine Casing
  - Andesite Machine Casing
  - Brass Machine Casing
  - Airtight Casing
  - Electrical Machine Casing
  - Circuited Casing
  - Space Machine Casing
  - Raw Impossible Casing
  - Impossible Casing
- Replaced KubeJS recipe references to the retired casing names:
  - `kubejs:power_grid_machine_casing` -> `kubejs:electrical_machine_casing`
  - `kubejs:oc2r_machine_casing` -> `kubejs:circuited_machine_casing`
  - `kubejs:ae2_machine_casing` -> `kubejs:impossible_machine_casing`
- Added focused custom intermediates:
  - `kubejs:rotational_compressor_core`
  - `kubejs:pressure_seal`
  - `kubejs:purified_blood_catalyst`
  - `kubejs:purified_source_core`
  - `kubejs:impossible_circuit`
  - `kubejs:living_binding`
  - grinding ball items for physical, late, magic, and AE2-biased processing hooks.
- Added lightweight model/blockstate coverage for new casing IDs and model coverage for new intermediates.

## Progression Changes

- Airtight Casing now sits after Brass and consumes Create-built compressor identity plus PNCR pressure materials.
- Electrical Casing now sits after Airtight and consumes Power Grid capacitor/conductor parts.
- Circuited Casing now sits after Electrical and consumes PNCR board/transistor parts plus OC2R control parts.
- Raw Impossible Casing is created by AE2/space mechanical crafting.
- Impossible Casing is finished through final-tier Blood Magic authority from Raw Impossible Casing.
- PNCR pressure chamber, refinery, and assembly machinery are gated behind Airtight Casing.
- Power Grid machines are gated behind Electrical Casing.
- OC2R machines are gated behind Circuited Casing.
- AE2 controller-tier blocks are gated behind Impossible Casing.

## Oil And PneumaticCraft

- CDG distillation recipes are removed.
- CDG pumpjack/distillation/oil scanner blocks are disabled and hidden.
- CDG engines remain available as the liquid-fuel burning branch.
- PNCR solar and flux compressors are disabled and hidden.
- PNCR jet boots upgrades 4 and 5 are disabled and hidden.
- PNCR compressors now consume the Create-built `kubejs:rotational_compressor_core`.
- The shaped printed circuit board recipe was removed; the replacement requires PNCR pressure work.

## Magic And Tome Of Blood

- Ars is treated as purified Blood Magic:
  - Apprentice-tier Blood Magic gates basic source material work.
  - Magician-tier Blood Magic gates real apparatus/glyph/ritual expansion.
- Tome of Blood entry now requires:
  - Impossible Casing
  - AE2 controller infrastructure
  - max Blood Orb
  - Archmage spell book
  - purified source core
  - living binding
  - impossible circuit
  - final-tier Blood Magic alchemy table finishing.

## Acid Vat

- Acid Vat remains guarded behind `Platform.isLoaded('acid_vat')` in its old deposit slurry script, but active graph/closure recipes no longer reintroduce Acid Vat machine recipes.
- The current worktree already removed `mods/acid_vat-0.1.0.jar` in the pre-overhaul checkpoint.

## Validation

- `node --check` passed for all KubeJS client, server, and startup scripts.
- JSON parsing passed for all `kubejs/assets/kubejs/**/*.json` model and blockstate files.
- Grep checks found no active KubeJS references to the retired casing item IDs.
- Grep checks found no later recipe-pass redefinitions for disabled CDG pumpjack/distillation or Acid Vat graph/closure recipes.

## Not Completed In This Pass

- Runtime registry dumps were not regenerated after these edits.
- Full in-game recipe visibility and EMI/JEI checks still need a runtime boot.
- The casing texture family is model-complete but not the final art pass; new IDs reuse existing casing textures.
