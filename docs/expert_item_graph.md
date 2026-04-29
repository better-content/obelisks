# Expert Item Graph

Generated: 2026-04-29T08:29:18.671Z

This is the current source-of-truth graph model used by the offline audit. It treats recipes, loot, villager trades, Wares contracts, quest rewards, mob drops, and worldgen as material-conversion systems.

## Tier Order

0. survival
1. tcon_seared
2. tcon_scorched
3. create_andesite
4. create_brass
5. power_grid
6. oc2r
7. space
8. ae2
9. hybrid_matter

## Machine Tiers

| Tier            | Casing                           | Authority              | Requires Previous |
| --------------- | -------------------------------- | ---------------------- | ----------------- |
| tcon_seared     | kubejs:seared_machine_casing     | TCon seared            | none              |
| tcon_scorched   | kubejs:scorched_machine_casing   | TCon scorched          | tcon_seared       |
| create_andesite | kubejs:andesite_machine_casing   | Create andesite        | tcon_scorched     |
| create_brass    | kubejs:brass_machine_casing      | Create brass           | create_andesite   |
| power_grid      | kubejs:power_grid_machine_casing | Create: Power Grid     | create_brass      |
| oc2r            | kubejs:oc2r_machine_casing       | OC2R                   | power_grid        |
| space           | kubejs:space_machine_casing      | Creating Space         | oc2r              |
| ae2             | kubejs:ae2_machine_casing        | AE2 local intelligence | space             |

## Blood Magic Authority

| Tier    | Gate                       | Mods                                                                                       |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| blood_1 | bloodmagic:blankslate      | hexerei, rootsclassic, malum, reliquary                                                    |
| blood_2 | bloodmagic:reinforcedslate | ars_nouveau, ars_additions, ars_instrumentum, ars_elemental, naturesaura, irons_spellbooks |
| blood_3 | bloodmagic:infusedslate    | tomeofblood, occultism, mahoutsukai, eidolon, goety                                        |
| blood_4 | bloodmagic:demonslate      | botania, forbidden_arcanus, theurgy, ars_creo, ars_technica, ars_caelum                    |
| blood_5 | bloodmagic:etherealslate   | hexcasting, psi, mna, hexalia, arseng                                                      |

## Coin Tiers

| Index | Tier     | Item                     | Intended Sources                                        |
| ----- | -------- | ------------------------ | ------------------------------------------------------- |
| 0     | copper   | dotcoinmod:copper_coin   | starting_out, low_world_loot, early_mobs, villages      |
| 1     | iron     | dotcoinmod:iron_coin     | tcon_seared, early_adventure, village_contracts         |
| 2     | tin      | dotcoinmod:tin_coin      | create_andesite, route_loot, village_contracts          |
| 3     | bronze   | dotcoinmod:bronze_coin   | create_brass_prep, danger_structures, village_contracts |
| 4     | nickel   | dotcoinmod:nickel_coin   | danger_structures, mid_adventure                        |
| 5     | silver   | dotcoinmod:silver_coin   | oc2r, danger_structures, village_contracts              |
| 6     | steel    | dotcoinmod:steel_coin    | combat, logistics                                       |
| 7     | brass    | dotcoinmod:brass_coin    | hard_world_loot, create_brass                           |
| 8     | gold     | dotcoinmod:gold_coin     | space, synthesis, wandering_contracts                   |
| 9     | osmium   | dotcoinmod:osmium_coin   | lava_depths, advanced_power                             |
| 10    | platinum | dotcoinmod:platinum_coin | deepslate_depths, space                                 |
| 11    | diamond  | dotcoinmod:diamond_coin  | ae2, bosses                                             |
| 12    | emerald  | dotcoinmod:emerald_coin  | mountain_extreme, late_magic                            |
| 13    | ruby     | dotcoinmod:ruby_coin     | late_dimensions                                         |
| 14    | sapphire | dotcoinmod:sapphire_coin | late_dimensions                                         |
| 15    | topaz    | dotcoinmod:topaz_coin    | endgame_dimensions                                      |

## Critical Rules

- Block-like machines must require their assigned casing tier.
- Magic workstations must be parented to Blood Magic tiers.
- Loot, Wares, trades, mob drops, and quests are recipe-equivalent material sources.
- Emerald currency must not drive villager or Wares economy.
- Alchemistry is compatibility/reference; Acid Vat and Create synthesis are player-facing chemistry.
- AE2 is local site intelligence, not global logistics.
- Teleportation, creative flight, infinite storage, and infinite non-grown resources must be removed or endgame-contained.
