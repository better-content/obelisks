// Replaces village trades with dotcoin purchases. Coins are rewards from quests/adventure,
// not convertible currency loops. Keep this script Rhino-safe for KubeJS 6.

var BTM_COIN = {
    copper: 'dotcoinmod:copper_coin',
    iron: 'dotcoinmod:iron_coin',
    tin: 'dotcoinmod:tin_coin',
    bronze: 'dotcoinmod:bronze_coin',
    nickel: 'dotcoinmod:nickel_coin',
    silver: 'dotcoinmod:silver_coin',
    steel: 'dotcoinmod:steel_coin',
    brass: 'dotcoinmod:brass_coin',
    gold: 'dotcoinmod:gold_coin',
    osmium: 'dotcoinmod:osmium_coin',
    platinum: 'dotcoinmod:platinum_coin',
    diamond: 'dotcoinmod:diamond_coin',
    emerald: 'dotcoinmod:emerald_coin',
    ruby: 'dotcoinmod:ruby_coin',
    sapphire: 'dotcoinmod:sapphire_coin',
    topaz: 'dotcoinmod:topaz_coin'
}

function btmItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmTrade(event, profession, level, coinTier, costCount, resultItem, resultCount, uses, xp) {
    var coin = BTM_COIN[coinTier]
    if (!coin) {
        console.warn('[coin-villager-trades] Unknown coin tier: ' + coinTier + ' for ' + resultItem)
        return
    }
    if (!btmItemExists(coin)) {
        console.warn('[coin-villager-trades] Missing coin item: ' + coin + ' for ' + resultItem)
        return
    }
    if (!btmItemExists(resultItem)) return

    var trade = event.addTrade(profession, level, [Item.of(coin, costCount)], Item.of(resultItem, resultCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 8)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || level * 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

function btmWandererTrade(event, level, coinTier, costCount, resultItem, resultCount, uses, xp) {
    var coin = BTM_COIN[coinTier]
    if (!coin || !btmItemExists(coin) || !btmItemExists(resultItem)) return

    var trade = event.addTrade(level, [Item.of(coin, costCount)], Item.of(resultItem, resultCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 4)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || level * 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

function btmAddTrades(event, profession, rows) {
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        btmTrade(event, profession, r[0], r[1], r[2], r[3], r[4], r[5], r[6])
    }
}

function btmSellTrade(event, profession, level, inputItem, inputCount, copperCount, uses, xp) {
    var coin = BTM_COIN.copper
    if (!btmItemExists(coin) || !btmItemExists(inputItem)) return

    var trade = event.addTrade(profession, level, [Item.of(inputItem, inputCount)], Item.of(coin, copperCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 12)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || level * 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

function btmAddSellTrades(event, profession, rows) {
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        btmSellTrade(event, profession, r[0], r[1], r[2], r[3], r[4], r[5])
    }
}

if (typeof MoreJSEvents !== 'undefined') {
    MoreJSEvents.villagerTrades(function (event) {
        event.removeVanillaTrades()

        // Copper payout trades replace vanilla sell-for-emerald loops.
        // These create a low-tier market floor without enabling coin conversion.
        btmAddSellTrades(event, 'minecraft:farmer', [
            [1, 'minecraft:wheat', 20, 2, 16, 2],
            [1, 'minecraft:carrot', 24, 2, 16, 2],
            [1, 'minecraft:potato', 24, 2, 16, 2],
            [1, 'minecraft:beetroot', 20, 2, 16, 2],
            [1, 'minecraft:pumpkin', 6, 2, 12, 2],
            [2, 'minecraft:melon_slice', 24, 2, 12, 4],
            [2, 'farmersdelight:cabbage', 18, 2, 12, 4],
            [2, 'farmersdelight:tomato', 18, 2, 12, 4],
            [2, 'farmersdelight:rice', 24, 2, 12, 4]
        ])
        btmAddSellTrades(event, 'minecraft:fisherman', [
            [1, 'minecraft:cod', 16, 2, 16, 2],
            [1, 'minecraft:salmon', 16, 2, 16, 2],
            [1, 'minecraft:string', 20, 2, 12, 2],
            [2, 'minecraft:pufferfish', 8, 2, 10, 4],
            [2, 'minecraft:tropical_fish', 8, 2, 10, 4]
        ])
        btmAddSellTrades(event, 'minecraft:fletcher', [
            [1, 'minecraft:stick', 48, 2, 16, 2],
            [1, 'minecraft:flint', 16, 2, 12, 2],
            [1, 'minecraft:feather', 16, 2, 12, 2],
            [2, 'minecraft:string', 20, 2, 10, 4]
        ])
        btmAddSellTrades(event, 'minecraft:shepherd', [
            [1, 'minecraft:white_wool', 12, 2, 16, 2],
            [1, 'minecraft:black_wool', 12, 2, 16, 2],
            [1, 'minecraft:brown_wool', 12, 2, 16, 2],
            [2, 'minecraft:white_dye', 16, 2, 12, 4]
        ])
        btmAddSellTrades(event, 'minecraft:leatherworker', [
            [1, 'minecraft:leather', 10, 2, 12, 2],
            [1, 'minecraft:rabbit_hide', 12, 2, 12, 2],
            [2, 'minecraft:scute', 4, 2, 8, 4]
        ])
        btmAddSellTrades(event, 'minecraft:mason', [
            [1, 'minecraft:clay_ball', 32, 2, 16, 2],
            [1, 'minecraft:stone', 32, 2, 12, 2],
            [1, 'minecraft:granite', 32, 2, 12, 2],
            [1, 'minecraft:andesite', 32, 2, 12, 2],
            [1, 'minecraft:diorite', 32, 2, 12, 2]
        ])
        btmAddSellTrades(event, 'minecraft:butcher', [
            [1, 'minecraft:chicken', 14, 2, 12, 2],
            [1, 'minecraft:porkchop', 10, 2, 12, 2],
            [1, 'minecraft:beef', 10, 2, 12, 2],
            [1, 'minecraft:mutton', 10, 2, 12, 2]
        ])
        btmAddSellTrades(event, 'minecraft:cleric', [
            [1, 'minecraft:rotten_flesh', 24, 2, 16, 2],
            [1, 'minecraft:bone', 24, 2, 12, 2],
            [2, 'minecraft:glass_bottle', 12, 2, 10, 4]
        ])
        btmAddSellTrades(event, 'minecraft:librarian', [
            [1, 'minecraft:paper', 32, 2, 16, 2],
            [1, 'minecraft:book', 8, 2, 10, 2],
            [2, 'minecraft:ink_sac', 12, 2, 10, 4]
        ])
        btmAddSellTrades(event, 'minecraft:cartographer', [
            [1, 'minecraft:paper', 32, 2, 16, 2],
            [2, 'minecraft:compass', 2, 2, 8, 4],
            [2, 'minecraft:glass_pane', 24, 2, 10, 4]
        ])
        btmAddSellTrades(event, 'minecraft:toolsmith', [
            [1, 'minecraft:flint', 16, 2, 12, 2],
            [1, 'minecraft:coal', 16, 2, 12, 2],
            [2, 'minecraft:copper_ingot', 8, 2, 8, 4]
        ])
        btmAddSellTrades(event, 'minecraft:weaponsmith', [
            [1, 'minecraft:coal', 16, 2, 12, 2],
            [1, 'minecraft:flint', 16, 2, 12, 2],
            [2, 'minecraft:gunpowder', 8, 2, 8, 4]
        ])
        btmAddSellTrades(event, 'minecraft:armorer', [
            [1, 'minecraft:coal', 16, 2, 12, 2],
            [2, 'minecraft:copper_ingot', 8, 2, 8, 4]
        ])

        // Farmer: food recovery, cooking infrastructure, feast/restock support.
        btmAddTrades(event, 'minecraft:farmer', [
            [1, 'copper', 2, 'minecraft:bread', 6, 16, 2],
            [1, 'copper', 2, 'minecraft:apple', 4, 12, 2],
            [1, 'copper', 3, 'farmersdelight:cabbage', 4, 12, 2],
            [1, 'copper', 3, 'farmersdelight:onion', 4, 12, 2],
            [2, 'iron', 2, 'farmersdelight:cooking_pot', 1, 4, 8],
            [2, 'iron', 3, 'farmersdelight:skillet', 1, 4, 8],
            [2, 'tin', 3, 'farmersdelight:tomato_sauce', 3, 8, 8],
            [3, 'tin', 3, 'farmersdelight:roast_chicken_block', 1, 4, 12],
            [3, 'bronze', 3, 'farmersdelight:honey_glazed_ham_block', 1, 4, 12],
            [4, 'nickel', 4, 'farmersdelight:shepherds_pie_block', 1, 3, 16],
            [4, 'silver', 4, 'farmersdelight:rice_roll_medley_block', 1, 3, 16],
            [5, 'gold', 6, 'farmersdelight:stuffed_pumpkin_block', 1, 2, 20]
        ])

        // Butcher: protein and recovery meals. No bulk animal-product arbitrage.
        btmAddTrades(event, 'minecraft:butcher', [
            [1, 'copper', 2, 'minecraft:cooked_porkchop', 4, 12, 2],
            [1, 'copper', 2, 'minecraft:cooked_beef', 4, 12, 2],
            [2, 'iron', 3, 'farmersdelight:smoked_ham', 2, 8, 6],
            [2, 'iron', 3, 'farmersdelight:minced_beef', 6, 8, 6],
            [3, 'tin', 4, 'farmersdelight:bacon_sandwich', 2, 6, 10],
            [3, 'bronze', 4, 'farmersdelight:mutton_wrap', 2, 6, 10],
            [4, 'nickel', 4, 'farmersdelight:beef_stew', 2, 5, 14],
            [4, 'silver', 5, 'farmersdelight:roasted_mutton_chops', 2, 5, 14],
            [5, 'steel', 6, 'mynethersdelight:roast_stuffed_hoglin', 1, 2, 20]
        ])

        // Fisherman: water travel, food, and ocean expedition restock.
        btmAddTrades(event, 'minecraft:fisherman', [
            [1, 'copper', 2, 'minecraft:cod', 8, 16, 2],
            [1, 'copper', 3, 'minecraft:fishing_rod', 1, 8, 2],
            [2, 'iron', 3, 'minecraft:cooked_salmon', 6, 12, 6],
            [2, 'tin', 4, 'minecraft:kelp', 16, 12, 6],
            [3, 'bronze', 4, 'minecraft:nautilus_shell', 1, 4, 10],
            [3, 'nickel', 4, 'artifacts:snorkel', 1, 2, 10],
            [4, 'silver', 5, 'minecraft:heart_of_the_sea', 1, 2, 16],
            [5, 'platinum', 8, 'minecraft:trident', 1, 1, 24]
        ])

        // Fletcher: ranged combat and route marking.
        btmAddTrades(event, 'minecraft:fletcher', [
            [1, 'copper', 2, 'minecraft:arrow', 16, 16, 2],
            [1, 'copper', 3, 'minecraft:bow', 1, 8, 2],
            [2, 'iron', 3, 'minecraft:crossbow', 1, 6, 6],
            [2, 'iron', 2, 'minecraft:spectral_arrow', 8, 8, 6],
            [3, 'tin', 4, 'rehooked:wood_hook', 1, 5, 10],
            [3, 'bronze', 4, 'minecraft:target', 4, 8, 10],
            [4, 'silver', 5, 'minecraft:tipped_arrow', 8, 6, 14],
            [5, 'diamond', 6, 'minecraft:totem_of_undying', 1, 1, 24]
        ])

        // Shepherd: beds, wool, banners, and settlement comfort.
        btmAddTrades(event, 'minecraft:shepherd', [
            [1, 'copper', 2, 'minecraft:white_wool', 8, 16, 2],
            [1, 'copper', 3, 'minecraft:white_bed', 1, 8, 2],
            [1, 'copper', 3, 'another_furniture:oak_chair', 2, 10, 2],
            [1, 'copper', 4, 'another_furniture:oak_table', 1, 8, 2],
            [2, 'iron', 2, 'minecraft:leather', 6, 12, 6],
            [2, 'tin', 3, 'minecraft:white_banner', 2, 8, 6],
            [2, 'tin', 3, 'another_furniture:furniture_hammer', 1, 6, 6],
            [2, 'tin', 3, 'handcrafted:hammer', 1, 6, 6],
            [3, 'bronze', 4, 'minecraft:painting', 3, 8, 10],
            [3, 'bronze', 4, 'handcrafted:oak_table', 1, 6, 10],
            [3, 'bronze', 4, 'procedural_bouquets:bouquet_grid', 1, 4, 10],
            [3, 'bronze', 2, 'procedural_bouquets:potted_bouquet', 1, 8, 10],
            [3, 'nickel', 4, 'beautify:oak_blinds', 4, 6, 10],
            [3, 'nickel', 4, 'another_furniture:service_bell', 1, 4, 10],
            [4, 'silver', 5, 'beautify:lamp_candelabra', 2, 4, 14],
            [4, 'steel', 5, 'handcrafted:fancy_painting', 2, 4, 14],
            [5, 'emerald', 6, 'beautify:lamp_light_bulb', 4, 4, 20]
        ])

        // Leatherworker: carry, clothing, temperature and travel utility.
        btmAddTrades(event, 'minecraft:leatherworker', [
            [1, 'copper', 4, 'sophisticatedbackpacks:backpack', 1, 4, 4],
            [1, 'copper', 2, 'minecraft:leather_boots', 1, 8, 2],
            [2, 'iron', 4, 'sophisticatedbackpacks:pickup_upgrade', 1, 4, 8],
            [2, 'tin', 3, 'cold_sweat:sewing_table', 1, 4, 8],
            [3, 'bronze', 4, 'cold_sweat:goat_fur', 4, 6, 10],
            [3, 'nickel', 5, 'cold_sweat:hoglin_hide', 2, 4, 10],
            [4, 'brass', 6, 'sophisticatedbackpacks:feeding_upgrade', 1, 3, 16],
            [4, 'gold', 6, 'sophisticatedbackpacks:magnet_upgrade', 1, 3, 16],
            [5, 'platinum', 8, 'sophisticatedbackpacks:advanced_pickup_upgrade', 1, 2, 22]
        ])

        // Mason: construction stock and controlled tech material convenience.
        btmAddTrades(event, 'minecraft:mason', [
            [1, 'copper', 2, 'minecraft:bricks', 8, 16, 2],
            [1, 'copper', 2, 'minecraft:terracotta', 8, 16, 2],
            [1, 'copper', 3, 'wares:cardboard_box', 4, 12, 2],
            [1, 'copper', 3, 'twigs:bamboo_thatch', 8, 12, 2],
            [2, 'iron', 3, 'tconstruct:seared_brick', 8, 12, 6],
            [2, 'tin', 3, 'tconstruct:scorched_brick', 8, 8, 10],
            [2, 'tin', 3, 'buildersaddition:shelf_oak', 2, 8, 6],
            [2, 'tin', 3, 'buildersaddition:bench_oak', 2, 8, 6],
            [3, 'bronze', 4, 'minecraft:quartz_block', 8, 8, 10],
            [3, 'bronze', 4, 'beautify:botanist_workbench', 1, 5, 10],
            [3, 'bronze', 4, 'beautify:oak_trellis', 4, 8, 10],
            [3, 'bronze', 4, 'beautify:hanging_pot', 2, 8, 10],
            [3, 'nickel', 4, 'create:andesite_alloy', 4, 5, 12],
            [4, 'brass', 5, 'create:brass_sheet', 4, 4, 16],
            [4, 'brass', 5, 'excessive_building:copper_bulb', 4, 6, 16],
            [4, 'brass', 5, 'beautify:lamp_light_bulb', 4, 6, 16],
            [4, 'gold', 5, 'minecraft:obsidian', 8, 4, 16],
            [5, 'osmium', 6, 'minecraft:crying_obsidian', 4, 3, 20],
            [5, 'platinum', 8, 'ae2:sky_stone_block', 16, 2, 22]
        ])

        // Toolsmith: recovery tools and workshop consumables.
        btmAddTrades(event, 'minecraft:toolsmith', [
            [1, 'copper', 4, 'tconstruct:repair_kit', 1, 8, 3],
            [1, 'copper', 3, 'minecraft:stone_pickaxe', 1, 8, 2],
            [2, 'iron', 4, 'minecraft:iron_pickaxe', 1, 4, 6],
            [2, 'tin', 4, 'minecraft:shears', 1, 6, 6],
            [3, 'bronze', 4, 'create:super_glue', 1, 6, 10],
            [3, 'nickel', 5, 'buildinggadgets2:gadget_cut_paste', 1, 2, 12],
            [4, 'brass', 6, 'buildinggadgets2:gadget_building', 1, 2, 16],
            [4, 'gold', 6, 'create:wrench', 1, 4, 16],
            [5, 'diamond', 6, 'minecraft:diamond_pickaxe', 1, 2, 22],
            [5, 'ruby', 8, 'buildinggadgets2:gadget_exchanging', 1, 1, 26]
        ])

        // Armorer: defensive recovery, not main gear progression.
        btmAddTrades(event, 'minecraft:armorer', [
            [1, 'copper', 3, 'minecraft:shield', 1, 8, 3],
            [1, 'copper', 3, 'minecraft:chainmail_boots', 1, 6, 2],
            [2, 'iron', 4, 'minecraft:chainmail_leggings', 1, 6, 6],
            [2, 'tin', 4, 'minecraft:chainmail_helmet', 1, 6, 6],
            [3, 'nickel', 4, 'minecraft:chainmail_chestplate', 1, 4, 10],
            [3, 'silver', 5, 'minecraft:iron_chestplate', 1, 3, 10],
            [4, 'steel', 5, 'minecraft:diamond_helmet', 1, 2, 16],
            [4, 'brass', 5, 'minecraft:diamond_boots', 1, 2, 16],
            [5, 'platinum', 8, 'minecraft:diamond_chestplate', 1, 1, 22],
            [5, 'sapphire', 8, 'minecraft:diamond_leggings', 1, 1, 22]
        ])

        // Weaponsmith: expedition weapons and blast-mining stock.
        btmAddTrades(event, 'minecraft:weaponsmith', [
            [1, 'copper', 3, 'minecraft:stone_sword', 1, 8, 2],
            [1, 'copper', 3, 'minecraft:iron_axe', 1, 6, 3],
            [2, 'iron', 4, 'minecraft:crossbow', 1, 6, 6],
            [2, 'tin', 3, 'minecraft:gunpowder', 8, 10, 6],
            [3, 'silver', 4, 'minecraft:tnt', 4, 6, 10],
            [3, 'bronze', 4, 'minecraft:fire_charge', 8, 8, 10],
            [4, 'steel', 5, 'minecraft:diamond_sword', 1, 2, 16],
            [4, 'gold', 5, 'minecraft:golden_apple', 1, 4, 16],
            [5, 'ruby', 8, 'minecraft:enchanted_golden_apple', 1, 1, 28],
            [5, 'topaz', 8, 'minecraft:netherite_scrap', 1, 1, 28]
        ])

        // Cleric: magic recovery and ritual support. Slates are convenience, not the main altar route.
        btmAddTrades(event, 'minecraft:cleric', [
            [1, 'copper', 3, 'minecraft:redstone', 8, 12, 3],
            [1, 'copper', 3, 'minecraft:lapis_lazuli', 8, 12, 3],
            [2, 'iron', 4, 'minecraft:glowstone_dust', 8, 10, 6],
            [2, 'tin', 4, 'bloodmagic:blankslate', 1, 6, 10],
            [3, 'bronze', 4, 'bloodmagic:reinforcedslate', 1, 4, 14],
            [3, 'silver', 5, 'minecraft:ender_pearl', 2, 6, 12],
            [4, 'gold', 6, 'bloodmagic:infusedslate', 1, 3, 18],
            [4, 'osmium', 6, 'minecraft:blaze_rod', 4, 4, 18],
            [5, 'diamond', 8, 'bloodmagic:demonslate', 1, 2, 24],
            [5, 'sapphire', 10, 'bloodmagic:etherealslate', 1, 1, 30]
        ])

        // Librarian: books, manuals, local intelligence, and late knowledge artifacts.
        btmAddTrades(event, 'minecraft:librarian', [
            [1, 'copper', 2, 'minecraft:book', 3, 16, 2],
            [1, 'copper', 3, 'minecraft:bookshelf', 2, 10, 2],
            [2, 'iron', 4, 'minecraft:name_tag', 1, 6, 6],
            [2, 'tin', 3, 'minecraft:lantern', 4, 10, 6],
            [3, 'brass', 4, 'oc2r:manual', 1, 4, 12],
            [3, 'silver', 5, 'minecraft:experience_bottle', 8, 8, 12],
            [4, 'gold', 5, 'minecraft:echo_shard', 1, 4, 16],
            [4, 'osmium', 6, 'ae2:certus_quartz_crystal', 4, 4, 18],
            [5, 'emerald', 8, 'minecraft:enchanted_book', 1, 2, 24],
            [5, 'topaz', 10, 'minecraft:dragon_breath', 2, 2, 30]
        ])

        // Cartographer: maps, route planning, and authored distance tools.
        btmAddTrades(event, 'minecraft:cartographer', [
            [1, 'copper', 3, 'minecraft:map', 2, 12, 2],
            [1, 'copper', 3, 'minecraft:compass', 1, 8, 2],
            [2, 'iron', 4, 'minecraft:clock', 1, 8, 6],
            [2, 'tin', 4, 'minecraft:filled_map', 1, 6, 6],
            [3, 'bronze', 5, 'supplementaries:flag_white', 4, 6, 10],
            [3, 'silver', 5, 'minecraft:recovery_compass', 1, 3, 12],
            [4, 'gold', 4, 'naturescompass:naturescompass', 1, 3, 14],
            [4, 'brass', 5, 'create:track_signal', 4, 5, 16],
            [5, 'platinum', 7, 'railways:conductor_whistle', 1, 2, 22],
            [5, 'ruby', 8, 'railways:track_coupler', 2, 2, 24]
        ])
    })

    MoreJSEvents.wandererTrades(function (event) {
        event.removeVanillaTrades(1)
        event.removeVanillaTrades(2)
        btmWandererTrade(event, 1, 'copper', 6, 'minecraft:saddle', 1, 3, 4)
        btmWandererTrade(event, 1, 'iron', 6, 'minecraft:lead', 4, 6, 4)
        btmWandererTrade(event, 1, 'tin', 5, 'minecraft:slime_ball', 8, 6, 6)
        btmWandererTrade(event, 1, 'bronze', 5, 'minecraft:scaffolding', 32, 6, 6)
        btmWandererTrade(event, 1, 'nickel', 5, 'minecraft:bundle', 1, 4, 8)
        btmWandererTrade(event, 1, 'silver', 4, 'create:track', 32, 4, 10)
        btmWandererTrade(event, 2, 'steel', 5, 'minecraft:ender_pearl', 2, 4, 10)
        btmWandererTrade(event, 2, 'brass', 5, 'create:linked_controller', 1, 2, 14)
        btmWandererTrade(event, 2, 'gold', 5, 'minecraft:golden_apple', 1, 3, 14)
        btmWandererTrade(event, 2, 'osmium', 6, 'minecraft:phantom_membrane', 2, 3, 16)
        btmWandererTrade(event, 2, 'platinum', 7, 'minecraft:shulker_shell', 1, 2, 18)
        btmWandererTrade(event, 2, 'diamond', 7, 'minecraft:totem_of_undying', 1, 1, 22)
        btmWandererTrade(event, 2, 'emerald', 8, 'artifacts:night_vision_goggles', 1, 1, 24)
        btmWandererTrade(event, 2, 'ruby', 8, 'minecraft:dragon_breath', 2, 1, 26)
        btmWandererTrade(event, 2, 'sapphire', 8, 'minecraft:dragon_head', 1, 1, 28)
        btmWandererTrade(event, 2, 'topaz', 10, 'minecraft:nether_star', 1, 1, 32)
    })
} else {
    console.warn('[coin-villager-trades] MoreJS event group is unavailable; villager trades were not rewritten.')
}
