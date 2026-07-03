// Extreme Y-band reward gates.
// These recipes make terrain commitment pay off with powerful but bounded utility.
// Mountain materials come from high-altitude deposits; deepslate and lava-depth
// materials come from ADLODS bands tightened in config/adlods/Deposits.

var BTM_EXTREME = {
    mountain: {
        emerald: 'minecraft:emerald',
        ruby: 'kubejs:corundum_lapping_grit',
        sapphire: 'kubejs:mountain_beryl_lens'
    },
    deepslate: {
        platinum: 'kubejs:platinum_group_residue',
        palladium: 'kubejs:tungsten_carbide_insert',
        rhodium: 'kubejs:titanium_thermal_plate',
        ruthenium: 'kubejs:kimberlite_diamond_seed'
    },
    lava: {
        uranium: 'kubejs:fissile_salt_blend',
        thorium: 'kubejs:fissile_salt_blend',
        osmium: 'kubejs:soulstone_carbon_matrix',
        iridium: 'kubejs:titanium_thermal_plate',
        osmiridium: 'realisticores:crushed_osmiridium_lava_sulfide_ore',
        debris: 'minecraft:netherite_scrap'
    },
    gate: {
        brass: 'kubejs:brass_machine_casing',
        power: 'kubejs:electrical_machine_casing',
        oc2r: 'kubejs:electrical_machine_casing',
        space: 'kubejs:space_machine_casing',
        ae2: 'kubejs:impossible_machine_casing',
        etherealSlate: 'bloodmagic:etherealslate'
    }
}

function btmExtremeItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmExtremeRecipe(event, output, pattern, keys, id) {
    if (!btmExtremeItemExists(output)) {
        console.info('[extreme-y-rewards] Skipping recipe for missing optional output: ' + output)
        return
    }
    for (var key in keys) {
        var ingredient = keys[key]
        if (ingredient && ingredient.charAt && ingredient.charAt(0) !== '#' && ingredient.indexOf(':') >= 0 && !btmExtremeItemExists(ingredient)) {
            console.info('[extreme-y-rewards] Skipping recipe for missing ingredient: ' + ingredient)
            return
        }
    }

    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, 1, pattern, keys, true)
}

ServerEvents.recipes(function (event) {
    // Mountain-height rewards: strong exploration and movement utility without teleportation or flight.
    btmExtremeRecipe(event, 'artifacts:cloud_in_a_bottle', [
        'SES',
        'RPR',
        'SBS'
    ], {
        S: BTM_EXTREME.mountain.sapphire,
        E: BTM_EXTREME.mountain.emerald,
        R: BTM_EXTREME.mountain.ruby,
        P: 'create:precision_mechanism',
        B: BTM_EXTREME.gate.power
    }, 'kubejs:extreme_y_rewards/mountain/cloud_in_a_bottle')

    btmExtremeRecipe(event, 'artifacts:digging_claws', [
        'RER',
        'SBS',
        'RER'
    ], {
        R: BTM_EXTREME.mountain.ruby,
        E: BTM_EXTREME.mountain.emerald,
        S: BTM_EXTREME.mountain.sapphire,
        B: BTM_EXTREME.gate.brass
    }, 'kubejs:extreme_y_rewards/mountain/digging_claws')

    btmExtremeRecipe(event, 'artifacts:pocket_piston', [
        'RPR',
        'EBE',
        'SAS'
    ], {
        R: BTM_EXTREME.mountain.ruby,
        P: 'create:piston_extension_pole',
        E: BTM_EXTREME.mountain.emerald,
        B: BTM_EXTREME.gate.power,
        S: BTM_EXTREME.mountain.sapphire,
        A: 'create:andesite_alloy'
    }, 'kubejs:extreme_y_rewards/mountain/pocket_piston')

    // Deepslate-depth rewards: high-value workshop/local-site utility.
    btmExtremeRecipe(event, 'sophisticatedbackpacks:advanced_magnet_upgrade', [
        'PMP',
        'RBR',
        'PMP'
    ], {
        P: BTM_EXTREME.deepslate.palladium,
        M: 'sophisticatedbackpacks:magnet_upgrade',
        R: BTM_EXTREME.deepslate.rhodium,
        B: BTM_EXTREME.gate.oc2r
    }, 'kubejs:extreme_y_rewards/deepslate/advanced_magnet_upgrade')

    btmExtremeRecipe(event, 'sophisticatedbackpacks:advanced_tool_swapper_upgrade', [
        'RTR',
        'PBP',
        'RTR'
    ], {
        R: BTM_EXTREME.deepslate.ruthenium,
        T: 'sophisticatedbackpacks:tool_swapper_upgrade',
        P: BTM_EXTREME.deepslate.platinum,
        B: BTM_EXTREME.gate.oc2r
    }, 'kubejs:extreme_y_rewards/deepslate/advanced_tool_swapper_upgrade')

    btmExtremeRecipe(event, 'buildinggadgets2:gadget_destruction', [
        'RPR',
        'SBS',
        'UTU'
    ], {
        R: BTM_EXTREME.deepslate.rhodium,
        P: BTM_EXTREME.deepslate.platinum,
        S: BTM_EXTREME.gate.space,
        B: 'buildinggadgets2:gadget_building',
        U: BTM_EXTREME.deepslate.ruthenium,
        T: BTM_EXTREME.deepslate.palladium
    }, 'kubejs:extreme_y_rewards/deepslate/gadget_destruction')

    btmExtremeRecipe(event, 'ae2:spatial_anchor', [
        'RPR',
        'SBS',
        'RPR'
    ], {
        R: BTM_EXTREME.deepslate.ruthenium,
        P: BTM_EXTREME.deepslate.platinum,
        S: 'ae2:singularity',
        B: BTM_EXTREME.gate.ae2
    }, 'kubejs:extreme_y_rewards/deepslate/spatial_anchor')

    // Lava-depth rewards: survival/combat upgrades for the most dangerous extraction band.
    btmExtremeRecipe(event, 'artifacts:obsidian_skull', [
        'DUO',
        'SBS',
        'OTD'
    ], {
        D: BTM_EXTREME.lava.debris,
        U: BTM_EXTREME.lava.uranium,
        O: BTM_EXTREME.lava.osmium,
        S: 'minecraft:obsidian',
        B: BTM_EXTREME.gate.space,
        T: BTM_EXTREME.lava.thorium
    }, 'kubejs:extreme_y_rewards/lava_depths/obsidian_skull')

    btmExtremeRecipe(event, 'artifacts:fire_gauntlet', [
        'UOU',
        'IBI',
        'TST'
    ], {
        U: BTM_EXTREME.lava.uranium,
        O: BTM_EXTREME.lava.osmium,
        I: BTM_EXTREME.lava.iridium,
        B: BTM_EXTREME.gate.space,
        T: BTM_EXTREME.lava.thorium,
        S: 'bloodmagic:demonslate'
    }, 'kubejs:extreme_y_rewards/lava_depths/fire_gauntlet')

    btmExtremeRecipe(event, 'artifacts:universal_attractor', [
        'OIO',
        'PBP',
        'OIO'
    ], {
        O: BTM_EXTREME.lava.osmiridium,
        I: BTM_EXTREME.lava.iridium,
        P: BTM_EXTREME.deepslate.palladium,
        B: BTM_EXTREME.gate.ae2
    }, 'kubejs:extreme_y_rewards/lava_depths/universal_attractor')

    btmExtremeRecipe(event, 'sophisticatedstorage:netherite_chest', [
        'IDI',
        'OCO',
        'IDI'
    ], {
        I: BTM_EXTREME.lava.iridium,
        D: BTM_EXTREME.lava.debris,
        O: BTM_EXTREME.lava.osmium,
        C: 'sophisticatedstorage:diamond_chest'
    }, 'kubejs:extreme_y_rewards/lava_depths/netherite_chest')

    btmExtremeRecipe(event, 'sophisticatedstorage:netherite_barrel', [
        'IDI',
        'OCO',
        'IDI'
    ], {
        I: BTM_EXTREME.lava.iridium,
        D: BTM_EXTREME.lava.debris,
        O: BTM_EXTREME.lava.osmium,
        C: 'sophisticatedstorage:diamond_barrel'
    }, 'kubejs:extreme_y_rewards/lava_depths/netherite_barrel')
})
