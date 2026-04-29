# Progression Chokepoints

## Starting Out

MUST DO chokepoints:

- `onboarding_complete` gates quest visibility.
- `tconstruct:tinker_station` establishes repair/tool investment.
- Netherrack in grout forces Nether obelisk preparation.
- `tconstruct:seared_melter` and `tconstruct:smeltery_controller` establish metallurgy before Create authority.
- `create:andesite_alloy` comes only from alloying.
- `create:deployer` gates `create:andesite_casing`.
- `create:andesite_casing` gates `create:water_wheel` or `create:windmill_bearing`.
- Clean water follows sustainable Create power.

SHOULD DO chokepoints:

- Backpacks/hooks before serious expedition loops.
- Food/cooking/nutrition before Nether obelisk prep.
- Controlled TNT/blast mining before serious deposit extraction.

## Ore And Processing

MUST DO chokepoints:

- Deposit blocks are the source of ore progression, not vanilla ore blocks.
- Furnace/blasting is an emergency low-nugget fallback.
- Melter/smeltery gives primary molten output only.
- Foundry is first byproduct interpretation.
- Create crushing/washing improves preparation but still feeds metallurgy.
- Acid Vat plus Create-family chemistry routes are chemical interpretation, not early ore doubling.
- Alchemistry is not a player-facing progression target; Acid Vat/Create-family routes provide parity for relevant decomposition/synthesis semantics.
- Prefer many distinct alloy identities and awkward alloy routes over a steel-dominant progression.
- Steel may be useful, but should not be the universal machine-frame answer.

Y-band grouping should be assigned in the deposit catalogue:

- surface/near-surface
- shallow underground
- hills
- mountains
- deepslate underground
- lava depths

Starter subset:

- coal measures
- ironstone
- copper sulfide
- tin
- zinc
- lead-zinc vein
- quartz vein
- bauxite laterite

## Machine Casings

MUST DO chokepoints:

- TCon seared casing tier comes before TCon scorched.
- TCon scorched casing tier comes before Create andesite.
- Create andesite casing tier comes before Create brass.
- Create brass casing tier comes before Power Grid.
- Power Grid casing tier comes before OC2R.
- OC2R casing tier comes before Space.
- Space casing tier comes before AE2.
- Each casing tier must require all previous tier capabilities and add at least one meaningful new manufacturing dependency from its own tier.

Deadlock checks:

- Do not require Create andesite casing to make the first TCon seared/scorched infrastructure.
- Do not require brass machinery before Create andesite casing is reachable.
- Do not require AE2 automation/storage before the AE2 casing tier itself.

## Magic

MUST DO chokepoints:

- `rpgstats:still_beating_heart` bridges death/body systems into Blood Magic.
- Still-Beating Hearts are trophy/milestone keys, not bulk crafting fuel.
- `bloodmagic:blankslate` gates first operational items for Hexerei, Malum, Roots Classic, and early Reliquary.
- `bloodmagic:reinforcedslate` gates Ars entry and other Altar II magic.
- `bloodmagic:infusedslate` gates Occultism basics, Tome of Blood, Mahou Tsukai, Eidolon, and Goety.
- `bloodmagic:demonslate` gates Botania runic tier, Theurgy, Forbidden & Arcanus, Ars Creo/Technica/Caelum.
- `bloodmagic:etherealslate` gates programmable/late magic and late Ars.

Do not gate guidebooks unless there is no practical workstation/core item.

Heart deadlock and economy checks:

- Ordinary deaths should not become a farmable heart reagent loop.
- Blood Magic entry can require a heart milestone, but side magic should use Blood Magic slates rather than hearts.
- If Blood Orbs require hearts, those recipes must be tier milestones and must not demand repeated heart consumption for normal crafting.

## Logistics

MUST DO chokepoints:

- AE2 controller/spatial/storage escalation must stay late enough that local sites remain meaningful.
- Wireless/global AE2 paths need audit before being allowed as normal infrastructure.
- OC2R should be favored for intersite communication.
- Create trains should be favored for intersite logistics.

## Adventure And Economy

MUST DO chokepoints:

- Copper coins must exist as Starting Out rewards and unlock Villager Trading when held.
- Coin acquisition should tie to obelisk/dimension combat loops.
- Trades should support recovery and convenience without replacing production.

## Natural Deadlock Checks

- If grout requires netherrack, Nether obelisk access must be possible before meltery/smeltery.
- If andesite alloy requires alloying, alloying must be possible before hand crank/millstone/deployer recipes depend on Create machinery.
- If casings require deployer, the deployer recipe must not require casings.
- If water wheel/windmill require casings, the deployer must be manually/hand-crank operable first.
- If Blood Magic gates all side magic, Blood Magic altar and Blank Slate must remain reachable from Starting Out/Magic 1.
