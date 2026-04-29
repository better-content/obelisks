# Discovered Connections

These are supported by local data and fit the fixed design.

## Ore, Chemistry, And Matter

- Realistic Ores already provides deposit blocks and crushed deposit items. This supports the intended chain `deposit -> crushed/preprocessed form -> molten/slurry outputs` without inventing custom intermediates for the starter subset.
- TCon molten fluids exist for starter outputs including copper, iron, tin, zinc, lead, aluminum, quartz, gold, silver, and nickel. This makes the melter/smeltery/foundry ladder viable.
- Acid Vat already accepts ore tags and Chemlib acids. It can be extended from vanilla ore tags to Realistic Ores deposits after the deposit catalogue exists.
- Alchemistry types appear in runtime data and remain useful as recipe semantics for mod compatibility. The design direction is to replace player-facing Alchemistry machines with Acid Vat/Create-family parity, not to ignore Alchemistry-derived decomposition routes.
- Theurgy has a dense registry of alchemical sulfur/salt materials. It is a good late magic-side matter bridge if gated behind Demonic Slate.

## Starting Out And Survival

- Class kits already include backpacks/hooks and several TCon tools, aligning with the support-lane design.
- The miner kit includes TNT and explosive TCon throwing axes, which reinforces blast mining as a visible early identity.
- Thirst config includes dirty/normal/purified canteens and bottles, so clean water can be represented by real item checks rather than invented stages.
- Live Starting Out already adds `rehooked:wood_hook` and `minecraft:tnt`, and trims the repo's early Create tail. That supports the intended tutorial-sized chapter and blast-mining visibility.

## Alloy And Casing Progression

- The preferred machine-frame model is not steel-centric. Use many distinct alloys and increasingly complex casing manufacture.
- The initial casing tier order is TCon seared, TCon scorched, Create andesite, Create brass, Power Grid, OC2R, Space, and AE2.
- This naturally gives each major tech chapter a physical artifact to craft and a recipe surface to gate.

## Magic Spine

- Confirmed Blood Magic slate IDs map cleanly onto the fixed magic tier model.
- `rpgstats:still_beating_heart` captures death context, stats, vitals, ritual state, equipment, and location, making it a strong milestone bridge into Blood Magic.
- Existing heart-to-Blood-Orb recipes already use NBT predicates for levelled hearts, Hemostasis investment, Wither death, and Ender Dragon death.
- Hexerei, Malum, Occultism, Botania, Ars Nouveau, and Theurgy expose concrete workstation or recipe surfaces that can be gated without guidebook gating.
- Ars Nouveau has both early entry (`imbuement_chamber`/`novice_spell_book`) and escalation (`enchanting_apparatus`, book upgrades), matching the design split between entry and late practical power.

## Logistics And Hybrid Progression

- AE2 controller and spatial IO IDs are present, so the late hybrid path can be audited concretely later.
- OC2R is installed and should become the preferred intersite communication route after basic tech is established.
- Create trains and rail add-ons are installed, supporting physical logistics as the intersite default.
- Create-family additions should be audited as the replacement surface for player-facing chemistry/synthesis previously associated with Alchemistry, while Acid Vat should cover dissolver-style parity where appropriate.

## Quest And Onboarding

- `config/classselector/kits.json` exists in repo and live and is synchronized.
- Starting Out quests already reference many intended early items, so future quest work can revise an existing chapter instead of building one from scratch.
- Live quest work has useful chapter taxonomy already: Death, Food, Tinkers Construct, Create I/II/III, Electricity, Space, Synthesis I/II, Magic I/II, Brews, Books, and Hybrid Matter.

## Open Connections Needing Confirmation

- Exact coin item IDs and mob/drop sources.
- Exact village market/trading implementation surface.
- Exact Roots Classic first workstation/core item.
- Exact entry items for Hex Casting, Psi, Mana and Artifice, Hexalia, and Ars Energistique.
- Exact Foundry multi-output recipe grammar.
