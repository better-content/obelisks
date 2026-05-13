// Pack-owned progression items/blocks for expert machine casings and Blood Magic heart keys.

function btmTitleCase(raw) {
    var words = String(raw).split('_')
    for (var i = 0; i < words.length; i++) {
        if (words[i].length > 0) words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1)
    }
    return words.join(' ')
}

StartupEvents.registry('block', function (event) {
    var casings = global.BTM_MACHINE_CASING_TIERS || []
    for (var i = 0; i < casings.length; i++) {
        var path = casings[i].item.substring('kubejs:'.length)
        event.create(path)
            .displayName(casings[i].display)
            .hardness(3.5)
            .resistance(6.0)
            .soundType('metal')
            .requiresTool(true)
    }
})

StartupEvents.registry('item', function (event) {
    var hearts = [
        ['weak_blood_heart', 'Blood-Touched Heart'],
        ['apprentice_blood_heart', 'Levelled Blood Heart'],
        ['magician_blood_heart', 'Hemostatic Blood Heart'],
        ['master_blood_heart', 'Withered Blood Heart'],
        ['archmage_blood_heart', 'Draconic Blood Heart']
    ]

    for (var i = 0; i < hearts.length; i++) {
        event.create(hearts[i][0])
            .displayName(hearts[i][1])
            .maxStackSize(1)
            .glow(true)
    }

    event.create('sky_steel_ingot').displayName('Sky Steel Ingot')
    event.create('sky_steel_sheet').displayName('Sky Steel Sheet')

    var overhaulIntermediates = [
        ['rotational_compressor_core', 'Rotational Compressor Core'],
        ['pressure_seal', 'Pressure Seal'],
        ['purified_blood_catalyst', 'Purified Blood Catalyst'],
        ['purified_source_core', 'Purified Source Core'],
        ['impossible_circuit', 'Impossible Circuit'],
        ['living_binding', 'Living Binding'],
        ['mountain_beryl_lens', 'Mountain Beryl Lens'],
        ['corundum_lapping_grit', 'Corundum Lapping Grit'],
        ['kimberlite_diamond_seed', 'Kimberlite Diamond Seed'],
        ['tungsten_carbide_insert', 'Tungsten Carbide Insert'],
        ['titanium_thermal_plate', 'Titanium Thermal Plate'],
        ['fissile_salt_blend', 'Fissile Salt Blend'],
        ['soulstone_carbon_matrix', 'Soulstone Carbon Matrix'],
        ['redbed_signal_salt', 'Redbed Signal Salt'],
        ['lazurite_logic_pigment', 'Lazurite Logic Pigment'],
        ['phosphate_flux', 'Phosphate Flux'],
        ['platinum_group_residue', 'Platinum Group Residue'],
        ['andesite_grinding_ball', 'Andesite Grinding Ball'],
        ['iron_grinding_ball', 'Iron Grinding Ball'],
        ['brass_grinding_ball', 'Brass Grinding Ball'],
        ['steel_grinding_ball', 'Steel Grinding Ball'],
        ['nickel_grinding_ball', 'Nickel Grinding Ball'],
        ['titanium_grinding_ball', 'Titanium Grinding Ball'],
        ['blood_infused_grinding_ball', 'Blood-Infused Grinding Ball'],
        ['fluix_grinding_ball', 'Fluix Grinding Ball']
    ]

    for (var o = 0; o < overhaulIntermediates.length; o++) {
        event.create(overhaulIntermediates[o][0]).displayName(overhaulIntermediates[o][1])
    }

    var reagents = [
        ['cut_green_tea_leaves', 'Cut Green Tea Leaves'],
        ['roasted_coffee_reagent', 'Roasted Coffee Reagent'],
        ['mashed_salmonberries', 'Mashed Salmonberries'],
        ['charred_blazing_chili', 'Charred Blazing Chili'],
        ['green_tea_extract', 'Green Tea Extract'],
        ['caffeine_extract', 'Caffeine Extract'],
        ['vision_extract', 'Vision Extract'],
        ['brine_extract', 'Brine Extract'],
        ['rose_hip_extract', 'Rose Hip Extract'],
        ['heatproof_extract', 'Heatproof Extract'],
        ['fortifying_extract', 'Fortifying Extract'],
        ['fermented_pomegranate_extract', 'Fermented Pomegranate Extract'],
        ['toxic_extract', 'Toxic Extract'],
        ['leaping_extract', 'Leaping Extract'],
        ['featherlight_extract', 'Featherlight Extract'],
        ['melon_life_extract', 'Melon Life Extract'],
        ['turtle_guard_extract', 'Turtle Guard Extract'],
        ['weakening_extract', 'Weakening Extract'],
        ['shadow_extract', 'Shadow Extract'],
        ['harm_extract', 'Harm Extract'],
        ['slowness_extract', 'Slowness Extract'],
        ['stabilized_reagent', 'Stabilized Reagent']
    ]

    for (var r = 0; r < reagents.length; r++) {
        event.create(reagents[r][0]).displayName(reagents[r][1])
    }
})
