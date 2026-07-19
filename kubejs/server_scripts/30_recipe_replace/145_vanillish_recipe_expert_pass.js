// Late pass for easy vanilla-style crafting and furnace shortcuts.
// Ordinary engineering moves to Create machines. Anything with a magic/alchemy
// identity moves to Blood Magic's alchemy table and consumes the relevant slate.

var BC_VANILLISH = {
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    airtight: 'kubejs:airtight_machine_casing',
    blank: 'bloodmagic:blankslate',
    reinforced: 'bloodmagic:reinforcedslate',
    infused: 'bloodmagic:infusedslate',
    demonic: 'bloodmagic:demonslate',
    ethereal: 'bloodmagic:etherealslate',
    ironPlate: '#forge:plates/iron',
    copperPlate: '#forge:plates/copper',
    goldPlate: '#forge:plates/gold',
    brassPlate: '#forge:plates/brass',
    redWire: 'morered:red_alloy_wire',
    diode: 'morered:diode',
    andesiteAlloy: 'create:andesite_alloy'
}

function bcVanItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcVanIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function bcVanIngredientExists(input) {
    if (!input) return false
    if (typeof input === 'string') return input.charAt(0) === '#' ||  bcVanItemExists(input)
    if (input.item) return bcVanItemExists(input.item)
    return !!input.tag || !!input.fluid
}

function bcVanCanCraft(output, inputs) {
    if (!bcVanItemExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!bcVanIngredientExists(inputs[i])) return false
    }
    return true
}

function bcVanResult(output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

function bcVanKey(keys) {
    var out = {}
    for (var key in keys) out[key] = bcVanIngredient(keys[key])
    return out
}

function bcVanKeyInputs(keys) {
    var out = []
    for (var key in keys) out.push(keys[key])
    return out
}

function bcVanRemoveOutput(event, output) {
    if (bcVanItemExists(output)) event.remove({ output: output })
}

function bcVanRemoveCooking(event, output) {
    if (!bcVanItemExists(output)) return
    event.remove({ type: 'minecraft:smelting', output: output })
    event.remove({ type: 'minecraft:blasting', output: output })
}

function bcVanMechanical(event, id, output, count, pattern, keys) {
    if (!bcVanCanCraft(output, bcVanKeyInputs(keys))) return bcVanRemoveOutput(event, output)
    global.bcFactoryCrafting(event, 'kubejs:vanillish_expert/factory/' + id, output, count || 1, pattern, keys, { mirrored: true })
}

function bcVanDeploying(event, id, output, count, base, applied) {
    if (!bcVanCanCraft(output, [base, applied])) return
    event.remove({ output: output })
    event.custom({
        type: 'create:deploying',
        ingredients: [bcVanIngredient(base), bcVanIngredient(applied)],
        results: [bcVanResult(output, count)]
    }).id('kubejs:vanillish_expert/create_deploying/' + id)
}

function bcVanCompacting(event, id, output, count, ingredients, heat) {
    if (!bcVanCanCraft(output, ingredients)) return
    var recipe = {
        type: 'create:compacting',
        ingredients: ingredients.map(bcVanIngredient),
        results: [bcVanResult(output, count)],
        processingTime: 160
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:vanillish_expert/create_compacting/' + id)
}

function bcVanAlchemy(event, id, output, count, inputs, syphon, ticks, upgradeLevel) {
    if (!bcVanCanCraft(output, inputs)) return
    event.remove({ output: output })
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(bcVanIngredient),
        output: bcVanResult(output, count),
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: upgradeLevel
    }).id('kubejs:vanillish_expert/blood_alchemy/' + id)
}

function bcVanDustIngot(event, material) {
    var output = 'chemlib:' + material + '_ingot'
    var dust = 'chemlib:' + material + '_dust'
     bcVanRemoveCooking(event, output)
     bcVanCompacting(event, 'chemlib/' + material + '_ingot_from_dust', output, 1, [dust], 'heated')
}

ServerEvents.recipes(function (event) {
    // Vanilla redstone and transport automation should show up as assembled machinery,
    // not as hand-stacked cobble, planks, and dust.
     bcVanMechanical(event, 'minecraft/piston', 'minecraft:piston', 1, [
        'WWW',
        'SAS',
        'PRP'
    ], {
        W: '#minecraft:planks',
        S: '#forge:stone',
        A: BC_VANILLISH.andesite,
        P: BC_VANILLISH.ironPlate,
        R: BC_VANILLISH.redWire
    })
     bcVanDeploying(event, 'minecraft/sticky_piston', 'minecraft:sticky_piston', 1, 'minecraft:piston', 'minecraft:slime_ball')

     bcVanMechanical(event, 'minecraft/hopper', 'minecraft:hopper', 1, [
        'P P',
        'PCH',
        'APA'
    ], {
        P: BC_VANILLISH.ironPlate,
        C: '#forge:chests/wooden',
        H: 'create:chute',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/dropper', 'minecraft:dropper', 1, [
        'CCC',
        'CRC',
        'CAC'
    ], {
        C: '#forge:cobblestone',
        R: BC_VANILLISH.redWire,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/dispenser', 'minecraft:dispenser', 1, [
        'CCC',
        'BRC',
        'CAC'
    ], {
        C: '#forge:cobblestone',
        B: 'minecraft:bow',
        R: BC_VANILLISH.redWire,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/observer', 'minecraft:observer', 1, [
        'SSS',
        'QDQ',
        'SAS'
    ], {
        S: '#forge:stone',
        Q: '#forge:gems/quartz',
        D: BC_VANILLISH.diode,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/repeater', 'minecraft:repeater', 1, [
        'TDT',
        'SWS',
        ' A '
    ], {
        T: 'minecraft:redstone_torch',
        D: BC_VANILLISH.diode,
        S: '#forge:stone',
        W: BC_VANILLISH.redWire,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/comparator', 'minecraft:comparator', 1, [
        'TQT',
        'SDS',
        ' A '
    ], {
        T: 'minecraft:redstone_torch',
        Q: '#forge:gems/quartz',
        S: '#forge:stone',
        D: BC_VANILLISH.diode,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/daylight_detector', 'minecraft:daylight_detector', 1, [
        'GGG',
        'QQQ',
        'DAD'
    ], {
        G: '#forge:glass/colorless',
        Q: '#forge:gems/quartz',
        D: BC_VANILLISH.diode,
        A: BC_VANILLISH.andesite
    })

     bcVanMechanical(event, 'minecraft/rail', 'minecraft:rail', 16, [
        'P P',
        'PSP',
        'PAP'
    ], {
        P: BC_VANILLISH.ironPlate,
        S: '#forge:rods/wooden',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/powered_rail', 'minecraft:powered_rail', 8, [
        'G G',
        'GSG',
        'GAG'
    ], {
        G: BC_VANILLISH.goldPlate,
        S: BC_VANILLISH.redWire,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/detector_rail', 'minecraft:detector_rail', 8, [
        'PDP',
        'PSP',
        'PAP'
    ], {
        P: BC_VANILLISH.ironPlate,
        D: BC_VANILLISH.diode,
        S: '#forge:rods/wooden',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/activator_rail', 'minecraft:activator_rail', 8, [
        'PRP',
        'PSP',
        'PAP'
    ], {
        P: BC_VANILLISH.ironPlate,
        R: BC_VANILLISH.redWire,
        S: '#forge:rods/wooden',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'minecraft/minecart', 'minecraft:minecart', 1, [
        'P P',
        'PAP',
        '   '
    ], {
        P: BC_VANILLISH.ironPlate,
        A: BC_VANILLISH.andesite
    })
     bcVanDeploying(event, 'minecraft/chest_minecart', 'minecraft:chest_minecart', 1, 'minecraft:minecart', '#forge:chests/wooden')
     bcVanDeploying(event, 'minecraft/furnace_minecart', 'minecraft:furnace_minecart', 1, 'minecraft:minecart', 'minecraft:furnace')
     bcVanDeploying(event, 'minecraft/hopper_minecart', 'minecraft:hopper_minecart', 1, 'minecraft:minecart', 'minecraft:hopper')
     bcVanDeploying(event, 'minecraft/tnt_minecart', 'minecraft:tnt_minecart', 1, 'minecraft:minecart', 'minecraft:tnt')

    // Modded vanillish engineering that looked like the same hand-stacked pattern.
     bcVanMechanical(event, 'everythingcopper/copper_hopper', 'everythingcopper:copper_hopper', 1, [
        'P P',
        'PCH',
        'APA'
    ], {
        P: BC_VANILLISH.copperPlate,
        C: '#forge:chests/wooden',
        H: 'create:chute',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'everythingcopper/copper_minecart', 'everythingcopper:copper_minecart', 1, [
        'P P',
        'PAP',
        '   '
    ], {
        P: BC_VANILLISH.copperPlate,
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'everythingcopper/copper_rail', 'everythingcopper:copper_rail', 16, [
        'P P',
        'PSP',
        'PAP'
    ], {
        P: BC_VANILLISH.copperPlate,
        S: '#forge:rods/wooden',
        A: BC_VANILLISH.andesite
    })
     bcVanMechanical(event, 'everythingcopper/copper_anvil', 'everythingcopper:copper_anvil', 1, [
        'BBB',
        ' A ',
        'PPP'
    ], {
        B: '#forge:storage_blocks/copper',
        A: BC_VANILLISH.andesite,
        P: BC_VANILLISH.copperPlate
    })

    // Furnace-style metals become heated Create compaction. Deposit furnace fallbacks
    // still output poor nuggets and are intentionally not matched here.
     bcVanRemoveCooking(event, 'minecraft:iron_ingot')
     bcVanRemoveCooking(event, 'minecraft:copper_ingot')
     bcVanRemoveCooking(event, 'minecraft:gold_ingot')
     bcVanCompacting(event, 'crushed_raw/iron_ingot', 'minecraft:iron_ingot', 1, ['create:crushed_raw_iron'], 'heated')
     bcVanCompacting(event, 'crushed_raw/copper_ingot', 'minecraft:copper_ingot', 1, ['create:crushed_raw_copper'], 'heated')
     bcVanCompacting(event, 'crushed_raw/gold_ingot', 'minecraft:gold_ingot', 1, ['create:crushed_raw_gold'], 'heated')

    var chemlibDustIngots = [
        'actinium', 'aluminum', 'barium', 'beryllium', 'bismuth', 'cadmium', 'calcium',
        'cerium', 'cesium', 'chromium', 'cobalt', 'dysprosium', 'erbium', 'europium',
        'francium', 'gadolinium', 'gallium', 'hafnium', 'holmium', 'indium', 'iridium',
        'lanthanum', 'lead', 'lithium', 'lutetium', 'magnesium', 'manganese',
        'molybdenum', 'neodymium', 'nickel', 'niobium', 'osmium', 'palladium',
        'platinum', 'polonium', 'potassium', 'praseodymium', 'protactinium', 'radium',
        'rhenium', 'rhodium', 'rubidium', 'ruthenium', 'samarium', 'scandium',
        'silver', 'sodium', 'strontium', 'tantalum', 'terbium', 'thallium', 'thorium',
        'thulium', 'tin', 'titanium', 'tungsten', 'uranium', 'vanadium', 'ytterbium',
        'yttrium', 'zinc', 'zirconium'
    ]
    for (var i = 0; i < chemlibDustIngots.length; i++)  bcVanDustIngot(event, chemlibDustIngots[i])

     bcVanCompacting(event, 'crushed_raw/aluminum_ingot', 'chemlib:aluminum_ingot', 1, ['create:crushed_raw_aluminum'], 'heated')
     bcVanCompacting(event, 'crushed_raw/cobalt_ingot', 'chemlib:cobalt_ingot', 1, ['creatingspace:crushed_cobalt_ore'], 'heated')
     bcVanCompacting(event, 'crushed_raw/nickel_ingot', 'chemlib:nickel_ingot', 1, ['create:crushed_raw_nickel'], 'heated')
     bcVanCompacting(event, 'crushed_raw/silver_ingot', 'chemlib:silver_ingot', 1, ['create:crushed_raw_silver'], 'heated')
     bcVanCompacting(event, 'crushed_raw/zinc_ingot', 'chemlib:zinc_ingot', 1, ['create:crushed_raw_zinc'], 'heated')

     bcVanRemoveCooking(event, 'ae2:silicon')
     bcVanCompacting(event, 'ae2/silicon_from_certus_and_silicon', 'ae2:silicon', 1, [
        'chemlib:silicon',
        '#forge:dusts/certus_quartz'
    ], 'heated')

    // Magic and alchemy should use Blood Magic as the parent surface, not a grid.
     bcVanAlchemy(event, 'minecraft/brewing_stand', 'minecraft:brewing_stand', 1, [
        'minecraft:blaze_rod',
        '#minecraft:stone_crafting_materials',
        '#minecraft:stone_crafting_materials',
        BC_VANILLISH.blank
    ], 2500, 120, 1)
     bcVanAlchemy(event, 'minecraft/enchanting_table', 'minecraft:enchanting_table', 1, [
        'minecraft:book',
        'minecraft:obsidian',
        'minecraft:obsidian',
        '#forge:gems/diamond',
        BC_VANILLISH.blank
    ], 5000, 160, 1)
     bcVanAlchemy(event, 'minecraft/beacon', 'minecraft:beacon', 1, [
        'minecraft:nether_star',
        '#forge:glass',
        'minecraft:obsidian',
        BC_VANILLISH.ethereal
    ], 120000, 360, 5)

     bcVanAlchemy(event, 'bloodmagic/hellforged_ingot_from_raw', 'bloodmagic:ingot_hellforged', 1, [
        'bloodmagic:rawdemonite',
        'minecraft:blaze_powder',
        BC_VANILLISH.infused
    ], 12000, 180, 3)
     bcVanAlchemy(event, 'bloodmagic/hellforged_ingot_from_dust', 'bloodmagic:ingot_hellforged', 1, [
        '#forge:dusts/hellforged',
        'minecraft:blaze_powder',
        BC_VANILLISH.infused
    ], 9000, 160, 3)

     bcVanAlchemy(event, 'ars_nouveau/scribes_table', 'ars_nouveau:scribes_table', 1, [
        'ars_nouveau:archwood_slab',
        '#forge:logs/archwood',
        '#forge:nuggets/gold',
        BC_VANILLISH.reinforced
    ], 5000, 140, 2)
     bcVanAlchemy(event, 'ars_nouveau/imbuement_chamber', 'ars_nouveau:imbuement_chamber', 1, [
        'ars_nouveau:archwood_planks',
        'ars_nouveau:archwood_planks',
        '#forge:gems/source',
        BC_VANILLISH.reinforced
    ], 7000, 160, 2)
     bcVanAlchemy(event, 'ars_nouveau/source_jar', 'ars_nouveau:source_jar', 1, [
        '#forge:glass',
        '#forge:glass',
        'ars_nouveau:archwood_slab',
        BC_VANILLISH.reinforced
    ], 6000, 140, 2)
     bcVanAlchemy(event, 'ars_nouveau/arcane_core', 'ars_nouveau:arcane_core', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:ingots/gold',
        BC_VANILLISH.infused
    ], 9000, 180, 3)
     bcVanAlchemy(event, 'ars_nouveau/arcane_pedestal', 'ars_nouveau:arcane_pedestal', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:nuggets/gold',
        BC_VANILLISH.infused
    ], 7500, 160, 3)
     bcVanAlchemy(event, 'ars_nouveau/enchanting_apparatus', 'ars_nouveau:enchanting_apparatus', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:gems/diamond',
        BC_VANILLISH.infused
    ], 12000, 220, 3)
     bcVanAlchemy(event, 'ars_nouveau/ritual_brazier', 'ars_nouveau:ritual_brazier', 1, [
        'ars_nouveau:arcane_pedestal',
        '#forge:storage_blocks/source',
        '#forge:ingots/gold',
        BC_VANILLISH.infused
    ], 14000, 240, 3)
})
