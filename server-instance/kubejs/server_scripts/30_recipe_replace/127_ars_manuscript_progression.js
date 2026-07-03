// Ars Nouveau is now an independent spellcraft lane. The novice book is an early teaser,
// while real spell power comes from manuscripts authored across the pack's existing systems.

function btmArsExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmArsIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmArsInputsExist(inputs) {
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i]
        if (typeof input === 'string' && input.charAt(0) !== '#' && !btmArsExists(input)) return false
        if (input && input.item && !btmArsExists(input.item)) return false
    }
    return true
}

function btmArsRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) {
        if (btmArsExists(outputs[i])) event.remove({ output: outputs[i] })
    }
}

function btmArsAlchemy(event, id, output, count, inputs, syphon, ticks, tier) {
    if (!btmArsExists(output) || !btmArsInputsExist(inputs)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(btmArsIngredient),
        output: { item: output, count: count || 1 },
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:ars_progression/alchemy/' + id)
}

function btmArsHexerei(event, id, output, count, inputs, fluid, heat) {
    if (!btmArsExists(output) || !btmArsInputsExist(inputs)) return
    event.custom({
        type: 'hexerei:mixingcauldron',
        liquid: { fluid: fluid || 'minecraft:water' },
        ingredients: inputs.map(btmArsIngredient),
        output: { item: output, count: count || 1 },
        liquidOutput: { fluid: fluid || 'minecraft:water' },
        fluidLevelsConsumed: 333,
        heatRequirement: heat || 'heated'
    }).id('kubejs:ars_progression/hexerei/' + id)
}

function btmArsCreateMix(event, id, output, count, inputs, heat) {
    if (!btmArsExists(output) || !btmArsInputsExist(inputs)) return
    event.custom({
        type: 'create:mixing',
        ingredients: inputs.map(btmArsIngredient),
        results: [{ item: output, count: count || 1 }],
        heatRequirement: heat || 'heated'
    }).id('kubejs:ars_progression/create_mix/' + id)
}

function btmArsMalum(event, id, output, input, extras, spirits) {
    var allInputs = [input].concat(extras)
    if (!btmArsExists(output) || !btmArsInputsExist(allInputs)) return
    event.custom({
        type: 'malum:spirit_infusion',
        input: btmArsIngredient(input),
        extra_items: extras.map(function (extra) { return btmArsIngredient(extra) }),
        spirits: spirits,
        output: { item: output }
    }).id('kubejs:ars_progression/malum/' + id)
}

function btmArsGoety(event, id, output, activationItem, ingredients, craftType, soulCost, duration) {
    var allInputs = [activationItem].concat(ingredients)
    if (!btmArsExists(output) || !btmArsInputsExist(allInputs)) return
    event.custom({
        type: 'goety:ritual',
        ritual_type: 'goety:craft',
        activation_item: btmArsIngredient(activationItem),
        craftType: craftType || 'sabbath',
        soulCost: soulCost || 150,
        duration: duration || 100,
        ingredients: ingredients.map(btmArsIngredient),
        result: { item: output }
    }).id('kubejs:ars_progression/goety/' + id)
}

function btmArsGlyph(event, id, glyph, exp, inputs) {
    if (!btmArsExists(glyph) || !btmArsInputsExist(inputs)) return
    event.custom({
        type: 'ars_nouveau:glyph',
        count: 1,
        exp: exp,
        inputItems: inputs.map(btmArsIngredient),
        output: glyph
    }).id('kubejs:ars_progression/glyph/' + id)
}

ServerEvents.recipes(function (event) {
    var gatedGlyphs = [
        'ars_nouveau:glyph_touch',
        'ars_nouveau:glyph_self',
        'ars_nouveau:glyph_projectile',
        'ars_nouveau:glyph_break',
        'ars_nouveau:glyph_harm',
        'ars_nouveau:glyph_light',
        'ars_nouveau:glyph_interact',
        'ars_nouveau:glyph_ignite',
        'ars_nouveau:glyph_launch',
        'ars_nouveau:glyph_harvest',
        'ars_nouveau:glyph_leap',
        'ars_nouveau:glyph_freeze',
        'ars_nouveau:glyph_glide',
        'ars_nouveau:glyph_blink',
        'ars_nouveau:glyph_extract',
        'ars_nouveau:glyph_exchange',
        'ars_nouveau:glyph_redstone_signal',
        'ars_nouveau:glyph_extend_time',
        'ars_nouveau:glyph_wall',
        'ars_nouveau:glyph_linger',
        'ars_nouveau:glyph_lightning',
        'ars_nouveau:glyph_wither'
    ]

    btmArsRemoveOutputs(event, gatedGlyphs.concat(['ars_nouveau:novice_spell_book']))

    btmArsAlchemy(event, 'novice_spell_book', 'ars_nouveau:novice_spell_book', 1, [
        'minecraft:book',
        'create:andesite_alloy',
        'hexerei:blood_bottle',
        'bloodmagic:blankslate'
    ], 3000, 80, 1)

    btmArsCreateMix(event, 'manuscript_projectile', 'kubejs:manuscript_projectile', 1, [
        'minecraft:paper',
        'minecraft:arrow',
        'create:andesite_alloy',
        'bloodmagic:blankslate'
    ], 'heated')
    btmArsCreateMix(event, 'manuscript_touch', 'kubejs:manuscript_touch', 1, [
        'minecraft:paper',
        'minecraft:slime_ball',
        'hexerei:tallow_bottle',
        'bloodmagic:blankslate'
    ], 'heated')
    btmArsAlchemy(event, 'manuscript_self', 'kubejs:manuscript_self', 1, [
        'minecraft:paper',
        'minecraft:glass_bottle',
        'hexerei:moon_dust',
        'bloodmagic:blankslate'
    ], 2500, 90, 1)
    btmArsCreateMix(event, 'manuscript_break', 'kubejs:manuscript_break', 1, [
        'minecraft:paper',
        'minecraft:iron_pickaxe',
        'create:cogwheel',
        'bloodmagic:blankslate'
    ], 'heated')
    btmArsAlchemy(event, 'manuscript_harm', 'kubejs:manuscript_harm', 1, [
        'minecraft:paper',
        'hexerei:blood_bottle',
        'minecraft:iron_sword',
        'bloodmagic:reinforcedslate'
    ], 5000, 120, 2)
    btmArsHexerei(event, 'manuscript_light', 'kubejs:manuscript_light', 1, [
        'minecraft:paper',
        'minecraft:glowstone_dust',
        'ars_nouveau:sourceberry',
        'bloodmagic:blankslate'
    ], 'minecraft:water', 'heated')
    btmArsHexerei(event, 'manuscript_interact', 'kubejs:manuscript_interact', 1, [
        'minecraft:paper',
        'minecraft:lever',
        'ars_nouveau:magebloom_fiber',
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
    btmArsHexerei(event, 'manuscript_ignite', 'kubejs:manuscript_ignite', 1, [
        'minecraft:paper',
        'minecraft:flint_and_steel',
        'minecraft:blaze_powder',
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
    btmArsCreateMix(event, 'manuscript_launch', 'kubejs:manuscript_launch', 1, [
        'minecraft:paper',
        'minecraft:feather',
        'create:windmill_bearing',
        'bloodmagic:reinforcedslate'
    ], 'superheated')
    btmArsHexerei(event, 'manuscript_harvest', 'kubejs:manuscript_harvest', 1, [
        'minecraft:paper',
        'farmersdelight:flint_knife',
        'ars_nouveau:sourceberry',
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
    btmArsCreateMix(event, 'manuscript_leap', 'kubejs:manuscript_leap', 1, [
        'minecraft:paper',
        'minecraft:rabbit_foot',
        'create:windmill_bearing',
        'bloodmagic:reinforcedslate'
    ], 'heated')
    btmArsHexerei(event, 'manuscript_freeze', 'kubejs:manuscript_freeze', 1, [
        'minecraft:paper',
        'minecraft:packed_ice',
        'malum:aqueous_spirit',
        'bloodmagic:infusedslate'
    ], 'minecraft:water', 'heated')
    btmArsMalum(event, 'manuscript_glide', 'kubejs:manuscript_glide', 'minecraft:paper', [
        'minecraft:phantom_membrane',
        'malum:aerial_spirit',
        'bloodmagic:infusedslate'
    ], [{ type: 'aerial', count: 8 }, { type: 'arcane', count: 2 }])
    btmArsMalum(event, 'manuscript_blink', 'kubejs:manuscript_blink', 'minecraft:paper', [
        'occultism:otherworld_essence',
        'minecraft:ender_pearl',
        'bloodmagic:infusedslate'
    ], [{ type: 'eldritch', count: 8 }, { type: 'arcane', count: 4 }])
    btmArsMalum(event, 'manuscript_extract', 'kubejs:manuscript_extract', 'minecraft:paper', [
        'occultism:spirit_attuned_gem',
        'ars_nouveau:manipulation_essence',
        'bloodmagic:infusedslate'
    ], [{ type: 'arcane', count: 10 }, { type: 'earthen', count: 4 }])
    btmArsMalum(event, 'manuscript_exchange', 'kubejs:manuscript_exchange', 'minecraft:paper', [
        'occultism:spirit_attuned_gem',
        'forbidden_arcanus:arcane_crystal',
        'bloodmagic:infusedslate'
    ], [{ type: 'arcane', count: 10 }, { type: 'eldritch', count: 4 }])
    btmArsCreateMix(event, 'manuscript_redstone_signal', 'kubejs:manuscript_redstone_signal', 1, [
        'minecraft:paper',
        'powergrid:redstone_relay',
        'minecraft:comparator',
        'bloodmagic:infusedslate'
    ], 'heated')
    btmArsCreateMix(event, 'manuscript_extend_time', 'kubejs:manuscript_extend_time', 1, [
        'minecraft:paper',
        'minecraft:clock',
        'powergrid:redstone_relay',
        'bloodmagic:infusedslate'
    ], 'heated')
    btmArsGoety(event, 'manuscript_wall', 'kubejs:manuscript_wall', 'minecraft:paper', [
        'goety:cursed_bars',
        'malum:earthen_spirit',
        'bloodmagic:demonslate'
    ], 'forge', 250, 120)
    btmArsGoety(event, 'manuscript_linger', 'kubejs:manuscript_linger', 'minecraft:paper', [
        'goety:dark_scroll',
        'malum:eldritch_spirit',
        'bloodmagic:demonslate'
    ], 'sabbath', 350, 160)
    btmArsGoety(event, 'manuscript_lightning', 'kubejs:manuscript_lightning', 'minecraft:paper', [
        'forbidden_arcanus:deorum_ingot',
        'malum:aerial_spirit',
        'bloodmagic:demonslate'
    ], 'forge', 400, 180)
    btmArsGoety(event, 'manuscript_wither', 'kubejs:manuscript_wither', 'minecraft:paper', [
        'minecraft:wither_rose',
        'malum:wicked_spirit',
        'bloodmagic:demonslate'
    ], 'sabbath', 500, 220)

    btmArsGlyph(event, 'touch', 'ars_nouveau:glyph_touch', 20, ['kubejs:manuscript_touch', 'ars_nouveau:magebloom_fiber'])
    btmArsGlyph(event, 'self', 'ars_nouveau:glyph_self', 20, ['kubejs:manuscript_self', 'ars_nouveau:magebloom_fiber'])
    btmArsGlyph(event, 'projectile', 'ars_nouveau:glyph_projectile', 20, ['kubejs:manuscript_projectile', 'ars_nouveau:magebloom_fiber'])
    btmArsGlyph(event, 'break', 'ars_nouveau:glyph_break', 35, ['kubejs:manuscript_break', 'ars_nouveau:magebloom_fiber'])
    btmArsGlyph(event, 'harm', 'ars_nouveau:glyph_harm', 40, ['kubejs:manuscript_harm', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'light', 'ars_nouveau:glyph_light', 30, ['kubejs:manuscript_light', 'ars_nouveau:magebloom_fiber'])
    btmArsGlyph(event, 'interact', 'ars_nouveau:glyph_interact', 35, ['kubejs:manuscript_interact', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'ignite', 'ars_nouveau:glyph_ignite', 35, ['kubejs:manuscript_ignite', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'launch', 'ars_nouveau:glyph_launch', 40, ['kubejs:manuscript_launch', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'harvest', 'ars_nouveau:glyph_harvest', 45, ['kubejs:manuscript_harvest', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'leap', 'ars_nouveau:glyph_leap', 50, ['kubejs:manuscript_leap', 'ars_nouveau:source_gem'])
    btmArsGlyph(event, 'freeze', 'ars_nouveau:glyph_freeze', 60, ['kubejs:manuscript_freeze', 'ars_nouveau:water_essence'])
    btmArsGlyph(event, 'glide', 'ars_nouveau:glyph_glide', 70, ['kubejs:manuscript_glide', 'ars_nouveau:air_essence'])
    btmArsGlyph(event, 'blink', 'ars_nouveau:glyph_blink', 80, ['kubejs:manuscript_blink', 'ars_nouveau:manipulation_essence'])
    btmArsGlyph(event, 'extract', 'ars_nouveau:glyph_extract', 90, ['kubejs:manuscript_extract', 'ars_nouveau:manipulation_essence'])
    btmArsGlyph(event, 'exchange', 'ars_nouveau:glyph_exchange', 90, ['kubejs:manuscript_exchange', 'ars_nouveau:manipulation_essence'])
    btmArsGlyph(event, 'redstone_signal', 'ars_nouveau:glyph_redstone_signal', 80, ['kubejs:manuscript_redstone_signal', 'ars_nouveau:manipulation_essence'])
    btmArsGlyph(event, 'extend_time', 'ars_nouveau:glyph_extend_time', 80, ['kubejs:manuscript_extend_time', 'ars_nouveau:manipulation_essence'])
    btmArsGlyph(event, 'wall', 'ars_nouveau:glyph_wall', 100, ['kubejs:manuscript_wall', 'ars_nouveau:earth_essence'])
    btmArsGlyph(event, 'linger', 'ars_nouveau:glyph_linger', 110, ['kubejs:manuscript_linger', 'ars_nouveau:abjuration_essence'])
    btmArsGlyph(event, 'lightning', 'ars_nouveau:glyph_lightning', 120, ['kubejs:manuscript_lightning', 'ars_nouveau:air_essence'])
    btmArsGlyph(event, 'wither', 'ars_nouveau:glyph_wither', 130, ['kubejs:manuscript_wither', 'ars_nouveau:abjuration_essence'])
})
