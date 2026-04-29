// Replaces village trades with dotcoin purchases. Coins are rewards from quests/adventure,
// not convertible currency loops.

function btmTrade(event, profession, level, costItem, costCount, resultItem, resultCount, uses, xp) {
    var trade = event.addTrade(profession, level, [Item.of(costItem, costCount)], Item.of(resultItem, resultCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 12)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

function btmWandererTrade(event, level, costItem, costCount, resultItem, resultCount, uses, xp) {
    var trade = event.addTrade(level, [Item.of(costItem, costCount)], Item.of(resultItem, resultCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 6)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

if (typeof MoreJSEvents !== 'undefined') {
    MoreJSEvents.villagerTrades(function (event) {
        event.removeVanillaTrades()

        // Farmer / food recovery: copper and iron convenience, never production-trivializing bulk.
        btmTrade(event, 'minecraft:farmer', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:bread', 6, 16, 2)
        btmTrade(event, 'minecraft:farmer', 1, 'dotcoinmod:copper_coin', 3, 'farmersdelight:cabbage', 4, 12, 2)
        btmTrade(event, 'minecraft:farmer', 2, 'dotcoinmod:iron_coin', 2, 'farmersdelight:cooking_pot', 1, 4, 8)
        btmTrade(event, 'minecraft:farmer', 3, 'dotcoinmod:tin_coin', 3, 'farmersdelight:roast_chicken_block', 1, 4, 12)

        // Toolsmith / armorer / weaponsmith: recovery and expedition support.
        btmTrade(event, 'minecraft:toolsmith', 1, 'dotcoinmod:copper_coin', 4, 'tconstruct:repair_kit', 1, 8, 3)
        btmTrade(event, 'minecraft:toolsmith', 2, 'dotcoinmod:iron_coin', 4, 'minecraft:iron_pickaxe', 1, 4, 6)
        btmTrade(event, 'minecraft:toolsmith', 3, 'dotcoinmod:bronze_coin', 4, 'create:super_glue', 1, 6, 10)
        btmTrade(event, 'minecraft:armorer', 1, 'dotcoinmod:copper_coin', 3, 'minecraft:shield', 1, 8, 3)
        btmTrade(event, 'minecraft:armorer', 3, 'dotcoinmod:nickel_coin', 4, 'minecraft:chainmail_chestplate', 1, 4, 10)
        btmTrade(event, 'minecraft:weaponsmith', 2, 'dotcoinmod:iron_coin', 4, 'minecraft:crossbow', 1, 6, 6)
        btmTrade(event, 'minecraft:weaponsmith', 3, 'dotcoinmod:silver_coin', 4, 'minecraft:tnt', 4, 6, 10)

        // Mason / carpenter-like building stock.
        btmTrade(event, 'minecraft:mason', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:bricks', 8, 16, 2)
        btmTrade(event, 'minecraft:mason', 2, 'dotcoinmod:iron_coin', 3, 'tconstruct:seared_brick', 8, 12, 6)
        btmTrade(event, 'minecraft:mason', 3, 'dotcoinmod:tin_coin', 3, 'tconstruct:scorched_brick', 8, 8, 10)
        btmTrade(event, 'minecraft:mason', 4, 'dotcoinmod:bronze_coin', 4, 'create:andesite_alloy', 8, 6, 14)

        // Cleric is the ritual/material recovery sink. No free Blood Magic skips.
        btmTrade(event, 'minecraft:cleric', 1, 'dotcoinmod:copper_coin', 3, 'minecraft:redstone', 8, 12, 3)
        btmTrade(event, 'minecraft:cleric', 2, 'dotcoinmod:iron_coin', 4, 'minecraft:glowstone_dust', 8, 10, 6)
        btmTrade(event, 'minecraft:cleric', 3, 'dotcoinmod:tin_coin', 4, 'bloodmagic:blankslate', 1, 6, 10)
        btmTrade(event, 'minecraft:cleric', 4, 'dotcoinmod:bronze_coin', 4, 'bloodmagic:reinforcedslate', 1, 4, 14)

        // Librarian / cartographer: authored routes, maps, and local intelligence.
        btmTrade(event, 'minecraft:librarian', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:book', 3, 16, 2)
        btmTrade(event, 'minecraft:librarian', 3, 'dotcoinmod:brass_coin', 4, 'oc2r:manual', 1, 4, 12)
        btmTrade(event, 'minecraft:cartographer', 1, 'dotcoinmod:copper_coin', 3, 'minecraft:map', 2, 12, 2)
        btmTrade(event, 'minecraft:cartographer', 2, 'dotcoinmod:iron_coin', 4, 'minecraft:compass', 1, 8, 6)
        btmTrade(event, 'minecraft:cartographer', 4, 'dotcoinmod:gold_coin', 4, 'naturescompass:naturescompass', 1, 3, 14)

        // Fisher / fletcher / shepherd / leatherworker: travel and comfort.
        btmTrade(event, 'minecraft:fisherman', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:cod', 8, 16, 2)
        btmTrade(event, 'minecraft:fletcher', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:arrow', 16, 16, 2)
        btmTrade(event, 'minecraft:fletcher', 3, 'dotcoinmod:tin_coin', 4, 'rehooked:wood_hook', 1, 5, 10)
        btmTrade(event, 'minecraft:shepherd', 1, 'dotcoinmod:copper_coin', 2, 'minecraft:white_wool', 8, 16, 2)
        btmTrade(event, 'minecraft:leatherworker', 1, 'dotcoinmod:copper_coin', 4, 'sophisticatedbackpacks:backpack', 1, 4, 4)
        btmTrade(event, 'minecraft:leatherworker', 3, 'dotcoinmod:bronze_coin', 4, 'cold_sweat:sewing_table', 1, 4, 10)
    })

    MoreJSEvents.wandererTrades(function (event) {
        event.removeVanillaTrades(1)
        event.removeVanillaTrades(2)
        btmWandererTrade(event, 1, 'dotcoinmod:copper_coin', 6, 'minecraft:saddle', 1, 3, 4)
        btmWandererTrade(event, 1, 'dotcoinmod:iron_coin', 6, 'minecraft:lead', 4, 6, 4)
        btmWandererTrade(event, 2, 'dotcoinmod:silver_coin', 4, 'create:track', 32, 4, 10)
        btmWandererTrade(event, 2, 'dotcoinmod:gold_coin', 4, 'minecraft:ender_pearl', 2, 4, 10)
    })
} else {
    console.warn('[coin-villager-trades] MoreJS event group is unavailable; villager trades were not rewritten.')
}
