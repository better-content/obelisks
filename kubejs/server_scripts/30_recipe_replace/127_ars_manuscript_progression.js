// Ars Nouveau is now an independent spellcraft lane. The novice book is an early teaser,
// while real spell power comes from manuscripts authored across the pack's existing systems.

function bcArsExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

var BC_ARS_OS_T1 = 'deeperdarker:cobbled_sculk_stone'
var BC_ARS_OS_T2 = 'deeperdarker:gloomslate'
var BC_ARS_OS_T3 = 'minecraft:echo_shard'
var BC_ARS_OS_T4 = 'deeperdarker:sculk_bone'

function bcArsIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function bcArsInputsExist(inputs) {
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i]
        if (typeof input === 'string' && input.charAt(0) !== '#' && !bcArsExists(input)) return false
        if (input && input.item && !bcArsExists(input.item)) return false
    }
    return true
}

function bcArsRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) {
        if (bcArsExists(outputs[i])) event.remove({ output: outputs[i] })
    }
}

function bcArsAlchemy(event, id, output, count, inputs, syphon, ticks, tier) {
    if (!bcArsExists(output) || !bcArsInputsExist(inputs)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(bcArsIngredient),
        output: { item: output, count: count || 1 },
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:ars_progression/alchemy/' + id)
}

function bcArsHexerei(event, id, output, count, inputs, fluid, heat) {
    if (!bcArsExists(output) || !bcArsInputsExist(inputs)) return
    event.custom({
        type: 'hexerei:mixingcauldron',
        liquid: { fluid: fluid || 'minecraft:water' },
        ingredients: inputs.map(bcArsIngredient),
        output: { item: output, count: count || 1 },
        liquidOutput: { fluid: fluid || 'minecraft:water' },
        fluidLevelsConsumed: 333,
        heatRequirement: heat || 'heated'
    }).id('kubejs:ars_progression/hexerei/' + id)
}

function bcArsCreateMix(event, id, output, count, inputs, heat) {
    if (!bcArsExists(output) || !bcArsInputsExist(inputs)) return
    event.custom({
        type: 'create:mixing',
        ingredients: inputs.map(bcArsIngredient),
        results: [{ item: output, count: count || 1 }],
        heatRequirement: heat || 'heated'
    }).id('kubejs:ars_progression/create_mix/' + id)
}

function bcArsMalum(event, id, output, input, extras, spirits) {
    var allInputs = [input].concat(extras)
    if (!bcArsExists(output) || !bcArsInputsExist(allInputs)) return
    event.custom({
        type: 'malum:spirit_infusion',
        input: bcArsIngredient(input),
        extra_items: extras.map(function (extra) { return bcArsIngredient(extra) }),
        spirits: spirits,
        output: { item: output }
    }).id('kubejs:ars_progression/malum/' + id)
}

function bcArsGoety(event, id, output, activationItem, ingredients, craftType, soulCost, duration) {
    var allInputs = [activationItem].concat(ingredients)
    if (!bcArsExists(output) || !bcArsInputsExist(allInputs)) return
    event.custom({
        type: 'goety:ritual',
        ritual_type: 'goety:craft',
        activation_item: bcArsIngredient(activationItem),
        craftType: craftType || 'sabbath',
        soulCost: soulCost || 150,
        duration: duration || 100,
        ingredients: ingredients.map(bcArsIngredient),
        result: { item: output }
    }).id('kubejs:ars_progression/goety/' + id)
}

function bcArsGlyph(event, id, glyph, exp, inputs) {
    if (!bcArsExists(glyph) || !bcArsInputsExist(inputs)) return
    event.custom({
        type: 'ars_nouveau:glyph',
        count: 1,
        exp: exp,
        inputItems: inputs.map(function (input) { return { item: bcArsIngredient(input) } }),
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

     bcArsRemoveOutputs(event, gatedGlyphs.concat(['ars_nouveau:novice_spell_book']))

     bcArsAlchemy(event, 'novice_spell_book', 'ars_nouveau:novice_spell_book', 1, [
        'minecraft:book',
        'create:andesite_alloy',
        'hexerei:blood_bottle',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 3000, 80, 1)

     bcArsCreateMix(event, 'manuscript_projectile', 'kubejs:manuscript_projectile', 1, [
        'minecraft:paper',
        'minecraft:arrow',
        'create:andesite_alloy',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 'heated')
     bcArsCreateMix(event, 'manuscript_touch', 'kubejs:manuscript_touch', 1, [
        'minecraft:paper',
        'minecraft:slime_ball',
        'hexerei:tallow_bottle',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 'heated')
     bcArsAlchemy(event, 'manuscript_self', 'kubejs:manuscript_self', 1, [
        'minecraft:paper',
        'minecraft:glass_bottle',
        'hexerei:moon_dust',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 2500, 90, 1)
     bcArsCreateMix(event, 'manuscript_break', 'kubejs:manuscript_break', 1, [
        'minecraft:paper',
        'minecraft:iron_pickaxe',
        'create:cogwheel',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 'heated')
     bcArsAlchemy(event, 'manuscript_harm', 'kubejs:manuscript_harm', 1, [
        'minecraft:paper',
        'hexerei:blood_bottle',
        'minecraft:iron_sword',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 5000, 120, 2)
     bcArsHexerei(event, 'manuscript_light', 'kubejs:manuscript_light', 1, [
        'minecraft:paper',
        'minecraft:glowstone_dust',
        'ars_nouveau:sourceberry',
        BC_ARS_OS_T1,
        'bloodmagic:blankslate'
    ], 'minecraft:water', 'heated')
     bcArsHexerei(event, 'manuscript_interact', 'kubejs:manuscript_interact', 1, [
        'minecraft:paper',
        'minecraft:lever',
        'ars_nouveau:magebloom_fiber',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
     bcArsHexerei(event, 'manuscript_ignite', 'kubejs:manuscript_ignite', 1, [
        'minecraft:paper',
        'minecraft:flint_and_steel',
        'minecraft:blaze_powder',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
     bcArsCreateMix(event, 'manuscript_launch', 'kubejs:manuscript_launch', 1, [
        'minecraft:paper',
        'minecraft:feather',
        'create:windmill_bearing',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 'superheated')
     bcArsHexerei(event, 'manuscript_harvest', 'kubejs:manuscript_harvest', 1, [
        'minecraft:paper',
        'farmersdelight:flint_knife',
        'ars_nouveau:sourceberry',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 'minecraft:water', 'heated')
     bcArsCreateMix(event, 'manuscript_leap', 'kubejs:manuscript_leap', 1, [
        'minecraft:paper',
        'minecraft:rabbit_foot',
        'create:windmill_bearing',
        BC_ARS_OS_T2,
        'bloodmagic:reinforcedslate'
    ], 'heated')
     bcArsHexerei(event, 'manuscript_freeze', 'kubejs:manuscript_freeze', 1, [
        'minecraft:paper',
        'minecraft:packed_ice',
        'malum:aqueous_spirit',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], 'minecraft:water', 'heated')
     bcArsMalum(event, 'manuscript_glide', 'kubejs:manuscript_glide', 'minecraft:paper', [
        'minecraft:phantom_membrane',
        'malum:aerial_spirit',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], [{ type: 'aerial', count: 8 }, { type: 'arcane', count: 2 }])
     bcArsMalum(event, 'manuscript_blink', 'kubejs:manuscript_blink', 'minecraft:paper', [
        'occultism:otherworld_essence',
        'minecraft:ender_pearl',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], [{ type: 'eldritch', count: 8 }, { type: 'arcane', count: 4 }])
     bcArsMalum(event, 'manuscript_extract', 'kubejs:manuscript_extract', 'minecraft:paper', [
        'occultism:spirit_attuned_gem',
        'ars_nouveau:manipulation_essence',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], [{ type: 'arcane', count: 10 }, { type: 'earthen', count: 4 }])
     bcArsMalum(event, 'manuscript_exchange', 'kubejs:manuscript_exchange', 'minecraft:paper', [
        'occultism:spirit_attuned_gem',
        'forbidden_arcanus:arcane_crystal',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], [{ type: 'arcane', count: 10 }, { type: 'eldritch', count: 4 }])
     bcArsCreateMix(event, 'manuscript_redstone_signal', 'kubejs:manuscript_redstone_signal', 1, [
        'minecraft:paper',
        'powergrid:redstone_relay',
        'minecraft:comparator',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], 'heated')
     bcArsCreateMix(event, 'manuscript_extend_time', 'kubejs:manuscript_extend_time', 1, [
        'minecraft:paper',
        'minecraft:clock',
        'powergrid:redstone_relay',
        BC_ARS_OS_T3,
        'bloodmagic:infusedslate'
    ], 'heated')
     bcArsGoety(event, 'manuscript_wall', 'kubejs:manuscript_wall', 'minecraft:paper', [
        'goety:cursed_bars',
        'malum:earthen_spirit',
        BC_ARS_OS_T4,
        'bloodmagic:demonslate'
    ], 'forge', 250, 120)
     bcArsGoety(event, 'manuscript_linger', 'kubejs:manuscript_linger', 'minecraft:paper', [
        'goety:dark_scroll',
        'malum:eldritch_spirit',
        BC_ARS_OS_T4,
        'bloodmagic:demonslate'
    ], 'sabbath', 350, 160)
     bcArsGoety(event, 'manuscript_lightning', 'kubejs:manuscript_lightning', 'minecraft:paper', [
        'forbidden_arcanus:deorum_ingot',
        'malum:aerial_spirit',
        BC_ARS_OS_T4,
        'bloodmagic:demonslate'
    ], 'forge', 400, 180)
     bcArsGoety(event, 'manuscript_wither', 'kubejs:manuscript_wither', 'minecraft:paper', [
        'minecraft:wither_rose',
        'malum:wicked_spirit',
        BC_ARS_OS_T4,
        'bloodmagic:demonslate'
    ], 'sabbath', 500, 220)

     bcArsGlyph(event, 'touch', 'ars_nouveau:glyph_touch', 20, ['kubejs:manuscript_touch', 'ars_nouveau:magebloom_fiber'])
     bcArsGlyph(event, 'self', 'ars_nouveau:glyph_self', 20, ['kubejs:manuscript_self', 'ars_nouveau:magebloom_fiber'])
     bcArsGlyph(event, 'projectile', 'ars_nouveau:glyph_projectile', 20, ['kubejs:manuscript_projectile', 'ars_nouveau:magebloom_fiber'])
     bcArsGlyph(event, 'break', 'ars_nouveau:glyph_break', 35, ['kubejs:manuscript_break', 'ars_nouveau:magebloom_fiber'])
     bcArsGlyph(event, 'harm', 'ars_nouveau:glyph_harm', 40, ['kubejs:manuscript_harm', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'light', 'ars_nouveau:glyph_light', 30, ['kubejs:manuscript_light', 'ars_nouveau:magebloom_fiber'])
     bcArsGlyph(event, 'interact', 'ars_nouveau:glyph_interact', 35, ['kubejs:manuscript_interact', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'ignite', 'ars_nouveau:glyph_ignite', 35, ['kubejs:manuscript_ignite', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'launch', 'ars_nouveau:glyph_launch', 40, ['kubejs:manuscript_launch', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'harvest', 'ars_nouveau:glyph_harvest', 45, ['kubejs:manuscript_harvest', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'leap', 'ars_nouveau:glyph_leap', 50, ['kubejs:manuscript_leap', 'ars_nouveau:source_gem'])
     bcArsGlyph(event, 'freeze', 'ars_nouveau:glyph_freeze', 60, ['kubejs:manuscript_freeze', 'ars_nouveau:water_essence'])
     bcArsGlyph(event, 'glide', 'ars_nouveau:glyph_glide', 70, ['kubejs:manuscript_glide', 'ars_nouveau:air_essence'])
     bcArsGlyph(event, 'blink', 'ars_nouveau:glyph_blink', 80, ['kubejs:manuscript_blink', 'ars_nouveau:manipulation_essence'])
     bcArsGlyph(event, 'extract', 'ars_nouveau:glyph_extract', 90, ['kubejs:manuscript_extract', 'ars_nouveau:manipulation_essence'])
     bcArsGlyph(event, 'exchange', 'ars_nouveau:glyph_exchange', 90, ['kubejs:manuscript_exchange', 'ars_nouveau:manipulation_essence'])
     bcArsGlyph(event, 'redstone_signal', 'ars_nouveau:glyph_redstone_signal', 80, ['kubejs:manuscript_redstone_signal', 'ars_nouveau:manipulation_essence'])
     bcArsGlyph(event, 'extend_time', 'ars_nouveau:glyph_extend_time', 80, ['kubejs:manuscript_extend_time', 'ars_nouveau:manipulation_essence'])
     bcArsGlyph(event, 'wall', 'ars_nouveau:glyph_wall', 100, ['kubejs:manuscript_wall', 'ars_nouveau:earth_essence'])
     bcArsGlyph(event, 'linger', 'ars_nouveau:glyph_linger', 110, ['kubejs:manuscript_linger', 'ars_nouveau:abjuration_essence'])
     bcArsGlyph(event, 'lightning', 'ars_nouveau:glyph_lightning', 120, ['kubejs:manuscript_lightning', 'ars_nouveau:air_essence'])
     bcArsGlyph(event, 'wither', 'ars_nouveau:glyph_wither', 130, ['kubejs:manuscript_wither', 'ars_nouveau:abjuration_essence'])
})
