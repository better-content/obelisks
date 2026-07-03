// Second-layer Blood Magic gates for operational magic power spikes.
// The first magic gate file handles entry workstations. This file catches strong rituals,
// spell focuses, generators, and programmable/networked magic that can otherwise be made
// from plain vanilla valuables after the entry item is obtained.

var BTM_MAGIC_T1 = 'bloodmagic:blankslate'
var BTM_MAGIC_T2 = 'bloodmagic:reinforcedslate'
var BTM_MAGIC_T3 = 'bloodmagic:infusedslate'
var BTM_MAGIC_T4 = 'bloodmagic:demonslate'
var BTM_MAGIC_T5 = 'bloodmagic:etherealslate'

function btmMagicReplace(event, filter, oldInputs, gate) {
    for (var i = 0; i < oldInputs.length; i++) event.replaceInput(filter, oldInputs[i], gate)
}

function btmMagicGateOutputs(event, outputs, oldInputs, gate) {
    for (var i = 0; i < outputs.length; i++) btmMagicReplace(event, { output: outputs[i] }, oldInputs, gate)
}

function btmMagicRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) event.remove({ output: outputs[i] })
}

ServerEvents.recipes(function (event) {
    var commonVanillaValuables = [
        'minecraft:redstone', '#forge:dusts/redstone',
        'minecraft:lapis_lazuli', '#forge:gems/lapis', '#forge:storage_blocks/lapis',
        'minecraft:gold_ingot', '#forge:ingots/gold', '#forge:storage_blocks/gold',
        'minecraft:diamond', '#forge:gems/diamond', '#forge:storage_blocks/diamond',
        'minecraft:emerald', '#forge:gems/emerald', '#forge:storage_blocks/emerald',
        'minecraft:amethyst_shard', '#forge:gems/amethyst', '#forge:storage_blocks/amethyst',
        'minecraft:glowstone', 'minecraft:glowstone_dust', '#forge:dusts/glowstone'
    ]

    // Blood I: first folk/spirit power should consume actual altar output, not only vanilla craft stock.
    btmMagicGateOutputs(event, [
        'malum:spirit_altar',
        'rootsclassic:altar',
        'reliquary:apothecary_cauldron'
    ], commonVanillaValuables.concat(['minecraft:torch', 'reliquary:catalyzing_gland']), BTM_MAGIC_T1)

    // Blood III: early Ars operations start once the teaser book can be fed by real proof.
    btmMagicGateOutputs(event, [
        'ars_nouveau:ritual_brazier',
        'ars_nouveau:ritual_scrying',
        'ars_nouveau:ritual_overgrowth',
        'ars_nouveau:ritual_disintegration',
        'ars_nouveau:ritual_harvest',
        'ars_nouveau:ritual_restoration',
        'ars_nouveau:ritual_forestation',
        'ars_nouveau:ritual_sunrise',
        'ars_nouveau:ritual_burrowing',
        'ars_nouveau:ritual_challenge',
        'ars_nouveau:ritual_binding',
        'ars_nouveau:ritual_flowering',
        'ars_nouveau:ritual_fertility',
        'ars_nouveau:ritual_animal_summon',
        'ars_nouveau:ritual_gravity',
        'ars_nouveau:ritual_wilden_summon',
        'ars_nouveau:ritual_conjure_island_plains',
        'ars_nouveau:ritual_conjure_island_desert',
        'ars_elemental:ritual_detection',
        'ars_elemental:ritual_tesla_coil',
        'ars_instrumentum:runic_storage_stone',
        'ars_additions:ritual_locate_structure'
    ], commonVanillaValuables.concat([
        '#forge:storage_blocks/source', '#forge:gems/source', 'ars_nouveau:source_gem',
        'ars_nouveau:earth_essence', 'ars_nouveau:air_essence', 'minecraft:ender_pearl'
    ]), BTM_MAGIC_T3)

    btmMagicGateOutputs(event, [
        'irons_spellbooks:pumpkin_helmet'
    ], commonVanillaValuables, BTM_MAGIC_T2)

    // Blood II: Hexerei is the first folk surface off the Fonts spine.
    btmMagicGateOutputs(event, [
        'hexerei:book_of_shadows_altar',
        'hexerei:mixing_cauldron'
    ], commonVanillaValuables.concat(['minecraft:torch']), BTM_MAGIC_T2)

    // Blood IV: Goety/Eidolon operational power. Keep Goety's internal focus chain,
    // but make the cheap focus entry and altar variants require a Demonic Slate.
    btmMagicGateOutputs(event, [
        'eidolon:wooden_altar',
        'eidolon:necrotic_focus',
        'goety:dark_altar',
        'goety:dark_altar_stone',
        'goety:dark_altar_deepslate',
        'goety:dark_altar_blackstone',
        'goety:dark_altar_end_stone',
        'goety:dark_altar_ominous_stone',
        'goety:dark_altar_highrock',
        'goety:dark_altar_prismarine',
        'goety:empty_focus',
        'goety:focus_bag',
        'goety:focus_pack',
        'goety:sensing_focus',
        'goety:crafting_focus',
        'goety:biting_focus',
        'goety:teeth_focus',
        'goety:shredding_focus',
        'goety:wind_blast_focus',
        'goety:swarm_focus',
        'goety:ignite_focus',
        'goety:fireball_focus',
        'goety:fire_breath_focus',
        'goety:frost_breath_focus',
        'goety:chilling_focus',
        'goety:poison_dart_focus',
        'goety:earth_punch_focus',
        'goety:water_whip_focus',
        'goety:water_jet_focus',
        'goety:thunderbolt_focus',
        'goety:updraft_focus',
        'goety:pulverize_focus',
        'goety:cushion_focus',
        'goety:command_focus',
        'goety:steaming_focus',
        'goety:glow_light_focus',
        'goety:mauling_focus',
        'goety:hunting_focus',
        'goety:prisma_beam_focus',
        'goety:burrowing_focus',
        'goety:electrocute_focus',
        'goety:soul_heal_focus',
        'goety:bulwark_focus',
        'goety:grapple_focus',
        'goety:tunnel_focus',
        'goety:ender_chest_focus',
        'goety:barricade_focus',
        'goety:arrow_rain_focus'
    ], commonVanillaValuables.concat([
        'minecraft:book', 'minecraft:dispenser', 'minecraft:piston', 'minecraft:shield',
        'minecraft:tnt', '#forge:gunpowder', '#forge:rods/blaze', '#forge:ender_pearls',
        '#forge:gems/quartz', '#forge:ingots/iron', 'goety:magic_emerald', 'goety:cursed_bars',
        'goety:mystic_core', 'goety:empty_focus'
    ]), BTM_MAGIC_T4)

    // Blood IV: Theurgy matter work and large Ars Caelum rituals.

    btmMagicGateOutputs(event, [
        'theurgy:incubator',
        'theurgy:incubator_sulfur_vessel',
        'theurgy:incubator_mercury_vessel',
        'theurgy:liquefaction_cauldron'
    ], commonVanillaValuables.concat(['#forge:ingots/copper', 'minecraft:cauldron']), BTM_MAGIC_T4)

    btmMagicGateOutputs(event, [
        'ars_caelum:ritual_conjure_island_geode',
        'ars_caelum:ritual_conjure_island_vexing',
        'ars_caelum:ritual_conjure_island_village',
        'ars_caelum:ritual_conjure_island_flourishing',
        'ars_caelum:ritual_conjure_island_end_portal',
        'ars_caelum:ritual_conjure_island_blazing',
        'ars_caelum:ritual_sedimentation',
        'ars_creo:starbuncle_wheel',
        'ars_technica:source_engine'
    ], commonVanillaValuables.concat(['create:water_wheel', 'ars_nouveau:frostaya_pod']), BTM_MAGIC_T4)

    // Blood V: programmable/networked magic and late Ars/AE source bridges.
    btmMagicGateOutputs(event, [
        'psi:programmer',
        'psi:cad_assembler',
        'psi:spell_drive',
        'psi:cad_battery_basic',
        'psi:cad_battery_extended',
        'hexalia:hex_focus',
        'hexcasting:focus',
        'mna:occulus',
        'mna:manaweaving_altar',
        'mna:ritual_focus_minor',
        'mna:lesser_eldrin_conduit_air',
        'mna:lesser_eldrin_conduit_water',
        'mna:lesser_eldrin_conduit_earth',
        'mna:lesser_eldrin_conduit_ender',
        'mna:constructs/construct_storage_torso_wickerwood',
        'arseng:me_source_jar',
        'arseng:source_acceptor',
        'arseng:source_cell_housing',
        'arseng:portable_source_cell_64k',
        'arseng:portable_source_cell_256k',
        'ars_nouveau:archmage_spell_book_upgrade'
    ], commonVanillaValuables.concat([
        '#forge:ingots/iron', 'minecraft:book', 'minecraft:paper', 'mna:vinteum_dust',
        'minecraft:water_bucket', 'ars_nouveau:manipulation_essence', 'ars_nouveau:source_gem_block',
        'ae2:cell_component_64k', 'ae2:cell_component_256k'
    ]), BTM_MAGIC_T5)

    // Hard removals for normal-logistics bypasses from magic-adjacent systems.
    btmMagicRemoveOutputs(event, [
        'bloodmagic:teleposer',
        'vampirism:crossbow_arrow_teleport'
    ])
})
