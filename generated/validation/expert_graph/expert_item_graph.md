# Expert Item Graph

Generated: 2026-07-02T22:59:16.467012286Z

This is the current source-of-truth graph model used by the offline audit. It treats recipes, loot, villager trades, Wares contracts, quest rewards, mob drops, and worldgen as material-conversion systems.

## Tier Order

0. survival
1. tcon_seared
2. create_andesite
3. create_brass
4. airtight
5. power_grid
6. space
7. raw_impossible
8. ae2
9. hybrid_matter

## Machine Tiers

| Tier            | Casing                           | Authority                           | Requires Previous |
 --------------- | -------------------------------- | ----------------------------------- | ----------------- |
 tcon_seared     | kubejs:seared_machine_casing     | TCon seared/scorched                | none              |
 create_andesite | kubejs:andesite_machine_casing   | Create andesite                     | tcon_seared       |
 create_brass    | kubejs:brass_machine_casing      | Create brass                        | create_andesite   |
 airtight        | kubejs:airtight_machine_casing   | PneumaticCraft pressure             | create_brass      |
 power_grid      | kubejs:electrical_machine_casing | Power Grid, PNCR assembly, and OC2R | airtight          |
 space           | kubejs:space_machine_casing      | Creating Space                      | power_grid        |
 raw_impossible  | kubejs:raw_impossible_casing     | Unfinished AE2 body                 | space             |
 ae2             | kubejs:impossible_machine_casing | AE2 and final Blood Magic           | raw_impossible    |

## Blood Magic Authority

| Tier    | Gate                       | Mods                                                                                                                               |
 ------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
 blood_1 | bloodmagic:blankslate      | malum, rootsclassic, reliquary                                                                                                     |
 blood_2 | bloodmagic:reinforcedslate | hexerei, irons_spellbooks                                                                                                          |
 blood_3 | bloodmagic:infusedslate    | occultism, mahoutsukai, eidolon                                                                                                    |
 blood_4 | bloodmagic:demonslate      | ars_nouveau, ars_additions, ars_instrumentum, ars_elemental, goety, forbidden_arcanus, theurgy, ars_creo, ars_technica, ars_caelum |
 blood_5 | bloodmagic:etherealslate   | hexcasting, psi, mna, hexalia, arseng, tomeofblood                                                                                 |

## Coin Tiers

| Index | Tier            | Item                            | Intended Sources                                   |
 ----- | --------------- | ------------------------------- | -------------------------------------------------- |
 0.0   | copper          | createdeco:copper_coin          | starting_out, low_world_loot, early_mobs, villages |
 1.0   | zinc            | createdeco:zinc_coin            | early_adventure, villages, route_recovery          |
 2.0   | iron            | createdeco:iron_coin            | tcon_seared, early_adventure, village_contracts    |
 3.0   | industrial_iron | createdeco:industrial_iron_coin | create_andesite, rail_logistics, workshop_recovery |
 4.0   | brass           | createdeco:brass_coin           | create_brass, logistics, danger_structures         |
 5.0   | gold            | createdeco:gold_coin            | space, synthesis, wandering_contracts              |
 6.0   | platinum        | createdeco:netherite_coin       | deepslate_depths, lava_depths, ae2, bosses         |

## Critical Rules

- Block-like machines must require their assigned casing tier.
- Magic workstations must be parented to Blood Magic tiers.
- Hexerei progression must precede Occultism attunement and Ars source precision.
- Exact duplicate physical materials should collapse to canonical pack families; mahogany standardizes on natures_spirit.
- Loot, Wares, trades, mob drops, and quests are recipe-equivalent material sources.
- Emerald currency must not drive villager or Wares economy.
- Alchemistry is compatibility/reference; Create and PneumaticCraft synthesis are player-facing chemistry.
- AE2 is local site intelligence, not global logistics.
- Teleportation, creative flight, infinite storage, and infinite non-grown resources must be removed or endgame-contained.
