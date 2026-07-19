// Iron's is the fixed-spell formal system. Its authoring stations are early shells;
// the shared ink ladder sets depth and school-focus tags set magical breadth.

var BC_IRONS_FORMAL_MAGIC = JsonIO.read('kubejs/config/formal_magic_domains.json') || { ink_tiers: [] }

var BC_IRONS_T1 = 'bloodmagic:blankslate'
var BC_IRONS_T2 = 'bloodmagic:reinforcedslate'
var BC_IRONS_T3 = 'bloodmagic:infusedslate'
var BC_IRONS_T4 = 'bloodmagic:demonslate'
var BC_IRONS_T5 = 'bloodmagic:etherealslate'
var BC_IRONS_OS_T1 = 'deeperdarker:cobbled_sculk_stone'
var BC_IRONS_OS_T2 = 'deeperdarker:gloomslate'
var BC_IRONS_OS_T3 = 'minecraft:sculk_catalyst'
var BC_IRONS_OS_T4 = 'deeperdarker:sculk_bone'
var BC_IRONS_OS_T5 = 'deeperdarker:resonarium'

function bcIronsExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcIronsIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function bcIronsIngredientExists(input) {
    if (!input) return false
    if (typeof input === 'string') return input.charAt(0) === '#' ||  bcIronsExists(input)
    if (input.item) return bcIronsExists(input.item)
    return !!input.tag || !!input.fluid
}

function bcIronsCanMake(output, inputs) {
    if (!bcIronsExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!bcIronsIngredientExists(inputs[i])) return false
    }
    return true
}

function bcIronsResult(output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

function bcIronsCountIngredient(input, count) {
    var ingredient = bcIronsIngredient(input)
    if (!ingredient.count) ingredient.count = count || 1
    return ingredient
}

function bcIronsRemoveOutput(event, output) {
    if (bcIronsExists(output)) event.remove({ output: output })
}

function bcIronsRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++)  bcIronsRemoveOutput(event, outputs[i])
}

function bcIronsBloodAlchemy(event, id, output, count, inputs, syphon, ticks, tier) {
    if (!bcIronsCanMake(output, inputs)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(bcIronsIngredient),
        output: bcIronsResult(output, count),
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:irons_cross_magic/blood_alchemy/' + id)
}

function bcIronsArsApparatus(event, id, output, count, reagent, pedestalItems, sourceCost) {
    var inputs = [reagent].concat(pedestalItems)
    if (!bcIronsCanMake(output, inputs)) return
    event.custom({
        type: 'ars_nouveau:enchanting_apparatus',
        keepNbtOfReagent: false,
        output: bcIronsResult(output, count),
        pedestalItems: pedestalItems.map(bcIronsIngredient),
        reagent: [bcIronsIngredient(reagent)],
        sourceCost: sourceCost
    }).id('kubejs:irons_cross_magic/ars_apparatus/' + id)
}

function bcIronsHexereiCauldron(event, id, output, count, ingredients, fluid, heat) {
    if (!bcIronsCanMake(output, ingredients)) return
    event.custom({
        type: 'hexerei:mixingcauldron',
        liquid: { fluid: fluid || 'minecraft:water' },
        ingredients: ingredients.map(bcIronsIngredient),
        output: bcIronsResult(output, count),
        liquidOutput: { fluid: fluid || 'minecraft:water' },
        fluidLevelsConsumed: 333,
        heatRequirement: heat || 'heated'
    }).id('kubejs:irons_cross_magic/hexerei_cauldron/' + id)
}

function bcIronsMalumInfusion(event, id, output, count, input, inputCount, extras, spirits) {
    var inputs = [input].concat(extras)
    if (!bcIronsCanMake(output, inputs)) return
    event.custom({
        type: 'malum:spirit_infusion',
        input: bcIronsCountIngredient(input, inputCount || 1),
        extra_items: extras.map(function (extra) { return bcIronsCountIngredient(extra, 1) }),
        spirits: spirits,
        output: bcIronsResult(output, count)
    }).id('kubejs:irons_cross_magic/malum_spirit_infusion/' + id)
}

function bcIronsGoetyRitual(event, id, output, count, activationItem, ingredients, craftType, soulCost, duration) {
    var inputs = [activationItem].concat(ingredients)
    if (!bcIronsCanMake(output, inputs)) return
    event.custom({
        type: 'goety:ritual',
        ritual_type: 'goety:craft',
        activation_item: bcIronsIngredient(activationItem),
        craftType: craftType || 'sabbath',
        soulCost: soulCost || 100,
        duration: duration || 60,
        ingredients: ingredients.map(bcIronsIngredient),
        result: bcIronsResult(output, count)
    }).id('kubejs:irons_cross_magic/goety_ritual/' + id)
}

var BC_IRONS_SPELLCRAFT_OUTPUTS = [
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

var BC_IRONS_RUNES = [
    { id: 'blood', output: 'irons_spellbooks:blood_rune', focus: 'hexerei:blood_bottle', reagent: 'bloodmagic:blankslate', spirit: 'wicked' },
    { id: 'cooldown', output: 'irons_spellbooks:cooldown_rune', focus: 'forbidden_arcanus:arcane_crystal', reagent: 'ars_nouveau:source_gem', spirit: 'arcane' },
    { id: 'ender', output: 'irons_spellbooks:ender_rune', focus: 'occultism:otherworld_essence', reagent: 'minecraft:ender_pearl', spirit: 'eldritch' },
    { id: 'evocation', output: 'irons_spellbooks:evocation_rune', focus: 'goety:magic_emerald', reagent: 'goety:cursed_bars', spirit: 'wicked' },
    { id: 'fire', output: 'irons_spellbooks:fire_rune', focus: 'minecraft:blaze_powder', reagent: 'minecraft:magma_cream', spirit: 'infernal' },
    { id: 'holy', output: 'irons_spellbooks:holy_rune', focus: 'minecraft:ghast_tear', reagent: 'bloodmagic:infusedslate', spirit: 'sacred' },
    { id: 'ice', output: 'irons_spellbooks:ice_rune', focus: 'minecraft:packed_ice', reagent: 'ars_nouveau:water_essence', spirit: 'aqueous' },
    { id: 'lightning', output: 'irons_spellbooks:lightning_rune', focus: 'forbidden_arcanus:deorum_ingot', reagent: 'powergrid:redstone_relay', spirit: 'aerial' },
    { id: 'nature', output: 'irons_spellbooks:nature_rune', focus: 'hexerei:mandrake_root', reagent: 'ars_nouveau:sourceberry_bush', spirit: 'earthen' },
    { id: 'protection', output: 'irons_spellbooks:protection_rune', focus: 'malum:processed_soulstone', reagent: 'minecraft:shield', spirit: 'sacred' }
]

function bcIronsSpirit(type, count) {
    return { type: type, count: count }
}

function bcIronsRuneRecipes(event) {
    for (var i = 0; i < BC_IRONS_RUNES.length; i++) {
        var rune = BC_IRONS_RUNES[i]
         bcIronsMalumInfusion(event, rune.id + '_rune', rune.output, 1, 'irons_spellbooks:blank_rune', 1, [
            rune.focus,
            rune.reagent,
            BC_IRONS_OS_T3,
            BC_IRONS_T3
        ], [bcIronsSpirit(rune.spirit, 6), bcIronsSpirit('arcane', 2)
        ])
         bcIronsArsApparatus(event, rune.id + '_upgrade_orb', 'irons_spellbooks:' + rune.id + '_upgrade_orb', 1, 'irons_spellbooks:upgrade_orb', [
            'irons_spellbooks:blank_rune',
            rune.focus,
            rune.reagent,
            BC_IRONS_OS_T3,
            BC_IRONS_T3
        ], 4500)
    }
}

ServerEvents.recipes(function (event) {
     bcIronsRemoveOutputs(event, BC_IRONS_SPELLCRAFT_OUTPUTS)
    for (var i = 0; i < BC_IRONS_RUNES.length; i++) {
         bcIronsRemoveOutput(event, BC_IRONS_RUNES[i].output)
         bcIronsRemoveOutput(event, 'irons_spellbooks:' + BC_IRONS_RUNES[i].id + '_upgrade_orb')
    }

    var inkTiers = BC_IRONS_FORMAL_MAGIC.ink_tiers || []
    for (var inkIndex = 0; inkIndex < inkTiers.length; inkIndex++) {
        var inkTier = inkTiers[inkIndex]
        event.remove({ id: 'irons_spellbooks:alchemist_cauldron/brew_' + inkTier.id + '_ink' })
        event.custom({
            type: 'irons_spellbooks:alchemist_cauldron_brew',
            base_fluid: {
                Amount: 1000,
                FluidName: inkIndex === 0 ? 'minecraft:water' : inkTiers[inkIndex - 1].item
            },
            input: { tag: inkTier.proof_tag },
            results: [{ Amount: 250, FluidName: inkTier.item }]
        }).id('kubejs:formal_magic/irons/ink/' + inkTier.id)
    }

     bcIronsHexereiCauldron(event, 'magic_cloth', 'irons_spellbooks:magic_cloth', 4, [
        'hexerei:wax_blend',
        'hexerei:tallow_bottle',
        'malum:spirit_fabric',
        'malum:arcane_spirit',
        BC_IRONS_OS_T1,
        BC_IRONS_T1,
        'minecraft:white_wool',
        'minecraft:string'
    ], 'minecraft:water', 'heated')

     bcIronsMalumInfusion(event, 'arcane_ingot', 'irons_spellbooks:arcane_ingot', 1, 'forbidden_arcanus:arcane_crystal', 1, [
        'malum:hallowed_gold_ingot',
        'malum:arcane_spirit',
        'occultism:spirit_attuned_gem',
        BC_IRONS_OS_T2,
        BC_IRONS_T2
    ], [bcIronsSpirit('arcane', 6), bcIronsSpirit('sacred', 2)])

     bcIronsMalumInfusion(event, 'mithril_weave', 'irons_spellbooks:mithril_weave', 2, 'irons_spellbooks:magic_cloth', 1, [
        'irons_spellbooks:arcane_ingot',
        'malum:spirit_fabric',
        'forbidden_arcanus:deorum_ingot',
        BC_IRONS_OS_T4,
        BC_IRONS_T4
    ], [bcIronsSpirit('arcane', 8), bcIronsSpirit('aerial', 4)])

     bcIronsArsApparatus(event, 'blank_rune', 'irons_spellbooks:blank_rune', 2, 'forbidden_arcanus:rune', [
        'ars_nouveau:source_gem',
        'malum:arcane_spirit',
        'occultism:otherworld_essence',
        BC_IRONS_OS_T2,
        BC_IRONS_T2
    ], 2500)

     bcIronsArsApparatus(event, 'arcane_rune', 'irons_spellbooks:arcane_rune', 1, 'irons_spellbooks:blank_rune', [
        'ars_nouveau:source_gem',
        'malum:arcane_spirit',
        'forbidden_arcanus:arcane_crystal',
        BC_IRONS_OS_T3,
        BC_IRONS_T3
    ], 3500)

     bcIronsMalumInfusion(event, 'upgrade_orb', 'irons_spellbooks:upgrade_orb', 1, 'irons_spellbooks:arcane_rune', 1, [
        'malum:processed_soulstone',
        'occultism:spirit_attuned_gem',
        'ars_nouveau:source_gem',
        BC_IRONS_OS_T3,
        BC_IRONS_T3
    ], [bcIronsSpirit('arcane', 8), bcIronsSpirit('eldritch', 2)])

    event.shaped('irons_spellbooks:scroll_forge', [
        'DDD',
        'COC',
        'OOO'
    ], {
        D: 'minecraft:polished_deepslate',
        C: 'create:copper_sheet',
        O: 'minecraft:crying_obsidian'
    }).id('kubejs:formal_magic/irons/scroll_forge')

    event.shaped('irons_spellbooks:inscription_table', [
        'PBP',
        'CLC',
        'W W'
    ], {
        P: 'minecraft:paper',
        B: 'minecraft:bookshelf',
        C: 'create:copper_sheet',
        L: 'minecraft:lectern',
        W: '#minecraft:planks'
    }).id('kubejs:formal_magic/irons/inscription_table')

    event.shaped('irons_spellbooks:arcane_anvil', [
        'CAC',
        ' O ',
        'O O'
    ], {
        C: 'create:copper_sheet',
        A: 'minecraft:anvil',
        O: 'minecraft:crying_obsidian'
    }).id('kubejs:formal_magic/irons/arcane_anvil')

    event.shaped('irons_spellbooks:alchemist_cauldron', [
        'C C',
        'CBC',
        ' C '
    ], {
        C: 'create:copper_sheet',
        B: 'minecraft:cauldron'
    }).id('kubejs:formal_magic/irons/alchemist_cauldron')

     bcIronsBloodAlchemy(event, 'lesser_spell_slot_upgrade', 'irons_spellbooks:lesser_spell_slot_upgrade', 1, [bcIronsIngredient('irons_spellbooks:arcane_rune'), bcIronsIngredient('irons_spellbooks:magic_cloth'), bcIronsIngredient('ars_nouveau:source_gem'), bcIronsIngredient('malum:arcane_spirit'), bcIronsIngredient(BC_IRONS_OS_T3), bcIronsIngredient(BC_IRONS_T3)
    ], 12000, 220, 3)

     bcIronsBloodAlchemy(event, 'divine_pearl', 'irons_spellbooks:divine_pearl', 1, [bcIronsIngredient('ars_nouveau:source_gem'), bcIronsIngredient('minecraft:ghast_tear'), bcIronsIngredient('malum:sacred_spirit'), bcIronsIngredient(BC_IRONS_OS_T4), bcIronsIngredient(BC_IRONS_T4)
    ], 18000, 260, 4)

     bcIronsMalumInfusion(event, 'energized_core', 'irons_spellbooks:energized_core', 1, 'forbidden_arcanus:deorum_ingot', 1, [
        'ars_nouveau:air_essence',
        'ars_nouveau:source_gem',
        'malum:aerial_spirit',
        BC_IRONS_OS_T4,
        BC_IRONS_T4
    ], [bcIronsSpirit('aerial', 8), bcIronsSpirit('arcane', 6)])

     bcIronsGoetyRitual(event, 'eldritch_manuscript', 'irons_spellbooks:eldritch_manuscript', 1, 'minecraft:writable_book', [
        'occultism:otherworld_essence',
        'goety:dark_scroll',
        'malum:eldritch_spirit',
        'minecraft:echo_shard',
        BC_IRONS_OS_T5,
        BC_IRONS_T5
    ], 'sabbath', 800, 240)

     bcIronsBloodAlchemy(event, 'shriving_stone', 'irons_spellbooks:shriving_stone', 1, [bcIronsIngredient('forbidden_arcanus:arcane_crystal'), bcIronsIngredient('malum:sacred_spirit'), bcIronsIngredient('occultism:spirit_attuned_gem'), bcIronsIngredient(BC_IRONS_OS_T3), bcIronsIngredient(BC_IRONS_T3)
    ], 9000, 180, 3)

    event.shapeless('irons_spellbooks:copper_spell_book', [
        'minecraft:book', 'create:copper_sheet', 'minecraft:string'
    ]).id('kubejs:formal_magic/irons/book/copper')
    event.shapeless('irons_spellbooks:iron_spell_book', [
        'irons_spellbooks:copper_spell_book', 'irons_spellbooks:common_ink', 'minecraft:iron_ingot'
    ]).id('kubejs:formal_magic/irons/book/iron')
    event.shapeless('irons_spellbooks:gold_spell_book', [
        'irons_spellbooks:iron_spell_book', 'irons_spellbooks:uncommon_ink', 'minecraft:gold_ingot'
    ]).id('kubejs:formal_magic/irons/book/gold')
    event.shapeless('irons_spellbooks:diamond_spell_book', [
        'irons_spellbooks:gold_spell_book', 'irons_spellbooks:rare_ink', 'minecraft:diamond'
    ]).id('kubejs:formal_magic/irons/book/diamond')
    event.shapeless('irons_spellbooks:netherite_spell_book', [
        'irons_spellbooks:diamond_spell_book', 'irons_spellbooks:legendary_ink', 'minecraft:netherite_ingot'
    ]).id('kubejs:formal_magic/irons/book/netherite')

     bcIronsArsApparatus(event, 'ice_spell_book', 'irons_spellbooks:ice_spell_book', 1, 'irons_spellbooks:iron_spell_book', [
        'irons_spellbooks:ice_rune',
        'ars_nouveau:water_essence',
        'malum:aqueous_spirit',
        BC_IRONS_T3
    ], 5500)
     bcIronsHexereiCauldron(event, 'druidic_spell_book', 'irons_spellbooks:druidic_spell_book', 1, [
        'irons_spellbooks:gold_spell_book',
        'irons_spellbooks:nature_rune',
        'ars_nouveau:sourceberry_bush',
        'hexerei:mandrake_root',
        BC_IRONS_T4
    ], 'minecraft:water', 'heated')
     bcIronsGoetyRitual(event, 'cursed_doll_spell_book', 'irons_spellbooks:cursed_doll_spell_book', 1, 'irons_spellbooks:gold_spell_book', [
        'goety:cursed_ingot',
        'hexerei:blood_bottle',
        'malum:wicked_spirit',
        BC_IRONS_T4
    ], 'sabbath', 600, 180)
     bcIronsGoetyRitual(event, 'dragonskin_spell_book', 'irons_spellbooks:dragonskin_spell_book', 1, 'irons_spellbooks:diamond_spell_book', [
        'ars_nouveau:abjuration_essence',
        'forbidden_arcanus:dark_rune',
        'malum:infernal_spirit',
        'minecraft:blaze_powder',
        BC_IRONS_T5
    ], 'forge', 900, 260)

     bcIronsRuneRecipes(event)

     bcIronsMalumInfusion(event, 'mana_upgrade_orb', 'irons_spellbooks:mana_upgrade_orb', 1, 'irons_spellbooks:upgrade_orb', 1, [
        'ars_nouveau:source_gem',
        'ars_nouveau:manipulation_essence',
        'malum:arcane_spirit',
        BC_IRONS_T4
    ], [bcIronsSpirit('arcane', 8), bcIronsSpirit('aerial', 4)])

     bcIronsBloodAlchemy(event, 'affinity_ring', 'irons_spellbooks:affinity_ring', 1, [bcIronsIngredient('irons_spellbooks:arcane_rune'), bcIronsIngredient('malum:arcane_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'cast_time_ring', 'irons_spellbooks:cast_time_ring', 1, [bcIronsIngredient('ars_nouveau:air_essence'), bcIronsIngredient('malum:aerial_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'cooldown_ring', 'irons_spellbooks:cooldown_ring', 1, [bcIronsIngredient('irons_spellbooks:cooldown_rune'), bcIronsIngredient('ars_nouveau:source_gem'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'emerald_stoneplate_ring', 'irons_spellbooks:emerald_stoneplate_ring', 1, [bcIronsIngredient('goety:magic_emerald'), bcIronsIngredient('malum:earthen_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'fireward_ring', 'irons_spellbooks:fireward_ring', 1, [bcIronsIngredient('irons_spellbooks:fire_rune'), bcIronsIngredient('minecraft:magma_cream'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'frostward_ring', 'irons_spellbooks:frostward_ring', 1, [bcIronsIngredient('irons_spellbooks:ice_rune'), bcIronsIngredient('malum:aqueous_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'mana_ring', 'irons_spellbooks:mana_ring', 1, [bcIronsIngredient('ars_nouveau:source_gem'), bcIronsIngredient('malum:arcane_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'poisonward_ring', 'irons_spellbooks:poisonward_ring', 1, [bcIronsIngredient('hexerei:belladonna_berries'), bcIronsIngredient('malum:earthen_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)
     bcIronsBloodAlchemy(event, 'visibility_ring', 'irons_spellbooks:visibility_ring', 1, [bcIronsIngredient('occultism:otherworld_essence'), bcIronsIngredient('malum:aerial_spirit'), bcIronsIngredient('minecraft:gold_ingot'), bcIronsIngredient(BC_IRONS_T3)], 7000, 160, 3)

     bcIronsArsApparatus(event, 'amethyst_resonance_charm', 'irons_spellbooks:amethyst_resonance_charm', 1, 'minecraft:amethyst_shard', ['malum:arcane_spirit', 'ars_nouveau:source_gem', BC_IRONS_T2], 2500)
     bcIronsArsApparatus(event, 'concentration_amulet', 'irons_spellbooks:concentration_amulet', 1, 'irons_spellbooks:arcane_rune', ['occultism:spirit_attuned_gem', 'malum:arcane_spirit', BC_IRONS_T3], 4000)
     bcIronsArsApparatus(event, 'conjurers_talisman', 'irons_spellbooks:conjurers_talisman', 1, 'irons_spellbooks:evocation_rune', ['goety:magic_emerald', 'malum:wicked_spirit', BC_IRONS_T3], 5000)
     bcIronsArsApparatus(event, 'greater_conjurers_talisman', 'irons_spellbooks:greater_conjurers_talisman', 1, 'irons_spellbooks:conjurers_talisman', ['goety:soul_emerald', 'malum:eldritch_spirit', BC_IRONS_T4], 8000)
     bcIronsBloodAlchemy(event, 'heavy_chain_necklace', 'irons_spellbooks:heavy_chain_necklace', 1, [bcIronsIngredient('goety:cursed_bars'), bcIronsIngredient('malum:processed_soulstone'), bcIronsIngredient(BC_IRONS_T3)], 8000, 180, 3)

     bcIronsGoetyRitual(event, 'ice_staff', 'irons_spellbooks:ice_staff', 1, 'minecraft:stick', ['irons_spellbooks:ice_rune', 'ars_nouveau:water_essence', 'malum:aqueous_spirit', BC_IRONS_T3], 'frost', 250, 100)
     bcIronsGoetyRitual(event, 'graybeard_staff', 'irons_spellbooks:graybeard_staff', 1, 'irons_spellbooks:ice_staff', ['irons_spellbooks:mithril_weave', 'malum:aerial_spirit', 'occultism:spirit_attuned_gem', BC_IRONS_T4], 'frost', 500, 160)
     bcIronsGoetyRitual(event, 'pyrium_staff', 'irons_spellbooks:pyrium_staff', 1, 'minecraft:blaze_rod', ['irons_spellbooks:fire_rune', 'minecraft:magma_cream', 'malum:infernal_spirit', BC_IRONS_T4], 'forge', 500, 160)
     bcIronsGoetyRitual(event, 'artificer_cane', 'irons_spellbooks:artificer_cane', 1, 'minecraft:stick', ['irons_spellbooks:arcane_ingot', 'forbidden_arcanus:deorum_ingot', 'malum:arcane_spirit', BC_IRONS_T4], 'forge', 500, 160)
     bcIronsGoetyRitual(event, 'spellbreaker', 'irons_spellbooks:spellbreaker', 1, 'minecraft:shield', ['irons_spellbooks:protection_rune', 'malum:sacred_spirit', 'forbidden_arcanus:dark_rune', BC_IRONS_T4], 'sabbath', 650, 200)
     bcIronsGoetyRitual(event, 'twilight_gale', 'irons_spellbooks:twilight_gale', 1, 'minecraft:crossbow', ['irons_spellbooks:ender_rune', 'malum:aerial_spirit', 'occultism:otherworld_essence', BC_IRONS_T4], 'sabbath', 650, 200)
})
