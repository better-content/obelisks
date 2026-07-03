// Mobility and autonomous helper tools are powerful route-editing utilities.
// Keep them off the hand grid; tier hooks and Create Stuff & Additions drones
// through mechanical assembly.

function btmMobilityExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmMobilityMechanical(event, output, pattern, key, recipeId) {
    if (!btmMobilityExists(output)) return
    event.remove({ output: output })
    global.btmFactoryCrafting(event, recipeId, output, 1, pattern, key, true)
}

ServerEvents.recipes(function (event) {
    if (!btmMobilityExists('kubejs:sky_steel_sheet') || !btmMobilityExists('kubejs:ae_logic_package')) return

    btmMobilityMechanical(event, 'rehooked:wood_chain', [
        ' SS',
        'SCS',
        'SS '
    ], {
        S: '#forge:rods/wooden',
        C: 'kubejs:seared_machine_casing'
    }, 'kubejs:rehooked/wood_chain_post_seared')

    btmMobilityMechanical(event, 'rehooked:wood_hook', [
        'RRC',
        ' WH',
        'W H'
    ], {
        R: 'farmersdelight:rope',
        C: 'kubejs:seared_machine_casing',
        W: 'rehooked:wood_chain',
        H: '#forge:rods/wooden'
    }, 'kubejs:rehooked/wood_hook_post_seared')

    btmMobilityMechanical(event, 'rehooked:iron_hook', [
        'IIC',
        ' HI',
        'L I'
    ], {
        I: '#forge:plates/iron',
        C: 'kubejs:andesite_machine_casing',
        H: 'rehooked:wood_hook',
        L: 'minecraft:chain'
    }, 'kubejs:rehooked/iron_hook_post_create')

    btmMobilityMechanical(event, 'rehooked:diamond_chain', [
        ' DD',
        'DCD',
        'DD '
    ], {
        D: '#forge:gems/diamond',
        C: 'kubejs:brass_machine_casing'
    }, 'kubejs:rehooked/diamond_chain_post_brass')

    btmMobilityMechanical(event, 'rehooked:diamond_hook', [
        'DDC',
        ' HI',
        'L I'
    ], {
        D: '#forge:gems/diamond',
        C: 'kubejs:brass_machine_casing',
        H: 'rehooked:iron_hook',
        I: '#forge:plates/iron',
        L: 'rehooked:diamond_chain'
    }, 'kubejs:rehooked/diamond_hook_post_brass')

    btmMobilityMechanical(event, 'rehooked:blaze_hook', [
        ' H ',
        'BPC',
        ' H '
    ], {
        H: 'minecraft:blaze_rod',
        B: 'rehooked:diamond_hook',
        P: 'kubejs:electrical_machine_casing',
        C: 'heatsync:heat_pipe'
    }, 'kubejs:rehooked/blaze_hook_post_electricity')

    btmMobilityMechanical(event, 'rehooked:ender_hook', [
        ' E ',
        'HSH',
        ' E '
    ], {
        E: 'minecraft:ender_pearl',
        H: 'rehooked:blaze_hook',
        S: 'kubejs:space_machine_casing'
    }, 'kubejs:rehooked/ender_hook_post_space')

    btmMobilityMechanical(event, 'rehooked:red_hook', [
        'QAQ',
        'HRH',
        'QAQ'
    ], {
        Q: 'kubejs:sky_steel_sheet',
        A: 'kubejs:impossible_machine_casing',
        H: 'rehooked:ender_hook',
        R: 'kubejs:ae_logic_package'
    }, 'kubejs:rehooked/red_hook_post_ae2')

    btmMobilityMechanical(event, 'create_sa:brass_drone', [
        'QPQ',
        'DAD',
        'QSQ'
    ], {
        Q: 'kubejs:sky_steel_sheet',
        P: 'create:precision_mechanism',
        D: 'create:brass_sheet',
        A: 'kubejs:impossible_machine_casing',
        S: 'create_sa:zinc_handle'
    }, 'kubejs:create_sa/brass_drone_post_ae2')
})
