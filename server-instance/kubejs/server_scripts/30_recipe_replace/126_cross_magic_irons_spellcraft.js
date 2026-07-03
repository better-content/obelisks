// Iron's Spells craft surface integration.
//
// Direct Iron's spellcraft recipes are replaced with processes from the
// pack's magic graph. Blood Magic still sets the tier, while Ars, Hexerei,
// Goety, Malum, Occultism, Forbidden Arcanus, and Reliquary provide the
// working surfaces and reagents.

var BTM_IRONS_T1 = 'bloodmagic:blankslate'
var BTM_IRONS_T2 = 'bloodmagic:reinforcedslate'
var BTM_IRONS_T3 = 'bloodmagic:infusedslate'
var BTM_IRONS_T4 = 'bloodmagic:demonslate'
var BTM_IRONS_T5 = 'bloodmagic:etherealslate'

function btmIronsExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmIronsIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmIronsIngredientExists(input) {
    if (!input) return false
    if (typeof input === 'string') return input.charAt(0) === '#' || btmIronsExists(input)
    if (input.item) return btmIronsExists(input.item)
    return !!input.tag || !!input.fluid
}

function btmIronsCanMake(output, inputs) {
    if (!btmIronsExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmIronsIngredientExists(inputs[i])) return false
    }
    return true
}

function btmIronsResult(output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

function btmIronsCountIngredient(input, count) {
    var ingredient = btmIronsIngredient(input)
    if (!ingredient.count) ingredient.count = count || 1
    return ingredient
}

function btmIronsRemoveOutput(event, output) {
    if (btmIronsExists(output)) event.remove({ output: output })
}

function btmIronsRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) btmIronsRemoveOutput(event, outputs[i])
}

function btmIronsBloodAlchemy(event, id, output, count, inputs, syphon, ticks, tier) {
    if (!btmIronsCanMake(output, inputs)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(btmIronsIngredient),
        output: btmIronsResult(output, count),
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:irons_cross_magic/blood_alchemy/' + id)
}

function btmIronsArsApparatus(event, id, output, count, reagent, pedestalItems, sourceCost) {
    var inputs = [reagent].concat(pedestalItems)
    if (!btmIronsCanMake(output, inputs)) return
    event.custom({
        type: 'ars_nouveau:enchanting_apparatus',
        keepNbtOfReagent: false,
        output: btmIronsResult(output, count),
        pedestalItems: pedestalItems.map(btmIronsIngredient),
        reagent: [btmIronsIngredient(reagent)],
        sourceCost: sourceCost
    }).id('kubejs:irons_cross_magic/ars_apparatus/' + id)
}

function btmIronsHexereiCauldron(event, id, output, count, ingredients, fluid, heat) {
    if (!btmIronsCanMake(output, ingredients)) return
    event.custom({
        type: 'hexerei:mixingcauldron',
        liquid: { fluid: fluid || 'minecraft:water' },
        ingredients: ingredients.map(btmIronsIngredient),
        output: btmIronsResult(output, count),
        liquidOutput: { fluid: fluid || 'minecraft:water' },
        fluidLevelsConsumed: 333,
        heatRequirement: heat || 'heated'
    }).id('kubejs:irons_cross_magic/hexerei_cauldron/' + id)
}

function btmIronsMalumInfusion(event, id, output, count, input, inputCount, extras, spirits) {
    var inputs = [input].concat(extras)
    if (!btmIronsCanMake(output, inputs)) return
    event.custom({
        type: 'malum:spirit_infusion',
        input: btmIronsCountIngredient(input, inputCount || 1),
        extra_items: extras.map(function (extra) { return btmIronsCountIngredient(extra, 1) }),
        spirits: spirits,
        output: btmIronsResult(output, count)
    }).id('kubejs:irons_cross_magic/malum_spirit_infusion/' + id)
}

function btmIronsGoetyRitual(event, id, output, count, activationItem, ingredients, craftType, soulCost, duration) {
    var inputs = [activationItem].concat(ingredients)
    if (!btmIronsCanMake(output, inputs)) return
    event.custom({
        type: 'goety:ritual',
        ritual_type: 'goety:craft',
        activation_item: btmIronsIngredient(activationItem),
        craftType: craftType || 'sabbath',
        soulCost: soulCost || 100,
        duration: duration || 60,
        ingredients: ingredients.map(btmIronsIngredient),
        result: btmIronsResult(output, count)
    }).id('kubejs:irons_cross_magic/goety_ritual/' + id)
}

var BTM_IRONS_SPELLCRAFT_OUTPUTS = [
    'irons_spellbooks:scroll_forge',
    'irons_spellbooks:inscription_table',
    'irons_spellbooks:arcane_anvil',
    'irons_spellbooks:alchemist_cauldron',
    'irons_spellbooks:arcane_ingot',
    'irons_spellbooks:magic_cloth',
    'irons_spellbooks:mithril_weave',
    'irons_spellbooks:blank_rune',
    'irons_spellbooks:arcane_rune',
    'irons_spellbooks:upgrade_orb',
    'irons_spellbooks:lesser_spell_slot_upgrade',
    'irons_spellbooks:eldritch_manuscript',
    'irons_spellbooks:divine_pearl',
    'irons_spellbooks:energized_core',
    'irons_spellbooks:shriving_stone',
    'irons_spellbooks:copper_spell_book',
    'irons_spellbooks:iron_spell_book',
    'irons_spellbooks:gold_spell_book',
    'irons_spellbooks:diamond_spell_book',
    'irons_spellbooks:netherite_spell_book',
    'irons_spellbooks:ice_spell_book',
    'irons_spellbooks:druidic_spell_book',
    'irons_spellbooks:cursed_doll_spell_book',
    'irons_spellbooks:dragonskin_spell_book',
    'irons_spellbooks:affinity_ring',
    'irons_spellbooks:cast_time_ring',
    'irons_spellbooks:cooldown_ring',
    'irons_spellbooks:emerald_stoneplate_ring',
    'irons_spellbooks:fireward_ring',
    'irons_spellbooks:frostward_ring',
    'irons_spellbooks:mana_ring',
    'irons_spellbooks:poisonward_ring',
    'irons_spellbooks:visibility_ring',
    'irons_spellbooks:amethyst_resonance_charm',
    'irons_spellbooks:concentration_amulet',
    'irons_spellbooks:conjurers_talisman',
    'irons_spellbooks:greater_conjurers_talisman',
    'irons_spellbooks:heavy_chain_necklace',
    'irons_spellbooks:ice_staff',
    'irons_spellbooks:graybeard_staff',
    'irons_spellbooks:pyrium_staff',
    'irons_spellbooks:artificer_cane',
    'irons_spellbooks:spellbreaker',
    'irons_spellbooks:twilight_gale'
]

var BTM_IRONS_RUNES = [
    { id: 'blood', output: 'irons_spellbooks:blood_rune', focus: 'hexerei:blood_bottle', reagent: 'bloodmagic:blankslate', spirit: 'wicked' },
    { id: 'cooldown', output: 'irons_spellbooks:cooldown_rune', focus: 'forbidden_arcanus:arcane_crystal', reagent: 'ars_nouveau:source_gem', spirit: 'arcane' },
    { id: 'ender', output: 'irons_spellbooks:ender_rune', focus: 'occultism:otherworld_essence', reagent: 'minecraft:ender_pearl', spirit: 'eldritch' },
    { id: 'evocation', output: 'irons_spellbooks:evocation_rune', focus: 'goety:magic_emerald', reagent: 'goety:cursed_bars', spirit: 'wicked' },
    { id: 'fire', output: 'irons_spellbooks:fire_rune', focus: 'minecraft:blaze_powder', reagent: 'reliquary:infernal_tear', spirit: 'infernal' },
    { id: 'holy', output: 'irons_spellbooks:holy_rune', focus: 'reliquary:angelic_feather', reagent: 'bloodmagic:infusedslate', spirit: 'sacred' },
    { id: 'ice', output: 'irons_spellbooks:ice_rune', focus: 'minecraft:packed_ice', reagent: 'ars_nouveau:water_essence', spirit: 'aqueous' },
    { id: 'lightning', output: 'irons_spellbooks:lightning_rune', focus: 'forbidden_arcanus:deorum_ingot', reagent: 'powergrid:redstone_relay', spirit: 'aerial' },
    { id: 'nature', output: 'irons_spellbooks:nature_rune', focus: 'hexerei:mandrake_root', reagent: 'ars_nouveau:sourceberry_bush', spirit: 'earthen' },
    { id: 'protection', output: 'irons_spellbooks:protection_rune', focus: 'malum:processed_soulstone', reagent: 'minecraft:shield', spirit: 'sacred' }
]

function btmIronsSpirit(type, count) {
    return { type: type, count: count }
}

function btmIronsRuneRecipes(event) {
    for (var i = 0; i < BTM_IRONS_RUNES.length; i++) {
        var rune = BTM_IRONS_RUNES[i]
        btmIronsMalumInfusion(event, rune.id + '_rune', rune.output, 1, 'irons_spellbooks:blank_rune', 1, [
            rune.focus,
            rune.reagent,
            BTM_IRONS_T3
        ], [
            btmIronsSpirit(rune.spirit, 6),
            btmIronsSpirit('arcane', 2)
        ])
        btmIronsArsApparatus(event, rune.id + '_upgrade_orb', 'irons_spellbooks:' + rune.id + '_upgrade_orb', 1, 'irons_spellbooks:upgrade_orb', [
            'irons_spellbooks:blank_rune',
            rune.focus,
            rune.reagent,
            BTM_IRONS_T3
        ], 4500)
    }
}

ServerEvents.recipes(function (event) {
    btmIronsRemoveOutputs(event, BTM_IRONS_SPELLCRAFT_OUTPUTS)
    for (var i = 0; i < BTM_IRONS_RUNES.length; i++) {
        btmIronsRemoveOutput(event, BTM_IRONS_RUNES[i].output)
        btmIronsRemoveOutput(event, 'irons_spellbooks:' + BTM_IRONS_RUNES[i].id + '_upgrade_orb')
    }

    btmIronsHexereiCauldron(event, 'magic_cloth', 'irons_spellbooks:magic_cloth', 4, [
        'hexerei:wax_blend',
        'hexerei:tallow_bottle',
        'malum:spirit_fabric',
        'malum:arcane_spirit',
        BTM_IRONS_T1,
        'minecraft:white_wool',
        'minecraft:string',
        'minecraft:string'
    ], 'minecraft:water', 'heated')

    btmIronsMalumInfusion(event, 'arcane_ingot', 'irons_spellbooks:arcane_ingot', 1, 'forbidden_arcanus:arcane_crystal', 1, [
        'malum:hallowed_gold_ingot',
        'malum:arcane_spirit',
        'occultism:spirit_attuned_gem',
        BTM_IRONS_T2
    ], [btmIronsSpirit('arcane', 6), btmIronsSpirit('sacred', 2)])

    btmIronsMalumInfusion(event, 'mithril_weave', 'irons_spellbooks:mithril_weave', 2, 'irons_spellbooks:magic_cloth', 1, [
        'irons_spellbooks:arcane_ingot',
        'malum:spirit_fabric',
        'forbidden_arcanus:deorum_ingot',
        BTM_IRONS_T4
    ], [btmIronsSpirit('arcane', 8), btmIronsSpirit('aerial', 4)])

    btmIronsArsApparatus(event, 'blank_rune', 'irons_spellbooks:blank_rune', 2, 'forbidden_arcanus:rune', [
        'ars_nouveau:source_gem',
        'malum:arcane_spirit',
        'occultism:otherworld_essence',
        BTM_IRONS_T2
    ], 2500)

    btmIronsArsApparatus(event, 'arcane_rune', 'irons_spellbooks:arcane_rune', 1, 'irons_spellbooks:blank_rune', [
        'ars_nouveau:source_gem',
        'malum:arcane_spirit',
        'forbidden_arcanus:arcane_crystal',
        BTM_IRONS_T3
    ], 3500)

    btmIronsMalumInfusion(event, 'upgrade_orb', 'irons_spellbooks:upgrade_orb', 1, 'irons_spellbooks:arcane_rune', 1, [
        'malum:processed_soulstone',
        'occultism:spirit_attuned_gem',
        'ars_nouveau:source_gem',
        BTM_IRONS_T3
    ], [btmIronsSpirit('arcane', 8), btmIronsSpirit('eldritch', 2)])

    btmIronsArsApparatus(event, 'scroll_forge', 'irons_spellbooks:scroll_forge', 1, 'minecraft:crying_obsidian', [
        'irons_spellbooks:arcane_ingot',
        'ars_nouveau:source_gem',
        'hexerei:blood_bottle',
        BTM_IRONS_T2
    ], 3000)

    btmIronsArsApparatus(event, 'inscription_table', 'irons_spellbooks:inscription_table', 1, 'minecraft:lectern', [
        'irons_spellbooks:arcane_ingot',
        'malum:runewood_tablet',
        'forbidden_arcanus:arcane_crystal',
        BTM_IRONS_T3
    ], 4500)

    btmIronsGoetyRitual(event, 'arcane_anvil', 'irons_spellbooks:arcane_anvil', 1, 'minecraft:anvil', [
        'goety:cursed_bars',
        'goety:magic_emerald',
        'irons_spellbooks:arcane_ingot',
        'malum:processed_soulstone',
        BTM_IRONS_T3
    ], 'forge', 300, 120)

    btmIronsHexereiCauldron(event, 'alchemist_cauldron', 'irons_spellbooks:alchemist_cauldron', 1, [
        'minecraft:cauldron',
        'hexerei:blood_bottle',
        'hexerei:mandrake_root',
        'reliquary:catalyzing_gland',
        'malum:aqueous_spirit',
        BTM_IRONS_T2
    ], 'minecraft:water', 'heated')

    btmIronsBloodAlchemy(event, 'lesser_spell_slot_upgrade', 'irons_spellbooks:lesser_spell_slot_upgrade', 1, [
        btmIronsIngredient('irons_spellbooks:arcane_rune'),
        btmIronsIngredient('irons_spellbooks:magic_cloth'),
        btmIronsIngredient('ars_nouveau:source_gem'),
        btmIronsIngredient('malum:arcane_spirit'),
        btmIronsIngredient(BTM_IRONS_T3)
    ], 12000, 220, 3)

    btmIronsBloodAlchemy(event, 'divine_pearl', 'irons_spellbooks:divine_pearl', 1, [
        btmIronsIngredient('ars_nouveau:source_gem'),
        btmIronsIngredient('reliquary:angelic_feather'),
        btmIronsIngredient('malum:sacred_spirit'),
        btmIronsIngredient(BTM_IRONS_T4)
    ], 18000, 260, 4)

    btmIronsMalumInfusion(event, 'energized_core', 'irons_spellbooks:energized_core', 1, 'forbidden_arcanus:deorum_ingot', 1, [
        'ars_nouveau:air_essence',
        'ars_nouveau:source_gem',
        'malum:aerial_spirit',
        BTM_IRONS_T4
    ], [btmIronsSpirit('aerial', 8), btmIronsSpirit('arcane', 6)])

    btmIronsGoetyRitual(event, 'eldritch_manuscript', 'irons_spellbooks:eldritch_manuscript', 1, 'minecraft:writable_book', [
        'occultism:otherworld_essence',
        'goety:dark_scroll',
        'malum:eldritch_spirit',
        'reliquary:nebulous_heart',
        BTM_IRONS_T5
    ], 'sabbath', 800, 240)

    btmIronsBloodAlchemy(event, 'shriving_stone', 'irons_spellbooks:shriving_stone', 1, [
        btmIronsIngredient('forbidden_arcanus:arcane_crystal'),
        btmIronsIngredient('malum:sacred_spirit'),
        btmIronsIngredient('occultism:spirit_attuned_gem'),
        btmIronsIngredient(BTM_IRONS_T3)
    ], 9000, 180, 3)

    btmIronsArsApparatus(event, 'copper_spell_book', 'irons_spellbooks:copper_spell_book', 1, 'minecraft:book', [
        'irons_spellbooks:magic_cloth',
        'ars_nouveau:source_gem',
        BTM_IRONS_T2
    ], 1500)
    btmIronsArsApparatus(event, 'iron_spell_book', 'irons_spellbooks:iron_spell_book', 1, 'irons_spellbooks:copper_spell_book', [
        'irons_spellbooks:arcane_ingot',
        'malum:arcane_spirit',
        BTM_IRONS_T3
    ], 3000)
    btmIronsArsApparatus(event, 'gold_spell_book', 'irons_spellbooks:gold_spell_book', 1, 'irons_spellbooks:iron_spell_book', [
        'ars_nouveau:source_gem',
        'forbidden_arcanus:arcane_crystal',
        BTM_IRONS_T3
    ], 4500)
    btmIronsArsApparatus(event, 'diamond_spell_book', 'irons_spellbooks:diamond_spell_book', 1, 'irons_spellbooks:gold_spell_book', [
        'occultism:spirit_attuned_gem',
        'irons_spellbooks:mithril_weave',
        'occultism:spirit_attuned_gem',
        BTM_IRONS_T4
    ], 7000)
    btmIronsArsApparatus(event, 'netherite_spell_book', 'irons_spellbooks:netherite_spell_book', 1, 'irons_spellbooks:diamond_spell_book', [
        'minecraft:netherite_ingot',
        'malum:eldritch_spirit',
        'forbidden_arcanus:stellarite_piece',
        BTM_IRONS_T5
    ], 11000)

    btmIronsArsApparatus(event, 'ice_spell_book', 'irons_spellbooks:ice_spell_book', 1, 'irons_spellbooks:iron_spell_book', [
        'irons_spellbooks:ice_rune',
        'ars_nouveau:water_essence',
        'malum:aqueous_spirit',
        BTM_IRONS_T3
    ], 5500)
    btmIronsHexereiCauldron(event, 'druidic_spell_book', 'irons_spellbooks:druidic_spell_book', 1, [
        'irons_spellbooks:gold_spell_book',
        'irons_spellbooks:nature_rune',
        'ars_nouveau:sourceberry_bush',
        'hexerei:mandrake_root',
        BTM_IRONS_T4
    ], 'minecraft:water', 'heated')
    btmIronsGoetyRitual(event, 'cursed_doll_spell_book', 'irons_spellbooks:cursed_doll_spell_book', 1, 'irons_spellbooks:gold_spell_book', [
        'goety:cursed_ingot',
        'hexerei:blood_bottle',
        'malum:wicked_spirit',
        BTM_IRONS_T4
    ], 'sabbath', 600, 180)
    btmIronsGoetyRitual(event, 'dragonskin_spell_book', 'irons_spellbooks:dragonskin_spell_book', 1, 'irons_spellbooks:diamond_spell_book', [
        'ars_nouveau:abjuration_essence',
        'forbidden_arcanus:dark_rune',
        'malum:infernal_spirit',
        'reliquary:infernal_tear',
        BTM_IRONS_T5
    ], 'forge', 900, 260)

    btmIronsRuneRecipes(event)

    btmIronsMalumInfusion(event, 'mana_upgrade_orb', 'irons_spellbooks:mana_upgrade_orb', 1, 'irons_spellbooks:upgrade_orb', 1, [
        'ars_nouveau:source_gem',
        'ars_nouveau:manipulation_essence',
        'malum:arcane_spirit',
        BTM_IRONS_T4
    ], [btmIronsSpirit('arcane', 8), btmIronsSpirit('aerial', 4)])

    btmIronsBloodAlchemy(event, 'affinity_ring', 'irons_spellbooks:affinity_ring', 1, [btmIronsIngredient('irons_spellbooks:arcane_rune'), btmIronsIngredient('malum:arcane_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'cast_time_ring', 'irons_spellbooks:cast_time_ring', 1, [btmIronsIngredient('ars_nouveau:air_essence'), btmIronsIngredient('malum:aerial_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'cooldown_ring', 'irons_spellbooks:cooldown_ring', 1, [btmIronsIngredient('irons_spellbooks:cooldown_rune'), btmIronsIngredient('ars_nouveau:source_gem'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'emerald_stoneplate_ring', 'irons_spellbooks:emerald_stoneplate_ring', 1, [btmIronsIngredient('goety:magic_emerald'), btmIronsIngredient('malum:earthen_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'fireward_ring', 'irons_spellbooks:fireward_ring', 1, [btmIronsIngredient('irons_spellbooks:fire_rune'), btmIronsIngredient('reliquary:infernal_tear'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'frostward_ring', 'irons_spellbooks:frostward_ring', 1, [btmIronsIngredient('irons_spellbooks:ice_rune'), btmIronsIngredient('malum:aqueous_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'mana_ring', 'irons_spellbooks:mana_ring', 1, [btmIronsIngredient('ars_nouveau:source_gem'), btmIronsIngredient('malum:arcane_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'poisonward_ring', 'irons_spellbooks:poisonward_ring', 1, [btmIronsIngredient('hexerei:belladonna_berries'), btmIronsIngredient('malum:earthen_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)
    btmIronsBloodAlchemy(event, 'visibility_ring', 'irons_spellbooks:visibility_ring', 1, [btmIronsIngredient('occultism:otherworld_essence'), btmIronsIngredient('malum:aerial_spirit'), btmIronsIngredient('minecraft:gold_ingot'), btmIronsIngredient(BTM_IRONS_T3)], 7000, 160, 3)

    btmIronsArsApparatus(event, 'amethyst_resonance_charm', 'irons_spellbooks:amethyst_resonance_charm', 1, 'minecraft:amethyst_shard', ['malum:arcane_spirit', 'ars_nouveau:source_gem', BTM_IRONS_T2], 2500)
    btmIronsArsApparatus(event, 'concentration_amulet', 'irons_spellbooks:concentration_amulet', 1, 'irons_spellbooks:arcane_rune', ['occultism:spirit_attuned_gem', 'malum:arcane_spirit', BTM_IRONS_T3], 4000)
    btmIronsArsApparatus(event, 'conjurers_talisman', 'irons_spellbooks:conjurers_talisman', 1, 'irons_spellbooks:evocation_rune', ['goety:magic_emerald', 'malum:wicked_spirit', BTM_IRONS_T3], 5000)
    btmIronsArsApparatus(event, 'greater_conjurers_talisman', 'irons_spellbooks:greater_conjurers_talisman', 1, 'irons_spellbooks:conjurers_talisman', ['goety:soul_emerald', 'malum:eldritch_spirit', BTM_IRONS_T4], 8000)
    btmIronsBloodAlchemy(event, 'heavy_chain_necklace', 'irons_spellbooks:heavy_chain_necklace', 1, [btmIronsIngredient('goety:cursed_bars'), btmIronsIngredient('malum:processed_soulstone'), btmIronsIngredient(BTM_IRONS_T3)], 8000, 180, 3)

    btmIronsGoetyRitual(event, 'ice_staff', 'irons_spellbooks:ice_staff', 1, 'minecraft:stick', ['irons_spellbooks:ice_rune', 'ars_nouveau:water_essence', 'malum:aqueous_spirit', BTM_IRONS_T3], 'frost', 250, 100)
    btmIronsGoetyRitual(event, 'graybeard_staff', 'irons_spellbooks:graybeard_staff', 1, 'irons_spellbooks:ice_staff', ['irons_spellbooks:mithril_weave', 'malum:aerial_spirit', 'occultism:spirit_attuned_gem', BTM_IRONS_T4], 'frost', 500, 160)
    btmIronsGoetyRitual(event, 'pyrium_staff', 'irons_spellbooks:pyrium_staff', 1, 'minecraft:blaze_rod', ['irons_spellbooks:fire_rune', 'reliquary:infernal_tear', 'malum:infernal_spirit', BTM_IRONS_T4], 'forge', 500, 160)
    btmIronsGoetyRitual(event, 'artificer_cane', 'irons_spellbooks:artificer_cane', 1, 'minecraft:stick', ['irons_spellbooks:arcane_ingot', 'forbidden_arcanus:deorum_ingot', 'malum:arcane_spirit', BTM_IRONS_T4], 'forge', 500, 160)
    btmIronsGoetyRitual(event, 'spellbreaker', 'irons_spellbooks:spellbreaker', 1, 'minecraft:shield', ['irons_spellbooks:protection_rune', 'malum:sacred_spirit', 'forbidden_arcanus:dark_rune', BTM_IRONS_T4], 'sabbath', 650, 200)
    btmIronsGoetyRitual(event, 'twilight_gale', 'irons_spellbooks:twilight_gale', 1, 'minecraft:crossbow', ['irons_spellbooks:ender_rune', 'malum:aerial_spirit', 'occultism:otherworld_essence', BTM_IRONS_T4], 'sabbath', 650, 200)
})
