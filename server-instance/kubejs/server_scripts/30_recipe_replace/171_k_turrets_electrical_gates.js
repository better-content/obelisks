// K-Turrets is advanced autonomous defense, not a survival dispenser sidegrade.
// Replace the mod-default grid recipes with explicit electrical-era support parts.

function btmTurretExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmTurretRecipe(event, output, pattern, key, id, count) {
    if (!btmTurretExists(output)) return
    for (var symbol in key) {
        var ingredient = key[symbol]
        if (ingredient && ingredient.charAt && ingredient.charAt(0) !== '#' && ingredient.indexOf(':') >= 0 && !btmTurretExists(ingredient)) return
    }
    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, count || 1, pattern, key, true)
}

ServerEvents.recipes(function (event) {
    btmTurretRecipe(event, 'k_turrets:copper_plate', [
        'CWC',
        'TAT',
        'CWC'
    ], {
        C: '#forge:plates/copper',
        W: 'powergrid:wire',
        T: 'k_turrets:titanium_ingot',
        A: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/copper_plate_electrical', 4)

    btmTurretRecipe(event, 'k_turrets:bullet', [
        ' I ',
        'ICI',
        ' G '
    ], {
        I: '#forge:nuggets/iron',
        C: 'k_turrets:copper_plate',
        G: '#forge:nuggets/gold'
    }, 'kubejs:k_turrets/bullet_electrical', 8)

    btmTurretRecipe(event, 'k_turrets:explosive_powder', [
        ' B ',
        'GCG',
        ' B '
    ], {
        B: 'minecraft:blaze_powder',
        G: 'minecraft:gunpowder',
        C: 'k_turrets:copper_plate'
    }, 'kubejs:k_turrets/explosive_powder_electrical', 6)

    btmTurretRecipe(event, 'k_turrets:wrench', [
        ' TI',
        ' CT',
        'I  '
    ], {
        T: 'k_turrets:titanium_ingot',
        I: '#forge:plates/iron',
        C: 'kubejs:electrical_instrumentation_module'
    }, 'kubejs:k_turrets/wrench_electrical')

    btmTurretRecipe(event, 'k_turrets:exp_link', [
        'OLO',
        'LCL',
        'OLO'
    ], {
        O: 'minecraft:obsidian',
        L: '#forge:storage_blocks/lapis',
        C: 'kubejs:electrical_instrumentation_module'
    }, 'kubejs:k_turrets/exp_link_electrical')

    btmTurretRecipe(event, 'k_turrets:fire_shield', [
        'IBI',
        'BCB',
        'IBI'
    ], {
        I: 'minecraft:blue_ice',
        B: 'powergrid:battery',
        C: 'kubejs:electrical_instrumentation_module'
    }, 'kubejs:k_turrets/fire_shield_electrical')

    btmTurretRecipe(event, 'k_turrets:looting_link', [
        'TNT',
        'NCN',
        'TNT'
    ], {
        T: 'k_turrets:titanium_ingot',
        N: 'minecraft:netherite_scrap',
        C: 'kubejs:electrical_instrumentation_module'
    }, 'kubejs:k_turrets/looting_link_electrical')

    btmTurretRecipe(event, 'k_turrets:recall_upgrade', [
        'TET',
        'ECE',
        'TET'
    ], {
        T: 'k_turrets:titanium_ingot',
        E: 'minecraft:ender_pearl',
        C: 'kubejs:electrical_instrumentation_module'
    }, 'kubejs:k_turrets/recall_upgrade_electrical')

    btmTurretRecipe(event, 'k_turrets:magnet_upgrade', [
        'T T',
        'ECE',
        'T T'
    ], {
        T: 'k_turrets:titanium_ingot',
        E: 'minecraft:ender_pearl',
        C: 'kubejs:electrical_control_module'
    }, 'kubejs:k_turrets/magnet_upgrade_electrical')

    btmTurretRecipe(event, 'k_turrets:light_upgrade', [
        'LGL',
        'ECE',
        'LGL'
    ], {
        L: 'minecraft:redstone_lamp',
        G: 'minecraft:glowstone',
        E: 'k_turrets:copper_plate',
        C: 'kubejs:electrical_control_module'
    }, 'kubejs:k_turrets/light_upgrade_electrical')

    btmTurretRecipe(event, 'k_turrets:reloader', [
        'CBC',
        'RAR',
        'CEC'
    ], {
        C: 'k_turrets:copper_plate',
        B: 'powergrid:battery',
        R: 'powergrid:redstone_relay',
        A: 'kubejs:electrical_machine_casing',
        E: 'oc2r:circuit_board'
    }, 'kubejs:k_turrets/reloader_electrical')

    btmTurretRecipe(event, 'k_turrets:cobble_turret_item', [
        'STS',
        'CAC',
        'PMP'
    ], {
        S: 'minecraft:cobblestone',
        T: 'kubejs:electrical_control_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        P: '#forge:plates/iron',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/cobble_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:cobble_drone_item', [
        'SIS',
        'CAC',
        'FMF'
    ], {
        S: 'minecraft:cobblestone',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/cobble_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:brick_turret_item', [
        'STS',
        'CAC',
        'PMP'
    ], {
        S: 'minecraft:brick',
        T: 'kubejs:electrical_control_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        P: '#forge:plates/iron',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/brick_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:brick_drone_item', [
        'SIS',
        'CAC',
        'FMF'
    ], {
        S: 'minecraft:brick',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/brick_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:arrow_turret_item', [
        'ATA',
        'CAC',
        'RMR'
    ], {
        A: 'minecraft:arrow',
        T: 'kubejs:electrical_control_module',
        C: 'k_turrets:copper_plate',
        R: 'powergrid:redstone_relay',
        M: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/arrow_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:arrow_drone_item', [
        'AIA',
        'CAC',
        'FMF'
    ], {
        A: 'minecraft:arrow',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'k_turrets:copper_plate',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/arrow_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:bullet_turret_item', [
        'BTB',
        'CAC',
        'RMR'
    ], {
        B: 'k_turrets:bullet',
        T: 'kubejs:electrical_control_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        R: 'powergrid:redstone_relay',
        M: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/bullet_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:bullet_drone_item', [
        'BIB',
        'CAC',
        'FMF'
    ], {
        B: 'k_turrets:bullet',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/bullet_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:firecharge_turret_item', [
        'ETE',
        'CAC',
        'BMB'
    ], {
        E: 'k_turrets:explosive_powder',
        T: 'kubejs:electrical_control_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        B: 'powergrid:battery',
        M: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/firecharge_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:firecharge_drone_item', [
        'EIE',
        'CAC',
        'FMF'
    ], {
        E: 'k_turrets:explosive_powder',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'k_turrets:copper_plate',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/firecharge_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:gauss_bullet', [
        'ITI',
        'ECE',
        'ITI'
    ], {
        I: '#forge:nuggets/iron',
        T: 'k_turrets:titanium_ingot',
        E: 'minecraft:ender_pearl',
        C: 'oc2r:circuit_board'
    }, 'kubejs:k_turrets/gauss_bullet_electrical', 8)

    btmTurretRecipe(event, 'k_turrets:gauss_turret_item', [
        'GTG',
        'CAC',
        'RMR'
    ], {
        G: 'k_turrets:gauss_bullet',
        T: 'kubejs:electrical_control_module',
        C: 'oc2r:circuit_board',
        A: 'kubejs:electrical_machine_casing',
        R: 'powergrid:redstone_relay',
        M: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/gauss_turret_electrical')

    btmTurretRecipe(event, 'k_turrets:gauss_drone_item', [
        'GIG',
        'CAC',
        'FMF'
    ], {
        G: 'k_turrets:gauss_bullet',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'oc2r:circuit_board',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'powergrid:electric_motor'
    }, 'kubejs:k_turrets/gauss_drone_electrical')

    btmTurretRecipe(event, 'k_turrets:storage_drone_item', [
        'BIB',
        'CAC',
        'FMF'
    ], {
        B: 'minecraft:barrel',
        I: 'kubejs:electrical_instrumentation_module',
        C: 'oc2r:circuit_board',
        A: 'kubejs:electrical_machine_casing',
        F: 'minecraft:feather',
        M: 'kubejs:electrical_machine_casing'
    }, 'kubejs:k_turrets/storage_drone_electrical')
})
