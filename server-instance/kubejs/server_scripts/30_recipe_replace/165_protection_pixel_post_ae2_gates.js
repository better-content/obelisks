// Protection Pixel is the post-AE2 body armor branch. Upstream recipes are mostly
// brass/iron/Create-era; this pass makes the branch consume AE2 local intelligence,
// quantum manufacturing, fission heat, and extreme-depth chemistry.

function btmPpExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmPpRemove(event, outputs) {
    return
}

function btmPpMechanical(event, output, pattern, key, id) {
    if (!btmPpExists(output)) return
}

function btmPpSequence(event, input, transitional, output, sequence, loops, id) {
    if (!btmPpExists(output) || !btmPpExists(transitional)) return
    event.remove({ output: output })
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: input },
        transitionalItem: { item: transitional },
        sequence: sequence,
        results: [{ item: output }],
        loops: loops
    }).id(id)
}

function btmPpDeploy(transitional, item) {
    return {
        type: 'create:deploying',
        ingredients: [{ item: transitional }, { item: item }],
        results: [{ item: transitional }]
    }
}

function btmPpPress(transitional) {
    return {
        type: 'create:pressing',
        ingredients: [{ item: transitional }],
        results: [{ item: transitional }]
    }
}

function btmPpFillLava(transitional, amount) {
    return {
        type: 'create:filling',
        ingredients: [{ item: transitional }, { fluid: 'minecraft:lava', amount: amount }],
        results: [{ item: transitional }]
    }
}

ServerEvents.recipes(function (event) {
    if (!btmPpExists('protection_pixel:armorloadplatform')) return
    if (!btmPpExists('kubejs:sky_steel_sheet') || !btmPpExists('kubejs:ae_logic_package')) return

    btmPpRemove(event, [
        'protection_pixel:smallnetheritesheet',
        'protection_pixel:ironarmorplate',
        'protection_pixel:brassarmorplate',
        'protection_pixel:alloyarmorplate',
        'protection_pixel:reinforcedfiber',
        'protection_pixel:heatresistantceramicsheet',
        'protection_pixel:chestplatelining',
        'protection_pixel:leggingslining',
        'protection_pixel:socks_boots',
        'protection_pixel:equipmentkit',
        'protection_pixel:armorplatekit',
        'protection_pixel:powerengine',
        'protection_pixel:heatoverlockingmechanism',
        'protection_pixel:armorloadplatform',
        'protection_pixel:steamectoskeleton',
        'protection_pixel:linkplate_helmet',
        'protection_pixel:linkplate_chestplate',
        'protection_pixel:linkplate_leggings',
        'protection_pixel:linkplate_boots',
        'protection_pixel:maneuveringwing',
        'protection_pixel:suspjetpack',
        'protection_pixel:wingsofprismas_chestplate'
    ])

    event.custom({
        type: 'create:mixing',
        heatRequirement: 'superheated',
        ingredients: [
            { item: 'minecraft:netherite_ingot' },
            { item: 'kubejs:sky_steel_sheet' },
            { item: 'kubejs:sky_steel_sheet' },
            { item: 'chemlib:osmium_plate' },
            { item: 'chemlib:iridium_plate' }
        ],
        results: [{ item: 'protection_pixel:smallnetheritesheet', count: 2 }]
    }).id('kubejs:protection_pixel/small_netherite_sheet')

    event.custom({
        type: 'create:mixing',
        heatRequirement: 'heated',
        ingredients: [
            { item: 'minecraft:netherite_scrap' },
            { item: 'createadditionallogistics:flexible_shaft' },
            { item: 'chemlib:palladium_plate' },
            { item: 'chemlib:ruthenium_plate' },
            { item: 'bloodmagic:etherealslate' }
        ],
        results: [{ item: 'protection_pixel:reinforcedfiber', count: 2 }]
    }).id('kubejs:protection_pixel/reinforced_fiber')

    event.custom({
        type: 'create:mixing',
        heatRequirement: 'superheated',
        ingredients: [
            { item: 'minecraft:white_terracotta' },
            { item: 'minecraft:netherite_scrap' },
            { item: 'heatsync:heat_pipe' },
            { item: 'chemlib:thorium_plate' },
            { item: 'chemlib:uranium_plate' }
        ],
        results: [{ item: 'protection_pixel:heatresistantceramicsheet', count: 2 }]
    }).id('kubejs:protection_pixel/heat_resistant_ceramic_sheet')

    btmPpSequence(event, 'protection_pixel:smallnetheritesheet', 'protection_pixel:incompletealloyarmorplate', 'protection_pixel:alloyarmorplate', [
        btmPpPress('protection_pixel:incompletealloyarmorplate'),
        btmPpDeploy('protection_pixel:incompletealloyarmorplate', 'kubejs:sky_steel_sheet'),
        btmPpDeploy('protection_pixel:incompletealloyarmorplate', 'kubejs:sky_steel_sheet'),
        btmPpDeploy('protection_pixel:incompletealloyarmorplate', 'bloodmagic:etherealslate'),
        btmPpDeploy('protection_pixel:incompletealloyarmorplate', 'chemlib:iridium_plate')
    ], 2, 'kubejs:protection_pixel/alloy_armor_plate')

    btmPpMechanical(event, 'protection_pixel:armorloadplatform', [
        'SQSQS',
        'QLALQ',
        'SFCFS',
        'QLALQ',
        'SQSQS'
    ], {
        S: { item: 'kubejs:sky_steel_sheet' },
        Q: { item: 'kubejs:sky_steel_sheet' },
        L: { item: 'heatsync:heat_pipe' },
        A: { item: 'protection_pixel:alloyarmorplate' },
        F: { item: 'latent_chemlib:gas_reaction_chamber' },
        C: { item: 'kubejs:impossible_machine_casing' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/armor_load_platform')

    btmPpMechanical(event, 'protection_pixel:powerengine', [
        'HFHFH',
        'FQCQF',
        'HFAFH',
        'FQCQF',
        'HFHFH'
    ], {
        H: { item: 'heatsync:heat_pipe' },
        F: { item: 'latent_chemlib:gas_reaction_chamber' },
        Q: { item: 'kubejs:ae_logic_package' },
        C: { item: 'kubejs:impossible_machine_casing' },
        A: { item: 'protection_pixel:alloyarmorplate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/power_engine')

    btmPpMechanical(event, 'protection_pixel:heatoverlockingmechanism', [
        'RHR',
        'QEQ',
        'RHR'
    ], {
        R: { item: 'chemlib:ruthenium_plate' },
        H: { item: 'heatsync:coolant_exchanger' },
        Q: { item: 'kubejs:ae_logic_package' },
        E: { item: 'protection_pixel:powerengine' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/heat_overlock_mechanism')

    btmPpMechanical(event, 'protection_pixel:equipmentkit', [
        'FHFHF',
        'HAPAH',
        'FPEPF',
        'HAPAH',
        'FHFHF'
    ], {
        F: { item: 'protection_pixel:reinforcedfiber' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:sky_steel_sheet' },
        E: { item: 'protection_pixel:powerengine' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/equipment_kit')

    btmPpMechanical(event, 'protection_pixel:armorplatekit', [
        'AFAFA',
        'FHPHF',
        'AKEKA',
        'FHPHF',
        'AFAFA'
    ], {
        A: { item: 'protection_pixel:alloyarmorplate' },
        F: { item: 'protection_pixel:reinforcedfiber' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        P: { item: 'kubejs:ae_logic_package' },
        K: { item: 'protection_pixel:equipmentkit' },
        E: { item: 'bloodmagic:etherealslate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/armor_plate_kit')

    btmPpMechanical(event, 'protection_pixel:chestplatelining', [
        'FHF',
        'APA',
        'FHF'
    ], {
        F: { item: 'protection_pixel:reinforcedfiber' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/chestplate_lining')

    btmPpMechanical(event, 'protection_pixel:leggingslining', [
        'FHF',
        'APA',
        'F F'
    ], {
        F: { item: 'protection_pixel:reinforcedfiber' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/leggings_lining')

    btmPpMechanical(event, 'protection_pixel:socks_boots', [
        'F F',
        'H H',
        'A A'
    ], {
        F: { item: 'protection_pixel:reinforcedfiber' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        A: { item: 'protection_pixel:alloyarmorplate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/socks_boots')

    btmPpMechanical(event, 'protection_pixel:linkplate_helmet', [
        'APA',
        'HNH',
        'F F'
    ], {
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' },
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        N: { item: 'minecraft:netherite_helmet' },
        F: { item: 'protection_pixel:reinforcedfiber' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/linkplate_helmet')

    btmPpMechanical(event, 'protection_pixel:linkplate_chestplate', [
        'A A',
        'HNH',
        'APA'
    ], {
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' },
        H: { item: 'protection_pixel:chestplatelining' },
        N: { item: 'minecraft:netherite_chestplate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/linkplate_chestplate')

    btmPpMechanical(event, 'protection_pixel:linkplate_leggings', [
        'ANA',
        'H H',
        'P P'
    ], {
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' },
        H: { item: 'protection_pixel:leggingslining' },
        N: { item: 'minecraft:netherite_leggings' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/linkplate_leggings')

    btmPpMechanical(event, 'protection_pixel:linkplate_boots', [
        'P P',
        'H H',
        'ANA'
    ], {
        A: { item: 'protection_pixel:alloyarmorplate' },
        P: { item: 'kubejs:ae_logic_package' },
        H: { item: 'protection_pixel:socks_boots' },
        N: { item: 'minecraft:netherite_boots' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/linkplate_boots')

    btmPpMechanical(event, 'protection_pixel:steamectoskeleton', [
        'SPEPS',
        'PFCFP',
        'EFAFE',
        'PFCFP',
        'SPEPS'
    ], {
        S: { item: 'protection_pixel:smallnetheritesheet' },
        P: { item: 'kubejs:sky_steel_sheet' },
        E: { item: 'protection_pixel:powerengine' },
        F: { item: 'protection_pixel:reinforcedfiber' },
        C: { item: 'kubejs:impossible_machine_casing' },
        A: { item: 'protection_pixel:armorloadplatform' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/steam_exoskeleton')

    btmPpMechanical(event, 'protection_pixel:suspjetpack', [
        'TPT',
        'FEF',
        'TPT'
    ], {
        T: { item: 'create:copper_backtank' },
        P: { item: 'kubejs:ae_logic_package' },
        F: { item: 'protection_pixel:reinforcedfiber' },
        E: { item: 'protection_pixel:powerengine' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/susp_jetpack')

    btmPpMechanical(event, 'protection_pixel:maneuveringwing', [
        'PFEFP',
        'FWBWF',
        'PFEFP'
    ], {
        P: { item: 'kubejs:sky_steel_sheet' },
        F: { item: 'protection_pixel:reinforcedfiber' },
        E: { item: 'protection_pixel:powerengine' },
        W: { item: 'minecraft:elytra' },
        B: { item: 'kubejs:impossible_machine_casing' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/maneuvering_wing')

    btmPpMechanical(event, 'protection_pixel:tosaki_helmet', [
        'HOH',
        'QLQ',
        'STS'
    ], {
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        O: { item: 'realisticores:crushed_osmiridium_lava_sulfide_ore' },
        Q: { item: 'kubejs:ae_logic_package' },
        L: { item: 'protection_pixel:linkplate_helmet' },
        S: { item: 'protection_pixel:smallnetheritesheet' },
        T: { item: 'chemlib:thorium_plate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/tosaki_helmet_lava_diving')

    btmPpMechanical(event, 'protection_pixel:tosaki_chestplate', [
        'HOH',
        'QLQ',
        'AEA',
        'SOS'
    ], {
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        O: { item: 'realisticores:crushed_osmiridium_lava_sulfide_ore' },
        Q: { item: 'kubejs:ae_logic_package' },
        L: { item: 'protection_pixel:linkplate_chestplate' },
        A: { item: 'protection_pixel:heatoverlockingmechanism' },
        E: { item: 'protection_pixel:equipmentkit' },
        S: { item: 'protection_pixel:smallnetheritesheet' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/tosaki_chestplate_lava_diving')

    btmPpMechanical(event, 'protection_pixel:tosaki_leggings', [
        'HQH',
        'OLO',
        'SIS',
        ' H '
    ], {
        H: { item: 'protection_pixel:heatresistantceramicsheet' },
        Q: { item: 'kubejs:ae_logic_package' },
        O: { item: 'realisticores:crushed_osmiridium_lava_sulfide_ore' },
        L: { item: 'protection_pixel:linkplate_leggings' },
        S: { item: 'protection_pixel:smallnetheritesheet' },
        I: { item: 'chemlib:iridium_plate' }
    }, 'kubejs:create/mechanical_crafting/protection_pixel/tosaki_leggings_lava_diving')

    btmPpSequence(event, 'protection_pixel:wingsofprism_chestplate', 'protection_pixel:incompletewingsofprism', 'protection_pixel:wingsofprismas_chestplate', [
        btmPpFillLava('protection_pixel:incompletewingsofprism', 500),
        btmPpPress('protection_pixel:incompletewingsofprism'),
        btmPpDeploy('protection_pixel:incompletewingsofprism', 'protection_pixel:heatoverlockingmechanism'),
        btmPpDeploy('protection_pixel:incompletewingsofprism', 'kubejs:ae_logic_package'),
        btmPpDeploy('protection_pixel:incompletewingsofprism', 'bloodmagic:etherealslate'),
        btmPpDeploy('protection_pixel:incompletewingsofprism', 'chemlib:iridium_plate')
    ], 2, 'kubejs:protection_pixel/wingsofprism_as')

    // Broad safety net: all named armor/equipment should consume post-AE2 components if an
    // upstream recipe survives because of alternate IDs or future mod updates.
    var lateOutputs = [
        'protection_pixel:tosaki_helmet', 'protection_pixel:tosaki_chestplate', 'protection_pixel:tosaki_leggings',
        'protection_pixel:workerhornet_chestplate', 'protection_pixel:wingsofprism_chestplate', 'protection_pixel:hellsnake_chestplate',
        'protection_pixel:breaker_chestplate', 'protection_pixel:typhoon_chestplate', 'protection_pixel:falconnest_chestplate',
        'protection_pixel:magneticstorm_chestplate', 'protection_pixel:closed_helmet', 'protection_pixel:plague_helmet',
        'protection_pixel:nightdemon_helmet', 'protection_pixel:bloodprisoner_helmet', 'protection_pixel:anchorpoint_leggings',
        'protection_pixel:buoyancy_leggings', 'protection_pixel:slingshot_leggings', 'protection_pixel:cannonarm',
        'protection_pixel:pneumaticgrenadelauncharm', 'protection_pixel:hookcannon', 'protection_pixel:heatpulsethruster',
        'protection_pixel:tacticaloxygensupplydevice', 'protection_pixel:blooddialysisdevice', 'protection_pixel:evasionwing'
    ]
    for (var i = 0; i < lateOutputs.length; i++) {
        if (!btmPpExists(lateOutputs[i])) continue
        event.replaceInput({ output: lateOutputs[i] }, 'minecraft:iron_ingot', 'protection_pixel:alloyarmorplate')
        event.replaceInput({ output: lateOutputs[i] }, '#forge:ingots/iron', 'protection_pixel:alloyarmorplate')
        event.replaceInput({ output: lateOutputs[i] }, 'create:andesite_alloy', 'kubejs:impossible_machine_casing')
        event.replaceInput({ output: lateOutputs[i] }, 'create:precision_mechanism', 'kubejs:ae_logic_package')
        event.replaceInput({ output: lateOutputs[i] }, 'create:brass_sheet', 'protection_pixel:smallnetheritesheet')
        event.replaceInput({ output: lateOutputs[i] }, '#forge:ingots/brass', 'protection_pixel:smallnetheritesheet')
    }
})
