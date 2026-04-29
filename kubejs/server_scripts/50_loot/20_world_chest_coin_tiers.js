// World chest coin injections. Loot is part of the material economy: these coins
// reward scouting and route risk without enabling direct coin conversion loops.

var BTM_WORLD_CHEST_COIN_TABLES = [
    {
        tables: [
            'minecraft:chests/spawn_bonus_chest',
            'minecraft:chests/village/village_plains_house',
            'minecraft:chests/village/village_desert_house',
            'minecraft:chests/village/village_taiga_house',
            'minecraft:chests/village/village_savanna_house',
            'minecraft:chests/village/village_snowy_house',
            'minecraft:chests/igloo_chest',
            'minecraft:chests/underwater_ruin_small'
        ],
        coin: 'dotcoinmod:copper_coin',
        count: 4,
        chance: 0.55
    },
    {
        tables: [
            'minecraft:chests/shipwreck_supply',
            'minecraft:chests/shipwreck_map',
            'minecraft:chests/underwater_ruin_big',
            'minecraft:chests/ruined_portal'
        ],
        coin: 'dotcoinmod:tin_coin',
        count: 3,
        chance: 0.45
    },
    {
        tables: [
            'minecraft:chests/simple_dungeon',
            'minecraft:chests/abandoned_mineshaft',
            'minecraft:chests/pillager_outpost',
            'minecraft:chests/desert_pyramid',
            'minecraft:chests/jungle_temple'
        ],
        coin: 'dotcoinmod:iron_coin',
        count: 3,
        chance: 0.50
    },
    {
        tables: [
            'minecraft:chests/buried_treasure',
            'minecraft:chests/shipwreck_treasure',
            'minecraft:chests/stronghold_corridor',
            'minecraft:chests/stronghold_crossing'
        ],
        coin: 'dotcoinmod:bronze_coin',
        count: 3,
        chance: 0.40
    },
    {
        tables: [
            'minecraft:chests/woodland_mansion',
            'minecraft:chests/ancient_city_ice_box',
            'minecraft:chests/nether_bridge',
            'minecraft:chests/bastion_bridge',
            'minecraft:chests/bastion_hoglin_stable'
        ],
        coin: 'dotcoinmod:nickel_coin',
        count: 2,
        chance: 0.40
    },
    {
        tables: [
            'minecraft:chests/stronghold_library',
            'minecraft:chests/ancient_city',
            'minecraft:chests/bastion_other'
        ],
        coin: 'dotcoinmod:silver_coin',
        count: 2,
        chance: 0.35
    },
    {
        tables: [
            'minecraft:chests/bastion_treasure',
            'minecraft:chests/end_city_treasure'
        ],
        coin: 'dotcoinmod:brass_coin',
        count: 2,
        chance: 0.30
    }
]

function btmKnownCoinLootTables() {
    var seen = {}
    var tables = []
    for (var i = 0; i < BTM_WORLD_CHEST_COIN_TABLES.length; i++) {
        var row = BTM_WORLD_CHEST_COIN_TABLES[i]
        for (var j = 0; j < row.tables.length; j++) {
            var table = row.tables[j]
            if (!seen[table]) {
                seen[table] = true
                tables.push(table)
            }
        }
    }
    return tables
}

function btmAddCoinToLootTable(event, table, coin, count, chance) {
    if (!Item.exists(coin)) {
        console.warn('[world-chest-coin-tiers] Missing coin item: ' + coin)
        return
    }

    event.addLootTableModifier(table)
        .addLoot(Item.of(coin, count))
        .randomChance(chance)
}

LootJS.modifiers(function (event) {
    var baselineTables = btmKnownCoinLootTables()
    for (var b = 0; b < baselineTables.length; b++) {
        btmAddCoinToLootTable(event, baselineTables[b], 'dotcoinmod:copper_coin', 4, 1.0)
        btmAddCoinToLootTable(event, baselineTables[b], 'dotcoinmod:iron_coin', 2, 0.85)
    }

    for (var i = 0; i < BTM_WORLD_CHEST_COIN_TABLES.length; i++) {
        var row = BTM_WORLD_CHEST_COIN_TABLES[i]
        for (var j = 0; j < row.tables.length; j++) {
            btmAddCoinToLootTable(event, row.tables[j], row.coin, row.count, row.chance)
        }
    }
})
