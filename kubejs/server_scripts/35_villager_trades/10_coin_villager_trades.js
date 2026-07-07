// Replaces village trades with dotcoin purchases and lossy coin exchange.
// Coins are rewards from quests/adventure first; exchange trades are convenience with spread.

var BTM_COIN = {
    copper: 'createdeco:copper_coin',
    zinc: 'createdeco:zinc_coin',
    iron: 'createdeco:iron_coin',
    industrial_iron: 'createdeco:industrial_iron_coin',
    brass: 'createdeco:brass_coin',
    gold: 'createdeco:gold_coin',
    platinum: 'createdeco:netherite_coin'
}

var BTM_VILLAGER_COIN_WHITELIST = { copper: true, zinc: true, iron: true, industrial_iron: true, brass: true, gold: true, platinum: true }
var BTM_LOW_TIER_PROFESSIONS = ['minecraft:farmer','minecraft:fisherman','minecraft:fletcher','minecraft:mason','minecraft:librarian','minecraft:toolsmith']

var BTM_30_ITEMS = [
    ['minecraft:bread',4],['minecraft:apple',4],['minecraft:torch',16],['minecraft:coal',8],['minecraft:stick',32],
    ['minecraft:string',8],['minecraft:leather',4],['minecraft:paper',16],['minecraft:arrow',16],['minecraft:glass',8],
    ['minecraft:bucket',1],['minecraft:lantern',2],['minecraft:cooked_beef',4],['minecraft:carrot',12],['minecraft:potato',12],
    ['minecraft:oak_planks',32],['minecraft:cobblestone',48],['minecraft:andesite',32],['minecraft:granite',32],['minecraft:diorite',32],
    ['minecraft:iron_ingot',2],['minecraft:redstone',8],['minecraft:compass',1],['minecraft:map',1],['minecraft:fishing_rod',1],
    ['minecraft:shears',1],['minecraft:rail',16],['minecraft:tnt',1],['minecraft:bone_meal',16],['minecraft:bookshelf',1]
]

var BTM_INDUSTRIAL_IRON_MARKET = [
    ['minecraft:mason',2,3,'create:andesite_alloy',4,8,6],
    ['minecraft:mason',2,3,'create:andesite_casing',4,8,6],
    ['minecraft:mason',3,4,'create:cut_limestone',16,8,8],
    ['minecraft:mason',3,4,'create:cut_scoria',16,8,8],
    ['minecraft:mason',3,4,'create:cut_ochrum',16,8,8],
    ['minecraft:toolsmith',2,3,'additionalweaponry:wrench',1,6,6],
    ['minecraft:toolsmith',2,3,'create:super_glue',1,8,6],
    ['minecraft:toolsmith',3,4,'create:belt_connector',16,8,8],
    ['minecraft:toolsmith',3,4,'create:depot',2,8,8],
    ['minecraft:toolsmith',3,4,'create:chute',4,8,8],
    ['minecraft:toolsmith',3,4,'create:andesite_funnel',2,6,10],
    ['minecraft:toolsmith',3,4,'create:andesite_tunnel',2,6,10],
    ['minecraft:toolsmith',3,5,'create:portable_storage_interface',1,5,10],
    ['minecraft:cartographer',2,3,'create:track',24,6,8],
    ['minecraft:cartographer',2,3,'create:controller_rail',8,6,8],
    ['minecraft:cartographer',3,4,'create:track_signal',2,6,10],
    ['minecraft:cartographer',3,4,'create:track_observer',2,6,10],
    ['minecraft:cartographer',3,4,'create:track_station',1,5,10],
    ['minecraft:cartographer',4,5,'create:redstone_link',2,5,14],
    ['minecraft:librarian',2,3,'create:clipboard',1,6,8],
    ['minecraft:librarian',3,4,'create:display_link',1,5,10],
    ['minecraft:librarian',3,4,'create:display_board',2,5,10],
    ['minecraft:librarian',3,4,'create:content_observer',1,5,10],
    ['minecraft:fletcher',2,3,'minecraft:spectral_arrow',8,8,6],
    ['minecraft:fletcher',3,4,'minecraft:target',4,8,10],
    ['minecraft:leatherworker',3,4,'create:copper_backtank',1,4,10],
    ['minecraft:leatherworker',3,4,'create:copper_diving_helmet',1,4,10],
    ['minecraft:leatherworker',3,4,'create:copper_diving_boots',1,4,10],
    ['minecraft:cleric',3,4,'minecraft:glowstone_dust',12,8,10],
    ['minecraft:weaponsmith',3,4,'minecraft:tnt',3,6,10]
]

var BTM_GOLD_MARKET = [
    ['minecraft:farmer',4,5,'farmersdelight:stuffed_pumpkin_block',1,3,16],
    ['minecraft:farmer',4,5,'farmersdelight:gleaming_salad_block',1,3,16],
    ['minecraft:butcher',4,5,'farmersdelight:steak_and_potatoes',4,5,16],
    ['minecraft:fisherman',4,5,'minecraft:nautilus_shell',2,5,16],
    ['minecraft:fisherman',4,6,'minecraft:heart_of_the_sea',1,3,18],
    ['minecraft:fletcher',4,5,'minecraft:tipped_arrow',16,5,16],
    ['minecraft:shepherd',4,5,'minecraft:globe_banner_pattern',1,4,16],
    ['minecraft:leatherworker',4,5,'sophisticatedbackpacks:magnet_upgrade',1,3,16],
    ['minecraft:leatherworker',4,5,'sophisticatedbackpacks:refill_upgrade',1,3,16],
    ['minecraft:leatherworker',4,5,'sophisticatedbackpacks:restock_upgrade',1,3,16],
    ['minecraft:mason',4,5,'minecraft:obsidian',8,5,16],
    ['minecraft:mason',4,5,'minecraft:crying_obsidian',4,4,18],
    ['minecraft:toolsmith',4,5,'minecraft:diamond_pickaxe',1,3,18],
    ['minecraft:toolsmith',4,5,'create:empty_blaze_burner',1,3,18],
    ['minecraft:armorer',4,5,'minecraft:diamond_boots',1,2,18],
    ['minecraft:armorer',4,5,'minecraft:diamond_helmet',1,2,18],
    ['minecraft:weaponsmith',4,5,'minecraft:golden_apple',1,4,18],
    ['minecraft:cleric',4,5,'minecraft:ender_pearl',4,5,18],
    ['minecraft:cleric',4,6,'minecraft:blaze_rod',4,4,18],
    ['minecraft:librarian',4,5,'minecraft:experience_bottle',16,6,18],
    ['minecraft:librarian',4,5,'minecraft:echo_shard',1,4,18],
    ['minecraft:cartographer',4,5,'minecraft:recovery_compass',1,3,18]
]

var BTM_PLATINUM_MARKET = [
    ['minecraft:fisherman',5,7,'minecraft:trident',1,1,24],
    ['minecraft:fisherman',5,7,'minecraft:conduit',1,1,24],
    ['minecraft:fletcher',5,7,'minecraft:totem_of_undying',1,1,24],
    ['minecraft:shepherd',5,6,'minecraft:decorated_pot',4,4,20],
    ['minecraft:leatherworker',5,8,'sophisticatedbackpacks:advanced_pickup_upgrade',1,2,22],
    ['minecraft:leatherworker',5,8,'sophisticatedbackpacks:advanced_magnet_upgrade',1,2,22],
    ['minecraft:mason',5,7,'ae2:sky_stone_block',16,2,22],
    ['minecraft:mason',5,8,'minecraft:ancient_debris',2,1,26],
    ['minecraft:toolsmith',5,7,'minecraft:netherite_upgrade_smithing_template',1,1,24],
    ['minecraft:toolsmith',5,8,'minecraft:netherite_scrap',2,1,26],
    ['minecraft:armorer',5,8,'minecraft:diamond_chestplate',1,1,24],
    ['minecraft:armorer',5,8,'minecraft:diamond_leggings',1,1,24],
    ['minecraft:weaponsmith',5,8,'minecraft:enchanted_golden_apple',1,1,28],
    ['minecraft:weaponsmith',5,9,'minecraft:netherite_scrap',2,1,28],
    ['minecraft:cleric',5,8,'minecraft:ghast_tear',2,2,24],
    ['minecraft:cleric',5,10,'minecraft:sculk_catalyst',1,1,30],
    ['minecraft:librarian',5,8,'minecraft:enchanted_book',1,2,24],
    ['minecraft:librarian',5,8,'minecraft:dragon_breath',2,2,30],
    ['minecraft:cartographer',5,8,'minecraft:lodestone',1,2,24],
    ['minecraft:cartographer',5,10,'minecraft:beacon',1,1,32]
]

// Wandering trader: broad recovery, exploration, ecology, decor, and route supplies.
// Keep mandatory progression machinery out; this is a roaming convenience/sideload market.
// Row shape: [level, coin tier, cost, output item, output count, max uses, xp].
var BTM_WANDERER_MARKET = [
    [1, 'copper', 2, 'minecraft:oak_sapling', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:spruce_sapling', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:birch_sapling', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:jungle_sapling', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:acacia_sapling', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:dark_oak_sapling', 4, 8, 2],
    [1, 'copper', 4, 'minecraft:mangrove_propagule', 2, 6, 3],
    [1, 'copper', 4, 'minecraft:cherry_sapling', 2, 6, 3],
    [1, 'copper', 2, 'minecraft:cactus', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:sugar_cane', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:bamboo', 16, 8, 2],
    [1, 'copper', 2, 'minecraft:kelp', 16, 8, 2],
    [1, 'copper', 4, 'minecraft:vine', 8, 6, 3],
    [1, 'copper', 3, 'minecraft:lily_pad', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:moss_block', 8, 8, 2],
    [1, 'copper', 4, 'minecraft:big_dripleaf', 2, 6, 3],
    [1, 'copper', 3, 'minecraft:small_dripleaf', 4, 6, 3],
    [1, 'copper', 4, 'minecraft:glow_berries', 8, 6, 3],
    [1, 'copper', 2, 'minecraft:sweet_berries', 12, 8, 2],
    [1, 'copper', 2, 'minecraft:cocoa_beans', 12, 8, 2],
    [1, 'copper', 2, 'minecraft:brown_mushroom', 8, 8, 2],
    [1, 'copper', 2, 'minecraft:red_mushroom', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:sea_pickle', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:grass_block', 4, 6, 3],
    [1, 'copper', 3, 'minecraft:rooted_dirt', 8, 8, 2],
    [1, 'copper', 2, 'minecraft:dandelion', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:poppy', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:blue_orchid', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:allium', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:azure_bluet', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:red_tulip', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:orange_tulip', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:white_tulip', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:pink_tulip', 4, 8, 2],
    [1, 'copper', 2, 'minecraft:oxeye_daisy', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:cornflower', 4, 8, 2],
    [1, 'copper', 3, 'minecraft:lily_of_the_valley', 4, 8, 2],
    [1, 'copper', 4, 'minecraft:sunflower', 4, 6, 3],
    [1, 'copper', 4, 'minecraft:lilac', 4, 6, 3],
    [1, 'copper', 4, 'minecraft:rose_bush', 4, 6, 3],
    [1, 'copper', 4, 'minecraft:peony', 4, 6, 3],
    [1, 'zinc', 2, 'minecraft:pink_petals', 8, 6, 4],
    [1, 'zinc', 4, 'minecraft:spore_blossom', 2, 4, 6],
    [1, 'zinc', 5, 'minecraft:torchflower', 2, 4, 6],
    [1, 'zinc', 5, 'minecraft:pitcher_plant', 2, 4, 6],
    [1, 'copper', 3, 'minecraft:white_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:orange_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:magenta_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:light_blue_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:yellow_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:lime_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:pink_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:gray_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:light_gray_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:cyan_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:purple_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:blue_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:brown_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:green_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:red_dye', 8, 8, 2],
    [1, 'copper', 3, 'minecraft:black_dye', 8, 8, 2],
    [1, 'zinc', 3, 'minecraft:calcite', 16, 8, 4],
    [1, 'zinc', 3, 'minecraft:tuff', 24, 8, 4],
    [1, 'zinc', 3, 'minecraft:dripstone_block', 16, 8, 4],
    [1, 'zinc', 3, 'minecraft:pointed_dripstone', 8, 8, 4],
    [1, 'zinc', 3, 'minecraft:mud', 16, 8, 4],
    [1, 'zinc', 4, 'minecraft:packed_mud', 16, 8, 4],
    [1, 'zinc', 2, 'minecraft:clay', 8, 8, 4],
    [1, 'zinc', 3, 'minecraft:terracotta', 16, 8, 4],
    [1, 'zinc', 4, 'minecraft:podzol', 8, 6, 4],
    [1, 'zinc', 4, 'minecraft:mycelium', 8, 6, 4],
    [1, 'zinc', 2, 'minecraft:sand', 32, 8, 4],
    [1, 'zinc', 3, 'minecraft:red_sand', 24, 8, 4],
    [1, 'zinc', 2, 'minecraft:gravel', 32, 8, 4],
    [1, 'zinc', 4, 'minecraft:ice', 16, 8, 4],
    [1, 'zinc', 5, 'minecraft:packed_ice', 16, 6, 6],
    [1, 'iron', 5, 'minecraft:blue_ice', 8, 4, 8],
    [1, 'zinc', 3, 'minecraft:lantern', 4, 8, 4],
    [1, 'zinc', 4, 'minecraft:soul_lantern', 4, 8, 4],
    [1, 'zinc', 4, 'minecraft:campfire', 2, 8, 4],
    [1, 'zinc', 5, 'minecraft:soul_campfire', 2, 6, 6],
    [1, 'iron', 6, 'minecraft:saddle', 1, 4, 8],
    [1, 'iron', 6, 'minecraft:lead', 4, 6, 8],
    [1, 'iron', 5, 'minecraft:name_tag', 1, 4, 8],
    [1, 'iron', 5, 'minecraft:bell', 1, 4, 8],
    [1, 'iron', 5, 'minecraft:scaffolding', 32, 8, 8],
    [1, 'iron', 4, 'minecraft:chain', 16, 8, 8],
    [1, 'iron', 5, 'minecraft:slime_ball', 8, 8, 8],
    [1, 'iron', 4, 'minecraft:honeycomb', 8, 8, 8],
    [1, 'iron', 4, 'minecraft:honey_bottle', 4, 8, 8],
    [1, 'iron', 5, 'minecraft:rabbit_foot', 2, 6, 8],
    [2, 'brass', 6, 'minecraft:cod_bucket', 1, 3, 12],
    [2, 'brass', 6, 'minecraft:salmon_bucket', 1, 3, 12],
    [2, 'brass', 7, 'minecraft:tropical_fish_bucket', 1, 3, 12],
    [2, 'brass', 7, 'minecraft:pufferfish_bucket', 1, 3, 12],
    [2, 'gold', 6, 'minecraft:axolotl_bucket', 1, 2, 16],
    [2, 'gold', 6, 'minecraft:tadpole_bucket', 1, 2, 16],
    [2, 'brass', 5, 'minecraft:nautilus_shell', 2, 4, 12],
    [2, 'gold', 6, 'minecraft:heart_of_the_sea', 1, 2, 18],
    [2, 'brass', 5, 'minecraft:ender_pearl', 2, 6, 12],
    [2, 'gold', 5, 'minecraft:blaze_rod', 4, 4, 16],
    [2, 'gold', 5, 'minecraft:ghast_tear', 2, 4, 16],
    [2, 'brass', 5, 'minecraft:magma_cream', 4, 6, 12],
    [2, 'brass', 4, 'minecraft:glowstone_dust', 12, 8, 12],
    [2, 'brass', 4, 'minecraft:quartz', 16, 8, 12],
    [2, 'brass', 5, 'minecraft:amethyst_shard', 12, 8, 12],
    [2, 'gold', 6, 'minecraft:phantom_membrane', 2, 4, 18],
    [2, 'gold', 6, 'minecraft:echo_shard', 1, 3, 18],
    [2, 'gold', 5, 'minecraft:spyglass', 1, 3, 16],
    [2, 'brass', 5, 'minecraft:clock', 1, 4, 12],
    [2, 'brass', 5, 'minecraft:compass', 1, 4, 12],
    [2, 'gold', 6, 'minecraft:recovery_compass', 1, 2, 18],
    [2, 'brass', 5, 'minecraft:music_disc_13', 1, 2, 12],
    [2, 'brass', 5, 'minecraft:music_disc_cat', 1, 2, 12],
    [2, 'gold', 5, 'minecraft:music_disc_otherside', 1, 2, 16],
    [2, 'gold', 5, 'minecraft:music_disc_5', 1, 2, 16],
    [2, 'gold', 7, 'minecraft:sniffer_egg', 1, 1, 22],
    [2, 'gold', 6, 'minecraft:torchflower_seeds', 2, 3, 18],
    [2, 'gold', 6, 'minecraft:pitcher_pod', 2, 3, 18],
    [2, 'gold', 6, 'minecraft:angler_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:archer_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:arms_up_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:blade_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:brewer_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:burn_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:danger_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:explorer_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:friend_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:heart_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:heartbreak_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:howl_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:miner_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:mourner_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:plenty_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:prize_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:sheaf_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:shelter_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:skull_pottery_sherd', 1, 2, 18],
    [2, 'gold', 6, 'minecraft:snort_pottery_sherd', 1, 2, 18],
    [2, 'platinum', 7, 'minecraft:coast_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:dune_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:eye_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:host_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:raiser_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:rib_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:sentry_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:shaper_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:silence_armor_trim_smithing_template', 1, 1, 24],
    [2, 'platinum', 7, 'minecraft:snout_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:spire_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:tide_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:vex_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:ward_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:wayfinder_armor_trim_smithing_template', 1, 1, 22],
    [2, 'platinum', 7, 'minecraft:wild_armor_trim_smithing_template', 1, 1, 22],
    [2, 'iron', 5, 'create:track', 32, 5, 12],
    [2, 'brass', 6, 'create:super_glue', 1, 4, 14],
    [2, 'gold', 6, 'additionalweaponry:wrench', 1, 3, 16],
    [2, 'gold', 7, 'create:linked_controller', 1, 2, 18],
    [2, 'gold', 6, 'create:copper_diving_helmet', 1, 2, 16],
    [2, 'gold', 6, 'create:copper_diving_boots', 1, 2, 16],
    [2, 'platinum', 8, 'pneumaticcraft:night_vision_upgrade', 1, 1, 24],
    [2, 'platinum', 8, 'minecraft:shulker_shell', 1, 2, 22],
    [2, 'platinum', 7, 'minecraft:totem_of_undying', 1, 1, 24],
    [2, 'platinum', 8, 'minecraft:dragon_breath', 2, 1, 26],
    [2, 'platinum', 8, 'minecraft:dragon_head', 1, 1, 28],
    [2, 'platinum', 10, 'minecraft:nether_star', 1, 1, 32]
]

var BTM_NON_GROWN_TRADE_BUY_BLOCKLIST = {
    'minecraft:coal': true,
    'minecraft:glass': true,
    'minecraft:bucket': true,
    'minecraft:lantern': true,
    'minecraft:cobblestone': true,
    'minecraft:stone': true,
    'minecraft:stone_bricks': true,
    'minecraft:mossy_stone_bricks': true,
    'minecraft:andesite': true,
    'minecraft:granite': true,
    'minecraft:diorite': true,
    'minecraft:calcite': true,
    'minecraft:tuff': true,
    'minecraft:dripstone_block': true,
    'minecraft:pointed_dripstone': true,
    'minecraft:mud': true,
    'minecraft:packed_mud': true,
    'minecraft:clay': true,
    'minecraft:clay_ball': true,
    'minecraft:terracotta': true,
    'minecraft:sand': true,
    'minecraft:red_sand': true,
    'minecraft:gravel': true,
    'minecraft:ice': true,
    'minecraft:packed_ice': true,
    'minecraft:blue_ice': true,
    'minecraft:iron_ingot': true,
    'minecraft:copper_ingot': true,
    'minecraft:redstone': true,
    'minecraft:lapis_lazuli': true,
    'minecraft:glowstone_dust': true,
    'minecraft:quartz': true,
    'minecraft:amethyst_shard': true,
    'minecraft:quartz_block': true,
    'minecraft:obsidian': true,
    'minecraft:crying_obsidian': true,
    'minecraft:ancient_debris': true,
    'minecraft:netherite_scrap': true,
    'minecraft:rail': true,
    'minecraft:tnt': true,
    'minecraft:chain': true,
    'minecraft:soul_lantern': true,
    'minecraft:campfire': true,
    'minecraft:soul_campfire': true,
    'minecraft:experience_bottle': true,
    'minecraft:echo_shard': true,
    'minecraft:sculk_catalyst': true,
    'minecraft:stone_pickaxe': true,
    'minecraft:iron_pickaxe': true,
    'minecraft:diamond_pickaxe': true,
    'minecraft:stone_sword': true,
    'minecraft:iron_axe': true,
    'minecraft:diamond_sword': true,
    'minecraft:diamond_helmet': true,
    'minecraft:diamond_chestplate': true,
    'minecraft:diamond_leggings': true,
    'minecraft:diamond_boots': true,
    'minecraft:netherite_upgrade_smithing_template': true,
    'create:andesite_alloy': true,
    'create:andesite_casing': true,
    'create:brass_sheet': true,
    'create:cut_limestone': true,
    'create:cut_scoria': true,
    'create:cut_ochrum': true,
    'create:belt_connector': true,
    'create:depot': true,
    'create:chute': true,
    'create:andesite_funnel': true,
    'create:andesite_tunnel': true,
    'create:portable_storage_interface': true,
    'create:track': true,
    'create:controller_rail': true,
    'create:track_signal': true,
    'create:track_observer': true,
    'create:track_station': true,
    'create:redstone_link': true,
    'create:display_link': true,
    'create:display_board': true,
    'create:content_observer': true,
    'tconstruct:seared_brick': true,
    'tconstruct:scorched_brick': true,
    'bloodmagic:blankslate': true,
    'ae2:sky_stone_block': true,
    'ae2:certus_quartz_crystal': true
}

function btmIsNonGrownInfiniteBuyResult(item) {
    return BTM_NON_GROWN_TRADE_BUY_BLOCKLIST[item] === true
}

function btmAddThirtyBuys(event, tier, baseCost) {
    for (var i = 0; i < BTM_30_ITEMS.length; i++) {
        var p = BTM_LOW_TIER_PROFESSIONS[i % BTM_LOW_TIER_PROFESSIONS.length]
        var lvl = (i % 5) + 1
        var it = BTM_30_ITEMS[i][0]
        var ct = BTM_30_ITEMS[i][1]
        btmTrade(event, p, lvl, tier, baseCost + Math.floor(i / 10), it, ct, 8, lvl * 3)
    }
}

function btmAddTierMarket(event, tier, rows) {
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        btmTrade(event, r[0], r[1], tier, r[2], r[3], r[4], r[5], r[6])
    }
}

function btmItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmTrade(event, profession, level, coinTier, costCount, resultItem, resultCount, uses, xp) {
    if (btmIsNonGrownInfiniteBuyResult(resultItem)) return
    if (!BTM_VILLAGER_COIN_WHITELIST[coinTier]) return
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
    if (btmIsNonGrownInfiniteBuyResult(resultItem)) return false
    if (!BTM_VILLAGER_COIN_WHITELIST[coinTier]) return
    var coin = BTM_COIN[coinTier]
    if (!coin || !btmItemExists(coin) || !btmItemExists(resultItem)) return false

    var trade = event.addTrade(level, [Item.of(coin, costCount)], Item.of(resultItem, resultCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 4)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || level * 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
    return true
}

function btmAddWandererMarket(event, rows) {
    var attempted = 0
    var registered = 0
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        attempted++
        if (btmWandererTrade(event, r[0], r[1], r[2], r[3], r[4], r[5], r[6])) registered++
    }
    console.info('[coin-villager-trades] Authored wandering trader options attempted=' + attempted + ' registered=' + registered)
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

function btmCoinExchangeTrade(event, profession, level, inputTier, inputCount, outputTier, outputCount, uses, xp) {
    if (!BTM_VILLAGER_COIN_WHITELIST[inputTier] || !BTM_VILLAGER_COIN_WHITELIST[outputTier]) return
    var inputCoin = BTM_COIN[inputTier]
    var outputCoin = BTM_COIN[outputTier]
    if (!inputCoin || !outputCoin) {
        console.warn('[coin-villager-trades] Unknown exchange tier: ' + inputTier + ' -> ' + outputTier)
        return
    }
    if (!btmItemExists(inputCoin) || !btmItemExists(outputCoin)) return

    var trade = event.addTrade(profession, level, [Item.of(inputCoin, inputCount)], Item.of(outputCoin, outputCount))
    if (trade && trade.maxUses) trade.maxUses(uses || 12)
    if (trade && trade.villagerExperience) trade.villagerExperience(xp || level * 2)
    if (trade && trade.priceMultiplier) trade.priceMultiplier(0.0)
}

function btmAddCoinExchangeTrades(event, profession, rows) {
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        btmCoinExchangeTrade(event, profession, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7])
    }
}

if (typeof MoreJSEvents !== 'undefined') {
    MoreJSEvents.villagerTrades(function (event) {
        event.removeVanillaTrades()
        event.removeModdedTrades()

        // Moneychanger trades are intentionally lossy in both directions.
        // They smooth progression currency without making lower-tier farms mint higher-tier coins efficiently.
        btmAddCoinExchangeTrades(event, 'minecraft:cleric', [
            [1, 'copper', 10, 'zinc', 1, 16, 2],
            [1, 'zinc', 1, 'copper', 6, 16, 2],
            [2, 'zinc', 8, 'iron', 1, 12, 6],
            [2, 'iron', 1, 'zinc', 5, 12, 6],
            [3, 'iron', 1, 'copper', 24, 6, 20]
        ])
        btmAddCoinExchangeTrades(event, 'minecraft:cartographer', [
            [2, 'copper', 12, 'zinc', 1, 8, 6],
            [2, 'zinc', 1, 'copper', 5, 8, 6],
            [3, 'zinc', 10, 'iron', 1, 6, 10],
            [3, 'iron', 1, 'zinc', 4, 6, 10]
        ])
        btmAddThirtyBuys(event, 'copper', 2)
        btmAddThirtyBuys(event, 'zinc', 3)
        btmAddThirtyBuys(event, 'iron', 4)
        btmAddTierMarket(event, 'industrial_iron', BTM_INDUSTRIAL_IRON_MARKET)
        btmAddTierMarket(event, 'gold', BTM_GOLD_MARKET)
        btmAddTierMarket(event, 'platinum', BTM_PLATINUM_MARKET)

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
            [2, 'minecraft:tropical_fish', 8, 2, 10, 4],
            [2, 'starcatcher:pinfish', 6, 3, 8, 6],
            [2, 'starcatcher:stonefish', 6, 3, 8, 6],
            [3, 'starcatcher:shroomfish', 4, 4, 6, 10],
            [3, 'starcatcher:deepslatefish', 4, 4, 6, 10],
            [4, 'starcatcher:sculkfish', 2, 6, 4, 16],
            [4, 'starcatcher:magma_fish', 2, 6, 4, 16]
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
            [2, 'brass', 3, 'farmersdelight:tomato_sauce', 3, 8, 8],
            [3, 'brass', 3, 'farmersdelight:roast_chicken_block', 1, 4, 12],
            [3, 'brass', 3, 'farmersdelight:honey_glazed_ham_block', 1, 4, 12],
            [4, 'brass', 4, 'farmersdelight:shepherds_pie_block', 1, 3, 16],
            [4, 'brass', 4, 'farmersdelight:rice_roll_medley_block', 1, 3, 16],
            [5, 'gold', 6, 'farmersdelight:stuffed_pumpkin_block', 1, 2, 20]
        ])

        // Butcher: protein and recovery meals. No bulk animal-product arbitrage.
        btmAddTrades(event, 'minecraft:butcher', [
            [1, 'copper', 2, 'minecraft:cooked_porkchop', 4, 12, 2],
            [1, 'copper', 2, 'minecraft:cooked_beef', 4, 12, 2],
            [2, 'iron', 3, 'farmersdelight:smoked_ham', 2, 8, 6],
            [2, 'iron', 3, 'farmersdelight:minced_beef', 6, 8, 6],
            [3, 'brass', 4, 'farmersdelight:bacon_sandwich', 2, 6, 10],
            [3, 'brass', 4, 'farmersdelight:mutton_wrap', 2, 6, 10],
            [4, 'brass', 4, 'farmersdelight:beef_stew', 2, 5, 14],
            [4, 'brass', 5, 'farmersdelight:roasted_mutton_chops', 2, 5, 14],
            [5, 'brass', 6, 'farmersdelight:nether_salad', 4, 3, 20]
        ])

        // Fisherman: water travel, food, and ocean expedition restock.
        btmAddTrades(event, 'minecraft:fisherman', [
            [1, 'copper', 2, 'minecraft:cod', 8, 16, 2],
            [1, 'copper', 3, 'minecraft:fishing_rod', 1, 8, 2],
            [1, 'copper', 2, 'starcatcher:worm', 8, 12, 2],
            [1, 'copper', 3, 'starcatcher:starcatcher_twine', 2, 8, 2],
            [2, 'iron', 3, 'starcatcher:bobber', 1, 8, 6],
            [2, 'iron', 4, 'starcatcher:hook', 1, 8, 6],
            [2, 'iron', 3, 'minecraft:cooked_salmon', 6, 12, 6],
            [2, 'brass', 4, 'minecraft:kelp', 16, 12, 6],
            [3, 'brass', 4, 'starcatcher:steady_bobber', 1, 5, 10],
            [3, 'brass', 4, 'starcatcher:stone_hook', 1, 5, 10],
            [3, 'brass', 5, 'starcatcher:murkwater_bait', 4, 6, 10],
            [3, 'brass', 4, 'minecraft:nautilus_shell', 1, 4, 10],
            [3, 'brass', 4, 'create:copper_diving_helmet', 1, 2, 10],
            [4, 'brass', 5, 'minecraft:heart_of_the_sea', 1, 2, 16],
            [4, 'gold', 6, 'starcatcher:fish_radar', 1, 3, 16],
            [4, 'gold', 5, 'starcatcher:waterlogged_satchel', 1, 4, 16],
            [5, 'platinum', 8, 'minecraft:trident', 1, 1, 24]
        ])

        // Fletcher: ranged combat and route marking.
        btmAddTrades(event, 'minecraft:fletcher', [
            [1, 'copper', 2, 'minecraft:arrow', 16, 16, 2],
            [1, 'copper', 3, 'minecraft:bow', 1, 8, 2],
            [2, 'iron', 3, 'minecraft:crossbow', 1, 6, 6],
            [2, 'iron', 2, 'minecraft:spectral_arrow', 8, 8, 6],
            [3, 'brass', 4, 'rehooked:wood_hook', 1, 5, 10],
            [3, 'brass', 4, 'minecraft:target', 4, 8, 10],
            [4, 'brass', 5, 'minecraft:tipped_arrow', 8, 6, 14],
            [5, 'platinum', 6, 'minecraft:totem_of_undying', 1, 1, 24]
        ])

        // Shepherd: beds, wool, banners, and settlement comfort.
        btmAddTrades(event, 'minecraft:shepherd', [
            [1, 'copper', 2, 'minecraft:white_wool', 8, 16, 2],
            [1, 'copper', 3, 'minecraft:white_bed', 1, 8, 2],
            [2, 'iron', 2, 'minecraft:leather', 6, 12, 6],
            [2, 'brass', 3, 'minecraft:white_banner', 2, 8, 6],
            [3, 'brass', 4, 'minecraft:painting', 3, 8, 10],
            [3, 'brass', 4, 'procedural_bouquets:bouquet_grid', 1, 4, 10],
            [3, 'brass', 2, 'procedural_bouquets:potted_bouquet', 1, 8, 10],
            [4, 'brass', 5, 'minecraft:flower_banner_pattern', 1, 4, 14],
            [4, 'brass', 5, 'minecraft:globe_banner_pattern', 1, 4, 14],
            [5, 'platinum', 6, 'minecraft:decorated_pot', 4, 4, 20]
        ])

        // Leatherworker: carry, clothing, temperature and travel utility.
        btmAddTrades(event, 'minecraft:leatherworker', [
            [1, 'copper', 4, 'sophisticatedbackpacks:backpack', 1, 4, 4],
            [1, 'copper', 2, 'minecraft:leather_boots', 1, 8, 2],
            [2, 'iron', 4, 'sophisticatedbackpacks:pickup_upgrade', 1, 4, 8],
            [2, 'brass', 3, 'cold_sweat:sewing_table', 1, 4, 8],
            [3, 'brass', 4, 'cold_sweat:goat_fur', 4, 6, 10],
            [3, 'brass', 5, 'cold_sweat:hoglin_hide', 2, 4, 10],
            [4, 'gold', 6, 'sophisticatedbackpacks:magnet_upgrade', 1, 3, 16],
            [5, 'platinum', 8, 'sophisticatedbackpacks:advanced_pickup_upgrade', 1, 2, 22]
        ])

        // Mason: construction stock and controlled tech material convenience.
        btmAddTrades(event, 'minecraft:mason', [
            [1, 'copper', 2, 'minecraft:bricks', 8, 16, 2],
            [1, 'copper', 2, 'minecraft:terracotta', 8, 16, 2],
            [1, 'copper', 3, 'wares:cardboard_box', 4, 12, 2],
            [2, 'iron', 3, 'tconstruct:seared_brick', 8, 12, 6],
            [2, 'brass', 3, 'tconstruct:scorched_brick', 8, 8, 10],
            [3, 'brass', 4, 'minecraft:quartz_block', 8, 8, 10],
            [3, 'brass', 4, 'minecraft:stone_bricks', 16, 8, 10],
            [3, 'brass', 4, 'minecraft:mossy_stone_bricks', 16, 8, 10],
            [3, 'brass', 4, 'create:andesite_alloy', 4, 5, 12],
            [4, 'brass', 5, 'create:brass_sheet', 4, 4, 16],
            [4, 'brass', 5, 'minecraft:lantern', 8, 6, 16],
            [4, 'brass', 5, 'minecraft:chain', 16, 6, 16],
            [4, 'gold', 5, 'minecraft:obsidian', 8, 4, 16],
            [5, 'platinum', 6, 'minecraft:crying_obsidian', 4, 3, 20],
            [5, 'platinum', 8, 'ae2:sky_stone_block', 16, 2, 22]
        ])

        // Toolsmith: recovery tools and workshop consumables.
        btmAddTrades(event, 'minecraft:toolsmith', [
            [1, 'copper', 4, 'tconstruct:repair_kit', 1, 8, 3],
            [1, 'copper', 3, 'minecraft:stone_pickaxe', 1, 8, 2],
            [2, 'iron', 4, 'minecraft:iron_pickaxe', 1, 4, 6],
            [2, 'brass', 4, 'minecraft:shears', 1, 6, 6],
            [3, 'brass', 4, 'create:super_glue', 1, 6, 10],
            [4, 'gold', 6, 'additionalweaponry:wrench', 1, 4, 16],
            [5, 'platinum', 6, 'minecraft:diamond_pickaxe', 1, 2, 22]
        ])

        // Armorer: defensive recovery, not main gear progression.
        btmAddTrades(event, 'minecraft:armorer', [
            [1, 'copper', 3, 'minecraft:shield', 1, 8, 3],
            [1, 'copper', 3, 'minecraft:chainmail_boots', 1, 6, 2],
            [2, 'iron', 4, 'minecraft:chainmail_leggings', 1, 6, 6],
            [2, 'brass', 4, 'minecraft:chainmail_helmet', 1, 6, 6],
            [3, 'brass', 4, 'minecraft:chainmail_chestplate', 1, 4, 10],
            [3, 'brass', 5, 'minecraft:iron_chestplate', 1, 3, 10],
            [4, 'brass', 5, 'minecraft:diamond_helmet', 1, 2, 16],
            [4, 'brass', 5, 'minecraft:diamond_boots', 1, 2, 16],
            [5, 'platinum', 8, 'minecraft:diamond_chestplate', 1, 1, 22],
            [5, 'platinum', 8, 'minecraft:diamond_leggings', 1, 1, 22]
        ])

        // Weaponsmith: expedition weapons and blast-mining stock.
        btmAddTrades(event, 'minecraft:weaponsmith', [
            [1, 'copper', 3, 'minecraft:stone_sword', 1, 8, 2],
            [1, 'copper', 3, 'minecraft:iron_axe', 1, 6, 3],
            [2, 'iron', 4, 'minecraft:crossbow', 1, 6, 6],
            [2, 'brass', 3, 'minecraft:gunpowder', 8, 10, 6],
            [3, 'brass', 4, 'minecraft:tnt', 4, 6, 10],
            [3, 'brass', 4, 'minecraft:fire_charge', 8, 8, 10],
            [4, 'brass', 5, 'minecraft:diamond_sword', 1, 2, 16],
            [4, 'gold', 5, 'minecraft:golden_apple', 1, 4, 16],
            [5, 'platinum', 8, 'minecraft:enchanted_golden_apple', 1, 1, 28],
            [5, 'platinum', 8, 'minecraft:netherite_scrap', 1, 1, 28]
        ])

        // Cleric: magic recovery and ritual support. High slates stay altar-authored.
        btmAddTrades(event, 'minecraft:cleric', [
            [1, 'copper', 3, 'minecraft:redstone', 8, 12, 3],
            [1, 'copper', 3, 'minecraft:lapis_lazuli', 8, 12, 3],
            [2, 'iron', 4, 'minecraft:glowstone_dust', 8, 10, 6],
            [2, 'brass', 4, 'bloodmagic:blankslate', 1, 6, 10],
            [3, 'brass', 4, 'minecraft:amethyst_shard', 8, 8, 14],
            [3, 'brass', 5, 'minecraft:ender_pearl', 2, 6, 12],
            [4, 'gold', 6, 'minecraft:ghast_tear', 2, 4, 18],
            [4, 'platinum', 6, 'minecraft:blaze_rod', 4, 4, 18],
            [5, 'platinum', 8, 'minecraft:sculk_catalyst', 1, 2, 24],
            [5, 'platinum', 10, 'minecraft:echo_shard', 2, 1, 30]
        ])

        // Librarian: books, manuals, local intelligence, and late knowledge artifacts.
        btmAddTrades(event, 'minecraft:librarian', [
            [1, 'copper', 2, 'minecraft:book', 3, 16, 2],
            [1, 'copper', 3, 'minecraft:bookshelf', 2, 10, 2],
            [2, 'iron', 4, 'minecraft:name_tag', 1, 6, 6],
            [2, 'brass', 3, 'minecraft:lantern', 4, 10, 6],
            [3, 'brass', 4, 'oc2r:manual', 1, 4, 12],
            [3, 'brass', 5, 'minecraft:experience_bottle', 8, 8, 12],
            [4, 'gold', 5, 'minecraft:echo_shard', 1, 4, 16],
            [4, 'platinum', 6, 'ae2:certus_quartz_crystal', 4, 4, 18],
            [5, 'platinum', 8, 'minecraft:enchanted_book', 1, 2, 24],
            [5, 'platinum', 10, 'minecraft:dragon_breath', 2, 2, 30]
        ])

        // Cartographer: maps, route planning, and authored distance tools.
        btmAddTrades(event, 'minecraft:cartographer', [
            [1, 'copper', 3, 'minecraft:map', 2, 12, 2],
            [1, 'copper', 3, 'minecraft:compass', 1, 8, 2],
            [2, 'iron', 4, 'minecraft:clock', 1, 8, 6],
            [2, 'brass', 4, 'minecraft:filled_map', 1, 6, 6],
            [3, 'brass', 5, 'minecraft:white_banner', 4, 6, 10],
            [3, 'brass', 5, 'minecraft:recovery_compass', 1, 3, 12],
            [4, 'gold', 4, 'naturescompass:naturescompass', 1, 3, 14],
            [4, 'brass', 5, 'create:track_signal', 4, 5, 16],
            [5, 'platinum', 7, 'create:track_station', 1, 2, 22],
            [5, 'platinum', 8, 'create:controller_rail', 8, 2, 24]
        ])
    })

    MoreJSEvents.wandererTrades(function (event) {
        event.removeVanillaTrades(1)
        event.removeVanillaTrades(2)
        event.removeModdedTrades(1)
        event.removeModdedTrades(2)
        btmAddWandererMarket(event, BTM_WANDERER_MARKET)
    })

    MoreJSEvents.playerStartTrading(function (event) {
        var copperStack = Item.of(BTM_COIN.copper)
        var copperItem = null
        try {
            if (copperStack && copperStack.getItem) copperItem = copperStack.getItem()
        } catch (e) {
            copperItem = null
        }
        if (copperItem == null) {
            console.warn('[coin-villager-trades] Could not resolve copper coin item for live emerald scrub.')
            return
        }

        event.forEachOffers(function (offer, index) {
            try {
                if (offer && offer['morejs$replaceEmeralds']) {
                    offer['morejs$replaceEmeralds'](copperItem)
                    if (offer['morejs$setPriceMultiplier']) offer['morejs$setPriceMultiplier'](0.0)
                }
            } catch (e) {
                console.warn('[coin-villager-trades] Failed to scrub emerald offer #' + index + ': ' + e)
            }
        })
    })
} else {
    console.warn('[coin-villager-trades] MoreJS event group is unavailable; villager trades were not rewritten.')
}
