# Recipe Type Capabilities

Local evidence comes from KubeJS scripts, repo datapacks, custom mod resources, and the live recipe/registry dump. Pass 0 does not implement recipes.

## KubeJS Surface

The repo uses KubeJS server scripts under `kubejs/server_scripts` and client/startup scripts under `kubejs/client_scripts` and `kubejs/startup_scripts`.

Confirmed server recipe pattern:

- `ServerEvents.recipes(event => { ... })`
- `event.shaped`, `event.campfireCooking`, and `event.custom`
- `event.remove` is available and already used/expected by current scripts.

KubeJS implementation rule: keep scripts Rhino-safe. Use `var`/`let`, plain arrays/objects, deterministic IDs, and avoid Node-only APIs.

## Vanilla And Forge Recipes

Confirmed recipe types:

- `minecraft:crafting`
- `minecraft:smelting`
- `minecraft:blasting`
- `minecraft:smoking`
- `minecraft:campfire_cooking`
- `minecraft:stonecutting`
- `forge:conditional`

Use for:

- Removing default ore/deposit furnace and blasting outputs.
- Adding bad emergency nugget fallback outputs.
- Adding gravel-to-gunpowder and TNT accessibility recipes if no better mod-specific surface is needed.

## Create

Confirmed recipe types:

- `create:crushing`
- `create:milling`
- `create:mixing`
- `create:deploying`
- `create:item_application`
- `create:splashing`
- `create:pressing`
- `create:sequenced_assembly`
- `create:mechanical_crafting`

Current casing bypass evidence:

- Runtime recipe `create:item_application` produces `create:andesite_casing` from `#forge:stripped_logs` plus `create:andesite_alloy`.
- Design requires deployer assembly only, so this recipe is a bypass unless removed/replaced.

Use for:

- Pass 3: deposit preprocessing by crushing/washing.
- Pass 4: deployer-only andesite casing and Create entry gates.

## Tinkers' Construct

Confirmed recipe types:

- `tconstruct:melting`
- `tconstruct:alloying`
- `tconstruct:casting_table`
- `tconstruct:casting_basin`
- `tconstruct:material`
- `tconstruct:part_builder`
- `tconstruct:tinker_station`
- `tconstruct:severing`

Example melting grammar:

```json
{
  "type": "tconstruct:melting",
  "ingredient": { "tag": "forge:geore_blocks/iron" },
  "result": { "amount": 360, "tag": "forge:molten_iron" },
  "temperature": 800,
  "time": 120
}
```

Use for:

- Grout and andesite-alloy progression.
- Melter/smeltery primary output.
- Foundry/byproduct recipes after grammar is confirmed for multi-output support. If TCon Foundry multi-output grammar is unavailable locally, treat byproducts as `UNKNOWN` until confirmed.

## Blood Magic

Confirmed recipe types:

- `bloodmagic:altar`
- `bloodmagic:alchemytable`
- `bloodmagic:array`
- `bloodmagic:arc`
- `bloodmagic:soulforge`
- `bloodmagic:meteor`

Example altar grammar:

```json
{
  "type": "bloodmagic:altar",
  "altarSyphon": 1000,
  "consumptionRate": 5,
  "drainRate": 5,
  "input": { "item": "minecraft:ghast_tear" },
  "output": { "item": "bloodmagic:airscribetool", "nbt": "{Damage:0}" },
  "upgradeLevel": 2
}
```

Use for:

- Recipe evidence and compatibility checks.
- Magic-gate edits should generally be normal crafting/workstation recipe edits for the gated mod's real workstation, not Blood Magic recipe additions.

## Ars Nouveau

Confirmed recipe types:

- `ars_nouveau:imbuement`
- `ars_nouveau:enchanting_apparatus`
- `ars_nouveau:book_upgrade`
- `ars_nouveau:glyph`
- `ars_nouveau:spell_write`
- `ars_nouveau:crush`

Use for:

- Gate `ars_nouveau:imbuement_chamber` or `ars_nouveau:novice_spell_book` at Reinforced Slate tier.
- Gate `ars_nouveau:enchanting_apparatus` as a separate escalation if needed.

## Acid Vat, ChemLib, And Create-Family Chemistry

Confirmed Acid Vat recipe types:

- `acid_vat:acid`
- `acid_vat:acid_vat`
- `acid_vat:centrifuge`

Example Acid Vat grammar:

```json
{
  "type": "acid_vat:acid_vat",
  "input": { "tag": "forge:ores/copper", "count": 1 },
  "acid": { "fluid": "chemlib:hydrochloric_acid_fluid" },
  "acid_amount": 250,
  "processing_time": 90,
  "slurry_amount": 250,
  "slurry_id": "acid_vat:copper_ore_slurry"
}
```

Use for:

- Pass 4+ chemical interpretation, after deposit catalogue and early ore processing are stable.
- Acid Vat slurry routes where they support the fixed deposit-processing ladder.
- Create-family replacement mods for chemistry/synthesis instead of Alchemistry.
- Alchemistry recipe semantics as a reference surface for parity, especially dissolver-style decomposition.

Compatibility/reference surface:

- Alchemistry recipe types may appear in the runtime dump (`alchemistry:atomizer`, `alchemistry:combiner`, `alchemistry:compactor`, `alchemistry:dissolver`, `alchemistry:fission`, `alchemistry:fusion`, `alchemistry:liquifier`).
- Do not design player progression around Alchemistry machines. The pack direction is to expose equivalent decomposition/synthesis through Acid Vat and Create-family mods.
- Where mods reference Alchemistry recipes or materials, preserve compatibility or implement parity rather than deleting the semantic route.

## FTB Quests

Quest files exist under `config/ftbquests/quests`. Starting Out currently references TCon and Create progression items, including mechanical press/mixer, which conflicts with the cleaned design if retained.

Pass 0 reports this as a design drift. Do not modify quest files unless explicitly requested in a later pass.

## Known Capability Gaps

- Exact TCon Foundry multi-output JSON grammar was not confirmed in this pass.
- KubeJS helper availability for each third-party recipe type should be verified by syntax checks before implementation; raw `event.custom` is the fallback.
- FTB Quest stage integration with classselector onboarding needs a mod-provided event/getter or stage mirror confirmation before quest gating is implemented.
