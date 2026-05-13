// Mobility and autonomous helper tools are powerful route-editing utilities. Keep
// basic hooks early, then tier the stronger hooks and Create Stuff & Additions drones.

function btmMobilityExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmMobilityShaped(event, output, pattern, key, recipeId) {
    if (!btmMobilityExists(output)) return
    event.remove({ output: output })
    event.shaped(output, pattern, key).id(recipeId)
}

ServerEvents.recipes(function (event) {
    btmMobilityShaped(event, 'rehooked:blaze_hook', [
        ' H ',
        'BPC',
        ' H '
    ], {
        H: 'minecraft:blaze_rod',
        B: 'rehooked:diamond_hook',
        P: 'kubejs:electrical_machine_casing',
        C: 'create_new_age:heat_pipe'
    }, 'kubejs:rehooked/blaze_hook_post_electricity')

    btmMobilityShaped(event, 'rehooked:ender_hook', [
        ' E ',
        'HSH',
        ' E '
    ], {
        E: 'minecraft:ender_pearl',
        H: 'rehooked:blaze_hook',
        S: 'kubejs:space_machine_casing'
    }, 'kubejs:rehooked/ender_hook_post_space')

    btmMobilityShaped(event, 'rehooked:red_hook', [
        'QAQ',
        'HRH',
        'QAQ'
    ], {
        Q: 'kubejs:sky_steel_sheet',
        A: 'kubejs:impossible_machine_casing',
        H: 'rehooked:ender_hook',
        R: 'kubejs:impossible_circuit'
    }, 'kubejs:rehooked/red_hook_post_ae2')

    btmMobilityShaped(event, 'create_sa:brass_drone', [
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
