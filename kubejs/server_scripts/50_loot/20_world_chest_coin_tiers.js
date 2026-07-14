// World chest coin injections. Loot is part of the material economy: these coins
// reward scouting and route risk without enabling direct coin conversion loops.

var BC_WORLD_CHEST_COIN_TABLES = [
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
        coin: 'createdeco:copper_coin',
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
        coin: 'createdeco:zinc_coin',
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
        coin: 'createdeco:iron_coin',
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
        coin: 'createdeco:industrial_iron_coin',
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
        coin: 'createdeco:brass_coin',
        count: 2,
        chance: 0.30
    },
    {
        tables: [
            'minecraft:chests/stronghold_library',
            'minecraft:chests/ancient_city',
            'minecraft:chests/bastion_other'
        ],
        coin: 'createdeco:gold_coin',
        count: 2,
        chance: 0.08
    },
    {
        tables: [
            'minecraft:chests/bastion_treasure',
            'minecraft:chests/end_city_treasure'
        ],
        coin: 'createdeco:netherite_coin',
        count: 1,
        chance: 0.001
    }
]

function bcKnownCoinLootTables() {
    var seen = {}
    var tables = []
    for (var i = 0; i < BC_WORLD_CHEST_COIN_TABLES.length; i++) {
        var row = BC_WORLD_CHEST_COIN_TABLES[i]
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

function bcAddCoinToLootTable(event, table, coin, count, chance) {
    if (!Item.exists(coin)) {
        console.warn('[world-chest-coin-tiers] Missing coin item: ' + coin)
        return
    }

    event.addLootTableModifier(table)
        .addLoot(Item.of(coin, count))
        .randomChance(chance)
}

LootJS.modifiers(function (event) {
    var baselineTables = bcKnownCoinLootTables()
    for (var b = 0; b < baselineTables.length; b++) {
         bcAddCoinToLootTable(event, baselineTables[b], 'createdeco:copper_coin', 4, 1.0)
         bcAddCoinToLootTable(event, baselineTables[b], 'createdeco:zinc_coin', 2, 0.9)
         bcAddCoinToLootTable(event, baselineTables[b], 'createdeco:iron_coin', 2, 0.85)
    }

    for (var i = 0; i < BC_WORLD_CHEST_COIN_TABLES.length; i++) {
        var row = BC_WORLD_CHEST_COIN_TABLES[i]
        for (var j = 0; j < row.tables.length; j++) {
             bcAddCoinToLootTable(event, row.tables[j], row.coin, row.count, row.chance)
        }
    }
})
