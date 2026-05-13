// Material economy pass for vanilla valuable ingredients.
// Plain iron/copper/gold/redstone/lapis/diamond/emerald/amethyst remain fine for low-power
// building and basic crafting. High-impact automation, storage, magic, logistics, and AE2
// recipes should spend manufactured parts, alloys, casings, slates, or extreme-band materials.

var BTM_MAT = {
    seared: 'kubejs:seared_machine_casing',
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    oc2r: 'kubejs:circuited_machine_casing',
    space: 'kubejs:space_machine_casing',
    ae2: 'kubejs:impossible_machine_casing',
    ironSheet: 'create:iron_sheet',
    copperSheet: 'create:copper_sheet',
    goldSheet: 'create:golden_sheet',
    brassSheet: 'create:brass_sheet',
    andesiteAlloy: 'create:andesite_alloy',
    precision: 'create:precision_mechanism',
    powerCircuit: 'powergrid:integrated_circuit',
    redstoneRelay: 'powergrid:redstone_relay',
    transistor: 'oc2r:transistor',
    network: 'oc2r:network_connector',
    skySteelSheet: 'kubejs:sky_steel_sheet',
    skySteel: 'kubejs:sky_steel_ingot',
    inconelSheet: 'creatingspace:inconel_sheet',
    copronickelSheet: 'creatingspace:copronickel_sheet',
    hastelloySheet: 'creatingspace:hastelloy_sheet',
    reinforcedCopper: 'creatingspace:reinforced_copper_sheet',
    blankSlate: 'bloodmagic:blankslate',
    reinforcedSlate: 'bloodmagic:reinforcedslate',
    imbuedSlate: 'bloodmagic:infusedslate',
    demonicSlate: 'bloodmagic:demonslate',
    etherealSlate: 'bloodmagic:etherealslate',
    sourceGem: 'ars_nouveau:source_gem',
    manipulationEssence: 'ars_nouveau:manipulation_essence',
    spiritGem: 'occultism:spirit_attuned_gem',
    deorum: 'forbidden_arcanus:deorum_ingot',
    platinum: 'chemlib:platinum_plate',
    rhodium: 'chemlib:rhodium_plate',
    palladium: 'chemlib:palladium_plate',
    ruthenium: 'chemlib:ruthenium_plate',
    osmium: 'chemlib:osmium_plate',
    iridium: 'chemlib:iridium_plate'
}

function btmMatReplace(event, filter, oldInputs, newInput) {
    for (var i = 0; i < oldInputs.length; i++) event.replaceInput(filter, oldInputs[i], newInput)
}

function btmMatReplaceOutputs(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) btmMatReplace(event, { output: outputs[i] }, oldInputs, newInput)
}

function btmMatRemoveIds(event, ids) {
    for (var i = 0; i < ids.length; i++) event.remove({ id: ids[i] })
}

ServerEvents.recipes(function (event) {
    // Vanilla automation: pistons/hoppers/rails are useful enough to spend processed parts,
    // but not so strong that they should require full machine casings.
    btmMatRemoveIds(event, [
        'aether:skyroot_piston'
    ])

    btmMatReplaceOutputs(event, ['minecraft:hopper'], ['#forge:ingots/iron'], BTM_MAT.ironSheet)
    btmMatReplaceOutputs(event, ['minecraft:piston'], ['#forge:ingots/iron'], BTM_MAT.andesiteAlloy)
    btmMatReplaceOutputs(event, ['minecraft:dropper', 'minecraft:dispenser'], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.redstoneRelay)
    btmMatReplaceOutputs(event, ['minecraft:observer'], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.redstoneRelay)
    btmMatReplaceOutputs(event, ['minecraft:detector_rail', 'minecraft:activator_rail'], ['#forge:ingots/iron'], BTM_MAT.ironSheet)
    btmMatReplaceOutputs(event, ['minecraft:detector_rail'], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.redstoneRelay)
    btmMatReplaceOutputs(event, ['minecraft:powered_rail'], ['#forge:ingots/gold'], BTM_MAT.goldSheet)
    btmMatReplaceOutputs(event, ['minecraft:clock'], ['#forge:ingots/gold'], BTM_MAT.goldSheet)
    btmMatReplaceOutputs(event, ['minecraft:compass'], ['#forge:ingots/iron'], BTM_MAT.ironSheet)

    // Vanilla magic/economy objects: diamonds alone should not unlock enchanting authority.
    btmMatReplaceOutputs(event, ['minecraft:enchanting_table'], ['#forge:gems/diamond'], BTM_MAT.blankSlate)
    btmMatReplaceOutputs(event, ['minecraft:jukebox'], ['#forge:gems/diamond'], 'minecraft:amethyst_shard')

    // AE2 entry hardware: use space-era manufactured sheets, but do not require AE2 casing
    // before processors can be made.
    btmMatReplaceOutputs(event, [
        'ae2:charger',
        'ae2:inscriber',
        'ae2:energy_acceptor',
        'ae2:vibration_chamber',
        'ae2:chest',
        'ae2:crystal_resonance_generator'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.inconelSheet)

    btmMatReplaceOutputs(event, [
        'ae2:charger',
        'ae2:inscriber',
        'ae2:energy_acceptor',
        'ae2:vibration_chamber',
        'ae2:chest',
        'ae2:crystal_resonance_generator'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BTM_MAT.copronickelSheet)

    // AE2 local-site storage and networking: processed electronics and sky steel replace raw vanilla metals.
    btmMatReplaceOutputs(event, [
        'ae2:item_cell_housing',
        'ae2:fluid_cell_housing',
        'ae2:item_storage_cell_1k',
        'ae2:item_storage_cell_4k',
        'ae2:item_storage_cell_16k',
        'ae2:item_storage_cell_64k',
        'ae2:item_storage_cell_256k',
        'ae2:fluid_storage_cell_1k',
        'ae2:fluid_storage_cell_4k',
        'ae2:fluid_storage_cell_16k',
        'ae2:fluid_storage_cell_64k',
        'ae2:fluid_storage_cell_256k',
        'ae2:view_cell'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.powerCircuit)

    btmMatReplaceOutputs(event, [
        'ae2:item_cell_housing',
        'ae2:item_storage_cell_1k',
        'ae2:item_storage_cell_4k',
        'ae2:item_storage_cell_16k',
        'ae2:item_storage_cell_64k',
        'ae2:item_storage_cell_256k',
        'ae2:view_cell',
        'ae2:drive',
        'ae2:io_port',
        'ae2:interface',
        'ae2:pattern_provider',
        'ae2:molecular_assembler',
        'ae2:crafting_unit'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.skySteelSheet)

    btmMatReplaceOutputs(event, [
        'ae2:fluid_cell_housing',
        'ae2:fluid_storage_cell_1k',
        'ae2:fluid_storage_cell_4k',
        'ae2:fluid_storage_cell_16k',
        'ae2:fluid_storage_cell_64k',
        'ae2:fluid_storage_cell_256k'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BTM_MAT.reinforcedCopper)

    btmMatReplaceOutputs(event, [
        'ae2:cell_component_1k',
        'ae2:cell_component_4k',
        'ae2:cell_component_16k',
        'ae2:cell_component_64k',
        'ae2:cell_component_256k'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.powerCircuit)

    btmMatReplaceOutputs(event, ['ae2:wireless_receiver'], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.network)
    btmMatReplaceOutputs(event, ['ae2:wireless_booster'], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.transistor)
    btmMatReplaceOutputs(event, ['ae2:spatial_storage_cell_2', 'ae2:spatial_storage_cell_16', 'ae2:spatial_storage_cell_128'], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.platinum)
    btmMatReplaceOutputs(event, ['ae2:spatial_storage_cell_2', 'ae2:spatial_storage_cell_16', 'ae2:spatial_storage_cell_128'], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.rhodium)

    // AE2 tools are operational authority, not cheap iron gadgets.
    btmMatReplaceOutputs(event, [
        'ae2:matter_cannon',
        'ae2:entropy_manipulator',
        'ae2:charged_staff',
        'ae2:color_applicator',
        'ae2:memory_card'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BTM_MAT.skySteelSheet)
    btmMatReplaceOutputs(event, ['ae2:memory_card'], ['minecraft:gold_ingot', '#forge:ingots/gold'], BTM_MAT.goldSheet)
    btmMatReplaceOutputs(event, ['ae2:memory_card'], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.powerCircuit)

    // AE2 addon storage: scale beyond normal AE2 with extreme-band and sky-steel costs.
    btmMatReplaceOutputs(event, [
        'ae2additions:item_storage_cell_1024',
        'ae2additions:item_storage_cell_4096',
        'ae2additions:item_storage_cell_16384',
        'ae2additions:item_storage_cell_65536',
        'ae2additions:super_cell_housing',
        'ae2additions:super_cell_1k',
        'ae2additions:super_cell_4k',
        'ae2additions:super_cell_16k',
        'ae2additions:super_cell_64k',
        'ae2additions:super_cell_256k',
        'ae2additions:super_cell_1024k',
        'ae2additions:super_cell_4096k',
        'ae2additions:super_cell_16m',
        'ae2additions:super_cell_65m'
    ], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.skySteel)

    btmMatReplaceOutputs(event, [
        'ae2additions:super_cell_housing',
        'ae2additions:super_cell_1k',
        'ae2additions:super_cell_4k',
        'ae2additions:super_cell_16k',
        'ae2additions:super_cell_64k',
        'ae2additions:super_cell_256k',
        'ae2additions:super_cell_1024k',
        'ae2additions:super_cell_4096k',
        'ae2additions:super_cell_16m',
        'ae2additions:super_cell_65m'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.ruthenium)

    btmMatReplaceOutputs(event, [
        'ae2additions:fluid_storage_cell_1024',
        'ae2additions:fluid_storage_cell_4096',
        'ae2additions:fluid_storage_cell_16384'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BTM_MAT.reinforcedCopper)

    btmMatReplaceOutputs(event, ['ae2additions:me_wireless_transceiver'], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.network)

    // Blood Magic: normal player logistics must not get teleportation from gold alone.
    event.remove({ output: 'bloodmagic:teleposer' })
    btmMatReplaceOutputs(event, ['bloodmagic:lavacrystal'], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.demonicSlate)
    btmMatReplaceOutputs(event, ['bloodmagic:ritualdiviner'], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.imbuedSlate)
    btmMatReplaceOutputs(event, ['bloodmagic:experiencebook'], ['minecraft:lapis_lazuli', '#forge:gems/lapis'], BTM_MAT.reinforcedSlate)

    // Ars and Ars addons: basic source conversion stays, but strong manipulation/mobility glyphs
    // should spend magic-tier materials rather than plain emeralds/diamonds/redstone.
    btmMatReplaceOutputs(event, [
        'ars_nouveau:glyph_exchange',
        'ars_nouveau:glyph_extract'
    ], ['minecraft:emerald', 'minecraft:emerald_block', '#forge:gems/emerald'], BTM_MAT.spiritGem)

    btmMatReplaceOutputs(event, [
        'ars_nouveau:glyph_glide',
        'ars_nouveau:glyph_linger',
        'ars_nouveau:glyph_wall',
        'ars_technica:glyph_obliterate'
    ], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.demonicSlate)

    btmMatReplaceOutputs(event, [
        'ars_nouveau:glyph_redstone_signal',
        'ars_nouveau:glyph_extend_time'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.redstoneRelay)

    btmMatReplaceOutputs(event, ['ars_nouveau:enchanting_apparatus'], ['#forge:gems/diamond'], BTM_MAT.sourceGem)
    btmMatReplaceOutputs(event, ['ars_technica:transmutation_focus'], ['minecraft:emerald', '#forge:gems/emerald'], BTM_MAT.deorum)
    btmMatReplaceOutputs(event, ['ars_technica:calibrated_precision_mechanism'], ['minecraft:amethyst_shard', '#forge:gems/amethyst'], BTM_MAT.precision)

    // Building/modular utility recipes already have tier gates elsewhere; replace the remaining
    // raw vanilla valuables in their key outputs with manufactured power-era parts.
    btmMatReplaceOutputs(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager'
    ], ['minecraft:redstone', '#forge:dusts/redstone', 'minecraft:lapis_lazuli', '#forge:gems/lapis'], BTM_MAT.powerCircuit)

    btmMatReplaceOutputs(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager'
    ], ['minecraft:diamond', '#forge:gems/diamond'], BTM_MAT.precision)

    // Sophisticated upgrade power should consume casings/parts, not just raw gems and dust.
    btmMatReplaceOutputs(event, [
        'sophisticatedbackpacks:compacting_upgrade',
        'sophisticatedbackpacks:magnet_upgrade',
        'sophisticatedbackpacks:pump_upgrade',
        'sophisticatedbackpacks:xp_pump_upgrade',
        'sophisticatedbackpacks:void_upgrade',
        'sophisticatedstorage:compacting_upgrade',
        'sophisticatedstorage:magnet_upgrade',
        'sophisticatedstorage:pump_upgrade',
        'sophisticatedstorage:xp_pump_upgrade',
        'sophisticatedstorage:void_upgrade'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MAT.powerCircuit)

    btmMatReplaceOutputs(event, [
        'sophisticatedbackpacks:magnet_upgrade',
        'sophisticatedstorage:magnet_upgrade'
    ], ['minecraft:lapis_lazuli', '#forge:gems/lapis'], BTM_MAT.brass)
})
