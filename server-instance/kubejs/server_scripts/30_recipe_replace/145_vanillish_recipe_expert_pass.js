// Late pass for easy vanilla-style crafting and furnace shortcuts.
// Ordinary engineering moves to Create machines. Anything with a magic/alchemy
// identity moves to Blood Magic's alchemy table and consumes the relevant slate.

var BTM_VANILLISH = {
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

function btmVanItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmVanIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmVanIngredientExists(input) {
    if (!input) return false
    if (typeof input === 'string') return input.charAt(0) === '#' || btmVanItemExists(input)
    if (input.item) return btmVanItemExists(input.item)
    return !!input.tag || !!input.fluid
}

function btmVanCanCraft(output, inputs) {
    if (!btmVanItemExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmVanIngredientExists(inputs[i])) return false
    }
    return true
}

function btmVanResult(output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

function btmVanKey(keys) {
    var out = {}
    for (var key in keys) out[key] = btmVanIngredient(keys[key])
    return out
}

function btmVanKeyInputs(keys) {
    var out = []
    for (var key in keys) out.push(keys[key])
    return out
}

function btmVanRemoveOutput(event, output) {
    if (btmVanItemExists(output)) event.remove({ output: output })
}

function btmVanRemoveCooking(event, output) {
    if (!btmVanItemExists(output)) return
    event.remove({ type: 'minecraft:smelting', output: output })
    event.remove({ type: 'minecraft:blasting', output: output })
}

function btmVanMechanical(event, id, output, count, pattern, keys) {
    if (!btmVanCanCraft(output, btmVanKeyInputs(keys))) return
    btmVanRemoveOutput(event, output)
    global.btmFactoryCrafting(event, 'kubejs:vanillish_expert/factory/' + id, output, count || 1, pattern, keys, { mirrored: true })
}

function btmVanDeploying(event, id, output, count, base, applied) {
    if (!btmVanCanCraft(output, [base, applied])) return
    event.remove({ output: output })
    event.custom({
        type: 'create:deploying',
        ingredients: [btmVanIngredient(base), btmVanIngredient(applied)],
        results: [btmVanResult(output, count)]
    }).id('kubejs:vanillish_expert/create_deploying/' + id)
}

function btmVanCompacting(event, id, output, count, ingredients, heat) {
    if (!btmVanCanCraft(output, ingredients)) return
    var recipe = {
        type: 'create:compacting',
        ingredients: ingredients.map(btmVanIngredient),
        results: [btmVanResult(output, count)],
        processingTime: 160
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:vanillish_expert/create_compacting/' + id)
}

function btmVanAlchemy(event, id, output, count, inputs, syphon, ticks, upgradeLevel) {
    if (!btmVanCanCraft(output, inputs)) return
    event.remove({ output: output })
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(btmVanIngredient),
        output: btmVanResult(output, count),
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: upgradeLevel
    }).id('kubejs:vanillish_expert/blood_alchemy/' + id)
}

function btmVanDustIngot(event, material) {
    var output = 'chemlib:' + material + '_ingot'
    var dust = 'chemlib:' + material + '_dust'
    btmVanRemoveCooking(event, output)
    btmVanCompacting(event, 'chemlib/' + material + '_ingot_from_dust', output, 1, [dust], 'heated')
}

ServerEvents.recipes(function (event) {
    // Vanilla redstone and transport automation should show up as assembled machinery,
    // not as hand-stacked cobble, planks, and dust.
    btmVanMechanical(event, 'minecraft/piston', 'minecraft:piston', 1, [
        'WWW',
        'SAS',
        'PRP'
    ], {
        W: '#minecraft:planks',
        S: '#forge:stone',
        A: BTM_VANILLISH.andesite,
        P: BTM_VANILLISH.ironPlate,
        R: BTM_VANILLISH.redWire
    })
    btmVanDeploying(event, 'minecraft/sticky_piston', 'minecraft:sticky_piston', 1, 'minecraft:piston', 'minecraft:slime_ball')

    btmVanMechanical(event, 'minecraft/hopper', 'minecraft:hopper', 1, [
        'P P',
        'PCH',
        'APA'
    ], {
        P: BTM_VANILLISH.ironPlate,
        C: '#forge:chests/wooden',
        H: 'create:chute',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/dropper', 'minecraft:dropper', 1, [
        'CCC',
        'CRC',
        'CAC'
    ], {
        C: '#forge:cobblestone',
        R: BTM_VANILLISH.redWire,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/dispenser', 'minecraft:dispenser', 1, [
        'CCC',
        'BRC',
        'CAC'
    ], {
        C: '#forge:cobblestone',
        B: 'minecraft:bow',
        R: BTM_VANILLISH.redWire,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/observer', 'minecraft:observer', 1, [
        'SSS',
        'QDQ',
        'SAS'
    ], {
        S: '#forge:stone',
        Q: '#forge:gems/quartz',
        D: BTM_VANILLISH.diode,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/repeater', 'minecraft:repeater', 1, [
        'TDT',
        'SWS',
        ' A '
    ], {
        T: 'minecraft:redstone_torch',
        D: BTM_VANILLISH.diode,
        S: '#forge:stone',
        W: BTM_VANILLISH.redWire,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/comparator', 'minecraft:comparator', 1, [
        'TQT',
        'SDS',
        ' A '
    ], {
        T: 'minecraft:redstone_torch',
        Q: '#forge:gems/quartz',
        S: '#forge:stone',
        D: BTM_VANILLISH.diode,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/daylight_detector', 'minecraft:daylight_detector', 1, [
        'GGG',
        'QQQ',
        'DAD'
    ], {
        G: '#forge:glass/colorless',
        Q: '#forge:gems/quartz',
        D: BTM_VANILLISH.diode,
        A: BTM_VANILLISH.andesite
    })

    btmVanMechanical(event, 'minecraft/rail', 'minecraft:rail', 16, [
        'P P',
        'PSP',
        'PAP'
    ], {
        P: BTM_VANILLISH.ironPlate,
        S: '#forge:rods/wooden',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/powered_rail', 'minecraft:powered_rail', 8, [
        'G G',
        'GSG',
        'GAG'
    ], {
        G: BTM_VANILLISH.goldPlate,
        S: BTM_VANILLISH.redWire,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/detector_rail', 'minecraft:detector_rail', 8, [
        'PDP',
        'PSP',
        'PAP'
    ], {
        P: BTM_VANILLISH.ironPlate,
        D: BTM_VANILLISH.diode,
        S: '#forge:rods/wooden',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/activator_rail', 'minecraft:activator_rail', 8, [
        'PRP',
        'PSP',
        'PAP'
    ], {
        P: BTM_VANILLISH.ironPlate,
        R: BTM_VANILLISH.redWire,
        S: '#forge:rods/wooden',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'minecraft/minecart', 'minecraft:minecart', 1, [
        'P P',
        'PAP',
        '   '
    ], {
        P: BTM_VANILLISH.ironPlate,
        A: BTM_VANILLISH.andesite
    })
    btmVanDeploying(event, 'minecraft/chest_minecart', 'minecraft:chest_minecart', 1, 'minecraft:minecart', '#forge:chests/wooden')
    btmVanDeploying(event, 'minecraft/furnace_minecart', 'minecraft:furnace_minecart', 1, 'minecraft:minecart', 'minecraft:furnace')
    btmVanDeploying(event, 'minecraft/hopper_minecart', 'minecraft:hopper_minecart', 1, 'minecraft:minecart', 'minecraft:hopper')
    btmVanDeploying(event, 'minecraft/tnt_minecart', 'minecraft:tnt_minecart', 1, 'minecraft:minecart', 'minecraft:tnt')

    // Modded vanillish engineering that looked like the same hand-stacked pattern.
    btmVanMechanical(event, 'everythingcopper/copper_hopper', 'everythingcopper:copper_hopper', 1, [
        'P P',
        'PCH',
        'APA'
    ], {
        P: BTM_VANILLISH.copperPlate,
        C: '#forge:chests/wooden',
        H: 'create:chute',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'everythingcopper/copper_minecart', 'everythingcopper:copper_minecart', 1, [
        'P P',
        'PAP',
        '   '
    ], {
        P: BTM_VANILLISH.copperPlate,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'everythingcopper/copper_rail', 'everythingcopper:copper_rail', 16, [
        'P P',
        'PSP',
        'PAP'
    ], {
        P: BTM_VANILLISH.copperPlate,
        S: '#forge:rods/wooden',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'everythingcopper/copper_anvil', 'everythingcopper:copper_anvil', 1, [
        'BBB',
        ' A ',
        'PPP'
    ], {
        B: '#forge:storage_blocks/copper',
        A: BTM_VANILLISH.andesite,
        P: BTM_VANILLISH.copperPlate
    })

    btmVanMechanical(event, 'immersive_aircraft/boiler', 'immersive_aircraft:boiler', 1, [
        'CCC',
        'C C',
        'AFA'
    ], {
        C: BTM_VANILLISH.copperPlate,
        A: BTM_VANILLISH.andesite,
        F: 'minecraft:furnace'
    })
    btmVanMechanical(event, 'immersive_aircraft/industrial_gears', 'immersive_aircraft:industrial_gears', 1, [
        'CIC',
        'IAI',
        'CIC'
    ], {
        C: BTM_VANILLISH.copperPlate,
        I: BTM_VANILLISH.ironPlate,
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'immersive_aircraft/sturdy_pipes', 'immersive_aircraft:sturdy_pipes', 2, [
        'CFC',
        ' A ',
        'CFC'
    ], {
        C: BTM_VANILLISH.copperPlate,
        F: 'create:fluid_pipe',
        A: BTM_VANILLISH.andesite
    })
    btmVanMechanical(event, 'immersive_aircraft/engine', 'immersive_aircraft:engine', 1, [
        'PFP',
        'GBG',
        'SAS'
    ], {
        P: 'immersive_aircraft:propeller',
        F: 'create:fluid_pipe',
        G: 'immersive_aircraft:industrial_gears',
        B: BTM_VANILLISH.brass,
        S: 'create:shaft',
        A: 'immersive_aircraft:boiler'
    })
    btmVanMechanical(event, 'immersive_aircraft/eco_engine', 'immersive_aircraft:eco_engine', 1, [
        'SFS',
        'GEG',
        'BAB'
    ], {
        S: 'minecraft:slime_ball',
        F: 'create:encased_fan',
        G: 'immersive_aircraft:industrial_gears',
        E: 'immersive_aircraft:engine',
        B: BTM_VANILLISH.brassPlate,
        A: BTM_VANILLISH.brass
    })
    btmVanMechanical(event, 'immersive_aircraft/nether_engine', 'immersive_aircraft:nether_engine', 1, [
        'BFB',
        'GEG',
        'NAN'
    ], {
        B: 'minecraft:blaze_rod',
        F: 'minecraft:magma_cream',
        G: 'immersive_aircraft:industrial_gears',
        E: 'immersive_aircraft:engine',
        N: '#forge:ingots/netherite',
        A: BTM_VANILLISH.brass
    })
    btmVanMechanical(event, 'immersive_aircraft/improved_landing_gear', 'immersive_aircraft:improved_landing_gear', 1, [
        'P P',
        'GAG',
        'P P'
    ], {
        P: BTM_VANILLISH.ironPlate,
        G: 'immersive_aircraft:industrial_gears',
        A: BTM_VANILLISH.andesite
    })

    btmVanMechanical(event, 'createbigcannons/cannon_builder', 'createbigcannons:cannon_builder', 1, [
        'IPI',
        'PAP',
        'ICI'
    ], {
        I: BTM_VANILLISH.ironPlate,
        P: 'create:piston_extension_pole',
        A: BTM_VANILLISH.andesite,
        C: 'create:andesite_casing'
    })
    btmVanMechanical(event, 'createbigcannons/cannon_drill', 'createbigcannons:cannon_drill', 1, [
        'IDI',
        'PAP',
        'FCF'
    ], {
        I: BTM_VANILLISH.ironPlate,
        D: 'create:mechanical_drill',
        P: 'create:piston_extension_pole',
        A: BTM_VANILLISH.andesite,
        F: 'create:fluid_pipe',
        C: 'create:andesite_casing'
    })
    btmVanMechanical(event, 'createbigcannons/cannon_loader', 'createbigcannons:cannon_loader', 1, [
        'IGI',
        'PAP',
        'ICI'
    ], {
        I: BTM_VANILLISH.ironPlate,
        G: '#createbigcannons:gunpowder',
        P: 'create:piston_extension_pole',
        A: BTM_VANILLISH.andesite,
        C: 'create:andesite_casing'
    })
    btmVanMechanical(event, 'createbigcannons/wrought_iron_cannon_chamber', 'createbigcannons:wrought_iron_cannon_chamber', 1, [
        'PPP',
        'GBG',
        'PPP'
    ], {
        P: BTM_VANILLISH.ironPlate,
        G: '#createbigcannons:gunpowder',
        B: BTM_VANILLISH.brass
    })
    btmVanMechanical(event, 'createbigcannons/machine_gun_round', 'createbigcannons:machine_gun_round', 4, [
        ' C ',
        ' R ',
        ' G '
    ], {
        C: '#forge:nuggets/copper',
        R: 'createbigcannons:empty_machine_gun_round',
        G: '#createbigcannons:gunpowder'
    })

    // Furnace-style metals become heated Create compaction. Deposit furnace fallbacks
    // still output poor nuggets and are intentionally not matched here.
    btmVanRemoveCooking(event, 'minecraft:iron_ingot')
    btmVanRemoveCooking(event, 'minecraft:copper_ingot')
    btmVanRemoveCooking(event, 'minecraft:gold_ingot')
    btmVanCompacting(event, 'crushed_raw/iron_ingot', 'minecraft:iron_ingot', 1, ['create:crushed_raw_iron'], 'heated')
    btmVanCompacting(event, 'crushed_raw/copper_ingot', 'minecraft:copper_ingot', 1, ['create:crushed_raw_copper'], 'heated')
    btmVanCompacting(event, 'crushed_raw/gold_ingot', 'minecraft:gold_ingot', 1, ['create:crushed_raw_gold'], 'heated')

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
    for (var i = 0; i < chemlibDustIngots.length; i++) btmVanDustIngot(event, chemlibDustIngots[i])

    btmVanCompacting(event, 'crushed_raw/aluminum_ingot', 'chemlib:aluminum_ingot', 1, ['create:crushed_raw_aluminum'], 'heated')
    btmVanCompacting(event, 'crushed_raw/cobalt_ingot', 'chemlib:cobalt_ingot', 1, ['creatingspace:crushed_cobalt_ore'], 'heated')
    btmVanCompacting(event, 'crushed_raw/nickel_ingot', 'chemlib:nickel_ingot', 1, ['create:crushed_raw_nickel'], 'heated')
    btmVanCompacting(event, 'crushed_raw/silver_ingot', 'chemlib:silver_ingot', 1, ['create:crushed_raw_silver'], 'heated')
    btmVanCompacting(event, 'crushed_raw/zinc_ingot', 'chemlib:zinc_ingot', 1, ['create:crushed_raw_zinc'], 'heated')

    btmVanRemoveCooking(event, 'ae2:silicon')
    btmVanCompacting(event, 'ae2/silicon_from_certus_and_silicon', 'ae2:silicon', 1, [
        'chemlib:silicon',
        '#forge:dusts/certus_quartz'
    ], 'heated')

    // Magic and alchemy should use Blood Magic as the parent surface, not a grid.
    btmVanAlchemy(event, 'minecraft/brewing_stand', 'minecraft:brewing_stand', 1, [
        'minecraft:blaze_rod',
        '#minecraft:stone_crafting_materials',
        '#minecraft:stone_crafting_materials',
        BTM_VANILLISH.blank
    ], 2500, 120, 1)
    btmVanAlchemy(event, 'minecraft/enchanting_table', 'minecraft:enchanting_table', 1, [
        'minecraft:book',
        'minecraft:obsidian',
        'minecraft:obsidian',
        '#forge:gems/diamond',
        BTM_VANILLISH.blank
    ], 5000, 160, 1)
    btmVanAlchemy(event, 'minecraft/beacon', 'minecraft:beacon', 1, [
        'minecraft:nether_star',
        '#forge:glass',
        'minecraft:obsidian',
        BTM_VANILLISH.ethereal
    ], 120000, 360, 5)

    btmVanAlchemy(event, 'bloodmagic/hellforged_ingot_from_raw', 'bloodmagic:ingot_hellforged', 1, [
        'bloodmagic:rawdemonite',
        'minecraft:blaze_powder',
        BTM_VANILLISH.infused
    ], 12000, 180, 3)
    btmVanAlchemy(event, 'bloodmagic/hellforged_ingot_from_dust', 'bloodmagic:ingot_hellforged', 1, [
        '#forge:dusts/hellforged',
        'minecraft:blaze_powder',
        BTM_VANILLISH.infused
    ], 9000, 160, 3)

    btmVanAlchemy(event, 'ars_nouveau/scribes_table', 'ars_nouveau:scribes_table', 1, [
        'ars_nouveau:archwood_slab',
        '#forge:logs/archwood',
        '#forge:nuggets/gold',
        BTM_VANILLISH.reinforced
    ], 5000, 140, 2)
    btmVanAlchemy(event, 'ars_nouveau/imbuement_chamber', 'ars_nouveau:imbuement_chamber', 1, [
        'ars_nouveau:archwood_planks',
        'ars_nouveau:archwood_planks',
        '#forge:gems/source',
        BTM_VANILLISH.reinforced
    ], 7000, 160, 2)
    btmVanAlchemy(event, 'ars_nouveau/source_jar', 'ars_nouveau:source_jar', 1, [
        '#forge:glass',
        '#forge:glass',
        'ars_nouveau:archwood_slab',
        BTM_VANILLISH.reinforced
    ], 6000, 140, 2)
    btmVanAlchemy(event, 'ars_nouveau/arcane_core', 'ars_nouveau:arcane_core', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:ingots/gold',
        BTM_VANILLISH.infused
    ], 9000, 180, 3)
    btmVanAlchemy(event, 'ars_nouveau/arcane_pedestal', 'ars_nouveau:arcane_pedestal', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:nuggets/gold',
        BTM_VANILLISH.infused
    ], 7500, 160, 3)
    btmVanAlchemy(event, 'ars_nouveau/enchanting_apparatus', 'ars_nouveau:enchanting_apparatus', 1, [
        'ars_nouveau:sourcestone',
        '#forge:gems/source',
        '#forge:gems/diamond',
        BTM_VANILLISH.infused
    ], 12000, 220, 3)
    btmVanAlchemy(event, 'ars_nouveau/ritual_brazier', 'ars_nouveau:ritual_brazier', 1, [
        'ars_nouveau:arcane_pedestal',
        '#forge:storage_blocks/source',
        '#forge:ingots/gold',
        BTM_VANILLISH.infused
    ], 14000, 240, 3)
})
