// Backpack automation that changes body logistics is post-AE2. These are explicit
// recipes rather than broad input replacement so the gates remain visible in EMI.

function btmBpExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmBpRecipe(event, output, pattern, key, id) {
    if (!btmBpExists(output)) return
    for (var symbol in key) {
        var ingredient = key[symbol]
        if (ingredient && ingredient.charAt && ingredient.charAt(0) !== '#' && ingredient.indexOf(':') >= 0 && !btmBpExists(ingredient)) return
    }
    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, 1, pattern, key, true)
}

ServerEvents.recipes(function (event) {
    btmBpRecipe(event, 'sophisticatedbackpacks:feeding_upgrade', [
        'FDF',
        'CAC',
        'FDF'
    ], {
        F: 'farmersdelight:roast_chicken_block',
        D: 'sophisticatedbackpacks:upgrade_base',
        C: 'kubejs:impossible_machine_casing',
        A: 'kubejs:ae_logic_package'
    }, 'kubejs:sophisticatedbackpacks/feeding_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedbackpacks:advanced_feeding_upgrade', [
        'SQS',
        'UCU',
        'SQS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        Q: 'kubejs:sky_steel_sheet',
        U: 'sophisticatedbackpacks:feeding_upgrade',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:sophisticatedbackpacks/advanced_feeding_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedbackpacks:alchemy_upgrade', [
        'ESE',
        'CAC',
        'ESE'
    ], {
        E: 'bloodmagic:etherealslate',
        S: 'ars_nouveau:source_gem_block',
        C: 'kubejs:impossible_machine_casing',
        A: 'sophisticatedbackpacks:upgrade_base'
    }, 'kubejs:sophisticatedbackpacks/alchemy_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedbackpacks:advanced_alchemy_upgrade', [
        'SQS',
        'UCU',
        'SQS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        Q: 'kubejs:ae_logic_package',
        U: 'sophisticatedbackpacks:alchemy_upgrade',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:sophisticatedbackpacks/advanced_alchemy_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedbackpacks:tool_swapper_upgrade', [
        'TQT',
        'CAC',
        'TQT'
    ], {
        T: 'create:mechanical_arm',
        Q: 'kubejs:sky_steel_sheet',
        C: 'kubejs:impossible_machine_casing',
        A: 'sophisticatedbackpacks:upgrade_base'
    }, 'kubejs:sophisticatedbackpacks/tool_swapper_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedbackpacks:advanced_tool_swapper_upgrade', [
        'SQS',
        'UCU',
        'SQS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        Q: 'kubejs:ae_logic_package',
        U: 'sophisticatedbackpacks:tool_swapper_upgrade',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:sophisticatedbackpacks/advanced_tool_swapper_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedstorage:alchemy_upgrade', [
        'ESE',
        'CAC',
        'ESE'
    ], {
        E: 'bloodmagic:etherealslate',
        S: 'ars_nouveau:source_gem_block',
        C: 'kubejs:impossible_machine_casing',
        A: 'sophisticatedstorage:upgrade_base'
    }, 'kubejs:sophisticatedstorage/alchemy_upgrade_post_ae2')

    btmBpRecipe(event, 'sophisticatedstorage:advanced_alchemy_upgrade', [
        'SQS',
        'UCU',
        'SQS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        Q: 'kubejs:ae_logic_package',
        U: 'sophisticatedstorage:alchemy_upgrade',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:sophisticatedstorage/advanced_alchemy_upgrade_post_ae2')
})
