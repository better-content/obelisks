// High-value Realistic Ores products.
// These routes turn terrain-locked deposits into named intermediates consumed by
// late machines, magic, and nuclear recipes. Generic dusts remain byproducts.

function btmRoMixing(event, id, output, ingredients, heat) {
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: [output],
        processingTime: 220
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:realistic_ores/identity/' + id)
}

function btmRoPressing(event, id, output, input) {
    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: input }],
        results: [{ item: output }]
    }).id('kubejs:realistic_ores/pressing/' + id)
}

ServerEvents.recipes(function (event) {
    event.shaped('kubejs:andesite_grinding_ball', [
        ' A ',
        'AAA',
        ' A '
    ], { A: 'create:andesite_alloy' }).id('kubejs:realistic_ores/grinding_ball/andesite')

    event.shaped('kubejs:iron_grinding_ball', [
        ' I ',
        'III',
        ' I '
    ], { I: '#forge:ingots/iron' }).id('kubejs:realistic_ores/grinding_ball/iron')

    event.shaped('kubejs:brass_grinding_ball', [
        ' B ',
        'BBB',
        ' B '
    ], { B: '#forge:ingots/brass' }).id('kubejs:realistic_ores/grinding_ball/brass')

    event.shaped('kubejs:steel_grinding_ball', [
        ' S ',
        'SIS',
        ' S '
    ], { S: '#forge:ingots/steel', I: 'kubejs:iron_grinding_ball' }).id('kubejs:realistic_ores/grinding_ball/steel')

    event.shaped('kubejs:nickel_grinding_ball', [
        ' N ',
        'NSN',
        ' N '
    ], { N: '#forge:ingots/nickel', S: 'kubejs:steel_grinding_ball' }).id('kubejs:realistic_ores/grinding_ball/nickel')

    event.shaped('kubejs:titanium_grinding_ball', [
        ' T ',
        'TNT',
        ' T '
    ], { T: 'chemlib:titanium_ingot', N: 'kubejs:nickel_grinding_ball' }).id('kubejs:realistic_ores/grinding_ball/titanium')

    event.shaped('kubejs:blood_infused_grinding_ball', [
        'SBS',
        'BIB',
        'SBS'
    ], { S: 'bloodmagic:demonslate', B: 'minecraft:redstone', I: 'kubejs:steel_grinding_ball' }).id('kubejs:realistic_ores/grinding_ball/blood_infused')

    event.shaped('kubejs:fluix_grinding_ball', [
        'FCF',
        'CSC',
        'FCF'
    ], { F: 'ae2:fluix_crystal', C: 'ae2:certus_quartz_crystal', S: 'kubejs:steel_grinding_ball' }).id('kubejs:realistic_ores/grinding_ball/fluix')

    btmRoMixing(event, 'tungsten_carbide_insert', { item: 'kubejs:tungsten_carbide_insert' }, [
        { item: 'realisticores:crushed_tin_tungsten_greisen' },
        { item: 'kubejs:steel_grinding_ball' },
        { item: 'chemlib:carbon' },
        { item: 'chemlib:tungsten' }
    ], 'heated')

    btmRoMixing(event, 'titanium_thermal_plate', { item: 'kubejs:titanium_thermal_plate' }, [
        { item: 'realisticores:crushed_titanium_iron_oxide_ore' },
        { item: 'kubejs:tungsten_carbide_insert' },
        { item: 'chemlib:titanium' },
        { item: 'chemlib:oxygen' }
    ], 'heated')

    btmRoMixing(event, 'kimberlite_diamond_seed', { item: 'kubejs:kimberlite_diamond_seed' }, [
        { item: 'realisticores:crushed_kimberlite_pipe' },
        { item: 'kubejs:tungsten_carbide_insert' },
        { item: 'chemlib:carbon' },
        { item: 'minecraft:diamond' }
    ], 'heated')

    btmRoMixing(event, 'mountain_beryl_lens', { item: 'kubejs:mountain_beryl_lens' }, [
        { item: 'realisticores:crushed_emerald_schist_beryl_vein' },
        { item: 'kubejs:corundum_lapping_grit' },
        { item: 'chemlib:beryllium' },
        { item: 'minecraft:emerald' }
    ], 'heated')

    btmRoMixing(event, 'corundum_lapping_grit', { item: 'kubejs:corundum_lapping_grit', count: 2 }, [
        { item: 'realisticores:crushed_corundum_beryl_gem_vein' },
        { item: 'kubejs:brass_grinding_ball' },
        { item: 'chemlib:aluminum' },
        { item: 'minecraft:amethyst_shard' }
    ], null)

    btmRoMixing(event, 'fissile_salt_blend', { item: 'kubejs:fissile_salt_blend' }, [
        { item: 'realisticores:crushed_uranium_ore' },
        { item: 'realisticores:crushed_thorium_ore' },
        { item: 'chemlib:uranium' },
        { item: 'chemlib:thorium' },
        { item: 'kubejs:titanium_thermal_plate' }
    ], 'heated')

    btmRoMixing(event, 'soulstone_carbon_matrix', { item: 'kubejs:soulstone_carbon_matrix' }, [
        { item: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein' },
        { item: 'kubejs:blood_infused_grinding_ball' },
        { item: 'chemlib:carbon' },
        { item: 'minecraft:soul_sand' }
    ], 'heated')

    btmRoMixing(event, 'redbed_signal_salt', { item: 'kubejs:redbed_signal_salt' }, [
        { item: 'realisticores:crushed_cupriferous_redbed_redstone_vein' },
        { item: 'kubejs:iron_grinding_ball' },
        { item: 'minecraft:redstone' },
        { item: 'create:crushed_raw_copper' }
    ], null)

    btmRoMixing(event, 'lazurite_logic_pigment', { item: 'kubejs:lazurite_logic_pigment' }, [
        { item: 'realisticores:crushed_lazurite_vein' },
        { item: 'kubejs:redbed_signal_salt' },
        { item: 'minecraft:lapis_lazuli' },
        { item: 'chemlib:silicon' }
    ], null)

    btmRoMixing(event, 'phosphate_flux', { item: 'kubejs:phosphate_flux' }, [
        { item: 'realisticores:crushed_phosphate_rock' },
        { item: 'kubejs:andesite_grinding_ball' },
        { item: 'chemlib:phosphorus' },
        { item: 'chemlib:calcium' }
    ], null)

    btmRoMixing(event, 'platinum_group_residue', { item: 'kubejs:platinum_group_residue' }, [
        { item: 'realisticores:crushed_nickel_sulfide_ore' },
        { item: 'kubejs:nickel_grinding_ball' },
        { item: 'chemlib:nickel' },
        { item: 'chemlib:sulfur' }
    ], 'heated')

    btmRoPressing(event, 'titanium_thermal_plate_from_ingot', 'kubejs:titanium_thermal_plate', 'chemlib:titanium_ingot')
})
