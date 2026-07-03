// Global loot progression scrub. Loot is a crafting surface, so high-power materials
// and creative/flight/global-bypass items must not enter through random tables.

var BTM_LOOT_REMOVE_ITEMS = [
    // Generated from registry: all creative and netherite-named items are removed from generic loot.
    'ae2:creative_energy_cell',
    'ae2:creative_fluid_cell',
    'ae2:creative_item_cell',
    'aether:netherite_gloves',
    'ars_nouveau:creative_source_jar',
    'ars_nouveau:creative_spell_book',
    'arseng:creative_source_cell',
    'art_update:netherite_multitool',
    'bloodmagic:activationcrystalcreative',
    'bloodmagic:fragment_netherite_scrap',
    'bloodmagic:gravel_netherite_scrap',
    'bloodmagic:sand_netherite',
    'create:creative_blaze_cake',
    'create:creative_crate',
    'create:creative_fluid_tank',
    'create:creative_motor',
    'create:netherite_backtank',
    'create:netherite_backtank_placeable',
    'create:netherite_diving_boots',
    'create:netherite_diving_helmet',
    'create_central_kitchen:creative_tab_icon',
    'create_connected:creative_fluid_vessel',
    'create_things_and_misc:netherite_portable_whistle',
    'createmoredrillheads:amethyst_dusts_tipped_netherite_drill',
    'createmoredrillheads:emerald_dusts_tipped_netherite_drill',
    'createmoredrillheads:netherite_drill',
    'createmoredrillheads:quartz_dusts_tipped_netherite_drill',
    'createmoredrillheads:redstone_dusts_tipped_netherite_drill',
    'creatingspace:netherite_oxygen_backtank',
    'creatingspace:netherite_oxygen_backtank_placeable',
    'delightful:gilded_netherite_knife',
    'delightful:netherite_opal_knife',
    'farmersdelight:netherite_knife',
    'forbidden_arcanus:netherite_blacksmith_gavel',
    'goety:netherite_ravager_armor',
    'goety:netherite_trampler_armor',
    'golemoverhaul:netherite_golem_spawn_egg',
    'hexcasting:creative_unlocker',
    'hexerei:broom_netherite_tip',
    'hexerei:creative_waxing_kit',
    'iceandfire:creative_dragon_meal',
    'irons_spellbooks:netherite_mage_boots',
    'irons_spellbooks:netherite_mage_chestplate',
    'irons_spellbooks:netherite_mage_helmet',
    'irons_spellbooks:netherite_mage_leggings',
    'irons_spellbooks:netherite_spell_book',
    'irons_spellbooks:blood_upgrade_orb',
    'irons_spellbooks:cooldown_upgrade_orb',
    'irons_spellbooks:diamond_spell_book',
    'irons_spellbooks:dragonskin_spell_book',
    'irons_spellbooks:eldritch_manuscript',
    'irons_spellbooks:ender_upgrade_orb',
    'irons_spellbooks:epic_ink',
    'irons_spellbooks:evocation_upgrade_orb',
    'irons_spellbooks:fire_upgrade_orb',
    'irons_spellbooks:holy_upgrade_orb',
    'irons_spellbooks:ice_upgrade_orb',
    'irons_spellbooks:legendary_ink',
    'irons_spellbooks:lesser_spell_slot_upgrade',
    'irons_spellbooks:lightning_upgrade_orb',
    'irons_spellbooks:mana_upgrade_orb',
    'irons_spellbooks:nature_upgrade_orb',
    'irons_spellbooks:protection_upgrade_orb',
    'irons_spellbooks:rare_ink',
    'irons_spellbooks:upgrade_orb',
    'littlelogistics:creative_capacitor',
    'malum:creative_scythe',
    'minecraft:elytra',
    'minecraft:netherite_axe',
    'minecraft:netherite_block',
    'minecraft:netherite_boots',
    'minecraft:netherite_chestplate',
    'minecraft:netherite_helmet',
    'minecraft:netherite_hoe',
    'minecraft:netherite_ingot',
    'minecraft:netherite_leggings',
    'minecraft:netherite_pickaxe',
    'minecraft:netherite_scrap',
    'minecraft:netherite_shovel',
    'minecraft:netherite_sword',
    'minecraft:netherite_upgrade_smithing_template',
    'naturesaura:netherite_finder',
    'oc2r:creative_energy',
    'powergrid:creative_current_source',
    'powergrid:creative_resistor',
    'powergrid:creative_voltage_source',
    'protection_pixel:smallnetheritesheet',
    'psi:cad_assembly_creative',
    'sophisticatedbackpacks:netherite_backpack',
    'sophisticatedstorage:basic_to_netherite_tier_upgrade',
    'sophisticatedstorage:copper_to_netherite_tier_upgrade',
    'sophisticatedstorage:diamond_to_netherite_tier_upgrade',
    'sophisticatedstorage:gold_to_netherite_tier_upgrade',
    'sophisticatedstorage:iron_to_netherite_tier_upgrade',
    'sophisticatedstorage:limited_netherite_barrel_1',
    'sophisticatedstorage:limited_netherite_barrel_2',
    'sophisticatedstorage:limited_netherite_barrel_3',
    'sophisticatedstorage:limited_netherite_barrel_4',
    'sophisticatedstorage:netherite_barrel',
    'sophisticatedstorage:netherite_chest',
    'sophisticatedstorage:netherite_shulker_box',
    'tconstruct:creative_slot',
    'tconstruct:molten_netherite_bucket',
    'tconstruct:netherite_item_frame',
    'tconstruct:netherite_nugget',
    'theoneprobe:creativeprobe',
    'theurgy:alchemical_sulfur_netherite',
    'tinkers_advanced:blaze_netherite',
    'tinkers_advanced:molten_blaze_netherite_bucket',
    'ubesdelight:rolling_pin_netherite',
    'wands:creative_wand',
    'wands:netherite_wand'
]

var BTM_LOOT_EMERALD_TABLES_TO_COIN = [
    'minecraft:chests/village/village_armorer',
    'minecraft:chests/village/village_butcher',
    'minecraft:chests/village/village_cartographer',
    'minecraft:chests/village/village_desert_house',
    'minecraft:chests/village/village_fisher',
    'minecraft:chests/village/village_fletcher',
    'minecraft:chests/village/village_mason',
    'minecraft:chests/village/village_plains_house',
    'minecraft:chests/village/village_savanna_house',
    'minecraft:chests/village/village_shepherd',
    'minecraft:chests/village/village_snowy_house',
    'minecraft:chests/village/village_taiga_house',
    'minecraft:chests/village/village_tannery',
    'minecraft:chests/village/village_temple',
    'minecraft:chests/village/village_toolsmith',
    'minecraft:chests/village/village_weaponsmith'
]

var BTM_LOOT_HIGH_TIER_IRONS_SCROLL_TABLES = [
    'irons_spellbooks:chests/additional_ancient_city_loot',
    'irons_spellbooks:chests/additional_end_city_loot',
    'irons_spellbooks:chests/additional_good_loot',
    'irons_spellbooks:chests/additional_treasure_loot',
    'irons_spellbooks:chests/catacombs/hidden_trough_treasure',
    'irons_spellbooks:chests/citadel/citadel_vault',
    'irons_spellbooks:chests/citadel/spawner_reward',
    'irons_spellbooks:chests/generic_magic_treasure',
    'irons_spellbooks:chests/trial_chambers/additional_ominous_vault_loot',
    'irons_spellbooks:entities/additional_dragon_loot',
    'irons_spellbooks:entities/citadel_keeper',
    'irons_spellbooks:entities/dead_king',
    'irons_spellbooks:entities/fire_boss',
    'irons_spellbooks:entities/fire_boss_per_player',
    'irons_spellbooks:magic_items/good_ink',
    'irons_spellbooks:magic_items/great_ink',
    'irons_spellbooks:magic_items/reward_ink'
]

function btmLootItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

LootJS.modifiers(function (event) {
    var allLoot = event.addLootTableModifier(/.*/)
    for (var i = 0; i < BTM_LOOT_REMOVE_ITEMS.length; i++) {
        if (btmLootItemExists(BTM_LOOT_REMOVE_ITEMS[i])) allLoot.removeLoot(BTM_LOOT_REMOVE_ITEMS[i])
    }

    for (var j = 0; j < BTM_LOOT_EMERALD_TABLES_TO_COIN.length; j++) {
        event.addLootTableModifier(BTM_LOOT_EMERALD_TABLES_TO_COIN[j])
            .replaceLoot('minecraft:emerald', Item.of('createdeco:copper_coin', 4), true)
    }

    for (var k = 0; k < BTM_LOOT_HIGH_TIER_IRONS_SCROLL_TABLES.length; k++) {
        event.addLootTableModifier(BTM_LOOT_HIGH_TIER_IRONS_SCROLL_TABLES[k])
            .removeLoot('irons_spellbooks:scroll')
    }
})
